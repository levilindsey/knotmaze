// K1247 s19: the float32 twin of rec_glsl.ts's recPlace (checked against the GPU by k1247s19_twin.ts --gpu),
// and s19Frame: fillRec 2's frame with the record vertices placed by the twin, i.e. what oe=1 draws.
import { REC_TEXELS, SLOTS, fillFrame, recStrips, type FillFrame, type FillStructure, type StripItem } from "../../../src/render/outline/fill_tri";
import type { DiagramStructure, SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";

export const F = Math.fround;
// The chain table as band_gpu packs it (chainTex, chainInfo).
export function chainTables(zz: ReturnType<typeof zChains>): { CT: Float32Array; CI: Float32Array } {
  let nS = 0; const base: number[] = []; for (const c of zz.zc) { base.push(nS); nS += c.n; }
  const CT = new Float32Array(4 * Math.max(1, nS)); const CI = new Float32Array(4 * Math.max(1, zz.zc.length));
  zz.zc.forEach((c, i) => {
    for (let k = 0; k < c.n; k++) { const o = 4 * (base[i] + k); CT[o] = c.xs[k]; CT[o + 1] = c.ys[k]; CT[o + 2] = c.s[k]; CT[o + 3] = c.z[k]; }
    CI[4 * i] = base[i]; CI[4 * i + 1] = c.n; CI[4 * i + 2] = c.closed && c.len > 0 ? c.len : -1;
  });
  return { CT, CI };
}
// The float32 twin of rec_glsl's recPlace: [x, y, key, s].
export function twin(CT: Float32Array, CI: Float32Array, T: Float32Array, FB: Float32Array, hW: number, zt: number, sag: number, o: number, ri: number): number[] {
  const g = (q: number, k: number): number => CT[4 * q + k];
  const tan = (b: number, n: number, closed: boolean, i: number): number[] => {
    const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1); const c = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const avx = F(g(b + i, 0) - g(b + a, 0)); const avy = F(g(b + i, 1) - g(b + a, 1)); const bvx = F(g(b + c, 0) - g(b + i, 0)); const bvy = F(g(b + c, 1) - g(b + i, 1));
    const dx = F(avx + bvx); const dy = F(avy + bvy); let l = F(Math.hypot(dx, dy)); if (!(l > 0)) l = 1;
    const out = [F(dx / l), F(dy / l), 0];
    const la = F(Math.hypot(avx, avy)); const lb = F(Math.hypot(bvx, bvy));
    if (la > 1e-12 && lb > 1e-12) { const cr = F(F(F(avx * bvy) - F(avy * bvx)) / F(la * lb)); const dt = F(F(F(avx * bvx) + F(avy * bvy)) / F(la * lb)); out[2] = F(F(Math.atan2(cr, dt)) / F(0.5 * F(la + lb))); }
    return out;
  };
  const wrap = (b: number, m: number, L: number, u0: number): number => { let u = u0; if (L > 0) { if (u < 0 || u >= L) u = F(u - F(L * Math.floor(F(u / L)))); } else u = Math.min(Math.max(u, 0), g(b + m, 2)); return u; };
  const seg = (b: number, n: number, L: number, u: number): [number, number, number] => {
    const m = n - 1; let k: number;
    if (u >= g(b + m, 2)) k = L > 0 ? m : m - 1;
    else { let lo = 0; let hi = m; while (hi - lo > 1) { const q = (lo + hi) >> 1; if (g(b + q, 2) <= u) lo = q; else hi = q; } k = lo; }
    const j = k < m ? k + 1 : 0; const sk = g(b + k, 2); const e = k < m ? g(b + k + 1, 2) : L; const sl = F(e - sk);
    return [k, j, sl > 0 ? F(F(u - sk) / sl) : 0];
  };
  const off = (b: number, n: number, L: number, u0: number, sgn: number, stp: number): number[] => {
    const [k, j, f] = seg(b, n, L, wrap(b, n - 1, L, u0));
    const ta = tan(b, n, L > 0, k); const tb = tan(b, n, L > 0, j);
    const x = F(g(b + k, 0) + F(F(g(b + j, 0) - g(b + k, 0)) * f)); const y = F(g(b + k, 1) + F(F(g(b + j, 1) - g(b + k, 1)) * f));
    let ax = F(ta[0] + F(F(tb[0] - ta[0]) * f)); let ay = F(ta[1] + F(F(tb[1] - ta[1]) * f)); let l = F(Math.hypot(ax, ay)); if (!(l > 0)) l = 1; ax = F(ax / l); ay = F(ay / l);
    const kap = F(ta[2] + F(F(tb[2] - ta[2]) * f)); const ak = Math.abs(kap);
    const bb = sgn * kap > 0 ? Math.min(hW, F(0.9 / ak)) : F(hW + F(F(F(F(sag * stp) * stp) * ak) * F(1 + F(hW * ak))) / 8);
    return [F(x - F(F(sgn * bb) * ay)), F(y + F(F(sgn * bb) * ax))];
  };
  const zAt = (b: number, n: number, L: number, u0: number): number => {
    const m = n - 1; const u = wrap(b, m, L, u0);
    if (!(L > 0) && u >= g(b + m, 2)) return g(b + m, 3);
    const [k, j, f] = seg(b, n, L, u); return F(g(b + k, 3) + F(F(g(b + j, 3) - g(b + k, 3)) * f));
  };
  const q = 4 * REC_TEXELS * o; const r = ri >> 16; const i = ri & 65535; const N = T[q + 9];
  if (T[q + 7] < 0.5) { const p = 4 * (T[q + 10] + r * (N + 1) + i); return [FB[p], FB[p + 1], FB[p + 2], FB[p + 3]]; }
  const ci = 4 * T[q + 8]; const b = CI[ci]; const n = CI[ci + 1]; const L = CI[ci + 2];
  const z = zAt(b, n, L, F(T[q + 4] + F(F(T[q + 5] * i) / N)));
  const sL = F(T[q] + F(F(T[q + 1] * i) / N)); const sR = F(T[q + 2] + F(F(T[q + 3] * i) / N));
  const pl = r !== 2 ? off(b, n, L, sL, T[q + 6], F(T[q + 1] / N)) : [0, 0];
  const pr = r !== 0 ? off(b, n, L, sR, -T[q + 6], F(T[q + 3] / N)) : [0, 0];
  if (r === 0) return [pl[0], pl[1], F(z - zt), sL];
  if (r === 2) return [pr[0], pr[1], F(z - zt), sR];
  return [F((pl[0] + pr[0]) / 2), F((pl[1] + pr[1]) / 2), z, F((sL + sR) / 2)];
}
/** The record vertices of fs: (fill vertex, strip ordinal, (row << 16) | column). */
export function recVerts(fs: FillStructure): { recV: number[]; recO: number[]; recRI: number[] } {
  const strips = recStrips(fs); const recV: number[] = []; const recO: number[] = []; const recRI: number[] = [];
  for (let o = 0; o < strips.length; o++) {
    const it = fs.items[strips[o]] as StripItem; const W = it.N + 1;
    for (let r = 0; r < 3; r++) for (let i = 2; i <= it.N - 2; i++) { recV.push(it.base + r * W + i); recO.push(o); recRI.push((r << 16) | i); }
  }
  return { recV, recO, recRI };
}
/** What oe=1 draws on this frame: fillFrame with fillRec 2, records placed by the twin (pos, key, s slot 0). */
export function s19Frame(fs: FillStructure, st: DiagramStructure, tb: Parameters<typeof fillFrame>[2], sc: SceneIn, zz: ReturnType<typeof zChains>, rv = recVerts(fs)): FillFrame {
  const b = fillFrame(fs, st, tb, { ...sc, look: { ...sc.look, fillRec: 2 } } as SceneIn, zz);
  const rec = b.rec!; const { CT, CI } = chainTables(zz);
  for (let q = 0; q < rv.recV.length; q++) {
    const v = rv.recV[q]; const t = twin(CT, CI, rec.strip, rec.fb, rec.hW, rec.zt, 0, rv.recO[q], rv.recRI[q]);
    b.pos[2 * v] = t[0]; b.pos[2 * v + 1] = t[1]; b.key[v] = t[2]; b.s4[SLOTS * v] = t[3];
  }
  return b;
}
