import { SceneId } from "../content/types";
import { Point } from "./types";
import { clamp } from "./simulationMath";

export function initialPlacement(sceneId: SceneId, xRandom: number, yRandom: number): Point {
  if (sceneId === "balcony-birds") { const x = .18 + xRandom * .64; return { x, y: clamp(.93 - x * .2 + yRandom * .018, .74, .9) }; }
  const [x, xSpan, y, ySpan] = sceneId === "koi-pool" ? [.14, .72, .2, .6] : sceneId === "paper-moth" ? [.2, .6, .28, .42] : sceneId === "beetle-under-the-fern" ? [.16, .68, .56, .12] : [.16, .68, .28, .48];
  return { x: x + xRandom * xSpan, y: y + yRandom * ySpan };
}
