import { getSessionUser } from "@/lib/auth";
import { UserNav } from "@/components/UserNav";
import { SceneTemplateList } from "@/components/SceneTemplateList";
import { sqlAll } from "@/lib/db";
import { getCostPerVideo } from "@/lib/user-credits";
import { parseSceneConfig, type SceneTemplateRow } from "@/lib/scene-template";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function getSceneTemplateList() {
  const rows = await sqlAll<SceneTemplateRow>(
    `SELECT id, name, description, category, thumbnail_color, thumbnail_url,
            config_json, sort_order, created_at
     FROM scene_templates
     WHERE enabled = 1 AND user_id IS NULL
     ORDER BY sort_order ASC, id ASC`
  );

  return rows.map((r) => {
    const config = parseSceneConfig(r.config_json);
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      thumbnailColor: r.thumbnail_color,
      thumbnailUrl: r.thumbnail_url,
      stepCount: config.steps.length,
      workflowHint: config.workflowHint,
      createdAt: r.created_at,
    };
  });
}

export default async function StudioPage() {
  const [user, templates, creditCost] = await Promise.all([
    getSessionUser(),
    getSceneTemplateList(),
    getCostPerVideo(),
  ]);

  return (
    <>
      <UserNav user={user ?? undefined} />
      <SceneTemplateList
        initialTemplates={templates}
        initialCreditCost={creditCost}
      />
    </>
  );
}
