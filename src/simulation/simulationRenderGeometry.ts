import { SceneId } from "../content/types";
import { getSceneDefinition } from "./definitions";
import { Point, SceneActorSnapshot, SceneMotionMode, SceneSnapshot } from "./types";

export interface PoseSheet { path: string; width: number; height: number; }

const poseSheets: Record<SceneId, PoseSheet> = {
  "balcony-birds": { path: "/assets/scenes/v2/balcony-birds-poses.png", width: 1536, height: 1024 },
  "koi-pool": { path: "/assets/scenes/v2/koi-pool-poses.png", width: 1672, height: 941 },
  "paper-moth": { path: "/assets/scenes/v2/paper-moth-poses.png", width: 1672, height: 941 },
  "beetle-under-the-fern": { path: "/assets/scenes/v2/beetle-poses.png", width: 1672, height: 941 },
  "red-string": { path: "/assets/scenes/v2/red-string-textures.png", width: 1672, height: 941 },
};

export const poseSheetFor = (sceneId: SceneId): PoseSheet => poseSheets[sceneId];
export const poseTextureFrame = (poseFrame: number): string => `pose-${((Math.floor(poseFrame) % 8) + 8) % 8}`;
export const actorDisplayWidth = (sceneId: SceneId): number => getSceneDefinition(sceneId).displayWidth;
export const spriteUsesHorizontalFlip = (sceneId: SceneId): boolean => sceneId === "balcony-birds";
export const spriteRotation = (_sceneId: SceneId, actor: SceneActorSnapshot): number => actor.angle;
export const orderedActors = (state: SceneSnapshot): SceneActorSnapshot[] => [...state.actors].sort((left, right) => left.depth - right.depth);

export function poseCrop(sceneId: SceneId, poseFrame: number): { x: number; y: number; width: number; height: number } {
  const frame = ((Math.floor(poseFrame) % 8) + 8) % 8;
  const sheet = poseSheetFor(sceneId);
  const width = Math.floor(sheet.width / 4);
  const height = Math.floor(sheet.height / 2);
  return { x: (frame % 4) * width, y: frame < 4 ? 0 : sheet.height - height, width, height };
}

export function poseAnchor(sceneId: SceneId, poseFrame: number): Point {
  const frame = ((Math.floor(poseFrame) % 8) + 8) % 8;
  const anchors: Record<Exclude<SceneId, "red-string">, readonly Point[]> = {
    "balcony-birds": [{ x: .5, y: .58 }, { x: .51, y: .58 }, { x: .49, y: .58 }, { x: .5, y: .61 }, { x: .48, y: .53 }, { x: .47, y: .52 }, { x: .48, y: .53 }, { x: .5, y: .82 }],
    "koi-pool": [{ x: .55, y: .72 }, { x: .34, y: .68 }, { x: .43, y: .66 }, { x: .44, y: .68 }, { x: .25, y: .69 }, { x: .41, y: .72 }, { x: .5, y: .72 }, { x: .42, y: .73 }],
    "paper-moth": [{ x: .48, y: .49 }, { x: .49, y: .5 }, { x: .5, y: .51 }, { x: .5, y: .52 }, { x: .6, y: .51 }, { x: .59, y: .51 }, { x: .58, y: .51 }, { x: .48, y: .52 }],
    "beetle-under-the-fern": [{ x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }],
  };
  if (sceneId === "red-string") return { x: .5, y: .5 };
  return anchors[sceneId].at(frame) ?? anchors[sceneId][0];
}

export function coverRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): { x: number; y: number; width: number; height: number } {
  const scale = Math.max(targetWidth / Math.max(sourceWidth, 1), targetHeight / Math.max(sourceHeight, 1));
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

export function ropeCurve(actor: SceneActorSnapshot, width: number, height: number, sceneMotionMode: SceneMotionMode): { start: Point; control: Point; end: Point } {
  const deformation = sceneMotionMode === "low" ? .25 : 1;
  const end = { x: actor.x * width, y: actor.y * height };
  const start = { x: Math.max(0, end.x - width * .32), y: Math.min(height, end.y + height * (.08 + actor.stateProgress * .08) * deformation) };
  return { start, control: { x: (start.x + end.x) / 2, y: end.y + height * (.12 + actor.stateProgress * .12) * deformation }, end };
}

export function quadraticPoints(start: Point, control: Point, end: Point): Point[] {
  return Array.from({ length: 13 }, (_, index) => {
    const t = index / 12;
    const inverse = 1 - t;
    return { x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x, y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y };
  });
}

export interface OccluderSurface {
  fillStyle(color: number, alpha: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  ellipse(x: number, y: number, width: number, height: number): void;
}

export function drawOccluder(sceneId: SceneId, surface: OccluderSurface, width: number, height: number): void {
  // Foreground forms are intentionally static: they restore spatial layering without invented ambience.
  if (sceneId === "balcony-birds" || sceneId === "beetle-under-the-fern") return;
  if (sceneId === "koi-pool") { surface.fillStyle(0x1a3027, .14); surface.ellipse(width * .76, height * .84, width * .28, height * .08); return; }
  if (sceneId === "paper-moth") { surface.fillStyle(0x161516, .72); surface.rect(width * .93, 0, width * .07, height); return; }
  surface.fillStyle(0x1a1718, .24); surface.rect(0, 0, width * .025, height); surface.rect(width * .975, 0, width * .025, height);
}
