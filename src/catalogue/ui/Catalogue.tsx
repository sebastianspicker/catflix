import type { ReactNode } from 'react';
import type { CatalogueRhythmFilter, CatalogueSubjectFilter, CatalogueThemeFilter, ContentManifest } from '../model';
import type { SceneId } from '../../domain';
import type { EvidenceThemeId } from '../../research/evidence';
import { EvidenceSection } from '../../research/EvidenceSection';
import { Icon } from '../../ui/Icon';
import { publicUrl } from '../../paths';

/** State and commands the catalogue renders; application composition owns their implementation. */
export interface CatalogueViewModel {
  addToQueue(id: SceneId): void;
  filtered: readonly ContentManifest[];
  rhythm: CatalogueRhythmFilter;
  prepare(manifest: ContentManifest): void;
  progress: Partial<Record<SceneId, number>>;
  queue: readonly SceneId[];
  queuedSeconds: number;
  resumable: readonly ContentManifest[];
  setCuratorOpen(open: boolean): void;
  setDataOpen(open: boolean): void;
  setEvidenceOpen(theme: EvidenceThemeId): void;
  setRhythm(value: CatalogueRhythmFilter): void;
  setQueueOpen(open: boolean): void;
  setRefereesOpen(open: boolean): void;
  setSubject(value: CatalogueSubjectFilter): void;
  setTheme(value: CatalogueThemeFilter): void;
  storageStatus: { mode: 'persistent' | 'degraded'; message?: string };
  subject: CatalogueSubjectFilter;
  theme: CatalogueThemeFilter;
}

const durationLabel = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

function SceneImage({ posterUrl, alt }: { posterUrl: string; alt: string }) {
  return <picture><source srcSet={publicUrl(posterUrl.replace(/\.webp$/, '.avif'))} type="image/avif" /><img src={publicUrl(posterUrl)} alt={alt} decoding="async" loading="lazy" /></picture>;
}

