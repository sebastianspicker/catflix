import type { MotionStrategy } from "./motionTypes";
import { accelerateAndMove, rotateVelocity, steer } from "./motionMath";
import { clamp, isLowMotion, pulse, smoothstep } from "./simulationPrimitives";
import type { MutableActor } from "./actorFactory";
import type { SceneScore } from "./types";

export const advanceBeetle: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const lowMotion = isLowMotion(context.preferences), motion = beetleMotionFor(time, behavior.state, context.variants.motion, actor.anchorY, actor.turnBias);
  steer(actor, actor.vx < 0 ? -1 : 1, (motion.desiredY - actor.y) * 3.5, deltaSeconds, 2.3, context.score);
  const approach = behavior.state === "crawling" ? smoothstep(.68, 1, progress) : 0;
  if (approach > 0) steerTowardShelter(actor, deltaSeconds, approach, context.score);
  rotateVelocity(actor, Math.sin(motion.seconds * 1.1) * deltaSeconds * .12 * motion.activity);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * (.48 + motion.stride * .38) * motion.activity * reducedScale, deltaSeconds, context.score);
  Object.assign(actor, beetlePresentationFor({ actor, motion, deltaSeconds, speed, maxSpeed: context.score.maxSpeed, lowMotion }));
};

type BeetleMotion = { sheltering: boolean; seconds: number; stride: number; activity: number; desiredY: number };
type BeetlePresentationInput = { actor: MutableActor; motion: BeetleMotion; deltaSeconds: number; speed: number; maxSpeed: number; lowMotion: boolean };

const beetleMotionFor = (time: number, state: string, motionVariant: string, anchorY: number, turnBias: number): BeetleMotion => {
  const sheltering = state === "sheltering", seconds = time / 1000, stride = .5 + .5 * Math.sin(seconds * 8.8);
  const activity = sheltering ? 0 : motionVariant === "intermittent" ? 1 - pulse(time % 3_900, 2_950, 3_650, 150) : 1;
  return { sheltering, seconds, stride, activity, desiredY: anchorY + Math.sin(seconds * .31 + turnBias) * .045 + (state === "reappearing" ? -.05 : 0) };
};

const steerTowardShelter = (actor: MutableActor, deltaSeconds: number, approach: number, score: SceneScore): void => {
  const shelter = actor.turnBias < 0 ? { x: .25, y: .44 } : { x: .75, y: .6 };
  steer(actor, shelter.x - actor.x, shelter.y - actor.y, deltaSeconds, 2.2 * approach, score);
};

const beetlePresentationFor = ({ actor, motion, deltaSeconds, speed, maxSpeed, lowMotion }: BeetlePresentationInput): Pick<MutableActor, "angle" | "stretchX" | "stretchY" | "scale" | "motionEnergy" | "propulsion" | "posePhase" | "state"> => {
  const gait = lowMotion ? 0 : Math.sin(motion.seconds * 8.8) * motion.activity;
  return {
    angle: Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + gait * .01, stretchX: 1 + gait * .018, stretchY: 1 - gait * .012,
    scale: actor.baseScale, motionEnergy: clamp(speed / maxSpeed + Math.abs(gait) * .18, 0, 1), propulsion: motion.stride * motion.activity,
    posePhase: motion.activity > .08 ? (actor.posePhase + deltaSeconds * (lowMotion ? .35 : .85 + motion.stride * .25)) % 1 : actor.posePhase,
    state: motion.sheltering || motion.activity < .08 ? "paused" : "moving",
  };
};
