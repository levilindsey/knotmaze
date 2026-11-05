// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createKeyInput } from "../../src/app/input_keys";
import type { KeyInputDeps } from "../../src/app/input_keys";
import type { SceneRef } from "../../src/app/scene_ref";

// K1175: keyHints() caches per vertex and solve stamp, but under flow
// the drawn runs keep moving, so a run near a cardinal bisector can
// cross it while the disc keeps naming the old key. While the flow is
// on the hints must be recomputed on every call; with it off the
// cache stands exactly as before (K332).

const DEG = Math.PI / 180;
// Chain 2 is the bisector run: phase 0 leaves at -100 degrees (the up
// key's run), phase 1 at -170 (the left key's). Chains 0 and 1 are
// steady (right, down). y is down, as on screen.
let phase = 0;
const chainAngle = (chain: number): number => {
  if (chain === 0) return 0;
  if (chain === 1) return 90 * DEG;
  return (phase === 0 ? -100 : -170) * DEG;
};

function makeInput(flowStrength: number) {
  phase = 0;
  const edges = [0, 1, 2].map((i) => ({
    va: "v0",
    vb: "v" + (i + 1),
    chain: i,
    ctrlA: 0,
    ctrlB: 10,
  }));
  const fc = { head: "v0", solved: false, taps: [] as number[], cutOn: false, fire: null, fireLost: false };
  const scene = {
    ps: {
      pointOnChain: (chain: number, ctrl: number, out: Float32Array) => {
        const a = chainAngle(chain);
        out[0] = Math.cos(a) * ctrl * 0.1;
        out[1] = Math.sin(a) * ctrl * 0.1;
      },
    },
    renderer: {
      flowStrength,
      flowOffset: (_x: number, _y: number, out: Float32Array) => {
        out[0] = 0;
        out[1] = 0;
      },
    },
    debug: null,
    walkGraph: {
      vertices: new Map([["v0", { edges: [0, 1, 2] }]]),
      edges,
    },
    tangle: null,
    buildHueGroup: undefined,
    buildStrandCount: 0,
    fabric: {
      vertexWorld: (_v: string, out: Float32Array) => {
        out[0] = 0;
        out[1] = 0;
      },
      markerRadius: () => 0.52,
    },
    chase: null,
    turnMino: null,
    fabricController: fc,
    reveal: null,
  } as unknown as SceneRef;
  const deps = {
    params: { mazeFabric: true },
    sceneReady: () => true,
    moveAlong: vi.fn(() => false),
    chaseAlong: vi.fn(() => false),
    waitTurn: vi.fn(() => false),
    clearRoute: vi.fn(),
    routeStep: vi.fn(() => false),
    dotMoving: vi.fn(() => false),
    smolderToast: vi.fn(),
    teleOf: vi.fn(() => ({ edges: [], verts: [] })),
    moveHuntWas: vi.fn(() => false),
    turnWait: 0,
    pendingWin: false,
    pendingLoss: false,
  } as unknown as KeyInputDeps;
  const input = createKeyInput(deps, scene);
  // The first direction press (it sets the hints' session flag). Down
  // takes run 1 in the fake, but the fake moveAlong moves nothing, so
  // the head and the solve stamp stand pat across the phase flip.
  const pressDown = () =>
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true })
    );
  const hints = () => input.keyHints().map((h) => `${h.edge}:${h.dir}:${h.chord}`);
  return { input, pressDown, hints };
}

describe("K1175 keyHints under flow", () => {
  it("recomputes on every call while the flow is on", () => {
    const { pressDown, hints } = makeInput(0.3);
    expect(hints()).toEqual([]);
    pressDown();
    const before = hints();
    expect(before).toContain("2:up:false");
    phase = 1;
    const after = hints();
    expect(after).toContain("2:left:false");
    expect(after).not.toContain("2:up:false");
  });

  it("serves the vertex-and-stamp cache while the flow is off", () => {
    const { input, pressDown, hints } = makeInput(0);
    pressDown();
    const before = input.keyHints();
    expect(hints()).toContain("2:up:false");
    phase = 1;
    expect(input.keyHints()).toBe(before);
    expect(hints()).toContain("2:up:false");
  });
});
