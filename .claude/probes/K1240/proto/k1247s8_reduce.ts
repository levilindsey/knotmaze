// K1247 s8: fewer points into the outline. A kept-index set per chain is
// chosen ONCE per diagram (at structure time, from that scene's points), and
// each frame only gathers those points and remaps the scene's s values
// (crossings, junction arms, dead ends) from the full polyline's arc length
// to the reduced one's. The point count per chain is therefore fixed for the
// diagram, as structure()'s nPts (capacities, warm starts) needs.
//
// Selection (selectKeep): Douglas-Peucker on each centreline at eps (world
// units). The borders are exact offsets of the polyline (mitre inside, round
// joins outside), so a centreline within eps of the full one keeps each border
// within about eps of the full border. Anchors kept regardless:
//  - each chain's ends (an open chain) or its point 0 (a closed one);
//  - both ends of the segment holding each feature's s (crossing passes,
//    junction arms, dead ends), so the remap there is exact;
//  - with `win` > 0, every point within `win` (world units, along s) of a
//    feature's s (full density around crossings and junctions).
// `maxSeg` caps a kept span's arc length (world units).
//
// Per frame (reduceScene): gather the kept points and remap each s by the
// fraction along its span (exact inside an anchored feature segment).
import type { SceneIn } from "./outline";

export interface KeepSet { idx: Int32Array[]; nFull: number[]; eps: number }
export interface SelectOpts {
  eps: number; win?: number; winJ?: number; winX?: number; winD?: number; maxSeg?: number;
  /** Full density over these s ranges [lo, hi] (full chain's arc length;
   *  a closed chain's range may wrap past either end), keyed by chain index. */
  keepRanges?: Map<number, [number, number][]>;
  /** Keep every point of a chain shorter than this (world units). A short
   *  chain between two end arms can carry a sliver region (g41_def_tw64's
   *  chain 81, 0.8 long: area 7e-5 h^2, 9 points) whose existence turns on
   *  frame()'s 3-point gate, and losing it shifts every later region id. */
  keepShort?: number;
}

function cumOf(pts: ArrayLike<number>, closed: boolean, out?: Float64Array): Float64Array {
  const n = pts.length >> 1;
  const c = out && out.length >= n + 1 ? out : new Float64Array(n + 1);
  c[0] = 0;
  for (let i = 0; i + 1 < n; i++) {
    const dx = pts[2 * i + 2] - pts[2 * i]; const dy = pts[2 * i + 3] - pts[2 * i + 1];
    c[i + 1] = c[i] + Math.sqrt(dx * dx + dy * dy);
  }
  if (n > 0) {
    if (closed && n > 1) { const dx = pts[0] - pts[2 * n - 2]; const dy = pts[1] - pts[2 * n - 1]; c[n] = c[n - 1] + Math.sqrt(dx * dx + dy * dy); }
    else c[n] = c[n - 1];
  }
  return c;
}
// The segment index holding s (0..nseg-1); s normalised on a closed chain.
function segAt(cum: Float64Array, n: number, closed: boolean, s: number): number {
  const L = closed ? cum[n] : cum[n - 1];
  let u = s;
  if (closed && L > 0) { u %= L; if (u < 0) u += L; }
  const nseg = closed ? n : n - 1;
  if (nseg <= 0) return 0;
  let lo = 0; let hi = nseg; // cum[lo] <= u < cum[hi]
  if (u <= 0) return 0;
  if (u >= cum[nseg]) return nseg - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= u) lo = m; else hi = m; }
  return lo;
}

// Per chain: [s, window] of each feature (window: world units along s).
function featuresOf(scene: SceneIn, wX: number, wJ: number, wD: number): Map<number, [number, number][]> {
  const f = new Map<number, [number, number][]>();
  const add = (chain: number, s: number, w: number): void => { let a = f.get(chain); if (!a) { a = []; f.set(chain, a); } a.push([s, w]); };
  for (const x of scene.crossings) { add(x.a.chain, x.a.s, wX); add(x.b.chain, x.b.s, wX); }
  for (const j of scene.junctions) for (const a of j.arms) add(a.chain, a.s, wJ);
  for (const e of scene.deadEnds) add(e.chain, e.s, wD);
  return f;
}

