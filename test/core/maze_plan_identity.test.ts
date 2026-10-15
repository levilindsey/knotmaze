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
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { walkFingerprint } from "../../src/game/daily_attempt";
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
// Re-frozen 2026-10-14 by K74 stage 2: every plan now carries hCutShare 1
// (H1 runs after the plan, in applyMazeCuts). Nothing else moved: without
// that field each plan hashed to its stage-1 value.
const K74_PLANS: Record<string, string> = {
  "defaults gs 6 rect": "ddae9088",
  "defaults gs 6 heart": "9e5ea326",
  "defaults gs 6 star": "9cea5f03",
  "defaults gs 6 fish": "e5836320",
  "defaults gs 6 tree": "9094dd95",
  "defaults gs 6 ring": "60f099f3",
  "defaults gs 6 circle": "43494f7c",
  "defaults gs 12 rect": "2e17538f",
  "defaults gs 12 heart": "10927792",
  "defaults gs 12 star": "462d1b08",
  "defaults gs 12 fish": "b1b322fb",
  "defaults gs 12 tree": "7413053f",
  "defaults gs 12 ring": "49f32ce1",
  "defaults gs 12 circle": "2f5f7229",
  "defaults gs 18 rect": "f879eff3",
  "defaults gs 18 heart": "e7a96faf",
  "defaults gs 18 star": "80dee51a",
  "defaults gs 18 fish": "7ada7635",
  "defaults gs 18 tree": "837e146f",
  "defaults gs 18 ring": "108d21aa",
  "defaults gs 18 circle": "a6a499e6",
  "random 0": "a9323e2c",
  "random 1": "8156c080",
  "random 2": "cd438fbe",
  "random 3": "a5c6de83",
  "random 4": "09b708c7",
  "random 5": "8cc2ee25",
  "random 6": "525d021c",
  "random 7": "1f5cfd30",
  "random 8": "83a385f1",
  "random 9": "18921ae6",
  "random 10": "b0588982",
  "random 11": "a89d44f2",
  "dense gs 14 rect": "e6ce27ce",
  "dense gs 14 heart": "023a083e",
  "dense gs 14 ring": "11d1ec36",
  "daily 1": "eb6a221f",
  "daily 2": "372e2732",
  "daily 3": "e9250325",
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
  "daily 1": "w1.189.283.c10fffd3",
  "daily 2": "w1.183.270.0f7f6cac",
  "daily 3": "w1.182.271.4d833e44",
  "defaults gs 12 circle": "w1.44.62.300f2310",
  "defaults gs 12 fish": "w1.12.16.da837cbf",
  "defaults gs 12 heart": "w1.19.26.a840cfad",
  "defaults gs 12 rect": "w1.73.106.772a70de",
  "defaults gs 12 ring": "w1.32.44.b5766deb",
  "defaults gs 12 star": "w1.10.13.f14a9244",
  "defaults gs 12 tree": "w1.22.30.70706dc6",
  "defaults gs 18 circle": "w1.130.191.0fddd5c1",
  "defaults gs 18 fish": "w1.51.73.a0cc803b",
  "defaults gs 18 heart": "w1.71.103.a98c99c0",
  "defaults gs 18 rect": "w1.179.267.049e0044",
  "defaults gs 18 ring": "w1.87.124.6f465415",
  "defaults gs 18 star": "w1.54.77.763c4477",
  "defaults gs 18 tree": "w1.76.110.c55e87f9",
  "defaults gs 6 circle": "w1.6.7.86325bb4",
  "defaults gs 6 fish": "w1.6.7.c2983d87",
  "defaults gs 6 heart": "w1.6.7.c8ec8c3b",
  "defaults gs 6 rect": "w1.10.12.05c90d7d",
  "defaults gs 6 ring": "w1.12.16.aeedd081",
  "defaults gs 6 star": "w1.8.10.7891c05b",
  "defaults gs 6 tree": "w1.4.4.b304cbe2",
  "dense gs 14 heart": "w1.264.395.87a987f0",
  "dense gs 14 rect": "w1.495.739.7421b721",
  "dense gs 14 ring": "w1.227.352.24f2fff6",
  "random 0": "w1.6.7.c507f54a",
  "random 1": "w1.6.7.d9e35fd9",
  "random 10": "w1.16.21.3cb30ebb",
  "random 11": "w1.6.7.07dd12bd",
  "random 2": "w1.5.4.fa474055",
  "random 3": "w1.55.80.41299285",
  "random 4": "w1.6.7.9e48fc99",
  "random 5": "w1.24.33.4456e1de",
  "random 6": "w1.26.40.141ceefd",
  "random 7": "w1.28.48.63fe8210",
  "random 8": "w1.24.33.ed42d0c5",
  "random 9": "w1.18.26.5aa670f4",
};
// Same sizes as share 0: a fused cut moves one branch point (B becomes a
// turn, X a junction), so only the runs' ends and lengths change.
const K74_WALKS_DEFAULT: Record<string, string> = {
  "daily 1": "w1.189.283.b4cb9fc4",
  "daily 2": "w1.183.270.e3ee4fc8",
  "daily 3": "w1.182.271.bba04938",
  "defaults gs 12 circle": "w1.44.62.3e87bda8",
  "defaults gs 12 fish": "w1.12.16.d0c1b1ad",
  "defaults gs 12 heart": "w1.19.26.33630a25",
  "defaults gs 12 rect": "w1.73.106.35515aa3",
  "defaults gs 12 ring": "w1.32.44.26e812f5",
  "defaults gs 12 star": "w1.10.13.584da9a4",
  "defaults gs 12 tree": "w1.22.30.51099138",
  "defaults gs 18 circle": "w1.130.191.136fde1d",
  "defaults gs 18 fish": "w1.51.73.22470579",
  "defaults gs 18 heart": "w1.71.103.de55b286",
  "defaults gs 18 rect": "w1.179.267.5dfaf560",
  "defaults gs 18 ring": "w1.87.124.3e973df3",
  "defaults gs 18 star": "w1.54.77.da854630",
  "defaults gs 18 tree": "w1.76.110.fd20a1b2",
  "defaults gs 6 circle": "w1.6.7.0a4edf51",
  "defaults gs 6 fish": "w1.6.7.c2983d87",
  "defaults gs 6 heart": "w1.6.7.45ad1a1f",
  "defaults gs 6 rect": "w1.10.12.05c90d7d",
  "defaults gs 6 ring": "w1.12.16.95f9966c",
  "defaults gs 6 star": "w1.8.10.1c4c6409",
  "defaults gs 6 tree": "w1.4.4.b304cbe2",
  "dense gs 14 heart": "w1.264.395.87a987f0",
  "dense gs 14 rect": "w1.495.739.4510a1cf",
  "dense gs 14 ring": "w1.227.352.24f2fff6",
  "random 0": "w1.6.7.c507f54a",
  "random 1": "w1.6.7.d9e35fd9",
  "random 10": "w1.16.21.94bb0ba5",
  "random 11": "w1.6.7.07dd12bd",
  "random 2": "w1.5.4.fa474055",
  "random 3": "w1.55.80.9cb4bfcd",
  "random 4": "w1.6.7.9e48fc99",
  "random 5": "w1.24.33.420abbed",
  "random 6": "w1.26.40.764c0b89",
  "random 7": "w1.28.48.054eb0a0",
  "random 8": "w1.24.33.75ad67bd",
  "random 9": "w1.18.26.26f2b674",
};

function appliedWalk(p: UrlParams): string {
  const g = graphOf(p);
  const plan = buildMazePlan(graphOf(p), mazeParamsOf(p));
  applyMazeCuts(g, plan, applyMazePlan(g, plan));
  return walkFingerprint(buildWalkGraph(g)!);
}

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
