import type { ComparisonDimension } from '../components/CuratorPanel';
import type { ContentManifest, SceneId, VariantSelection } from '../content/types';
import type { SessionPlan } from '../simulation/types';
import type { ComparisonRecord, QueueItem, SessionObservation } from '../storage/types';
import type { ObservationDraft } from '../components/RefereeNotes';

export const catalogueMeta: Record<SceneId, { title: string; theme: 'nature' | 'inside'; motion: 'flowing' | 'intermittent' | 'grounded'; note: string }> = {
  'balcony-birds': { title: 'Balcony Birds at Dusk', theme: 'nature', motion: 'intermittent', note: 'Perch, passage, occlusion, visible rest' },
  'koi-pool': { title: 'Koi in Slow Motion', theme: 'nature', motion: 'flowing', note: 'Long curves with calm-water finale' },
  'paper-moth': { title: 'Paper Moth at Midnight', theme: 'inside', motion: 'intermittent', note: 'Flutter passages with long landings' },
  'beetle-under-the-fern': { title: 'Beetle Beneath the Fern', theme: 'nature', motion: 'grounded', note: 'Fern-margin crossings and shelter' },
  'red-string': { title: 'The Red String Incident', theme: 'inside', motion: 'flowing', note: 'Bounded tension and slack passages' },
};

export const refereeLine: Record<SceneId, string> = {
  'balcony-birds': 'No curator note published',
  'koi-pool': 'No curator note published',
  'paper-moth': 'No curator note published',
  'beetle-under-the-fern': 'No curator note published',
  'red-string': 'No curator note published',
};

export const defaultVariant: VariantSelection = { figureGround: 'natural', motion: 'intermittent', sound: 'on', novelty: 'familiar' };
export const baselineVariant: VariantSelection = { figureGround: 'natural', motion: 'continuous', sound: 'off', novelty: 'familiar' };

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

export const durationLabel = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

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

function changedVariant(dimension: Exclude<ComparisonDimension, 'contrast'> | 'figureGround'): VariantSelection {
  const variant: VariantSelection = { ...baselineVariant };
  if (dimension === 'figureGround') variant.figureGround = 'enhanced';
  if (dimension === 'motion') variant.motion = 'intermittent';
  if (dimension === 'sound') variant.sound = 'on';
  if (dimension === 'novelty') variant.novelty = 'alternate';
  return variant;
}

export function matchesFilters(manifest: ContentManifest, theme: string, subject: string, motion: string) {
  const meta = catalogueMeta[manifest.id];
  return (theme === 'all' || meta.theme === theme) && (subject === 'all' || manifest.subjectClass === subject) && (motion === 'all' || meta.motion === motion);
}

export function mergeQueueIds(savedIds: readonly SceneId[], currentIds: readonly SceneId[]): SceneId[] {
  const merged: SceneId[] = [];
  for (const id of [...savedIds, ...currentIds]) if (!merged.includes(id)) merged.push(id);
  return merged;
}

export function queueRecords(ids: readonly SceneId[]): QueueItem[] {
  const addedAt = new Date().toISOString();
  return ids.map((sceneId) => ({ id: `queue:${sceneId}`, sceneId, variant: defaultVariant, addedAt }));
}

export function sceneArtPath(id: SceneId): string {
  switch (id) {
    case 'balcony-birds': return '/assets/balcony-birds';
    case 'koi-pool': return '/assets/koi';
    case 'paper-moth': return '/assets/paper-moth';
    case 'beetle-under-the-fern': return '/assets/beetle';
    case 'red-string': return '/assets/red-string';
  }
}
