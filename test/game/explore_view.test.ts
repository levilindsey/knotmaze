import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import {
  FADE_MIN,
  chainVis,
  exploreDistances,
  exploreHoldRadius,
  END_MOVE_STEPS,
  endPullBack,
  endPushPast,
  exploreView,
  pieceVis,
} from "../../src/game/explore_view";
import type { ExploreInput, ExploreKeepOut, ExplorePiece } from "../../src/game/explore_view";

// K76 stage 2a: the thread-reveal model (docs/design/K76_reveal_mode.md
// section 1; the test list is section 7's step 1).

type E = Omit<WalkEdge, "id">;

// A synthetic walk graph: the model reads only the edges and the
// vertices' END flags.
function mkWalk(edges: E[], ends: string[] = []): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const E2: WalkEdge[] = edges.map((e, id) => ({ ...e, id }));
  for (const e of E2) {
    for (const [v, c] of [
      [e.va, e.ctrlA],
      [e.vb, e.ctrlB],
    ] as [string, number][]) {
      let w = vertices.get(v);
      if (!w) {
        w = { id: v, isEnd: ends.includes(v), chain: e.chain, ctrl: c, edges: [] };
        vertices.set(v, w);
      }
      if (!w.edges.includes(e.id)) w.edges.push(e.id);
    }
  }
  return { vertices, edges: E2, start: edges[0].va, exit: "", optimalLength: 0, distToExit: new Map() };
}

function input(walk: WalkGraph, over: Partial<ExploreInput>): ExploreInput {
  return {
    walk,
    visited: new Map(),
    explored: new Set(),
    inflight: null,
    reach: 2.5,
    fade: 1,
    web: 0.5,
    ...over,
  };
}

const WHOLE = { f0: 0, f1: 0, tip0: false, tip1: false };

// A straight run J1 - J2 on chain 0, 10 lattice units over ctrls 0..10
// (1 ctrl per unit), plus a 2-unit dead end J1 - T on chain 1 over 0..4.
const LINE = mkWalk(
  [
    { va: "J1", vb: "J2", chain: 0, ctrlA: 0, ctrlB: 10, length: 10 },
    { va: "J1", vb: "T", chain: 1, ctrlA: 0, ctrlB: 4, length: 2 },
  ],
  ["T"]
);

function onChain(ps: ExplorePiece[], chain: number): ExplorePiece[] {
  return ps.filter((p) => p.chain === chain);
}

