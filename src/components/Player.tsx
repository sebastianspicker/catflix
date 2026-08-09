import { useRef } from "react";
import type { PlayerProps } from "./Player.types";
import { PlayerShell } from "./PlayerShell";
import { usePlayerRuntime } from "./usePlayerRuntime";

export function Player({ plan, onSceneMotionModeChange, onExit }: PlayerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const runtime = usePlayerRuntime({ plan, stageRef, onSceneMotionModeChange, onExit });
  return <PlayerShell plan={plan} stageRef={stageRef} {...runtime} />;
}
