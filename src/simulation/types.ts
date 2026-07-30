import { ContentManifest, SceneId, VariantSelection } from "../content/types";

export interface Point { x: number; y: number; }
export type ActorState = "moving" | "paused" | "occluded" | "hidden";
/** Renderer-facing labels, deliberately authored per scene rather than inferred from velocity. */
export type AnimationState = "perching" | "hopping" | "flying" | "gliding" | "swimming" | "fluttering" | "landed" | "crawling" | "sheltering" | "dragging" | "resting" | "reappearing";
export type SceneMotionMode = "standard" | "low";
export type PlaybackMode = "tablet-touch" | "tv-passive";
export type EncounterPhase = "invitation" | "passage" | "occlusion" | "reappearance" | "contact-response" | "rest" | "finale";
export interface SetupContext {
  stableDevice: true;
  protectedCables: true;
  openExit: true;
  supervised: true;
  roomLightBand: "dim" | "moderate" | "bright";
  viewingDistanceBand: "near-screen" | "room-display";
  observedCat?: "Arri" | "Ozzy" | "Mika";
}
export interface EncounterBeat {
  id: string;
  phase: EncounterPhase;
  durationMs: readonly [number, number];
  behaviorState: AnimationState;
  trajectory: "perch" | "spline" | "flutter" | "ground" | "rope";
  occlusionRule: string;
  actorCap: number;
  eligibleAudioEvent?: string;
  allowedContactResponse?: readonly NonNullable<TouchResponse["response"]>[];
}
export interface InteractionPolicy {
  targetOnly: true;
  hitTolerance: number;
  refractoryMs: number;
  rollingContactCap: { contacts: 3; windowMs: 20_000 };
  restResponse: { durationMs: readonly [10_000, 12_000]; editorialSafetyCap: true };
  neverEscalate: true;
}
export type SceneEvent =
  | { type: "audio"; kind: string; x: number; y: number; atMs: number }
  | { type: "phase-change"; phase: EncounterPhase; beatId: string; atMs: number }
  | { type: "contact-accepted"; actorId: string; atMs: number }
  | { type: "contact-response"; actorId: string; response: NonNullable<TouchResponse["response"]>; atMs: number }
  | { type: "rest-window"; reason: "editorial-contact-cap" | "authored"; durationMs: number; atMs: number }
  | { type: "contact-reminder"; id: "three-contacts"; acceptedContacts: 3; windowMs: 20_000; dismissible: true; editorialSafetyCap: true; atMs: number }
  | { type: "complete"; atMs: number };
export interface SceneActorSnapshot extends Point {
  id: string;
  angle: number;
  state: ActorState;
  visible: boolean;
  scale: number;
  opacity: number;
  facing: -1 | 1;
  animationState: AnimationState;
  poseFrame: number;
  stateProgress: number;
  depth: number;
  alpha: number;
  scaleX: number;
  scaleY: number;
}
export interface SoundEvent extends Point { kind: string; atMs: number; }
export interface SceneSnapshot {
  sceneId: SceneId;
  elapsedMs: number;
  durationMs: number;
  complete: boolean;
  phase: EncounterPhase;
  beatId: string;
  remainingMs: number;
  signatureEffect?: { kind: "perch-lights" | "reflected-ring" | "folded-shadow" | "fern-shadow" | "slack-curve"; x: number; y: number; alpha: number };
  actors: readonly SceneActorSnapshot[];
  soundEvents: readonly SoundEvent[];
  events: readonly SceneEvent[];
  reminder?: Extract<SceneEvent, { type: "contact-reminder" }>;
}
export interface TouchResponse { accepted: boolean; response?: "head-turn" | "hop" | "reroute" | "land" | "pause" | "reverse" | "hide" | "redirect"; refractoryUntilMs?: number; }
export interface TouchPolicy { refractoryMs: number; allowedResponses: readonly NonNullable<TouchResponse["response"]>[]; }
export interface SceneDefinition {
  id: SceneId;
  durationMs: number;
  actorCount: readonly [number, number];
  baseSpeed: number;
  maxSpeed: number;
  maxAcceleration: number;
  /** Pose-cell width relative to the viewport; visible silhouette range is declared in content metadata. */
  displayWidth: number;
  containment: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number; };
  subjectHitRadius: number;
  authoredStates: readonly AnimationState[];
  touchPolicy: TouchPolicy;
  interactionPolicy: InteractionPolicy;
  encounter: readonly EncounterBeat[];
  audioEventKinds: readonly string[];
}
export interface SceneBehaviorScore {
  state: AnimationState;
  durationMs: readonly [number, number];
  poseFrames: readonly number[];
  trajectory: "perch" | "spline" | "flutter" | "ground" | "rope";
}
export interface SceneScore extends SceneDefinition {
  behaviors: readonly SceneBehaviorScore[];
  trajectoryRule: string;
  occlusionZones: readonly { id: string; minX: number; maxX: number; minY: number; maxY: number }[];
  audioEventMappings: Readonly<Record<string, string>>;
  lowMotionOverride: { actorCount: number; travelScale: number; deformationScale: number; maxSimultaneousEvents: number };
}
export interface SceneSimulation {
  readonly definition: SceneDefinition;
  readonly variants: VariantSelection;
  advance(deltaMs: number): SceneSnapshot;
  touch(point: Point, timestampMs?: number): TouchResponse;
  snapshot(): SceneSnapshot;
  reset(): SceneSnapshot;
  dismissReminder(): SceneSnapshot;
}

export interface SessionPlan {
  manifest: ContentManifest;
  seed: number;
  variants: VariantSelection;
  playbackMode: PlaybackMode;
  sceneMotionMode: SceneMotionMode;
  setup: SetupContext;
  comparison?: { dimension: "contrast" | "motion" | "sound" | "novelty"; label: string };
}

export interface SimulationPreferences {
  sceneMotionMode?: SceneMotionMode;
  playbackMode?: PlaybackMode;
}
