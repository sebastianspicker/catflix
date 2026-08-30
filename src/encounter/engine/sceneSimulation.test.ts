import { describe, expect, it } from 'vitest';
import { sceneIds, type SceneId, type SceneScore } from '../../domain';
import { getContentManifest, getSceneScore } from '../../catalogue/model';
import { defaultSessionVariant } from '../../domain';
import { createSceneSimulationEngine } from './sceneSimulation';

const defaultVariantSelection = defaultSessionVariant;
const createSceneSimulation = (sceneId: SceneId, variants = defaultVariantSelection, seed = 1, preferences = {}) => {
  const manifest = getContentManifest(sceneId);
  return createSceneSimulationEngine(getSceneScore(sceneId), manifest.audio ? { enabled: manifest.audio.sourceCoherent } : undefined, variants, seed, preferences);
};
const scoreWithInteraction = (configuration: {
  targetMode?: SceneScore['interactionPolicy']['targetMode'];
  hitTolerance?: number;
  refractoryMs?: number;
  rollingContactCap?: { contacts: number; windowMs: number };
  restResponse?: { durationMs: readonly [number, number]; editorialSafetyCap: true };
}): SceneScore => {
  const score = getSceneScore('red-string');
  return {
    ...score,
    interactionPolicy: {
      ...score.interactionPolicy,
      ...configuration,
      rollingContactCap: { ...score.interactionPolicy.rollingContactCap, ...configuration.rollingContactCap },
      restResponse: { ...score.interactionPolicy.restResponse, ...configuration.restResponse },
    },
  };
};
const createSimulationForScore = (score: SceneScore) => createSceneSimulationEngine(score, undefined, defaultVariantSelection, 12, {});

