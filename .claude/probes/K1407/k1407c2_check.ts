// K1407 c2: the per-spot numeric check against Levi's bar (K1315: the over thread's outline runs on unbroken; no
// dot, no stub, no tick, no sliver, no wedge). On the gf mirror (eval.ts of the checkout it runs in), over k1407_crops'
// 480 px frame (WH = 2.5h), within R of the spot:
//   extra  = pixels inked > 0.25 that lie deeper than W + 3aa inside the paint of the surface on top there (its
//            coverage, eval's per-surface scov, distance-transformed): a dot, a stub or a tick into the paint;
//   broken = pixels of the top surface within W - 3aa of its edge, where the nearest pixel off that surface is paper
//            (so its outline must be drawn), inked < 0.5: a cut, a notch, a wedge of paint through the outline.
// Both are 0 on a clean outline. c1's rows 5-10 stubs read as extra (master), the eye's cut as broken.
//   notch  = (K1407 c3) pixels of the same outline band (within W + 3aa of the edge, next to paper) inked more than
//            0.15 below the band's ideal ink e(d) = ss(-aa,aa,d) (1 - ss(W-aa,W+aa,d)), taken at its least over
//            +-1.5 px of distance-transform slop: a dip or a seam across the band that never falls below 0.5
//            (c2's ~2 px notches at the j97/j135 seam read 0 in broken), or an inner edge pulled in by > 1.5 px.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c2_check.ts <scene:x:y,...> [R=0.28]
//   env K1407_EVAL=m1 checks master's eval instead: a temporary copy at src/render/gpu_field/eval_m1.ts
//   (git show origin/master:src/render/gpu_field/eval.ts; delete it after, it is not part of the build).
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
const { GfEval } = process.env.K1407_EVAL === "m1" ? await import("../../../src/render/gpu_field/eval_m1.ts") : await import("../../../src/render/gpu_field/eval.ts");