describe("explore view (K76): the reveal rule", () => {
  it("shows nothing before anything is visited", () => {
    const v = exploreView(input(LINE, {}));
    expect(v.pieces).toEqual([]);
    expect(v.frontiers).toEqual([]);
  });

  it("shows an explored run whole, with no frontier", () => {
    const v = exploreView(input(LINE, { explored: new Set([0]) }));
    expect(v.pieces).toEqual([{ chain: 0, c0: 0, c1: 10, ...WHOLE }]);
    expect(v.frontiers).toEqual([]);
  });

  it("shows a stub reach units out of a visited junction, its last fade units fading", () => {
    const v = exploreView(input(LINE, { visited: new Map([["J1", 1]]) }));
    const [p] = onChain(v.pieces, 0);
    expect(p.c0).toBe(0);
    expect(p.c1).toBeCloseTo(1.5, 12);
    expect(p.f1).toBeCloseTo(1, 12);
    expect(p.tip1).toBe(true);
    expect(p.f0).toBe(0);
    expect(p.tip0).toBe(false);
    expect(v.frontiers).toContainEqual({ chain: 0, edge: 0, cSolid: p.c1, cEnd: 2.5 });
    // Solid, half way through the fade (smoothstep), gone at the reach.
    expect(pieceVis(p, 1, 11, false)).toBe(1);
    expect(pieceVis(p, 2, 11, false)).toBeCloseTo(0.5, 12);
    expect(pieceVis(p, 2.5, 11, false)).toBe(0);
    expect(pieceVis(p, 6, 11, false)).toBe(0);
  });

  it("shows an END tip within reach solid to the tip", () => {
    const v = exploreView(input(LINE, { visited: new Map([["J1", 1]]) }));
    expect(onChain(v.pieces, 1)).toEqual([{ chain: 1, c0: 0, c1: 4, ...WHOLE }]);
    expect(v.frontiers.some((f) => f.edge === 1)).toBe(false);
  });

  it("fades an END tip beyond the reach like any other stub", () => {
    const v = exploreView(input(LINE, { visited: new Map([["J1", 1]]), reach: 1.5 }));
    const [p] = onChain(v.pieces, 1);
    // 2 ctrl per unit: the fade spans 1 unit = 2 ctrl, ending at 1.5 units.
    expect(p.c1 + p.f1).toBeCloseTo(3, 12);
    expect(p.f1).toBeCloseTo(2, 12);
    expect(p.tip1).toBe(true);
  });

  it("gives a visited END vertex no web domain", () => {
    const v = exploreView(input(LINE, { visited: new Map([["T", 1]]), reach: 1, fade: 0.5 }));
    const [p] = onChain(v.pieces, 1);
    // From T (ctrl 4) down: 1 unit = 2 ctrl, the last 0.5 unit fading.
    expect(p).toEqual({ chain: 1, c0: 3, c1: 4, f0: 1, f1: 0, tip0: true, tip1: false });
  });

  it("shows a run whole once the two visited ends' reaches meet", () => {
    const both = new Map([
      ["J1", 1],
      ["J2", 1],
    ]);
    const met = exploreView(input(LINE, { visited: both, reach: 5 }));
    expect(onChain(met.pieces, 0)).toEqual([{ chain: 0, c0: 0, c1: 10, ...WHOLE }]);
    expect(met.frontiers.filter((f) => f.edge === 0)).toEqual([]);
    const apart = exploreView(input(LINE, { visited: both, reach: 4.9 }));
    const ps = onChain(apart.pieces, 0);
    expect(ps.length).toBe(2);
    expect(ps[0]).toMatchObject({ c0: 0, tip1: true });
    expect(ps[1]).toMatchObject({ c1: 10, tip0: true });
    expect(apart.frontiers.filter((f) => f.edge === 0).length).toBe(2);
  });

  it("keeps a short bridge solid through its web domain and never fades past the run", () => {
    // 0.6 units over ctrls 0..2: the web domain is capped at half the run.
    const bridge = mkWalk([{ va: "A", vb: "B", chain: 0, ctrlA: 0, ctrlB: 2, length: 0.6 }]);
    const v = exploreView(input(bridge, { visited: new Map([["A", 1]]) }));
    const [p] = v.pieces;
    const k = 2 / 0.6;
    expect(p.c1).toBeCloseTo(0.3 * k, 12);
    expect(p.c1 + p.f1).toBeCloseTo(2, 12);
    expect(pieceVis(p, 0.3 * k, 3, false)).toBe(1);
  });

  it("keeps the web domain solid even when the reach is shorter, with a FADE_MIN fade", () => {
    const v = exploreView(input(LINE, { visited: new Map([["J1", 1]]), reach: 0.2 }));
    const [p] = onChain(v.pieces, 0);
    expect(p.c1).toBeCloseTo(0.5, 12);
    expect(p.f1).toBeCloseTo(FADE_MIN, 12);
  });

  it("grows a new junction's arms from the web domain out to the reach", () => {
    const at = (g: number): ExplorePiece =>
      onChain(exploreView(input(LINE, { visited: new Map([["J1", g]]) })).pieces, 0)[0];
    // Progress 0: the junction pops in whole (web domain solid).
    expect(at(0).c1).toBeCloseTo(0.5, 12);
    expect(at(0).c1 + at(0).f1).toBeCloseTo(0.5 + FADE_MIN, 12);
    expect(at(0.5).c1 + at(0.5).f1).toBeCloseTo(1.5, 12);
    expect(at(1).c1 + at(1).f1).toBeCloseTo(2.5, 12);
    // Progress clamps.
    expect(at(2)).toEqual(at(1));
    let last = -1;
    for (let g = 0; g <= 1.0001; g += 0.05) {
      const p = at(g);
      expect(p.c1 + p.f1).toBeGreaterThanOrEqual(last - 1e-12);
      last = p.c1 + p.f1;
    }
  });

  it("shows the walked part of the run in flight, with a lead fade ahead of the dot", () => {
    const fwd = exploreView(
      input(LINE, { visited: new Map([["J1", 1]]), inflight: { edge: 0, from: 0, cur: 4 } })
    );
    const ps = onChain(fwd.pieces, 0);
    // The stub loses its frontier: the dot is the frontier now.
    expect(ps.every((p) => !p.tip0 && !p.tip1)).toBe(true);
    expect(fwd.frontiers.filter((f) => f.edge === 0)).toEqual([]);
    expect(ps).toContainEqual({ chain: 0, c0: 0, c1: 4, f0: 0, f1: 1, tip0: false, tip1: false });
    // Backward, and near the end: the lead never runs past the run.
    const back = exploreView(input(LINE, { inflight: { edge: 0, from: 10, cur: 6 } }));
    expect(back.pieces).toEqual([{ chain: 0, c0: 6, c1: 10, f0: 1, f1: 0, tip0: false, tip1: false }]);
    const late = exploreView(input(LINE, { inflight: { edge: 0, from: 0, cur: 9.5 } }));
    expect(late.pieces[0].c1 + late.pieces[0].f1).toBeCloseTo(10, 12);
  });

  it("evaluates a run that wraps a ring modulo the ring", () => {
    // A ring of 12 ctrls; the run J1 (ctrl 10) -> J2 (ctrl 16 = 4).
    const ring = mkWalk([{ va: "J1", vb: "J2", chain: 0, ctrlA: 10, ctrlB: 16, length: 6 }]);
    const a = exploreView(input(ring, { visited: new Map([["J1", 1]]) })).pieces[0];
    expect(a).toMatchObject({ c0: 10, c1: 11.5, tip1: true });
    expect(pieceVis(a, 11, 12, true)).toBe(1);
    expect(pieceVis(a, 0, 12, true)).toBeCloseTo(0.5, 12); // = 12, mid fade.
    expect(pieceVis(a, 1, 12, true)).toBe(0);
    expect(pieceVis(a, 9, 12, true)).toBe(0);
    const b = exploreView(input(ring, { visited: new Map([["J2", 1]]) })).pieces[0];
    expect(b).toMatchObject({ c0: 14.5, c1: 16, tip0: true });
    expect(pieceVis(b, 3, 12, true)).toBe(1);
    expect(pieceVis(b, 4, 12, true)).toBe(1);
    expect(pieceVis(b, 5, 12, true)).toBe(0);
    expect(pieceVis(b, 2, 12, true)).toBeCloseTo(0.5, 12);
  });

  it("shows a ring's self-loop from both of its ends, and whole once they meet", () => {
    // One junction at ctrl 2; its loop runs once around the 12-ctrl ring.
    const loop = mkWalk([{ va: "J", vb: "J", chain: 0, ctrlA: 2, ctrlB: 14, length: 12 }]);
    expect(loop.vertices.get("J")!.edges).toEqual([0]);
    const v = exploreView(input(loop, { visited: new Map([["J", 1]]) }));
    expect(v.pieces.length).toBe(2);
    expect(v.frontiers.length).toBe(2);
    const vis = (c: number): number => chainVis(v.pieces, 0, c, 12, true);
    for (const c of [1, 2, 3]) expect(vis(c)).toBe(1);
    expect(vis(7)).toBe(0);
    expect(vis(4)).toBeCloseTo(0.5, 12);
    expect(vis(0)).toBeCloseTo(0.5, 12);
    const met = exploreView(input(loop, { visited: new Map([["J", 1]]), reach: 6 }));
    expect(met.pieces).toEqual([{ chain: 0, c0: 2, c1: 14, ...WHOLE }]);
    for (let c = 0; c < 12; c += 0.25) expect(chainVis(met.pieces, 0, c, 12, true)).toBe(1);
    const walked = exploreView(input(loop, { explored: new Set([0]) }));
    expect(walked.pieces).toEqual([{ chain: 0, c0: 2, c1: 14, ...WHOLE }]);
  });

  it("returns 0 on a chain with no piece", () => {
    const v = exploreView(input(LINE, { explored: new Set([0]) }));
    expect(chainVis(v.pieces, 1, 1, 5, false)).toBe(0);
    expect(chainVis(v.pieces, 0, 5, 11, false)).toBe(1);
  });
});

