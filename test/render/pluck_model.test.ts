import { describe, expect, it } from "vitest";
import {
  a1,
  band,
  CLIP_SELF_GUARD,
  CLIP_SELF_MIN,
  CLIP_SELF_RAMP,
  clipKeep,
  coverage,
  CUE_GAIN_MAX,
  CUE_RAMP,
  CUE_SIZE_REF,
  CUE_TAP,
  CUE_UNIT,
  cueStrength,
  cueWeight,
  drawnSwing,
  envelope,
  gapTurn,
  ghostShape,
  glowCue,
  HIDE_RAMP,
  LOBE_MIN_LEN,
  nodeCap,
  peakShape,
  pinchCap,
  PLUCK_CROSSINGS,
  PLUCK_GLOWS,
  PLUCK_WHOLE_MAX,
  pluckShows,
  rescaleSympathetic,
  roomAt,
  roundCollapse,
  roundTau,
  segmentLobes,
  selfPassAhead,
  SHOW_DT,
  SHOW_MIN_H,
  SHOW_MIN_PX,
  slopeLimitUniform,
  softMin,
  stringT60,
  sympatheticAmplitude,
  tapAmplitude,
  tapLobes,
  throughStation,
  tri,
  underClipWeight,
  unionGapIds,
  unitShift,
  vibratingSpan,
  visualTau,
  WHOLE_AMP,
  WHOLE_FLOOR,
  WHOLE_OVERLAP,
  wholeAmplitude,
  wholeRoom,
  wholeShape,
  yInst,
} from "../../src/render/pluck_model";

// The ideal plucked string as a modal sum (Russell): unit height at beta,
// released from rest; phase phi in radians of the fundamental.
const MODES = 200;
const modal = (beta: number, x: number, phi: number): number => {
  let y = 0;
  for (let n = 1; n <= MODES; n++) {
    const An =
      (2 * Math.sin(n * Math.PI * beta)) /
      (n * n * Math.PI * Math.PI * beta * (1 - beta));
    y += An * Math.sin(n * Math.PI * x) * Math.cos(n * phi);
  }
  return y;
};

describe("ideal plucked string", () => {
  it("sweeps the parallelogram: tri_beta above, -tri_(1-beta) below", () => {
    for (const beta of [0.5, 0.3, 0.15]) {
      for (let i = 1; i < 20; i++) {
        const x = i / 20;
        let hi = -Infinity;
        let lo = Infinity;
        for (let s = 0; s < 400; s++) {
          const y = modal(beta, x, (s / 400) * 2 * Math.PI);
          if (y > hi) hi = y;
          if (y < lo) lo = y;
        }
        const env = [0, 0];
        envelope(beta, x, 1, env);
        expect(Math.abs(hi - env[1])).toBeLessThan(0.02);
        expect(Math.abs(lo - env[0])).toBeLessThan(0.02);
        expect(env[1]).toBeCloseTo(tri(beta, x), 12);
        expect(env[0]).toBeCloseTo(-tri(1 - beta, x), 12);
      }
    }
  });

  it("d'Alembert's shape matches the modal sum at every phase", () => {
    for (const beta of [0.5, 0.35]) {
      for (const phi of [0, 0.7, 1.9, Math.PI, 4.1]) {
        for (let i = 1; i < 10; i++) {
          const x = i / 10;
          expect(Math.abs(yInst(beta, x, phi) - modal(beta, x, phi))).toBeLessThan(
            0.02
          );
        }
      }
    }
    // Phase 0 is the plucked triangle; half a period, its inverted mirror.
    expect(yInst(0.3, 0.3, 0)).toBeCloseTo(1, 9);
    expect(yInst(0.3, 0.7, Math.PI)).toBeCloseTo(-1, 9);
  });

  it("the fundamental's amplitude is a1(beta), and the lens is its sine", () => {
    for (const beta of [0.5, 0.3, 0.15]) {
      const A1 = (2 * Math.sin(Math.PI * beta)) / (Math.PI ** 2 * beta * (1 - beta));
      expect(a1(beta)).toBeCloseTo(A1, 12);
      const env = [0, 0];
      envelope(beta, 0.5, 0, env);
      expect(env[1]).toBeCloseTo(A1, 12);
      expect(env[0]).toBeCloseTo(-A1, 12);
      expect(ghostShape(beta, 0.5, 0, 0)).toBeCloseTo(A1, 12);
    }
    expect(a1(0.5)).toBeCloseTo(0.8106, 4);
  });

  it("peak extent bounds every q and the ghost", () => {
    for (const beta of [0.5, 0.3, 0.2]) {
      for (let i = 0; i <= 20; i++) {
        const x = i / 20;
        const pk = peakShape(beta, x, true);
        for (const q of [0, 0.3, 0.7, 1]) {
          const env = [0, 0];
          envelope(beta, x, q, env);
          expect(env[1]).toBeLessThanOrEqual(pk + 1e-12);
          expect(-env[0]).toBeLessThanOrEqual(pk + 1e-12);
          for (const phi of [0, 1, 2, 3, 4, 5]) {
            expect(Math.abs(ghostShape(beta, x, q, phi))).toBeLessThanOrEqual(
              pk + 1e-9
            );
          }
        }
      }
    }
  });
});

describe("time-exposure coverage", () => {
  const integrate = (h: number, lo: number, hi: number, p: number): number => {
    let s = 0;
    const du = 0.0005;
    for (let u = lo - h - 1; u <= hi + h + 1; u += du) {
      s += coverage(u, h, lo, hi, p) * du;
    }
    return s;
  };

  it("conserves ink: the integral across the strip is 2h", () => {
    const h = 0.21;
    for (const [lo, hi] of [
      [0, 0],
      [-0.1, 0.1],
      [-0.42, 0.42],
      [-0.6, 0.3],
      [-0.05, 1.05],
    ]) {
      expect(integrate(h, lo, hi, 0.01)).toBeCloseTo(2 * h, 3);
    }
  });

  it("at zero amplitude it is exactly the anti-aliased thread", () => {
    const h = 0.26;
    for (let u = -0.4; u <= 0.4; u += 0.003) {
      expect(coverage(u, h, 0, 0, 0.02)).toBeCloseTo(band(u, h, 0.02), 9);
    }
  });

  it("matches the arcsine table: A = 2h -> center 1/3, rim 1/2", () => {
    const h = 0.2;
    const A = 2 * h;
    expect(coverage(0, h, -A, A, 1e-4)).toBeCloseTo(1 / 3, 3);
    // The rim sits on the dwell density's sqrt singularity: box-filtered
    // over a 1e-4 pixel it reads ~0.0017 under the point value.
    expect(coverage(h, h, -A, A, 1e-4)).toBeCloseTo(0.5, 2);
    // Under one half-width of swing the core stays opaque.
    expect(coverage(0, h, -0.9 * h, 0.9 * h, 1e-4)).toBeCloseTo(1, 6);
  });
});

