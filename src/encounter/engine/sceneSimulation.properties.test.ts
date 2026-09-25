import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { defaultSessionVariant, sceneIds, type PlaybackMode, type Point, type SceneEvent, type SceneId, type SceneMotionMode, type SceneSimulation, type SceneSnapshot, type VariantSelection } from '../../domain';
import { getContentManifest, getSceneScore } from '../../catalogue/model';
import { createSceneSimulationEngine } from './sceneSimulation';

/**
 * Product-invariant properties for the deterministic encounter engine, exercised only through
 * `SceneSimulation`'s public surface (advance/touch/snapshot).
 */

interface Step { deltaMs: number; touch: Point | undefined; }

const SPEED_CEILING_TOLERANCE = 1.25;

const sceneIdArb = fc.constantFrom(...sceneIds);
const variantArb: fc.Arbitrary<VariantSelection> = fc.record({
  figureGround: fc.constantFrom('natural', 'enhanced'),
  motion: fc.constantFrom('continuous', 'intermittent'),
  sound: fc.constantFrom('off', 'on'),
  novelty: fc.constantFrom('familiar', 'alternate'),
});
const seedArb = fc.integer({ min: 1, max: 1_000_000 });
const soundOnVariantArb: fc.Arbitrary<VariantSelection> = variantArb.map((variant) => ({ ...variant, sound: 'on' }));
const motionModeArb = fc.constantFrom<SceneMotionMode>('standard', 'low');
const pointArb: fc.Arbitrary<Point> = fc.record({ x: fc.float({ min: 0, max: 1, noNaN: true }), y: fc.float({ min: 0, max: 1, noNaN: true }) });
// deltaMs stays at or above two fixed 1000/60ms physics ticks so a step's own nominal duration
// dominates any leftover accumulator carried from the fixed-step clock between advance() calls;
// see the report for why sub-tick deltas make position-derived speed an unreliable measurement.
const stepArb: fc.Arbitrary<Step> = fc.record({ deltaMs: fc.integer({ min: 40, max: 1_500 }), touch: fc.option(pointArb, { nil: undefined }) });
const stepsArb = fc.array(stepArb, { minLength: 1, maxLength: 25 });

const audioFor = (sceneId: SceneId) => {
  const manifest = getContentManifest(sceneId);
  return manifest.audio ? { enabled: manifest.audio.sourceCoherent } : undefined;
};
const buildEngine = (sceneId: SceneId, variants: VariantSelection, seed: number, playbackMode: PlaybackMode, sceneMotionMode: SceneMotionMode): SceneSimulation =>
  createSceneSimulationEngine(getSceneScore(sceneId), audioFor(sceneId), variants, seed, { playbackMode, sceneMotionMode });
const withoutTouches = (steps: readonly Step[]): Step[] => steps.map((step) => ({ deltaMs: step.deltaMs, touch: undefined }));
const advanceStep = (engine: SceneSimulation, step: Step): SceneSnapshot => { if (step.touch) engine.touch(step.touch); return engine.advance(step.deltaMs); };
const runSequence = (engine: SceneSimulation, steps: readonly Step[]): SceneSnapshot[] => steps.map((step) => advanceStep(engine, step));
const isRestWindow = (event: SceneEvent): event is Extract<SceneEvent, { type: 'rest-window' }> => event.type === 'rest-window';
const firstActor = (engine: SceneSimulation): Point => { const actor = engine.snapshot().actors[0]; if (!actor) throw new Error('scene produced no actors'); return actor; };
const soundEventMultiset = (snapshots: readonly SceneSnapshot[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const snapshot of snapshots) for (const event of snapshot.soundEvents) counts.set(`${event.kind}@${event.atMs}`, (counts.get(`${event.kind}@${event.atMs}`) ?? 0) + 1);
  return counts;
};
const isSubmultisetOf = (subset: Map<string, number>, superset: Map<string, number>): boolean => [...subset].every(([key, count]) => (superset.get(key) ?? 0) >= count);

