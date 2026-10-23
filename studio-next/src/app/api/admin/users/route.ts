import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlAll } from "@/lib/app-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const users = await sqlAll(
      `SELECT u.id, u.email, u.name, u.is_admin, u.video_credits, u.created_at,
              COUNT(j.id)::int AS job_count,
              SUM(CASE WHEN j.status = 'done' THEN 1 ELSE 0 END)::int AS done_count
       FROM users u
       LEFT JOIN jobs j ON j.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id ASC`
    );
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
