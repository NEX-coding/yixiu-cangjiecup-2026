export function sanitizeStepId(stepId: string) {
  return stepId.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
}

export function normalizeFixedRefExt(ext: string) {
  const e = ext.toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return ".jpg";
  if (e === ".webp") return ".webp";
  return ".png";
}

export function sceneFixedRefFileName(
  sceneId: number,
  stepId: string,
  ext = ".png"
) {
  return `fixed_${sceneId}_${sanitizeStepId(stepId)}${normalizeFixedRefExt(ext)}`;
}

export function sceneFixedRefPublicUrl(fileName: string) {
  return `/api/scene-templates/fixed-refs/${fileName}`;
}

export function isUploadedFixedRef(fileName: string) {
  return /^fixed_\d+_[a-z0-9-]+\.(png|jpe?g|webp)$/i.test(fileName);
}
