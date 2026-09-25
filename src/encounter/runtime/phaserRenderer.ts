import type Phaser from "phaser";
import type { SceneActorSnapshot, SceneMotionMode, SceneScore, SceneSnapshot, VariantSelection } from "../../domain";
import { publicUrl } from "../../paths";
import { coverRect, drawOccluder, orderedActors, poseAnchor, poseCrop, poseTextureFrame, quadraticPoints, ropeCurve, spriteUsesHorizontalFlip } from "./renderGeometry";
import type { EncounterVisualAssets } from "./canvasRenderer";

export interface PhaserSimulationRendererOptions {
  score: SceneScore;
  variant: VariantSelection;
  visuals: EncounterVisualAssets;
  acceptsTouch: boolean;
  onTouch(x: number, y: number): void;
  sceneMotionMode(): SceneMotionMode;
  initialState(): SceneSnapshot;
  onReady(): void;
}

export interface PhaserSimulationRenderer {
  preload: Phaser.Types.Scenes.ScenePreloadCallback;
  create: Phaser.Types.Scenes.SceneCreateCallback;
  render(state: SceneSnapshot): void;
  destroy(): void;
}

interface PhaserRendererState {
  options: PhaserSimulationRendererOptions;
  activeScene?: Phaser.Scene;
  background?: Phaser.GameObjects.Image;
  foreground?: Phaser.GameObjects.Graphics;
  redStringRope?: Phaser.GameObjects.Rope;
  actorImages: Map<string, Phaser.GameObjects.Image>;
}

export function createPhaserSimulationRenderer(options: PhaserSimulationRendererOptions): PhaserSimulationRenderer {
  const renderer: PhaserRendererState = { options, actorImages: new Map() };
  return {
    preload: function (): void { preloadAssets(renderer, this); },
    create: function (): void { initializeScene(renderer, this); },
    render: (state) => { renderFrame(renderer, state); },
    destroy: () => { destroyRenderer(renderer); },
  };
}

function preloadAssets(renderer: PhaserRendererState, scene: Phaser.Scene): void {
  const { options } = renderer;
  scene.load.image("catflix-background", publicUrl(options.visuals.backgroundUrl));
  scene.load.image("catflix-poses", publicUrl(options.visuals.poseSheetUrl));
  if (options.score.id === "red-string" && options.visuals.ropeTextureUrl) {
    scene.load.image("catflix-rope", publicUrl(options.visuals.ropeTextureUrl));
  }
}

function initializeScene(renderer: PhaserRendererState, scene: Phaser.Scene): void {
  renderer.activeScene = scene;
  renderer.background = scene.add.image(0, 0, "catflix-background").setOrigin(0.5);
  registerPoseFrames(scene);
  renderer.foreground = scene.add.graphics().setDepth(10);
  if (renderer.options.acceptsTouch) {
    scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      renderer.options.onTouch(
        pointer.x / Math.max(scene.scale.width, 1),
        pointer.y / Math.max(scene.scale.height, 1),
      );
    });
  }
  renderFrame(renderer, renderer.options.initialState());
  renderer.options.onReady();
}

function registerPoseFrames(scene: Phaser.Scene): void {
  const poseTexture = scene.textures.get("catflix-poses");
  const poseSheet = poseTexture.getSourceImage() as { width: number; height: number };
  for (let poseFrame = 0; poseFrame < 8; poseFrame += 1) {
    const crop = poseCrop(poseSheet.width, poseSheet.height, poseFrame);
    const frameName = poseTextureFrame(poseFrame);
    if (!poseTexture.has(frameName)) poseTexture.add(frameName, 0, crop.x, crop.y, crop.width, crop.height);
  }
}

function renderFrame(renderer: PhaserRendererState, state: SceneSnapshot): void {
  const { activeScene, background, options } = renderer;
  if (!activeScene || !background) return;
  const width = activeScene.scale.width;
  const height = activeScene.scale.height;
  const cover = coverRect(background.width, background.height, width, height);
  background
    .setPosition(width / 2, height / 2)
    .setDisplaySize(cover.width, cover.height)
    .setAlpha(options.variant.figureGround === "enhanced" ? 0.52 : 0.78);
  for (const actor of orderedActors(state)) renderActor(renderer, actor, width, height);
  drawForeground(renderer, width, height, state);
}

