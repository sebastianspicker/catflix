import type { MotionStrategy } from "./motionTypes";
import { accelerateAndMove, rotateVelocity, steer } from "./motionMath";
import { clamp, isLowMotion, pulse, smoothstep } from "./simulationPrimitives";

export const advanceBeetle: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const sheltering = behavior.state === "sheltering", reappearing = behavior.state === "reappearing", seconds = time / 1000, stride = .5 + .5 * Math.sin(seconds * 8.8), activity = sheltering ? 0 : context.variants.motion === "intermittent" ? 1 - pulse(time % 3_900, 2_950, 3_650, 150) : 1, desiredY = actor.anchorY + Math.sin(seconds * .31 + actor.turnBias) * .045 + (reappearing ? -.05 : 0);
  steer(actor, actor.vx < 0 ? -1 : 1, (desiredY - actor.y) * 3.5, deltaSeconds, 2.3, context.score);
  const approach = behavior.state === "crawling" ? smoothstep(.68, 1, progress) : 0;
  if (approach > 0) { const shelter = actor.turnBias < 0 ? { x: .25, y: .44 } : { x: .75, y: .6 }; steer(actor, shelter.x - actor.x, shelter.y - actor.y, deltaSeconds, 2.2 * approach, context.score); }
  rotateVelocity(actor, Math.sin(seconds * 1.1) * deltaSeconds * .12 * activity);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * (.48 + stride * .38) * activity * reducedScale, deltaSeconds, context.score), gait = isLowMotion(context.preferences) ? 0 : Math.sin(seconds * 8.8) * activity;
  actor.angle = Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + gait * .01; actor.stretchX = 1 + gait * .018; actor.stretchY = 1 - gait * .012; actor.scale = actor.baseScale; actor.motionEnergy = clamp(speed / context.score.maxSpeed + Math.abs(gait) * .18, 0, 1); actor.propulsion = stride * activity;
  if (activity > .08) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(context.preferences) ? .35 : .85 + stride * .25)) % 1;
  actor.state = sheltering || activity < .08 ? "paused" : "moving";
};
