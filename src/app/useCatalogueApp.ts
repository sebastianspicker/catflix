import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  listContentManifests,
  matchesCatalogueFilters,
  type CatalogueRhythmFilter,
  type CatalogueSubjectFilter,
  type CatalogueThemeFilter,
  type ContentManifest,
} from '../catalogue/model';
import { defaultSessionVariant, type SceneId } from '../domain';
import type { ComparisonDimension, SessionPlan } from '../encounter/session';
import { createLocalRepository } from '../local-data/LocalRepository';
import type { ObservationDraft, SceneMotionMode } from '../local-data/types';
import { useModalDialog } from '../ui/useModalDialog';
import { createComparisonRecord, createObservation, mergeQueueIds, queueRecords } from './catalogueModel';
import { catalogueWorkflowReducer, initialCatalogueWorkflowState } from './workflow';

export const manifests = [...listContentManifests()];
const manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
const store = createLocalRepository();
const ignoreRejectedStorageWrite = (operation: Promise<unknown>) => { void operation.catch(() => undefined); };
interface CatalogueHydration {
  queue: SceneId[];
  progress: Partial<Record<SceneId, number>>;
  recordCounts: { notes: number; comparisons: number };
  sceneMotionMode: SceneMotionMode;
}
let catalogueHydration: Promise<CatalogueHydration> | undefined;

function loadCatalogueState(): Promise<CatalogueHydration> {
  if (catalogueHydration) return catalogueHydration;
  catalogueHydration = (async () => {
    ignoreRejectedStorageWrite(Promise.all(manifests.flatMap((manifest) => manifest.assets.map((asset) => store.saveProvenance(asset)))));
    const [savedQueue, savedProgress, notes, observations, comparisons, settings] = await Promise.all([
      store.getQueue(),
      Promise.all(manifests.map((item) => store.getProgress(item.id))),
      store.listNotes(),
      store.listObservations(),
      store.listComparisons(),
      store.getSettings(),
    ]);
    const savedIds = savedQueue.map((item) => item.sceneId);
    const queue = mergeQueueIds(savedIds, []);
    return {
      queue,
      progress: Object.fromEntries(savedProgress.filter((item) => item !== undefined).map((item) => [item.sceneId, item.elapsedMs / item.durationMs])),
      recordCounts: { notes: notes.length + observations.length, comparisons: comparisons.length },
      sceneMotionMode: settings.sceneMotionMode,
    };
  })();
  return catalogueHydration;
}

const requestedSeedFor = (manifest: ContentManifest, comparison?: { dimension: ComparisonDimension; label: string }): number => {
  const query = new URLSearchParams(window.location.search);
  const requestedSeed = Number(query.get('seed'));
  if (Number.isSafeInteger(requestedSeed) && requestedSeed > 0) return requestedSeed;
  if (!comparison) return Math.floor(Date.now() % 2_147_483_647);
  return [...`${manifest.id}:${comparison.dimension}:${manifest.revision}`].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
};

