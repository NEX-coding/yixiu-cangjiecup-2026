import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  confirmRechargeOrder,
  createRechargeOrder,
  getRechargeSnapshot,
} from "@/lib/credit-recharge";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getRechargeSnapshot(user.id));
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { packageId?: string };
    const packageId = body.packageId?.trim();
    if (!packageId) {
      return NextResponse.json({ error: "请选择充值套餐" }, { status: 400 });
    }

    const order = await createRechargeOrder(user.id, packageId);
    return NextResponse.json({ order });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "创建订单失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
