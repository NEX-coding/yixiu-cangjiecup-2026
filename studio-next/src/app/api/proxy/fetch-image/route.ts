import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")?.trim() || "";
  if (!raw.startsWith("https://")) {
    return NextResponse.json(
      { error: { message: "需要 https 的 url 参数" } },
      { status: 400 }
    );
  }
  try {
    const upstream = await fetch(raw, { signal: AbortSignal.timeout(120_000) });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: { message: `拉取图片失败（HTTP ${upstream.status}）` } },
        { status: upstream.status }
      );
    }
    const bytes = await upstream.arrayBuffer();
    const contentType =
      upstream.headers.get("content-type") || "image/png";
    return new NextResponse(bytes, {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "拉取图片失败";
    return NextResponse.json({ error: { message: msg } }, { status: 502 });
  }
}
