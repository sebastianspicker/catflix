import type { SceneMotionMode, SceneSnapshot } from "../../domain";
import { createSceneSimulationEngine } from "../engine/sceneSimulation";
import { createSceneAudioPlayer } from "./audio";
import { createCanvasSimulationRenderer } from "./canvasRenderer";
import type { EncounterRuntime, EncounterRuntimeOptions } from "./contract";
import { createPhaserSimulationBootstrap, type PhaserSimulationBootstrap } from "./phaserBootstrap";
import { cancelFrame, clampSimulationDelta, createFallbackCanvas, scheduleFrame } from "./runtimeHelpers";

type Simulation = ReturnType<typeof createSceneSimulationEngine>;
type AudioPlayer = ReturnType<typeof createSceneAudioPlayer>;

interface RuntimePreferences {
  sceneMotionMode: SceneMotionMode;
  playbackMode: "tablet-touch" | "tv-passive";
}

/** Browser-only owner of lifecycle, visibility, pointer translation, renderers, and media. */
export function createEncounterRuntime(options: EncounterRuntimeOptions): EncounterRuntime {
  return new EncounterRuntimeController(options);
}

class EncounterRuntimeController implements EncounterRuntime {
  private readonly preferences: RuntimePreferences;
  private readonly simulation: Simulation;
  private readonly canvas = createFallbackCanvas();
  private readonly canvasRenderer;
  private readonly audioPlayer: AudioPlayer;
  private phaser: PhaserSimulationBootstrap | undefined;
  private phaserAbort: AbortController | undefined;
  private running = false;
  private paused = false;
  private destroyed = false;
  private fallbackActive = false;
  private fallbackGeneration = 0;
  private completeNotified = false;
  private reminderId: string | undefined;
  private lastTime = 0;
  private frameId: number | undefined;
  private soundEnabled = false;

  constructor(private readonly options: EncounterRuntimeOptions) {
    this.preferences = {
      sceneMotionMode: options.sceneMotionMode ?? "standard",
      playbackMode: options.playbackMode ?? "tablet-touch",
    };
    this.simulation = createSceneSimulationEngine(options.score, options.audio, options.variant, options.seed, this.preferences);
    this.canvasRenderer = createCanvasSimulationRenderer({
      canvas: this.canvas,
      score: options.score,
      variant: options.variant,
      visuals: options.visuals,
    });
    this.audioPlayer = createSceneAudioPlayer(options.audioPlayback);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    if (this.preferences.playbackMode === "tablet-touch") this.canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    if (this.phaser) this.phaser.resume();
    else {
      this.startFallback();
      this.startPhaserUpgrade();
    }
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.suspendFallbackLoop();
    this.silence();
    this.phaser?.pause();
  }

  resume(): void {
    if (!this.running || !this.paused || this.simulation.snapshot().complete) return;
    this.paused = false;
    // Resume is an owner click; re-resume a context the browser suspended while hidden or paused.
    if (this.soundEnabled) void this.audioPlayer.enable();
    if (this.phaser) this.phaser.resume();
    else this.resumeFallbackLoop();
  }

  stop(): void {
    this.paused = true;
    this.running = false;
    this.stopFallback();
    this.phaserAbort?.abort();
    this.phaserAbort = undefined;
    this.silence();
    this.phaser?.pause();
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.audioPlayer.destroy();
    this.phaser?.destroy();
    this.phaser = undefined;
    this.canvasRenderer.destroy();
    this.canvas.remove();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    // Enabling must happen synchronously in this call so iOS/Safari accepts the owner's gesture.
    if (enabled) void this.audioPlayer.enable();
    else this.silence();
  }

  setSceneMotionMode(mode: SceneMotionMode): void {
    this.preferences.sceneMotionMode = mode;
  }

  dismissReminder(): void {
    this.reminderId = undefined;
    this.simulation.dismissReminder();
  }

  snapshot(): SceneSnapshot {
    return this.simulation.snapshot();
  }

  private readonly handleTouch = (x: number, y: number): void => {
    if (this.preferences.playbackMode === "tv-passive") return;
    const response = this.simulation.touch({ x, y });
    if (!response.accepted) return;
    this.options.container.dataset.lastContactResponse = response.response ?? "accepted";
    this.options.container.dataset.lastContactAt = String(performance.now());
    this.options.onTouch?.(this.simulation.snapshot().elapsedMs);
    this.options.container.dispatchEvent(new CustomEvent("catflix-contact-response", { ...(response.response !== undefined ? { detail: response.response } : {}) }));
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const bounds = this.canvas.getBoundingClientRect();
    this.handleTouch(
      (event.clientX - bounds.left) / Math.max(bounds.width, 1),
      (event.clientY - bounds.top) / Math.max(bounds.height, 1),
    );
  };

