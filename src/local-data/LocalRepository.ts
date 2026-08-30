import type { AssetProvenance } from "../catalogue/model/contentManifest";
import type { SceneId } from "../domain";
import { createLocalDataBackend } from "./indexedDb";
import type { LocalDataBackend, StoreName } from "./indexedDb";
import { cloneValue, createMatchedComparison, isComparisonRecord, isDeviceSettings, isLegacyDeviceSettings, isProgressRecord, isQueueItem, isRefereeNote, isSessionObservation, isStoredProvenance, isTimestamp, normalizeSettings } from "./records";
import type { CatflixDataExport, ComparisonRecord, DeviceSettings, ProgressRecord, QueueItem, RefereeNote, SessionObservation, StorageStatus, StoredProvenance } from "./types";

type ValidExportFields = {
  exportedAt: string;
  settings: unknown;
  queue: readonly QueueItem[];
  progress: readonly ProgressRecord[];
  notes: readonly RefereeNote[];
  observations?: unknown;
  comparisons: readonly ComparisonRecord[];
  provenance: readonly StoredProvenance[];
};

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
  listComparisons(): Promise<ComparisonRecord[]>;
  saveComparison(comparison: ComparisonRecord): Promise<void>;
  listProvenance(): Promise<StoredProvenance[]>;
  saveProvenance(asset: AssetProvenance): Promise<void>;
  exportData(): Promise<CatflixDataExport>;
  importData(data: unknown): Promise<void>;
  getStorageStatus(): StorageStatus;
  subscribeStorageStatus(listener: (status: StorageStatus) => void): () => void;
}

export function createLocalRepository(): LocalRepository {
  const backend = createLocalDataBackend(keyFor);
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
    async listComparisons() { return (await backend.values<ComparisonRecord>("comparisons")).filter(isComparisonRecord); },
    async saveComparison(comparison) { if (!isComparisonRecord(comparison)) throw new Error("Invalid comparison record."); await backend.put("comparisons", createMatchedComparison(comparison)); },
    async listProvenance() { return (await backend.values<StoredProvenance>("provenance")).filter(isStoredProvenance); },
    saveProvenance: (asset) => saveProvenance(backend, asset),
    async exportData() { return exportLocalData(backend); },
    async importData(data) { await backend.replaceAll(toStoreReplacements(decodeExport(data))); },
    getStorageStatus: () => backend.getStatus(),
    subscribeStorageStatus: (listener) => backend.subscribeStatus(listener),
  };
}

export function decodeExport(value: unknown): CatflixDataExport {
  const fields = asRecord(value);
  if (!fields) throw new Error("Import must be an object.");
  const schemaVersion = exportSchemaVersion(fields);
  if (!schemaVersion || !hasValidExportFields(fields, schemaVersion)) throw new Error("Unsupported or corrupt Catflix export.");

  const observations = schemaVersion === 2 ? fields.observations : [];
  if (!Array.isArray(observations)
    || !observations.every(isSessionObservation)
    || !hasUniqueStoreKeys(fields.queue, (record) => record.id)
    || !hasUniqueStoreKeys(fields.progress, (record) => record.sceneId)
    || !hasUniqueStoreKeys(fields.notes, (record) => record.id)
    || !hasUniqueStoreKeys(observations, (record) => record.id)
    || !hasUniqueStoreKeys(fields.comparisons, (record) => record.id)
    || !hasUniqueStoreKeys(fields.provenance, (record) => record.assetId)) {
    throw new Error("Unsupported or corrupt Catflix export.");
  }
  return {
    schemaVersion: 2,
    exportedAt: fields.exportedAt,
    settings: normalizeSettings(fields.settings),
    queue: cloneValue([...fields.queue]),
    progress: cloneValue([...fields.progress]),
    notes: cloneValue([...fields.notes]),
    observations: cloneValue([...observations]),
    comparisons: cloneValue([...fields.comparisons]),
    provenance: cloneValue([...fields.provenance]),
  };
}

