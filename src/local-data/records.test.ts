import { describe, expect, it } from "vitest";
import { createMatchedComparison, isRecordIdentifier, isSessionObservation } from "./records";

const timestamp = "2026-07-29T12:00:00.000Z";
const variant = { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" } as const;

describe("local record validators", () => {
  it("accepts legacy observations without pairing context and current observations with it", () => {
    const observation = {
      schemaVersion: 2 as const, id: "observation", sceneId: "paper-moth" as const, contentRevision: "2026.07.29", variant,
      playbackMode: "tablet-touch" as const, viewingDistanceBand: "near-screen" as const, roomLightBand: "moderate" as const,
      soundEnabled: false, elapsedMs: 1, endReason: "completed" as const, acceptedContactTimestamps: [], vocabulary: [],
      physicalPlayHandoff: "not-recorded" as const, rawNote: "", confirmedAt: timestamp,
    };
    expect(isSessionObservation(observation)).toBe(true);
    expect(isSessionObservation({ ...observation, seed: 3, encounterScore: "authored-score" })).toBe(true);
  });

  it("bounds identifiers and observation text without changing timestamp or variant contracts", () => {
    expect(isRecordIdentifier("a".repeat(256))).toBe(true);
    expect(isRecordIdentifier("a".repeat(257))).toBe(false);
    const observation = {
      schemaVersion: 2 as const, id: "observation", sceneId: "paper-moth" as const, contentRevision: "2026.07.29", variant,
      playbackMode: "tablet-touch" as const, viewingDistanceBand: "near-screen" as const, roomLightBand: "moderate" as const,
      soundEnabled: false, elapsedMs: 1, endReason: "completed" as const, acceptedContactTimestamps: [], vocabulary: [],
      physicalPlayHandoff: "not-recorded" as const, rawNote: "x".repeat(20_001), confirmedAt: timestamp,
    };
    expect(isSessionObservation(observation)).toBe(false);
  });

  it("requires matching optional content revisions when comparisons carry them", () => {
    const comparison = {
      id: "comparison", createdAt: timestamp,
      first: { sceneId: "paper-moth" as const, contentRevision: "2026.07.29", variant, seed: 1, encounterScore: "score" },
      second: { sceneId: "paper-moth" as const, contentRevision: "2026.07.29", variant: { ...variant, figureGround: "enhanced" as const }, seed: 1, encounterScore: "score" },
      changedDimension: "figureGround" as const,
    };
    expect(createMatchedComparison(comparison)).toEqual(comparison);
    expect(() => createMatchedComparison({ ...comparison, second: { ...comparison.second, contentRevision: "other" } })).toThrow("content revision");
  });
});
