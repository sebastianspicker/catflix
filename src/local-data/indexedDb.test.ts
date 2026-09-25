import { describe, expect, it } from "vitest";
import { createLocalDataBackend, storeNames } from "./indexedDb";
import { LocalDataCapacityError } from "./localDataCapacity";

const keyForTest = (_store: string, value: unknown) => (value as { id: string }).id;
const failedDatabase = (message: string) => ({ transaction: () => { throw new Error(message); } }) as unknown as IDBDatabase;

function trackedDatabase() {
  const data = new Map(storeNames.map((store) => [store, new Map<string, unknown>()]));
  const writes = { clears: 0, puts: 0, deletes: 0 };
  const database = {
    transaction(requested: string | readonly string[]) {
      const names = typeof requested === "string" ? [requested] : [...requested];
      let pending = 0;
      let aborted = false;
      let completionQueued = false;
      const maybeComplete = () => {
        if (pending || aborted || completionQueued) return;
        completionQueued = true;
        setTimeout(() => {
          const handler = transaction.oncomplete;
          if (!aborted && typeof handler === "function") handler.call(transaction, new Event("complete"));
        }, 0);
      };
      const request = <T>(result: T) => {
        pending += 1;
        const next = {} as IDBRequest<T>;
        queueMicrotask(() => {
          Object.defineProperty(next, "result", { value: structuredClone(result) });
          const handler = next.onsuccess;
          if (typeof handler === "function") handler.call(next, new Event("success"));
          pending -= 1;
          maybeComplete();
        });
        return next;
      };
      const transaction: {
        objectStoreNames: string[];
        oncomplete: ((event: Event) => void) | null;
        onerror: ((event: Event) => void) | null;
        onabort: ((event: Event) => void) | null;
        error: DOMException | null;
        abort: () => void;
        objectStore: (name: typeof storeNames[number]) => unknown;
      } = {
        objectStoreNames: names,
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: null,
        abort() {
          aborted = true;
          const handler = transaction.onabort;
          if (typeof handler === "function") handler.call(transaction, new Event("abort"));
        },
        objectStore(name: typeof storeNames[number]) {
          const records = data.get(name) ?? new Map<string, unknown>();
          return {
            get: (key: string) => request(records.get(key)),
            getAll: () => request([...records.values()]),
            put(value: unknown, key: string) { writes.puts += 1; records.set(key, structuredClone(value)); maybeComplete(); },
            delete(key: string) { writes.deletes += 1; records.delete(key); maybeComplete(); },
            clear() { writes.clears += 1; records.clear(); maybeComplete(); },
          };
        },
      };
      return transaction as unknown as IDBTransaction;
    },
  } as unknown as IDBDatabase;
  return { database, writes };
}

