// K114's beat rider (src/game/beat_rider.ts): beats per run, the default
// choice, the queue, the start on the next beat, and whole games driven by
// beats on real mazes, with the turn minotaur and with the fire. K795: the
// run timing (even: the same beats every run; length: K114's beatsForRun).
import { describe, expect, it } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { beatAt, beatTick } from "../../src/game/beat_clock";
import { BEAT_PER_RUN, BeatRider, beatsForRun, runBeats } from "../../src/game/beat_rider";
import type { BeatDeparture, BeatTiming } from "../../src/game/beat_rider";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { buildFire } from "../../src/game/fire";
import { DEFAULT_TURN_MINO, turnConfig, TurnMinotaur, turnSeed } from "../../src/game/minotaur_turns";
import { arrivalOf, buildWalkerMap, walkerMapOf } from "../../src/game/walker";
import type { WalkerMap } from "../../src/game/walker";
import { SeededRNG } from "../../src/util/random";

// A hand-made walk graph (walker.test.ts's build): vertex positions (screen
// y down), END vertices, straight runs [va, vb, chain, ctrlA, ctrlB].
type P = [number, number];
interface Spec {
  pos: Record<string, P>;
  ends: string[];
  runs: Array<[string, string, number, number, number]>;
  start: string;
  exit: string;
}

function build(spec: Spec): { walk: WalkGraph; map: WalkerMap } {
  const vertices = new Map<string, WalkVertex>();
  for (const id of Object.keys(spec.pos)) {
    vertices.set(id, { id, isEnd: spec.ends.includes(id), chain: 0, ctrl: 0, edges: [] });
  }
  const polys: P[][] = [];
  const edges: WalkEdge[] = spec.runs.map(([va, vb, chain, ctrlA, ctrlB], id) => {
    const a = spec.pos[va];
    const b = spec.pos[vb];
    polys.push([a, b]);
    vertices.get(va)!.edges.push(id);
    if (vb !== va) vertices.get(vb)!.edges.push(id);
    const length = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
    return { id, va, vb, chain, ctrlA, ctrlB, length };
  });
  const distToExit = walkDistances(vertices, edges, spec.exit);
  const walk: WalkGraph = {
    vertices,
    edges,
    start: spec.start,
    exit: spec.exit,
    optimalLength: distToExit.get(spec.start)!,
    distToExit,
  };
  return { walk, map: buildWalkerMap(walk, (r) => polys[r], () => 0) };
}

// A plus: S up to J, then N straight on (chain 1); W through J to E (chain
// 0), and E on to the exit stub F.
const PLUS: Spec = {
  pos: { S: [0, 10], J: [0, 0], N: [0, -10], W: [-10, 0], E: [10, 0], F: [20, 0] },
  ends: ["S", "N", "W", "F"],
  runs: [
    ["S", "J", 1, 0, 2], // 0
    ["J", "N", 1, 2, 4], // 1
    ["W", "J", 0, 0, 2], // 2
    ["J", "E", 0, 2, 4], // 3
    ["E", "F", 0, 4, 6], // 4
  ],
  start: "S",
  exit: "F",
};

// A tee: S up to J, where the strand ends; W through J to E.
const TEE: Spec = {
  pos: { S: [0, 10], J: [0, 0], W: [-10, 0], E: [10, 0] },
  ends: ["S", "W", "E"],
  runs: [
    ["S", "J", 1, 0, 2], // 0
    ["W", "J", 0, 0, 2], // 1
    ["J", "E", 0, 2, 4], // 2
  ],
  start: "S",
  exit: "W",
};

// PLUS's runs at four lengths: S-J 2, J-N 30, W-J 10, J-E 7, E-F 20 (K795).
const VARIED: Spec = {
  ...PLUS,
  pos: { S: [0, 2], J: [0, 0], N: [0, -30], W: [-10, 0], E: [7, 0], F: [27, 0] },
};

const ALL = (): boolean => true;
const runsOf = (deps: BeatDeparture[]): number[] => deps.map((x) => x.run);

