import type { ContentManifest } from "../catalogue/model";
import type { SessionSetup } from "../domain";

/** A prepared encounter is application state, not a rendering concern. */
/** Dimensions the current encounter runtime can deliberately vary. */
export type ComparisonDimension = "contrast" | "motion";
export type ComparisonSide = "a" | "b";

export interface SessionPlan extends Omit<SessionSetup, "sceneId"> {
  manifest: ContentManifest;
  comparison?: { dimension: ComparisonDimension; side: ComparisonSide };
}
