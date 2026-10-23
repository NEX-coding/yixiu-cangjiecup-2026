import { NextResponse } from "next/server";
import { destroyAdminSession, getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ admin: null }, { status: 401 });
  return NextResponse.json({ admin });
}

export async function DELETE() {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
