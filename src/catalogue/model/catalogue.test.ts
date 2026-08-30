// Vitest executes this contract check in Node; production code remains browser-only.
// @ts-ignore Node built-ins are intentionally outside the browser application tsconfig.
import { createHash } from "node:crypto";
// @ts-ignore Node built-ins are intentionally outside the browser application tsconfig.
import { readFileSync } from "node:fs";
// @ts-ignore Node built-ins are intentionally outside the browser application tsconfig.
import { dirname, resolve } from "node:path";
// @ts-ignore Node built-ins are intentionally outside the browser application tsconfig.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sceneIds, type SceneId } from "../../domain";
import { getContentManifest, getSceneScore, listContentManifests } from "./catalogue";
import { validateContentManifest } from "./validation";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("authored catalogue contracts", () => {
  it("publishes the five deliberate scene identifiers in their curated order", () => {
    expect(sceneIds).toEqual([
      "balcony-birds",
      "koi-pool",
      "paper-moth",
      "beetle-under-the-fern",
      "red-string",
    ]);
    expect(listContentManifests().map((manifest) => manifest.id)).toEqual(sceneIds);
  });

  it("validates every compiled manifest and rejects a malformed one", () => {
    for (const manifest of listContentManifests()) {
      expect(validateContentManifest(manifest)).toMatchObject({ ok: true });
    }
    const malformed = { ...getContentManifest("paper-moth"), finiteDurationMs: 0, assets: [] };
    expect(validateContentManifest(malformed)).toMatchObject({ ok: false });
  });

  it("keeps compiled runtime, visual provenance, and audio metadata derived from one authored scene", () => {
    for (const manifest of listContentManifests()) {
      const score = getSceneScore(manifest.id);
      const visualSources = [manifest.posterUrl, manifest.visuals.backgroundPlateUrl, manifest.visuals.subjectPoseSheetUrl, manifest.visuals.ropeTextureUrl].filter((source): source is string => source !== undefined);
      expect(score.durationMs).toBe(manifest.finiteDurationMs);
      expect(score.audioEventKinds).toEqual(manifest.audio?.eventKinds ?? []);
      expect(manifest.assets.map((asset) => asset.source)).toEqual(expect.arrayContaining(visualSources));
    }
  });

  it("matches every authored provenance checksum to its shipped public asset", () => {
    for (const manifest of listContentManifests()) {
      for (const asset of manifest.assets) {
        const bytes = readFileSync(resolve(repositoryRoot, "public", asset.source.slice(1)));
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.checksum);
      }
    }
  });

  it("rejects unknown scene lookups rather than creating a fallback scene", () => {
    expect(() => getContentManifest("not-a-scene" as SceneId)).toThrow("Unknown content manifest not-a-scene.");
  });
});
