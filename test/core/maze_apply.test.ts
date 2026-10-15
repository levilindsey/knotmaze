import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import type { MazeParams, MazePlan } from "../../src/core/maze_plan";
import {
  applyMazePlan,
  applyMazeCuts,
  ENTRANCE_END_IDS,
  EXIT_END_IDS,
} from "../../src/core/maze_apply";
import {
  checkStructure,
  checkAlternation,
  checkStrandPartition,
} from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { hypot2 } from "../../src/util/det_math";

// P4 Stage 5d: applying the maze plan to the tangle graph.

const SEEDS = [5, 42, 1234, 2773729296, 99];

// The cut and trim tests below find their surgery by node id and strand
// index, which H1 (K74 stage 2, hCutShare) changes after them: it retypes
// junctions and merges bridges into their hosts. They run with it off; the
// H1 tests at the end run it.
const P = (over: Partial<MazeParams>): MazeParams => ({
  ...DEFAULT_MAZE_PARAMS,
  hCutShare: 0,
  ...over,
});

function applied(
  seed: number,
  params: MazeParams = DEFAULT_MAZE_PARAMS
): { g: TangleGraph; plan: MazePlan } {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, params);
  applyMazePlan(g, plan);
  return { g, plan };
}

describe("maze apply: graph surgery", () => {
  it("preserves all structural invariants", () => {
    for (const seed of SEEDS) {
      for (const params of [
        DEFAULT_MAZE_PARAMS,
        P({ branchDensity: 0.8, deadEndDensity: 0.5, fourWayFraction: 0.3 }),
      ]) {
        const { g } = applied(seed, params);
        expect(checkStructure(g)).toBe(true);
        expect(checkStrandPartition(g)).toBe(true);
        expect(checkAlternation(g)).toBe(true);
      }
    }
  });

  it("creates the exact planned junction/end population", () => {
    for (const seed of SEEDS) {
      const { g, plan } = applied(seed, P({ deadEndDensity: 0.5 }));
      const junctions: string[] = [];
      const ends: string[] = [];
      for (const [id, node] of g.nodes) {
        if (node.type === NODE_TYPE.JUNCTION) junctions.push(id);
        if (node.type === NODE_TYPE.END) ends.push(id);
      }
      const nSplices =
        plan.spanningSplices.length + plan.choiceSplices.length;
      const nMerges = plan.spanningMerges.length + plan.fourWayMerges.length;
      // Dead-end cuts and corner trims land in applyMazeCuts, not here.
      expect(junctions.length).toBe(2 * nSplices + nMerges);
      expect(ends.length).toBe(0);

      // Split junctions are degree 3; merges keep their crossing degree 4.
      const mergeSet = new Set([
        ...plan.spanningMerges,
        ...plan.fourWayMerges,
      ]);
      for (const id of junctions) {
        const deg = g.adjacency.get(id)!.length;
        expect(deg).toBe(mergeSet.has(id) ? 4 : 3);
      }
    }
  });

  it("keeps every strand's traversal order consistent", () => {
    for (const seed of SEEDS) {
      const { g } = applied(seed, P({ branchDensity: 0.8, deadEndDensity: 0.5 }));
      g.strands.forEach((strand) => {
        expect(strand.edgeIds.length).toBe(strand.nodes.length - 1);
        strand.edgeIds.forEach((eid, i) => {
          const e = g.edges.get(eid)!;
          expect(e.nodeA).toBe(strand.nodes[i]);
          expect(e.nodeB).toBe(strand.nodes[i + 1]);
        });
        if (strand.isClosed) {
          expect(strand.nodes[0]).toBe(strand.nodes[strand.nodes.length - 1]);
        }
      });
    }
  });

  it("adds bridges as open single-edge strands", () => {
    for (const seed of SEEDS) {
      const { g, plan } = applied(seed, P({ deadEndDensity: 0.5 }));
      const nNew = plan.spanningSplices.length + plan.choiceSplices.length;
      const newStrands = g.strands.slice(g.strands.length - nNew);
      for (const s of newStrands) {
        expect(s.isClosed).toBe(false);
        expect(s.edgeIds.length).toBe(1);
        expect(s.nodes.length).toBe(2);
      }
    }
  });

  it("is deterministic (same seed -> identical applied graph)", () => {
    const a = applied(4242);
    const b = applied(4242);
    expect(a.g.nodes).toEqual(b.g.nodes);
    expect(a.g.edges).toEqual(b.g.edges);
    expect(a.g.strands).toEqual(b.g.strands);
  });

  it("trims each cut's decoy flank into a 3-way merge (one tail per corner)", () => {
    for (const seed of SEEDS) {
      const g = generateLatticeKnotwork({
        gridSize: 8,
        weaveDensity: 0.3,
        turnBias: 0.6,
        randSeed: seed,
      });
      const plan = buildMazePlan(g, P({}));
      const hueGroup = applyMazePlan(g, plan);
      applyMazeCuts(g, plan, hueGroup);

      const cuts: Array<[typeof plan.entrance, readonly string[]]> = [
        [plan.entrance, ENTRANCE_END_IDS],
        [plan.exit, EXIT_END_IDS],
      ];
      for (const [cut, ids] of cuts) {
        // These seeds all have eligible flanks; a trim must be planned.
        expect(cut.trim, `trim for ${ids[0]}`).toBeDefined();
        const trim = cut.trim!;
        const present = ids.filter((id) => g.nodes.has(id));
        expect(present.length).toBe(1);
        // The tail hangs off the flank OPPOSITE the trimmed one.
        expect(present[0]).toBe(trim.side === "b" ? ids[0] : ids[1]);
        expect(g.adjacency.get(present[0])!.length).toBe(1);

        const merge = g.nodes.get(trim.mergeCrossing)!;
        expect(merge.type).toBe(NODE_TYPE.JUNCTION);
        expect(g.adjacency.get(trim.mergeCrossing)!.length).toBe(3);

        for (const eid of trim.stubEdges) {
          expect(g.edges.has(eid)).toBe(false);
        }
        for (const nid of trim.stubNodes) {
          expect(g.nodes.has(nid)).toBe(false);
        }
      }

      // All structural invariants hold on the fully applied graph.
      expect(checkStructure(g)).toBe(true);
      expect(checkStrandPartition(g)).toBe(true);
      expect(checkAlternation(g)).toBe(true);
      g.strands.forEach((strand) => {
        expect(strand.edgeIds.length).toBe(strand.nodes.length - 1);
        strand.edgeIds.forEach((eid, i) => {
          const e = g.edges.get(eid)!;
          expect(e.nodeA).toBe(strand.nodes[i]);
          expect(e.nodeB).toBe(strand.nodes[i + 1]);
        });
      });
    }
  });

  it("maps bridge/stub/cut-half hues back to their hosts", () => {
    for (const seed of SEEDS) {
      const g = generateLatticeKnotwork({
        gridSize: 8,
        weaveDensity: 0.3,
        turnBias: 0.6,
        randSeed: seed,
      });
      const nOriginal = g.strands.length;
      const plan = buildMazePlan(g, P({ deadEndDensity: 0.5 }));
      const hueGroup = applyMazePlan(g, plan);
      applyMazeCuts(g, plan, hueGroup);

      expect(hueGroup.length).toBe(g.strands.length);
      // Originals map to themselves; everything appended maps to an original.
      hueGroup.forEach((h, i) => {
        if (i < nOriginal) expect(h).toBe(i);
        else expect(h).toBeLessThan(nOriginal);
      });
      // Bridges map to their strandA host.
      const splices = [...plan.spanningSplices, ...plan.choiceSplices];
      splices.forEach((sp, k) => {
        expect(hueGroup[nOriginal + k]).toBe(sp.strandA);
      });
    }
  });

  it("dead-end cuts leave long open threads with one free tip each", () => {
    let totalCuts = 0;
    for (const seed of SEEDS) {
      const g = generateLatticeKnotwork({
        gridSize: 8,
        weaveDensity: 0.3,
        turnBias: 0.6,
        randSeed: seed,
      });
      const plan = buildMazePlan(g, P({ deadEndDensity: 0.6 }));
      const hueGroup = applyMazePlan(g, plan);
      applyMazeCuts(g, plan, hueGroup);

      plan.deadEndCuts.forEach((dc, k) => {
        const trim = dc.trim!;
        // The merge crossing fused to a degree-3 junction, stub deleted.
        expect(g.nodes.get(trim.mergeCrossing)!.type).toBe(
          NODE_TYPE.JUNCTION
        );
        expect(g.adjacency.get(trim.mergeCrossing)!.length).toBe(3);
        for (const eid of trim.stubEdges) expect(g.edges.has(eid)).toBe(false);
        for (const nid of trim.stubNodes) expect(g.nodes.has(nid)).toBe(false);

        // Exactly one FREE tip (no anchor), on the flank opposite the trim.
        const ids = [`mdead${k}_a`, `mdead${k}_b`];
        const present = ids.filter((id) => g.nodes.has(id));
        expect(present.length).toBe(1);
        expect(present[0]).toBe(trim.side === "b" ? ids[0] : ids[1]);
        const tip = g.nodes.get(present[0])!;
        expect(tip.type).toBe(NODE_TYPE.END);
        expect(tip.anchor).toBeUndefined();
        expect(g.adjacency.get(tip.id)!.length).toBe(1);

        // The cut strand is now one long OPEN thread from the merge
        // junction to the tip.
        const strand = g.strands[dc.strand];
        expect(strand.isClosed).toBe(false);
        const first = strand.nodes[0];
        const last = strand.nodes[strand.nodes.length - 1];
        expect([first, last]).toContain(tip.id);
        expect(
          first === tip.id ? last : first
        ).toBe(trim.mergeCrossing);
      });

      expect(checkStructure(g)).toBe(true);
      expect(checkStrandPartition(g)).toBe(true);
      expect(checkAlternation(g)).toBe(true);
      totalCuts += plan.deadEndCuts.length;
    }
    // Tiny test knots can lack eligible strands per seed, but the seed set
    // as a whole must exercise the surgery.
    expect(totalCuts).toBeGreaterThan(0);
  });
});