export function useCatalogueApp() {
  const [state, dispatch] = useReducer(catalogueWorkflowReducer, store.getStorageStatus(), initialCatalogueWorkflowState);
  const refereeDialogRef = useModalDialog<HTMLElement>(() => { dispatch({ type: 'set-panel', panel: 'refereesOpen', open: false }); }, state.refereesOpen);
  const queueDialogRef = useModalDialog<HTMLElement>(() => { dispatch({ type: 'set-panel', panel: 'queueOpen', open: false }); }, state.queueOpen);
  useEffect(() => store.subscribeStorageStatus((storageStatus) => { dispatch({ type: 'set-storage-status', storageStatus }); }), []);
  useEffect(() => {
    let mounted = true;
    void loadCatalogueState().then((hydrated) => {
      if (mounted) dispatch({ type: 'hydrate', ...hydrated });
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (state.hydration === 'complete') ignoreRejectedStorageWrite(store.setQueue(queueRecords(state.queue)));
  }, [state.hydration, state.queue]);
  useEffect(() => {
    if (state.hydration === 'complete') ignoreRejectedStorageWrite(store.getSettings().then((settings) => store.setSettings({ ...settings, sceneMotionMode: state.sceneMotionMode })));
  }, [state.hydration, state.sceneMotionMode]);
  const filtered = useMemo(() => manifests.filter((item) => matchesCatalogueFilters(item, state.theme, state.subject, state.rhythm)), [state.rhythm, state.subject, state.theme]);
  const queuedSeconds = state.queue.reduce((total, id) => total + (manifestById.get(id)?.finiteDurationMs ?? 0) / 1000, 0);
  const resumable = manifests.filter((item) => (state.progress[item.id] ?? 0) > 0 && (state.progress[item.id] ?? 0) < 1);
  const prepare = (manifest: ContentManifest, variant = defaultSessionVariant, comparison?: { dimension: ComparisonDimension; label: string }) => {
    const query = new URLSearchParams(window.location.search);
    const resolvedVariant = query.get('contrast') === 'enhanced' ? { ...variant, figureGround: 'enhanced' as const } : variant;
    dispatch({ type: 'prepare', pending: { manifest, variant: resolvedVariant, comparison, seed: requestedSeedFor(manifest, comparison) } });
  };
  const setQueue = (queue: SceneId[]) => { dispatch({ type: 'set-queue', queue }); };
  const addToQueue = (id: SceneId) => { if (!state.queue.includes(id)) setQueue([...state.queue, id]); };
  const removeFromQueue = (id: SceneId) => { setQueue(state.queue.filter((item) => item !== id)); };
  const changeSceneMotionMode = (sceneMotionMode: SceneMotionMode) => { dispatch({ type: 'set-motion-mode', sceneMotionMode }); };
  const endSession = useCallback((result: { elapsedMs: number; complete: boolean; touchTimestamps: number[]; soundEnabled: boolean; physicalPlaySuggested?: boolean }) => {
    const plan = state.active;
    if (!plan) return;
    dispatch({ type: 'finish', result });
    ignoreRejectedStorageWrite(store.saveProgress({ sceneId: plan.manifest.id, revision: plan.manifest.revision, elapsedMs: result.complete ? plan.manifest.finiteDurationMs : result.elapsedMs, durationMs: plan.manifest.finiteDurationMs, updatedAt: new Date().toISOString() }));
  }, [state.active]);
  const saveNotes = (draft: ObservationDraft) => {
    if (!state.completed) return;
    const observedAt = new Date().toISOString();
    const observation = createObservation(state.completed, draft, observedAt);
    ignoreRejectedStorageWrite(store.saveObservation(observation).then(() => { dispatch({ type: 'increment-records', notes: 1, comparisons: 0 }); }));
    const record = createComparisonRecord(state.completed, observation, observedAt);
    if (record) ignoreRejectedStorageWrite(store.saveComparison(record).then(() => { dispatch({ type: 'increment-records', notes: 0, comparisons: 1 }); }));
    dispatch({ type: 'clear-completed' });
  };
  const exportData = async () => { const data = await store.exportData(); if (store.getStorageStatus().mode === 'degraded') throw new Error('Export is unavailable while local storage is degraded.'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `catflix-local-export-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); };
  const importData = async (file: File) => { await store.getSettings(); if (store.getStorageStatus().mode === 'degraded') throw new Error('Import is unavailable while local storage is degraded.'); await store.importData(JSON.parse(await file.text())); window.location.reload(); };
  return { ...state, active: state.active as SessionPlan | null, addToQueue, changeSceneMotionMode, endSession, exportData, filtered, importData, prepare, queueDialogRef, queuedSeconds, refereeDialogRef, removeFromQueue, resumable, saveNotes, startSession: (playbackMode: SessionPlan['playbackMode'], setup: SessionPlan['setup']) => { dispatch({ type: 'start', playbackMode, setup }); }, cancelPreparing: () => { dispatch({ type: 'cancel-preparing' }); }, clearCompleted: () => { dispatch({ type: 'clear-completed' }); }, setCuratorOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'curatorOpen', open }); }, setDataOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'dataOpen', open }); }, setEvidenceOpen: (evidenceOpen: typeof state.evidenceOpen) => { dispatch({ type: 'set-evidence', evidenceOpen }); }, setRhythm: (value: CatalogueRhythmFilter) => { dispatch({ type: 'set-filter', filter: 'rhythm', value }); }, setQueueOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'queueOpen', open }); }, setRefereesOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'refereesOpen', open }); }, setSubject: (value: CatalogueSubjectFilter) => { dispatch({ type: 'set-filter', filter: 'subject', value }); }, setTheme: (value: CatalogueThemeFilter) => { dispatch({ type: 'set-filter', filter: 'theme', value }); } };
}
export type CatalogueApp = ReturnType<typeof useCatalogueApp>;
