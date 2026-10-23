import { NextResponse } from "next/server";
import { createUser, findUserByEmail, hashPassword, createSession } from "@/lib/auth";
import { bindReferral } from "@/lib/referral";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
    inviteCode?: string;
  };
  const email = body.email?.trim();
  const password = body.password || "";
  const name = body.name?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash, name);
  await createSession(user);

  let referralWarning: string | undefined;
  const inviteCode = body.inviteCode?.trim();
  if (inviteCode) {
    try {
      await bindReferral(user.id, inviteCode);
    } catch (e) {
      referralWarning =
        e instanceof Error ? e.message : "邀请码绑定失败，可在邀请好友页稍后填写";
    }
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    referralWarning,
  });
}
