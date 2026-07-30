import { getContentManifest } from "../content/registry";
import { SceneId, VariantSelection } from "../content/types";
import { AnimationState, EncounterBeat, InteractionPolicy, Point, SceneActorSnapshot, SceneDefinition, SceneEvent, SceneScore, SceneSimulation, SceneSnapshot, SimulationPreferences, SoundEvent, TouchResponse } from "./types";
import { behaviorAt, clamp, contactResponseFor, initialPlacement, isLowMotion, lerp, normalize, poseProgressFor, pulse, sceneAnimationState, signatureEffect, smoothstep } from "./simulationPrimitives";

export const defaultVariantSelection: VariantSelection = { figureGround: "natural", motion: "intermittent", sound: "off", novelty: "familiar" };

const frame = { minX: .045, maxX: .955, minY: .065, maxY: .935 } as const;
type RawSceneScore = Omit<SceneScore, "encounter" | "interactionPolicy">;
type SceneBehavior = SceneScore["behaviors"][number];
const authoredSceneScores: Readonly<Record<SceneId, RawSceneScore>> = {
  "balcony-birds": { id: "balcony-birds", durationMs: 105_000, actorCount: [1, 2], baseSpeed: .078, maxSpeed: .31, maxAcceleration: .76, displayWidth: .2, containment: frame, subjectHitRadius: .14, authoredStates: ["perching", "hopping", "flying", "reappearing"], touchPolicy: { refractoryMs: 5_000, allowedResponses: ["reroute", "pause"] }, audioEventKinds: ["ordinary-call", "wing"], behaviors: [{ state: "perching", durationMs: [5_000, 9_500], poseFrames: [0, 1, 0, 2], trajectory: "perch" }, { state: "hopping", durationMs: [700, 1_100], poseFrames: [3], trajectory: "perch" }, { state: "flying", durationMs: [1_500, 2_800], poseFrames: [4, 5, 6, 5], trajectory: "spline" }, { state: "reappearing", durationMs: [700, 1_200], poseFrames: [4, 5, 6, 5], trajectory: "spline" }], trajectoryRule: "Rail-aligned perch points joined by short eased arcs; flight exits re-enter behind the nearest rail or planter.", occlusionZones: [{ id: "rail", minX: 0, maxX: 1, minY: .68, maxY: 1 }, { id: "planter", minX: .04, maxX: .31, minY: .62, maxY: .9 }], audioEventMappings: { "ordinary-call": "perching", wing: "flying" }, lowMotionOverride: { actorCount: 1, travelScale: .28, deformationScale: 0, maxSimultaneousEvents: 1 } },
  "koi-pool": { id: "koi-pool", durationMs: 120_000, actorCount: [1, 3], baseSpeed: .032, maxSpeed: .1, maxAcceleration: .2, displayWidth: .18, containment: frame, subjectHitRadius: .13, authoredStates: ["swimming", "gliding", "reappearing"], touchPolicy: { refractoryMs: 4_500, allowedResponses: ["redirect"] }, audioEventKinds: ["quiet-water"], behaviors: [{ state: "gliding", durationMs: [4_200, 7_500], poseFrames: [5], trajectory: "spline" }, { state: "swimming", durationMs: [5_500, 9_500], poseFrames: [5, 1, 5, 7], trajectory: "spline" }, { state: "reappearing", durationMs: [900, 1_600], poseFrames: [5, 1, 5, 7], trajectory: "spline" }], trajectoryRule: "Independent broad arcs with gradual tangent changes; short propulsive bouts alternate with straight-body coasts.", occlusionZones: [{ id: "plant-shadow", minX: .55, maxX: .96, minY: .68, maxY: .94 }], audioEventMappings: { "quiet-water": "swimming" }, lowMotionOverride: { actorCount: 1, travelScale: .32, deformationScale: .18, maxSimultaneousEvents: 1 } },
  "paper-moth": { id: "paper-moth", durationMs: 90_000, actorCount: [1, 1], baseSpeed: .09, maxSpeed: .24, maxAcceleration: .64, displayWidth: .16, containment: frame, subjectHitRadius: .13, authoredStates: ["fluttering", "landed", "reappearing"], touchPolicy: { refractoryMs: 4_000, allowedResponses: ["reroute", "land"] }, audioEventKinds: ["paper-flutter"], behaviors: [{ state: "fluttering", durationMs: [1_800, 3_800], poseFrames: [0, 1, 2, 3, 2, 1], trajectory: "flutter" }, { state: "landed", durationMs: [5_000, 10_000], poseFrames: [0], trajectory: "perch" }, { state: "reappearing", durationMs: [800, 1_400], poseFrames: [0, 1, 2, 3, 2, 1], trajectory: "flutter" }], trajectoryRule: "Short heading-persistent passages terminate at the window or frame; re-entry begins near the last disappearance.", occlusionZones: [{ id: "window-frame", minX: .86, maxX: 1, minY: 0, maxY: 1 }, { id: "lamp-edge", minX: 0, maxX: .08, minY: 0, maxY: 1 }], audioEventMappings: { "paper-flutter": "fluttering" }, lowMotionOverride: { actorCount: 1, travelScale: .25, deformationScale: .15, maxSimultaneousEvents: 1 } },
  "beetle-under-the-fern": { id: "beetle-under-the-fern", durationMs: 95_000, actorCount: [1, 1], baseSpeed: .042, maxSpeed: .105, maxAcceleration: .3, displayWidth: .14, containment: frame, subjectHitRadius: .11, authoredStates: ["crawling", "sheltering", "reappearing"], touchPolicy: { refractoryMs: 4_000, allowedResponses: ["pause", "reverse", "hide"] }, audioEventKinds: ["leaf-scratch"], behaviors: [{ state: "crawling", durationMs: [5_000, 9_500], poseFrames: [0, 1, 2, 3], trajectory: "ground" }, { state: "sheltering", durationMs: [3_000, 6_500], poseFrames: [7], trajectory: "ground" }, { state: "reappearing", durationMs: [900, 1_500], poseFrames: [0, 1, 2, 3], trajectory: "ground" }], trajectoryRule: "Low ground-plane segments follow fern margins with antenna pauses and reversible headings.", occlusionZones: [{ id: "left-fern", minX: 0, maxX: .3, minY: .08, maxY: .46 }, { id: "right-fern", minX: .7, maxX: 1, minY: .25, maxY: .65 }], audioEventMappings: { "leaf-scratch": "crawling" }, lowMotionOverride: { actorCount: 1, travelScale: .3, deformationScale: .2, maxSimultaneousEvents: 1 } },
  "red-string": { id: "red-string", durationMs: 100_000, actorCount: [1, 1], baseSpeed: .07, maxSpeed: .18, maxAcceleration: .55, displayWidth: .04, containment: frame, subjectHitRadius: .13, authoredStates: ["dragging", "resting", "reappearing"], touchPolicy: { refractoryMs: 3_500, allowedResponses: ["pause", "redirect"] }, audioEventKinds: ["fabric-drag"], behaviors: [{ state: "dragging", durationMs: [3_600, 6_900], poseFrames: [0, 1, 2, 4, 7], trajectory: "rope" }, { state: "resting", durationMs: [2_400, 4_600], poseFrames: [3, 5], trajectory: "rope" }, { state: "reappearing", durationMs: [600, 1_000], poseFrames: [6, 7], trajectory: "rope" }], trajectoryRule: "Spline control points alternate tensioned pulls and slack curves with bounded partial edge exits.", occlusionZones: [{ id: "left-edge", minX: 0, maxX: .055, minY: 0, maxY: 1 }, { id: "right-edge", minX: .945, maxX: 1, minY: 0, maxY: 1 }], audioEventMappings: { "fabric-drag": "dragging" }, lowMotionOverride: { actorCount: 1, travelScale: .3, deformationScale: .25, maxSimultaneousEvents: 1 } },
};
const encounterStates: Record<SceneId, readonly [AnimationState, AnimationState, AnimationState]> = {
  "balcony-birds": ["perching", "flying", "perching"], "koi-pool": ["gliding", "swimming", "gliding"], "paper-moth": ["landed", "fluttering", "landed"], "beetle-under-the-fern": ["sheltering", "crawling", "sheltering"], "red-string": ["resting", "dragging", "resting"],
};
function encounterFor(score: RawSceneScore): readonly EncounterBeat[] {
  const [resting, moving, finale] = encounterStates[score.id];
  const trajectory = score.behaviors.find((behavior) => behavior.state === moving)?.trajectory ?? score.behaviors[0].trajectory;
  const beat = (phase: EncounterBeat["phase"], fraction: readonly [number, number], behaviorState: AnimationState, rule: string): EncounterBeat => ({ id: `${score.id}:${phase}`, phase, durationMs: [score.durationMs * fraction[0], score.durationMs * fraction[1]], behaviorState, trajectory, occlusionRule: rule, actorCap: score.actorCount[1], eligibleAudioEvent: score.audioEventKinds[0], allowedContactResponse: score.touchPolicy.allowedResponses });
  return [beat("invitation", [.07, .09], resting, "Subject remains plainly visible."), beat("passage", [.29, .31], moving, "Movement follows the authored corridor."), beat("occlusion", [.08, .1], moving, "Use the nearest authored cover zone."), beat("reappearance", [.08, .1], "reappearing", "Return adjacent to the last cover location."), beat("contact-response", [.12, .14], moving, "A contact may alter this beat once."), beat("rest", [.17, .19], resting, "Motion settles without adding stimuli."), beat("finale", [.12, .14], finale, "Subject finishes visibly at rest.")];
}
function completeScore(score: RawSceneScore): SceneScore {
  const normalized = score.id === "koi-pool" ? { ...score, actorCount: [1, 1] as const } : score;
  const interactionPolicy: InteractionPolicy = { targetOnly: true, hitTolerance: normalized.subjectHitRadius, refractoryMs: normalized.touchPolicy.refractoryMs, rollingContactCap: { contacts: 3, windowMs: 20_000 }, restResponse: { durationMs: [10_000, 12_000], editorialSafetyCap: true }, neverEscalate: true };
  return { ...normalized, encounter: encounterFor(normalized), interactionPolicy };
}
export const sceneScores: Readonly<Record<SceneId, SceneScore>> = Object.fromEntries(Object.entries(authoredSceneScores).map(([id, score]) => [id, completeScore(id === "balcony-birds" ? { ...score, touchPolicy: { refractoryMs: 5_000, allowedResponses: ["head-turn", "hop"] } } : score)])) as unknown as Readonly<Record<SceneId, SceneScore>>;
export const sceneDefinitions: Readonly<Record<SceneId, SceneDefinition>> = sceneScores;

