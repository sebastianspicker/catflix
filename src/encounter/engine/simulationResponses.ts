import type { AnimationState, EncounterPhase, SceneActorSnapshot, SceneId, SceneSnapshot, TouchResponse } from "../../domain";

type ContactResponse = NonNullable<TouchResponse["response"]>;

const signatureKinds = new Map<SceneId, NonNullable<SceneSnapshot["signatureEffect"]>["kind"]>([
  ["balcony-birds", "perch-lights"],
  ["koi-pool", "reflected-ring"],
  ["paper-moth", "folded-shadow"],
  ["beetle-under-the-fern", "fern-shadow"],
  ["red-string", "slack-curve"],
]);

const responseRules = new Map<string, ContactResponse>([
  ["balcony-birds:perching:*", "head-turn"],
  ["balcony-birds:*:*", "hop"],
  ["koi-pool:*:*", "redirect"],
  ["paper-moth:landed:*", "land"],
  ["paper-moth:*:*", "reroute"],
  ["beetle-under-the-fern:sheltering:*", "hide"],
  ["beetle-under-the-fern:*:occlusion", "hide"],
  ["beetle-under-the-fern:*:reappearance", "reverse"],
  ["beetle-under-the-fern:*:*", "pause"],
  ["red-string:resting:*", "pause"],
  ["red-string:*:*", "redirect"],
]);

export function signatureEffect(sceneId: SceneId, phase: EncounterPhase, actor: Pick<SceneActorSnapshot, "x" | "y">): SceneSnapshot["signatureEffect"] {
  if (phase !== "contact-response" && phase !== "finale") return undefined;
  return { kind: signatureKinds.get(sceneId) ?? "slack-curve", x: actor.x, y: actor.y, alpha: phase === "finale" ? .16 : .11 };
}

export function contactResponseFor(sceneId: SceneId, state: AnimationState, phase: EncounterPhase, allowed: readonly NonNullable<TouchResponse["response"]>[]): NonNullable<TouchResponse["response"]> {
  const keys = [`${sceneId}:${state}:${phase}`, `${sceneId}:${state}:*`, `${sceneId}:*:${phase}`, `${sceneId}:*:*`];
  const preferred = keys.map((key) => responseRules.get(key)).find((response) => response !== undefined) ?? "redirect";
  return allowed.includes(preferred) ? preferred : allowed[0];
}
