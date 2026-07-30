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
  const kind = { "balcony-birds": "perch-lights", "koi-pool": "reflected-ring", "paper-moth": "folded-shadow", "beetle-under-the-fern": "fern-shadow", "red-string": "slack-curve" } as const;
  return { kind: kind[sceneId], x: actor.x, y: actor.y, alpha: phase === "finale" ? .16 : .11 };
}

export function contactResponseFor(sceneId: SceneId, state: AnimationState, phase: EncounterPhase, allowed: readonly NonNullable<TouchResponse["response"]>[]): NonNullable<TouchResponse["response"]> {
  const preferred: Record<SceneId, NonNullable<TouchResponse["response"]>> = {
    "balcony-birds": state === "perching" ? "head-turn" : "hop",
    "koi-pool": "redirect",
    "paper-moth": state === "landed" ? "land" : "reroute",
    "beetle-under-the-fern": state === "sheltering" || phase === "occlusion" ? "hide" : phase === "reappearance" ? "reverse" : "pause",
    "red-string": state === "resting" ? "pause" : "redirect",
  };
  return allowed.includes(preferred[sceneId]) ? preferred[sceneId] : allowed[0];
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
  const durations = score.behaviors.map((behavior, index) => {
    const [minimum, maximum] = behavior.durationMs;
    const seededFraction = Math.abs(Math.sin((index + 1) * 91.7 + score.durationMs * .0001 + seedPhase * .0013)) % 1;
    const authoredDuration = minimum + (maximum - minimum) * seededFraction;
    const isLongRest = ["perching", "gliding", "landed", "sheltering", "resting"].includes(behavior.state);
    return continuous && isLongRest ? Math.min(authoredDuration, 900) : authoredDuration;
  });
  const cycle = durations.reduce((sum, duration) => sum + duration, 0);
  let cursor = ((timeMs % cycle) + cycle) % cycle;
  for (let index = 0; index < score.behaviors.length; index += 1) {
    if (cursor <= durations[index]) return { behavior: score.behaviors[index], progress: clamp(cursor / durations[index], 0, 1) };
    cursor -= durations[index];
  }
  return { behavior: score.behaviors[0], progress: 0 };
}

export function sceneAnimationState(sceneId: SceneId, state: ActorState): AnimationState {
  if (state === "hidden" || state === "occluded") return "reappearing";
  return state === "paused" ? pausedAnimationState(sceneId) : movingAnimationState(sceneId);
}

function pausedAnimationState(sceneId: SceneId): AnimationState {
  if (sceneId === "balcony-birds") return "perching";
  if (sceneId === "koi-pool") return "swimming";
  if (sceneId === "paper-moth") return "landed";
  if (sceneId === "beetle-under-the-fern") return "sheltering";
  return "resting";
}

function movingAnimationState(sceneId: SceneId): AnimationState {
  if (sceneId === "balcony-birds") return "flying";
  if (sceneId === "koi-pool") return "swimming";
  if (sceneId === "paper-moth") return "fluttering";
  if (sceneId === "beetle-under-the-fern") return "crawling";
  return "dragging";
}
