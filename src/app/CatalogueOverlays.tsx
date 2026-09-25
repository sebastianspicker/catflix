import { lazy, Suspense } from 'react';
import { DataPanel } from '../catalogue/ui/DataPanel';
import { CuratorPanel } from '../encounter/ui/CuratorPanel';
import { RefereeNotes } from '../encounter/ui/RefereeNotes';
import { SafetyGate } from '../encounter/ui/SafetyGate';
import { ObservationReceipt } from '../encounter/ui/ObservationReceipt';
import { CatDoodle } from '../ui/CatDoodle';
import { ScenePoster } from '../catalogue/ui/ScenePoster';
import type { SceneId, VariantSelection } from '../domain';
import { type PendingSession } from './catalogueModel';
import { manifests, type CatalogueApp } from './useCatalogueApp';

const EvidencePanel = lazy(() => import('../research/EvidencePanel').then((module) => ({ default: module.EvidencePanel })));

function TargetMark({ className = '' }: { className?: string }) {
  return <span className={`target-mark ${className}`} aria-hidden="true"><i /><b /></span>;
}

function SessionOverlays({ app }: { app: CatalogueApp }) {
  const pending = app.pending;
  return <>
    {pending ? <SafetyGate sceneTitle={pending.manifest.catalogue.displayTitle} sceneDescription={pending.manifest.catalogue.note} preview={<ScenePoster posterUrl={pending.manifest.posterUrl} loading="eager" />} durationMs={pending.manifest.finiteDurationMs} sceneMotionMode={app.sceneMotionMode} onSceneMotionModeChange={app.changeSceneMotionMode} onCancel={app.cancelPreparing} onContinue={app.startSession} /> : null}
    {app.completed ? <RefereeNotes sceneTitle={app.completed.plan.manifest.catalogue.displayTitle} observedCat={app.completed.plan.setup.observedCat} touchTimestamps={app.completed.touches} completed={app.completed.complete} onClose={app.clearCompleted} onSave={app.saveNotes} /> : null}
    {app.savedObservation ? <ObservationReceipt observation={app.savedObservation} sceneTitle={manifests.find((item) => item.id === app.savedObservation?.sceneId)?.catalogue.displayTitle ?? app.savedObservation.sceneId} storageStatus={app.storageStatus} onClose={() => { app.closeReceipt(); }} onViewHistory={() => { app.closeReceipt(true); }} /> : null}
  </>;
}

function PanelOverlays({ app }: { app: CatalogueApp }) {
  const startCuratedScene = (id: SceneId, variant: VariantSelection, comparison?: PendingSession['comparison']) => { app.setCuratorOpen(false); const manifest = manifests.find((item) => item.id === id); if (manifest) app.prepare(manifest, variant, comparison); };
  return <>
    {app.curatorOpen ? <CuratorPanel manifests={manifests} onClose={() => { app.setCuratorOpen(false); }} onStart={startCuratedScene} /> : null}
    {app.dataOpen ? <DataPanel onClose={() => { app.setDataOpen(false); }} onExport={app.exportData} onRecoveryExport={app.exportRecoveryData} onPrepareImport={app.prepareImport} onDelete={({ store, key }) => app.deleteRecord({ kind: store === 'notes' ? 'note' : store === 'observations' ? 'observation' : 'comparison', id: key })} history={app.recordHistory} storageStatus={app.storageStatus} /> : null}
    {app.evidenceOpen ? <Suspense fallback={<div className="panel-loading" role="status">Opening the evidence…</div>}><EvidencePanel key={app.evidenceOpen} initialTheme={app.evidenceOpen} onClose={() => { app.setEvidenceOpen(null); }} /></Suspense> : null}
    {app.refereesOpen ? <div className="modal-backdrop"><section ref={app.refereeDialogRef} className="referee-intro" role="dialog" aria-modal="true" aria-labelledby="referee-title" tabIndex={-1}><button className="dialog-close" type="button" aria-label="Close referees" onClick={() => { app.setRefereesOpen(false); }}>×</button><p>Curated for three very serious viewers</p><h2 id="referee-title">The referees</h2><div><strong>ARRI</strong><strong>OZZY</strong><strong>MIKA</strong></div><span>Separate raw observations. No profiles, rankings, or automatic preference scores.</span></section></div> : null}
  </>;
}

function QueueDrawer({ app }: { app: CatalogueApp }) {
  if (!app.queueOpen) return null;
  return <aside ref={app.queueDialogRef} className="queue-drawer" role="dialog" aria-modal="true" aria-label="Watchlist" tabIndex={-1}><header><TargetMark /><span>Saved encounters</span><button type="button" aria-label="Close watchlist" onClick={() => { app.setQueueOpen(false); }}>×</button></header><h2>Your watchlist</h2>{app.queue.length ? <ol>{app.queue.map((id) => { const item = manifests.find((manifest) => manifest.id === id); if (!item) return null; return <li key={id}><button type="button" onClick={() => { app.setQueueOpen(false); app.prepare(item); }}>{item.catalogue.displayTitle}</button><button type="button" onClick={() => { app.removeFromQueue(id); }}>Remove</button></li>; })}</ol> : <div className="empty-watchlist"><div className="empty-watchlist-rule"><CatDoodle pose="curl" /></div><h3>Nothing lined up.</h3><p>Save a scene from the catalogue to find it here later.</p><button className="primary-button" type="button" onClick={() => { app.setQueueOpen(false); }}>Browse scenes</button><p>Adding a scene never starts playback.</p></div>}</aside>;
}

export function CatalogueOverlays({ app }: { app: CatalogueApp }) {
  return <><SessionOverlays app={app} /><PanelOverlays app={app} /><QueueDrawer app={app} /></>;
}
