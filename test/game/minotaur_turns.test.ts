import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import {
  contact,
  decide,
  DEFAULT_TURN_MINO,
  initMino,
  mix32,
  telegraphOn,
  turnConfig,
  TurnGraph,
  turnMinoDefaults,
  TurnMinotaur,
  TurnRng,
  turnSeed,
  TURN_MODEL_DEFAULTS,
} from "../../src/game/minotaur_turns";
import type { TurnConfig, TurnMinoParams, TurnStep } from "../../src/game/minotaur_turns";
import { undoAllowed } from "../../src/game/minotaur";
import { SeededRNG } from "../../src/util/random";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";

// K80 turns stage 1: the turn-aligned minotaur (src/game/minotaur_turns.ts).

// A walk graph from [va, vb, length] runs; a degree-1 vertex is an END.
function graph(runs: [string, string, number][], start: string, exit: string): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  runs.forEach(([va, vb, length], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2 * Math.max(1, Math.round(length)), length });
    for (const v of va === vb ? [va] : [va, vb]) {
      if (!vertices.has(v)) {
        vertices.set(v, { id: v, isEnd: false, chain: id, ctrl: 0, edges: [] });
      }
      vertices.get(v)!.edges.push(id);
    }
  });
  for (const v of vertices.values()) {
    const e = edges[v.edges[0]];
    v.isEnd = v.edges.length === 1 && e.va !== e.vb;
  }
  return { vertices, edges, start, exit, optimalLength: 0, distToExit: new Map() };
}

// S (entrance) -0- A -1- B -2- C -3- X (exit), a dead end B -4- D, and a
// long loop A -5- C. Vertex indices: S 0, A 1, B 2, C 3, X 4, D 5.
const G1 = graph(
  [
    ["S", "A", 5],
    ["A", "B", 10],
    ["B", "C", 10],
    ["C", "X", 5],
    ["B", "D", 8],
    ["A", "C", 30],
  ],
  "S",
  "X"
);
const [S, A, B, C, X, D] = [0, 1, 2, 3, 4, 5];

function realMaze(seed: number): WalkGraph {
  const g = generateLatticeKnotwork({ gridSize: 10, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: DEAD_END_DENSITY_ON });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return buildWalkGraph(g)!;
}

const params = (over: Partial<TurnMinoParams> = {}): TurnMinoParams => ({
  ...DEFAULT_TURN_MINO,
  model: "hunter",
  ...over,
});

// A random legal tap (a run at the player's vertex), or a wait.
function randomTap(t: TurnMinotaur, rng: SeededRNG, waitChance = 0.1): number {
  if (rng.next() < waitChance) return -1;
  const runs = t.g.adj[t.player];
  return runs[rng.nextInt(runs.length)];
}

// One whole game for the pin (TurnMinotaur "plays the pinned games"): the
// scripted player's taps against a minotaur seeded as main.ts seeds it.
function turnGame(walk: WalkGraph, p: TurnMinoParams, maze: number, walkSeed: number): string {
  const t = new TurnMinotaur(walk, turnConfig(p), turnSeed(maze));
  const rng = new SeededRNG(walkSeed * 7919 + maze);
  let h = 0x811c9dc5;
  const mix = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  };
  for (let i = 0; i < 300 && !t.finished; i++) {
    const v = t.player;
    const runs = t.g.adj[v];
    let e = -1;
    if (rng.next() >= 1 / 6) {
      const d = t.tg.hopd(v, t.tg.exit);
      const toward = runs.filter((r) => t.tg.hopd(t.tg.other(r, v), t.tg.exit) < d);
      const pool = toward.length > 0 && rng.next() < 0.4 ? toward : runs;
      e = pool[rng.nextInt(pool.length)];
    }
    const r = t.turn(e);
    t.setProgress(1);
    mix(`${e}|${r}|${t.player}|${t.state.v}|${t.mode}|${t.lastPath.map((s) => s.join(",")).join(";")}/`);
  }
  const won = t.finished ? "W" : "-";
  return `${t.turns}/${t.catches}/${t.closeCalls}/${t.seen}/${won}/${h.toString(16)}`;
}