interface MutableActor extends SceneActorSnapshot {
  stretchX: number;
  stretchY: number;
  motionEnergy: number;
  vx: number;
  vy: number;
  pauseUntilMs: number;
  hiddenUntilMs: number;
  responseUntilMs: number;
  baseScale: number;
  phase: number;
  anchorY: number;
  turnBias: number;
  currentSpeed: number;
  propulsion: number;
  posePhase: number;
  surfaceVx: number;
  surfaceVy: number;
}

function snapshotActor(actor: MutableActor): SceneActorSnapshot {
  return {
    id: actor.id,
    x: actor.x,
    y: actor.y,
    angle: actor.angle,
    state: actor.state,
    visible: actor.visible,
    scale: actor.scale,
    opacity: actor.opacity,
    facing: actor.facing,
    animationState: actor.animationState,
    poseFrame: actor.poseFrame,
    stateProgress: actor.stateProgress,
    depth: actor.depth,
    alpha: actor.alpha,
    scaleX: actor.scaleX,
    scaleY: actor.scaleY,
  };
}
class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
  next(): number { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0x1_0000_0000; }
  signed(): number { return this.next() * 2 - 1; }
}
export function createSceneSimulation(sceneId: SceneId, variants: VariantSelection = defaultVariantSelection, seed = 1, preferences: SimulationPreferences = {}): SceneSimulation {
  const definition = sceneDefinitions[sceneId];
  const score = sceneScores[sceneId];
  const manifest = getContentManifest(sceneId);
  let random = new SeededRandom(seed);
  const actorCount = isLowMotion(preferences) ? score.lowMotionOverride.actorCount : definition.actorCount[0] + Math.floor(random.next() * (definition.actorCount[1] - definition.actorCount[0] + 1));
  let elapsedMs = 0;
  let refractoryUntilMs = 0;
  let acceptedContactTimes: number[] = [];
  let reminder: Extract<SceneEvent, { type: "contact-reminder" }> | undefined;
  let forcedRestUntilMs = 0;
  let lastPhase = phaseAt(0).phase;
  let completionEventSent = false;
  let frameEvents: SceneEvent[] = [];
  let pendingEvents: SceneEvent[] = [];
  let accumulatorMs = 0;
  let lastSoundBucket = -1;
  let actors: MutableActor[] = createActors(sceneId, actorCount, random);
  let soundEvents: SoundEvent[] = [];
  function advance(deltaMs: number): SceneSnapshot {
    const boundedDelta = clamp(Number.isFinite(deltaMs) ? deltaMs : 0, 0, 10_000);
    accumulatorMs += boundedDelta;
    frameEvents = pendingEvents;
    pendingEvents = [];
    // A fixed clock makes the same seeded scene reach the same state regardless
    // of whether the renderer supplies 60fps, 30fps, or a coalesced frame.
    const fixedStepMs = 1000 / 60;
    while (accumulatorMs + 1e-6 >= fixedStepMs && elapsedMs < definition.durationMs) {
      accumulatorMs -= fixedStepMs;
      advanceFixedStep(fixedStepMs);
    }
    if (elapsedMs >= definition.durationMs) accumulatorMs = 0;
    soundEvents = frameEvents.filter((event): event is Extract<SceneEvent, { type: "audio" }> => event.type === "audio").map(({ kind, x, y, atMs }) => ({ kind, x, y, atMs }));
    return snapshot();
  }
  function advanceFixedStep(stepMs: number): void {
    const boundedDelta = Math.min(stepMs, definition.durationMs - elapsedMs);
    elapsedMs = Math.min(definition.durationMs, elapsedMs + boundedDelta);
    const encounter = phaseAt(elapsedMs);
    if (encounter.phase !== lastPhase) { frameEvents.push({ type: "phase-change", phase: encounter.phase, beatId: encounter.id, atMs: elapsedMs }); lastPhase = encounter.phase; }
    for (const actor of actors) {
      resetVisualState(actor);
      if (elapsedMs < forcedRestUntilMs || encounter.phase === "finale") {
        actor.visible = true; actor.state = "paused"; actor.currentSpeed = 0; actor.propulsion = 0; actor.motionEnergy = 0; actor.animationState = encounter.behaviorState; syncRendererFields(actor, elapsedMs, variants); continue;
      }
      if (actor.hiddenUntilMs > elapsedMs) { actor.visible = false; actor.state = "hidden"; syncRendererFields(actor, elapsedMs, variants); continue; }
      actor.visible = true;
      if (actor.pauseUntilMs > elapsedMs) {
        actor.state = "paused";
        actor.currentSpeed = 0;
        actor.propulsion = 0;
        actor.motionEnergy = 0;
        actor.scale = actor.baseScale * (1 + (actor.responseUntilMs > elapsedMs ? 0.055 : 0));
        syncRendererFields(actor, elapsedMs, variants);
        continue;
      }
      advanceAuthoredActor(actor, boundedDelta);
      applyOcclusion(actor);
      syncRendererFields(actor, elapsedMs, variants);
    }
    const soundBucket = Math.floor(elapsedMs / (sceneId === "koi-pool" ? 14_000 : 7_000));
    if (variants.sound === "on" && manifest.audio && soundBucket > 0 && soundBucket !== lastSoundBucket) {
      const actor = actors[Math.floor(elapsedMs / 7000) % actors.length];
      const kind = definition.audioEventKinds[Math.floor(elapsedMs / 7000) % definition.audioEventKinds.length];
      if (score.audioEventMappings[kind] === actor.animationState && actor.visible) {
        soundEvents = [{ kind, x: actor.x, y: actor.y, atMs: elapsedMs }];
        frameEvents.push({ type: "audio", ...soundEvents[0] });
        lastSoundBucket = soundBucket;
      } else soundEvents = [];
    } else soundEvents = [];
    if (elapsedMs >= definition.durationMs && !completionEventSent) { frameEvents.push({ type: "complete", atMs: elapsedMs }); completionEventSent = true; }
  }
  function touch(point: Point, timestampMs = elapsedMs): TouchResponse {
    if (touchDisabled(timestampMs)) return { accepted: false, refractoryUntilMs };
    const actor = closestVisibleActor(point);
    if (!actor || isOutsideTouchRadius(actor, point)) return { accepted: false, refractoryUntilMs };
    const response = contactResponseFor(sceneId, actor.animationState, phaseAt(elapsedMs).phase, definition.touchPolicy.allowedResponses);
    refractoryUntilMs = timestampMs + definition.touchPolicy.refractoryMs;
    actor.responseUntilMs = timestampMs + 650;
    applyTouchResponse(actor, response, point, timestampMs);
    recordAcceptedTouch(timestampMs);
    pendingEvents.push({ type: "contact-accepted", actorId: actor.id, atMs: timestampMs }, { type: "contact-response", actorId: actor.id, response, atMs: timestampMs });
    startContactRestIfNeeded(timestampMs);
    // Responses never modify base speed, audio, duration, or later touch intensity.
    return { accepted: true, response, refractoryUntilMs };
  }
  function touchDisabled(timestampMs: number): boolean {
    return preferences.playbackMode === "tv-passive" || elapsedMs >= definition.durationMs || timestampMs < refractoryUntilMs || timestampMs < forcedRestUntilMs || definition.touchPolicy.allowedResponses.length === 0;
  }
  function closestVisibleActor(point: Point): MutableActor | undefined {
    return actors.filter((actor) => actor.visible).reduce<MutableActor | undefined>((closest, candidate) => !closest || distanceTo(candidate, point) < distanceTo(closest, point) ? candidate : closest, undefined);
  }
  function distanceTo(actor: MutableActor, point: Point): number { return Math.hypot(actor.x - point.x, actor.y - point.y); }
  function isOutsideTouchRadius(actor: MutableActor, point: Point): boolean { return distanceTo(actor, point) > touchRadius(sceneId); }
  function applyTouchResponse(actor: MutableActor, response: TouchResponse["response"], point: Point, timestampMs: number): void {
    if (response === "reroute" || response === "redirect") { rerouteActor(actor, point); return; }
    applyStationaryTouchResponse(actor, response, timestampMs);
  }
  function applyStationaryTouchResponse(actor: MutableActor, response: TouchResponse["response"], timestampMs: number): void {
    switch (response) {
      case "head-turn": reverseFacingAndPause(actor, timestampMs); break;
      case "hop": actor.pauseUntilMs = timestampMs + 420; break;
      case "reverse": reverseActor(actor); break;
      case "pause": case "land": actor.pauseUntilMs = timestampMs + 1_050; break;
      case "hide": actor.hiddenUntilMs = timestampMs + 1_250; break;
      default: break;
    }
  }
  function rerouteActor(actor: MutableActor, point: Point): void { const vector = normalize(actor.x - point.x, actor.y - point.y); actor.vx = vector.x; actor.vy = vector.y; }
  function reverseFacingAndPause(actor: MutableActor, timestampMs: number): void { actor.facing = actor.facing === 1 ? -1 : 1; actor.pauseUntilMs = timestampMs + 650; }
  function reverseActor(actor: MutableActor): void { actor.vx *= -1; actor.vy *= -1; }
  function recordAcceptedTouch(timestampMs: number): void { acceptedContactTimes = [...acceptedContactTimes, timestampMs].filter((contactTime) => timestampMs - contactTime <= 20_000); }
  function startContactRestIfNeeded(timestampMs: number): void {
    if (acceptedContactTimes.length < 3 || reminder) return;
    const restDuration = 10_000 + Math.floor(random.next() * 2_001);
    forcedRestUntilMs = timestampMs + restDuration;
    for (const actor of actors) actor.pauseUntilMs = Math.max(actor.pauseUntilMs, forcedRestUntilMs);
    reminder = { type: "contact-reminder", id: "three-contacts", acceptedContacts: 3, windowMs: 20_000, dismissible: true, editorialSafetyCap: true, atMs: timestampMs };
    pendingEvents.push({ type: "rest-window", reason: "editorial-contact-cap", durationMs: restDuration, atMs: timestampMs }, reminder);
  }
  function snapshot(): SceneSnapshot {
    const encounter = elapsedMs < forcedRestUntilMs ? { ...phaseAt(elapsedMs), phase: "rest" as const, id: `${sceneId}:contact-rest` } : phaseAt(elapsedMs);
    return {
      sceneId,
      elapsedMs,
      durationMs: definition.durationMs,
      complete: elapsedMs >= definition.durationMs,
      phase: encounter.phase,
      beatId: encounter.id,
      remainingMs: Math.max(0, definition.durationMs - elapsedMs),
      signatureEffect: signatureEffect(sceneId, encounter.phase, actors[0]),
      actors: actors.map(snapshotActor),
      soundEvents: [...soundEvents],
      events: reminder && ![...frameEvents, ...pendingEvents].some((event) => event.type === "contact-reminder") ? [...frameEvents, ...pendingEvents, reminder] : [...frameEvents, ...pendingEvents],
      reminder,
    };
  }
  function reset(): SceneSnapshot { elapsedMs = 0; accumulatorMs = 0; refractoryUntilMs = 0; forcedRestUntilMs = 0; acceptedContactTimes = []; reminder = undefined; frameEvents = []; pendingEvents = []; lastSoundBucket = -1; lastPhase = phaseAt(0).phase; completionEventSent = false; random = new SeededRandom(seed); random.next(); actors = createActors(sceneId, actorCount, random); soundEvents = []; return snapshot(); }
  function dismissReminder(): SceneSnapshot { reminder = undefined; return snapshot(); }
  return { definition, variants, advance, touch, snapshot, reset, dismissReminder };

  function phaseAt(timeMs: number): EncounterBeat {
    const weights = definition.encounter.map((beat) => (beat.durationMs[0] + beat.durationMs[1]) / 2);
    const total = weights.reduce((sum, value) => sum + value, 0);
    let cursor = Math.min(timeMs, definition.durationMs - Number.EPSILON) / definition.durationMs * total;
    for (let index = 0; index < definition.encounter.length; index += 1) { if (cursor < weights[index]) return definition.encounter[index]; cursor -= weights[index]; }
    return definition.encounter[definition.encounter.length - 1];
  }

  function advanceAuthoredActor(actor: MutableActor, deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    const reducedScale = isLowMotion(preferences) ? score.lowMotionOverride.travelScale : 1;
    const time = elapsedMs + actor.phase;
    const authored = behaviorAt(score, time, variants.motion === "continuous", actor.phase);
    actor.animationState = authored.behavior.state;
    actor.stateProgress = authored.progress;
    if (sceneId === "balcony-birds") advanceBird(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress);
    else if (sceneId === "koi-pool") advanceKoi(actor, time, deltaSeconds, reducedScale, authored.behavior);
    else if (sceneId === "paper-moth") advanceMoth(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress);
    else if (sceneId === "beetle-under-the-fern") advanceBeetle(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress);
    else advanceString(actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress);
    actor.facing = actor.vx < 0 ? -1 : 1;
    keepInsideFrame(actor, deltaSeconds);
    actor.x = clamp(actor.x, definition.containment.minX, definition.containment.maxX);
    actor.y = clamp(actor.y, definition.containment.minY, definition.containment.maxY);
  }

  function advanceBird(actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number): void {
    const perching = behavior.state === "perching";
    const hopping = behavior.state === "hopping";
    const flight = behavior.state === "flying" || behavior.state === "reappearing";
    const hopArc = birdHopArc(hopping, progress);
    const direction = birdDirection(actor);
    const flightLift = birdFlightLift(flight, progress, actor.turnBias);
    const desiredY = actor.anchorY - hopArc * 0.055 - flightLift;
    const settledOnPerch = settleBirdOnPerch(actor, perching, deltaSeconds, reducedScale);
    const settlingToPerch = perching && (!settledOnPerch || actor.currentSpeed > .01);
    steerBirdWhenMoving(actor, perching, direction, desiredY, deltaSeconds, flight);
    const targetSpeed = birdTargetSpeed(perching, hopping, reducedScale);
    const speed = accelerateAndMove(actor, targetSpeed, deltaSeconds);
    actor.angle = birdAngle(actor);
    const wing = Math.sin(time * 0.019) * (flight ? 1 : 0);
    applyBirdVisuals(actor, wing, hopArc, flight, speed);
    advanceBirdPose(actor, flight, deltaSeconds);
    actor.state = perching && !settlingToPerch ? "paused" : "moving";
  }
  function birdHopArc(hopping: boolean, progress: number): number { return hopping && !isLowMotion(preferences) ? 4 * progress * (1 - progress) : 0; }
  function birdDirection(actor: MutableActor): number {
    if (actor.x < .18) return 1;
    if (actor.x > .82) return -1;
    return actor.vx < 0 ? -1 : 1;
  }
  function birdFlightLift(flight: boolean, progress: number, turnBias: number): number { return flight ? Math.sin(progress * Math.PI) * (0.14 + Math.abs(turnBias) * 0.05) : 0; }
  function settleBirdOnPerch(actor: MutableActor, perching: boolean, deltaSeconds: number, reducedScale: number): boolean { return perching ? approachSurface(actor, actor.x, actor.anchorY, deltaSeconds, definition.baseSpeed * .82, reducedScale) : false; }
  function steerBirdWhenMoving(actor: MutableActor, perching: boolean, direction: number, desiredY: number, deltaSeconds: number, flight: boolean): void { if (!perching) steer(actor, direction, (desiredY - actor.y) * (flight ? 5 : 9), deltaSeconds, flight ? 2.6 : 6); }
  function birdTargetSpeed(perching: boolean, hopping: boolean, reducedScale: number): number { return perching ? 0 : definition.baseSpeed * (hopping ? 0.95 : 2.35) * reducedScale; }
  function birdAngle(actor: MutableActor): number { return isLowMotion(preferences) ? 0 : clamp(actor.vy * 0.22, -0.13, 0.13); }
  function applyBirdVisuals(actor: MutableActor, wing: number, hopArc: number, flight: boolean, speed: number): void {
    actor.stretchX = 1 + wing * 0.035; actor.stretchY = 1 - wing * 0.055;
    actor.scale = actor.baseScale * (1 + hopArc * 0.035 + (flight ? 0.045 : 0));
    actor.motionEnergy = clamp(speed / definition.maxSpeed + Math.abs(wing) * 0.35, 0, 1);
    actor.propulsion = flight ? Math.abs(wing) : hopArc;
  }
  function advanceBirdPose(actor: MutableActor, flight: boolean, deltaSeconds: number): void { if (flight) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(preferences) ? .45 : 1.35)) % 1; }

  function advanceKoi(actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneScore["behaviors"][number]): void {
    const seconds = time / 1000;
    const pattern = Math.abs(Math.floor(time / 8_500)) % 3;
    const bout = ((seconds / 1.8 + actor.phase * .00011) % 1 + 1) % 1;
    const burst = smoothstep(0, .16, bout) * (1 - smoothstep(.38, .68, bout));
    const gliding = behavior.state === "gliding";
    const reappearing = behavior.state === "reappearing";
    const targetPropulsion = gliding ? 0.02 : reappearing ? 0.32 : pattern === 0 ? 0.34 : pattern === 1 ? burst * .62 : 0.24;
    const propulsion = lerp(actor.propulsion, targetPropulsion, deltaSeconds * 1.45);
    const turnRate = pattern === 2 ? 0.32 : pattern === 1 ? 0.12 : 0.2;
    const turn = Math.sin(seconds * (pattern === 2 ? .28 : .16) + actor.turnBias * 2.4) * turnRate + Math.sin(seconds * .07) * .06;
    rotateVelocity(actor, turn * deltaSeconds * reducedScale);
    const depth = Math.sin(seconds * 0.18 + actor.phase * 0.001);
    const speedFactor = gliding ? .42 : reappearing ? .58 : pattern === 1 ? .34 + propulsion * .72 : pattern === 2 ? .54 : .68;
    const speed = accelerateAndMove(actor, definition.baseSpeed * speedFactor * reducedScale, deltaSeconds);
    actor.angle = Math.atan2(actor.vy, actor.vx) - Math.PI / 2;
    actor.scale = actor.baseScale * (1 + depth * (isLowMotion(preferences) ? 0.01 : 0.035));
    actor.opacity = 0.92 + depth * 0.05;
    const tail = Math.sin(actor.posePhase * Math.PI * 2) * propulsion * (isLowMotion(preferences) ? .15 : 1);
    actor.stretchX = 1 + tail * 0.012;
    actor.stretchY = 1 - Math.abs(tail) * 0.008;
    actor.motionEnergy = clamp(speed / definition.maxSpeed + propulsion * .35, 0, 1);
    actor.propulsion = propulsion;
    actor.posePhase = (actor.posePhase + deltaSeconds * (gliding ? .025 : .08 + propulsion * .32)) % 1;
    actor.state = "moving";
  }

  function advanceMoth(actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number): void {
    const landed = behavior.state === "landed";
    const reappearing = behavior.state === "reappearing";
    const seconds = time / 1000;
    const wingPhase = Math.sin(actor.posePhase * Math.PI * 2);
    const stroke = landed ? 0 : .42 + Math.abs(wingPhase) * .58;
    const flutterTurn = Math.sin(seconds * 1.7) * .72 + Math.sin(seconds * .47 + actor.turnBias) * .44;
    rotateVelocity(actor, flutterTurn * deltaSeconds * stroke * reducedScale);
    const landing = mothLanding(actor);
    approachMothLanding(actor, behavior, progress, landing, deltaSeconds);
    const settledOnLanding = settleMoth(actor, landed, landing, deltaSeconds, reducedScale);
    steerReappearingMoth(actor, reappearing, deltaSeconds);
    const targetSpeed = mothTargetSpeed(landed, reappearing, stroke, reducedScale);
    const speed = accelerateAndMove(actor, targetSpeed, deltaSeconds);
    applyMothVisuals(actor, wingPhase, landed, stroke, speed);
    advanceMothPose(actor, landed, stroke, deltaSeconds);
    actor.state = landed && settledOnLanding ? "paused" : "moving";
  }
  function mothLanding(actor: MutableActor): Point { return { x: actor.turnBias < 0 ? .075 : .925, y: .34 + Math.abs(actor.turnBias) * .22 }; }
  function approachMothLanding(actor: MutableActor, behavior: SceneBehavior, progress: number, landing: Point, deltaSeconds: number): void { const approach = behavior.state === "fluttering" ? smoothstep(.72, 1, progress) : 0; if (approach > 0) steer(actor, landing.x - actor.x, landing.y - actor.y, deltaSeconds, approach * 2.8); }
  function settleMoth(actor: MutableActor, landed: boolean, landing: Point, deltaSeconds: number, reducedScale: number): boolean { return landed ? approachSurface(actor, landing.x, landing.y, deltaSeconds, definition.baseSpeed * .82, reducedScale) : false; }
  function steerReappearingMoth(actor: MutableActor, reappearing: boolean, deltaSeconds: number): void { if (reappearing) steer(actor, actor.x < .5 ? 1 : -1, (.5 - actor.y) * 2, deltaSeconds, 2.8); }
  function mothTargetSpeed(landed: boolean, reappearing: boolean, stroke: number, reducedScale: number): number { return landed ? 0 : definition.baseSpeed * (reappearing ? .58 : .5 + stroke * .45) * reducedScale; }
  function applyMothVisuals(actor: MutableActor, wingPhase: number, landed: boolean, stroke: number, speed: number): void {
    const wing = isLowMotion(preferences) ? 0 : wingPhase;
    actor.angle = isLowMotion(preferences) ? 0 : Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + wing * 0.018;
    actor.stretchX = 1 + Math.abs(wing) * 0.12 * (landed ? 0 : 1); actor.stretchY = 1 - Math.abs(wing) * 0.075 * (landed ? 0 : 1);
    actor.scale = actor.baseScale; actor.motionEnergy = landed ? 0 : clamp(speed / definition.maxSpeed + Math.abs(wing) * .35, 0, 1); actor.propulsion = stroke;
  }
  function advanceMothPose(actor: MutableActor, landed: boolean, stroke: number, deltaSeconds: number): void { if (!landed) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(preferences) ? .35 : .9 + stroke * .35)) % 1; }

  function advanceBeetle(actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number): void {
    const sheltering = behavior.state === "sheltering";
    const reappearing = behavior.state === "reappearing";
    const seconds = time / 1000;
    const stride = .5 + .5 * Math.sin(seconds * 8.8);
    const activity = beetleActivity(sheltering, time);
    const desiredY = beetleDesiredY(actor, seconds, reappearing);
    steer(actor, actor.vx < 0 ? -1 : 1, (desiredY - actor.y) * 3.5, deltaSeconds, 2.3);
    approachBeetleShelter(actor, behavior, progress, deltaSeconds);
    rotateVelocity(actor, Math.sin(seconds * 1.1) * deltaSeconds * .12 * activity);
    const speed = accelerateAndMove(actor, definition.baseSpeed * (.48 + stride * .38) * activity * reducedScale, deltaSeconds);
    applyBeetleVisuals(actor, seconds, activity, stride, speed);
    advanceBeetlePose(actor, activity, stride, deltaSeconds);
    actor.state = sheltering || activity < .08 ? "paused" : "moving";
  }
  function beetleActivity(sheltering: boolean, time: number): number { return sheltering ? 0 : variants.motion === "intermittent" ? 1 - pulse(time % 3_900, 2_950, 3_650, 150) : 1; }
  function beetleDesiredY(actor: MutableActor, seconds: number, reappearing: boolean): number { return actor.anchorY + Math.sin(seconds * 0.31 + actor.turnBias) * 0.045 + (reappearing ? -.05 : 0); }
  function approachBeetleShelter(actor: MutableActor, behavior: SceneBehavior, progress: number, deltaSeconds: number): void {
    const approach = behavior.state === "crawling" ? smoothstep(.68, 1, progress) : 0;
    if (approach > 0) { const shelter = beetleShelter(actor); steer(actor, shelter.x - actor.x, shelter.y - actor.y, deltaSeconds, 2.2 * approach); }
  }
  function beetleShelter(actor: MutableActor): Point { return actor.turnBias < 0 ? { x: .25, y: .44 } : { x: .75, y: .6 }; }
  function applyBeetleVisuals(actor: MutableActor, seconds: number, activity: number, stride: number, speed: number): void {
    const gait = isLowMotion(preferences) ? 0 : Math.sin(seconds * 8.8) * activity;
    actor.angle = Math.atan2(actor.vy, actor.vx) + Math.PI / 2 + gait * .01; actor.stretchX = 1 + gait * .018; actor.stretchY = 1 - gait * .012;
    actor.scale = actor.baseScale; actor.motionEnergy = clamp(speed / definition.maxSpeed + Math.abs(gait) * .18, 0, 1); actor.propulsion = stride * activity;
  }
  function advanceBeetlePose(actor: MutableActor, activity: number, stride: number, deltaSeconds: number): void { if (activity > .08) actor.posePhase = (actor.posePhase + deltaSeconds * (isLowMotion(preferences) ? .35 : .85 + stride * .25)) % 1; }

  function advanceString(actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneScore["behaviors"][number], progress: number): void {
    const seconds = time / 1000;
    const resting = behavior.state === "resting";
    const pull = resting ? 0 : pulse((progress * 3) % 1, 0, .68, .12);
    const activity = resting ? 0 : .28 + pull * .72;
    const targetX = 0.5 + Math.sin(seconds * 0.43 + actor.turnBias) * 0.34;
    const targetY = 0.53 + Math.sin(seconds * 0.71 + actor.phase * 0.0007) * 0.2 + Math.cos(seconds * 0.27) * 0.055;
    const desired = normalize(targetX - actor.x, targetY - actor.y);
    steer(actor, desired.x, desired.y, deltaSeconds, 4.2);
    const dragPulse = .58 + .42 * pull;
    const speed = accelerateAndMove(actor, definition.baseSpeed * dragPulse * activity * reducedScale, deltaSeconds);
    actor.angle = Math.atan2(actor.vy, actor.vx) + Math.PI / 2;
    actor.stretchX = 1 - Math.sin(seconds * 3.3) * (isLowMotion(preferences) ? 0 : 0.035);
    actor.stretchY = 1 + Math.sin(seconds * 3.3) * (isLowMotion(preferences) ? 0 : 0.06);
    actor.scale = actor.baseScale * (1 + activity * 0.035);
    actor.motionEnergy = clamp(speed / definition.maxSpeed + pull * .3, 0, 1);
    actor.propulsion = pull;
    actor.state = resting ? "paused" : "moving";
  }

  function applyOcclusion(actor: MutableActor): void {
    const occlusion = occlusionStrength(sceneId, actor);
    if (occlusion > 0.04) {
      actor.opacity *= lerp(1, sceneId === "koi-pool" ? 0.38 : 0.2, occlusion);
      actor.state = occlusion > 0.52 ? "occluded" : actor.state;
    }
    if (actor.responseUntilMs > elapsedMs) {
      const responseProgress = (actor.responseUntilMs - elapsedMs) / 650;
      actor.scale *= 1 + Math.sin(responseProgress * Math.PI) * 0.075;
      actor.motionEnergy = 1;
    }
  }
}

