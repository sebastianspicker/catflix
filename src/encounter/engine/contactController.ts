import type { MutableActor } from "./actorFactory";
import type { Point, SceneEvent, SceneScore, SimulationPreferences, TouchResponse } from "../../domain";
import { scenePhaseAt } from "./actorMotion";
import { normalize } from "./simulationMath";
import { contactResponseFor } from "./simulationResponses";

interface ContactState {
  refractoryUntilMs: number;
  forcedRestUntilMs: number;
  reminder?: Extract<SceneEvent, { type: "contact-reminder" }> | undefined;
}

export class ContactController {
  private acceptedTimes: number[] = [];
  readonly state: ContactState = { refractoryUntilMs: 0, forcedRestUntilMs: 0 };

  dismissReminder(): void { this.state.reminder = undefined; }

  touch(score: SceneScore, preferences: SimulationPreferences, actors: MutableActor[], elapsedMs: number, point: Point, timestampMs: number, nextRandom: () => number): { result: TouchResponse; events: SceneEvent[] } {
    if (this.isDisabled(score, preferences, elapsedMs, timestampMs)) return { result: { accepted: false, refractoryUntilMs: this.state.refractoryUntilMs }, events: [] };
    const actor = score.interactionPolicy.targetMode === "subject-only" ? this.closestActor(actors, point) : undefined;
    if (!actor || this.distance(actor, point) > score.interactionPolicy.hitTolerance) return { result: { accepted: false, refractoryUntilMs: this.state.refractoryUntilMs }, events: [] };
    const response = contactResponseFor(score.id, actor.animationState, scenePhaseAt(score, elapsedMs).phase, score.interactionPolicy.allowedResponses);
    this.state.refractoryUntilMs = timestampMs + score.interactionPolicy.refractoryMs;
    actor.responseUntilMs = timestampMs + 650;
    this.applyResponse(actor, response, point, timestampMs, score);
    const events: SceneEvent[] = [{ type: "contact-accepted", actorId: actor.id, atMs: timestampMs }, { type: "contact-response", actorId: actor.id, response, atMs: timestampMs }];
    this.recordRest(score, actors, timestampMs, nextRandom, events);
    return { result: { accepted: true, response, refractoryUntilMs: this.state.refractoryUntilMs }, events };
  }

  private isDisabled(score: SceneScore, preferences: SimulationPreferences, elapsedMs: number, timestampMs: number): boolean { return preferences.playbackMode === "tv-passive" || elapsedMs >= score.durationMs || timestampMs < this.state.refractoryUntilMs || timestampMs < this.state.forcedRestUntilMs || score.interactionPolicy.allowedResponses.length === 0; }
  private closestActor(actors: MutableActor[], point: Point): MutableActor | undefined { return actors.filter((actor) => actor.visible).reduce<MutableActor | undefined>((closest, actor) => !closest || this.distance(actor, point) < this.distance(closest, point) ? actor : closest, undefined); }
  private distance(actor: MutableActor, point: Point): number { return Math.hypot(actor.x - point.x, actor.y - point.y); }
  private applyResponse(actor: MutableActor, response: TouchResponse["response"], point: Point, timestampMs: number, score: SceneScore): void {
    if (response === "reroute" || response === "redirect") {
      const direction = normalize(actor.x - point.x, actor.y - point.y);
      const speed = Math.min(Math.hypot(actor.vx, actor.vy), score.maxSpeed);
      actor.vx = direction.x * speed;
      actor.vy = direction.y * speed;
      return;
    }
    if (response === "head-turn") { actor.facing = actor.facing === 1 ? -1 : 1; actor.pauseUntilMs = timestampMs + 650; }
    else if (response === "hop") actor.pauseUntilMs = timestampMs + 420;
    else if (response === "reverse") { actor.vx *= -1; actor.vy *= -1; }
    else if (response === "pause" || response === "land") actor.pauseUntilMs = timestampMs + 1_050;
    else if (response === "hide") actor.hiddenUntilMs = timestampMs + 1_250;
  }
  private recordRest(score: SceneScore, actors: MutableActor[], timestampMs: number, nextRandom: () => number, events: SceneEvent[]): void {
    const { rollingContactCap, restResponse } = score.interactionPolicy;
    this.acceptedTimes = [...this.acceptedTimes, timestampMs].filter((time) => timestampMs - time <= rollingContactCap.windowMs);
    if (this.acceptedTimes.length < rollingContactCap.contacts) return;
    const [minimumDurationMs, maximumDurationMs] = restResponse.durationMs;
    const durationMs = minimumDurationMs + Math.floor(nextRandom() * (maximumDurationMs - minimumDurationMs + 1));
    this.state.forcedRestUntilMs = timestampMs + durationMs;
    for (const actor of actors) actor.pauseUntilMs = Math.max(actor.pauseUntilMs, this.state.forcedRestUntilMs);
    events.push({ type: "rest-window", reason: "editorial-contact-cap", durationMs, atMs: timestampMs });
    // The rest always applies; an undismissed reminder only suppresses a duplicate reminder.
    if (this.state.reminder) return;
    this.state.reminder = { type: "contact-reminder", id: "contact-cap", acceptedContacts: rollingContactCap.contacts, windowMs: rollingContactCap.windowMs, dismissible: true, editorialSafetyCap: restResponse.editorialSafetyCap, atMs: timestampMs };
    events.push(this.state.reminder);
  }
}
