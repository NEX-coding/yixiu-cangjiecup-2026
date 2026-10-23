import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlGet, sqlRun, utcNow } from "@/lib/app-db";
import {
  isDoubaoStep,
  parseSceneConfig,
  patchDoubaoStep,
} from "@/lib/scene-template";
import {
  ensureSamplesDir,
  normalizeSampleExt,
  removeSceneSamples,
  sceneSampleFileName,
  sceneSamplePath,
  sceneSamplePublicUrl,
} from "@/lib/scene-sample-video";

export const runtime = "nodejs";

const ALLOWED = new Set(["video/mp4", "video/webm", "video/quicktime"]);

async function saveExampleUrl(sceneId: number, url: string | null) {
  const row = await sqlGet<{ config_json: string }>(
    "SELECT config_json FROM scene_templates WHERE id = ?",
    [sceneId]
  );
  if (!row) return false;
  const config = parseSceneConfig(row.config_json);
  if (!config.steps.some(isDoubaoStep)) return false;
  const next = patchDoubaoStep(config, { exampleVideoUrl: url });
  await sqlRun(
    "UPDATE scene_templates SET config_json = ?, updated_at = ? WHERE id = ?",
    [JSON.stringify(next), utcNow(), sceneId]
  );
  return true;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const sceneId = Number(id);
    if (!sceneId) {
      return NextResponse.json({ error: "无效 ID" }, { status: 400 });
    }

    const exists = await sqlGet("SELECT id FROM scene_templates WHERE id = ?", [
      sceneId,
    ]);
    if (!exists) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传视频文件" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "仅支持 MP4 / WebM / MOV" },
        { status: 400 }
      );
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 50MB" }, { status: 400 });
    }

    const ext = normalizeSampleExt(path.extname(file.name) || ".mp4");
    ensureSamplesDir();
    removeSceneSamples(sceneId);
    const fileName = sceneSampleFileName(sceneId, ext);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(sceneSamplePath(sceneId, ext), buf);

    const exampleVideoUrl = sceneSamplePublicUrl(fileName);
    if (!(await saveExampleUrl(sceneId, exampleVideoUrl))) {
      return NextResponse.json({ error: "场景无豆包步骤" }, { status: 400 });
    }

    return NextResponse.json({ exampleVideoUrl });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const sceneId = Number(id);
    removeSceneSamples(sceneId);
    await saveExampleUrl(sceneId, null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