function resetVisualState(actor: MutableActor): void {
  actor.opacity = 1; actor.stretchX = 1; actor.stretchY = 1;
  actor.scale = actor.baseScale; actor.motionEnergy = 0; actor.state = "moving";
}

function syncRendererFields(actor: MutableActor, elapsedMs: number, variants: VariantSelection): void {
  actor.alpha = actor.opacity; actor.scaleX = actor.stretchX;
  actor.scaleY = actor.stretchY; actor.depth = 2 + actor.y;
  const poseTime = elapsedMs + actor.phase;
  const score = sceneScores[sceneIdForActor(actor)];
  const authored = behaviorAt(score, poseTime, variants.motion === "continuous", actor.phase);
  actor.stateProgress = authored.progress;
  const sceneId = sceneIdForActor(actor);
  const poseProgress = poseProgressFor(sceneId, authored.behavior.state, authored.progress, actor.posePhase);
  if (sceneId === "red-string") actor.stateProgress = actor.propulsion;
  const frameIndex = Math.min(authored.behavior.poseFrames.length - 1, Math.floor(poseProgress * authored.behavior.poseFrames.length));
  actor.poseFrame = authored.behavior.poseFrames[frameIndex];
  if (actor.state === "hidden") {
    actor.animationState = "reappearing";
    return;
  }
  if (actor.state === "occluded") {
    actor.animationState = sceneAnimationState(sceneId, "occluded");
    return;
  }
  actor.animationState = actor.state === "paused" ? sceneAnimationState(sceneId, actor.state) : authored.behavior.state;
}

