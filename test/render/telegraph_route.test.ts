// K525: the telegraphed route as paint pieces (src/render/telegraph_route.ts),
// on a synthetic chase graph. Vertices 0..3; e0 runs 0 -> 1 (len 4, ctrl
// 10..18), e1 runs 2 -> 1 (len 2, ctrl 3..7, walked backward from 1 to 2),
// e2 runs 2 -> 3 (len 6, ctrl 0..12).
import { describe, expect, it } from "vitest";
import { chaseRoute, telegraphPieces, type RouteRun } from "../../src/render/telegraph_route";
import { TELEGRAPH_LATER_SHARE, telegraphAlphas } from "../../src/game/mino_feedback";

const g = { ea: [0, 2, 2], eb: [1, 1, 3], len: [4, 2, 6] };
const runs: (RouteRun | undefined)[] = [
  { chain: 0, ctrlA: 10, ctrlB: 18 },
  { chain: 1, ctrlA: 3, ctrlB: 7 },
  { chain: 2, ctrlA: 0, ctrlB: 12 },
];
const route = [
  [0, 1],
  [1, 2],
  [2, 3],
] as const;
const L = TELEGRAPH_LATER_SHARE;

describe("telegraphPieces", () => {
  it("by runs: whole runs, junction ends, the first run at 1 and later runs at the later share", () => {
    expect(telegraphPieces(g, runs, { steps: route })).toEqual([
      { chain: 0, c0: 10, c1: 18, alpha: 1, j0: true, j1: true },
      { chain: 1, c0: 3, c1: 7, alpha: L, j0: true, j1: true },
      { chain: 2, c0: 0, c1: 12, alpha: L, j0: true, j1: true },
    ]);
  });

  it("the later share is the line's (telegraphAlphas)", () => {
    const a = telegraphAlphas(true, 2);
    expect(a[1] / a[0]).toBeCloseTo(L, 12);
  });

  it("a missing run ends the route, as drawTelegraph does", () => {
    const gap = [runs[0], undefined, runs[2]];
    expect(telegraphPieces(g, gap, { steps: route })).toEqual([
      { chain: 0, c0: 10, c1: 18, alpha: 1, j0: true, j1: true },
    ]);
  });

  it("by length: enters at fromSpot, covers segLens from each entry, mid-run ends are not junctions", () => {
    const t = { steps: route, fromSpot: { edge: 0, pos: 1, vertex: -1 }, segLens: [3, 2, 1.5], stops: [] };
    expect(telegraphPieces(g, runs, t)).toEqual([
      { chain: 0, c0: 12, c1: 18, alpha: 1, j0: false, j1: true },
      { chain: 1, c0: 3, c1: 7, alpha: L, j0: true, j1: true },
      { chain: 2, c0: 0, c1: 3, alpha: L, j0: true, j1: false },
    ]);
  });

  it("by length from a vertex, walking a run backward to a mid-run stop", () => {
    const t = { steps: [[1, 2]] as const, fromSpot: { edge: -1, pos: 0, vertex: 1 }, segLens: [1], stops: [] };
    expect(telegraphPieces(g, runs, t)).toEqual([{ chain: 1, c0: 5, c1: 7, alpha: 1, j0: false, j1: true }]);
  });

  it("by length needs stops too (drawTelegraph's own test), else whole runs", () => {
    const t = { steps: route, fromSpot: { edge: 0, pos: 1, vertex: -1 }, segLens: [3, 2, 1.5] };
    expect(telegraphPieces(g, runs, t).map((p) => [p.c0, p.c1])).toEqual([
      [10, 18],
      [3, 7],
      [0, 12],
    ]);
  });

  it("clamps a stretch to its run and drops an empty one", () => {
    const t = { steps: route, fromSpot: { edge: 0, pos: 1, vertex: -1 }, segLens: [9, 0, 1], stops: [] };
    expect(telegraphPieces(g, runs, t)).toEqual([
      { chain: 0, c0: 12, c1: 18, alpha: 1, j0: false, j1: true },
      { chain: 2, c0: 0, c1: 2, alpha: L, j0: true, j1: false },
    ]);
  });

  it("the lead (ChasePlan shape) comes first, toward the end it walks to; it and the first step at 1 (K324 s2)", () => {
    const two = [
      [1, 2],
      [2, 3],
    ] as const;
    expect(telegraphPieces(g, runs, { steps: two }, { edge: 0, pos: 1, dir: 1 })).toEqual([
      { chain: 0, c0: 12, c1: 18, alpha: 1, j0: false, j1: true },
      { chain: 1, c0: 3, c1: 7, alpha: 1, j0: true, j1: true },
      { chain: 2, c0: 0, c1: 12, alpha: L, j0: true, j1: true },
    ]);
    expect(telegraphPieces(g, runs, { steps: [] }, { edge: 0, pos: 1, dir: -1 })).toEqual([
      { chain: 0, c0: 10, c1: 12, alpha: 1, j0: true, j1: false },
    ]);
  });

  it("an empty or missing lead leaves the first step as the first run", () => {
    const one = { steps: [[1, 2]] as const };
    const first = [{ chain: 1, c0: 3, c1: 7, alpha: 1, j0: true, j1: true }];
    expect(telegraphPieces(g, runs, one, { edge: 0, pos: 4, dir: 1 })).toEqual(first);
    expect(telegraphPieces(g, [undefined, runs[1]], one, { edge: 0, pos: 1, dir: 1 })).toEqual(first);
  });
});

