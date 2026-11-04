import { describe, expect, it } from "vitest";
import { createPointerInput } from "../../src/app/input_pointer";
import type { PointerInputDeps } from "../../src/app/input_pointer";
import type { SceneRef } from "../../src/app/scene_ref";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

// K1173: the pointer routing for the Tug threads preference. The input is
// built on fakes (a canvas that only records its listeners, a one-chain
// particle view, a recording host), and real pointer events are driven
// through it: with the preference off a drag that starts on a thread pans
// and the host never sees a grab, a tap still plucks, and with it on the
// same drag grabs. A change mid-press applies from the next press.

type Handler = (e: PointerEvent) => void;

interface Harness {
  down: Handler;
  move: Handler;
  up: Handler;
  grabCalls: number[];
  dragToCalls: number;
  panCalls: Array<[number, number]>;
  synthPlucks: number;
  rendererPlucks: number;
  setTug: (on: boolean) => void;
}

function harness(tugOn: boolean): Harness {
  const listeners = new Map<string, Handler>();
  const canvas = {
    style: {} as Record<string, string>,
    addEventListener: (type: string, fn: Handler) => listeners.set(type, fn),
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
  };
  // One closed chain of six particles along y = 0, at x = 0..5.
  const positions = new Float64Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0]);
  const ps = {
    positions,
    chains: [[0, 1, 2, 3, 4, 5]],
    chainBreakAfter: [-1],
    grabbedParticle: -1,
    nearest(x: number, y: number, r: number): number {
      let best = -1;
      let bd = r;
      for (let i = 0; i < 6; i++) {
        const d = Math.hypot(positions[i * 2] - x, positions[i * 2 + 1] - y);
        if (d <= bd) {
          bd = d;
          best = i;
        }
      }
      return best;
    },
    chainOfParticle: () => 0,
  };
  const h: Harness = {
    down: () => {},
    move: () => {},
    up: () => {},
    grabCalls: [],
    dragToCalls: 0,
    panCalls: [],
    synthPlucks: 0,
    rendererPlucks: 0,
    setTug: () => {},
  };
  const host = {
    grab: (p: number) => {
      h.grabCalls.push(p);
      if (p >= 0) ps.grabbedParticle = p;
      return p;
    },
    dragTo: () => h.dragToCalls++,
    release: () => {
      ps.grabbedParticle = -1;
    },
    tug: () => 0,
  };
  const renderer = {
    exploreOn: false,
    pickThread: () => ({ chain: 0, ctrl: 2, arc: 2, side: 1 }),
    pluck: () => {
      h.rendererPlucks++;
      return true;
    },
    plucks: { resetSkip: () => {}, lastSkip: "", siteTester: () => () => true },
    pluckPoint: () => ({ x: 2, y: 0 }),
    tugSpan: () => null,
  };
  const settings = { muted: false, highContrast: false, tugThreads: tugOn };
  h.setTug = (on: boolean) => {
    settings.tugThreads = on;
  };
  const deps = {
    app: { canvas, screen: { width: 800, height: 600 } },
    root: { position: { x: 0, y: 0 }, scale: { x: 10, y: 10 } },
    params: { ...PARAM_DEFAULTS, mazeFabric: false, pluckTug: 0 },
    settings,
    motion: { reduced: false },
    synth: { pluck: () => h.synthPlucks++ },
    host,
    ripples: { look: "wave", reducedMotion: false, add: () => {} },
    freqForCtrl: () => 440,
    pluckUnit: () => ({ spanCtrl: null, reach: 1 }),
    physicsLive: () => true,
    wake: () => {},
    isLoading: () => false,
    placeWorldAt: () => {},
    touchCamera: () => {},
    zoomAt: () => {},
    panBy: (dx: number, dy: number) => h.panCalls.push([dx, dy]),
    resetCamera: () => {},
    nowSec: () => 0,
    handleFabricTap: () => false,
    inWaitZone: () => false,
    setWaitCue: () => {},
    tapReach: () => 0,
  } as unknown as PointerInputDeps;
  const scene = {
    ps,
    renderer,
    debug: null,
    walkGraph: null,
    tangle: null,
    buildHueGroup: undefined,
    buildStrandCount: 1,
    fabric: null,
    chase: null,
    turnMino: null,
    fabricController: null,
    reveal: null,
  } as unknown as SceneRef;
  createPointerInput(deps, scene);
  h.down = listeners.get("pointerdown")!;
  h.move = listeners.get("pointermove")!;
  h.up = listeners.get("pointerup")!;
  return h;
}

const ev = (type: string, x: number, y = 0): PointerEvent =>
  ({
    type,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: x,
    clientY: y,
    timeStamp: 1000 + x,
    altKey: false,
    preventDefault: () => {},
  }) as unknown as PointerEvent;

// A press on the thread at screen (20, 0) (lattice (2, 0), particle 2),
// then a drag 80 px to the right, past the mouse tap slop (4 px).
const dragFromThread = (h: Harness): void => {
  h.down(ev("pointerdown", 20));
  h.move(ev("pointermove", 100));
};

describe("K1173 Tug threads routing", () => {
  it("off: a drag that starts on a thread pans and sends the host no grab", () => {
    const h = harness(false);
    dragFromThread(h);
    expect(h.grabCalls).toEqual([]);
    expect(h.panCalls).toEqual([[80, 0]]);
    h.move(ev("pointermove", 110));
    expect(h.panCalls).toEqual([
      [80, 0],
      [10, 0],
    ]);
    h.up(ev("pointerup", 110));
    expect(h.grabCalls).toEqual([]);
    expect(h.synthPlucks).toBe(0);
  });

  it("off: a tap on a thread still plucks, touching no grab", () => {
    const h = harness(false);
    h.down(ev("pointerdown", 20));
    h.move(ev("pointermove", 22)); // inside the slop: still a tap
    h.up(ev("pointerup", 22));
    expect(h.grabCalls).toEqual([]);
    expect(h.panCalls).toEqual([]);
    expect(h.rendererPlucks).toBe(1);
    expect(h.synthPlucks).toBe(1);
  });

  it("on: the same drag grabs, and does not pan", () => {
    const h = harness(true);
    dragFromThread(h);
    expect(h.grabCalls).toEqual([2]);
    expect(h.panCalls).toEqual([]);
    h.up(ev("pointerup", 100));
  });

  it("on: a tap on a thread still plucks, as today", () => {
    const h = harness(true);
    h.down(ev("pointerdown", 20));
    h.up(ev("pointerup", 20));
    expect(h.grabCalls).toEqual([]);
    expect(h.rendererPlucks).toBe(1);
    expect(h.synthPlucks).toBe(1);
  });

  it("a change mid-press applies from the next press", () => {
    const offFirst = harness(false);
    offFirst.down(ev("pointerdown", 20));
    offFirst.setTug(true); // flipped while the press is undecided
    offFirst.move(ev("pointermove", 100));
    expect(offFirst.grabCalls).toEqual([]);
    expect(offFirst.panCalls).toEqual([[80, 0]]);
    offFirst.up(ev("pointerup", 100));

    const onFirst = harness(true);
    onFirst.down(ev("pointerdown", 20));
    onFirst.setTug(false);
    onFirst.move(ev("pointermove", 100));
    expect(onFirst.grabCalls).toEqual([2]);
    expect(onFirst.panCalls).toEqual([]);
    onFirst.up(ev("pointerup", 100));
  });
});