describe('encounter engine product invariants: finite and deterministic', () => {
  it('completes at exactly its declared duration and stays silent after completion', () => {
    fc.assert(fc.property(sceneIdArb, variantArb, seedArb, motionModeArb, stepsArb, (sceneId, variants, seed, sceneMotionMode, steps) => {
      const engine = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const score = engine.score;
      for (const step of steps) {
        const wasComplete = engine.snapshot().complete;
        const snapshot = advanceStep(engine, step);
        expect(snapshot.elapsedMs).toBeLessThanOrEqual(score.durationMs);
        if (wasComplete) { expect(snapshot.events).toEqual([]); expect(snapshot.elapsedMs).toBe(score.durationMs); }
      }
      let final = engine.snapshot(), guard = 0;
      while (!final.complete && guard < 50) { final = engine.advance(10_000); guard += 1; }
      expect(final.complete).toBe(true);
      expect(final.elapsedMs).toBe(score.durationMs);
      const after = engine.advance(2_000);
      expect(after.elapsedMs).toBe(score.durationMs);
      expect(after.events).toEqual([]);
      expect(after.soundEvents).toEqual([]);
    }), { numRuns: 20 });
  });

  it('reproduces identical snapshot and event sequences for identical scene, variant, seed and inputs', () => {
    fc.assert(fc.property(sceneIdArb, variantArb, seedArb, motionModeArb, stepsArb, (sceneId, variants, seed, sceneMotionMode, steps) => {
      const run = () => runSequence(buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode), steps);
      expect(run()).toEqual(run());
    }), { numRuns: 20 });
  });
});

describe('encounter engine product invariants: contacts never escalate', () => {
  it('never changes actor count, contrast configuration, or total elapsed run time compared with a contact-free run', () => {
    fc.assert(fc.property(sceneIdArb, variantArb, seedArb, motionModeArb, stepsArb, (sceneId, variants, seed, sceneMotionMode, steps) => {
      const touched = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const untouched = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const touchedFinal = runSequence(touched, steps).at(-1);
      const untouchedFinal = runSequence(untouched, withoutTouches(steps)).at(-1);
      expect(touchedFinal?.actors.length).toBe(untouchedFinal?.actors.length);
      expect(touchedFinal?.elapsedMs).toBe(untouchedFinal?.elapsedMs);
      expect(touched.variants).toEqual(untouched.variants);
    }), { numRuns: 20 });
  });

  it('never lets an actor exceed the scene’s authored speed ceiling after an accepted contact', () => {
    fc.assert(fc.property(sceneIdArb, variantArb, seedArb, motionModeArb, stepsArb, (sceneId, variants, seed, sceneMotionMode, steps) => {
      const engine = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const score = engine.score;
      let previousActors = engine.snapshot().actors;
      for (const step of steps) {
        const nextActors = advanceStep(engine, step).actors;
        const stepSeconds = step.deltaMs / 1000;
        for (const actor of nextActors) {
          const before = previousActors.find((candidate) => candidate.id === actor.id);
          if (!before) continue;
          const speed = Math.hypot(actor.x - before.x, actor.y - before.y) / stepSeconds;
          expect(speed).toBeLessThanOrEqual(score.maxSpeed * SPEED_CEILING_TOLERANCE);
        }
        previousActors = nextActors;
      }
    }), { numRuns: 20 });
  });

  // Former engine gap, now a regression test: an accepted contact could shift an actor's
  // paused/hidden animationState and position at the exact moment `updateSceneAudio` sampled
  // its time-bucket, so a touched run could emit MORE sound events than the matched
  // contact-free run. Sound is now scheduled against a contact-free shadow timeline (see
  // sceneSimulation.ts / sceneAudio.ts), so the touched run's events are always a subset of
  // the shadow's. Minimized case retained: balcony-birds, seed 1, defaultSessionVariant with
  // sound "on", touching the lead actor's own position every third 250ms tick for 120 ticks
  // previously yielded 4 sound events touched vs 3 untouched; it now holds as an ordinary pass.
  it('accepted contacts never increase the number of emitted sound events versus a contact-free run', () => {
    const variants: VariantSelection = { ...defaultSessionVariant, sound: 'on' };
    const touched = buildEngine('balcony-birds', variants, 1, 'tablet-touch', 'standard');
    const untouched = buildEngine('balcony-birds', variants, 1, 'tablet-touch', 'standard');
    let touchedCount = 0, untouchedCount = 0, elapsedMs = 0;
    for (let tick = 0; tick < 120; tick += 1) {
      if (tick % 3 === 0) touched.touch(firstActor(touched), elapsedMs);
      touchedCount += touched.advance(250).soundEvents.length;
      untouchedCount += untouched.advance(250).soundEvents.length;
      elapsedMs += 250;
    }
    expect(touchedCount).toBeLessThanOrEqual(untouchedCount);
  });

  it('keeps a touched run’s multiset of sound events a subset of the matched contact-free run’s', () => {
    fc.assert(fc.property(sceneIdArb, soundOnVariantArb, seedArb, motionModeArb, stepsArb, (sceneId, variants, seed, sceneMotionMode, steps) => {
      const touched = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const untouched = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const touchedEvents = soundEventMultiset(runSequence(touched, steps));
      const untouchedEvents = soundEventMultiset(runSequence(untouched, withoutTouches(steps)));
      expect(isSubmultisetOf(touchedEvents, untouchedEvents)).toBe(true);
    }), { numRuns: 20 });
  });

  it('never plays a sound event within the scene’s quiet window after an accepted contact', () => {
    fc.assert(fc.property(sceneIdArb, soundOnVariantArb, seedArb, motionModeArb, stepsArb, (sceneId, variants, seed, sceneMotionMode, steps) => {
      const engine = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const refractoryMs = engine.score.interactionPolicy.refractoryMs;
      const acceptedAtMs: number[] = [], soundAtMs: number[] = [];
      for (const step of steps) {
        if (step.touch) { const timestampMs = engine.snapshot().elapsedMs; if (engine.touch(step.touch).accepted) acceptedAtMs.push(timestampMs); }
        soundAtMs.push(...engine.advance(step.deltaMs).soundEvents.map((event) => event.atMs));
      }
      for (const soundMs of soundAtMs) for (const acceptedMs of acceptedAtMs) expect(soundMs < acceptedMs || soundMs - acceptedMs >= refractoryMs).toBe(true);
    }), { numRuns: 20 });
  });
});

