import type { SceneId } from "../../domain";
import type { MutableActor } from "./actorFactory";
import type { SceneScore } from "../../domain";
import { clamp, normalize, smoothstep } from "./simulationMath";

/** Maximum heading change any single fixed step may apply through {@link rotateVelocity}, so
 *  wobble noise can never spike into a hard direction cut regardless of its authored amplitude. */
export const MAX_HEADING_STEP_RADIANS = .35;
export const rotateVelocity = (actor: MutableActor, radians: number): void => {
  const bounded = clamp(radians, -MAX_HEADING_STEP_RADIANS, MAX_HEADING_STEP_RADIANS);
  const cosine = Math.cos(bounded), sine = Math.sin(bounded), direction = normalize(actor.vx * cosine - actor.vy * sine, actor.vx * sine + actor.vy * cosine);
  actor.vx = direction.x; actor.vy = direction.y;
};
/** Eases a behaviour's local progress toward zero near its start and end, so a state transition
 *  ramps its target speed in and out instead of stepping it at the boundary. */
export const easeInOut = (progress: number, rampIn: number, rampOut: number): number =>
  smoothstep(0, Math.max(rampIn, Number.EPSILON), progress) * (1 - smoothstep(1 - Math.max(rampOut, Number.EPSILON), 1, progress));
/** Deterministic, seeded flutter noise: a small sum of sines with per-actor phases, in place of a
 *  single jittery term, so wing wobble stays smooth while remaining unpredictable-looking. */
export const seededNoise = (seconds: number, seed: number, terms: readonly (readonly [frequency: number, weight: number])[]): number =>
  terms.reduce((sum, [frequency, weight], index) => sum + Math.sin(seconds * frequency + seed * (index + 1) * 2.3) * weight, 0);
/** Advances a pose cadence by actual travel speed rather than wall time, so gait or wingbeat frame
 *  changes track how far the actor has moved instead of drifting at a fixed rate while it is slow. */
export const advancePoseBySpeed = (posePhase: number, deltaSeconds: number, speed: number, referenceSpeed: number, baseCadence: number): number => {
  const cadence = baseCadence * clamp(speed / Math.max(referenceSpeed, Number.EPSILON), .35, 1.6);
  return (posePhase + deltaSeconds * cadence) % 1;
};
export const steer = (actor: MutableActor, desiredX: number, desiredY: number, deltaSeconds: number, responsiveness: number, score: SceneScore): void => {
  const desired = normalize(desiredX, desiredY), currentAngle = Math.atan2(actor.vy, actor.vx), desiredAngle = Math.atan2(desired.y, desired.x), angularDifference = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
  const maximumTurn = Math.min(responsiveness * deltaSeconds, score.maxAcceleration * .62 * deltaSeconds / Math.max(actor.currentSpeed, .012));
  const nextAngle = currentAngle + clamp(angularDifference, -maximumTurn, maximumTurn); actor.vx = Math.cos(nextAngle); actor.vy = Math.sin(nextAngle);
};
export const accelerateAndMove = (actor: MutableActor, targetSpeed: number, deltaSeconds: number, score: SceneScore): number => {
  actor.currentSpeed += clamp(clamp(targetSpeed, 0, score.maxSpeed) - actor.currentSpeed, -score.maxAcceleration * .62 * deltaSeconds, score.maxAcceleration * .62 * deltaSeconds);
  actor.x += actor.vx * actor.currentSpeed * deltaSeconds; actor.y += actor.vy * actor.currentSpeed * deltaSeconds; return actor.currentSpeed;
};
export const keepInsideFrame = (actor: MutableActor, deltaSeconds: number, score: SceneScore): void => {
  const marginX = .18, marginY = .16; let avoidX = actor.vx, avoidY = actor.vy;
  if (actor.x < marginX) avoidX += (marginX - actor.x) * 24; if (actor.x > 1 - marginX) avoidX -= (actor.x - (1 - marginX)) * 24;
  if (actor.y < marginY) avoidY += (marginY - actor.y) * 24; if (actor.y > 1 - marginY) avoidY -= (actor.y - (1 - marginY)) * 24;
  steer(actor, avoidX, avoidY, deltaSeconds, 5.5, score);
};
export const occlusionStrength = (sceneId: SceneId, actor: MutableActor, score: SceneScore): number => {
  const zoneStrength = score.occlusionZones.reduce((strongest, zone) => {
    const feather = sceneId === "koi-pool" ? .07 : .035;
    return Math.max(strongest, smoothstep(zone.minX - feather, zone.minX + feather, actor.x) * (1 - smoothstep(zone.maxX - feather, zone.maxX + feather, actor.x)) * smoothstep(zone.minY - feather, zone.minY + feather, actor.y) * (1 - smoothstep(zone.maxY - feather, zone.maxY + feather, actor.y)));
  }, 0);
  const fullCover = actor.animationState === "reappearing" || actor.animationState === "sheltering";
  return zoneStrength * (fullCover ? 1 : sceneId === "koi-pool" ? .72 : sceneId === "balcony-birds" || sceneId === "paper-moth" ? .44 : .58);
};
export const approachSurface = (actor: MutableActor, targetX: number, targetY: number, deltaSeconds: number, maximumSpeed: number, motionScale: number, score: SceneScore): boolean => {
  const offsetX = targetX - actor.x, offsetY = targetY - actor.y, distance = Math.hypot(offsetX, offsetY), direction = normalize(offsetX, offsetY), desiredSpeed = Math.min(maximumSpeed * motionScale, distance * 1.5), velocityChange = score.maxAcceleration * .42 * deltaSeconds;
  actor.surfaceVx += clamp(direction.x * desiredSpeed - actor.surfaceVx, -velocityChange, velocityChange); actor.surfaceVy += clamp(direction.y * desiredSpeed - actor.surfaceVy, -velocityChange, velocityChange); actor.x += actor.surfaceVx * deltaSeconds; actor.y += actor.surfaceVy * deltaSeconds;
  return distance < .014 && Math.hypot(actor.surfaceVx, actor.surfaceVy) < .008;
};
