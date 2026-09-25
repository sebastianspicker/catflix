import type { MutableActor } from "./actorFactory";
import type { ActorMotionContext, MotionStrategy } from "./motionTypes";
import { accelerateAndMove, advancePoseBySpeed, approachSurface, rotateVelocity, seededNoise, steer } from "./motionMath";
import { clamp, smoothstep } from "./simulationMath";
import { isLowMotion } from "./simulationTiming";

// Frequency/weight terms for the deterministic flutter heading noise: a small sum of sines with a
// per-actor phase (actor.turnBias) in place of a single jittery term, so the path looks naturally
// unpredictable while every step-to-step heading change stays smooth and bounded.
const FLUTTER_NOISE_TERMS: readonly (readonly [number, number])[] = [[1.7, .5], [.47, .34], [2.9, .18], [.081, .22]];

export const advanceMoth: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const state = mothState(behavior.state), seconds = time / 1000, wingPhase = Math.sin(actor.posePhase * Math.PI * 2), stroke = state.landed ? 0 : .42 + Math.abs(wingPhase) * .58;
  rotateVelocity(actor, seededNoise(seconds, actor.turnBias, FLUTTER_NOISE_TERMS) * deltaSeconds * stroke * reducedScale);
  const landing = { x: actor.turnBias < 0 ? .075 : .925, y: .34 + Math.abs(actor.turnBias) * .22 };
  const approach = state.fluttering ? smoothstep(.72, 1, progress) : 0;
  const settled = guideMoth(actor, state, landing, approach, deltaSeconds, reducedScale, context);
  const speed = moveMoth(actor, state, stroke, approach, progress, reducedScale, deltaSeconds, context);
  updateMothPose(actor, state.landed, wingPhase, stroke, speed, reducedScale, deltaSeconds, context);
  actor.state = state.landed && settled ? "paused" : "moving";
};

interface MothState {
  landed: boolean;
  reappearing: boolean;
  fluttering: boolean;
}

const mothState = (value: string): MothState => ({
  landed: value === "landed",
  reappearing: value === "reappearing",
  fluttering: value === "fluttering",
});

const guideMoth = (actor: MutableActor, state: MothState, landing: { x: number; y: number }, approach: number, deltaSeconds: number, reducedScale: number, context: ActorMotionContext): boolean => {
  if (approach > 0) steer(actor, landing.x - actor.x, landing.y - actor.y, deltaSeconds, approach * 2.8, context.score);
  const settled = state.landed && approachSurface(actor, landing.x, landing.y, deltaSeconds, context.score.baseSpeed * .82, reducedScale, context.score);
  if (state.reappearing) steer(actor, actor.x < .5 ? 1 : -1, (.5 - actor.y) * 2, deltaSeconds, 2.8, context.score);
  return settled;
};

const moveMoth = (actor: MutableActor, state: MothState, stroke: number, approach: number, progress: number, reducedScale: number, deltaSeconds: number, context: ActorMotionContext): number => {
  // Decelerate smoothly on the approach to landing instead of cruising at full flutter speed right
  // up to the landed state, so the moth settles along a gradual arc rather than stopping abruptly.
  const arc = state.landed ? 0 : (1 - approach * .62);
  const targetSpeed = context.score.baseSpeed * (state.reappearing ? .58 : .5 + stroke * .45) * arc * reducedScale;
  return accelerateAndMove(actor, targetSpeed, deltaSeconds, context.score);
};

const updateMothPose = (actor: MutableActor, landed: boolean, wingPhase: number, stroke: number, speed: number, reducedScale: number, deltaSeconds: number, context: ActorMotionContext): void => {
  const lowMotion = isLowMotion(context.preferences);
  const wing = lowMotion ? 0 : wingPhase;
  actor.angle = lowMotion ? 0 : Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + wing * .018;
  actor.stretchX = 1 + Math.abs(wing) * .12 * (landed ? 0 : 1);
  actor.stretchY = 1 - Math.abs(wing) * .075 * (landed ? 0 : 1);
  actor.scale = actor.baseScale;
  actor.motionEnergy = landed ? 0 : clamp(speed / context.score.maxSpeed + Math.abs(wing) * .35, 0, 1);
  actor.propulsion = stroke;
  // Wingbeat cadence tracks actual flutter speed instead of wall time alone. The reference speed
  // scales with reducedScale too, so low motion's slower flutter still spans the same relative part
  // of the cadence curve instead of saturating at its floor and reverting to a fixed rate.
  if (!landed) actor.posePhase = advancePoseBySpeed(actor.posePhase, deltaSeconds, speed, context.score.baseSpeed * .7 * reducedScale, lowMotion ? .35 : .9 + stroke * .35);
};
