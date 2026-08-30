import { describe, expect, it } from "vitest";
import { createLocalRepository, decodeExport } from "./LocalRepository";
import { createMatchedComparison, isTimestamp } from "./records";

const defaultVariantSelection = { figureGround: "natural", motion: "intermittent", sound: "off", novelty: "familiar" } as const;
const timestamp = "2026-07-29T12:00:00.000Z";
const validV2 = () => ({
  schemaVersion: 2 as const,
  exportedAt: timestamp,
  settings: { soundEnabled: false, reducedMotion: false, sceneMotionMode: "standard" as const, safetyAcknowledgedAt: timestamp },
  queue: [{ id: "q1", sceneId: "paper-moth" as const, variant: defaultVariantSelection, addedAt: timestamp }],
  progress: [{ sceneId: "paper-moth" as const, revision: "2026.07.29", elapsedMs: 1_000, durationMs: 90_000, updatedAt: timestamp }],
  notes: [{ id: "n1", cat: "Arri" as const, sceneId: "paper-moth" as const, contentRevision: "2026.07.29", createdAt: timestamp, rawNote: "Looked, then left.", vocabulary: ["orientation", "disengagement"] as const, touchTimestamps: [100, 500] }],
  observations: [{ schemaVersion: 2 as const, id: "o1", sceneId: "paper-moth" as const, contentRevision: "2026.07.29", variant: defaultVariantSelection, playbackMode: "tablet-touch" as const, viewingDistanceBand: "near-screen" as const, roomLightBand: "moderate" as const, soundEnabled: false, observedCat: "Arri" as const, elapsedMs: 1_000, endReason: "owner-ended" as const, acceptedContactTimestamps: [100, 500], vocabulary: ["orientation", "disengagement"] as const, safetyEvent: "Paused to observe.", physicalPlayHandoff: "offered" as const, rawNote: "Looked, then left.", confirmedAt: timestamp }],
  comparisons: [{ id: "c1", createdAt: timestamp, first: { sceneId: "paper-moth" as const, variant: defaultVariantSelection, seed: 73, encounterScore: "authored-score", observationId: "o1" }, second: { sceneId: "paper-moth" as const, variant: { ...defaultVariantSelection, figureGround: "enhanced" as const }, seed: 73, encounterScore: "authored-score" }, changedDimension: "figureGround" as const, observation: "Shared seed and score." }],
  provenance: [{ assetId: "paper-moth-poster", creator: "Catflix", source: "/assets/paper-moth.webp", license: "CC0", derivativeHistory: ["original"], checksum: "a".repeat(64), masteringFormat: "webp" as const, contentRevision: "2026.07.29", savedAt: timestamp }],
});

function storedFields(data: Awaited<ReturnType<ReturnType<typeof createLocalRepository>["exportData"]>>) {
  const { exportedAt: _exportedAt, ...stores } = data;
  return stores;
}

