import type { MutableActor } from "./actorFactory";
import type { ActorMotionContext, MotionStrategy } from "./motionTypes";
import { keepInsideFrame, occlusionStrength } from "./motionMath";
import { behaviorAt, clamp, isLowMotion, lerp, poseProgressFor, sceneAnimationState } from "./simulationPrimitives";

export const advanceAuthoredActor = (strategies: Readonly<Record<ActorMotionContext["sceneId"], MotionStrategy>>, actor: MutableActor, deltaMs: number, context: ActorMotionContext): void => {
  const deltaSeconds = deltaMs / 1000, reducedScale = isLowMotion(context.preferences) ? context.score.lowMotionOverride.travelScale : 1, time = context.elapsedMs + actor.phase, authored = behaviorAt(context.score, time, context.variants.motion === "continuous", actor.phase);
  actor.animationState = authored.behavior.state; actor.stateProgress = authored.progress;
  strategies[context.sceneId](actor, time, deltaSeconds, reducedScale, authored.behavior, authored.progress, context);
  actor.facing = actor.vx < 0 ? -1 : 1; keepInsideFrame(actor, deltaSeconds, context.score); actor.x = clamp(actor.x, context.score.containment.minX, context.score.containment.maxX); actor.y = clamp(actor.y, context.score.containment.minY, context.score.containment.maxY);
};
export const applyOcclusion = (actor: MutableActor, context: ActorMotionContext): void => {
  const occlusion = occlusionStrength(context.sceneId, actor, context.score);
  if (occlusion > .04) { actor.opacity *= lerp(1, context.sceneId === "koi-pool" ? .38 : .2, occlusion); actor.state = occlusion > .52 ? "occluded" : actor.state; }
  if (actor.responseUntilMs > context.elapsedMs) { actor.scale *= 1 + Math.sin((actor.responseUntilMs - context.elapsedMs) / 650 * Math.PI) * .075; actor.motionEnergy = 1; }
};
export const syncRendererFields = (actor: MutableActor, context: ActorMotionContext): void => {
  actor.alpha = actor.opacity; actor.scaleX = actor.stretchX; actor.scaleY = actor.stretchY; actor.depth = 2 + actor.y;
  const authored = behaviorAt(context.score, context.elapsedMs + actor.phase, context.variants.motion === "continuous", actor.phase);
  actor.stateProgress = context.sceneId === "red-string" ? actor.propulsion : authored.progress;
  const poseProgress = poseProgressFor(context.sceneId, authored.behavior.state, authored.progress, actor.posePhase);
  actor.poseFrame = authored.behavior.poseFrames.at(Math.min(authored.behavior.poseFrames.length - 1, Math.floor(poseProgress * authored.behavior.poseFrames.length))) ?? 0;
  actor.animationState = actor.state === "hidden" ? "reappearing" : actor.state === "occluded" ? sceneAnimationState(context.sceneId, "occluded") : actor.state === "paused" ? sceneAnimationState(context.sceneId, actor.state) : authored.behavior.state;
};
