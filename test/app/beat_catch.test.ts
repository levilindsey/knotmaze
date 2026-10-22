// K774: a catch on the beat lands, exactly once.
//
// Under clock=beat with the turn minotaur a catch was counted (the model's
// `catches`) but never landed: no HUD row, toast, heart or banner. A catch
// is decided at the tap and shown at its contact moment: main.ts defers it
// (`pendingCatch`, t = lastContact.t) and tickTurnMino lands it once the
// move animation reaches t. On the beat, BeatRider.advance commits the next
// run in the SAME call that reaches the junction, so moveAlong's beginMove
// snapped the catching move's animation before any frame saw it reach
// t = 1. The controller, not yet respawned, took that departure (a phantom
// move), while the minotaur, whose player was already at the start, refused
// it and every later turn.
//
// The harness drives the real beat frame (app/beat_frame.ts: the head
// check, BeatRider.advance, the progress) on a fake clock, two ticks a
// 60 Hz frame. Its deps mirror main.ts's catch path, reduced to what
// decides it: moveAlong (tapEdge, turnAfterMove, deferCatch, beginMove),
// the renderer's move animation (moveProgress, beginMove's snap,
// setMoveProgress, stopMove), tickTurnMino's landing and turnCaught's
// respawn. `fixed` turns on K774's two main.ts changes: moveAlong lands a
// pending catch before any move (the dot set at the contact first), and
// turnCaught rests the rider at the new head. The third change is
// BeatRider's own (a rest inside a commit ends the advance); it runs in
// both flows, and the old flow never rests inside a commit.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBeat } from "../../src/app/beat_frame";
import type { BeatFrame } from "../../src/app/beat_frame";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEAD_END_DENSITY_ON, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { beatTick } from "../../src/game/beat_clock";
import { BeatRider } from "../../src/game/beat_rider";
import type { BeatTiming } from "../../src/game/beat_rider";
import { FabricMazeController } from "../../src/game/fabric_controller";
import { DEFAULT_TURN_MINO, turnConfig, TurnMinotaur, turnSeed } from "../../src/game/minotaur_turns";
import { walkerMapOf } from "../../src/game/walker";
import type { WalkerMap } from "../../src/game/walker";
import { SeededRNG } from "../../src/util/random";

// A real maze (beat_rider.test.ts's realMaze) and its walker map.
function realMaze(seed: number): { walk: WalkGraph; map: WalkerMap } {
  const g = generateLatticeKnotwork({ gridSize: 10, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: DEAD_END_DENSITY_ON });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  const walk = buildWalkGraph(g)!;
  return { walk, map: walkerMapOf(g, walk) };
}

