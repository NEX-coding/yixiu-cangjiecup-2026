import type Database from "better-sqlite3";
import { DEFAULT_SCENE_REF } from "./env";

const WHITE_BG_PROMPT =
  "帮我生成图片：根据图1生成纯白电商背景图。保持图1模特身形与服装完全一致（款式、颜色、细节不变）。模特正面对镜头，双手自然放置且不遮挡衣服，手上无首饰。将图1模特的人脸与发型替换为图2（左侧头发梳至耳后，其余按图2），头发自然有质感。若露腿则穿美肤袜；去除身上包包及多余道具。鞋子：图1若可见鞋子则完全保留同款同色；图1若未露出脚部或看不清鞋，则按服装风格搭配合理完整鞋款（色系、风格与服装一致），禁止光脚、禁止 barefoot、禁止乱配无关鞋款。背景纯白电商棚拍，无杂物阴影，高清商业摄影质感。";

const SCENE_PROMPT = `帮我生成图片：将图1的人物完整合成到图2的场景中：
- 人物居中站在画面正中央，身高约168cm，脚底到画面底部预留20%的空白区域，比例自然协调
- 人物保持原有的穿着、发型和姿态不变，融入图2的街景墙面环境
- 光影、色调与图2保持一致，人物边缘自然，无违和感，整体画面真实自然
- 人脸模糊处理`;

const HAIR_REF = "图2头发参考图.png";

export const CATEGORY_LABELS: Record<string, string> = {
  indoor: "室内",
  street: "街拍",
  business: "商业风",
  model: "模特风",
};

const SEED: Array<{
  category: string;
  name: string;
  description: string;
  thumbnail_color: string;
  fixed_ref_path: string;
  scene_prompt: string;
  sort_order: number;
}> = [
  {
    category: "indoor",
    name: "简约白底",
    description: "干净明亮的室内白底风格",
    thumbnail_color: "#f5f3ef",
    fixed_ref_path: DEFAULT_SCENE_REF,
    scene_prompt: SCENE_PROMPT,
    sort_order: 1,
  },
  {
    category: "street",
    name: "都市街拍",
    description: "自然街景，适合日常穿搭展示",
    thumbnail_color: "#d4cfc7",
    fixed_ref_path: DEFAULT_SCENE_REF,
    scene_prompt: SCENE_PROMPT,
    sort_order: 2,
  },
  {
    category: "business",
    name: "商业展示",
    description: "专业电商主图风格",
    thumbnail_color: "#e0ddd8",
    fixed_ref_path: DEFAULT_SCENE_REF,
    scene_prompt: SCENE_PROMPT,
    sort_order: 3,
  },
  {
    category: "model",
    name: "模特展示",
    description: "突出服装细节的展示场景",
    thumbnail_color: "#c9c4bc",
    fixed_ref_path: DEFAULT_SCENE_REF,
    scene_prompt: SCENE_PROMPT,
    sort_order: 4,
  },
];

export { WHITE_BG_PROMPT, HAIR_REF };

export function seedTemplates(db: Database.Database) {
  const count = db
    .prepare("SELECT COUNT(*) AS c FROM background_templates")
    .get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare(`
    INSERT INTO background_templates
      (category, name, description, thumbnail_color, fixed_ref_path, scene_prompt, sort_order, enabled)
    VALUES (@category, @name, @description, @thumbnail_color, @fixed_ref_path, @scene_prompt, @sort_order, 1)
  `);

  const tx = db.transaction(() => {
    for (const row of SEED) {
      insert.run(row);
    }
  });
  tx();
}
