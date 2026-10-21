import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import {
  breakAfter,
  breakLimits,
  crossingCounts,
  exemptRun,
  fragileLimits,
  isBroken,
  isCracked,
  runsLeft,
  strandedAt,
} from "../../src/game/fragile";
import { SeededRNG } from "../../src/util/random";

// K137 stage 1: fragile runs (game/fragile.ts) and the controller's
// breaks, strand, replay, reset, respawn and Undo.

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
  return {
    vertices,
    edges,
    start,
    exit,
    optimalLength: distToExit.get(start)!,
    distToExit,
  };
}

// S-a (tail), a-b, b-X (tail), a-c, c-b, c-D (a dead-end stub).
// Breakable: 1, 3, 4. Exempt (an END at one end): 0, 2, 5.
const RUNS: Array<[string, string, number]> = [
  ["S", "a", 2], // 0
  ["a", "b", 3], // 1
  ["b", "X", 2], // 2
  ["a", "c", 2], // 3
  ["c", "b", 2], // 4
  ["c", "D", 1], // 5
];

function walkFor(seed: number, deadEndDensity: number): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

// The controller's whole observable state, for replay comparisons.
function state(c: FabricMazeController) {
  return {
    head: c.head,
    path: [...c.pathEdges],
    taps: [...c.taps],
    crossings: [...c.crossings],
    broken: c.brokenRuns(),
    cracked: c.crackedRuns(),
    stranded: c.stranded,
    choices: c.choices(),
    walked: c.walkedDist,
    backtrack: c.backtrackDist,
    moveLog: [...c.moveLog],
  };
}

// A random legal walk of up to `n` moves (stops when stranded or won).
function randomWalk(c: FabricMazeController, n: number, seed: number): number[] {
  const rng = new SeededRNG(seed);
  for (let i = 0; i < n; i++) {
    const ch = c.choices();
    if (ch.length === 0) break;
    const eid = ch[rng.nextInt(ch.length)];
    const r = c.tapEdge(eid);
    expect(["advance", "backtrack", "win"]).toContain(r);
    if (r === "win") break;
  }
  return [...c.taps];
}

describe("fragile runs: the rule (K137)", () => {
  it("snap breaks after one crossing, crack cracks after one and breaks after two", () => {
    expect(breakAfter("off")).toBe(Infinity);
    expect(breakAfter("snap")).toBe(1);
    expect(breakAfter("crack")).toBe(2);
    const w = graph(RUNS, "S", "X");
    const snap = fragileLimits(w, "snap");
    const crack = fragileLimits(w, "crack");
    const once = new Uint32Array([0, 1, 0, 0, 0, 0]);
    const twice = new Uint32Array([0, 2, 0, 0, 0, 0]);
    expect(isBroken(snap, once, 1)).toBe(true);
    expect(isCracked(snap, once, 1)).toBe(false);
    expect(isBroken(crack, once, 1)).toBe(false);
    expect(isCracked(crack, once, 1)).toBe(true);
    expect(isBroken(crack, twice, 1)).toBe(true);
    expect(isCracked(crack, twice, 1)).toBe(false);
    // Off: nothing ever breaks or cracks.
    const off = fragileLimits(w, "off");
    expect(isBroken(off, twice, 1)).toBe(false);
    expect(isCracked(off, twice, 1)).toBe(false);
  });

  it("never breaks a run with an END vertex, nor a title run", () => {
    const w = graph(RUNS, "S", "X");
    expect([0, 1, 2, 3, 4, 5].map((e) => exemptRun(w, e))).toEqual([
      true, false, true, false, false, true,
    ]);
    expect([...fragileLimits(w, "snap")]).toEqual([Infinity, 1, Infinity, 1, 1, Infinity]);
    const titled = { ...w, titleEdges: new Set([3]) };
    expect(exemptRun(titled, 3)).toBe(true);
    // K139's collapse: a limit of 1 on the same machinery.
    expect([...breakLimits(w, 1)]).toEqual([...fragileLimits(w, "snap")]);
  });

  it("counts crossings from a tap list and finds the strand", () => {
    const w = graph(RUNS, "S", "X");
    const lim = fragileLimits(w, "snap");
    const cr = crossingCounts(w, [0, 3, 5, 5, 4, 1]);
    expect([...cr]).toEqual([1, 1, 0, 1, 1, 2]);
    // At a: 1 and 3 are broken, so the exit is out of reach.
    expect(runsLeft(w, "a", lim, cr)).toBe(Infinity);
    expect(strandedAt(w, "a", lim, cr)).toBe(true);
    // From b the exit tail is still there.
    expect(runsLeft(w, "b", lim, cr)).toBe(1);
  });
});

