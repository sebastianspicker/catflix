import type {
  CatalogueRhythmFilter,
  CatalogueSubjectFilter,
  CatalogueThemeFilter,
} from '../catalogue/model';
import type { SetupContext } from '../domain';
import type { SessionPlan } from '../encounter/session';
import type { EvidenceThemeId } from '../research/evidence';
import type { LocalRecordHistory, SceneMotionMode, SessionObservation, StorageStatus } from '../local-data/types';
import type { CompletedSession, PendingSession, SessionResult } from './catalogueModel';
import { mergeQueueIds, sessionUpdate } from './catalogueModel';

export interface CatalogueWorkflowState {
  theme: CatalogueThemeFilter; subject: CatalogueSubjectFilter; rhythm: CatalogueRhythmFilter; queue: SessionPlan['manifest']['id'][];
  progress: Partial<Record<SessionPlan['manifest']['id'], number>>;
  pending: PendingSession | null; active: SessionPlan | null; completed: CompletedSession | null;
  savedObservation: SessionObservation | null;
  queueOpen: boolean; curatorOpen: boolean; dataOpen: boolean; refereesOpen: boolean;
  evidenceOpen: EvidenceThemeId | null; recordHistory: LocalRecordHistory;
  sceneMotionMode: SceneMotionMode; storageStatus: StorageStatus;
  hydration: 'pending' | 'complete'; queueChangedDuringHydration: boolean; sceneMotionChangedDuringHydration: boolean;
  progressChangedDuringHydration: boolean; recordHistoryChangedDuringHydration: boolean;
}

export type CatalogueWorkflowAction =
  | { type: 'hydrate'; queue: CatalogueWorkflowState['queue']; progress: CatalogueWorkflowState['progress']; recordHistory: LocalRecordHistory; sceneMotionMode: SceneMotionMode }
  | { type: 'set-filter'; filter: 'theme'; value: CatalogueThemeFilter }
  | { type: 'set-filter'; filter: 'subject'; value: CatalogueSubjectFilter }
  | { type: 'set-filter'; filter: 'rhythm'; value: CatalogueRhythmFilter }
  | { type: 'set-queue'; queue: CatalogueWorkflowState['queue'] }
  | { type: 'prepare'; pending: PendingSession }
  | { type: 'cancel-preparing' }
  | { type: 'start'; playbackMode: SessionPlan['playbackMode']; setup: SetupContext }
  | { type: 'finish'; result: SessionResult }
  | { type: 'clear-completed' }
  | { type: 'observation-saved'; observation: SessionObservation; recordHistory: LocalRecordHistory }
  | { type: 'close-receipt'; showHistory?: boolean }
  | { type: 'set-panel'; panel: 'queueOpen' | 'curatorOpen' | 'dataOpen' | 'refereesOpen'; open: boolean }
  | { type: 'set-evidence'; evidenceOpen: EvidenceThemeId | null }
  | { type: 'set-motion-mode'; sceneMotionMode: SceneMotionMode }
  | { type: 'set-storage-status'; storageStatus: StorageStatus }
  | { type: 'set-record-history'; recordHistory: LocalRecordHistory };

export const initialCatalogueWorkflowState = (storageStatus: StorageStatus): CatalogueWorkflowState => ({
  theme: 'all', subject: 'all', rhythm: 'all', queue: [], progress: {}, pending: null, active: null, completed: null, savedObservation: null,
  queueOpen: false, curatorOpen: false, dataOpen: false, refereesOpen: false, evidenceOpen: null, recordHistory: { notes: [], observations: [], comparisons: [] }, sceneMotionMode: 'standard', storageStatus,
  hydration: 'pending', queueChangedDuringHydration: false, sceneMotionChangedDuringHydration: false,
  progressChangedDuringHydration: false, recordHistoryChangedDuringHydration: false,
});

type SessionWorkflowAction = Extract<CatalogueWorkflowAction, { type: 'hydrate' | 'set-queue' | 'prepare' | 'cancel-preparing' | 'start' | 'finish' | 'clear-completed' | 'observation-saved' | 'close-receipt' }>;
type PresentationWorkflowAction = Exclude<CatalogueWorkflowAction, SessionWorkflowAction>;

export function catalogueWorkflowReducer(state: CatalogueWorkflowState, action: CatalogueWorkflowAction): CatalogueWorkflowState {
  return isSessionWorkflowAction(action) ? reduceSessionWorkflow(state, action) : reducePresentationWorkflow(state, action);
}

function isSessionWorkflowAction(action: CatalogueWorkflowAction): action is SessionWorkflowAction {
  switch (action.type) {
    case 'hydrate': case 'set-queue': case 'prepare': case 'cancel-preparing': case 'start': case 'finish': case 'clear-completed': case 'observation-saved': case 'close-receipt': return true;
    default: return false;
  }
}

