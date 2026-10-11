import { describe, expect, it } from "vitest";
import {
  APPEAR_SEQUENCES,
  buildRevealPlan,
  intervalsAt,
  tipsAt,
} from "../../src/core/reveal_plan";
import type { ChainGeom } from "../../src/core/reveal_plan";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";

// Tiny synthetic walk graph: one open chain 0 (ctrl 0..8), vertices at
// ctrl 0 (start), 4, 8 (exit); two runs of lattice length 2 each.
function tinyWalk(): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  const addV = (id: string, ctrl: number): void => {
    vertices.set(id, { id, isEnd: ctrl !== 4, chain: 0, ctrl, edges: [] });
  };
  addV("A", 0);
  addV("B", 4);
  addV("C", 8);
  const addE = (va: string, vb: string, ctrlA: number, ctrlB: number): void => {
    const id = edges.length;
    edges.push({ id, va, vb, chain: 0, ctrlA, ctrlB, length: 2 });
    vertices.get(va)!.edges.push(id);
    vertices.get(vb)!.edges.push(id);
  };
  addE("A", "B", 0, 4);
  addE("B", "C", 4, 8);
  return {
    vertices,
    edges,
    start: "A",
    exit: "C",
    optimalLength: 4,
    distToExit: new Map(),
  };
}

const openChain: ChainGeom = { len: 9, closed: false, worldLen: 4 };
const pointAt = (_chain: number, ctrl: number): readonly [number, number] => [
  ctrl / 2,
  0,
];

describe("reveal plan", () => {
  it("lists instant first among the sequences", () => {
    expect(APPEAR_SEQUENCES[0]).toBe("instant");
    expect(APPEAR_SEQUENCES).toContain("trace");
    expect(APPEAR_SEQUENCES).toContain("bloom");
    expect(APPEAR_SEQUENCES).toContain("draw");
    expect(APPEAR_SEQUENCES).toContain("ink");
  });

  it("trace floods outward from the start and finishes", () => {
    const plan = buildRevealPlan("trace", tinyWalk(), [openChain], 1, pointAt);
    expect(plan.mode).toBe("trace");
    expect(plan.duration).toBeGreaterThan(0);
    expect(Number.isFinite(plan.duration)).toBe(true);

    // Early: a single growing interval anchored at the start (soft tip).
    const early = intervalsAt(plan, 0, plan.duration * 0.1);
    expect(early.length).toBeGreaterThan(0);
    expect(early[0].c0).toBe(0);
    expect(early[0].soft0).toBe(false);
    expect(early[0].soft1).toBe(true);
    expect(early[0].c1).toBeLessThan(4);

    // Done: the union covers the whole ctrl range with hard ends.
    const done = intervalsAt(plan, 0, plan.duration + 1e-6);
    let lo = Infinity;
    let hi = -Infinity;
    for (const iv of done) {
      expect(iv.c0).toBeLessThanOrEqual(iv.c1);
      expect(iv.soft0).toBe(false);
      expect(iv.soft1).toBe(false);
      if (iv.c0 < lo) lo = iv.c0;
      if (iv.c1 > hi) hi = iv.c1;
    }
    expect(lo).toBeLessThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(8);

    // Mid-flight tips exist, then vanish at completion. (0.5 * duration
    // is this graph's exact run handoff instant - probe past it.)
    expect(tipsAt(plan, plan.duration * 0.6).length).toBeGreaterThan(0);
    expect(tipsAt(plan, plan.duration + 1e-6).length).toBe(0);

    // The second run starts only when the flood reaches its vertex.
    const t0s = plan.sources[0].map((s) => s.t0).sort((a, b) => a - b);
    expect(t0s[0]).toBe(0);
    expect(t0s[t0s.length - 1]).toBeGreaterThan(0);
  });

  it("covers decorative loops the walk graph does not touch", () => {
    const loop: ChainGeom = { len: 10, closed: true, worldLen: 5 };
    const plan = buildRevealPlan(
      "trace",
      tinyWalk(),
      [openChain, loop],
      1,
      pointAt
    );
    expect(plan.sources[1].length).toBe(2); // Both directions around.
    const done = intervalsAt(plan, 1, plan.duration + 1e-6);
    const span = done.reduce((s, iv) => s + (iv.c1 - iv.c0), 0);
    expect(span).toBeGreaterThanOrEqual(10 - 1e-6);
  });

  it("falls back to draw without a walk graph, staggering strands", () => {
    const chains: ChainGeom[] = [
      { len: 10, closed: true, worldLen: 5 },
      { len: 7, closed: false, worldLen: 3 },
      { len: 12, closed: true, worldLen: 6 },
    ];
    const plan = buildRevealPlan("trace", null, chains, 7, pointAt);
    expect(plan.mode).toBe("draw");
    const starts: number[] = [];
    chains.forEach((g, i) => {
      expect(plan.sources[i].length).toBe(1);
      const s = plan.sources[i][0];
      expect(s.cFrom).toBe(0);
      expect(s.cTo).toBe(g.closed ? g.len : g.len - 1);
      starts.push(s.t0);
    });
    // Staggered: not all simultaneous, exactly one pen starts at 0.
    expect(Math.min(...starts)).toBe(0);
    expect(Math.max(...starts)).toBeGreaterThan(0);
    expect(Number.isFinite(plan.duration)).toBe(true);
  });

  it("bloom is deterministic in the seed", () => {
    const a = buildRevealPlan("bloom", tinyWalk(), [openChain], 42, pointAt);
    const b = buildRevealPlan("bloom", tinyWalk(), [openChain], 42, pointAt);
    expect(a.sources).toEqual(b.sources);
    expect(a.duration).toBe(b.duration);
    // Bloom can only start runs EARLIER than trace (extra sources).
    const trace = buildRevealPlan(
      "trace",
      tinyWalk(),
      [openChain],
      42,
      pointAt
    );
    expect(a.duration).toBeLessThanOrEqual(trace.duration + 1e-9);
  });

  it("ink carries the origin and a finite safety duration", () => {
    const plan = buildRevealPlan("ink", tinyWalk(), [openChain], 1, pointAt);
    expect(plan.mode).toBe("ink");
    expect(plan.origin).toEqual({ chain: 0, ctrl: 0 });
    expect(plan.inkSpeed).toBeGreaterThan(0);
    expect(Number.isFinite(plan.duration)).toBe(true);
    expect(plan.sources.every((s) => s.length === 0)).toBe(true);
  });
});
