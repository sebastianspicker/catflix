import type { SceneActorSnapshot, SceneMotionMode, SceneScore, SceneSnapshot, VariantSelection } from "../../domain";
import { publicUrl } from "../../paths";
import { coverRect, drawOccluder, interpolateActor, orderedActors, poseAnchor, poseCrop, ropeCurve, spriteUsesHorizontalFlip } from "./renderGeometry";

export interface EncounterVisualAssets { backgroundUrl: string; poseSheetUrl: string; ropeTextureUrl?: string; }

interface CanvasSimulationRendererOptions {
  canvas: HTMLCanvasElement;
  score: SceneScore;
  variant: VariantSelection;
  visuals: EncounterVisualAssets;
}

interface CanvasRendererState {
  options: CanvasSimulationRendererOptions;
  backdrop: HTMLImageElement;
  poses: HTMLImageElement;
  ropeTexture: HTMLImageElement;
  context: CanvasRenderingContext2D | null;
  ropePattern: CanvasPattern | null;
  backdropCanvas: HTMLCanvasElement | undefined;
  backdropCanvasKey: string | undefined;
  size: { width: number; height: number };
  resizeObserver: ResizeObserver | undefined;
}

const maximumPixelRatio = 2;
const hexColorCache = new Map<number, string>();
const hexColor = (color: number): string => {
  const cached = hexColorCache.get(color);
  if (cached) return cached;
  const hex = `#${color.toString(16).padStart(6, "0")}`;
  hexColorCache.set(color, hex);
  return hex;
};

export interface CanvasSimulationRenderer { render(state: SceneSnapshot, sceneMotionMode: SceneMotionMode): void; destroy(): void; }

export function createCanvasSimulationRenderer(options: CanvasSimulationRendererOptions): CanvasSimulationRenderer {
  const renderer = createRendererState(options);
  return {
    render: (state, sceneMotionMode) => { renderFrame(renderer, state, sceneMotionMode); },
    destroy: () => { renderer.resizeObserver?.disconnect(); },
  };
}

function createRendererState(options: CanvasSimulationRendererOptions): CanvasRendererState {
  const backdrop = new Image();
  backdrop.src = publicUrl(options.visuals.backgroundUrl);
  const poses = new Image();
  poses.src = publicUrl(options.visuals.poseSheetUrl);
  const ropeTexture = new Image();
  if (options.visuals.ropeTextureUrl) ropeTexture.src = publicUrl(options.visuals.ropeTextureUrl);
  const state: CanvasRendererState = {
    options,
    backdrop,
    poses,
    ropeTexture,
    context: options.canvas.getContext("2d"),
    ropePattern: null,
    backdropCanvas: undefined,
    backdropCanvasKey: undefined,
    size: measureCanvasSize(options.canvas),
    resizeObserver: undefined,
  };
  if (typeof ResizeObserver === "function") {
    state.resizeObserver = new ResizeObserver(() => { state.size = measureCanvasSize(options.canvas); });
    state.resizeObserver.observe(options.canvas);
  }
  return state;
}

function measureCanvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
  return { width: Math.max(1, Math.round(canvas.clientWidth * ratio)), height: Math.max(1, Math.round(canvas.clientHeight * ratio)) };
}

function renderFrame(renderer: CanvasRendererState, state: SceneSnapshot, sceneMotionMode: SceneMotionMode): void {
  const { canvas } = renderer.options;
  const { context } = renderer;
  if (!canvas.isConnected || !context) return;
  const { width, height } = applyCanvasSize(renderer);
  beginFrame(context, width, height);
  drawBackdrop(renderer, context, width, height);
  for (const actor of orderedActors(state)) drawActor(renderer, context, interpolateActor(actor, state.interpolationAlpha), width, height);
  drawRope(renderer, context, state, width, height, sceneMotionMode);
  drawSignature(context, state, width, height);
  drawOccluder(renderer.options.score.id, {
    fillStyle: (color, alpha) => {
      context.fillStyle = hexColor(color);
      context.globalAlpha = alpha;
    },
    rect: (x, y, rectWidth, rectHeight) => { context.fillRect(x, y, rectWidth, rectHeight); },
    ellipse: (x, y, radiusX, radiusY) => {
      context.beginPath();
      context.ellipse(x, y, radiusX / 2, radiusY / 2, 0, 0, Math.PI * 2);
      context.fill();
    },
  }, width, height);
  context.globalAlpha = 1;
}

