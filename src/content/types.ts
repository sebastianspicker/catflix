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
  const manifest = value as Partial<ContentManifest>;
  const errors: string[] = [];
  if (!sceneIds.includes(manifest.id as SceneId)) errors.push("Unknown or missing scene id.");
  for (const field of requiredTextFields) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") errors.push(`Missing ${field}.`);
  }
  if (!manifest.contrast?.natural || !manifest.contrast.enhanced) errors.push("Both contrast variants are required.");
  if (!isEncounterMetadata(manifest.encounter)) errors.push("Complete encounter editorial metadata is required.");
  if (!isVisualPackage(manifest.visuals)) errors.push("A complete cinematic visual package is required.");
  if (!isMotionMetadata(manifest.motion)) errors.push("Complete editorial motion metadata is required.");
  if (!isApparentSizeMetadata(manifest.apparentSize)) errors.push("Complete apparent-size metadata is required.");
  if (!Array.isArray(manifest.riskFlags)) errors.push("Risk metadata is required.");
  if (typeof manifest.finiteDurationMs !== "number" || manifest.finiteDurationMs <= 0) errors.push("A finite duration is required.");
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    errors.push("At least one provenance record is required.");
  } else {
    const assetIds = new Set<string>();
    const checksums = new Set<string>();
    manifest.assets.forEach((asset, index) => {
      if (!asset || !isAssetProvenance(asset) || asset.contentRevision !== manifest.revision || assetIds.has(asset.assetId) || checksums.has(asset.checksum)) {
        errors.push(`Asset ${index + 1} has incomplete provenance.`);
      }
      if (asset) { assetIds.add(asset.assetId); checksums.add(asset.checksum); }
    });
    if (!manifest.assets.some((asset) => asset.source === manifest.posterUrl)) errors.push("Poster must have a provenance record.");
    if (manifest.visuals && !manifest.assets.some((asset) => asset.source === manifest.visuals?.backgroundPlateUrl)) errors.push("Background plate must have a provenance record.");
    if (manifest.visuals && !manifest.assets.some((asset) => asset.source === manifest.visuals?.subjectPoseSheetUrl)) errors.push("Pose sheet must have a provenance record.");
  }
  if (manifest.audio && !isAudioProfile(manifest.audio)) errors.push("Audio metadata must name coherent events and exclusions.");
  return errors.length === 0 ? { ok: true, value: manifest as ContentManifest } : { ok: false, errors };
}

const motionEdges = ["top", "right", "bottom", "left"] as const;
const trajectoryTypes = ["curved", "direct", "fluttering", "grounded", "authored"] as const;
const isNonEmptyText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => typeof value === "string" && values.includes(value as T[number]);

function isMotionMetadata(value: unknown): value is MotionMetadata {
  const motion = value as Partial<MotionMetadata> | null;
  return Boolean(motion
    && isOneOf(motion.apparentSpeed, ["still", "slow", "measured", "variable"] as const)
    && Array.isArray(motion.trajectory) && motion.trajectory.length > 0 && motion.trajectory.every((item) => isOneOf(item, trajectoryTypes))
    && isOneOf(motion.intermittency, ["continuous", "continuous-with-pauses", "intermittent"] as const)
    && isOneOf(motion.directionChanges, ["none", "gentle", "frequent", "authored"] as const)
    && Array.isArray(motion.entranceEdges) && motion.entranceEdges.length > 0 && motion.entranceEdges.every((edge) => isOneOf(edge, motionEdges))
    && Array.isArray(motion.exitEdges) && motion.exitEdges.length > 0 && motion.exitEdges.every((edge) => isOneOf(edge, motionEdges))
    && isOneOf(motion.acceleration, ["none", "gentle", "brief", "variable"] as const)
    && motion.occlusion && isOneOf(motion.occlusion.frequency, ["none", "occasional", "recurring"] as const)
    && isOneOf(motion.occlusion.duration, ["brief", "variable", "sustained"] as const));
}

function isApparentSizeMetadata(value: unknown): value is ApparentSizeMetadata {
  const size = value as Partial<ApparentSizeMetadata> | null;
  return Boolean(size
    && Array.isArray(size.frameWidthPercent) && size.frameWidthPercent.length === 2
    && size.frameWidthPercent.every((item) => typeof item === "number" && item > 0 && item <= 100)
    && size.frameWidthPercent[0] <= size.frameWidthPercent[1]
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

function isAssetProvenance(asset: Partial<AssetProvenance>): asset is AssetProvenance {
  return isNonEmptyText(asset.assetId) && isNonEmptyText(asset.creator) && isNonEmptyText(asset.source)
    && asset.source.startsWith("/assets/") && isNonEmptyText(asset.license)
    && Array.isArray(asset.derivativeHistory) && asset.derivativeHistory.length > 0 && asset.derivativeHistory.every(isNonEmptyText)
    && typeof asset.checksum === "string" && /^[a-f0-9]{64}$/.test(asset.checksum)
    && isOneOf(asset.masteringFormat, ["webp", "avif", "png", "opus", "mp3", "wav"] as const)
    && isNonEmptyText(asset.contentRevision);
}

function isAudioProfile(audio: Partial<AudioProfile>): audio is AudioProfile {
  const eventKinds = audio.eventKinds;
  const excluded = audio.excluded;
  return audio.enabledVariant === "on" && audio.sourceCoherent === true && audio.startsMuted === true
    && Array.isArray(eventKinds) && eventKinds.length > 0 && eventKinds.every(isNonEmptyText)
    && Array.isArray(excluded) && excluded.length > 0 && excluded.every(isNonEmptyText)
    && (audio.provenance === undefined || (Array.isArray(audio.provenance) && audio.provenance.length === eventKinds.length
      && audio.provenance.every((record) => isNonEmptyText(record.eventKind) && eventKinds.includes(record.eventKind) && isNonEmptyText(record.source) && isNonEmptyText(record.license) && typeof record.eligible === "boolean")))
    && !eventKinds.some((event) => excluded.includes(event));
}

function isEncounterMetadata(value: unknown): value is EncounterEditorialMetadata {
  const item = value as Partial<EncounterEditorialMetadata> | null;
  const risks = item?.riskRationale;
  return Boolean(item && isNonEmptyText(item.authoredScore) && isNonEmptyText(item.finale)
    && item.presentation?.tablet?.distance === "near-screen" && item.presentation.television?.distance === "room-display"
    && Array.isArray(item.presentation.tablet.frameWidthPercent) && Array.isArray(item.presentation.television.frameWidthPercent)
    && isNonEmptyText(item.targetCorridorRationale) && isNonEmptyText(item.backgroundComplexityRationale)
    && isNonEmptyText(item.contactResponseSemantics) && isNonEmptyText(item.restBehavior)
    && risks && Object.values(risks).every(isNonEmptyText)
    && Array.isArray(item.editorialClaims) && item.editorialClaims.length > 0
    && item.editorialClaims.every((claim) => isNonEmptyText(claim.claim) && isNonEmptyText(claim.evidenceEndpoint) && (claim.confidence === "limited" || claim.confidence === "moderate")));
}
