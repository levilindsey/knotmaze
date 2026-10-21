// K525: the telegraphed route as paint pieces (src/render/telegraph_route.ts),
// on a synthetic chase graph. Vertices 0..3; e0 runs 0 -> 1 (len 4, ctrl
// 10..18), e1 runs 2 -> 1 (len 2, ctrl 3..7, walked backward from 1 to 2),
// e2 runs 2 -> 3 (len 6, ctrl 0..12).
import { describe, expect, it } from "vitest";
import { telegraphPieces, type RouteRun } from "../../src/render/telegraph_route";
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

  it("the lead (ChasePlan shape) comes first at 1, toward the end it walks to", () => {
    expect(telegraphPieces(g, runs, { steps: [[1, 2]] }, { edge: 0, pos: 1, dir: 1 })).toEqual([
      { chain: 0, c0: 12, c1: 18, alpha: 1, j0: false, j1: true },
      { chain: 1, c0: 3, c1: 7, alpha: L, j0: true, j1: true },
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
