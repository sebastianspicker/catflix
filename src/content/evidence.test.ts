import { describe, expect, it } from "vitest";
import ledger from "../../docs/research/evidence-ledger.csv?raw";
import { evidenceMethodNote, evidenceThemes } from "./evidence";

const ledgerRows = new Map(ledger.trim().split("\n").slice(1).map((line) => {
  const fields = line.match(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g)?.map((field) => field.replace(/^,/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
  return [fields[0], fields] as const;
}));

describe("evidence themes", () => {
  it("contains the five curated topics with unique selected source IDs", () => {
    expect(evidenceThemes.map((theme) => theme.id)).toEqual(["vision", "motion", "sound", "sessions", "welfare"]);
    expect(new Set(evidenceThemes.map((theme) => theme.id)).size).toBe(evidenceThemes.length);
    expect(evidenceThemes.every((theme) => theme.sources.length > 0)).toBe(true);
    expect(evidenceThemes.every((theme) => theme.sources.length === 3)).toBe(true);
    expect(new Set(evidenceThemes.flatMap((theme) => theme.sources.map((source) => source.id))).size).toBe(14);
  });

  it("keeps every selected source traceable to the ledger and its DOI", () => {
    for (const source of evidenceThemes.flatMap((theme) => theme.sources)) {
      const row = ledgerRows.get(source.id);
      expect(row, `${source.id} must exist in the evidence ledger`).toBeDefined();
      const doi = row?.[13];
      expect(doi, `${source.id} must include a DOI in the evidence ledger`).toBeTruthy();
      expect(source.url).toBe(`https://doi.org/${doi}`);
    }
  });

  it("states the baseline method without turning attention into welfare", () => {
    expect(evidenceMethodNote).toContain("60 peer-reviewed sources");
    expect(evidenceMethodNote).toContain("one television-enrichment trial");
    expect(evidenceMethodNote).toContain("attention, not household preference or welfare");
  });
});
