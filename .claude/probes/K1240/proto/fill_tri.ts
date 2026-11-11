// K1277: the fill as plain triangles whose topology is decided once, from
// the diagram. Per frame only vertex positions (and the depth key, a
// function of chain and s) change; the index buffer, every face's vertex
// count and the draw order are fixed by `fillStructure`.
//
// The pieces (all from `DiagramStructure`, never from positions):
// - STRIP: one per interval that has border pieces (a kept run, or a
//   crossing's discarded under pass, which has ghost pieces). Three rows of
//   N + 1 vertices: the side +1 border, the centre, the side -1 border.
//   Rows are resampled at equal fractions of the borders' centreline-foot
//   length, so row i sits at the same s on both borders. The centre row is
//   the midpoint of the two border vertices, so a strip's end row lies on
//   the straight edge between its two end points (watertight with the
//   junction fan and the cap fan that share that edge). 4 N triangles.
// - CAP: a fan from the midpoint of the cap's two ends over the cap rim,
//   resampled to M points.
// - JUNCTION: a fan from the junction centre over the junction region's
//   ring, built as the region is (outline.ts regionsPhaseC): per arm in
//   `armsOfJ` order, P (side -dir end of the arm's interval), N (side +dir),
//   then K interior points of the corner whose aArm is that arm (its arc
//   about Q, or a straight line to the next arm's P). A fan covers its
//   ring's nonzero-winding area, so a fold overdraws instead of cracking.
//
// Draw order: ghost strips, run strips, caps, junctions, fixed by index.
// Over before under is decided per pixel by a depth key (form B's own key,
// z - d zt / h: z the chain's crossing-diagram depth at s, d the distance
// to the centreline, zt = 0.1 depthAmp), linear across each triangle:
// centre rows carry z(s), border rows z(s) - zt. The depth test keeps the
// highest key, which is form B's top surface; no stencil.
//
// The only frame-0 measurement is each strip's resolution N
// (`fillResolution`, from frame 0's piece lengths), taken once.
import type { DiagramStructure, OutlineTable, SceneIn } from "./outline";
import { zChains, zAtC } from "./draw";

export const CAP_M = 17;
export const ARC_K = 16;

export interface StripItem { kind: "strip"; iv: number; pi: number; ghost: boolean; N: number; base: number; pL: number; pR: number }
export interface CapItem { kind: "cap"; pi: number; piece: number; atEnd: boolean; base: number }
export interface JArm { ai: number; pi: number; ei: number; pN: number; pP: number; atStart: boolean; corner: number }
export interface JuncItem { kind: "junc"; ji: number; owner: number; arms: JArm[]; base: number; R: number }
export type FillItem = StripItem | CapItem | JuncItem;

export interface FillStructure {
  nV: number;
  idx: Uint32Array;
  /** Owner chain (index) of each vertex: the colour for this stage. */
  vChain: Int32Array;
  items: FillItem[];
  /** Junction arms whose P or N has no interval piece (structure-level count). */
  missingArmEnds: number;
}

export interface FillFrame {
  /** Positions in float64, as the outline table holds them (the census
   *  rasters these, as it rasters master's faces); draw.ts uploads float32. */
  pos: Float64Array;
  key: Float32Array;
  /** Chain arc length per vertex (K1278's paint coordinate). */
  s: Float32Array;
  fallbacks: number;
  /** Border pieces with more points than their strip has samples (equal-fraction samples instead). */
  dense: number;
}

/** Each interval's strip resolution, measured once on frame 0's table. */
export function fillResolution(st: DiagramStructure, table0: OutlineTable): Int32Array {
  const N = new Int32Array(st.intervalsD.length);
  const sub = table0.h / 8;
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "run" && d.kind !== "ghost") return;
    const p = table0.pieces[k];
    let len = polyLen(p.cpts);
    if (!(len > 1e-9)) len = polyLen(p.pts);
    const n = Math.min(4096, Math.max(d.kind === "ghost" ? 24 : 4, Math.ceil((1.5 * len) / sub) + 2));
    N[d.interval] = Math.max(N[d.interval], n);
  });
  return N;
}

