import { LocalDataCapacityError } from "./localDataCapacity";
import type { StorageStatus } from "./types";

export const storeNames = ["settings", "queue", "progress", "notes", "observations", "comparisons", "provenance"] as const;
export type StoreName = typeof storeNames[number];
export interface StoreReplacement { store: StoreName; values: readonly unknown[]; }
export interface LocalDataTransaction {
  values<T>(store: StoreName): T[];
  put(store: StoreName, value: unknown): void;
  delete(store: StoreName, key: string): void;
}
export type LocalDataState = ReadonlyMap<StoreName, ReadonlyMap<string, unknown>>;
export type LocalDataSnapshot = ReadonlyMap<StoreName, readonly unknown[]>;
export type LocalDataAdmission = (current: LocalDataState, next: LocalDataState, operation: "mutation" | "replacement") => void;
export interface DatabaseConnection { database?: IDBDatabase; fallbackMessage?: string; }
export type DatabaseOpener = () => Promise<DatabaseConnection>;
export interface LocalDataBackend {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  values<T>(store: StoreName): Promise<T[]>;
  snapshot(stores?: readonly StoreName[]): Promise<LocalDataSnapshot>;
  put(store: StoreName, value: unknown): Promise<void>;
  replace(store: StoreName, values: readonly unknown[]): Promise<void>;
  replaceAll(replacements: readonly StoreReplacement[]): Promise<void>;
  transact<T>(stores: readonly StoreName[], mutation: (transaction: LocalDataTransaction) => T): Promise<T>;
  getStatus(): StorageStatus;
  subscribeStatus(listener: (status: StorageStatus) => void): () => void;
}

type StoreMaps = Map<StoreName, Map<string, unknown>>;
type LoggedMutation = { kind: "put"; value: unknown } | { kind: "delete" };
type MutationLog = Map<StoreName, Map<string, LoggedMutation>>;
type KeyFunction = (store: StoreName, value: unknown) => string;

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

