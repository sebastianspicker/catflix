import { useState } from 'react';
import type { PlaybackMode, SetupContext } from '../simulation/types';
import { useModalDialog } from './useModalDialog';

interface SafetyGateProps {
  sceneTitle: string;
  onCancel: () => void;
  onContinue: (_mode: PlaybackMode, _setup: SetupContext) => void;
}

const checks = [
  ['stableDevice', 'Stable device'], ['protectedCables', 'Protected cables'], ['openExit', 'Open exit'], ['supervised', 'Continuous supervision'],
] as const;
type CheckKey = (typeof checks)[number][0];
type Confirmations = Record<CheckKey, boolean>;

function confirmationValue(confirmations: Confirmations, key: CheckKey): boolean {
  if (key === 'stableDevice') return confirmations.stableDevice;
  if (key === 'protectedCables') return confirmations.protectedCables;
  if (key === 'openExit') return confirmations.openExit;
  return confirmations.supervised;
}

function updateConfirmation(confirmations: Confirmations, key: CheckKey, checked: boolean): Confirmations {
  if (key === 'stableDevice') return { ...confirmations, stableDevice: checked };
  if (key === 'protectedCables') return { ...confirmations, protectedCables: checked };
  if (key === 'openExit') return { ...confirmations, openExit: checked };
  return { ...confirmations, supervised: checked };
}

export function SafetyGate({ sceneTitle, onCancel, onContinue }: SafetyGateProps) {
  const [mode, setMode] = useState<PlaybackMode>('tablet-touch');
  const [confirmed, setConfirmed] = useState<Confirmations>({ stableDevice: false, protectedCables: false, openExit: false, supervised: false });
  const [light, setLight] = useState<SetupContext['roomLightBand']>('dim');
  const [distance, setDistance] = useState<SetupContext['viewingDistanceBand']>('near-screen');
  const [cat, setCat] = useState<SetupContext['observedCat'] | 'not-recording'>('not-recording');
  const dialogRef = useModalDialog<HTMLElement>(onCancel);
  const ready = Object.values(confirmed).every(Boolean);
  const begin = () => {
    onContinue(mode, { stableDevice: true, protectedCables: true, openExit: true, supervised: true, roomLightBand: light, viewingDistanceBand: distance, ...(cat === 'not-recording' ? {} : { observedCat: cat }) });
  };

  return <div className="modal-backdrop" role="presentation"><section ref={dialogRef} className="safety-gate encounter-setup" role="dialog" aria-modal="true" aria-labelledby="safety-title" tabIndex={-1}>
    <p className="section-index">Before {sceneTitle} / finite encounter</p><h2 id="safety-title">Choose the screen.<br />Set the room.</h2>
    <fieldset className="mode-choice"><legend>1 / Playback mode</legend><label><input data-autofocus type="radio" name="mode" checked={mode === 'tablet-touch'} onChange={() => { setMode('tablet-touch'); setDistance('near-screen'); }} /><span><strong>Tablet</strong>Touch-reactive, target contacts only</span></label><label><input type="radio" name="mode" checked={mode === 'tv-passive'} onChange={() => { setMode('tv-passive'); setDistance('room-display'); }} /><span><strong>Television</strong>Passive authored choreography</span></label></fieldset>
    <fieldset className="setup-checks"><legend>2 / Confirm before starting muted</legend>{checks.map(([key, label]) => <label key={key}><input type="checkbox" checked={confirmationValue(confirmed, key)} onChange={(event) => { setConfirmed((current) => updateConfirmation(current, key, event.target.checked)); }} /><span>{label}</span></label>)}</fieldset>
    <div className="setup-bands"><label>Room light<select value={light} onChange={(event) => { setLight(event.target.value as SetupContext['roomLightBand']); }}><option value="dim">Dim</option><option value="moderate">Moderate</option><option value="bright">Bright</option></select></label><label>Viewing distance<select value={distance} onChange={(event) => { setDistance(event.target.value as SetupContext['viewingDistanceBand']); }}><option value="near-screen">Near screen</option><option value="room-display">Room display</option></select></label><label>Observation<select value={cat} onChange={(event) => { setCat(event.target.value as typeof cat); }}><option value="not-recording">Not recording</option><option>Arri</option><option>Ozzy</option><option>Mika</option></select></label></div>
    <p className="setup-boundary">Keep the cat free to approach or leave. Stop for persistent searching, frustration, or forceful contact. Attention is not evidence of enjoyment or benefit.</p>
    <div className="modal-actions"><button className="text-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="button" disabled={!ready} onClick={begin}>Begin muted</button></div>
  </section></div>;
}
