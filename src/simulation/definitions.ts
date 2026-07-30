import { getContentManifest } from "../content/registry";
import { SceneId, VariantSelection } from "../content/types";
import { createActors, type MutableActor } from "./actorFactory";
import { advanceActorForFixedStep, scenePhaseAt } from "./actorMotion";
import { AnimationState, EncounterBeat, InteractionPolicy, Point, SceneActorSnapshot, SceneDefinition, SceneEvent, SceneScore, SceneSimulation, SceneSnapshot, SimulationPreferences, SoundEvent, TouchResponse } from "./types";
import { clamp, contactResponseFor, isLowMotion, normalize, signatureEffect } from "./simulationPrimitives";

export const defaultVariantSelection: VariantSelection = { figureGround: "natural", motion: "intermittent", sound: "off", novelty: "familiar" };

const frame = { minX: .045, maxX: .955, minY: .065, maxY: .935 } as const;
type RawSceneScore = Omit<SceneScore, "encounter" | "interactionPolicy">;
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
const encounterFor = (score: RawSceneScore): readonly EncounterBeat[] => {
  const [resting, moving, finale] = encounterStates[score.id];
  const trajectory = score.behaviors.find((behavior) => behavior.state === moving)?.trajectory ?? score.behaviors[0].trajectory;
  const beat = (phase: EncounterBeat["phase"], fraction: readonly [number, number], behaviorState: AnimationState, rule: string): EncounterBeat => ({ id: `${score.id}:${phase}`, phase, durationMs: [score.durationMs * fraction[0], score.durationMs * fraction[1]], behaviorState, trajectory, occlusionRule: rule, actorCap: score.actorCount[1], eligibleAudioEvent: score.audioEventKinds[0], allowedContactResponse: score.touchPolicy.allowedResponses });
  return [beat("invitation", [.07, .09], resting, "Subject remains plainly visible."), beat("passage", [.29, .31], moving, "Movement follows the authored corridor."), beat("occlusion", [.08, .1], moving, "Use the nearest authored cover zone."), beat("reappearance", [.08, .1], "reappearing", "Return adjacent to the last cover location."), beat("contact-response", [.12, .14], moving, "A contact may alter this beat once."), beat("rest", [.17, .19], resting, "Motion settles without adding stimuli."), beat("finale", [.12, .14], finale, "Subject finishes visibly at rest.")];
};
const completeScore = (score: RawSceneScore): SceneScore => {
  const normalized = score.id === "koi-pool" ? { ...score, actorCount: [1, 1] as const } : score;
  const interactionPolicy: InteractionPolicy = { targetOnly: true, hitTolerance: normalized.subjectHitRadius, refractoryMs: normalized.touchPolicy.refractoryMs, rollingContactCap: { contacts: 3, windowMs: 20_000 }, restResponse: { durationMs: [10_000, 12_000], editorialSafetyCap: true }, neverEscalate: true };
  return { ...normalized, encounter: encounterFor(normalized), interactionPolicy };
};
export const sceneScores: Readonly<Record<SceneId, SceneScore>> = Object.fromEntries(Object.entries(authoredSceneScores).map(([id, score]) => [id, completeScore(id === "balcony-birds" ? { ...score, touchPolicy: { refractoryMs: 5_000, allowedResponses: ["head-turn", "hop"] } } : score)])) as unknown as Readonly<Record<SceneId, SceneScore>>;
export const sceneDefinitions: Readonly<Record<SceneId, SceneDefinition>> = sceneScores;

const sceneScoreFor = (sceneId: SceneId): SceneScore => {
  switch (sceneId) {
    case "balcony-birds": return sceneScores["balcony-birds"];
    case "koi-pool": return sceneScores["koi-pool"];
    case "paper-moth": return sceneScores["paper-moth"];
    case "beetle-under-the-fern": return sceneScores["beetle-under-the-fern"];
    case "red-string": return sceneScores["red-string"];
  }
};

const mappedAnimationState = (score: SceneScore, kind: string): AnimationState | undefined => {
  const state = Object.entries(score.audioEventMappings).find(([eventKind]) => eventKind === kind)?.at(1);
  return score.authoredStates.includes(state as AnimationState) ? state as AnimationState : undefined;
};

