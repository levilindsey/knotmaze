import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import {
  contact,
  contactByLength,
  lengthContactDistance,
  lengthFactor,
  spotAlongLengthRoute,
  spotAtVertex,
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

// A plain chain S -0(4)- A -1(20)- B -2(20)- C -3(4)- X for K481.
// Vertex indices: S 0, A 1, B 2, C 3, X 4. Median run length 12.
const G2 = graph(
  [
    ["S", "A", 4],
    ["A", "B", 20],
    ["B", "C", 20],
    ["C", "X", 4],
  ],
  "S",
  "X"
);

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

// K481: the same scripted game in the by-length mode; the digest also
// covers its spot and travel, so a travel or contact change moves it.
function turnGameLength(walk: WalkGraph, p: TurnMinoParams, maze: number, walkSeed: number): string {
  const t = new TurnMinotaur(walk, { ...turnConfig(p), byLength: true }, turnSeed(maze));
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
    mix(
      `${e}|${r}|${t.player}|${t.state.v}|${t.state.spot.edge},${t.state.spot.pos}|${t.mode}|${t.lastTravel}|${t.lastPath.map((s) => s.join(",")).join(";")}/`
    );
  }
  const won = t.finished ? "W" : "-";
  return `${t.turns}/${t.catches}/${t.closeCalls}/${t.seen}/${won}/${h.toString(16)}`;
}

