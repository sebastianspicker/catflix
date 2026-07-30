export const sceneIds = [
  "balcony-birds",
  "koi-pool",
  "paper-moth",
  "beetle-under-the-fern",
  "red-string",
] as const;

export type SceneId = (typeof sceneIds)[number];
export type FigureGroundVariant = "natural" | "enhanced";
export type MotionVariant = "continuous" | "intermittent";
export type SoundVariant = "off" | "on";
export type NoveltyVariant = "familiar" | "alternate";

export interface VariantSelection {
  figureGround: FigureGroundVariant;
  motion: MotionVariant;
  sound: SoundVariant;
  novelty: NoveltyVariant;
}

export interface AssetProvenance {
  assetId: string;
  creator: string;
  source: string;
  license: string;
  derivativeHistory: string[];
  checksum: string;
  masteringFormat: "webp" | "avif" | "png" | "opus" | "mp3" | "wav";
  contentRevision: string;
}

export interface AudioProfile {
  enabledVariant: "on";
  ambience?: "water" | "fabric" | "leaves";
  eventKinds: readonly string[];
  sourceCoherent: true;
  startsMuted: true;
  excluded: readonly string[];
  provenance?: readonly { eventKind: string; source: string; license: string; eligible: boolean }[];
}

export interface EncounterEditorialMetadata {
  authoredScore: string;
  finale: string;
  presentation: {
    tablet: { distance: "near-screen"; frameWidthPercent: readonly [number, number] };
    television: { distance: "room-display"; frameWidthPercent: readonly [number, number] };
  };
  targetCorridorRationale: string;
  backgroundComplexityRationale: string;
  contactResponseSemantics: string;
  restBehavior: string;
  riskRationale: { edgeExits: string; repeatedContact: string; occlusion: string; audio: string };
  editorialClaims: readonly { claim: string; evidenceEndpoint: string; confidence: "limited" | "moderate" }[];
}

/** Editorial motion descriptions, not measurements or claims about animal vision. */
export interface MotionMetadata {
  apparentSpeed: "still" | "slow" | "measured" | "variable";
  trajectory: readonly ("curved" | "direct" | "fluttering" | "grounded" | "authored")[];
  intermittency: "continuous" | "continuous-with-pauses" | "intermittent";
  directionChanges: "none" | "gentle" | "frequent" | "authored";
  entranceEdges: readonly ("top" | "right" | "bottom" | "left")[];
  exitEdges: readonly ("top" | "right" | "bottom" | "left")[];
  acceleration: "none" | "gentle" | "brief" | "variable";
  occlusion: { frequency: "none" | "occasional" | "recurring"; duration: "brief" | "variable" | "sustained" };
}

/** Authored presentation range, not a feline preference threshold. */
export interface ApparentSizeMetadata {
  frameWidthPercent: readonly [number, number];
  intendedViewingDistance: "near-screen" | "room-display" | "mixed";
  visualAngle: "device-dependent";
  basis: "editorial-legibility";
}

export interface SceneVisualPackage {
  backgroundPlateUrl: string;
  subjectPoseSheetUrl: string;
  foregroundOcclusion: "renderer-authored";
  alternateTreatment: string;
}

export interface ContentManifest {
  id: SceneId;
  title: string;
  revision: string;
  subjectClass: "bird" | "fish" | "insect" | "object";
  apparentSizeGuidance: string;
  apparentSize: ApparentSizeMetadata;
  contrast: { natural: string; enhanced: string };
  motionProfile: string;
  motion: MotionMetadata;
  occlusion: string;
  supervision: string;
  riskFlags: readonly string[];
  evidenceEndpoint: string;
  evidenceConfidence: "limited" | "moderate";
  noveltyFamily: string;
  posterUrl: string;
  visuals: SceneVisualPackage;
  finiteDurationMs: number;
  audio?: AudioProfile;
  encounter: EncounterEditorialMetadata;
  assets: readonly AssetProvenance[];
}

