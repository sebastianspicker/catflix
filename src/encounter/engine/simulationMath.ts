import type { Point } from "../../domain";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const normalize = (x: number, y: number): Point => { const length = Math.hypot(x, y) || 1; return { x: x / length, y: y / length }; };
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * clamp(amount, 0, 1);
export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const progress = clamp((value - edge0) / Math.max(edge1 - edge0, Number.EPSILON), 0, 1);
  return progress * progress * (3 - 2 * progress);
};
export const pulse = (value: number, start: number, end: number, feather = 350) => smoothstep(start, start + feather, value) * (1 - smoothstep(end - feather, end, value));
