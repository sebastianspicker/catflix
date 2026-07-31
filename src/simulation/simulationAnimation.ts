import { SceneId } from "../content/types";
import { ActorState, AnimationState } from "./types";

const states = new Map<SceneId, { paused: AnimationState; moving: AnimationState }>([
  ["balcony-birds", { paused: "perching", moving: "flying" }],
  ["koi-pool", { paused: "swimming", moving: "swimming" }],
  ["paper-moth", { paused: "landed", moving: "fluttering" }],
  ["beetle-under-the-fern", { paused: "sheltering", moving: "crawling" }],
  ["red-string", { paused: "resting", moving: "dragging" }],
]);

export function sceneAnimationState(sceneId: SceneId, state: ActorState): AnimationState {
  if (state === "hidden" || state === "occluded") return "reappearing";
  const sceneStates = states.get(sceneId);
  if (!sceneStates) return "resting";
  return state === "paused" ? sceneStates.paused : sceneStates.moving;
}
