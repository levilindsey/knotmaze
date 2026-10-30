import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { ParticleSystem } from "../../src/physics/particle_system";
import { fabricScene, fabricGraph } from "./fabric_scene";

// GOLDEN GUARD for the thread-graph migration (P4 maze mode).
//
// Knot mode must stay byte-behavior-identical while the sim is generalized from
// closed chains to a thread graph. This test fingerprints knot-mode positions
// at checkpoints and pins them via a snapshot. If a later migration stage
// perturbs the closed-loop path, these fingerprints drift and the snapshot
// fails - a HARD STOP. Regenerate the snapshot ONLY when a knot-mode change is
// intentional (it should not be for maze-mode work).
//
// The sim is fully deterministic at temperature 0 (seeded RNG, no Date/random),
// so a quantized hash is exact across runs while staying sensitive to real
// numeric drift (> 5e-5 per component flips the hash).

function fingerprint(pos: Float32Array): { sum: number; hash: number } {
  let sum = 0;
  let hash = 0;
  for (let i = 0; i < pos.length; i++) {
    sum += pos[i];
    hash = (hash * 31 + Math.round(pos[i] * 1e4)) | 0;
  }
  return { sum: Math.round(sum * 1e6) / 1e6, hash };
}

function run(seed: number, steps: number) {
  const graph = generateLatticeKnotwork({
    gridSize: 6,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const ps = new ParticleSystem(graph);
  const checkpoints: Array<{ sum: number; hash: number }> = [];
  for (let i = 0; i < steps; i++) {
    ps.step(1 / 60);
    if ((i + 1) % 100 === 0) checkpoints.push(fingerprint(ps.positions));
  }
  return { count: ps.particleCount, checkpoints };
}

describe("knot-mode byte identity (golden guard)", () => {
  it("is deterministic across identical runs", () => {
    expect(run(5, 300)).toEqual(run(5, 300));
  });

  it("matches the recorded knot-mode fingerprints", () => {
    // A normal knot (seed 5) plus the quiescence torture seed.
    const knot = run(5, 300);
    const torture = run(2773729296, 300);
    expect({ knot, torture }).toMatchSnapshot();
  });
});

// Key=value links read today's defaults (K132). `de=0&ded=.25` keep the
// maze this link has built since K74 (it read the v1 defaults then).
// Copied whole from test/physics/sleep.regression.test.ts (not exported),
// except gs 12 -> 8: at gs 12 the two maze tests below took over 10 s
// together (K326 stage A brief, step 4).
const USER_RECT_LINK =
  "?s=1471kin&gs=8&rep=1&bd=1&sm=.25&ga=0&tw=.64&gap=.12&cr=2.4&fl=0" +
  "&fw=.25&fv=1.15&vol=.18&hs=312&pal=moss&pc=6c644c&as=2.1" +
  "&de=0&ded=.25&am=instant&snd=none";

function runMaze(query: string, steps: number) {
  const { params, tuning } = fabricScene(query);
  const ps = new ParticleSystem(fabricGraph(params));
  const checkpoints: Array<{ sum: number; hash: number }> = [];
  for (let i = 0; i < steps; i++) {
    ps.step(1 / 60, tuning);
    if ((i + 1) % 100 === 0) checkpoints.push(fingerprint(ps.positions));
  }
  return { count: ps.particleCount, checkpoints };
}

// MAZE GOLDEN (K326 stage A): this block pins the maze's physics as a
// change detector, beside the knot golden above. A change to a default
// or to generation moves it, because links read today's defaults (K132);
// after such a change, re-freeze it with
// `npx vitest run test/physics/byte_identity.test.ts -u` and name the
// move in the commit (CLAUDE.md, "Pre-launch: no back-compat"). The knot
// golden goes in K326 stage B. ps.step is called directly: a physics
// host's budgeted frame depends on wall-clock time (K147), so it cannot
// be pinned.
describe("maze byte identity (golden guard)", () => {
  it("is deterministic across identical runs", () => {
    expect(runMaze("?7&gs=8", 300)).toEqual(runMaze("?7&gs=8", 300));
    expect(runMaze(USER_RECT_LINK, 300)).toEqual(runMaze(USER_RECT_LINK, 300));
  });

  it("matches the recorded maze fingerprints", () => {
    // The default K7 scene plus the fat user rect design.
    const dflt = runMaze("?7&gs=8", 300);
    const fat = runMaze(USER_RECT_LINK, 300);
    expect({ default: dflt, fat }).toMatchSnapshot();
  });
});
