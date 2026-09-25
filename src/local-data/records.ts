import { isAssetProvenance } from "../catalogue/model/validation";
import { sceneIds } from "../domain";
import type { VariantSelection } from "../domain";
import type { ComparisonRecord, DeviceSettings, ProgressRecord, QueueItem, RefereeNote, SessionObservation, StoredProvenance } from "./types";

const defaultSettings: DeviceSettings = { soundEnabled: false, reducedMotion: false, sceneMotionMode: "standard" };
const cats = ["Arri", "Ozzy", "Mika"] as const;
const observationBehaviors = ["approach", "orientation", "tracking", "pouncing", "disengagement", "re-engagement", "post-session behavior"] as const;
const comparisonDimensions = ["figureGround", "motion", "sound", "novelty"] as const;
const provenanceKeys = ["assetId", "creator", "source", "license", "derivativeHistory", "checksum", "masteringFormat", "contentRevision", "savedAt"] as const;
const refereeNoteKeys = ["id", "cat", "sceneId", "contentRevision", "createdAt", "rawNote", "vocabulary", "touchTimestamps"] as const;

export function normalizeSettings(value: unknown): DeviceSettings {
  const settings = asRecord(value) ?? {};
  return {
    soundEnabled: typeof settings.soundEnabled === "boolean" ? settings.soundEnabled : defaultSettings.soundEnabled,
    reducedMotion: typeof settings.reducedMotion === "boolean" ? settings.reducedMotion : defaultSettings.reducedMotion,
    sceneMotionMode: settings.sceneMotionMode === "low" ? "low" : "standard",
    ...(isTimestamp(settings.safetyAcknowledgedAt) ? { safetyAcknowledgedAt: settings.safetyAcknowledgedAt } : {}),
  };
}

export function isDeviceSettings(value: unknown): value is DeviceSettings {
  const settings = asRecord(value);
  return settings !== undefined
    && hasOnlyKeys(settings, ["soundEnabled", "reducedMotion", "sceneMotionMode", "safetyAcknowledgedAt"])
    && typeof settings.soundEnabled === "boolean"
    && typeof settings.reducedMotion === "boolean"
    && isOneOf(settings.sceneMotionMode, ["standard", "low"])
    && optional(settings, "safetyAcknowledgedAt", isTimestamp);
}

export function isLegacyDeviceSettings(value: unknown): boolean {
  const settings = asRecord(value);
  return settings !== undefined
    && hasOnlyKeys(settings, ["soundEnabled", "reducedMotion", "safetyAcknowledgedAt"])
    && typeof settings.soundEnabled === "boolean"
    && typeof settings.reducedMotion === "boolean"
    && optional(settings, "safetyAcknowledgedAt", isTimestamp);
}

export function createMatchedComparison(comparison: ComparisonRecord): ComparisonRecord {
  const record = asRecord(comparison);
  if (record === undefined || !hasValidComparisonFields(record)) throw new Error("Invalid comparison record.");
  if (!hasMatchingComparisonContext(comparison)) throw new Error("A matched comparison must share one scene, seed, and encounter score, plus content revision.");
  const differences = changedVariantDimensions(comparison);
  if (differences.length !== 1 || differences[0] !== comparison.changedDimension) throw new Error("A matched comparison must change exactly one declared dimension.");
  return cloneValue(comparison);
}

export function isQueueItem(value: unknown): value is QueueItem {
  const record = asRecord(value);
  return record !== undefined
    && hasOnlyKeys(record, ["id", "sceneId", "variant", "addedAt"])
    && isIdentifier(record.id)
    && isSceneId(record.sceneId)
    && isVariant(record.variant)
    && isTimestamp(record.addedAt);
}

export function isProgressRecord(value: unknown): value is ProgressRecord {
  const record = asRecord(value);
  return record !== undefined
    && hasOnlyKeys(record, ["sceneId", "revision", "elapsedMs", "durationMs", "updatedAt"])
    && isSceneId(record.sceneId)
    && isRevision(record.revision)
    && isNumberAtLeast(record.elapsedMs, 0)
    && isNumberAtLeast(record.durationMs, Number.EPSILON)
    && record.elapsedMs <= record.durationMs
    && isTimestamp(record.updatedAt);
}

export function isRefereeNote(value: unknown): value is RefereeNote {
  const record = recordWithOnlyKeys(value, refereeNoteKeys);
  return record !== undefined && hasValidRefereeNoteFields(record);
}

export function isSessionObservation(value: unknown): value is SessionObservation {
  const record = asRecord(value);
  return record !== undefined
    && hasOnlyKeys(record, sessionObservationKeys)
    && hasValidObservationIdentity(record)
    && hasValidObservationSession(record)
    && hasValidObservationNotes(record);
}

export function isComparisonRecord(value: unknown): value is ComparisonRecord {
  const record = asRecord(value);
  if (record === undefined || !hasValidComparisonFields(record)) return false;
  try { createMatchedComparison(record as unknown as ComparisonRecord); return true; } catch { return false; }
}

export function isStoredProvenance(value: unknown): value is StoredProvenance {
  const record = recordWithOnlyKeys(value, provenanceKeys);
  return record !== undefined && hasValidStoredProvenanceFields(record);
}

