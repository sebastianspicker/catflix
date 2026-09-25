import type { Dispatch, RefObject, SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SceneSnapshot } from "../../domain";
import { updatePlayerProgress } from "./usePlayerHostLifecycle";

describe("player progress updates", () => {
  it("keeps precise elapsed time while updating React state only for visible changes", () => {
    const elapsedRef = { current: 0 } as RefObject<number>;
    const displayedSecondRef = { current: 0 } as RefObject<number>;
    const phaseRef = { current: "invitation" } as RefObject<SceneSnapshot["phase"]>;
    const setElapsed = vi.fn() as Dispatch<SetStateAction<number>>;
    const setPhase = vi.fn() as Dispatch<SetStateAction<SceneSnapshot["phase"]>>;
    const state = { elapsedRef, displayedSecondRef, phaseRef, setElapsed, setPhase };

    updatePlayerProgress(state, 125, "invitation");
    updatePlayerProgress(state, 999, "invitation");
    expect(elapsedRef.current).toBe(999);
    expect(setElapsed).not.toHaveBeenCalled();
    expect(setPhase).not.toHaveBeenCalled();

    updatePlayerProgress(state, 1_000, "passage");
    updatePlayerProgress(state, 1_999, "passage");
    expect(elapsedRef.current).toBe(1_999);
    expect(setElapsed).toHaveBeenCalledExactlyOnceWith(1_000);
    expect(setPhase).toHaveBeenCalledExactlyOnceWith("passage");

    updatePlayerProgress(state, 90_000, "finale");
    expect(elapsedRef.current).toBe(90_000);
    expect(setElapsed).toHaveBeenLastCalledWith(90_000);
    expect(setPhase).toHaveBeenLastCalledWith("finale");
  });
});