export type ManifestValidationResult =
  | { ok: true; value: ContentManifest }
  | { ok: false; errors: readonly string[] };

type PartialManifest = Partial<ContentManifest>;
type PartialMotion = Partial<MotionMetadata>;
type PartialOcclusion = Partial<MotionMetadata["occlusion"]>;
type PartialAsset = Partial<AssetProvenance>;
type PartialAudioProfile = Partial<AudioProfile>;
type PartialEncounter = Partial<EncounterEditorialMetadata>;
type PartialPresentation = Partial<EncounterEditorialMetadata["presentation"]>;
type PartialRiskRationale = Partial<EncounterEditorialMetadata["riskRationale"]>;
type PartialEditorialClaim = Partial<EncounterEditorialMetadata["editorialClaims"][number]>;
type AssetIdentifierSet = Set<string>;

const requiredTextFields = [
  "title",
  "revision",
  "apparentSizeGuidance",
  "motionProfile",
  "occlusion",
  "supervision",
  "evidenceEndpoint",
  "noveltyFamily",
  "posterUrl",
] as const;

export function validateContentManifest(value: unknown): ManifestValidationResult {
  if (typeof value !== "object" || value === null) {
    return { ok: false, errors: ["Manifest must be an object."] };
  }
  const manifest = value as PartialManifest;
  const errors: string[] = [];
  validateManifestFields(manifest, errors);
  validateManifestAssets(manifest, errors);
  validateManifestAudio(manifest, errors);
  return errors.length === 0 ? { ok: true, value: manifest as ContentManifest } : { ok: false, errors };
}

function validateManifestFields(manifest: PartialManifest, errors: string[]): void {
  if (!sceneIds.includes(manifest.id as SceneId)) errors.push("Unknown or missing scene id.");
  for (const [field, fieldValue] of requiredTextFieldValues(manifest)) {
    if (!isNonEmptyText(fieldValue)) errors.push(`Missing ${field}.`);
  }
  if (!manifest.contrast?.natural || !manifest.contrast.enhanced) errors.push("Both contrast variants are required.");
  if (!isEncounterMetadata(manifest.encounter)) errors.push("Complete encounter editorial metadata is required.");
  if (!isVisualPackage(manifest.visuals)) errors.push("A complete cinematic visual package is required.");
  if (!isMotionMetadata(manifest.motion)) errors.push("Complete editorial motion metadata is required.");
  if (!isApparentSizeMetadata(manifest.apparentSize)) errors.push("Complete apparent-size metadata is required.");
  if (!Array.isArray(manifest.riskFlags)) errors.push("Risk metadata is required.");
  if (typeof manifest.finiteDurationMs !== "number" || manifest.finiteDurationMs <= 0) errors.push("A finite duration is required.");
}

function requiredTextFieldValues(manifest: PartialManifest): readonly (readonly [string, unknown])[] {
  return [
    [requiredTextFields[0], manifest.title],
    [requiredTextFields[1], manifest.revision],
    [requiredTextFields[2], manifest.apparentSizeGuidance],
    [requiredTextFields[3], manifest.motionProfile],
    [requiredTextFields[4], manifest.occlusion],
    [requiredTextFields[5], manifest.supervision],
    [requiredTextFields[6], manifest.evidenceEndpoint],
    [requiredTextFields[7], manifest.noveltyFamily],
    [requiredTextFields[8], manifest.posterUrl],
  ];
}

function validateManifestAssets(manifest: PartialManifest, errors: string[]): void {
  const assets = manifest.assets;
  if (!Array.isArray(assets) || assets.length === 0) {
    errors.push("At least one provenance record is required.");
    return;
  }
  const assetIds = new Set<string>();
  const checksums = new Set<string>();
  assets.forEach((asset, index) => {
    if (!isUniqueAssetForRevision(asset, manifest.revision, assetIds, checksums)) {
      errors.push(`Asset ${index + 1} has incomplete provenance.`);
    }
  });
  validateAssetCoverage(assets, manifest, errors);
}

