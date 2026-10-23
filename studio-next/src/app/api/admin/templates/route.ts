import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { CATEGORY_LABELS } from "@/lib/admin-constants";
import { sqlAll, sqlGet, sqlRun, utcNow, type TemplateRow } from "@/lib/app-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await sqlAll<TemplateRow>(
      "SELECT * FROM background_templates ORDER BY sort_order ASC, id ASC"
    );
    return NextResponse.json({ templates: rows, categories: CATEGORY_LABELS });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      category?: string;
      name?: string;
      description?: string;
      thumbnail_color?: string;
      fixed_ref_path?: string;
      scene_prompt?: string;
      sort_order?: number;
      enabled?: number;
    };

    if (!body.category || !body.name || !body.fixed_ref_path || !body.scene_prompt) {
      return NextResponse.json({ error: "请填写必填项" }, { status: 400 });
    }

    const result = await sqlRun(
      `INSERT INTO background_templates
       (category, name, description, thumbnail_color, fixed_ref_path, scene_prompt, sort_order, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.category,
        body.name.trim(),
        body.description?.trim() || null,
        body.thumbnail_color || "#e8e4df",
        body.fixed_ref_path.trim(),
        body.scene_prompt.trim(),
        body.sort_order ?? 99,
        body.enabled ?? 1,
      ]
    );

    const row = await sqlGet("SELECT * FROM background_templates WHERE id = ?", [
      result.insertId,
    ]);
    return NextResponse.json({ template: row });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