describe("decay and amplitude", () => {
  it("decays on the voice's T60 (knot_synth.ts)", () => {
    expect(stringT60(220, 0.5)).toBeCloseTo(4.2, 9);
    expect(stringT60(110, 0.5)).toBeCloseTo(4.2 * Math.SQRT2, 9);
    expect(stringT60(30, 1)).toBe(9); // Clamped like the worklet.
    expect(stringT60(1800, 0)).toBeCloseTo(
      Math.max(0.5, 4.2 * Math.sqrt(220 / 1800) * 0.35),
      9
    );
    expect(visualTau(220, 0.5)).toBeCloseTo((0.8 * 4.2) / 6.91, 9);
    expect(roundTau(0.1)).toBe(0.04);
    expect(roundTau(10)).toBe(0.1);
  });

  it("scales the plucked lobe with its length, clamped to the thread", () => {
    const h = 0.21;
    expect(tapAmplitude(1.3, h, 1, 1)).toBeCloseTo(0.156, 9);
    expect(tapAmplitude(0.2, h, 1, 1)).toBeCloseTo(0.65 * h, 9);
    expect(tapAmplitude(50, h, 1, 1)).toBeCloseTo(2.2 * h, 9);
    expect(tapAmplitude(1.3, h, 2, 0.5)).toBeCloseTo(0.156, 9);
    expect(sympatheticAmplitude(1, 0, 1, 1)).toBe(1);
    expect(sympatheticAmplitude(1, 1, 1, 1)).toBeCloseTo(0.55, 9);
    expect(sympatheticAmplitude(1, -2, 1, 1)).toBeCloseTo(0.44, 9);
    expect(sympatheticAmplitude(1, 1, 0.25, 1)).toBeCloseTo(0.275, 9);
  });

  it("K105: sympathetic lobes follow the tapped lobe's CAPPED swing", () => {
    // Pre-cap: aTap 1; the tapped lobe is clearance-capped to 0.3 while its
    // roomy neighbors kept their pre-cap sympathetic swings.
    const aTap = 1;
    const lobes = [
      { k: -1, A0: sympatheticAmplitude(aTap, -1, 2, 2), len: 2 },
      { k: 0, A0: 0.3, len: 2 },
      { k: 1, A0: sympatheticAmplitude(aTap, 1, 0.5, 2), len: 0.5 },
      { k: 2, A0: 0.05, len: 2 }, // Its own cap binds harder: kept.
    ];
    expect(lobes[0].A0).toBeGreaterThan(lobes[1].A0); // The K105 bug.
    rescaleSympathetic(lobes, 2);
    expect(lobes[1].A0).toBe(0.3);
    expect(lobes[0].A0).toBeCloseTo(0.3 * 0.55, 9);
    expect(lobes[2].A0).toBeCloseTo(0.3 * 0.55 * 0.5, 9);
    expect(lobes[3].A0).toBe(0.05);
    for (const l of lobes) expect(l.A0).toBeLessThanOrEqual(0.3 * (l.k === 0 ? 1 : 0.55));
    // Uncapped taps are unchanged; a list without a tapped lobe too.
    const free = [
      { k: 0, A0: 1, len: 2 },
      { k: 1, A0: sympatheticAmplitude(1, 1, 2, 2), len: 2 },
    ];
    rescaleSympathetic(free, 2);
    expect(free[1].A0).toBeCloseTo(0.55, 9);
    const orphan = [{ k: 1, A0: 0.7, len: 1 }];
    rescaleSympathetic(orphan, 1);
    expect(orphan[0].A0).toBe(0.7);
  });

  it("soft nodes: opaque core inside the footprint, opening beyond", () => {
    const h = 0.2;
    expect(nodeCap(h, 0.1, 0.5)).toBeCloseTo(0.18, 9);
    expect(nodeCap(h, 0.7, 0.5)).toBeCloseTo(0.18 + 0.3, 9);
    for (const [a, b] of [
      [0.1, 0.5],
      [0.5, 0.1],
      [0.3, 0.31],
    ]) {
      expect(softMin(a, b, 0.05)).toBeLessThanOrEqual(Math.min(a, b));
    }
    expect(softMin(0.1, 0.5, 0.05)).toBe(0.1);
  });
});

