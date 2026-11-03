// @vitest-environment happy-dom
// K1135: a behavior test for Reset's step re-anchor (K1115) on a real
// Tweakpane Pane. K1115's fix reaches Tweakpane internals
// (`controller.value.value_.constraint_`, a StepConstraint's origin) and
// used to be guarded only by source-text pins in panel_rows.test.ts; if
// those internals change, the re-anchor silently does nothing and a
// reset lands a step off the default. This file opts into happy-dom
// alone (the rest of the suite keeps its environment), builds a Pane,
// binds a stepped slider the way row() does in tweakpane_panel.ts, and
// runs the same exported re-anchor the panel's reset paths call.
import { Pane } from "tweakpane";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  reanchorStepBinding,
  resetStepReanchorWarnForTest,
  stepConstraintOf,
} from "../../src/ui/tweakpane_panel";

// weaveDensity's shape (tweakpane_panel.ts): default 0.35, step 0.05;
// 0.3815 is the off-grid link value K1115's probe reset.
const DEF = 0.35;
const STEP = 0.05;
const OFF_GRID = 0.3815;

const panes: Pane[] = [];
afterEach(() => {
  while (panes.length) panes.pop()?.dispose();
});

function steppedBinding(obj: { value: number }) {
  const pane = new Pane();
  panes.push(pane);
  return pane.addBinding(obj, "value", { min: 0, max: 1, step: STEP });
}

describe("K1135: Reset's step re-anchor on a real Pane", () => {
  it("lands exactly on the default, with the constraint origin moved", () => {
    const obj = { value: OFF_GRID };
    const api = steppedBinding(obj);
    // The grid starts anchored on the first-shown (off-grid) value.
    expect(stepConstraintOf(api)?.origin).toBeCloseTo(OFF_GRID, 12);
    // The reset path K1115 fixed: store the default, re-anchor, refresh.
    obj.value = DEF;
    expect(reanchorStepBinding(api, STEP, DEF)).toBe(true);
    expect(stepConstraintOf(api)?.origin).toBe(DEF);
    api.refresh();
    expect(obj.value).toBe(DEF);
  });

  it("without the re-anchor, the same refresh lands a step off", () => {
    const obj = { value: OFF_GRID };
    const api = steppedBinding(obj);
    obj.value = DEF;
    api.refresh();
    expect(obj.value).not.toBe(DEF);
    expect(obj.value).toBeCloseTo(0.3315, 10);
  });

  it("warns once, naming K1135, when a binding has no step constraint", () => {
    resetStepReanchorWarnForTest();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const pane = new Pane();
      panes.push(pane);
      const obj = { value: 2 };
      const api = pane.addBinding(obj, "value");
      expect(reanchorStepBinding(api, STEP, 2)).toBe(false);
      expect(reanchorStepBinding(api, STEP, 2)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("K1135");
    } finally {
      warn.mockRestore();
      resetStepReanchorWarnForTest();
    }
  });
});
