import { describe, expect, it, vi } from 'vitest';
import { getContentManifest } from '../catalogue/model';
import { defaultSessionVariant } from '../domain';
import type { SessionPlan } from '../encounter/session';
import { createObservation, mergeQueueIds, queueRecords, resolvePreparedVariant, sessionUpdate } from './catalogueModel';

const plan: SessionPlan = {
  manifest: getContentManifest('paper-moth'),
  seed: 73,
  variants: defaultSessionVariant,
  playbackMode: 'tablet-touch',
  sceneMotionMode: 'standard',
  setup: { stableDevice: true, protectedCables: true, openExit: true, supervised: true, roomLightBand: 'dim', viewingDistanceBand: 'near-screen', observedCat: 'Mika' },
};

describe('catalogue model contracts', () => {
  it('uses the domain-owned ordinary session default, including opt-in audio', () => {
    expect(defaultSessionVariant).toEqual({ figureGround: 'natural', motion: 'intermittent', sound: 'on', novelty: 'familiar' });
  });

  it('keeps incomplete progress proportional, marks completed sessions final, and has no update without a plan', () => {
    expect(sessionUpdate(null, { elapsedMs: 1, complete: false, touchTimestamps: [], soundEnabled: false })).toBeNull();
    expect(sessionUpdate(plan, { elapsedMs: 18_000, complete: false, touchTimestamps: [1_000], soundEnabled: true })).toEqual({
      progress: .2,
      completed: { plan, elapsedMs: 18_000, complete: false, touches: [1_000], soundEnabled: true },
    });
    expect(sessionUpdate(plan, { elapsedMs: 18_000, complete: true, touchTimestamps: [], soundEnabled: false, physicalPlaySuggested: true })).toMatchObject({
      progress: 1,
      completed: { complete: true, physicalPlaySuggested: true },
    });
  });

  it('keeps saved queue order first, removes duplicates, and creates current timestamped records in that order', () => {
    const timestamp = '2026-08-28T12:00:00.000Z';
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    try {
      const merged = mergeQueueIds(['koi-pool', 'paper-moth'], ['paper-moth', 'red-string', 'koi-pool']);
      expect(merged).toEqual(['koi-pool', 'paper-moth', 'red-string']);
      expect(queueRecords(merged)).toEqual(merged.map((sceneId) => ({ id: `queue:${sceneId}`, sceneId, variant: defaultSessionVariant, addedAt: timestamp })));
    } finally {
      vi.useRealTimers();
    }
  });

  it('builds descriptive observations from the completed plan and offers physical play only when suggested', () => {
    const completed = { plan, elapsedMs: 42_000, complete: false, touches: [1_000, 2_000], soundEnabled: false, physicalPlaySuggested: true };
    const observation = createObservation(completed, { endReason: 'cat-left', vocabulary: ['tracking', 'disengagement'], safetyEvent: 'paused after forceful contact', physicalPlayHandoff: 'not-recorded', rawNote: 'Tracked, then left.' }, '2026-08-28T12:00:00Z');
    expect(observation).toMatchObject({
      schemaVersion: 2,
      sceneId: 'paper-moth', contentRevision: plan.manifest.revision, variant: defaultSessionVariant,
      playbackMode: 'tablet-touch', viewingDistanceBand: 'near-screen', roomLightBand: 'dim', observedCat: 'Mika',
      elapsedMs: 42_000, endReason: 'cat-left', acceptedContactTimestamps: [1_000, 2_000], vocabulary: ['tracking', 'disengagement'],
      safetyEvent: 'paused after forceful contact', physicalPlayHandoff: 'offered', rawNote: 'Tracked, then left.', confirmedAt: '2026-08-28T12:00:00Z',
    });
  });

  it('records pairing context on a current curated observation', () => {
    const completed = { plan: { ...plan, comparison: { dimension: 'contrast' as const, side: 'a' as const } }, elapsedMs: 90_000, complete: true, touches: [], soundEnabled: false };
    const observation = createObservation(completed, { endReason: 'completed', vocabulary: [], physicalPlayHandoff: 'not-recorded', rawNote: '' }, '2026-08-28T12:00:00Z');
    expect(observation).toMatchObject({ seed: 73, encounterScore: plan.manifest.encounter.authoredScore, comparisonDimension: 'figureGround' });
  });

  it('applies the contrast query only to ordinary sessions, never canonical comparison sides', () => {
    expect(resolvePreparedVariant(defaultSessionVariant, undefined, '?contrast=enhanced')).toMatchObject({ figureGround: 'enhanced' });
    const canonicalA = { figureGround: 'natural', motion: 'continuous', sound: 'off', novelty: 'familiar' } as const;
    expect(resolvePreparedVariant(canonicalA, { dimension: 'contrast', side: 'a' }, '?contrast=enhanced')).toBe(canonicalA);
  });
});
