import type { LocalDataBackend, LocalDataTransaction } from "./indexedDb";
import { asRecord, cloneValue, hasOnlyKeys, isComparisonRecord, isRecordIdentifier, isRefereeNote, isSessionObservation } from "./records";
import type { ComparisonRecord, LocalRecordHistory, RecordDeletionTarget, RefereeNote, SessionObservation } from "./types";

type CuratedObservation = SessionObservation & {
  seed: number;
  encounterScore: string;
  comparisonDimension: "figureGround" | "motion";
};

export async function listRecordHistory(backend: LocalDataBackend): Promise<LocalRecordHistory> {
  const [notes, observations, comparisons] = await Promise.all([
    backend.values<RefereeNote>("notes"),
    backend.values<SessionObservation>("observations"),
    backend.values<ComparisonRecord>("comparisons"),
  ]);
  return recordHistory(notes, observations, comparisons);
}

export async function saveObservationWithComparison(backend: LocalDataBackend, observation: SessionObservation): Promise<LocalRecordHistory> {
  if (!isSessionObservation(observation)) throw new Error("Invalid session observation.");
  return backend.transact(["notes", "observations", "comparisons"], (transaction) => {
    const records = currentRecordValues(transaction);
    if (records.observations.some((stored) => stored.id === observation.id)) throw new Error("A session observation cannot overwrite an existing record.");
    const current = cloneValue(observation);
    const compatible = findOldestCompatibleIncompleteComparison(current, records.observations, records.comparisons);
    transaction.put("observations", current);
    return saveComparedObservation(transaction, records, current, compatible);
  });
}

export async function deleteRecord(backend: LocalDataBackend, target: RecordDeletionTarget): Promise<LocalRecordHistory> {
  if (!isRecordDeletionTarget(target)) throw new Error("Invalid local record deletion target.");
  return backend.transact(["notes", "observations", "comparisons"], (transaction) => {
    const records = currentRecordValues(transaction);
    if (target.kind === "comparison") return deleteComparison(transaction, records, target.id);
    return deleteLinkedRecord(transaction, records, target);
  });
}

export function sameVariant(left: SessionObservation["variant"], right: SessionObservation["variant"]): boolean {
  return left.figureGround === right.figureGround
    && left.motion === right.motion
    && left.sound === right.sound
    && left.novelty === right.novelty;
}

function currentRecordValues(transaction: LocalDataTransaction): LocalRecordHistory {
  return {
    notes: transaction.values<RefereeNote>("notes").filter(isRefereeNote),
    observations: transaction.values<SessionObservation>("observations").filter(isSessionObservation),
    comparisons: transaction.values<ComparisonRecord>("comparisons").filter(isComparisonRecord),
  };
}

function saveComparedObservation(transaction: LocalDataTransaction, records: LocalRecordHistory, observation: SessionObservation, compatible: ComparisonRecord | undefined): LocalRecordHistory {
  if (compatible) return completeComparison(transaction, records, observation, compatible);
  const incomplete = incompleteComparisonFor(observation);
  if (!incomplete) return recordHistory(records.notes, [...records.observations, observation], records.comparisons);
  transaction.put("comparisons", incomplete);
  return recordHistory(records.notes, [...records.observations, observation], [...records.comparisons, incomplete]);
}

function completeComparison(transaction: LocalDataTransaction, records: LocalRecordHistory, observation: SessionObservation, compatible: ComparisonRecord): LocalRecordHistory {
  const completed = attachObservation(compatible, observation);
  transaction.put("comparisons", completed);
  return recordHistory(records.notes, [...records.observations, observation], records.comparisons.map((comparison) => comparison.id === completed.id ? completed : comparison));
}

function deleteComparison(transaction: LocalDataTransaction, records: LocalRecordHistory, id: string): LocalRecordHistory {
  if (!records.comparisons.some((comparison) => comparison.id === id)) throw new Error("The local comparison to delete does not exist.");
  transaction.delete("comparisons", id);
  return recordHistory(records.notes, records.observations, records.comparisons.filter((comparison) => comparison.id !== id));
}

function deleteLinkedRecord(transaction: LocalDataTransaction, records: LocalRecordHistory, target: Exclude<RecordDeletionTarget, { kind: "comparison" }>): LocalRecordHistory {
  const collection = target.kind === "note" ? records.notes : records.observations;
  if (!collection.some((record) => record.id === target.id)) throw new Error(`The local ${target.kind} to delete does not exist.`);
  const comparisons = records.comparisons.map((comparison) => unlinkRecord(comparison, target.id));
  transaction.delete(target.kind === "note" ? "notes" : "observations", target.id);
  comparisons.forEach((comparison, index) => {
    if (comparison !== records.comparisons[index]) transaction.put("comparisons", comparison);
  });
  return target.kind === "note"
    ? recordHistory(records.notes.filter((note) => note.id !== target.id), records.observations, comparisons)
    : recordHistory(records.notes, records.observations.filter((observation) => observation.id !== target.id), comparisons);
}

function recordHistory(notes: readonly RefereeNote[], observations: readonly SessionObservation[], comparisons: readonly ComparisonRecord[]): LocalRecordHistory {
  return { notes: notes.map(cloneValue), observations: observations.map(cloneValue), comparisons: comparisons.map(cloneValue) };
}

function findOldestCompatibleIncompleteComparison(current: SessionObservation, observations: readonly SessionObservation[], comparisons: readonly ComparisonRecord[]): ComparisonRecord | undefined {
  if (!isEligibleCuratedObservation(current)) return undefined;
  const observationsById = new Map(observations.map((observation) => [observation.id, observation]));
  return comparisons
    .filter((comparison) => isCompatibleIncompleteComparison(comparison, current, observationsById))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))[0];
}