describe("telegraphPieces riding (K654)", () => {
  const one = { steps: [[1, 2]] as const };
  it("a riding lead holds its whole run, the spot's end flagged, its ctrl in at", () => {
    expect(telegraphPieces(g, runs, one, { edge: 0, pos: 1, dir: 1 }, true)).toEqual([
      { chain: 0, c0: 10, c1: 18, alpha: 1, j0: false, j1: true, ride: 0, at: 12 },
      { chain: 1, c0: 3, c1: 7, alpha: 1, j0: true, j1: true },
    ]);
    expect(telegraphPieces(g, runs, { steps: [] }, { edge: 0, pos: 1, dir: -1 }, true)).toEqual([
      { chain: 0, c0: 10, c1: 18, alpha: 1, j0: true, j1: false, ride: 1, at: 12 },
    ]);
  });

  it("the fixed fields (the KPAINT key's) do not move while the spot walks; at does", () => {
    const at = (pos: number) => telegraphPieces(g, runs, one, { edge: 0, pos, dir: 1 }, true);
    const fixed = (ps: ReturnType<typeof at>) => ps.map(({ at: _at, ...rest }) => rest);
    expect(fixed(at(0.5))).toEqual(fixed(at(3.5)));
    expect([at(0.5)[0].at, at(3.5)[0].at]).toEqual([11, 17]);
  });

  it("riding moves only the lead: the unridden pieces are the same", () => {
    const lead = { edge: 0, pos: 1, dir: 1 } as const;
    expect(telegraphPieces(g, runs, one, lead, true).slice(1)).toEqual(telegraphPieces(g, runs, one, lead).slice(1));
  });

  it("an empty riding lead draws nothing", () => {
    expect(telegraphPieces(g, runs, { steps: [] }, { edge: 0, pos: 4, dir: 1 }, true)).toEqual([]);
  });
});

describe("chaseRoute (K324 stage 2: the real-time plan as a route)", () => {
  type Steps = readonly (readonly [number, number])[];
  const plan = (lead: { edge: number; pos: number; dir: 1 | -1 } | null, steps: Steps, dest = -1, hunting = false) => ({
    lead,
    steps,
    dest,
    hunting,
  });

  it("the telegraph off (no plan) draws nothing", () => {
    expect(chaseRoute(g, null)).toBeNull();
  });

  it("roaming, moving: the lead, from its far end, the runs, and the ring at a destination it reaches", () => {
    const lead = { edge: 0, pos: 1, dir: 1 } as const;
    const steps = [
      [1, 2],
      [2, 3],
    ] as const;
    expect(chaseRoute(g, plan(lead, steps, 3))).toEqual({ from: 1, steps, dest: 3, lead, hunting: false });
    // Short of its destination: no ring.
    expect(chaseRoute(g, plan(lead, steps.slice(0, 1)))!.dest).toBe(-1);
  });

  it("a junction stop and resting (no lead): from is the first run's other end", () => {
    expect(chaseRoute(g, plan(null, [[1, 2]]))).toEqual({ from: 1, steps: [[1, 2]], dest: -1, lead: null, hunting: false });
    // e1 walked forward, 2 -> 1.
    expect(chaseRoute(g, plan(null, [[1, 1]]))!.from).toBe(2);
  });

  it("hunting: the lead in the direction it keeps (a turn-back included), then the hunt run, bright", () => {
    const lead = { edge: 2, pos: 3, dir: -1 } as const;
    expect(chaseRoute(g, plan(lead, [[1, 1]], -1, true))).toEqual({
      from: 2,
      steps: [[1, 1]],
      dest: -1,
      lead,
      hunting: true,
    });
    // On the player's run (plan stops at the lead): the lead alone.
    expect(chaseRoute(g, plan({ edge: 0, pos: 2, dir: 1 }, [], -1, true))!.lead).toEqual({ edge: 0, pos: 2, dir: 1 });
  });

  it("the lair: nothing until its last LAIR_TELL, then the exit tail's run alone", () => {
    expect(chaseRoute(g, plan(null, []))).toBeNull();
    expect(chaseRoute(g, plan(null, [[2, 3]]))).toEqual({ from: 2, steps: [[2, 3]], dest: -1, lead: null, hunting: false });
  });

  it("an empty lead becomes null and keeps its far end as from", () => {
    expect(chaseRoute(g, plan({ edge: 0, pos: 4, dir: 1 }, [[1, 2]]))).toEqual({
      from: 1,
      steps: [[1, 2]],
      dest: -1,
      lead: null,
      hunting: false,
    });
    expect(chaseRoute(g, plan({ edge: 0, pos: 0, dir: -1 }, []))).toBeNull();
    // Arriving at its destination: the ring alone.
    expect(chaseRoute(g, plan({ edge: 0, pos: 4, dir: 1 }, [], 1))).toEqual({ from: 1, steps: [], dest: 1, lead: null, hunting: false });
  });

  it("feeds telegraphPieces: the riding lead and the first run at 1, later runs at the later share", () => {
    const r = chaseRoute(g, plan({ edge: 0, pos: 1, dir: 1 }, [[1, 2], [2, 3]]))!;
    expect(telegraphPieces(g, runs, r, r.lead, true).map((p) => [p.chain, p.alpha, p.ride ?? -1])).toEqual([
      [0, 1, 0],
      [1, 1, -1],
      [2, L, -1],
    ]);
  });
});
