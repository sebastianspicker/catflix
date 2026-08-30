import type { SceneId, SceneScore } from "../../domain";
import { compileContentManifest, compileSceneScore } from "./authoredScene";
import { authoredScenes } from "./authoredScenes";
import type { ContentManifest } from "./contentManifest";
import { validateContentManifest } from "./validation";

export type CatalogueThemeFilter = "all" | ContentManifest["catalogue"]["theme"];
export type CatalogueSubjectFilter = "all" | ContentManifest["subjectClass"];
export type CatalogueRhythmFilter = "all" | ContentManifest["catalogue"]["rhythm"];

const authoredSceneList = [
  authoredScenes["balcony-birds"], authoredScenes["koi-pool"], authoredScenes["paper-moth"],
  authoredScenes["beetle-under-the-fern"], authoredScenes["red-string"],
] as const;
const manifests = authoredSceneList.map(compileContentManifest);
const manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
const scoreById = new Map(authoredSceneList.map((scene) => [scene.id, compileSceneScore(scene)] as const));

for (const manifest of manifests) {
  const result = validateContentManifest(manifest);
  if (!result.ok) throw new Error(`Invalid content manifest ${manifest.id}: ${result.errors.join(" ")}`);
}

export function getContentManifest(id: SceneId): ContentManifest {
  const manifest = manifestById.get(id);
  if (!manifest) throw new Error(`Unknown content manifest ${id}.`);
  return manifest;
}

export function listContentManifests(): readonly ContentManifest[] { return [...manifests]; }

/** Read model used by the catalogue UI. The authored manifest remains the source of truth. */
export function matchesCatalogueFilters(
  manifest: ContentManifest,
  theme: CatalogueThemeFilter,
  subject: CatalogueSubjectFilter,
  rhythm: CatalogueRhythmFilter,
): boolean {
  return (theme === "all" || manifest.catalogue.theme === theme)
    && (subject === "all" || manifest.subjectClass === subject)
    && (rhythm === "all" || manifest.catalogue.rhythm === rhythm);
}

export function getSceneScore(id: SceneId): SceneScore {
  const score = scoreById.get(id);
  if (!score) throw new Error(`Unknown scene: ${id}`);
  return score;
}
