import type { AssetProvenance } from "../catalogue/model/contentManifest";
import type { LocalDataBackend, LocalDataSnapshot, StoreReplacement } from "./indexedDb";
import { assertExportCapacity, assertImportCapacity, localDataCounts } from "./localDataCapacity";
import {
  asRecord,
  cloneValue,
  hasOnlyKeys,
  isComparisonRecord,
  isDeviceSettings,
  isLegacyDeviceSettings,
  isProgressRecord,
  isQueueItem,
  isRefereeNote,
  isSessionObservation,
  isStoredProvenance,
  isTimestamp,
  normalizeSettings,
} from "./records";
import { sameVariant } from "./recordHistory";
import type {
  CatflixDataExport,
  ComparisonRecord,
  ImportPreview,
  ProgressRecord,
  QueueItem,
  RefereeNote,
  SessionObservation,
  StoredProvenance,
} from "./types";

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

export function decodeExport(value: unknown): CatflixDataExport {
  const fields = asRecord(value);
  if (!fields) throw new Error("Import must be an object.");
  const schemaVersion = exportSchemaVersion(fields);
  if (!schemaVersion || !hasValidExportFields(fields, schemaVersion)) throw unsupportedExport();
  const observations = schemaVersion === 2 ? fields.observations : [];
  if (!hasValidImportRecords(fields, observations)) throw unsupportedExport();
  if (!hasConsistentComparisonReferences(fields.notes, observations, fields.comparisons)) throw unsupportedExport();
  const decoded = decodedExport(fields, observations);
  assertImportCapacity(decoded);
  return decoded;
}

export function sourceSchemaVersionFor(value: unknown): 1 | 2 {
  const fields = asRecord(value);
  const schemaVersion = fields ? exportSchemaVersion(fields) : undefined;
  if (!schemaVersion) throw unsupportedExport();
  return schemaVersion;
}

export function importCounts(data: CatflixDataExport): ImportPreview["counts"] {
  return localDataCounts(data);
}

export function toStoreReplacements(data: CatflixDataExport): readonly StoreReplacement[] {
  return [
    { store: "settings", values: [data.settings] },
    { store: "queue", values: data.queue },
    { store: "progress", values: data.progress },
    { store: "notes", values: data.notes },
    { store: "observations", values: data.observations },
    { store: "comparisons", values: data.comparisons },
    { store: "provenance", values: data.provenance },
  ];
}

export function saveProvenance(backend: LocalDataBackend, input: AssetProvenance | readonly AssetProvenance[]): Promise<void> {
  const savedAt = new Date().toISOString();
  const assets: readonly AssetProvenance[] = isAssetProvenanceArray(input) ? input : [input];
  const records = assets.map((asset) => ({ ...asset, savedAt }));
  if (!records.every(isStoredProvenance)) return Promise.reject(new Error("Provenance requires a local source, SHA-256 checksum, and complete editorial record."));
  return backend.transact(["provenance"], (transaction) => { records.forEach((record) => { transaction.put("provenance", record); }); });
}

function isAssetProvenanceArray(input: AssetProvenance | readonly AssetProvenance[]): input is readonly AssetProvenance[] {
  return Array.isArray(input);
}

export async function exportLocalData(backend: LocalDataBackend): Promise<CatflixDataExport> {
  const data = exportedData(await backend.snapshot());
  assertExportCapacity(data);
  try { return decodeExport(data); }
  catch (cause) { throw new Error("The normal export is not importable. Export a recovery copy before deleting or repairing local records.", { cause }); }
}

export async function exportRecoveryLocalData(backend: LocalDataBackend): Promise<CatflixDataExport> {
  return exportedData(await backend.snapshot());
}

function decodedExport(fields: ValidExportFields, observations: readonly SessionObservation[]): CatflixDataExport {
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

function exportedData(snapshot: LocalDataSnapshot): CatflixDataExport {
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    settings: normalizeSettings(snapshot.get("settings")?.[0]),
    queue: valuesFrom<QueueItem>(snapshot, "queue").filter(isQueueItem),
    progress: valuesFrom<ProgressRecord>(snapshot, "progress").filter(isProgressRecord),
    notes: valuesFrom<RefereeNote>(snapshot, "notes").filter(isRefereeNote),
    observations: valuesFrom<SessionObservation>(snapshot, "observations").filter(isSessionObservation),
    comparisons: valuesFrom<ComparisonRecord>(snapshot, "comparisons").filter(isComparisonRecord),
    provenance: valuesFrom<StoredProvenance>(snapshot, "provenance").filter(isStoredProvenance),
  };
}

