import path from "path";
import {
  isUploadedFixedRef,
  sceneFixedRefPublicUrl,
} from "./scene-fixed-ref-shared";

const PROJECT_ROOT = path.join(process.cwd(), "..");
export const FIXED_HAIR_REF = path.join(PROJECT_ROOT, "图2头发参考图.png");
export const DEFAULT_SCENE_REF = path.join(PROJECT_ROOT, "图2背景参考图.png");

export type SceneStepKind = "image" | "doubao";

export type SceneStep = {
  id: string;
  kind?: SceneStepKind;
  label: string;
  prompt: string;
  fixedRefPath?: string;
  fixedRefLabel?: string;
  requiresUserRef: boolean;
  /** 豆包步骤：关联提示词库 ID，空则使用库内最新一条 */
  promptLibraryId?: number | null;
  /** 豆包步骤：效果示例视频 URL */
  exampleVideoUrl?: string | null;
};

export function patchDoubaoStep(
  config: SceneTemplateConfig,
  patch: Partial<SceneStep>
): SceneTemplateConfig {
  return {
    ...config,
    steps: config.steps.map((s) =>
      isDoubaoStep(s) ? { ...s, ...patch } : s
    ),
  };
}

export function patchImageStep(
  config: SceneTemplateConfig,
  stepId: string,
  patch: Partial<SceneStep>
): SceneTemplateConfig {
  return {
    ...config,
    steps: config.steps.map((s) =>
      !isDoubaoStep(s) && s.id === stepId ? { ...s, ...patch } : s
    ),
  };
}

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

function uniqueStepId(prefix: string, existingIds: string[]): string {
  const set = new Set(existingIds);
  let candidate = prefix;
  let n = 1;
  while (set.has(candidate)) {
    candidate = `${prefix}-${n++}`;
  }
  return candidate;
}

export function createBlankImageStep(existingIds: string[]): SceneStep {
  const id = uniqueStepId("image-step", existingIds);
  return {
    id,
    kind: "image",
    label: "新步骤",
    prompt: "",
    fixedRefPath: "",
    fixedRefLabel: "",
    requiresUserRef: true,
  };
}

export function createBlankDoubaoStep(existingIds: string[]): SceneStep {
  const id = uniqueStepId("doubao-step", existingIds);
  return {
    id,
    kind: "doubao",
    label: "豆包生成视频",
    prompt: DEFAULT_DOUBAO_STEP.prompt,
    requiresUserRef: false,
    promptLibraryId: null,
  };
}

export function ensureDoubaoStepInConfig(
  config: SceneTemplateConfig
): SceneTemplateConfig {
  if (config.steps.some(isDoubaoStep)) return config;
  return { ...config, steps: [...config.steps, DEFAULT_DOUBAO_STEP] };
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

/** 管理端「新建场景」空白初始配置（不含预设步骤与 Prompt） */
export const EMPTY_SCENE_CONFIG: SceneTemplateConfig = {
  workflowHint: "",
  steps: [],
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
  return JSON.parse(json) as SceneTemplateConfig;
}

export function fixedRefPreviewUrl(step: SceneStep): string | null {
  if (!step.fixedRefPath) return null;
  const base = path.basename(step.fixedRefPath);
  if (isUploadedFixedRef(base)) {
    return sceneFixedRefPublicUrl(base);
  }
  return `/api/assets/${encodeURIComponent(base)}`;
}