function polyLen(a: number[]): number {
  let l = 0;
  for (let i = 2; i + 1 < a.length; i += 2) l += Math.hypot(a[i] - a[i - 2], a[i + 1] - a[i - 1]);
  return l;
}

/** The fill's topology from the diagram (plus the once-measured resolution). */
export function fillStructure(st: DiagramStructure, res: Int32Array): FillStructure {
  const items: FillItem[] = [];
  const idx: number[] = [];
  const vChain: number[] = [];
  let nV = 0;
  // Border pieces per interval and side.
  const ivPieces = new Map<number, { L: number; R: number; ghost: boolean }>();
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "run" && d.kind !== "ghost") return;
    const e = ivPieces.get(d.interval) ?? { L: -1, R: -1, ghost: d.kind === "ghost" };
    if (d.side > 0) e.L = k; else e.R = k;
    ivPieces.set(d.interval, e);
  });
  const strip = (iv: number, e: { L: number; R: number; ghost: boolean }): void => {
    const pi = st.intervalsD[iv].pi;
    const N = Math.max(1, res[iv] || 8);
    const base = nV; const W = N + 1;
    for (let r = 0; r < 3; r++) for (let i = 0; i <= N; i++) vChain.push(pi);
    nV += 3 * W;
    const V = (r: number, i: number): number => base + r * W + i;
    for (let i = 0; i < N; i++) {
      idx.push(V(0, i), V(0, i + 1), V(1, i));
      idx.push(V(1, i), V(0, i + 1), V(1, i + 1));
      idx.push(V(1, i), V(1, i + 1), V(2, i));
      idx.push(V(2, i), V(1, i + 1), V(2, i + 1));
    }
    items.push({ kind: "strip", iv, pi, ghost: e.ghost, N, base, pL: e.L, pR: e.R });
  };
  // 1. ghost strips (under passes), 2. run strips: interval order.
  for (const ghost of [true, false]) for (const [iv, e] of [...ivPieces.entries()].sort((a, b) => a[0] - b[0])) if (e.ghost === ghost) strip(iv, e);
  // 3. caps.
  let capK = 0;
  st.piecesD.forEach((d, k) => {
    if (d.kind !== "cap") return;
    const cp = st.caps[capK++];
    const base = nV;
    for (let i = 0; i <= CAP_M; i++) vChain.push(d.chain); // hub + M rim
    nV += CAP_M + 1;
    for (let i = 0; i + 1 < CAP_M; i++) idx.push(base, base + 1 + i, base + 2 + i);
    items.push({ kind: "cap", pi: d.chain, piece: k, atEnd: cp ? cp.atEnd : false, base });
  });
  // 4. junctions.
  const stOfArm = new Map<number, number>();
  st.stationsD.forEach((q, i) => { if (q.kind === "junction" && q.arm >= 0) stOfArm.set(q.arm, i); });
  const cornerByAArm = new Map<number, number>();
  st.corners.forEach((c, ci) => { if (!cornerByAArm.has(c.aArm)) cornerByAArm.set(c.aArm, ci); });
  let missing = 0;
  st.armsOfJ.forEach((L, ji) => {
    if (!L || L.length === 0) return;
    const arms: JArm[] = [];
    for (const ai of L) {
      const a = st.arms[ai];
      const sti = stOfArm.get(ai);
      let pN = -1; let pP = -1; let atStart = true;
      if (sti !== undefined) {
        for (const [iv, e] of ivPieces) {
          const I = st.intervalsD[iv];
          if (I.aSt !== sti && I.bSt !== sti) continue;
          atStart = I.aSt === sti;
          pN = a.dir > 0 ? e.L : e.R;
          pP = a.dir > 0 ? e.R : e.L;
          break;
        }
      }
      if (pN < 0 || pP < 0) missing++;
      arms.push({ ai, pi: a.pi, ei: a.ei, pN, pP, atStart, corner: cornerByAArm.get(ai) ?? -1 });
    }
    const R = arms.length * (2 + ARC_K);
    const base = nV;
    const owner = st.arms[L[0]].pi;
    for (let i = 0; i <= R; i++) vChain.push(owner);
    nV += R + 1;
    for (let i = 0; i < R; i++) idx.push(base, base + 1 + i, base + 1 + ((i + 1) % R));
    items.push({ kind: "junc", ji, owner, arms, base, R });
  });
  return { nV, idx: Uint32Array.from(idx), vChain: Int32Array.from(vChain), items, missingArmEnds: missing };
}

