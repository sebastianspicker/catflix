import type { AssetProvenance } from "../catalogue/model/contentManifest";
import type { SceneId } from "../domain";
import { createLocalDataBackend, openLocalDatabase, storeNames } from "./indexedDb";
import type { LocalDataAdmission, LocalDataState, StoreName } from "./indexedDb";
import {
  decodeExport,
  exportLocalData,
  exportRecoveryLocalData,
  importCounts,
  saveProvenance,
  sourceSchemaVersionFor,
  toStoreReplacements,
} from "./localExportCodec";
import { assertImportCapacity, assertMutationCapacity } from "./localDataCapacity";
import {
  asRecord,
  cloneValue,
  createMatchedComparison,
  isComparisonRecord,
  isDeviceSettings,
  isProgressRecord,
  isQueueItem,
  isRefereeNote,
  isSessionObservation,
  isStoredProvenance,
  normalizeSettings,
} from "./records";
import { deleteRecord, listRecordHistory, saveObservationWithComparison } from "./recordHistory";
import type {
  CatflixDataExport,
  ComparisonRecord,
  DeviceSettings,
  ImportPreview,
  LocalRecordHistory,
  ProgressRecord,
  QueueItem,
  RecordDeletionTarget,
  RefereeNote,
  SessionObservation,
  StorageStatus,
  StoredProvenance,
} from "./types";

export { decodeExport } from "./localExportCodec";
export { assertImportFileSize, LocalDataCapacityError, maximumBackupBytes, serializeLocalData } from "./localDataCapacity";
export type { ImportPreview, LocalRecordHistory, RecordDeletionTarget } from "./types";

export interface LocalRepository {
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
  listRecordHistory(): Promise<LocalRecordHistory>;
  saveObservationWithComparison(observation: SessionObservation): Promise<LocalRecordHistory>;
  deleteRecord(target: RecordDeletionTarget): Promise<LocalRecordHistory>;
  listComparisons(): Promise<ComparisonRecord[]>;
  saveComparison(comparison: ComparisonRecord): Promise<void>;
  listProvenance(): Promise<StoredProvenance[]>;
  saveProvenance(asset: AssetProvenance | readonly AssetProvenance[]): Promise<void>;
  exportData(): Promise<CatflixDataExport>;
  exportRecoveryData(): Promise<CatflixDataExport>;
  prepareImport(data: unknown): ImportPreview;
  commitImport(preview: ImportPreview): Promise<void>;
  /** Transitional convenience for current callers; new flows must preview then commit. */
  importData(data: unknown): Promise<void>;
  getStorageStatus(): StorageStatus;
  subscribeStorageStatus(listener: (status: StorageStatus) => void): () => void;
}

export function createLocalRepository(): LocalRepository {
  const backend = createLocalDataBackend(keyFor, openLocalDatabase, admitLocalData);
  const preparedImports = new WeakMap<ImportPreview, CatflixDataExport>();
  return {
    async getSettings() { return normalizeSettings(await backend.get<unknown>("settings", "device")); },
    setSettings: (settings) => isDeviceSettings(settings) ? backend.put("settings", cloneValue(settings)) : Promise.reject(new Error("Invalid device settings.")),
    async getQueue() { return (await backend.values<QueueItem>("queue")).filter(isQueueItem); },
    setQueue: (queue) => queue.every(isQueueItem) ? backend.replace("queue", queue) : Promise.reject(new Error("Invalid queue item.")),
    async getProgress(sceneId) { const value = await backend.get<ProgressRecord>("progress", sceneId); return value && isProgressRecord(value) ? value : undefined; },
    saveProgress: (progress) => isProgressRecord(progress) ? backend.put("progress", progress) : Promise.reject(new Error("Invalid progress record.")),
    async listNotes() { return (await backend.values<RefereeNote>("notes")).filter(isRefereeNote); },
    saveNote: (note) => isRefereeNote(note) ? backend.put("notes", note) : Promise.reject(new Error("Invalid referee note.")),
    async listObservations() { return (await backend.values<SessionObservation>("observations")).filter(isSessionObservation); },
    saveObservation: (observation) => isSessionObservation(observation) ? backend.put("observations", observation) : Promise.reject(new Error("Invalid session observation.")),
    async listRecordHistory() { return listRecordHistory(backend); },
    async saveObservationWithComparison(observation) { return saveObservationWithComparison(backend, observation); },
    async deleteRecord(target) { return deleteRecord(backend, target); },
    async listComparisons() { return (await backend.values<ComparisonRecord>("comparisons")).filter(isComparisonRecord); },
    async saveComparison(comparison) {
      if (!isComparisonRecord(comparison)) throw new Error("Invalid comparison record.");
      await backend.put("comparisons", createMatchedComparison(comparison));
    },
    async listProvenance() { return (await backend.values<StoredProvenance>("provenance")).filter(isStoredProvenance); },
    saveProvenance: (asset) => saveProvenance(backend, asset),
    async exportData() { return exportLocalData(backend); },
    async exportRecoveryData() { return exportRecoveryLocalData(backend); },
    prepareImport(data) {
      const sourceSchemaVersion = sourceSchemaVersionFor(data);
      const decoded = decodeExport(data);
      const preview: ImportPreview = { sourceSchemaVersion, targetSchemaVersion: 2, exportedAt: decoded.exportedAt, counts: importCounts(decoded) };
      preparedImports.set(preview, decoded);
      return preview;
    },
    async commitImport(preview) {
      const decoded = preparedImports.get(preview);
      if (!decoded) throw new Error("This import preview was not prepared by this local repository.");
      await backend.replaceAll(toStoreReplacements(decoded));
      preparedImports.delete(preview);
    },
    async importData(data) { await backend.replaceAll(toStoreReplacements(decodeExport(data))); },
    getStorageStatus: () => backend.getStatus(),
    subscribeStorageStatus: (listener) => backend.subscribeStatus(listener),
  };
}

const capacityTimestamp = "2000-01-01T00:00:00.000Z";

const admitLocalData: LocalDataAdmission = (current, next, operation) => {
  const nextData = capacityData(next);
  if (operation === "replacement") { assertImportCapacity(nextData); return; }
  assertMutationCapacity(capacityData(current), nextData, addsRecord(current, next));
};

function capacityData(state: LocalDataState): CatflixDataExport {
  const values = <T>(store: StoreName): T[] => [...(state.get(store)?.values() ?? [])] as T[];
  return {
    schemaVersion: 2,
    exportedAt: capacityTimestamp,
    settings: normalizeSettings(state.get("settings")?.get("device")),
    queue: values("queue"),
    progress: values("progress"),
    notes: values("notes"),
    observations: values("observations"),
    comparisons: values("comparisons"),
    provenance: values("provenance"),
  };
}

function addsRecord(current: LocalDataState, next: LocalDataState): boolean {
  return storeNames.some((store) => [...(next.get(store)?.keys() ?? [])].some((key) => !current.get(store)?.has(key)));
}

function keyFor(store: StoreName, value: unknown): string {
  const record = asRecord(value) ?? {};
  if (store === "settings") return "device";
  if (store === "progress") return typeof record.sceneId === "string" ? record.sceneId : "unknown";
  if (typeof record.id === "string") return record.id;
  return typeof record.assetId === "string" ? record.assetId : crypto.randomUUID();
}
