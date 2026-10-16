import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph, WalkVertex, WalkEdge } from "../../src/core/walk_graph";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { buildFire, fireTime } from "../../src/game/fire";
import { FIRE_V_REF, FireClock, fireClockL } from "../../src/game/fire_clock";
import { CHASE_HZ, MAX_STEPS_PER_ADVANCE } from "../../src/game/minotaur";

// K114 stage 2, the real-time fire: its clock (game/fire_clock.ts) and the
// controller's real-time rules (fabric_controller.ts, THE REAL-TIME FIRE).

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

// S-A 2, then a triangle A-U 2, A-W 2, U-W 2, a dead end W-D 3 and the
// exit U-X 6. At r 0.5, h 0: d = S 0, A 2, U 4, W 4, D 7, X 10; T = 2d.
const RUNS: Array<[string, string, number]> = [
  ["S", "A", 2], // 0
  ["A", "U", 2], // 1
  ["A", "W", 2], // 2
  ["U", "W", 2], // 3
  ["U", "X", 6], // 4
  ["W", "D", 3], // 5
];

function realtime(r = 0.5, h = 0): FabricMazeController {
  const walk = graph(RUNS, "S", "X");
  return new FabricMazeController(walk, false, buildFire(walk, r, h, "realtime"));
}

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

describe("the real-time fire's clock (K114 stage 2)", () => {
  it("counts fixed ticks: L = ticks x FIRE_V_REF / CHASE_HZ, exactly", () => {
    const k = new FireClock();
    expect(k.L).toBe(0);
    expect(k.advance(0)).toBe(0);
    expect(k.advance(-1)).toBe(0);
    expect(k.advance(1 / (2 * CHASE_HZ))).toBe(0); // Half a tick waits.
    expect(k.advance(1 / (2 * CHASE_HZ))).toBe(1);
    expect(k.ticks).toBe(1);
    expect(k.L).toBe(FIRE_V_REF / CHASE_HZ);
    for (let t = 1; t <= 600; t++) {
      expect(fireClockL(t)).toBe((t * FIRE_V_REF) / CHASE_HZ);
    }
    // Whole seconds read whole multiples of the pace.
    expect(fireClockL(CHASE_HZ * 3)).toBe(FIRE_V_REF * 3);
  });

  it("drops a stall's backlog and resets", () => {
    const k = new FireClock();
    expect(k.advance(5)).toBe(MAX_STEPS_PER_ADVANCE);
    expect(k.advance(1 / CHASE_HZ)).toBe(1); // The backlog went.
    expect(k.ticks).toBe(MAX_STEPS_PER_ADVANCE + 1);
    k.reset();
    expect(k.ticks).toBe(0);
    expect(k.L).toBe(0);
    expect(k.advance(1 / (2 * CHASE_HZ))).toBe(0); // The partial tick went too.
  });
});

