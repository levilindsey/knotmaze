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
  look: { halfWidth: number; band: number; cornerRoundShare: number; cuspRadius: number; depthAmp: number; depthWindow: number; paper: string; ink: string; ctrlArc?: number };
  chains: SceneChainIn[];
  crossings: SceneCrossingIn[];
  junctions: SceneJunctionIn[];
  deadEnds: { chain: number; s: number; offscreen?: boolean }[];
}

export type PieceKind = "run" | "arc" | "cap";
export interface OutlinePiece {
  kind: PieceKind;
  chain: number;
  side: number;
  s0: number; s1: number;
  pts: number[];
  cpts: number[];
  region: number;
  corner: number;
}
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
function dS(p: Poly, a: number, b: number): number {
  let d = b - a;
  if (p.closed && p.len > 0) { d %= p.len; if (d > p.len / 2) d -= p.len; if (d < -p.len / 2) d += p.len; }
  return d;
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

interface BPt { x: number; y: number; s: number; rec?: BRec; ev?: unknown }
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
      if (Math.hypot(f.x - l.x, f.y - l.y) > 1e-12) out.push({ x: f.x, y: f.y, s: p.s0 + p.len, rec: f.rec ? { ...f.rec, sOff: p.len } : undefined });
      else { l.s = p.s0 + p.len; if (l.rec) l.rec = { ...l.rec, sOff: p.len }; }
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
 *  on the concave side), searched only inside each bend's s window. */
