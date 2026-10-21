import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, runsToExit, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import {
  carryChain,
  contracted,
  cuttable,
  cutVerdict,
  distancesToExit,
  runEnds,
} from "../../src/game/cut";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { SeededRNG } from "../../src/util/random";

// K114 cut, the pure module (game/cut.ts): what can be cut, the refusal,
// the contraction and the distances.

// A hand-built walk graph: runs [va, vb, length]; ends are degree-1.
function graph(runs: Array<[string, string, number]>, start: string, exit: string): WalkGraph {
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
  runs.forEach(([va, vb, length], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2, length });
    at(va).edges.push(id);
    if (vb !== va) at(vb).edges.push(id);
  });
  for (const v of vertices.values()) v.isEnd = v.edges.length === 1;
  const distToExit = walkDistances(vertices, edges, exit);
  return { vertices, edges, start, exit, optimalLength: distToExit.get(start)!, distToExit };
}

// S-a (start tail), a-b, a-c, b-c, b-d, c-d, d-X (exit tail), b-E (a stub).
// Junctions: a (3 runs), b (4), c (3), d (3).
const RUNS: Array<[string, string, number]> = [
  ["S", "a", 1], // 0
  ["a", "b", 2], // 1
  ["a", "c", 2], // 2
  ["b", "c", 1], // 3
  ["b", "d", 3], // 4
  ["c", "d", 3], // 5
  ["d", "X", 1], // 6
  ["b", "E", 1], // 7
];

// A ring p-q-r-p off a-p, with stubs at q and r: the carry's no-loop stop.
const RING: Array<[string, string, number]> = [
  ["S", "a", 1], // 0
  ["a", "p", 1], // 1
  ["p", "q", 1], // 2
  ["q", "r", 1], // 3
  ["r", "p", 1], // 4
  ["q", "Y", 1], // 5
  ["r", "Z", 1], // 6
  ["a", "X", 1], // 7
];

