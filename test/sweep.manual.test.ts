// Manual diagnostic sweep (not a regression gate): quantifies the two
// reported failure modes across many seeds at rest.
//   - min |sin theta| per knot: tangential/glued crossings.
//   - max hug run per knot: consecutive under-chain particles that stay in
//     contact range of the over chain around a crossing (long runs = the
//     "loop half cut off by an expanded gap" geometry).
// Run: npx vitest run test/sweep.manual.test.ts
import { describe, it } from "vitest";
import { generateLatticeKnotwork } from "../src/core/lattice_grower";
import { ParticleSystem } from "../src/physics/particle_system";
import type { CrossingPass } from "../src/physics/particle_system";

const CONTACT_DIST = 0.4;
const WINDOW = 10;

function metrics(seed: number, slack: number) {
  const graph = generateLatticeKnotwork({
    gridSize: 12,
    weaveDensity: 0.35,
    turnBias: 0.7,
    randSeed: seed,
  });
  const ps = new ParticleSystem(graph);
  for (let i = 0; i < 1500; i++) {
    ps.step(1 / 60, {
      temperature: 0,
      slack,
      drag: 0.5,
      repulsion: 1,
      bend: 1,
      smooth: 0.25,
      stiffness: 1,
      gridAlign: false,
    });
  }

  const tangent = (pass: CrossingPass): [number, number] => {
    const chain = ps.chains[pass.chain];
    const len = chain.length;
    const i = Math.floor(pass.ctrl);
    const a = chain[((i % len) + len) % len];
    const b = chain[(((i + 1) % len) + len) % len];
    const tx = ps.positions[b * 2] - ps.positions[a * 2];
    const ty = ps.positions[b * 2 + 1] - ps.positions[a * 2 + 1];
    const l = Math.hypot(tx, ty) || 1;
    return [tx / l, ty / l];
  };

  let minSin = Infinity;
  let maxHug = 0;

  for (const c of ps.crossings) {
    const [ax, ay] = tangent(c.over);
    const [bx, by] = tangent(c.under);
    minSin = Math.min(minSin, Math.abs(ax * by - ay * bx));

    // Hug run: from the under binding outward, how many consecutive
    // particles stay within CONTACT_DIST of the over chain's local window.
    const overChain = ps.chains[c.over.chain];
    const overLen = overChain.length;
    const overBase = Math.floor(c.over.ctrl);
    const overPts: Array<[number, number]> = [];
    for (let k = overBase - WINDOW; k <= overBase + WINDOW + 1; k++) {
      const p = overChain[((k % overLen) + overLen) % overLen];
      overPts.push([ps.positions[p * 2], ps.positions[p * 2 + 1]]);
    }
    const nearOver = (p: number): boolean => {
      const x = ps.positions[p * 2];
      const y = ps.positions[p * 2 + 1];
      for (const [ox, oy] of overPts) {
        if (Math.hypot(x - ox, y - oy) < CONTACT_DIST) return true;
      }
      return false;
    };

    const underChain = ps.chains[c.under.chain];
    const underLen = underChain.length;
    const underBase = Math.floor(c.under.ctrl);
    for (const dir of [1, -1]) {
      let run = 0;
      for (let s = 1; s <= WINDOW; s++) {
        const p =
          underChain[
            (((underBase + dir * s) % underLen) + underLen) % underLen
          ];
        if (nearOver(p)) run++;
        else break;
      }
      maxHug = Math.max(maxHug, run);
    }
  }

  return { minSin, maxHug, crossings: ps.crossings.length };
}

const sweepIt = process.env.SWEEP ? it : it.skip;

describe("sweep", () => {
  sweepIt("reports crossing-quality metrics across seeds", () => {
    for (const slack of [0, 0.55]) {
      console.log(`--- slack ${slack} ---`);
      for (let seed = 1; seed <= 20; seed++) {
        const m = metrics(seed * 7919, slack);
        console.log(
          `seed ${String(seed * 7919).padStart(6)} ` +
            `minSin ${m.minSin.toFixed(2)} maxHug ${m.maxHug} ` +
            `(${m.crossings} crossings)`
        );
      }
    }
  }, 600000);
});
