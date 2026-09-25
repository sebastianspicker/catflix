import type { MutableActor } from "./actorFactory";
import type { ActorMotionContext, MotionStrategy } from "./motionTypes";
import { accelerateAndMove, approachSurface, rotateVelocity, steer } from "./motionMath";
import { clamp, smoothstep } from "./simulationMath";
import { isLowMotion } from "./simulationTiming";

export const advanceMoth: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const state = mothState(behavior.state), seconds = time / 1000, wingPhase = Math.sin(actor.posePhase * Math.PI * 2), stroke = state.landed ? 0 : .42 + Math.abs(wingPhase) * .58;
  rotateVelocity(actor, (Math.sin(seconds * 1.7) * .72 + Math.sin(seconds * .47 + actor.turnBias) * .44) * deltaSeconds * stroke * reducedScale);
  const landing = { x: actor.turnBias < 0 ? .075 : .925, y: .34 + Math.abs(actor.turnBias) * .22 };
  const settled = guideMoth(actor, state, landing, deltaSeconds, progress, reducedScale, context);
  const speed = moveMoth(actor, state, stroke, reducedScale, deltaSeconds, context);
  updateMothPose(actor, state.landed, wingPhase, stroke, speed, deltaSeconds, context);
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

const guideMoth = (actor: MutableActor, state: MothState, landing: { x: number; y: number }, deltaSeconds: number, progress: number, reducedScale: number, context: ActorMotionContext): boolean => {
  const approach = state.fluttering ? smoothstep(.72, 1, progress) : 0;
  if (approach > 0) steer(actor, landing.x - actor.x, landing.y - actor.y, deltaSeconds, approach * 2.8, context.score);
  const settled = state.landed && approachSurface(actor, landing.x, landing.y, deltaSeconds, context.score.baseSpeed * .82, reducedScale, context.score);
  if (state.reappearing) steer(actor, actor.x < .5 ? 1 : -1, (.5 - actor.y) * 2, deltaSeconds, 2.8, context.score);
  return settled;
};

const moveMoth = (actor: MutableActor, state: MothState, stroke: number, reducedScale: number, deltaSeconds: number, context: ActorMotionContext): number => {
  const targetSpeed = state.landed ? 0 : context.score.baseSpeed * (state.reappearing ? .58 : .5 + stroke * .45) * reducedScale;
  return accelerateAndMove(actor, targetSpeed, deltaSeconds, context.score);
};

const updateMothPose = (actor: MutableActor, landed: boolean, wingPhase: number, stroke: number, speed: number, deltaSeconds: number, context: ActorMotionContext): void => {
  const lowMotion = isLowMotion(context.preferences);
  const wing = lowMotion ? 0 : wingPhase;
  actor.angle = lowMotion ? 0 : Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + wing * .018;
  actor.stretchX = 1 + Math.abs(wing) * .12 * (landed ? 0 : 1);
  actor.stretchY = 1 - Math.abs(wing) * .075 * (landed ? 0 : 1);
  actor.scale = actor.baseScale;
  actor.motionEnergy = landed ? 0 : clamp(speed / context.score.maxSpeed + Math.abs(wing) * .35, 0, 1);
  actor.propulsion = stroke;
  if (!landed) actor.posePhase = (actor.posePhase + deltaSeconds * (lowMotion ? .35 : .9 + stroke * .35)) % 1;
};
