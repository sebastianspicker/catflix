import { useRef, useState } from 'react';
import type { ContentManifest } from '../../catalogue/model';
import type { SceneMotionMode } from '../../domain';
import type { AudioCapability, PlayerRuntime, PlayerRuntimeOptions } from './Player.types';
import { type PlayerHost, usePlayerHostLifecycle } from './usePlayerHostLifecycle';


const audioCapabilityFor = (manifest: ContentManifest, soundVariant: 'off' | 'on'): AudioCapability => {
  if (soundVariant === 'off') return 'unavailable';
  return manifest.audio?.provenance?.some((record) => record.eligible) ? 'available' : 'awaiting-provenance';
};

export const usePlayerRuntime = ({ plan, stageRef, onSceneMotionModeChange, onExit }: PlayerRuntimeOptions): PlayerRuntime => {
  const { manifest, variants } = plan;
  const hostRef = useRef<PlayerHost | null>(null);
  const elapsedRef = useRef(0);
  const touchesRef = useRef<number[]>([]);
  const soundRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [sound, setSound] = useState(false);
  const [sceneMotionMode, setSceneMotionMode] = useState(plan.sceneMotionMode);
  const [showContactReminder, setShowContactReminder] = useState(false);
  const [phase, setPhase] = useState('invitation');
  const audioCapability = audioCapabilityFor(manifest, variants.sound);

  usePlayerHostLifecycle({ plan, stageRef, hostRef, elapsedRef, touchesRef, soundRef, sceneMotionMode, sound, setElapsed, setPhase, setPlaying, setShowContactReminder, onExit });

  const onTogglePlay = () => {
    if (playing) hostRef.current?.pause(); else hostRef.current?.resume();
    setPlaying(!playing);
  };
  const onToggleSound = () => {
    if (audioCapability !== 'available') return;
    const next = !sound;
    hostRef.current?.setSoundEnabled(next);
    setSound(next);
  };
  const onChangeMotion = () => {
    const next: SceneMotionMode = sceneMotionMode === 'low' ? 'standard' : 'low';
    setSceneMotionMode(next);
    hostRef.current?.setSceneMotionMode(next);
    onSceneMotionModeChange(next);
  };
  const onFinish = (physicalPlaySuggested: boolean) => {
    hostRef.current?.stop();
    onExit({ elapsedMs: elapsedRef.current, complete: false, touchTimestamps: touchesRef.current, soundEnabled: sound, physicalPlaySuggested });
  };
  const onDismissReminder = () => {
    hostRef.current?.dismissReminder();
    setShowContactReminder(false);
  };
  const onPauseAndObserve = () => {
    hostRef.current?.pause();
    setPlaying(false);
    onDismissReminder();
  };

  return { elapsed, phase, playing, sound, audioCapability, sceneMotionMode, showContactReminder, onTogglePlay, onToggleSound, onChangeMotion, onFinish, onPauseAndObserve, onDismissReminder };
};
