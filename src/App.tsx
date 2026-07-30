import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { listContentManifests } from './content/registry';
import type { ContentManifest, SceneId, VariantSelection } from './content/types';
import { createCatflixStore } from './storage/CatflixStore';
import type { ComparisonRecord, QueueItem, SceneMotionMode, SessionObservation } from './storage/types';
import type { SessionPlan } from './simulation/types';
import { CuratorPanel, type ComparisonDimension } from './components/CuratorPanel';
import { DataPanel } from './components/DataPanel';
import { Icon } from './components/Icons';
import { RefereeNotes, type ObservationDraft } from './components/RefereeNotes';
import { SafetyGate } from './components/SafetyGate';
import { useModalDialog } from './components/useModalDialog';
import { EvidenceSection } from './components/EvidenceSection';
import type { EvidenceThemeId } from './content/evidence';
import { publicUrl } from './paths';

const manifests = [...listContentManifests()];
const manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
const store = createCatflixStore();
const Player = lazy(() => import('./components/Player').then((module) => ({ default: module.Player })));
const EvidencePanel = lazy(() => import('./components/EvidencePanel').then((module) => ({ default: module.EvidencePanel })));

const artByScene: Record<SceneId, string> = {
  'balcony-birds': '/assets/balcony-birds',
  'koi-pool': '/assets/koi',
  'paper-moth': '/assets/paper-moth',
  'beetle-under-the-fern': '/assets/beetle',
  'red-string': '/assets/red-string',
};
const catalogueMeta: Record<SceneId, { title: string; theme: 'nature' | 'inside'; motion: 'flowing' | 'intermittent' | 'grounded'; note: string }> = {
  'balcony-birds': { title: 'Balcony Birds at Dusk', theme: 'nature', motion: 'intermittent', note: 'Perch, passage, occlusion, visible rest' },
  'koi-pool': { title: 'Koi in Slow Motion', theme: 'nature', motion: 'flowing', note: 'Long curves with calm-water finale' },
  'paper-moth': { title: 'Paper Moth at Midnight', theme: 'inside', motion: 'intermittent', note: 'Flutter passages with long landings' },
  'beetle-under-the-fern': { title: 'Beetle Beneath the Fern', theme: 'nature', motion: 'grounded', note: 'Fern-margin crossings and shelter' },
  'red-string': { title: 'The Red String Incident', theme: 'inside', motion: 'flowing', note: 'Bounded tension and slack passages' },
};
const refereeLine: Record<SceneId, string> = {
  'balcony-birds': 'No curator note published',
  'koi-pool': 'No curator note published',
  'paper-moth': 'No curator note published',
  'beetle-under-the-fern': 'No curator note published',
  'red-string': 'No curator note published',
};
const defaultVariant: VariantSelection = { figureGround: 'natural', motion: 'intermittent', sound: 'on', novelty: 'familiar' };
const baselineVariant: VariantSelection = { figureGround: 'natural', motion: 'continuous', sound: 'off', novelty: 'familiar' };
const durationLabel = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

interface PendingSession {
  manifest: ContentManifest;
  variant: VariantSelection;
  seed: number;
  comparison?: { dimension: ComparisonDimension; label: string };
}

type CompletedSession = {
  plan: SessionPlan;
  elapsedMs: number;
  complete: boolean;
  touches: number[];
  soundEnabled: boolean;
  physicalPlaySuggested?: boolean;
};

type SessionResult = {
  elapsedMs: number;
  complete: boolean;
  touchTimestamps: number[];
  soundEnabled: boolean;
  physicalPlaySuggested?: boolean;
};

function sessionUpdate(plan: SessionPlan | null, result: SessionResult): { progress: number; completed: CompletedSession } | null {
  if (!plan) return null;
  const progress = result.complete ? 1 : result.elapsedMs / plan.manifest.finiteDurationMs;
  return { progress, completed: { plan, elapsedMs: result.elapsedMs, complete: result.complete, touches: result.touchTimestamps, soundEnabled: result.soundEnabled, ...(result.physicalPlaySuggested ? { physicalPlaySuggested: true } : {}) } };
}