/** A topology signature: vertex count, index buffer and owner chains, hashed. */
export function fillSig(fs: FillStructure): string {
  let h = 2166136261 >>> 0;
  const mix = (v: number): void => { h ^= v & 0xffff; h = Math.imul(h, 16777619) >>> 0; h ^= v >>> 16; h = Math.imul(h, 16777619) >>> 0; };
  mix(fs.nV); mix(fs.idx.length);
  for (let i = 0; i < fs.idx.length; i++) mix(fs.idx[i]);
  for (let i = 0; i < fs.vChain.length; i++) mix(fs.vChain[i] + 1);
  return `${fs.nV}/${fs.idx.length / 3}/${h.toString(16)}`;
}

/** Resample a polyline to `n + 1` points that keep every one of its own
 *  points (the border is the outline's polyline exactly: chords between
 *  resamples straddling a convex corner, or the arc a convex corner sweeps
 *  about one centreline foot, would cut paper into it). Each own point j
 *  takes the sample index nearest its share of the parameter polyline's
 *  length (the centreline feet), kept increasing; the samples between two
 *  kept points are spread evenly along the straight segment joining them.
 *  The triangles never change: only where the samples sit along the
 *  border. With more own points than samples (an interval stretched far
 *  past its frame-0 length), samples fall at equal fractions instead
 *  (`dense`, counted). */
let denseCount = 0;
function resample(pts: number[], par: number[] | null, n: number, out: Float64Array): boolean {
  const m = pts.length >> 1;
  if (m === 0) return false;
  if (m === 1) { for (let i = 0; i <= n; i++) { out[2 * i] = pts[0]; out[2 * i + 1] = pts[1]; } return true; }
  const P = par && par.length === pts.length && polyLen(par) > 1e-9 ? par : pts;
  const cum = new Float64Array(m);
  for (let i = 1; i < m; i++) cum[i] = cum[i - 1] + Math.hypot(P[2 * i] - P[2 * i - 2], P[2 * i + 1] - P[2 * i - 1]);
  const tot = cum[m - 1];
  if (m <= n + 1) {
    let prev = 0;
    out[0] = pts[0]; out[1] = pts[1];
    for (let j = 1; j < m; j++) {
      const ideal = j === m - 1 ? n : Math.round(tot > 0 ? (cum[j] / tot) * n : (j * n) / (m - 1));
      const idx = Math.min(n - (m - 1 - j), Math.max(prev + 1, ideal));
      // samples prev+1 .. idx-1 on the segment (j-1, j), then idx = point j
      const ax = pts[2 * j - 2]; const ay = pts[2 * j - 1]; const bx = pts[2 * j]; const by = pts[2 * j + 1];
      const span = idx - prev;
      for (let i = prev + 1; i <= idx; i++) { const t = (i - prev) / span; out[2 * i] = ax + (bx - ax) * t; out[2 * i + 1] = ay + (by - ay) * t; }
      prev = idx;
    }
    return true;
  }
  denseCount++;
  let k = 0;
  for (let i = 0; i <= n; i++) {
    if (i === 0) { out[0] = pts[0]; out[1] = pts[1]; continue; }
    if (i === n) { out[2 * n] = pts[2 * m - 2]; out[2 * n + 1] = pts[2 * m - 1]; continue; }
    const u = (tot * i) / n;
    while (k + 2 < m && cum[k + 1] < u) k++;
    const l = cum[k + 1] - cum[k];
    const t = l > 0 ? Math.min(1, Math.max(0, (u - cum[k]) / l)) : 0;
    out[2 * i] = pts[2 * k] + (pts[2 * k + 2] - pts[2 * k]) * t;
    out[2 * i + 1] = pts[2 * k + 1] + (pts[2 * k + 3] - pts[2 * k + 1]) * t;
  }
  return true;
}

/** Vertex positions, depth keys and s for one frame. Topology untouched.
 *  A border piece with no points this frame (two junctions' corners met
 *  over a short run) becomes the straight line between the junction ring
 *  points at its two ends, the same points the junction fans use, so the
 *  strip still closes the gap between the two fans. */
