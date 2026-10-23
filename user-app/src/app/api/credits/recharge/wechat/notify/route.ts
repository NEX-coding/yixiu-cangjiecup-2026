import { NextResponse } from "next/server";
import { fulfillWechatRechargeOrder } from "@/lib/credit-recharge";
import { decryptWechatPayResource } from "@/lib/wechat-pay";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      event_type?: string;
      resource?: {
        ciphertext?: string;
        associated_data?: string;
        nonce?: string;
      };
    };

    if (body.event_type !== "TRANSACTION.SUCCESS") {
      return NextResponse.json({ code: "SUCCESS", message: "成功" });
    }

    if (!body.resource) {
      throw new Error("缺少微信回调资源");
    }

    const result = decryptWechatPayResource(body.resource);
    if (result.trade_state !== "SUCCESS") {
      return NextResponse.json({ code: "SUCCESS", message: "成功" });
    }

    if (!result.out_trade_no) {
      throw new Error("微信回调缺少订单号");
    }

    await fulfillWechatRechargeOrder(
      result.out_trade_no,
      result.transaction_id ?? null
    );

    return NextResponse.json({ code: "SUCCESS", message: "成功" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "微信回调处理失败";
    console.error("[wechat recharge notify]", message);
    return NextResponse.json({ code: "FAIL", message }, { status: 500 });
  }
}
