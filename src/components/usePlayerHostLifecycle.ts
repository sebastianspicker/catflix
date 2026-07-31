import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { createPhaserSimulationHost } from '../simulation/PhaserSimulationHost';
import type { SceneMotionMode, SessionPlan } from '../simulation/types';
import type { PlayerProps } from './Player.types';

export type PlayerHost = ReturnType<typeof createPhaserSimulationHost>;

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
    const host = createPhaserSimulationHost({ container, sceneId: manifest.id, variant: variants, seed, renderer, playbackMode, soundEnabled: false, sceneMotionMode, onProgress: (elapsedMs) => { elapsedRef.current = elapsedMs; setElapsed(elapsedMs); setPhase(host.snapshot().phase); }, onComplete: () => { onExit({ elapsedMs: manifest.finiteDurationMs, complete: true, touchTimestamps: touchesRef.current, soundEnabled: soundRef.current }); }, onTouch: (timestamp) => { touchesRef.current = [...touchesRef.current, timestamp]; }, onReminder: () => { setShowContactReminder(true); } });
    hostRef.current = host;
    host.start();
    return () => { host.destroy(); hostRef.current = null; };
  }, [elapsedRef, hostRef, manifest, onExit, playbackMode, seed, setElapsed, setPhase, setShowContactReminder, soundRef, stageRef, variants]);
  useEffect(() => {
    const pauseWhenHidden = () => {
      if (!document.hidden) return;
      hostRef.current?.pause();
      setPlaying(false);
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => { document.removeEventListener('visibilitychange', pauseWhenHidden); };
  }, [hostRef, setPlaying]);
};
