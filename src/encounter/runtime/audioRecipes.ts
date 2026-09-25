/** Pure, browser-free voice plans for synthesized scene sound. No Web Audio types here. */

export interface GainPoint { readonly atMs: number; readonly gain: number; }
export interface OscillatorLayer {
  readonly kind: "oscillator";
  readonly waveform: "sine";
  /** Linear glide from the first frequency to the second, in Hz. */
  readonly frequencyHz: readonly [number, number];
  readonly filterCutoffHz: number;
  readonly gain: readonly GainPoint[];
}
export interface NoiseLayer {
  readonly kind: "noise";
  readonly filterType: "lowpass" | "highpass" | "bandpass";
  readonly filterCutoffHz: number;
  readonly filterQ: number;
  readonly gain: readonly GainPoint[];
}
export type VoiceLayer = OscillatorLayer | NoiseLayer;
export interface VoicePlan { readonly durationMs: number; readonly layers: readonly VoiceLayer[]; }

/** Every layer's peak gain stays at or below this shared ceiling before the master gain stage. */
export const MAX_LAYER_GAIN = 0.8;
/** No partial or filter cutoff exceeds this, keeping every event ordinary and non-ultrasonic. */
export const MAX_FREQUENCY_HZ = 12_000;
/** No onset ramps to peak faster than this, so nothing startles on arrival. */
export const MIN_ATTACK_MS = 15;
/** No synthesized event loops or runs longer than this. */
export const MAX_DURATION_MS = 1_200;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashKind(kind: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < kind.length; index += 1) {
    hash ^= kind.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

const jitter = (random: () => number, min: number, max: number): number => min + (max - min) * random();
const clampHz = (value: number): number => Math.min(MAX_FREQUENCY_HZ, Math.max(0, value));
const silence = (atMs: number): GainPoint => ({ atMs, gain: 0 });

function grainEnvelope(cursor: number, attackMs: number, holdMs: number, releaseMs: number, peakGain: number): GainPoint[] {
  return [silence(cursor), { atMs: cursor + attackMs, gain: peakGain }, { atMs: cursor + attackMs + holdMs, gain: peakGain * 0.5 }, silence(cursor + attackMs + holdMs + releaseMs)];
}

/** A soft 2-3 note chirp with a gentle pitch glide; never a rapid alarm-like trill. */
function ordinaryCallPlan(random: () => number): VoicePlan {
  const noteCount = random() < 0.5 ? 2 : 3;
  const layers: OscillatorLayer[] = [];
  let cursor = 0;
  for (let note = 0; note < noteCount; note += 1) {
    const attackMs = jitter(random, 20, 40);
    const holdMs = jitter(random, 60, 100);
    const releaseMs = jitter(random, 40, 70);
    const startHz = jitter(random, 2_200, 4_200);
    layers.push({
      kind: "oscillator", waveform: "sine", filterCutoffHz: 6_000,
      frequencyHz: [clampHz(startHz), clampHz(startHz + jitter(random, -400, 500))],
      gain: grainEnvelope(cursor, attackMs, holdMs, releaseMs, jitter(random, 0.35, 0.55)),
    });
    cursor += attackMs + holdMs + releaseMs + (note < noteCount - 1 ? jitter(random, 40, 90) : 0);
  }
  return { durationMs: cursor, layers };
}

/** A short band-passed noise flutter with a slow amplitude modulation, about 300ms. */
function wingPlan(random: () => number): VoicePlan {
  const durationMs = jitter(random, 260, 320);
  const period = 1_000 / jitter(random, 10, 16);
  const attackMs = jitter(random, 18, 30);
  const peakGain = jitter(random, 0.3, 0.45);
  const points: GainPoint[] = [silence(0), { atMs: attackMs, gain: peakGain }];
  let cursor = attackMs;
  let crest = true;
  while (cursor + period / 2 < durationMs) {
    cursor += period / 2;
    points.push({ atMs: cursor, gain: crest ? peakGain * 0.35 : peakGain });
    crest = !crest;
  }
  points.push(silence(durationMs));
  return { durationMs, layers: [{ kind: "noise", filterType: "bandpass", filterCutoffHz: jitter(random, 2_400, 4_200), filterQ: jitter(random, 2, 4), gain: points }] };
}

/** A low-passed noise wash plus one to three soft rising bubble blips. */
function quietWaterPlan(random: () => number): VoicePlan {
  const durationMs = jitter(random, 500, 900);
  const washPoints: GainPoint[] = [silence(0), { atMs: jitter(random, 30, 60), gain: jitter(random, 0.25, 0.4) }, { atMs: durationMs - 40, gain: jitter(random, 0.16, 0.28) }, silence(durationMs)];
  const layers: VoiceLayer[] = [{ kind: "noise", filterType: "lowpass", filterCutoffHz: jitter(random, 500, 1_200), filterQ: 0.7, gain: washPoints }];
  const bubbleCount = 1 + Math.floor(random() * 3);
  for (let bubble = 0; bubble < bubbleCount; bubble += 1) {
    const start = jitter(random, 60, Math.max(120, durationMs - 200));
    const startHz = jitter(random, 300, 500);
    layers.push({
      kind: "oscillator", waveform: "sine", filterCutoffHz: 2_000,
      frequencyHz: [clampHz(startHz), clampHz(startHz + jitter(random, 200, 400))],
      gain: grainEnvelope(start, jitter(random, 20, 35), jitter(random, 20, 40), jitter(random, 40, 70), jitter(random, 0.15, 0.3)),
    });
  }
  return { durationMs, layers };
}

/** Light high-passed crackle bursts, about 250ms. */
function paperFlutterPlan(random: () => number): VoicePlan {
  const burstCount = 3 + Math.floor(random() * 3);
  const points: GainPoint[] = [];
  let cursor = 0;
  for (let burst = 0; burst < burstCount; burst += 1) {
    const attackMs = jitter(random, 15, 28);
    const holdMs = jitter(random, 6, 14);
    const releaseMs = jitter(random, 14, 24);
    points.push(...grainEnvelope(cursor, attackMs, holdMs, releaseMs, jitter(random, 0.2, 0.35)));
    cursor += attackMs + holdMs + releaseMs + jitter(random, 10, 22);
  }
  return { durationMs: points.at(-1)!.atMs, layers: [{ kind: "noise", filterType: "highpass", filterCutoffHz: jitter(random, 4_500, 7_500), filterQ: 0.8, gain: points }] };
}

/** Irregular band-passed noise grains, about 300ms. */
function leafScratchPlan(random: () => number): VoicePlan {
  const grainCount = 4 + Math.floor(random() * 3);
  const points: GainPoint[] = [];
  let cursor = 0;
  for (let grain = 0; grain < grainCount; grain += 1) {
    const attackMs = jitter(random, 16, 26);
    const holdMs = jitter(random, 10, 20);
    const releaseMs = jitter(random, 18, 30);
    points.push(...grainEnvelope(cursor, attackMs, holdMs, releaseMs, jitter(random, 0.18, 0.3)));
    cursor += attackMs + holdMs + releaseMs + jitter(random, 8, 20);
  }
  return { durationMs: points.at(-1)!.atMs, layers: [{ kind: "noise", filterType: "bandpass", filterCutoffHz: jitter(random, 1_500, 3_500), filterQ: jitter(random, 1.5, 3), gain: points }] };
}

/** A low-passed noise swoosh, about 500ms. */
function fabricDragPlan(random: () => number): VoicePlan {
  const durationMs = jitter(random, 420, 560);
  const points: GainPoint[] = [silence(0), { atMs: jitter(random, 60, 120), gain: jitter(random, 0.25, 0.4) }, { atMs: durationMs * 0.6, gain: jitter(random, 0.14, 0.28) }, silence(durationMs)];
  return { durationMs, layers: [{ kind: "noise", filterType: "lowpass", filterCutoffHz: jitter(random, 500, 1_000), filterQ: 0.6, gain: points }] };
}

const recipes: Record<string, (random: () => number) => VoicePlan> = {
  "ordinary-call": ordinaryCallPlan,
  wing: wingPlan,
  "quiet-water": quietWaterPlan,
  "paper-flutter": paperFlutterPlan,
  "leaf-scratch": leafScratchPlan,
  "fabric-drag": fabricDragPlan,
};

/** Deterministic per kind and seed; unknown kinds stay silent rather than throwing. */
export function voicePlanFor(kind: string, seed: number): VoicePlan {
  const recipe = recipes[kind];
  if (!recipe) return { durationMs: 0, layers: [] };
  const random = mulberry32((hashKind(kind) ^ Math.imul(seed | 0, 2_654_435_761)) >>> 0);
  return recipe(random);
}
