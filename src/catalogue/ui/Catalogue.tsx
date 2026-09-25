import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CatalogueRhythmFilter, CatalogueSubjectFilter, CatalogueThemeFilter, ContentManifest } from '../model';
import type { SceneId } from '../../domain';
import type { EvidenceThemeId } from '../../research/evidence';
import { EvidenceSection } from '../../research/EvidenceSection';
import { CatDoodle } from '../../ui/CatDoodle';
import { publicUrl } from '../../paths';
import { ScenePoster } from './ScenePoster';

/** State and commands the catalogue renders; application composition owns their implementation. */
export interface CatalogueViewModel {
  addToQueue: (id: SceneId) => void;
  filtered: readonly ContentManifest[];
  rhythm: CatalogueRhythmFilter;
  prepare: (manifest: ContentManifest) => void;
  progress: Partial<Record<SceneId, number>>;
  queue: readonly SceneId[];
  queuedSeconds: number;
  resumable: readonly ContentManifest[];
  setCuratorOpen: (open: boolean) => void;
  setDataOpen: (open: boolean) => void;
  setEvidenceOpen: (theme: EvidenceThemeId) => void;
  setRhythm: (value: CatalogueRhythmFilter) => void;
  setQueueOpen: (open: boolean) => void;
  setRefereesOpen: (open: boolean) => void;
  setSubject: (value: CatalogueSubjectFilter) => void;
  setTheme: (value: CatalogueThemeFilter) => void;
  storageStatus: { mode: 'persistent' | 'degraded'; message?: string };
  subject: CatalogueSubjectFilter;
  theme: CatalogueThemeFilter;
}

const durationLabel = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

