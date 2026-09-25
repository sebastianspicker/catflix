import { describe, expect, it } from "vitest";
import { createLocalRepository, decodeExport, LocalDataCapacityError, maximumBackupBytes } from "./LocalRepository";
import { assertImportFileSize } from "./localDataCapacity";
import { createMatchedComparison, isTimestamp } from "./records";
import type { SessionObservation } from "./types";

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

function currentObservation(id: string, variant: SessionObservation["variant"] = defaultVariantSelection, confirmedAt = timestamp, comparisonDimension: "figureGround" | "motion" = "figureGround", context: Partial<Pick<SessionObservation, "contentRevision" | "seed" | "encounterScore">> = {}): SessionObservation {
  return {
    ...validV2().observations[0],
    id,
    variant,
    contentRevision: context.contentRevision ?? "2026.07.29",
    seed: context.seed ?? 73,
    encounterScore: context.encounterScore ?? "authored-score",
    comparisonDimension,
    confirmedAt,
  };
}

function legacyNoteLinkedComparison() {
  const source = validV2();
  return {
    schemaVersion: 1 as const,
    exportedAt: source.exportedAt,
    settings: { soundEnabled: false, reducedMotion: false },
    queue: source.queue,
    progress: source.progress,
    notes: source.notes,
    comparisons: [{
      id: "legacy-comparison", createdAt: timestamp,
      first: { sceneId: "paper-moth" as const, variant: defaultVariantSelection, seed: 73, encounterScore: "authored-score", observationId: "n1" },
      second: { sceneId: "paper-moth" as const, variant: { ...defaultVariantSelection, figureGround: "enhanced" as const }, seed: 73, encounterScore: "authored-score" },
      changedDimension: "figureGround" as const,
    }],
    provenance: source.provenance,
  };
}

function storedFields(data: Awaited<ReturnType<ReturnType<typeof createLocalRepository>["exportData"]>>) {
  const { exportedAt, ...stores } = data;
  if (!isTimestamp(exportedAt)) throw new Error("Expected export timestamp.");
  return stores;
}

async function expectRejectedImport(corrupt: (data: ReturnType<typeof validV2>) => unknown) {
  const repository = createLocalRepository();
  await repository.importData(validV2());
  const before = await repository.exportData();

  await expect(repository.importData(corrupt(validV2()))).rejects.toThrow("Unsupported or corrupt Catflix export.");

  expect(storedFields(await repository.exportData())).toEqual(storedFields(before));
}

describe("local data import contracts", () => {
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

  it("preserves a valid legacy note-backed comparison link without treating notes as pairable observations", () => {
    expect(decodeExport(legacyNoteLinkedComparison())).toMatchObject({ observations: [], comparisons: [{ first: { observationId: "n1" } }] });
  });

  it.each([
    ["settings", (data: ReturnType<typeof validV2>) => ({ ...data, settings: { ...data.settings, safetyAcknowledgedAt: "not-a-timestamp" } })],
    ["queue", (data: ReturnType<typeof validV2>) => ({ ...data, queue: [{ ...data.queue[0], addedAt: "not-a-timestamp" }] })],
    ["progress", (data: ReturnType<typeof validV2>) => ({ ...data, progress: [{ ...data.progress[0], elapsedMs: Number.POSITIVE_INFINITY }] })],
    ["notes", (data: ReturnType<typeof validV2>) => ({ ...data, notes: [{ ...data.notes[0], vocabulary: ["made-up-behavior"] }] })],
    ["observations", (data: ReturnType<typeof validV2>) => ({ ...data, observations: [{ ...data.observations[0], acceptedContactTimestamps: [-1] }] })],
    ["comparisons", (data: ReturnType<typeof validV2>) => ({ ...data, comparisons: [{ ...data.comparisons[0], first: { ...data.comparisons[0].first, seed: Number.NaN } }] })],
    ["provenance", (data: ReturnType<typeof validV2>) => ({ ...data, provenance: [{ ...data.provenance[0], savedAt: "not-a-timestamp" }] })],
  ])("rejects malformed %s data without changing any store", async (_family, corrupt) => expectRejectedImport(corrupt));

  it.each([
    ["queue", (data: ReturnType<typeof validV2>) => ({ ...data, queue: [...data.queue, { ...data.queue[0] }] })],
    ["progress", (data: ReturnType<typeof validV2>) => ({ ...data, progress: [...data.progress, { ...data.progress[0] }] })],
    ["notes", (data: ReturnType<typeof validV2>) => ({ ...data, notes: [...data.notes, { ...data.notes[0] }] })],
    ["observations", (data: ReturnType<typeof validV2>) => ({ ...data, observations: [...data.observations, { ...data.observations[0] }] })],
    ["comparisons", (data: ReturnType<typeof validV2>) => ({ ...data, comparisons: [...data.comparisons, { ...data.comparisons[0] }] })],
    ["provenance", (data: ReturnType<typeof validV2>) => ({ ...data, provenance: [...data.provenance, { ...data.provenance[0] }] })],
  ])("rejects duplicate effective %s keys without changing any store", async (_store, corrupt) => expectRejectedImport(corrupt));
});

