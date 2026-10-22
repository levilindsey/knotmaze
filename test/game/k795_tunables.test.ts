// K795 (brief docs/design/K795.md, item 3): the four constants that became
// params - the snare's hold (snareHold, snh), the lure's range (lureRange,
// lrg), the hint's seconds (hintSeconds, hns) and the hidden runs' reveal
// distance (hiddenReveal, hrv). A param only replaces its constant: the
// default is the constant, the readers clamp to the row's range, and a
// default design's turn config is what it was.
import { describe, expect, it } from "vitest";
import { walkDistances } from "../../src/core/walk_graph";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { HINT_SECONDS, HINT_SECONDS_MAX, HINT_SECONDS_MIN, hintSecondsOf } from "../../src/game/hints";
import {
  REVEAL_RUNS,
  REVEAL_RUNS_MAX,
  REVEAL_RUNS_MIN,
  revealedBy,
  revealRunsOf,
} from "../../src/game/hidden_runs";
import { LURE_RANGE, LURE_RANGE_MAX, LURE_RANGE_MIN, lureRangeOf, lureTarget } from "../../src/game/lures";
import { DEFAULT_TURN_MINO, turnConfig, TurnGraph, TurnMinotaur, turnSeed } from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";
import type { RuleWalk } from "../../src/game/rule_search";
import {
  holdTurn,
  SNARE_HOLD,
  SNARE_HOLD_MAX,
  SNARE_HOLD_MIN,
  snareHoldOf,
  springSnare,
} from "../../src/game/snares";
import type { Snare } from "../../src/game/snares";
import { PARAM_RANGES } from "../../src/ui/param_codec";
import { PARAM_DEFAULTS, parseParams } from "../../src/ui/url_state";

// snares.test.ts's and lures.test.ts's graph: runs of length 2, a vertex
// with one run is an END.
function graph(runs: Array<[string, string]>, start: string, exit: string): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  const at = (id: string): WalkVertex => {
    let v = vertices.get(id);
    if (!v) {
      v = { id, isEnd: false, chain: 0, ctrl: 0, edges: [] };
      vertices.set(id, v);
    }
    return v;
  };
  runs.forEach(([va, vb], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2, length: 2 });
    at(va).edges.push(id);
    if (vb !== va) at(vb).edges.push(id);
  });
  for (const v of vertices.values()) v.isEnd = v.edges.length === 1;
  const distToExit = walkDistances(vertices, edges, exit);
  return { vertices, edges, start, exit, optimalLength: distToExit.get(start)!, distToExit };
}

const STALK: TurnMinoParams = { ...DEFAULT_TURN_MINO, model: "stalker", accuracy: 1, pause: 0, sleep: 0 };

function play(t: TurnMinotaur, edge: number): string {
  const r = t.turn(edge);
  t.setProgress(1);
  return r;
}

