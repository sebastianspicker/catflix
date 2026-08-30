import type { StorageStatus } from "./types";

export const storeNames = ["settings", "queue", "progress", "notes", "observations", "comparisons", "provenance"] as const;
export type StoreName = typeof storeNames[number];
export interface StoreReplacement { store: StoreName; values: readonly unknown[]; }
export interface DatabaseConnection { database?: IDBDatabase; fallbackMessage?: string; }
export type DatabaseOpener = () => Promise<DatabaseConnection>;
export interface LocalDataBackend {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  values<T>(store: StoreName): Promise<T[]>;
  put(store: StoreName, value: unknown): Promise<void>;
  replace(store: StoreName, values: readonly unknown[]): Promise<void>;
  replaceAll(replacements: readonly StoreReplacement[]): Promise<void>;
  getStatus(): StorageStatus;
  subscribeStatus(listener: (status: StorageStatus) => void): () => void;
}

export function openLocalDatabase(): Promise<DatabaseConnection> {
  if (typeof indexedDB === "undefined") return Promise.resolve({ fallbackMessage: "IndexedDB is unavailable; Catflix is using temporary memory only." });
  return new Promise((resolve) => {
    const request = indexedDB.open("catflix-local", 2);
    let settled = false;
    const finish = (connection: DatabaseConnection) => {
      if (settled) { connection.database?.close(); return; }
      settled = true;
      resolve(connection);
    };
    request.onupgradeneeded = () => { createMissingStores(request.result); };
    request.onsuccess = () => { finish({ database: request.result }); };
    request.onerror = () => { finish({ fallbackMessage: "IndexedDB could not open; Catflix is using temporary memory only." }); };
    request.onblocked = () => { finish({ fallbackMessage: "IndexedDB is blocked by another tab; Catflix is using temporary memory only." }); };
  });
}

export function createLocalDataBackend(keyFor: (store: StoreName, value: unknown) => string, openConnection: DatabaseOpener = openLocalDatabase): LocalDataBackend {
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

async function getValue<T>(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, store: StoreName, key: string): Promise<T | undefined> {
  const database = await open();
  if (!database) return cloneValue(memory.get(store)?.get(key) as T | undefined);
  return requestValue<T | undefined>(database.transaction(store, "readonly").objectStore(store).get(key));
}

async function listValues<T>(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, store: StoreName): Promise<T[]> {
  const database = await open();
  if (!database) return [...(memory.get(store)?.values() ?? [])].map((item) => cloneValue(item as T));
  return requestValue<T[]>(database.transaction(store, "readonly").objectStore(store).getAll());
}

async function putValue(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, keyFor: (store: StoreName, value: unknown) => string, store: StoreName, value: unknown): Promise<void> {
  const key = keyFor(store, value); const database = await open();
  if (!database) { memory.get(store)?.set(key, cloneValue(value)); return; }
  const transaction = database.transaction(store, "readwrite");
  await transactionDone(transaction, () => transaction.objectStore(store).put(cloneValue(value), key));
}

async function replaceValues(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, keyFor: (store: StoreName, value: unknown) => string, store: StoreName, values: readonly unknown[]): Promise<void> {
  const database = await open();
  if (!database) { memory.set(store, replacementMap(values, keyFor, store)); return; }
  const transaction = database.transaction(store, "readwrite");
  await transactionDone(transaction, () => { replaceObjectStore(transaction.objectStore(store), values, keyFor, store); });
}

async function replaceAllValues(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, keyFor: (store: StoreName, value: unknown) => string, replacements: readonly StoreReplacement[]): Promise<void> {
  assertCompleteReplacement(replacements);
  const database = await open();
  if (!database) {
    const staged = new Map(replacements.map(({ store, values }) => [store, replacementMap(values, keyFor, store)]));
    staged.forEach((values, store) => memory.set(store, values));
    return;
  }
  const transaction = database.transaction(storeNames, "readwrite");
  await transactionDone(transaction, () => {
    replacements.forEach(({ store, values }) => { replaceObjectStore(transaction.objectStore(store), values, keyFor, store); });
  });
}

function assertCompleteReplacement(replacements: readonly StoreReplacement[]): void {
  const replacementNames = replacements.map(({ store }) => store);
  if (replacementNames.length !== storeNames.length || new Set(replacementNames).size !== storeNames.length || storeNames.some((name) => !replacementNames.includes(name))) {
    throw new Error("A local-data import must replace every store exactly once.");
  }
}
function createMissingStores(database: IDBDatabase): void { storeNames.filter((name) => !database.objectStoreNames.contains(name)).forEach((name) => database.createObjectStore(name)); }
function replacementMap(values: readonly unknown[], keyFor: (store: StoreName, value: unknown) => string, store: StoreName): Map<string, unknown> { const replacement = new Map<string, unknown>(); values.forEach((value) => replacement.set(keyFor(store, value), cloneValue(value))); return replacement; }
function replaceObjectStore(store: IDBObjectStore, values: readonly unknown[], keyFor: (store: StoreName, value: unknown) => string, name: StoreName): void { store.clear(); values.forEach((value) => store.put(cloneValue(value), keyFor(name, value))); }
function requestValue<T>(request: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { request.onsuccess = () => { resolve(request.result); }; request.onerror = () => { reject(request.error ?? new Error("IndexedDB request failed.")); }; }); }
function transactionDone(transaction: IDBTransaction, write: () => void): Promise<void> { return new Promise((resolve, reject) => { transaction.oncomplete = () => { resolve(); }; transaction.onerror = () => { reject(transaction.error ?? new Error("IndexedDB transaction failed.")); }; transaction.onabort = () => { reject(transaction.error ?? new Error("IndexedDB transaction aborted.")); }; try { write(); } catch (reason) { const error = reason instanceof Error ? reason : new Error("IndexedDB write callback failed.", { cause: reason }); transaction.abort(); reject(error); } }); }
function cloneValue<T>(value: T): T { return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T; }
function errorMessage(error: unknown): string { return error instanceof Error && error.message ? error.message : "Please keep this tab open and try again."; }
