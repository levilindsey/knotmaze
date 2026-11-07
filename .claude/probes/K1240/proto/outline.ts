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
  x: Float64Array; y: Float64Array; s: Float64Array; segLen: Float64Array;
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
  const p: Poly = { id, n, closed, nseg, len: 0, s0, x: Float64Array.from(xs), y: Float64Array.from(ys), s: new Float64Array(n), segLen: new Float64Array(Math.max(nseg, 0)) };
  if (n > 0) p.s[0] = s0;
  for (let k = 0; k < nseg; k++) {
    const b = k + 1 === n ? 0 : k + 1;
    const l = Math.hypot(p.x[b] - p.x[k], p.y[b] - p.y[k]);
    p.segLen[k] = l;
    if (k + 1 < n) p.s[k + 1] = p.s[k] + l;
  }
  p.len = n > 0 ? p.s[n - 1] - s0 + (closed ? p.segLen[n - 1] : 0) : 0;
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

interface BPt { x: number; y: number; s: number }
interface Border { pi: number; side: number; pts: BPt[]; closed: boolean }

function offPoint(p: Poly, k: number, v: number, sig: number, h: number): [number, number] {
  const b = k + 1 === p.n ? 0 : k + 1;
  const l = p.segLen[k] || 1;
  const tx = (p.x[b] - p.x[k]) / l; const ty = (p.y[b] - p.y[k]) / l;
  return [p.x[v] + sig * h * -ty, p.y[v] + sig * h * tx];
}

