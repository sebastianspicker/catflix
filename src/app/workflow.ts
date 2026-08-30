import type {
  CatalogueRhythmFilter,
  CatalogueSubjectFilter,
  CatalogueThemeFilter,
} from '../catalogue/model';
import type { SetupContext } from '../domain';
import type { SessionPlan } from '../encounter/session';
import type { EvidenceThemeId } from '../research/evidence';
import type { SceneMotionMode, StorageStatus } from '../local-data/types';
import type { CompletedSession, PendingSession, SessionResult } from './catalogueModel';
import { mergeQueueIds, sessionUpdate } from './catalogueModel';

export interface CatalogueWorkflowState {
  theme: CatalogueThemeFilter; subject: CatalogueSubjectFilter; rhythm: CatalogueRhythmFilter; queue: SessionPlan['manifest']['id'][];
  progress: Partial<Record<SessionPlan['manifest']['id'], number>>;
  pending: PendingSession | null; active: SessionPlan | null; completed: CompletedSession | null;
  queueOpen: boolean; curatorOpen: boolean; dataOpen: boolean; refereesOpen: boolean;
  evidenceOpen: EvidenceThemeId | null; recordCounts: { notes: number; comparisons: number };
  sceneMotionMode: SceneMotionMode; storageStatus: StorageStatus;
  hydration: 'pending' | 'complete'; queueChangedDuringHydration: boolean; sceneMotionChangedDuringHydration: boolean;
  progressChangedDuringHydration: boolean; recordCountsChangedDuringHydration: boolean;
}

export type CatalogueWorkflowAction =
  | { type: 'hydrate'; queue: CatalogueWorkflowState['queue']; progress: CatalogueWorkflowState['progress']; recordCounts: CatalogueWorkflowState['recordCounts']; sceneMotionMode: SceneMotionMode }
  | { type: 'set-filter'; filter: 'theme'; value: CatalogueThemeFilter }
  | { type: 'set-filter'; filter: 'subject'; value: CatalogueSubjectFilter }
  | { type: 'set-filter'; filter: 'rhythm'; value: CatalogueRhythmFilter }
  | { type: 'set-queue'; queue: CatalogueWorkflowState['queue'] }
  | { type: 'prepare'; pending: PendingSession }
  | { type: 'cancel-preparing' }
  | { type: 'start'; playbackMode: SessionPlan['playbackMode']; setup: SetupContext }
  | { type: 'finish'; result: SessionResult }
  | { type: 'clear-completed' }
  | { type: 'set-panel'; panel: 'queueOpen' | 'curatorOpen' | 'dataOpen' | 'refereesOpen'; open: boolean }
  | { type: 'set-evidence'; evidenceOpen: EvidenceThemeId | null }
  | { type: 'set-motion-mode'; sceneMotionMode: SceneMotionMode }
  | { type: 'set-storage-status'; storageStatus: StorageStatus }
  | { type: 'increment-records'; notes: number; comparisons: number };

export const initialCatalogueWorkflowState = (storageStatus: StorageStatus): CatalogueWorkflowState => ({
  theme: 'all', subject: 'all', rhythm: 'all', queue: [], progress: {}, pending: null, active: null, completed: null,
  queueOpen: false, curatorOpen: false, dataOpen: false, refereesOpen: false, evidenceOpen: null, recordCounts: { notes: 0, comparisons: 0 }, sceneMotionMode: 'standard', storageStatus,
  hydration: 'pending', queueChangedDuringHydration: false, sceneMotionChangedDuringHydration: false,
  progressChangedDuringHydration: false, recordCountsChangedDuringHydration: false,
});

export function catalogueWorkflowReducer(state: CatalogueWorkflowState, action: CatalogueWorkflowAction): CatalogueWorkflowState {
  switch (action.type) {
    case 'hydrate': return {
      ...state,
      queue: state.queueChangedDuringHydration ? mergeQueueIds(action.queue, state.queue) : action.queue,
      progress: state.progressChangedDuringHydration ? { ...action.progress, ...state.progress } : action.progress,
      recordCounts: state.recordCountsChangedDuringHydration
        ? { notes: action.recordCounts.notes + state.recordCounts.notes, comparisons: action.recordCounts.comparisons + state.recordCounts.comparisons }
        : action.recordCounts,
      sceneMotionMode: state.sceneMotionChangedDuringHydration ? state.sceneMotionMode : action.sceneMotionMode,
      hydration: 'complete',
      queueChangedDuringHydration: false,
      sceneMotionChangedDuringHydration: false,
      progressChangedDuringHydration: false,
      recordCountsChangedDuringHydration: false,
    };
    case 'set-filter': {
      if (action.filter === 'theme') return { ...state, theme: action.value };
      if (action.filter === 'subject') return { ...state, subject: action.value };
      return { ...state, rhythm: action.value };
    }
    case 'set-queue': return { ...state, queue: action.queue, queueChangedDuringHydration: state.hydration === 'pending' || state.queueChangedDuringHydration };
    case 'prepare': return { ...state, pending: action.pending };
    case 'cancel-preparing': return { ...state, pending: null };
    case 'start': {
      if (!state.pending) return state;
      const { manifest, variant: variants, seed, comparison } = state.pending;
      return { ...state, pending: null, active: { manifest, variants, seed, playbackMode: action.playbackMode, sceneMotionMode: state.sceneMotionMode, setup: action.setup, ...(comparison ? { comparison } : {}) } };
    }
    case 'finish': {
      const update = sessionUpdate(state.active, action.result);
      if (!update || !state.active) return state;
      return {
        ...state,
        active: null,
        completed: update.completed,
        progress: { ...state.progress, [state.active.manifest.id]: update.progress },
        progressChangedDuringHydration: state.hydration === 'pending' || state.progressChangedDuringHydration,
      };
    }
    case 'clear-completed': return { ...state, completed: null };
    case 'set-panel': return { ...state, [action.panel]: action.open };
    case 'set-evidence': return { ...state, evidenceOpen: action.evidenceOpen };
    case 'set-motion-mode': return { ...state, sceneMotionMode: action.sceneMotionMode, sceneMotionChangedDuringHydration: state.hydration === 'pending' || state.sceneMotionChangedDuringHydration };
    case 'set-storage-status': return { ...state, storageStatus: action.storageStatus };
    case 'increment-records': return {
      ...state,
      recordCounts: { notes: state.recordCounts.notes + action.notes, comparisons: state.recordCounts.comparisons + action.comparisons },
      recordCountsChangedDuringHydration: state.hydration === 'pending' || state.recordCountsChangedDuringHydration,
    };
  }
}