// Actor ids are namespaced by scene, keeping snapshots self-contained for renderers.
function sceneIdForActor(actor: MutableActor): SceneId { return actor.id.replace(/-\d+$/, "") as SceneId; }

function rotateVelocity(actor: MutableActor, radians: number): void {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const x = actor.vx * cosine - actor.vy * sine;
  const y = actor.vx * sine + actor.vy * cosine;
  const direction = normalize(x, y);
  actor.vx = direction.x;
  actor.vy = direction.y;
}

function steer(actor: MutableActor, desiredX: number, desiredY: number, deltaSeconds: number, responsiveness: number): void {
  const desired = normalize(desiredX, desiredY);
  const currentAngle = Math.atan2(actor.vy, actor.vx);
  const desiredAngle = Math.atan2(desired.y, desired.x);
  const angularDifference = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
  const definition = sceneDefinitions[sceneIdForActor(actor)];
  // Reserve part of the acceleration budget for simultaneous propulsion changes.
  const accelerationTurn = definition.maxAcceleration * .62 * deltaSeconds / Math.max(actor.currentSpeed, .012);
  const maximumTurn = Math.min(responsiveness * deltaSeconds, accelerationTurn);
  const nextAngle = currentAngle + clamp(angularDifference, -maximumTurn, maximumTurn);
  actor.vx = Math.cos(nextAngle);
  actor.vy = Math.sin(nextAngle);
}