export function buildBorder(p: Poly, sig: number, h: number): BPt[] {
  const out: BPt[] = [];
  const push = (x: number, y: number, s: number) => {
    const q = out[out.length - 1];
    if (q && Math.abs(q.x - x) + Math.abs(q.y - y) < 1e-12) return;
    out.push({ x, y, s });
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
    if (Math.abs(cross) < 1e-12) { push(bx, by, p.s[v]); return false; }
    const joinSide = cross > 0 ? 1 : -1;
    if (sig === joinSide) {
      const det = cross;
      const dx = bx - ax; const dy = by - ay;
      const t = (dx * tNy - dy * tNx) / det;
      const jx = ax + tPx * t; const jy = ay + tPy * t;
      const q = out[out.length - 1];
      if (q && Math.abs(q.x - ax) + Math.abs(q.y - ay) < 1e-9) { q.x = jx; q.y = jy; }
      else push(jx, jy, p.s[v]);
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
      push(p.x[v] + h * Math.cos(a), p.y[v] + h * Math.sin(a), p.s[v]);
    }
    push(bx, by, p.s[v]);
    return false;
  };
  if (p.closed) {
    for (let k = 0; k < p.nseg; k++) {
      const joined = transition(k);
      const b = k + 1 === p.n ? 0 : k + 1;
      const [ax, ay] = offPoint(p, k, k, sig, h);
      const [bx, by] = offPoint(p, k, b, sig, h);
      if (!joined) push(ax, ay, p.s[k]);
      push(bx, by, p.s[b]);
    }
    // Close the loop explicitly (s runs to s0+len) for linear handling.
    if (out.length > 1) {
      const f = out[0];
      const l = out[out.length - 1];
      if (Math.hypot(f.x - l.x, f.y - l.y) > 1e-12) out.push({ x: f.x, y: f.y, s: p.s0 + p.len });
      else l.s = p.s0 + p.len;
    }
  } else {
    const [ax, ay] = offPoint(p, 0, 0, sig, h);
    push(ax, ay, p.s[0]);
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1;
      const [bx, by] = offPoint(p, k, b, sig, h);
      const joined = k > 0 ? transition(k) : false;
      if (!joined) {
        const [sx, sy] = offPoint(p, k, k, sig, h);
        const q = out[out.length - 1];
        if (!q || Math.abs(q.x - sx) + Math.abs(q.y - sy) >= 1e-9) push(sx, sy, p.s[k]);
      }
      push(bx, by, p.s[b]);
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
          out = [...out.slice(0, i + 1), { x, y, s }, ...out.slice(j)];
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

interface PtRef { pi: number; side: number; x: number; y: number; s: number; idx: number }
interface Ev { seg: number; t: number; ref: PtRef }
interface ArmInfo { ji: number; ei: number; pi: number; sR: number; dir: number; kind: string; ux: number; uy: number; ang: number; L: number; Lcut: number; g: number; idx: number }
interface CornerWork extends OutlineCorner { ji: number; aArm: number; bArm: number; sideA: number; sideB: number; sA: number; sB: number; dA: number; dB: number; refA: PtRef | null; refB: PtRef | null; refVA: PtRef | null; refVB: PtRef | null }
interface Station { pi: number; cS: number; left: PtRef; right: PtRef; kind: string; key: string }

export function buildOutline(scene: SceneIn): OutlineTable { return buildOutlineFull(scene).table; }
export function buildOutlineFull(scene: SceneIn): { table: OutlineTable; debug: Record<string, unknown> } {
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
  for (const j of scene.junctions) {
    for (const arm of j.arms) {
      if (arm.kind !== "end") continue;
      const pi = idxOf.get(arm.chain);
      if (pi === undefined) continue;
      const p = rawPolys[pi];
      const term = pointAt(p, arm.s);
      let cp: [number, number] = [j.c[0], j.c[1]];
      let best = Infinity;
      for (const t of j.arms) {
        if (t.kind !== "through") continue;
        const ti = idxOf.get(t.chain);
        if (ti === undefined) continue;
        const f = footInWindow(rawPolys[ti], term.x, term.y, t.s - 4 * h, t.s + 4 * h);
        if (f.d < best) { best = f.d; cp = [f.x, f.y]; }
      }
      if (Math.abs(arm.s - 0) < Math.abs(arm.s - p.len)) exts[pi].start = cp;
      else exts[pi].end = cp;
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
  const mkRef = (pi: number, side: number, x: number, y: number, s: number): PtRef => ({ pi, side, x, y, s, idx: -1 });
  const addEv = (pi: number, side: number, seg: number, t: number, ref: PtRef): void => {
    if (seg < 0) return;
    evs[pi][bIdx(side)].push({ seg, t: Math.min(1, Math.max(0, t)), ref });
  };
  // Locate a point known to lie on a border near foot s; add it.
  const addPointAt = (pi: number, side: number, x: number, y: number, sFoot: number): PtRef => {
    const B = borders[pi][bIdx(side)];
    const ref = mkRef(pi, side, x, y, sFoot);
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
      const style = st === "sharp" ? 0 : 1;
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
      if (!(A.L > 1e-9 && B.L > 1e-9)) { cw.why = "arm span 0"; corners.push(cw); cornerWork.push(cw); continue; }
      let bx = A.ux + B.ux; let by = A.uy + B.uy;
      const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
      const sn = Math.sin(th / 2) || 1;
      const V = solveEq(A, B, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, h / Math.max(Math.tan(th / 2), 1e-6));
      if (!V.ok) { cw.why = "no V"; corners.push(cw); cornerWork.push(cw); diagnostics.push(`corner ${j.id}: no V`); continue; }
      const dVa = armDist(A, V.fa.s); const dVb = armDist(B, V.fb.s);
      const tol = 1e-9 * h;
      if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) { cw.why = "V outside spans"; corners.push(cw); cornerWork.push(cw); continue; }
      const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
      const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
      const sgn = Math.sign(cross) || 1;
      if (!(crossA * sgn > 0 && crossB * sgn < 0)) { cw.why = "V outside wedge"; corners.push(cw); cornerWork.push(cw); continue; }
      cw.Vx = V.x; cw.Vy = V.y; cw.ok = true;
      const t2 = Math.tan(th / 2);
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
            const acc = Math.min(h, Math.max(0.5 * Math.hypot(ux, uy) * dd, 1e-3 * h));
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
      const rbEff = Math.max(0.5 * h * rootTipScale(th), 1e-9 * h);
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
      cw.r = r;
      cw.tax = tax; cw.tay = tay; cw.tbx = tbx; cw.tby = tby;
      cw.sA = sA; cw.sB = sB; cw.dA = dA; cw.dB = dB;
      if (r > 1e-9) {
        cw.refA = addPointAt(A.pi, sideA, tax, tay, sA);
        cw.refB = addPointAt(B.pi, sideB, tbx, tby, sB);
      } else {
        cw.refA = addPointAt(A.pi, sideA, V.x, V.y, sA);
        cw.refB = addPointAt(B.pi, sideB, V.x, V.y, sB);
      }
      cw.refVA = cw.refA; cw.refVB = cw.refB;
      armNextPt[ai] = cw.refA; armNextSide[ai] = sideA;
      armPrevPt[bi] = cw.refB; armPrevSide[bi] = sideB;
      trimIntervals.push({ pi: A.pi, side: sideA, sR: A.sR, dir: A.dir, dEnd: r > 1e-9 ? dA : dVa });
      trimIntervals.push({ pi: B.pi, side: sideB, sR: B.sR, dir: B.dir, dEnd: r > 1e-9 ? dB : dVb });
      corners.push(cw);
      cornerWork.push(cw);
    }
  });

  // Crossings: intersect the under's borders with the over's near each
  // crossing, starting from the crossing's s on each chain.
  const cuts: OutlineCut[] = [];
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
        const uRef = mkRef(U, uSide, px, py, a.s + (b.s - a.s) * hit.t);
        const oRef = mkRef(O, oSide, px, py, c.s + (d.s - c.s) * hit.u);
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
      for (const c of [cl, crd]) cuts.push({ crossing: xi, chain: U, side: c.uSide, s: c.uRef.s, x: c.x, y: c.y, overChain: O });
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
        const segsA: number[] = []; const segsB: number[] = [];
        const segInArc = (p: Poly, ls: number, hs: number, s0: number, gap: number): boolean => inArc(p, ls, s0, gap) || inArc(p, hs, s0, gap) || (sDistToInterval(p, s0, ls, hs) === 0 && gap >= 0) || Math.abs(dS(p, s0 + gap / 2, ls + (hs - ls) / 2)) <= gap / 2 + Math.abs(hs - ls) / 2;
        for (let i = 0; i + 1 < BA.pts.length; i++) { if (segInArc(pA, BA.pts[i].s, BA.pts[i + 1].s, e.sPi0, e.gapPi)) segsA.push(i); }
        for (let i = 0; i + 1 < BB.pts.length; i++) { if (segInArc(pB, BB.pts[i].s, BB.pts[i + 1].s, e.sQi0, e.gapQi)) segsB.push(i); }
        for (const i of segsA) for (const j of segsB) {
          if (e.pi === e.qi && sa === sb && i === j) continue;
          const a = BA.pts[i]; const b = BA.pts[i + 1]; const c = BB.pts[j]; const d = BB.pts[j + 1];
          const hit = segInt(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
          if (!hit) continue;
          const px = a.x + (b.x - a.x) * hit.t; const py = a.y + (b.y - a.y) * hit.t;
          addEv(e.pi, sa, i, hit.t, mkRef(e.pi, sa, px, py, a.s + (b.s - a.s) * hit.t));
          addEv(e.qi, sb, j, hit.u, mkRef(e.qi, sb, px, py, c.s + (d.s - c.s) * hit.u));
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
      capInfos.push({ station: st, atEnd, cx: c.x, cy: c.y, arc });
      // An END arm's root at this chain end makes this the junction cap.
      for (const arm of arms) if (arm.pi === pi && arm.kind === "end" && Math.abs(arm.sR - sEnd) < 1e-9) junctionCapKeys.add(st.key);
    }
  });

  // Apply every event in one rebuild per border; refs gain their index.
  borders.forEach((bs, pi) => {
    bs.forEach((B, bi) => {
      const list = evs[pi][bi];
      if (!list.length) return;
      const bySeg = new Map<number, Ev[]>();
      for (const e of list) { const l = bySeg.get(e.seg) ?? []; l.push(e); bySeg.set(e.seg, l); }
      const old = B.pts;
      const out: BPt[] = [{ ...old[0] }];
      for (let i = 0; i + 1 < old.length; i++) {
        const segEvs = (bySeg.get(i) ?? []).slice().sort((a, b) => a.t - b.t);
        const pending: PtRef[] = [];
        for (const e of segEvs) {
          if (e.t >= 1 - 1e-9) { pending.push(e.ref); continue; }
          const last = out[out.length - 1];
          if (e.t <= 1e-9 || Math.hypot(e.ref.x - last.x, e.ref.y - last.y) < 1e-12) { e.ref.idx = out.length - 1; continue; }
          if (Math.hypot(e.ref.x - last.x, e.ref.y - last.y) < 1e-12) { e.ref.idx = out.length - 1; continue; }
          out.push({ x: e.ref.x, y: e.ref.y, s: old[i].s + (old[i + 1].s - old[i].s) * e.t });
          e.ref.idx = out.length - 1;
          e.ref.s = out[out.length - 1].s;
        }
        out.push({ ...old[i + 1] });
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
  const covering = (x: number, y: number, ownPi: number, ownS: number): boolean => {
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
        if (d >= h) continue;
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
      if (gOwn >= 0 && gOther === gOwn) return true;
      if (depthAt(pi2, s2) > zOwn + 1e-9) return true;
    }
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
  // Exposed flag per border segment.
  const exposed: boolean[][][] = borders.map((bs, pi) => bs.map((B, bi) => {
    const side = bi === 0 ? 1 : -1;
    const out = new Array<boolean>(Math.max(0, B.pts.length - 1)).fill(false);
    for (let i = 0; i + 1 < B.pts.length; i++) {
      const a = B.pts[i]; const b = B.pts[i + 1];
      const midS = a.s + (b.s - a.s) / 2;
      if (isTrimmed(pi, side, midS)) { out[i] = false; continue; }
      out[i] = !covering((a.x + b.x) / 2, (a.y + b.y) / 2, pi, midS);
    }
    return out;
  }));
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

  // Pieces: exposed border runs, corner arcs, caps.
  const pieces: OutlinePiece[] = [];
  const footFlat = (pi: number, s: number): [number, number] => { const a = pointAt(polys[pi], s); return [a.x, a.y]; };
  borders.forEach((bs, pi) => {
    bs.forEach((B, bi) => {
      const side = bi === 0 ? 1 : -1;
      const exp = exposed[pi][bi];
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
  for (const ci of capInfos) {
    const pi = ci.station.pi;
    let cur: OutlinePiece | null = null;
    const flush = (): void => { if (cur && cur.pts.length >= 4) pieces.push(cur); cur = null; };
    for (let i = 0; i + 1 < ci.arc.length; i++) {
      const a = ci.arc[i]; const b = ci.arc[i + 1];
      const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
      if (covering(mx, my, pi, ci.station.cS)) { flush(); continue; }
      if (!cur) cur = { kind: "cap", chain: pi, side: 0, s0: ci.station.cS, s1: ci.station.cS, pts: [a.x, a.y], cpts: [ci.cx, ci.cy], region: -1, corner: -1 };
      cur.pts.push(b.x, b.y);
      cur.cpts.push(ci.cx, ci.cy);
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
  const table: OutlineTable = { h, W, pieces, regions, faces, corners, cuts, diagnostics };
  return { table, debug: { arms: arms.map((a) => ({ ji: a.ji, pi: a.pi, sR: a.sR, dir: a.dir, L: a.L, Lcut: a.Lcut, ang: a.ang })), groups: groupOfJ } };
}







