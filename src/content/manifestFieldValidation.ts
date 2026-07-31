import { sceneIds } from "./sceneIds";
import { apparentSizeDescriptor, contrastDescriptor, encounterDescriptor, finiteDurationDescriptor, motionDescriptor, requiredManifestTextFields, visualPackageDescriptor } from "./manifestDescriptors";
import { matches, text, type Descriptor } from "../validation/descriptors";

export function validateManifestFields(manifest: Record<string, unknown>, errors: string[]): void {
  if (!sceneIds.includes(manifest.id as typeof sceneIds[number])) errors.push("Unknown or missing scene id.");
  const requiredText = {
    title: manifest.title,
    revision: manifest.revision,
    apparentSizeGuidance: manifest.apparentSizeGuidance,
    motionProfile: manifest.motionProfile,
    occlusion: manifest.occlusion,
    supervision: manifest.supervision,
    evidenceEndpoint: manifest.evidenceEndpoint,
    noveltyFamily: manifest.noveltyFamily,
    posterUrl: manifest.posterUrl,
  } satisfies Record<typeof requiredManifestTextFields[number], unknown>;
  Object.entries(requiredText).filter(([, value]) => !matches(value, text())).forEach(([field]) => errors.push(`Missing ${field}.`));
  validateDescriptor(manifest.contrast, contrastDescriptor, "Both contrast variants are required.", errors);
  validateDescriptor(manifest.visuals, visualPackageDescriptor, "A complete cinematic visual package is required.", errors);
  validateDescriptor(manifest.encounter, encounterDescriptor, "Complete encounter editorial metadata is required.", errors);
  validateMotion(manifest.motion, errors);
  validateApparentSize(manifest.apparentSize, errors);
  if (!Array.isArray(manifest.riskFlags)) errors.push("Risk metadata is required.");
  if (!matches(manifest.finiteDurationMs, finiteDurationDescriptor) || !(manifest.finiteDurationMs as number > 0)) errors.push("A finite duration is required.");
}

function validateDescriptor(value: unknown, descriptor: Descriptor, error: string, errors: string[]): void {
  if (!matches(value, descriptor)) errors.push(error);
}

function validateMotion(value: unknown, errors: string[]): void {
  validateDescriptor(value, motionDescriptor, "Complete editorial motion metadata is required.", errors);
}

function validateApparentSize(value: unknown, errors: string[]): void {
  const range = isObject(value) ? value.frameWidthPercent : undefined;
  if (!matches(value, apparentSizeDescriptor) || !(Array.isArray(range) && range[0] <= range[1])) errors.push("Complete apparent-size metadata is required.");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
