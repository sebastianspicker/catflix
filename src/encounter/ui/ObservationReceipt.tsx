import type { SessionObservation, StorageStatus } from '../../local-data/types';
import { CatDoodle } from '../../ui/CatDoodle';
import { useModalDialog } from '../../ui/useModalDialog';

interface ObservationReceiptProps {
  observation: SessionObservation;
  sceneTitle: string;
  storageStatus: StorageStatus;
  onClose: () => void;
  onViewHistory: () => void;
}

const endReasons = { completed: 'Completed', 'owner-ended': 'Owner ended', 'cat-left': 'Cat left', 'safety-stop': 'Safety stop' } as const;

export function ObservationReceipt({ observation, sceneTitle, storageStatus, onClose, onViewHistory }: ObservationReceiptProps) {
  const dialogRef = useModalDialog<HTMLElement>(onClose);
  const persistent = storageStatus.mode === 'persistent';
  const seconds = Math.floor(observation.elapsedMs / 1000);
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <div className="modal-backdrop"><section ref={dialogRef} className="notes-dialog observation-receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title" tabIndex={-1}>
    <p className="section-index">Your observation</p>
    <h2 id="receipt-title">{persistent ? 'Observation saved' : 'Observation kept temporarily'}</h2>
    <p className="receipt-status" role="status">{persistent ? 'Stored in this browser.' : 'Local storage is unavailable. This record may be lost when you close or reload this page.'}</p>
    <dl className="receipt-record">
      <div><dt>Cat</dt><dd>{observation.observedCat ?? 'Not recorded'}</dd></div>
      <div><dt>Scene</dt><dd>{sceneTitle}</dd></div>
      <div><dt>Ending</dt><dd>{endReasons[observation.endReason]} · {elapsed}</dd></div>
      <div><dt>Observed</dt><dd>{observation.vocabulary.length ? observation.vocabulary.join(', ') : 'No behaviors recorded'}</dd></div>
      <div><dt>Your note</dt><dd className="receipt-note">{observation.rawNote || 'No note recorded.'}</dd></div>
      <div><dt>Context</dt><dd>{observation.playbackMode === 'tablet-touch' ? 'Tablet' : 'Television'} · {observation.roomLightBand} light</dd></div>
    </dl>
    <div className="receipt-actions"><button data-autofocus className="primary-button" type="button" onClick={onClose}>Done</button><button className="text-button" type="button" onClick={onViewHistory}>View observations</button></div>
    {persistent ? <div className="receipt-stamp"><CatDoodle pose="loaf" /><span>Filed locally.</span></div> : null}
  </section></div>;
}
