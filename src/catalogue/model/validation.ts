import { sceneIds } from "../../domain";
import type { AssetProvenance, AudioProfile, ContentManifest, ManifestValidationResult } from "./contentManifest";

type ManifestRecord = Record<string, unknown>;
type ManifestRule = { error: string; valid(manifest: ManifestRecord): boolean };

const textFields = ["title", "revision", "apparentSizeGuidance", "motionProfile", "occlusion", "supervision", "evidenceEndpoint", "noveltyFamily", "posterUrl"] as const;
const apparentSpeeds = ["still", "slow", "measured", "variable"] as const;
const trajectories = ["curved", "direct", "fluttering", "grounded", "authored"] as const;
const entranceEdges = ["top", "right", "bottom", "left"] as const;

export function validateContentManifest(value: unknown): ManifestValidationResult {
  if (!isObject(value)) return { ok: false, errors: ["Manifest must be an object."] };
  const errors: string[] = [];
  validateFields(value, errors);
  validateAssets(value, errors);
  validateAudio(value, errors);
  return errors.length === 0 ? { ok: true, value: value as unknown as ContentManifest } : { ok: false, errors };
}

const isObject = (value: unknown): value is ManifestRecord => typeof value === "object" && value !== null;

function isText(value: unknown, prefix?: string): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  return prefix === undefined || value.startsWith(prefix);
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function isNumber(value: unknown, minimum?: number, maximum?: number): value is number {
  if (typeof value !== "number") return false;
  if (minimum !== undefined && value < minimum) return false;
  return maximum === undefined || value <= maximum;
}

const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => isText(item));

const manifestRules: readonly ManifestRule[] = [
  { error: "Both contrast variants are required.", valid: (manifest) => hasContrast(manifest.contrast) },
  { error: "A complete cinematic visual package is required.", valid: (manifest) => hasVisuals(manifest.visuals) },
  { error: "Complete catalogue presentation metadata is required.", valid: (manifest) => hasCataloguePresentation(manifest.catalogue) },
  { error: "Complete encounter editorial metadata is required.", valid: (manifest) => hasEncounter(manifest.encounter) },
  { error: "Complete editorial motion metadata is required.", valid: (manifest) => hasMotion(manifest.motion) },
  { error: "Complete apparent-size metadata is required.", valid: (manifest) => hasApparentSize(manifest.apparentSize) },
  { error: "Risk metadata is required.", valid: (manifest) => Array.isArray(manifest.riskFlags) },
  { error: "A finite duration is required.", valid: (manifest) => isPositiveNumber(manifest.finiteDurationMs) },
];

function validateFields(manifest: ManifestRecord, errors: string[]): void {
  if (!sceneIds.includes(manifest.id as typeof sceneIds[number])) errors.push("Unknown or missing scene id.");
  for (const field of textFields) {
    if (!isText(manifest[field])) errors.push(`Missing ${field}.`);
  }
  for (const rule of manifestRules) {
    if (!rule.valid(manifest)) errors.push(rule.error);
  }
}

function hasContrast(value: unknown): boolean {
  return isObject(value) && [value.natural, value.enhanced].every((item) => isText(item));
}

function hasCataloguePresentation(value: unknown): boolean {
  if (!isObject(value)) return false;
  return [
    isText(value.displayTitle),
    isOneOf(value.theme, ["nature", "inside"] as const),
    isOneOf(value.rhythm, ["flowing", "intermittent", "grounded"] as const),
    isText(value.note),
    isText(value.refereeLine),
  ].every(Boolean);
}

function hasVisuals(value: unknown): boolean {
  if (!isObject(value)) return false;
  const optionalRopeValid = value.ropeTextureUrl === undefined || isText(value.ropeTextureUrl, "/assets/");
  return [
    isText(value.backgroundPlateUrl, "/assets/"),
    isText(value.subjectPoseSheetUrl, "/assets/"),
    optionalRopeValid,
    value.foregroundOcclusion === "renderer-authored",
    isText(value.alternateTreatment),
  ].every(Boolean);
}

