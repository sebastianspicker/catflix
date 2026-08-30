import type { SceneEvent, SceneScore, SceneSimulation, SceneSnapshot, SimulationPreferences, SoundEvent, VariantSelection } from "../../domain";
import { createActors } from "./actorFactory";
import { advanceActorForFixedStep, scenePhaseAt } from "./actorMotion";
import { ContactController } from "./contactController";
import { updateSceneAudio } from "./sceneAudio";
import { FixedSceneClock, SeededRandom } from "./sceneClock";
import { sceneSnapshot } from "./sceneSnapshot";
import { isLowMotion } from "./simulationTiming";
import type { EncounterAudioMetadata } from "./sceneAudio";

/** Pure fixed-step encounter engine. The compiled score is its sole scene input. */
export const createSceneSimulationEngine = (score: SceneScore, audio: EncounterAudioMetadata | undefined, variants: VariantSelection, seed: number, preferences: SimulationPreferences): SceneSimulation => {
  const sceneId = score.id, contacts = new ContactController();
  const clock = new FixedSceneClock();
  let random = new SeededRandom(seed), elapsedMs = 0, lastSoundBucket = -1, completionSent = false;
  const actorCount = isLowMotion(preferences) ? score.lowMotionOverride.actorCount : score.actorCount[0] + Math.floor(random.next() * (score.actorCount[1] - score.actorCount[0] + 1));
  let lastPhase = scenePhaseAt(score, 0).phase, actors = createActors(sceneId, actorCount, random), frameEvents: SceneEvent[] = [], pendingEvents: SceneEvent[] = [], soundEvents: SoundEvent[] = [];
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
    const nextAudio = updateSceneAudio(sceneId, score, audio, variants.sound === "on", elapsedMs, actors, lastSoundBucket);
    soundEvents = nextAudio.events; lastSoundBucket = nextAudio.nextBucket; frameEvents.push(...nextAudio.frameEvents);
    if (elapsedMs >= score.durationMs && !completionSent) { frameEvents.push({ type: "complete", atMs: elapsedMs }); completionSent = true; }
  }
  function touch(point: { x: number; y: number }, timestampMs = elapsedMs) { const contact = contacts.touch(score, preferences, actors, elapsedMs, point, timestampMs, () => random.next()); pendingEvents.push(...contact.events); return contact.result; }
  function snapshot(): SceneSnapshot {
    return sceneSnapshot({ score, elapsedMs, forcedRestUntilMs: contacts.state.forcedRestUntilMs, actors, soundEvents, frameEvents, pendingEvents, reminder: contacts.state.reminder });
  }
  function reset(): SceneSnapshot { elapsedMs = 0; clock.reset(); lastSoundBucket = -1; completionSent = false; frameEvents = []; pendingEvents = []; soundEvents = []; contacts.reset(); lastPhase = scenePhaseAt(score, 0).phase; random = new SeededRandom(seed); random.next(); actors = createActors(sceneId, actorCount, random); return snapshot(); }
  function dismissReminder(): SceneSnapshot { contacts.dismissReminder(); return snapshot(); }
  return { score, variants, advance, touch, snapshot, reset, dismissReminder };
};
