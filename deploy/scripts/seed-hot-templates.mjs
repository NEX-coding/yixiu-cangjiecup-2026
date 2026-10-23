#!/usr/bin/env node
/**
 * 上传爆款场景模板并修复参考图路径
 * 用法: node seed-hot-templates.mjs [db路径]
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH =
  process.argv[2] || "./data/user-app/data/user_app.db";
const PROJECT_ROOT = process.env.PROJECT_ROOT || "/app";
const HAIR_REF = path.join(PROJECT_ROOT, "图2头发参考图.png");
const BG_REF = path.join(PROJECT_ROOT, "图2背景参考图.png");

const WHITE_BG_BASE =
  "帮我生成图片：根据图1生成纯白电商背景图。保持图1模特身形与服装完全一致（款式、颜色、细节不变）。模特正面对镜头，双手自然放置且不遮挡衣服，手上无首饰。将图1模特的人脸与发型替换为图2（左侧头发梳至耳后，其余按图2），头发自然有质感。若露腿则穿美肤袜；去除身上包包及多余道具。鞋子：图1若可见鞋子则完全保留同款同色；图1若未露出脚部或看不清鞋，则按服装风格搭配合理完整鞋款（色系、风格与服装一致），禁止光脚、禁止 barefoot、禁止乱配无关鞋款。背景纯白电商棚拍，无杂物阴影，高清商业摄影质感。";

const HOT_TEMPLATES = [
  {
    name: "都市街拍爆款",
    description: "街拍场景一键出片，适合连衣裙、套装等日常穿搭种草",
    category: "street",
    thumbnail_color: "#d4cfc7",
    sort_order: 1,
    workflowHint:
      "图1 上传服装图；图2 头发参考。白底后合成都市街景，再跳转豆包生成街拍视频。",
    config: {
      whiteBgPrompt: WHITE_BG_BASE,
      sceneStep: {
        id: "scene-composite",
        label: "街景合成",
        prompt: `帮我生成图片：将图1的人物完整合成到图2的都市街拍场景中：
- 人物居中站在画面正中央，身高约168cm，脚底到画面底部预留20%空白，比例自然
- 保持穿着、发型与姿态不变，融入图2街景墙面与石板路环境
- 光影色调与图2一致，人物边缘自然，真实街拍质感
- 人脸模糊处理`,
        fixedRefLabel: "图2街景背景",
      },
      doubao: {
        prompt:
          "自动打开豆包，填入「街拍爆款视频」提示词与街景合成图，生成都市街拍种草视频。",
        promptLibraryId: 3,
      },
    },
  },
  {
    name: "简约室内爆款",
    description: "干净室内氛围，适合针织衫、家居服等温柔风格",
    category: "indoor",
    thumbnail_color: "#f5f3ef",
    sort_order: 2,
    workflowHint: "白底精修 → 温馨室内场景 → 豆包生成居家风视频。",
    config: {
      whiteBgPrompt: `${WHITE_BG_BASE} 整体偏柔和暖白，适合家居服/针织衫展示。`,
      sceneStep: {
        id: "indoor-scene",
        label: "室内场景",
        prompt: `帮我生成图片：将图1的人物合成到简约温馨的室内环境中：
- 参考图2的空间结构，改造成明亮暖白调室内（落地窗、浅色墙面、沙发或绿植点缀），弱化户外街景元素
- 人物居中自然站立，身高约168cm，留足头顶与脚底空白，家居氛围
- 柔光均匀，色调温柔干净，适合针织衫/家居服种草
- 人脸模糊处理`,
        fixedRefLabel: "图2室内参考",
      },
      doubao: {
        prompt:
          "自动打开豆包，填入「室内居家视频」提示词与室内合成图，生成温柔居家风短视频。",
        promptLibraryId: 4,
      },
    },
  },
  {
    name: "商业主图爆款",
    description: "电商主图质感，适合大促爆款链接与详情页头图",
    category: "business",
    thumbnail_color: "#e0ddd8",
    sort_order: 3,
    workflowHint: "商业白底 → 主图级场景 → 豆包生成转化向视频。",
    config: {
      whiteBgPrompt: `${WHITE_BG_BASE} 白底边缘干净锐利，服装色彩精准，适合电商主图。`,
      sceneStep: {
        id: "business-scene",
        label: "商业场景",
        prompt: `帮我生成图片：将图1合成到图2环境，输出电商主图级成片：
- 人物居中略靠前，突出服装卖点与版型细节，商业棚拍构图
- 背景简洁高级、杂讯少，适合大促链接与详情页头图
- 色调精准还原服装，边缘清晰，高清商业摄影质感
- 人脸模糊处理`,
        fixedRefLabel: "图2商业背景",
      },
      doubao: {
        prompt:
          "自动打开豆包，填入「商业主图视频」提示词与商业场景图，生成高转化主图视频。",
        promptLibraryId: 5,
      },
    },
  },
  {
    name: "模特种草爆款",
    description: "强调身形与搭配，适合短视频带货与直播间切片",
    category: "model",
    thumbnail_color: "#c9c4bc",
    sort_order: 4,
    workflowHint: "模特白底 → 全身展示场景 → 豆包生成带货切片视频。",
    config: {
      whiteBgPrompt: `${WHITE_BG_BASE} 身形比例自然，便于后续全身展示与搭配呈现。`,
      sceneStep: {
        id: "model-scene",
        label: "模特展示",
        prompt: `帮我生成图片：将图1的人物自然融入图2场景，偏模特种草展示：
- 人物全身居中，站姿略带动态感，展示搭配、垂感与身形比例
- 身高约168cm，脚底留白约20%，适合短视频截图与直播切片
- 光影自然，强调服装细节与整体搭配，真实种草质感
- 人脸模糊处理`,
        fixedRefLabel: "图2展示背景",
      },
      doubao: {
        prompt:
          "自动打开豆包，填入「模特带货视频」提示词与模特展示图，生成带货种草短视频。",
        promptLibraryId: 6,
      },
    },
  },
];

function buildConfig(tpl) {
  const { whiteBgPrompt, sceneStep, doubao } = tpl.config;
  return {
    workflowHint: tpl.workflowHint,
    steps: [
      {
        id: "white-bg",
        label: "电商白底",
        prompt: whiteBgPrompt,
        fixedRefPath: HAIR_REF,
        fixedRefLabel: "图2头发参考图",
        requiresUserRef: true,
      },
      {
        id: sceneStep.id,
        label: sceneStep.label,
        prompt: sceneStep.prompt,
        fixedRefPath: BG_REF,
        fixedRefLabel: sceneStep.fixedRefLabel,
        requiresUserRef: true,
      },
      {
        id: "doubao-video",
        kind: "doubao",
        label: "豆包生成视频",
        prompt: doubao.prompt,
        requiresUserRef: false,
        promptLibraryId: doubao.promptLibraryId,
        exampleVideoUrl: null,
      },
    ],
    size: "2160x3840",
    quality: "high",
    model: "gpt-image-2",
    n: 1,
    response_format: "url",
    output_format: "png",
    asyncMode: false,
  };
}

const COVERS_DIR = path.join(PROJECT_ROOT, "data/scene-covers");

function ensureCover(id) {
  const file = path.join(COVERS_DIR, `scene_${id}.png`);
  const fallback = path.join(COVERS_DIR, "scene_1.png");
  if (!fs.existsSync(file) && fs.existsSync(fallback)) {
    fs.copyFileSync(fallback, file);
  }
  if (fs.existsSync(file)) {
    return `/api/scene-templates/covers/scene_${id}.png`;
  }
  return null;
}
function normalizeConfigJson(json) {
  const config = JSON.parse(json);
  for (const step of config.steps || []) {
    if (step.fixedRefPath) {
      step.fixedRefPath = path.join(PROJECT_ROOT, path.basename(step.fixedRefPath));
    }
  }
  return JSON.stringify(config);
}

const db = new Database(DB_PATH);
const now = new Date().toISOString();

const existing = db
  .prepare("SELECT id, name, config_json FROM scene_templates")
  .all();

for (const row of existing) {
  const fixed = normalizeConfigJson(row.config_json);
  db.prepare(
    "UPDATE scene_templates SET config_json = ?, updated_at = ? WHERE id = ?"
  ).run(fixed, now, row.id);
  console.log(`已修复路径: #${row.id} ${row.name}`);
}

const insert = db.prepare(`
  INSERT INTO scene_templates
    (user_id, name, description, category, thumbnail_color, config_json, sort_order, enabled, created_at, updated_at)
  VALUES (NULL, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);

const legacy = db
  .prepare("SELECT id FROM scene_templates WHERE name = ?")
  .get("模特街拍展示");
if (legacy) {
  db.prepare("UPDATE scene_templates SET enabled = 0, updated_at = ? WHERE id = ?").run(
    now,
    legacy.id
  );
  console.log("已下架旧模板: 模特街拍展示");
}

for (const tpl of HOT_TEMPLATES) {
  const configJson = JSON.stringify(buildConfig(tpl));
  const found = db
    .prepare("SELECT id FROM scene_templates WHERE name = ?")
    .get(tpl.name);
  if (found) {
    ensureCover(found.id);
    const thumb = ensureCover(found.id);
    db.prepare(
      `UPDATE scene_templates SET description = ?, category = ?, thumbnail_color = ?,
       config_json = ?, sort_order = ?, enabled = 1, thumbnail_url = ?, updated_at = ? WHERE name = ?`
    ).run(
      tpl.description,
      tpl.category,
      tpl.thumbnail_color,
      configJson,
      tpl.sort_order,
      thumb,
      now,
      tpl.name
    );
    console.log(`已更新: ${tpl.name}`);
    continue;
  }
  const info = insert.run(
    tpl.name,
    tpl.description,
    tpl.category,
    tpl.thumbnail_color,
    configJson,
    tpl.sort_order,
    now,
    now
  );
  const newId = Number(info.lastInsertRowid);
  const thumb = ensureCover(newId);
  if (thumb) {
    db.prepare("UPDATE scene_templates SET thumbnail_url = ? WHERE id = ?").run(
      thumb,
      newId
    );
  }
  console.log(`已创建: ${tpl.name}`);
}

console.log(
  "\n当前场景模板:",
  db.prepare("SELECT id, name, category, enabled, sort_order FROM scene_templates ORDER BY sort_order").all()
);
db.close();
