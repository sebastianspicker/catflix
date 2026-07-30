import Phaser from "phaser";
import { getContentManifest } from "../content/registry";
import { SceneId, VariantSelection } from "../content/types";
import { createSceneSimulation, getSceneDefinition } from "./definitions";
import { PlaybackMode, Point, SceneActorSnapshot, SceneMotionMode, SceneSnapshot, SoundEvent } from "./types";
import { publicUrl } from "../paths";

export interface PhaserSimulationHostOptions {
  container: HTMLElement;
  sceneId: SceneId;
  variant: VariantSelection;
  seed: number;
  soundEnabled: boolean;
  playbackMode?: PlaybackMode;
  renderer?: "auto" | "canvas";
  /** Scene choreography is an explicit product setting, not an OS preference. */
  sceneMotionMode?: SceneMotionMode;
  /** Retained for callers that use it for UI accessibility; it never changes scene motion. */
  reducedMotion?: boolean;
  onProgress?: (elapsedMs: number, durationMs: number) => void;
  onComplete?: () => void;
  onTouch?: (timestamp: number) => void;
  onReminder?: (reminder: NonNullable<SceneSnapshot["reminder"]>) => void;
}

export interface PhaserSimulationHost {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;
  setSoundEnabled(enabled: boolean): void;
  setSceneMotionMode(mode: SceneMotionMode): void;
  setReducedMotion(enabled: boolean): void;
  dismissReminder(): void;
  snapshot(): SceneSnapshot;
}

const poseSheets: Record<SceneId, { path: string; width: number; height: number }> = {
  "balcony-birds": { path: "/assets/scenes/v2/balcony-birds-poses.png", width: 1536, height: 1024 },
  "koi-pool": { path: "/assets/scenes/v2/koi-pool-poses.png", width: 1672, height: 941 },
  "paper-moth": { path: "/assets/scenes/v2/paper-moth-poses.png", width: 1672, height: 941 },
  "beetle-under-the-fern": { path: "/assets/scenes/v2/beetle-poses.png", width: 1672, height: 941 },
  "red-string": { path: "/assets/scenes/v2/red-string-textures.png", width: 1672, height: 941 },
};

