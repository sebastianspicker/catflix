import { openDatabase } from "./indexedDbConnection";
import type { DatabaseOpener } from "./indexedDbConnection";
import { getValue, listValues } from "./indexedDbReads";
import { putValue, replaceAllValues, replaceValues } from "./indexedDbWrites";
import type { StorageStatus } from "./types";

export type StoreName = "settings" | "queue" | "progress" | "notes" | "observations" | "comparisons" | "provenance";
export interface StoreReplacement { store: StoreName; values: readonly unknown[]; }
export interface StoreBackend {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  values<T>(store: StoreName): Promise<T[]>;
  put(store: StoreName, value: unknown): Promise<void>;
  replace(store: StoreName, values: readonly unknown[]): Promise<void>;
  replaceAll(replacements: readonly StoreReplacement[]): Promise<void>;
  getStatus(): StorageStatus;
  subscribeStatus(listener: (status: StorageStatus) => void): () => void;
}

export function createStoreBackend(keyFor: (store: StoreName, value: unknown) => string, openConnection: DatabaseOpener = openDatabase): StoreBackend {
  const memory = new Map<StoreName, Map<string, unknown>>(storeNames.map((name) => [name, new Map()]));
  let databasePromise: Promise<IDBDatabase | undefined> | undefined;
  let status: StorageStatus = { mode: "persistent" };
  const listeners = new Set<(next: StorageStatus) => void>();
  const report = (next: StorageStatus) => { status = next; listeners.forEach((listener) => { listener(status); }); };
  const open = () => databasePromise ??= openConnection().then(({ database, fallbackMessage }) => {
    if (!database) report({ mode: "degraded", message: fallbackMessage ?? "IndexedDB is unavailable; Catflix is using temporary memory only." });
    return database;
  }).catch((error: unknown) => {
    report({ mode: "degraded", message: `IndexedDB could not open; Catflix is using temporary memory only. ${errorMessage(error)}` });
    return undefined;
  });
  const run = async <T>(operation: () => Promise<T>, kind: "read" | "write"): Promise<T> => {
    try { return await operation(); }
    catch (error) { report({ mode: "degraded", message: `${kind === "read" ? "Local data could not be read" : "Local data could not be saved"}. ${errorMessage(error)}` }); throw error; }
  };
  return {
    get: (store, key) => run(() => getValue(open, memory, store, key), "read"),
    values: (store) => run(() => listValues(open, memory, store), "read"),
    put: (store, value) => run(() => putValue(open, memory, keyFor, store, value), "write"),
    replace: (store, values) => run(() => replaceValues(open, memory, keyFor, store, values), "write"),
    replaceAll: (replacements) => run(() => replaceAllValues(open, memory, keyFor, replacements), "write"),
    getStatus: () => status,
    subscribeStatus: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

export const storeNames: readonly StoreName[] = ["settings", "queue", "progress", "notes", "observations", "comparisons", "provenance"];

function errorMessage(error: unknown): string { return error instanceof Error && error.message ? error.message : "Please keep this tab open and try again."; }
