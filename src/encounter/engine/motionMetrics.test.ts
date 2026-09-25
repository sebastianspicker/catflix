import { describe, expect, it } from "vitest";
import { defaultSessionVariant, sceneIds, type SceneId, type SceneMotionMode, type VariantSelection } from "../../domain";
import { getContentManifest, getSceneScore } from "../../catalogue/model";
import { createSceneSimulationEngine } from "./sceneSimulation";

/**
 * Test-only motion metrics harness plus the hard product-invariant tests it backs. Runs a scene to
 * completion at a fixed step and derives objective, finite-difference measurements from
 * consecutive actor snapshots: the same method `sceneSimulation.properties.test.ts` uses for its
 * speed ceiling, with `deltaMs` held at or above two physics ticks (>= 40ms) so a step's own
 * duration dominates the fixed-step clock's leftover accumulator. Kept as a `.test.ts` file (rather
 * than an importable engine module) because it depends on the catalogue model to build a real
 * engine, which `src/encounter/engine` may not otherwise depend on. The full before/after metrics
 * table lives in the accompanying report; these assertions lock in the constraints those numbers
 * must satisfy.
 */

const METRICS_DELTA_MS = 50;
const SEEDS = [1, 2, 3] as const;
const MODES: readonly SceneMotionMode[] = ["standard", "low"];
// Position-derived speed and acceleration are finite-difference proxies, not the engine's internal
// per-step clamp, so both need the same small slack `sceneSimulation.properties.test.ts` uses for
// its speed ceiling (1.25x). Acceleration is a second finite difference and is correspondingly
// noisier; its p95 (not max) is asserted, so a handful of noisy samples cannot fail the run.
const SPEED_TOLERANCE = 1.25;
const ACCEL_P95_TOLERANCE = 1.25;
const NO_ESCALATION_TOLERANCE = 1.15;

/** Behaviour states counted as a walking or flapping gait for the pose-cadence proxy below.
 *  Koi (fin sway, not footfall) and red-string (dragged, not legged) are intentionally excluded. */
const GAIT_STATES: Readonly<Record<SceneId, readonly string[]>> = {
  "balcony-birds": ["flying"],
  "paper-moth": ["fluttering"],
  "beetle-under-the-fern": ["crawling"],
  "koi-pool": [],
  "red-string": [],
};

interface SceneMotionMetrics {
  sceneId: SceneId; seed: number; mode: SceneMotionMode; sampleCount: number;
  p95SpeedRatio: number; maxSpeedRatio: number;
  p95AccelRatio: number; maxAccelRatio: number;
  rmsJerk: number; maxHeadingStepRadians: number; maxTransitionSpeedJump: number;
  /** Coefficient of variation of distance travelled between pose-frame changes while in a gait
   *  state: a real gait covers roughly the same distance per step regardless of speed, so a lower
   *  value means cadence tracks speed better and foot-skate is less visible. NaN when the scene has
   *  no gait states or too few pose-frame changes to measure. */
  poseCadenceCoV: number;
  firstHalfP95SpeedRatio: number; secondHalfP95SpeedRatio: number;
  withinContainment: boolean;
}

const percentile = (values: readonly number[], fraction: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))]!;
};
const rootMeanSquare = (values: readonly number[]): number => values.length === 0 ? 0 : Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
const coefficientOfVariation = (values: readonly number[]): number => {
  if (values.length < 2) return Number.NaN;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= Number.EPSILON) return Number.NaN;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
};
const wrapAngle = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface ActorTrace { x: number; y: number; speed: number; accel: number; heading: number; animationState: string; poseFrame: number; strideDistance: number; }
interface MetricsAccumulator {
  speeds: number[]; accels: number[]; jerks: number[]; headingSteps: number[]; transitionJumps: number[]; strideDistances: number[];
  firstHalfSpeeds: number[]; secondHalfSpeeds: number[]; withinContainment: boolean;
}

const freshTrace = (actor: { x: number; y: number; animationState: string; poseFrame: number }): ActorTrace =>
  ({ x: actor.x, y: actor.y, speed: 0, accel: 0, heading: 0, animationState: actor.animationState, poseFrame: actor.poseFrame, strideDistance: 0 });
const newAccumulator = (): MetricsAccumulator => ({ speeds: [], accels: [], jerks: [], headingSteps: [], transitionJumps: [], strideDistances: [], firstHalfSpeeds: [], secondHalfSpeeds: [], withinContainment: true });
const isOutsideContainment = (actor: { x: number; y: number }, containment: { minX: number; maxX: number; minY: number; maxY: number }): boolean =>
  actor.x < containment.minX - 1e-6 || actor.x > containment.maxX + 1e-6 || actor.y < containment.minY - 1e-6 || actor.y > containment.maxY + 1e-6;