export function createLocalDataBackend(keyFor: KeyFunction, openConnection: DatabaseOpener = openLocalDatabase, admit?: LocalDataAdmission): LocalDataBackend {
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
    catch (error) {
      if (!(error instanceof LocalDataCapacityError)) report({ mode: "degraded", message: `${kind === "read" ? "Local data could not be read" : "Local data could not be saved"}. ${errorMessage(error)}` });
      throw error;
    }
  };
  return {
    get: (store, key) => run(() => getValue(open, memory, store, key), "read"),
    values: (store) => run(() => listValues(open, memory, store), "read"),
    snapshot: (stores = storeNames) => run(() => snapshotValues(open, memory, validatedTransactionStores(stores)), "read"),
    put: (store, value) => run(() => putValue(open, memory, keyFor, store, value, admit), "write"),
    replace: (store, values) => run(() => replaceValues(open, memory, keyFor, store, values, admit), "write"),
    replaceAll: (replacements) => run(() => replaceAllValues(open, memory, keyFor, replacements, admit), "write"),
    transact: (stores, mutation) => run(() => transactValues(open, memory, keyFor, stores, mutation, admit), "write"),
    getStatus: () => status,
    subscribeStatus: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

async function getValue<T>(open: () => Promise<IDBDatabase | undefined>, memory: StoreMaps, store: StoreName, key: string): Promise<T | undefined> {
  const database = await open();
  if (!database) return cloneValue(memory.get(store)?.get(key) as T | undefined);
  return requestValue(database.transaction(store, "readonly").objectStore(store).get(key) as IDBRequest<T | undefined>);
}

async function listValues<T>(open: () => Promise<IDBDatabase | undefined>, memory: StoreMaps, store: StoreName): Promise<T[]> {
  const snapshot = await snapshotValues(open, memory, [store]);
  return [...(snapshot.get(store) ?? [])] as T[];
}

async function snapshotValues(open: () => Promise<IDBDatabase | undefined>, memory: StoreMaps, stores: readonly StoreName[]): Promise<LocalDataSnapshot> {
  const database = await open();
  if (!database) return new Map(stores.map((store) => [store, [...(memory.get(store)?.values() ?? [])].map(cloneValue)]));
  const transaction = database.transaction(stores, "readonly");
  const values = await Promise.all(stores.map((store) => requestValue<unknown[]>(transaction.objectStore(store).getAll())));
  return new Map(stores.map((store, index) => [store, values[index] ?? []]));
}

async function putValue(open: () => Promise<IDBDatabase | undefined>, memory: StoreMaps, keyFor: KeyFunction, store: StoreName, value: unknown, admit?: LocalDataAdmission): Promise<void> {
  if (admit) {
    await transactValues(open, memory, keyFor, [store], (transaction) => { transaction.put(store, value); }, admit);
    return;
  }
  const key = keyFor(store, value);
  const database = await open();
  if (!database) { memory.get(store)?.set(key, cloneValue(value)); return; }
  const transaction = database.transaction(store, "readwrite");
  await transactionDone(transaction, () => transaction.objectStore(store).put(cloneValue(value), key));
}

async function replaceValues(open: () => Promise<IDBDatabase | undefined>, memory: StoreMaps, keyFor: KeyFunction, store: StoreName, values: readonly unknown[], admit?: LocalDataAdmission): Promise<void> {
  await transactValues(open, memory, keyFor, [store], (transaction) => replaceTransactionStore(transaction, store, values, keyFor), admit);
}

async function replaceAllValues(open: () => Promise<IDBDatabase | undefined>, memory: StoreMaps, keyFor: KeyFunction, replacements: readonly StoreReplacement[], admit?: LocalDataAdmission): Promise<void> {
  assertCompleteReplacement(replacements);
  const staged = new Map(replacements.map(({ store, values }) => [store, replacementMap(values, keyFor, store)]));
  const database = await open();
  if (!database) {
    admit?.(memory, staged, "replacement");
    staged.forEach((values, store) => memory.set(store, values));
    return;
  }
  const transaction = database.transaction(storeNames, "readwrite");
  await transactionWithCurrentValues(transaction, keyFor, (current) => {
    admit?.(current, staged, "replacement");
    replacements.forEach(({ store, values }) => { replaceObjectStore(transaction.objectStore(store), values, keyFor, store); });
  });
}

async function transactValues<T>(open: () => Promise<IDBDatabase | undefined>, memory: StoreMaps, keyFor: KeyFunction, stores: readonly StoreName[], mutation: (transaction: LocalDataTransaction) => T, admit?: LocalDataAdmission): Promise<T> {
  const selectedStores = validatedTransactionStores(stores);
  const loadedStores = admit ? [...storeNames] : selectedStores;
  const database = await open();
  if (database) return transactIndexedDb(database, loadedStores, selectedStores, keyFor, mutation, admit);
  const current = selectStoreMaps(memory, loadedStores);
  const staged = cloneStoreMaps(current);
  const result = mutation(stagedTransaction(staged, keyFor, new Set(selectedStores)));
  admit?.(current, staged, "mutation");
  staged.forEach((values, store) => memory.set(store, values));
  return result;
}

function transactIndexedDb<T>(database: IDBDatabase, loadedStores: readonly StoreName[], selectedStores: readonly StoreName[], keyFor: KeyFunction, mutation: (transaction: LocalDataTransaction) => T, admit?: LocalDataAdmission): Promise<T> {
  const transaction = database.transaction(loadedStores, "readwrite");
  let result: T;
  return transactionWithCurrentValues(transaction, keyFor, (current) => {
    const staged = cloneStoreMaps(current);
    const log: MutationLog = new Map(selectedStores.map((store) => [store, new Map<string, LoggedMutation>()]));
    result = mutation(stagedTransaction(staged, keyFor, new Set(selectedStores), log));
    admit?.(current, staged, "mutation");
    applyMutationLog(transaction, finalMutationLog(current, log));
  }).then(() => result);
}

function transactionWithCurrentValues(transaction: IDBTransaction, keyFor: KeyFunction, write: (current: StoreMaps) => void): Promise<void> {
  const names = Array.from(transaction.objectStoreNames) as StoreName[];
  return new Promise((resolve, reject) => {
    let failure: Error | undefined;
    transaction.oncomplete = () => { if (failure) reject(failure); else resolve(); };
    transaction.onerror = () => { reject(failure ?? transaction.error ?? new Error("IndexedDB transaction failed.")); };
    transaction.onabort = () => { reject(failure ?? transaction.error ?? new Error("IndexedDB transaction aborted.")); };
    Promise.all(names.map((store) => requestValue<unknown[]>(transaction.objectStore(store).getAll())))
      .then((values) => {
        try { write(new Map(names.map((store, index) => [store, replacementMap(values[index] ?? [], keyFor, store, false)]))); }
        catch (reason) { failure = toError(reason, "Local-data transaction callback failed."); transaction.abort(); }
      })
      .catch((reason: unknown) => { failure = toError(reason, "IndexedDB transaction read failed."); transaction.abort(); });
  });
}

function stagedTransaction(staged: StoreMaps, keyFor: KeyFunction, selectedStores: ReadonlySet<StoreName>, log?: MutationLog): LocalDataTransaction {
  const selected = (store: StoreName): Map<string, unknown> => {
    const values = selectedStores.has(store) ? staged.get(store) : undefined;
    if (!values) throw new Error(`Store ${store} was not selected for this local-data transaction.`);
    return values;
  };
  return {
    values: <T>(store: StoreName) => [...selected(store).values()].map((value) => cloneValue(value as T)),
    put: (store, value) => {
      const key = keyFor(store, value);
      const stored = cloneValue(value);
      selected(store).set(key, stored);
      log?.get(store)?.set(key, { kind: "put", value: stored });
    },
    delete: (store, key) => {
      selected(store).delete(key);
      log?.get(store)?.set(key, { kind: "delete" });
    },
  };
}

function replaceTransactionStore(transaction: LocalDataTransaction, store: StoreName, values: readonly unknown[], keyFor: KeyFunction): void {
  const replacement = replacementMap(values, keyFor, store, false);
  transaction.values(store).forEach((value) => {
    const key = keyFor(store, value);
    if (!replacement.has(key)) transaction.delete(store, key);
  });
  replacement.forEach((value) => { transaction.put(store, value); });
}

function applyMutationLog(transaction: IDBTransaction, log: MutationLog): void {
  log.forEach((mutations, store) => mutations.forEach((mutation, key) => {
    if (mutation.kind === "put") transaction.objectStore(store).put(mutation.value, key);
    else transaction.objectStore(store).delete(key);
  }));
}

function finalMutationLog(current: LocalDataState, log: MutationLog): MutationLog {
  log.forEach((mutations, store) => {
    const before = current.get(store);
    mutations.forEach((mutation, key) => {
      const unchanged = mutation.kind === "delete"
        ? !before?.has(key)
        : before?.has(key) && sameStoredValue(before.get(key), mutation.value);
      if (unchanged) mutations.delete(key);
    });
  });
  return log;
}

function validatedTransactionStores(stores: readonly StoreName[]): StoreName[] {
  const names = [...stores];
  if (names.length === 0 || new Set(names).size !== names.length || names.some((store) => !storeNames.includes(store))) throw new Error("A local-data transaction requires unique known stores.");
  return names;
}

function assertCompleteReplacement(replacements: readonly StoreReplacement[]): void {
  const replacementNames = replacements.map(({ store }) => store);
  if (replacementNames.length !== storeNames.length || new Set(replacementNames).size !== storeNames.length || storeNames.some((name) => !replacementNames.includes(name))) {
    throw new Error("A local-data import must replace every store exactly once.");
  }
}

function selectStoreMaps(memory: StoreMaps, stores: readonly StoreName[]): StoreMaps { return new Map(stores.map((store) => [store, memory.get(store) ?? new Map<string, unknown>()])); }
function cloneStoreMaps(values: LocalDataState): StoreMaps { return new Map([...values].map(([store, records]) => [store, new Map(records)])); }
function createMissingStores(database: IDBDatabase): void { storeNames.filter((name) => !database.objectStoreNames.contains(name)).forEach((name) => database.createObjectStore(name)); }
function replacementMap(values: readonly unknown[], keyFor: KeyFunction, store: StoreName, clone = true): Map<string, unknown> { const replacement = new Map<string, unknown>(); values.forEach((value) => { const stored = clone ? cloneValue(value) : value; replacement.set(keyFor(store, stored), stored); }); return replacement; }
function replaceObjectStore(store: IDBObjectStore, values: readonly unknown[], keyFor: KeyFunction, name: StoreName): void { store.clear(); values.forEach((value) => store.put(cloneValue(value), keyFor(name, value))); }
function requestValue<T>(request: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { request.onsuccess = () => { resolve(request.result); }; request.onerror = () => { reject(request.error ?? new Error("IndexedDB request failed.")); }; }); }
function transactionDone(transaction: IDBTransaction, write: () => void): Promise<void> { return new Promise((resolve, reject) => { transaction.oncomplete = () => { resolve(); }; transaction.onerror = () => { reject(transaction.error ?? new Error("IndexedDB transaction failed.")); }; transaction.onabort = () => { reject(transaction.error ?? new Error("IndexedDB transaction aborted.")); }; try { write(); } catch (reason) { const error = toError(reason, "IndexedDB write callback failed."); transaction.abort(); reject(error); } }); }
function cloneValue<T>(value: T): T { return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T; }
function sameStoredValue(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
function errorMessage(error: unknown): string { return error instanceof Error && error.message ? error.message : "Please keep this tab open and try again."; }
function toError(reason: unknown, message: string): Error { return reason instanceof Error ? reason : new Error(message, { cause: reason }); }
