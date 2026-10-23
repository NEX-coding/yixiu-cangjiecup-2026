import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireUser } from "@/lib/auth";
import { sqlAll, sqlGet, sqlRun, utcNow } from "@/lib/db";
import { startJobAsync } from "@/lib/pipeline";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await sqlAll(
      `SELECT j.id, j.status, j.stage, j.white_bg_url, j.scene_url, j.video_url,
              j.error, j.created_at, j.updated_at,
              COALESCE(st.name, bt.name) AS template_name,
              COALESCE(st.category, bt.category) AS category
       FROM jobs j
       LEFT JOIN scene_templates st ON st.id = j.scene_template_id
       LEFT JOIN background_templates bt ON bt.id = j.template_id
       WHERE j.user_id = ?
       ORDER BY j.created_at DESC
       LIMIT 50`,
      [user.id]
    );

    return NextResponse.json({ jobs: rows }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const sceneTemplateId = Number(form.get("sceneTemplateId"));
    const file = form.get("file");

    if (!sceneTemplateId || !(file instanceof File)) {
      return NextResponse.json({ error: "请选择场景并上传图片" }, { status: 400 });
    }

    const template = await sqlGet(
      "SELECT id FROM scene_templates WHERE id = ? AND enabled = 1",
      [sceneTemplateId]
    );
    if (!template) {
      return NextResponse.json({ error: "场景模板不存在" }, { status: 404 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const ext = path.extname(file.name) || ".jpg";
    const uploadPath = path.join(uploadDir, `${jobId}${ext}`);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(uploadPath, buf);

    const now = utcNow();
    await sqlRun(
      `INSERT INTO jobs (id, user_id, scene_template_id, status, stage, upload_path, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 'queued', ?, ?, ?)`,
      [jobId, user.id, sceneTemplateId, uploadPath, now, now]
    );

    startJobAsync(jobId);

    return NextResponse.json({ jobId, status: "pending" });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[jobs create]", e);
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 });
  }
}