describe("local data validation", () => {
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

describe("local observation comparisons", () => {
  it("creates an incomplete canonical A comparison then completes it with B", async () => {
    const repository = createLocalRepository();
    const afterA = await repository.saveObservationWithComparison(currentObservation("a", { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" }));
    expect(afterA.comparisons).toMatchObject([{ changedDimension: "figureGround", first: { observationId: "a" } }]);
    expect(afterA.comparisons[0]?.second).not.toHaveProperty("observationId");
    const history = await repository.saveObservationWithComparison(currentObservation("b", { figureGround: "enhanced", motion: "continuous", sound: "off", novelty: "familiar" }));
    expect(history.comparisons).toHaveLength(1);
    expect(history.comparisons[0]).toMatchObject({ changedDimension: "figureGround", first: { observationId: "a", contentRevision: "2026.07.29" }, second: { observationId: "b" } });
  });

  it("creates B-first comparisons and completes them when A arrives", async () => {
    const repository = createLocalRepository();
    await repository.saveObservationWithComparison(currentObservation("b", { figureGround: "enhanced", motion: "continuous", sound: "off", novelty: "familiar" }));
    const history = await repository.saveObservationWithComparison(currentObservation("a", { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" }));
    expect(history.comparisons).toHaveLength(1);
    expect(history.comparisons[0]).toMatchObject({ first: { observationId: "a" }, second: { observationId: "b" } });
  });

  it("creates separate incomplete comparisons for repeated same-side runs and completes the oldest first", async () => {
    const repository = createLocalRepository();
    await repository.saveObservationWithComparison(currentObservation("a-old", { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" }, "2026-07-29T11:00:00.000Z"));
    const afterRepeat = await repository.saveObservationWithComparison(currentObservation("a-new", { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" }, "2026-07-29T11:30:00.000Z"));
    expect(afterRepeat.comparisons).toHaveLength(2);
    const afterFirstB = await repository.saveObservationWithComparison(currentObservation("b-first", { figureGround: "enhanced", motion: "continuous", sound: "off", novelty: "familiar" }));
    expect(afterFirstB.comparisons.filter((comparison) => comparison.second.observationId === "b-first")).toMatchObject([{ first: { observationId: "a-old" } }]);
    const afterSecondB = await repository.saveObservationWithComparison(currentObservation("b-second", { figureGround: "enhanced", motion: "continuous", sound: "off", novelty: "familiar" }));
    expect(afterSecondB.comparisons.filter((comparison) => comparison.second.observationId === "b-second")).toMatchObject([{ first: { observationId: "a-new" } }]);
  });

  it("does not match legacy, sound/novelty, context, dimension, variant, occupied, or duplicate records", async () => {
    const repository = createLocalRepository();
    const baseline = { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" } as const;
    await repository.saveObservationWithComparison(currentObservation("a", baseline));
    const before = await repository.listRecordHistory();
    await repository.saveObservationWithComparison(currentObservation("wrong-revision", { ...baseline, figureGround: "enhanced" }, timestamp, "figureGround", { contentRevision: "other" }));
    await repository.saveObservationWithComparison(currentObservation("wrong-seed", { ...baseline, figureGround: "enhanced" }, timestamp, "figureGround", { seed: 74 }));
    await repository.saveObservationWithComparison(currentObservation("wrong-score", { ...baseline, figureGround: "enhanced" }, timestamp, "figureGround", { encounterScore: "other" }));
    await repository.saveObservationWithComparison(currentObservation("wrong-dimension", { ...baseline, motion: "intermittent" }, timestamp, "motion"));
    await repository.saveObservationWithComparison(currentObservation("wrong-variant", { ...baseline, figureGround: "enhanced", sound: "on" }));
    const legacy = currentObservation("legacy", { ...baseline, figureGround: "enhanced" });
    const legacyObservation = { ...legacy };
    delete legacyObservation.comparisonDimension;
    await repository.saveObservationWithComparison(legacyObservation);
    expect((await repository.listRecordHistory()).comparisons).toHaveLength(before.comparisons.length + 4);
    await repository.saveObservationWithComparison(currentObservation("b", { ...baseline, figureGround: "enhanced" }));
    expect((await repository.listRecordHistory()).comparisons.filter((comparison) => comparison.second.observationId === "b")).toHaveLength(1);
    const afterOccupied = await repository.saveObservationWithComparison(currentObservation("b-other", { ...baseline, figureGround: "enhanced" }));
    const bOtherComparison = afterOccupied.comparisons.find((comparison) => comparison.second.observationId === "b-other");
    expect(bOtherComparison?.first).not.toHaveProperty("observationId");
    await expect(repository.saveObservationWithComparison(currentObservation("b", { ...baseline, figureGround: "enhanced" }))).rejects.toThrow("cannot overwrite");
  });

  it("unlinks an observation from comparisons but preserves comparisons when deleting either exact record", async () => {
    const repository = createLocalRepository();
    await repository.saveObservationWithComparison(currentObservation("a", { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" }));
    const paired = await repository.saveObservationWithComparison(currentObservation("b", { figureGround: "enhanced", motion: "continuous", sound: "off", novelty: "familiar" }));
    const comparisonId = paired.comparisons[0]?.id;
    if (!comparisonId) throw new Error("Expected paired comparison.");
    const unlinked = await repository.deleteRecord({ kind: "observation", id: "a" });
    expect(unlinked.comparisons[0]?.first.observationId).toBeUndefined();
    expect(unlinked.observations.map((observation) => observation.id)).toEqual(["b"]);
    const retained = await repository.deleteRecord({ kind: "comparison", id: comparisonId });
    expect(retained.comparisons).toEqual([]);
    expect(retained.observations.map((observation) => observation.id)).toEqual(["b"]);
  });

  it("unlinks a deleted legacy note from its imported comparison and preserves the comparison", async () => {
    const repository = createLocalRepository();
    await repository.importData(legacyNoteLinkedComparison());
    const history = await repository.deleteRecord({ kind: "note", id: "n1" });
    expect(history.notes).toEqual([]);
    expect(history.comparisons).toMatchObject([{ id: "legacy-comparison", first: { sceneId: "paper-moth" } }]);
    expect(history.comparisons[0]?.first).not.toHaveProperty("observationId");
    const exported = await repository.exportData();
    expect(() => decodeExport(exported)).not.toThrow();
  });
});

describe("local import references and limits", () => {
  it("previews an import before atomically committing it", async () => {
    const repository = createLocalRepository();
    const preview = repository.prepareImport(validV2());
    expect(preview).toEqual({ sourceSchemaVersion: 2, targetSchemaVersion: 2, exportedAt: timestamp, counts: { settings: 1, queue: 1, progress: 1, notes: 1, observations: 1, comparisons: 1, provenance: 1 } });
    expect(await repository.listObservations()).toEqual([]);
    await repository.commitImport(preview);
    expect(await repository.listObservations()).toHaveLength(1);
    await expect(repository.commitImport(preview)).rejects.toThrow("not prepared");
  });

  it.each([
    ["missing", () => ({ ...validV2(), comparisons: [{ ...validV2().comparisons[0], first: { ...validV2().comparisons[0].first, observationId: "missing" } }] })],
    ["mismatched scene", () => ({ ...validV2(), comparisons: [{ ...validV2().comparisons[0], first: { ...validV2().comparisons[0].first, sceneId: "koi-pool" as const } }] })],
    ["reused observation", () => {
      const source = validV2();
      return { ...source, comparisons: [...source.comparisons, { ...source.comparisons[0], id: "c2", second: { ...source.comparisons[0].second } }] };
    }],
  ])("rejects %s comparison references", (_case, corrupt) => {
    expect(() => decodeExport(corrupt())).toThrow("Unsupported or corrupt Catflix export.");
  });

  it.each([
    ["queue", 6, (source: ReturnType<typeof validV2>, count: number) => ({ ...source, queue: Array.from({ length: count }, (_, index) => ({ ...source.queue[0], id: `q${index}` })) })],
    ["notes", 10_001, (source: ReturnType<typeof validV2>, count: number) => ({ ...source, notes: Array.from({ length: count }, (_, index) => ({ ...source.notes[0], id: `n${index}` })) })],
    ["observations", 10_001, (source: ReturnType<typeof validV2>, count: number) => ({ ...source, observations: Array.from({ length: count }, (_, index) => ({ ...source.observations[0], id: `o${index}` })) })],
    ["comparisons", 10_001, (source: ReturnType<typeof validV2>, count: number) => ({ ...source, comparisons: Array.from({ length: count }, (_, index) => ({ ...source.comparisons[0], id: `c${index}` })) })],
    ["provenance", 101, (source: ReturnType<typeof validV2>, count: number) => ({ ...source, provenance: Array.from({ length: count }, (_, index) => ({ ...source.provenance[0], assetId: `asset-${index}` })) })],
  ])("rejects oversized %s imports", (_store, count, oversized) => {
    expect(() => decodeExport(oversized(validV2(), count))).toThrow("Unsupported or corrupt Catflix export.");
  });

  it("measures a v1 import after normalizing it to the pretty schema-v2 representation", () => {
    const source = legacyNoteLinkedComparison();
    source.notes = Array.from({ length: 5_000 }, (_, index) => ({ ...source.notes[0], id: `n${index}`, rawNote: "" }));
    let remaining = maximumBackupBytes - new TextEncoder().encode(JSON.stringify(source, null, 2)).byteLength;
    for (const item of source.notes) {
      const added = Math.min(remaining, 20_000);
      item.rawNote = "x".repeat(added);
      remaining -= added;
      if (remaining === 0) break;
    }
    expect(remaining).toBe(0);
    const rawBytes = new TextEncoder().encode(JSON.stringify(source, null, 2)).byteLength;
    expect(() => assertImportFileSize(rawBytes)).not.toThrow();
    expect(() => decodeExport(source)).toThrow(LocalDataCapacityError);
  });

  it("does not mark storage degraded when import admission rejects capacity", () => {
    const repository = createLocalRepository();
    const source = validV2();
    const oversized = { ...source, notes: Array.from({ length: 10_001 }, (_, index) => ({ ...source.notes[0], id: `n${index}` })) };
    expect(() => repository.prepareImport(oversized)).toThrow(LocalDataCapacityError);
    expect(repository.getStorageStatus()).toEqual({ mode: "persistent" });
  });

  it("admits only one of two concurrent writes at the last record slot", async () => {
    const repository = createLocalRepository();
    const source = validV2();
    source.notes = Array.from({ length: 9_999 }, (_, index) => ({ ...source.notes[0], id: `n${index}`, rawNote: "" }));
    await repository.importData(source);

    const outcomes = await Promise.allSettled([
      repository.saveNote({ ...source.notes[0], id: "last-a" }),
      repository.saveNote({ ...source.notes[0], id: "last-b" }),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejection = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejection?.status).toBe("rejected");
    if (rejection?.status === "rejected") expect(rejection.reason).toBeInstanceOf(LocalDataCapacityError);
    expect(await repository.listNotes()).toHaveLength(10_000);
  });

});
