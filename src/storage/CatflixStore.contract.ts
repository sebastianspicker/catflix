import type { AssetProvenance, SceneId } from "../content/types";
import type { CatflixDataExport, ComparisonRecord, DeviceSettings, ProgressRecord, QueueItem, RefereeNote, SessionObservation, StorageStatus, StoredProvenance } from "./types";

export interface CatflixStore {
  getSettings(): Promise<DeviceSettings>;
  setSettings(settings: DeviceSettings): Promise<void>;
  getQueue(): Promise<QueueItem[]>;
  setQueue(queue: readonly QueueItem[]): Promise<void>;
  getProgress(sceneId: SceneId): Promise<ProgressRecord | undefined>;
  saveProgress(progress: ProgressRecord): Promise<void>;
  listNotes(): Promise<RefereeNote[]>;
  saveNote(note: RefereeNote): Promise<void>;
  listObservations(): Promise<SessionObservation[]>;
  saveObservation(observation: SessionObservation): Promise<void>;
  listComparisons(): Promise<ComparisonRecord[]>;
  saveComparison(comparison: ComparisonRecord): Promise<void>;
  listProvenance(): Promise<StoredProvenance[]>;
  saveProvenance(asset: AssetProvenance): Promise<void>;
  exportData(): Promise<CatflixDataExport>;
  importData(data: unknown): Promise<void>;
  getStorageStatus(): StorageStatus;
  subscribeStorageStatus(listener: (status: StorageStatus) => void): () => void;
}
