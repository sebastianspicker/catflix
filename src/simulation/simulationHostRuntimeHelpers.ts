export const maximumSimulationDeltaMs = 250;
export const clampSimulationDelta = (delta: number): number => Math.min(Math.max(delta, 0), maximumSimulationDeltaMs);
export const scheduleFrame = (callback: FrameRequestCallback): number => typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(callback) : window.setTimeout(() => callback(performance.now()), 16);
export const cancelFrame = (frameId: number): void => { if (typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(frameId); else window.clearTimeout(frameId); };
export function createFallbackCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;touch-action:manipulation";
  return canvas;
}
