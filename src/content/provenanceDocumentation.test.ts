/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { listContentManifests } from "./registry";

const noticeUrl = new URL("../../NOTICE.md", import.meta.url);
const provenanceUrl = new URL("../../assets/masters/PROVENANCE.md", import.meta.url);

describe("public visual provenance documentation", () => {
  it("keeps the rights boundary and local provenance link explicit", async () => {
    const notice = await readFile(noticeUrl, "utf8");

    expect(notice).toContain("[MIT License](LICENSE)");
    expect(notice).toContain("assets/masters/PROVENANCE.md");
    expect(notice).toContain("https://openai.com/policies/terms-of-use/");
    expect(notice).toContain("does not grant rights in the bundled visual assets");
    expect(notice).toContain("does not establish that redistribution");
  });

  it("records every runtime asset without publishing source prompts", async () => {
    const provenance = await readFile(provenanceUrl, "utf8");

    for (const manifest of listContentManifests()) {
      for (const asset of manifest.assets) {
        expect(provenance).toContain(asset.assetId);
        expect(provenance).toContain(asset.source);
        expect(provenance).toContain(asset.checksum);
      }
    }

    expect(provenance).toContain("Model: not recorded.");
    expect(provenance).toContain("https://openai.com/policies/terms-of-use/");
    expect(provenance).not.toMatch(/^(Use case|Asset type|Primary request|Scene\/backdrop|Style\/medium|Composition\/framing|Lighting\/mood|Color palette|Constraints|Avoid):/m);
    expect(provenance).not.toContain("```");
  });
});
