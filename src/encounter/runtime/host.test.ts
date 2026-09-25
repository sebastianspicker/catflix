import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSceneScore } from "../../catalogue/model";
import { defaultSessionVariant } from "../../domain";
import type { EncounterRuntimeOptions } from "./contract";
import { createEncounterRuntime } from "./host";
import type { PhaserSimulationBootstrap } from "./phaserBootstrap";

type PhaserBootstrapFactory = (options: { signal: AbortSignal }) => Promise<PhaserSimulationBootstrap>;
const phaserBootstrapMock = vi.hoisted(() => ({ create: vi.fn<PhaserBootstrapFactory>() }));
vi.mock("./phaserBootstrap", () => ({ createPhaserSimulationBootstrap: phaserBootstrapMock.create }));

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalImage = Object.getOwnPropertyDescriptor(globalThis, "Image");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

interface CanvasDouble {
  element: HTMLCanvasElement;
  listeners: Map<string, Set<EventListener>>;
  connected(): boolean;
}

interface RuntimeEnvironment {
  container: HTMLElement;
  documentListeners: Map<string, Set<EventListener>>;
  canvases: CanvasDouble[];
  cancelledFrameCount(): number;
  pendingFrameCount(): number;
  requestedFrameCount(): number;
  runNextFrame(now?: number): void;
  setHidden(hidden: boolean): void;
}

const restoreGlobal = (name: string, descriptor: PropertyDescriptor | undefined): void => {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
};

beforeEach(() => { phaserBootstrapMock.create.mockReset(); });

afterEach(() => {
  vi.restoreAllMocks();
  restoreGlobal("document", originalDocument);
  restoreGlobal("Image", originalImage);
  restoreGlobal("window", originalWindow);
});

function installRuntimeEnvironment(): RuntimeEnvironment {
  const documentListeners = new Map<string, Set<EventListener>>();
  const canvases: CanvasDouble[] = [];
  const frames = new Map<number, FrameRequestCallback>();
  let cancelledFrames = 0;
  let frameId = 0;
  let frameTime = performance.now();
  let requestedFrames = 0;
  let hidden = false;
  const containerDouble = {
    dataset: {} as DOMStringMap,
    appendChild: (canvas: HTMLCanvasElement) => {
      Object.assign(canvas, { isConnected: true });
      return canvas;
    },
    dispatchEvent: () => true,
  };
  const documentDouble = {
    get hidden() { return hidden; },
    createElement: () => {
      const canvas = createCanvasDouble();
      canvases.push(canvas);
      return canvas.element;
    },
    addEventListener: (type: string, listener: EventListener) => { addListener(documentListeners, type, listener); },
    removeEventListener: (type: string, listener: EventListener) => { documentListeners.get(type)?.delete(listener); },
  };
  Reflect.defineProperty(globalThis, "document", { configurable: true, value: documentDouble });
  Reflect.defineProperty(globalThis, "Image", { configurable: true, value: class { src = ""; complete = false; naturalWidth = 0; naturalHeight = 0; } });
  Reflect.defineProperty(globalThis, "window", { configurable: true, value: {
    cancelAnimationFrame: (id: number) => { cancelledFrames += 1; frames.delete(id); },
    clearTimeout,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      requestedFrames += 1;
      frameId += 1;
      frames.set(frameId, callback);
      return frameId;
    },
    setTimeout,
  } });
  return {
    container: containerDouble as unknown as HTMLElement,
    documentListeners,
    canvases,
    cancelledFrameCount: () => cancelledFrames,
    pendingFrameCount: () => frames.size,
    requestedFrameCount: () => requestedFrames,
    runNextFrame: (now) => {
      const next = frames.entries().next().value;
      if (!next) throw new Error("No animation frame is pending.");
      frames.delete(next[0]);
      frameTime = now ?? frameTime + 250;
      next[1](frameTime);
    },
    setHidden: (value) => { hidden = value; },
  };
}

