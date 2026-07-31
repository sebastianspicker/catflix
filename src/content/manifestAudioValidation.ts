import type { AudioProfile } from "./types";
import { audioDescriptor } from "./manifestDescriptors";
import { matches } from "../validation/descriptors";

export function validateManifestAudio(manifest: Record<string, unknown>, errors: string[]): void {
  if (manifest.audio !== undefined && !hasValidAudio(manifest.audio)) errors.push("Audio metadata must name coherent events and exclusions.");
}

function hasValidAudio(value: unknown): value is AudioProfile {
  if (!matches(value, audioDescriptor) || !isObject(value)) return false;
  const eventKinds = value.eventKinds as readonly string[];
  return hasValidProvenance(value.provenance, eventKinds) && !eventKinds.some((event) => (value.excluded as readonly string[]).includes(event));
}

function hasValidProvenance(value: unknown, eventKinds: readonly string[]): boolean {
  return value === undefined || (Array.isArray(value) && value.length === eventKinds.length && value.every((record) => isObject(record) && eventKinds.includes(record.eventKind as string)));
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