function renderActor(renderer: PhaserRendererState, actor: SceneActorSnapshot, width: number, height: number): void {
  const { activeScene, options } = renderer;
  if (!activeScene) return;
  if (options.score.id === "red-string") {
    renderRope(renderer, actor, width, height);
    return;
  }
  const image = actorImage(renderer, actor);
  const poseSheet = activeScene.textures.get("catflix-poses").getSourceImage() as { width: number; height: number };
  const crop = poseCrop(poseSheet.width, poseSheet.height, actor.poseFrame);
  const anchor = poseAnchor(options.score.id, actor.poseFrame);
  const displayWidth = options.score.displayWidth * width * actor.scale;
  image.setFrame(poseTextureFrame(actor.poseFrame))
    .setOrigin(anchor.x, anchor.y)
    .setPosition(actor.x * width, actor.y * height)
    .setScale(displayWidth / crop.width * Math.abs(actor.scaleX), displayWidth / crop.width * actor.scaleY)
    .setRotation(actor.angle)
    .setFlipX(spriteUsesHorizontalFlip(options.score.id) && actor.facing < 0)
    .setVisible(actor.visible)
    .setAlpha(actor.alpha)
    .setDepth(actor.depth);
  if (options.variant.figureGround === "enhanced") image.setTint(0xfff2d5);
  else image.clearTint();
}

function actorImage(renderer: PhaserRendererState, actor: SceneActorSnapshot): Phaser.GameObjects.Image {
  const existing = renderer.actorImages.get(actor.id);
  if (existing) return existing;
  const image = renderer.activeScene?.add.image(0, 0, "catflix-poses", poseTextureFrame(actor.poseFrame));
  if (!image) throw new Error("Cannot create an actor image before the Phaser scene is ready.");
  renderer.actorImages.set(actor.id, image);
  return image;
}

function renderRope(renderer: PhaserRendererState, actor: SceneActorSnapshot, width: number, height: number): void {
  const { activeScene, options } = renderer;
  if (!activeScene) return;
  const curve = ropeCurve(actor, width, height, options.sceneMotionMode());
  const points = quadraticPoints(curve.start, curve.control, curve.end);
  if (!renderer.redStringRope) renderer.redStringRope = activeScene.add.rope(0, 0, "catflix-rope", undefined, points, true);
  else renderer.redStringRope.setPoints(points);
  renderer.redStringRope
    .setVisible(actor.visible)
    .setAlpha(actor.alpha)
    .setDepth(actor.depth)
    .setScale(1, Math.max(0.16, width / 1_900));
}

function drawForeground(renderer: PhaserRendererState, width: number, height: number, state: SceneSnapshot): void {
  const { foreground } = renderer;
  if (!foreground) return;
  foreground.clear().setDepth(10);
  drawSignature(foreground, width, height, state);
  drawOccluder(renderer.options.score.id, {
    fillStyle: (color, alpha) => foreground.fillStyle(color, alpha),
    rect: (x, y, rectWidth, rectHeight) => foreground.fillRect(x, y, rectWidth, rectHeight),
    ellipse: (x, y, radiusX, radiusY) => foreground.fillEllipse(x, y, radiusX, radiusY),
  }, width, height);
}

function drawSignature(foreground: Phaser.GameObjects.Graphics, width: number, height: number, state: SceneSnapshot): void {
  const signature = state.signatureEffect;
  if (!signature) return;
  const x = signature.x * width;
  const y = signature.y * height;
  if (signature.kind === "reflected-ring") {
    foreground.lineStyle(Math.max(2, width * 0.002), 0xe6d5a3, signature.alpha).strokeEllipse(x, y, width * 0.15, height * 0.07);
  } else if (signature.kind === "perch-lights") {
    foreground.fillStyle(0xf2c98f, signature.alpha);
    for (const offset of [-0.08, 0, 0.08]) foreground.fillCircle(x + width * offset, y + height * 0.1, Math.max(2, width * 0.003));
  } else if (signature.kind === "folded-shadow") {
    foreground.fillStyle(0x17141a, signature.alpha).fillTriangle(x - width * 0.08, y + height * 0.08, x + width * 0.07, y + height * 0.04, x + width * 0.02, y + height * 0.13);
  } else if (signature.kind === "fern-shadow") {
    foreground.fillStyle(0x102016, signature.alpha).fillEllipse(x, y + height * 0.04, width * 0.2, height * 0.08);
  }
}

function destroyRenderer(renderer: PhaserRendererState): void {
  renderer.activeScene = undefined;
  renderer.background = undefined;
  renderer.foreground = undefined;
  renderer.redStringRope = undefined;
  renderer.actorImages.clear();
}