function createCanvasDouble(): CanvasDouble {
  const listeners = new Map<string, Set<EventListener>>();
  let connected = false;
  const element = {
    style: { cssText: "" },
    get isConnected() { return connected; },
    set isConnected(value: boolean) { connected = value; },
    clientWidth: 100,
    clientHeight: 100,
    width: 0,
    height: 0,
    setAttribute: () => undefined,
    addEventListener: (type: string, listener: EventListener) => { addListener(listeners, type, listener); },
    removeEventListener: (type: string, listener: EventListener) => { listeners.get(type)?.delete(listener); },
    remove: () => { connected = false; },
    getContext: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  } as unknown as HTMLCanvasElement;
  return { element, listeners, connected: () => connected };
}

function addListener(registry: Map<string, Set<EventListener>>, type: string, listener: EventListener): void {
  const registered = registry.get(type) ?? new Set<EventListener>();
  registered.add(listener);
  registry.set(type, registered);
}

function runtimeOptions(environment: RuntimeEnvironment, overrides: Partial<EncounterRuntimeOptions> = {}): EncounterRuntimeOptions {
  return {
    container: environment.container,
    score: getSceneScore("paper-moth"),
    audio: undefined,
    audioPlayback: undefined,
    visuals: { backgroundUrl: "/background.webp", poseSheetUrl: "/poses.png" },
    variant: defaultSessionVariant,
    seed: 1,
    renderer: "canvas",
    ...overrides,
  };
}

function dispatchVisibilityChange(environment: RuntimeEnvironment): void {
  environment.documentListeners.get("visibilitychange")?.forEach((listener) => { listener(new Event("visibilitychange")); });
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => { resolvePromise = resolve; });
  return { promise, resolve: (value) => { resolvePromise?.(value); } };
}

function phaserDouble() {
  return {
    render: vi.fn<PhaserSimulationBootstrap["render"]>(),
    pause: vi.fn(() => undefined),
    resume: vi.fn(() => undefined),
    destroy: vi.fn(() => undefined),
  };
}

describe("encounter runtime lifecycle", () => {
  it("pauses through the earned visibility callback", () => {
    const environment = installRuntimeEnvironment();
    let visibilityPauses = 0;
    const runtime = createEncounterRuntime(runtimeOptions(environment, {
      onVisibilityPause: () => { visibilityPauses += 1; },
    }));

    environment.setHidden(true);
    dispatchVisibilityChange(environment);

    expect(visibilityPauses).toBe(1);
    runtime.destroy();
  });

  it("registers target input only for tablet playback", () => {
    const tabletEnvironment = installRuntimeEnvironment();
    const tablet = createEncounterRuntime(runtimeOptions(tabletEnvironment));
    expect(tabletEnvironment.canvases[0]!.listeners.get("pointerdown")).toHaveLength(1);
    tablet.destroy();
    expect(tabletEnvironment.canvases[0]!.listeners.get("pointerdown")).toHaveLength(0);

    const televisionEnvironment = installRuntimeEnvironment();
    const television = createEncounterRuntime(runtimeOptions(televisionEnvironment, { playbackMode: "tv-passive" }));
    expect(televisionEnvironment.canvases[0]!.listeners.get("pointerdown")).toBeUndefined();
    television.destroy();
  });

  it("mounts the canvas fallback and removes lifecycle listeners on destroy", () => {
    const environment = installRuntimeEnvironment();
    const runtime = createEncounterRuntime(runtimeOptions(environment));

    runtime.start();
    expect(environment.canvases[0]!.connected()).toBe(true);
    expect(environment.documentListeners.get("visibilitychange")).toHaveLength(1);

    runtime.destroy();
    expect(environment.canvases[0]!.connected()).toBe(false);
    expect(environment.documentListeners.get("visibilitychange")).toHaveLength(0);
  });
});