function hasEncounter(value: unknown): boolean {
  if (!isObject(value)) return false;
  return [
    hasEncounterText(value),
    hasEncounterPresentation(value.presentation),
    hasRiskRationale(value.riskRationale),
    hasEditorialClaims(value.editorialClaims),
  ].every(Boolean);
}

function hasEncounterText(value: ManifestRecord): boolean {
  return [value.authoredScore, value.finale, value.targetCorridorRationale, value.backgroundComplexityRationale, value.contactResponseSemantics, value.restBehavior].every((item) => isText(item));
}

function hasEncounterPresentation(value: unknown): boolean {
  if (!isObject(value) || !isObject(value.tablet) || !isObject(value.television)) return false;
  return value.tablet.distance === "near-screen" && value.television.distance === "room-display";
}

function hasRiskRationale(value: unknown): boolean {
  return isObject(value) && [value.edgeExits, value.repeatedContact, value.occlusion, value.audio].every((item) => isText(item));
}

function hasEditorialClaims(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(hasEditorialClaim);
}

function hasEditorialClaim(value: unknown): boolean {
  if (!isObject(value)) return false;
  return [isText(value.claim), isText(value.evidenceEndpoint), isOneOf(value.confidence, ["limited", "moderate"] as const)].every(Boolean);
}

function hasMotion(value: unknown): boolean {
  if (!isObject(value)) return false;
  return [hasMotionPath(value), hasMotionTiming(value), hasMotionOcclusion(value.occlusion)].every(Boolean);
}

function hasMotionPath(value: ManifestRecord): boolean {
  return isOneOf(value.apparentSpeed, apparentSpeeds)
    && isNonEmptyEnumList(value.trajectory, trajectories)
    && hasEdges(value.entranceEdges)
    && hasEdges(value.exitEdges);
}

function hasMotionTiming(value: ManifestRecord): boolean {
  return [
    isOneOf(value.intermittency, ["continuous", "continuous-with-pauses", "intermittent"] as const),
    isOneOf(value.directionChanges, ["none", "gentle", "frequent", "authored"] as const),
    isOneOf(value.acceleration, ["none", "gentle", "brief", "variable"] as const),
  ].every(Boolean);
}

function hasMotionOcclusion(value: unknown): boolean {
  if (!isObject(value)) return false;
  return isOneOf(value.frequency, ["none", "occasional", "recurring"] as const)
    && isOneOf(value.duration, ["brief", "variable", "sustained"] as const);
}

function isNonEmptyEnumList<T extends readonly string[]>(value: unknown, allowed: T): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isOneOf(item, allowed));
}

function hasEdges(value: unknown): boolean {
  return isNonEmptyEnumList(value, entranceEdges);
}

function hasApparentSize(value: unknown): boolean {
  if (!isObject(value) || !hasSizeRange(value.frameWidthPercent)) return false;
  return [
    isOneOf(value.intendedViewingDistance, ["near-screen", "room-display", "mixed"] as const),
    value.visualAngle === "device-dependent",
    value.basis === "editorial-legibility",
  ].every(Boolean);
}

function hasSizeRange(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  return isNumber(value[0], 0, 100) && isNumber(value[1], 0, 100) && value[0] <= value[1];
}

function isPositiveNumber(value: unknown): boolean {
  return isNumber(value) && value > 0;
}

function validateAssets(manifest: ManifestRecord, errors: string[]): void {
  const assets = manifest.assets;
  if (!Array.isArray(assets) || assets.length === 0) {
    errors.push("At least one provenance record is required.");
    return;
  }
  validateAssetRecords(assets, manifest.revision, errors);
  validateRequiredAssetSources(assets, manifest, errors);
}

