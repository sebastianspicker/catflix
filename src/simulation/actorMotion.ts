import type { SceneId, VariantSelection } from "../content/types";
import type { MutableActor } from "./actorFactory";
import type { EncounterBeat, Point, SceneScore, SimulationPreferences } from "./types";
import { behaviorAt, clamp, isLowMotion, lerp, normalize, poseProgressFor, pulse, sceneAnimationState, smoothstep } from "./simulationPrimitives";

type SceneBehavior = SceneScore["behaviors"][number];
type MothFlightState = { landed: boolean; reappearing: boolean };

export interface ActorMotionContext {
  sceneId: SceneId;
  score: SceneScore;
  variants: VariantSelection;
  preferences: SimulationPreferences;
  elapsedMs: number;
  forcedRestUntilMs: number;
}

const scenePhaseAt = (score: SceneScore, timeMs: number): EncounterBeat => {
  const weights = score.encounter.map((beat) => (beat.durationMs[0] + beat.durationMs[1]) / 2);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = Math.min(timeMs, score.durationMs - Number.EPSILON) / score.durationMs * total;
  for (let index = 0; index < score.encounter.length; index += 1) {
    const weight = weights.at(index), encounter = score.encounter.at(index);
    if (weight === undefined || encounter === undefined) break;
    if (cursor < weight) return encounter;
    cursor -= weight;
  }
  return score.encounter.at(-1) ?? score.encounter[0];
};

const advanceActorForFixedStep = (actor: MutableActor, encounter: EncounterBeat, deltaMs: number, context: ActorMotionContext): void => {
  resetVisualState(actor);
  if (context.elapsedMs < context.forcedRestUntilMs || encounter.phase === "finale") {
    pauseActor(actor, encounter.behaviorState, false, context);
    return;
  }
  if (actor.hiddenUntilMs > context.elapsedMs) {
    actor.visible = false;
    actor.state = "hidden";
    syncRendererFields(actor, context);
    return;
  }
  actor.visible = true;
  if (actor.pauseUntilMs > context.elapsedMs) {
    pauseActor(actor, actor.animationState, true, context);
    return;
  }
  advanceAuthoredActor(actor, deltaMs, context);
  applyOcclusion(actor, context);
  syncRendererFields(actor, context);
};

const resetVisualState = (actor: MutableActor): void => {
  actor.opacity = 1; actor.stretchX = 1; actor.stretchY = 1;
  actor.scale = actor.baseScale; actor.motionEnergy = 0; actor.state = "moving";
};

const pauseActor = (actor: MutableActor, animationState: EncounterBeat["behaviorState"], showContactResponse: boolean, context: ActorMotionContext): void => {
  actor.visible = true; actor.state = "paused"; actor.currentSpeed = 0;
  actor.propulsion = 0; actor.motionEnergy = 0; actor.animationState = animationState;
  if (showContactResponse) actor.scale = actor.baseScale * (1 + (actor.responseUntilMs > context.elapsedMs ? .055 : 0));
  syncRendererFields(actor, context);
};

const advanceAuthoredActor = (actor: MutableActor, deltaMs: number, context: ActorMotionContext): void => {
  const deltaSeconds = deltaMs / 1000;
  const reducedScale = isLowMotion(context.preferences) ? context.score.lowMotionOverride.travelScale : 1;
  const time = context.elapsedMs + actor.phase;
  const authored = behaviorAt(context.score, time, context.variants.motion === "continuous", actor.phase);
  actor.animationState = authored.behavior.state;
  actor.stateProgress = authored.progress;
  if (context.sceneId === "balcony-birds") advanceBird(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress, context);
  else if (context.sceneId === "koi-pool") advanceKoi(actor, time, deltaSeconds, reducedScale, authored.behavior, context);
  else if (context.sceneId === "paper-moth") advanceMoth(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress, context);
  else if (context.sceneId === "beetle-under-the-fern") advanceBeetle(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress, context);
  else advanceString(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress, context);
  actor.facing = actor.vx < 0 ? -1 : 1;
  keepInsideFrame(actor, deltaSeconds, context.score);
  actor.x = clamp(actor.x, context.score.containment.minX, context.score.containment.maxX);
  actor.y = clamp(actor.y, context.score.containment.minY, context.score.containment.maxY);
};

