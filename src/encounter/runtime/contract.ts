import type { PlaybackMode, SceneMotionMode, SceneScore, SceneSnapshot, VariantSelection } from "../../domain";
import type { EncounterAudioMetadata } from "../engine/sceneAudio";
import type { AudioPlaybackMetadata } from "./audio";
import type { EncounterVisualAssets } from "./canvasRenderer";

export interface EncounterRuntimeOptions {
  container: HTMLElement;
  score: SceneScore;
  audio: EncounterAudioMetadata | undefined;
  audioPlayback: AudioPlaybackMetadata | undefined;
  visuals: EncounterVisualAssets;
  variant: VariantSelection;
  seed: number;
  playbackMode?: PlaybackMode;
  renderer?: "auto" | "canvas";
  /** Scene choreography is an explicit product setting, not an OS preference. */
  sceneMotionMode?: SceneMotionMode;
  onProgress?: (elapsedMs: number, durationMs: number) => void;
  onComplete?: () => void;
  onTouch?: (timestamp: number) => void;
  onReminder?: (reminder: NonNullable<SceneSnapshot["reminder"]>) => void;
  onVisibilityPause?: () => void;
}

export interface EncounterRuntime {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;
  setSoundEnabled(enabled: boolean): void;
  setSceneMotionMode(mode: SceneMotionMode): void;
  dismissReminder(): void;
  snapshot(): SceneSnapshot;
}
