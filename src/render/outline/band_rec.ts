// K1247 s22 (ob=1): the band as a fixed layout of records. Today's band (bandGpu) builds one quad per border
// segment of each piece, so its vertex count and order change on nearly every moved frame: a run's end
// slides past a border point, a fan gains a step, a corner's arc comes and goes (the restructures). Here
// every diagram piece (st.piecesD) owns a fixed range of quads for the life of a structure:
// - a tied run or ghost (no own alpha, no fold) is N quads of records: columns 1..N-1 placed by colAt on the
//   border's polygon (chain_frame.ts, the fill's record placement: every polygon vertex lands on a column,
//   so no chord cuts a corner), at h (outer) and h - W (inner), columns 0 and N its two ends; what moves
//   (s0, s1, the chain) is a parameter of the layout, not a change of it;
// - every other piece (arcs, tails, caps, a run that folds or fades) keeps today's points, padded to its
//   capacity with zero-area quads at its last point; an absent piece (a failed corner's arc) is all padding.
// The layout is rebuilt only for a new structure or when a piece outgrows its capacity (counted).
// The output is bandGpu's (same arrays, same shader); ob=0 never calls this.
import type { OutlineTable, SceneIn } from "./outline";
import { dSC, footNear, parseColor, zAtC } from "./draw";
import { BAND_SLOTS, BAND_TEX_W, PT, footS, windowRanges, type BandGpu, type ZChain, type ZZ } from "./band_gpu";
import { colRow, recSideOk, recTables } from "./chain_frame";

export interface BandLayout {
  /** The structure it was built for (identity). */
  st: unknown;
  /** Per piecesD index: first quad, capacity in quads (0: no band). */
  off: Int32Array; cap: Int32Array;
  Q: number;
  /** Per piecesD index: its arc entry in passTex (-1: not an arc); nArc entries in all, present or not. */
  arcSlot: Int32Array; nArc: number;
  /** Per piecesD index: the quads the last frame wrote before its padding (0: absent; the probes read it). */
  used: Int32Array;
  /** Per piecesD index, last frame: 0 absent, 1 records, 2 today's points padded, 3 decimated (outgrew it). */
  how: Uint8Array;
}

/** Indices of the n points kept of np (both ends always): drops the interior point whose triangle with its
 *  neighbours' chord is the shortest, one at a time (a piece that outgrew its range: a fold, a fan's steps). */
function keepIdx(P: ArrayLike<number>, np: number, n: number): Int32Array {
  const prev = new Int32Array(np); const next = new Int32Array(np); const alive = new Uint8Array(np).fill(1);
  for (let i = 0; i < np; i++) { prev[i] = i - 1; next[i] = i + 1; }
  // The cost of dropping i: its distance to the chord its neighbours would make (a thin spike costs its height).
  const area = (i: number): number => {
    const a = prev[i]; const b = next[i];
    const ex = P[2 * b] - P[2 * a]; const ey = P[2 * b + 1] - P[2 * a + 1]; const l2 = ex * ex + ey * ey;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((P[2 * i] - P[2 * a]) * ex + (P[2 * i + 1] - P[2 * a + 1]) * ey) / l2)) : 0;
    return (P[2 * a] + t * ex - P[2 * i]) ** 2 + (P[2 * a + 1] + t * ey - P[2 * i + 1]) ** 2;
  };
  for (let left = np; left > n; left--) {
    let best = -1; let bA = Infinity;
    for (let i = next[0]; i < np - 1; i = next[i]) { const A = area(i); if (A < bA) { bA = A; best = i; } }
    if (best < 0) break;
    alive[best] = 0; next[prev[best]] = next[best]; prev[next[best]] = prev[best];
  }
  const out = new Int32Array(n); let k = 0;
  for (let i = 0; i < np && k < n; i++) if (alive[i]) out[k++] = i;
  return out;
}

// A record piece always fills its N quads (N only bounds how many border vertices get their own column);
// a padded piece needs room for today's point count to grow while the threads move.
const REC_ADD = 2; const SLACK = 1.25; const SLACK_ADD = 4; const ABSENT_RUN = 8; const ABSENT_ARC = 24;

