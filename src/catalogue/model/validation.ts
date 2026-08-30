import { sceneIds } from "../../domain";
import type { AssetProvenance, AudioProfile, ContentManifest, ManifestValidationResult } from "./contentManifest";

export function validateContentManifest(value: unknown): ManifestValidationResult {
  if (!isObject(value)) return { ok: false, errors: ["Manifest must be an object."] };
  const errors: string[] = [];
  validateFields(value, errors);
  validateAssets(value, errors);
  validateAudio(value, errors);
  return errors.length === 0 ? { ok: true, value: value as unknown as ContentManifest } : { ok: false, errors };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isText = (value: unknown, prefix?: string): value is string => typeof value === "string" && value.trim() !== "" && (prefix === undefined || value.startsWith(prefix));
const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => typeof value === "string" && values.includes(value as T[number]);
const isNumber = (value: unknown, minimum?: number, maximum?: number): value is number => typeof value === "number" && (minimum === undefined || value >= minimum) && (maximum === undefined || value <= maximum);
const textFields = ["title", "revision", "apparentSizeGuidance", "motionProfile", "occlusion", "supervision", "evidenceEndpoint", "noveltyFamily", "posterUrl"] as const;

function validateFields(manifest: Record<string, unknown>, errors: string[]): void {
  if (!sceneIds.includes(manifest.id as typeof sceneIds[number])) errors.push("Unknown or missing scene id.");
  textFields.filter((field) => !isText(manifest[field])).forEach((field) => errors.push(`Missing ${field}.`));
  if (!isObject(manifest.contrast) || !isText(manifest.contrast.natural) || !isText(manifest.contrast.enhanced)) errors.push("Both contrast variants are required.");
  if (!hasVisuals(manifest.visuals)) errors.push("A complete cinematic visual package is required.");
  if (!hasCataloguePresentation(manifest.catalogue)) errors.push("Complete catalogue presentation metadata is required.");
  if (!hasEncounter(manifest.encounter)) errors.push("Complete encounter editorial metadata is required.");
  if (!hasMotion(manifest.motion)) errors.push("Complete editorial motion metadata is required.");
  if (!hasApparentSize(manifest.apparentSize)) errors.push("Complete apparent-size metadata is required.");
  if (!Array.isArray(manifest.riskFlags)) errors.push("Risk metadata is required.");
  if (!isNumber(manifest.finiteDurationMs) || manifest.finiteDurationMs <= 0) errors.push("A finite duration is required.");
}
function hasCataloguePresentation(value: unknown): boolean {
  return isObject(value)
    && isText(value.displayTitle)
    && isOneOf(value.theme, ["nature", "inside"] as const)
    && isOneOf(value.rhythm, ["flowing", "intermittent", "grounded"] as const)
    && isText(value.note)
    && isText(value.refereeLine);
}

function hasVisuals(value: unknown): boolean {
  return isObject(value) && isText(value.backgroundPlateUrl, "/assets/") && isText(value.subjectPoseSheetUrl, "/assets/") && (value.ropeTextureUrl === undefined || isText(value.ropeTextureUrl, "/assets/")) && value.foregroundOcclusion === "renderer-authored" && isText(value.alternateTreatment);
}
function hasEncounter(value: unknown): boolean {
  if (!isObject(value) || !isText(value.authoredScore) || !isText(value.finale) || !isText(value.targetCorridorRationale) || !isText(value.backgroundComplexityRationale) || !isText(value.contactResponseSemantics) || !isText(value.restBehavior)) return false;
  const presentation = value.presentation;
  const rationale = value.riskRationale;
  const claims = value.editorialClaims;
  return isObject(presentation) && isObject(presentation.tablet) && isObject(presentation.television) && presentation.tablet.distance === "near-screen" && presentation.television.distance === "room-display" && isObject(rationale) && [rationale.edgeExits, rationale.repeatedContact, rationale.occlusion, rationale.audio].every((item) => isText(item)) && Array.isArray(claims) && claims.length > 0 && claims.every((claim) => isObject(claim) && isText(claim.claim) && isText(claim.evidenceEndpoint) && isOneOf(claim.confidence, ["limited", "moderate"] as const));
}
function hasMotion(value: unknown): boolean {
  if (!isObject(value) || !isOneOf(value.apparentSpeed, ["still", "slow", "measured", "variable"] as const) || !Array.isArray(value.trajectory) || value.trajectory.length === 0 || !value.trajectory.every((item) => isOneOf(item, ["curved", "direct", "fluttering", "grounded", "authored"] as const))) return false;
  return isOneOf(value.intermittency, ["continuous", "continuous-with-pauses", "intermittent"] as const) && isOneOf(value.directionChanges, ["none", "gentle", "frequent", "authored"] as const) && isOneOf(value.acceleration, ["none", "gentle", "brief", "variable"] as const) && hasEdges(value.entranceEdges) && hasEdges(value.exitEdges) && isObject(value.occlusion) && isOneOf(value.occlusion.frequency, ["none", "occasional", "recurring"] as const) && isOneOf(value.occlusion.duration, ["brief", "variable", "sustained"] as const);
}
function hasEdges(value: unknown): boolean { return Array.isArray(value) && value.length > 0 && value.every((item) => isOneOf(item, ["top", "right", "bottom", "left"] as const)); }
function hasApparentSize(value: unknown): boolean {
  return isObject(value) && Array.isArray(value.frameWidthPercent) && value.frameWidthPercent.length === 2 && isNumber(value.frameWidthPercent[0], 0, 100) && isNumber(value.frameWidthPercent[1], 0, 100) && value.frameWidthPercent[0] <= value.frameWidthPercent[1] && isOneOf(value.intendedViewingDistance, ["near-screen", "room-display", "mixed"] as const) && value.visualAngle === "device-dependent" && value.basis === "editorial-legibility";
}
function validateAssets(manifest: Record<string, unknown>, errors: string[]): void {
  const assets = manifest.assets;
  if (!Array.isArray(assets) || assets.length === 0) { errors.push("At least one provenance record is required."); return; }
  const ids = new Set<string>(); const checksums = new Set<string>();
  assets.forEach((asset, index) => { if (!isUniqueAsset(asset, manifest.revision, ids, checksums)) errors.push(`Asset ${index + 1} has incomplete provenance.`); });
  if (!assets.some((asset) => isObject(asset) && asset.source === manifest.posterUrl)) errors.push("Poster must have a provenance record.");
  const visuals = isObject(manifest.visuals) ? manifest.visuals : undefined;
  if (visuals && !assets.some((asset) => isObject(asset) && asset.source === visuals.backgroundPlateUrl)) errors.push("Background plate must have a provenance record.");
  if (visuals && !assets.some((asset) => isObject(asset) && asset.source === visuals.subjectPoseSheetUrl)) errors.push("Pose sheet must have a provenance record.");
  if (visuals && visuals.ropeTextureUrl !== undefined && !assets.some((asset) => isObject(asset) && asset.source === visuals.ropeTextureUrl)) errors.push("Rope texture must have a provenance record.");
}
function isUniqueAsset(value: unknown, revision: unknown, ids: Set<string>, checksums: Set<string>): value is AssetProvenance {
  if (!isAsset(value) || value.contentRevision !== revision || ids.has(value.assetId) || checksums.has(value.checksum)) return false;
  ids.add(value.assetId); checksums.add(value.checksum); return true;
}
export function isAssetProvenance(value: unknown): value is AssetProvenance { return isObject(value) && isText(value.assetId) && isText(value.creator) && isText(value.source, "/assets/") && isText(value.license) && Array.isArray(value.derivativeHistory) && value.derivativeHistory.length > 0 && value.derivativeHistory.every((item) => isText(item)) && typeof value.checksum === "string" && /^[a-f0-9]{64}$/.test(value.checksum) && isOneOf(value.masteringFormat, ["webp", "avif", "png", "opus", "mp3", "wav"] as const) && isText(value.contentRevision); }
const isAsset = isAssetProvenance;
function validateAudio(manifest: Record<string, unknown>, errors: string[]): void { if (manifest.audio !== undefined && !hasAudio(manifest.audio)) errors.push("Audio metadata must name coherent events and exclusions."); }
function hasAudio(value: unknown): value is AudioProfile {
  if (!isObject(value)) return false;
  const audio = value as Record<string, any>;
  return audio.enabledVariant === "on" && (audio.ambience === undefined || isOneOf(audio.ambience, ["water", "fabric", "leaves"] as const)) && Array.isArray(audio.eventKinds) && audio.eventKinds.length > 0 && audio.eventKinds.every((item: unknown) => isText(item)) && audio.sourceCoherent === true && audio.startsMuted === true && Array.isArray(audio.excluded) && audio.excluded.length > 0 && audio.excluded.every((item: unknown) => isText(item)) && !audio.eventKinds.some((event: string) => audio.excluded.includes(event)) && (audio.provenance === undefined || (Array.isArray(audio.provenance) && audio.provenance.length === audio.eventKinds.length && audio.provenance.every((entry: unknown) => isObject(entry) && audio.eventKinds.includes(entry.eventKind as string) && isText(entry.source) && isText(entry.license) && typeof entry.eligible === "boolean")));
}
