import type Database from "better-sqlite3";
import path from "path";
import {
  isUploadedFixedRef,
  sceneFixedRefPublicUrl,
} from "./scene-fixed-ref-shared";
import { PROJECT_ROOT, FIXED_HAIR_REF, DEFAULT_SCENE_REF } from "./env";

export type SceneStepKind = "image" | "doubao";

export type SceneStep = {
  id: string;
  kind?: SceneStepKind;
  label: string;
  prompt: string;
  fixedRefPath?: string;
  fixedRefLabel?: string;
  requiresUserRef: boolean;
  promptLibraryId?: number | null;
  exampleVideoUrl?: string | null;
};

export const DEFAULT_DOUBAO_STEP: SceneStep = {
  id: "doubao-video",
  kind: "doubao",
  label: "豆包生成视频",
  prompt:
    "自动打开豆包，填入提示词库指定条目与街景合成图，在豆包中继续生成视频。",
  requiresUserRef: false,
  promptLibraryId: null,
};

export function isDoubaoStep(step: SceneStep): boolean {
  return (
    step.kind === "doubao" ||
    step.id === "doubao-video" ||
    step.id === "video"
  );
}

export function ensureDoubaoStepInConfig(
  config: SceneTemplateConfig
): SceneTemplateConfig {
  if (config.steps.some(isDoubaoStep)) return config;
  return { ...config, steps: [...config.steps, DEFAULT_DOUBAO_STEP] };
}

export function migrateSceneTemplatesDoubaoStep(db: Database.Database) {
  const rows = db
    .prepare("SELECT id, config_json FROM scene_templates")
    .all() as Array<{ id: number; config_json: string }>;
  const now = new Date().toISOString();
  for (const row of rows) {
    const config = parseSceneConfig(row.config_json);
    const next = ensureDoubaoStepInConfig(config);
    if (next.steps.length !== config.steps.length) {
      db.prepare(
        "UPDATE scene_templates SET config_json = ?, updated_at = ? WHERE id = ?"
      ).run(JSON.stringify(next), now, row.id);
    }
  }
}

export type SceneTemplateConfig = {
  workflowHint: string;
  steps: SceneStep[];
  size: string;
  quality: string;
  model: string;
  n: number;
  response_format: string;
  output_format: string;
  asyncMode: boolean;
};

export type SceneTemplateRow = {
  id: number;
  user_id: number | null;
  name: string;
  description: string | null;
  category: string;
  thumbnail_color: string;
  thumbnail_url: string | null;
  config_json: string;
  sort_order: number;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_SCENE_CONFIG: SceneTemplateConfig = {
  workflowHint:
    "图1 上传模特服装；图2 固定为头发参考图。白底成功后自动街景合成（全流程）。",
  steps: [
    {
      id: "white-bg",
      label: "电商白底",
      prompt:
        "帮我生成图片：根据图1生成纯白电商背景图。保持图1模特身形与服装完全一致（款式、颜色、细节不变）。模特正面对镜头，双手自然放置且不遮挡衣服，手上无首饰。将图1模特的人脸与发型替换为图2（左侧头发梳至耳后，其余按图2），头发自然有质感。若露腿则穿美肤袜；去除身上包包及多余道具。鞋子：图1若可见鞋子则完全保留同款同色；图1若未露出脚部或看不清鞋，则按服装风格搭配合理完整鞋款（色系、风格与服装一致），禁止光脚、禁止 barefoot、禁止乱配无关鞋款。背景纯白电商棚拍，无杂物阴影，高清商业摄影质感。",
      fixedRefPath: FIXED_HAIR_REF,
      fixedRefLabel: "图2头发参考图",
      requiresUserRef: true,
    },
    {
      id: "scene-composite",
      label: "街景合成",
      prompt: `帮我生成图片：将图1的人物完整合成到图2的场景中：
- 人物居中站在画面正中央，身高约168cm，脚底到画面底部预留20%的空白区域，比例自然协调
- 人物保持原有的穿着、发型和姿态不变，融入图2的街景墙面环境
- 光影、色调与图2保持一致，人物边缘自然，无违和感，整体画面真实自然
- 人脸模糊处理`,
      fixedRefPath: DEFAULT_SCENE_REF,
      fixedRefLabel: "图2背景参考图",
      requiresUserRef: true,
    },
    DEFAULT_DOUBAO_STEP,
  ],
  size: "2160x3840",
  quality: "high",
  model: "gpt-image-2",
  n: 1,
  response_format: "url",
  output_format: "png",
  asyncMode: false,
};

export const DEFAULT_SCENE_NAME = "电商白底 · 街景合成";
export const DEFAULT_SCENE_DESC =
  "上传服装图，自动生成白底商品图并合成街景场景（全流程）";

export function parseSceneConfig(json: string): SceneTemplateConfig {
  const raw = JSON.parse(json) as Partial<SceneTemplateConfig>;
  const steps = Array.isArray(raw.steps) ? raw.steps : DEFAULT_SCENE_CONFIG.steps;
  const merged: SceneTemplateConfig = {
    workflowHint: raw.workflowHint ?? DEFAULT_SCENE_CONFIG.workflowHint,
    steps,
    size: raw.size || DEFAULT_SCENE_CONFIG.size,
    quality: raw.quality || DEFAULT_SCENE_CONFIG.quality,
    model: raw.model || DEFAULT_SCENE_CONFIG.model,
    n: typeof raw.n === "number" && raw.n > 0 ? raw.n : DEFAULT_SCENE_CONFIG.n,
    response_format: raw.response_format || DEFAULT_SCENE_CONFIG.response_format,
    output_format: raw.output_format || DEFAULT_SCENE_CONFIG.output_format,
    asyncMode: Boolean(raw.asyncMode ?? DEFAULT_SCENE_CONFIG.asyncMode),
  };
  return ensureDoubaoStepInConfig(merged);
}

export function fixedRefUrl(step: SceneStep): string | null {
  if (!step.fixedRefPath) return null;
  const base = path.basename(step.fixedRefPath);
  if (isUploadedFixedRef(base)) {
    return sceneFixedRefPublicUrl(base);
  }
  return `/api/assets/${encodeURIComponent(base)}`;
}

export function seedDefaultSceneTemplate(db: Database.Database) {
  const count = db
    .prepare("SELECT COUNT(*) AS c FROM scene_templates")
    .get() as { c: number };
  if (count.c > 0) return;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO scene_templates
      (user_id, name, description, category, thumbnail_color, config_json, sort_order, enabled, created_at, updated_at)
     VALUES (NULL, ?, ?, 'street', '#d4cfc7', ?, 1, 1, ?, ?)`
  ).run(
    DEFAULT_SCENE_NAME,
    DEFAULT_SCENE_DESC,
    JSON.stringify(DEFAULT_SCENE_CONFIG),
    now,
    now
  );
}