  private advance(delta: number): SceneSnapshot {
    const state = this.simulation.advance(clampSimulationDelta(delta));
    this.publishState(state);
    this.canvasRenderer.render(state, this.preferences.sceneMotionMode);
    this.audioPlayer.play(state.soundEvents, this.soundEnabled);
    this.notifyCallbacks(state);
    return state;
  }

  private publishState(state: SceneSnapshot): void {
    const primaryActor = state.actors.find((actor) => actor.visible);
    if (primaryActor) {
      this.options.container.dataset.actorX = String(primaryActor.x);
      this.options.container.dataset.actorY = String(primaryActor.y);
    }
    this.options.container.dataset.encounterPhase = state.phase;
  }

  private notifyCallbacks(state: SceneSnapshot): void {
    if (state.reminder && state.reminder.id !== this.reminderId) {
      this.reminderId = state.reminder.id;
      this.options.onReminder?.(state.reminder);
    }
    this.options.onProgress?.(state.elapsedMs, state.durationMs, state.phase);
    if (!state.complete || this.completeNotified) return;
    this.completeNotified = true;
    this.pause();
    this.options.onComplete?.();
  }

  private readonly phaserFrame = (delta: number): void => {
    if (!this.running || this.paused || !this.phaser) return;
    const state = this.advance(delta);
    if (this.running && !this.paused && this.phaser) this.phaser.render(state);
  };

  private readonly fallbackFrame = (now: number, generation: number): void => {
    if (!this.running || !this.fallbackActive || generation !== this.fallbackGeneration) return;
    this.frameId = undefined;
    if (this.paused) return;
    this.advance(clampSimulationDelta(now - this.lastTime));
    if (!this.running || this.paused || !this.fallbackActive || generation !== this.fallbackGeneration) return;
    this.lastTime = now;
    this.frameId = scheduleFrame((nextNow) => { this.fallbackFrame(nextNow, generation); });
  };

  private startFallback(): void {
    if (!this.canvas.isConnected) this.options.container.appendChild(this.canvas);
    this.canvasRenderer.render(this.simulation.snapshot(), this.preferences.sceneMotionMode);
    this.fallbackActive = true;
    this.resumeFallbackLoop();
  }

  private stopFallback(): void {
    this.fallbackActive = false;
    this.suspendFallbackLoop();
  }

  private suspendFallbackLoop(): void {
    this.fallbackGeneration += 1;
    if (this.frameId === undefined) return;
    cancelFrame(this.frameId);
    this.frameId = undefined;
  }

  private resumeFallbackLoop(): void {
    if (!this.running || this.paused || !this.fallbackActive || this.frameId !== undefined) return;
    const generation = ++this.fallbackGeneration;
    this.lastTime = performance.now();
    this.frameId = scheduleFrame((now) => { this.fallbackFrame(now, generation); });
  }

  private startPhaserUpgrade(): void {
    if (!this.canStartPhaserUpgrade()) return;
    const abort = new AbortController();
    this.phaserAbort = abort;
    void createPhaserSimulationBootstrap({
      container: this.options.container,
      variant: this.options.variant,
      score: this.options.score,
      visuals: this.options.visuals,
      acceptsTouch: this.preferences.playbackMode === "tablet-touch",
      onTouch: this.handleTouch,
      sceneMotionMode: () => this.preferences.sceneMotionMode,
      initialState: () => this.simulation.snapshot(),
      onFrame: this.phaserFrame,
      signal: abort.signal,
    }).then((loadedPhaser) => {
      this.completePhaserUpgrade(loadedPhaser, abort);
    }).catch(() => {
      if (this.phaserAbort === abort) this.phaserAbort = undefined;
    });
  }

  private canStartPhaserUpgrade(): boolean {
    return this.options.renderer !== "canvas"
      && this.phaser === undefined
      && this.phaserAbort === undefined
      && !this.destroyed;
  }

  private completePhaserUpgrade(loadedPhaser: PhaserSimulationBootstrap, abort: AbortController): void {
    if (this.phaserAbort === abort) this.phaserAbort = undefined;
    if (abort.signal.aborted || !this.running || this.destroyed) {
      loadedPhaser.destroy();
      return;
    }
    this.phaser = loadedPhaser;
    this.stopFallback();
    this.canvas.remove();
    if (this.paused) this.phaser.pause();
  }

  private silence(): void {
    this.audioPlayer.silence();
  }

  private readonly onVisibilityChange = (): void => {
    if (!document.hidden) return;
    this.pause();
    this.options.onVisibilityPause?.();
  };
}
