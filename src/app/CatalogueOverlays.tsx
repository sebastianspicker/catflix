import { lazy, Suspense } from 'react';
import { DataPanel } from '../catalogue/ui/DataPanel';
import { CuratorPanel } from '../encounter/ui/CuratorPanel';
import { RefereeNotes } from '../encounter/ui/RefereeNotes';
import { SafetyGate } from '../encounter/ui/SafetyGate';
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
    {pending ? <SafetyGate sceneTitle={pending.manifest.catalogue.displayTitle} onCancel={app.cancelPreparing} onContinue={app.startSession} /> : null}
    {app.completed ? <RefereeNotes sceneTitle={app.completed.plan.manifest.catalogue.displayTitle} observedCat={app.completed.plan.setup.observedCat} touchTimestamps={app.completed.touches} completed={app.completed.complete} onClose={app.clearCompleted} onSave={app.saveNotes} /> : null}
  </>;
}

function PanelOverlays({ app }: { app: CatalogueApp }) {
  const startCuratedScene = (id: SceneId, variant: VariantSelection, comparison?: PendingSession['comparison']) => { app.setCuratorOpen(false); const manifest = manifests.find((item) => item.id === id); if (manifest) app.prepare(manifest, variant, comparison); };
  return <>
    {app.curatorOpen ? <CuratorPanel manifests={manifests} onClose={() => { app.setCuratorOpen(false); }} onStart={startCuratedScene} /> : null}
    {app.dataOpen ? <DataPanel onClose={() => { app.setDataOpen(false); }} onExport={app.exportData} onImport={app.importData} countSummary={`${app.recordCounts.notes} local observation records and ${app.recordCounts.comparisons} comparison runs are stored.`} storageStatus={app.storageStatus} /> : null}
    {app.evidenceOpen ? <Suspense fallback={<div className="panel-loading" role="status">Opening the evidence…</div>}><EvidencePanel key={app.evidenceOpen} initialTheme={app.evidenceOpen} onClose={() => { app.setEvidenceOpen(null); }} /></Suspense> : null}
    {app.refereesOpen ? <div className="modal-backdrop"><section ref={app.refereeDialogRef} className="referee-intro" role="dialog" aria-modal="true" aria-labelledby="referee-title" tabIndex={-1}><button className="dialog-close" type="button" aria-label="Close referees" onClick={() => { app.setRefereesOpen(false); }}>×</button><p>Curated for three very serious viewers</p><h2 id="referee-title">The referees</h2><div><strong>ARRI</strong><strong>OZZY</strong><strong>MIKA</strong></div><span>Separate raw observations. No profiles, rankings, or automatic preference scores.</span></section></div> : null}
  </>;
}

function QueueDrawer({ app }: { app: CatalogueApp }) {
  if (!app.queueOpen) return null;
  return <aside ref={app.queueDialogRef} className="queue-drawer" role="dialog" aria-modal="true" aria-label="Queued scenes" tabIndex={-1}><header><TargetMark /><span>Saved encounters</span><button type="button" aria-label="Close queue" onClick={() => { app.setQueueOpen(false); }}>×</button></header><h2>Today’s encounter list</h2>{app.queue.length ? <ol>{app.queue.map((id) => { const item = manifests.find((manifest) => manifest.id === id); if (!item) return null; return <li key={id}><button type="button" onClick={() => { app.setQueueOpen(false); app.prepare(item); }}>{item.catalogue.displayTitle}</button><button type="button" onClick={() => { app.removeFromQueue(id); }}>Remove</button></li>; })}</ol> : <p>Your queue is clear. Nothing starts automatically.</p>}</aside>;
}

export function CatalogueOverlays({ app }: { app: CatalogueApp }) {
  return <><SessionOverlays app={app} /><PanelOverlays app={app} /><QueueDrawer app={app} /></>;
}