/** The layout for a structure from one frame's table, keeping an older layout's capacities as floors. */
export function bandLayout(st: { piecesD: readonly { kind: string }[] }, table: OutlineTable, old: BandLayout | null = null, widen: Uint8Array | null = null): BandLayout {
  const nD = st.piecesD.length;
  const q0 = new Int32Array(nD).fill(-1);
  for (const p of table.pieces) { if (p.di === undefined || p.di < 0 || p.di >= nD) continue; q0[p.di] = Math.max(q0[p.di], p.pts.length / 2 - 1); }
  const off = new Int32Array(nD); const cap = new Int32Array(nD); let Q = 0;
  for (let d = 0; d < nD; d++) {
    const k = st.piecesD[d].kind;
    const rk = k === "run" || k === "ghost";
    const grown = (old !== null && old.st === st && d < old.cap.length && q0[d] > old.cap[d]) || (widen !== null && widen[d] === 1);
    let c = q0[d] >= 1 ? (rk && !grown ? q0[d] + REC_ADD : Math.ceil(q0[d] * SLACK) + SLACK_ADD) : k === "arc" ? ABSENT_ARC : ABSENT_RUN;
    if (k === "arc") c = Math.max(c, ABSENT_ARC);
    if (old && old.st === st && d < old.cap.length) c = Math.max(c, old.cap[d]);
    off[d] = Q; cap[d] = c; Q += c;
  }
  const arcSlot = new Int32Array(nD).fill(-1); let nArc = 0;
  for (let d = 0; d < nD; d++) if (st.piecesD[d].kind === "arc") arcSlot[d] = nArc++;
  return { st, off, cap, Q, arcSlot, nArc, used: new Int32Array(nD), how: new Uint8Array(nD) };
}

export interface BandRecStats { rec: number; pad: number; over: number; unkeyed: number; lastOver?: string }

/** bandGpu's output on the fixed layout; null when a piece outgrows its capacity or has no key (the caller
 *  relayouts from this table and calls again). */