describe("K795: the tunables' params", () => {
  it("default to their constants and read as the row's range", () => {
    expect([SNARE_HOLD, LURE_RANGE, HINT_SECONDS, REVEAL_RUNS]).toEqual([3, 6, 2, 3]);
    expect(PARAM_DEFAULTS.snareHold).toBe(SNARE_HOLD);
    expect(PARAM_DEFAULTS.lureRange).toBe(LURE_RANGE);
    expect(PARAM_DEFAULTS.hintSeconds).toBe(HINT_SECONDS);
    expect(PARAM_DEFAULTS.hiddenReveal).toBe(REVEAL_RUNS);
    expect(PARAM_RANGES.snareHold).toEqual([SNARE_HOLD_MIN, SNARE_HOLD_MAX]);
    expect(PARAM_RANGES.lureRange).toEqual([LURE_RANGE_MIN, LURE_RANGE_MAX]);
    expect(PARAM_RANGES.hintSeconds).toEqual([HINT_SECONDS_MIN, HINT_SECONDS_MAX]);
    expect(PARAM_RANGES.hiddenReveal).toEqual([REVEAL_RUNS_MIN, REVEAL_RUNS_MAX]);
    // Whole turns and runs; the hint keeps its fraction of a second.
    expect([snareHoldOf(4.6), snareHoldOf(0), snareHoldOf(99), snareHoldOf("5"), snareHoldOf(Number.NaN)])
      .toEqual([5, 1, 8, SNARE_HOLD, SNARE_HOLD]);
    expect([lureRangeOf(2.4), lureRangeOf(0), lureRangeOf(99), lureRangeOf(undefined)])
      .toEqual([2, 1, 12, LURE_RANGE]);
    expect([hintSecondsOf(1.25), hintSecondsOf(0), hintSecondsOf(99), hintSecondsOf(null)])
      .toEqual([1.25, 0.5, 10, HINT_SECONDS]);
    expect([revealRunsOf(4.5), revealRunsOf(0), revealRunsOf(99), revealRunsOf(Number.POSITIVE_INFINITY)])
      .toEqual([5, 1, 8, REVEAL_RUNS]);
  });

  it("clamps a link's values to the rows' ranges", () => {
    const p = parseParams("?7&snh=99&lrg=0&hns=0.1&hrv=99");
    expect([p.snareHold, p.lureRange, p.hintSeconds, p.hiddenReveal]).toEqual([8, 1, 0.5, 8]);
    const d = parseParams("?7");
    expect([d.snareHold, d.lureRange, d.hintSeconds, d.hiddenReveal]).toEqual([3, 6, 2, 3]);
  });

  it("sets the snare's hold and the lure's range in the turn config only off their defaults", () => {
    const base = turnConfig(DEFAULT_TURN_MINO);
    expect("snareHold" in base || "lureRange" in base).toBe(false);
    expect(turnConfig({ ...DEFAULT_TURN_MINO, snareHold: SNARE_HOLD, lureRange: LURE_RANGE })).toEqual(base);
    const tuned = turnConfig({ ...DEFAULT_TURN_MINO, snareHold: 5, lureRange: 9 });
    expect([tuned.snareHold, tuned.lureRange]).toEqual([5, 9]);
    expect(turnConfig({ ...STALK, snareHold: 1 }).snareHold).toBe(1);
  });

  it("holds a sprung snare for the param's turns", () => {
    const snares: Snare[] = [{ edge: 2, phase: "set", holder: null, left: 0 }];
    springSnare(snares[0], -1, 5);
    const held: boolean[] = [];
    for (let i = 0; i < 7; i++) held.push(holdTurn(snares, -1));
    expect(held).toEqual([true, true, true, true, true, false, false]);
    // On the turn clock (snares.test.ts's line and stalker), held 5 turns.
    const line = graph([["S", "A"], ["A", "B"], ["B", "C"], ["C", "D"], ["D", "X"]], "S", "X");
    const t = new TurnMinotaur(line, turnConfig({ ...STALK, snareHold: 5 }), turnSeed(3));
    const v = (n: string): number => t.g.index.get(n)!;
    expect(play(t, 0)).toBe("moved"); // S -> A; it X -> D.
    expect(t.setSnare(1)).toBe(true); // A-B.
    expect(play(t, -1)).toBe("moved"); // It D -> C.
    expect(play(t, -1)).toBe("moved"); // It C -> B.
    expect(play(t, -1)).toBe("moved"); // It springs the snare.
    expect(t.snares[0]).toEqual({ edge: 1, phase: "holding", holder: -1, left: 5 });
    for (let i = 0; i < 5; i++) {
      expect(play(t, -1)).toBe("moved");
      expect(t.state.v).toBe(v("B"));
    }
    expect(t.snares[0].phase).toBe("spent");
  });

  it("hears a lure within the param's runs", () => {
    // lures.test.ts's fork: S - A1 - ... - A5 - J - K - X, J - P - Q, K - R.
    const forked = graph(
      [["S", "A1"], ["A1", "A2"], ["A2", "A3"], ["A3", "A4"], ["A4", "A5"], ["A5", "J"],
        ["J", "K"], ["K", "X"], ["J", "P"], ["P", "Q"], ["K", "R"]],
      "S",
      "X"
    );
    const tg = new TurnGraph(forked);
    const v = (n: string): number => tg.chase.index.get(n)!;
    expect(lureTarget(tg, v("X"), 0)).toBe(-1); // A1 at 7 runs, S is the start.
    expect(lureTarget(tg, v("X"), 0, 7)).toBe(v("A1"));
    expect(lureTarget(tg, v("X"), 1)).toBe(v("A2")); // A2 at 6 exactly.
    expect(lureTarget(tg, v("X"), 1, 5)).toBe(-1);
    expect(lureTarget(tg, v("X"), 9, 3)).toBe(v("P")); // P at 3.
    expect(lureTarget(tg, v("X"), 9, 2)).toBe(-1);
  });

  it("reveals a hidden run within the param's runs", () => {
    // hidden_runs.test.ts's line S -0- a -1- b -2- c -3- d -4- X, with the
    // hidden run 5 moved to S-a: 4 runs from run 4.
    const names = ["S", "a", "b", "c", "d", "X"];
    const edges = [0, 1, 2, 3, 4].map((i) => ({
      id: i, va: names[i], vb: names[i + 1], chain: 0, ctrlA: 2 * i, ctrlB: 2 * i + 2, length: 1,
    }));
    edges.push({ id: 5, va: "S", vb: "a", chain: 1, ctrlA: 0, ctrlB: 2, length: 1 });
    const at = (id: string): number[] => edges.filter((e) => e.va === id || e.vb === id).map((e) => e.id);
    const far: RuleWalk = {
      vertices: new Map(
        names.map((id) => [id, { id, isEnd: id === "S" || id === "X", chain: 0, ctrl: 0, edges: at(id) }])
      ),
      edges,
      start: "S",
      exit: "X",
    };
    const note = (): number => 7;
    expect(revealedBy(far, [5], new Set(), 4, note)).toEqual([]); // REVEAL_RUNS: 3
    expect(revealedBy(far, [5], new Set(), 4, note, 4)).toEqual([5]);
    expect(revealedBy(far, [5], new Set(), 1, note, 1)).toEqual([5]); // 1 meets 5 at a
    expect(revealedBy(far, [5], new Set(), 2, note, 1)).toEqual([]);
  });
});
