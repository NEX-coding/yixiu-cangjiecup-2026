import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { bindReferral, getReferralSnapshot } from "@/lib/referral";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const origin = new URL(req.url).origin;
    return NextResponse.json(await getReferralSnapshot(user.id, origin));
  } catch {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { inviteCode?: string };
    const inviteCode = body.inviteCode?.trim();
    if (!inviteCode) {
      return NextResponse.json({ error: "请填写邀请码" }, { status: 400 });
    }

    const result = await bindReferral(user.id, inviteCode);
    const origin = new URL(req.url).origin;
    return NextResponse.json({
      ok: true,
      bind: result,
      ...(await getReferralSnapshot(user.id, origin)),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "绑定失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