describe("contact (the continuous rule)", () => {
  it("catches on the same end vertex", () => {
    expect(contact(A, 1, B, C, [[2, B]])).toBe(true);
  });
  it("catches head-on on one run, in either half of a two-run turn", () => {
    expect(contact(A, 1, B, B, [[1, A]])).toBe(true);
    expect(contact(A, 1, B, C, [[2, B], [1, A]])).toBe(true);
  });
  it("catches a player arriving where it stands", () => {
    expect(contact(A, 1, B, B, [])).toBe(true);
  });
  it("lets a player step onto the junction it leaves by another run", () => {
    expect(contact(A, 1, B, B, [[2, C]])).toBe(false);
  });
  it("lets a player leave the junction it steps onto", () => {
    expect(contact(B, 2, C, A, [[1, B]])).toBe(false);
  });
  it("lets two pass on different runs", () => {
    expect(contact(A, 5, C, C, [[2, B], [1, A]])).toBe(false);
    expect(contact(A, 5, C, C, [[5, A]])).toBe(true); // the same run: head-on
  });
  it("catches a waiting player wherever its path touches them", () => {
    expect(contact(B, -1, B, C, [[2, B]])).toBe(true);
    expect(contact(B, -1, B, C, [[2, B], [1, A]])).toBe(true);
    expect(contact(A, -1, A, B, [[2, C]])).toBe(false);
    expect(contact(A, -1, A, A, [])).toBe(true);
  });
});

describe("the counter RNG", () => {
  it("is a pure function of (seed, turn, call)", () => {
    const r = new TurnRng(1234);
    const a = [r.at(5).next(), r.next(), r.next()];
    r.at(9).next();
    const b = [r.at(5).next(), r.next(), r.next()];
    expect(b).toEqual(a);
    expect(new TurnRng(1235).at(5).next()).not.toBe(a[0]);
    for (const v of a) expect(v >= 0 && v < 1).toBe(true);
    expect(mix32(0)).toBe(0);
    expect(turnSeed(42)).toBe((42 ^ 0x5455524e) >>> 0);
  });
});

describe("params to config", () => {
  it("gives the research's hunter and guard, retuned (stage 2: sight 2, accuracy 0.3)", () => {
    const hunter = turnConfig(params());
    expect(hunter).toMatchObject({ policy: "prox", speed: 1, telegraph: true, q: 0.3, stall: 0.1, see: 2, lose: 5, rMin: 3, rMax: 8, sleep: 0 });
    expect(hunter.home).toBeUndefined();
    expect(hunter.chaseSpeed).toBeUndefined();
    const guard = turnConfig(params({ model: "guard" }));
    expect(guard).toMatchObject({ policy: "prox", home: true, rMin: 1, rMax: 6, see: 2, lose: 5 });
    expect(turnConfig(params({ model: "stalker" })).policy).toBe("chase");
    expect(turnConfig(params({ roam: 2 }))).toMatchObject({ rMin: 2, rMax: 2 });
  });
  it("forces the telegraph on at two runs a move and for a charge (section 2.6)", () => {
    expect(telegraphOn({ telegraph: false, speed: "one" })).toBe(false);
    expect(telegraphOn({ telegraph: false, speed: "half" })).toBe(false);
    expect(telegraphOn({ telegraph: false, speed: "two" })).toBe(true);
    expect(telegraphOn({ telegraph: false, speed: "charge" })).toBe(true);
    expect(turnConfig(params({ telegraph: false, speed: "two" }))).toMatchObject({ telegraph: true, speed: 2 });
    expect(turnConfig(params({ telegraph: false, speed: "charge" }))).toMatchObject({ telegraph: true, speed: 1, chaseSpeed: 2 });
    expect(turnConfig(params({ speed: "half" })).speed).toBe(0.5);
  });
  // K80 turns 3a: K324 section 4.3's two knobs and the pull.
  it("gives up past sight + giveUp, roams from roamMin, and pulls the roamers only", () => {
    expect(turnConfig(params({ giveUp: 0 }))).toMatchObject({ see: 2, lose: 2 });
    expect(turnConfig(params({ sight: 3, giveUp: 5 }))).toMatchObject({ see: 3, lose: 8 });
    expect(turnConfig(params({ roamMin: 1 }))).toMatchObject({ rMin: 1, rMax: 8 });
    expect(turnConfig(params({ roamMin: 5, roam: 4 }))).toMatchObject({ rMin: 4, rMax: 4 });
    expect(turnConfig(params({ model: "guard", roamMin: 5 }))).toMatchObject({ rMin: 1, rMax: 6 });
    expect(turnConfig(params()).pull).toBeUndefined();
    expect(turnConfig(params({ pull: 0.5 })).pull).toBe(0.5);
    expect(turnConfig(params({ model: "guard", pull: 0.5 })).pull).toBe(0.5);
    expect(turnConfig(params({ model: "stalker", pull: 0.5 })).pull).toBeUndefined();
  });
  // K294 (K80 turns 3a): the per-model defaults.
  it("plays each model at its own sight and accuracy", () => {
    expect(turnMinoDefaults("hunter")).toEqual({ ...DEFAULT_TURN_MINO, model: "hunter" });
    expect(turnMinoDefaults("guard")).toMatchObject({
      model: "guard",
      sight: TURN_MODEL_DEFAULTS.guard.sight,
      accuracy: TURN_MODEL_DEFAULTS.guard.accuracy,
    });
    expect(turnMinoDefaults("stalker")).toMatchObject({
      model: "stalker",
      sight: DEFAULT_TURN_MINO.sight,
      accuracy: TURN_MODEL_DEFAULTS.stalker.accuracy,
    });
  });
});

