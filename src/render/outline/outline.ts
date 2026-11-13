// Ported from .claude/probes/K1240/proto/outline.ts by k1240s4_port.mjs (K1240 S4): the prototype's default path only.
// Structure once (structure), positions per frame (frame); buildOutline = both.
// K1240 S3f: structure() emits the piece list from the diagram alone
// (runs between diagram stations, one arc per corner, one cap per
// open end); frame() computes points only for those pieces.
// K1240 S3c: decide once, follow the frame, cheaply. `structure(scene)`
// runs S2's structural builder once and decides everything discrete:
// which pieces exist (runs bounded by cuts, corner tangent points and
// caps), which border segments are exposed, each corner's arms, span
// and sharp or round. `frame(structure, scene)` decides nothing: it
// solves only positions from that frame's centrelines (cut points,
// corner tangent points and radii via form B's gate integral), and a
// position with no solution degenerates to a zero-length piece or a
// zero radius instead of switching. `buildOutline` is the split
// applied to one scene; `buildOutlineS2` is the original builder.
// K1240 S2: the outline from the scene's own structure.
// A FieldScene goes in and one outline table comes out. Pure TypeScript:
// no imports at all, so nothing from the app renderer can leak in (a test
// asserts this). Every cut comes from a feature the scene names:
// - borders: each chain's two offsets at h; a tight bend's swallowtail is
//   cut at its self-intersection, searched inside that bend only;
// - crossings: for each crossing in the scene, the under's two borders are
//   intersected with the over's two borders near it, starting from the
//   crossing's s on each chain. The under's borders and strip end on the
//   over's borders; the over's run on;
// - eyes: two crossings of one pair (or a kink's self-crossing) that are
//   consecutive on both chains: their facing borders are intersected
//   between the crossings, and the depth tie (a closed form from the
//   diagram's pinned hats, linear between the two crossings) is cut on
//   the facing borders when they do not meet;
// - junctions: arms in angular order; each neighbouring pair's facing
//   borders meet at V (distance h from both centrelines); form B's radius
//   rule (docs/design/K1040_junction_field.md F2: r0, fit by room) gives
//   the arc spliced in tangent to both. The junction is one polygon;
// - dead ends: round caps;
// - regions: each piece of a chain's strip between its cuts, and each
//   junction polygon. A region's owner is the chain or junction it came
//   from (never a sampled guess). Border segments between cuts are kept
//   only where no higher surface (a higher diagram depth, or the same
//   junction group) covers them; that rule, applied in order along the
//   border, is also what handles features that reach each other.
// Structure is decided per frame from the named features; every cut and
// tangent point is fractional and recomputed in closed form from that
// frame alone: no stepped walks, no warm start, no state between frames.

export interface SceneChainIn { id: number; closed: boolean; pts: number[] }
export interface SceneCrossingIn { a: { chain: number; s: number }; b: { chain: number; s: number }; over: "a" | "b"; emergent?: boolean }
export interface SceneArmIn { chain: number; s: number; dir: 1 | -1; kind: "through" | "end" }
export interface SceneJunctionIn { id: string; c: [number, number]; arms: SceneArmIn[]; corners?: { style: "round" | "sharp"; pinned: boolean }[] }
export interface SceneIn {
  name: string;
  camera: { worldToCss: number[]; pxPerUnit: number; dpr: number; viewport: [number, number] };
  look: { halfWidth: number; band: number; cornerRoundShare: number; cuspRadius: number; depthAmp: number; depthWindow: number; paper: string; ink: string; ctrlArc?: number; fillRec?: number };
  chains: SceneChainIn[];
  crossings: SceneCrossingIn[];
  junctions: SceneJunctionIn[];
  deadEnds: { chain: number; s: number; offscreen?: boolean }[];
}

/** K1279: a "ghost" is the under pass's border across its crossing's
 *  discarded interval (in -> out), one per side per crossing, decided by the
 *  diagram alone. It owns no region; draw.ts draws it (and every band) at
 *  form B's tie alpha, which is 0 deep under the over pass and fades in
 *  continuously where the two passes' keys tie (form B's burial). */
export type PieceKind = "run" | "arc" | "cap" | "tail" | "ghost";
export interface OutlinePiece {
  kind: PieceKind;
  chain: number;
  side: number;
  s0: number; s1: number;
  pts: number[];
  cpts: number[];
  region: number;
  corner: number;
  /** K1283 s3: a tail's own alpha per point, outer then inner edge of the
   *  band (2 per point): form B's member weight (1 - ramp) times its burial
   *  under the other arm. Absent = 1. Run and ghost pieces carry their tie
   *  alpha in draw.ts instead. */
  alpha?: number[];
  /** K1283 s3: a tail's fill stretch (border points and their feet), stage
   *  2's cut, shorter than its band (pts); fill_tri fills these. Absent = pts. */
  fpts?: number[];
  fcpts?: number[];
  /** K1247 s22 (ob=1, OB_DI.on): the piece's index in st.piecesD, the band's fixed layout's key. */
  di?: number;
}
/** K1247 s22: when on, piecesPhaseC tags each piece with its piecesD index (di). Off: nothing changes. */
export const OB_DI = { on: false };
export interface OutlineRegion {
  id: number;
  ownerChain: number;
  group: number;
  pts: number[];
  pieces: number[];
  hole: boolean;
}
export interface OutlineFace {
  ownerChain: number;
  group: number;
  pts: number[];
  sample: [number, number];
  hole: boolean;
}
export interface OutlineCorner {
  junction: string;
  aChain: number; bChain: number;
  ok: boolean;
  style: number;
  theta: number;
  r: number;
  Vx: number; Vy: number;
  qx: number; qy: number;
  tax: number; tay: number; tbx: number; tby: number;
  why?: string;
}
export interface OutlineCut {
  crossing: number;
  chain: number; side: number; s: number;
  x: number; y: number;
  overChain: number;
}
export interface OutlineTable {
  h: number; W: number;
  pieces: OutlinePiece[];
  regions: OutlineRegion[];
  faces: OutlineFace[];
  corners: OutlineCorner[];
  cuts: OutlineCut[];
  diagnostics: string[];
}

// ---------------------------------------------------------------------------
// Centreline polylines (s from the first sample; a closed chain wraps).

interface Poly {
  id: number; n: number; closed: boolean; nseg: number; len: number; s0: number;
  x: Float64Array; y: Float64Array; s: Float64Array; segLen: Float64Array; dx: Float64Array; dy: Float64Array;
  bx0: Float64Array; by0: Float64Array; bx1: Float64Array; by1: Float64Array;
  bk: Float64Array; nblk: number;
}

function makePoly(id: number, pts: number[], closed: boolean, s0 = 0): Poly {
  const xs: number[] = []; const ys: number[] = [];
  const m = pts.length >> 1;
  for (let i = 0; i < m; i++) {
    const x = pts[2 * i]; const y = pts[2 * i + 1];
    const k = xs.length;
    if (k > 0 && Math.abs(x - xs[k - 1]) + Math.abs(y - ys[k - 1]) < 1e-12) continue;
    xs.push(x); ys.push(y);
  }
  if (closed && xs.length > 2) {
    const k = xs.length - 1;
    if (Math.abs(xs[0] - xs[k]) + Math.abs(ys[0] - ys[k]) < 1e-12) { xs.pop(); ys.pop(); }
  }
  const n = xs.length;
  const nseg = closed ? n : Math.max(0, n - 1);
  const p: Poly = { id, n, closed, nseg, len: 0, s0, x: Float64Array.from(xs), y: Float64Array.from(ys), s: new Float64Array(n), segLen: new Float64Array(Math.max(nseg, 0)), dx: new Float64Array(Math.max(nseg, 0)), dy: new Float64Array(Math.max(nseg, 0)), bx0: new Float64Array(Math.max(nseg, 0)), by0: new Float64Array(Math.max(nseg, 0)), bx1: new Float64Array(Math.max(nseg, 0)), by1: new Float64Array(Math.max(nseg, 0)), bk: new Float64Array(4 * Math.max(1, Math.ceil(nseg / 32))), nblk: Math.ceil(nseg / 32) };
  if (n > 0) p.s[0] = s0;
  for (let k = 0; k < nseg; k++) {
    const b = k + 1 === n ? 0 : k + 1;
    const l = Math.hypot(p.x[b] - p.x[k], p.y[b] - p.y[k]);
    p.segLen[k] = l;
    p.dx[k] = p.x[b] - p.x[k]; p.dy[k] = p.y[b] - p.y[k];
    p.bx0[k] = Math.min(p.x[k], p.x[b]); p.bx1[k] = Math.max(p.x[k], p.x[b]);
    p.by0[k] = Math.min(p.y[k], p.y[b]); p.by1[k] = Math.max(p.y[k], p.y[b]);
    if (k + 1 < n) p.s[k + 1] = p.s[k] + l;
  }
  p.len = n > 0 ? p.s[n - 1] - s0 + (closed ? p.segLen[n - 1] : 0) : 0;
  for (let bIdx = 0; bIdx < p.nblk; bIdx++) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    const kEnd = Math.min(nseg, (bIdx + 1) * 32);
    for (let k = bIdx * 32; k < kEnd; k++) { if (p.bx0[k] < x0) x0 = p.bx0[k]; if (p.by0[k] < y0) y0 = p.by0[k]; if (p.bx1[k] > x1) x1 = p.bx1[k]; if (p.by1[k] > y1) y1 = p.by1[k]; }
    p.bk[4 * bIdx] = x0; p.bk[4 * bIdx + 1] = y0; p.bk[4 * bIdx + 2] = x1; p.bk[4 * bIdx + 3] = y1;
  }
  return p;
}

function normS(p: Poly, s: number): number {
  if (p.closed && p.len > 0) { let u = (s - p.s0) % p.len; if (u < 0) u += p.len; return p.s0 + u; }
  return Math.min(Math.max(s, p.s0), p.s0 + p.len);
}
/**
 * K1247 s17 (j176): a crossing's s on its two chains, as the centrelines'
 * true intersection, not the physics binding's s. The binding is a
 * fractional position on the particle chain that slides on its own (def f1:
 * chain 82's binding moved 1.606 px, chain 74's 0.627 px, while the two
 * centrelines' intersection moved 0.045 / 0.011 px), and every pass length,
 * gap and pin read it, so the arms cut by it jumped. The walk starts on the
 * binding's segments and steps each chain one segment toward the two
 * segments' line intersection until it lands inside both: the binding only
 * picks which intersection (its basin), and the s returned is the
 * intersection's, continuous in the vertices wherever the crossing is
 * transversal. out = [sa, sb]; false (out = the binding) if no intersection
 * is reached within 48 steps.
 */
function dS(p: Poly, a: number, b: number): number {
  let d = b - a;
  if (p.closed && p.len > 0) { d %= p.len; if (d > p.len / 2) d -= p.len; if (d < -p.len / 2) d += p.len; }
  return d;
}
// The s a fraction t along a border segment from s a to s b. A closed
// border's last segment runs from s near len back to s0, so a plain
// a + (b - a) t put a point there at a garbage s (fat's x0: 49.31 for a
// point at 253.4), which ordered its crossing's entry after its exit.
function lerpS(p: Poly, a: number, b: number, t: number): number {
  return normS(p, a + dS(p, a, b) * t);
}
// K1247 s11: the part of a border segment (s a to s b) inside the s window [sC - R, sC + R],
// as a parameter range out[0]..out[1]; false if none. segsNear keeps whole segments, so a
// synthesized cut whose nearest approach falls on the window's edge sat on the first
// segment end past it: wherever the points happened to be (g41_ring_tw64 cut 273 moved
// 0.42 h when reduction lengthened that segment). Clipped, the edge is the same s at any
// point density.
// K1247 s14 (#658): a border join's points (miter, fan, bevel) all carry their vertex's s, so a
// bevel segment has zero s span and real length (fat x366: 0.0074), and a window edge in s
// jumped the whole bevel when the bevel's s crossed it (cyc18 jit 0.01: the bevel's s moved
// 1e-4 past the edge, the synthesized cut 0.337 px). The fast path's clip now runs in a border
// parameter sigma = bs + E, strictly increasing: a segment advances max(L, c len) (c = K14_BEVC),
// E sums the excess (FBord.be), and the window is measured from E at the window's center
// (sigCenter). An edge then crosses a bevel at rate 1 / c, and a center crossing a vertex moves
// the window by c len in s. K14_NOSIGMA=1 restores the old clip (c 0); K14_BEVC=<c> tunes it.
const K14_BEVC = 0.1;
const synthTU = new Float64Array(2); const synthTO = new Float64Array(2);
// len: the segment's length (0: the old clip); rel: its sigma offset (be[i] - E at the center).
function clipSegS(p: Poly, a: number, b: number, sC: number, R: number, out: Float64Array, len = 0, rel = 0): boolean {
  let L = dS(p, a, b); const d0 = dS(p, sC, a) + rel;
  if (L >= 0 && L < K14_BEVC * len) L = K14_BEVC * len;
  if (!(L > 0)) { out[0] = 0; out[1] = 1; return Math.abs(d0) <= R; }
  const t0 = (-R - d0) / L; const t1 = (R - d0) / L;
  out[0] = t0 > 0 ? t0 : 0; out[1] = t1 < 1 ? t1 : 1;
  return out[1] > out[0];
}
function segOfS(p: Poly, s: number): { k: number; t: number } {
  const u = normS(p, s);
  if (p.n === 0) return { k: 0, t: 0 };
  if (u >= p.s[p.n - 1]) {
    if (p.closed) return { k: p.n - 1, t: Math.min(1, Math.max(0, (u - p.s[p.n - 1]) / (p.segLen[p.n - 1] || 1))) };
    return { k: Math.max(0, p.nseg - 1), t: 1 };
  }
  let lo = 0; let hi = p.n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p.s[mid] <= u) lo = mid; else hi = mid; }
  return { k: lo, t: (u - p.s[lo]) / (p.segLen[lo] || 1) };
}
export interface At { x: number; y: number; tx: number; ty: number; k: number; t: number }
function pointAt(p: Poly, s: number): At {
  const { k, t } = segOfS(p, s);
  const b = k + 1 === p.n ? 0 : k + 1;
  const l = p.segLen[k] || 1;
  return { x: p.x[k] + (p.x[b] - p.x[k]) * t, y: p.y[k] + (p.y[b] - p.y[k]) * t, tx: (p.x[b] - p.x[k]) / l, ty: (p.y[b] - p.y[k]) / l, k, t };
}
/** Unit tangent at s, vertex tangents interpolated (form B's tanAt). */
function tanAt(p: Poly, s: number): { tx: number; ty: number } {
  const a = pointAt(p, s);
  const vtx = (i: number): [number, number] => {
    const kin = i > 0 ? i - 1 : p.closed ? p.nseg - 1 : -1;
    const kout = i < p.nseg ? i : p.closed ? 0 : -1;
    let x = 0; let y = 0;
    for (const k of [kin, kout]) {
      if (k < 0) continue;
      const l = p.segLen[k] || 1; const b = k + 1 === p.n ? 0 : k + 1;
      x += (p.x[b] - p.x[k]) / l; y += (p.y[b] - p.y[k]) / l;
    }
    const l = Math.hypot(x, y);
    return l > 1e-12 ? [x / l, y / l] : [a.tx, a.ty];
  };
  const [x0, y0] = vtx(a.k);
  const [x1, y1] = vtx(a.k + 1 === p.n ? 0 : a.k + 1);
  const x = x0 + (x1 - x0) * a.t; const y = y0 + (y1 - y0) * a.t;
  const l = Math.hypot(x, y);
  return l > 1e-12 ? { tx: x / l, ty: y / l } : { tx: a.tx, ty: a.ty };
}

/** Closest point of the centreline inside the s window [lo, hi]. */
function footInWindow(p: Poly, px: number, py: number, lo: number, hi: number): { d: number; x: number; y: number; s: number; k: number } {
  let best = { d: Infinity, x: px, y: py, s: lo, k: 0 };
  if (p.nseg === 0 || hi < lo) return best;
  const shifts = p.closed ? [-p.len, 0, p.len] : [0];
  for (const sh of shifts) {
    // Segment k range whose [s, s+len]+sh meets [lo, hi] (binary search).
    let a = 0; let b = p.nseg;
    while (a < b) { const m = (a + b) >> 1; if (p.s[m] + p.segLen[m] + sh >= lo) b = m; else a = m + 1; }
    const k0 = a;
    b = p.nseg;
    while (a < b) { const m = (a + b) >> 1; if (p.s[m] + sh > hi) b = m; else a = m + 1; }
    for (let k = k0; k < a; k++) {
      const sa = p.s[k]; const sb = sa + p.segLen[k];
      const aa = Math.max(lo, sa + sh); const bb = Math.min(hi, sb + sh);
      if (bb < aa) continue;
      const l = p.segLen[k] || 1;
      const ta = Math.min(1, Math.max(0, (aa - sh - sa) / l));
      const tb = Math.min(1, Math.max(0, (bb - sh - sa) / l));
      const kb = k + 1 === p.n ? 0 : k + 1;
      const ax = p.x[k] + (p.x[kb] - p.x[k]) * ta; const ay = p.y[k] + (p.y[kb] - p.y[k]) * ta;
      const bx = p.x[k] + (p.x[kb] - p.x[k]) * tb; const by = p.y[k] + (p.y[kb] - p.y[k]) * tb;
      const ex = bx - ax; const ey = by - ay;
      const l2 = ex * ex + ey * ey;
      let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
      t = Math.min(1, Math.max(0, t));
      const qx = ax + ex * t; const qy = ay + ey * t;
      const d = Math.hypot(px - qx, py - qy);
      if (d < best.d) { const tt = ta + (tb - ta) * t; best = { d, x: qx, y: qy, s: sa + tt * p.segLen[k], k }; }
    }
  }
  return best;
}
// footInWindow's d, x, y into out[0..2], allocating nothing (K1247 s2:
// setupFrame's extension feet built an object per improvement). Same
// shifts, same order, same strict test, so the same foot.
function footInWindowInto(p: Poly, px: number, py: number, lo: number, hi: number, out: Float64Array): void {
  out[0] = Infinity; out[1] = px; out[2] = py; if (out.length >= 6) out[4] = -1;
  if (p.nseg === 0 || hi < lo) return;
  // hypot only where the squared distance could beat the best: d2 is
  // within a few ulps of the true square and hypot within one ulp of the
  // true distance, so the 1e-9 margin skips no foot hypot would pick.
  let bestSq = Infinity;
  const nsh = p.closed ? 3 : 1;
  for (let si = 0; si < nsh; si++) {
    const sh = p.closed ? (si === 0 ? -p.len : si === 1 ? 0 : p.len) : 0;
    let a = 0; let b = p.nseg;
    while (a < b) { const m = (a + b) >> 1; if (p.s[m] + p.segLen[m] + sh >= lo) b = m; else a = m + 1; }
    const k0 = a;
    b = p.nseg;
    while (a < b) { const m = (a + b) >> 1; if (p.s[m] + sh > hi) b = m; else a = m + 1; }
    for (let k = k0; k < a; k++) {
      const sa = p.s[k]; const sb = sa + p.segLen[k];
      const aa = Math.max(lo, sa + sh); const bb = Math.min(hi, sb + sh);
      if (bb < aa) continue;
      const l = p.segLen[k] || 1;
      const ta = Math.min(1, Math.max(0, (aa - sh - sa) / l));
      const tb = Math.min(1, Math.max(0, (bb - sh - sa) / l));
      const kb = k + 1 === p.n ? 0 : k + 1;
      const ax = p.x[k] + (p.x[kb] - p.x[k]) * ta; const ay = p.y[k] + (p.y[kb] - p.y[k]) * ta;
      const bx = p.x[k] + (p.x[kb] - p.x[k]) * tb; const by = p.y[k] + (p.y[kb] - p.y[k]) * tb;
      const ex = bx - ax; const ey = by - ay;
      const l2 = ex * ex + ey * ey;
      let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
      t = Math.min(1, Math.max(0, t));
      const qx = ax + ex * t; const qy = ay + ey * t;
      const ddx = px - qx; const ddy = py - qy;
      if (ddx * ddx + ddy * ddy > bestSq) continue;
      const d = Math.hypot(ddx, ddy);
      if (d < out[0]) {
        out[0] = d; out[1] = qx; out[2] = qy; bestSq = d > 1e-100 ? d * d * (1 + 1e-9) : Infinity;
        // K1247 s16: the foot's segment and parameter, for footBlendInto.
        if (out.length >= 6) { out[4] = k; out[5] = ta + (tb - ta) * t; }
      }
    }
  }
}
// K1247 s16: the polyline's nearest point, made continuous in the point.
// On the concave side of a vertex the nearest point jumps from one
// segment's projection to the other's where the point crosses the
// vertex's bisector (the two tie there): j67's cap centre moved 1.5 px
// under 0.075 px of input (def f23), j87's corner arc end slid 1.2 px
// along s under 0.02 px. Inside a band |sigma| < beta around that
// bisector the foot blends the two lines' projections (smoothstep across
// the band); outside it, and on the convex side, it is the nearest point
// exactly, so the look at rest moves only inside the band. beta is 0.75 x
// the jump it replaces (the feet's separation there), capped at a quarter
// of either segment. (k, t) is the nearest foot's segment and parameter;
// true when the point is in a band, with d, x, y, s in out[0..3].
// loc: (k, t) is a tracked foot, a local minimum that may sit on the far
// side of a bisector (the corner growth's feet); the foot is first moved
// to the nearest of segments k - 1, k, k + 1, so that the result is a
// function of the point near k, not of the growth's path (true when it
// moved).
function footBlendInto(p: Poly, px: number, py: number, k: number, t: number, out: Float64Array, loc = false, circ = false): boolean {
  if (p.nseg < 2 || k < 0 || k >= p.nseg) return false;
  let moved = false;
  if (loc) {
    let bd = Infinity; let bk = k; let bt = t;
    for (let o = -1; o <= 1; o++) {
      let j = k + o;
      if (j < 0 || j >= p.nseg) { if (!p.closed) continue; j = (j + p.nseg) % p.nseg; }
      const je = j + 1 === p.n ? 0 : j + 1;
      const ex = p.x[je] - p.x[j]; const ey = p.y[je] - p.y[j]; const l2 = ex * ex + ey * ey;
      let u = l2 > 0 ? ((px - p.x[j]) * ex + (py - p.y[j]) * ey) / l2 : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const d = Math.hypot(px - p.x[j] - ex * u, py - p.y[j] - ey * u);
      if (d < bd - 1e-15 || (o === 0 && d <= bd)) { bd = d; bk = j; bt = u; }
    }
    if (bk !== k) {
      moved = true; k = bk; t = bt;
      const ke = k + 1 === p.n ? 0 : k + 1;
      const fx = p.x[k] + (p.x[ke] - p.x[k]) * t; const fy = p.y[k] + (p.y[ke] - p.y[k]) * t;
      out[0] = bd; out[1] = fx; out[2] = fy; out[3] = normS(p, p.s[k] + p.segLen[k] * t);
    }
  }
  if (footBandInto(p, px, py, k, t, out, circ)) return true;
  return moved;
}
// circ (K1247 s17, the corners' feet): the blended foot is pushed out along
// its direction from the point to the blended perpendicular distance
// (1 - w) da + w db, so a corner's arc end (foot + h toward the centre)
// stays on the arc's circle rather than on the chord between the two feet:
// the arc end slides along the circle from one contact to the other, and
// only the invisible lens between the circle and the creased border
// (r phi^2 / 8 wide) changes as the centre crosses the bisector.
function footBandInto(p: Poly, px: number, py: number, k: number, t: number, out: Float64Array, circ = false): boolean {
  for (let pass = 0; pass < 2; pass++) {
    const atEnd = (t >= 0.5) === (pass === 0);
    let ka: number; let kb: number;
    if (atEnd) { ka = k; kb = k + 1; if (kb >= p.nseg) { if (!p.closed) continue; kb = 0; } }
    else { kb = k; ka = k - 1; if (ka < 0) { if (!p.closed) continue; ka = p.nseg - 1; } }
    const va = ka + 1 === p.n ? 0 : ka + 1;
    const la = p.segLen[ka]; const lb = p.segLen[kb];
    if (!(la > 1e-12 && lb > 1e-12)) continue;
    const vx = p.x[va]; const vy = p.y[va];
    const tax = (vx - p.x[ka]) / la; const tay = (vy - p.y[ka]) / la;
    const kbE = kb + 1 === p.n ? 0 : kb + 1;
    const tbx = (p.x[kbE] - vx) / lb; const tby = (p.y[kbE] - vy) / lb;
    const cross = tax * tby - tay * tbx;
    if (Math.abs(cross) < 1e-12) continue;
    let bx = tax + tbx; let by = tay + tby; const bl = Math.hypot(bx, by);
    if (bl < 1e-12) continue;
    bx /= bl; by /= bl;
    const qx = px - vx; const qy = py - vy;
    const yN = (-by * qx + bx * qy) * (cross > 0 ? 1 : -1);
    if (!(yN > 0)) continue;
    const sig = qx * bx + qy * by;
    const beta = Math.min(0.75 * yN * Math.hypot(tax - tbx, tay - tby), 0.25 * la, 0.25 * lb);
    if (!(beta > 1e-12) || Math.abs(sig) >= beta) continue;
    const x = (sig + beta) / (2 * beta); const w = x * x * (3 - 2 * x);
    const pa = qx * tax + qy * tay; const pb = qx * tbx + qy * tby;
    let fx = vx + (1 - w) * pa * tax + w * pb * tbx; let fy = vy + (1 - w) * pa * tay + w * pb * tby;
    out[0] = Math.hypot(px - fx, py - fy);
    if (circ && out[0] > 1e-12) {
      const da = Math.abs(qx * tay - qy * tax); const db = Math.abs(qx * tby - qy * tbx);
      const dN = (1 - w) * da + w * db;
      fx = px + ((fx - px) * dN) / out[0]; fy = py + ((fy - py) * dN) / out[0]; out[0] = dN;
    }
    out[1] = fx; out[2] = fy;
    out[3] = normS(p, p.s[ka] + la + (1 - w) * pa + w * pb);
    return true;
  }
  return false;
}
const kfFootR = new Float64Array(6);
const kfFootB = new Float64Array(4);
function ssFB(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
function rootTipScale(theta: number): number {
  const s = Math.sin(theta / 2);
  if (!(s > 0)) return 1;
  const t = 1 / s - 1;
  if (!(t > 0)) return 0;
  const tRef = 1 / Math.sin(1.0) - 1;
  return Math.min(1, t / tRef);
}

function segInt(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): { t: number; u: number } | null {
  const ex = bx - ax; const ey = by - ay;
  const fx = dx - cx; const fy = dy - cy;
  const det = ex * fy - ey * fx;
  if (Math.abs(det) < 1e-300) return null;
  const gx = cx - ax; const gy = cy - ay;
  const t = (gx * fy - gy * fx) / det;
  const u = (gx * ey - gy * ex) / det;
  const EPS = 1e-9;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { t: Math.min(1, Math.max(0, t)), u: Math.min(1, Math.max(0, u)) };
}

// ---------------------------------------------------------------------------
// Borders: the offset polyline of one side of one chain.

/** fx, fy: the point's foot when it is not the centreline at s (a cut fold's chevron, foldChevron). */
interface BPt { x: number; y: number; s: number; rec?: BRec; ev?: unknown; fx?: number; fy?: number; cv?: number; s2?: number; sm?: number }
interface Border { pi: number; side: number; pts: BPt[]; closed: boolean }

/** How one border point is recomputed from a frame's centrelines.
 *  0: centre vertex v offset along segment seg's normal;
 *  1: miter at vertex v; 2: arc-fan point at vertex v, fraction u;
 *  3: intersection of segments (a,b) and (c,d) of this border's pool;
 *  4: intersection of own segment (a,b) with segment (c,d) of border
 *     `other`; 5: corner tangent point; 6: border point at arc length s. */
export type BRec =
  | { k: 0; v: number; seg: number; sOff?: number }
  | { k: 1; v: number; sOff?: number }
  | { k: 2; v: number; u: number; sOff?: number }
  | { k: 3; a: BPt; b: BPt; c: BPt; d: BPt; t: number }
  | { k: 4; a: BPt; b: BPt; c: BPt; d: BPt; t: number; otherPi: number; otherSide: number; eye: number }
  | { k: 5; corner: number; which: number }
  | { k: 6; s: number };

function offPoint(p: Poly, k: number, v: number, sig: number, h: number): [number, number] {
  const b = k + 1 === p.n ? 0 : k + 1;
  const l = p.segLen[k] || 1;
  const tx = (p.x[b] - p.x[k]) / l; const ty = (p.y[b] - p.y[k]) / l;
  return [p.x[v] + sig * h * -ty, p.y[v] + sig * h * tx];
}

export function buildBorder(p: Poly, sig: number, h: number): BPt[] {
  const out: BPt[] = [];
  const push = (x: number, y: number, s: number, rec?: BRec) => {
    const q = out[out.length - 1];
    if (q && Math.abs(q.x - x) + Math.abs(q.y - y) < 1e-12) return;
    out.push({ x, y, s, rec });
  };
  if (p.nseg === 0) return out;
  const arcStep = Math.PI / 16;
  const transition = (v: number): boolean => {
    const kPrev = v - 1 < 0 ? p.nseg - 1 : v - 1;
    const kNext = v >= p.nseg ? 0 : v;
    const [ax, ay] = offPoint(p, kPrev, v, sig, h);
    const [bx, by] = offPoint(p, kNext, v, sig, h);
    const lP = p.segLen[kPrev] || 1; const lN = p.segLen[kNext] || 1;
    const bP = kPrev + 1 === p.n ? 0 : kPrev + 1;
    const bN = kNext + 1 === p.n ? 0 : kNext + 1;
    const tPx = (p.x[bP] - p.x[kPrev]) / lP; const tPy = (p.y[bP] - p.y[kPrev]) / lP;
    const tNx = (p.x[bN] - p.x[kNext]) / lN; const tNy = (p.y[bN] - p.y[kNext]) / lN;
    const cross = tPx * tNy - tPy * tNx;
    if (Math.abs(cross) < 1e-12) { push(bx, by, p.s[v], { k: 0, v, seg: kNext }); return false; }
    const joinSide = cross > 0 ? 1 : -1;
    if (sig === joinSide) {
      const det = cross;
      const dx = bx - ax; const dy = by - ay;
      const t = (dx * tNy - dy * tNx) / det;
      const jx = ax + tPx * t; const jy = ay + tPy * t;
      const q = out[out.length - 1];
      if (q && Math.abs(q.x - ax) + Math.abs(q.y - ay) < 1e-9) { q.x = jx; q.y = jy; q.rec = { k: 1, v }; }
      else push(jx, jy, p.s[v], { k: 1, v });
      return true;
    }
    const a0 = Math.atan2(ay - p.y[v], ax - p.x[v]);
    let a1 = Math.atan2(by - p.y[v], bx - p.x[v]);
    let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const steps = Math.max(1, Math.ceil(Math.abs(da) / arcStep));
    for (let i = 1; i < steps; i++) {
      const a = a0 + (da * i) / steps;
      push(p.x[v] + h * Math.cos(a), p.y[v] + h * Math.sin(a), p.s[v], { k: 2, v, u: i / steps });
    }
    push(bx, by, p.s[v], { k: 0, v, seg: kNext });
    return false;
  };
  if (p.closed) {
    for (let k = 0; k < p.nseg; k++) {
      const joined = transition(k);
      const b = k + 1 === p.n ? 0 : k + 1;
      const [ax, ay] = offPoint(p, k, k, sig, h);
      const [bx, by] = offPoint(p, k, b, sig, h);
      if (!joined) push(ax, ay, p.s[k], { k: 0, v: k, seg: k });
      push(bx, by, p.s[b], { k: 0, v: b, seg: k });
    }
    // Close the loop explicitly (s runs to s0+len) for linear handling.
    if (out.length > 1) {
      const f = out[0];
      const l = out[out.length - 1];
      if (Math.hypot(f.x - l.x, f.y - l.y) > 1e-12) out.push({ x: f.x, y: f.y, s: p.s0 + p.len, rec: f.rec ? ({ ...f.rec, sOff: p.len } as BRec) : undefined });
      else { l.s = p.s0 + p.len; if (l.rec) l.rec = { ...l.rec, sOff: p.len } as BRec; }
    }
  } else {
    const [ax, ay] = offPoint(p, 0, 0, sig, h);
    push(ax, ay, p.s[0], { k: 0, v: 0, seg: 0 });
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1;
      const [bx, by] = offPoint(p, k, b, sig, h);
      const joined = k > 0 ? transition(k) : false;
      if (!joined) {
        const [sx, sy] = offPoint(p, k, k, sig, h);
        const q = out[out.length - 1];
        if (!q || Math.abs(q.x - sx) + Math.abs(q.y - sy) >= 1e-9) push(sx, sy, p.s[k], { k: 0, v: k, seg: k });
      }
      push(bx, by, p.s[b], { k: 0, v: b, seg: k });
    }
  }
  return out;
}

/** Cut a border's swallowtails at tight bends (radius of curvature < h
 *  on the concave side), searched only inside each bend's s window.
 *  K1283 s6: the fallback builder's copy of cutFoldsC (the fast frame's), which
 *  it had stopped matching: j from i + 3 (j = i + 2 shares a point with segment
 *  i, so segInt always hit there and no fold was ever cut), no cut within h of
 *  `keep` (the chain's arm roots and kink stations), and each cut point drawn as
 *  form B's chevron (foldChevron) with its points' own feet. */
function cutFolds(p: Poly, pts: BPt[], sig: number, h: number, W: number, keep: number[], diag: string[]): BPt[] {
  const bends: number[] = [];
  const n = p.n;
  for (let v = 0; v < n; v++) {
    if (!p.closed && (v === 0 || v === n - 1)) continue;
    const vp = v - 1 < 0 ? n - 1 : v - 1;
    const vn = v + 1 >= n ? 0 : v + 1;
    const ax = p.x[v] - p.x[vp]; const ay = p.y[v] - p.y[vp];
    const bx = p.x[vn] - p.x[v]; const by = p.y[vn] - p.y[v];
    const cx = p.x[vn] - p.x[vp]; const cy = p.y[vn] - p.y[vp];
    const la = Math.hypot(ax, ay); const lb = Math.hypot(bx, by); const lc = Math.hypot(cx, cy);
    const area2 = Math.abs(ax * by - ay * bx);
    if (!(la > 0 && lb > 0 && lc > 0 && area2 > 1e-15)) continue;
    const radius = (la * lb * lc) / (2 * area2);
    const cross = ax * by - ay * bx;
    const concave = cross > 0 ? 1 : -1;
    if (radius < h && concave === sig) bends.push(p.s[v]);
  }
  if (!bends.length) return pts;
  // Cluster bend vertices within h of each other into one bend.
  const bendClusters: number[] = [];
  for (const sb of bends) if (!bendClusters.some((c) => Math.abs(dS(p, c, sb)) < h)) bendClusters.push(sb);
  let out = pts;
  const cutN = new Map<BPt, Float64Array>();
  for (const sb of bendClusters) {
    if (keep.some((q) => Math.abs(dS(p, q, sb)) < h)) continue;
    // Segment index range whose s lies within 2.5h of the bend.
    const idx: number[] = [];
    for (let i = 0; i < out.length; i++) if (Math.abs(dS(p, sb, out[i].s)) <= 2.5 * h) idx.push(i);
    if (idx.length < 3) continue;
    const i0 = idx[0]; const i1 = idx[idx.length - 1];
    let guard = 0;
    let changed = true;
    while (changed && guard++ < 8) {
      changed = false;
      outer: for (let i = i0; i <= Math.min(i1, out.length - 2); i++) {
        for (let j = i + 3; j <= Math.min(i1, out.length - 1); j++) {
          // A loop that closes on an endpoint is the closed loop itself.
          if (i === 0 && j === out.length - 1) continue;
          const hit = segInt(out[i].x, out[i].y, out[i + 1].x, out[i + 1].y, out[j - 1].x, out[j - 1].y, out[j].x, out[j].y);
          if (!hit) continue;
          const x = out[i].x + (out[i + 1].x - out[i].x) * hit.t;
          const y = out[i].y + (out[i + 1].y - out[i].y) * hit.t;
          const s = out[i].s + dS(p, out[i].s, out[i + 1].s) * hit.t;
          const cp: BPt = { x, y, s, rec: { k: 3, a: out[i], b: out[i + 1], c: out[j - 1], d: out[j], t: hit.t } as BRec, s2: out[j - 1].s + dS(p, out[j - 1].s, out[j].s) * hit.u };
          const nrm = new Float64Array(4);
          foldNormal(out[i + 1].x - out[i].x, out[i + 1].y - out[i].y, sig, nrm, 0);
          foldNormal(out[j].x - out[j - 1].x, out[j].y - out[j - 1].y, sig, nrm, 2);
          cutN.set(cp, nrm);
          out = [...out.slice(0, i + 1), cp, ...out.slice(j)];
          diag.push(`fold ch${p.id} side${sig} at s=${sb.toFixed(2)}`);
          changed = true;
          break outer;
        }
      }
    }
  }
  if (!cutN.size) return out;
  // Each cut point that survived becomes its chevron: the first point keeps the cut's record (a
  // feature point), the rest are border points at the cut's s with their own feet.
  const res: BPt[] = [];
  for (const pt of out) {
    const nrm = cutN.get(pt);
    const k = nrm ? foldChevron(p, h, W, pt.x, pt.y, pt.s, nrm, 0, cfChev) : 0;
    if (k <= 0) { res.push(pt); continue; }
    // K1283 s8: s from the first leg's to the second's along the chevron (cutFoldsC says why).
    const ds = CF_S2 && pt.s2 !== undefined ? dS(p, pt.s, pt.s2) : 0;
    for (let r = 0; r < k; r++) {
      const sm = pt.s + (k > 1 ? (ds * r) / (k - 1) : 0); const s = CF_S2_PAINT ? sm : pt.s;
      res.push({ x: cfChev[4 * r], y: cfChev[4 * r + 1], s, rec: r === 0 ? pt.rec : { k: 6, s }, fx: cfChev[4 * r + 2], fy: cfChev[4 * r + 3], cv: r === 0 ? 1 : r === k - 1 ? 2 : 0, s2: r === 0 ? pt.s + ds : pt.s, sm });
    }
  }
  return res;
}

// ---------------------------------------------------------------------------
// The builder.

interface PtRef { pi: number; side: number; x: number; y: number; s: number; idx: number; rec?: BRec }
interface Ev { seg: number; t: number; ref: PtRef }
interface ArmInfo { ji: number; ei: number; pi: number; sR: number; dir: number; kind: string; ux: number; uy: number; ang: number; L: number; Lcut: number; g: number; idx: number }
interface CornerWork extends OutlineCorner { ji: number; aArm: number; bArm: number; sideA: number; sideB: number; sA: number; sB: number; dA: number; dB: number; refA: PtRef | null; refB: PtRef | null; refVA: PtRef | null; refVB: PtRef | null; vKa?: number; vKb?: number; qKa?: number; qKb?: number; vSa?: number; vSb?: number; meet?: boolean }
interface Station { pi: number; cS: number; left: PtRef; right: PtRef; kind: string; key: string }

export function buildOutline(scene: SceneIn): OutlineTable { return frame(structure(scene), scene); }
export function buildOutlineFull(scene: SceneIn, dg?: DiagramStructure | null, prof?: Record<string, number>): { table: OutlineTable; debug: Record<string, unknown>; structure: OutlineStructure } {
  const frameMode = !!dg;
  let profT = prof ? performance.now() : 0;
  const profMark = (key: string): void => { if (prof) { const now = performance.now(); prof[key] = (prof[key] ?? 0) + (now - profT); profT = now; } };
  const h = scene.look.halfWidth;
  const W = scene.look.band;
  const cr = scene.look.cuspRadius ?? 3;
  const diagnostics: string[] = [];
  const idxOf = new Map<number, number>();
  scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  const rawPolys: Poly[] = scene.chains.map((c, i) => makePoly(i, c.pts, c.closed));
  const origLen: number[] = rawPolys.map((p) => p.len);
  // END arms extended straight to c' on the through's centreline.
  const exts: { start?: [number, number]; end?: [number, number] }[] = rawPolys.map(() => ({}));
  const extSpec: { start?: { throughPi: number; throughS: number; armS: number }; end?: { throughPi: number; throughS: number; armS: number } }[] = rawPolys.map(() => ({}));
  for (const j of scene.junctions) {
    for (const arm of j.arms) {
      if (arm.kind !== "end") continue;
      const pi = idxOf.get(arm.chain);
      if (pi === undefined) continue;
      const p = rawPolys[pi];
      const term = pointAt(p, arm.s);
      let cp: [number, number] = [j.c[0], j.c[1]];
      let best = Infinity; let bestTi = -1; let bestTS = 0;
      for (const t of j.arms) {
        if (t.kind !== "through") continue;
        const ti = idxOf.get(t.chain);
        if (ti === undefined) continue;
        footInWindowInto(rawPolys[ti], term.x, term.y, t.s - 4 * h, t.s + 4 * h, kfFootR);
        // K1247 s16: blended across a concave vertex's bisector (footBlendInto).
        if (footBlendInto(rawPolys[ti], term.x, term.y, kfFootR[4], kfFootR[5], kfFootB)) { kfFootR[0] = kfFootB[0]; kfFootR[1] = kfFootB[1]; kfFootR[2] = kfFootB[2]; }
        const f = { d: kfFootR[0], x: kfFootR[1], y: kfFootR[2] };
        if (f.d < best) { best = f.d; cp = [f.x, f.y]; bestTi = ti; bestTS = t.s; }
      }
      if (Math.abs(arm.s - 0) < Math.abs(arm.s - p.len)) { exts[pi].start = cp; if (bestTi >= 0) extSpec[pi].start = { throughPi: bestTi, throughS: bestTS, armS: arm.s }; }
      else { exts[pi].end = cp; if (bestTi >= 0) extSpec[pi].end = { throughPi: bestTi, throughS: bestTS, armS: arm.s }; }
    }
  }
  const polys: Poly[] = scene.chains.map((c, i) => {
    const e = exts[i];
    if (!e.start && !e.end) return rawPolys[i];
    const pts = Array.from(c.pts);
    // K1247 s9 (cause 5): an end arm's first raw segment can be sub-pixel (0.035-0.6 px
    // seen); its direction then sets the joins at the root and swings under 0.01 px of
    // jitter (up to 2.7 px drawn). Drop the interior point of a terminal segment shorter
    // than 0.1 h: the terminal stays, arc lengths move only to second order.
    const endMin = 0.1 * h;
    if (e.start && pts.length >= 6 && Math.hypot(pts[2] - pts[0], pts[3] - pts[1]) < endMin) pts.splice(2, 2);
    if (e.end && pts.length >= 6) { const m = pts.length; if (Math.hypot(pts[m - 2] - pts[m - 4], pts[m - 1] - pts[m - 3]) < endMin) pts.splice(m - 4, 2); }
    let s0 = 0;
    if (e.start) {
      const d = Math.hypot(pts[0] - e.start[0], pts[1] - e.start[1]);
      if (d > 1e-9) { pts.unshift(e.start[0], e.start[1]); s0 = -d; }
    }
    if (e.end) {
      const m = pts.length;
      const d = Math.hypot(pts[m - 2] - e.end[0], pts[m - 1] - e.end[1]);
      if (d > 1e-9) pts.push(e.end[0], e.end[1]);
    }
    return makePoly(i, pts, c.closed, s0);
  });
  const nCh = polys.length;

  // Diagram depth: pinned hats (window in arc length).
  const depthWin = scene.look.depthWindow * (scene.look.ctrlArc ?? 1);
  interface PassInfo { s: number; theta: number; qi: number; sq: number; xi: number }
  const passes: PassInfo[][] = polys.map(() => []);
  const crossPt: { x: number; y: number; over: number; under: number; theta: number; sOver: number; sUnder: number }[] = [];
  scene.crossings.forEach((x, xi) => {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) return;
    const sa = normS(polys[ia], x.a.s); const sb = normS(polys[ib], x.b.s);
    const ta = tanAt(polys[ia], sa); const tb = tanAt(polys[ib], sb);
    const theta = Math.acos(Math.min(1, Math.abs(ta.tx * tb.tx + ta.ty * tb.ty)));
    passes[ia].push({ s: sa, theta, qi: ib, sq: sb, xi });
    passes[ib].push({ s: sb, theta, qi: ia, sq: sa, xi });
    const at = pointAt(polys[ia], sa);
    const over = x.over === "a" ? ia : ib;
    crossPt[xi] = { x: at.x, y: at.y, over, under: x.over === "a" ? ib : ia, theta, sOver: x.over === "a" ? sa : sb, sUnder: x.over === "a" ? sb : sa };
  });
  for (const l of passes) l.sort((a, b) => a.s - b.s);
  const depthPins: { s: number; z: number }[][] = polys.map(() => []);
  scene.crossings.forEach((x) => {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) return;
    const amp = scene.look.depthAmp;
    depthPins[ia].push({ s: normS(polys[ia], x.a.s), z: x.over === "a" ? amp : -amp });
    depthPins[ib].push({ s: normS(polys[ib], x.b.s), z: x.over === "b" ? amp : -amp });
  });
  for (const l of depthPins) l.sort((a, b) => a.s - b.s);
  const hatAt = (z: number, d: number, w: number): number => (w <= 1e-12 ? (d <= 0 ? z : 0) : d >= w ? 0 : z * (1 - d / w));
  const depthAt = (pi: number, s: number): number => {
    const P = depthPins[pi]; const n = P.length;
    if (n === 0) return 0;
    const p = polys[pi];
    const u = normS(p, s);
    let lo = -1; let hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].s <= u) lo = m; else hi = m; }
    if (p.closed) {
      const iL = lo < 0 ? n - 1 : lo;
      const sL = lo < 0 ? P[iL].s - p.len : P[iL].s;
      const iR = lo + 1 >= n ? 0 : lo + 1;
      const sR = lo + 1 >= n ? P[iR].s + p.len : P[iR].s;
      const w = Math.min(depthWin, sR - sL);
      return hatAt(P[iL].z, u - sL, w) + hatAt(P[iR].z, sR - u, w);
    }
    if (lo < 0) return hatAt(P[0].z, P[0].s - u, depthWin);
    if (lo + 1 >= n) return hatAt(P[n - 1].z, u - P[n - 1].s, depthWin);
    const w = Math.min(depthWin, P[lo + 1].s - P[lo].s);
    return hatAt(P[lo].z, u - P[lo].s, w) + hatAt(P[lo + 1].z, P[lo + 1].s - u, w);
  };

  // Junction groups: junctions joined by a run with no crossing between
  // their roots (form B's grouping), not merely by sharing a chain.
  const nj = scene.junctions.length;
  const parent = Array.from({ length: nj }, (_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  const armRootOf = (pi: number, a: SceneArmIn): { sR: number; dir: number } => {
    const p = polys[pi];
    if (a.kind === "end") {
      const atStart = Math.abs(a.s - 0) < Math.abs(a.s - origLen[pi]);
      return atStart ? { sR: p.s0, dir: 1 } : { sR: p.s0 + p.len, dir: -1 };
    }
    return { sR: normS(p, a.s), dir: a.dir };
  };
  const rootsOf = new Map<number, { s: number; ji: number }[]>();
  scene.junctions.forEach((j, ji) => {
    for (const a of j.arms) {
      const pi = idxOf.get(a.chain);
      if (pi === undefined) continue;
      const { sR } = armRootOf(pi, a);
      const l = rootsOf.get(pi) ?? [];
      if (!l.some((q) => Math.abs(q.s - sR) < 1e-9 && q.ji === ji)) l.push({ s: sR, ji });
      rootsOf.set(pi, l);
    }
  });
  rootsOf.forEach((roots, pi) => {
    const p = polys[pi];
    const r = roots.slice().sort((a, b) => a.s - b.s);
    const between = (a: number, b: number): boolean => {
      const len = b - a;
      for (const x of passes[pi]) {
        let u = x.s - a;
        if (p.closed) u = ((u % p.len) + p.len) % p.len;
        if (u > 1e-9 && u < len - 1e-9) return true;
      }
      return false;
    };
    for (let i = 0; i + 1 < r.length; i++) if (!between(r[i].s, r[i + 1].s)) parent[find(r[i].ji)] = find(r[i + 1].ji);
    if (p.closed && r.length > 1 && !between(r[r.length - 1].s, r[0].s + p.len)) parent[find(r[r.length - 1].ji)] = find(r[0].ji);
  });
  const gidOf = new Map<number, number>();
  const groupOfJ: number[] = scene.junctions.map((_, ji) => {
    const r = find(ji);
    if (!gidOf.has(r)) gidOf.set(r, gidOf.size);
    return gidOf.get(r)!;
  });

  // Arms and spans L: min of the next root, the chain's end, and each
  // crossing cut d - h*cot(theta/2) - h (F2's straight reach).
  const arms: ArmInfo[] = [];
  const pendArms: { ai: number; Lroot: number; uB: number }[] = [];
  const armsOfJ: number[][] = scene.junctions.map(() => []);
  const armsOfChain: number[][] = polys.map(() => []);
  scene.junctions.forEach((j, ji) => {
    j.arms.forEach((a, ei) => {
      const pi = idxOf.get(a.chain);
      if (pi === undefined) return;
      const p = polys[pi];
      const { sR, dir } = armRootOf(pi, a);
      const delta = (s: number): number => { let d = (s - sR) * dir; if (p.closed) d = ((d % p.len) + p.len) % p.len; return d; };
      let L = p.closed ? p.len : dir > 0 ? p.s0 + p.len - sR : sR - p.s0;
      for (const q of rootsOf.get(pi) ?? []) { const d = delta(q.s); if (d > 1e-9 && d < L) L = d; }
      let Lcut = Infinity;
      // F2/S1f quadratic reach: on curved threads the straight reach
      // h*cot(theta/2) is fitted to the threads' separation, so a shallow
      // crossing near a junction does not empty the arm's span.
      const quadReach = (x: PassInfo, dirA: number): number => {
        const pa = polys[pi]; const pq = polys[x.qi];
        const ta = tanAt(pa, x.s); const tb = tanAt(pq, x.sq);
        const sb = -dirA * (ta.tx * tb.tx + ta.ty * tb.ty) >= 0 ? 1 : -1;
        const aC = 2 * Math.sin(x.theta / 2);
        const T = 2 * h * Math.cos(x.theta / 2);
        const fl = 4 * h;
        const eA = pa.closed ? pa.len / 2 : dirA > 0 ? x.s - pa.s0 : pa.s0 + pa.len - x.s;
        let r = aC > 0 ? T / aC : Infinity;
        let e = fl;
        for (let k = 0; k < 2; k++) {
          const ek = Math.max(1e-6, Math.min(e, eA));
          const Apt = pointAt(pa, x.s - dirA * ek);
          const Bpt = pointAt(pq, x.sq + sb * ek);
          const g = Math.hypot(Apt.x - Bpt.x, Apt.y - Bpt.y);
          const kap = Math.max(0, (2 * (g - aC * ek)) / (ek * ek));
          r = (2 * T) / (aC + Math.sqrt(aC * aC + 2 * kap * T));
          e = Math.max(fl, r);
        }
        return r;
      };
      const reachOf = (x: PassInfo, dirA: number): number => {
        const t = Math.tan(x.theta / 2);
        let reach = t > 1e-12 ? h / t : Infinity;
        const fl = 4 * h;
        if (reach > fl) reach = Math.min(reach, Math.max(fl, quadReach(x, dirA)));
        return reach;
      };
      let uB = Infinity;
      for (const x of passes[pi]) {
        const d = delta(x.s);
        // A pass behind the root: its cut waits for the arm's corners
        // (form B's dEdgeTip rule, applied after every arm exists).
        const u = p.closed ? p.len - d : -d;
        if (p.closed || d < -1e-12) { if (u >= 0 && u < uB) uB = u; }
        if (d < -1e-12) continue;
        Lcut = Math.min(Lcut, d - reachOf(x, dir) - h);
      }
      const Lroot = L;
      L = Math.max(0, Math.min(L, Lcut));
      if (uB < Infinity) pendArms.push({ ai: arms.length, Lroot, uB });
      const sB = a.kind === "end" ? normS(p, a.s) : sR;
      const a0 = pointAt(p, sB);
      let s1 = sB + dir * 2 * h;
      if (!p.closed) s1 = Math.min(Math.max(s1, p.s0), p.s0 + p.len);
      const a1 = pointAt(p, s1);
      let ux = a1.x - a0.x; let uy = a1.y - a0.y;
      const ul = Math.hypot(ux, uy);
      if (ul < 1e-12) { ux = a0.tx * dir; uy = a0.ty * dir; } else { ux /= ul; uy /= ul; }
      const idx = arms.length;
      arms.push({ ji, ei, pi, sR, dir, kind: a.kind, ux, uy, ang: Math.atan2(uy, ux), L, Lcut, g: groupOfJ[ji], idx });
      armsOfJ[ji].push(idx);
      armsOfChain[pi].push(idx);
    });
  });
  for (const l of armsOfJ) l.sort((a, b) => arms[a].ang - arms[b].ang);
  // Form B's dEdgeTip behind cut: c = k*uB, k from the arm's corners.
  for (const pend of pendArms) {
    const A = arms[pend.ai];
    const list = armsOfJ[A.ji];
    const n = list.length;
    const at = list.indexOf(pend.ai);
    if (at < 0 || n < 2) continue;
    const J = scene.junctions[A.ji];
    let gMax = 0;
    for (const [a, b] of [[list[(at + n - 1) % n], pend.ai], [pend.ai, list[(at + 1) % n]]] as [number, number][]) {
      if (a === b) continue;
      const xa = J.arms[arms[a].ei]; const xb = J.arms[arms[b].ei];
      if (xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      let th = arms[b].ang - arms[a].ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th < Math.PI) gMax = Math.max(gMax, Math.tan((Math.PI - th) / 4));
    }
    const k = gMax > 0 ? Math.min(4, Math.max(1, 1 / gMax)) : 4;
    const c = k * pend.uB;
    if (c < A.Lcut) A.Lcut = c;
    A.L = Math.max(0, Math.min(pend.Lroot, A.Lcut));
  }
  const armDist = (arm: ArmInfo, s: number): number => {
    const p = polys[arm.pi];
    let d = (s - arm.sR) * arm.dir;
    if (p.closed) d = ((d % p.len) + p.len) % p.len;
    return d;
  };
  const memberGroup = (pi: number, s: number): number => {
    // Form B's member(): the arm whose cap ramp is largest there.
    let best = 0; let g = -1;
    for (const ai of armsOfChain[pi]) {
      const a = arms[ai];
      const d = armDist(a, s);
      if (d < 0 || d > a.L) continue;
      const t = ssFB(0, h, a.L - d);
      if (t > best) { best = t; g = a.g; }
    }
    return g;
  };

  // Borders, with folds cut inside their bends.
  const foldDiag: string[] = [];
  // A bend within h of an arm's root or of a kink's station stays uncut (cutFoldsC's rule).
  const foldKeep = polys.map((_p, pi) => [...(rootsOf.get(pi) ?? []).map((q) => q.s), ...passes[pi].filter((q) => q.qi === pi).map((q) => q.s)]);
  const borderRaw: Border[][] = polys.map((p, pi) => [
    { pi, side: 1, pts: cutFolds(p, buildBorder(p, 1, h), 1, h, W, foldKeep[pi], foldDiag), closed: p.closed },
    { pi, side: -1, pts: cutFolds(p, buildBorder(p, -1, h), -1, h, W, foldKeep[pi], foldDiag), closed: p.closed },
  ]);
  diagnostics.push(...foldDiag.slice(0, 20));
  const bIdx = (side: number): number => (side === 1 ? 0 : 1);
  const borders: Border[][] = borderRaw;
  // Events per border, applied in one rebuild so indices stay valid.
  const evs: Ev[][][] = borders.map((bs) => bs.map(() => []));
  const mkRef = (pi: number, side: number, x: number, y: number, s: number, rec?: BRec): PtRef => ({ pi, side, x, y, s, idx: -1, rec });
  const addEv = (pi: number, side: number, seg: number, t: number, ref: PtRef): void => {
    if (seg < 0) return;
    evs[pi][bIdx(side)].push({ seg, t: Math.min(1, Math.max(0, t)), ref });
  };
  // Locate a point known to lie on a border near foot s; add it.
  const addPointAt = (pi: number, side: number, x: number, y: number, sFoot: number, rec?: BRec): PtRef => {
    const B = borders[pi][bIdx(side)];
    const ref = mkRef(pi, side, x, y, sFoot, rec ?? { k: 6, s: sFoot });
    const pts = B.pts;
    const p = polys[pi];
    let lo = 0; let hi = pts.length - 1;
    const target = p.closed ? normS(p, sFoot) : sFoot;
    // pts.s is non-decreasing along the (linearised) border.
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid].s <= target) lo = mid; else hi = mid; }
    let bestSeg = Math.max(0, lo - 1); let bestT = 0; let bestD = Infinity;
    for (let i = Math.max(0, lo - 3); i < Math.min(pts.length - 1, lo + 4); i++) {
      const ax = pts[i].x; const ay = pts[i].y;
      const ex = pts[i + 1].x - ax; const ey = pts[i + 1].y - ay;
      const l2 = ex * ex + ey * ey;
      let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
      t = Math.min(1, Math.max(0, t));
      const d = Math.hypot(ax + ex * t - x, ay + ey * t - y);
      if (d < bestD) { bestD = d; bestSeg = i; bestT = t; }
    }
    addEv(pi, side, bestSeg, bestT, ref);
    return ref;
  };
  const footArm = (arm: ArmInfo, x: number, y: number, estD?: number): { d: number; x: number; y: number; s: number } => {
    const p = polys[arm.pi];
    let d0 = 0; let d1 = arm.L;
    if (estD !== undefined && Number.isFinite(estD)) { d0 = Math.max(0, estD - 4 * h); d1 = Math.min(arm.L, estD + 4 * h); if (d1 - d0 < 1e-9) { d0 = 0; d1 = arm.L; } }
    const lo = arm.dir > 0 ? arm.sR + d0 : arm.sR - d1;
    const hi = arm.dir > 0 ? arm.sR + d1 : arm.sR - d0;
    return footInWindow(p, x, y, lo, hi);
  };
  const solveEq = (A: ArmInfo, B: ArmInfo, rho: number, x0: number, y0: number, estD?: number, cx?: number, cy?: number): { x: number; y: number; fa: { d: number; x: number; y: number; s: number }; fb: { d: number; x: number; y: number; s: number }; ok: boolean } => {
    let x = x0; let y = y0;
    let fa = footArm(A, x, y, estD); let fb = footArm(B, x, y, estD);
    for (let it = 0; it < 40; it++) {
      const Fa = fa.d - rho; const Fb = fb.d - rho;
      if (Math.abs(Fa) < 1e-12 * Math.max(1, rho) && Math.abs(Fb) < 1e-12 * Math.max(1, rho)) return { x, y, fa, fb, ok: true };
      if (!(fa.d > 1e-12 && fb.d > 1e-12)) break;
      const gax = (x - fa.x) / fa.d; const gay = (y - fa.y) / fa.d;
      const gbx = (x - fb.x) / fb.d; const gby = (y - fb.y) / fb.d;
      const det = gax * gby - gay * gbx;
      if (Math.abs(det) < 1e-12) break;
      let dx = (-Fa * gby + Fb * gay) / det;
      let dy = (-Fb * gax + Fa * gbx) / det;
      const dl = Math.hypot(dx, dy);
      if (dl > h) { dx *= h / dl; dy *= h / dl; }
      x += dx; y += dy;
      fa = footArm(A, x, y, estD); fb = footArm(B, x, y, estD);
    }
    const ok = Math.abs(fa.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(fb.d - rho) < 1e-9 * Math.max(h, rho);
    if (ok) return { x, y, fa, fb, ok };
    // K1247 s9: plain Newton from a far guess can wander and land on V or
    // not by chance (muse_hash cycle frame 10 corner 299: V at step 25 still,
    // a 2-cycle under 0.01 px). On a failure, plain Newton again from points
    // on the line from the junction through the guess, nearest first; the
    // first that converges is V (solveVC does the same).
    if (cx === undefined || cy === undefined) return { x, y, fa, fb, ok };
    for (let m = 1; m <= 8; m++) {
      if (m === 4) continue;
      x = cx + ((x0 - cx) * m) / 4; y = cy + ((y0 - cy) * m) / 4;
      fa = footArm(A, x, y, estD); fb = footArm(B, x, y, estD);
      for (let it = 0; it < 40; it++) {
        const Fa = fa.d - rho; const Fb = fb.d - rho;
        if (Math.abs(Fa) < 1e-12 * Math.max(1, rho) && Math.abs(Fb) < 1e-12 * Math.max(1, rho)) break;
        if (!(fa.d > 1e-12 && fb.d > 1e-12)) break;
        const gax = (x - fa.x) / fa.d; const gay = (y - fa.y) / fa.d;
        const gbx = (x - fb.x) / fb.d; const gby = (y - fb.y) / fb.d;
        const det = gax * gby - gay * gbx;
        if (Math.abs(det) < 1e-12) break;
        let dx = (-Fa * gby + Fb * gay) / det;
        let dy = (-Fb * gax + Fa * gbx) / det;
        const dl = Math.hypot(dx, dy);
        if (dl > h) { dx *= h / dl; dy *= h / dl; }
        x += dx; y += dy;
        fa = footArm(A, x, y, estD); fb = footArm(B, x, y, estD);
      }
      if (Math.abs(fa.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(fb.d - rho) < 1e-9 * Math.max(h, rho)) return { x, y, fa, fb, ok: true };
    }
    return { x, y, fa, fb, ok: false };
  };

  // Corners (F2): V, r0, fit by room, q, tangent points.
  const corners: OutlineCorner[] = [];
  const cornerWork: CornerWork[] = [];
  // Per arm, its corner point on each side: armPt[armIdx] = {prev, next}
  // where prev is the corner with the previous arm in angular order.
  const armNextPt: (PtRef | null)[] = arms.map(() => null);
  const armPrevPt: (PtRef | null)[] = arms.map(() => null);
  const armNextSide: number[] = arms.map(() => 0);
  const armPrevSide: number[] = arms.map(() => 0);
  const trimIntervals: { pi: number; side: number; sR: number; dir: number; dEnd: number }[] = [];
  profMark("setupBorders");
  // Corner pairs: in frame mode the diagram's pairs (every adjacent pair
  // in the junction's listed cyclic order, through passes excluded);
  // otherwise the builder's angular pairs with its skips, as before.
  const cornerPairs: { ji: number; ai: number; bi: number; style: number; thru?: 1 }[] = [];
  if (frameMode) {
    for (const dc of dg!.corners) cornerPairs.push({ ji: dc.ji, ai: dc.aArm, bi: dc.bArm, style: dc.style, thru: dc.thru });
  } else {
    scene.junctions.forEach((j, ji) => {
      const list = armsOfJ[ji];
      const n = list.length;
      if (n < 2) return;
      const styles = j.corners ?? [];
      const ne = j.arms.length;
      for (let i = 0; i < n; i++) {
        const ai = list[i]; const bi = list[(i + 1) % n];
        const A = arms[ai]; const B = arms[bi];
        let th = B.ang - A.ang;
        th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
        const xa = j.arms[A.ei]; const xb = j.arms[B.ei];
        if (xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
        let st = styles[A.ei]?.style;
        if ((A.ei + 1) % ne !== B.ei && (B.ei + 1) % ne === A.ei) st = styles[B.ei]?.style;
        cornerPairs.push({ ji, ai, bi, style: st === "sharp" ? 0 : 1 });
      }
    });
  }
  // Frame mode, a corner with no feasible V in this frame: V on the
  // wedge bisector at h, radius 0, tangent points on the arms' borders
  // at their roots (points on the outline), no trim. The arc piece
  // collapses onto the first tangent point; nothing switches.
  // S3f (Claude): form B has no corner there either (its solveCorner
  // fails alike), so its outline is the union boundary of the two
  // tubes, whose corner is where the two facing borders cross. Find
  // that crossing within a fixed window of each arm's root (signed
  // chain distance in [-h, 14h], not the frame's arm spans), the one
  // nearest the roots; both arms' runs end there. Same chain and side
  // (a through chain's straight side) has no crossing: its border runs
  // on through the root.
  type Meet = { x: number; y: number; segA: number; tA: number; sA: number; dA: number; segB: number; tB: number; sB: number; dB: number };
  const borderMeet = (A: ArmInfo, sideA: number, B: ArmInfo, sideB: number): Meet | null => {
    if (A.pi === B.pi && sideA === sideB) return null;
    const lo = -h; const hi = 14 * h;
    const dSigned = (arm: ArmInfo, s: number): number => {
      const p = polys[arm.pi];
      let d = (s - arm.sR) * arm.dir;
      if (p.closed && p.len > 0) { d = ((d % p.len) + p.len) % p.len; if (d > p.len / 2) d -= p.len; }
      return d;
    };
    const segsOf = (arm: ArmInfo, side: number): number[] => {
      const pts = borders[arm.pi][bIdx(side)].pts;
      const half = polys[arm.pi].len / 2;
      const out: number[] = [];
      for (let i = 0; i + 1 < pts.length; i++) {
        const d0 = dSigned(arm, pts[i].s); const d1 = dSigned(arm, pts[i + 1].s);
        if (Math.abs(d1 - d0) > half) continue;
        if (Math.max(d0, d1) >= lo && Math.min(d0, d1) <= hi) out.push(i);
      }
      return out;
    };
    const PA = borders[A.pi][bIdx(sideA)].pts; const PB = borders[B.pi][bIdx(sideB)].pts;
    const sa = segsOf(A, sideA); const sb = segsOf(B, sideB);
    let best: Meet | null = null; let bestD = Infinity;
    for (const i of sa) {
      const a0 = PA[i]; const a1 = PA[i + 1];
      for (const k of sb) {
        const b0 = PB[k]; const b1 = PB[k + 1];
        const hit = segInt(a0.x, a0.y, a1.x, a1.y, b0.x, b0.y, b1.x, b1.y);
        if (!hit) continue;
        let sAh = lerpS(polys[A.pi], a0.sm ?? a0.s, a1.sm ?? a1.s, hit.t); let sBh = lerpS(polys[B.pi], b0.sm ?? b0.s, b1.sm ?? b1.s, hit.u);
        let dA = dSigned(A, sAh); let dB = dSigned(B, sBh);
        if (MEET_MIRROR) {
          // K1283 s8: borderMeetC's cut mirror (cutMirrorS).
          const mir = (p: Poly, q0: BPt, q1: BPt, s: number): number => q1.cv === 1 ? q1.s2! - dS(p, s, q1.sm ?? q1.s) : q0.cv === 2 ? q0.s2! + dS(p, q0.sm ?? q0.s, s) : s;
          const mA = mir(polys[A.pi], a0, a1, sAh);
          if (mA !== sAh) { const d = dSigned(A, mA); if (d >= lo && d <= hi && (d < dA || dA < lo || dA > hi)) { sAh = mA; dA = d; } }
          const mB = mir(polys[B.pi], b0, b1, sBh);
          if (mB !== sBh) { const d = dSigned(B, mB); if (d >= lo && d <= hi && (d < dB || dB < lo || dB > hi)) { sBh = mB; dB = d; } }
        }
        if (dA < lo || dA > hi || dB < lo || dB > hi) continue;
        if (dA + dB < bestD) {
          bestD = dA + dB;
          best = { x: a0.x + (a1.x - a0.x) * hit.t, y: a0.y + (a1.y - a0.y) * hit.t, segA: i, tA: hit.t, sA: sAh, dA, segB: k, tB: hit.u, sB: sBh, dB };
        }
      }
    }
    return best;
  };
  const cornerFallback = (cw: CornerWork, A: ArmInfo, B: ArmInfo, th: number): void => {
    const j = scene.junctions[cw.ji];
    const mt = borderMeet(A, cw.sideA, B, cw.sideB);
    if (mt) {
      // S3f (Levi's rule): no union-or-layered choice. Each facing border
      // ends at its own station, between the meet and its root, a
      // continuous fraction w of the way: w = clamp((z_self - z_other) /
      // zt, 0, 1) at the meet, where form B's depth key lets the upper
      // border run on over the lower tube. w = 0 (level, or the lower
      // arm) is the meet itself, the union's corner; w = 1 runs the
      // border on to the root, except that form B hides it where both
      // arms are full members of the junction's group: each border stops
      // at the nearer cap, the ramp's midpoint (min(L, Lcut - h/2)) as a
      // fraction of each arm's meet distance, so the station sits at
      // max(1 - w, rCap) of the meet's distance. The same pieces every
      // frame; only the two station points move.
      const ci = cornerWork.length;
      const zt = 0.1 * scene.look.depthAmp;
      const zA = depthAt(A.pi, mt.sA); const zB = depthAt(B.pi, mt.sB);
      const wA = zt > 0 ? Math.min(1, Math.max(0, (zA - zB) / zt)) : 0;
      const wB = zt > 0 ? Math.min(1, Math.max(0, (zB - zA) / zt)) : 0;
      const eOf = (arm: ArmInfo, side: number, sM: number, w: number): { x: number; y: number; s: number } => {
        const Bd = borders[arm.pi][bIdx(side)];
        const p = polys[arm.pi];
        let ds = arm.sR - sM;
        if (p.closed && p.len > 0) ds = ((((ds + p.len / 2) % p.len) + p.len) % p.len) - p.len / 2;
        let sAt = sM + ds * w;
        if (p.closed) sAt = normS(p, sAt);
        let target = sAt;
        if (p.closed && target < Bd.pts[0].s - 1e-9) target += p.len;
        let lo = 0; let hi = Bd.pts.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (Bd.pts[mid].s <= target) lo = mid; else hi = mid; }
        const a = Bd.pts[lo]; const b = Bd.pts[Math.min(Bd.pts.length - 1, lo + 1)];
        const dss = b.s - a.s;
        const t = dss > 1e-12 ? Math.min(1, Math.max(0, (target - a.s) / dss)) : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: sAt };
      };
      const capOf = (X: ArmInfo): number => Math.max(0, Number.isFinite(X.Lcut) ? Math.min(X.L, X.Lcut - 0.5 * h) : X.L);
      const rCap = Math.min(1, Math.max(0, Math.min(mt.dA > 1e-12 ? capOf(A) / mt.dA : 1, mt.dB > 1e-12 ? capOf(B) / mt.dB : 1)));
      // K1247 s10: a meet just past a span's end is the ok corner's r = 0
      // V at the end, so the stations ramp in over 0.5 h past it.
      const ramp = cw.why === "V outside spans" ? spanRamp(mt.dA - A.L, mt.dB - B.L, h) : 1;
      const gA = Math.min(wA, 1 - rCap) * ramp; const gB = Math.min(wB, 1 - rCap) * ramp;
      const ea = eOf(A, cw.sideA, mt.sA, gA); const eb = eOf(B, cw.sideB, mt.sB, gB);
      // K1240 S3f r4: w = 0 is the meet itself. The border's point at the
      // meet's s is not always the meet: on the outer side of a sharp bend
      // many border points share one s (g41_ring_tw42 j12, 0.064 off, the
      // 3.45 px spike), so each station carries the meet's offset from it,
      // fading out as the station runs on to the root (continuous in g).
      { const a0 = eOf(A, cw.sideA, mt.sA, 0); const b0 = eOf(B, cw.sideB, mt.sB, 0);
        ea.x += (mt.x - a0.x) * (1 - gA); ea.y += (mt.y - a0.y) * (1 - gA);
        eb.x += (mt.x - b0.x) * (1 - gB); eb.y += (mt.y - b0.y) * (1 - gB); }
      cw.Vx = mt.x; cw.Vy = mt.y; cw.qx = mt.x; cw.qy = mt.y; cw.r = 0; cw.meet = true;
      cw.tax = ea.x; cw.tay = ea.y; cw.sA = ea.s; cw.dA = mt.dA * (1 - gA);
      cw.tbx = eb.x; cw.tby = eb.y; cw.sB = eb.s; cw.dB = mt.dB * (1 - gB);
      cw.refA = addPointAt(A.pi, cw.sideA, ea.x, ea.y, ea.s, { k: 5, corner: ci, which: 0 });
      cw.refB = addPointAt(B.pi, cw.sideB, eb.x, eb.y, eb.s, { k: 5, corner: ci, which: 1 });
      cw.refVA = cw.refA; cw.refVB = cw.refB;
      armNextPt[cw.aArm] = cw.refA; armNextSide[cw.aArm] = cw.sideA;
      armPrevPt[cw.bArm] = cw.refB; armPrevSide[cw.bArm] = cw.sideB;
      return;
    }
    // No meet: the V at the junction, with both tangent points at the roots.
    let mx = A.ux + B.ux; let my = A.uy + B.uy;
    const ml = Math.sqrt(mx * mx + my * my);
    if (ml < 1e-9 || th > Math.PI) { const ma = Math.atan2(A.uy, A.ux) + th / 2; mx = Math.cos(ma); my = Math.sin(ma); } else { mx /= ml; my /= ml; }
    const Vx = j.c[0] + mx * h; const Vy = j.c[1] + my * h;
    cw.Vx = Vx; cw.Vy = Vy; cw.qx = Vx; cw.qy = Vy; cw.r = 0;
    const bpOf = (arm: ArmInfo, side: number, d: number): { x: number; y: number; s: number } => {
      // On the border polyline (interpolated at the arm's s = root +
      // dir*d), so the inserted point never spikes the border.
      const B = borders[arm.pi][bIdx(side)];
      const p = polys[arm.pi];
      let sAt = arm.sR + arm.dir * d;
      if (p.closed) sAt = normS(p, sAt); else sAt = Math.min(p.s0 + p.len, Math.max(p.s0, sAt));
      let target = sAt;
      if (p.closed && target < B.pts[0].s - 1e-9) target += p.len;
      let lo = 0; let hi = B.pts.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (B.pts[mid].s <= target) lo = mid; else hi = mid; }
      const a = B.pts[lo]; const b = B.pts[Math.min(B.pts.length - 1, lo + 1)];
      const ds = b.s - a.s;
      const t = ds > 1e-12 ? Math.min(1, Math.max(0, (target - a.s) / ds)) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: d > 0 ? sAt : arm.sR };
    };
    // K1283 s8: each station where its border comes out of the other arm's fill (buriedReach).
    const dOf = (arm: ArmInfo, side: number, o: ArmInfo): number => {
      if (!NOMEET_BURY || o.pi === arm.pi) return 0;
      const p = polys[arm.pi];
      const sAt = (d: number): number => (p.closed ? normS(p, arm.sR + arm.dir * d) : arm.sR + arm.dir * d);
      return buriedReach(p, sAt, arm.L, polys[o.pi], o.sR, h, W, (dd, out) => { const q = bpOf(arm, side, dd); out[0] = q.x; out[1] = q.y; });
    };
    const dTa = dOf(A, cw.sideA, B); const dTb = dOf(B, cw.sideB, A);
    const pa = bpOf(A, cw.sideA, dTa); const pb = bpOf(B, cw.sideB, dTb);
    cw.tax = pa.x; cw.tay = pa.y; cw.tbx = pb.x; cw.tby = pb.y; cw.sA = pa.s; cw.sB = pb.s; cw.dA = dTa; cw.dB = dTb;
    cw.refA = addPointAt(A.pi, cw.sideA, pa.x, pa.y, pa.s, { k: 5, corner: cornerWork.length, which: 0 });
    cw.refB = addPointAt(B.pi, cw.sideB, pb.x, pb.y, pb.s, { k: 5, corner: cornerWork.length, which: 1 });
    cw.refVA = cw.refA; cw.refVB = cw.refB;
    if (frameMode) {
      armNextPt[cw.aArm] = cw.refA; armNextSide[cw.aArm] = cw.sideA;
      armPrevPt[cw.bArm] = cw.refB; armPrevSide[cw.bArm] = cw.sideB;
    }
  };
  // K1314 s3: a through pass's corner that cannot round is dead, as
  // cornersPhaseC's cornerDeadThruC: no refs (the stations' root points).
  const thruDead = (cw: CornerWork, jx: number, jy: number, sA: number, sB: number): void => {
    cw.why = `through: ${cw.why ?? ""}`; cw.ok = false; cw.r = 0;
    cw.Vx = jx; cw.Vy = jy; cw.qx = jx; cw.qy = jy; cw.tax = jx; cw.tay = jy; cw.tbx = jx; cw.tby = jy;
    cw.sA = sA; cw.sB = sB; cw.dA = 0; cw.dB = 0;
  };
  for (const cp of cornerPairs) {
      const ji = cp.ji; const j = scene.junctions[ji];
      const ai = cp.ai; const bi = cp.bi;
      const A = arms[ai]; const B = arms[bi];
      const style = cp.style;
      let th = B.ang - A.ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const cross = A.ux * B.uy - A.uy * B.ux;
      // S3f run 3: in frame mode the facing sides are the diagram's. The
      // listed order is counter-clockwise, so a corner faces A's
      // counter-clockwise side and B's clockwise side whatever this
      // frame's sweep; the sign of cross flipped both past pi, onto the
      // borders the junction's other corner already joins.
      const sideA = frameMode ? A.dir : (cross > 0 ? 1 : -1) * A.dir;
      const sideB = frameMode ? -B.dir : (cross > 0 ? -1 : 1) * B.dir;
      const cw: CornerWork = {
        junction: j.id, aChain: A.pi, bChain: B.pi, ok: false, style, theta: th, r: 0,
        Vx: NaN, Vy: NaN, qx: NaN, qy: NaN, tax: NaN, tay: NaN, tbx: NaN, tby: NaN,
        ji, aArm: ai, bArm: bi, sideA, sideB, sA: 0, sB: 0, dA: 0, dB: 0, refA: null, refB: null, refVA: null, refVB: null,
      };
      const baseIdx = corners.length;
      void baseIdx;
      if (!(A.L > 1e-9 && B.L > 1e-9)) { cw.why = "arm span 0"; if (cp.thru) thruDead(cw, j.c[0], j.c[1], A.sR, B.sR); else if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); continue; }
      // A reflex sweep: the facing borders part behind the roots, so the
      // corner is their meet there (or the roots), never a fillet.
      if (frameMode && (th > Math.PI || (cp.thru && th >= Math.PI))) { cw.why = "reflex"; if (cp.thru) thruDead(cw, j.c[0], j.c[1], A.sR, B.sR); else cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); continue; }
      // A pair's wedge is the minor sweep between its arms (the
      // junction's other corners take the rest of the circle), so a
      // pair listed past pi still corners on its minor side; thC is
      // continuous through pi.
      const thC = frameMode && th > Math.PI ? 2 * Math.PI - th : th;
      let bx = A.ux + B.ux; let by = A.uy + B.uy;
      const bl = Math.sqrt(bx * bx + by * by) || 1; bx /= bl; by /= bl;
      const sn = Math.sin(thC / 2) || 1;
      const V = solveEq(A, B, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, h / Math.max(Math.tan(thC / 2), 1e-6), j.c[0], j.c[1]);
      if (!V.ok) { cw.why = "no V"; if (cp.thru) thruDead(cw, j.c[0], j.c[1], A.sR, B.sR); else if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); if (!frameMode) diagnostics.push(`corner ${j.id}: no V`); continue; }
      const dVa = armDist(A, V.fa.s); const dVb = armDist(B, V.fb.s);
      const tol = 1e-9 * h;
      if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) { cw.why = "V outside spans"; if (cp.thru) thruDead(cw, j.c[0], j.c[1], A.sR, B.sR); else if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); continue; }
      const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
      const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
      const sgn = Math.sign(cross) || 1;
      if (!(crossA * sgn > 0 && crossB * sgn < 0)) { cw.why = "V outside wedge"; if (cp.thru) thruDead(cw, j.c[0], j.c[1], A.sR, B.sR); else if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); continue; }
      cw.Vx = V.x; cw.Vy = V.y; cw.ok = true;
      const t2 = Math.tan(thC / 2);
      const r0 = style * (cr / 3) * Math.min(2 * h, 1.5 * h * t2);
      // Form B's tracked ball: the ball grows along V's branch of the
      // medial axis with its feet tracked, and r is the integral of the
      // gates (margin, steep, cap, root) over that growth, so r and q
      // are the reference's own, not a one-shot Newton from V.
      const pa = polys[A.pi]; const pb = polys[B.pi];
      const winA: [number, number] = A.dir > 0 ? [A.sR, A.sR + A.L] : [A.sR - A.L, A.sR];
      const winB: [number, number] = B.dir > 0 ? [B.sR, B.sR + B.L] : [B.sR - B.L, B.sR];
      type TF = { d: number; x: number; y: number; s: number; k: number; u: number };
      type TK = { x: number; y: number; fa: TF; fb: TF };
      const footT = (pl: Poly, win: [number, number], x: number, y: number, s0: number): TF => {
        const w = h / 32;
        let s = Math.min(Math.max(s0, win[0]), win[1]);
        for (let it = 0; ; it++) {
          const lo = Math.max(win[0], s - w);
          const hi = Math.min(win[1], s + w);
          const f = footInWindow(pl, x, y, lo, hi);
          const u = s + dS(pl, s, f.s);
          const edge = (u <= lo + 1e-9 * h && lo > win[0]) || (u >= hi - 1e-9 * h && hi < win[1]);
          if (!edge || it >= 4096 || Math.abs(u - s) <= 1e-12 * h) return { ...f, u };
          s = u;
        }
      };
      const newtonT = (rho: number, x0: number, y0: number, uA: number, uB: number, limit: number): TK & { ok: boolean } => {
        let x = x0; let y = y0;
        let fA = footT(pa, winA, x, y, uA);
        let fB = footT(pb, winB, x, y, uB);
        for (let it = 0; it < 60; it++) {
          const ra = fA.d - rho; const rb = fB.d - rho;
          if (Math.abs(ra) < 1e-12 * Math.max(1, rho) && Math.abs(rb) < 1e-12 * Math.max(1, rho)) break;
          if (!(fA.d > 1e-12 && fB.d > 1e-12)) break;
          const nax = (x - fA.x) / fA.d; const nay = (y - fA.y) / fA.d;
          const nbx = (x - fB.x) / fB.d; const nby = (y - fB.y) / fB.d;
          const det = nax * nby - nay * nbx;
          if (Math.abs(det) < 1e-12) break;
          let dx = (-ra * nby + rb * nay) / det;
          let dy = (-nax * rb + nbx * ra) / det;
          const dl = Math.hypot(dx, dy);
          if (dl > limit) { dx *= limit / dl; dy *= limit / dl; }
          x += dx; y += dy;
          fA = footT(pa, winA, x, y, fA.u);
          fB = footT(pb, winB, x, y, fB.u);
        }
        const ok = Math.max(Math.abs(fA.d - rho), Math.abs(fB.d - rho)) < 1e-9 * Math.max(1, rho);
        return { x, y, fa: fA, fb: fB, ok };
      };
      const advance = (from: TK, rho0: number, rhoT: number, st0: number): { p: TK; rho: number } => {
        let p = from; let rc = rho0; let st = st0;
        while (rhoT - rc > 1e-12 * rhoT) {
          const rn = Math.min(rhoT, rc + st);
          const dd = rn - rc;
          const nax = (p.x - p.fa.x) / p.fa.d; const nay = (p.y - p.fa.y) / p.fa.d;
          const nbx = (p.x - p.fb.x) / p.fb.d; const nby = (p.y - p.fb.y) / p.fb.d;
          const den = 1 + nax * nbx + nay * nby;
          let next: TK | null = null;
          if (den > 1e-9) {
            const ux = (nax + nbx) / den; const uy = (nay + nby) / den;
            const gx = p.x + ux * dd; const gy = p.y + uy * dd;
            const acc = Math.min(h, Math.max(0.5 * Math.sqrt(ux * ux + uy * uy) * dd, 1e-3 * h));
            const nn = newtonT(rn, gx, gy, p.fa.u, p.fb.u, acc);
            if (nn.ok && Math.hypot(nn.x - gx, nn.y - gy) <= acc) next = nn;
          }
          if (next) { p = next; rc = rn; st = Math.min(st0, 2 * st); }
          else { st /= 2; if (st < 1e-5 * h) break; }
        }
        return { p, rho: rhoT - rc <= 1e-12 * rhoT ? rhoT : rc };
      };
      const denOf = (p: TK): number => 1 + ((p.x - p.fa.x) * (p.x - p.fb.x) + (p.y - p.fa.y) * (p.y - p.fb.y)) / (p.fa.d * p.fb.d);
      const slackOf = (p: TK): number => Math.min(A.L - W - (p.fa.u - A.sR) * A.dir, B.L - W - (p.fb.u - B.sR) * B.dir);
      const segB = (pl: Poly, k: number): number => (k + 1 === pl.n ? 0 : k + 1);
      const marginOf = (pl: Poly, x: number, y: number, sf: number, win: [number, number], dc: number): number => {
        const f0 = pointAt(pl, sf);
        const base = sf - normS(pl, sf);
        let hi = win[1];
        let k = f0.k; let bk = base;
        for (let it = 0; it <= pl.nseg; it++) {
          const sv = bk + pl.s[k] + pl.segLen[k];
          if (sv >= win[1]) break;
          let k2 = k + 1; let b2 = bk;
          if (k2 >= pl.nseg) { if (!pl.closed) break; k2 = 0; b2 = bk + pl.len; }
          const e = segB(pl, k2);
          if ((pl.x[k2] - x) * (pl.x[e] - pl.x[k2]) + (pl.y[k2] - y) * (pl.y[e] - pl.y[k2]) < 0) { hi = sv; break; }
          k = k2; bk = b2;
        }
        let lo = win[0];
        k = f0.k; bk = base;
        for (let it = 0; it <= pl.nseg; it++) {
          const sv = bk + pl.s[k];
          if (sv <= win[0]) break;
          let k2 = k - 1; let b2 = bk;
          if (k2 < 0) { if (!pl.closed) break; k2 = pl.nseg - 1; b2 = bk - pl.len; }
          if ((pl.x[k] - x) * (pl.x[k2] - pl.x[k]) + (pl.y[k] - y) * (pl.y[k2] - pl.y[k]) < 0) { lo = sv; break; }
          k = k2; bk = b2;
        }
        let d2 = Infinity;
        if (lo > win[0]) d2 = footInWindow(pl, x, y, win[0], lo).d;
        if (hi < win[1]) d2 = Math.min(d2, footInWindow(pl, x, y, hi, win[1]).d);
        return d2 - dc;
      };
      const rbEff = Math.max(0.5 * h * rootTipScale(thC), 1e-9 * h);
      const v0: TK = { x: V.x, y: V.y, fa: { ...V.fa, u: A.sR + A.dir * dVa } as TF, fb: { ...V.fb, u: B.sR + B.dir * dVb } as TF };
      const denV = denOf(v0);
      const wOf = (p: TK): number => {
        const mA = marginOf(pa, p.x, p.y, p.fa.u, winA, p.fa.d);
        const mB = marginOf(pb, p.x, p.y, p.fb.u, winB, p.fb.d);
        const w = ssFB(0, 1, 1 + Math.min(0, mA, mB) / (0.05 * h)) * ssFB(0, 1, (denOf(p) / denV - 0.3) / 0.4) * ssFB(0, 1, slackOf(p) / (0.5 * h));
        return w * ssFB(0, 1, ((p.fa.u - A.sR) * A.dir) / rbEff) * ssFB(0, 1, ((p.fb.u - B.sR) * B.dir) / rbEff);
      };
      let r = 0;
      let q: TK = v0;
      if (r0 > 0) {
        const dN = r0 / 32;
        const nodes: TK[] = [v0];
        let sPrev = wOf(v0);
        let integ = 0;
        for (let k = 1; k <= 32 && sPrev > 0; k++) {
          const rho0 = h + (k - 1) * dN;
          const adv = advance(nodes[k - 1], rho0, h + k * dN, dN);
          const sK = Math.min(sPrev, wOf(adv.p));
          integ += 0.5 * (sPrev + sK) * (adv.rho - rho0);
          if (adv.rho < h + k * dN) break;
          nodes.push(adv.p);
          sPrev = sK;
        }
        const k0 = Math.min(nodes.length - 1, Math.floor(integ / dN));
        const adv = advance(nodes[k0], h + k0 * dN, h + integ, dN);
        q = adv.p;
        r = adv.rho - h;
      }
      cw.qx = q.x; cw.qy = q.y;
      let tax = V.x; let tay = V.y; let tbx = V.x; let tby = V.y;
      let sA = V.fa.s; let sB = V.fb.s; let dA = dVa; let dB = dVb;
      if (r > 1e-9) {
        tax = q.fa.x + (h * (q.x - q.fa.x)) / q.fa.d; tay = q.fa.y + (h * (q.y - q.fa.y)) / q.fa.d;
        tbx = q.fb.x + (h * (q.x - q.fb.x)) / q.fb.d; tby = q.fb.y + (h * (q.y - q.fb.y)) / q.fb.d;
        sA = q.fa.s; sB = q.fb.s;
        dA = (q.fa.u - A.sR) * A.dir; dB = (q.fb.u - B.sR) * B.dir;
      }
      cw.r = r; cw.vKa = (V.fa as TF).k; cw.vKb = (V.fb as TF).k; cw.qKa = q.fa.k; cw.qKb = q.fb.k; cw.vSa = V.fa.s; cw.vSb = V.fb.s;
      cw.tax = tax; cw.tay = tay; cw.tbx = tbx; cw.tby = tby;
      cw.sA = sA; cw.sB = sB; cw.dA = dA; cw.dB = dB;
      if (r > 1e-9) {
        cw.refA = addPointAt(A.pi, sideA, tax, tay, sA, { k: 5, corner: cornerWork.length, which: 0 });
        cw.refB = addPointAt(B.pi, sideB, tbx, tby, sB, { k: 5, corner: cornerWork.length, which: 1 });
      } else {
        cw.refA = addPointAt(A.pi, sideA, V.x, V.y, sA, { k: 5, corner: cornerWork.length, which: 0 });
        cw.refB = addPointAt(B.pi, sideB, V.x, V.y, sB, { k: 5, corner: cornerWork.length, which: 1 });
      }
      cw.refVA = cw.refA; cw.refVB = cw.refB;
      armNextPt[ai] = cw.refA; armNextSide[ai] = sideA;
      armPrevPt[bi] = cw.refB; armPrevSide[bi] = sideB;
      trimIntervals.push({ pi: A.pi, side: sideA, sR: A.sR, dir: A.dir, dEnd: r > 1e-9 ? dA : dVa });
      trimIntervals.push({ pi: B.pi, side: sideB, sR: B.sR, dir: B.dir, dEnd: r > 1e-9 ? dB : dVb });
      corners.push(cw);
      cornerWork.push(cw);
  }

  profMark("corners");
  // Crossings: intersect the under's borders with the over's near each
  // crossing, starting from the crossing's s on each chain.
  const cuts: OutlineCut[] = [];
  const cutRefs: { border: number; ref: PtRef }[] = [];
  const stations: Station[] = [];
  const stationByKey = new Map<string, Station>();
  const crossPairs: [Station, Station][] = [];
  const addStation = (st: Station): Station => {
    const ex = stationByKey.get(st.key);
    if (ex) return ex;
    stationByKey.set(st.key, st);
    stations.push(st);
    return st;
  };
  const sDistToInterval = (p: Poly, sC: number, ls: number, hs: number): number => {
    if (!p.closed) {
      if (sC >= ls && sC <= hs) return 0;
      return Math.min(Math.abs(sC - ls), Math.abs(sC - hs));
    }
    let c = sC;
    while (c < ls) c += p.len;
    while (c > ls + p.len) c -= p.len;
    if (c >= ls && c <= hs) return 0;
    return Math.min(Math.abs(c - ls), Math.abs(c - hs), Math.abs(dS(p, sC, ls)), Math.abs(dS(p, sC, hs)));
  };
  const segsNear = (pi: number, side: number, sC: number, R: number): number[] => {
    const B = borders[pi][bIdx(side)];
    const p = polys[pi];
    const pts = B.pts;
    const out: number[] = [];
    const seen = new Set<number>();
    const lb = (target: number): number => {
      let lo = 0; let hi = pts.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].s < target) lo = mid + 1; else hi = mid; }
      return lo;
    };
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    for (const sh of shifts) {
      const loS = sC - R + sh; const hiS = sC + R + sh;
      // Segments i with pts[i+1].s >= loS and pts[i].s <= hiS.
      const start = Math.max(0, lb(loS) - 1);
      for (let i = start; i + 1 < pts.length && pts[i].s <= hiS; i++) {
        if (sDistToInterval(p, sC, pts[i].s, pts[i + 1].s) > R) continue;
        const idx = p.closed ? i % Math.max(1, pts.length - 1) : i;
        if (seen.has(idx)) continue;
        seen.add(idx);
        out.push(idx);
      }
    }
    return out;
  };
  // K1240 S3f: each crossing's cuts, where the under chain's borders
  // meet the over chain's near it, plus a synthesized cut where a tight
  // twist's pair just misses (below).
  let twistFlips = 0;
  scene.crossings.forEach((_x, xi) => {
    const cp = crossPt[xi];
    if (!cp) return;
    const U = cp.under; const O = cp.over;
    const pU = polys[U];
    const R = Math.min(14 * h, h / Math.max(Math.sin(cp.theta), 0.15) + 2 * h);
    type Cand = { uSide: number; oSide: number; x: number; y: number; uRef: PtRef; oRef: PtRef; dc: number };
    const cands: Cand[] = [];
    const uSegs = new Map<number, number[]>(); const oSegs = new Map<number, number[]>();
    for (const sd of [1, -1]) { uSegs.set(sd, segsNear(U, sd, cp.sUnder, R)); oSegs.set(sd, segsNear(O, sd, cp.sOver, R)); }
    for (const uSide of [1, -1]) for (const oSide of [1, -1]) {
      const BU = borders[U][bIdx(uSide)]; const BO = borders[O][bIdx(oSide)];
      for (const i of uSegs.get(uSide)!) for (const j of oSegs.get(oSide)!) {
        if (U === O && uSide === oSide && i === j) continue;
        const a = BU.pts[i]; const b = BU.pts[i + 1]; const c = BO.pts[j]; const d = BO.pts[j + 1];
        const hit = segInt(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
        if (!hit) continue;
        // K1247 s13: inside the window on both chains (KF_NOHITWIN).
        if ((Math.abs(dS(pU, cp.sUnder, lerpS(pU, a.s, b.s, hit.t))) > R || Math.abs(dS(polys[O], cp.sOver, lerpS(polys[O], c.s, d.s, hit.u))) > R)) continue;
        const px = a.x + (b.x - a.x) * hit.t; const py = a.y + (b.y - a.y) * hit.t;
        const uRef = mkRef(U, uSide, px, py, lerpS(pU, a.s, b.s, hit.t), { k: 4, a, b, c, d, t: hit.t, otherPi: O, otherSide: oSide, eye: -1 });
        const oRef = mkRef(O, oSide, px, py, lerpS(polys[O], c.s, d.s, hit.u), { k: 4, a: c, b: d, c: a, d: b, t: hit.u, otherPi: U, otherSide: uSide, eye: -1 });
        addEv(U, uSide, i, hit.t, uRef);
        addEv(O, oSide, j, hit.u, oRef);
        cands.push({ uSide, oSide, x: px, y: py, uRef, oRef, dc: Math.hypot(px - cp.x, py - cp.y) });
      }
    }
    // A missing cut (a tight twist): the under border and the over
    // tube's far border, which should cross here, just miss. The cut is
    // the under border's point of nearest approach to that border within
    // the crossing's window (S3f, Levi's rule: continuous geometry, the
    // crossing itself once they touch; no walk, no depth test). Only the
    // under chain's stations take it; the over chain's keep real cuts.
    const synth: Cand[] = [];
    for (const uSide of [1, -1]) for (const oSide of [1, -1]) {
      if (cands.some((c) => c.uSide === uSide && c.oSide === oSide)) continue;
      let from: Cand | null = null;
      for (const c of cands) if (c.uSide === uSide && c.oSide === -oSide && (!from || c.dc < from.dc)) from = c;
      if (!from) continue;
      let f: { x: number; y: number; s: number } | null = null;
      const BU = borders[U][bIdx(uSide)]; const BO = borders[O][bIdx(oSide)];
      let bd = Infinity; let bi = -1; let bt = 0;
      for (const i of uSegs.get(uSide)!) for (const j of oSegs.get(oSide)!) {
        if (U === O && uSide === oSide && i === j) continue;
        const a = BU.pts[i]; const b = BU.pts[i + 1]; const c = BO.pts[j]; const d = BO.pts[j + 1];
        if (!clipSegS(pU, a.s, b.s, cp.sUnder, R, synthTU)) continue;
        if (!clipSegS(polys[O], c.s, d.s, cp.sOver, R, synthTO)) continue;
        const u0 = synthTU[0]; const u1 = synthTU[1]; const o0 = synthTO[0]; const o1 = synthTO[1];
        const cl = segSegClosest(a.x + (b.x - a.x) * u0, a.y + (b.y - a.y) * u0, a.x + (b.x - a.x) * u1, a.y + (b.y - a.y) * u1,
          c.x + (d.x - c.x) * o0, c.y + (d.y - c.y) * o0, c.x + (d.x - c.x) * o1, c.y + (d.y - c.y) * o1);
        if (cl[2] < bd) { bd = cl[2]; bi = i; bt = u0 + (u1 - u0) * cl[0]; }
      }
      if (bi >= 0) {
        const a = BU.pts[bi]; const b = BU.pts[bi + 1];
        f = { x: a.x + (b.x - a.x) * bt, y: a.y + (b.y - a.y) * bt, s: lerpS(pU, a.s, b.s, bt) };
      }
      if (!f) continue;
      const uRef = addPointAt(U, uSide, f.x, f.y, f.s, { k: 6, s: f.s });
      synth.push({ uSide, oSide, x: f.x, y: f.y, uRef, oRef: from.oRef, dc: Math.hypot(f.x - cp.x, f.y - cp.y) });
      twistFlips++;
    }
    const pairStations: Station[] = [];
    for (const oSide of [1, -1]) {
      const pick = (uSide: number): Cand | null => {
        let best: Cand | null = null;
        for (const c of [...cands, ...synth]) if (c.uSide === uSide && c.oSide === oSide && (!best || c.dc < best.dc)) best = c;
        return best;
      };
      const cl = pick(1); const crd = pick(-1);
      if (!cl || !crd) { if (cands.length) diagnostics.push(`crossing ${xi}: missing station side ${oSide}`); continue; }
      const cS = cl.uRef.s + dS(pU, cl.uRef.s, crd.uRef.s) / 2;
      const st = addStation({ pi: U, cS: normS(pU, cS), left: cl.uRef, right: crd.uRef, kind: "cross", key: `x${xi}|${oSide}` });
      pairStations.push(st);
      for (const c of [cl, crd]) { cuts.push({ crossing: xi, chain: U, side: c.uSide, s: c.uRef.s, x: c.x, y: c.y, overChain: O }); cutRefs.push({ border: U * 2 + bIdx(c.uSide), ref: c.uRef }); }
    }
    if (pairStations.length === 2) crossPairs.push([pairStations[0], pairStations[1]]);
    // The over chain is also stationed where it enters and leaves the
    // under's tube (the same four intersections, paired by the under's
    // side), so its strip is tiled at the crossing instead of
    // overlapping the under's neighbours. Its lens interval is kept.
    {
      const pO = polys[O];
      for (const uSide of [1, -1]) {
        const pickO = (oSide: number): Cand | null => {
          let best: Cand | null = null;
          for (const c of cands) if (c.uSide === uSide && c.oSide === oSide && (!best || c.dc < best.dc)) best = c;
          return best;
        };
        const pl = pickO(1); const pr = pickO(-1);
        if (!pl || !pr) continue;
        const cSo = pl.oRef.s + dS(pO, pl.oRef.s, pr.oRef.s) / 2;
        addStation({ pi: O, cS: normS(pO, cSo), left: pl.oRef, right: pr.oRef, kind: "crossOver", key: `xo${xi}|${uSide}` });
      }
    }
  });
  diagnostics.push(`twist cuts ${twistFlips}`);

  // Eyes: crossings of one pair consecutive on both chains.
  let eyeCount = 0; let eyeCutCount = 0; let tieCutCount = 0; let kinkCount = 0;
  {
    type EyeCand = { pi: number; qi: number; xi: number; xj: number; sPi0: number; gapPi: number; sQi0: number; gapQi: number; reports: Set<number> };
    const eyeMap = new Map<string, EyeCand>();
    const reg = (pi: number, s0: number, gap: number, xjPass: PassInfo, xiPass: PassInfo): void => {
      const qi = xiPass.qi;
      // xiPass and xjPass are consecutive passes on pi; partner chain must match.
      if (xjPass.qi !== qi) return;
      const xi = xiPass.xi; const xj = xjPass.xi;
      if (xi === xj) return;
      const key = `${Math.min(pi, qi)}-${Math.max(pi, qi)}|${Math.min(xi, xj)}-${Math.max(xi, xj)}`;
      let e = eyeMap.get(key);
      if (!e) {
        // Fill both arcs generically below when both reports are in.
        e = { pi, qi, xi, xj, sPi0: s0, gapPi: gap, sQi0: 0, gapQi: 0, reports: new Set() };
        eyeMap.set(key, e);
      }
      e.reports.add(pi);
      if (pi === e.pi) { e.sPi0 = s0; e.gapPi = gap; }
      if (pi !== e.pi) { e.sQi0 = s0; e.gapQi = gap; }
      if (pi === qi) { e.sQi0 = s0; e.gapQi = gap; }
    };
    polys.forEach((p, pi) => {
      const list = passes[pi];
      for (let k = 0; k < list.length; k++) {
        const a = list[k];
        const b = list[(k + 1) % list.length];
        if (!p.closed && k + 1 >= list.length) break;
        if (a.xi === b.xi) continue;
        let gap = b.s - a.s;
        if (p.closed && gap <= 0) gap += p.len;
        if (gap <= 0) continue;
        reg(pi, a.s, gap, b, a);
      }
    });
    const inArc = (p: Poly, s: number, s0: number, gap: number): boolean => {
      let d = s - s0;
      if (p.closed) d = ((d % p.len) + p.len) % p.len;
      return d >= -1e-9 && d <= gap + 1e-9;
    };
    for (const e of eyeMap.values()) {
      if (e.pi !== e.qi && e.reports.size < 2) continue;
      if (e.gapPi > 10 * h || e.gapQi > 10 * h || e.gapPi < 1e-9 || e.gapQi < 1e-9) continue;
      const pA = polys[e.pi]; const pB = polys[e.qi];
      const midA = pointAt(pA, e.sPi0 + e.gapPi / 2);
      const midB = pointAt(pB, e.sQi0 + e.gapQi / 2);
      if (Math.hypot(midA.x - midB.x, midA.y - midB.y) > 3 * h) continue;
      eyeCount++;
      // Intersect the two chains' borders between the crossings.
      let found = 0;
      for (const sa of [1, -1]) for (const sb of [1, -1]) {
        const BA = borders[e.pi][bIdx(sa)]; const BB = borders[e.qi][bIdx(sb)];
        const segInArc = (p: Poly, ls: number, hs: number, s0: number, gap: number): boolean => inArc(p, ls, s0, gap) || inArc(p, hs, s0, gap) || (sDistToInterval(p, s0, ls, hs) === 0 && gap >= 0) || Math.abs(dS(p, s0 + gap / 2, ls + (hs - ls) / 2)) <= gap / 2 + Math.abs(hs - ls) / 2;
        // segInArc implies the segment's s interval meets the arc's, so
        // a binary-search slice (with shifts and a guard) is a superset;
        // the exact predicate then decides, as before.
        const sliceSegs = (pts: BPt[], p: Poly, s0: number, gap: number): number[] => {
          const n = pts.length;
          const out: number[] = [];
          if (n < 2) return out;
          const seen = new Set<number>();
          const lb = (target: number): number => { let lo = 0; let hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (pts[m].s < target) lo = m + 1; else hi = m; } return lo; };
          const shifts = p.closed ? [-p.len, 0, p.len] : [0];
          for (const sh of shifts) {
            const a = Math.max(0, lb(s0 - 1e-6 + sh) - 3);
            const b = Math.min(n - 2, lb(s0 + gap + 1e-6 + sh) + 3);
            for (let i = a; i <= b; i++) { if (!seen.has(i)) { seen.add(i); if (segInArc(p, pts[i].s, pts[i + 1].s, s0, gap)) out.push(i); } }
          }
          return out;
        };
        const segsA = sliceSegs(BA.pts, pA, e.sPi0, e.gapPi);
        const segsB = sliceSegs(BB.pts, pB, e.sQi0, e.gapQi);
        const cellE = Math.max(h, 0.05);
        const gridB = new Map<string, number[]>();
        for (const j of segsB) {
          const c = BB.pts[j]; const d = BB.pts[j + 1];
          const x0 = Math.floor(Math.min(c.x, d.x) / cellE); const x1 = Math.floor(Math.max(c.x, d.x) / cellE);
          const y0 = Math.floor(Math.min(c.y, d.y) / cellE); const y1 = Math.floor(Math.max(c.y, d.y) / cellE);
          for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) { const k = ix + "," + iy; const l = gridB.get(k) ?? []; l.push(j); gridB.set(k, l); }
        }
        const candB = (a: BPt, b: BPt): number[] => {
          const out: number[] = [];
          const seenJ = new Set<number>();
          const x0 = Math.floor(Math.min(a.x, b.x) / cellE); const x1 = Math.floor(Math.max(a.x, b.x) / cellE);
          const y0 = Math.floor(Math.min(a.y, b.y) / cellE); const y1 = Math.floor(Math.max(a.y, b.y) / cellE);
          for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) for (const j of gridB.get(ix + "," + iy) ?? []) { if (!seenJ.has(j)) { seenJ.add(j); out.push(j); } }
          return out;
        };
        for (const i of segsA) for (const j of candB(BA.pts[i], BA.pts[i + 1])) {
          if (e.pi === e.qi && sa === sb && i === j) continue;
          const a = BA.pts[i]; const b = BA.pts[i + 1]; const c = BB.pts[j]; const d = BB.pts[j + 1];
          const hit = segInt(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
          if (!hit) continue;
          const px = a.x + (b.x - a.x) * hit.t; const py = a.y + (b.y - a.y) * hit.t;
          addEv(e.pi, sa, i, hit.t, mkRef(e.pi, sa, px, py, lerpS(polys[e.pi], a.s, b.s, hit.t), { k: 4, a, b, c, d, t: hit.t, otherPi: e.qi, otherSide: sb, eye: eyeCount - 1 }));
          addEv(e.qi, sb, j, hit.u, mkRef(e.qi, sb, px, py, lerpS(polys[e.qi], c.s, d.s, hit.u), { k: 4, a: c, b: d, c: a, d: b, t: hit.u, otherPi: e.pi, otherSide: sa, eye: eyeCount - 1 }));
          found++;
        }
      }
      eyeCutCount += found;
      if (!found) {
        // Closed-form depth tie: hats are linear between the crossings,
        // so zA(f) and zB(f) are linear in the matched fraction f.
        const zA1 = depthAt(e.pi, e.sPi0); const zA2 = depthAt(e.pi, e.sPi0 + e.gapPi);
        const zB1 = depthAt(e.qi, e.sQi0); const zB2 = depthAt(e.qi, e.sQi0 + e.gapQi);
        const den = (zA2 - zA1) - (zB2 - zB1);
        if (Math.abs(den) > 1e-12) {
          const f = (zB1 - zA1) / den;
          if (f > 0.05 && f < 0.95) {
            const cA = pointAt(pA, e.sPi0 + f * e.gapPi);
            const cB = pointAt(pB, e.sQi0 + f * e.gapQi);
            if (Math.hypot(cA.x - cB.x, cA.y - cB.y) < 2 * h) {
              const faceSide = (pc: At, ox: number, oy: number): number => ((pc.tx * (oy - pc.y) - pc.ty * (ox - pc.x)) > 0 ? 1 : -1);
              const sA = faceSide(cA, cB.x, cB.y); const sB = faceSide(cB, cA.x, cA.y);
              const ptOn = (pi2: number, sd: number, at: At, other: At): void => {
                const nx = -(other.y - at.y); const ny = (other.x - at.x);
                // Border point: centre + h * unit toward the other centre.
                let ux = other.x - at.x; let uy = other.y - at.y;
                const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul; void nx; void ny;
                addPointAt(pi2, sd, at.x + ux * h, at.y + uy * h, at.k !== undefined ? normS(polys[pi2], e.pi === pi2 ? e.sPi0 + f * e.gapPi : e.sQi0 + f * e.gapQi) : 0);
              };
              ptOn(e.pi, sA, cA, cB);
              ptOn(e.qi, sB, cB, cA);
              tieCutCount++;
            }
          }
        }
      }
    }
    for (const x of scene.crossings) if (x.a.chain === x.b.chain) kinkCount++;
  }
  diagnostics.push(`eyes ${eyeCount} (border cuts ${eyeCutCount}, depth-tie cuts ${tieCutCount}), kink self-crossings ${kinkCount}`);

  // Junction and cap stations (before the one rebuild, so all refs land).
  const borderPointAt = (pi: number, side: number, s: number): { x: number; y: number } => {
    const B = borders[pi][bIdx(side)];
    const p = polys[pi];
    let target = s;
    if (p.closed) { target = normS(p, s); if (target < B.pts[0].s - 1e-9) target += p.len; }
    let lo = 0; let hi = B.pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (B.pts[mid].s <= target) lo = mid; else hi = mid; }
    const a = B.pts[lo]; const b = B.pts[Math.min(B.pts.length - 1, lo + 1)];
    const ds = b.s - a.s;
    const t = ds > 1e-12 ? Math.min(1, Math.max(0, (target - a.s) / ds)) : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const junctionCapKeys = new Set<string>();
  arms.forEach((arm) => {
    const ai = arm.idx;
    let nextPt = armNextPt[ai]; let prevPt = armPrevPt[ai];
    if (!nextPt && !prevPt) return;
    const mkFallback = (missingNext: boolean): PtRef => {
      const knownSide = missingNext ? armPrevSide[ai] : armNextSide[ai];
      const side = -knownSide;
      const pt = borderPointAt(arm.pi, side, arm.sR);
      return addPointAt(arm.pi, side, pt.x, pt.y, arm.sR);
    };
    if (!nextPt) { nextPt = mkFallback(true); armNextPt[ai] = nextPt; armNextSide[ai] = nextPt.side; }
    if (!prevPt) { prevPt = mkFallback(false); armPrevPt[ai] = prevPt; armPrevSide[ai] = prevPt.side; }
    const refs = [nextPt, prevPt];
    const left = refs.find((r) => r.side === 1) ?? refs[0];
    const right = refs.find((r) => r.side === -1) ?? refs[1];
    if (left === right) return;
    const p = polys[arm.pi];
    const cS = left.s + dS(p, left.s, right.s) / 2;
    addStation({ pi: arm.pi, cS: normS(p, cS), left, right, kind: "junction", key: `j${arm.ji}|a${ai}` });
  });
  interface CapInfo { station: Station; atEnd: boolean; cx: number; cy: number; arc: { x: number; y: number }[] }
  const capInfos: CapInfo[] = [];
  const capRuns: [number, number][][] = [];
  // K1247 s14: the seam's key, mid-gap (seamKeyOf), from the structure's feature keys.
  const seamKR: number[] = polys.map(() => NaN).concat(polys.map(() => NaN));
  if (dg) {
    const put = (q: number, v: number): void => { if (!(seamKR[q * 2] <= v)) seamKR[q * 2] = v; if (!(seamKR[q * 2 + 1] >= v)) seamKR[q * 2 + 1] = v; };
    for (const x of dg.crossings) { const uPi = x.over === "a" ? x.bPi : x.aPi; const oPi = x.over === "a" ? x.aPi : x.bPi; put(uPi, x.sUnder); put(oPi, x.sOver); }
    for (const a of dg.arms) put(a.pi, a.s);
  }
  const seamKeyRef = (pi: number): number => (dg ? seamKeyOf(seamKR[pi * 2], seamKR[pi * 2 + 1], polys[pi].len) : 0);
  polys.forEach((p, pi) => {
    if (p.closed) {
      let sSeam = normS(p, p.s0 + seamKeyRef(pi));
      if (dg) { // K1247 s14: the middle of the free stretch (seamFreeC)
        const acc = seamFreeReset();
        for (const sx of stations) if (sx.pi === pi && (sx.kind === "cross" || sx.kind === "crossOver" || sx.kind === "junction")) seamFreeAdd(acc, sSeam, p.len, sx.left.s, sx.right.s, sx.cS);
        sSeam = normS(p, sSeam + seamFreeMid(acc));
      }
      const lp = borderPointAt(pi, 1, sSeam); const rp = borderPointAt(pi, -1, sSeam);
      const left = addPointAt(pi, 1, lp.x, lp.y, sSeam);
      const right = addPointAt(pi, -1, rp.x, rp.y, sSeam);
      addStation({ pi, cS: sSeam, left, right, kind: "seam", key: `seam${pi}` });
      return;
    }
    for (const atEnd of [false, true]) {
      const sEnd = atEnd ? p.s0 + p.len : p.s0;
      const lp = borderPointAt(pi, 1, sEnd); const rp = borderPointAt(pi, -1, sEnd);
      const left = addPointAt(pi, 1, lp.x, lp.y, sEnd);
      const right = addPointAt(pi, -1, rp.x, rp.y, sEnd);
      const st = addStation({ pi, cS: sEnd, left, right, kind: atEnd ? "capEnd" : "capStart", key: `cap${pi}|${atEnd ? 1 : 0}` });
      const c = pointAt(p, sEnd);
      // Cap arc from the left point to the right point, outward.
      const nbS = atEnd ? sEnd - Math.min(1, p.len) : sEnd + Math.min(1, p.len);
      const nb = pointAt(p, nbS);
      let ox = c.x - nb.x; let oy = c.y - nb.y;
      const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
      const a0 = Math.atan2(lp.y - c.y, lp.x - c.x);
      let da = Math.atan2(rp.y - c.y, rp.x - c.x) - a0;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      const midA = a0 + da / 2;
      if (Math.cos(midA) * ox + Math.sin(midA) * oy < 0) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI;
      // Step count snapped at integer boundaries: an arc spanning
      // exactly pi must take the same step count in every frame.
      const steps = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 12) - 1e-9));
      const arc: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (da * i) / steps;
        arc.push(i === 0 ? { x: lp.x, y: lp.y } : i === steps ? { x: rp.x, y: rp.y } : { x: c.x + h * Math.cos(a), y: c.y + h * Math.sin(a) });
      }
      capInfos.push({ station: st, atEnd, cx: c.x, cy: c.y, arc }); capRuns.push([]);
      // An END arm's root at this chain end makes this the junction cap.
      for (const arm of arms) if (arm.pi === pi && arm.kind === "end" && Math.abs(arm.sR - sEnd) < 1e-9) junctionCapKeys.add(st.key);
    }
  });

  const basePtsSnap: BPt[][][] = borders.map((bs) => bs.map((B) => B.pts.slice()));
  // Apply every event in one rebuild per border; refs gain their index.
  borders.forEach((bs, pi) => {
    bs.forEach((B, bi) => {
      const list = evs[pi][bi];
      if (!list.length) return;
      const bySeg = new Map<number, Ev[]>();
      for (const e of list) { const l = bySeg.get(e.seg) ?? []; l.push(e); bySeg.set(e.seg, l); }
      const old = B.pts;
      const out: BPt[] = [old[0]];
      for (let i = 0; i + 1 < old.length; i++) {
        const segEvs = (bySeg.get(i) ?? []).slice().sort((a, b) => a.t - b.t);
        const pending: PtRef[] = [];
        for (const e of segEvs) {
          if (e.t >= 1 - 1e-9) { pending.push(e.ref); continue; }
          const last = out[out.length - 1];
          if (e.t <= 1e-9 || Math.hypot(e.ref.x - last.x, e.ref.y - last.y) < 1e-12) { e.ref.idx = out.length - 1; continue; }
          if (Math.hypot(e.ref.x - last.x, e.ref.y - last.y) < 1e-12) { e.ref.idx = out.length - 1; continue; }
          out.push({ x: e.ref.x, y: e.ref.y, s: lerpS(polys[pi], old[i].s, old[i + 1].s, e.t), rec: e.ref.rec, ev: e.ref });
          e.ref.idx = out.length - 1;
          e.ref.s = out[out.length - 1].s;
        }
        out.push(old[i + 1]);
        for (const r of pending) r.idx = out.length - 1;
      }
      // Events on a t~0 segment start were mapped above; refs that point
      // at an original point through addPointAt with t exactly 0/1 are set.
      B.pts = out;
    });
  });
  // Refs created at existing vertices may still lack an index if their
  // event sat exactly on a point and was deduped against a neighbour
  // segment: resolve by nearest point on their border.
  const allRefs: PtRef[] = [];
  stations.forEach((st) => { allRefs.push(st.left, st.right); });
  cornerWork.forEach((cw) => { if (cw.refA) allRefs.push(cw.refA); if (cw.refB) allRefs.push(cw.refB); });
  for (const r of allRefs) {
    if (r.idx >= 0) continue;
    const B = borders[r.pi][bIdx(r.side)];
    let best = 0; let bd = Infinity;
    B.pts.forEach((pt, i) => { const d = Math.hypot(pt.x - r.x, pt.y - r.y); if (d < bd) { bd = d; best = i; } });
    r.idx = best;
  }

  // Centreline segment grid for covering (burial) tests.
  const cell = Math.max(2 * h, 0.25);
  const segStart: number[] = [];
  { let acc = 0; polys.forEach((p) => { segStart.push(acc); acc += p.nseg; }); }
  const totalSegs = segStart.length ? segStart[segStart.length - 1] + polys[polys.length - 1].nseg : 0;
  const grid = new Map<number, { pi: number; k: number }[]>();
  const gkey = (ix: number, iy: number): number => (ix + 100000) * 200000 + (iy + 100000);
  polys.forEach((p, pi) => {
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1 === p.n ? 0 : k + 1;
      const x0 = Math.floor(Math.min(p.x[k], p.x[b]) / cell); const x1 = Math.floor(Math.max(p.x[k], p.x[b]) / cell);
      const y0 = Math.floor(Math.min(p.y[k], p.y[b]) / cell); const y1 = Math.floor(Math.max(p.y[k], p.y[b]) / cell);
      for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
        const key = gkey(ix, iy);
        const l = grid.get(key) ?? [];
        l.push({ pi, k });
        grid.set(key, l);
      }
    }
  });
  const stamp = new Int32Array(Math.max(1, totalSegs));
  let stampCur = 0;
  const sigma = Math.PI * h;
  // Piece-level covering, as form B classifies it: one piece per chain
  // within sigma, classified by its nearest foot (not segment by
  // segment, which misreads a tube just past its arm cap).
  const cbufPi = new Int32Array(256);
  const cbufD = new Float64Array(256);
  const cbufS = new Float64Array(256);
  let coverPickPi: number[] = [];
  let coverPickS: number[] = [];
  let coverNearPi = -1;
  let coverNearS = 0;
  let coverNearD = Infinity;
  const covering = (x: number, y: number, ownPi: number, ownS: number): boolean => {
    coverPickPi = []; coverPickS = []; coverNearPi = -1; coverNearS = 0;
    stampCur++;
    if (stampCur > 2000000000) { stamp.fill(0); stampCur = 1; }
    const cx = Math.floor(x / cell); const cy = Math.floor(y / cell);
    const zOwn = depthAt(ownPi, ownS);
    const gOwn = memberGroup(ownPi, ownS);
    let cn = 0;
    for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) {
      for (const e of grid.get(gkey(ix, iy)) ?? []) {
        const gid = segStart[e.pi] + e.k;
        if (stamp[gid] === stampCur) continue;
        stamp[gid] = stampCur;
        const p = polys[e.pi];
        const b = e.k + 1 === p.n ? 0 : e.k + 1;
        const ex = p.x[b] - p.x[e.k]; const ey = p.y[b] - p.y[e.k];
        const l2 = ex * ex + ey * ey;
        let t = l2 > 0 ? ((x - p.x[e.k]) * ex + (y - p.y[e.k]) * ey) / l2 : 0;
        t = Math.min(1, Math.max(0, t));
        const d = Math.hypot(p.x[e.k] + ex * t - x, p.y[e.k] + ey * t - y);
        if (d >= h) {
          if (d < 2.2 * h && !(e.pi === ownPi && Math.abs(dS(p, ownS, p.s[e.k] + t * p.segLen[e.k])) <= sigma)) {
            if (coverNearPi < 0 || d < coverNearD) { coverNearPi = e.pi; coverNearS = p.s[e.k] + t * p.segLen[e.k]; coverNearD = d; }
          }
          continue;
        }
        const s = p.s[e.k] + t * p.segLen[e.k];
        if (e.pi === ownPi && Math.abs(dS(p, ownS, s)) <= sigma) continue;
        if (cn < 256) { cbufPi[cn] = e.pi; cbufD[cn] = d; cbufS[cn] = s; cn++; }
      }
    }
    if (!cn) return false;
    // Pick local minima by distance, one per chain within sigma.
    const order: number[] = [];
    for (let i = 0; i < cn; i++) order.push(i);
    order.sort((a, b) => cbufD[a] - cbufD[b]);
    const pickedPi: number[] = [];
    const pickedS: number[] = [];
    for (const idx of order) {
      const pi2 = cbufPi[idx]; const s2 = cbufS[idx];
      let dup = false;
      for (let j = 0; j < pickedPi.length; j++) if (pickedPi[j] === pi2 && Math.abs(dS(polys[pi2], pickedS[j], s2)) <= sigma) { dup = true; break; }
      if (dup) continue;
      pickedPi.push(pi2); pickedS.push(s2);
      const gOther = memberGroup(pi2, s2);
      if (gOwn >= 0 && gOther === gOwn) { coverPickPi = pickedPi.slice(); coverPickS = pickedS.slice(); return true; }
      if (depthAt(pi2, s2) > zOwn + 1e-9) { coverPickPi = pickedPi.slice(); coverPickS = pickedS.slice(); return true; }
    }
    coverPickPi = pickedPi.slice(); coverPickS = pickedS.slice();
    return false;
  };
  const trimByBorder = new Map<string, { sR: number; dir: number; dEnd: number; pi: number }[]>();
  for (const t of trimIntervals) {
    const k = `${t.pi}|${t.side}`;
    const l = trimByBorder.get(k) ?? [];
    l.push(t);
    trimByBorder.set(k, l);
  }
  const isTrimmed = (pi: number, side: number, midS: number): boolean => {
    const l = trimByBorder.get(`${pi}|${side}`);
    if (!l) return false;
    const p = polys[pi];
    for (const t of l) {
      let dd = dS(p, t.sR, midS);
      if (t.dir < 0) dd = -dd;
      if (p.closed && dd < 0) dd += p.len;
      if (dd >= -1e-7 && dd <= t.dEnd + 1e-9) return true;
    }
    return false;
  };
  // Exposed flag per border segment. The covering candidates (the
  // chains whose tubes face this segment, nearest first) are recorded
  // per segment: structure() stores them so frame() can re-evaluate
  // exposure from the frame's own geometry (S3b).
  const coverCand = borders.map((bs) => bs.map((B) => {
    const n = Math.max(0, B.pts.length - 1);
    return { pi: new Int16Array(n).fill(-1), s: new Float32Array(n), pi2: new Int16Array(n).fill(-1), s2: new Float32Array(n), pi3: new Int16Array(n).fill(-1), s3: new Float32Array(n), pi4: new Int16Array(n).fill(-1), s4: new Float32Array(n), byPi: new Int16Array(n).fill(-1), byS: new Float32Array(n) };
  }));
  const collapseX: Float64Array[][] = borders.map((bs) => bs.map((B) => new Float64Array(Math.max(0, B.pts.length - 1))));
  const collapseY: Float64Array[][] = borders.map((bs) => bs.map((B) => new Float64Array(Math.max(0, B.pts.length - 1))));
  const collapseOk: Uint8Array[][] = borders.map((bs) => bs.map((B) => new Uint8Array(Math.max(0, B.pts.length - 1))));
  const exposed: boolean[][][] = borders.map((bs, pi) => bs.map((B, bi) => {
    const side = bi === 0 ? 1 : -1;
    const out = new Array<boolean>(Math.max(0, B.pts.length - 1)).fill(false);
    const cc = coverCand[pi][bi];
    for (let i = 0; i + 1 < B.pts.length; i++) {
      const a = B.pts[i]; const b = B.pts[i + 1];
      const midS = a.s + (b.s - a.s) / 2;
      const cov = covering((a.x + b.x) / 2, (a.y + b.y) / 2, pi, midS);
      if (cov && coverPickPi.length > 0) { cc.byPi[i] = coverPickPi[coverPickPi.length - 1]; cc.byS[i] = coverPickS[coverPickS.length - 1]; }
      if (coverPickPi.length > 0) { cc.pi[i] = coverPickPi[0]; cc.s[i] = coverPickS[0]; }
      if (coverPickPi.length > 1) { cc.pi2[i] = coverPickPi[1]; cc.s2[i] = coverPickS[1]; }
      if (coverPickPi.length > 2) { cc.pi3[i] = coverPickPi[2]; cc.s3[i] = coverPickS[2]; }
      if (coverPickPi.length > 3) { cc.pi4[i] = coverPickPi[3]; cc.s4[i] = coverPickS[3]; }
      else if (coverNearPi >= 0) { cc.pi4[i] = coverNearPi; cc.s4[i] = coverNearS; }
      out[i] = !isTrimmed(pi, side, midS) && !cov;
    }
    return out;
  }));
  if (frameMode) {
    // Collapse points for covered segments: the covering chain's
    // nearest exposed border point (the visible outline there).
    borders.forEach((bs, pi) => {
      bs.forEach((B, bi) => {
        const cc = coverCand[pi][bi];
        for (let i = 0; i + 1 < B.pts.length; i++) {
          if (exposed[pi][bi][i]) continue;
          const mx = (B.pts[i].x + B.pts[i + 1].x) / 2; const my = (B.pts[i].y + B.pts[i + 1].y) / 2;
          let px = mx; let py = my; let found = 0;
          const cp = cc.byPi[i];
          if (cp >= 0 && cp < borders.length) {
            const cs2 = cc.byS[i];
            let bd = Infinity;
            for (const cb of borders[cp]) {
              const cbi = cb.side === 1 ? 0 : 1;
              const pts = cb.pts; const expC = exposed[cp][cbi];
              let lo = 0; let hi = pts.length - 1;
              while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid].s <= cs2) lo = mid; else hi = mid; }
              for (let q = Math.max(0, lo - 24); q <= Math.min(pts.length - 2, lo + 24); q++) {
                if (!expC[q]) continue;
                const cx2 = (pts[q].x + pts[q + 1].x) / 2; const cy2 = (pts[q].y + pts[q + 1].y) / 2;
                const d = (cx2 - mx) * (cx2 - mx) + (cy2 - my) * (cy2 - my);
                if (d < bd) { bd = d; px = cx2; py = cy2; found = 1; }
              }
            }
          }
          collapseX[pi][bi][i] = px; collapseY[pi][bi][i] = py; collapseOk[pi][bi][i] = found;
        }
      });
    });
  }
  profMark("cutsEyesExposure");
  const segRegion: Int32Array[][] = borders.map((bs) => bs.map((B) => new Int32Array(Math.max(0, B.pts.length - 1)).fill(-1)));

  // Intervals between stations, per chain.
  interface Interval { pi: number; A: Station; B: Station; cMid: number; len: number; discard: boolean; region: number; eA?: Station }
  const intervals: Interval[] = [];
  // K1247 s12: positions follow the structure. A chain's structural
  // intervals, in order, laid end to end by their lengths; an interval whose
  // start some earlier station has already passed starts where that station
  // is (eA, the furthest so far) and is that much shorter. A closed chain
  // runs a lap first so the wrap carries in. With every length positive this
  // is the identity (eA = A); it moves continuously with the positions.
  const envelopeRef = (ivs: Interval[], cyc: boolean): void => {
    let T = 0; for (const iv of ivs) T += iv.len;
    let env = -Infinity; let eA: Station | undefined;
    const laps = cyc ? 2 : 1;
    for (let lap = 0; lap < laps; lap++) {
      let pos = lap * T;
      for (const iv of ivs) {
        if (pos >= env) { env = pos; eA = iv.A; }
        const posB = pos + iv.len;
        if (lap === laps - 1) { iv.eA = eA; iv.len = posB - env; iv.cMid = eA!.cS + Math.max(0, iv.len) / 2; }
        pos = posB;
      }
    }
  };
  const stationsOf = new Map<number, Station[]>();
  for (const st of stations) { const l = stationsOf.get(st.pi) ?? []; l.push(st); stationsOf.set(st.pi, l); }
  // K1247 s12: a station's structural place on its chain (frame()'s
  // slotKey): the feature's scene s, from the structure when there is one.
  const sKeyOf = (q: Station): number => {
    const k = q.key;
    if (k.startsWith("cap")) return k.endsWith("|1") ? 1e12 : -1e12;
    if (k.startsWith("seam")) return seamKeyRef(parseInt(k.slice(4), 10)); // K1247 s14: mid-gap, below every feature key
    if (k.startsWith("j")) {
      const ai = parseInt(k.slice(k.indexOf("|a") + 2), 10);
      if (dg) return dg.arms[ai].s;
      const a = arms[ai]; return scene.junctions[a.ji].arms[a.ei].s;
    }
    const over = k.startsWith("xo");
    const xi = parseInt(k.slice(over ? 2 : 1), 10);
    if (dg) return over ? dg.crossings[xi].sOver : dg.crossings[xi].sUnder;
    const x = scene.crossings[xi];
    return (x.over === "a") === over ? x.a.s : x.b.s;
  };
  stationsOf.forEach((list, pi) => {
    const p = polys[pi];
    // K1247 s12: ordered by structure (see regionsPhaseC); every
    // structural interval exists, its length may pass zero.
    // Inside one key, a through pass's arm leaving backwards first (slotSub).
    const subOf = (q: Station): number => {
      if (!q.key.startsWith("j")) return 0;
      const ai = parseInt(q.key.slice(q.key.indexOf("|a") + 2), 10);
      if (dg) return dg.arms[ai].dir;
      const a = arms[ai]; return scene.junctions[a.ji].arms[a.ei].dir;
    };
    const keyed = list.map((q) => ({ q, k: sKeyOf(q), d: subOf(q) }));
    keyed.sort((a, b) => (a.k - b.k) || (a.d - b.d) || -dS(p, a.q.cS, b.q.cS));
    const m = keyed.length;
    for (let i = 0; i < (p.closed ? m : m - 1); i++) {
      const A = keyed[i]; const B = keyed[(i + 1) % m];
      let len: number;
      if (m === 1) len = p.len;
      else if (!p.closed) len = B.q.cS - A.q.cS;
      else { const want = B.k - A.k + (i === m - 1 ? p.len : 0); len = want + dS(p, want, B.q.cS - A.q.cS); }
      intervals.push({ pi, A: A.q, B: B.q, cMid: A.q.cS + Math.max(0, len) / 2, len, discard: false, region: -1 });
    }
    envelopeRef(intervals.slice(intervals.length - (p.closed ? m : m - 1)), p.closed && m > 1);
  });
  const discardPair = (s1: Station, s2: Station): void => {
    const cand = intervals.filter((iv) => (iv.A === s1 && iv.B === s2) || (iv.A === s2 && iv.B === s1));
    if (!cand.length) return;
    cand.sort((a, b) => a.len - b.len);
    cand[0].discard = true;
  };
  for (const [s1, s2] of crossPairs) discardPair(s1, s2);
  {
    const byRoot = new Map<string, Station[]>();
    for (const arm of arms) {
      if (arm.kind !== "through") continue;
      const st = stationByKey.get(`j${arm.ji}|a${arm.idx}`);
      if (!st) continue;
      const k = `${arm.ji}|${arm.pi}|${arm.sR.toFixed(9)}`;
      const l = byRoot.get(k) ?? [];
      l.push(st);
      byRoot.set(k, l);
    }
    for (const l of byRoot.values()) if (l.length === 2) discardPair(l[0], l[1]);
    for (const arm of arms) {
      if (arm.kind !== "end") continue;
      const jst = stationByKey.get(`j${arm.ji}|a${arm.idx}`);
      if (!jst) continue;
      for (const capKey of junctionCapKeys) {
        const cst = stationByKey.get(capKey);
        if (cst && cst.pi === arm.pi) discardPair(jst, cst);
      }
    }
  }

  // Regions from intervals.
  const regions: OutlineRegion[] = [];
  const capByStation = new Map<string, CapInfo>();
  for (const ci of capInfos) capByStation.set(ci.station.key, ci);
  const borderSeq = (pi: number, side: number, fromIdx: number, toIdx: number, forward: boolean): { pts: BPt[]; segs: number[] } => {
    const B = borders[pi][bIdx(side)];
    const pts: BPt[] = []; const segs: number[] = [];
    const nPts = B.pts.length;
    if (nPts === 0) return { pts, segs };
    if (!polys[pi].closed) {
      if (forward) {
        for (let i = fromIdx; i <= toIdx; i++) { pts.push(B.pts[i]); if (i < toIdx) segs.push(i); }
      } else {
        for (let i = fromIdx; i >= toIdx; i--) { pts.push(B.pts[i]); if (i > toIdx) segs.push(i - 1); }
      }
      return { pts, segs };
    }
    const mod = Math.max(1, nPts - 1);
    let fi = ((fromIdx % mod) + mod) % mod;
    let ti = ((toIdx % mod) + mod) % mod;
    if (forward) {
      for (let guard = 0; guard <= mod; guard++) {
        pts.push(B.pts[fi]);
        if (fi === ti) break;
        segs.push(fi);
        fi = (fi + 1) % mod;
      }
    } else {
      for (let guard = 0; guard <= mod; guard++) {
        pts.push(B.pts[fi]);
        if (fi === ti) break;
        const sg = (fi - 1 + mod) % mod;
        segs.push(sg);
        fi = sg;
      }
    }
    void ti;
    return { pts, segs };
  };
  const dedupePts = (pts: { x: number; y: number }[]): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    for (const pt of pts) {
      const l = out[out.length - 1];
      if (l && Math.hypot(l.x - pt.x, l.y - pt.y) < 1e-12) continue;
      out.push(pt);
    }
    if (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < 1e-12) out.pop();
    return out;
  };
  interface FaceWork { owner: number; group: number; pts: number[]; sample: [number, number]; depth: number }
  const faceWorks: FaceWork[] = [];
  // K1247 s12: region ids from structure, frame()'s numbering (structRegionsC
  // on the structure's cache; stations map to its slots by key).
  const sC = dg ? (fastCaches.get(dg) ?? (scene.chains.length === dg.chainIds.length ? buildFastCache(dg, scene) : undefined)) : undefined;
  const sR = sC && dg ? structRegionsC(sC, dg) : null;
  const sTaken = sR ? new Uint8Array(Math.max(1, sR.n)) : null;
  const sRegs: (OutlineRegion | undefined)[] = sR ? new Array(sR.n) : [];
  const sFaces: (FaceWork | undefined)[] = sR ? new Array(sR.n) : [];
  const slotStation = new Map<number, Station>();
  if (sC) for (const q of stations) slotStation.set(slotOfKeyC(sC, q.key), q);
  for (const iv of intervals) {
    if (iv.discard) continue;
    const pi = iv.pi;
    const p = polys[pi];
    // K1247 s12: a passed interval (length <= 0) is an empty region.
    const live = iv.len > 0;
    const noSeq = { pts: [] as BPt[], segs: [] as number[] };
    const eA = iv.eA ?? iv.A; // K1247 s12: where the interval starts (envelopeRef)
    const leftSeq = live ? borderSeq(pi, 1, eA.left.idx, iv.B.left.idx, true) : noSeq;
    // The right border is travelled back from B to A (decreasing s),
    // for open and closed chains alike.
    const rightBack = live ? borderSeq(pi, -1, iv.B.right.idx, eA.right.idx, false) : noSeq;
    const rightPts = rightBack.pts;
    const rightSegs = rightBack.segs;
    const seq: { x: number; y: number }[] = [];
    seq.push(...leftSeq.pts);
    const capB = capByStation.get(iv.B.key);
    if (live && capB && iv.B.kind.startsWith("cap")) seq.push(...capB.arc.slice(1, -1));
    seq.push(...rightPts);
    const capA = capByStation.get(eA.key);
    if (live && capA && eA.kind.startsWith("cap")) seq.push(...capA.arc.slice(1, -1).reverse());
    const poly = dedupePts(seq);
    // K1247 s11: a region per kept interval, even one whose polygon has under 3 points (zero
    // area). Skipping it renumbered every later region, and its point count follows the
    // positions: g41_def_tw64 chain 81's interval has 9 points full and 2 reduced at eps 0.1.
    void poly.length;
    let rid = regions.length;
    if (sR && sC) {
      rid = structRidC(sR, pi, slotOfKeyC(sC, iv.A.key), sTaken!);
      if (rid < 0) continue;
      sTaken![rid] = 1;
    }
    iv.region = rid;
    for (const sg of leftSeq.segs) segRegion[pi][0][sg] = rid;
    for (const sg of rightSegs) segRegion[pi][1][sg] = rid;
    const flat = poly.flatMap((pt) => [pt.x, pt.y]);
    const mid = pointAt(p, iv.cMid);
    const grp = memberGroup(pi, iv.cMid);
    const reg: OutlineRegion = { id: rid, ownerChain: pi, group: grp, pts: flat, pieces: [], hole: false };
    const fw: FaceWork = { owner: pi, group: grp, pts: flat, sample: [mid.x, mid.y], depth: depthAt(pi, iv.cMid) };
    if (sR) { sRegs[rid] = reg; sFaces[rid] = fw; } else { regions.push(reg); faceWorks.push(fw); }
  }
  if (sR) {
    for (let r = 0; r < sR.n; r++) {
      let reg = sRegs[r]; let fw = sFaces[r];
      if (!reg || !fw) {
        const pi = sR.ridPi[r]; const p = polys[pi];
        const s = slotStation.get(sR.ridA[r])?.cS ?? p.s0;
        const grp = memberGroup(pi, s); const mid = pointAt(p, s);
        reg = { id: r, ownerChain: pi, group: grp, pts: [], pieces: [], hole: false };
        fw = { owner: pi, group: grp, pts: reg.pts, sample: [mid.x, mid.y], depth: depthAt(pi, s) };
      }
      regions.push(reg); faceWorks.push(fw);
    }
  }
  // K1247 s14: underlays, as the fast path's (regionsPhaseC): one per structural discard
  // pair, ids sR.n + u, the band of the frame's discarded interval there, beneath every face.
  if (sR && sC) {
    const uBase = regions.length;
    const uRegs: (OutlineRegion | undefined)[] = new Array(sR.nU);
    const uFaces: (FaceWork | undefined)[] = new Array(sR.nU);
    for (const iv of intervals) {
      if (!iv.discard) continue;
      const u = sR.uOfPair.get(slotOfKeyC(sC, iv.A.key) * sR.nS + slotOfKeyC(sC, iv.B.key)) ?? -1;
      if (u < 0 || uRegs[u]) continue;
      const pi = iv.pi; const p = polys[pi];
      const eA = iv.eA ?? iv.A;
      const seq: { x: number; y: number }[] = [];
      if (iv.len > 0) {
        seq.push(...borderSeq(pi, 1, eA.left.idx, iv.B.left.idx, true).pts);
        const capB = capByStation.get(iv.B.key);
        if (capB && iv.B.kind.startsWith("cap")) seq.push(...capB.arc.slice(1, -1));
        seq.push(...borderSeq(pi, -1, iv.B.right.idx, eA.right.idx, false).pts);
        const capA = capByStation.get(eA.key);
        if (capA && eA.kind.startsWith("cap")) seq.push(...capA.arc.slice(1, -1).reverse());
      }
      const flat = dedupePts(seq).flatMap((pt) => [pt.x, pt.y]);
      const grp = memberGroup(pi, iv.cMid); const mid = pointAt(p, iv.cMid);
      uRegs[u] = { id: uBase + u, ownerChain: pi, group: grp, pts: flat, pieces: [], hole: false };
      uFaces[u] = { owner: pi, group: grp, pts: flat, sample: [mid.x, mid.y], depth: UNDER_DEPTH };
    }
    for (let u = 0; u < sR.nU; u++) {
      let reg = uRegs[u]; let fw = uFaces[u];
      if (!reg || !fw) {
        const pi = sR.uPi[u]; const p = polys[pi];
        const s = slotStation.get(sR.uA[u])?.cS ?? p.s0;
        const grp = memberGroup(pi, s); const mid = pointAt(p, s);
        reg = { id: uBase + u, ownerChain: pi, group: grp, pts: [], pieces: [], hole: false };
        fw = { owner: pi, group: grp, pts: reg.pts, sample: [mid.x, mid.y], depth: UNDER_DEPTH };
      }
      regions.push(reg); faceWorks.push(fw);
    }
  }
  // Junction regions: one polygon per junction.
  const junctionRegion = new Map<number, number>();
  scene.junctions.forEach((j, ji) => {
    const list = armsOfJ[ji];
    if (list.length < 2) return;
    const seq: { x: number; y: number }[] = [];
    let okAll = true;
    for (let ii = 0; ii < list.length; ii++) {
      const ai = list[ii];
      const arm = arms[ai];
      const prevPt = armPrevPt[ai]; const nextPt = armNextPt[ai];
      // An arm whose corners both failed still bounds the junction at
      // its root border points (the polygon is the junction's, even
      // where form B solved no corner for that arm).
      const bp = prevPt ? borders[prevPt.pi][bIdx(prevPt.side)].pts[prevPt.idx] : borderPointAt(arm.pi, nextPt ? -nextPt.side : 1, arm.sR);
      const bn = nextPt ? borders[nextPt.pi][bIdx(nextPt.side)].pts[nextPt.idx] : borderPointAt(arm.pi, prevPt ? -prevPt.side : -1, arm.sR);
      if (bp) seq.push({ x: bp.x, y: bp.y });
      if (bn) seq.push({ x: bn.x, y: bn.y });
      void okAll;
      const cw = cornerWork.find((c) => c.ji === ji && c.aArm === ai);
      if (cw && cw.ok && cw.r > 1e-9) {
        const aA = Math.atan2(cw.tay - cw.qy, cw.tax - cw.qx);
        let da = Math.atan2(cw.tby - cw.qy, cw.tbx - cw.qx) - aA;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
        for (let s = 1; s < steps; s++) {
          const a = aA + (da * s) / steps;
          seq.push({ x: cw.qx + cw.r * Math.cos(a), y: cw.qy + cw.r * Math.sin(a) });
        }
      }
    }
    if (!okAll) { diagnostics.push(`junction ${j.id}: no region (missing arm point)`); return; }
    const poly = dedupePts(seq);
    if (poly.length < 3) return;
    const rid = regions.length;
    junctionRegion.set(ji, rid);
    const flat = poly.flatMap((pt) => [pt.x, pt.y]);
    const owner = arms[list[0]].pi;
    regions.push({ id: rid, ownerChain: owner, group: groupOfJ[ji], pts: flat, pieces: [], hole: false });
    faceWorks.push({ owner, group: groupOfJ[ji], pts: flat, sample: [j.c[0], j.c[1]], depth: depthAt(owner, arms[list[0]].sR) });
  });

  profMark("regions");
  // Pieces: exposed border runs, corner arcs, caps.
  const pieces: OutlinePiece[] = [];
  const footFlat = (pi: number, s: number): [number, number] => { const a = pointAt(polys[pi], s); return [a.x, a.y]; };
  if (frameMode && dg) {
    // S3f: points only for structure()'s pieces. A run's points are
    // its border between its two end features; when the ends have
    // passed each other the run is one point where they met (the
    // ends' midpoint). No pass decides whether a border is covered.
    const ivByKeys = new Map<string, Interval>();
    const ivKey = (a: string, _b: string): string => a; // K1247 s12: by A alone (see piecesPhaseC)
    for (const iv of intervals) ivByKeys.set(ivKey(iv.A.key, iv.B.key), iv);
    let runMiss = 0; let runPassed = 0; const runMissKeys: string[] = [];
    for (const dp of dg.piecesD) {
      if (dp.kind === "run" || dp.kind === "ghost") {
        const ghost = dp.kind === "ghost"; const missAt = runMiss; const passAt = runPassed;
        // S3f (Claude): a run is its border between its two end
        // features, walked forward along the chain. A crossing cuts
        // the under chain's border twice (the over chain's two
        // borders); the two cuts are ordered along the chain, so the
        // run before ends at the first and the run after starts at the
        // second. When the ends have passed each other the run is one
        // point on its border, where they met.
        const ivD = dg.intervalsD[dp.interval];
        const dgA = dg.stationsD[ivD.aSt]; const dgB = dg.stationsD[ivD.bSt];
        const pi = dp.chain; const side = dp.side; const bi = bIdx(side);
        const B = borders[pi][bi];
        const p = polys[pi];
        const nB = B.pts.length;
        const sFOf = (dgs: DiagramStation): number => {
          if (dgs.kind === "cross") { const cp = crossPt[dgs.crossing]; return cp ? cp.sUnder : p.s0; }
          if (dgs.kind === "junction") { const a = arms[dgs.arm]; return a ? a.sR : p.s0; }
          if (dgs.kind === "capEnd") return p.s0 + p.len;
          return p.s0;
        };
        const refOf = (dgs: DiagramStation): PtRef | null => {
          if (dgs.kind === "cross") {
            const r: PtRef[] = [];
            for (const o of [1, -1]) {
              const st = stationByKey.get("x" + dgs.crossing + "|" + o);
              const rr = st ? (side === 1 ? st.left : st.right) : null;
              if (rr && rr.side === side && rr.idx >= 0 && rr.idx < nB) r.push(rr);
            }
            if (r.length !== 2) { runMiss++; return null; }
            const sC = sFOf(dgs);
            const first = dS(p, sC, r[0].s) <= dS(p, sC, r[1].s) ? 0 : 1;
            return dgs.key.endsWith("|in") ? r[first] : r[1 - first];
          }
          const st = stationByKey.get(dgs.key);
          const rr = st ? (side === 1 ? st.left : st.right) : null;
          if (rr && rr.side === side && rr.idx >= 0 && rr.idx < nB) return rr;
          runMiss++;
          if (runMissKeys.length < 12) {
            const da = dgs.kind === "junction" ? dg.arms[dgs.arm] : null;
            const ba = da ? arms.find((a) => a.ji === da.ji && a.ei === da.ei) : null;
            runMissKeys.push(`${dgs.key}/${side}:${st ? (rr ? "idx" + rr.idx + (rr.side !== side ? "wrongside" : "") : "noref") : "nost"}${ba ? `[b${ba.idx} n${armNextPt[ba.idx] ? armNextPt[ba.idx]!.side : "-"} p${armPrevPt[ba.idx] ? armPrevPt[ba.idx]!.side : "-"}]` : da ? "[nobarm]" : ""}`);
          }
          return null;
        };
        const fromRef = refOf(dgA); const toRef = refOf(dgB);
        const pts: number[] = []; const cpts: number[] = []; let rid = -1;
        const biv = ivByKeys.get(ivKey(dgA.key, dgB.key));
        if (!ghost && biv && biv.region >= 0) rid = biv.region;
        const pushPt = (x: number, y: number, s: number): void => { pts.push(x, y); const f = footFlat(pi, s); cpts.push(f[0], f[1]); };
        const sA = fromRef ? fromRef.s : sFOf(dgA); const sB = toRef ? toRef.s : sFOf(dgB);
        // The run's length along the chain at this frame, read near
        // the length its features' own s give it.
        let span = p.len;
        if (ivD.aSt !== ivD.bSt) {
          const want = p.closed && p.len > 0 ? (((sFOf(dgB) - sFOf(dgA)) % p.len) + p.len) % p.len : sFOf(dgB) - sFOf(dgA);
          let d = sB - sA - want;
          if (p.closed && p.len > 0) { d = ((d % p.len) + p.len) % p.len; if (d > p.len / 2) d -= p.len; }
          span = want + d;
        }
        let s0 = sA; let s1 = sA + span;
        if (nB >= 2 && span <= 0) {
          // r4: a passed run is degenerate and draws nothing. Its one
          // border point at sM sat inside the neighbouring tube (a
          // junction's inner corner, the over chain at a crossing),
          // where form B draws no ink.
          runPassed++;
          const sM = sA + span / 2;
          s0 = sM; s1 = sM;
        } else if (nB >= 2 && ivD.aSt === ivD.bSt) {
          for (let i = 0; i < nB; i++) pushPt(B.pts[i].x, B.pts[i].y, B.pts[i].s);
        } else if (nB >= 2 && fromRef && toRef) {
          const seq = borderSeq(pi, side, fromRef.idx, toRef.idx, true);
          for (const q of seq.pts) pushPt(q.x, q.y, q.s);
          if (!ghost && rid < 0 && seq.segs.length) rid = segRegion[pi][bi][seq.segs[0]] ?? -1;
        } else if (nB >= 2) {
          // A feature without its points: border points at the
          // features' s, and the border vertices between.
          const a0 = borderPointAt(pi, side, sA); pushPt(a0.x, a0.y, sA);
          const mod = p.closed ? nB - 1 : nB;
          let target = sA;
          if (p.closed) { target = normS(p, sA); if (target < B.pts[0].s - 1e-9) target += p.len; }
          let i = 0; let hi = nB - 1;
          while (hi - i > 1) { const mid = (i + hi) >> 1; if (B.pts[mid].s <= target) i = mid; else hi = mid; }
          for (let guard = 0; guard < mod; guard++) {
            i = p.closed ? (i + 1) % mod : i + 1;
            if (i >= nB) break;
            let off = B.pts[i].s - sA;
            if (p.closed && p.len > 0) off = ((off % p.len) + p.len) % p.len;
            if (off >= span) break;
            if (off > 0) pushPt(B.pts[i].x, B.pts[i].y, B.pts[i].s);
          }
          const b0 = borderPointAt(pi, side, sB); pushPt(b0.x, b0.y, sB);
        }
        if (ghost) { runMiss = missAt; runPassed = passAt; }
        const piece: OutlinePiece = { kind: dp.kind, chain: pi, side, s0, s1, pts, cpts, region: rid, corner: -1 };
        pieces.push(piece);
        if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
      } else if (dp.kind === "arc") {
        const cw = cornerWork[dp.corner];
        if (!cw) continue;
        const rid = junctionRegion.get(cw.ji) ?? -1;
        let pts: number[] = []; let cpts: number[] = [];
        if (cw.ok && cw.r > 1e-9) {
          const aA = Math.atan2(cw.tay - cw.qy, cw.tax - cw.qx);
          let da = Math.atan2(cw.tby - cw.qy, cw.tbx - cw.qx) - aA;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
          // K1283: the foot at r + h, on the thread side (piecesPhaseC's note).
          const rf = cw.r + h;
          for (let s = 0; s <= steps; s++) { const a = aA + (da * s) / steps; pts.push(cw.qx + cw.r * Math.cos(a), cw.qy + cw.r * Math.sin(a)); cpts.push(cw.qx + rf * Math.cos(a), cw.qy + rf * Math.sin(a)); }
        } else if (!cw.ok && cw.meet) { pts = [cw.qx, cw.qy]; cpts = [cw.qx, cw.qy]; } else if (!cw.ok) {
          let ax = cw.qx; let ay = cw.qy;
          for (const nci of [dp.corner - 1, dp.corner + 1]) {
            const nc = cornerWork[nci];
            if (!nc || nc.ji !== cw.ji || !nc.ok || !(nc.r > 1e-9)) continue;
            if (nc.aArm === cw.bArm) { ax = nc.tax; ay = nc.tay; break; }
            if (nc.bArm === cw.aArm) { ax = nc.tbx; ay = nc.tby; break; }
          }
          pts = [ax, ay]; cpts = [cw.qx, cw.qy];
        } else { pts = [cw.qx, cw.qy]; cpts = [cw.qx, cw.qy]; }
        const piece: OutlinePiece = { kind: "arc", chain: cw.aChain, side: 0, s0: cw.sA, s1: cw.sB, pts, cpts, region: rid, corner: dp.corner };
        pieces.push(piece);
        if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
      } else if (dp.kind === "tail") {
        const cw = cornerWork[dp.corner];
        const pts: number[] = []; const cpts: number[] = []; const alpha: number[] = []; const fill = { pts: [] as number[], cpts: [] as number[] };
        const E = cw ? arms[dp.interval ? cw.bArm : cw.aArm] : undefined;
        const X = cw ? arms[dp.interval ? cw.aArm : cw.bArm] : undefined;
        if (cw && E && X) {
          const sideE = dp.interval ? cw.sideB : cw.sideA;
          const Bd = borders[E.pi][bIdx(sideE)];
          const pE = polys[E.pi];
          const bp = (s: number, out: Float64Array): void => {
            let target = s;
            if (pE.closed) { target = normS(pE, s); if (target < Bd.pts[0].s - 1e-9) target += pE.len; }
            let lo = 0; let hi = Bd.pts.length - 1;
            while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (Bd.pts[mid].s <= target) lo = mid; else hi = mid; }
            const qa = Bd.pts[lo]; const qb = Bd.pts[Math.min(Bd.pts.length - 1, lo + 1)];
            const dss = qb.s - qa.s;
            const t = dss > 1e-12 ? Math.min(1, Math.max(0, (target - qa.s) / dss)) : 0;
            out[0] = qa.x + (qb.x - qa.x) * t; out[1] = qa.y + (qb.y - qa.y) * t;
          };
          endTailPts({
            pE, dirE: E.dir, endS: E.sR, sT: dp.interval ? cw.sB : cw.sA, x0: dp.interval ? cw.tbx : cw.tax, y0: dp.interval ? cw.tby : cw.tay, bp,
            pX: polys[X.pi], sRX: X.sR, dirX: X.dir, LX: X.L, LcutX: X.Lcut,
            zE: (s) => depthAt(E.pi, s), zX: (s) => depthAt(X.pi, s), h, zt: 0.1 * scene.look.depthAmp, W: scene.look.band,
          }, pts, cpts, alpha, fill);
        }
        pieces.push({ kind: "tail", chain: dp.chain, side: cw ? (dp.interval ? cw.sideB : cw.sideA) : 0, s0: cw ? (dp.interval ? cw.sB : cw.sA) : 0, s1: cw ? (dp.interval ? cw.sB : cw.sA) : 0, pts, cpts, region: -1, corner: dp.corner, alpha, fpts: fill.pts, fcpts: fill.cpts });
      } else {
        const ci = capInfos[dp.cap];
        if (!ci) continue;
        const pts: number[] = []; const cpts: number[] = [];
        // The cap is its whole arc, at this frame's end positions.
        for (const q of ci.arc) { pts.push(q.x, q.y); cpts.push(ci.cx, ci.cy); }
        const piece: OutlinePiece = { kind: "cap", chain: dp.chain, side: 0, s0: ci.station.cS, s1: ci.station.cS, pts, cpts, region: -1, corner: -1 };
        pieces.push(piece);
      }
    }
    if (runMiss || runPassed) diagnostics.push(`frame runs: ${runMiss} ends without points, ${runPassed} passed ${runMissKeys.join(" ")}`);
  }
  borders.forEach((bs, pi) => {
    bs.forEach((B, bi) => {
      const side = bi === 0 ? 1 : -1;
      const exp = exposed[pi][bi];
      if (frameMode) { return; }
      if (false) {
        // One piece per stretch of border between feature points
        // (cuts, corner tangents, station points, fold points): the
        // diagram's piece list for this border. Inside a stretch,
        // exposed border points draw in order; a covered or trimmed
        // stretch of segments shrinks onto the stretch's nearest
        // exposed border point (or, when the whole stretch is
        // covered, onto the covering chain's nearest border point).
        // Run ends therefore slide segment by segment with the frame,
        // and a covered piece shrinks toward zero length without any
        // piece being added, removed or reordered.
        const feats = new Set<number>();
        stations.forEach((st) => {
          if (st.left.pi === pi && bIdx(st.left.side) === bi) feats.add(st.left.idx);
          if (st.right.pi === pi && bIdx(st.right.side) === bi) feats.add(st.right.idx);
        });
        cornerWork.forEach((cw) => {
          if (cw.refA && cw.refA.pi === pi && bIdx(cw.refA.side) === bi) feats.add(cw.refA.idx);
          if (cw.refB && cw.refB.pi === pi && bIdx(cw.refB.side) === bi) feats.add(cw.refB.idx);
        });
        arms.forEach((a, ai) => {
          void a;
          const np = armNextPt[ai]; if (np && np.pi === pi && bIdx(np.side) === bi) feats.add(np.idx);
          const pp = armPrevPt[ai]; if (pp && pp.pi === pi && bIdx(pp.side) === bi) feats.add(pp.idx);
        });
        B.pts.forEach((pt, idx) => { const k = pt.rec?.k; if (k === 3 || k === 4) feats.add(idx); });
        const nP = B.pts.length;
        const fs = [...feats].filter((i) => i >= 0 && i < nP).sort((x, y) => x - y);
        const ranges: number[][] = [];
        if (nP >= 2) {
          if (fs.length === 0) ranges.push(Array.from({ length: nP }, (_, i) => i));
          else {
            for (let q = 0; q + 1 < fs.length; q++) { const r: number[] = []; for (let i = fs[q]; i <= fs[q + 1]; i++) r.push(i); ranges.push(r); }
            const head: number[] = []; for (let i = 0; i <= fs[0]; i++) head.push(i);
            const tail: number[] = []; for (let i = fs[fs.length - 1]; i < nP; i++) tail.push(i);
            if (B.closed && fs.length >= 2) {
              // One wrap stretch: tail then head (pts[nP-1] duplicates pts[0]).
              ranges.push([...tail, ...head.slice(1)]);
            } else {
              if (head.length >= 2) ranges.push(head);
              if (tail.length >= 2) ranges.push(tail);
            }
          }
        }
        for (const range of ranges) {
          if (range.length < 2) continue;
          // Exposed segments of this stretch (segment = consecutive
          // border indices; the wrap pair duplicates a point).
          const segExp: boolean[] = [];
          for (let m = 0; m + 1 < range.length; m++) {
            const si = range[m];
            segExp.push(si + 1 === range[m + 1] ? !!exp[si] : true);
          }
          const firstExp = segExp.indexOf(true);
          const pts: number[] = []; const cpts: number[] = [];
          const pushPt = (idx: number): void => {
            const pt = B.pts[idx];
            const l = pts.length;
            if (l >= 2 && pts[l - 2] === pt.x && pts[l - 1] === pt.y) return;
            pts.push(pt.x, pt.y);
            const f = pt.fx !== undefined ? [pt.fx, pt.fy as number] : footFlat(pi, pt.s);
            cpts.push(f[0], f[1]);
          };
          const pushXY = (x: number, y: number, s: number): void => {
            pts.push(x, y);
            const f = footFlat(pi, s);
            cpts.push(f[0], f[1]);
          };
          if (firstExp < 0) {
            const si = range[0];
            const midS = B.pts[si].s + (B.pts[Math.min(nP - 1, si + 1)].s - B.pts[si].s) / 2;
            // Collapse onto the covering chain's exposed border
            // point; failing that, this border's nearest exposed
            // point (where this border emerges).
            let bx = collapseX[pi][bi][si]; let by = collapseY[pi][bi][si];
            let bd = collapseOk[pi][bi][si] ? -1 : Infinity;
            const mx = (B.pts[si].x + B.pts[Math.min(nP - 1, si + 1)].x) / 2;
            const my = (B.pts[si].y + B.pts[Math.min(nP - 1, si + 1)].y) / 2;
            for (let q = bd < 0 ? -1 : range[0] - 1; q >= Math.max(0, range[0] - nP); q--) {
              if (!exp[q]) continue;
              bx = (B.pts[q].x + B.pts[q + 1].x) / 2; by = (B.pts[q].y + B.pts[q + 1].y) / 2;
              bd = (bx - mx) * (bx - mx) + (by - my) * (by - my);
              break;
            }
            for (let q = bd < 0 ? exp.length : range[range.length - 1]; q < Math.min(exp.length, range[range.length - 1] + nP); q++) {
              if (!exp[q]) continue;
              const cx2 = (B.pts[q].x + B.pts[q + 1].x) / 2; const cy2 = (B.pts[q].y + B.pts[q + 1].y) / 2;
              const d = (cx2 - mx) * (cx2 - mx) + (cy2 - my) * (cy2 - my);
              if (d < bd) { bd = d; bx = cx2; by = cy2; }
              break;
            }
            pushXY(bx, by, midS);
          } else {
            let lastExpEnd = -1;
            for (let m = 0; m < segExp.length; m++) if (segExp[m]) lastExpEnd = m;
            for (let m = 0; m < range.length; m++) {
              const idx = range[m];
              const segBefore = m > 0 ? segExp[m - 1] : false;
              const segAfter = m < segExp.length ? segExp[m] : false;
              if (segBefore || segAfter) { pushPt(idx); continue; }
              // Covered point: shrink onto the nearest exposed point.
              const src = m <= firstExp ? range[firstExp] : range[lastExpEnd + 1];
              pushPt(src);
            }
          }
          if (pts.length < 2) continue;
          const rid = segRegion[pi][bi][range[Math.max(0, firstExp)]];
          const piece: OutlinePiece = { kind: "run", chain: pi, side, s0: B.pts[range[0]].s, s1: B.pts[range[range.length - 1]].s, pts, cpts, region: rid, corner: -1 };
          pieces.push(piece);
          if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
        }
        return;
      }
      let cur: OutlinePiece | null = null;
      const flush = (): void => { if (cur && cur.pts.length >= 4) { pieces.push(cur); if (cur.region >= 0 && regions[cur.region]) regions[cur.region].pieces.push(pieces.length - 1); } cur = null; };
      for (let i = 0; i + 1 < B.pts.length; i++) {
        if (!exp[i]) { flush(); continue; }
        const rid = segRegion[pi][bi][i];
        if (!cur || cur.region !== rid) {
          flush();
          const q0 = B.pts[i]; const f0 = q0.fx !== undefined ? [q0.fx, q0.fy as number] : footFlat(pi, q0.s);
          cur = { kind: "run", chain: pi, side, s0: B.pts[i].s, s1: B.pts[i + 1].s, pts: [B.pts[i].x, B.pts[i].y], cpts: [f0[0], f0[1]], region: rid, corner: -1 };
        }
        cur.pts.push(B.pts[i + 1].x, B.pts[i + 1].y);
        const q1 = B.pts[i + 1]; const f1 = q1.fx !== undefined ? [q1.fx, q1.fy as number] : footFlat(pi, q1.s);
        cur.cpts.push(f1[0], f1[1]);
        cur.s1 = B.pts[i + 1].s;
      }
      flush();
    });
  });
  cornerWork.forEach((cw, ci) => {
    if (frameMode) return;
    if (frameMode && (!cw.ok || !(cw.r > 1e-9))) {
      const rid = junctionRegion.get(cw.ji) ?? -1;
      // Collapse onto the nearest exposed border point of the two
      // arms (the tangent point itself when the corner is feasible).
      let ax = cw.tax; let ay = cw.tay;
      if (!cw.ok) {
        // Collapse onto a neighbouring successful corner's tangent
        // point on the shared arm (a point the outline already
        // samples); fall back to the nearest exposed segment
        // midpoint on the two arms' borders.
        let foundArc = false;
        for (const nci of [ci - 1, ci + 1]) {
          const nc = cornerWork[nci];
          if (!nc || nc.ji !== cw.ji || !nc.ok || !(nc.r > 1e-9)) continue;
          if (nc.aArm === cw.bArm) { ax = nc.tax; ay = nc.tay; foundArc = true; }
          else if (nc.bArm === cw.aArm) { ax = nc.tbx; ay = nc.tby; foundArc = true; }
          if (foundArc) break;
        }
        let bd = foundArc ? -1 : Infinity;
        for (const ref of [cw.refA, cw.refB]) {
          if (!ref || ref.idx < 0) continue;
          const B = borders[ref.pi][bIdx(ref.side)];
          const exp = exposed[ref.pi][bIdx(ref.side)];
          for (let q = Math.max(0, ref.idx - 48); q <= Math.min(exp.length - 1, ref.idx + 48); q++) {
            if (!exp[q]) continue;
            const cx2 = (B.pts[q].x + B.pts[q + 1].x) / 2; const cy2 = (B.pts[q].y + B.pts[q + 1].y) / 2;
            const d = (cx2 - cw.qx) * (cx2 - cw.qx) + (cy2 - cw.qy) * (cy2 - cw.qy);
            if (d < bd) { bd = d; ax = cx2; ay = cy2; }
          }
        }
      }
      const piece: OutlinePiece = { kind: "arc", chain: cw.aChain, side: 0, s0: cw.sA, s1: cw.sB, pts: [ax, ay], cpts: [cw.qx, cw.qy], region: rid, corner: ci };
      pieces.push(piece);
      if (rid >= 0) regions[rid].pieces.push(pieces.length - 1);
      return;
    }
    if (!cw.ok || !(cw.r > 1e-9)) return;
    const aA = Math.atan2(cw.tay - cw.qy, cw.tax - cw.qx);
    let da = Math.atan2(cw.tby - cw.qy, cw.tbx - cw.qx) - aA;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
    const pts: number[] = []; const cpts: number[] = [];
    for (let s = 0; s <= steps; s++) {
      const a = aA + (da * s) / steps;
      pts.push(cw.qx + cw.r * Math.cos(a), cw.qy + cw.r * Math.sin(a));
      cpts.push(cw.qx, cw.qy);
    }
    const rid = junctionRegion.get(cw.ji) ?? -1;
    const piece: OutlinePiece = { kind: "arc", chain: cw.aChain, side: 0, s0: cw.sA, s1: cw.sB, pts, cpts, region: rid, corner: ci };
    pieces.push(piece);
    if (rid >= 0) regions[rid].pieces.push(pieces.length - 1);
  });
  const capCoverPi: Int16Array[] = capInfos.map((ci) => new Int16Array(Math.max(0, ci.arc.length - 1)).fill(-1));
  const capCoverS: Float32Array[] = capInfos.map((ci) => new Float32Array(Math.max(0, ci.arc.length - 1)));
  for (let capIdx = 0; capIdx < capInfos.length; capIdx++) { const ci = capInfos[capIdx];
    if (frameMode) continue;
    // Frame mode also uses these runs: the builder's own cap pieces.
    const pi = ci.station.pi; let curStart = -1; let curEnd = -1;
    let cur: OutlinePiece | null = null;
    const flush = (): void => { if (cur && cur.pts.length >= 4) { pieces.push(cur); capRuns[capIdx].push([curStart, curEnd]); } cur = null; };
    for (let i = 0; i + 1 < ci.arc.length; i++) {
      const a = ci.arc[i]; const b = ci.arc[i + 1];
      const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
      const covC = covering(mx, my, pi, ci.station.cS);
      if (covC) { if (coverPickPi.length > 0) { capCoverPi[capIdx][i] = coverPickPi[coverPickPi.length - 1]; capCoverS[capIdx][i] = coverPickS[coverPickS.length - 1]; } flush(); continue; }
      if (!cur) { curStart = i; cur = { kind: "cap", chain: pi, side: 0, s0: ci.station.cS, s1: ci.station.cS, pts: [a.x, a.y], cpts: [ci.cx, ci.cy], region: -1, corner: -1 }; }
      cur.pts.push(b.x, b.y);
      cur.cpts.push(ci.cx, ci.cy); curEnd = i + 1;
    }
    flush();
  }
  // Assign cap/run pieces with no region to the region they bound by
  // proximity of their first point to a region polygon is unnecessary:
  // draw and the checks read geometry only. Keep region as set above.

  // Faces ordered under-first so the over face paints last in overlaps.
  const faces: OutlineFace[] = faceWorks
    .slice()
    .sort((a, b) => a.depth - b.depth)
    .map((f) => ({ ownerChain: f.owner, group: f.group, pts: f.pts, sample: f.sample, hole: false }));

  // Reach counts: crossings inside a junction span, arcs near a thread.
  let crossInJunction = 0;
  scene.crossings.forEach((x) => {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) return;
    if (memberGroup(ia, x.a.s) >= 0 || memberGroup(ib, x.b.s) >= 0) crossInJunction++;
  });
  let arcNearThread = 0;
  for (const cw of cornerWork) {
    if (!cw.ok || !(cw.r > 0)) continue;
    // Another centre coming within h+r of q (its tube reaching the arc).
    let near = false;
    const R = h + cw.r;
    const cx = Math.floor(cw.qx / cell); const cy = Math.floor(cw.qy / cell);
    const rad = Math.ceil(R / cell) + 1;
    outer2: for (let ix = cx - rad; ix <= cx + rad; ix++) for (let iy = cy - rad; iy <= cy + rad; iy++) {
      for (const e of grid.get(gkey(ix, iy)) ?? []) {
        if (e.pi === cw.aChain || e.pi === cw.bChain) continue;
        const p = polys[e.pi];
        const b = e.k + 1 === p.n ? 0 : e.k + 1;
        const ex = p.x[b] - p.x[e.k]; const ey = p.y[b] - p.y[e.k];
        const l2 = ex * ex + ey * ey;
        let t = l2 > 0 ? ((cw.qx - p.x[e.k]) * ex + (cw.qy - p.y[e.k]) * ey) / l2 : 0;
        t = Math.min(1, Math.max(0, t));
        if (Math.hypot(p.x[e.k] + ex * t - cw.qx, p.y[e.k] + ey * t - cw.qy) < R) { near = true; break outer2; }
      }
    }
    if (near) arcNearThread++;
  }
  diagnostics.push(`crossings in a junction span ${crossInJunction}, corner arcs near another thread ${arcNearThread}`);
  diagnostics.push(`chains ${nCh}, pieces ${pieces.length}, regions ${regions.length}, faces ${faces.length}, corners ${corners.filter((c) => c.ok).length}/${corners.length} ok, cuts ${cuts.length}, stations ${stations.length}`);
    // S3: record this build's decisions as an OutlineStructure. Point
  // recipes reference border points by object identity (the rebuild
  // above keeps identity), so frame() can re-evaluate each kept point
  // from a later frame's centrelines. Segment-intersection points
  // (kind 4: crossing and eye cuts) that are neither referenced by a
  // station/corner nor a transition of exposure or region are pruned:
  // near-coincident facing borders in an eye cross at almost every
  // sample, and those interior splits change no piece endpoint.
  const extractStructure = (): OutlineStructure => {
    const borderIdxOf = (pi: number, side: number): number => pi * 2 + (side === 1 ? 0 : 1);
    let recMissing = 0;
    interface PoolB { map: Map<BPt, number>; kind: number[]; i1: number[]; i2: number[]; i3: number[]; i4: number[]; other: number[]; f: number[]; sOff: number[]; eye: number[]; win: number[] }
    const pools: PoolB[] = [];
    for (let i = 0; i < polys.length * 2; i++) pools.push({ map: new Map(), kind: [], i1: [], i2: [], i3: [], i4: [], other: [], f: [], sOff: [], eye: [], win: [] });
    const winOf = (a: BPt, b2: BPt, c: BPt, d: BPt): number => {
      const ex = b2.x - a.x; const ey = b2.y - a.y; const fx = d.x - c.x; const fy = d.y - c.y;
      const la = Math.hypot(ex, ey) || 1; const lb = Math.hypot(fx, fy) || 1;
      const sinPhi = Math.min(1, Math.abs(ex * fy - ey * fx) / (la * lb));
      return Math.min(14 * h, h / Math.max(sinPhi, 0.15) + 2 * h);
    };
    const borderSegEnc = (b: number, s: number): number => {
      const base = basePtsSnap[b >> 1][b & 1];
      if (base.length < 2) return 0;
      let lo = 0; let hi = base.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (base[mid].s <= s) lo = mid; else hi = mid; }
      const ds = base[lo + 1].s - base[lo].s;
      const tt = ds > 1e-12 ? Math.min(1, Math.max(0, (s - base[lo].s) / ds)) : 0;
      return lo + tt;
    };
    const assign = (b: number, pt: BPt): number => {
      const P = pools[b];
      const ex = P.map.get(pt);
      if (ex !== undefined) return ex;
      const id = P.kind.length;
      P.map.set(pt, id);
      P.kind.push(0); P.i1.push(0); P.i2.push(0); P.i3.push(0); P.i4.push(0); P.other.push(-1); P.f.push(0); P.sOff.push(0); P.eye.push(-1); P.win.push(0);
      const rec = pt.rec;
      if (!rec) { P.kind[id] = 6; P.f[id] = borderSegEnc(b, pt.s); recMissing++; return id; }
      P.kind[id] = rec.k;
      if (rec.k === 0) { P.i1[id] = rec.v; P.i2[id] = rec.seg; P.sOff[id] = rec.sOff ?? 0; }
      else if (rec.k === 1) { P.i1[id] = rec.v; P.sOff[id] = rec.sOff ?? 0; }
      else if (rec.k === 2) { P.i1[id] = rec.v; P.f[id] = rec.u; P.sOff[id] = rec.sOff ?? 0; }
      else if (rec.k === 3) { P.i1[id] = assign(b, rec.a); P.i2[id] = assign(b, rec.b); P.i3[id] = assign(b, rec.c); P.i4[id] = assign(b, rec.d); P.f[id] = rec.t; P.win[id] = winOf(rec.a, rec.b, rec.c, rec.d); }
      else if (rec.k === 4) { const ob = borderIdxOf(rec.otherPi, rec.otherSide); P.other[id] = ob; P.i1[id] = assign(b, rec.a); P.i2[id] = assign(b, rec.b); P.i3[id] = assign(ob, rec.c); P.i4[id] = assign(ob, rec.d); P.f[id] = rec.t; P.eye[id] = rec.eye; P.win[id] = winOf(rec.a, rec.b, rec.c, rec.d); }
      else if (rec.k === 5) { P.i1[id] = rec.corner; P.i2[id] = rec.which; }
      else { P.f[id] = borderSegEnc(b, rec.s); }
      return id;
    };
    const referenced: Set<number>[] = pools.map(() => new Set<number>());
    const markRef = (r: PtRef | null): void => { if (r && r.idx >= 0) referenced[borderIdxOf(r.pi, r.side)].add(r.idx); };
    stations.forEach((st) => { markRef(st.left); markRef(st.right); });
    cornerWork.forEach((cw) => { markRef(cw.refA); markRef(cw.refB); });
    arms.forEach((_a, ai) => { markRef(armNextPt[ai]); markRef(armPrevPt[ai]); });
    let segXTotal = 0; let segXKept = 0; let eyeTotal = 0; let eyeKeptTotal = 0; let nonUniform = 0;
    const eyeKeptMap = new Map<number, number>();
    const bordersOut: BorderStruct[] = [];
    borders.forEach((bs, pi) => {
      bs.forEach((B, bi) => {
        const b = borderIdxOf(pi, B.side);
        const fullPool = B.pts.map((pt) => assign(b, pt));
        const baseSeq = basePtsSnap[pi][bi].map((pt) => assign(b, pt));
        const exp = exposed[pi][bi];
        const segR = segRegion[pi][bi];
        const seqFull: number[] = []; const seqPool: number[] = [];
        for (let m = 0; m < B.pts.length; m++) {
          const pid = fullPool[m];
          const kind = pools[b].kind[pid];
          const eye = pools[b].eye[pid];
          if (kind === 4) { segXTotal++; if (eye >= 0) eyeTotal++; }
          let keep = true;
          if (kind === 4 && m > 0 && m < B.pts.length - 1 && !referenced[b].has(m)) keep = exp[m - 1] !== exp[m] || segR[m - 1] !== segR[m];
          if (keep) {
            seqFull.push(m); seqPool.push(pid);
            if (kind === 4) { segXKept++; if (eye >= 0) { eyeKeptTotal++; eyeKeptMap.set(eye, (eyeKeptMap.get(eye) ?? 0) + 1); } }
          }
        }
        const idxOfFull = new Int32Array(B.pts.length).fill(-1);
        seqFull.forEach((full, j) => { idxOfFull[full] = j; });
        const ccB = coverCand[pi][bi];
        const nSeqSeg = Math.max(0, seqFull.length - 1);
        const covPi = new Int16Array(nSeqSeg).fill(-1); const covS = new Float32Array(nSeqSeg);
        const covPi2 = new Int16Array(nSeqSeg).fill(-1); const covS2 = new Float32Array(nSeqSeg);
        const covPi3 = new Int16Array(nSeqSeg).fill(-1); const covS3 = new Float32Array(nSeqSeg);
        const covPi4 = new Int16Array(nSeqSeg).fill(-1); const covS4 = new Float32Array(nSeqSeg);
        for (let j = 0; j < nSeqSeg; j++) {
          const fs = seqFull[j];
          if (fs < ccB.pi.length) { covPi[j] = ccB.pi[fs]; covS[j] = ccB.s[fs]; covPi2[j] = ccB.pi2[fs]; covS2[j] = ccB.s2[fs]; covPi3[j] = ccB.pi3[fs]; covS3[j] = ccB.s3[fs]; covPi4[j] = ccB.pi4[fs]; covS4[j] = ccB.s4[fs]; }
        }
        const fExp = new Uint8Array(Math.max(0, seqFull.length - 1));
        const fSegR = new Int32Array(Math.max(0, seqFull.length - 1));
        for (let j = 0; j + 1 < seqFull.length; j++) {
          const fs = seqFull[j];
          fExp[j] = exp[fs] ? 1 : 0;
          fSegR[j] = segR[fs];
          for (let f = fs + 1; f < seqFull[j + 1]; f++) if (exp[f] !== exp[fs] || segR[f] !== segR[fs]) nonUniform++;
        }
        const runsArr: number[] = [];
        {
          let rStart = -1; let rReg = 0;
          for (let j = 0; j < fExp.length; j++) {
            if (!fExp[j]) { if (rStart >= 0) { runsArr.push(rStart, j, rReg); rStart = -1; } continue; }
            if (rStart < 0 || fSegR[j] !== rReg) { if (rStart >= 0) runsArr.push(rStart, j, rReg); rStart = j; rReg = fSegR[j]; }
          }
          if (rStart >= 0) runsArr.push(rStart, fExp.length, rReg);
        }
        const P = pools[b];
        bordersOut.push({
          kind: Uint8Array.from(P.kind), i1: Int32Array.from(P.i1), i2: Int32Array.from(P.i2), i3: Int32Array.from(P.i3), i4: Int32Array.from(P.i4),
          other: Int32Array.from(P.other), f: Float64Array.from(P.f), sOff: Float64Array.from(P.sOff), eye: Int32Array.from(P.eye), winS: Float64Array.from(P.win),
          baseSeq: Int32Array.from(baseSeq), seqPool: Int32Array.from(seqPool), seqFull: Int32Array.from(seqFull), idxOfFull, exposed: fExp, segRegion: fSegR, fullLen: B.pts.length, runs: Int32Array.from(runsArr),
          coverPi: covPi, coverS: covS, coverPi2: covPi2, coverS2: covS2, coverPi3: covPi3, coverS3: covS3, coverPi4: covPi4, coverS4: covS4,
        });
      });
    });
    let eyeMaxKept = 0;
    for (const v of eyeKeptMap.values()) eyeMaxKept = Math.max(eyeMaxKept, v);
    const capByStation = new Int32Array(stations.length).fill(-1);
    capInfos.forEach((ci, i) => { capByStation[stations.indexOf(ci.station)] = i; });
    const faceByRid: { kind: number; pi: number; cMid: number; ji: number; armS: number }[] = [];
    intervals.forEach((iv) => { if (iv.region >= 0) faceByRid[iv.region] = { kind: 0, pi: iv.pi, cMid: iv.cMid, ji: -1, armS: 0 }; });
    junctionRegion.forEach((rid, ji) => { const list = armsOfJ[ji]; if (list.length) faceByRid[rid] = { kind: 1, pi: -1, cMid: 0, ji, armS: arms[list[0]].sR }; });
    // Run boundaries where exposure flips at a plain border point:
    // record the covering candidates of the covered neighbour segment
    // (named once); frame slides the point to this frame's tube edge.
    const transitions: { b: number; j: number; pi: Int16Array; k: Int32Array }[] = [];
    {
      const seenT = new Set<string>();
      bordersOut.forEach((bs, b) => {
        const pi = b >> 1; const bi = b & 1;
        const ccB = coverCand[pi][bi];
        const nSeg = bs.exposed.length;
        const closedB = polys[pi].closed;
        const kindOf = (j: number): number => pools[b].kind[bs.seqPool[j]];
        const addTrans = (j: number, coveredSeqSeg: number): void => {
          const key = b + "|" + j;
          if (seenT.has(key)) return;
          if (coveredSeqSeg < 0 || coveredSeqSeg >= nSeg) return;
          const fs = bs.seqFull[coveredSeqSeg];
          if (fs < 0 || fs >= ccB.pi.length) return;
          const cp = ccB.byPi[fs];
          if (cp < 0 || cp >= polys.length) return;
          const piArr = new Int16Array(4).fill(-1); const kArr = new Int32Array(4).fill(-1);
          piArr[0] = cp; kArr[0] = segOfS(polys[cp], ccB.byS[fs]).k;
          seenT.add(key);
          transitions.push({ b, j, pi: piArr, k: kArr });
        };
        for (let r = 0; r + 2 < bs.runs.length; r += 3) {
          const start = bs.runs[r]; const end = bs.runs[r + 1];
          const prevSeg = start > 0 ? start - 1 : closedB ? nSeg - 1 : -1;
          if (prevSeg >= 0 && !bs.exposed[prevSeg] && kindOf(start) <= 2) addTrans(start, prevSeg);
          let nextSeg = -1;
          if (end < nSeg) nextSeg = end; else if (closedB) nextSeg = 0;
          if (nextSeg >= 0 && !bs.exposed[nextSeg] && kindOf(end) <= 2) addTrans(end, nextSeg);
        }
      });
    }
    const capTransitions: { cap: number; pt: number; pi: number; k: number }[] = [];
    capInfos.forEach((ci, capIdx) => {
      const steps = ci.arc.length - 1;
      for (const run of capRuns[capIdx]) {
        const bounds: [number, number][] = [];
        if (run[0] > 0) bounds.push([run[0], run[0] - 1]);
        if (run[1] < steps) bounds.push([run[1], run[1]]);
        for (const [pt, seg] of bounds) {
          const cp = capCoverPi[capIdx][seg];
          if (cp < 0 || cp >= polys.length) continue;
          if (capTransitions.some((c) => c.cap === capIdx && c.pt === pt)) continue;
          capTransitions.push({ cap: capIdx, pt, pi: cp, k: segOfS(polys[cp], capCoverS[capIdx][seg]).k });
        }
      }
    });
    return {
      chainIds: scene.chains.map((c) => c.id),
      extSpec: extSpec.map((e) => ({ start: e.start ? { ...e.start } : undefined, end: e.end ? { ...e.end } : undefined })),
      borders: bordersOut,
      arms: arms.map((a) => ({ ji: a.ji, ei: a.ei, pi: a.pi, sR: a.sR, dir: a.dir, kind: a.kind, L: a.L, g: a.g })),
      armsOfJ: armsOfJ.map((l) => l.slice()),
      armPts: arms.map((_a, ai) => ({
        prevB: armPrevPt[ai] ? borderIdxOf(armPrevPt[ai]!.pi, armPrevPt[ai]!.side) : -1, prevFull: armPrevPt[ai] ? armPrevPt[ai]!.idx : -1, prevSide: armPrevSide[ai],
        nextB: armNextPt[ai] ? borderIdxOf(armNextPt[ai]!.pi, armNextPt[ai]!.side) : -1, nextFull: armNextPt[ai] ? armNextPt[ai]!.idx : -1, nextSide: armNextSide[ai],
      })),
      corners: cornerWork.map((cw, ci) => ({ ji: cw.ji, aArm: cw.aArm, bArm: cw.bArm, sideA: cw.sideA, sideB: cw.sideB, style: cw.style, ok: cw.ok, why: cw.why, theta: cw.theta, r: cw.r, sA: cw.sA, sB: cw.sB, vKa: cw.vKa ?? -1, vKb: cw.vKb ?? -1, qKa: cw.qKa ?? -1, qKb: cw.qKb ?? -1, vSa: cw.vSa ?? cw.sA, vSb: cw.vSb ?? cw.sB, stored: { ...corners[ci] } })),
      stations: stations.map((st) => ({ pi: st.pi, cS: st.cS, kind: st.kind, key: st.key, leftB: borderIdxOf(st.left.pi, st.left.side), leftFull: st.left.idx, rightB: borderIdxOf(st.right.pi, st.right.side), rightFull: st.right.idx })),
      intervals: intervals.map((iv) => ({ pi: iv.pi, aSt: stations.indexOf(iv.A), bSt: stations.indexOf(iv.B), cMid: iv.cMid, discard: iv.discard, group: iv.region >= 0 ? regions[iv.region].group : -1, rid: iv.region })),
      caps: capInfos.map((ci, i) => ({ pi: ci.station.pi, station: stations.indexOf(ci.station), atEnd: ci.atEnd, steps: ci.arc.length - 1, runs: capRuns[i].map((r) => [r[0], r[1]] as [number, number]) })),
      capByStation,
      faces: faceWorks.map((fw, i) => ({ rid: i, owner: fw.owner, group: fw.group, ...(faceByRid[i] ?? { kind: 0, pi: fw.owner, cMid: 0, ji: -1, armS: 0 }) })),
      cuts: cuts.map((c, i) => ({ crossing: c.crossing, chain: c.chain, side: c.side, overChain: c.overChain, border: cutRefs[i].border, fullIdx: cutRefs[i].ref.idx })),
      transitions,
      capTransitions,
      groupOfJ: groupOfJ.slice(),
      stats: { eyeCount, eyeTotal, eyeKept: eyeKeptTotal, eyeMaxKept, tieCutCount, kinkCount, crossInJunction, arcNearThread, segXTotal, segXKept, nonUniform, recMissing },
    };
  };

  profMark("piecesCapsEtc");
  const structOut = frameMode ? (dg as unknown as OutlineStructure) : extractStructure();
  const table: OutlineTable = { h, W, pieces, regions, faces, corners, cuts, diagnostics };
  return { table, debug: { arms: arms.map((a) => ({ ji: a.ji, pi: a.pi, sR: a.sR, dir: a.dir, L: a.L, Lcut: a.Lcut, ang: a.ang })), groups: groupOfJ }, structure: structOut };
}









// ---------------------------------------------------------------------------
// S3: structure (once per scene) and frame (positions only, per frame).

export interface BorderStruct {
  kind: Uint8Array; i1: Int32Array; i2: Int32Array; i3: Int32Array; i4: Int32Array;
  other: Int32Array; f: Float64Array; sOff: Float64Array; eye: Int32Array;
  winS: Float64Array;
  baseSeq: Int32Array; seqPool: Int32Array; seqFull: Int32Array; idxOfFull: Int32Array;
  exposed: Uint8Array; segRegion: Int32Array; fullLen: number; runs: Int32Array;
  coverPi: Int16Array; coverS: Float32Array; coverPi2: Int16Array; coverS2: Float32Array; coverPi3: Int16Array; coverS3: Float32Array; coverPi4: Int16Array; coverS4: Float32Array;
}
export interface ArmStruct { ji: number; ei: number; pi: number; sR: number; dir: number; kind: string; L: number; g: number }
export interface CornerStruct {
  ji: number; aArm: number; bArm: number; sideA: number; sideB: number; style: number;
  ok: boolean; why?: string; theta: number; r: number; sA: number; sB: number;
  vKa: number; vKb: number; qKa: number; qKb: number; vSa: number; vSb: number; stored: OutlineCorner;
}
export interface StationStruct { pi: number; cS: number; kind: string; key: string; leftB: number; leftFull: number; rightB: number; rightFull: number }
export interface IntervalStruct { pi: number; aSt: number; bSt: number; cMid: number; discard: boolean; group: number; rid: number }
export interface CapStruct { pi: number; station: number; atEnd: boolean; steps: number; runs: [number, number][] }
export interface FaceStruct { rid: number; owner: number; group: number; kind: number; pi: number; cMid: number; ji: number; armS: number }
export interface CutStruct { crossing: number; chain: number; side: number; overChain: number; border: number; fullIdx: number }
export interface OutlineStructure {
  chainIds: number[];
  extSpec: { start?: { throughPi: number; throughS: number; armS: number }; end?: { throughPi: number; throughS: number; armS: number } }[];
  borders: BorderStruct[];
  arms: ArmStruct[];
  armsOfJ: number[][];
  armPts: { prevB: number; prevFull: number; prevSide: number; nextB: number; nextFull: number; nextSide: number }[];
  corners: CornerStruct[];
  stations: StationStruct[];
  intervals: IntervalStruct[];
  caps: CapStruct[];
  capByStation: Int32Array;
  faces: FaceStruct[];
  cuts: CutStruct[];
  transitions: { b: number; j: number; pi: Int16Array; k: Int32Array }[];
  capTransitions: { cap: number; pt: number; pi: number; k: number }[];
  groupOfJ: number[];
  stats: { eyeCount: number; eyeTotal: number; eyeKept: number; eyeMaxKept: number; tieCutCount: number; kinkCount: number; crossInJunction: number; arcNearThread: number; segXTotal: number; segXKept: number; nonUniform: number; recMissing: number };
}

export interface DiagramStation { pi: number; key: string; kind: string; sKey: number; crossing: number; arm: number }
export interface DiagramInterval { pi: number; aSt: number; bSt: number; discard: boolean }
export interface DiagramPiece { kind: PieceKind; chain: number; side: number; corner: number; interval: number; cap: number }
export interface DiagramStructure {
  chainIds: number[];
  closed: boolean[];
  nPts: number[];
  crossings: { aPi: number; bPi: number; over: "a" | "b"; emergent: boolean; sUnder: number; sOver: number }[];
  arms: { ji: number; ei: number; pi: number; kind: string; dir: number; s: number }[];
  armsOfJ: number[][];
  corners: { ji: number; aArm: number; bArm: number; style: number; thru?: 1 }[];
  groupOfJ: number[];
  caps: { pi: number; atEnd: boolean; capInfo?: number }[];
  stationsD: DiagramStation[];
  intervalsD: DiagramInterval[];
  piecesD: DiagramPiece[];
}

/** The diagram of a scene: chains and their point counts, crossings
 *  and which pass is over, junction arms in their listed (cyclic)
 *  order with a corner for every adjacent pair, corner styles, caps.
 *  No position, length, angle or arc-length value of any chain point
 *  is read: arm and crossing s values enter only as identities (which
 *  pass of a chain an arm belongs to, root order along a chain). */
export function diagramOf(scene: SceneIn): DiagramStructure {
  const idxOf = new Map<number, number>();
  scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  const arms: DiagramStructure["arms"] = [];
  const armsOfJ: number[][] = [];
  const corners: DiagramStructure["corners"] = [];
  scene.junctions.forEach((j, ji) => {
    const list: number[] = [];
    j.arms.forEach((a, ei) => {
      const pi = idxOf.get(a.chain);
      if (pi === undefined) return;
      list.push(arms.length);
      arms.push({ ji, ei, pi, kind: a.kind, dir: a.dir, s: a.s });
    });
    armsOfJ.push(list);
    const n = list.length;
    for (let k = 0; k < n; k++) {
      const ai = list[k]; const bi = list[(k + 1) % n];
      const A = arms[ai]; const B = arms[bi];
      const xa = j.arms[A.ei]; const xb = j.arms[B.ei];
      // K1314 s3 (K1049): the two arms of one through pass are one tube, but
      // its bend's inner side rounds like any corner (Levi's "Rounded corner",
      // form B's S1b/S1c fillet). The pair is a corner flagged thru: solved
      // as one when its sweep is under pi, else dead (cornersPhaseC).
      const thru = !!(xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && xa.s === xb.s);
      const dc: { ji: number; aArm: number; bArm: number; style: number; thru?: 1 } = { ji, aArm: ai, bArm: bi, style: j.corners?.[k]?.style === "sharp" ? 0 : 1 };
      if (thru) dc.thru = 1;
      corners.push(dc);
    }
  });
  // Junction groups: junctions joined by a run with no crossing
  // between their roots (root and pass order from the scene's s data).
  const nj = scene.junctions.length;
  const parent = Array.from({ length: nj }, (_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  const rootsOf = new Map<number, { s: number; ji: number }[]>();
  scene.junctions.forEach((j, ji) => {
    for (const a of j.arms) {
      const pi = idxOf.get(a.chain);
      if (pi === undefined) continue;
      const l = rootsOf.get(pi) ?? [];
      if (!l.some((q) => q.s === a.s && q.ji === ji)) l.push({ s: a.s, ji });
      rootsOf.set(pi, l);
    }
  });
  const passSOf = new Map<number, number[]>();
  for (const x of scene.crossings) {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia !== undefined) { const l = passSOf.get(ia) ?? []; l.push(x.a.s); passSOf.set(ia, l); }
    if (ib !== undefined) { const l = passSOf.get(ib) ?? []; l.push(x.b.s); passSOf.set(ib, l); }
  }
  rootsOf.forEach((roots, pi) => {
    const r = roots.slice().sort((a, b) => a.s - b.s);
    const ps = passSOf.get(pi) ?? [];
    const closed = scene.chains[pi]?.closed ?? false;
    const between = (a: number, b: number): boolean => ps.some((s) => s > a && s < b);
    for (let i = 0; i + 1 < r.length; i++) if (!between(r[i].s, r[i + 1].s)) parent[find(r[i].ji)] = find(r[i + 1].ji);
    if (closed && r.length > 1) {
      const a = r[r.length - 1].s; const b = r[0].s;
      const wrapped = ps.some((s) => s > a || s < b);
      if (!wrapped) parent[find(r[r.length - 1].ji)] = find(r[0].ji);
    }
  });
  const gidOf = new Map<number, number>();
  const groupOfJ: number[] = scene.junctions.map((_, ji) => {
    const r = find(ji);
    if (!gidOf.has(r)) gidOf.set(r, gidOf.size);
    return gidOf.get(r)!;
  });
  const caps: DiagramStructure["caps"] = [];
  const capInfoOf: number[] = [];
  scene.chains.forEach((c, pi) => {
    if (c.closed) return;
    for (const atEnd of [false, true]) {
      const infoIdx = capInfoOf.length; capInfoOf.push(infoIdx);
      const joined = arms.some((a) => {
        if (a.pi !== pi || a.kind !== "end") return false;
        const xa = scene.junctions[a.ji] && scene.junctions[a.ji].arms[a.ei];
        return xa ? (atEnd ? xa.s !== 0 : xa.s === 0) : false;
      });
      if (!joined) caps.push({ pi, atEnd, capInfo: infoIdx } as { pi: number; atEnd: boolean });
    }
  });
  // S3f: the piece list is the diagram's. Stations are the diagram
  // features that delimit runs (crossing cuts, junction arms, open
  // ends, the closed seam) in the builder's key order; sKey orders
  // them along their chain from the scene's own s data (which pass
  // and root order, never a chain point coordinate).
  const stationsD: DiagramStation[] = [];
  scene.crossings.forEach((x, xi) => {
    const aPi = idxOf.get(x.a.chain); const bPi = idxOf.get(x.b.chain);
    if (aPi === undefined || bPi === undefined) return;
    const underPi = x.over === "a" ? bPi : aPi;
    const overPi = x.over === "a" ? aPi : bPi;
    const sUnder = x.over === "a" ? x.b.s : x.a.s;
    const sOver = x.over === "a" ? x.a.s : x.b.s;
    // The under chain's borders are cut where they enter and where they
    // leave the over chain's tube: frame() orders a border's two cuts
    // along the chain. The over chain is not split: its borders run on.
    void overPi; void sOver;
    stationsD.push({ pi: underPi, key: "x" + xi + "|in", kind: "cross", sKey: sUnder, crossing: xi, arm: -1 });
    stationsD.push({ pi: underPi, key: "x" + xi + "|out", kind: "cross", sKey: sUnder, crossing: xi, arm: -1 });
  });
  arms.forEach((a, ai) => {
    const j = scene.junctions[a.ji];
    stationsD.push({ pi: a.pi, key: "j" + a.ji + "|a" + ai, kind: "junction", sKey: j && j.arms[a.ei] ? j.arms[a.ei].s : 0, crossing: -1, arm: ai });
  });
  scene.chains.forEach((c, pi) => {
    // A closed chain's runs wrap past s = 0; only a loop with no other
    // feature needs the seam, as its one run's two ends.
    if (c.closed) { if (!stationsD.some((q) => q.pi === pi)) stationsD.push({ pi, key: "seam" + pi, kind: "seam", sKey: 0, crossing: -1, arm: -1 }); }
    else {
      stationsD.push({ pi, key: "cap" + pi + "|0", kind: "capStart", sKey: -1e12, crossing: -1, arm: -1 });
      stationsD.push({ pi, key: "cap" + pi + "|1", kind: "capEnd", sKey: 1e12, crossing: -1, arm: -1 });
    }
  });
  const intervalsD: DiagramInterval[] = [];
  const perChainIntervals: number[][] = scene.chains.map(() => []);
  scene.chains.forEach((c, pi) => {
    // Ties in s keep the diagram's own order: a crossing's entry before
    // its exit, a through pass's backward arm before its forward one.
    const rank = (q: DiagramStation): number => (q.kind === "cross" ? (q.key.endsWith("|in") ? 0 : 1) : q.kind === "junction" && arms[q.arm] ? (arms[q.arm].dir < 0 ? 0 : 1) : 0);
    const list = stationsD.map((s, i) => ({ s, i })).filter((q) => q.s.pi === pi).sort((a, b) => a.s.sKey - b.s.sKey || rank(a.s) - rank(b.s)).map((q) => q.i);
    const m = list.length;
    const isDiscard = (ia: number, ib: number): boolean => {
      const A = stationsD[ia]; const B = stationsD[ib];
      if (A.kind === "cross" && B.kind === "cross" && A.crossing >= 0 && A.crossing === B.crossing) return true;
      if (A.kind === "junction" && B.kind === "junction") {
        const a1 = arms[A.arm]; const a2 = arms[B.arm];
        if (a1 && a2 && a1.ji === a2.ji && a1.kind === "through" && a2.kind === "through") {
          const xa = scene.junctions[a1.ji] && scene.junctions[a1.ji].arms[a1.ei];
          const xb = scene.junctions[a2.ji] && scene.junctions[a2.ji].arms[a2.ei];
          if (xa && xb && xa.s === xb.s) return true;
        }
      }
      const jst = A.kind === "junction" ? A : B.kind === "junction" ? B : null;
      const cst = A.kind.startsWith("cap") ? A : B.kind.startsWith("cap") ? B : null;
      if (jst && cst && jst.pi === cst.pi) { const ja = arms[jst.arm]; if (ja && ja.kind === "end") return true; }
      return false;
    };
    if (c.closed) {
      if (m === 1) { perChainIntervals[pi].push(intervalsD.length); intervalsD.push({ pi, aSt: list[0], bSt: list[0], discard: false }); }
      else for (let k = 0; k < m; k++) { const ia = list[k]; const ib = list[(k + 1) % m]; perChainIntervals[pi].push(intervalsD.length); intervalsD.push({ pi, aSt: ia, bSt: ib, discard: isDiscard(ia, ib) }); }
    } else {
      for (let k = 0; k + 1 < m; k++) { const ia = list[k]; const ib = list[k + 1]; perChainIntervals[pi].push(intervalsD.length); intervalsD.push({ pi, aSt: ia, bSt: ib, discard: isDiscard(ia, ib) }); }
    }
  });
  const piecesD: DiagramPiece[] = [];
  scene.chains.forEach((_c, pi) => {
    for (const side of [1, -1]) for (const gi of perChainIntervals[pi]) { if (intervalsD[gi].discard) continue; piecesD.push({ kind: "run", chain: pi, side, corner: -1, interval: gi, cap: -1 }); }
  });
  corners.forEach((dc, ci) => { const a = arms[dc.aArm]; piecesD.push({ kind: "arc", chain: a ? a.pi : -1, side: 0, corner: ci, interval: -1, cap: -1 }); });
  caps.forEach((cp) => piecesD.push({ kind: "cap", chain: cp.pi, side: 0, corner: -1, interval: -1, cap: cp.capInfo ?? -1 }));
  // K1240 S3f r4: every corner with an end arm has a tail (endTailPts);
  // interval = which arm is the end (1: B, 0: A).
  corners.forEach((dc, ci) => {
    const a = arms[dc.aArm]; const b = arms[dc.bArm];
    if (!a || !b) return;
    const which = b.kind === "end" ? 1 : a.kind === "end" ? 0 : -1;
    if (which < 0) return;
    piecesD.push({ kind: "tail", chain: which ? b.pi : a.pi, side: 0, corner: ci, interval: which, cap: -1 });
  });
  // K1279: a ghost per side of every crossing's discarded interval (in -> out
  // of one crossing), last so no earlier piece moves.
  scene.chains.forEach((_c, pi) => {
    for (const side of [1, -1]) for (const gi of perChainIntervals[pi]) {
      const iv = intervalsD[gi]; if (!iv.discard) continue;
      const A = stationsD[iv.aSt]; const B = stationsD[iv.bSt];
      if (A.kind !== "cross" || B.kind !== "cross" || A.crossing < 0 || A.crossing !== B.crossing) continue;
      piecesD.push({ kind: "ghost", chain: pi, side, corner: -1, interval: gi, cap: -1 });
    }
  });
  return {
    chainIds: scene.chains.map((c) => c.id),
    closed: scene.chains.map((c) => c.closed),
    nPts: scene.chains.map((c) => c.pts.length >> 1),
    crossings: scene.crossings.flatMap((x) => {
      const aPi = idxOf.get(x.a.chain); const bPi = idxOf.get(x.b.chain);
      return aPi === undefined || bPi === undefined ? [] : [{ aPi, bPi, over: x.over, emergent: !!x.emergent, sUnder: x.over === "a" ? x.b.s : x.a.s, sOver: x.over === "a" ? x.a.s : x.b.s }];
    }),
    arms, armsOfJ, corners, groupOfJ, caps, stationsD, intervalsD, piecesD,
  };
}

export function structure(scene: SceneIn): DiagramStructure { return diagramOf(scene); }

/** One frame of the diagram at this scene's positions. Every length,
 *  angle, cut, tangent point, radius and exposure is computed from
 *  `scene` (the builder's geometry, run per frame); the piece list is
 *  the diagram's: one run piece per border segment, one arc piece per
 *  diagram corner, the caps' runs. */
export function frame(st: DiagramStructure, scene: SceneIn, profile?: Record<string, number>): OutlineTable {
  const C0 = fastCaches.get(st);
  if (C0) kfFootHold.delete(C0); // an unsnapped frame recommits the held END-arm feet (frameSnapped)
  return frameFast(st, alignJunctionArms(st, scene), profile);
}
/** K1247 s31: frame() on a scene the caller snapped (OutlineModel.update, snapScene): it also holds the END-arm
 *  extension feet within T (holdFootC), the one input the snap cannot reach from outside. */
export function frameSnapped(st: DiagramStructure, scene: SceneIn, profile?: Record<string, number>): OutlineTable {
  kfHoldFeet = true;
  try { return frameFast(st, alignJunctionArms(st, scene), profile); } finally { kfHoldFeet = false; }
}

/** K1247 s17 (j154, j114 on muse_hash): the scene lists a junction's arms
 *  in angular order, and that list may start at a different arm from one
 *  frame to the next (muse_hash f2: junction 113's arms[0] went from chain
 *  85's through arm to chain 49's end). The structure names an arm by its
 *  index at structure time (`ei`), so a read of `arms[a.ei]` then took
 *  another chain's s: a false root at s 0 on chain 85 cut arm 467 from
 *  1.262 to 0.193 and failed corners 318 and 319 (1.35 px faces, the gain
 *  tool's cap). Every frame now reads the scene through this alignment:
 *  each structure arm takes the scene arm of its own identity (chain, kind,
 *  dir; s, the material coordinate, only between two arms of one identity),
 *  and the corners follow the arms. Identity, never position, decides; a
 *  junction already in order passes through untouched, and one whose arms
 *  match no identity is left as it is. `K17_JA=0` turns it off. */
export function alignJunctionArms(st: DiagramStructure, scene: SceneIn): SceneIn {
  let out: SceneJunctionIn[] | null = null;
  const nJ = Math.min(scene.junctions.length, st.armsOfJ.length);
  for (let ji = 0; ji < nJ; ji++) {
    const J = scene.junctions[ji]; const list = st.armsOfJ[ji];
    if (!J || !list || list.length === 0) continue;
    const n = J.arms.length;
    const same = (e: number, x: SceneArmIn | undefined): boolean => {
      const A = st.arms[e];
      return !!x && x.chain === st.chainIds[A.pi] && x.kind === A.kind && x.dir === A.dir;
    };
    let inOrder = true;
    for (const e of list) { if (!same(e, J.arms[st.arms[e].ei])) { inOrder = false; break; } }
    if (inOrder) continue;
    const perm = new Int32Array(n).fill(-1); const used = new Uint8Array(n); let ok = true;
    for (const e of list) {
      const A = st.arms[e]; let best = -1; let bestD = Infinity;
      for (let k = 0; k < n; k++) {
        if (used[k] || !same(e, J.arms[k])) continue;
        const d = Math.abs(J.arms[k].s - A.s);
        if (d < bestD) { bestD = d; best = k; }
      }
      if (best < 0 || A.ei >= n) { ok = false; break; }
      perm[A.ei] = best; used[best] = 1;
    }
    if (!ok) continue;
    // Slots no structure arm names (an unknown chain) keep the leftovers in order.
    let fill = 0;
    for (let e = 0; e < n; e++) { if (perm[e] >= 0) continue; while (used[fill]) fill++; perm[e] = fill; used[fill] = 1; }
    // Corner k lies between arms k and k+1; a rotation carries it along.
    let rot = -1;
    const r0 = (perm[0] + n) % n; let isRot = true;
    for (let e = 0; e < n; e++) if (perm[e] !== (e + r0) % n) { isRot = false; break; }
    if (isRot) rot = r0;
    const arms = Array.from(perm, (k) => J.arms[k]);
    const corners = J.corners && rot >= 0 ? J.corners.map((_, k) => J.corners![(k + rot) % n]) : J.corners;
    if (!out) out = scene.junctions.slice();
    out[ji] = { ...J, arms, corners };
  }
  return out ? { ...scene, junctions: out } : scene;
}


// ---------------------------------------------------------------------------
// K1247: the fast frame. frame() re-evaluates the diagram's pieces from
// this frame's centrelines with typed arrays, a per-structure cache
// (indices, candidate segment windows, array layouts) and warm-start
// searches from the previous frame's answers. frameRef() (buildOutlineFull)
// is the oracle. The geometry equations are the builder's, ported.

interface FBord {
  px: Float64Array; py: Float64Array; ps: Float64Array; pv: Int32Array;
  bx: Float64Array; by: Float64Array; bs: Float64Array; bfx: Float64Array; bfy: Float64Array; nb: number;
  xy: Float64Array; s: Float64Array; cxy: Float64Array; nf: number;
  ins: Int32Array; nIns: number; segReg: Int32Array; sorted: Int32Array; segCnt: Int32Array; mark: Int32Array;
  // K1247 s14: the clip's sigma excess per base point (sigma = bs + be; borderExcessC).
  be: Float64Array;
  // K1247 s16 (K1280): the continuous s of each base point (bc) and final
  // point (sc). bs/s give a convex vertex's whole fan (A_v, fan, B_v) the
  // vertex's s, so a lookup by s jumped from A_v to B_v as s crossed it;
  // bc/sc spread each such tie over a window around the vertex
  // (spreadTiesC), and the lookups by s and the piece walk read them.
  bc: Float64Array; sc: Float64Array;
  // K1283 s8: a cut fold's chevron ends, both at its cut point: bcv 1 at the first (s on the
  // fold's first leg), 2 at the last (on its second leg), else 0; bs2 = the other end's s.
  bcv: Int8Array; bs2: Float64Array; bsm: Float64Array;
}
function mkFBord(): FBord {
  return {
    px: new Float64Array(64), py: new Float64Array(64), ps: new Float64Array(64), pv: new Int32Array(64),
    bx: new Float64Array(64), by: new Float64Array(64), bs: new Float64Array(64), bfx: new Float64Array(64), bfy: new Float64Array(64), nb: 0,
    xy: new Float64Array(128), s: new Float64Array(64), cxy: new Float64Array(128), nf: 0,
    ins: new Int32Array(16), nIns: 0, segReg: new Int32Array(64), sorted: new Int32Array(16), segCnt: new Int32Array(1024), mark: new Int32Array(64),
    be: new Float64Array(64), bc: new Float64Array(64), sc: new Float64Array(64),
    bcv: new Int8Array(64), bs2: new Float64Array(64), bsm: new Float64Array(64),
  };
}
// K1247 s14 (#658): the border's cumulative sigma excess: segment i adds max(L, c len) - L for
// L >= 0 (0 on every ordinary segment, c len on a zero-span join).
function borderExcessC(p: Poly, B: FBord): void {
  const n = B.nb; B.be = growF(B.be, n > 0 ? n : 1); B.be[0] = 0;
  if (K14_BEVC <= 0) return;
  const be = B.be; const bs = B.bs; const bx = B.bx; const by = B.by;
  for (let i = 0; i + 1 < n; i++) {
    const L = dS(p, bs[i], bs[i + 1]); const dx = bx[i + 1] - bx[i]; const dy = by[i + 1] - by[i];
    const m = K14_BEVC * Math.sqrt(dx * dx + dy * dy);
    be[i + 1] = be[i] + (L >= 0 && L < m ? m - L : 0);
  }
}
// E at centerline s sC on a border (out[0]) and the segment holding it (out[1]); false: no sigma.
const sigCU = new Float64Array(2); const sigCO = new Float64Array(2);
function sigCenter(p: Poly, B: FBord, sC: number, out: Float64Array): boolean {
  const n = B.nb; if (K14_BEVC <= 0 || n < 2) return false;
  const bs = B.bs; let lo = 0; let hi = n;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (bs[mid] <= sC) lo = mid + 1; else hi = mid; }
  let k = lo - 1; if (k < 0) k = p.closed ? n - 2 : 0; if (k > n - 2) k = n - 2;
  const L = dS(p, bs[k], bs[k + 1]); const e = B.be[k + 1] - B.be[k];
  let t = L > 0 ? dS(p, bs[k], sC) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  out[0] = B.be[k] + t * e; out[1] = k; return true;
}
// Segment i's sigma offset from the center (be[i] - E_C), across a closed border's seam.
function sigRel(p: Poly, B: FBord, i: number, sC: number, c: Float64Array): number {
  let r = B.be[i] - c[0];
  if (p.closed) { const k = c[1]; const ahead = dS(p, sC, B.bs[i]) >= 0; if (ahead && i < k) r += B.be[B.nb - 1]; else if (!ahead && i > k) r -= B.be[B.nb - 1]; }
  return r;
}
function growF(a: Float64Array, need: number): Float64Array {
  if (a.length >= need) return a;
  let n = a.length * 2; while (n < need) n *= 2;
  const b = new Float64Array(n); b.set(a); return b;
}
function growI(a: Int32Array, need: number): Int32Array {
  if (a.length >= need) return a;
  let n = a.length * 2; while (n < need) n *= 2;
  const b = new Int32Array(n); b.set(a); return b;
}

interface FEye {
  pi: number; qi: number; xi: number; xj: number;
  piFirst: number; piSecond: number; qiFirst: number; qiSecond: number;
  pairsU: Int32Array[]; pairsO: Int32Array[]; pairN: Int32Array; prevTotal: number;
}
interface FCache {
  h: number; W: number; cr: number; depthAmp: number; depthWindow: number; ctrlArc: number;
  nCh: number; nX: number; nArms: number; nCorners: number;
  polys: Poly[]; rawPolys: Poly[]; needRaw: Uint8Array; origLen: Float64Array;
  tanTx: Float64Array[]; tanTy: Float64Array[]; tanGF: Float64Array[]; tanGB: Float64Array[];
  crossAPi: Int32Array; crossBPi: Int32Array; crossOver: Int32Array; crossUnder: Int32Array;
  passXi: Int32Array[]; passIsB: Uint8Array[]; passN: Int32Array;
  passS: Float64Array[]; passSq: Float64Array[]; passTheta: Float64Array[]; passQi: Int32Array[]; passSort: Int32Array[];
  depthS: Float64Array[]; depthZ: Float64Array[]; depthN: Int32Array;
  armObj: FArm[]; armSR: Float64Array; armDir: Int32Array; armL: Float64Array; armLcut: Float64Array; armUx: Float64Array; armUy: Float64Array; armAng: Float64Array;
  armsOfChain: Int32Array[]; armsOfJSorted: number[][];
  chainRoots: Float64Array[];
  extArmPi: Int32Array; extCandPi: Int32Array[]; extCandS: Float64Array[];
  bords: FBord[];
  // inserts (per frame, global pool)
  insB: Int32Array; insSeg: Int32Array; insT: Float64Array; insX: Float64Array; insY: Float64Array; insRef: Int32Array; nIns: number;
  refB: Int32Array; refFinal: Int32Array; refS: Float64Array; refS0: Float64Array; nRef: number;
  junctionRegion: Int32Array; polyBox: Float64Array; cornerByAArm: Int32Array;
  chainSlots: number[][]; chainPiRank: number[];
  reachArr: Float64Array[]; reachStamp: Int32Array[];
  offAx: Float64Array; offAy: Float64Array; offBx: Float64Array; offBy: Float64Array;
  bendArr: Float64Array[]; bendN: Int32Array; bendStamp: Int32Array;
  // corner results + warm state
  cOk: Uint8Array; cMeet: Uint8Array; cWhy: (string | undefined)[];
  cVx: Float64Array; cVy: Float64Array; cQx: Float64Array; cQy: Float64Array;
  cTax: Float64Array; cTay: Float64Array; cTbx: Float64Array; cTby: Float64Array;
  cSA: Float64Array; cSB: Float64Array; cDA: Float64Array; cDB: Float64Array; cR: Float64Array; cTheta: Float64Array;
  cRefA: Int32Array; cRefB: Int32Array;
  wValid: Uint8Array; wVx: Float64Array; wVy: Float64Array; wFaS: Float64Array; wFbS: Float64Array; wFaK: Int32Array; wFbK: Int32Array;
  wQx: Float64Array; wQy: Float64Array; wR: Float64Array;
  nodeX: Float64Array; nodeY: Float64Array; nodeFaS: Float64Array; nodeFbS: Float64Array; nodeFaK: Int32Array; nodeFbK: Int32Array; nodeN: Int32Array;
  walkA: WalkCache[]; walkB: WalkCache[];
  meetValid: Uint8Array; meetSegA: Int32Array; meetSegB: Int32Array;
  armNextRef: Int32Array; armPrevRef: Int32Array; armNextSide: Int32Array; armPrevSide: Int32Array;
  // crossings per frame + warm
  cpX: Float64Array; cpY: Float64Array; cpTheta: Float64Array; cpSOver: Float64Array; cpSUnder: Float64Array;
  cpSA: Float64Array; cpSB: Float64Array; cpSnap: Uint8Array; // s17: each crossing's s on chain a / b (the centrelines' true intersection), 1 if the walk found it
  cutPairU: Int32Array[]; cutPairO: Int32Array[]; cutPairN: Int32Array; cutPrevCands: Int32Array; cutPrevPick: Uint8Array;
  eyes: FEye[];
  // stations (slots)
  slotPi: Int32Array; slotRank: Int32Array; slotKind: Int32Array; nSlots: number;
  /** K1247 s12: each slot's structural place on its chain (the feature's
   *  scene s: a crossing's s on that chain, an arm's root s, caps at the
   *  ends): stations are ordered by it, never by frame position. */
  slotKey: Float64Array;
  /** K1247 s14: per closed chain, its feature slots' smallest and largest
   *  slotKey (2 per chain, NaN with none), and the frame's seam key. */
  seamKR?: Float64Array;
  /** K1247 s14: per chain, its crossing and junction slots (CSR: seamSl0[pi]..seamSl0[pi + 1]). */
  seamSl0?: Int32Array;
  seamSl?: Int32Array;
  seamKF?: Float64Array;
  /** K1247 s12: the order inside one key: a through pass's two arms share
   *  the root s, and the arm leaving backwards (dir -1) comes first. */
  slotSub: Int8Array;
  /** K1247 s12: the structural region numbering (structRegionsC), built once;
   *  structMiss counts frame intervals that found no free id (dropped); underMiss
   *  (K1247 s14) discarded frame intervals at no structural pair (or a taken one). */
  sReg?: StructRegions; structMiss?: number; underMiss?: number; trimCuts?: number;
  crossUnderSlot: Int32Array; crossOverSlot: Int32Array; junctionSlot: Int32Array; capSlot: Int32Array; seamSlot: Int32Array;
  dgSlot: Int32Array; capInfoOfSlot: Int32Array;
  stActive: Uint8Array; stCS: Float64Array; stLeft: Int32Array; stRight: Int32Array;
  discardA: Int32Array; discardB: Int32Array;
  // cap arcs
  capArcX: Float64Array[]; capArcY: Float64Array[]; capArcN: Int32Array; capCx: Float64Array; capCy: Float64Array; capStation: Int32Array;
  // intervals / regions scratch
  ivPi: Int32Array; ivA: Int32Array; ivB: Int32Array; ivCMid: Float64Array; ivLen: Float64Array; ivDiscard: Uint8Array; ivRegion: Int32Array; nIv: number;
  /** K1247 s12: the slot an interval starts at (its A, or a station past it). */
  ivEA: Int32Array;
  seqIdx: Int32Array; seqSeg: Int32Array;
  pairHashKey: Int32Array; pairHashVal: Int32Array; pairHashStamp: Int32Array; pairStamp: number;
  warm: boolean;
  kinkCount: number;
}
const fastCaches = new WeakMap<DiagramStructure, FCache>();
/** Probe hook (K1247 s12): the per-structure frame cache, for station diffs. */

function mkPolyBuf(id: number, cap: number, closed: boolean): Poly {
  const c = Math.max(4, cap);
  return {
    id, n: 0, closed, nseg: 0, len: 0, s0: 0,
    x: new Float64Array(c), y: new Float64Array(c), s: new Float64Array(c),
    segLen: new Float64Array(c), dx: new Float64Array(c), dy: new Float64Array(c),
    bx0: new Float64Array(c), by0: new Float64Array(c), bx1: new Float64Array(c), by1: new Float64Array(c),
    bk: new Float64Array(4 * Math.max(1, Math.ceil(c / 32))), nblk: 0,
  };
}

/** K1247 s17 (j0 on def): a chain's buffers were sized to its frame-0
 *  point count + 4, and a chain that grew past that sent the frame to the
 *  full builder (def f25-f31: chain 16 at 36 points against a cap of 38),
 *  whose table differs from the fast one, with a stale debug cache. The
 *  physics adds points to a chain as it stretches, so give every chain
 *  room to double (`K17_CAP=0`: the old cap). */
function polyCapOf(n: number): number { const b = n || 4; return 2 * b + 8; }

function buildFastCache(st: DiagramStructure, scene: SceneIn): FCache {
  const look = scene.look;
  const nCh = st.chainIds.length;
  const idxOf = new Map<number, number>();
  st.chainIds.forEach((id, i) => idxOf.set(id, i));
  const polys: Poly[] = []; const rawPolys: Poly[] = [];
  for (let i = 0; i < nCh; i++) {
    const cap = polyCapOf(st.nPts[i]);
    polys.push(mkPolyBuf(i, cap, st.closed[i]));
    rawPolys.push(mkPolyBuf(i, cap, st.closed[i]));
  }
  const nX = st.crossings.length;
  const crossAPi = new Int32Array(nX); const crossBPi = new Int32Array(nX);
  const crossOver = new Int32Array(nX); const crossUnder = new Int32Array(nX);
  st.crossings.forEach((x, xi) => {
    crossAPi[xi] = x.aPi; crossBPi[xi] = x.bPi;
    crossOver[xi] = x.over === "a" ? x.aPi : x.bPi;
    crossUnder[xi] = x.over === "a" ? x.bPi : x.aPi;
  });
  // Per-chain pass entries (crossing index + which pass), in scene order.
  const passXi: Int32Array[] = []; const passIsB: Uint8Array[] = [];
  const passS: Float64Array[] = []; const passSq: Float64Array[] = []; const passTheta: Float64Array[] = [];
  const passQi: Int32Array[] = []; const passSort: Int32Array[] = [];
  const depthS: Float64Array[] = []; const depthZ: Float64Array[] = [];
  for (let pi = 0; pi < nCh; pi++) {
    const lst: number[] = []; const isb: number[] = [];
    st.crossings.forEach((x, xi) => {
      if (x.aPi === pi) { lst.push(xi); isb.push(0); }
      if (x.bPi === pi) { lst.push(xi); isb.push(1); }
    });
    passXi.push(Int32Array.from(lst)); passIsB.push(Uint8Array.from(isb));
    const n = lst.length;
    passS.push(new Float64Array(Math.max(1, n))); passSq.push(new Float64Array(Math.max(1, n)));
    passTheta.push(new Float64Array(Math.max(1, n))); passQi.push(new Int32Array(Math.max(1, n)));
    passSort.push(new Int32Array(Math.max(1, n)));
    depthS.push(new Float64Array(Math.max(1, n))); depthZ.push(new Float64Array(Math.max(1, n)));
  }
  const nArms = st.arms.length;
  const armObj: FArm[] = st.arms.map((a) => ({ ji: a.ji, ei: a.ei, pi: a.pi, sR: 0, dir: a.dir, kind: a.kind, L: 0, g: st.groupOfJ[a.ji] ?? 0, ux: 0, uy: 0, ang: 0 }));
  const armsOfChain: Int32Array[] = [];
  for (let pi = 0; pi < nCh; pi++) armsOfChain.push(Int32Array.from(st.arms.map((a, ai) => (a.pi === pi ? ai : -1)).filter((x) => x >= 0)));
  // END-arm extension candidates: the junction's through arms.
  const extArmPi: number[] = []; const extCandPi: Int32Array[] = []; const extCandS: Float64Array[] = [];
  const needRaw = new Uint8Array(nCh);
  st.arms.forEach((a) => {
    if (a.kind !== "end") return;
    const candPi: number[] = []; const candS: number[] = [];
    for (const bai of st.armsOfJ[a.ji] ?? []) {
      const ba = st.arms[bai];
      if (ba.kind !== "through") continue;
      const xa = scene.junctions[ba.ji]?.arms[ba.ei];
      if (!xa) continue;
      candPi.push(ba.pi); candS.push(xa.s);
      needRaw[ba.pi] = 1;
    }
    if (candPi.length) { extArmPi.push(a.pi); extCandPi.push(Int32Array.from(candPi)); extCandS.push(Float64Array.from(candS)); needRaw[a.pi] = 1; }
  });
  // Station slots, in the builder's creation order (rank).
  const slotPi: number[] = []; const slotRank: number[] = []; const slotKind: number[] = [];
  const crossUnderSlot = new Int32Array(nX * 2).fill(-1);
  const crossOverSlot = new Int32Array(nX * 2).fill(-1);
  for (let xi = 0; xi < nX; xi++) {
    for (let o = 0; o < 2; o++) { crossUnderSlot[xi * 2 + o] = slotPi.length; slotPi.push(crossUnder[xi]); slotRank.push(xi * 4 + o); slotKind.push(0); }
    for (let u = 0; u < 2; u++) { crossOverSlot[xi * 2 + u] = slotPi.length; slotPi.push(crossOver[xi]); slotRank.push(xi * 4 + 2 + u); slotKind.push(1); }
  }
  const junctionSlot = new Int32Array(Math.max(1, nArms)).fill(-1);
  st.arms.forEach((a, ai) => { junctionSlot[ai] = slotPi.length; slotPi.push(a.pi); slotRank.push(nX * 4 + ai); slotKind.push(2); });
  const capSlot = new Int32Array(Math.max(1, nCh * 2)).fill(-1);
  const seamSlot = new Int32Array(Math.max(1, nCh)).fill(-1);
  const capInfoOfSlot: number[] = slotPi.map(() => -1);
  let capInfoCount = 0;
  for (let pi = 0; pi < nCh; pi++) {
    if (st.closed[pi]) { seamSlot[pi] = slotPi.length; slotPi.push(pi); slotRank.push(nX * 4 + nArms + pi * 2); slotKind.push(4); capInfoOfSlot.push(-1); }
    else for (let e = 0; e < 2; e++) { capSlot[pi * 2 + e] = slotPi.length; slotPi.push(pi); slotRank.push(nX * 4 + nArms + pi * 2 + e); slotKind.push(3); capInfoOfSlot.push(capInfoCount++); }
  }
  while (capInfoOfSlot.length < slotPi.length) capInfoOfSlot.push(-1);
  const nSlots = slotPi.length;
  const dgSlot = new Int32Array(Math.max(1, st.stationsD.length)).fill(-1);
  st.stationsD.forEach((dgs, i) => {
    if (dgs.kind === "junction") dgSlot[i] = junctionSlot[dgs.arm];
    else if (dgs.kind === "capStart") dgSlot[i] = capSlot[dgs.pi * 2];
    else if (dgs.kind === "capEnd") dgSlot[i] = capSlot[dgs.pi * 2 + 1];
    else if (dgs.kind === "seam") dgSlot[i] = seamSlot[dgs.pi];
  });
  // Discard pairs (builder discardPair candidates).
  const discardA: number[] = []; const discardB: number[] = [];
  for (let xi = 0; xi < nX; xi++) { discardA.push(crossUnderSlot[xi * 2]); discardB.push(crossUnderSlot[xi * 2 + 1]); }
  {
    const byRoot = new Map<string, number[]>();
    st.arms.forEach((a, ai) => {
      if (a.kind !== "through") return;
      const xa = scene.junctions[a.ji]?.arms[a.ei];
      if (!xa) return;
      const k = `${a.ji}|${a.pi}|${xa.s}`;
      const l = byRoot.get(k) ?? []; l.push(ai); byRoot.set(k, l);
    });
    for (const l of byRoot.values()) if (l.length === 2) { discardA.push(junctionSlot[l[0]]); discardB.push(junctionSlot[l[1]]); }
    // End arm vs junction caps: caps at a chain end where some end arm
    // roots (builder junctionCapKeys), paired with every end arm's
    // junction station on that chain.
    const capEnds = new Set<string>();
    st.arms.forEach((a) => {
      if (a.kind !== "end") return;
      const xa = scene.junctions[a.ji]?.arms[a.ei];
      const pts = scene.chains[a.pi]?.pts ?? [];
      let len = 0;
      for (let i = 0; i + 3 < pts.length; i += 2) len += Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
      if (st.closed[a.pi] && pts.length >= 4) len += Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]);
      const atStart = xa ? Math.abs(xa.s) < Math.abs(xa.s - len) : true;
      capEnds.add(`${a.pi}|${atStart ? 0 : 1}`);
    });
    st.arms.forEach((a, ai) => {
      if (a.kind !== "end") return;
      for (let e = 0; e < 2; e++) {
        if (!capEnds.has(`${a.pi}|${e}`)) continue;
        const cs = capSlot[a.pi * 2 + e];
        if (cs >= 0) { discardA.push(junctionSlot[ai]); discardB.push(cs); }
      }
    });
  }
  // Eyes: crossing pairs consecutive on both chains (diagram order
  // from the structure-time scene's s values). Per eye and chain, the
  // pass entries (indices into passXi[chain]) that start/end the arc.
  const eyes: FEye[] = [];
  {
    const chainLenOf = (pi: number): number => {
      const pts = scene.chains[pi]?.pts ?? [];
      let len = 0;
      for (let i = 0; i + 3 < pts.length; i += 2) len += Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
      if (st.closed[pi] && pts.length >= 4) len += Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]);
      return len;
    };
    const sortedEntries: number[][] = [];
    for (let pi = 0; pi < nCh; pi++) {
      const len = chainLenOf(pi);
      const wrap = (s: number): number => (st.closed[pi] && len > 0 ? ((s % len) + len) % len : s);
      const l = Array.from(passXi[pi], (_, e) => e);
      l.sort((e1, e2) => {
        const x1 = scene.crossings[passXi[pi][e1]]; const x2 = scene.crossings[passXi[pi][e2]];
        const s1 = wrap(passIsB[pi][e1] === 1 ? x1.b.s : x1.a.s);
        const s2 = wrap(passIsB[pi][e2] === 1 ? x2.b.s : x2.a.s);
        return s1 - s2;
      });
      sortedEntries.push(l);
    }
    const partnerOf = (pi: number, e: number): number => {
      const xi = passXi[pi][e];
      return passIsB[pi][e] === 1 ? crossAPi[xi] : crossBPi[xi];
    };
    const seen = new Set<string>();
    for (let pi = 0; pi < nCh; pi++) {
      const list = sortedEntries[pi];
      for (let k = 0; k < list.length; k++) {
        if (!st.closed[pi] && k + 1 >= list.length) break;
        const ea = list[k]; const eb = list[(k + 1) % list.length];
        const xa = passXi[pi][ea]; const xb = passXi[pi][eb];
        if (xa === xb) continue;
        const qi = partnerOf(pi, ea);
        if (partnerOf(pi, eb) !== qi) continue;
        const key = `${Math.min(pi, qi)}-${Math.max(pi, qi)}|${Math.min(xa, xb)}-${Math.max(xa, xb)}`;
        if (seen.has(key)) continue;
        // The partner chain must list the same pair consecutively.
        const qlist = sortedEntries[qi];
        let qEa = -1; let qEb = -1;
        for (let q = 0; q < qlist.length; q++) {
          if (!st.closed[qi] && q + 1 >= qlist.length) break;
          const f = qlist[q]; const s2 = qlist[(q + 1) % qlist.length];
          const match = (passXi[qi][f] === xa && passXi[qi][s2] === xb) || (passXi[qi][f] === xb && passXi[qi][s2] === xa);
          if (match) { qEa = f; qEb = s2; break; }
        }
        if (qEa < 0 && pi !== qi) continue;
        if (qEa < 0) { qEa = ea; qEb = eb; }
        seen.add(key);
        eyes.push({
          pi, qi, xi: Math.min(xa, xb), xj: Math.max(xa, xb),
          piFirst: ea, piSecond: eb, qiFirst: qi === pi ? ea : qEa, qiSecond: qi === pi ? eb : qEb,
          pairsU: [new Int32Array(0), new Int32Array(0), new Int32Array(0), new Int32Array(0)],
          pairsO: [new Int32Array(0), new Int32Array(0), new Int32Array(0), new Int32Array(0)],
          pairN: new Int32Array(4), prevTotal: -1,
        });
      }
    }
  }
  const nCorners = st.corners.length;
  const bords: FBord[] = [];
  for (let b = 0; b < nCh * 2; b++) bords.push(mkFBord());
  const capCount = Math.max(1, capInfoCount);
  const C: FCache = {
    h: look.halfWidth, W: look.band, cr: look.cuspRadius ?? 3, depthAmp: look.depthAmp, depthWindow: look.depthWindow, ctrlArc: look.ctrlArc ?? 1,
    nCh, nX, nArms, nCorners,
    polys, rawPolys, needRaw, origLen: new Float64Array(nCh),
    tanTx: [], tanTy: [], tanGF: [], tanGB: [],
    crossAPi, crossBPi, crossOver, crossUnder,
    passXi, passIsB, passN: new Int32Array(nCh), passS, passSq, passTheta, passQi, passSort,
    depthS, depthZ, depthN: new Int32Array(nCh),
    armObj, armSR: new Float64Array(Math.max(1, nArms)), armDir: new Int32Array(Math.max(1, nArms)),
    armL: new Float64Array(Math.max(1, nArms)), armLcut: new Float64Array(Math.max(1, nArms)),
    armUx: new Float64Array(Math.max(1, nArms)), armUy: new Float64Array(Math.max(1, nArms)), armAng: new Float64Array(Math.max(1, nArms)),
    armsOfChain, armsOfJSorted: st.armsOfJ.map((l) => l.slice()),
    chainRoots: [],
    extArmPi: Int32Array.from(extArmPi), extCandPi, extCandS,
    bords,
    insB: new Int32Array(1024), insSeg: new Int32Array(1024), insT: new Float64Array(1024), insX: new Float64Array(1024), insY: new Float64Array(1024), insRef: new Int32Array(1024), nIns: 0,
    refB: new Int32Array(1024), refFinal: new Int32Array(1024), refS: new Float64Array(1024), refS0: new Float64Array(1024), nRef: 0,
    junctionRegion: new Int32Array(Math.max(1, scene.junctions.length)).fill(-1), polyBox: new Float64Array(Math.max(1, nCh * 4)),
    cornerByAArm: new Int32Array(Math.max(1, nArms)).fill(-1),
    chainSlots: polys.map(() => []), chainPiRank: polys.map(() => Infinity),
    reachArr: passS.map((a) => new Float64Array(Math.max(2, a.length * 2))), reachStamp: passS.map((a) => new Int32Array(Math.max(2, a.length * 2))),
    offAx: new Float64Array(Math.max(4, ...st.nPts) + 4), offAy: new Float64Array(Math.max(4, ...st.nPts) + 4),
    offBx: new Float64Array(Math.max(4, ...st.nPts) + 4), offBy: new Float64Array(Math.max(4, ...st.nPts) + 4),
    bendArr: polys.map((pp) => new Float64Array(2 * (pp.x.length + 2))), bendN: new Int32Array(nCh), bendStamp: new Int32Array(nCh),
    cOk: new Uint8Array(Math.max(1, nCorners)), cMeet: new Uint8Array(Math.max(1, nCorners)), cWhy: new Array(Math.max(1, nCorners)),
    cVx: new Float64Array(Math.max(1, nCorners)), cVy: new Float64Array(Math.max(1, nCorners)),
    cQx: new Float64Array(Math.max(1, nCorners)), cQy: new Float64Array(Math.max(1, nCorners)),
    cTax: new Float64Array(Math.max(1, nCorners)), cTay: new Float64Array(Math.max(1, nCorners)),
    cTbx: new Float64Array(Math.max(1, nCorners)), cTby: new Float64Array(Math.max(1, nCorners)),
    cSA: new Float64Array(Math.max(1, nCorners)), cSB: new Float64Array(Math.max(1, nCorners)),
    cDA: new Float64Array(Math.max(1, nCorners)), cDB: new Float64Array(Math.max(1, nCorners)),
    cR: new Float64Array(Math.max(1, nCorners)), cTheta: new Float64Array(Math.max(1, nCorners)),
    cRefA: new Int32Array(Math.max(1, nCorners)).fill(-1), cRefB: new Int32Array(Math.max(1, nCorners)).fill(-1),
    wValid: new Uint8Array(Math.max(1, nCorners)), wVx: new Float64Array(Math.max(1, nCorners)), wVy: new Float64Array(Math.max(1, nCorners)),
    wFaS: new Float64Array(Math.max(1, nCorners)), wFbS: new Float64Array(Math.max(1, nCorners)),
    wFaK: new Int32Array(Math.max(1, nCorners)), wFbK: new Int32Array(Math.max(1, nCorners)),
    wQx: new Float64Array(Math.max(1, nCorners)), wQy: new Float64Array(Math.max(1, nCorners)), wR: new Float64Array(Math.max(1, nCorners)),
    nodeX: new Float64Array(Math.max(1, nCorners) * 33), nodeY: new Float64Array(Math.max(1, nCorners) * 33),
    nodeFaS: new Float64Array(Math.max(1, nCorners) * 33), nodeFbS: new Float64Array(Math.max(1, nCorners) * 33),
    nodeFaK: new Int32Array(Math.max(1, nCorners) * 33), nodeFbK: new Int32Array(Math.max(1, nCorners) * 33),
    nodeN: new Int32Array(Math.max(1, nCorners)),
    walkA: Array.from({ length: Math.max(1, nCorners) }, () => mkWalkCache()),
    walkB: Array.from({ length: Math.max(1, nCorners) }, () => mkWalkCache()),
    meetValid: new Uint8Array(Math.max(1, nCorners)), meetSegA: new Int32Array(Math.max(1, nCorners)), meetSegB: new Int32Array(Math.max(1, nCorners)),
    armNextRef: new Int32Array(Math.max(1, nArms)).fill(-1), armPrevRef: new Int32Array(Math.max(1, nArms)).fill(-1),
    armNextSide: new Int32Array(Math.max(1, nArms)), armPrevSide: new Int32Array(Math.max(1, nArms)),
    cpX: new Float64Array(Math.max(1, nX)), cpY: new Float64Array(Math.max(1, nX)),
    cpTheta: new Float64Array(Math.max(1, nX)), cpSOver: new Float64Array(Math.max(1, nX)), cpSUnder: new Float64Array(Math.max(1, nX)),
    cpSA: new Float64Array(Math.max(1, nX)), cpSB: new Float64Array(Math.max(1, nX)), cpSnap: new Uint8Array(Math.max(1, nX)),
    cutPairU: Array.from({ length: Math.max(1, nX * 4) }, () => new Int32Array(0)),
    cutPairO: Array.from({ length: Math.max(1, nX * 4) }, () => new Int32Array(0)),
    cutPairN: new Int32Array(Math.max(1, nX * 4)), cutPrevCands: new Int32Array(Math.max(1, nX)).fill(-1),
    cutPrevPick: new Uint8Array(Math.max(1, nX * 2)),
    eyes,
    slotPi: Int32Array.from(slotPi), slotRank: Int32Array.from(slotRank), slotKind: Int32Array.from(slotKind), nSlots,
    slotKey: Float64Array.from(slotPi, (_, s) => {
      const k = slotKind[s]; const r = slotRank[s];
      if (k === 0) return st.crossings[r >> 2].sUnder;
      if (k === 1) return st.crossings[r >> 2].sOver;
      if (k === 2) return st.arms[r - nX * 4].s;
      if (k === 3) return ((r - nX * 4 - nArms) & 1) ? 1e12 : -1e12;
      return 0;
    }),
    slotSub: Int8Array.from(slotPi, (_, s) => (slotKind[s] === 2 ? st.arms[slotRank[s] - nX * 4].dir : 0)),
    crossUnderSlot, crossOverSlot, junctionSlot, capSlot, seamSlot, dgSlot,
    capInfoOfSlot: Int32Array.from(capInfoOfSlot.slice(0, nSlots)),
    stActive: new Uint8Array(Math.max(1, nSlots)), stCS: new Float64Array(Math.max(1, nSlots)),
    stLeft: new Int32Array(Math.max(1, nSlots)).fill(-1), stRight: new Int32Array(Math.max(1, nSlots)).fill(-1),
    discardA: Int32Array.from(discardA), discardB: Int32Array.from(discardB),
    capArcX: Array.from({ length: capCount }, () => new Float64Array(80)),
    capArcY: Array.from({ length: capCount }, () => new Float64Array(80)),
    capArcN: new Int32Array(capCount), capCx: new Float64Array(capCount), capCy: new Float64Array(capCount),
    capStation: new Int32Array(capCount).fill(-1),
    ivPi: new Int32Array(Math.max(1, nSlots)), ivA: new Int32Array(Math.max(1, nSlots)), ivB: new Int32Array(Math.max(1, nSlots)),
    ivCMid: new Float64Array(Math.max(1, nSlots)), ivLen: new Float64Array(Math.max(1, nSlots)),
    ivDiscard: new Uint8Array(Math.max(1, nSlots)), ivRegion: new Int32Array(Math.max(1, nSlots)).fill(-1), nIv: 0,
    ivEA: new Int32Array(Math.max(1, nSlots)),
    seqIdx: new Int32Array(1024), seqSeg: new Int32Array(1024),
    pairHashKey: new Int32Array(8192), pairHashVal: new Int32Array(8192), pairHashStamp: new Int32Array(8192), pairStamp: 0,
    warm: false,
    kinkCount: scene.crossings.filter((x) => x.a.chain === x.b.chain).length,
  };
  for (let pi = 0; pi < nCh; pi++) {
    const cap = Math.max(4, polyCapOf(st.nPts[pi]));
    C.tanTx.push(new Float64Array(cap)); C.tanTy.push(new Float64Array(cap));
    C.tanGF.push(new Float64Array(cap)); C.tanGB.push(new Float64Array(cap + 1));
  }
  st.corners.forEach((dc, ci) => { if (C.cornerByAArm[dc.aArm] < 0) C.cornerByAArm[dc.aArm] = ci; });
  return C;
}


const ptScratch = new Float64Array(4);
const ptScratch2 = new Float64Array(4);
function depthAtC(C: FCache, pi: number, s: number, depthWin: number): number {
  const P = C.depthS[pi]; const Z = C.depthZ[pi]; const n = C.depthN[pi];
  if (n === 0) return 0;
  const p = C.polys[pi];
  const u = normS(p, s);
  let lo = -1; let hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m] <= u) lo = m; else hi = m; }
  const hat = (z: number, d: number, w: number): number => (w <= 1e-12 ? (d <= 0 ? z : 0) : d >= w ? 0 : z * (1 - d / w));
  if (p.closed) {
    const iL = lo < 0 ? n - 1 : lo;
    const sL = lo < 0 ? P[iL] - p.len : P[iL];
    const iR = lo + 1 >= n ? 0 : lo + 1;
    const sR = lo + 1 >= n ? P[iR] + p.len : P[iR];
    const w = Math.min(depthWin, sR - sL);
    return hat(Z[iL], u - sL, w) + hat(Z[iR], sR - u, w);
  }
  if (lo < 0) return hat(Z[0], P[0] - u, depthWin);
  if (lo + 1 >= n) return hat(Z[n - 1], u - P[n - 1], depthWin);
  const w = Math.min(depthWin, P[lo + 1] - P[lo]);
  return hat(Z[lo], u - P[lo], w) + hat(Z[lo + 1], P[lo + 1] - u, w);
}
function armDistC(C: FCache, ai: number, s: number): number {
  const p = C.polys[C.armObj[ai].pi];
  let d = (s - C.armSR[ai]) * C.armDir[ai];
  if (p.closed) d = ((d % p.len) + p.len) % p.len;
  return d;
}
/** K1247 s12: region ids from structure. Every slot of a chain, active or
 *  not, in structural order (slotKey, then rank); chains by their lowest
 *  rank; one id per structural interval, none for a discard pair that is
 *  adjacent in that order. A frame's interval takes the first free id at or
 *  after its first station, and an id no interval takes is an empty region,
 *  so a station that comes and goes (a crossOver pick: def cycle frame 18,
 *  fat cyc 18 crossing 310) no longer renumbers every later region. */
// K1247 s14: uid numbers the discard pairs (-1 elsewhere): underlay u = uid, at (uPi, uA);
// uOfPair: slots a * nS + b (either order) -> the pair's underlay. Either order: the
// structural tie-break (slotRank) and the frame's (-dS(cS)) may order a pair's slots apart.
interface StructRegions { pos: Int32Array; base: Int32Array; cnt: Int32Array; closed: Uint8Array; id: Int32Array; n: number; ridPi: Int32Array; ridA: Int32Array; uid: Int32Array; nU: number; uPi: Int32Array; uA: Int32Array; uOfPair: Map<number, number>; nS: number }
function structRegionsC(C: FCache, st: DiagramStructure): StructRegions {
  if (C.sReg) return C.sReg;
  const nCh = C.nCh; const nS = C.nSlots;
  const lists: number[][] = Array.from({ length: nCh }, () => []);
  const minRank = new Array<number>(nCh).fill(Infinity);
  for (let s = 0; s < nS; s++) { const pi = C.slotPi[s]; lists[pi].push(s); if (C.slotRank[s] < minRank[pi]) minRank[pi] = C.slotRank[s]; }
  const pos = new Int32Array(Math.max(1, nS));
  for (const l of lists) { l.sort((u, v) => (C.slotKey[u] - C.slotKey[v]) || (C.slotSub[u] - C.slotSub[v]) || (C.slotRank[u] - C.slotRank[v])); l.forEach((s, j) => { pos[s] = j; }); }
  const pair = new Set<number>();
  for (let d = 0; d < C.discardA.length; d++) { const a = C.discardA[d]; const b = C.discardB[d]; if (a >= 0 && b >= 0) { pair.add(a * nS + b); pair.add(b * nS + a); } }
  const order: number[] = [];
  for (let pi = 0; pi < nCh; pi++) if (lists[pi].length) order.push(pi);
  order.sort((a, b) => minRank[a] - minRank[b]);
  const base = new Int32Array(Math.max(1, nCh)).fill(-1); const cnt = new Int32Array(Math.max(1, nCh));
  const closed = new Uint8Array(Math.max(1, nCh));
  const id: number[] = []; const ridPi: number[] = []; const ridA: number[] = [];
  const uid: number[] = []; const uPi: number[] = []; const uA: number[] = []; const uB: number[] = [];
  for (const pi of order) {
    const l = lists[pi]; const m = l.length; const cl = !!st.closed[pi];
    closed[pi] = cl ? 1 : 0;
    const nI = cl ? m : m - 1;
    base[pi] = id.length; cnt[pi] = nI;
    for (let j = 0; j < nI; j++) {
      const a = l[j]; const b = l[(j + 1) % m];
      if (m > 1 && pair.has(a * nS + b)) { id.push(-1); uid.push(uPi.length); uPi.push(pi); uA.push(a); uB.push(b); continue; }
      id.push(ridPi.length); ridPi.push(pi); ridA.push(a); uid.push(-1);
    }
  }
  const uOfPair = new Map<number, number>();
  for (let u = 0; u < uPi.length; u++) { const a = uA[u]; const b = uB[u]; uOfPair.set(a * nS + b, u); uOfPair.set(b * nS + a, u); }
  C.sReg = { pos, base, cnt, closed, id: Int32Array.from(id), n: ridPi.length, ridPi: Int32Array.from(ridPi), ridA: Int32Array.from(ridA), uid: Int32Array.from(uid), nU: uPi.length, uPi: Int32Array.from(uPi), uA: Int32Array.from(uA), uOfPair, nS };
  return C.sReg;
}
/** The id a frame interval starting at slot A takes (-1: none free). */
function structRidC(R: StructRegions, pi: number, A: number, taken: Uint8Array): number {
  const m = R.cnt[pi]; const b = R.base[pi]; const j0 = R.pos[A];
  for (let k = 0; k < m; k++) {
    let j = j0 + k;
    if (j >= m) { if (!R.closed[pi]) break; j -= m; }
    const r = R.id[b + j];
    if (r >= 0 && !taken[r]) return r;
  }
  return -1;
}
// K1247 s14: a closed chain's seam station sits mid-gap. It sat at s = 0, wherever that fell:
// fat's chain 2 crosses itself at x136 just past s = 0, so the over pass's entry cut sat 0.042
// before the seam while its key sat after it; the interval ending at the seam walked into the
// crossing, its ring overlapped its own start (the under pass's exit, same crossing) and
// even-odd dropped the overlap (a 1 px crack at 10.01,1.06). The seam now sits at the middle
// of the structural gap that holds s = 0, between the chain's largest feature key and its
// smallest plus the frame's length: the key stays below every feature's, so the order and the
// ids are unchanged, and no feature's station comes near the seam unless its gap is that
// small. A loop with no feature keeps s = 0. K14_SEAM0=1 restores s = 0 for A/B.
function seamKeyOf(kMin: number, kMax: number, len: number): number {
  if (!(kMax >= kMin) || !(len > 0)) return 0;
  return (kMax + kMin - len) / 2;
}
/** The frame's seam key for closed chain pi (fills C.seamKF[pi]). */
function seamKeyC(C: FCache, pi: number, len: number): number {
  if (!C.seamKR) {
    const R = new Float64Array(Math.max(1, C.nCh) * 2).fill(NaN);
    for (let s = 0; s < C.nSlots; s++) {
      const k = C.slotKind[s]; if (k > 2) continue;
      const q = C.slotPi[s]; const v = C.slotKey[s];
      if (!(R[q * 2] <= v)) R[q * 2] = v;
      if (!(R[q * 2 + 1] >= v)) R[q * 2 + 1] = v;
    }
    C.seamKR = R; C.seamKF = new Float64Array(Math.max(1, C.nCh));
  }
  const sk = seamKeyOf(C.seamKR[pi * 2], C.seamKR[pi * 2 + 1], len);
  C.seamKF![pi] = sk;
  return sk;
}
// K1247 s14: the seam's POSITION within its gap. A key midpoint can land beside a station
// whose cut reaches past it (g41_def_tw64 chain 8: x77's under window wraps past s = 0 to
// cS 0.352, arm 106 starts at 0.667, the key midpoint is 0.410, and x77.0's oblique border
// point passed the seam's on one side, so x77.0 -> seam walked the whole border: a 2389 px
// spill). The seam sits at the middle of the free stretch between the stations behind the
// key midpoint sk0 and those ahead of it; a station's cS decides its side, its extent is its
// cS and both border points' s. Positions only: the key, the order and the ids stay
// structural. No station on a side, or a closed stretch, keeps sk0. K14_SEAMFREE0=1: sk0.
const seamFreeAcc0 = new Float64Array(2);
function seamFreeReset(): Float64Array { seamFreeAcc0[0] = -Infinity; seamFreeAcc0[1] = Infinity; return seamFreeAcc0; }
function seamWrap(d: number, len: number): number { let v = d % len; if (v < 0) v += len; return v > len / 2 ? v - len : v; }
function seamFreeAdd(acc: Float64Array, sk0: number, len: number, sL: number, sR: number, cS: number): void {
  const dc = seamWrap(cS - sk0, len);
  const dl = dc + seamWrap(sL - cS, len); const dr = dc + seamWrap(sR - cS, len);
  if (dc < 0) { const m = Math.max(dc, dl, dr); if (m > acc[0]) acc[0] = m; }
  else { const m = Math.min(dc, dl, dr); if (m < acc[1]) acc[1] = m; }
}
function seamFreeMid(acc: Float64Array): number {
  const b = acc[0]; const a = acc[1];
  if (!(a > b) || !Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return (a + b) / 2;
}
/** Fast path: the seam's offset from sk0 among chain pi's active crossing and junction stations. */
function seamFreeC(C: FCache, pi: number, sk0: number, len: number): number {
  if (!C.seamSl) {
    const cnt = new Int32Array(Math.max(1, C.nCh) + 1);
    for (let s = 0; s < C.nSlots; s++) if (C.slotKind[s] <= 2) cnt[C.slotPi[s] + 1]++;
    for (let q = 0; q < C.nCh; q++) cnt[q + 1] += cnt[q];
    const list = new Int32Array(Math.max(1, cnt[C.nCh])); const at = cnt.slice();
    for (let s = 0; s < C.nSlots; s++) if (C.slotKind[s] <= 2) list[at[C.slotPi[s]]++] = s;
    C.seamSl0 = cnt; C.seamSl = list;
  }
  const acc = seamFreeReset();
  for (let k = C.seamSl0![pi]; k < C.seamSl0![pi + 1]; k++) {
    const s = C.seamSl[k]; if (!C.stActive[s]) continue;
    seamFreeAdd(acc, sk0, len, C.refS0[C.stLeft[s]], C.refS0[C.stRight[s]], C.stCS[s]);
  }
  return seamFreeMid(acc);
}
/** The builder's station key -> the cache's slot. */
function slotOfKeyC(C: FCache, key: string): number {
  if (key.startsWith("cap")) { const bar = key.indexOf("|"); return C.capSlot[parseInt(key.slice(3, bar), 10) * 2 + (key.endsWith("|1") ? 1 : 0)]; }
  if (key.startsWith("seam")) return C.seamSlot[parseInt(key.slice(4), 10)];
  if (key.startsWith("j")) return C.junctionSlot[parseInt(key.slice(key.indexOf("|a") + 2), 10)];
  const over = key.startsWith("xo"); const bar = key.indexOf("|");
  const xi = parseInt(key.slice(over ? 2 : 1, bar), 10); const side = parseInt(key.slice(bar + 1), 10);
  return (over ? C.crossOverSlot : C.crossUnderSlot)[xi * 2 + (side === 1 ? 0 : 1)];
}
// K1247 s13: the group from structure (grpMode.adj, off by default): an
// interval takes the group of the arm whose root slot bounds it on the arm's
// own side (dir +1 at A, dir -1 at B), else -1. No diagram fact reproduces
// today's rest groups: they differ from this rule only where cMid lies past
// the cut-limited L (728 regions over the 12 scenes, all -1 today, the
// junction's group here), a length threshold that splits every diagram
// predicate tried about 26/74 (k1247s13_group.ts GRP_PRED=1). Waits on Levi.
function memberGroupC(C: FCache, pi: number, s: number): number {
  let best = 0; let g = -1;
  const h = C.h;
  for (const ai of C.armsOfChain[pi]) {
    const d = armDistC(C, ai, s);
    if (d < 0 || d > C.armL[ai]) continue;
    const t = ssFB(0, h, C.armL[ai] - d);
    if (t > best) { best = t; g = C.armObj[ai].g; }
  }
  return g;
}

const kfFootW = new Float64Array(6);
// A depth pin, inserted in s order (K1247 s3: was a closure per crossing).
function addPinC(C: FCache, pi: number, s: number, z: number): void {
  const S = C.depthS[pi]; const Z = C.depthZ[pi];
  const n = C.depthN[pi];
  let i2 = n;
  while (i2 > 0 && S[i2 - 1] > s) { S[i2] = S[i2 - 1]; Z[i2] = Z[i2 - 1]; i2--; }
  S[i2] = s; Z[i2] = z;
  C.depthN[pi] = n + 1;
}
function setupFrame(C: FCache, st: DiagramStructure, scene: SceneIn): void {
  const h = C.h;
  const idxOf = new Map<number, number>();
  st.chainIds.forEach((id, i) => idxOf.set(id, i));
  // Centrelines: raw only where an extension may apply.
  for (let i = 0; i < C.nCh; i++) {
    if (C.needRaw[i]) fillPoly(C.rawPolys[i], scene.chains[i].pts, scene.chains[i].closed, 0);
    else fillPoly(C.polys[i], scene.chains[i].pts, scene.chains[i].closed, 0);
    C.origLen[i] = C.needRaw[i] ? C.rawPolys[i].len : C.polys[i].len;
  }
  // Extensions for END arms, as the builder: straight to the foot on the
  // through chain's centreline inside +-4h of the through arm's s.
  interface Ext { start?: [number, number]; end?: [number, number] }
  const exts: Ext[] = C.polys.map(() => ({}));
  st.arms.forEach((a) => {
    if (a.kind !== "end") return;
    const j = scene.junctions[a.ji];
    const xa = j?.arms[a.ei];
    if (!xa) return;
    const rp = C.needRaw[a.pi] ? C.rawPolys[a.pi] : C.polys[a.pi];
    const term = pointAt(rp, xa.s);
    let cp: [number, number] = [j.c[0], j.c[1]];
    let best = Infinity;
    for (const t of j.arms) {
      if (t.kind !== "through") continue;
      const ti = idxOf.get(t.chain);
      if (ti === undefined) continue;
      const tp = C.needRaw[ti] ? C.rawPolys[ti] : C.polys[ti];
      footInWindowInto(tp, term.x, term.y, t.s - 4 * h, t.s + 4 * h, kfFootW);
      // K1247 s16: blended across a concave vertex's bisector (footBlendInto).
      if (footBlendInto(tp, term.x, term.y, kfFootW[4], kfFootW[5], kfFootB)) { kfFootW[0] = kfFootB[0]; kfFootW[1] = kfFootB[1]; kfFootW[2] = kfFootB[2]; }
      if (kfFootW[0] < best) { best = kfFootW[0]; cp = [kfFootW[1], kfFootW[2]]; }
    }
    const atStart = Math.abs(xa.s - 0) < Math.abs(xa.s - rp.len);
    // K1338: with the snap on, the extension's foot is held while it moves at most T px.
    if (kfHoldFeet) cp = holdFootC(C, scene, a.pi * 2 + (atStart ? 0 : 1), cp);
    if (atStart) exts[a.pi].start = cp;
    else exts[a.pi].end = cp;
  });
  for (let i = 0; i < C.nCh; i++) {
    const e = exts[i];
    if (!e.start && !e.end) { if (C.needRaw[i]) copyPoly(C.rawPolys[i], C.polys[i]); continue; }
    const c0 = scene.chains[i];
    // K1247 s9 (cause 5): the builder's drop of a sub-0.1 h terminal segment's interior point.
    let cpts = c0.pts;
    { const endMin = 0.1 * h; let q: number[] | null = null;
      if (e.start && cpts.length >= 6 && Math.hypot(cpts[2] - cpts[0], cpts[3] - cpts[1]) < endMin) { q = Array.from(cpts); q.splice(2, 2); }
      const r = q ?? cpts;
      if (e.end && r.length >= 6) { const m = r.length; if (Math.hypot(r[m - 2] - r[m - 4], r[m - 1] - r[m - 3]) < endMin) { q = Array.from(r); q.splice(m - 4, 2); } }
      if (q) cpts = q; }
    const c = { pts: cpts, closed: c0.closed };
    let s0 = 0;
    let hasPre = false; let hasPost = false;
    if (e.start) { const d = Math.hypot(c.pts[0] - e.start[0], c.pts[1] - e.start[1]); if (d > 1e-9) { hasPre = true; s0 = -d; } }
    if (e.end) { const m = c.pts.length; const d = Math.hypot(c.pts[m - 2] - e.end[0], c.pts[m - 1] - e.end[1]); if (d > 1e-9) hasPost = true; }
    if ((c.pts.length & 1) === 0) {
      fillPolyPP(C.polys[i], c.pts, c.closed, s0, hasPre, hasPre ? e.start![0] : 0, hasPre ? e.start![1] : 0, hasPost, hasPost ? e.end![0] : 0, hasPost ? e.end![1] : 0);
    } else {
      // An odd-length point list shifts the pairs after it; keep the old concat.
      const pts: number[] = [];
      if (hasPre) pts.push(e.start![0], e.start![1]);
      for (const v of c.pts) pts.push(v);
      if (hasPost) pts.push(e.end![0], e.end![1]);
      fillPoly(C.polys[i], pts, c.closed, s0);
    }
  }
  const polys = C.polys;
  // Crossings: centres, angles, per-chain passes, depth pins.
  const amp = C.depthAmp;
  C.depthN.fill(0);
  for (let xi = 0; xi < C.nX; xi++) {
    const x = scene.crossings[xi];
    if (!x) continue;
    const ia = C.crossAPi[xi]; const ib = C.crossBPi[xi];
    let sa = normS(polys[ia], x.a.s); let sb = normS(polys[ib], x.b.s);
    C.cpSnap[xi] = 0;
    C.cpSA[xi] = sa; C.cpSB[xi] = sb;
    tanAtInto(polys[ia], sa, ptScratch); tanAtInto(polys[ib], sb, ptScratch2);
    const theta = Math.acos(Math.min(1, Math.abs(ptScratch[0] * ptScratch2[0] + ptScratch[1] * ptScratch2[1])));
    C.cpTheta[xi] = theta;
    const over = C.crossOver[xi];
    C.cpSOver[xi] = over === ia ? sa : sb;
    C.cpSUnder[xi] = over === ia ? sb : sa;
    pointAtInto(polys[ia], sa, ptScratch);
    C.cpX[xi] = ptScratch[0]; C.cpY[xi] = ptScratch[1];
    // depth pins (insertion into per-chain sorted arrays)
    addPinC(C, ia, sa, x.over === "a" ? amp : -amp);
    addPinC(C, ib, sb, x.over === "b" ? amp : -amp);
  }
  for (let pi = 0; pi < C.nCh; pi++) {
    const lst = C.passXi[pi];
    let n = 0;
    for (let e = 0; e < lst.length; e++) {
      const xi = lst[e];
      const x = scene.crossings[xi];
      if (!x) continue;
      const isB = C.passIsB[pi][e] === 1;
      const qi = isB ? C.crossAPi[xi] : C.crossBPi[xi];
      C.passS[pi][n] = isB ? C.cpSB[xi] : C.cpSA[xi];
      C.passSq[pi][n] = isB ? C.cpSA[xi] : C.cpSB[xi];
      C.passTheta[pi][n] = C.cpTheta[xi];
      C.passQi[pi][n] = qi;
      n++;
    }
    C.passN[pi] = n;
    const ord = C.passSort[pi];
    for (let e = 0; e < n; e++) ord[e] = e;
    // insertion sort by s (pass counts per chain are small)
    for (let i = 1; i < n; i++) {
      const v = ord[i]; const sv = C.passS[pi][v];
      let j = i - 1;
      while (j >= 0 && C.passS[pi][ord[j]] > sv) { ord[j + 1] = ord[j]; j--; }
      ord[j + 1] = v;
    }
  }
  // Arms: roots, spans, directions (the builder's rules).
  const arms = C.armObj;
  for (let ai = 0; ai < C.nArms; ai++) {
    const a = arms[ai];
    const p = polys[a.pi];
    const xa = scene.junctions[a.ji]?.arms[a.ei];
    if (a.kind === "end") {
      const atStart = xa ? Math.abs(xa.s - 0) < Math.abs(xa.s - C.origLen[a.pi]) : true;
      C.armDir[ai] = atStart ? 1 : -1;
      C.armSR[ai] = atStart ? p.s0 : p.s0 + p.len;
    } else {
      C.armDir[ai] = a.dir;
      C.armSR[ai] = xa ? normS(p, xa.s) : 0;
    }
    a.sR = C.armSR[ai]; a.dir = C.armDir[ai];
  }
  // Roots per chain for span limits.
  C.chainRoots = [];
  for (let pi = 0; pi < C.nCh; pi++) {
    const roots: number[] = [];
    for (const ai of C.armsOfChain[pi]) roots.push(C.armSR[ai]);
    C.chainRoots.push(Float64Array.from(roots));
  }
  const reachOf = (pi: number, e: number, dirA: number): number => {
    const rKey = e * 2 + (dirA > 0 ? 0 : 1);
    if (C.reachStamp[pi][rKey] === kfFrameNo) return C.reachArr[pi][rKey];
    const rVal = reachOfInner(pi, e, dirA);
    C.reachStamp[pi][rKey] = kfFrameNo;
    C.reachArr[pi][rKey] = rVal;
    return rVal;
  };
  const reachOfInner = (pi: number, e: number, dirA: number): number => {
    const theta = C.passTheta[pi][e];
    const t = Math.tan(theta / 2);
    let reach = t > 1e-12 ? h / t : Infinity;
    const fl = 4 * h;
    if (reach > fl) {
      const pa = polys[pi]; const pq = polys[C.passQi[pi][e]];
      const s = C.passS[pi][e]; const sq = C.passSq[pi][e];
      tanAtInto(pa, s, ptScratch); tanAtInto(pq, sq, ptScratch2);
      const sb = -dirA * (ptScratch[0] * ptScratch2[0] + ptScratch[1] * ptScratch2[1]) >= 0 ? 1 : -1;
      const aC = 2 * Math.sin(theta / 2);
      const T = 2 * h * Math.cos(theta / 2);
      const eA = pa.closed ? pa.len / 2 : dirA > 0 ? s - pa.s0 : pa.s0 + pa.len - s;
      let r = aC > 0 ? T / aC : Infinity;
      let ee = fl;
      for (let k = 0; k < 2; k++) {
        const ek = Math.max(1e-6, Math.min(ee, eA));
        pointAtInto(pa, s - dirA * ek, ptScratch); pointAtInto(pq, sq + sb * ek, ptScratch2);
        const gx = ptScratch[0] - ptScratch2[0]; const gy = ptScratch[1] - ptScratch2[1];
        const g = Math.sqrt(gx * gx + gy * gy);
        const kap = Math.max(0, (2 * (g - aC * ek)) / (ek * ek));
        r = (2 * T) / (aC + Math.sqrt(aC * aC + 2 * kap * T));
        ee = Math.max(fl, r);
      }
      reach = Math.min(reach, Math.max(fl, r));
    }
    return reach;
  };
  const pend: { ai: number; Lroot: number; uB: number }[] = [];
  for (let ai = 0; ai < C.nArms; ai++) {
    const a = arms[ai];
    const p = polys[a.pi];
    const sR = C.armSR[ai]; const dir = C.armDir[ai];
    const delta = (sv: number): number => { let d = (sv - sR) * dir; if (p.closed) d = ((d % p.len) + p.len) % p.len; return d; };
    let L = p.closed ? p.len : dir > 0 ? p.s0 + p.len - sR : sR - p.s0;
    for (const qs of C.chainRoots[a.pi]) { const d = delta(qs); if (d > 1e-9 && d < L) L = d; }
    let Lcut = Infinity; let uB = Infinity;
    const nP = C.passN[a.pi];
    for (let e = 0; e < nP; e++) {
      const sv = C.passS[a.pi][e];
      const d = delta(sv);
      const u = p.closed ? p.len - d : -d;
      if (p.closed || d < -1e-12) { if (u >= 0 && u < uB) uB = u; }
      if (d < -1e-12) continue;
      Lcut = Math.min(Lcut, d - reachOf(a.pi, e, dir) - h);
    }
    const Lroot = L;
    L = Math.max(0, Math.min(L, Lcut));
    if (uB < Infinity) pend.push({ ai, Lroot, uB });
    C.armLcut[ai] = Lcut;
    C.armL[ai] = L;
    a.L = L;
  }
  for (let ai = 0; ai < C.nArms; ai++) {
    const a = arms[ai];
    const p = polys[a.pi];
    const xa = scene.junctions[a.ji]?.arms[a.ei];
    const sB = a.kind === "end" && xa ? normS(p, xa.s) : C.armSR[ai];
    pointAtInto(p, sB, ptScratch);
    let s1 = sB + C.armDir[ai] * 2 * h;
    if (!p.closed) s1 = Math.min(Math.max(s1, p.s0), p.s0 + p.len);
    pointAtInto(p, s1, ptScratch2);
    let ux = ptScratch2[0] - ptScratch[0]; let uy = ptScratch2[1] - ptScratch[1];
    const ul = Math.sqrt(ux * ux + uy * uy);
    if (ul < 1e-12) { ux = ptScratch[2] * C.armDir[ai]; uy = ptScratch[3] * C.armDir[ai]; } else { ux /= ul; uy /= ul; }
    C.armUx[ai] = ux; C.armUy[ai] = uy; C.armAng[ai] = Math.atan2(uy, ux);
    a.ux = ux; a.uy = uy; a.ang = C.armAng[ai];
  }
  for (let ji = 0; ji < C.armsOfJSorted.length; ji++) {
    const l = C.armsOfJSorted[ji];
    const src = st.armsOfJ[ji];
    l.length = 0;
    for (const v of src) l.push(v);
    l.sort((x, y) => C.armAng[x] - C.armAng[y]);
  }
  for (const pd of pend) {
    const A = arms[pd.ai];
    const list = C.armsOfJSorted[A.ji];
    const n = list.length;
    const at = list.indexOf(pd.ai);
    if (at < 0 || n < 2) continue;
    const J = scene.junctions[A.ji];
    if (!J) continue;
    let gMax = 0;
    for (const [aa, bb] of [[list[(at + n - 1) % n], pd.ai], [pd.ai, list[(at + 1) % n]]] as [number, number][]) {
      if (aa === bb) continue;
      const xa = J.arms[arms[aa].ei]; const xb = J.arms[arms[bb].ei];
      if (xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      let th = C.armAng[bb] - C.armAng[aa];
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th < Math.PI) gMax = Math.max(gMax, Math.tan((Math.PI - th) / 4));
    }
    const k = gMax > 0 ? Math.min(4, Math.max(1, 1 / gMax)) : 4;
    const c = k * pd.uB;
    if (c < C.armLcut[pd.ai]) C.armLcut[pd.ai] = c;
    C.armL[pd.ai] = Math.max(0, Math.min(pd.Lroot, C.armLcut[pd.ai]));
    A.L = C.armL[pd.ai];
  }
  // Overall chain bboxes (diagnostics pruning).
  for (let pi = 0; pi < C.nCh; pi++) {
    const p = polys[pi];
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let blk = 0; blk < p.nblk; blk++) {
      if (p.bk[4 * blk] < x0) x0 = p.bk[4 * blk];
      if (p.bk[4 * blk + 1] < y0) y0 = p.bk[4 * blk + 1];
      if (p.bk[4 * blk + 2] > x1) x1 = p.bk[4 * blk + 2];
      if (p.bk[4 * blk + 3] > y1) y1 = p.bk[4 * blk + 3];
    }
    C.polyBox[4 * pi] = x0; C.polyBox[4 * pi + 1] = y0; C.polyBox[4 * pi + 2] = x1; C.polyBox[4 * pi + 3] = y1;
  }
  // Segment tangents + margin dot arrays for chains that carry arms.
  for (let pi = 0; pi < C.nCh; pi++) {
    if (!C.armsOfChain[pi].length) continue;
    const p = polys[pi];
    const tx = C.tanTx[pi]; const ty = C.tanTy[pi]; const gF = C.tanGF[pi]; const gB = C.tanGB[pi];
    for (let k = 0; k < p.nseg; k++) {
      const l = p.segLen[k] || 1;
      const ux = p.dx[k] / l; const uy = p.dy[k] / l;
      tx[k] = ux; ty[k] = uy;
      gF[k] = p.x[k] * ux + p.y[k] * uy;
    }
    for (let i = 0; i < p.n; i++) {
      const kin = i > 0 ? i - 1 : p.closed ? p.nseg - 1 : -1;
      gB[i] = kin >= 0 ? p.x[i] * tx[kin] + p.y[i] * ty[kin] : 0;
    }
  }
}

// --- the incremental frame (K1247 s30, K1338) --------------------------------
// No input is bit-equal from one drag frame to the next (every chain creeps by
// hundredths of a px), so a cache keyed on exact inputs needs a snap first:
// snapScene holds each chain at its last committed points until one of them
// moves more than T device px, and holds a crossing's s (both chains held)
// and a junction (all its arms' chains held) with it. On a held chain the
// borders' inputs are bit-equal, and buildBorderInc reuses the last build.
// K1247 s31: the snap runs once, in OutlineModel.update (KF_INC.snap), so frame,
// zChains, fill, paint and band all read the one snapped scene, and its dirty
// set (SnapState.dChains / dCross / dJunc: what was released this frame) is
// the model's; frameSnapped also holds the END-arm feet. The caches
// (KF_INC.cache: borders, corners) are exact: the frame on a snapped scene is
// byte-identical with them on or off (outline_inc.test.ts). Both off by default.
export const KF_INC = { snap: false, cache: false, T: 0.5, hits: 0, misses: 0, cHits: 0, cMisses: 0, why: null as Record<string, number> | null };
let kfHoldFeet = false;

export interface SnapState {
  chains: (number[] | null)[]; cross: (SceneIn["crossings"][number] | null)[]; junc: (SceneIn["junctions"][number] | null)[];
  /** The last snapScene's dirty set: 1 where a chain, crossing or junction was released (recommitted) this frame. */
  dChains: Uint8Array; dCross: Uint8Array; dJunc: Uint8Array;
}
export function newSnapState(): SnapState { return { chains: [], cross: [], junc: [], dChains: new Uint8Array(0), dCross: new Uint8Array(0), dJunc: new Uint8Array(0) }; }
/** K1338: the scene with every chain that moved at most T device px since its
 *  last commit held at its committed points (see KF_INC). */
export function snapScene(S: SnapState, scene: SceneIn, T = KF_INC.T): SceneIn {
  const px = scene.camera.pxPerUnit * scene.camera.dpr;
  const tw2 = (T / px) * (T / px);
  const idx = new Map<number, number>();
  const held: boolean[] = [];
  const nC = scene.chains.length; const nX = scene.crossings.length; const nJ = scene.junctions.length;
  if (S.dChains.length !== nC) S.dChains = new Uint8Array(nC);
  if (S.dCross.length !== nX) S.dCross = new Uint8Array(nX);
  if (S.dJunc.length !== nJ) S.dJunc = new Uint8Array(nJ);
  const dC = S.dChains; const dX = S.dCross; const dJ = S.dJunc;
  const chains = scene.chains.map((c, i) => {
    idx.set(c.id, i);
    const old = S.chains[i];
    const pts = c.pts as ArrayLike<number>;
    if (old && old.length === pts.length) {
      let ok = true;
      for (let k = 0; k < pts.length && ok; k += 2) { const dx = pts[k] - old[k]; const dy = pts[k + 1] - old[k + 1]; ok = dx * dx + dy * dy <= tw2; }
      if (ok) { held[i] = true; dC[i] = 0; return { ...c, pts: old }; }
    }
    S.chains[i] = Array.from(pts);
    held[i] = false; dC[i] = 1;
    return { ...c, pts: S.chains[i] as number[] };
  });
  // An s along a held chain is held while it moves at most T px along it, so a
  // chain beside a moving one keeps its passes (each end is held on its own).
  const ts = T / px;
  const keepS = (chain: number, s0: number, s1: number): boolean => { const i = idx.get(chain); return i !== undefined && held[i] && Math.abs(s1 - s0) <= ts; };
  const crossings = scene.crossings.map((x, xi) => {
    const old = S.cross[xi];
    if (old && old.a.chain === x.a.chain && old.b.chain === x.b.chain && old.over === x.over) {
      const ka = keepS(x.a.chain, old.a.s, x.a.s); const kb = keepS(x.b.chain, old.b.s, x.b.s);
      if (ka && kb) { dX[xi] = 0; return old; }
      const y = { ...x, a: { ...x.a, s: ka ? old.a.s : x.a.s }, b: { ...x.b, s: kb ? old.b.s : x.b.s } };
      S.cross[xi] = y; dX[xi] = 1;
      return y;
    }
    const y = { ...x, a: { ...x.a }, b: { ...x.b } };
    S.cross[xi] = y; dX[xi] = 1;
    return y;
  });
  const junctions = scene.junctions.map((j, ji) => {
    const old = S.junc[ji];
    if (old && old.id === j.id && old.arms.length === j.arms.length && j.arms.every((a, k) => old.arms[k].chain === a.chain && old.arms[k].kind === a.kind)) {
      const kc = Math.hypot(j.c[0] - old.c[0], j.c[1] - old.c[1]) <= ts;
      const ks = j.arms.map((a, k) => keepS(a.chain, old.arms[k].s, a.s));
      if (kc && ks.every(Boolean)) { dJ[ji] = 0; return old; }
      const y = structuredClone(j);
      if (kc) y.c = [old.c[0], old.c[1]];
      y.arms.forEach((a, k) => { if (ks[k]) a.s = old.arms[k].s; });
      S.junc[ji] = y; dJ[ji] = 1;
      return y;
    }
    const y = structuredClone(j);
    S.junc[ji] = y; dJ[ji] = 1;
    return y;
  });
  return { ...scene, chains, crossings, junctions };
}
const kfFootHold = new WeakMap<FCache, Map<number, [number, number]>>();
function holdFootC(C: FCache, scene: SceneIn, key: number, cp: [number, number]): [number, number] {
  let M = kfFootHold.get(C); if (!M) { M = new Map(); kfFootHold.set(C, M); }
  const old = M.get(key); const tw = KF_INC.T / (scene.camera.pxPerUnit * scene.camera.dpr);
  if (old && Math.hypot(cp[0] - old[0], cp[1] - old[1]) <= tw) return old;
  M.set(key, cp);
  return cp;
}

// The border cache: per chain, its inputs' bits (borderKeyC) and both
// borders' outputs (the fields later phases read, up to nb) and fold notes.
interface BEnt { nb: number; f: Float64Array; bcv: Int8Array; diag: string[] }
interface BInc { keys: (Float64Array | null)[]; ents: (BEnt | null)[]; miss: number[] }
const kfBInc = new WeakMap<FCache, BInc>();
let kfKey = new Float64Array(1024);
function borderKeyC(C: FCache, pi: number): number {
  const p = C.polys[pi]; const n = p.n; const nseg = p.nseg; const np = C.passN[pi]; const roots = C.chainRoots[pi];
  const need = 9 + 3 * n + nseg + 3 * np + roots.length;
  if (kfKey.length < need) kfKey = new Float64Array(2 * need);
  const k = kfKey; let o = 0;
  k[o++] = C.h; k[o++] = C.W; k[o++] = n; k[o++] = nseg; k[o++] = p.closed ? 1 : 0; k[o++] = p.s0; k[o++] = p.len; k[o++] = np; k[o++] = roots.length;
  k.set(p.x.subarray(0, n), o); o += n; k.set(p.y.subarray(0, n), o); o += n; k.set(p.s.subarray(0, n), o); o += n;
  k.set(p.segLen.subarray(0, nseg), o); o += nseg;
  const ps = C.passS[pi]; const psq = C.passSq[pi]; const pxi = C.passXi[pi];
  // The border reads a pass's other s and its crossing only to ask whether it is a self-crossing (cutFoldsC's nearKink).
  for (let e = 0; e < np; e++) { const xi = pxi[e]; const self = C.crossAPi[xi] === C.crossBPi[xi]; k[o++] = ps[e]; k[o++] = self ? 1 : 0; k[o++] = self ? psq[e] : 0; }
  k.set(roots, o); o += roots.length;
  return o;
}
function bitEq(a: Float64Array, b: Float64Array, n: number): boolean {
  const ia = new Int32Array(a.buffer, a.byteOffset, 2 * n); const ib = new Int32Array(b.buffer, b.byteOffset, 2 * n);
  for (let i = 0; i < 2 * n; i++) if (ia[i] !== ib[i]) return false;
  return true;
}
const BINC_F = ["bx", "by", "bs", "bsm", "bfx", "bfy", "bs2", "be", "bc"] as const;
function buildBorderInc(C: FCache, pi: number): void {
  let I = kfBInc.get(C);
  if (!I) { I = { keys: [], ents: [], miss: [] }; kfBInc.set(C, I); }
  const len = borderKeyC(C, pi);
  const old = I.keys[pi];
  if (old && old.length === len && bitEq(old, kfKey, len)) {
    KF_INC.hits++; I.miss[pi] = 0;
    const diag = (C as unknown as { __foldDiag: string[] }).__foldDiag;
    for (let side = 0; side < 2; side++) {
      const e = I.ents[pi * 2 + side] as BEnt; const B = C.bords[pi * 2 + side]; const nb = e.nb;
      if (B.bcv.length < nb) { B.bcv = new Int8Array(2 * nb); B.bs2 = new Float64Array(2 * nb); }
      for (let f = 0; f < BINC_F.length; f++) {
        const key = BINC_F[f];
        if (key !== "bs2" && B[key].length < nb) B[key] = growF(B[key], nb);
        B[key].set(e.f.subarray(f * nb, (f + 1) * nb));
      }
      B.bcv.set(e.bcv);
      B.nb = nb;
      for (const s of e.diag) if (diag.length < CF_DIAG_N) diag.push(s);
    }
    return;
  }
  KF_INC.misses++; I.miss[pi] = 1;
  if (KF_INC.why && old) { const p = C.polys[pi]; const n = p.n; const cuts = [9, 9 + n, 9 + 2 * n, 9 + 3 * n, 9 + 3 * n + p.nseg, len - C.chainRoots[pi].length, len]; const names = ["head", "x", "y", "s", "segLen", "passes", "roots"]; let r = old.length !== len ? "len" : ""; if (!r) { let i = 0; while (i < len && old[i] === kfKey[i]) i++; let q = 0; while (q < cuts.length && i >= cuts[q]) q++; r = q === 0 ? ["h", "W", "n", "nseg", "closed", "s0", "len", "np", "nroots"][i] : names[q] ?? "?"; } KF_INC.why[r] = (KF_INC.why[r] ?? 0) + 1; }
  I.keys[pi] = kfKey.slice(0, len);
  const real = (C as unknown as { __foldDiag: string[] }).__foldDiag;
  for (let side = 0; side < 2; side++) {
    const mine: string[] = [];
    (C as unknown as { __foldDiag: string[] }).__foldDiag = mine;
    buildBorderC(C, pi, side === 0 ? 1 : -1);
    (C as unknown as { __foldDiag: string[] }).__foldDiag = real;
    for (const s of mine) if (real.length < CF_DIAG_N) real.push(s);
    const B = C.bords[pi * 2 + side]; const nb = B.nb;
    const f = new Float64Array(BINC_F.length * nb);
    for (let q = 0; q < BINC_F.length; q++) f.set(B[BINC_F[q]].subarray(0, nb), q * nb);
    I.ents[pi * 2 + side] = { nb, f, bcv: B.bcv.slice(0, nb), diag: mine };
  }
}

// --- borders ---------------------------------------------------------------
const KF_COS_FAN2 = Math.cos((Math.PI / 16) * (1 - 1e-6)) ** 2;
// K1247 s31: the corner cache. A corner on the main solve path (not a through
// bend, not a fallback or dead corner) reads only its two arm chains (their
// polylines, tangents and base borders: the border key; their depth table and
// every arm on them: auxKeyC) and its junction's centre; insertions made by
// earlier corners sit in a side list it never reads. chainVersC gives each
// chain a version that changes (to a number never used before) whenever any of
// that changes; a corner whose two versions and centre bits match its last
// main-path solve restores that solve's outputs and replays its two border
// insertions in the same order. The warm state (wV*, walk caches) is write-only.
interface CInc { ver: number[]; aux: (Float64Array | null)[]; ents: (Float64Array | null)[] }
const kfCInc = new WeakMap<FCache, CInc>();
let kfCI: CInc | null = null; // this frame's chain versions while the cache is on (frameFast)
let kfVerNext = 1;
let kfAux = new Float64Array(256);
function auxKeyC(C: FCache, pi: number): number {
  const nd = C.depthN[pi]; const arms = C.armsOfChain[pi];
  const need = 2 + 2 * nd + 7 * arms.length;
  if (kfAux.length < need) kfAux = new Float64Array(2 * need);
  const k = kfAux; let o = 0;
  k[o++] = nd; k[o++] = arms.length;
  k.set(C.depthS[pi].subarray(0, nd), o); o += nd; k.set(C.depthZ[pi].subarray(0, nd), o); o += nd;
  for (let q = 0; q < arms.length; q++) {
    const ai = arms[q];
    k[o++] = C.armSR[ai]; k[o++] = C.armDir[ai]; k[o++] = C.armL[ai]; k[o++] = C.armLcut[ai];
    k[o++] = C.armUx[ai]; k[o++] = C.armUy[ai]; k[o++] = C.armAng[ai];
  }
  return o;
}
/** Per chain, this frame's version (after setupFrame and the borders; KF_INC.cache only). */
function chainVersC(C: FCache): CInc {
  let I = kfCInc.get(C);
  if (!I) { I = { ver: [], aux: [], ents: [] }; kfCInc.set(C, I); }
  const bm = (kfBInc.get(C) as BInc).miss;
  for (let pi = 0; pi < C.nCh; pi++) {
    const len = auxKeyC(C, pi);
    const old = I.aux[pi];
    const same = !!old && old.length === len && bitEq(old, kfAux, len);
    if (!same) I.aux[pi] = kfAux.slice(0, len);
    if (!same || bm[pi] !== 0 || I.ver[pi] === undefined) I.ver[pi] = kfVerNext++;
  }
  return I;
}
const CE_N = 18;
function sameBits(a: number, b: number): boolean { return a === b && (a !== 0 || 1 / a === 1 / b); }
/** A main-path corner's outputs from the cache, when its key matches; false: solve it. */
function cornerHitC(C: FCache, I: CInc, ci: number, aiA: number, aiB: number, sideA: number, sideB: number, jx: number, jy: number): boolean {
  const e = I.ents[ci];
  const piA = C.armObj[aiA].pi; const piB = C.armObj[aiB].pi;
  if (!e || e[0] !== I.ver[piA] || e[1] !== I.ver[piB] || !sameBits(e[2], jx) || !sameBits(e[3], jy)) { KF_INC.cMisses++; return false; }
  KF_INC.cHits++;
  C.cOk[ci] = 1;
  C.cVx[ci] = e[5]; C.cVy[ci] = e[6]; C.cQx[ci] = e[7]; C.cQy[ci] = e[8]; C.cR[ci] = e[9];
  C.cTax[ci] = e[10]; C.cTay[ci] = e[11]; C.cTbx[ci] = e[12]; C.cTby[ci] = e[13];
  C.cSA[ci] = e[14]; C.cSB[ci] = e[15]; C.cDA[ci] = e[16]; C.cDB[ci] = e[17];
  C.cRefA[ci] = addPointAtC(C, piA, sideA, e[10], e[11], e[14]);
  C.cRefB[ci] = addPointAtC(C, piB, sideB, e[12], e[13], e[15]);
  C.armNextRef[aiA] = C.cRefA[ci]; C.armNextSide[aiA] = sideA;
  C.armPrevRef[aiB] = C.cRefB[ci]; C.armPrevSide[aiB] = sideB;
  return true;
}
function cornerStoreC(C: FCache, I: CInc, ci: number, aiA: number, aiB: number, jx: number, jy: number): void {
  let e = I.ents[ci];
  if (!e) { e = new Float64Array(CE_N); I.ents[ci] = e; }
  e[0] = I.ver[C.armObj[aiA].pi]; e[1] = I.ver[C.armObj[aiB].pi]; e[2] = jx; e[3] = jy; e[4] = C.cTheta[ci];
  e[5] = C.cVx[ci]; e[6] = C.cVy[ci]; e[7] = C.cQx[ci]; e[8] = C.cQy[ci]; e[9] = C.cR[ci];
  e[10] = C.cTax[ci]; e[11] = C.cTay[ci]; e[12] = C.cTbx[ci]; e[13] = C.cTby[ci];
  e[14] = C.cSA[ci]; e[15] = C.cSB[ci]; e[16] = C.cDA[ci]; e[17] = C.cDB[ci];
}
function buildBorderC(C: FCache, pi: number, sig: number): void {
  const p = C.polys[pi];
  const B = C.bords[pi * 2 + (sig === 1 ? 0 : 1)];
  const h = C.h;
  const n = p.n; const nseg = p.nseg;
  if (nseg === 0) { B.nb = 0; return; }
  // Per-vertex offsets: A_v along the incoming segment, B_v along the
  // outgoing segment (the builder's offPoint at each vertex).
  const cap = 8 * n + 64;
  B.px = growF(B.px, cap); B.py = growF(B.py, cap); B.ps = growF(B.ps, cap); B.pv = growI(B.pv, cap);
  const oax = C.offAx; const oay = C.offAy; const obx = C.offBx; const oby = C.offBy;
  const PX = B.px; const PY = B.py; const PS = B.ps; const PV = B.pv;
  for (let v = 0; v < n; v++) {
    const kPrev = v - 1 < 0 ? nseg - 1 : v - 1;
    const kNext = v >= nseg ? 0 : v;
    const bp = kPrev + 1 === n ? 0 : kPrev + 1;
    const lp = p.segLen[kPrev] || 1;
    oax[v] = p.x[v] + sig * h * (-(p.y[bp] - p.y[kPrev]) / lp);
    oay[v] = p.y[v] + sig * h * ((p.x[bp] - p.x[kPrev]) / lp);
    const bn = kNext + 1 === n ? 0 : kNext + 1;
    const ln = p.segLen[kNext] || 1;
    obx[v] = p.x[v] + sig * h * (-(p.y[bn] - p.y[kNext]) / ln);
    oby[v] = p.y[v] + sig * h * ((p.x[bn] - p.x[kNext]) / ln);
  }
  let out = 0;
  // transition(v): join at vertex v between A_v (already the last point,
  // except at the start) and B_v. Same branches as the builder.
  const transition = (v: number): boolean => {
    const kPrev = v - 1 < 0 ? nseg - 1 : v - 1;
    const kNext = v >= nseg ? 0 : v;
    const bp = kPrev + 1 === n ? 0 : kPrev + 1;
    const lp = p.segLen[kPrev] || 1;
    const tPx = (p.x[bp] - p.x[kPrev]) / lp; const tPy = (p.y[bp] - p.y[kPrev]) / lp;
    const bn = kNext + 1 === n ? 0 : kNext + 1;
    const ln = p.segLen[kNext] || 1;
    const tNx = (p.x[bn] - p.x[kNext]) / ln; const tNy = (p.y[bn] - p.y[kNext]) / ln;
    const cross = tPx * tNy - tPy * tNx;
    const ax = oax[v]; const ay = oay[v]; const bx = obx[v]; const by = oby[v];
    if (Math.abs(cross) < 1e-12) {
      if (!(out > 0 && Math.abs(PX[out - 1] - bx) + Math.abs(PY[out - 1] - by) < 1e-12)) { PX[out] = bx; PY[out] = by; PS[out] = p.s[v]; PV[out] = v; out++; }
      return false;
    }
    const joinSide = cross > 0 ? 1 : -1;
    if (sig === joinSide) {
      const dx = bx - ax; const dy = by - ay;
      const tt = (dx * tNy - dy * tNx) / cross;
      const jx = ax + tPx * tt; const jy = ay + tPy * tt;
      if (out > 0 && Math.abs(PX[out - 1] - ax) + Math.abs(PY[out - 1] - ay) < 1e-9) { PX[out - 1] = jx; PY[out - 1] = jy; PV[out - 1] = v; }
      else { PX[out] = jx; PY[out] = jy; PS[out] = p.s[v]; PV[out] = v; out++; }
      return true;
    }
    // K1247 s2: a turn clearly under pi/16 makes one step (no fan
    // points), so the two atan2 calls are skipped there: the dot test's
    // margin (1e-6 of the angle) dwarfs atan2's rounding.
    {
      const ux = ax - p.x[v]; const uy = ay - p.y[v]; const wx = bx - p.x[v]; const wy = by - p.y[v];
      const dot = ux * wx + uy * wy;
      if (dot > 0 && dot * dot > KF_COS_FAN2 * (ux * ux + uy * uy) * (wx * wx + wy * wy)) {
        if (!(out > 0 && Math.abs(PX[out - 1] - bx) + Math.abs(PY[out - 1] - by) < 1e-12)) { PX[out] = bx; PY[out] = by; PS[out] = p.s[v]; PV[out] = v; out++; }
        return false;
      }
    }
    const a0 = Math.atan2(ay - p.y[v], ax - p.x[v]);
    let da = Math.atan2(by - p.y[v], bx - p.x[v]) - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
    for (let i = 1; i < steps; i++) {
      const a = a0 + (da * i) / steps;
      const fx = p.x[v] + h * Math.cos(a); const fy = p.y[v] + h * Math.sin(a);
      if (out > 0 && Math.abs(PX[out - 1] - fx) + Math.abs(PY[out - 1] - fy) < 1e-12) continue;
      PX[out] = fx; PY[out] = fy; PS[out] = p.s[v]; PV[out] = v; out++;
    }
    if (!(out > 0 && Math.abs(PX[out - 1] - bx) + Math.abs(PY[out - 1] - by) < 1e-12)) { PX[out] = bx; PY[out] = by; PS[out] = p.s[v]; PV[out] = v; out++; }
    return false;
  };
  if (p.closed) {
    for (let k = 0; k < nseg; k++) {
      transition(k);
      const b = k + 1 === n ? 0 : k + 1;
      // A_{k+1}: offset of vertex b along segment k.
      const l = p.segLen[k] || 1;
      const axv = p.x[b] + sig * h * (-(p.y[b] - p.y[k]) / l);
      const ayv = p.y[b] + sig * h * ((p.x[b] - p.x[k]) / l);
      if (!(out > 0 && Math.abs(PX[out - 1] - axv) + Math.abs(PY[out - 1] - ayv) < 1e-12)) { PX[out] = axv; PY[out] = ayv; PS[out] = p.s[b]; PV[out] = b; out++; }
    }
    if (out > 1) {
      const fx = PX[0]; const fy = PY[0]; const fv = PV[0];
      const dx = fx - PX[out - 1]; const dy = fy - PY[out - 1];
      if (dx * dx + dy * dy > 1e-24) { PX[out] = fx; PY[out] = fy; PS[out] = p.s0 + p.len; PV[out] = fv; out++; }
      else PS[out - 1] = p.s0 + p.len;
    }
  } else {
    // B_0, then per segment: join at its start vertex (k>0), A_{k+1}.
    PX[out] = obx[0]; PY[out] = oby[0]; PS[out] = p.s[0]; PV[out] = 0; out++;
    for (let k = 0; k < nseg; k++) {
      if (k > 0) transition(k);
      const b = k + 1;
      const l = p.segLen[k] || 1;
      const axv = p.x[b] + sig * h * (-(p.y[b] - p.y[k]) / l);
      const ayv = p.y[b] + sig * h * ((p.x[b] - p.x[k]) / l);
      if (!(out > 0 && Math.abs(PX[out - 1] - axv) + Math.abs(PY[out - 1] - ayv) < 1e-12)) { PX[out] = axv; PY[out] = ayv; PS[out] = p.s[b]; PV[out] = b; out++; }
    }
  }
  B.nb = out;
  cutFoldsC(C, pi, sig, B);
  borderExcessC(p, B);
  spreadTiesC(B);
}

// K1247 s16 (K1280): bc = bs with each tie run (a convex vertex's A_v, fan
// and B_v, all at s_v) spread over [s_v - w, s_v + w] by arc length along
// the path from the incoming offset at s_v - w through the fan to the
// outgoing offset at s_v + w. w is half the s gap to each neighbour, so two
// windows never overlap. A lookup by bc slides through the fan as s crosses
// the vertex, where one by bs jumped from A_v to B_v (j47's 1.243 px on def
// at f33, a station 0.02 px of input from the vertex); it puts a point at
// most min(w, h * turn / 2) along the border from where bs put it. A run at
// either end of the border (a closed border's seam) keeps bs.
// K1283 s9: a cut fold's chevron counts as one tie run at its first leg's s
// here (its points' bs are interpolated for the paint, CF_S2_PAINT): a station
// whose s falls inside the chevron's s range is placed past it, as before
// stage 8, not mid-chevron, where the next run's strip retraced the
// chevron's return half at another s (g41_user_tw64 (3.5, 4.0), +90 seams).
// Off since fill_tri's strip foot (STRIP_FOOT) paints that strip at its foot's
// s: with the foot, off holds the seam bars (5411 over 1/255, 444 steeper than
// form B; on 5341 / 446) and keeps the census at 4400 (on: 4406, muse_hash
// x305 +3.2 and x292 +2 px of ink at their chevron tips).
const CF_TIE = false;
let stKey = new Float64Array(64);
function spreadTiesC(B: FBord): void {
  const n = B.nb; B.bc = growF(B.bc, n > 0 ? n : 1);
  const bc = B.bc; const bx = B.bx; const by = B.by;
  let bs = B.bs;
  if (CF_TIE) {
    if (stKey.length < n) stKey = new Float64Array(2 * n);
    const bcv = B.bcv;
    for (let i = 0; i < n; i++) stKey[i] = B.bs[i];
    for (let i = 0; i < n; i++) {
      if (bcv[i] !== 1) continue;
      let j = i + 1;
      while (j < n && bcv[j] === 0 && j - i <= 2 * CF_NS + 2) j++;
      if (j < n && bcv[j] === 2) { for (let k = i + 1; k <= j; k++) stKey[k] = B.bs[i]; i = j; }
    }
    bs = stKey;
  }
  for (let i = 0; i < n; i++) bc[i] = bs[i];
  let i = 1;
  while (i < n - 1) {
    if (Math.abs(bs[i + 1] - bs[i]) > 1e-12) { i++; continue; }
    const g0 = i; let g1 = i + 1;
    while (g1 + 1 < n && Math.abs(bs[g1 + 1] - bs[g0]) <= 1e-12) g1++;
    i = g1 + 1;
    if (g1 >= n - 1) break;
    const sv = bs[g0]; const gp = sv - bs[g0 - 1]; const gn = bs[g1 + 1] - sv;
    if (!(gp > 1e-12 && gn > 1e-12)) continue;
    let arc = 0;
    for (let k = g0 + 1; k <= g1; k++) arc += Math.hypot(bx[k] - bx[k - 1], by[k] - by[k - 1]);
    if (arc < 1e-12) continue;
    const w = 0.5 * Math.min(gp, gn); const L = 2 * w + arc;
    let a = 0;
    bc[g0] = sv - w + (2 * w * w) / L;
    for (let k = g0 + 1; k <= g1; k++) { a += Math.hypot(bx[k] - bx[k - 1], by[k] - by[k - 1]); bc[k] = sv - w + (2 * w * (w + a)) / L; }
  }
}

function bendsOfC(C: FCache, pi: number): Float64Array {
  // Per-frame memo (kfFrameNo stamp): bend s values + concave side packed
  // as (s, side) pairs in C.bendArr[pi].
  if (C.bendStamp[pi] === kfFrameNo) return C.bendArr[pi];
  C.bendStamp[pi] = kfFrameNo;
  const p = C.polys[pi];
  const h = C.h;
  const arr = C.bendArr[pi];
  let m = 0;
  const n = p.n;
  for (let v = 0; v < n; v++) {
    if (!p.closed && (v === 0 || v === n - 1)) continue;
    const vp = v - 1 < 0 ? n - 1 : v - 1;
    const vn = v + 1 >= n ? 0 : v + 1;
    const ax = p.x[v] - p.x[vp]; const ay = p.y[v] - p.y[vp];
    const bx = p.x[vn] - p.x[v]; const by = p.y[vn] - p.y[v];
    const cx = p.x[vn] - p.x[vp]; const cy = p.y[vn] - p.y[vp];
    const l2a = ax * ax + ay * ay; const l2b = bx * bx + by * by; const l2c = cx * cx + cy * cy;
    const area2 = Math.abs(ax * by - ay * bx);
    if (!(l2a > 0 && l2b > 0 && l2c > 0 && area2 > 1e-15)) continue;
    // radius < h  <=>  l2a*l2b*l2c < (2*h*area2)^2
    if (l2a * l2b * l2c >= 4 * h * h * area2 * area2) continue;
    const cross = ax * by - ay * bx;
    arr[2 * m] = p.s[v]; arr[2 * m + 1] = cross > 0 ? 1 : -1;
    m++;
  }
  C.bendN[pi] = m;
  return arr;
}
let kfFrameNo = 1;
// The fold search's border sequence (K1247 s3: was a number[] per border
// with bends, edited by splice; a splice here never lengthens it).
let cfSeq = new Int32Array(1024);
// K1283 s5: each cut point's legs' inward normals (n1x, n1y, n2x, n2y per pool point past nb),
// and foldChevron's output (x, y, foot x, foot y per point).
const CF_NS = 4; // side samples per half chevron: 2 CF_NS + 1 points per cut fold
/** K1314 s9 (perf): the frame reports its first CF_DIAG_N fold notes; cutFoldsC builds no more. */
const CF_DIAG_N = 20;
let cfCut = new Float64Array(64); const cfChev = new Float64Array(4 * (2 * CF_NS + 1)); const cfSegs: number[] = []; const cfU = new Float64Array(2);
// K1283 s8: each cut point's s on its second leg (the cut point's own s is the first leg's).
let cfS2 = new Float64Array(16);
const CF_S2 = true;
// K1283 s8: bsm is the meet's s (borderMeetC, cutMirrorS, meetSegsOf, the station insert); bs is
// everything else's (the paint's piece walk via bc/sc, the tie spread, the gap searches). On, the
// chevron's bs is interpolated too (bs = bsm, de5fe023's outputs; kept). Off (7d0ae1a0), bs keeps
// the flat s1 of before s8: seam 5773 -> 5675 over 1/255 (g41_user_tw64 532 -> 445, strip|strip
// 112 -> 27, master's) and j59 kept (sweep 834), but colour ROUND ENDS 31789 -> 31926 (bar
// 31891), g41_user_tw64's j8/j9 sweep strays come back, and muse_hash gains a junc|strip cluster
// at (22.5, 34.0) (+29: piece 1027, chain 75, starts at its station's flat s 16.380 where the
// mouth reads 16.594). K1283_s8.md's handoff has the rest.
const CF_S2_PAINT = true;
/** The inward unit normal of a border leg along (dx, dy): sig (ty, -tx). */
function foldNormal(dx: number, dy: number, sig: number, out: Float64Array, o: number): void {
  const l = Math.sqrt(dx * dx + dy * dy) || 1;
  out[o] = (sig * dy) / l; out[o + 1] = (-sig * dx) / l;
}
/**
 * K1283 s5: a cut fold's chevron. Form B's band at a cut fold is {h - W <= d <= h}: a chevron
 * whose inner corner Xin lies on e = unit(n1 + n2), deeper than W (the legs' inner lines meet
 * W sqrt(2 / (1 + n1.n2)) from X; the inner level set's arc is nearer when the bend's radius
 * exceeds h - W). A border point's inner edge lies W along its foot, so one cut point left the
 * kite X, X + W n1, Xin, X + W n2 bare (stage 4: cutting the folds lost 2265 px of census ink),
 * while the uncut swallowtail drew it and a spur past it. The cut point becomes X with its foot
 * along n1, Y = Xin - W e with its foot along e, and X with its foot along n2: the band's quads
 * then cover the kite and nothing past Xin. Returns the point count written to out (x, y, foot
 * x, foot y each), or 0 (antiparallel legs: the cut point alone).
 */
function foldChevron(p: Poly, h: number, W: number, x: number, y: number, s: number, nrm: Float64Array, q: number, out: Float64Array): number {
  const n1x = nrm[q]; const n1y = nrm[q + 1]; const n2x = nrm[q + 2]; const n2y = nrm[q + 3];
  const c = n1x * n2x + n1y * n2y;
  let ex = n1x + n2x; let ey = n1y + n2y; const el = Math.sqrt(ex * ex + ey * ey);
  if (!(c > -0.95) || el < 1e-9) return 0;
  ex /= el; ey /= el;
  const tMax = Math.min(4 * h, W * Math.sqrt(2 / (1 + c)));
  cfSegs.length = 0;
  for (let k = 0; k < p.nseg; k++) {
    const b = k + 1 === p.n ? 0 : k + 1;
    if (Math.abs(dS(p, s, p.s[k])) <= 3 * h || Math.abs(dS(p, s, p.s[b])) <= 3 * h) cfSegs.push(k);
  }
  const dist = (t: number): number => distAt(x + ex * t, y + ey * t);
  const distAt = (qx: number, qy: number): number => {
    let best = Infinity;
    for (let m = 0; m < cfSegs.length; m++) {
      const k = cfSegs[m]; const b = k + 1 === p.n ? 0 : k + 1;
      const ax = p.x[k]; const ay = p.y[k]; const vx = p.x[b] - ax; const vy = p.y[b] - ay;
      const l2 = vx * vx + vy * vy; let u = l2 > 0 ? ((qx - ax) * vx + (qy - ay) * vy) / l2 : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const dx = ax + vx * u - qx; const dy = ay + vy * u - qy; const d = dx * dx + dy * dy; if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  const target = h - W;
  let t = tMax;
  if (dist(tMax) < target) {
    let lo = W; let hi = tMax;
    if (dist(lo) <= target) t = W;
    else { for (let it = 0; it < 24; it++) { const mid = 0.5 * (lo + hi); if (dist(mid) > target) lo = mid; else hi = mid; } t = 0.5 * (lo + hi); }
  }
  let k = 0;
  const put = (px: number, py: number, ux: number, uy: number): void => { out[4 * k] = px; out[4 * k + 1] = py; out[4 * k + 2] = px + h * ux; out[4 * k + 3] = py + h * uy; k++; };
  put(x, y, n1x, n1y);
  if (t - W > 1e-9) {
    // The chevron's sides are the legs' inner level sets d = h - W, which bow towards e where the
    // legs bend (x292: a straight X + W n1 -> Xin side inked 160 px past form B's). Each side point
    // P on X..Y gets the foot direction u, between its leg's normal and e, that puts P + W u on it.
    const side = (ax: number, ay: number, rev: boolean): void => {
      for (let jj = 1; jj < CF_NS; jj++) {
        const j = rev ? CF_NS - jj : jj; const tau = ((t - W) * j) / CF_NS;
        const px = x + ex * tau; const py = y + ey * tau;
        const uAt = (th: number): number => { const ux = (1 - th) * ax + th * ex; const uy = (1 - th) * ay + th * ey; const l = Math.sqrt(ux * ux + uy * uy) || 1; cfU[0] = ux / l; cfU[1] = uy / l; return distAt(px + W * cfU[0], py + W * cfU[1]) - target; };
        let th = 1;
        if (uAt(0) >= 0) th = 0;
        else if (uAt(1) > 0) { let lo = 0; let hi = 1; for (let it = 0; it < 24; it++) { const mid = 0.5 * (lo + hi); if (uAt(mid) < 0) lo = mid; else hi = mid; } th = 0.5 * (lo + hi); }
        uAt(th); put(px, py, cfU[0], cfU[1]);
      }
    };
    side(n1x, n1y, false);
    put(x + ex * (t - W), y + ey * (t - W), ex, ey);
    side(n2x, n2y, true);
  }
  put(x, y, n2x, n2y);
  return k;
}
function cutFoldsC(C: FCache, pi: number, sig: number, B: FBord): void {
  const p = C.polys[pi];
  const h = C.h;
  const bendAll = bendsOfC(C, pi);
  const bends: number[] = [];
  for (let i = 0; i < C.bendN[pi]; i++) if (bendAll[2 * i + 1] === sig) bends.push(bendAll[2 * i]);
  let nb = B.nb;
  if (bends.length) {
    const bendClusters: number[] = [];
    for (const sb of bends) { let near = false; for (let c = 0; c < bendClusters.length && !near; c++) near = Math.abs(dS(p, bendClusters[c], sb)) < h; if (!near) bendClusters.push(sb); }
    if (cfSeq.length < nb) cfSeq = new Int32Array(nb * 2);
    const seq = cfSeq;
    let m = nb;
    for (let i = 0; i < nb; i++) seq[i] = i;
    let poolN = nb;
    const poolPush = (x: number, y: number, s: number): number => {
      B.px = growF(B.px, poolN + 1); B.py = growF(B.py, poolN + 1); B.ps = growF(B.ps, poolN + 1); B.pv = growI(B.pv, poolN + 1);
      B.px[poolN] = x; B.py[poolN] = y; B.ps[poolN] = s; B.pv[poolN] = -1;
      return poolN++;
    };
    const diag = (C as unknown as { __foldDiag: string[] }).__foldDiag;
    const atEnd = (s: number): boolean => !p.closed && (Math.abs(s - p.s[0]) < h || Math.abs(s - p.s[p.n - 1]) < h);
    // K1283 s5 kept a bend within h of an arm's root uncut (x300's blot). K1314 s8: it is cut
    // like any other (uncut, it inked muse_hash j55's notch and j58b's needle; cut, x300 stays clear), except
    // where it also lies within h of an open end: there the end and its junction draw the corner,
    // and a chevron inks a dark quad over c8's end (muse_hash c8 / x300's old blot).
    const roots = C.chainRoots[pi];
    for (const sb of bendClusters) {
      if (atEnd(sb)) { let nearRoot = false; for (let r = 0; r < roots.length && !nearRoot; r++) nearRoot = Math.abs(dS(p, roots[r], sb)) < h; if (nearRoot) continue; }
      // A bend within h of a kink's station (a self-crossing of this chain): its border
      // crosses itself there because the thread does, and the crossing's gap draws it (muse_hash
      // x58 70.4 -> 18.6 px, x22 68.2 -> 43.3; cut, they were 43 and 21 px worse than master).
      // K1314 s7: not a kink where the chain ENDS on its own body (one pass at an open end):
      // no thread crosses there, so no gap draws the fold, and uncut it inks a square block
      // (muse_hash x15).
      let nearKink = false;
      for (let e = 0; e < C.passN[pi]; e++) {
        const xi = C.passXi[pi][e];
        if (C.crossAPi[xi] === C.crossBPi[xi] && Math.abs(dS(p, C.passS[pi][e], sb)) < h &&
          !atEnd(C.passS[pi][e]) && !atEnd(C.passSq[pi][e])) nearKink = true;
      }
      if (nearKink) continue;
      let i0 = -1; let i1 = -1; let nIdx = 0;
      for (let i = 0; i < m; i++) if (Math.abs(dS(p, sb, B.ps[seq[i]])) <= 2.5 * h) { if (i0 < 0) i0 = i; i1 = i; nIdx++; }
      if (nIdx < 3) continue;
      let guard = 0;
      let changed = true;
      while (changed && guard++ < 8) {
        changed = false;
        outer: for (let i = i0; i <= Math.min(i1, m - 2); i++) {
          // K1283 s5: from i + 3. Segment i + 1 (j = i + 2) shares seq[i + 1] with segment i, so
          // segInt always "hit" there: the splice was a no-op and no fold was ever cut.
          for (let j = i + 3; j <= Math.min(i1, m - 1); j++) {
            if (i === 0 && j === m - 1) continue;
            const ia = seq[i]; const ib = seq[i + 1]; const ic = seq[j - 1]; const id = seq[j];
            const hit = segInt(B.px[ia], B.py[ia], B.px[ib], B.py[ib], B.px[ic], B.py[ic], B.px[id], B.py[id]);
            if (!hit) continue;
            const x = B.px[ia] + (B.px[ib] - B.px[ia]) * hit.t;
            const y = B.py[ia] + (B.py[ib] - B.py[ia]) * hit.t;
            const s = B.ps[ia] + dS(p, B.ps[ia], B.ps[ib]) * hit.t;
            const nid = poolPush(x, y, s);
            // The legs' inward normals (the border is the centreline + sig h (-ty, tx)).
            const q = 4 * (nid - nb); if (cfCut.length < q + 4) { const g = new Float64Array(2 * (q + 4)); g.set(cfCut); cfCut = g; }
            foldNormal(B.px[ib] - B.px[ia], B.py[ib] - B.py[ia], sig, cfCut, q);
            foldNormal(B.px[id] - B.px[ic], B.py[id] - B.py[ic], sig, cfCut, q + 2);
            if (cfS2.length <= nid - nb) { const g = new Float64Array(2 * (nid - nb + 1)); g.set(cfS2); cfS2 = g; }
            cfS2[nid - nb] = B.ps[ic] + dS(p, B.ps[ic], B.ps[id]) * hit.u;
            // seq.splice(i + 1, j - i - 1, nid)
            seq[i + 1] = nid; seq.copyWithin(i + 2, j, m); m -= j - i - 2;
            if (diag.length < CF_DIAG_N) diag.push(`fold ch${pi} side${sig} at s=${sb.toFixed(2)}`);
            changed = true;
            break outer;
          }
        }
      }
    }
    // K1314 s7: a fold the chain's open end cuts short (muse_hash x15: a curl's inner border that
    // ends within h of its turn never crosses itself, so the loop above finds nothing and the
    // hairpin inks a block). Form B's border there is the end cap's circle (radius h about the
    // end): the border is cut where it enters that disc and runs straight to its end point, where
    // the cap's arc takes over. Only a border that dips inside the disc by W / 4 or more: a plain
    // or gently curving end stays at h or beyond.
    if (!p.closed) for (let e2 = 0; e2 < 2; e2++) {
      const atS = e2 === 0; const k0 = atS ? 0 : p.n - 1; const sE = p.s[k0];
      if (!bendClusters.some((c) => Math.abs(dS(p, c, sE)) < 2.5 * h)) continue;
      const iE = atS ? 0 : m - 1; const dir = atS ? -1 : 1; // dir: towards the end
      if (seq[iE] >= nb || Math.abs(B.ps[seq[iE]] - sE) > 1e-6) continue;
      const cx = p.x[k0]; const cy = p.y[k0];
      const dE = (id: number): number => Math.sqrt((B.px[id] - cx) ** 2 + (B.py[id] - cy) ** 2);
      // The window's far point, then the first border point (towards the end) inside the disc.
      let iF = iE; while (iF - dir >= 0 && iF - dir < m && Math.abs(B.ps[seq[iF - dir]] - sE) <= 2.5 * h) iF -= dir;
      let iIn = -1; let deep = false;
      for (let i = iF; i !== iE; i += dir) {
        const dd = dE(seq[i]);
        if (iIn < 0 && dd < h && i !== iF) iIn = i;
        if (iIn >= 0 && dd < h - 0.25 * C.W) { deep = true; break; }
      }
      if (iIn < 0 || !deep || seq[iIn - dir] >= nb || seq[iIn] >= nb) continue;
      // Segment a -> b (a outside, b inside) meets the circle at t.
      const a = seq[iIn - dir]; const b = seq[iIn];
      const dx = B.px[b] - B.px[a]; const dy = B.py[b] - B.py[a]; const fx = B.px[a] - cx; const fy = B.py[a] - cy;
      const qa = dx * dx + dy * dy; const qb = 2 * (fx * dx + fy * dy); const qc = fx * fx + fy * fy - h * h;
      const disc = qb * qb - 4 * qa * qc; if (!(qa > 1e-18) || disc < 0) continue;
      const t = Math.min(1, Math.max(0, (-qb - Math.sqrt(disc)) / (2 * qa)));
      const hx = B.px[a] + dx * t; const hy = B.py[a] + dy * t; const hs = B.ps[a] + (B.ps[b] - B.ps[a]) * t;
      const nid = poolPush(hx, hy, hs);
      const q = 4 * (nid - nb); if (cfCut.length < q + 4) { const g = new Float64Array(2 * (q + 4)); g.set(cfCut); cfCut = g; }
      // The legs in border order: the entering segment and the chord to the end point.
      const ex = B.px[seq[iE]]; const ey = B.py[seq[iE]];
      if (atS) { foldNormal(hx - ex, hy - ey, sig, cfCut, q); foldNormal(-dx, -dy, sig, cfCut, q + 2); }
      else { foldNormal(dx, dy, sig, cfCut, q); foldNormal(ex - hx, ey - hy, sig, cfCut, q + 2); }
      // K1314 s8: the chord's normal faces the end's centre. foldNormal's side sign can turn it
      // outward, which pulls the chord's band out of the cap and leaves a step between the
      // thread's band and the cap (muse_hash x15).
      { const qc = atS ? q : q + 2; if (cfCut[qc] * (cx - 0.5 * (hx + ex)) + cfCut[qc + 1] * (cy - 0.5 * (hy + ey)) < 0) { cfCut[qc] = -cfCut[qc]; cfCut[qc + 1] = -cfCut[qc + 1]; } }
      if (cfS2.length <= nid - nb) { const g = new Float64Array(2 * (nid - nb + 1)); g.set(cfS2); cfS2 = g; }
      cfS2[nid - nb] = hs;
      if (atS) { seq[1] = nid; seq.copyWithin(2, iIn + 1, m); m -= iIn - 1; }
      else { seq[iIn] = nid; seq[iIn + 1] = seq[iE]; m = iIn + 2; }
      if (diag.length < CF_DIAG_N) diag.push(`end fold ch${pi} side${sig} at s=${hs.toFixed(2)} (${hx.toFixed(2)}, ${hy.toFixed(2)})`);
    }
    // Compact the sequence into the base arrays; each cut fold becomes its chevron (foldChevron).
    let cuts = 0; for (let i = 0; i < m; i++) if (seq[i] >= nb) cuts++;
    const cap = m + 2 * CF_NS * cuts;
    B.bx = growF(B.bx, cap); B.by = growF(B.by, cap); B.bs = growF(B.bs, cap); B.bsm = growF(B.bsm, cap); B.bfx = growF(B.bfx, cap); B.bfy = growF(B.bfy, cap);
    if (B.bcv.length < cap) { B.bcv = new Int8Array(2 * cap); B.bs2 = new Float64Array(2 * cap); }
    let o = 0;
    for (let i = 0; i < m; i++) {
      const id = seq[i];
      if (id >= nb) {
        const k = foldChevron(p, h, C.W, B.px[id], B.py[id], B.ps[id], cfCut, 4 * (id - nb), cfChev);
        if (k > 0) {
          // K1283 s8: the chevron's s runs from the cut's s on the fold's first leg to its s on the
          // second (was the first leg's s throughout), and its ends know each other's (borderMeetC).
          const s1 = B.ps[id]; const ds = CF_S2 ? dS(p, s1, cfS2[id - nb]) : 0;
          for (let r = 0; r < k; r++) {
            B.bx[o] = cfChev[4 * r]; B.by[o] = cfChev[4 * r + 1]; B.bsm[o] = s1 + (k > 1 ? (ds * r) / (k - 1) : 0); B.bs[o] = CF_S2_PAINT ? B.bsm[o] : s1; B.bfx[o] = cfChev[4 * r + 2]; B.bfy[o] = cfChev[4 * r + 3];
            B.bcv[o] = r === 0 ? 1 : r === k - 1 ? 2 : 0; B.bs2[o] = r === 0 ? s1 + ds : s1;
            o++;
          }
          continue;
        }
      }
      B.bcv[o] = 0;
      B.bx[o] = B.px[id]; B.by[o] = B.py[id]; B.bs[o] = B.ps[id]; B.bsm[o] = B.ps[id];
      const v = B.pv[id];
      if (v >= 0) { B.bfx[o] = p.x[v]; B.bfy[o] = p.y[v]; }
      else { pointAtInto(p, B.ps[id], ptScratch); B.bfx[o] = ptScratch[0]; B.bfy[o] = ptScratch[1]; }
      o++;
    }
    B.nb = o;
    return;
  }
  B.bx = growF(B.bx, nb); B.by = growF(B.by, nb); B.bs = growF(B.bs, nb); B.bsm = growF(B.bsm, nb); B.bfx = growF(B.bfx, nb); B.bfy = growF(B.bfy, nb);
  if (B.bcv.length < nb) { B.bcv = new Int8Array(2 * nb); B.bs2 = new Float64Array(2 * nb); } else B.bcv.fill(0, 0, nb);
  for (let i = 0; i < nb; i++) {
    B.bx[i] = B.px[i]; B.by[i] = B.py[i]; B.bs[i] = B.ps[i]; B.bsm[i] = B.ps[i];
    const v = B.pv[i];
    if (v >= 0) { B.bfx[i] = p.x[v]; B.bfy[i] = p.y[v]; }
    else { pointAtInto(p, B.ps[i], ptScratch); B.bfx[i] = ptScratch[0]; B.bfy[i] = ptScratch[1]; }
  }
  B.nb = nb;
}

// --- inserts / refs ----------------------------------------------------------
function newRef(C: FCache, b: number): number {
  if (C.nRef >= C.refB.length) {
    C.refB = growI(C.refB, C.nRef + 1); C.refFinal = growI(C.refFinal, C.nRef + 1); C.refS = growF(C.refS, C.nRef + 1); C.refS0 = growF(C.refS0, C.nRef + 1);
  }
  const id = C.nRef++;
  C.refB[id] = b; C.refFinal[id] = -1; C.refS[id] = 0; C.refS0[id] = 0;
  return id;
}
function addInsert(C: FCache, b: number, seg: number, t: number, x: number, y: number, refId: number): void {
  // K1247 s3: typed arrays with counts (number[] pushes regrew from empty
  // every frame, after the length = 0 reset dropped the backing stores).
  const id = C.nIns;
  if (id >= C.insB.length) {
    const need = id + 1;
    C.insB = growI(C.insB, need); C.insSeg = growI(C.insSeg, need); C.insT = growF(C.insT, need); C.insX = growF(C.insX, need); C.insY = growF(C.insY, need); C.insRef = growI(C.insRef, need);
  }
  C.insB[id] = b; C.insSeg[id] = seg; C.insT[id] = Math.min(1, Math.max(0, t)); C.insX[id] = x; C.insY[id] = y; C.insRef[id] = refId;
  C.nIns = id + 1;
  const B = C.bords[b];
  if (B.nIns >= B.ins.length) B.ins = growI(B.ins, B.nIns + 1);
  B.ins[B.nIns++] = id;
}
/** The builder's addPointAt: locate (x, y) on the base border near s. */
function addPointAtC(C: FCache, pi: number, side: number, x: number, y: number, sFoot: number): number {
  const b = pi * 2 + (side === 1 ? 0 : 1);
  const B = C.bords[b];
  const p = C.polys[pi];
  const refId = newRef(C, b);
  C.refS0[refId] = sFoot;
  const n = B.nb;
  if (n < 2) { addInsert(C, b, 0, 0, x, y, refId); return refId; }
  const target = p.closed ? normS(p, sFoot) : sFoot;
  let lo = 0; let hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (B.bsm[mid] <= target) lo = mid; else hi = mid; }
  let bestSeg = Math.max(0, lo - 1); let bestT = 0; let bestD = Infinity;
  for (let i = Math.max(0, lo - 3); i < Math.min(n - 1, lo + 4); i++) {
    const ax = B.bx[i]; const ay = B.by[i];
    const ex = B.bx[i + 1] - ax; const ey = B.by[i + 1] - ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
    t = Math.min(1, Math.max(0, t));
    const dx = ax + ex * t - x; const dy = ay + ey * t - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestD) { bestD = d; bestSeg = i; bestT = t; }
  }
  addInsert(C, b, bestSeg, bestT, x, y, refId);
  return refId;
}
function borderPointAtBase(C: FCache, pi: number, side: number, s: number, out: Float64Array): void {
  const B = C.bords[pi * 2 + (side === 1 ? 0 : 1)];
  const p = C.polys[pi];
  const n = B.nb;
  if (n === 0) { out[0] = 0; out[1] = 0; return; }
  // K1247 s16: by the continuous s (bc), not bs (spreadTiesC).
  const BC = B.bc;
  let target = s;
  if (p.closed) { target = normS(p, s); if (target < BC[0] - 1e-9) target += p.len; }
  let lo = 0; let hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (BC[mid] <= target) lo = mid; else hi = mid; }
  const a = lo; const bb = Math.min(n - 1, lo + 1);
  const ds = BC[bb] - BC[a];
  const t = ds > 1e-12 ? Math.min(1, Math.max(0, (target - BC[a]) / ds)) : 0;
  out[0] = B.bx[a] + (B.bx[bb] - B.bx[a]) * t;
  out[1] = B.by[a] + (B.by[bb] - B.by[a]) * t;
}
function borderPointAtFinal(C: FCache, pi: number, side: number, s: number, out: Float64Array): void {
  const B = C.bords[pi * 2 + (side === 1 ? 0 : 1)];
  const p = C.polys[pi];
  const n = B.nf;
  if (n === 0) { out[0] = 0; out[1] = 0; return; }
  // K1247 s16: by the continuous s (sc), not s (spreadTiesC).
  const SC = B.sc;
  let target = s;
  if (p.closed) { target = normS(p, s); if (target < SC[0] - 1e-9) target += p.len; }
  let lo = 0; let hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (SC[mid] <= target) lo = mid; else hi = mid; }
  const a = lo; const bb = Math.min(n - 1, lo + 1);
  const ds = SC[bb] - SC[a];
  const t = ds > 1e-12 ? Math.min(1, Math.max(0, (target - SC[a]) / ds)) : 0;
  out[0] = B.xy[2 * a] + (B.xy[2 * bb] - B.xy[2 * a]) * t;
  out[1] = B.xy[2 * a + 1] + (B.xy[2 * bb + 1] - B.xy[2 * a + 1]) * t;
}
/** Merge every border's inserts into its final arrays (builder rebuild). */
const kfPend = new Int32Array(256);
function mergeBorders(C: FCache): void {
  const insSeg = C.insSeg; const insT = C.insT; const insX = C.insX; const insY = C.insY; const insRef = C.insRef;
  for (let b = 0; b < C.bords.length; b++) {
    const B = C.bords[b];
    const pi = b >> 1;
    const p = C.polys[pi];
    const n = B.nb;
    const ins = B.ins;
    const m = B.nIns;
    if (n === 0) { B.nf = 0; continue; }
    // Counting sort of insert ids by segment (stable), then t order
    // inside each segment (groups are tiny).
    if (B.sorted.length < m) { B.sorted = new Int32Array(Math.max(m, 16)); B.segCnt = new Int32Array(1024); }
    if (B.segCnt.length < n) B.segCnt = new Int32Array(n * 2);
    const cnt = B.segCnt;
    cnt.fill(0, 0, n);
    for (let q = 0; q < m; q++) { const sg = insSeg[ins[q]]; cnt[sg < n ? sg : n - 1]++; }
    let sum = 0;
    for (let i = 0; i < n; i++) { const c0 = cnt[i]; cnt[i] = sum; sum += c0; }
    const sorted = B.sorted;
    for (let q = 0; q < m; q++) { const id = ins[q]; const sg = insSeg[id]; sorted[cnt[sg < n ? sg : n - 1]++] = id; }
    // cnt[i] now holds group ends; insertion-sort each group by t.
    let gStart = 0;
    for (let i = 0; i < n; i++) {
      const gEnd = cnt[i];
      for (let a = gStart + 1; a < gEnd; a++) {
        const v = sorted[a]; const tv = insT[v];
        let bb = a - 1;
        while (bb >= gStart && insT[sorted[bb]] > tv) { sorted[bb + 1] = sorted[bb]; bb--; }
        sorted[bb + 1] = v;
      }
      gStart = gEnd;
    }
    const need = n + m + 1;
    B.xy = growF(B.xy, 2 * need); B.s = growF(B.s, need); B.cxy = growF(B.cxy, 2 * need); B.sc = growF(B.sc, need);
    const XY = B.xy; const SS = B.s; const CXY = B.cxy; const SC = B.sc; const BC = B.bc;
    const BX = B.bx; const BY = B.by; const BS = B.bs; const BFX = B.bfx; const BFY = B.bfy;
    let out = 0;
    XY[0] = BX[0]; XY[1] = BY[0]; SS[0] = BS[0]; CXY[0] = BFX[0]; CXY[1] = BFY[0]; SC[0] = BC[0];
    out = 1;
    let ii = 0;
    const pend = kfPend; let pendN = 0;
    // Group boundaries from cnt (ends): group of segment i is
    // [groupStart(i), cnt[i]) with groupStart(0)=0, groupStart(i)=cnt[i-1].
    let groupStart = 0;
    for (let i = 0; i + 1 < n; i++) {
      const gEnd = cnt[i];
      pendN = 0;
      for (let jj = ii; jj < gEnd; jj++) {
        const id = sorted[jj];
        const tt = insT[id];
        const refId = insRef[id];
        if (tt >= 1 - 1e-9) { pend[pendN++] = id; continue; }
        const lx = XY[2 * (out - 1)]; const ly = XY[2 * (out - 1) + 1];
        const dx = insX[id] - lx; const dy = insY[id] - ly;
        if (tt <= 1e-9 || dx * dx + dy * dy < 1e-24) {
          if (refId >= 0) { C.refFinal[refId] = out - 1; C.refS[refId] = SC[out - 1]; }
          continue;
        }
        const s = lerpS(p, BS[i], BS[i + 1], tt);
        XY[2 * out] = insX[id]; XY[2 * out + 1] = insY[id]; SS[out] = s;
        SC[out] = s + (BC[i] - BS[i]) + (BC[i + 1] - BS[i + 1] - (BC[i] - BS[i])) * tt;
        CXY[2 * out] = BFX[i] + (BFX[i + 1] - BFX[i]) * tt;
        CXY[2 * out + 1] = BFY[i] + (BFY[i + 1] - BFY[i]) * tt;
        // K1247 s16: a ref's s is its continuous s (sc), the domain the end
        // lookup searched (inside a K1280 tie run the BS lerp is the run's
        // one s_v, not where the ref sits along it). Neutral on every bar;
        // muse_hash cyc10 #200 is a different cause, addPointAtC's
        // nearest-segment pick flipping across a fold (K16_PS).
        if (refId >= 0) { C.refFinal[refId] = out; C.refS[refId] = SC[out]; }
        out++;
      }
      ii = gEnd;
      groupStart = gEnd;
      void groupStart;
      XY[2 * out] = BX[i + 1]; XY[2 * out + 1] = BY[i + 1]; SS[out] = BS[i + 1]; CXY[2 * out] = BFX[i + 1]; CXY[2 * out + 1] = BFY[i + 1]; SC[out] = BC[i + 1];
      out++;
      for (let q = 0; q < pendN; q++) {
        const refId = insRef[pend[q]];
        if (refId >= 0) { C.refFinal[refId] = out - 1; C.refS[refId] = SC[out - 1]; }
      }
    }
    // Inserts on the last segment group (never visited) attach to the
    // last point, as in the builder's unresolved-ref fallback.
    for (let jj = ii; jj < m; jj++) {
      const refId = insRef[sorted[jj]];
      if (refId >= 0) { C.refFinal[refId] = out - 1; C.refS[refId] = SC[out - 1]; }
    }
    B.nf = out;
    B.segReg = growI(B.segReg, Math.max(1, out));
    B.segReg.fill(-1);
  }
}

// --- corners -----------------------------------------------------------------
const kfFa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfFb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfQa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfQb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfTa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfTb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfMFoot: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfNodeCap = 513;
const nodeScratch = new Float64Array(kfNodeCap * 12);
const nodeScratchK = new Int32Array(kfNodeCap * 2);
const nodeRho = new Float64Array(kfNodeCap);
interface KfCst {
  A: FArm; B: FArm; aiA: number; aiB: number;
  qx: number; qy: number; rhoCur: number; Vx: number; Vy: number; denV: number; rbEff: number; r0: number;
  wCacheA: WalkCache; wCacheB: WalkCache;
}
const kfCst: KfCst = {
  A: null as unknown as FArm, B: null as unknown as FArm, aiA: -1, aiB: -1,
  qx: 0, qy: 0, rhoCur: 0, Vx: 0, Vy: 0, denV: 0, rbEff: 1, r0: 0,
  wCacheA: mkWalkCache(), wCacheB: mkWalkCache(),
};
const kfSv = { x: 0, y: 0 };
// K1314 s4: the far root's feet, kept while cornersPhaseC tries the first meet.
const nmFa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const nmFb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };

function footArmGlobal(C: FCache, ai: number, x: number, y: number, estD: number, out: FFoot, prune = Infinity): void {
  const a = C.armObj[ai];
  let d0 = Math.max(0, estD - 4 * C.h); let d1 = Math.min(C.armL[ai], estD + 4 * C.h);
  if (d1 - d0 < 1e-9) { d0 = 0; d1 = C.armL[ai]; }
  const lo = C.armDir[ai] > 0 ? C.armSR[ai] + d0 : C.armSR[ai] - d1;
  const hi = C.armDir[ai] > 0 ? C.armSR[ai] + d1 : C.armSR[ai] - d0;
  const A = fwA; A[0] = x; A[1] = y; A[2] = lo; A[3] = hi; A[4] = -1; A[5] = Infinity; A[6] = NaN; A[7] = NaN; A[8] = prune;
  footWinFast(C.polys[a.pi], out);
  out.u = C.armSR[ai] + C.armDir[ai] * armDistC(C, ai, out.s);
}
function solveVC(C: FCache, _ci: number, aiA: number, aiB: number, rho: number, x0: number, y0: number, estD: number, fa: FFoot, fb: FFoot, cx: number, cy: number): boolean {
  const h = C.h;
  // The builder's solveEq: global feet, Newton from the given guess.
  let x = x0; let y = y0;
  footArmGlobal(C, aiA, x, y, estD, fa); footArmGlobal(C, aiB, x, y, estD, fb);
  for (let it = 0; it < 40; it++) {
    const Fa = fa.d - rho; const Fb = fb.d - rho;
    if (Math.abs(Fa) < 1e-12 * Math.max(1, rho) && Math.abs(Fb) < 1e-12 * Math.max(1, rho)) break;
    if (!(fa.d > 1e-12 && fb.d > 1e-12)) break;
    const gax = (x - fa.x) / fa.d; const gay = (y - fa.y) / fa.d;
    const gbx = (x - fb.x) / fb.d; const gby = (y - fb.y) / fb.d;
    const det = gax * gby - gay * gbx;
    if (Math.abs(det) < 1e-12) break;
    let dx = (-Fa * gby + Fb * gay) / det;
    let dy = (-Fb * gax + Fa * gbx) / det;
    const dl = Math.hypot(dx, dy);
    if (dl > h) { dx *= h / dl; dy *= h / dl; }
    x += dx; y += dy;
    // The window is the same every iteration, so the last foot is a point
    // of it: its distance bounds the new minimum (prune only, exact).
    const pa = Number.isFinite(fa.d) ? Math.sqrt((x - fa.x) * (x - fa.x) + (y - fa.y) * (y - fa.y)) : Infinity;
    const pb = Number.isFinite(fb.d) ? Math.sqrt((x - fb.x) * (x - fb.x) + (y - fb.y) * (y - fb.y)) : Infinity;
    footArmGlobal(C, aiA, x, y, estD, fa, pa); footArmGlobal(C, aiB, x, y, estD, fb, pb);
  }
  kfSv.x = x; kfSv.y = y;
  if (Math.abs(fa.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(fb.d - rho) < 1e-9 * Math.max(h, rho)) return true;
  // K1247 s9: the builder's restarts (solveEq), step for step.
  for (let m = 1; m <= 8; m++) {
    if (m === 4) continue;
    x = cx + ((x0 - cx) * m) / 4; y = cy + ((y0 - cy) * m) / 4;
    footArmGlobal(C, aiA, x, y, estD, fa); footArmGlobal(C, aiB, x, y, estD, fb);
    for (let it = 0; it < 40; it++) {
      const Fa = fa.d - rho; const Fb = fb.d - rho;
      if (Math.abs(Fa) < 1e-12 * Math.max(1, rho) && Math.abs(Fb) < 1e-12 * Math.max(1, rho)) break;
      if (!(fa.d > 1e-12 && fb.d > 1e-12)) break;
      const gax = (x - fa.x) / fa.d; const gay = (y - fa.y) / fa.d;
      const gbx = (x - fb.x) / fb.d; const gby = (y - fb.y) / fb.d;
      const det = gax * gby - gay * gbx;
      if (Math.abs(det) < 1e-12) break;
      let dx = (-Fa * gby + Fb * gay) / det;
      let dy = (-Fb * gax + Fa * gbx) / det;
      const dl = Math.hypot(dx, dy);
      if (dl > h) { dx *= h / dl; dy *= h / dl; }
      x += dx; y += dy;
      footArmGlobal(C, aiA, x, y, estD, fa); footArmGlobal(C, aiB, x, y, estD, fb);
    }
    if (Math.abs(fa.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(fb.d - rho) < 1e-9 * Math.max(h, rho)) { kfSv.x = x; kfSv.y = y; return true; }
  }
  kfSv.x = x; kfSv.y = y;
  return false;
}

const ss01 = (x: number): number => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };

// The query is kfCst's q and the foot's (u, d, k): passed as objects, so no
// double is boxed at the call.
let mwScr = new Float64Array(1024);
function marginOfC(C: FCache, ai: number, ft: FFoot, cache: WalkCache): number {
  const x = kfCst.qx; const y = kfCst.qy; const sf = ft.u; const dc = ft.d; const kFoot = ft.k;
  const arm = C.armObj[ai];
  const pl = C.polys[arm.pi];
  const h = C.h;
  const winLo = C.armDir[ai] > 0 ? C.armSR[ai] : C.armSR[ai] - C.armL[ai];
  const winHi = C.armDir[ai] > 0 ? C.armSR[ai] + C.armL[ai] : C.armSR[ai];
  const base = sf - normS(pl, sf);
  const TXm = C.tanTx[arm.pi]; const TYm = C.tanTy[arm.pi]; const GFm = C.tanGF[arm.pi]; const GBm = C.tanGB[arm.pi];
  // K1247 s4: the walks test segments one by one away from the foot until
  // one fails its half-plane test. A full walk stores its tests' values by
  // position (unwrapped segment index from its foot) with suffix extrema;
  // a later query q certifies a whole run of positions at once, since a
  // test value moves by at most |q - q_cached| (unit tangents). Positions
  // it cannot certify (near its own foot) are tested as before, so the
  // walk's stop is the full walk's, bit for bit.
  if (!cache.valid) { cache.valid = true; cache.fOk = false; cache.bOk = false; cache.mOk = false; cache.cOk = false; }
  const nseg = pl.nseg; const closed = pl.closed;
  const U = closed && pl.len > 0 ? kFoot + nseg * Math.round(base / pl.len) : kFoot;
  const eps = 1e-9 * h;
  // K1247 s7: the clear certificate. When both walks ran to the window's
  // ends (no excluded window: the margin is +Infinity), every test value
  // was at least cS. The walks from one foot (U, base) test the same
  // segments, and a test value moves by at most |q - q_c| (unit
  // tangents), so a later q from that foot within cS - eps of q_c passes
  // every test too: same walks, same answer, without walking. Exact.
  if (cache.cOk && cache.cU === U && cache.cB === base) {
    const dq = Math.sqrt((x - cache.cQx) * (x - cache.cQx) + (y - cache.cQy) * (y - cache.cQy));
    if (cache.cS - dq > eps) { return Infinity; }
  }
  let fMin = Infinity; let bMin = Infinity;
  if (mwScr.length < nseg + 2) mwScr = new Float64Array(2 * (nseg + 2));
  const scr = mwScr;
  let hi = winHi;
  {
    let k = kFoot; let bk = base;
    let p = U - cache.fU0;
    let canJump = cache.fOk && p < cache.fN;
    const delta = canJump ? Math.sqrt((x - cache.fQx) * (x - cache.fQx) + (y - cache.fQy) * (y - cache.fQy)) : Infinity;
    let full = true; let nW = 0;
    let it = 0;
    while (it <= nseg) {
      if (canJump && p >= 0 && p < cache.fN && cache.fSm[p] - delta > eps) {
        if (cache.fSm[p] - delta < fMin) fMin = cache.fSm[p] - delta;
        it += cache.fN - p; k = cache.fK; bk = cache.fBk; p = cache.fN; canJump = false; full = false;
        if (it > nseg) break;
      }
      const sv = bk + pl.s[k] + pl.segLen[k];
      if (sv >= winHi) break;
      let k2 = k + 1; let b2 = bk;
      if (k2 >= nseg) { if (!closed) break; k2 = 0; b2 = bk + pl.len; }
      const dotF = GFm[k2] - (x * TXm[k2] + y * TYm[k2]);
      if (dotF < 0) { hi = sv; break; }
      if (dotF < fMin) fMin = dotF;
      scr[nW++] = dotF;
      k = k2; bk = b2; p++; it++;
    }
    if (full) {
      if (cache.fSm.length < nW) cache.fSm = new Float64Array(2 * nW);
      const sm = cache.fSm; let m = Infinity;
      for (let i = nW - 1; i >= 0; i--) { if (scr[i] < m) m = scr[i]; sm[i] = m; }
      cache.fOk = true; cache.fQx = x; cache.fQy = y; cache.fU0 = U; cache.fN = nW; cache.fK = k; cache.fBk = bk;
    }
  }
  let lo = winLo;
  {
    let k = kFoot; let bk = base;
    let p = cache.bU0 - U;
    let canJump = cache.bOk && p < cache.bN;
    const delta = canJump ? Math.sqrt((x - cache.bQx) * (x - cache.bQx) + (y - cache.bQy) * (y - cache.bQy)) : Infinity;
    let full = true; let nW = 0;
    let it = 0;
    while (it <= nseg) {
      if (canJump && p >= 0 && p < cache.bN && cache.bSm[p] + delta < -eps) {
        if (-(cache.bSm[p] + delta) < bMin) bMin = -(cache.bSm[p] + delta);
        it += cache.bN - p; k = cache.bK; bk = cache.bBk; p = cache.bN; canJump = false; full = false;
        if (it > nseg) break;
      }
      const sv = bk + pl.s[k];
      if (sv <= winLo) break;
      let k2 = k - 1; let b2 = bk;
      if (k2 < 0) { if (!closed) break; k2 = nseg - 1; b2 = bk - pl.len; }
      const dotB = GBm[k] - (x * TXm[k2] + y * TYm[k2]);
      if (dotB > 0) { lo = sv; break; }
      if (-dotB < bMin) bMin = -dotB;
      scr[nW++] = dotB;
      k = k2; bk = b2; p++; it++;
    }
    if (full) {
      if (cache.bSm.length < nW) cache.bSm = new Float64Array(2 * nW);
      const sm = cache.bSm; let m = -Infinity;
      for (let i = nW - 1; i >= 0; i--) { if (scr[i] > m) m = scr[i]; sm[i] = m; }
      cache.bOk = true; cache.bQx = x; cache.bQy = y; cache.bU0 = U; cache.bN = nW; cache.bK = k; cache.bBk = bk;
    }
  }
  if (lo === winLo && hi === winHi) { cache.cOk = true; cache.cU = U; cache.cB = base; cache.cQx = x; cache.cQy = y; cache.cS = fMin < bMin ? fMin : bMin; }
  const stopAt = dc - 0.05 * h;
  // K1247 s5: the margin certificate. The margin is 0 exactly when no point
  // of the excluded windows ([winLo, lo] and [hi, winHi]) is closer to q
  // than dc. A search that found none also gives D0, a lower bound on the
  // excluded set's distance from its q (searched to dc + kfMR h). A later q
  // whose windows exclude no more ([winLo, lo] and [hi, winHi] inside the
  // cached ones) is at least D0 - |q - q_m| from its excluded set
  // (1-Lipschitz), so D0 - |q - q_m| >= dc + 1e-9 h proves its margin is 0
  // without a search. Exact: only a search's scan order (its hints) changes.
  const bd = dc;
  // A search to bd finds what a search to dc finds when a point is closer
  // than dc; when none is, it reports dc and the window's start, as the
  // search to dc does (so the hints, the scan windows and every value stay
  // bit for bit), and keeps its own distance for D0.
  let d2 = Infinity; let dX = Infinity;
  if (lo > winLo) { { const A = fwA; A[0] = x; A[1] = y; A[2] = winLo; A[3] = lo; A[4] = stopAt; A[5] = bd; A[6] = cache.oLo - 2 * h; A[7] = cache.oLo + 2 * h; A[8] = Infinity; } footWinFast(pl, kfMFoot); const f = kfMFoot.d; dX = f; d2 = f < dc ? f : dc; const s = f < dc ? kfMFoot.s : winLo; cache.oLo = pl.closed && pl.len > 0 ? s + Math.round(((winLo + lo) / 2 - s) / pl.len) * pl.len : s; }
  if (hi < winHi && d2 > stopAt) { { const A = fwA; A[0] = x; A[1] = y; A[2] = hi; A[3] = winHi; A[4] = stopAt; A[5] = bd; A[6] = cache.oHi - 2 * h; A[7] = cache.oHi + 2 * h; A[8] = Infinity; } footWinFast(pl, kfMFoot); const f = kfMFoot.d; if (f < dX) dX = f; const fo = f < dc ? f : dc; if (fo < d2) { d2 = fo; const s = f < dc ? kfMFoot.s : hi; cache.oHi = pl.closed && pl.len > 0 ? s + Math.round(((hi + winHi) / 2 - s) / pl.len) * pl.len : s; } }
  return d2 - dc;
}
function wOfC(C: FCache): number {
  const h = C.h; const W = C.W;
  const denQ = 1 + ((kfCst.qx - kfQa.x) * (kfCst.qx - kfQb.x) + (kfCst.qy - kfQa.y) * (kfCst.qy - kfQb.y)) / ((kfQa.d || 1) * (kfQb.d || 1));
  const slack = Math.min(C.armL[kfCst.aiA] - W - (kfQa.u - C.armSR[kfCst.aiA]) * C.armDir[kfCst.aiA], C.armL[kfCst.aiB] - W - (kfQb.u - C.armSR[kfCst.aiB]) * C.armDir[kfCst.aiB]);
  const denRatio = Math.abs(kfCst.denV) > 1e-12 ? denQ / kfCst.denV : 0;
  const fSteep = ss01((denRatio - 0.3) / 0.4);
  if (fSteep === 0) return 0;
  const fSlack = ss01(slack / (0.5 * h));
  if (fSlack === 0) return 0;
  const fRootA = ss01(((kfQa.u - C.armSR[kfCst.aiA]) * C.armDir[kfCst.aiA]) / kfCst.rbEff);
  if (fRootA === 0) return 0;
  const fRootB = ss01(((kfQb.u - C.armSR[kfCst.aiB]) * C.armDir[kfCst.aiB]) / kfCst.rbEff);
  if (fRootB === 0) return 0;
  const mA = marginOfC(C, kfCst.aiA, kfQa, kfCst.wCacheA);
  if (mA <= -0.05 * h) return 0;
  const mB = marginOfC(C, kfCst.aiB, kfQb, kfCst.wCacheB);
  if (mB <= -0.05 * h) return 0;
  return ss01(1 + Math.min(0, mA, mB) / (0.05 * h)) * fSteep * fSlack * fRootA * fRootB;
}
// K1247 s5: the growth's knobs. A landing within max(0.5 |u| dd, kfJump h)
// of the predictor is the path: a tracked foot that walks over a dent moves
// q by 1e-3 to 6e-2 h at any step size, and the converged reference
// (k1247s5_ref.ts) follows it. Today's 1e-3 h floor rejected more of those
// jumps the smaller the steps (the 128-node run's 0.69 h).
const kfJump = 0.1;
// K1247 s7: 10 nodes at E 5e-4 h in place of stage 6's 16 at 1e-3: closer
// to the reference (k1247s5_cmp 48/9/0/0 against 58/17/0/0; accuracy follows
// E more than N) and 0.10-0.11 ms faster (k1247s7_ab.ts --knob=grow, locked).
const kfGrowE = 5e-4; // the integral's error budget, in h (k1247s5 knobs)
const kfGrowH = 0.25; // the largest step, in r0
const kfGrowP = 1 / 64; // the path's largest advance, in r0
const kfGrowN = 10; // uniform growth: nodes (and path steps) over r0; 0 = the adaptive one
const kfGrowZ = 1e-3; // uniform growth: the smallest refined interval, in h
const kfGrowMid = true; // uniform growth: accept a refined interval by its midpoint test
const kfGrowS = 1; // uniform growth: path steps per node (w is evaluated at the nodes only)
// K1247 s5: the predictor's foot hint. footNearM walks from its hint in
// windows of h/32, so a long step's walk costs (foot travel) / (h/32)
// windows; moving the hint along the foot's segment by q's tangential
// motion starts the walk near the answer (a vertex foot walks back).
// K1247 s5: marginOfC's certificate (exact) and how far past dc its
// refreshing search looks, in h.
// K1247 s7: marginOfC's clear certificate (exact; K1247_CLEAR=0 turns it off).
function shiftFootC(C: FCache, arm: FArm, f: FFoot, mx: number, my: number): void {
  const p = C.polys[arm.pi]; let k = f.k;
  if (k < 0 || k >= p.nseg) return;
  const l = p.segLen[k]; if (!(l > 0)) return;
  const ds = (mx * p.dx[k] + my * p.dy[k]) / l;
  const winLoR = arm.dir > 0 ? arm.sR : arm.sR - arm.L;
  const winHiR = arm.dir > 0 ? arm.sR + arm.L : arm.sR;
  const sh = p.closed && p.len > 0 ? Math.round((f.u - (winLoR + winHiR) / 2) / p.len) * p.len : 0;
  const u = f.u + ds;
  if (!(u > winLoR + sh + C.h / 32 && u < winHiR + sh - C.h / 32)) return;
  let off = f.s - p.s[k] + ds;
  for (let it = 0; it < 64; it++) {
    if (off > p.segLen[k]) { const k2 = k + 1; if (k2 >= p.nseg) { if (!p.closed) return; off -= p.segLen[k]; k = 0; } else { off -= p.segLen[k]; k = k2; } }
    else if (off < 0) { const k2 = k - 1; if (k2 < 0) { if (!p.closed) return; k = p.nseg - 1; off += p.segLen[k]; } else { k = k2; off += p.segLen[k]; } }
    else { f.u = u; f.k = k; f.s = p.s[k] + off; return; }
  }
}
function advanceToC(C: FCache, rhoT: number, dMax: number): void {
  const h = C.h;
  const dN = Math.max(dMax, 1e-12);
  let step = dN;
  let guard = 0; const gMax = 128 + 4 * Math.ceil((rhoT - kfCst.rhoCur) / dN);
  while (kfCst.rhoCur < rhoT - 1e-12 * rhoT && guard++ < gMax) {
    const rn = Math.min(rhoT, kfCst.rhoCur + step);
    const dd = rn - kfCst.rhoCur;
    let advanced = false;
    if (kfQa.d > 1e-12 && kfQb.d > 1e-12) {
      const nax = (kfCst.qx - kfQa.x) / kfQa.d; const nay = (kfCst.qy - kfQa.y) / kfQa.d;
      const nbx = (kfCst.qx - kfQb.x) / kfQb.d; const nby = (kfCst.qy - kfQb.y) / kfQb.d;
      const den = 1 + nax * nbx + nay * nby;
      if (den > 1e-9) {
        const ux = (nax + nbx) / den; const uy = (nay + nby) / den;
        const gx = kfCst.qx + ux * dd; const gy = kfCst.qy + uy * dd;
        const acc = Math.min(h, Math.max(0.5 * Math.sqrt(ux * ux + uy * uy) * dd, kfJump * h));
        copyFoot(kfTa, kfQa); copyFoot(kfTb, kfQb);
        shiftFootC(C, kfCst.A, kfTa, ux * dd, uy * dd); shiftFootC(C, kfCst.B, kfTb, ux * dd, uy * dd);
        let sx = gx; let sy = gy;
        // K1247 s5: the segment predictor. The point at rn from the lines of
        // the segments the shifted feet sit on: exact while both feet stay
        // inside those segments, so Newton's first test passes there. The
        // landing test still measures from g.
        {
          const pa = C.polys[kfCst.A.pi]; const pb = C.polys[kfCst.B.pi]; const ka = kfTa.k; const kb = kfTb.k;
          if (ka >= 0 && ka < pa.nseg && kb >= 0 && kb < pb.nseg && pa.segLen[ka] > 0 && pb.segLen[kb] > 0) {
            const la = pa.segLen[ka]; const lb = pb.segLen[kb];
            let pAx = -pa.dy[ka] / la; let pAy = pa.dx[ka] / la;
            if ((kfCst.qx - pa.x[ka]) * pAx + (kfCst.qy - pa.y[ka]) * pAy < 0) { pAx = -pAx; pAy = -pAy; }
            let pBx = -pb.dy[kb] / lb; let pBy = pb.dx[kb] / lb;
            if ((kfCst.qx - pb.x[kb]) * pBx + (kfCst.qy - pb.y[kb]) * pBy < 0) { pBx = -pBx; pBy = -pBy; }
            const dt = pAx * pBy - pAy * pBx;
            if (dt > 0.05 || dt < -0.05) {
              const ca = rn + pAx * pa.x[ka] + pAy * pa.y[ka]; const cb = rn + pBx * pb.x[kb] + pBy * pb.y[kb];
              const px = (ca * pBy - pAy * cb) / dt; const py = (pAx * cb - ca * pBx) / dt;
              if ((px - gx) * (px - gx) + (py - gy) * (py - gy) <= 0.25 * acc * acc) { sx = px; sy = py; }
            }
          }
        }
        kfXY[0] = sx; kfXY[1] = sy; footNearM(C, kfCst.A, kfTa); footNearM(C, kfCst.B, kfTb);
        for (let it = 0; it < 60; it++) {
          const Fa = kfTa.d - rn; const Fb = kfTb.d - rn;
          if (Math.abs(Fa) < 1e-12 * Math.max(1, rn) && Math.abs(Fb) < 1e-12 * Math.max(1, rn)) break;
          if (!(kfTa.d > 1e-12 && kfTb.d > 1e-12)) break;
          const gax = (sx - kfTa.x) / kfTa.d; const gay = (sy - kfTa.y) / kfTa.d;
          const gbx = (sx - kfTb.x) / kfTb.d; const gby = (sy - kfTb.y) / kfTb.d;
          const det = gax * gby - gay * gbx;
          if (Math.abs(det) < 1e-12) break;
          if (Math.max(Math.abs(Fa), Math.abs(Fb)) < 1e-9 * Math.max(1, rn) && Math.abs(det) >= 0.05) break;
          let dx = (-Fa * gby + Fb * gay) / det;
          let dy = (-Fb * gax + Fa * gbx) / det;
          const dl = Math.sqrt(dx * dx + dy * dy);
          if (dl > acc) { dx *= acc / dl; dy *= acc / dl; }
          sx += dx; sy += dy;
          kfXY[0] = sx; kfXY[1] = sy; footNearM(C, kfCst.A, kfTa); footNearM(C, kfCst.B, kfTb);
        }
        const sok = Math.max(Math.abs(kfTa.d - rn), Math.abs(kfTb.d - rn)) < 1e-9 * Math.max(1, rn);
        if (sok && Math.sqrt((sx - gx) * (sx - gx) + (sy - gy) * (sy - gy)) <= acc) { kfCst.qx = sx; kfCst.qy = sy; copyFoot(kfQa, kfTa); copyFoot(kfQb, kfTb); kfCst.rhoCur = rn; advanced = true; }
      }
    }
    if (advanced) { step = Math.min(dN, 2 * step); }
    else { step /= 2; if (step < 1e-5 * h) break; }
  }
}
// K1247 s4: a node's state for the final re-advance (was a closure per
// corner that also filled C.nodeX..., which nothing reads).
function saveNodeC(kk: number): void {
  const NS = nodeScratch; const NK = nodeScratchK;
  const o = kk * 12;
  NS[o] = kfCst.qx; NS[o + 1] = kfCst.qy; NS[o + 2] = kfQa.d; NS[o + 3] = kfQa.x; NS[o + 4] = kfQa.y; NS[o + 5] = kfQa.s; NS[o + 6] = kfQa.u;
  NS[o + 7] = kfQb.d; NS[o + 8] = kfQb.x; NS[o + 9] = kfQb.y; NS[o + 10] = kfQb.s; NS[o + 11] = kfQb.u;
  NK[2 * kk] = kfQa.k; NK[2 * kk + 1] = kfQb.k;
}
function restoreNodeC(kk: number): void {
  const NS = nodeScratch; const NK = nodeScratchK; const o = kk * 12;
  kfCst.qx = NS[o]; kfCst.qy = NS[o + 1];
  kfQa.d = NS[o + 2]; kfQa.x = NS[o + 3]; kfQa.y = NS[o + 4]; kfQa.s = NS[o + 5]; kfQa.u = NS[o + 6]; kfQa.k = NK[2 * kk];
  kfQb.d = NS[o + 7]; kfQb.x = NS[o + 8]; kfQb.y = NS[o + 9]; kfQb.s = NS[o + 10]; kfQb.u = NS[o + 11]; kfQb.k = NK[2 * kk + 1];
  kfCst.rhoCur = nodeRho[kk];
}
// K1247 s5: the growth integrates the running min of w over rho with
// adaptive steps instead of 32 even nodes. A step [a, b] is taken as two
// halves (a -> m -> b); since the running min only falls, the error of the
// halves' trapezoid is at most |w_a - 2 w_m + w_b| (b - a) / 4 (a drop at an
// unknown place in one half, or the smooth parts' curvature), and a step is
// kept when that is under kfGrowE h times the larger of its share of r0 and
// its drop in w (so the whole integral is off by at most 2 kfGrowE h).
// Otherwise the step halves. A drop to 0 is localized the same way, which
// is the exact stop. The end is re-advanced from the last node below it.
let growNN = 0; let growWEnd = 0;
function refineC(C: FCache, klo: number, lo: number, wlo: number, hi: number, whi: number, E: number, Lmin: number): number {
  const L = hi - lo;
  if ((wlo - whi) * L * 0.5 <= E || L <= Lmin || growNN >= kfNodeCap) { growWEnd = whi; return 0.5 * (wlo + whi) * L; }
  const m = 0.5 * (lo + hi);
  restoreNodeC(klo);
  advanceToC(C, m, m - lo);
  if (kfCst.rhoCur < m - 1e-9 * Math.max(1, m)) { growWEnd = whi; return 0.5 * (wlo + whi) * L; }
  const wm = Math.min(wlo, wOfC(C));
  const km = growNN++; saveNodeC(km); nodeRho[km] = m;
  if (kfGrowMid) {
    const wh = Math.min(wm, whi);
    if (Math.abs(wlo - 2 * wm + wh) * L * 0.25 <= E) { growWEnd = wh; return (wlo + 2 * wm + wh) * L * 0.25; }
  }
  const left = refineC(C, klo, lo, wlo, m, wm, E, Lmin);
  const wmid = growWEnd;
  if (!(wmid > 0)) { growWEnd = 0; return left; }
  return left + refineC(C, km, m, wmid, hi, Math.min(wmid, whi), E, Lmin);
}
function growIntegC(C: FCache, ci: number): number {
  copyFoot(kfQa, kfFa); copyFoot(kfQb, kfFb);
  kfQa.u = C.armSR[kfCst.aiA] + C.armDir[kfCst.aiA] * armDistC(C, kfCst.aiA, kfFa.s);
  kfQb.u = C.armSR[kfCst.aiB] + C.armDir[kfCst.aiB] * armDistC(C, kfCst.aiB, kfFb.s);
  kfCst.qx = kfCst.Vx; kfCst.qy = kfCst.Vy; kfCst.rhoCur = C.h;
  if (!(kfCst.r0 > 1e-9)) { C.nodeN[ci] = 0; return 0; }
  if (kfGrowN > 0) {
    const h = C.h; const r0 = kfCst.r0; const N = kfGrowN; const dN = r0 / N; const dP = dN / kfGrowS;
    const E = kfGrowE * h; const Lmin = kfGrowZ * h;
    saveNodeC(0); nodeRho[0] = h; growNN = 1;
    let ka = 0; let a = h; let wa = wOfC(C);
    let integ = 0;
    for (let kk = 1; kk <= N && wa > 0 && growNN < kfNodeCap; kk++) {
      const b = kk === N ? h + r0 : h + kk * dN;
      restoreNodeC(ka);
      advanceToC(C, b, dP);
      if (kfCst.rhoCur < b - 1e-9 * Math.max(1, b)) {
        const s = Math.min(wa, wOfC(C));
        integ += 0.5 * (wa + s) * Math.max(0, kfCst.rhoCur - a);
        break;
      }
      const wr = wOfC(C);
      const wb = Math.min(wa, wr);
      const kb = growNN++; saveNodeC(kb); nodeRho[kb] = b;
      if ((wa - wb) * (b - a) * 0.5 <= E) { integ += 0.5 * (wa + wb) * (b - a); wa = wb; }
      else { integ += refineC(C, ka, a, wa, b, wb, E, Lmin); wa = growWEnd; }
      ka = kb; a = b;
    }
    C.nodeN[ci] = growNN;
    const target = h + integ;
    let k0 = 0;
    for (let i = 1; i < growNN; i++) if (nodeRho[i] <= target && nodeRho[i] > nodeRho[k0]) k0 = i;
    restoreNodeC(k0);
    if (target > nodeRho[k0]) advanceToC(C, target, dP);
    return Math.max(0, kfCst.rhoCur - h);
  }
  const h = C.h; const r0 = kfCst.r0;
  const E = kfGrowE * h; const Hmax = kfGrowH * r0; const Lmin = 1e-4 * h; const P = kfGrowP * r0;
  saveNodeC(0); nodeRho[0] = h;
  let nN = 1; let ka = 0; let a = h;
  let wa = wOfC(C);
  let integ = 0; let H = Hmax;
  // rCap: where the path ends (r0, or where an advance gave up: the
  // integral stops there, as the 32-node growth's did).
  let rCap = h + r0;
  for (let guard = 0; guard < 4 * kfNodeCap && wa > 0 && a < rCap - 1e-12 * rCap && nN + 2 <= kfNodeCap; guard++) {
    const b = Math.min(rCap, a + H);
    restoreNodeC(ka);
    advanceToC(C, b, Math.min(P, b - a));
    if (kfCst.rhoCur < b - 1e-9 * Math.max(1, b)) {
      // The path ends at f: integrate to it when it is near, else refine.
      const f = kfCst.rhoCur;
      if (f - a <= Lmin) { const s = Math.min(wa, wOfC(C)); integ += 0.5 * (wa + s) * Math.max(0, f - a); break; }
      rCap = f; H = Math.min(H, f - a); continue;
    }
    const wb = Math.min(wa, wOfC(C));
    const L = b - a;
    if (wa - wb <= 1e-9) {
      // Flat (the running min did not move): exact.
      saveNodeC(nN); nodeRho[nN] = b;
      integ += 0.5 * (wa + wb) * L;
      ka = nN; nN++; a = b; wa = wb;
      H = Math.min(Hmax, 2 * L);
      continue;
    }
    // w fell: take the step as two halves; the error of their trapezoid is
    // within |wa - 2 wm + wb| L / 4 (a fall at an unknown place in one half,
    // or the smooth parts' curvature).
    saveNodeC(nN + 1); nodeRho[nN + 1] = b;
    const m = 0.5 * (a + b);
    restoreNodeC(ka);
    advanceToC(C, m, Math.min(P, m - a));
    if (kfCst.rhoCur < m - 1e-9 * Math.max(1, m)) { rCap = kfCst.rhoCur; H = Math.min(H, rCap - a); continue; }
    const wm = Math.min(wa, wOfC(C));
    const wb2 = Math.min(wm, wb);
    const err = Math.abs(wa - 2 * wm + wb2) * L * 0.25;
    if (err > E * Math.max(L / r0, wa - wb2) && L > Lmin) { H = 0.5 * L; continue; }
    // Keep m and b (b's state is the direct advance from a).
    saveNodeC(nN); nodeRho[nN] = m;
    integ += (wa + 2 * wm + wb2) * L * 0.25;
    ka = nN + 1; nN += 2; a = b; wa = wb2;
    H = Math.min(Hmax, 2 * L);
  }
  C.nodeN[ci] = nN;
  const target = h + integ;
  let k0 = 0;
  for (let i = 1; i < nN; i++) if (nodeRho[i] <= target && nodeRho[i] > nodeRho[k0]) k0 = i;
  restoreNodeC(k0);
  if (target > nodeRho[k0]) advanceToC(C, target, Math.min(P, target - nodeRho[k0]));
  return Math.max(0, kfCst.rhoCur - h);
}

// --- K1247 s6: the growth in closed form -------------------------------------
// The medial path q(rho) (d_A(q) = d_B(q) = rho) is a chain of pieces. On a
// piece each arm's foot sits on one site: a segment's interior (a line: unit
// normal n toward q, c = n . P_k) or a convex vertex (a point).
//   line-line:   q = Q0 + U rho
//   line-point:  q = P + (rho - e) n + sg b t, b = sqrt(e (2 rho - e)), e the
//                point's height over the line (a parabola)
//   point-point: q = M + sg m sqrt(rho^2 - L^2 / 4)
// A piece ends at its first event, each a root of a linear form in q (in
// closed form on every piece type): a line foot reaches its segment's end (a
// convex vertex takes over), a point foot leaves its vertex's normal cone
// (the next segment takes over), or the arm window or the border ends (the
// path ends). At a concave vertex the event is the tracked foot's switch:
// footNearM sees h/32 of s around its foot, so it stays on segment k past
// the bisector until a point of k + 1 inside that window is closer (bisected
// on that window). The q of the new sites lands at most kfJump h away or the
// path ends, as advanceToC's acceptance does. No Newton step and no foot
// search: the feet are the sites' projections.
// K1247_CF=0 in the environment runs stage 5's stepping growth (checks).
interface CfArm { p: Poly; tx: Float64Array; ty: Float64Array; sgn: number; lo: number; hi: number; v: number; i: number; sh: number }
function mkCfArm(): CfArm { return { p: null as unknown as Poly, tx: new Float64Array(0), ty: new Float64Array(0), sgn: 1, lo: 0, hi: 0, v: 0, i: 0, sh: 0 }; }
const cfAr: CfArm[] = [mkCfArm(), mkCfArm()];
const CF_MAXP = 160;
const cfR = new Float64Array(CF_MAXP + 2);
// K1247 s6: 1 where q jumps at cfR[j] (a lag switch's lag): w can dip just
// before it and come back after, between any two nodes, so the growth splits
// at it (cfJumpIn).
const cfJ = new Uint8Array(CF_MAXP + 2);
const cfJumpTol = 1e-3; // in h
// K1247 s6: on a line piece both feet lie on segments, so q's directions to
// them are the segments' normals and fSteep is a constant: an upper bound on
// w over the whole piece. A short line piece whose fSteep sits under both
// ends' w is a dip the nodes step over (user_tw42 c143: plateaus 0.47 and 0.34
// between nodes at 0.69 and 0.44), so the growth splits there (cfDipIn). NaN =
// not computed yet; set per piece as it is made.
const cfSt = new Float64Array(CF_MAXP + 2);
// K1247 s7: fSteep at piece j's end (cfR[j + 1]) as piece j reads it, and the
// squared q jump at piece j's start (roundoff, under cfTol = 1e-9 h, at a vertex
// or segment-end transition, where q and both feet are continuous): the next piece's start value is then
// this one's end value, without a second cfSteepAt.
const cfSe = new Float64Array(CF_MAXP + 2);
const cfJd = new Float64Array(CF_MAXP + 2);
const cfTy = new Int8Array(CF_MAXP + 2);
const cfK = new Float64Array((CF_MAXP + 2) * 8);
const cfSV = new Uint8Array((CF_MAXP + 2) * 2); const cfSI = new Int32Array((CF_MAXP + 2) * 2); const cfSH = new Float64Array((CF_MAXP + 2) * 2);
let cfN = 0; let cfEnded = false; let cfRMax = 0; let cfPx = 0; let cfPy = 0; let cfCur = 0;
let cfQx = 0; let cfQy = 0;
let cfEvArm = 0; let cfEvKind = 0;
const CF_TURN = 1e-12;

function cfMake(i: number, qx: number, qy: number): boolean {
  const a = cfAr[0]; const b = cfAr[1];
  const o = i * 8; const K = cfK;
  cfSV[2 * i] = a.v; cfSI[2 * i] = a.i; cfSH[2 * i] = a.sh; cfSV[2 * i + 1] = b.v; cfSI[2 * i + 1] = b.i; cfSH[2 * i + 1] = b.sh;
  if (!a.v && !b.v) {
    const nax = -a.sgn * a.ty[a.i]; const nay = a.sgn * a.tx[a.i]; const ca = nax * a.p.x[a.i] + nay * a.p.y[a.i];
    const nbx = -b.sgn * b.ty[b.i]; const nby = b.sgn * b.tx[b.i]; const cb = nbx * b.p.x[b.i] + nby * b.p.y[b.i];
    const det = nax * nby - nay * nbx;
    if (!(Math.abs(det) > 1e-9)) return false;
    K[o] = (ca * nby - nay * cb) / det; K[o + 1] = (nax * cb - ca * nbx) / det;
    K[o + 2] = (nby - nay) / det; K[o + 3] = (nax - nbx) / det;
    cfTy[i] = 0; return true;
  }
  if (a.v && b.v) {
    const pax = a.p.x[a.i]; const pay = a.p.y[a.i]; const pbx = b.p.x[b.i]; const pby = b.p.y[b.i];
    const mx = 0.5 * (pax + pbx); const my = 0.5 * (pay + pby);
    const dx = pbx - pax; const dy = pby - pay; const L2 = dx * dx + dy * dy;
    if (!(L2 > 1e-24)) return false;
    const L = Math.sqrt(L2); const ux = -dy / L; const uy = dx / L;
    K[o] = mx; K[o + 1] = my; K[o + 2] = ux; K[o + 3] = uy; K[o + 4] = 0.25 * L2;
    K[o + 5] = (qx - mx) * ux + (qy - my) * uy >= 0 ? 1 : -1;
    cfTy[i] = 3; return true;
  }
  const S = a.v ? b : a; const Pn = a.v ? a : b;
  const tx = S.tx[S.i]; const ty = S.ty[S.i]; const nx = -S.sgn * ty; const ny = S.sgn * tx;
  const px = Pn.p.x[Pn.i]; const py = Pn.p.y[Pn.i];
  const e = nx * (px - S.p.x[S.i]) + ny * (py - S.p.y[S.i]);
  if (!(e > 1e-12)) return false;
  K[o] = px; K[o + 1] = py; K[o + 2] = nx; K[o + 3] = ny; K[o + 4] = tx; K[o + 5] = ty; K[o + 6] = e;
  K[o + 7] = (qx - px) * tx + (qy - py) * ty >= 0 ? 1 : -1;
  cfTy[i] = a.v ? 2 : 1; return true;
}
function cfQ(i: number, rho: number): void {
  const o = i * 8; const K = cfK; const t = cfTy[i];
  if (t === 0) { cfQx = K[o] + K[o + 2] * rho; cfQy = K[o + 1] + K[o + 3] * rho; return; }
  if (t === 3) { const r = Math.sqrt(Math.max(0, rho * rho - K[o + 4])) * K[o + 5]; cfQx = K[o] + K[o + 2] * r; cfQy = K[o + 1] + K[o + 3] * r; return; }
  const e = K[o + 6]; const al = rho - e; const be = Math.sqrt(Math.max(0, e * (2 * rho - e))) * K[o + 7];
  cfQx = K[o] + al * K[o + 2] + be * K[o + 4]; cfQy = K[o + 1] + al * K[o + 3] + be * K[o + 5];
}
// The first rho >= rs where g(q) = cx qx + cy qy - d leaves g >= 0 on piece
// i: rs when g(rs) < -cfTol, or when rs sits on (or within roundoff past) an
// EXIT root (g' < 0 there); Infinity when it never does. Only exit roots
// count, so a piece that starts on the boundary it just crossed (g = -1e-17
// with g' > 0) is not ended at once (the ping-pong at every transition).
let cfTol = 0; let cfDel = 0; let cfZr = NaN;
function cfRoot(i: number, cx: number, cy: number, d: number, rs: number): number {
  const o = i * 8; const K = cfK; const t = cfTy[i];
  if (t === 0 || t === 3) {
    let g1: number; let xs: number;
    if (t === 0) { g1 = cx * K[o + 2] + cy * K[o + 3]; xs = rs; }
    else { g1 = K[o + 5] * (cx * K[o + 2] + cy * K[o + 3]); xs = Math.sqrt(Math.max(0, rs * rs - K[o + 4])); }
    const g0 = cx * K[o] + cy * K[o + 1] - d;
    if (g0 + g1 * xs < -cfTol) return rs;
    if (!(g1 < 0)) return Infinity;
    const x = -g0 / g1;
    if (x <= xs) return rs;
    return t === 0 ? x : Math.sqrt(x * x + K[o + 4]);
  }
  const e = K[o + 6]; const sg = K[o + 7];
  const cn = cx * K[o + 2] + cy * K[o + 3]; const ct = cx * K[o + 4] + cy * K[o + 5];
  const A2 = cn / (2 * e); const A1 = sg * ct; const A0 = cx * K[o] + cy * K[o + 1] - d - 0.5 * cn * e;
  const bS = Math.sqrt(Math.max(0, e * (2 * rs - e)));
  if (A0 + bS * (A1 + A2 * bS) < -cfTol) return rs;
  let bR = Infinity;
  if (A2 === 0) { if (A1 < 0) bR = -A0 / A1; }
  else {
    const D = A1 * A1 - 4 * A2 * A0;
    if (D >= 0) {
      const qq = -0.5 * (A1 + (A1 >= 0 ? Math.sqrt(D) : -Math.sqrt(D)));
      const r1 = qq / A2; const r2 = qq !== 0 ? A0 / qq : r1;
      if (A1 + 2 * A2 * r1 < 0 && r1 > bS - cfDel && r1 < bR) bR = r1;
      if (A1 + 2 * A2 * r2 < 0 && r2 > bS - cfDel && r2 < bR) bR = r2;
    }
  }
  if (bR === Infinity) return Infinity;
  if (bR <= bS) return rs;
  return (bR * bR + e * e) / (2 * e);
}
function cfTurn(X: CfArm, v: number): number {
  // > 0: the border bends toward q at vertex v (concave); needs both segments.
  const p = X.p; const nseg = p.nseg;
  const km = v - 1 >= 0 ? v - 1 : p.closed ? nseg - 1 : -1;
  const kp = v < nseg ? v : -1;
  if (km < 0 || kp < 0) return NaN;
  return X.sgn * (X.tx[km] * X.ty[kp] - X.ty[km] * X.tx[kp]);
}
// The tracked foot's switch at a concave vertex (see the header): q's
// projection on segment k is a from the vertex, P is q's coordinate along
// the next segment; footNearM's window reaches w - a into it.
// The piece's end: the first event of either arm's site after rs.
function cfNext(C: FCache, i: number, rs: number): number {
  const w = C.h / 32;
  let best = Infinity; cfEvArm = 0; cfEvKind = 9; let nLg = 0;
  for (let j = 0; j < 2; j++) {
    const X = cfAr[j]; const p = X.p; const k = cfSI[2 * i + j];
    if (!cfSV[2 * i + j]) {
      const tx = X.tx[k]; const ty = X.ty[k]; const l = p.segLen[k];
      const tP = tx * p.x[k] + ty * p.y[k];
      const s0 = p.s[k] + cfSH[2 * i + j];
      // forward: (q - P_k) . T <= fl
      const fl = Math.min(l, X.hi - s0);
      let r = cfRoot(i, -tx, -ty, -(fl + tP), rs);
      if (r < Infinity) {
        if (fl < l || (!p.closed && k + 1 >= p.nseg)) { if (r < best) { best = r; cfEvArm = j; cfEvKind = 9; } }
        else if (cfTurn(X, k + 1 >= p.n ? 0 : k + 1) > CF_TURN) {
          // The lag switch lies in [rw, r]; solved below only if it can win.
          const rw = l - w > 0 ? cfRoot(i, -tx, -ty, -(l - w + tP), rs) : rs;
          cfLgArm[nLg] = j; cfLgK[nLg] = k; cfLgF[nLg] = 1; cfLgLo[nLg] = Math.max(rs, Math.min(rw, r)); cfLgHi[nLg] = r; nLg++;
        } else if (r < best) { best = r; cfEvArm = j; cfEvKind = 1; }
      }
      // backward: (q - P_k) . T >= bl
      const bl = Math.max(0, X.lo - s0);
      r = cfRoot(i, tx, ty, tP + bl, rs);
      if (r < Infinity) {
        if (bl > 0 || (!p.closed && k === 0)) { if (r < best) { best = r; cfEvArm = j; cfEvKind = 9; } }
        else if (cfTurn(X, k) > CF_TURN) {
          const rw = cfRoot(i, tx, ty, tP + Math.min(w, l), rs);
          cfLgArm[nLg] = j; cfLgK[nLg] = k; cfLgF[nLg] = 0; cfLgLo[nLg] = Math.max(rs, Math.min(rw, r)); cfLgHi[nLg] = r; nLg++;
        } else if (r < best) { best = r; cfEvArm = j; cfEvKind = 2; }
      }
    } else {
      const v = k; const px = p.x[v]; const py = p.y[v];
      const kp = v < p.nseg ? v : -1;
      const km = v - 1 >= 0 ? v - 1 : p.closed ? p.nseg - 1 : -1;
      if (kp >= 0) {
        const tx = X.tx[kp]; const ty = X.ty[kp];
        const r = cfRoot(i, -tx, -ty, -(tx * px + ty * py), rs);
        if (r < best) { best = r; cfEvArm = j; cfEvKind = 3; }
      }
      if (km >= 0) {
        const tx = X.tx[km]; const ty = X.ty[km];
        const r = cfRoot(i, tx, ty, tx * px + ty * py, rs);
        if (r < best) { best = r; cfEvArm = j; cfEvKind = 4; }
      }
      // K1247 s9: the vertex lag. footNearM's window from a vertex foot
      // reaches w past it, so when the segment on is shorter than w and the
      // vertex after it is concave, a point on the segment beyond can win
      // while q is still behind the short segment's normal (an end arm's
      // near-duplicate root point, def corner 34 under 0.001 px: the foot
      // sat on the root and r fell from 2h to 0.197h). Solved below.
      const sv = p.s[v] + cfSH[2 * i + j];
      if (kp >= 0 && p.segLen[kp] < w && (p.closed || kp + 1 < p.nseg) && sv + p.segLen[kp] < X.hi && cfTurn(X, v + 1 >= p.n ? 0 : v + 1) > CF_TURN) {
        cfLgArm[nLg] = j; cfLgK[nLg] = v; cfLgF[nLg] = 2; cfLgLo[nLg] = rs; cfLgHi[nLg] = Infinity; nLg++;
      }
      if (km >= 0 && p.segLen[km] < w && (p.closed || km >= 1) && sv - p.segLen[km] > X.lo && cfTurn(X, v - 1 >= 0 ? v - 1 : p.n - 1) > CF_TURN) {
        cfLgArm[nLg] = j; cfLgK[nLg] = v; cfLgF[nLg] = 3; cfLgLo[nLg] = rs; cfLgHi[nLg] = Infinity; nLg++;
      }
    }
  }
  for (let g = 0; g < nLg; g++) {
    if (!(cfLgLo[g] < best)) continue;
    const X = cfAr[cfLgArm[g]]; const k = cfLgK[g]; const fwd = cfLgF[g] === 1;
    if (cfLgF[g] >= 2) {
      // The vertex lag: no bracket is known, so the first sign change on 8
      // samples up to the piece's end, then Illinois inside it.
      const fv = cfLgF[g] === 2; const sv = X.p.s[k] + cfSH[2 * i + cfLgArm[g]];
      const hv = Math.min(best, cfRMax);
      if (!(hv > rs)) continue;
      let a0 = rs; cfQ(i, a0); let f0 = cfVLagF(X, k, fv, sv, cfQx, cfQy, w);
      let rr = Infinity;
      if (f0 < 0) { if (cfZr === rs) continue; rr = a0; } // not again at a cycle's rho (cfStep)
      else for (let m = 1; m <= 8; m++) {
        const b0 = rs + ((hv - rs) * m) / 8; cfQ(i, b0); let f1 = cfVLagF(X, k, fv, sv, cfQx, cfQy, w);
        if (!(f1 < 0)) { a0 = b0; f0 = f1; continue; }
        let lo2 = a0; let hi2 = b0; let side = 0; const tol = 1e-10 * C.h;
        for (let it = 0; it < 60 && hi2 - lo2 > tol; it++) {
          let mm = (lo2 * f1 - hi2 * f0) / (f1 - f0);
          if (!(mm > lo2 && mm < hi2) || it % 8 === 7) mm = 0.5 * (lo2 + hi2);
          cfQ(i, mm); const fm = cfVLagF(X, k, fv, sv, cfQx, cfQy, w);
          if (fm < 0) { hi2 = mm; f1 = fm; if (side === -1) f0 *= 0.5; side = -1; }
          else { lo2 = mm; f0 = fm; if (side === 1) f1 *= 0.5; side = 1; }
        }
        rr = hi2; break;
      }
      if (rr < best) { best = rr; cfEvArm = cfLgArm[g]; cfEvKind = fv ? 7 : 8; }
      continue;
    }
    // Illinois regula falsi on the switch function (negative = switched).
    let lo = cfLgLo[g]; let hi = cfLgHi[g];
    if (cfTy[i] === 0) {
      const rr = cfLagLine(i, X, k, fwd, lo, hi, w);
      if (rr < best) { best = rr; cfEvArm = cfLgArm[g]; cfEvKind = fwd ? 5 : 6; }
      continue;
    }
    cfQ(i, lo); let flo = cfLagF(X, k, fwd, cfQx, cfQy, w);
    let rr = hi;
    if (flo < 0) rr = lo;
    else {
      cfQ(i, hi); let fhi = cfLagF(X, k, fwd, cfQx, cfQy, w);
      if (fhi < 0) {
        let side = 0; const tol = 1e-10 * C.h;
        for (let it = 0; it < 60 && hi - lo > tol; it++) {
          let m = (lo * fhi - hi * flo) / (fhi - flo);
          if (!(m > lo && m < hi) || it % 8 === 7) m = 0.5 * (lo + hi);
          cfQ(i, m); const fm = cfLagF(X, k, fwd, cfQx, cfQy, w);
          if (fm < 0) { hi = m; fhi = fm; if (side === -1) flo *= 0.5; side = -1; }
          else { lo = m; flo = fm; if (side === 1) fhi *= 0.5; side = 1; }
        }
        rr = hi;
      }
    }
    if (rr < best) { best = rr; cfEvArm = cfLgArm[g]; cfEvKind = fwd ? 5 : 6; }
  }
  return best;
}
// The lag switch on a line piece in closed form: a (q's projection to the
// vertex) and P (q along the next segment) are linear in rho, so the switch
// condition is piecewise quadratic between the linear breakpoints where s =
// min(P, w - a, ln) changes branch (and P = 0, a = w). The first rho in
// [lo, hi] where it holds; hi when it never does (the projection reaches the
// vertex there, where the plain switch happens).
const cfBk = new Float64Array(8);
function cfLagLine(i: number, X: CfArm, k: number, fwd: boolean, lo: number, hi: number, w: number): number {
  const o = i * 8; const K = cfK; const p = X.p;
  const q0x = K[o]; const q0y = K[o + 1]; const ux = K[o + 2]; const uy = K[o + 3];
  const tx = X.tx[k]; const ty = X.ty[k];
  let vx: number; let vy: number; let nx: number; let ny: number; let ln: number; let a0: number; let a1: number;
  if (fwd) {
    const kn = k + 1 >= p.nseg ? 0 : k + 1; const v = k + 1 >= p.n ? 0 : k + 1;
    vx = p.x[v]; vy = p.y[v]; nx = X.tx[kn]; ny = X.ty[kn]; ln = p.segLen[kn];
    a0 = (vx - q0x) * tx + (vy - q0y) * ty; a1 = -(ux * tx + uy * ty);
  } else {
    const kn = k - 1 >= 0 ? k - 1 : p.nseg - 1;
    vx = p.x[k]; vy = p.y[k]; nx = -X.tx[kn]; ny = -X.ty[kn]; ln = p.segLen[kn];
    a0 = (q0x - vx) * tx + (q0y - vy) * ty; a1 = ux * tx + uy * ty;
  }
  const P0 = (q0x - vx) * nx + (q0y - vy) * ny; const P1 = ux * nx + uy * ny;
  // breakpoints: P = 0, a = w, a = w - ln, P + a = w, P = ln
  let nb = 0;
  const add = (c0: number, c1: number): void => { if (c1 !== 0) { const x = -c0 / c1; if (x > lo && x < hi) cfBk[nb++] = x; } };
  add(P0, P1); add(a0 - w, a1); add(a0 - w + ln, a1); add(P0 + a0 - w, P1 + a1); add(P0 - ln, P1);
  for (let x = 1; x < nb; x++) { const v = cfBk[x]; let y = x - 1; while (y >= 0 && cfBk[y] > v) { cfBk[y + 1] = cfBk[y]; y--; } cfBk[y + 1] = v; }
  let x0 = lo;
  for (let b = 0; b <= nb; b++) {
    const x1 = b < nb ? cfBk[b] : hi;
    if (!(x1 >= x0)) continue;
    const xm = 0.5 * (x0 + x1);
    const am = a0 + a1 * xm; const Pm = P0 + P1 * xm; const smax = Math.min(w - am, ln);
    if (smax > 0 && Pm > 0) {
      // f = c2 rho^2 + c1 rho + c0 on [x0, x1]
      let c2: number; let c1: number; let c0: number;
      if (Pm <= smax) { // s = P: a^2 - P^2
        c2 = a1 * a1 - P1 * P1; c1 = 2 * (a0 * a1 - P0 * P1); c0 = a0 * a0 - P0 * P0;
      } else if (w - am <= ln) { // s = w - a: a^2 + (w - a)^2 - 2 P (w - a)
        const s0 = w - a0; const s1 = -a1;
        c2 = a1 * a1 + s1 * s1 - 2 * P1 * s1; c1 = 2 * (a0 * a1 + s0 * s1 - P0 * s1 - P1 * s0); c0 = a0 * a0 + s0 * s0 - 2 * P0 * s0;
      } else { // s = ln: a^2 + ln^2 - 2 P ln
        c2 = a1 * a1; c1 = 2 * a0 * a1 - 2 * P1 * ln; c0 = a0 * a0 + ln * ln - 2 * P0 * ln;
      }
      const f0 = c0 + x0 * (c1 + c2 * x0);
      if (f0 < 0) return x0;
      // the first root in (x0, x1] where f turns negative
      let r = Infinity;
      if (c2 === 0) { if (c1 < 0) r = -c0 / c1; }
      else {
        const D = c1 * c1 - 4 * c2 * c0;
        if (D >= 0) {
          const qq = -0.5 * (c1 + (c1 >= 0 ? Math.sqrt(D) : -Math.sqrt(D)));
          const r1 = qq / c2; const r2 = qq !== 0 ? c0 / qq : r1;
          if (c1 + 2 * c2 * r1 < 0 && r1 >= x0 && r1 < r) r = r1;
          if (c1 + 2 * c2 * r2 < 0 && r2 >= x0 && r2 < r) r = r2;
        }
      }
      if (r <= x1) return r;
    }
    x0 = x1;
  }
  return hi;
}
const cfLgArm = new Int8Array(4); const cfLgK = new Int32Array(4); const cfLgF = new Int8Array(4);
const cfLgLo = new Float64Array(4); const cfLgHi = new Float64Array(4);
// The switch condition as a number: negative iff cfLagCond holds.
function cfLagF(X: CfArm, k: number, fwd: boolean, qx: number, qy: number, w: number): number {
  const p = X.p; const tx = X.tx[k]; const ty = X.ty[k];
  let a: number; let vx: number; let vy: number; let nx: number; let ny: number; let ln: number;
  if (fwd) {
    const kn = k + 1 >= p.nseg ? 0 : k + 1; const v = k + 1 >= p.n ? 0 : k + 1;
    vx = p.x[v]; vy = p.y[v];
    a = (vx - qx) * tx + (vy - qy) * ty;
    nx = X.tx[kn]; ny = X.ty[kn]; ln = p.segLen[kn];
  } else {
    const kn = k - 1 >= 0 ? k - 1 : p.nseg - 1;
    vx = p.x[k]; vy = p.y[k];
    a = (qx - vx) * tx + (qy - vy) * ty;
    nx = -X.tx[kn]; ny = -X.ty[kn]; ln = p.segLen[kn];
  }
  const P = (qx - vx) * nx + (qy - vy) * ny;
  const smax = Math.min(w - a, ln);
  if (!(smax > 0 && P > 0)) return a * a + w * w;
  const s = P < smax ? P : smax;
  return a * a + s * s - 2 * P * s;
}
// K1247 s9: the vertex lag's switch as a number, negative iff footNearM's
// window from vertex v (foot P_v, s sv) holds a closer point on the segment
// beyond its short neighbour: D = |q - P_vn|^2 - |q - P_v|^2 plays the
// segment lag's a^2.
function cfVLagF(X: CfArm, v: number, fwd: boolean, sv: number, qx: number, qy: number, w: number): number {
  const p = X.p;
  let k1: number; let kn: number; let vn: number; let sg: number; let lim: number;
  if (fwd) { k1 = v; vn = v + 1 >= p.n ? 0 : v + 1; kn = k1 + 1 >= p.nseg ? 0 : k1 + 1; sg = 1; lim = X.hi - (sv + p.segLen[k1]); }
  else { k1 = v - 1 >= 0 ? v - 1 : p.nseg - 1; vn = v - 1 >= 0 ? v - 1 : p.n - 1; kn = k1 - 1 >= 0 ? k1 - 1 : p.nseg - 1; sg = -1; lim = sv - p.segLen[k1] - X.lo; }
  const l = p.segLen[k1];
  const tP = sg * ((qx - p.x[v]) * X.tx[k1] + (qy - p.y[v]) * X.ty[k1]);
  const D = l * l - 2 * l * tP;
  const P = sg * ((qx - p.x[vn]) * X.tx[kn] + (qy - p.y[vn]) * X.ty[kn]);
  let smax = w - l; if (p.segLen[kn] < smax) smax = p.segLen[kn]; if (lim < smax) smax = lim;
  if (!(smax > 0 && P > 0)) return D + w * w;
  const s = P < smax ? P : smax;
  return D + s * s - 2 * P * s;
}
function cfApply(X: CfArm, kind: number): boolean {
  const p = X.p;
  switch (kind) {
    case 1: X.v = 1; X.i++; if (X.i >= p.n) { if (!p.closed) return false; X.i = 0; X.sh += p.len; } return true;
    case 2: X.v = 1; return true;
    case 3: if (X.i >= p.nseg) return false; X.v = 0; return true;
    case 4: X.v = 0; X.i--; if (X.i < 0) { if (!p.closed) return false; X.i = p.nseg - 1; X.sh -= p.len; } return true;
    case 5: X.i++; if (X.i >= p.nseg) { if (!p.closed) return false; X.i = 0; X.sh += p.len; } return true;
    case 6: X.i--; if (X.i < 0) { if (!p.closed) return false; X.i = p.nseg - 1; X.sh -= p.len; } return true;
    // K1247 s9: the vertex lag, from vertex v past its short segment onto
    // the segment beyond (forward: v + 1; backward: v - 2).
    case 7: X.v = 0; X.i++; if (X.i >= p.nseg) { if (!p.closed) return false; X.i -= p.nseg; X.sh += p.len; } return true;
    case 8: X.v = 0; X.i -= 2; if (X.i < 0) { if (!p.closed) return false; X.i += p.nseg; X.sh -= p.len; } return true;
  }
  return false;
}
// Is a site of piece i invalid at q? Sets cfEvArm / cfEvKind to its fix.
function cfBad(C: FCache, i: number, qx: number, qy: number): boolean {
  const tol = 1e-9 * C.h;
  for (let j = 0; j < 2; j++) {
    const X = cfAr[j]; const p = X.p; const k = cfSI[2 * i + j];
    if (!cfSV[2 * i + j]) {
      const tx = X.tx[k]; const ty = X.ty[k]; const l = p.segLen[k];
      const tt = (qx - p.x[k]) * tx + (qy - p.y[k]) * ty;
      const s0 = p.s[k] + cfSH[2 * i + j];
      const fl = Math.min(l, X.hi - s0); const bl = Math.max(0, X.lo - s0);
      cfEvArm = j;
      if (tt > fl + tol) { cfEvKind = fl < l || (!p.closed && k + 1 >= p.nseg) ? 9 : cfTurn(X, k + 1 >= p.n ? 0 : k + 1) > CF_TURN ? 5 : 1; return true; }
      if (tt < bl - tol) { cfEvKind = bl > 0 || (!p.closed && k === 0) ? 9 : cfTurn(X, k) > CF_TURN ? 6 : 2; return true; }
    } else {
      const v = k; const px = p.x[v]; const py = p.y[v];
      const kp = v < p.nseg ? v : -1;
      const km = v - 1 >= 0 ? v - 1 : p.closed ? p.nseg - 1 : -1;
      cfEvArm = j;
      if (kp >= 0 && (qx - px) * X.tx[kp] + (qy - py) * X.ty[kp] > tol) { cfEvKind = 3; return true; }
      if (km >= 0 && (qx - px) * X.tx[km] + (qy - py) * X.ty[km] < -tol) { cfEvKind = 4; return true; }
      if (kp < 0 || km < 0) { cfEvKind = 9; return true; }
    }
  }
  return false;
}
// K1247 s9: the settle loop's fallback. The site fixes test validity at the
// new piece's q, so a site whose piece is degenerate (a segment shorter than
// footNearM's window, whose direction the points' jitter turns at will: def
// corner 35, chain 22's 3e-5 root segment) sends q far away and the fixes
// cycle. footNearM's tracked foot is what the closed form follows: the next
// sites are each arm's footNearM foot, from piece i's foot, at q just past the
// event (cfDel), where the event's tie is broken.
const cfRF: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
function cfResettle(C: FCache, i: number, rE: number, qx: number, qy: number): boolean {
  const rp = rE + cfDel; const tol = 1e-12 * C.h;
  for (let j = 0; j < 2; j++) { const X = cfAr[j]; X.v = cfSV[2 * i + j]; X.i = cfSI[2 * i + j]; X.sh = cfSH[2 * i + j]; }
  cfQ(i, rp); const px = cfQx; const py = cfQy;
  for (let j = 0; j < 2; j++) {
    const X = cfAr[j]; const p = X.p;
    cfQx = px; cfQy = py; cfFoot(i, j, rp, cfRF);
    kfXY[0] = px; kfXY[1] = py;
    footNearM(C, C.armObj[j === 0 ? kfCst.aiA : kfCst.aiB], cfRF);
    const k = cfRF.k; const tt = cfRF.s - p.s[k];
    X.sh = cfRF.u - cfRF.s;
    if (tt <= tol) { X.v = 1; X.i = k; }
    else if (tt >= p.segLen[k] - tol) { X.v = 1; X.i = k + 1; if (X.i >= p.n) { if (!p.closed) return false; X.i = 0; X.sh += p.len; } }
    else { X.v = 0; X.i = k; }
  }
  if (!cfMake(i + 1, qx, qy)) return false;
  cfQ(i + 1, rE);
  return !cfBad(C, i + 1, cfQx, cfQy);
}
// One piece: from the frontier to its first event, then the next sites.
function cfStep(C: FCache): void {
  const i = cfN; const rs = cfR[i]; const h = C.h;
  // piece i was made by cfInit (i = 0) or by the previous step's settle loop
  if (i >= CF_MAXP - 1) { cfEnded = true; return; }
  let rE = cfNext(C, i, rs);
  if (rE < rs) rE = rs;
  if (rE >= cfRMax) { cfR[i + 1] = cfRMax; cfN = i + 1; cfEnded = true; return; }
  cfR[i + 1] = rE; cfN = i + 1;
  cfQ(i, rE); const qx = cfQx; const qy = cfQy;
  let kind = cfEvKind; let X = cfAr[cfEvArm];
  // K1247 s9: two zero-length pieces in a row are a site cycle (muse_hash
  // corner 106 under 0.01 px: a segment lag and the vertex lag at one rho
  // undo each other); footNearM's own feet decide, once per rho.
  let zs = false;
  if (i >= 1 && rE - rs <= cfTol && rs - cfR[i - 1] <= cfTol && cfZr !== rs) {
    cfZr = rs; zs = cfResettle(C, i, rE, qx, qy);
  }
  if (!zs) for (let it = 0; ; it++) {
    const ap = kind !== 9 && it <= 8 && cfApply(X, kind);
    if (!ap || !cfMake(i + 1, qx, qy)) {
      // K1247 s9: a site sequence that does not settle falls back on
      // footNearM's own feet (cfResettle); the event's own end or an arm
      // leaving its chain still ends the growth.
      const real = it === 0 && !ap;
      if (!real && cfResettle(C, i, rE, qx, qy)) { break; }
 cfEnded = true; return;
    }
    cfQ(i + 1, rE);
    if (!cfBad(C, i + 1, cfQx, cfQy)) break;
    kind = cfEvKind; X = cfAr[cfEvArm];
  }
  const dx = cfQx - qx; const dy = cfQy - qy;
  cfJ[i + 1] = dx * dx + dy * dy > cfJumpTol * cfJumpTol * h * h ? 1 : 0; cfSt[i + 1] = NaN; cfJd[i + 1] = dx * dx + dy * dy;
  if (dx * dx + dy * dy > kfJump * kfJump * h * h) { cfEnded = true; return; }
  cfPx = qx; cfPy = qy;
}
function cfInitArm(C: FCache, X: CfArm, ai: number, F: FFoot, u0: number): void {
  const arm = C.armObj[ai]; const p = C.polys[arm.pi];
  X.p = p; X.tx = C.tanTx[arm.pi]; X.ty = C.tanTy[arm.pi];
  X.lo = C.armDir[ai] > 0 ? C.armSR[ai] : C.armSR[ai] - C.armL[ai];
  X.hi = C.armDir[ai] > 0 ? C.armSR[ai] + C.armL[ai] : C.armSR[ai];
  let k = F.k; if (k < 0 || k >= p.nseg) k = segOfS(p, normS(p, F.s)).k;
  const tx = X.tx[k]; const ty = X.ty[k]; const l = p.segLen[k];
  const tt = Math.min(l, Math.max(0, (F.x - p.x[k]) * tx + (F.y - p.y[k]) * ty));
  X.sh = u0 - (p.s[k] + tt);
  X.v = 0; X.i = k;
  // The side: q's side of the foot's segment (or of its neighbour's at a vertex).
  let cr = tx * (kfCst.Vy - p.y[k]) - ty * (kfCst.Vx - p.x[k]);
  if (Math.abs(cr) < 1e-9 * C.h) {
    const k2 = tt > 0.5 * l ? (k + 1 < p.nseg ? k + 1 : p.closed ? 0 : k) : (k > 0 ? k - 1 : p.closed ? p.nseg - 1 : k);
    cr = X.tx[k2] * (kfCst.Vy - p.y[k2]) - X.ty[k2] * (kfCst.Vx - p.x[k2]);
  }
  X.sgn = cr >= 0 ? 1 : -1;
  const tol = 1e-9 * l;
  if (tt >= l - tol) { if (!(cfTurn(X, k + 1 >= p.n ? 0 : k + 1) > CF_TURN)) cfApply(X, 1); }
  else if (tt <= tol) { if (!(cfTurn(X, k) > CF_TURN)) X.v = 1; }
}
function cfInit(C: FCache): boolean {
  const h = C.h; cfTol = 1e-9 * h; cfDel = 1e-6 * h; cfZr = NaN;
  cfInitArm(C, cfAr[0], kfCst.aiA, kfFa, kfQa.u);
  cfInitArm(C, cfAr[1], kfCst.aiB, kfFb, kfQb.u);
  cfN = 0; cfR[0] = h; cfEnded = false; cfRMax = h + kfCst.r0; cfCur = 0; cfSt[0] = NaN;
  cfPx = kfCst.Vx; cfPy = kfCst.Vy;
  for (let it = 0; ; it++) {
    if (it > 8 || !cfMake(0, cfPx, cfPy)) return false;
    cfQ(0, h);
    if (!cfBad(C, 0, cfQx, cfQy)) break;
    if (cfEvKind === 9 || !cfApply(cfAr[cfEvArm], cfEvKind)) return false;
  }
  const dx = cfQx - kfCst.Vx; const dy = cfQy - kfCst.Vy;
  return dx * dx + dy * dy <= 1e-12 * h * h;
}
function cfFoot(i: number, j: number, rho: number, F: FFoot): void {
  const X = cfAr[j]; const p = X.p; const k = cfSI[2 * i + j];
  const qx = cfQx; const qy = cfQy;
  if (!cfSV[2 * i + j]) {
    const tx = X.tx[k]; const ty = X.ty[k];
    const tt = (qx - p.x[k]) * tx + (qy - p.y[k]) * ty;
    const fx = p.x[k] + tt * tx; const fy = p.y[k] + tt * ty;
    F.x = fx; F.y = fy; F.d = Math.sqrt((qx - fx) * (qx - fx) + (qy - fy) * (qy - fy)) || rho;
    F.s = p.s[k] + tt; F.k = k; F.u = F.s + cfSH[2 * i + j];
  } else {
    const fx = p.x[k]; const fy = p.y[k];
    F.x = fx; F.y = fy; F.d = Math.sqrt((qx - fx) * (qx - fx) + (qy - fy) * (qy - fy)) || rho;
    F.s = p.s[k]; F.k = k < p.nseg ? k : k - 1; F.u = F.s + cfSH[2 * i + j];
  }
}
// q and the feet at rho into kfCst / kfQa / kfQb; false when the path ended
// before rho (they are then the path's end).
function cfAt(C: FCache, rho: number): boolean {
  while (!cfEnded && (cfN === 0 || cfR[cfN] < rho)) cfStep(C);
  if (cfN === 0) {
    cfQ(0, cfR[0]); kfCst.qx = cfQx; kfCst.qy = cfQy; cfFoot(0, 0, cfR[0], kfQa); cfFoot(0, 1, cfR[0], kfQb); kfCst.rhoCur = cfR[0];
    return rho <= cfR[0];
  }
  let r = rho; let ok = true;
  if (r > cfR[cfN]) { r = cfR[cfN]; ok = false; }
  let i = cfCur < cfN ? cfCur : cfN - 1;
  while (i > 0 && cfR[i] >= r) i--; // at a boundary, the left piece (a jump's left limit)
  while (i < cfN - 1 && cfR[i + 1] < r) i++;
  cfCur = i;
  cfQ(i, r);
  kfCst.qx = cfQx; kfCst.qy = cfQy;
  cfFoot(i, 0, r, kfQa); cfFoot(i, 1, r, kfQb);
  kfCst.rhoCur = r;
  return ok;
}
// The first piece boundary strictly inside (lo, hi) where q jumps, or -1. Not
// (lo + Lmin, hi - Lmin): a jump just short of a node hides w's fall before it
// behind the node's w after it (def 0.5 c12: a jump at 0.7955h, the node at
// 0.7960h; w is 0 from 0.777h on the left side, 0.55 on the right).
function cfJumpIn(lo: number, hi: number): number {
  let j = cfCur < cfN ? cfCur : cfN - 1; if (j < 1) j = 1;
  while (j > 1 && cfR[j - 1] > lo) j--;
  const zl = 1e-12 * kfCst.rhoCur;
  for (; j < cfN; j++) { const r = cfR[j]; if (r >= hi - zl) break; if (r > lo + zl && cfJ[j]) return j; }
  return -1;
}
// fSteep on line piece j (constant there; see cfSt).
const cfFa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const cfFb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
// On a parabola piece (one foot on a vertex) q's direction from the vertex
// turns monotonically away from the segment's normal as rho grows, and on a
// point-point piece the two directions close up, so fSteep is monotone there:
// its minimum over the piece is at an end. cfSt holds the minimum, cfSr its rho.
const cfSr = new Float64Array(CF_MAXP + 2);
function cfSteepAt(j: number, r: number): number {
  cfQ(j, r); cfFoot(j, 0, r, cfFa); cfFoot(j, 1, r, cfFb);
  const denQ = 1 + ((cfQx - cfFa.x) * (cfQx - cfFb.x) + (cfQy - cfFa.y) * (cfQy - cfFb.y)) / ((cfFa.d || 1) * (cfFb.d || 1));
  const denRatio = Math.abs(kfCst.denV) > 1e-12 ? denQ / kfCst.denV : 0;
  return ss01((denRatio - 0.3) / 0.4);
}
// K1247 s7: on a line piece q - foot is d times the site's unit normal
// (sgn-rotated tangent) for both feet, so denQ = 1 + nA . nB from the two
// tangents alone (no q, no feet). K1247_STEEP=0 runs the point evaluations.
function cfSteepLine(j: number): number {
  const a = cfAr[0]; const b = cfAr[1]; const ka = cfSI[2 * j]; const kb = cfSI[2 * j + 1];
  const denQ = 1 + a.sgn * b.sgn * (a.tx[ka] * b.tx[kb] + a.ty[ka] * b.ty[kb]);
  const denRatio = Math.abs(kfCst.denV) > 1e-12 ? denQ / kfCst.denV : 0;
  return ss01((denRatio - 0.3) / 0.4);
}
function cfSteepOf(j: number): number {
  let s = cfSt[j];
  if (s === s) return s;
  if (cfTy[j] === 0) {
    const r = 0.5 * (cfR[j] + cfR[j + 1]);
    s = cfSteepLine(j); cfSr[j] = r; cfSe[j] = s;
  } else {
    const s0 = j > 0 && cfJd[j] <= cfTol * cfTol && cfSt[j - 1] === cfSt[j - 1] ? cfSe[j - 1] : cfSteepAt(j, cfR[j]);
    const s1 = cfSteepAt(j, cfR[j + 1]); cfSe[j] = s1;
    if (s1 <= s0) { s = s1; cfSr[j] = cfR[j + 1]; } else { s = s0; cfSr[j] = cfR[j]; }
  }
  cfSt[j] = s;
  return s;
}
// The first piece in [lo, hi] whose fSteep minimum (at cfSr) lies strictly
// inside and under wcap (w there is lower than at either end), or -1.
function cfDipIn(lo: number, hi: number, wcap: number): number {
  if (!(wcap > 1e-12)) return -1; // fSteep >= 0: nothing dips under a w of 0
  let j = cfCur < cfN ? cfCur : cfN - 1; if (j < 0) return -1;
  while (j > 0 && cfR[j] > lo) j--;
  const zl = 1e-12 * kfCst.rhoCur;
  for (; j < cfN; j++) {
    const r = cfR[j]; if (r >= hi) break;
    if (!(cfR[j + 1] - r > zl) || cfR[j + 1] <= lo) continue;
    if (cfSteepOf(j) < wcap - 1e-12) { const m = cfSr[j]; if (m > lo + zl && m < hi - zl) return j; }
  }
  return -1;
}
function cfRefine(C: FCache, lo: number, wlo: number, hi: number, whi: number, E: number, Lmin: number): number {
  const L = hi - lo;
  if (L > 2 * Lmin) {
    // split at a jump: w at its left limit (cfAt at cfR[j] reads piece j - 1);
    // else inside a dip (a line piece under both ends' w)
    const j = cfJumpIn(lo, hi);
    let m = j > 0 ? cfR[j] : -1;
    if (m < 0) {
      const d = cfDipIn(lo, hi, Math.min(wlo, whi));
      if (d >= 0) { m = 0.5 * (cfR[d] + Math.min(cfR[d + 1], hi)); if (m < lo + Lmin) m = lo + Lmin; if (m > hi - Lmin) m = hi - Lmin; }
    }
    if (m > 0) {
      cfAt(C, m); const wm = Math.min(wlo, wOfC(C));
      const left = cfRefine(C, lo, wlo, m, wm, E, Lmin);
      const wmid = growWEnd;
      if (!(wmid > 0)) { growWEnd = 0; return left; }
      return left + cfRefine(C, m, wmid, hi, Math.min(wmid, whi), E, Lmin);
    }
  }
  if ((wlo - whi) * L * 0.5 <= E || L <= Lmin) { growWEnd = whi; return 0.5 * (wlo + whi) * L; }
  const m = 0.5 * (lo + hi);
  if (!cfAt(C, m)) { growWEnd = whi; return 0.5 * (wlo + whi) * L; }
  const wm = Math.min(wlo, wOfC(C));
  if (kfGrowMid) {
    const wh = Math.min(wm, whi);
    if (Math.abs(wlo - 2 * wm + wh) * L * 0.25 <= E) { growWEnd = wh; return (wlo + 2 * wm + wh) * L * 0.25; }
  }
  const left = cfRefine(C, lo, wlo, m, wm, E, Lmin);
  const wmid = growWEnd;
  if (!(wmid > 0)) { growWEnd = 0; return left; }
  return left + cfRefine(C, m, wmid, hi, Math.min(wmid, whi), E, Lmin);
}
// K1314 s4: true when the last growCFC grew along the closed-form path (cfAt can revisit any rho
// of it), false on the integrator fallback.
let growCfOk = false;
function growCFC(C: FCache, ci: number): number {
  const h = C.h; const r0 = kfCst.r0; growCfOk = false;
  copyFoot(kfQa, kfFa); copyFoot(kfQb, kfFb);
  kfQa.u = C.armSR[kfCst.aiA] + C.armDir[kfCst.aiA] * armDistC(C, kfCst.aiA, kfFa.s);
  kfQb.u = C.armSR[kfCst.aiB] + C.armDir[kfCst.aiB] * armDistC(C, kfCst.aiB, kfFb.s);
  kfCst.qx = kfCst.Vx; kfCst.qy = kfCst.Vy; kfCst.rhoCur = h;
  if (!(r0 > 1e-9)) { C.nodeN[ci] = 0; return 0; }
  if (!cfInit(C)) { return growIntegC(C, ci); }
  growCfOk = true;
  const N = kfGrowN > 0 ? kfGrowN : 16; const dN = r0 / N;
  const E = kfGrowE * h; const Lmin = kfGrowZ * h;
  cfAt(C, h);
  let a = h; let wa = wOfC(C); let nn = 1;
  let integ = 0;
  for (let kk = 1; kk <= N && wa > 0; kk++) {
    const b = kk === N ? h + r0 : h + kk * dN;
    const okb = cfAt(C, b); nn++;
    if (!okb) {
      const f = kfCst.rhoCur;
      const wr = wOfC(C);
      const s = Math.min(wa, wr);
      // K1247 s6: refine up to the path's end too (the stepping growth meets no end
      // where its foot pins to the window's end, so it refines there).
      if (f - a > Lmin && (wa - s) * (f - a) * 0.5 > E) integ += cfRefine(C, a, wa, f, s, E, Lmin);
      else integ += 0.5 * (wa + s) * Math.max(0, f - a);
      break;
    }
    const wr = wOfC(C);
    const wb = Math.min(wa, wr);
    if ((wa - wb) * (b - a) * 0.5 <= E && cfJumpIn(a, b) < 0 && cfDipIn(a, b, wb) < 0) { integ += 0.5 * (wa + wb) * (b - a); wa = wb; }
    else { integ += cfRefine(C, a, wa, b, wb, E, Lmin); wa = growWEnd; }
    a = b;
  }
  C.nodeN[ci] = nn;
  cfAt(C, h + integ);
  return Math.max(0, kfCst.rhoCur - h);
}

const meetScratch = { found: false, x: 0, y: 0, sA: 0, dA: 0, sB: 0, dB: 0, segA: -1, segB: -1 };
// K1247 s13: a crossing's real cut counts only where it lies inside the crossing's s window on
// both chains ([s - R, s + R], the window clipSegS gives a synthesized cut). segsNear keeps whole
// segments, so a hit up to one segment past R used to count when its segment's first point fell
// inside the window and vanish when it fell outside, and the synthesized cut that replaced it sat
// at the edge: fat cyc18 jitter 0.01 moved crossing 310's cut 2 px (R 0.88203 vs 0.88225 against a
// segment starting at 0.88216). Clipped the same way, a hit leaving the window hands over to the
// synthesized cut at the same point. K13_NOHITWIN=1 restores stage 12's rule for A/B.
// K1247 s14: underlays. A discarded structural interval (an under pass's gap, a junction's
// through pass, an end arm's stretch to its cap) is still the chain's band. Stage 12's
// structural order discards every pair, where the cS order missed the ones another station
// fell between (a seam inside an under pass, two junctions' stations interleaved), and the
// regions those misses left drew the band there. Without them, the band shows paper where the
// cut's straight chord falls short of the over band's curved edge (fat 19.76,1.47; muse_hash
// 28.39,20.41) and where a junction region misses a stretch of its chain (def 19.95,31.31;
// muse_hash 26.86,22.32). Each discarded interval now also paints its band (from the envelope
// start, so a passed station's triangle is inside) as a face beneath every other face: it shows
// only where nothing else paints. One per discarded interval, ids after the junction regions,
// no pieces. K14_NOUNDER=1 drops them for A/B.
const UNDER_DEPTH = -1e9;
const mtSegs = [new Int32Array(1024), new Int32Array(1024)];
const mtBoxA = mkSegBoxes(); const mtBoxB = mkSegBoxes();
function dSignedC(C: FCache, ai: number, s: number): number {
  const p = C.polys[C.armObj[ai].pi];
  let d = (s - C.armSR[ai]) * C.armDir[ai];
  if (p.closed && p.len > 0) { d = ((d % p.len) + p.len) % p.len; if (d > p.len / 2) d -= p.len; }
  return d;
}
/** The border segments whose signed arm distance range meets [lo, hi]
 *  (the old segOk), in index order, into mtSegs[which]. */
function meetSegsOf(C: FCache, Bd: FBord, ai: number, lo: number, hi: number, which: number): number {
  const nb = Bd.nb;
  if (mtSegs[which].length < nb) mtSegs[which] = new Int32Array(nb * 2);
  const out = mtSegs[which];
  const p = C.polys[C.armObj[ai].pi];
  const sR = C.armSR[ai]; const dir = C.armDir[ai];
  const wrap = p.closed && p.len > 0; const len = p.len; const half = p.len / 2;
  const bs = Bd.bsm;
  let n = 0;
  let d1 = 0;
  for (let i = 0; i + 1 < nb; i++) {
    let d0: number;
    if (i === 0) { d0 = (bs[0] - sR) * dir; if (wrap) { d0 = ((d0 % len) + len) % len; if (d0 > half) d0 -= len; } }
    else d0 = d1;
    d1 = (bs[i + 1] - sR) * dir; if (wrap) { d1 = ((d1 % len) + len) % len; if (d1 > half) d1 -= len; }
    if (Math.abs(d1 - d0) > half) continue;
    if (Math.max(d0, d1) >= lo && Math.min(d0, d1) <= hi) out[n++] = i;
  }
  return n;
}
/** K1283 s8 (j59): a cut fold's cut point stands on both of the fold's legs (its chevron's ends,
 *  s on the first leg and on the second). Uncut, a border meeting the fold near it crossed both
 *  legs, and the meet took the leg nearer the arm (the least d); cut, only the kept leg's segment
 *  next to the cut point is there. A hit on that segment (into the chevron's first end, or out of
 *  its last) also stands at the same offset from the cut point on the other leg: this returns that
 *  s (or s itself), and borderMeetC keeps the one nearer the arm, as the uncut search did. */
const MEET_MIRROR = true;
function cutMirrorS(p: Poly, B: FBord, k: number, s: number): number {
  if (B.bcv[k + 1] === 1) return B.bs2[k + 1] - dS(p, s, B.bsm[k + 1]);
  if (B.bcv[k] === 2) return B.bs2[k] + dS(p, B.bsm[k], s);
  return s;
}
function borderMeetC(C: FCache, ci: number, aiA: number, sideA: number, aiB: number, sideB: number): boolean {
  meetScratch.found = false;
  const A = C.armObj[aiA]; const B = C.armObj[aiB];
  if (A.pi === B.pi && sideA === sideB) return false;
  const h = C.h;
  const lo = -h; const hi = 14 * h;
  const BA = C.bords[A.pi * 2 + (sideA === 1 ? 0 : 1)];
  const BB = C.bords[B.pi * 2 + (sideB === 1 ? 0 : 1)];
  // Full search every frame: a window around last frame's meet pair
  // could return a different intersection than the global best.
  // K1247 s2: the same (i, k) order, pairs skipped by padded block
  // bboxes (segInt accepts t and u up to 1e-9 outside [0, 1]; the pad
  // is far wider than that).
  const nA = meetSegsOf(C, BA, aiA, lo, hi, 0);
  const nB = meetSegsOf(C, BB, aiB, lo, hi, 1);
  const sa = mtSegs[0]; const sb = mtSegs[1];
  fillSegBoxes(mtBoxA, BA, sa, nA); fillSegBoxes(mtBoxB, BB, sb, nB);
  const xa = mtBoxA; const xb = mtBoxB;
  const pad = 1e-6 * h;
  if (xObl.length < xb.nb) xObl = new Int32Array(xb.nb * 2);
  const obl = xObl;
  let bestD = Infinity;
  let found = false;
  const pA = C.polys[A.pi]; const pB = C.polys[B.pi];
  for (let ub = 0; ub < xa.nb; ub++) {
    const ux0 = xa.bx0[ub] - pad; const ux1 = xa.bx1[ub] + pad; const uy0 = xa.by0[ub] - pad; const uy1 = xa.by1[ub] + pad;
    let nOb = 0;
    for (let ob = 0; ob < xb.nb; ob++) if (!(ux1 < xb.bx0[ob] || ux0 > xb.bx1[ob] || uy1 < xb.by0[ob] || uy0 > xb.by1[ob])) obl[nOb++] = ob;
    if (!nOb) continue;
    const kEnd = Math.min(nA, (ub + 1) * XBLK);
    for (let kq = ub * XBLK; kq < kEnd; kq++) {
      const i = sa[kq];
      const mnx = xa.x0[kq] - pad; const mxx = xa.x1[kq] + pad; const mny = xa.y0[kq] - pad; const mxy = xa.y1[kq] + pad;
      const a0x = BA.bx[i]; const a0y = BA.by[i]; const a1x = BA.bx[i + 1]; const a1y = BA.by[i + 1];
      for (let q = 0; q < nOb; q++) {
        const ob = obl[q];
        if (mxx < xb.bx0[ob] || mnx > xb.bx1[ob] || mxy < xb.by0[ob] || mny > xb.by1[ob]) continue;
        const jEnd = Math.min(nB, (ob + 1) * XBLK);
        for (let kk = ob * XBLK; kk < jEnd; kk++) {
          if (mxx < xb.x0[kk] || mnx > xb.x1[kk] || mxy < xb.y0[kk] || mny > xb.y1[kk]) continue;
          const k = sb[kk];
          const hit = segInt(a0x, a0y, a1x, a1y, BB.bx[k], BB.by[k], BB.bx[k + 1], BB.by[k + 1]);
          if (!hit) continue;
          let sAh = lerpS(pA, BA.bsm[i], BA.bsm[i + 1], hit.t);
          let sBh = lerpS(pB, BB.bsm[k], BB.bsm[k + 1], hit.u);
          let dA = dSignedC(C, aiA, sAh); let dB = dSignedC(C, aiB, sBh);
          if (MEET_MIRROR) {
            const mA = cutMirrorS(pA, BA, i, sAh);
            if (mA !== sAh) { const d = dSignedC(C, aiA, mA); if (d >= lo && d <= hi && (d < dA || dA < lo || dA > hi)) { sAh = mA; dA = d; } }
            const mB = cutMirrorS(pB, BB, k, sBh);
            if (mB !== sBh) { const d = dSignedC(C, aiB, mB); if (d >= lo && d <= hi && (d < dB || dB < lo || dB > hi)) { sBh = mB; dB = d; } }
          }
          if (dA < lo || dA > hi || dB < lo || dB > hi) continue;
          if (dA + dB < bestD) {
            bestD = dA + dB; found = true;
            meetScratch.x = a0x + (a1x - a0x) * hit.t; meetScratch.y = a0y + (a1y - a0y) * hit.t;
            meetScratch.sA = sAh; meetScratch.dA = dA; meetScratch.sB = sBh; meetScratch.dB = dB;
            meetScratch.segA = i; meetScratch.segB = k;
          }
        }
      }
    }
  }
  if (found) {
    meetScratch.found = true;
    C.meetValid[ci] = 1; C.meetSegA[ci] = meetScratch.segA; C.meetSegB[ci] = meetScratch.segB;
  }
  return found;
}

/** K1247 s10: a "V outside spans" fallback's station fraction scale. The
 *  solve fails when the meet passes a span's far end, where the ok corner
 *  is the r = 0 V; scaling the fraction from 0 at the end to 1 at SPAN_RAMP h
 *  past it keeps the stations continuous across that switch (a step of up
 *  to 0.5 h at a cut-limited arm before). eA, eB: the meet's distance past
 *  each arm's end; a meet past neither (behind a root) keeps the fraction.
 *  A cut-limited end carries the reach's tangent noise (about 1 px at
 *  shallow crossings under 0.01 px of jitter), which the ramp passes to the
 *  station at (sR - sM) / width (g41_def_tw64 cyc18 run #164, 0.816 px).
 *  A width of 0.75 h or h (form B's) quiets it but tips def's tail 17 into
 *  the first-positive-stretch flip (5.8 px at 0.01 px of jitter), so 0.5 h
 *  stays until tails stop deciding from the margin's sign. */
const SPAN_RAMP = 0.5;
/** K1283 s8 (x134, muse_hash j81 corner 164): a fallback corner whose borders never meet (they part
 *  toward the junction: chain 75's side -1 runs inside end chain 34's fill all the way to its root)
 *  kept both stations at the arm roots, so each border ran hard through the other chain's fill, where
 *  form B buries it (its fill covers the border's band). Each station now sits where its border's band
 *  comes out of the other chain's fill: the band's midline (W / 2 in from the base border) at h - W
 *  from the other chain's centerline, within 4 h of its root. A border already out at its root keeps
 *  the root; one buried the whole reach stops at the reach's end, so the station moves continuously. */
const NOMEET_BURY = true;
function buriedReach(p: Poly, sAt: (d: number) => number, L: number, q: Poly, sRq: number, h: number, W: number, bp: (d: number, out: Float64Array) => void): number {
  const fillR = h - W;
  const reach = Math.min(L, 4 * h);
  if (!(reach > 0) || !(fillR > 0)) return 0;
  const lo = q.closed ? sRq - 4 * h : Math.max(q.s0, sRq - 4 * h);
  const hi = q.closed ? sRq + 4 * h : Math.min(q.s0 + q.len, sRq + 4 * h);
  const P = new Float64Array(2); const c = new Float64Array(4);
  const buried = (d: number): boolean => {
    bp(d, P);
    pointAtInto(p, sAt(d), c);
    const ox = c[0] - P[0]; const oy = c[1] - P[1]; const ol = Math.sqrt(ox * ox + oy * oy) || 1;
    return footInWindow(q, P[0] + (ox / ol) * 0.5 * W, P[1] + (oy / ol) * 0.5 * W, lo, hi).d < fillR;
  };
  if (!buried(0)) return 0;
  const step = h / 16;
  let a = 0; let b = -1;
  for (let d = step; d < reach + 1e-12; d += step) { if (!buried(d)) { b = d; break; } a = d; }
  if (b < 0) { if (!buried(reach)) b = reach; else return reach; }
  for (let it = 0; it < 12; it++) { const m = 0.5 * (a + b); if (buried(m)) a = m; else b = m; }
  return b;
}
function spanRamp(eA: number, eB: number, h: number): number {
  const e = Math.max(eA, eB);
  return e > 0 ? Math.min(1, e / (SPAN_RAMP * h)) : 1;
}

function cornerFallbackC(C: FCache, st: DiagramStructure, scene: SceneIn, ci: number, aiA: number, aiB: number, sideA: number, sideB: number, th: number): void {
  const h = C.h;
  const ji = st.corners[ci].ji;
  const j = scene.junctions[ji];
  C.cOk[ci] = 0;
  if (borderMeetC(C, ci, aiA, sideA, aiB, sideB)) {
    const mt = meetScratch;
    const depthWin = scene.look.depthWindow * (scene.look.ctrlArc ?? 1);
    void depthWin;
    const zt = 0.1 * C.depthAmp;
    const zA = depthAtC(C, C.armObj[aiA].pi, mt.sA, C.depthWindow * C.ctrlArc);
    const zB = depthAtC(C, C.armObj[aiB].pi, mt.sB, C.depthWindow * C.ctrlArc);
    const wA = zt > 0 ? Math.min(1, Math.max(0, (zA - zB) / zt)) : 0;
    const wB = zt > 0 ? Math.min(1, Math.max(0, (zB - zA) / zt)) : 0;
    const eOf = (ai: number, side: number, sM: number, w: number, out: Float64Array): number => {
      const arm = C.armObj[ai];
      const p = C.polys[arm.pi];
      let ds = C.armSR[ai] - sM;
      if (p.closed && p.len > 0) ds = ((((ds + p.len / 2) % p.len) + p.len) % p.len) - p.len / 2;
      let sAt = sM + ds * w;
      if (p.closed) sAt = normS(p, sAt);
      borderPointAtBase(C, arm.pi, side, sAt, out);
      return sAt;
    };
    const capOf = (ai: number): number => Math.max(0, Number.isFinite(C.armLcut[ai]) ? Math.min(C.armL[ai], C.armLcut[ai] - 0.5 * h) : C.armL[ai]);
    const rCap = Math.min(1, Math.max(0, Math.min(mt.dA > 1e-12 ? capOf(aiA) / mt.dA : 1, mt.dB > 1e-12 ? capOf(aiB) / mt.dB : 1)));
    const ramp = C.cWhy[ci] === "V outside spans" ? spanRamp(mt.dA - C.armL[aiA], mt.dB - C.armL[aiB], h) : 1;
    const gA = Math.min(wA, 1 - rCap) * ramp; const gB = Math.min(wB, 1 - rCap) * ramp;
    const ea = new Float64Array(2); const eb = new Float64Array(2);
    const sEa = eOf(aiA, sideA, mt.sA, gA, ea);
    const sEb = eOf(aiB, sideB, mt.sB, gB, eb);
    // K1240 S3f r4: w = 0 is the meet itself (the builder's cornerFallback
    // says why): each station carries the meet's offset from the border's
    // point at the meet's s, fading out as the station runs on (1 - g).
    { const a0 = new Float64Array(2); const b0 = new Float64Array(2);
      eOf(aiA, sideA, mt.sA, 0, a0); eOf(aiB, sideB, mt.sB, 0, b0);
      ea[0] += (mt.x - a0[0]) * (1 - gA); ea[1] += (mt.y - a0[1]) * (1 - gA);
      eb[0] += (mt.x - b0[0]) * (1 - gB); eb[1] += (mt.y - b0[1]) * (1 - gB); }
    C.cVx[ci] = mt.x; C.cVy[ci] = mt.y; C.cQx[ci] = mt.x; C.cQy[ci] = mt.y; C.cR[ci] = 0; C.cMeet[ci] = 1;
    C.cTax[ci] = ea[0]; C.cTay[ci] = ea[1]; C.cSA[ci] = sEa; C.cDA[ci] = mt.dA * (1 - gA);
    C.cTbx[ci] = eb[0]; C.cTby[ci] = eb[1]; C.cSB[ci] = sEb; C.cDB[ci] = mt.dB * (1 - gB);
    C.cRefA[ci] = addPointAtC(C, C.armObj[aiA].pi, sideA, ea[0], ea[1], sEa);
    C.cRefB[ci] = addPointAtC(C, C.armObj[aiB].pi, sideB, eb[0], eb[1], sEb);
    C.armNextRef[aiA] = C.cRefA[ci]; C.armNextSide[aiA] = sideA;
    C.armPrevRef[aiB] = C.cRefB[ci]; C.armPrevSide[aiB] = sideB;
    return;
  }
  // No meet: V at the junction, tangent points at the roots.
  let mx = C.armUx[aiA] + C.armUx[aiB]; let my = C.armUy[aiA] + C.armUy[aiB];
  const ml = Math.sqrt(mx * mx + my * my);
  if (ml < 1e-9 || th > Math.PI) { const ma = Math.atan2(C.armUy[aiA], C.armUx[aiA]) + th / 2; mx = Math.cos(ma); my = Math.sin(ma); }
  else { mx /= ml; my /= ml; }
  const Vx = j.c[0] + mx * h; const Vy = j.c[1] + my * h;
  C.cVx[ci] = Vx; C.cVy[ci] = Vy; C.cQx[ci] = Vx; C.cQy[ci] = Vy; C.cR[ci] = 0; C.cMeet[ci] = 0;
  const pa = new Float64Array(2); const pb = new Float64Array(2);
  // K1283 s8: each station where its border comes out of the other arm's fill (buriedReach).
  const dOf = (ai: number, side: number, aiO: number): number => {
    const pi = C.armObj[ai].pi; const p = C.polys[pi]; const sR = C.armSR[ai]; const dir = C.armDir[ai];
    if (!NOMEET_BURY || C.armObj[aiO].pi === pi) return 0;
    const sAt = (d: number): number => (p.closed ? normS(p, sR + dir * d) : sR + dir * d);
    return buriedReach(p, sAt, C.armL[ai], C.polys[C.armObj[aiO].pi], C.armSR[aiO], h, C.W, (dd, out) => borderPointAtBase(C, pi, side, sAt(dd), out));
  };
  const sOf = (ai: number, d: number): number => {
    const p = C.polys[C.armObj[ai].pi]; const s = C.armSR[ai] + C.armDir[ai] * d;
    return d > 0 ? (p.closed ? normS(p, s) : s) : C.armSR[ai];
  };
  const dTa = dOf(aiA, sideA, aiB); const dTb = dOf(aiB, sideB, aiA);
  const sTa = sOf(aiA, dTa); const sTb = sOf(aiB, dTb);
  borderPointAtBase(C, C.armObj[aiA].pi, sideA, sTa, pa);
  borderPointAtBase(C, C.armObj[aiB].pi, sideB, sTb, pb);
  C.cTax[ci] = pa[0]; C.cTay[ci] = pa[1]; C.cTbx[ci] = pb[0]; C.cTby[ci] = pb[1];
  C.cSA[ci] = sTa; C.cSB[ci] = sTb; C.cDA[ci] = dTa; C.cDB[ci] = dTb;
  C.cRefA[ci] = addPointAtC(C, C.armObj[aiA].pi, sideA, pa[0], pa[1], sTa);
  C.cRefB[ci] = addPointAtC(C, C.armObj[aiB].pi, sideB, pb[0], pb[1], sTb);
  C.armNextRef[aiA] = C.cRefA[ci]; C.armNextSide[aiA] = sideA;
  C.armPrevRef[aiB] = C.cRefB[ci]; C.armPrevSide[aiB] = sideB;
}

// K1314 s3: a through pass's corner that cannot round (the bend's outer,
// reflex side, or a failed solve) is dead: no refs, so the stations put
// both arms' borders at their shared root point (stationsPhaseC), as when
// a through pass had no corner. Its fields sit at the junction centre,
// read by nothing while it is not ok.
function cornerDeadThruC(C: FCache, ci: number, aiA: number, aiB: number, jx: number, jy: number, why: string): void {
  C.cOk[ci] = 0; C.cMeet[ci] = 0; C.cR[ci] = 0; C.cWhy[ci] = `through: ${why}`;
  C.cVx[ci] = jx; C.cVy[ci] = jy; C.cQx[ci] = jx; C.cQy[ci] = jy;
  C.cTax[ci] = jx; C.cTay[ci] = jy; C.cTbx[ci] = jx; C.cTby[ci] = jy;
  C.cSA[ci] = C.armSR[aiA]; C.cSB[ci] = C.armSR[aiB]; C.cDA[ci] = 0; C.cDB[ci] = 0;
  C.cRefA[ci] = -1; C.cRefB[ci] = -1;
  C.wValid[ci] = 0;
}

// K1314 s3: the room a through bend's arc has along arm ai: the distance to the nearest root of
// another junction on its chain (wrapping a closed chain; Infinity with none), less the farthest
// tangent foot of that junction's corners on its arm back along the same stretch (corners solved
// this frame only: armCA/armCB map an arm to the corner it is aArm/bArm of, done marks them).
// K1314 s4: the corner whose foot set thruRoomC's room (-1: none) and which of its ends lies on the
// chain (0: its ta, on its A arm; 1: its tb).
let thruNbCi = -1; let thruNbEnd = 0;
const thruX = { x: 0, y: 0 };
// K1314 s4: this frame's joins, as (through corner, its joined end 0 A / 1 B, neighbour corner) triples,
// and joinEnd[ci * 2 + end] = 1 for every arc end that sits on a join's X (both corners).
const thruJoins: number[] = [];
let thruJoinEnd = new Uint8Array(0);
// K1314 s4: where circle (ax, ay, ar) crosses circle (bx, by, br), the crossing nearer (px, py), into
// thruX; false when the circles do not cross.
function circleCrossC(ax: number, ay: number, ar: number, bx: number, by: number, br: number, px: number, py: number): boolean {
  const dx = bx - ax; const dy = by - ay; const d = Math.hypot(dx, dy);
  if (!(d > 1e-12) || d > ar + br || d < Math.abs(ar - br)) return false;
  const a = (ar * ar - br * br + d * d) / (2 * d); const hh = Math.sqrt(Math.max(0, ar * ar - a * a));
  const mx = ax + (a * dx) / d; const my = ay + (a * dy) / d;
  const x1 = mx - (hh * dy) / d; const y1 = my + (hh * dx) / d; const x2 = mx + (hh * dy) / d; const y2 = my - (hh * dx) / d;
  if ((x1 - px) * (x1 - px) + (y1 - py) * (y1 - py) <= (x2 - px) * (x2 - px) + (y2 - py) * (y2 - py)) { thruX.x = x1; thruX.y = y1; } else { thruX.x = x2; thruX.y = y2; }
  return true;
}
// K1314 s4: whether (x, y) lies on the shorter arc about (qx, qy) from (ax, ay) to (bx, by).
function onArcC(qx: number, qy: number, ax: number, ay: number, bx: number, by: number, x: number, y: number): boolean {
  const a0 = Math.atan2(ay - qy, ax - qx);
  let da = Math.atan2(by - qy, bx - qx) - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  let t = Math.atan2(y - qy, x - qx) - a0; while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI;
  return da >= 0 ? t >= -1e-9 && t <= da + 1e-9 : t <= 1e-9 && t >= da - 1e-9;
}
// K1314 s4: the largest radius at most r whose two tangent feet lie within roomA / roomB of their arms'
// roots, by bisection along the growth's closed-form path (cfAt); leaves kfCst / kfQa / kfQb at it.
// -1 when even V's feet (r 0) do not fit.
function thruFitC(C: FCache, aiA: number, aiB: number, r: number, roomA: number, roomB: number): number {
  const h = C.h;
  const fits = (): boolean => (kfQa.u - C.armSR[aiA]) * C.armDir[aiA] <= roomA && (kfQb.u - C.armSR[aiB]) * C.armDir[aiB] <= roomB;
  cfAt(C, h); if (!fits()) return -1;
  let lo = 0; let hi = r;
  for (let it = 0; it < 32 && hi - lo > 1e-7 * h; it++) { const m = 0.5 * (lo + hi); cfAt(C, h + m); if (fits()) lo = m; else hi = m; }
  cfAt(C, h + lo);
  return lo;
}
function thruRoomC(C: FCache, ai: number, ji: number, armCA: Int32Array, armCB: Int32Array, done: Uint8Array, side: number): number {
  const a = C.armObj[ai]; const p = C.polys[a.pi];
  const s0 = C.armSR[ai]; const dir = C.armDir[ai];
  let best = Infinity; let nb = -1; thruNbCi = -1; thruNbEnd = 0;
  for (const k of C.armsOfChain[a.pi]) {
    if (C.armObj[k].ji === ji) continue;
    let d = (C.armSR[k] - s0) * dir;
    if (p.closed && p.len > 0) d = ((d % p.len) + p.len) % p.len;
    if (d > 0 && (d < best - 1e-12 || (d < best + 1e-12 && C.armDir[k] === -dir))) { best = d; nb = k; }
  }
  if (nb < 0) return best;
  let foot = 0;
  const ca = armCA[nb]; const cb = armCB[nb];
  // K1314 s4: only the corner on the arc's side of the chain (a corner's side on its A arm is that
  // arm's dir, on its B arm minus it); the other side's corner never meets the arc.
  if (ca >= 0 && done[ca] && C.cOk[ca] && C.armDir[nb] === side && C.cDA[ca] > foot) { foot = C.cDA[ca]; thruNbCi = ca; thruNbEnd = 0; }
  if (cb >= 0 && done[cb] && C.cOk[cb] && -C.armDir[nb] === side && C.cDB[cb] > foot) { foot = C.cDB[cb]; thruNbCi = cb; thruNbEnd = 1; }
  return best - foot;
}

function cornersPhaseC(C: FCache, st: DiagramStructure, scene: SceneIn): void {
  const h = C.h;
  C.armNextRef.fill(-1); C.armPrevRef.fill(-1);
  // K1314 s3: every other corner first, then the through bends (thruRoomC reads their feet).
  const nArm = C.armObj.length;
  const armCA = new Int32Array(nArm).fill(-1); const armCB = new Int32Array(nArm).fill(-1);
  for (let ci = 0; ci < st.corners.length; ci++) { armCA[st.corners[ci].aArm] = ci; armCB[st.corners[ci].bArm] = ci; }
  const done = new Uint8Array(st.corners.length);
  thruJoins.length = 0;
  if (thruJoinEnd.length < 2 * st.corners.length) thruJoinEnd = new Uint8Array(2 * st.corners.length); else thruJoinEnd.fill(0);
  for (let pass = 0; pass < 2; pass++)
  for (let ci = 0; ci < st.corners.length; ci++) {
    if ((st.corners[ci].thru === 1) !== (pass === 1)) continue;
    done[ci] = 1;
    const dc = st.corners[ci];
    const aiA = dc.aArm; const aiB = dc.bArm;
    const A = C.armObj[aiA]; const B = C.armObj[aiB];
    const ji = dc.ji;
    const j = scene.junctions[ji];
    const style = dc.style;
    let th = C.armAng[aiB] - C.armAng[aiA];
    th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    C.cTheta[ci] = th;
    C.cWhy[ci] = undefined;
    C.cMeet[ci] = 0;
    const sideA = C.armDir[aiA];
    const sideB = -C.armDir[aiB];
    if (!j) { C.cOk[ci] = 0; C.cWhy[ci] = "arm span 0"; continue; }
    const thru = dc.thru === 1;
    if (kfCI && !thru && cornerHitC(C, kfCI, ci, aiA, aiB, sideA, sideB, j.c[0], j.c[1])) continue;
    if (thru && !(C.armL[aiA] > 1e-9 && C.armL[aiB] > 1e-9 && th < Math.PI)) {
      cornerDeadThruC(C, ci, aiA, aiB, j.c[0], j.c[1], th < Math.PI ? "arm span 0" : "reflex");
      continue;
    }
    if (!(C.armL[aiA] > 1e-9 && C.armL[aiB] > 1e-9)) {
      C.cWhy[ci] = "arm span 0";
      cornerFallbackC(C, st, scene, ci, aiA, aiB, sideA, sideB, th);
      continue;
    }
    if (th > Math.PI) {
      C.cWhy[ci] = "reflex";
      cornerFallbackC(C, st, scene, ci, aiA, aiB, sideA, sideB, th);
      continue;
    }
    const thC = th;
    let bx = C.armUx[aiA] + C.armUx[aiB]; let by = C.armUy[aiA] + C.armUy[aiB];
    const bl = Math.sqrt(bx * bx + by * by) || 1; bx /= bl; by /= bl;
    const sn = Math.sin(thC / 2) || 1;
    // Solve + the builder's acceptance checks. One cold solve from
    // the builder's guess: history must not pick a different root.
    const trySolve = (warmCi: number, sx = j.c[0] + (bx * h) / sn, sy = j.c[1] + (by * h) / sn): number => {
      const okV = solveVC(C, warmCi, aiA, aiB, h, sx, sy, h / Math.max(Math.tan(thC / 2), 1e-6), kfFa, kfFb, j.c[0], j.c[1]);
      if (!okV) return 1;
      const dVa = armDistC(C, aiA, kfFa.s); const dVb = armDistC(C, aiB, kfFb.s);
      const tol = 1e-9 * h;
      if (!(dVa > tol && dVa < C.armL[aiA] - tol && dVb > tol && dVb < C.armL[aiB] - tol)) return 2;
      const cross = C.armUx[aiA] * C.armUy[aiB] - C.armUy[aiA] * C.armUx[aiB];
      const crossA = C.armUx[aiA] * (kfSv.y - j.c[1]) - C.armUy[aiA] * (kfSv.x - j.c[0]);
      const crossB = C.armUx[aiB] * (kfSv.y - j.c[1]) - C.armUy[aiB] * (kfSv.x - j.c[0]);
      const sgn = Math.sign(cross) || 1;
      if (!(crossA * sgn > 0 && crossB * sgn < 0)) return 3;
      return 0;
    };
    let solveCode = trySolve(ci);
    // K1314 s4: a corner's V is its borders' FIRST meet from the junction. Where two arms part and
    // meet again around an eye (muse_hash j155/j156's lens, c61's loop past j73), the cold guess
    // lands in the eye's paper and Newton can take the far meet, by the other junction; that
    // corner's arc and its junction's polygon then span the eye and cover its paper (form B draws
    // it open, ringed by ink). A V past the guess is solved again from halfway back to the
    // junction, and that root is kept when it passes the same checks with both feet nearer
    // (3 corners of the 12 census scenes, all muse_hash: j73's 222, j155's 471, j156's 475).
    if (solveCode === 0 && Math.hypot(kfSv.x - j.c[0], kfSv.y - j.c[1]) > h / sn) {
      const vx0 = kfSv.x; const vy0 = kfSv.y; copyFoot(nmFa, kfFa); copyFoot(nmFb, kfFb);
      const dVa0 = armDistC(C, aiA, kfFa.s); const dVb0 = armDistC(C, aiB, kfFb.s);
      const code = trySolve(ci, 0.5 * (j.c[0] + vx0), 0.5 * (j.c[1] + vy0));
      if (!(code === 0 && armDistC(C, aiA, kfFa.s) < dVa0 - 1e-6 * h && armDistC(C, aiB, kfFb.s) < dVb0 - 1e-6 * h)) {
        kfSv.x = vx0; kfSv.y = vy0; copyFoot(kfFa, nmFa); copyFoot(kfFb, nmFb);
      }
    }
    if (solveCode !== 0) {
      C.cWhy[ci] = solveCode === 1 ? "no V" : solveCode === 2 ? "V outside spans" : "V outside wedge";
      if (thru) { cornerDeadThruC(C, ci, aiA, aiB, j.c[0], j.c[1], C.cWhy[ci] as string); continue; }
      cornerFallbackC(C, st, scene, ci, aiA, aiB, sideA, sideB, th);
      continue;
    }
    const Vx = kfSv.x; const Vy = kfSv.y;
    const dVa = armDistC(C, aiA, kfFa.s); const dVb = armDistC(C, aiB, kfFb.s);
    C.cOk[ci] = 1;
    const t2 = Math.tan(thC / 2);
    const r0 = style * (C.cr / 3) * Math.min(2 * h, 1.5 * h * t2);
    kfCst.A = A; kfCst.B = B; kfCst.aiA = aiA; kfCst.aiB = aiB;
    kfCst.Vx = Vx; kfCst.Vy = Vy;
    kfCst.r0 = r0;
    kfCst.rbEff = Math.max(0.5 * h * rootTipScale(thC), 1e-9 * h);
    kfCst.denV = 1 + ((Vx - kfFa.x) * (Vx - kfFb.x) + (Vy - kfFa.y) * (Vy - kfFb.y)) / ((kfFa.d || 1) * (kfFb.d || 1));
    kfCst.wCacheA = C.walkA[ci]; kfCst.wCacheB = C.walkB[ci];
    // Margin walk caches reset per corner per frame: they still
    // memoize this corner's growth steps within the frame, but no
    // earlier frame's bounds may limit this frame's margin search.
    kfCst.wCacheA.valid = false; kfCst.wCacheA.oLo = NaN; kfCst.wCacheA.oHi = NaN;
    kfCst.wCacheB.valid = false; kfCst.wCacheB.oLo = NaN; kfCst.wCacheB.oHi = NaN;
    kfCst.rhoCur = h;
    let r = growCFC(C, ci);
    C.cVx[ci] = Vx; C.cVy[ci] = Vy;
    C.cQx[ci] = kfCst.qx; C.cQy[ci] = kfCst.qy;
    C.cR[ci] = r;
    let tax = Vx; let tay = Vy; let tbx = Vx; let tby = Vy;
    let sA = kfFa.s; let sB = kfFb.s; let dA = dVa; let dB = dVb;
    let rax = NaN; let ray = NaN; let rbx = NaN; let rby = NaN; // K1314 s4: a joined end's border cut
    if (r > 1e-9) {
      // K1247 s16: the arc's ends sit on the centre's feet, blended across
      // a concave vertex's bisector (blendFootC). The nearest foot jumps
      // there (j87 corner 182: its A end slid 1.2 px along s under 0.02 px
      // of input, def f23); outside the band the feet are the nearest.
      copyFoot(kfEa, kfQa);
      copyFoot(kfEb, kfQb);
      tax = kfEa.x + (h * (kfCst.qx - kfEa.x)) / kfEa.d; tay = kfEa.y + (h * (kfCst.qy - kfEa.y)) / kfEa.d;
      tbx = kfEb.x + (h * (kfCst.qx - kfEb.x)) / kfEb.d; tby = kfEb.y + (h * (kfCst.qy - kfEb.y)) / kfEb.d;
      sA = kfEa.s; sB = kfEb.s;
      dA = (kfEa.u - C.armSR[aiA]) * C.armDir[aiA]; dB = (kfEb.u - C.armSR[aiB]) * C.armDir[aiB];
      // K1314 s3: a through bend's arc must not overlap the next junction's corner along its chain
      // (thruRoomC): an arc reaching into that junction's corners left a border spur and its fill
      // unbordered (muse_hash j135's r 3.2 h arc at j20). K1314 s4: the arc shrinks until both feet
      // fit (thruFitC), so it ends where that corner's foot begins; the bend stays sharp only when
      // even r 0 does not fit or the growth had no closed-form path to shrink along.
      if (thru) {
        const roomA = thruRoomC(C, aiA, ji, armCA, armCB, done, sideA); const nA = thruNbCi; const eA = thruNbEnd;
        const roomB = thruRoomC(C, aiB, ji, armCA, armCB, done, sideB); const nB = thruNbCi; const eB = thruNbEnd;
        const overA = dA > roomA; const overB = dB > roomB;
        // K1314 s4: an end past the neighbour's foot JOINS that neighbour's arc where the two circles
        // cross (X): this arc ends at X, the neighbour's starts there, and the border cut moves to
        // the neighbour's foot (the border between the two feet lies under both fills). Paper's edge
        // is the outer of the two arcs, as the fillet reference draws it.
        let joinOk = (overA || overB) && nA !== nB;
        let jxA = NaN; let jyA = NaN; let jxB = NaN; let jyB = NaN;
        if (joinOk && overA) {
          if (nA >= 0 && C.cR[nA] > 1e-9 && circleCrossC(kfCst.qx, kfCst.qy, r, C.cQx[nA], C.cQy[nA], C.cR[nA], eA === 0 ? C.cTax[nA] : C.cTbx[nA], eA === 0 ? C.cTay[nA] : C.cTby[nA]) &&
            onArcC(kfCst.qx, kfCst.qy, tax, tay, tbx, tby, thruX.x, thruX.y) && onArcC(C.cQx[nA], C.cQy[nA], C.cTax[nA], C.cTay[nA], C.cTbx[nA], C.cTby[nA], thruX.x, thruX.y)) { jxA = thruX.x; jyA = thruX.y; } else joinOk = false;
        }
        if (joinOk && overB) {
          if (nB >= 0 && C.cR[nB] > 1e-9 && circleCrossC(kfCst.qx, kfCst.qy, r, C.cQx[nB], C.cQy[nB], C.cR[nB], eB === 0 ? C.cTax[nB] : C.cTbx[nB], eB === 0 ? C.cTay[nB] : C.cTby[nB]) &&
            onArcC(kfCst.qx, kfCst.qy, tax, tay, tbx, tby, thruX.x, thruX.y) && onArcC(C.cQx[nB], C.cQy[nB], C.cTax[nB], C.cTay[nB], C.cTbx[nB], C.cTby[nB], thruX.x, thruX.y)) { jxB = thruX.x; jyB = thruX.y; } else joinOk = false;
        }
        if (joinOk) {
          if (overA) {
            rax = eA === 0 ? C.cTax[nA] : C.cTbx[nA]; ray = eA === 0 ? C.cTay[nA] : C.cTby[nA]; sA = eA === 0 ? C.cSA[nA] : C.cSB[nA]; dA = roomA;
            tax = jxA; tay = jyA;
            if (eA === 0) { C.cTax[nA] = jxA; C.cTay[nA] = jyA; } else { C.cTbx[nA] = jxA; C.cTby[nA] = jyA; }
            thruJoins.push(ci, 0, nA); thruJoinEnd[2 * ci] = 1; thruJoinEnd[2 * nA + eA] = 1;
          }
          if (overB) {
            rbx = eB === 0 ? C.cTax[nB] : C.cTbx[nB]; rby = eB === 0 ? C.cTay[nB] : C.cTby[nB]; sB = eB === 0 ? C.cSA[nB] : C.cSB[nB]; dB = roomB;
            tbx = jxB; tby = jyB;
            if (eB === 0) { C.cTax[nB] = jxB; C.cTay[nB] = jyB; } else { C.cTbx[nB] = jxB; C.cTby[nB] = jyB; }
            thruJoins.push(ci, 1, nB); thruJoinEnd[2 * ci + 1] = 1; thruJoinEnd[2 * nB + eB] = 1;
          }
        } else if (overA || overB) {
          const rFit = growCfOk ? thruFitC(C, aiA, aiB, r, roomA, roomB) : -1;
          if (!(rFit > 1e-9)) {
            cornerDeadThruC(C, ci, aiA, aiB, j.c[0], j.c[1], "past a junction");
            continue;
          }
          r = rFit; C.cQx[ci] = kfCst.qx; C.cQy[ci] = kfCst.qy; C.cR[ci] = r;
          copyFoot(kfEa, kfQa); copyFoot(kfEb, kfQb);
          tax = kfEa.x + (h * (kfCst.qx - kfEa.x)) / kfEa.d; tay = kfEa.y + (h * (kfCst.qy - kfEa.y)) / kfEa.d;
          tbx = kfEb.x + (h * (kfCst.qx - kfEb.x)) / kfEb.d; tby = kfEb.y + (h * (kfCst.qy - kfEb.y)) / kfEb.d;
          sA = kfEa.s; sB = kfEb.s;
          dA = (kfEa.u - C.armSR[aiA]) * C.armDir[aiA]; dB = (kfEb.u - C.armSR[aiB]) * C.armDir[aiB];
        }
      }
    }
    C.cTax[ci] = tax; C.cTay[ci] = tay; C.cTbx[ci] = tbx; C.cTby[ci] = tby;
    C.cSA[ci] = sA; C.cSB[ci] = sB; C.cDA[ci] = dA; C.cDB[ci] = dB;
    if (r > 1e-9) {
      C.cRefA[ci] = Number.isNaN(rax) ? addPointAtC(C, A.pi, sideA, tax, tay, sA) : addPointAtC(C, A.pi, sideA, rax, ray, sA);
      C.cRefB[ci] = Number.isNaN(rbx) ? addPointAtC(C, B.pi, sideB, tbx, tby, sB) : addPointAtC(C, B.pi, sideB, rbx, rby, sB);
    } else {
      C.cRefA[ci] = addPointAtC(C, A.pi, sideA, Vx, Vy, sA);
      C.cRefB[ci] = addPointAtC(C, B.pi, sideB, Vx, Vy, sB);
    }
    C.armNextRef[aiA] = C.cRefA[ci]; C.armNextSide[aiA] = sideA;
    C.armPrevRef[aiB] = C.cRefB[ci]; C.armPrevSide[aiB] = sideB;
    // Warm state for the next frame.
    C.wValid[ci] = 1;
    C.wVx[ci] = Vx; C.wVy[ci] = Vy;
    C.wFaS[ci] = kfFa.s; C.wFbS[ci] = kfFb.s; C.wFaK[ci] = kfFa.k; C.wFbK[ci] = kfFb.k;
    C.wQx[ci] = kfCst.qx; C.wQy[ci] = kfCst.qy; C.wR[ci] = r;
    if (kfCI && !thru) cornerStoreC(C, kfCI, ci, aiA, aiB, j.c[0], j.c[1]);
    void A; void B;
  }
}


// --- crossings ---------------------------------------------------------------
const candUSide = new Int32Array(4096); const candOSide = new Int32Array(4096);
const candX = new Float64Array(4096); const candY = new Float64Array(4096); const candDC = new Float64Array(4096);
const candUS = new Float64Array(4096); const candOS = new Float64Array(4096);
const candUSeg = new Int32Array(4096); const candOSeg = new Int32Array(4096);
const candT = new Float64Array(4096); const candU = new Float64Array(4096);
const candSynth = new Uint8Array(4096); const candFrom = new Int32Array(4096);
let candN = 0;
const candURef = new Int32Array(4096); const candORef = new Int32Array(4096);

function sDistToIntervalC(C: FCache, pi: number, sC: number, ls: number, hs: number): number {
  const p = C.polys[pi];
  if (!p.closed) {
    if (sC >= ls && sC <= hs) return 0;
    return Math.min(Math.abs(sC - ls), Math.abs(sC - hs));
  }
  let c = sC;
  while (c < ls) c += p.len;
  while (c > ls + p.len) c -= p.len;
  if (c >= ls && c <= hs) return 0;
  return Math.min(Math.abs(c - ls), Math.abs(c - hs), Math.abs(dS(p, sC, ls)), Math.abs(dS(p, sC, hs)));
}
// Fills out[0..count) and returns count; out never shrinks (K1247 s3: a
// length = 0 reset drops a JS array's backing store, so each call regrew it).
function segsNearC(C: FCache, pi: number, side: number, sC: number, R: number, out: number[]): number {
  const B = C.bords[pi * 2 + (side === 1 ? 0 : 1)];
  const p = C.polys[pi];
  const n = B.nb;
  let cnt = 0;
  if (n < 2) return 0;
  // K1247 s2: a stamp array for the Set, no closures, and the interval
  // distance's cheap terms first (min of four <= R iff any term is).
  if (snStamp.length < n) snStamp = new Int32Array(n * 2);
  if (++snGen > 0x3fffffff) { snStamp.fill(0); snGen = 1; }
  const gen = snGen; const stamp = snStamp;
  const bs = B.bs;
  const closed = p.closed; const len = p.len;
  const nSh = closed ? 3 : 1;
  for (let si = 0; si < nSh; si++) {
    const sh = closed ? (si === 0 ? -len : si === 1 ? 0 : len) : 0;
    const loS = sC - R + sh; const hiS = sC + R + sh;
    let lo = 0; let hi = n;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (bs[mid] < loS) lo = mid + 1; else hi = mid; }
    const start = Math.max(0, lo - 1);
    for (let i = start; i + 1 < n && bs[i] <= hiS; i++) {
      const ls = bs[i]; const hs = bs[i + 1];
      if (!closed) {
        if (!(sC >= ls && sC <= hs) && Math.min(Math.abs(sC - ls), Math.abs(sC - hs)) > R) continue;
      } else {
        let c = sC;
        while (c < ls) c += len;
        while (c > ls + len) c -= len;
        if (!(c >= ls && c <= hs)) {
          const m = Math.min(Math.abs(c - ls), Math.abs(c - hs));
          if (m > R && Math.min(m, Math.abs(dS(p, sC, ls)), Math.abs(dS(p, sC, hs))) > R) continue;
        }
      }
      const idx = closed ? i % Math.max(1, n - 1) : i;
      if (stamp[idx] === gen) continue;
      stamp[idx] = gen;
      if (cnt < out.length) out[cnt] = idx; else out.push(idx);
      cnt++;
    }
  }
  return cnt;
}
let snStamp = new Int32Array(1024);
let snGen = 0;
function pushCand(uSide: number, oSide: number, x: number, y: number, dc: number, uS: number, oS: number, uSeg: number, oSeg: number, synth: number, from: number, ht = 0, hu = 0): void {
  if (candN >= candUSide.length) throw new Error("cand overflow");
  candUSide[candN] = uSide; candOSide[candN] = oSide;
  candX[candN] = x; candY[candN] = y; candDC[candN] = dc;
  candUS[candN] = uS; candOS[candN] = oS;
  candUSeg[candN] = uSeg; candOSeg[candN] = oSeg;
  candSynth[candN] = synth; candFrom[candN] = from; candT[candN] = ht; candU[candN] = hu;
  candN++;
}

// K1247 s2: a segment list's bboxes, per entry and per block of XBLK
// consecutive entries (the crossing and eye searches' exact prune).
const XBLK = 8;
interface SegBoxes { n: number; nb: number; x0: Float64Array; x1: Float64Array; y0: Float64Array; y1: Float64Array; bx0: Float64Array; bx1: Float64Array; by0: Float64Array; by1: Float64Array }
function mkSegBoxes(): SegBoxes {
  return { n: 0, nb: 0, x0: new Float64Array(256), x1: new Float64Array(256), y0: new Float64Array(256), y1: new Float64Array(256), bx0: new Float64Array(64), bx1: new Float64Array(64), by0: new Float64Array(64), by1: new Float64Array(64) };
}
function fillSegBoxes(sb: SegBoxes, B: FBord, list: ArrayLike<number>, n = list.length): void {
  if (sb.x0.length < n) { const c = n * 2; sb.x0 = new Float64Array(c); sb.x1 = new Float64Array(c); sb.y0 = new Float64Array(c); sb.y1 = new Float64Array(c); }
  const nb = Math.ceil(n / XBLK);
  if (sb.bx0.length < nb) { const c = nb * 2; sb.bx0 = new Float64Array(c); sb.bx1 = new Float64Array(c); sb.by0 = new Float64Array(c); sb.by1 = new Float64Array(c); }
  const X = B.bx; const Y = B.by;
  for (let b = 0; b < nb; b++) {
    let bx0 = Infinity; let bx1 = -Infinity; let by0 = Infinity; let by1 = -Infinity;
    const kEnd = Math.min(n, (b + 1) * XBLK);
    for (let k = b * XBLK; k < kEnd; k++) {
      const i = list[k];
      const ax = X[i]; const ay = Y[i]; const cx = X[i + 1]; const cy = Y[i + 1];
      const x0 = ax < cx ? ax : cx; const x1 = ax < cx ? cx : ax;
      const y0 = ay < cy ? ay : cy; const y1 = ay < cy ? cy : ay;
      sb.x0[k] = x0; sb.x1[k] = x1; sb.y0[k] = y0; sb.y1[k] = y1;
      if (x0 < bx0) bx0 = x0; if (x1 > bx1) bx1 = x1; if (y0 < by0) by0 = y0; if (y1 > by1) by1 = y1;
    }
    sb.bx0[b] = bx0; sb.bx1[b] = bx1; sb.by0[b] = by0; sb.by1[b] = by1;
  }
  sb.n = n; sb.nb = nb;
}
const xsU = [mkSegBoxes(), mkSegBoxes()];
const xsO = [mkSegBoxes(), mkSegBoxes()];
let xObl = new Int32Array(256);

const kfCuts: { xi: number; U: number; O: number; uSide: number; s: number; x: number; y: number }[] = [];
const kfDiagCross: string[] = [];
let kfTwistFlips = 0;

const xBU: FBord[] = []; const xBO: FBord[] = [];
const xUSegs: number[][] = [[], []]; const xOSegs: number[][] = [[], []];
// Their counts: [u side 1, u side -1, o side 1, o side -1].
const xSN = new Int32Array(4);
// The nearest candidate (by candDC, first on ties) among the first n with
// these sides (K1247 s3: was two closures per crossing).
function pickCand(uSide: number, oSide: number, n: number): number {
  let best = -1;
  for (let c = 0; c < n; c++) if (candUSide[c] === uSide && candOSide[c] === oSide && (best < 0 || candDC[c] < candDC[best])) best = c;
  return best;
}
function crossingsPhaseC(C: FCache, scene: SceneIn): void {
  const h = C.h;
  kfCuts.length = 0;
  kfDiagCross.length = 0;
  kfTwistFlips = 0;
  const sides = [1, -1];
  for (let xi = 0; xi < C.nX; xi++) {
    const x = scene.crossings[xi];
    if (!x) continue;
    const U = C.crossUnder[xi]; const O = C.crossOver[xi];
    const pU = C.polys[U];
    const theta = C.cpTheta[xi];
    const R = Math.min(14 * h, h / Math.max(Math.sin(theta), 0.15) + 2 * h);
    const cpX = C.cpX[xi]; const cpY = C.cpY[xi];
    const sUnder = C.cpSUnder[xi]; const sOver = C.cpSOver[xi];
    const BU = xBU; BU[0] = C.bords[U * 2]; BU[1] = C.bords[U * 2 + 1];
    const BO = xBO; BO[0] = C.bords[O * 2]; BO[1] = C.bords[O * 2 + 1];
    // Segment lists per side index (0 -> side 1, 1 -> side -1); reused
    // across crossings (segsNearC empties them first).
    const uSegs = xUSegs;
    const oSegs = xOSegs;
    {
      for (let si = 0; si < 2; si++) {
        xSN[si] = segsNearC(C, U, sides[si], sUnder, R, uSegs[si]); xSN[2 + si] = segsNearC(C, O, sides[si], sOver, R, oSegs[si]);
        fillSegBoxes(xsU[si], BU[si], uSegs[si], xSN[si]); fillSegBoxes(xsO[si], BO[si], oSegs[si], xSN[2 + si]);
      }
      candN = 0;
      // K1247 s2: the same (ui, oi, i, j) order as the all-pairs loop,
      // with pairs skipped by block bboxes first (a segment pair whose
      // bboxes overlap lies in block pairs whose bboxes overlap: exact).
      for (let ui = 0; ui < 2; ui++) for (let oi = 0; oi < 2; oi++) {
        const Bu = BU[ui]; const Bo = BO[oi];
        const ul = uSegs[ui]; const ol = oSegs[oi];
        const su = xsU[ui]; const so = xsO[oi];
        if (xObl.length < so.nb) xObl = new Int32Array(so.nb * 2);
        const obl = xObl;
        for (let ub = 0; ub < su.nb; ub++) {
          const ux0 = su.bx0[ub]; const ux1 = su.bx1[ub]; const uy0 = su.by0[ub]; const uy1 = su.by1[ub];
          let nOb = 0;
          for (let ob = 0; ob < so.nb; ob++) if (!(ux1 < so.bx0[ob] || ux0 > so.bx1[ob] || uy1 < so.by0[ob] || uy0 > so.by1[ob])) obl[nOb++] = ob;
          if (!nOb) continue;
          const kEnd = Math.min(su.n, (ub + 1) * XBLK);
          for (let k = ub * XBLK; k < kEnd; k++) {
            const i = ul[k];
            const mnx = su.x0[k]; const mxx = su.x1[k]; const mny = su.y0[k]; const mxy = su.y1[k];
            const a0x = Bu.bx[i]; const a0y = Bu.by[i]; const a1x = Bu.bx[i + 1]; const a1y = Bu.by[i + 1];
            for (let q = 0; q < nOb; q++) {
              const ob = obl[q];
              if (mxx < so.bx0[ob] || mnx > so.bx1[ob] || mxy < so.by0[ob] || mny > so.by1[ob]) continue;
              const jEnd = Math.min(so.n, (ob + 1) * XBLK);
              for (let kk = ob * XBLK; kk < jEnd; kk++) {
                if (mxx < so.x0[kk] || mnx > so.x1[kk] || mxy < so.y0[kk] || mny > so.y1[kk]) continue;
                const j = ol[kk];
                if (U === O && ui === oi && i === j) continue;
                const b0x = Bo.bx[j]; const b0y = Bo.by[j]; const b1x = Bo.bx[j + 1]; const b1y = Bo.by[j + 1];
                const hit = segInt(a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y);
                if (!hit) continue;
                const hUS = lerpS(pU, Bu.bs[i], Bu.bs[i + 1], hit.t); const hOS = lerpS(C.polys[O], Bo.bs[j], Bo.bs[j + 1], hit.u);
                if ((Math.abs(dS(pU, sUnder, hUS)) > R || Math.abs(dS(C.polys[O], sOver, hOS)) > R)) continue;
                const px = a0x + (a1x - a0x) * hit.t;
                const py = a0y + (a1y - a0y) * hit.t;
                pushCand(sides[ui], sides[oi], px, py, Math.hypot(px - cpX, py - cpY), hUS, hOS, i, j, 0, -1, hit.t, hit.u);
              }
            }
          }
        }
      }
    }
    // Full search every frame (above). The old warm path (segment windows
    // around last frame's pairs) could miss the candidate the full
    // search picks, so the frame depended on history.
    const okWarm = false;
    // Synthesized cuts for missing combos (tight twists).
    const regN = candN;
    for (let ui = 0; ui < 2; ui++) for (let oi = 0; oi < 2; oi++) {
      let has = false;
      for (let c = 0; c < regN; c++) if (candUSide[c] === sides[ui] && candOSide[c] === sides[oi]) { has = true; break; }
      if (has) continue;
      let from = -1;
      for (let c = 0; c < regN; c++) if (candUSide[c] === sides[ui] && candOSide[c] === -sides[oi] && (from < 0 || candDC[c] < candDC[from])) from = c;
      if (from < 0) continue;
      if (!okWarm) { /* uSegs/oSegs already full */ }
      else { xSN[ui] = segsNearC(C, U, sides[ui], sUnder, R, uSegs[ui]); xSN[2 + oi] = segsNearC(C, O, sides[oi], sOver, R, oSegs[oi]); }
      const Bu = BU[ui]; const Bo = BO[oi];
      let bd = Infinity; let bi = -1; let bt = 0;
      const ulS = uSegs[ui]; const olS = oSegs[oi]; const nuS = xSN[ui]; const noS = xSN[2 + oi];
      // K1247 s14 (#658): the window in sigma, from E at each chain's center (clipSegS).
      const hasSU = sigCenter(pU, Bu, sUnder, sigCU); const hasSO = sigCenter(C.polys[O], Bo, sOver, sigCO);
      for (let qa = 0; qa < nuS; qa++) for (let qb = 0; qb < noS; qb++) {
        const i = ulS[qa]; const j = olS[qb];
        if (U === O && ui === oi && i === j) continue;
        const lU = hasSU ? Math.sqrt((Bu.bx[i + 1] - Bu.bx[i]) * (Bu.bx[i + 1] - Bu.bx[i]) + (Bu.by[i + 1] - Bu.by[i]) * (Bu.by[i + 1] - Bu.by[i])) : 0;
        if (!clipSegS(pU, Bu.bs[i], Bu.bs[i + 1], sUnder, R, synthTU, lU, hasSU ? sigRel(pU, Bu, i, sUnder, sigCU) : 0)) continue;
        const lO = hasSO ? Math.sqrt((Bo.bx[j + 1] - Bo.bx[j]) * (Bo.bx[j + 1] - Bo.bx[j]) + (Bo.by[j + 1] - Bo.by[j]) * (Bo.by[j + 1] - Bo.by[j])) : 0;
        if (!clipSegS(C.polys[O], Bo.bs[j], Bo.bs[j + 1], sOver, R, synthTO, lO, hasSO ? sigRel(C.polys[O], Bo, j, sOver, sigCO) : 0)) continue;
        const u0 = synthTU[0]; const u1 = synthTU[1]; const o0 = synthTO[0]; const o1 = synthTO[1];
        const ax = Bu.bx[i]; const ay = Bu.by[i]; const ex = Bu.bx[i + 1] - ax; const ey = Bu.by[i + 1] - ay;
        const cx = Bo.bx[j]; const cy = Bo.by[j]; const fx = Bo.bx[j + 1] - cx; const fy = Bo.by[j + 1] - cy;
        const cl = segSegClosest(ax + ex * u0, ay + ey * u0, ax + ex * u1, ay + ey * u1, cx + fx * o0, cy + fy * o0, cx + fx * o1, cy + fy * o1);
        const tU = u0 + (u1 - u0) * cl[0];
        if (cl[2] < bd) { bd = cl[2]; bi = i; bt = tU; }
      }
      if (bi < 0) continue;
      const fx = Bu.bx[bi] + (Bu.bx[bi + 1] - Bu.bx[bi]) * bt;
      const fy = Bu.by[bi] + (Bu.by[bi + 1] - Bu.by[bi]) * bt;
      const fs = lerpS(pU, Bu.bs[bi], Bu.bs[bi + 1], bt);
      pushCand(sides[ui], sides[oi], fx, fy, Math.hypot(fx - cpX, fy - cpY), fs, candOS[from], bi, candOSeg[from], 1, from, bt, 0);
      kfTwistFlips++;
    }
    // Commit candidates as border inserts + refs.
    for (let c = 0; c < candN; c++) {
      if (candSynth[c]) {
        candURef[c] = addPointAtC(C, U, candUSide[c], candX[c], candY[c], candUS[c]);
        candORef[c] = candORef[candFrom[c]];
      } else {
        const ui = candUSide[c] === 1 ? 0 : 1; const oi = candOSide[c] === 1 ? 0 : 1;
        const Bu = BU[ui]; const Bo = BO[oi];
        const i = candUSeg[c]; const j = candOSeg[c];
        const ru = newRef(C, U * 2 + ui);
        C.refS0[ru] = candUS[c];
        addInsert(C, U * 2 + ui, i, candT[c], candX[c], candY[c], ru);
        const ro = newRef(C, O * 2 + oi);
        C.refS0[ro] = candOS[c];
        addInsert(C, O * 2 + oi, j, candU[c], candX[c], candY[c], ro);
        candURef[c] = ru; candORef[c] = ro;
        void Bu; void Bo;
      }
    }
    // Picks and stations.
    for (let oi = 0; oi < 2; oi++) {
      const oSide = sides[oi];
      const cl = pickCand(1, oSide, candN); const cr = pickCand(-1, oSide, candN);
      const slot = C.crossUnderSlot[xi * 2 + oi];
      C.cutPrevPick[xi * 2 + oi] = (cl >= 0 && cr >= 0) ? 1 : 0;
      if (cl < 0 || cr < 0) {
        C.stActive[slot] = 0;
        if (regN > 0) kfDiagCross.push(`crossing ${xi}: missing station side ${oSide}`);
        continue;
      }
      C.stActive[slot] = 1;
      C.stLeft[slot] = candURef[cl]; C.stRight[slot] = candURef[cr];
      const ls = candUS[cl]; const rs = candUS[cr];
      C.stCS[slot] = normS(pU, ls + dS(pU, ls, rs) / 2);
      kfCuts.push({ xi, U, O, uSide: candUSide[cl], s: candUS[cl], x: candX[cl], y: candY[cl] });
      kfCuts.push({ xi, U, O, uSide: candUSide[cr], s: candUS[cr], x: candX[cr], y: candY[cr] });
    }
    for (let ui = 0; ui < 2; ui++) {
      const uSide = sides[ui];
      const pl = pickCand(uSide, 1, regN); const pr = pickCand(uSide, -1, regN);
      const slot = C.crossOverSlot[xi * 2 + ui];
      if (pl < 0 || pr < 0) { C.stActive[slot] = 0; continue; }
      const pO = C.polys[O];
      C.stActive[slot] = 1;
      C.stLeft[slot] = candORef[pl]; C.stRight[slot] = candORef[pr];
      const ls = candOS[pl]; const rs = candOS[pr];
      C.stCS[slot] = normS(pO, ls + dS(pO, ls, rs) / 2);
    }
  }
}

// --- eyes ----------------------------------------------------------------------
let kfEyeCount = 0; let kfEyeCutCount = 0; let kfTieCutCount = 0;
function inArcE(p: Poly, s: number, s0: number, gap: number): boolean {
  let d = s - s0;
  if (p.closed) d = ((d % p.len) + p.len) % p.len;
  return d >= -1e-9 && d <= gap + 1e-9;
}
function segInArcE(C: FCache, p: Poly, ls: number, hs: number, s0: number, gap: number): boolean {
  return inArcE(p, ls, s0, gap) || inArcE(p, hs, s0, gap) || (sDistToIntervalC(C, p.id, s0, ls, hs) === 0 && gap >= 0) || Math.abs(dS(p, s0 + gap / 2, ls + (hs - ls) / 2)) <= gap / 2 + Math.abs(hs - ls) / 2;
}
function lbBs(bs: Float64Array, n: number, target: number): number {
  let lo = 0; let hi = n;
  while (lo < hi) { const m = (lo + hi) >> 1; if (bs[m] < target) lo = m + 1; else hi = m; }
  return lo;
}
// Fills out[0..count) and returns count; out never shrinks (as segsNearC).
function sliceSegsE(C: FCache, Bd: FBord, p: Poly, s0: number, gap: number, out: number[]): number {
  let cnt = 0;
  const n = Bd.nb;
  if (n < 2) return 0;
  if (snStamp.length < n) snStamp = new Int32Array(n * 2);
  if (++snGen > 0x3fffffff) { snStamp.fill(0); snGen = 1; }
  const gen = snGen; const stamp = snStamp; const bs = Bd.bs;
  const nSh = p.closed ? 3 : 1;
  for (let si = 0; si < nSh; si++) {
    const sh = p.closed ? (si === 0 ? -p.len : si === 1 ? 0 : p.len) : 0;
    const a = Math.max(0, lbBs(bs, n, s0 - 1e-6 + sh) - 3);
    const b = Math.min(n - 2, lbBs(bs, n, s0 + gap + 1e-6 + sh) + 3);
    for (let i = a; i <= b; i++) { if (stamp[i] !== gen) { stamp[i] = gen; if (segInArcE(C, p, bs[i], bs[i + 1], s0, gap)) { if (cnt < out.length) out[cnt] = i; else out.push(i); cnt++; } } }
  }
  return cnt;
}
const eySegA: number[][] = [[], []];
const eySegB: number[][] = [[], []];
const eyNA = new Int32Array(2); const eyNB = new Int32Array(2);
let eyCx0 = new Float64Array(256); let eyCx1 = new Float64Array(256); let eyCy0 = new Float64Array(256); let eyCy1 = new Float64Array(256);
let eyBx0 = new Float64Array(64); let eyBx1 = new Float64Array(64); let eyBy0 = new Float64Array(64); let eyBy1 = new Float64Array(64);
function eyeComboC(C: FCache, bA: number, bB: number, segsA: number[], segsB: number[], nA: number, nB: number, cellE: number, skipSame: boolean): number {
  const BA = C.bords[bA]; const BB = C.bords[bB];
  if (eyCx0.length < nB) { const c = nB * 2; eyCx0 = new Float64Array(c); eyCx1 = new Float64Array(c); eyCy0 = new Float64Array(c); eyCy1 = new Float64Array(c); }
  const nbk = Math.ceil(nB / XBLK);
  if (eyBx0.length < nbk) { const c = nbk * 2; eyBx0 = new Float64Array(c); eyBx1 = new Float64Array(c); eyBy0 = new Float64Array(c); eyBy1 = new Float64Array(c); }
  const X = BB.bx; const Y = BB.by;
  for (let b = 0; b < nbk; b++) {
    let bx0 = Infinity; let bx1 = -Infinity; let by0 = Infinity; let by1 = -Infinity;
    const kEnd = Math.min(nB, (b + 1) * XBLK);
    for (let k = b * XBLK; k < kEnd; k++) {
      const j = segsB[k];
      const cx = X[j]; const cy = Y[j]; const dx = X[j + 1]; const dy = Y[j + 1];
      let x0 = Math.floor(Math.min(cx, dx) / cellE); let x1 = Math.floor(Math.max(cx, dx) / cellE);
      let y0 = Math.floor(Math.min(cy, dy) / cellE); let y1 = Math.floor(Math.max(cy, dy) / cellE);
      if (!(x0 <= x1 && y0 <= y1)) { x0 = Infinity; x1 = -Infinity; y0 = Infinity; y1 = -Infinity; }
      eyCx0[k] = x0; eyCx1[k] = x1; eyCy0[k] = y0; eyCy1[k] = y1;
      if (x0 < bx0) bx0 = x0; if (x1 > bx1) bx1 = x1; if (y0 < by0) by0 = y0; if (y1 > by1) by1 = y1;
    }
    eyBx0[b] = bx0; eyBx1[b] = bx1; eyBy0[b] = by0; eyBy1[b] = by1;
  }
  const AX = BA.bx; const AY = BA.by;
  let found = 0;
  for (let q = 0; q < nA; q++) {
    const i = segsA[q];
    const ax = AX[i]; const ay = AY[i]; const bx2 = AX[i + 1]; const by2 = AY[i + 1];
    const x0 = Math.floor(Math.min(ax, bx2) / cellE); const x1 = Math.floor(Math.max(ax, bx2) / cellE);
    const y0 = Math.floor(Math.min(ay, by2) / cellE); const y1 = Math.floor(Math.max(ay, by2) / cellE);
    if (!(x0 <= x1 && y0 <= y1)) continue;
    for (let b = 0; b < nbk; b++) {
      if (x1 < eyBx0[b] || x0 > eyBx1[b] || y1 < eyBy0[b] || y0 > eyBy1[b]) continue;
      const kEnd = Math.min(nB, (b + 1) * XBLK);
      for (let k = b * XBLK; k < kEnd; k++) {
        if (x1 < eyCx0[k] || x0 > eyCx1[k] || y1 < eyCy0[k] || y0 > eyCy1[k]) continue;
        const j = segsB[k];
        if (skipSame && i === j) continue;
        const hit = segInt(ax, ay, bx2, by2, X[j], Y[j], X[j + 1], Y[j + 1]);
        if (!hit) continue;
        const px = ax + (bx2 - ax) * hit.t; const py = ay + (by2 - ay) * hit.t;
        addInsert(C, bA, i, hit.t, px, py, -1);
        addInsert(C, bB, j, hit.u, px, py, -1);
        found++;
      }
    }
  }
  return found;
}
function eyesPhaseC(C: FCache, scene: SceneIn): void {
  const h = C.h;
  kfEyeCount = 0; kfEyeCutCount = 0; kfTieCutCount = 0;
  const depthWin = C.depthWindow * C.ctrlArc;
  const sides = [1, -1];
  for (const eye of C.eyes) {
    const pi = eye.pi; const qi = eye.qi;
    const pA = C.polys[pi]; const pB = C.polys[qi];
    const sPi0 = C.passS[pi][eye.piFirst]; const sPi1 = C.passS[pi][eye.piSecond];
    const sQi0 = C.passS[qi][eye.qiFirst]; const sQi1 = C.passS[qi][eye.qiSecond];
    let gapPi = sPi1 - sPi0;
    if (pA.closed && gapPi <= 0) gapPi += pA.len;
    let gapQi = sQi1 - sQi0;
    if (pB.closed && gapQi <= 0) gapQi += pB.len;
    if (gapPi > 10 * h || gapQi > 10 * h || gapPi < 1e-9 || gapQi < 1e-9) { eye.prevTotal = 0; continue; }
    pointAtInto(pA, sPi0 + gapPi / 2, ptScratch);
    const mAx = ptScratch[0]; const mAy = ptScratch[1];
    pointAtInto(pB, sQi0 + gapQi / 2, ptScratch);
    if (Math.hypot(mAx - ptScratch[0], mAy - ptScratch[1]) > 3 * h) { eye.prevTotal = 0; continue; }
    kfEyeCount++;
    // K1247 s2: each border's arc slice once per eye (it does not
    // change between combos), and the pair search without the string
    // grid: a pair is tested iff its cell ranges overlap (the old grid's
    // "share a cell"), pruned by blocks first. Inside one A segment the
    // B order is free: its inserts can tie only at the same t, and then
    // they are the same point with no ref.
    const cellE = Math.max(h, 0.05);
    eyNA[0] = sliceSegsE(C, C.bords[pi * 2], pA, sPi0, gapPi, eySegA[0]);
    eyNA[1] = sliceSegsE(C, C.bords[pi * 2 + 1], pA, sPi0, gapPi, eySegA[1]);
    eyNB[0] = sliceSegsE(C, C.bords[qi * 2], pB, sQi0, gapQi, eySegB[0]);
    eyNB[1] = sliceSegsE(C, C.bords[qi * 2 + 1], pB, sQi0, gapQi, eySegB[1]);
    let foundTotal = 0;
    for (let combo = 0; combo < 4; combo++) {
      const ai = combo >> 1; const bi = combo & 1;
      // Full search every frame: the old warm path tracked last
      // frame's pairs (and skipped the search when it had none), so
      // the cuts depended on history.
      foundTotal += eyeComboC(C, pi * 2 + ai, qi * 2 + bi, eySegA[ai], eySegB[bi], eyNA[ai], eyNB[bi], cellE, pi === qi && ai === bi);
    }
    void sides;
    kfEyeCutCount += foundTotal;
    if (!foundTotal) {
      const zA1 = depthAtC(C, pi, sPi0, depthWin); const zA2 = depthAtC(C, pi, sPi0 + gapPi, depthWin);
      const zB1 = depthAtC(C, qi, sQi0, depthWin); const zB2 = depthAtC(C, qi, sQi0 + gapQi, depthWin);
      const den = (zA2 - zA1) - (zB2 - zB1);
      if (Math.abs(den) > 1e-12) {
        const f = (zB1 - zA1) / den;
        if (f > 0.05 && f < 0.95) {
          pointAtInto(pA, sPi0 + f * gapPi, ptScratch);
          const cAx = ptScratch[0]; const cAy = ptScratch[1]; const tAx = ptScratch[2]; const tAy = ptScratch[3];
          pointAtInto(pB, sQi0 + f * gapQi, ptScratch2);
          const cBx = ptScratch2[0]; const cBy = ptScratch2[1]; const tBx = ptScratch2[2]; const tBy = ptScratch2[3];
          if (Math.hypot(cAx - cBx, cAy - cBy) < 2 * h) {
            const sA = ((tAx * (cBy - cAy) - tAy * (cBx - cAx)) > 0 ? 1 : -1);
            const sB = ((tBx * (cAy - cBy) - tBy * (cAx - cBx)) > 0 ? 1 : -1);
            const ptOn = (pi2: number, sd: number, ax: number, ay: number, ox: number, oy: number, sAt: number): void => {
              let ux = ox - ax; let uy = oy - ay;
              const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
              addPointAtC(C, pi2, sd, ax + ux * h, ay + uy * h, sAt);
            };
            ptOn(pi, sA, cAx, cAy, cBx, cBy, normS(pA, sPi0 + f * gapPi));
            ptOn(qi, sB, cBx, cBy, cAx, cAy, normS(pB, sQi0 + f * gapQi));
            kfTieCutCount++;
          }
        }
      }
    }
    eye.prevTotal = foundTotal;
  }
  void scene;
}

// --- junction + cap stations ---------------------------------------------------
function stationsPhaseC(C: FCache, st: DiagramStructure, scene: SceneIn): void {
  const h = C.h;
  void h;
  // Junction stations from corner refs (builder: before the rebuild).
  for (let ai = 0; ai < C.nArms; ai++) {
    let nextRef = C.armNextRef[ai]; let prevRef = C.armPrevRef[ai];
    if (nextRef < 0 && prevRef < 0) continue;
    const arm = C.armObj[ai];
    const pi = arm.pi;
    if (nextRef < 0 || prevRef < 0) {
      const missingNext = nextRef < 0;
      const knownSide = missingNext ? C.armPrevSide[ai] : C.armNextSide[ai];
      const side = -knownSide;
      borderPointAtBase(C, pi, side, C.armSR[ai], ptScratch);
      const ref = addPointAtC(C, pi, side, ptScratch[0], ptScratch[1], C.armSR[ai]);
      if (missingNext) { nextRef = ref; C.armNextRef[ai] = ref; C.armNextSide[ai] = side; }
      else { prevRef = ref; C.armPrevRef[ai] = ref; C.armPrevSide[ai] = side; }
    }
    const sideOf = (r: number): number => (C.refB[r] & 1) === 0 ? 1 : -1;
    const left = sideOf(nextRef) === 1 ? nextRef : sideOf(prevRef) === 1 ? prevRef : nextRef;
    const right = sideOf(nextRef) === -1 ? nextRef : sideOf(prevRef) === -1 ? prevRef : prevRef;
    if (left === right) continue;
    const p = C.polys[pi];
    const slot = C.junctionSlot[ai];
    C.stActive[slot] = 1;
    C.stLeft[slot] = left; C.stRight[slot] = right;
    C.stCS[slot] = normS(p, C.refS0[left] + dS(p, C.refS0[left], C.refS0[right]) / 2);
  }
  // Cap + seam stations and cap arcs.
  let capInfo = 0;
  for (let pi = 0; pi < C.nCh; pi++) {
    const p = C.polys[pi];
    if (p.closed) {
      // K1247 s14: the seam at the middle of its structural gap (seamKeyOf).
      const sk = seamKeyC(C, pi, p.len);
      let sSeam = normS(p, p.s0 + sk);
      sSeam = normS(p, sSeam + seamFreeC(C, pi, sSeam, p.len)); // free-stretch middle
      borderPointAtBase(C, pi, 1, sSeam, ptScratch);
      const lx = ptScratch[0]; const ly = ptScratch[1];
      borderPointAtBase(C, pi, -1, sSeam, ptScratch);
      const left = addPointAtC(C, pi, 1, lx, ly, sSeam);
      const right = addPointAtC(C, pi, -1, ptScratch[0], ptScratch[1], sSeam);
      const slot = C.seamSlot[pi];
      C.stActive[slot] = 1; C.stLeft[slot] = left; C.stRight[slot] = right; C.stCS[slot] = sSeam;
      continue;
    }
    for (let e = 0; e < 2; e++) {
      const atEnd = e === 1;
      const sEnd = atEnd ? p.s0 + p.len : p.s0;
      borderPointAtBase(C, pi, 1, sEnd, ptScratch);
      const lx = ptScratch[0]; const ly = ptScratch[1];
      borderPointAtBase(C, pi, -1, sEnd, ptScratch);
      const rx = ptScratch[0]; const ry = ptScratch[1];
      const left = addPointAtC(C, pi, 1, lx, ly, sEnd);
      const right = addPointAtC(C, pi, -1, rx, ry, sEnd);
      const slot = C.capSlot[pi * 2 + e];
      C.stActive[slot] = 1; C.stLeft[slot] = left; C.stRight[slot] = right; C.stCS[slot] = sEnd;
      C.capStation[capInfo] = slot;
      // Cap arc (builder): left -> right around the end centre.
      pointAtInto(p, sEnd, ptScratch);
      const cx = ptScratch[0]; const cy = ptScratch[1];
      const nbS = atEnd ? sEnd - Math.min(1, p.len) : sEnd + Math.min(1, p.len);
      pointAtInto(p, nbS, ptScratch2);
      let ox = cx - ptScratch2[0]; let oy = cy - ptScratch2[1];
      const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
      const a0 = Math.atan2(ly - cy, lx - cx);
      let da = Math.atan2(ry - cy, rx - cx) - a0;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      const midA = a0 + da / 2;
      if (Math.cos(midA) * ox + Math.sin(midA) * oy < 0) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI;
      const steps = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 12) - 1e-9));
      let ax = C.capArcX[capInfo]; let ay = C.capArcY[capInfo];
      if (ax.length < steps + 1) { ax = new Float64Array((steps + 1) * 2); ay = new Float64Array((steps + 1) * 2); C.capArcX[capInfo] = ax; C.capArcY[capInfo] = ay; }
      for (let i = 0; i <= steps; i++) {
        if (i === 0) { ax[i] = lx; ay[i] = ly; }
        else if (i === steps) { ax[i] = rx; ay[i] = ry; }
        else { const a = a0 + (da * i) / steps; ax[i] = cx + C.h * Math.cos(a); ay[i] = cy + C.h * Math.sin(a); }
      }
      C.capArcN[capInfo] = steps + 1;
      C.capCx[capInfo] = cx; C.capCy[capInfo] = cy;
      capInfo++;
    }
  }
  void st; void scene;
}


// --- intervals, regions, faces -------------------------------------------------
let kfFoldDiag: string[] = [];
function borderSeqCounted(C: FCache, pi: number, side: number, fromIdx: number, toIdx: number, forward: boolean): { n: number; ns: number } {
  const B = C.bords[pi * 2 + (side === 1 ? 0 : 1)];
  const nPts = B.nf;
  if (nPts === 0) return { n: 0, ns: 0 };
  if (C.seqIdx.length < nPts + 1) { C.seqIdx = new Int32Array((nPts + 1) * 2); C.seqSeg = new Int32Array((nPts + 1) * 2); }
  const idx = C.seqIdx; const segs = C.seqSeg;
  let n = 0; let ns = 0;
  if (!C.polys[pi].closed) {
    if (forward) { for (let i = fromIdx; i <= toIdx; i++) { idx[n++] = i; if (i < toIdx) segs[ns++] = i; } }
    else { for (let i = fromIdx; i >= toIdx; i--) { idx[n++] = i; if (i > toIdx) segs[ns++] = i - 1; } }
    return { n, ns };
  }
  const mod = Math.max(1, nPts - 1);
  let fi = ((fromIdx % mod) + mod) % mod;
  const ti = ((toIdx % mod) + mod) % mod;
  if (forward) {
    for (let guard = 0; guard <= mod; guard++) { idx[n++] = fi; if (fi === ti) break; segs[ns++] = fi; fi = (fi + 1) % mod; }
  } else {
    for (let guard = 0; guard <= mod; guard++) { idx[n++] = fi; if (fi === ti) break; const sg = (fi - 1 + mod) % mod; segs[ns++] = sg; fi = sg; }
  }
  return { n, ns };
}

/** Emit one border sequence's points into pts (the builder's dedupe),
 *  recording segment indices into segOut; returns the segment count. */
function regionSeqEmit(C: FCache, pi: number, side: number, fromIdx: number, toIdx: number, forward: boolean, pts: number[], segOut: Int32Array): number {
  const B = C.bords[pi * 2 + (side === 1 ? 0 : 1)];
  const nPts = B.nf;
  if (nPts === 0) return 0;
  const XY = B.xy;
  let ns = 0;
  if (!C.polys[pi].closed) {
    if (forward) { for (let i = fromIdx; i <= toIdx; i++) { pushDedup(pts, XY[2 * i], XY[2 * i + 1]); if (i < toIdx) segOut[ns++] = i; } }
    else { for (let i = fromIdx; i >= toIdx; i--) { pushDedup(pts, XY[2 * i], XY[2 * i + 1]); if (i > toIdx) segOut[ns++] = i - 1; } }
    return ns;
  }
  const mod = Math.max(1, nPts - 1);
  let fi = ((fromIdx % mod) + mod) % mod;
  const ti = ((toIdx % mod) + mod) % mod;
  if (forward) {
    for (let guard = 0; guard <= mod; guard++) { pushDedup(pts, XY[2 * fi], XY[2 * fi + 1]); if (fi === ti) break; segOut[ns++] = fi; fi = (fi + 1) % mod; }
  } else {
    for (let guard = 0; guard <= mod; guard++) { pushDedup(pts, XY[2 * fi], XY[2 * fi + 1]); if (fi === ti) break; const sg = (fi - 1 + mod) % mod; segOut[ns++] = sg; fi = sg; }
  }
  return ns;
}
// Append (x, y) unless it repeats the last point (K1247 s2: was a closure
// per call in regionSeqEmit and per region in regionsPhaseC).
function pushDedup(pts: number[], x: number, y: number): void {
  const l = pts.length;
  if (l >= 2) { const dx = pts[l - 2] - x; const dy = pts[l - 1] - y; if (dx * dx + dy * dy < 1e-24) return; }
  pts.push(x, y);
}
// The left border's segment list while the right one fills C.seqSeg.
let kfSegL = new Int32Array(1024);
const kfSortL: number[] = [];
interface FaceWorkF { owner: number; group: number; rid: number; sx: number; sy: number; depth: number }
function regionsPhaseC(C: FCache, st: DiagramStructure, scene: SceneIn): { regions: OutlineRegion[]; faces: OutlineFace[] } {
  const depthWin = C.depthWindow * C.ctrlArc;
  // Active stations per chain, sorted by (cS, creation rank).
  const perChain: number[][] = C.chainSlots;
  const piRank: number[] = C.chainPiRank;
  for (let pi = 0; pi < C.nCh; pi++) { perChain[pi].length = 0; piRank[pi] = Infinity; }
  for (let s = 0; s < C.nSlots; s++) {
    if (!C.stActive[s]) continue;
    const pi = C.slotPi[s];
    perChain[pi].push(s);
    if (C.slotRank[s] < piRank[pi]) piRank[pi] = C.slotRank[s];
  }
  const piOrder: number[] = [];
  for (let pi = 0; pi < C.nCh; pi++) if (perChain[pi].length) piOrder.push(pi);
  piOrder.sort((a, b) => piRank[a] - piRank[b]);
  let nIv = 0;
  const ivStart = new Int32Array(C.nCh).fill(-1);
  const ivCount = new Int32Array(C.nCh);
  for (const pi of piOrder) {
    const p = C.polys[pi];
    // Stable insertion sort by the old comparator (a chain holds ~25
    // stations; K1247 s2: was a slice + sort with a closure per chain).
    const src = perChain[pi];
    const list = kfSortL; list.length = 0;
    // K1247 s12: the order is the structure's (slotKey: the feature's scene
    // s), not the frame's cS: two features whose stations nearly meet
    // (g41_user_tw64 chain 26, arms 196 and 198, 0.011 apart) swapped under
    // reduction and broke both discard pairs. One feature's own stations
    // (a crossing's two cuts, a through pass's two arms) share a key and
    // keep their frame order, which only a collapsed tube could flip.
    for (let q = 0; q < src.length; q++) {
      const v = src[q];
      let j2 = list.length;
      list.push(v);
      while (j2 > 0) {
        const u = list[j2 - 1];
        const c = (C.slotKey[u] - C.slotKey[v]) || (C.slotSub[u] - C.slotSub[v]) || -dS(p, C.stCS[u], C.stCS[v]);
        if ((c || (C.slotRank[u] - C.slotRank[v])) > 0) { list[j2] = u; j2--; } else break;
      }
      list[j2] = v;
    }
    const uniq: number[] = [];
    for (const s of list) uniq.push(s);
    const m = uniq.length;
    ivStart[pi] = nIv;
    // Every structural interval exists in every frame; its length
    // follows the positions and may pass zero (an empty region).
    for (let i = 0; i < (p.closed ? m : m - 1); i++) {
      const A = uniq[i]; const B = uniq[(i + 1) % m];
      let len: number;
      if (m === 1) len = p.len;
      else if (!p.closed) len = C.stCS[B] - C.stCS[A];
      else {
        // K1247 s14: the seam's key is the frame's (seamKeyC), still below every feature's.
        const kA = C.slotKind[A] === 4 && C.seamKF ? C.seamKF[pi] : C.slotKey[A];
        const kB = C.slotKind[B] === 4 && C.seamKF ? C.seamKF[pi] : C.slotKey[B];
        const want = kB - kA + (i === m - 1 ? p.len : 0);
        len = want + dS(p, want, C.stCS[B] - C.stCS[A]);
      }
      C.ivPi[nIv] = pi; C.ivA[nIv] = A; C.ivB[nIv] = B; C.ivCMid[nIv] = C.stCS[A] + Math.max(0, len) / 2; C.ivLen[nIv] = len; C.ivDiscard[nIv] = 0; C.ivRegion[nIv] = -1; nIv++;
    }
    ivCount[pi] = nIv - ivStart[pi];
    // K1247 s12: positions follow the structure (envelopeRef in the ref):
    // an interval some earlier station has passed starts at the furthest one.
    {
      const n0 = ivStart[pi]; const nC = ivCount[pi];
      let T = 0; for (let k = n0; k < n0 + nC; k++) T += C.ivLen[k];
      let env = -Infinity; let eA = -1;
      const laps = p.closed && m > 1 ? 2 : 1;
      for (let lap = 0; lap < laps; lap++) {
        let pos = lap * T;
        for (let k = n0; k < n0 + nC; k++) {
          if (pos >= env) { env = pos; eA = C.ivA[k]; }
          const posB = pos + C.ivLen[k];
          if (lap === laps - 1) { C.ivEA[k] = eA; C.ivLen[k] = posB - env; C.ivCMid[k] = C.stCS[eA] + Math.max(0, C.ivLen[k]) / 2; }
          pos = posB;
        }
      }
    }
  }
  C.nIv = nIv;
  // Discards (shortest interval between each recorded pair, same chain).
  for (let d = 0; d < C.discardA.length; d++) {
    const s1 = C.discardA[d]; const s2 = C.discardB[d];
    if (s1 < 0 || s2 < 0 || !C.stActive[s1] || !C.stActive[s2]) continue;
    const pi = C.slotPi[s1];
    if (C.slotPi[s2] !== pi) continue;
    let best = -1;
    for (let i = ivStart[pi]; i < ivStart[pi] + ivCount[pi]; i++) {
      if ((C.ivA[i] === s1 && C.ivB[i] === s2) || (C.ivA[i] === s2 && C.ivB[i] === s1)) {
        if (best < 0 || C.ivLen[i] < C.ivLen[best]) best = i;
      }
    }
    if (best >= 0) C.ivDiscard[best] = 1;
  }
  const regions: OutlineRegion[] = [];
  const faceWorks: FaceWorkF[] = [];
  const refFinalOf = (r: number): number => (r >= 0 ? C.refFinal[r] : -1);
  const sR = structRegionsC(C, st);
  const sTaken = sR ? new Uint8Array(Math.max(1, sR.n)) : null;
  const sRegs: (OutlineRegion | undefined)[] = sR ? new Array(sR.n) : [];
  const sFaces: (FaceWorkF | undefined)[] = sR ? new Array(sR.n) : [];
  C.structMiss = 0;
  for (let i = 0; i < nIv; i++) {
    if (C.ivDiscard[i]) continue;
    const pi = C.ivPi[i];
    const A = C.ivA[i]; const B = C.ivB[i];
    const p = C.polys[pi];
    const pts: number[] = [];
    const BdL = C.bords[pi * 2];
    if (kfSegL.length < BdL.nf + 1) kfSegL = new Int32Array((BdL.nf + 1) * 2);
    const segL = kfSegL;
    // K1247 s12: an interval whose stations have passed (length <= 0) is
    // an empty region (a closed border's walk would otherwise wrap the loop).
    const live = C.ivLen[i] > 0;
    const eA = C.ivEA[i]; // K1247 s12: where the interval starts (the envelope)
    const nsL = live ? regionSeqEmit(C, pi, 1, refFinalOf(C.stLeft[eA]), refFinalOf(C.stLeft[B]), true, pts, segL) : 0;
    const capBInfo = C.capInfoOfSlot[B];
    if (live && capBInfo >= 0 && C.slotKind[B] === 3) {
      const ax = C.capArcX[capBInfo]; const ay = C.capArcY[capBInfo];
      for (let q = 1; q + 1 < C.capArcN[capBInfo]; q++) pushDedup(pts, ax[q], ay[q]);
    }
    const BdR = C.bords[pi * 2 + 1];
    if (C.seqSeg.length < BdR.nf + 1) { C.seqSeg = new Int32Array((BdR.nf + 1) * 2); C.seqIdx = new Int32Array((BdR.nf + 1) * 2); }
    const segR = C.seqSeg;
    const nsR = live ? regionSeqEmit(C, pi, -1, refFinalOf(C.stRight[B]), refFinalOf(C.stRight[eA]), false, pts, segR) : 0;
    const capAInfo = C.capInfoOfSlot[eA];
    if (live && capAInfo >= 0 && C.slotKind[eA] === 3) {
      const ax = C.capArcX[capAInfo]; const ay = C.capArcY[capAInfo];
      for (let q = C.capArcN[capAInfo] - 2; q >= 1; q--) pushDedup(pts, ax[q], ay[q]);
    }
    if (pts.length >= 2 && Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]) < 1e-12) pts.length -= 2;
    // K1247 s11: no skip under 3 points (the builder's note): region ids follow the intervals.
    // K1247 s12: ids from structure (structRegionsC).
    let rid = regions.length;
    if (sR) {
      rid = structRidC(sR, pi, A, sTaken!);
      if (rid < 0) { C.structMiss = (C.structMiss ?? 0) + 1; continue; }
      sTaken![rid] = 1;
    }
    C.ivRegion[i] = rid;
    for (let q = 0; q < nsL; q++) BdL.segReg[segL[q]] = rid;
    for (let q = 0; q < nsR; q++) BdR.segReg[segR[q]] = rid;
    const grp = memberGroupC(C, pi, C.ivCMid[i]);
    const reg: OutlineRegion = { id: rid, ownerChain: pi, group: grp, pts, pieces: [], hole: false };
    pointAtInto(p, C.ivCMid[i], ptScratch);
    const fw: FaceWorkF = { owner: pi, group: grp, rid, sx: ptScratch[0], sy: ptScratch[1], depth: depthAtC(C, pi, C.ivCMid[i], depthWin) };
    if (sR) { sRegs[rid] = reg; sFaces[rid] = fw; } else { regions.push(reg); faceWorks.push(fw); }
  }
  if (sR) {
    // Ids no interval took: empty regions at their first station (or the chain's start).
    for (let r = 0; r < sR.n; r++) {
      let reg = sRegs[r]; let fw = sFaces[r];
      if (!reg || !fw) {
        const pi = sR.ridPi[r]; const A = sR.ridA[r]; const p = C.polys[pi];
        const s = C.stActive[A] ? C.stCS[A] : p.s0;
        const grp = memberGroupC(C, pi, s);
        reg = { id: r, ownerChain: pi, group: grp, pts: [], pieces: [], hole: false };
        pointAtInto(p, s, ptScratch);
        fw = { owner: pi, group: grp, rid: r, sx: ptScratch[0], sy: ptScratch[1], depth: depthAtC(C, pi, s, depthWin) };
      }
      regions.push(reg); faceWorks.push(fw);
    }
  }
  // K1247 s14: underlays (KF_NOUNDER's note): one per structural discard pair (sR.nU, ids
  // sR.n + u, before the junction regions, whose count follows positions), the band of
  // the frame's discarded interval at that pair, beneath every face; empty when the
  // frame has none there. Border segments stay with their regions (no segReg, no pieces).
  C.underMiss = 0;
  if (sR) {
    const uBase = regions.length;
    const uRegs: (OutlineRegion | undefined)[] = new Array(sR.nU);
    const uFaces: (FaceWorkF | undefined)[] = new Array(sR.nU);
    for (let i = 0; i < nIv; i++) {
      if (!C.ivDiscard[i]) continue;
      const u = sR.uOfPair.get(C.ivA[i] * sR.nS + C.ivB[i]) ?? -1;
      if (u < 0 || uRegs[u]) { C.underMiss = (C.underMiss ?? 0) + 1; continue; }
      const pi = C.ivPi[i]; const B = C.ivB[i]; const eA = C.ivEA[i];
      const pts: number[] = [];
      if (C.ivLen[i] > 0) {
        const BdL = C.bords[pi * 2];
        if (kfSegL.length < BdL.nf + 1) kfSegL = new Int32Array((BdL.nf + 1) * 2);
        regionSeqEmit(C, pi, 1, refFinalOf(C.stLeft[eA]), refFinalOf(C.stLeft[B]), true, pts, kfSegL);
        const capBInfo = C.capInfoOfSlot[B];
        if (capBInfo >= 0 && C.slotKind[B] === 3) { const ax = C.capArcX[capBInfo]; const ay = C.capArcY[capBInfo]; for (let q = 1; q + 1 < C.capArcN[capBInfo]; q++) pushDedup(pts, ax[q], ay[q]); }
        const BdR = C.bords[pi * 2 + 1];
        if (C.seqSeg.length < BdR.nf + 1) { C.seqSeg = new Int32Array((BdR.nf + 1) * 2); C.seqIdx = new Int32Array((BdR.nf + 1) * 2); }
        regionSeqEmit(C, pi, -1, refFinalOf(C.stRight[B]), refFinalOf(C.stRight[eA]), false, pts, C.seqSeg);
        const capAInfo = C.capInfoOfSlot[eA];
        if (capAInfo >= 0 && C.slotKind[eA] === 3) { const ax = C.capArcX[capAInfo]; const ay = C.capArcY[capAInfo]; for (let q = C.capArcN[capAInfo] - 2; q >= 1; q--) pushDedup(pts, ax[q], ay[q]); }
        if (pts.length >= 2 && Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]) < 1e-12) pts.length -= 2;
      }
      const rid = uBase + u;
      const grp = memberGroupC(C, pi, C.ivCMid[i]);
      uRegs[u] = { id: rid, ownerChain: pi, group: grp, pts, pieces: [], hole: false };
      pointAtInto(C.polys[pi], C.ivCMid[i], ptScratch);
      uFaces[u] = { owner: pi, group: grp, rid, sx: ptScratch[0], sy: ptScratch[1], depth: UNDER_DEPTH };
    }
    for (let u = 0; u < sR.nU; u++) {
      let reg = uRegs[u]; let fw = uFaces[u];
      if (!reg || !fw) {
        const pi = sR.uPi[u]; const A = sR.uA[u]; const p = C.polys[pi];
        const s = C.stActive[A] ? C.stCS[A] : p.s0;
        const grp = memberGroupC(C, pi, s);
        reg = { id: uBase + u, ownerChain: pi, group: grp, pts: [], pieces: [], hole: false };
        pointAtInto(p, s, ptScratch);
        fw = { owner: pi, group: grp, rid: uBase + u, sx: ptScratch[0], sy: ptScratch[1], depth: UNDER_DEPTH };
      }
      regions.push(reg); faceWorks.push(fw);
    }
  }
  // Junction regions.
  C.junctionRegion.fill(-1);
  const cornerByAArm = C.cornerByAArm;
  scene.junctions.forEach((j, ji) => {
    const list = C.armsOfJSorted[ji];
    if (!list || list.length < 2) return;
    const pts: number[] = [];
    const pushPt = (x: number, y: number): void => {
      const l = pts.length;
      if (l >= 2) { const dx = pts[l - 2] - x; const dy = pts[l - 1] - y; if (dx * dx + dy * dy < 1e-24) return; }
      pts.push(x, y);
    };
    for (const ai of list) {
      const arm = C.armObj[ai];
      const prevRef = C.armPrevRef[ai]; const nextRef = C.armNextRef[ai];
      const sideOf = (r: number): number => (C.refB[r] & 1) === 0 ? 1 : -1;
      if (prevRef >= 0) { const Bd = C.bords[C.refB[prevRef]]; const fi = C.refFinal[prevRef]; pushPt(Bd.xy[2 * fi], Bd.xy[2 * fi + 1]); }
      else { borderPointAtFinal(C, arm.pi, nextRef >= 0 ? -sideOf(nextRef) : 1, C.armSR[ai], ptScratch); pushPt(ptScratch[0], ptScratch[1]); }
      if (nextRef >= 0) { const Bd = C.bords[C.refB[nextRef]]; const fi = C.refFinal[nextRef]; pushPt(Bd.xy[2 * fi], Bd.xy[2 * fi + 1]); }
      else { borderPointAtFinal(C, arm.pi, prevRef >= 0 ? -sideOf(prevRef) : -1, C.armSR[ai], ptScratch); pushPt(ptScratch[0], ptScratch[1]); }
      const ci = cornerByAArm[ai] >= 0 ? cornerByAArm[ai] : undefined;
      if (ci !== undefined && C.cOk[ci] && C.cR[ci] > 1e-9) {
        const aA = Math.atan2(C.cTay[ci] - C.cQy[ci], C.cTax[ci] - C.cQx[ci]);
        let da = Math.atan2(C.cTby[ci] - C.cQy[ci], C.cTbx[ci] - C.cQx[ci]) - aA;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
        // K1314 s4: a joined end (X, where a through bend's arc meets its neighbour's) is a vertex of
        // both junctions' polygons, so the two cover the wedge between the arcs and the shared foot.
        if (thruJoinEnd[2 * ci]) pushPt(C.cTax[ci], C.cTay[ci]);
        for (let s2 = 1; s2 < steps; s2++) {
          const a = aA + (da * s2) / steps;
          pushPt(C.cQx[ci] + C.cR[ci] * Math.cos(a), C.cQy[ci] + C.cR[ci] * Math.sin(a));
        }
        if (thruJoinEnd[2 * ci + 1]) pushPt(C.cTbx[ci], C.cTby[ci]);
      }
    }
    if (pts.length >= 2 && Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]) < 1e-12) pts.length -= 2;
    if (pts.length / 2 < 3) return;
    const rid = regions.length;
    C.junctionRegion[ji] = rid;
    const owner = C.armObj[list[0]].pi;
    regions.push({ id: rid, ownerChain: owner, group: st.groupOfJ[ji], pts, pieces: [], hole: false });
    faceWorks.push({ owner, group: st.groupOfJ[ji], rid, sx: j.c[0], sy: j.c[1], depth: depthAtC(C, owner, C.armSR[list[0]], depthWin) });
  });
  const order = faceWorks.map((_, i) => i).sort((a, b) => faceWorks[a].depth - faceWorks[b].depth);
  const faces: OutlineFace[] = order.map((i) => {
    const f = faceWorks[i];
    return { ownerChain: f.owner, group: f.group, pts: regions[f.rid].pts, sample: [f.sx, f.sy] as [number, number], hole: false };
  });
  return { regions, faces };
}

// --- pieces ----------------------------------------------------------------------
/** K1283 s2: a corner with no arc (r = 0: a sharp corner, or a failed
 *  corner at its borders' meet) is a point where two border bands end
 *  square, which leaves a wedge of the thread uncovered between their inner
 *  edges (the notch at muse_hash j103's lower corner). Form B's border is
 *  every point within W of the outline, so there it is a round join: the
 *  disc sector about the point between the two arms' inward normals. The
 *  arc piece becomes that sector as a fan: every point at Q, each foot one
 *  normal of the sweep (draw.ts offsets a band point W toward its foot), the
 *  short way from arm A's foot direction to arm B's. */
function sharpJoinFan(C: FCache, ci: number, aiA: number, aiB: number, pts: number[], cpts: number[]): void {
  const qx = pts[0]; const qy = pts[1];
  pointAtInto(C.polys[C.armObj[aiA].pi], C.cSA[ci], ptScratch);
  let ax = ptScratch[0] - qx; let ay = ptScratch[1] - qy;
  pointAtInto(C.polys[C.armObj[aiB].pi], C.cSB[ci], ptScratch);
  let bx = ptScratch[0] - qx; let by = ptScratch[1] - qy;
  const la = Math.sqrt(ax * ax + ay * ay); const lb = Math.sqrt(bx * bx + by * by);
  if (!(la > 1e-9 && lb > 1e-9)) return;
  ax /= la; ay /= la; bx /= lb; by /= lb;
  const a0 = Math.atan2(ay, ax);
  let da = Math.atan2(by, bx) - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) < 1e-4) return;
  // K1314 s2 (muse_hash j73, the j74 spike): a border turns one way at every
  // corner, and every other fan of the census scenes (424 of 425) sweeps that
  // way (da < 0). A short way that turns against it is a sector the two arms'
  // bands already overlap across, where form B inks nothing (0 of its
  // samples): no fan there.
  if (da > 0) return;
  const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
  pts.length = 0; cpts.length = 0;
  for (let k = 0; k <= steps; k++) { const a = a0 + (da * k) / steps; pts.push(qx, qy); cpts.push(qx + C.h * Math.cos(a), qy + C.h * Math.sin(a)); }
}

/** K1314 s4: at a through bend's joined end X (cornersPhaseC) its arc's band and the neighbour's end
 *  square, each along its own circle's normal, which leaves the wedge between them uninked. Form B's
 *  border is every point within W of the outline, a round join there: a fan on the through corner's
 *  arc (every point at X, each foot one normal of the sweep, as sharpJoinFan), from its normal to the
 *  neighbour's, the short way. */
function thruJoinFan(C: FCache, ci: number, pts: number[], cpts: number[]): void {
  for (let k = 0; k < thruJoins.length; k += 3) {
    if (thruJoins[k] !== ci) continue;
    const end = thruJoins[k + 1]; const nc = thruJoins[k + 2];
    const x = end === 0 ? C.cTax[ci] : C.cTbx[ci]; const y = end === 0 ? C.cTay[ci] : C.cTby[ci];
    const aO = Math.atan2(y - C.cQy[ci], x - C.cQx[ci]);
    let da = Math.atan2(y - C.cQy[nc], x - C.cQx[nc]) - aO;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    if (Math.abs(da) < 1e-4) continue;
    const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
    if (end === 1) {
      for (let s = 1; s <= steps; s++) { const a = aO + (da * s) / steps; pts.push(x, y); cpts.push(x + C.h * Math.cos(a), y + C.h * Math.sin(a)); }
    } else {
      const fp: number[] = []; const fc: number[] = [];
      for (let s = steps; s >= 1; s--) { const a = aO + (da * s) / steps; fp.push(x, y); fc.push(x + C.h * Math.cos(a), y + C.h * Math.sin(a)); }
      pts.unshift(...fp); cpts.unshift(...fc);
    }
  }
}

/** K1283 s9 (j59): at a failed corner the a arm's run ends at the corner's
 *  TA, past the meet V, inside X's tube, where its tail starts at form B's
 *  alpha (muse_hash j59: 0.30): the run inked that stretch at 1, a hard black
 *  block where form B fades it. The run's points near that end now carry
 *  form B's alpha (tailAlpha against the tail's X; 1 outside X's tube), so
 *  the band fades from V into the tail. An untied run's band reads p.alpha
 *  (draw.ts, band_gpu.ts); a tied one's ignores it (x77/x304's
 *  band_gpu.ts residual). Which run is the corner's is structure (the arm's
 *  junction station and side); only the alphas follow the frame. */
const RUN_END_FADE = true;
const RUN_FADE_L = 3;
/** K1314 s2 (g41_user_tw64 j39, g41_def_tw64 j45, j48): no fade whose faded
 *  points all lie within RUN_FADE_MIN h of the run's end. That is a sliver of
 *  the run past V (j39: 0.003 h), and its band's ramp to the last unfaded
 *  point, before V, falls outside the corner's fan: a light slit where form B
 *  inks. A real fade runs on from V (j78: 0.31). */
const RUN_FADE_MIN = 0.15;
/** K1283 s11: the fade at a failed corner whose end arm is B (s9 faded A's only). */
const RUN_FADE_B = true;
/** K1314 s2: no fade at a corner whose sector is near straight or reflex (theta
 *  at least 3 pi / 4). There E's border carries on from X's with no corner
 *  between them, the union's border, which form B inks: at all six such
 *  corners of the census scenes (ring and g41_ring_tw42 j12, def j174,
 *  g41_user_tw64 j4, j27, j28: theta 3.09..3.68) form B inks every faded
 *  sample, while every fade it agrees with sits at theta 2.14 or less. A
 *  tied run's band reads the fade since s2 (draw.ts), which showed it. */
const RUN_FADE_TH = 0.75 * Math.PI;
function runEndFade(a: TailIn, p: OutlinePiece, atEnd: boolean): void {
  const np = p.pts.length / 2;
  if (np < 2 || p.kind !== "run") return;
  let al: number[] | null = null;
  let cum = 0; let farCum = 0;
  const span = p.s1 - p.s0;
  for (let q = 0; q < np; q++) {
    const i = atEnd ? np - 1 - q : q;
    if (q > 0) {
      const j = atEnd ? i + 1 : i - 1;
      const dx = p.pts[2 * i] - p.pts[2 * j]; const dy = p.pts[2 * i + 1] - p.pts[2 * j + 1];
      cum += Math.sqrt(dx * dx + dy * dy);
      if (cum > RUN_FADE_L * a.h) break;
    }
    const sE = atEnd ? p.s1 - Math.min(cum, Math.abs(span)) : p.s0 + Math.min(cum, Math.abs(span));
    tailCen[0] = p.cpts[2 * i]; tailCen[1] = p.cpts[2 * i + 1];
    tailAlpha(a, sE, p.pts[2 * i], p.pts[2 * i + 1], tailA, true, true);
    if (tailA[0] < 1 - 1e-9 || tailA[1] < 1 - 1e-9) {
      if (!al) al = new Array<number>(2 * np).fill(1);
      al[2 * i] = tailA[0]; al[2 * i + 1] = tailA[1];
      farCum = cum;
    }
  }
  if (al && farCum >= RUN_FADE_MIN * a.h) p.alpha = al;
}

/** K1314 s9 (g41_user_tw64 j71's shade): a run starts at its arm's root,
 *  which can lie inside another arm's tube of the junction. There form B's
 *  tie fades the run's border (draw.ts tieAlpha: 0.16 at j71) and carries it
 *  on past the root, fading out, while the band stops at the run's first
 *  point: a hard cut across a faint band. The band can't run on past the
 *  root without moving the fill (fill_tri.ts strips the run's own points),
 *  so where form B's tie at the root is below RUN_RAMP_F the band fades in
 *  over RUN_RAMP_L h instead (own alpha, which the band multiplies by the
 *  tie). Below RUN_RAMP_F0 the tie already ends the band at no ink, and a
 *  ramp there only shortens ink form B draws. Form B's tie, with outline's
 *  depths: 1 - g sstep(-zt, zt, keyO - keyC), keys z - d zt / h, g = (h -
 *  d) / W, d the root's distance from the other arm's centreline (its foot
 *  within 4 h of that arm's root). It also clears muse_hash j58a (the
 *  fold's second leg's band where it meets c43's root). Censused at 0.35,
 *  0.45 and 0.6 h (s9): 0.6 shortened the most ink at other roots (the
 *  census's tail_look), 0.35 still cleared both. */
const RUN_ROOT_RAMP = true;
const RUN_RAMP_F = 0.5;
const RUN_RAMP_F0 = 0.05;
const RUN_RAMP_L = 0.35;
const rampFt = new Float64Array(2);
function runRootRamp(C: FCache, st: DiagramStructure, pieces: OutlinePiece[], runAtArm: Map<number, number>): void {
  const h = C.h; const W = C.W; const zt = 0.1 * C.depthAmp; const depthWin = C.depthWindow * C.ctrlArc;
  if (!(zt > 0)) return;
  const L = RUN_RAMP_L * h; const fMax = RUN_RAMP_F;
  for (const [key, r] of runAtArm) {
    const arm = key >> 1; const p = pieces[r >> 1]; const atEnd = (r & 1) === 1;
    const np = p.pts.length / 2; if (np < 2) continue;
    const i0 = atEnd ? np - 1 : 0; const x = p.pts[2 * i0]; const y = p.pts[2 * i0 + 1];
    // K1314 s10 (perf): only a foot nearer than h counts, so tailFoot prunes with cap h
    // and the root's own key waits for the first such foot (same f, bit for bit).
    let keyC = NaN;
    let f = 1;
    for (const aj of st.armsOfJ[C.armObj[arm].ji]) {
      const pj = C.armObj[aj].pi; if (pj === p.chain) continue;
      tailFoot(C.polys[pj], C.armSR[aj] - 4 * h, C.armSR[aj] + 4 * h, x, y, rampFt, h);
      const d = rampFt[1]; if (!(d < h)) continue;
      if (keyC !== keyC) keyC = depthAtC(C, p.chain, atEnd ? p.s1 : p.s0, depthWin) - zt;
      const g = Math.min(1, (h - d) / W);
      const u = Math.min(1, Math.max(0, (depthAtC(C, pj, rampFt[0], depthWin) - (d * zt) / h - keyC + zt) / (2 * zt)));
      f *= 1 - g * u * u * (3 - 2 * u);
    }
    if (!(f < fMax) || f < RUN_RAMP_F0) continue;
    const al = p.alpha ?? new Array<number>(2 * np).fill(1);
    let cum = 0;
    for (let q = 0; q < np; q++) {
      const i = atEnd ? np - 1 - q : q;
      if (q > 0) { const j = atEnd ? i + 1 : i - 1; const dx = p.pts[2 * i] - p.pts[2 * j]; const dy = p.pts[2 * i + 1] - p.pts[2 * j + 1]; cum += Math.sqrt(dx * dx + dy * dy); }
      if (cum >= L) break;
      const t = cum / L; const w = t * t * (3 - 2 * t);
      al[2 * i] *= w; al[2 * i + 1] *= w;
    }
    p.alpha = al;
  }
}

/** K1314 s6 (g41_user_tw64 j39 ticks): a band's end edge runs from its end
 *  point toward that point's foot, so two pieces that meet at one point join
 *  without a crack only when they give it one foot. An ok corner's arc puts
 *  its ends' feet on the ball's normal (Q + (r + h) dir), the runs beside it
 *  on their own chain's nearest point; where the arm's border bends inside
 *  the junction those differ (j39: 3 and 10 degrees), and the two bands leave
 *  a light wedge across the ink from the shared point inward. The arc's end
 *  takes the run's foot there; its band then turns from the run's edge to
 *  the ball's normal along the arc. */
const ARC_END_FEET = true;
function arcEndFeet(st: DiagramStructure, pieces: OutlinePiece[], runAtArm: Map<number, number>): void {
  for (const p of pieces) {
    if (p.kind !== "arc" || p.corner < 0 || p.pts.length < 4 || p.cpts.length !== p.pts.length) continue;
    const dc = st.corners[p.corner];
    if (!dc) continue;
    const n = p.pts.length;
    for (let e = 0; e < 2; e++) {
      const arm = e === 0 ? dc.aArm : dc.bArm; const k = e === 0 ? 0 : n - 2;
      const x = p.pts[k]; const y = p.pts[k + 1];
      for (let sk = 0; sk < 2; sk++) {
        const r = runAtArm.get(arm * 2 + sk);
        if (r === undefined) continue;
        const q = pieces[r >> 1]; const j = (r & 1) === 1 ? q.pts.length - 2 : 0;
        if (q.pts.length < 4 || q.cpts.length !== q.pts.length || !(Math.abs(q.pts[j] - x) <= 1e-9 && Math.abs(q.pts[j + 1] - y) <= 1e-9)) continue;
        p.cpts[k] = q.cpts[j]; p.cpts[k + 1] = q.cpts[j + 1];
        break;
      }
    }
  }
}

function piecesPhaseC(C: FCache, st: DiagramStructure, regions: OutlineRegion[]): { pieces: OutlinePiece[]; runMiss: number; runPassed: number } {
  const pieces: OutlinePiece[] = [];
  let runMiss = 0; let runPassed = 0;
  const runFade: { a: TailIn; key: number }[] = [];
  const runAtArm = new Map<number, number>();
  // Interval lookup for run regions: by (A slot, B slot) under K12_CSORDER;
  // by the A slot alone otherwise (K1247 s12: a crossOver station toggling
  // inside the run must not unset its region).
  C.pairStamp++;
  const stamp = C.pairStamp;
  const pairKey = (a: number, _b: number): number => a;
  for (let i = 0; i < C.nIv; i++) {
    const key = pairKey(C.ivA[i], C.ivB[i]);
    let hx = (key * 2654435761) >>> 0 & 8191;
    while (C.pairHashStamp[hx] === stamp && C.pairHashKey[hx] !== key) hx = (hx + 1) & 8191;
    C.pairHashStamp[hx] = stamp; C.pairHashKey[hx] = key; C.pairHashVal[hx] = i;
  }
  const ivLookup = (a: number, b: number): number => {
    if (a < 0) return -1;
    const key = pairKey(a, b);
    let hx = (key * 2654435761) >>> 0 & 8191;
    while (C.pairHashStamp[hx] === stamp) {
      if (C.pairHashKey[hx] === key) return C.pairHashVal[hx];
      hx = (hx + 1) & 8191;
    }
    return -1;
  };
  const sFOf = (dgs: DiagramStation): number => {
    if (dgs.kind === "cross") return C.cpSUnder[dgs.crossing];
    if (dgs.kind === "junction") return C.armSR[dgs.arm];
    if (dgs.kind === "capEnd") { const p = C.polys[dgs.pi]; return p.s0 + p.len; }
    return C.polys[dgs.pi].s0;
  };
  // K1247 s22: each piecesD entry pushes at most one piece, so the last push of each iteration is its own.
  let obD = -1; let obN = 0;
  for (const dp of st.piecesD) {
    if (OB_DI.on) { if (pieces.length > obN) pieces[pieces.length - 1].di = obD; obD++; obN = pieces.length; }
    if (dp.kind === "run" || dp.kind === "ghost") {
      const ghost = dp.kind === "ghost"; const missAt = runMiss; const passAt = runPassed;
      const ivD = st.intervalsD[dp.interval];
      const dgA = st.stationsD[ivD.aSt]; const dgB = st.stationsD[ivD.bSt];
      const pi = dp.chain; const side = dp.side;
      const B = C.bords[pi * 2 + (side === 1 ? 0 : 1)];
      const p = C.polys[pi];
      const nB = B.nf;
      const refOfD = (dgsIdx: number): number => {
        const dgs = st.stationsD[dgsIdx];
        if (dgs.kind === "cross") {
          const refs: number[] = [];
          for (const oSide of [1, -1]) {
            const slot = C.crossUnderSlot[dgs.crossing * 2 + (oSide === 1 ? 0 : 1)];
            if (!C.stActive[slot]) continue;
            const rr = side === 1 ? C.stLeft[slot] : C.stRight[slot];
            if (rr < 0) continue;
            if (C.refB[rr] !== pi * 2 + (side === 1 ? 0 : 1)) continue;
            const fi = C.refFinal[rr];
            if (fi < 0 || fi >= nB) continue;
            refs.push(rr);
          }
          if (refs.length !== 2) { runMiss++; return -1; }
          const sC = sFOf(dgs);
          const first = dS(p, sC, C.refS0[refs[0]]) <= dS(p, sC, C.refS0[refs[1]]) ? 0 : 1;
          return dgs.key.endsWith("|in") ? refs[first] : refs[1 - first];
        }
        const slot = C.dgSlot[dgsIdx];
        if (slot < 0 || !C.stActive[slot]) { runMiss++; return -1; }
        const rr = side === 1 ? C.stLeft[slot] : C.stRight[slot];
        if (rr < 0 || C.refB[rr] !== pi * 2 + (side === 1 ? 0 : 1)) { runMiss++; return -1; }
        const fi = C.refFinal[rr];
        if (fi < 0 || fi >= nB) { runMiss++; return -1; }
        return rr;
      };
      const fromRef = refOfD(ivD.aSt); const toRef = refOfD(ivD.bSt);
      const pts: number[] = []; const cpts: number[] = [];
      let rid = -1;
      const ivx = ivLookup(C.dgSlot[ivD.aSt], C.dgSlot[ivD.bSt]);
      if (!ghost && ivx >= 0 && C.ivRegion[ivx] >= 0) rid = C.ivRegion[ivx];
      const sA = fromRef >= 0 ? C.refS[fromRef] : sFOf(dgA);
      const sB = toRef >= 0 ? C.refS[toRef] : sFOf(dgB);
      let span = p.len;
      if (ivD.aSt !== ivD.bSt) {
        const want = p.closed && p.len > 0 ? (((sFOf(dgB) - sFOf(dgA)) % p.len) + p.len) % p.len : sFOf(dgB) - sFOf(dgA);
        let d = sB - sA - want;
        if (p.closed && p.len > 0) { d = ((d % p.len) + p.len) % p.len; if (d > p.len / 2) d -= p.len; }
        span = want + d;
      }
      let s0 = sA; let s1 = sA + span;
      let viewPts: Float64Array | null = null;
      let viewCpts: Float64Array | null = null;
      if (nB >= 2 && span <= 0) {
        // r4: a passed run is degenerate and draws nothing (the
        // builder's note).
        runPassed++;
        const sM = sA + span / 2;
        s0 = sM; s1 = sM;
      } else if (nB >= 2 && ivD.aSt === ivD.bSt) {
        viewPts = B.xy.subarray(0, 2 * nB); viewCpts = B.cxy.subarray(0, 2 * nB);
      } else if (nB >= 2 && fromRef >= 0 && toRef >= 0) {
        const seq = borderSeqCounted(C, pi, side, C.refFinal[fromRef], C.refFinal[toRef], true);
        if (seq.n > 0 && C.seqIdx[seq.n - 1] - C.seqIdx[0] === seq.n - 1) {
          viewPts = B.xy.subarray(2 * C.seqIdx[0], 2 * (C.seqIdx[seq.n - 1] + 1));
          viewCpts = B.cxy.subarray(2 * C.seqIdx[0], 2 * (C.seqIdx[seq.n - 1] + 1));
        } else {
          const vp = new Float64Array(2 * seq.n); const vc = new Float64Array(2 * seq.n);
          for (let q = 0; q < seq.n; q++) { const fi = C.seqIdx[q]; vp[2 * q] = B.xy[2 * fi]; vp[2 * q + 1] = B.xy[2 * fi + 1]; vc[2 * q] = B.cxy[2 * fi]; vc[2 * q + 1] = B.cxy[2 * fi + 1]; }
          viewPts = vp; viewCpts = vc;
        }
        if (!ghost && rid < 0 && seq.ns > 0) rid = B.segReg[C.seqSeg[0]] ?? -1;
      } else if (nB >= 2) {
        borderPointAtFinal(C, pi, side, sA, ptScratch);
        pts.push(ptScratch[0], ptScratch[1]);
        pointAtInto(p, sA, ptScratch);
        cpts.push(ptScratch[0], ptScratch[1]);
        const mod = p.closed ? nB - 1 : nB;
        void mod;
        // K1247 s16: the walk reads the continuous s (sc), as the end
        // lookups do, so a fan point joins the piece as its end slides past it.
        const SCw = B.sc;
        let target = sA;
        if (p.closed) { target = normS(p, sA); if (target < SCw[0] - 1e-9) target += p.len; }
        let i = 0; let hi = nB - 1;
        while (hi - i > 1) { const mid = (i + hi) >> 1; if (SCw[mid] <= target) i = mid; else hi = mid; }
        for (let guard = 0; guard < mod; guard++) {
          i = p.closed ? (i + 1) % mod : i + 1;
          if (i >= nB) break;
          let off = SCw[i] - sA;
          if (p.closed && p.len > 0) off = ((off % p.len) + p.len) % p.len;
          if (off >= span) break;
          if (off > 0) { pts.push(B.xy[2 * i], B.xy[2 * i + 1]); cpts.push(B.cxy[2 * i], B.cxy[2 * i + 1]); }
        }
        borderPointAtFinal(C, pi, side, sB, ptScratch);
        pts.push(ptScratch[0], ptScratch[1]);
        pointAtInto(p, sB, ptScratch);
        cpts.push(ptScratch[0], ptScratch[1]);
      }
      if (ghost) { runMiss = missAt; runPassed = passAt; }
      const piece: OutlinePiece = { kind: dp.kind, chain: pi, side, s0, s1, pts: viewPts ? (viewPts as unknown as number[]) : pts, cpts: viewCpts ? (viewCpts as unknown as number[]) : cpts, region: rid, corner: -1 };
      pieces.push(piece);
      if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
      if (RUN_END_FADE && !ghost) {
        const sk = side === 1 ? 0 : 1;
        if (dgB.kind === "junction") runAtArm.set(dgB.arm * 2 + sk, 2 * (pieces.length - 1) + 1);
        if (dgA.kind === "junction") runAtArm.set(dgA.arm * 2 + sk, 2 * (pieces.length - 1));
      }
    } else if (dp.kind === "arc") {
      const ci = dp.corner;
      const dc = st.corners[ci];
      const rid = dc ? C.junctionRegion[dc.ji] : -1;
      let pts: number[] = []; let cpts: number[] = [];
      if (C.cOk[ci] && C.cR[ci] > 1e-9) {
        const aA = Math.atan2(C.cTay[ci] - C.cQy[ci], C.cTax[ci] - C.cQx[ci]);
        let da = Math.atan2(C.cTby[ci] - C.cQy[ci], C.cTbx[ci] - C.cQx[ci]) - aA;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
        // K1283: an arc point's foot is on the far side from Q, at r + h
        // (Q is in the paper; form B's arc band is r <= |x - Q| <= r + W).
        // At the arc's ends it is the arm's foot, the run's own foot there,
        // so the band turns inward on the thread side and meets the runs'.
        // The foot used to be Q: the band lay on the paper side, a step of
        // W at each end (the "bite" at the corner's feet).
        const rf = C.cR[ci] + C.h;
        for (let s2 = 0; s2 <= steps; s2++) { const a = aA + (da * s2) / steps; const ca = Math.cos(a); const sa = Math.sin(a); pts.push(C.cQx[ci] + C.cR[ci] * ca, C.cQy[ci] + C.cR[ci] * sa); cpts.push(C.cQx[ci] + rf * ca, C.cQy[ci] + rf * sa); }
        if (thruJoins.length > 0) thruJoinFan(C, ci, pts, cpts);
      } else if (!C.cOk[ci] && C.cMeet[ci]) { pts = [C.cQx[ci], C.cQy[ci]]; cpts = [C.cQx[ci], C.cQy[ci]]; if (dc) sharpJoinFan(C, ci, dc.aArm, dc.bArm, pts, cpts); }
      else if (!C.cOk[ci]) {
        let ax = C.cQx[ci]; let ay = C.cQy[ci];
        for (const nci of [ci - 1, ci + 1]) {
          const nc = st.corners[nci];
          if (!nc || !dc || nc.ji !== dc.ji || !C.cOk[nci] || !(C.cR[nci] > 1e-9)) continue;
          if (nc.aArm === dc.bArm) { ax = C.cTax[nci]; ay = C.cTay[nci]; break; }
          if (nc.bArm === dc.aArm) { ax = C.cTbx[nci]; ay = C.cTby[nci]; break; }
        }
        pts = [ax, ay]; cpts = [C.cQx[ci], C.cQy[ci]];
      } else { pts = [C.cQx[ci], C.cQy[ci]]; cpts = [C.cQx[ci], C.cQy[ci]]; if (dc) sharpJoinFan(C, ci, dc.aArm, dc.bArm, pts, cpts); }
      const piece: OutlinePiece = { kind: "arc", chain: dc ? C.armObj[dc.aArm].pi : -1, side: 0, s0: C.cSA[ci], s1: C.cSB[ci], pts, cpts, region: rid, corner: ci };
      pieces.push(piece);
      if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
    } else if (dp.kind === "tail") {
      const ci = dp.corner;
      const dc = st.corners[ci];
      const pts: number[] = []; const cpts: number[] = []; const alpha: number[] = []; const fill = { pts: [] as number[], cpts: [] as number[] };
      let sideE = 0; let sT = 0;
      if (dc) {
        const aiE = dp.interval ? dc.bArm : dc.aArm; const aiX = dp.interval ? dc.aArm : dc.bArm;
        const piE = C.armObj[aiE].pi; const piX = C.armObj[aiX].pi;
        sideE = dp.interval ? -C.armDir[dc.bArm] : C.armDir[dc.aArm];
        sT = dp.interval ? C.cSB[ci] : C.cSA[ci];
        const depthWin = C.depthWindow * C.ctrlArc;
        // K1283 s4: X's other arm at the junction, if X runs through it.
        let aiX2 = -1;
        for (const ai of st.armsOfJ[dc.ji] ?? []) if (ai !== aiX && ai !== aiE && C.armObj[ai].pi === piX) { aiX2 = ai; break; }
        // K1314 s3 (K1049): X's bend, if its through pass rounds here (the junction's corners are contiguous).
        let bend: TailIn["bend"] = null;
        if (aiX2 >= 0) {
          let k0 = ci; while (k0 > 0 && st.corners[k0 - 1].ji === dc.ji) k0--;
          for (let k = k0; k < st.corners.length && st.corners[k].ji === dc.ji; k++) {
            const kc = st.corners[k];
            if (kc.thru !== 1 || !C.cOk[k] || !(C.cR[k] > 1e-9)) continue;
            if ((kc.aArm === aiX && kc.bArm === aiX2) || (kc.aArm === aiX2 && kc.bArm === aiX)) { bend = { qx: C.cQx[k], qy: C.cQy[k], r: C.cR[k], tax: C.cTax[k], tay: C.cTay[k], tbx: C.cTbx[k], tby: C.cTby[k] }; break; }
          }
        }
        const tin: TailIn = {
          bend,
          alt: aiX2 >= 0 ? { sRX: C.armSR[aiX2], dirX: C.armDir[aiX2], LX: C.armL[aiX2], LcutX: C.armLcut[aiX2] } : null,
          pE: C.polys[piE], dirE: C.armDir[aiE], endS: C.armSR[aiE], sT,
          x0: dp.interval ? C.cTbx[ci] : C.cTax[ci], y0: dp.interval ? C.cTby[ci] : C.cTay[ci],
          bp: (s, out) => borderPointAtFinal(C, piE, sideE, s, out),
          pX: C.polys[piX], sRX: C.armSR[aiX], dirX: C.armDir[aiX], LX: C.armL[aiX], LcutX: C.armLcut[aiX],
          zE: (s) => depthAtC(C, piE, s, depthWin), zX: (s) => depthAtC(C, piX, s, depthWin), h: C.h, zt: 0.1 * C.depthAmp, W: C.W,
        };
        endTailPts(tin, pts, cpts, alpha, fill);
        if (RUN_END_FADE && (RUN_FADE_B || !dp.interval) && !C.cOk[ci] && C.cTheta[ci] < RUN_FADE_TH) runFade.push({ a: tin, key: aiE * 2 + (sideE === 1 ? 0 : 1) });
      }
      pieces.push({ kind: "tail", chain: dp.chain, side: sideE, s0: sT, s1: sT, pts, cpts, region: -1, corner: ci, alpha, fpts: fill.pts, fcpts: fill.cpts });
    } else {
      const capInfo = dp.cap;
      if (capInfo < 0 || capInfo >= C.capArcN.length) continue;
      const pts: number[] = []; const cpts: number[] = [];
      const ax = C.capArcX[capInfo]; const ay = C.capArcY[capInfo];
      for (let i = 0; i < C.capArcN[capInfo]; i++) { pts.push(ax[i], ay[i]); cpts.push(C.capCx[capInfo], C.capCy[capInfo]); }
      const slot = C.capStation[capInfo];
      const cS = slot >= 0 ? C.stCS[slot] : 0;
      const piece: OutlinePiece = { kind: "cap", chain: dp.chain, side: 0, s0: cS, s1: cS, pts, cpts, region: -1, corner: -1 };
      pieces.push(piece);
    }
  }
  if (OB_DI.on && pieces.length > obN) pieces[pieces.length - 1].di = obD;
  for (const f of runFade) {
    const r = runAtArm.get(f.key);
    if (r === undefined) continue;
    runEndFade(f.a, pieces[r >> 1], (r & 1) === 1);
  }
  if (RUN_ROOT_RAMP) runRootRamp(C, st, pieces, runAtArm);
  if (ARC_END_FEET) arcEndFeet(st, pieces, runAtArm);
  return { pieces, runMiss, runPassed };
}

// --- the fast frame ---------------------------------------------------------------
function frameFast(st: DiagramStructure, scene: SceneIn, profile?: Record<string, number>): OutlineTable {
  let C = fastCaches.get(st);
  const look = scene.look;
  if (C && (C.h !== look.halfWidth || C.W !== look.band || C.cr !== (look.cuspRadius ?? 3) || C.depthAmp !== look.depthAmp || C.depthWindow !== look.depthWindow || C.ctrlArc !== (look.ctrlArc ?? 1))) {
    return buildOutlineFull(scene, st, profile).table;
  }
  if (!C) {
    if (scene.chains.length !== st.chainIds.length) return buildOutlineFull(scene, st, profile).table;
    C = buildFastCache(st, scene);
    fastCaches.set(st, C);
  }
  if (scene.chains.length !== C.nCh) return buildOutlineFull(scene, st, profile).table;
  for (let i = 0; i < C.nCh; i++) {
    if (Math.ceil(scene.chains[i].pts.length / 2) + 4 > C.polys[i].x.length) return buildOutlineFull(scene, st, profile).table;
  }
  let profT = profile ? performance.now() : 0;
  const profMark = (key: string): void => { if (profile) { const now = performance.now(); profile[key] = (profile[key] ?? 0) + (now - profT); profT = now; } };
  // Per-frame resets.
  C.nIns = 0;
  C.nRef = 0;
  for (const B of C.bords) B.nIns = 0;
  C.stActive.fill(0);
  kfFoldDiag = [];
  (C as unknown as { __foldDiag: string[] }).__foldDiag = kfFoldDiag;
  kfFrameNo++;

  setupFrame(C, st, scene);
  if (KF_INC.cache) for (let pi = 0; pi < C.nCh; pi++) buildBorderInc(C, pi);
  else for (let pi = 0; pi < C.nCh; pi++) { buildBorderC(C, pi, 1); buildBorderC(C, pi, -1); }
  kfCI = KF_INC.cache ? chainVersC(C) : null;
  profMark("setupBorders");
  cornersPhaseC(C, st, scene);
  profMark("corners");
  crossingsPhaseC(C, scene);
  eyesPhaseC(C, scene);
  stationsPhaseC(C, st, scene);
  mergeBorders(C);
  profMark("cutsEyesExposure");
  const { regions, faces } = regionsPhaseC(C, st, scene);
  profMark("regions");
  const { pieces, runMiss, runPassed } = piecesPhaseC(C, st, regions);
  // Corners + cuts tables.
  const corners: OutlineCorner[] = st.corners.map((dc, ci) => {
    const base: OutlineCorner = {
      junction: scene.junctions[dc.ji]?.id ?? "",
      aChain: C.armObj[dc.aArm].pi, bChain: C.armObj[dc.bArm].pi,
      ok: !!C.cOk[ci], style: dc.style, theta: C.cTheta[ci], r: C.cR[ci],
      Vx: C.cVx[ci], Vy: C.cVy[ci], qx: C.cQx[ci], qy: C.cQy[ci],
      tax: C.cTax[ci], tay: C.cTay[ci], tbx: C.cTbx[ci], tby: C.cTby[ci],
    };
    if (C.cWhy[ci]) base.why = C.cWhy[ci];
    return base;
  });
  const cuts: OutlineCut[] = kfCuts.map((c) => ({ crossing: c.xi, chain: c.U, side: c.uSide, s: c.s, x: c.x, y: c.y, overChain: c.O }));
  // Diagnostics.
  const diagnostics: string[] = [];
  diagnostics.push(...kfFoldDiag.slice(0, CF_DIAG_N));
  diagnostics.push(...kfDiagCross);
  diagnostics.push(`twist cuts ${kfTwistFlips}`);
  diagnostics.push(`eyes ${kfEyeCount} (border cuts ${kfEyeCutCount}, depth-tie cuts ${kfTieCutCount}), kink self-crossings ${C.kinkCount}`);
  if (runMiss || runPassed) diagnostics.push(`frame runs: ${runMiss} ends without points, ${runPassed} passed `);
  let crossInJunction = 0;
  scene.crossings.forEach((x, xi) => {
    void xi;
    const ia = C.crossAPi[xi]; const ib = C.crossBPi[xi];
    if (memberGroupC(C, ia, x.a.s) >= 0 || memberGroupC(C, ib, x.b.s) >= 0) crossInJunction++;
  });
  let arcNearThread = 0;
  for (let ci = 0; ci < st.corners.length; ci++) {
    if (!C.cOk[ci] || !(C.cR[ci] > 0)) continue;
    const dc = st.corners[ci];
    const aChain = C.armObj[dc.aArm].pi; const bChain = C.armObj[dc.bArm].pi;
    const R = C.h + C.cR[ci];
    const qx = C.cQx[ci]; const qy = C.cQy[ci];
    let near = false;
    outer: for (let pi2 = 0; pi2 < C.nCh; pi2++) {
      if (pi2 === aChain || pi2 === bChain) continue;
      if (qx < C.polyBox[4 * pi2] - R || qx > C.polyBox[4 * pi2 + 2] + R || qy < C.polyBox[4 * pi2 + 1] - R || qy > C.polyBox[4 * pi2 + 3] + R) continue;
      const p = C.polys[pi2];
      for (let blk = 0; blk < p.nblk; blk++) {
        if (qx < p.bk[4 * blk] - R || qx > p.bk[4 * blk + 2] + R || qy < p.bk[4 * blk + 1] - R || qy > p.bk[4 * blk + 3] + R) continue;
        const kEnd = Math.min(p.nseg, (blk + 1) * 32);
        for (let k = blk * 32; k < kEnd; k++) {
          if (qx < p.bx0[k] - R || qx > p.bx1[k] + R || qy < p.by0[k] - R || qy > p.by1[k] + R) continue;
          const b = k + 1 === p.n ? 0 : k + 1;
          const ex = p.x[b] - p.x[k]; const ey = p.y[b] - p.y[k];
          const l2 = ex * ex + ey * ey;
          let t = l2 > 0 ? ((qx - p.x[k]) * ex + (qy - p.y[k]) * ey) / l2 : 0;
          t = Math.min(1, Math.max(0, t));
          if (Math.hypot(p.x[k] + ex * t - qx, p.y[k] + ey * t - qy) < R) { near = true; break outer; }
        }
      }
    }
    if (near) arcNearThread++;
  }
  diagnostics.push(`crossings in a junction span ${crossInJunction}, corner arcs near another thread ${arcNearThread}`);
  let stationsActive = 0;
  for (let s = 0; s < C.nSlots; s++) if (C.stActive[s]) stationsActive++;
  diagnostics.push(`chains ${C.nCh}, pieces ${pieces.length}, regions ${regions.length}, faces ${faces.length}, corners ${corners.filter((c) => c.ok).length}/${corners.length} ok, cuts ${cuts.length}, stations ${stationsActive}`);
  profMark("piecesCapsEtc");
  return { h: C.h, W: C.W, pieces, regions, faces, corners, cuts, diagnostics };
}

interface FArm extends ArmStruct { ux: number; uy: number; ang: number }
interface FFoot { d: number; x: number; y: number; s: number; k: number; u: number }
function copyFoot(dst: FFoot, src: FFoot): void { dst.d = src.d; dst.x = src.x; dst.y = src.y; dst.s = src.s; dst.k = src.k; dst.u = src.u; }
// K1247 s16: a corner arc end's foot. dst is Q (the nearest foot), or,
// with q in a concave vertex's bisector band, footBlendInto's foot, its u
// following its s.
// K16_CB (experiment): "0" (default) = the nearest foot as on master,
// "band" = the band blend around the tracked foot, "loc" = footBlendInto's
// loc (fixes 10 more def jump places, but moves the look at rest: K1279
// census 42 crossings worse, cmp 670/354/134/16; s16 handoff).
const kfEa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
const kfEb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
interface WalkCache {
  valid: boolean; oLo: number; oHi: number;
  fOk: boolean; fQx: number; fQy: number; fU0: number; fN: number; fK: number; fBk: number; fSm: Float64Array;
  bOk: boolean; bQx: number; bQy: number; bU0: number; bN: number; bK: number; bBk: number; bSm: Float64Array;
  mOk: boolean; mQx: number; mQy: number; mLo: number; mHi: number; mD0: number;
  cOk: boolean; cU: number; cB: number; cQx: number; cQy: number; cS: number;
}
function mkWalkCache(): WalkCache { return { valid: false, oLo: NaN, oHi: NaN, fOk: false, fQx: 0, fQy: 0, fU0: 0, fN: 0, fK: 0, fBk: 0, fSm: new Float64Array(64), bOk: false, bQx: 0, bQy: 0, bU0: 0, bN: 0, bK: 0, bBk: 0, bSm: new Float64Array(64), mOk: false, mQx: 0, mQy: 0, mLo: 0, mHi: 0, mD0: 0, cOk: false, cU: 0, cB: 0, cQx: 0, cQy: 0, cS: 0 }; }

// x, y come in kfXY and the hint is out's own foot (s, k): no double crosses
// the call boundary, so none is boxed (31.8k calls a frame on def).
const kfXY = new Float64Array(2);
function footNearM(C: FCache, arm: FArm, out: FFoot): void {
    const polys = C.polys; const h = C.h; const x = kfXY[0]; const y = kfXY[1]; const hintS = out.u; const hintK = out.k;
    // The builder's tracked foot (footT): search only h/32 of s around
    // the current foot estimate, walking the window when the foot sits
    // on its edge, so the foot cannot jump branch. Segments are found
    // from the tracked segment index, not by binary search.
    const p = polys[arm.pi];
    const winLoR = arm.dir > 0 ? arm.sR : arm.sR - arm.L;
    const winHiR = arm.dir > 0 ? arm.sR + arm.L : arm.sR;
    const w = h / 32;
    let sv = hintS;
    let k0 = hintK;
    if (k0 < 0 || k0 >= p.nseg) k0 = segOfS(p, normS(p, sv)).k;
    let shiftW = 0;
    if (p.closed && p.len > 0) shiftW = Math.round((sv - (winLoR + winHiR) / 2) / p.len) * p.len;
    const winLo = winLoR + shiftW; const winHi = winHiR + shiftW;
    const segShift = p.closed && p.len > 0 ? Math.round((sv - p.s[k0]) / p.len) * p.len : 0;
    const PX = p.x; const PY = p.y; const PS = p.s; const PSL = p.segLen; const PDX = p.dx; const PDY = p.dy;
    // K1247 s4: the walk's answer in one step when every window it would
    // visit lies strictly inside the hint segment and the arm window: each
    // is then "covered" (only that segment is searched) and the walk ends
    // on the segment's unclamped projection, computed the same way.
    {
      const l = PSL[k0];
      let segS = PS[k0] + segShift;
      if (p.closed && p.len > 0) { if (segS < sv - p.len / 2) segS += p.len; else if (segS > sv + p.len / 2) segS -= p.len; }
      const ex = PDX[k0]; const ey = PDY[k0];
      const l2 = ex * ex + ey * ey;
      if (l > 0 && l2 > 0 && (!p.closed || l < p.len / 4)) {
        const t = ((x - PX[k0]) * ex + (y - PY[k0]) * ey) / l2;
        const su = segS + t * l;
        const a = (su < sv ? su : sv) - w; const b = (su > sv ? su : sv) + w;
        if (a > segS && b < segS + l && a > winLo && b < winHi && b - a < 64 * w) {
          const qx = PX[k0] + ex * t; const qy = PY[k0] + ey * t;
          out.d = Math.sqrt((x - qx) * (x - qx) + (y - qy) * (y - qy)); out.x = qx; out.y = qy; out.s = PS[k0] + t * l; out.k = k0; out.u = su;
          return;
        }
      }
    }
    for (let it = 0; it < 128; it++) {
      const lo = Math.max(winLo, sv - w);
      const hi = Math.min(winHi, sv + w);
      let bd2 = Infinity; let bx = x; let by = y; let bs = sv; let bk = k0; let bu = sv;
      let covered = false;
      {
        let segS = PS[k0] + segShift;
        if (p.closed && p.len > 0) { if (segS < sv - p.len / 2) segS += p.len; else if (segS > sv + p.len / 2) segS -= p.len; }
        const segE = segS + PSL[k0];
        if (segS <= lo && segE >= hi) {
          covered = true;
          const ex = PDX[k0]; const ey = PDY[k0];
          const l = PSL[k0] || 1;
          const ta = Math.min(1, Math.max(0, (lo - segS) / l));
          const tb = Math.min(1, Math.max(0, (hi - segS) / l));
          const l2 = ex * ex + ey * ey;
          let t = l2 > 0 ? ((x - PX[k0]) * ex + (y - PY[k0]) * ey) / l2 : 0;
          t = Math.min(tb, Math.max(ta, t));
          const qx = PX[k0] + ex * t; const qy = PY[k0] + ey * t;
          bd2 = (x - qx) * (x - qx) + (y - qy) * (y - qy); bx = qx; by = qy; bs = PS[k0] + t * PSL[k0]; bk = k0; bu = segS + t * PSL[k0];
        }
      }
      for (let dk = covered ? 3 : -2; dk <= 2; dk++) {
        let kk = k0 + dk;
        if (p.closed) kk = ((kk % p.nseg) + p.nseg) % p.nseg; else if (kk < 0 || kk >= p.nseg) continue;
        let segS = PS[kk] + segShift;
        if (p.closed && p.len > 0) { if (segS < sv - p.len / 2) segS += p.len; else if (segS > sv + p.len / 2) segS -= p.len; }
        const segE = segS + PSL[kk];
        if (segE < lo || segS > hi) continue;
        const ex = PDX[kk]; const ey = PDY[kk];
        const l = PSL[kk] || 1;
        const ta = Math.min(1, Math.max(0, (Math.max(lo, segS) - segS) / l));
        const tb = Math.min(1, Math.max(0, (Math.min(hi, segE) - segS) / l));
        if (tb < ta) continue;
        const l2 = ex * ex + ey * ey;
        let t = l2 > 0 ? ((x - PX[kk]) * ex + (y - PY[kk]) * ey) / l2 : 0;
        t = Math.min(tb, Math.max(ta, t));
        const qx = PX[kk] + ex * t; const qy = PY[kk] + ey * t;
        const d2 = (x - qx) * (x - qx) + (y - qy) * (y - qy);
        if (d2 < bd2) { bd2 = d2; bx = qx; by = qy; bs = PS[kk] + t * PSL[kk]; bk = kk; bu = segS + t * PSL[kk]; }
      }
      if (!Number.isFinite(bd2)) { { const A = fwA; A[0] = x; A[1] = y; A[2] = winLoR; A[3] = winHiR; A[4] = -1; A[5] = Infinity; A[6] = NaN; A[7] = NaN; A[8] = Infinity; } footWinFast(p, out); out.u = out.s; return; }
      out.d = Math.sqrt(bd2); out.x = bx; out.y = by; out.s = bs; out.k = bk; out.u = bu;
      const edge = (bu <= lo + 1e-9 * h && lo > winLo) || (bu >= hi - 1e-9 * h && hi < winHi);
      if (!edge || Math.abs(bu - sv) <= 1e-12 * h) return;
      sv = bu; k0 = bk;
    }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Shared typed-array helpers (kept from the S3 runtime): poly fills and
// foot searches the fast frame's corner solver reuses.


function fillPoly(p: Poly, pts: ArrayLike<number>, closed: boolean, s0: number): void {
  let n = 0;
  const m = Math.floor(pts.length / 2);
  for (let i = 0; i < m; i++) {
    const x = pts[2 * i]; const y = pts[2 * i + 1];
    if (n > 0 && Math.abs(x - p.x[n - 1]) + Math.abs(y - p.y[n - 1]) < 1e-12) continue;
    p.x[n] = x; p.y[n] = y; n++;
  }
  finishPoly(p, n, closed, s0);
}
// fillPoly of [pre?, ...pts, post?] without building that array (K1247 s2:
// setupFrame copied every extended chain's points into a fresh number[]).
function fillPolyPP(p: Poly, pts: ArrayLike<number>, closed: boolean, s0: number, hasPre: boolean, preX: number, preY: number, hasPost: boolean, postX: number, postY: number): void {
  let n = 0;
  if (hasPre) { p.x[0] = preX; p.y[0] = preY; n = 1; }
  const m = Math.floor(pts.length / 2);
  for (let i = 0; i < m; i++) {
    const x = pts[2 * i]; const y = pts[2 * i + 1];
    if (n > 0 && Math.abs(x - p.x[n - 1]) + Math.abs(y - p.y[n - 1]) < 1e-12) continue;
    p.x[n] = x; p.y[n] = y; n++;
  }
  if (hasPost && !(n > 0 && Math.abs(postX - p.x[n - 1]) + Math.abs(postY - p.y[n - 1]) < 1e-12)) { p.x[n] = postX; p.y[n] = postY; n++; }
  finishPoly(p, n, closed, s0);
}
function finishPoly(p: Poly, n: number, closed: boolean, s0: number): void {
  polyGen = (polyGen + 1) & 0x3fffffff;
  if (closed && n > 2 && Math.abs(p.x[0] - p.x[n - 1]) + Math.abs(p.y[0] - p.y[n - 1]) < 1e-12) n--;
  p.n = n; p.closed = closed;
  p.nseg = closed ? n : Math.max(0, n - 1);
  p.s0 = s0; p.len = 0;
  if (n > 0) p.s[0] = s0;
  let ax0 = Infinity; let ay0 = Infinity; let ax1 = -Infinity; let ay1 = -Infinity;
  for (let k = 0; k < p.nseg; k++) {
    const b = k + 1 === n ? 0 : k + 1;
    const dx = p.x[b] - p.x[k]; const dy = p.y[b] - p.y[k];
    const l = Math.sqrt(dx * dx + dy * dy);
    p.segLen[k] = l;
    p.dx[k] = dx; p.dy[k] = dy;
    const sx0 = Math.min(p.x[k], p.x[b]); const sx1 = Math.max(p.x[k], p.x[b]);
    const sy0 = Math.min(p.y[k], p.y[b]); const sy1 = Math.max(p.y[k], p.y[b]);
    p.bx0[k] = sx0; p.bx1[k] = sx1; p.by0[k] = sy0; p.by1[k] = sy1;
    if (sx0 < ax0) ax0 = sx0; if (sy0 < ay0) ay0 = sy0; if (sx1 > ax1) ax1 = sx1; if (sy1 > ay1) ay1 = sy1;
    if ((k & 31) === 31 || k === p.nseg - 1) { const bi = k >> 5; p.bk[4 * bi] = ax0; p.bk[4 * bi + 1] = ay0; p.bk[4 * bi + 2] = ax1; p.bk[4 * bi + 3] = ay1; ax0 = Infinity; ay0 = Infinity; ax1 = -Infinity; ay1 = -Infinity; }
    if (k + 1 < n) p.s[k + 1] = p.s[k] + l;
  }
  p.nblk = Math.ceil(p.nseg / 32);
  p.len = n > 0 ? p.s[n - 1] - s0 + (closed ? p.segLen[n - 1] : 0) : 0;
}

function copyPoly(src: Poly, dst: Poly): void {
  polyGen = (polyGen + 1) & 0x3fffffff;
  dst.n = src.n; dst.closed = src.closed; dst.nseg = src.nseg; dst.len = src.len; dst.s0 = src.s0;
  dst.x.set(src.x.subarray(0, src.n)); dst.y.set(src.y.subarray(0, src.n));
  dst.s.set(src.s.subarray(0, src.n)); dst.segLen.set(src.segLen.subarray(0, Math.max(0, src.nseg)));
  dst.dx.set(src.dx.subarray(0, Math.max(0, src.nseg))); dst.dy.set(src.dy.subarray(0, Math.max(0, src.nseg)));
  dst.bx0.set(src.bx0.subarray(0, Math.max(0, src.nseg))); dst.by0.set(src.by0.subarray(0, Math.max(0, src.nseg)));
  dst.bx1.set(src.bx1.subarray(0, Math.max(0, src.nseg))); dst.by1.set(src.by1.subarray(0, Math.max(0, src.nseg)));
  dst.nblk = src.nblk; dst.bk.set(src.bk.subarray(0, 4 * src.nblk));
}




/** pointAt without allocation: out = [x, y, tx, ty]. */
function pointAtInto(p: Poly, s: number, out: Float64Array): void {
  const u = normS(p, s);
  let k = 0; let t = 0;
  if (p.n === 0) { out[0] = 0; out[1] = 0; out[2] = 1; out[3] = 0; return; }
  if (u >= p.s[p.n - 1]) {
    if (p.closed) { k = p.n - 1; t = Math.min(1, Math.max(0, (u - p.s[p.n - 1]) / (p.segLen[p.n - 1] || 1))); }
    else { k = Math.max(0, p.nseg - 1); t = 1; }
  } else {
    let lo = 0; let hi = p.n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p.s[mid] <= u) lo = mid; else hi = mid; }
    k = lo; t = (u - p.s[lo]) / (p.segLen[lo] || 1);
  }
  const b = k + 1 === p.n ? 0 : k + 1;
  const l = p.segLen[k] || 1;
  out[0] = p.x[k] + (p.x[b] - p.x[k]) * t;
  out[1] = p.y[k] + (p.y[b] - p.y[k]) * t;
  out[2] = (p.x[b] - p.x[k]) / l;
  out[3] = (p.y[b] - p.y[k]) / l;
}

/**
 * K1240 S3f r4 (place 1): an end arm's tail. At a T junction (def j3, j1,
 * j151) form B draws the end chain's border on past the corner, over the
 * other arm's tube and round the end chain's round end, wherever the
 * other arm is its own (its cap ramp under 0.5: member() mixes the
 * junction's group in by the ramp) and the end chain's depth key is the
 * higher (z_E - zt > z_X - zt d_X / h: form B's key z - d / K, K = h / zt).
 * S3d and S3f stopped at the corner (worst pixels 8.7-10.2 px). The piece
 * is structural: every corner with an end arm has one, the same pieces
 * every frame. Its extent is the first interval of u where
 * f(u) = min(0.5 - ramp, margin / zt, (h - W - d_X) / h) > 0, u running from
 * the corner's endpoint on E along E's border to E's end, then a quarter
 * of the round beyond; both ends are bisected, so it grows from nothing
 * and moves continuously. Builder and frameFast share this code.
 */
export interface TailIn {
  pE: Poly; dirE: number; endS: number; sT: number; x0: number; y0: number;
  bp: (s: number, out: Float64Array) => void;
  pX: Poly; sRX: number; dirX: number; LX: number; LcutX: number;
  zE: (s: number) => number; zX: (s: number) => number; h: number; zt: number; W: number;
  /** K1283 s4: X's other arm at the junction (X runs through), or null. */
  alt?: { sRX: number; dirX: number; LX: number; LcutX: number } | null;
  /** K1314 s3 (K1049): X's through pass's bend at the junction, rounded (the ok thru corner of
   *  X's two arms): ball centre q, radius r, tangent points ta, tb (tailAlphaAt, bendDist). */
  bend?: { qx: number; qy: number; r: number; tax: number; tay: number; tbx: number; tby: number } | null;
}
const tailPt = new Float64Array(4); const tailCen = new Float64Array(4); const tailFt = new Float64Array(2); const tailBendF = new Float64Array(2);
/** The nearest point of p to (x, y) over the segments covering s in [lo, hi]: out = [s, d].
 *  K1314 s10 (perf): with cap, a caller that only reads a foot nearer than cap starts the
 *  best at cap^2, so the box tests below prune every farther block and segment; a foot
 *  nearer than cap is the same foot, and none gives out[1] = cap (not Infinity). */
function tailFoot(p: Poly, lo: number, hi: number, x: number, y: number, out: Float64Array, cap = Infinity): void {
  const nseg = p.nseg;
  if (nseg <= 0 || p.n < 2) { out[0] = lo; out[1] = Infinity; return; }
  if (tfwP !== p || tfwGen !== polyGen || tfwF[0] !== lo || tfwF[1] !== hi) tailFootWin(p, lo, hi);
  const u0 = tfwF[2]; const span = tfwF[3]; const k = tfwK0;
  let best = cap * cap; let bs = u0; let bk = -1;
  // K1283 s4 (perf): seed the best with the last foot's segment when the walk below
  // visits it (the band's consecutive points sit on one stretch of X), so the box
  // tests prune from the start. Same foot: a tie between segments is a shared vertex,
  // and p.s is a running sum, so either gives the same s.
  if (tailFootP === p && tailFootK < nseg) {
    const kw = tailFootK;
    let off = p.s[kw] - u0; if (p.closed && off < 0) off += p.len;
    if (kw === k || (off > 0 && off < span - 1e-9 && (p.closed || kw > k))) {
      const b = kw + 1 === p.n ? 0 : kw + 1;
      const ax = p.x[kw]; const ay = p.y[kw]; const ex = p.x[b] - ax; const ey = p.y[b] - ay;
      const l2 = ex * ex + ey * ey;
      let t = l2 > 1e-24 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = ax + ex * t - x; const dy = ay + ey * t - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best || cap === Infinity) { best = d2; bs = p.s[kw] + t * (p.segLen[kw] || 0); bk = kw; }
    }
  }
  // K1247 s29 (perf): the window's segments in the walk's order, 8 to a box. A group whose
  // box is no nearer than the best holds only segments whose own boxes are no nearer (the
  // group's box is their union: float min / max and subtraction are monotone), which the
  // segment test below skips: the same projections, in the same order, the same feet.
  const K = tfwK; const B = tfwB; const n = tfwN;
  for (let j = 0, g = 0; j < n; j += TFW_G, g += 4) {
    const gx = B[g] - x > 0 ? B[g] - x : x - B[g + 2] > 0 ? x - B[g + 2] : 0;
    const gy = B[g + 1] - y > 0 ? B[g + 1] - y : y - B[g + 3] > 0 ? y - B[g + 3] : 0;
    if (gx * gx + gy * gy >= best) continue;
    const jEnd = j + TFW_G < n ? j + TFW_G : n;
    for (let i = j; i < jEnd; i++) {
      const kk = K[i];
      // K1283 s4 (perf): the segment's box holds it, so a box no nearer than the best
      // cannot win the strict < below; skip the projection (same feet, cheaper walk).
      const qx = p.bx0[kk] - x > 0 ? p.bx0[kk] - x : x - p.bx1[kk] > 0 ? x - p.bx1[kk] : 0;
      const qy = p.by0[kk] - y > 0 ? p.by0[kk] - y : y - p.by1[kk] > 0 ? y - p.by1[kk] : 0;
      if (qx * qx + qy * qy < best) {
        const b = kk + 1 === p.n ? 0 : kk + 1;
        const ax = p.x[kk]; const ay = p.y[kk]; const ex = p.x[b] - ax; const ey = p.y[b] - ay;
        const l2 = ex * ex + ey * ey;
        let t = l2 > 1e-24 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = ax + ex * t - x; const dy = ay + ey * t - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) { best = d2; bs = p.s[kk] + t * (p.segLen[kk] || 0); bk = kk; }
      }
    }
  }
  if (bk >= 0) { tailFootP = p; tailFootK = bk; }
  out[0] = normS(p, bs); out[1] = Math.sqrt(best);
}
let tailFootP: Poly | null = null;
let tailFootK = 0;
/** K1247 s29 (perf): tailFoot's window, built once per (poly, lo, hi). A tail's feet (tailF,
 *  tailAlphaAt: lo .. lo + 8h on X, a few hundred per tail) and runRootRamp's (an arm's
 *  +-4h) search one window of one poly, and the walk visits the same segments whatever the
 *  point: tfwK lists them in the walk's order (its sum, stop and guard, step for step) and
 *  tfwB boxes each TFW_G of them. polyGen (finishPoly, copyPoly) retires a refilled poly's. */
let polyGen = 0;
const TFW_G = 8;
let tfwP: Poly | null = null; let tfwGen = -1; let tfwN = 0; let tfwK0 = 0;
const tfwF = new Float64Array(4); // lo, hi, u0, span
let tfwK = new Int32Array(256); let tfwB = new Float64Array(128);
function tailFootWin(p: Poly, lo: number, hi: number): void {
  const nseg = p.nseg;
  const span = Math.min(hi - lo, p.closed ? p.len : Infinity);
  const u0 = normS(p, lo);
  let k = segOfS(p, u0).k;
  let walked = p.s[k] - u0;
  if (tfwK.length < nseg + 1) tfwK = new Int32Array(2 * (nseg + 1));
  const K = tfwK; tfwK0 = k;
  let n = 0;
  for (let guard = 0; guard <= nseg; guard++) {
    K[n++] = k;
    walked += p.segLen[k] || 0;
    if (walked >= span) break;
    if (k + 1 >= nseg) { if (!p.closed) break; k = 0; } else k++;
  }
  const ng = Math.ceil(n / TFW_G);
  if (tfwB.length < 4 * ng) tfwB = new Float64Array(8 * ng);
  const B = tfwB;
  for (let g = 0; g < ng; g++) {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    const jEnd = Math.min(n, (g + 1) * TFW_G);
    for (let i = g * TFW_G; i < jEnd; i++) {
      const kk = K[i];
      if (p.bx0[kk] < x0) x0 = p.bx0[kk];
      if (p.by0[kk] < y0) y0 = p.by0[kk];
      if (p.bx1[kk] > x1) x1 = p.bx1[kk];
      if (p.by1[kk] > y1) y1 = p.by1[kk];
    }
    B[4 * g] = x0; B[4 * g + 1] = y0; B[4 * g + 2] = x1; B[4 * g + 3] = y1;
  }
  tfwN = n; tfwP = p; tfwGen = polyGen;
  tfwF[0] = lo; tfwF[1] = hi; tfwF[2] = u0; tfwF[3] = span;
}
function tailAt(a: TailIn, l1: number, u: number, out: Float64Array, cen: Float64Array, needCen = true): number {
  if (u <= l1) {
    const s = a.sT - a.dirE * u;
    a.bp(s, out); if (needCen) pointAtInto(a.pE, s, cen);
    return s;
  }
  pointAtInto(a.pE, a.endS, cen);
  a.bp(a.endS, out);
  const rx = out[0] - cen[0]; const ry = out[1] - cen[1];
  const phi = Math.min(0.5 * Math.PI, (u - l1) / a.h);
  const c = Math.cos(phi); const sn = Math.sin(phi);
  out[0] = cen[0] + rx * c - a.h * a.dirE * cen[2] * sn;
  out[1] = cen[1] + ry * c - a.h * a.dirE * cen[3] * sn;
  return a.endS;
}
/** X's cap ramp at its foot s (1 deep in the junction's group, 0 on its own
 *  run), or -1 behind X's arm start. K1283 s4: with `useAlt`, a foot behind
 *  X's arm start that lies on X's other arm at the junction (X runs through)
 *  takes that arm's ramp: the round end's border (the tail's quarter circle
 *  about E's end) goes on past the junction's centre, where its foot on X
 *  moves to X's other arm, instead of stopping there. */
function tailRamp(a: TailIn, sF: number, useAlt = false): number {
  const r = rampOn(a.pX, a.sRX, a.dirX, a.LX, a.LcutX, a.h, sF);
  return r < 0 && useAlt && a.alt ? rampOn(a.pX, a.alt.sRX, a.alt.dirX, a.alt.LX, a.alt.LcutX, a.h, sF) : r;
}
function rampOn(pX: Poly, sRX: number, dirX: number, LX: number, LcutX: number, h: number, sF: number): number {
  let ad = (sF - sRX) * dirX;
  const len = pX.len;
  if (pX.closed && len > 0) { ad %= len; if (ad > len / 2) ad -= len; if (ad < -len / 2) ad += len; }
  if (ad < 0) return -1;
  if (ad > LX) return 0;
  if (!Number.isFinite(LcutX)) return 1;
  let t = (ad - LcutX) / -h; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}
// K1247 s29 (perf): endTailPts's two walks sample f on one grid (u = U i / TAIL_N, the same
// a and l1), and a grid point's E position (tailAt) and foot on X (tailFoot: a function of
// the point and the window, see its seed's note) do not depend on the walk's cuts. The band
// walk records them by grid index (tgMode 1) and the fill walk reads them (tgMode 2): the
// same sE, sF and dF, without the second tailAt and tailFoot (tgMode, tgS, tgOk: after TAIL_N).
function tailF(a: TailIn, l1: number, u: number, rampCut: number, marginCut: number, useAlt = false, wCut = a.W, gi = -1): number {
  const h = a.h;
  let sE: number; let sF: number; let dF: number;
  if (gi >= 0 && tgMode === 2 && tgOk[gi] === 1) { sE = tgS[3 * gi]; sF = tgS[3 * gi + 1]; dF = tgS[3 * gi + 2]; }
  else {
    sE = tailAt(a, l1, u, tailPt, tailCen, false);
    const lo = a.dirX > 0 ? a.sRX - 2 * h : a.sRX - 6 * h;
    // K1247 s29: capped at h. Below the cap the foot is the uncapped one (the first segment in
    // walk order to reach the minimum); at or past it dF reads h, and every reader of f takes
    // only its sign, which is <= 0 there either way (fW = (h - W - dF) / h < 0).
    tailFoot(a.pX, lo, lo + 8 * h, tailPt[0], tailPt[1], tailFt, h);
    sF = tailFt[0]; dF = tailFt[1];
    if (gi >= 0 && tgMode === 1) { tgS[3 * gi] = sE; tgS[3 * gi + 1] = sF; tgS[3 * gi + 2] = dF; tgOk[gi] = 1; }
  }
  const ramp = tailRamp(a, sF, useAlt);
  if (ramp < 0) return -1;
  // Callers read only f's sign, so a term at or below 0 settles it before
  // the two depth lookups (r4 timing: same output, less piece emission).
  const fR = rampCut - ramp; if (!(fR > 0)) return fR;
  const fW = (h - wCut - dF) / h; if (!(fW > 0)) return fW;
  // K1283 s4: the band's walk has no depth cut (marginCut -Infinity): with
  // zt > 0 the margin term is +Infinity whatever it is, so skip its lookups.
  if (marginCut === -Infinity && a.zt > 0) return Math.min(fR, fW);
  const margin = a.zE(sE) - a.zt - a.zX(sF) + (a.zt * dF) / h;
  return Math.min(fR, a.zt > 0 ? margin / a.zt - marginCut : margin > 0 ? 1 : -1, fW);
}
/** K1283 s3: a tail point's alpha, at the band's outer edge (out[0]) and
 *  inner edge (out[1], W nearer E's centre). Form B composites E's surface
 *  and X's by their cone keys (z - d zt / h, each at its own foot of the
 *  point: X's depth can move fast along X, so the inner edge takes its own
 *  foot) with the tie mix, so E's border shows at sstep(-zt, zt, keyE - keyX)
 *  where X covers; and only in the configurations where X is its own, by the
 *  member weight 1 - ramp (in the group's, the union has no border there).
 *  Across X's border band (g = (h - dF) / W) it blends to 1. */
/*  K1283 s4: (x0, y0) is the point the band DRAWS (the walk's point plus its
 *  blend toward the corner's point, tailWalk's push) and tailCen its centre
 *  (push leaves it there), so the alpha is form B's at the drawn band. At the
 *  border point instead, a fallback corner whose point lies inside X drew a
 *  tail start at alpha 1 inside X's fill (def j45, j54: a dark blot where
 *  form B has nothing). */
function tailAlpha(a: TailIn, sE: number, x0: number, y0: number, out: Float64Array, side: boolean, own = false): void {
  const h = a.h; const zE = a.zE(sE);
  let nx = tailCen[0] - x0; let ny = tailCen[1] - y0; const nl = Math.sqrt(nx * nx + ny * ny);
  if (nl > 1e-12) { nx /= nl; ny /= nl; } else { nx = 0; ny = 0; }
  // The band interpolates its two edges' alphas linearly, while form B's
  // tie mix is a smoothstep of a key gap that can move fast across the band
  // (X's depth changes steeply near a crossing): sample a quarter in from
  // each edge and extend the line through them to the edges (the least-
  // squares line of a profile that saturates inside the band).
  const aQ = tailAlphaAt(a, x0 + nx * a.W * 0.25, y0 + ny * a.W * 0.25, zE - (a.zt * (h - a.W * 0.25)) / h, side, own);
  const aR = tailAlphaAt(a, x0 + nx * a.W * 0.75, y0 + ny * a.W * 0.75, zE - (a.zt * (h - a.W * 0.75)) / h, side, own);
  const o0 = 1.5 * aQ - 0.5 * aR; const o1 = 1.5 * aR - 0.5 * aQ;
  out[0] = o0 < 0 ? 0 : o0 > 1 ? 1 : o0; out[1] = o1 < 0 ? 0 : o1 > 1 ? 1 : o1;
}
/** K1314 s3 (K1049): d_X at (x, y) with X's bend rounded. Inside the bend's cone (from the ball's
 *  centre q between its tangent points), on q's side of X's centreline, X's inner edge is the arc,
 *  not the sharp corner: d = min(d, max(0, h - (|p - q| - r))). On the cone's edges that is d itself
 *  (the ball meets each border along its normal), so the fade moves with the arc and nowhere else. */
function bendDist(a: TailIn, b: NonNullable<TailIn["bend"]>, x: number, y: number, sF: number, dF: number): number {
  const px = x - b.qx; const py = y - b.qy;
  const ax = b.tax - b.qx; const ay = b.tay - b.qy; const bx = b.tbx - b.qx; const by = b.tby - b.qy;
  const cT = ax * by - ay * bx;
  if ((ax * py - ay * px) * cT < 0 || (px * by - py * bx) * cT < 0) return dF;
  pointAtInto(a.pX, sF, tailBendF);
  if ((x - tailBendF[0]) * (b.qx - tailBendF[0]) + (y - tailBendF[1]) * (b.qy - tailBendF[1]) <= 0) return dF;
  const dA = a.h - (Math.sqrt(px * px + py * py) - b.r);
  return Math.min(dF, dA > 0 ? dA : 0);
}
function tailAlphaAt(a: TailIn, x: number, y: number, keyE: number, side: boolean, own = false): number {
  const h = a.h;
  const lo = a.dirX > 0 ? a.sRX - 2 * h : a.sRX - 6 * h;
  // K1247 s29: capped at h without a bend: past h the alpha is `own ? 1 : 0` whatever the foot
  // (g = 0); a bend reads sF, so it keeps the true foot.
  tailFoot(a.pX, lo, lo + 8 * h, x, y, tailFt, a.bend ? Infinity : h);
  const sF = tailFt[0]; const dF = a.bend ? bendDist(a, a.bend, x, y, sF, tailFt[1]) : tailFt[1];
  const ramp = tailRamp(a, sF, true);
  // K1283 s9: `own` = a run's point (runEndFade): outside X's tube, or past
  // X's arm, it is E's own border, at 1.
  if (ramp < 0) return own ? 1 : 0;
  const g = Math.min(1, Math.max(0, (h - dF) / a.W));
  // K1283 s4: outside X's tube the band is not X's to fade: E's own arcs
  // draw E's border there, and at a fallback corner or the round end's far
  // edge the point lies in fill form B leaves bare (def j45, j54 blots).
  if (!(g > 0)) return own ? 1 : 0;
  // Along E's side (u <= l1) X's border band is the union's corner, which X's
  // own arcs draw; E's border there lies in fill form B leaves bare when X is
  // in the junction's group (stage 3's cut: (h - W - d_X) / h > 0).
  if (side && g < 1 && ramp >= 1) return 0;
  // One chain is one surface in form B: E's border never shows inside X's.
  if (a.pE === a.pX) return side && g < 1 ? (1 - ramp) * (1 - g) : 1 - g;
  const m = keyE - (a.zX(sF) - (a.zt * dF) / h);
  let t = a.zt > 0 ? (m + a.zt) / (2 * a.zt) : m > 0 ? 1 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const al = 1 - g * (1 - (1 - ramp) * t * t * (3 - 2 * t));
  return side && g < 1 ? (1 - ramp) * al : al;
}
/** K1283 s3: where a tail is drawn. Stage 2 drew it at alpha 1 and cut it at
 *  ramp 0.5 and a depth margin of 0.4 zt (form B's burial is soft: tie alpha
 *  0.5 at margin 0); the tail now carries form B's alpha (tailAlpha), so it
 *  runs on to where that alpha reaches 0: ramp 1, margin -zt. Its FILL keeps
 *  stage 2's cut (TAIL_FILL_*): past it the end arm lies over the junction's
 *  fan, and a fill tail run on to alpha 0 there put steps on the fan's edge
 *  (k1278s2_seam --fbstep: junc|tail 31 -> 255 on muse_hash), while form B's
 *  surface there is the fan's anyway (the tail's key is below X's). */
/** K1283 s4: the band's walk goes on wherever the point lies inside X's tube
 *  (dF < h): no ramp or depth cut, since tailAlpha already fades it (1 - g at
 *  ramp 1, form B's union border in the junction's group). */
const TAIL_BAND_RAMP_CUT = 2;
const TAIL_BAND_MARGIN = -Infinity;
const TAIL_FILL_RAMP_CUT = 0.5;
const TAIL_FILL_MARGIN = 0.4;
const TAIL_N = 16;
const TAIL_BISECT = 12;
const TAIL_BLEND = 0.5;
const tailA = new Float64Array(2);
// tailF's grid record: tgS holds sE, sF, dF per grid index.
let tgMode = 0;
const tgS = new Float64Array(3 * (TAIL_N + 1));
const tgOk = new Uint8Array(TAIL_N + 1);
/** A tail's border points (pts, cpts, alpha: its band) and, given `fill`,
 *  the stretch its fill covers (fill_tri reads OutlinePiece.fpts). */
export function endTailPts(a: TailIn, pts: number[], cpts: number[], alpha?: number[], fill?: { pts: number[]; cpts: number[] }): void {
  if (!(a.h > 0) || !Number.isFinite(a.sT)) return;
  // K1283 s4: the band goes on past X's arm start (tailRamp's useAlt); the
  // fill keeps stage 2's cut (fill_tri's round end, DiskItem, covers it).
  const o = pts.length;
  tgOk.fill(0); tgMode = fill ? 1 : 0;
  tailWalk(a, TAIL_BAND_RAMP_CUT, TAIL_BAND_MARGIN, pts, cpts, alpha, true, 0);
  if (TAIL_LOOP_CUT) cutTailLoop(pts, cpts, alpha, o);
  if (fill) { tgMode = 2; tailWalk(a, TAIL_FILL_RAMP_CUT, TAIL_FILL_MARGIN, fill.pts, fill.cpts); }
  tgMode = 0;
}
/** K1314 s10 (j71's step): the tail's walk along E's border is E's offset
 *  curve, which folds into a swallowtail where E's centreline turns tighter
 *  than h (near E's end): the walk runs past the cusp and back, its legs
 *  cross, and the band paints the loop between them as a hard-edged kite
 *  (g41_user_tw64 j71, (5.06-5.19, 7.79-7.95)). Form B's border is the
 *  iso-line d = h, which has no loop: cut the loop out at the legs' crossing
 *  (cpts and alpha taken along the first leg there). Only a walk that turns
 *  back (two segments with a negative dot) is searched. A walk that turns
 *  back with no sampled crossing (a hook: the swallowtail is narrower than
 *  the walk's step) goes to cutTailHooks (K1344). */
const TAIL_LOOP_CUT = true;
function cutTailLoop(pts: number[], cpts: number[], alpha: number[] | undefined, o: number): void {
  const n = (pts.length - o) >> 1;
  if (n < 4) return;
  let cusp = -1;
  for (let i = 1; i < n - 1 && cusp < 0; i++) {
    const q = o + 2 * i;
    if ((pts[q] - pts[q - 2]) * (pts[q + 2] - pts[q]) + (pts[q + 1] - pts[q - 1]) * (pts[q + 3] - pts[q + 1]) < 0) cusp = i;
  }
  if (cusp < 0 || (alpha && alpha.length !== pts.length)) return;
  // The smallest loop around the cusp: segment i (points i, i + 1) before it
  // against segment k after it, by span k - i.
  for (let span = 2; span < n - 1; span++) {
    for (let i = Math.max(0, cusp - span); i < cusp && i + span <= n - 2; i++) {
      const k = i + span;
      if (k < cusp) continue;
      const a0 = o + 2 * i; const b0 = o + 2 * k;
      const ax = pts[a0]; const ay = pts[a0 + 1]; const ux = pts[a0 + 2] - ax; const uy = pts[a0 + 3] - ay;
      const bx = pts[b0]; const by = pts[b0 + 1]; const vx = pts[b0 + 2] - bx; const vy = pts[b0 + 3] - by;
      const den = ux * vy - uy * vx;
      if (Math.abs(den) < 1e-18) continue;
      const wx = bx - ax; const wy = by - ay;
      const s = (wx * vy - wy * vx) / den; const t = (wx * uy - wy * ux) / den;
      if (!(s >= 0 && s <= 1 && t >= 0 && t <= 1)) continue;
      const cx = cpts[a0] + s * (cpts[a0 + 2] - cpts[a0]); const cy = cpts[a0 + 1] + s * (cpts[a0 + 3] - cpts[a0 + 1]);
      // Points i + 1 .. k become the crossing.
      pts.splice(a0 + 2, 2 * span, ax + s * ux, ay + s * uy);
      cpts.splice(a0 + 2, 2 * span, cx, cy);
      if (alpha) {
        const p0 = alpha[a0] + s * (alpha[a0 + 2] - alpha[a0]); const p1 = alpha[a0 + 1] + s * (alpha[a0 + 3] - alpha[a0 + 1]);
        alpha.splice(a0 + 2, 2 * span, p0, p1);
      }
      return;
    }
  }
  // No sampled crossing: the walk may still turn back in a hook (K1344): E's border's swallowtail is
  // narrower than the walk's step, so the legs never cross between samples (muse_hash j116).
  cutTailHooks(pts, cpts, alpha, o, cusp);
}
/** K1344: a hook's turn-back counts when both its steps are at least this (world; 0.16 px at 160 ppu):
 *  cutTailLoop's crossing splice leaves sub-pixel jogs, which fold nothing visible. */
const TAIL_HOOK_MIN = 0.001;
/** K1344: cut the hooks of a tail walk that cutTailLoop found no crossing in, first at cusp, then each
 *  later turn-back, at most TAIL_HOOK_ROUNDS. A hook folds the band over itself: two or three of its quads
 *  ink one spot, a dark crease (muse_hash j116, p1952: E's border's swallowtail at the END arm's join;
 *  j104, p1927: the swallowtail right at sT). A hook at point 1 (point 0, the join, lies ahead of it)
 *  loses point 1. Elsewhere the cusp moves to where the out-leg (cusp + 1, cusp + 2), extended back by at
 *  most the back step, crosses the in-leg (cusp - 1, cusp), cpts and alpha along the in-leg; failing that,
 *  the cusp point goes. Either way the walk then runs forward through the hook, as form B's iso-line does. */
const TAIL_HOOK_ROUNDS = 8;
function cutTailHooks(pts: number[], cpts: number[], alpha: number[] | undefined, o: number, cusp: number): void {
  const at = (i: number): number => o + 2 * i;
  const back = (i: number): boolean => {
    const q = at(i);
    const ax = pts[q] - pts[q - 2]; const ay = pts[q + 1] - pts[q - 1]; const bx = pts[q + 2] - pts[q]; const by = pts[q + 3] - pts[q + 1];
    return ax * bx + ay * by < 0 && Math.min(Math.hypot(ax, ay), Math.hypot(bx, by)) >= TAIL_HOOK_MIN;
  };
  const drop = (i: number): void => {
    pts.splice(at(i), 2); cpts.splice(at(i), 2);
    if (alpha) alpha.splice(at(i), 2);
  };
  let c = cusp;
  for (let round = 0; round < TAIL_HOOK_ROUNDS; round++) {
    const n = (pts.length - o) >> 1;
    while (c < n - 1 && !back(c)) c++;
    if (c >= n - 1 || n < 4) return;
    if (c === 1) { drop(1); continue; }
    let cut = false;
    if (c + 2 < n) {
      const a0 = at(c - 1); const b0 = at(c + 1);
      const ax = pts[a0]; const ay = pts[a0 + 1]; const ux = pts[a0 + 2] - ax; const uy = pts[a0 + 3] - ay;
      const bx = pts[b0]; const by = pts[b0 + 1]; const vx = pts[b0 + 2] - bx; const vy = pts[b0 + 3] - by;
      const den = ux * vy - uy * vx;
      if (Math.abs(den) > 1e-18) {
        const wx = bx - ax; const wy = by - ay;
        const s = (wx * vy - wy * vx) / den; const t = (wx * uy - wy * ux) / den;
        const bk = Math.hypot(pts[b0] - pts[b0 - 2], pts[b0 + 1] - pts[b0 - 1]);
        if (s >= 0 && s < 1 - 1e-6 && t <= 0 && -t * Math.hypot(vx, vy) <= bk) {
          const q = a0 + 2;
          pts[q] = ax + s * ux; pts[q + 1] = ay + s * uy;
          cpts[q] = cpts[a0] + s * (cpts[q] - cpts[a0]); cpts[q + 1] = cpts[a0 + 1] + s * (cpts[q + 1] - cpts[a0 + 1]);
          if (alpha) { alpha[q] = alpha[a0] + s * (alpha[q] - alpha[a0]); alpha[q + 1] = alpha[a0 + 1] + s * (alpha[q + 1] - alpha[a0 + 1]); }
          cut = true;
        }
      }
    }
    if (!cut) { if (n <= 4) return; drop(c); }
    c = Math.max(1, c - 1);
  }
}
function tailWalk(a: TailIn, rampCut: number, marginCut: number, pts: number[], cpts: number[], alpha?: number[], useAlt = false, wCut = a.W): void {
  const l1 = Math.max(0, a.dirE * (a.sT - a.endS));
  const U = l1 + 0.5 * Math.PI * a.h;
  // gi: u's grid index (u = U gi / TAIL_N), -1 off the grid (tailF's tgMode).
  const f = (u: number, gi = -1): number => tailF(a, l1, u, rampCut, marginCut, useAlt, wCut, gi);
  // Bisect a sign change of f on [u0, u1]; want = the side f > 0 is on (0: u0, 1: u1).
  const cut = (u0: number, u1: number, posAt1: boolean): number => {
    let lo = u0; let hi = u1;
    for (let it = 0; it < TAIL_BISECT; it++) {
      const m = 0.5 * (lo + hi);
      const pos = f(m) > 0;
      if (pos === posAt1) hi = m; else lo = m;
    }
    return posAt1 ? hi : lo;
  };
  // K1247 s10: the tail leaves the corner's point (x0, y0), which a fallback corner offsets
  // off the border, and blends into the border over TAIL_BLEND h, so a tail whose margin
  // crosses zero near u = 0 draws a point at (x0, y0), not a connector to the border that
  // comes and goes with the margin's sign.
  a.bp(a.sT, tailPt); const offX = a.x0 - tailPt[0]; const offY = a.y0 - tailPt[1];
  const push = (u: number): void => {
    let sE: number; let px: number; let py: number;
    if (u === 0) { pointAtInto(a.pE, a.sT, tailCen); sE = a.sT; px = a.x0; py = a.y0; }
    else {
      sE = tailAt(a, l1, u, tailPt, tailCen);
      let t = 1 - u / (TAIL_BLEND * a.h); t = t < 0 ? 0 : t; const w = t * t * (3 - 2 * t);
      px = tailPt[0] + offX * w; py = tailPt[1] + offY * w;
    }
    pts.push(px, py); cpts.push(tailCen[0], tailCen[1]);
    if (alpha) { tailAlpha(a, sE, px, py, tailA, u <= l1); alpha.push(tailA[0], tailA[1]); }
  };
  let i = 0;
  let prevU = 0;
  if (!(f(0, 0) > 0)) {
    for (i = 1; i <= TAIL_N; i++) {
      const u = (U * i) / TAIL_N;
      if (f(u, i) > 0) break;
      prevU = u;
    }
    if (i > TAIL_N) return;
    prevU = cut(prevU, (U * i) / TAIL_N, true);
  }
  push(prevU);
  for (i = Math.max(1, i); i <= TAIL_N; i++) {
    const u = (U * i) / TAIL_N;
    if (u <= prevU) continue;
    if (!(f(u, i) > 0)) { push(cut(prevU, u, false)); return; }
    push(u);
    prevU = u;
  }
}


/** tanAt without allocation: out = [tx, ty] (vertex tangents lerped). */
const tanScratch0 = new Float64Array(2);
const tanScratch1 = new Float64Array(2);
function tanAtInto(p: Poly, s: number, out: Float64Array): void {
  const u = normS(p, s);
  let k = 0; let t = 0;
  if (p.n === 0) { out[0] = 1; out[1] = 0; return; }
  if (u >= p.s[p.n - 1]) {
    if (p.closed) { k = p.n - 1; t = Math.min(1, Math.max(0, (u - p.s[p.n - 1]) / (p.segLen[p.n - 1] || 1))); }
    else { k = Math.max(0, p.nseg - 1); t = 1; }
  } else {
    let lo = 0; let hi = p.n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p.s[mid] <= u) lo = mid; else hi = mid; }
    k = lo; t = (u - p.s[lo]) / (p.segLen[lo] || 1);
  }
  const kb = k + 1 === p.n ? 0 : k + 1;
  const l0 = p.segLen[k] || 1;
  const stx = p.dx[k] / l0; const sty = p.dy[k] / l0;
  const vtx = (i: number, o: Float64Array): void => {
    const kin = i > 0 ? i - 1 : p.closed ? p.nseg - 1 : -1;
    const kout = i < p.nseg ? i : p.closed ? 0 : -1;
    let x = 0; let y = 0;
    for (const kk of [kin, kout]) {
      if (kk < 0) continue;
      const l = p.segLen[kk] || 1; const b = kk + 1 === p.n ? 0 : kk + 1;
      x += (p.x[b] - p.x[kk]) / l; y += (p.y[b] - p.y[kk]) / l;
    }
    const l = Math.sqrt(x * x + y * y);
    if (l > 1e-12) { o[0] = x / l; o[1] = y / l; } else { o[0] = stx; o[1] = sty; }
  };
  const v0 = tanScratch0; const v1 = tanScratch1;
  vtx(k, v0); vtx(kb, v1);
  const x = v0[0] + (v1[0] - v0[0]) * t; const y = v0[1] + (v1[1] - v0[1]) * t;
  const l = Math.sqrt(x * x + y * y);
  if (l > 1e-12) { out[0] = x / l; out[1] = y / l; } else { out[0] = stx; out[1] = sty; }
}

/** footInWindow's candidate set, written into `out` (no allocation).
 *  Per-segment bounding boxes (filled by fillPoly) prune segments that
 *  cannot beat the current best; that cannot change the minimum. If
 *  `stopAt` >= 0 the search may return once the best is <= stopAt, in
 *  which case the returned distance is only known to be <= stopAt. */
// footWinFast's running best, shared with fwScan (module state: no closure
// per call). fwLim2 = min(best, prune bound): segments whose box is at or
// beyond it cannot be the first segment that reaches the minimum.
// State and arguments live in Float64Arrays: a double in a module let or
// passed to a call that is not inlined is boxed (a heap allocation).
// fwS: bd2, bx, by, bs, bk, pr2, px, py, stop2, rlo, rhi.
// fwA (footWinFast's arguments): px, py, lo, hi, stopAt, initBd, hintLo, hintHi, prune.
const fwS = new Float64Array(11); const fwA = new Float64Array(9);
function fwScan(p: Poly, stopOn: boolean): void {
  const S = fwS; const px = S[6]; const py = S[7]; const stop2 = S[8]; const rlo = S[9]; const rhi = S[10];
  let bd2 = S[0]; let bx = S[1]; let by = S[2]; let bs = S[3]; let bk = S[4]; const pr2 = S[5];
  let lim2 = bd2 < pr2 ? bd2 : pr2;
  const closed = p.closed; const len = p.len; const nseg = p.nseg; const ps = p.s; const pl = p.segLen;
  const nblk = p.nblk; const pbk = p.bk; const bx0 = p.bx0; const bx1 = p.bx1; const by0 = p.by0; const by1 = p.by1;
  let si0 = 0; let si1 = 0;
  if (closed && len > 0) { si0 = Math.max(-1, Math.floor((rlo - ps[0]) / len) - 1); si1 = Math.min(1, Math.floor((rhi - ps[0]) / len)); }
  outer: for (let si = si0; si <= si1; si++) {
    const sh = closed ? si * len : 0;
    let a = 0; let b = nseg;
    while (a < b) { const m = (a + b) >> 1; if (ps[m] + pl[m] + sh >= rlo) b = m; else a = m + 1; }
    const k0 = a;
    b = nseg;
    while (a < b) { const m = (a + b) >> 1; if (ps[m] + sh > rhi) b = m; else a = m + 1; }
    for (let k = k0; k < a; k++) {
      if (((k & 31) === 0 || k === k0) && lim2 < Infinity && nblk > 0) {
        const bi = k >> 5;
        if (bi < nblk) {
          const q = 4 * bi;
          const dxb = px < pbk[q] ? pbk[q] - px : px > pbk[q + 2] ? px - pbk[q + 2] : 0;
          const dyb = py < pbk[q + 1] ? pbk[q + 1] - py : py > pbk[q + 3] ? py - pbk[q + 3] : 0;
          if (dxb * dxb + dyb * dyb >= lim2) { k = Math.min(a, (bi + 1) * 32) - 1; continue; }
        }
      }
      if (lim2 < Infinity) {
        const dxb = px < bx0[k] ? bx0[k] - px : px > bx1[k] ? px - bx1[k] : 0;
        const dyb = py < by0[k] ? by0[k] - py : py > by1[k] ? py - by1[k] : 0;
        if (dxb * dxb + dyb * dyb >= lim2) continue;
      }
      const sa = ps[k]; const sb = sa + pl[k];
      const aa = Math.max(rlo, sa + sh); const bb = Math.min(rhi, sb + sh);
      if (bb < aa) continue;
      const l = pl[k] || 1;
      const ta = Math.min(1, Math.max(0, (aa - sh - sa) / l));
      const tb = Math.min(1, Math.max(0, (bb - sh - sa) / l));
      const dxk = p.dx[k]; const dyk = p.dy[k];
      const ax = p.x[k] + dxk * ta; const ay = p.y[k] + dyk * ta;
      const ex2 = dxk * (tb - ta); const ey2 = dyk * (tb - ta);
      const l2 = ex2 * ex2 + ey2 * ey2;
      let tt = l2 > 0 ? ((px - ax) * ex2 + (py - ay) * ey2) / l2 : 0;
      tt = Math.min(1, Math.max(0, tt));
      const qx = ax + ex2 * tt; const qy = ay + ey2 * tt;
      const ddx = px - qx; const ddy = py - qy;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < bd2) {
        const t2 = ta + (tb - ta) * tt; bd2 = d2; bx = qx; by = qy; bs = sa + t2 * pl[k]; bk = k;
        if (bd2 < lim2) lim2 = bd2;
        if (stopOn && bd2 <= stop2) break outer;
      }
    }
  }
  S[0] = bd2; S[1] = bx; S[2] = by; S[3] = bs; S[4] = bk;
}
function footWinFast(p: Poly, out: FFoot): void {
  const A = fwA; const S = fwS;
  const px = A[0]; const py = A[1]; const lo = A[2]; const hi = A[3]; const stopAt = A[4]; const initBd = A[5]; const hintLo = A[6]; const hintHi = A[7]; const prune = A[8];
  S[0] = initBd * initBd; S[1] = px; S[2] = py; S[3] = lo; S[4] = 0;
  if (p.nseg === 0 || hi < lo) { out.d = initBd; out.x = px; out.y = py; out.s = lo; out.k = 0; out.u = lo; return; }
  // A prune bound must be a distance some point of the window reaches (an
  // upper bound on the minimum); inflated so rounding cannot cut the winner.
  S[5] = prune < Infinity ? prune * prune * (1 + 1e-9) + 1e-300 : Infinity;
  const stopOn = stopAt >= 0; const stop2 = stopAt * stopAt;
  S[6] = px; S[7] = py; S[8] = stop2;
  if (Number.isFinite(hintLo) && hintHi > hintLo && hintHi > lo && hintLo < hi) {
    S[9] = Math.max(lo, hintLo); S[10] = Math.min(hi, hintHi); fwScan(p, stopOn);
    if (!(stopOn && S[0] <= stop2)) {
      if (hintLo > lo) { S[9] = lo; S[10] = Math.min(hi, hintLo); fwScan(p, stopOn); }
      if (hintHi < hi && !(stopOn && S[0] <= stop2)) { S[9] = Math.max(lo, hintHi); S[10] = hi; fwScan(p, stopOn); }
    }
  } else { S[9] = lo; S[10] = hi; fwScan(p, stopOn); }
  out.d = Math.sqrt(S[0]); out.x = S[1]; out.y = S[2]; out.s = S[3]; out.k = S[4]; out.u = S[3];
}

/** Closest points of two segments: [t on ab, u on cd, distance squared]. */
function segSegClosest(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): [number, number, number] {
  let bestT = 0; let bestU = 0; let bestD = Infinity;
  const test = (t: number, u: number): void => {
    const px = ax + (bx - ax) * t; const py = ay + (by - ay) * t;
    const qx = cx + (dx - cx) * u; const qy = cy + (dy - cy) * u;
    const d = (px - qx) * (px - qx) + (py - qy) * (py - qy);
    if (d < bestD) { bestD = d; bestT = t; bestU = u; }
  };
  const proj = (px: number, py: number, ex: number, ey: number, fx: number, fy: number): number => {
    const vx = fx - ex; const vy = fy - ey;
    const l2 = vx * vx + vy * vy;
    return l2 > 0 ? Math.min(1, Math.max(0, ((px - ex) * vx + (py - ey) * vy) / l2)) : 0;
  };
  test(0, proj(ax, ay, cx, cy, dx, dy));
  test(1, proj(bx, by, cx, cy, dx, dy));
  test(proj(cx, cy, ax, ay, bx, by), 0);
  test(proj(dx, dy, ax, ay, bx, by), 1);
  return [bestT, bestU, bestD];
}





