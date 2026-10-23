import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireUser } from "@/lib/auth";
import { SCENE_SAMPLES_DIR } from "@/lib/scene-sample-video";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> }
) {
  try {
    await requireUser();
    const { name } = await ctx.params;
    const safe = path.basename(decodeURIComponent(name));
    if (!/^scene_\d+_sample\.(mp4|webm|mov)$/i.test(safe)) {
      return NextResponse.json({ error: "无效文件名" }, { status: 400 });
    }
    const filePath = path.join(SCENE_SAMPLES_DIR, safe);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "示例视频不存在" }, { status: 404 });
    }
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
}
