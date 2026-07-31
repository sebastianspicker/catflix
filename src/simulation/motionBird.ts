import type { MutableActor } from "./actorFactory";
import type { MotionStrategy } from "./motionTypes";
import { accelerateAndMove, approachSurface, steer } from "./motionMath";
import { clamp, isLowMotion } from "./simulationPrimitives";

export const advanceBird: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const mode = birdModes[behavior.state], hopArc = mode.hop * (isLowMotion(context.preferences) ? 0 : 4 * progress * (1 - progress));
  const desiredY = actor.anchorY - hopArc * .055 - mode.flight * Math.sin(progress * Math.PI) * (.14 + Math.abs(actor.turnBias) * .05);
  const settled = mode.perch && approachSurface(actor, actor.x, actor.anchorY, deltaSeconds, context.score.baseSpeed * .82, reducedScale, context.score);
  if (!mode.perch) steer(actor, actor.x < .18 ? 1 : actor.x > .82 ? -1 : actor.vx < 0 ? -1 : 1, (desiredY - actor.y) * mode.yTurn, deltaSeconds, mode.responsiveness, context.score);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * mode.speedScale * reducedScale, deltaSeconds, context.score);
  actor.angle = isLowMotion(context.preferences) ? 0 : clamp(actor.vy * .22, -.13, .13);
  const wing = Math.sin(time * .019) * mode.flight;
  actor.stretchX = 1 + wing * .035; actor.stretchY = 1 - wing * .055; actor.scale = actor.baseScale * (1 + hopArc * .035 + mode.flight * .045);
  actor.motionEnergy = clamp(speed / context.score.maxSpeed + Math.abs(wing) * .35, 0, 1); actor.propulsion = [hopArc, Math.abs(wing)][mode.flight];
  actor.posePhase = (actor.posePhase + deltaSeconds * mode.flight * (isLowMotion(context.preferences) ? .45 : 1.35)) % 1;
  actor.state = ["moving", "paused"][Number(mode.perch && settled && actor.currentSpeed <= .01)] as MutableActor["state"];
};

const birdModes: Record<string, { perch: number; hop: number; flight: 0 | 1; speedScale: number; yTurn: number; responsiveness: number }> = {
  perching: { perch: 1, hop: 0, flight: 0, speedScale: 0, yTurn: 9, responsiveness: 6 },
  hopping: { perch: 0, hop: 1, flight: 0, speedScale: .95, yTurn: 9, responsiveness: 6 },
  flying: { perch: 0, hop: 0, flight: 1, speedScale: 2.35, yTurn: 5, responsiveness: 2.6 },
  reappearing: { perch: 0, hop: 0, flight: 1, speedScale: 2.35, yTurn: 5, responsiveness: 2.6 },
};
