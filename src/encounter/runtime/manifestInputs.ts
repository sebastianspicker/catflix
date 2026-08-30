import type { ContentManifest } from "../../catalogue/model";
import type { EncounterAudioMetadata } from "../engine/sceneAudio";
import type { AudioPlaybackMetadata } from "./audio";
import type { EncounterVisualAssets } from "./canvasRenderer";

/** Converts authored manifest fields at the browser boundary; renderers never query a catalogue. */
export const encounterVisualAssets = (manifest: ContentManifest): EncounterVisualAssets => ({
  backgroundUrl: manifest.visuals.backgroundPlateUrl,
  poseSheetUrl: manifest.visuals.subjectPoseSheetUrl,
  ...(manifest.visuals.ropeTextureUrl ? { ropeTextureUrl: manifest.visuals.ropeTextureUrl } : {}),
});

export const encounterAudioMetadata = (manifest: ContentManifest): EncounterAudioMetadata | undefined =>
  manifest.audio ? { enabled: manifest.audio.sourceCoherent } : undefined;

export const audioPlaybackMetadata = (manifest: ContentManifest): AudioPlaybackMetadata | undefined =>
  manifest.audio ? { provenance: manifest.audio.provenance } : undefined;
