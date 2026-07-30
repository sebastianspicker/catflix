import { AssetProvenance, SceneId, sceneIds } from "../content/types";
import { CatflixDataExport, CatflixDataExportV1, ComparisonRecord, DeviceSettings, ProgressRecord, QueueItem, RefereeNote, SessionObservation, StoredProvenance } from "./types";

type StoreName = "settings" | "queue" | "progress" | "notes" | "observations" | "comparisons" | "provenance";
type ValidExportFields = Pick<CatflixDataExport, "settings" | "queue" | "progress" | "notes" | "comparisons" | "provenance"> & { schemaVersion: 1 | 2; exportedAt?: unknown };
type PartialExport = Partial<CatflixDataExport> | Partial<CatflixDataExportV1>;
type PartialQueueItem = Partial<QueueItem>;
type PartialProgress = Partial<ProgressRecord>;
type PartialNote = Partial<RefereeNote>;
type PartialObservation = Partial<SessionObservation>;
type PartialAsset = Partial<AssetProvenance>;
type PartialStoredProvenance = Partial<StoredProvenance>;
const stores: readonly StoreName[] = ["settings", "queue", "progress", "notes", "observations", "comparisons", "provenance"];
const databaseName = "catflix-local";
const databaseVersion = 2;
const defaultSettings: DeviceSettings = { soundEnabled: false, reducedMotion: false, sceneMotionMode: "standard" };
const clone = <T>(value: T): T => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;
const keyFor = (store: StoreName, value: unknown): string => {
  switch (store) {
    case "settings":
      return "device";
    case "progress":
      return progressKey(value);
    default:
      return recordKey(value);
  }
};

function progressKey(value: unknown): string {
  const sceneId = recordFields(value).sceneId;
  return typeof sceneId === "string" ? sceneId : "unknown";
}

function recordKey(value: unknown): string {
  const record = recordFields(value);
  if (typeof record.id === "string") return record.id;
  if (typeof record.assetId === "string") return record.assetId;
  return crypto.randomUUID();
}

function recordFields(value: unknown): { id?: unknown; sceneId?: unknown; assetId?: unknown } {
  return typeof value === "object" && value !== null ? value as { id?: unknown; sceneId?: unknown; assetId?: unknown } : {};
}

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
  const differences = changedVariantDimensions(comparison);
  if (differences.length !== 1 || differences[0] !== comparison.changedDimension) throw new Error("A matched comparison must change exactly one declared dimension.");
  return clone(comparison);
}

function changedVariantDimensions(comparison: ComparisonRecord): ("figureGround" | "motion" | "sound" | "novelty")[] {
  const differences: ("figureGround" | "motion" | "sound" | "novelty")[] = [];
  if (comparison.first.variant.figureGround !== comparison.second.variant.figureGround) differences.push("figureGround");
  if (comparison.first.variant.motion !== comparison.second.variant.motion) differences.push("motion");
  if (comparison.first.variant.sound !== comparison.second.variant.sound) differences.push("sound");
  if (comparison.first.variant.novelty !== comparison.second.variant.novelty) differences.push("novelty");
  return differences;
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
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { resolve(undefined); };
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
    const transaction = database.transaction(store, "readwrite");
    await transactionDone(transaction, () => transaction.objectStore(store).put(clone(value), key));
  }
  async function replace(store: StoreName, valuesToStore: readonly unknown[]): Promise<void> {
    const database = await open();
    if (!database) { const target = memory.get(store); target?.clear(); valuesToStore.forEach((value) => target?.set(keyFor(store, value), clone(value))); return; }
    const transaction = database.transaction(store, "readwrite");
    await transactionDone(transaction, () => { const objectStore = transaction.objectStore(store); objectStore.clear(); valuesToStore.forEach((value) => objectStore.put(clone(value), keyFor(store, value))); });
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
  try { createMatchedComparison(value); } catch (error) { return Promise.reject(error instanceof Error ? error : new Error("Invalid matched comparison.")); }
  return Promise.resolve();
}
function validateExport(value: unknown): CatflixDataExport {
  if (typeof value !== "object" || value === null) throw new Error("Import must be an object.");
  const candidate = value as PartialExport;
  if (!hasValidExportFields(candidate)) throw new Error("Unsupported or corrupt Catflix export.");
  const exportFields = candidate as ValidExportFields;
  const observations = exportFields.schemaVersion === 2 ? (candidate as Partial<CatflixDataExport>).observations : [];
  if (!Array.isArray(observations) || !observations.every(isSessionObservation)) throw new Error("Unsupported or corrupt Catflix export.");
  return { schemaVersion: 2, exportedAt: typeof exportFields.exportedAt === "string" ? exportFields.exportedAt : new Date().toISOString(), settings: normalizeSettings(exportFields.settings), queue: clone(exportFields.queue), progress: clone(exportFields.progress), notes: clone(exportFields.notes), observations: clone(observations), comparisons: clone(exportFields.comparisons), provenance: clone(exportFields.provenance) };
}

