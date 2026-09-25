import type { AssetProvenance } from "../catalogue/model/contentManifest";
import type { PlaybackMode, SceneId, SceneMotionMode, VariantSelection } from "../domain";

export type { SceneMotionMode } from "../domain";
export interface StorageStatus { mode: "persistent" | "degraded"; message?: string; }
export interface DeviceSettings { soundEnabled: boolean; reducedMotion: boolean; sceneMotionMode: SceneMotionMode; safetyAcknowledgedAt?: string; }
export interface QueueItem { id: string; sceneId: SceneId; variant: VariantSelection; addedAt: string; }
export interface ProgressRecord { sceneId: SceneId; revision: string; elapsedMs: number; durationMs: number; updatedAt: string; }
export interface RefereeNote { id: string; cat: "Arri" | "Ozzy" | "Mika"; sceneId: SceneId; contentRevision: string; createdAt: string; rawNote: string; vocabulary: readonly ObservationBehavior[]; touchTimestamps?: readonly number[]; }
export interface ComparisonRun { sceneId: SceneId; contentRevision?: string; variant: VariantSelection; seed?: number; encounterScore?: string; observationId?: string; }
export interface ComparisonRecord { id: string; createdAt: string; first: ComparisonRun; second: ComparisonRun; changedDimension: "figureGround" | "motion" | "sound" | "novelty"; observation?: string; }
export type ObservationBehavior = "approach" | "orientation" | "tracking" | "pouncing" | "disengagement" | "re-engagement" | "post-session behavior";
export interface SessionObservation {
  schemaVersion: 2;
  id: string;
  sceneId: SceneId;
  contentRevision: string;
  variant: VariantSelection;
  /** Present for current curated runs; historical observations remain display-only. */
  seed?: number;
  /** The authored encounter score recorded with a current curated run. */
  encounterScore?: string;
  /** Current curator dimensions only; legacy records without it remain display-only. */
  comparisonDimension?: "figureGround" | "motion";
  playbackMode: PlaybackMode;
  viewingDistanceBand: "near-screen" | "room-display";
  roomLightBand: "dim" | "moderate" | "bright";
  soundEnabled: boolean;
  observedCat?: "Arri" | "Ozzy" | "Mika";
  elapsedMs: number;
  endReason: "completed" | "owner-ended" | "cat-left" | "safety-stop";
  acceptedContactTimestamps: readonly number[];
  vocabulary: readonly ObservationBehavior[];
  safetyEvent?: string;
  physicalPlayHandoff: "not-recorded" | "offered" | "ignored" | "voluntarily-joined";
  rawNote: string;
  confirmedAt: string;
}
/** The user-authored portion of an observation, before session context is attached. */
export type ObservationDraft = Pick<SessionObservation, "endReason" | "vocabulary" | "safetyEvent" | "physicalPlayHandoff" | "rawNote">;
export interface StoredProvenance extends AssetProvenance { savedAt: string; }
export interface LegacyDeviceSettings { soundEnabled: boolean; reducedMotion: boolean; safetyAcknowledgedAt?: string; }
export interface CatflixDataExportV1 { schemaVersion: 1; exportedAt: string; settings: LegacyDeviceSettings; queue: QueueItem[]; progress: ProgressRecord[]; notes: RefereeNote[]; comparisons: ComparisonRecord[]; provenance: StoredProvenance[]; }
export interface CatflixDataExport { schemaVersion: 2; exportedAt: string; settings: DeviceSettings; queue: QueueItem[]; progress: ProgressRecord[]; notes: RefereeNote[]; observations: SessionObservation[]; comparisons: ComparisonRecord[]; provenance: StoredProvenance[]; }

/** The local-only record families shown together in the owner history. */
export interface LocalRecordHistory {
  observations: readonly SessionObservation[];
  notes: readonly RefereeNote[];
  comparisons: readonly ComparisonRecord[];
}

export type RecordDeletionTarget = { kind: "note" | "observation" | "comparison"; id: string };

export interface ImportPreview {
  sourceSchemaVersion: 1 | 2;
  targetSchemaVersion: 2;
  exportedAt: string;
  counts: Readonly<{ settings: 1; queue: number; progress: number; notes: number; observations: number; comparisons: number; provenance: number }>;
}
