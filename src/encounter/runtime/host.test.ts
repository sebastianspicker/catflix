import { afterEach, describe, expect, it } from "vitest";
import { getSceneScore } from "../../catalogue/model";
import { defaultSessionVariant } from "../../domain";
import { createEncounterRuntime } from "./host";

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalImage = Object.getOwnPropertyDescriptor(globalThis, "Image");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const restoreGlobal = (name: string, descriptor: PropertyDescriptor | undefined): void => {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
};

afterEach(() => {
  restoreGlobal("document", originalDocument);
  restoreGlobal("Image", originalImage);
  restoreGlobal("window", originalWindow);
});

describe("encounter runtime visibility", () => {
  it("pauses through the earned visibility callback", () => {
    const listeners = new Map<string, Set<(event: Event) => void>>();
    const documentDouble = {
      hidden: false,
      createElement: () => ({ style: { cssText: "" }, isConnected: false, setAttribute: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, remove: () => undefined }),
      addEventListener: (type: string, listener: (event: Event) => void) => { const registered = listeners.get(type) ?? new Set(); registered.add(listener); listeners.set(type, registered); },
      removeEventListener: (type: string, listener: (event: Event) => void) => { listeners.get(type)?.delete(listener); },
    };
    Reflect.defineProperty(globalThis, "document", { configurable: true, value: documentDouble });
    Reflect.defineProperty(globalThis, "Image", { configurable: true, value: class { src = ""; complete = false; naturalWidth = 0; naturalHeight = 0; } });
    Reflect.defineProperty(globalThis, "window", { configurable: true, value: { clearTimeout } });
    const container = document.createElement("div");
    let visibilityPauses = 0;
    const runtime = createEncounterRuntime({
      container,
      score: getSceneScore("paper-moth"),
      audio: undefined,
      audioPlayback: undefined,
      visuals: { backgroundUrl: "/background.webp", poseSheetUrl: "/poses.png" },
      variant: defaultSessionVariant,
      seed: 1,
      onVisibilityPause: () => { visibilityPauses += 1; },
    });

    documentDouble.hidden = true;
    listeners.get("visibilitychange")?.forEach((listener) => { listener(new Event("visibilitychange")); });

    expect(visibilityPauses).toBe(1);
    runtime.destroy();
  });
});
