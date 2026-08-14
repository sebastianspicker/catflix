import type Phaser from "phaser";
import { SceneId, VariantSelection } from "../content/types";
import { publicUrl } from "../paths";
import { actorDisplayWidth, coverRect, drawOccluder, orderedActors, poseAnchor, poseCrop, poseTextureFrame, quadraticPoints, ropeCurve, spriteRotation, spriteUsesHorizontalFlip } from "./simulationRenderGeometry";
import { SceneActorSnapshot, SceneMotionMode, SceneSnapshot } from "./types";

export interface PhaserSimulationRendererOptions {
  sceneId: SceneId;
  variant: VariantSelection;
  backgroundUrl: string;
  poseSheetPath: string;
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

export function createPhaserSimulationRenderer(options: PhaserSimulationRendererOptions): PhaserSimulationRenderer {
  let activeScene: Phaser.Scene | undefined;
  let background: Phaser.GameObjects.Image | undefined;
  let foreground: Phaser.GameObjects.Graphics | undefined;
  let redStringRope: Phaser.GameObjects.Rope | undefined;
  const actorImages = new Map<string, Phaser.GameObjects.Image>();

  const preload: Phaser.Types.Scenes.ScenePreloadCallback = function (): void {
    this.load.image("catflix-background", publicUrl(options.backgroundUrl));
    this.load.image("catflix-poses", publicUrl(options.poseSheetPath));
    if (options.sceneId === "red-string") this.load.image("catflix-rope", publicUrl("/assets/scenes/v2/red-string-tile.png"));
  };
  const create: Phaser.Types.Scenes.SceneCreateCallback = function (): void {
    activeScene = this;
    background = this.add.image(0, 0, "catflix-background").setOrigin(0.5);
    const poseTexture = this.textures.get("catflix-poses");
    for (let poseFrame = 0; poseFrame < 8; poseFrame += 1) {
      const crop = poseCrop(options.sceneId, poseFrame);
      const frameName = poseTextureFrame(poseFrame);
      if (!poseTexture.has(frameName)) poseTexture.add(frameName, 0, crop.x, crop.y, crop.width, crop.height);
    }
    foreground = this.add.graphics().setDepth(10);
    if (options.acceptsTouch) this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => options.onTouch(pointer.x / Math.max(this.scale.width, 1), pointer.y / Math.max(this.scale.height, 1)));
    render(options.initialState());
    options.onReady();
  };
  const render = (state: SceneSnapshot): void => {
    if (!activeScene || !background) return;
    const width = activeScene.scale.width;
    const height = activeScene.scale.height;
    const cover = coverRect(background.width, background.height, width, height);
    background.setPosition(width / 2, height / 2).setDisplaySize(cover.width, cover.height).setAlpha(options.variant.figureGround === "enhanced" ? 0.52 : 0.78);
    for (const actor of orderedActors(state)) renderActor(activeScene, actor, width, height);
    drawForeground(width, height, state);
  };
  const renderActor = (scene: Phaser.Scene, actor: SceneActorSnapshot, width: number, height: number): void => {
    if (options.sceneId === "red-string") { renderRope(actor, width, height); return; }
    let image = actorImages.get(actor.id);
    if (!image) { image = scene.add.image(0, 0, "catflix-poses", poseTextureFrame(actor.poseFrame)); actorImages.set(actor.id, image); }
    const crop = poseCrop(options.sceneId, actor.poseFrame);
    const anchor = poseAnchor(options.sceneId, actor.poseFrame);
    const displayWidth = actorDisplayWidth(options.sceneId) * width * actor.scale;
    image.setFrame(poseTextureFrame(actor.poseFrame))
      .setOrigin(anchor.x, anchor.y)
      .setPosition(actor.x * width, actor.y * height)
      .setScale(displayWidth / crop.width * Math.abs(actor.scaleX), displayWidth / crop.width * actor.scaleY)
      .setRotation(spriteRotation(options.sceneId, actor))
      .setFlipX(spriteUsesHorizontalFlip(options.sceneId) && actor.facing < 0)
      .setVisible(actor.visible).setAlpha(actor.alpha).setDepth(actor.depth);
    if (options.variant.figureGround === "enhanced") image.setTint(0xfff2d5); else image.clearTint();
  };
  const renderRope = (actor: SceneActorSnapshot, width: number, height: number): void => {
    if (!activeScene) return;
    const curve = ropeCurve(actor, width, height, options.sceneMotionMode());
    const points = quadraticPoints(curve.start, curve.control, curve.end);
    if (!redStringRope) redStringRope = activeScene.add.rope(0, 0, "catflix-rope", undefined, points, true);
    else redStringRope.setPoints(points);
    redStringRope.setVisible(actor.visible).setAlpha(actor.alpha).setDepth(actor.depth).setScale(1, Math.max(.16, width / 1_900));
  };
  const drawForeground = (width: number, height: number, state: SceneSnapshot): void => {
    if (!foreground) return;
    foreground.clear().setDepth(10);
    const signature = state.signatureEffect;
    if (signature) {
      const x = signature.x * width;
      const y = signature.y * height;
      if (signature.kind === "reflected-ring") foreground.lineStyle(Math.max(2, width * .002), 0xe6d5a3, signature.alpha).strokeEllipse(x, y, width * .15, height * .07);
      else if (signature.kind === "perch-lights") { foreground.fillStyle(0xf2c98f, signature.alpha); for (const offset of [-.08, 0, .08]) foreground.fillCircle(x + width * offset, y + height * .1, Math.max(2, width * .003)); }
      else if (signature.kind === "folded-shadow") foreground.fillStyle(0x17141a, signature.alpha).fillTriangle(x - width * .08, y + height * .08, x + width * .07, y + height * .04, x + width * .02, y + height * .13);
      else if (signature.kind === "fern-shadow") foreground.fillStyle(0x102016, signature.alpha).fillEllipse(x, y + height * .04, width * .2, height * .08);
    }
    drawOccluder(options.sceneId, {
      fillStyle: (color, alpha) => foreground?.fillStyle(color, alpha),
      rect: (x, y, w, h) => foreground?.fillRect(x, y, w, h),
      ellipse: (x, y, rx, ry) => foreground?.fillEllipse(x, y, rx, ry),
    }, width, height);
  };
  const destroy = (): void => { activeScene = undefined; background = undefined; foreground = undefined; redStringRope = undefined; actorImages.clear(); };
  return { preload, create, render, destroy };
}
