import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import type { MazeParams } from "../../src/core/maze_plan";
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
          { ...PARAM_DEFAULTS, gridSize, shape, deadEnds, seed: seed() },
        ]);
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    out.push([
      `random ${i}`,
      {
        ...PARAM_DEFAULTS,
        gridSize: 4 + Math.floor(rng() * 13),
        weaveDensity: rng() < 0.5 ? PARAM_DEFAULTS.weaveDensity : step(rng(), 0.05),
        turnBias: rng() < 0.5 ? PARAM_DEFAULTS.turnBias : step(rng(), 0.05),
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
        ...PARAM_DEFAULTS,
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
  for (let n = 1; n <= 3; n++) out.push([`daily ${n}`, dailyParams(n)]);
  return out;
}

describe("maze plan identity (K87)", () => {
  it("builds the same plan as the frozen pre-K87 module", () => {
    const diffs: string[] = [];
    for (const [label, p] of cases()) {
      const params = mazeParamsOf(p);
      const before = JSON.stringify(buildMazePlanV1(graphOf(p), params));
      const after = JSON.stringify(buildMazePlan(graphOf(p), params));
      if (before !== after) diffs.push(`${label} seed ${p.seed}`);
    }
    expect(diffs).toEqual([]);
  });
});
