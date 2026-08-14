import type { PhaserSimulationHost, PhaserSimulationHostOptions } from "./simulationHostContract";
import { createSimulationHostRuntime } from "./simulationHostRuntime";

export type { PhaserSimulationHost, PhaserSimulationHostOptions } from "./simulationHostContract";

/** Stable public facade for the browser simulation host. */
export function createPhaserSimulationHost(options: PhaserSimulationHostOptions): PhaserSimulationHost {
  return createSimulationHostRuntime(options);
}