describe("undo", () => {
  it("is off in real time and whenever the turn minotaur is on", () => {
    expect(undoAllowed("turn")).toBe(true);
    expect(undoAllowed("turn", "off")).toBe(true);
    expect(undoAllowed("turn", "hunter")).toBe(false);
    expect(undoAllowed("realtime")).toBe(false);
    expect(undoAllowed("realtime", "off")).toBe(false);
  });
});

describe("TurnGraph", () => {
  it("counts runs between vertices and finds the exit junction", () => {
    const g = new TurnGraph(G1);
    expect(g.hopd(S, X)).toBe(3); // S-A, the loop, C-X
    expect(g.hopd(A, C)).toBe(1); // the long loop is one run
    expect(g.hopd(D, X)).toBe(3);
    expect(g.exitJ).toBe(C);
  });
  it("indexes runs by id on real mazes (the harness indexes by position)", () => {
    for (const seed of [3, 17, 99]) {
      const walk = realMaze(seed);
      walk.edges.forEach((e, k) => expect(e.id).toBe(k));
    }
  });
});

describe("decide", () => {
  const g = new TurnGraph(G1);
  const cfg = (over: Partial<TurnConfig> = {}): TurnConfig => ({
    policy: "prox",
    speed: 1,
    telegraph: false,
    q: 1,
    stall: 0,
    ...over,
  });

  it("leaves the lair up the exit tail and never steps into an END it may not", () => {
    const m = initMino(g);
    const out = decide(g, cfg(), m, S, 1, new TurnRng(1).at(1));
    expect(out).toEqual([[3, C]]);
    expect(m.left).toBe(true);
  });

  it("sleeps, and moves every other turn at half speed", () => {
    expect(decide(g, cfg({ sleep: 2 }), initMino(g), S, 2, new TurnRng(1).at(2))).toEqual([]);
    expect(decide(g, cfg({ sleep: 2 }), initMino(g), S, 3, new TurnRng(1).at(3)).length).toBe(1);
    expect(decide(g, cfg({ speed: 0.5 }), initMino(g), S, 2, new TurnRng(1).at(2))).toEqual([]);
    expect(decide(g, cfg({ speed: 0.5 }), initMino(g), S, 1, new TurnRng(1).at(1)).length).toBe(1);
  });

  it("hunts within sight, toward the player", () => {
    const m = { ...initMino(g), v: C, left: true };
    const out = decide(g, cfg({ see: 4 }), m, A, 1, new TurnRng(1).at(1));
    expect(m.mode).toBe(1);
    expect(out).toEqual([[5, A]]); // the loop is one run: the best step
    expect(m.lastSeen).toBe(A);
  });

  it("cannot see a player in the sanctuary", () => {
    const m = { ...initMino(g), v: C, left: true };
    decide(g, cfg({ see: 99 }), m, S, 1, new TurnRng(1).at(1));
    expect(m.mode).toBe(0);
  });

  it("checks where it last saw the player, then roams again", () => {
    const m = { ...initMino(g), v: C, left: true, mode: 1, lastSeen: B };
    // The player slips into the sanctuary: lost, so it heads for B.
    const out = decide(g, cfg({ see: 1, lose: 1 }), m, S, 1, new TurnRng(1).at(1));
    expect(m.mode).toBe(2);
    expect(out).toEqual([[2, B]]);
    const m2 = { ...initMino(g), v: D, left: true, mode: 2, lastSeen: B };
    expect(decide(g, cfg(), m2, S, 1, new TurnRng(1).at(1))).toEqual([[4, B]]);
    expect(m2.mode).toBe(2);
    decide(g, cfg(), m2, S, 2, new TurnRng(1).at(2));
    expect(m2.mode).toBe(0);
  });

  it("charges two runs while it hunts", () => {
    const m = { ...initMino(g), v: D, left: true };
    const out = decide(g, cfg({ see: 4, chaseSpeed: 2 }), m, A, 1, new TurnRng(1).at(1));
    expect(out).toEqual([[4, B], [1, A]]);
  });

  it("takes two runs a turn at speed two", () => {
    const m = initMino(g);
    const out = decide(g, cfg({ speed: 2 }), m, S, 1, new TurnRng(3).at(1));
    expect(out.length).toBe(2);
    expect(out[0]).toEqual([3, C]);
  });

  it("roams to destinations rMin..rMax runs away (the guard: around the exit junction)", () => {
    const walk = realMaze(7);
    const tg = new TurnGraph(walk);
    for (let s = 0; s < 40; s++) {
      for (const home of [false, true]) {
        const m = { ...initMino(tg), left: true };
        // Start somewhere inside the maze: a junction a few runs in.
        let v = tg.exitJ;
        const rng = new SeededRNG(s + 1);
        for (let i = 0; i < 4; i++) {
          const runs = tg.chase.adj[v].filter((e) => {
            const w = tg.other(e, v);
            return w !== tg.start && w !== tg.exit;
          });
          v = tg.other(runs[rng.nextInt(runs.length)], v);
        }
        m.v = v;
        const c: TurnConfig = { ...cfg(), rMin: home ? 1 : 3, rMax: home ? 6 : 8, home };
        decide(tg, c, m, tg.start, 1, new TurnRng(s).at(1));
        if (m.dest < 0) continue;
        const d = tg.hopd(home ? tg.exitJ : v, m.dest);
        expect(d).toBeGreaterThanOrEqual(home ? 1 : 3);
        expect(d).toBeLessThanOrEqual(home ? 6 : 8);
        expect(tg.chase.isEnd[m.dest]).toBe(false);
      }
    }
  });

  // K80 turns 3a: THE PULL. With chance pull a roam ends nearer the player
  // than the junction it stands on (when one is in range); pull 0 is the
  // plain pick, and so is any pull while the player is unseen (the start).
  it("roams nearer the player with the pull, and plainly without it", () => {
    const walk = realMaze(7);
    const tg = new TurnGraph(walk);
    let pulled = 0;
    for (let s = 0; s < 60; s++) {
      const rng = new SeededRNG(s + 1);
      const walkIn = (from: number, n: number): number => {
        let v = from;
        for (let i = 0; i < n; i++) {
          const runs = tg.chase.adj[v].filter((e) => {
            const w = tg.other(e, v);
            return w !== tg.start && w !== tg.exit && !tg.chase.isEnd[w];
          });
          if (runs.length === 0) break;
          v = tg.other(runs[rng.nextInt(runs.length)], v);
        }
        return v;
      };
      const v = walkIn(tg.exitJ, 4);
      const p = walkIn(v, 9);
      if (tg.hopd(v, p) <= 2) continue;
      const dest = (pull: number | undefined, player: number): number => {
        const m = { ...initMino(tg), left: true, v };
        const c: TurnConfig = { ...cfg(), rMin: 3, rMax: 8, see: 0, lose: 0, pull };
        decide(tg, c, m, player, 1, new TurnRng(s).at(1));
        return m.dest;
      };
      // Pull 0 and an unseen player are the plain pick, draw for draw.
      expect(dest(0, p)).toBe(dest(undefined, p));
      expect(dest(1, tg.start)).toBe(dest(undefined, tg.start));
      const d = dest(1, p);
      if (d < 0) continue;
      const nearer: number[] = [];
      for (let w = 0; w < tg.n; w++) {
        const r = tg.hopd(v, w);
        if (!tg.chase.isEnd[w] && r >= 3 && r <= 8 && tg.hopd(w, p) < tg.hopd(v, p)) nearer.push(w);
      }
      if (nearer.length === 0) continue;
      expect(nearer).toContain(d);
      pulled++;
    }
    expect(pulled).toBeGreaterThan(20);
  });
});

