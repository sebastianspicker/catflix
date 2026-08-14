import { ContentManifest, SceneId, validateContentManifest } from "./types";

const revision = "2026.08.12.1";
const repositoryPlate = (assetId: string, source: string, checksum: string) => ({
  assetId,
  creator: "Catflix studio with OpenAI image generation",
  source,
  license: "Project-generated asset; use subject to OpenAI terms",
  derivativeHistory: ["Generated independently without a legacy asset as an input or reference", "Composited locally from the independent environment and subject sources as the 16:9 poster master"],
  checksum,
  masteringFormat: "png" as const,
  contentRevision: revision,
});
const browserDelivery = (assetId: string, source: string, checksum: string, masteringFormat: "webp" | "avif") => ({ assetId, creator: "Catflix studio", source, license: "Project-generated asset; use subject to OpenAI terms", derivativeHistory: [`Encoded locally from the independently generated checksummed PNG poster master as ${masteringFormat.toUpperCase()}`], checksum, masteringFormat, contentRevision: revision });
const generatedPoseSheet = (assetId: string, source: string, checksum: string) => ({
  assetId,
  creator: "Catflix studio with OpenAI image generation",
  source,
  license: "Project-generated asset; use subject to OpenAI terms",
  derivativeHistory: ["Generated independently on a flat removable matte without a legacy asset as an input or reference", "Chroma removed locally with a soft matte and despill", "Eight restrained transform variants assembled locally as an RGBA 4 by 2 pose package"],
  checksum,
  masteringFormat: "png" as const,
  contentRevision: revision,
});
const generatedBackground = (assetId: string, source: string, checksum: string) => ({
  assetId,
  creator: "Catflix studio with OpenAI image generation",
  source,
  license: "Project-generated asset; use subject to OpenAI terms",
  derivativeHistory: ["Generated independently as a subject-free environment without a legacy asset as an input or reference", "Cropped and encoded locally to a 1920 by 1080 WebP runtime master"],
  checksum,
  masteringFormat: "webp" as const,
  contentRevision: revision,
});
const generatedRopeTile = () => ({ assetId: "red-string-rope-tile-v3", creator: "Catflix studio", source: "/assets/scenes/v2/red-string-tile.png", license: "Project-generated asset; use subject to OpenAI terms", derivativeHistory: ["Constructed locally from original geometric cord strokes without a legacy asset as an input or reference", "Validated as a transparent, horizontally repeatable Phaser rope texture"], checksum: "4a63cce76f8c72aa6a4ada9ed586f54c29446d5b51e24c6884f65477e89caeb8", masteringFormat: "png" as const, contentRevision: revision });
const apparentSize = (minimum: number, maximum: number) => ({ frameWidthPercent: [minimum, maximum] as const, intendedViewingDistance: "mixed" as const, visualAngle: "device-dependent" as const, basis: "editorial-legibility" as const });
const encounterCopy = new Map<SceneId, readonly [string, string, string, string]>([
  ["balcony-birds", ["Four perch-to-perch encounters with one short rail flight and plausible planter or rail occlusion.", "A bird remains visibly settled on a perch while the scene dims.", "A perched bird turns or makes one adjacent hop; a moving bird settles at the next safe perch.", "Perches and the short rail corridor keep the bird against uncluttered sky and masonry."]],
  ["koi-pool", ["Three long curved passages with gradual turns, reflected light, and plant-shadow occlusion.", "Calm water remains with one visible fish in a slow glide.", "Contact creates one coherent ripple event and a slow curved redirect.", "Broad, separated arcs avoid confusing multi-fish crossings and reflected highlights."]],
  ["paper-moth", ["Five short heading-persistent flutter-and-land passages with frame and lamp occlusion.", "The moth remains visibly landed rather than escaping through an edge.", "A moving moth reroutes once or lands nearby; a landed moth adjusts its wings once and stays still.", "The flight corridor crosses subdued wall and window fields with longer still landings."]],
  ["beetle-under-the-fern", ["Four grounded fern-margin crossings with antenna pauses and brief shelter states.", "The beetle remains partially legible and settled under cover.", "Contact pauses, reverses, or guides the beetle beneath the nearest fern without a faster scurry.", "Ground paths follow quiet fern margins and avoid dense leaf-litter texture."]],
  ["red-string", ["Five bounded tension-and-slack passages with coherent spline movement and partial edge exits.", "The string resolves into a visible sculptural slack curve.", "Contact changes local tension once, producing one controlled pull or slack response.", "The spline remains on a neutral surface and edge exits never repeat as a chase loop."]],
]);
const encounterMetadata = (id: SceneId) => {
  const encounter = encounterCopy.get(id);
  if (!encounter) throw new Error(`Missing encounter metadata for ${id}.`);
  const [authoredScore, finale, contactResponseSemantics, targetCorridorRationale] = encounter;
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
    assets: [repositoryPlate("balcony-birds-master-v3", "/assets/balcony-birds.png", "83a17165033875331cb85b36ab2662ee15b4088f6732277b2ea0cda21d03d7a6"), browserDelivery("balcony-birds-webp-v3", "/assets/balcony-birds.webp", "bc4266baad78155bdf4a05c8f5094e5904bf107d393405d7c37b1c9e6c10a437", "webp"), browserDelivery("balcony-birds-avif-v3", "/assets/balcony-birds.avif", "c7ba2533d62ab06dc31623ab58516202a8863782833211fb2c70489241d5c0ef", "avif"), generatedPoseSheet("balcony-birds-poses-v3", "/assets/scenes/v2/balcony-birds-poses.png", "96209758ae7710c075fa143b70f59c1c23b2dcef4d514f6c09e7f3727188e22e"), generatedBackground("balcony-birds-background-v3", "/assets/scenes/v2/balcony-birds-background.webp", "e1c4deb6e9439e3461e1a26f8447a894d617bb6c3aca1dfee82838ab1ba20034")],
  },
  "koi-pool": {
    ...encounterMetadata("koi-pool"),
    id: "koi-pool", title: "Koi Pool", revision, subjectClass: "fish", apparentSizeGuidance: "Keep the single fish clearly separated from reflections.", apparentSize: apparentSize(7, 10),
    contrast: { natural: "Pond reflections and natural fish colour.", enhanced: "Fish retain separation through reflections." },
    motionProfile: "Slow curved paths, turns, and partial plant-shadow occlusion.", occlusion: "Plant shadow and lily edge occlusion.",
    motion: { apparentSpeed: "slow", trajectory: ["curved"], intermittency: "continuous", directionChanges: "gentle", entranceEdges: ["left", "right"], exitEdges: ["left", "right"], acceleration: "gentle", occlusion: { frequency: "recurring", duration: "variable" } },
    supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["no-invented-fish-vocals", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "limited", noveltyFamily: "water movement", finiteDurationMs: 120_000,
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/koi-pool-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/koi-pool-poses.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate curved-body turn sequence using the same koi and pond lighting." },
    posterUrl: "/assets/koi.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, ambience: "water", eventKinds: ["quiet-water"], excluded: ["fish-vocalization", "music"] }, assets: [repositoryPlate("koi-pool-master-v3", "/assets/koi.png", "ebece0a59f161889ba099c3ac415bc7d77c55f93aa3862b61b134304aa7b94de"), browserDelivery("koi-webp-v3", "/assets/koi.webp", "fcf799c595b2aee72fe80512d093db11007a93b1901d9135717af3aa2e44bd8a", "webp"), browserDelivery("koi-avif-v3", "/assets/koi.avif", "d36607d6049ee4bd1412afba4a7efe418d9f77cabce037f4d15fad310c532e91", "avif"), generatedPoseSheet("koi-pool-poses-v3", "/assets/scenes/v2/koi-pool-poses.png", "bd0028b21a36a4ced22ffc2e32bd91196f3c3122955f1a26ffe3efb6093a74a3"), generatedBackground("koi-pool-background-v3", "/assets/scenes/v2/koi-pool-background.webp", "0253159562484902db8185bf81218488e89a845ec7e2d84f64d4eec9a3afa890")],
  },
  "paper-moth": {
    ...encounterMetadata("paper-moth"),
    id: "paper-moth", title: "Paper Moth", revision, subjectClass: "insect", apparentSizeGuidance: "Maintain a distinct paper-moth silhouette.", apparentSize: apparentSize(6, 13),
    contrast: { natural: "Paper against a subdued wall.", enhanced: "Clear silhouette against a simplified field." }, motionProfile: "Intermittent flutter, landing pauses, disappearances, and coherent re-entry.", occlusion: "Brief authored exits and re-entry behind a frame edge.",
    motion: { apparentSpeed: "variable", trajectory: ["fluttering", "authored"], intermittency: "intermittent", directionChanges: "frequent", entranceEdges: ["top", "left", "right"], exitEdges: ["top", "left", "right"], acceleration: "brief", occlusion: { frequency: "occasional", duration: "brief" } },
    supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["bounded-touch", "no-edge-escape-loop", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "limited", noveltyFamily: "fluttering paper", finiteDurationMs: 90_000,
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/paper-moth-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/paper-moth-poses.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate landing and bank pose sequence using the same paper moth and lamp edge light." },
    posterUrl: "/assets/paper-moth.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, eventKinds: ["paper-flutter"], excluded: ["continuous-loop", "ultrasonic"] }, assets: [repositoryPlate("paper-moth-master-v3", "/assets/paper-moth.png", "9cf8da6b37619b4c4ad3f580cb32db68824db59843421527c33650f8c0870461"), browserDelivery("paper-moth-webp-v3", "/assets/paper-moth.webp", "d903952df6b7483a704419d6be5509dd01870a6c923c633df5525f21f7b18124", "webp"), browserDelivery("paper-moth-avif-v3", "/assets/paper-moth.avif", "0bd4ea30e170f8d2763321bf8d379f18ceeb792d8aff05bd547476b87abda294", "avif"), generatedPoseSheet("paper-moth-poses-v3", "/assets/scenes/v2/paper-moth-poses.png", "b8290f708fbdd04d97feac186b081ef852f1d309cd9ac086557722bcabc1bd09"), generatedBackground("paper-moth-background-v3", "/assets/scenes/v2/paper-moth-background.webp", "b77e106ec95c3cc01a3439a61aa59d71135a83d615b8f76bdeab24d75f9d86f9")],
  },
  "beetle-under-the-fern": {
    ...encounterMetadata("beetle-under-the-fern"),
    id: "beetle-under-the-fern", title: "Beetle Under the Fern", revision, subjectClass: "insect", apparentSizeGuidance: "Keep the ground-level silhouette distinct from leaf texture.", apparentSize: apparentSize(7, 10),
    contrast: { natural: "Leaf-litter ground plane.", enhanced: "Beetle separates from simplified leaf texture." }, motionProfile: "Crawling, pauses, antenna motion, edge entry, and leaf occlusion.", occlusion: "Fern leaves partially cover the route.", supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["bounded-touch", "no-edge-escape-loop", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "limited", noveltyFamily: "ground insect", finiteDurationMs: 95_000,
    motion: { apparentSpeed: "slow", trajectory: ["grounded", "direct"], intermittency: "continuous-with-pauses", directionChanges: "gentle", entranceEdges: ["left", "right", "bottom"], exitEdges: ["left", "right", "bottom"], acceleration: "gentle", occlusion: { frequency: "recurring", duration: "variable" } },
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/beetle-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/beetle-poses.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate antenna and gait cycle using the same beetle and raking light." },
    posterUrl: "/assets/beetle.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, ambience: "leaves", eventKinds: ["leaf-scratch"], excluded: ["continuous-loop", "ultrasonic"] }, assets: [repositoryPlate("beetle-fern-master-v3", "/assets/beetle.png", "8626f05c0d5d5ca5cc83f6a96e56102e533e60f2ce3ecf2bcb2414e1577caf96"), browserDelivery("beetle-webp-v3", "/assets/beetle.webp", "489d542e9a83f2850c11cb115ac29391f7d8e988921b1a7697aa3510252a024b", "webp"), browserDelivery("beetle-avif-v3", "/assets/beetle.avif", "a0d282deb8fecdce6d2ed0ddead6e1b5529815f17050c9daabbdd20c5e1cf8d3", "avif"), generatedPoseSheet("beetle-poses-v3", "/assets/scenes/v2/beetle-poses.png", "3f91d64b599a0bc2cdeb21218238de531926dee8d968ece6263768d1ac221aef"), generatedBackground("beetle-background-v3", "/assets/scenes/v2/beetle-background.webp", "167df41e21c475580844708e61ed326975c5bf3823f300c8fe3543f3ef27e268")],
  },
  "red-string": {
    ...encounterMetadata("red-string"),
    id: "red-string", title: "Red String", revision, subjectClass: "object", apparentSizeGuidance: "Keep textured rope visible without an overly busy field.", apparentSize: apparentSize(26, 36),
    contrast: { natural: "Textured red rope on a neutral surface.", enhanced: "Rope maintains clear figure-ground separation." }, motionProfile: "Authored curves with drags, pauses, direction changes, and partial exits.", occlusion: "Partial exits at safe authored edge points.", supervision: "Supervised, voluntary, finite viewing.", riskFlags: ["bounded-touch", "no-touch-acceleration", "no-edge-fleeing", "no-auto-replay"], evidenceEndpoint: "docs/research/feline-perception.md#motion-trajectory-and-occlusion", evidenceConfidence: "moderate", noveltyFamily: "object movement", finiteDurationMs: 100_000,
    motion: { apparentSpeed: "measured", trajectory: ["curved", "authored"], intermittency: "continuous-with-pauses", directionChanges: "authored", entranceEdges: ["left", "right", "bottom"], exitEdges: ["left", "right", "bottom"], acceleration: "gentle", occlusion: { frequency: "occasional", duration: "brief" } },
    visuals: { backgroundPlateUrl: "/assets/scenes/v2/red-string-background.webp", subjectPoseSheetUrl: "/assets/scenes/v2/red-string-textures.png", foregroundOcclusion: "renderer-authored", alternateTreatment: "Alternate slack and endpoint sequence using the same woven cord material." },
    posterUrl: "/assets/red-string.webp", audio: { enabledVariant: "on", sourceCoherent: true, startsMuted: true, ambience: "fabric", eventKinds: ["fabric-drag"], excluded: ["continuous-loop", "music"] }, assets: [repositoryPlate("red-string-master-v3", "/assets/red-string.png", "7af028474c5ff412678ed7c88d27200d3a825e947bac830944a598b1e8e392f5"), browserDelivery("red-string-webp-v3", "/assets/red-string.webp", "afa24d334ef1baef65ba6175dd3fdb3e50ffc56c9d8c1e99fca9a778d41f1cec", "webp"), browserDelivery("red-string-avif-v3", "/assets/red-string.avif", "04091c6dc5020654f74ddb7c45ec56e978797f5202157c2d472c037d938f575a", "avif"), generatedPoseSheet("red-string-textures-v3", "/assets/scenes/v2/red-string-textures.png", "4d77adaa229f6bc84614acb5d711c493ede6914a88579f0c2e6daeedaec6cb92"), generatedRopeTile(), generatedBackground("red-string-background-v3", "/assets/scenes/v2/red-string-background.webp", "39c04a572bc8a538f8b4418a822eb0ac45a0c9e77355cbb340bd8459cbc964e5")],
  },
};

const contentManifests = Object.values(rawContentRegistry).map((manifest) => {
  const audio = manifest.audio ? { ...manifest.audio, provenance: manifest.audio.eventKinds.map((eventKind) => ({ eventKind, source: "No cleared environmental recording bundled in this revision", license: "Ineligible until recording provenance and clearance are added", eligible: false })) } : undefined;
  return { ...manifest, ...(audio ? { audio } : {}) };
});

const contentManifestById = new Map(contentManifests.map((manifest) => [manifest.id, manifest]));

export const contentRegistry: Readonly<Record<SceneId, ContentManifest>> = Object.fromEntries(
  contentManifests.map((manifest) => [manifest.id, manifest]),
) as Readonly<Record<SceneId, ContentManifest>>;

for (const manifest of contentManifests) {
  const result = validateContentManifest(manifest);
  if (!result.ok) throw new Error(`Invalid content manifest ${manifest.id}: ${result.errors.join(" ")}`);
}

export function getContentManifest(id: SceneId): ContentManifest {
  const manifest = contentManifestById.get(id);
  if (!manifest) throw new Error(`Unknown content manifest ${id}.`);
  return manifest;
}

export function listContentManifests(): readonly ContentManifest[] { return [...contentManifests]; }
