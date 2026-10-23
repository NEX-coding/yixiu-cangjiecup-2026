import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlGet, sqlRun, utcNow } from "@/lib/app-db";
import {
  ensureFixedRefsDir,
  normalizeFixedRefExt,
  removeStepFixedRef,
  sceneFixedRefPath,
} from "@/lib/scene-fixed-ref";
import {
  fixedRefPreviewUrl,
  isDoubaoStep,
  parseSceneConfig,
  patchImageStep,
} from "@/lib/scene-template";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

async function saveFixedRefPath(
  sceneId: number,
  stepId: string,
  fixedRefPath: string | null
) {
  const row = await sqlGet<{ config_json: string }>(
    "SELECT config_json FROM scene_templates WHERE id = ?",
    [sceneId]
  );
  if (!row) return false;
  const config = parseSceneConfig(row.config_json);
  const step = config.steps.find((s) => s.id === stepId);
  if (!step || isDoubaoStep(step)) return false;
  const next = patchImageStep(config, stepId, {
    fixedRefPath: fixedRefPath || "",
  });
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
    const stepId = String(form.get("stepId") || "").trim();
    if (!stepId) {
      return NextResponse.json({ error: "缺少步骤 ID" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "仅支持 PNG/JPG/WebP" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 10MB" }, { status: 400 });
    }

    const ext = normalizeFixedRefExt(path.extname(file.name) || ".png");
    ensureFixedRefsDir();
    removeStepFixedRef(sceneId, stepId);
    const filePath = sceneFixedRefPath(sceneId, stepId, ext);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buf);

    if (!(await saveFixedRefPath(sceneId, stepId, filePath))) {
      return NextResponse.json({ error: "步骤不存在或类型无效" }, { status: 400 });
    }

    const previewUrl = fixedRefPreviewUrl({
      id: stepId,
      label: "",
      prompt: "",
      fixedRefPath: filePath,
      requiresUserRef: true,
    });

    return NextResponse.json({ fixedRefPath: filePath, previewUrl });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const sceneId = Number(id);
    const stepId = new URL(req.url).searchParams.get("stepId")?.trim() || "";
    if (!sceneId || !stepId) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }
    removeStepFixedRef(sceneId, stepId);
    await saveFixedRefPath(sceneId, stepId, null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
