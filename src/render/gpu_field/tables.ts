// K1362 s1: the per-pixel junction look's per-frame tables (CPU side).
//
// The GPU pass (gf_glsl.ts) and its CPU mirror (gf_eval.ts) evaluate the
// look per pixel from these tables alone. Per frame the CPU builds:
// - VTX: every chain's centreline vertices (x, y, s), END arms extended to
//   c' (form B step 1); a closed chain repeats its first vertex at the end,
//   so segment k runs from vertex k to k + 1 inside a chain. O(points), a
//   copy and a prefix sum.
// - PIN: each chain's crossing pins (s, z = +-amp), sorted: form B's
//   diagram depth (depth.ts hats) is evaluated per pixel from them.
// - SPAN: each chain's group-membership intervals (sLo, sHi, group): the
//   junction clusters joined by a run with no crossing (union-find over the
//   chain's events), each arm's span ending a crossing reach before the
//   next pin. O(crossings + arms).
// - CORNER: one rolling-ball fillet per cyclically adjacent arm pair whose
//   corner is concave (theta < pi) and round: centre C, radius r (form B's
//   rolling-ball integral at a FIXED 24 nodes, feet tracked along the real
//   arms with exact local polyline projections, the margin gate read at
//   fixed arm samples), the sector's two rays and the material's far bound.
//   A fixed cost per corner (no adaptive step, no search). O(arms).
// - BINS: a uniform grid (cell G) listing CHUNKS (runs of CH segments of one
//   chain) whose bbox lies within RC of the cell, and the corners whose
//   material reaches it. O(points / CH) inserts.
// Nothing here walks, searches or fits per frame beyond those.

import type { FieldScene } from "../field/scene";

export const CH = 8; // segments per chunk
export const MAXP = 8; // pieces kept per pixel

export interface GfOpts {
  /** Half the AA ramp, world units. */
  aa: number;
  /** Cell size factor (G = gridK * h). */
  gridK?: number;
}

export interface GfTables {
  h: number; W: number; aa: number; sigma: number; zt: number; amp: number; win: number; rc: number;
  nC: number;
  cV0: Int32Array; cNV: Int32Array; cClosed: Uint8Array; cLen: Float64Array; cS0: Float64Array;
  cPin0: Int32Array; cPinN: Int32Array; cArm0: Int32Array; cArmN: Int32Array;
  /** Original scene chain index -> same index (kept for clarity: tables index chains as the scene orders them). */
  nV: number; vx: Float64Array; vy: Float64Array; vs: Float64Array;
  pinS: Float64Array; pinZ: Float64Array;
  /** Arms, sorted by chain: root s, direction, span L, cap Lcut (Infinity = none), group. */
  nA: number; aSR: Float64Array; aDir: Float64Array; aL: Float64Array; aLcut: Float64Array; aG: Int32Array;
  nK: number;
  kCx: Float64Array; kCy: Float64Array; kR: Float64Array; kRmax: Float64Array;
  /** K1049: 1 = the bend corner of one through pass (the rounded open eye, drawn only inside its cone as
   * the arc's band r..r+W around q); rV = |V - q| bounds the cone. */
  kThru: Uint8Array; kRV: Float64Array;
  kEax: Float64Array; kEay: Float64Array; kEbx: Float64Array; kEby: Float64Array; kG: Int32Array;
  /** For the census's K1049 check and the report: junction index, arm indices, the corner angle. */
  kJ: Int32Array; kA: Int32Array; kB: Int32Array; kTheta: Float64Array;
  /** Per corner, each side's tangent point: chain, s and depth (the fill's key and label read the nearer side). */
  kCa: Int32Array; kCb: Int32Array; kSa: Float64Array; kSb: Float64Array; kZa: Float64Array; kZb: Float64Array; kTax: Float64Array; kTay: Float64Array; kTbx: Float64Array; kTby: Float64Array;
  nCh: number; chV0: Int32Array; chN: Int32Array; chC: Int32Array; chBox: Float64Array;
  gx0: number; gy0: number; G: number; gW: number; gH: number;
  cellCh0: Int32Array; cellChN: Int32Array; cellChList: Int32Array;
  cellK0: Int32Array; cellKN: Int32Array; cellKList: Int32Array;
  /** Build time per part, ms. */
  ms: { vtx: number; pins: number; arms: number; corners: number; bins: number; total: number };
}

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Point and unit tangent at arc length s on chain c of the built vertex table (s clamped / wrapped). */
export function chainAt(T: Pick<GfTables, "cV0" | "cNV" | "cClosed" | "cLen" | "cS0" | "vx" | "vy" | "vs">, c: number, s: number): { x: number; y: number; tx: number; ty: number } {
  const o = { x: 0, y: 0, tx: 0, ty: 0 };
  chainAtInto(T, c, s, o);
  return o;
}
// K1362 t1: chainAtInto writes chainAt's result into a caller scratch (same arithmetic, no allocation).
function chainAtInto(T: Pick<GfTables, "cV0" | "cNV" | "cClosed" | "cLen" | "cS0" | "vx" | "vy" | "vs">, c: number, s: number, o: { x: number; y: number; tx: number; ty: number }): void {
  const v0 = T.cV0[c]; const nv = T.cNV[c];
  let u = s;
  if (T.cClosed[c]) { u = (s - T.cS0[c]) % T.cLen[c]; if (u < 0) u += T.cLen[c]; u += T.cS0[c]; }
  let lo = v0; let hi = v0 + nv - 1;
  if (u <= T.vs[lo]) hi = lo + 1;
  else if (u >= T.vs[hi]) lo = hi - 1;
  else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.vs[m] <= u) lo = m; else hi = m; }
  const ax = T.vx[lo]; const ay = T.vy[lo]; const bx = T.vx[hi]; const by = T.vy[hi];
  const L = T.vs[hi] - T.vs[lo];
  const t = L > 0 ? Math.min(1, Math.max(0, (u - T.vs[lo]) / L)) : 0;
  const dx = bx - ax; const dy = by - ay; const l = Math.hypot(dx, dy) || 1;
  o.x = ax + dx * t; o.y = ay + dy * t; o.tx = dx / l; o.ty = dy / l;
}