describe("whole-segment term (K104)", () => {
  it("a set amount: size x gain x h, independent of length", () => {
    const h = 0.26;
    expect(wholeAmplitude(h, 1.75, 1)).toBeCloseTo(WHOLE_AMP * 1.75 * h, 12);
    expect(wholeAmplitude(h, 3, 0.8, 0.7)).toBeCloseTo(0.7 * 3 * 0.8 * h, 12);
    expect(wholeAmplitude(h, 0, 1)).toBe(0);
    expect(wholeAmplitude(h, 1, 1, -1)).toBe(0);
  });

  it("the fundamental over the vibrating extent, zero outside it", () => {
    expect(wholeShape(2, 1, 3)).toBeCloseTo(1, 12);
    expect(wholeShape(1.5, 1, 3)).toBeCloseTo(Math.SQRT1_2, 12);
    expect(wholeShape(1, 1, 3)).toBe(0);
    expect(wholeShape(3, 1, 3)).toBe(0);
    expect(wholeShape(0.5, 1, 3)).toBe(0);
    expect(wholeShape(3.5, 1, 3)).toBe(0);
    expect(wholeShape(1, 1, 1)).toBe(0); // Degenerate extent.
  });

  it("overlap room: gap + overlap, never under the floor", () => {
    const h = 0.2;
    expect(wholeRoom(0.3, h)).toBeCloseTo(0.3 + WHOLE_OVERLAP * h, 12);
    expect(wholeRoom(-0.5, h)).toBeCloseTo(
      Math.max(WHOLE_FLOOR, WHOLE_OVERLAP) * h,
      12
    );
    expect(WHOLE_FLOOR).toBeLessThanOrEqual(WHOLE_OVERLAP);
  });

  it("room profiles: slope-limited, read between samples", () => {
    const v = new Float32Array([Infinity, 1, Infinity, Infinity, 0.2, Infinity]);
    slopeLimitUniform(v, 0.1, 1);
    expect(Array.from(v).map((x) => +x.toFixed(6))).toEqual([
      0.6, 0.5, 0.4, 0.3, 0.2, 0.3,
    ]);
    const all = new Float32Array([Infinity, Infinity]);
    slopeLimitUniform(all, 0.1, 1);
    expect(all[0]).toBe(Infinity);
    expect(roomAt(new Float32Array([1, 0.5]), 0.5)).toBeCloseTo(0.75, 6);
    expect(roomAt(new Float32Array([1, 0.5, 0.25]), 1)).toBeCloseTo(0.25, 6);
    expect(roomAt(new Float32Array([1, Infinity]), 0.3)).toBe(1);
    expect(roomAt(new Float32Array([Infinity, Infinity]), 0.3)).toBe(Infinity);
    expect(roomAt(new Float32Array([0.4]), 0.9)).toBeCloseTo(0.4, 6);
  });

  it("pinch: W's own soft node at an interior crossing", () => {
    const h = 0.2;
    expect(pinchCap(h, 0.1, 0.5, 0.3)).toBeCloseTo(0.06, 12);
    expect(pinchCap(h, 0.7, 0.5, 0.3)).toBeCloseTo(0.06 + 1.5 * 0.2, 12);
  });

  it("through: W never lowers a station, and the terms add up to its swing", () => {
    const h = 0.26;
    const capped = (v: number, cap: number) =>
      v > 1e-9 ? Math.max(0, Math.min(v, softMin(v, cap, 0.25 * h))) : 0;
    const out = new Float64Array(3);
    let n = 0;
    for (const raw of [0, 0.004, 0.02, 0.068, 0.15, 0.4, 0.8]) {
      for (const capInt of [Infinity, 0.03, 0.12, 0.3]) {
        for (const capEnd of [0, 0.002, 0.0054, 0.02, 0.08, 0.25, Infinity]) {
          for (const w of [0, 0.002, 0.005, 0.05, 0.2]) {
            // The pre-K104 swing: the lobe capped at all its nodes.
            const lobeOnly = capped(raw, Math.min(capInt, capEnd));
            throughStation(raw, capped(raw, capInt), lobeOnly, w, capEnd, h, out);
            const [pk, f, g] = out;
            expect(pk).toBeGreaterThanOrEqual(lobeOnly);
            expect(pk).toBeLessThanOrEqual(Math.max(lobeOnly, raw + w) + 1e-12);
            expect(f).toBeGreaterThanOrEqual(0);
            expect(g).toBeGreaterThanOrEqual(0);
            expect(g).toBeLessThanOrEqual(1);
            expect(Math.abs(f * raw + g * w - pk)).toBeLessThan(1e-12);
            // The lobe's own share never drops under the pre-K104 swing (W
            // only widens the envelope, so no instant draws less).
            if (raw > 1e-9) expect(f * raw).toBeGreaterThanOrEqual(lobeOnly - 1e-12);
            // W off, every node a unit end: exactly the pre-K104 swing.
            if (w === 0 && capInt === Infinity) expect(pk).toBe(lobeOnly);
            n++;
          }
        }
      }
    }
    expect(n).toBe(980);
    // Along the strip the caps vary smoothly, and so must both shares: a
    // station where the end cap holds the sum just under lobeOnly (capEnd
    // ~0.12 here) once switched W off and the lobe up by k w (0.035) in
    // one step.
    let prev: number[] | null = null;
    for (let capEnd = 0.1; capEnd <= 0.16; capEnd += 0.0005) {
      throughStation(0.4, capped(0.4, 0.12), capped(0.4, Math.min(0.12, capEnd)), 0.05, capEnd, h, out);
      const shares = [out[1] * 0.4, out[2] * 0.05];
      if (prev) {
        expect(Math.abs(shares[0] - prev[0])).toBeLessThan(2e-3);
        expect(Math.abs(shares[1] - prev[1])).toBeLessThan(2e-3);
      }
      prev = shares;
    }
    // The sliver run that showed it (a 1.26-world run between two junction
    // cores): capping the end-capped lobe again with W on top sat at the
    // cap, where softMin dips, and drew less than the lobe alone.
    const lobeOnly = capped(0.068, 0.0054);
    expect(capped(lobeOnly + 0.005, 0.0054)).toBeLessThan(0.3 * lobeOnly);
    throughStation(0.068, 0.068, lobeOnly, 0.005, 0.0054, h, out);
    expect(out[0]).toBeGreaterThanOrEqual(lobeOnly);
  });

  it("the seam: arc + shift stays continuous over a closed unit", () => {
    // A lobe that started at -1 (left of the seam) resolves to 9 on a
    // 10-long loop: shift -10 keeps it at -1.
    expect(unitShift(-1, 9, 10, true)).toBe(-10);
    expect(unitShift(9.02, 9, 10, true)).toBe(0);
    expect(unitShift(10.5, 0.4, 10, true)).toBe(10);
    // Open chains never shift.
    expect(unitShift(-1, 9, 10, false)).toBe(0);
  });
});

