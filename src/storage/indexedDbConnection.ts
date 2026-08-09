import { storeNames } from "./IndexedDbBackend";

export interface DatabaseConnection { database?: IDBDatabase; fallbackMessage?: string; }
export type DatabaseOpener = () => Promise<DatabaseConnection>;

export function openDatabase(): Promise<DatabaseConnection> {
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

function createMissingStores(database: IDBDatabase): void {
  storeNames.filter((name) => !database.objectStoreNames.contains(name)).forEach((name) => database.createObjectStore(name));
}