function validateAssetRecords(assets: unknown[], revision: unknown, errors: string[]): void {
  const ids = new Set<string>();
  const checksums = new Set<string>();
  assets.forEach((asset, index) => {
    if (!isUniqueAsset(asset, revision, ids, checksums)) errors.push(`Asset ${index + 1} has incomplete provenance.`);
  });
}

function validateRequiredAssetSources(assets: unknown[], manifest: ManifestRecord, errors: string[]): void {
  const sources = new Set(assets.flatMap((asset) => isObject(asset) && typeof asset.source === "string" ? [asset.source] : []));
  if (!sources.has(manifest.posterUrl as string)) errors.push("Poster must have a provenance record.");
  const visuals = isObject(manifest.visuals) ? manifest.visuals : undefined;
  if (!visuals) return;
  if (!sources.has(visuals.backgroundPlateUrl as string)) errors.push("Background plate must have a provenance record.");
  if (!sources.has(visuals.subjectPoseSheetUrl as string)) errors.push("Pose sheet must have a provenance record.");
  if (visuals.ropeTextureUrl !== undefined && !sources.has(visuals.ropeTextureUrl as string)) errors.push("Rope texture must have a provenance record.");
}

function isUniqueAsset(value: unknown, revision: unknown, ids: Set<string>, checksums: Set<string>): value is AssetProvenance {
  if (!isAssetProvenance(value)) return false;
  if (value.contentRevision !== revision || ids.has(value.assetId) || checksums.has(value.checksum)) return false;
  ids.add(value.assetId);
  checksums.add(value.checksum);
  return true;
}

export function isAssetProvenance(value: unknown): value is AssetProvenance {
  if (!isObject(value)) return false;
  return [
    isText(value.assetId), isText(value.creator), isText(value.source, "/assets/"), isText(value.license),
    isTextList(value.derivativeHistory) && value.derivativeHistory.length > 0,
    typeof value.checksum === "string" && /^[a-f0-9]{64}$/.test(value.checksum),
    isOneOf(value.masteringFormat, ["webp", "avif", "png", "opus", "mp3", "wav"] as const),
    isText(value.contentRevision),
  ].every(Boolean);
}

function validateAudio(manifest: ManifestRecord, errors: string[]): void {
  if (manifest.audio !== undefined && !hasAudio(manifest.audio)) errors.push("Audio metadata must name coherent events and exclusions.");
}

function hasAudio(value: unknown): value is AudioProfile {
  if (!isObject(value)) return false;
  return [hasAudioSettings(value), hasAudioEvents(value), hasAudioExclusions(value), hasAudioProvenance(value)].every(Boolean);
}

function hasAudioSettings(audio: ManifestRecord): boolean {
  const validAmbience = audio.ambience === undefined || isOneOf(audio.ambience, ["water", "fabric", "leaves"] as const);
  return [audio.enabledVariant === "on", validAmbience, audio.sourceCoherent === true, audio.startsMuted === true].every(Boolean);
}

function hasAudioEvents(audio: ManifestRecord): audio is ManifestRecord & { eventKinds: string[] } {
  return isTextList(audio.eventKinds) && audio.eventKinds.length > 0;
}

function hasAudioExclusions(audio: ManifestRecord & { eventKinds?: string[] }): boolean {
  const excluded = audio.excluded;
  if (!isTextList(excluded) || excluded.length === 0) return false;
  return !audio.eventKinds?.some((event) => excluded.includes(event));
}

function hasAudioProvenance(audio: ManifestRecord & { eventKinds?: string[] }): boolean {
  if (audio.provenance === undefined) return true;
  if (!Array.isArray(audio.provenance) || audio.provenance.length !== audio.eventKinds?.length) return false;
  return audio.provenance.every((entry) => isAudioProvenance(entry, audio.eventKinds ?? []));
}

function isAudioProvenance(value: unknown, eventKinds: string[]): boolean {
  if (!isObject(value)) return false;
  return [eventKinds.includes(value.eventKind as string), isText(value.source), isText(value.license), typeof value.eligible === "boolean"].every(Boolean);
}
