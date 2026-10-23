import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminLogin } from "@/lib/admin-auth";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/lib/admin-constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = body.email?.trim();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
  }

  const user = await verifyAdminLogin(email, password);
  if (!user) {
    return NextResponse.json({ error: "管理员账号或密码错误" }, { status: 401 });
  }

  await createAdminSession(user);
  return NextResponse.json({ user });
}

export async function GET() {
  return NextResponse.json({
    hint: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
}
