import { getGeeknowConfig, loadGptEnv } from "@/lib/env";
import { deductImageCost } from "@/lib/billing";
import { requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: { message: "未授权" } }, { status: 401 });
  }
  loadGptEnv();
  const { apiKey, baseUrl } = getGeeknowConfig();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          message:
            "未配置 GEEKNOW_API_KEY。请在 .env.local 或 studio-next/.env.local 中设置",
        },
      },
      { status: 500 }
    );
  }
  const body = await req.text();
  const upstream = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });
  const text = await upstream.text();
  if (upstream.ok) {
    try {
      deductImageCost();
    } catch (e) {
      return NextResponse.json(
        {
          error: {
            message: e instanceof Error ? e.message : "扣费失败",
          },
        },
        { status: 402 }
      );
    }
  }
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") || "application/json",
    },
  });
}
