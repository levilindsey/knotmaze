// @vitest-environment happy-dom
// K778: the HUD's Undo button as built - beside the rules text with the
// count left, a tap calls main's handler, and no button without an undo.
import { afterEach, describe, expect, it, vi } from "vitest";
import { MazeHud } from "../../src/ui/maze_hud";
import type { HudSnapshot } from "../../src/ui/maze_hud";

const SNAP: HudSnapshot = {
  showStats: false,
  timeMs: 0,
  path: 0,
  optimal: 0,
  efficiency: null,
  backtrack: null,
  junctions: 0,
  deadEnds: null,
  rules: "ice 25%",
  undo: { left: 1 },
};

afterEach(() => {
  document.body.textContent = "";
});

describe("K778 HUD Undo button", () => {
  it("shows beside the rules text and a tap calls the handler", () => {
    const hud = new MazeHud();
    const onUndo = vi.fn();
    hud.onUndo = onUndo;
    hud.render(SNAP);
    const btn = hud.el.querySelector<HTMLButtonElement>(".km-hud-undo");
    expect(btn?.textContent).toBe("Undo \u00B7 1");
    expect(hud.el.textContent).toContain("ice 25%");
    btn?.click();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("is gone when the snapshot carries no undo, and returns with one", () => {
    const hud = new MazeHud();
    hud.render(SNAP);
    expect(hud.el.querySelector(".km-hud-undo")).not.toBeNull();
    hud.render({ ...SNAP, undo: null });
    expect(hud.el.querySelector(".km-hud-undo")).toBeNull();
    hud.render({ ...SNAP, undo: { left: 2 } });
    expect(hud.el.querySelector(".km-hud-undo")?.textContent).toBe("Undo \u00B7 2");
  });
});
