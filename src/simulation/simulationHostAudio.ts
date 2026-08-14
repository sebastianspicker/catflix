import { ContentManifest } from "../content/types";
import { publicUrl } from "../paths";
import { SoundEvent } from "./types";

export interface SceneAudioPlayer { play(events: readonly SoundEvent[], enabled: boolean): void; silence(): void; }

export function createSceneAudioPlayer(manifest: ContentManifest): SceneAudioPlayer {
  let activeAudio: HTMLAudioElement | undefined;
  const silence = (): void => { activeAudio?.pause(); activeAudio = undefined; };
  const play = (events: readonly SoundEvent[], enabled: boolean): void => {
    if (!enabled || !manifest.audio?.provenance?.some((record) => record.eligible)) return;
    for (const event of events) {
      const provenance = manifest.audio.provenance.find((record) => record.eventKind === event.kind && record.eligible && record.source.startsWith("/assets/"));
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