/** Distance accumulated since the last pose-frame change while in a gait state; pushed to the
 *  stride-distance sample list on every frame change and dropped on exit from a gait state. */
const nextStrideDistance = (actor: { animationState: string; poseFrame: number }, previous: ActorTrace, gaitStates: readonly string[], distance: number, strideDistances: number[]): number => {
  const isGait = gaitStates.includes(actor.animationState);
  const strideDistance = (gaitStates.includes(previous.animationState) ? previous.strideDistance : 0) + (isGait ? distance : 0);
  if (!isGait) return 0;
  if (actor.poseFrame === previous.poseFrame) return strideDistance;
  strideDistances.push(strideDistance);
  return 0;
};

function recordActorSample(actor: { x: number; y: number; animationState: string; poseFrame: number }, traces: Map<string, ActorTrace>, id: string, score: { containment: { minX: number; maxX: number; minY: number; maxY: number } }, gaitStates: readonly string[], deltaSeconds: number, inFirstHalf: boolean, into: MetricsAccumulator): void {
  const previous = traces.get(id);
  if (!previous) { traces.set(id, freshTrace(actor)); return; }
  if (isOutsideContainment(actor, score.containment)) into.withinContainment = false;

  const dx = actor.x - previous.x, dy = actor.y - previous.y, distance = Math.hypot(dx, dy);
  const speed = distance / deltaSeconds, accel = (speed - previous.speed) / deltaSeconds, jerk = (accel - previous.accel) / deltaSeconds;
  into.speeds.push(speed); into.accels.push(accel); into.jerks.push(jerk);
  (inFirstHalf ? into.firstHalfSpeeds : into.secondHalfSpeeds).push(speed);

  const heading = distance > 1e-5 ? Math.atan2(dy, dx) : previous.heading;
  into.headingSteps.push(Math.abs(wrapAngle(heading - previous.heading)));
  if (actor.animationState !== previous.animationState) into.transitionJumps.push(Math.abs(speed - previous.speed));

  const strideDistance = nextStrideDistance(actor, previous, gaitStates, distance, into.strideDistances);
  traces.set(id, { x: actor.x, y: actor.y, speed, accel, heading, animationState: actor.animationState, poseFrame: actor.poseFrame, strideDistance });
}

const buildMetrics = (sceneId: SceneId, seed: number, mode: SceneMotionMode, score: { maxSpeed: number; maxAcceleration: number; durationMs: number }, data: MetricsAccumulator): SceneMotionMetrics => ({
  sceneId, seed, mode, sampleCount: data.speeds.length,
  p95SpeedRatio: percentile(data.speeds, .95) / score.maxSpeed, maxSpeedRatio: Math.max(0, ...data.speeds) / score.maxSpeed,
  p95AccelRatio: percentile(data.accels.map(Math.abs), .95) / score.maxAcceleration, maxAccelRatio: Math.max(0, ...data.accels.map(Math.abs)) / score.maxAcceleration,
  rmsJerk: rootMeanSquare(data.jerks), maxHeadingStepRadians: Math.max(0, ...data.headingSteps),
  maxTransitionSpeedJump: Math.max(0, ...data.transitionJumps), poseCadenceCoV: coefficientOfVariation(data.strideDistances),
  firstHalfP95SpeedRatio: percentile(data.firstHalfSpeeds, .95) / score.maxSpeed, secondHalfP95SpeedRatio: percentile(data.secondHalfSpeeds, .95) / score.maxSpeed,
  withinContainment: data.withinContainment,
});

function collectSceneMetrics(sceneId: SceneId, seed: number, mode: SceneMotionMode, variants: VariantSelection = defaultSessionVariant): SceneMotionMetrics {
  const score = getSceneScore(sceneId), manifest = getContentManifest(sceneId);
  const engine = createSceneSimulationEngine(score, manifest.audio ? { enabled: manifest.audio.sourceCoherent } : undefined, variants, seed, { playbackMode: "tablet-touch", sceneMotionMode: mode });
  const deltaSeconds = METRICS_DELTA_MS / 1000, gaitStates = GAIT_STATES[sceneId], data = newAccumulator();
  const traces = new Map<string, ActorTrace>();
  for (const actor of engine.snapshot().actors) traces.set(actor.id, freshTrace(actor));

  let snapshot = engine.snapshot();
  while (!snapshot.complete) {
    snapshot = engine.advance(METRICS_DELTA_MS);
    // The finale phase forces every actor to an immediate, visible stop (a distinct, pre-existing
    // contact/phase mechanism in actorMotion.ts's pauseActor, not per-creature motion) so its one
    // deterministic hard stop is excluded here rather than measured as authored creature motion.
    if (snapshot.phase === "finale") continue;
    const inFirstHalf = snapshot.elapsedMs <= score.durationMs / 2;
    for (const actor of snapshot.actors) recordActorSample(actor, traces, actor.id, score, gaitStates, deltaSeconds, inFirstHalf, data);
  }

  return buildMetrics(sceneId, seed, mode, score, data);
}

