import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRechargeSnapshot } from "@/lib/credit-recharge";
import { addVideoCredits } from "@/lib/user-credits";

export const runtime = "nodejs";

/** 参赛演示：无需微信支付，直接到账积分 */
const DEMO_CREDITS = 10;

export async function POST() {
  try {
    const user = await requireUser();
    await addVideoCredits(user.id, DEMO_CREDITS, {
      type: "admin",
      note: "参赛演示充值（非正式收款）",
    });
    const snapshot = await getRechargeSnapshot(user.id);
    return NextResponse.json({
      ...snapshot,
      demoGranted: DEMO_CREDITS,
      message: `演示充值成功，已到账 ${DEMO_CREDITS} 积分`,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "演示充值失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
