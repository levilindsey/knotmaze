// K1240 S4b: the border band's tie alpha per PIXEL, not per vertex.
// draw.ts's bandData (the prototype's) evaluates the tie alpha (alphaAt) on
// the CPU at every vertex of a band split at h/8 along the thread and into 8
// rows across it wherever a crossing's pass is near, then lets the GPU
// interpolate. On def that is 6.3M vertices and ~2.2 s a frame (K1240 S4b:
// the "100x" against the prototype's frame(), which never timed its band).
// The split only approximates a per-pixel function, so this draws the band
// at the outline's own resolution (one quad per border segment, ~0.43M
// vertices on def) and the fragment shader evaluates alphaAt itself:
// the same passes in the same order, the same footNear window (its segment
// ranges are per pass, so the CPU computes them once a frame), the same
// self skip, the same "one partner stretch counts once" rule. The vertex
// carries what alphaAt reads of its own chain, all linear along a quad: own
// s (sa + (sb - sa) t, as bandData), dC (h outside, h - W inside) and the
// own chain's depth zAtC(C, s) (exact at the vertex, linear between).
// alphaCpu below is the shader's CPU twin; test/render/band_gpu.test.ts
// checks it against bandData's alphas at bandData's own vertices.
import type { OutlineTable, SceneIn } from "./outline";
import { dSC, footNear, parseColor, sstep, zAtC, type zChains } from "./draw";

type ZZ = ReturnType<typeof zChains>;
type ZChain = ZZ["zc"][number];

/** Texels per row of the chain-sample and pass tables. */
export const BAND_TEX_W = 1024;
/** Pass slots per quad (flat). More passes near one border segment are dropped (counted in `dropped`). */
export const BAND_SLOTS = 4;
/** Texels per pass in the pass table. */
const PT = 4;

export interface BandGpu {
  /** Per vertex: world x, y. */
  pos: Float32Array;
  /** Per vertex: own s, dC, own zAtC(C, s), the piece's own alpha (K1283 s3: a tail's, else 1). */
  attr: Float32Array;
  /** Per vertex (flat, the quad's): BAND_SLOTS global pass ids, -1 none.
   *  K1291 s3: an arc's slot 0 is -2 - its entry in passTex (chain A, sA,
   *  chain B, sB in the entry's first texel). */
  slots: Int32Array;
  count: number;
  /** Chain samples (x, y, s, z), BAND_TEX_W texels a row. */
  chainTex: Float32Array;
  chainTexH: number;
  /** Passes, PT texels each (see packPass). */
  passTex: Float32Array;
  passTexH: number;
  ink: [number, number, number];
  h: number;
  W: number;
  zt: number;
  /** Border segments that had more than BAND_SLOTS passes near them. */
  dropped: number;
  /** K1291 s2: per vertex, the piece's scene chain (-1 none). With attr .x
   *  (own s; an untied piece's s0..s1 by length) it keys the reveal mask. */
  chain: Int16Array;
  /** K1291 s2: per scene chain, (sample base in chainTex, sample count,
   *  closed length or -1 open, 0): the fill's reveal front finds its
   *  distance to the centerline here. */
  chainInfo: Float32Array;
}

/** footNear's visited segment ranges for (sC, r): [k0, k1] pairs, empty when k0 > k1. */
function windowRanges(c: ZChain, sC: number, r: number): [number, number, number, number] {
  const segs = c.closed ? c.n : c.n - 1;
  if (segs <= 0) return [0, -1, 0, -1];
  const first = (u: number): number => { let lo = 0; let hi = segs - 1; if (c.s[0] > u) return 0; while (hi > lo) { const m = (lo + hi + 1) >> 1; if (c.s[m] <= u) lo = m; else hi = m - 1; } return lo; };
  const last = (k0: number, b: number): number => { let k = k0; if (!(k < segs && c.s[k] <= b)) return k0 - 1; let lo = k0; let hi = segs - 1; while (hi > lo) { const m = (lo + hi + 1) >> 1; if (c.s[m] <= b) lo = m; else hi = m - 1; } k = lo; return k; };
  const range = (a: number, b: number): [number, number] => { const k0 = first(a); return [k0, last(k0, b)]; };
  if (c.closed && c.len > 0) {
    if (2 * r >= c.len) return [0, segs - 1, 0, -1];
    const a = (((sC - r) % c.len) + c.len) % c.len; const b = a + 2 * r;
    if (b <= c.len) { const q = range(a, b); return [q[0], q[1], 0, -1]; }
    const q = range(a, c.len); const w = range(0, b - c.len);
    return [q[0], q[1], w[0], w[1]];
  }
  const q = range(sC - r, sC + r);
  return [q[0], q[1], 0, -1];
}

