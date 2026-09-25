import type { CatflixDataExport, ImportPreview } from "./types";

export const maximumBackupBytes = 5 * 1024 * 1024;

export const localDataRecordLimits = {
  settings: 1,
  queue: 5,
  progress: 5,
  notes: 10_000,
  observations: 10_000,
  comparisons: 10_000,
  provenance: 100,
} as const;

type CountKey = keyof ImportPreview["counts"];

export class LocalDataCapacityError extends Error {
  readonly code = "local-data-capacity";

  constructor(message = "Catflix local data exceeds the 5 MiB or record-count limit. Export a recovery copy, then delete records before adding more.") {
    super(message);
    this.name = "LocalDataCapacityError";
  }
}

export function serializeLocalData(data: CatflixDataExport): string {
  return JSON.stringify(data, null, 2);
}

export function localDataByteLength(data: CatflixDataExport): number {
  return new TextEncoder().encode(serializeLocalData(data)).byteLength;
}

export function assertImportFileSize(bytes: number): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > maximumBackupBytes) {
    throw new LocalDataCapacityError("Catflix import files must be 5 MiB or smaller.");
  }
}

export function localDataCounts(data: CatflixDataExport): ImportPreview["counts"] {
  return {
    settings: 1,
    queue: data.queue.length,
    progress: data.progress.length,
    notes: data.notes.length,
    observations: data.observations.length,
    comparisons: data.comparisons.length,
    provenance: data.provenance.length,
  };
}

export function assertImportCapacity(data: CatflixDataExport): void {
  const counts = localDataCounts(data);
  const countExceeded = countKeys.some((key) => counts[key] > localDataRecordLimits[key]);
  if (countExceeded || localDataByteLength(data) > maximumBackupBytes) {
    throw new LocalDataCapacityError("Unsupported or corrupt Catflix export. The normalized data exceeds a local-data capacity limit.");
  }
}

export function assertExportCapacity(data: CatflixDataExport): void {
  const counts = localDataCounts(data);
  if (countKeys.some((key) => counts[key] > localDataRecordLimits[key]) || localDataByteLength(data) > maximumBackupBytes) {
    throw new LocalDataCapacityError("The normal export would exceed the 5 MiB or record-count limit and could not be imported. Export a recovery copy, then delete records before adding more.");
  }
}

export function assertMutationCapacity(current: CatflixDataExport, next: CatflixDataExport, addsRecord: boolean): void {
  const currentUsage = capacityUsage(current);
  const nextUsage = capacityUsage(next);
  const currentOverLimit = currentUsage.bytes > maximumBackupBytes
    || countKeys.some((key) => currentUsage.counts[key] > localDataRecordLimits[key]);
  if (currentOverLimit && addsRecord) throw new LocalDataCapacityError("Local data is already over its supported capacity. Export a recovery copy, then delete records before adding more.");
  if (currentOverLimit && nextUsage.bytes > currentUsage.bytes) throw new LocalDataCapacityError();
  if (currentOverLimit && countKeys.some((key) => nextUsage.counts[key] > currentUsage.counts[key])) throw new LocalDataCapacityError();
  if (nextUsage.bytes > Math.max(maximumBackupBytes, currentUsage.bytes)) throw new LocalDataCapacityError();
  const countGrewPastAdmission = countKeys.some((key) => nextUsage.counts[key] > Math.max(localDataRecordLimits[key], currentUsage.counts[key]));
  if (countGrewPastAdmission) throw new LocalDataCapacityError();
}

const countKeys = Object.keys(localDataRecordLimits) as CountKey[];

function capacityUsage(data: CatflixDataExport) {
  return { bytes: localDataByteLength(data), counts: localDataCounts(data) };
}
