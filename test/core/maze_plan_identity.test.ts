import { describe, it, expect, vi } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import {
  buildMazePlan,
  DEFAULT_MAZE_PARAMS,
  planReachesAll,
  planTailsJoined,
} from "../../src/core/maze_plan";
import type { MazeParams, MazePlan } from "../../src/core/maze_plan";
import { ANCHORS, SHAPES, planAnchors } from "../../src/core/shapes";
import type { TangleGraph } from "../../src/core/types";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";
import type { UrlParams } from "../../src/ui/url_state";
import { dailyParams } from "../../src/ui/daily_link";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { walkFingerprint } from "../../src/game/daily_attempt";
import { searchGreedyTrapPlan, trapOptionsOf } from "../../src/core/greedy_search";
import { buildMazePlan as buildMazePlanV1 } from "./fixtures/maze_plan_v1";

// K697: 11-24 s a file when the machine is idle, 45-60 s beside parallel
// agents' suites, past vitest.config.ts's 30 s.
vi.setConfig({ testTimeout: 120_000 });

// K87: the incremental pickFarthest must pick exactly what the full rescan
// did - every link and daily was built with it. Whole plans, today's module
// vs the frozen pre-K87 one, built from the inputs main.ts rebuild() uses:
// defaults at three sizes for every shape (dead ends off and on), random
// knobs across their panel ranges, dense maps at the tightest spacing, and
// the first dailies. (.claude/probes/K87/identity.ts runs the same check
// over 415 cases up to gs 24; the frozen rescan is too slow for that here.)
// A DELIBERATE plan change (K86's dead-end placement, a new daily version)
// moves mazes on purpose: it must keep its default path equal to this pin,
// or re-freeze the fixture from the new module and say so in its commit.
// Two standing exceptions, each case listed below: K109 rebuilds a plan
// whose start cannot reach its exit, and K110 appends joins to a plan whose
// start cannot reach every piece, or moves its exit when no join can.
// K74 (2026-10-13, pre-launch) moved the defaults in place: exit clearance
// 12, dead ends on as long tails. The frozen module knows no long tails, so
// this pin runs on the inputs it was frozen with (PRE_K74; at deadEndLength
// 0 today's module takes the old placement), and the K74 pin below
// fingerprints whole plans at the new defaults.

// The maze knobs every link and daily had before K74. K323 removed the
// deadEnds switch (density 0 is its off); cases still carry it, so the pin's
// params type keeps it beside UrlParams.
type PinParams = UrlParams & { deadEnds?: boolean };
const PRE_K74: Partial<PinParams> = {
  exitClearance: 5,
  deadEnds: false,
  deadEndDensity: 0.25,
  deadEndLength: 0,
  hCutShare: 0,
  exitCorridor: 0,
  exitFlank: "stub",
  exitTaperRadius: 0,
  exitTaperStrength: 0,
  greedyTrap: "off",
};
const BASE: PinParams = { ...PARAM_DEFAULTS, ...PRE_K74, seed: 0 };

function graphOf(p: UrlParams): TangleGraph {
  return generateLatticeKnotwork({
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    randSeed: p.seed,
    shape: p.shape,
  });
}

