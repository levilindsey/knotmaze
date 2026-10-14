import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import {
  buildMazePlan,
  DEFAULT_MAZE_PARAMS,
  planReachesAll,
  planTailsJoined,
} from "../../src/core/maze_plan";
import type { MazeParams, MazePlan, SpliceSite } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { SHAPES, planAnchors } from "../../src/core/shapes";
import type { ShapeName } from "../../src/core/shapes";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import type { TangleGraph } from "../../src/core/types";
import { hypot2 } from "../../src/util/det_math";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";
import type { UrlParams } from "../../src/ui/url_state";
import { buildMazePlan as buildMazePlanV1 } from "./fixtures/maze_plan_v1";

// K110: every piece of a maze is reachable from the start. A plan whose
// tails meet could still leave pieces the start never reaches (the entrance
// and exit cut one loop and the arc between them fused into itself or into
// strands nothing else joined). planReachesAll catches that before surgery,
// and buildMazePlan hangs each such piece off the start's region by one
// junction appended to the plan, or moves the exit when no junction can.
// .claude/probes/K110/verify.ts runs the same checks over 3780 designs
// against the frozen K109 module.
// K74 moved the defaults (exit clearance 12, long-tail dead ends on); the
// K110 cases keep the knobs they were found with (PRE_K74), and the last
// test repeats the checks at the new defaults.

const PRE_K74: Partial<UrlParams> = { exitClearance: 5, deadEndDensity: 0.25, deadEndLength: 0 };

function design(
  shape: ShapeName,
  gridSize: number,
  seed: number,
  deadEnds: boolean,
  knobs: Partial<UrlParams> = {}
): UrlParams {
  return { ...PARAM_DEFAULTS, ...PRE_K74, shape, gridSize, seed, deadEnds, ...knobs };
}

function graphOf(p: UrlParams): TangleGraph {
  return generateLatticeKnotwork({
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    randSeed: p.seed,
    shape: p.shape,
  });
}

function mazeParamsOf(p: UrlParams): MazeParams {
  return {
    ...DEFAULT_MAZE_PARAMS,
    branchDensity: p.branchDensity,
    fourWayFraction: p.fourWayFraction,
    deadEndDensity: p.deadEnds ? p.deadEndDensity : 0,
    deadEndLength: p.deadEndLength,
    entranceClearance: p.entranceClearance,
    exitClearance: p.exitClearance,
    junctionSpacing: p.junctionSpacing,
    ...planAnchors(p.shape, p.gridSize, p.startAnchor, p.exitAnchor),
  };
}

function walkOf(p: UrlParams, plan: MazePlan): [TangleGraph, WalkGraph] {
  const graph = graphOf(p);
  const hueGroup = applyMazePlan(graph, plan);
  applyMazeCuts(graph, plan, hueGroup);
  const walk = buildWalkGraph(graph);
  expect(walk, `${p.shape} gs${p.gridSize} seed ${p.seed}: walk graph`).not.toBeNull();
  return [graph, walk!];
}

// Walk-graph vertices the start cannot reach.
function unreached(w: WalkGraph): string[] {
  const seen = new Set<string>([w.start]);
  const stack = [w.start];
  while (stack.length) {
    const v = stack.pop()!;
    for (const eid of w.vertices.get(v)!.edges) {
      const e = w.edges[eid];
      for (const o of [e.va, e.vb]) {
        if (!seen.has(o)) {
          seen.add(o);
          stack.push(o);
        }
      }
    }
  }
  return [...w.vertices.keys()].filter((v) => !seen.has(v));
}

// Walk distance between two vertices (Dijkstra).
function distance(w: WalkGraph, from: string, to: string): number {
  const dist = new Map<string, number>([[from, 0]]);
  const done = new Set<string>();
  for (;;) {
    let cur: string | null = null;
    let cd = Infinity;
    for (const [v, d] of dist) {
      if (!done.has(v) && d < cd) {
        cd = d;
        cur = v;
      }
    }
    if (cur === null || cur === to) return cd;
    done.add(cur);
    for (const eid of w.vertices.get(cur)!.edges) {
      const e = w.edges[eid];
      const o = e.va === cur ? e.vb : e.va;
      if (cd + e.length < (dist.get(o) ?? Infinity)) dist.set(o, cd + e.length);
    }
  }
}