export function selectKeep(scene: SceneIn, o: SelectOpts): KeepSet {
  const w0 = o.win ?? 0;
  const feats = featuresOf(scene, o.winX ?? w0, o.winJ ?? w0, o.winD ?? w0);
  const eps2 = o.eps * o.eps;
  const maxSeg = o.maxSeg ?? Infinity;
  const idx: Int32Array[] = []; const nFull: number[] = [];
  for (let ci = 0; ci < scene.chains.length; ci++) {
    const c = scene.chains[ci];
    const P = c.pts; const n = P.length >> 1; nFull.push(n);
    if (n <= 3 || o.eps <= 0) { idx.push(Int32Array.from({ length: n }, (_, i) => i)); continue; }
    const cum = cumOf(P, c.closed);
    const L = c.closed ? cum[n] : cum[n - 1];
    if (L < (o.keepShort ?? 0)) { idx.push(Int32Array.from({ length: n }, (_, i) => i)); continue; }
    const keep = new Uint8Array(n);
    keep[0] = 1; if (!c.closed) keep[n - 1] = 1;
    for (const [lo, hi] of o.keepRanges?.get(ci) ?? []) {
      for (let i = 0; i < n; i++) {
        const s = cum[i];
        let inR = s >= lo && s <= hi;
        if (!inR && c.closed && L > 0) inR = (s + L >= lo && s + L <= hi) || (s - L >= lo && s - L <= hi) || hi - lo >= L;
        if (inR) keep[i] = 1;
      }
    }
    for (const [s, win] of feats.get(c.id) ?? []) {
      const k = segAt(cum, n, c.closed, s);
      keep[k] = 1; keep[(k + 1) % n] = 1;
      if (win > 0) {
        for (let i = 0; i < n; i++) {
          let d = Math.abs(cum[i] - s);
          if (c.closed && L > 0) { d %= L; d = Math.min(d, L - d); }
          if (d <= win) keep[i] = 1;
        }
      }
    }
    // A closed chain with one anchor: add the point farthest from it.
    if (c.closed) {
      let cnt = 0; for (let i = 0; i < n; i++) cnt += keep[i];
      if (cnt < 2) { let bi = 1; let bd = -1; for (let i = 1; i < n; i++) { const d = Math.hypot(P[2 * i] - P[0], P[2 * i + 1] - P[1]); if (d > bd) { bd = d; bi = i; } } keep[bi] = 1; }
    }
    // Douglas-Peucker between consecutive anchors (indices unwrapped on a closed chain).
    const anchors: number[] = [];
    for (let i = 0; i < n; i++) if (keep[i]) anchors.push(i);
    const spans: [number, number][] = [];
    for (let a = 0; a + 1 < anchors.length; a++) spans.push([anchors[a], anchors[a + 1]]);
    if (c.closed) spans.push([anchors[anchors.length - 1], anchors[0] + n]);
    const X = (i: number): number => P[2 * (i % n)]; const Y = (i: number): number => P[2 * (i % n) + 1];
    const S = (i: number): number => (i < n ? cum[i] : cum[i - n] + L);
    const stack: number[] = [];
    for (const [a0, b0] of spans) {
      stack.push(a0, b0);
      while (stack.length) {
        const b = stack.pop()!; const a = stack.pop()!;
        if (b - a < 2) continue;
        const ax = X(a); const ay = Y(a); const ex = X(b) - ax; const ey = Y(b) - ay; const l2 = ex * ex + ey * ey;
        let bi = -1; let bd = -1;
        for (let i = a + 1; i < b; i++) {
          const px = X(i) - ax; const py = Y(i) - ay;
          let t = l2 > 0 ? (px * ex + py * ey) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = px - ex * t; const dy = py - ey * t; const d = dx * dx + dy * dy;
          if (d > bd) { bd = d; bi = i; }
        }
        if (bd > eps2 || S(b) - S(a) > maxSeg) {
          if (bd <= eps2) bi = (a + b) >> 1; // split a long span at its middle point
          keep[bi % n] = 1;
          stack.push(a, bi, bi, b);
        }
      }
    }
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
    idx.push(Int32Array.from(out));
  }
  return { idx, nFull, eps: o.eps };
}

// Scratch reused across frames (cum arrays per chain).
const scratchFull: Float64Array[] = []; const scratchRed: Float64Array[] = [];

/** The reduced scene: kept points, s remapped. A new object each call (frame()
 *  may keep views of a scene's arrays between frames). */
