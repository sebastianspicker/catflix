import { clamp } from "./simulationMath";

export class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
  next(): number { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0x1_0000_0000; }
  signed(): number { return this.next() * 2 - 1; }
}

export class FixedSceneClock {
  private static readonly stepMs = 1000 / 60;
  private accumulatorMs = 0;
  /** Leftover accumulator as a fraction of one fixed step (0 up to but excluding 1), for renderer interpolation. */
  get alpha(): number {
    // The advance loop's own stopping epsilon (1e-6ms) means a fully drained accumulator can land
    // a hair below zero; snap that noise to exactly 0 so equal-time runs agree bit-for-bit.
    return (this.accumulatorMs < 1e-6 ? 0 : this.accumulatorMs) / FixedSceneClock.stepMs;
  }
  reset(): void { this.accumulatorMs = 0; }
  advance(deltaMs: number, elapsedMs: number, durationMs: number, onStep: (stepMs: number) => void): void {
    this.accumulatorMs += clamp(Number.isFinite(deltaMs) ? deltaMs : 0, 0, 10_000);
    const stepMs = FixedSceneClock.stepMs;
    while (this.accumulatorMs + 1e-6 >= stepMs && elapsedMs < durationMs) { this.accumulatorMs -= stepMs; onStep(stepMs); }
    if (elapsedMs >= durationMs) this.accumulatorMs = 0;
  }
}
