// K137 s5: muddy runs (game/mud.ts) - placement on the fewest-moves
// route, the two-move cost in par and strokes, off = the old numbers.
import { describe, expect, it } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { fewestRoute, mudOf, placeMud } from "../../src/game/mud";
import { runsToExit, walkDistances } from "../../src/core/walk_graph";
import type { WalkEdge, WalkVertex } from "../../src/core/walk_graph";
import { mudCost } from "../../src/game/mud";
import { DEFAULT_TURN_MINO, turnConfig, TurnMinotaur, turnSeed } from "../../src/game/minotaur_turns";
import type { TurnMinoParams } from "../../src/game/minotaur_turns";

function walkFor(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

// S - A - B - C - D - X: runs 0 S-A, 1 A-B, 2 B-C, 3 C-D, 4 D-X (the
// line of snares.test.ts; a follower at A walks it behind you).
function lineGraph(): WalkGraph {
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
  const runs: Array<[string, string]> = [["S", "A"], ["A", "B"], ["B", "C"], ["C", "D"], ["D", "X"]];
  runs.forEach(([va, vb], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2, length: 2 });
    at(va).edges.push(id);
    if (vb !== va) at(vb).edges.push(id);
  });
  for (const v of vertices.values()) v.isEnd = v.edges.length === 1;
  const distToExit = walkDistances(vertices, edges, "X");
  return { vertices, edges, start: "S", exit: "X", optimalLength: distToExit.get("S")!, distToExit };
}

// A sleeping minotaur; the follower appears one move after you leave A
// and never takes a shortcut, so its steps are the trail's, in order.
const FOLLOWER_ONLY: TurnMinoParams = {
  ...DEFAULT_TURN_MINO,
  model: "hunter",
  accuracy: 1,
  pause: 0,
  sleep: 100000,
  followDelayMin: 1,
  followDelayMax: 1,
  followShortcut: 0,
};

function followerAtA(mud: ReadonlySet<number>): TurnMinotaur {
  const t = new TurnMinotaur(lineGraph(), turnConfig(FOLLOWER_ONLY), turnSeed(5));
  const v = (n: string): number => t.g.index.get(n)!;
  t.setMonsters([{ kind: "follower", home: v("A") }], 5);
  t.mud = mud;
  return t;
}

function play(t: TurnMinotaur, edge: number): string {
  const r = t.turn(edge);
  t.setProgress(1);
  return r;
}