/** Form B's diagram depth at (c, s): the two neighbouring pins' hats (depth.ts), each over min(win, the pin gap). */
export function depthAt(T: { cPin0: Int32Array; cPinN: Int32Array; pinS: Float64Array; pinZ: Float64Array; cClosed: Uint8Array; cLen: Float64Array; cS0: Float64Array; win: number }, c: number, s: number): number {
  const n = T.cPinN[c]; if (n === 0) return 0;
  const b = T.cPin0[c]; const win = T.win;
  const hat = (z: number, d: number, w: number): number => (w <= 1e-12 ? (d <= 0 ? z : 0) : d >= w ? 0 : z * (1 - d / w));
  let u = s;
  if (T.cClosed[c]) { u = (s - T.cS0[c]) % T.cLen[c]; if (u < 0) u += T.cLen[c]; u += T.cS0[c]; }
  let lo = -1; let hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.pinS[b + m] <= u) lo = m; else hi = m; }
  if (T.cClosed[c]) {
    const iL = lo < 0 ? n - 1 : lo; const sL = lo < 0 ? T.pinS[b + iL] - T.cLen[c] : T.pinS[b + iL];
    const iR = lo + 1 >= n ? 0 : lo + 1; const sR = lo + 1 >= n ? T.pinS[b + iR] + T.cLen[c] : T.pinS[b + iR];
    const w = Math.min(win, sR - sL);
    return hat(T.pinZ[b + iL], u - sL, w) + hat(T.pinZ[b + iR], sR - u, w);
  }
  if (lo < 0) return hat(T.pinZ[b], T.pinS[b] - u, win);
  if (lo + 1 >= n) return hat(T.pinZ[b + n - 1], u - T.pinS[b + n - 1], win);
  const w = Math.min(win, T.pinS[b + lo + 1] - T.pinS[b + lo]);
  return hat(T.pinZ[b + lo], u - T.pinS[b + lo], w) + hat(T.pinZ[b + lo + 1], T.pinS[b + lo + 1] - u, w);
}
/** Nearest point of chain c to (x, y) within arc length [sLo, sHi] (a bounded scan of the vertex table). */
function footNear(T: GfTables | Pick<GfTables, "cV0" | "cNV" | "vx" | "vy" | "vs">, c: number, x: number, y: number, sLo: number, sHi: number): { d: number; x: number; y: number } {
  const v0 = T.cV0[c]; const nv = T.cNV[c];
  let bd = Infinity; let bx = x; let by = y;
  if (nv > 1) {
    const vsA = T.vs;
    // First/last segment the full scan would not skip (vs is non-decreasing): same segments, same order.
    let lo = v0; let hi = v0 + nv - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (vsA[m + 1] >= sLo) hi = m; else lo = m + 1; }
    const k0 = lo;
    lo = v0; hi = v0 + nv - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (vsA[m] <= sHi) lo = m + 1; else hi = m; }
    for (let k = k0; k <= lo - 1; k++) {
      const ax = T.vx[k]; const ay = T.vy[k]; const dx = T.vx[k + 1] - ax; const dy = T.vy[k + 1] - ay;
      const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const fx = ax + dx * u; const fy = ay + dy * u; const d = Math.hypot(x - fx, y - fy);
      if (d < bd) { bd = d; bx = fx; by = fy; }
    }
  }
  return { d: bd, x: bx, y: by };
}

// K1362 t2: the table build in poolable phases. buildTables (below) is the
// cold single-thread build: prefix (vertices, pins, arms), corners, bins.
// The pool path runs the same code partitioned: raw chain vertices by chain
// (gfRawChain/mergeGfRaw), corners by contiguous junction ranges
// (solveGfCorners), chunk bins by contiguous chunk ranges (gfChunkBinPart),
// merged in order (mergeGfChunkBins, assembleGfTables). Corner solves share
// no state across corners: the SP/Q scratch and the arm-sample map are fresh
// per solveGfCorners call and every hint is per corner pair, so a slice's
// corners are bit-identical to the cold build's (the t1 rule: the solve's
// input bits are unchanged, only who runs them).
export interface GfArm { c: number; j: number; ei: number; sR: number; dir: number; L: number; Lcut: number; g: number; ang: number; ux: number; uy: number; uB: number; L0: number }
export interface GfCorner { thru: number; rv: number; cx: number; cy: number; r: number; rmax: number; eax: number; eay: number; ebx: number; eby: number; g: number; j: number; a: number; b: number; theta: number; ca: number; cb: number; sa: number; sb: number }
export interface GfRaw { cV0: Int32Array; cNV: Int32Array; vx: Float64Array; vy: Float64Array; vs: Float64Array }
export interface GfPrefix {
  h: number; W: number; aa: number; sigma: number; zt: number; amp: number; win: number; rc: number; gridK?: number; cr: number;
  nC: number; cV0: Int32Array; cNV: Int32Array; cClosed: Uint8Array; cLen: Float64Array; cS0: Float64Array;
  cPin0: Int32Array; cPinN: Int32Array; cArm0: Int32Array; cArmN: Int32Array;
  nV: number; vx: Float64Array; vy: Float64Array; vs: Float64Array; pinS: Float64Array; pinZ: Float64Array;
  nA: number; aSR: Float64Array; aDir: Float64Array; aL: Float64Array; aLcut: Float64Array; aG: Int32Array;
  arms: GfArm[]; junctions: FieldScene["junctions"]; jGroup: Int32Array;
  ms: { vtx: number; pins: number; arms: number };
}
export interface GfChunkMeta { nCh: number; chV0: Int32Array; chN: Int32Array; chC: Int32Array; chBox: Float64Array; gx0: number; gy0: number; G: number; gW: number; gH: number }

/** One chain's raw vertex table (buildTables step 1 before the c' feet):
 * the chain's points with cumulative arc length, a closed chain's first
 * point repeated at the end. Bit-identical to the cold loop's slice. */
export function gfRawChain(pts: ArrayLike<number>, closed: boolean): { vx: Float64Array; vy: Float64Array; vs: Float64Array } {
  const m = pts.length >> 1; const cnt = m + (closed ? 1 : 0);
  const vx = new Float64Array(cnt); const vy = new Float64Array(cnt); const vs = new Float64Array(cnt);
  let s = 0;
  for (let k = 0; k < cnt; k++) {
    const q = k < m ? k : 0; const x = pts[2 * q]; const y = pts[2 * q + 1];
    if (k > 0) s += Math.hypot(x - vx[k - 1], y - vy[k - 1]);
    vx[k] = x; vy[k] = y; vs[k] = s;
  }
  return { vx, vy, vs };
}

/** Concatenate per-chain raw blocks (chain order) into one raw table. */
export function mergeGfRaw(scene: FieldScene, blocks: { vx: Float64Array; vy: Float64Array; vs: Float64Array }[]): GfRaw {
  const nC = scene.chains.length;
  let nRaw = 0; for (const b of blocks) nRaw += b.vx.length;
  const cV0 = new Int32Array(nC); const cNV = new Int32Array(nC);
  const vx = new Float64Array(nRaw); const vy = new Float64Array(nRaw); const vs = new Float64Array(nRaw);
  let v = 0;
  for (let i = 0; i < nC; i++) {
    const b = blocks[i]; cV0[i] = v; cNV[i] = b.vx.length;
    vx.set(b.vx, v); vy.set(b.vy, v); vs.set(b.vs, v); v += b.vx.length;
  }
  return { cV0, cNV, vx, vy, vs };
}

/** Contiguous [lo, hi) ranges covering [0, weights.length), balanced by
 * cumulative weight (a range boundary never splits an item). */
export function partitionWeighted(weights: number[], parts: number): [number, number][] {
  const n = weights.length;
  const p = Math.max(1, Math.min(parts, Math.max(1, n)));
  let total = 0; for (const w of weights) total += w;
  const out: [number, number][] = [];
  let lo = 0; let acc = 0;
  for (let s = 0; s < p; s++) {
    if (s === p - 1) { out.push([lo, n]); break; }
    const target = (total * (s + 1)) / p;
    let hi = lo;
    while (hi < n && acc + weights[hi] <= target) { acc += weights[hi]; hi++; }
    if (hi === lo && hi < n) { acc += weights[hi]; hi++; }
    if (hi >= n) { out.push([lo, n]); lo = n; break; }
    out.push([lo, hi]); lo = hi;
  }
  while (out.length > 1 && out[out.length - 1][0] >= n) out.pop();
  if (!out.length) out.push([0, n]);
  out[out.length - 1][1] = n;
  return out;
}

