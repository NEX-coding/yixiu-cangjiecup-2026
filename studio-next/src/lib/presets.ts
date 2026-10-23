export const DEFAULT_SIZE = "2160x3840";
export const FIXED_HAIR_REF = "/assets/图2头发参考图.png";
export const FIXED_BG_REF = "/assets/图2背景参考图.png";

export type FormDefaults = {
  quality: string;
  n: string;
  response_format: string;
  output_format: string;
  model: string;
  asyncMode: boolean;
};

export type Preset = {
  id: string;
  label: string;
  prompt: string;
  size: string | null;
  fixedRefUrl?: string;
  fixedRefFilename?: string;
  requiresUserRef?: boolean;
  singleUserRef?: boolean;
  formDefaults?: FormDefaults;
};

export const TEMPLATE_PRESETS: Preset[] = [
  {
    id: "ecom-white-swap",
    label: "电商白底",
    size: DEFAULT_SIZE,
    fixedRefUrl: FIXED_HAIR_REF,
    fixedRefFilename: "图2头发参考图.png",
    requiresUserRef: true,
    singleUserRef: true,
    formDefaults: {
      quality: "high",
      n: "1",
      response_format: "url",
      output_format: "png",
      model: "gpt-image-2",
      asyncMode: false,
    },
    prompt:
      "帮我生成图片：根据图1生成纯白电商背景图。保持图1模特身形与服装完全一致（款式、颜色、细节不变）。模特正面对镜头，双手自然放置且不遮挡衣服，手上无首饰。将图1模特的人脸与发型替换为图2（左侧头发梳至耳后，其余按图2），头发自然有质感。若露腿则穿美肤袜；去除身上包包及多余道具。鞋子：图1若可见鞋子则完全保留同款同色；图1若未露出脚部或看不清鞋，则按服装风格搭配合理完整鞋款（色系、风格与服装一致），禁止光脚、禁止 barefoot、禁止乱配无关鞋款。背景纯白电商棚拍，无杂物阴影，高清商业摄影质感。",
  },
  {
    id: "scene-composite",
    label: "街景合成",
    size: DEFAULT_SIZE,
    fixedRefUrl: FIXED_BG_REF,
    fixedRefFilename: "图2背景参考图.png",
    requiresUserRef: true,
    singleUserRef: true,
    formDefaults: {
      quality: "high",
      n: "1",
      response_format: "url",
      output_format: "png",
      model: "gpt-image-2",
      asyncMode: false,
    },
    prompt: `帮我生成图片：将图1的人物完整合成到图2的场景中：
- 人物居中站在画面正中央，身高约168cm，脚底到画面底部预留20%的空白区域，比例自然协调
- 人物保持原有的穿着、发型和姿态不变，融入图2的街景墙面环境
- 光影、色调与图2保持一致，人物边缘自然，无违和感，整体画面真实自然
- 人脸模糊处理`,
  },
];

export function findPreset(id: string): Preset | undefined {
  if (!id) return undefined;
  return TEMPLATE_PRESETS.find((p) => p.id === id);
}

export function usesDualRefSlots(preset?: Preset) {
  return Boolean(preset?.fixedRefUrl);
}