function accelerateAndMove(actor: MutableActor, targetSpeed: number, deltaSeconds: number): number {
  const definition = sceneDefinitions[sceneIdForActor(actor)];
  const boundedTarget = clamp(targetSpeed, 0, definition.maxSpeed);
  // Tangential and turning acceleration share the scene's declared total budget.
  const maximumChange = definition.maxAcceleration * .62 * deltaSeconds;
  actor.currentSpeed += clamp(boundedTarget - actor.currentSpeed, -maximumChange, maximumChange);
  actor.x += actor.vx * actor.currentSpeed * deltaSeconds;
  actor.y += actor.vy * actor.currentSpeed * deltaSeconds;
  return actor.currentSpeed;
}

function keepInsideFrame(actor: MutableActor, deltaSeconds: number): void {
  const marginX = 0.18;
  const marginY = 0.16;
  let avoidX = actor.vx;
  let avoidY = actor.vy;
  if (actor.x < marginX) avoidX += (marginX - actor.x) * 24;
  if (actor.x > 1 - marginX) avoidX -= (actor.x - (1 - marginX)) * 24;
  if (actor.y < marginY) avoidY += (marginY - actor.y) * 24;
  if (actor.y > 1 - marginY) avoidY -= (actor.y - (1 - marginY)) * 24;
  steer(actor, avoidX, avoidY, deltaSeconds, 5.5);
}

