import { useMemo, useRef, useState, type RefObject } from 'react';
import { useModalDialog } from '../../ui/useModalDialog';

const pageSize = 50;
type RecordStore = 'notes' | 'observations' | 'comparisons';
type HistoryView = 'observations' | 'notes' | 'comparisons';
type ComparisonDimension = 'figureGround' | 'motion' | 'sound' | 'novelty';

interface VariantView { figureGround: string; motion: string; sound: string; novelty: string; }
interface ObservationView {
  id: string; sceneId: string; contentRevision: string; variant: VariantView; playbackMode: string;
  viewingDistanceBand: string; roomLightBand: string; soundEnabled: boolean; observedCat?: string;
  elapsedMs: number; endReason: string; acceptedContactTimestamps: readonly number[];
  vocabulary: readonly string[]; safetyEvent?: string; physicalPlayHandoff: string; rawNote: string; confirmedAt: string;
}
interface NoteView {
  id: string; cat: string; sceneId: string; contentRevision: string; createdAt: string; rawNote: string;
  vocabulary: readonly string[]; touchTimestamps?: readonly number[];
}
interface ComparisonRunView { sceneId: string; contentRevision?: string; variant: VariantView; observationId?: string; }
interface ComparisonView { id: string; createdAt: string; first: ComparisonRunView; second: ComparisonRunView; changedDimension: ComparisonDimension; observation?: string; }

export interface DataPanelHistory {
  notes: readonly NoteView[];
  observations: readonly ObservationView[];
  comparisons: readonly ComparisonView[];
}

export interface ImportPreviewView {
  schemaVersion: 1 | 2;
  exportedAt: string;
  counts: { settings: number; queue: number; progress: number; notes: number; observations: number; comparisons: number; provenance: number };
  commit: () => Promise<void>;
}

interface DataPanelProps {
  onClose: () => void;
  onExport: () => Promise<void>;
  onRecoveryExport: () => Promise<void>;
  onPrepareImport: (_file: File) => Promise<ImportPreviewView>;
  onDelete: (_target: { store: RecordStore; key: string }) => Promise<void>;
  history: DataPanelHistory;
  storageStatus: { mode: 'persistent' | 'degraded'; message?: string };
}

const displayDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : value;
};
const duration = (milliseconds: number) => `${Math.round(milliseconds / 1000)} sec`;
const variantSummary = (variant: VariantView) => `${variant.figureGround} contrast · ${variant.motion} motion · sound ${variant.sound} · ${variant.novelty}`;
const listSummary = (items: readonly string[]) => items.length ? items.join(', ') : 'None recorded';

function LoadMore({ visible, total, onLoad }: { visible: number; total: number; onLoad: () => void }) {
  return visible < total ? <button className="history-load" type="button" onClick={onLoad}>Load 50 more</button> : null;
}

function DeleteControl({ id, label, store, confirming, pending, onAsk, onCancel, onDelete }: {
  id: string; label: string; store: RecordStore; confirming: boolean; pending: boolean;
  onAsk: () => void; onCancel: () => void; onDelete: (_target: { store: RecordStore; key: string }) => Promise<void>;
}) {
  if (!confirming) return <button className="record-delete" type="button" disabled={pending} onClick={onAsk}>Delete</button>;
  return <span className="delete-confirm" role="group" aria-label={`Confirm deletion of ${label}`}>
    <span>This removes only this record.</span>
    <button type="button" disabled={pending} onClick={onCancel}>Cancel</button>
    <button type="button" disabled={pending} onClick={() => { void onDelete({ store, key: id }); }}>{pending ? 'Deleting…' : `Delete ${label}`}</button>
  </span>;
}