describe("the real-time fire's rules (K114 stage 2)", () => {
  it("leaves at the clock, arrives at L + len, and reads the arrival while moving", () => {
    const c = realtime();
    expect(c.fireL).toBe(0);
    expect(c.fireRacing).toBe(false);
    // Standing at the start before the first move loses nothing.
    expect(c.setFireNow(50)).toBe(false);
    c.setFireNow(0);
    expect(c.tapEdge(0)).toBe("advance"); // S -> A, leaves at 0.
    expect(c.fireRacing).toBe(true);
    expect([c.fireDepartL, c.fireArriveL]).toEqual([0, 2]);
    expect(c.fireL).toBe(2); // A tap now would leave on arrival.
    expect(c.fireLeadHere).toBe(2); // T(A) 4 - the arrival at 2.
    c.setFireNow(3); // Standing at A: the lead counts down.
    expect(c.fireL).toBe(3);
    expect(c.fireLeadHere).toBe(1);
    expect(c.tapEdge(1)).toBe("advance"); // A -> U leaves at 3.
    expect([c.fireDepartL, c.fireArriveL]).toEqual([3, 5]);
    // Closest: the first arrival's 2, then the departure from A at 3: 1.
    expect(c.fireClosest).toBe(1);
  });

  it("loses where you stand, at the first tick the fire reaches you", () => {
    const c = realtime();
    // Taps at once on arrival (queued): S -> A -> U, then stand at U.
    const plan = [0, 1];
    let lostAt = -1;
    let smolderAt = -1;
    c.setFireNow(0);
    c.tapEdge(plan.shift()!);
    for (let t = 1; t <= 200 && lostAt < 0; t++) {
      const L = fireClockL(t);
      if (plan.length > 0 && L >= c.fireArriveL) {
        c.setFireNow(c.fireArriveL); // The page lands the dot first.
        expect(c.tapEdge(plan.shift()!)).toBe("advance");
      }
      if (c.setFireNow(L)) lostAt = t;
      if (smolderAt < 0 && c.smoldering(3)) smolderAt = t;
    }
    // At U (arrived at L 4): U -> W is safe while L + 2 < T(W) 8, so it
    // smolders from L 6 while you stand; the fire reaches U at T(U) 8.
    expect(c.head).toBe("U");
    expect(fireClockL(smolderAt)).toBe(6);
    expect(fireClockL(lostAt)).toBe(8);
    expect(lostAt).toBe((8 * CHASE_HZ) / FIRE_V_REF);
    expect(c.fireLost).toBe(true);
    expect(c.fireClosest).toBe(0);
    expect(c.choices()).toEqual([]);
    expect(c.tapEdge(4)).toBe("noop");
    expect(c.fireRacing).toBe(false);
  });

  it("refuses a smoldering arm while you stand, before the loss", () => {
    const c = realtime();
    c.setFireNow(0);
    c.tapEdge(0);
    c.setFireNow(2);
    c.tapEdge(1); // At U from L 4.
    c.setFireNow(5.9);
    expect(c.smoldering(3)).toBe(false);
    c.setFireNow(6);
    expect(c.smoldering(3)).toBe(true);
    expect(c.tapEdge(3)).toBe("smolder");
    expect(c.fireLost).toBe(false);
    expect(c.choices()).toContain(3); // Smoldering, not burnt: still shown.
    expect(c.setFireNow(7.9)).toBe(false);
    expect(c.tapEdge(4)).toBe("win"); // The exit run stays safe (L + 6 < 20).
    expect(c.setFireNow(100)).toBe(false); // Won: the race is over.
    expect(c.fireLost).toBe(false);
  });

  it("loses a dead end by standing in it, not on arrival", () => {
    // D is a dead end: arriving there at L 7 leaves only the run back,
    // smoldering (7 + 3 >= T(W) 8), which loses at once on the turn clock.
    const c = realtime();
    c.setFireNow(0);
    c.tapEdge(0); // S -> A, 0 -> 2
    c.setFireNow(2);
    c.tapEdge(2); // A -> W, 2 -> 4
    c.setFireNow(4);
    expect(c.tapEdge(5)).toBe("advance"); // W -> D, 4 -> 7
    c.setFireNow(7);
    expect(c.fireLost).toBe(false);
    expect(c.smoldering(5)).toBe(true);
    let lostAt = -1;
    for (let t = 70; t <= 200 && lostAt < 0; t++) if (c.setFireNow(fireClockL(t))) lostAt = t;
    expect(fireClockL(lostAt)).toBe(14); // T(D) = 2 x 7.
    // The same taps on the turn clock lose on arriving at D.
    const turn = new FabricMazeController(c.walk, false, buildFire(c.walk, 0.5, 0));
    expect([turn.tapEdge(0), turn.tapEdge(2), turn.tapEdge(5)]).toEqual([
      "advance",
      "advance",
      "advance",
    ]);
    expect(turn.fireLost).toBe(true);
  });

  it("replays with no thinking time: L is walkedDist, nothing lost by standing", () => {
    const c = realtime();
    expect(c.replay([0, 2, 3, 4])).toBe(true); // S A W U X
    expect(c.solved).toBe(true);
    expect(c.fireArriveL).toBe(c.walkedDist);
    // Departures at each arrival: the closest call is the arrivals' least,
    // T(v) - walkedDist(v): A 4-2, W 8-4, U 8-6, X 20-12.
    expect(c.fireClosest).toBe(2);
  });

  it("never lets the fire reach the dot mid-run (generated mazes, r < 1)", () => {
    let runsChecked = 0;
    let losses = 0;
    for (const seed of [3, 7, 11, 19]) {
      const walk = walkFor(seed, 0.5);
      for (const [r, h] of [
        [0.5, 0],
        [0.75, 0],
        [0.95, 0],
        [0.75, 6],
      ]) {
        const fire = buildFire(walk, r, h, "realtime");
        const c = new FabricMazeController(walk, false, fire);
        let rng = seed * 7919 + Math.round(r * 100) + h;
        const rand = (): number => {
          rng = (rng * 1103515245 + 12345) % 2147483648;
          return rng / 2147483648;
        };
        let from = c.head;
        let eid = -1;
        let wait = 0; // Ticks still to think at the head.
        for (let t = 0; t < 6000; t++) {
          const L = fireClockL(t);
          if (c.solved || c.fireLost) break;
          if (eid >= 0 && L < c.fireArriveL) {
            // Moving: the dot is x along run eid from `from`.
            const e = walk.edges[eid];
            const far = e.va === from ? e.vb : e.va;
            const x = L - c.fireDepartL;
            const a = fire.dist.get(from)! + x;
            const b = fire.dist.get(far)! + e.length - x;
            const tPoint = h + (a < b ? a : b) / r;
            expect(tPoint).toBeGreaterThan(L);
            expect(c.setFireNow(L)).toBe(false);
            continue;
          }
          if (c.setFireNow(L)) {
            losses++;
            expect(fireTime(fire, c.head)).toBeLessThanOrEqual(L);
            break;
          }
          if (wait > 0) {
            wait--;
            continue;
          }
          const safe = c.choices().filter((id) => !c.smoldering(id));
          if (safe.length === 0) continue; // Stand until the fire comes.
          from = c.head;
          eid = safe[Math.floor(rand() * safe.length)];
          expect(["advance", "backtrack", "win"]).toContain(c.tapEdge(eid));
          runsChecked++;
          wait = Math.floor(rand() * 12);
        }
      }
    }
    expect(runsChecked).toBeGreaterThan(100);
    expect(losses).toBeGreaterThan(0); // Some walks do get caught standing.
  });
});