export function reduceScene(scene: SceneIn, K: KeepSet): SceneIn {
  const idxOfId = new Map<number, number>();
  const chains = scene.chains.map((c, ci) => {
    idxOfId.set(c.id, ci);
    const ix = K.idx[ci]; const m = ix.length; const P = c.pts;
    const pts = new Array<number>(2 * m);
    for (let j = 0; j < m; j++) { const i = ix[j]; pts[2 * j] = P[2 * i]; pts[2 * j + 1] = P[2 * i + 1]; }
    return { id: c.id, closed: c.closed, pts };
  });
  // s maps: computed lazily per chain (only chains that carry a feature).
  const ready = new Uint8Array(chains.length);
  const mapS = (chain: number, s: number): number => {
    const ci = idxOfId.get(chain);
    if (ci === undefined) return s;
    const c = scene.chains[ci]; const ix = K.idx[ci]; const n = c.pts.length >> 1; const m = ix.length;
    if (m === n) return s;
    if (!ready[ci]) {
      scratchFull[ci] = cumOf(c.pts, c.closed, scratchFull[ci]);
      scratchRed[ci] = cumOf(chains[ci].pts, c.closed, scratchRed[ci]);
      ready[ci] = 1;
    }
    const cf = scratchFull[ci]; const cr = scratchRed[ci];
    const Lf = c.closed ? cf[n] : cf[n - 1];
    let u = s;
    if (c.closed && Lf > 0) { u %= Lf; if (u < 0) u += Lf; }
    else if (u <= 0) return u; // before the first point (an open chain): s unchanged
    else if (u >= Lf) return cr[m - 1] + (u - Lf);
    // The span j with cf[ix[j]] <= u < cf[ix[j+1]] (ix[m] = n on a closed chain).
    let lo = 0; let hi = c.closed ? m : m - 1;
    const F = (j: number): number => (j < m ? cf[ix[j]] : cf[n]);
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (F(mid) <= u) lo = mid; else hi = mid; }
    const f0 = F(lo); const f1 = F(lo + 1); const r0 = cr[lo]; const r1 = lo + 1 < m ? cr[lo + 1] : cr[m];
    return f1 > f0 ? r0 + ((u - f0) * (r1 - r0)) / (f1 - f0) : r0;
  };
  const crossings = scene.crossings.map((x) => ({ ...x, a: { chain: x.a.chain, s: mapS(x.a.chain, x.a.s) }, b: { chain: x.b.chain, s: mapS(x.b.chain, x.b.s) } }));
  const junctions = scene.junctions.map((j) => ({ ...j, arms: j.arms.map((a) => ({ ...a, s: mapS(a.chain, a.s) })) }));
  const deadEnds = scene.deadEnds.map((e) => ({ ...e, s: mapS(e.chain, e.s) }));
  return { ...scene, chains, crossings, junctions, deadEnds };
}

// ---- Certification (structure time) ----
type PcIn = { kind: string; chain: number; side: number; corner: number; region: number; pts: ArrayLike<number> };
export interface Pc { key: string; pts: Float64Array }
export const piecesOf = (t: { pieces: unknown[] }): Pc[] => (t.pieces as PcIn[]).map((p) => ({ key: `${p.kind}/${p.chain}/${p.side}/${p.corner}/${p.region}`, pts: Float64Array.from(p.pts) }));
function ptPoly(px: number, py: number, q: Float64Array): number {
  const n = q.length >> 1;
  if (n === 0) return Infinity;
  let best = (q[0] - px) * (q[0] - px) + (q[1] - py) * (q[1] - py);
  for (let i = 0; i + 1 < n; i++) {
    const ax = q[2 * i]; const ay = q[2 * i + 1]; const ex = q[2 * i + 2] - ax; const ey = q[2 * i + 3] - ay; const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = ax + ex * t - px; const dy = ay + ey * t - py; const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
/** Hausdorff distance (both ways) of two polylines, world units. */
export function hausdorff(a: Float64Array, b: Float64Array): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0 || b.length === 0) return Infinity;
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) { const d = ptPoly(a[i], a[i + 1], b); if (d > m) m = d; }
  for (let i = 0; i + 1 < b.length; i += 2) { const d = ptPoly(b[i], b[i + 1], a); if (d > m) m = d; }
  return m;
}
/** K1247 s10: what is drawn. A distance function to the union of every
 *  piece's segments (world units), bucketed on a grid of `cell`; a point
 *  searches its 3x3 block, so a distance past `cell` reads as `cell`.
 *  (k1247s9_union.ts's segGrid.) */
