import type { SceneId } from "../content/types";
import type { MutableActor } from "./actorFactory";
import { advanceBeetle } from "./motionBeetle";
import { advanceBird } from "./motionBird";
import { advanceKoi, advanceString } from "./motionKoiString";
import { advanceMoth } from "./motionMoth";
import { advanceAuthoredActor, applyOcclusion, syncRendererFields } from "./motionRuntime";
import type { ActorMotionContext, MotionStrategy } from "./motionTypes";
import type { EncounterBeat, SceneScore } from "./types";

export type { ActorMotionContext } from "./motionTypes";

const sceneStrategies: Readonly<Record<SceneId, MotionStrategy>> = {
  "balcony-birds": advanceBird,
  "koi-pool": advanceKoi,
  "paper-moth": advanceMoth,
  "beetle-under-the-fern": advanceBeetle,
  "red-string": advanceString,
};

export const scenePhaseAt = (score: SceneScore, timeMs: number): EncounterBeat => {
  const weights = score.encounter.map((beat) => (beat.durationMs[0] + beat.durationMs[1]) / 2), total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = Math.min(timeMs, score.durationMs - Number.EPSILON) / score.durationMs * total;
  for (let index = 0; index < score.encounter.length; index += 1) {
    const weight = weights.at(index), encounter = score.encounter.at(index);
    if (weight === undefined || encounter === undefined) break;
    if (cursor < weight) return encounter;
    cursor -= weight;
  }
  return score.encounter.at(-1) ?? score.encounter[0];
};

export const advanceActorForFixedStep = (actor: MutableActor, encounter: EncounterBeat, deltaMs: number, context: ActorMotionContext): void => {
  resetVisualState(actor);
  if (context.elapsedMs < context.forcedRestUntilMs || encounter.phase === "finale") { pauseActor(actor, encounter.behaviorState, false, context); return; }
  if (actor.hiddenUntilMs > context.elapsedMs) { actor.visible = false; actor.state = "hidden"; syncRendererFields(actor, context); return; }
  actor.visible = true;
  if (actor.pauseUntilMs > context.elapsedMs) { pauseActor(actor, actor.animationState, true, context); return; }
  advanceAuthoredActor(sceneStrategies, actor, deltaMs, context); applyOcclusion(actor, context); syncRendererFields(actor, context);
};

const resetVisualState = (actor: MutableActor): void => { actor.opacity = 1; actor.stretchX = 1; actor.stretchY = 1; actor.scale = actor.baseScale; actor.motionEnergy = 0; actor.state = "moving"; };
const pauseActor = (actor: MutableActor, animationState: EncounterBeat["behaviorState"], showContactResponse: boolean, context: ActorMotionContext): void => {
  actor.visible = true; actor.state = "paused"; actor.currentSpeed = 0; actor.propulsion = 0; actor.motionEnergy = 0; actor.animationState = animationState;
  if (showContactResponse) actor.scale = actor.baseScale * (1 + (actor.responseUntilMs > context.elapsedMs ? .055 : 0));
  syncRendererFields(actor, context);
};