describe('deterministic finite simulations', () => {
  it('runs from a supplied compiled score and minimal audio metadata', () => {
    const score = getSceneScore('paper-moth');
    const simulation = createSceneSimulationEngine(score, { enabled: true }, defaultVariantSelection, 7, {});
    expect(simulation.snapshot().sceneId).toBe('paper-moth');
  });

  for (const sceneId of sceneIds) {
    it(`${sceneId} reproduces its seeded trajectory and finishes`, () => {
      const first = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      const second = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      for (let index = 0; index < 80; index += 1) {
        expect(first.advance(137)).toEqual(second.advance(137));
      }
      let state = first.snapshot();
      while (!state.complete) state = first.advance(250);
      expect(state.elapsedMs).toBe(getSceneScore(sceneId).durationMs);
      for (const actor of state.actors) {
        expect(actor.x).toBeGreaterThanOrEqual(.06);
        expect(actor.x).toBeLessThanOrEqual(.94);
        expect(actor.y).toBeGreaterThanOrEqual(.08);
        expect(actor.y).toBeLessThanOrEqual(.92);
      }
    });
  }

  it('rate-limits touches without changing speed or duration', () => {
    const simulation = createSceneSimulation('red-string', defaultVariantSelection, 12);
    const duration = simulation.score.durationMs;
    const actor = simulation.snapshot().actors[0];
    const first = simulation.touch({ x: actor.x, y: actor.y }, 1000);
    const repeated = simulation.touch({ x: actor.x, y: actor.y }, 1001);
    expect(first.accepted).toBe(true);
    expect(repeated.accepted).toBe(false);
    expect(simulation.score.baseSpeed).toBe(.07);
    expect(simulation.snapshot().durationMs).toBe(duration);
  });

  it('rejects background taps instead of rerouting a distant actor', () => {
    const simulation = createSceneSimulation('paper-moth', defaultVariantSelection, 44);
    const actor = simulation.snapshot().actors[0];
    const distant = { x: actor.x < .5 ? .98 : .02, y: actor.y < .5 ? .98 : .02 };
    expect(simulation.touch(distant, 1000).accepted).toBe(false);
  });

  it('uses a materially calmer motion score when explicit low scene motion is requested', () => {
    const full = createSceneSimulation('paper-moth', defaultVariantSelection, 91);
    const reduced = createSceneSimulation('paper-moth', defaultVariantSelection, 91, { sceneMotionMode: 'low' });
    let fullDistance = 0;
    let reducedDistance = 0;
    let previousFull = full.snapshot().actors[0];
    let previousReduced = reduced.snapshot().actors[0];
    for (let index = 0; index < 120; index += 1) {
      const nextFull = full.advance(100).actors[0];
      const nextReduced = reduced.advance(100).actors[0];
      fullDistance += Math.hypot(nextFull.x - previousFull.x, nextFull.y - previousFull.y);
      reducedDistance += Math.hypot(nextReduced.x - previousReduced.x, nextReduced.y - previousReduced.y);
      previousFull = nextFull;
      previousReduced = nextReduced;
    }
    expect(reducedDistance).toBeLessThan(fullDistance * .5);
    expect(previousReduced.scaleX).toBe(1);
    expect(previousReduced.scaleY).toBe(1);
  });

  it('never invents fish vocalizations', () => {
    const withSound = createSceneSimulation('koi-pool', { ...defaultVariantSelection, sound: 'on' }, 8);
    const kinds = new Set<string>();
    for (let index = 0; index < 70; index += 1) withSound.advance(250).soundEvents.forEach((event) => kinds.add(event.kind));
    expect([...kinds]).not.toContain('fish-vocalization');
  });

  it('uses a fixed simulation clock across renderer frame rates', () => {
    const coalesced = createSceneSimulation('koi-pool', defaultVariantSelection, 19);
    const frequent = createSceneSimulation('koi-pool', defaultVariantSelection, 19);
    coalesced.advance(2_000);
    for (let index = 0; index < 120; index += 1) frequent.advance(1000 / 60);
    expect(coalesced.snapshot()).toEqual(frequent.snapshot());
  });

  it('exposes renderer fields and keeps every scene subject-interactive', () => {
    for (const sceneId of sceneIds) {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 24);
      const actor = simulation.snapshot().actors[0];
      expect(simulation.touch({ x: actor.x, y: actor.y }, 0).accepted).toBe(true);
      const frame = simulation.advance(100).actors[0];
      expect(frame).toMatchObject({ animationState: expect.any(String), poseFrame: expect.any(Number), stateProgress: expect.any(Number), depth: expect.any(Number), alpha: expect.any(Number), scaleX: expect.any(Number), scaleY: expect.any(Number) });
    }
  });

  it('emits one dismissible reminder after three accepted contacts in twenty seconds', () => {
    const simulation = createSceneSimulation('red-string', defaultVariantSelection, 33);
    const actor = simulation.snapshot().actors[0];
    expect(simulation.touch(actor, 0).accepted).toBe(true);
    expect(simulation.touch(actor, 3_501).accepted).toBe(true);
    expect(simulation.touch(actor, 7_002).accepted).toBe(true);
    expect(simulation.snapshot().reminder).toMatchObject({ type: 'contact-reminder', dismissible: true, acceptedContacts: 3 });
    expect(simulation.snapshot().phase).toBe('rest');
    expect(simulation.snapshot().events).toContainEqual(expect.objectContaining({ type: 'rest-window', reason: 'editorial-contact-cap' }));
    expect(simulation.dismissReminder().reminder).toBeUndefined();
  });

  it('progresses through finite authored phases and ends in a visible finale for every scene', () => {
    for (const sceneId of sceneIds) {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      const phases = new Set([simulation.snapshot().phase]);
      while (!simulation.snapshot().complete) phases.add(simulation.advance(5_000).phase);
      expect(phases).toEqual(new Set(['invitation', 'passage', 'occlusion', 'reappearance', 'contact-response', 'rest', 'finale']));
      const final = simulation.snapshot();
      expect(final.phase).toBe('finale');
      expect(final.remainingMs).toBe(0);
      expect(final.actors.every((actor) => actor.visible && actor.state === 'paused')).toBe(true);
    }
  });

  it('keeps compiled behaviors, occlusion, and pose cadence bounded', () => {
    const transitions = new Map<SceneId, number>();
    for (const sceneId of sceneIds) {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 442);
      const seen = new Set<string>();
      let previous = simulation.snapshot().actors[0].poseFrame;
      let changes = 0;
      while (!simulation.snapshot().complete) {
        for (const actor of simulation.advance(100).actors) {
          seen.add(actor.animationState);
          expect(actor.x).toBeGreaterThanOrEqual(.06);
          expect(actor.x).toBeLessThanOrEqual(.94);
          expect(actor.y).toBeGreaterThanOrEqual(.08);
          expect(actor.y).toBeLessThanOrEqual(.92);
          if (actor.alpha < .8) {
            expect(getSceneScore(sceneId).occlusionZones.some((zone) => actor.x >= zone.minX - .08 && actor.x <= zone.maxX + .08 && actor.y >= zone.minY - .08 && actor.y <= zone.maxY + .08)).toBe(true);
          }
          if (actor.poseFrame !== previous) changes += 1;
          previous = actor.poseFrame;
        }
      }
      expect(seen).toEqual(new Set(simulation.score.behaviors.map((behavior) => behavior.state)));
      transitions.set(sceneId, changes);
    }
    expect(transitions.get('koi-pool')).toBeLessThan(transitions.get('paper-moth') ?? 0);
    expect(transitions.get('paper-moth')).toBeLessThan(250);
  });

  it.each([
    {
      label: 'target mode',
      baseline: { targetMode: 'subject-only' as const },
      changed: { targetMode: 'disabled' as const },
      expected: [true, false],
      exercise: (score: SceneScore) => {
        const simulation = createSimulationForScore(score);
        return simulation.touch(simulation.snapshot().actors[0], 0).accepted;
      },
    },
    {
      label: 'hit tolerance',
      baseline: { hitTolerance: .03 },
      changed: { hitTolerance: .005 },
      expected: [true, false],
      exercise: (score: SceneScore) => {
        const simulation = createSimulationForScore(score);
        const actor = simulation.snapshot().actors[0];
        return simulation.touch({ x: actor.x + .02, y: actor.y }, 0).accepted;
      },
    },
    {
      label: 'refractory interval',
      baseline: { refractoryMs: 1 },
      changed: { refractoryMs: 1_000 },
      expected: [true, false],
      exercise: (score: SceneScore) => {
        const simulation = createSimulationForScore(score);
        const actor = simulation.snapshot().actors[0];
        simulation.touch(actor, 0);
        return simulation.touch(actor, 10).accepted;
      },
    },
    {
      label: 'contact cap',
      baseline: { refractoryMs: 1, rollingContactCap: { contacts: 3, windowMs: 1_000 } },
      changed: { refractoryMs: 1, rollingContactCap: { contacts: 2, windowMs: 1_000 } },
      expected: [false, true],
      exercise: (score: SceneScore) => {
        const simulation = createSimulationForScore(score);
        const actor = simulation.snapshot().actors[0];
        simulation.touch(actor, 0);
        simulation.touch(actor, 10);
        return simulation.snapshot().reminder !== undefined;
      },
    },
    {
      label: 'rolling contact window',
      baseline: { refractoryMs: 1, rollingContactCap: { contacts: 2, windowMs: 5 } },
      changed: { refractoryMs: 1, rollingContactCap: { contacts: 2, windowMs: 1_000 } },
      expected: [false, true],
      exercise: (score: SceneScore) => {
        const simulation = createSimulationForScore(score);
        const actor = simulation.snapshot().actors[0];
        simulation.touch(actor, 0);
        simulation.touch(actor, 10);
        return simulation.snapshot().reminder !== undefined;
      },
    },
    {
      label: 'rest duration',
      baseline: { rollingContactCap: { contacts: 1, windowMs: 1_000 }, restResponse: { durationMs: [100, 100] as const, editorialSafetyCap: true as const } },
      changed: { rollingContactCap: { contacts: 1, windowMs: 1_000 }, restResponse: { durationMs: [500, 500] as const, editorialSafetyCap: true as const } },
      expected: [100, 500],
      exercise: (score: SceneScore) => {
        const simulation = createSimulationForScore(score);
        const actor = simulation.snapshot().actors[0];
        simulation.touch(actor, 0);
        return simulation.snapshot().events.find((event) => event.type === 'rest-window')?.durationMs;
      },
    },
  ])('$label changes the authoritative interaction behavior', ({ baseline, changed, expected, exercise }) => {
    expect(exercise(scoreWithInteraction(baseline))).toBe(expected[0]);
    expect(exercise(scoreWithInteraction(changed))).toBe(expected[1]);
  });

  it('rejects all cat-facing contacts in passive television mode', () => {
    const simulation = createSceneSimulation('paper-moth', defaultVariantSelection, 7319, { playbackMode: 'tv-passive' });
    expect(simulation.touch(simulation.snapshot().actors[0], 0).accepted).toBe(false);
    expect(simulation.snapshot().events).toEqual([]);
  });
});