export function segGrid(ps: { pts: ArrayLike<number> }[], cell: number): (x: number, y: number) => number {
  const g = new Map<string, number[]>();
  const add = (k: string, a: ArrayLike<number>, i: number, j: number): void => { let l = g.get(k); if (!l) { l = []; g.set(k, l); } l.push(a[i], a[i + 1], a[j], a[j + 1]); };
  for (const p of ps) {
    const a = p.pts;
    if (a.length === 2) { add(`${Math.floor(a[0] / cell)},${Math.floor(a[1] / cell)}`, a, 0, 0); continue; }
    for (let i = 0; i + 3 < a.length; i += 2) {
      const x0 = Math.min(a[i], a[i + 2]); const x1 = Math.max(a[i], a[i + 2]); const y0 = Math.min(a[i + 1], a[i + 3]); const y1 = Math.max(a[i + 1], a[i + 3]);
      for (let cx = Math.floor(x0 / cell); cx <= Math.floor(x1 / cell); cx++) for (let cy = Math.floor(y0 / cell); cy <= Math.floor(y1 / cell); cy++) add(`${cx},${cy}`, a, i, i + 2);
    }
  }
  return (x: number, y: number): number => {
    let best = cell * cell; const cx = Math.floor(x / cell); const cy = Math.floor(y / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const s = g.get(`${cx + i},${cy + j}`); if (!s) continue;
      for (let k = 0; k < s.length; k += 4) {
        const vx = s[k + 2] - s[k]; const vy = s[k + 3] - s[k + 1]; const l2 = vx * vx + vy * vy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - s[k]) * vx + (y - s[k + 1]) * vy) / l2)) : 0;
        const dx = x - s[k] - vx * t; const dy = y - s[k + 1] - vy * t; const d = dx * dx + dy * dy; if (d < best) best = d;
      }
    }
    return Math.sqrt(best);
  };
}
/** Per piece, the drawn move between two frames of one structure: the
 *  distance from each piece's points to the union of every piece of the
 *  other frame, both ways (world units, capped at `cell`), and the point
 *  where it is largest. */
export function drawnMoves(A: { pts: ArrayLike<number> }[], B: { pts: ArrayLike<number> }[], cell: number): { d: number[]; at: [number, number][] } {
  const toA = segGrid(A, cell); const toB = segGrid(B, cell);
  const d: number[] = []; const at: [number, number][] = [];
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    let u = 0; let ax = NaN; let ay = NaN;
    const a = A[i].pts; const b = B[i].pts;
    for (let k = 0; k + 1 < b.length; k += 2) { const v = toA(b[k], b[k + 1]); if (v > u) { u = v; ax = b[k]; ay = b[k + 1]; } }
    for (let k = 0; k + 1 < a.length; k += 2) { const v = toB(a[k], a[k + 1]); if (v > u) { u = v; ax = a[k]; ay = a[k + 1]; } }
    d.push(u); at.push([ax, ay]);
  }
  return { d, at };
}
/** Keep every point within R of any listed spot (x, y pairs), on any chain. */
function restoreNear(scene: SceneIn, K: KeepSet, spots: number[], R: number): number {
  const cell = R; const grid = new Map<string, number[]>();
  for (let i = 0; i + 1 < spots.length; i += 2) {
    const k = `${Math.floor(spots[i] / cell)},${Math.floor(spots[i + 1] / cell)}`;
    let l = grid.get(k); if (!l) { l = []; grid.set(k, l); } l.push(spots[i], spots[i + 1]);
  }
  const R2 = R * R; let added = 0;
  scene.chains.forEach((c, ci) => {
    const P = c.pts; const n = P.length >> 1; const ix = K.idx[ci];
    if (ix.length === n) return;
    const keep = new Uint8Array(n); for (const i of ix) keep[i] = 1;
    let ch = false;
    for (let i = 0; i < n; i++) {
      if (keep[i]) continue;
      const x = P[2 * i]; const y = P[2 * i + 1]; const gx = Math.floor(x / cell); const gy = Math.floor(y / cell);
      let hit = false;
      for (let u = -1; u <= 1 && !hit; u++) for (let v = -1; v <= 1 && !hit; v++) {
        const l = grid.get(`${gx + u},${gy + v}`); if (!l) continue;
        for (let k = 0; k + 1 < l.length; k += 2) if ((l[k] - x) * (l[k] - x) + (l[k + 1] - y) * (l[k + 1] - y) <= R2) { hit = true; break; }
      }
      if (hit) { keep[i] = 1; ch = true; added++; }
    }
    if (ch) { const out: number[] = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(i); K.idx[ci] = Int32Array.from(out); }
  });
  return added;
}
export interface CertOpts { bar: number; R: number; iters?: number }
/** selectKeep, then certify it on `scene` itself: build the full and the
 *  reduced frame, and wherever a piece's key differs or its distance
 *  exceeds `bar` (world), keep every point within R of that piece (both
 *  versions of it), on every chain; repeat until none fails. Structure-time
 *  work only (one full frame, one reduced frame per round). */
