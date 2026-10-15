import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { ParticleSystem } from "../../src/physics/particle_system";

// K279 TUG: a tap-pluck's small physical kick (ParticleSystem.tug). The
// chain's slots strictly between c0 and c1 move by a sine bump along the
// thread's normal, crest at the tap, in positions AND prev (it starts at
// rest); nothing else moves. main.ts picks the stretch (renderer.tugSpan)
// and wakes the solver.

function build(): ParticleSystem {
  const graph = generateLatticeKnotwork({
    gridSize: 6,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: 7,
  });
  return new ParticleSystem(graph);
}

function longestChain(ps: ParticleSystem): number {
  let best = 0;
  ps.chains.forEach((c, i) => {
    if (c.length > ps.chains[best].length) best = i;
  });
  return best;
}

function moved(a: Float32Array, b: Float32Array, p: number): number {
  return Math.hypot(a[p * 2] - b[p * 2], a[p * 2 + 1] - b[p * 2 + 1]);
}

describe("ParticleSystem.tug (K279)", () => {
  it("moves only the stretch, by at most amp, positions and prev together", () => {
    const ps = build();
    const chain = longestChain(ps);
    const arr = ps.chains[chain];
    expect(arr.length).toBeGreaterThan(12);
    const pos0 = ps.positions.slice();
    const prev0 = ps.prev.slice();
    const z0 = ps.zPos.slice();
    const amp = 0.15;
    const n = ps.tug(chain, 2.5, 8.5, 5.5, 1, amp);
    expect(n).toBe(6); // slots 3..8
    let peak = 0;
    let peakSlot = -1;
    for (let s = 0; s < arr.length; s++) {
      const p = arr[s];
      const d = moved(ps.positions, pos0, p);
      const dPrev = moved(ps.prev, prev0, p);
      expect(Math.abs(d - dPrev)).toBeLessThan(1e-6);
      // At rest: the velocity (pos - prev) is unchanged.
      expect(ps.positions[p * 2] - ps.prev[p * 2]).toBeCloseTo(pos0[p * 2] - prev0[p * 2], 5);
      if (s < 3 || s > 8) expect(d).toBe(0);
      else expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(amp + 1e-6);
      if (d > peak) {
        peak = d;
        peakSlot = s;
      }
    }
    expect(peakSlot === 5 || peakSlot === 6).toBe(true);
    expect(peak).toBeGreaterThan(amp * 0.9);
    // Every other particle, and every z, stays put.
    const inStretch = new Set(arr.slice(3, 9));
    for (let p = 0; p < ps.positions.length / 2; p++) {
      if (!inStretch.has(p)) expect(moved(ps.positions, pos0, p)).toBe(0);
    }
    expect(ps.zPos).toEqual(z0);
  });

  it("side flips the direction; amp 0 or an empty stretch moves nothing", () => {
    const a = build();
    const b = build();
    const chain = longestChain(a);
    const p = a.chains[chain][5];
    const x0 = a.positions[p * 2];
    const y0 = a.positions[p * 2 + 1];
    a.tug(chain, 2.5, 8.5, 5.5, 1, 0.1);
    b.tug(chain, 2.5, 8.5, 5.5, -1, 0.1);
    expect(a.positions[p * 2] - x0).toBeCloseTo(-(b.positions[p * 2] - x0), 6);
    expect(a.positions[p * 2 + 1] - y0).toBeCloseTo(-(b.positions[p * 2 + 1] - y0), 6);
    const c = build();
    const before = c.positions.slice();
    expect(c.tug(chain, 2.5, 8.5, 5.5, 1, 0)).toBe(0);
    expect(c.tug(chain, 4.2, 4.8, 4.5, 1, 0.1)).toBe(0); // no slot inside
    expect(c.positions).toEqual(before);
  });

  it("wraps a closed chain past its seam", () => {
    const ps = build();
    const chain = longestChain(ps);
    const arr = ps.chains[chain];
    expect(ps.chainBreakAfter[chain]).toBeLessThan(0);
    const len = arr.length;
    const pos0 = ps.positions.slice();
    const n = ps.tug(chain, -2.5, 2.5, 0, 1, 0.1);
    expect(n).toBe(5); // slots len-2, len-1, 0, 1, 2
    for (const s of [len - 2, len - 1, 0, 1, 2]) {
      expect(moved(ps.positions, pos0, arr[s])).toBeGreaterThan(0);
    }
    expect(moved(ps.positions, pos0, arr[3])).toBe(0);
    expect(moved(ps.positions, pos0, arr[len - 3])).toBe(0);
  });
});
