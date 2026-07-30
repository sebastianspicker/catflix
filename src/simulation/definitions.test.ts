import { describe, expect, it } from 'vitest';
import { sceneIds, type SceneId } from '../content/types';
import type { SceneActorSnapshot } from './types';
import { createSceneSimulation, defaultVariantSelection, getSceneDefinition, sceneScores } from './definitions';

describe('deterministic finite simulations', () => {
  for (const sceneId of sceneIds) {
    it(`${sceneId} reproduces its seeded trajectory and finishes`, () => {
      const first = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      const second = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      for (let index = 0; index < 80; index += 1) {
        expect(first.advance(137)).toEqual(second.advance(137));
      }
      let state = first.snapshot();
      while (!state.complete) state = first.advance(250);
      expect(state.elapsedMs).toBe(getSceneDefinition(sceneId).durationMs);
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
    const duration = simulation.definition.durationMs;
    const actor = simulation.snapshot().actors[0];
    const first = simulation.touch({ x: actor.x, y: actor.y }, 1000);
    const repeated = simulation.touch({ x: actor.x, y: actor.y }, 1001);
    expect(first.accepted).toBe(true);
    expect(repeated.accepted).toBe(false);
    expect(simulation.definition.baseSpeed).toBe(.07);
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

  it('gives each scene an authored motion signature', () => {
    const samples = Object.fromEntries(sceneIds.map((sceneId) => {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      const frames = Array.from({ length: 220 }, () => simulation.advance(100).actors[0]);
      return [sceneId, frames];
    })) as Record<SceneId, SceneActorSnapshot[]>;

    expect(samples['balcony-birds'].some((actor) => actor.state === 'paused')).toBe(true);
    expect(samples['balcony-birds'].some((actor) => actor.animationState === 'flying')).toBe(true);
    expect(angleRange(samples['koi-pool'].map((actor) => actor.angle))).toBeGreaterThan(.3);
    expect(valueRange(samples['paper-moth'].map((actor) => actor.scaleX))).toBeGreaterThan(.08);
    expect(samples['paper-moth'].some((actor) => actor.state === 'paused')).toBe(true);
    expect(samples['beetle-under-the-fern'].some((actor) => actor.state === 'paused')).toBe(true);
    expect(angleRange(samples['red-string'].map((actor) => actor.angle))).toBeGreaterThan(.45);
  });

  it('visits every authored scene-score state without generic rebound motion', () => {
    for (const sceneId of sceneIds) {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      const visited = new Set<string>();
      while (!simulation.snapshot().complete) {
        for (const actor of simulation.advance(100).actors) visited.add(actor.animationState);
      }
      for (const authoredState of simulation.definition.authoredStates) expect(visited, `${sceneId} should visit ${authoredState}`).toContain(authoredState);
    }
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

  it('gives koi distinct propulsive swimming and passive gliding signatures', () => {
    const simulation = createSceneSimulation('koi-pool', defaultVariantSelection, 7319);
    let previous = simulation.snapshot().actors[0];
    const speeds: Record<'swimming' | 'gliding', number[]> = { swimming: [], gliding: [] };
    const tailDeformation: Record<'swimming' | 'gliding', number[]> = { swimming: [], gliding: [] };
    for (let index = 0; index < 1_200; index += 1) {
      const actor = simulation.advance(50).actors[0];
      if (actor.animationState === 'swimming' || actor.animationState === 'gliding') {
        speeds[actor.animationState].push(Math.hypot(actor.x - previous.x, actor.y - previous.y) / .05);
        tailDeformation[actor.animationState].push(Math.abs(actor.scaleX - 1));
      }
      previous = actor;
    }
    expect(speeds.swimming.length).toBeGreaterThan(20);
    expect(speeds.gliding.length).toBeGreaterThan(20);
    expect(average(speeds.swimming)).toBeGreaterThan(average(speeds.gliding) * 1.25);
    expect(average(tailDeformation.swimming)).toBeGreaterThan(average(tailDeformation.gliding) * 1.8);
  });

  it('keeps species pose cadences distinct and prevents fish-frame chatter', () => {
    const transitions = {} as Record<SceneId, number>;
    for (const sceneId of sceneIds) {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 7319);
      let previousFrame = simulation.snapshot().actors[0].poseFrame;
      transitions[sceneId] = 0;
      for (let index = 0; index < 400; index += 1) {
        const frame = simulation.advance(50).actors[0].poseFrame;
        if (frame !== previousFrame) transitions[sceneId] += 1;
        previousFrame = frame;
      }
    }
    expect(transitions['koi-pool']).toBeLessThan(35);
    expect(transitions['paper-moth']).toBeGreaterThan(transitions['koi-pool']);
    expect(transitions['paper-moth']).toBeLessThan(150);
    expect(transitions['beetle-under-the-fern']).toBeLessThan(100);
  });

  it('uses projection-consistent pose families instead of unrelated novelty-frame offsets', () => {
    const familiar = createSceneSimulation('koi-pool', defaultVariantSelection, 7319);
    const alternate = createSceneSimulation('koi-pool', { ...defaultVariantSelection, novelty: 'alternate' }, 7319);
    const koiFrames = new Set<number>();
    const mothFrames = new Set<number>();
    const moth = createSceneSimulation('paper-moth', defaultVariantSelection, 7319);
    for (let index = 0; index < 500; index += 1) {
      const familiarFish = familiar.advance(50).actors[0];
      const alternateFish = alternate.advance(50).actors[0];
      expect(alternateFish.poseFrame).toBe(familiarFish.poseFrame);
      koiFrames.add(familiarFish.poseFrame);
      mothFrames.add(moth.advance(50).actors[0].poseFrame);
    }
    expect([...koiFrames].every((frame) => [1, 5, 7].includes(frame))).toBe(true);
    expect([...mothFrames].every((frame) => frame >= 0 && frame <= 3)).toBe(true);
  });

  it('declares responsive subject sizing in the same scene score used by both renderers', () => {
    expect(sceneScores['balcony-birds'].displayWidth).toBeGreaterThanOrEqual(.16);
    expect(sceneScores['koi-pool'].displayWidth).toBeGreaterThanOrEqual(.18);
    expect(sceneScores['paper-moth'].displayWidth).toBeGreaterThanOrEqual(.14);
    expect(sceneScores['beetle-under-the-fern'].displayWidth).toBeGreaterThanOrEqual(.12);
    for (const sceneId of sceneIds) expect(sceneScores[sceneId].displayWidth).toBeLessThanOrEqual(.22);
  });

  it('connects rest states to visible surfaces and cover', () => {
    const birds = createSceneSimulation('balcony-birds', defaultVariantSelection, 7319);
    const moth = createSceneSimulation('paper-moth', defaultVariantSelection, 7319);
    const beetle = createSceneSimulation('beetle-under-the-fern', defaultVariantSelection, 7319);
    let perched = 0;
    let landedAtEdge = 0;
    let shelteredNearFern = 0;
    for (let index = 0; index < 1_800; index += 1) {
      const birdActor = birds.advance(50).actors[0];
      if (birdActor.animationState === 'perching' && birdActor.state === 'paused') {
        perched += 1;
        expect(birdActor.y).toBeGreaterThan(.68);
      }
      const mothActor = moth.advance(50).actors[0];
      if (mothActor.animationState === 'landed') {
        if (mothActor.x < .16 || mothActor.x > .84) landedAtEdge += 1;
      }
      const beetleActor = beetle.advance(50).actors[0];
      if (beetleActor.animationState === 'sheltering') {
        const nearFern = sceneScores['beetle-under-the-fern'].occlusionZones.some((zone) => beetleActor.x >= zone.minX - .1 && beetleActor.x <= zone.maxX + .1 && beetleActor.y >= zone.minY - .1 && beetleActor.y <= zone.maxY + .1);
        if (nearFern) shelteredNearFern += 1;
      }
    }
    expect(perched).toBeGreaterThan(20);
    expect(landedAtEdge).toBeGreaterThan(20);
    expect(shelteredNearFern).toBeGreaterThan(20);
  });

  it('keeps authored locomotion within speed and acceleration limits', () => {
    for (const sceneId of sceneIds) {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 57);
      let previous = simulation.snapshot().actors[0];
      let previousVelocity = { x: 0, y: 0 };
      for (let index = 0; index < 800; index += 1) {
        const actor = simulation.advance(50).actors[0];
        const velocity = { x: (actor.x - previous.x) / .05, y: (actor.y - previous.y) / .05 };
        const speed = Math.hypot(velocity.x, velocity.y);
        const acceleration = Math.hypot(velocity.x - previousVelocity.x, velocity.y - previousVelocity.y) / .05;
        expect(speed, `${sceneId} speed`).toBeLessThanOrEqual(sceneScores[sceneId].maxSpeed + .015);
        // Position samples include steering as well as propulsive acceleration.
        expect(acceleration, `${sceneId} acceleration at sample ${index}, ${actor.animationState}, ${actor.x}, ${actor.y}`).toBeLessThanOrEqual(sceneScores[sceneId].maxAcceleration * 1.35 + .08);
        previous = actor;
        previousVelocity = velocity;
      }
    }
  });

  it('only reduces actor alpha when the subject intersects an authored occlusion zone', () => {
    for (const sceneId of sceneIds) {
      const simulation = createSceneSimulation(sceneId, defaultVariantSelection, 88);
      for (let index = 0; index < 900; index += 1) {
        for (const actor of simulation.advance(50).actors) {
          // Koi depth shading may reach .82 without cover; values below .8 are occlusion-specific.
          if (actor.alpha >= .8) continue;
          const nearZone = sceneScores[sceneId].occlusionZones.some((zone) => actor.x >= zone.minX - .08 && actor.x <= zone.maxX + .08 && actor.y >= zone.minY - .08 && actor.y <= zone.maxY + .08);
          expect(nearZone, `${sceneId} occlusion at ${actor.x}, ${actor.y}`).toBe(true);
        }
      }
    }
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

  it('selects a phase-eligible contact response and never escalates scene intensity', () => {
    for (const sceneId of sceneIds) {
      const responses = new Set<string>();
      const definition = getSceneDefinition(sceneId);
      for (let seed = 1; seed <= 160 && responses.size < definition.touchPolicy.allowedResponses.length; seed += 1) {
        const simulation = createSceneSimulation(sceneId, { ...defaultVariantSelection, sound: 'on' }, seed);
        const before = simulation.snapshot();
        const response = simulation.touch(before.actors[0], 0);
        if (response.response) responses.add(response.response);
        expect(simulation.snapshot()).toMatchObject({ durationMs: before.durationMs });
        expect(simulation.snapshot().actors).toHaveLength(before.actors.length);
        expect(simulation.definition.baseSpeed).toBe(definition.baseSpeed);
        expect(simulation.snapshot().soundEvents).toHaveLength(0);
      }
      expect(responses.size).toBeGreaterThan(0);
      expect([...responses].every((response) => definition.touchPolicy.allowedResponses.includes(response as never))).toBe(true);
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

  it('rejects all cat-facing contacts in passive television mode', () => {
    const simulation = createSceneSimulation('paper-moth', defaultVariantSelection, 7319, { playbackMode: 'tv-passive' });
    expect(simulation.touch(simulation.snapshot().actors[0], 0).accepted).toBe(false);
    expect(simulation.snapshot().events).toEqual([]);
  });
});

const valueRange = (values: number[]) => Math.max(...values) - Math.min(...values);
const angleRange = valueRange;
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
