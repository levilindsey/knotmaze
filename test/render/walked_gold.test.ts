// K794: walked gold stays gold - the pure walk from the controller's
// taps to gold spans, routes and caps inputs (src/render/walked_gold.ts).
import { describe, expect, it } from "vitest";
import { walkedGold } from "../../src/render/walked_gold";
import type { RouteEdge } from "../../src/render/junction_routes";

// A-B-C-D with a loop back B<-D: runs 0,1,2 around, 3 the chord.
const EDGES: RouteEdge[] = [
  { va: "A", vb: "B", chain: 0, ctrlA: 0, ctrlB: 10, length: 4 },
  { va: "B", vb: "C", chain: 0, ctrlA: 10, ctrlB: 20, length: 4 },
  { va: "C", vb: "D", chain: 1, ctrlA: 0, ctrlB: 8, length: 3 },
  { va: "D", vb: "B", chain: 1, ctrlA: 8, ctrlB: 16, length: 5 },
];
const START = "A";
const gold = (
  taps: readonly number[],
  pathEdges: readonly number[] = [],
  from = 0,
  anim: Parameters<typeof walkedGold>[5] = null
) => walkedGold(EDGES, START, taps, from, pathEdges, anim);

describe("K794 walked gold", () => {
  it("after a walk with a backtrack, the backtracked run stays gold", () => {
    // A-B, B-C, backtrack C-B (tap on run 1 again): head B, path [0].
    const g = gold([0, 1, 1], [0]);
    expect([...g.walked].sort()).toEqual([0, 1]);
    expect(g.spans).toEqual([
      { chain: 0, c0: 0, c1: 10 },
      { chain: 0, c0: 10, c1: 20 },
    ]);
    expect(g.visited).toEqual(["A", "B", "C", "B"]);
  });

  it("after Undo of the only walk over a run, that run is not gold", () => {
    // Walk A-B, then Undo: replay([]) - no taps, no gold.
    expect(gold([0]).spans).toHaveLength(1);
    const undone = gold([], []);
    expect(undone.spans).toEqual([]);
    expect(undone.walked.size).toBe(0);
    // Undo of a backtrack keeps the run: it was walked twice.
    expect([...gold([0, 1]).walked].sort()).toEqual([0, 1]);
  });

  it("after a restart, no run is gold", () => {
    // reset() empties the taps.
    const g = gold([], []);
    expect(g.spans).toEqual([]);
    expect(g.routes).toEqual([]);
    expect(g.traveled).toEqual([]);
  });

  it("a no-backtrack walk paints the path stack's spans", () => {
    const g = gold([0, 1, 2], [0, 1, 2]);
    expect(g.spans).toEqual([
      { chain: 0, c0: 0, c1: 10 },
      { chain: 0, c0: 10, c1: 20 },
      { chain: 1, c0: 0, c1: 8 },
    ]);
  });

  it("an in-flight first-time advance is partial; a re-walk stays full", () => {
    const e1 = EDGES[1];
    const fresh = gold([0, 1], [0, 1], 0, {
      e: e1,
      eid: 1,
      from: 10,
      to: 20,
      cur: 15,
      kind: "advance",
    });
    expect(fresh.spans).toEqual([
      { chain: 0, c0: 0, c1: 10 },
      { chain: 0, c0: 10, c1: 15 },
    ]);
    // Walk forth, back, forth again: mid re-walk the span is full.
    const again = gold([0, 1, 1, 1], [0, 1], 0, {
      e: e1,
      eid: 1,
      from: 10,
      to: 20,
      cur: 15,
      kind: "advance",
    });
    expect(again.spans).toEqual([
      { chain: 0, c0: 0, c1: 10 },
      { chain: 0, c0: 10, c1: 20 },
    ]);
    // Mid-backtrack the span is full too.
    const back = gold([0, 1, 1], [0], 0, {
      e: e1,
      eid: 1,
      from: 20,
      to: 10,
      cur: 15,
      kind: "backtrack",
    });
    expect(back.spans).toEqual([
      { chain: 0, c0: 0, c1: 10 },
      { chain: 0, c0: 10, c1: 20 },
    ]);
  });

  it("the refog epoch: gold starts at `from`", () => {
    // After a refogging catch the taps stay but the gold restarts:
    // only runs walked from `from` on count.
    const g = gold([0, 1, 2], [2], 2);
    expect([...g.walked]).toEqual([2]);
    expect(g.visited[0]).toBe("A");
  });

  it("a loop walk joins each consecutive pair, and traveled follows", () => {
    // A-B-C-D-B: four legs, five route positions, head at B again.
    const g = gold([0, 1, 2, 3], [0, 1, 2, 3]);
    expect(g.visited).toEqual(["A", "B", "C", "D", "B"]);
    expect(g.routes).toHaveLength(5);
    expect(g.traveled).toHaveLength(5);
    const flying = gold([0, 1, 2, 3], [0, 1, 2, 3], 0, {
      e: EDGES[3],
      eid: 3,
      from: 8,
      to: 16,
      cur: 12,
      kind: "advance",
    });
    // The far end of the move in flight is not traveled yet.
    expect(flying.traveled).toHaveLength(flying.routes.length - 1);
  });
});