function ObservationHistory({ records, visible, confirming, pendingKey, onAskDelete, onCancelDelete, onDelete }: {
  records: readonly ObservationView[]; visible: number; confirming: string | null; pendingKey: string | null;
  onAskDelete: (_key: string) => void; onCancelDelete: () => void; onDelete: (_target: { store: RecordStore; key: string }) => Promise<void>;
}) {
  if (!records.length) return <p className="history-empty">No saved observations yet. Confirm a session record to place it here.</p>;
  return <ol className="record-list">{records.slice(0, visible).map((record) => <li key={record.id}>
    <header><span>{displayDate(record.confirmedAt)}</span><strong>{record.sceneId}</strong><small>{record.observedCat ?? 'No cat selected'} · {record.endReason}</small></header>
    <details><summary>Review observation details</summary><dl>
      <div><dt>Context</dt><dd>{record.playbackMode} · {record.viewingDistanceBand} · {record.roomLightBand} · {duration(record.elapsedMs)}</dd></div>
      <div><dt>Vocabulary</dt><dd>{listSummary(record.vocabulary)}</dd></div>
      <div><dt>Contacts</dt><dd>{record.acceptedContactTimestamps.length} accepted target contacts</dd></div>
      <div><dt>Variants</dt><dd>{variantSummary(record.variant)}</dd></div>
      <div><dt>Revision</dt><dd>{record.contentRevision}</dd></div>
      <div><dt>Safety event</dt><dd>{record.safetyEvent || 'None recorded'}</dd></div>
      <div><dt>Physical-play handoff</dt><dd>{record.physicalPlayHandoff}</dd></div>
      <div><dt>Raw note</dt><dd className="literal-note">{record.rawNote || 'No raw note recorded.'}</dd></div>
    </dl></details>
    <DeleteControl id={record.id} label="observation" store="observations" confirming={confirming === `observations:${record.id}`} pending={pendingKey !== null} onAsk={() => { onAskDelete(`observations:${record.id}`); }} onCancel={onCancelDelete} onDelete={onDelete} />
  </li>)}</ol>;
}

function LegacyNoteHistory({ records, visible, confirming, pendingKey, onAskDelete, onCancelDelete, onDelete }: {
  records: readonly NoteView[]; visible: number; confirming: string | null; pendingKey: string | null;
  onAskDelete: (_key: string) => void; onCancelDelete: () => void; onDelete: (_target: { store: RecordStore; key: string }) => Promise<void>;
}) {
  if (!records.length) return <p className="history-empty">No imported legacy notes are stored.</p>;
  return <ol className="record-list">{records.slice(0, visible).map((record) => <li key={record.id}>
    <header><span>{displayDate(record.createdAt)}</span><strong>{record.sceneId}</strong><small>{record.cat} · imported legacy note</small></header>
    <details><summary>Review legacy note details</summary><dl>
      <div><dt>Vocabulary</dt><dd>{listSummary(record.vocabulary)}</dd></div>
      <div><dt>Contacts</dt><dd>{record.touchTimestamps?.length ?? 0} recorded timestamps</dd></div>
      <div><dt>Revision</dt><dd>{record.contentRevision}</dd></div>
      <div><dt>Raw note</dt><dd className="literal-note">{record.rawNote || 'No raw note recorded.'}</dd></div>
    </dl></details>
    <DeleteControl id={record.id} label="note" store="notes" confirming={confirming === `notes:${record.id}`} pending={pendingKey !== null} onAsk={() => { onAskDelete(`notes:${record.id}`); }} onCancel={onCancelDelete} onDelete={onDelete} />
  </li>)}</ol>;
}

function ComparisonSide({ name, run, observations, notes }: { name: 'A' | 'B'; run: ComparisonRunView; observations: Map<string, ObservationView>; notes: Map<string, NoteView> }) {
  const observation = run.observationId ? observations.get(run.observationId) : undefined;
  const legacyNote = run.observationId ? notes.get(run.observationId) : undefined;
  return <div className="comparison-side"><b>{name}</b><span>{variantSummary(run.variant)}</span><strong>{observation ? 'Observation recorded' : legacyNote ? 'Legacy note recorded' : 'Missing'}</strong>
    {observation ? <small>{displayDate(observation.confirmedAt)} · {observation.endReason}</small> : null}
    {legacyNote ? <small>{displayDate(legacyNote.createdAt)} · {legacyNote.cat}</small> : null}
  </div>;
}

function comparisonSides(record: ComparisonView): readonly [ComparisonRunView, ComparisonRunView] {
  const canonicalA = { figureGround: 'natural', motion: 'continuous', sound: 'off', novelty: 'familiar' } as const;
  return record.first.variant[record.changedDimension] === canonicalA[record.changedDimension]
    ? [record.first, record.second]
    : [record.second, record.first];
}

