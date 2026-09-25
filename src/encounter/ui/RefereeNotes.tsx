import { useState } from 'react';
import { LocalDataCapacityError } from '../../local-data/localDataCapacity';
import type { ObservationBehavior, ObservationDraft } from '../../local-data/types';
import { useModalDialog } from '../../ui/useModalDialog';

const behaviors: ObservationBehavior[] = ['approach', 'orientation', 'tracking', 'pouncing', 'disengagement', 're-engagement', 'post-session behavior'];
export type { ObservationDraft } from '../../local-data/types';

interface RefereeNotesProps { sceneTitle: string; observedCat?: 'Arri' | 'Ozzy' | 'Mika' | undefined; touchTimestamps: number[]; completed: boolean; onClose: () => void; onSave: (_draft: ObservationDraft) => Promise<void>; }

export function RefereeNotes({ sceneTitle, observedCat, touchTimestamps, completed, onClose, onSave }: RefereeNotesProps) {
  const [selected, setSelected] = useState<ObservationBehavior[]>([]);
  const [rawNote, setRawNote] = useState('');
  const [endReason, setEndReason] = useState<ObservationDraft['endReason']>(completed ? 'completed' : 'owner-ended');
  const [safetyEvent, setSafetyEvent] = useState('');
  const [physicalPlayHandoff, setPhysicalPlayHandoff] = useState<ObservationDraft['physicalPlayHandoff']>('not-recorded');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useModalDialog<HTMLElement>(() => {
    if (!pending) onClose();
  });
  const toggle = (behavior: ObservationBehavior) => { setSelected((current) => current.includes(behavior) ? current.filter((item) => item !== behavior) : [...current, behavior]); };
  return <div className="modal-backdrop" role="presentation"><section ref={dialogRef} className="notes-dialog observation-dialog" role="dialog" aria-modal="true" aria-labelledby="notes-title" tabIndex={-1}>
    <button className="icon-button dialog-close" type="button" aria-label="Close notes" disabled={pending} onClick={onClose}>×</button><p className="section-index">Local session observation / {sceneTitle}</p><h2 id="notes-title">What did you observe?</h2><p className="plain-language">{observedCat ? `Observed cat: ${observedCat}.` : 'No cat selected.'} Record visible behavior only. No preference, mood, welfare, or engagement score is calculated.</p>
    <div className="observation-fields"><label>End reason<select disabled={pending} value={endReason} onChange={(event) => { setEndReason(event.target.value as ObservationDraft['endReason']); }}><option value="completed">Encounter completed</option><option value="owner-ended">Owner ended</option><option value="cat-left">Cat left</option><option value="safety-stop">Safety stop</option></select></label><label>Physical-play handoff<select disabled={pending} value={physicalPlayHandoff} onChange={(event) => { setPhysicalPlayHandoff(event.target.value as ObservationDraft['physicalPlayHandoff']); }}><option value="not-recorded">Not recorded</option><option value="offered">Offered</option><option value="ignored">Ignored</option><option value="voluntarily-joined">Voluntarily joined</option></select></label><label>Optional safety event<input disabled={pending} value={safetyEvent} onChange={(event) => { setSafetyEvent(event.target.value); }} /></label></div>
    <fieldset className="behavior-list" disabled={pending}><legend>Choose only what you saw</legend>{behaviors.map((behavior) => <label key={behavior}><input type="checkbox" checked={selected.includes(behavior)} onChange={() => { toggle(behavior); }} /><span>{behavior}</span></label>)}</fieldset><label className="raw-note">Your note<textarea disabled={pending} value={rawNote} onChange={(event) => { setRawNote(event.target.value); }} placeholder="What did you observe? Preserve non-response and disengagement." /></label><p className="touch-summary">Accepted target contacts: {touchTimestamps.length}. Background taps are not recorded.</p><label className="acknowledgement"><input type="checkbox" disabled={pending} checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); }} /><span>I confirm this descriptive local record.</span></label>{error ? <p className="import-status" role="alert">{error}</p> : null}<div className="modal-actions"><button className="text-button" type="button" disabled={pending} onClick={onClose}>Finish without saving</button><button className="primary-button" type="button" disabled={!confirmed || pending} onClick={() => { setPending(true); setError(''); void onSave({ endReason, vocabulary: selected, ...(safetyEvent ? { safetyEvent } : {}), physicalPlayHandoff, rawNote }).catch((reason: unknown) => { setError(reason instanceof LocalDataCapacityError ? `${reason.message} Your draft remains here; shorten the note or keep a copy before closing it to manage local records.` : 'Observation was not saved. Your review remains open so you can try again.'); setPending(false); }); }}>{pending ? 'Saving…' : 'Save observation'}</button></div>
  </section></div>;
}