function occlusionStrength(sceneId: SceneId, actor: MutableActor): number {
  const zoneStrength = sceneScores[sceneId].occlusionZones.reduce((strongest, zone) => {
    const feather = sceneId === "koi-pool" ? .07 : .035;
    const horizontal = smoothstep(zone.minX - feather, zone.minX + feather, actor.x) * (1 - smoothstep(zone.maxX - feather, zone.maxX + feather, actor.x));
    const vertical = smoothstep(zone.minY - feather, zone.minY + feather, actor.y) * (1 - smoothstep(zone.maxY - feather, zone.maxY + feather, actor.y));
    return Math.max(strongest, horizontal * vertical);
  }, 0);
  const stateAllowsFullCover = actor.animationState === "reappearing" || actor.animationState === "sheltering";
  return zoneStrength * (stateAllowsFullCover ? 1 : sceneId === "koi-pool" ? .72 : sceneId === "balcony-birds" || sceneId === "paper-moth" ? .44 : .58);
}

function approachSurface(actor: MutableActor, targetX: number, targetY: number, deltaSeconds: number, maximumSpeed: number, motionScale: number): boolean {
  const offsetX = targetX - actor.x;
  const offsetY = targetY - actor.y;
  const distance = Math.hypot(offsetX, offsetY);
  const direction = normalize(offsetX, offsetY);
  const desiredSpeed = Math.min(maximumSpeed * motionScale, distance * 1.5);
  const definition = sceneDefinitions[sceneIdForActor(actor)];
  const velocityChange = definition.maxAcceleration * .42 * deltaSeconds;
  actor.surfaceVx += clamp(direction.x * desiredSpeed - actor.surfaceVx, -velocityChange, velocityChange);
  actor.surfaceVy += clamp(direction.y * desiredSpeed - actor.surfaceVy, -velocityChange, velocityChange);
  actor.x += actor.surfaceVx * deltaSeconds;
  actor.y += actor.surfaceVy * deltaSeconds;
  return distance < .014 && Math.hypot(actor.surfaceVx, actor.surfaceVy) < .008;
}

