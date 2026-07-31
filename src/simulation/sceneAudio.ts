import type { ContentManifest } from "../content/types";
import type { MutableActor } from "./actorFactory";
import type { SceneEvent, SceneScore, SoundEvent } from "./types";

export const updateSceneAudio = (sceneId: string, score: SceneScore, manifest: ContentManifest, soundEnabled: boolean, elapsedMs: number, actors: MutableActor[], lastBucket: number): { events: SoundEvent[]; nextBucket: number; frameEvents: SceneEvent[] } => {
  const bucket = Math.floor(elapsedMs / (sceneId === "koi-pool" ? 14_000 : 7_000));
  if (!soundEnabled || !manifest.audio || bucket <= 0 || bucket === lastBucket) return { events: [], nextBucket: lastBucket, frameEvents: [] };
  const actor = actors[Math.floor(elapsedMs / 7000) % actors.length], kind = score.audioEventKinds[Math.floor(elapsedMs / 7000) % score.audioEventKinds.length];
  const mappedState = Object.entries(score.audioEventMappings).find(([eventKind]) => eventKind === kind)?.at(1);
  if (mappedState !== actor.animationState || !actor.visible) return { events: [], nextBucket: lastBucket, frameEvents: [] };
  const event = { kind, x: actor.x, y: actor.y, atMs: elapsedMs };
  return { events: [event], nextBucket: bucket, frameEvents: [{ type: "audio", ...event }] };
};
