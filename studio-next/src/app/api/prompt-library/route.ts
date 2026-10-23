import { NextResponse } from "next/server";
import { createPrompt, listPrompts } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ items: await listPrompts() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const content = String(body?.content || "").trim();
  if (!title) {
    return NextResponse.json(
      { error: { message: "标题不能为空" } },
      { status: 400 }
    );
  }
  if (!content) {
    return NextResponse.json(
      { error: { message: "提示词内容不能为空" } },
      { status: 400 }
    );
  }
  const item = await createPrompt(title, content);
  return NextResponse.json({ item }, { status: 201 });
}
