import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createWechatNativePayment } from "@/lib/credit-recharge";

export const runtime = "nodejs";

type Params = { params: Promise<{ orderId: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "订单无效" }, { status: 400 });
    }

    const result = await createWechatNativePayment(user.id, orderId);
    return NextResponse.json({
      ...result,
      qrDataUrl: result.codeUrl
        ? await QRCode.toDataURL(result.codeUrl, { margin: 1, width: 240 })
        : null,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "支付失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
