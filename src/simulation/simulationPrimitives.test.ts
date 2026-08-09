import { describe, expect, it } from "vitest";
import { getSceneScore } from "./definitions";
import {
  behaviorAt,
  clamp,
  contactResponseFor,
  initialPlacement,
  isLowMotion,
  lerp,
  normalize,
  poseProgressFor,
  pulse,
  sceneAnimationState,
  signatureEffect,
  smoothstep,
} from "./simulationPrimitives";

describe("simulation primitive facade", () => {
  it("preserves bounded math and authored placement exports", () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(normalize(3, 4)).toEqual({ x: 0.6, y: 0.8 });
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(pulse(500, 0, 1_000, 250)).toBe(1);
    expect(initialPlacement("red-string", 0.5, 0.5)).toEqual({ x: 0.5, y: 0.52 });
  });

  it("preserves encounter timing and response exports", () => {
    const score = getSceneScore("balcony-birds");
    expect(behaviorAt(score, 0, false).behavior).toBe(score.behaviors[0]);
    expect(contactResponseFor("balcony-birds", "perching", "passage", ["head-turn", "hop"])).toBe("head-turn");
    expect(signatureEffect("koi-pool", "finale", { x: 0.4, y: 0.6 })).toEqual({ kind: "reflected-ring", x: 0.4, y: 0.6, alpha: 0.16 });
    expect(sceneAnimationState("paper-moth", "paused")).toBe("landed");
    expect(poseProgressFor("paper-moth", "fluttering", 0.2, 0.8)).toBe(0.8);
    expect(isLowMotion({ sceneMotionMode: "low" })).toBe(true);
  });
});
