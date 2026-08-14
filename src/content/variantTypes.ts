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