const advanceBird = (actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number, context: ActorMotionContext): void => {
  const perching = behavior.state === "perching";
  const hopping = behavior.state === "hopping";
  const flight = behavior.state === "flying" || behavior.state === "reappearing";
  const hopArc = birdHopArc(hopping, progress, context.preferences);
  const desiredY = birdDesiredY(actor, hopArc, flight, progress);
  const settled = settleBird(actor, perching, deltaSeconds, reducedScale, context.score);
  steerBird(actor, perching, flight, desiredY, deltaSeconds, context.score);
  const speed = accelerateAndMove(actor, birdTargetSpeed(perching, hopping, reducedScale, context.score), deltaSeconds, context.score);
  actor.angle = isLowMotion(context.preferences) ? 0 : clamp(actor.vy * .22, -.13, .13);
  const wing = Math.sin(time * .019) * (flight ? 1 : 0);
  applyBirdVisuals(actor, wing, hopArc, flight, speed, context.score);
  advanceBirdPose(actor, flight, deltaSeconds, context.preferences);
  actor.state = birdActorState(perching, settled, actor.currentSpeed);
};

const birdHopArc = (hopping: boolean, progress: number, preferences: SimulationPreferences): number => hopping && !isLowMotion(preferences) ? 4 * progress * (1 - progress) : 0;
const birdDesiredY = (actor: MutableActor, hopArc: number, flight: boolean, progress: number): number => actor.anchorY - hopArc * .055 - (flight ? Math.sin(progress * Math.PI) * (.14 + Math.abs(actor.turnBias) * .05) : 0);
const birdDirection = (actor: MutableActor): number => {
  if (actor.x < .18) return 1;
  if (actor.x > .82) return -1;
  return actor.vx < 0 ? -1 : 1;
};
const settleBird = (actor: MutableActor, perching: boolean, deltaSeconds: number, reducedScale: number, score: SceneScore): boolean => perching && approachSurface(actor, actor.x, actor.anchorY, deltaSeconds, score.baseSpeed * .82, reducedScale, score);
const steerBird = (actor: MutableActor, perching: boolean, flight: boolean, desiredY: number, deltaSeconds: number, score: SceneScore): void => {
  if (!perching) steer(actor, birdDirection(actor), (desiredY - actor.y) * (flight ? 5 : 9), deltaSeconds, flight ? 2.6 : 6, score);
};
const birdTargetSpeed = (perching: boolean, hopping: boolean, reducedScale: number, score: SceneScore): number => perching ? 0 : score.baseSpeed * (hopping ? .95 : 2.35) * reducedScale;
const applyBirdVisuals = (actor: MutableActor, wing: number, hopArc: number, flight: boolean, speed: number, score: SceneScore): void => {
  actor.stretchX = 1 + wing * .035; actor.stretchY = 1 - wing * .055;
  actor.scale = actor.baseScale * (1 + hopArc * .035 + (flight ? .045 : 0));
  actor.motionEnergy = clamp(speed / score.maxSpeed + Math.abs(wing) * .35, 0, 1); actor.propulsion = flight ? Math.abs(wing) : hopArc;
};
const advanceBirdPose = (actor: MutableActor, flight: boolean, deltaSeconds: number, preferences: SimulationPreferences): void => {
  if (flight) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(preferences) ? .45 : 1.35)) % 1;
};
const birdActorState = (perching: boolean, settled: boolean, currentSpeed: number): MutableActor["state"] => perching && settled && currentSpeed <= .01 ? "paused" : "moving";