describe("encounter runtime frame ownership", () => {
  it("owns exactly one canvas frame and suspends it for every inactive lifecycle", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1_000);
    const environment = installRuntimeEnvironment();
    const runtime = createEncounterRuntime(runtimeOptions(environment));

    runtime.start();
    expect(environment.pendingFrameCount()).toBe(1);
    environment.runNextFrame(1_250);
    expect(runtime.snapshot().elapsedMs).toBeCloseTo(250);
    runtime.pause();
    expect(environment.pendingFrameCount()).toBe(0);
    expect(environment.cancelledFrameCount()).toBe(1);

    now.mockReturnValue(10_000);
    runtime.resume();
    runtime.resume();
    expect(environment.pendingFrameCount()).toBe(1);
    expect(environment.requestedFrameCount()).toBe(3);
    environment.runNextFrame(10_100);
    expect(runtime.snapshot().elapsedMs).toBeCloseTo(350);

    environment.setHidden(true);
    dispatchVisibilityChange(environment);
    expect(environment.pendingFrameCount()).toBe(0);
    environment.setHidden(false);
    dispatchVisibilityChange(environment);
    expect(environment.pendingFrameCount()).toBe(0);

    runtime.resume();
    expect(environment.pendingFrameCount()).toBe(1);
    runtime.stop();
    expect(environment.pendingFrameCount()).toBe(0);
    runtime.start();
    expect(environment.pendingFrameCount()).toBe(1);
    runtime.destroy();
    expect(environment.pendingFrameCount()).toBe(0);
  });

  it("publishes the exact final time and phase without scheduling past completion", () => {
    const environment = installRuntimeEnvironment();
    const progress: Array<[number, number, string]> = [];
    let completions = 0;
    const runtime = createEncounterRuntime(runtimeOptions(environment, {
      onProgress: (elapsedMs, durationMs, phase) => { progress.push([elapsedMs, durationMs, phase]); },
      onComplete: () => { completions += 1; },
    }));

    runtime.start();
    for (let frame = 0; frame < 500 && !runtime.snapshot().complete; frame += 1) environment.runNextFrame();

    expect(progress.at(-1)).toEqual([90_000, 90_000, "finale"]);
    expect(completions).toBe(1);
    expect(environment.pendingFrameCount()).toBe(0);
    runtime.destroy();
  });

  it("keeps a pending Phaser upgrade across pause and leaves a paused load paused", async () => {
    const environment = installRuntimeEnvironment();
    const pendingPhaser = deferred<PhaserSimulationBootstrap>();
    const loadedPhaser = phaserDouble();
    phaserBootstrapMock.create.mockReturnValueOnce(pendingPhaser.promise);
    const runtime = createEncounterRuntime(runtimeOptions(environment, { renderer: "auto" }));

    runtime.start();
    const signal = phaserBootstrapMock.create.mock.calls[0]![0].signal;
    runtime.pause();
    expect(signal.aborted).toBe(false);
    expect(environment.pendingFrameCount()).toBe(0);

    pendingPhaser.resolve(loadedPhaser);
    await Promise.resolve();
    expect(loadedPhaser.pause).toHaveBeenCalledOnce();
    expect(loadedPhaser.resume).not.toHaveBeenCalled();
    expect(environment.canvases[0]!.connected()).toBe(false);

    environment.setHidden(false);
    dispatchVisibilityChange(environment);
    expect(loadedPhaser.resume).not.toHaveBeenCalled();
    runtime.resume();
    expect(loadedPhaser.resume).toHaveBeenCalledOnce();
    runtime.destroy();
    expect(loadedPhaser.destroy).toHaveBeenCalledOnce();
  });

  it("destroys a delayed Phaser load that settles after teardown", async () => {
    const environment = installRuntimeEnvironment();
    const pendingPhaser = deferred<PhaserSimulationBootstrap>();
    const loadedPhaser = phaserDouble();
    phaserBootstrapMock.create.mockReturnValueOnce(pendingPhaser.promise);
    const runtime = createEncounterRuntime(runtimeOptions(environment, { renderer: "auto" }));

    runtime.start();
    const signal = phaserBootstrapMock.create.mock.calls[0]![0].signal;
    runtime.destroy();
    expect(signal.aborted).toBe(true);

    pendingPhaser.resolve(loadedPhaser);
    await Promise.resolve();
    expect(loadedPhaser.destroy).toHaveBeenCalledOnce();
    expect(environment.pendingFrameCount()).toBe(0);
  });
});
