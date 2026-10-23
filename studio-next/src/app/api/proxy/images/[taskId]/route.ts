import { getGeeknowConfig, loadGptEnv } from "@/lib/env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  loadGptEnv();
  const { apiKey, baseUrl } = getGeeknowConfig();
  if (!apiKey) {
    return NextResponse.json(
      { error: { message: "未配置 GEEKNOW_API_KEY" } },
      { status: 500 }
    );
  }
  const taskId = (await ctx.params).taskId;
  if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) {
    return NextResponse.json(
      { error: { message: "无效的 task_id" } },
      { status: 400 }
    );
  }
  const upstream = await fetch(`${baseUrl}/images/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") || "application/json",
    },
  });
}