describe("beatsForRun", () => {
  it("rounds length / unit, at least one beat and at most the cap", () => {
    expect(beatsForRun(4.24, 2, 4)).toBe(2);
    expect(beatsForRun(0.71, 2, 4)).toBe(1);
    expect(beatsForRun(5, 2, 4)).toBe(3); // 2.5 rounds up
    expect(beatsForRun(60, 2, 4)).toBe(4);
    expect(beatsForRun(60, 2, 1)).toBe(1);
    expect(beatsForRun(60, 2, 2.7)).toBe(2); // whole beats
    expect(beatsForRun(0, 2, 4)).toBe(1);
    expect(beatsForRun(3, 0, 4)).toBe(1);
    expect(beatsForRun(3, 1, Number.NaN)).toBe(1);
  });
});

describe("runBeats (K795)", () => {
  it("even: the same whole beats every run, at least one; length: beatsForRun", () => {
    expect(BEAT_PER_RUN).toBe(1); // one beat per run by default (Levi, 2026-10-21)
    expect(runBeats(60, "even", 1, 2, 4)).toBe(1);
    expect(runBeats(0.1, "even", 3, 2, 4)).toBe(3);
    expect(runBeats(60, "even", 2.7, 2, 4)).toBe(2); // whole beats
    expect(runBeats(5, "even", 0, 2, 4)).toBe(1);
    expect(runBeats(5, "even", Number.NaN, 2, 4)).toBe(1);
    expect(runBeats(4.24, "length", 3, 2, 4)).toBe(beatsForRun(4.24, 2, 4));
    expect(runBeats(60, "length", 1, 2, 4)).toBe(4);
  });
});

describe("BeatRider's run timing (K795)", () => {
  // The dot rides VARIED with no taps: straight on and back at the ENDs,
  // through every run length.
  const rideVaried = (timing: BeatTiming, perRun: number): BeatDeparture[] => {
    const { map } = build(VARIED);
    const r = new BeatRider(map, 100, 2, 4, "S", timing, perRun);
    expect([r.timing, r.perRun]).toEqual([timing, perRun]);
    r.queue(0, 0);
    const deps: BeatDeparture[] = [];
    for (let t = 0; t <= 8000; t += 2) deps.push(...r.advance(t, ALL));
    return deps;
  };

  it("even: every run takes perRun beats, so the junctions come at a steady interval", () => {
    for (const perRun of [1, 2, 4]) {
      const deps = rideVaried("even", perRun);
      expect(deps.length).toBeGreaterThan(8);
      for (let i = 0; i < deps.length; i++) {
        expect(deps[i].beats).toBe(perRun);
        expect(deps[i].tick).toBe(beatTick(deps[i].beat, 100));
        if (i > 0) {
          expect(deps[i].beat).toBe(deps[i - 1].beat + perRun);
          expect(deps[i].tick - deps[i - 1].tick).toBe(72 * perRun); // 0.6 s a beat
        }
      }
    }
  });

  it("length: K114's beats by run length, so the interval varies with the run", () => {
    const deps = rideVaried("length", 1);
    for (const d of deps) {
      const length = build(VARIED).walk.edges[d.run].length;
      expect(d.beats).toBe(beatsForRun(length, 2, 4));
    }
    expect(new Set(deps.map((d) => d.beats)).size).toBeGreaterThan(1);
  });

  it("defaults to K114's length rule when built without a timing", () => {
    const { map } = build(VARIED);
    const r = new BeatRider(map, 100, 2, 4, "S");
    expect(r.timing).toBe("length");
  });
});

