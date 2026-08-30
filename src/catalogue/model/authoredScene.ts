import type { AnimationState, EncounterBeat, InteractionPolicy, SceneScore, TouchResponse } from "../../domain";
import type { AudioProfile, ContentManifest } from "./contentManifest";

/** The catalogue's only authored scene source, with manifest and runtime inputs together. */
export type AuthoredScene = ContentManifest & {
  readonly runtime: AuthoredRuntime & {
    encounterStates: readonly [AnimationState, AnimationState, AnimationState];
  };
};

export interface AuthoredRuntime extends Omit<SceneScore, "id" | "durationMs" | "audioEventKinds" | "encounter" | "interactionPolicy"> {
  subjectHitRadius: number;
  touchPolicy: { refractoryMs: number; allowedResponses: readonly NonNullable<TouchResponse["response"]>[]; };
}

const withAudioProvenance = (audio: AuthoredScene["audio"]): AudioProfile | undefined => audio && {
  ...audio,
  provenance: audio.eventKinds.map((eventKind) => ({
    eventKind,
    source: "No cleared environmental recording bundled in this revision",
    license: "Ineligible until recording provenance and clearance are added",
    eligible: false,
  })),
};

export function compileContentManifest(scene: AuthoredScene): ContentManifest {
  const manifest = { ...scene };
  Reflect.deleteProperty(manifest, "runtime");
  const { audio } = manifest;
  return { ...manifest, ...(audio ? { audio: withAudioProvenance(audio) } : {}) };
}

function compileEncounter(scene: AuthoredScene): readonly EncounterBeat[] {
  const [resting, moving, finale] = scene.runtime.encounterStates;
  const beat = (phase: EncounterBeat["phase"], fraction: readonly [number, number], behaviorState: AnimationState): EncounterBeat => ({
    id: `${scene.id}:${phase}`,
    phase,
    durationMs: [scene.finiteDurationMs * fraction[0], scene.finiteDurationMs * fraction[1]],
    behaviorState,
  });
  return [
    beat("invitation", [.07, .09], resting),
    beat("passage", [.29, .31], moving),
    beat("occlusion", [.08, .1], moving),
    beat("reappearance", [.08, .1], "reappearing"),
    beat("contact-response", [.12, .14], moving),
    beat("rest", [.17, .19], resting),
    beat("finale", [.12, .14], finale),
  ];
}

export function compileSceneScore(scene: AuthoredScene): SceneScore {
  const { subjectHitRadius, touchPolicy, ...runtime } = scene.runtime;
  const interactionPolicy: InteractionPolicy = {
    targetMode: "subject-only",
    hitTolerance: subjectHitRadius,
    refractoryMs: touchPolicy.refractoryMs,
    allowedResponses: touchPolicy.allowedResponses,
    rollingContactCap: { contacts: 3, windowMs: 20_000 },
    restResponse: { durationMs: [10_000, 12_000], editorialSafetyCap: true },
    neverEscalate: true,
  };
  return { ...runtime, id: scene.id, durationMs: scene.finiteDurationMs, audioEventKinds: scene.audio?.eventKinds ?? [], encounter: compileEncounter(scene), interactionPolicy };
}