// The beat frame reads performance.now() each frame.
let now = 1000;
beforeEach(() => {
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => {
  vi.restoreAllMocks();
});

type Flow = "old" | "fixed";

interface Tally {
  // main.ts's pendingCatch.
  pending: { t: number; wait: boolean } | null;
  // The renderer's move animation: how far the dot is along its run, null
  // with none (moveProgress then reads 1).
  anim: number | null;
  // turnCaught calls, and those made inside a commit (moveAlong's landing).
  landed: number;
  landedInCommit: number;
  // Moves the controller took while a catch was pending, and how far the
  // first one found the catching move's animation when it snapped it.
  phantoms: number;
  snappedAt: number;
  // Runs the minotaur refused ("reject": out of step with the controller).
  rejects: number;
  // Commits the rider tried after a landing inside the same advance.
  commitsAfterLanding: number;
}

interface Game {
  walk: WalkGraph;
  c: FabricMazeController;
  tm: TurnMinotaur;
  beat: BeatFrame;
  s: Tally;
  frame(): void;
  hud(): number;
  done(): boolean;
}

// K795: timing "length" is K114's multi-beat runs (the rule K774 was found
// on); "even" with one beat per run is the beat's default since K795.
function makeGame(seed: number, flow: Flow, timing: BeatTiming = "length"): Game {
  const { walk, map } = realMaze(seed);
  const c = new FabricMazeController(walk, false);
  const tm = new TurnMinotaur(walk, turnConfig({ ...DEFAULT_TURN_MINO, model: "hunter" }), turnSeed(seed));
  const rng = new SeededRNG(seed * 7919 + 1);
  const s: Tally = {
    pending: null,
    anim: null,
    landed: 0,
    landedInCommit: 0,
    phantoms: 0,
    snappedAt: NaN,
    rejects: 0,
    commitsAfterLanding: 0,
  };
  let beatDriving = false;
  let landedThisAdvance = false;

  // The renderer: setMoveProgress moves the dot; at 1 the move has arrived.
  const setMoveProgress = (f: number): void => {
    if (s.anim === null) return;
    s.anim = f >= 1 ? null : f;
  };
  // main.ts turnCaught(wait, true), lives and minoRestart off.
  const turnCaught = (wait: boolean): void => {
    tm.finishCatchAnim();
    c.markCaught(wait);
    s.anim = null; // stopMove: the dot stays where it reached
    c.respawn(false);
    if (flow === "fixed") beat.rider()?.restAt(c.head);
    s.landed++;
  };
  // main.ts moveAlong, with turnAfterMove and deferCatch inlined.
  const moveAlong = (run: number): boolean => {
    if (!beatDriving) return beat.queue(run);
    if (flow === "fixed" && s.pending) {
      const { t, wait } = s.pending;
      s.pending = null;
      setMoveProgress(t);
      turnCaught(wait);
      s.landedInCommit++;
      landedThisAdvance = true;
      return false;
    }
    const r = c.tapEdge(run);
    if (r !== "advance" && r !== "backtrack" && r !== "win") return false;
    if (s.pending) {
      if (s.phantoms === 0) s.snappedAt = s.anim ?? 1;
      s.phantoms++;
    }
    const tr = tm.turn(run);
    if (tr === "reject") s.rejects++;
    if (tr === "caught") {
      if (!tm.lastContact) {
        turnCaught(false);
        return true;
      }
      s.pending = { t: tm.lastContact.t, wait: false };
    }
    s.anim = 0; // beginMove: the old animation snaps, the new one starts
    return true;
  };

  const beat = createBeat({
    settings: () => ({ tempo: 100, unit: 2, cap: 4, timing, perRun: 1 }),
    walkKey: () => walk,
    buildMap: () => map,
    head: () => c.head,
    commit: (run) => {
      if (landedThisAdvance) s.commitsAfterLanding++;
      beatDriving = true;
      try {
        return moveAlong(run);
      } finally {
        beatDriving = false;
      }
    },
    progress: (f) => setMoveProgress(f),
    animating: () => s.anim !== null,
    audio: () => null,
    note: () => {},
  });

  // The player: a tap on an arm of the junction ahead now and then, and at
  // once whenever the dot rests (the first move, and after a catch).
  const tap = (): void => {
    const r = beat.rider();
    const resting = r === null || (!r.riding && r.startBeat < 0);
    if (!resting && rng.next() >= 0.02) return;
    const arms = walk.vertices.get(r ? r.ahead : c.head)!.edges;
    moveAlong(arms[rng.nextInt(arms.length)]);
  };

  // main.ts's frame: tickBeat, then tickTurnMino.
  const frame = (): void => {
    tap();
    now += 1000 / 60;
    landedThisAdvance = false;
    beat.tick(1 / 60);
    landedThisAdvance = false;
    const frac = s.anim ?? 1;
    tm.setProgress(frac);
    if (s.pending && frac >= s.pending.t) {
      const w = s.pending.wait;
      s.pending = null;
      turnCaught(w);
    }
  };

  return {
    walk,
    c,
    tm,
    beat,
    s,
    frame,
    // main.ts:1361: the HUD subtracts a catch still travelling.
    hud: () => tm.catches - (s.pending ? 1 : 0),
    done: () => c.solved || tm.finished,
  };
}

describe("K774: a catch on the beat", () => {
  it("reproduces the bug on the old flow: the departure snaps the catching move and the catch never lands", () => {
    let cases = 0;
    for (let seed = 1; seed <= 40 && cases < 3; seed++) {
      const g = makeGame(seed, "old");
      g.frame(); // the rider is built and the first tap queued
      for (let f = 0; f < 30000 && !g.done() && !g.s.pending; f++) g.frame();
      if (!g.s.pending || g.s.pending.t !== 1) continue;
      cases++;
      expect(g.tm.catches).toBe(1);
      expect(g.hud()).toBe(0);
      // Long enough for the catching run to arrive (a run is at most four
      // beats, 288 ticks) and the rider to ride on.
      for (let k = 0; k < 600 && !g.c.solved; k++) g.frame();
      expect(g.s.landed).toBe(0);
      expect(g.s.pending).not.toBeNull();
      expect(g.hud()).toBe(g.tm.catches - 1);
      // The arrival's own advance took the next run: the controller moved
      // (it was never respawned) and the animation snapped short of t = 1.
      expect(g.s.phantoms).toBeGreaterThan(0);
      expect(g.s.snappedAt).toBeLessThan(1);
      // The minotaur's player is at the start, so it refused that run.
      expect(g.s.rejects).toBeGreaterThan(0);
    }
    expect(cases).toBeGreaterThan(0);
  });

  it.each(["length", "even"] as BeatTiming[])("lands every catch exactly once on the fixed flow, and the rider rests at the start (%s)", (timing) => {
    let catches = 0;
    let inCommit = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const g = makeGame(seed, "fixed", timing);
      g.frame();
      for (let f = 0; f < 30000 && !g.done(); f++) {
        const landed = g.s.landed;
        g.frame();
        if (g.s.landed !== landed) {
          expect(g.s.landed).toBe(landed + 1);
          // Landed: counted once, the player back at the entrance, the dot
          // at rest there until the next tap.
          expect(g.hud()).toBe(g.tm.catches);
          expect(g.c.head).toBe(g.walk.start);
          const r = g.beat.rider()!;
          expect(r.riding).toBe(false);
          expect(r.ahead).toBe(g.walk.start);
        }
      }
      // Every counted catch landed once (or is still travelling to its
      // contact when the frames ran out); one respawn each.
      expect(g.s.landed + (g.s.pending ? 1 : 0)).toBe(g.tm.catches);
      expect(g.c.respawns).toBe(g.s.landed);
      expect(g.s.phantoms).toBe(0);
      expect(g.s.rejects).toBe(0);
      expect(g.s.commitsAfterLanding).toBe(0);
      catches += g.tm.catches;
      inCommit += g.s.landedInCommit;
    }
    // The games caught the player, and some catches came to the landing
    // the old flow lost (the arrival and the departure in one advance).
    expect(catches).toBeGreaterThan(0);
    expect(inCommit).toBeGreaterThan(0);
  });
});

describe("BeatRider: a rest inside a commit", () => {
  it("ends the advance there, whatever the commit returns", () => {
    const { walk, map } = realMaze(3);
    for (const took of [false, true]) {
      const r = new BeatRider(map, 100, 2, 4, walk.start);
      r.queue(walk.vertices.get(walk.start)!.edges[0], 0);
      expect(r.advance(beatTick(1, 100), () => true).length).toBe(1);
      let calls = 0;
      const out = r.advance(r.t1, () => {
        calls++;
        r.restAt(walk.start); // a catch's respawn, landed from inside it
        return took;
      });
      expect(calls).toBe(1);
      expect(out).toEqual([]);
      expect(r.riding).toBe(false);
      expect(r.ahead).toBe(walk.start);
      expect(r.startBeat).toBe(-1);
      // At rest it waits for a tap.
      expect(r.advance(r.t1 + 1000, () => true)).toEqual([]);
    }
  });
});
