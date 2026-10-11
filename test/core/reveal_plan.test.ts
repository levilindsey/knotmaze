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

// A small maze-fabric walk graph for the draw ordering: closed loops 0
// (len 20) and 1 (len 16), splice bridges 2 (J1-J2) and 3 (J3-J4), a cut
// tail 4 (END E1 -> J5), and a long junction-to-junction run 5 (J5 -> J4,
// lattice 9).
function fabricWalk(): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  const addV = (id: string, chain: number, ctrl: number, isEnd = false) => {
    vertices.set(id, { id, isEnd, chain, ctrl, edges: [] });
  };
  addV("J1", 0, 4);
  addV("J5", 0, 10);
  addV("J3", 0, 14);
  addV("J4", 1, 2);
  addV("J2", 1, 15);
  addV("E1", 4, 0, true);
  const addE = (
    va: string,
    vb: string,
    chain: number,
    ctrlA: number,
    ctrlB: number,
    length: number
  ): void => {
    const id = edges.length;
    edges.push({ id, va, vb, chain, ctrlA, ctrlB, length });
    vertices.get(va)!.edges.push(id);
    if (vb !== va) vertices.get(vb)!.edges.push(id);
  };
  addE("J1", "J5", 0, 4, 10, 6);
  addE("J5", "J3", 0, 10, 14, 4);
  addE("J3", "J1", 0, 14, 24, 10); // Wrap run (unwrapped ctrlB).
  addE("J4", "J2", 1, 2, 15, 13);
  addE("J2", "J4", 1, 15, 18, 3); // Wrap run.
  addE("J1", "J2", 2, 0, 2, 1.5);
  addE("J3", "J4", 3, 0, 2, 1.6);
  addE("E1", "J5", 4, 0, 8, 4);
  addE("J5", "J4", 5, 0, 10, 9);
  return {
    vertices,
    edges,
    start: "E1",
    exit: "E1",
    optimalLength: 0,
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

  it("knot-mode draw keeps the plain shuffled stagger (pre-connector golden)", () => {
    // Values from the pre-connector code (a67b598): without a walk graph
    // there are no connectors, so the plan must be byte-identical.
    const chains: ChainGeom[] = [
      { len: 40, closed: true, worldLen: 30 },
      { len: 12, closed: true, worldLen: 6 },
      { len: 90, closed: true, worldLen: 120 },
      { len: 24, closed: true, worldLen: 15 },
      { len: 7, closed: false, worldLen: 3 },
    ];
    const plan = buildRevealPlan("draw", null, chains, 7, pointAt);
    expect(plan.sources.map((s) => s.map((x) => x.t0))).toEqual([
      [0],
      [0.2571428571428571],
      [0.3291428571428571],
      [1.1091428571428572],
      [1.2377142857142858],
    ]);
    expect(plan.duration).toBe(6.829142857142857);
  });

  it("draw puts short junction-to-junction connectors last, after their hosts", () => {
    const chains: ChainGeom[] = [
      { len: 20, closed: true, worldLen: 60 }, // 0: long loop
      { len: 16, closed: true, worldLen: 70 }, // 1: long loop
      { len: 3, closed: false, worldLen: 1.5 }, // 2: splice bridge
      { len: 3, closed: false, worldLen: 1.6 }, // 3: splice bridge
      { len: 9, closed: false, worldLen: 4 }, // 4: cut tail (END)
      { len: 11, closed: false, worldLen: 9 }, // 5: long J-J run
    ];
    const walk = fabricWalk();
    const seed = 11;
    const plan = buildRevealPlan("draw", walk, chains, seed, pointAt);
    expect(plan.mode).toBe("draw");
    const src = chains.map((g, i) => {
      expect(plan.sources[i].length).toBe(1);
      const s = plan.sources[i][0];
      expect(s.cFrom).toBe(0);
      expect(s.cTo).toBe(g.closed ? g.len : g.len - 1);
      return s;
    });
    const end = (i: number): number =>
      src[i].t0 + src[i].cTo / src[i].rate;
    const longs = [0, 1, 4, 5]; // The END tail and the long run stay strands.
    const conns = [2, 3];

    // Every long strand starts before any connector.
    const lastLongStart = Math.max(...longs.map((i) => src[i].t0));
    for (const c of conns) expect(src[c].t0).toBeGreaterThan(lastLongStart);

    // Long strands: the same shuffle and pen times as the plain stagger
    // (the knot-mode plan of the same chains), with the connectors' stagger
    // slots removed - so the first one starts at once.
    const plain = buildRevealPlan("draw", null, chains, seed, pointAt);
    const byPlain = [...longs].sort(
      (a, b) => plain.sources[a][0].t0 - plain.sources[b][0].t0
    );
    const byPlan = [...longs].sort((a, b) => src[a].t0 - src[b].t0);
    expect(byPlan).toEqual(byPlain);
    expect(src[byPlan[0]].t0).toBe(0);
    for (const i of longs) expect(src[i].rate).toBe(plain.sources[i][0].rate);

    // Closing cascade: connectors start in the back half of the long pass;
    // the one free of any hold finishes by the last long strand.
    const longEnd = Math.max(...longs.map(end));
    for (const c of conns) {
      expect(src[c].t0).toBeGreaterThanOrEqual(longEnd * 0.5);
    }
    // ...and never before both junctions they join are drawn. J2 sits at
    // ctrl 15 of chain 1's 16 (drawn near that pen's end), so bridge 2 is
    // HELD to exactly that moment; bridge 3's hosts are long drawn.
    const drawnAt = (chain: number, ctrl: number): number =>
      src[chain].t0 + ctrl / src[chain].rate;
    const j1 = drawnAt(0, 4);
    const j2 = drawnAt(1, 15);
    const j3 = drawnAt(0, 14);
    const j4 = Math.min(drawnAt(1, 2), drawnAt(5, 10));
    expect(src[2].t0).toBeGreaterThanOrEqual(Math.max(j1, j2));
    expect(src[3].t0).toBeGreaterThanOrEqual(Math.max(j3, j4));
    expect(src[2].t0).toBeCloseTo(j2, 12);
    expect(end(3)).toBeLessThanOrEqual(longEnd + 1e-9);
    // The hold overruns the long pass by at most one connector stroke.
    expect(end(2)).toBeGreaterThan(longEnd);
    expect(end(2) - longEnd).toBeLessThanOrEqual(src[2].cTo / src[2].rate);
    expect(plan.duration).toBeCloseTo(Math.max(...chains.map((_, i) => end(i))), 12);
    expect(tipsAt(plan, plan.duration + 1e-6).length).toBe(0);

    // Deterministic in the seed.
    const again = buildRevealPlan("draw", fabricWalk(), chains, seed, pointAt);
    expect(again.sources).toEqual(plan.sources);
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
