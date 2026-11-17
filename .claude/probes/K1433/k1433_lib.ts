// K1433 part 1: a direct test of Levi's bar on one evaluator, with no reference image.
// It judges each pixel from the evaluator's own per-surface state (steps 1-3: which surfaces are here, their
// depth D inside their own coverage, their key order) against the ink it returned:
//   break = the highest surface with any coverage here (a > 0) shows its edge, and the ink is below what an
//           unbroken outline gives: in the edge's AA zone (|D| < aa) the outline's ink equals the coverage a
//           (band2(D) = a there, whatever the corner's shape); deeper, to W - aa, it is 1. Where the surface has
//           more than one member near (multi), D is the max of the members' depths: exact but at a sharp
//           concave vertex (a null corner), where it mitres; such finds are counted apart (m).
//           deficit = expected - ink; a pixel that mixes configurations takes the least deficit of them.
//   stray = ink > STRAY where the first surface with coverage is deeper than W + 3 aa inside (D is a lower bound of
//           the true depth, so this holds for any corner shape), or where nothing covers (ink on paper).
// Classes: thru (K1049's through-pass arc drew the pixel), tie (two covering surfaces' keys within zt: form B's
// blend), ramp (more than one configuration), plain.
// Limits: it reads the evaluator's own coverage, so it cannot see a fill that is itself wrong; and it cannot judge
// a corner's shape.
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";

export const STRAY = 0.25;
export type Cls = "plain" | "ramp" | "tie" | "thru";
export interface Judged { def: number; stray: boolean; cls: Cls; multi: boolean; grp: number; ink: number; cov: number; chain: number; s: number; segs: number; pcalls: number; nSeg: number; nK: number; cfgs: number }

export async function loadEval(which: string): Promise<any> {
  if (which === "d547") return (await import("./eval_d547.ts")).GfEval;
  if (which === "1336") return (await import("./eval_1336.ts")).GfEval;
  return (await import("./eval_u.ts")).GfEval;
}

export function makeJudge(E: any): (x: number, y: number) => Judged {
  const T = E.T; const h = T.h; const aa = T.aa; const W = T.W; const zt = T.zt;
  let calls = 0; let minDef = Infinity; let allDeep = true; let tie = false; let segs = 0; let pcalls = 0; let multi = false; let grp = -1;
  const oD = E.pieceD.bind(E); const oF = E.pieceF ? E.pieceF.bind(E) : null; const oC = E.composite.bind(E);
  E.pieceD = (j: number, x: number, y: number): number => { segs += E.phi[j] - E.plo[j] + 1; pcalls++; return oD(j, x, y); };
  if (oF) E.pieceF = (j: number, x: number, y: number): number => { segs += E.phi[j] - E.plo[j] + 1; pcalls++; return oF(j, x, y); };
  const depthOf = (e: number): number => {
    if (E.sD) return E.sD[e];
    const S = E.sid[e]; let D = -Infinity;
    for (let j = 0; j < E.np; j++) if (E.psurf[j] === S && E.pd[j] < h + aa && h - E.pd[j] > D) D = h - E.pd[j];
    for (let i = 0; i < E.nk; i++) { const k = E.kk[i]; if (T.kG[k] === S && E.kSec[i] && T.kR[k] > 0 && E.kIn[i] === 2 && E.krho[i] - T.kR[k] > D) D = E.krho[i] - T.kR[k]; }
    return D;
  };
  const single = (e: number): boolean => {
    const S = E.sid[e]; let n = 0;
    for (let j = 0; j < E.np; j++) if (E.psurf[j] === S && E.pd[j] < h + W + 2 * aa) n++;
    for (let i = 0; i < E.nk; i++) if (T.kG[E.kk[i]] === S) n += 2;
    return n === 1;
  };
  E.composite = (): number => {
    const r = oC(); calls++;
    const ns = E.ns; let first = -1; let prev = -1;
    for (let i = 0; i < ns; i++) {
      const e = E.sord[i]; const D = depthOf(e); if (!(D > -aa)) continue;
      if (prev >= 0 && E.skey[prev] - E.skey[e] < zt) tie = true;
      if (first < 0) first = e;
      prev = e;
      if (D >= aa && prev !== first && !(E.skey[first] - E.skey[e] < zt)) break; // below a full cover, past the tie window
    }
    grp = -1; for (let i = 0; i < ns; i++) { const e = E.sord[i]; if (E.sa[e] > 0.5) { grp = E.sid[e] >= 0 ? E.sid[e] : -1; break; } }
    let def = -Infinity; let deep = true; let multiNow = false;
    if (first >= 0) {
      const D = depthOf(first);
      if (D < aa) def = E.sa[first] - r;
      else if (D < W - aa) { def = 1 - r; if (!single(first)) multiNow = true; }
      deep = D > W + 3 * aa;
    }
    if (def < minDef) { minDef = def; multi = multiNow; } if (!deep) allDeep = false;
    return r;
  };
  return (x: number, y: number): Judged => {
    calls = 0; minDef = Infinity; allDeep = true; tie = false; segs = 0; pcalls = 0; multi = false; grp = -1;
    const o = E.eval(x, y);
    const cls: Cls = o.winKind === 5 ? "thru" : tie ? "tie" : calls > 1 ? "ramp" : "plain";
    return { def: calls ? minDef : -Infinity, stray: o.ink > STRAY && (calls === 0 || allDeep), cls, multi, grp, ink: o.ink, cov: o.cov, chain: o.chain, s: o.s, segs, pcalls, nSeg: o.nSeg, nK: o.nK, cfgs: calls };
  };
}