const allMetrics: SceneMotionMetrics[] = [];
for (const sceneId of sceneIds) for (const seed of SEEDS) for (const mode of MODES) allMetrics.push(collectSceneMetrics(sceneId, seed, mode));
const metricsFor = (sceneId: string, seed: number, mode: SceneMotionMode): SceneMotionMetrics =>
  allMetrics.find((metrics) => metrics.sceneId === sceneId && metrics.seed === seed && metrics.mode === mode)!;

describe("creature motion metrics: hard constraints", () => {
  it("keeps speed within the authored ceiling for every scene, seed and motion mode", () => {
    for (const metrics of allMetrics) expect(metrics.maxSpeedRatio, `${metrics.sceneId} seed ${metrics.seed} ${metrics.mode}`).toBeLessThanOrEqual(SPEED_TOLERANCE);
  });

  it("keeps typical acceleration within the authored ceiling for every scene, seed and motion mode", () => {
    for (const metrics of allMetrics) expect(metrics.p95AccelRatio, `${metrics.sceneId} seed ${metrics.seed} ${metrics.mode}`).toBeLessThanOrEqual(ACCEL_P95_TOLERANCE);
  });

  it("keeps low motion mode calmer than standard for every scene and seed", () => {
    for (const sceneId of sceneIds) for (const seed of SEEDS) {
      const standard = metricsFor(sceneId, seed, "standard"), low = metricsFor(sceneId, seed, "low");
      expect(low.p95SpeedRatio, sceneId).toBeLessThan(standard.p95SpeedRatio);
    }
  });

  it("never lets motion escalate across a session", () => {
    for (const metrics of allMetrics) {
      if (metrics.firstHalfP95SpeedRatio < 1e-6) continue;
      expect(metrics.secondHalfP95SpeedRatio, `${metrics.sceneId} seed ${metrics.seed} ${metrics.mode}`).toBeLessThanOrEqual(metrics.firstHalfP95SpeedRatio * NO_ESCALATION_TOLERANCE);
    }
  });

  it("keeps every actor within its scene's authored containment frame", () => {
    for (const metrics of allMetrics) expect(metrics.withinContainment, `${metrics.sceneId} seed ${metrics.seed} ${metrics.mode}`).toBe(true);
  });

  it("is fully deterministic for a repeated seed", () => {
    for (const sceneId of sceneIds) expect(collectSceneMetrics(sceneId, 11, "standard")).toEqual(collectSceneMetrics(sceneId, 11, "standard"));
  });

  it("produces only finite, well-formed measurements", () => {
    for (const metrics of allMetrics) {
      expect(metrics.sampleCount).toBeGreaterThan(0);
      expect(Number.isFinite(metrics.rmsJerk)).toBe(true);
      expect(Number.isFinite(metrics.maxHeadingStepRadians)).toBe(true);
      expect(Number.isFinite(metrics.maxTransitionSpeedJump)).toBe(true);
    }
  });
});

describe("creature motion metrics: transitions and gait", () => {
  it("keeps velocity discontinuities at behaviour-state transitions small relative to one authored acceleration step", () => {
    for (const metrics of allMetrics) {
      const allowedJump = getSceneScore(metrics.sceneId).maxAcceleration * (50 / 1000) * 3; // a few fixed steps of headroom for the ease window itself
      expect(metrics.maxTransitionSpeedJump, `${metrics.sceneId} seed ${metrics.seed} ${metrics.mode}`).toBeLessThanOrEqual(allowedJump);
    }
  });

  it("keeps gait cadence tracking actual speed for every walking or flapping creature", () => {
    for (const metrics of allMetrics) {
      if (Number.isNaN(metrics.poseCadenceCoV)) continue; // koi and red-string have no gait state
      expect(metrics.poseCadenceCoV, `${metrics.sceneId} seed ${metrics.seed} ${metrics.mode}`).toBeLessThan(.9);
    }
  });
});
