import { NextResponse } from "next/server";
import { createSession, findUserByEmail, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = body.email?.trim();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { headers: { "Cache-Control": "no-store, private" } }
  );
}
