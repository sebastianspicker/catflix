import { afterEach, describe, expect, it, vi } from "vitest";
import type { SoundEvent } from "../../domain";
import { createSceneAudioPlayer, MASTER_GAIN, type AudioPlaybackMetadata } from "./audio";
import { voicePlanFor, type VoicePlan } from "./audioRecipes";

const SILENCE_FADE_SECONDS = 0.05;
const fixedPlan: VoicePlan = {
  durationMs: 100,
  layers: [{ kind: "oscillator", waveform: "sine", frequencyHz: [400, 500], filterCutoffHz: 2_000, gain: [{ atMs: 0, gain: 0 }, { atMs: 20, gain: 0.4 }, { atMs: 100, gain: 0 }] }],
};
vi.mock("./audioRecipes", () => ({ voicePlanFor: vi.fn(() => fixedPlan) }));

interface FakeParam { value: number; setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; cancelScheduledValues: ReturnType<typeof vi.fn>; }
interface FakeNode { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; }
interface FakeGain extends FakeNode { gain: FakeParam; }
interface FakePanner extends FakeNode { pan: FakeParam; }
interface FakeSource extends FakeNode { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn>; }

function fakeParam(initial: number): FakeParam {
  return { value: initial, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() };
}
function fakeNode(): FakeNode {
  return { connect: vi.fn(), disconnect: vi.fn() };
}
function fakeSource(): FakeSource {
  return { ...fakeNode(), start: vi.fn(), stop: vi.fn(), addEventListener: vi.fn() };
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44_100;
  destination = fakeNode();
  createdSources: FakeSource[] = [];
  createdPanners: FakePanner[] = [];
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
  createGain(): FakeGain { return { ...fakeNode(), gain: fakeParam(1) }; }
  createBiquadFilter(): FakeNode & { type: string; frequency: FakeParam; Q: FakeParam } { return { ...fakeNode(), type: "lowpass", frequency: fakeParam(0), Q: fakeParam(1) }; }
  createDynamicsCompressor(): FakeNode { return fakeNode(); }
  createStereoPanner(): FakePanner {
    const panner = { ...fakeNode(), pan: fakeParam(0) };
    this.createdPanners.push(panner);
    return panner;
  }
  createBuffer(): { getChannelData(): Float32Array } { return { getChannelData: () => new Float32Array(4) }; }
  createOscillator(): FakeSource & { type: string; frequency: FakeParam } {
    const source = { ...fakeSource(), type: "sine", frequency: fakeParam(0) };
    this.createdSources.push(source);
    return source;
  }
  createBufferSource(): FakeSource & { buffer: unknown; loop: boolean } {
    const source = { ...fakeSource(), buffer: null, loop: false };
    this.createdSources.push(source);
    return source;
  }
}

const metadata: AudioPlaybackMetadata = { provenance: [{ eventKind: "wing", source: "Synthesized in the browser by Catflix", license: "Original work (MIT)", eligible: true }] };
const event = (atMs = 0): SoundEvent => ({ kind: "wing", x: 1.5, y: 0.5, atMs });

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("createSceneAudioPlayer", () => {
  it("creates no audio nodes before enable", () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    player.play([event()], true);
    expect(context.createdSources).toHaveLength(0);
  });

  it("plays no sound while the owner has sound disabled", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    player.play([event()], false);
    expect(context.createdSources).toHaveLength(0);
  });

  it("resumes the context synchronously inside enable, before the recipe module loads", () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    void player.enable();
    expect(context.resume).toHaveBeenCalledOnce();
  });

  it("scales the master gain to the quiet constant", async () => {
    const context = new FakeAudioContext();
    let masterGain: ReturnType<FakeAudioContext["createGain"]> | undefined;
    const originalCreateGain = context.createGain.bind(context);
    context.createGain = () => { const node = originalCreateGain(); if (!masterGain) masterGain = node; return node; };
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    expect(masterGain?.gain.value).toBe(MASTER_GAIN);
  });

  it("plays at most one voice at a time, fading out the previous one", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    player.play([event(0)], true);
    const first = context.createdSources[0]!;
    player.play([event(200)], true);
    expect(first.stop).toHaveBeenCalled();
    expect(context.createdSources).toHaveLength(2);
  });

  it("clamps stereo pan to the shared range", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    player.play([event()], true);
    expect(context.createdPanners[0]!.pan.value).toBe(0.6);
  });

  it("fades silence out instead of cutting sound off abruptly", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    player.play([event()], true);
    player.silence();
    const source = context.createdSources[0]!;
    expect(source.stop).toHaveBeenCalledWith(SILENCE_FADE_SECONDS);
  });

  it("keeps the shared pan and gain connected until every layer of a multi-note voice has ended", async () => {
    const twoLayerPlan: VoicePlan = {
      durationMs: 100,
      layers: [
        { kind: "oscillator", waveform: "sine", frequencyHz: [400, 400], filterCutoffHz: 2_000, gain: [{ atMs: 0, gain: 0 }, { atMs: 20, gain: 0.3 }, { atMs: 40, gain: 0 }] },
        { kind: "oscillator", waveform: "sine", frequencyHz: [400, 400], filterCutoffHz: 2_000, gain: [{ atMs: 0, gain: 0 }, { atMs: 20, gain: 0.3 }, { atMs: 100, gain: 0 }] },
      ],
    };
    vi.mocked(voicePlanFor).mockReturnValueOnce(twoLayerPlan);
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    player.play([event()], true);
    const [early, late] = context.createdSources;
    const panner = context.createdPanners[0]!;
    (early!.addEventListener.mock.calls[0]![1] as () => void)();
    expect(panner.disconnect).not.toHaveBeenCalled();
    (late!.addEventListener.mock.calls[0]![1] as () => void)();
    expect(panner.disconnect).toHaveBeenCalled();
  });

  it("closes the context on destroy", async () => {
    const context = new FakeAudioContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    player.destroy();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("does nothing when Web Audio is unavailable", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const player = createSceneAudioPlayer(metadata);
    await player.enable();
    player.play([event()], true);
    expect(() => player.silence()).not.toThrow();
  });
});
