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
export interface SelectOpts { eps: number; win?: number; winJ?: number; winX?: number; winD?: number; maxSeg?: number }

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
  for (const c of scene.chains) {
    const P = c.pts; const n = P.length >> 1; nFull.push(n);
    if (n <= 3 || o.eps <= 0) { idx.push(Int32Array.from({ length: n }, (_, i) => i)); continue; }
    const cum = cumOf(P, c.closed);
    const L = c.closed ? cum[n] : cum[n - 1];
    const keep = new Uint8Array(n);
    keep[0] = 1; if (!c.closed) keep[n - 1] = 1;
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

export function keepStats(K: KeepSet): { full: number; kept: number } {
  let full = 0; let kept = 0;
  for (let i = 0; i < K.idx.length; i++) { full += K.nFull[i]; kept += K.idx[i].length; }
  return { full, kept };
}
