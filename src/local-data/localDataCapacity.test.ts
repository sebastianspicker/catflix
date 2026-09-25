import { describe, expect, it } from "vitest";
import {
  assertImportFileSize,
  assertMutationCapacity,
  localDataByteLength,
  LocalDataCapacityError,
  maximumBackupBytes,
  serializeLocalData,
} from "./localDataCapacity";
import { createLocalDataBackend } from "./indexedDb";
import { createLocalRepository } from "./LocalRepository";
import { decodeExport, exportLocalData, exportRecoveryLocalData, toStoreReplacements } from "./localExportCodec";
import type { CatflixDataExport, RefereeNote } from "./types";

const timestamp = "2026-07-29T12:00:00.000Z";
const natural = { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" } as const;
const enhanced = { ...natural, figureGround: "enhanced" as const };

function emptyExport(): CatflixDataExport {
  return {
    schemaVersion: 2,
    exportedAt: timestamp,
    settings: { soundEnabled: false, reducedMotion: false, sceneMotionMode: "standard" },
    queue: [], progress: [], notes: [], observations: [], comparisons: [], provenance: [],
  };
}

function note(id: string, rawNote = ""): RefereeNote {
  return { id, cat: "Arri", sceneId: "paper-moth", contentRevision: "2026.07.29", createdAt: timestamp, rawNote, vocabulary: [] };
}

function validExportAtByteLimit(): CatflixDataExport {
  const data = { ...emptyExport(), notes: Array.from({ length: 300 }, (_, index) => note(`n${index}`)) };
  let remaining = maximumBackupBytes - localDataByteLength(data);
  for (const item of data.notes) {
    const added = Math.min(remaining, 20_000);
    item.rawNote = "x".repeat(added);
    remaining -= added;
    if (remaining === 0) break;
  }
  if (remaining !== 0) throw new Error("The valid boundary fixture could not reach 5 MiB.");
  return data;
}

function keyForStoredValue(_store: string, value: unknown): string {
  const record = value as { id?: string; sceneId?: string; assetId?: string };
  return record.id ?? record.sceneId ?? record.assetId ?? "device";
}

function provenance(assetId: string, stored = true) {
  return {
    assetId, creator: "Catflix", source: "/assets/asset.webp", license: "CC0", derivativeHistory: ["original"],
    checksum: "a".repeat(64), masteringFormat: "webp" as const, contentRevision: "2026.07.29",
    ...(stored ? { savedAt: timestamp } : {}),
  };
}

describe("local-data capacity", () => {
  it("keeps a normal export importable at the pretty UTF-8 5 MiB boundary", async () => {
    const data = validExportAtByteLimit();

    expect(serializeLocalData(data)).toBe(JSON.stringify(data, null, 2));
    expect(localDataByteLength(data)).toBe(maximumBackupBytes);
    expect(localDataByteLength(decodeExport(data))).toBe(maximumBackupBytes);
    const backend = createLocalDataBackend(keyForStoredValue, () => Promise.resolve({ fallbackMessage: "memory" }));
    await backend.replaceAll(toStoreReplacements(data));
    const exported = await exportLocalData(backend);
    expect(() => decodeExport(exported)).not.toThrow();
    const partiallyFilled = data.notes.find((item) => item.rawNote.length < 20_000);
    if (!partiallyFilled) throw new Error("Expected a partially filled boundary note.");
    partiallyFilled.rawNote += "é";
    expect(localDataByteLength(data)).toBe(maximumBackupBytes + 2);
    expect(() => decodeExport(data)).toThrow(LocalDataCapacityError);
  });

  it("uses the same byte boundary for import-file preflight", () => {
    expect(() => assertImportFileSize(maximumBackupBytes)).not.toThrow();
    expect(() => assertImportFileSize(maximumBackupBytes + 1)).toThrow(LocalDataCapacityError);
  });

  it("allows only deletion or non-growing updates when existing data is already over a limit", () => {
    const current = { ...emptyExport(), notes: Array.from({ length: 10_001 }, (_, index) => note(`n${index}`, "xx")) };
    const smallerUpdate = { ...current, notes: current.notes.map((item, index) => index === 0 ? note(item.id, "x") : item) };
    const deletion = { ...current, notes: current.notes.slice(0, -1) };
    const growingUpdate = { ...current, notes: current.notes.map((item, index) => index === 0 ? note(item.id, "xxx") : item) };

    expect(() => assertMutationCapacity(current, smallerUpdate, false)).not.toThrow();
    expect(() => assertMutationCapacity(current, deletion, false)).not.toThrow();
    expect(() => assertMutationCapacity(current, smallerUpdate, true)).toThrow(LocalDataCapacityError);
    expect(() => assertMutationCapacity(current, growingUpdate, false)).toThrow(LocalDataCapacityError);
  });

  it("refuses a non-importable normal export while preserving an explicit recovery export", async () => {
    const data = { ...emptyExport(), notes: Array.from({ length: 10_001 }, (_, index) => note(`n${index}`)) };
    const backend = createLocalDataBackend(keyForStoredValue, () => Promise.resolve({ fallbackMessage: "memory" }));
    await backend.replaceAll(toStoreReplacements(data));

    await expect(exportLocalData(backend)).rejects.toThrow(LocalDataCapacityError);
    expect((await exportRecoveryLocalData(backend)).notes).toHaveLength(10_001);
  });

  it("routes structurally valid data with a dangling comparison link to recovery export", async () => {
    const data = {
      ...emptyExport(),
      comparisons: [{
        id: "dangling", createdAt: timestamp,
        first: { sceneId: "paper-moth" as const, variant: natural, seed: 1, observationId: "missing" },
        second: { sceneId: "paper-moth" as const, variant: enhanced, seed: 1 },
        changedDimension: "figureGround" as const,
      }],
    };
    const backend = createLocalDataBackend(keyForStoredValue, () => Promise.resolve({ fallbackMessage: "memory" }));
    await backend.replaceAll(toStoreReplacements(data));

    await expect(exportLocalData(backend)).rejects.toThrow("Export a recovery copy");
    expect((await exportRecoveryLocalData(backend)).comparisons).toHaveLength(1);
  });

  it("admits startup provenance as one atomic bounded batch", async () => {
    const repository = createLocalRepository();
    const source = { ...emptyExport(), provenance: Array.from({ length: 99 }, (_, index) => provenance(`asset-${index}`)) };
    await repository.importData(source);

    await expect(repository.saveProvenance([provenance("asset-new-a", false), provenance("asset-new-b", false)])).rejects.toThrow(LocalDataCapacityError);

    expect(await repository.listProvenance()).toHaveLength(99);
  });
});
