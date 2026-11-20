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
//   exact V from solveEq on the true feet, then its closed-form growth
//   corner_cf with form B's w read at the growth's q/feet; the tracked
//   fixed-node integral remains only where that growth cannot start), the
//   sector's two rays and the material's far bound. O(arms).
// - BINS: a uniform grid (cell G) listing CHUNKS (runs of CH segments of one
//   chain) whose bbox lies within RC of the cell, and the corners whose
//   material reaches it. O(points / CH) inserts.
// Nothing here walks, searches or fits per frame beyond those.

import type { FieldScene } from "../field/scene";
import { CornerGrowth, polyTangents, type CfArmIn } from "../field/corner_cf";
import { footInWindow, segOfS, type Foot, type Poly } from "../field/geom";

export const CH = 8; // segments per chunk
export const MAXP = 8; // pieces kept per pixel

/**
 * K1438: junction membership from each arm's HOME interval (K1435's probe mode tgr). Off in the shipped build
 * until K1439 mirrors it in gf_glsl.ts; `GfOpts.home` overrides it per build, env GF_HOME=1 for Node probes.
 * The table always carries `aHome`; only `homeOn` (and gf_pack's write of it) follows the switch, so with the
 * switch off the packed texture, the digest and every pin are master's.
 */
export const GF_HOME: boolean = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_HOME === "1";
/**
 * K1482 s20: home membership's corner retry (solveGfCorners pass 1): a cut arm extends GF_KEXT h past its cut.
 * 0 turns the retry off. Env GF_KEXT / GF_KCAP (L0 | home) for Node probes.
 */
const ENV20 = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
export const GF_KEXT: number = ENV20?.GF_KEXT !== undefined ? +ENV20.GF_KEXT : 1.5;
export const GF_KCAP: string = ENV20?.GF_KCAP ?? "L0";
/** K1482 s20: a retry corner of radius above GF_KRMAX h is dropped (the pass-0 result stands): its arc leaves the
 * thread's edge (t32e, t75e). Env GF_KRMAX for Node probes. */
export const GF_KRMAX: number = ENV20?.GF_KRMAX !== undefined ? +ENV20.GF_KRMAX : 1e9;
/** K1482 s20: likewise a retry corner whose arc sits more than GF_KSAG h inside the sharp corner (r / sin(th/2) - r).
 * K1482 s22: 0.35 (was 0.5): the arcs at 0.37-0.48 h are the K1436 bar's fix3 finds (def's dstray, g41_user_tw64's vdip:\n * the arc leaves the fill's sharp corner bare); link A's named corners sit at 0.32 h or less. */
export const GF_KSAG: number = ENV20?.GF_KSAG !== undefined ? +ENV20.GF_KSAG : 0.35;
/** K1482 s22: and one of radius under GF_KRMIN h (muse_hash's 0.02 h and 0.09 h retries were the bar's rstray at j64\n * and a vdip:tie; a near-null arc is no rounding, only a different ink). Env GF_KSAG / GF_KRMIN for Node probes. */
export const GF_KRMIN: number = ENV20?.GF_KRMIN !== undefined ? +ENV20.GF_KRMIN : 0.1;
/**
 * K1482 s23: the retry's switch (the `gfk=1` render flag with `gfh=1`; K1524 decides whether it becomes the default
 * or goes). Off, the default: no retry corner is solved and the tables are master's, field for field (no kExt, no
 * *Alt). `GfOpts.kRetry` overrides it per build, env GF_KRETRY=1 for Node probes.
 */
export const GF_KRETRY: boolean = ENV20?.GF_KRETRY === "1";

export interface GfOpts {
  /** Half the AA ramp, world units. */
  aa: number;
  /** Cell size factor (G = gridK * h). */
  gridK?: number;
  /** K1438: home membership on (default GF_HOME). */
  home?: boolean;
  /** K1482 s23: the corner retry on (default GF_KRETRY). */
  kRetry?: boolean;
}