export function buildGfPrefix(scene: FieldScene, opts: GfOpts, rawMerged?: GfRaw): GfPrefix {
  const t0 = now();
  const look = scene.look;
  const h = look.halfWidth; const W = look.band; const aa = opts.aa;
  const amp = look.depthAmp; const win = look.depthWindow * (look.ctrlArc ?? 1);
  const sigma = Math.PI * h; const zt = 0.1 * amp;
  const rc = h + W + 2 * aa; // form B's candidate reach: a side foot's burial reads pieces within h of a point W + aa from p
  const nC = scene.chains.length;
  const idxOf = new Map<number, number>(); scene.chains.forEach((c, i) => idxOf.set(c.id, i));

  // 1. Vertices; END arms extended to c' (the nearest point of a through arm's centreline, form B step 1).
  const raw: { pts: ArrayLike<number>; closed: boolean }[] = scene.chains.map((c) => ({ pts: c.pts, closed: c.closed }));
  // raw vertex tables first (for the c' feet)
  let nRaw = 0; for (const c of raw) nRaw += (c.pts.length >> 1) + (c.closed ? 1 : 0);
  const rT: GfRaw = rawMerged ?? { cV0: new Int32Array(nC), cNV: new Int32Array(nC), vx: new Float64Array(nRaw), vy: new Float64Array(nRaw), vs: new Float64Array(nRaw) };
  if (!rawMerged) {
    let v = 0;
    const rVx = rT.vx; const rVy = rT.vy; const rVs = rT.vs;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i]; rT.cV0[i] = v; const m = c.pts.length >> 1; const pts = c.pts; let s = 0;
      const cnt = m + (c.closed ? 1 : 0);
      for (let k = 0; k < cnt; k++) {
        const q = k < m ? k : 0; const x = pts[2 * q]; const y = pts[2 * q + 1];
        if (k > 0) s += Math.hypot(x - rVx[v - 1], y - rVy[v - 1]);
        rVx[v] = x; rVy[v] = y; rVs[v] = s; v++;
      }
      rT.cNV[i] = v - rT.cV0[i];
    }
  }
  const extS: ([number, number] | null)[] = new Array(nC).fill(null); const extE: ([number, number] | null)[] = new Array(nC).fill(null);
  for (const j of scene.junctions) for (const arm of j.arms) {
    if (arm.kind !== "end") continue;
    const pi = idxOf.get(arm.chain); if (pi === undefined || raw[pi].closed) continue;
    const L = rT.vs[rT.cV0[pi] + rT.cNV[pi] - 1];
    const atStart = Math.abs(arm.s) < Math.abs(arm.s - L);
    const tv = atStart ? rT.cV0[pi] : rT.cV0[pi] + rT.cNV[pi] - 1;
    const tx = rT.vx[tv]; const ty = rT.vy[tv];
    let cp: [number, number] = [j.c[0], j.c[1]]; let best = Infinity;
    for (const t of j.arms) {
      if (t.kind !== "through") continue;
      const ti = idxOf.get(t.chain); if (ti === undefined) continue;
      const f = footNear(rT, ti, tx, ty, t.s - 4 * h, t.s + 4 * h);
      if (f.d < best) { best = f.d; cp = [f.x, f.y]; }
    }
    if (atStart) extS[pi] = cp; else extE[pi] = cp;
  }
  let nV = 0; for (let i = 0; i < nC; i++) nV += rT.cNV[i] + (extS[i] ? 1 : 0) + (extE[i] ? 1 : 0);
  const vx = new Float64Array(nV); const vy = new Float64Array(nV); const vs = new Float64Array(nV);
  const cV0 = new Int32Array(nC); const cNV = new Int32Array(nC); const cClosed = new Uint8Array(nC); const cLen = new Float64Array(nC); const cS0 = new Float64Array(nC);
  {
    let v = 0;
    const rVx = rT.vx; const rVy = rT.vy; const rVs = rT.vs;
    for (let i = 0; i < nC; i++) {
      cV0[i] = v; cClosed[i] = raw[i].closed ? 1 : 0;
      const a0 = rT.cV0[i]; const n = rT.cNV[i];
      let s0 = 0;
      if (extS[i]) {
        const e = extS[i]!; const d = Math.hypot(rVx[a0] - e[0], rVy[a0] - e[1]);
        if (d > 1e-9) { vx[v] = e[0]; vy[v] = e[1]; vs[v] = -d; s0 = -d; v++; }
      }
      for (let k = 0; k < n; k++) { vx[v] = rVx[a0 + k]; vy[v] = rVy[a0 + k]; vs[v] = rVs[a0 + k]; v++; }
      if (extE[i]) {
        const e = extE[i]!; const d = Math.hypot(vx[v - 1] - e[0], vy[v - 1] - e[1]);
        if (d > 1e-9) { vx[v] = e[0]; vy[v] = e[1]; vs[v] = vs[v - 1] + d; v++; }
      }
      cNV[i] = v - cV0[i]; cS0[i] = s0; cLen[i] = vs[v - 1] - s0;
    }
    nV = v;
  }
  const t1 = now();

  // 2. Pins (form B step 2): z = +-amp at each crossing's pass.
  const pinsOf: { s: number; z: number; theta: number }[][] = scene.chains.map(() => []);
  const norm = (c: number, s: number): number => {
    if (!cClosed[c]) return s;
    let u = (s - cS0[c]) % cLen[c]; if (u < 0) u += cLen[c]; return u + cS0[c];
  };
  const TT = { cV0, cNV, cClosed, cLen, cS0, vx, vy, vs };
  const CA1 = { x: 0, y: 0, tx: 0, ty: 0 }; const CA2 = { x: 0, y: 0, tx: 0, ty: 0 };
  for (const x of scene.crossings) {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) continue;
    const sa = norm(ia, x.a.s); const sb = norm(ib, x.b.s);
    chainAtInto(TT, ia, sa, CA1); chainAtInto(TT, ib, sb, CA2);
    const theta = Math.acos(Math.min(1, Math.abs(CA1.tx * CA2.tx + CA1.ty * CA2.ty)));
    pinsOf[ia].push({ s: sa, z: x.over === "a" ? amp : -amp, theta });
    pinsOf[ib].push({ s: sb, z: x.over === "b" ? amp : -amp, theta });
  }
  let nPin = 0; for (const p of pinsOf) { p.sort((u, v) => u.s - v.s); nPin += p.length; }
  const pinS = new Float64Array(nPin); const pinZ = new Float64Array(nPin); const cPin0 = new Int32Array(nC); const cPinN = new Int32Array(nC);
  { let q = 0; pinsOf.forEach((P, c) => { cPin0[c] = q; cPinN[c] = P.length; for (const p of P) { pinS[q] = p.s; pinZ[q] = p.z; q++; } }); }
  const t2 = now();

  // 3. Groups (union-find over junctions whose roots a crossing-free run joins) and the arm table:
  //    form B's arms, each [root, root + dir L] with its cap Lcut (front passes: d - h/tan(theta/2) - h;
  //    a pass behind the root: k u, k from the arm's neighbouring corners). Closed form, O(arms x pins of its chain).
  const nJ = scene.junctions.length; const par = Int32Array.from({ length: nJ }, (_, i) => i);
  const find = (a: number): number => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const rootOf = (c: number, arm: { s: number; kind: string }): { sR: number; dir: number } => {
    if (arm.kind === "end") {
      const atStart = Math.abs(arm.s) < Math.abs(arm.s - (cS0[c] + cLen[c])) || Math.abs(arm.s - cS0[c]) < 1e-9;
      return atStart ? { sR: cS0[c], dir: 1 } : { sR: cS0[c] + cLen[c], dir: -1 };
    }
    return { sR: norm(c, arm.s), dir: 0 };
  };
  const roots: { s: number; j: number }[][] = scene.chains.map(() => []);
  scene.junctions.forEach((J, ji) => { for (const arm of J.arms) { const c = idxOf.get(arm.chain); if (c === undefined) continue; const r = rootOf(c, arm); if (!roots[c].some((q) => q.j === ji && Math.abs(q.s - r.sR) < 1e-9)) roots[c].push({ s: r.sR, j: ji }); } });
  const passBetween = (c: number, a: number, b: number): boolean => {
    const len = b - a;
    for (const x of pinsOf[c]) { let u = x.s - a; if (cClosed[c]) u = ((u % cLen[c]) + cLen[c]) % cLen[c]; if (u > 1e-9 && u < len - 1e-9) return true; }
    return false;
  };
  roots.forEach((R, c) => {
    R.sort((u, v) => u.s - v.s);
    for (let i = 0; i + 1 < R.length; i++) if (!passBetween(c, R[i].s, R[i + 1].s)) par[find(R[i].j)] = find(R[i + 1].j);
    if (cClosed[c] && R.length > 1 && !passBetween(c, R[R.length - 1].s, R[0].s + cLen[c])) par[find(R[R.length - 1].j)] = find(R[0].j);
  });
  type ArmT = GfArm;
  const armsT: ArmT[] = [];
  scene.junctions.forEach((J, ji) => {
    J.arms.forEach((arm, ei) => {
      const c = idxOf.get(arm.chain); if (c === undefined) return;
      const r = rootOf(c, arm); const sR = r.sR; const dir = r.dir !== 0 ? r.dir : arm.dir;
      const len = cLen[c];
      const delta = (s: number): number => { let d = (s - sR) * dir; if (cClosed[c]) d = ((d % len) + len) % len; return d; };
      let L = cClosed[c] ? len : dir > 0 ? cS0[c] + len - sR : sR - cS0[c];
      for (const q of roots[c]) { const d = delta(q.s); if (d > 1e-9 && d < L) L = d; }
      let Lcut = Infinity; let uB = Infinity;
      for (const x of pinsOf[c]) {
        const d = delta(x.s);
        if (cClosed[c] || d < -1e-12) uB = Math.min(uB, cClosed[c] ? len - d : -d);
        if (d < -1e-12) continue;
        const t = Math.tan(x.theta / 2); const reach = t > 1e-12 ? h / t : Infinity;
        const cc = d - reach - h; if (cc < Lcut) Lcut = cc;
      }
      const sB = arm.kind === "end" ? norm(c, arm.s) : sR;
      chainAtInto(TT, c, sB, CA1); chainAtInto(TT, c, cClosed[c] ? norm(c, sB + dir * 2 * h) : Math.max(cS0[c], Math.min(cS0[c] + len, sB + dir * 2 * h)), CA2); const a0 = CA1; const a1 = CA2;
      armsT.push({ c, j: ji, ei, sR, dir, L0: L, L: Math.max(0, Math.min(L, Lcut)), Lcut, g: -1, ang: Math.atan2(a1.y - a0.y, a1.x - a0.x), ux: (a1.x - a0.x) / (Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1), uy: (a1.y - a0.y) / (Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1), uB });
    });
  });
  // the behind-pass cut (form B's dEdge "near" with dEdgeTip 1): c = k uB, k = clamp(1 / max tan((pi - theta)/4), 1, 4)
  // K1362 t1: siblings grouped once (same members, same order as the per-arm filter+sort).
  const byJ: ArmT[][] = scene.junctions.map(() => []);
  for (const A of armsT) byJ[A.j].push(A);
  for (const Gp of byJ) Gp.sort((u, v) => u.ang - v.ang);
  for (const A of armsT) {
    if (!(A.uB < Infinity)) continue;
    const sib = byJ[A.j]; const n = sib.length; const at = sib.indexOf(A);
    let gMax = 0;
    for (const [a, b] of [[sib[(at + n - 1) % n], A], [A, sib[(at + 1) % n]]]) {
      if (a === b) continue;
      const xa = scene.junctions[A.j].arms[a.ei]; const xb = scene.junctions[A.j].arms[b.ei];
      if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      let th = b.ang - a.ang; th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th < Math.PI) gMax = Math.max(gMax, Math.tan((Math.PI - th) / 4));
    }
    const k = gMax > 0 ? Math.min(4, Math.max(1, 1 / gMax)) : 4;
    const cc = k * A.uB; if (cc < A.Lcut) A.Lcut = cc;
    A.L = Math.max(0, Math.min(A.L0, A.Lcut));
  }
  for (const A of armsT) A.g = find(A.j);
  armsT.sort((u, v) => u.c - v.c);
  const nA = armsT.length;
  const aSR = new Float64Array(nA); const aDir = new Float64Array(nA); const aL = new Float64Array(nA); const aLcut = new Float64Array(nA); const aG = new Int32Array(nA);
  const cArm0 = new Int32Array(nC); const cArmN = new Int32Array(nC);
  armsT.forEach((A, i) => { aSR[i] = A.sR; aDir[i] = A.dir; aL[i] = A.L; aLcut[i] = A.Lcut; aG[i] = A.g; if (cArmN[A.c] === 0) cArm0[A.c] = i; cArmN[A.c]++; });
  const t3 = now();
  const jGroup = new Int32Array(nJ); for (let ji = 0; ji < nJ; ji++) jGroup[ji] = find(ji);
  return {
    h, W, aa, sigma, zt, amp, win, rc, gridK: opts.gridK, cr: look.cuspRadius ?? 3,
    nC, cV0, cNV, cClosed, cLen, cS0, cPin0, cPinN, cArm0, cArmN,
    nV, vx, vy, vs, pinS, pinZ, nA, aSR, aDir, aL, aLcut, aG,
    arms: armsT, junctions: scene.junctions, jGroup,
    ms: { vtx: t1 - t0, pins: t2 - t1, arms: t3 - t2 },
  };
}

