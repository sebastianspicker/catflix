import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComparisonDimension } from '../components/CuratorPanel';
import type { ObservationDraft } from '../components/RefereeNotes';
import { useModalDialog } from '../components/useModalDialog';
import { listContentManifests } from '../content/registry';
import type { ContentManifest, SceneId, VariantSelection } from '../content/types';
import type { SessionPlan } from '../simulation/types';
import { createCatflixStore } from '../storage/CatflixStore';
import type { SceneMotionMode, StorageStatus } from '../storage/types';
import { createComparisonRecord, createObservation, defaultVariant, matchesFilters, mergeQueueIds, queueRecords, sessionUpdate, type CompletedSession, type PendingSession, type SessionResult } from './catalogueModel';

export const manifests = [...listContentManifests()];
const manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
const store = createCatflixStore();
const ignoreRejectedStorageWrite = (operation: Promise<unknown>) => { void operation.catch(() => undefined); };

export function useCatalogueApp() {
  const [theme, setTheme] = useState('all');
  const [subject, setSubject] = useState('all');
  const [motion, setMotion] = useState('all');
  const [queue, setQueue] = useState<SceneId[]>([]);
  const [progress, setProgress] = useState<Partial<Record<SceneId, number>>>({});
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [active, setActive] = useState<SessionPlan | null>(null);
  const [completed, setCompleted] = useState<CompletedSession | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [curatorOpen, setCuratorOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [refereesOpen, setRefereesOpen] = useState(false);
  const [recordCounts, setRecordCounts] = useState({ notes: 0, comparisons: 0 });
  const [sceneMotionMode, setSceneMotionMode] = useState<SceneMotionMode>('standard');
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(() => store.getStorageStatus());
  const [evidenceOpen, setEvidenceOpen] = useState<import('../content/evidence').EvidenceThemeId | null>(null);
  const refereeDialogRef = useModalDialog<HTMLElement>(() => { setRefereesOpen(false); }, refereesOpen);
  const queueDialogRef = useModalDialog<HTMLElement>(() => { setQueueOpen(false); }, queueOpen);

  useEffect(() => store.subscribeStorageStatus(setStorageStatus), []);

  useEffect(() => {
    ignoreRejectedStorageWrite(Promise.all(manifests.flatMap((manifest) => manifest.assets.map((asset) => store.saveProvenance(asset)))));
    void Promise.all([store.getQueue(), Promise.all(manifests.map((item) => store.getProgress(item.id))), store.listNotes(), store.listObservations(), store.listComparisons(), store.getSettings()]).then(([savedQueue, savedProgress, notes, observations, comparisons, settings]) => {
      const savedIds = savedQueue.map((item) => item.sceneId);
      setQueue((current) => {
        const merged = mergeQueueIds(savedIds, current);
        if (merged.length !== savedIds.length) ignoreRejectedStorageWrite(store.setQueue(queueRecords(merged)));
        return merged;
      });
      setProgress(Object.fromEntries(savedProgress.filter((item) => item !== undefined).map((item) => [item.sceneId, item.elapsedMs / item.durationMs])));
      setRecordCounts({ notes: notes.length + observations.length, comparisons: comparisons.length });
      setSceneMotionMode(settings.sceneMotionMode);
    }).catch(() => undefined);
  }, []);

  const changeSceneMotionMode = (next: SceneMotionMode) => {
    setSceneMotionMode(next);
    ignoreRejectedStorageWrite(store.getSettings().then((settings) => store.setSettings({ ...settings, sceneMotionMode: next })));
  };
  const filtered = useMemo(() => manifests.filter((item) => matchesFilters(item, theme, subject, motion)), [motion, subject, theme]);
  const queuedSeconds = queue.reduce((total, id) => total + (manifestById.get(id)?.finiteDurationMs ?? 0) / 1000, 0);
  const resumable = manifests.filter((item) => (progress[item.id] ?? 0) > 0 && (progress[item.id] ?? 0) < 1);
  const prepare = (manifest: ContentManifest, variant = defaultVariant, comparison?: PendingSession['comparison']) => {
    const query = new URLSearchParams(window.location.search);
    const requestedSeed = Number(query.get('seed'));
    const resolvedVariant = query.get('contrast') === 'enhanced' ? { ...variant, figureGround: 'enhanced' as const } : variant;
    const comparisonSeed = comparison ? [...`${manifest.id}:${comparison.dimension}:${manifest.revision}`].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261) : 0;
    const seed = Number.isSafeInteger(requestedSeed) && requestedSeed > 0 ? requestedSeed : comparisonSeed || Math.floor(Date.now() % 2_147_483_647);
    setPending({ manifest, variant: resolvedVariant, comparison, seed });
  };
  const persistQueue = (next: SceneId[]) => { ignoreRejectedStorageWrite(store.setQueue(queueRecords(next))); };
  const addToQueue = (id: SceneId) => { setQueue((current) => { const next = current.includes(id) ? current : [...current, id]; persistQueue(next); return next; }); };
  const removeFromQueue = (id: SceneId) => { setQueue((current) => { const next = current.filter((item) => item !== id); persistQueue(next); return next; }); };
  const endSession = useCallback((result: SessionResult) => {
    setActive((plan) => {
      const update = sessionUpdate(plan, result);
      if (!update || !plan) return null;
      setProgress((current) => ({ ...current, [plan.manifest.id]: update.progress }));
      ignoreRejectedStorageWrite(store.saveProgress({ sceneId: plan.manifest.id, revision: plan.manifest.revision, elapsedMs: result.complete ? plan.manifest.finiteDurationMs : result.elapsedMs, durationMs: plan.manifest.finiteDurationMs, updatedAt: new Date().toISOString() }));
      setCompleted(update.completed);
      return null;
    });
  }, []);
  const saveNotes = (draft: ObservationDraft) => {
    if (!completed) return;
    const observedAt = new Date().toISOString();
    const observation = createObservation(completed, draft, observedAt);
    ignoreRejectedStorageWrite(store.saveObservation(observation).then(() => { setRecordCounts((counts) => ({ ...counts, notes: counts.notes + 1 })); }));
    const record = createComparisonRecord(completed, observation, observedAt);
    if (record) ignoreRejectedStorageWrite(store.saveComparison(record).then(() => { setRecordCounts((counts) => ({ ...counts, comparisons: counts.comparisons + 1 })); }));
    setCompleted(null);
  };
  const exportData = async () => {
    const data = await store.exportData();
    if (store.getStorageStatus().mode === 'degraded') throw new Error('Export is unavailable while local storage is degraded.');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `catflix-local-export-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  };
  const importData = async (file: File) => {
    await store.getSettings();
    if (store.getStorageStatus().mode === 'degraded') throw new Error('Import is unavailable while local storage is degraded.');
    await store.importData(JSON.parse(await file.text())); window.location.reload();
  };
  return { active, addToQueue, changeSceneMotionMode, completed, curatorOpen, dataOpen, endSession, evidenceOpen, exportData, filtered, importData, motion, pending, prepare, progress, queue, queueDialogRef, queueOpen, queuedSeconds, recordCounts, refereeDialogRef, refereesOpen, removeFromQueue, resumable, saveNotes, sceneMotionMode, setActive, setCompleted, setCuratorOpen, setDataOpen, setEvidenceOpen, setMotion, setPending, setQueueOpen, setRefereesOpen, setSubject, setTheme, storageStatus, subject, theme };
}

export type CatalogueApp = ReturnType<typeof useCatalogueApp>;
