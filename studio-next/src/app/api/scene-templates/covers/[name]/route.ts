import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SCENE_COVERS_DIR } from "@/lib/scene-cover";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const safe = path.basename(decodeURIComponent(name));
  if (!/^scene_\d+\.(png|jpe?g|webp)$/i.test(safe)) {
    return NextResponse.json({ error: "无效文件名" }, { status: 400 });
  }
  const filePath = path.join(SCENE_COVERS_DIR, safe);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "封面不存在" }, { status: 404 });
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=300",
    },
  });
}