export function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;
}

function changedVariantDimensions(comparison: ComparisonRecord): (keyof VariantSelection)[] {
  const { first, second } = comparison;
  return [
    first.variant.figureGround !== second.variant.figureGround ? "figureGround" : undefined,
    first.variant.motion !== second.variant.motion ? "motion" : undefined,
    first.variant.sound !== second.variant.sound ? "sound" : undefined,
    first.variant.novelty !== second.variant.novelty ? "novelty" : undefined,
  ].filter((key): key is keyof VariantSelection => key !== undefined);
}

function hasMatchingComparisonContext(comparison: ComparisonRecord): boolean {
  return [
    comparison.first.sceneId === comparison.second.sceneId,
    comparison.first.contentRevision === comparison.second.contentRevision,
    comparison.first.seed === comparison.second.seed,
    comparison.first.encounterScore === comparison.second.encounterScore,
  ].every(Boolean);
}

function hasValidRefereeNoteFields(record: Record<string, unknown>): boolean {
  return [
    isIdentifier(record.id),
    isOneOf(record.cat, cats),
    isSceneId(record.sceneId),
    isRevision(record.contentRevision),
    isTimestamp(record.createdAt),
    isObservationText(record.rawNote),
    isVocabulary(record.vocabulary),
    optional(record, "touchTimestamps", isContactTimestampList),
  ].every(Boolean);
}

function hasValidStoredProvenanceFields(record: Record<string, unknown>): boolean {
  return [
    isAssetProvenance(record),
    isIdentifier(record.assetId),
    isRevision(record.contentRevision),
    [record.creator, record.source, record.license].every(isProvenanceNarrative),
    Array.isArray(record.derivativeHistory),
    Array.isArray(record.derivativeHistory) && record.derivativeHistory.every(isProvenanceNarrative),
    isTimestamp(record.savedAt),
  ].every(Boolean);
}

