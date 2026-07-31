import { openDatabase } from "./indexedDbConnection";
import { getValue, listValues } from "./indexedDbReads";
import { putValue, replaceValues } from "./indexedDbWrites";

export type StoreName = "settings" | "queue" | "progress" | "notes" | "observations" | "comparisons" | "provenance";
export interface StoreBackend {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  values<T>(store: StoreName): Promise<T[]>;
  put(store: StoreName, value: unknown): Promise<void>;
  replace(store: StoreName, values: readonly unknown[]): Promise<void>;
}

export function createStoreBackend(keyFor: (store: StoreName, value: unknown) => string): StoreBackend {
  const memory = new Map<StoreName, Map<string, unknown>>(storeNames.map((name) => [name, new Map()]));
  let databasePromise: Promise<IDBDatabase | undefined> | undefined;
  const open = () => databasePromise ??= openDatabase();
  return { get: (store, key) => getValue(open, memory, store, key), values: (store) => listValues(open, memory, store), put: (store, value) => putValue(open, memory, keyFor, store, value), replace: (store, values) => replaceValues(open, memory, keyFor, store, values) };
}

export const storeNames: readonly StoreName[] = ["settings", "queue", "progress", "notes", "observations", "comparisons", "provenance"];
