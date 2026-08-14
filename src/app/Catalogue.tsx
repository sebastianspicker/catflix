import { EvidenceSection } from '../components/EvidenceSection';
import { Icon } from '../components/Icons';
import type { SceneId } from '../content/types';
import { publicUrl } from '../paths';
import { catalogueMeta, durationLabel, refereeLine, sceneArtPath } from './catalogueModel';
import { CatalogueOverlays } from './CatalogueOverlays';
import type { CatalogueApp } from './useCatalogueApp';

function SceneImage({ id, alt }: { id: SceneId; alt: string }) {
  const base = publicUrl(sceneArtPath(id));
  return <picture><source srcSet={`${base}.avif`} type="image/avif" /><source srcSet={`${base}.webp`} type="image/webp" /><img src={`${base}.png`} alt={alt} decoding="async" loading="lazy" /></picture>;
}

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

function Navigation({ app }: { app: CatalogueApp }) {
  const { setCuratorOpen, setDataOpen, setQueueOpen, setRefereesOpen } = app;
  return <><button className="active" type="button" onClick={() => { setQueueOpen(true); }}><Icon name="play" />Watchlist</button><button type="button" onClick={() => { setRefereesOpen(true); }}><span className="cat-icon">●</span>Referees</button><button type="button" onClick={() => { setCuratorOpen(true); }}><span className="copy-icon" />Curator</button><button type="button" onClick={() => { setDataOpen(true); }}><span className="gear-icon">✦</span>Settings</button></>;
}

export function Catalogue({ app }: { app: CatalogueApp }) {
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
    <CatalogueOverlays app={app} />
  </div>;
}
