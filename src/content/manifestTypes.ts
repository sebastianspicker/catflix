import type { SceneId } from "./sceneIds";

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
