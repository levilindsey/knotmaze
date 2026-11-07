// K1240 S1: one outline for both looks — a clean prototype of Levi's sketch
// (docs/design/K1240_s1_outline_proto.md). A FieldScene goes in and one
// outline table comes out. Pure TypeScript: no imports at all, so nothing
// from the app renderer can leak in (a test asserts this).
//
// The construction is Levi's, literally:
// - each thread is a centreline polyline; its two borders are the offset
//   polylines at the half-width h (segment offsets, a vertex arc on the
//   convex side of a bend, the offset lines' intersection on the concave
//   side — the polyline tube's exact boundary);
// - cuts are segment intersections: every border is split where it crosses
//   another border, in closed form, from this frame alone;
// - the planar graph of split borders (plus dead-end cap arcs) is traced
//   into faces; a face is owned by the chain whose tube holds it, by the
//   junction group when several arms' tubes hold it, and by the OVER chain
//   when a crossing's two tubes hold it (the cuts alone decide this — no
//   depth field, no label pass);
// - regions are faces merged by owner; a region's boundary, walked as
//   border runs between cuts, corner arcs and caps, is THE outline. The
//   border look strokes it; the filled look fills the faces it bounds.
// - at a junction corner the facing borders meet at V (a graph node);
//   a round corner (the scene's style, cr's radius rule as form B's F2
//   states it) trims both borders back by l = r*cot(theta/2) to the
//   tangent points tA, tB and splices the rolling-ball arc in.
//
// Structure (which pieces exist, which crossing cuts which border, which
// corner joins which arms, sharp or round) is decided once per frame from
// the topology; every cut and tangent point is fractional and recomputed
// in closed form from that frame alone: no stepped walks, no iteration
// warm-started from the last frame, no state carried between frames. (The
// corner centre is the closed-form foot construction on the two arms'
// segments at the tangent feet; the face walk and the arc-length layoff
// along a border are exact operations on the polyline, not searches.)

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
  /** Chain whose border this is (an arc's first arm's chain; a cap's chain). */
  chain: number;
  /** +1 left of increasing s, -1 right, 0 for a cap. */
  side: number;
  /** Centreline s range the piece covers (an arc: its two feet's s). */
  s0: number; s1: number;
  /** Polyline, flat [x0, y0, x1, y1, ...], world units. */
  pts: number[];
  /** Centreline foot per point (same length): the band's inward direction. */
  cpts: number[];
  /** Region (loop) this piece bounds. */
  region: number;
  /** Corner index (kind "arc"), else -1. */
  corner: number;
}
export interface OutlineRegion {
  id: number;
  ownerChain: number;
  /** Junction cluster id, or -1 when the owner is in no junction. */
  group: number;
  /** Closed loop, flat points, first point not repeated at the end. */
  pts: number[];
  pieces: number[];
  /** True for a hole (paper enclosed by thread): drawn, never filled. */
  hole: boolean;
}
export interface OutlineFace {
  ownerChain: number;
  group: number;
  pts: number[];
  /** A point inside the face (the ownership sample). */
  sample: [number, number];
  hole: boolean;
}
export interface OutlineCorner {
  junction: string;
  aChain: number; bChain: number;
  ok: boolean;
  style: number; // 0 sharp, 1 round (the scene's resolved style)
  theta: number;
  r: number;
  Vx: number; Vy: number;
  qx: number; qy: number;
  tax: number; tay: number; tbx: number; tby: number;
  /** Why not, when ok is false. */
  why?: string;
}
export interface OutlineCut {
  crossing: number;
  /** The border that stops: its chain and the s of the cut along it. */
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
// Centreline polylines (own code; the same conventions as the scene format:
// s from the first sample, a closed chain wraps at its total length).

interface Poly {
  id: number; n: number; closed: boolean; nseg: number; len: number;
  x: Float64Array; y: Float64Array; s: Float64Array; segLen: Float64Array;
}

function makePoly(id: number, pts: number[], closed: boolean): Poly {
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
  const p: Poly = { id, n, closed, nseg, len: 0, x: Float64Array.from(xs), y: Float64Array.from(ys), s: new Float64Array(n), segLen: new Float64Array(Math.max(nseg, 0)) };
  for (let k = 0; k < nseg; k++) {
    const b = k + 1 === n ? 0 : k + 1;
    const l = Math.hypot(p.x[b] - p.x[k], p.y[b] - p.y[k]);
    p.segLen[k] = l;
    if (k + 1 < n) p.s[k + 1] = p.s[k] + l;
  }
  p.len = closed && n > 0 ? p.s[n - 1] + p.segLen[n - 1] : n > 0 ? p.s[n - 1] : 0;
  return p;
}

function normS(p: Poly, s: number): number {
  if (p.closed && p.len > 0) { let u = s % p.len; if (u < 0) u += p.len; return u; }
  return Math.min(Math.max(s, 0), p.len);
}
/** Signed s difference b - a, the short way round on a closed chain. */
function dS(p: Poly, a: number, b: number): number {
  let d = b - a;
  if (p.closed && p.len > 0) { d %= p.len; if (d > p.len / 2) d -= p.len; if (d < -p.len / 2) d += p.len; }
  return d;
}

function segOfS(p: Poly, s: number): { k: number; t: number } {
  const u = normS(p, s);
  if (u >= p.s[p.n - 1]) {
    if (p.closed) return { k: p.n - 1, t: Math.min(1, (u - p.s[p.n - 1]) / (p.segLen[p.n - 1] || 1)) };
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

/** Closest distance from (x, y) to the polyline, brute over a segment window. */
function distToPoly(p: Poly, x: number, y: number): number {
  let best = Infinity;
  for (let k = 0; k < p.nseg; k++) {
    const b = k + 1 === p.n ? 0 : k + 1;
    const ex = p.x[b] - p.x[k]; const ey = p.y[b] - p.y[k];
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((x - p.x[k]) * ex + (y - p.y[k]) * ey) / l2 : 0;
    t = Math.min(1, Math.max(0, t));
    const dx = p.x[k] + ex * t - x; const dy = p.y[k] + ey * t - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

// ---------------------------------------------------------------------------
// Borders: the offset polyline of one side of one chain.

interface BPoint { x: number; y: number; s: number }

/** Offset point of vertex v on segment k's line, side sig (+1 left). */
function offPoint(p: Poly, k: number, v: number, sig: number, h: number): [number, number] {
  const b = k + 1 === p.n ? 0 : k + 1;
  const l = p.segLen[k] || 1;
  const tx = (p.x[b] - p.x[k]) / l; const ty = (p.y[b] - p.y[k]) / l;
  return [p.x[v] + sig * h * -ty, p.y[v] + sig * h * tx];
}

export function buildBorder(p: Poly, sig: number, h: number): BPoint[] {
  const out: BPoint[] = [];
  const push = (x: number, y: number, s: number) => {
    const q = out[out.length - 1];
    if (q && Math.abs(q.x - x) + Math.abs(q.y - y) < 1e-12) return;
    out.push({ x, y, s });
  };
  if (p.nseg === 0) return out;
  const arcStep = Math.PI / 16; // chord error h(1-cos(step/2)) ~ 0.05 device px
  // Returns true when the vertex closed with a join point (the next
  // segment then starts AT the join, not at its own offset point).
  const transition = (v: number): boolean => {
    // Between segment v-1's offset end and segment v's offset start at vertex v.
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
    // Turning left (cross > 0): the left side is the concave (join) side.
    const joinSide = cross > 0 ? 1 : -1;
    if (sig === joinSide) {
      // The two offset lines meet at one point: solve in closed form.
      const det = tPx * tNy - tPy * tNx;
      const dx = bx - ax; const dy = by - ay;
      const t = (dx * tNy - dy * tNx) / det;
      // Replace the previous segment's end point (already pushed) with the join.
      const jx = ax + tPx * t; const jy = ay + tPy * t;
      const q = out[out.length - 1];
      if (q && Math.abs(q.x - ax) + Math.abs(q.y - ay) < 1e-9) { q.x = jx; q.y = jy; }
      else push(jx, jy, p.s[v]);
      return true;
    } else {
      // Convex side: an arc of radius h about the vertex, from a to b.
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
    }
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
  } else {
    const [ax, ay] = offPoint(p, 0, 0, sig, h);
    push(ax, ay, p.s[0]);
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1;
      const [bx, by] = offPoint(p, k, b, sig, h);
      const joined = k > 0 ? transition(k) : false;
      // After a join the segment starts at the join point itself; after an
      // arc it starts at the arc's end (already pushed, deduped below).
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

// ---------------------------------------------------------------------------
// The planar graph: every border (and cap) split at every intersection.

interface RawSeg {
  x0: number; y0: number; x1: number; y1: number;
  chain: number; side: number; kind: "border" | "cap";
  s0: number; s1: number;
}

interface Atomic {
  n0: number; n1: number;
  chain: number; side: number; kind: "border" | "cap";
  s0: number; s1: number; // centreline s at n0, n1
  len: number;
}

/** Segment-segment intersection parameter pair, or null. Closed form. */
function segInt(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): { t: number; u: number } | null {
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
// Faces from the graph (half-edge walk; the face stays on the left).

interface FaceRaw {
  /** Directed edges: atomic id, +1 = n0->n1, -1 = n1->n0. */
  edges: { id: number; dir: 1 | -1 }[];
  nodes: number[];
  area: number;
}

function traceFaces(atomics: Atomic[], nx: number[], ny: number[]): FaceRaw[] {
  // Outgoing directed edges per node, sorted by angle.
  const out: { id: number; dir: 1 | -1; ang: number }[][] = Array.from({ length: nx.length }, () => []);
  atomics.forEach((a, id) => {
    out[a.n0].push({ id, dir: 1, ang: Math.atan2(ny[a.n1] - ny[a.n0], nx[a.n1] - nx[a.n0]) });
    out[a.n1].push({ id, dir: -1, ang: Math.atan2(ny[a.n0] - ny[a.n1], nx[a.n0] - nx[a.n1]) });
  });
  for (const l of out) l.sort((p, q) => p.ang - q.ang);
  // A directed edge is keyed by its atomic id and direction bit alone:
  // its tail node follows from those.
  const posIn = new Map<number, number>();
  out.forEach((l) => l.forEach((e, i) => posIn.set(e.id * 2 + (e.dir === 1 ? 0 : 1), i)));
  const seen = new Set<number>();
  const faces: FaceRaw[] = [];
  const head = (e: { id: number; dir: 1 | -1 }): number => (e.dir === 1 ? atomics[e.id].n1 : atomics[e.id].n0);
  const tail = (e: { id: number; dir: 1 | -1 }): number => (e.dir === 1 ? atomics[e.id].n0 : atomics[e.id].n1);
  for (let node = 0; node < out.length; node++) {
    for (const start of out[node]) {
      const key0 = start.id * 2 + (start.dir === 1 ? 0 : 1);
      if (seen.has(key0)) continue;
      const edges: { id: number; dir: 1 | -1 }[] = [];
      const nodes: number[] = [];
      let cur = start;
      let curTail = node;
      let guard = 0;
      let closed = false;
      while (guard++ < atomics.length * 2 + 16) {
        const k = cur.id * 2 + (cur.dir === 1 ? 0 : 1);
        if (seen.has(k)) break;
        seen.add(k);
        edges.push(cur);
        nodes.push(curTail);
        const hd = head(cur);
        if (hd === node && edges.length > 1) { closed = true; break; }
        // At hd, take the outgoing edge just clockwise from the reverse edge
        // (the predecessor in CCW order): the face stays on the left.
        const revDir = (cur.dir === 1 ? -1 : 1) as 1 | -1;
        void revDir;
        const ri = posIn.get(cur.id * 2 + (cur.dir === 1 ? 1 : 0));
        if (ri === undefined) break;
        const l = out[hd];
        const nxt = l[(ri - 1 + l.length) % l.length];
        curTail = hd;
        cur = nxt;
        if (cur.id === start.id && cur.dir === start.dir && curTail === node) { closed = true; break; }
      }
      if (!closed || edges.length < 2) continue;
      let area = 0;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]; const b = nodes[(i + 1) % nodes.length];
        area += nx[a] * ny[b] - nx[b] * ny[a];
      }
      faces.push({ edges, nodes, area: area / 2 });
    }
  }
  return faces;
}

interface LoopVert {
  x: number; y: number; s: number;
  chain: number; side: number;
  kind: "border" | "cap" | "arc" | "tangent";
  brk: boolean;
  corner: number;
  /** Graph node id, or -1 for points inserted by a corner splice. */
  nd: number;
}

/** Point in polygon (ray cast), the loop as flat points. */
function pointInLoop(pts: number[], x: number, y: number): boolean {
  let inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[2 * i]; const yi = pts[2 * i + 1];
    const xj = pts[2 * j]; const yj = pts[2 * j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// The builder.

export function buildOutline(scene: SceneIn): OutlineTable {
  const h = scene.look.halfWidth;
  const W = scene.look.band;
  const cr = scene.look.cuspRadius ?? 3;
  const diagnostics: string[] = [];
  const polys: Poly[] = scene.chains.map((c, i) => makePoly(i, c.pts, c.closed));
  const idxOf = new Map<number, number>();
  scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  const nCh = polys.length;

  // Junction clusters: junctions sharing a chain are one group.
  const nj = scene.junctions.length;
  const parent = Array.from({ length: nj }, (_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  const byChain = new Map<number, number[]>();
  scene.junctions.forEach((j, ji) => {
    for (const a of j.arms) {
      const pi = idxOf.get(a.chain);
      if (pi === undefined) continue;
      const l = byChain.get(pi) ?? [];
      if (!l.includes(ji)) l.push(ji);
      byChain.set(pi, l);
    }
  });
  for (const l of byChain.values()) for (let i = 1; i < l.length; i++) parent[find(l[i])] = find(l[0]);
  const gidOf = new Map<number, number>();
  const groupOfJ: number[] = scene.junctions.map((_, ji) => {
    const r = find(ji);
    if (!gidOf.has(r)) gidOf.set(r, gidOf.size);
    return gidOf.get(r)!;
  });
  const chainGroup = new Int32Array(nCh).fill(-1);
  byChain.forEach((l, pi) => { chainGroup[pi] = groupOfJ[l[0]]; });

  // Arms: roots, outgoing directions, spans L (closed-form candidates).
  interface ArmInfo { ji: number; ei: number; pi: number; sR: number; dir: number; kind: string; ux: number; uy: number; ang: number; L: number }
  const armsOfJ: ArmInfo[][] = scene.junctions.map(() => []);
  const rootsOf = new Map<number, number[]>();
  const armRoot = (pi: number, a: SceneArmIn): { sR: number; dir: number } => {
    const p = polys[pi];
    if (a.kind === "end") {
      const atStart = Math.abs(a.s - 0) < Math.abs(a.s - p.len);
      return atStart ? { sR: 0, dir: 1 } : { sR: p.len, dir: -1 };
    }
    return { sR: normS(p, a.s), dir: a.dir };
  };
  scene.junctions.forEach((j, ji) => {
    j.arms.forEach((a, ei) => {
      const pi = idxOf.get(a.chain);
      if (pi === undefined) return;
      const { sR, dir } = armRoot(pi, a);
      const l = rootsOf.get(pi) ?? [];
      if (!l.some((s) => Math.abs(s - sR) < 1e-9)) l.push(sR);
      rootsOf.set(pi, l);
      const p = polys[pi];
      const a0 = pointAt(p, sR);
      let s1 = sR + dir * 2 * h;
      if (!p.closed) s1 = Math.min(Math.max(s1, 0), p.len);
      const a1 = pointAt(p, s1);
      let ux = a1.x - a0.x; let uy = a1.y - a0.y;
      const ul = Math.hypot(ux, uy);
      if (ul < 1e-12) { ux = a0.tx * dir; uy = a0.ty * dir; } else { ux /= ul; uy /= ul; }
      armsOfJ[ji].push({ ji, ei, pi, sR, dir, kind: a.kind, ux, uy, ang: Math.atan2(uy, ux), L: 0 });
    });
  });
  const outD = (p: Poly, sR: number, dir: number, s: number): number => {
    let d = (s - sR) * dir;
    if (p.closed && p.len > 0) { d %= p.len; if (d < 0) d += p.len; }
    return d;
  };
  // Crossing passes per chain, with the crossing angle from segment tangents.
  interface PassInfo { s: number; theta: number; qi: number; sq: number; xi: number }
  const passes: PassInfo[][] = polys.map(() => []);
  const crossPt: { x: number; y: number; over: number; under: number; theta: number }[] = [];
  scene.crossings.forEach((x, xi) => {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) return;
    const sa = normS(polys[ia], x.a.s); const sb = normS(polys[ib], x.b.s);
    const ta = pointAt(polys[ia], sa); const tb = pointAt(polys[ib], sb);
    const theta = Math.acos(Math.min(1, Math.abs(ta.tx * tb.tx + ta.ty * tb.ty)));
    passes[ia].push({ s: sa, theta, qi: ib, sq: sb, xi });
    passes[ib].push({ s: sb, theta, qi: ia, sq: sa, xi });
    crossPt[xi] = { x: ta.x, y: ta.y, over: x.over === "a" ? ia : ib, under: x.over === "a" ? ib : ia, theta };
  });
  for (const list of armsOfJ) {
    for (const A of list) {
      const p = polys[A.pi];
      let L = p.closed ? p.len : A.dir > 0 ? p.len - A.sR : A.sR;
      for (const s of rootsOf.get(A.pi) ?? []) {
        const d = outD(p, A.sR, A.dir, s);
        if (d > 1e-9 && d < L) L = d;
      }
      let Lcut = Infinity;
      for (const x of passes[A.pi]) {
        const d = outD(p, A.sR, A.dir, x.s);
        if (d < -1e-12) continue;
        const t = Math.tan(x.theta / 2);
        const reach = t > 1e-12 ? h / t : Infinity;
        Lcut = Math.min(Lcut, d - reach - h);
      }
      A.L = Math.max(0, Math.min(L, Lcut));
    }
    list.sort((a, b) => a.ang - b.ang);
  }

  // Borders and caps as raw segments.
  const borders: BPoint[][][] = polys.map((p) => [buildBorder(p, 1, h), buildBorder(p, -1, h)]);
  const rawSegs: RawSeg[] = [];
  const borderOf = (pi: number, side: number): BPoint[] => borders[pi][side === 1 ? 0 : 1];
  polys.forEach((p, pi) => {
    for (const sig of [1, -1] as const) {
      const pts = borderOf(pi, sig);
      for (let i = 0; i + 1 < pts.length; i++) {
        rawSegs.push({ x0: pts[i].x, y0: pts[i].y, x1: pts[i + 1].x, y1: pts[i + 1].y, chain: pi, side: sig, kind: "border", s0: pts[i].s, s1: pts[i + 1].s });
      }
      if (p.closed && pts.length > 2) {
        const a = pts[pts.length - 1]; const b = pts[0];
        rawSegs.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, chain: pi, side: sig, kind: "border", s0: a.s, s1: b.s });
      }
    }
    if (!p.closed && p.n >= 2) {
      for (const atEnd of [false, true]) {
        const sEnd = atEnd ? p.len : 0;
        const de = scene.deadEnds.find((d) => idxOf.get(d.chain) === pi && Math.abs(d.s - sEnd) < 1e-9);
        if (de?.offscreen) continue;
        const vi = atEnd ? p.n - 1 : 0;
        const cx = p.x[vi]; const cy = p.y[vi];
        const L = borderOf(pi, 1)[atEnd ? borderOf(pi, 1).length - 1 : 0];
        const R = borderOf(pi, -1)[atEnd ? borderOf(pi, -1).length - 1 : 0];
        if (!L || !R) continue;
        // Outward: away from the chain's interior at this end.
        const nb = atEnd ? p.n - 2 : 1;
        let ox = cx - p.x[nb]; let oy = cy - p.y[nb];
        const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
        const a0 = Math.atan2(L.y - cy, L.x - cx);
        let da = Math.atan2(R.y - cy, R.x - cx) - a0;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        // Go the way that passes through the outward direction.
        const midA = a0 + da / 2;
        if (Math.cos(midA) * ox + Math.sin(midA) * oy < 0) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI;
        const steps = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 12)));
        let px = L.x; let py = L.y;
        for (let i = 1; i <= steps; i++) {
          const a = a0 + (da * i) / steps;
          const qx = i === steps ? R.x : cx + h * Math.cos(a);
          const qy = i === steps ? R.y : cy + h * Math.sin(a);
          rawSegs.push({ x0: px, y0: py, x1: qx, y1: qy, chain: pi, side: 0, kind: "cap", s0: sEnd, s1: sEnd });
          px = qx; py = qy;
        }
      }
    }
  });

  // Split every segment at every intersection (spatial hash, closed form).
  const cell = Math.max(2 * h, 0.05);
  const grid = new Map<string, number[]>();
  const cellKey = (x: number, y: number): string => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  rawSegs.forEach((s, i) => {
    const x0 = Math.floor(Math.min(s.x0, s.x1) / cell); const x1 = Math.floor(Math.max(s.x0, s.x1) / cell);
    const y0 = Math.floor(Math.min(s.y0, s.y1) / cell); const y1 = Math.floor(Math.max(s.y0, s.y1) / cell);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
      const k = `${ix},${iy}`;
      const l = grid.get(k) ?? [];
      l.push(i);
      grid.set(k, l);
    }
  });
  const splits: { t: number; x: number; y: number }[][] = rawSegs.map(() => []);
  const candStamp = new Int32Array(rawSegs.length);
  rawSegs.forEach((s, i) => {
    const cand: number[] = [];
    const x0 = Math.floor(Math.min(s.x0, s.x1) / cell); const x1 = Math.floor(Math.max(s.x0, s.x1) / cell);
    const y0 = Math.floor(Math.min(s.y0, s.y1) / cell); const y1 = Math.floor(Math.max(s.y0, s.y1) / cell);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
      for (const j of grid.get(`${ix},${iy}`) ?? []) {
        if (candStamp[j] === i + 1) continue;
        candStamp[j] = i + 1;
        cand.push(j);
      }
    }
    for (const j of cand) {
      if (j <= i) continue;
      const o = rawSegs[j];
      const hit = segInt(s.x0, s.y0, s.x1, s.y1, o.x0, o.y0, o.x1, o.y1);
      if (!hit) continue;
      const px = s.x0 + (s.x1 - s.x0) * hit.t;
      const py = s.y0 + (s.y1 - s.y0) * hit.t;
      splits[i].push({ t: hit.t, x: px, y: py });
      splits[j].push({ t: hit.u, x: px, y: py });
    }
  });

  // Nodes and atomic edges.
  const nodeId = new Map<string, number>();
  const nx: number[] = []; const ny: number[] = [];
  const node = (x: number, y: number): number => {
    const k = `${Math.round(x * 1e9)},${Math.round(y * 1e9)}`;
    let id = nodeId.get(k);
    if (id === undefined) { id = nx.length; nodeId.set(k, id); nx.push(x); ny.push(y); }
    return id;
  };
  const atomics: Atomic[] = [];
  rawSegs.forEach((s, i) => {
    const list = splits[i].slice().sort((a, b) => a.t - b.t);
    const ptsList: { t: number; x: number; y: number }[] = [{ t: 0, x: s.x0, y: s.y0 }];
    for (const sp of list) {
      const q = ptsList[ptsList.length - 1];
      if (Math.abs(sp.t - q.t) < 1e-9) continue;
      ptsList.push(sp);
    }
    ptsList.push({ t: 1, x: s.x1, y: s.y1 });
    for (let k = 0; k + 1 < ptsList.length; k++) {
      const a = ptsList[k]; const b = ptsList[k + 1];
      const n0 = node(a.x, a.y); const n1 = node(b.x, b.y);
      if (n0 === n1) continue;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (!(len > 1e-12)) continue;
      atomics.push({ n0, n1, chain: s.chain, side: s.side, kind: s.kind, s0: s.s0 + (s.s1 - s.s0) * a.t, s1: s.s0 + (s.s1 - s.s0) * b.t, len });
    }
  });
  const degree = new Int32Array(nx.length);
  for (const a of atomics) { degree[a.n0]++; degree[a.n1]++; }
  // Which borders pass through each node, and at what centreline s.
  const nodeBorderS = new Map<string, number>();
  const nodeCross = new Set<number>();
  for (const a of atomics) {
    for (const [nd, s] of [[a.n0, a.s0], [a.n1, a.s1]] as const) {
      const bk = `${nd}|${a.chain}|${a.side}`;
      if (!nodeBorderS.has(bk)) nodeBorderS.set(bk, s);
    }
  }
  // A node is a cut/join point when more than two atomic edges meet, or two
  // borders of different chains/sides cross there (degree counts both).
  for (let nd = 0; nd < nx.length; nd++) if (degree[nd] !== 2) nodeCross.add(nd);
  // Nodes per border (chain|side -> node, s list), for corner and cut search.
  const borderNodes = new Map<string, { nd: number; s: number }[]>();
  for (const [bk, s] of nodeBorderS) {
    const nd = Number(bk.split("|")[0]);
    const rest = bk.slice(bk.indexOf("|") + 1);
    const l = borderNodes.get(rest) ?? [];
    l.push({ nd, s });
    borderNodes.set(rest, l);
  }
  const chainNodes = new Map<number, Set<number>>();
  for (const a of atomics) {
    for (const nd of [a.n0, a.n1]) {
      const st = chainNodes.get(a.chain) ?? new Set<number>();
      st.add(nd);
      chainNodes.set(a.chain, st);
    }
  }
  void cellKey;

  // Faces, their owners, and the regions they merge into.
  const faceRaws = traceFaces(atomics, nx, ny);
  let outer = -1; let outerArea = -1;
  faceRaws.forEach((f, i) => { if (Math.abs(f.area) > outerArea) { outerArea = Math.abs(f.area); outer = i; } });
  const faceOfDir = new Map<string, number>();
  faceRaws.forEach((f, fi) => { for (const e of f.edges) faceOfDir.set(`${e.id}|${e.dir}`, fi); });
  const loopPts = (f: FaceRaw): number[] => {
    const pts: number[] = [];
    for (const nd of f.nodes) pts.push(nx[nd], ny[nd]);
    return pts;
  };
  // Segment grid over centrelines for ownership queries.
  const cgrid = new Map<string, { pi: number; k: number }[]>();
  polys.forEach((p, pi) => {
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1 === p.n ? 0 : k + 1;
      const x0 = Math.floor(Math.min(p.x[k], p.x[b]) / cell); const x1 = Math.floor(Math.max(p.x[k], p.x[b]) / cell);
      const y0 = Math.floor(Math.min(p.y[k], p.y[b]) / cell); const y1 = Math.floor(Math.max(p.y[k], p.y[b]) / cell);
      for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
        const key = `${ix},${iy}`;
        const l = cgrid.get(key) ?? [];
        l.push({ pi, k });
        cgrid.set(key, l);
      }
    }
  });
  const distNear = (x: number, y: number): Map<number, number> => {
    const cand = new Map<number, { pi: number; k: number }[]>();
    const R = h + 1e-6;
    const x0 = Math.floor((x - R) / cell); const x1 = Math.floor((x + R) / cell);
    const y0 = Math.floor((y - R) / cell); const y1 = Math.floor((y + R) / cell);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
      for (const e of cgrid.get(`${ix},${iy}`) ?? []) {
        const l = cand.get(e.pi) ?? [];
        l.push(e);
        cand.set(e.pi, l);
      }
    }
    const outMap = new Map<number, number>();
    cand.forEach((segs, pi) => {
      const p = polys[pi];
      let best = Infinity;
      for (const { k } of segs) {
        const b = k + 1 === p.n ? 0 : k + 1;
        const ex = p.x[b] - p.x[k]; const ey = p.y[b] - p.y[k];
        const l2 = ex * ex + ey * ey;
        let t = l2 > 0 ? ((x - p.x[k]) * ex + (y - p.y[k]) * ey) / l2 : 0;
        t = Math.min(1, Math.max(0, t));
        const dx = p.x[k] + ex * t - x; const dy = p.y[k] + ey * t - y;
        best = Math.min(best, dx * dx + dy * dy);
      }
      const d = Math.sqrt(best);
      if (d < h + 1e-6) outMap.set(pi, d);
    });
    return outMap;
  };

  interface FaceInfo { owner: number; group: number; sample: [number, number]; hole: boolean; area: number }
  const faceInfo: FaceInfo[] = faceRaws.map((f, fi) => {
    if (fi === outer) return { owner: -1, group: -1, sample: [0, 0], hole: false, area: f.area };
    const pts = loopPts(f);
    // Interior sample: off the longest edge, to its left, growing eps.
    const order = f.edges.map((e, i) => ({ i, len: atomics[e.id].len })).sort((a, b) => b.len - a.len);
    let sample: [number, number] | null = null;
    outer: for (const { i } of order.slice(0, 10)) {
      const e = f.edges[i];
      const a = atomics[e.id];
      const t = e.dir === 1 ? a.n0 : a.n1; const hd = e.dir === 1 ? a.n1 : a.n0;
      const dx = nx[hd] - nx[t]; const dy = ny[hd] - ny[t];
      const l = Math.hypot(dx, dy) || 1;
      for (const eps of [0.03 * h, 0.12 * h, 0.35 * h]) {
        for (const sgn of [1, -1]) {
          const sx = (nx[t] + nx[hd]) / 2 + sgn * (-dy / l) * eps;
          const sy = (ny[t] + ny[hd]) / 2 + sgn * (dx / l) * eps;
          if (pointInLoop(pts, sx, sy)) { sample = [sx, sy]; break outer; }
        }
      }
    }
    if (!sample) {
      let cx = 0; let cy = 0;
      for (const nd of f.nodes) { cx += nx[nd]; cy += ny[nd]; }
      sample = [cx / Math.max(1, f.nodes.length), cy / Math.max(1, f.nodes.length)];
      diagnostics.push(`face ${fi}: centroid sample fallback`);
    }
    const near = distNear(sample[0], sample[1]);
    if (near.size === 0) {
      // Corner-fill ground or a paper hole: nearest junction within 3h owns
      // it as fill; anything else is paper.
      let bestJ = -1; let bestD = 3 * h;
      scene.junctions.forEach((j, ji) => {
        const d = Math.hypot(j.c[0] - sample![0], j.c[1] - sample![1]);
        if (d < bestD) { bestD = d; bestJ = ji; }
      });
      if (bestJ >= 0 && bestD < 3 * h) {
        const arms = armsOfJ[bestJ];
        return { owner: arms[0]?.pi ?? -1, group: groupOfJ[bestJ], sample, hole: false, area: f.area };
      }
      return { owner: -1, group: -1, sample, hole: true, area: f.area };
    }
    const sorted = [...near.entries()].sort((a, b) => a[1] - b[1]);
    const groups = new Set(sorted.map(([pi]) => chainGroup[pi]).filter((g) => g >= 0));
    if (sorted.length > 1 && groups.size === 1 && sorted.every(([pi]) => chainGroup[pi] === [...groups][0])) {
      return { owner: sorted[0][0], group: [...groups][0], sample, hole: false, area: f.area };
    }
    if (sorted.length > 1) {
      // A crossing's overlap: the over chain owns it, from the cuts alone.
      for (const cp of crossPt) {
        if (!cp) continue;
        if (!near.has(cp.over) || !near.has(cp.under)) continue;
        if (Math.hypot(cp.x - sample[0], cp.y - sample[1]) < 3 * h) {
          return { owner: cp.over, group: chainGroup[cp.over], sample, hole: false, area: f.area };
        }
      }
    }
    return { owner: sorted[0][0], group: chainGroup[sorted[0][0]], sample, hole: false, area: f.area };
  });

  // Loop vertices from directed edges (shared by faces and regions).
  const loopVerts = (edges: { id: number; dir: 1 | -1 }[]): LoopVert[] => edges.map((e) => {
    const a = atomics[e.id];
    const tailNode = e.dir === 1 ? a.n0 : a.n1;
    return {
      x: nx[tailNode], y: ny[tailNode],
      s: e.dir === 1 ? a.s0 : a.s1,
      chain: a.chain, side: a.side,
      kind: a.kind === "cap" ? "cap" : "border",
      brk: nodeCross.has(tailNode),
      corner: -1,
      nd: tailNode,
    };
  });

  // Corners: V from the graph, r from the radius rule, arcs spliced in.
  interface CornerWork extends OutlineCorner { ji: number; sideA: number; sideB: number; sA: number; sB: number; uA: number; uB: number; ell: number; vNode: number }
  const corners: OutlineCorner[] = [];
  const cornerWork: CornerWork[] = [];
  scene.junctions.forEach((j, ji) => {
    const list = armsOfJ[ji];
    const n = list.length;
    if (n < 2) return;
    const styles = j.corners ?? [];
    const ne = j.arms.length;
    for (let i = 0; i < n; i++) {
      const A = list[i];
      const B = list[(i + 1) % n];
      let th = B.ang - A.ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const xa = j.arms[A.ei]; const xb = j.arms[B.ei];
      if (xa && xb && xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      let st = styles[A.ei]?.style;
      if ((A.ei + 1) % ne !== B.ei && (B.ei + 1) % ne === A.ei) st = styles[B.ei]?.style;
      const style = st === "sharp" ? 0 : 1;
      const base: CornerWork = {
        junction: j.id, aChain: A.pi, bChain: B.pi, ok: false, style, theta: th, r: 0,
        Vx: NaN, Vy: NaN, qx: NaN, qy: NaN, tax: NaN, tay: NaN, tbx: NaN, tby: NaN,
        ji, sideA: 0, sideB: 0, sA: 0, sB: 0, uA: 0, uB: 0, ell: 0, vNode: -1,
      };
      const cross = A.ux * B.uy - A.uy * B.ux;
      // Facing sides relative to each arm's OUTGOING direction, converted
      // to border sides (relative to increasing s): a through arm leaving
      // toward decreasing s flips its left and right.
      const sideA = (cross > 0 ? 1 : -1) * A.dir;
      const sideB = (cross > 0 ? -1 : 1) * B.dir;
      base.sideA = sideA; base.sideB = sideB;
      // V: a graph node on both facing borders, feet inside both spans.
      let bestNode = -1; let bestCost = Infinity; let buA = 0; let buB = 0;
      const pa = polys[A.pi]; const pb = polys[B.pi];
      const onB = new Map<number, number>();
      for (const e of borderNodes.get(`${B.pi}|${sideB}`) ?? []) onB.set(e.nd, e.s);
      for (const e of borderNodes.get(`${A.pi}|${sideA}`) ?? []) {
        const sB = onB.get(e.nd);
        if (sB === undefined) continue;
        const uA = outD(pa, A.sR, A.dir, e.s);
        const uB = outD(pb, B.sR, B.dir, sB);
        if (!(uA > 1e-9 && uA < A.L && uB > 1e-9 && uB < B.L)) continue;
        const cost = uA + uB;
        if (cost < bestCost) { bestCost = cost; bestNode = e.nd; buA = uA; buB = uB; }
      }
      if (bestNode < 0) {
        base.why = "no V in spans";
        corners.push(base);
        cornerWork.push(base);
        diagnostics.push(`corner ${j.id} arms ${A.ei},${B.ei}: no V in spans`);
        continue;
      }
      base.Vx = nx[bestNode]; base.Vy = ny[bestNode];
      base.vNode = bestNode;
      base.uA = buA; base.uB = buB;
      const t2 = Math.tan(th / 2);
      const r0 = style * (cr / 3) * Math.min(2 * h, 1.5 * h * t2);
      const room = Math.min(A.L - W - buA, B.L - W - buB);
      const r = Math.max(0, Math.min(r0, room * t2));
      base.r = r;
      base.ok = true;
      if (r > 1e-9) {
        const ell = r / t2;
        base.ell = ell;
        // Tangent feet first from the centreline construction at V's feet,
        // then q as the two arms' (h + r) offsets averaged, then the feet
        // re-read as the borders' closest points to q (closed form).
        const footAt = (P: Poly, sR: number, dir: number, u: number): At => pointAt(P, normS(P, sR + dir * u));
        const mkQ = (P: Poly, sR: number, dir: number, u: number, side: number): [number, number] => {
          const f = footAt(P, sR, dir, u);
          return [f.x + side * (h + r) * -f.ty, f.y + side * (h + r) * f.tx];
        };
        const uTa = Math.max(0, buA - ell); const uTb = Math.max(0, buB - ell);
        const qA = mkQ(pa, A.sR, A.dir, uTa, sideA);
        const qB = mkQ(pb, B.sR, B.dir, uTb, sideB);
        base.qx = (qA[0] + qB[0]) / 2; base.qy = (qA[1] + qB[1]) / 2;
        const closestOnBorder = (pi: number, side: number, sR: number, dir: number, uV: number): { x: number; y: number; u: number } => {
          const pts = borderOf(pi, side);
          const P = polys[pi];
          const us = pts.map((q) => ({ q, u: outD(P, sR, dir, q.s) }));
          let best = { x: base.qx, y: base.qy, u: uV, d: Infinity };
          for (let k = 0; k + 1 < us.length; k++) {
            const a = us[k]; const b = us[k + 1];
            if (Math.max(a.u, b.u) < uV - 2 * ell - 1e-6 || Math.min(a.u, b.u) > uV + 1e-6) continue;
            const ex = b.q.x - a.q.x; const ey = b.q.y - a.q.y;
            const l2 = ex * ex + ey * ey;
            let t = l2 > 0 ? ((base.qx - a.q.x) * ex + (base.qy - a.q.y) * ey) / l2 : 0;
            t = Math.min(1, Math.max(0, t));
            const qx = a.q.x + ex * t; const qy = a.q.y + ey * t;
            const d = Math.hypot(qx - base.qx, qy - base.qy);
            if (d < best.d) best = { x: qx, y: qy, u: a.u + (b.u - a.u) * t, d };
          }
          if (polys[pi].closed && us.length > 2) {
            const a = us[us.length - 1]; const b = us[0];
            const ex = b.q.x - a.q.x; const ey = b.q.y - a.q.y;
            const l2 = ex * ex + ey * ey;
            let t = l2 > 0 ? ((base.qx - a.q.x) * ex + (base.qy - a.q.y) * ey) / l2 : 0;
            t = Math.min(1, Math.max(0, t));
            const qx = a.q.x + ex * t; const qy = a.q.y + ey * t;
            const d = Math.hypot(qx - base.qx, qy - base.qy);
            if (d < best.d) best = { x: qx, y: qy, u: a.u + (b.u - a.u) * t, d };
          }
          return best;
        };
        const tA = closestOnBorder(A.pi, sideA, A.sR, A.dir, buA);
        const tB = closestOnBorder(B.pi, sideB, B.sR, B.dir, buB);
        base.tax = tA.x; base.tay = tA.y; base.tbx = tB.x; base.tby = tB.y;
        base.sA = normS(pa, A.sR + A.dir * tA.u);
        base.sB = normS(pb, B.sR + B.dir * tB.u);
      }
      corners.push(base);
      cornerWork.push(base);
    }
  });

  // Splice each round corner's arc into a vertex loop (faces and regions).
  const spliceArc = (verts: LoopVert[], cw: CornerWork): LoopVert[] => {
    if (!(cw.r > 1e-9) || !cw.ok) return verts;
    const n = verts.length;
    let vi = -1;
    for (let i = 0; i < n; i++) {
      if (verts[i].nd === cw.vNode) { vi = i; break; }
    }
    if (vi < 0) return verts;
    const ell = cw.ell;
    // Walk both ways from V to the first vertex at distance >= ell: the
    // trim lands on the edge before it. Each side is classified by the
    // border of the edge touching V.
    const walkIdx = (step: 1 | -1): { firstKept: number; isA: boolean } => {
      const meta = step === 1 ? verts[vi] : verts[((vi - 1) % n + n) % n];
      const isA = meta.chain === cw.aChain && meta.side === cw.sideA;
      let acc = 0;
      let px = cw.Vx; let py = cw.Vy;
      for (let k = 1; k <= n; k++) {
        const idx = ((vi + step * k) % n + n) % n;
        const v = verts[idx];
        const d = Math.hypot(v.x - px, v.y - py);
        if (acc + d >= ell) return { firstKept: idx, isA };
        acc += d;
        px = v.x; py = v.y;
      }
      return { firstKept: vi, isA };
    };
    const fwd = walkIdx(1);
    const bwd = walkIdx(-1);
    const tFor = (isA: boolean): { x: number; y: number } => (isA ? { x: cw.tax, y: cw.tay } : { x: cw.tbx, y: cw.tby });
    // Recompute the trim points from the corner's own feet (exact), keeping
    // the walked classification of which loop direction is which arm.
    const fwdT = tFor(fwd.isA);
    const bwdT = tFor(bwd.isA);
    // Arc samples from the forward tangent to the backward tangent, the way
    // that passes toward V.
    const aF = Math.atan2(fwdT.y - cw.qy, fwdT.x - cw.qx);
    const aB = Math.atan2(bwdT.y - cw.qy, bwdT.x - cw.qx);
    let da = aB - aF;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const midA = aF + da / 2;
    const mx = cw.qx + cw.r * Math.cos(midA); const my = cw.qy + cw.r * Math.sin(midA);
    if (Math.hypot(mx - cw.Vx, my - cw.Vy) > Math.hypot(cw.qx + cw.r * Math.cos(aF - da / 2) - cw.Vx, cw.qy + cw.r * Math.sin(aF - da / 2) - cw.Vy)) {
      da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI;
    }
    const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
    const arcVerts: LoopVert[] = [];
    const mkT = (t: { x: number; y: number }, isA: boolean): LoopVert => ({
      x: t.x, y: t.y, s: isA ? cw.sA : cw.sB, chain: isA ? cw.aChain : cw.bChain,
      side: isA ? cw.sideA : cw.sideB, kind: "tangent", brk: true, corner: corners.indexOf(cw), nd: -1,
    });
    arcVerts.push(mkT(fwdT, fwd.isA));
    for (let i = 1; i < steps; i++) {
      const a = aF + (da * i) / steps;
      arcVerts.push({ x: cw.qx + cw.r * Math.cos(a), y: cw.qy + cw.r * Math.sin(a), s: cw.sA, chain: cw.aChain, side: 0, kind: "arc", brk: false, corner: corners.indexOf(cw), nd: -1 });
    }
    arcVerts.push(mkT(bwdT, bwd.isA));
    // New loop in order: backward tangent, arc (reversed), forward
    // tangent, then the kept vertices the long way round from the forward
    // side's first kept vertex to the backward side's first kept vertex.
    const keptLong: LoopVert[] = [];
    for (let k = 0; k < n; k++) {
      const idx = ((fwd.firstKept + k) % n + n) % n;
      keptLong.push(verts[idx]);
      if (idx === bwd.firstKept) break;
    }
    const rev = arcVerts.slice().reverse(); // bwdT ... fwdT
    return [...rev, ...keptLong];
  };
  const spliceAll = (loopsIn: LoopVert[][]): LoopVert[][] => {
    // Index loops by graph node so each corner only visits the loops that
    // pass through its V node.
    const loops = loopsIn.slice();
    const at = new Map<number, Set<number>>();
    loops.forEach((l, li) => {
      for (const v of l) {
        if (v.nd < 0) continue;
        const s = at.get(v.nd) ?? new Set<number>();
        s.add(li);
        at.set(v.nd, s);
      }
    });
    for (const cw of cornerWork) {
      if (!(cw.r > 1e-9) || !cw.ok) continue;
      const cand = at.get(cw.vNode);
      if (!cand) continue;
      for (const li of [...cand]) loops[li] = spliceArc(loops[li], cw);
    }
    return loops;
  };

  // Faces out (outer face dropped; paper holes kept, marked).
  const faceLoops = spliceAll(faceRaws.map((f, fi) => (fi === outer ? [] : loopVerts(f.edges))).filter((l) => l.length > 0));
  const faces: OutlineFace[] = [];
  {
    let k = 0;
    faceRaws.forEach((f, fi) => {
      if (fi === outer) return;
      const verts = faceLoops[k++];
      const info = faceInfo[fi];
      faces.push({
        ownerChain: info.owner, group: info.group,
        pts: verts.flatMap((v) => [v.x, v.y]),
        sample: info.sample, hole: info.hole,
      });
    });
  }

  // Regions: boundary edges between faces of different region keys.
  const regionKey = (fi: number): number => {
    const info = faceInfo[fi];
    if (!info || info.owner < 0) return -1;
    return info.group >= 0 ? info.group : -2 - info.owner;
  };
  const boundary = new Map<number, { id: number; dir: 1 | -1 }[]>();
  atomics.forEach((a, id) => {
    for (const dir of [1, -1] as const) {
      const lf = faceOfDir.get(`${id}|${dir}`);
      const rf = faceOfDir.get(`${id}|${dir === 1 ? -1 : 1}`);
      if (lf === undefined || rf === undefined) continue;
      const lk = regionKey(lf); const rk = regionKey(rf);
      if (lk === rk) continue;
      const l = boundary.get(lk) ?? [];
      l.push({ id, dir });
      boundary.set(lk, l);
    }
  });
  const tailOf = (e: { id: number; dir: 1 | -1 }): number => (e.dir === 1 ? atomics[e.id].n0 : atomics[e.id].n1);
  const headOf = (e: { id: number; dir: 1 | -1 }): number => (e.dir === 1 ? atomics[e.id].n1 : atomics[e.id].n0);
  const regions: OutlineRegion[] = [];
  const regionLoopsRaw: { key: number; verts: LoopVert[] }[] = [];
  for (const [key, edges] of boundary) {
    const byTail = new Map<number, { id: number; dir: 1 | -1 }[]>();
    for (const e of edges) {
      const l = byTail.get(tailOf(e)) ?? [];
      l.push(e);
      byTail.set(tailOf(e), l);
    }
    const unused = new Set(edges);
    while (unused.size > 0) {
      const start = unused.values().next().value as { id: number; dir: 1 | -1 };
      const loop: { id: number; dir: 1 | -1 }[] = [start];
      unused.delete(start);
      let guard = 0;
      while (guard++ < edges.length + 4) {
        const hd = headOf(loop[loop.length - 1]);
        if (hd === tailOf(start) && loop.length > 1) break;
        const cands = (byTail.get(hd) ?? []).filter((e) => unused.has(e));
        if (cands.length === 0) break;
        // Continue as straight as possible (stable at touch points).
        const last = atomics[loop[loop.length - 1].id];
        const lx = nx[hd] - nx[tailOf(loop[loop.length - 1])]; const ly = ny[hd] - ny[tailOf(loop[loop.length - 1])];
        void last;
        let bestE = cands[0]; let bestScore = -Infinity;
        for (const e of cands) {
          const a = atomics[e.id];
          const ex = nx[headOf(e)] - nx[hd]; const ey = ny[headOf(e)] - ny[hd];
          const score = (lx * ex + ly * ey) / ((Math.hypot(lx, ly) || 1) * (Math.hypot(ex, ey) || 1));
          void a;
          if (score > bestScore) { bestScore = score; bestE = e; }
        }
        loop.push(bestE);
        unused.delete(bestE);
      }
      if (loop.length >= 2) regionLoopsRaw.push({ key, verts: loopVerts(loop) });
    }
  }
  const regionLoops = spliceAll(regionLoopsRaw.map((r) => r.verts));
  // A paper region's loops duplicate the thread side's (reversed); only
  // thread regions are emitted. Within one key, the largest loop's
  // orientation is the outer one; opposite orientation means a hole.
  const keySign = new Map<number, number>();
  regionLoopsRaw.forEach((r, ri) => {
    const verts = regionLoops[ri];
    let a = 0;
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i]; const w = verts[(i + 1) % verts.length];
      a += v.x * w.y - w.x * v.y;
    }
    const prev = keySign.get(r.key);
    if (prev === undefined || Math.abs(a) > Math.abs(prev)) keySign.set(r.key, a);
  });
  const pieces: OutlinePiece[] = [];
  regionLoopsRaw.forEach((r, ri) => {
    if (r.key === -1) return;
    const verts = regionLoops[ri];
    // Owner of a merged region: its largest face with this key.
    let owner = -1; let bestA = -1;
    faceRaws.forEach((f, fi) => {
      if (fi === outer || regionKey(fi) !== r.key) return;
      if (Math.abs(f.area) > bestA) { bestA = Math.abs(f.area); owner = faceInfo[fi].owner; }
    });
    let loopArea2 = 0;
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i]; const w = verts[(i + 1) % verts.length];
      loopArea2 += v.x * w.y - w.x * v.y;
    }
    const region: OutlineRegion = {
      id: regions.length, ownerChain: owner,
      group: r.key >= 0 ? r.key : -1,
      pts: verts.flatMap((v) => [v.x, v.y]),
      pieces: [], hole: Math.sign(loopArea2) !== Math.sign(keySign.get(r.key) ?? loopArea2),
    };
    // Pieces: maximal runs of like edges; runs break at cut/join nodes.
    const n = verts.length;
    const footOf = (v: LoopVert): [number, number] => {
      if (v.kind === "arc" && v.corner >= 0) {
        const cw = cornerWork[v.corner];
        return [cw.qx, cw.qy];
      }
      const f = pointAt(polys[v.chain], v.s);
      return [f.x, f.y];
    };
    let cur: OutlinePiece | null = null;
    const flush = () => { if (cur && cur.pts.length >= 4) { cur.region = region.id; region.pieces.push(pieces.length); pieces.push(cur); } cur = null; };
    for (let i = 0; i < n; i++) {
      const v = verts[i];
      const w = verts[(i + 1) % n];
      const isArc = v.kind === "arc" || w.kind === "arc" || (v.kind === "tangent" && w.kind === "arc");
      const kind: PieceKind = isArc ? "arc" : v.kind === "cap" ? "cap" : "run";
      const cornerIdx0 = kind === "arc" ? (v.corner >= 0 ? v.corner : w.corner) : -1;
      const chain = kind === "arc" && cornerIdx0 >= 0 ? cornerWork[cornerIdx0].aChain : v.chain;
      const side = kind === "run" ? v.side : 0;
      const cornerIdx = kind === "arc" ? (v.corner >= 0 ? v.corner : w.corner) : -1;
      const breakHere = kind === "run" && v.brk;
      if (!cur || cur.kind !== kind || cur.chain !== chain || cur.side !== side || cur.corner !== cornerIdx || breakHere) {
        flush();
        cur = { kind, chain, side, s0: v.s, s1: w.s, pts: [v.x, v.y], cpts: footOf(v) as unknown as number[], region: region.id, corner: cornerIdx };
        // cpts as flat array:
        cur.cpts = [...footOf(v)];
      }
      cur!.pts.push(w.x, w.y);
      cur!.cpts.push(...footOf(w));
      cur!.s1 = w.s;
    }
    flush();
    regions.push(region);
  });

  // Cuts: graph nodes where an under border stops on an over border.
  const cuts: OutlineCut[] = [];
  scene.crossings.forEach((x, xi) => {
    const cp = crossPt[xi];
    if (!cp) return;
    const under = cp.under; const over = cp.over;
    const sCross = normS(polys[under], x.over === "a" ? x.b.s : x.a.s);
    const reach = Math.tan(cp.theta / 2) > 1e-12 ? h / Math.tan(cp.theta / 2) : Infinity;
    const overNodes = chainNodes.get(over) ?? new Set<number>();
    for (const side of [1, -1] as const) {
      for (const e of borderNodes.get(`${under}|${side}`) ?? []) {
        if (!overNodes.has(e.nd)) continue;
        if (Math.abs(dS(polys[under], sCross, e.s)) > reach + 2 * h) continue;
        cuts.push({ crossing: xi, chain: under, side, s: e.s, x: nx[e.nd], y: ny[e.nd], overChain: over });
      }
    }
  });

  const nOk = corners.filter((c) => c.ok).length;
  diagnostics.push(
    `chains ${nCh}, raw segs ${rawSegs.length}, atomics ${atomics.length}, faces ${faces.length}, regions ${regions.length}, pieces ${pieces.length}`,
    `corners ${corners.length} (${nOk} ok, ${corners.length - nOk} no V), cuts ${cuts.length}`,
  );
  return { h, W, pieces, regions, faces, corners, cuts, diagnostics };
}