export interface GfTables {
  h: number; W: number; aa: number; sigma: number; zt: number; amp: number; win: number; rc: number;
  nC: number;
  cV0: Int32Array; cNV: Int32Array; cClosed: Uint8Array; cLen: Float64Array; cS0: Float64Array;
  cPin0: Int32Array; cPinN: Int32Array; cArm0: Int32Array; cArmN: Int32Array;
  /** Original scene chain index -> same index (kept for clarity: tables index chains as the scene orders them). */
  nV: number; vx: Float64Array; vy: Float64Array; vs: Float64Array;
  pinS: Float64Array; pinZ: Float64Array;
  /**
   * K1451: each pin's KEY depth window on its left (s below the pin) and right side: max(win, GF_REACH_K x the arc
   * over which the crossing's other pass stays within GF_REACH_SEP h of this pass), so the keys' depth hat spans the
   * whole ribbon overlap of a shallow or curved crossing (pinReach). Only the piece keys read it (eval.ts keyDepth,
   * gf_glsl.ts depth()); membership and the corner depths keep win (depthAt). K1502: baked in both modes.
   */
  pinWL: Float64Array; pinWR: Float64Array;
  /** Arms, sorted by chain: root s, direction, span L, cap Lcut (Infinity = none), group. */
  nA: number; aSR: Float64Array; aDir: Float64Array; aL: Float64Array; aLcut: Float64Array; aG: Int32Array;
  /**
   * K1438: each arm's home extent from its root: aL, or for a capped arm (finite aLcut) max(aL, min(the nearest
   * crossing ahead, 4h)). A piece in it whose depth is still near 0 joins the arm's group, fading as the thread
   * dives (eval.ts member()). `homeOn` = the switch this build took (GF_HOME / GfOpts.home).
   */
  aHome: Float64Array; homeOn: boolean;
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
  /**
   * K1362 s14 (additive; only a `kp` tier reads it): each corner cell's lists pruned by an exact bound, 4 slots per
   * entry of its cellKList at slot 4 * cellK0: (nThru, nKeep), the thru corners whose reach (kRV + W + 4aa) can
   * touch the cell, then the corners whose ring test (kR - aa - W < rho <= kRmax + W + 2aa) and, thru, reach can pass
   * somewhere in it, each in cellKList order (2 + nThru + nKeep <= 4 kn); unused slots are -1.
   */
  cellKPList: Int32Array;
  /**
   * K1482 s20: per corner, 1 = a retry corner (solveGfCorners pass 1: a pair a crossing cut short, on arms extended
   * past the cut), home membership's only and ink only (its arc buries the V's outlines; it sets no depth, cov or
   * label); 2 = the pair's pass 0 corner, home-off's only; 0 = both modes'. Retry corners sit after all others.
   * nK and the cell lists above are this build's mode's (homeOn); the *Alt fields are the other mode's, and
   * withHome() swaps them in. Corners nK..nKAlt-1 of a home-off build are its retry corners.
   * K1482 s23: only a build with the retry on (GfOpts.kRetry / GF_KRETRY) carries these fields.
   */
  kExt?: Uint8Array; nKAlt?: number; cellK0Alt?: Int32Array; cellKNAlt?: Int32Array; cellKListAlt?: Int32Array; cellKPListAlt?: Int32Array;
  /** Build time per part, ms. */
  ms: { vtx: number; pins: number; arms: number; corners: number; bins: number; kp: number; total: number };
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

/** K1451: a pin's key window is max(win, GF_REACH_K x its reach). K1502: GF_REACH_K 1.0 clamps it
 * to the overlap's end (1.15 held the key past it and the look's gap shaved the neighbour: x154). */
export const GF_REACH_K = 1.0;
/** K1451: the overlap's end: the other pass's centreline farther than GF_REACH_SEP h (the two ribbons part). */
export const GF_REACH_SEP = 2;
/** K1451: the reach walk's step and cap, in h. */
export const GF_REACH_STEP = 0.1;
export const GF_REACH_CAP = 10;

/**
 * K1451: the reach of a crossing's overlap from one pass. Walks chain c from s0 in direction dir (+-1) in steps of
 * GF_REACH_STEP h, and keeps the partner pass's foot (chain p, from its pin at sp) by a hill climb over p's
 * segments, so each step costs a few segment distances; stops where the partner's centreline is farther than
 * GF_REACH_SEP h, at the GF_REACH_CAP h cap, or at `gap` (the next pin: a window past it is cut there anyway, so
 * the walk returns gap). An open chain's walk holds its end point past the end (chainAt clamps), as the probe did.
 * Returns the last arc still inside (0 = the first step is out).
 */
/** K1502 26N: one partner chain's reach prep (per build): segment midpoints and half-lengths,
 * plus per-block (REACH_BLK segments) vertex-bbox centres and radii for the stretch search's jump. */
export interface ReachPrep { mx: Float64Array; my: Float64Array; hl: Float64Array; bx: Float64Array; by: Float64Array; br: Float64Array }
const REACH_BLK = 4;
export function pinReach(T: Pick<GfTables, "cV0" | "cNV" | "cClosed" | "cLen" | "cS0" | "vx" | "vy" | "vs">, c: number, s0: number, dir: number, p: number, sp: number, h: number, gap: number, from = 0, prep?: Map<number, ReachPrep>): number {
  const step = GF_REACH_STEP * h; const cap = GF_REACH_CAP * h; const sep = GF_REACH_SEP * h; const sep2 = sep * sep;
  const vx = T.vx; const vy = T.vy; const vs = T.vs;
  const v0 = T.cV0[p]; const nseg = T.cNV[p] - 1; const closed = T.cClosed[p] === 1;
  // K1451 26E: with a prep map (one per build, from the caller), each partner chain's segment midpoints and
  // half-lengths are built once and reused by every walk on that chain; the stretch search rejects a segment
  // whose midpoint is already too far for it to beat the best distance (|Q - mid| - halfLen lower-bounds the
  // segment distance; the 1e-9 margin sits far above the computations' rounding). Rejected segments keep
  // dd = Infinity, so d and kp - which update only on dd < d, in scan order - are bit-identical.
  let smx: Float64Array | null = null; let smy: Float64Array | null = null; let shl: Float64Array | null = null;
  let sbx: Float64Array | null = null; let sby: Float64Array | null = null; let sbr: Float64Array | null = null;
  if (prep) {
    const got = prep.get(p);
    if (got) { smx = got.mx; smy = got.my; shl = got.hl; sbx = got.bx; sby = got.by; sbr = got.br; }
    else {
      smx = new Float64Array(nseg); smy = new Float64Array(nseg); shl = new Float64Array(nseg);
      for (let k = 0; k < nseg; k++) {
        const v = v0 + k; const dx = vx[v + 1] - vx[v]; const dy = vy[v + 1] - vy[v];
        smx[k] = vx[v] + dx / 2; smy[k] = vy[v] + dy / 2; shl[k] = 0.5 * (vs[v + 1] - vs[v]);
      }
      const nb = Math.ceil(nseg / REACH_BLK); sbx = new Float64Array(nb); sby = new Float64Array(nb); sbr = new Float64Array(nb);
      for (let b = 0; b < nb; b++) {
        const k0 = b * REACH_BLK; const k1 = Math.min(nseg, k0 + REACH_BLK);
        const cx = (smx[k0] + smx[k1 - 1]) / 2; const cy = (smy[k0] + smy[k1 - 1]) / 2; let r = 0;
        for (let k = k0; k < k1; k++) { const ddx = smx[k] - cx; const ddy = smy[k] - cy; const rr = Math.sqrt(ddx * ddx + ddy * ddy) + shl[k]; if (rr > r) r = rr; }
        sbx[b] = cx; sby[b] = cy; sbr[b] = r;
      }
      prep.set(p, { mx: smx, my: smy, hl: shl, bx: sbx, by: sby, br: sbr });
    }
  }
  if (nseg < 1) return 0;
  // the partner's segment holding sp
  let u = sp;
  if (closed) { u = (sp - T.cS0[p]) % T.cLen[p]; if (u < 0) u += T.cLen[p]; u += T.cS0[p]; }
  let lo = v0; let hi = v0 + nseg;
  if (u <= T.vs[lo]) hi = lo + 1; else if (u >= T.vs[hi]) lo = hi - 1;
  else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.vs[m] <= u) lo = m; else hi = m; }
  let kp = lo - v0;
  const Q = { x: 0, y: 0, tx: 0, ty: 0 };
  const segD2 = (k: number): number => {
    const v = v0 + k; const ax = vx[v]; const ay = vy[v]; const dx = vx[v + 1] - ax; const dy = vy[v + 1] - ay;
    const l2 = dx * dx + dy * dy; const t = l2 > 0 ? Math.min(1, Math.max(0, ((Q.x - ax) * dx + (Q.y - ay) * dy) / l2)) : 0;
    const ex = ax + dx * t - Q.x; const ey = ay + dy * t - Q.y; return ex * ex + ey * ey;
  };
  // K1451 26E: Q's point on chain c, walked segment by segment instead of chainAtInto's binary search per step.
  // The walk keeps the segment chainAtInto would find (vs is non-decreasing; a wrap re-searches), then applies
  // its own interpolation, so Q is bit-identical; only its unused tangent is not recomputed.
  const cv0 = T.cV0[c]; const cnv = T.cNV[c]; const cClosed = T.cClosed[c] === 1; const cLen = T.cLen[c]; const cs0 = T.cS0[c];
  const lastV = cv0 + cnv - 1;
  let kc = -1; let prevU = NaN;
  const setQ = (t: number): void => {
    let uu = s0 + dir * t;
    if (cClosed) { uu = (uu - cs0) % cLen; if (uu < 0) uu += cLen; uu += cs0; }
    if (kc < 0 || Math.abs(uu - prevU) > 2 * step) {
      let l = cv0; let hh = lastV;
      if (uu <= vs[l]) hh = l + 1; else if (uu >= vs[hh]) l = hh - 1;
      else while (hh - l > 1) { const m = (l + hh) >> 1; if (vs[m] <= uu) l = m; else hh = m; }
      kc = l;
    } else if (uu <= vs[cv0]) kc = cv0;
    else if (uu >= vs[lastV]) kc = lastV - 1;
    else { while (kc + 1 < lastV && vs[kc + 1] <= uu) kc++; while (vs[kc] > uu) kc--; }
    prevU = uu;
    const ax = vx[kc]; const ay = vy[kc]; const dx = vx[kc + 1] - ax; const dy = vy[kc + 1] - ay;
    const L = vs[kc + 1] - vs[kc];
    const tt = L > 0 ? Math.min(1, Math.max(0, (uu - vs[kc]) / L)) : 0;
    Q.x = ax + dx * tt; Q.y = ay + dy * tt;
  };
  const prev = (k: number): number => (k > 0 ? k - 1 : closed ? nseg - 1 : -1);
  const next = (k: number): number => (k + 1 < nseg ? k + 1 : closed ? 0 : -1);
  const lim = Math.min(cap, gap);
  let r = 0;
  // K1451 s3 (build time): a reach short of `from` gives the caller the same window as none, so the walk starts at
  // the first step at or past it (0 when the walk is out there; an overlap that left and came back before it counts
  // as staying), and returns 0 without walking when the limit falls short of it.
  const i0 = Math.max(1, Math.ceil(from / step - 1e-9));
  if (from > 0 && i0 * step > lim) return 0;
  for (let i = i0; ; i++) {
    const t = i * step;
    if (t > lim) return lim < cap ? gap : r;
    setQ(t);
    let d = segD2(kp);
    for (let guard = 0; guard < nseg; guard++) {
      const km = prev(kp); const kn = next(kp);
      const dm = km >= 0 ? segD2(km) : Infinity; const dn = kn >= 0 ? segD2(kn) : Infinity;
      if (dm < d && dm <= dn) { kp = km; d = dm; } else if (dn < d) { kp = kn; d = dn; } else break;
    }
    if (d > sep2) {
      // the hill climb can sit in a local minimum while the partner's nearest point jumps (a twist eye's far
      // strand, a self-crossing's own pass): before calling the step out, search the partner's whole stretch,
      // cap + sep of arc each way of its pin (the stage 1 probe's partner search). A self-crossing's stretch can
      // hold this pass itself: a kink loop shorter than it reads as overlapping throughout.
      const span = cap + sep; const ub = sp - span; const ue = sp + span;
      // the segment holding ub (wrapped on a closed chain; off = ub's frame minus the wrapped one), found once, then
      // the following segments in turn (K1451 s3: the search used to re-find each one)
      let w = ub; let off = 0;
      if (closed) { w = (ub - T.cS0[p]) % T.cLen[p]; if (w < 0) w += T.cLen[p]; w += T.cS0[p]; off = ub - w; }
      else if (w < T.vs[v0]) w = T.vs[v0];
      let a = v0; let z = v0 + nseg;
      if (w <= T.vs[a]) z = a + 1; else if (w >= T.vs[z]) a = z - 1;
      else while (z - a > 1) { const m = (a + z) >> 1; if (T.vs[m] <= w) a = m; else z = m; }
      {
        let firstSeg = true;
        let sqrtD = Math.sqrt(d);
        let kk = a - v0;
        for (let guard = 0; guard <= nseg; guard++) {
          const s0a = vs[a] + off; if (s0a >= ue) break;
          // K1502 26N: jump a whole prep block whose every segment is too far to beat d
          // (|Q - centre| - radius lower-bounds its segment distances; the margin sits far
          // above the computations' rounding, as in the per-segment prune below). A skipped
          // segment updates neither d nor kp, exactly as a pruned segment does not.
          if (sbx && sby && sbr && kk % REACH_BLK === 0 && kk + REACH_BLK <= nseg && vs[a + REACH_BLK - 1] + off < ue) {
            const b = kk / REACH_BLK; const bdx = Q.x - sbx[b]; const bdy = Q.y - sby[b];
            if (Math.sqrt(bdx * bdx + bdy * bdy) >= (sqrtD + sbr[b]) * (1 + 1e-9)) {
              firstSeg = false;
              let ended = false;
              for (let j = 0; j < REACH_BLK; j++) {
                if (a + 1 < v0 + nseg) { a++; kk++; } else if (closed) { a = v0; kk = 0; off += T.cLen[p]; } else { ended = true; break; }
              }
              guard += REACH_BLK - 1;
              if (ended) break;
              continue;
            }
          }
          let dd: number;
          if (smx && smy && shl) {
            const hl = shl[kk]; const dmx = Q.x - smx[kk]; const dmy = Q.y - smy[kk];
            if (dmx * dmx + dmy * dmy > (d + hl * (2 * sqrtD + hl)) * (1 + 1e-9)) dd = Infinity;
            else {
              const L = vs[a + 1] - vs[a];
              const ax = vx[a]; const ay = vy[a]; const dx = vx[a + 1] - ax; const dy = vy[a + 1] - ay;
              const ta = firstSeg && L > 0 ? Math.max(0, (ub - s0a) / L) : 0; const tb = L > 0 ? Math.min(1, (ue - s0a) / L) : 1;
              const l2 = dx * dx + dy * dy;
              const tt = l2 > 0 ? Math.min(tb, Math.max(ta, ((Q.x - ax) * dx + (Q.y - ay) * dy) / l2)) : 0;
              const ex = ax + dx * tt - Q.x; const ey = ay + dy * tt - Q.y; dd = ex * ex + ey * ey;
            }
          } else {
            const L = vs[a + 1] - vs[a];
            const ta = firstSeg && L > 0 ? Math.max(0, (ub - s0a) / L) : 0; const tb = L > 0 ? Math.min(1, (ue - s0a) / L) : 1;
            const ax = vx[a]; const ay = vy[a]; const dx = vx[a + 1] - ax; const dy = vy[a + 1] - ay; const l2 = dx * dx + dy * dy;
            const tt = l2 > 0 ? Math.min(tb, Math.max(ta, ((Q.x - ax) * dx + (Q.y - ay) * dy) / l2)) : 0;
            const ex = ax + dx * tt - Q.x; const ey = ay + dy * tt - Q.y; dd = ex * ex + ey * ey;
          }
          firstSeg = false;
          if (dd < d) { d = dd; kp = kk; sqrtD = Math.sqrt(d); }
          if (a + 1 < v0 + nseg) { a++; kk++; }
          else if (closed) { a = v0; kk = 0; off += T.cLen[p]; }
          else break;
        }
      }
    }    if (d > sep2) return r;
    r = t;
  }
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
// The pool path runs the same code partitioned: raw chain vertices on
// the coordinator (gfRawChain/mergeGfRaw; K1374: a slice round trip for
// them cost more than they save), arms and corners by contiguous junction ranges
// (solveGfCorners), chunk bins by contiguous chunk ranges (gfChunkBinPart),
// merged in order (mergeGfChunkBins, assembleGfTables). Corner solves share
// no state across corners: the SP/Q scratch and the arm-sample map are fresh
// per solveGfCorners call and every hint is per corner pair, so a slice's
// corners are bit-identical to the cold build's (the t1 rule: the solve's
// input bits are unchanged, only who runs them).
export interface GfArm { c: number; j: number; ei: number; sR: number; dir: number; L: number; Lcut: number; g: number; ang: number; ux: number; uy: number; uB: number; L0: number; ahead: number; home: number }
export interface GfCorner { thru: number; rv: number; cx: number; cy: number; r: number; rmax: number; eax: number; eay: number; ebx: number; eby: number; g: number; j: number; a: number; b: number; theta: number; ca: number; cb: number; sa: number; sb: number; /** K1482 s20: 1 = home membership's only, 2 = home-off's only */ ext?: number }
export interface GfRaw { cV0: Int32Array; cNV: Int32Array; vx: Float64Array; vy: Float64Array; vs: Float64Array }
export interface GfPrefix {
  h: number; W: number; aa: number; sigma: number; zt: number; amp: number; win: number; rc: number; gridK?: number; cr: number;
  nC: number; cV0: Int32Array; cNV: Int32Array; cClosed: Uint8Array; cLen: Float64Array; cS0: Float64Array;
  cPin0: Int32Array; cPinN: Int32Array; cArm0: Int32Array; cArmN: Int32Array;
  nV: number; vx: Float64Array; vy: Float64Array; vs: Float64Array; pinS: Float64Array; pinZ: Float64Array;
  /** K1502 26N: each pin's crossing partner (chain index, its pin arc); assemble walks the reach from these. */
  pinPC: Int32Array; pinPS: Float64Array;
  pinTheta: Float64Array; chainIds: Int32Array; rootsOff: Int32Array; rootsS: Float64Array; rootsJ: Int32Array;
  nA: number; aSR: Float64Array; aDir: Float64Array; aL: Float64Array; aLcut: Float64Array; aG: Int32Array;
  arms: GfArm[]; junctions: FieldScene["junctions"]; jGroup: Int32Array;
  /** K1438: the build's home switch (GfOpts.home ?? GF_HOME). */
  homeOn: boolean;
  /** K1482 s23: the build's corner retry switch (GfOpts.kRetry ?? GF_KRETRY). */
  kRetry: boolean;
  /** Pool slices carry only their junction range: junctions/jGroup/arms are
   * range-local and jBase is the range's first global junction index. */
  jBase?: number;
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

/** The arm table for junctions [jLo, jHi) (buildTables step 3's arm half):
 * same arithmetic as the cold prefix, from flattened prefix data, so a pool
 * slice builds its junctions' arms itself. A.j is global (jBase + local). */
export function buildGfArms(P: Pick<GfPrefix, "junctions" | "jGroup" | "jBase" | "chainIds" | "cClosed" | "cLen" | "cS0" | "cV0" | "cNV" | "vx" | "vy" | "vs" | "cPin0" | "cPinN" | "pinS" | "pinTheta" | "rootsOff" | "rootsS" | "rootsJ" | "h">, jLo: number, jHi: number): GfArm[] {
  const { h, cClosed, cLen, cS0 } = P;
  const jBase = P.jBase ?? 0;
  const idxOf = new Map<number, number>(); P.chainIds.forEach((id, i) => idxOf.set(id, i));
  const norm = (c: number, s: number): number => {
    if (!cClosed[c]) return s;
    let u = (s - cS0[c]) % cLen[c]; if (u < 0) u += cLen[c]; return u + cS0[c];
  };
  const rootOf = (c: number, arm: { s: number; kind: string }): { sR: number; dir: number } => {
    if (arm.kind === "end") {
      const atStart = Math.abs(arm.s) < Math.abs(arm.s - (cS0[c] + cLen[c])) || Math.abs(arm.s - cS0[c]) < 1e-9;
      return atStart ? { sR: cS0[c], dir: 1 } : { sR: cS0[c] + cLen[c], dir: -1 };
    }
    return { sR: norm(c, arm.s), dir: 0 };
  };
  const TT = { cV0: P.cV0, cNV: P.cNV, cClosed, cLen, cS0, vx: P.vx, vy: P.vy, vs: P.vs };
  const CA1 = { x: 0, y: 0, tx: 0, ty: 0 }; const CA2 = { x: 0, y: 0, tx: 0, ty: 0 };
  const rootsCache = new Map<number, { s: number; j: number }[]>();
  const rootsFor = (c: number): { s: number; j: number }[] => {
    let R = rootsCache.get(c);
    if (!R) { R = []; for (let k = P.rootsOff[c]; k < P.rootsOff[c + 1]; k++) R.push({ s: P.rootsS[k], j: P.rootsJ[k] }); rootsCache.set(c, R); }
    return R;
  };
  const pinsCache = new Map<number, { s: number; theta: number }[]>();
  const pinsFor = (c: number): { s: number; theta: number }[] => {
    let R = pinsCache.get(c);
    if (!R) { R = []; const b = P.cPin0[c]; const n = P.cPinN[c]; for (let k = 0; k < n; k++) R.push({ s: P.pinS[b + k], theta: P.pinTheta[b + k] }); pinsCache.set(c, R); }
    return R;
  };
  const armsT: GfArm[] = [];
  for (let ji = jLo; ji < jHi; ji++) {
    const J = P.junctions[ji];
    J.arms.forEach((arm, ei) => {
      const c = idxOf.get(arm.chain); if (c === undefined) return;
      const r = rootOf(c, arm); const sR = r.sR; const dir = r.dir !== 0 ? r.dir : arm.dir;
      const len = cLen[c];
      const delta = (s: number): number => { let d = (s - sR) * dir; if (cClosed[c]) d = ((d % len) + len) % len; return d; };
      let L = cClosed[c] ? len : dir > 0 ? cS0[c] + len - sR : sR - cS0[c];
      for (const q of rootsFor(c)) { const d = delta(q.s); if (d > 1e-9 && d < L) L = d; }
      let Lcut = Infinity; let uB = Infinity; let ahead = Infinity;
      for (const x of pinsFor(c)) {
        const d = delta(x.s);
        if (cClosed[c] || d < -1e-12) uB = Math.min(uB, cClosed[c] ? len - d : -d);
        if (d >= 0 && d < ahead) ahead = d;
        if (d < -1e-12) continue;
        const t = Math.tan(x.theta / 2); const reach = t > 1e-12 ? h / t : Infinity;
        const cc = d - reach - h; if (cc < Lcut) Lcut = cc;
      }
      const sB = arm.kind === "end" ? norm(c, arm.s) : sR;
      chainAtInto(TT, c, sB, CA1); chainAtInto(TT, c, cClosed[c] ? norm(c, sB + dir * 2 * h) : Math.max(cS0[c], Math.min(cS0[c] + len, sB + dir * 2 * h)), CA2); const a0 = CA1; const a1 = CA2;
      armsT.push({ c, j: jBase + ji, ei, sR, dir, L0: L, L: Math.max(0, Math.min(L, Lcut)), Lcut, g: -1, ang: Math.atan2(a1.y - a0.y, a1.x - a0.x), ux: (a1.x - a0.x) / (Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1), uy: (a1.y - a0.y) / (Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1), uB, ahead, home: 0 });
    });
  }
  const byJ = new Map<number, GfArm[]>();
  for (const A of armsT) { const Gp = byJ.get(A.j); if (Gp) Gp.push(A); else byJ.set(A.j, [A]); }
  for (const Gp of byJ.values()) Gp.sort((u, v) => u.ang - v.ang);
  for (const A of armsT) {
    if (!(A.uB < Infinity)) continue;
    const sib = byJ.get(A.j)!; const n = sib.length; const at = sib.indexOf(A);
    let gMax = 0;
    for (const [a, b] of [[sib[(at + n - 1) % n], A], [A, sib[(at + 1) % n]]]) {
      if (a === b) continue;
      const xa = P.junctions[A.j - jBase].arms[a.ei]; const xb = P.junctions[A.j - jBase].arms[b.ei];
      if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      let th = b.ang - a.ang; th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th < Math.PI) gMax = Math.max(gMax, Math.tan((Math.PI - th) / 4));
    }
    const k = gMax > 0 ? Math.min(4, Math.max(1, 1 / gMax)) : 4;
    const cc = k * A.uB; if (cc < A.Lcut) A.Lcut = cc;
    A.L = Math.max(0, Math.min(A.L0, A.Lcut));
  }
  for (const A of armsT) A.g = P.jGroup[A.j - jBase];
  // K1438: the home extent (K1435 tgr): a capped arm keeps its junction's membership to the crossing that cut
  // it, at most 4h; eval.ts fades it out by depth. Uses the final L / Lcut, so it follows the uB cap above.
  for (const A of armsT) A.home = A.Lcut === Infinity ? A.L : Math.max(A.L, Math.min(A.ahead, 4 * h));
  return armsT;
}

