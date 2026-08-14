import { describe, expect, it } from "vitest";
import { defaultVariantSelection, getSceneScore } from "./definitions";
import { createActors } from "./actorFactory";
import { advanceBeetle } from "./motionBeetle";
import { advanceBird } from "./motionBird";
import type { ActorMotionContext, SceneBehavior } from "./motionTypes";

const deterministicRandom = { next: () => .5, signed: () => .25 };

const motionContextFor = (sceneId: "balcony-birds" | "beetle-under-the-fern", lowMotion = false): ActorMotionContext => ({
  sceneId, score: getSceneScore(sceneId), variants: defaultVariantSelection,
  preferences: lowMotion ? { sceneMotionMode: "low" } : {}, elapsedMs: 0, forcedRestUntilMs: 0,
});

const behaviorFor = (sceneId: "balcony-birds" | "beetle-under-the-fern", state: SceneBehavior["state"]): SceneBehavior => {
  const behavior = getSceneScore(sceneId).behaviors.find((candidate) => candidate.state === state);
  if (behavior === undefined) throw new Error(`Missing ${state} behavior for ${sceneId}`);
  return behavior;
};

describe("motion strategies", () => {
  it("keeps flying birds deterministic, bounded, and calm in low-motion mode", () => {
    const first = createActors("balcony-birds", 1, deterministicRandom)[0];
    const second = createActors("balcony-birds", 1, deterministicRandom)[0];
    const actor = first;
    const before = { ...actor };
    expect(advanceBird(actor, 1_000, .05, 1, behaviorFor("balcony-birds", "flying"), .4, motionContextFor("balcony-birds"))).toBeUndefined();
    advanceBird(second, 1_000, .05, 1, behaviorFor("balcony-birds", "flying"), .4, motionContextFor("balcony-birds"));
    expect(first).toEqual(second);
    expect(actor).not.toEqual(before);
    expect(actor.angle).toBeGreaterThanOrEqual(-.13);
    expect(actor.angle).toBeLessThanOrEqual(.13);
    expect(actor.motionEnergy).toBeGreaterThanOrEqual(0);
    expect(actor.motionEnergy).toBeLessThanOrEqual(1);

    const lowMotionActor = createActors("balcony-birds", 1, deterministicRandom)[0];
    advanceBird(lowMotionActor, 1_000, .05, 1, behaviorFor("balcony-birds", "flying"), .4, motionContextFor("balcony-birds", true));
    expect(lowMotionActor.angle).toBe(0);
    expect(lowMotionActor.posePhase).toBeLessThan(actor.posePhase);
  });

  it("keeps beetle sheltering and crawl approaches deterministic without exceeding motion bounds", () => {
    const actor = createActors("beetle-under-the-fern", 1, deterministicRandom)[0];
    const copy = createActors("beetle-under-the-fern", 1, deterministicRandom)[0];
    const crawling = behaviorFor("beetle-under-the-fern", "crawling");
    const context = motionContextFor("beetle-under-the-fern");
    advanceBeetle(actor, 1_000, .05, 1, crawling, .9, context);
    advanceBeetle(copy, 1_000, .05, 1, crawling, .9, context);
    expect(actor).toEqual(copy);
    expect(actor.motionEnergy).toBeGreaterThanOrEqual(0);
    expect(actor.motionEnergy).toBeLessThanOrEqual(1);

    advanceBeetle(actor, 1_200, .05, 1, behaviorFor("beetle-under-the-fern", "sheltering"), .4, context);
    expect(actor.state).toBe("paused");
  });
});
