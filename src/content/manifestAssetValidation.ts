import type { AssetProvenance } from "./types";
import { assetDescriptor } from "./manifestDescriptors";
import { validateAssetCoverage } from "./manifestAssetCoverage";
import { matches } from "../validation/descriptors";

const validateManifestAssets = (manifest: Record<string, unknown>, errors: string[]): void => {
  const assets = manifest.assets;
  if (!Array.isArray(assets) || assets.length === 0) { errors.push("At least one provenance record is required."); return; }
  const assetIds = new Set<string>();
  const checksums = new Set<string>();
  assets.forEach((asset, index) => { validateAsset(asset, index, manifest.revision, assetIds, checksums, errors); });
  validateAssetCoverage(assets, manifest, errors);
};

const isAssetProvenance = (value: unknown): value is AssetProvenance => {
  return matches(value, assetDescriptor) && hasValidChecksum(value);
};

const validateAsset = (value: unknown, index: number, revision: unknown, assetIds: Set<string>, checksums: Set<string>, errors: string[]): void => {
  if (!isUniqueAsset(value, revision, assetIds, checksums)) errors.push(`Asset ${index + 1} has incomplete provenance.`);
};

const isUniqueAsset = (value: unknown, revision: unknown, assetIds: Set<string>, checksums: Set<string>): boolean => {
  if (!isAssetProvenance(value) || value.contentRevision !== revision || assetIds.has(value.assetId) || checksums.has(value.checksum)) return false;
  assetIds.add(value.assetId); checksums.add(value.checksum); return true;
};

const hasValidChecksum = (value: unknown): boolean => isObject(value) && typeof value.checksum === "string" && /^[a-f0-9]{64}$/.test(value.checksum);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export { isAssetProvenance, validateManifestAssets };