/** Corners for junctions [jLo, jHi) of the prefix, in enumeration order:
 * the cold build's corner loop over that range, with fresh scratch. */
export function solveGfCorners(P: GfPrefix, jLo: number, jHi: number): GfCorner[] {
  type ArmT = GfArm;
  const { h, W, aa, cr, cV0, cNV, cClosed, cLen, cS0, vx, vy, vs } = P;
  const armsT = P.arms; const junctions = P.junctions; const jGroup = P.jGroup;
  const norm = (c: number, s: number): number => {
    if (!cClosed[c]) return s;
    let u = (s - cS0[c]) % cLen[c]; if (u < 0) u += cLen[c]; return u + cS0[c];
  };
  // 4. Corners: form B's rolling-ball fillet per cyclically adjacent arm pair (ordered by the arms' chord
  //    angle at 2h; no corner between the two arms of one through pass). The ball's centre q(rho) sits at rho
  //    from both arms; its feet are TRACKED along the real arms from V (rho = h) at NODES fixed nodes, each node
  //    one predictor (the straight model's du = drho / tan(th/2)) and TRACK corrector steps (solve against the
  //    two tangent lines, re-project each foot). r = integral of S over rho in [h, h + r0], S the running min
  //    of form B's w: the steep, slack and two root gates and the margin gate (how much nearer another part of
  //    either arm's [0, L] comes to q than its foot, outside the foot's basin), the arm read at fixed samples
  //    no more than h/3 apart. A fixed cost per corner: no search, no adaptive step. Form B's overlap gate
  //    omega is not modelled (it reads 1 wherever the margin gate stopped the ball, its S1d F4 note).
  const rootBand = 0.5; const NODES = 24; const TRACK = 1;
  const ss01 = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
  const tRef = 1 / Math.sin(1.0) - 1; // form B's ROOT_BAND_REF_THETA = 2
  const rootTip = (th: number): number => { const s = Math.sin(th / 2); if (!(s > 0)) return 1; const t = 1 / s - 1; return t > 0 ? Math.min(1, t / tRef) : 0; };
  const K: GfCorner[] = [];
  const sibs: GfArm[][] = junctions.map(() => []);
  for (const A of armsT) sibs[A.j].push(A);
  // K1362 t1: SP holds two arm points (x, y, tx, ty, s at 0 and 5); ptOf is armPt+chainAt inlined
  // (same arithmetic). With a hint it walks from the last segment instead of binary-searching:
  // the walk stops at the same segment (vs is non-decreasing), so results are identical.
  const SP = new Float64Array(10);
  const ptOf = (A: ArmT, u: number, o: number, hint?: { k: number }): void => {
    const c = A.c; const v0 = cV0[c]; const nv = cNV[c];
    const s = cClosed[c] ? norm(c, A.sR + A.dir * u) : Math.max(cS0[c], Math.min(cS0[c] + cLen[c], A.sR + A.dir * u));
    let uu = s;
    if (cClosed[c]) { uu = (s - cS0[c]) % cLen[c]; if (uu < 0) uu += cLen[c]; uu += cS0[c]; }
    let lo = v0; let hi = v0 + nv - 1;
    if (uu <= vs[lo]) hi = lo + 1;
    else if (uu >= vs[hi]) lo = hi - 1;
    else if (hint && hint.k >= v0 && hint.k < hi) {
      lo = hint.k;
      while (lo < hi - 1 && vs[lo + 1] <= uu) lo++;
      while (vs[lo] > uu) lo--;
      hi = lo + 1;
    } else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (vs[m] <= uu) lo = m; else hi = m; }
    if (hint) hint.k = lo;
    const ax = vx[lo]; const ay = vy[lo]; const bx = vx[hi]; const by = vy[hi];
    const L = vs[hi] - vs[lo];
    const t = L > 0 ? Math.min(1, Math.max(0, (uu - vs[lo]) / L)) : 0;
    const dx = bx - ax; const dy = by - ay; const l = Math.hypot(dx, dy) || 1;
    SP[o] = ax + dx * t; SP[o + 1] = ay + dy * t; SP[o + 2] = (dx / l) * A.dir; SP[o + 3] = (dy / l) * A.dir; SP[o + 4] = s;
  };
  // Each arm's fixed samples over [0, L], for the margin gate.
  const smp = new Map<ArmT, { n: number; du: number; x: Float64Array; y: Float64Array }>();
  const smpOf = (A: ArmT): { n: number; du: number; x: Float64Array; y: Float64Array } => {
    let S = smp.get(A);
    if (!S) {
      const n = Math.max(2, Math.min(48, Math.ceil(A.L / (h / 3)))); const x = new Float64Array(n + 1); const y = new Float64Array(n + 1);
      const hint = { k: -1 };
      for (let i = 0; i <= n; i++) { ptOf(A, (A.L * i) / n, 0, hint); x[i] = SP[0]; y[i] = SP[1]; }
      S = { n, du: A.L / n, x, y }; smp.set(A, S);
    }
    return S;
  };
  const marginAt = (S: { n: number; du: number; x: Float64Array; y: Float64Array }, u: number, qx: number, qy: number, dc: number, cutSq: number): number => {
    // K1362 t1: the far scan compares squared distances (sqrt once at the end; min commutes with sqrt exactly).
    // Early abandon at cutSq: the caller (wOf) discards any result <= -0.05 h, and cutSq is set a guard
    // below that threshold, so abandoning once the running min reaches it cannot change the caller's output.
    const X = S.x; const Y = S.y;
    const f = Math.min(S.n, Math.max(0, u / S.du)); let hi = Math.min(S.n, Math.ceil(f)); let lo = Math.max(0, Math.floor(f));
    let ex = X[hi] - qx; let ey = Y[hi] - qy; let dp = Math.sqrt(ex * ex + ey * ey);
    while (hi < S.n) { ex = X[hi + 1] - qx; ey = Y[hi + 1] - qy; const dn = Math.sqrt(ex * ex + ey * ey); if (dn < dp) break; dp = dn; hi++; }
    ex = X[lo] - qx; ey = Y[lo] - qy; dp = Math.sqrt(ex * ex + ey * ey);
    while (lo > 0) { ex = X[lo - 1] - qx; ey = Y[lo - 1] - qy; const dn = Math.sqrt(ex * ex + ey * ey); if (dn < dp) break; dp = dn; lo--; }
    let d2 = Infinity;
    for (let k = hi + 1; k <= S.n; k++) { ex = X[k] - qx; ey = Y[k] - qy; const dd = ex * ex + ey * ey; if (dd < d2) { d2 = dd; if (d2 <= cutSq) return Math.sqrt(d2) - dc; } }
    for (let k = 0; k < lo; k++) { ex = X[k] - qx; ey = Y[k] - qy; const dd = ex * ex + ey * ey; if (dd < d2) { d2 = dd; if (d2 <= cutSq) return Math.sqrt(d2) - dc; } }
    return Math.sqrt(d2) - dc;
  };
  type Q = { x: number; y: number; ua: number; ub: number; nax: number; nay: number; nbx: number; nby: number; sa: number; sb: number; fax: number; fay: number; fbx: number; fby: number };
  // The point at rho from A's tangent line at ua (on its left) and B's at ub (on its right); the straight
  // model's point when the lines are near parallel or it lands farther than the straight model's reach.
  const solveAtInto = (out: Q, J: { c: [number, number] | number[] }, A: ArmT, B: ArmT, ua: number, ub: number, rho: number, hA: { k: number }, hB: { k: number }, snH: number, csH: number): void => {
    ptOf(A, ua, 0, hA); ptOf(B, ub, 5, hB);
    const nax = -SP[3]; const nay = SP[2]; const nbx = SP[8]; const nby = -SP[7];
    let bx = A.ux + B.ux; let by = A.uy + B.uy; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const R0 = rho / snH; const x0 = J.c[0] + bx * R0; const y0 = J.c[1] + by * R0;
    const ax0 = SP[0] + rho * nax; const ay0 = SP[1] + rho * nay; const bx0 = SP[5] + rho * nbx; const by0 = SP[6] + rho * nby;
    const det = -SP[2] * SP[8] + SP[3] * SP[7];
    out.ua = ua; out.ub = ub; out.sa = SP[4]; out.sb = SP[9]; out.fax = SP[0]; out.fay = SP[1]; out.fbx = SP[5]; out.fby = SP[6];
    if (Math.abs(det) > 1e-6) {
      const rx = bx0 - ax0; const ry = by0 - ay0; const t = (-rx * SP[8] + ry * SP[7]) / det;
      const qx = ax0 + t * SP[2]; const qy = ay0 + t * SP[3];
      if (Math.hypot(qx - x0, qy - y0) < 4 * R0 + 2 * h) { out.x = qx; out.y = qy; out.nax = nax; out.nay = nay; out.nbx = nbx; out.nby = nby; return; }
    }
    out.x = x0; out.y = y0; out.nax = bx * snH - by * csH; out.nay = bx * csH + by * snH; out.nbx = bx * snH + by * csH; out.nby = -bx * csH + by * snH;
  };
  // A foot's exact local projection on the arm's polyline: from u's segment, step to a neighbour while the
  // projection falls outside the segment (at most 6 steps; a reversal means the foot is the shared vertex).
  const proj = (A: ArmT, u: number, x: number, y: number, hint: { k: number }): number => {
    const c = A.c; const v0 = cV0[c]; const nv = cNV[c]; const closed = cClosed[c] === 1;
    const sRaw = A.sR + A.dir * u; const s = closed ? norm(c, sRaw) : Math.max(vs[v0], Math.min(vs[v0 + nv - 1], sRaw)); const off = sRaw - s;
    let k = v0; let hi = v0 + nv - 1;
    // K1362 t1: walk from the last call's segment (same segment the binary search finds; vs is sorted).
    if (hint.k >= v0 && hint.k < hi) {
      k = hint.k;
      while (k < hi - 1 && vs[k + 1] <= s) k++;
      while (k > v0 && vs[k] > s) k--;
    } else while (hi - k > 1) { const m = (k + hi) >> 1; if (vs[m] <= s) k = m; else hi = m; }
    hint.k = k;
    let wrap = 0; let mv = 0; let sf = s;
    for (let it = 0; it < 7; it++) {
      const ax = vx[k]; const ay = vy[k]; const dx = vx[k + 1] - ax; const dy = vy[k + 1] - ay; const l2 = dx * dx + dy * dy;
      const tt = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      if (tt < 0 && it < 6) {
        if (mv === 1) { sf = vs[k] + wrap; break; }
        if (k > v0) { k--; mv = -1; continue; }
        if (closed) { k = v0 + nv - 2; wrap -= cLen[c]; mv = -1; continue; }
      } else if (tt > 1 && it < 6) {
        if (mv === -1) { sf = vs[k + 1] + wrap; break; }
        if (k < v0 + nv - 2) { k++; mv = 1; continue; }
        if (closed) { k = v0; wrap += cLen[c]; mv = 1; continue; }
      }
      const tc = Math.min(1, Math.max(0, tt)); sf = vs[k] + tc * (vs[k + 1] - vs[k]) + wrap; break;
    }
    return Math.min(A.L, Math.max(0, (sf + off - A.sR) * A.dir));
  };  // Each corrector step moves a foot by at most lim (a node's straight-model step): a foot never jumps.
  const trackInto = (out: Q, J: { c: [number, number] | number[] }, A: ArmT, B: ArmT, ua: number, ub: number, rho: number, it: number, lim: number, hA: { k: number }, hB: { k: number }, snH: number, csH: number): void => {
    solveAtInto(out, J, A, B, ua, ub, rho, hA, hB, snH, csH);
    for (let k = 0; k < it; k++) {
      const oua = out.ua; const oub = out.ub; const ox = out.x; const oy = out.y;
      const na = Math.min(oua + lim, Math.max(oua - lim, proj(A, oua, ox, oy, hA)));
      const nb = Math.min(oub + lim, Math.max(oub - lim, proj(B, oub, ox, oy, hB)));
      solveAtInto(out, J, A, B, na, nb, rho, hA, hB, snH, csH);
    }
  };
  const QVB: Q = { x: 0, y: 0, ua: 0, ub: 0, nax: 0, nay: 0, nbx: 0, nby: 0, sa: 0, sb: 0, fax: 0, fay: 0, fbx: 0, fby: 0 };
  const QPB: Q = { x: 0, y: 0, ua: 0, ub: 0, nax: 0, nay: 0, nbx: 0, nby: 0, sa: 0, sb: 0, fax: 0, fay: 0, fbx: 0, fby: 0 };
  const QQB: Q = { x: 0, y: 0, ua: 0, ub: 0, nax: 0, nay: 0, nbx: 0, nby: 0, sa: 0, sb: 0, fax: 0, fay: 0, fbx: 0, fby: 0 };
  for (let ji = jLo; ji < jHi; ji++) {
    const J = junctions[ji];
    const S = sibs[ji].sort((u, v) => u.ang - v.ang); const n = S.length; if (n < 2) continue;
    const g = jGroup[ji]; const ne = J.arms.length; const styles = J.corners ?? [];
    for (let i = 0; i < n; i++) {
      const A = S[i]; const B = S[(i + 1) % n];
      let th = B.ang - A.ang; th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const xa = J.arms[A.ei]; const xb = J.arms[B.ei];
      const thru = xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6 ? 1 : 0;
      let st = styles[A.ei]?.style; if ((A.ei + 1) % ne !== B.ei && (B.ei + 1) % ne === A.ei) st = styles[B.ei]?.style;
      if (st === "sharp") continue;
      if (!(A.L > 1e-9 && B.L > 1e-9)) continue;
      const t2 = Math.tan(th / 2); const uV0 = h / t2;
      // form B: V's (tracked) feet inside both arms, checked below
      const r0 = (cr / 3) * Math.min(2 * h, 1.5 * h * t2);
      if (!(r0 > 1e-9)) continue;
      const rb = Math.max(rootBand * h * rootTip(th), 1e-9 * h);
      const hA = { k: -1 }; const hB = { k: -1 };
      const snH = Math.sin(th / 2); const csH = Math.cos(th / 2);
      trackInto(QVB, J, A, B, uV0, uV0, h, 8, Infinity, hA, hB, snH, csH); const V = QVB;
      if (!(V.ua > 0 && V.ua < A.L && V.ub > 0 && V.ub < B.L)) continue;
      { // form B's V gate, mirrored (solveEq): Newton on the TRUE distances to both arms from the straight
        // model's V, each foot clamped at its arm's root; a foot at the root (dV = 0) or no solution rejects.
        // Then V lies in the wedge between the arms' chords (the facing sides).
        let bx = A.ux + B.ux; let by = A.uy + B.uy; const bl = Math.sqrt(bx * bx + by * by) || 1; bx /= bl; by /= bl;
        const sn = Math.sin(th / 2); let x = J.c[0] + (bx * h) / sn; let y = J.c[1] + (by * h) / sn;
        // The foot is windowed to the arm's own [0, L] (its fixed samples): a walk along the chain would cross
        // the root into a through pass's other arm, which form B's windowed foot never reaches.
        const SAw = smpOf(A); const SBw = smpOf(B); const fw = { u: 0, x: 0, y: 0 };
        const footW = (S: { n: number; du: number; x: Float64Array; y: Float64Array }, px: number, py: number): void => {
          let best = Infinity;
          for (let i = 0; i < S.n; i++) {
            const ax = S.x[i]; const ay = S.y[i]; const dx = S.x[i + 1] - ax; const dy = S.y[i + 1] - ay; const l2 = dx * dx + dy * dy;
            const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
            const fx = ax + t * dx; const fy = ay + t * dy; const d2 = (px - fx) * (px - fx) + (py - fy) * (py - fy);
            if (d2 < best) { best = d2; fw.u = (i + t) * S.du; fw.x = fx; fw.y = fy; }
          }
        };
        let ua = uV0; let ub = uV0; let ok = false;
        for (let it = 0; it < 60; it++) {
          footW(SAw, x, y); ua = fw.u; const pax = fw.x; const pay = fw.y; footW(SBw, x, y); ub = fw.u; const pbx = fw.x; const pby = fw.y;
          const dax = x - pax; const day = y - pay; const dbx = x - pbx; const dby = y - pby;
          const da = Math.sqrt(dax * dax + day * day); const db = Math.sqrt(dbx * dbx + dby * dby);
          const Fa = da - h; const Fb = db - h;
          if (Math.abs(Fa) < 1e-9 * h && Math.abs(Fb) < 1e-9 * h) { ok = true; break; }
          if (!(da > 1e-12 && db > 1e-12)) break;
          const gax = dax / da; const gay = day / da; const gbx = dbx / db; const gby = dby / db; const det = gax * gby - gay * gbx;
          if (Math.abs(det) < 1e-12) break;
          let dx = (-Fa * gby + Fb * gay) / det; let dy = (-Fb * gax + Fa * gbx) / det; const dl = Math.sqrt(dx * dx + dy * dy);
          if (dl > h) { dx *= h / dl; dy *= h / dl; }
          x += dx; y += dy;
        }
        const tol = 1e-9 * h;
        if (!(ok && ua > tol && ua < A.L - tol && ub > tol && ub < B.L - tol)) continue;
        const crA = A.ux * (y - J.c[1]) - A.uy * (x - J.c[0]); const crB = B.ux * (y - J.c[1]) - B.uy * (x - J.c[0]);
        const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
        if (!(crA * sgn > 0 && crB * sgn < 0)) continue;
      }
      const SA = smpOf(A); const SB = smpOf(B);
      const denOf = (p: Q): number => { const ax = p.x - p.fax; const ay = p.y - p.fay; const bx = p.x - p.fbx; const by = p.y - p.fby; return 1 + (ax * bx + ay * by) / ((Math.sqrt(ax * ax + ay * ay) || 1) * (Math.sqrt(bx * bx + by * by) || 1)); };
      const denV = denOf(V);
      const mCut = (dc: number): number => { const c0 = dc - 0.05 * h - 1e-12 * (1 + dc); return c0 > 0 ? c0 * c0 : -1; };
      const wOf = (p: Q): number => {
        const fSteep = ss01(((Math.abs(denV) > 1e-12 ? denOf(p) / denV : 0) - 0.3) / 0.4); if (fSteep === 0) return 0;
        const fSlack = ss01(Math.min(A.L - W - p.ua, B.L - W - p.ub) / (0.5 * h)); if (fSlack === 0) return 0;
        const fA = ss01(p.ua / rb); const fB = ss01(p.ub / rb); if (fA === 0 || fB === 0) return 0;
        const dcA = Math.hypot(p.x - p.fax, p.y - p.fay); const mA = marginAt(SA, p.ua, p.x, p.y, dcA, mCut(dcA)); if (mA <= -0.05 * h) return 0;
        const dcB = Math.hypot(p.x - p.fbx, p.y - p.fby); const mB = marginAt(SB, p.ub, p.x, p.y, dcB, mCut(dcB)); if (mB <= -0.05 * h) return 0;
        return ss01(1 + Math.min(0, mA, mB) / (0.05 * h)) * fSteep * fSlack * fA * fB;
      };
      const dN = r0 / NODES; let sPrev = wOf(V); let r = 0; let pua = V.ua; let pub = V.ub;
      for (let k = 1; k <= NODES && sPrev > 0; k++) {
        const du = dN / t2;
        trackInto(QPB, J, A, B, Math.min(A.L, pua + du), Math.min(B.L, pub + du), h + k * dN, TRACK, 4 * du, hA, hB, snH, csH); const pk = QPB;
        const sK = Math.min(sPrev, wOf(pk)); const seg = 0.5 * (sPrev + sK) * dN;
        if (sK < sPrev && sK === 0) { r += seg; break; }
        r += seg; sPrev = sK; pua = pk.ua; pub = pk.ub;
      }
      if (!(r > 1e-9)) continue;
      trackInto(QQB, J, A, B, pua, pub, h + r, TRACK + 1, 4 * dN / t2, hA, hB, snH, csH); const q = QQB;
      const rV = Math.hypot(V.x - q.x, V.y - q.y);
      const rmax = rV + (2 * aa) / Math.max(0.1, Math.sin(th / 2));
      K.push({ thru, rv: rV, cx: q.x, cy: q.y, r, rmax, eax: -q.nax, eay: -q.nay, ebx: -q.nbx, eby: -q.nby, g, j: ji, a: A.ei, b: B.ei, theta: th, ca: A.c, cb: B.c, sa: q.sa, sb: q.sb });
    }
  }
  return K;
}

