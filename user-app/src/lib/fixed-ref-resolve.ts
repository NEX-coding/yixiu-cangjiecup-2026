import fs from "fs";
import path from "path";
import { PROJECT_ROOT } from "./env";
import { isUploadedFixedRef, SCENE_FIXED_REFS_DIR } from "./scene-fixed-ref";
import type { SceneStep, SceneTemplateConfig } from "./scene-template";

export function resolveFixedRefPath(storedPath: string): string | null {
  const trimmed = storedPath?.trim();
  if (!trimmed) return null;
  if (fs.existsSync(trimmed)) return trimmed;

  const base = path.basename(trimmed);
  for (const candidate of [
    path.join(PROJECT_ROOT, base),
    path.join(SCENE_FIXED_REFS_DIR, base),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function normalizeFixedRefPath(storedPath: string): string {
  const trimmed = storedPath?.trim();
  if (!trimmed) return "";
  const base = path.basename(trimmed);
  if (isUploadedFixedRef(base)) {
    return path.join(SCENE_FIXED_REFS_DIR, base);
  }
  return path.join(PROJECT_ROOT, base);
}

export function normalizeSceneConfig(config: SceneTemplateConfig): SceneTemplateConfig {
  return {
    ...config,
    steps: config.steps.map((step) => ({
      ...step,
      fixedRefPath: step.fixedRefPath
        ? normalizeFixedRefPath(step.fixedRefPath)
        : step.fixedRefPath,
    })),
  };
}

export function normalizeSceneStep(step: SceneStep): SceneStep {
  if (!step.fixedRefPath) return step;
  return { ...step, fixedRefPath: normalizeFixedRefPath(step.fixedRefPath) };
}
