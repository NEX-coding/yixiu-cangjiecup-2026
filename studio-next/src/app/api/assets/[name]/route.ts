import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const PROJECT_ROOT = path.join(process.cwd(), "..");
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
  const candidates = [path.join(PROJECT_ROOT, safe)];
  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) {
    return NextResponse.json({ error: "资源不存在" }, { status: 404 });
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