function applyCanvasSize(renderer: CanvasRendererState): { width: number; height: number } {
  const { canvas } = renderer.options;
  const { width, height } = renderer.size;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

function beginFrame(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = "#111411";
  context.fillRect(0, 0, width, height);
}

function drawBackdrop(renderer: CanvasRendererState, context: CanvasRenderingContext2D, width: number, height: number): void {
  const { backdrop } = renderer;
  if (!backdrop.complete || !backdrop.naturalWidth) return;
  const key = `${width}x${height}:${renderer.options.variant.figureGround}`;
  if (renderer.backdropCanvasKey !== key || !renderer.backdropCanvas) rebuildBackdropCanvas(renderer, width, height, key);
  if (renderer.backdropCanvas) context.drawImage(renderer.backdropCanvas, 0, 0);
}

function rebuildBackdropCanvas(renderer: CanvasRendererState, width: number, height: number, key: string): void {
  const { backdrop, options } = renderer;
  const offscreen = renderer.backdropCanvas ?? document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const offscreenContext = offscreen.getContext("2d");
  if (!offscreenContext) return;
  const cover = coverRect(backdrop.naturalWidth, backdrop.naturalHeight, width, height);
  offscreenContext.globalAlpha = options.variant.figureGround === "enhanced" ? 0.52 : 0.78;
  offscreenContext.drawImage(backdrop, cover.x, cover.y, cover.width, cover.height);
  offscreenContext.globalAlpha = 1;
  renderer.backdropCanvas = offscreen;
  renderer.backdropCanvasKey = key;
}

function drawActor(renderer: CanvasRendererState, context: CanvasRenderingContext2D, actor: SceneActorSnapshot, width: number, height: number): void {
  const { options, poses } = renderer;
  if (!actor.visible || !poses.complete || !poses.naturalWidth || options.score.id === "red-string") return;
  const crop = poseCrop(poses.naturalWidth, poses.naturalHeight, actor.poseFrame);
  const displayWidth = options.score.displayWidth * width * actor.scale;
  const displayHeight = displayWidth * crop.height / crop.width;
  const anchor = poseAnchor(options.score.id, actor.poseFrame);
  context.save();
  context.globalAlpha = actor.alpha;
  context.translate(actor.x * width, actor.y * height);
  context.rotate(actor.angle);
  context.scale(actor.scaleX * (spriteUsesHorizontalFlip(options.score.id) && actor.facing < 0 ? -1 : 1), actor.scaleY);
  context.drawImage(poses, crop.x, crop.y, crop.width, crop.height, -displayWidth * anchor.x, -displayHeight * anchor.y, displayWidth, displayHeight);
  context.restore();
}

function drawRope(renderer: CanvasRendererState, context: CanvasRenderingContext2D, state: SceneSnapshot, width: number, height: number, sceneMotionMode: SceneMotionMode): void {
  const actor = renderer.options.score.id === "red-string" ? state.actors.at(0) : undefined;
  if (!actor?.visible) return;
  const curve = ropeCurve(interpolateActor(actor, state.interpolationAlpha), width, height, sceneMotionMode);
  if (!renderer.ropePattern && renderer.ropeTexture.complete && renderer.ropeTexture.naturalWidth) renderer.ropePattern = context.createPattern(renderer.ropeTexture, "repeat");
  context.save();
  context.globalAlpha = actor.alpha;
  context.lineCap = "round";
  context.strokeStyle = renderer.ropePattern ?? "#a92d2f";
  context.lineWidth = Math.max(5, width * 0.01);
  context.beginPath();
  context.moveTo(curve.start.x, curve.start.y);
  context.quadraticCurveTo(curve.control.x, curve.control.y, curve.end.x, curve.end.y);
  context.stroke();
  context.restore();
}

function drawSignature(context: CanvasRenderingContext2D, state: SceneSnapshot, width: number, height: number): void {
  const signature = state.signatureEffect;
  if (!signature || signature.kind === "slack-curve") return;
  const x = signature.x * width;
  const y = signature.y * height;
  context.save();
  context.globalAlpha = signature.alpha;
  if (signature.kind === "reflected-ring") drawReflectedRing(context, x, y, width, height);
  if (signature.kind === "perch-lights") drawPerchLights(context, x, y, width, height);
  if (signature.kind === "folded-shadow") drawFoldedShadow(context, x, y, width, height);
  if (signature.kind === "fern-shadow") drawFernShadow(context, x, y, width, height);
  context.restore();
}

function drawReflectedRing(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  context.strokeStyle = "#e6d5a3";
  context.lineWidth = Math.max(2, width * 0.002);
  context.beginPath();
  context.ellipse(x, y, width * 0.075, height * 0.035, 0, 0, Math.PI * 2);
  context.stroke();
}

function drawPerchLights(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  context.fillStyle = "#f2c98f";
  for (const offset of [-0.08, 0, 0.08]) {
    context.beginPath();
    context.arc(x + width * offset, y + height * 0.1, Math.max(2, width * 0.003), 0, Math.PI * 2);
    context.fill();
  }
}

function drawFoldedShadow(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  context.fillStyle = "#17141a";
  context.beginPath();
  context.moveTo(x - width * 0.08, y + height * 0.08);
  context.lineTo(x + width * 0.07, y + height * 0.04);
  context.lineTo(x + width * 0.02, y + height * 0.13);
  context.closePath();
  context.fill();
}

function drawFernShadow(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  context.fillStyle = "#102016";
  context.beginPath();
  context.ellipse(x, y + height * 0.04, width * 0.1, height * 0.04, 0, 0, Math.PI * 2);
  context.fill();
}