describe("reduced-motion cue (K104)", () => {
  it("stays in [0, 1], and is 0 outside the extent and at its ends", () => {
    let n = 0;
    for (const [e0, e1] of [[0, 0.06], [1, 1.4], [-2, 3], [5, 25]]) {
      for (const ramp of [0, 0.2, 0.52, 5]) {
        for (const tap of [0, 0.4, 1, 2]) {
          for (let k = -10; k <= 110; k++) {
            const u = e0 + ((e1 - e0) * k) / 100;
            const w = cueWeight(u, e0, e1, ramp, tap);
            expect(w).toBeGreaterThanOrEqual(0);
            expect(w).toBeLessThanOrEqual(1);
            if (k <= 0 || k >= 100) expect(w).toBe(0);
            n++;
          }
        }
      }
    }
    expect(n).toBe(4 * 4 * 4 * 121);
    // A degenerate extent draws nothing.
    expect(cueWeight(1, 1, 1, 0.5, 1)).toBe(0);
    expect(cueWeight(1, 2, 1, 0.5, 1)).toBe(0);
  });

  it("a plateau over the unit, the tapped lobe's bump on top", () => {
    const ramp = CUE_RAMP * 0.26;
    // Away from the ends: exactly the plateau, or plateau + bump.
    expect(cueWeight(5, 0, 10, ramp, 0)).toBeCloseTo(CUE_UNIT, 12);
    expect(cueWeight(5, 0, 10, ramp, 1)).toBeCloseTo(CUE_UNIT + CUE_TAP, 12);
    expect(CUE_UNIT + CUE_TAP).toBeLessThanOrEqual(1);
    // Inside an end ramp the plateau eases in (smoothstep).
    expect(cueWeight(ramp / 2, 0, 10, ramp, 0)).toBeCloseTo(CUE_UNIT * 0.5, 12);
    // A short unit still reaches the plateau mid-unit (the ramp shrinks
    // to a third of it).
    expect(cueWeight(0.15, 0, 0.3, ramp, 0)).toBeCloseTo(CUE_UNIT, 12);
    expect(cueWeight(0.05, 0, 0.3, ramp, 0)).toBeCloseTo(0.5 * CUE_UNIT, 12);
    // No ramp: the plateau starts at the ends.
    expect(cueWeight(0.001, 0, 10, 0, 0)).toBeCloseTo(CUE_UNIT, 12);
  });

  it("continuous along the unit (no step a pixel could show)", () => {
    for (const [e0, e1, ramp] of [[0, 0.3, 0.52], [0, 4, 0.52], [2, 9, 0.1]]) {
      const N = 20000;
      let prev = 0;
      let maxStep = 0;
      for (let k = 0; k <= N; k++) {
        const u = e0 + ((e1 - e0) * k) / N;
        // The tapped lobe: the middle third of the unit.
        const x = (k / N - 1 / 3) * 3;
        const tap = x > 0 && x < 1 ? Math.sin(Math.PI * x) : 0;
        const w = cueWeight(u, e0, e1, ramp, tap);
        if (k > 0) maxStep = Math.max(maxStep, Math.abs(w - prev));
        prev = w;
      }
      expect(maxStep).toBeLessThan(0.01);
    }
  });

  it("strength: 1 at the default size and a tap, monotone, gain capped", () => {
    expect(cueStrength(CUE_SIZE_REF, 1)).toBe(1);
    expect(cueStrength(0, 1)).toBe(0);
    expect(cueStrength(CUE_SIZE_REF, 0)).toBe(0);
    expect(cueStrength(CUE_SIZE_REF, -1)).toBe(0);
    expect(cueStrength(CUE_SIZE_REF, 9)).toBe(CUE_GAIN_MAX);
    expect(cueStrength(3, 1)).toBeCloseTo(Math.sqrt(3 / CUE_SIZE_REF), 12);
    let prev = -1;
    for (let s = 0; s <= 3.001; s += 0.05) {
      const v = cueStrength(s, 1);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
    prev = -1;
    for (let g = 0; g <= CUE_GAIN_MAX + 1e-9; g += 0.05) {
      const v = cueStrength(CUE_SIZE_REF, g);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });
});

describe("lobe segmentation", () => {
  const spans = (l: ReturnType<typeof segmentLobes>): number[][] =>
    l.map((s) => [+s.s0.toFixed(6), +s.s1.toFixed(6), s.k]);

  it("closed chain: the tapped lobe +- reach, never more than the loop", () => {
    const nodes = [1, 3, 6, 8];
    expect(spans(segmentLobes(nodes, 10, true, 4, 0))).toEqual([[3, 6, 0]]);
    expect(spans(segmentLobes(nodes, 10, true, 4, 2))).toEqual([
      [1, 3, -1],
      [3, 6, 0],
      [6, 8, 1],
      [8, 11, 2],
    ]);
  });

  it("closed chain: lobes across the seam stay in the tap's frame", () => {
    const nodes = [1, 3, 6, 8];
    expect(spans(segmentLobes(nodes, 10, true, 9, 0))).toEqual([[8, 11, 0]]);
    expect(spans(segmentLobes(nodes, 10, true, 0.5, 1))).toEqual([
      [-4, -2, -1],
      [-2, 1, 0],
      [1, 3, 1],
    ]);
  });

  it("open chain: ends are nodes, no wrap", () => {
    const nodes = [0, 2, 5, 9];
    expect(spans(segmentLobes(nodes, 9, false, 6, 1))).toEqual([
      [2, 5, -1],
      [5, 9, 0],
    ]);
    expect(spans(segmentLobes(nodes, 9, false, 0.5, 5))).toEqual([
      [0, 2, 0],
      [2, 5, 1],
      [5, 9, 2],
    ]);
  });

  it("a span (the walk run) bounds the unit, across the seam too", () => {
    const nodes = [1, 3, 6, 8];
    expect(spans(segmentLobes(nodes, 10, true, 4, 6, [3, 8]))).toEqual([
      [3, 6, 0],
      [6, 8, 1],
    ]);
    expect(spans(segmentLobes(nodes, 10, true, 9.5, 6, [8, 13]))).toEqual([
      [8, 11, 0],
      [11, 13, 1],
    ]);
    // The same run handed over in the other frame.
    expect(spans(segmentLobes(nodes, 10, true, 0.5, 6, [8, 13]))).toEqual([
      [-2, 1, 0],
      [1, 3, 1],
    ]);
    // A tap outside the span ignores it.
    expect(spans(segmentLobes(nodes, 10, true, 7, 1, [1, 3]))).toEqual([
      [3, 6, -1],
      [6, 8, 0],
      [8, 11, 1],
    ]);
  });

  it("degenerate loops: one node is one whole-loop lobe, none is a pseudo lobe", () => {
    expect(spans(segmentLobes([4], 10, true, 7, 3))).toEqual([[4, 14, 0]]);
    const pseudo = segmentLobes([], 10, true, 7, 3);
    expect(pseudo).toHaveLength(1);
    expect(pseudo[0].a).toBe(-1);
    expect(pseudo[0].s0).toBeCloseTo(5.5, 9);
    expect(pseudo[0].s1).toBeCloseTo(8.5, 9);
  });
});

// K77: the base collapse's depth profile, rounded so no wedge survives.
describe("rounded base collapse", () => {
  // Deterministic profiles: mulberry32.
  const rng = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const round = (d: ArrayLike<number>, per: number, closed: boolean, curv: number): Float32Array => {
    const out = new Float32Array(d.length);
    roundCollapse(d, per, closed, curv, out);
    return out;
  };
  // A raw collapse-like profile: runs of ramps and plateaus, zero gaps.
  const randomDepth = (r: () => number, n: number): Float32Array => {
    const d = new Float32Array(n);
    let v = 0;
    for (let k = 0; k < n; k++) {
      if (r() < 0.08) v = 0;
      else v = Math.min(1, Math.max(0, v + (r() - 0.42) * 0.5));
      d[k] = v;
    }
    return d;
  };
  const curvOf = (h: number, radiusInH: number): number => 1 / (radiusInH * h * h);

  it("never narrows past the allowance; zero stays zero", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = rng(seed);
      const n = 40 + Math.floor(r() * 160);
      const d = randomDepth(r, n);
      const per = 0.05 + 0.07 * r();
      const curv = curvOf(0.15 + 0.2 * r(), 0.5 + r());
      for (const closed of [false, true]) {
        const f = round(d, per, closed, curv);
        for (let k = 0; k < n; k++) {
          expect(f[k]).toBeLessThanOrEqual(d[k] + 1e-6);
          expect(f[k]).toBeGreaterThanOrEqual(0);
          if (d[k] === 0) expect(f[k]).toBeLessThan(1e-9);
        }
      }
    }
  });

  it("bends at most curv: no concave corner (wedge) anywhere", () => {
    let rawWedges = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = rng(1000 + seed);
      const n = 60 + Math.floor(r() * 160);
      const d = randomDepth(r, n);
      const per = 0.06 + 0.04 * r();
      const curv = curvOf(0.2 + 0.1 * r(), 0.5 + r());
      const bound = curv * per * per;
      for (const closed of [false, true]) {
        const f = round(d, per, closed, curv);
        const lo = closed ? 0 : 1;
        const hi = closed ? n : n - 1;
        let worst = 0;
        for (let k = lo; k < hi; k++) {
          const a = f[(k - 1 + n) % n];
          const c = f[(k + 1) % n];
          worst = Math.min(worst, a - 2 * f[k] + c);
        }
        expect(worst).toBeGreaterThanOrEqual(-bound * (1 + 1e-4) - 1e-6);
        // The raw profiles do have wedges: the test is not vacuous.
        let rawWorst = 0;
        for (let k = 1; k < n - 1; k++) rawWorst = Math.min(rawWorst, d[k - 1] - 2 * d[k] + d[k + 1]);
        if (rawWorst < -bound) rawWedges++;
      }
    }
    expect(rawWedges).toBeGreaterThan(60);
  });

  it("a window too short for full depth gets a shallow round dip, not a V", () => {
    // A V: two ramps meeting at 0.8 over 0.56 world (the s2L waist).
    const per = 0.086;
    const h = 0.26;
    const curv = curvOf(h, 1);
    const n = 41;
    const d = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const u = Math.abs(k * per - 20 * per);
      d[k] = Math.max(0, 0.8 * (1 - u / 0.28));
    }
    const f = round(d, per, false, curv);
    const peak = Math.max(...f);
    expect(peak).toBeLessThan(0.5);
    expect(peak).toBeGreaterThan(0.1);
    // Symmetric, single-peaked, and as tall as the nearest zeros allow.
    for (let k = 0; k < 20; k++) {
      expect(f[k]).toBeLessThanOrEqual(f[k + 1] + 1e-7);
      expect(f[20 + k + 1]).toBeLessThanOrEqual(f[20 + k] + 1e-7);
      expect(f[20 - k]).toBeCloseTo(f[20 + k], 6);
    }
  });

  it("a box: the tallest bump that fits between its zeros", () => {
    const per = 0.08;
    const curv = curvOf(0.25, 1);
    for (const W of [3, 5, 8, 13, 40]) {
      const n = W + 20;
      const d = new Float32Array(n);
      for (let k = 10; k < 10 + W; k++) d[k] = 1;
      const f = round(d, per, false, curv);
      // Each center's nearest zero bounds its bump: a(s) <= d0 per.
      let want = 0;
      for (let c = 10; c < 10 + W; c++) {
        const d0 = Math.min(c - 9, 10 + W - c);
        want = Math.max(want, Math.min(1, 2 * curv * ((d0 * per) / Math.PI) ** 2));
      }
      expect(Math.max(...f)).toBeCloseTo(want, 5);
      // A wide box keeps its full depth in the middle, rounded shoulders.
      if (W === 40) {
        expect(f[30]).toBeCloseTo(1, 6);
        expect(f[11]).toBeLessThan(0.5);
      }
    }
  });

  it("keeps what is already round: constants, and gentle bumps", () => {
    const per = 0.08;
    const curv = curvOf(0.25, 1);
    // A constant ring is unchanged; an open run is rounded only at its ends.
    const ring = round(new Float32Array(50).fill(0.7), per, true, curv);
    for (const v of ring) expect(v).toBeCloseTo(0.7, 6);
    const run = round(new Float32Array(50).fill(0.7), per, false, curv);
    expect(run[25]).toBeCloseTo(0.7, 6);
    expect(run[0]).toBeLessThan(0.05);
    // A raised cosine three times wider than the curvature-limited one.
    const s = 0.6;
    const a = 3 * Math.PI * Math.sqrt(s / (2 * curv));
    const n = Math.ceil((2 * a) / per) + 9;
    const d = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const u = k * per - 0.5 * (n - 1) * per;
      d[k] = Math.abs(u) < a ? s * Math.cos((Math.PI * u) / (2 * a)) ** 2 : 0;
    }
    const f = round(d, per, false, curv);
    let dev = 0;
    for (let k = 0; k < n; k++) dev = Math.max(dev, d[k] - f[k]);
    expect(dev).toBeLessThan(0.01 * s);
  });

  it("wraps a closed chain across its seam; curv 0 is the identity", () => {
    const per = 0.08;
    const curv = curvOf(0.25, 1);
    const n = 64;
    const d = new Float32Array(n);
    const e = new Float32Array(n);
    // The same V straddling the seam, and shifted into the middle.
    for (let k = 0; k < n; k++) {
      const u = Math.min(Math.abs(k), Math.abs(k - n)) * per;
      d[k] = Math.max(0, 0.9 * (1 - u / 0.4));
      e[(k + 32) % n] = d[k];
    }
    const f = round(d, per, true, curv);
    const g = round(e, per, true, curv);
    for (let k = 0; k < n; k++) expect(f[k]).toBeCloseTo(g[(k + 32) % n], 6);
    expect(f[0]).toBeLessThan(0.9);
    expect(f[0]).toBeGreaterThan(0);
    const same = round(d, per, true, 0);
    for (let k = 0; k < n; k++) expect(same[k]).toBe(d[k]);
  });
});

