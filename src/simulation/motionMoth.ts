import type { MutableActor } from "./actorFactory";
import type { MotionStrategy } from "./motionTypes";
import { accelerateAndMove, approachSurface, rotateVelocity, steer } from "./motionMath";
import { clamp, isLowMotion, smoothstep } from "./simulationPrimitives";

export const advanceMoth: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const landed = behavior.state === "landed", reappearing = behavior.state === "reappearing", seconds = time / 1000, wingPhase = Math.sin(actor.posePhase * Math.PI * 2), stroke = landed ? 0 : .42 + Math.abs(wingPhase) * .58;
  rotateVelocity(actor, (Math.sin(seconds * 1.7) * .72 + Math.sin(seconds * .47 + actor.turnBias) * .44) * deltaSeconds * stroke * reducedScale);
  const landing = { x: actor.turnBias < 0 ? .075 : .925, y: .34 + Math.abs(actor.turnBias) * .22 }, approach = behavior.state === "fluttering" ? smoothstep(.72, 1, progress) : 0;
  if (approach > 0) steer(actor, landing.x - actor.x, landing.y - actor.y, deltaSeconds, approach * 2.8, context.score);
  const settled = landed && approachSurface(actor, landing.x, landing.y, deltaSeconds, context.score.baseSpeed * .82, reducedScale, context.score);
  if (reappearing) steer(actor, actor.x < .5 ? 1 : -1, (.5 - actor.y) * 2, deltaSeconds, 2.8, context.score);
  const speed = accelerateAndMove(actor, landed ? 0 : context.score.baseSpeed * (reappearing ? .58 : .5 + stroke * .45) * reducedScale, deltaSeconds, context.score), wing = isLowMotion(context.preferences) ? 0 : wingPhase;
  actor.angle = isLowMotion(context.preferences) ? 0 : Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + wing * .018; actor.stretchX = 1 + Math.abs(wing) * .12 * (landed ? 0 : 1); actor.stretchY = 1 - Math.abs(wing) * .075 * (landed ? 0 : 1);
  actor.scale = actor.baseScale; actor.motionEnergy = landed ? 0 : clamp(speed / context.score.maxSpeed + Math.abs(wing) * .35, 0, 1); actor.propulsion = stroke;
  if (!landed) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(context.preferences) ? .35 : .9 + stroke * .35)) % 1;
  actor.state = landed && settled ? "paused" : "moving";
};
