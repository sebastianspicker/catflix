import type { AnimationState, SceneId, SceneScore, SimulationPreferences } from "../../domain";
import { clamp } from "./simulationMath";

export const isLowMotion = (preferences: SimulationPreferences): boolean => preferences.sceneMotionMode === "low";

export function poseProgressFor(sceneId: SceneId, state: AnimationState, progress: number, posePhase: number): number {
  const usePosePhase = sceneId === "koi-pool" || sceneId === "paper-moth" && state !== "landed" || sceneId === "beetle-under-the-fern" && state === "crawling" || sceneId === "balcony-birds" && state === "flying";
  return usePosePhase ? posePhase : progress;
}

export function behaviorAt(score: SceneScore, timeMs: number, continuous: boolean, seedPhase = 0): { behavior: SceneScore["behaviors"][number]; progress: number } {
  const segments = score.behaviors.map((behavior, index) => {
    const [minimum, maximum] = behavior.durationMs;
    const authoredDuration = minimum + (maximum - minimum) * (Math.abs(Math.sin((index + 1) * 91.7 + score.durationMs * .0001 + seedPhase * .0013)) % 1);
    return { behavior, duration: continuous && ["perching", "gliding", "landed", "sheltering", "resting"].includes(behavior.state) ? Math.min(authoredDuration, 900) : authoredDuration };
  });
  const cycle = segments.reduce((sum, segment) => sum + segment.duration, 0);
  let cursor = ((timeMs % cycle) + cycle) % cycle;
  for (const segment of segments) { if (cursor <= segment.duration) return { behavior: segment.behavior, progress: clamp(cursor / segment.duration, 0, 1) }; cursor -= segment.duration; }
  return { behavior: segments[0].behavior, progress: 0 };
}
