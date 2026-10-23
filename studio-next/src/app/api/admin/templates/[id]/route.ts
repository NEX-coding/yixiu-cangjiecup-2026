import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlGet, sqlRun } from "@/lib/app-db";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;

    const fields: string[] = [];
    const values: unknown[] = [];
    const allowed = [
      "category",
      "name",
      "description",
      "thumbnail_color",
      "fixed_ref_path",
      "scene_prompt",
      "sort_order",
      "enabled",
    ] as const;

    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    if (!fields.length) {
      return NextResponse.json({ error: "无更新字段" }, { status: 400 });
    }
    values.push(Number(id));

    const r = await sqlRun(
      `UPDATE background_templates SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    if (!r.rowCount) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }
    const row = await sqlGet("SELECT * FROM background_templates WHERE id = ?", [
      Number(id),
    ]);
    return NextResponse.json({ template: row });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const r = await sqlRun("DELETE FROM background_templates WHERE id = ?", [
      Number(id),
    ]);
    if (!r.rowCount) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
