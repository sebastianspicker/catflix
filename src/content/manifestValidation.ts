import type { ContentManifest, ManifestValidationResult } from "./types";
import { validateManifestAssets } from "./manifestAssetValidation";
import { validateManifestAudio } from "./manifestAudioValidation";
import { validateManifestFields } from "./manifestFieldValidation";

export function validateContentManifest(value: unknown): ManifestValidationResult {
  if (!isObject(value)) return { ok: false, errors: ["Manifest must be an object."] };
  const errors: string[] = [];
  validateManifestFields(value, errors);
  validateManifestAssets(value, errors);
  validateManifestAudio(value, errors);
  return errors.length === 0 ? { ok: true, value: value as unknown as ContentManifest } : { ok: false, errors };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
