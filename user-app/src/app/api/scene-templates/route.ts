import { NextResponse } from "next/server";
import { sqlAll } from "@/lib/db";
import { getCostPerVideo } from "@/lib/user-credits";
import { parseSceneConfig, type SceneTemplateRow } from "@/lib/scene-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 用户端只读：展示管理端上架的场景模板（无需登录） */
export async function GET() {
  try {
    const rows = await sqlAll<SceneTemplateRow>(
      `SELECT id, name, description, category, thumbnail_color, thumbnail_url,
              config_json, sort_order, created_at
       FROM scene_templates
       WHERE enabled = 1 AND user_id IS NULL
       ORDER BY sort_order ASC, id ASC`
    );

    const templates = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      thumbnailColor: r.thumbnail_color,
      thumbnailUrl: r.thumbnail_url,
      stepCount: parseSceneConfig(r.config_json).steps.length,
      workflowHint: parseSceneConfig(r.config_json).workflowHint,
      createdAt: r.created_at,
    }));

    return NextResponse.json(
      { templates, creditCost: await getCostPerVideo() },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, private, max-age=0, must-revalidate",
          "CDN-Cache-Control": "no-store",
          "Surrogate-Control": "no-store",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (e) {
    console.error("[scene-templates]", e);
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}
