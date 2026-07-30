export type EvidenceThemeId = "vision" | "motion" | "sound" | "sessions" | "welfare";

export interface EvidenceSource {
  id: string;
  title: string;
  year: number;
  /** Canonical DOI resolver URL for the ledger record. */
  url: string;
}

export interface EvidenceTheme {
  id: EvidenceThemeId;
  title: string;
  tldr: string;
  confidence: "Limited" | "Moderate" | "Provisional";
  supports: string;
  doesNotShow: string;
  longSummary: string;
  sources: readonly EvidenceSource[];
}

const source = (id: string, title: string, year: number, doi: string): EvidenceSource => ({
  id,
  title,
  year,
  url: `https://doi.org/${doi}`,
});

/**
 * Curated entry points into the full research baseline. These summaries preserve
 * its distinction between sensory capacity, attention, preference, and welfare.
 */
export const evidenceThemes: readonly EvidenceTheme[] = [
  {
    id: "vision",
    title: "Vision",
    tldr: "Cats detect colour and contrast, but legibility changes with size, distance, luminance, and context. There is no universal best colour.",
    confidence: "Moderate",
    supports: "Store figure-ground separation, apparent size, and viewing context as curation variables.",
    doesNotShow: "A universally preferred hue, palette, resolution, or display setting.",
    longSummary: "Behavioural studies show that cats can discriminate coloured stimuli under stated conditions. Their performance changes when stimulus size, shape, viewing distance, luminance, and contrast change. That supports curating for legible figure-ground separation at an intended device size and distance. It does not reduce visual detectability to a single colour swatch, and it does not establish a preferred colour. A foreground, background, illumination, display, distance, and task all contribute to what is visible.",
    sources: [
      source("COL-05", "Cat color vision: the effect of stimulus size", 1978, "10.1126/science.628838"),
      source("COL-07", "Cat color vision: the effect of stimulus size, shape and viewing distance", 1979, "10.1016/0042-6989(79)90135-4"),
      source("SPA-04", "The luminance dependence of spatial vision in the cat", 1981, "10.1016/0042-6989(81)90240-6"),
    ],
  },
  {
    id: "motion",
    title: "Motion",
    tldr: "Coherent movement can attract attention; looking, tracking, or pouncing does not prove enjoyment, preference, or benefit.",
    confidence: "Moderate",
    supports: "Use coherent trajectories, legible occlusion, and low background competition as curation variables.",
    doesNotShow: "That faster movement, longer looking, or screen strikes are better or beneficial.",
    longSummary: "Controlled work supports the idea that cats can discriminate motion and respond differently to relational trajectories. Screen and television studies also show attention to moving content, with attention declining during repeated exposure. This supports structured, coherent motion rather than movement added only for intensity. The studies measure attention, discrimination, or behavioural response under specific conditions. They do not establish enjoyment, hunting satisfaction, stable preference, or welfare benefit from looking, tracking, or pouncing.",
    sources: [
      source("MOT-07", "Chasing perception in domestic cats and dogs", 2022, "10.1007/s10071-022-01643-3"),
      source("VID-01", "The influence of visual stimulation on the behaviour of cats housed in a rescue shelter", 2008, "10.1016/j.applanim.2007.11.002"),
      source("MOT-02", "Pattern and motion vision in cats with selective loss of cortical directional selectivity", 1986, "10.1523/JNEUROSCI.06-04-00938.1986"),
    ],
  },
  {
    id: "sound",
    title: "Sound",
    tldr: "Sound can guide orientation, but audibility does not establish preference. Playback starts quiet and excludes ultrasonic content.",
    confidence: "Moderate",
    supports: "Optional, quiet, intermittent, source-coherent audio with a stable speaker and an easy exit.",
    doesNotShow: "That ultrasonic content, ear movement, or head orientation proves enjoyment or is safe.",
    longSummary: "Cats can localize sound and can orient to familiar voices or other auditory stimuli. One study found earlier approach and interaction with species-appropriate music in its particular setting. These findings support optional, low-level, source-coherent sound rather than a universal audio prescription. High-frequency audibility is not evidence of desire, benefit, or safe reproduction. Orientation is an attention response, not a measure of enjoyment, so playback begins quiet and stops when it causes distress or avoidance.",
    sources: [
      source("AUD-02", "The auditory spatial acuity of the domestic cat in the interaural horizontal and median vertical planes", 1987, "10.1016/0378-5955(87)90140-7"),
      source("AUD-06", "Vocal recognition of owners by domestic cats (Felis catus)", 2013, "10.1007/s10071-013-0620-4"),
      source("AUD-08", "Cats prefer species-appropriate music", 2015, "10.1016/j.applanim.2015.02.012"),
    ],
  },
  {
    id: "sessions",
    title: "Sessions",
    tldr: "Evidence supports voluntary, supervised viewing, not a universal session duration. Disengagement is a valid outcome.",
    confidence: "Provisional",
    supports: "Short, voluntary, supervised sessions, clip rotation, and stopping rather than automatic replay when a cat leaves.",
    doesNotShow: "A safe or optimal viewing dose, or that a fixed duration works for every cat.",
    longSummary: "The direct shelter television study used three-hour daily exposures, found low average screen attention, and observed declining attention over repeated days. Object-play research similarly shows that responding can decline with repetition and recover when features change, while preference work shows meaningful individual variation. Together these findings support a precautionary structure: keep sessions voluntary and supervised, rotate familiar material, and treat leaving as a valid outcome. They do not supply a household dose or convert attention into preference or welfare.",
    sources: [
      source("VID-01", "The influence of visual stimulation on the behaviour of cats housed in a rescue shelter", 2008, "10.1016/j.applanim.2007.11.002"),
      source("HUN-05", "Object play in adult domestic cats: the roles of habituation and disinhibition", 2002, "10.1016/S0168-1591(02)00153-3"),
      source("HUN-07", "Social interaction, food, scent or toys? A formal assessment of domestic pet and shelter cat preferences", 2017, "10.1016/j.beproc.2017.03.016"),
    ],
  },
  {
    id: "welfare",
    title: "Welfare",
    tldr: "Screen attention is not a welfare measure. Stop on distress, forceful contact, or persistent searching; no study defines a safe feline viewing dose.",
    confidence: "Limited",
    supports: "Conservative stop rules, secure equipment, an unobstructed exit, and extra caution for vulnerable cats.",
    doesNotShow: "That screen viewing is enriching, that every pursuit sequence is frustrating, or that a clinical safety threshold exists.",
    longSummary: "Feline stress and welfare can appear through varied behavioural, health, and physiological changes that do not always agree. This evidence is not specific to video, but it supports conservative safeguards when a cat startles, freezes, hides, vocalizes in distress, repeatedly strikes the screen, or persistently searches behind it. The direct display literature does not define a maximum safe duration, sound-pressure level, flash rate, or diagnostic stop score. Catflix therefore treats these rules as precautionary controls rather than clinical thresholds or proof of welfare benefit.",
    sources: [
      source("WEL-05", "Sickness behaviors in response to unusual external events in healthy cats and cats with feline interstitial cystitis", 2011, "10.2460/javma.238.1.67"),
      source("WEL-06", "Effects of stressors on the behavior and physiology of domestic cats", 2013, "10.1016/j.applanim.2012.10.014"),
      source("WEL-08", "Stress in owned cats: behavioural changes and welfare implications", 2015, "10.1177/1098612X15590867"),
    ],
  },
] as const;

export const evidenceMethodNote = "60 peer-reviewed sources: 57 original empirical studies and 3 scholarly reviews. Search closed 29 July 2026. The direct display domain contains one television-enrichment trial; it measured attention, not household preference or welfare.";
