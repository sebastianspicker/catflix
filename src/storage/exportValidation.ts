import type { CatflixDataExport, CatflixDataExportV1 } from "./types";
import { cloneValue, normalizeSettings } from "./recordValidation";
import { isComparisonRecord, isProgressRecord, isQueueItem, isRefereeNote, isSessionObservation, isStoredProvenance } from "./storedRecordValidators";

type PartialExport = Partial<CatflixDataExport> | Partial<CatflixDataExportV1>;
type ValidExport = Pick<CatflixDataExport, "settings" | "queue" | "progress" | "notes" | "comparisons" | "provenance"> & { schemaVersion: 1 | 2; exportedAt?: unknown };

export function validateExport(value: unknown): CatflixDataExport {
  if (!isObject(value)) throw new Error("Import must be an object.");
  if (!hasValidExportFields(value)) throw new Error("Unsupported or corrupt Catflix export.");
  const fields = value as ValidExport;
  const observations = fields.schemaVersion === 2 ? value.observations : [];
  if (!Array.isArray(observations) || !observations.every(isSessionObservation)) throw new Error("Unsupported or corrupt Catflix export.");
  return { schemaVersion: 2, exportedAt: typeof fields.exportedAt === "string" ? fields.exportedAt : new Date().toISOString(), settings: normalizeSettings(fields.settings), queue: cloneValue(fields.queue), progress: cloneValue(fields.progress), notes: cloneValue(fields.notes), observations: cloneValue(observations), comparisons: cloneValue(fields.comparisons), provenance: cloneValue(fields.provenance) };
}

function hasValidExportFields(candidate: PartialExport): boolean {
  return (candidate.schemaVersion === 1 || candidate.schemaVersion === 2) && candidate.settings !== undefined && hasValidRecords(candidate.queue, isQueueItem) && hasValidRecords(candidate.progress, isProgressRecord) && hasValidRecords(candidate.notes, isRefereeNote) && hasValidRecords(candidate.comparisons, isComparisonRecord) && hasValidRecords(candidate.provenance, isStoredProvenance);
}

function hasValidRecords<T>(value: unknown, validator: (item: unknown) => item is T): value is readonly T[] { return Array.isArray(value) && value.every(validator); }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