/** The arm arrays from arms in junction order (stable sort by chain, as
 * the cold prefix's in-place sort gives). */
export function gfArmTable(nC: number, armsInJunctionOrder: GfArm[]): { nA: number; aSR: Float64Array; aDir: Float64Array; aL: Float64Array; aLcut: Float64Array; aG: Int32Array; cArm0: Int32Array; cArmN: Int32Array; arms: GfArm[] } {
  const armsT = armsInJunctionOrder.slice();
  armsT.sort((u, v) => u.c - v.c);
  const nA = armsT.length;
  const aSR = new Float64Array(nA); const aDir = new Float64Array(nA); const aL = new Float64Array(nA); const aLcut = new Float64Array(nA); const aG = new Int32Array(nA);
  const cArm0 = new Int32Array(nC); const cArmN = new Int32Array(nC);
  armsT.forEach((A, i) => { aSR[i] = A.sR; aDir[i] = A.dir; aL[i] = A.L; aLcut[i] = A.Lcut; aG[i] = A.g; if (cArmN[A.c] === 0) cArm0[A.c] = i; cArmN[A.c]++; });
  return { nA, aSR, aDir, aL, aLcut, aG, cArm0, cArmN, arms: armsT };
}

export function buildGfPrefix(scene: FieldScene, opts: GfOpts, rawMerged?: GfRaw, skipArms = false): GfPrefix {
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
  const pinsOf: { s: number; z: number; theta: number; pc: number; ps: number }[][] = scene.chains.map(() => []);
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
    pinsOf[ia].push({ s: sa, z: x.over === "a" ? amp : -amp, theta, pc: ib, ps: sb });
    pinsOf[ib].push({ s: sb, z: x.over === "b" ? amp : -amp, theta, pc: ia, ps: sa });
  }
  let nPin = 0; for (const p of pinsOf) { p.sort((u, v) => u.s - v.s); nPin += p.length; }
  const pinS = new Float64Array(nPin); const pinZ = new Float64Array(nPin); const pinTheta = new Float64Array(nPin); const cPin0 = new Int32Array(nC); const cPinN = new Int32Array(nC);
  const pinPC = new Int32Array(nPin); const pinPS = new Float64Array(nPin);
  { let q = 0; pinsOf.forEach((P, c) => { cPin0[c] = q; cPinN[c] = P.length; for (const p of P) { pinS[q] = p.s; pinZ[q] = p.z; pinTheta[q] = p.theta; pinPC[q] = p.pc; pinPS[q] = p.ps; q++; } }); }
  // K1451: each pin's key window per side, from the reach of its crossing's overlap. K1502 (26L):
  // baked with home off too (home off kept win, and past a shallow crossing both hats read 0, so the under
  // surface buried the over edge: K1477). The unclipped stray rise (16 -> 231, K1451 s2) is held by the
  // assemble clip below, which now runs in both modes; GF_NOCLIP=1 keeps the raw windows for probes.
  // K1502 26N: the reach walk itself runs in assembleGfTables, where the arm clip distances
  // are known on every path (cold, pooled, the worker's), so a side the clip cuts to win is
  // never walked and no walk runs past its clip distance. The prefix only stores partners.
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
  const rootsOff = new Int32Array(nC + 1); let rootN = 0; for (let c = 0; c < nC; c++) { rootsOff[c] = rootN; rootN += roots[c].length; } rootsOff[nC] = rootN;
  const rootsS = new Float64Array(rootN); const rootsJ = new Int32Array(rootN);
  { let k = 0; for (const R of roots) for (const q of R) { rootsS[k] = q.s; rootsJ[k] = q.j; k++; } }
  const jGroupA = new Int32Array(nJ); for (let ji = 0; ji < nJ; ji++) jGroupA[ji] = find(ji);
  const chainIds = new Int32Array(nC); scene.chains.forEach((c, i) => { chainIds[i] = c.id; });
  const armsBuilt: GfArm[] = skipArms ? [] : buildGfArms({ junctions: scene.junctions, jGroup: jGroupA, chainIds, cClosed, cLen, cS0, cV0, cNV, vx, vy, vs, cPin0, cPinN, pinS, pinTheta, rootsOff, rootsS, rootsJ, h }, 0, nJ);
  const armTab = gfArmTable(nC, armsBuilt);
  const { nA, aSR, aDir, aL, aLcut, aG, cArm0, cArmN } = armTab;
  const armsT = armTab.arms;
  const t3 = now();
  const jGroup = new Int32Array(nJ); for (let ji = 0; ji < nJ; ji++) jGroup[ji] = find(ji);
  return {
    h, W, aa, sigma, zt, amp, win, rc, gridK: opts.gridK, cr: look.cuspRadius ?? 3,
    nC, cV0, cNV, cClosed, cLen, cS0, cPin0, cPinN, cArm0, cArmN,
    nV, vx, vy, vs, pinS, pinZ, pinPC, pinPS, nA, aSR, aDir, aL, aLcut, aG,
    arms: armsT, junctions: scene.junctions, jGroup, pinTheta, chainIds, rootsOff, rootsS, rootsJ,
    homeOn: opts.home ?? GF_HOME, kRetry: opts.kRetry ?? GF_KRETRY,
    ms: { vtx: t1 - t0, pins: t2 - t1, arms: t3 - t2 },
  };
}

