import { describe, expect, it } from "vitest";
import { createLifecycle } from "../../src/app/lifecycle";
import type { LifecycleDeps } from "../../src/app/lifecycle";
import type { SceneRef } from "../../src/app/scene_ref";
import type { UrlParams } from "../../src/ui/url_state";

// K436/K454/K469: a regenerate clears the frame loop's halted flag, so a
// halted page recovers without a reload (the frame loop's own comment
// always said "Cleared on regenerate"; only the worker core did it).
// The lifecycle's begin* entry points are where every regenerate lands.
function fakes() {
  const loop = { halted: true };
  const renderer = { beginReveal: () => {}, update: () => {} };
  const scene = {
    ps: {},
    renderer,
    fabric: null,
    fabricController: null,
    walkGraph: null,
  } as unknown as SceneRef;
  const host = {
    disarm: () => {},
    beginPresettle: () => {},
    beginLoad: () => {},
    armBudget: () => {},
    wake: () => {},
  };
  const deps = {
    params: {
      appearSequence: "instant",
      appearSpeed: 1,
      loadSettle: 0,
      settleBudget: 12,
      physics: true,
      seed: 7,
    } as unknown as UrlParams,
    host: host as unknown as LifecycleDeps["host"],
    root: { visible: true } as LifecycleDeps["root"],
    warmup: { wave1Done: true } as unknown as LifecycleDeps["warmup"],
    loader: { show: () => {}, hide: () => {} },
    physicsTuning: () => ({
      slack: 0, drag: 0, repulsion: 1, bend: 1, smooth: 0,
      stiffness: 1, gridAlign: 0, threadWidth: 0.5, temperature: 0,
    }) as unknown as ReturnType<LifecycleDeps["physicsTuning"]>,
    handRendererLook: () => {},
    fitToScreen: () => {},
    wake: () => {},
    indicators: { hideAll: () => {} } as unknown as LifecycleDeps["indicators"],
    loop,
    perfLine: "",
    reveal: null,
  } as unknown as LifecycleDeps;
  return { deps, loop, scene };
}

describe("lifecycle regenerate (K436)", () => {
  it("clears halted when a settle begins", () => {
    const { deps, loop, scene } = fakes();
    const life = createLifecycle(deps, scene);
    life.beginSettle();
    expect(loop.halted).toBe(false);
  });

  it("clears halted when a physics-off load begins", () => {
    const { deps, loop, scene } = fakes();
    const life = createLifecycle(deps, scene);
    life.beginLoading();
    expect(loop.halted).toBe(false);
  });
});