function exportSchemaVersion(fields: Record<string, unknown>): 1 | 2 | undefined {
  return fields.schemaVersion === 1 || fields.schemaVersion === 2 ? fields.schemaVersion : undefined;
}

function hasValidExportFields(fields: Record<string, unknown>, schemaVersion: 1 | 2): fields is Record<string, unknown> & ValidExportFields {
  return hasOnlyKeys(fields, exportKeys(schemaVersion))
    && isTimestamp(fields.exportedAt)
    && hasValidExportSettings(fields.settings, schemaVersion)
    && hasValidRecords(fields.queue, isQueueItem)
    && hasValidRecords(fields.progress, isProgressRecord)
    && hasValidRecords(fields.notes, isRefereeNote)
    && hasValidRecords(fields.comparisons, isComparisonRecord)
    && hasValidRecords(fields.provenance, isStoredProvenance);
}

function exportKeys(schemaVersion: 1 | 2): readonly string[] {
  return schemaVersion === 1
    ? ["schemaVersion", "exportedAt", "settings", "queue", "progress", "notes", "comparisons", "provenance"]
    : ["schemaVersion", "exportedAt", "settings", "queue", "progress", "notes", "observations", "comparisons", "provenance"];
}

function hasValidExportSettings(value: unknown, schemaVersion: 1 | 2): boolean {
  return schemaVersion === 1 ? isLegacyDeviceSettings(value) : isDeviceSettings(value);
}

function saveProvenance(backend: LocalDataBackend, asset: AssetProvenance): Promise<void> {
  const savedAt = new Date().toISOString();
  const record = { ...asset, savedAt };
  if (!isStoredProvenance(record)) return Promise.reject(new Error("Provenance requires a local source, SHA-256 checksum, and complete editorial record."));
  return backend.put("provenance", record);
}

async function exportLocalData(backend: LocalDataBackend): Promise<CatflixDataExport> {
  const [storedSettings, queue, progress, notes, observations, comparisons, provenance] = await Promise.all([
    backend.get<unknown>("settings", "device"),
    backend.values<QueueItem>("queue"),
    backend.values<ProgressRecord>("progress"),
    backend.values<RefereeNote>("notes"),
    backend.values<SessionObservation>("observations"),
    backend.values<ComparisonRecord>("comparisons"),
    backend.values<StoredProvenance>("provenance"),
  ]);
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    settings: normalizeSettings(storedSettings),
    queue: queue.filter(isQueueItem),
    progress: progress.filter(isProgressRecord),
    notes: notes.filter(isRefereeNote),
    observations: observations.filter(isSessionObservation),
    comparisons: comparisons.filter(isComparisonRecord),
    provenance: provenance.filter(isStoredProvenance),
  };
}

function toStoreReplacements(data: CatflixDataExport) {
  return [
    { store: "settings", values: [data.settings] },
    { store: "queue", values: data.queue },
    { store: "progress", values: data.progress },
    { store: "notes", values: data.notes },
    { store: "observations", values: data.observations },
    { store: "comparisons", values: data.comparisons },
    { store: "provenance", values: data.provenance },
  ] as const;
}

function keyFor(store: StoreName, value: unknown): string {
  const record = asRecord(value) ?? {};
  if (store === "settings") return "device";
  if (store === "progress") return typeof record.sceneId === "string" ? record.sceneId : "unknown";
  return typeof record.id === "string" ? record.id : typeof record.assetId === "string" ? record.assetId : crypto.randomUUID();
}
function hasValidRecords<T>(value: unknown, validator: (item: unknown) => item is T): value is readonly T[] { return Array.isArray(value) && value.every(validator); }
function hasUniqueStoreKeys<T>(records: readonly T[], keyForRecord: (record: T) => string): boolean {
  const keys = new Set<string>();
  return records.every((record) => {
    const key = keyForRecord(record);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}
function hasOnlyKeys(record: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(record).every((key) => keys.includes(key)); }
function asRecord(value: unknown): Record<string, unknown> | undefined { return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined; }