const [list, rArg] = process.argv.slice(2);
const R = rArg ? +rArg : 0.28; const P = 480;
// squared Euclidean distance transform (Felzenszwalb-Huttenlocher), 1 = feature (distance 0)
const edt1 = (f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void => {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
};
const edt = (feat: Uint8Array): Float64Array => {
  const BIG = 1e12; const g = new Float64Array(P * P); for (let i = 0; i < P * P; i++) g[i] = feat[i] ? 0 : BIG;
  const f = new Float64Array(P); const d = new Float64Array(P); const v = new Int32Array(P); const z = new Float64Array(P + 1);
  for (let x = 0; x < P; x++) { for (let y = 0; y < P; y++) f[y] = g[y * P + x]; edt1(f, P, d, v, z); for (let y = 0; y < P; y++) g[y * P + x] = d[y]; }
  for (let y = 0; y < P; y++) { for (let x = 0; x < P; x++) f[x] = g[y * P + x]; edt1(f, P, d, v, z); for (let x = 0; x < P; x++) g[y * P + x] = Math.sqrt(d[x]); }
  return g;
};
const models = new Map<string, { T: any; E: any }>();
for (const spec of list.split(",")) {
  const [nm, xs, ys] = spec.split(":"); const X = +xs, Y = +ys;
  if (!models.has(nm)) { const T = gfTablesOf(buildModel(nm)) as any; models.set(nm, { T, E: new GfEval(T) }); }
  const { T, E } = models.get(nm)!;
  const h = T.h, S = 2.5 * h, ppu = P / S; const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
  const ink = new Float32Array(P * P); const top = new Int32Array(P * P).fill(-0x7fffffff); const paper = new Uint8Array(P * P);
  const cover = new Map<number, Uint8Array>();
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const i = r * P + c; const e = E.eval((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu); ink[i] = e.ink;
    let any = false; let tp = -0x7fffffff;
    for (let o = 0; o < E.ns; o++) { const s = E.sord[o]; if (!E.scov[s]) continue; const id = E.sid[s]; any = true; if (tp === -0x7fffffff) tp = id; let m = cover.get(id); if (!m) { m = new Uint8Array(P * P); cover.set(id, m); } m[i] = 1; }
    top[i] = tp; paper[i] = any ? 0 : 1;
  }
  const dPaper = edt(paper);
  const depth = new Map<number, Float64Array>();
  for (const [id, m] of cover) { const off = new Uint8Array(P * P); for (let i = 0; i < P * P; i++) off[i] = m[i] ? 0 : 1; depth.set(id, edt(off)); }
  const lo = (T.W - 3 * T.aa) * ppu, hi = (T.W + 3 * T.aa) * ppu, Rp = R * ppu;
  const ssf = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const eAt = (dpx: number): number => { const d = dpx / ppu; return ssf(-T.aa, T.aa, d) * (1 - ssf(T.W - T.aa, T.W + T.aa, d)); };
  let extra = 0, extraMax = 0, broken = 0, brokenMin = 1, notch = 0, notchMax = 0;
  let nc0 = P, nc1 = -1, nr0 = P, nr1 = -1;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    if ((c - P / 2) ** 2 + (r - P / 2) ** 2 > Rp * Rp) continue;
    const i = r * P + c; if (top[i] === -0x7fffffff) continue; const dg = depth.get(top[i])![i];
    if (dg > hi && ink[i] > 0.25) { extra++; if (ink[i] > extraMax) extraMax = ink[i]; }
    if (dg < lo && dPaper[i] <= dg + 1.5 && ink[i] < 0.5) { broken++; if (ink[i] < brokenMin) brokenMin = ink[i]; }
    if (dg <= hi && dPaper[i] <= dg + 1.5) {
      const dd = dg - 0.5; const eLo = Math.min(eAt(dd - 1.5), eAt(dd), eAt(dd + 1.5)); const def = eLo - ink[i];
      if (def > 0.15) { notch++; if (def > notchMax) notchMax = def; if (c < nc0) nc0 = c; if (c > nc1) nc1 = c; if (r < nr0) nr0 = r; if (r > nr1) nr1 = r; }
    }
  }
  // seam (K1407 c3): a valley across the outline's outer anti-aliased edge (the j97/j135 seam: ink 30 -> 20 -> 31
  // across ~10 px): pixels within 12 px of paper, inked 0.03..0.97, whose ink sits more than SEAM below the mean of
  // their two opposite neighbours in any of 4 directions (1 px; diagonals sqrt 2). A smooth ss ramp's 1 px second
  // difference is about 1.5 / (2 aa ppu)^2 <= 0.011 at these scales.
  const SEAM = 0.05;
  let seam = 0, seamMax = 0, sc0 = P, sc1 = -1, sr0 = P, sr1 = -1;
  for (let r = 1; r < P - 1; r++) for (let c = 1; c < P - 1; c++) {
    if ((c - P / 2) ** 2 + (r - P / 2) ** 2 > Rp * Rp) continue;
    const i = r * P + c; const v = ink[i]; if (!(v > 0.03 && v < 0.97)) continue;
    const dip = Math.max((ink[i - 1] + ink[i + 1]) / 2, (ink[i - P] + ink[i + P]) / 2, (ink[i - P - 1] + ink[i + P + 1]) / 2, (ink[i - P + 1] + ink[i + P - 1]) / 2) - v;
    if (dip > SEAM) { seam++; if (dip > seamMax) seamMax = dip; if (c < sc0) sc0 = c; if (c > sc1) sc1 = c; if (r < sr0) sr0 = r; if (r > sr1) sr1 = r; }
  }
  console.log(`${nm}:${X.toFixed(2)}:${Y.toFixed(2)}  extra ${extra} px (max ink ${extraMax.toFixed(2)})  broken ${broken} px (min ink ${broken ? brokenMin.toFixed(2) : "-"})  notch ${notch} px (max deficit ${notch ? notchMax.toFixed(2) : "-"}${notch ? `, box c${nc0}-${nc1} r${nr0}-${nr1}` : ""})  seam ${seam} px (max dip ${seam ? seamMax.toFixed(2) : "-"}${seam ? `, box c${sc0}-${sc1} r${sr0}-${sr1}` : ""})`);
}
