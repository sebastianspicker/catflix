import { ContactReminder } from './ContactReminder';
import type { AudioCapability, PlayerControlsProps } from './Player.types';
import { Icon } from './Icons';

const soundLabel = (audioCapability: AudioCapability, sound: boolean): string => {
  if (audioCapability === 'unavailable') return 'Sound unavailable';
  if (audioCapability === 'awaiting-provenance') return 'Sound awaiting provenance';
  return `Sound ${sound ? 'on' : 'off'}`;
};

export const PlayerControls = (props: PlayerControlsProps) => {
  const { playing, sound, audioCapability, sceneMotionMode, showContactReminder, onTogglePlay, onToggleSound, onChangeMotion, onFinish, onPauseAndObserve, onDismissReminder } = props;
  const soundDisabled = audioCapability !== 'available';
  return <aside className="owner-rail" aria-label="Owner controls">
    <div className="rail-status"><strong>{playing ? 'Encounter running' : 'Encounter paused'}</strong><span>Finite · muted start · no autoplay</span></div>
    <button className="pause-control" type="button" onClick={onTogglePlay}><Icon name={playing ? 'pause' : 'play'} /><strong>{playing ? 'Pause' : 'Resume'}</strong></button>
    <button type="button" aria-pressed={sound} disabled={soundDisabled} onClick={onToggleSound}><strong>{soundLabel(audioCapability, sound)}</strong></button>
    <button type="button" aria-pressed={sceneMotionMode === 'low'} onClick={onChangeMotion}><strong>{sceneMotionMode === 'low' ? 'Low scene motion' : 'Standard scene motion'}</strong></button>
    <button className="end-control" type="button" onClick={() => { onFinish(false); }}><strong>End session</strong></button>
    {showContactReminder ? <ContactReminder onFinish={onFinish} onPauseAndObserve={onPauseAndObserve} onDismissReminder={onDismissReminder} /> : null}
  </aside>;
};
