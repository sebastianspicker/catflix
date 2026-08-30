/** Stable identifiers for the finite authored encounter catalogue. */
export const sceneIds = [
  "balcony-birds",
  "koi-pool",
  "paper-moth",
  "beetle-under-the-fern",
  "red-string",
] as const;

export type SceneId = (typeof sceneIds)[number];

export type FigureGroundVariant = "natural" | "enhanced";
export type MotionVariant = "continuous" | "intermittent";
export type SoundVariant = "off" | "on";
export type NoveltyVariant = "familiar" | "alternate";

export interface VariantSelection {
  figureGround: FigureGroundVariant;
  motion: MotionVariant;
  sound: SoundVariant;
  novelty: NoveltyVariant;
}

/** One named default for an ordinary, familiar tablet encounter. */
export const defaultSessionVariant: Readonly<VariantSelection> = {
  figureGround: "natural",
  motion: "intermittent",
  sound: "on",
  novelty: "familiar",
};
