import { useState, type ReactNode } from 'react';
import type { PlaybackMode, SceneMotionMode, SetupContext } from '../../domain';
import { useModalDialog } from '../../ui/useModalDialog';

interface SafetyGateProps {
  sceneTitle: string;
  sceneDescription: string;
  preview: ReactNode;
  durationMs: number;
  sceneMotionMode: SceneMotionMode;
  onSceneMotionModeChange: (_mode: SceneMotionMode) => void;
  onCancel: () => void;
  onContinue: (_mode: PlaybackMode, _setup: SetupContext) => void;
}

const checks = [
  ['stableDevice', 'Stable device; clear contact area'], ['protectedCables', 'Protected cables'], ['openExit', 'Clear exit'], ['supervised', 'I will stay and supervise'],
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

export function SafetyGate({ sceneTitle, sceneDescription, preview, durationMs, sceneMotionMode, onSceneMotionModeChange, onCancel, onContinue }: SafetyGateProps) {
  const [mode, setMode] = useState<PlaybackMode>('tablet-touch');
  const [confirmed, setConfirmed] = useState<Confirmations>({ stableDevice: false, protectedCables: false, openExit: false, supervised: false });
  const [light, setLight] = useState<SetupContext['roomLightBand']>('dim');
  const [distance, setDistance] = useState<SetupContext['viewingDistanceBand']>('near-screen');
  const [cat, setCat] = useState<SetupContext['observedCat'] | 'not-recording'>('not-recording');
  const dialogRef = useModalDialog<HTMLElement>(onCancel);
  const ready = Object.values(confirmed).every(Boolean);
  const begin = () => {
    if (!ready) return;
    onContinue(mode, { stableDevice: true, protectedCables: true, openExit: true, supervised: true, roomLightBand: light, viewingDistanceBand: distance, ...(cat === 'not-recording' ? {} : { observedCat: cat }) });
  };

  return <div className="modal-backdrop" role="presentation"><section ref={dialogRef} className="safety-gate encounter-setup" role="dialog" aria-modal="true" aria-labelledby="safety-title" tabIndex={-1}>
    <button className="dialog-close" type="button" aria-label="Close preparation" onClick={onCancel}>×</button>
    <p className="section-index">Before {sceneTitle}</p><h2 id="safety-title">Set the room.</h2>
    <p className="setup-duration">One supervised encounter · {durationMs / 1000} seconds</p>
    <div className="setup-layout">
      <div className="setup-preview">
        {preview}
        <h3>{sceneTitle}</h3><p>{sceneDescription}</p><p>Finite · Muted start</p>
        <p className="setup-boundary">Let your cat approach or leave freely. Attention is not evidence of enjoyment or benefit.</p>
      </div>
      <div className="setup-form">
        <fieldset className="mode-choice"><legend>Playback mode</legend><label><input data-autofocus type="radio" name="mode" checked={mode === 'tablet-touch'} onChange={() => { setMode('tablet-touch'); setDistance('near-screen'); }} /><span><strong>Tablet</strong>Target contacts only</span></label><label><input type="radio" name="mode" checked={mode === 'tv-passive'} onChange={() => { setMode('tv-passive'); setDistance('room-display'); }} /><span><strong>Television</strong>Passive viewing</span></label></fieldset>
        <div className="setup-bands"><label>Room light<select value={light} onChange={(event) => { setLight(event.target.value as SetupContext['roomLightBand']); }}><option value="dim">Dim</option><option value="moderate">Moderate</option><option value="bright">Bright</option></select></label><label>Viewing distance<select value={distance} onChange={(event) => { setDistance(event.target.value as SetupContext['viewingDistanceBand']); }}><option value="near-screen">Near screen</option><option value="room-display">Room display</option></select></label><label>Observing<select value={cat} onChange={(event) => { setCat(event.target.value as typeof cat); }}><option value="not-recording">Not recording</option><option>Arri</option><option>Ozzy</option><option>Mika</option></select></label></div>
        <fieldset className="scene-motion-choice"><legend>Scene motion</legend>{(['standard', 'low'] as const).map((value) => <label key={value}><input type="radio" name="scene-motion" checked={sceneMotionMode === value} onChange={() => { onSceneMotionModeChange(value); }} /><span>{value === 'low' ? 'Low' : 'Standard'}</span></label>)}</fieldset>
        <fieldset className="setup-checks"><legend>Before starting</legend>{checks.map(([key, label]) => <label key={key}><input type="checkbox" checked={confirmationValue(confirmed, key)} onChange={(event) => { setConfirmed((current) => updateConfirmation(current, key, event.target.checked)); }} /><span>{label}</span></label>)}</fieldset>
        <p className="setup-boundary">Pause or stop at any time. Stop if your cat leaves, searches persistently, or makes forceful contact.</p>
      </div>
    </div>
    <div className="modal-actions setup-actions"><button className="text-button" type="button" onClick={onCancel}>Back to scenes</button><p>Nothing starts until you choose Start.</p><button className="primary-button" type="button" disabled={!ready} onClick={begin}>Start {durationMs / 1000}-second encounter</button></div>
  </section></div>;
}