function isUniqueAssetForRevision(value: unknown, revision: unknown, assetIds: AssetIdentifierSet, checksums: AssetIdentifierSet): value is AssetProvenance {
  if (!isAssetProvenance(value) || value.contentRevision !== revision || assetIds.has(value.assetId) || checksums.has(value.checksum)) return false;
  assetIds.add(value.assetId);
  checksums.add(value.checksum);
  return true;
}

function validateAssetCoverage(assets: readonly AssetProvenance[], manifest: PartialManifest, errors: string[]): void {
  if (!assets.some((asset) => asset.source === manifest.posterUrl)) errors.push("Poster must have a provenance record.");
  const visuals = manifest.visuals;
  if (visuals && !assets.some((asset) => asset.source === visuals.backgroundPlateUrl)) errors.push("Background plate must have a provenance record.");
  if (visuals && !assets.some((asset) => asset.source === visuals.subjectPoseSheetUrl)) errors.push("Pose sheet must have a provenance record.");
}

function validateManifestAudio(manifest: PartialManifest, errors: string[]): void {
  if (manifest.audio && !isAudioProfile(manifest.audio)) {
    errors.push("Audio metadata must name coherent events and exclusions.");
  }
}

const motionEdges = ["top", "right", "bottom", "left"] as const;
const trajectoryTypes = ["curved", "direct", "fluttering", "grounded", "authored"] as const;
const isNonEmptyText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => typeof value === "string" && values.includes(value as T[number]);

function isMotionMetadata(value: unknown): value is MotionMetadata {
  const motion = value as PartialMotion | null;
  if (!motion) return false;
  return hasValidMotionPace(motion)
    && hasNonEmptyValues(motion.trajectory, trajectoryTypes)
    && hasNonEmptyValues(motion.entranceEdges, motionEdges)
    && hasNonEmptyValues(motion.exitEdges, motionEdges)
    && hasValidOcclusion(motion.occlusion);
}

function hasValidMotionPace(motion: PartialMotion): boolean {
  return isOneOf(motion.apparentSpeed, ["still", "slow", "measured", "variable"] as const)
    && isOneOf(motion.intermittency, ["continuous", "continuous-with-pauses", "intermittent"] as const)
    && isOneOf(motion.directionChanges, ["none", "gentle", "frequent", "authored"] as const)
    && isOneOf(motion.acceleration, ["none", "gentle", "brief", "variable"] as const);
}

function hasNonEmptyValues(value: unknown, allowed: readonly string[]): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isOneOf(item, allowed));
}

function hasValidOcclusion(value: unknown): boolean {
  const occlusion = value as PartialOcclusion | null;
  return Boolean(occlusion
    && isOneOf(occlusion.frequency, ["none", "occasional", "recurring"] as const)
    && isOneOf(occlusion.duration, ["brief", "variable", "sustained"] as const));
}

function isApparentSizeMetadata(value: unknown): value is ApparentSizeMetadata {
  const size = value as Partial<ApparentSizeMetadata> | null;
  const frameWidthPercent: unknown = size?.frameWidthPercent;
  return Boolean(size
    && Array.isArray(frameWidthPercent) && frameWidthPercent.length === 2
    && frameWidthPercent.every((item) => typeof item === "number" && item > 0 && item <= 100)
    && frameWidthPercent[0] <= frameWidthPercent[1]
    && isOneOf(size.intendedViewingDistance, ["near-screen", "room-display", "mixed"] as const)
    && size.visualAngle === "device-dependent"
    && size.basis === "editorial-legibility");
}

function isVisualPackage(value: unknown): value is SceneVisualPackage {
  const visuals = value as Partial<SceneVisualPackage> | null;
  return Boolean(visuals && isNonEmptyText(visuals.backgroundPlateUrl) && visuals.backgroundPlateUrl.startsWith("/assets/")
    && isNonEmptyText(visuals.subjectPoseSheetUrl) && visuals.subjectPoseSheetUrl.startsWith("/assets/")
    && visuals.foregroundOcclusion === "renderer-authored" && isNonEmptyText(visuals.alternateTreatment));
}

