import { AssetProvenance, SceneId, sceneIds } from "../content/types";
import { CatflixDataExport, CatflixDataExportV1, ComparisonRecord, DeviceSettings, ProgressRecord, QueueItem, RefereeNote, SessionObservation, StoredProvenance } from "./types";

type StoreName = "settings" | "queue" | "progress" | "notes" | "observations" | "comparisons" | "provenance";
const stores: readonly StoreName[] = ["settings", "queue", "progress", "notes", "observations", "comparisons", "provenance"];
const databaseName = "catflix-local";
const databaseVersion = 2;
const defaultSettings: DeviceSettings = { soundEnabled: false, reducedMotion: false, sceneMotionMode: "standard" };
const clone = <T>(value: T): T => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;
const keyFor = (store: StoreName, value: unknown): string => {
  if (store === "settings") return "device";
  const record = value as { id?: string; sceneId?: string };
  if (store === "progress") return record.sceneId ?? "unknown";
  return record.id ?? (value as { assetId?: string }).assetId ?? crypto.randomUUID();
};

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
}

/** Creates a household-observation comparison and rejects multi-variable changes. */
export function createMatchedComparison(comparison: ComparisonRecord): ComparisonRecord {
  const differences = (["figureGround", "motion", "sound", "novelty"] as const).filter((key) => comparison.first.variant[key] !== comparison.second.variant[key]);
  if (differences.length !== 1 || differences[0] !== comparison.changedDimension) throw new Error("A matched comparison must change exactly one declared dimension.");
  return clone(comparison);
}

export function createCatflixStore(): CatflixStore {
  const memory = new Map<StoreName, Map<string, unknown>>(stores.map((name) => [name, new Map()]));
  let databasePromise: Promise<IDBDatabase | undefined> | undefined;
  const open = (): Promise<IDBDatabase | undefined> => {
    if (databasePromise) return databasePromise;
    if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
    databasePromise = new Promise((resolve) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => { const database = request.result; for (const name of stores) if (!database.objectStoreNames.contains(name)) database.createObjectStore(name); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    });
    return databasePromise;
  };
  async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
    const database = await open();
    if (!database) return clone(memory.get(store)?.get(key) as T | undefined);
    try { return await requestValue<T | undefined>(database.transaction(store, "readonly").objectStore(store).get(key)); }
    catch { return undefined; } // Corrupt/unreadable records are ignored rather than breaking a session.
  }
  async function values<T>(store: StoreName): Promise<T[]> {
    const database = await open();
    if (!database) return [...(memory.get(store)?.values() ?? [])].map((item) => clone(item as T));
    try { return await requestValue<T[]>(database.transaction(store, "readonly").objectStore(store).getAll()); } catch { return []; }
  }
  async function put(store: StoreName, value: unknown): Promise<void> {
    const key = keyFor(store, value); const database = await open();
    if (!database) { memory.get(store)?.set(key, clone(value)); return; }
    await transactionDone(database.transaction(store, "readwrite"), (transaction) => transaction.objectStore(store).put(clone(value), key));
  }
  async function replace(store: StoreName, valuesToStore: readonly unknown[]): Promise<void> {
    const database = await open();
    if (!database) { const target = memory.get(store); target?.clear(); valuesToStore.forEach((value) => target?.set(keyFor(store, value), clone(value))); return; }
    await transactionDone(database.transaction(store, "readwrite"), (transaction) => { const objectStore = transaction.objectStore(store); objectStore.clear(); valuesToStore.forEach((value) => objectStore.put(clone(value), keyFor(store, value))); });
  }
  return {
    async getSettings() { return normalizeSettings(await get<unknown>("settings", "device")); },
    setSettings: (settings) => put("settings", normalizeSettings(settings)),
    async getQueue() { return (await values<QueueItem>("queue")).filter(isQueueItem); },
    setQueue: (queue) => replace("queue", queue),
    async getProgress(sceneId) { const value = await get<ProgressRecord>("progress", sceneId); return value && isProgressRecord(value) ? value : undefined; },
    saveProgress: (progress) => put("progress", progress),
    async listNotes() { return (await values<RefereeNote>("notes")).filter(isRefereeNote); },
    saveNote: (note) => put("notes", note),
    async listObservations() { return (await values<SessionObservation>("observations")).filter(isSessionObservation); },
    saveObservation: (observation) => isSessionObservation(observation) ? put("observations", observation) : Promise.reject(new Error("Invalid session observation.")),
    async listComparisons() { return (await values<ComparisonRecord>("comparisons")).filter(isComparisonRecord); },
    saveComparison: (comparison) => validateComparison(comparison).then(() => put("comparisons", comparison)),
    async listProvenance() { return (await values<StoredProvenance>("provenance")).filter(isStoredProvenance); },
    saveProvenance: (asset) => {
      if (!isAssetProvenance(asset)) return Promise.reject(new Error("Provenance requires a local source, SHA-256 checksum, and complete editorial record."));
      return put("provenance", { ...asset, savedAt: new Date().toISOString() });
    },
    async exportData() { const [settings, queue, progress, notes, observations, comparisons, provenance] = await Promise.all([this.getSettings(), this.getQueue(), values<ProgressRecord>("progress"), this.listNotes(), this.listObservations(), this.listComparisons(), this.listProvenance()]); return { schemaVersion: 2, exportedAt: new Date().toISOString(), settings, queue, progress, notes, observations, comparisons, provenance }; },
    async importData(data) { const parsed = validateExport(data); await Promise.all([put("settings", parsed.settings), replace("queue", parsed.queue), replace("progress", parsed.progress), replace("notes", parsed.notes), replace("observations", parsed.observations), replace("comparisons", parsed.comparisons), replace("provenance", parsed.provenance)]); },
  };
}

