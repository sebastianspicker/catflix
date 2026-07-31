import { isAssetProvenance } from "../content/manifestAssetValidation";
import { sceneIds } from "../content/types";
import { anything, arrayOf, fields, matches, number, oneOf, optional, string } from "../validation/descriptors";
import { createMatchedComparison } from "./recordValidation";
import type { ComparisonRecord, ProgressRecord, QueueItem, RefereeNote, SessionObservation, StoredProvenance } from "./types";

const sceneId = oneOf(...sceneIds);
const variant = fields({ figureGround: oneOf("natural", "enhanced"), motion: oneOf("continuous", "intermittent"), sound: oneOf("off", "on"), novelty: oneOf("familiar", "alternate") });
const queueItem = fields({ id: string(), sceneId, variant, addedAt: string() });
const progress = fields({ sceneId, revision: string(), elapsedMs: number(0), durationMs: number(0.0000001), updatedAt: string() });
const note = fields({ id: string(), cat: oneOf("Arri", "Ozzy", "Mika"), sceneId, rawNote: string(), vocabulary: arrayOf(anything()) });
const observation = fields({ schemaVersion: oneOf(2), id: string(), sceneId, contentRevision: string(), variant, playbackMode: oneOf("tablet-touch", "tv-passive"), viewingDistanceBand: oneOf("near-screen", "room-display"), roomLightBand: oneOf("dim", "moderate", "bright"), soundEnabled: oneOf(true, false), observedCat: optional(oneOf("Arri", "Ozzy", "Mika")), elapsedMs: number(0), endReason: oneOf("completed", "owner-ended", "cat-left", "safety-stop"), acceptedContactTimestamps: arrayOf(number()), vocabulary: arrayOf(anything()), physicalPlayHandoff: oneOf("not-recorded", "offered", "ignored", "voluntarily-joined"), rawNote: string(), confirmedAt: string() });

export function isQueueItem(value: unknown): value is QueueItem { return matches(value, queueItem); }
export function isProgressRecord(value: unknown): value is ProgressRecord { return matches(value, progress) && isObject(value) && (value.elapsedMs as number) <= (value.durationMs as number); }
export function isRefereeNote(value: unknown): value is RefereeNote { return matches(value, note); }
export function isSessionObservation(value: unknown): value is SessionObservation { return matches(value, observation); }
export function isComparisonRecord(value: unknown): value is ComparisonRecord { try { createMatchedComparison(value as ComparisonRecord); return true; } catch { return false; } }
export function isStoredProvenance(value: unknown): value is StoredProvenance { return isObject(value) && isAssetProvenance(value) && typeof value.savedAt === "string" && value.savedAt !== ""; }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