describe("still-pluck gap lookups (G1's encoding)", () => {
  it("gapTurn inverts the ribbon's turn x arcScale on rings and open chains", () => {
    const total = 37.5;
    // Rings: turn x total (and any whole number of turns) is the arc.
    for (const arc of [0, 1.25, 20, 37.4, 40, 70]) {
      expect(gapTurn(arc, total, true) * total).toBeCloseTo(arc, 9);
    }
    // Open: the ribbon's sample i of count carries 0.45 i / (count - 1);
    // x total / 0.45 gives the arc back, clamped to the chain.
    const count = 101;
    for (const i of [0, 1, 50, 100]) {
      const arc = (total * i) / (count - 1);
      expect(gapTurn(arc, total, false)).toBeCloseTo((0.45 * i) / (count - 1), 12);
      expect((gapTurn(arc, total, false) * total) / 0.45).toBeCloseTo(arc, 9);
    }
    expect(gapTurn(-1, total, false)).toBe(0);
    expect(gapTurn(total + 1, total, false)).toBeCloseTo(0.45, 12);
    expect(gapTurn(5, 0, true)).toBe(0);
  });

  // ids: sample-major, 4 lanes; one slot per lane over its window.
  const lanes = (count: number, wins: Array<[number, number, number, number]>) => {
    const ids = new Float32Array(count * 4).fill(-1);
    for (const [slot, lane, k0, k1] of wins) {
      for (let k = k0; k <= k1; k++) ids[(((k % count) + count) % count) * 4 + lane] = slot;
    }
    return ids;
  };

  it("unions the slots of every sample the span touches, first seen first", () => {
    const count = 20; // Open chain, total 19: one sample per unit arc.
    const ids = lanes(count, [
      [7, 0, 2, 5],
      [3, 1, 4, 9],
      [11, 0, 8, 12],
    ]);
    const out = new Float32Array(6).fill(9);
    expect(unionGapIds(ids, count, 4, false, 19, 4.2, 4.8, out, 1)).toBe(2);
    expect(Array.from(out)).toEqual([9, 7, 3, -1, -1, 9]);
    // floor / ceil: 5.5 .. 8.1 reaches samples 5..9.
    expect(unionGapIds(ids, count, 4, false, 19, 5.5, 8.1, out, 0)).toBe(3);
    expect(Array.from(out.subarray(0, 4))).toEqual([7, 3, 11, -1]);
    // Reversed spans read the same; nothing near: all -1, 0.
    expect(unionGapIds(ids, count, 4, false, 19, 8.1, 5.5, out, 0)).toBe(3);
    expect(unionGapIds(ids, count, 4, false, 19, 14, 18, out, 0)).toBe(0);
    expect(Array.from(out.subarray(0, 4))).toEqual([-1, -1, -1, -1]);
  });

  it("wraps rings across the seam (unwrapped arcs), clamps open chains", () => {
    const count = 20; // Ring of total 20: sample k sits at arc k.
    const ids = lanes(count, [
      [5, 0, 18, 21], // Across the seam: samples 18, 19, 0, 1.
      [6, 1, 10, 11],
    ]);
    const out = new Float32Array(4);
    expect(unionGapIds(ids, count, 4, true, 20, 20.5, 20.9, out, 0)).toBe(1);
    expect(out[0]).toBe(5);
    expect(unionGapIds(ids, count, 4, true, 20, -1.5, -0.5, out, 0)).toBe(1);
    expect(out[0]).toBe(5);
    // A span of a whole ring or more reads every sample once.
    expect(unionGapIds(ids, count, 4, true, 20, 3, 40, out, 0)).toBe(2);
    // Open: past either end clamps to the end samples.
    const open = lanes(count, [[8, 2, 0, 0], [9, 3, 19, 19]]);
    expect(unionGapIds(open, count, 4, false, 19, -3, -1, out, 0)).toBe(1);
    expect(out[0]).toBe(8);
    expect(unionGapIds(open, count, 4, false, 19, 25, 30, out, 0)).toBe(1);
    expect(out[0]).toBe(9);
  });

  it("reports overflow past the slots and refuses short id arrays", () => {
    const count = 10;
    const ids = lanes(count, [
      [1, 0, 0, 3],
      [2, 1, 0, 3],
      [3, 2, 0, 3],
      [4, 3, 0, 3],
      [5, 0, 4, 6], // Lane 0 again, once slot 1's window ended.
    ]);
    const out = new Float32Array(4);
    expect(unionGapIds(ids, count, 4, false, 9, 3, 4, out, 0)).toBe(5);
    expect(Array.from(out)).toEqual([1, 2, 3, 4]);
    expect(unionGapIds(ids.subarray(0, 8), count, 4, false, 9, 3, 4, out, 0)).toBe(0);
    expect(Array.from(out)).toEqual([-1, -1, -1, -1]);
  });
});

