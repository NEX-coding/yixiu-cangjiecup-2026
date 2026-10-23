import fs from "fs";
import path from "path";

function loadDotenvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

export function loadGptEnv() {
  loadDotenvFile(path.join(process.cwd(), ".env.local"));
  loadDotenvFile(path.join(process.cwd(), "../.env.local"));
}

export function getGeeknowConfig() {
  loadGptEnv();
  const apiKey = process.env.GEEKNOW_API_KEY?.trim() || "";
  const baseUrl = (
    process.env.GEEKNOW_BASE_URL || "https://api.geeknow.top/v1"
  ).replace(/\/$/, "");
  return { apiKey, baseUrl };
}

export function getAuthSecret() {
  loadGptEnv();
  return process.env.AUTH_SECRET || "dev-user-app-secret-change-me";
}

export function getDoubaoExtensionId() {
  loadGptEnv();
  const id = process.env.DOUBAO_EXTENSION_ID?.trim();
  return id || "ojcfmgnmlnhjnkomecakgifjegclamfh";
}

export const PROJECT_ROOT = path.join(process.cwd(), "..");
export const FIXED_HAIR_REF = path.join(PROJECT_ROOT, "图2头发参考图.png");
export const DEFAULT_SCENE_REF = path.join(PROJECT_ROOT, "图2背景参考图.png");