const MODELS = new Map<string, any>();
export function modelOf(nm: string): any { let m = MODELS.get(nm); if (!m) { m = buildModel(nm); MODELS.set(nm, m); } return m; }
export function tablesOf(nm: string): any { return gfTablesOf(modelOf(nm)); }

// ---- the raster half of the test: exposed edges found on the evaluator's own picture, with no depth formula.
// Two neighbouring pixels are one surface when both are covered and (same chain and |ds| < 2h, or the same junction
// group); an EXPOSED EDGE lies between two pixels that are not (thread against paper, or against another surface).
//   rbreak = an edge pixel with no ink >= RB within one aa (at least 1 px) of it: the outline is missing there.
//   rthin  = within 0.8 (W - 2aa) of an edge on its inked side (ink >= 0.9 between it and the edge) with ink < 0.5: a notch.
//   rstray = ink > STRAY farther than W + aa + 1.5 px (exact distance) from every exposed edge.
// It complements the depth half (def / stray above), which is exact only where one member covers.
export const RB = 0.6;
export const FAR_AA = process.env.K1433_FAR ? +process.env.K1433_FAR : 1; // the stray margin past the band, in aa
export interface Raster { w: number; h: number; ppu: number; ink: Float32Array; cov: Float32Array; chain: Int32Array; s: Float32Array; grp: Int32Array; cls: Uint8Array; def: Float32Array; dstray: Uint8Array; multi: Uint8Array }
export const CLS: Cls[] = ["plain", "ramp", "tie", "thru"];
export function rasterJudge(J: (x: number, y: number) => Judged, c0: number, r0: number, w: number, h: number, ppu: number): Raster {
  const n = w * h; const R: Raster = { w, h, ppu, ink: new Float32Array(n), cov: new Float32Array(n), chain: new Int32Array(n), s: new Float32Array(n), grp: new Int32Array(n), cls: new Uint8Array(n), def: new Float32Array(n), dstray: new Uint8Array(n), multi: new Uint8Array(n) };
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const j = J((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu); const i = r * w + c;
    R.ink[i] = j.ink; R.cov[i] = j.cov; R.chain[i] = j.chain; R.s[i] = j.s; R.grp[i] = j.grp; R.cls[i] = CLS.indexOf(j.cls); R.def[i] = j.def; R.dstray[i] = j.stray ? 1 : 0; R.multi[i] = j.multi ? 1 : 0;
  }
  return R;
}
export interface Flags { edge: Uint8Array; rbreak: Uint8Array; rstray: Uint8Array; rthin: Uint8Array; dist: Float32Array }
export function analyze(R: Raster, T: any): Flags {
  const { w, h, ppu } = R; const n = w * h; const edge = new Uint8Array(n);
  const same = (a: number, b: number): boolean => {
    const ca = R.cov[a] > 0.5, cb = R.cov[b] > 0.5; if (!ca && !cb) return true; if (ca !== cb) return false;
    if (R.chain[a] === R.chain[b] && Math.abs(R.s[a] - R.s[b]) < 2 * T.h) return true;
    return R.grp[a] >= 0 && R.grp[a] === R.grp[b];
  };
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const i = r * w + c;
    if (c + 1 < w && !same(i, i + 1)) { edge[i] = 1; edge[i + 1] = 1; }
    if (r + 1 < h && !same(i, i + w)) { edge[i] = 1; edge[i + w] = 1; }
  }
  // distance to the nearest edge pixel (two-pass 3-4 chamfer, in px)
  const dist = new Float32Array(n).fill(1e9);
  for (let i = 0; i < n; i++) if (edge[i]) dist[i] = 0;
  const A = 1, B = Math.SQRT2;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const i = r * w + c; let d = dist[i];
    if (c > 0 && dist[i - 1] + A < d) d = dist[i - 1] + A; if (r > 0) { if (dist[i - w] + A < d) d = dist[i - w] + A; if (c > 0 && dist[i - w - 1] + B < d) d = dist[i - w - 1] + B; if (c + 1 < w && dist[i - w + 1] + B < d) d = dist[i - w + 1] + B; } dist[i] = d; }
  for (let r = h - 1; r >= 0; r--) for (let c = w - 1; c >= 0; c--) { const i = r * w + c; let d = dist[i];
    if (c + 1 < w && dist[i + 1] + A < d) d = dist[i + 1] + A; if (r + 1 < h) { if (dist[i + w] + A < d) d = dist[i + w] + A; if (c + 1 < w && dist[i + w + 1] + B < d) d = dist[i + w + 1] + B; if (c > 0 && dist[i + w - 1] + B < d) d = dist[i + w - 1] + B; } dist[i] = d; }
  const rad = Math.max(1, Math.ceil(T.aa * ppu)); const far = (T.W + FAR_AA * T.aa) * ppu + 1.5; const fr = Math.ceil(far);
  const nearEdge = (r: number, c: number): boolean => { // exact: an edge pixel within far (the chamfer only overestimates)
    for (let dr = -fr; dr <= fr; dr++) { const rr = r + dr; if (rr < 0 || rr >= h) continue; const sp = Math.floor(Math.sqrt(far * far - dr * dr)); for (let dc = -sp; dc <= sp; dc++) { const cc = c + dc; if (cc >= 0 && cc < w && edge[rr * w + cc]) return true; } } return false; };
  const rbreak = new Uint8Array(n); const rstray = new Uint8Array(n); const rthin = new Uint8Array(n);
  const lim = 0.8 * (T.W - 2 * T.aa) * ppu;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const i = r * w + c;
    if (edge[i]) {
      let mx = 0;
      for (let dr = -rad; dr <= rad && mx < RB; dr++) { const rr = r + dr; if (rr < 0 || rr >= h) { mx = 1; break; } for (let dc = -rad; dc <= rad; dc++) { const cc = c + dc; if (cc < 0 || cc >= w) { mx = 1; break; } const v = R.ink[rr * w + cc]; if (v > mx) mx = v; } }
      if (mx < RB) rbreak[i] = 1;
    } else if (R.ink[i] > STRAY && dist[i] > far && dist[i] < 1e8 && !nearEdge(r, c)) rstray[i] = 1;
    else if (R.ink[i] < 0.5 && dist[i] > rad + 1 && dist[i] < lim && r > 0 && c > 0 && r + 1 < h && c + 1 < w) {
      // rthin: on the inked side of an edge (ink >= 0.9 between here and the edge) and within 0.8 (W - 2aa) of it, yet not inked
      let gx = dist[i + 1] - dist[i - 1], gy = dist[i + w] - dist[i - w]; const gl = Math.hypot(gx, gy); if (gl > 1e-6) { gx /= gl; gy /= gl;
        for (let tq = 1; tq < dist[i] - 0.5; tq++) { const cc = Math.round(c - gx * tq), rr = Math.round(r - gy * tq); if (cc < 0 || rr < 0 || cc >= w || rr >= h || edge[rr * w + cc]) break; if (R.ink[rr * w + cc] >= 0.9) { rthin[i] = 1; break; } } }
    }
  }
  return { edge, rbreak, rstray, rthin, dist };
}
export interface Find { kind: string; cls: string; x: number; y: number; px: number; peak: number }
// connected components (8-neighbour, gaps of 1 px bridged) of a flag; world centre, pixel count, dominant class
export function finds(flag: Uint8Array, R: Raster, c0: number, r0: number, kind: string, peakOf: (i: number) => number, minPx: number): Find[] {
  const { w, h, ppu } = R; const seen = new Uint8Array(w * h); const out: Find[] = []; const st: number[] = [];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (!flag[i0] || seen[i0]) continue;
    st.length = 0; st.push(i0); seen[i0] = 1; let px = 0, sx = 0, sy = 0, peak = 0; const cc = [0, 0, 0, 0];
    while (st.length) {
      const i = st.pop()!; const r = (i / w) | 0; const c = i - r * w; px++; sx += c; sy += r; cc[R.cls[i]]++; const p = peakOf(i); if (p > peak) peak = p;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const rr = r + dr, c2 = c + dc; if (rr < 0 || rr >= h || c2 < 0 || c2 >= w) continue; const q = rr * w + c2; if (flag[q] && !seen[q]) { seen[q] = 1; st.push(q); } }
    }
    if (px < minPx) continue;
    let b = 0; for (let q = 1; q < 4; q++) if (cc[q] > cc[b]) b = q;
    out.push({ kind, cls: CLS[b], x: (c0 + sx / px + 0.5) / ppu, y: (r0 + sy / px + 0.5) / ppu, px, peak });
  }
  return out;
}
// every test on one raster: depth breaks (single-member and AA-zone only), depth strays, raster breaks, raster strays
export function allFinds(R: Raster, T: any, c0: number, r0: number, minPx = 2): Find[] {
  const F = analyze(R, T); const n = R.w * R.h; const db = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (R.def[i] > 0.15 && !R.multi[i]) db[i] = 1;
  return [
    ...finds(db, R, c0, r0, "dbreak", (i) => R.def[i], minPx),
    ...finds(R.dstray, R, c0, r0, "dstray", (i) => R.ink[i], minPx),
    ...finds(F.rbreak, R, c0, r0, "rbreak", (i) => 1 - R.ink[i], minPx),
    ...finds(F.rstray, R, c0, r0, "rstray", (i) => R.ink[i], minPx),
    ...finds(F.rthin, R, c0, r0, "rthin", (i) => 1 - R.ink[i], minPx),
  ];
}