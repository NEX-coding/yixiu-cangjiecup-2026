export function sceneFixedRefPublicUrl(fileName: string) {
  return `/api/scene-templates/fixed-refs/${fileName}`;
}

export function isUploadedFixedRef(fileName: string) {
  return /^fixed_\d+_[a-z0-9-]+\.(png|jpe?g|webp)$/i.test(fileName);
}