export function bandRec(table: OutlineTable, scene: SceneIn, zz: ZZ, lay: BandLayout, stats: BandRecStats | null = null): BandGpu | null {
  const { zc, passes } = zz;
  const h = table.h; const W = table.W;
  const zt = 0.1 * scene.look.depthAmp;
  const base: number[] = []; let nS = 0;
  for (const c of zc) { base.push(nS); nS += c.n; }
  const chainTexH = Math.max(1, Math.ceil(nS / BAND_TEX_W));
  const chainTex = new Float32Array(4 * BAND_TEX_W * chainTexH);
  zc.forEach((c, i) => { const o = 4 * base[i]; for (let k = 0; k < c.n; k++) { chainTex[o + 4 * k] = c.xs[k]; chainTex[o + 4 * k + 1] = c.ys[k]; chainTex[o + 4 * k + 2] = c.s[k]; chainTex[o + 4 * k + 3] = c.z[k]; } });
  const passBase: number[] = []; let nP = 0;
  for (const ps of passes) { passBase.push(nP); nP += ps.length; }
  // Arc entries: one per diagram arc (lay.arcSlot), present or not, so passTex keeps its size and an arc
  // its slot id while corners come and go.
  const arcOf = new Map<number, number>();
  const nArc = lay.nArc;
  const passTexH = Math.max(1, Math.ceil((PT * (nP + nArc)) / BAND_TEX_W));
  const passTex = new Float32Array(4 * BAND_TEX_W * passTexH);
  table.pieces.forEach((p, i) => {
    if (p.kind !== "arc" || p.pts.length < 4 || !(p.chain >= 0 && p.chain < zc.length)) return;
    const cw = table.corners[p.corner];
    if (!cw || !(cw.bChain >= 0 && cw.bChain < zc.length) || cw.aChain !== p.chain) return;
    const k = p.di !== undefined && p.di >= 0 && p.di < lay.arcSlot.length ? lay.arcSlot[p.di] : -1;
    if (k < 0) return;
    arcOf.set(i, nP + k);
    const o = 4 * PT * (nP + k); passTex[o] = p.chain; passTex[o + 1] = p.s0; passTex[o + 2] = cw.bChain; passTex[o + 3] = p.s1;
  });
  const sgnL = (c: ZChain): number => (c.closed && c.len > 0 ? c.len : -1);
  passes.forEach((ps, c) => ps.forEach((P, j) => {
    const O = zc[P.o];
    const w = windowRanges(O, P.so, P.rO);
    const o = 4 * PT * (passBase[c] + j);
    passTex.set([P.s, P.lo, P.hi, P.rO, P.so, base[P.o], O.n, P.o, sgnL(O), sgnL(zc[c]), P.o === c ? 3 * h : 0, 0, w[0], w[1], w[2], w[3]], o);
  }));
  // Capacity check first: a piece without a key, or with more quads than its slot holds, needs a new layout.
  const nD = lay.cap.length;
  const T = recTables(zc, h);
  // Per piece: placed by records (1) or padded (0). A record piece fills its N quads whatever today's count.
  const useR = new Uint8Array(table.pieces.length);
  for (let pi = 0; pi < table.pieces.length; pi++) {
    const p = table.pieces[pi];
    const np = p.pts.length / 2; if (np < 2) continue;
    if (p.di === undefined || p.di < 0 || p.di >= nD) { if (stats) stats.unkeyed++; return null; }
    if ((p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && p.chain < zc.length && passes[p.chain].length > 0 && (p.side === 1 || p.side === -1)) {
      const C = zc[p.chain]; let dS = p.s1 - p.s0; if (C.closed && C.len > 0 && dS <= 0) dS += C.len;
      // An open chain's run past an end (s outside [0, len], the end's straight extension) keeps today's points:
      // colAt clamps s to the chain, so its records would cut the extension to a chord.
      const inside = C.closed || (p.s0 >= -1e-6 && p.s0 + dS <= C.len + 1e-6);
      if (dS > 0 && inside && recSideOk(C, T, p.chain, p.s0, dS, lay.cap[p.di], p.side)) { useR[pi] = 1; continue; }
    }
    if (np - 1 > lay.cap[p.di] && stats) { stats.over++; stats.lastOver = `${p.kind} d${p.di} c${p.chain} np ${np} cap ${lay.cap[p.di]} alpha ${p.alpha ? 1 : 0} s ${p.s0.toFixed(2)}..${p.s1.toFixed(2)}`; }
  }
  const count = 6 * lay.Q;
  lay.used.fill(0); lay.how.fill(0);
  const pos = new Float32Array(2 * count);
  const attr = new Float32Array(4 * count);
  const slots = new Int32Array(BAND_SLOTS * count).fill(-1);
  const chain = new Int16Array(count).fill(-1);
  const chainInfo = new Float32Array(4 * Math.max(1, zc.length));
  zc.forEach((c, i) => { chainInfo[4 * i] = base[i]; chainInfo[4 * i + 1] = c.n; chainInfo[4 * i + 2] = sgnL(c); });
  let v = 0; let dropped = 0; let vCh = -1;
  const vert = (x: number, y: number, s: number, dC: number, z: number, sl: number[] | null, ba = 1): void => {
    pos[2 * v] = x; pos[2 * v + 1] = y;
    attr[4 * v] = s; attr[4 * v + 1] = dC; attr[4 * v + 2] = z; attr[4 * v + 3] = ba;
    chain[v] = vCh;
    if (sl) for (let k = 0; k < sl.length; k++) slots[BAND_SLOTS * v + k] = sl[k];
    v++;
  };
  const quad = (ax: number, ay: number, bx: number, by: number, iax: number, iay: number, ibx: number, iby: number, sa: number, sb: number, za: number, zb: number, sl: number[] | null, pa: ArrayLike<number> | null = null, i = 0): void => {
    const oA = pa ? pa[2 * i] : 1; const iA = pa ? pa[2 * i + 1] : 1; const oB = pa ? pa[2 * i + 2] : 1; const iB = pa ? pa[2 * i + 3] : 1;
    vert(ax, ay, sa, h, za, sl, oA); vert(bx, by, sb, h, zb, sl, oB); vert(iax, iay, sa, h - W, za, sl, iA);
    vert(bx, by, sb, h, zb, sl, oB); vert(ibx, iby, sb, h - W, zb, sl, iB); vert(iax, iay, sa, h - W, za, sl, iA);
  };
  // Pad from v to the piece's end: zero-area quads at the last vertex written (all six at its outer point).
  const pad = (end: number): void => {
    if (v >= end) return;
    const j = v - 5; // the last quad's cO (its outer end)
    const x = pos[2 * j]; const y = pos[2 * j + 1]; const s = attr[4 * j]; const z = attr[4 * j + 2];
    while (v < end) { pos[2 * v] = x; pos[2 * v + 1] = y; attr[4 * v] = s; attr[4 * v + 1] = h; attr[4 * v + 2] = z; attr[4 * v + 3] = 0; chain[v] = vCh; v++; }
  };
  const sl: number[] = [];
  const cand: number[] = [];
  // Record columns of a piece (N + 1 points): outer, inner, own s.
  let RO = new Float64Array(64); let RI = new Float64Array(64); let RS = new Float64Array(32); let RS2 = new Float64Array(32); let RA = new Float64Array(64);
  let pIdx = -1;
  for (const p of table.pieces) {
    pIdx++;
    const np0 = p.pts.length / 2;
    if (np0 < 2) continue;
    const d = p.di as number; const capQ = lay.cap[d];
    v = 6 * lay.off[d]; const vEnd = v + 6 * capQ;
    // Today's points, decimated to the range when they outgrow it (counted in stats.over).
    let pts: ArrayLike<number> = p.pts; let cpts: ArrayLike<number> = p.cpts; let npU = np0;
    let al: ArrayLike<number> | null = p.alpha && p.alpha.length === 2 * np0 ? p.alpha : null;
    if (useR[pIdx] !== 1 && np0 - 1 > capQ) {
      const K = keepIdx(p.pts, np0, capQ + 1); npU = capQ + 1;
      const a = new Float64Array(2 * npU); const b = new Float64Array(2 * npU); const c = al ? new Float64Array(2 * npU) : null;
      for (let k = 0; k < npU; k++) { const i = K[k]; a[2 * k] = p.pts[2 * i]; a[2 * k + 1] = p.pts[2 * i + 1]; b[2 * k] = p.cpts[2 * i]; b[2 * k + 1] = p.cpts[2 * i + 1]; if (c && al) { c[2 * k] = al[2 * i]; c[2 * k + 1] = al[2 * i + 1]; } }
      pts = a; cpts = b; al = c;
    }
    lay.how[d] = useR[pIdx] === 1 ? 1 : npU < np0 ? 3 : 2;
    const tied = (p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && p.chain < zc.length && passes[p.chain].length > 0;
    vCh = p.chain >= 0 && p.chain < zc.length ? p.chain : -1;
    const innerOf = (P: ArrayLike<number>, Cp: ArrayLike<number>, n: number, i: number, out: Float64Array, o: number): void => {
      const x = P[2 * i]; const y = P[2 * i + 1];
      let dx = Cp[2 * i] - x; let dy = Cp[2 * i + 1] - y;
      const l = Math.sqrt(dx * dx + dy * dy);
      if (l < 1e-12) { const j = Math.min(i + 1, n - 1); const ex = P[2 * j] - x; const ey = P[2 * j + 1] - y; const el = Math.sqrt(ex * ex + ey * ey) || 1; dx = -ey / el; dy = ex / el; } else { dx /= l; dy /= l; }
      out[o] = x + dx * W; out[o + 1] = y + dy * W;
    };
    if (!tied) {
      let L = 0;
      for (let i = 1; i < npU; i++) L += Math.sqrt((pts[2 * i] - pts[2 * i - 2]) ** 2 + (pts[2 * i + 1] - pts[2 * i - 1]) ** 2);
      const span = p.s1 - p.s0;
      const arc = arcOf.get(pIdx);
      const asl = arc === undefined ? null : [-2 - arc];
      let cum = 0;
      const ia = new Float64Array(2); const ib = new Float64Array(2);
      innerOf(pts, cpts, npU, 0, ia, 0);
      for (let i = 0; i + 1 < npU; i++) {
        innerOf(pts, cpts, npU, i + 1, ib, 0);
        const sa = L > 0 ? p.s0 + (span * cum) / L : p.s0;
        cum += Math.sqrt((pts[2 * i + 2] - pts[2 * i]) ** 2 + (pts[2 * i + 3] - pts[2 * i + 1]) ** 2);
        const sb = L > 0 ? p.s0 + (span * cum) / L : p.s1;
        quad(pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3], ia[0], ia[1], ib[0], ib[1], sa, sb, 0, 0, asl, al, i);
        ia[0] = ib[0]; ia[1] = ib[1];
      }
      if (stats) stats.pad++;
      lay.used[d] = (v - 6 * lay.off[d]) / 6;
      pad(vEnd);
      continue;
    }
    const C = zc[p.chain]; const PS = passes[p.chain]; const pb = passBase[p.chain];
    const paT = p.alpha && p.alpha.length === 2 * np0 ? p.alpha : null;
    // The records: N = capQ columns on [s0, s1] along the side (s1 - s0 > 0; a loop's wraps).
    let dS = p.s1 - p.s0; if (C.closed && C.len > 0 && dS <= 0) dS += C.len;
    const sgn = p.side; const N = capQ;
    const useRec = useR[pIdx] === 1;
    let np: number; let P: ArrayLike<number>; let Ip: Float64Array; let sv: Float64Array;
    let paR: ArrayLike<number> | null = paT;
    if (useRec) {
      np = N + 1;
      if (RO.length < 2 * np) { RO = new Float64Array(4 * np); RI = new Float64Array(4 * np); RS = new Float64Array(2 * np); RS2 = new Float64Array(2 * np); }
      const o = T.base[p.chain];
      RO[0] = p.pts[0]; RO[1] = p.pts[1]; innerOf(p.pts, p.cpts, np0, 0, RI, 0);
      RS[0] = footS(C, p.cpts[0], p.cpts[1], p.s0, 2 * h);
      if (N > 1) { colRow(C, T.pf, o, p.s0, dS, N, sgn, h, 1, N - 1, RO, RS); colRow(C, T.pf, o, p.s0, dS, N, sgn, h - W, 1, N - 1, RI, RS2); }
      RO[2 * N] = p.pts[2 * np0 - 2]; RO[2 * N + 1] = p.pts[2 * np0 - 1]; innerOf(p.pts, p.cpts, np0, np0 - 1, RI, 2 * N);
      RS[N] = footS(C, p.cpts[2 * np0 - 2], p.cpts[2 * np0 - 1], p.s0 + dS, 2 * h);
      P = RO; Ip = RI; sv = RS;
      // A faded run (runEndFade): today's per-point alpha, carried to each column by its arc-length fraction
      // along the outer border (the columns lie on today's polyline).
      if (paT) {
        if (RA.length < 2 * np) RA = new Float64Array(4 * np);
        let LT = 0; for (let i = 1; i < np0; i++) LT += Math.sqrt((p.pts[2 * i] - p.pts[2 * i - 2]) ** 2 + (p.pts[2 * i + 1] - p.pts[2 * i - 1]) ** 2);
        let LR = 0; for (let i = 1; i < np; i++) LR += Math.sqrt((RO[2 * i] - RO[2 * i - 2]) ** 2 + (RO[2 * i + 1] - RO[2 * i - 1]) ** 2);
        let j = 0; let cT = 0; let segT = np0 > 1 ? Math.sqrt((p.pts[2] - p.pts[0]) ** 2 + (p.pts[3] - p.pts[1]) ** 2) : 0; let cR = 0;
        for (let i = 0; i < np; i++) {
          if (i > 0) cR += Math.sqrt((RO[2 * i] - RO[2 * i - 2]) ** 2 + (RO[2 * i + 1] - RO[2 * i - 1]) ** 2);
          const at = LR > 0 ? (cR / LR) * LT : 0;
          while (j < np0 - 2 && cT + segT < at) { cT += segT; j++; segT = Math.sqrt((p.pts[2 * j + 2] - p.pts[2 * j]) ** 2 + (p.pts[2 * j + 3] - p.pts[2 * j + 1]) ** 2); }
          const t = segT > 0 ? Math.max(0, Math.min(1, (at - cT) / segT)) : 0;
          RA[2 * i] = paT[2 * j] + (paT[2 * j + 2] - paT[2 * j]) * t; RA[2 * i + 1] = paT[2 * j + 1] + (paT[2 * j + 3] - paT[2 * j + 1]) * t;
        }
        paR = RA;
      }
      if (stats) stats.rec++;
    } else {
      np = npU; P = pts; paR = al;
      Ip = new Float64Array(2 * np); for (let i = 0; i < np; i++) innerOf(pts, cpts, np, i, Ip, 2 * i);
      let cum = 0; let L = 0;
      for (let i = 1; i < np; i++) { const ex = P[2 * i] - P[2 * i - 2]; const ey = P[2 * i + 1] - P[2 * i - 1]; L += Math.sqrt(ex * ex + ey * ey); }
      L = L || 1;
      const span = p.s1 - p.s0;
      sv = new Float64Array(np);
      for (let i = 0; i < np; i++) {
        if (i > 0) { const ex = P[2 * i] - P[2 * i - 2]; const ey = P[2 * i + 1] - P[2 * i - 1]; cum += Math.sqrt(ex * ex + ey * ey); }
        sv[i] = footS(C, cpts[2 * i], cpts[2 * i + 1], p.s0 + (span * cum) / L, 2 * h);
      }
      if (stats) stats.pad++;
    }
    let uMin = 0; let uMax = 0; let u = 0;
    for (let i = 0; i + 1 < np; i++) { u += dSC(C, sv[i], sv[i + 1]); if (u < uMin) uMin = u; if (u > uMax) uMax = u; }
    cand.length = 0;
    for (let j = 0; j < PS.length; j++) {
      const Pj = PS[j]; const d0 = dSC(C, Pj.s, sv[0]);
      if (d0 + uMax >= -Pj.lo - h - 1e-6 && d0 + uMin <= Pj.hi + h + 1e-6) cand.push(j);
    }
    for (let i = 0; i + 1 < np; i++) {
      const sa = sv[i]; const sb = sa + dSC(C, sa, sv[i + 1]);
      sl.length = 0;
      for (const j of cand) {
        const Pj = PS[j];
        const da = dSC(C, Pj.s, sa); const db = da + (sb - sa);
        if (Math.max(da, db) >= -Pj.lo - h && Math.min(da, db) <= Pj.hi + h) sl.push(pb + j);
      }
      if (sl.length > BAND_SLOTS) {
        dropped++;
        const mx = (P[2 * i] + P[2 * i + 2]) / 2; const my = (P[2 * i + 1] + P[2 * i + 3]) / 2;
        const dist = new Map<number, number>();
        for (const g of sl) { const Pg = PS[g - pb]; dist.set(g, footNear(zc[Pg.o], mx, my, Pg.so, Pg.rO + h, 0, 0).d); }
        sl.sort((a, b) => (dist.get(a) as number) - (dist.get(b) as number) || a - b);
        sl.length = BAND_SLOTS; sl.sort((a, b) => a - b);
      }
      quad(P[2 * i], P[2 * i + 1], P[2 * i + 2], P[2 * i + 3], Ip[2 * i], Ip[2 * i + 1], Ip[2 * i + 2], Ip[2 * i + 3], sa, sb, zAtC(C, sa), zAtC(C, sb), sl.length ? sl : null, paR, i);
    }
    lay.used[d] = (v - 6 * lay.off[d]) / 6;
    pad(vEnd);
  }
  return { pos, attr, slots, count, chainTex, chainTexH, passTex, passTexH, ink: parseColor(scene.look.ink), h, W, zt, dropped, chain, chainInfo };
}

/** Holds the layout across frames (OutlineModel with ob=1): relayouts on a new structure or an overflow. */
export class BandRecState {
  lay: BandLayout | null = null;
  relayouts = 0;
  stats: BandRecStats = { rec: 0, pad: 0, over: 0, unkeyed: 0 };
  band(st: { piecesD: readonly { kind: string }[] }, table: OutlineTable, scene: SceneIn, zz: ZZ): BandGpu {
    let b: BandGpu | null = null;
    if (!this.lay || this.lay.st !== st) {
      // A new structure: a run or ghost its first frame cannot place by records (a fold, too many fan steps)
      // gets a padded piece's slack, so it is not decimated as it grows.
      this.lay = bandLayout(st, table); this.relayouts++;
      b = bandRec(table, scene, zz, this.lay, null);
      const L = this.lay; const wid = new Uint8Array(L.cap.length); let any = false;
      for (let d = 0; d < wid.length; d++) { const k = st.piecesD[d].kind; if ((k === "run" || k === "ghost") && L.how[d] >= 2) { wid[d] = 1; any = true; } }
      if (any) { this.lay = bandLayout(st, table, null, wid); b = null; }
    }
    if (!b) b = bandRec(table, scene, zz, this.lay, this.stats);
    if (!b) { this.lay = bandLayout(st, table, this.lay); this.relayouts++; b = bandRec(table, scene, zz, this.lay, this.stats); }
    if (!b) throw new Error("bandRec: relayout did not fit");
    return b;
  }
}