/** Corners for junctions [jLo, jHi) of the prefix, in enumeration order:
 * the cold build's corner loop over that range, with fresh scratch. */
export function solveGfCorners(P: GfPrefix, jLo: number, jHi: number): GfCorner[] {
  type ArmT = GfArm;
  const { h, W, aa, cr, cV0, cNV, cClosed, cLen, cS0, vx, vy, vs } = P;
  const armsT = P.arms; const junctions = P.junctions; const jGroup = P.jGroup; const jBase = P.jBase ?? 0;
  const norm = (c: number, s: number): number => {
    if (!cClosed[c]) return s;
    let u = (s - cS0[c]) % cLen[c]; if (u < 0) u += cLen[c]; return u + cS0[c];
  };
  // K1407 23C: each chain as form B's Poly (from the built vertex table, extension included), for the
  // exact V solve and the closed-form growth below. A closed chain's repeated first vertex is dropped.
  const polyCache = new Map<number, { p: Poly; tx: Float64Array; ty: Float64Array } | null>();
  const polyOf = (c: number): { p: Poly; tx: Float64Array; ty: Float64Array } | null => {
    let r = polyCache.get(c);
    if (r !== undefined) return r;
    const v0 = cV0[c]; const nv = cNV[c]; const closed = cClosed[c] === 1;
    const n = closed ? nv - 1 : nv;
    if (n < 2) { polyCache.set(c, null); return null; }
    const x = new Float64Array(n); const y = new Float64Array(n); const s = new Float64Array(n);
    for (let k = 0; k < n; k++) { x[k] = vx[v0 + k]; y[k] = vy[v0 + k]; s[k] = vs[v0 + k]; }
    const nseg = closed ? n : n - 1;
    const segLen = new Float64Array(Math.max(1, nseg));
    for (let k = 0; k < nseg; k++) { const b = k + 1 < n ? k + 1 : 0; segLen[k] = Math.sqrt((x[b] - x[k]) ** 2 + (y[b] - y[k]) ** 2); }
    const p: Poly = { id: c, n, x, y, s, z: new Float64Array(n), segLen, closed, nseg, len: closed ? vs[v0 + nv - 1] - s[0] : s[n - 1] - s[0], s0: s[0] };
    const t = polyTangents(p);
    r = { p, tx: t.tx, ty: t.ty };
    polyCache.set(c, r);
    return r;
  };
  const armWin = (A: ArmT): [number, number] => (A.dir > 0 ? [A.sR, A.sR + A.L] : [A.sR - A.L, A.sR]);
  // K1482 s20: an arm a crossing cut short (Lcut < L0), extended to Lcut + GF_KEXT h (within L0, and within its
  // home extent with GF_KCAP=home); a fresh object, so its samples (smp) are its own. Uncut: A itself.
  const extArm = (A: ArmT): ArmT => {
    if (!(A.Lcut < A.L0)) return A;
    const cap = GF_KCAP === "home" ? Math.min(A.L0, A.home) : A.L0;
    const L = Math.min(cap, Math.max(A.L, A.Lcut + GF_KEXT * h));
    return L > A.L ? { ...A, L } : A;
  };
  const armDistOf = (A: ArmT, s: number): number => {
    let d = (s - A.sR) * A.dir;
    if (cClosed[A.c]) d = ((d % cLen[A.c]) + cLen[A.c]) % cLen[A.c];
    return d;
  };
  const CF = new CornerGrowth();
  // Form B's solveEq at rho = h: Newton on the true feet (footInWindow over each arm's window).
  const solveV = (J: { c: [number, number] | number[] }, A: ArmT, B: ArmT, pa: Poly, pb: Poly, th: number): { x: number; y: number; fa: Foot; fb: Foot } | null => {
    let bx = A.ux + B.ux; let by = A.uy + B.uy; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const sn = Math.sin(th / 2);
    let x = J.c[0] + (bx * h) / sn; let y = J.c[1] + (by * h) / sn;
    const wa = armWin(A); const wb = armWin(B);
    for (let it = 0; it < 60; it++) {
      const fa = footInWindow(pa, x, y, wa[0], wa[1]);
      const fb = footInWindow(pb, x, y, wb[0], wb[1]);
      const Fa = fa.d - h; const Fb = fb.d - h;
      if (Math.abs(Fa) < 1e-13 * Math.max(1, h) && Math.abs(Fb) < 1e-13 * Math.max(1, h)) return { x, y, fa, fb };
      if (!(fa.d > 1e-12 && fb.d > 1e-12)) return null;
      const gax = (x - fa.x) / fa.d; const gay = (y - fa.y) / fa.d; const gbx = (x - fb.x) / fb.d; const gby = (y - fb.y) / fb.d;
      const det = gax * gby - gay * gbx;
      if (Math.abs(det) < 1e-12) return null;
      let dx = (-Fa * gby + Fb * gay) / det; let dy = (-Fb * gax + Fa * gbx) / det; const dl = Math.hypot(dx, dy);
      if (dl > h) { dx *= h / dl; dy *= h / dl; }
      x += dx; y += dy;
      if (it === 59) {
        const ga = footInWindow(pa, x, y, wa[0], wa[1]); const gb = footInWindow(pb, x, y, wb[0], wb[1]);
        return Math.abs(ga.d - h) < 1e-9 * h && Math.abs(gb.d - h) < 1e-9 * h ? { x, y, fa: ga, fb: gb } : null;
      }
    }
    return null;
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
  for (const A of armsT) sibs[A.j - jBase].push(A);
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
      const A0 = S[i]; const B0 = S[(i + 1) % n];
      let th = B0.ang - A0.ang; th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const xa = J.arms[A0.ei]; const xb = J.arms[B0.ei];
      const thru = xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6 ? 1 : 0;
      let st = styles[A0.ei]?.style; if ((A0.ei + 1) % ne !== B0.ei && (B0.ei + 1) % ne === A0.ei) st = styles[B0.ei]?.style;
      if (st === "sharp") continue;
      // K1482 s20: pass 1 retries a non-through pair that pass 0 gave no fillet, on arms a crossing cut short
      // extended past the cut (extArm). Its corner is home membership's only (ext 1): the cut arm's pieces join
      // the group out to aHome there, so the outlines meet in a V or a notch the retry rounds. Pass 0's corner
      // stays home-off's (ext 2).
      const got: (GfCorner | null)[] = [null, null];
      for (let pass = 0; pass < 2; pass++) {
      let A = A0; let B = B0;
      if (pass === 1) {
        const c0 = got[0];
        if (thru || !P.kRetry || !(GF_KEXT > 0) || (c0 && c0.r > 1e-9)) break; // K1482 s23: only with the switch
        A = extArm(A0); B = extArm(B0);
        if (A === A0 && B === B0) break;
      }
      if (!(A.L > 1e-9 && B.L > 1e-9)) continue;
      const t2 = Math.tan(th / 2);
      // form B: V's (tracked) feet inside both arms, checked below
      const r0 = (cr / 3) * Math.min(2 * h, 1.5 * h * t2);
      if (!(r0 > 1e-9)) continue;
      const rb = Math.max(rootBand * h * rootTip(th), 1e-9 * h);
      const hA = { k: -1 }; const hB = { k: -1 };
      const snH = Math.sin(th / 2); const csH = Math.cos(th / 2);
      // K1407 23C: V exactly as form B's solveCorner (solveV above): a foot at a root/end, no solution, or
      // V outside the arms' chord wedge rejects the corner (the tracked/sample feet kept such corners, e.g.
      // a through pair whose true feet both sit at the root: stray thru arcs at def j85).
      const PCa = polyOf(A.c); const PCb = polyOf(B.c);
      if (!PCa || !PCb) continue;
      const vsol = solveV(J, A, B, PCa.p, PCb.p, th);
      if (!vsol) continue;
      const dVa = armDistOf(A, vsol.fa.s); const dVb = armDistOf(B, vsol.fb.s);
      const tolV = 1e-9 * h;
      if (!(dVa > tolV && dVa < A.L - tolV && dVb > tolV && dVb < B.L - tolV)) continue;
      {
        const crA = A.ux * (vsol.y - J.c[1]) - A.uy * (vsol.x - J.c[0]); const crB = B.ux * (vsol.y - J.c[1]) - B.uy * (vsol.x - J.c[0]);
        const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
        if (!(crA * sgn > 0 && crB * sgn < 0)) continue;
      }
      QVB.x = vsol.x; QVB.y = vsol.y; QVB.ua = dVa; QVB.ub = dVb;
      QVB.fax = vsol.fa.x; QVB.fay = vsol.fa.y; QVB.fbx = vsol.fb.x; QVB.fby = vsol.fb.y;
      QVB.nax = (vsol.x - vsol.fa.x) / (vsol.fa.d || 1); QVB.nay = (vsol.y - vsol.fa.y) / (vsol.fa.d || 1);
      QVB.nbx = (vsol.x - vsol.fb.x) / (vsol.fb.d || 1); QVB.nby = (vsol.y - vsol.fb.y) / (vsol.fb.d || 1);
      QVB.sa = vsol.fa.s; QVB.sb = vsol.fb.s;
      const V: Q = QVB;
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
      const dN = r0 / NODES; let r = 0; let pua = V.ua; let pub = V.ub; let qCF: Q | null = null; let cfZero = false;
      // The growth's integral is zero when w(V) is: skip its piece building then (its r is 0 either way).
      if (r0 > 1e-9 && wOf(V) <= 0) cfZero = true;
      // K1407 23C: form B's closed-form growth (CornerGrowth) on the exact V, with wOf read at its q/feet
      // (ua from the feet's u domain, as form B's wOf reads (fa.u - sR) * dir). This replaces the tracked
      // integral's r/q where it can start; its branch, radii and tangent feet are form B's own.
      if (r0 > 1e-9 && !cfZero) {
        const cfArm = (Aarm: ArmT, foot: Foot, dV: number): CfArmIn => {
          const pc = polyOf(Aarm.c)!; const sg = segOfS(pc.p, foot.s);
          const win = armWin(Aarm);
          return { p: pc.p, tx: pc.tx, ty: pc.ty, lo: win[0], hi: win[1], foot: { d: foot.d, x: foot.x, y: foot.y, s: foot.s, k: sg.k, t: sg.t }, u0: Aarm.sR + Aarm.dir * dV };
        };
        const faV: Foot = { d: vsol.fa.d, x: vsol.fa.x, y: vsol.fa.y, s: vsol.fa.s, k: vsol.fa.k, t: vsol.fa.t };
        const fbV: Foot = { d: vsol.fb.d, x: vsol.fb.x, y: vsol.fb.y, s: vsol.fb.s, k: vsol.fb.k, t: vsol.fb.t };
        const QCF: Q = { x: 0, y: 0, ua: 0, ub: 0, nax: 0, nay: 0, nbx: 0, nby: 0, sa: 0, sb: 0, fax: 0, fay: 0, fbx: 0, fby: 0 };
        const wMemo = new Map<number, number>();
        const rr = CF.grow(h, V.x, V.y, r0, denV, cfArm(A, faV, dVa), cfArm(B, fbV, dVb), () => {
          const got = wMemo.get(CF.rhoCur);
          if (got !== undefined) return got;
          QCF.x = CF.qx; QCF.y = CF.qy;
          QCF.ua = (CF.fa.u - A.sR) * A.dir; QCF.ub = (CF.fb.u - B.sR) * B.dir;
          QCF.fax = CF.fa.x; QCF.fay = CF.fa.y; QCF.fbx = CF.fb.x; QCF.fby = CF.fb.y;
          const wv = wOf(QCF);
          wMemo.set(CF.rhoCur, wv);
          return wv;
        });
        if (rr >= 0) {
          r = rr;
          QPB.x = CF.qx; QPB.y = CF.qy; QPB.ua = (CF.fa.u - A.sR) * A.dir; QPB.ub = (CF.fb.u - B.sR) * B.dir;
          QPB.fax = CF.fa.x; QPB.fay = CF.fa.y; QPB.fbx = CF.fb.x; QPB.fby = CF.fb.y;
          QPB.nax = (CF.qx - CF.fa.x) / (CF.fa.d || 1); QPB.nay = (CF.qy - CF.fa.y) / (CF.fa.d || 1);
          QPB.nbx = (CF.qx - CF.fb.x) / (CF.fb.d || 1); QPB.nby = (CF.qy - CF.fb.y) / (CF.fb.d || 1);
          QPB.sa = CF.fa.s; QPB.sb = CF.fb.s;
          qCF = QPB;
        }
      }
      if (!qCF && !cfZero) {
        let sPrev = wOf(V);
        for (let k = 1; k <= NODES && sPrev > 0; k++) {
          const du = dN / t2;
          trackInto(QPB, J, A, B, Math.min(A.L, pua + du), Math.min(B.L, pub + du), h + k * dN, TRACK, 4 * du, hA, hB, snH, csH); const pk = QPB;
          const sK = Math.min(sPrev, wOf(pk)); const seg = 0.5 * (sPrev + sK) * dN;
          if (sK < sPrev && sK === 0) { r += seg; break; }
          r += seg; sPrev = sK; pua = pk.ua; pub = pk.ub;
        }
      }
      if (!(r > 1e-9)) { // K1407 23A: form B keeps a null corner (r = 0): its tangent terms ink a disc at V.
        // A through pair's null is not kept: the reference's fillet pick requires r > 0, so a null through
        // corner draws nothing (its eye band would ink the open eye).
        if (!thru) got[pass] = { thru, rv: 0, cx: V.x, cy: V.y, r: 0, rmax: (2 * aa) / Math.max(0.1, Math.sin(th / 2)), eax: -V.nax, eay: -V.nay, ebx: -V.nbx, eby: -V.nby, g, j: jBase + ji, a: A.ei, b: B.ei, theta: th, ca: A.c, cb: B.c, sa: V.sa, sb: V.sb };
        continue;
      }
      if (thru && r < 0.16 * h) continue; // K1407 23A: a through radius this small is the integral's noise (form B's reads 0-0.05h there); its pick passes, so the eye stays open
      let q: Q;
      if (qCF) q = qCF;
      else { trackInto(QQB, J, A, B, pua, pub, h + r, TRACK + 1, 4 * dN / t2, hA, hB, snH, csH); q = QQB; }
      const rV = Math.hypot(V.x - q.x, V.y - q.y);
      const rmax = rV + (2 * aa) / Math.max(0.1, Math.sin(th / 2));
      got[pass] = { thru, rv: rV, cx: q.x, cy: q.y, r, rmax, eax: -q.nax, eay: -q.nay, ebx: -q.nbx, eby: -q.nby, g, j: jBase + ji, a: A.ei, b: B.ei, theta: th, ca: A.c, cb: B.c, sa: q.sa, sb: q.sb };
      }
      const c0 = got[0]; const c1 = got[1];
      if (c1 && c1.r > 1e-9 && c1.r >= GF_KRMIN * h && c1.r <= GF_KRMAX * h && c1.r * (1 / Math.max(1e-6, Math.sin(c1.theta / 2)) - 1) <= GF_KSAG * h) { c1.ext = 1; K.push(c1); if (c0) { c0.ext = 2; K.push(c0); } }
      else if (c0) K.push(c0);
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

const GF_NOCLIP: boolean = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_NOCLIP === "1";

/** K1451 s3: pinWL / pinWR cut at the nearest arm interval [aSR, aSR + aDir max(aL, aHome)] on the pin's chain
 * each way (win both ways inside one), never below win.
 * K1451 s4: an OVER pin (pinZ > 0) is cut at the arm's own interval [aSR, aSR + aDir aL] instead, so its window may
 * run into a home tail (aL..aHome); inside a whole home interval it still takes win. Spots 5 and 7 (muse_hash
 * 21.86,18.64 and 16.17,18.39): the over pin 0.09-0.46 short of a home tail lost its long window to the s3 cut, and
 * the tie smear beside the over thread (master's grey wedge) came back. An UNDER pin keeps the s3 cut: run into a
 * home tail, its key dives where member() (win depth) keeps the piece home, a hard edge (muse_hash 12.79,10.46). */
/** K1502 26N: each pin's distance to the nearest arm interval on its chain, per side:
 * the clipPinWindows cut, factored out so assemble's reach walk can skip and cap by it
 * (a pin inside an interval reads 0 on both sides). Same arithmetic, same order. */
function pinClipDistances(P: Pick<GfPrefix, "nC" | "cClosed" | "cLen" | "cPin0" | "cPinN" | "pinS" | "pinZ" | "cArm0" | "cArmN" | "aSR" | "aDir" | "aL">, aHome: Float64Array): { dL: Float64Array; dR: Float64Array } {
  const { nC, cClosed, cLen, cPin0, cPinN, pinS, pinZ, cArm0, cArmN, aSR, aDir, aL } = P;
  const dL = new Float64Array(pinS.length).fill(Infinity); const dR = new Float64Array(pinS.length).fill(Infinity);
  for (let c = 0; c < nC; c++) {
    const a0 = cArm0[c]; const an = cArmN[c]; if (an === 0) continue;
    const closed = cClosed[c] === 1; const len = cLen[c];
    const md = (v: number): number => ((v % len) + len) % len;
    for (let q = cPin0[c]; q < cPin0[c] + cPinN[c]; q++) {
      const s = pinS[q]; const over = pinZ[q] > 0; let ddR = Infinity; let ddL = Infinity;
      for (let i = a0; i < a0 + an; i++) {
        const ext = Math.max(aL[i], aHome[i]); if (!(ext > 0)) continue;
        const e2 = aSR[i] + aDir[i] * ext; let lo = Math.min(aSR[i], e2); let hi = Math.max(aSR[i], e2);
        if (closed ? md(s - lo) <= hi - lo : s >= lo && s <= hi) { ddR = 0; ddL = 0; break; }
        if (over) { if (!(aL[i] > 0)) continue; const e3 = aSR[i] + aDir[i] * aL[i]; lo = Math.min(aSR[i], e3); hi = Math.max(aSR[i], e3); }
        if (closed) { ddR = Math.min(ddR, md(lo - s)); ddL = Math.min(ddL, md(s - hi)); }
        else if (lo > s) ddR = Math.min(ddR, lo - s); else ddL = Math.min(ddL, s - hi);
      }
      dR[q] = ddR; dL[q] = ddL;
    }
  }
  return { dL, dR };
}
function clipPinWindows(win: number, pinWL: Float64Array, pinWR: Float64Array, dist: { dL: Float64Array; dR: Float64Array }): [Float64Array, Float64Array] {
  const wL = Float64Array.from(pinWL); const wR = Float64Array.from(pinWR);
  for (let q = 0; q < pinWL.length; q++) {
    if (!(wL[q] > win) && !(wR[q] > win)) continue;
    wR[q] = Math.max(win, Math.min(wR[q], dist.dR[q])); wL[q] = Math.max(win, Math.min(wL[q], dist.dL[q]));
  }
  return [wL, wR];
}
/** The tables from a prefix and its corners (all of them, in order).
 * With a merged chunk-bin slice set, bins take it; else bins run whole. */
export function assembleGfTables(P: GfPrefix, K: GfCorner[], chunk: { meta: GfChunkMeta; bins: { cellCh0: Int32Array; cellChN: Int32Array; cellChList: Int32Array } } | null, ms: { vtx: number; pins: number; arms: number; corners: number }, t0: number): GfTables {
  const { h, W, aa, sigma, zt, amp, win, rc, nC, cV0, cNV, cClosed, cLen, cS0, cPin0, cPinN, cArm0, cArmN, nV, vx, vy, vs, pinS, pinZ, pinPC, pinPS, nA, aSR, aDir, aL, aLcut, aG } = P;
  // K1482 s20: home membership's retry corners (ext 1) go after every other corner, so corners 0..nOff-1 are
  // home-off's, in the solve's order, and its tables are the ones before s20; ext 2 corners are home-off's only.
  if (K.some((q) => q.ext === 1)) K = K.filter((q) => q.ext !== 1).concat(K.filter((q) => q.ext === 1));
  const nK = K.length;
  let nOff = nK; while (nOff > 0 && K[nOff - 1].ext === 1) nOff--;
  const kExt = new Uint8Array(nK); K.forEach((q, i) => { kExt[i] = q.ext ?? 0; });
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
  // K1362 t1: each item's cell range computed once (same floors), reused by the count and fill passes.
  const rngK = new Int32Array(4 * nK);
  for (let q = 0; q < nK; q++) {
    const R = kRmax[q] + W + 3 * aa; const kx = kCx[q]; const ky = kCy[q];
    const a = Math.max(0, Math.floor((kx - R - gx0) / G)); const b = Math.max(0, Math.floor((ky - R - gy0) / G));
    const c = Math.min(gW - 1, Math.floor((kx + R - gx0) / G)); const d = Math.min(gH - 1, Math.floor((ky + R - gy0) / G));
    rngK[4 * q] = a; rngK[4 * q + 1] = b; rngK[4 * q + 2] = c; rngK[4 * q + 3] = d;
  }
  // K1482 s20: the cell lists of one view: home-off's (corners below nOff) or home membership's (every corner but
  // ext 2). Without retry corners the two are one.
  const cellLists = (use: (q: number) => boolean): { cellK0: Int32Array; cellKN: Int32Array; cellKList: Int32Array } => {
    const cellKN = new Int32Array(nCell);
    for (let q = 0; q < nK; q++) {
      if (!use(q)) continue;
      const a = rngK[4 * q]; const b = rngK[4 * q + 1]; const c = rngK[4 * q + 2]; const d = rngK[4 * q + 3];
      for (let y = b; y <= d; y++) { let i = y * gW + a; for (let x = a; x <= c; x++) cellKN[i++]++; }
    }
    const cellK0 = new Int32Array(nCell);
    let sK = 0;
    for (let i = 0; i < nCell; i++) { cellK0[i] = sK; sK += cellKN[i]; }
    const cellKList = new Int32Array(sK);
    const fK = new Int32Array(nCell);
    for (let q = 0; q < nK; q++) { if (!use(q)) continue; const a = rngK[4 * q]; const b = rngK[4 * q + 1]; const c = rngK[4 * q + 2]; const d = rngK[4 * q + 3]; for (let y = b; y <= d; y++) { const i0 = y * gW; for (let x = a; x <= c; x++) { const i = i0 + x; cellKList[cellK0[i] + fK[i]++] = q; } } }
    return { cellK0, cellKN, cellKList };
  };
  let cellCh0: Int32Array; let cellChN: Int32Array; let cellChList: Int32Array;
  if (chunk) {
    ({ cellCh0, cellChN, cellChList } = chunk.bins);
  } else {
    const merged = mergeGfChunkBins([gfChunkBinPart(P, meta, 0, nCh)], nCell);
    ({ cellCh0, cellChN, cellChList } = merged);
  }
  const vOff = cellLists((q) => q < nOff);
  const vOffP = prunedCornerLists(kCx, kCy, kR, kRmax, kThru, kRV, W, aa, gx0, gy0, G, gW, gH, vOff.cellK0, vOff.cellKN, vOff.cellKList);
  let vOn = vOff; let vOnP = vOffP;
  if (nOff < nK || kExt.some((e) => e === 2)) {
    vOn = cellLists((q) => kExt[q] !== 2);
    vOnP = prunedCornerLists(kCx, kCy, kR, kRmax, kThru, kRV, W, aa, gx0, gy0, G, gW, gH, vOn.cellK0, vOn.cellKN, vOn.cellKList);
  }
  const t5 = now();
  const homeOn = P.homeOn === true;
  const [vB, vBP, nB, vA, vAP, nA2] = homeOn ? [vOn, vOnP, nK, vOff, vOffP, nOff] : [vOff, vOffP, nOff, vOn, vOnP, nK];
  const { cellK0, cellKN, cellKList } = vB; const cellKPList = vBP;
  const t6 = now();
  // K1438: from the arms themselves (P.arms is armTab.arms on every path: cold, pooled, the worker's), so no
  // caller copies a new field.
  const aHome = new Float64Array(nA); for (let i = 0; i < nA; i++) aHome[i] = P.arms[i].home;
  // K1451: each pin's key window per side, from the reach of its crossing's overlap (pinReach; in
  // the prefix until K1502 26N, which moved it here where the arm clip distances are known on
  // every path - cold, pooled, the worker's). A side the clip below cuts to win (its distance
  // <= win, a pin inside an arm included) is never walked, and no walk runs past its clip
  // distance: the cap sits one walk step past the clip distance, so it never hides a reach the clip
  // would keep (GF_REACH_K is 1.0, so d / GF_REACH_K is d). Walked values are then cut by the
  // same distances, so the baked windows are bit-identical to walking every side in full.
  // GF_NOCLIP=1 keeps the raw windows for probes: every side walked, no clip.
  const tw0 = now();
  const pinWL = new Float64Array(pinS.length).fill(win); const pinWR = new Float64Array(pinS.length).fill(win);
  const clipDist = GF_NOCLIP ? null : pinClipDistances(P, aHome);
  {
    const RW = { cV0, cNV, cClosed, cLen, cS0, vx, vy, vs };
    const reachPrep = new Map<number, ReachPrep>();
    const step = GF_REACH_STEP * h; const from = win / GF_REACH_K;
    const capL = (d: number): number => d / GF_REACH_K + step;
    for (let c = 0; c < nC; c++) {
      const n = cPinN[c]; const b = cPin0[c];
      for (let i = 0; i < n; i++) {
        const q = b + i; const s = pinS[q];
        // the arc to the next pin each way (a window past it is cut at the pin gap anyway); open chain: no limit
        let gL = Infinity; let gR = Infinity;
        if (cClosed[c]) { gL = n > 1 ? s - pinS[b + ((i + n - 1) % n)] : cLen[c]; if (gL <= 0) gL += cLen[c]; gR = n > 1 ? pinS[b + ((i + 1) % n)] - s : cLen[c]; if (gR <= 0) gR += cLen[c]; }
        else { if (i > 0) gL = s - pinS[b + i - 1]; if (i + 1 < n) gR = pinS[b + i + 1] - s; }
        const dL = clipDist ? clipDist.dL[q] : Infinity; const dR = clipDist ? clipDist.dR[q] : Infinity;
        if (dL > win) pinWL[q] = Math.max(win, GF_REACH_K * pinReach(RW, c, s, -1, pinPC[q], pinPS[q], h, Math.min(gL, capL(dL)), from, reachPrep));
        if (dR > win) pinWR[q] = Math.max(win, GF_REACH_K * pinReach(RW, c, s, 1, pinPC[q], pinPS[q], h, Math.min(gR, capL(dR)), from, reachPrep));
      }
    }
  }
  const walkMs = now() - tw0;
  // K1451 s3: a pin's reach window stops where a junction's arm or home begins on its chain (and stays win when the
  // pin lies inside one), so the key depth equals member()'s depth wherever membership splits ribbons into blocks.
  // K1502: the clip runs with home off too, on the same aHome extents, so the home-off keys stop at the same arms.
  const [wL2, wR2] = clipDist ? clipPinWindows(win, pinWL, pinWR, clipDist) : [pinWL, pinWR];

  return {
    h, W, aa, sigma, zt, amp, win, rc, nC, cV0, cNV, cClosed, cLen, cS0, cPin0, cPinN, cArm0, cArmN,
    nV, vx, vy, vs, pinS, pinZ, pinWL: wL2, pinWR: wR2, nA, aSR, aDir, aL, aLcut, aG, aHome, homeOn,
    nK: nB, kCx, kCy, kR, kRmax, kThru, kRV, kEax, kEay, kEbx, kEby, kG, kJ, kA, kB, kTheta, kCa, kCb, kSa, kSb, kZa, kZb, kTax, kTay, kTbx, kTby,
    nCh, chV0, chN, chC, chBox, gx0, gy0, G, gW, gH, cellCh0, cellChN, cellChList, cellK0, cellKN, cellKList, cellKPList,
    // K1482 s23: with the retry off (the default) the tables are master's, field for field
    ...(P.kRetry ? { kExt, nKAlt: nA2, cellK0Alt: vA.cellK0, cellKNAlt: vA.cellKN, cellKListAlt: vA.cellKList, cellKPListAlt: vAP } : {}),
    ms: { vtx: ms.vtx, pins: ms.pins + walkMs, arms: ms.arms, corners: ms.corners, bins: t5 - t4, kp: t6 - t5, total: t6 - t0 },
  };
}

/**
 * K1362 s14: GfTables.cellKPList. A corner is dropped from a cell's thru list only when its reach test fails at
 * every point of the cell, and from its keep list only when the keep loop's ring or reach test does; the cell is
 * padded by 1% of G, far above float32's error in a pixel's world position and in its cell pick, so the scan's thru
 * search and keep loop over these lists see the same corners pass, in the same order, as over cellKList: thruK,
 * thruQ, tj, kk and the overflow are the same. The yielded search (a sector test, no distance) keeps cellKList.
 */
function prunedCornerLists(kCx: Float64Array, kCy: Float64Array, kR: Float64Array, kRmax: Float64Array, kThru: Uint8Array, kRV: Float64Array, W: number, aa: number,
  gx0: number, gy0: number, G: number, gW: number, gH: number, cellK0: Int32Array, cellKN: Int32Array, cellKList: Int32Array): Int32Array {
  const out = new Int32Array(4 * cellKList.length).fill(-1);
  const pad = 0.01 * G;
  for (let gy = 0; gy < gH; gy++) {
    const y0 = gy0 + gy * G - pad; const y1 = gy0 + (gy + 1) * G + pad;
    for (let gx = 0; gx < gW; gx++) {
      const i = gy * gW + gx; const kn = cellKN[i]; if (kn === 0) continue;
      const x0 = gx0 + gx * G - pad; const x1 = gx0 + (gx + 1) * G + pad;
      const k0 = cellK0[i]; const b = 4 * k0; let n = b + 2;
      for (let q = k0; q < k0 + kn; q++) { // thru: the reach test can pass in the cell
        const k = cellKList[q]; if (!(kThru[k] > 0.5)) continue;
        const dx = Math.max(x0 - kCx[k], 0, kCx[k] - x1); const dy = Math.max(y0 - kCy[k], 0, kCy[k] - y1);
        if (Math.sqrt(dx * dx + dy * dy) <= kRV[k] + W + 4 * aa) out[n++] = k;
      }
      const nThru = n - b - 2;
      for (let q = k0; q < k0 + kn; q++) { // keep: the ring test (and, thru, the reach test) can pass in the cell
        const k = cellKList[q];
        const dx = Math.max(x0 - kCx[k], 0, kCx[k] - x1); const dy = Math.max(y0 - kCy[k], 0, kCy[k] - y1);
        const dmin = Math.sqrt(dx * dx + dy * dy);
        const fx = Math.max(Math.abs(kCx[k] - x0), Math.abs(kCx[k] - x1)); const fy = Math.max(Math.abs(kCy[k] - y0), Math.abs(kCy[k] - y1));
        const dmax = Math.sqrt(fx * fx + fy * fy);
        if (!(dmax > kR[k] - aa - W) || dmin > kRmax[k] + W + 2 * aa) continue;
        if (kThru[k] > 0.5 && dmin > kRV[k] + W + 4 * aa) continue;
        out[n++] = k;
      }
      out[b] = nThru; out[b + 1] = n - b - 2 - nThru;
    }
  }
  return out;
}

/**
 * K1482 s20: the tables in home mode `on`: T itself when built so, else with homeOn flipped and the corner count
 * and cell lists of that mode (the retry corners in or out; GfTables.kExt). Every reader of a flipped table set
 * (the pass's upload, the CPU eval, the explore and reveal tables beside it) takes it from here.
 */
export function withHome(T: GfTables, on: boolean): GfTables {
  if (on === T.homeOn) return T;
  // K1482 s23: a build without the retry (the switch off) flips homeOn alone, as K1439 did
  if (T.kExt === undefined || T.nKAlt === undefined || !T.cellK0Alt || !T.cellKNAlt || !T.cellKListAlt || !T.cellKPListAlt) return { ...T, homeOn: on };
  return {
    ...T, homeOn: on,
    nK: T.nKAlt, cellK0: T.cellK0Alt, cellKN: T.cellKNAlt, cellKList: T.cellKListAlt, cellKPList: T.cellKPListAlt,
    nKAlt: T.nK, cellK0Alt: T.cellK0, cellKNAlt: T.cellKN, cellKListAlt: T.cellKList, cellKPListAlt: T.cellKPList,
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
  for (let ci = 0; ci < scene.chains.length; ci++) blocks[ci] = gfRawChain(scene.chains[ci].pts, scene.chains[ci].closed);
  const P = buildGfPrefix(scene, opts, mergeGfRaw(scene, blocks), true);
  const meta = gfChunkMeta(P);
  const tc0 = now();
  let K: GfCorner[] = [];
  let allArms: GfArm[] = [];
  for (const [lo, hi] of partitionWeighted(scene.junctions.map((J) => J.arms.length), n)) {
    const armsR = buildGfArms(P, lo, hi);
    allArms = allArms.concat(armsR);
    K = K.concat(solveGfCorners({ ...P, arms: armsR }, lo, hi));
  }
  const armTab = gfArmTable(P.nC, allArms);
  const P2: GfPrefix = { ...P, nA: armTab.nA, aSR: armTab.aSR, aDir: armTab.aDir, aL: armTab.aL, aLcut: armTab.aLcut, aG: armTab.aG, cArm0: armTab.cArm0, cArmN: armTab.cArmN, arms: armTab.arms };
  const tc1 = now();
  const parts = partitionWeighted(new Array(meta.nCh).fill(1), n).map(([lo, hi]) => gfChunkBinPart(P, meta, lo, hi));
  const bins = mergeGfChunkBins(parts, meta.gW * meta.gH);
  return assembleGfTables(P2, K, { meta, bins }, { vtx: P.ms.vtx, pins: P.ms.pins, arms: P.ms.arms, corners: tc1 - tc0 }, t0);
}
