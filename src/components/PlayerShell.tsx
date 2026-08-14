import type { RefObject } from "react";
import type { SceneId } from "../content/types";
import type { SessionPlan } from "../simulation/types";
import { PlayerControls } from "./PlayerControls";

const displayTitle: Record<SceneId, string> = {
  "balcony-birds": "Balcony Birds at Dusk",
  "koi-pool": "Koi in Slow Motion",
  "paper-moth": "Paper Moth at Midnight",
  "beetle-under-the-fern": "Beetle Beneath the Fern",
  "red-string": "The Red String Incident",
};

const timecode = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

interface PlayerShellProps {
  plan: SessionPlan;
  stageRef: RefObject<HTMLDivElement | null>;
  elapsed: number;
  phase: string;
  playing: boolean;
  sound: boolean;
  audioCapability: "available" | "awaiting-provenance" | "unavailable";
  sceneMotionMode: "standard" | "low";
  showContactReminder: boolean;
  onTogglePlay: () => void;
  onToggleSound: () => void;
  onChangeMotion: () => void;
  onFinish: (physicalPlaySuggested: boolean) => void;
  onPauseAndObserve: () => void;
  onDismissReminder: () => void;
}

export function PlayerShell({ plan, stageRef, elapsed, phase, playing, sound, audioCapability, sceneMotionMode, showContactReminder, onTogglePlay, onToggleSound, onChangeMotion, onFinish, onPauseAndObserve, onDismissReminder }: PlayerShellProps) {
  const { manifest, variants, playbackMode, setup } = plan;
  return <main className="player-shell encounter-player" aria-labelledby="player-title" data-playback-mode={playbackMode}>
    <header className="player-topbar"><span>CATFLIX / FINITE ENCOUNTER</span><h1 id="player-title">{displayTitle[manifest.id]}</h1><span>{timecode(elapsed)} / {timecode(manifest.finiteDurationMs)}</span></header>
    <div className="session-context" aria-label="Owner session context"><span>{playbackMode === "tablet-touch" ? "Tablet / touch-reactive" : "Television / passive"}</span><span>{setup.observedCat ? `Observation: ${setup.observedCat}` : "Not recording a cat"}</span><span>{setup.roomLightBand} light · {setup.viewingDistanceBand.replace("-", " ")}</span><span>Phase: {phase}</span></div>
    <div className="stage-wrap" data-scene={manifest.id}><div className="simulation-stage" data-scene-motion={sceneMotionMode} data-playback-mode={playbackMode} data-figure-ground={variants.figureGround} ref={stageRef} aria-label={`${displayTitle[manifest.id]} ${playbackMode === "tablet-touch" ? "target-touch encounter" : "passive encounter"}`} /></div>
    <PlayerControls playing={playing} sound={sound} audioCapability={audioCapability} sceneMotionMode={sceneMotionMode} showContactReminder={showContactReminder} onTogglePlay={onTogglePlay} onToggleSound={onToggleSound} onChangeMotion={onChangeMotion} onFinish={onFinish} onPauseAndObserve={onPauseAndObserve} onDismissReminder={onDismissReminder} />
  </main>;
}