function reduceSessionWorkflow(state: CatalogueWorkflowState, action: SessionWorkflowAction): CatalogueWorkflowState {
  switch (action.type) {
    case 'hydrate': return hydrateWorkflow(state, action);
    case 'set-queue': return setQueue(state, action.queue);
    case 'prepare': return { ...state, pending: action.pending };
    case 'cancel-preparing': return { ...state, pending: null };
    case 'start': return startPendingSession(state, action);
    case 'finish': return finishActiveSession(state, action);
    case 'clear-completed': return { ...state, completed: null };
    case 'observation-saved': return saveObservationReceipt(state, action);
    case 'close-receipt': return { ...state, savedObservation: null, dataOpen: action.showHistory === true };
  }
}

function reducePresentationWorkflow(state: CatalogueWorkflowState, action: PresentationWorkflowAction): CatalogueWorkflowState {
  switch (action.type) {
    case 'set-filter': return setFilter(state, action);
    case 'set-panel': return { ...state, [action.panel]: action.open };
    case 'set-evidence': return { ...state, evidenceOpen: action.evidenceOpen };
    case 'set-motion-mode': return { ...state, sceneMotionMode: action.sceneMotionMode, sceneMotionChangedDuringHydration: state.hydration === 'pending' || state.sceneMotionChangedDuringHydration };
    case 'set-storage-status': return { ...state, storageStatus: action.storageStatus };
    case 'set-record-history': return {
      ...state,
      recordHistory: action.recordHistory,
      recordHistoryChangedDuringHydration: state.hydration === 'pending' || state.recordHistoryChangedDuringHydration,
    };
  }
}

function hydrateWorkflow(state: CatalogueWorkflowState, action: Extract<CatalogueWorkflowAction, { type: 'hydrate' }>): CatalogueWorkflowState {
  return {
    ...state,
    queue: state.queueChangedDuringHydration ? mergeQueueIds(action.queue, state.queue) : action.queue,
    progress: state.progressChangedDuringHydration ? { ...action.progress, ...state.progress } : action.progress,
    recordHistory: state.recordHistoryChangedDuringHydration ? state.recordHistory : action.recordHistory,
    sceneMotionMode: state.sceneMotionChangedDuringHydration ? state.sceneMotionMode : action.sceneMotionMode,
    hydration: 'complete', queueChangedDuringHydration: false, sceneMotionChangedDuringHydration: false,
    progressChangedDuringHydration: false, recordHistoryChangedDuringHydration: false,
  };
}

function setFilter(state: CatalogueWorkflowState, action: Extract<CatalogueWorkflowAction, { type: 'set-filter' }>): CatalogueWorkflowState {
  if (action.filter === 'theme') return { ...state, theme: action.value };
  if (action.filter === 'subject') return { ...state, subject: action.value };
  return { ...state, rhythm: action.value };
}

function setQueue(state: CatalogueWorkflowState, queue: CatalogueWorkflowState['queue']): CatalogueWorkflowState {
  return { ...state, queue, queueChangedDuringHydration: state.hydration === 'pending' || state.queueChangedDuringHydration };
}

function startPendingSession(state: CatalogueWorkflowState, action: Extract<CatalogueWorkflowAction, { type: 'start' }>): CatalogueWorkflowState {
  if (!state.pending) return state;
  const { manifest, variant: variants, seed, comparison } = state.pending;
  const active = { manifest, variants, seed, playbackMode: action.playbackMode, sceneMotionMode: state.sceneMotionMode, setup: action.setup, ...(comparison ? { comparison } : {}) };
  return { ...state, pending: null, active };
}

function finishActiveSession(state: CatalogueWorkflowState, action: Extract<CatalogueWorkflowAction, { type: 'finish' }>): CatalogueWorkflowState {
  const update = sessionUpdate(state.active, action.result);
  if (!update || !state.active) return state;
  return {
    ...state, active: null, completed: update.completed,
    progress: { ...state.progress, [state.active.manifest.id]: update.progress },
    progressChangedDuringHydration: state.hydration === 'pending' || state.progressChangedDuringHydration,
  };
}

function saveObservationReceipt(state: CatalogueWorkflowState, action: Extract<CatalogueWorkflowAction, { type: 'observation-saved' }>): CatalogueWorkflowState {
  return {
    ...state, completed: null, savedObservation: action.observation, recordHistory: action.recordHistory,
    recordHistoryChangedDuringHydration: state.hydration === 'pending' || state.recordHistoryChangedDuringHydration,
  };
}