function valuesFrom<T>(snapshot: LocalDataSnapshot, store: Parameters<LocalDataSnapshot["get"]>[0]): T[] {
  return [...(snapshot.get(store) ?? [])] as T[];
}

function hasValidImportRecords(fields: ValidExportFields, observations: unknown): observations is readonly SessionObservation[] {
  return hasValidRecords(observations, isSessionObservation) && hasUniqueImportKeys(fields, observations);
}

function hasUniqueImportKeys(fields: ValidExportFields, observations: readonly SessionObservation[]): boolean {
  return [
    hasUniqueStoreKeys(fields.queue, (record) => record.id),
    hasUniqueStoreKeys(fields.progress, (record) => record.sceneId),
    hasUniqueStoreKeys(fields.notes, (record) => record.id),
    hasUniqueStoreKeys(observations, (record) => record.id),
    hasUniqueStoreKeys(fields.comparisons, (record) => record.id),
    hasUniqueStoreKeys(fields.provenance, (record) => record.assetId),
  ].every(Boolean);
}

function hasConsistentComparisonReferences(notes: readonly RefereeNote[], observations: readonly SessionObservation[], comparisons: readonly ComparisonRecord[]): boolean {
  const observationsById = new Map(observations.map((observation) => [observation.id, observation]));
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const usedObservationIds = new Set<string>();
  return comparisons.every((comparison) => comparisonRunsAreConsistent(comparison, observationsById, notesById, usedObservationIds));
}

function comparisonRunsAreConsistent(comparison: ComparisonRecord, observations: ReadonlyMap<string, SessionObservation>, notes: ReadonlyMap<string, RefereeNote>, usedObservationIds: Set<string>): boolean {
  return [comparison.first, comparison.second].every((run) => hasConsistentComparisonRun(run, comparison.changedDimension, observations, notes, usedObservationIds));
}

function hasConsistentComparisonRun(run: ComparisonRecord["first"], changedDimension: ComparisonRecord["changedDimension"], observations: ReadonlyMap<string, SessionObservation>, notes: ReadonlyMap<string, RefereeNote>, usedObservationIds: Set<string>): boolean {
  if (!run.observationId) return true;
  const observation = observations.get(run.observationId);
  if (observation) return hasConsistentObservationReference(observation, run, changedDimension, usedObservationIds);
  const note = notes.get(run.observationId);
  return note !== undefined && note.sceneId === run.sceneId && (run.contentRevision === undefined || note.contentRevision === run.contentRevision);
}

function hasConsistentObservationReference(observation: SessionObservation, run: ComparisonRecord["first"], changedDimension: ComparisonRecord["changedDimension"], usedObservationIds: Set<string>): boolean {
  if (usedObservationIds.has(observation.id)) return false;
  if (!sameVariant(observation.variant, run.variant)) return false;
  if (!hasCompatibleRunDetails(observation, run)) return false;
  if (observation.comparisonDimension !== undefined && observation.comparisonDimension !== changedDimension) return false;
  usedObservationIds.add(observation.id);
  return observation.sceneId === run.sceneId;
}

function hasCompatibleRunDetails(observation: SessionObservation, run: ComparisonRecord["first"]): boolean {
  return [
    run.contentRevision === undefined || observation.contentRevision === run.contentRevision,
    optionalRunValueMatches(run.seed, observation.seed),
    optionalRunValueMatches(run.encounterScore, observation.encounterScore),
  ].every(Boolean);
}

function optionalRunValueMatches<T>(runValue: T | undefined, observationValue: T | undefined): boolean {
  return runValue === undefined || observationValue === undefined || runValue === observationValue;
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

function hasValidRecords<T>(value: unknown, validator: (item: unknown) => item is T): value is readonly T[] {
  return Array.isArray(value) && value.every(validator);
}

function hasUniqueStoreKeys<T>(records: readonly T[], keyForRecord: (record: T) => string): boolean {
  const keys = new Set<string>();
  return records.every((record) => {
    const key = keyForRecord(record);
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

function unsupportedExport(): Error {
  return new Error("Unsupported or corrupt Catflix export.");
}