function ComparisonHistory({ records, history, visible, confirming, pendingKey, onAskDelete, onCancelDelete, onDelete }: {
  records: readonly ComparisonView[]; history: DataPanelHistory; visible: number; confirming: string | null; pendingKey: string | null;
  onAskDelete: (_key: string) => void; onCancelDelete: () => void; onDelete: (_target: { store: RecordStore; key: string }) => Promise<void>;
}) {
  const observations = useMemo(() => new Map(history.observations.map((record) => [record.id, record])), [history.observations]);
  const notes = useMemo(() => new Map(history.notes.map((record) => [record.id, record])), [history.notes]);
  if (!records.length) return <p className="history-empty">No comparison runs are stored. A and B remain separate owner-started sessions.</p>;
  return <ol className="record-list comparison-list">{records.slice(0, visible).map((record) => {
    const [sideA, sideB] = comparisonSides(record);
    return <li key={record.id}>
      <header><span>{displayDate(record.createdAt)}</span><strong>{record.first.sceneId}</strong><small>{record.changedDimension} comparison</small></header>
      <div className="comparison-pair"><ComparisonSide name="A" run={sideA} observations={observations} notes={notes} /><ComparisonSide name="B" run={sideB} observations={observations} notes={notes} /></div>
      {record.observation ? <details><summary>Review comparison note</summary><p className="literal-note">{record.observation}</p></details> : null}
      <p className="comparison-boundary">Recorded links only. Catflix does not infer a winner, preference, engagement, or welfare.</p>
      <DeleteControl id={record.id} label="comparison" store="comparisons" confirming={confirming === `comparisons:${record.id}`} pending={pendingKey !== null} onAsk={() => { onAskDelete(`comparisons:${record.id}`); }} onCancel={onCancelDelete} onDelete={onDelete} />
    </li>;
  })}</ol>;
}

function ImportPreview({ preview, pending, onCancel, onConfirm }: { preview: ImportPreviewView; pending: boolean; onCancel: () => void; onConfirm: () => Promise<void> }) {
  return <section className="import-preview" aria-labelledby="import-preview-title">
    <h3 id="import-preview-title">Import preview</h3>
    <p>Schema v{preview.schemaVersion} · exported {displayDate(preview.exportedAt)}</p>
    <dl>{Object.entries(preview.counts).map(([store, count]) => <div key={store}><dt>{store}</dt><dd>{count}</dd></div>)}</dl>
    <p className="import-warning"><strong>Confirmation replaces all seven local stores.</strong> Export the current record first if you may need it again.</p>
    <div className="modal-actions"><button className="text-button" type="button" disabled={pending} onClick={onCancel}>Cancel</button><button className="primary-button" type="button" disabled={pending} onClick={() => { void onConfirm(); }}>{pending ? 'Replacing…' : 'Confirm replacement'}</button></div>
  </section>;
}

function useDataPanelController({ onClose, onExport, onRecoveryExport, onPrepareImport, onDelete, history }: DataPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<HistoryView>('observations');
  const [limits, setLimits] = useState<Record<HistoryView, number>>({ observations: pageSize, notes: pageSize, comparisons: pageSize });
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<ImportPreviewView | null>(null);
  const [importPending, setImportPending] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const dialogRef = useModalDialog<HTMLElement>(() => {
    if (!importPending && pendingKey === null) onClose();
  });
  const observations = useMemo(() => [...history.observations].sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt) || b.id.localeCompare(a.id)), [history.observations]);
  const notes = useMemo(() => [...history.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)), [history.notes]);
  const comparisons = useMemo(() => [...history.comparisons].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)), [history.comparisons]);
  const exportFile = async () => { try { await onExport(); setStatus('Export complete. A local JSON copy was downloaded.'); } catch (error) { setStatus(error instanceof Error ? error.message : 'Export failed. Local storage could not be read.'); } };
  const recoveryFile = async () => {
    try { await onRecoveryExport(); setStatus('Recovery export downloaded. This copy may exceed normal import limits; keep it before deleting records to restore capacity.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Recovery export failed. Local storage could not be read.'); }
  };
  const previewFile = async (file?: File) => {
    if (!file) return;
    setPreview(null);
    setImportPending(true);
    try { setPreview(await onPrepareImport(file)); setStatus('Import validated. Review the replacement summary before confirming.'); }
    catch (error) { setStatus(`Import failed. Existing local records were not changed. ${error instanceof Error ? error.message : 'The file may be corrupt or unsupported.'}`); }
    finally { setImportPending(false); if (inputRef.current) inputRef.current.value = ''; }
  };
  const confirmImport = async () => {
    if (!preview) return;
    setImportPending(true);
    try { await preview.commit(); setStatus('Import complete. Reloading the committed local record.'); }
    catch { setStatus('Import failed during replacement. Existing local records were not changed.'); setImportPending(false); }
  };
  const deleteRecord = async (target: { store: RecordStore; key: string }) => {
    const key = `${target.store}:${target.key}`;
    setPendingKey(key);
    try { await onDelete(target); setConfirming(null); setStatus('Record deleted. Linked records were retained.'); }
    catch { setStatus('Delete failed. The local record was not changed.'); }
    finally { setPendingKey(null); }
  };
  const totals = { observations: observations.length, notes: notes.length, comparisons: comparisons.length };
  return {
    comparisons, confirming, confirmImport, deleteRecord, dialogRef, exportFile, recoveryFile, importPending, inputRef,
    limits, notes, observations, pendingKey, preview, previewFile, setConfirming, setLimits, setPreview,
    setStatus, setView, status, totals, view,
  };
}

