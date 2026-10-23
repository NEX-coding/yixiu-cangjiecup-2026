import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.join(process.cwd(), "..");
export const SCENE_SAMPLES_DIR = path.join(PROJECT_ROOT, "data/scene-samples");

export function sceneSamplePublicUrl(fileName: string) {
  return `/api/scene-templates/samples/${fileName}`;
}
