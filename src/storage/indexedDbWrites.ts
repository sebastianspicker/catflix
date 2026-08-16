import type { StoreName, StoreReplacement } from "./IndexedDbBackend";
import { clone } from "./indexedDbReads";

const writeCallbackError = (reason: unknown): Error =>
  reason instanceof Error
    ? reason
    : new Error("IndexedDB write callback failed.", { cause: reason });

export async function putValue(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, keyFor: (store: StoreName, value: unknown) => string, store: StoreName, value: unknown): Promise<void> {
  const key = keyFor(store, value); const database = await open();
  if (!database) { memory.get(store)?.set(key, clone(value)); return; }
  const transaction = database.transaction(store, "readwrite");
  await transactionDone(transaction, () => transaction.objectStore(store).put(clone(value), key));
}

export async function replaceValues(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, keyFor: (store: StoreName, value: unknown) => string, store: StoreName, values: readonly unknown[]): Promise<void> {
  const database = await open();
  if (!database) { replaceMemory(memory.get(store), values, keyFor, store); return; }
  const transaction = database.transaction(store, "readwrite");
  await transactionDone(transaction, () => { replaceObjectStore(transaction.objectStore(store), values, keyFor, store); });
}

export async function replaceAllValues(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, keyFor: (store: StoreName, value: unknown) => string, replacements: readonly StoreReplacement[]): Promise<void> {
  const database = await open();
  if (!database) {
    const staged = new Map(replacements.map(({ store, values }) => [store, replacementMap(values, keyFor, store)]));
    staged.forEach((values, store) => memory.set(store, values));
    return;
  }
  const transaction = database.transaction(replacements.map(({ store }) => store), "readwrite");
  await transactionDone(transaction, () => {
    replacements.forEach(({ store, values }) => { replaceObjectStore(transaction.objectStore(store), values, keyFor, store); });
  });
}

function replaceMemory(target: Map<string, unknown> | undefined, values: readonly unknown[], keyFor: (store: StoreName, value: unknown) => string, store: StoreName): void { target?.clear(); values.forEach((value) => target?.set(keyFor(store, value), clone(value))); }
function replacementMap(values: readonly unknown[], keyFor: (store: StoreName, value: unknown) => string, store: StoreName): Map<string, unknown> {
  const replacement = new Map<string, unknown>();
  values.forEach((value) => replacement.set(keyFor(store, value), clone(value)));
  return replacement;
}
function replaceObjectStore(store: IDBObjectStore, values: readonly unknown[], keyFor: (store: StoreName, value: unknown) => string, name: StoreName): void { store.clear(); values.forEach((value) => store.put(clone(value), keyFor(name, value))); }
function transactionDone(transaction: IDBTransaction, write: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { resolve(); };
    transaction.onerror = () => { reject(transaction.error ?? new Error("IndexedDB transaction failed.")); };
    transaction.onabort = () => { reject(transaction.error ?? new Error("IndexedDB transaction aborted.")); };
    try { write(); } catch (reason) { const error = writeCallbackError(reason); transaction.abort(); reject(error); }
  });
}