function validateComparison(value: ComparisonRecord): Promise<void> {
  try { createMatchedComparison(value); } catch (error) { return Promise.reject(error); }
  return Promise.resolve();
}
function validateExport(value: unknown): CatflixDataExport {
  if (typeof value !== "object" || value === null) throw new Error("Import must be an object.");
  const candidate = value as Partial<CatflixDataExport> | Partial<CatflixDataExportV1>;
  if ((candidate.schemaVersion !== 1 && candidate.schemaVersion !== 2) || !candidate.settings || !Array.isArray(candidate.queue) || !candidate.queue.every(isQueueItem) || !Array.isArray(candidate.progress) || !candidate.progress.every(isProgressRecord) || !Array.isArray(candidate.notes) || !candidate.notes.every(isRefereeNote) || !Array.isArray(candidate.comparisons) || !candidate.comparisons.every(isComparisonRecord) || !Array.isArray(candidate.provenance) || !candidate.provenance.every(isStoredProvenance)) throw new Error("Unsupported or corrupt Catflix export.");
  const observations = candidate.schemaVersion === 2 ? (candidate as Partial<CatflixDataExport>).observations : [];
  if (!Array.isArray(observations) || !observations.every(isSessionObservation)) throw new Error("Unsupported or corrupt Catflix export.");
  return { schemaVersion: 2, exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(), settings: normalizeSettings(candidate.settings), queue: clone(candidate.queue), progress: clone(candidate.progress), notes: clone(candidate.notes), observations: clone(observations), comparisons: clone(candidate.comparisons), provenance: clone(candidate.provenance) };
}
function normalizeSettings(value: unknown): DeviceSettings {
  const settings = value as Partial<DeviceSettings> | null;
  if (!settings || typeof settings !== "object") return clone(defaultSettings);
  return {
    soundEnabled: typeof settings.soundEnabled === "boolean" ? settings.soundEnabled : defaultSettings.soundEnabled,
    reducedMotion: typeof settings.reducedMotion === "boolean" ? settings.reducedMotion : defaultSettings.reducedMotion,
    sceneMotionMode: settings.sceneMotionMode === "low" ? "low" : "standard",
    ...(typeof settings.safetyAcknowledgedAt === "string" ? { safetyAcknowledgedAt: settings.safetyAcknowledgedAt } : {}),
  };
}
const isSceneId = (value: unknown): value is SceneId => sceneIds.includes(value as SceneId);
const isVariantSelection = (value: unknown): boolean => { const variant = value as Record<string, unknown> | null; return Boolean(variant && (variant.figureGround === "natural" || variant.figureGround === "enhanced") && (variant.motion === "continuous" || variant.motion === "intermittent") && (variant.sound === "off" || variant.sound === "on") && (variant.novelty === "familiar" || variant.novelty === "alternate")); };
function isQueueItem(value: unknown): value is QueueItem { const item = value as Partial<QueueItem> | null; return Boolean(item && typeof item.id === "string" && isSceneId(item.sceneId) && isVariantSelection(item.variant) && typeof item.addedAt === "string"); }
function isProgressRecord(value: unknown): value is ProgressRecord { const item = value as Partial<ProgressRecord> | null; return Boolean(item && isSceneId(item.sceneId) && typeof item.revision === "string" && typeof item.elapsedMs === "number" && typeof item.durationMs === "number" && item.elapsedMs >= 0 && item.durationMs > 0 && item.elapsedMs <= item.durationMs && typeof item.updatedAt === "string"); }
function isRefereeNote(value: unknown): value is RefereeNote { const item = value as Partial<RefereeNote> | null; return Boolean(item && typeof item.id === "string" && ["Arri", "Ozzy", "Mika"].includes(item.cat ?? "") && isSceneId(item.sceneId) && typeof item.rawNote === "string" && Array.isArray(item.vocabulary)); }
function isSessionObservation(value: unknown): value is SessionObservation {
  const item = value as Partial<SessionObservation> | null;
  return Boolean(item && item.schemaVersion === 2 && typeof item.id === "string" && isSceneId(item.sceneId) && typeof item.contentRevision === "string" && isVariantSelection(item.variant) && (item.playbackMode === "tablet-touch" || item.playbackMode === "tv-passive") && (item.viewingDistanceBand === "near-screen" || item.viewingDistanceBand === "room-display") && ["dim", "moderate", "bright"].includes(item.roomLightBand ?? "") && typeof item.soundEnabled === "boolean" && (item.observedCat === undefined || ["Arri", "Ozzy", "Mika"].includes(item.observedCat)) && typeof item.elapsedMs === "number" && item.elapsedMs >= 0 && ["completed", "owner-ended", "cat-left", "safety-stop"].includes(item.endReason ?? "") && Array.isArray(item.acceptedContactTimestamps) && item.acceptedContactTimestamps.every((timestamp) => typeof timestamp === "number") && Array.isArray(item.vocabulary) && ["not-recorded", "offered", "ignored", "voluntarily-joined"].includes(item.physicalPlayHandoff ?? "") && typeof item.rawNote === "string" && typeof item.confirmedAt === "string");
}
function isComparisonRecord(value: unknown): value is ComparisonRecord { try { createMatchedComparison(value as ComparisonRecord); return true; } catch { return false; } }
function isAssetProvenance(value: unknown): value is AssetProvenance {
  const asset = value as Partial<AssetProvenance> | null;
  return Boolean(asset && typeof asset.assetId === "string" && asset.assetId.trim() !== "" && typeof asset.creator === "string" && asset.creator.trim() !== "" && typeof asset.source === "string" && asset.source.startsWith("/assets/") && typeof asset.license === "string" && asset.license.trim() !== "" && Array.isArray(asset.derivativeHistory) && asset.derivativeHistory.length > 0 && asset.derivativeHistory.every((entry) => typeof entry === "string" && entry.trim() !== "") && typeof asset.checksum === "string" && /^[a-f0-9]{64}$/.test(asset.checksum) && ["webp", "avif", "png", "opus", "mp3", "wav"].includes(asset.masteringFormat ?? "") && typeof asset.contentRevision === "string" && asset.contentRevision.trim() !== "");
}
function isStoredProvenance(value: unknown): value is StoredProvenance { const record = value as Partial<StoredProvenance> | null; const savedAt = record?.savedAt; return Boolean(isAssetProvenance(record) && typeof savedAt === "string" && savedAt !== ""); }
function requestValue<T>(request: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
function transactionDone(transaction: IDBTransaction, write: (transaction: IDBTransaction) => void): Promise<void> { return new Promise((resolve, reject) => { write(transaction); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error); }); }
