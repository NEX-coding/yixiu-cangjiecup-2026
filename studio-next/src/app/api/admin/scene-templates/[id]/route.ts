import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlGet, sqlRun, utcNow } from "@/lib/app-db";
import { removeSceneCover } from "@/lib/scene-cover";
import { removeSceneFixedRefs } from "@/lib/scene-fixed-ref";
import { removeSceneSamples } from "@/lib/scene-sample-video";
import { normalizeSceneConfig } from "@/lib/fixed-ref-resolve";
import {
  fixedRefPreviewUrl,
  parseSceneConfig,
  type SceneTemplateConfig,
  type SceneTemplateRow,
} from "@/lib/scene-template";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const row = await sqlGet<SceneTemplateRow>(
      "SELECT * FROM scene_templates WHERE id = ?",
      [Number(id)]
    );
    if (!row) {
      return NextResponse.json({ error: "不存在" }, { status: 404 });
    }
    const config = parseSceneConfig(row.config_json);
    return NextResponse.json({
      template: {
        ...row,
        config: {
          ...config,
          steps: config.steps.map((s) => ({
            ...s,
            fixedRefPreview: fixedRefPreviewUrl(s),
          })),
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      category?: string;
      thumbnail_color?: string;
      sort_order?: number;
      enabled?: number;
      config?: SceneTemplateConfig;
    };

    const fields: string[] = ["updated_at = ?"];
    const values: unknown[] = [utcNow()];

    if (body.name) {
      fields.push("name = ?");
      values.push(body.name.trim());
    }
    if (body.description !== undefined) {
      fields.push("description = ?");
      values.push(body.description?.trim() || null);
    }
    if (body.category) {
      fields.push("category = ?");
      values.push(body.category);
    }
    if (body.thumbnail_color) {
      fields.push("thumbnail_color = ?");
      values.push(body.thumbnail_color);
    }
    if (body.sort_order !== undefined) {
      fields.push("sort_order = ?");
      values.push(body.sort_order);
    }
    if (body.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(body.enabled);
    }
    if (body.config) {
      fields.push("config_json = ?");
      values.push(JSON.stringify(normalizeSceneConfig(body.config)));
    }
    values.push(Number(id));

    const r = await sqlRun(
      `UPDATE scene_templates SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    if (!r.rowCount) {
      return NextResponse.json({ error: "不存在" }, { status: 404 });
    }
    const row = await sqlGet("SELECT * FROM scene_templates WHERE id = ?", [
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
    const sceneId = Number(id);
    if (!sceneId) {
      return NextResponse.json({ error: "无效 ID" }, { status: 400 });
    }

    const row = await sqlGet("SELECT id FROM scene_templates WHERE id = ?", [
      sceneId,
    ]);
    if (!row) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    await sqlRun(
      "UPDATE jobs SET scene_template_id = NULL WHERE scene_template_id = ?",
      [sceneId]
    );
    const r = await sqlRun("DELETE FROM scene_templates WHERE id = ?", [
      sceneId,
    ]);
    if (!r.rowCount) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    removeSceneCover(sceneId);
    removeSceneSamples(sceneId);
    removeSceneFixedRefs(sceneId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