describe("TurnMinotaur", () => {
  it("commits its telegraphed move and then takes exactly that move", () => {
    const walk = realMaze(11);
    for (const model of ["hunter", "guard", "stalker"] as const) {
      const t = new TurnMinotaur(walk, turnConfig(params({ model })), 77);
      const rng = new SeededRNG(5);
      for (let i = 0; i < 300 && !t.finished; i++) {
        const tel = t.telegraph()!;
        expect(tel).not.toBeNull();
        const steps = tel.steps.map((s) => [...s]);
        const from = tel.from;
        const r = t.turn(randomTap(t, rng));
        expect(t.lastFrom).toBe(r === "caught" ? t.state.v : from);
        if (r === "moved") {
          expect(t.lastPath).toEqual(steps);
          expect(t.state.v).toBe(tel.dest);
        }
        t.setProgress(1);
      }
    }
  });

  it("never enters the sanctuary, never returns to its lair, never sees the entrance", () => {
    for (const seed of [2, 5, 8]) {
      const walk = realMaze(seed);
      for (const model of ["hunter", "guard", "stalker"] as const) {
        for (const speed of ["one", "two"] as const) {
          const t = new TurnMinotaur(walk, turnConfig(params({ model, speed })), seed * 13);
          const rng = new SeededRNG(seed);
          for (let i = 0; i < 400 && !t.finished; i++) {
            const r = t.turn(randomTap(t, rng));
            for (const [, w] of t.lastPath) {
              expect(w).not.toBe(t.tg.start);
              expect(w).not.toBe(t.tg.exit);
            }
            if (r !== "caught" && t.lastPath.length > 0) expect(t.state.v).not.toBe(t.tg.exit);
          }
        }
      }
    }
  });

  it("never catches a player who waits in the sanctuary", () => {
    const walk = realMaze(4);
    const t = new TurnMinotaur(walk, turnConfig(params({ model: "stalker", accuracy: 1, pause: 0, speed: "two" })), 9);
    for (let i = 0; i < 200; i++) expect(t.turn(-1)).toBe("moved");
    expect(t.catches).toBe(0);
    expect(t.player).toBe(t.tg.start);
    expect(t.hunting).toBe(false);
  });

  it("counts a catch: the player to the entrance, it to its lair, its sleep again", () => {
    // S-A-B-C-X with the stalker (accuracy 1): a player who walks at it is caught.
    const t = new TurnMinotaur(G1, turnConfig(params({ model: "stalker", accuracy: 1, pause: 0, sleep: 1 })), 1);
    expect(t.mode).toBe("lair");
    expect(t.turn(0)).toBe("moved"); // S -> A; it sleeps
    expect(t.state.v).toBe(X);
    expect(t.turn(-1)).toBe("moved"); // it leaves its lair: X -> C
    expect(t.state.v).toBe(C);
    expect(t.mode).toBe("hunt");
    const r = t.turn(5); // A -> C along the loop, onto it
    expect(r).toBe("caught");
    expect(t.catches).toBe(1);
    expect(t.player).toBe(S);
    expect(t.state.v).toBe(X);
    expect(t.state.left).toBe(false);
    expect(t.lifeTurn).toBe(0);
    expect(t.mode).toBe("lair");
    expect(t.turn(0)).toBe("moved");
    expect(t.state.v).toBe(X); // asleep again
  });

  // K80 turns stage 2 (K273, section 2.9): the catch toggle and the tallies.
  it("tallies the turns it saw you and the close calls", () => {
    const t = new TurnMinotaur(G1, turnConfig(params({ model: "stalker", accuracy: 1, pause: 0, sleep: 1 })), 1);
    t.turn(0); // S -> A; it sleeps: not seen
    expect([t.seen, t.closeCalls]).toEqual([0, 0]);
    t.turn(-1); // X -> C while you wait at A: seen, and C is one run (5) from A
    expect([t.seen, t.closeCalls]).toEqual([1, 1]);
    expect(t.turn(5)).toBe("caught"); // seen again; a catch is not a close call
    expect([t.seen, t.closeCalls, t.catches]).toEqual([2, 1, 1]);
    t.turn(-1); // the sanctuary: in its lair, unseen
    expect([t.seen, t.closeCalls]).toEqual([2, 1]);
  });

  it("with lair off stays where it caught you and sleeps there", () => {
    expect(DEFAULT_TURN_MINO.lair).toBe(true);
    expect(turnConfig(params()).lair).toBeUndefined();
    const cfg = turnConfig(params({ model: "stalker", accuracy: 1, pause: 0, sleep: 1, lair: false }));
    expect(cfg.lair).toBe(false);
    const t = new TurnMinotaur(G1, cfg, 1);
    t.turn(0);
    t.turn(-1);
    expect(t.turn(5)).toBe("caught"); // it took the loop head-on, C -> A
    expect(t.catches).toBe(1);
    expect(t.player).toBe(S);
    expect(t.state.v).toBe(A);
    expect(t.state.left).toBe(true);
    expect(t.lifeTurn).toBe(0);
    expect(t.mode).not.toBe("lair");
    expect(t.turn(-1)).toBe("moved"); // asleep where it stands
    expect(t.state.v).toBe(A);
    t.turn(-1); // then it roams on from there
    expect(t.state.v).not.toBe(X);
  });

  it("carries its tallies to a restart's new minotaur", () => {
    const t = new TurnMinotaur(G1, turnConfig(params({ model: "stalker", accuracy: 1, pause: 0, sleep: 1 })), 1);
    for (const e of [0, -1, 5]) t.turn(e);
    t.restarts = 3;
    const next = new TurnMinotaur(G1, t.cfg, 1);
    next.carry(t);
    expect([next.catches, next.closeCalls, next.seen, next.restarts]).toEqual([1, 1, 2, 3]);
    expect([next.turns, next.player, next.state.v]).toEqual([0, S, X]);
  });

  it("lets a turn pass on a wait", () => {
    const t = new TurnMinotaur(G1, turnConfig(params({ sleep: 99 })), 3);
    t.turn(0);
    const before = t.player;
    expect(t.turn(-1)).toBe("moved");
    expect(t.player).toBe(before);
    expect(t.inputs).toEqual([0, -1]);
    expect(t.turns).toBe(2);
  });

  it("rejects a run away from the player, and is done after the win", () => {
    const t = new TurnMinotaur(G1, turnConfig(params({ sleep: 99 })), 3);
    expect(t.turn(2)).toBe("reject");
    expect(t.turns).toBe(0);
    for (const e of [0, 1, 2]) expect(t.turn(e)).toBe("moved");
    // Onto the exit with it still in its lair there: a win, never a catch.
    expect(t.turn(3)).toBe("win");
    expect(t.finished).toBe(true);
    expect(t.turn(3)).toBe("noop");
  });

  it("gives the same minotaur for the same taps, and replays from its taps", () => {
    const walk = realMaze(21);
    for (const telegraph of [true, false]) {
      const cfg = turnConfig(params({ telegraph }));
      const a = new TurnMinotaur(walk, cfg, 1234);
      const rng = new SeededRNG(8);
      const paths: TurnStep[][] = [];
      for (let i = 0; i < 250 && !a.finished; i++) {
        a.turn(randomTap(a, rng, 0.2));
        paths.push(a.lastPath.map((s) => [...s] as TurnStep));
      }
      const b = new TurnMinotaur(walk, cfg, 1234);
      a.inputs.forEach((e, i) => {
        b.turn(e);
        expect(b.lastPath).toEqual(paths[i]);
      });
      expect(b.state).toEqual(a.state);
      expect(b.catches).toBe(a.catches);
      // Another seed is another minotaur.
      const c = new TurnMinotaur(walk, cfg, 4321);
      let same = true;
      a.inputs.forEach((e, i) => {
        if (c.finished) return;
        c.turn(e);
        if (JSON.stringify(c.lastPath) !== JSON.stringify(paths[i])) same = false;
      });
      expect(same).toBe(false);
    }
  });

  it("decides after the tap without the telegraph (reactive)", () => {
    const t = new TurnMinotaur(G1, turnConfig(params({ telegraph: false, pause: 0 })), 3);
    expect(t.telegraph()).toBeNull();
    t.turn(0);
    expect(t.lastPath.length).toBe(1);
  });

  // K80 turns stage 3a (item 1): WHOLE GAMES at the defaults. Mazes 3, 17
  // and 42, the three models at DEFAULT_TURN_MINO, two scripted players per
  // maze (SeededRNG): a wait one turn in six, else a run toward the exit (in
  // runs) two times in five, else any run; 300 turns at most. A row is
  // model:maze:walk turns/catches/close calls/seen/won/digest of every turn
  // (the tap, the result, where both stand, its mode and path). It moves
  // when a rule or a default the models read moves; re-freeze it and name
  // what moved in the commit.
  const TURN_GAMES = [
    "hunter:3:1 35/0/4/12/W/fc1c0c78",
    "hunter:3:2 57/2/7/24/W/2adc117c",
    "guard:3:1 300/13/16/57/-/3c947545",
    "guard:3:2 57/1/7/19/W/e5afe62a",
    "stalker:3:1 154/8/5/137/W/612b8412",
    "stalker:3:2 300/17/24/266/-/8ded2d21",
    "hunter:17:1 55/1/4/31/W/f5bf596c",
    "hunter:17:2 27/0/0/0/W/cd23e252",
    "guard:17:1 56/0/5/29/W/1bd527f8",
    "guard:17:2 27/0/1/10/W/9d92c885",
    "stalker:17:1 55/2/3/48/W/3145dd78",
    "stalker:17:2 28/1/1/25/W/2912c523",
    "hunter:42:1 12/0/0/7/W/97fd3af6",
    "hunter:42:2 44/2/2/8/W/c66848f9",
    "guard:42:1 12/0/0/7/W/97fd3af6",
    "guard:42:2 46/4/5/20/W/42fb06b",
    "stalker:42:1 63/2/5/58/W/9b844d55",
    "stalker:42:2 46/2/6/42/W/4e511642",
  ];

  it("plays the pinned games at the defaults", () => {
    const rows: string[] = [];
    for (const maze of [3, 17, 42]) {
      const walk = realMaze(maze);
      for (const model of ["hunter", "guard", "stalker"] as const) {
        for (const walkSeed of [1, 2]) {
          rows.push(`${model}:${maze}:${walkSeed} ${turnGame(walk, params({ model }), maze, walkSeed)}`);
        }
      }
    }
    expect(rows).toEqual(TURN_GAMES);
  });

  it("animates along its steps, two runs inside one move", () => {
    const t = new TurnMinotaur(G1, turnConfig(params({ speed: "two", pause: 0 })), 3);
    t.turn(-1); // the player waits in the sanctuary
    expect(t.lastPath.length).toBe(2);
    const [e0, v0] = t.lastPath[0];
    t.setProgress(0);
    expect(t.mino).toMatchObject({ edge: 3, pos: 5, dir: -1 }); // run 3 is C -> X: it leaves X
    expect(t.telegraph()).toBeNull(); // mid-animation
    const len0 = t.g.len[e0];
    const total = len0 + t.g.len[t.lastPath[1][0]];
    t.setProgress((len0 / total) * 0.5);
    const s = t.mino;
    expect(s.edge).toBe(e0);
    expect(s.pos).toBeCloseTo(len0 / 2, 9);
    t.setProgress(1);
    expect(t.mino).toMatchObject({ edge: -1, vertex: t.state.v });
    expect(v0).toBe(C);
  });
});