/** footNear(c, x, y, sC, r, 0, 0).s with sqrt for hypot (bandData's own-s refinement; hot). */
function footS(c: ZChain, x: number, y: number, sC: number, r: number): number {
  const w = windowRanges(c, sC, r);
  let best = Infinity; let bs = 0;
  const xs = c.xs; const ys = c.ys; const ss = c.s; const n = c.n; const len = c.len; const closed = c.closed && len > 0;
  for (let pass = 0; pass < 2; pass++) {
    const k0 = pass === 0 ? w[0] : w[2]; const k1 = pass === 0 ? w[1] : w[3];
    for (let k = k0; k <= k1; k++) {
      const j = k + 1 === n ? 0 : k + 1; const sk = ss[k]; const lk = j === 0 ? len - sk : ss[j] - sk;
      let dm = sk + lk / 2 - sC;
      if (closed) { dm = ((dm % len) + len) % len; if (dm > len / 2) dm -= len; }
      if (Math.abs(dm) > r + lk / 2) continue;
      const ax = xs[k]; const ay = ys[k]; const ex = xs[j] - ax; const ey = ys[j] - ay;
      const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
      const dx = x - ax - t * ex; const dy = y - ay - t * ey;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) { best = d; bs = sk + t * lk; }
    }
  }
  return bs;
}

