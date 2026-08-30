import { describe, expect, it } from "vitest";
import { createLocalDataBackend, storeNames } from "./indexedDb";

const keyForTest = (_store: string, value: unknown) => (value as { id: string }).id;
const failedDatabase = (message: string) => ({ transaction: () => { throw new Error(message); } }) as unknown as IDBDatabase;

describe("local-data IndexedDB adapter", () => {
  it("surfaces a temporary-memory fallback through status subscribers", async () => {
    const backend = createLocalDataBackend(keyForTest, async () => ({ fallbackMessage: "simulated open failure" }));
    const updates: string[] = [];
    const unsubscribe = backend.subscribeStatus((status) => { updates.push(`${status.mode}:${status.message}`); });

    await backend.put("queue", { id: "current-queue" });
    unsubscribe();

    expect(await backend.values("queue")).toEqual([{ id: "current-queue" }]);
    expect(backend.getStatus()).toEqual({ mode: "degraded", message: "simulated open failure" });
    expect(updates).toEqual(["degraded:simulated open failure"]);
  });

  it("preserves read and write failure semantics", async () => {
    const readBackend = createLocalDataBackend(keyForTest, async () => ({ database: failedDatabase("simulated read failure") }));
    await expect(readBackend.values("queue")).rejects.toThrow("simulated read failure");
    expect(readBackend.getStatus()).toEqual({ mode: "degraded", message: "Local data could not be read. simulated read failure" });

    const writeBackend = createLocalDataBackend(keyForTest, async () => ({ database: failedDatabase("simulated write failure") }));
    await expect(writeBackend.replace("queue", [{ id: "replacement" }])).rejects.toThrow("simulated write failure");
    expect(writeBackend.getStatus()).toEqual({ mode: "degraded", message: "Local data could not be saved. simulated write failure" });
  });

  it("atomically replaces every temporary-memory store and refuses partial replacement", async () => {
    const backend = createLocalDataBackend((store, value) => {
      const record = value as { id: string; fail?: boolean };
      if (store === "notes" && record.fail) throw new Error("injected write failure");
      return record.id;
    }, async () => ({ fallbackMessage: "memory" }));
    const original = storeNames.map((store) => ({ store, values: [{ id: `before-${store}` }] }));
    await backend.replaceAll(original);

    await expect(backend.replaceAll(storeNames.map((store) => ({ store, values: [{ id: `after-${store}`, fail: store === "notes" }] })))).rejects.toThrow("injected write failure");
    await Promise.all(storeNames.map(async (store) => { expect(await backend.values(store)).toEqual([{ id: `before-${store}` }]); }));

    await backend.replaceAll(storeNames.map((store) => ({ store, values: [{ id: `after-${store}` }] })));
    await Promise.all(storeNames.map(async (store) => { expect(await backend.values(store)).toEqual([{ id: `after-${store}` }]); }));
    await expect(backend.replaceAll([{ store: "queue", values: [] }])).rejects.toThrow("replace every store exactly once");
  });
});