function hasValidExportFields(candidate: PartialExport): boolean {
  return hasSupportedSchemaVersion(candidate.schemaVersion)
    && candidate.settings !== undefined
    && hasValidRecords(candidate.queue, isQueueItem)
    && hasValidRecords(candidate.progress, isProgressRecord)
    && hasValidRecords(candidate.notes, isRefereeNote)
    && hasValidRecords(candidate.comparisons, isComparisonRecord)
    && hasValidRecords(candidate.provenance, isStoredProvenance);
}

function hasSupportedSchemaVersion(value: unknown): value is 1 | 2 {
  return value === 1 || value === 2;
}

function hasValidRecords<T>(value: unknown, isRecord: (item: unknown) => item is T): value is readonly T[] {
  return Array.isArray(value) && value.every(isRecord);
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
const isVariantSelection = (value: unknown): boolean => {
  const variant = value as Record<string, unknown> | null;
  return Boolean(variant
    && isOneOf(variant.figureGround, ["natural", "enhanced"] as const)
    && isOneOf(variant.motion, ["continuous", "intermittent"] as const)
    && isOneOf(variant.sound, ["off", "on"] as const)
    && isOneOf(variant.novelty, ["familiar", "alternate"] as const));
};
const isQueueItem = (value: unknown): value is QueueItem => {
  const item = value as PartialQueueItem | null;
  return Boolean(item
    && typeof item.id === "string"
    && isSceneId(item.sceneId)
    && isVariantSelection(item.variant)
    && typeof item.addedAt === "string");
};
const isProgressRecord = (value: unknown): value is ProgressRecord => {
  const item = value as PartialProgress | null;
  return Boolean(item
    && isSceneId(item.sceneId)
    && typeof item.revision === "string"
    && hasValidProgressDuration(item.elapsedMs, item.durationMs)
    && typeof item.updatedAt === "string");
};

const hasValidProgressDuration = (elapsedMs: unknown, durationMs: unknown): boolean => {
  return typeof elapsedMs === "number"
    && typeof durationMs === "number"
    && elapsedMs >= 0
    && durationMs > 0
    && elapsedMs <= durationMs;
};
const isRefereeNote = (value: unknown): value is RefereeNote => {
  const item = value as PartialNote | null;
  return Boolean(item
    && typeof item.id === "string"
    && isOneOf(item.cat, ["Arri", "Ozzy", "Mika"] as const)
    && isSceneId(item.sceneId)
    && typeof item.rawNote === "string"
    && Array.isArray(item.vocabulary));
};
const isSessionObservation = (value: unknown): value is SessionObservation => {
  const item = value as PartialObservation | null;
  return Boolean(item && hasObservationIdentity(item) && hasObservationContext(item) && hasObservationOutcome(item));
};

const hasObservationIdentity = (item: PartialObservation): boolean => {
  return item.schemaVersion === 2
    && typeof item.id === "string"
    && isSceneId(item.sceneId)
    && typeof item.contentRevision === "string"
    && isVariantSelection(item.variant);
};

const hasObservationContext = (item: PartialObservation): boolean => {
  return isOneOf(item.playbackMode, ["tablet-touch", "tv-passive"] as const)
    && isOneOf(item.viewingDistanceBand, ["near-screen", "room-display"] as const)
    && isOneOf(item.roomLightBand, ["dim", "moderate", "bright"] as const)
    && typeof item.soundEnabled === "boolean"
    && (item.observedCat === undefined || isOneOf(item.observedCat, ["Arri", "Ozzy", "Mika"] as const));
};

const hasObservationOutcome = (item: PartialObservation): boolean => {
  return hasObservationTiming(item)
    && hasObservationInteraction(item)
    && hasObservationRecord(item);
};
const hasObservationTiming = (item: PartialObservation): boolean => {
  return typeof item.elapsedMs === "number"
    && item.elapsedMs >= 0
    && isOneOf(item.endReason, ["completed", "owner-ended", "cat-left", "safety-stop"] as const);
};
const hasObservationInteraction = (item: PartialObservation): boolean => {
  return Array.isArray(item.acceptedContactTimestamps)
    && item.acceptedContactTimestamps.every((timestamp) => typeof timestamp === "number")
    && isOneOf(item.physicalPlayHandoff, ["not-recorded", "offered", "ignored", "voluntarily-joined"] as const);
};
const hasObservationRecord = (item: PartialObservation): boolean => {
  return Array.isArray(item.vocabulary)
    && typeof item.rawNote === "string"
    && typeof item.confirmedAt === "string";
};
const isComparisonRecord = (value: unknown): value is ComparisonRecord => {
  try {
    createMatchedComparison(value as ComparisonRecord);
    return true;
  } catch {
    return false;
  }
};
const isAssetProvenance = (value: unknown): value is AssetProvenance => {
  const asset = value as PartialAsset | null;
  return Boolean(asset && hasAssetIdentity(asset) && hasAssetDerivativeHistory(asset.derivativeHistory) && hasValidChecksum(asset.checksum) && isOneOf(asset.masteringFormat, ["webp", "avif", "png", "opus", "mp3", "wav"] as const) && hasNonEmptyText(asset.contentRevision));
};
const isOneOf = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => {
  return typeof value === "string" && values.includes(value as T[number]);
};
const hasNonEmptyText = (value: unknown): value is string => {
  return typeof value === "string" && value.trim() !== "";
};
const hasAssetIdentity = (asset: PartialAsset): boolean => {
  return hasNonEmptyText(asset.assetId)
    && hasNonEmptyText(asset.creator)
    && hasNonEmptyText(asset.source)
    && asset.source.startsWith("/assets/")
    && hasNonEmptyText(asset.license);
};
const hasAssetDerivativeHistory = (value: unknown): boolean => {
  return Array.isArray(value) && value.length > 0 && value.every(hasNonEmptyText);
};
const hasValidChecksum = (value: unknown): boolean => {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
};
const isStoredProvenance = (value: unknown): value is StoredProvenance => {
  const record = value as PartialStoredProvenance | null;
  const savedAt = record?.savedAt;
  return Boolean(isAssetProvenance(record) && typeof savedAt === "string" && savedAt !== "");
};
function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(request.error ?? new Error("IndexedDB request failed.")); };
  });
}
function transactionDone(transaction: IDBTransaction, write: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    write();
    transaction.oncomplete = () => { resolve(); };
    transaction.onerror = () => { reject(transaction.error ?? new Error("IndexedDB transaction failed.")); };
    transaction.onabort = () => { reject(transaction.error ?? new Error("IndexedDB transaction aborted.")); };
  });
}
