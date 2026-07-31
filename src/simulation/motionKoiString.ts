import type { MotionStrategy } from "./motionTypes";
import { accelerateAndMove, rotateVelocity, steer } from "./motionMath";
import { clamp, isLowMotion, lerp, normalize, pulse, smoothstep } from "./simulationPrimitives";

const patternValue = (values: readonly number[], pattern: number): number => values.at(pattern) ?? values[0];
export const advanceKoi: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, _progress, context) => {
  const seconds = time / 1000, pattern = Math.abs(Math.floor(time / 8_500)) % 3, bout = ((seconds / 1.8 + actor.phase * .00011) % 1 + 1) % 1, burst = smoothstep(0, .16, bout) * (1 - smoothstep(.38, .68, bout));
  const gliding = behavior.state === "gliding", reappearing = behavior.state === "reappearing", targetPropulsion = gliding ? .02 : reappearing ? .32 : patternValue([.34, burst * .62, .24], pattern), propulsion = lerp(actor.propulsion, targetPropulsion, deltaSeconds * 1.45), turnRate = patternValue([.2, .12, .32], pattern);
  rotateVelocity(actor, (Math.sin(seconds * patternValue([.16, .16, .28], pattern) + actor.turnBias * 2.4) * turnRate + Math.sin(seconds * .07) * .06) * deltaSeconds * reducedScale);
  const depth = Math.sin(seconds * .18 + actor.phase * .001), speedFactor = gliding ? .42 : reappearing ? .58 : patternValue([.68, .34 + propulsion * .72, .54], pattern), speed = accelerateAndMove(actor, context.score.baseSpeed * speedFactor * reducedScale, deltaSeconds, context.score), motion = isLowMotion(context.preferences) ? { depth: .01, tail: .15 } : { depth: .035, tail: 1 }, tail = Math.sin(actor.posePhase * Math.PI * 2) * propulsion * motion.tail;
  actor.angle = Math.atan2(actor.vy, actor.vx) - Math.PI / 2; actor.scale = actor.baseScale * (1 + depth * motion.depth); actor.opacity = .92 + depth * .05; actor.stretchX = 1 + tail * .012; actor.stretchY = 1 - Math.abs(tail) * .008; actor.motionEnergy = clamp(speed / context.score.maxSpeed + propulsion * .35, 0, 1); actor.propulsion = propulsion; actor.posePhase = (actor.posePhase + deltaSeconds * (gliding ? .025 : .08 + propulsion * .32)) % 1; actor.state = "moving";
};
export const advanceString: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const seconds = time / 1000, resting = behavior.state === "resting", pull = resting ? 0 : pulse((progress * 3) % 1, 0, .68, .12), activity = resting ? 0 : .28 + pull * .72, targetX = .5 + Math.sin(seconds * .43 + actor.turnBias) * .34, targetY = .53 + Math.sin(seconds * .71 + actor.phase * .0007) * .2 + Math.cos(seconds * .27) * .055, desired = normalize(targetX - actor.x, targetY - actor.y);
  steer(actor, desired.x, desired.y, deltaSeconds, 4.2, context.score);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * (.58 + .42 * pull) * activity * reducedScale, deltaSeconds, context.score), deformation = Math.sin(seconds * 3.3) * (isLowMotion(context.preferences) ? 0 : 1);
  actor.angle = Math.atan2(actor.vy, actor.vx) + Math.PI / 2; actor.stretchX = 1 - deformation * .035; actor.stretchY = 1 + deformation * .06; actor.scale = actor.baseScale * (1 + activity * .035); actor.motionEnergy = clamp(speed / context.score.maxSpeed + pull * .3, 0, 1); actor.propulsion = pull; actor.state = resting ? "paused" : "moving";
};