function walkFor(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({ gridSize: 8, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, DEFAULT_MAZE_PARAMS);
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

describe("explore view (K76): on generated mazes", () => {
  for (const seed of [5, 42, 777]) {
    it(`seed ${seed}: pieces stay inside their runs; the entrance shows only its own runs`, () => {
      const walk = walkFor(seed);
      const v = exploreView(input(walk, { visited: new Map([[walk.start, 1]]) }));
      const own = new Set(walk.vertices.get(walk.start)!.edges);
      expect(v.pieces.length).toBeGreaterThan(0);
      for (const p of v.pieces) {
        const e = walk.edges.find(
          (e) => e.chain === p.chain && p.c0 - p.f0 >= e.ctrlA - 1e-9 && p.c1 + p.f1 <= e.ctrlB + 1e-9
        );
        expect(e).toBeDefined();
        expect(own.has(e!.id)).toBe(true);
        expect(p.c0).toBeLessThanOrEqual(p.c1);
      }
      for (const f of v.frontiers) expect(own.has(f.edge)).toBe(true);
    });

    it(`seed ${seed}: every run walked shows the whole maze, frontier-free`, () => {
      const walk = walkFor(seed);
      const all = new Set(walk.edges.map((e) => e.id));
      const v = exploreView(input(walk, { explored: all }));
      expect(v.frontiers).toEqual([]);
      expect(v.pieces.length).toBe(walk.edges.filter((e) => e.ctrlB > e.ctrlA).length);
      for (const p of v.pieces) expect(p).toMatchObject(WHOLE);
    });
  }
});

// K76 stage 2c: the event-fed model's two additions - a caught move's run
// and the intro's close-in.
describe("explore view (K76 stage 2c): a caught move", () => {
  it("shows the run from where the dot left up to where it was caught, a frontier beyond", () => {
    const v = exploreView(
      input(LINE, { visited: new Map([["J1", 1]]), partial: [{ edge: 0, from: 0, cur: 6 }] })
    );
    const ps = onChain(v.pieces, 0);
    expect(ps.length).toBe(1);
    expect(ps[0].c0).toBe(0);
    expect(ps[0].c1).toBeCloseTo(6, 9);
    expect(ps[0].f1).toBeCloseTo(1, 9); // fade 1, the lead.
    expect(ps[0].tip1).toBe(true);
    const f = v.frontiers.filter((f) => f.edge === 0);
    expect(f).toEqual([{ chain: 0, edge: 0, cSolid: 6, cEnd: 7 }]);
    expect(chainVis(v.pieces, 0, 5.9, 11, false)).toBe(1);
    expect(chainVis(v.pieces, 0, 7.5, 11, false)).toBe(0);
  });

  it("caught from the far end, it grows from that end", () => {
    const v = exploreView(
      input(LINE, { visited: new Map([["J2", 1]]), partial: [{ edge: 0, from: 10, cur: 3 }] })
    );
    const ps = onChain(v.pieces, 0);
    expect(ps.length).toBe(1);
    expect(ps[0].c0).toBeCloseTo(3, 9);
    expect(ps[0].c1).toBe(10);
    expect(ps[0].tip0).toBe(true);
  });

  it("caught inside the reach changes nothing", () => {
    const plain = exploreView(input(LINE, { visited: new Map([["J1", 1]]) }));
    const v = exploreView(
      input(LINE, { visited: new Map([["J1", 1]]), partial: [{ edge: 0, from: 0, cur: 1 }] })
    );
    expect(v).toEqual(plain);
  });

  it("has no frontier while the dot walks that run again", () => {
    const v = exploreView(
      input(LINE, {
        visited: new Map([["J1", 1]]),
        partial: [{ edge: 0, from: 0, cur: 6 }],
        inflight: { edge: 0, from: 0, cur: 2 },
      })
    );
    expect(v.frontiers.filter((f) => f.edge === 0)).toEqual([]);
    expect(chainVis(v.pieces, 0, 5.9, 11, false)).toBe(1);
  });
});

describe("explore view (K76 stage 2c): the intro's close-in", () => {
  it("exploreDistances: walk distance from the sources, the farthest for the unreached", () => {
    const d = exploreDistances(LINE, ["J2"]);
    expect(d.get("J2")).toBe(0);
    expect(d.get("J1")).toBe(10);
    expect(d.get("T")).toBe(12);
    const two = mkWalk([
      { va: "A", vb: "B", chain: 0, ctrlA: 0, ctrlB: 4, length: 4 },
      { va: "C", vb: "D", chain: 1, ctrlA: 0, ctrlB: 2, length: 2 },
    ]);
    const d2 = exploreDistances(two, ["A"]);
    expect([d2.get("A"), d2.get("B"), d2.get("C"), d2.get("D")]).toEqual([0, 4, 4, 4]);
    expect(exploreHoldRadius(LINE, d)).toBe(Math.max((0 + 10 + 10) / 2, (10 + 12 + 2) / 2));
  });

  for (const seed of [5, 42]) {
    it(`seed ${seed}: hold 1 shows every run whole, hold 0 the plain view, and the cover contracts`, () => {
      const walk = walkFor(seed);
      const visited = new Map([[walk.start, 1]]);
      const holdDist = exploreDistances(walk, visited.keys());
      const plain = exploreView(input(walk, { visited }));
      const full = exploreView(input(walk, { visited, hold: 1, holdDist }));
      expect(full.frontiers).toEqual([]);
      expect(full.pieces.length).toBe(walk.edges.filter((e) => e.ctrlB > e.ctrlA).length);
      for (const p of full.pieces) expect(p).toMatchObject(WHOLE);
      expect(exploreView(input(walk, { visited, hold: 0, holdDist }))).toEqual(plain);
      // Coverage (sampled visibility summed over every run) falls with the
      // hold and never below the plain view's.
      const cover = (h: number): number => {
        const v = exploreView(input(walk, { visited, hold: h, holdDist }));
        let sum = 0;
        for (const e of walk.edges) {
          for (let i = 0; i <= 8; i++) {
            const c = e.ctrlA + ((e.ctrlB - e.ctrlA) * i) / 8;
            sum += chainVis(v.pieces, e.chain, c, 1e9, false);
          }
        }
        return sum;
      };
      const levels = [1, 0.75, 0.5, 0.25, 0.1, 0].map(cover);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]).toBeLessThanOrEqual(levels[i - 1] + 1e-9);
      }
      expect(levels[0]).toBeGreaterThan(levels[levels.length - 1]);
      // No frontier is drawn where the close-in still covers.
      const mid = exploreView(input(walk, { visited, hold: 0.5, holdDist }));
      for (const f of mid.frontiers) {
        const e = walk.edges[f.edge];
        expect(chainVis(mid.pieces, e.chain, f.cEnd + Math.sign(f.cEnd - f.cSolid) * 0.05, 1e9, false))
          .toBeLessThan(1);
      }
    });
  }
});

