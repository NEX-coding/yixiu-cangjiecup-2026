import fs from "fs";
import {
  extractFirstImage,
  formatApiError,
  getTaskStatus,
  isTaskFailed,
  isTaskSucceeded,
  needsTaskPolling,
  type ApiImage,
  type ApiPayload,
} from "./geeknow";
import { getGeeknowConfig } from "./env";
import {
  deductImageCost,
  ensureBalanceForImages,
} from "./billing";
import { resolveFixedRefPath } from "./fixed-ref-resolve";
import { ensureDbReady, sqlGet, sqlRun, utcNow } from "./db";
import {
  isDoubaoStep,
  parseSceneConfig,
  type SceneStep,
  type SceneTemplateConfig,
} from "./scene-template";

const POLL_MS = 2000;
const POLL_MAX = 150;

function readB64(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
}

async function fetchImageB64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载图片失败 HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

async function callGeeknow(
  body: Record<string, unknown>,
  config: SceneTemplateConfig
): Promise<ApiPayload> {
  const { apiKey, baseUrl } = getGeeknowConfig();
  if (!apiKey) throw new Error("服务端未配置 GEEKNOW_API_KEY");

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      size: config.size,
      quality: config.quality,
      n: config.n,
      response_format: config.response_format,
      output_format: config.output_format,
      ...(config.asyncMode ? { async: true } : {}),
      ...body,
    }),
  });
  const data = (await res.json()) as ApiPayload;
  if (!res.ok) throw new Error(formatApiError(data, res.status));
  return data;
}

async function pollGeeknow(taskId: string): Promise<ApiImage> {
  const { apiKey, baseUrl } = getGeeknowConfig();
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res = await fetch(`${baseUrl}/images/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = (await res.json()) as ApiPayload;
    if (!res.ok) throw new Error(formatApiError(data, res.status, "轮询失败"));
    const st = getTaskStatus(data);
    if (isTaskSucceeded(st)) {
      const img = extractFirstImage(data);
      if (!img) throw new Error("任务成功但未返回图片");
      return img;
    }
    if (isTaskFailed(st)) {
      throw new Error(
        String(data.fail_reason || data.message || "生成失败")
      );
    }
  }
  throw new Error("生成超时，请稍后重试");
}

async function generateStep(
  step: SceneStep,
  userRefB64: string,
  config: SceneTemplateConfig
): Promise<ApiImage> {
  const refs: string[] = [];
  if (step.requiresUserRef) refs.push(userRefB64);
  if (step.fixedRefPath) {
    const refPath = resolveFixedRefPath(step.fixedRefPath);
    if (!refPath) {
      throw new Error(`参考资源未就绪：${step.fixedRefLabel || step.id}`);
    }
    refs.push(readB64(refPath));
  }

  const body: Record<string, unknown> = { prompt: step.prompt };
  if (refs.length > 0) {
    body.image = refs;
    body.images = refs;
  }

  let data = await callGeeknow(body, config);
  if (needsTaskPolling(data)) {
    const taskId = data.task_id;
    if (typeof taskId !== "string") throw new Error("未返回任务 ID");
    return pollGeeknow(taskId);
  }
  const img = extractFirstImage(data);
  if (!img) {
    const hint =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "";
    throw new Error(
      hint
        ? `生图失败（模型 ${config.model}）：${hint.slice(0, 160)}`
        : `生图失败（模型 ${config.model}）：接口未返回图片`
    );
  }
  return img;
}

async function updateJob(
  id: string,
  patch: Partial<{
    status: string;
    stage: string;
    white_bg_url: string;
    scene_url: string;
    error: string;
  }>
) {
  const fields: string[] = ["updated_at = ?"];
  const values: unknown[] = [utcNow()];
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }
  values.push(id);
  await sqlRun(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function runJobPipeline(jobId: string) {
  await ensureDbReady();
  const job = await sqlGet<{
    id: string;
    upload_path: string | null;
    scene_template_id: number | null;
  }>("SELECT * FROM jobs WHERE id = ?", [jobId]);

  if (!job?.upload_path) {
    await updateJob(jobId, { status: "failed", error: "缺少上传图片" });
    return;
  }
  if (!job.scene_template_id) {
    await updateJob(jobId, { status: "failed", error: "缺少场景模板" });
    return;
  }

  const sceneRow = await sqlGet<{ config_json: string }>(
    "SELECT * FROM scene_templates WHERE id = ? AND enabled = 1",
    [job.scene_template_id]
  );

  if (!sceneRow) {
    await updateJob(jobId, { status: "failed", error: "场景模板不存在" });
    return;
  }

  const config = parseSceneConfig(sceneRow.config_json);
  const steps = config.steps.filter((s) => !isDoubaoStep(s));
  if (!steps.length) {
    await updateJob(jobId, { status: "failed", error: "场景模板无图片生成步骤" });
    return;
  }

  try {
    await ensureBalanceForImages(steps.length);
    await updateJob(jobId, { status: "processing", stage: steps[0].id });
    let currentRefB64 = readB64(job.upload_path);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await updateJob(jobId, { stage: step.id });
      await ensureBalanceForImages(1);

      const img = await generateStep(step, currentRefB64, config);
      await deductImageCost();
      const url = img.url;
      if (!url) throw new Error(`${step.label}未返回 URL`);

      if (step.id === "white-bg" || i === 0) {
        await updateJob(jobId, { white_bg_url: url });
      }
      if (i === steps.length - 1) {
        await updateJob(jobId, { scene_url: url });
      }

      if (i < steps.length - 1) {
        currentRefB64 = await fetchImageB64(url);
      }
    }

    await updateJob(jobId, { status: "done", stage: "done" });
  } catch (err) {
    await updateJob(jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : "生成失败",
    });
  }
}

export function startJobAsync(jobId: string) {
  setImmediate(() => {
    void runJobPipeline(jobId);
  });
}
