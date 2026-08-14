import { getContentManifest } from "../content/registry";
import { createSceneSimulation } from "./definitions";
import { createCanvasSimulationRenderer } from "./simulationCanvasRenderer";
import type { PhaserSimulationHost, PhaserSimulationHostOptions } from "./simulationHostContract";
import { createSceneAudioPlayer } from "./simulationHostAudio";
import { cancelFrame, clampSimulationDelta, createFallbackCanvas, scheduleFrame } from "./simulationHostRuntimeHelpers";
import { createPhaserSimulationBootstrap, type PhaserSimulationBootstrap } from "./simulationPhaserBootstrap";
import { poseSheetFor } from "./simulationRenderGeometry";
import { SceneMotionMode, SceneSnapshot } from "./types";

/** Owns browser lifecycle and state effects while renderer modules own their drawing details. */
export function createSimulationHostRuntime(options: PhaserSimulationHostOptions): PhaserSimulationHost {
  // OS reduced-motion is deliberately not passed into the simulation. The explicit scene setting remains stable.
  const preferences = { sceneMotionMode: options.sceneMotionMode ?? "standard", playbackMode: options.playbackMode ?? "tablet-touch" };
  const simulation = createSceneSimulation(options.sceneId, options.variant, options.seed, preferences);
  const manifest = getContentManifest(options.sceneId);
  const canvas = createFallbackCanvas();
  const canvasRenderer = createCanvasSimulationRenderer({ canvas, sceneId: options.sceneId, variant: options.variant, backgroundUrl: manifest.visuals.backgroundPlateUrl, poseSheetPath: poseSheetFor(options.sceneId).path });
  let phaser: PhaserSimulationBootstrap | undefined;
  let phaserAbort: AbortController | undefined;
  let running = false;
  let paused = false;
  let destroyed = false;
  let fallbackActive = false;
  let fallbackGeneration = 0;
  let completeNotified = false;
  let reminderId: string | undefined;
  let lastTime = 0;
  let frameId = 0;
  let soundEnabled = false; // Audio begins muted even when the variant allows it.
  const audioPlayer = createSceneAudioPlayer(manifest);

  const handleTouch = (x: number, y: number): void => {
    if (preferences.playbackMode === "tv-passive") return;
    const response = simulation.touch({ x, y });
    if (!response.accepted) return;
    options.container.dataset.lastContactResponse = response.response ?? "accepted";
    options.container.dataset.lastContactAt = String(performance.now());
    options.onTouch?.(simulation.snapshot().elapsedMs);
    options.container.dispatchEvent(new CustomEvent("catflix-contact-response", { detail: response.response }));
  };
  const onPointerDown = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();
    handleTouch((event.clientX - bounds.left) / Math.max(bounds.width, 1), (event.clientY - bounds.top) / Math.max(bounds.height, 1));
  };
  const tick = (delta: number): SceneSnapshot => {
    const state = simulation.advance(clampSimulationDelta(delta));
    const primaryActor = state.actors.find((actor) => actor.visible);
    if (primaryActor) { options.container.dataset.actorX = String(primaryActor.x); options.container.dataset.actorY = String(primaryActor.y); }
    options.container.dataset.encounterPhase = state.phase;
    canvasRenderer.render(state, preferences.sceneMotionMode);
    audioPlayer.play(state.soundEvents, soundEnabled);
    if (state.reminder && state.reminder.id !== reminderId) { reminderId = state.reminder.id; options.onReminder?.(state.reminder); }
    options.onProgress?.(state.elapsedMs, state.durationMs);
    if (state.complete && !completeNotified) { completeNotified = true; pause(); options.onComplete?.(); }
    return state;
  };
  const phaserFrame = (delta: number): void => {
    if (running && !paused && phaser) phaser.render(tick(delta));
  };
  const fallbackFrame = (now: number, generation: number): void => {
    if (!running || !fallbackActive || generation !== fallbackGeneration) return;
    if (!paused) tick(lastTime === 0 ? 0 : clampSimulationDelta(now - lastTime));
    lastTime = now;
    frameId = scheduleFrame((nextNow) => fallbackFrame(nextNow, generation));
  };
  const startFallback = (): void => {
    if (!canvas.isConnected) options.container.appendChild(canvas);
    canvasRenderer.render(simulation.snapshot(), preferences.sceneMotionMode);
    fallbackActive = true;
    const generation = ++fallbackGeneration;
    lastTime = performance.now();
    frameId = scheduleFrame((now) => fallbackFrame(now, generation));
  };
  const stopFallback = (): void => {
    fallbackActive = false;
    fallbackGeneration += 1;
    cancelFrame(frameId);
  };
  const startPhaserUpgrade = (): void => {
    if (options.renderer === "canvas" || phaser || phaserAbort || destroyed) return;
    const abort = new AbortController();
    phaserAbort = abort;
    void createPhaserSimulationBootstrap({
      container: options.container,
      sceneId: options.sceneId,
      variant: options.variant,
      backgroundUrl: manifest.visuals.backgroundPlateUrl,
      poseSheetPath: poseSheetFor(options.sceneId).path,
      acceptsTouch: preferences.playbackMode === "tablet-touch",
      onTouch: handleTouch,
      sceneMotionMode: (): SceneMotionMode => preferences.sceneMotionMode,
      initialState: (): SceneSnapshot => simulation.snapshot(),
      onFrame: phaserFrame,
      signal: abort.signal,
    }).then((loadedPhaser) => {
      phaserAbort = undefined;
      if (abort.signal.aborted || !running || destroyed) { loadedPhaser.destroy(); return; }
      phaser = loadedPhaser;
      stopFallback();
      canvas.remove();
      if (paused) phaser.pause();
    }).catch(() => {
      if (phaserAbort === abort) phaserAbort = undefined;
      // Canvas remains mounted and advancing if Phaser cannot load or start.
    });
  };
  const start = (): void => {
    if (running) return;
    running = true;
    paused = false;
    if (phaser) phaser.resume();
    else {
      startFallback();
      startPhaserUpgrade();
    }
  };
  const silence = (): void => audioPlayer.silence();
  const pause = (): void => { paused = true; silence(); phaser?.pause(); };
  const resume = (): void => { if (!running || simulation.snapshot().complete) return; paused = false; lastTime = performance.now(); phaser?.resume(); };
  const stop = (): void => { paused = true; running = false; stopFallback(); phaserAbort?.abort(); phaserAbort = undefined; silence(); phaser?.pause(); };
  const destroy = (): void => {
    destroyed = true;
    stop();
    phaser?.destroy();
    phaser = undefined;
    canvas.remove();
    canvas.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
  const onVisibilityChange = (): void => { if (document.hidden) pause(); };
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (preferences.playbackMode === "tablet-touch") canvas.addEventListener("pointerdown", onPointerDown);

  return {
    start,
    pause,
    resume,
    stop,
    destroy,
    setSoundEnabled: (enabled: boolean): void => { soundEnabled = enabled; if (!enabled) silence(); },
    setSceneMotionMode: (mode: SceneMotionMode): void => { preferences.sceneMotionMode = mode; },
    setReducedMotion: (enabled: boolean): void => { void enabled; /* OS UI preference does not alter authored choreography. */ },
    dismissReminder: (): void => { reminderId = undefined; simulation.dismissReminder(); },
    snapshot: (): SceneSnapshot => simulation.snapshot(),
  };
}
