import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalRepository } from "./LocalRepository";
import type { LocalRepository } from "./LocalRepository";
import { LocalDataCapacityError } from "./localDataCapacity";
import { isTimestamp } from "./records";
import type { CatflixDataExport } from "./types";

/**
 * Golden fixtures lock down the on-disk shape of the import/export contract
 * described in AGENTS.md "Stable contracts". Each file under ./fixtures is
 * either produced by the real codec (valid cases) or a small, deliberately
 * broken export that exercises one specific validation rule (malformed cases).
 */

const fixturesDir = resolve(import.meta.dirname, "fixtures");
const unsupportedExportMessage = "Unsupported or corrupt Catflix export.";
const capacityExceededMessage = "Unsupported or corrupt Catflix export. The normalized data exceeds a local-data capacity limit.";
const validFixtures = ["v1-minimal.json", "v1-full.json", "v2-minimal.json", "v2-full.json"] as const;
const legacyFixtures = ["v1-minimal.json", "v1-full.json"] as const;

function readFixtureText(name: string): string {
  return readFileSync(resolve(fixturesDir, name), "utf8");
}

function readFixture(name: string): unknown {
  return JSON.parse(readFixtureText(name));
}

function readV2Fixture(name: string): CatflixDataExport {
  return readFixture(name) as CatflixDataExport;
}

function storedFields(data: CatflixDataExport) {
  const { exportedAt, ...stores } = data;
  if (!isTimestamp(exportedAt)) throw new Error("Expected export timestamp.");
  return stores;
}

function first<T>(items: readonly T[], description: string): T {
  const [item] = items;
  if (!item) throw new Error(`Expected at least one ${description}.`);
  return item;
}

const countableStores = ["queue", "progress", "notes", "observations", "comparisons", "provenance"] as const;

function fixtureCounts(data: unknown) {
  const record = data as Partial<Record<(typeof countableStores)[number], unknown[]>>;
  const counts = Object.fromEntries(countableStores.map((store) => [store, record[store]?.length ?? 0]));
  return { settings: 1 as const, ...counts };
}

/** Attempts an import and returns the rejection reason, failing the test if the import unexpectedly succeeds. */
async function importRejection(repository: LocalRepository, data: unknown): Promise<unknown> {
  try {
    await repository.importData(data);
  } catch (error) {
    return error;
  }
  throw new Error("Expected the import to be rejected.");
}

async function expectUnchangedAfterRejection(repository: LocalRepository, before: CatflixDataExport, data: unknown): Promise<unknown> {
  const error = await importRejection(repository, data);
  expect(storedFields(await repository.exportData())).toEqual(storedFields(before));
  return error;
}

describe("golden fixtures: valid imports", () => {
  it.each(validFixtures)("imports %s with a preview that matches the file's own counts", (name) => {
    const repository = createLocalRepository();
    const data = readFixture(name);
    const preview = repository.prepareImport(data);
    expect(preview.counts).toEqual(fixtureCounts(data));
  });

  it.each(legacyFixtures)("normalizes %s into v2 settings with an empty observations store", async (name) => {
    const repository = createLocalRepository();
    await repository.importData(readFixture(name));
    expect(await repository.getSettings()).toMatchObject({ sceneMotionMode: "standard" });
    expect(await repository.listObservations()).toEqual([]);
  });

  it.each(validFixtures)("round-trips %s to a schema-v2 fixed point", async (name) => {
    const repository = createLocalRepository();
    await repository.importData(readFixture(name));
    const firstExport = await repository.exportData();
    expect(firstExport.schemaVersion).toBe(2);

    const second = createLocalRepository();
    await second.importData(firstExport);
    const secondExport = await second.exportData();

    expect(storedFields(secondExport)).toEqual(storedFields(firstExport));
  });

  it("keeps the emitted v2 export for v2-full.json stable against a committed snapshot", async () => {
    const repository = createLocalRepository();
    await repository.importData(readFixture("v2-full.json"));
    const exported = await repository.exportData();
    await expect(JSON.stringify(storedFields(exported), null, 2)).toMatchFileSnapshot("./fixtures/v2-full.expected-export.json");
  });
});

describe("golden fixtures: malformed imports", () => {
  it.each([
    ["malformed-wrong-schema-version.json", "an unsupported schemaVersion"],
    ["malformed-duplicate-keys.json", "duplicate queue ids"],
    ["malformed-dangling-link.json", "a dangling comparison observationId"],
  ])("rejects %s (%s) with the codec's validation error and leaves existing data untouched", async (name) => {
    const repository = createLocalRepository();
    await repository.importData(readFixture("v2-full.json"));
    const before = await repository.exportData();

    const error = await expectUnchangedAfterRejection(repository, before, readFixture(name));

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(LocalDataCapacityError);
    expect((error as Error).message).toBe(unsupportedExportMessage);
  });

  it("rejects malformed-invalid-json.json before it ever reaches the codec", () => {
    expect(() => { JSON.parse(readFixtureText("malformed-invalid-json.json")); }).toThrow(SyntaxError);
  });

  it("rejects a rawNote over its 20,000-character limit and leaves existing data untouched", async () => {
    const repository = createLocalRepository();
    await repository.importData(readFixture("v2-full.json"));
    const before = await repository.exportData();

    const source = readV2Fixture("v2-full.json");
    const note = first(source.notes, "note");
    const oversized = { ...source, notes: [{ ...note, rawNote: "x".repeat(20_001) }] };

    const error = await expectUnchangedAfterRejection(repository, before, oversized);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(LocalDataCapacityError);
    expect((error as Error).message).toBe(unsupportedExportMessage);
  });

  it("rejects a queue import over its 5-record count limit and leaves existing data untouched", async () => {
    const repository = createLocalRepository();
    await repository.importData(readFixture("v2-full.json"));
    const before = await repository.exportData();

    const template = first(readV2Fixture("v2-full.json").queue, "queue item");
    const oversized = { ...readV2Fixture("v2-minimal.json"), queue: Array.from({ length: 6 }, (_, index) => ({ ...template, id: `q-over-${index}` })) };

    const error = await expectUnchangedAfterRejection(repository, before, oversized);

    expect(error).toBeInstanceOf(LocalDataCapacityError);
    expect((error as Error).message).toBe(capacityExceededMessage);
  });
});