// K74 stage 2, H1: the fused arm cut (applyMazeCuts, plan.hCutShare > 0).

function knot(seed: number, gridSize: number): TangleGraph {
  return generateLatticeKnotwork({
    gridSize,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
}

// Lattice arc from an END along its strand to the first junction (or the
// strand's other end): the corridor a tail, an entrance or an exit promises.
function endRun(g: TangleGraph, end: string): number {
  for (const st of g.strands) {
    const n = st.nodes.length;
    if (st.isClosed || (st.nodes[0] !== end && st.nodes[n - 1] !== end)) continue;
    const step = st.nodes[0] === end ? 1 : -1;
    let len = 0;
    for (let k = step > 0 ? 0 : n - 1; k + step >= 0 && k + step < n; k += step) {
      const pts = g.edges.get(st.edgeIds[step > 0 ? k : k - 1])!.latticePoints;
      for (let m = 1; m < pts.length; m++) {
        len += hypot2(pts[m][0] - pts[m - 1][0], pts[m][1] - pts[m - 1][1]);
      }
      const t = g.nodes.get(st.nodes[k + step])!.type;
      if (t === NODE_TYPE.JUNCTION || t === NODE_TYPE.END) break;
    }
    return len;
  }
  return NaN;
}

function unreachedFromStart(w: WalkGraph): number {
  const seen = new Set<string>([w.start]);
  const stack = [w.start];
  while (stack.length) {
    for (const eid of w.vertices.get(stack.pop()!)!.edges) {
      for (const o of [w.edges[eid].va, w.edges[eid].vb]) {
        if (!seen.has(o)) {
          seen.add(o);
          stack.push(o);
        }
      }
    }
  }
  return w.vertices.size - seen.size;
}

describe("maze apply: H1 fused arm cut (K74 stage 2)", () => {
  const CASES: Array<[number, number, Partial<MazeParams>]> = [];
  for (const seed of SEEDS) {
    CASES.push([seed, 8, {}], [seed, 8, { deadEndDensity: 0.6 }]);
    CASES.push([seed, 12, { branchDensity: 0.8, fourWayFraction: 0.3 }]);
  }

  it("cuts H's and keeps every invariant, tail and vertex", () => {
    let cut = 0;
    for (const [seed, gs, over] of CASES) {
      const label = `seed ${seed} gs${gs} ${JSON.stringify(over)}`;
      const plan = buildMazePlan(knot(seed, gs), P({ ...over, hCutShare: 1 }));
      expect(plan.hCutShare, label).toBe(1);
      const plan0: MazePlan = { ...plan };
      delete plan0.hCutShare;

      const g0 = knot(seed, gs);
      applyMazeCuts(g0, plan0, applyMazePlan(g0, plan0));
      const g = knot(seed, gs);
      const nOriginal = g.strands.length;
      const hueGroup = applyMazePlan(g, plan);
      const stats = applyMazeCuts(g, plan, hueGroup)!;
      expect(stats, label).not.toBeNull();
      expect(stats.whole, label).toBe(true);
      expect(stats.attempted, label).toBe(stats.bridges);
      expect(stats.cut + stats.skipped, label).toBe(stats.attempted);
      cut += stats.cut;

      expect(checkStructure(g), label).toBe(true);
      expect(checkStrandPartition(g), label).toBe(true);
      expect(checkAlternation(g), label).toBe(true);
      // Edges stay in traversal order (nodeA = from), bridges included.
      g.strands.forEach((strand) => {
        expect(strand.edgeIds.length).toBe(strand.nodes.length - 1);
        strand.edgeIds.forEach((eid, i) => {
          const e = g.edges.get(eid)!;
          expect(e.nodeA, label).toBe(strand.nodes[i]);
          expect(e.nodeB, label).toBe(strand.nodes[i + 1]);
        });
      });
      expect(hueGroup.length, label).toBe(g.strands.length);
      hueGroup.forEach((h) => expect(h).toBeLessThan(nOriginal));

      // Each cut fuses one crossing X into a 3-way junction and leaves its
      // B a plain turn; nothing else changes type.
      let fused = 0;
      let turned = 0;
      for (const [id, n0] of g0.nodes) {
        const n = g.nodes.get(id);
        if (!n || n.type === n0.type) continue;
        if (n0.type === NODE_TYPE.CROSSING && n.type === NODE_TYPE.JUNCTION) {
          expect(g.adjacency.get(id)!.length, `${label}: X ${id}`).toBe(3);
          fused++;
        } else if (n0.type === NODE_TYPE.JUNCTION && n.type === NODE_TYPE.TURN) {
          expect(g.adjacency.get(id)!.length, `${label}: B ${id}`).toBe(2);
          turned++;
        } else {
          throw new Error(`${label}: ${id} ${n0.type} -> ${n.type}`);
        }
      }
      expect([fused, turned], label).toEqual([stats.cut, stats.cut]);

      // No END loses corridor: entrance, exit and tails keep their length
      // to the first junction (a cut can lengthen one).
      for (const [id, n0] of g0.nodes) {
        if (n0.type !== NODE_TYPE.END) continue;
        expect(g.nodes.get(id)?.type, `${label}: ${id}`).toBe(NODE_TYPE.END);
        expect(endRun(g, id), `${label}: ${id} run`).toBeGreaterThanOrEqual(
          endRun(g0, id) - 1e-9
        );
      }

      // Every walk vertex stays reachable from the start, with a route.
      const w = buildWalkGraph(g);
      expect(w, label).not.toBeNull();
      expect(unreachedFromStart(w!), label).toBe(0);
      expect(Number.isFinite(w!.optimalLength), label).toBe(true);
    }
    expect(cut).toBeGreaterThan(0);
  });

  it("cuts round(share x bridges) at a partial share, deterministically", () => {
    for (const [seed, gs, over] of CASES.slice(0, 6)) {
      const run = (share: number) => {
        const g = knot(seed, gs);
        const plan = buildMazePlan(knot(seed, gs), P({ ...over, hCutShare: share }));
        const stats = applyMazeCuts(g, plan, applyMazePlan(g, plan));
        return { g, stats };
      };
      const half = run(0.5);
      expect(half.stats!.attempted).toBe(Math.round(0.5 * half.stats!.bridges));
      expect(half.stats!.cut).toBeLessThanOrEqual(half.stats!.attempted);
      const again = run(0.5);
      expect(again.g.nodes).toEqual(half.g.nodes);
      expect(again.g.edges).toEqual(half.g.edges);
      expect(again.g.strands).toEqual(half.g.strands);
      // Share 0 runs no pass.
      expect(run(0).stats).toBeNull();
    }
  });
});
