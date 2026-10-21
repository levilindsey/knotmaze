import { describe, expect, it } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { walkDistances } from "../../src/core/walk_graph";
import { cuttable } from "../../src/game/cut";
import {
  buildWalkerMap,
  delayNext,
  delayRoute,
  leadEntries,
  leadPar,
  leadRoute,
} from "../../src/game/walker";
import type { WalkerMap } from "../../src/game/walker";

// A hand-made walk graph: vertex positions (screen y down), END vertices,
// runs [va, vb, chain, ctrlA, ctrlB, via?] in id order, closed chains'
// periods. Runs are straight (or bent through `via`).
type P = [number, number];
type RunSpec = [string, string, number, number, number, P?];
interface Spec {
  pos: Record<string, P>;
  ends: string[];
  runs: RunSpec[];
  periods?: Record<number, number>;
  start: string;
  exit: string;
}

const dist = (a: P, b: P): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

function build(spec: Spec): { walk: WalkGraph; map: WalkerMap } {
  const vertices = new Map<string, WalkVertex>();
  for (const id of Object.keys(spec.pos)) {
    vertices.set(id, { id, isEnd: spec.ends.includes(id), chain: 0, ctrl: 0, edges: [] });
  }
  const polys: P[][] = [];
  const edges: WalkEdge[] = spec.runs.map(([va, vb, chain, ctrlA, ctrlB, via], id) => {
    const pts = via ? [spec.pos[va], via, spec.pos[vb]] : [spec.pos[va], spec.pos[vb]];
    polys.push(pts);
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += dist(pts[i - 1], pts[i]);
    vertices.get(va)!.edges.push(id);
    if (vb !== va) vertices.get(vb)!.edges.push(id);
    return { id, va, vb, chain, ctrlA, ctrlB, length };
  });
  const distToExit = walkDistances(vertices, edges, spec.exit);
  const walk: WalkGraph = {
    vertices,
    edges,
    start: spec.start,
    exit: spec.exit,
    optimalLength: distToExit.get(spec.start)!,
    distToExit,
  };
  const map = buildWalkerMap(walk, (r) => polys[r], (c) => spec.periods?.[c] ?? 0);
  return { walk, map };
}

// A lattice of R x C 4-way junctions: a horizontal strand per row and a
// vertical one per column, each ending in an END stub at the border. The
// start is row 0's west stub, the exit row R-1's east stub; `drop` removes
// runs by key ("h r c" or "v r c": the run west of / north of junction
// (r, c), c = C or r = R being the last stub run).
function grid(R: number, C: number, drop: string[] = []): Spec {
  const pos: Record<string, P> = {};
  const ends: string[] = [];
  const runs: RunSpec[] = [];
  const J = (r: number, c: number): string => `j${r}_${c}`;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) pos[J(r, c)] = [10 * c, 10 * r];
  for (let r = 0; r < R; r++) {
    const w = `w${r}`;
    const e = `e${r}`;
    pos[w] = [-10, 10 * r];
    pos[e] = [10 * C, 10 * r];
    ends.push(w, e);
    const seq = [w, ...Array.from({ length: C }, (_, c) => J(r, c)), e];
    for (let i = 0; i + 1 < seq.length; i++) {
      if (drop.includes(`h ${r} ${i}`)) continue;
      runs.push([seq[i], seq[i + 1], r, 2 * i, 2 * i + 2]);
    }
  }
  for (let c = 0; c < C; c++) {
    const nn = `n${c}`;
    const s = `s${c}`;
    pos[nn] = [10 * c, -10];
    pos[s] = [10 * c, 10 * R];
    ends.push(nn, s);
    const seq = [nn, ...Array.from({ length: R }, (_, r) => J(r, c)), s];
    for (let i = 0; i + 1 < seq.length; i++) {
      if (drop.includes(`v ${i} ${c}`)) continue;
      runs.push([seq[i], seq[i + 1], R + c, 2 * i, 2 * i + 2]);
    }
  }
  return { pos, ends, runs, start: "w0", exit: `e${R - 1}` };
}

