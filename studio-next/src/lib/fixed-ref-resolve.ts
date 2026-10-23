import path from "path";
import { PROJECT_ROOT } from "./env";
import { isUploadedFixedRef } from "./scene-fixed-ref-shared";
import type { SceneTemplateConfig } from "./scene-template";

export function normalizeFixedRefPath(storedPath: string): string {
  const trimmed = storedPath?.trim();
  if (!trimmed) return "";
  const base = path.basename(trimmed);
  if (isUploadedFixedRef(base)) {
    return path.join(PROJECT_ROOT, "data/scene-fixed-refs", base);
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
