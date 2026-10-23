import fs from "fs";
import path from "path";
import {
  normalizeFixedRefExt,
  sanitizeStepId,
  sceneFixedRefFileName,
} from "./scene-fixed-ref-shared";

const PROJECT_ROOT = path.join(process.cwd(), "..");
export const SCENE_FIXED_REFS_DIR = path.join(PROJECT_ROOT, "data/scene-fixed-refs");

export {
  isUploadedFixedRef,
  sceneFixedRefFileName,
  sceneFixedRefPublicUrl,
} from "./scene-fixed-ref-shared";

export function sceneFixedRefPath(
  sceneId: number,
  stepId: string,
  ext = ".png"
) {
  return path.join(
    SCENE_FIXED_REFS_DIR,
    sceneFixedRefFileName(sceneId, stepId, ext)
  );
}

export function ensureFixedRefsDir() {
  fs.mkdirSync(SCENE_FIXED_REFS_DIR, { recursive: true });
}

export function removeSceneFixedRefs(sceneId: number) {
  if (!fs.existsSync(SCENE_FIXED_REFS_DIR)) return;
  const prefix = `fixed_${sceneId}_`;
  for (const name of fs.readdirSync(SCENE_FIXED_REFS_DIR)) {
    if (name.startsWith(prefix)) {
      fs.unlinkSync(path.join(SCENE_FIXED_REFS_DIR, name));
    }
  }
}

export function removeStepFixedRef(sceneId: number, stepId: string) {
  for (const ext of [".png", ".jpg", ".webp"]) {
    const p = sceneFixedRefPath(sceneId, stepId, ext);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

export { normalizeFixedRefExt, sanitizeStepId };
