import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sqlGet } from "@/lib/db";
import { getDoubaoExtensionId } from "@/lib/env";
import { getFirstPrompt, getPromptById } from "@/lib/prompt-library";
import { isDoubaoStep, parseSceneConfig } from "@/lib/scene-template";
import {
  deductVideoCreditForJob,
  ensureUserVideoCredits,
  getUserCreditsSnapshot,
} from "@/lib/user-credits";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const job = await sqlGet<{
      id: string;
      scene_url: string | null;
      status: string;
      scene_template_id: number | null;
      config_json: string | null;
    }>(
      `SELECT j.id, j.scene_url, j.status, j.scene_template_id, st.config_json
       FROM jobs j
       LEFT JOIN scene_templates st ON st.id = j.scene_template_id
       WHERE j.id = ? AND j.user_id = ?`,
      [id, user.id]
    );

    if (!job) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }
    if (job.status !== "done") {
      return NextResponse.json({ error: "请等待图片生成完成" }, { status: 400 });
    }
    if (!job.scene_url) {
      return NextResponse.json({ error: "缺少街景合成图" }, { status: 400 });
    }

    try {
      await ensureUserVideoCredits(user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "积分不足";
      return NextResponse.json({ error: message }, { status: 402 });
    }

    let promptLibraryId: number | null | undefined;
    if (job.config_json) {
      const doubaoStep = parseSceneConfig(job.config_json).steps.find(
        isDoubaoStep
      );
      promptLibraryId = doubaoStep?.promptLibraryId;
    }

    const entry =
      promptLibraryId != null && promptLibraryId > 0
        ? await getPromptById(promptLibraryId)
        : await getFirstPrompt();

    if (!entry?.content?.trim()) {
      return NextResponse.json(
        {
          error:
            promptLibraryId != null && promptLibraryId > 0
              ? `提示词 #${promptLibraryId} 不存在或内容为空`
              : "提示词库为空，请先在管理端「提示词库」添加至少一条",
        },
        { status: 400 }
      );
    }

    const imgRes = await fetch(job.scene_url, {
      signal: AbortSignal.timeout(60000),
    });
    if (!imgRes.ok) {
      return NextResponse.json({ error: "下载场景图失败" }, { status: 502 });
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get("content-type") || "image/png";
    const imageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    let videoCredits: number;
    try {
      videoCredits = await deductVideoCreditForJob(user.id, id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "扣减积分失败";
      return NextResponse.json({ error: message }, { status: 402 });
    }

    return NextResponse.json({
      text: entry.content.trim(),
      promptTitle: entry.title,
      promptId: entry.id,
      imageDataUrl,
      extensionId: getDoubaoExtensionId(),
      credits: await getUserCreditsSnapshot(user.id),
      videoCredits,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "准备豆包数据失败" }, { status: 500 });
  }
}
