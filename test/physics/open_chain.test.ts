import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { ParticleSystem } from "../../src/physics/particle_system";
import type { CrossingPass } from "../../src/physics/particle_system";

// P4 maze mode, migration Stages 1-2: open-chain + anchored-end physics, and
// seam-aware crossing/pass machinery.
//
// A closed strand can be carved OPEN (its cyclic seam removed) with the two
// flanking particles pinned to fixed off-screen anchors - the physical
// foundation for the maze thread's real loose ends. The slide search, depth
// tents, and pass ordering all stop at the removed seam, so carving next to a
// crossing stays correct. Knot mode never carves, so all of this is inert
// there (guarded byte-for-byte by byte_identity.test.ts); here we exercise it
// directly.

function build(seed: number): ParticleSystem {
  const graph = generateLatticeKnotwork({
    gridSize: 6,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  return new ParticleSystem(graph);
}

function longestChain(ps: ParticleSystem): number {
  let best = 0;
  let bestLen = -1;
  ps.chains.forEach((c, i) => {
    if (c.length > bestLen) {
      bestLen = c.length;
      best = i;
    }
  });
  return best;
}

// Passes on a chain, by ascending control slot (integers before any stepping).
function passesOnChain(ps: ParticleSystem, chain: number): CrossingPass[] {
  const passes: CrossingPass[] = [];
  for (const cr of ps.crossings) {
    if (cr.over.chain === chain) passes.push(cr.over);
    if (cr.under.chain === chain) passes.push(cr.under);
  }
  passes.sort((a, b) => a.ctrl - b.ctrl);
  return passes;
}

function allFinite(pos: Float32Array): boolean {
  for (let i = 0; i < pos.length; i++) {
    if (!Number.isFinite(pos[i])) return false;
  }
  return true;
}

// Anchor a loose end a gentle 2 units OUTWARD from the knot centroid, so the
// springs start near rest (no violent yank) yet the end sits at an off-lattice
// point the closed loop never held.
function outwardAnchor(ps: ParticleSystem, p: number): [number, number] {
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ps.particleCount; i++) {
    cx += ps.positions[i * 2];
    cy += ps.positions[i * 2 + 1];
  }
  cx /= ps.particleCount;
  cy /= ps.particleCount;
  const dx = ps.positions[p * 2] - cx;
  const dy = ps.positions[p * 2 + 1] - cy;
  const d = Math.hypot(dx, dy) || 1;
  return [ps.positions[p * 2] + (dx / d) * 2, ps.positions[p * 2 + 1] + (dy / d) * 2];
}

describe("open-chain + anchored ends (P4 maze physics)", () => {
  it("knot mode is uncarved (hasCarve false, nothing anchored)", () => {
    const ps = build(5);
    expect(ps.hasCarve).toBe(false);
    for (let i = 0; i < ps.particleCount; i++) {
      expect(ps.isAnchored(i)).toBe(false);
    }
  });

  it("settles with the seam removed and the loose ends pinned", () => {
    const ps = build(5);
    const c = longestChain(ps);
    const chain = ps.chains[c];
    // Break at an interior edge midpoint (odd slot); its two flanking
    // particles become the loose ends.
    let brk = chain.length >> 1;
    if (brk % 2 === 0) brk += 1;
    const pa = chain[brk];
    const pb = chain[(brk + 1) % chain.length];
    const anchorA = outwardAnchor(ps, pa);
    const anchorB = outwardAnchor(ps, pb);

    ps.openChain(c, brk, anchorA, anchorB);
    expect(ps.hasCarve).toBe(true);
    expect(ps.isAnchored(pa)).toBe(true);
    expect(ps.isAnchored(pb)).toBe(true);

    for (let i = 0; i < 900; i++) ps.step(1 / 60);

    expect(allFinite(ps.positions)).toBe(true);
    expect(ps.positions[pa * 2]).toBeCloseTo(anchorA[0], 6);
    expect(ps.positions[pa * 2 + 1]).toBeCloseTo(anchorA[1], 6);
    expect(ps.positions[pb * 2]).toBeCloseTo(anchorB[0], 6);
    expect(ps.positions[pb * 2 + 1]).toBeCloseTo(anchorB[1], 6);
    expect(ps.maxMove).toBeLessThan(0.05);
    for (let i = 0; i < ps.particleCount; i++) {
      expect(Math.abs(ps.positions[i * 2])).toBeLessThan(1000);
      expect(Math.abs(ps.positions[i * 2 + 1])).toBeLessThan(1000);
    }
  });

  it("unlinks only the seam-straddling pass pair", () => {
    const ps = build(5);
    const c = longestChain(ps);
    const passes = passesOnChain(ps, c);
    expect(passes.length).toBeGreaterThanOrEqual(2);
    // A consecutive pass pair with room for a plain-edge seam between them
    // (gap >= 4 keeps both loose ends off the crossing nodes).
    let idx = -1;
    for (let i = 0; i < passes.length - 1; i++) {
      if (passes[i + 1].ctrl - passes[i].ctrl >= 4) {
        idx = i;
        break;
      }
    }
    expect(idx).toBeGreaterThanOrEqual(0);
    const before = passes[idx];
    const after = passes[idx + 1];
    const brk = before.ctrl + 1; // odd midpoint slot, just past the crossing.
    const chain = ps.chains[c];
    ps.openChain(
      c,
      brk,
      outwardAnchor(ps, chain[brk]),
      outwardAnchor(ps, chain[(brk + 1) % chain.length])
    );

    // The straddling pair is unlinked (each points at itself).
    expect(ps.passNeighbors(before).next).toBe(before);
    expect(ps.passNeighbors(after).prev).toBe(after);
    // Every OTHER consecutive pair on the chain stays linked.
    for (let i = 0; i < passes.length - 1; i++) {
      if (i === idx) continue;
      expect(ps.passNeighbors(passes[i]).next).toBe(passes[i + 1]);
    }
  });

  it("stays healthy when the seam is carved right next to a crossing", () => {
    const ps = build(5);
    const c = longestChain(ps);
    const passes = passesOnChain(ps, c);
    let idx = -1;
    for (let i = 0; i < passes.length - 1; i++) {
      if (passes[i + 1].ctrl - passes[i].ctrl >= 4) {
        idx = i;
        break;
      }
    }
    expect(idx).toBeGreaterThanOrEqual(0);
    const chain = ps.chains[c];
    const brk = passes[idx].ctrl + 1; // crossing sits 1 slot from the seam.
    const pa = chain[brk];
    const pb = chain[(brk + 1) % chain.length];
    const anchorA = outwardAnchor(ps, pa);
    const anchorB = outwardAnchor(ps, pb);
    ps.openChain(c, brk, anchorA, anchorB);

    for (let i = 0; i < 900; i++) ps.step(1 / 60);

    // The slide/depth seam guards keep the near-crossing carve stable.
    expect(allFinite(ps.positions)).toBe(true);
    expect(ps.positions[pa * 2]).toBeCloseTo(anchorA[0], 6);
    expect(ps.positions[pb * 2]).toBeCloseTo(anchorB[0], 6);
    expect(ps.maxMove).toBeLessThan(0.05);
    for (let i = 0; i < ps.particleCount; i++) {
      expect(Math.abs(ps.positions[i * 2])).toBeLessThan(1000);
      expect(Math.abs(ps.positions[i * 2 + 1])).toBeLessThan(1000);
    }
  });
});