describe("fragile runs: the controller (K137)", () => {
  it("snap: a run breaks behind the player and leaves the choices", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "snap" });
    expect(c.fragileOn).toBe(true);
    expect(c.tapEdge(0)).toBe("advance"); // S -> a (a tail: never breaks)
    expect(c.brokenRuns()).toEqual([]);
    expect(c.justBroke).toBe(-1);
    expect(c.tapEdge(3)).toBe("advance"); // a -> c
    expect(c.brokenRuns()).toEqual([3]);
    expect(c.justBroke).toBe(3);
    expect(c.choices().sort()).toEqual([4, 5]);
    // The run just crossed is gone: no backtrack along it.
    expect(c.tapEdge(3)).toBe("reject");
    expect(c.stranded).toBe(false);
  });

  it("crack: the first crossing cracks, the second (a backtrack) breaks", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "crack" });
    c.tapEdge(0);
    expect(c.tapEdge(1)).toBe("advance"); // a -> b
    expect(c.crackedRuns()).toEqual([1]);
    expect(c.brokenRuns()).toEqual([]);
    expect(c.justBroke).toBe(-1);
    expect(c.tapEdge(1)).toBe("backtrack"); // b -> a: the second crossing
    expect(c.brokenRuns()).toEqual([1]);
    expect(c.crackedRuns()).toEqual([]);
    expect(c.justBroke).toBe(1);
    expect(c.choices().sort()).toEqual([0, 3]);
    expect(c.tapEdge(1)).toBe("reject");
  });

  it("never breaks an END run however often it is crossed", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "snap" });
    for (let i = 0; i < 5; i++) c.tapEdge(0); // S <-> a, back and forth
    expect(c.crossings[0]).toBe(5);
    expect(c.brokenRuns()).toEqual([]);
    expect(c.choices().length).toBeGreaterThan(0);
  });

  it("strands: no route left, every tap a noop, choices empty", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "snap" });
    // S -> a -> c -> D -> c -> b -> a: 3, 4 and 1 snap; the stub's run stays.
    for (const eid of [0, 3, 5, 5, 4]) expect(c.tapEdge(eid)).not.toBe("reject");
    expect(c.stranded).toBe(false);
    expect(c.tapEdge(1)).toBe("advance");
    expect(c.head).toBe("a");
    expect(c.stranded).toBe(true);
    expect(c.runsLeft).toBe(Infinity);
    expect(c.choices()).toEqual([]);
    expect(c.tapEdge(0)).toBe("noop");
    expect(c.taps.length).toBe(6);
  });

  it("replays the breaks, and a replay of a stranded game is stranded", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "snap" });
    for (const eid of [0, 3, 5, 5, 4, 1]) c.tapEdge(eid);
    const live = state(c);
    const r = new FabricMazeController(w, false, null, { fragile: "snap" });
    expect(r.replay(c.taps)).toBe(true);
    expect(state(r)).toEqual(live);
    expect(r.stranded).toBe(true);
    // A tap list that walks a broken run fails the replay.
    expect(r.replay([0, 3, 3])).toBe(false);
  });

  it("replays random crack and snap walks on real mazes exactly", () => {
    for (const mode of ["crack", "snap"] as const) {
      for (const seed of [1, 2, 3, 7, 11]) {
        const w = walkFor(seed, 0.5);
        for (const trail of [false, true]) {
          const c = new FabricMazeController(w, trail, null, { fragile: mode });
          const taps = randomWalk(c, 60, seed * 31 + (trail ? 1 : 0));
          const live = state(c);
          const r = new FabricMazeController(w, trail, null, { fragile: mode });
          expect(r.replay(taps)).toBe(true);
          expect(state(r)).toEqual(live);
          // Every broken run was crossed its limit's worth of times.
          for (const eid of live.broken) expect(live.crossings[eid]).toBe(mode === "snap" ? 1 : 2);
        }
      }
    }
  });

  it("Undo's replay restores the move before", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "snap" });
    const taps = [0, 3, 5, 5, 4];
    for (const eid of taps) c.tapEdge(eid);
    const before = state(c);
    c.tapEdge(1);
    expect(c.stranded).toBe(true);
    // Undo: replay every tap but the last.
    expect(c.replay(c.taps.slice(0, -1))).toBe(true);
    expect(state(c)).toEqual(before);
    expect(c.stranded).toBe(false);
    // The undone move's run is whole again; the exit is reachable.
    expect(c.broken(1)).toBe(false);
    expect(c.tapEdge(2)).toBe("win");
  });

  it("reset clears the breaks; a respawn keeps them", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "snap" });
    for (const eid of [0, 3, 4]) c.tapEdge(eid);
    expect(c.brokenRuns()).toEqual([3, 4]);
    c.respawn();
    expect(c.head).toBe("S");
    expect(c.brokenRuns()).toEqual([3, 4]);
    expect(c.taps).toEqual([0, 3, 4]);
    // From the start a -> b -> X is still whole.
    expect(c.stranded).toBe(false);
    expect(c.runsLeft).toBe(3);
    c.reset();
    expect(c.brokenRuns()).toEqual([]);
    expect(c.crackedRuns()).toEqual([]);
    expect([...c.crossings].every((n) => n === 0)).toBe(true);
    expect(c.stranded).toBe(false);
    expect(c.justBroke).toBe(-1);
  });

  it("a respawn can strand: the start cut off by the breaks", () => {
    const w = graph(RUNS, "S", "X");
    const c = new FabricMazeController(w, false, null, { fragile: "snap" });
    // S -> a -> b (1 snaps) -> c (4 snaps): c still reaches X? c-a-b: 1 is
    // broken; c-b: 4 is broken. Stranded at c.
    c.tapEdge(0);
    c.tapEdge(1);
    expect(c.stranded).toBe(false);
    c.tapEdge(4);
    expect(c.stranded).toBe(true);
    // A catch puts the player back at the start: still cut off.
    c.respawn();
    expect(c.head).toBe("S");
    expect(c.stranded).toBe(true);
  });

  it("off changes nothing: no limit, no break, no strand", () => {
    const w = walkFor(3, 0.5);
    const a = new FabricMazeController(w, false, null);
    const b = new FabricMazeController(w, false, null, { fragile: "off" });
    expect(a.fragileOn).toBe(false);
    const taps = randomWalk(a, 80, 5);
    expect(b.replay(taps)).toBe(true);
    expect(b.brokenRuns()).toEqual([]);
    expect(b.stranded).toBe(false);
    expect(b.choices()).toEqual(a.choices());
  });
});