// The fewest cuts by brute force (subsets of the cuttable runs, up to
// `max`), Infinity when none works.
function brutePar(walk: WalkGraph, map: WalkerMap, max: number): number {
  const pool = walk.edges.map((e) => e.id).filter((r) => cuttable(walk, r));
  const pick: number[] = [];
  const tryK = (k: number, from: number): boolean => {
    if (pick.length === k) return leadRoute(map, new Set(pick)).end === "exit";
    for (let i = from; i < pool.length; i++) {
      pick.push(pool[i]);
      if (tryK(k, i + 1)) return true;
      pick.pop();
    }
    return false;
  };
  for (let k = 0; k <= max; k++) if (tryK(k, 0)) return k;
  return Infinity;
}

const PLUS: Spec = {
  pos: { S: [-10, 0], J: [0, 0], X: [10, 0], N: [0, -10], D: [0, 10] },
  ends: ["S", "X", "N", "D"],
  runs: [
    ["S", "J", 0, 0, 2],
    ["J", "X", 0, 2, 4],
    ["N", "J", 1, 0, 2],
    ["J", "D", 1, 2, 4],
  ],
  start: "S",
  exit: "X",
};

// A bridge from the south ends at J on an east-west host strand.
const TEE = (exit: string): Spec => ({
  pos: { S: [0, 10], J: [0, 0], E: [10, 0], W: [-10, 0] },
  ends: ["S", "E", "W"],
  runs: [
    ["S", "J", 1, 0, 2],
    ["W", "J", 0, 0, 2],
    ["J", "E", 0, 2, 4],
  ],
  start: "S",
  exit,
});

// The start's strand ends at J1 on a closed two-run loop; the exit's strand
// ends at J2.
const RING: Spec = {
  pos: { S: [-10, 0], J1: [0, 0], J2: [10, 0], X: [20, 0] },
  ends: ["S", "X"],
  runs: [
    ["S", "J1", 0, 0, 2],
    ["J1", "J2", 1, 0, 2, [5, -5]],
    ["J2", "J1", 1, 2, 4, [5, 5]],
    ["J2", "X", 2, 0, 2],
  ],
  periods: { 1: 4 },
  start: "S",
  exit: "X",
};

describe("K114 walker: Lead's strand follower", () => {
  it("goes straight on along its strand through a junction", () => {
    const { map } = build(PLUS);
    const route = leadRoute(map, new Set());
    expect(route.end).toBe("exit");
    expect(route.states).toEqual([0, 2]);
  });

  it("with its continuation cut it keeps right, turns back at an END and loops", () => {
    const { map } = build(PLUS);
    // Heading east, the next arm clockwise is south (screen y down).
    expect([...leadEntries(map, 0)]).toEqual([2, 6, 5, 1]);
    const route = leadRoute(map, new Set([1]));
    // S->J, J->D, back D->J, on along its strand J->N, back N->J, J->D again.
    expect(route.states).toEqual([0, 6, 7, 5, 4]);
    expect(route.end).toBe("loop");
    expect(route.loopAt).toBe(1);
  });

  it("where its strand ends it takes the next arm clockwise from straight on", () => {
    const { map } = build(TEE("E"));
    // Northbound off the bridge: east is the right turn.
    expect(leadRoute(map, new Set()).states).toEqual([0, 4]);
  });

  it("turns back at an END and carries on along the host strand", () => {
    const { map } = build(TEE("W"));
    const route = leadRoute(map, new Set());
    expect(route.end).toBe("exit");
    expect(route.states).toEqual([0, 4, 5, 3]);
  });

  it("follows a closed strand round and detects the loop", () => {
    const { map } = build(RING);
    const route = leadRoute(map, new Set());
    expect(route.end).toBe("loop");
    // S->J1, the lower arc backwards (J1->J2), the upper arc backwards.
    expect(route.states).toEqual([0, 5, 3]);
    expect(route.loopAt).toBe(1);
  });
});

