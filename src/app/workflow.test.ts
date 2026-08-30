import { describe, expect, it } from 'vitest';
import { getContentManifest } from '../catalogue/model';
import { defaultSessionVariant } from '../domain';
import { catalogueWorkflowReducer, initialCatalogueWorkflowState } from './workflow';

const prepared = { manifest: getContentManifest('paper-moth'), variant: defaultSessionVariant, seed: 73 };
const setup = { stableDevice: true as const, protectedCables: true as const, openExit: true as const, supervised: true as const, roomLightBand: 'dim' as const, viewingDistanceBand: 'near-screen' as const };

describe('catalogue workflow', () => {
  it('moves synchronously from catalogue through preparation, playback, and review', () => {
    const initial = initialCatalogueWorkflowState({ mode: 'persistent' });
    const preparing = catalogueWorkflowReducer(initial, { type: 'prepare', pending: prepared });
    const playing = catalogueWorkflowReducer(preparing, { type: 'start', playbackMode: 'tablet-touch', setup });
    const reviewing = catalogueWorkflowReducer(playing, { type: 'finish', result: { elapsedMs: 18_000, complete: false, touchTimestamps: [2_000], soundEnabled: false } });
    expect(preparing.pending).toEqual(prepared);
    expect(playing).toMatchObject({ pending: null, active: { seed: 73, playbackMode: 'tablet-touch' } });
    expect(reviewing).toMatchObject({ active: null, completed: { elapsedMs: 18_000 }, progress: { 'paper-moth': .2 } });
  });

  it('keeps filters and persisted queue state independent of the encounter state', () => {
    const initial = initialCatalogueWorkflowState({ mode: 'persistent' });
    const filtered = catalogueWorkflowReducer(initial, { type: 'set-filter', filter: 'theme', value: 'inside' });
    const queued = catalogueWorkflowReducer(filtered, { type: 'set-queue', queue: ['paper-moth', 'red-string'] });
    const rhythm = catalogueWorkflowReducer(queued, { type: 'set-filter', filter: 'rhythm', value: 'flowing' });
    expect(rhythm).toMatchObject({ theme: 'inside', rhythm: 'flowing', queue: ['paper-moth', 'red-string'], active: null, pending: null });
  });

  it('merges the saved queue after an owner adds and removes a visible item while hydration is pending', () => {
    const initial = initialCatalogueWorkflowState({ mode: 'persistent' });
    const ownerAdded = catalogueWorkflowReducer(initial, { type: 'set-queue', queue: ['red-string'] });
    const ownerRemoved = catalogueWorkflowReducer(ownerAdded, { type: 'set-queue', queue: [] });
    const hydrated = catalogueWorkflowReducer(ownerRemoved, { type: 'hydrate', queue: ['paper-moth'], progress: {}, recordCounts: { notes: 0, comparisons: 0 }, sceneMotionMode: 'low' });
    expect(hydrated).toMatchObject({ hydration: 'complete', queue: ['paper-moth'] });
  });

  it('merges the saved queue with an early owner addition in a stable order', () => {
    const initial = initialCatalogueWorkflowState({ mode: 'persistent' });
    const ownerAdded = catalogueWorkflowReducer(initial, { type: 'set-queue', queue: ['red-string'] });
    const hydrated = catalogueWorkflowReducer(ownerAdded, { type: 'hydrate', queue: ['paper-moth'], progress: {}, recordCounts: { notes: 0, comparisons: 0 }, sceneMotionMode: 'standard' });
    expect(hydrated.queue).toEqual(['paper-moth', 'red-string']);
  });

  it('keeps early and post-hydration scene-motion choices over the loaded setting', () => {
    const initial = initialCatalogueWorkflowState({ mode: 'persistent' });
    const ownerChangedEarly = catalogueWorkflowReducer(initial, { type: 'set-motion-mode', sceneMotionMode: 'low' });
    const hydrated = catalogueWorkflowReducer(ownerChangedEarly, { type: 'hydrate', queue: [], progress: {}, recordCounts: { notes: 0, comparisons: 0 }, sceneMotionMode: 'standard' });
    const ownerChangedAfterHydration = catalogueWorkflowReducer(hydrated, { type: 'set-motion-mode', sceneMotionMode: 'standard' });
    expect(hydrated).toMatchObject({ hydration: 'complete', sceneMotionMode: 'low' });
    expect(ownerChangedAfterHydration.sceneMotionMode).toBe('standard');
  });

  it('merges saved progress with an encounter completed before hydration', () => {
    const initial = initialCatalogueWorkflowState({ mode: 'persistent' });
    const preparing = catalogueWorkflowReducer(initial, { type: 'prepare', pending: prepared });
    const playing = catalogueWorkflowReducer(preparing, { type: 'start', playbackMode: 'tablet-touch', setup });
    const completedEarly = catalogueWorkflowReducer(playing, { type: 'finish', result: { elapsedMs: 45_000, complete: false, touchTimestamps: [], soundEnabled: false } });
    const hydrated = catalogueWorkflowReducer(completedEarly, { type: 'hydrate', queue: [], progress: { 'koi-pool': 0.75, 'paper-moth': 0.1 }, recordCounts: { notes: 2, comparisons: 1 }, sceneMotionMode: 'standard' });
    expect(hydrated.progress).toEqual({ 'koi-pool': 0.75, 'paper-moth': 0.5 });
  });

  it('adds records saved before hydration to the loaded record totals', () => {
    const initial = initialCatalogueWorkflowState({ mode: 'persistent' });
    const savedEarly = catalogueWorkflowReducer(initial, { type: 'increment-records', notes: 1, comparisons: 1 });
    const hydrated = catalogueWorkflowReducer(savedEarly, { type: 'hydrate', queue: [], progress: {}, recordCounts: { notes: 4, comparisons: 2 }, sceneMotionMode: 'standard' });
    expect(hydrated.recordCounts).toEqual({ notes: 5, comparisons: 3 });
  });
});
