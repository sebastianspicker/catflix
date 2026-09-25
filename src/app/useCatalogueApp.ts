import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  listContentManifests,
  matchesCatalogueFilters,
  type CatalogueRhythmFilter,
  type CatalogueSubjectFilter,
  type CatalogueThemeFilter,
  type ContentManifest,
} from '../catalogue/model';
import { defaultSessionVariant, type SceneId } from '../domain';
import type { ComparisonDimension, ComparisonSide, SessionPlan } from '../encounter/session';
import type { ObservationDraft, RecordDeletionTarget, SceneMotionMode } from '../local-data/types';
import { useModalDialog } from '../ui/useModalDialog';
import { resolvePreparedVariant, type SessionResult } from './catalogueModel';
import {
  deleteLocalRecord,
  downloadLocalData,
  downloadRecoveryData,
  initialPersistenceError,
  subscribePersistenceError,
  initialStorageStatus,
  loadCatalogueState,
  persistQueue,
  persistSceneMotionMode,
  persistSessionProgress,
  prepareLocalImport,
  saveCompletedObservation,
  subscribeStorageStatus,
} from './cataloguePersistence';
import { catalogueWorkflowReducer, initialCatalogueWorkflowState } from './workflow';

export const manifests = [...listContentManifests()];
const manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));

const requestedSeedFor = (manifest: ContentManifest, comparison?: { dimension: ComparisonDimension; side: ComparisonSide }): number => {
  const query = new URLSearchParams(window.location.search);
  const requestedSeed = Number(query.get('seed'));
  if (Number.isSafeInteger(requestedSeed) && requestedSeed > 0) return requestedSeed;
  if (!comparison) return Math.floor(Date.now() % 2_147_483_647);
  return [...`${manifest.id}:${comparison.dimension}:${manifest.revision}`].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
};

export function useCatalogueApp() {
  const [persistenceError, setPersistenceError] = useState(initialPersistenceError);
  useEffect(() => subscribePersistenceError(setPersistenceError), []);
  const [state, dispatch] = useReducer(catalogueWorkflowReducer, initialStorageStatus(), initialCatalogueWorkflowState);
  const refereeDialogRef = useModalDialog<HTMLElement>(() => { dispatch({ type: 'set-panel', panel: 'refereesOpen', open: false }); }, state.refereesOpen);
  const queueDialogRef = useModalDialog<HTMLElement>(() => { dispatch({ type: 'set-panel', panel: 'queueOpen', open: false }); }, state.queueOpen);
  useEffect(() => subscribeStorageStatus((storageStatus) => { dispatch({ type: 'set-storage-status', storageStatus }); }), []);
  useEffect(() => {
    let mounted = true;
    void loadCatalogueState(manifests).then((hydrated) => {
      if (mounted) dispatch({ type: 'hydrate', ...hydrated });
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (state.hydration === 'complete') persistQueue(state.queue);
  }, [state.hydration, state.queue]);
  useEffect(() => {
    if (state.hydration === 'complete') persistSceneMotionMode(state.sceneMotionMode);
  }, [state.hydration, state.sceneMotionMode]);
  const filtered = useMemo(() => manifests.filter((item) => matchesCatalogueFilters(item, state.theme, state.subject, state.rhythm)), [state.rhythm, state.subject, state.theme]);
  const queuedSeconds = state.queue.reduce((total, id) => total + (manifestById.get(id)?.finiteDurationMs ?? 0) / 1000, 0);
  const resumable = manifests.filter((item) => (state.progress[item.id] ?? 0) > 0 && (state.progress[item.id] ?? 0) < 1);
  const prepare = (manifest: ContentManifest, variant = defaultSessionVariant, comparison?: { dimension: ComparisonDimension; side: ComparisonSide }) => {
    const resolvedVariant = resolvePreparedVariant(variant, comparison, window.location.search);
    dispatch({ type: 'prepare', pending: { manifest, variant: resolvedVariant, comparison, seed: requestedSeedFor(manifest, comparison) } });
  };
  const setQueue = (queue: SceneId[]) => { dispatch({ type: 'set-queue', queue }); };
  const addToQueue = (id: SceneId) => { if (!state.queue.includes(id)) setQueue([...state.queue, id]); };
  const removeFromQueue = (id: SceneId) => { setQueue(state.queue.filter((item) => item !== id)); };
  const changeSceneMotionMode = (sceneMotionMode: SceneMotionMode) => { dispatch({ type: 'set-motion-mode', sceneMotionMode }); };
  const endSession = useCallback((result: SessionResult) => {
    const plan = state.active;
    if (!plan) return;
    dispatch({ type: 'finish', result });
    persistSessionProgress(plan, result);
  }, [state.active]);
  const saveNotes = async (draft: ObservationDraft) => {
    if (!state.completed) return;
    const saved = await saveCompletedObservation(state.completed, draft);
    dispatch({ type: 'observation-saved', ...saved });
  };
  const exportData = downloadLocalData;
  const closeReceipt = (showHistory = false) => { dispatch({ type: 'close-receipt', showHistory }); };
  const prepareImport = prepareLocalImport;
  const deleteRecord = async (target: RecordDeletionTarget) => {
    const recordHistory = await deleteLocalRecord(target);
    dispatch({ type: 'set-record-history', recordHistory });
  };
  return { ...state, closeReceipt, persistenceError, dismissPersistenceError: () => { setPersistenceError(''); }, exportRecoveryData: downloadRecoveryData, addToQueue, changeSceneMotionMode, deleteRecord, endSession, exportData, filtered, prepareImport, prepare, queueDialogRef, queuedSeconds, refereeDialogRef, removeFromQueue, resumable, saveNotes, startSession: (playbackMode: SessionPlan['playbackMode'], setup: SessionPlan['setup']) => { dispatch({ type: 'start', playbackMode, setup }); }, cancelPreparing: () => { dispatch({ type: 'cancel-preparing' }); }, clearCompleted: () => { dispatch({ type: 'clear-completed' }); }, setCuratorOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'curatorOpen', open }); }, setDataOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'dataOpen', open }); }, setEvidenceOpen: (evidenceOpen: typeof state.evidenceOpen) => { dispatch({ type: 'set-evidence', evidenceOpen }); }, setRhythm: (value: CatalogueRhythmFilter) => { dispatch({ type: 'set-filter', filter: 'rhythm', value }); }, setQueueOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'queueOpen', open }); }, setRefereesOpen: (open: boolean) => { dispatch({ type: 'set-panel', panel: 'refereesOpen', open }); }, setSubject: (value: CatalogueSubjectFilter) => { dispatch({ type: 'set-filter', filter: 'subject', value }); }, setTheme: (value: CatalogueThemeFilter) => { dispatch({ type: 'set-filter', filter: 'theme', value }); } };
}
export type CatalogueApp = ReturnType<typeof useCatalogueApp>;
