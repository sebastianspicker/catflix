import type { SceneId, VariantSelection } from "../content/types";
import type { MutableActor } from "./actorFactory";
import type { SceneScore, SimulationPreferences } from "./types";

export type SceneBehavior = SceneScore["behaviors"][number];
export interface ActorMotionContext {
  sceneId: SceneId;
  score: SceneScore;
  variants: VariantSelection;
  preferences: SimulationPreferences;
  elapsedMs: number;
  forcedRestUntilMs: number;
}
export type MotionStrategy = (actor: MutableActor, time: number, deltaSeconds: number, reducedScale: number, behavior: SceneBehavior, progress: number, context: ActorMotionContext) => void;
