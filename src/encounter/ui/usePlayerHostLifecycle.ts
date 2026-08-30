import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { getSceneScore } from '../../catalogue/model';
import { audioPlaybackMetadata, createEncounterRuntime, encounterAudioMetadata, encounterVisualAssets } from '../runtime';
import type { EncounterRuntime } from '../runtime';
import type { SceneMotionMode } from '../../domain';
import type { SessionPlan } from '../session';
import type { PlayerProps } from './Player.types';

export type PlayerHost = EncounterRuntime;

interface PlayerHostLifecycleOptions extends Pick<PlayerProps, 'onExit'> {
  plan: SessionPlan;
  stageRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<PlayerHost | null>;
  elapsedRef: RefObject<number>;
  touchesRef: RefObject<number[]>;
  soundRef: RefObject<boolean>;
  sceneMotionMode: SceneMotionMode;
  sound: boolean;
  setElapsed: Dispatch<SetStateAction<number>>;
  setPhase: Dispatch<SetStateAction<string>>;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  setShowContactReminder: Dispatch<SetStateAction<boolean>>;
}

export const usePlayerHostLifecycle = (options: PlayerHostLifecycleOptions): void => {
  const { plan, stageRef, hostRef, elapsedRef, touchesRef, soundRef, sceneMotionMode, sound, setElapsed, setPhase, setPlaying, setShowContactReminder, onExit } = options;
  const { manifest, variants, seed, playbackMode } = plan;
  useEffect(() => { soundRef.current = sound; }, [sound, soundRef]);
  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;
    const renderer = new URLSearchParams(window.location.search).get('renderer') === 'canvas' ? 'canvas' : 'auto';
    const host = createEncounterRuntime({ container, score: getSceneScore(manifest.id), audio: encounterAudioMetadata(manifest), audioPlayback: audioPlaybackMetadata(manifest), visuals: encounterVisualAssets(manifest), variant: variants, seed, renderer, playbackMode, sceneMotionMode, onProgress: (elapsedMs) => { elapsedRef.current = elapsedMs; setElapsed(elapsedMs); setPhase(host.snapshot().phase); }, onComplete: () => { onExit({ elapsedMs: manifest.finiteDurationMs, complete: true, touchTimestamps: touchesRef.current, soundEnabled: soundRef.current }); }, onTouch: (timestamp) => { touchesRef.current = [...touchesRef.current, timestamp]; }, onReminder: () => { setShowContactReminder(true); }, onVisibilityPause: () => { setPlaying(false); } });
    hostRef.current = host;
    host.start();
    return () => { host.destroy(); hostRef.current = null; };
  }, [elapsedRef, hostRef, manifest, onExit, playbackMode, seed, setElapsed, setPhase, setPlaying, setShowContactReminder, soundRef, stageRef, variants]);
};
