import type { MutableActor } from "./actorFactory";
import type { MotionStrategy } from "./motionTypes";
import { accelerateAndMove, approachSurface, steer } from "./motionMath";
import { clamp, isLowMotion } from "./simulationPrimitives";
import type { SceneScore } from "./types";

export const advanceBird: MotionStrategy = (actor, time, deltaSeconds, reducedScale, behavior, progress, context) => {
  const lowMotion = isLowMotion(context.preferences), mode = birdModes[behavior.state], motion = birdMotionFor(mode, actor, progress, lowMotion);
  const settled = settleBird(actor, mode, deltaSeconds, reducedScale, context.score);
  if (!mode.perch) steerBird(actor, motion.desiredY, deltaSeconds, mode, context.score);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * mode.speedScale * reducedScale, deltaSeconds, context.score);
  Object.assign(actor, birdPresentationFor({ actor, mode, motion, time, deltaSeconds, speed, maxSpeed: context.score.maxSpeed, lowMotion, settled }));
};

type BirdMode = { perch: number; hop: number; flight: 0 | 1; speedScale: number; yTurn: number; responsiveness: number };
type BirdMotion = { hopArc: number; desiredY: number };
type BirdPresentationInput = { actor: MutableActor; mode: BirdMode; motion: BirdMotion; time: number; deltaSeconds: number; speed: number; maxSpeed: number; lowMotion: boolean; settled: boolean };

const birdMotionFor = (mode: BirdMode, actor: MutableActor, progress: number, lowMotion: boolean): BirdMotion => {
  const hopArc = mode.hop * (lowMotion ? 0 : 4 * progress * (1 - progress));
  return { hopArc, desiredY: actor.anchorY - hopArc * .055 - mode.flight * Math.sin(progress * Math.PI) * (.14 + Math.abs(actor.turnBias) * .05) };
};

const settleBird = (actor: MutableActor, mode: BirdMode, deltaSeconds: number, reducedScale: number, score: SceneScore): boolean =>
  mode.perch > 0 && approachSurface(actor, actor.x, actor.anchorY, deltaSeconds, score.baseSpeed * .82, reducedScale, score);

const steerBird = (actor: MutableActor, desiredY: number, deltaSeconds: number, mode: BirdMode, score: SceneScore): void => {
  const horizontalDirection = actor.x < .18 ? 1 : actor.x > .82 ? -1 : actor.vx < 0 ? -1 : 1;
  steer(actor, horizontalDirection, (desiredY - actor.y) * mode.yTurn, deltaSeconds, mode.responsiveness, score);
};

const birdPresentationFor = ({ actor, mode, motion, time, deltaSeconds, speed, maxSpeed, lowMotion, settled }: BirdPresentationInput): Pick<MutableActor, "angle" | "stretchX" | "stretchY" | "scale" | "motionEnergy" | "propulsion" | "posePhase" | "state"> => {
  const wing = Math.sin(time * .019) * mode.flight;
  return {
    angle: lowMotion ? 0 : clamp(actor.vy * .22, -.13, .13), stretchX: 1 + wing * .035, stretchY: 1 - wing * .055,
    scale: actor.baseScale * (1 + motion.hopArc * .035 + mode.flight * .045), motionEnergy: clamp(speed / maxSpeed + Math.abs(wing) * .35, 0, 1), propulsion: [motion.hopArc, Math.abs(wing)][mode.flight],
    posePhase: (actor.posePhase + deltaSeconds * mode.flight * (lowMotion ? .45 : 1.35)) % 1,
    state: ["moving", "paused"][Number(mode.perch && settled && actor.currentSpeed <= .01)] as MutableActor["state"],
  };
};

const birdModes: Record<string, BirdMode> = {
  perching: { perch: 1, hop: 0, flight: 0, speedScale: 0, yTurn: 9, responsiveness: 6 },
  hopping: { perch: 0, hop: 1, flight: 0, speedScale: .95, yTurn: 9, responsiveness: 6 },
  flying: { perch: 0, hop: 0, flight: 1, speedScale: 2.35, yTurn: 5, responsiveness: 2.6 },
  reappearing: { perch: 0, hop: 0, flight: 1, speedScale: 2.35, yTurn: 5, responsiveness: 2.6 },
};