export function fillFrame(fs: FillStructure, st: DiagramStructure, table: OutlineTable, scene: SceneIn, zcIn?: ReturnType<typeof zChains>): FillFrame {
  const zz = zcIn ?? zChains(scene);
  const zc = zz.zc;
  const zt = 0.1 * scene.look.depthAmp;
  const pos = new Float64Array(2 * fs.nV);
  const key = new Float32Array(fs.nV);
  const sv = new Float32Array(fs.nV);
  let fallbacks = 0;
  denseCount = 0;
  const zAt = (pi: number, s: number): number => (zc[pi] ? zAtC(zc[pi], s) : 0);
  const set = (v: number, x: number, y: number, k: number, s: number): void => { pos[2 * v] = x; pos[2 * v + 1] = y; key[v] = k; sv[v] = s; };
  const armSOf = (ai: number): number => { const a = st.arms[ai]; const J = scene.junctions[a.ji]; return J && J.arms[a.ei] ? J.arms[a.ei].s : 0; };
  // 1. Junction ring end points per arm: P (side -dir), N (side +dir).
  const endPt = (pk: number, atStart: boolean): [number, number] | null => {
    if (pk < 0) return null; const p = table.pieces[pk]; if (!p || p.pts.length < 2) return null;
    return atStart ? [p.pts[0], p.pts[1]] : [p.pts[p.pts.length - 2], p.pts[p.pts.length - 1]];
  };
  const armEnd = new Map<number, { P: [number, number]; N: [number, number] }>();
  for (const it of fs.items) {
    if (it.kind !== "junc") continue;
    const J = scene.junctions[it.ji];
    const hub: [number, number] = J ? [J.c[0], J.c[1]] : [0, 0];
    for (const a of it.arms) {
      let P = endPt(a.pP, a.atStart); let Nn = endPt(a.pN, a.atStart);
      if (!Nn) { const cA = a.corner >= 0 ? table.corners[a.corner] : null; if (cA) { Nn = [cA.tax, cA.tay]; fallbacks++; } }
      if (!P) {
        const cb = st.corners.findIndex((c) => c.bArm === a.ai); const cB = cb >= 0 ? table.corners[cb] : null;
        if (cB) { P = [cB.tbx, cB.tby]; fallbacks++; }
      }
      if (!P) { P = Nn ?? hub; fallbacks++; }
      if (!Nn) { Nn = P; fallbacks++; }
      armEnd.set(a.ai, { P, N: Nn });
    }
  }
  /** A strip side's end point at a station, from the junction ring. */
  const stationEnd = (sti: number, side: number): [number, number] | null => {
    const q = st.stationsD[sti];
    if (!q || q.kind !== "junction" || q.arm < 0) return null;
    const e = armEnd.get(q.arm); if (!e) return null;
    return side === st.arms[q.arm].dir ? e.N : e.P;
  };
  const stationS = (sti: number): number | null => { const q = st.stationsD[sti]; return q && q.kind === "junction" && q.arm >= 0 ? armSOf(q.arm) : null; };
  let bufL = new Float64Array(0); let bufR = new Float64Array(0);
  const line = (a: [number, number], b: [number, number], N: number, out: Float64Array): void => {
    for (let i = 0; i <= N; i++) { const t = i / N; out[2 * i] = a[0] + (b[0] - a[0]) * t; out[2 * i + 1] = a[1] + (b[1] - a[1]) * t; }
  };
  for (const it of fs.items) {
    if (it.kind === "strip") {
      const N = it.N; const W = N + 1;
      if (bufL.length < 2 * W) { bufL = new Float64Array(2 * W); bufR = new Float64Array(2 * W); }
      const I = st.intervalsD[it.iv];
      const pl = it.pL >= 0 ? table.pieces[it.pL] : null; const pr = it.pR >= 0 ? table.pieces[it.pR] : null;
      const side = (p: typeof pl, sg: number, buf: Float64Array): boolean => {
        if (p && p.pts.length >= 4) return resample(p.pts, p.cpts, N, buf);
        const a = stationEnd(I.aSt, sg); const b = stationEnd(I.bSt, sg);
        if (a && b) { line(a, b, N, buf); fallbacks++; return true; }
        if (p && p.pts.length === 2) return resample(p.pts, null, N, buf);
        return false;
      };
      let okL = side(pl, 1, bufL);
      let okR = side(pr, -1, bufR);
      if (!okL && okR) { bufL.set(bufR.subarray(0, 2 * W)); okL = true; fallbacks++; }
      if (!okR && okL) { bufR.set(bufL.subarray(0, 2 * W)); okR = true; fallbacks++; }
      const P = pl && pl.pts.length >= 4 ? pl : pr && pr.pts.length >= 4 ? pr : null;
      let s0 = P ? P.s0 : (pl ?? pr)?.s0 ?? 0; let ds = P ? P.s1 - P.s0 : 0;
      const c = zc[it.pi];
      if (!P) { const sa = stationS(I.aSt); const sb = stationS(I.bSt); if (sa !== null && sb !== null) { s0 = sa; ds = sb - sa; } }
      if (c && c.closed && c.len > 0) {
        ds = ((ds % c.len) + c.len) % c.len;
        if (I.aSt === I.bSt && ds < 1e-9) ds = c.len; // a loop's one run, seam to seam
      }
      if (!okL) { fallbacks++; for (let r = 0; r < 3; r++) for (let i = 0; i <= N; i++) set(it.base + r * W + i, 0, 0, -1e3, s0); continue; }
      for (let i = 0; i <= N; i++) {
        const s = s0 + (ds * i) / N; const z = zAt(it.pi, s);
        const lx = bufL[2 * i]; const ly = bufL[2 * i + 1]; const rx = bufR[2 * i]; const ry = bufR[2 * i + 1];
        set(it.base + i, lx, ly, z - zt, s);
        set(it.base + W + i, (lx + rx) / 2, (ly + ry) / 2, z, s);
        set(it.base + 2 * W + i, rx, ry, z - zt, s);
      }
    } else if (it.kind === "cap") {
      const p = table.pieces[it.piece];
      const rim = new Float64Array(2 * CAP_M);
      const c = zc[it.pi]; const sEnd = it.atEnd && c ? c.len : 0; const z = zAt(it.pi, sEnd);
      if (!p || !resample(p.pts, null, CAP_M - 1, rim)) {
        fallbacks++;
        for (let i = 0; i <= CAP_M; i++) set(it.base + i, 0, 0, -1e3, sEnd);
        continue;
      }
      set(it.base, (rim[0] + rim[2 * CAP_M - 2]) / 2, (rim[1] + rim[2 * CAP_M - 1]) / 2, z, sEnd);
      for (let i = 0; i < CAP_M; i++) set(it.base + 1 + i, rim[2 * i], rim[2 * i + 1], z - zt, sEnd);
    } else {
      const J = scene.junctions[it.ji];
      const n = it.arms.length;
      const Ps: [number, number][] = []; const Ns: [number, number][] = []; const Zs: number[] = [];
      for (const a of it.arms) { const e = armEnd.get(a.ai)!; Ps.push(e.P); Ns.push(e.N); Zs.push(zAt(a.pi, armSOf(a.ai))); }
      const hx = J ? J.c[0] : 0; const hy = J ? J.c[1] : 0;
      const s0 = armSOf(it.arms[0].ai);
      set(it.base, hx, hy, zAt(it.owner, s0), s0);
      let v = it.base + 1;
      for (let k = 0; k < n; k++) {
        const a = it.arms[k]; const sA = armSOf(a.ai);
        const nx = (k + 1) % n;
        set(v++, Ps[k][0], Ps[k][1], Zs[k] - zt, sA);
        set(v++, Ns[k][0], Ns[k][1], Zs[k] - zt, sA);
        const T = Ps[nx]; const zA = Zs[k] - zt; const zB = Zs[nx] - zt;
        const cr = a.corner >= 0 ? table.corners[a.corner] : null;
        const arc = !!cr && cr.ok && cr.r > 1e-9;
        let a0 = 0; let da = 0; let r0 = 0; let r1 = 0;
        if (arc && cr) {
          a0 = Math.atan2(cr.tay - cr.qy, cr.tax - cr.qx);
          const a1 = Math.atan2(cr.tby - cr.qy, cr.tbx - cr.qx);
          da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          r0 = Math.hypot(cr.tax - cr.qx, cr.tay - cr.qy); r1 = Math.hypot(cr.tbx - cr.qx, cr.tby - cr.qy);
        }
        for (let q = 1; q <= ARC_K; q++) {
          const t = q / (ARC_K + 1);
          if (arc && cr) {
            const an = a0 + da * t; const rr = r0 + (r1 - r0) * t;
            set(v++, cr.qx + rr * Math.cos(an), cr.qy + rr * Math.sin(an), zA + (zB - zA) * t, sA);
          } else {
            set(v++, Ns[k][0] + (T[0] - Ns[k][0]) * t, Ns[k][1] + (T[1] - Ns[k][1]) * t, zA + (zB - zA) * t, sA);
          }
        }
      }
    }
  }
  return { pos, key, s: sv, fallbacks, dense: denseCount };
}

