import { describe, expect, it } from 'vitest';
import { defaultVariantSelection } from '../simulation/definitions';
import { createCatflixStore, createMatchedComparison } from './CatflixStore';
import { createStoreBackend, storeNames } from './IndexedDbBackend';

describe('local Catflix store', () => {
  it('round-trips queue, progress, raw notes, comparisons, and export data', async () => {
    const store = createCatflixStore();
    await store.setQueue([{ id: 'q1', sceneId: 'paper-moth', variant: defaultVariantSelection, addedAt: '2026-07-29T12:00:00Z' }]);
    await store.saveProgress({ sceneId: 'paper-moth', revision: '2026.07.29', elapsedMs: 9000, durationMs: 90000, updatedAt: '2026-07-29T12:01:00Z' });
    await store.saveNote({ id: 'n1', cat: 'Arri', sceneId: 'paper-moth', contentRevision: '2026.07.29', createdAt: '2026-07-29T12:02:00Z', rawNote: 'Looked, then left.', vocabulary: ['orientation', 'disengagement'], touchTimestamps: [] });
    const comparison = createMatchedComparison({ id: 'c1', createdAt: '2026-07-29T12:03:00Z', first: { sceneId: 'paper-moth', variant: defaultVariantSelection }, second: { sceneId: 'paper-moth', variant: { ...defaultVariantSelection, figureGround: 'enhanced' } }, changedDimension: 'figureGround', observation: 'Household observation only.' });
    await store.saveComparison(comparison);

    const exported = await store.exportData();
    expect(exported.schemaVersion).toBe(2);
    expect(exported.settings.sceneMotionMode).toBe('standard');
    expect(exported.queue).toHaveLength(1);
    expect(exported.progress[0].elapsedMs).toBe(9000);
    expect(exported.notes[0].rawNote).toBe('Looked, then left.');
    expect(exported.comparisons[0].changedDimension).toBe('figureGround');
    expect(exported.observations).toEqual([]);

    const restored = createCatflixStore();
    await restored.importData(exported);
    expect(await restored.exportData()).toMatchObject({ queue: exported.queue, progress: exported.progress, notes: exported.notes, comparisons: exported.comparisons });
  });

  it('migrates legacy settings and exports while retaining queue, progress, and notes', async () => {
    const store = createCatflixStore();
    await store.importData({
      schemaVersion: 1,
      exportedAt: '2026-07-28T12:00:00Z',
      settings: { soundEnabled: true, reducedMotion: false },
      queue: [{ id: 'q1', sceneId: 'koi-pool', variant: defaultVariantSelection, addedAt: '2026-07-28T12:00:00Z' }],
      progress: [{ sceneId: 'koi-pool', revision: '2026.07.29', elapsedMs: 100, durationMs: 120_000, updatedAt: '2026-07-28T12:00:00Z' }],
      notes: [{ id: 'n1', cat: 'Mika', sceneId: 'koi-pool', contentRevision: '2026.07.29', createdAt: '2026-07-28T12:00:00Z', rawNote: 'Watched.', vocabulary: ['tracking'] }],
      comparisons: [],
      provenance: [],
    });
    expect(await store.getSettings()).toMatchObject({ soundEnabled: true, sceneMotionMode: 'standard' });
    expect(await store.getQueue()).toHaveLength(1);
    expect(await store.getProgress('koi-pool')).toMatchObject({ elapsedMs: 100 });
    expect(await store.listNotes()).toHaveLength(1);
    expect(await store.listObservations()).toEqual([]);
  });

  it('round-trips an owner-confirmed schema-two session observation', async () => {
    const store = createCatflixStore();
    await store.saveObservation({ schemaVersion: 2, id: 's1', sceneId: 'red-string', contentRevision: '2026.07.29.1', variant: defaultVariantSelection, playbackMode: 'tablet-touch', viewingDistanceBand: 'near-screen', roomLightBand: 'dim', soundEnabled: false, observedCat: 'Mika', elapsedMs: 42_000, endReason: 'cat-left', acceptedContactTimestamps: [1_000], vocabulary: ['tracking', 'disengagement'], physicalPlayHandoff: 'not-recorded', rawNote: 'Tracked once, then left.', confirmedAt: '2026-07-30T08:00:00Z' });
    const exported = await store.exportData();
    expect(exported.observations).toHaveLength(1);
    const restored = createCatflixStore();
    await restored.importData(exported);
    expect(await restored.listObservations()).toEqual(exported.observations);
  });

  it('rejects corrupt imports and multi-variable comparisons', async () => {
    const store = createCatflixStore();
    await expect(store.importData({ schemaVersion: 99 })).rejects.toThrow('Unsupported or corrupt');
    expect(() => createMatchedComparison({ id: 'bad', createdAt: '', first: { sceneId: 'red-string', variant: defaultVariantSelection }, second: { sceneId: 'red-string', variant: { ...defaultVariantSelection, sound: 'on', novelty: 'alternate' } }, changedDimension: 'sound' })).toThrow('exactly one');
    expect(await store.getQueue()).toEqual([]);
  });

  it('atomically replaces every memory store during import restoration', async () => {
    const backend = createStoreBackend((store, value) => {
      const record = value as { id?: string; fail?: boolean };
      if (store === 'notes' && record.fail) throw new Error('injected write failure');
      return record.id ?? store;
    });
    const original = storeNames.map((store) => ({ store, values: [{ id: `before-${store}` }] }));
    await backend.replaceAll(original);

    await expect(backend.replaceAll(storeNames.map((store) => ({ store, values: [{ id: `after-${store}`, fail: store === 'notes' }] })))).rejects.toThrow('injected write failure');

    await Promise.all(storeNames.map(async (store) => {
      expect(await backend.values(store)).toEqual([{ id: `before-${store}` }]);
    }));

    await backend.replaceAll(storeNames.map((store) => ({ store, values: [{ id: `after-${store}` }] })));
    await Promise.all(storeNames.map(async (store) => {
      expect(await backend.values(store)).toEqual([{ id: `after-${store}` }]);
    }));
  });
});
