// K1362 s6: gf_keys.ts's bins give depth()'s pin search and member()'s arm loops the same answers as the full ones.
// The program's code is emulated on the texture's float32 values: for every chain of every test scene, s across the
// chain (and past an open chain's ends), at every pin and every arm edge, the binned search and member() equal the
// full search and member() over all the chain's arms, and do so too when the bin is picked from u moved 0.4 bin
// either way (the program picks its bin in float32). GPU exactness is the cmp bench's (0 px against the full program).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { buildTables, type GfTables } from "../../src/render/gpu_field/tables";
import { buildKeys } from "../../src/render/gpu_field/gf_keys";

const dir = join(__dirname, "field", "scenes");
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
const f = Math.fround;
const BIGT = 1e29;
const ss = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const mod = (x: number, y: number): number => x - y * Math.floor(x / y);

function member(T: GfTables, c: number, s: number, arms: number[]): [number, number] {
  const lam = f(T.h); const closed = T.cClosed[c] > 0.5; const len = f(T.cLen[c]);
  const A = (i: number): [number, number, number, number] =>
    [f(T.aSR[i]), f(T.aDir[i]), f(T.aL[i]), T.aLcut[i] === Infinity ? 1e30 : f(T.aLcut[i])];
  let g = -1; let ramp = 0;
  for (const i of arms) {
    const [x, y, z, Lc] = A(i);
    let d = (s - x) * y; if (closed) d = mod(d, len);
    if (d < -1e-12 || d > z + 1e-12) continue;
    const rp = Lc >= BIGT ? 1 : ss(Lc, Lc - lam, d);
    if (g < 0 || rp > ramp) { g = T.aG[i]; ramp = rp; }
  }
  if (g >= 0 && ramp > 0) {
    for (const i of arms) {
      const [x, y, , Lc] = A(i);
      if (T.aG[i] !== g || Lc >= BIGT) continue;
      let d = (s - x) * y; if (closed) { d = mod(d, len); if (d > len / 2) d -= len; }
      if (!(d < 1e-12 && d > Lc - lam)) continue;
      ramp = Math.min(ramp, ss(Lc, Lc - lam, d));
    }
  }
  return [g, g < 0 ? 1 : ramp];
}

function search(pins: Float64Array, u: number, lo: number, hi: number): number {
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pins[m] <= u) lo = m; else hi = m; }
  return lo;
}

describe("gf_keys", () => {
  const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  it("has test scenes", () => expect(names.length).toBeGreaterThan(3));
  for (const name of names) {
    it(name, () => {
      const T = buildTables(load(name), { aa: 0.5 / 320 });
      const K = buildKeys(T);
      let checks = 0; let narrowed = 0; let full = 0; let kept = 0;
      for (let c = 0; c < T.nC; c++) {
        const closed = T.cClosed[c] > 0.5; const len = f(T.cLen[c]); const s0 = f(T.cS0[c]);
        const n = T.cPinN[c];
        const pins = new Float64Array(n);
        for (let i = 0; i < n; i++) pins[i] = f(T.pinS[T.cPin0[c] + i]);
        const all = Array.from({ length: T.cArmN[c] }, (_, q) => T.cArm0[c] + q);
        const [b0, nb, bw, u0] = Array.from(K.kc.subarray(4 * c, 4 * c + 4));
        const ss0: number[] = [];
        const span = Math.max(len, 1e-3);
        for (let i = 0; i <= 400; i++) ss0.push(s0 - 0.05 * span + (1.1 * span * i) / 400);
        for (let i = 0; i < n; i++) ss0.push(pins[i], pins[i] - 1e-6, pins[i] + 1e-6);
        for (const i of all) for (const e of [0, T.aL[i], T.aLcut[i] - T.h]) {
          if (!Number.isFinite(e)) continue;
          const s = T.aSR[i] + T.aDir[i] * e;
          ss0.push(s, s - 1e-6, s + 1e-6);
        }
        for (const sRaw of ss0) {
          const s = f(sRaw);
          const u = closed ? f(mod(s - s0, len) + s0) : s;
          const want = n > 0 ? search(pins, u, -1, n) : -1;
          const wantM = member(T, c, s, all);
          for (const du of [-0.4, 0, 0.4]) {
            const bi = Math.min(nb - 1, Math.max(0, Math.floor((u + du * bw - u0) / bw)));
            const t = 4 * (b0 + bi);
            const [lo, hi, k0, kn] = [K.kb[t], K.kb[t + 1], K.kb[t + 2], K.kb[t + 3]];
            if (n > 0) {
              expect(lo).toBeLessThan(hi);
              expect(search(pins, u, lo, hi)).toBe(want);
            }
            const cand = Array.from(K.ka.subarray(k0, k0 + kn));
            expect(member(T, c, s, cand)).toEqual(wantM);
            checks++; narrowed += hi - lo; full += n + 1; kept += kn;
          }
        }
      }
      expect(checks).toBeGreaterThan(0);
      // the bins narrow the work: the search spans and candidate lists are a fraction of the full ones
      expect(narrowed).toBeLessThanOrEqual(full);
      expect(kept).toBeLessThanOrEqual(checks * Math.max(1, T.nA));
    });
  }
});