describe("K137 s5 muddy runs", () => {
  it("mudOf clamps to 0..6", () => {
    expect(mudOf(3)).toBe(3);
    expect(mudOf(9)).toBe(6);
    expect(mudOf(-1)).toBe(0);
    expect(mudOf(NaN)).toBe(0);
  });

  it("placement: on the route, never a tail, up to the count, seeded", () => {
    const w = walkFor(7);
    const route = fewestRoute(w);
    expect(route.length).toBeGreaterThan(2);
    const mud = placeMud(w, 6, 7);
    expect(mud.length).toBeGreaterThan(0);
    expect(mud.length).toBeLessThanOrEqual(6);
    for (const eid of mud) {
      expect(route).toContain(eid);
      const e = w.edges[eid];
      expect(e.va).not.toBe(w.start);
      expect(e.vb).not.toBe(w.start);
      expect(e.va).not.toBe(w.exit);
      expect(e.vb).not.toBe(w.exit);
    }
    expect(placeMud(w, 6, 7)).toEqual(mud);
    expect(placeMud(w, 0, 7)).toEqual([]);
  });

  it("par's F counts a muddy crossing twice; off is the old F", () => {
    const w = walkFor(7);
    const mud = new Set(placeMud(w, 3, 7));
    expect(mud.size).toBeGreaterThan(0);
    const plain = runsToExit(w).get(w.start)!;
    const weighted = runsToExit(w, undefined, mudCost(mud)).get(w.start)!;
    // Every route run is muddy-checked: the weighted fewest is the plain
    // fewest plus one per muddy run on the best moves route (>= plain).
    expect(weighted).toBeGreaterThanOrEqual(plain);
    const cOff = new FabricMazeController(w, false, null, { mud: 0 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(cOff.mudRuns.size).toBe(0);
    expect(cOff.fewestRuns).toBe(plain);
    const cOn = new FabricMazeController(w, false, null, { mud: 3 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(cOn.mudRuns.size).toBe(mud.size);
    expect(cOn.fewestRuns).toBe(weighted);
  });

  it("a muddy crossing counts two strokes; other taps count one", () => {
    const w = walkFor(7);
    const c = new FabricMazeController(w, false, null, { mud: 6 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(c.mudRuns.size).toBeGreaterThan(0);
    // Walk the route; strokes = taps + one extra per muddy tap.
    let guard = 0;
    while (!c.solved && guard++ < 200) {
      const route = fewestRoute(w);
      // Tap the next route run at the head (advance or backtrack).
      const head = c.head;
      const next = c
        .choices()
        .find((eid) => route.includes(eid));
      if (next === undefined) break;
      void head;
      const before = c.strokes;
      const muddy = c.mudRuns.has(next);
      expect(c.tapEdge(next)).not.toBe("reject");
      expect(c.strokes).toBe(before + (muddy ? 2 : 1));
    }
    expect(c.taps.length).toBeGreaterThan(0);
  });

  it("a K138 rule turns mud off (par stays tap-rated)", () => {
    const w = walkFor(7);
    const c = new FabricMazeController(w, false, null, { mud: 4, ice: 0.25 }, { seed: 7, cont: () => new Int32Array(10000) });
    expect(c.mudCount).toBe(0);
    expect(c.mudRuns.size).toBe(0);
  });
});
describe("K137 s5 muddy monsters", () => {
  it("mudStep finds the first muddy step", async () => {
    const { mudStep } = await import("../../src/game/mud");
    expect(mudStep(new Set([2]), [[0, 1], [2, 3], [1, 2]])).toBe(1);
    expect(mudStep(new Set([9]), [[0, 1]])).toBe(-1);
    expect(mudStep(new Set(), [[0, 1]])).toBe(-1);
  });

  it("the turn minotaur spends the turn after a muddy crossing standing", async () => {
    const { TurnMinotaur, turnConfig, DEFAULT_TURN_MINO, turnSeed } =
      await import("../../src/game/minotaur_turns");
    const { SeededRNG } = await import("../../src/util/random");
    const w = walkFor(11);
    const t = new TurnMinotaur(
      w,
      turnConfig({ ...DEFAULT_TURN_MINO, model: "hunter", speed: "two", telegraph: true }),
      turnSeed(11)
    );
    // Every run muddy: any crossing costs the next turn.
    t.mud = new Set(w.edges.map((e) => e.id));
    const rng = new SeededRNG(99);
    let crossed = 0;
    let stood = 0;
    let prevCrossed = false;
    for (let i = 0; i < 160; i++) {
      const beforeV = t.state.v;
      const runs = t.g.adj[t.player];
      const e = rng.next() < 0.15 ? -1 : runs[rng.nextInt(runs.length)];
      const r = t.turn(e);
      if (prevCrossed && r !== "caught" && r !== "win") {
        expect(t.state.v).toBe(beforeV);
        stood++;
      }
      prevCrossed = r !== "caught" && t.lastPath.length > 0;
      if (prevCrossed) crossed++;
      if (r === "win") break;
    }
    expect(crossed).toBeGreaterThan(0);
    expect(stood).toBeGreaterThan(0);
  });

  it("the real-time chase crosses a muddy run at half speed", async () => {
    const { MinotaurChase, DEFAULT_CHASE_PARAMS, CHASE_HZ } =
      await import("../../src/game/minotaur");
    const w = walkFor(7);
    const mk = (muddy: boolean) => {
      const sim = new MinotaurChase(
        w,
        { ...DEFAULT_CHASE_PARAMS, wake: 1, paceJitter: 0, pauseChance: 0 },
        7
      );
      if (muddy) sim.mud = new Set(w.edges.map((e) => e.id));
      return sim;
    };
    const plain = mk(false);
    const mud = mk(true);
    // Step until the plain chase is on its first leg, then a few ticks
    // more: both are on that same leg, the muddy one behind.
    for (let i = 0; i < CHASE_HZ * 5 && plain.mino.edge < 0; i++) {
      plain.advance(1 / CHASE_HZ);
      mud.advance(1 / CHASE_HZ);
    }
    expect(plain.mino.edge).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 10; i++) {
      plain.advance(1 / CHASE_HZ);
      mud.advance(1 / CHASE_HZ);
    }
    expect(mud.mino.edge).toBe(plain.mino.edge);
    expect(mud.mino.dir).toBe(plain.mino.dir);
    if (plain.mino.dir > 0) expect(mud.mino.pos).toBeLessThan(plain.mino.pos);
    else expect(mud.mino.pos).toBeGreaterThan(plain.mino.pos);
  });

  it("a waiting follower's first step over mud pays the mud turn (K782)", () => {
    const t = followerAtA(new Set([1])); // A-B is muddy.
    const v = (n: string): number => t.g.index.get(n)!;
    expect(play(t, 0)).toBe("moved"); // S -> A; passing does not wake it.
    expect(t.extras[0].phase).toBe("asleep");
    expect(play(t, 1)).toBe("moved"); // A -> B; the follower sets off.
    expect(t.extras[0].phase).toBe("waiting");
    expect(play(t, 2)).toBe("moved"); // B -> C; its first step crosses A-B.
    expect(t.extras[0].phase).toBe("awake");
    expect(t.extras[0].state.v).toBe(v("B")); // It crosses, to the far end.
    expect(t.extras[0].lastPath).toEqual([[1, v("B")]]);
    expect(t.extras[0].state.mudWait).toBe(true); // And owes the mud turn.
    expect(play(t, 3)).toBe("moved"); // C -> D; it spends the turn in the mud.
    expect(t.extras[0].state.v).toBe(v("B"));
    expect(t.extras[0].lastPath).toEqual([]);
    expect(t.extras[0].state.mudWait).toBe(false);
    expect(play(t, -1)).toBe("moved"); // It walks on along the trail.
    expect(t.extras[0].state.v).toBe(v("C"));
    expect(t.extras[0].lastPath).toEqual([[2, v("C")]]);
  });

  it("an awake follower pays the mud the same way (K782)", () => {
    const t = followerAtA(new Set([2])); // B-C is muddy.
    const v = (n: string): number => t.g.index.get(n)!;
    expect(play(t, 0)).toBe("moved"); // S -> A.
    expect(play(t, 1)).toBe("moved"); // A -> B; the follower sets off.
    expect(play(t, 2)).toBe("moved"); // B -> C; it wakes over clean A-B.
    expect(t.extras[0].state.v).toBe(v("B"));
    expect(t.extras[0].state.mudWait).toBeFalsy();
    expect(play(t, 3)).toBe("moved"); // C -> D; awake, it crosses B-C's mud.
    expect(t.extras[0].state.v).toBe(v("C"));
    expect(t.extras[0].lastPath).toEqual([[2, v("C")]]);
    expect(t.extras[0].state.mudWait).toBe(true);
    expect(play(t, -1)).toBe("moved"); // It spends the next turn in the mud.
    expect(t.extras[0].state.v).toBe(v("C"));
    expect(t.extras[0].lastPath).toEqual([]);
    expect(t.extras[0].state.mudWait).toBe(false);
  });

  it("a snare on the muddy run cuts a waiting follower's first step first (K782)", () => {
    const t = followerAtA(new Set([1])); // A-B is muddy.
    const v = (n: string): number => t.g.index.get(n)!;
    expect(play(t, 0)).toBe("moved"); // S -> A.
    expect(play(t, 1)).toBe("moved"); // A -> B; the follower sets off.
    expect(t.extras[0].phase).toBe("waiting");
    expect(t.setSnare(1)).toBe(true); // A-B, laid from B.
    expect(play(t, 2)).toBe("moved"); // B -> C; its first step meets the snare.
    expect(t.extras[0].phase).toBe("awake");
    expect(t.extras[0].state.v).toBe(v("A")); // Cut at the near end: no step.
    expect(t.extras[0].lastPath).toEqual([]);
    expect(t.extras[0].state.mudWait).toBeFalsy(); // No mud cut on a snare cut.
    expect(t.snares[0].phase).toBe("holding");
    expect(t.snares[0].holder).toBe(0);
  });
});
