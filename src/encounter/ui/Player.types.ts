import type { RefObject } from 'react';
import type { SceneMotionMode } from '../../domain';
import type { SessionPlan } from '../session';

export interface PlayerProps {
  plan: SessionPlan;
  onSceneMotionModeChange: (_mode: SceneMotionMode) => void;
  onExit: (_result: { elapsedMs: number; complete: boolean; touchTimestamps: number[]; soundEnabled: boolean; physicalPlaySuggested?: boolean }) => void;
}

export type AudioCapability = 'available' | 'awaiting-provenance' | 'unavailable';

export interface PlayerControlHandlers {
  onTogglePlay: () => void;
  onToggleSound: () => void;
  onChangeMotion: () => void;
  onFinish: (physicalPlaySuggested: boolean) => void;
  onPauseAndObserve: () => void;
  onDismissReminder: () => void;
}

export interface PlayerControlsProps extends PlayerControlHandlers {
  playing: boolean;
  sound: boolean;
  audioCapability: AudioCapability;
  sceneMotionMode: SceneMotionMode;
  showContactReminder: boolean;
}

export interface PlayerRuntimeOptions extends PlayerProps {
  stageRef: RefObject<HTMLDivElement | null>;
}

export interface PlayerRuntime extends PlayerControlHandlers {
  elapsed: number;
  phase: string;
  playing: boolean;
  sound: boolean;
  audioCapability: AudioCapability;
  sceneMotionMode: SceneMotionMode;
  showContactReminder: boolean;
}
