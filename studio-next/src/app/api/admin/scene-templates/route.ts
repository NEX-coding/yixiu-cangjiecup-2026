import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlAll, sqlGet, sqlRun, utcNow } from "@/lib/app-db";
import { normalizeSceneConfig } from "@/lib/fixed-ref-resolve";
import {
  EMPTY_SCENE_CONFIG,
  parseSceneConfig,
  type SceneTemplateConfig,
  type SceneTemplateRow,
} from "@/lib/scene-template";
import { CATEGORY_LABELS } from "@/lib/admin-constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await sqlAll<SceneTemplateRow>(
      "SELECT * FROM scene_templates ORDER BY sort_order ASC, id ASC"
    );

    return NextResponse.json({
      templates: rows.map((r) => ({
        ...r,
        stepCount: parseSceneConfig(r.config_json).steps.length,
        stepLabels: parseSceneConfig(r.config_json).steps.map((s) => s.label),
      })),
      categories: CATEGORY_LABELS,
    });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      category?: string;
      thumbnail_color?: string;
      config?: SceneTemplateConfig;
      cloneFromId?: number;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "请填写场景名称" }, { status: 400 });
    }

    let configJson = JSON.stringify(EMPTY_SCENE_CONFIG);
    if (body.config) {
      configJson = JSON.stringify(normalizeSceneConfig(body.config));
    } else if (body.cloneFromId) {
      const src = await sqlGet<{ config_json: string }>(
        "SELECT config_json FROM scene_templates WHERE id = ?",
        [body.cloneFromId]
      );
      if (src) {
        configJson = JSON.stringify(
          normalizeSceneConfig(parseSceneConfig(src.config_json))
        );
      }
    }

    const now = utcNow();
    const result = await sqlRun(
      `INSERT INTO scene_templates
        (user_id, name, description, category, thumbnail_color, config_json, sort_order, enabled, created_at, updated_at)
       VALUES (NULL, ?, ?, ?, ?, ?, 99, 1, ?, ?)`,
      [
        name,
        body.description?.trim() || null,
        body.category || "street",
        body.thumbnail_color || "#e8e4df",
        configJson,
        now,
        now,
      ]
    );

    const row = await sqlGet("SELECT * FROM scene_templates WHERE id = ?", [
      result.insertId,
    ]);
    return NextResponse.json({ template: row });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