function createObservation(completed: CompletedSession, draft: ObservationDraft, observedAt: string): SessionObservation {
  return { schemaVersion: 2, id: crypto.randomUUID(), sceneId: completed.plan.manifest.id, contentRevision: completed.plan.manifest.revision, variant: completed.plan.variants, playbackMode: completed.plan.playbackMode, viewingDistanceBand: completed.plan.setup.viewingDistanceBand, roomLightBand: completed.plan.setup.roomLightBand, soundEnabled: completed.soundEnabled, ...(completed.plan.setup.observedCat ? { observedCat: completed.plan.setup.observedCat } : {}), elapsedMs: completed.elapsedMs, endReason: draft.endReason, acceptedContactTimestamps: completed.touches, vocabulary: draft.vocabulary, ...(draft.safetyEvent ? { safetyEvent: draft.safetyEvent } : {}), physicalPlayHandoff: completed.physicalPlaySuggested && draft.physicalPlayHandoff === 'not-recorded' ? 'offered' : draft.physicalPlayHandoff, rawNote: draft.rawNote, confirmedAt: observedAt };
}

function changedVariant(dimension: Exclude<ComparisonDimension, 'contrast'> | 'figureGround'): VariantSelection {
  const variant: VariantSelection = { ...baselineVariant };
  if (dimension === 'figureGround') variant.figureGround = 'enhanced';
  if (dimension === 'motion') variant.motion = 'intermittent';
  if (dimension === 'sound') variant.sound = 'on';
  if (dimension === 'novelty') variant.novelty = 'alternate';
  return variant;
}

function createComparisonRecord(completed: CompletedSession, observation: SessionObservation, observedAt: string): ComparisonRecord | null {
  const comparison = completed.plan.comparison;
  if (!comparison) return null;
  const changedDimension = comparison.dimension === 'contrast' ? 'figureGround' : comparison.dimension;
  const isFirst = comparison.label.startsWith('A');
  const common = { sceneId: completed.plan.manifest.id, seed: completed.plan.seed, encounterScore: completed.plan.manifest.encounter.authoredScore };
  return { id: crypto.randomUUID(), createdAt: observedAt, first: { ...common, variant: baselineVariant, ...(isFirst ? { observationId: observation.id } : {}) }, second: { ...common, variant: changedVariant(changedDimension), ...(!isFirst ? { observationId: observation.id } : {}) }, changedDimension, observation: `Shared seed and encounter score; A and B are separate manual runs. ${isFirst ? 'B' : 'A'} remains unrecorded in this pair.` };
}

function matchesFilters(manifest: ContentManifest, theme: string, subject: string, motion: string) {
  const meta = catalogueMeta[manifest.id];
  return (theme === 'all' || meta.theme === theme) && (subject === 'all' || manifest.subjectClass === subject) && (motion === 'all' || meta.motion === motion);
}

function SceneImage({ id, alt }: { id: SceneId; alt: string }) {
  const base = publicUrl(artByScene[id]);
  return <picture><source srcSet={`${base}.avif`} type="image/avif" /><source srcSet={`${base}.webp`} type="image/webp" /><img src={`${base}.png`} alt={alt} decoding="async" loading="lazy" /></picture>;
}

function TargetMark({ className = '' }: { className?: string }) {
  return <span className={`target-mark ${className}`} aria-hidden="true"><i /><b /></span>;
}

