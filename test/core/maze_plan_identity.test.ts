import { describe, it, expect } from "vitest";
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
import { buildMazePlan as buildMazePlanV1 } from "./fixtures/maze_plan_v1";

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

// The maze knobs every link and daily had before K74.
const PRE_K74: Partial<UrlParams> = {
  exitClearance: 5,
  deadEnds: false,
  deadEndDensity: 0.25,
  deadEndLength: 0,
  hCutShare: 0,
};
const BASE: UrlParams = { ...PARAM_DEFAULTS, ...PRE_K74 };

function graphOf(p: UrlParams): TangleGraph {
  return generateLatticeKnotwork({
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    randSeed: p.seed,
    shape: p.shape,
  });
}

function mazeParamsOf(p: UrlParams): MazeParams {
  return {
    ...DEFAULT_MAZE_PARAMS,
    branchDensity: p.branchDensity,
    fourWayFraction: p.fourWayFraction,
    deadEndDensity: p.deadEnds ? p.deadEndDensity : 0,
    deadEndLength: p.deadEndLength,
    hCutShare: p.hCutShare,
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

function cases(): [string, UrlParams][] {
  const rng = mulberry32(87);
  const seed = (): number => Math.floor(rng() * 2147483647);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
  const out: [string, UrlParams][] = [];
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

function k74Cases(): [string, UrlParams][] {
  const rng = mulberry32(74);
  const seed = (): number => Math.floor(rng() * 2147483647);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
  const out: [string, UrlParams][] = [];
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
const K74_PLANS: Record<string, string> = {
  "defaults gs 6 rect": "7b563d74",
  "defaults gs 6 heart": "0b0fac62",
  "defaults gs 6 star": "883b1be7",
  "defaults gs 6 fish": "111bb54c",
  "defaults gs 6 tree": "d23ceb71",
  "defaults gs 6 ring": "c4fa9557",
  "defaults gs 6 circle": "3f66e608",
  "defaults gs 12 rect": "120f9213",
  "defaults gs 12 heart": "4fac7bae",
  "defaults gs 12 star": "1d556bf4",
  "defaults gs 12 fish": "793cc31f",
  "defaults gs 12 tree": "4922ff83",
  "defaults gs 12 ring": "649821fd",
  "defaults gs 12 circle": "dbd382a5",
  "defaults gs 18 rect": "5c0d5b57",
  "defaults gs 18 heart": "37507333",
  "defaults gs 18 star": "7c536956",
  "defaults gs 18 fish": "fd440c11",
  "defaults gs 18 tree": "38f06473",
  "defaults gs 18 ring": "6d18dee6",
  "defaults gs 18 circle": "709917a2",
  "random 0": "810bf278",
  "random 1": "1f52a4ac",
  "random 2": "f80b1c9a",
  "random 3": "1efc8767",
  "random 4": "62511e2b",
  "random 5": "8fb42d01",
  "random 6": "4f99d6a8",
  "random 7": "a784159c",
  "random 8": "a0c1914d",
  "random 9": "5bc0c0a2",
  "random 10": "874a505e",
  "random 11": "e38cd98e",
  "dense gs 14 rect": "18509faa",
  "dense gs 14 heart": "4923691a",
  "dense gs 14 ring": "5a545732",
  "daily 1": "188d5363",
  "daily 2": "2e0ce04e",
  "daily 3": "fcdf8a01",
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
