import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlAll } from "@/lib/app-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const jobs = await sqlAll(
      `SELECT j.*, u.email AS user_email, u.name AS user_name,
              COALESCE(st.name, bt.name) AS template_name
       FROM jobs j
       JOIN users u ON u.id = j.user_id
       LEFT JOIN scene_templates st ON st.id = j.scene_template_id
       LEFT JOIN background_templates bt ON bt.id = j.template_id
       ORDER BY j.created_at DESC
       LIMIT 100`
    );
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