describe('encounter engine product invariants: passive playback and rest window', () => {
  it('rejects every contact in passive television mode and matches the contact-free run exactly', () => {
    fc.assert(fc.property(sceneIdArb, variantArb, seedArb, motionModeArb, stepsArb, (sceneId, variants, seed, sceneMotionMode, steps) => {
      const passive = buildEngine(sceneId, variants, seed, 'tv-passive', sceneMotionMode);
      const reference = buildEngine(sceneId, variants, seed, 'tv-passive', sceneMotionMode);
      const accepted: boolean[] = [];
      const passiveSnapshots = steps.map((step) => { if (step.touch) accepted.push(passive.touch(step.touch).accepted); return passive.advance(step.deltaMs); });
      const referenceSnapshots = runSequence(reference, withoutTouches(steps));
      expect(accepted).not.toContain(true);
      expect(passiveSnapshots).toEqual(referenceSnapshots);
    }), { numRuns: 20 });
  });

  it('opens a 10-12s quiet rest window after three accepted target contacts within twenty seconds', () => {
    fc.assert(fc.property(sceneIdArb, variantArb, seedArb, motionModeArb, (sceneId, variants, seed, sceneMotionMode) => {
      const engine = buildEngine(sceneId, variants, seed, 'tablet-touch', sceneMotionMode);
      const actor = firstActor(engine);
      const accepted = [engine.touch(actor, 0).accepted, engine.touch(actor, 6_000).accepted, engine.touch(actor, 12_000).accepted];
      expect(accepted).toEqual([true, true, true]);
      const snapshot = engine.snapshot();
      expect(snapshot.reminder).toMatchObject({ type: 'contact-reminder', dismissible: true, acceptedContacts: 3, editorialSafetyCap: true });
      const restEvent = snapshot.events.find(isRestWindow);
      expect(restEvent?.reason).toBe('editorial-contact-cap');
      expect(restEvent?.durationMs).toBeGreaterThanOrEqual(10_000);
      expect(restEvent?.durationMs).toBeLessThanOrEqual(12_000);
      expect(snapshot.phase).toBe('rest');
    }), { numRuns: 20 });
  });
});
