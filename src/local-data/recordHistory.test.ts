import { describe, expect, it, vi } from "vitest";
import type { LocalDataBackend, LocalDataTransaction, StoreName } from "./indexedDb";
import { deleteRecord } from "./recordHistory";
import type { ComparisonRecord, RefereeNote } from "./types";

const timestamp = "2026-07-29T12:00:00.000Z";
const natural = { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" } as const;
const enhanced = { ...natural, figureGround: "enhanced" as const };

function comparison(id: string, linked = false): ComparisonRecord {
  return {
    id,
    createdAt: timestamp,
    first: { sceneId: "paper-moth", variant: natural, seed: 1, ...(linked ? { observationId: "target-note" } : {}) },
    second: { sceneId: "paper-moth", variant: enhanced, seed: 1 },
    changedDimension: "figureGround",
  };
}

describe("local record-history writes", () => {
  it("updates only a comparison whose deleted record link changed", async () => {
    const note: RefereeNote = { id: "target-note", cat: "Arri", sceneId: "paper-moth", contentRevision: "2026.07.29", createdAt: timestamp, rawNote: "", vocabulary: [] };
    const comparisons = Array.from({ length: 5_000 }, (_, index) => comparison(`c${index}`, index === 2_500));
    const puts: { store: StoreName; value: unknown }[] = [];
    const deletes: { store: StoreName; key: string }[] = [];
    const transaction: LocalDataTransaction = {
      values: <T>(store: StoreName) => structuredClone(store === "notes" ? [note] : store === "comparisons" ? comparisons : []) as T[],
      put: (store, value) => { puts.push({ store, value }); },
      delete: (store, key) => { deletes.push({ store, key }); },
    };
    const transact = vi.fn((_stores: readonly StoreName[], mutation: (selected: LocalDataTransaction) => unknown) => Promise.resolve(mutation(transaction)));
    const backend = { transact } as unknown as LocalDataBackend;

    const history = await deleteRecord(backend, { kind: "note", id: note.id });

    expect(deletes).toEqual([{ store: "notes", key: "target-note" }]);
    expect(puts).toHaveLength(1);
    expect(puts[0]).toMatchObject({ store: "comparisons", value: { id: "c2500", first: {} } });
    expect(history.comparisons).toHaveLength(5_000);
  });
});
