import { describe, it, expect } from "vitest";
import { walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import {
  DEFAULT_TURN_MINO,
  replayTurnMinotaur,
  turnConfig,
  TurnMinotaur,
  turnSeed,
} from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";
import {
  canSnare,
  holdTurn,
  releaseSnares,
  SNARE_HOLD,
  snareCut,
  snareRuns,
  snaresOf,
  SNARES_MAX,
  springSnare,
  type Snare,
} from "../../src/game/snares";

// K137 stage 4 (4.30, stage 3d's remainder; brief docs/design/K137_s4.md):
// snares on the turn clock.

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

// S - A - B - C - D - X: runs 0 S-A, 1 A-B, 2 B-C, 3 C-D, 4 D-X.
function line(): WalkGraph {
  return graph(
    [
      ["S", "A"],
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
      ["D", "X"],
    ],
    "S",
    "X"
  );
}

// A stalker that takes the best step every time it sees you.
const STALK: TurnMinoParams = { ...DEFAULT_TURN_MINO, model: "stalker", accuracy: 1, pause: 0, sleep: 0 };

function play(t: TurnMinotaur, edge: number): string {
  const r = t.turn(edge);
  t.setProgress(1);
  return r;
}

describe("K137 s4: snares (the pure part)", () => {
  it("reads the stock as an integer in 0..SNARES_MAX", () => {
    expect(snaresOf(0)).toBe(0);
    expect(snaresOf(1.6)).toBe(2);
    expect(snaresOf(9)).toBe(SNARES_MAX);
    expect(snaresOf(-1)).toBe(0);
    expect(snaresOf(undefined)).toBe(0);
  });

  it("lays only on a run touching the head's junction, one snare a run", () => {
    const ea = [0, 1, 2, 3];
    const eb = [1, 2, 3, 1];
    expect(snareRuns(ea, eb, 1)).toEqual([0, 1, 3]);
    const snares: Snare[] = [];
    expect(canSnare(snares, ea, eb, 1, 2)).toBe(false); // 2-3 misses 1.
    expect(canSnare(snares, ea, eb, 1, 9)).toBe(false);
    expect(canSnare(snares, ea, eb, 1, 3)).toBe(true);
    snares.push({ edge: 3, phase: "spent", holder: null, left: 0 });
    expect(canSnare(snares, ea, eb, 1, 3)).toBe(false); // Even spent.
  });

  it("cuts a path at its first step onto a set snare, and holds for SNARE_HOLD turns", () => {
    const snares: Snare[] = [
      { edge: 5, phase: "spent", holder: null, left: 0 },
      { edge: 2, phase: "set", holder: null, left: 0 },
    ];
    expect(snareCut(snares, [[5, 1], [4, 2], [2, 3]])).toEqual({ step: 2, snare: 1 });
    expect(snareCut(snares, [[5, 1]])).toBeNull();
    springSnare(snares[1], -1);
    expect(SNARE_HOLD).toBe(3);
    const held: boolean[] = [];
    for (let i = 0; i < 5; i++) held.push(holdTurn(snares, -1));
    expect(held).toEqual([true, true, true, false, false]);
    expect(snares[1].phase).toBe("spent");
    snares.push({ edge: 7, phase: "set", holder: null, left: 0 });
    springSnare(snares[2], 0);
    expect(holdTurn(snares, -1)).toBe(false); // Another monster's.
    releaseSnares(snares, 0);
    expect(snares[2].phase).toBe("spent");
    expect(holdTurn(snares, 0)).toBe(false);
  });
});

describe("K137 s4: snares on the turn clock", () => {
  it("stops the minotaur at the run's near end and holds it there", () => {
    const t = new TurnMinotaur(line(), turnConfig(STALK), turnSeed(3));
    const v = (n: string): number => t.g.index.get(n)!;
    expect(play(t, 0)).toBe("moved"); // S -> A; it X -> D.
    expect(t.setSnare(2)).toBe(false); // B-C misses A.
    expect(t.setSnare(1)).toBe(true); // A-B.
    expect(t.setSnare(1)).toBe(false); // One a run.
    expect(play(t, -1)).toBe("moved"); // It D -> C.
    expect(play(t, -1)).toBe("moved"); // It C -> B.
    expect(t.state.v).toBe(v("B"));
    // Its next step is onto the snare: the telegraph shows it stopping.
    expect(t.telegraph()!.steps).toEqual([]);
    expect(t.snares[0].phase).toBe("set");
    expect(play(t, -1)).toBe("moved"); // It springs it.
    expect(t.snares[0]).toEqual({ edge: 1, phase: "holding", holder: -1, left: SNARE_HOLD });
    expect(t.heldBySnare(-1)).toBe(true);
    for (let i = 0; i < SNARE_HOLD; i++) {
      expect(t.telegraph()!.steps).toEqual([]);
      expect(play(t, -1)).toBe("moved");
      expect(t.state.v).toBe(v("B"));
    }
    expect(t.snares[0].phase).toBe("spent");
    expect(t.heldBySnare(-1)).toBe(false);
    expect(t.telegraph()!.steps).toEqual([[1, v("A")]]);
    expect(play(t, -1)).toBe("caught"); // Free again, it comes on.
  });

  it("still catches you if you walk onto it while it is held", () => {
    const t = new TurnMinotaur(line(), turnConfig(STALK), turnSeed(3));
    play(t, 0);
    t.setSnare(1);
    play(t, -1);
    play(t, -1);
    play(t, -1); // Sprung at B.
    expect(t.heldBySnare(-1)).toBe(true);
    expect(play(t, 1)).toBe("caught"); // A -> B, onto it.
    // The catch sends it home and spends the snare.
    expect(t.snares[0].phase).toBe("spent");
    expect(t.heldBySnare(-1)).toBe(false);
  });

  it("holds a sleeper the same way (a lure brings it)", () => {
    // The minotaur sleeps the whole test; a sleeper at D.
    const t = new TurnMinotaur(line(), turnConfig({ ...STALK, sleep: 100 }), turnSeed(3));
    const v = (n: string): number => t.g.index.get(n)!;
    t.setMonsters([{ kind: "sleeper", home: v("D") }], 3);
    play(t, 0); // S -> A.
    expect(t.setSnare(1)).toBe(true); // A-B.
    expect(t.lure(1)).toBe(2); // Both hear it; the sleeper wakes for B.
    expect(t.extras[0].phase).toBe("awake");
    play(t, -1); // It D -> C.
    play(t, -1); // It C -> B: the lure is spent.
    expect(t.extras[0].state.v).toBe(v("B"));
    play(t, -1); // It hunts you over A-B: sprung at B.
    expect(t.snares[0]).toEqual({ edge: 1, phase: "holding", holder: 0, left: SNARE_HOLD });
    expect(t.heldBySnare(0)).toBe(true);
    for (let i = 0; i < SNARE_HOLD; i++) expect(play(t, -1)).toBe("moved");
    expect(t.extras[0].state.v).toBe(v("B"));
    expect(t.snares[0].phase).toBe("spent");
    expect(play(t, -1)).toBe("caught");
    expect(t.lastCatcher).toBe(0);
  });

  it("replays from the taps and the snares", () => {
    const cfg = turnConfig(STALK);
    const t = new TurnMinotaur(line(), cfg, turnSeed(3));
    play(t, 0);
    t.setSnare(1);
    for (let i = 0; i < 4; i++) play(t, -1);
    const r = replayTurnMinotaur(line(), cfg, turnSeed(3), t.inputs, t.skips, null, t.tools);
    expect(r.state).toEqual(t.state);
    expect(r.snares).toEqual(t.snares);
    expect(r.tools).toEqual(t.tools);
  });

  it("is refused by length (a residual)", () => {
    const t = new TurnMinotaur(line(), { ...turnConfig(STALK), byLength: true }, turnSeed(3));
    play(t, 0);
    expect(t.setSnare(1)).toBe(false);
    expect(t.tools).toEqual([]);
  });
});