function walkFor(seed: number, deadEndDensity: number): WalkGraph {
  const g = generateLatticeKnotwork({ gridSize: 8, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

const REAL = [
  [11, 0.3],
  [12, 0.6],
  [13, 0],
  [14, 1],
] as const;

describe("cut: what can be cut (K114)", () => {
  it("every maze run but the start tail, the exit tail and title runs; stubs too", () => {
    const w = graph(RUNS, "S", "X");
    expect(RUNS.map((_, eid) => cuttable(w, eid))).toEqual([false, true, true, true, true, true, false, true]);
    expect(cuttable(w, 99)).toBe(false);
    expect(cuttable({ ...w, titleEdges: new Set([1]) }, 1)).toBe(false);
    // A titled maze: the seam (mazeStart) is the maze's start, its tail is
    // the run out of the seam.
    expect(cuttable({ ...w, start: "E", mazeStart: "S" }, 0)).toBe(false);
    expect(cuttable({ ...w, start: "E", mazeStart: "S" }, 7)).toBe(true);
  });

  it("a real maze's start and exit tails are never cuttable, every junction run is", () => {
    for (const [seed, dd] of REAL) {
      const w = walkFor(seed, dd);
      for (const e of w.edges) {
        const tail = [e.va, e.vb].some((v) => v === w.start || v === w.exit);
        expect(cuttable(w, e.id)).toBe(!tail);
      }
    }
  });
});

describe("cut: refused cuts (K114)", () => {
  it("refuses a cut that leaves no route from the head to the exit", () => {
    const w = graph(RUNS, "S", "X");
    expect(cutVerdict(w, "a", new Set(), 1)).toBe("cut");
    expect(cutVerdict(w, "a", new Set([1]), 2)).toBe("refused");
    expect(cutVerdict(w, "a", new Set([4]), 5)).toBe("refused");
    // Behind the player is fine: at d, a and b are not on the way.
    expect(cutVerdict(w, "d", new Set([1]), 2)).toBe("cut");
    // Already cut, or not cuttable at all.
    expect(cutVerdict(w, "a", new Set([1]), 1)).toBe("invalid");
    expect(cutVerdict(w, "a", new Set(), 0)).toBe("invalid");
    expect(cutVerdict(w, "a", new Set(), 6)).toBe("invalid");
    // A stub never strands (it leads nowhere).
    expect(cutVerdict(w, "a", new Set(), 7)).toBe("cut");
  });

  it("random cut sequences on real mazes never strand the player", () => {
    for (const [seed, dd] of REAL) {
      const w = walkFor(seed, dd);
      const rng = new SeededRNG(seed * 7 + 1);
      const cuts = new Set<number>();
      const order = w.edges.map((e) => e.id);
      for (let i = order.length - 1; i > 0; i--) {
        const j = rng.nextInt(i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      let made = 0;
      for (const eid of order) {
        const v = cutVerdict(w, w.start, cuts, eid);
        if (v === "cut") {
          cuts.add(eid);
          made++;
        }
        const left = runsToExit(w, (r) => cuts.has(r)).get(w.start) ?? Infinity;
        expect(Number.isFinite(left)).toBe(true);
      }
      expect(made).toBeGreaterThan(0);
      // Every cut distance is at least the uncut one.
      const d = distancesToExit(w, cuts);
      for (const [v, dist] of d) expect(dist).toBeGreaterThanOrEqual(w.distToExit.get(v)! - 1e-9);
    }
  });
});

describe("cut: contraction (K114)", () => {
  it("a junction left with two live runs is contracted; ENDs, the exit and 2-run vertices never", () => {
    const w = graph(RUNS, "S", "X");
    expect(contracted(w, "c", new Set())).toBe(false);
    expect(contracted(w, "c", new Set([3]))).toBe(true);
    expect(contracted(w, "b", new Set([3]))).toBe(false); // 3 live
    expect(contracted(w, "b", new Set([3, 7]))).toBe(true);
    expect(contracted(w, "c", new Set([3, 5]))).toBe(false); // 1 live: a dead end
    expect(contracted(w, "S", new Set([1]))).toBe(false);
    expect(contracted(w, "X", new Set([4]))).toBe(false);
    // A vertex with two runs to begin with (a title seam) keeps today's way.
    const seam = graph(
      [
        ["S", "m", 1],
        ["m", "a", 1],
        ["a", "X", 1],
        ["a", "D", 1],
      ],
      "S",
      "X"
    );
    expect(contracted(seam, "m", new Set())).toBe(false);
  });

  it("counts a self-loop by its two ends", () => {
    const w = graph(
      [
        ["S", "v", 1],
        ["v", "v", 3],
        ["v", "w", 1],
        ["w", "X", 1],
        ["w", "D", 1],
      ],
      "S",
      "X"
    );
    expect(runEnds(w, "v")).toEqual([0, 1, 1, 2]);
    // Cut nothing on v: 4 ends. With 0 gone (not cuttable, but as data)
    // the loop's two ends and run 2 make three: still a decision.
    expect(contracted(w, "v", new Set([0]))).toBe(false);
    expect(contracted(w, "v", new Set([0, 2]))).toBe(true);
  });

  it("carries a move on through every contracted junction", () => {
    const w = graph(RUNS, "S", "X");
    expect(carryChain(w, new Set(), "a", 2)).toEqual([2]);
    expect(carryChain(w, new Set([3]), "a", 2)).toEqual([2, 5]);
    expect(carryChain(w, new Set([3, 7]), "a", 1)).toEqual([1, 4]);
    // Backwards (a backtrack walks the same way): d to a through c.
    expect(carryChain(w, new Set([3, 7]), "d", 5)).toEqual([5, 2]);
    // Into a stub: stops at the END.
    expect(carryChain(w, new Set([3]), "b", 7)).toEqual([7]);
    // Stops at the exit's junction when it has three live runs.
    expect(carryChain(w, new Set([3]), "c", 5)).toEqual([5]);
  });

  it("stops at a run this move already took", () => {
    const w = graph(RING, "S", "X");
    expect(carryChain(w, new Set([5, 6]), "p", 2)).toEqual([2, 3, 4]); // p decides
    expect(carryChain(w, new Set([1, 5, 6]), "p", 2)).toEqual([2, 3, 4]); // p contracted: 2 taken
  });

  it("on real mazes every chain is live, connected, through contracted vertices only", () => {
    for (const [seed, dd] of REAL) {
      const w = walkFor(seed, dd);
      const rng = new SeededRNG(seed * 13 + 5);
      const cuts = new Set<number>();
      for (const e of w.edges) if (cuttable(w, e.id) && rng.next() < 0.35) cuts.add(e.id);
      let carried = 0;
      for (const [vid, vert] of w.vertices) {
        for (const first of vert.edges) {
          if (cuts.has(first)) continue;
          const chain = carryChain(w, cuts, vid, first);
          expect(new Set(chain).size).toBe(chain.length);
          let at = vid;
          chain.forEach((r, i) => {
            expect(cuts.has(r)).toBe(false);
            const e = w.edges[r];
            expect(e.va === at || e.vb === at).toBe(true);
            if (i > 0) expect(contracted(w, at, cuts)).toBe(true);
            at = e.va === at ? e.vb : e.va;
          });
          if (chain.length > 1) carried++;
          // It ended where a move must stop: not contracted, or the next
          // run already taken.
          if (contracted(w, at, cuts)) {
            const ends = runEnds(w, at, cuts);
            const last = chain[chain.length - 1];
            const next = ends[0] === last ? ends[1] : ends[0];
            expect(chain).toContain(next);
          }
        }
      }
      expect(carried).toBeGreaterThan(0);
    }
  });
});

describe("cut: distances (K114)", () => {
  it("no cuts: the walk graph's own field; a cut lengthens what went through it", () => {
    const w = graph(RUNS, "S", "X");
    expect(distancesToExit(w, new Set())).toBe(w.distToExit);
    const d = distancesToExit(w, new Set([5]));
    expect(w.distToExit.get("c")).toBe(4); // c-d-X
    expect(d.get("c")).toBe(5); // c-b-d-X
    expect(d.get("b")).toBe(4);
    expect(w.distToExit).not.toBe(d);
    expect(w.distToExit.get("c")).toBe(4); // untouched
  });

  it("walkDistances skips the removed runs", () => {
    const w = graph(RUNS, "S", "X");
    const d = walkDistances(w.vertices, w.edges, "X", new Set([4, 5]));
    expect(d.get("c")).toBe(Infinity);
    expect(d.get("d")).toBe(1);
  });
});

// The controller's side: the action log, cut(), replayActions, the carry.
const on = (w: WalkGraph): FabricMazeController => new FabricMazeController(w, false, null, { cut: "on" });

// A random game of moves and cut attempts, carries driven as main.ts does.
function play(c: FabricMazeController, rng: SeededRNG, steps: number): void {
  for (let i = 0; i < steps && !c.solved; i++) {
    if (c.cutOn && rng.next() < 0.3) {
      c.cut(rng.nextInt(c.walk.edges.length));
      continue;
    }
    const ch = c.choices();
    if (ch.length === 0) break;
    c.tapEdge(ch[rng.nextInt(ch.length)]);
    while (c.carry.length > 0) expect(c.tapEdge(c.carry[0])).not.toBe("reject");
  }
}

function state(c: FabricMazeController): unknown {
  return {
    taps: [...c.taps],
    moveLog: [...c.moveLog],
    path: [...c.pathEdges],
    head: c.head,
    cuts: c.cutRuns(),
    actions: c.actions.map((a) => `${a.kind}${a.run}`),
    walked: c.walkedDist,
    solved: c.solved,
    dist: [...c.distToExit],
  };
}

describe("cut: the controller (K114)", () => {
  it("cut off changes nothing: no cuts, one move action per tap", () => {
    for (const [seed, dd] of REAL) {
      const w = walkFor(seed, dd);
      const off = new FabricMazeController(w, false, null, {});
      expect(off.cutOn).toBe(false);
      const eid = w.edges.findIndex((e) => cuttable(w, e.id));
      expect(off.cut(eid)).toBe("invalid");
      play(off, new SeededRNG(seed), 60);
      expect(off.actions).toEqual(off.taps.map((run) => ({ kind: "move", run })));
      expect(off.distToExit).toBe(w.distToExit);
      // Cut on with nothing cut plays the same game.
      const same = on(w);
      for (const t of off.taps) same.tapEdge(t);
      expect(state(same)).toEqual(state(off));
    }
  });

  it("cuts only with fragile, par and collapse off", () => {
    const w = graph(RUNS, "S", "X");
    expect(on(w).cutOn).toBe(true);
    expect(new FabricMazeController(w, false, null, { cut: "on", fragile: "snap" }).cutOn).toBe(false);
    expect(new FabricMazeController(w, false, null, { cut: "on", parMode: "strict" }).cutOn).toBe(false);
    expect(new FabricMazeController(w, false, null, { cut: "on", collapse: "finish" }).cutOn).toBe(false);
  });

  it("a refused cut changes nothing; a cut run is gone", () => {
    const c = on(graph(RUNS, "S", "X"));
    c.tapEdge(0);
    expect(c.cut(1)).toBe("cut");
    expect(c.cut(2)).toBe("refused");
    expect(c.cut(1)).toBe("invalid");
    expect(c.actions).toEqual([
      { kind: "move", run: 0 },
      { kind: "cut", run: 1 },
    ]);
    expect(c.broken(1)).toBe(true);
    expect(c.choices()).toEqual([0, 2]);
    expect(c.tapEdge(1)).toBe("reject");
    expect(c.cutCount).toBe(1);
  });

  it("a contracted move carries on, and undone returns to the junction it started from", () => {
    const c = on(graph(RUNS, "S", "X"));
    c.tapEdge(0);
    expect(c.cut(3)).toBe("cut"); // c is left with a-c and c-d
    expect(c.tapEdge(2)).toBe("advance");
    expect(c.carry).toEqual([5]);
    // Mid-carry: no other run, no cut.
    expect(c.tapEdge(2)).toBe("reject");
    expect(c.cut(4)).toBe("invalid");
    expect(c.tapEdge(5)).toBe("advance");
    expect(c.head).toBe("d");
    expect(c.carry).toEqual([]);
    expect(c.taps).toEqual([0, 2, 5]);
    expect(c.moveLog.length).toBe(3);
    expect(c.actions.map((a) => a.kind)).toEqual(["move", "cut", "move"]);
    // Back the same way: a backtrack carries on too.
    expect(c.tapEdge(5)).toBe("backtrack");
    expect(c.carry).toEqual([2]);
    expect(c.tapEdge(2)).toBe("backtrack");
    expect(c.head).toBe("a");
    // Undo the backtrack, then the move: back at a, the cut kept.
    expect(c.replayActions(c.actions.slice(0, -1))).toBe(true);
    expect(c.head).toBe("d");
    expect(c.replayActions(c.actions.slice(0, -1))).toBe(true);
    expect(c.head).toBe("a");
    expect(c.taps).toEqual([0]);
    expect(c.cutRuns()).toEqual([3]);
  });

  it("a cut undone restores the run and the distances", () => {
    const w = graph(RUNS, "S", "X");
    const c = on(w);
    c.tapEdge(0);
    expect(c.cut(5)).toBe("cut");
    expect(c.distToExit.get("c")).toBe(5);
    expect(c.broken(5)).toBe(true);
    expect(c.replayActions(c.actions.slice(0, -1))).toBe(true);
    expect(c.cutRuns()).toEqual([]);
    expect(c.broken(5)).toBe(false);
    expect(c.distToExit).toBe(w.distToExit);
    expect(c.head).toBe("a");
  });

  it("the move log reads the live distances", () => {
    const c = on(graph(RUNS, "S", "X"));
    c.tapEdge(0);
    // Uncut, a-b (2) + b-d (3) = 5 against a-c-d's 5: both shortest.
    // Cut c-d: a-b-d is the only way, a-c is a detour.
    c.cut(5);
    c.tapEdge(2);
    expect(c.moveLog[c.moveLog.length - 1]).toBe("d");
  });

  it("replayActions rebuilds every game; a bad list resets", () => {
    for (const [seed, dd] of REAL) {
      const w = walkFor(seed, dd);
      for (let k = 0; k < 4; k++) {
        const c = on(w);
        play(c, new SeededRNG(seed * 31 + k), 80);
        expect(c.moveLog.length).toBe(c.taps.length);
        expect(c.taps.length).toBeGreaterThanOrEqual(c.actions.filter((a) => a.kind === "move").length);
        const r = on(w);
        expect(r.replayActions(c.actions)).toBe(true);
        expect(state(r)).toEqual(state(c));
        // Never stranded by cuts.
        if (!c.solved) expect(Number.isFinite(c.runsLeft)).toBe(true);
      }
    }
    const c = on(graph(RUNS, "S", "X"));
    expect(c.replayActions([{ kind: "move", run: 3 }])).toBe(false);
    expect(c.taps).toEqual([]);
    expect(c.replayActions([{ kind: "cut", run: 0 }])).toBe(false);
    expect(c.cutRuns()).toEqual([]);
  });
});
