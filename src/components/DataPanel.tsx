import { useRef, useState } from 'react';
import { useModalDialog } from './useModalDialog';
import type { StorageStatus } from '../storage/types';

interface DataPanelProps {
  onClose: () => void;
  onExport: () => Promise<void>;
  onImport: (_file: File) => Promise<void>;
  countSummary: string;
  storageStatus: StorageStatus;
}

export function DataPanel({ onClose, onExport, onImport, countSummary, storageStatus }: DataPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const dialogRef = useModalDialog<HTMLElement>(onClose);
  const importFile = async (file?: File) => {
    if (!file) return;
    try { await onImport(file); setStatus('Import complete. Local records were restored.'); }
    catch { setStatus('Import failed. Existing local records were not changed. The file may be corrupt or unsupported, or local storage is unavailable.'); }
  };
  const exportFile = async () => {
    try { await onExport(); setStatus('Export complete. A local JSON copy was downloaded.'); }
    catch { setStatus('Export failed. No file was downloaded because local storage is unavailable or could not be read.'); }
  };
  const storageDegraded = storageStatus.mode === 'degraded';
  return (
    <div className="modal-backdrop" role="presentation">
      <section ref={dialogRef} className="data-dialog" role="dialog" aria-modal="true" aria-labelledby="data-title" tabIndex={-1}>
        <button className="icon-button dialog-close" type="button" aria-label="Close local data" onClick={onClose}>×</button>
        <p className="section-index">On this device</p><h2 id="data-title">Your local record</h2>
        <p className="plain-language">Catflix has no account, server, analytics, or cloud sync. {countSummary}</p>
        <div className="data-actions"><button type="button" disabled={storageDegraded} onClick={() => { void exportFile(); }}><strong>Export JSON</strong><span>{storageDegraded ? 'Unavailable for this page. Reload to retry local storage.' : 'Download a lossless, versioned copy.'}</span></button><button type="button" disabled={storageDegraded} onClick={() => { inputRef.current?.click(); }}><strong>Import JSON</strong><span>{storageDegraded ? 'Unavailable for this page. Reload to retry local storage.' : 'Validate and restore a Catflix export.'}</span></button></div>
        <input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void importFile(event.target.files?.[0]); }} />
        {status ? <p className="import-status" role="status">{status}</p> : null}
      </section>
    </div>
  );
}