function CatalogueGrid({ app }: { app: CatalogueViewModel }) {
  const { addToQueue, filtered, prepare, queue, rhythm, setRhythm, setSubject, setTheme, subject, theme } = app;
  const resetFilters = () => { setTheme('all'); setSubject('all'); setRhythm('all'); };
  return <section className="catalogue-section" aria-label={`${filtered.length} scenes in today's prey list`}>
    <div className="filter-deck" role="group" aria-label="Catalogue filters">
      <fieldset><legend>Theme</legend>{([['all', 'All'], ['nature', 'Nature'], ['inside', 'Inside']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={theme === value} onClick={() => { setTheme(value); }}>{label}</button>)}</fieldset>
      <fieldset><legend>Animal / subject</legend>{([['all', 'All'], ['bird', 'Birds'], ['fish', 'Fish'], ['insect', 'Bugs'], ['object', 'Objects']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={subject === value} onClick={() => { setSubject(value); }}>{label}</button>)}</fieldset>
      <fieldset><legend>Rhythm</legend>{([['all', 'All'], ['flowing', 'Flowing'], ['intermittent', 'Intermittent'], ['grounded', 'Grounded']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={rhythm === value} onClick={() => { setRhythm(value); }}>{label}</button>)}</fieldset>
    </div>
    <p className="catalogue-count" aria-live="polite">{filtered.length} found / {filtered.length ? 'Pick a beautiful distraction' : 'Try another combination'}</p>
    <div className="prey-grid">
      {filtered.length ? filtered.map((manifest) => <article className="prey-card" key={manifest.id}>
        <button className="prey-card-image" type="button" onClick={() => { prepare(manifest); }} aria-label={`Play ${manifest.catalogue.displayTitle}`}><SceneImage posterUrl={manifest.posterUrl} alt="" /><span /></button>
        <div className="prey-card-copy"><span className="referee-stamp">Revision note / {manifest.catalogue.refereeLine}</span><h3>{manifest.catalogue.displayTitle}</h3><b>{durationLabel(manifest.finiteDurationMs)} FINITE</b><p><i />{manifest.catalogue.note}</p></div>
        <div className="prey-card-actions"><button type="button" onClick={() => { prepare(manifest); }}>Play</button><button type="button" aria-pressed={queue.includes(manifest.id)} onClick={() => { addToQueue(manifest.id); }}>{queue.includes(manifest.id) ? 'Queued' : '+ Queue'}</button></div>
      </article>) : <div className="catalogue-empty" role="status"><span>No prey in this cut</span><p>These filters do not overlap. Reset them to see the full programme.</p><button type="button" onClick={resetFilters}>Reset filters</button></div>}
    </div>
  </section>;
}

function ResumeSection({ app }: { app: CatalogueViewModel }) {
  const { prepare, progress, queue, queuedSeconds, resumable, setQueueOpen } = app;
  return <section className="continue-section" aria-labelledby="continue-title">
    <div className="continue-heading"><p>Earlier unfinished sessions<br />Restart only by owner choice</p><h2 id="continue-title">Return, or choose<br />another family.</h2></div>
    <div className="continue-stack">
      {resumable.length ? resumable.map((manifest) => <button type="button" key={manifest.id} onClick={() => { prepare(manifest); }}><span>Earlier progress</span><strong>{manifest.catalogue.displayTitle}</strong><i><b style={{ width: `${Math.round((progress[manifest.id] ?? 0) * 100)}%` }} /></i><small>{Math.round((progress[manifest.id] ?? 0) * 100)}% elapsed · restarts from the beginning · consider another novelty family</small></button>) : <div className="nothing-progress"><span>Nothing unfinished</span><p>Completed or ended encounters never continue automatically.</p></div>}
      <button className="continue-queue" type="button" onClick={() => { setQueueOpen(true); }}><span>Today’s queue</span><strong>{queue.length} encounters · {Math.round(queuedSeconds)} sec</strong><small>Nothing starts automatically.</small></button>
    </div>
  </section>;
}

function Navigation({ app }: { app: CatalogueViewModel }) {
  const { setCuratorOpen, setDataOpen, setQueueOpen, setRefereesOpen } = app;
  return <><button className="active" type="button" onClick={() => { setQueueOpen(true); }}><Icon name="play" />Watchlist</button><button type="button" onClick={() => { setRefereesOpen(true); }}><span className="cat-icon">●</span>Referees</button><button type="button" onClick={() => { setCuratorOpen(true); }}><span className="copy-icon" />Curator</button><button type="button" onClick={() => { setDataOpen(true); }}><span className="gear-icon">✦</span>Settings</button></>;
}

export function Catalogue({ app, children }: { app: CatalogueViewModel; children?: ReactNode }) {
  const { queue, setEvidenceOpen, setQueueOpen, storageStatus } = app;
  return <div className="catalogue-app">
    <header className="catalogue-header">
      <div className="brand-block"><strong>CATFLIX</strong></div>
      <p>Catflix - Shows worth stalking</p>
      <button className="header-queue" type="button" onClick={() => { setQueueOpen(true); }}>Queue <b>{queue.length}</b></button>
    </header>
    <main className="catalogue-main">
      {storageStatus.mode === 'degraded' ? <p className="storage-warning" role="alert">Local storage warning: {storageStatus.message} Changes may not persist, and import/export are unavailable.</p> : null}
      <section className="catalogue-intro" aria-labelledby="catalogue-title">
        <div className="hero-copy"><p>Five finite, supervised encounters</p><h1 id="catalogue-title">Pick a<br />quiet<br /><span>encounter.</span></h1><div className="hero-reason">Authored movement, coherent consequences,<br />and a visible ending.</div><span>Chosen by a human. <b>Attention is not enjoyment.</b></span></div>
        <div className="orbit-cat" aria-hidden="true"><span>⌁</span><i /><i /><i /></div>
      </section>
      <section className="prey-heading" aria-labelledby="prey-title"><p>Tablet encounters and<br />passive television scenes</p><h2 id="prey-title">Today’s<br />encounters</h2></section>
      <CatalogueGrid app={app} />
      <EvidenceSection onOpen={setEvidenceOpen} />
      <ResumeSection app={app} />
    </main>
    <nav className="catalogue-nav" aria-label="Catflix sections"><Navigation app={app} /></nav>
    {children}
  </div>;
}