describe("K114 walker: par", () => {
  it("one cut breaks the ring, and the search proves no zero-cut walk", () => {
    const { walk, map } = build(RING);
    const par = leadPar(map);
    expect(par.par).toBe(1);
    expect(par.exact).toBe(true);
    expect(par.modelValid).toBe(true);
    expect(leadRoute(map, new Set(par.cuts)).end).toBe("exit");
    expect(brutePar(walk, map, 2)).toBe(1);
  });

  it("is zero when the walker already reaches the exit", () => {
    const { map } = build(PLUS);
    const par = leadPar(map);
    expect(par.par).toBe(0);
    expect(par.cuts).toEqual([]);
    expect(par.exact).toBe(true);
  });

  const cases: Array<[number, number, string[]]> = [
    [3, 3, []],
    [3, 3, ["h 0 2"]],
    [3, 4, ["v 1 1", "h 2 1"]],
    [4, 3, ["h 1 1", "v 2 0"]],
    [3, 3, ["v 1 2", "h 1 3"]],
    [4, 4, ["h 0 2", "v 2 1", "h 3 2"]],
  ];
  it.each(cases)("matches brute force on a %ix%i lattice (drop %j)", (R, C, drop) => {
    const { walk, map } = build(grid(R, C, drop));
    const par = leadPar(map);
    const brute = brutePar(walk, map, 4);
    expect(par.exact).toBe(true);
    expect(par.par).toBe(brute);
    if (Number.isFinite(par.par)) {
      expect(par.cuts.length).toBe(par.par);
      expect(par.cuts.every((r) => cuttable(walk, r))).toBe(true);
      expect(leadRoute(map, new Set(par.cuts)).end).toBe("exit");
    }
  });

  it("reports an upper bound, not a par, when the budget runs out", () => {
    const { map } = build(grid(4, 4, ["h 0 2", "v 2 1", "h 3 2"]));
    const full = leadPar(map);
    const starved = leadPar(map, { budget: 3 });
    expect(starved.exact).toBe(false);
    if (starved.modelValid) expect(starved.par).toBe(starved.modelCuts.length);
    expect(starved.par).toBeGreaterThanOrEqual(full.par);
  });

  it("is deterministic", () => {
    const spec = grid(4, 4, ["h 0 2", "v 2 1", "h 3 2"]);
    const a = leadPar(build(spec).map);
    const b = leadPar(build(spec).map);
    expect(b).toEqual(a);
    const m1 = build(spec).map;
    const m2 = build(spec).map;
    for (let d = 0; d < 2 * m1.n; d++) expect([...leadEntries(m2, d)]).toEqual([...leadEntries(m1, d)]);
  });
});

describe("K114 walker: Delay's replanning walker", () => {
  it("takes the first run of its shortest route, and replans round a cut", () => {
    const { walk } = build(grid(3, 3));
    const route = delayRoute(walk, walk.start, new Set());
    let len = 0;
    for (const r of route) len += walk.edges[r].length;
    expect(len).toBeCloseTo(walk.optimalLength, 9);
    const first = delayNext(walk, walk.start, new Set());
    expect(first).toBe(route[0]);
    // Cut the second run of the route: from its start the walker replans.
    const e0 = walk.edges[route[0]];
    const at = e0.va === walk.start ? e0.vb : e0.va;
    const cuts = new Set([route[1]]);
    const next = delayNext(walk, at, cuts);
    expect(next).not.toBe(route[1]);
    expect(next).toBeGreaterThanOrEqual(0);
    const after = delayRoute(walk, at, cuts);
    expect(after.includes(route[1])).toBe(false);
    const tail = walk.edges[after[after.length - 1]];
    expect(tail.va === walk.exit || tail.vb === walk.exit).toBe(true);
  });

  it("breaks length ties by run id and stops at the exit", () => {
    const { walk } = build(grid(3, 3));
    expect(delayNext(walk, walk.exit, new Set())).toBe(-1);
    // From the middle junction, east and south are equally far (by
    // symmetry the routes tie): the lower run id wins.
    const at = "j1_1";
    const r = delayNext(walk, at, new Set());
    const vert = walk.vertices.get(at)!;
    const best = Math.min(
      ...vert.edges.map((x) => {
        const e = walk.edges[x];
        const far = e.va === at ? e.vb : e.va;
        return e.length + walk.distToExit.get(far)!;
      })
    );
    const ties = vert.edges.filter((x) => {
      const e = walk.edges[x];
      const far = e.va === at ? e.vb : e.va;
      return e.length + walk.distToExit.get(far)! === best;
    });
    expect(r).toBe(Math.min(...ties));
  });
});