describe("pluck params (K180)", () => {
  it("lists the dropdown options, default first, and the pluckWhole max", () => {
    expect(PLUCK_CROSSINGS).toEqual(["through", "ride", "pinch"]);
    expect(PLUCK_GLOWS).toEqual(["off", "instead", "with", "fallback"]);
    // 3x the default W, still under the neighbor search's 2.2 grow.
    expect(PLUCK_WHOLE_MAX).toBe(1.5);
    expect(PLUCK_WHOLE_MAX / WHOLE_AMP).toBe(3);
    expect(PLUCK_WHOLE_MAX).toBeLessThan(2.2);
  });

  it("shows a pluck by K104's census line: 0.6 h and 2 CSS px, both", () => {
    expect(SHOW_MIN_H).toBe(0.6);
    expect(SHOW_MIN_PX).toBe(2);
    const h = 0.25;
    // Exactly on either edge shows; a hair under either does not.
    expect(pluckShows(0.6 * h, h, 1000)).toBe(true);
    expect(pluckShows(0.6 * h * (1 - 1e-9), h, 1000)).toBe(false);
    expect(pluckShows(h, h, (2 / h) * (1 - 1e-9))).toBe(false);
    expect(pluckShows(h, h, 2 / h)).toBe(true);
    // Zoomed out, a full-h swing can still be too small to see.
    expect(pluckShows(h, h, 4)).toBe(false);
    expect(pluckShows(0, h, 1e6)).toBe(false);
  });

  it("samples at the census's peak times", () => {
    expect(SHOW_DT).toEqual([0, 0.01, 0.02, 0.035, 0.05, 0.075, 0.1, 0.15, 0.2]);
  });

  it("builds a station's swing the way the overlay's envelope does", () => {
    const env = [0, 0];
    const ref = [0, 0];
    const b = 0.3;
    const q = 0.7;
    for (const x of [0.1, 0.3, 0.55, 0.9]) {
      envelope(b, x, q, ref);
      const s = 0.4;
      // Uncapped: the larger side of the lobe, plus W on both sides.
      const want = Math.max(ref[1] * s, -ref[0] * s) + 0.1;
      expect(drawnSwing(b, x, q, s, 0.1, 1, Infinity, Infinity, env)).toBeCloseTo(want, 12);
      // The side flip swaps which edge is which, not the larger excursion.
      expect(drawnSwing(b, x, q, s, 0.1, -1, Infinity, Infinity, env)).toBeCloseTo(want, 12);
    }
    // W alone: w on both sides.
    expect(drawnSwing(b, 0.5, q, 0, 0.3, 1, Infinity, Infinity, env)).toBe(0.3);
    // Nothing moving: 0.
    expect(drawnSwing(b, 0.5, q, 0, 0, 1, 0.1, 0.1, env)).toBe(0);
  });

  it("clamps the concave side by its cap, either side", () => {
    const env = [0, 0];
    const b = 0.5;
    const x = 0.5;
    const q = 1; // The triangle: hi = s at its apex, lo = -s.
    // Both sides capped under the swing: the larger cap wins.
    expect(drawnSwing(b, x, q, 1, 0, 1, 0.2, 0.3, env)).toBeCloseTo(0.3, 12);
    expect(drawnSwing(b, x, q, 1, 0, 1, 0.3, 0.2, env)).toBeCloseTo(0.3, 12);
    // One side free: the free side's full swing.
    expect(drawnSwing(b, x, q, 1, 0, 1, 0.2, Infinity, env)).toBeCloseTo(1, 12);
    // An off-center lobe (b 0.2: up 1, down 0.25). A side flip moves the
    // big excursion to the other edge, so the cap that clipped it before
    // now clips the small one.
    const tapped = [0, 0];
    envelope(0.2, 0.2, 1, tapped);
    const up = tapped[1];
    const down = -tapped[0];
    expect(up).toBeGreaterThan(down);
    expect(drawnSwing(0.2, 0.2, 1, 1, 0, 1, Infinity, 0, env)).toBeCloseTo(up, 12);
    expect(drawnSwing(0.2, 0.2, 1, 1, 0, -1, Infinity, 0, env)).toBeCloseTo(down, 12);
    expect(drawnSwing(0.2, 0.2, 1, 1, 0, -1, 0, Infinity, env)).toBeCloseTo(up, 12);
  });

  it("cues by the glow option: never, always, always, only when it cannot show", () => {
    for (const shows of [true, false]) {
      expect(glowCue("off", shows)).toBe(false);
      expect(glowCue("instead", shows)).toBe(true);
      expect(glowCue("with", shows)).toBe(true);
    }
    expect(glowCue("fallback", true)).toBe(false);
    expect(glowCue("fallback", false)).toBe(true);
  });
});

