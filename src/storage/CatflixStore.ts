import type { AssetProvenance, SceneId } from "../content/types";
import { createStoreBackend } from "./IndexedDbBackend";
import type { CatflixStore } from "./CatflixStore.contract";
import { keyFor } from "./storeKeys";
import { exportData, importData, saveComparison, saveProvenance } from "./storeOperations";
import { normalizeSettings } from "./recordValidation";
import { isComparisonRecord, isProgressRecord, isQueueItem, isRefereeNote, isSessionObservation, isStoredProvenance } from "./storedRecordValidators";
import type { ComparisonRecord, ProgressRecord, QueueItem, RefereeNote, SessionObservation, StoredProvenance } from "./types";

export { createMatchedComparison } from "./recordValidation";
export type { CatflixStore } from "./CatflixStore.contract";

export function createCatflixStore(): CatflixStore {
  const backend = createStoreBackend(keyFor);
  return {
    async getSettings() { return normalizeSettings(await backend.get<unknown>("settings", "device")); },
    setSettings: (settings) => backend.put("settings", normalizeSettings(settings)),
    async getQueue() { return (await backend.values<QueueItem>("queue")).filter(isQueueItem); },
    setQueue: (queue) => backend.replace("queue", queue),
    async getProgress(sceneId: SceneId) { const value = await backend.get<ProgressRecord>("progress", sceneId); return value && isProgressRecord(value) ? value : undefined; },
    saveProgress: (progress) => backend.put("progress", progress),
    async listNotes() { return (await backend.values<RefereeNote>("notes")).filter(isRefereeNote); },
    saveNote: (note) => backend.put("notes", note),
    async listObservations() { return (await backend.values<SessionObservation>("observations")).filter(isSessionObservation); },
    saveObservation: (observation) => isSessionObservation(observation) ? backend.put("observations", observation) : Promise.reject(new Error("Invalid session observation.")),
    async listComparisons() { return (await backend.values<ComparisonRecord>("comparisons")).filter(isComparisonRecord); },
    saveComparison: (comparison) => saveComparison(backend, comparison),
    async listProvenance() { return (await backend.values<StoredProvenance>("provenance")).filter(isStoredProvenance); },
    saveProvenance: (asset: AssetProvenance) => saveProvenance(backend, asset),
    exportData() { return exportData(this, backend); },
    async importData(data) { await importData(backend, data); },
  };
}