function CatalogueGrid({ app }: { app: CatalogueViewModel }) {
  const { addToQueue, filtered, prepare, queue, rhythm, setRhythm, setSubject, setTheme, subject, theme } = app;
  const resetFilters = () => { setTheme('all'); setSubject('all'); setRhythm('all'); };
  const [filtersOpen, setFiltersOpen] = useState(false);
  return <section id="scenes" className="catalogue-section" aria-label={`${filtered.length} scenes`}>
    <div className="catalogue-filter-bar">
      <p className="catalogue-count" aria-live="polite">{filtered.length} scenes</p>
      <button className="filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="catalogue-filters" onClick={() => { setFiltersOpen(!filtersOpen); }}>Filters <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path d="m3 5 5 5 5-5" /></svg></button>
      <div id="catalogue-filters" className="filter-deck" data-open={filtersOpen} role="group" aria-label="Catalogue filters">
        <label>Theme<select value={theme} onChange={(event) => { setTheme(event.target.value as CatalogueThemeFilter); }}>{([['all', 'All'], ['nature', 'Nature'], ['inside', 'Inside']] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Subject<select value={subject} onChange={(event) => { setSubject(event.target.value as CatalogueSubjectFilter); }}>{([['all', 'All'], ['bird', 'Birds'], ['fish', 'Fish'], ['insect', 'Bugs'], ['object', 'Objects']] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Rhythm<select value={rhythm} onChange={(event) => { setRhythm(event.target.value as CatalogueRhythmFilter); }}>{([['all', 'All'], ['flowing', 'Flowing'], ['intermittent', 'Intermittent'], ['grounded', 'Grounded']] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
    </div>
    <div className="prey-grid">
      {filtered.length ? filtered.map((manifest) => <article className="prey-card" key={manifest.id}>
        <button className="prey-card-image" type="button" onClick={() => { prepare(manifest); }} aria-label={`Prepare ${manifest.catalogue.displayTitle}`}><ScenePoster posterUrl={manifest.posterUrl} /><span /></button>
        <div className="prey-card-copy">{manifest.catalogue.refereeLine && manifest.catalogue.refereeLine !== 'No curator note published' ? <span className="referee-stamp">{manifest.catalogue.refereeLine}</span> : null}<h3>{manifest.catalogue.displayTitle}</h3><b>{durationLabel(manifest.finiteDurationMs)}</b><p><i />{manifest.catalogue.note}</p></div>
        <div className="prey-card-actions"><button type="button" onClick={() => { prepare(manifest); }}>Prepare</button><button type="button" aria-disabled={queue.includes(manifest.id)} onClick={() => { if (!queue.includes(manifest.id)) addToQueue(manifest.id); }}>{queue.includes(manifest.id) ? 'In watchlist' : '+ Watchlist'}</button></div>
      </article>) : <div className="catalogue-empty" role="status"><span>No scenes found</span><p>These filters do not overlap. Reset them to see the full programme.</p><button type="button" onClick={resetFilters}>Reset filters</button></div>}
    </div>
    <p className="catalogue-setup-note">Every encounter starts with a setup check. Nothing plays automatically.</p>
  </section>;
}

function ResumeSection({ app }: { app: CatalogueViewModel }) {
  const { prepare, progress, queue, queuedSeconds, resumable, setQueueOpen } = app;
  return <section className="continue-section" aria-labelledby="continue-title">
    <div className="continue-heading"><p>Earlier unfinished sessions<br />Restart only by owner choice</p><h2 id="continue-title">Return, or choose<br />another family.</h2></div>
    <div className="continue-stack">
      {resumable.length ? resumable.map((manifest) => <button type="button" key={manifest.id} onClick={() => { prepare(manifest); }}><span>Earlier progress</span><strong>{manifest.catalogue.displayTitle}</strong><i><b style={{ width: `${Math.round((progress[manifest.id] ?? 0) * 100)}%` }} /></i><small>{Math.round((progress[manifest.id] ?? 0) * 100)}% elapsed · restarts from the beginning · consider another novelty family</small></button>) : <div className="nothing-progress"><span>Nothing unfinished</span><p>Completed or ended encounters never continue automatically.</p></div>}
      <button className="continue-queue" type="button" onClick={() => { setQueueOpen(true); }}><span>Your watchlist</span><strong>{queue.length} encounters · {Math.round(queuedSeconds)} sec</strong><small>Nothing starts automatically.</small></button>
    </div>
  </section>;
}

function Navigation({ app, onNavigate }: { app: CatalogueViewModel; onNavigate: () => void }) {
  const { queue, setCuratorOpen, setDataOpen, setQueueOpen } = app;
  return <><a href="#scenes" aria-current="page" onClick={onNavigate}>Scenes</a><button type="button" onClick={() => { onNavigate(); setQueueOpen(true); }}>Watchlist <b>{queue.length}</b></button><button type="button" onClick={() => { onNavigate(); setDataOpen(true); }}>Observations</button><button type="button" onClick={() => { onNavigate(); setCuratorOpen(true); }}>Curator</button><button type="button" onClick={() => { onNavigate(); setDataOpen(true); }}>Local data</button></>;
}

export function Catalogue({ app, children }: { app: CatalogueViewModel; children?: ReactNode }) {
  const { setEvidenceOpen, setRefereesOpen, storageStatus } = app;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    const button = menuButtonRef.current;
    if (menuOpen && button && button.getClientRects().length > 0) button.focus({ preventScroll: true });
    setMenuOpen(false);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      const button = menuButtonRef.current;
      if (event.key !== 'Escape' || !button || button.getClientRects().length === 0) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      setMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => { document.removeEventListener('keydown', handleEscape); };
  }, [menuOpen]);
  return <div className="catalogue-app">
    <header className="catalogue-header">
      <div className="brand-block"><strong>CATFLIX</strong></div>
      <button ref={menuButtonRef} className="catalogue-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="catalogue-navigation" onClick={() => { setMenuOpen(!menuOpen); }}>Menu</button>
      <nav id="catalogue-navigation" className="catalogue-primary-nav" data-open={menuOpen} aria-label="Catflix sections"><Navigation app={app} onNavigate={closeMenu} /></nav>
    </header>
    <main className="catalogue-main">
      {storageStatus.mode === 'degraded' ? <p className="storage-warning" role="alert">Local storage warning: {storageStatus.message} Changes may not persist, and import/export are unavailable.</p> : null}
      <section className="catalogue-intro" aria-labelledby="catalogue-title">
        <div className="hero-copy"><p>Five finite, supervised encounters</p><h1 id="catalogue-title">Pick a <span className="hero-quiet">quiet</span><br /><span>encounter.</span></h1><div className="hero-reason">Five finite scenes. Chosen by you.<b>Attention is not enjoyment.</b></div></div>
        <div className="orbit-cat" aria-hidden="true"><CatDoodle pose="peek" /><i /><i /></div>
      </section>
      <CatalogueGrid app={app} />
      <EvidenceSection onOpen={setEvidenceOpen} />
      <ResumeSection app={app} />
    </main>
    <nav className="catalogue-secondary-nav" aria-label="More about Catflix"><button type="button" onClick={() => { setRefereesOpen(true); }}>Meet the referees</button><a href={publicUrl('/demo')}>Screenshot tour</a><a href={publicUrl('/research')}>Scientific foundation</a></nav>
    {children}
  </div>;
}