function touchRadius(sceneId: SceneId): number { return sceneDefinitions[sceneId].subjectHitRadius; }

export function getSceneDefinition(id: SceneId): SceneDefinition { return sceneDefinitions[id]; }

function createActors(sceneId: SceneId, actorCount: number, random: SeededRandom): MutableActor[] {
  const actors: MutableActor[] = []; for (let index = 0; index < actorCount; index += 1) actors.push(createActor(sceneId, index, random));
  return actors;
}

function createActor(sceneId: SceneId, index: number, random: SeededRandom): MutableActor {
  const direction = normalize(random.signed(), random.signed()); const placement = initialPlacement(sceneId, random.next(), random.next());
  const baseScale = 0.92 + random.next() * 0.16;
  return {
    id: `${sceneId}-${index + 1}`, x: placement.x, y: placement.y, vx: direction.x || 1, vy: direction.y, angle: 0, state: "moving", visible: true, scale: baseScale, opacity: 1,
    stretchX: 1, stretchY: 1, facing: direction.x < 0 ? -1 : 1, motionEnergy: 0, animationState: "resting", poseFrame: 0, stateProgress: 0,
    depth: 2 + placement.y, alpha: 1, scaleX: 1, scaleY: 1, pauseUntilMs: 0, hiddenUntilMs: 0, responseUntilMs: 0, baseScale,
    phase: random.next() * 1_200 + index * 650, anchorY: placement.y, turnBias: random.signed(), currentSpeed: 0, propulsion: 0, posePhase: random.next(), surfaceVx: 0, surfaceVy: 0,
  };
}
