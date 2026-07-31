import type { ComparisonRecord, DeviceSettings } from "./types";
import type { VariantSelection } from "../content/types";

const defaultSettings: DeviceSettings = { soundEnabled: false, reducedMotion: false, sceneMotionMode: "standard" };

export function createMatchedComparison(comparison: ComparisonRecord): ComparisonRecord {
  const differences = changedVariantDimensions(comparison);
  if (differences.length !== 1 || differences[0] !== comparison.changedDimension) throw new Error("A matched comparison must change exactly one declared dimension.");
  return cloneValue(comparison);
}

export function normalizeSettings(value: unknown): DeviceSettings {
  const settings = isObject(value) ? value : {};
  return {
    soundEnabled: typeof settings.soundEnabled === "boolean" ? settings.soundEnabled : defaultSettings.soundEnabled,
    reducedMotion: typeof settings.reducedMotion === "boolean" ? settings.reducedMotion : defaultSettings.reducedMotion,
    sceneMotionMode: settings.sceneMotionMode === "low" ? "low" : "standard",
    ...(typeof settings.safetyAcknowledgedAt === "string" ? { safetyAcknowledgedAt: settings.safetyAcknowledgedAt } : {}),
  };
}

function changedVariantDimensions(comparison: ComparisonRecord): (keyof VariantSelection)[] {
  const { first, second } = comparison;
  return [
    first.variant.figureGround !== second.variant.figureGround ? "figureGround" : undefined,
    first.variant.motion !== second.variant.motion ? "motion" : undefined,
    first.variant.sound !== second.variant.sound ? "sound" : undefined,
    first.variant.novelty !== second.variant.novelty ? "novelty" : undefined,
  ].filter((key): key is keyof VariantSelection => key !== undefined);
}

export function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