function cutFolds(p: Poly, pts: BPt[], sig: number, h: number, diag: string[]): BPt[] {
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
  for (const sb of bendClusters) {
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
        for (let j = i + 2; j <= Math.min(i1, out.length - 1); j++) {
          if (j === i + 1) continue;
          // A loop that closes on an endpoint is the closed loop itself.
          if (i === 0 && j === out.length - 1) continue;
          const hit = segInt(out[i].x, out[i].y, out[i + 1].x, out[i + 1].y, out[j - 1].x, out[j - 1].y, out[j].x, out[j].y);
          if (!hit) continue;
          const x = out[i].x + (out[i + 1].x - out[i].x) * hit.t;
          const y = out[i].y + (out[i + 1].y - out[i].y) * hit.t;
          const s = out[i].s + dS(p, out[i].s, out[i + 1].s) * hit.t;
          out = [...out.slice(0, i + 1), { x, y, s, rec: { k: 3, a: out[i], b: out[i + 1], c: out[j - 1], d: out[j], t: hit.t } as BRec }, ...out.slice(j)];
          diag.push(`fold ch${p.id} side${sig} at s=${sb.toFixed(2)}`);
          changed = true;
          break outer;
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The builder.

interface PtRef { pi: number; side: number; x: number; y: number; s: number; idx: number; rec?: BRec }
interface Ev { seg: number; t: number; ref: PtRef }
interface ArmInfo { ji: number; ei: number; pi: number; sR: number; dir: number; kind: string; ux: number; uy: number; ang: number; L: number; Lcut: number; g: number; idx: number }
interface CornerWork extends OutlineCorner { ji: number; aArm: number; bArm: number; sideA: number; sideB: number; sA: number; sB: number; dA: number; dB: number; refA: PtRef | null; refB: PtRef | null; refVA: PtRef | null; refVB: PtRef | null; vKa?: number; vKb?: number; qKa?: number; qKb?: number; vSa?: number; vSb?: number }
interface Station { pi: number; cS: number; left: PtRef; right: PtRef; kind: string; key: string }

export function buildOutline(scene: SceneIn): OutlineTable { return frame(structure(scene), scene); }
export function buildOutlineS2(scene: SceneIn): OutlineTable { return buildOutlineFull(scene).table; }
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
        const f = footInWindow(rawPolys[ti], term.x, term.y, t.s - 4 * h, t.s + 4 * h);
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
  const borderRaw: Border[][] = polys.map((p, pi) => [
    { pi, side: 1, pts: cutFolds(p, buildBorder(p, 1, h), 1, h, foldDiag), closed: p.closed },
    { pi, side: -1, pts: cutFolds(p, buildBorder(p, -1, h), -1, h, foldDiag), closed: p.closed },
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
  const solveEq = (A: ArmInfo, B: ArmInfo, rho: number, x0: number, y0: number, estD?: number): { x: number; y: number; fa: { d: number; x: number; y: number; s: number }; fb: { d: number; x: number; y: number; s: number }; ok: boolean } => {
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
    return { x, y, fa, fb, ok };
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
  const cornerPairs: { ji: number; ai: number; bi: number; style: number }[] = [];
  if (frameMode) {
    for (const dc of dg!.corners) cornerPairs.push({ ji: dc.ji, ai: dc.aArm, bi: dc.bArm, style: dc.style });
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
  const cornerFallback = (cw: CornerWork, A: ArmInfo, B: ArmInfo, th: number): void => {
    const j = scene.junctions[cw.ji];
    let mx = A.ux + B.ux; let my = A.uy + B.uy;
    const ml = Math.sqrt(mx * mx + my * my);
    if (ml < 1e-9) { const ma = Math.atan2(A.uy, A.ux) + th / 2; mx = Math.cos(ma); my = Math.sin(ma); } else { mx /= ml; my /= ml; }
    const Vx = j.c[0] + mx * h; const Vy = j.c[1] + my * h;
    cw.Vx = Vx; cw.Vy = Vy; cw.qx = Vx; cw.qy = Vy; cw.r = 0;
    const bpOf = (arm: ArmInfo, side: number): { x: number; y: number; s: number } => {
      // On the border polyline (interpolated at the root s), so the
      // inserted point never spikes the border.
      const B = borders[arm.pi][bIdx(side)];
      const p = polys[arm.pi];
      let target = arm.sR;
      if (p.closed) { target = normS(p, target); if (target < B.pts[0].s - 1e-9) target += p.len; }
      let lo = 0; let hi = B.pts.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (B.pts[mid].s <= target) lo = mid; else hi = mid; }
      const a = B.pts[lo]; const b = B.pts[Math.min(B.pts.length - 1, lo + 1)];
      const ds = b.s - a.s;
      const t = ds > 1e-12 ? Math.min(1, Math.max(0, (target - a.s) / ds)) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: arm.sR };
    };
    const pa = bpOf(A, cw.sideA); const pb = bpOf(B, cw.sideB);
    cw.tax = pa.x; cw.tay = pa.y; cw.tbx = pb.x; cw.tby = pb.y; cw.sA = pa.s; cw.sB = pb.s; cw.dA = 0; cw.dB = 0;
    cw.refA = addPointAt(A.pi, cw.sideA, pa.x, pa.y, pa.s, { k: 5, corner: cornerWork.length, which: 0 });
    cw.refB = addPointAt(B.pi, cw.sideB, pb.x, pb.y, pb.s, { k: 5, corner: cornerWork.length, which: 1 });
    cw.refVA = cw.refA; cw.refVB = cw.refB;
  };
  for (const cp of cornerPairs) {
      const ji = cp.ji; const j = scene.junctions[ji];
      const ai = cp.ai; const bi = cp.bi;
      const A = arms[ai]; const B = arms[bi];
      const style = cp.style;
      let th = B.ang - A.ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const cross = A.ux * B.uy - A.uy * B.ux;
      const sideA = (cross > 0 ? 1 : -1) * A.dir;
      const sideB = (cross > 0 ? -1 : 1) * B.dir;
      const cw: CornerWork = {
        junction: j.id, aChain: A.pi, bChain: B.pi, ok: false, style, theta: th, r: 0,
        Vx: NaN, Vy: NaN, qx: NaN, qy: NaN, tax: NaN, tay: NaN, tbx: NaN, tby: NaN,
        ji, aArm: ai, bArm: bi, sideA, sideB, sA: 0, sB: 0, dA: 0, dB: 0, refA: null, refB: null, refVA: null, refVB: null,
      };
      const baseIdx = corners.length;
      void baseIdx;
      if (!(A.L > 1e-9 && B.L > 1e-9)) { cw.why = "arm span 0"; if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); continue; }
      // A pair's wedge is the minor sweep between its arms (the
      // junction's other corners take the rest of the circle), so a
      // pair listed past pi still corners on its minor side; thC is
      // continuous through pi.
      const thC = frameMode && th > Math.PI ? 2 * Math.PI - th : th;
      let bx = A.ux + B.ux; let by = A.uy + B.uy;
      const bl = Math.sqrt(bx * bx + by * by) || 1; bx /= bl; by /= bl;
      const sn = Math.sin(thC / 2) || 1;
      const V = solveEq(A, B, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, h / Math.max(Math.tan(thC / 2), 1e-6));
      if (!V.ok) { cw.why = "no V"; if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); if (!frameMode) diagnostics.push(`corner ${j.id}: no V`); continue; }
      const dVa = armDist(A, V.fa.s); const dVb = armDist(B, V.fb.s);
      const tol = 1e-9 * h;
      if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) { cw.why = "V outside spans"; if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); continue; }
      const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
      const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
      const sgn = Math.sign(cross) || 1;
      if (!(crossA * sgn > 0 && crossB * sgn < 0)) { cw.why = "V outside wedge"; if (frameMode) cornerFallback(cw, A, B, th); corners.push(cw); cornerWork.push(cw); continue; }
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
      const v0: TK = { x: V.x, y: V.y, fa: { ...V.fa, u: A.sR + A.dir * dVa }, fb: { ...V.fb, u: B.sR + B.dir * dVb } };
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
      cw.r = r; cw.vKa = V.fa.k; cw.vKb = V.fb.k; cw.qKa = q.fa.k; cw.qKb = q.fb.k; cw.vSa = V.fa.s; cw.vSb = V.fb.s;
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
  scene.crossings.forEach((x, xi) => {
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
        const px = a.x + (b.x - a.x) * hit.t; const py = a.y + (b.y - a.y) * hit.t;
        const uRef = mkRef(U, uSide, px, py, a.s + (b.s - a.s) * hit.t, { k: 4, a, b, c, d, t: hit.t, otherPi: O, otherSide: oSide, eye: -1 });
        const oRef = mkRef(O, oSide, px, py, c.s + (d.s - c.s) * hit.u, { k: 4, a: c, b: d, c: a, d: b, t: hit.u, otherPi: U, otherSide: uSide, eye: -1 });
        addEv(U, uSide, i, hit.t, uRef);
        addEv(O, oSide, j, hit.u, oRef);
        cands.push({ uSide, oSide, x: px, y: py, uRef, oRef, dc: Math.hypot(px - cp.x, py - cp.y) });
      }
    }
    const pairStations: Station[] = [];
    for (const oSide of [1, -1]) {
      const pick = (uSide: number): Cand | null => {
        let best: Cand | null = null;
        for (const c of cands) if (c.uSide === uSide && c.oSide === oSide && (!best || c.dc < best.dc)) best = c;
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
          addEv(e.pi, sa, i, hit.t, mkRef(e.pi, sa, px, py, a.s + (b.s - a.s) * hit.t, { k: 4, a, b, c, d, t: hit.t, otherPi: e.qi, otherSide: sb, eye: eyeCount - 1 }));
          addEv(e.qi, sb, j, hit.u, mkRef(e.qi, sb, px, py, c.s + (d.s - c.s) * hit.u, { k: 4, a: c, b: d, c: a, d: b, t: hit.u, otherPi: e.pi, otherSide: sa, eye: eyeCount - 1 }));
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
  polys.forEach((p, pi) => {
    if (p.closed) {
      const lp = borderPointAt(pi, 1, p.s0); const rp = borderPointAt(pi, -1, p.s0);
      const left = addPointAt(pi, 1, lp.x, lp.y, p.s0);
      const right = addPointAt(pi, -1, rp.x, rp.y, p.s0);
      addStation({ pi, cS: p.s0, left, right, kind: "seam", key: `seam${pi}` });
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
      const steps = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 12)));
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
          out.push({ x: e.ref.x, y: e.ref.y, s: old[i].s + (old[i + 1].s - old[i].s) * e.t, rec: e.ref.rec, ev: e.ref });
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
  interface Interval { pi: number; A: Station; B: Station; cMid: number; len: number; discard: boolean; region: number }
  const intervals: Interval[] = [];
  const stationsOf = new Map<number, Station[]>();
  for (const st of stations) { const l = stationsOf.get(st.pi) ?? []; l.push(st); stationsOf.set(st.pi, l); }
  stationsOf.forEach((list, pi) => {
    const p = polys[pi];
    const sorted = list.slice().sort((a, b) => a.cS - b.cS);
    // Drop exact duplicates in s (keep the first of each kind).
    const uniq: Station[] = [];
    for (const st of sorted) if (!uniq.length || Math.abs(st.cS - uniq[uniq.length - 1].cS) > 1e-9) uniq.push(st);
    const m = uniq.length;
    if (p.closed) {
      for (let i = 0; i < m; i++) {
        const A = uniq[i]; const B = uniq[(i + 1) % m];
        let len = B.cS - A.cS;
        if (len <= 0) len += p.len;
        if (len < 1e-9 || m === 1) { if (m === 1) intervals.push({ pi, A, B, cMid: A.cS + p.len / 2, len: p.len, discard: false, region: -1 }); continue; }
        intervals.push({ pi, A, B, cMid: A.cS + len / 2, len, discard: false, region: -1 });
      }
    } else {
      for (let i = 0; i + 1 < m; i++) {
        const A = uniq[i]; const B = uniq[i + 1];
        const len = B.cS - A.cS;
        if (len < 1e-9) continue;
        intervals.push({ pi, A, B, cMid: A.cS + len / 2, len, discard: false, region: -1 });
      }
    }
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
  for (const iv of intervals) {
    if (iv.discard) continue;
    const pi = iv.pi;
    const p = polys[pi];
    const leftSeq = borderSeq(pi, 1, iv.A.left.idx, iv.B.left.idx, true);
    // The right border is travelled back from B to A (decreasing s),
    // for open and closed chains alike.
    const rightBack = borderSeq(pi, -1, iv.B.right.idx, iv.A.right.idx, false);
    const rightPts = rightBack.pts;
    const rightSegs = rightBack.segs;
    const seq: { x: number; y: number }[] = [];
    seq.push(...leftSeq.pts);
    const capB = capByStation.get(iv.B.key);
    if (capB && iv.B.kind.startsWith("cap")) seq.push(...capB.arc.slice(1, -1));
    seq.push(...rightPts);
    const capA = capByStation.get(iv.A.key);
    if (capA && iv.A.kind.startsWith("cap")) seq.push(...capA.arc.slice(1, -1).reverse());
    const poly = dedupePts(seq);
    if (poly.length < 3) continue;
    const rid = regions.length;
    iv.region = rid;
    for (const sg of leftSeq.segs) segRegion[pi][0][sg] = rid;
    for (const sg of rightSegs) segRegion[pi][1][sg] = rid;
    const flat = poly.flatMap((pt) => [pt.x, pt.y]);
    const mid = pointAt(p, iv.cMid);
    const grp = memberGroup(pi, iv.cMid);
    regions.push({ id: rid, ownerChain: pi, group: grp, pts: flat, pieces: [], hole: false });
    faceWorks.push({ owner: pi, group: grp, pts: flat, sample: [mid.x, mid.y], depth: depthAt(pi, iv.cMid) });
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
  borders.forEach((bs, pi) => {
    bs.forEach((B, bi) => {
      const side = bi === 0 ? 1 : -1;
      const exp = exposed[pi][bi];
      if (frameMode) {
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
            const f = footFlat(pi, pt.s);
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
          const f0 = footFlat(pi, B.pts[i].s);
          cur = { kind: "run", chain: pi, side, s0: B.pts[i].s, s1: B.pts[i + 1].s, pts: [B.pts[i].x, B.pts[i].y], cpts: [f0[0], f0[1]], region: rid, corner: -1 };
        }
        cur.pts.push(B.pts[i + 1].x, B.pts[i + 1].y);
        const f1 = footFlat(pi, B.pts[i + 1].s);
        cur.cpts.push(f1[0], f1[1]);
        cur.s1 = B.pts[i + 1].s;
      }
      flush();
    });
  });
  cornerWork.forEach((cw, ci) => {
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
  if (frameMode) {
    // One cap piece per cap (the diagram's list): exposed arc points
    // in order, covered arc points shrunk onto the nearest exposed
    // arc point, a fully covered cap shrunk to one point on its
    // covering tube's edge. Coverage within 1e-9 of the tube edge
    // counts as exposed, so a knife-edge segment cannot flip the
    // piece under a rigid motion.
    for (let capIdx = 0; capIdx < capInfos.length; capIdx++) {
      const ci = capInfos[capIdx];
      const pi = ci.station.pi;
      const nSeg = Math.max(0, ci.arc.length - 1);
      const cov: boolean[] = [];
      let collapsePt: { x: number; y: number } | null = null;
      for (let i = 0; i < nSeg; i++) {
        const a = ci.arc[i]; const b = ci.arc[i + 1];
        const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
        let c = covering(mx, my, pi, ci.station.cS);
        if (c && coverPickPi.length > 0) {
          const cp = coverPickPi[coverPickPi.length - 1]; const cs2 = coverPickS[coverPickS.length - 1];
          const f = pointAt(polys[cp], cs2);
          const d = Math.hypot(mx - f.x, my - f.y);
          if (d > h - 1e-9) c = false;
          else if (!collapsePt) {
            const dx = mx - f.x; const dy = my - f.y; const dl = Math.sqrt(dx * dx + dy * dy);
            if (dl > 1e-12) collapsePt = { x: f.x + (h * dx) / dl, y: f.y + (h * dy) / dl };
          }
        }
        cov.push(c);
      }
      const expPt: boolean[] = ci.arc.map((_, idx) => (idx > 0 && !cov[idx - 1]) || (idx < nSeg && !cov[idx]));
      let pts: number[]; let cpts: number[];
      if (!expPt.some((v) => v)) {
        // Fully covered: shrink onto this chain's nearest exposed
        // border segment midpoint (where the thread emerges).
        const am = ci.arc[Math.floor(ci.arc.length / 2)];
        let p = collapsePt ?? am;
        let bd = Infinity;
        for (const B of borders[pi]) {
          const bi2 = B.side === 1 ? 0 : 1;
          const expB = exposed[pi][bi2];
          const ptsB = B.pts;
          let lo = 0; let hi = ptsB.length - 1;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ptsB[mid].s <= ci.station.cS) lo = mid; else hi = mid; }
          for (let q = Math.max(0, lo - 96); q <= Math.min(ptsB.length - 1, lo + 96); q++) {
            if (!(expB[Math.min(q, expB.length - 1)] || (q > 0 && expB[q - 1]))) continue;
            const d = (ptsB[q].x - am.x) * (ptsB[q].x - am.x) + (ptsB[q].y - am.y) * (ptsB[q].y - am.y);
            if (d < bd) { bd = d; p = { x: ptsB[q].x, y: ptsB[q].y }; }
          }
        }
        pts = [p.x, p.y]; cpts = [ci.cx, ci.cy];
      } else {
        pts = []; cpts = [];
        for (let idx = 0; idx < ci.arc.length; idx++) {
          let src = idx;
          if (!expPt[idx]) {
            let best = -1; let bd = Infinity;
            for (let q = 0; q < expPt.length; q++) if (expPt[q] && Math.abs(q - idx) < bd) { bd = Math.abs(q - idx); best = q; }
            src = best >= 0 ? best : idx;
          }
          const pt = ci.arc[src];
          const l = pts.length;
          if (l >= 2 && pts[l - 2] === pt.x && pts[l - 1] === pt.y) continue;
          pts.push(pt.x, pt.y); cpts.push(ci.cx, ci.cy);
        }
        if (pts.length < 2) { const p = ci.arc[0]; pts = [p.x, p.y]; cpts = [ci.cx, ci.cy]; }
      }
      pieces.push({ kind: "cap", chain: pi, side: 0, s0: ci.station.cS, s1: ci.station.cS, pts, cpts, region: -1, corner: -1 });
    }
  }
  for (let capIdx = 0; capIdx < capInfos.length; capIdx++) { const ci = capInfos[capIdx];
    if (frameMode) break;
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
    arms.forEach((a, ai) => { markRef(armNextPt[ai]); markRef(armPrevPt[ai]); });
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
      armPts: arms.map((a, ai) => ({
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

export interface DiagramStructure {
  chainIds: number[];
  closed: boolean[];
  nPts: number[];
  crossings: { aPi: number; bPi: number; over: "a" | "b"; emergent: boolean }[];
  arms: { ji: number; ei: number; pi: number; kind: string; dir: number }[];
  armsOfJ: number[][];
  corners: { ji: number; aArm: number; bArm: number; style: number }[];
  groupOfJ: number[];
  caps: { pi: number; atEnd: boolean }[];
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
      arms.push({ ji, ei, pi, kind: a.kind, dir: a.dir });
    });
    armsOfJ.push(list);
    const n = list.length;
    for (let k = 0; k < n; k++) {
      const ai = list[k]; const bi = list[(k + 1) % n];
      const A = arms[ai]; const B = arms[bi];
      const xa = j.arms[A.ei]; const xb = j.arms[B.ei];
      // The two arms of one through pass are one tube: no corner.
      if (xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && xa.s === xb.s) continue;
      corners.push({ ji, aArm: ai, bArm: bi, style: j.corners?.[k]?.style === "sharp" ? 0 : 1 });
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
  scene.chains.forEach((c, pi) => { if (!c.closed) { caps.push({ pi, atEnd: false }); caps.push({ pi, atEnd: true }); } });
  return {
    chainIds: scene.chains.map((c) => c.id),
    closed: scene.chains.map((c) => c.closed),
    nPts: scene.chains.map((c) => c.pts.length >> 1),
    crossings: scene.crossings.flatMap((x) => {
      const aPi = idxOf.get(x.a.chain); const bPi = idxOf.get(x.b.chain);
      return aPi === undefined || bPi === undefined ? [] : [{ aPi, bPi, over: x.over, emergent: !!x.emergent }];
    }),
    arms, armsOfJ, corners, groupOfJ, caps,
  };
}

export function structure(scene: SceneIn): DiagramStructure { return diagramOf(scene); }

/** One frame of the diagram at this scene's positions. Every length,
 *  angle, cut, tangent point, radius and exposure is computed from
 *  `scene` (the builder's geometry, run per frame); the piece list is
 *  the diagram's: one run piece per border segment, one arc piece per
 *  diagram corner, the caps' runs. */
export function frame(st: DiagramStructure, scene: SceneIn, profile?: Record<string, number>): OutlineTable {
  return buildOutlineFull(scene, st, profile).table;
}

interface FArm extends ArmStruct { ux: number; uy: number; ang: number }
interface FFoot { d: number; x: number; y: number; s: number; k: number; u: number }
function copyFoot(dst: FFoot, src: FFoot): void { dst.d = src.d; dst.x = src.x; dst.y = src.y; dst.s = src.s; dst.k = src.k; dst.u = src.u; }
interface WalkCache { valid: boolean; qx: number; qy: number; footStartS: number; footEndS: number; hiS: number; kHi: number; bkHi: number; minF: number; loS: number; kLo: number; bkLo: number; maxB: number; oLo: number; oHi: number }
function mkWalkCache(): WalkCache { return { valid: false, qx: 0, qy: 0, footStartS: 0, footEndS: 0, hiS: 0, kHi: -1, bkHi: 0, minF: Infinity, loS: 0, kLo: -1, bkLo: 0, maxB: -Infinity, oLo: NaN, oHi: NaN }; }
interface FCorner { ok: boolean; Vx: number; Vy: number; qx: number; qy: number; tax: number; tay: number; tbx: number; tby: number; sA: number; sB: number; fax: number; fay: number; fbx: number; fby: number; r: number; theta: number; duA: number; duB: number; dvA: number; dvB: number }

function footNearM(polys: Poly[], h: number, arm: FArm, x: number, y: number, hintS: number, hintK: number, out: FFoot): void {
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
      if (!Number.isFinite(bd2)) { footWinFast(p, x, y, winLoR, winHiR, out); out.u = out.s; return; }
      out.d = Math.sqrt(bd2); out.x = bx; out.y = by; out.s = bs; out.k = bk; out.u = bu;
      const edge = (bu <= lo + 1e-9 * h && lo > winLo) || (bu >= hi - 1e-9 * h && hi < winHi);
      if (!edge || Math.abs(bu - sv) <= 1e-12 * h) return;
      sv = bu; k0 = bk;
    }
}
function frameRt(st: OutlineStructure, scene: SceneIn, profile?: Record<string, number>): OutlineTable {
  const prof = profile;
  let tPhase = prof ? performance.now() : 0;
  const mark = (key: string): void => { if (prof) { const now = performance.now(); prof[key] = (prof[key] ?? 0) + (now - tPhase); tPhase = now; } };
  const h = scene.look.halfWidth;
  const W = scene.look.band;
  const rt = getRuntime(st, scene);
  const polys = rt.polys;
  // Polylines for this frame, written into the runtime's buffers.
  const idxOf = rt.idxOf;
  idxOf.clear();
  scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  rt.needRaw.fill(0);
    for (let i = 0; i < scene.chains.length; i++) { const spec0 = st.extSpec[i]; if (spec0 && (spec0.start || spec0.end)) { rt.needRaw[i] = 1; if (spec0.start) rt.needRaw[spec0.start.throughPi] = 1; if (spec0.end) rt.needRaw[spec0.end.throughPi] = 1; } }
    for (let i = 0; i < scene.chains.length; i++) { if (rt.needRaw[i]) fillPoly(rt.rawPolys[i], scene.chains[i].pts, scene.chains[i].closed, 0); else fillPoly(polys[i], scene.chains[i].pts, scene.chains[i].closed, 0); }
  for (let i = 0; i < scene.chains.length; i++) {
    const c = scene.chains[i];
    const spec = st.extSpec[i];
    if (!spec || (!spec.start && !spec.end)) { if (rt.needRaw[i]) copyPoly(rt.rawPolys[i], polys[i]); fillTangents(rt, polys[i]); continue; }
    const rp = rt.rawPolys[i];
    const cpOf = (sp: { throughPi: number; throughS: number; armS: number }): [number, number] => {
      const term = pointAt(rp, sp.armS);
      const f = footInWindow(rt.rawPolys[sp.throughPi], term.x, term.y, sp.throughS - 4 * h, sp.throughS + 4 * h);
      return [f.x, f.y];
    };
    const n0 = c.pts.length;
    const extPts = rt.extPts;
    let m = 0;
    let s0 = 0;
    if (spec.start) { const cp = cpOf(spec.start); const d = Math.hypot(c.pts[0] - cp[0], c.pts[1] - cp[1]); if (d > 1e-9) { extPts[m++] = cp[0]; extPts[m++] = cp[1]; s0 = -d; } }
    for (let k = 0; k < n0; k++) extPts[m++] = c.pts[k];
    if (spec.end) { const cp = cpOf(spec.end); const d = Math.hypot(c.pts[n0 - 2] - cp[0], c.pts[n0 - 1] - cp[1]); if (d > 1e-9) { extPts[m++] = cp[0]; extPts[m++] = cp[1]; } }
    fillPoly(polys[i], extPts.subarray(0, m), c.closed, s0);
    fillTangents(rt, polys[i]);
  }
  // Depth pins for this frame (sorted by s, in the runtime's buffers).
  const depthWin = scene.look.depthWindow * (scene.look.ctrlArc ?? 1);
  rt.depthN.fill(0);
  scene.crossings.forEach((x) => {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) return;
    const amp = scene.look.depthAmp;
    addPin(rt, ia, normS(polys[ia], x.a.s), x.over === "a" ? amp : -amp);
    addPin(rt, ib, normS(polys[ib], x.b.s), x.over === "b" ? amp : -amp);
  });
  const depthAt = (pi: number, s: number): number => depthAtRt(rt, pi, s, depthWin);
  // Passes, arm roots and arm spans from this frame (the builder's
  // span rule: next root, chain end, crossing cuts with their reach).
  const ptP = new Float64Array(4); const ptQ = new Float64Array(4);
  const ptR = new Float64Array(4); const ptS = new Float64Array(4);
  rt.passN.fill(0);
  scene.crossings.forEach((x) => {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) return;
    const sa = normS(polys[ia], x.a.s); const sb = normS(polys[ib], x.b.s);
    tanAtInto(polys[ia], sa, ptP); tanAtInto(polys[ib], sb, ptQ);
    const theta = Math.acos(Math.min(1, Math.abs(ptP[0] * ptQ[0] + ptP[1] * ptQ[1])));
    let n = rt.passN[ia];
    rt.passS[ia][n] = sa; rt.passSq[ia][n] = sb; rt.passTheta[ia][n] = theta; rt.passQi[ia][n] = ib;
    rt.passN[ia] = n + 1;
    n = rt.passN[ib];
    rt.passS[ib][n] = sb; rt.passSq[ib][n] = sa; rt.passTheta[ib][n] = theta; rt.passQi[ib][n] = ia;
    rt.passN[ib] = n + 1;
  });
  const reachOfF = (pi: number, qi: number, s: number, sq: number, theta: number, dirA: number): number => {
    const t = Math.tan(theta / 2);
    let reach = t > 1e-12 ? h / t : Infinity;
    const fl = 4 * h;
    if (reach > fl) {
      const pa = polys[pi]; const pq = polys[qi];
      tanAtInto(pa, s, ptP); tanAtInto(pq, sq, ptQ);
      const sb = -dirA * (ptP[0] * ptQ[0] + ptP[1] * ptQ[1]) >= 0 ? 1 : -1;
      const aC = 2 * Math.sin(theta / 2); const T = 2 * h * Math.cos(theta / 2);
      const eA = pa.closed ? pa.len / 2 : dirA > 0 ? s - pa.s0 : pa.s0 + pa.len - s;
      let r = aC > 0 ? T / aC : Infinity;
      let e = fl;
      for (let k = 0; k < 2; k++) {
        const ek = Math.max(1e-6, Math.min(e, eA));
        pointAtInto(pa, s - dirA * ek, ptR); pointAtInto(pq, sq + sb * ek, ptS);
        const gx = ptR[0] - ptS[0]; const gy = ptR[1] - ptS[1];
        const g = Math.sqrt(gx * gx + gy * gy);
        const kap = Math.max(0, (2 * (g - aC * ek)) / (ek * ek));
        r = (2 * T) / (aC + Math.sqrt(aC * aC + 2 * kap * T));
        e = Math.max(fl, r);
      }
      reach = Math.min(reach, Math.max(fl, r));
    }
    return reach;
  };
  for (const a of rt.arms) {
    const p = polys[a.pi];
    const sceneArm = scene.junctions[a.ji]?.arms[a.ei];
    if (a.kind === "end") {
      const atStart = sceneArm ? Math.abs(sceneArm.s) < Math.abs(sceneArm.s - rt.rawPolys[a.pi].len) : a.dir > 0;
      a.dir = atStart ? 1 : -1;
      a.sR = atStart ? p.s0 : p.s0 + p.len;
    } else if (sceneArm) a.sR = normS(p, sceneArm.s);
  }
  for (let ai = 0; ai < rt.arms.length; ai++) {
    const a = rt.arms[ai]; const p = polys[a.pi];
    const delta = (sv: number): number => { let d = (sv - a.sR) * a.dir; if (p.closed) d = ((d % p.len) + p.len) % p.len; return d; };
    let L = p.closed ? p.len : a.dir > 0 ? p.s0 + p.len - a.sR : a.sR - p.s0;
    for (const qai of rt.chainArms[a.pi]) { const d = delta(rt.arms[qai].sR); if (d > 1e-9 && d < L) L = d; }
    let Lcut = Infinity; let uB = Infinity;
    const nP = rt.passN[a.pi];
    for (let k = 0; k < nP; k++) {
      const sv = rt.passS[a.pi][k];
      const d = delta(sv);
      const u = p.closed ? p.len - d : -d;
      if (p.closed || d < -1e-12) { if (u >= 0 && u < uB) uB = u; }
      if (d < -1e-12) continue;
      const thP = rt.passTheta[a.pi][k]; const tanP = Math.tan(thP / 2);
      if (!(tanP > 1e-12) || d - h / tanP - h < Lcut) Lcut = Math.min(Lcut, d - reachOfF(a.pi, rt.passQi[a.pi][k], sv, rt.passSq[a.pi][k], thP, a.dir) - h);
    }
    rt.armLroot[ai] = L; rt.armLcut[ai] = Lcut; rt.armUB[ai] = uB;
    a.L = Math.max(0, Math.min(L, Lcut));
  }
  // Arm directions from this frame.
  const arms = rt.arms;
  const ptA = new Float64Array(4); const ptB = new Float64Array(4);
  for (const a of arms) {
    const p = polys[a.pi];
    const sceneArm = scene.junctions[a.ji]?.arms[a.ei];
    const sB = a.kind === "end" && sceneArm ? normS(p, sceneArm.s) : a.sR;
    pointAtInto(p, sB, ptA);
    let s1 = sB + a.dir * 2 * h;
    if (!p.closed) s1 = Math.min(Math.max(s1, p.s0), p.s0 + p.len);
    pointAtInto(p, s1, ptB);
    let ux = ptB[0] - ptA[0]; let uy = ptB[1] - ptA[1];
    const ul = Math.sqrt(ux * ux + uy * uy);
    if (ul < 1e-12) { ux = ptA[2] * a.dir; uy = ptA[3] * a.dir; } else { ux /= ul; uy /= ul; }
    a.ux = ux; a.uy = uy; a.ang = Math.atan2(uy, ux);
  }
  // Arms with a pass behind the root: dEdgeTip span adjustment,
  // from this frame's arm angles (the builder's pendArms pass).
  for (let ji = 0; ji < rt.armsOfJSorted.length; ji++) {
    const l = rt.armsOfJSorted[ji]; const src = st.armsOfJ[ji];
    for (let i = 0; i < src.length; i++) l[i] = src[i];
    l.length = src.length;
    l.sort((x, y) => arms[x].ang - arms[y].ang);
  }
  for (let ai = 0; ai < arms.length; ai++) {
    const uB = rt.armUB[ai];
    if (!(uB < Infinity)) continue;
    const A = arms[ai];
    const list = rt.armsOfJSorted[A.ji];
    const n = list.length;
    if (n < 2) continue;
    const at = list.indexOf(ai);
    if (at < 0) continue;
    const J = scene.junctions[A.ji];
    if (!J) continue;
    let gMax = 0;
    const pairs: [number, number][] = [[list[(at + n - 1) % n], ai], [ai, list[(at + 1) % n]]];
    for (const [aa, bb] of pairs) {
      if (aa === bb) continue;
      const xa = J.arms[arms[aa].ei]; const xb = J.arms[arms[bb].ei];
      if (xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      let th = arms[bb].ang - arms[aa].ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th < Math.PI) gMax = Math.max(gMax, Math.tan((Math.PI - th) / 4));
    }
    const k = gMax > 0 ? Math.min(4, Math.max(1, 1 / gMax)) : 4;
    const c = k * uB;
    if (c < rt.armLcut[ai]) rt.armLcut[ai] = c;
    A.L = Math.max(0, Math.min(rt.armLroot[ai], rt.armLcut[ai]));
  }
  const armDistF = (arm: FArm, s: number): number => {
    const p = polys[arm.pi];
    let d = (s - arm.sR) * arm.dir;
    if (p.closed) d = ((d % p.len) + p.len) % p.len;
    return d;
  };
  mark("setup");
  // Corners: V and q solved from this frame; r follows this frame's angle.
  const sv = { x: 0, y: 0 };
  const gFa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
  const gFb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
  const mFoot: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
  const solveVS2 = (A: FArm, B: FArm, rho: number, x0: number, y0: number, estD: number, fa: FFoot, fb: FFoot, hintUA = NaN, hintUB = NaN): boolean => {
    let x = x0; let y = y0;
    // The builder's V feet are the global nearest feet in the arm
    // window estD +- 4h (footArm), not tracked feet: a tracked foot
    // can sit on the wrong medial branch where the chain curves back.
    const footArmF = (arm: FArm, fx: number, fy: number, out: FFoot, hintU = NaN): void => {
      const p = polys[arm.pi];
      let d0 = Math.max(0, estD - 4 * h); let d1 = Math.min(arm.L, estD + 4 * h);
      if (d1 - d0 < 1e-9) { d0 = 0; d1 = arm.L; }
      const lo = arm.dir > 0 ? arm.sR + d0 : arm.sR - d1;
      const hi = arm.dir > 0 ? arm.sR + d1 : arm.sR - d0;
      footWinFast(p, fx, fy, lo, hi, out, -1, Infinity, hintU - 2 * h, hintU + 2 * h);
      out.u = arm.sR + arm.dir * armDistF(arm, out.s);
    };
    footArmF(A, x, y, fa, hintUA); footArmF(B, x, y, fb, hintUB);
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
      const dl = Math.sqrt(dx * dx + dy * dy);
      if (dl > h) { dx *= h / dl; dy *= h / dl; }
      x += dx; y += dy;
      footArmF(A, x, y, fa, fa.u); footArmF(B, x, y, fb, fb.u);
    }
    sv.x = x; sv.y = y;
    return Math.abs(fa.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(fb.d - rho) < 1e-9 * Math.max(h, rho);
  };
  const ss01 = (x: number): number => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };
  const crF = scene.look.cuspRadius ?? 3;
  const fFa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
  const fFb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
  const qFa: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
  const qFb: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
  const cst = { A: null as unknown as FArm, B: null as unknown as FArm, qx: 0, qy: 0, rhoCur: 0, Vx: 0, Vy: 0, denV: 0, rbEff: 1, r0: 0, wCacheA: mkWalkCache(), wCacheB: mkWalkCache() };
    const advanceTo = (rhoT: number): void => {
      const dN = Math.max(cst.r0 / 32, 1e-12);
      let step = dN;
      let guard = 0;
      while (cst.rhoCur < rhoT - 1e-12 * rhoT && guard++ < 128) {
        const rn = Math.min(rhoT, cst.rhoCur + step);
        const dd = rn - cst.rhoCur;
        let advanced = false;
        if (qFa.d > 1e-12 && qFb.d > 1e-12) {
          const nax = (cst.qx - qFa.x) / qFa.d; const nay = (cst.qy - qFa.y) / qFa.d;
          const nbx = (cst.qx - qFb.x) / qFb.d; const nby = (cst.qy - qFb.y) / qFb.d;
          const den = 1 + nax * nbx + nay * nby;
          if (den > 1e-9) {
            const ux = (nax + nbx) / den; const uy = (nay + nby) / den;
            const gx = cst.qx + ux * dd; const gy = cst.qy + uy * dd;
            const acc = Math.min(h, Math.max(0.5 * Math.sqrt(ux * ux + uy * uy) * dd, 1e-3 * h));
            const tFa = gFa; const tFb = gFb;
            copyFoot(tFa, qFa); copyFoot(tFb, qFb);
            let sx = gx; let sy = gy;
            footNearM(polys, h, cst.A, sx, sy, tFa.u, tFa.k, tFa); footNearM(polys, h, cst.B, sx, sy, tFb.u, tFb.k, tFb);
            for (let it = 0; it < 60; it++) {
              const Fa = tFa.d - rn; const Fb = tFb.d - rn;
              if (Math.abs(Fa) < 1e-12 * Math.max(1, rn) && Math.abs(Fb) < 1e-12 * Math.max(1, rn)) break;
              if (!(tFa.d > 1e-12 && tFb.d > 1e-12)) break;
              const gax = (sx - tFa.x) / tFa.d; const gay = (sy - tFa.y) / tFa.d;
              const gbx = (sx - tFb.x) / tFb.d; const gby = (sy - tFb.y) / tFb.d;
              const det = gax * gby - gay * gbx;
              if (Math.abs(det) < 1e-12) break;
              if (Math.max(Math.abs(Fa), Math.abs(Fb)) < 1e-9 * Math.max(1, rn) && Math.abs(det) >= 0.05) break;
              let dx = (-Fa * gby + Fb * gay) / det;
              let dy = (-Fb * gax + Fa * gbx) / det;
              const dl = Math.sqrt(dx * dx + dy * dy);
              if (dl > acc) { dx *= acc / dl; dy *= acc / dl; }
              sx += dx; sy += dy;
              footNearM(polys, h, cst.A, sx, sy, tFa.u, tFa.k, tFa); footNearM(polys, h, cst.B, sx, sy, tFb.u, tFb.k, tFb);
            }
            const sok = Math.max(Math.abs(tFa.d - rn), Math.abs(tFb.d - rn)) < 1e-9 * Math.max(1, rn);
            if (sok && Math.sqrt((sx - gx) * (sx - gx) + (sy - gy) * (sy - gy)) <= acc) { cst.qx = sx; cst.qy = sy; copyFoot(qFa, tFa); copyFoot(qFb, tFb); cst.rhoCur = rn; advanced = true; }
          }
        }
        if (advanced) step = Math.min(dN, 2 * step);
        else { step /= 2; if (step < 1e-5 * h) break; }
      }
    };
    const marginOfF = (arm: FArm, x: number, y: number, sf: number, dc: number, kFoot: number, cache: WalkCache): number => {
      const pl = polys[arm.pi];
      const winLo = arm.dir > 0 ? arm.sR : arm.sR - arm.L;
      const winHi = arm.dir > 0 ? arm.sR + arm.L : arm.sR;
      const base = sf - normS(pl, sf);
      const TTm = rt.tan[arm.pi]; const TXm = TTm.tx; const TYm = TTm.ty; const GFm = TTm.gF; const GBm = TTm.gB;
      const footStartS = base + pl.s[kFoot];
      const footEndS = footStartS + pl.segLen[kFoot];
      const delta = cache.valid ? Math.sqrt((x - cache.qx) * (x - cache.qx) + (y - cache.qy) * (y - cache.qy)) : Infinity;
      let hi = winHi;
      let minF = Infinity;
      let kHi = -1; let bkHi = 0;
      const resumeF = cache.valid && cache.footStartS <= footStartS && footEndS <= cache.hiS && cache.minF - delta > 0;
      if (resumeF && cache.kHi < 0) { minF = cache.minF - delta; }
      else {
        let k = kFoot; let bk = base;
        if (resumeF) { k = cache.kHi; bk = cache.bkHi; minF = cache.minF - delta; }
        let stopped = false;
        for (let it = 0; it <= pl.nseg; it++) {
          const sv = bk + pl.s[k] + pl.segLen[k];
          if (sv >= winHi) break;
          let k2 = k + 1; let b2 = bk;
          if (k2 >= pl.nseg) { if (!pl.closed) break; k2 = 0; b2 = bk + pl.len; }
          const dotF = GFm[k2] - (x * TXm[k2] + y * TYm[k2]);
          if (dotF < 0) { hi = sv; kHi = k; bkHi = bk; stopped = true; break; }
          if (dotF < minF) minF = dotF;
          k = k2; bk = b2;
        }
        if (!stopped) kHi = -1;
      }
      let lo = winLo;
      let maxB = -Infinity;
      let kLo = -1; let bkLo = 0;
      const resumeB = cache.valid && footStartS <= cache.footStartS && footStartS >= cache.loS && cache.maxB + delta < 0;
      if (resumeB && cache.kLo < 0) { maxB = cache.maxB + delta; }
      else {
        let k = kFoot; let bk = base;
        if (resumeB) { k = cache.kLo; bk = cache.bkLo; maxB = cache.maxB + delta; }
        let stopped = false;
        for (let it = 0; it <= pl.nseg; it++) {
          const sv = bk + pl.s[k];
          if (sv <= winLo) break;
          let k2 = k - 1; let b2 = bk;
          if (k2 < 0) { if (!pl.closed) break; k2 = pl.nseg - 1; b2 = bk - pl.len; }
          const dotB = GBm[k] - (x * TXm[k2] + y * TYm[k2]);
          if (dotB > 0) { lo = sv; kLo = k; bkLo = bk; stopped = true; break; }
          if (dotB > maxB) maxB = dotB;
          k = k2; bk = b2;
        }
        if (!stopped) kLo = -1;
      }
      cache.valid = true; cache.qx = x; cache.qy = y;
      cache.footStartS = footStartS; cache.footEndS = footEndS;
      cache.hiS = hi; cache.kHi = kHi; cache.bkHi = bkHi; cache.minF = minF;
      cache.loS = lo; cache.kLo = kLo; cache.bkLo = bkLo; cache.maxB = maxB;
      // Only d2 relative to dc matters: wOfF's margin gate saturates
      // at dc - 0.05h, so the search may stop once that is proven.
      const stopAt = dc - 0.05 * h;
      let d2 = Infinity;
      if (lo > winLo) { footWinFast(pl, x, y, winLo, lo, mFoot, stopAt, dc, cache.oLo - 2 * h, cache.oLo + 2 * h); d2 = mFoot.d; if (d2 <= dc) cache.oLo = pl.closed && pl.len > 0 ? mFoot.s + Math.round(((winLo + lo) / 2 - mFoot.s) / pl.len) * pl.len : mFoot.s; }
      if (hi < winHi && d2 > stopAt) { footWinFast(pl, x, y, hi, winHi, mFoot, stopAt, dc, cache.oHi - 2 * h, cache.oHi + 2 * h); if (mFoot.d < d2) { d2 = mFoot.d; if (d2 <= dc) cache.oHi = pl.closed && pl.len > 0 ? mFoot.s + Math.round(((hi + winHi) / 2 - mFoot.s) / pl.len) * pl.len : mFoot.s; } }
      return d2 - dc;
    };
    const wOfF = (): number => {
      const denQ = 1 + ((cst.qx - qFa.x) * (cst.qx - qFb.x) + (cst.qy - qFa.y) * (cst.qy - qFb.y)) / ((qFa.d || 1) * (qFb.d || 1));
      const slack = Math.min(cst.A.L - W - (qFa.u - cst.A.sR) * cst.A.dir, cst.B.L - W - (qFb.u - cst.B.sR) * cst.B.dir);
      const denRatio = Math.abs(cst.denV) > 1e-12 ? denQ / cst.denV : 0;
      const fSteep = ss01((denRatio - 0.3) / 0.4);
      if (fSteep === 0) return 0;
      const fSlack = ss01(slack / (0.5 * h));
      if (fSlack === 0) return 0;
      const fRootA = ss01(((qFa.u - cst.A.sR) * cst.A.dir) / cst.rbEff);
      if (fRootA === 0) return 0;
      const fRootB = ss01(((qFb.u - cst.B.sR) * cst.B.dir) / cst.rbEff);
      if (fRootB === 0) return 0;
      const mA = marginOfF(cst.A, cst.qx, cst.qy, qFa.u, qFa.d, qFa.k, cst.wCacheA);
      if (mA <= -0.05 * h) return 0;
      const mB = marginOfF(cst.B, cst.qx, cst.qy, qFb.u, qFb.d, qFb.k, cst.wCacheB);
      if (mB <= -0.05 * h) return 0;
      return ss01(1 + Math.min(0, mA, mB) / (0.05 * h)) * fSteep * fSlack * fRootA * fRootB;
    };
    const growInteg = (): number => {
      copyFoot(qFa, fFa); copyFoot(qFb, fFb);
      qFa.u = cst.A.sR + cst.A.dir * armDistF(cst.A, fFa.s);
      qFb.u = cst.B.sR + cst.B.dir * armDistF(cst.B, fFb.s);
      cst.qx = cst.Vx; cst.qy = cst.Vy; cst.rhoCur = h;
      if (!(cst.r0 > 1e-9)) return 0;
      const dN = cst.r0 / 32;
      const NS = rt.nodeState; const NK = rt.nodeK;
      const saveNode = (kk: number): void => {
        const o = kk * 12;
        NS[o] = cst.qx; NS[o + 1] = cst.qy; NS[o + 2] = qFa.d; NS[o + 3] = qFa.x; NS[o + 4] = qFa.y; NS[o + 5] = qFa.s; NS[o + 6] = qFa.u;
        NS[o + 7] = qFb.d; NS[o + 8] = qFb.x; NS[o + 9] = qFb.y; NS[o + 10] = qFb.s; NS[o + 11] = qFb.u;
        NK[2 * kk] = qFa.k; NK[2 * kk + 1] = qFb.k;
      };
      saveNode(0);
      let sPrev = wOfF();
      let integ = 0;
      let nNodes = 1;
      for (let kk = 1; kk <= 32; kk++) {
        if (!(sPrev > 0)) break;
        advanceTo(h + kk * dN);
        if (cst.rhoCur < h + kk * dN - 1e-9 * Math.max(1, h + kk * dN)) {
          const sK = Math.min(sPrev, wOfF());
          integ += 0.5 * (sPrev + sK) * Math.max(0, cst.rhoCur - (h + (kk - 1) * dN));
          break;
        }
        saveNode(kk); nNodes = kk + 1;
        const sK = Math.min(sPrev, wOfF());
        integ += 0.5 * (sPrev + sK) * dN;
        sPrev = sK;
      }
      const k0 = Math.min(nNodes - 1, Math.floor(integ / dN));
      const o = k0 * 12;
      cst.qx = NS[o]; cst.qy = NS[o + 1];
      qFa.d = NS[o + 2]; qFa.x = NS[o + 3]; qFa.y = NS[o + 4]; qFa.s = NS[o + 5]; qFa.u = NS[o + 6]; qFa.k = NK[2 * k0];
      qFb.d = NS[o + 7]; qFb.x = NS[o + 8]; qFb.y = NS[o + 9]; qFb.s = NS[o + 10]; qFb.u = NS[o + 11]; qFb.k = NK[2 * k0 + 1];
      cst.rhoCur = h + k0 * dN;
      advanceTo(h + integ);
      return Math.max(0, cst.rhoCur - h);
    };
  for (let ci = 0; ci < st.corners.length; ci++) {
    const cs = st.corners[ci];
    const fc = rt.fCorners[ci];
    const A = arms[cs.aArm]; const B = arms[cs.bArm];
    const J = scene.junctions[cs.ji];
    const degen = (vx: number, vy: number): void => {
      // No position in this frame: the corner keeps structure's ok and
      // collapses to zero radius at V (never a switch, never missing).
      fc.ok = cs.ok; fc.Vx = vx; fc.Vy = vy; fc.qx = vx; fc.qy = vy;
      fc.tax = vx; fc.tay = vy; fc.tbx = vx; fc.tby = vy; fc.r = 0; fc.theta = cs.theta;
      if (A) { const hA = A.sR + A.dir * armDistF(A, cs.vSa); footWinFast(polys[A.pi], vx, vy, A.dir > 0 ? A.sR : A.sR - A.L, A.dir > 0 ? A.sR + A.L : A.sR, gFa, -1, Infinity, hA - 2 * h, hA + 2 * h); fc.fax = gFa.x; fc.fay = gFa.y; fc.sA = gFa.s; } else { fc.fax = vx; fc.fay = vy; fc.sA = cs.sA; }
      if (B) { const hB = B.sR + B.dir * armDistF(B, cs.vSb); footWinFast(polys[B.pi], vx, vy, B.dir > 0 ? B.sR : B.sR - B.L, B.dir > 0 ? B.sR + B.L : B.sR, gFb, -1, Infinity, hB - 2 * h, hB + 2 * h); fc.fbx = gFb.x; fc.fby = gFb.y; fc.sB = gFb.s; } else { fc.fbx = vx; fc.fby = vy; fc.sB = cs.sB; }
      fc.duA = A ? armDistF(A, fc.sA) : 0; fc.duB = B ? armDistF(B, fc.sB) : 0;
      fc.dvA = fc.duA; fc.dvB = fc.duB;
    };
    if (!A || !B || !J) { degen(J ? J.c[0] : 0, J ? J.c[1] : 0); continue; }
    if (!cs.ok) { degen(J.c[0], J.c[1]); fc.theta = cs.theta; continue; }
    let th = B.ang - A.ang;
    th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    fc.theta = th;
    let bx = A.ux + B.ux; let by = A.uy + B.uy;
    const bl = Math.sqrt(bx * bx + by * by) || 1; bx /= bl; by /= bl;
    const thC = Math.min(Math.max(th, 1e-3), Math.PI - 1e-3);
    const sn = Math.sin(thC / 2) || 1;
    const vx0 = J.c[0] + (bx * h) / sn; const vy0 = J.c[1] + (by * h) / sn;
    const okV = A.L > 1e-9 && B.L > 1e-9 && solveVS2(A, B, h, vx0, vy0, h / Math.max(Math.tan(thC / 2), 1e-6), fFa, fFb, A.sR + A.dir * armDistF(A, cs.vSa), B.sR + B.dir * armDistF(B, cs.vSb));
    if (!okV) { degen(vx0, vy0); continue; }
    cst.A = A; cst.B = B;
    cst.qx = sv.x; cst.qy = sv.y;
    copyFoot(qFa, fFa); copyFoot(qFb, fFb);
    cst.Vx = cst.qx; cst.Vy = cst.qy;
    let rReached = 0;
    cst.r0 = cs.style * (crF / 3) * Math.min(2 * h, 1.5 * h * Math.tan(thC / 2));
    cst.rbEff = Math.max(0.5 * h * rootTipScale(th), 1e-9 * h);
    cst.denV = 1 + ((cst.Vx - fFa.x) * (cst.Vx - fFb.x) + (cst.Vy - fFa.y) * (cst.Vy - fFb.y)) / ((fFa.d || 1) * (fFb.d || 1));
    cst.wCacheA.valid = false; cst.wCacheB.valid = false; cst.wCacheA.oLo = NaN; cst.wCacheA.oHi = NaN; cst.wCacheB.oLo = NaN; cst.wCacheB.oHi = NaN;
    cst.rhoCur = h;

    rReached = growInteg();
    if (rReached <= 1e-9) { rReached = 0; cst.qx = cst.Vx; cst.qy = cst.Vy; copyFoot(qFa, fFa); copyFoot(qFb, fFb); }
    fc.ok = true; fc.Vx = cst.Vx; fc.Vy = cst.Vy; fc.qx = cst.qx; fc.qy = cst.qy; fc.r = rReached;
    fc.sA = qFa.s; fc.sB = qFb.s; fc.fax = qFa.x; fc.fay = qFa.y; fc.fbx = qFb.x; fc.fby = qFb.y;
    if (rReached > 1e-9) {
      fc.tax = qFa.x + (h * (cst.qx - qFa.x)) / (qFa.d || 1); fc.tay = qFa.y + (h * (cst.qy - qFa.y)) / (qFa.d || 1);
      fc.tbx = qFb.x + (h * (cst.qx - qFb.x)) / (qFb.d || 1); fc.tby = qFb.y + (h * (cst.qy - qFb.y)) / (qFb.d || 1);
    } else { fc.tax = cst.Vx; fc.tay = cst.Vy; fc.tbx = cst.Vx; fc.tby = cst.Vy; fc.sA = fFa.s; fc.sB = fFb.s; fc.fax = fFa.x; fc.fay = fFa.y; fc.fbx = fFb.x; fc.fby = fFb.y; }
    fc.duA = (qFa.u - A.sR) * A.dir; fc.duB = (qFb.u - B.sR) * B.dir;
    fc.dvA = (fFa.u - A.sR) * A.dir; fc.dvB = (fFb.u - B.sR) * B.dir;
  }
  mark("corners");
  // Borders: base points from this frame's centrelines, then features.
  for (let b = 0; b < rt.b.length; b++) {
    const brt = rt.b[b]; const bs = brt.bs; const p = polys[brt.pi]; const sig = brt.side;
    const TT = rt.tan[brt.pi];
    const kind = bs.kind; const i1 = bs.i1; const i2 = bs.i2; const fArr = bs.f; const sOff = bs.sOff;
    const X = brt.X; const Y = brt.Y; const S = brt.S; const FX = brt.FX; const FY = brt.FY; const done = brt.done;
    done.fill(0);
    const baseSeq = bs.baseSeq;
    // One pool point, kinds 0-2, written to the base/seq views.
    const evalBasic = (id: number): void => {
      if (done[id]) return;
      const kd = kind[id];
      if (kd === 0) {
        const v = i1[id]; const seg = i2[id];
        X[id] = p.x[v] + sig * h * -TT.ty[seg]; Y[id] = p.y[v] + sig * h * TT.tx[seg];
        S[id] = p.s[v] + sOff[id]; FX[id] = p.x[v]; FY[id] = p.y[v];
      } else if (kd === 1) {
        const v = i1[id];
        const kPrev = v - 1 < 0 ? p.nseg - 1 : v - 1;
        const kNext = v >= p.nseg ? 0 : v;
        const tPx = TT.tx[kPrev]; const tPy = TT.ty[kPrev]; const tNx = TT.tx[kNext]; const tNy = TT.ty[kNext];
        const Ax = p.x[v] + sig * h * -tPy; const Ay = p.y[v] + sig * h * tPx;
        const Bx = p.x[v] + sig * h * -tNy; const By = p.y[v] + sig * h * tNx;
        const det = tPx * tNy - tPy * tNx;
        if (Math.abs(det) < 1e-300) { X[id] = Bx; Y[id] = By; } else { const t = ((Bx - Ax) * tNy - (By - Ay) * tNx) / det; X[id] = Ax + tPx * t; Y[id] = Ay + tPy * t; }
        S[id] = p.s[v] + sOff[id]; FX[id] = p.x[v]; FY[id] = p.y[v];
      } else if (kd === 2) {
        const v = i1[id];
        const kPrev = v - 1 < 0 ? p.nseg - 1 : v - 1;
        const kNext = v >= p.nseg ? 0 : v;
        const Ax = p.x[v] + sig * h * -TT.ty[kPrev]; const Ay = p.y[v] + sig * h * TT.tx[kPrev];
        const Bx = p.x[v] + sig * h * -TT.ty[kNext]; const By = p.y[v] + sig * h * TT.tx[kNext];
        const a0 = Math.atan2(Ay - p.y[v], Ax - p.x[v]);
        let da = Math.atan2(By - p.y[v], Bx - p.x[v]) - a0;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const a = a0 + da * fArr[id];
        X[id] = p.x[v] + h * Math.cos(a); Y[id] = p.y[v] + h * Math.sin(a);
        S[id] = p.s[v] + sOff[id]; FX[id] = p.x[v]; FY[id] = p.y[v];
      } else return;
      done[id] = 1;
      const bj = brt.basePos[id];
      if (bj >= 0) brt.baseS[bj] = S[id];
      const pos = brt.posOfId[id];
      if (pos >= 0) { brt.XY[2 * pos] = X[id]; brt.XY[2 * pos + 1] = Y[id]; brt.CXY[2 * pos] = FX[id]; brt.CXY[2 * pos + 1] = FY[id]; brt.SA[pos] = S[id]; }
    };
    // Kind 3 (fold) points can reference fold points that a later fold
    // cut dropped from the border, so they resolve recursively through
    // the pool (the builder's evalPt did the same).
    const subX = (id: number): number => { const bj = brt.basePos[id]; return bj >= 0 ? brt.XY[2 * brt.posOfId[id]] : X[id]; };
    const subY = (id: number): number => { const bj = brt.basePos[id]; return bj >= 0 ? brt.XY[2 * brt.posOfId[id] + 1] : Y[id]; };
    const subS = (id: number): number => { const bj = brt.basePos[id]; return bj >= 0 ? brt.baseS[bj] : S[id]; };
    const subFX = (id: number): number => { const bj = brt.basePos[id]; return bj >= 0 ? brt.CXY[2 * brt.posOfId[id]] : FX[id]; };
    const subFY = (id: number): number => { const bj = brt.basePos[id]; return bj >= 0 ? brt.CXY[2 * brt.posOfId[id] + 1] : FY[id]; };
    const eval3 = (id: number): void => {
      if (done[id]) return;
      const a = i1[id]; const bb = i2[id]; const c = bs.i3[id]; const d = bs.i4[id];
      evalAny(a); evalAny(bb); evalAny(c); evalAny(d);
      const hit = segInt(subX(a), subY(a), subX(bb), subY(bb), subX(c), subY(c), subX(d), subY(d));
      const t = hit ? hit.t : fArr[id];
      X[id] = subX(a) + (subX(bb) - subX(a)) * t; Y[id] = subY(a) + (subY(bb) - subY(a)) * t;
      S[id] = subS(a) + dS(p, subS(a), subS(bb)) * t;
      FX[id] = subFX(a) + (subFX(bb) - subFX(a)) * t; FY[id] = subFY(a) + (subFY(bb) - subFY(a)) * t;
      done[id] = 1;
      const bj = brt.basePos[id];
      if (bj >= 0) brt.baseS[bj] = S[id];
      const pos = brt.posOfId[id];
      if (pos >= 0) { brt.XY[2 * pos] = X[id]; brt.XY[2 * pos + 1] = Y[id]; brt.CXY[2 * pos] = FX[id]; brt.CXY[2 * pos + 1] = FY[id]; brt.SA[pos] = S[id]; }
    };
    const evalAny = (id: number): void => {
      if (done[id]) return;
      if (kind[id] === 3) eval3(id); else evalBasic(id);
    };
    let k2v = -1; let k2a0 = 0; let k2da = 0;
    // Kind 0 points in structure-fixed runs (no per-point kind/done
    // dispatch); kinds 1-2 follow from the recorded index list. Base
    // points write only the base and sequence views; cold paths (fold
    // recursion, cut fallbacks) read a base point through its base view.
    const k0Runs = brt.k0Runs;
    for (let r = 0; r < k0Runs.length; r += 2) {
      const jEnd = k0Runs[r] + k0Runs[r + 1];
      for (let j = k0Runs[r]; j < jEnd; j++) {
        const id = baseSeq[j];
        const v = i1[id]; const seg = i2[id];
        const vx = p.x[v] + sig * h * -TT.ty[seg]; const vy = p.y[v] + sig * h * TT.tx[seg];
        const vs = p.s[v] + sOff[id];
        done[id] = 1;
        brt.baseS[j] = vs;
        const pos = brt.baseSeqPos[j];
        brt.XY[2 * pos] = vx; brt.XY[2 * pos + 1] = vy; brt.CXY[2 * pos] = p.x[v]; brt.CXY[2 * pos + 1] = p.y[v]; brt.SA[pos] = vs;
      }
    }
    const baseOther = brt.baseOther;
    for (let oi = 0; oi < baseOther.length; oi++) {
      const j = baseOther[oi];
      const id = baseSeq[j]; const kd = kind[id];
      let vx = 0; let vy = 0; let vs = 0; let vfx = 0; let vfy = 0;
      if (kd === 1) {
        const v = i1[id];
        const kPrev = v - 1 < 0 ? p.nseg - 1 : v - 1;
        const kNext = v >= p.nseg ? 0 : v;
        const tPx = TT.tx[kPrev]; const tPy = TT.ty[kPrev]; const tNx = TT.tx[kNext]; const tNy = TT.ty[kNext];
        const Ax = p.x[v] + sig * h * -tPy; const Ay = p.y[v] + sig * h * tPx;
        const Bx = p.x[v] + sig * h * -tNy; const By = p.y[v] + sig * h * tNx;
        const det = tPx * tNy - tPy * tNx;
        if (Math.abs(det) < 1e-300) { vx = Bx; vy = By; } else { const t = ((Bx - Ax) * tNy - (By - Ay) * tNx) / det; vx = Ax + tPx * t; vy = Ay + tPy * t; }
        vs = p.s[v] + sOff[id]; vfx = p.x[v]; vfy = p.y[v];
      } else if (kd === 2) {
        const v = i1[id];
        if (v !== k2v) {
          const kPrev = v - 1 < 0 ? p.nseg - 1 : v - 1;
          const kNext = v >= p.nseg ? 0 : v;
          const Ax = p.x[v] + sig * h * -TT.ty[kPrev]; const Ay = p.y[v] + sig * h * TT.tx[kPrev];
          const Bx = p.x[v] + sig * h * -TT.ty[kNext]; const By = p.y[v] + sig * h * TT.tx[kNext];
          k2a0 = Math.atan2(Ay - p.y[v], Ax - p.x[v]);
          let da = Math.atan2(By - p.y[v], Bx - p.x[v]) - k2a0;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          k2da = da; k2v = v;
        }
        const a = k2a0 + k2da * fArr[id];
        vx = p.x[v] + h * Math.cos(a); vy = p.y[v] + h * Math.sin(a);
        vs = p.s[v] + sOff[id]; vfx = p.x[v]; vfy = p.y[v];
      } else continue;
      done[id] = 1;
      brt.baseS[j] = vs;
      const pos = brt.baseSeqPos[j];
      if (pos >= 0) { brt.XY[2 * pos] = vx; brt.XY[2 * pos + 1] = vy; brt.CXY[2 * pos] = vfx; brt.CXY[2 * pos + 1] = vfy; brt.SA[pos] = vs; }
    }
    for (let j = 0; j < baseSeq.length; j++) { const id = baseSeq[j]; if (kind[id] === 3) eval3(id); }
  }
  mark("offsets");
  // Crossing and eye cuts: search the recorded borders' intersection
  // inside the feature's s window on both borders, from this frame.
  for (const e of rt.cutList) {
    if (rt.b[e.b].done[e.id]) continue;
    evalCut(rt, e.b, e.id, h);
  }
  mark("crossingCuts");
  // Corner tangent points and border-at points.
  for (const e of rt.ptList) {
    const b = e.b; const j = e.j; const id = e.id;
    {
      const brt = rt.b[b]; const bs = brt.bs; const p = polys[brt.pi];
      if (brt.done[id]) continue;
      const kd = bs.kind[id];
      if (kd === 5) {
        const fc = rt.fCorners[bs.i1[id]];
        let x: number; let y: number; let fx: number; let fy: number; let s: number;
        if (bs.i2[id] === 0) { x = fc.tax; y = fc.tay; fx = fc.fax; fy = fc.fay; s = fc.sA; } else { x = fc.tbx; y = fc.tby; fx = fc.fbx; fy = fc.fby; s = fc.sB; }
        brt.X[id] = x; brt.Y[id] = y; brt.S[id] = s; brt.FX[id] = fx; brt.FY[id] = fy; brt.done[id] = 1;
        brt.XY[2 * j] = x; brt.XY[2 * j + 1] = y; brt.CXY[2 * j] = fx; brt.CXY[2 * j + 1] = fy; brt.SA[j] = s;
      } else if (kd === 6) {
        const enc = bs.f[id];
        const kk = Math.min(Math.max(Math.floor(enc), 0), Math.max(0, brt.baseSeqPos.length - 1));
        const tt = Math.min(1, Math.max(0, enc - Math.floor(enc)));
        const pa = brt.baseSeqPos[kk]; const pb = brt.baseSeqPos[Math.min(brt.baseSeqPos.length - 1, kk + 1)];
        const x = brt.XY[2 * pa] + (brt.XY[2 * pb] - brt.XY[2 * pa]) * tt;
        const y = brt.XY[2 * pa + 1] + (brt.XY[2 * pb + 1] - brt.XY[2 * pa + 1]) * tt;
        const fx = brt.CXY[2 * pa] + (brt.CXY[2 * pb] - brt.CXY[2 * pa]) * tt;
        const fy = brt.CXY[2 * pa + 1] + (brt.CXY[2 * pb + 1] - brt.CXY[2 * pa + 1]) * tt;
        const s = brt.SA[pa] + (brt.SA[pb] - brt.SA[pa]) * tt;
        brt.X[id] = x; brt.Y[id] = y; brt.S[id] = s; brt.FX[id] = fx; brt.FY[id] = fy; brt.done[id] = 1;
        brt.XY[2 * j] = x; brt.XY[2 * j + 1] = y; brt.CXY[2 * j] = fx; brt.CXY[2 * j + 1] = fy; brt.SA[j] = s;
      } else if (kd === 3) {
        const a = bs.i1[id]; const bb = bs.i2[id]; const c = bs.i3[id]; const d = bs.i4[id];
        const hit = segInt(brt.X[a], brt.Y[a], brt.X[bb], brt.Y[bb], brt.X[c], brt.Y[c], brt.X[d], brt.Y[d]);
        const t = hit ? hit.t : bs.f[id];
        const x = brt.X[a] + (brt.X[bb] - brt.X[a]) * t; const y = brt.Y[a] + (brt.Y[bb] - brt.Y[a]) * t;
        const s = brt.S[a] + dS(p, brt.S[a], brt.S[bb]) * t;
        const fx = brt.FX[a] + (brt.FX[bb] - brt.FX[a]) * t; const fy = brt.FY[a] + (brt.FY[bb] - brt.FY[a]) * t;
        brt.X[id] = x; brt.Y[id] = y; brt.S[id] = s; brt.FX[id] = fx; brt.FY[id] = fy; brt.done[id] = 1;
        brt.XY[2 * j] = x; brt.XY[2 * j + 1] = y; brt.CXY[2 * j] = fx; brt.CXY[2 * j + 1] = fy; brt.SA[j] = s;
      }
    }
  }
  mark("cornersPts");
  // Exposure-transition points: each run boundary that structure
  // recorded as covered on one side slides along its border to where
  // a recorded covering chain's tube edge crosses in this frame. No
  // sign change nearby leaves the point where structure put it.
  {
    const foot: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
    const ds = new Float64Array(9);
    for (const tr of st.transitions) {
      const brt = rt.b[tr.b]; const pOwn = polys[brt.pi];
      const XY = brt.XY; const CXY = brt.CXY; const SA = brt.SA;
      const nP = brt.bs.seqPool.length;
      if (nP < 2) continue;
      const closedB = pOwn.closed;
      const wrap = (i: number): number => (closedB ? ((i % (nP - 1)) + (nP - 1)) % (nP - 1) : i);
      let solved = false;
      for (let w = 0; w < 4 && !solved; w++) {
        const cp = tr.pi[w]; if (cp < 0) continue;
        const p2 = polys[cp]; if (p2.nseg === 0) continue;
        const k0 = tr.k[w];
        const sAt = (i: number): number => {
          if (p2.closed) { const n = p2.nseg; const q = ((i % n) + n) % n; return p2.s[q] + Math.floor(i / n) * p2.len; }
          if (i < 0) return p2.s[0];
          if (i >= p2.nseg) return p2.s0 + p2.len;
          return p2.s[i];
        };
        const loS = sAt(k0 - 28); const hiS = sAt(k0 + 29);
        let bestPair = -1; let bestT = 0; let bestOff = Infinity;
        for (let di = -3; di <= 3; di++) {
          const ii = wrap(tr.j + di);
          if (!closedB && (ii < 0 || ii >= nP)) { ds[di + 3] = NaN; continue; }
          footWinFast(p2, XY[2 * ii], XY[2 * ii + 1], loS, hiS, foot, -1, Infinity, sAt(k0) - 2 * h, sAt(k0) + 2 * h);
          ds[di + 3] = foot.d;
        }
        for (let di = -3; di < 3; di++) {
          const d0 = ds[di + 3]; const d1 = ds[di + 4];
          if (!Number.isFinite(d0) || !Number.isFinite(d1)) continue;
          const g0 = d0 - h; const g1 = d1 - h;
          if (g0 * g1 > 0 || (g0 === 0 && g1 === 0)) continue;
          const tt = Math.abs(g1 - g0) > 1e-300 ? g0 / (g0 - g1) : 0;
          const off = Math.abs(di + tt);
          if (off < bestOff) { bestOff = off; bestPair = di; bestT = tt; }
        }
        if (bestPair < -1 || bestPair > 0) continue;
        const i0 = wrap(tr.j + bestPair); const i1 = wrap(tr.j + bestPair + 1);
        const x = XY[2 * i0] + (XY[2 * i1] - XY[2 * i0]) * bestT;
        // A slide of more than half the bracketing segment means the
        // recorded candidate's edge is not this point's boundary.
        if (Math.hypot(x - XY[2 * tr.j], (XY[2 * i0 + 1] + (XY[2 * i1 + 1] - XY[2 * i0 + 1]) * bestT) - XY[2 * tr.j + 1]) > 0.5 * Math.hypot(XY[2 * i1] - XY[2 * i0], XY[2 * i1 + 1] - XY[2 * i0 + 1])) continue;
        const y = XY[2 * i0 + 1] + (XY[2 * i1 + 1] - XY[2 * i0 + 1]) * bestT;
        const cxp = CXY[2 * i0] + (CXY[2 * i1] - CXY[2 * i0]) * bestT;
        const cyp = CXY[2 * i0 + 1] + (CXY[2 * i1 + 1] - CXY[2 * i0 + 1]) * bestT;
        let sA0 = SA[i0]; let sA1 = SA[i1];
        if (pOwn.closed && sA1 < sA0) sA1 += pOwn.len;
        const sv = sA0 + (sA1 - sA0) * bestT;
        XY[2 * tr.j] = x; XY[2 * tr.j + 1] = y; CXY[2 * tr.j] = cxp; CXY[2 * tr.j + 1] = cyp; SA[tr.j] = sv;
        if (closedB && (tr.j === 0 || tr.j === nP - 1)) { const twin = tr.j === 0 ? nP - 1 : 0; XY[2 * twin] = x; XY[2 * twin + 1] = y; CXY[2 * twin] = cxp; CXY[2 * twin + 1] = cyp; SA[twin] = tr.j === 0 ? sv + pOwn.len : sv - pOwn.len; }
        solved = true;
      }
    }
  }
  mark("transPts");
  // Caps regenerated from this frame's station points.
  for (let capIdx = 0; capIdx < st.caps.length; capIdx++) {
    const cap = st.caps[capIdx];
    const s = st.stations[cap.station];
    const lb = rt.b[s.leftB]; const rb = rt.b[s.rightB];
    const lfi = lb.bs.idxOfFull[s.leftFull]; const rfi = rb.bs.idxOfFull[s.rightFull];
    const lpx = lb.XY[2 * lfi]; const lpy = lb.XY[2 * lfi + 1];
    const rpx = rb.XY[2 * rfi]; const rpy = rb.XY[2 * rfi + 1];
    const p = polys[cap.pi];
    const endS = cap.atEnd ? p.s0 + p.len : p.s0;
    pointAtInto(p, endS, ptA);
    const cx0 = ptA[0]; const cy0 = ptA[1];
    const nbS = cap.atEnd ? endS - Math.min(1, p.len) : endS + Math.min(1, p.len);
    pointAtInto(p, nbS, ptB);
    let ox = cx0 - ptB[0]; let oy = cy0 - ptB[1];
    const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
    const a0 = Math.atan2(lpy - cy0, lpx - cx0);
    let da = Math.atan2(rpy - cy0, rpx - cx0) - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const midA = a0 + da / 2;
    if (Math.cos(midA) * ox + Math.sin(midA) * oy < 0) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI;
    const steps = Math.max(1, cap.steps);
    const xy = rt.capsXY[capIdx]; const cxy = rt.capsCXY[capIdx];
    for (let i = 0; i <= steps; i++) {
      if (i === 0) { xy[0] = lpx; xy[1] = lpy; }
      else if (i === steps) { xy[2 * i] = rpx; xy[2 * i + 1] = rpy; }
      else { const a = a0 + (da * i) / steps; xy[2 * i] = cx0 + h * Math.cos(a); xy[2 * i + 1] = cy0 + h * Math.sin(a); }
      cxy[2 * i] = cx0; cxy[2 * i + 1] = cy0;
    }
    rt.capsC[capIdx * 2] = cx0; rt.capsC[capIdx * 2 + 1] = cy0;
  }
  mark("caps");
  mark("exposure");
  // Cap-run boundary points slide along their arc to this frame's
  // covering tube edge, as border transition points do.
  {
    const foot: FFoot = { d: 0, x: 0, y: 0, s: 0, k: 0, u: 0 };
    const ds = new Float64Array(9);
    for (const ct of st.capTransitions) {
      const arc = rt.capsXY[ct.cap]; const steps = st.caps[ct.cap].steps;
      const p2 = polys[ct.pi];
      if (p2.nseg === 0 || steps < 1) continue;
      const sAt = (i: number): number => {
        if (p2.closed) { const n = p2.nseg; const q = ((i % n) + n) % n; return p2.s[q] + Math.floor(i / n) * p2.len; }
        if (i < 0) return p2.s[0];
        if (i >= p2.nseg) return p2.s0 + p2.len;
        return p2.s[i];
      };
      const loS = sAt(ct.k - 28); const hiS = sAt(ct.k + 29);
      let bestPair = -1; let bestT = 0; let bestOff = Infinity;
      for (let di = -3; di <= 3; di++) {
        const ii = ct.pt + di;
        if (ii < 0 || ii > steps) { ds[di + 3] = NaN; continue; }
        footWinFast(p2, arc[2 * ii], arc[2 * ii + 1], loS, hiS, foot);
        ds[di + 3] = foot.d;
      }
      for (let di = -3; di < 3; di++) {
        const d0 = ds[di + 3]; const d1 = ds[di + 4];
        if (!Number.isFinite(d0) || !Number.isFinite(d1)) continue;
        const g0 = d0 - h; const g1 = d1 - h;
        if (g0 * g1 > 0 || (g0 === 0 && g1 === 0)) continue;
        const tt = Math.abs(g1 - g0) > 1e-300 ? g0 / (g0 - g1) : 0;
        const off = Math.abs(di + tt);
        if (off < bestOff) { bestOff = off; bestPair = di; bestT = tt; }
      }
      if (bestPair < -1 || bestPair > 0) continue;
      const i0 = ct.pt + bestPair; const i1 = i0 + 1;
      if (Math.hypot(arc[2 * i0] + (arc[2 * i1] - arc[2 * i0]) * bestT - arc[2 * ct.pt], arc[2 * i0 + 1] + (arc[2 * i1 + 1] - arc[2 * i0 + 1]) * bestT - arc[2 * ct.pt + 1]) > 0.5 * Math.hypot(arc[2 * i1] - arc[2 * i0], arc[2 * i1 + 1] - arc[2 * i0 + 1])) continue;
      arc[2 * ct.pt] = arc[2 * i0] + (arc[2 * i1] - arc[2 * i0]) * bestT;
      arc[2 * ct.pt + 1] = arc[2 * i0 + 1] + (arc[2 * i1 + 1] - arc[2 * i0 + 1]) * bestT;
    }
  }
  mark("capTrans");
  rt.arcDone.fill(0);
  const ensureArc = (ci: number): number => {
    if (rt.arcDone[ci]) return rt.arcSteps[ci];
    const fc = rt.fCorners[ci];
    const aA = Math.atan2(fc.tay - fc.qy, fc.tax - fc.qx);
    let da = Math.atan2(fc.tby - fc.qy, fc.tbx - fc.qx) - aA;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const steps = Math.min(32, Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16))));
    const buf = rt.arcBuf[ci]; const cbuf = rt.arcCBuf[ci];
    for (let si = 0; si <= steps; si++) {
      const a = aA + (da * si) / steps;
      buf[2 * si] = fc.qx + fc.r * Math.cos(a); buf[2 * si + 1] = fc.qy + fc.r * Math.sin(a);
      cbuf[2 * si] = fc.qx; cbuf[2 * si + 1] = fc.qy;
    }
    rt.arcSteps[ci] = steps; rt.arcDone[ci] = 1;
    return steps;
  };
  // Regions into the shared buffer, from the stored templates.
  const regions = rt.regions;
  for (const r of regions) r.pieces.length = 0;
  const rgc = { c: 0, lx: 0, ly: 0, have: false };
  const wp = (x: number, y: number): void => {
    if (rgc.have) { const dx = x - rgc.lx; const dy = y - rgc.ly; if (dx * dx + dy * dy < 1e-24) return; }
    rt.regionBuf[2 * rgc.c] = x; rt.regionBuf[2 * rgc.c + 1] = y;
    rgc.c++; rgc.lx = x; rgc.ly = y; rgc.have = true;
  };
  for (let ri = 0; ri < regions.length; ri++) {
    const region = regions[ri];
    const tpl = rt.regionTpl[ri];
    const start = rgc.c;
    rgc.have = false;
    for (const op of tpl.ops) {
      if (op.t === 0) {
        const XY = rt.b[op.b].XY;
        let from = op.from;
        if (rgc.have && op.count > 0) { const dx = XY[2 * from] - rgc.lx; const dy = XY[2 * from + 1] - rgc.ly; if (dx * dx + dy * dy < 1e-24) from++; }
        const cnt = op.from + op.count - from;
        if (cnt > 0) { rt.regionBuf.set(XY.subarray(2 * from, 2 * (from + cnt)), 2 * rgc.c); rgc.c += cnt; rgc.lx = rt.regionBuf[2 * rgc.c - 2]; rgc.ly = rt.regionBuf[2 * rgc.c - 1]; rgc.have = true; }
      } else if (op.t === 6) {
        const XY = rt.b[op.b].XY;
        let cnt = op.count;
        if (rgc.have && cnt > 0) { const dx = XY[2 * op.from] - rgc.lx; const dy = XY[2 * op.from + 1] - rgc.ly; if (dx * dx + dy * dy < 1e-24) cnt--; }
        for (let k = 0; k < cnt; k++) { const i = op.from - (op.count - cnt) - k; rt.regionBuf[2 * rgc.c] = XY[2 * i]; rt.regionBuf[2 * rgc.c + 1] = XY[2 * i + 1]; rgc.c++; }
        if (cnt > 0) { rgc.lx = rt.regionBuf[2 * rgc.c - 2]; rgc.ly = rt.regionBuf[2 * rgc.c - 1]; rgc.have = true; }
      } else if (op.t === 1) {
        const XY = rt.b[op.b].XY;
        for (let k = 0; k < op.idx.length; k++) { const i = op.idx[k]; wp(XY[2 * i], XY[2 * i + 1]); }
      } else if (op.t === 2) {
        const xy = rt.capsXY[op.cap];
        if (op.step > 0) { for (let i = op.from; i <= op.to; i++) wp(xy[2 * i], xy[2 * i + 1]); }
        else { for (let i = op.from; i >= op.to; i--) wp(xy[2 * i], xy[2 * i + 1]); }
      } else if (op.t === 3) {
        const brt = rt.b[op.b]; const fi = brt.bs.idxOfFull[op.full];
        wp(brt.XY[2 * fi], brt.XY[2 * fi + 1]);
      } else if (op.t === 4) {
        const pt = borderAtRuntime(rt, op.pi, op.side, op.s);
        wp(pt[0], pt[1]);
      } else {
        const fc = rt.fCorners[op.corner];
        if (fc.ok && fc.r > 1e-9) {
          const steps = ensureArc(op.corner);
          const buf = rt.arcBuf[op.corner];
          for (let si = 1; si < steps; si++) wp(buf[2 * si], buf[2 * si + 1]);
        }
      }
    }
    let len = rgc.c - start;
    if (len > 1) { const dx = rt.regionBuf[2 * start] - rt.regionBuf[2 * (rgc.c - 1)]; const dy = rt.regionBuf[2 * start + 1] - rt.regionBuf[2 * rgc.c - 1]; if (dx * dx + dy * dy < 1e-24) { rgc.c--; len--; } }
    region.pts = rt.regionBuf.subarray(2 * start, 2 * (start + len)) as unknown as number[];
  }
  mark("regions");
  // Pieces: exactly structure's runs, arcs and cap runs (decided
  // once); only their positions (the SA/XY views) follow this frame.
  const pieces = rt.piecesOut;
  pieces.length = 0;
  for (const u of rt.runUpd) {
    const brt = rt.b[u.b];
    u.piece.s0 = brt.SA[u.start];
    u.piece.s1 = brt.SA[u.end];
    pieces.push(u.piece);
    if (u.piece.region >= 0 && regions[u.piece.region]) regions[u.piece.region].pieces.push(pieces.length - 1);
  }
  for (let ci = 0; ci < st.corners.length; ci++) {
    const cs = st.corners[ci]; const fc = rt.fCorners[ci];
    if (!fc.ok) continue;
    // A corner whose radius reaches 0 in this frame still emits its
    // arc piece, collapsed onto V (never a missing piece).
    const piece = rt.arcPieces[ci];
    const steps = ensureArc(ci);
    const buf = rt.arcBuf[ci]; const cbuf = rt.arcCBuf[ci];
    piece.pts = buf.subarray(0, 2 * (steps + 1)) as unknown as number[];
    piece.cpts = cbuf.subarray(0, 2 * (steps + 1)) as unknown as number[];
    piece.s0 = fc.sA; piece.s1 = fc.sB;
    pieces.push(piece);
    const rid = piece.region;
    if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
  }
  for (const p of rt.capPieces) pieces.push(p);
  mark("pieces");
  // Faces, cuts, corners.
  for (let fi = 0; fi < st.faces.length; fi++) {
    const f = st.faces[fi]; const face = rt.faces[fi];
    const region = regions[f.rid];
    face.pts = region ? region.pts : rt.emptyPts;
    if (f.kind === 1) { face.sample[0] = scene.junctions[f.ji].c[0]; face.sample[1] = scene.junctions[f.ji].c[1]; }
    else { pointAtInto(polys[f.pi], f.cMid, ptA); face.sample[0] = ptA[0]; face.sample[1] = ptA[1]; }
    rt.faceDepth[fi] = depthAt(f.owner, f.kind === 1 ? f.armS : f.cMid);
  }
  rt.faceOrder.sort((a, b) => rt.faceDepth[a] - rt.faceDepth[b]);
  for (let i = 0; i < rt.faceOrder.length; i++) rt.facesOut[i] = rt.faces[rt.faceOrder[i]];
  for (let ci = 0; ci < st.cuts.length; ci++) {
    const c = st.cuts[ci]; const out = rt.cutsT[ci]; const brt = rt.b[c.border];
    const fi = brt.bs.idxOfFull[c.fullIdx];
    out.s = fi >= 0 ? brt.SA[fi] : 0;
    out.x = fi >= 0 ? brt.XY[2 * fi] : 0;
    out.y = fi >= 0 ? brt.XY[2 * fi + 1] : 0;
  }
  let okCount = 0;
  for (let ci = 0; ci < st.corners.length; ci++) {
    const cs = st.corners[ci]; const out = rt.cornersT[ci]; const fc = rt.fCorners[ci];
    out.ok = fc.ok; out.theta = fc.theta; out.r = fc.r;
    out.Vx = fc.Vx; out.Vy = fc.Vy; out.qx = fc.qx; out.qy = fc.qy;
    out.tax = fc.tax; out.tay = fc.tay; out.tbx = fc.tbx; out.tby = fc.tby;
    if (cs.ok) okCount++;
  }
  rt.diag[2] = `chains ${polys.length}, pieces ${pieces.length}, regions ${regions.length}, faces ${rt.facesOut.length}, corners ${okCount}/${st.corners.length} ok, cuts ${st.cuts.length}, stations ${st.stations.length}`;
  rt.table.h = h; rt.table.W = W;
  mark("other");
  return rt.table;
}

// ---------------------------------------------------------------------------
// S3b runtime: buffers owned by the structure, reused by every frame.

type RegionOp =
  | { t: 0; b: number; from: number; count: number }
  | { t: 1; b: number; idx: Int32Array }
  | { t: 2; cap: number; from: number; to: number; step: number }
  | { t: 3; b: number; full: number }
  | { t: 4; pi: number; side: number; s: number }
  | { t: 5; corner: number }
  | { t: 6; b: number; from: number; count: number };

interface BRun {
  bs: BorderStruct; pi: number; side: number;
  X: Float64Array; Y: Float64Array; S: Float64Array; FX: Float64Array; FY: Float64Array; done: Uint8Array;
  baseS: Float64Array; basePos: Int32Array; baseSeqPos: Int32Array; k0Runs: Int32Array; baseOther: Int32Array;
  XY: Float64Array; CXY: Float64Array; SA: Float64Array; posOfId: Int32Array; exp: Uint8Array;
}

interface Runtime {
  rawPolys: Poly[]; polys: Poly[]; extPts: Float64Array; capPts: Int32Array;
  tan: { tx: Float64Array; ty: Float64Array; vtX: Float64Array; vtY: Float64Array; gF: Float64Array; gB: Float64Array }[];
  needRaw: Uint8Array;
  idxOf: Map<number, number>;
  depthS: Float64Array[]; depthZ: Float64Array[]; depthN: Int32Array;
  arms: FArm[];
  fCorners: FCorner[];
  b: BRun[];
  capsXY: Float64Array[]; capsCXY: Float64Array[]; capsC: Float64Array;
  regions: OutlineRegion[]; regionTpl: { ops: RegionOp[] }[]; regionBuf: Float64Array;
  piecesOut: OutlinePiece[];
  runUpd: { piece: OutlinePiece; b: number; start: number; end: number }[];
  arcPieces: OutlinePiece[]; arcBuf: Float64Array[]; arcCBuf: Float64Array[]; arcSteps: Int32Array; arcDone: Uint8Array;
  capPieces: OutlinePiece[];
  faces: OutlineFace[]; facesOut: OutlineFace[]; faceOrder: number[]; faceDepth: Float64Array;
  cornersT: OutlineCorner[]; cutsT: OutlineCut[];
  cutList: { b: number; id: number }[]; ptList: { b: number; j: number; id: number }[];
  nodeState: Float64Array; nodeK: Int32Array;
  runPool: OutlinePiece[]; runOff: Int32Array; trimSR: Float64Array; trimDir: Float64Array; trimDEnd: Float64Array; trimOff: Int32Array;
  passS: Float64Array[]; passSq: Float64Array[]; passTheta: Float64Array[]; passQi: Int32Array[]; passN: Int32Array;
  armLroot: Float64Array; armLcut: Float64Array; armUB: Float64Array; armsOfJSorted: number[][]; chainArms: number[][];
  diag: string[]; table: OutlineTable; emptyPts: number[];
}

function fillPoly(p: Poly, pts: ArrayLike<number>, closed: boolean, s0: number): void {
  let n = 0;
  const m = Math.floor(pts.length / 2);
  for (let i = 0; i < m; i++) {
    const x = pts[2 * i]; const y = pts[2 * i + 1];
    if (n > 0 && Math.abs(x - p.x[n - 1]) + Math.abs(y - p.y[n - 1]) < 1e-12) continue;
    p.x[n] = x; p.y[n] = y; n++;
  }
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
  dst.n = src.n; dst.closed = src.closed; dst.nseg = src.nseg; dst.len = src.len; dst.s0 = src.s0;
  dst.x.set(src.x.subarray(0, src.n)); dst.y.set(src.y.subarray(0, src.n));
  dst.s.set(src.s.subarray(0, src.n)); dst.segLen.set(src.segLen.subarray(0, Math.max(0, src.nseg)));
  dst.dx.set(src.dx.subarray(0, Math.max(0, src.nseg))); dst.dy.set(src.dy.subarray(0, Math.max(0, src.nseg)));
  dst.bx0.set(src.bx0.subarray(0, Math.max(0, src.nseg))); dst.by0.set(src.by0.subarray(0, Math.max(0, src.nseg)));
  dst.bx1.set(src.bx1.subarray(0, Math.max(0, src.nseg))); dst.by1.set(src.by1.subarray(0, Math.max(0, src.nseg)));
  dst.nblk = src.nblk; dst.bk.set(src.bk.subarray(0, 4 * src.nblk));
}

function fillTangents(rt: Runtime, p: Poly): void {
  const TT = rt.tan[p.id];
  const needG = rt.chainArms[p.id].length > 0;
  for (let k = 0; k < p.nseg; k++) {
    const l = p.segLen[k] || 1;
    const tx = p.dx[k] / l; const ty = p.dy[k] / l;
    TT.tx[k] = tx; TT.ty[k] = ty;
    if (needG) TT.gF[k] = p.x[k] * tx + p.y[k] * ty;
  }
  if (needG) for (let i = 0; i < p.n; i++) {
    const kin = i > 0 ? i - 1 : p.closed ? p.nseg - 1 : -1;
    TT.gB[i] = kin >= 0 ? p.x[i] * TT.tx[kin] + p.y[i] * TT.ty[kin] : 0;
  }
}

function addPin(rt: Runtime, pi: number, s: number, z: number): void {
  const S = rt.depthS[pi]; const Z = rt.depthZ[pi];
  let n = rt.depthN[pi];
  let i = n;
  while (i > 0 && S[i - 1] > s) { S[i] = S[i - 1]; Z[i] = Z[i - 1]; i--; }
  S[i] = s; Z[i] = z;
  rt.depthN[pi] = n + 1;
}

function depthAtRt(rt: Runtime, pi: number, s: number, depthWin: number): number {
  const P = rt.depthS[pi]; const Z = rt.depthZ[pi]; const n = rt.depthN[pi];
  if (n === 0) return 0;
  const p = rt.polys[pi];
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
function footWinFast(p: Poly, px: number, py: number, lo: number, hi: number, out: FFoot, stopAt = -1, initBd = Infinity, hintLo = NaN, hintHi = NaN): void {
  let bd2 = initBd * initBd; let bx = px; let by = py; let bs = lo; let bk = 0;
  if (p.nseg === 0 || hi < lo) { out.d = initBd; out.x = bx; out.y = by; out.s = bs; out.k = bk; out.u = bs; return; }
  const stop2 = stopAt * stopAt;
  const scanRange = (rlo: number, rhi: number): void => {
  let si0 = 0; let si1 = 0;
  if (p.closed && p.len > 0) { si0 = Math.max(-1, Math.floor((rlo - p.s[0]) / p.len) - 1); si1 = Math.min(1, Math.floor((rhi - p.s[0]) / p.len)); }
  for (let si = si0; si <= si1; si++) {
    const sh = p.closed ? si * p.len : 0;
    let a = 0; let b = p.nseg;
    while (a < b) { const m = (a + b) >> 1; if (p.s[m] + p.segLen[m] + sh >= rlo) b = m; else a = m + 1; }
    const k0 = a;
    b = p.nseg;
    while (a < b) { const m = (a + b) >> 1; if (p.s[m] + sh > rhi) b = m; else a = m + 1; }
    for (let k = k0; k < a; k++) {
      if (((k & 31) === 0 || k === k0) && bd2 < Infinity && p.nblk > 0) {
        const bi = k >> 5;
        if (bi < p.nblk) {
          const dxb = px < p.bk[4 * bi] ? p.bk[4 * bi] - px : px > p.bk[4 * bi + 2] ? px - p.bk[4 * bi + 2] : 0;
          const dyb = py < p.bk[4 * bi + 1] ? p.bk[4 * bi + 1] - py : py > p.bk[4 * bi + 3] ? py - p.bk[4 * bi + 3] : 0;
          if (dxb * dxb + dyb * dyb >= bd2) { k = Math.min(a, (bi + 1) * 32) - 1; continue; }
        }
      }
      if (bd2 < Infinity) {
        const dxb = px < p.bx0[k] ? p.bx0[k] - px : px > p.bx1[k] ? px - p.bx1[k] : 0;
        const dyb = py < p.by0[k] ? p.by0[k] - py : py > p.by1[k] ? py - p.by1[k] : 0;
        if (dxb * dxb + dyb * dyb >= bd2) continue;
      }
      const sa = p.s[k]; const sb = sa + p.segLen[k];
      const aa = Math.max(rlo, sa + sh); const bb = Math.min(rhi, sb + sh);
      if (bb < aa) continue;
      const l = p.segLen[k] || 1;
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
      if (d2 < bd2) { const t2 = ta + (tb - ta) * tt; bd2 = d2; bx = qx; by = qy; bs = sa + t2 * p.segLen[k]; bk = k; if (stopAt >= 0 && bd2 <= stop2) return; }
    }
  }
  };
  if (Number.isFinite(hintLo) && hintHi > hintLo && hintHi > lo && hintLo < hi) {
    scanRange(Math.max(lo, hintLo), Math.min(hi, hintHi));
    if (!(stopAt >= 0 && bd2 <= stop2)) {
      if (hintLo > lo) scanRange(lo, Math.min(hi, hintLo));
      if (hintHi < hi && !(stopAt >= 0 && bd2 <= stop2)) scanRange(Math.max(lo, hintHi), hi);
    }
  } else scanRange(lo, hi);
  out.d = Math.sqrt(bd2); out.x = bx; out.y = by; out.s = bs; out.k = bk; out.u = bs;
}

function borderAtRuntime(rt: Runtime, pi: number, side: number, sIn: number): [number, number] {
  const b = pi * 2 + (side === 1 ? 0 : 1);
  const brt = rt.b[b]; const p = rt.polys[pi];
  let target = sIn;
  if (p.closed) { target = normS(p, target); if (target < brt.baseS[0] - 1e-9) target += p.len; }
  const baseS = brt.baseS;
  let lo = 0; let hi = baseS.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (baseS[mid] <= target) lo = mid; else hi = mid; }
  const a = lo; const bb = Math.min(baseS.length - 1, lo + 1);
  const ds = baseS[bb] - baseS[a];
  const t = ds > 1e-12 ? Math.min(1, Math.max(0, (target - baseS[a]) / ds)) : 0;
  const pa = brt.baseSeqPos[a]; const pb = brt.baseSeqPos[bb];
  return [brt.XY[2 * pa] + (brt.XY[2 * pb] - brt.XY[2 * pa]) * t, brt.XY[2 * pa + 1] + (brt.XY[2 * pb + 1] - brt.XY[2 * pa + 1]) * t];
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

/** Solve one crossing/eye cut inside its s window on both borders. */
function evalCut(rt: Runtime, b: number, id: number, h: number): void {
  const brt = rt.b[b]; const bs = brt.bs;
  const ob = bs.other[id]; const ort = rt.b[ob]; const obs = ort.bs;
  const a = bs.i1[id]; const bb = bs.i2[id]; const c = bs.i3[id]; const d = bs.i4[id];
  const j = brt.posOfId[id];
  const j0 = brt.basePos[a]; const j1 = ort.basePos[c];
  let x = 0; let y = 0; let s = 0; let fx = 0; let fy = 0;
  let solved = false;
  if (j0 >= 0 && j1 >= 0) {
    const bp = brt.baseSeqPos; const op = ort.baseSeqPos;
    const bXY = brt.XY; const oXY = ort.XY; const bC = brt.CXY;
    const tryPair = (di: number, dj: number): boolean => {
      const jo = j0 + di; const jo2 = j1 + dj;
      const pa = bp[jo]; const pb = bp[jo + 1]; const pc = op[jo2]; const pd = op[jo2 + 1];
      const ax = bXY[2 * pa]; const ay = bXY[2 * pa + 1];
      const ex = bXY[2 * pb] - ax; const ey = bXY[2 * pb + 1] - ay;
      const cx = oXY[2 * pc]; const cy = oXY[2 * pc + 1];
      const fx2 = oXY[2 * pd] - cx; const fy2 = oXY[2 * pd + 1] - cy;
      if (Math.max(cx, cx + fx2) < Math.min(ax, ax + ex) || Math.min(cx, cx + fx2) > Math.max(ax, ax + ex) || Math.max(cy, cy + fy2) < Math.min(ay, ay + ey) || Math.min(cy, cy + fy2) > Math.max(ay, ay + ey)) return false;
      const det = ex * fy2 - ey * fx2;
      if (Math.abs(det) < 1e-300) return false;
      const gx = cx - ax; const gy = cy - ay;
      const tt = (gx * fy2 - gy * fx2) / det;
      const uu = (gx * ey - gy * ex) / det;
      if (tt < -1e-9 || tt > 1 + 1e-9 || uu < -1e-9 || uu > 1 + 1e-9) return false;
      const hitT = Math.min(1, Math.max(0, tt));
      x = ax + ex * hitT;
      y = ay + ey * hitT;
      s = brt.baseS[jo] + (brt.baseS[jo + 1] - brt.baseS[jo]) * hitT;
      fx = bC[2 * pa] + (bC[2 * pb] - bC[2 * pa]) * hitT;
      fy = bC[2 * pa + 1] + (bC[2 * pb + 1] - bC[2 * pa + 1]) * hitT;
      return true;
    };
    solved = tryPair(0, 0);
    if (!solved) {
      const nOwn = bs.baseSeq.length - 1; const nOther = obs.baseSeq.length - 1;
      const winS = bs.winS[id] > 0 ? bs.winS[id] : 2.5 * h;
      const seedSOwn = brt.baseS[j0]; const seedSOther = ort.baseS[j1];
      const ubS = (arr: Float64Array, v: number, loI: number, hiI: number): number => { let a = loI; let b = hiI; while (a < b) { const m = (a + b) >> 1; if (arr[m] <= v) a = m + 1; else b = m; } return a; };
      const diMax = Math.max(0, Math.min(nOwn - 1, ubS(brt.baseS, seedSOwn + winS, j0, brt.baseS.length) - 1) - j0);
      const diMin = Math.max(0, j0 - ubS(brt.baseS, seedSOwn - winS - 1e-12, 0, j0));
      const djMax = Math.max(0, Math.min(nOther - 1, ubS(ort.baseS, seedSOther + winS, j1, ort.baseS.length) - 1) - j1);
      const djMin = Math.max(0, j1 - ubS(ort.baseS, seedSOther - winS - 1e-12, 0, j1));
      const Rmax = Math.max(diMax, diMin, djMax, djMin);
      outer: for (let R = 0; R <= Rmax && !solved; R++) {
        for (let di = -R; di <= R && !solved; di++) {
          if (di < -diMin || di > diMax) continue;
          const jo = j0 + di;
          const pa = bp[jo]; const pb = bp[jo + 1];
          const ax = bXY[2 * pa]; const ay = bXY[2 * pa + 1];
          const ex = bXY[2 * pb] - ax; const ey = bXY[2 * pb + 1] - ay;
          const obx0 = Math.min(ax, ax + ex); const obx1 = Math.max(ax, ax + ex);
          const oby0 = Math.min(ay, ay + ey); const oby1 = Math.max(ay, ay + ey);
          const testDj = (dj: number): boolean => {
            if (dj < -djMin || dj > djMax) return false;
            const jo2 = j1 + dj;
            const pc = op[jo2]; const pd = op[jo2 + 1];
            const cx = oXY[2 * pc]; const cy = oXY[2 * pc + 1];
            const fx2 = oXY[2 * pd] - cx; const fy2 = oXY[2 * pd + 1] - cy;
            if (Math.max(cx, cx + fx2) < obx0 || Math.min(cx, cx + fx2) > obx1 || Math.max(cy, cy + fy2) < oby0 || Math.min(cy, cy + fy2) > oby1) return false;
            const det = ex * fy2 - ey * fx2;
            if (Math.abs(det) < 1e-300) return false;
            const gx = cx - ax; const gy = cy - ay;
            const tt = (gx * fy2 - gy * fx2) / det;
            const uu = (gx * ey - gy * ex) / det;
            if (tt < -1e-9 || tt > 1 + 1e-9 || uu < -1e-9 || uu > 1 + 1e-9) return false;
            const hitT = Math.min(1, Math.max(0, tt));
            x = ax + ex * hitT;
            y = ay + ey * hitT;
            s = brt.baseS[jo] + (brt.baseS[jo + 1] - brt.baseS[jo]) * hitT;
            fx = bC[2 * pa] + (bC[2 * pb] - bC[2 * pa]) * hitT;
            fy = bC[2 * pa + 1] + (bC[2 * pb + 1] - bC[2 * pa + 1]) * hitT;
            return true;
          };
          if (Math.abs(di) === R) {
            for (let dj = -R; dj <= R && !solved; dj++) if (testDj(dj)) solved = true;
          } else {
            if (testDj(-R)) solved = true;
            else if (testDj(R)) solved = true;
          }
        }
      }
    }
    if (!solved) {
      // No intersection inside the window: the cut collapses to the
      // closest approach of the two seed segments in this frame.
      const pa = bp[j0]; const pb = bp[j0 + 1]; const pc = op[j1]; const pd = op[j1 + 1];
      const cl = segSegClosest(bXY[2 * pa], bXY[2 * pa + 1], bXY[2 * pb], bXY[2 * pb + 1], oXY[2 * pc], oXY[2 * pc + 1], oXY[2 * pd], oXY[2 * pd + 1]);
      const t = cl[0];
      x = bXY[2 * pa] + (bXY[2 * pb] - bXY[2 * pa]) * t;
      y = bXY[2 * pa + 1] + (bXY[2 * pb + 1] - bXY[2 * pa + 1]) * t;
      s = brt.baseS[j0] + (brt.baseS[j0 + 1] - brt.baseS[j0]) * t;
      fx = bC[2 * pa] + (bC[2 * pb] - bC[2 * pa]) * t;
      fy = bC[2 * pa + 1] + (bC[2 * pb + 1] - bC[2 * pa + 1]) * t;
    }
  } else {
    const pX = (r: BRun, id: number): number => { const q = r.basePos[id]; return q >= 0 ? r.XY[2 * r.posOfId[id]] : r.X[id]; };
    const pY = (r: BRun, id: number): number => { const q = r.basePos[id]; return q >= 0 ? r.XY[2 * r.posOfId[id] + 1] : r.Y[id]; };
    const pS = (r: BRun, id: number): number => { const q = r.basePos[id]; return q >= 0 ? r.baseS[q] : r.S[id]; };
    const pFX = (r: BRun, id: number): number => { const q = r.basePos[id]; return q >= 0 ? r.CXY[2 * r.posOfId[id]] : r.FX[id]; };
    const pFY = (r: BRun, id: number): number => { const q = r.basePos[id]; return q >= 0 ? r.CXY[2 * r.posOfId[id] + 1] : r.FY[id]; };
    const ax = pX(brt, a); const ay = pY(brt, a); const bx2 = pX(brt, bb); const by2 = pY(brt, bb);
    const cx = pX(ort, c); const cy = pY(ort, c); const dx2 = pX(ort, d); const dy2 = pY(ort, d);
    const hit = segInt(ax, ay, bx2, by2, cx, cy, dx2, dy2);
    if (hit) { x = ax + (bx2 - ax) * hit.t; y = ay + (by2 - ay) * hit.t; s = pS(brt, a) + (pS(brt, bb) - pS(brt, a)) * hit.t; fx = pFX(brt, a) + (pFX(brt, bb) - pFX(brt, a)) * hit.t; fy = pFY(brt, a) + (pFY(brt, bb) - pFY(brt, a)) * hit.t; }
    else { const cl = segSegClosest(ax, ay, bx2, by2, cx, cy, dx2, dy2); const t = cl[0]; x = ax + (bx2 - ax) * t; y = ay + (by2 - ay) * t; s = pS(brt, a) + (pS(brt, bb) - pS(brt, a)) * t; fx = pFX(brt, a) + (pFX(brt, bb) - pFX(brt, a)) * t; fy = pFY(brt, a) + (pFY(brt, bb) - pFY(brt, a)) * t; }
  }
  brt.X[id] = x; brt.Y[id] = y; brt.S[id] = s; brt.FX[id] = fx; brt.FY[id] = fy; brt.done[id] = 1;
  if (j >= 0) { brt.XY[2 * j] = x; brt.XY[2 * j + 1] = y; brt.CXY[2 * j] = fx; brt.CXY[2 * j + 1] = fy; brt.SA[j] = s; }
  void h;
}

function borderSeqIdx(st: OutlineStructure, closed: boolean[], pi: number, side: number, fromIdx: number, toIdx: number, forward: boolean): number[] {
  const b = pi * 2 + (side === 1 ? 0 : 1);
  const nPts = st.borders[b].seqPool.length;
  const out: number[] = [];
  if (nPts === 0) return out;
  const from = Math.max(0, fromIdx); const to = Math.max(0, toIdx);
  if (!closed[pi]) {
    if (forward) { for (let i = from; i <= to && i < nPts; i++) out.push(i); }
    else { for (let i = from; i >= to && i >= 0; i--) out.push(i); }
    return out;
  }
  const mod = Math.max(1, nPts - 1);
  let fi = ((from % mod) + mod) % mod;
  const ti = ((to % mod) + mod) % mod;
  if (forward) {
    for (let guard = 0; guard <= mod; guard++) { out.push(fi); if (fi === ti) break; fi = (fi + 1) % mod; }
  } else {
    for (let guard = 0; guard <= mod; guard++) { out.push(fi); if (fi === ti) break; fi = (fi - 1 + mod) % mod; }
  }
  return out;
}

function seqToOps(b: number, seq: number[], ops: RegionOp[]): void {
  let i = 0;
  let pending: number[] = [];
  const flush = (): void => { if (pending.length) { ops.push({ t: 1, b, idx: Int32Array.from(pending) }); pending = []; } };
  while (i < seq.length) {
    if (i + 1 < seq.length && seq[i + 1] === seq[i] + 1) {
      flush();
      const from = seq[i];
      let count = 1;
      while (i + count < seq.length && seq[i + count] === from + count) count++;
      ops.push({ t: 0, b, from, count });
      i += count;
    } else if (i + 1 < seq.length && seq[i + 1] === seq[i] - 1) {
      flush();
      const from = seq[i];
      let count = 1;
      while (i + count < seq.length && seq[i + count] === from - count) count++;
      ops.push({ t: 6, b, from, count });
      i += count;
    } else { pending.push(seq[i]); i++; }
  }
  flush();
}

function getRuntime(st: OutlineStructure, scene: SceneIn): Runtime {
  const holder = st as OutlineStructure & { __rt?: Runtime };
  if (holder.__rt) {
    let ok = true;
    scene.chains.forEach((c, i) => { if (Math.ceil(c.pts.length / 2) + 2 > holder.__rt!.capPts[i]) ok = false; });
    if (ok) return holder.__rt;
  }
  const rt = buildRuntime(st, scene);
  holder.__rt = rt;
  return rt;
}

function buildRuntime(st: OutlineStructure, scene: SceneIn): Runtime {
  const closed = scene.chains.map((c) => c.closed);
  const capPts = new Int32Array(scene.chains.length);
  const mkPoly = (i: number, cap: number): Poly => ({ id: i, n: 0, closed: scene.chains[i].closed, nseg: 0, len: 0, s0: 0, x: new Float64Array(Math.max(1, cap)), y: new Float64Array(Math.max(1, cap)), s: new Float64Array(Math.max(1, cap)), segLen: new Float64Array(Math.max(1, cap)), dx: new Float64Array(Math.max(1, cap)), dy: new Float64Array(Math.max(1, cap)), bx0: new Float64Array(Math.max(1, cap)), by0: new Float64Array(Math.max(1, cap)), bx1: new Float64Array(Math.max(1, cap)), by1: new Float64Array(Math.max(1, cap)), bk: new Float64Array(4 * Math.max(1, Math.ceil(cap / 32))), nblk: 0 });
  const rawPolys: Poly[] = []; const polys: Poly[] = [];
  let maxPts = 4;
  scene.chains.forEach((c, i) => { const cap = Math.ceil(c.pts.length / 2) + 2; capPts[i] = cap; maxPts = Math.max(maxPts, cap); rawPolys.push(mkPoly(i, cap)); polys.push(mkPoly(i, cap)); });
  const tan = scene.chains.map((c, i) => ({ tx: new Float64Array(Math.max(1, capPts[i])), ty: new Float64Array(Math.max(1, capPts[i])), vtX: new Float64Array(Math.max(1, capPts[i])), vtY: new Float64Array(Math.max(1, capPts[i])), gF: new Float64Array(Math.max(1, capPts[i])), gB: new Float64Array(Math.max(1, capPts[i])) }));
  const idxOf = new Map<number, number>();
  scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  const depthS: Float64Array[] = scene.chains.map(() => new Float64Array(4));
  const depthZ: Float64Array[] = scene.chains.map(() => new Float64Array(4));
  {
    const counts = new Int32Array(scene.chains.length);
    scene.crossings.forEach((x) => { const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain); if (ia !== undefined) counts[ia]++; if (ib !== undefined) counts[ib]++; });
    scene.chains.forEach((c, i) => { depthS[i] = new Float64Array(counts[i] + 1); depthZ[i] = new Float64Array(counts[i] + 1); });
  }
  const arms: FArm[] = st.arms.map((a) => ({ ...a, ux: 0, uy: 0, ang: 0 }));
  const fCorners: FCorner[] = st.corners.map(() => ({ ok: false, Vx: 0, Vy: 0, qx: 0, qy: 0, tax: 0, tay: 0, tbx: 0, tby: 0, sA: 0, sB: 0, fax: 0, fay: 0, fbx: 0, fby: 0, r: 0, theta: 0, duA: 0, duB: 0, dvA: 0, dvB: 0 }));
  const b: BRun[] = st.borders.map((bs, bi) => {
    const pool = bs.kind.length;
    const posOfId = new Int32Array(pool).fill(-1);
    bs.seqPool.forEach((id, j) => { posOfId[id] = j; });
    const basePos = new Int32Array(pool).fill(-1);
    bs.baseSeq.forEach((id, j) => { basePos[id] = j; });
    const baseSeqPos = new Int32Array(bs.baseSeq.length);
    bs.baseSeq.forEach((id, j) => { baseSeqPos[j] = posOfId[id]; });
    const runsArr: number[] = []; const otherArr: number[] = [];
    for (let j = 0; j < bs.baseSeq.length; j++) { const kd = bs.kind[bs.baseSeq[j]]; if (kd === 0) { if (runsArr.length >= 2 && runsArr[runsArr.length - 2] + runsArr[runsArr.length - 1] === j) runsArr[runsArr.length - 1]++; else runsArr.push(j, 1); } else if (kd === 1 || kd === 2) otherArr.push(j); }
    const k0Runs = Int32Array.from(runsArr); const baseOther = Int32Array.from(otherArr);
    return {
      bs, pi: bi >> 1, side: (bi & 1) === 0 ? 1 : -1,
      X: new Float64Array(pool), Y: new Float64Array(pool), S: new Float64Array(pool), FX: new Float64Array(pool), FY: new Float64Array(pool), done: new Uint8Array(pool),
      baseS: new Float64Array(bs.baseSeq.length), basePos, baseSeqPos, k0Runs, baseOther,
      XY: new Float64Array(2 * bs.seqPool.length), CXY: new Float64Array(2 * bs.seqPool.length), SA: new Float64Array(bs.seqPool.length), posOfId, exp: new Uint8Array(Math.max(0, bs.seqPool.length - 1)),
    };
  });
  const capsXY = st.caps.map((cap) => new Float64Array(2 * (cap.steps + 1)));
  const capsCXY = st.caps.map((cap) => new Float64Array(2 * (cap.steps + 1)));
  const junctionRid = new Map<number, number>();
  for (const f of st.faces) if (f.kind === 1) junctionRid.set(f.ji, f.rid);
  const cornerByArmA = new Map<string, number>();
  st.corners.forEach((cs, ci) => cornerByArmA.set(`${cs.ji}|${cs.aArm}`, ci));
  const nRegions = st.faces.length;
  const regions: OutlineRegion[] = [];
  const regionTpl: { ops: RegionOp[] }[] = [];
  for (let r = 0; r < nRegions; r++) { const f = st.faces.find((q) => q.rid === r); regions.push({ id: r, ownerChain: f ? f.owner : -1, group: f ? f.group : -1, pts: [], pieces: [], hole: false }); regionTpl.push({ ops: [] }); }
  for (const iv of st.intervals) {
    if (iv.discard || iv.rid < 0 || iv.rid >= nRegions) continue;
    const A = st.stations[iv.aSt]; const B = st.stations[iv.bSt];
    if (!A || !B) continue;
    const ops: RegionOp[] = [];
    const aLeft = st.borders[A.leftB].idxOfFull[A.leftFull];
    const bLeft = st.borders[B.leftB].idxOfFull[B.leftFull];
    const bRight = st.borders[B.rightB].idxOfFull[B.rightFull];
    const aRight = st.borders[A.rightB].idxOfFull[A.rightFull];
    seqToOps(iv.pi * 2, borderSeqIdx(st, closed, iv.pi, 1, aLeft, bLeft, true), ops);
    const capB = st.capByStation[iv.bSt];
    if (capB >= 0 && B.kind.startsWith("cap")) ops.push({ t: 2, cap: capB, from: 1, to: st.caps[capB].steps - 1, step: 1 });
    seqToOps(iv.pi * 2 + 1, borderSeqIdx(st, closed, iv.pi, -1, bRight, aRight, false), ops);
    const capA = st.capByStation[iv.aSt];
    if (capA >= 0 && A.kind.startsWith("cap")) ops.push({ t: 2, cap: capA, from: st.caps[capA].steps - 1, to: 1, step: -1 });
    regionTpl[iv.rid] = { ops };
  }
  scene.junctions.forEach((J, ji) => {
    const rid = junctionRid.get(ji);
    if (rid === undefined) return;
    const list = st.armsOfJ[ji];
    if (!list || list.length < 2) return;
    const ops: RegionOp[] = [];
    for (const ai of list) {
      const arm = st.arms[ai]; const ap = st.armPts[ai];
      if (ap.prevFull >= 0) ops.push({ t: 3, b: ap.prevB, full: ap.prevFull });
      else ops.push({ t: 4, pi: arm.pi, side: ap.nextFull >= 0 ? -ap.nextSide : 1, s: arm.sR });
      if (ap.nextFull >= 0) ops.push({ t: 3, b: ap.nextB, full: ap.nextFull });
      else ops.push({ t: 4, pi: arm.pi, side: ap.prevFull >= 0 ? -ap.prevSide : -1, s: arm.sR });
      const ci = cornerByArmA.get(`${ji}|${ai}`);
      if (ci !== undefined) ops.push({ t: 5, corner: ci });
    }
    regionTpl[rid] = { ops };
    void J;
  });
  let regionCap = 0;
  for (const tpl of regionTpl) for (const op of tpl.ops) regionCap += op.t === 0 || op.t === 6 ? op.count : op.t === 1 ? op.idx.length : op.t === 2 ? Math.abs(op.to - op.from) + 1 : op.t === 5 ? 17 : 1;
  const regionBuf = new Float64Array(2 * Math.max(16, regionCap));
  const piecesOut: OutlinePiece[] = [];
  const runUpd: Runtime["runUpd"] = [];
  for (let pi = 0; pi < closed.length; pi++) {
    for (let bi = 0; bi < 2; bi++) {
      const bIdx = pi * 2 + bi; const bs = st.borders[bIdx]; const brt = b[bIdx];
      const side = bi === 0 ? 1 : -1;
      const runs = bs.runs;
      for (let ri = 0; ri < runs.length; ri += 3) {
        const start = runs[ri]; const end = runs[ri + 1]; const rid = runs[ri + 2];
        const piece: OutlinePiece = { kind: "run", chain: pi, side, s0: 0, s1: 0, pts: brt.XY.subarray(2 * start, 2 * (end + 1)) as unknown as number[], cpts: brt.CXY.subarray(2 * start, 2 * (end + 1)) as unknown as number[], region: rid, corner: -1 };
        runUpd.push({ piece, b: bIdx, start, end });
      }
    }
  }
  const arcPieces: OutlinePiece[] = [];
  const arcBuf: Float64Array[] = []; const arcCBuf: Float64Array[] = [];
  st.corners.forEach((cs, ci) => {
    arcBuf.push(new Float64Array(2 * 33)); arcCBuf.push(new Float64Array(2 * 33));
    arcPieces.push({ kind: "arc", chain: cs.stored.aChain, side: 0, s0: 0, s1: 0, pts: [], cpts: [], region: junctionRid.get(cs.ji) ?? -1, corner: ci });
  });
  const capPieces: OutlinePiece[] = [];
  st.caps.forEach((cap, capIdx) => {
    const cS = st.stations[cap.station].cS;
    for (const run of cap.runs) {
      capPieces.push({ kind: "cap", chain: cap.pi, side: 0, s0: cS, s1: cS, pts: capsXY[capIdx].subarray(2 * run[0], 2 * run[1] + 2) as unknown as number[], cpts: capsCXY[capIdx].subarray(2 * run[0], 2 * run[1] + 2) as unknown as number[], region: -1, corner: -1 });
    }
  });
  const faces: OutlineFace[] = st.faces.map((f) => ({ ownerChain: f.owner, group: f.group, pts: [], sample: [0, 0], hole: false }));
  const facesOut: OutlineFace[] = faces.slice();
  const faceOrder = st.faces.map((_, i) => i);
  const cutList: Runtime["cutList"] = [];
  const ptList: Runtime["ptList"] = [];
  st.borders.forEach((bs, bi) => {
    bs.seqPool.forEach((id, j) => {
      const kd = bs.kind[id];
      if (kd === 4) cutList.push({ b: bi, id });
      else if (kd === 5 || kd === 6) ptList.push({ b: bi, j, id });
    });
  });
  const passCounts = new Int32Array(scene.chains.length);
  scene.crossings.forEach((x) => { const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain); if (ia !== undefined) passCounts[ia]++; if (ib !== undefined) passCounts[ib]++; });
  const passS = scene.chains.map((_, i) => new Float64Array(passCounts[i] + 1));
  const passSq = scene.chains.map((_, i) => new Float64Array(passCounts[i] + 1));
  const passTheta = scene.chains.map((_, i) => new Float64Array(passCounts[i] + 1));
  const passQi = scene.chains.map((_, i) => new Int32Array(passCounts[i] + 1));
  const cornersT: OutlineCorner[] = st.corners.map((cs) => ({ ...cs.stored }));
  const cutsT: OutlineCut[] = st.cuts.map((c) => ({ crossing: c.crossing, chain: c.chain, side: c.side, s: 0, x: 0, y: 0, overChain: c.overChain }));
  const diag: string[] = [
    `eyes ${st.stats.eyeCount} (border cuts ${st.stats.eyeKept}, depth-tie cuts ${st.stats.tieCutCount}), kink self-crossings ${st.stats.kinkCount}`,
    `crossings in a junction span ${st.stats.crossInJunction}, corner arcs near another thread ${st.stats.arcNearThread}`,
    "",
  ];
  const table: OutlineTable = { h: 0, W: 0, pieces: piecesOut, regions, faces: facesOut, corners: cornersT, cuts: cutsT, diagnostics: diag };
  return {
    rawPolys, polys, needRaw: new Uint8Array(scene.chains.length), extPts: new Float64Array(2 * (maxPts + 2)), capPts, tan, idxOf,
    depthS, depthZ, depthN: new Int32Array(scene.chains.length),
    arms, fCorners, b, capsXY, capsCXY, capsC: new Float64Array(2 * Math.max(1, st.caps.length)),
    regions, regionTpl, regionBuf, piecesOut, runUpd, arcPieces, arcBuf, arcCBuf, arcSteps: new Int32Array(st.corners.length), arcDone: new Uint8Array(st.corners.length), capPieces,
    faces, facesOut, faceOrder, faceDepth: new Float64Array(st.faces.length),
cornersT, cutsT, cutList, ptList, nodeState: new Float64Array(33 * 12), nodeK: new Int32Array(33 * 2),
    runPool: (() => { const pool: OutlinePiece[] = []; for (const bs of st.borders) for (let j = 0; j + 1 < bs.seqPool.length; j++) pool.push({ kind: "run", chain: 0, side: 1, s0: 0, s1: 0, pts: [], cpts: [], region: -1, corner: -1 }); return pool; })(),
    runOff: (() => { const o = new Int32Array(st.borders.length + 1); st.borders.forEach((bs, i) => { o[i + 1] = o[i] + Math.max(0, bs.seqPool.length - 1); }); return o; })(),
    trimSR: new Float64Array(2 * st.corners.length + 2), trimDir: new Float64Array(2 * st.corners.length + 2), trimDEnd: new Float64Array(2 * st.corners.length + 2), trimOff: new Int32Array(st.borders.length + 1),
    passS, passSq, passTheta, passQi, passN: new Int32Array(scene.chains.length),
    armLroot: new Float64Array(st.arms.length), armLcut: new Float64Array(st.arms.length), armUB: new Float64Array(st.arms.length),
    armsOfJSorted: st.armsOfJ.map((l) => l.slice()), chainArms: scene.chains.map((_, pi) => st.arms.map((a, ai) => (a.pi === pi ? ai : -1)).filter((x) => x >= 0)),
    diag, table, emptyPts: [],
  };
}