describe("BeatRider", () => {
  it("waits for the first tap, then starts on the next beat", () => {
    const { map } = build(PLUS);
    const r = new BeatRider(map, 100, 5, 4, "S");
    expect(r.advance(1000, ALL)).toEqual([]); // no tap: it waits
    expect(r.queue(4, 1000)).toBe(false); // not an arm of S
    expect(r.queue(0, 1010)).toBe(true);
    const next = beatAt(1010, 100) + 1;
    expect(r.advance(beatTick(next, 100) - 1, ALL)).toEqual([]);
    const deps = r.advance(beatTick(next, 100), ALL);
    // S-J is 10 long: 2 beats of 5.
    expect(deps).toEqual([{ run: 0, d: 0, beat: next, tick: beatTick(next, 100), beats: 2 }]);
    expect(r.t1).toBe(beatTick(next + 2, 100));
    expect(r.progress(r.t0)).toBe(0);
    expect(r.progress((r.t0 + r.t1) / 2)).toBe(0.5);
    expect(r.progress(r.t1 + 50)).toBe(1);
  });

  it("goes straight on with no tap: the continuation, then keep right, and back at an END", () => {
    const { map } = build(PLUS);
    const r = new BeatRider(map, 120, 10, 4, "S");
    r.queue(0, 0);
    const seen: number[] = [];
    for (let t = 0; t <= 1200; t += 2) seen.push(...runsOf(r.advance(t, ALL)));
    // S-J, J-N straight on (chain 1), N is an END: back down to J, then on
    // to S (the continuation of N-J), S is an END: back up, and so on.
    expect(seen.slice(0, 5)).toEqual([0, 1, 1, 0, 0]);
    // The tee: S's strand ends at J, so keep right (screen y down: E).
    const tee = build(TEE);
    const q = new BeatRider(tee.map, 120, 10, 4, "S");
    q.queue(0, 0);
    const teeRuns: number[] = [];
    for (let t = 0; t <= 600; t += 2) teeRuns.push(...runsOf(q.advance(t, ALL)));
    // S-J, J-E (right), E is an END: back, then W straight on (chain 0).
    expect(teeRuns.slice(0, 4)).toEqual([0, 2, 2, 1]);
  });

  it("reaches every junction on a beat and never stops", () => {
    const { map } = build(PLUS);
    const r = new BeatRider(map, 132, 4, 3, "S");
    r.queue(0, 7);
    const deps: BeatDeparture[] = [];
    for (let t = 0; t <= 5000; t += 2) deps.push(...r.advance(t, ALL));
    expect(deps.length).toBeGreaterThan(10);
    for (let i = 0; i < deps.length; i++) {
      expect(deps[i].tick).toBe(beatTick(deps[i].beat, 132));
      if (i > 0) expect(deps[i].beat).toBe(deps[i - 1].beat + deps[i - 1].beats);
    }
  });

  it("queues an arm of the junction ahead: the last tap wins, cleared on arrival, others ignored", () => {
    const { map } = build(PLUS);
    const r = new BeatRider(map, 100, 10, 4, "S");
    r.queue(0, 0);
    r.advance(beatTick(1, 100), ALL); // leaves S on beat 1, reaches J on beat 2
    expect(r.ahead).toBe("J");
    expect(r.queue(2, 80)).toBe(true); // W
    expect(r.queue(3, 90)).toBe(true); // E: the last wins
    expect(r.queue(4, 100)).toBe(false); // E-F is not an arm of J
    expect(r.queued >> 1).toBe(3);
    const deps = r.advance(beatTick(2, 100), ALL);
    expect(runsOf(deps)).toEqual([3]);
    expect(r.queued).toBe(-1); // cleared on arrival
    // E is not an END (E-F goes on): straight on to F without a tap.
    expect(runsOf(r.advance(beatTick(3, 100), ALL))).toEqual([4]);
  });

  it("falls through a refused arm to the default order, and rests when all are refused", () => {
    const { map } = build(PLUS);
    const r = new BeatRider(map, 100, 10, 4, "S");
    r.queue(0, 0);
    r.advance(beatTick(1, 100), ALL);
    r.queue(3, 80); // E, refused below
    const deps = r.advance(beatTick(2, 100), (run) => run !== 3);
    expect(runsOf(deps)).toEqual([1]); // straight on to N
    // Every run refused at N's END: the dot rests at N until the next tap.
    expect(r.advance(beatTick(3, 100), () => false)).toEqual([]);
    expect(r.riding).toBe(false);
    expect(r.at).toBe("N");
    expect(r.advance(beatTick(9, 100), ALL)).toEqual([]);
    expect(r.queue(1, beatTick(9, 100) + 5)).toBe(true);
    expect(runsOf(r.advance(beatTick(10, 100), ALL))).toEqual([1]);
  });
});