const advanceKoi = (actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, context: ActorMotionContext): void => {
  const seconds = time / 1000, pattern = Math.abs(Math.floor(time / 8_500)) % 3;
  const bout = ((seconds / 1.8 + actor.phase * .00011) % 1 + 1) % 1, burst = smoothstep(0, .16, bout) * (1 - smoothstep(.38, .68, bout));
  const gliding = behavior.state === "gliding", reappearing = behavior.state === "reappearing";
  const targetPropulsion = gliding ? .02 : reappearing ? .32 : pattern === 0 ? .34 : pattern === 1 ? burst * .62 : .24;
  const propulsion = lerp(actor.propulsion, targetPropulsion, deltaSeconds * 1.45), turnRate = pattern === 2 ? .32 : pattern === 1 ? .12 : .2;
  const turn = Math.sin(seconds * (pattern === 2 ? .28 : .16) + actor.turnBias * 2.4) * turnRate + Math.sin(seconds * .07) * .06;
  rotateVelocity(actor, turn * deltaSeconds * reducedScale);
  const depth = Math.sin(seconds * .18 + actor.phase * .001), speedFactor = gliding ? .42 : reappearing ? .58 : pattern === 1 ? .34 + propulsion * .72 : pattern === 2 ? .54 : .68;
  const speed = accelerateAndMove(actor, context.score.baseSpeed * speedFactor * reducedScale, deltaSeconds, context.score);
  actor.angle = Math.atan2(actor.vy, actor.vx) - Math.PI / 2; actor.scale = actor.baseScale * (1 + depth * (isLowMotion(context.preferences) ? .01 : .035)); actor.opacity = .92 + depth * .05;
  const tail = Math.sin(actor.posePhase * Math.PI * 2) * propulsion * (isLowMotion(context.preferences) ? .15 : 1);
  actor.stretchX = 1 + tail * .012; actor.stretchY = 1 - Math.abs(tail) * .008; actor.motionEnergy = clamp(speed / context.score.maxSpeed + propulsion * .35, 0, 1); actor.propulsion = propulsion;
  actor.posePhase = (actor.posePhase + deltaSeconds * (gliding ? .025 : .08 + propulsion * .32)) % 1; actor.state = "moving";
};

const advanceMoth = (actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number, context: ActorMotionContext): void => {
  const { landed, reappearing } = mothFlightState(behavior);
  const seconds = time / 1000, wingPhase = Math.sin(actor.posePhase * Math.PI * 2), stroke = mothStroke(landed, wingPhase);
  rotateVelocity(actor, (Math.sin(seconds * 1.7) * .72 + Math.sin(seconds * .47 + actor.turnBias) * .44) * deltaSeconds * stroke * reducedScale);
  const landing = mothLanding(actor);
  approachMothLanding(actor, behavior, progress, landing, deltaSeconds, context.score);
  const settled = settleMoth(actor, landed, landing, deltaSeconds, reducedScale, context.score);
  steerReappearingMoth(actor, reappearing, deltaSeconds, context.score);
  const speed = accelerateAndMove(actor, mothTargetSpeed(landed, reappearing, stroke, reducedScale, context.score), deltaSeconds, context.score);
  applyMothVisuals(actor, landed, wingPhase, stroke, speed, context);
  advanceMothPose(actor, landed, stroke, deltaSeconds, context.preferences);
  actor.state = landed && settled ? "paused" : "moving";
};

