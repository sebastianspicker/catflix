import type { SceneId } from "../content/types";
import type { SceneActorSnapshot } from "./types";
import { initialPlacement, normalize } from "./simulationPrimitives";

export interface MutableActor extends SceneActorSnapshot {
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

interface RandomSource {
  next(): number;
  signed(): number;
}

export function createActors(sceneId: SceneId, actorCount: number, random: RandomSource): MutableActor[] {
  const actors: MutableActor[] = [];
  for (let index = 0; index < actorCount; index += 1) actors.push(createActor(sceneId, index, random));
  return actors;
}

function createActor(sceneId: SceneId, index: number, random: RandomSource): MutableActor {
  const direction = normalize(random.signed(), random.signed());
  const placement = initialPlacement(sceneId, random.next(), random.next());
  const baseScale = 0.92 + random.next() * 0.16;
  return {
    id: `${sceneId}-${index + 1}`, x: placement.x, y: placement.y, vx: direction.x || 1, vy: direction.y, angle: 0, state: "moving", visible: true, scale: baseScale, opacity: 1,
    stretchX: 1, stretchY: 1, facing: direction.x < 0 ? -1 : 1, motionEnergy: 0, animationState: "resting", poseFrame: 0, stateProgress: 0,
    depth: 2 + placement.y, alpha: 1, scaleX: 1, scaleY: 1, pauseUntilMs: 0, hiddenUntilMs: 0, responseUntilMs: 0, baseScale,
    phase: random.next() * 1_200 + index * 650, anchorY: placement.y, turnBias: random.signed(), currentSpeed: 0, propulsion: 0, posePhase: random.next(), surfaceVx: 0, surfaceVy: 0,
  };
}
