import { NextResponse } from "next/server";
import {
  createSession,
  destroySession,
  getSessionUser,
  updateUserName,
} from "@/lib/auth";
import { getUserCreditsSnapshot } from "@/lib/user-credits";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, private" };

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json(
    { user, credits: await getUserCreditsSnapshot(user.id) },
    { headers: NO_STORE }
  );
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string };
  if (typeof body.name !== "string") {
    return NextResponse.json({ error: "请填写显示名称" }, { status: 400 });
  }

  const updated = await updateUserName(user.id, body.name);
  if (!updated) {
    return NextResponse.json(
      { error: "名称需为 1–32 个字符" },
      { status: 400 }
    );
  }

  await createSession(updated);
  return NextResponse.json({ user: updated });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