/** Chunk boxes and the bin grid (buildTables step 5's geometry). */
export function gfChunkMeta(P: GfPrefix): GfChunkMeta {
  const { rc, h, nC, cV0, cNV, vx, vy } = P;
  let nCh = 0; for (let c = 0; c < nC; c++) nCh += Math.ceil(Math.max(0, cNV[c] - 1) / CH);
  const chV0 = new Int32Array(nCh); const chN = new Int32Array(nCh); const chC = new Int32Array(nCh); const chBox = new Float64Array(4 * nCh);
  let gx0 = Infinity; let gy0 = Infinity; let gx1 = -Infinity; let gy1 = -Infinity;
  {
    let q = 0;
    for (let c = 0; c < nC; c++) {
      const nseg = cNV[c] - 1;
      for (let k0 = 0; k0 < nseg; k0 += CH) {
        const n = Math.min(CH, nseg - k0); const v = cV0[c] + k0;
        let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
        for (let k = v; k <= v + n; k++) { const x = vx[k]; const y = vy[k]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        chV0[q] = v; chN[q] = n; chC[q] = c; chBox[4 * q] = x0; chBox[4 * q + 1] = y0; chBox[4 * q + 2] = x1; chBox[4 * q + 3] = y1;
        if (x0 < gx0) gx0 = x0; if (y0 < gy0) gy0 = y0; if (x1 > gx1) gx1 = x1; if (y1 > gy1) gy1 = y1;
        q++;
      }
    }
  }
  const G = (P.gridK ?? 1) * h;
  gx0 -= rc + G; gy0 -= rc + G; gx1 += rc + G; gy1 += rc + G;
  const gW = Math.max(1, Math.ceil((gx1 - gx0) / G)); const gH = Math.max(1, Math.ceil((gy1 - gy0) / G));
  return { nCh, chV0, chN, chC, chBox, gx0, gy0, G, gW, gH };
}

/** One slice's chunk-bin counts and list (cells in grid order, chunk
 * indices ascending within a cell, as the cold fill gives for its range). */
export function gfChunkBinPart(P: GfPrefix, meta: GfChunkMeta, qLo: number, qHi: number): { cellChN: Int32Array; cellChList: Int32Array } {
  const { rc } = P; const { chBox, gx0, gy0, G, gW, gH } = meta;
  const nCell = gW * gH;
  const cellChN = new Int32Array(nCell);
  const rng = new Int32Array(4 * Math.max(0, qHi - qLo));
  for (let q = qLo; q < qHi; q++) {
    const x0 = chBox[4 * q]; const y0 = chBox[4 * q + 1]; const x1 = chBox[4 * q + 2]; const y1 = chBox[4 * q + 3];
    const a = Math.max(0, Math.floor((x0 - rc - gx0) / G)); const b = Math.max(0, Math.floor((y0 - rc - gy0) / G));
    const c = Math.min(gW - 1, Math.floor((x1 + rc - gx0) / G)); const d = Math.min(gH - 1, Math.floor((y1 + rc - gy0) / G));
    rng[4 * (q - qLo)] = a; rng[4 * (q - qLo) + 1] = b; rng[4 * (q - qLo) + 2] = c; rng[4 * (q - qLo) + 3] = d;
    for (let y = b; y <= d; y++) { let i = y * gW + a; for (let x = a; x <= c; x++) cellChN[i++]++; }
  }
  const off = new Int32Array(nCell);
  let s = 0; for (let i = 0; i < nCell; i++) { off[i] = s; s += cellChN[i]; }
  const cellChList = new Int32Array(s);
  const f = new Int32Array(nCell);
  for (let q = qLo; q < qHi; q++) { const a = rng[4 * (q - qLo)]; const b = rng[4 * (q - qLo) + 1]; const c = rng[4 * (q - qLo) + 2]; const d = rng[4 * (q - qLo) + 3]; for (let y = b; y <= d; y++) { const i0 = y * gW; for (let x = a; x <= c; x++) { const i = i0 + x; cellChList[off[i] + f[i]++] = q; } } }
  return { cellChN, cellChList };
}

/** Merge chunk-bin slices (in chunk order) into the cold build's lists. */
export function mergeGfChunkBins(parts: { cellChN: Int32Array; cellChList: Int32Array }[], nCell: number): { cellCh0: Int32Array; cellChN: Int32Array; cellChList: Int32Array } {
  const cellChN = new Int32Array(nCell);
  for (const p of parts) for (let i = 0; i < nCell; i++) cellChN[i] += p.cellChN[i];
  const cellCh0 = new Int32Array(nCell);
  let s = 0; for (let i = 0; i < nCell; i++) { cellCh0[i] = s; s += cellChN[i]; }
  const cellChList = new Int32Array(s);
  const cur = Int32Array.from(cellCh0);
  for (const p of parts) {
    let off = 0;
    for (let i = 0; i < nCell; i++) {
      const cnt = p.cellChN[i];
      for (let k = 0; k < cnt; k++) cellChList[cur[i]++] = p.cellChList[off + k];
      off += cnt;
    }
  }
  return { cellCh0, cellChN, cellChList };
}

/** The tables from a prefix and its corners (all of them, in order).
 * With a merged chunk-bin slice set, bins take it; else bins run whole. */
export function assembleGfTables(P: GfPrefix, K: GfCorner[], chunk: { meta: GfChunkMeta; bins: { cellCh0: Int32Array; cellChN: Int32Array; cellChList: Int32Array } } | null, ms: { vtx: number; pins: number; arms: number; corners: number }, t0: number): GfTables {
  const { h, W, aa, sigma, zt, amp, win, rc, nC, cV0, cNV, cClosed, cLen, cS0, cPin0, cPinN, cArm0, cArmN, nV, vx, vy, vs, pinS, pinZ, nA, aSR, aDir, aL, aLcut, aG } = P;
  const nK = K.length;
  const kCx = new Float64Array(nK); const kCy = new Float64Array(nK); const kR = new Float64Array(nK); const kRmax = new Float64Array(nK);
  const kEax = new Float64Array(nK); const kEay = new Float64Array(nK); const kEbx = new Float64Array(nK); const kEby = new Float64Array(nK); const kG = new Int32Array(nK);
  const kJ = new Int32Array(nK); const kA = new Int32Array(nK); const kB = new Int32Array(nK); const kTheta = new Float64Array(nK);
  const kCa = new Int32Array(nK); const kCb = new Int32Array(nK); const kSa = new Float64Array(nK); const kSb = new Float64Array(nK); const kZa = new Float64Array(nK); const kZb = new Float64Array(nK);
  const kThru = new Uint8Array(nK); const kRV = new Float64Array(nK);
  const kTax = new Float64Array(nK); const kTay = new Float64Array(nK); const kTbx = new Float64Array(nK); const kTby = new Float64Array(nK);
  const PZ = { cPin0, cPinN, pinS, pinZ, cClosed, cLen, cS0, win };
  K.forEach((q, i) => { kCa[i] = q.ca; kCb[i] = q.cb; kSa[i] = q.sa; kSb[i] = q.sb; kZa[i] = depthAt(PZ, q.ca, q.sa); kZb[i] = depthAt(PZ, q.cb, q.sb); kTax[i] = q.cx + q.r * q.eax; kTay[i] = q.cy + q.r * q.eay; kTbx[i] = q.cx + q.r * q.ebx; kTby[i] = q.cy + q.r * q.eby; });
  K.forEach((q, i) => { kCx[i] = q.cx; kCy[i] = q.cy; kR[i] = q.r; kRmax[i] = q.rmax; kEax[i] = q.eax; kEay[i] = q.eay; kEbx[i] = q.ebx; kEby[i] = q.eby; kG[i] = q.g; kJ[i] = q.j; kA[i] = q.a; kB[i] = q.b; kTheta[i] = q.theta; kThru[i] = q.thru; kRV[i] = q.rv; });
  const t4 = now();

  // 5. Chunks and bins.
  const meta = chunk?.meta ?? gfChunkMeta(P);
  const { nCh, chV0, chN, chC, chBox, gx0, gy0, G, gW, gH } = meta;
  const nCell = gW * gH;
  const cellKN = new Int32Array(nCell);
  // K1362 t1: each item's cell range computed once (same floors), reused by the count and fill passes.
  const rngK = new Int32Array(4 * nK);
  for (let q = 0; q < nK; q++) {
    const R = kRmax[q] + W + 3 * aa; const kx = kCx[q]; const ky = kCy[q];
    const a = Math.max(0, Math.floor((kx - R - gx0) / G)); const b = Math.max(0, Math.floor((ky - R - gy0) / G));
    const c = Math.min(gW - 1, Math.floor((kx + R - gx0) / G)); const d = Math.min(gH - 1, Math.floor((ky + R - gy0) / G));
    rngK[4 * q] = a; rngK[4 * q + 1] = b; rngK[4 * q + 2] = c; rngK[4 * q + 3] = d;
    for (let y = b; y <= d; y++) { let i = y * gW + a; for (let x = a; x <= c; x++) cellKN[i++]++; }
  }
  let cellCh0: Int32Array; let cellChN: Int32Array; let cellChList: Int32Array;
  if (chunk) {
    ({ cellCh0, cellChN, cellChList } = chunk.bins);
  } else {
    const merged = mergeGfChunkBins([gfChunkBinPart(P, meta, 0, nCh)], nCell);
    ({ cellCh0, cellChN, cellChList } = merged);
  }
  const cellK0 = new Int32Array(nCell);
  let sK = 0;
  for (let i = 0; i < nCell; i++) { cellK0[i] = sK; sK += cellKN[i]; }
  const cellKList = new Int32Array(sK);
  const fK = new Int32Array(nCell);
  for (let q = 0; q < nK; q++) { const a = rngK[4 * q]; const b = rngK[4 * q + 1]; const c = rngK[4 * q + 2]; const d = rngK[4 * q + 3]; for (let y = b; y <= d; y++) { const i0 = y * gW; for (let x = a; x <= c; x++) { const i = i0 + x; cellKList[cellK0[i] + fK[i]++] = q; } } }
  const t5 = now();

  return {
    h, W, aa, sigma, zt, amp, win, rc, nC, cV0, cNV, cClosed, cLen, cS0, cPin0, cPinN, cArm0, cArmN,
    nV, vx, vy, vs, pinS, pinZ, nA, aSR, aDir, aL, aLcut, aG,
    nK, kCx, kCy, kR, kRmax, kThru, kRV, kEax, kEay, kEbx, kEby, kG, kJ, kA, kB, kTheta, kCa, kCb, kSa, kSb, kZa, kZb, kTax, kTay, kTbx, kTby,
    nCh, chV0, chN, chC, chBox, gx0, gy0, G, gW, gH, cellCh0, cellChN, cellChList, cellK0, cellKN, cellKList,
    ms: { vtx: ms.vtx, pins: ms.pins, arms: ms.arms, corners: ms.corners, bins: t5 - t4, total: t5 - t0 },
  };
}

export function buildTables(scene: FieldScene, opts: GfOpts): GfTables {
  const t0 = now();
  const P = buildGfPrefix(scene, opts);
  const tc0 = now();
  const K = solveGfCorners(P, 0, P.junctions.length);
  const tc1 = now();
  return assembleGfTables(P, K, null, { vtx: P.ms.vtx, pins: P.ms.pins, arms: P.ms.arms, corners: tc1 - tc0 }, t0);
}

/** The pool path in-process: the worker pool's partitions and merges,
 * run sequentially. Bit-identical to buildTables by construction. */
export function buildTablesPooled(scene: FieldScene, opts: GfOpts, nSlices: number): GfTables {
  const t0 = now();
  const n = Math.max(1, nSlices);
  const blocks: { vx: Float64Array; vy: Float64Array; vs: Float64Array }[] = new Array(scene.chains.length);
  for (const [lo, hi] of partitionWeighted(scene.chains.map((c) => c.pts.length >> 1), n))
    for (let ci = lo; ci < hi; ci++) blocks[ci] = gfRawChain(scene.chains[ci].pts, scene.chains[ci].closed);
  const P = buildGfPrefix(scene, opts, mergeGfRaw(scene, blocks));
  const meta = gfChunkMeta(P);
  const tc0 = now();
  let K: GfCorner[] = [];
  for (const [lo, hi] of partitionWeighted(scene.junctions.map((J) => J.arms.length), n)) K = K.concat(solveGfCorners(P, lo, hi));
  const tc1 = now();
  const parts = partitionWeighted(new Array(meta.nCh).fill(1), n).map(([lo, hi]) => gfChunkBinPart(P, meta, lo, hi));
  const bins = mergeGfChunkBins(parts, meta.gW * meta.gH);
  return assembleGfTables(P, K, { meta, bins }, { vtx: P.ms.vtx, pins: P.ms.pins, arms: P.ms.arms, corners: tc1 - tc0 }, t0);
}
