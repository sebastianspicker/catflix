import type { StoreName } from "./IndexedDbBackend";

export async function getValue<T>(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, store: StoreName, key: string): Promise<T | undefined> {
  const database = await open();
  if (!database) return clone(memory.get(store)?.get(key) as T | undefined);
  try { return await requestValue<T | undefined>(database.transaction(store, "readonly").objectStore(store).get(key)); } catch { return undefined; }
}

export async function listValues<T>(open: () => Promise<IDBDatabase | undefined>, memory: Map<StoreName, Map<string, unknown>>, store: StoreName): Promise<T[]> {
  const database = await open();
  if (!database) return [...(memory.get(store)?.values() ?? [])].map((item) => clone(item as T));
  try { return await requestValue<T[]>(database.transaction(store, "readonly").objectStore(store).getAll()); } catch { return []; }
}

export function clone<T>(value: T): T { return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T; }
function requestValue<T>(request: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed.")); }); }
