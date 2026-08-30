import { publicUrl } from "../../paths";
import type { SoundEvent } from "../../domain";

export interface SceneAudioPlayer { play(events: readonly SoundEvent[], enabled: boolean): void; silence(): void; }

export interface AudioPlaybackMetadata {
  provenance?: readonly { eventKind: string; source: string; license: string; eligible: boolean }[];
}

export function createSceneAudioPlayer(audioMetadata: AudioPlaybackMetadata | undefined): SceneAudioPlayer {
  let activeAudio: HTMLAudioElement | undefined;
  const silence = (): void => { activeAudio?.pause(); activeAudio = undefined; };
  const play = (events: readonly SoundEvent[], enabled: boolean): void => {
    if (!enabled || !audioMetadata?.provenance?.some((record) => record.eligible)) return;
    for (const event of events) {
      const provenance = audioMetadata.provenance.find((record) => record.eventKind === event.kind && record.eligible && record.source.startsWith("/assets/"));
      if (!provenance) continue;
      silence();
      activeAudio = new Audio(publicUrl(provenance.source));
      activeAudio.volume = 0.08;
      void activeAudio.play().catch(() => undefined);
      break; // At most one audible event at a time.
    }
  };
  return { play, silence };
}