describe("local data repository", () => {
  it("round-trips every v2 record family", async () => {
    const repository = createLocalRepository();
    const source = validV2();
    await repository.importData(source);

    const exported = await repository.exportData();
    expect(storedFields(exported)).toEqual(storedFields({ ...source, schemaVersion: 2 }));

    const restored = createLocalRepository();
    await restored.importData(exported);
    expect(storedFields(await restored.exportData())).toEqual(storedFields(exported));
  });

  it("migrates the exact v1 payload into v2 settings and empty observations", async () => {
    const legacy = {
      schemaVersion: 1 as const,
      exportedAt: "2026-07-28T12:00:00Z",
      settings: { soundEnabled: true, reducedMotion: false },
      queue: [{ id: "q1", sceneId: "koi-pool" as const, variant: defaultVariantSelection, addedAt: "2026-07-28T12:00:00Z" }],
      progress: [{ sceneId: "koi-pool" as const, revision: "2026.07.29", elapsedMs: 100, durationMs: 120_000, updatedAt: "2026-07-28T12:00:00Z" }],
      notes: [{ id: "n1", cat: "Mika" as const, sceneId: "koi-pool" as const, contentRevision: "2026.07.29", createdAt: "2026-07-28T12:00:00Z", rawNote: "Watched.", vocabulary: ["tracking"] }],
      comparisons: [],
      provenance: [],
    };
    const migrated = decodeExport(legacy);
    expect(migrated).toMatchObject({ schemaVersion: 2, settings: { soundEnabled: true, sceneMotionMode: "standard" }, observations: [], queue: legacy.queue, progress: legacy.progress });

    const repository = createLocalRepository();
    await repository.importData(legacy);
    expect(await repository.getSettings()).toMatchObject({ soundEnabled: true, sceneMotionMode: "standard" });
    expect(await repository.listObservations()).toEqual([]);
    expect(storedFields(await repository.exportData())).toEqual(storedFields(migrated));
  });

  it.each([
    ["settings", (data: ReturnType<typeof validV2>) => ({ ...data, settings: { ...data.settings, safetyAcknowledgedAt: "not-a-timestamp" } })],
    ["queue", (data: ReturnType<typeof validV2>) => ({ ...data, queue: [{ ...data.queue[0], addedAt: "not-a-timestamp" }] })],
    ["progress", (data: ReturnType<typeof validV2>) => ({ ...data, progress: [{ ...data.progress[0], elapsedMs: Number.POSITIVE_INFINITY }] })],
    ["notes", (data: ReturnType<typeof validV2>) => ({ ...data, notes: [{ ...data.notes[0], vocabulary: ["made-up-behavior"] }] })],
    ["observations", (data: ReturnType<typeof validV2>) => ({ ...data, observations: [{ ...data.observations[0], acceptedContactTimestamps: [-1] }] })],
    ["comparisons", (data: ReturnType<typeof validV2>) => ({ ...data, comparisons: [{ ...data.comparisons[0], first: { ...data.comparisons[0].first, seed: Number.NaN } }] })],
    ["provenance", (data: ReturnType<typeof validV2>) => ({ ...data, provenance: [{ ...data.provenance[0], savedAt: "not-a-timestamp" }] })],
  ])("rejects malformed %s data without changing any store", async (_family, corrupt) => {
    const repository = createLocalRepository();
    await repository.importData(validV2());
    const before = await repository.exportData();

    await expect(repository.importData(corrupt(validV2()))).rejects.toThrow("Unsupported or corrupt Catflix export.");

    expect(storedFields(await repository.exportData())).toEqual(storedFields(before));
  });

  it.each([
    ["queue", (data: ReturnType<typeof validV2>) => ({ ...data, queue: [...data.queue, { ...data.queue[0] }] })],
    ["progress", (data: ReturnType<typeof validV2>) => ({ ...data, progress: [...data.progress, { ...data.progress[0] }] })],
    ["notes", (data: ReturnType<typeof validV2>) => ({ ...data, notes: [...data.notes, { ...data.notes[0] }] })],
    ["observations", (data: ReturnType<typeof validV2>) => ({ ...data, observations: [...data.observations, { ...data.observations[0] }] })],
    ["comparisons", (data: ReturnType<typeof validV2>) => ({ ...data, comparisons: [...data.comparisons, { ...data.comparisons[0] }] })],
    ["provenance", (data: ReturnType<typeof validV2>) => ({ ...data, provenance: [...data.provenance, { ...data.provenance[0] }] })],
  ])("rejects duplicate effective %s keys without changing any store", async (_store, corrupt) => {
    const repository = createLocalRepository();
    await repository.importData(validV2());
    const before = await repository.exportData();

    await expect(repository.importData(corrupt(validV2()))).rejects.toThrow("Unsupported or corrupt Catflix export.");

    expect(storedFields(await repository.exportData())).toEqual(storedFields(before));
  });

  it.each([
    "2026-02-28T12:00:00Z",
    "2024-02-29T12:00:00.1Z",
    "2026-07-29T12:00:00.12Z",
    "2026-07-29T12:00:00.123Z",
  ])("accepts supported ISO timestamp form %s", (value) => {
    expect(isTimestamp(value)).toBe(true);
  });

  it.each([
    "2026-02-29T12:00:00Z",
    "2026-02-31T12:00:00Z",
    "2026-04-31T12:00:00.123Z",
  ])("rejects impossible ISO calendar date %s", (value) => {
    expect(isTimestamp(value)).toBe(false);
    expect(() => decodeExport({ ...validV2(), exportedAt: value })).toThrow("Unsupported or corrupt Catflix export.");
  });

  it("rejects malformed v2 observations, impossible progress, and unknown scenes", () => {
    const valid = {
      ...validV2(),
      queue: [], progress: [], notes: [], observations: [], comparisons: [], provenance: [],
    };
    expect(() => decodeExport({ ...valid, observations: [{ schemaVersion: 2 }] })).toThrow("Unsupported or corrupt Catflix export.");
    expect(() => decodeExport({ ...valid, progress: [{ sceneId: "paper-moth", revision: "r", elapsedMs: 90_001, durationMs: 90_000, updatedAt: timestamp }] })).toThrow("Unsupported or corrupt Catflix export.");
    expect(() => decodeExport({ ...valid, queue: [{ id: "q", sceneId: "not-a-scene", variant: defaultVariantSelection, addedAt: timestamp }] })).toThrow("Unsupported or corrupt Catflix export.");
  });

  it("rejects multi-variable comparisons", () => {
    expect(() => createMatchedComparison({ id: "bad", createdAt: timestamp, first: { sceneId: "red-string", variant: defaultVariantSelection }, second: { sceneId: "red-string", variant: { ...defaultVariantSelection, sound: "on", novelty: "alternate" } }, changedDimension: "sound" })).toThrow("exactly one");
    expect(() => createMatchedComparison({ id: "bad-context", createdAt: timestamp, first: { sceneId: "red-string", variant: defaultVariantSelection, seed: 1 }, second: { sceneId: "paper-moth", variant: { ...defaultVariantSelection, sound: "on" }, seed: 2 }, changedDimension: "sound" })).toThrow("share one scene, seed, and encounter score");
  });
});