/** Key range for the depth mapping: every key lies in [-KS, KS]. */
export function keyScale(scene: SceneIn): number { return 4 * Math.abs(scene.look.depthAmp) + 1; }

/** Edge function of the edge u -> v at p, computed in one canonical order
 *  (the lexicographically smaller end first) and negated for the other
 *  direction: two triangles sharing an edge (same vertices, or bit-equal
 *  positions) get exactly opposite values, so no pixel centre falls
 *  between them (the GPU's raster is watertight the same way). */
function edgeFn(ux: number, uy: number, vx: number, vy: number, px: number, py: number): number {
  if (ux < vx || (ux === vx && uy <= vy)) return (vx - ux) * (py - uy) - (vy - uy) * (px - ux);
  return -((ux - vx) * (py - vy) - (uy - vy) * (px - vx));
}

/** CPU raster of the fill at pixel centres (x0 + (i + .5) / ppu): own = top
 *  chain + 1 (0 = paper), the highest key winning, ties to the later
 *  triangle (the GPU's LEQUAL). A centre exactly on an edge counts as
 *  inside (closed triangles, as the census paints master's faces). */
export function rasterFill(fs: FillStructure, fr: FillFrame, x0: number, y0: number, Wd: number, Hd: number, ppu: number): Int32Array {
  const own = new Int32Array(Wd * Hd);
  const zb = new Float32Array(Wd * Hd).fill(-Infinity);
  const P = fr.pos; const K = fr.key; const I = fs.idx;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t]; const b = I[t + 1]; const c = I[t + 2];
    const ax = (P[2 * a] - x0) * ppu; const ay = (P[2 * a + 1] - y0) * ppu;
    const bx = (P[2 * b] - x0) * ppu; const by = (P[2 * b + 1] - y0) * ppu;
    const cx = (P[2 * c] - x0) * ppu; const cy = (P[2 * c + 1] - y0) * ppu;
    const area = edgeFn(ax, ay, bx, by, cx, cy);
    if (!(Math.abs(area) > 1e-12)) continue;
    const i0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)); const i1 = Math.min(Wd - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
    const j0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)); const j1 = Math.min(Hd - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
    if (i0 > i1 || j0 > j1) continue;
    const ch = fs.vChain[a] + 1;
    const sg = area > 0 ? 1 : -1;
    for (let j = j0; j <= j1; j++) {
      const py = j + 0.5;
      for (let i = i0; i <= i1; i++) {
        const px = i + 0.5;
        const e0 = sg * edgeFn(bx, by, cx, cy, px, py); if (e0 < 0) continue;
        const e1 = sg * edgeFn(cx, cy, ax, ay, px, py); if (e1 < 0) continue;
        const e2 = sg * edgeFn(ax, ay, bx, by, px, py); if (e2 < 0) continue;
        const sum = e0 + e1 + e2;
        const w0 = e0 / sum; const w1 = e1 / sum; const w2 = e2 / sum;
        const k = w0 * K[a] + w1 * K[b] + w2 * K[c];
        const o = j * Wd + i;
        if (k >= zb[o]) { zb[o] = k; own[o] = ch; }
      }
    }
  }
  return own;
}
