import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.join(process.cwd(), "..");
export const SCENE_SAMPLES_DIR = path.join(PROJECT_ROOT, "data/scene-samples");

const ALLOWED_EXT = new Set(["mp4", "webm", "mov"]);

export function normalizeSampleExt(ext: string) {
  const e = ext.toLowerCase().replace(/^\./, "");
  return ALLOWED_EXT.has(e) ? e : "mp4";
}

export function sceneSampleFileName(id: number, ext = "mp4") {
  return `scene_${id}_sample.${normalizeSampleExt(ext)}`;
}

export function sceneSamplePath(id: number, ext = "mp4") {
  return path.join(SCENE_SAMPLES_DIR, sceneSampleFileName(id, ext));
}

export function sceneSamplePublicUrl(fileName: string) {
  return `/api/scene-templates/samples/${fileName}`;
}

export function ensureSamplesDir() {
  fs.mkdirSync(SCENE_SAMPLES_DIR, { recursive: true });
}

export function removeSceneSamples(id: number) {
  ensureSamplesDir();
  for (const ext of ALLOWED_EXT) {
    const p = sceneSamplePath(id, ext);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
