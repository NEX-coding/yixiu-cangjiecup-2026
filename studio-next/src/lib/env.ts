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

export function getYunwuConfig() {
  loadGptEnv();
  const apiKey = process.env.YUNWU_API_KEY?.trim() || "";
  const baseUrl = (process.env.YUNWU_BASE_URL || "https://yunwu.ai/v1").replace(
    /\/$/,
    ""
  );
  return { apiKey, baseUrl };
}

/** 管理端展示用，保留首尾便于核对 */
export function maskApiKey(key: string): string {
  const k = key.trim();
  if (!k) return "";
  if (k.length <= 8) return "••••••••";
  const hidden = Math.min(12, Math.max(4, k.length - 10));
  return `${k.slice(0, 6)}${"•".repeat(hidden)}${k.slice(-4)}`;
}

export function getAuthSecret() {
  loadGptEnv();
  return process.env.AUTH_SECRET || "dev-user-app-secret-change-me";
}

export const PROJECT_ROOT = path.join(process.cwd(), "..");
