import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { ParticleSystem } from "../../src/physics/particle_system";

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
