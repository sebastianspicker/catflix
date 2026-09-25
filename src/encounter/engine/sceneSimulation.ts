import type { SceneEvent, SceneScore, SceneSimulation, SceneSnapshot, SimulationPreferences, SoundEvent, VariantSelection } from "../../domain";
import { createActors } from "./actorFactory";
import { advanceActorForFixedStep, scenePhaseAt } from "./actorMotion";
import { ContactController } from "./contactController";
import { admitLiveSoundEvent, updateSceneAudio } from "./sceneAudio";
import { FixedSceneClock, SeededRandom } from "./sceneClock";
import { sceneSnapshot } from "./sceneSnapshot";
import { isLowMotion } from "./simulationTiming";
import type { EncounterAudioMetadata } from "./sceneAudio";

/** Pure fixed-step encounter engine. The compiled score is its sole scene input. */
export const createSceneSimulationEngine = (score: SceneScore, audio: EncounterAudioMetadata | undefined, variants: VariantSelection, seed: number, preferences: SimulationPreferences): SceneSimulation => {
  const sceneId = score.id, contacts = new ContactController();
  // A touched run can only pick which of the contact-free schedule's events survive, never add
  // to it: the shadow below replays the same fixed steps with no touches, purely to arbitrate
  // sound. It has no observable surface of its own and is absent whenever contacts are impossible.
  const hasShadow = score.audioEventKinds.length > 0 && preferences.playbackMode !== "tv-passive";
  const clock = new FixedSceneClock();
  let random = new SeededRandom(seed), elapsedMs = 0, lastSoundBucket = -1, shadowSoundBucket = -1, completionSent = false;
  const actorCount = isLowMotion(preferences) ? score.lowMotionOverride.actorCount : score.actorCount[0] + Math.floor(random.next() * (score.actorCount[1] - score.actorCount[0] + 1));
  let lastPhase = scenePhaseAt(score, 0).phase, actors = createActors(sceneId, actorCount, random), shadowActors = hasShadow ? actors.map((actor) => ({ ...actor })) : undefined, frameEvents: SceneEvent[] = [], pendingEvents: SceneEvent[] = [], soundEvents: SoundEvent[] = [];
  function advance(deltaMs: number): SceneSnapshot {
    frameEvents = pendingEvents; pendingEvents = [];
    clock.advance(deltaMs, elapsedMs, score.durationMs, advanceFixedStep);
    soundEvents = frameEvents.filter((event): event is Extract<SceneEvent, { type: "audio" }> => event.type === "audio").map(({ kind, x, y, atMs }) => ({ kind, x, y, atMs }));
    return snapshot();
  }
  function advanceFixedStep(stepMs: number): void {
    const deltaMs = Math.min(stepMs, score.durationMs - elapsedMs); elapsedMs = Math.min(score.durationMs, elapsedMs + deltaMs);
    const encounter = scenePhaseAt(score, elapsedMs);
    if (encounter.phase !== lastPhase) { frameEvents.push({ type: "phase-change", phase: encounter.phase, beatId: encounter.id, atMs: elapsedMs }); lastPhase = encounter.phase; }
    const context = { sceneId, score, variants, preferences, elapsedMs, forcedRestUntilMs: contacts.state.forcedRestUntilMs };
    for (const actor of actors) advanceActorForFixedStep(actor, encounter, deltaMs, context);
    if (shadowActors) {
      const shadowContext = { sceneId, score, variants, preferences, elapsedMs, forcedRestUntilMs: 0 };
      for (const actor of shadowActors) advanceActorForFixedStep(actor, encounter, deltaMs, shadowContext);
      const scheduled = updateSceneAudio(sceneId, score, audio, variants.sound === "on", elapsedMs, shadowActors, shadowSoundBucket);
      shadowSoundBucket = scheduled.nextBucket;
      const admitted = admitLiveSoundEvent(score, scheduled.events, actors, elapsedMs, contacts.state.forcedRestUntilMs, contacts.state.refractoryUntilMs);
      soundEvents = admitted.events; frameEvents.push(...admitted.frameEvents);
    } else {
      const nextAudio = updateSceneAudio(sceneId, score, audio, variants.sound === "on", elapsedMs, actors, lastSoundBucket);
      soundEvents = nextAudio.events; lastSoundBucket = nextAudio.nextBucket; frameEvents.push(...nextAudio.frameEvents);
    }
    if (elapsedMs >= score.durationMs && !completionSent) { frameEvents.push({ type: "complete", atMs: elapsedMs }); completionSent = true; }
  }
  function touch(point: { x: number; y: number }, timestampMs = elapsedMs) { const contact = contacts.touch(score, preferences, actors, elapsedMs, point, timestampMs, () => random.next()); pendingEvents.push(...contact.events); return contact.result; }
  function snapshot(): SceneSnapshot {
    return sceneSnapshot({ score, elapsedMs, forcedRestUntilMs: contacts.state.forcedRestUntilMs, actors, soundEvents, frameEvents, pendingEvents, reminder: contacts.state.reminder });
  }
  function reset(): SceneSnapshot { elapsedMs = 0; clock.reset(); lastSoundBucket = -1; shadowSoundBucket = -1; completionSent = false; frameEvents = []; pendingEvents = []; soundEvents = []; contacts.reset(); lastPhase = scenePhaseAt(score, 0).phase; random = new SeededRandom(seed); random.next(); actors = createActors(sceneId, actorCount, random); shadowActors = hasShadow ? actors.map((actor) => ({ ...actor })) : undefined; return snapshot(); }
  function dismissReminder(): SceneSnapshot { contacts.dismissReminder(); return snapshot(); }
  return { score, variants, advance, touch, snapshot, reset, dismissReminder };
};
