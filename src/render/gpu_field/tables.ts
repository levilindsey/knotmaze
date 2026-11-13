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
//   corner is concave (theta < pi) and round: centre C, radius r = form B's
//   r0, the sector's two rays (C -> tangent points) and the material's far
//   bound. Closed form: the straight model, then ONE re-solve against the
//   arms' tangent lines at the straight model's tangent points (no search,
//   no iteration). O(arms).
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
  return { x: ax + dx * t, y: ay + dy * t, tx: dx / l, ty: dy / l };
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
  let best = { d: Infinity, x, y };
  for (let k = v0; k < v0 + nv - 1; k++) {
    if (T.vs[k + 1] < sLo || T.vs[k] > sHi) continue;
    const ax = T.vx[k]; const ay = T.vy[k]; const dx = T.vx[k + 1] - ax; const dy = T.vy[k + 1] - ay;
    const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const fx = ax + dx * u; const fy = ay + dy * u; const d = Math.hypot(x - fx, y - fy);
    if (d < best.d) best = { d, x: fx, y: fy };
  }
  return best;
}

export function buildTables(scene: FieldScene, opts: GfOpts): GfTables {
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
  const rT = { cV0: new Int32Array(nC), cNV: new Int32Array(nC), vx: new Float64Array(nRaw), vy: new Float64Array(nRaw), vs: new Float64Array(nRaw) };
  {
    let v = 0;
    raw.forEach((c, i) => {
      rT.cV0[i] = v; const m = c.pts.length >> 1; let s = 0;
      for (let k = 0; k < m + (c.closed ? 1 : 0); k++) {
        const q = k % m; const x = c.pts[2 * q]; const y = c.pts[2 * q + 1];
        if (k > 0) s += Math.hypot(x - rT.vx[v - 1], y - rT.vy[v - 1]);
        rT.vx[v] = x; rT.vy[v] = y; rT.vs[v] = s; v++;
      }
      rT.cNV[i] = v - rT.cV0[i];
    });
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
    for (let i = 0; i < nC; i++) {
      cV0[i] = v; cClosed[i] = raw[i].closed ? 1 : 0;
      const a0 = rT.cV0[i]; const n = rT.cNV[i];
      let s0 = 0;
      if (extS[i]) {
        const e = extS[i]!; const d = Math.hypot(rT.vx[a0] - e[0], rT.vy[a0] - e[1]);
        if (d > 1e-9) { vx[v] = e[0]; vy[v] = e[1]; vs[v] = -d; s0 = -d; v++; }
      }
      for (let k = 0; k < n; k++) { vx[v] = rT.vx[a0 + k]; vy[v] = rT.vy[a0 + k]; vs[v] = rT.vs[a0 + k]; v++; }
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
  for (const x of scene.crossings) {
    const ia = idxOf.get(x.a.chain); const ib = idxOf.get(x.b.chain);
    if (ia === undefined || ib === undefined) continue;
    const sa = norm(ia, x.a.s); const sb = norm(ib, x.b.s);
    const ta = chainAt(TT, ia, sa); const tb = chainAt(TT, ib, sb);
    const theta = Math.acos(Math.min(1, Math.abs(ta.tx * tb.tx + ta.ty * tb.ty)));
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
  type ArmT = { c: number; j: number; ei: number; sR: number; dir: number; L: number; Lcut: number; g: number; ang: number; ux: number; uy: number; uB: number; L0: number };
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
      const a0 = chainAt(TT, c, sB); const a1 = chainAt(TT, c, cClosed[c] ? norm(c, sB + dir * 2 * h) : Math.max(cS0[c], Math.min(cS0[c] + len, sB + dir * 2 * h)));
      armsT.push({ c, j: ji, ei, sR, dir, L0: L, L: Math.max(0, Math.min(L, Lcut)), Lcut, g: -1, ang: Math.atan2(a1.y - a0.y, a1.x - a0.x), ux: (a1.x - a0.x) / (Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1), uy: (a1.y - a0.y) / (Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1), uB });
    });
  });
  // the behind-pass cut (form B's dEdge "near" with dEdgeTip 1): c = k uB, k = clamp(1 / max tan((pi - theta)/4), 1, 4)
  for (const A of armsT) {
    if (!(A.uB < Infinity)) continue;
    const sib = armsT.filter((q) => q.j === A.j).sort((u, v) => u.ang - v.ang); const n = sib.length; const at = sib.indexOf(A);
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
  // 4. Corners: form B's rolling-ball fillet per cyclically adjacent arm pair (ordered by the arms' chord
  //    angle at 2h; no corner between the two arms of one through pass), in closed form. The radius is form B's
  //    r = integral of S over rho from h to h + r0 (S the running minimum of w = the slack gate x the two root
  //    gates), on the straight-arm model at 32 fixed nodes: the steep and margin gates read 1 on straight arms
  //    and are not modelled, nor is the overlap gate omega. C and V come from one solve against each arm's
  //    tangent line at its straight-model foot. The fill is bounded by rV = |C - V| as in form B's inFill.
  const cr = look.cuspRadius ?? 3; const rootBand = 0.5;
  const ss01 = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
  const tRef = 1 / Math.sin(1.0) - 1; // form B's ROOT_BAND_REF_THETA = 2
  const rootTip = (th: number): number => { const s = Math.sin(th / 2); if (!(s > 0)) return 1; const t = 1 / s - 1; return t > 0 ? Math.min(1, t / tRef) : 0; };
  const K: { cx: number; cy: number; r: number; rmax: number; eax: number; eay: number; ebx: number; eby: number; g: number; j: number; a: number; b: number; theta: number; ca: number; cb: number; sa: number; sb: number }[] = [];
  const sibs: ArmT[][] = scene.junctions.map(() => []);
  for (const A of armsT) sibs[A.j].push(A);
  const armPt = (A: ArmT, u: number): { x: number; y: number; tx: number; ty: number; s: number } => {
    const s = cClosed[A.c] ? norm(A.c, A.sR + A.dir * u) : Math.max(cS0[A.c], Math.min(cS0[A.c] + cLen[A.c], A.sR + A.dir * u));
    const p = chainAt(TT, A.c, s); return { x: p.x, y: p.y, tx: p.tx * A.dir, ty: p.ty * A.dir, s };
  };
  // The point at distance rho from both arms' tangent lines at their feet u (B ccw of A by th < pi: the corner
  // lies on A's left and B's right); the straight model's point when the lines are near parallel or it lands far.
  const solve2 = (J: { c: [number, number] | number[] }, A: ArmT, B: ArmT, th: number, u: number, rho: number): { x: number; y: number; nax: number; nay: number; nbx: number; nby: number; sa: number; sb: number } => {
    const pa = armPt(A, u); const pb = armPt(B, u);
    const nax = -pa.ty; const nay = pa.tx; const nbx = pb.ty; const nby = -pb.tx;
    let bx = A.ux + B.ux; let by = A.uy + B.uy; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const R0 = rho / Math.sin(th / 2); const x0 = J.c[0] + bx * R0; const y0 = J.c[1] + by * R0;
    const ax0 = pa.x + rho * nax; const ay0 = pa.y + rho * nay; const bx0 = pb.x + rho * nbx; const by0 = pb.y + rho * nby;
    const det = -pa.tx * pb.ty + pa.ty * pb.tx;
    if (Math.abs(det) > 1e-6) {
      const rx = bx0 - ax0; const ry = by0 - ay0; const t = (-rx * pb.ty + ry * pb.tx) / det;
      const qx = ax0 + t * pa.tx; const qy = ay0 + t * pa.ty;
      if (Math.hypot(qx - x0, qy - y0) < R0) return { x: qx, y: qy, nax, nay, nbx, nby, sa: pa.s, sb: pb.s };
    }
    // straight model: the rays from the point to the lines are -n along the bisector's normals
    const cs = Math.cos(th / 2); const sn = Math.sin(th / 2);
    return { x: x0, y: y0, nax: bx * sn - by * cs, nay: bx * cs + by * sn, nbx: bx * sn + by * cs, nby: -bx * cs + by * sn, sa: pa.s, sb: pb.s };
  };
  scene.junctions.forEach((J, ji) => {
    const S = sibs[ji].sort((u, v) => u.ang - v.ang); const n = S.length; if (n < 2) return;
    const g = find(ji); const ne = J.arms.length; const styles = J.corners ?? [];
    for (let i = 0; i < n; i++) {
      const A = S[i]; const B = S[(i + 1) % n];
      let th = B.ang - A.ang; th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const xa = J.arms[A.ei]; const xb = J.arms[B.ei];
      if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      let st = styles[A.ei]?.style; if ((A.ei + 1) % ne !== B.ei && (B.ei + 1) % ne === A.ei) st = styles[B.ei]?.style;
      if (st === "sharp") continue;
      if (!(A.L > 1e-9 && B.L > 1e-9)) continue;
      const t2 = Math.tan(th / 2); const uV = h / t2;
      if (!(uV < A.L && uV < B.L)) continue; // form B: V's feet inside both arms
      const r0 = (cr / 3) * Math.min(2 * h, 1.5 * h * t2);
      const rb = Math.max(rootBand * h * rootTip(th), 1e-9 * h); const minL = Math.min(A.L, B.L);
      const wOf = (rho: number): number => { const u = rho / t2; const fr = ss01(u / rb); return ss01((minL - W - u) / (0.5 * h)) * fr * fr; };
      let r = 0;
      if (r0 > 1e-9) {
        const dN = r0 / 32; let sPrev = wOf(h);
        for (let k = 1; k <= 32 && sPrev > 0; k++) { const sK = Math.min(sPrev, wOf(h + k * dN)); r += 0.5 * (sPrev + sK) * dN; sPrev = sK; }
      }
      if (!(r > 1e-9)) continue;
      const q = solve2(J, A, B, th, (h + r) / t2, h + r);
      const V = solve2(J, A, B, th, uV, h);
      const rV = Math.hypot(V.x - q.x, V.y - q.y);
      const rmax = rV + (2 * aa) / Math.max(0.1, Math.sin(th / 2));
      K.push({ cx: q.x, cy: q.y, r, rmax, eax: -q.nax, eay: -q.nay, ebx: -q.nbx, eby: -q.nby, g, j: ji, a: A.ei, b: B.ei, theta: th, ca: A.c, cb: B.c, sa: q.sa, sb: q.sb });
    }
  });
  const nK = K.length;
  const kCx = new Float64Array(nK); const kCy = new Float64Array(nK); const kR = new Float64Array(nK); const kRmax = new Float64Array(nK);
  const kEax = new Float64Array(nK); const kEay = new Float64Array(nK); const kEbx = new Float64Array(nK); const kEby = new Float64Array(nK); const kG = new Int32Array(nK);
  const kJ = new Int32Array(nK); const kA = new Int32Array(nK); const kB = new Int32Array(nK); const kTheta = new Float64Array(nK);
  const kCa = new Int32Array(nK); const kCb = new Int32Array(nK); const kSa = new Float64Array(nK); const kSb = new Float64Array(nK); const kZa = new Float64Array(nK); const kZb = new Float64Array(nK);
  const kTax = new Float64Array(nK); const kTay = new Float64Array(nK); const kTbx = new Float64Array(nK); const kTby = new Float64Array(nK);
  const PZ = { cPin0, cPinN, pinS, pinZ, cClosed, cLen, cS0, win };
  K.forEach((q, i) => { kCa[i] = q.ca; kCb[i] = q.cb; kSa[i] = q.sa; kSb[i] = q.sb; kZa[i] = depthAt(PZ, q.ca, q.sa); kZb[i] = depthAt(PZ, q.cb, q.sb); kTax[i] = q.cx + q.r * q.eax; kTay[i] = q.cy + q.r * q.eay; kTbx[i] = q.cx + q.r * q.ebx; kTby[i] = q.cy + q.r * q.eby; });
  K.forEach((q, i) => { kCx[i] = q.cx; kCy[i] = q.cy; kR[i] = q.r; kRmax[i] = q.rmax; kEax[i] = q.eax; kEay[i] = q.eay; kEbx[i] = q.ebx; kEby[i] = q.eby; kG[i] = q.g; kJ[i] = q.j; kA[i] = q.a; kB[i] = q.b; kTheta[i] = q.theta; });
  const t4 = now();

  // 5. Chunks and bins.
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
  const G = (opts.gridK ?? 1) * h;
  gx0 -= rc + G; gy0 -= rc + G; gx1 += rc + G; gy1 += rc + G;
  const gW = Math.max(1, Math.ceil((gx1 - gx0) / G)); const gH = Math.max(1, Math.ceil((gy1 - gy0) / G));
  const nCell = gW * gH;
  const cellChN = new Int32Array(nCell); const cellKN = new Int32Array(nCell);
  const cellRange = (x0: number, y0: number, x1: number, y1: number, R: number): [number, number, number, number] => [
    Math.max(0, Math.floor((x0 - R - gx0) / G)), Math.max(0, Math.floor((y0 - R - gy0) / G)),
    Math.min(gW - 1, Math.floor((x1 + R - gx0) / G)), Math.min(gH - 1, Math.floor((y1 + R - gy0) / G)),
  ];
  for (let q = 0; q < nCh; q++) { const [a, b, c, d] = cellRange(chBox[4 * q], chBox[4 * q + 1], chBox[4 * q + 2], chBox[4 * q + 3], rc); for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) cellChN[y * gW + x]++; }
  for (let q = 0; q < nK; q++) { const [a, b, c, d] = cellRange(kCx[q], kCy[q], kCx[q], kCy[q], kRmax[q] + 2 * aa); for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) cellKN[y * gW + x]++; }
  const cellCh0 = new Int32Array(nCell); const cellK0 = new Int32Array(nCell);
  let sCh = 0; let sK = 0;
  for (let i = 0; i < nCell; i++) { cellCh0[i] = sCh; sCh += cellChN[i]; cellK0[i] = sK; sK += cellKN[i]; }
  const cellChList = new Int32Array(sCh); const cellKList = new Int32Array(sK);
  const fCh = new Int32Array(nCell); const fK = new Int32Array(nCell);
  for (let q = 0; q < nCh; q++) { const [a, b, c, d] = cellRange(chBox[4 * q], chBox[4 * q + 1], chBox[4 * q + 2], chBox[4 * q + 3], rc); for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) { const i = y * gW + x; cellChList[cellCh0[i] + fCh[i]++] = q; } }
  for (let q = 0; q < nK; q++) { const [a, b, c, d] = cellRange(kCx[q], kCy[q], kCx[q], kCy[q], kRmax[q] + 2 * aa); for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) { const i = y * gW + x; cellKList[cellK0[i] + fK[i]++] = q; } }
  const t5 = now();

  return {
    h, W, aa, sigma, zt, amp, win, rc, nC, cV0, cNV, cClosed, cLen, cS0, cPin0, cPinN, cArm0, cArmN,
    nV, vx, vy, vs, pinS, pinZ, nA, aSR, aDir, aL, aLcut, aG,
    nK, kCx, kCy, kR, kRmax, kEax, kEay, kEbx, kEby, kG, kJ, kA, kB, kTheta, kCa, kCb, kSa, kSb, kZa, kZb, kTax, kTay, kTbx, kTby,
    nCh, chV0, chN, chC, chBox, gx0, gy0, G, gW, gH, cellCh0, cellChN, cellChList, cellK0, cellKN, cellKList,
    ms: { vtx: t1 - t0, pins: t2 - t1, arms: t3 - t2, corners: t4 - t3, bins: t5 - t4, total: t5 - t0 },
  };
}