function mazeParamsOf(p: PinParams): MazeParams {
  return {
    ...DEFAULT_MAZE_PARAMS,
    branchDensity: p.branchDensity,
    fourWayFraction: p.fourWayFraction,
    // K323: cases still carry the old switch; density 0 is its off.
    deadEndDensity: p.deadEnds === false ? 0 : p.deadEndDensity,
    deadEndLength: p.deadEndLength,
    hCutShare: p.hCutShare,
    exitCorridor: p.exitCorridor,
    exitFlank: p.exitFlank,
    exitTaperRadius: p.exitTaperRadius,
    exitTaperStrength: p.exitTaperStrength,
    greedyTrap: p.greedyTrap ?? "off",
    trapTargetF: p.trapTargetF ?? 2.5,
    trapTargetH: p.trapTargetH ?? 3.5,
    trapMaxF: p.trapMaxF ?? 6,
    trapMaxH: p.trapMaxH ?? 8,
    trapMaxGrow: p.trapMaxGrow ?? 1.15,
    trapRadius: p.trapRadius ?? 20,
    trapIters: p.trapIters ?? 12,
    trapTries: p.trapTries ?? 8,
    trapSurplus: p.trapSurplus ?? 1.25,
    entranceClearance: p.entranceClearance,
    exitClearance: p.exitClearance,
    junctionSpacing: p.junctionSpacing,
    ...planAnchors(p.shape, p.gridSize, p.startAnchor, p.exitAnchor),
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Panel steps: knobs land on the values a slider can write.
const step = (x: number, s: number): number => Math.round(x / s) * s;

function cases(): [string, PinParams][] {
  const rng = mulberry32(87);
  const seed = (): number => Math.floor(rng() * 2147483647);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
  const out: [string, PinParams][] = [];
  for (const deadEnds of [false, true]) {
    for (const gridSize of [6, 12, 18]) {
      for (const shape of SHAPES) {
        out.push([
          `defaults gs ${gridSize} ${shape}${deadEnds ? " +de" : ""}`,
          { ...BASE, gridSize, shape, deadEnds, seed: seed() },
        ]);
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    out.push([
      `random ${i}`,
      {
        ...BASE,
        gridSize: 4 + Math.floor(rng() * 13),
        weaveDensity: rng() < 0.5 ? BASE.weaveDensity : step(rng(), 0.05),
        turnBias: rng() < 0.5 ? BASE.turnBias : step(rng(), 0.05),
        seed: seed(),
        shape: pick(SHAPES),
        startAnchor: pick(ANCHORS),
        exitAnchor: pick(ANCHORS),
        branchDensity: step(rng(), 0.05),
        fourWayFraction: rng() < 0.2 ? pick([0, 1]) : step(rng(), 0.05),
        deadEnds: rng() < 0.5,
        deadEndDensity: Math.max(0.05, step(rng(), 0.05)),
        entranceClearance: step(rng() * 6, 0.5),
        exitClearance: step(rng() * 8, 0.5),
        junctionSpacing: Math.max(0.5, step(0.5 + rng() * 3.5, 0.25)),
      },
    ]);
  }
  for (const shape of ["rect", "heart", "ring"] as const) {
    out.push([
      `dense gs 14 ${shape}`,
      {
        ...BASE,
        gridSize: 14,
        shape,
        seed: seed(),
        branchDensity: 1,
        fourWayFraction: 0.5,
        deadEnds: true,
        deadEndDensity: 1,
        entranceClearance: 0,
        exitClearance: 0,
        junctionSpacing: 0.5,
      },
    ]);
  }
  for (let n = 1; n <= 3; n++) out.push([`daily ${n}`, { ...dailyParams(n), ...PRE_K74 }]);
  return out;
}

describe("maze plan identity (K87)", () => {
  it("builds the same plan as the frozen pre-K87 module", () => {
    const diffs: string[] = [];
    const repaired: string[] = [];
    const joined: string[] = [];
    for (const [label, p] of cases()) {
      const params = mazeParamsOf(p);
      const old = buildMazePlanV1(graphOf(p), params) as MazePlan;
      const plan = buildMazePlan(graphOf(p), params);
      if (JSON.stringify(old) === JSON.stringify(plan)) continue;
      // K109 rebuilds a plan on purpose only when its start has no route to
      // its exit (the model agrees with the walk graph: maze_solvable), and
      // K110 only when its start cannot reach every piece (maze_reachable).
      const name = `${label} seed ${p.seed}`;
      if (!planTailsJoined(graphOf(p), old) && planTailsJoined(graphOf(p), plan)) {
        repaired.push(name);
      } else if (!planReachesAll(graphOf(p), old) && planReachesAll(graphOf(p), plan)) {
        joined.push(name);
      } else {
        diffs.push(name);
      }
    }
    expect(diffs).toEqual([]);
    expect(repaired).toEqual(["defaults gs 6 tree seed 85281462"]);
    // fish gs6, rect gs4 (anchors s/e) and ring gs11 gain one splice; fish
    // gs5 (anchors nw/nw) moves its exit.
    expect(joined).toEqual([
      "random 4 seed 328166740",
      "random 11 seed 1965927457",
      "random 19 seed 1754180087",
      "random 22 seed 951815187",
    ]);
  });
});

// K74: whole plans at the new defaults (long-tail dead ends, exit clearance
// 12), as change detectors. A deliberate plan change re-freezes this map
// and its commit names the cases that moved; a refactor keeps it.
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function k74Cases(): [string, PinParams][] {
  const rng = mulberry32(74);
  const seed = (): number => Math.floor(rng() * 2147483647);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
  const out: [string, PinParams][] = [];
  for (const gridSize of [6, 12, 18]) {
    for (const shape of SHAPES) {
      out.push([`defaults gs ${gridSize} ${shape}`, { ...PARAM_DEFAULTS, gridSize, shape, seed: seed() }]);
    }
  }
  for (let i = 0; i < 12; i++) {
    out.push([
      `random ${i}`,
      {
        ...PARAM_DEFAULTS,
        gridSize: 4 + Math.floor(rng() * 15),
        weaveDensity: rng() < 0.5 ? PARAM_DEFAULTS.weaveDensity : step(rng(), 0.05),
        turnBias: rng() < 0.5 ? PARAM_DEFAULTS.turnBias : step(rng(), 0.05),
        seed: seed(),
        shape: pick(SHAPES),
        startAnchor: pick(ANCHORS),
        exitAnchor: pick(ANCHORS),
        branchDensity: step(rng(), 0.05),
        fourWayFraction: rng() < 0.2 ? pick([0, 1]) : step(rng(), 0.05),
        deadEnds: rng() < 0.75,
        deadEndDensity: Math.max(0.05, step(rng(), 0.05)),
        deadEndLength: Math.floor(rng() * 41),
        entranceClearance: step(rng() * 6, 0.5),
        exitClearance: step(rng() * 20, 0.5),
        junctionSpacing: Math.max(0.5, step(0.5 + rng() * 3.5, 0.25)),
      },
    ]);
  }
  for (const shape of ["rect", "heart", "ring"] as const) {
    out.push([
      `dense gs 14 ${shape}`,
      {
        ...PARAM_DEFAULTS,
        gridSize: 14,
        shape,
        seed: seed(),
        branchDensity: 1,
        fourWayFraction: 0.5,
        deadEnds: true,
        deadEndDensity: 1,
        deadEndLength: 40,
        entranceClearance: 0,
        exitClearance: 0,
        junctionSpacing: 0.5,
      },
    ]);
  }
  for (let n = 1; n <= 3; n++) out.push([`daily ${n}`, dailyParams(n)]);
  return out;
}

// Frozen 2026-10-13 (K74 stage 1: density 0.5, length 20, clearance 12).
// Re-frozen 2026-10-16 by K74 stage 3: corridor 24 + away flank at the defaults move most plans; K74_WALKS_H0 moves too (it keeps the stage-3 plan, H1 off).
// Re-frozen 2026-10-14 by K74 stage 2: every plan now carries hCutShare 1
// (H1 runs after the plan, in applyMazeCuts). Nothing else moved: without
// that field each plan hashed to its stage-1 value.
const K74_PLANS: Record<string, string> = {
  "defaults gs 6 rect": "76bb2af2",
  "defaults gs 6 heart": "4458e97d",
  "defaults gs 6 star": "66471f06",
  "defaults gs 6 fish": "14e54a99",
  "defaults gs 6 tree": "08c336ba",
  "defaults gs 6 ring": "381e7fc6",
  "defaults gs 6 circle": "4a46f792",
  "defaults gs 12 rect": "5b0aef00",
  "defaults gs 12 heart": "cba97a45",
  "defaults gs 12 star": "154e0559",
  "defaults gs 12 fish": "1ba7a6e7",
  "defaults gs 12 tree": "244eeeb4",
  "defaults gs 12 ring": "4e178d36",
  "defaults gs 12 circle": "ce02452a",
  "defaults gs 18 rect": "75bff582",
  "defaults gs 18 heart": "6991c281",
  "defaults gs 18 star": "1cbf0e33",
  "defaults gs 18 fish": "81e50f1c",
  "defaults gs 18 tree": "ddd74e6b",
  "defaults gs 18 ring": "af970720",
  "defaults gs 18 circle": "5834d0ef",
  "random 0": "95670e02",
  "random 1": "aa916ba8",
  "random 2": "e6c0a34c",
  "random 3": "53a9cd6f",
  "random 4": "3a943951",
  "random 5": "f6bd7f5b",
  "random 6": "902291d7",
  "random 7": "4babf4d0",
  "random 8": "772363d6",
  "random 9": "4a017023",
  "random 10": "4f5e079b",
  "random 11": "4cc5a143",
  "dense gs 14 rect": "f1e1db2c",
  "dense gs 14 heart": "84877d7b",
  "dense gs 14 ring": "63d60d39",
  "daily 1": "d7b5a7ac",
  "daily 2": "5110520b",
  "daily 3": "89e2c3c4",
};

describe("maze plan at the K74 defaults", () => {
  it("builds the pinned plans, each reaching every piece", () => {
    const got: Record<string, string> = {};
    for (const [label, p] of k74Cases()) {
      const plan = buildMazePlan(graphOf(p), mazeParamsOf(p));
      expect(planReachesAll(graphOf(p), plan), label).toBe(true);
      got[label] = fnv(JSON.stringify(plan));
    }
    expect(got).toEqual(K74_PLANS);
  });
});

// K74 stage 2: the APPLIED maze. H1 (the fused arm cut, hCutShare) runs
// after the plan, so the plan pin above cannot see it: this pins the walk
// graph each case builds (K47's walkFingerprint: size, start and exit, every
// run's ends and length), with H1 off and at today's share. Share 0 is the
// maze every link built before stage 2; a re-freeze names what moved.
const K74_WALKS_H0: Record<string, string> = {
  "daily 1": "w1.189.283.5436b1cb",
  "daily 2": "w1.185.273.134e1df8",
  "daily 3": "w1.183.273.84da61ea",
  "defaults gs 12 circle": "w1.42.59.2f3a042d",
  "defaults gs 12 fish": "w1.14.19.f214e9e2",
  "defaults gs 12 heart": "w1.17.23.dfd6d68f",
  "defaults gs 12 rect": "w1.73.106.772a70de",
  "defaults gs 12 ring": "w1.32.44.e23bed94",
  "defaults gs 12 star": "w1.10.13.f14a9244",
  "defaults gs 12 tree": "w1.22.30.70706dc6",
  "defaults gs 18 circle": "w1.128.188.8ea37b00",
  "defaults gs 18 fish": "w1.51.73.a0cc803b",
  "defaults gs 18 heart": "w1.70.102.606caa35",
  "defaults gs 18 rect": "w1.181.269.1e4808a1",
  "defaults gs 18 ring": "w1.87.124.6f465415",
  "defaults gs 18 star": "w1.54.77.1e8c05d0",
  "defaults gs 18 tree": "w1.74.107.204890c1",
  "defaults gs 6 circle": "w1.6.7.615c9738",
  "defaults gs 6 fish": "w1.6.7.c2983d87",
  "defaults gs 6 heart": "w1.6.7.c8ec8c3b",
  "defaults gs 6 rect": "w1.10.12.05c90d7d",
  "defaults gs 6 ring": "w1.12.16.aeedd081",
  "defaults gs 6 star": "w1.8.10.1616014d",
  "defaults gs 6 tree": "w1.4.4.b304cbe2",
  "dense gs 14 heart": "w1.236.350.5bf3901c",
  "dense gs 14 rect": "w1.475.709.219ca267",
  "dense gs 14 ring": "w1.196.300.16cfd565",
  "random 0": "w1.6.7.c507f54a",
  "random 1": "w1.6.7.5b4e0c12",
  "random 10": "w1.16.21.3cb30ebb",
  "random 11": "w1.4.4.5a0d3663",
  "random 2": "w1.5.4.fa474055",
  "random 3": "w1.55.80.41299285",
  "random 4": "w1.6.7.205dcc6d",
  "random 5": "w1.22.30.eb491692",
  "random 6": "w1.26.40.8f7ab681",
  "random 7": "w1.28.48.63fe8210",
  "random 8": "w1.24.33.5040806e",
  "random 9": "w1.18.26.ab00b511",
};
// Same sizes as share 0: a fused cut moves one branch point (B becomes a
// turn, X a junction), so only the runs' ends and lengths change.
const K74_WALKS_DEFAULT: Record<string, string> = {
  "daily 1": "w1.189.283.ba405cd2",
  "daily 2": "w1.185.273.78d9a670",
  "daily 3": "w1.183.273.7a9eed00",
  "defaults gs 12 circle": "w1.42.59.35e13d6e",
  "defaults gs 12 fish": "w1.14.19.f214e9e2",
  "defaults gs 12 heart": "w1.17.23.d6a1a03b",
  "defaults gs 12 rect": "w1.73.106.35515aa3",
  "defaults gs 12 ring": "w1.32.44.ccc1ff73",
  "defaults gs 12 star": "w1.10.13.f14a9244",
  "defaults gs 12 tree": "w1.22.30.58c6188f",
  "defaults gs 18 circle": "w1.128.188.4c5feccd",
  "defaults gs 18 fish": "w1.51.73.22470579",
  "defaults gs 18 heart": "w1.70.102.aacc0aa2",
  "defaults gs 18 rect": "w1.181.269.da7aea06",
  "defaults gs 18 ring": "w1.87.124.938653d0",
  "defaults gs 18 star": "w1.54.77.824b8fc0",
  "defaults gs 18 tree": "w1.74.107.41c8ee14",
  "defaults gs 6 circle": "w1.6.7.615c9738",
  "defaults gs 6 fish": "w1.6.7.c2983d87",
  "defaults gs 6 heart": "w1.6.7.c8ec8c3b",
  "defaults gs 6 rect": "w1.10.12.05c90d7d",
  "defaults gs 6 ring": "w1.12.16.aeedd081",
  "defaults gs 6 star": "w1.8.10.1616014d",
  "defaults gs 6 tree": "w1.4.4.b304cbe2",
  "dense gs 14 heart": "w1.236.350.5bf3901c",
  "dense gs 14 rect": "w1.475.709.ed7bff83",
  "dense gs 14 ring": "w1.196.300.16cfd565",
  "random 0": "w1.6.7.c507f54a",
  "random 1": "w1.6.7.5b4e0c12",
  "random 10": "w1.16.21.7be9ea66",
  "random 11": "w1.4.4.5a0d3663",
  "random 2": "w1.5.4.fa474055",
  "random 3": "w1.55.80.2887171e",
  "random 4": "w1.6.7.205dcc6d",
  "random 5": "w1.22.30.cf7cccc4",
  "random 6": "w1.26.40.5d14ed3b",
  "random 7": "w1.28.48.054eb0a0",
  "random 8": "w1.24.33.5040806e",
  "random 9": "w1.18.26.59e17ceb",
};

function appliedWalk(p: UrlParams): string {
  const g = graphOf(p);
  const plan = buildMazePlan(graphOf(p), mazeParamsOf(p));
  applyMazeCuts(g, plan, applyMazePlan(g, plan));
  return walkFingerprint(buildWalkGraph(g)!);
}

// K74 stage 4 (K527): the searched maze (greedyTrap on, H1-in-loop) for
// the first dailies, pinned so a later refactor cannot move a published
// searched maze silently. Daily 1 and 2 need no cut (they match the
// stage-2 defaults above); daily 3 loses 12 junctions to the search.
const K74_WALKS_SEARCHED: Record<string, string> = {
  "daily 1": "w1.189.283.ba405cd2",
  "daily 2": "w1.185.273.78d9a670",
  "daily 3": "w1.171.255.07bb0055",
};

function searchedWalk(p: UrlParams): string {
  const mp = mazeParamsOf(p);
  const gen = {
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    randSeed: p.seed,
    shape: p.shape,
  };
  const plan = searchGreedyTrapPlan(gen, buildMazePlan(graphOf(p), mp), trapOptionsOf(mp));
  const g = graphOf(p);
  applyMazeCuts(g, plan, applyMazePlan(g, plan));
  const wg = buildWalkGraph(g)!;
  expect(Number.isFinite(wg.optimalLength)).toBe(true);
  expect(planReachesAll(graphOf(p), plan)).toBe(true);
  return walkFingerprint(wg);
}

describe("searched maze at the K74 stage 4 defaults (greedyTrap on)", () => {
  it("builds the pinned searched walk graphs for dailies 1-3", () => {
    expect(PARAM_DEFAULTS.greedyTrap).toBe("off");
    const got: Record<string, string> = {};
    for (let n = 1; n <= 3; n++) got[`daily ${n}`] = searchedWalk(dailyParams(n));
    expect(got).toEqual(K74_WALKS_SEARCHED);
  });
});

describe("applied maze at the K74 defaults (stage 2, H1)", () => {
  it("builds the pinned walk graphs with H1 off and at the default share", () => {
    expect(PARAM_DEFAULTS.hCutShare).toBe(1);
    const off: Record<string, string> = {};
    const on: Record<string, string> = {};
    for (const [label, p] of k74Cases()) {
      off[label] = appliedWalk({ ...p, hCutShare: 0 });
      on[label] = appliedWalk(p);
    }
    expect(off).toEqual(K74_WALKS_H0);
    expect(on).toEqual(K74_WALKS_DEFAULT);
  });
});