// An END's tail edge: half the cut edge plus any escape path. Escape tails
// are routed after surgery around every thread, so a join bridge near a
// tail's old path can reroute it; the FABRIC route below excludes tails.
function tailLength(g: TangleGraph, end: string): number {
  let len = 0;
  for (const eid of g.adjacency.get(end)!) {
    const pts = g.edges.get(eid)!.latticePoints;
    for (let k = 1; k < pts.length; k++) {
      len += hypot2(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    }
  }
  return len;
}

function fabricRoute(g: TangleGraph, w: WalkGraph, start: string, exit: string): number {
  return distance(w, start, exit) - tailLength(g, start) - tailLength(g, exit);
}

function properIntersect(s: SpliceSite, a: [number, number], b: [number, number]): boolean {
  const r1x = s.b[0] - s.a[0];
  const r1y = s.b[1] - s.a[1];
  const r2x = b[0] - a[0];
  const r2y = b[1] - a[1];
  const denom = r1x * r2y - r1y * r2x;
  if (Math.abs(denom) < 1e-12) return false;
  const qx = a[0] - s.a[0];
  const qy = a[1] - s.a[1];
  const u = (qx * r2y - qy * r2x) / denom;
  const v = (qx * r1y - qy * r1x) / denom;
  return u > 1e-6 && u < 1 - 1e-6 && v > 1e-6 && v < 1 - 1e-6;
}

// A join's bridge crosses no thread and no other bridge, and lands on edges
// no cut, trim or other junction uses.
function expectPlanarJoin(label: string, g: TangleGraph, plan: MazePlan, join: SpliceSite): void {
  for (const [eid, edge] of g.edges) {
    if (eid === join.edgeA || eid === join.edgeB) continue;
    const pts = edge.latticePoints;
    for (let k = 1; k < pts.length; k++) {
      expect(properIntersect(join, pts[k - 1], pts[k]), `${label}: join crosses ${eid}`).toBe(false);
    }
  }
  const used = new Set<string>();
  for (const s of [...plan.spanningSplices, ...plan.choiceSplices]) {
    if (s === join) continue;
    expect(properIntersect(join, s.a, s.b), `${label}: join crosses a bridge`).toBe(false);
    used.add(s.edgeA).add(s.edgeB);
  }
  for (const cut of [plan.entrance, plan.exit, ...plan.deadEndCuts]) {
    used.add(cut.edgeId);
    for (const e of cut.trim?.stubEdges ?? []) used.add(e);
  }
  expect(used.has(join.edgeA) || used.has(join.edgeB), `${label}: join on a used edge`).toBe(false);
}

// A merge join fuses a crossing nothing else merged or deleted.
function expectFreeMerge(label: string, plan: MazePlan, merge: string, others: string[]): void {
  const taken = new Set([...others, ...plan.fourWayMerges]);
  for (const cut of [plan.entrance, plan.exit, ...plan.deadEndCuts]) {
    if (!cut.trim) continue;
    taken.add(cut.trim.mergeCrossing);
    for (const n of cut.trim.stubNodes) taken.add(n);
  }
  expect(taken.has(merge), `${label}: merge join on a used crossing`).toBe(false);
}

// Designs the K109 module (and the frozen V1 one) built with pieces the start
// could not reach, keeping their exit: the default sweeps' and K109's cases
// (heart gs4 1209 reroutes its exit tail around the join; heart gs2 1090's
// joined piece holds a decoy tail, so the walk graph's longest start/exit
// pair moves to it).
const JOINED: UrlParams[] = [
  design("heart", 2, 1090, false),
  design("heart", 4, 1209, true),
  design("heart", 7, 1122, false),
  design("star", 8, 1216, false),
  design("star", 9, 1191, true),
  design("fish", 6, 1294, false),
  design("tree", 6, 1389, true),
  design("ring", 5, 1469, true),
  design("circle", 3, 1551, true),
  design("circle", 5, 1562, false),
  design("rect", 6, 883132207, false, {
    startAnchor: "w",
    exitAnchor: "s",
    branchDensity: 0,
    fourWayFraction: 0.85,
    entranceClearance: 2,
    exitClearance: 6.5,
    junctionSpacing: 1.5,
  }),
];

// Designs whose pieces no junction can join with the nearest exit edge: the
// exit moves to the next-nearest edge that leaves a whole maze (a rect design
// with its start and exit at one corner had its route skip the whole maze).
const EXIT_MOVED: UrlParams[] = [
  design("heart", 5, 1112, false),
  design("fish", 3, 1276, false),
  design("rect", 10, 1276507686, true, {
    startAnchor: "se",
    exitAnchor: "se",
    weaveDensity: 0.65,
    turnBias: 0.95,
    branchDensity: 0,
    fourWayFraction: 0.5,
    deadEndDensity: 0.7,
    entranceClearance: 0.5,
    exitClearance: 4.5,
    junctionSpacing: 3.25,
  }),
];

describe("maze plan: every piece reachable from the start (K110)", () => {
  it("joins each piece the old module left unreachable, at one junction", () => {
    for (const p of JOINED) {
      const label = `${p.shape} gs${p.gridSize} seed ${p.seed}`;
      const params = mazeParamsOf(p);
      const old = buildMazePlanV1(graphOf(p), params) as MazePlan;
      expect(planTailsJoined(graphOf(p), old), `${label}: old tails`).toBe(true);
      expect(planReachesAll(graphOf(p), old), `${label}: old model`).toBe(false);
      const [oldGraph, oldWalk] = walkOf(p, old);
      expect(unreached(oldWalk).length, `${label}: old walk`).toBeGreaterThan(0);

      const plan = buildMazePlan(graphOf(p), params);
      expect(planReachesAll(graphOf(p), plan), `${label}: model`).toBe(true);
      const [graph, walk] = walkOf(p, plan);
      expect(unreached(walk), `${label}: walk`).toEqual([]);

      // The old plan plus appended joins: nothing else moved.
      const ns = old.spanningSplices.length;
      const nm = old.spanningMerges.length;
      expect(
        JSON.stringify({
          ...plan,
          spanningSplices: plan.spanningSplices.slice(0, ns),
          spanningMerges: plan.spanningMerges.slice(0, nm),
        }),
        `${label}: prefix`
      ).toBe(JSON.stringify(old));
      const joins = plan.spanningSplices.length - ns + plan.spanningMerges.length - nm;
      expect(joins, `${label}: joins`).toBeGreaterThan(0);

      // A piece hung off the maze at one junction is a side region: the
      // route between the old start and exit is exactly as long.
      expect(
        fabricRoute(graph, walk, oldWalk.start, oldWalk.exit),
        `${label}: fabric route`
      ).toBeCloseTo(fabricRoute(oldGraph, oldWalk, oldWalk.start, oldWalk.exit), 9);
      // The walk graph's optimal is never shorter, except by a rerouted tail.
      const tails = (g: TangleGraph): number =>
        tailLength(g, oldWalk.start) + tailLength(g, oldWalk.exit);
      expect(walk.optimalLength - tails(graph), `${label}: optimal`).toBeGreaterThanOrEqual(
        oldWalk.optimalLength - tails(oldGraph) - 1e-9
      );

      const g = graphOf(p);
      for (const join of plan.spanningSplices.slice(ns)) expectPlanarJoin(label, g, plan, join);
      plan.spanningMerges.forEach((x, i) => {
        if (i >= nm) expectFreeMerge(label, plan, x, plan.spanningMerges.filter((_, j) => j !== i));
      });
    }
  });

  it("moves the exit when no junction can join a piece", () => {
    for (const p of EXIT_MOVED) {
      const label = `${p.shape} gs${p.gridSize} seed ${p.seed}`;
      const params = mazeParamsOf(p);
      const old = buildMazePlanV1(graphOf(p), params) as MazePlan;
      expect(planReachesAll(graphOf(p), old), `${label}: old model`).toBe(false);
      const plan = buildMazePlan(graphOf(p), params);
      expect(plan.entrance.edgeId, `${label}: entrance`).toBe(old.entrance.edgeId);
      expect(plan.exit.edgeId, `${label}: exit`).not.toBe(old.exit.edgeId);
      expect(planReachesAll(graphOf(p), plan), `${label}: model`).toBe(true);
      const [, walk] = walkOf(p, plan);
      expect(Number.isFinite(walk.optimalLength), `${label}: route`).toBe(true);
      expect(unreached(walk), `${label}: walk`).toEqual([]);
    }
  });

  it("leaves no piece unreached in small shaped designs", () => {
    // K109's sweep. The frozen module built some of these without a route
    // and more with a route but pieces off it.
    let seed = 109000;
    let oldNoRoute = 0;
    let oldOrphaned = 0;
    for (const shape of SHAPES) {
      for (let gridSize = 3; gridSize <= 10; gridSize++) {
        for (let k = 0; k < 4; k++) {
          const p = design(shape, gridSize, seed++, k % 2 === 1);
          const params = mazeParamsOf(p);
          const old = buildMazePlanV1(graphOf(p), params) as MazePlan;
          if (!planTailsJoined(graphOf(p), old)) oldNoRoute++;
          else if (!planReachesAll(graphOf(p), old)) oldOrphaned++;
          const plan = buildMazePlan(graphOf(p), params);
          const label = `${shape} gs${gridSize} seed ${p.seed}`;
          expect(planReachesAll(graphOf(p), plan), label).toBe(true);
          const [, walk] = walkOf(p, plan);
          expect(unreached(walk), label).toEqual([]);
        }
      }
    }
    expect([oldNoRoute, oldOrphaned]).toEqual([8, 24]);
  });

  it("leaves no piece unreached with long-tail dead ends (K74 defaults)", () => {
    // The sweep above and the listed designs at today's defaults, dead ends
    // on, plus the densest and longest tails the sliders allow. Long tails
    // are placed before the choices; K110's joins still make every plan
    // whole (.claude/probes/K74/verify_reach.ts: 0 of 3780 designs fail).
    const tails: Partial<UrlParams>[] = [{}, { deadEndDensity: 1 }, { deadEndLength: 40 }];
    const designs: UrlParams[] = [];
    let seed = 109000;
    for (const shape of SHAPES) {
      for (let gridSize = 3; gridSize <= 10; gridSize++) {
        for (let k = 0; k < 3; k++) {
          designs.push({ ...PARAM_DEFAULTS, shape, gridSize, seed: seed++, ...tails[k] });
        }
      }
    }
    for (const p of [...JOINED, ...EXIT_MOVED]) {
      designs.push({ ...PARAM_DEFAULTS, shape: p.shape, gridSize: p.gridSize, seed: p.seed });
    }
    let cuts = 0;
    for (const p of designs) {
      expect(p.deadEnds).toBe(true);
      const plan = buildMazePlan(graphOf(p), mazeParamsOf(p));
      cuts += plan.deadEndCuts.length;
      const label = `${p.shape} gs${p.gridSize} seed ${p.seed}`;
      expect(planReachesAll(graphOf(p), plan), label).toBe(true);
      const [, walk] = walkOf(p, plan);
      expect(Number.isFinite(walk.optimalLength), `${label}: route`).toBe(true);
      expect(unreached(walk), label).toEqual([]);
    }
    expect(cuts).toBeGreaterThan(0);
  });
});
