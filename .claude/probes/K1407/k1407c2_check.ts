// K1407 c2: the per-spot numeric check against Levi's bar (K1315: the over thread's outline runs on unbroken; no
// dot, no stub, no tick, no sliver, no wedge). On the gf mirror (eval.ts of the checkout it runs in), over k1407_crops'
// 480 px frame (WH = 2.5h), within R of the spot:
//   extra  = pixels inked > 0.25 that lie deeper than W + 3aa inside the paint of the surface on top there (its
//            coverage, eval's per-surface scov, distance-transformed): a dot, a stub or a tick into the paint;
//   broken = pixels of the top surface within W - 3aa of its edge, where the nearest pixel off that surface is paper
//            (so its outline must be drawn), inked < 0.5: a cut, a notch, a wedge of paint through the outline.
// Both are 0 on a clean outline. c1's rows 5-10 stubs read as extra (master), the eye's cut as broken.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c2_check.ts <scene:x:y,...> [R=0.28]
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";

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
  let extra = 0, extraMax = 0, broken = 0, brokenMin = 1;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    if ((c - P / 2) ** 2 + (r - P / 2) ** 2 > Rp * Rp) continue;
    const i = r * P + c; if (top[i] === -0x7fffffff) continue; const dg = depth.get(top[i])![i];
    if (dg > hi && ink[i] > 0.25) { extra++; if (ink[i] > extraMax) extraMax = ink[i]; }
    if (dg < lo && dPaper[i] <= dg + 1.5 && ink[i] < 0.5) { broken++; if (ink[i] < brokenMin) brokenMin = ink[i]; }
  }
  console.log(`${nm}:${X.toFixed(2)}:${Y.toFixed(2)}  extra ${extra} px (max ink ${extraMax.toFixed(2)})  broken ${broken} px (min ink ${broken ? brokenMin.toFixed(2) : "-"})`);
}
