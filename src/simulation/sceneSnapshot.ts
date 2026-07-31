import type { SceneId } from "../content/types";
import type { MutableActor } from "./actorFactory";
import { scenePhaseAt } from "./actorMotion";
import type { SceneActorSnapshot, SceneEvent, SceneScore, SceneSnapshot, SoundEvent } from "./types";
import { signatureEffect } from "./simulationPrimitives";

interface SceneSnapshotInput {
  sceneId: SceneId;
  score: SceneScore;
  elapsedMs: number;
  forcedRestUntilMs: number;
  actors: MutableActor[];
  soundEvents: SoundEvent[];
  frameEvents: SceneEvent[];
  pendingEvents: SceneEvent[];
  reminder: SceneSnapshot["reminder"];
}

export const sceneSnapshot = (input: SceneSnapshotInput): SceneSnapshot => {
  const { sceneId, score, elapsedMs, forcedRestUntilMs, actors, soundEvents, frameEvents, pendingEvents, reminder } = input;
  const encounter = elapsedMs < forcedRestUntilMs ? { ...scenePhaseAt(score, elapsedMs), phase: "rest" as const, id: `${sceneId}:contact-rest` } : scenePhaseAt(score, elapsedMs);
  const events = reminder && ![...frameEvents, ...pendingEvents].some((event) => event.type === "contact-reminder") ? [...frameEvents, ...pendingEvents, reminder] : [...frameEvents, ...pendingEvents];
  return { sceneId, elapsedMs, durationMs: score.durationMs, complete: elapsedMs >= score.durationMs, phase: encounter.phase, beatId: encounter.id, remainingMs: Math.max(0, score.durationMs - elapsedMs), signatureEffect: signatureEffect(sceneId, encounter.phase, actors[0]), actors: actors.map(snapshotActor), soundEvents: [...soundEvents], events, reminder };
};
const snapshotActor = (actor: MutableActor): SceneActorSnapshot => ({ id: actor.id, x: actor.x, y: actor.y, angle: actor.angle, state: actor.state, visible: actor.visible, scale: actor.scale, opacity: actor.opacity, facing: actor.facing, animationState: actor.animationState, poseFrame: actor.poseFrame, stateProgress: actor.stateProgress, depth: actor.depth, alpha: actor.alpha, scaleX: actor.scaleX, scaleY: actor.scaleY });
