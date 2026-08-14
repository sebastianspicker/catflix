import { SceneId, VariantSelection } from "../content/types";
import { PlaybackMode, SceneMotionMode, SceneSnapshot } from "./types";

export interface PhaserSimulationHostOptions {
  container: HTMLElement;
  sceneId: SceneId;
  variant: VariantSelection;
  seed: number;
  soundEnabled: boolean;
  playbackMode?: PlaybackMode;
  renderer?: "auto" | "canvas";
  /** Scene choreography is an explicit product setting, not an OS preference. */
  sceneMotionMode?: SceneMotionMode;
  /** Retained for callers that use it for UI accessibility; it never changes scene motion. */
  reducedMotion?: boolean;
  onProgress?: (elapsedMs: number, durationMs: number) => void;
  onComplete?: () => void;
  onTouch?: (timestamp: number) => void;
  onReminder?: (reminder: NonNullable<SceneSnapshot["reminder"]>) => void;
}

export interface PhaserSimulationHost {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;
  setSoundEnabled(enabled: boolean): void;
  setSceneMotionMode(mode: SceneMotionMode): void;
  setReducedMotion(enabled: boolean): void;
  dismissReminder(): void;
  snapshot(): SceneSnapshot;
}
