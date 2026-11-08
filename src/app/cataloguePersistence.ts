import type { ContentManifest } from '../catalogue/model';
import type { SceneId } from '../domain';
import type { SessionPlan } from '../encounter/session';
import { createLocalRepository } from '../local-data/LocalRepository';
import { assertImportFileSize, serializeLocalData } from '../local-data/localDataCapacity';
import type { LocalRecordHistory, ObservationDraft, QueueItem, RecordDeletionTarget, SceneMotionMode, StorageStatus } from '../local-data/types';
import { createObservation, mergeQueueIds, queueRecords, type CompletedSession, type SessionResult } from './catalogueModel';

export interface CatalogueHydration {
  queue: SceneId[];
  progress: Partial<Record<SceneId, number>>;
  recordHistory: LocalRecordHistory;
  sceneMotionMode: SceneMotionMode;
}

const store = createLocalRepository();
// Some browsers abort a download whose object URL is revoked in the same task as the click.
const exportUrlLifetimeMs = 40_000;
let catalogueHydration: Promise<CatalogueHydration> | undefined;
let storedQueue: readonly QueueItem[] = [];
let storedQueueKey = '';
let storedSceneMotionMode: SceneMotionMode | undefined;
let persistenceError = '';
const persistenceListeners = new Set<(message: string) => void>();

export const initialPersistenceError = (): string => persistenceError;
export function subscribePersistenceError(listener: (message: string) => void): () => void {
  persistenceListeners.add(listener);
  return () => { persistenceListeners.delete(listener); };
}

export const initialStorageStatus = (): StorageStatus => store.getStorageStatus();
export const subscribeStorageStatus = (listener: (status: StorageStatus) => void): (() => void) => store.subscribeStorageStatus(listener);

export function loadCatalogueState(manifests: readonly ContentManifest[]): Promise<CatalogueHydration> {
  if (catalogueHydration) return catalogueHydration;
  catalogueHydration = hydrateCatalogue(manifests);
  return catalogueHydration;
}

async function hydrateCatalogue(manifests: readonly ContentManifest[]): Promise<CatalogueHydration> {
  reportRejectedStorageWrite(store.saveProvenance(manifests.flatMap((manifest) => manifest.assets)));
  const [savedQueue, savedProgress, recordHistory, settings] = await Promise.all([
    store.getQueue(),
    Promise.all(manifests.map((item) => store.getProgress(item.id))),
    store.listRecordHistory(),
    store.getSettings(),
  ]);
  storedQueue = savedQueue;
  storedQueueKey = savedQueue.map((item) => item.sceneId).join();
  storedSceneMotionMode = settings.sceneMotionMode;
  return {
    queue: mergeQueueIds(savedQueue.map((item) => item.sceneId), []),
    progress: Object.fromEntries(savedProgress.filter((item) => item !== undefined).map((item) => [item.sceneId, item.elapsedMs / item.durationMs])),
    recordHistory,
    sceneMotionMode: settings.sceneMotionMode,
  };
}

// Both also run right after loading. Comparing with the last loaded or written value skips that
// redundant full-store write without a read, so rapid changes still land in order (last write wins).
export function persistQueue(queue: readonly SceneId[]): void {
  const key = queue.join();
  if (key === storedQueueKey) return;
  storedQueueKey = key;
  storedQueue = queueRecords(queue, storedQueue);
  // A failed write must not count as stored, or the same queue is never written again.
  reportRejectedStorageWrite(store.setQueue(storedQueue), () => { if (storedQueueKey === key) storedQueueKey = '\0'; });
}

export function persistSceneMotionMode(sceneMotionMode: SceneMotionMode): void {
  if (sceneMotionMode === storedSceneMotionMode) return;
  storedSceneMotionMode = sceneMotionMode;
  reportRejectedStorageWrite(
    store.getSettings().then((settings) => store.setSettings({ ...settings, sceneMotionMode })),
    () => { if (storedSceneMotionMode === sceneMotionMode) storedSceneMotionMode = undefined; },
  );
}

export function persistSessionProgress(plan: SessionPlan, result: SessionResult): void {
  reportRejectedStorageWrite(store.saveProgress({
    sceneId: plan.manifest.id,
    revision: plan.manifest.revision,
    elapsedMs: result.complete ? plan.manifest.finiteDurationMs : result.elapsedMs,
    durationMs: plan.manifest.finiteDurationMs,
    updatedAt: new Date().toISOString(),
  }));
}

export async function saveCompletedObservation(completed: CompletedSession, draft: ObservationDraft) {
  const observedAt = new Date().toISOString();
  const observation = createObservation(completed, draft, observedAt);
  const recordHistory = await store.saveObservationWithComparison(observation);
  return { observation, recordHistory };
}

export const downloadLocalData = (): Promise<void> => downloadExport(false);
export const downloadRecoveryData = (): Promise<void> => downloadExport(true);

async function downloadExport(recovery: boolean): Promise<void> {
  const data = await (recovery ? store.exportRecoveryData() : store.exportData());
  if (store.getStorageStatus().mode === 'degraded') throw new Error('Export is unavailable while local storage is degraded.');
  const url = URL.createObjectURL(new Blob([serializeLocalData(data)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `catflix-local-${recovery ? 'recovery' : 'export'}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => { URL.revokeObjectURL(url); }, exportUrlLifetimeMs);
}

export async function prepareLocalImport(file: File) {
  assertImportFileSize(file.size);
  await store.getSettings();
  if (store.getStorageStatus().mode === 'degraded') throw new Error('Import is unavailable while local storage is degraded.');
  const preview = store.prepareImport(JSON.parse(await file.text()));
  return {
    schemaVersion: preview.sourceSchemaVersion,
    exportedAt: preview.exportedAt,
    counts: preview.counts,
    commit: async () => {
      await store.commitImport(preview);
      window.location.reload();
    },
  };
}

export function deleteLocalRecord(target: RecordDeletionTarget): Promise<LocalRecordHistory> {
  return store.deleteRecord(target);
}

function reportRejectedStorageWrite(operation: Promise<unknown>, onFailure?: () => void): void {
  void operation.catch((error: unknown) => {
    onFailure?.();
    persistenceError = error instanceof Error ? error.message : 'Local data could not be saved. Keep this tab open and try again.';
    persistenceListeners.forEach((listener) => { listener(persistenceError); });
  });
}
