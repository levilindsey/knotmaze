import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { SHAPES, planAnchors } from "../../src/core/shapes";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { walkFingerprint } from "../../src/game/daily_attempt";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";
import type { UrlParams } from "../../src/ui/url_state";
import { dailyParams } from "../../src/ui/daily_link";

// K108: generation must build the same maze in every browser, so it may use
// only operations the spec makes exact (+ - * /, Math.sqrt, the integer
// and rounding helpers) and util/det_math. Math.hypot, the trig, exp and log
// functions and `**` are "implementation-approximated": Firefox's hypot
// differs from Chrome's in the last bit, and that alone built a different
// maze for 31 of the first 60 dailies. Two guards: a source scan (the only
// way to see `**`, which never calls Math.pow) and a run with every
// approximated function - and Math.random - rigged to throw.

const APPROXIMATED = [
  "hypot",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "sinh",
  "cosh",
  "tanh",
  "asinh",
  "acosh",
  "atanh",
  "exp",
  "expm1",
  "log",
  "log1p",
  "log2",
  "log10",
  "pow",
  "cbrt",
] as const;

const SCANNED = ["core", "util"];

function sourcesOf(dir: string): string[] {
  const root = fileURLToPath(new URL(`../../src/${dir}`, import.meta.url));
  return readdirSync(root, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(root, f));
}

function build(p: UrlParams): string {
  const graph = generateLatticeKnotwork({
    gridSize: p.gridSize,
    weaveDensity: p.weaveDensity,
    turnBias: p.turnBias,
    randSeed: p.seed,
    shape: p.shape,
  });
  const plan = buildMazePlan(graph, {
    ...DEFAULT_MAZE_PARAMS,
    branchDensity: p.branchDensity,
    fourWayFraction: p.fourWayFraction,
    deadEndDensity: p.deadEnds ? p.deadEndDensity : 0,
    entranceClearance: p.entranceClearance,
    exitClearance: p.exitClearance,
    junctionSpacing: p.junctionSpacing,
    ...planAnchors(p.shape, p.gridSize, p.startAnchor, p.exitAnchor),
  });
  const hueGroup = applyMazePlan(graph, plan);
  applyMazeCuts(graph, plan, hueGroup);
  const walk = buildWalkGraph(graph);
  return walk ? walkFingerprint(walk) : "no walk graph";
}

describe("deterministic generation math (K108)", () => {
  it("src/core and src/util use no implementation-approximated math", () => {
    const hits: string[] = [];
    const call = new RegExp(`\\bMath\\.(${APPROXIMATED.join("|")})\\b`);
    for (const dir of SCANNED) {
      for (const file of sourcesOf(dir)) {
        // Strip comments so prose may name what the code must not call.
        const code = readFileSync(file, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*$/gm, "");
        code.split("\n").forEach((line, i) => {
          if (call.test(line) || line.includes("**")) {
            hits.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
    expect(hits).toEqual([]);
  });

  it("builds mazes without calling an approximated function", () => {
    // Params first: only the build runs rigged.
    const designs: [string, UrlParams][] = [];
    for (let n = 1; n <= 3; n++) designs.push([`daily ${n}`, dailyParams(n)]);
    let seed = 1080;
    for (const shape of SHAPES) {
      for (const gridSize of [6, 12]) {
        designs.push([
          `${shape} gs ${gridSize}`,
          { ...PARAM_DEFAULTS, shape, gridSize, deadEnds: true, seed: seed++ },
        ]);
      }
    }
    const called = new Set<string>();
    for (const name of [...APPROXIMATED, "random"] as const) {
      vi.spyOn(Math, name).mockImplementation(() => {
        called.add(name);
        throw new Error(`Math.${name} called during generation`);
      });
    }
    const failures: string[] = [];
    try {
      for (const [label, p] of designs) {
        try {
          if (build(p) === "no walk graph") failures.push(`${label}: no walk graph`);
        } catch (e) {
          failures.push(`${label}: ${(e as Error).message}`);
        }
      }
    } finally {
      vi.restoreAllMocks();
    }
    expect(failures).toEqual([]);
    expect([...called]).toEqual([]);
  });
});
