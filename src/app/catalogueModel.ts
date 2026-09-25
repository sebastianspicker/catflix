import type { ContentManifest } from '../catalogue/model';
import { defaultSessionVariant, type SceneId, type VariantSelection } from '../domain';
import type { ComparisonDimension, ComparisonSide, SessionPlan } from '../encounter/session';
import type { ObservationDraft, QueueItem, SessionObservation } from '../local-data/types';

export interface PendingSession {
  manifest: ContentManifest;
  variant: VariantSelection;
  seed: number;
  comparison?: { dimension: ComparisonDimension; side: ComparisonSide };
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
  const pairingContext = completed.plan.comparison
    ? {
        seed: completed.plan.seed,
        encounterScore: completed.plan.manifest.encounter.authoredScore,
        comparisonDimension: completed.plan.comparison.dimension === 'contrast' ? 'figureGround' as const : 'motion' as const,
      }
    : {};
  return { schemaVersion: 2, id: crypto.randomUUID(), sceneId: completed.plan.manifest.id, contentRevision: completed.plan.manifest.revision, variant: completed.plan.variants, ...pairingContext, playbackMode: completed.plan.playbackMode, viewingDistanceBand: completed.plan.setup.viewingDistanceBand, roomLightBand: completed.plan.setup.roomLightBand, soundEnabled: completed.soundEnabled, ...(completed.plan.setup.observedCat ? { observedCat: completed.plan.setup.observedCat } : {}), elapsedMs: completed.elapsedMs, endReason: draft.endReason, acceptedContactTimestamps: completed.touches, vocabulary: draft.vocabulary, ...(draft.safetyEvent ? { safetyEvent: draft.safetyEvent } : {}), physicalPlayHandoff: completed.physicalPlaySuggested && draft.physicalPlayHandoff === 'not-recorded' ? 'offered' : draft.physicalPlayHandoff, rawNote: draft.rawNote, confirmedAt: observedAt };
}

export function resolvePreparedVariant(variant: VariantSelection, comparison: PendingSession['comparison'], search: string): VariantSelection {
  if (comparison) return variant;
  return new URLSearchParams(search).get('contrast') === 'enhanced'
    ? { ...variant, figureGround: 'enhanced' }
    : variant;
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