function useCatalogueApp() {
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
  const [evidenceOpen, setEvidenceOpen] = useState<EvidenceThemeId | null>(null);
  const refereeDialogRef = useModalDialog<HTMLElement>(() => { setRefereesOpen(false); }, refereesOpen);
  const queueDialogRef = useModalDialog<HTMLElement>(() => { setQueueOpen(false); }, queueOpen);

  useEffect(() => {
    void Promise.all(manifests.flatMap((manifest) => manifest.assets.map((asset) => store.saveProvenance(asset))));
    void Promise.all([store.getQueue(), Promise.all(manifests.map((item) => store.getProgress(item.id))), store.listNotes(), store.listObservations(), store.listComparisons(), store.getSettings()]).then(([savedQueue, savedProgress, notes, observations, comparisons, settings]) => {
      setQueue(savedQueue.map((item) => item.sceneId));
      setProgress(Object.fromEntries(savedProgress.filter((item) => item !== undefined).map((item) => [item.sceneId, item.elapsedMs / item.durationMs])));
      setRecordCounts({ notes: notes.length + observations.length, comparisons: comparisons.length });
      setSceneMotionMode(settings.sceneMotionMode);
    });
  }, []);

  const changeSceneMotionMode = (next: SceneMotionMode) => {
    setSceneMotionMode(next);
    void store.getSettings().then((settings) => store.setSettings({ ...settings, sceneMotionMode: next }));
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
  const persistQueue = (next: SceneId[]) => {
    void store.setQueue(next.map<QueueItem>((sceneId) => ({ id: `queue:${sceneId}`, sceneId, variant: defaultVariant, addedAt: new Date().toISOString() })));
  };
  const addToQueue = (id: SceneId) => {
    setQueue((current) => { const next = current.includes(id) ? current : [...current, id]; persistQueue(next); return next; });
  };
  const removeFromQueue = (id: SceneId) => {
    setQueue((current) => { const next = current.filter((item) => item !== id); persistQueue(next); return next; });
  };

  const endSession = useCallback((result: SessionResult) => {
    setActive((plan) => {
      const update = sessionUpdate(plan, result);
      if (!update || !plan) return null;
      setProgress((current) => ({ ...current, [plan.manifest.id]: update.progress }));
      void store.saveProgress({ sceneId: plan.manifest.id, revision: plan.manifest.revision, elapsedMs: result.complete ? plan.manifest.finiteDurationMs : result.elapsedMs, durationMs: plan.manifest.finiteDurationMs, updatedAt: new Date().toISOString() });
      setCompleted(update.completed);
      return null;
    });
  }, []);

  const saveNotes = (draft: ObservationDraft) => {
    if (!completed) return;
    const observedAt = new Date().toISOString();
    const observation = createObservation(completed, draft, observedAt);
    void store.saveObservation(observation).then(() => { setRecordCounts((counts) => ({ ...counts, notes: counts.notes + 1 })); });
    const record = createComparisonRecord(completed, observation, observedAt);
    if (record) {
      void store.saveComparison(record).then(() => { setRecordCounts((counts) => ({ ...counts, comparisons: counts.comparisons + 1 })); });
    }
    setCompleted(null);
  };
  const exportData = async () => { const data = await store.exportData(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `catflix-local-export-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); };
  const importData = async (file: File) => { await store.importData(JSON.parse(await file.text())); window.location.reload(); };

  return { active, addToQueue, changeSceneMotionMode, completed, curatorOpen, dataOpen, endSession, evidenceOpen, exportData, filtered, importData, motion, pending, prepare, progress, queue, queueDialogRef, queueOpen, queuedSeconds, recordCounts, refereeDialogRef, refereesOpen, removeFromQueue, resumable, saveNotes, sceneMotionMode, setActive, setCompleted, setCuratorOpen, setDataOpen, setEvidenceOpen, setMotion, setPending, setQueueOpen, setRefereesOpen, setSubject, setTheme, subject, theme };
}

type CatalogueApp = ReturnType<typeof useCatalogueApp>;

function CatalogueGrid({ app }: { app: CatalogueApp }) {
  const { addToQueue, filtered, motion, prepare, queue, setMotion, setSubject, setTheme, subject, theme } = app;
  const resetFilters = () => { setTheme('all'); setSubject('all'); setMotion('all'); };
  return <section className="catalogue-section" aria-label={`${filtered.length} scenes in today's prey list`}>
    <div className="filter-deck" role="group" aria-label="Catalogue filters">
      <fieldset><legend>Theme</legend>{[['all', 'All'], ['nature', 'Nature'], ['inside', 'Inside']].map(([value, label]) => <button type="button" key={value} aria-pressed={theme === value} onClick={() => { setTheme(value); }}>{label}</button>)}</fieldset>
      <fieldset><legend>Animal / subject</legend>{[['all', 'All'], ['bird', 'Birds'], ['fish', 'Fish'], ['insect', 'Bugs'], ['object', 'Objects']].map(([value, label]) => <button type="button" key={value} aria-pressed={subject === value} onClick={() => { setSubject(value); }}>{label}</button>)}</fieldset>
      <fieldset><legend>Rhythm</legend>{[['all', 'All'], ['flowing', 'Flowing'], ['intermittent', 'Intermittent'], ['grounded', 'Grounded']].map(([value, label]) => <button type="button" key={value} aria-pressed={motion === value} onClick={() => { setMotion(value); }}>{label}</button>)}</fieldset>
    </div>
    <p className="catalogue-count" aria-live="polite">{filtered.length} found / {filtered.length ? 'Pick a beautiful distraction' : 'Try another combination'}</p>
    <div className="prey-grid">
      {filtered.length ? filtered.map((manifest) => <article className="prey-card" key={manifest.id}>
        <button className="prey-card-image" type="button" onClick={() => { prepare(manifest); }} aria-label={`Play ${catalogueMeta[manifest.id].title}`}><SceneImage id={manifest.id} alt="" /><span /></button>
        <div className="prey-card-copy"><span className="referee-stamp">Revision note / {refereeLine[manifest.id]}</span><h3>{catalogueMeta[manifest.id].title}</h3><b>{durationLabel(manifest.finiteDurationMs)} FINITE</b><p><i />{catalogueMeta[manifest.id].note}</p></div>
        <div className="prey-card-actions"><button type="button" onClick={() => { prepare(manifest); }}>Play</button><button type="button" aria-pressed={queue.includes(manifest.id)} onClick={() => { addToQueue(manifest.id); }}>{queue.includes(manifest.id) ? 'Queued' : '+ Queue'}</button></div>
      </article>) : <div className="catalogue-empty" role="status"><span>No prey in this cut</span><p>These filters do not overlap. Reset them to see the full programme.</p><button type="button" onClick={resetFilters}>Reset filters</button></div>}
    </div>
  </section>;
}

function ResumeSection({ app }: { app: CatalogueApp }) {
  const { prepare, progress, queue, queuedSeconds, resumable, setQueueOpen } = app;
  return <section className="continue-section" aria-labelledby="continue-title">
    <div className="continue-heading"><p>Earlier unfinished sessions<br />Resume only by owner choice</p><h2 id="continue-title">Return, or choose<br />another family.</h2></div>
    <div className="continue-stack">
      {resumable.length ? resumable.map((manifest) => <button type="button" key={manifest.id} onClick={() => { prepare(manifest); }}><span>Earlier unfinished encounter</span><strong>{catalogueMeta[manifest.id].title}</strong><i><b style={{ width: `${Math.round((progress[manifest.id] ?? 0) * 100)}%` }} /></i><small>{Math.round((progress[manifest.id] ?? 0) * 100)}% elapsed · consider another novelty family</small></button>) : <div className="nothing-progress"><span>Nothing unfinished</span><p>Completed or ended encounters never continue automatically.</p></div>}
      <button className="continue-queue" type="button" onClick={() => { setQueueOpen(true); }}><span>Today’s queue</span><strong>{queue.length} encounters · {Math.round(queuedSeconds)} sec</strong><small>Nothing starts automatically.</small></button>
    </div>
  </section>;
}

function Catalogue({ app }: { app: CatalogueApp }) {
  const { queue, setEvidenceOpen, setQueueOpen } = app;

  return (
    <div className="catalogue-app">
      <header className="catalogue-header">
        <div className="brand-block"><strong>CATFLIX</strong></div>
        <p>Catflix - Shows worth stalking</p>
        <button className="header-queue" type="button" onClick={() => { setQueueOpen(true); }}>Queue <b>{queue.length}</b></button>
      </header>

      <main className="catalogue-main">
        <section className="catalogue-intro" aria-labelledby="catalogue-title">
          <div className="hero-copy"><p>Five finite, supervised encounters</p><h1 id="catalogue-title">Pick a<br />quiet<br /><span>encounter.</span></h1><div className="hero-reason">Authored movement, coherent consequences,<br />and a visible ending.</div><span>Chosen by a human. <b>Attention is not enjoyment.</b></span></div>
          <div className="orbit-cat" aria-hidden="true"><span>⌁</span><i /><i /><i /></div>
        </section>

        <section className="prey-heading" aria-labelledby="prey-title">
          <p>Tablet encounters and<br />passive television scenes</p>
          <h2 id="prey-title">Today’s<br />encounters</h2>
        </section>

        <CatalogueGrid app={app} />

        <EvidenceSection onOpen={setEvidenceOpen} />

        <ResumeSection app={app} />
      </main>

      <nav className="catalogue-nav" aria-label="Catflix sections">
        <Navigation app={app} />
      </nav>

      <Overlays app={app} />
    </div>
  );
}

function Navigation({ app }: { app: CatalogueApp }) {
  const { setCuratorOpen, setDataOpen, setQueueOpen, setRefereesOpen } = app;
  return <><button className="active" type="button" onClick={() => { setQueueOpen(true); }}><Icon name="play" />Watchlist</button><button type="button" onClick={() => { setRefereesOpen(true); }}><span className="cat-icon">●</span>Referees</button><button type="button" onClick={() => { setCuratorOpen(true); }}><span className="copy-icon" />Curator</button><button type="button" onClick={() => { setDataOpen(true); }}><span className="gear-icon">✦</span>Settings</button></>;
}

function Overlays({ app }: { app: CatalogueApp }) {
  return <><SessionOverlays app={app} /><PanelOverlays app={app} /><QueueDrawer app={app} /></>;
}

function SessionOverlays({ app }: { app: CatalogueApp }) {
  return <>
    {app.pending ? <SafetyGate sceneTitle={catalogueMeta[app.pending.manifest.id].title} onCancel={() => { app.setPending(null); }} onContinue={(playbackMode, setup) => { app.setActive({ manifest: app.pending!.manifest, variants: app.pending!.variant, seed: app.pending!.seed, playbackMode, sceneMotionMode: app.sceneMotionMode, setup, ...(app.pending!.comparison ? { comparison: app.pending!.comparison } : {}) }); app.setPending(null); }} /> : null}
    {app.completed ? <RefereeNotes sceneTitle={catalogueMeta[app.completed.plan.manifest.id].title} observedCat={app.completed.plan.setup.observedCat} touchTimestamps={app.completed.touches} completed={app.completed.complete} onClose={() => { app.setCompleted(null); }} onSave={app.saveNotes} /> : null}
  </>;
}

function PanelOverlays({ app }: { app: CatalogueApp }) {
  const startCuratedScene = (id: SceneId, variant: VariantSelection, comparison?: PendingSession['comparison']) => { app.setCuratorOpen(false); const manifest = manifests.find((item) => item.id === id); if (manifest) app.prepare(manifest, variant, comparison); };
  return <>
    {app.curatorOpen ? <CuratorPanel manifests={manifests} onClose={() => { app.setCuratorOpen(false); }} onStart={startCuratedScene} /> : null}
    {app.dataOpen ? <DataPanel onClose={() => { app.setDataOpen(false); }} onExport={app.exportData} onImport={app.importData} countSummary={`${app.recordCounts.notes} local observation records and ${app.recordCounts.comparisons} comparison runs are stored.`} /> : null}
    {app.evidenceOpen ? <Suspense fallback={<div className="panel-loading" role="status">Opening the evidence…</div>}><EvidencePanel key={app.evidenceOpen} initialTheme={app.evidenceOpen} onClose={() => { app.setEvidenceOpen(null); }} /></Suspense> : null}
    {app.refereesOpen ? <div className="modal-backdrop"><section ref={app.refereeDialogRef} className="referee-intro" role="dialog" aria-modal="true" aria-labelledby="referee-title" tabIndex={-1}><button className="dialog-close" type="button" aria-label="Close referees" onClick={() => { app.setRefereesOpen(false); }}>×</button><p>Curated for three very serious viewers</p><h2 id="referee-title">The referees</h2><div><strong>ARRI</strong><strong>OZZY</strong><strong>MIKA</strong></div><span>Separate raw observations. No profiles, rankings, or automatic preference scores.</span></section></div> : null}
  </>;
}

function QueueDrawer({ app }: { app: CatalogueApp }) {
  if (!app.queueOpen) return null;
  return <aside ref={app.queueDialogRef} className="queue-drawer" role="dialog" aria-modal="true" aria-label="Queued scenes" tabIndex={-1}><header><TargetMark /><span>Saved encounters</span><button type="button" aria-label="Close queue" onClick={() => { app.setQueueOpen(false); }}>×</button></header><h2>Today’s encounter list</h2>{app.queue.length ? <ol>{app.queue.map((id) => { const item = manifests.find((manifest) => manifest.id === id); if (!item) return null; return <li key={id}><button type="button" onClick={() => { app.setQueueOpen(false); app.prepare(item); }}>{catalogueMeta[item.id].title}</button><button type="button" onClick={() => { app.removeFromQueue(id); }}>Remove</button></li>; })}</ol> : <p>Your queue is clear. Nothing starts automatically.</p>}</aside>;
}

export function App() {
  const app = useCatalogueApp();
  if (app.active) return <Suspense fallback={<div className="player-loading" role="status">Preparing the scene…</div>}><Player plan={app.active} onSceneMotionModeChange={app.changeSceneMotionMode} onExit={app.endSession} /></Suspense>;
  return <Catalogue app={app} />;
}
