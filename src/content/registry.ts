import { ContentManifest, SceneId, sceneIds, validateContentManifest } from "./types";

const revision = "2026.07.29.1";
const repositoryPlate = (assetId: string, source: string, checksum: string) => ({
  assetId,
  creator: "Existing Catflix project asset; original creator not recorded",
  source,
  license: "Internal project use; clearance status must be confirmed before publication",
  derivativeHistory: ["Retained as the 16:9 background plate without modification"],
  checksum,
  masteringFormat: "png" as const,
  contentRevision: revision,
});
const browserDelivery = (assetId: string, source: string, checksum: string, masteringFormat: "webp" | "avif") => ({ assetId, creator: "Existing Catflix project asset; original creator not recorded", source, license: "Internal project use; clearance status must be confirmed before publication", derivativeHistory: [`Encoded from the checksummed PNG master as ${masteringFormat.toUpperCase()}`], checksum, masteringFormat, contentRevision: revision });
const generatedAtlas = (assetId: string) => ({ assetId, creator: "Catflix studio with OpenAI image generation", source: "/assets/simulation-atlas.webp", license: "Project-generated asset; use subject to OpenAI terms", derivativeHistory: ["Generated as a chroma-key sprite sheet", "Chroma removed locally with a soft matte and despill", "Losslessly encoded as WebP for browser delivery"], checksum: "437fb321450b0d4f4235006eda9ae5c9b8cebf11d15e27f16bf75aeed3381fd8", masteringFormat: "webp" as const, contentRevision: revision });
const generatedPoseSheet = (assetId: string, source: string, checksum: string) => ({
  assetId,
  creator: "Catflix studio with OpenAI image generation",
  source,
  license: "Project-generated asset; use subject to OpenAI terms",
  derivativeHistory: ["Generated from the existing poster as an art-direction reference on a flat removable matte", "Chroma removed locally with a soft matte and despill", "Validated as an RGBA 4 by 2 pose package for local browser delivery"],
  checksum,
  masteringFormat: "png" as const,
  contentRevision: revision,
});
const generatedBackground = (assetId: string, source: string, checksum: string) => ({
  assetId,
  creator: "Catflix studio with OpenAI image generation",
  source,
  license: "Project-generated asset; use subject to OpenAI terms",
  derivativeHistory: ["Edited from the existing Catflix poster to remove the baked-in subject", "Reconstructed as a clean cinematic environment plate", "Cropped and encoded to a 1920 by 1080 WebP runtime master"],
  checksum,
  masteringFormat: "webp" as const,
  contentRevision: revision,
});
const generatedRopeTile = () => ({ assetId: "red-string-rope-tile-v2", creator: "Catflix studio with OpenAI image generation", source: "/assets/scenes/v2/red-string-tile.png", license: "Project-generated asset; use subject to OpenAI terms", derivativeHistory: ["Cropped from the checksummed red-string texture package", "Rotated and resized into a transparent horizontal Phaser rope texture"], checksum: "63f56af6fb79fccbeed32e20621a6675ffd4b12a5bf3e7905b8efb37308ad28c", masteringFormat: "png" as const, contentRevision: revision });
const apparentSize = (minimum: number, maximum: number) => ({ frameWidthPercent: [minimum, maximum] as const, intendedViewingDistance: "mixed" as const, visualAngle: "device-dependent" as const, basis: "editorial-legibility" as const });
const encounterCopy: Record<SceneId, readonly [string, string, string, string]> = {
  "balcony-birds": ["Four perch-to-perch encounters with one short rail flight and plausible planter or rail occlusion.", "A bird remains visibly settled on a perch while the scene dims.", "A perched bird turns or makes one adjacent hop; a moving bird settles at the next safe perch.", "Perches and the short rail corridor keep the bird against uncluttered sky and masonry."],
  "koi-pool": ["Three long curved passages with gradual turns, reflected light, and plant-shadow occlusion.", "Calm water remains with one visible fish in a slow glide.", "Contact creates one coherent ripple event and a slow curved redirect.", "Broad, separated arcs avoid confusing multi-fish crossings and reflected highlights."],
  "paper-moth": ["Five short heading-persistent flutter-and-land passages with frame and lamp occlusion.", "The moth remains visibly landed rather than escaping through an edge.", "A moving moth reroutes once or lands nearby; a landed moth adjusts its wings once and stays still.", "The flight corridor crosses subdued wall and window fields with longer still landings."],
  "beetle-under-the-fern": ["Four grounded fern-margin crossings with antenna pauses and brief shelter states.", "The beetle remains partially legible and settled under cover.", "Contact pauses, reverses, or guides the beetle beneath the nearest fern without a faster scurry.", "Ground paths follow quiet fern margins and avoid dense leaf-litter texture."],
  "red-string": ["Five bounded tension-and-slack passages with coherent spline movement and partial edge exits.", "The string resolves into a visible sculptural slack curve.", "Contact changes local tension once, producing one controlled pull or slack response.", "The spline remains on a neutral surface and edge exits never repeat as a chase loop."],
};
const encounterMetadata = (id: SceneId) => {
  const [authoredScore, finale, contactResponseSemantics, targetCorridorRationale] = encounterCopy[id];
  return { encounter: { authoredScore, finale, presentation: { tablet: { distance: "near-screen" as const, frameWidthPercent: [8, 22] as const }, television: { distance: "room-display" as const, frameWidthPercent: [10, 24] as const } }, targetCorridorRationale, backgroundComplexityRationale: "The authored route avoids the plate's highest-frequency texture so the subject remains locally separable.", contactResponseSemantics, restBehavior: "Three accepted contacts within 20 seconds trigger a 10 to 12 second quiet rest. This is an editorial safety cap, not a validated feline threshold.", riskRationale: { edgeExits: "Partial exits are bounded and re-entry remains spatially coherent.", repeatedContact: "Responses settle motion and never add speed, actors, sound, contrast, or duration.", occlusion: "Cover is brief, authored, and followed by reappearance from a plausible location.", audio: "Playback starts muted; source-coherent events require cleared provenance before publication." }, editorialClaims: [{ claim: "Coherent motion and local figure-ground separation support legibility and tracking without establishing enjoyment.", evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", confidence: "limited" as const }] } };
};

const rawContentRegistry: Readonly<Record<SceneId, ContentManifest>> = {
  "balcony-birds": {
    ...encounterMetadata("balcony-birds"),
    id: "balcony-birds", title: "Balcony Birds", revision, subjectClass: "bird",
    apparentSizeGuidance: "Keep the bird clearly legible at the intended viewing distance.",
    apparentSize: apparentSize(9, 14),
    contrast: { natural: "Muted balcony daylight.", enhanced: "Separated bird and balcony values." },
    motionProfile: "Perching, head turns, hops, and occasional short flights.", occlusion: "Rail and planter edge occlusion.",
    motion: { apparentSpeed: "measured", trajectory: ["curved", "direct"], intermittency: "continuous-with-pauses", directionChanges: "gentle", entranceEdges: ["left", "right"], exitEdges: ["left", "right"], acceleration: "brief", occlusion: { frequency: "occasional", duration: "brief" } },
    supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["no-alarm-calls", "no-distress-sounds", "no-auto-replay"],
    evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "limited", noveltyFamily: "balcony wildlife", posterUrl: "/assets/balcony-birds.webp", finiteDurationMs: 105_000,
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/balcony-birds-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/balcony-birds-poses.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate head-turn and short-flight pose sequence using the same individual and lighting." },
    audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, eventKinds: ["ordinary-call", "wing"], excluded: ["alarm", "distress", "continuous-repeat"] },
    assets: [repositoryPlate("balcony-birds-master", "/assets/balcony-birds.png", "919e9acad40ccb07ffcad49f6fbc517b1b149fb34457b39cc800ee1056696db6"), browserDelivery("balcony-birds-webp", "/assets/balcony-birds.webp", "b6ccd4a71c045d0665e1a7dbc28b08cd07f2ac535f4234dec17fc28ea7f30071", "webp"), browserDelivery("balcony-birds-avif", "/assets/balcony-birds.avif", "7d4c3e28330e46d6410af6efb89886bd08fdcfbfd6bc6afea9d01da1fe8310fb", "avif"), generatedAtlas("balcony-birds-atlas-v1"), generatedPoseSheet("balcony-birds-poses-v2", "/assets/scenes/v2/balcony-birds-poses.png", "6667e437954e6d5f98b60d33a50d76fad2d641a10579b46d7faefbfc652b7b63"), generatedBackground("balcony-birds-background-v2", "/assets/scenes/v2/balcony-birds-background.webp", "d1951880a0035d7de30f225dedff93ba9a3a52095417340f51cb916079f3b525")],
  },
  "koi-pool": {
    ...encounterMetadata("koi-pool"),
    id: "koi-pool", title: "Koi Pool", revision, subjectClass: "fish", apparentSizeGuidance: "Keep the single fish clearly separated from reflections.", apparentSize: apparentSize(7, 10),
    contrast: { natural: "Pond reflections and natural fish colour.", enhanced: "Fish retain separation through reflections." },
    motionProfile: "Slow curved paths, turns, and partial plant-shadow occlusion.", occlusion: "Plant shadow and lily edge occlusion.",
    motion: { apparentSpeed: "slow", trajectory: ["curved"], intermittency: "continuous", directionChanges: "gentle", entranceEdges: ["left", "right"], exitEdges: ["left", "right"], acceleration: "gentle", occlusion: { frequency: "recurring", duration: "variable" } },
    supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["no-invented-fish-vocals", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "limited", noveltyFamily: "water movement", finiteDurationMs: 120_000,
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/koi-pool-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/koi-pool-poses.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate curved-body turn sequence using the same koi and pond lighting." },
    posterUrl: "/assets/koi.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, ambience: "water", eventKinds: ["quiet-water"], excluded: ["fish-vocalization", "music"] }, assets: [repositoryPlate("koi-pool-master", "/assets/koi.png", "6688efbb59f3a6944bce9b9a6bc4722eeab2135fcf49901d6087d4e4f2610eab"), browserDelivery("koi-webp", "/assets/koi.webp", "61e733b389f64d9b679b482e096e49e5155dae3a008419f9c961ceb7faec41fd", "webp"), browserDelivery("koi-avif", "/assets/koi.avif", "cbb4a8b2721b7914249fc15dd73326d49c39e912435f421d3be6b645ff28a5f4", "avif"), generatedAtlas("koi-atlas-v1"), generatedPoseSheet("koi-pool-poses-v2", "/assets/scenes/v2/koi-pool-poses.png", "7bff1f871f131e8be3908228155332cfc0e456f3cc740dbb7929b822b162a9c2"), generatedBackground("koi-pool-background-v2", "/assets/scenes/v2/koi-pool-background.webp", "756d498bca92cf8e2fce7108747afefa7664846b2ace41dbdf2d782f9adf2235")],
  },
  "paper-moth": {
    ...encounterMetadata("paper-moth"),
    id: "paper-moth", title: "Paper Moth", revision, subjectClass: "insect", apparentSizeGuidance: "Maintain a distinct paper-moth silhouette.", apparentSize: apparentSize(6, 13),
    contrast: { natural: "Paper against a subdued wall.", enhanced: "Clear silhouette against a simplified field." }, motionProfile: "Intermittent flutter, landing pauses, disappearances, and coherent re-entry.", occlusion: "Brief authored exits and re-entry behind a frame edge.",
    motion: { apparentSpeed: "variable", trajectory: ["fluttering", "authored"], intermittency: "intermittent", directionChanges: "frequent", entranceEdges: ["top", "left", "right"], exitEdges: ["top", "left", "right"], acceleration: "brief", occlusion: { frequency: "occasional", duration: "brief" } },
    supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["bounded-touch", "no-edge-escape-loop", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "limited", noveltyFamily: "fluttering paper", finiteDurationMs: 90_000,
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/paper-moth-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/paper-moth-poses.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate landing and bank pose sequence using the same paper moth and lamp edge light." },
    posterUrl: "/assets/paper-moth.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, eventKinds: ["paper-flutter"], excluded: ["continuous-loop", "ultrasonic"] }, assets: [repositoryPlate("paper-moth-master", "/assets/paper-moth.png", "fcbfc2a5b83c9fec292bb11ee2b9ae50bed0abe0b1d62bed72ed64c7db3512a6"), browserDelivery("paper-moth-webp", "/assets/paper-moth.webp", "4888663c0a2d53d1e4bbf3547c4dfe3bfc1e6111490b8bc8b78f38f80aa11775", "webp"), browserDelivery("paper-moth-avif", "/assets/paper-moth.avif", "72ddaa0960a5e7a23402ce85a5d921c01ea0ce09dccef002815537be97f3241c", "avif"), generatedAtlas("paper-moth-atlas-v1"), generatedPoseSheet("paper-moth-poses-v2", "/assets/scenes/v2/paper-moth-poses.png", "ec470c699d36543e9be100fdd08deda50e345a56d3734ccc710f3d0a8a25fdc3"), generatedBackground("paper-moth-background-v2", "/assets/scenes/v2/paper-moth-background.webp", "c582a2438d917e8c6e9ad2d3af353e9b365cbcadb225ff0d0214fbde170f48f3")],
  },
  "beetle-under-the-fern": {
    ...encounterMetadata("beetle-under-the-fern"),
    id: "beetle-under-the-fern", title: "Beetle Under the Fern", revision, subjectClass: "insect", apparentSizeGuidance: "Keep the ground-level silhouette distinct from leaf texture.", apparentSize: apparentSize(7, 10),
    contrast: { natural: "Leaf-litter ground plane.", enhanced: "Beetle separates from simplified leaf texture." }, motionProfile: "Crawling, pauses, antenna motion, edge entry, and leaf occlusion.", occlusion: "Fern leaves partially cover the route.", supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["bounded-touch", "no-edge-escape-loop", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "limited", noveltyFamily: "ground insect", finiteDurationMs: 95_000,
    motion: { apparentSpeed: "slow", trajectory: ["grounded", "direct"], intermittency: "continuous-with-pauses", directionChanges: "gentle", entranceEdges: ["left", "right", "bottom"], exitEdges: ["left", "right", "bottom"], acceleration: "gentle", occlusion: { frequency: "recurring", duration: "variable" } },
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/beetle-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/beetle-poses.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate antenna and gait cycle using the same beetle and raking light." },
    posterUrl: "/assets/beetle.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, ambience: "leaves", eventKinds: ["leaf-scratch"], excluded: ["continuous-loop", "ultrasonic"] }, assets: [repositoryPlate("beetle-fern-master", "/assets/beetle.png", "433d5f3e195ae38370eedc129dfcc6e699cd7109abd34580ba806ce09850e800"), browserDelivery("beetle-webp", "/assets/beetle.webp", "89203ef77615a75391a208a2cb1253591373b892de0245244b9d006b9402368e", "webp"), browserDelivery("beetle-avif", "/assets/beetle.avif", "d99e87eacf24105163977aedbb8ecb25993a3ece3ea3e815098d55c3efab60cf", "avif"), generatedAtlas("beetle-atlas-v1"), generatedPoseSheet("beetle-poses-v2", "/assets/scenes/v2/beetle-poses.png", "1a7aac0b32750d3f0ca58aaf0766b971282a4b813dc1da8d68c67e45d7ac13be"), generatedBackground("beetle-background-v2", "/assets/scenes/v2/beetle-background.webp", "1aff93e661badab63cd0d9c2de1202988c01cf27b904722521ea35b14fc87127")],
  },
  "red-string": {
    ...encounterMetadata("red-string"),
    id: "red-string", title: "Red String", revision, subjectClass: "object", apparentSizeGuidance: "Keep textured rope visible without an overly busy field.", apparentSize: apparentSize(26, 36),
    contrast: { natural: "Textured red rope on a neutral surface.", enhanced: "Rope maintains clear figure-ground separation." }, motionProfile: "Authored curves with drags, pauses, direction changes, and partial exits.", occlusion: "Partial exits at safe authored edge points.", supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["bounded-touch", "no-touch-acceleration", "no-edge-fleeing", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "moderate", noveltyFamily: "object movement", finiteDurationMs: 100_000,
    motion: { apparentSpeed: "measured", trajectory: ["curved", "authored"], intermittency: "continuous-with-pauses", directionChanges: "authored", entranceEdges: ["left", "right", "bottom"], exitEdges: ["left", "right", "bottom"], acceleration: "gentle", occlusion: { frequency: "occasional", duration: "brief" } },
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/red-string-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/red-string-textures.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate slack and endpoint sequence using the same woven cord material." },
    posterUrl: "/assets/red-string.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, ambience: "fabric", eventKinds: ["fabric-drag"], excluded: ["continuous-loop", "music"] }, assets: [repositoryPlate("red-string-master", "/assets/red-string.png", "7c209a89f449d08eea6a0d67b6e8535f2ec7a2dc6c5de8a1e50d16af20f75365"), browserDelivery("red-string-webp", "/assets/red-string.webp", "9d325a7a6937f5fe2ff92a0f4ae979228ffd64c42870c2e812994cc86c603622", "webp"), browserDelivery("red-string-avif", "/assets/red-string.avif", "ec83c6d8ae93bf6f4f9d796be9956c803e6c5a1edea6cf162a054949c5796094", "avif"), generatedAtlas("red-string-atlas-v1"), generatedPoseSheet("red-string-textures-v2", "/assets/scenes/v2/red-string-textures.png", "6c6f45eba621ddf414fb77b637fbbfaeeac3e02bd8cfcb10a938f6ff9be6e111"), generatedRopeTile(), generatedBackground("red-string-background-v2", "/assets/scenes/v2/red-string-background.webp", "1f52feb17e417c15ac56b9acf0b25a4af0b0bcdd242252c9abee6a78e9da5fcf")],
  },
};

export const contentRegistry: Readonly<Record<SceneId, ContentManifest>> = Object.fromEntries(sceneIds.map((id) => {
  const manifest = rawContentRegistry[id];
  const audio = manifest.audio ? { ...manifest.audio, provenance: manifest.audio.eventKinds.map((eventKind) => ({ eventKind, source: "No cleared environmental recording bundled in this revision", license: "Ineligible until recording provenance and clearance are added", eligible: false })) } : undefined;
  return [id, { ...manifest, ...(audio ? { audio } : {}) }];
})) as unknown as Readonly<Record<SceneId, ContentManifest>>;

for (const id of sceneIds) {
  const result = validateContentManifest(contentRegistry[id]);
  if (!result.ok) throw new Error(`Invalid content manifest ${id}: ${result.errors.join(" ")}`);
}

export function getContentManifest(id: SceneId): ContentManifest { return contentRegistry[id]; }
export function listContentManifests(): readonly ContentManifest[] { return sceneIds.map((id) => contentRegistry[id]); }