function isCompatibleIncompleteComparison(comparison: ComparisonRecord, current: CuratedObservation, observations: ReadonlyMap<string, SessionObservation>): boolean {
  if (!isCurrentComparison(comparison)) return false;
  const sides = compatibleComparisonSides(comparison, current);
  return sides !== undefined
    && sides.target.observationId === undefined
    && sides.linked.observationId !== undefined
    && hasCurrentCuratedObservation(observations.get(sides.linked.observationId), comparison.changedDimension, sides.linked);
}

function compatibleComparisonSides(comparison: ComparisonRecord & { changedDimension: "figureGround" | "motion" }, current: CuratedObservation): { target: ComparisonRecord["first"]; linked: ComparisonRecord["first"] } | undefined {
  if (comparison.changedDimension !== current.comparisonDimension) return undefined;
  const expected = canonicalVariants(current.comparisonDimension);
  if (!expected || !sameComparisonContext(comparison, current)) return undefined;
  return [
    { variant: expected.first, target: comparison.first, linked: comparison.second },
    { variant: expected.second, target: comparison.second, linked: comparison.first },
  ].find(({ variant }) => sameVariant(current.variant, variant));
}

function incompleteComparisonFor(observation: SessionObservation): ComparisonRecord | undefined {
  if (!isEligibleCuratedObservation(observation)) return undefined;
  const variants = canonicalVariants(observation.comparisonDimension);
  if (!variants) return undefined;
  const first = comparisonRunFor(observation, variants.first);
  const second = comparisonRunFor(observation, variants.second);
  if (sameVariant(observation.variant, variants.first)) first.observationId = observation.id;
  else if (sameVariant(observation.variant, variants.second)) second.observationId = observation.id;
  else return undefined;
  return { id: crypto.randomUUID(), createdAt: observation.confirmedAt, first, second, changedDimension: observation.comparisonDimension, observation: "Two separate manual runs share one scene, content revision, seed, and encounter score. No result is inferred." };
}

function attachObservation(comparison: ComparisonRecord, observation: SessionObservation): ComparisonRecord {
  const updated = cloneValue(comparison);
  if (sameVariant(observation.variant, updated.first.variant) && updated.first.observationId === undefined) updated.first.observationId = observation.id;
  else if (sameVariant(observation.variant, updated.second.variant) && updated.second.observationId === undefined) updated.second.observationId = observation.id;
  else throw new Error("A comparison side cannot be overwritten.");
  return updated;
}

function isEligibleCuratedObservation(observation: SessionObservation): observation is CuratedObservation {
  return observation.seed !== undefined && observation.encounterScore !== undefined && observation.comparisonDimension !== undefined;
}

function hasCurrentCuratedObservation(observation: SessionObservation | undefined, dimension: "figureGround" | "motion", run: ComparisonRecord["first"]): boolean {
  return observation !== undefined
    && isEligibleCuratedObservation(observation)
    && observation.comparisonDimension === dimension
    && observation.sceneId === run.sceneId
    && observation.contentRevision === run.contentRevision
    && observation.seed === run.seed
    && observation.encounterScore === run.encounterScore
    && sameVariant(observation.variant, run.variant);
}

function isCurrentComparison(comparison: ComparisonRecord): comparison is ComparisonRecord & { changedDimension: "figureGround" | "motion" } {
  return comparison.changedDimension === "figureGround" || comparison.changedDimension === "motion";
}

function sameComparisonContext(comparison: ComparisonRecord, observation: CuratedObservation): boolean {
  return comparison.first.sceneId === observation.sceneId
    && comparison.second.sceneId === observation.sceneId
    && comparison.first.contentRevision === observation.contentRevision
    && comparison.second.contentRevision === observation.contentRevision
    && comparison.first.seed === observation.seed
    && comparison.second.seed === observation.seed
    && comparison.first.encounterScore === observation.encounterScore
    && comparison.second.encounterScore === observation.encounterScore;
}

function canonicalVariants(dimension: "figureGround" | "motion" | undefined): { first: SessionObservation["variant"]; second: SessionObservation["variant"] } | undefined {
  const first = { figureGround: "natural", motion: "continuous", sound: "off", novelty: "familiar" } as const;
  if (dimension === "figureGround") return { first, second: { ...first, figureGround: "enhanced" } };
  if (dimension === "motion") return { first, second: { ...first, motion: "intermittent" } };
  return undefined;
}

function comparisonRunFor(observation: CuratedObservation, variant: SessionObservation["variant"]): ComparisonRecord["first"] {
  return { sceneId: observation.sceneId, contentRevision: observation.contentRevision, variant: cloneValue(variant), seed: observation.seed, encounterScore: observation.encounterScore };
}

function unlinkRecord(comparison: ComparisonRecord, recordId: string): ComparisonRecord {
  const first = unlinkRun(comparison.first, recordId);
  const second = unlinkRun(comparison.second, recordId);
  return first === comparison.first && second === comparison.second ? comparison : { ...comparison, first, second };
}

function unlinkRun(run: ComparisonRecord["first"], recordId: string): ComparisonRecord["first"] {
  if (run.observationId !== recordId) return run;
  const unlinked = { ...run };
  Reflect.deleteProperty(unlinked, "observationId");
  return unlinked;
}

function isRecordDeletionTarget(value: unknown): value is RecordDeletionTarget {
  const target = asRecord(value);
  return target !== undefined
    && hasOnlyKeys(target, ["kind", "id"])
    && (target.kind === "note" || target.kind === "observation" || target.kind === "comparison")
    && isRecordIdentifier(target.id);
}
