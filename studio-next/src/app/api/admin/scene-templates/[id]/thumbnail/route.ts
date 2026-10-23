import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlGet, sqlRun, utcNow } from "@/lib/app-db";
import {
  ensureCoversDir,
  sceneCoverPath,
  sceneCoverPublicUrl,
} from "@/lib/scene-cover";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

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
      return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "仅支持 PNG/JPG/WebP" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 10MB" }, { status: 400 });
    }

    ensureCoversDir();
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(sceneCoverPath(sceneId), buf);

    const thumbnailUrl = sceneCoverPublicUrl(sceneId);
    await sqlRun(
      "UPDATE scene_templates SET thumbnail_url = ?, updated_at = ? WHERE id = ?",
      [thumbnailUrl, utcNow(), sceneId]
    );

    return NextResponse.json({ thumbnailUrl });
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
    const coverPath = sceneCoverPath(sceneId);
    if (fs.existsSync(coverPath)) {
      fs.unlinkSync(coverPath);
    }
    await sqlRun(
      "UPDATE scene_templates SET thumbnail_url = NULL, updated_at = ? WHERE id = ?",
      [utcNow(), sceneId]
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