const mothFlightState = (behavior: SceneBehavior): MothFlightState => {
  return { landed: behavior.state === "landed", reappearing: behavior.state === "reappearing" };
};
const mothStroke = (landed: boolean, wingPhase: number): number => { return landed ? 0 : .42 + Math.abs(wingPhase) * .58; };
const mothApproach = (behavior: SceneBehavior, progress: number): number => { return behavior.state === "fluttering" ? smoothstep(.72, 1, progress) : 0; };
const mothLanding = (actor: MutableActor): Point => {
  return { x: actor.turnBias < 0 ? .075 : .925, y: .34 + Math.abs(actor.turnBias) * .22 };
};
const approachMothLanding = (actor: MutableActor, behavior: SceneBehavior, progress: number, landing: Point, deltaSeconds: number, score: SceneScore): void => {
  const approach = mothApproach(behavior, progress);
  if (approach > 0) steer(actor, landing.x - actor.x, landing.y - actor.y, deltaSeconds, approach * 2.8, score);
};
const settleMoth = (actor: MutableActor, landed: boolean, landing: Point, deltaSeconds: number, reducedScale: number, score: SceneScore): boolean => landed && approachSurface(actor, landing.x, landing.y, deltaSeconds, score.baseSpeed * .82, reducedScale, score);
const steerReappearingMoth = (actor: MutableActor, reappearing: boolean, deltaSeconds: number, score: SceneScore): void => {
  if (reappearing) steer(actor, actor.x < .5 ? 1 : -1, (.5 - actor.y) * 2, deltaSeconds, 2.8, score);
};
const mothTargetSpeed = (landed: boolean, reappearing: boolean, stroke: number, reducedScale: number, score: SceneScore): number => { return landed ? 0 : score.baseSpeed * (reappearing ? .58 : .5 + stroke * .45) * reducedScale; };
const applyMothVisuals = (actor: MutableActor, landed: boolean, wingPhase: number, stroke: number, speed: number, context: ActorMotionContext): void => {
  const wing = isLowMotion(context.preferences) ? 0 : wingPhase;
  actor.angle = isLowMotion(context.preferences) ? 0 : Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + wing * .018; actor.stretchX = 1 + Math.abs(wing) * .12 * (landed ? 0 : 1); actor.stretchY = 1 - Math.abs(wing) * .075 * (landed ? 0 : 1);
  actor.scale = actor.baseScale; actor.motionEnergy = landed ? 0 : clamp(speed / context.score.maxSpeed + Math.abs(wing) * .35, 0, 1); actor.propulsion = stroke;
};
const advanceMothPose = (actor: MutableActor, landed: boolean, stroke: number, deltaSeconds: number, preferences: SimulationPreferences): void => {
  if (!landed) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(preferences) ? .35 : .9 + stroke * .35)) % 1;
};

const advanceBeetle = (actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number, context: ActorMotionContext): void => {
  const sheltering = behavior.state === "sheltering", reappearing = behavior.state === "reappearing", seconds = time / 1000, stride = .5 + .5 * Math.sin(seconds * 8.8);
  const activity = beetleActivity(sheltering, time, context.variants);
  const desiredY = beetleDesiredY(actor, seconds, reappearing);
  steer(actor, actor.vx < 0 ? -1 : 1, (desiredY - actor.y) * 3.5, deltaSeconds, 2.3, context.score);
  approachBeetleShelter(actor, behavior, progress, deltaSeconds, context.score);
  rotateVelocity(actor, Math.sin(seconds * 1.1) * deltaSeconds * .12 * activity);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * (.48 + stride * .38) * activity * reducedScale, deltaSeconds, context.score);
  const gait = isLowMotion(context.preferences) ? 0 : Math.sin(seconds * 8.8) * activity;
  actor.angle = Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + gait * .01; actor.stretchX = 1 + gait * .018; actor.stretchY = 1 - gait * .012; actor.scale = actor.baseScale; actor.motionEnergy = clamp(speed / context.score.maxSpeed + Math.abs(gait) * .18, 0, 1); actor.propulsion = stride * activity;
  advanceBeetlePose(actor, activity, stride, deltaSeconds, context.preferences);
  actor.state = sheltering || activity < .08 ? "paused" : "moving";
};

