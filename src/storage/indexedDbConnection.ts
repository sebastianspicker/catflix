import { storeNames } from "./IndexedDbBackend";

export function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const request = indexedDB.open("catflix-local", 2);
    request.onupgradeneeded = () => createMissingStores(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
}

function createMissingStores(database: IDBDatabase): void {
  storeNames.filter((name) => !database.objectStoreNames.contains(name)).forEach((name) => database.createObjectStore(name));
}