// K235: a tap whose lobe, minus its hide zones, is under LOBE_MIN_LEN draws no
// pluck (the overlay's skipCore) and so makes no sound either. tapLobes is
// the decision both read.
describe("a tap inside a junction core (K235)", () => {
  const node = (arc: number, hide = 0) => ({ arc, hide });

  it("trims a lobe by its hide zones plus the ramp, never past the far end", () => {
    expect(vibratingSpan(3, 6, 0, 0)).toEqual([3, 6]);
    const [a, b] = vibratingSpan(3, 6, 0.5, 0.25);
    expect(a).toBeCloseTo(3 + 0.5 + HIDE_RAMP, 12);
    expect(b).toBeCloseTo(6 - 0.25 - HIDE_RAMP, 12);
    // The zones overlap: an empty span at the near end, never negative.
    const [c, d] = vibratingSpan(3, 3.5, 0.5, 0.5);
    expect(c).toBeCloseTo(3.6, 12);
    expect(d).toBe(c);
  });

  it("a lobe with room to vibrate is not a core", () => {
    const nodes = [node(1), node(3, 0.5), node(6), node(8)];
    const t = tapLobes(nodes, 10, true, 4, 1);
    expect(t.core).toBe(false);
    expect(t.tapped).toMatchObject({ s0: 3, s1: 6, k: 0 });
    expect(t.vibrating?.[0]).toBeCloseTo(3 + 0.5 + HIDE_RAMP, 12);
    expect(t.vibrating?.[1]).toBeCloseTo(6, 12);
    // The unit keeps its neighbors (reach 1) for the overlay to lay out.
    expect(t.spans.map((s) => s.k)).toEqual([-1, 0, 1]);
  });

  it("no hide zones: the whole lobe vibrates, so a plain tap is never a core", () => {
    const nodes = [node(1), node(3), node(6), node(8)];
    for (const arc of [1.01, 2, 3, 4.5, 5.99, 7, 9, 0.5]) {
      expect(tapLobes(nodes, 10, true, arc, 2).core).toBe(false);
    }
  });

  it("two hide zones that meet leave nothing to vibrate: a core", () => {
    // A junction's two arms: nodes 0.9 apart, each hiding 0.5 + the ramp.
    const nodes = [node(1), node(3, 0.5), node(3.9, 0.5), node(8)];
    const t = tapLobes(nodes, 10, true, 3.4, 0);
    expect(t.tapped?.k).toBe(0);
    expect(t.tapped?.s0).toBeCloseTo(3, 9);
    expect(t.tapped?.s1).toBeCloseTo(3.9, 9);
    expect(t.core).toBe(true);
    expect(t.vibrating![1] - t.vibrating![0]).toBe(0);
    // The lobes either side of the core still vibrate.
    expect(tapLobes(nodes, 10, true, 2, 0).core).toBe(false);
    expect(tapLobes(nodes, 10, true, 6, 0).core).toBe(false);
  });

  it("one wide hide zone is enough", () => {
    const nodes = [node(1), node(3, 0.5), node(3.55), node(8)];
    expect(tapLobes(nodes, 10, true, 3.2, 0).core).toBe(true);
  });

  it("the cut is LOBE_MIN_LEN of vibrating arc, with nothing for the ramp to hide", () => {
    // Nodes 1.16 apart, hides 0.4 + 0.5 and two ramps: 1.16 - 1.1 = 0.06 left.
    const long = [node(3, 0.4), node(4.16, 0.5)];
    const wide = tapLobes(long, 10, true, 3.5, 0);
    expect(wide.vibrating![1] - wide.vibrating![0]).toBeCloseTo(0.06, 9);
    expect(wide.core).toBe(false);
    // 0.04 left: a core.
    const short = [node(3, 0.4), node(4.14, 0.5)];
    const narrow = tapLobes(short, 10, true, 3.5, 0);
    expect(narrow.vibrating![1] - narrow.vibrating![0]).toBeCloseTo(0.04, 9);
    expect(narrow.core).toBe(true);
    expect(LOBE_MIN_LEN).toBe(0.05);
  });

  it("a lobe under LOBE_MIN_LEN does not exist: no tapped lobe, and not a core", () => {
    // The overlay counts it skipOther, not skipCore (K235 keeps its sound).
    const nodes = [node(1), node(3), node(3.04), node(8)];
    const t = tapLobes(nodes, 10, true, 3.02, 1);
    expect(t.tapped).toBeNull();
    expect(t.vibrating).toBeNull();
    expect(t.core).toBe(false);
    expect(t.spans.some((s) => s.k === 0)).toBe(false);
  });

  it("open chains: the end nodes carry hide zones (a marker's gap) too", () => {
    const nodes = [node(0, 0.3), node(1.0), node(5, 0.3)];
    // The first lobe loses its start; it still vibrates.
    const near = tapLobes(nodes, 5, false, 0.5, 1);
    expect(near.core).toBe(false);
    expect(near.vibrating![0]).toBeCloseTo(0.3 + HIDE_RAMP, 12);
    // A start node whose gap swallows the whole first lobe.
    const gap = [node(0, 0.6), node(0.5), node(5)];
    expect(tapLobes(gap, 5, false, 0.2, 0).core).toBe(true);
    expect(tapLobes(gap, 5, false, 3, 0).core).toBe(false);
  });

  it("the walk-run span restricts the neighbors, never the verdict", () => {
    const nodes = [node(1), node(3, 0.5), node(3.9, 0.5), node(8)];
    const free = tapLobes(nodes, 10, true, 3.4, 2);
    const run = tapLobes(nodes, 10, true, 3.4, 2, [3, 3.9]);
    expect(free.core).toBe(true);
    expect(run.core).toBe(true);
    expect(run.spans.map((s) => s.k)).toEqual([0]);
    expect(free.spans.length).toBeGreaterThan(1);
  });

  it("a closed chain with no nodes is one long pseudo lobe: never a core", () => {
    const t = tapLobes([], 10, true, 4, 2);
    expect(t.tapped).toMatchObject({ a: -1, b: -1, k: 0 });
    expect(t.core).toBe(false);
    // A loop too short to hold a lobe has no tapped lobe at all.
    expect(tapLobes([], 0.04, true, 0.02, 1).tapped).toBeNull();
  });
});