const beetleActivity = (sheltering: boolean, time: number, variants: VariantSelection): number => sheltering ? 0 : variants.motion === "intermittent" ? 1 - pulse(time % 3_900, 2_950, 3_650, 150) : 1;
const beetleDesiredY = (actor: MutableActor, seconds: number, reappearing: boolean): number => actor.anchorY + Math.sin(seconds * .31 + actor.turnBias) * .045 + (reappearing ? -.05 : 0);
const approachBeetleShelter = (actor: MutableActor, behavior: SceneBehavior, progress: number, deltaSeconds: number, score: SceneScore): void => {
  const approach = behavior.state === "crawling" ? smoothstep(.68, 1, progress) : 0;
  if (approach <= 0) return;
  const shelter = actor.turnBias < 0 ? { x: .25, y: .44 } : { x: .75, y: .6 };
  steer(actor, shelter.x - actor.x, shelter.y - actor.y, deltaSeconds, 2.2 * approach, score);
};
const advanceBeetlePose = (actor: MutableActor, activity: number, stride: number, deltaSeconds: number, preferences: SimulationPreferences): void => {
  if (activity > .08) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(preferences) ? .35 : .85 + stride * .25)) % 1;
};

const advanceString = (actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number, context: ActorMotionContext): void => {
  const seconds = time / 1000, resting = behavior.state === "resting", pull = resting ? 0 : pulse((progress * 3) % 1, 0, .68, .12), activity = resting ? 0 : .28 + pull * .72;
  const targetX = .5 + Math.sin(seconds * .43 + actor.turnBias) * .34, targetY = .53 + Math.sin(seconds * .71 + actor.phase * .0007) * .2 + Math.cos(seconds * .27) * .055, desired = normalize(targetX - actor.x, targetY - actor.y);
  steer(actor, desired.x, desired.y, deltaSeconds, 4.2, context.score);
  const speed = accelerateAndMove(actor, context.score.baseSpeed * (.58 + .42 * pull) * activity * reducedScale, deltaSeconds, context.score), deformation = Math.sin(seconds * 3.3) * (isLowMotion(context.preferences) ? 0 : 1);
  actor.angle = Math.atan2(actor.vy, actor.vx) + Math.PI / 2; actor.stretchX = 1 - deformation * .035; actor.stretchY = 1 + deformation * .06; actor.scale = actor.baseScale * (1 + activity * .035); actor.motionEnergy = clamp(speed / context.score.maxSpeed + pull * .3, 0, 1); actor.propulsion = pull; actor.state = resting ? "paused" : "moving";
};

const applyOcclusion = (actor: MutableActor, context: ActorMotionContext): void => {
  const occlusion = occlusionStrength(context.sceneId, actor, context.score);
  if (occlusion > .04) { actor.opacity *= lerp(1, context.sceneId === "koi-pool" ? .38 : .2, occlusion); actor.state = occlusion > .52 ? "occluded" : actor.state; }
  if (actor.responseUntilMs > context.elapsedMs) { actor.scale *= 1 + Math.sin((actor.responseUntilMs - context.elapsedMs) / 650 * Math.PI) * .075; actor.motionEnergy = 1; }
};

const syncRendererFields = (actor: MutableActor, context: ActorMotionContext): void => {
  actor.alpha = actor.opacity; actor.scaleX = actor.stretchX; actor.scaleY = actor.stretchY; actor.depth = 2 + actor.y;
  const authored = behaviorAt(context.score, context.elapsedMs + actor.phase, context.variants.motion === "continuous", actor.phase);
  actor.stateProgress = context.sceneId === "red-string" ? actor.propulsion : authored.progress;
  const poseProgress = poseProgressFor(context.sceneId, authored.behavior.state, authored.progress, actor.posePhase);
  actor.poseFrame = authored.behavior.poseFrames.at(Math.min(authored.behavior.poseFrames.length - 1, Math.floor(poseProgress * authored.behavior.poseFrames.length))) ?? 0;
  actor.animationState = actor.state === "hidden" ? "reappearing" : actor.state === "occluded" ? sceneAnimationState(context.sceneId, "occluded") : actor.state === "paused" ? sceneAnimationState(context.sceneId, actor.state) : authored.behavior.state;
};

const rotateVelocity = (actor: MutableActor, radians: number): void => {
  const cosine = Math.cos(radians), sine = Math.sin(radians), direction = normalize(actor.vx * cosine - actor.vy * sine, actor.vx * sine + actor.vy * cosine);
  actor.vx = direction.x; actor.vy = direction.y;
};

