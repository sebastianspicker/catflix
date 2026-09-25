import type { SceneId, VariantSelection } from "./scene";

export interface Point { x: number; y: number; }
export type ActorState = "moving" | "paused" | "occluded" | "hidden";
export type AnimationState = "perching" | "hopping" | "flying" | "gliding" | "swimming" | "fluttering" | "landed" | "crawling" | "sheltering" | "dragging" | "resting" | "reappearing";
export type SceneMotionMode = "standard" | "low";
export type PlaybackMode = "tablet-touch" | "tv-passive";
export type EncounterPhase = "invitation" | "passage" | "occlusion" | "reappearance" | "contact-response" | "rest" | "finale";
export type MovementTrajectory = "perch" | "spline" | "flutter" | "ground" | "rope";

/** Pure setup inputs; browser, catalogue, and persistence concerns stay outside domain. */
export interface SetupContext {
  stableDevice: true;
  protectedCables: true;
  openExit: true;
  supervised: true;
  roomLightBand: "dim" | "moderate" | "bright";
  viewingDistanceBand: "near-screen" | "room-display";
  observedCat?: "Arri" | "Ozzy" | "Mika";
}

export interface SessionSetup {
  sceneId: SceneId;
  seed: number;
  variants: VariantSelection;
  playbackMode: PlaybackMode;
  sceneMotionMode: SceneMotionMode;
  setup: SetupContext;
}

export interface TouchResponse { accepted: boolean; response?: "head-turn" | "hop" | "reroute" | "land" | "pause" | "reverse" | "hide" | "redirect"; refractoryUntilMs?: number; }
export interface EncounterBeat {
  id: string;
  phase: EncounterPhase;
  durationMs: readonly [number, number];
  behaviorState: AnimationState;
}
export interface InteractionPolicy {
  targetMode: "subject-only" | "disabled";
  hitTolerance: number;
  refractoryMs: number;
  allowedResponses: readonly NonNullable<TouchResponse["response"]>[];
  rollingContactCap: { contacts: number; windowMs: number };
  restResponse: { durationMs: readonly [number, number]; editorialSafetyCap: true };
  neverEscalate: true;
}
export interface SceneScore {
  id: SceneId;
  durationMs: number;
  actorCount: readonly [number, number];
  baseSpeed: number;
  maxSpeed: number;
  maxAcceleration: number;
  displayWidth: number;
  containment: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number; };
  interactionPolicy: InteractionPolicy;
  encounter: readonly EncounterBeat[];
  audioEventKinds: readonly string[];
  behaviors: readonly SceneBehaviorScore[];
  occlusionZones: readonly { id: string; minX: number; maxX: number; minY: number; maxY: number }[];
  audioEventMappings: Readonly<Record<string, string>>;
  lowMotionOverride: { actorCount: number; travelScale: number };
}
export interface SceneBehaviorScore {
  state: AnimationState;
  durationMs: readonly [number, number];
  poseFrames: readonly number[];
  trajectory: MovementTrajectory;
}
export type SceneEvent =
  | { type: "audio"; kind: string; x: number; y: number; atMs: number }
  | { type: "phase-change"; phase: EncounterPhase; beatId: string; atMs: number }
  | { type: "contact-accepted"; actorId: string; atMs: number }
  | { type: "contact-response"; actorId: string; response: NonNullable<TouchResponse["response"]>; atMs: number }
  | { type: "rest-window"; reason: "editorial-contact-cap" | "authored"; durationMs: number; atMs: number }
  | { type: "contact-reminder"; id: "contact-cap"; acceptedContacts: number; windowMs: number; dismissible: true; editorialSafetyCap: true; atMs: number }
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
export interface SimulationPreferences {
  sceneMotionMode?: SceneMotionMode;
  playbackMode?: PlaybackMode;
}

export interface SceneSimulation {
  readonly score: SceneScore;
  readonly variants: VariantSelection;
  advance(deltaMs: number): SceneSnapshot;
  touch(point: Point, timestampMs?: number): TouchResponse;
  snapshot(): SceneSnapshot;
  reset(): SceneSnapshot;
  dismissReminder(): SceneSnapshot;
}
