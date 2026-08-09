import { describe, expect, it } from "vitest";
import { getContentManifest } from "./registry";
import { sceneIds, validateContentManifest, type ContentManifest, type VariantSelection } from "./types";

describe("content type facade", () => {
  it("keeps scene, manifest, variant, and validation exports aligned", () => {
    const manifest: ContentManifest = getContentManifest(sceneIds[0]);
    const variant: VariantSelection = { figureGround: "natural", motion: "intermittent", sound: "off", novelty: "familiar" };

    expect(validateContentManifest(manifest)).toEqual({ ok: true, value: manifest });
    expect(variant).toEqual({ figureGround: "natural", motion: "intermittent", sound: "off", novelty: "familiar" });
  });
});