function isSceneId(value: unknown): boolean { return sceneIds.includes(value as typeof sceneIds[number]); }
function isVariant(value: unknown): boolean {
  const record = asRecord(value);
  return record !== undefined
    && hasOnlyKeys(record, ["figureGround", "motion", "sound", "novelty"])
    && isOneOf(record.figureGround, ["natural", "enhanced"])
    && isOneOf(record.motion, ["continuous", "intermittent"])
    && isOneOf(record.sound, ["off", "on"])
    && isOneOf(record.novelty, ["familiar", "alternate"]);
}
function isComparisonRun(value: unknown): boolean {
  const run = asRecord(value);
  return run !== undefined
    && hasOnlyKeys(run, ["sceneId", "contentRevision", "variant", "seed", "encounterScore", "observationId"])
    && isSceneId(run.sceneId)
    && optional(run, "contentRevision", isRevision)
    && isVariant(run.variant)
    && optional(run, ("seed"), isNonNegativeSafeInteger)
    && optional(run, "encounterScore", isBoundedText)
    && optional(run, "observationId", isIdentifier);
}
const sessionObservationKeys = ["schemaVersion", "id", "sceneId", "contentRevision", "variant", "seed", "encounterScore", "comparisonDimension", "playbackMode", "viewingDistanceBand", "roomLightBand", "soundEnabled", "observedCat", "elapsedMs", "endReason", "acceptedContactTimestamps", "vocabulary", "safetyEvent", "physicalPlayHandoff", "rawNote", "confirmedAt"] as const;
function hasValidObservationIdentity(record: Record<string, unknown>): boolean {
  return record.schemaVersion === 2
    && isIdentifier(record.id)
    && isSceneId(record.sceneId)
    && isRevision(record.contentRevision)
    && isVariant(record.variant)
    && optional(record, "seed", isNonNegativeSafeInteger)
    && optional(record, "encounterScore", isBoundedText)
    && optional(record, "comparisonDimension", isOneOfCurrentComparisonDimension);
}
function hasValidObservationSession(record: Record<string, unknown>): boolean {
  return isOneOf(record.playbackMode, ["tablet-touch", "tv-passive"])
    && isOneOf(record.viewingDistanceBand, ["near-screen", "room-display"])
    && isOneOf(record.roomLightBand, ["dim", "moderate", "bright"])
    && typeof record.soundEnabled === "boolean"
    && optional(record, "observedCat", (cat) => isOneOf(cat, cats))
    && isNumberAtLeast(record.elapsedMs, 0)
    && isOneOf(record.endReason, ["completed", "owner-ended", "cat-left", "safety-stop"])
    && hasValidContactTimestamps(record);
}
function hasValidContactTimestamps(record: Record<string, unknown>): boolean {
  const elapsedMs = record.elapsedMs;
  return isNumberAtLeast(elapsedMs, 0)
    && isContactTimestampList(record.acceptedContactTimestamps)
    && record.acceptedContactTimestamps.every((timestamp) => timestamp <= elapsedMs);
}
function hasValidObservationNotes(record: Record<string, unknown>): boolean {
  return isVocabulary(record.vocabulary)
    && optional(record, "safetyEvent", isObservationText)
    && isOneOf(record.physicalPlayHandoff, ["not-recorded", "offered", "ignored", "voluntarily-joined"])
    && isObservationText(record.rawNote)
    && isTimestamp(record.confirmedAt);
}
function hasValidComparisonFields(record: Record<string, unknown>): boolean {
  return hasOnlyKeys(record, ["id", "createdAt", "first", "second", "changedDimension", "observation"])
    && isIdentifier(record.id)
    && isTimestamp(record.createdAt)
    && isComparisonRun(record.first)
    && isComparisonRun(record.second)
    && isOneOf(record.changedDimension, comparisonDimensions)
    && optional(record, "observation", isObservationText);
}
function isVocabulary(value: unknown): boolean { return Array.isArray(value) && value.every((item) => isOneOf(item, observationBehaviors)) && new Set(value).size === value.length; }
function isContactTimestampList(value: unknown): value is readonly number[] { return Array.isArray(value) && value.length <= 10_000 && value.every((timestamp) => isNumberAtLeast(timestamp, 0)) && value.every((timestamp, index, values) => index === 0 || values[index - 1] <= timestamp); }
export function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = timestampParts(value);
  if (!parts) return false;
  const timestamp = new Date(value);
  return hasMatchingTimestampParts(timestamp, parts);
}
function timestampParts(value: string): readonly [number, number, number, number, number, number] | undefined {
  const dateTime = timestampDateTime(value);
  if (!dateTime) return undefined;
  const [date, time] = dateTime;
  const dateParts = date.split("-");
  const timeParts = time.slice(0, -1).split(":");
  if (dateParts.length !== 3 || timeParts.length !== 3) return undefined;
  const [year, month, day] = dateParts;
  const [hour, minute, secondFraction] = timeParts;
  const secondParts = secondFraction.split(".");
  if (secondParts.length > 2) return undefined;
  const [second] = secondParts;
  const fraction: string | undefined = secondParts.length === 2 ? secondParts[1] : undefined;
  if (!hasValidTimestampComponents([[year, 4, 4], [month, 2, 2], [day, 2, 2], [hour, 2, 2], [minute, 2, 2], [second, 2, 2], [fraction, 1, 3]])) return undefined;
  return [Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second)];
}
function timestampDateTime(value: string): readonly [string, string] | undefined {
  const sections = value.split("T");
  if (sections.length !== 2 || !sections[0] || !sections[1]?.endsWith("Z")) return undefined;
  return [sections[0], sections[1]];
}
function hasMatchingTimestampParts(timestamp: Date, parts: readonly [number, number, number, number, number, number]): boolean {
  return [
    Number.isFinite(timestamp.getTime()),
    timestamp.getUTCFullYear() === parts[0],
    timestamp.getUTCMonth() + 1 === parts[1],
    timestamp.getUTCDate() === parts[2],
    timestamp.getUTCHours() === parts[3],
    timestamp.getUTCMinutes() === parts[4],
    timestamp.getUTCSeconds() === parts[5],
  ].every(Boolean);
}
function hasValidTimestampComponents(components: readonly (readonly [string | undefined, number, number])[]): boolean {
  return components.every(([value, minimum, maximum], index) => index === components.length - 1
    ? value === undefined || hasDigits(value, minimum, maximum)
    : hasDigits(value, minimum, maximum));
}
function hasDigits(value: string | undefined, minimum: number, maximum: number): value is string {
  return value !== undefined
    && value.length >= minimum
    && value.length <= maximum
    && [...value].every((character) => character >= "0" && character <= "9");
}
export function isRecordIdentifier(value: unknown): value is string { return typeof value === "string" && value.length <= 256 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value); }
function isIdentifier(value: unknown): value is string { return isRecordIdentifier(value); }
function isText(value: unknown): value is string { return typeof value === "string" && value.trim() !== ""; }
function isBoundedText(value: unknown): value is string { return isText(value) && value.length <= 256; }
function isRevision(value: unknown): value is string { return isBoundedText(value); }
function isObservationText(value: unknown): value is string { return typeof value === "string" && value.length <= 20_000; }
function isProvenanceNarrative(value: unknown): value is string { return isText(value) && value.length <= 4_096; }
function isNumberAtLeast(value: unknown, minimum: number): value is number { return typeof value === "number" && Number.isFinite(value) && value >= minimum; }
function isNonNegativeSafeInteger(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function isOneOf(value: unknown, options: readonly unknown[]): boolean { return typeof value === "string" && options.includes(value); }
function isOneOfCurrentComparisonDimension(value: unknown): boolean { return value === "figureGround" || value === "motion"; }
function optional(record: Record<string, unknown>, key: string, validator: (value: unknown) => boolean): boolean {
  const property = Object.getOwnPropertyDescriptor(record, key);
  return property === undefined || validator(property.value);
}
function recordWithOnlyKeys(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  const record = asRecord(value);
  return record !== undefined && hasOnlyKeys(record, keys) ? record : undefined;
}
export function hasOnlyKeys(record: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(record).every((key) => keys.includes(key)); }
export function asRecord(value: unknown): Record<string, unknown> | undefined { return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined; }
