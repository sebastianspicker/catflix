import { AssetProvenance, SceneId, VariantSelection } from "../content/types";
import type { PlaybackMode } from "../simulation/types";

export type SceneMotionMode = "standard" | "low";
export interface DeviceSettings { soundEnabled: boolean; reducedMotion: boolean; sceneMotionMode: SceneMotionMode; safetyAcknowledgedAt?: string; }
export interface QueueItem { id: string; sceneId: SceneId; variant: VariantSelection; addedAt: string; }
export interface ProgressRecord { sceneId: SceneId; revision: string; elapsedMs: number; durationMs: number; updatedAt: string; }
export interface RefereeNote { id: string; cat: "Arri" | "Ozzy" | "Mika"; sceneId: SceneId; contentRevision: string; createdAt: string; rawNote: string; vocabulary: readonly ("approach" | "orientation" | "tracking" | "pouncing" | "disengagement" | "re-engagement" | "post-session behavior")[]; touchTimestamps?: readonly number[]; }
export interface ComparisonRun { sceneId: SceneId; variant: VariantSelection; seed?: number; encounterScore?: string; observationId?: string; }
export interface ComparisonRecord { id: string; createdAt: string; first: ComparisonRun; second: ComparisonRun; changedDimension: "figureGround" | "motion" | "sound" | "novelty"; observation?: string; }
export type ObservationBehavior = "approach" | "orientation" | "tracking" | "pouncing" | "disengagement" | "re-engagement" | "post-session behavior";
export interface SessionObservation {
  schemaVersion: 2;
  id: string;
  sceneId: SceneId;
  contentRevision: string;
  variant: VariantSelection;
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
export interface StoredProvenance extends AssetProvenance { savedAt: string; }
export interface CatflixDataExportV1 { schemaVersion: 1; exportedAt: string; settings: DeviceSettings; queue: QueueItem[]; progress: ProgressRecord[]; notes: RefereeNote[]; comparisons: ComparisonRecord[]; provenance: StoredProvenance[]; }
export interface CatflixDataExport { schemaVersion: 2; exportedAt: string; settings: DeviceSettings; queue: QueueItem[]; progress: ProgressRecord[]; notes: RefereeNote[]; observations: SessionObservation[]; comparisons: ComparisonRecord[]; provenance: StoredProvenance[]; }
