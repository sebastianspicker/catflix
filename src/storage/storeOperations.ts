import type { AssetProvenance } from "../content/types";
import type { CatflixDataExport, ComparisonRecord, ProgressRecord } from "./types";
import type { CatflixStore } from "./CatflixStore.contract";
import { createStoreBackend } from "./IndexedDbBackend";
import { validateExport } from "./exportValidation";
import { createMatchedComparison } from "./recordValidation";
import { isStoredProvenance } from "./storedRecordValidators";

type Backend = ReturnType<typeof createStoreBackend>;

export async function saveComparison(backend: Backend, comparison: ComparisonRecord): Promise<void> { createMatchedComparison(comparison); await backend.put("comparisons", comparison); }
export function saveProvenance(backend: Backend, asset: AssetProvenance): Promise<void> {
  const savedAt = new Date().toISOString();
  if (!isStoredProvenance({ ...asset, savedAt })) return Promise.reject(new Error("Provenance requires a local source, SHA-256 checksum, and complete editorial record."));
  return backend.put("provenance", { ...asset, savedAt });
}
export async function exportData(store: CatflixStore, backend: Backend): Promise<CatflixDataExport> {
  const [settings, queue, progress, notes, observations, comparisons, provenance] = await Promise.all([store.getSettings(), store.getQueue(), backend.values<ProgressRecord>("progress"), store.listNotes(), store.listObservations(), store.listComparisons(), store.listProvenance()]);
  return { schemaVersion: 2, exportedAt: new Date().toISOString(), settings, queue, progress, notes, observations, comparisons, provenance };
}
export async function importData(backend: Backend, data: unknown): Promise<void> {
  const parsed = validateExport(data);
  await Promise.all([backend.put("settings", parsed.settings), backend.replace("queue", parsed.queue), backend.replace("progress", parsed.progress), backend.replace("notes", parsed.notes), backend.replace("observations", parsed.observations), backend.replace("comparisons", parsed.comparisons), backend.replace("provenance", parsed.provenance)]);
}