function isAssetProvenance(value: unknown): value is AssetProvenance {
  const asset = value as PartialAsset | null;
  if (!asset) return false;
  return hasAssetIdentity(asset)
    && hasAssetDerivativeHistory(asset.derivativeHistory)
    && hasValidChecksum(asset.checksum)
    && isOneOf(asset.masteringFormat, ["webp", "avif", "png", "opus", "mp3", "wav"] as const)
    && isNonEmptyText(asset.contentRevision);
}

function hasAssetIdentity(asset: PartialAsset): boolean {
  return isNonEmptyText(asset.assetId)
    && isNonEmptyText(asset.creator)
    && isNonEmptyText(asset.source)
    && asset.source.startsWith("/assets/")
    && isNonEmptyText(asset.license);
}

function hasAssetDerivativeHistory(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyText);
}

function hasValidChecksum(value: unknown): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isAudioProfile(audio: PartialAudioProfile): audio is AudioProfile {
  const eventKinds = audio.eventKinds;
  const excluded = audio.excluded;
  return audio.enabledVariant === "on"
    && audio.sourceCoherent === true
    && audio.startsMuted === true
    && hasNonEmptyTextList(eventKinds)
    && hasNonEmptyTextList(excluded)
    && hasValidAudioProvenance(audio.provenance, eventKinds)
    && !eventKinds.some((event) => excluded.includes(event));
}

function hasNonEmptyTextList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyText);
}

function hasValidAudioProvenance(provenance: AudioProfile["provenance"], eventKinds: readonly string[]): boolean {
  return provenance === undefined || (Array.isArray(provenance)
    && provenance.length === eventKinds.length
    && provenance.every((record) => isNonEmptyText(record.eventKind)
      && eventKinds.includes(record.eventKind)
      && isNonEmptyText(record.source)
      && isNonEmptyText(record.license)
      && typeof record.eligible === "boolean"));
}

function isEncounterMetadata(value: unknown): value is EncounterEditorialMetadata {
  const item = value as PartialEncounter | null;
  if (!item) return false;
  return hasEncounterText(item)
    && hasValidPresentation(item.presentation)
    && hasRiskRationale(item.riskRationale)
    && hasEditorialClaims(item.editorialClaims);
}

function hasEncounterText(item: PartialEncounter): boolean {
  return hasNonEmptyTextList([
    item.authoredScore,
    item.finale,
    item.targetCorridorRationale,
    item.backgroundComplexityRationale,
    item.contactResponseSemantics,
    item.restBehavior,
  ]);
}

function hasValidPresentation(value: unknown): boolean {
  const presentation = value as PartialPresentation | null;
  const tablet = presentation?.tablet as { distance?: unknown; frameWidthPercent?: unknown } | undefined;
  const television = presentation?.television as { distance?: unknown; frameWidthPercent?: unknown } | undefined;
  return Boolean(tablet && television
    && tablet.distance === "near-screen"
    && television.distance === "room-display"
    && Array.isArray(tablet.frameWidthPercent)
    && Array.isArray(television.frameWidthPercent));
}

function hasRiskRationale(value: unknown): boolean {
  const risks = value as PartialRiskRationale | null;
  return Boolean(risks && hasNonEmptyTextList([
    risks.edgeExits,
    risks.repeatedContact,
    risks.occlusion,
    risks.audio,
  ]));
}

function hasEditorialClaims(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((claim) => {
    const item = claim as PartialEditorialClaim | null;
    return Boolean(item
      && isNonEmptyText(item.claim)
      && isNonEmptyText(item.evidenceEndpoint)
      && isOneOf(item.confidence, ["limited", "moderate"] as const));
  });
}
