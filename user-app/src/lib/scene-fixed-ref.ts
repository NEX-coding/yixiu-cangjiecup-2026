import path from "path";

const PROJECT_ROOT = path.join(process.cwd(), "..");
export const SCENE_FIXED_REFS_DIR = path.join(PROJECT_ROOT, "data/scene-fixed-refs");

export {
  isUploadedFixedRef,
  sceneFixedRefPublicUrl,
} from "./scene-fixed-ref-shared";
