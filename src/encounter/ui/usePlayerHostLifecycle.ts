import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { getSceneScore } from '../../catalogue/model';
import { audioPlaybackMetadata, createEncounterRuntime, encounterAudioMetadata, encounterVisualAssets } from '../runtime';
import type { EncounterRuntime } from '../runtime';
import type { SceneMotionMode, SceneSnapshot } from '../../domain';
import type { SessionPlan } from '../session';
import type { PlayerProps } from './Player.types';

export type PlayerHost = EncounterRuntime;

interface PlayerHostLifecycleOptions extends Pick<PlayerProps, 'onExit'> {
  plan: SessionPlan;
  stageRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<PlayerHost | null>;
  elapsedRef: RefObject<number>;
  displayedSecondRef: RefObject<number>;
  phaseRef: RefObject<SceneSnapshot['phase']>;
  touchesRef: RefObject<number[]>;
  soundRef: RefObject<boolean>;
  sceneMotionMode: SceneMotionMode;
  sound: boolean;
  setElapsed: Dispatch<SetStateAction<number>>;
  setPhase: Dispatch<SetStateAction<SceneSnapshot['phase']>>;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  setShowContactReminder: Dispatch<SetStateAction<boolean>>;
}

interface PlayerProgressState {
  elapsedRef: RefObject<number>;
  displayedSecondRef: RefObject<number>;
  phaseRef: RefObject<SceneSnapshot['phase']>;
  setElapsed: Dispatch<SetStateAction<number>>;
  setPhase: Dispatch<SetStateAction<SceneSnapshot['phase']>>;
}

export const updatePlayerProgress = (state: PlayerProgressState, elapsedMs: number, phase: SceneSnapshot['phase']): void => {
  state.elapsedRef.current = elapsedMs;
  const displayedSecond = Math.floor(elapsedMs / 1_000);
  if (displayedSecond !== state.displayedSecondRef.current) {
    state.displayedSecondRef.current = displayedSecond;
    state.setElapsed(elapsedMs);
  }
  if (phase !== state.phaseRef.current) {
    state.phaseRef.current = phase;
    state.setPhase(phase);
  }
};

export const usePlayerHostLifecycle = (options: PlayerHostLifecycleOptions): void => {
  const { plan, stageRef, hostRef, elapsedRef, displayedSecondRef, phaseRef, touchesRef, soundRef, sceneMotionMode, sound, setElapsed, setPhase, setPlaying, setShowContactReminder, onExit } = options;
  const { manifest, variants, seed, playbackMode } = plan;
  useEffect(() => { soundRef.current = sound; }, [sound, soundRef]);
  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;
    const renderer = new URLSearchParams(window.location.search).get('renderer') === 'canvas' ? 'canvas' : 'auto';
    const progressState = { elapsedRef, displayedSecondRef, phaseRef, setElapsed, setPhase };
    const host = createEncounterRuntime({ container, score: getSceneScore(manifest.id), audio: encounterAudioMetadata(manifest), audioPlayback: audioPlaybackMetadata(manifest), visuals: encounterVisualAssets(manifest), variant: variants, seed, renderer, playbackMode, sceneMotionMode, onProgress: (elapsedMs, _durationMs, phase) => { updatePlayerProgress(progressState, elapsedMs, phase); }, onComplete: () => { onExit({ elapsedMs: elapsedRef.current, complete: true, touchTimestamps: touchesRef.current, soundEnabled: soundRef.current }); }, onTouch: (timestamp) => { touchesRef.current = [...touchesRef.current, timestamp]; }, onReminder: () => { setShowContactReminder(true); }, onVisibilityPause: () => { setPlaying(false); } });
    hostRef.current = host;
    host.start();
    return () => { host.destroy(); hostRef.current = null; };
  }, [displayedSecondRef, elapsedRef, hostRef, manifest, onExit, phaseRef, playbackMode, seed, setElapsed, setPhase, setPlaying, setShowContactReminder, soundRef, stageRef, variants]);
};
