import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.join(process.cwd(), "..");
export const SCENE_COVERS_DIR = path.join(PROJECT_ROOT, "data/scene-covers");

export function sceneCoverFileName(id: number) {
  return `scene_${id}.png`;
}

export function sceneCoverPath(id: number) {
  return path.join(SCENE_COVERS_DIR, sceneCoverFileName(id));
}

export function sceneCoverPublicUrl(id: number) {
  return `/api/scene-templates/covers/${sceneCoverFileName(id)}`;
}

export function ensureCoversDir() {
  fs.mkdirSync(SCENE_COVERS_DIR, { recursive: true });
}
