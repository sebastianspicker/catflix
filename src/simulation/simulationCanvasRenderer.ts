import { SceneId, VariantSelection } from "../content/types";
import { publicUrl } from "../paths";
import { actorDisplayWidth, coverRect, drawOccluder, orderedActors, poseAnchor, poseCrop, ropeCurve, spriteRotation, spriteUsesHorizontalFlip } from "./simulationRenderGeometry";
import { SceneActorSnapshot, SceneMotionMode, SceneSnapshot } from "./types";

interface CanvasSimulationRendererOptions {
  canvas: HTMLCanvasElement;
  sceneId: SceneId;
  variant: VariantSelection;
  backgroundUrl: string;
  poseSheetPath: string;
}

export interface CanvasSimulationRenderer { render(state: SceneSnapshot, sceneMotionMode: SceneMotionMode): void; }

export function createCanvasSimulationRenderer(options: CanvasSimulationRendererOptions): CanvasSimulationRenderer {
  const backdrop = new Image();
  backdrop.src = publicUrl(options.backgroundUrl);
  const poses = new Image();
  poses.src = publicUrl(options.poseSheetPath);
  const ropeTexture = new Image();
  ropeTexture.src = publicUrl("/assets/scenes/v2/red-string-tile.png");

  const render = (state: SceneSnapshot, sceneMotionMode: SceneMotionMode): void => {
    if (!options.canvas.isConnected) return;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(options.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(options.canvas.clientHeight * ratio));
    if (options.canvas.width !== width || options.canvas.height !== height) { options.canvas.width = width; options.canvas.height = height; }
    const context = options.canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#111411";
    context.fillRect(0, 0, width, height);
    drawBackdrop(context, width, height);
    for (const actor of orderedActors(state)) drawActor(context, actor, width, height);
    drawRope(context, state, width, height, sceneMotionMode);
    drawSignature(context, state, width, height);
    drawOccluder(options.sceneId, {
      fillStyle: (color, alpha) => { context.fillStyle = `#${color.toString(16).padStart(6, "0")}`; context.globalAlpha = alpha; },
      rect: (x, y, w, h) => { context.fillRect(x, y, w, h); },
      ellipse: (x, y, rx, ry) => { context.beginPath(); context.ellipse(x, y, rx / 2, ry / 2, 0, 0, Math.PI * 2); context.fill(); },
    }, width, height);
    context.globalAlpha = 1;
  };

  const drawBackdrop = (context: CanvasRenderingContext2D, width: number, height: number): void => {
    if (!backdrop.complete || !backdrop.naturalWidth) return;
    const cover = coverRect(backdrop.naturalWidth, backdrop.naturalHeight, width, height);
    context.globalAlpha = options.variant.figureGround === "enhanced" ? 0.52 : 0.78;
    context.drawImage(backdrop, cover.x, cover.y, cover.width, cover.height);
    context.globalAlpha = 1;
  };
  const drawActor = (context: CanvasRenderingContext2D, actor: SceneActorSnapshot, width: number, height: number): void => {
    if (!actor.visible || !poses.complete || !poses.naturalWidth || options.sceneId === "red-string") return;
    const crop = poseCrop(options.sceneId, actor.poseFrame);
    const displayWidth = actorDisplayWidth(options.sceneId) * width * actor.scale;
    const displayHeight = displayWidth * crop.height / crop.width;
    const anchor = poseAnchor(options.sceneId, actor.poseFrame);
    context.save();
    context.globalAlpha = actor.alpha;
    context.translate(actor.x * width, actor.y * height);
    context.rotate(spriteRotation(options.sceneId, actor));
    context.scale(actor.scaleX * (spriteUsesHorizontalFlip(options.sceneId) && actor.facing < 0 ? -1 : 1), actor.scaleY);
    context.drawImage(poses, crop.x, crop.y, crop.width, crop.height, -displayWidth * anchor.x, -displayHeight * anchor.y, displayWidth, displayHeight);
    context.restore();
  };
  const drawRope = (context: CanvasRenderingContext2D, state: SceneSnapshot, width: number, height: number, sceneMotionMode: SceneMotionMode): void => {
    const actor = options.sceneId === "red-string" ? state.actors.at(0) : undefined;
    if (!actor?.visible) return;
    const curve = ropeCurve(actor, width, height, sceneMotionMode);
    context.save();
    context.globalAlpha = actor.alpha;
    context.lineCap = "round";
    context.strokeStyle = ropeTexture.complete ? context.createPattern(ropeTexture, "repeat") ?? "#a92d2f" : "#a92d2f";
    context.lineWidth = Math.max(5, width * 0.01);
    context.beginPath();
    context.moveTo(curve.start.x, curve.start.y);
    context.quadraticCurveTo(curve.control.x, curve.control.y, curve.end.x, curve.end.y);
    context.stroke();
    context.restore();
  };
  const drawSignature = (context: CanvasRenderingContext2D, state: SceneSnapshot, width: number, height: number): void => {
    const signature = state.signatureEffect;
    if (!signature || signature.kind === "slack-curve") return;
    const x = signature.x * width;
    const y = signature.y * height;
    context.save();
    context.globalAlpha = signature.alpha;
    if (signature.kind === "reflected-ring") { context.strokeStyle = "#e6d5a3"; context.lineWidth = Math.max(2, width * .002); context.beginPath(); context.ellipse(x, y, width * .075, height * .035, 0, 0, Math.PI * 2); context.stroke(); }
    if (signature.kind === "perch-lights") { context.fillStyle = "#f2c98f"; for (const offset of [-.08, 0, .08]) { context.beginPath(); context.arc(x + width * offset, y + height * .1, Math.max(2, width * .003), 0, Math.PI * 2); context.fill(); } }
    if (signature.kind === "folded-shadow") { context.fillStyle = "#17141a"; context.beginPath(); context.moveTo(x - width * .08, y + height * .08); context.lineTo(x + width * .07, y + height * .04); context.lineTo(x + width * .02, y + height * .13); context.closePath(); context.fill(); }
    if (signature.kind === "fern-shadow") { context.fillStyle = "#102016"; context.beginPath(); context.ellipse(x, y + height * .04, width * .1, height * .04, 0, 0, Math.PI * 2); context.fill(); }
    context.restore();
  };

  return { render };
}