describe("under-node clip on a self-crossing (K344)", () => {
  // A kink loop: the nodal cubic S (t^2 - 1, t (t^2 - 1)) crosses itself at
  // the origin, OVER at t = -1 (heading (-1, 1)/sqrt 2) and UNDER at t = +1
  // (heading (1, 1)/sqrt 2). The lobe runs from the over pass O to the
  // under pass U, and the under node's clip line is the over pass's own
  // line through the crossing (ribbon_renderer pluckNodes), so the lobe's
  // first stretch - the over pass itself - lies on it. Levi's loop
  // (2026-10-14, crossing 104 of `?qoietk.KIiHgRRXwRlRt8fGrST4sf`) had
  // length 3.84, A0 0.737, W0 0.39, h 0.26 and the full 1.5 reach.
  const loop = (S: number) => {
    const N = 3000;
    const pts: { x: number; y: number; nx: number; ny: number; s: number }[] = [];
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const t = -1 + (2 * i) / N;
      const x = S * (t * t - 1);
      const y = S * t * (t * t - 1);
      if (i > 0) s += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
      const dx = 2 * t;
      const dy = 3 * t * t - 1;
      const l = Math.hypot(dx, dy);
      pts.push({ x, y, nx: -dy / l, ny: dx / l, s });
    }
    return { pts, L: s };
  };
  const OVER_LINE = [0, 0, -Math.SQRT1_2, Math.SQRT1_2];
  const H = 0.26;
  const CASING = 0.36;
  const PX = 0.02;
  const REACH = 1.5;
  const SWING = 0.737 + 0.39 + H; // How far the blur reaches off the rest line.
  // Scales from a tight kink (L 1.2) past Levi's (S 1.41: L 3.83) to a wide
  // loop (L 6.8); the loop is 2.72 S long.
  const SCALES = [0.45, 0.8, 1.41, 2.5];

  it("never hides the loop's own over pass, at any size", () => {
    for (const S of SCALES) {
      const { pts, L } = loop(S);
      // The node's arcs on a closed chain of 20: O at 5, U at 5 + L.
      const ahead = selfPassAhead(5 + L, 5, -1, 20, true);
      expect(ahead).toBeCloseTo(L, 9);
      let hiddenBefore = 0;
      let hiddenAfter = 0;
      for (const p of pts) {
        // G1's split: the over pass's side of the midpoint, plus the guard.
        if (L - p.s < Math.max(CLIP_SELF_MIN, L / 2 - CLIP_SELF_GUARD)) continue;
        const w = underClipWeight(L - p.s, ahead);
        for (let u = -SWING; u <= SWING; u += 0.05) {
          const x = p.x + p.nx * u;
          const y = p.y + p.ny * u;
          // Master clipped the whole lobe at weight 1: the straight cut.
          if (clipKeep(OVER_LINE, REACH, 1, x, y, CASING, PX) < 1) hiddenBefore++;
          if (clipKeep(OVER_LINE, REACH, w, x, y, CASING, PX) < 1) hiddenAfter++;
        }
      }
      expect(hiddenBefore).toBeGreaterThan(0);
      expect(hiddenAfter).toBe(0);
    }
  });

  it("still tucks the under pass under its partner", () => {
    for (const S of SCALES) {
      const { pts, L } = loop(S);
      const ahead = selfPassAhead(5 + L, 5, -1, 20, true);
      let inBand = 0;
      for (const p of pts) {
        const d = L - p.s;
        if (d > 0.2) continue;
        const w = underClipWeight(d, ahead);
        expect(w).toBe(1);
        for (let u = -SWING; u <= SWING; u += 0.05) {
          const x = p.x + p.nx * u;
          const y = p.y + p.ny * u;
          const perp = Math.abs(x * OVER_LINE[3] - y * OVER_LINE[2]);
          const along = Math.abs(x * OVER_LINE[2] + y * OVER_LINE[3]);
          if (perp > CASING - PX || along > REACH - 0.2) continue;
          inBand++;
          expect(clipKeep(OVER_LINE, REACH, w, x, y, CASING, PX)).toBe(0);
        }
      }
      expect(inBand).toBeGreaterThan(0);
    }
  });

  it("a foreign partner keeps the clip over the whole lobe, as before", () => {
    // ribbon_renderer gives a foreign under node no selfArc.
    expect(selfPassAhead(3, NaN, 1, 20, true)).toBe(Infinity);
    expect(selfPassAhead(3, NaN, -1, 20, false)).toBe(Infinity);
    for (let d = 0; d <= 10; d += 0.01) expect(underClipWeight(d, Infinity)).toBe(1);
    // At weight 1 the mirror is PLUCK_FRAG's clipAt exactly.
    for (let x = -2; x <= 2; x += 0.1) {
      for (let y = -2; y <= 2; y += 0.1) {
        const along = Math.abs(x * OVER_LINE[2] + y * OVER_LINE[3]);
        const perp = Math.abs(x * OVER_LINE[3] - y * OVER_LINE[2]);
        let k = 1;
        if (along <= REACH) {
          const kk = Math.min(1, Math.max(0, (perp - CASING) / PX + 0.5));
          const t = Math.min(1, Math.max(0, (along - (REACH - 0.2)) / 0.2));
          k = kk + (1 - kk) * t * t * (3 - 2 * t);
        }
        expect(clipKeep(OVER_LINE, REACH, 1, x, y, CASING, PX)).toBeCloseTo(k, 12);
      }
    }
    // No reach, no clip, whatever the weight.
    expect(clipKeep(OVER_LINE, 0, 1, 0, 0, CASING, PX)).toBe(1);
  });

  it("the weight falls smoothly from 1 at the node to 0 at G1's split", () => {
    for (const ahead of [0.3, 0.6, 1.2, 3.84, 8]) {
      const end = Math.max(CLIP_SELF_MIN, ahead / 2 - CLIP_SELF_GUARD);
      const ramp = Math.min(CLIP_SELF_RAMP, end / 2);
      expect(underClipWeight(0, ahead)).toBe(1);
      expect(underClipWeight(end - ramp, ahead)).toBe(1);
      expect(underClipWeight(end, ahead)).toBeCloseTo(0, 12);
      expect(underClipWeight(ahead, ahead)).toBe(0);
      // Monotone, and no steeper than the smoothstep's 1.5 / ramp.
      const step = 0.001;
      let prev = 1;
      for (let d = 0; d <= ahead; d += step) {
        const w = underClipWeight(d, ahead);
        expect(w).toBeLessThanOrEqual(prev + 1e-12);
        expect(prev - w).toBeLessThanOrEqual((1.5 * step) / ramp + 1e-9);
        prev = w;
      }
    }
  });

  it("selfPassAhead walks into the lobe, wrapping only a closed chain", () => {
    // Levi's loop: over at 58.774, under at 62.615.
    expect(selfPassAhead(62.615, 58.774, -1, 100, true)).toBeCloseTo(3.841, 9);
    // From the under node the other way, the over pass is the long way round.
    expect(selfPassAhead(62.615, 58.774, 1, 100, true)).toBeCloseTo(96.159, 9);
    // Across a closed chain's seam.
    expect(selfPassAhead(19, 2, 1, 20, true)).toBeCloseTo(3, 12);
    // An open chain never wraps: behind the node is no pass ahead.
    expect(selfPassAhead(19, 2, 1, 20, false)).toBe(Infinity);
    expect(selfPassAhead(19, 2, -1, 20, false)).toBe(17);
    // A pass at the node itself is no pass ahead.
    expect(selfPassAhead(4, 4, 1, 20, true)).toBe(Infinity);
  });
});