// A real maze (k137b_block.test.ts's realMaze) and its walker map.
function realMaze(seed: number): { walk: WalkGraph; map: WalkerMap } {
  const g = generateLatticeKnotwork({ gridSize: 10, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: DEAD_END_DENSITY_ON });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  const walk = buildWalkGraph(g)!;
  return { walk, map: walkerMapOf(g, walk) };
}

const OK = (r: string): boolean =>
  r !== "reject" && r !== "noop" && r !== "smolder" && r !== "spool";

// A whole game on the beat: a player who taps a random arm of the junction
// ahead now and then, a 60 Hz frame of two ticks, until the game ends.
function ride(
  walk: WalkGraph,
  map: WalkerMap,
  c: FabricMazeController,
  seed: number,
  onMove: (run: number) => void,
  over: () => boolean,
  timing: BeatTiming = "length",
  perRun = 1
): { deps: BeatDeparture[]; ticks: number } {
  const rng = new SeededRNG(seed);
  const r = new BeatRider(map, 100, 2, 4, walk.start, timing, perRun);
  const deps: BeatDeparture[] = [];
  let t = 0;
  r.queue(walk.vertices.get(walk.start)!.edges[0], 0);
  for (; t < 60000 && !over(); t += 2) {
    if (rng.next() < 0.02) {
      const arms = walk.vertices.get(r.ahead)!.edges;
      r.queue(arms[rng.nextInt(arms.length)], t);
    }
    const got = r.advance(t, (run) => {
      if (over() || !OK(c.tapEdge(run))) return false;
      onMove(run);
      return true;
    });
    for (const d of got) {
      deps.push(d);
      // The controller commits the move at once: its head is the junction
      // the dot rides to.
      if (!over()) expect(c.head).toBe(arrivalOf(map, d.d));
    }
  }
  return { deps, ticks: t };
}

// Both run timings (K795): K114's by length, and the default, one beat a run.
const TIMINGS: Array<[BeatTiming, number]> = [["length", 1], ["even", 1]];

describe.each(TIMINGS)("whole games on the beat (%s, %i)", (timing, perRun) => {
  it("plays the turn minotaur one turn per committed move", () => {
    let ended = 0;
    for (const seed of [3, 11, 42]) {
      const { walk, map } = realMaze(seed);
      const c = new FabricMazeController(walk, false);
      const t = new TurnMinotaur(walk, turnConfig({ ...DEFAULT_TURN_MINO, model: "hunter" }), turnSeed(seed));
      let turns = 0;
      const { deps } = ride(
        walk,
        map,
        c,
        seed,
        (run) => {
          t.turn(run);
          t.setProgress(1);
          turns++;
        },
        () => c.solved || t.finished,
        timing,
        perRun
      );
      expect(turns).toBe(deps.length);
      expect(c.taps.length).toBe(deps.length);
      if (c.solved || t.finished) ended++;
    }
    expect(ended).toBe(3);
  });

  it("burns the fire one step per committed move", () => {
    let ended = 0;
    for (const seed of [3, 11, 42]) {
      const { walk, map } = realMaze(seed);
      const c = new FabricMazeController(walk, false, buildFire(walk, 0.6, 0));
      const { deps } = ride(walk, map, c, seed, () => {}, () => c.solved || c.fireLost, timing, perRun);
      expect(c.taps.length).toBe(deps.length);
      // Replaying the taps on the turn clock reaches the same end.
      const again = new FabricMazeController(walk, false, buildFire(walk, 0.6, 0));
      again.replay([...c.taps]);
      expect([again.solved, again.fireLost]).toEqual([c.solved, c.fireLost]);
      if (c.solved || c.fireLost) ended++;
    }
    expect(ended).toBe(3);
  });
});