export function bandGpu(table: OutlineTable, scene: SceneIn, zz: ZZ): BandGpu {
  const { zc, passes } = zz;
  const h = table.h; const W = table.W;
  const zt = 0.1 * scene.look.depthAmp;
  // Chain samples.
  const base: number[] = []; let nS = 0;
  for (const c of zc) { base.push(nS); nS += c.n; }
  const chainTexH = Math.max(1, Math.ceil(nS / BAND_TEX_W));
  const chainTex = new Float32Array(4 * BAND_TEX_W * chainTexH);
  zc.forEach((c, i) => { const o = 4 * base[i]; for (let k = 0; k < c.n; k++) { chainTex[o + 4 * k] = c.xs[k]; chainTex[o + 4 * k + 1] = c.ys[k]; chainTex[o + 4 * k + 2] = c.s[k]; chainTex[o + 4 * k + 3] = c.z[k]; } });
  // Passes, chain by chain in order (global id = passBase[c] + j).
  const passBase: number[] = []; let nP = 0;
  for (const ps of passes) { passBase.push(nP); nP += ps.length; }
  // K1291 s3: an arc piece (a junction corner) runs from chain A's sA to
  // chain B's sB, so one chain's reveal cannot say whether it shows. Each
  // arc gets an entry after the passes (pass id nP + k, first texel: chain
  // A, sA, chain B, sB) and its quads carry slot 0 = -2 - id (no pass slot:
  // every pass loop skips ids < 0); BAND_FS reads both arms there.
  const arcOf = new Map<number, number>();
  const arcEnt: number[] = [];
  table.pieces.forEach((p, i) => {
    if (p.kind !== "arc" || p.pts.length < 4 || !(p.chain >= 0 && p.chain < zc.length)) return;
    const cw = table.corners[p.corner];
    if (!cw || !(cw.bChain >= 0 && cw.bChain < zc.length) || cw.aChain !== p.chain) return;
    arcOf.set(i, nP + arcEnt.length / 4);
    arcEnt.push(p.chain, p.s0, cw.bChain, p.s1);
  });
  const nArc = arcEnt.length / 4;
  const passTexH = Math.max(1, Math.ceil((PT * (nP + nArc)) / BAND_TEX_W));
  const passTex = new Float32Array(4 * BAND_TEX_W * passTexH);
  for (let k = 0; k < nArc; k++) passTex.set(arcEnt.slice(4 * k, 4 * k + 4), 4 * PT * (nP + k));
  const sgn = (c: ZChain): number => (c.closed && c.len > 0 ? c.len : -1);
  passes.forEach((ps, c) => ps.forEach((P, j) => {
    const O = zc[P.o];
    const w = windowRanges(O, P.so, P.rO);
    const o = 4 * PT * (passBase[c] + j);
    passTex.set([P.s, P.lo, P.hi, P.rO, P.so, base[P.o], O.n, P.o, sgn(O), sgn(zc[c]), P.o === c ? 3 * h : 0, 0, w[0], w[1], w[2], w[3]], o);
  }));
  // Quads: count, then fill.
  let nQ = 0;
  for (const p of table.pieces) { const np = p.pts.length / 2; if (np >= 2) nQ += np - 1; }
  const count = 6 * nQ;
  const pos = new Float32Array(2 * count);
  const attr = new Float32Array(4 * count);
  const slots = new Int32Array(BAND_SLOTS * count).fill(-1);
  const chain = new Int16Array(count).fill(-1);
  const chainInfo = new Float32Array(4 * Math.max(1, zc.length));
  zc.forEach((c, i) => { chainInfo[4 * i] = base[i]; chainInfo[4 * i + 1] = c.n; chainInfo[4 * i + 2] = sgn(c); });
  let v = 0; let dropped = 0; let vCh = -1;
  const vert = (x: number, y: number, s: number, dC: number, z: number, sl: number[] | null, ba = 1): void => {
    pos[2 * v] = x; pos[2 * v + 1] = y;
    attr[4 * v] = s; attr[4 * v + 1] = dC; attr[4 * v + 2] = z; attr[4 * v + 3] = ba;
    chain[v] = vCh;
    if (sl) for (let k = 0; k < sl.length; k++) slots[BAND_SLOTS * v + k] = sl[k];
    v++;
  };
  const quad = (ax: number, ay: number, bx: number, by: number, iax: number, iay: number, ibx: number, iby: number, sa: number, sb: number, za: number, zb: number, sl: number[] | null, pa: number[] | null = null, i = 0): void => {
    // pO, cO, pI, cO, cI, pI (bandData's order); pa: the piece's own alpha per point (outer, inner).
    const oA = pa ? pa[2 * i] : 1; const iA = pa ? pa[2 * i + 1] : 1; const oB = pa ? pa[2 * i + 2] : 1; const iB = pa ? pa[2 * i + 3] : 1;
    vert(ax, ay, sa, h, za, sl, oA); vert(bx, by, sb, h, zb, sl, oB); vert(iax, iay, sa, h - W, za, sl, iA);
    vert(bx, by, sb, h, zb, sl, oB); vert(ibx, iby, sb, h - W, zb, sl, iB); vert(iax, iay, sa, h - W, za, sl, iA);
  };
  const sl: number[] = [];
  const cand: number[] = [];
  let pIdx = -1;
  for (const p of table.pieces) {
    pIdx++;
    const np = p.pts.length / 2;
    if (np < 2) continue;
    const tied = (p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && p.chain < zc.length && passes[p.chain].length > 0;
    const inner = (i: number): [number, number] => {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
      let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y;
      const l = Math.sqrt(dx * dx + dy * dy);
      if (l < 1e-12) { const j = Math.min(i + 1, np - 1); const ex = p.pts[2 * j] - x; const ey = p.pts[2 * j + 1] - y; const el = Math.sqrt(ex * ex + ey * ey) || 1; dx = -ey / el; dy = ex / el; } else { dx /= l; dy /= l; }
      return [x + dx * W, y + dy * W];
    };
    vCh = p.chain >= 0 && p.chain < zc.length ? p.chain : -1;
    if (!tied) {
      const pa = p.alpha && p.alpha.length === 2 * np ? p.alpha : null;
      // K1291 s2: own s from s0 to s1 by length (the shader reads it only
      // for the reveal mask: an untied quad has no pass slots).
      let L = 0;
      for (let i = 1; i < np; i++) L += Math.sqrt((p.pts[2 * i] - p.pts[2 * i - 2]) ** 2 + (p.pts[2 * i + 1] - p.pts[2 * i - 1]) ** 2);
      const span = p.s1 - p.s0;
      const arc = arcOf.get(pIdx);
      const asl = arc === undefined ? null : [-2 - arc];
      let cum = 0;
      let ia = inner(0);
      for (let i = 0; i + 1 < np; i++) {
        const ib = inner(i + 1);
        const sa = L > 0 ? p.s0 + (span * cum) / L : p.s0;
        cum += Math.sqrt((p.pts[2 * i + 2] - p.pts[2 * i]) ** 2 + (p.pts[2 * i + 3] - p.pts[2 * i + 1]) ** 2);
        const sb = L > 0 ? p.s0 + (span * cum) / L : p.s1;
        quad(p.pts[2 * i], p.pts[2 * i + 1], p.pts[2 * i + 2], p.pts[2 * i + 3], ia[0], ia[1], ib[0], ib[1], sa, sb, 0, 0, asl, pa, i);
        ia = ib;
      }
      continue;
    }
    const C = zc[p.chain]; const PS = passes[p.chain]; const pb = passBase[p.chain];
    // Per-vertex own s, as bandData.
    let cum = 0; let L = 0;
    for (let i = 1; i < np; i++) { const ex = p.pts[2 * i] - p.pts[2 * i - 2]; const ey = p.pts[2 * i + 1] - p.pts[2 * i - 1]; L += Math.sqrt(ex * ex + ey * ey); }
    L = L || 1;
    const span = p.s1 - p.s0;
    const sv = new Float64Array(np);
    for (let i = 0; i < np; i++) {
      if (i > 0) { const ex = p.pts[2 * i] - p.pts[2 * i - 2]; const ey = p.pts[2 * i + 1] - p.pts[2 * i - 1]; cum += Math.sqrt(ex * ex + ey * ey); }
      sv[i] = footS(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + (span * cum) / L, 2 * h);
    }
    // The passes near the piece at all: its own s unwrapped from sv[0].
    let uMin = 0; let uMax = 0; let u = 0;
    for (let i = 0; i + 1 < np; i++) { u += dSC(C, sv[i], sv[i + 1]); if (u < uMin) uMin = u; if (u > uMax) uMax = u; }
    cand.length = 0;
    for (let j = 0; j < PS.length; j++) {
      const P = PS[j]; const d0 = dSC(C, P.s, sv[0]);
      if (d0 + uMax >= -P.lo - h - 1e-6 && d0 + uMin <= P.hi + h + 1e-6) cand.push(j);
    }
    // K1314 s3: a tied run's own alpha (runEndFade's fade at a failed corner)
    // multiplies the tie's, as bandData's tied branch reads it since K1314 s2.
    const paT = p.alpha && p.alpha.length === 2 * np ? p.alpha : null;
    let ia = inner(0);
    for (let i = 0; i + 1 < np; i++) {
      const ib = inner(i + 1);
      const sa = sv[i]; const sb = sa + dSC(C, sa, sv[i + 1]);
      // Every pass whose span (widened by h, as bandData's near()) meets [sa, sb], in pass order.
      sl.length = 0;
      for (const j of cand) {
        const P = PS[j];
        const da = dSC(C, P.s, sa); const db = da + (sb - sa);
        if (Math.max(da, db) >= -P.lo - h && Math.min(da, db) <= P.hi + h) sl.push(pb + j);
      }
      if (sl.length > BAND_SLOTS) {
        // K1283 s11: keep the passes whose partner comes nearest the segment (contact passes at a
        // junction can list more than BAND_SLOTS; one far from the quad fades nothing there).
        dropped++;
        const mx = (p.pts[2 * i] + p.pts[2 * i + 2]) / 2; const my = (p.pts[2 * i + 1] + p.pts[2 * i + 3]) / 2;
        const dist = new Map<number, number>();
        for (const g of sl) { const P = PS[g - pb]; dist.set(g, footNear(zc[P.o], mx, my, P.so, P.rO + h, 0, 0).d); }
        sl.sort((u, v) => (dist.get(u) as number) - (dist.get(v) as number) || u - v);
        sl.length = BAND_SLOTS; sl.sort((u, v) => u - v);
      }
      quad(p.pts[2 * i], p.pts[2 * i + 1], p.pts[2 * i + 2], p.pts[2 * i + 3], ia[0], ia[1], ib[0], ib[1], sa, sb, zAtC(C, sa), zAtC(C, sb), sl.length ? sl : null, paT, i);
      ia = ib;
    }
  }
  return { pos, attr, slots, count, chainTex, chainTexH, passTex, passTexH, ink: parseColor(scene.look.ink), h, W, zt, dropped, chain, chainInfo };
}

/** The shader's CPU twin: alphaAt from the tables above, for a point (x, y)
 *  of chain c's band at own s, dC and own depth zC, with the quad's slots,
 *  times the vertex's own alpha (attr .w, base: a tail's, K1283 s3). */
export function alphaCpu(b: BandGpu, x: number, y: number, s: number, dC: number, zC: number, sl: ArrayLike<number>, base = 1): number {
  const T = (q: number, k: number): number => b.passTex[4 * (PT * q + (k >> 2)) + (k & 3)];
  const S = (i: number, k: number): number => b.chainTex[4 * i + k];
  const dS = (len: number, a: number, c: number): number => { let d = c - a; if (len > 0) { d = ((d % len) + len) % len; if (d > len / 2) d -= len; } return d; };
  const { h, W, zt } = b;
  const keyC = zC - (dC * zt) / h;
  const seenO: number[] = []; const seenS: number[] = []; const seenF: number[] = [];
  for (let q = 0; q < sl.length; q++) {
    const pid = sl[q]; if (pid < 0) continue;
    const Ps = T(pid, 0); const lo = T(pid, 1); const hi = T(pid, 2); const r = T(pid, 3);
    const so = T(pid, 4); const ob = T(pid, 5); const on = T(pid, 6); const o = T(pid, 7);
    const oLen = T(pid, 8); const cLen = T(pid, 9); const skipR = T(pid, 10);
    const ds = dS(cLen, Ps, s); if (ds < -lo || ds > hi) continue;
    let best = Infinity; let bs = 0; let bz = 0;
    const visit = (k: number): void => {
      const j = (k + 1) % on; const sk = S(ob + k, 2); const lk = j === 0 ? Math.max(oLen, 0) - sk : S(ob + j, 2) - sk;
      const mid = sk + lk / 2;
      if (Math.abs(dS(oLen, so, mid)) > r + lk / 2) return;
      if (skipR > 0 && Math.abs(dS(oLen, s, mid)) < skipR) return;
      const ax = S(ob + k, 0); const ay = S(ob + k, 1); const ex = S(ob + j, 0) - ax; const ey = S(ob + j, 1) - ay;
      const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
      const d = Math.hypot(x - ax - t * ex, y - ay - t * ey);
      if (d < best) { best = d; bs = sk + t * lk; bz = S(ob + k, 3) + (S(ob + j, 3) - S(ob + k, 3)) * t; }
    };
    for (let k = T(pid, 12); k <= T(pid, 13); k++) visit(k);
    for (let k = T(pid, 14); k <= T(pid, 15); k++) visit(k);
    if (!(best < h)) continue;
    const g = Math.min(1, Math.max(0, (h - best) / W));
    const keyO = bz - (best * zt) / h;
    const f = 1 - g * sstep(-zt, zt, keyO - keyC);
    let m = -1;
    for (let u = 0; u < seenO.length; u++) if (seenO[u] === o && Math.abs(dS(oLen, seenS[u], bs)) < h) { m = u; break; }
    if (m < 0) { seenO.push(o); seenS.push(bs); seenF.push(f); } else if (f < seenF[m]) { seenS[m] = bs; seenF[m] = f; }
  }
  let a = base; for (const f of seenF) a *= f;
  return a;
}