describe("local-data IndexedDB adapter", () => {
  it("surfaces a temporary-memory fallback through status subscribers", async () => {
    const backend = createLocalDataBackend(keyForTest, () => Promise.resolve({ fallbackMessage: "simulated open failure" }));
    const updates: string[] = [];
    const unsubscribe = backend.subscribeStatus((status) => { updates.push(`${status.mode}:${status.message}`); });

    await backend.put("queue", { id: "current-queue" });
    unsubscribe();

    expect(await backend.values("queue")).toEqual([{ id: "current-queue" }]);
    expect(backend.getStatus()).toEqual({ mode: "degraded", message: "simulated open failure" });
    expect(updates).toEqual(["degraded:simulated open failure"]);
  });

  it("preserves read and write failure semantics", async () => {
    const readBackend = createLocalDataBackend(keyForTest, () => Promise.resolve({ database: failedDatabase("simulated read failure") }));
    await expect(readBackend.values("queue")).rejects.toThrow("simulated read failure");
    expect(readBackend.getStatus()).toEqual({ mode: "degraded", message: "Local data could not be read. simulated read failure" });

    const writeBackend = createLocalDataBackend(keyForTest, () => Promise.resolve({ database: failedDatabase("simulated write failure") }));
    await expect(writeBackend.replace("queue", [{ id: "replacement" }])).rejects.toThrow("simulated write failure");
    expect(writeBackend.getStatus()).toEqual({ mode: "degraded", message: "Local data could not be saved. simulated write failure" });
  });

  it("atomically replaces every temporary-memory store and refuses partial replacement", async () => {
    const backend = createLocalDataBackend((store, value) => {
      const record = value as { id: string; fail?: boolean };
      if (store === "notes" && record.fail) throw new Error("injected write failure");
      return record.id;
    }, () => Promise.resolve({ fallbackMessage: "memory" }));
    const original = storeNames.map((store) => ({ store, values: [{ id: `before-${store}` }] }));
    await backend.replaceAll(original);

    await expect(backend.replaceAll(storeNames.map((store) => ({ store, values: [{ id: `after-${store}`, fail: store === "notes" }] })))).rejects.toThrow("injected write failure");
    await Promise.all(storeNames.map(async (store) => { expect(await backend.values(store)).toEqual([{ id: `before-${store}` }]); }));

    await backend.replaceAll(storeNames.map((store) => ({ store, values: [{ id: `after-${store}` }] })));
    await Promise.all(storeNames.map(async (store) => { expect(await backend.values(store)).toEqual([{ id: `after-${store}` }]); }));
    await expect(backend.replaceAll([{ store: "queue", values: [] }])).rejects.toThrow("replace every store exactly once");
  });

  it("stages multi-store memory mutations until the callback completes", async () => {
    const backend = createLocalDataBackend(keyForTest, () => Promise.resolve({ fallbackMessage: "memory" }));
    await backend.put("observations", { id: "observation" });
    await backend.put("comparisons", { id: "comparison" });

    await expect(backend.transact(["observations", "comparisons"], (transaction) => {
      transaction.delete("observations", "observation");
      transaction.put("comparisons", { id: "replacement" });
      throw new Error("abort staged mutation");
    })).rejects.toThrow("abort staged mutation");

    expect(await backend.values("observations")).toEqual([{ id: "observation" }]);
    expect(await backend.values("comparisons")).toEqual([{ id: "comparison" }]);
  });

  it("keeps capacity rejection atomic without degrading a persistent backend", async () => {
    const tracked = trackedDatabase();
    const backend = createLocalDataBackend(keyForTest, () => Promise.resolve({ database: tracked.database }), (_current, next) => {
      if ((next.get("queue")?.size ?? 0) > 1) throw new LocalDataCapacityError();
    });
    await backend.put("queue", { id: "first" });

    await expect(backend.put("queue", { id: "second" })).rejects.toThrow(LocalDataCapacityError);

    expect(await backend.values("queue")).toEqual([{ id: "first" }]);
    expect(backend.getStatus()).toEqual({ mode: "persistent" });
  });

  it("commits only the final targeted key operations after a transaction", async () => {
    const tracked = trackedDatabase();
    const backend = createLocalDataBackend(keyForTest, () => Promise.resolve({ database: tracked.database }), () => undefined);
    await backend.replaceAll(storeNames.map((store) => ({ store, values: store === "observations" ? [{ id: "observation" }] : store === "comparisons" ? [{ id: "comparison" }] : [] })));
    tracked.writes.clears = 0;
    tracked.writes.puts = 0;
    tracked.writes.deletes = 0;

    await backend.transact(["observations", "comparisons"], (transaction) => {
      transaction.delete("observations", "observation");
      transaction.delete("observations", "observation");
      transaction.put("comparisons", { id: "comparison", version: 1 });
      transaction.put("comparisons", { id: "comparison", version: 2 });
    });

    expect(tracked.writes).toEqual({ clears: 0, puts: 1, deletes: 1 });
    expect(await backend.values("observations")).toEqual([]);
    expect(await backend.values("comparisons")).toEqual([{ id: "comparison", version: 2 }]);

    tracked.writes.puts = 0;
    tracked.writes.deletes = 0;
    await backend.replace("comparisons", [{ id: "comparison", version: 2 }]);
    expect(tracked.writes).toEqual({ clears: 0, puts: 0, deletes: 0 });
  });

  it("keeps persistent and degraded-memory transaction results in parity", async () => {
    const tracked = trackedDatabase();
    const persistent = createLocalDataBackend(keyForTest, () => Promise.resolve({ database: tracked.database }), () => undefined);
    const memory = createLocalDataBackend(keyForTest, () => Promise.resolve({ fallbackMessage: "memory" }), () => undefined);
    for (const backend of [persistent, memory]) {
      await backend.put("observations", { id: "one" });
      await backend.transact(["observations", "comparisons"], (transaction) => {
        transaction.put("observations", { id: "two" });
        transaction.put("comparisons", { id: "pair" });
        transaction.delete("observations", "one");
      });
    }

    expect(await persistent.snapshot(["observations", "comparisons"])).toEqual(await memory.snapshot(["observations", "comparisons"]));
  });
});
