import { useEffect, useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react';
import type { SceneId } from '../content/types';
import type { SceneMotionMode, SessionPlan } from '../simulation/types';
import { createPhaserSimulationHost } from '../simulation/PhaserSimulationHost';
import { Icon } from './Icons';

interface PlayerProps {
  plan: SessionPlan;
  onSceneMotionModeChange: (_mode: SceneMotionMode) => void;
  onExit: (_result: { elapsedMs: number; complete: boolean; touchTimestamps: number[]; soundEnabled: boolean; physicalPlaySuggested?: boolean }) => void;
}
const displayTitle: Record<SceneId, string> = { 'balcony-birds': 'Balcony Birds at Dusk', 'koi-pool': 'Koi in Slow Motion', 'paper-moth': 'Paper Moth at Midnight', 'beetle-under-the-fern': 'Beetle Beneath the Fern', 'red-string': 'The Red String Incident' };
const timecode = (milliseconds: number) => { const seconds = Math.max(0, Math.floor(milliseconds / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };

interface PlayerControlsProps {
  playing: boolean;
  sound: boolean;
  soundVariantEnabled: boolean;
  audioEligible: boolean;
  sceneMotionMode: SceneMotionMode;
  onTogglePlay: () => void;
  onToggleSound: () => void;
  onChangeMotion: () => void;
  onStop: () => void;
  reminder: ReactNode;
}

interface ContactReminderProps {
  onStop: () => void;
  onOfferPhysicalPlay: () => void;
  onPauseAndObserve: () => void;
  onDismissReminder: () => void;
}

const ContactReminder = ({ onStop, onOfferPhysicalPlay, onPauseAndObserve, onDismissReminder }: ContactReminderProps) => {
  return <div className="contact-reminder" role="status"><p>Editorial safety cap reached: three accepted contacts within 20 seconds. The scene is resting for 10–12 seconds.</p><div><button type="button" onClick={onPauseAndObserve}>Pause and observe</button><button type="button" onClick={onStop}>End session</button><button type="button" onClick={onOfferPhysicalPlay}>End and offer voluntary physical play</button><button type="button" onClick={onDismissReminder}>Continue quietly</button></div></div>;
};

const PlayerControls = (props: PlayerControlsProps) => {
  const { playing, sound, soundVariantEnabled, audioEligible, sceneMotionMode, onTogglePlay, onToggleSound, onChangeMotion, onStop, reminder } = props;
  return <aside className="owner-rail" aria-label="Owner controls">
    <div className="rail-status"><strong>{playing ? 'Encounter running' : 'Encounter paused'}</strong><span>Finite · muted start · no autoplay</span></div>
    <button className="pause-control" type="button" onClick={onTogglePlay}><Icon name={playing ? 'pause' : 'play'} /><strong>{playing ? 'Pause' : 'Resume'}</strong></button>
    <button type="button" aria-pressed={sound} disabled={!soundVariantEnabled || !audioEligible} onClick={onToggleSound}><strong>{!soundVariantEnabled ? 'Sound unavailable' : !audioEligible ? 'Sound awaiting provenance' : `Sound ${sound ? 'on' : 'off'}`}</strong></button>
    <button type="button" aria-pressed={sceneMotionMode === 'low'} onClick={onChangeMotion}><strong>{sceneMotionMode === 'low' ? 'Low scene motion' : 'Standard scene motion'}</strong></button>
    <button className="end-control" type="button" onClick={() => { onStop(); }}><strong>End session</strong></button>
    {reminder}
  </aside>;
};

const usePauseWhenHidden = (hostRef: RefObject<ReturnType<typeof createPhaserSimulationHost> | null>, setPlaying: Dispatch<SetStateAction<boolean>>): void => {
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      hostRef.current?.pause();
      setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); };
  }, [hostRef, setPlaying]);
};

