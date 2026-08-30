import type Phaser from "phaser";
import type { PhaserSimulationRendererOptions } from "./phaserRenderer";
import type { SceneSnapshot } from "../../domain";

export interface PhaserSimulationBootstrap {
  render(state: SceneSnapshot): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

type PhaserBootstrapOptions = Omit<PhaserSimulationRendererOptions, "onReady"> & {
  container: HTMLElement;
  onFrame(delta: number): void;
  signal: AbortSignal;
};

const abortedError = (): DOMException => new DOMException("Phaser startup was cancelled.", "AbortError");
const startupError = (reason: unknown): Error =>
  reason instanceof Error
    ? reason
    : new Error("Phaser simulation failed to start.", { cause: reason });

/** Loads the Phaser implementation only after the Canvas host has already started. */
export async function createPhaserSimulationBootstrap(options: PhaserBootstrapOptions): Promise<PhaserSimulationBootstrap> {
  const [phaserModule, rendererModule] = await Promise.all([import("phaser"), import("./phaserRenderer")]);
  if (options.signal.aborted) throw abortedError();

  return new Promise<PhaserSimulationBootstrap>((resolve, reject) => {
    const PhaserRuntime = phaserModule.default;
    let game: Phaser.Game | undefined;
    let settled = false;
    let destroyed = false;
    const renderer = rendererModule.createPhaserSimulationRenderer({
      ...options,
      onReady: () => {
        if (destroyed || options.signal.aborted) return;
        settled = true;
        resolve(host);
      },
    });
    const destroy = (): void => {
      if (destroyed) return;
      destroyed = true;
      options.signal.removeEventListener("abort", abort);
      game?.destroy(true);
      game = undefined;
      renderer.destroy();
    };
    const abort = (): void => {
      destroy();
      if (!settled) reject(abortedError());
    };
    const host: PhaserSimulationBootstrap = {
      render: (state) => { renderer.render(state); },
      pause: () => game?.loop.pause(),
      resume: () => game?.loop.resume(),
      destroy,
    };

    options.signal.addEventListener("abort", abort, { once: true });
    try {
      game = new PhaserRuntime.Game({
        type: PhaserRuntime.AUTO,
        parent: options.container,
        transparent: true,
        scale: { mode: PhaserRuntime.Scale.RESIZE, width: "100%", height: "100%" },
        scene: { preload: renderer.preload, create: renderer.create, update: (_time: number, delta: number) => { options.onFrame(delta); } },
      });
    } catch (reason) {
      destroy();
      reject(startupError(reason));
    }
  });
}