const steer = (actor: MutableActor, desiredX: number, desiredY: number, deltaSeconds: number, responsiveness: number, score: SceneScore): void => {
  const desired = normalize(desiredX, desiredY), currentAngle = Math.atan2(actor.vy, actor.vx), desiredAngle = Math.atan2(desired.y, desired.x), angularDifference = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
  const maximumTurn = Math.min(responsiveness * deltaSeconds, score.maxAcceleration * .62 * deltaSeconds / Math.max(actor.currentSpeed, .012));
  const nextAngle = currentAngle + clamp(angularDifference, -maximumTurn, maximumTurn); actor.vx = Math.cos(nextAngle); actor.vy = Math.sin(nextAngle);
};

const accelerateAndMove = (actor: MutableActor, targetSpeed: number, deltaSeconds: number, score: SceneScore): number => {
  actor.currentSpeed += clamp(clamp(targetSpeed, 0, score.maxSpeed) - actor.currentSpeed, -score.maxAcceleration * .62 * deltaSeconds, score.maxAcceleration * .62 * deltaSeconds);
  actor.x += actor.vx * actor.currentSpeed * deltaSeconds; actor.y += actor.vy * actor.currentSpeed * deltaSeconds; return actor.currentSpeed;
};

const keepInsideFrame = (actor: MutableActor, deltaSeconds: number, score: SceneScore): void => {
  const marginX = .18, marginY = .16; let avoidX = actor.vx, avoidY = actor.vy;
  if (actor.x < marginX) avoidX += (marginX - actor.x) * 24; if (actor.x > 1 - marginX) avoidX -= (actor.x - (1 - marginX)) * 24;
  if (actor.y < marginY) avoidY += (marginY - actor.y) * 24; if (actor.y > 1 - marginY) avoidY -= (actor.y - (1 - marginY)) * 24;
  steer(actor, avoidX, avoidY, deltaSeconds, 5.5, score);
};

const occlusionStrength = (sceneId: SceneId, actor: MutableActor, score: SceneScore): number => {
  const zoneStrength = score.occlusionZones.reduce((strongest, zone) => {
    const feather = sceneId === "koi-pool" ? .07 : .035;
    return Math.max(strongest, smoothstep(zone.minX - feather, zone.minX + feather, actor.x) * (1 - smoothstep(zone.maxX - feather, zone.maxX + feather, actor.x)) * smoothstep(zone.minY - feather, zone.minY + feather, actor.y) * (1 - smoothstep(zone.maxY - feather, zone.maxY + feather, actor.y)));
  }, 0);
  const fullCover = actor.animationState === "reappearing" || actor.animationState === "sheltering";
  return zoneStrength * (fullCover ? 1 : sceneId === "koi-pool" ? .72 : sceneId === "balcony-birds" || sceneId === "paper-moth" ? .44 : .58);
};

const approachSurface = (actor: MutableActor, targetX: number, targetY: number, deltaSeconds: number, maximumSpeed: number, motionScale: number, score: SceneScore): boolean => {
  const offsetX = targetX - actor.x, offsetY = targetY - actor.y, distance = Math.hypot(offsetX, offsetY), direction = normalize(offsetX, offsetY), desiredSpeed = Math.min(maximumSpeed * motionScale, distance * 1.5), velocityChange = score.maxAcceleration * .42 * deltaSeconds;
  actor.surfaceVx += clamp(direction.x * desiredSpeed - actor.surfaceVx, -velocityChange, velocityChange); actor.surfaceVy += clamp(direction.y * desiredSpeed - actor.surfaceVy, -velocityChange, velocityChange); actor.x += actor.surfaceVx * deltaSeconds; actor.y += actor.surfaceVy * deltaSeconds;
  return distance < .014 && Math.hypot(actor.surfaceVx, actor.surfaceVy) < .008;
};

export { advanceActorForFixedStep, scenePhaseAt };
