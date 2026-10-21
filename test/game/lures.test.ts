import { describe, it, expect } from "vitest";
import { walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import {
  DEFAULT_TURN_MINO,
  replayTurnMinotaur,
  turnConfig,
  TurnGraph,
  TurnMinotaur,
  turnSeed,
} from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";
import { LURE_RANGE, LURES_MAX, lureTarget, luresOf } from "../../src/game/lures";
import { newSword } from "../../src/game/sword";

// K137 stage 4 (4.10, stage 3d's remainder; brief docs/design/K137_s4.md):
// lure plucks on the turn clock.

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

// S - A1 - A2 - A3 - A4 - A5 - J - K - X (the exit), with J - P - Q and
// K - R. Runs: 0 S-A1, 1 A1-A2, 2 A2-A3, 3 A3-A4, 4 A4-A5, 5 A5-J, 6 J-K,
// 7 K-X, 8 J-P, 9 P-Q, 10 K-R.
function forked(): WalkGraph {
  return graph(
    [
      ["S", "A1"],
      ["A1", "A2"],
      ["A2", "A3"],
      ["A3", "A4"],
      ["A4", "A5"],
      ["A5", "J"],
      ["J", "K"],
      ["K", "X"],
      ["J", "P"],
      ["P", "Q"],
      ["K", "R"],
    ],
    "S",
    "X"
  );
}

// An awake hunter, a best step every time, never pausing.
const AWAKE: TurnMinoParams = { ...DEFAULT_TURN_MINO, model: "hunter", accuracy: 1, pause: 0, sleep: 0 };

describe("K137 s4: lures (the pure part)", () => {
  it("reads the stock as an integer in 0..LURES_MAX", () => {
    expect(luresOf(0)).toBe(0);
    expect(luresOf(2.4)).toBe(2);
    expect(luresOf(99)).toBe(LURES_MAX);
    expect(luresOf(-3)).toBe(0);
    expect(luresOf(Number.NaN)).toBe(0);
    expect(luresOf("3")).toBe(0);
  });

  it("aims at the plucked run's nearer end, within LURE_RANGE runs, never the start or the exit", () => {
    const tg = new TurnGraph(forked());
    const v = (n: string): number => tg.chase.index.get(n)!;
    expect(LURE_RANGE).toBe(6);
    expect(lureTarget(tg, v("X"), 9)).toBe(v("P")); // P 3 runs, Q 4.
    expect(lureTarget(tg, v("X"), 1)).toBe(v("A2")); // A2 at 6 exactly.
    expect(lureTarget(tg, v("X"), 0)).toBe(-1); // A1 at 7; S is the start.
    expect(lureTarget(tg, v("J"), 7)).toBe(v("K")); // X is the exit.
    expect(lureTarget(tg, v("X"), 99)).toBe(-1);
    expect(lureTarget(tg, v("X"), -1)).toBe(-1);
  });
});

describe("K137 s4: lures on the turn clock", () => {
  it("draws the minotaur to the run and then lets its model decide", () => {
    const t = new TurnMinotaur(forked(), turnConfig(AWAKE), turnSeed(5));
    const v = (n: string): number => t.g.index.get(n)!;
    expect(t.lure(9)).toBe(1); // P-Q: it heads for P.
    expect(t.state.lure).toBe(v("P"));
    expect(t.telegraph()!.steps).toEqual([[7, v("K")]]);
    const at: number[] = [];
    for (let i = 0; i < 3; i++) {
      expect(t.turn(-1)).toBe("moved");
      at.push(t.state.v);
    }
    expect(at).toEqual([v("K"), v("J"), v("P")]);
    expect(t.state.lure).toBe(-1); // Arrived: the lure is spent.
    expect(t.lured).toBe(1);
  });

  it("goes unheard out of range, and is still used", () => {
    const t = new TurnMinotaur(forked(), turnConfig(AWAKE), turnSeed(5));
    const before = t.telegraph()!.steps;
    expect(t.lure(0)).toBe(0);
    expect(t.heardBy).toBe(0);
    expect(t.lured).toBe(1);
    expect(t.state.lure).toBeUndefined();
    expect(t.telegraph()!.steps).toEqual(before);
    expect(t.lure(-1)).toBe(-1); // A bad run is refused, not used.
    expect(t.lured).toBe(1);
  });

  it("wakes a sleeper in range and draws it too; a follower ignores it", () => {
    const t = new TurnMinotaur(forked(), turnConfig(AWAKE), turnSeed(5));
    const v = (n: string): number => t.g.index.get(n)!;
    t.setMonsters(
      [
        { kind: "sleeper", home: v("Q") },
        { kind: "follower", home: v("R") },
      ],
      5
    );
    expect(t.lure(8)).toBe(2); // J-P: the minotaur and the sleeper.
    expect(t.woken).toBe(1);
    expect(t.extras[0].phase).toBe("awake");
    expect(t.extras[0].state.lure).toBe(v("P"));
    expect(t.extras[1].phase).toBe("asleep");
    expect(t.extras[1].state.lure).toBeUndefined();
    expect(t.state.lure).toBe(v("J"));
    expect(t.turn(-1)).toBe("moved");
    expect(t.extras[0].state.v).toBe(v("P"));
    expect(t.extras[0].state.lure).toBe(-1);
  });

  it("is not heard by a minotaur fleeing the sword", () => {
    const t = new TurnMinotaur(forked(), turnConfig(AWAKE), turnSeed(5));
    const s = newSword(t.g.index.get("Q")!, "timed", 8);
    s.phase = "fleeing";
    s.left = 8;
    t.setSword(s);
    expect(t.lure(9)).toBe(0);
    expect(t.state.lure).toBeUndefined();
  });

  it("replays from the taps and the lures", () => {
    const cfg = turnConfig(AWAKE);
    const t = new TurnMinotaur(forked(), cfg, turnSeed(9));
    const v = (n: string): number => t.g.index.get(n)!;
    t.turn(0); // S -> A1.
    t.lure(9);
    t.turn(-1);
    t.turn(1); // A1 -> A2.
    t.lure(10);
    t.turn(-1);
    t.lure(2); // After the last move too.
    const r = replayTurnMinotaur(forked(), cfg, turnSeed(9), t.inputs, t.skips, null, t.tools);
    expect(r.state).toEqual(t.state);
    expect(r.tools).toEqual(t.tools);
    expect(r.lured).toBe(3);
    expect(r.telegraph()).toEqual(t.telegraph());
    expect(t.player).toBe(v("A2"));
  });

  it("leaves a game without lures untouched (no lure field at all)", () => {
    const t = new TurnMinotaur(forked(), turnConfig(AWAKE), turnSeed(5));
    for (let i = 0; i < 6; i++) t.turn(-1);
    expect("lure" in t.state).toBe(false);
    expect(t.tools).toEqual([]);
  });

  it("draws a by-length minotaur too", () => {
    const t = new TurnMinotaur(forked(), { ...turnConfig(AWAKE), byLength: true }, turnSeed(5));
    const v = (n: string): number => t.g.index.get(n)!;
    expect(t.lure(9)).toBe(1);
    const at: string[] = [];
    for (let i = 0; i < 4; i++) {
      t.turn(-1);
      at.push(t.g.ids[t.state.v]);
    }
    // A wait travels one run here: X -> K -> J -> P, and the next hop
    // (decided at P) drops the lure.
    expect(at.slice(0, 3)).toEqual(["K", "J", "P"]);
    expect(t.state.lure).toBe(-1);
    expect(v("P")).toBeGreaterThanOrEqual(0);
  });
});
