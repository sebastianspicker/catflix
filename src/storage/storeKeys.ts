import type { StoreName } from "./IndexedDbBackend";

export function keyFor(store: StoreName, value: unknown): string {
  const record = recordFields(value);
  const specialKeys = new Map<StoreName, string>([["settings", "device"], ["progress", typeof record.sceneId === "string" ? record.sceneId : "unknown"]]);
  return specialKeys.get(store) ?? (typeof record.id === "string" ? record.id : typeof record.assetId === "string" ? record.assetId : crypto.randomUUID());
}

function recordFields(value: unknown): { id?: unknown; sceneId?: unknown; assetId?: unknown } {
  return typeof value === "object" && value !== null ? value as { id?: unknown; sceneId?: unknown; assetId?: unknown } : {};
}
