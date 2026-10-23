import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRechargeOrderStatus, getRechargeSnapshot } from "@/lib/credit-recharge";

export const runtime = "nodejs";

type Params = { params: Promise<{ orderId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "订单无效" }, { status: 400 });
    }

    const order = await getRechargeOrderStatus(user.id, orderId);
    return NextResponse.json({
      order,
      ...(order.status === "paid" ? await getRechargeSnapshot(user.id) : {}),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "查询订单失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
