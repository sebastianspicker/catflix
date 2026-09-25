import type { SoundEvent } from "../../domain";
import type { GainPoint, VoiceLayer, VoicePlan } from "./audioRecipes";

export interface SceneAudioPlayer {
  play(events: readonly SoundEvent[], enabled: boolean): void;
  /** Must be called synchronously from the owner's click, so iOS/Safari accepts the gesture. */
  enable(): Promise<void>;
  silence(): void;
  destroy(): void;
}

export interface AudioPlaybackMetadata {
  provenance?: readonly { eventKind: string; source: string; license: string; eligible: boolean }[] | undefined;
}

/** Quiet, household-level master output; the same ceiling the old element volume used. */
export const MASTER_GAIN = 0.08;
/** No ultrasonic content ever reaches the speaker, even if a layer misbehaves. */
const MASTER_LOWPASS_HZ = 12_000;
const SILENCE_FADE_SECONDS = 0.05;

interface MasterChain { context: AudioContext; master: GainNode; }
interface ActiveVoice { fadeOut(): void; }

function resolveAudioContextClass(): typeof AudioContext | undefined {
  const scope = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

/** Lets the UI report the sound toggle as unavailable when Web Audio itself is missing. */
export function isWebAudioSupported(): boolean {
  return resolveAudioContextClass() !== undefined;
}

function createMasterChain(context: AudioContext): MasterChain {
  const master = context.createGain();
  master.gain.value = MASTER_GAIN;
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = MASTER_LOWPASS_HZ;
  const compressor = context.createDynamicsCompressor();
  master.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(context.destination);
  return { context, master };
}

function clampPan(x: number): number {
  return Math.max(-0.6, Math.min(0.6, (x - 0.5) * 1.2));
}

function scheduleGain(param: AudioParam, points: readonly GainPoint[], now: number): void {
  points.forEach((point, index) => {
    const at = now + point.atMs / 1_000;
    if (index === 0) param.setValueAtTime(point.gain, at);
    else param.linearRampToValueAtTime(point.gain, at);
  });
}

function noiseBuffer(context: AudioContext, cache: { buffer?: AudioBuffer }): AudioBuffer {
  if (cache.buffer) return cache.buffer;
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  cache.buffer = buffer;
  return buffer;
}

function buildLayer(context: AudioContext, layer: VoiceLayer, destination: AudioNode, now: number, cache: { buffer?: AudioBuffer }): AudioScheduledSourceNode {
  const gainNode = context.createGain();
  scheduleGain(gainNode.gain, layer.gain, now);
  const filter = context.createBiquadFilter();
  filter.type = layer.kind === "oscillator" ? "lowpass" : layer.filterType;
  filter.frequency.value = layer.filterCutoffHz;
  if (layer.kind === "noise") filter.Q.value = layer.filterQ;
  filter.connect(gainNode);
  gainNode.connect(destination);
  const endSeconds = now + (layer.gain.at(-1)?.atMs ?? 0) / 1_000;
  if (layer.kind === "oscillator") {
    const oscillator = context.createOscillator();
    oscillator.type = layer.waveform;
    oscillator.frequency.setValueAtTime(layer.frequencyHz[0], now);
    oscillator.frequency.linearRampToValueAtTime(layer.frequencyHz[1], endSeconds);
    oscillator.connect(filter);
    oscillator.start(now);
    oscillator.stop(endSeconds);
    return oscillator;
  }
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context, cache);
  source.loop = true;
  source.connect(filter);
  source.start(now);
  source.stop(endSeconds);
  return source;
}

function scheduleVoice(chain: MasterChain, plan: VoicePlan, x: number, cache: { buffer?: AudioBuffer }): ActiveVoice {
  const { context } = chain;
  const now = context.currentTime;
  const pan = context.createStereoPanner();
  pan.pan.value = clampPan(x);
  const voiceGain = context.createGain();
  pan.connect(voiceGain);
  voiceGain.connect(chain.master);
  const sources = plan.layers.map((layer) => buildLayer(context, layer, pan, now, cache));
  const teardown = (): void => { pan.disconnect(); voiceGain.disconnect(); };
  // Disconnect only once every layer (not just the first to finish) has ended.
  let layersRemaining = sources.length;
  sources.forEach((source) => { source.addEventListener("ended", () => { layersRemaining -= 1; if (layersRemaining <= 0) teardown(); }, { once: true }); });
  if (sources.length === 0) teardown();
  return {
    fadeOut: (): void => {
      const fadeEnd = context.currentTime + SILENCE_FADE_SECONDS;
      voiceGain.gain.cancelScheduledValues(context.currentTime);
      voiceGain.gain.setValueAtTime(voiceGain.gain.value, context.currentTime);
      voiceGain.gain.linearRampToValueAtTime(0, fadeEnd);
      sources.forEach((source) => { try { source.stop(fadeEnd); } catch { /* already scheduled */ } });
    },
  };
}

export function createSceneAudioPlayer(audioMetadata: AudioPlaybackMetadata | undefined): SceneAudioPlayer {
  const isEligibleKind = (kind: string): boolean => audioMetadata?.provenance?.some((record) => record.eventKind === kind && record.eligible) ?? false;
  const noiseBufferCache: { buffer?: AudioBuffer } = {};
  let chain: MasterChain | undefined;
  let recipes: typeof import("./audioRecipes") | undefined;
  let activeVoice: ActiveVoice | undefined;

  const silence = (): void => { activeVoice?.fadeOut(); activeVoice = undefined; };

  const enable = async (): Promise<void> => {
    const AudioContextClass = resolveAudioContextClass();
    if (!AudioContextClass) return;
    if (!chain) chain = createMasterChain(new AudioContextClass());
    void chain.context.resume().catch(() => undefined);
    if (!recipes) recipes = await import("./audioRecipes");
  };

  const play = (events: readonly SoundEvent[], enabled: boolean): void => {
    if (!enabled || !chain || !recipes) return;
    for (const event of events) {
      if (!isEligibleKind(event.kind)) continue;
      activeVoice?.fadeOut(); // Never cut a sounding voice off abruptly.
      activeVoice = scheduleVoice(chain, recipes.voicePlanFor(event.kind, event.atMs), event.x, noiseBufferCache);
      break; // At most one audible voice at a time.
    }
  };

  const destroy = (): void => {
    silence();
    void chain?.context.close().catch(() => undefined);
    chain = undefined;
  };

  return { play, enable, silence, destroy };
}
