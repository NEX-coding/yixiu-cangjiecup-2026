import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getDashboardStats } from "@/lib/app-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getDashboardStats());
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