// K466 THE ENDS: a frontier's fade kept out of the stretches where its
// thread passes under a crossing (docs/design/K466.md).
function ko(spans: Record<number, number[]>, mode: "past" | "back", rings: Record<number, number> = {}): ExploreKeepOut {
  return { spans: (c) => spans[c], ring: (c) => rings[c] ?? 0, mode };
}

describe("explore view (K466): the ends kept out from under crossings", () => {
  it("endPushPast: past every span the fade overlaps, chained, NaN past the limit", () => {
    expect(endPushPast([2, 3], 2.5, 1, 10)).toBe(4);
    expect(endPushPast([2, 3, 3.5, 4.5], 2.5, 1, 10)).toBe(5.5);
    expect(endPushPast([2, 3], 2.5, 1, 3.9)).toBeNaN();
    // Touching is not overlapping: the fade [1.5, 2.5] stays.
    expect(endPushPast([0.5, 1.5, 2.5, 3], 2.5, 1, 10)).toBe(2.5);
    expect(endPushPast([], 2.5, 1, 10)).toBe(2.5);
    // At most `steps` pushes: one crossing passes, a second refuses.
    expect(endPushPast([2, 3], 2.5, 1, 10, 1)).toBe(4);
    expect(endPushPast([2, 3, 3.5, 4.5], 2.5, 1, 10, 1)).toBeNaN();
    expect(endPushPast([0.5, 1.5], 2.5, 1, 10, 0)).toBe(2.5);
  });

  it("endPullBack: before every span the fade overlaps, chained, NaN below the floor", () => {
    expect(endPullBack([2, 3], 2.5, 1, 0.5)).toBe(2);
    expect(endPullBack([1.8, 2.2, 0.9, 1.2], 2.5, 1, 0.5)).toBeNaN();
    expect(endPullBack([1.8, 2.2, 0.9, 1.2], 2.5, 1, -1)).toBe(0.9);
    expect(endPullBack([2.5, 3], 2.5, 1, 0.5)).toBe(2.5);
    expect(endPullBack([2, 3], 2.5, 1, 0.5, 1)).toBe(2);
    expect(endPullBack([1.8, 2.2, 0.9, 1.2], 2.5, 1, -1, 1)).toBeNaN();
  });

  it("moves a stub's end past one crossing at most (END_MOVE_STEPS)", () => {
    expect(END_MOVE_STEPS).toBe(1);
    // Two spans in a row past the plain fade [1.5, 2.5]: past refuses, and
    // back (one pull, to [1, 2]) is taken.
    const v = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [2, 3, 3.5, 4.5] }, "past") }));
    expect(end0(v)).toEqual({ cSolid: 1, cEnd: 2 });
    // Back blocked too (a span right before it): the plain end stays.
    const w = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [0.9, 1.2, 2, 3, 3.5, 4.5] }, "past") }));
    expect(end0(w)).toEqual({ cSolid: 1.5, cEnd: 2.5 });
  });

  // LINE's run 0 from J1: web 0.5, reach 2.5, fade 1, so the plain fade is
  // [1.5, 2.5] (1 ctrl per unit).
  const J1 = new Map([["J1", 1]]);
  const end0 = (v: ReturnType<typeof exploreView>): { cSolid: number; cEnd: number } => {
    const f = v.frontiers.find((f) => f.edge === 0)!;
    return { cSolid: f.cSolid, cEnd: f.cEnd };
  };

  it("past: a fade under a crossing moves beyond it, whole", () => {
    const v = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [2, 3] }, "past") }));
    expect(end0(v)).toEqual({ cSolid: 3, cEnd: 4 });
    const [p] = onChain(v.pieces, 0);
    expect(p).toEqual({ chain: 0, c0: 0, c1: 3, f0: 0, f1: 1, tip0: false, tip1: true });
  });

  it("back: the same fade moves in before it", () => {
    const v = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [2, 3] }, "back") }));
    expect(end0(v)).toEqual({ cSolid: 1, cEnd: 2 });
  });

  it("each falls back to the other, then to the plain end", () => {
    // Back would cut into the web domain (the span starts at 0.8): past.
    const a = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [0.8, 3] }, "back") }));
    expect(end0(a)).toEqual({ cSolid: 3, cEnd: 4 });
    // Past would run into J2's web domain (limit 9.5): back.
    const b = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [2, 9.6] }, "past") }));
    expect(end0(b)).toEqual({ cSolid: 1, cEnd: 2 });
    // Neither fits: the plain fade, under the crossing.
    const c = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [0.8, 9.6] }, "past") }));
    expect(end0(c)).toEqual({ cSolid: 1.5, cEnd: 2.5 });
  });

  it("a visited far end limits a push to half the gap between the two plain tips", () => {
    const both = new Map([["J1", 1], ["J2", 1]]);
    // The plain tips are 2.5 and 7.5: the push may end by 5.
    const far = exploreView(input(LINE, { visited: both, keepOut: ko({ 0: [2, 4.5] }, "past") }));
    expect(end0(far)).toEqual({ cSolid: 1, cEnd: 2 });
    const open = exploreView(input(LINE, { visited: J1, keepOut: ko({ 0: [2, 4.5] }, "past") }));
    expect(end0(open)).toEqual({ cSolid: 4.5, cEnd: 5.5 });
  });

  it("does not move a stub whose run will show whole once grown", () => {
    // reach 5 from both ends meets over the 10-unit run; J2 still growing.
    const growing = new Map([["J1", 1], ["J2", 0.2]]);
    const plain = exploreView(input(LINE, { visited: growing, reach: 5 }));
    const kept = exploreView(input(LINE, { visited: growing, reach: 5, keepOut: ko({ 0: [4, 6] }, "past") }));
    expect(kept).toEqual(plain);
  });

  it("moves a growing arm's end continuously, reaching the moved end when grown", () => {
    let last = -1;
    for (let i = 0; i <= 100; i++) {
      const g = i / 100;
      const v = exploreView(input(LINE, { visited: new Map([["J1", g]]), keepOut: ko({ 0: [2, 3] }, "past") }));
      const e = end0(v).cEnd;
      if (last >= 0) {
        expect(e).toBeGreaterThanOrEqual(last - 1e-12);
        expect(e - last).toBeLessThan(0.05);
      }
      last = e;
    }
    expect(last).toBeCloseTo(4, 12);
  });

  it("reads a ring's span on whichever lap overlaps the run", () => {
    // A 20-ctrl ring; the run J1 (ctrl 15) -> J2 (25 = 5). The span is given
    // a lap low, at [-3.5, -2] = [16.5, 18].
    const ring = mkWalk([{ va: "J1", vb: "J2", chain: 2, ctrlA: 15, ctrlB: 25, length: 10 }]);
    const v = exploreView(input(ring, { visited: J1, keepOut: ko({ 2: [-3.5, -2] }, "past", { 2: 20 }) }));
    expect(end0(v)).toEqual({ cSolid: 18, cEnd: 19 });
    // From the other end (J2 at 25, down), the same span is out of reach.
    const w = exploreView(input(ring, { visited: new Map([["J2", 1]]), keepOut: ko({ 2: [-3.5, -2] }, "past", { 2: 20 }) }));
    expect(end0(w)).toEqual({ cSolid: 23.5, cEnd: 22.5 });
  });

  it("moves a stub from the far end the same way, mirrored", () => {
    // From J2 (ctrl 10) down: the plain fade is [7.5, 8.5]; a span [7, 8] pushes it to [6, 7].
    const v = exploreView(input(LINE, { visited: new Map([["J2", 1]]), keepOut: ko({ 0: [7, 8] }, "past") }));
    expect(end0(v)).toEqual({ cSolid: 7, cEnd: 6 });
    const [p] = onChain(v.pieces, 0);
    expect(p).toMatchObject({ c0: 7, c1: 10, f0: 1, tip0: true });
  });

  it("leaves a caught move's lead and every unaffected stub as they were", () => {
    const caught = { visited: J1, partial: [{ edge: 0, from: 0, cur: 6 }] };
    const keep = ko({ 0: [6.2, 7.5], 1: [0, 4] }, "past");
    expect(exploreView(input(LINE, { ...caught, keepOut: keep }))).toEqual(exploreView(input(LINE, caught)));
    for (const seed of [5, 42]) {
      const walk = walkFor(seed);
      const base = { visited: new Map([[walk.start, 1]]) };
      const none = exploreView(input(walk, base));
      expect(exploreView(input(walk, { ...base, keepOut: ko({}, "past") }))).toEqual(none);
      expect(exploreView(input(walk, { ...base, keepOut: ko({}, "back") }))).toEqual(none);
    }
  });
});