// K1247 s21: colRow (a record side's columns in one walk, the structure's frame 0 under fillRec 3) is
// colAt (one column, the shader's recCol) bit for bit, on loops and open chains with convex fans and
// concave miters, any span (wrapped, longer than a lap, clamped past an open end) and column range.
import { describe, expect, it } from "vitest";
import { colAt, colRow, recTables, type FrameChain } from "../../src/render/outline/chain_frame";

function chain(closed: boolean, n: number, seed: number): FrameChain {
  let q = seed >>> 0; const rnd = (): number => { q = (q * 1103515245 + 12345) >>> 0; return q / 4294967296; };
  const xs = new Float64Array(n); const ys = new Float64Array(n);
  // A wobbly star: alternating radii make convex and concave corners, the noise uneven segments.
  for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; const r = 10 + (i % 2 ? 3 : 0) + rnd() * 2; xs[i] = r * Math.cos(a); ys[i] = r * Math.sin(a); }
  const s = new Float64Array(n); for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  const len = s[n - 1] + (closed ? Math.hypot(xs[0] - xs[n - 1], ys[0] - ys[n - 1]) : 0);
  return { closed, len, xs, ys, s, n };
}

describe("K1247 s21 colRow", () => {
  it("places every column of a range exactly as colAt does", () => {
    const h = 0.6; let cols = 0; let seed = 7;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    for (const [closed, n] of [[true, 24], [true, 9], [false, 17], [false, 5]] as const) {
      const c = chain(closed, n, n * 31 + (closed ? 1 : 0)); const T = recTables([c], h);
      for (let t = 0; t < 300; t++) {
        const sA = (rnd() * 3 - 1) * c.len; const dS = Math.fround(rnd() * c.len * (rnd() < 0.2 ? 1.3 : 0.4));
        const N = 2 + Math.floor(rnd() * 70); const sg = rnd() < 0.5 ? 1 : -1;
        const iLo = 1 + Math.floor(rnd() * 2); const iHi = N - 1 - Math.floor(rnd() * 2); if (iHi < iLo) continue;
        const A = new Float64Array(2 * (N + 1)); const SA = new Float64Array(N + 1);
        const R = new Float64Array(2 * (N + 1)); const SR = new Float64Array(N + 1);
        for (let i = iLo; i <= iHi; i++) SA[i] = colAt(c, T.pf, T.base[0], sA, dS, N, sg, h, i, A, 2 * i);
        colRow(c, T.pf, T.base[0], sA, dS, N, sg, h, iLo, iHi, R, SR);
        for (let i = iLo; i <= iHi; i++, cols++) {
          expect([R[2 * i], R[2 * i + 1], SR[i]]).toEqual([A[2 * i], A[2 * i + 1], SA[i]]);
        }
      }
    }
    expect(cols).toBeGreaterThan(20000);
  });
});
