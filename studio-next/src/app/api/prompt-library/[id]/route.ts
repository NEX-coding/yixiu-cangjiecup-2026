import { NextResponse } from "next/server";
import { deletePrompt, updatePrompt } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { error: { message: "无效的提示词 id" } },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const content = String(body?.content || "").trim();
  if (!title || !content) {
    return NextResponse.json(
      { error: { message: "标题和内容不能为空" } },
      { status: 400 }
    );
  }
  const item = await updatePrompt(id, title, content);
  if (!item) {
    return NextResponse.json(
      { error: { message: "提示词不存在" } },
      { status: 404 }
    );
  }
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { error: { message: "无效的提示词 id" } },
      { status: 400 }
    );
  }
  if (!(await deletePrompt(id))) {
    return NextResponse.json(
      { error: { message: "提示词不存在" } },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