export function Player({ plan, onSceneMotionModeChange, onExit }: PlayerProps) {
  const { manifest, variants, seed, playbackMode, setup } = plan;
  const stageRef = useRef<HTMLDivElement>(null); const hostRef = useRef<ReturnType<typeof createPhaserSimulationHost> | null>(null); const elapsedRef = useRef(0); const touchesRef = useRef<number[]>([]); const soundRef = useRef(false);
  const [elapsed, setElapsed] = useState(0); const [playing, setPlaying] = useState(true); const [sound, setSound] = useState(false); const [sceneMotionMode, setSceneMotionMode] = useState(plan.sceneMotionMode); const [showContactReminder, setShowContactReminder] = useState(false); const [phase, setPhase] = useState('invitation');
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => {
    const container = stageRef.current; if (!container) return;
    const renderer = new URLSearchParams(window.location.search).get('renderer') === 'canvas' ? 'canvas' : 'auto';
    const host = createPhaserSimulationHost({ container, sceneId: manifest.id, variant: variants, seed, renderer, playbackMode, soundEnabled: false, sceneMotionMode, onProgress: (elapsedMs) => { elapsedRef.current = elapsedMs; setElapsed(elapsedMs); setPhase(host.snapshot().phase); }, onComplete: () => { onExit({ elapsedMs: manifest.finiteDurationMs, complete: true, touchTimestamps: touchesRef.current, soundEnabled: soundRef.current }); }, onTouch: (timestamp) => { touchesRef.current = [...touchesRef.current, timestamp]; }, onReminder: () => { setShowContactReminder(true); } });
    hostRef.current = host; host.start(); return () => { host.destroy(); hostRef.current = null; };
  }, [manifest, onExit, playbackMode, seed, variants]);
  usePauseWhenHidden(hostRef, setPlaying);
  const togglePlay = () => {
    if (playing) hostRef.current?.pause(); else hostRef.current?.resume();
    setPlaying(!playing);
  };
  const toggleSound = () => { if (variants.sound === 'off' || !manifest.audio?.provenance?.some((record) => record.eligible)) return; const next = !sound; hostRef.current?.setSoundEnabled(next); setSound(next); };
  const changeMotion = () => { const next = sceneMotionMode === 'low' ? 'standard' : 'low'; setSceneMotionMode(next); hostRef.current?.setSceneMotionMode(next); onSceneMotionModeChange(next); };
  const finish = (physicalPlaySuggested: boolean) => { hostRef.current?.stop(); onExit({ elapsedMs: elapsedRef.current, complete: false, touchTimestamps: touchesRef.current, soundEnabled: sound, physicalPlaySuggested }); };
  const stop = () => { finish(false); };
  const offerPhysicalPlay = () => { finish(true); };
  const dismissReminder = () => { hostRef.current?.dismissReminder(); setShowContactReminder(false); };
  const audioEligible = Boolean(manifest.audio?.provenance?.some((record) => record.eligible));
  const soundVariantEnabled = variants.sound !== 'off';
  const pauseAndObserve = () => { hostRef.current?.pause(); setPlaying(false); dismissReminder(); };

  return renderPlayer({
    plan, elapsed, phase, playing, sound,
    soundVariantEnabled, audioEligible, sceneMotionMode, stageRef,
    onTogglePlay: togglePlay, onToggleSound: toggleSound,
    onChangeMotion: changeMotion, onStop: stop,
    reminder: showContactReminder ? <ContactReminder onStop={stop} onOfferPhysicalPlay={offerPhysicalPlay} onPauseAndObserve={pauseAndObserve} onDismissReminder={dismissReminder} /> : null,
  });
}

type PlayerRenderData = Pick<PlayerControlsProps, "playing" | "sound" | "soundVariantEnabled" | "audioEligible" | "sceneMotionMode" | "onTogglePlay" | "onToggleSound" | "onChangeMotion" | "onStop" | "reminder"> & {
  plan: SessionPlan;
  elapsed: number;
  phase: string;
  stageRef: RefObject<HTMLDivElement | null>;
};

const renderPlayer = (data: PlayerRenderData) => {
  const { plan, elapsed, phase, stageRef } = data;
  const { manifest, variants, playbackMode, setup } = plan;
  return <section className="player-shell encounter-player" role="dialog" aria-modal="true" aria-labelledby="player-title" data-playback-mode={playbackMode}>
    <header className="player-topbar"><span>CATFLIX / FINITE ENCOUNTER</span><h1 id="player-title">{displayTitle[manifest.id]}</h1><span>{timecode(elapsed)} / {timecode(manifest.finiteDurationMs)}</span></header>
    <div className="session-context" aria-label="Owner session context"><span>{playbackMode === 'tablet-touch' ? 'Tablet / touch-reactive' : 'Television / passive'}</span><span>{setup.observedCat ? `Observation: ${setup.observedCat}` : 'Not recording a cat'}</span><span>{setup.roomLightBand} light · {setup.viewingDistanceBand.replace('-', ' ')}</span><span>Phase: {phase}</span></div>
    <div className="stage-wrap" data-scene={manifest.id}><div className="simulation-stage" data-scene-motion={data.sceneMotionMode} data-playback-mode={playbackMode} data-figure-ground={variants.figureGround} ref={stageRef} aria-label={`${displayTitle[manifest.id]} ${playbackMode === 'tablet-touch' ? 'target-touch encounter' : 'passive encounter'}`} /></div>
    <PlayerControls playing={data.playing} sound={data.sound} soundVariantEnabled={data.soundVariantEnabled} audioEligible={data.audioEligible} sceneMotionMode={data.sceneMotionMode} onTogglePlay={data.onTogglePlay} onToggleSound={data.onToggleSound} onChangeMotion={data.onChangeMotion} onStop={data.onStop} reminder={data.reminder} />
  </section>;
};
