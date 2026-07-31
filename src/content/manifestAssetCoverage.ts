function hasSource(assets: readonly unknown[], source: unknown): boolean { return assets.some((asset) => isObject(asset) && asset.source === source); }

export function validateAssetCoverage(assets: readonly unknown[], manifest: Record<string, unknown>, errors: string[]): void {
  if (!hasSource(assets, manifest.posterUrl)) errors.push("Poster must have a provenance record.");
  const visuals = isObject(manifest.visuals) ? manifest.visuals : undefined;
  if (visuals && !hasSource(assets, visuals.backgroundPlateUrl)) errors.push("Background plate must have a provenance record.");
  if (visuals && !hasSource(assets, visuals.subjectPoseSheetUrl)) errors.push("Pose sheet must have a provenance record.");
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
