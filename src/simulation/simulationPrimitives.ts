import { SceneId } from "../content/types";
import { ActorState, AnimationState, EncounterPhase, Point, SceneActorSnapshot, SceneScore, SceneSnapshot, SimulationPreferences, TouchResponse } from "./types";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const normalize = (x: number, y: number): Point => { const length = Math.hypot(x, y) || 1; return { x: x / length, y: y / length }; };
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * clamp(amount, 0, 1);
export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const progress = clamp((value - edge0) / Math.max(edge1 - edge0, Number.EPSILON), 0, 1);
  return progress * progress * (3 - 2 * progress);
};
export const pulse = (value: number, start: number, end: number, feather = 350) => smoothstep(start, start + feather, value) * (1 - smoothstep(end - feather, end, value));

export function initialPlacement(sceneId: SceneId, xRandom: number, yRandom: number): Point {
  if (sceneId === "balcony-birds") {
    const x = 0.18 + xRandom * 0.64;
    return { x, y: clamp(.93 - x * .2 + yRandom * .018, .74, .9) };
  }
  if (sceneId === "koi-pool") return { x: 0.14 + xRandom * 0.72, y: 0.2 + yRandom * 0.6 };
  if (sceneId === "paper-moth") return { x: 0.2 + xRandom * 0.6, y: 0.28 + yRandom * 0.42 };
  if (sceneId === "beetle-under-the-fern") return { x: 0.16 + xRandom * 0.68, y: 0.56 + yRandom * 0.12 };
  return { x: 0.16 + xRandom * 0.68, y: 0.28 + yRandom * 0.48 };
}

export function signatureEffect(sceneId: SceneId, phase: EncounterPhase, actor: Pick<SceneActorSnapshot, "x" | "y">): SceneSnapshot["signatureEffect"] {
  if (phase !== "contact-response" && phase !== "finale") return undefined;
  return { kind: signatureKindFor(sceneId), x: actor.x, y: actor.y, alpha: phase === "finale" ? .16 : .11 };
}

function signatureKindFor(sceneId: SceneId): NonNullable<SceneSnapshot["signatureEffect"]>["kind"] {
  if (sceneId === "balcony-birds") return "perch-lights";
  if (sceneId === "koi-pool") return "reflected-ring";
  if (sceneId === "paper-moth") return "folded-shadow";
  if (sceneId === "beetle-under-the-fern") return "fern-shadow";
  return "slack-curve";
}

export function contactResponseFor(sceneId: SceneId, state: AnimationState, phase: EncounterPhase, allowed: readonly NonNullable<TouchResponse["response"]>[]): NonNullable<TouchResponse["response"]> {
  const preferred = preferredContactResponse(sceneId, state, phase);
  return allowed.includes(preferred) ? preferred : allowed[0];
}

function preferredContactResponse(sceneId: SceneId, state: AnimationState, phase: EncounterPhase): NonNullable<TouchResponse["response"]> {
  if (sceneId === "balcony-birds") return state === "perching" ? "head-turn" : "hop";
  if (sceneId === "koi-pool") return "redirect";
  if (sceneId === "paper-moth") return state === "landed" ? "land" : "reroute";
  if (sceneId === "beetle-under-the-fern") return beetleContactResponse(state, phase);
  return state === "resting" ? "pause" : "redirect";
}

function beetleContactResponse(state: AnimationState, phase: EncounterPhase): NonNullable<TouchResponse["response"]> {
  if (state === "sheltering" || phase === "occlusion") return "hide";
  return phase === "reappearance" ? "reverse" : "pause";
}

export function isLowMotion(preferences: SimulationPreferences): boolean {
  return preferences.sceneMotionMode === "low";
}

export function poseProgressFor(sceneId: SceneId, state: AnimationState, progress: number, posePhase: number): number {
  if (sceneId === "koi-pool") return posePhase;
  if (sceneId === "paper-moth") return state === "landed" ? progress : posePhase;
  if (sceneId === "beetle-under-the-fern") return state === "crawling" ? posePhase : progress;
  return sceneId === "balcony-birds" && state === "flying" ? posePhase : progress;
}

export function behaviorAt(score: SceneScore, timeMs: number, continuous: boolean, seedPhase = 0): { behavior: SceneScore["behaviors"][number]; progress: number } {
  const segments = score.behaviors.map((behavior, index) => {
    const [minimum, maximum] = behavior.durationMs;
    const seededFraction = Math.abs(Math.sin((index + 1) * 91.7 + score.durationMs * .0001 + seedPhase * .0013)) % 1;
    const authoredDuration = minimum + (maximum - minimum) * seededFraction;
    const isLongRest = ["perching", "gliding", "landed", "sheltering", "resting"].includes(behavior.state);
    return { behavior, duration: continuous && isLongRest ? Math.min(authoredDuration, 900) : authoredDuration };
  });
  const cycle = segments.reduce((sum, segment) => sum + segment.duration, 0);
  let cursor = ((timeMs % cycle) + cycle) % cycle;
  for (const segment of segments) {
    if (cursor <= segment.duration) return { behavior: segment.behavior, progress: clamp(cursor / segment.duration, 0, 1) };
    cursor -= segment.duration;
  }
  return { behavior: segments[0].behavior, progress: 0 };
}

export function sceneAnimationState(sceneId: SceneId, state: ActorState): AnimationState {
  if (state === "hidden" || state === "occluded") return "reappearing";
  return state === "paused" ? pausedAnimationStateFor(sceneId) : movingAnimationStateFor(sceneId);
}

const pausedAnimationStateFor = (sceneId: SceneId): AnimationState => {
  switch (sceneId) {
    case "balcony-birds": return "perching";
    case "koi-pool": return "swimming";
    case "paper-moth": return "landed";
    case "beetle-under-the-fern": return "sheltering";
    case "red-string": return "resting";
  }
};

const movingAnimationStateFor = (sceneId: SceneId): AnimationState => {
  switch (sceneId) {
    case "balcony-birds": return "flying";
    case "koi-pool": return "swimming";
    case "paper-moth": return "fluttering";
    case "beetle-under-the-fern": return "crawling";
    case "red-string": return "dragging";
  }
};
