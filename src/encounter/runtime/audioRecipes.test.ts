import { describe, expect, it } from "vitest";
import { MAX_DURATION_MS, MAX_FREQUENCY_HZ, MAX_LAYER_GAIN, MIN_ATTACK_MS, voicePlanFor } from "./audioRecipes";

const kinds = ["ordinary-call", "wing", "quiet-water", "paper-flutter", "leaf-scratch", "fabric-drag"] as const;
const seeds = Array.from({ length: 40 }, (_, index) => index * 97 + 3);

describe("voicePlanFor hard limits", () => {
  it.each(kinds)("keeps %s within the welfare limits across many seeds", (kind) => {
    for (const seed of seeds) {
      const plan = voicePlanFor(kind, seed);
      expect(plan.durationMs).toBeLessThanOrEqual(MAX_DURATION_MS);
      expect(plan.layers.length).toBeGreaterThan(0);
      for (const layer of plan.layers) {
        expect(layer.filterCutoffHz).toBeGreaterThan(0);
        expect(layer.filterCutoffHz).toBeLessThanOrEqual(MAX_FREQUENCY_HZ);
        if (layer.kind === "oscillator") {
          expect(layer.frequencyHz[0]).toBeLessThanOrEqual(MAX_FREQUENCY_HZ);
          expect(layer.frequencyHz[1]).toBeLessThanOrEqual(MAX_FREQUENCY_HZ);
        }
        expect(layer.gain[0]).toEqual({ atMs: layer.gain[0]!.atMs, gain: 0 });
        expect(layer.gain[1]!.atMs - layer.gain[0]!.atMs).toBeGreaterThanOrEqual(MIN_ATTACK_MS);
        for (const point of layer.gain) {
          expect(point.gain).toBeLessThanOrEqual(MAX_LAYER_GAIN);
          expect(point.atMs).toBeLessThanOrEqual(plan.durationMs + 1);
        }
      }
    }
  });

  it("is deterministic for the same kind and seed", () => {
    expect(voicePlanFor("wing", 42)).toEqual(voicePlanFor("wing", 42));
  });

  it("varies across seeds instead of repeating one fixed plan", () => {
    const plans = seeds.slice(0, 5).map((seed) => voicePlanFor("ordinary-call", seed));
    const distinctDurations = new Set(plans.map((plan) => plan.durationMs));
    expect(distinctDurations.size).toBeGreaterThan(1);
  });

  it("returns a silent plan for an unknown kind rather than throwing", () => {
    expect(voicePlanFor("alarm", 1)).toEqual({ durationMs: 0, layers: [] });
  });
});