const LENGTH_GAMES: string[] = [
    "hunter:3:1 51/0/3/25/W/acbddd26",
    "hunter:3:2 13/0/0/5/W/e9e9bed3",
    "guard:3:1 143/5/2/97/W/fab54e46",
    "guard:3:2 13/0/0/9/W/8038404f",
    "stalker:3:1 83/2/7/79/W/727bec77",
    "stalker:3:2 54/3/2/47/W/6b6a3c62",
    "hunter:17:1 59/2/2/21/W/75debd4a",
    "hunter:17:2 27/0/0/17/W/9fce3356",
    "guard:17:1 65/1/1/50/W/2837206e",
    "guard:17:2 35/2/1/13/W/fc05bad",
    "stalker:17:1 55/2/3/51/W/4484b34c",
    "stalker:17:2 27/1/1/24/W/f7f741e7",
    "hunter:42:1 12/0/2/7/W/8df0880c",
    "hunter:42:2 9/0/0/4/W/f842b3e1",
    "guard:42:1 12/0/2/9/W/86d91334",
    "guard:42:2 9/0/0/7/W/d69f8b4d",
    "stalker:42:1 12/0/2/10/W/86d91334",
    "stalker:42:2 9/0/0/7/W/d69f8b4d",
];

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
  // and 42, each model at its own defaults (turnMinoDefaults, K294), two
  // scripted players per maze (SeededRNG): a wait one turn in six, else a
  // run toward the exit (in runs) two times in five, else any run; 300
  // turns at most. A row is model:maze:walk turns/catches/close
  // calls/seen/won/digest of every turn (the tap, the result, where both
  // stand, its mode and path). It moves when a rule or a default the
  // models read moves; re-freeze it and name what moved in the commit
  // (item 8's K294 values moved every guard and stalker row).
  const TURN_GAMES = [
    "hunter:3:1 51/0/5/38/W/ca93db16",
    "hunter:3:2 60/3/9/40/W/84a9d9b4",
    "guard:3:1 184/11/26/134/W/b23c6b93",
    "guard:3:2 57/3/10/42/W/27581535",
    "stalker:3:1 33/1/3/29/W/a6d955e8",
    "stalker:3:2 93/8/7/80/W/36c84619",
    "hunter:17:1 28/1/1/17/W/def279f5",
    "hunter:17:2 27/1/2/14/W/942b271f",
    "guard:17:1 54/2/1/35/W/ebb27a3",
    "guard:17:2 27/0/5/18/W/27ae3de3",
    "stalker:17:1 28/1/1/21/W/c5733b9b",
    "stalker:17:2 92/7/9/82/W/9ee1b7a8",
    "hunter:42:1 29/3/2/18/W/a6272f21",
    "hunter:42:2 51/4/4/16/W/58e2ff77",
    "guard:42:1 55/2/6/50/W/354502f",
    "guard:42:2 58/6/9/43/W/5147971",
    "stalker:42:1 156/15/22/131/W/a2ecf311",
    "stalker:42:2 97/10/21/77/W/cfdef67e",
  ];

  it("plays the pinned games at the defaults", () => {
    const rows: string[] = [];
    for (const maze of [3, 17, 42]) {
      const walk = realMaze(maze);
      for (const model of ["hunter", "guard", "stalker"] as const) {
        for (const walkSeed of [1, 2]) {
          rows.push(`${model}:${maze}:${walkSeed} ${turnGame(walk, turnMinoDefaults(model), maze, walkSeed)}`);
        }
      }
    }
    expect(rows).toEqual(TURN_GAMES);
  });

  describe("K481 turns by length", () => {
    const tg2 = new TurnGraph(G2);
    const cfgL = (over: Partial<TurnConfig> = {}): TurnConfig => ({
      ...turnConfig(params({ model: "stalker", accuracy: 1, pause: 0 })),
      byLength: true,
      telegraph: false,
      catchDist: 1,
      ...over,
    });
    const place = (t: TurnMinotaur, v: number, spot = spotAtVertex(v)): void => {
      t.state = { ...initMino(t.tg), v, left: v !== t.tg.exit, spot };
    };

    it("measures the wait by the median run length", () => {
      expect(tg2.medianLength).toBe(12);
      expect(new TurnGraph(G1).medianLength).toBe(9);
      const t = new TurnMinotaur(G2, cfgL(), 1);
      expect(t.turn(0)).toBe("moved"); // S -> A (4); it walks X -> C (4)
      expect(t.state.v).toBe(C);
      expect(t.turn(-1)).toBe("moved"); // a wait: 1x the median, 12
      expect(t.lastTravel).toBe(12);
      expect(t.state.spot).toMatchObject({ edge: 2, pos: 8, dir: -1 });
      expect(t.state.v).toBe(B);
    });

    it("travels the speed factor times the player's run, at each speed", () => {
      const g = tg2;
      const base = initMino(g);
      expect(lengthFactor(g, { policy: "prox", speed: 0.5, telegraph: false }, base, A)).toBe(0.5);
      expect(lengthFactor(g, { policy: "prox", speed: 1, telegraph: false }, base, A)).toBe(1);
      expect(lengthFactor(g, { policy: "prox", speed: 2, telegraph: false }, base, A)).toBe(2);
      const charge: TurnConfig = { policy: "prox", speed: 1, chaseSpeed: 2, see: 2, telegraph: false };
      expect(lengthFactor(g, charge, { ...base, v: C }, A)).toBe(2); // in sight
      expect(lengthFactor(g, charge, { ...base, v: X }, A)).toBe(1); // too far, roaming
      expect(lengthFactor(g, charge, { ...base, v: X, mode: 1 }, A)).toBe(2); // hunting
      const half = new TurnMinotaur(G2, cfgL({ speed: 0.5 }), 1);
      half.turn(0);
      expect(half.lastTravel).toBe(2);
      expect(half.state.spot).toMatchObject({ edge: 3, pos: 2, dir: -1 });
      expect(half.state.v).toBe(C);
      const two = new TurnMinotaur(G2, cfgL({ speed: 2 }), 1);
      two.turn(0);
      expect(two.lastTravel).toBe(8);
      expect(two.state.spot).toMatchObject({ edge: 2, pos: 16, dir: -1 });
      expect(two.state.v).toBe(B);
    });

    it("stops mid-run and can turn back on a run", () => {
      const t1 = new TurnMinotaur(G1, cfgL(), 1);
      t1.player = B;
      place(t1, C, { edge: 2, pos: 9, dir: 1, vertex: B });
      t1.state.prev = B;
      expect(t1.turn(4)).toBe("moved"); // B -> D (8); it turns back 8 toward B
      expect(t1.lastTravel).toBe(8);
      expect(t1.state.spot).toMatchObject({ edge: 2, pos: 1, dir: -1 });
      expect(t1.state.v).toBe(B);
    });

    it("is caught when the faster player closes from behind", () => {
      const t = new TurnMinotaur(G2, cfgL({ speed: 0.5 }), 1);
      t.player = B;
      place(t, B, { edge: 2, pos: 8, dir: -1, vertex: C });
      t.state.prev = C;
      expect(t.turn(2)).toBe("caught"); // B -> C at 1x closes on its 0.5x turn back
      expect(t.lastTravel).toBe(0); // reset by the catch
      expect(t.catches).toBe(1);
      expect(t.state.v).toBe(X);
      expect(t.mino).toMatchObject({ edge: -1, vertex: X });
    });

    it("catches head-on on one run", () => {
      const cfg: TurnConfig = { ...cfgL(), telegraph: true };
      const t = new TurnMinotaur(G2, cfg, 1);
      t.player = A;
      place(t, B);
      t.setConfig(cfg);
      expect(t.telegraph()?.steps).toEqual([[1, A]]);
      expect(t.turn(1)).toBe("caught"); // A -> B while it runs B -> A
      expect(t.catches).toBe(1);
      expect(t.player).toBe(S);
      expect(t.state.v).toBe(X);
    });

    it("catches from behind at twice the player's speed", () => {
      const t = new TurnMinotaur(G2, cfgL({ speed: 2 }), 1);
      t.player = A;
      place(t, A, { edge: 0, pos: 1, dir: 1, vertex: S });
      t.state.prev = S;
      expect(t.turn(1)).toBe("caught"); // it enters A-B behind you and closes 3 units
      expect(t.catches).toBe(1);
    });

    it("catches a move that ends within the catch distance", () => {
      const t = new TurnMinotaur(G2, cfgL({ speed: 0.5 }), 1);
      t.player = A;
      place(t, C, { edge: 2, pos: 10.5, dir: 1, vertex: B });
      t.state.prev = B;
      expect(t.turn(1)).toBe("caught"); // you end at B; it stops 0.5 away on B-C
      expect(t.catches).toBe(1);
    });

    it("counts a close call and a seen turn in thread distance", () => {
      const t = new TurnMinotaur(G2, cfgL({ speed: 0.5, catchDist: 0.1 }), 1);
      t.player = A;
      place(t, C, { edge: 2, pos: 10.5, dir: 1, vertex: B });
      t.state.prev = B;
      expect(t.turn(1)).toBe("moved"); // 0.5 away: past the catch, within a median run
      expect(t.closeCalls).toBe(1);
      expect(t.seen).toBe(1);
    });

    it("never catches a player waiting in the sanctuary", () => {
      const t = new TurnMinotaur(G2, cfgL(), 1);
      place(t, A, { edge: 0, pos: 0.5, dir: 1, vertex: S });
      t.state.prev = S;
      expect(t.turn(-1)).toBe("moved");
      expect(t.catches).toBe(0);
      expect(t.player).toBe(S);
    });

    it("lets an exit run win before any contact", () => {
      const t = new TurnMinotaur(G2, cfgL(), 1);
      t.player = C;
      place(t, C);
      expect(t.turn(3)).toBe("win");
      expect(t.finished).toBe(true);
      expect(t.catches).toBe(0);
    });

    it("checks contact continuously along a shared run", () => {
      const from = spotAtVertex(B);
      expect(lengthContactDistance(tg2, A, 1, from, [[1, A]], [20], 20)).toBe(0);
      expect(contactByLength(tg2, A, 1, from, [[1, A]], [20], 20, 1)).toBe(true);
      const away = spotAlongLengthRoute(tg2, from, [[1, A]], [20], 7);
      expect(away).toMatchObject({ edge: 1, pos: 13, dir: -1 });
    });

    it("plays the pinned games in the mode", () => {
      const rows: string[] = [];
      for (const maze of [3, 17, 42]) {
        const walk = realMaze(maze);
        for (const model of ["hunter", "guard", "stalker"] as const) {
          for (const walkSeed of [1, 2]) {
            rows.push(`${model}:${maze}:${walkSeed} ${turnGameLength(walk, turnMinoDefaults(model), maze, walkSeed)}`);
          }
        }
      }
      expect(rows).toEqual(LENGTH_GAMES);
    });

    it("replays the same taps to the same spots", () => {
      const walk = realMaze(21);
      const cfg: TurnConfig = { ...turnConfig(turnMinoDefaults("hunter")), byLength: true };
      const play = (seed: number): { inputs: number[]; trace: string[]; a: TurnMinotaur } => {
        const a = new TurnMinotaur(walk, cfg, seed);
        const rng = new SeededRNG(8);
        const trace: string[] = [];
        for (let i = 0; i < 150 && !a.finished; i++) {
          a.turn(randomTap(a, rng, 0.2));
          a.setProgress(1);
          trace.push(
            `${a.player}|${a.state.v}|${a.state.spot.edge},${a.state.spot.pos}|${a.lastTravel}|${a.lastPath.map((s) => s.join(",")).join(";")}`
          );
        }
        return { inputs: a.inputs.slice(), trace, a };
      };
      const first = play(1234);
      const b = new TurnMinotaur(walk, cfg, 1234);
      const traceB: string[] = [];
      for (const e of first.inputs) {
        if (b.finished) break;
        b.turn(e);
        b.setProgress(1);
        traceB.push(
          `${b.player}|${b.state.v}|${b.state.spot.edge},${b.state.spot.pos}|${b.lastTravel}|${b.lastPath.map((s) => s.join(",")).join(";")}`
        );
      }
      expect(traceB).toEqual(first.trace);
      expect(b.state).toEqual(first.a.state);
      expect(b.catches).toBe(first.a.catches);
      const other = play(4321);
      expect(other.trace).not.toEqual(first.trace);
    });
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
