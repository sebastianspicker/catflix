import type { ContentManifest } from '../catalogue/model';
import { defaultSessionVariant, type SceneId, type VariantSelection } from '../domain';
import type { ComparisonDimension, SessionPlan } from '../encounter/session';
import type { ComparisonRecord, ObservationDraft, QueueItem, SessionObservation } from '../local-data/types';

const baselineVariant: VariantSelection = { figureGround: 'natural', motion: 'continuous', sound: 'off', novelty: 'familiar' };

export interface PendingSession {
  manifest: ContentManifest;
  variant: VariantSelection;
  seed: number;
  comparison?: { dimension: ComparisonDimension; label: string };
}

export type CompletedSession = {
  plan: SessionPlan;
  elapsedMs: number;
  complete: boolean;
  touches: number[];
  soundEnabled: boolean;
  physicalPlaySuggested?: boolean;
};

export type SessionResult = {
  elapsedMs: number;
  complete: boolean;
  touchTimestamps: number[];
  soundEnabled: boolean;
  physicalPlaySuggested?: boolean;
};

export function sessionUpdate(plan: SessionPlan | null, result: SessionResult): { progress: number; completed: CompletedSession } | null {
  if (!plan) return null;
  const progress = result.complete ? 1 : result.elapsedMs / plan.manifest.finiteDurationMs;
  return { progress, completed: { plan, elapsedMs: result.elapsedMs, complete: result.complete, touches: result.touchTimestamps, soundEnabled: result.soundEnabled, ...(result.physicalPlaySuggested ? { physicalPlaySuggested: true } : {}) } };
}

export function createObservation(completed: CompletedSession, draft: ObservationDraft, observedAt: string): SessionObservation {
  return { schemaVersion: 2, id: crypto.randomUUID(), sceneId: completed.plan.manifest.id, contentRevision: completed.plan.manifest.revision, variant: completed.plan.variants, playbackMode: completed.plan.playbackMode, viewingDistanceBand: completed.plan.setup.viewingDistanceBand, roomLightBand: completed.plan.setup.roomLightBand, soundEnabled: completed.soundEnabled, ...(completed.plan.setup.observedCat ? { observedCat: completed.plan.setup.observedCat } : {}), elapsedMs: completed.elapsedMs, endReason: draft.endReason, acceptedContactTimestamps: completed.touches, vocabulary: draft.vocabulary, ...(draft.safetyEvent ? { safetyEvent: draft.safetyEvent } : {}), physicalPlayHandoff: completed.physicalPlaySuggested && draft.physicalPlayHandoff === 'not-recorded' ? 'offered' : draft.physicalPlayHandoff, rawNote: draft.rawNote, confirmedAt: observedAt };
}

export function createComparisonRecord(completed: CompletedSession, observation: SessionObservation, observedAt: string): ComparisonRecord | null {
  const comparison = completed.plan.comparison;
  if (!comparison) return null;
  const changedDimension = comparison.dimension === 'contrast' ? 'figureGround' : comparison.dimension;
  const isFirst = comparison.label.startsWith('A');
  const common = { sceneId: completed.plan.manifest.id, seed: completed.plan.seed, encounterScore: completed.plan.manifest.encounter.authoredScore };
  return { id: crypto.randomUUID(), createdAt: observedAt, first: { ...common, variant: baselineVariant, ...(isFirst ? { observationId: observation.id } : {}) }, second: { ...common, variant: changedVariant(changedDimension), ...(!isFirst ? { observationId: observation.id } : {}) }, changedDimension, observation: `Shared seed and encounter score; A and B are separate manual runs. ${isFirst ? 'B' : 'A'} remains unrecorded in this pair.` };
}

function changedVariant(dimension: 'figureGround' | 'motion'): VariantSelection {
  const variant: VariantSelection = { ...baselineVariant };
  if (dimension === 'figureGround') variant.figureGround = 'enhanced';
  if (dimension === 'motion') variant.motion = 'intermittent';
  return variant;
}

export function mergeQueueIds(savedIds: readonly SceneId[], currentIds: readonly SceneId[]): SceneId[] {
  const merged: SceneId[] = [];
  for (const id of [...savedIds, ...currentIds]) if (!merged.includes(id)) merged.push(id);
  return merged;
}

export function queueRecords(ids: readonly SceneId[]): QueueItem[] {
  const addedAt = new Date().toISOString();
  return ids.map((sceneId) => ({ id: `queue:${sceneId}`, sceneId, variant: defaultSessionVariant, addedAt }));
}