/** Isolates Phaser, canvas fallback, and opt-in event foley from React. */
export function createPhaserSimulationHost(options: PhaserSimulationHostOptions): PhaserSimulationHost {
  // OS reduced-motion is deliberately not passed into the simulation. The explicit
  // scene setting remains stable if the operating-system accessibility preference changes.
  const preferences = { sceneMotionMode: options.sceneMotionMode ?? "standard", playbackMode: options.playbackMode ?? "tablet-touch" };
  const simulation = createSceneSimulation(options.sceneId, options.variant, options.seed, preferences);
  const sheet = poseSheets[options.sceneId];
  const manifest = getContentManifest(options.sceneId);
  const backdrop = new Image();
  backdrop.src = publicUrl(manifest.visuals.backgroundPlateUrl);
  const poses = new Image();
  poses.src = publicUrl(sheet.path);
  const ropeTexture = new Image();
  ropeTexture.src = publicUrl("/assets/scenes/v2/red-string-tile.png");
  let game: Phaser.Game | undefined;
  let activeScene: Phaser.Scene | undefined;
  let background: Phaser.GameObjects.Image | undefined;
  let foreground: Phaser.GameObjects.Graphics | undefined;
  let redStringRope: Phaser.GameObjects.Rope | undefined;
  const actorImages = new Map<string, Phaser.GameObjects.Image>();
  let running = false;
  let paused = false;
  let completeNotified = false;
  let reminderId: string | undefined;
  let lastTime = 0;
  let frameId = 0;
  let soundEnabled = false; // Audio begins muted even when the variant allows it.
  let activeAudio: HTMLAudioElement | undefined;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;touch-action:manipulation";

  const onVisibilityChange = () => { if (document.hidden) pause(); };
  const handleTouch = (x: number, y: number) => {
    if (preferences.playbackMode === "tv-passive") return;
    const response = simulation.touch({ x, y });
    if (response.accepted) {
      options.container.dataset.lastContactResponse = response.response ?? "accepted";
      options.container.dataset.lastContactAt = String(performance.now());
      options.onTouch?.(simulation.snapshot().elapsedMs);
      options.container.dispatchEvent(new CustomEvent("catflix-contact-response", { detail: response.response }));
    }
  };
  const onPointerDown = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    handleTouch((event.clientX - bounds.left) / Math.max(bounds.width, 1), (event.clientY - bounds.top) / Math.max(bounds.height, 1));
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (preferences.playbackMode === "tablet-touch") canvas.addEventListener("pointerdown", onPointerDown);

  function makeGame(): void {
    if (options.renderer === "canvas") { options.container.appendChild(canvas); return; }
    try {
      game = new Phaser.Game({ type: Phaser.AUTO, parent: options.container, transparent: true, scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" }, scene: { preload, create, update } });
    } catch {
      options.container.appendChild(canvas);
    }
  }
  function preload(this: Phaser.Scene): void {
    this.load.image("catflix-background", publicUrl(manifest.visuals.backgroundPlateUrl));
    this.load.image("catflix-poses", publicUrl(sheet.path));
    if (options.sceneId === "red-string") this.load.image("catflix-rope", publicUrl("/assets/scenes/v2/red-string-tile.png"));
  }
  function create(this: Phaser.Scene): void {
    activeScene = this;
    background = this.add.image(0, 0, "catflix-background").setOrigin(0.5);
    const poseTexture = this.textures.get("catflix-poses");
    for (let poseFrame = 0; poseFrame < 8; poseFrame += 1) {
      const crop = poseCrop(options.sceneId, poseFrame);
      const frameName = poseTextureFrame(poseFrame);
      if (!poseTexture.has(frameName)) poseTexture.add(frameName, 0, crop.x, crop.y, crop.width, crop.height);
    }
    foreground = this.add.graphics().setDepth(10);
    if (preferences.playbackMode === "tablet-touch") this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => handleTouch(pointer.x / Math.max(this.scale.width, 1), pointer.y / Math.max(this.scale.height, 1)));
    renderPhaser(simulation.snapshot());
  }
  function update(_time: number, delta: number): void {
    if (running && !paused) renderPhaser(tick(delta));
  }
  function tick(delta: number): SceneSnapshot {
    const state = simulation.advance(Math.min(Math.max(delta, 0), 250));
    const primaryActor = state.actors.find((actor) => actor.visible);
    if (primaryActor) { options.container.dataset.actorX = String(primaryActor.x); options.container.dataset.actorY = String(primaryActor.y); }
    options.container.dataset.encounterPhase = state.phase;
    drawFallback(state);
    playEvents(state.soundEvents);
    if (state.reminder && state.reminder.id !== reminderId) { reminderId = state.reminder.id; options.onReminder?.(state.reminder); }
    options.onProgress?.(state.elapsedMs, state.durationMs);
    if (state.complete && !completeNotified) { completeNotified = true; pause(); options.onComplete?.(); }
    return state;
  }
  function fallbackFrame(now: number): void {
    if (!running) return;
    if (!paused) tick(lastTime === 0 ? 0 : Math.min(now - lastTime, 250));
    lastTime = now;
    frameId = scheduleFrame(fallbackFrame);
  }
  function drawFallback(state: SceneSnapshot): void {
    if (!canvas.isConnected) return;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#111411";
    context.fillRect(0, 0, width, height);
    if (backdrop.complete && backdrop.naturalWidth) {
      const cover = coverRect(backdrop.naturalWidth, backdrop.naturalHeight, width, height);
      context.globalAlpha = options.variant.figureGround === "enhanced" ? 0.52 : 0.78;
      context.drawImage(backdrop, cover.x, cover.y, cover.width, cover.height);
      context.globalAlpha = 1;
    }
    for (const actor of orderedActors(state)) drawCanvasActor(context, actor, width, height);
    if (options.sceneId === "red-string") {
      const actor = state.actors[0];
      if (actor?.visible) drawCanvasRopePath(context, actor, width, height);
    }
    drawCanvasSignature(context, state, width, height);
    drawCanvasOccluder(context, width, height);
  }
  function drawCanvasActor(context: CanvasRenderingContext2D, actor: SceneActorSnapshot, width: number, height: number): void {
    if (!actor.visible || !poses.complete || !poses.naturalWidth) return;
    if (options.sceneId === "red-string") return;
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
  }
  function renderPhaser(state: SceneSnapshot): void {
    if (!activeScene || !background) return;
    const width = activeScene.scale.width; const height = activeScene.scale.height;
    const cover = coverRect(background.width, background.height, width, height);
    background.setPosition(width / 2, height / 2).setDisplaySize(cover.width, cover.height).setAlpha(options.variant.figureGround === "enhanced" ? 0.52 : 0.78);
    for (const actor of orderedActors(state)) {
      if (options.sceneId === "red-string") { renderPhaserRope(actor, width, height); continue; }
      let image = actorImages.get(actor.id);
      if (!image) { image = activeScene.add.image(0, 0, "catflix-poses", poseTextureFrame(actor.poseFrame)); actorImages.set(actor.id, image); }
      const crop = poseCrop(options.sceneId, actor.poseFrame);
      const anchor = poseAnchor(options.sceneId, actor.poseFrame);
      const displayWidth = actorDisplayWidth(options.sceneId) * width * actor.scale;
      image.setFrame(poseTextureFrame(actor.poseFrame))
        .setOrigin(anchor.x, anchor.y)
        .setPosition(actor.x * width, actor.y * height)
        .setScale(displayWidth / crop.width * Math.abs(actor.scaleX), displayWidth * crop.height / crop.width / crop.height * actor.scaleY)
        .setRotation(spriteRotation(options.sceneId, actor))
        .setFlipX(spriteUsesHorizontalFlip(options.sceneId) && actor.facing < 0)
        .setVisible(actor.visible).setAlpha(actor.alpha).setDepth(actor.depth);
      if (options.variant.figureGround === "enhanced") image.setTint(0xfff2d5); else image.clearTint();
    }
    drawPhaserOccluder(width, height, state);
  }
  function renderPhaserRope(actor: SceneActorSnapshot, width: number, height: number): void {
    if (!activeScene) return;
    const endX = actor.x * width; const endY = actor.y * height;
    const deformation = preferences.sceneMotionMode === "low" ? .25 : 1;
    const startX = Math.max(0, endX - width * .32); const startY = Math.min(height, endY + height * (.08 + actor.stateProgress * .08) * deformation);
    const controlX = (startX + endX) / 2; const controlY = endY + height * (.12 + actor.stateProgress * .12) * deformation;
    const points = quadraticPoints(startX, startY, controlX, controlY, endX, endY);
    if (!redStringRope) redStringRope = activeScene.add.rope(0, 0, "catflix-rope", undefined, points, true);
    else redStringRope.setPoints(points);
    redStringRope.setVisible(actor.visible).setAlpha(actor.alpha).setDepth(actor.depth).setScale(1, Math.max(.16, width / 1_900));
  }
  function drawPhaserOccluder(width: number, height: number, state: SceneSnapshot): void {
    if (!foreground) return;
    foreground.clear().setDepth(10);
    const signature = state.signatureEffect;
    if (signature) {
      const x = signature.x * width; const y = signature.y * height;
      if (signature.kind === "reflected-ring") foreground.lineStyle(Math.max(2, width * .002), 0xe6d5a3, signature.alpha).strokeEllipse(x, y, width * .15, height * .07);
      else if (signature.kind === "perch-lights") { foreground.fillStyle(0xf2c98f, signature.alpha); for (const offset of [-.08, 0, .08]) foreground.fillCircle(x + width * offset, y + height * .1, Math.max(2, width * .003)); }
      else if (signature.kind === "folded-shadow") foreground.fillStyle(0x17141a, signature.alpha).fillTriangle(x - width * .08, y + height * .08, x + width * .07, y + height * .04, x + width * .02, y + height * .13);
      else if (signature.kind === "fern-shadow") foreground.fillStyle(0x102016, signature.alpha).fillEllipse(x, y + height * .04, width * .2, height * .08);
    }
    drawOccluder(options.sceneId, (color, alpha) => foreground!.fillStyle(color, alpha), (x, y, w, h) => foreground!.fillRect(x, y, w, h), (x, y, rx, ry) => foreground!.fillEllipse(x, y, rx, ry), width, height);
  }
  function drawCanvasOccluder(context: CanvasRenderingContext2D, width: number, height: number): void {
    drawOccluder(options.sceneId, (color, alpha) => { context.fillStyle = `#${color.toString(16).padStart(6, "0")}`; context.globalAlpha = alpha; }, (x, y, w, h) => context.fillRect(x, y, w, h), (x, y, rx, ry) => { context.beginPath(); context.ellipse(x, y, rx / 2, ry / 2, 0, 0, Math.PI * 2); context.fill(); }, width, height);
    context.globalAlpha = 1;
  }
  function drawCanvasRopePath(context: CanvasRenderingContext2D, actor: SceneActorSnapshot, width: number, height: number): void {
    const deformation = preferences.sceneMotionMode === "low" ? .25 : 1;
    const endX = actor.x * width; const endY = actor.y * height; const startX = Math.max(0, endX - width * .32); const startY = Math.min(height, endY + height * (.08 + actor.stateProgress * .08) * deformation);
    context.save(); context.globalAlpha = actor.alpha; context.lineCap = "round"; context.strokeStyle = ropeTexture.complete ? context.createPattern(ropeTexture, "repeat") ?? "#a92d2f" : "#a92d2f"; context.lineWidth = Math.max(5, width * 0.01); context.beginPath(); context.moveTo(startX, startY); context.quadraticCurveTo((startX + endX) / 2, endY + height * (.12 + actor.stateProgress * .12) * deformation, endX, endY); context.stroke(); context.restore();
  }
  function drawCanvasSignature(context: CanvasRenderingContext2D, state: SceneSnapshot, width: number, height: number): void {
    const signature = state.signatureEffect; if (!signature || signature.kind === "slack-curve") return;
    const x = signature.x * width; const y = signature.y * height; context.save(); context.globalAlpha = signature.alpha;
    if (signature.kind === "reflected-ring") { context.strokeStyle = "#e6d5a3"; context.lineWidth = Math.max(2, width * .002); context.beginPath(); context.ellipse(x, y, width * .075, height * .035, 0, 0, Math.PI * 2); context.stroke(); }
    if (signature.kind === "perch-lights") { context.fillStyle = "#f2c98f"; for (const offset of [-.08, 0, .08]) { context.beginPath(); context.arc(x + width * offset, y + height * .1, Math.max(2, width * .003), 0, Math.PI * 2); context.fill(); } }
    if (signature.kind === "folded-shadow") { context.fillStyle = "#17141a"; context.beginPath(); context.moveTo(x - width * .08, y + height * .08); context.lineTo(x + width * .07, y + height * .04); context.lineTo(x + width * .02, y + height * .13); context.closePath(); context.fill(); }
    if (signature.kind === "fern-shadow") { context.fillStyle = "#102016"; context.beginPath(); context.ellipse(x, y + height * .04, width * .1, height * .04, 0, 0, Math.PI * 2); context.fill(); }
    context.restore();
  }
  function playEvents(events: readonly SoundEvent[]): void {
    if (!soundEnabled || !manifest.audio?.provenance?.some((record) => record.eligible)) return;
    for (const event of events) {
      const provenance = manifest.audio.provenance.find((record) => record.eventKind === event.kind && record.eligible && record.source.startsWith("/assets/"));
      if (!provenance) continue;
      activeAudio?.pause();
      activeAudio = new Audio(publicUrl(provenance.source)); activeAudio.volume = 0.08; void activeAudio.play().catch(() => undefined);
      break; // At most one audible event at a time.
    }
  }
  function start(): void { if (running) return; running = true; paused = false; lastTime = performance.now(); makeGame(); if (!game) { options.container.appendChild(canvas); frameId = scheduleFrame(fallbackFrame); } }
  function silence(): void { activeAudio?.pause(); activeAudio = undefined; }
  function pause(): void { paused = true; silence(); game?.loop.pause(); }
  function resume(): void { if (!running || simulation.snapshot().complete) return; paused = false; lastTime = performance.now(); game?.loop.resume(); }
  function stop(): void { paused = true; running = false; cancelFrame(frameId); silence(); game?.loop.pause(); }
  function destroy(): void { stop(); game?.destroy(true); game = undefined; activeScene = undefined; background = undefined; foreground = undefined; redStringRope = undefined; actorImages.clear(); canvas.remove(); canvas.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("visibilitychange", onVisibilityChange); }
  function setSoundEnabled(enabled: boolean): void { soundEnabled = enabled; if (!enabled) silence(); }
  function setSceneMotionMode(mode: SceneMotionMode): void { preferences.sceneMotionMode = mode; }
  function setReducedMotion(_enabled: boolean): void { /* OS UI preference does not alter authored choreography. */ }
  function dismissReminder(): void { reminderId = undefined; simulation.dismissReminder(); }
  return { start, pause, resume, stop, destroy, setSoundEnabled, setSceneMotionMode, setReducedMotion, dismissReminder, snapshot: () => simulation.snapshot() };
}

function poseCrop(sceneId: SceneId, poseFrame: number): { x: number; y: number; width: number; height: number } {
  const column = ((Math.floor(poseFrame) % 8) + 8) % 8 % 4; const row = Math.floor((((Math.floor(poseFrame) % 8) + 8) % 8) / 4);
  const sheet = poseSheets[sceneId];
  const width = Math.floor(sheet.width / 4); const height = Math.floor(sheet.height / 2);
  return { x: column * width, y: row === 0 ? 0 : sheet.height - height, width, height };
}

function poseTextureFrame(poseFrame: number): string { return `pose-${((Math.floor(poseFrame) % 8) + 8) % 8}`; }

function actorDisplayWidth(sceneId: SceneId): number { return getSceneDefinition(sceneId).displayWidth; }
function spriteRotation(_sceneId: SceneId, actor: SceneActorSnapshot): number { return actor.angle; }
function spriteUsesHorizontalFlip(sceneId: SceneId): boolean { return sceneId === "balcony-birds"; }
function poseAnchor(sceneId: SceneId, poseFrame: number): Point {
  const frame = ((Math.floor(poseFrame) % 8) + 8) % 8;
  const anchors: Record<Exclude<SceneId, "red-string">, readonly Point[]> = {
    "balcony-birds": [{ x: .5, y: .58 }, { x: .51, y: .58 }, { x: .49, y: .58 }, { x: .5, y: .61 }, { x: .48, y: .53 }, { x: .47, y: .52 }, { x: .48, y: .53 }, { x: .5, y: .82 }],
    "koi-pool": [{ x: .55, y: .72 }, { x: .34, y: .68 }, { x: .43, y: .66 }, { x: .44, y: .68 }, { x: .25, y: .69 }, { x: .41, y: .72 }, { x: .5, y: .72 }, { x: .42, y: .73 }],
    "paper-moth": [{ x: .48, y: .49 }, { x: .49, y: .5 }, { x: .5, y: .51 }, { x: .5, y: .52 }, { x: .6, y: .51 }, { x: .59, y: .51 }, { x: .58, y: .51 }, { x: .48, y: .52 }],
    "beetle-under-the-fern": [{ x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }, { x: .5, y: .53 }],
  };
  return sceneId === "red-string" ? { x: .5, y: .5 } : anchors[sceneId][frame];
}
function orderedActors(state: SceneSnapshot): SceneActorSnapshot[] { return [...state.actors].sort((left, right) => left.depth - right.depth); }
function coverRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): { x: number; y: number; width: number; height: number } { const scale = Math.max(targetWidth / Math.max(sourceWidth, 1), targetHeight / Math.max(sourceHeight, 1)); const width = sourceWidth * scale; const height = sourceHeight * scale; return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height }; }
function drawOccluder(sceneId: SceneId, fillStyle: (color: number, alpha: number) => void, rect: (x: number, y: number, width: number, height: number) => void, ellipse: (x: number, y: number, width: number, height: number) => void, width: number, height: number): void {
  // Foreground forms are intentionally static: they restore spatial layering without invented ambience.
  if (sceneId === "balcony-birds") return;
  if (sceneId === "koi-pool") { fillStyle(0x1a3027, .14); ellipse(width * .76, height * .84, width * .28, height * .08); return; }
  if (sceneId === "paper-moth") { fillStyle(0x161516, .72); rect(width * .93, 0, width * .07, height); return; }
  if (sceneId === "beetle-under-the-fern") return;
  fillStyle(0x1a1718, .24); rect(0, 0, width * .025, height); rect(width * .975, 0, width * .025, height);
}
function quadraticPoints(startX: number, startY: number, controlX: number, controlY: number, endX: number, endY: number): Phaser.Types.Math.Vector2Like[] {
  return Array.from({ length: 13 }, (_, index) => {
    const t = index / 12; const inverse = 1 - t;
    return { x: inverse * inverse * startX + 2 * inverse * t * controlX + t * t * endX, y: inverse * inverse * startY + 2 * inverse * t * controlY + t * t * endY };
  });
}
function scheduleFrame(callback: FrameRequestCallback): number { return typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(callback) : window.setTimeout(() => callback(performance.now()), 16); }
function cancelFrame(frameId: number): void { if (typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(frameId); else window.clearTimeout(frameId); }