function DataActions({ degraded, pending, inputRef, onExport }: { degraded: boolean; pending: boolean; inputRef: RefObject<HTMLInputElement | null>; onExport: () => Promise<void> }) {
  const exportDescription = degraded ? 'Unavailable for this page. Reload to retry local storage.' : 'Download a lossless, versioned copy.';
  const importDescription = degraded ? 'Unavailable for this page. Reload to retry local storage.' : 'Validate a Catflix export before replacing anything.';
  return <div className="data-actions">
    <button type="button" disabled={degraded || pending} onClick={() => { void onExport(); }}><strong>Export JSON</strong><span>{exportDescription}</span></button>
    <button type="button" disabled={degraded || pending} onClick={() => { inputRef.current?.click(); }}><strong>Preview import</strong><span>{importDescription}</span></button>
  </div>;
}

function HistoryPane({ controller, history }: { controller: ReturnType<typeof useDataPanelController>; history: DataPanelHistory }) {
  const common = {
    confirming: controller.confirming,
    pendingKey: controller.pendingKey,
    onAskDelete: controller.setConfirming,
    onCancelDelete: () => { controller.setConfirming(null); },
    onDelete: controller.deleteRecord,
  };
  let content;
  if (controller.view === 'observations') content = <ObservationHistory records={controller.observations} visible={controller.limits.observations} {...common} />;
  else if (controller.view === 'notes') content = <LegacyNoteHistory records={controller.notes} visible={controller.limits.notes} {...common} />;
  else content = <ComparisonHistory records={controller.comparisons} history={history} visible={controller.limits.comparisons} {...common} />;
  const labels: Record<HistoryView, string> = { observations: 'Observations', notes: 'Legacy notes', comparisons: 'Comparisons' };
  return <section className="history-view" aria-live="polite" aria-label={labels[controller.view]}>
    {content}
    <LoadMore visible={controller.limits[controller.view]} total={controller.totals[controller.view]} onLoad={() => { controller.setLimits((current) => ({ ...current, [controller.view]: current[controller.view] + pageSize })); }} />
  </section>;
}

export function DataPanel(props: DataPanelProps) {
  const { history, storageStatus, onClose } = props;
  const controller = useDataPanelController(props);
  const storageDegraded = storageStatus.mode === 'degraded';
  return <div className="modal-backdrop" role="presentation"><section ref={controller.dialogRef} className="data-dialog" role="dialog" aria-modal="true" aria-labelledby="data-title" tabIndex={-1}>
    <button className="icon-button dialog-close" type="button" aria-label="Close local data" disabled={controller.importPending || controller.pendingKey !== null} onClick={onClose}>×</button>
    <p className="section-index">On this device</p><h2 id="data-title">Your local record</h2>
    <p className="plain-language">Catflix has no account, server, analytics, or cloud sync. {history.observations.length} observations, {history.notes.length} legacy notes, and {history.comparisons.length} comparisons are stored in this browser profile.</p>
    <DataActions degraded={storageDegraded} pending={controller.importPending} inputRef={controller.inputRef} onExport={controller.exportFile} />
    <details className="recovery-export"><summary>Recover an oversized record</summary><p>Normal backups allow up to 5 MiB and per-store record limits. A recovery export preserves an existing oversized record, but exceeds normal import limits. Keep this copy before deleting records to restore capacity.</p><button type="button" disabled={storageDegraded || controller.importPending} onClick={() => { void controller.recoveryFile(); }}>Download recovery JSON</button></details>
    <input ref={controller.inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void controller.previewFile(event.target.files?.[0]); }} />
    {controller.preview ? <ImportPreview preview={controller.preview} pending={controller.importPending} onCancel={() => { controller.setPreview(null); controller.setStatus('Import cancelled. Existing local records were not changed.'); }} onConfirm={controller.confirmImport} /> : null}
    <div className="history-tabs" role="group" aria-label="Local record views">
      <button type="button" aria-pressed={controller.view === 'observations'} onClick={() => { controller.setView('observations'); }}>Observations <span>{controller.observations.length}</span></button>
      <button type="button" aria-pressed={controller.view === 'notes'} onClick={() => { controller.setView('notes'); }}>Legacy notes <span>{controller.notes.length}</span></button>
      <button type="button" aria-pressed={controller.view === 'comparisons'} onClick={() => { controller.setView('comparisons'); }}>Comparisons <span>{controller.comparisons.length}</span></button>
    </div>
    <HistoryPane controller={controller} history={history} />
    {controller.status ? <p className="import-status" role="status">{controller.status}</p> : null}
  </section></div>;
}