const snapshotActor = (actor: MutableActor): SceneActorSnapshot => {
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
};
class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
  next(): number { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0x1_0000_0000; }
  signed(): number { return this.next() * 2 - 1; }
}
const createSceneSimulation = (sceneId: SceneId, variants: VariantSelection = defaultVariantSelection, seed = 1, preferences: SimulationPreferences = {}): SceneSimulation => {
  const definition = sceneScoreFor(sceneId);
  const score = sceneScoreFor(sceneId);
  const manifest = getContentManifest(sceneId);
  let random = new SeededRandom(seed);
  const actorCount = isLowMotion(preferences) ? score.lowMotionOverride.actorCount : definition.actorCount[0] + Math.floor(random.next() * (definition.actorCount[1] - definition.actorCount[0] + 1));
  let elapsedMs = 0;
  let refractoryUntilMs = 0;
  let acceptedContactTimes: number[] = [];
  let reminder: Extract<SceneEvent, { type: "contact-reminder" }> | undefined;
  let forcedRestUntilMs = 0;
  let lastPhase = scenePhaseAt(definition, 0).phase;
  let completionEventSent = false;
  let frameEvents: SceneEvent[] = [];
  let pendingEvents: SceneEvent[] = [];
  let accumulatorMs = 0;
  let lastSoundBucket = -1;
  let actors: MutableActor[] = createActors(sceneId, actorCount, random);
  let soundEvents: SoundEvent[] = [];
  const advance = (deltaMs: number): SceneSnapshot => {
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
  };
  const advanceFixedStep = (stepMs: number): void => {
    const boundedDelta = Math.min(stepMs, definition.durationMs - elapsedMs);
    elapsedMs = Math.min(definition.durationMs, elapsedMs + boundedDelta);
    const encounter = scenePhaseAt(definition, elapsedMs);
    recordPhaseChange(encounter);
    advanceActorsForFixedStep(encounter, boundedDelta);
    updateSoundEvents();
    recordCompletion();
  };
  const recordPhaseChange = (encounter: EncounterBeat): void => {
    if (encounter.phase !== lastPhase) { frameEvents.push({ type: "phase-change", phase: encounter.phase, beatId: encounter.id, atMs: elapsedMs }); lastPhase = encounter.phase; }
  };
  const advanceActorsForFixedStep = (encounter: EncounterBeat, boundedDelta: number): void => {
    const context = { sceneId, score, variants, preferences, elapsedMs, forcedRestUntilMs };
    for (const actor of actors) advanceActorForFixedStep(actor, encounter, boundedDelta, context);
  };
  const updateSoundEvents = (): void => {
    const soundBucket = Math.floor(elapsedMs / (sceneId === "koi-pool" ? 14_000 : 7_000));
    if (variants.sound === "on" && manifest.audio && soundBucket > 0 && soundBucket !== lastSoundBucket) {
      const actor = actors[Math.floor(elapsedMs / 7000) % actors.length];
      const kind = definition.audioEventKinds[Math.floor(elapsedMs / 7000) % definition.audioEventKinds.length];
      if (mappedAnimationState(score, kind) === actor.animationState && actor.visible) {
        soundEvents = [{ kind, x: actor.x, y: actor.y, atMs: elapsedMs }];
        frameEvents.push({ type: "audio", ...soundEvents[0] });
        lastSoundBucket = soundBucket;
      } else soundEvents = [];
    } else soundEvents = [];
  };
  const recordCompletion = (): void => {
    if (elapsedMs >= definition.durationMs && !completionEventSent) { frameEvents.push({ type: "complete", atMs: elapsedMs }); completionEventSent = true; }
  };
  const touch = (point: Point, timestampMs = elapsedMs): TouchResponse => {
    if (touchDisabled(timestampMs)) return { accepted: false, refractoryUntilMs };
    const actor = closestVisibleActor(point);
    if (!actor || isOutsideTouchRadius(actor, point)) return { accepted: false, refractoryUntilMs };
    const response = contactResponseFor(sceneId, actor.animationState, scenePhaseAt(definition, elapsedMs).phase, definition.touchPolicy.allowedResponses);
    refractoryUntilMs = timestampMs + definition.touchPolicy.refractoryMs;
    actor.responseUntilMs = timestampMs + 650;
    applyTouchResponse(actor, response, point, timestampMs);
    recordAcceptedTouch(timestampMs);
    pendingEvents.push({ type: "contact-accepted", actorId: actor.id, atMs: timestampMs }, { type: "contact-response", actorId: actor.id, response, atMs: timestampMs });
    startContactRestIfNeeded(timestampMs);
    // Responses never modify base speed, audio, duration, or later touch intensity.
    return { accepted: true, response, refractoryUntilMs };
  };
  const touchDisabled = (timestampMs: number): boolean => {
    return preferences.playbackMode === "tv-passive" || elapsedMs >= definition.durationMs || timestampMs < refractoryUntilMs || timestampMs < forcedRestUntilMs || definition.touchPolicy.allowedResponses.length === 0;
  };
  const closestVisibleActor = (point: Point): MutableActor | undefined => {
    return actors.filter((actor) => actor.visible).reduce<MutableActor | undefined>((closest, candidate) => !closest || distanceTo(candidate, point) < distanceTo(closest, point) ? candidate : closest, undefined);
  };
  const distanceTo = (actor: MutableActor, point: Point): number => { return Math.hypot(actor.x - point.x, actor.y - point.y); };
  const isOutsideTouchRadius = (actor: MutableActor, point: Point): boolean => { return distanceTo(actor, point) > touchRadius(sceneId); };
  const applyTouchResponse = (actor: MutableActor, response: TouchResponse["response"], point: Point, timestampMs: number): void => {
    if (response === "reroute" || response === "redirect") { rerouteActor(actor, point); return; }
    applyStationaryTouchResponse(actor, response, timestampMs);
  };
  const applyStationaryTouchResponse = (actor: MutableActor, response: TouchResponse["response"], timestampMs: number): void => {
    switch (response) {
      case "head-turn": reverseFacingAndPause(actor, timestampMs); break;
      case "hop": actor.pauseUntilMs = timestampMs + 420; break;
      case "reverse": reverseActor(actor); break;
      case "pause": case "land": actor.pauseUntilMs = timestampMs + 1_050; break;
      case "hide": actor.hiddenUntilMs = timestampMs + 1_250; break;
      default: break;
    }
  };
  const rerouteActor = (actor: MutableActor, point: Point): void => { const vector = normalize(actor.x - point.x, actor.y - point.y); actor.vx = vector.x; actor.vy = vector.y; };
  const reverseFacingAndPause = (actor: MutableActor, timestampMs: number): void => { actor.facing = actor.facing === 1 ? -1 : 1; actor.pauseUntilMs = timestampMs + 650; };
  const reverseActor = (actor: MutableActor): void => { actor.vx *= -1; actor.vy *= -1; };
  const recordAcceptedTouch = (timestampMs: number): void => { acceptedContactTimes = [...acceptedContactTimes, timestampMs].filter((contactTime) => timestampMs - contactTime <= 20_000); };
  const startContactRestIfNeeded = (timestampMs: number): void => {
    if (acceptedContactTimes.length < 3 || reminder) return;
    const restDuration = 10_000 + Math.floor(random.next() * 2_001);
    forcedRestUntilMs = timestampMs + restDuration;
    for (const actor of actors) actor.pauseUntilMs = Math.max(actor.pauseUntilMs, forcedRestUntilMs);
    reminder = { type: "contact-reminder", id: "three-contacts", acceptedContacts: 3, windowMs: 20_000, dismissible: true, editorialSafetyCap: true, atMs: timestampMs };
    pendingEvents.push({ type: "rest-window", reason: "editorial-contact-cap", durationMs: restDuration, atMs: timestampMs }, reminder);
  };
  const snapshot = (): SceneSnapshot => {
    const encounter = elapsedMs < forcedRestUntilMs ? { ...scenePhaseAt(definition, elapsedMs), phase: "rest" as const, id: `${sceneId}:contact-rest` } : scenePhaseAt(definition, elapsedMs);
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
  };
  const reset = (): SceneSnapshot => { elapsedMs = 0; accumulatorMs = 0; refractoryUntilMs = 0; forcedRestUntilMs = 0; acceptedContactTimes = []; reminder = undefined; frameEvents = []; pendingEvents = []; lastSoundBucket = -1; lastPhase = scenePhaseAt(definition, 0).phase; completionEventSent = false; random = new SeededRandom(seed); random.next(); actors = createActors(sceneId, actorCount, random); soundEvents = []; return snapshot(); };
  const dismissReminder = (): SceneSnapshot => { reminder = undefined; return snapshot(); };
  return { definition, variants, advance, touch, snapshot, reset, dismissReminder };

};

const touchRadius = (sceneId: SceneId): number => { return sceneScoreFor(sceneId).subjectHitRadius; };

const getSceneDefinition = (id: SceneId): SceneDefinition => { return sceneScoreFor(id); };
const getSceneScore = (id: SceneId): SceneScore => { return sceneScoreFor(id); };

export { createSceneSimulation, getSceneDefinition, getSceneScore };
