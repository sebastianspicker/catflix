import type { MotionStrategy } from "./motionTypes";
import { accelerateAndMove, advancePoseBySpeed, easeInOut, rotateVelocity, steer } from "./motionMath";
import { clamp, pulse, smoothstep } from "./simulationMath";
import { isLowMotion } from "./simulationTiming";
import type { MutableActor } from "./actorFactory";
import type { SceneScore } from "../../domain";

export const advanceBeetle: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const lowMotion = isLowMotion(context.preferences), motion = beetleMotionFor(time, behavior.state, progress, context.variants.motion, actor.anchorY, actor.turnBias);
  steer(actor, actor.vx < 0 ? -1 : 1, (motion.desiredY - actor.y) * 3.5, deltaSeconds, 2.3, context.score);
  const approach = behavior.state === "crawling" ? smoothstep(.68, 1, progress) : 0;
  if (approach > 0) steerTowardShelter(actor, deltaSeconds, approach, context.score);
  rotateVelocity(actor, Math.sin(motion.seconds * 1.1) * deltaSeconds * .12 * motion.activity);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * (.48 + motion.stride * .38) * motion.activity * reducedScale, deltaSeconds, context.score);
  Object.assign(actor, beetlePresentationFor({ actor, motion, deltaSeconds, speed, maxSpeed: context.score.maxSpeed, baseSpeed: context.score.baseSpeed, reducedScale, lowMotion }));
};

type BeetleMotion = { sheltering: boolean; seconds: number; stride: number; activity: number; desiredY: number };
type BeetlePresentationInput = { actor: MutableActor; motion: BeetleMotion; deltaSeconds: number; speed: number; maxSpeed: number; baseSpeed: number; reducedScale: number; lowMotion: boolean };

const beetleMotionFor = (time: number, state: string, progress: number, motionVariant: string, anchorY: number, turnBias: number): BeetleMotion => {
  const sheltering = state === "sheltering", seconds = time / 1000, stride = .5 + .5 * Math.sin(seconds * 8.8);
  // A steady gait eases in and out across the crawl's own start and end, on top of the authored
  // intermittent pauses, so a walking-to-sheltering transition settles instead of stopping short.
  const gaitEase = sheltering ? 0 : easeInOut(progress, .1, .1);
  const activity = sheltering ? 0 : (motionVariant === "intermittent" ? 1 - pulse(time % 3_900, 2_950, 3_650, 150) : 1) * gaitEase;
  return { sheltering, seconds, stride, activity, desiredY: anchorY + Math.sin(seconds * .31 + turnBias) * .045 + (state === "reappearing" ? -.05 : 0) };
};

const steerTowardShelter = (actor: MutableActor, deltaSeconds: number, approach: number, score: SceneScore): void => {
  const shelter = actor.turnBias < 0 ? { x: .25, y: .44 } : { x: .75, y: .6 };
  steer(actor, shelter.x - actor.x, shelter.y - actor.y, deltaSeconds, 2.2 * approach, score);
};

const beetlePresentationFor = ({ actor, motion, deltaSeconds, speed, maxSpeed, baseSpeed, reducedScale, lowMotion }: BeetlePresentationInput): Pick<MutableActor, "angle" | "stretchX" | "stretchY" | "scale" | "motionEnergy" | "propulsion" | "posePhase" | "state"> => {
  const gait = lowMotion ? 0 : Math.sin(motion.seconds * 8.8) * motion.activity;
  return {
    angle: Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + gait * .01, stretchX: 1 + gait * .018, stretchY: 1 - gait * .012,
    scale: actor.baseScale, motionEnergy: clamp(speed / maxSpeed + Math.abs(gait) * .18, 0, 1), propulsion: motion.stride * motion.activity,
    // Leg cycle cadence tracks actual crawl speed rather than wall time, so short pauses freeze the
    // gait instead of skating it forward while the beetle is not travelling. The reference speed
    // scales with reducedScale too, so low motion's slower crawl still spans the same relative part
    // of the cadence curve instead of saturating at its floor and reverting to a fixed rate.
    posePhase: motion.activity > .08 ? advancePoseBySpeed(actor.posePhase, deltaSeconds, speed, baseSpeed * .65 * reducedScale, lowMotion ? .35 : .85 + motion.stride * .25) : actor.posePhase,
    state: motion.sheltering || motion.activity < .08 ? "paused" : "moving",
  };
};
