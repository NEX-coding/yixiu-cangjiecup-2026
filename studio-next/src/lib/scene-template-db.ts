import { sqlAll, sqlGet, sqlRun } from "./pg";
import {
  DEFAULT_SCENE_CONFIG,
  DEFAULT_SCENE_DESC,
  DEFAULT_SCENE_NAME,
  ensureDoubaoStepInConfig,
  parseSceneConfig,
} from "./scene-template";

export async function migrateSceneTemplatesDoubaoStep() {
  const rows = await sqlAll<{ id: number; config_json: string }>(
    "SELECT id, config_json FROM scene_templates"
  );
  const now = new Date().toISOString();
  for (const row of rows) {
    const config = parseSceneConfig(row.config_json);
    const next = ensureDoubaoStepInConfig(config);
    if (next.steps.length !== config.steps.length) {
      await sqlRun(
        "UPDATE scene_templates SET config_json = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(next), now, row.id]
      );
    }
  }
}

export async function seedDefaultSceneTemplate() {
  const count = await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM scene_templates"
  );
  if (count && count.c > 0) return;

  const now = new Date().toISOString();
  await sqlRun(
    `INSERT INTO scene_templates
      (user_id, name, description, category, thumbnail_color, config_json, sort_order, enabled, created_at, updated_at)
     VALUES (NULL, ?, ?, 'street', '#d4cfc7', ?, 1, 1, ?, ?)`,
    [
      DEFAULT_SCENE_NAME,
      DEFAULT_SCENE_DESC,
      JSON.stringify(DEFAULT_SCENE_CONFIG),
      now,
      now,
    ]
  );
}
