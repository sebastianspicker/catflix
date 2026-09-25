import { clamp } from "./simulationMath";

export class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
  next(): number { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0x1_0000_0000; }
  signed(): number { return this.next() * 2 - 1; }
}

export class FixedSceneClock {
  private accumulatorMs = 0;
  reset(): void { this.accumulatorMs = 0; }
  advance(deltaMs: number, elapsedMs: number, durationMs: number, onStep: (stepMs: number) => void): void {
    this.accumulatorMs += clamp(Number.isFinite(deltaMs) ? deltaMs : 0, 0, 10_000);
    const stepMs = 1000 / 60;
    while (this.accumulatorMs + 1e-6 >= stepMs && elapsedMs < durationMs) { this.accumulatorMs -= stepMs; onStep(stepMs); }
    if (elapsedMs >= durationMs) this.accumulatorMs = 0;
  }
}