export function certifyKeep(scene: SceneIn, o: SelectOpts, c: CertOpts, run: (sc: SceneIn) => Pc[]): { K: KeepSet; rounds: number; added: number; left: number } {
  const K = selectKeep(scene, o);
  const full = run(scene);
  let added = 0; let left = 0;
  const iters = c.iters ?? 8;
  for (let r = 0; r < iters; r++) {
    const red = run(reduceScene(scene, K));
    const spots: number[] = []; left = 0;
    for (let i = 0; i < full.length; i++) {
      const a = full[i]; const b = red[i];
      if (!b) { left++; continue; }
      if (a.key !== b.key || hausdorff(a.pts, b.pts) > c.bar) { left++; for (const q of [a.pts, b.pts]) for (let k = 0; k < q.length; k++) spots.push(q[k]); }
    }
    if (!left) return { K, rounds: r, added, left };
    added += restoreNear(scene, K, spots, c.R);
  }
  return { K, rounds: iters, added, left };
}

/** The junction arms' windows [sR, sR + dir L] (outline.ts's corner walks
 *  and feet stay inside them), padded by `pad` world units each way, from a
 *  full build of `scene` (at structure time). `reach` (world units) keeps
 *  only the arm's first `reach` from the root (the corner's own stretch). */
export function armRanges(arms: { pi: number; sR: number; dir: number; L: number }[], pad: number, reach = Infinity): Map<number, [number, number][]> {
  const m = new Map<number, [number, number][]>();
  for (const a of arms) {
    if (!Number.isFinite(a.L) || !Number.isFinite(a.sR)) continue;
    const e = a.sR + a.dir * Math.min(a.L, reach);
    const r: [number, number] = [Math.min(a.sR, e) - pad, Math.max(a.sR, e) + pad];
    let l = m.get(a.pi); if (!l) { l = []; m.set(a.pi, l); } l.push(r);
  }
  return m;
}

/** Windows around the crossings that cap an arm's L (outline.ts: L is the
 *  min of the next root, the chain's end and each crossing cut
 *  d - h cot(theta/2) - h, so the cut's angle, read from both threads'
 *  tangents at the crossing, sets L; a corner's foot amplifies a change of L
 *  9-20x, K1247 s8). For each arm, the first crossing on its chain past
 *  sR + dir L (within `reach`), padded by `pad` on BOTH of the crossing's
 *  chains. Merged into `into` (chain index -> ranges in the chain's s). */
export function armCrossRanges(scene: SceneIn, arms: { pi: number; sR: number; dir: number; L: number }[], pad: number, reach: number, into = new Map<number, [number, number][]>()): Map<number, [number, number][]> {
  const idxOf = new Map<number, number>(); scene.chains.forEach((c, i) => idxOf.set(c.id, i));
  const ends = new Map<number, { s: number; other: { ci: number; s: number } }[]>();
  for (const x of scene.crossings) {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain); if (ia === undefined || ib === undefined) continue;
    for (const [ci, s, o] of [[ia, x.a.s, { ci: ib, s: x.b.s }], [ib, x.b.s, { ci: ia, s: x.a.s }]] as const) { let l = ends.get(ci); if (!l) { l = []; ends.set(ci, l); } l.push({ s, other: o }); }
  }
  const push = (ci: number, s: number): void => { let l = into.get(ci); if (!l) { l = []; into.set(ci, l); } l.push([s - pad, s + pad]); };
  for (const a of arms) {
    if (!Number.isFinite(a.L) || !Number.isFinite(a.sR)) continue;
    const c = scene.chains[a.pi]; if (!c) continue;
    const P = c.pts; const n = P.length >> 1; const cum = cumOf(P, c.closed); const Lc = c.closed ? cum[n] : cum[n - 1];
    let best: { s: number; other: { ci: number; s: number } } | null = null; let bd = Infinity;
    for (const e of ends.get(a.pi) ?? []) {
      let d = (e.s - a.sR) * a.dir; if (c.closed && Lc > 0) d = ((d % Lc) + Lc) % Lc;
      const past = d - a.L; if (past >= -1e-9 && past <= reach && past < bd) { bd = past; best = e; }
    }
    if (best) { push(a.pi, best.s); push(best.other.ci, best.other.s); }
  }
  return into;
}

export function keepStats(K: KeepSet): { full: number; kept: number } {
  let full = 0; let kept = 0;
  for (let i = 0; i < K.idx.length; i++) { full += K.nFull[i]; kept += K.idx[i].length; }
  return { full, kept };
}
