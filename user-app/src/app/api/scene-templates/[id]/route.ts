import { NextResponse } from "next/server";
import { sqlGet } from "@/lib/db";
import {
  fixedRefUrl,
  parseSceneConfig,
  type SceneTemplateRow,
} from "@/lib/scene-template";

export const runtime = "nodejs";

/** 用户端只读：查看场景详情（无需登录） */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const row = await sqlGet<SceneTemplateRow>(
      "SELECT * FROM scene_templates WHERE id = ? AND enabled = 1 AND user_id IS NULL",
      [Number(id)]
    );

    if (!row) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    const config = parseSceneConfig(row.config_json);
    return NextResponse.json({
      template: {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        thumbnailColor: row.thumbnail_color,
        config: {
          ...config,
          steps: config.steps.map((s) => ({
            ...s,
            fixedRefPreview: fixedRefUrl(s),
          })),
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}
