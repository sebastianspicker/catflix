import type { MutableActor } from "./actorFactory";
import type { SceneEvent, SceneScore, SoundEvent } from "../../domain";

/** The engine sees only audio eligibility, never catalogue manifests or browser media. */
export interface EncounterAudioMetadata { enabled: boolean; }

const kindAt = (score: SceneScore, elapsedMs: number): string => score.audioEventKinds[Math.floor(elapsedMs / 7000) % score.audioEventKinds.length]!;
const eligibleActor = (score: SceneScore, actors: MutableActor[], elapsedMs: number, kind: string): MutableActor | undefined => {
  const actor = actors[Math.floor(elapsedMs / 7000) % actors.length];
  const mappedState = Object.entries(score.audioEventMappings).find(([eventKind]) => eventKind === kind)?.at(1);
  return actor && mappedState === actor.animationState && actor.visible ? actor : undefined;
};
const audioEvent = (kind: string, actor: MutableActor, elapsedMs: number): { events: SoundEvent[]; frameEvents: SceneEvent[] } => {
  const event = { kind, x: actor.x, y: actor.y, atMs: elapsedMs };
  return { events: [event], frameEvents: [{ type: "audio", ...event }] };
};

export const updateSceneAudio = (sceneId: string, score: SceneScore, audio: EncounterAudioMetadata | undefined, soundEnabled: boolean, elapsedMs: number, actors: MutableActor[], lastBucket: number): { events: SoundEvent[]; nextBucket: number; frameEvents: SceneEvent[] } => {
  const bucket = Math.floor(elapsedMs / (sceneId === "koi-pool" ? 14_000 : 7_000));
  if (!soundEnabled || !audio?.enabled || bucket <= 0 || bucket === lastBucket) return { events: [], nextBucket: lastBucket, frameEvents: [] };
  const kind = kindAt(score, elapsedMs), actor = eligibleActor(score, actors, elapsedMs, kind);
  if (!actor) return { events: [], nextBucket: lastBucket, frameEvents: [] };
  return { ...audioEvent(kind, actor, elapsedMs), nextBucket: bucket };
};

/**
 * Gates a contact-free shadow's scheduled event against the live run: the live actor at the same
 * time-derived slot must independently be visible and in the mapped state, the live run must not
 * be in a rest window, and no contact may have been accepted within the scene's quiet window
 * before this instant. Every condition can only remove an event, so live sound events stay a
 * subset of the shadow's — contact responses never add sound.
 */
export const admitLiveSoundEvent = (score: SceneScore, shadowEvents: SoundEvent[], liveActors: MutableActor[], elapsedMs: number, forcedRestUntilMs: number, refractoryUntilMs: number): { events: SoundEvent[]; frameEvents: SceneEvent[] } => {
  const shadowEvent = shadowEvents[0];
  if (!shadowEvent || elapsedMs < forcedRestUntilMs || elapsedMs < refractoryUntilMs) return { events: [], frameEvents: [] };
  const actor = eligibleActor(score, liveActors, elapsedMs, shadowEvent.kind);
  return actor ? audioEvent(shadowEvent.kind, actor, elapsedMs) : { events: [], frameEvents: [] };
};
