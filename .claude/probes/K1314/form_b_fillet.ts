// K1314 s3: a PROBE COPY of src/render/field/form_b.ts (as of c51244ea) with one change: the
// corner loop no longer skips a through pass's two arms (S1d F2), so the bend's inner side gets
// the S1b/S1c fillet (K1049, Levi's "Rounded corner"). The census reads it as the reference
// around the through-pass bends it counts (k1314_census.ts, filletSpots). Do not edit by hand:
// regenerate from form_b.ts (k1314_s3 report).
// K1040 S1: form B, the junction look's definition (F2 of
// docs/design/K1040_junction_field.md), evaluated in float64 on the CPU.
//
// The reference every GPU stage of the redesign is checked against. A pure
// function of the frame (a FieldScene): no state between frames, no march,
// no walk with a step. Nothing in the app imports it.
//
// Per frame (the constructor): chains with END arms extended to c′, the
// pinned-hat depth per sample (depth.ts), groups (junction clusters joined
// by a run with no crossing), each arm's span [root, cap] with its cap as a
// min over a fixed candidate set, and one corner per cyclically adjacent
// arm pair (V, θ, r0, fit, r_max by bisection, q by Newton from V, the
// tracked feet t_a, t_b, the overlap gate ω).
//
// Per pixel (evalPoint): the pieces (local minima of |p − c_i(s)|, one per
// chain within σ), their surfaces, the top surface, and the ink as the max
// over the exposed-outline terms (side feet with burial, the corners'
// endpoints, the fillet arcs), each weighted by its exposure.
//
// Calls settled while building it (brief K1040_s1_reference.md, Findings):
// - Q1, a surface's z at a pixel: the CONE KEY. Every covering piece keys
//   z − d/K (K = h/zt by default); a surface's key is the max over its
//   covering pieces and fills, the top surface is the max key, and the
//   label is the max-key piece (among equal z: the nearest). That is one
//   depth test over pieces, it is continuous, and it breaks the equal-z
//   ties of one chain's segments by distance instead of draw order (K1033).
//   `coneK: Infinity` gives the max form (z alone, ties by distance).
//   S3b F1 (Definition change, `labelBy`): the label's key and name come
//   from the covering pieces (d < h, fold weight >= 1/2) and the covering
//   fills alone, so the name switches at d = h; the ink's composite still
//   orders the surfaces by their reach key (every piece within h + aa, every
//   fill within its aa shell).
// - Q2, the cap (S1c F2): a piece inside its arm's cap ramp is a full
//   member of its group with weight ramp, and OWN with weight 1 − ramp.
//   The pixel mixes complete composites, one per configuration: with the
//   ramps sorted, u in [0, 1) makes each piece whose ramp exceeds u a
//   member (n + 1 configurations for n such pieces, weighted by the gaps
//   between the sorted ramps). Within one, a burial weighs B.selfW alone,
//   so a foot stays buried at full weight while a full member's tube holds
//   it, and the hand-off to OWN at L (ramp 0) is continuous whether OWN
//   lies over the group or under it. F_CAP marks where the
//   configurations' inks differ.
// - D1, the fold: one chain's minima within σ merge (the nearer is kept).
//   A dropped minimum keeps its foot term at a blend weight β (S1e): 1
//   where it ties the kept one, 0 where it is born, δ farther or σ away,
//   so the pick's switch moves no ink.
//   Of two kept minima of one chain within 2σ, the farther one's own terms
//   and its burial of others are weighted ss(σ, 2σ, Δs), so a minimum
//   enters at weight 0 where the merge lets it go.
// - The band: a side foot's and an arc's term use the two-sided band
//   band(D) · ss(−aa, aa, D) (the strip's reach: W + aa inside, aa
//   outside); an endpoint's term (D ≥ 0) counts only inside its surface.
// - A fill covers at weight ω: a pixel covered by its surface only through
//   fills mixes that surface's ink over what lies below by the fill's ω.

import type { FieldScene } from "../../../src/render/field/scene";
import { candidates, closestOnSeg, dS, footInWindow, makePoly, normS, pointAt, segB, segOfS, SegGrid, zAt } from "../../../src/render/field/geom";
import type { Cand, Foot, Poly } from "../../../src/render/field/geom";
import { CornerGrowth, polyTangents } from "../../../src/render/field/corner_cf";
import type { CfArmIn } from "../../../src/render/field/corner_cf";
import { diagramDepth } from "../../../src/render/field/depth";
import type { DepthChain } from "../../../src/render/field/depth";

/** K1257: the closed-form corner growth (one per module: solveCorner does not re-enter). */
const CF = new CornerGrowth();
/** K1321: how far past an arm's span (in h) a dropped corner's V and disk read the chain (footExt). */
export const FOOT_EXT = 3;

export function ss(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * K1163: gate699's corner angle (rad), the reference for the root gate's
 * tip scaling. A round of radius r at angle θ has its tip
 * r·(1/sin(θ/2) − 1) inside V, so t(θ) = 1/sin(θ/2) − 1 measures how much
 * ink a null at that angle would move; t(2.0) ≈ 0.188395.
 */
export const ROOT_BAND_REF_THETA = 2.0;

/** The tip factor's scale at θ: min(1, t(θ)/t(ROOT_BAND_REF_THETA)); 1 at and below the reference angle. */
function rootTipScale(theta: number): number {
  const s = Math.sin(theta / 2);
  if (!(s > 0)) return 1;
  const t = 1 / s - 1;
  if (!(t > 0)) return 0;
  const tRef = 1 / Math.sin(ROOT_BAND_REF_THETA / 2) - 1;
  return Math.min(1, t / tRef);
}

export interface FormBParams {
  /** Device px per CSS px (default: the scene camera's dpr). */
  dpr?: number;
  /** Half the AA ramp, world units (default half a device px). */
  aa?: number;
  /** D1: σ (default π h). */
  sigma?: number;
  /** D2: the cap ramp λ (default h). */
  capw?: number;
  /** D4: ε_z (default 0.1 amp). */
  zt?: number;
  /** Q1: key = z − d/K (default h/zt); Infinity is the max form. */
  coneK?: number;
  /** D6: the overlap gate's width (default 0.05 h). */
  ovw?: number;
  /** Corner radius share, cr in r0 = (cr/3)·min(2h, 1.5h·tan(θ/2)) (default look.cuspRadius, else 3). */
  cr?: number;
  /** D1: the fold fade (default true). */
  fold?: boolean;
  /** D1's merge blend width δ (S1e, default 2 aa); 0 keeps the discrete pick (S1d). */
  merge?: number;
  /**
   * S1f: a crossing's reach back along an arm (the Lcut loop). "straight":
   * the straight model's r0 = h·cot(θ/2) (S1d, S1e's final). "walk": S1e
   * F4's walked e_c (candidates 2 and 3, not continuous). "quad": S1f's
   * quadratic reach (quadReachOf). Default "quad" (S1f F1).
   */
  reach?: "straight" | "walk" | "quad";
  /**
   * S1e F4: a crossing's reach along an arm, measured on the curved threads
   * when true; kept for S1e's probes: true is reach "walk", false
   * "straight". Ignored when reach is given.
   */
  curvedReach?: boolean;
  /**
   * S1e F4: the straight reach h·cot(θ/2) holds up to this many h (default
   * 4, crossings steeper than 2·atan(1/4) ≈ 28°); a longer one is measured
   * on the curved threads, never below it. The floor F of "walk" and "quad"
   * (clamped to at least 1 h for "quad", see quadReachOf).
   */
  curvedFrom?: number;
  /** S1f: the quadratic reach's number of fits (default 2), each at the last one's reach. */
  reachSteps?: number;
  /**
   * S1f: the separation the quadratic reach fits: the chord between the two
   * threads at matched arc length (default), or the distance from the arm's
   * point to the partner's tangent line at its matched point.
   */
  reachSep?: "chord" | "line";
  /**
   * S1g: a pass behind an arm's root (the Lcut loop's d < 0; on a closed
   * chain, the arc len − d back to the root). "skip": no cut (S1f's final,
   * whose L pops as a pass slides over the root). "mirror": it cuts at
   * c = |d| − reach − h, the reach measured toward the root, so L and Lcut
   * meet the front side's −reach − h at d = 0. "near": c = |d| (L meets 0
   * there; Lcut does not, where L = 0 on both arms). Default "near" (S1g F1).
   */
  dEdge?: "skip" | "mirror" | "near";
  /**
   * S1i: a uniform slope k for "near"'s cut, c = k·u, read only with
   * dEdgeTip 0 (1 there is S1g's F1). L still meets 0 at u = 0; above 1
   * the span's end sweeps k times as fast as the pass while that cut binds,
   * and an arm whose pass sits close behind its root keeps more of its span.
   * No one k does both (S1i F2): 2 leaves j36 short, 3 raises the sweeps.
   */
  dEdgeK?: number;
  /**
   * S1i: "near"'s slope from the arm's corners (0: the uniform dEdgeK).
   * Where the cap gate holds a corner's r, its arc's tip moves
   * g = tan((π − θ)/4) per unit of L (θ the corner's angle: 1 at 0, 0 at π),
   * so the cut c = k·u with k = clamp(dEdgeTip / g, 1, dEdgeKMax), g the
   * larger over the arm's corners, moves no fillet faster than dEdgeTip
   * times the pass. g is continuous in the arms' angles, also as two arms
   * swap order (g = 1 at θ = 0 on both sides). Default 1 (S1i F3): at rest
   * the corners S1g's near emptied or shrank get S1f's span back.
   */
  dEdgeTip?: number;
  /** S1i: dEdgeTip's largest k (an arm with no corner, g = 0, gets it). Default 4. */
  dEdgeKMax?: number;
  /**
   * S1g: the root gate's band, in h (0: off, S1f's final; default 0.5, S1g
   * F2). A fourth factor of solveCorner's w (after the margin, steep and cap
   * gates), ss(d/band) on each tracked foot's distance d from its arm's
   * root, the low-side twin of the cap gate: r goes to 0 as either foot
   * reaches its root, before the window test's null (dV ≤ tol) does. The
   * band itself is scaled per corner by rootBandScale (K1163).
   */
  rootBand?: number;
  /**
   * K1163: how the root gate's band scales with the corner's angle.
   * 'tip' (default): the band is rootBand*h*min(1, t(theta)/t(ROOT_BAND_REF_THETA))
   * with t(theta) = 1/sin(theta/2) - 1, so at gate699's angle (theta = 2.0) it is
   * the flat band and at near-straight corners it shrinks with the ink a null
   * would move (the tip moves at about 1.1x the root's speed at every angle).
   * 'flat' is S1g's band, rootBand*h at every angle. A scaled band under
   * 1e-9*h acts as its step limit (the gate is 1 for any foot off its root),
   * with no division by zero as theta approaches pi and t approaches 0.
   */
  rootBandScale?: "tip" | "flat";
  /**
   * S3b: who names a surface in the label (evalPoint's top, chain, s, z,
   * key, dkey). "cover" (default, S3b F1): its covering pieces (within h,
   * fold weight ≥ 1/2) and the fills that cover the pixel, so the name
   * switches at d = h and a non-covering piece can neither name its
   * surface nor lift it above another covering surface. "reach": every
   * piece within h + aa and every fill within its aa shell (S1g's final,
   * S3's class B). The ink's composite order keeps the reach key either
   * way.
   */
  labelBy?: "cover" | "reach";
  /** Depth window, arc length (default look.depthWindow · (look.ctrlArc ?? 1)). */
  depthWindow?: number;
  /**
   * Probes and pins only (S1b): hold a fade at one value wherever it applies,
   * to sweep it across 0..1 on a fixed frame. fold: every fold pair's far
   * piece weight; omega: every corner's ω; cap: the cap ramp inside its ramp;
   * tie: the tie mix's t wherever it mixes.
   */
  force?: { fold?: number; omega?: number; cap?: number; tie?: number };
  /** Probes only (S1b): the fill's key from the nearer tangent point's z (default), or always A's or B's. */
  fillKey?: "nearer" | "a" | "b";
}

export const T_NONE = 0;
export const T_FOOT = 1;
export const T_TA = 2;
export const T_TB = 3;
export const T_V = 4;
export const T_ARC = 5;
export const TERM_NAMES = ["none", "foot", "tA", "tB", "V", "arc"];

/** Fade bits: which of F3's fades was active (strictly inside its width) at the pixel. */
export const F_FOLD = 1;
export const F_CAP = 2;
export const F_TIE = 4;
export const F_OMEGA = 8;
/** S1e: D1's merge blend, a dropped minimum's foot term at weight β strictly inside 0..1. */
export const F_MERGE = 16;

export interface Arm {
  j: number;
  g: number;
  pi: number;
  /** Root: the junction's s on the chain (through) or the chain's end at c′ (END). */
  sR: number;
  dir: number;
  kind: "through" | "end";
  /** Span length from the root (min over the fixed candidate set, ≥ 0). */
  L: number;
  /** The crossing-cut candidates' min (Infinity if none on the run): the cap ramp's end. */
  Lcut: number;
  /** Outward unit direction (root to 2h along the arm) and its angle. */
  ux: number;
  uy: number;
  ang: number;
  /** Index in the export's arms[]. */
  ei: number;
}

export interface Corner {
  j: number;
  g: number;
  a: number;
  b: number;
  ok: boolean;
  style: number;
  theta: number;
  r0: number;
  r1: number;
  r: number;
  room: number;
  Vx: number;
  Vy: number;
  qx: number;
  qy: number;
  tax: number;
  tay: number;
  tbx: number;
  tby: number;
  /** V's feet and the ball's feet, as distance from each arm's root. */
  dVa: number;
  dVb: number;
  dA: number;
  dB: number;
  /** The ball's feet's chain s and segment. */
  sA: number;
  sB: number;
  kA: number;
  kB: number;
  zA: number;
  zB: number;
  omega: number;
  ov: number;
  /** |V − q|. */
  rV: number;
}

export interface Piece {
  idx: number;
  chain: number;
  s: number;
  d: number;
  fx: number;
  fy: number;
  /** Nearest segment, and the vertex index when the minimum sits on a vertex (−1 inside a segment). */
  k: number;
  vtx: number;
  z: number;
  key: number;
  g: number;
  surf: number;
  ramp: number;
  /** D1: this piece's own weight and its burial weight (the farther of a fold pair). */
  selfW: number;
  /**
   * D1's merge blend (S1e): the minima of this chain that the merge dropped
   * into this piece, each at its weight β > 0. Each is a copy of the piece
   * with the dropped minimum's s, d, foot, segment and vertex, and adds a
   * foot term only (no cover, burial, label or surface of its own).
   */
  alts: Alt[];
}

/** A minimum that D1's merge dropped (S1e), with its blend weight β. */
export interface Alt extends Piece {
  beta: number;
}

export interface Term {
  kind: number;
  surf: number;
  chain: number;
  s: number;
  k: number;
  vtx: number;
  corner: number;
  D: number;
  w: number;
  v: number;
}

export interface PixelEval {
  ink: number;
  /** Top surface: a group index, OWN + piece index for a piece that is its own surface, −1 for paper. */
  top: number;
  chain: number;
  s: number;
  z: number;
  key: number;
  /** The winning term (null when no term inks). */
  term: Term | null;
  fade: number;
  /** Covering surfaces, and |Δz|, |Δkey| between the top two (Infinity with one). */
  nSurf: number;
  dz: number;
  dkey: number;
  /** Distance to the top surface's exposed outline: min D over its terms of weight ≥ 1/2. */
  Dexp: number;
}

export const OWN = 1 << 20;

interface SurfEntry {
  id: number;
  /** The reach key (pieces within h + aa, fills within their aa shell): the ink's composite order. */
  key: number;
  z: number;
  chain: number;
  s: number;
  /** The cover key and name (S3b F1): its covering pieces and covering fills only. */
  ckey: number;
  cz: number;
  cchain: number;
  cs: number;
  pieceCover: boolean;
  fillW: number;
}

const EMPTY: Cand[] = [];

/** A crossing pass on a chain: its s, θ_c, and the partner pass's chain index and s. */
export interface Pass {
  s: number;
  theta: number;
  qi: number;
  sq: number;
}
const NO_ALTS: Alt[] = [];

/**
 * The unit tangent at arc s, interpolated along the segment between its two
 * vertex tangents (each the mean of the directions of the segments that meet
 * there): the oracle's K1000 tanAt. pointAt's tangent is constant per segment,
 * so a crossing sliding over a vertex turned its pass θ in a step, and Lcut
 * (through cot(θ/2)) with it (S1d F5).
 */
function tanAt(p: Poly, s: number): { tx: number; ty: number } {
  const a = pointAt(p, s);
  const vtx = (i: number): [number, number] => {
    const kin = i > 0 ? i - 1 : p.closed ? p.nseg - 1 : -1;
    const kout = i < p.nseg ? i : p.closed ? 0 : -1;
    let x = 0;
    let y = 0;
    let last = -1;
    for (const k of [kin, kout]) {
      if (k < 0) continue;
      const l = p.segLen[k] || 1;
      const b = segB(p, k);
      x += (p.x[b] - p.x[k]) / l;
      y += (p.y[b] - p.y[k]) / l;
      last = k;
    }
    const l = Math.sqrt(x * x + y * y);
    if (l > 1e-12) return [x / l, y / l];
    if (last < 0) return [a.tx, a.ty];
    const lk = p.segLen[last] || 1;
    const bk = segB(p, last);
    return [(p.x[bk] - p.x[last]) / lk, (p.y[bk] - p.y[last]) / lk];
  };
  const [x0, y0] = vtx(a.k);
  const [x1, y1] = vtx(segB(p, a.k));
  const x = x0 + (x1 - x0) * a.t;
  const y = y0 + (y1 - y0) * a.t;
  const l = Math.sqrt(x * x + y * y);
  return l > 1e-12 ? { tx: x / l, ty: y / l } : { tx: a.tx, ty: a.ty };
}

export class FormB {
  readonly scene: FieldScene;
  readonly h: number;
  readonly W: number;
  readonly aa: number;
  readonly ppuDev: number;
  readonly sigma: number;
  readonly lambda: number;
  readonly zt: number;
  readonly K: number;
  readonly ovw: number;
  readonly cr: number;
  readonly fold: boolean;
  /** D1's merge blend width δ (S1e). */
  readonly delta: number;
  /** S1f: the crossing reach's model (FormBParams.reach). */
  readonly reach: "straight" | "walk" | "quad";
  /** S1e F4: the reach, in h, up to which the straight model holds. */
  readonly curvedFrom: number;
  /** S1f: the quadratic reach's fits and separation. */
  readonly reachSteps: number;
  readonly reachSep: "chord" | "line";
  /** S1g: a pass behind an arm's root. */
  readonly dEdge: "skip" | "mirror" | "near";
  /** S1i: the slope of "near"'s cut. */
  readonly dEdgeK: number;
  /** S1i: the corners' tip speed bound for "near"'s slope (0: off), and its largest k. */
  readonly dEdgeTip: number;
  readonly dEdgeKMax: number;
  /** S1g: the root gate's band, in h (0: off). */
  readonly rootBand: number;
  /** K1163: the root band's scaling with the corner angle ('tip' default; 'flat' is S1g's band). */
  readonly rootBandScale: "tip" | "flat";
  /** S3b: who names a surface in the label ("cover": its covering pieces and fills). */
  readonly labelBy: "cover" | "reach";
  readonly force: NonNullable<FormBParams["force"]>;
  readonly fillKey: "nearer" | "a" | "b";
  readonly polys: Poly[];
  readonly idxOf = new Map<number, number>();
  readonly grid: SegGrid;
  readonly depthChains: DepthChain[];
  readonly depthWin: number;
  readonly arms: Arm[] = [];
  readonly armsOf: number[][];
  /** Junction index → group (cluster) index. */
  readonly groupOf: number[];
  readonly nGroups: number;
  readonly corners: Corner[] = [];
  /** K1314 s3 probe: the corners the stock form B skips (a through pass's two arms). */
  readonly thruCi = new Set<number>();
  readonly diagnostics: string[] = [];
  /** Per chain: crossing passes (s, θ_c) on it, with the partner's chain and s. */
  readonly passes: Pass[][];
  private cgrid = new Map<number, number[]>();
  private readonly cell: number;
  private cbuf: Cand[] = [];

  constructor(scene: FieldScene, params: FormBParams = {}) {
    this.scene = scene;
    const look = scene.look;
    const h = look.halfWidth;
    this.h = h;
    this.W = look.band;
    const dpr = params.dpr ?? scene.camera.dpr;
    this.ppuDev = scene.camera.pxPerUnit * dpr;
    this.aa = params.aa ?? 0.5 / this.ppuDev;
    this.sigma = params.sigma ?? Math.PI * h;
    this.lambda = params.capw ?? h;
    this.zt = params.zt ?? 0.1 * look.depthAmp;
    this.K = params.coneK ?? h / this.zt;
    this.ovw = params.ovw ?? 0.05 * h;
    this.cr = params.cr ?? look.cuspRadius ?? 3;
    this.fold = params.fold ?? true;
    this.delta = params.merge ?? 2 * this.aa;
    this.reach = params.reach ?? (params.curvedReach === undefined ? "quad" : params.curvedReach ? "walk" : "straight");
    this.curvedFrom = params.curvedFrom ?? 4;
    this.reachSteps = params.reachSteps ?? 2;
    this.reachSep = params.reachSep ?? "chord";
    this.dEdge = params.dEdge ?? "near";
    this.dEdgeK = params.dEdgeK ?? 1;
    this.dEdgeTip = params.dEdgeTip ?? 1;
    this.dEdgeKMax = params.dEdgeKMax ?? 4;
    this.rootBand = params.rootBand ?? 0.5;
    this.rootBandScale = params.rootBandScale ?? "tip";
    this.labelBy = params.labelBy ?? "cover";
    this.force = params.force ?? {};
    this.fillKey = params.fillKey ?? "nearer";

    // 1. Chains; END arms extended to c′ (the nearest point of a through's centreline).
    scene.chains.forEach((c, i) => this.idxOf.set(c.id, i));
    const raw = scene.chains.map((c, i) => makePoly(i, c.pts, null, c.closed));
    const ext: { start?: [number, number]; end?: [number, number] }[] = raw.map(() => ({}));
    for (const j of scene.junctions) {
      for (const arm of j.arms) {
        if (arm.kind !== "end") continue;
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) continue;
        const p = raw[pi];
        const term = pointAt(p, arm.s);
        let cp: [number, number] = [j.c[0], j.c[1]];
        let best = Infinity;
        for (const t of j.arms) {
          if (t.kind !== "through") continue;
          const ti = this.idxOf.get(t.chain);
          if (ti === undefined) continue;
          const f = footInWindow(raw[ti], term.x, term.y, t.s - 4 * h, t.s + 4 * h);
          if (f.d < best) {
            best = f.d;
            cp = [f.x, f.y];
          }
        }
        if (Math.abs(arm.s - p.s0) < Math.abs(arm.s - (p.s0 + p.len))) ext[pi].start = cp;
        else ext[pi].end = cp;
      }
    }
    this.polys = scene.chains.map((c, i) => {
      const e = ext[i];
      if (!e.start && !e.end) return raw[i];
      const pts = Array.from(c.pts);
      let s0 = 0;
      if (e.start) {
        const d = Math.hypot(pts[0] - e.start[0], pts[1] - e.start[1]);
        if (d > 1e-9) {
          pts.unshift(e.start[0], e.start[1]);
          s0 = -d;
        }
      }
      if (e.end) {
        const m = pts.length;
        const d = Math.hypot(pts[m - 2] - e.end[0], pts[m - 1] - e.end[1]);
        if (d > 1e-9) pts.push(e.end[0], e.end[1]);
      }
      return makePoly(i, pts, null, c.closed, s0);
    });

    // 2. Depth: §3.3's pinned hats per sample (depth.ts), interpolated along segments.
    const amp = look.depthAmp;
    this.depthWin = params.depthWindow ?? look.depthWindow * (look.ctrlArc ?? 1);
    this.depthChains = this.polys.map((p) => ({ closed: p.closed, s0: p.s0, len: p.len, pins: [] }));
    this.passes = this.polys.map(() => []);
    for (const x of scene.crossings) {
      const ia = this.idxOf.get(x.a.chain);
      const ib = this.idxOf.get(x.b.chain);
      if (ia === undefined || ib === undefined) continue;
      const sa = normS(this.polys[ia], x.a.s);
      const sb = normS(this.polys[ib], x.b.s);
      // S1d F5: the interpolated tangent, so θ turns smoothly as the crossing
      // slides over a vertex (tanAt).
      const ta = tanAt(this.polys[ia], sa);
      const tb = tanAt(this.polys[ib], sb);
      const theta = Math.acos(Math.min(1, Math.abs(ta.tx * tb.tx + ta.ty * tb.ty)));
      this.passes[ia].push({ s: sa, theta, qi: ib, sq: sb });
      this.passes[ib].push({ s: sb, theta, qi: ia, sq: sa });
      this.depthChains[ia].pins.push({ s: sa, z: x.over === "a" ? amp : -amp });
      this.depthChains[ib].pins.push({ s: sb, z: x.over === "b" ? amp : -amp });
    }
    for (const d of this.depthChains) d.pins.sort((u, v) => u.s - v.s);
    this.polys.forEach((p, i) => {
      for (let k = 0; k < p.n; k++) p.z[k] = diagramDepth(this.depthChains[i], this.depthWin, p.s[k]);
    });
    this.grid = new SegGrid(this.polys, Math.max(2 * h, 0.25), 4 * h);

    // 3. Groups: junctions joined by a run with no crossing between their roots.
    const nj = scene.junctions.length;
    const parent = Array.from({ length: nj }, (_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) i = parent[i] = parent[parent[i]];
      return i;
    };
    const roots: { s: number; j: number }[][] = this.polys.map(() => []);
    const armRoot = (pi: number, s: number, kind: string): { sR: number; dir: number } | null => {
      const p = this.polys[pi];
      if (kind === "end") {
        const atStart = Math.abs(s - 0) < Math.abs(s - (p.s0 + p.len)) || Math.abs(s - p.s0) < 1e-9;
        return atStart ? { sR: p.s0, dir: 1 } : { sR: p.s0 + p.len, dir: -1 };
      }
      return { sR: normS(p, s), dir: 0 };
    };
    scene.junctions.forEach((j, ji) => {
      for (const arm of j.arms) {
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) continue;
        const r = armRoot(pi, arm.s, arm.kind);
        if (!r) continue;
        if (!roots[pi].some((q) => q.j === ji && Math.abs(q.s - r.sR) < 1e-9)) roots[pi].push({ s: r.sR, j: ji });
      }
    });
    const between = (pi: number, a: number, b: number): boolean => {
      // Is there a crossing pass strictly inside the run from a forward to b?
      const p = this.polys[pi];
      const len = b - a;
      for (const x of this.passes[pi]) {
        let u = x.s - a;
        if (p.closed) u = ((u % p.len) + p.len) % p.len;
        if (u > 1e-9 && u < len - 1e-9) return true;
      }
      return false;
    };
    this.polys.forEach((p, pi) => {
      const r = roots[pi].sort((u, v) => u.s - v.s);
      for (let i = 0; i + 1 < r.length; i++) if (!between(pi, r[i].s, r[i + 1].s)) parent[find(r[i].j)] = find(r[i + 1].j);
      if (p.closed && r.length > 1) {
        const a = r[r.length - 1];
        const b = r[0];
        if (!between(pi, a.s, b.s + p.len)) parent[find(a.j)] = find(b.j);
      }
    });
    const gid = new Map<number, number>();
    this.groupOf = scene.junctions.map((_, ji) => {
      const r = find(ji);
      if (!gid.has(r)) gid.set(r, gid.size);
      return gid.get(r)!;
    });
    this.nGroups = gid.size;

    // Arms and their spans: L = min(chain end, next root, each crossing cut
    // d_c − reach_c − h), reach_c = h·cot(θ_c/2) on straight threads
    // (curvedReachOf for reach "walk", S1e F4; quadReachOf for "quad", S1f).
    this.armsOf = this.polys.map(() => []);
    const tipK = this.dEdge === "near" && this.dEdgeTip > 0;
    const pend: { ai: number; L0: number; uB: number }[] = [];
    scene.junctions.forEach((j, ji) => {
      j.arms.forEach((arm, ei) => {
        const pi = this.idxOf.get(arm.chain);
        if (pi === undefined) return;
        const p = this.polys[pi];
        const r = armRoot(pi, arm.s, arm.kind)!;
        const dir = arm.kind === "end" ? r.dir : arm.dir;
        const sR = r.sR;
        const delta = (s: number): number => {
          let d = (s - sR) * dir;
          if (p.closed) d = ((d % p.len) + p.len) % p.len;
          return d;
        };
        let L = p.closed ? p.len : dir > 0 ? p.s0 + p.len - sR : sR - p.s0;
        for (const q of roots[pi]) {
          const d = delta(q.s);
          if (d > 1e-9 && d < L) L = d;
        }
        // A pass's reach toward the root, measured from the pass in direction
        // md (dir for a pass in front of the root, −dir for one behind it).
        const reachAt = (x: Pass, md: number, d: number): number => {
          const t = Math.tan(x.theta / 2);
          let reach = t > 1e-12 ? h / t : Infinity;
          // S1e F4: a straight reach past curvedFrom·h is measured on the
          // curved threads (never below curvedFrom·h) wherever it would cut
          // short of L. max(R, min(r0, e_c)) is continuous in θ.
          const reachMin = this.curvedFrom * h;
          if (this.reach === "walk" && reach > reachMin && d - reach - h < L) reach = Math.max(reachMin, this.curvedReachOf(pi, x, md, reach, h));
          // S1f: reach = min(r0, max(F, e*)), one expression with no gate:
          // r0 wherever r0 ≤ F, and e* ≤ r0 is continuous in the geometry.
          else if (this.reach === "quad") {
            const fl = Math.max(1, this.curvedFrom) * h;
            if (reach > fl) reach = Math.min(reach, Math.max(fl, this.quadReachOf(pi, x, md, h, fl)));
          }
          return reach;
        };
        let Lcut = Infinity;
        // S1i: with dEdgeTip, near's nearest pass behind the root (its cut
        // waits for the arm's corners, after the loop).
        let uB = Infinity;
        for (const x of this.passes[pi]) {
          const d = delta(x.s);
          // S1g: a pass behind the root (d < 0 on an open chain; on a closed
          // one every pass is also the arc len − d behind it) cuts at its
          // mirror distance u: c = u − reach − h ("mirror") or c = u
          // ("near"). Both meet the front side's L = 0 at u = 0, so L is
          // continuous as the pass slides over the root; "skip" is S1f's.
          if (this.dEdge !== "skip") {
            const u = p.closed ? p.len - d : -d;
            if (p.closed || d < -1e-12) {
              const c = this.dEdge === "near" ? this.dEdgeK * u : u - reachAt(x, -dir, u) - h;
              if (tipK) uB = Math.min(uB, u);
              else if (c < Lcut) Lcut = c;
            }
          }
          // S1d F5: a pass past L still cuts while its cut c lies short of L
          // (c < d); skipping it there made L jump as the pass slid over L.
          if (d < -1e-12) continue;
          const c = d - reachAt(x, dir, d) - h;
          if (c < Lcut) Lcut = c;
        }
        if (uB < Infinity) pend.push({ ai: this.arms.length, L0: L, uB });
        L = Math.max(0, Math.min(L, Lcut));
        // S1d F3: the oracle's armDir, the chord at 2h along the chain from the
        // scene arm's s (an END arm's sR is the chain's end extended to c',
        // short of it), clamped to an open chain's ends only, never to L
        // (whose gates jump).
        const sB = arm.kind === "end" ? normS(p, arm.s) : sR;
        const a0 = pointAt(p, sB);
        let s1 = sB + dir * 2 * h;
        if (!p.closed) s1 = Math.min(Math.max(s1, p.s0), p.s0 + p.len);
        const a1 = pointAt(p, s1);
        let ux = a1.x - a0.x;
        let uy = a1.y - a0.y;
        const ul = Math.hypot(ux, uy);
        if (ul < 1e-12) {
          ux = a0.tx * dir;
          uy = a0.ty * dir;
        } else {
          ux /= ul;
          uy /= ul;
        }
        this.armsOf[pi].push(this.arms.length);
        this.arms.push({ j: ji, g: this.groupOf[ji], pi, sR, dir, kind: arm.kind, L, Lcut, ux, uy, ang: Math.atan2(uy, ux), ei });
      });
    });
    // S1i: dEdgeTip's behind cut, c = k·u with k from the arm's corners: its
    // two cyclic neighbours as the corner loop below takes them (a through
    // pass's own two arms make none), g = tan((π − θ)/4) for θ < π, else 0.
    for (const { ai, L0, uB } of pend) {
      const A = this.arms[ai];
      const J = scene.junctions[A.j];
      const ais = this.arms.map((_, i) => i).filter((i) => this.arms[i].j === A.j);
      ais.sort((u, v) => this.arms[u].ang - this.arms[v].ang);
      const n = ais.length;
      const at = ais.indexOf(ai);
      let gMax = 0;
      for (const [a, b] of [
        [ais[(at + n - 1) % n], ai],
        [ai, ais[(at + 1) % n]],
      ]) {
        if (a === b) continue;
        const xa = J.arms[this.arms[a].ei];
        const xb = J.arms[this.arms[b].ei];
        if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
        let th = this.arms[b].ang - this.arms[a].ang;
        th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (th < Math.PI) gMax = Math.max(gMax, Math.tan((Math.PI - th) / 4));
      }
      const k = gMax > 0 ? Math.min(this.dEdgeKMax, Math.max(1, this.dEdgeTip / gMax)) : this.dEdgeKMax;
      const c = k * uB;
      if (c < A.Lcut) A.Lcut = c;
      A.L = Math.max(0, Math.min(L0, A.Lcut));
    }

    // 4. Corners: one per cyclically adjacent arm pair.
    this.cell = Math.max(2 * h, 0.25);
    scene.junctions.forEach((j, ji) => {
      const ais = this.arms.map((_, i) => i).filter((i) => this.arms[i].j === ji);
      const n = ais.length;
      if (n < 2) return;
      ais.sort((u, v) => this.arms[u].ang - this.arms[v].ang);
      const styles = j.corners ?? [];
      for (let i = 0; i < n; i++) {
        const a = ais[i];
        const b = ais[(i + 1) % n];
        let th = this.arms[b].ang - this.arms[a].ang;
        th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // K1321: a near-straight or reflex pair (form B makes no corner) is recorded for the census.
        if (th >= Math.PI - 1e-6 && th < 1.25 * Math.PI) {
          const xa0 = j.arms[this.arms[a].ei];
          const xb0 = j.arms[this.arms[b].ei];
          if (!(xa0.chain === xb0.chain && xa0.kind === "through" && xb0.kind === "through" && Math.abs(xa0.s - xb0.s) < 1e-6)) this.recordFail(ji, a, b, th);
        }
        if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
        const ea = this.arms[a].ei;
        const eb = this.arms[b].ei;
        // S1d F2: the two arms of one through pass are one tube, so they get
        // no corner, as the oracle's corner loop says. Two passes of one
        // chain, or its two ends, still do. The pair's corner used to come and
        // go with the pass's bend (V's feet at the root: S1c F3's "V off arm").
        const xa = j.arms[ea];
        const xb = j.arms[eb];
        // K1314 s3 probe copy: the through pair corners too (the S1b/S1c fillet, K1049).
        const thruPair = xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6;
        const ne = j.arms.length;
        let st = styles[ea]?.style;
        if ((ea + 1) % ne !== eb && (eb + 1) % ne === ea) st = styles[eb]?.style;
        const style = st === "sharp" ? 0 : 1;
        const c = this.solveCorner(ji, a, b, th, style);
        if (c) { if (thruPair) this.thruCi.add(this.corners.length); this.addCorner(c); }
        else if (!thruPair) this.recordFail(ji, a, b, th);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Arms.

  armWindow(ai: number, d0 = 0, d1 = Infinity): [number, number] {
    const a = this.arms[ai];
    const lo = Math.max(0, d0);
    const hi = Math.min(a.L, d1);
    return a.dir > 0 ? [a.sR + lo, a.sR + hi] : [a.sR - hi, a.sR - lo];
  }

  armDist(ai: number, s: number): number {
    const a = this.arms[ai];
    const p = this.polys[a.pi];
    let d = (s - a.sR) * a.dir;
    if (p.closed) d = ((d % p.len) + p.len) % p.len;
    return d;
  }

  private readonly tans: ({ tx: Float64Array; ty: Float64Array } | undefined)[] = [];

  /** K1257: arm ai as the closed-form growth reads it, from V's foot on it. */
  private cfArm(ai: number, foot: Foot, u0: number): CfArmIn {
    const arm = this.arms[ai];
    const p = this.polys[arm.pi];
    let t = this.tans[arm.pi];
    if (!t) {
      t = polyTangents(p);
      this.tans[arm.pi] = t;
    }
    const [lo, hi] = this.armWindow(ai);
    return { p, tx: t.tx, ty: t.ty, lo, hi, foot, u0 };
  }

  footArm(ai: number, x: number, y: number, d0 = 0, d1 = Infinity): Foot {
    const [lo, hi] = this.armWindow(ai, d0, d1);
    return footInWindow(this.polys[this.arms[ai].pi], x, y, lo, hi);
  }

  /** Points at distance rho from both arms (2D Newton from x0, y0). */
  private solveEq(a: number, b: number, rho: number, x0: number, y0: number, wa: [number, number], wb: [number, number]) {
    let x = x0;
    let y = y0;
    const h = this.h;
    for (let it = 0; it < 60; it++) {
      const fa = this.footArm(a, x, y, wa[0], wa[1]);
      const fb = this.footArm(b, x, y, wb[0], wb[1]);
      const Fa = fa.d - rho;
      const Fb = fb.d - rho;
      if (Math.abs(Fa) < 1e-13 * Math.max(1, rho) && Math.abs(Fb) < 1e-13 * Math.max(1, rho)) return { x, y, fa, fb, ok: true };
      if (!(fa.d > 1e-12 && fb.d > 1e-12)) return { x, y, fa, fb, ok: false };
      const gax = (x - fa.x) / fa.d;
      const gay = (y - fa.y) / fa.d;
      const gbx = (x - fb.x) / fb.d;
      const gby = (y - fb.y) / fb.d;
      const det = gax * gby - gay * gbx;
      if (Math.abs(det) < 1e-12) return { x, y, fa, fb, ok: false };
      let dx = (-Fa * gby + Fb * gay) / det;
      let dy = (-Fb * gax + Fa * gbx) / det;
      const dl = Math.hypot(dx, dy);
      if (dl > h) {
        dx *= h / dl;
        dy *= h / dl;
      }
      x += dx;
      y += dy;
      if (it === 59) {
        const ga = this.footArm(a, x, y, wa[0], wa[1]);
        const gb = this.footArm(b, x, y, wb[0], wb[1]);
        const ok = Math.abs(ga.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(gb.d - rho) < 1e-9 * Math.max(h, rho);
        return { x, y, fa: ga, fb: gb, ok };
      }
    }
    return { x, y, fa: this.footArm(a, x, y), fb: this.footArm(b, x, y), ok: false };
  }

  /**
   * K1321: the corners solveCorner drops because V's feet lie outside the arms' spans (V found, in the
   * wedge). The census reference rounds their inner border with a disk of radius W about V
   * (k1314_census refEval); nothing here reads this list.
   */
  readonly vfail: { ji: number; a: number; b: number; Vx: number; Vy: number; ca: number; cb: number }[] = [];
  private recordFail(ji: number, a: number, b: number, th0: number): void {
    const h = this.h;
    const A = this.arms[a];
    const B = this.arms[b];
    if (!(A.L > 1e-9 && B.L > 1e-9)) return;
    const j = this.scene.junctions[ji];
    const reflex = th0 >= Math.PI - 1e-6;
    let bx = A.ux + B.ux;
    let by = A.uy + B.uy;
    if (reflex) {
      // The wedge's bisector: arm a's direction turned by θ/2 toward b.
      const cs = Math.cos(th0 / 2);
      const sn2 = Math.sin(th0 / 2);
      bx = A.ux * cs - A.uy * sn2;
      by = A.ux * sn2 + A.uy * cs;
    }
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl;
    by /= bl;
    const sn = Math.sin(th0 / 2);
    const full: [number, number] = [0, Infinity];
    const V = this.solveEq(a, b, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, full, full);
    if (!V.ok) return;
    const dVa = this.armDist(a, V.fa.s);
    const dVb = this.armDist(b, V.fb.s);
    const tol = 1e-9 * h;
    if (!reflex && dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol) return;
    const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
    const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
    if (reflex) {
      // Not inside the convex wedge from b to a.
      if (crossB > 0 && crossA < 0) return;
    } else {
      const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
      if (!(crossA * sgn > 0 && crossB * sgn < 0)) return;
    }
    // The span windows clamp a foot past the span to its end, so the V above can sit on that end's cap
    // (muse_hash j10: 0.075 off the paper's tip, inside the ink). Re-solve on the chains' own curves,
    // FOOT_EXT h past each span (footExt), from that V.
    const La = A.L;
    const Lb = B.L;
    let V2 = V;
    try {
      A.L = La + FOOT_EXT * h;
      B.L = Lb + FOOT_EXT * h;
      V2 = this.solveEq(a, b, h, V.x, V.y, full, full);
    } finally {
      A.L = La;
      B.L = Lb;
    }
    if (!V2.ok || Math.hypot(V2.x - V.x, V2.y - V.y) > 2 * h) return;
    // V on the tubes' boundary: no other arm of the junction covers it.
    for (let k = 0; k < this.arms.length; k++) {
      if (k === a || k === b || this.arms[k].j !== ji) continue;
      if (this.footArm(k, V2.x, V2.y).d < 0.95 * h) return;
    }
    this.vfail.push({ ji, a, b, Vx: V2.x, Vy: V2.y, ca: A.pi, cb: B.pi });
  }

  /** K1321: the foot on arm ai's chain up to FOOT_EXT h past its span (a dropped corner's V and disk). */
  footExt(ai: number, x: number, y: number): Foot {
    const a = this.arms[ai];
    const hi = a.L + FOOT_EXT * this.h;
    return footInWindow(this.polys[a.pi], x, y, a.dir > 0 ? a.sR : a.sR - hi, a.dir > 0 ? a.sR + hi : a.sR);
  }

  private solveCorner(ji: number, a: number, b: number, th0: number, style: number): Corner | null {
    const h = this.h;
    const A = this.arms[a];
    const B = this.arms[b];
    if (!(A.L > 1e-9 && B.L > 1e-9)) return null;
    const j = this.scene.junctions[ji];
    // Straight-arm start (proto.js): V = c + bis · h / sin(θ/2).
    let bx = A.ux + B.ux;
    let by = A.uy + B.uy;
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl;
    by /= bl;
    const sn = Math.sin(th0 / 2);
    const full: [number, number] = [0, Infinity];
    const V = this.solveEq(a, b, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn, full, full);
    if (!V.ok) {
      this.diagnostics.push(`corner j${j.id} arms ${A.ei},${B.ei}: no V`);
      return null;
    }
    const dVa = this.armDist(a, V.fa.s);
    const dVb = this.armDist(b, V.fb.s);
    const tol = 1e-9 * h;
    if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) return null;
    // V must lie in the wedge between the arms (the facing sides).
    const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
    const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
    const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
    if (!(crossA * sgn > 0 && crossB * sgn < 0)) return null;
    const pa = this.polys[A.pi];
    const pb = this.polys[B.pi];
    // S1d F3: the oracle's K992 corner, compact. θ is the opening of the
    // arms' chords at 2h (th0, from ux/uy), and the rule's r follows from it.
    // The ball grows along V's own branch of the medial axis with its feet
    // tracked, never chosen, and stops by measure: r = ∫ S dρ over ρ from h
    // to h + r_rule, S the running minimum over 32 fixed nodes of
    // w = ss(1 + min(0, mA, mB)/0.05h) · ss((den/den(V) − 0.3)/0.4) ·
    // ss(slack/0.5h): the margin gate (below), the steep gate (den = 1 + nA·nB)
    // and the cap gate (slack = L − W − the foot's distance from the root, the
    // smaller of the two arms). Each w is continuous in the
    // geometry, and so is r: no root, bisection or nearest foot is chosen
    // (S1c F3's root, radius bisect and tangent foot).
    const theta = th0;
    const t2 = Math.tan(theta / 2);
    const r0 = style * (this.cr / 3) * Math.min(2 * h, 1.5 * h * t2);
    const winA = this.armWindow(a);
    const winB = this.armWindow(b);
    type TFoot = Foot & { u: number };
    type Tk = { x: number; y: number; fa: TFoot; fb: TFoot };
    // A tracked foot: the nearest point within h/32 of the last one, the
    // window moved while the foot sits on its edge (the oracle's footLocal).
    // u is the foot's s in the arm window's domain.
    const footT = (p: Poly, win: [number, number], x: number, y: number, s0: number): TFoot => {
      const w = h / 32;
      let s = Math.min(Math.max(s0, win[0]), win[1]);
      for (let it = 0; ; it++) {
        const lo = Math.max(win[0], s - w);
        const hi = Math.min(win[1], s + w);
        const f = footInWindow(p, x, y, lo, hi);
        const u = s + dS(p, s, f.s);
        const edge = (u <= lo + 1e-9 * h && lo > win[0]) || (u >= hi - 1e-9 * h && hi < win[1]);
        if (!edge || it >= 4096 || Math.abs(u - s) <= 1e-12 * h) return { ...f, u };
        s = u;
      }
    };
    // Newton on |q − tracked foot| = ρ on both arms, its step held to limit.
    const newtonT = (rho: number, x0: number, y0: number, uA: number, uB: number, limit: number): Tk & { ok: boolean } => {
      let x = x0;
      let y = y0;
      let fA = footT(pa, winA, x, y, uA);
      let fB = footT(pb, winB, x, y, uB);
      for (let it = 0; it < 60; it++) {
        const ra = fA.d - rho;
        const rb = fB.d - rho;
        if (Math.abs(ra) < 1e-12 * Math.max(1, rho) && Math.abs(rb) < 1e-12 * Math.max(1, rho)) break;
        if (!(fA.d > 1e-12 && fB.d > 1e-12)) break;
        const nax = (x - fA.x) / fA.d;
        const nay = (y - fA.y) / fA.d;
        const nbx = (x - fB.x) / fB.d;
        const nby = (y - fB.y) / fB.d;
        const det = nax * nby - nay * nbx;
        if (Math.abs(det) < 1e-12) break;
        let dx = (-ra * nby + rb * nay) / det;
        let dy = (-nax * rb + nbx * ra) / det;
        const dl = Math.hypot(dx, dy);
        if (dl > limit) {
          dx *= limit / dl;
          dy *= limit / dl;
        }
        x += dx;
        y += dy;
        fA = footT(pa, winA, x, y, fA.u);
        fB = footT(pb, winB, x, y, fB.u);
      }
      const ok = Math.max(Math.abs(fA.d - rho), Math.abs(fB.d - rho)) < 1e-9 * Math.max(1, rho);
      return { x, y, fa: fA, fb: fB, ok };
    };
    // V's branch from ρ0 toward ρT: predict along u (nA·u = nB·u = 1) and
    // polish with Newton held near the prediction; a miss halves the step,
    // down to 1e-5h. Returns the farthest point reached and its ρ.
    const advance = (from: Tk, rho0: number, rhoT: number, st0: number): { p: Tk; rho: number } => {
      let p = from;
      let rc = rho0;
      let st = st0;
      while (rhoT - rc > 1e-12 * rhoT) {
        const rn = Math.min(rhoT, rc + st);
        const dd = rn - rc;
        const nax = (p.x - p.fa.x) / p.fa.d;
        const nay = (p.y - p.fa.y) / p.fa.d;
        const nbx = (p.x - p.fb.x) / p.fb.d;
        const nby = (p.y - p.fb.y) / p.fb.d;
        const den = 1 + nax * nbx + nay * nby;
        let next: Tk | null = null;
        if (den > 1e-9) {
          const ux = (nax + nbx) / den;
          const uy = (nay + nby) / den;
          const gx = p.x + ux * dd;
          const gy = p.y + uy * dd;
          const acc = Math.min(h, Math.max(0.5 * Math.hypot(ux, uy) * dd, 1e-3 * h));
          const n = newtonT(rn, gx, gy, p.fa.u, p.fb.u, acc);
          if (n.ok && Math.hypot(n.x - gx, n.y - gy) <= acc) next = n;
        }
        if (next) {
          p = next;
          rc = rn;
          st = Math.min(st0, 2 * st);
        } else {
          st /= 2;
          if (st < 1e-5 * h) break;
        }
      }
      // Within the loop's tolerance of the target counts as there: ρ is then
      // the target itself, so a reached node is never read as the branch's end.
      return { p, rho: rhoT - rc <= 1e-12 * rhoT ? rhoT : rc };
    };
    const denOf = (p: Tk): number => 1 + ((p.x - p.fa.x) * (p.x - p.fb.x) + (p.y - p.fa.y) * (p.y - p.fb.y)) / ((p.fa.d || 1) * (p.fb.d || 1));
    const slackOf = (p: Tk): number => Math.min(A.L - this.W - (p.fa.u - A.sR) * A.dir, B.L - this.W - (p.fb.u - B.sR) * B.dir);
    const v0: Tk = { x: V.x, y: V.y, fa: { ...V.fa, u: A.sR + A.dir * dVa }, fb: { ...V.fb, u: B.sR + B.dir * dVb } };
    const denV = denOf(v0);
    // The margin gate (the oracle's K992 s3 overlap gate): how much nearer to
    // q the arm's window comes, outside the tracked foot's basin (the run
    // around the foot where the distance to q rises, out to the first vertex
    // where it starts to fall), than the foot itself. The ball stops over a
    // margin from 0 to −0.05h, before another part of the arm is nearer than
    // its contact, instead of a foot jumping there (or tracking a polyline
    // segment's own foot past the arc's centre of curvature).
    // K1257: the walks start from the foot's own segment kf (the outline's
    // marginOfC), not the segment pointAt picks at sf: at a vertex the two
    // can differ.
    const marginOf = (pl: Poly, x: number, y: number, sf: number, kf: number, win: [number, number], dc: number): number => {
      const base = sf - normS(pl, sf);
      let hi = win[1];
      let k = kf;
      let bk = base;
      for (let it = 0; it <= pl.nseg; it++) {
        const sv = bk + pl.s[k] + pl.segLen[k];
        if (sv >= win[1]) break;
        let k2 = k + 1;
        let b2 = bk;
        if (k2 >= pl.nseg) {
          if (!pl.closed) break;
          k2 = 0;
          b2 = bk + pl.len;
        }
        const e = segB(pl, k2);
        if ((pl.x[k2] - x) * (pl.x[e] - pl.x[k2]) + (pl.y[k2] - y) * (pl.y[e] - pl.y[k2]) < 0) {
          hi = sv;
          break;
        }
        k = k2;
        bk = b2;
      }
      let lo = win[0];
      k = kf;
      bk = base;
      for (let it = 0; it <= pl.nseg; it++) {
        const sv = bk + pl.s[k];
        if (sv <= win[0]) break;
        let k2 = k - 1;
        let b2 = bk;
        if (k2 < 0) {
          if (!pl.closed) break;
          k2 = pl.nseg - 1;
          b2 = bk - pl.len;
        }
        if ((pl.x[k] - x) * (pl.x[k2] - pl.x[k]) + (pl.y[k] - y) * (pl.y[k2] - pl.y[k]) < 0) {
          lo = sv;
          break;
        }
        k = k2;
        bk = b2;
      }
      let d2 = Infinity;
      if (lo > win[0]) d2 = footInWindow(pl, x, y, win[0], lo).d;
      if (hi < win[1]) d2 = Math.min(d2, footInWindow(pl, x, y, hi, win[1]).d);
      return d2 - dc;
    };
    // K1163: this corner's root band: the flat band scaled by the tip
    // factor at theta, so a near-straight corner's round is not clamped
    // where a null would move almost no ink. At ROOT_BAND_REF_THETA the
    // scale is exactly 1 ('tip' is bit-identical to 'flat' there); a band
    // under 1e-9*h acts as its step limit, with no division by zero.
    const rbEff = Math.max(this.rootBand * h * (this.rootBandScale === "tip" ? rootTipScale(theta) : 1), 1e-9 * h);
    // K1257: the outline's wOfC: the cheap gates first, a zero ends the
    // evaluation (the margins are skipped), and the product in its order.
    const wOf = (p: Tk): number => {
      const fSteep = ss(0, 1, ((Math.abs(denV) > 1e-12 ? denOf(p) / denV : 0) - 0.3) / 0.4);
      if (fSteep === 0) return 0;
      const fSlack = ss(0, 1, slackOf(p) / (0.5 * h));
      if (fSlack === 0) return 0;
      // S1g: the root gate (rootBand), each foot's distance from its root,
      // over this corner's band rbEff (K1163's tip scaling above).
      let fRootA = 1;
      let fRootB = 1;
      if (this.rootBand > 0) {
        fRootA = ss(0, 1, ((p.fa.u - A.sR) * A.dir) / rbEff);
        if (fRootA === 0) return 0;
        fRootB = ss(0, 1, ((p.fb.u - B.sR) * B.dir) / rbEff);
        if (fRootB === 0) return 0;
      }
      const mA = marginOf(pa, p.x, p.y, p.fa.u, p.fa.k, winA, p.fa.d);
      if (mA <= -0.05 * h) return 0;
      const mB = marginOf(pb, p.x, p.y, p.fb.u, p.fb.k, winB, p.fb.d);
      if (mB <= -0.05 * h) return 0;
      const w = ss(0, 1, 1 + Math.min(0, mA, mB) / (0.05 * h)) * fSteep * fSlack;
      return this.rootBand > 0 ? w * fRootA * fRootB : w;
    };
    let r = 0;
    let q = v0;
    let room = slackOf(v0);
    // K1257: the outline's closed-form growth (corner_cf.ts): q on V's
    // branch in closed-form pieces, S = the running minimum of w
    // integrated by an adaptive trapezoid. A corner whose pieces cannot
    // start at V grows the old way (below).
    let cfDone = false;
    if (r0 > 1e-9) {
      const tkOf = (): Tk => ({ x: CF.qx, y: CF.qy, fa: { ...CF.fa }, fb: { ...CF.fb } });
      const rr = CF.grow(h, V.x, V.y, r0, denV, this.cfArm(a, V.fa, v0.fa.u), this.cfArm(b, V.fb, v0.fb.u), () => {
        const p = tkOf();
        room = Math.min(room, slackOf(p));
        return wOf(p);
      });
      if (rr >= 0) {
        cfDone = true;
        r = rr;
        // The outline's corner keeps V's feet (its tangent points at V) when r <= 1e-9.
        if (rr > 1e-9) q = tkOf();
      }
    }
    if (r0 > 1e-9 && !cfDone) {
      const dN = r0 / 32;
      const nodes: Tk[] = [v0];
      let sPrev = wOf(v0);
      let integ = 0;
      for (let k = 1; k <= 32 && sPrev > 0; k++) {
        const rho0 = h + (k - 1) * dN;
        const adv = advance(nodes[k - 1], rho0, h + k * dN, dN);
        const sK = Math.min(sPrev, wOf(adv.p));
        integ += 0.5 * (sPrev + sK) * (adv.rho - rho0);
        room = Math.min(room, slackOf(adv.p));
        if (adv.rho < h + k * dN) break; // the branch ends here: S is 0 past it
        nodes.push(adv.p);
        sPrev = sK;
      }
      // q: the branch at ρ = h + r, from the node at or below it.
      const k0 = Math.min(nodes.length - 1, Math.floor(integ / dN));
      const adv = advance(nodes[k0], h + k0 * dN, h + integ, dN);
      q = adv.p;
      r = adv.rho - h;
    }
    const r1 = r;
    const fa = q.fa;
    const fb = q.fb;
    const sol = { da: (fa.u - A.sR) * A.dir, db: (fb.u - B.sR) * B.dir };
    const tax = fa.x + (h * (q.x - fa.x)) / fa.d;
    const tay = fa.y + (h * (q.y - fa.y)) / fa.d;
    const tbx = fb.x + (h * (q.x - fb.x)) / fb.d;
    const tby = fb.y + (h * (q.y - fb.y)) / fb.d;
    // The overlap gate: how much nearer another part of either arm comes to q than its foot.
    let ov = 0;
    const R = h + r;
    for (const [ai, f] of [
      [a, fa],
      [b, fb],
    ] as const) {
      const arm = this.arms[ai];
      const p = this.polys[arm.pi];
      const out: Cand[] = [];
      candidates(this.grid, q.x, q.y, R, out, arm.pi);
      for (const c of out) {
        const dd = this.armDist(ai, c.s);
        if (dd < 0 || dd > arm.L) continue;
        if (Math.abs(dS(p, c.s, f.s)) < 0.5 * h) continue;
        ov = Math.max(ov, R - c.d);
      }
    }
    // S1d F4: past the margin gate's band. r = ∫S stops the ball where another
    // part of an arm comes up to 0.05h nearer q than its foot (the margin gate,
    // above), so ω fades only an overlap past that band, one the margin gate
    // did not stop.
    const omega = this.force.omega ?? ss(0, 1, 1 - (ov - 0.05 * h) / this.ovw);
    return {
      j: ji,
      g: this.groupOf[ji],
      a,
      b,
      ok: true,
      style,
      theta,
      r0,
      r1,
      r,
      room,
      Vx: V.x,
      Vy: V.y,
      qx: q.x,
      qy: q.y,
      tax,
      tay,
      tbx,
      tby,
      dVa,
      dVb,
      dA: sol.da,
      dB: sol.db,
      sA: fa.s,
      sB: fb.s,
      kA: fa.k,
      kB: fb.k,
      zA: zAt(pa, fa.s),
      zB: zAt(pb, fb.s),
      omega,
      ov,
      rV: Math.hypot(V.x - q.x, V.y - q.y),
    };
  }

  private addCorner(c: Corner): void {
    const ci = this.corners.length;
    this.corners.push(c);
    const R = Math.max(c.rV, c.r + this.W) + 2 * this.W + 4 * this.aa;
    const cs = this.cell;
    const x0 = Math.floor((c.qx - R) / cs);
    const x1 = Math.floor((c.qx + R) / cs);
    const y0 = Math.floor((c.qy - R) / cs);
    const y1 = Math.floor((c.qy + R) / cs);
    for (let i = x0; i <= x1; i++)
      for (let k = y0; k <= y1; k++) {
        const key = this.ckey(i, k);
        let l = this.cgrid.get(key);
        if (!l) this.cgrid.set(key, (l = []));
        l.push(ci);
      }
  }

  private ckey(i: number, k: number): number {
    return (i + 32768) * 65536 + (k + 32768);
  }

  cornersNear(x: number, y: number): number[] {
    return this.cgrid.get(this.ckey(Math.floor(x / this.cell), Math.floor(y / this.cell))) ?? [];
  }

  // -------------------------------------------------------------------------
  // Corner geometry per pixel.

  inWedge(c: Corner, x: number, y: number): boolean {
    const rax = c.tax - c.qx;
    const ray = c.tay - c.qy;
    const rbx = c.tbx - c.qx;
    const rby = c.tby - c.qy;
    const wx = x - c.qx;
    const wy = y - c.qy;
    const s = rax * rby - ray * rbx;
    if (Math.abs(s) < 1e-300) return false;
    return (rax * wy - ray * wx) * s >= 0 && (wx * rby - wy * rbx) * s >= 0;
  }

  /**
   * The fill: the curvilinear triangle V, t_a, t_b outside the ball. Its sides
   * reach 2aa into the arms' tubes, where their burial ramps (winW) reach 1,
   * so a fill and a tube that abut at V bury without a dip (S1b F5). With
   * `own`, the piece whose outline point (x, y) is, the side test against
   * own's arm is skipped: the point lies on that side by construction, and
   * the test read polyline rounding (S1b F4).
   */
  inFill(c: Corner, x: number, y: number, own?: Piece): boolean {
    if (!(c.r > 0 && c.omega > 0)) return false;
    const dq = Math.hypot(x - c.qx, y - c.qy);
    // Past V to V', where the two sides' 2aa overlaps meet.
    if (!(dq > c.r) || dq > c.rV + (2 * this.aa) / Math.max(0.1, Math.sin(c.theta / 2)) + 1e-12) return false;
    if (!this.inWedge(c, x, y)) return false;
    const h = this.h;
    const lim = h - 2 * this.aa;
    if (!(own && this.onArm(c.a, own))) {
      const fa = this.footArm(c.a, x, y, 0, Math.max(c.dVa, c.dA) + 2 * h);
      if (fa.d < lim) return false;
    }
    if (own && this.onArm(c.b, own)) return true;
    const fb = this.footArm(c.b, x, y, 0, Math.max(c.dVb, c.dB) + 2 * h);
    return fb.d >= lim;
  }

  /** Is piece A on arm ai (its chain, inside the arm's span)? */
  onArm(ai: number, A: Piece): boolean {
    const a = this.arms[ai];
    if (a.pi !== A.chain) return false;
    const d = this.armDist(ai, A.s);
    return d >= -1e-12 && d <= a.L + 1e-12;
  }

  // -------------------------------------------------------------------------
  // Per pixel.

  /** The group a piece at (chain, s) belongs to, and its cap ramp. */
  member(pi: number, s: number): { g: number; ramp: number } {
    let g = -1;
    let ramp = 0;
    for (const ai of this.armsOf[pi]) {
      const a = this.arms[ai];
      const d = this.armDist(ai, s);
      if (d < -1e-12 || d > a.L + 1e-12) continue;
      const fc = this.force.cap;
      const rp = a.Lcut === Infinity ? 1 : fc !== undefined && d > a.Lcut - this.lambda && d < a.Lcut ? fc : ss(a.Lcut, a.Lcut - this.lambda, d);
      if (g < 0 || rp > ramp) {
        g = a.g;
        ramp = rp;
      }
    }
    // A cut nearer its root than λ reaches back past the root (S1b F10): the
    // group's arm on the root's other side fades with it, so a chain through
    // a junction keeps one continuous ramp where its two arms meet.
    if (g >= 0 && ramp > 0) {
      const p = this.polys[pi];
      const fc = this.force.cap;
      for (const ai of this.armsOf[pi]) {
        const a = this.arms[ai];
        if (a.g !== g || a.Lcut === Infinity) continue;
        let d = this.armDist(ai, s);
        if (p.closed && d > p.len / 2) d -= p.len;
        if (!(d < 1e-12 && d > a.Lcut - this.lambda)) continue;
        ramp = Math.min(ramp, fc !== undefined && d < a.Lcut ? fc : ss(a.Lcut, a.Lcut - this.lambda, d));
      }
    }
    return { g, ramp: g < 0 ? 1 : ramp };
  }

  pieces(x: number, y: number, out: Piece[]): number {
    const h = this.h;
    out.length = 0;
    candidates(this.grid, x, y, h + this.W + 2 * this.aa, this.cbuf);
    const cs = this.cbuf.length ? this.cbuf.slice().sort((u, v) => u.d - v.d) : EMPTY;
    let fade = 0;
    const kept: Cand[] = [];
    // D1's merge blend (S1e): the minima each kept one dropped.
    const drop: Cand[][] = [];
    for (const c of cs) {
      const p = this.polys[c.chain];
      let into = -1;
      for (let i = 0; i < kept.length; i++) {
        const q = kept[i];
        if (q.chain === c.chain && Math.abs(dS(p, q.s, c.s)) <= this.sigma) {
          into = i;
          break;
        }
      }
      // A merge is no fade (S1b F2): the dropped minimum would enter at weight
      // 0. It keeps a foot term at its blend weight instead (S1e).
      if (into >= 0) {
        drop[into].push(c);
        continue;
      }
      kept.push(c);
      drop.push([]);
    }
    for (const c of kept) {
      const p = this.polys[c.chain];
      const sg = segOfS(p, c.s);
      let vtx = -1;
      if (sg.t < 1e-9) vtx = sg.k;
      else if (sg.t > 1 - 1e-9) vtx = segB(p, sg.k);
      const m = this.member(c.chain, c.s);
      const z = zAt(p, c.s);
      out.push({
        idx: out.length,
        chain: c.chain,
        s: c.s,
        d: c.d,
        fx: c.fx,
        fy: c.fy,
        k: sg.k,
        vtx,
        z,
        key: this.K === Infinity ? z : z - c.d / this.K,
        g: m.g,
        surf: m.g >= 0 ? m.g : OWN + out.length,
        ramp: m.ramp,
        selfW: 1,
        alts: NO_ALTS,
      });
    }
    if (this.fold)
      for (let i = 0; i < out.length; i++)
        for (let k = i + 1; k < out.length; k++) {
          const A = out[i];
          const B = out[k];
          if (A.chain !== B.chain) continue;
          const ds = Math.abs(dS(this.polys[A.chain], A.s, B.s));
          if (ds >= 2 * this.sigma) continue;
          fade |= F_FOLD;
          const far = A.d >= B.d ? A : B;
          far.selfW = Math.min(far.selfW, this.force.fold ?? ss(this.sigma, 2 * this.sigma, ds));
        }
    if (this.delta > 0)
      for (let i = 0; i < out.length; i++) {
        const A = out[i];
        const p = this.polys[A.chain];
        let alts: Alt[] | null = null;
        for (const c of drop[i]) {
          const beta = this.mergeW(p, kept[i], c, x, y);
          if (!(beta > 0)) continue;
          const sg = segOfS(p, c.s);
          const vtx = sg.t < 1e-9 ? sg.k : sg.t > 1 - 1e-9 ? segB(p, sg.k) : -1;
          (alts ??= []).push({ ...A, s: c.s, d: c.d, fx: c.fx, fy: c.fy, k: sg.k, vtx, alts: NO_ALTS, beta });
        }
        if (alts) A.alts = alts;
      }
    return fade;
  }

  /**
   * S1e F4: how far a crossing's overlap reaches back along chain pi from
   * pass x, toward the arm's root (s − dir·e). Two straight threads crossing
   * at θ overlap out to r0 = h·cot(θ/2), where the arm's centreline lies
   * h(1 + cos θ) from the partner's; this walks the curved threads, in steps
   * of 0.004 with a linear fit over the last one and the partner's foot
   * tracked, to the first point where it does. Never past r0, which it
   * equals on straight threads; a near-tangent pass (θ → 0, r0 → ∞) reaches
   * only as far as the two threads stay together.
   */
  curvedReachOf(pi: number, x: Pass, dir: number, r0: number, hw: number): number {
    const pa = this.polys[pi];
    const pq = this.polys[x.qi];
    const target = hw * (1 + Math.cos(x.theta));
    const step = 0.004;
    const lim = Math.min(r0, 40);
    const win = 4 * step + 0.02;
    let sPartner = x.sq;
    let eLast = 0;
    let dLast = 0;
    for (let i = 1; i * step <= lim + 1e-12; i++) {
      const e = i * step;
      let sArm = x.s - dir * e;
      if (pa.closed) sArm = normS(pa, sArm);
      else if (sArm < pa.s0 || sArm > pa.s0 + pa.len) break;
      const at = pointAt(pa, sArm);
      const lo = pq.closed ? sPartner - win : Math.max(pq.s0, sPartner - win);
      const hi = pq.closed ? sPartner + win : Math.min(pq.s0 + pq.len, sPartner + win);
      const ft = footInWindow(pq, at.x, at.y, lo, hi);
      sPartner = ft.s;
      if (ft.d >= target) return Math.min(r0, eLast + ((target - dLast) / (ft.d - dLast)) * (e - eLast));
      eLast = e;
      dLast = ft.d;
    }
    return r0;
  }

  /**
   * S1f: a crossing's reach on the curved threads, continuous by
   * construction. Behind pass x (toward the arm's root, s − dir·e) the two
   * threads' separation is modelled as g(e) = a·e + ½κe², κ ≥ 0, with a and
   * the target T from the straight model, so that T/a = r0 = h·cot(θ/2):
   *   chord (default): g = |c_a(s − dir·e) − c_b(s_q + σe)|, the chord at
   *     matched arc length, a = 2 sin(θ/2), T = 2h cos(θ/2);
   *   line: g = the distance from c_a(s − dir·e) to the partner's tangent
   *     line at c_b(s_q + σe), a = sin θ, T = h(1 + cos θ).
   * κ is fitted to g measured at one sample e_k, κ = max(0, 2(g − a·e_k)/e_k²),
   * and the model's reach e* = 2T/(a + √(a² + 2κT)) solves g(e*) = T in
   * closed form: r0 where κ = 0 (straight threads, or threads that close
   * in), never above r0, finite at θ = 0. reachSteps fits, the first at
   * e = fl and each next one at max(fl, e*), every sample clamped to the
   * arc behind the pass (an open chain's end; half a closed chain). Each
   * step is a closed form of the geometry (two pointAt, no search, no first
   * crossing), so e* is continuous in it: where the partner comes back (an
   * eye), the fit's κ shrinks and e* grows smoothly toward r0.
   *
   * σ picks the partner's half that runs back with the arm (the acute side,
   * the sign of −dir·t_a·t_b). It flips only at θ = π/2, where r0 = h ≤ fl
   * and the caller's min(r0, max(fl, e*)) never reads e*.
   */
  quadReachOf(pi: number, x: Pass, dir: number, hw: number, fl: number): number {
    const pa = this.polys[pi];
    const pq = this.polys[x.qi];
    const ta = tanAt(pa, x.s);
    const tb = tanAt(pq, x.sq);
    const sb = -dir * (ta.tx * tb.tx + ta.ty * tb.ty) >= 0 ? 1 : -1;
    const line = this.reachSep === "line";
    const a = line ? Math.sin(x.theta) : 2 * Math.sin(x.theta / 2);
    const T = line ? hw * (1 + Math.cos(x.theta)) : 2 * hw * Math.cos(x.theta / 2);
    const eA = pa.closed ? pa.len / 2 : dir > 0 ? x.s - pa.s0 : pa.s0 + pa.len - x.s;
    let r = a > 0 ? T / a : Infinity;
    let e = fl;
    for (let k = 0; k < this.reachSteps; k++) {
      // A pass within reach of an open chain's end: the sample shrinks with
      // the arc (continuous; every arm root that way lies within it).
      const ek = Math.max(1e-6, Math.min(e, eA));
      const A = pointAt(pa, x.s - dir * ek);
      const sB = x.sq + sb * ek;
      const B = pointAt(pq, sB);
      const dx = A.x - B.x;
      const dy = A.y - B.y;
      let g: number;
      if (line) {
        const tq = tanAt(pq, sB);
        g = Math.abs(dx * tq.ty - dy * tq.tx);
      } else g = Math.sqrt(dx * dx + dy * dy);
      const kap = Math.max(0, (2 * (g - a * ek)) / (ek * ek));
      r = (2 * T) / (a + Math.sqrt(a * a + 2 * kap * T));
      e = Math.max(fl, r);
    }
    return r;
  }

  /**
   * D1's merge blend (S1e): the weight of a minimum X that the merge drops
   * into the nearer A of its chain,
   *   β = ss(1, 0, u) · ss(δ, 0, d_X − d_A) · ss(σ, σ/2, |Δs|),
   * u = (d_X − d_A)/(m − d_A), m the largest distance from (x, y) along the
   * chain between the two (the barrier; distance along a segment is convex,
   * so m sits at a vertex between them, or at A or X). β is 1 where X ties
   * A, so the pick switches with both feet at full weight on both sides; 0
   * where X is born (m = d_X), δ farther than A, or σ away along the chain,
   * where the fold's far piece enters at weight 0. Each factor is
   * continuous in the geometry: m gains or loses a vertex only where a
   * minimum passes it, at that minimum's distance.
   */
  mergeW(p: Poly, A: Cand, X: Cand, x: number, y: number): number {
    const gap = X.d - A.d;
    if (!(gap < this.delta)) return 0;
    const ds = dS(p, A.s, X.s);
    const fs = ss(this.sigma, this.sigma / 2, Math.abs(ds));
    if (!(fs > 0)) return 0;
    let m = Math.max(A.d, X.d);
    const a = segOfS(p, A.s);
    const b = segOfS(p, X.s);
    if (a.k !== b.k) {
      const fwd = ds > 0;
      let i = fwd ? segB(p, a.k) : a.k;
      const end = fwd ? b.k : segB(p, b.k);
      for (let guard = 0; guard <= p.n; guard++) {
        m = Math.max(m, Math.hypot(x - p.x[i], y - p.y[i]));
        if (i === end) break;
        if (fwd) i = i + 1 < p.n ? i + 1 : p.closed ? 0 : -1;
        else i = i > 0 ? i - 1 : p.closed ? p.n - 1 : -1;
        if (i < 0) break;
      }
    }
    const den = m - A.d;
    const u = den > 1e-15 ? Math.min(1, gap / den) : 0;
    return ss(1, 0, u) * ss(this.delta, 0, gap) * fs;
  }

  /** Is (x, y) within h of B's chain, read from ±3 segments around B's nearest segment? */
  insideWin(B: Piece, x: number, y: number): boolean {
    const p = this.polys[B.chain];
    const h2 = this.h * this.h;
    for (let o = -3; o <= 3; o++) {
      let k = B.k + o;
      if (p.closed) k = ((k % p.nseg) + p.nseg) % p.nseg;
      else if (k < 0 || k >= p.nseg) continue;
      const b = segB(p, k);
      if (closestOnSeg(x, y, p.x[k], p.y[k], p.x[b], p.y[b]).d2 < h2) return true;
    }
    return false;
  }

  /**
   * How deep (x, y) lies in B's tube, read from the same window as
   * insideWin: 0 on B's outline, rising to 1 at 2aa inside it. A burial is a
   * ramp, not a cut. It lies inside the tube, so an outline that only touches
   * B (a dead end's cap on a through's far side) stays whole, and the fill
   * overlaps it (inFill), so the two bury without a dip (S1b F5).
   */
  winW(B: Piece, x: number, y: number): number {
    const p = this.polys[B.chain];
    let d2 = Infinity;
    for (let o = -3; o <= 3; o++) {
      let k = B.k + o;
      if (p.closed) k = ((k % p.nseg) + p.nseg) % p.nseg;
      else if (k < 0 || k >= p.nseg) continue;
      const b = segB(p, k);
      d2 = Math.min(d2, closestOnSeg(x, y, p.x[k], p.y[k], p.x[b], p.y[b]).d2);
    }
    return 1 - ss(this.h - 2 * this.aa, this.h, Math.sqrt(d2));
  }

  band(D: number): number {
    return 1 - ss(this.W - this.aa, this.W + this.aa, D);
  }

  band2(D: number): number {
    return this.band(D) * ss(-this.aa, this.aa, D);
  }

  /**
   * S's coverage at (x, y): its pieces' outline AA at their fold weight (a
   * folding far piece fades out whole, ink and cover, finding F3), and its
   * fills at weight ω. fade: F_OMEGA when a partial fill sets it.
   */
  alphaOf(S: number, x: number, y: number, P: Piece[]): { a: number; fade: number } {
    let aP = 0;
    for (const A of P) if (A.surf === S) aP = Math.max(aP, A.selfW * ss(-this.aa, this.aa, this.h - A.d));
    let aF = 0;
    let om = 1;
    if (S < OWN && aP < 1)
      for (const ci of this.cornersNear(x, y)) {
        const c = this.corners[ci];
        if (c.g !== S || !(c.r > 0 && c.omega > 0)) continue;
        const dq = Math.hypot(x - c.qx, y - c.qy);
        if (dq > c.rV * (1 + 1e-9) + 1e-12 || !this.inWedge(c, x, y)) continue;
        const f = c.omega * ss(-this.aa, this.aa, dq - c.r);
        if (f > aF) {
          aF = f;
          om = c.omega;
        }
      }
    return { a: Math.max(aP, aF), fade: aF > aP && om < 1 ? F_OMEGA : 0 };
  }

  /**
   * The ink of surface S at (x, y) as if S were on top, premultiplied by S's
   * coverage a: max over its exposed-outline terms of weight · band. The
   * endpoint discs (t_a, t_b, V) are clipped by a, so no term reaches past S's
   * own outline AA (finding F4).
   */
  inkOf(S: number, x: number, y: number, P: Piece[]): { v: number; term: Term | null; fade: number; Dexp: number; a: number; afade: number } {
    const h = this.h;
    const W = this.W;
    const aa = this.aa;
    let v = 0;
    let term: Term | null = null;
    let fade = 0;
    let Dexp = Infinity;
    const near = S < OWN ? this.cornersNear(x, y) : [];
    const al = this.alphaOf(S, x, y, P);
    const aS = al.a;
    const take = (val: number, t: Term) => {
      if (val > v) {
        v = val;
        term = t;
      }
    };
    // One foot term: piece A's own (X = A, β = 1), or a minimum X that D1's
    // merge dropped into A, at its blend weight β (S1e). X is buried as A
    // would be, by the pieces other than A (one chain's minima within σ never
    // bury each other), and the corner rules read X's own s.
    const foot = (A: Piece, X: Piece, beta: number) => {
      if (!(X.d < h + aa && X.d > h - W - aa && X.d > 1e-12)) return;
      const fx = X.fx + (h * (x - X.fx)) / X.d;
      const fy = X.fy + (h * (y - X.fy)) / X.d;
      let bur = 0;
      let burBit = 0;
      for (const B of P) {
        if (B === A || B.surf !== S) continue;
        // A member buries at full weight whatever either cap ramp reads (S1c
        // F2): the ramps weigh the configurations in evalPoint instead.
        const w = B.selfW;
        if (w <= bur) continue;
        const wb = w * this.winW(B, fx, fy);
        if (wb > bur) {
          bur = wb;
          burBit = w < 1 ? F_FOLD : 0;
        }
      }
      // A corner whose two arms are one chain (the chain turns back through
      // the junction) has one piece wherever the arms lie within σ, so no
      // piece buries A's outline in the other arm's tube. Read that tube from
      // the arm, with winW's ramp, so the fill's side meets a burial (S1b F9).
      for (const ci of near) {
        if (bur >= 1) break;
        const c = this.corners[ci];
        if (c.g !== S || this.arms[c.a].pi !== X.chain || this.arms[c.b].pi !== X.chain) continue;
        const other = this.onArm(c.a, X) ? c.b : this.onArm(c.b, X) ? c.a : -1;
        if (other < 0) continue;
        const span = other === c.a ? Math.max(c.dVa, c.dA) : Math.max(c.dVb, c.dB);
        const wt = 1 - ss(h - 2 * aa, h, this.footArm(other, fx, fy, 0, span + 2 * h).d);
        if (wt > bur) {
          bur = wt;
          burBit = 0;
        }
      }
      // A partial fill hands the buried weight to its arc (S1b F6): the
      // term is (1 − ω)·A's band + ω·the arc's band, the two outlines' blend,
      // so the cut at t_a's normal, where the two bands meet, is continuous.
      let arc = 0;
      for (const ci of near) {
        const c = this.corners[ci];
        if (c.g !== S || !(c.omega > 0) || (c.omega >= 1 && bur >= 1)) continue;
        if (!this.inFill(c, fx, fy, X)) continue;
        if (c.omega > bur) {
          bur = c.omega;
          burBit = F_OMEGA;
        }
        // The arc keeps its share where a deeper burial wins the max (S1b
        // F11): (1 − bur)·A's band + ω·the arc's band, continuous where the
        // burial passes ω.
        if (c.omega < 1) arc = Math.max(arc, c.omega * this.band2(Math.hypot(x - c.qx, y - c.qy) - c.r));
      }
      const w = (1 - bur) * A.selfW * beta;
      const D = h - X.d;
      const b2 = this.band2(D);
      if (b2 > 0) {
        if (bur > 0 && bur < 1) fade |= burBit;
        if (A.selfW < 1) fade |= F_FOLD;
        if (beta < 1 && bur < 1) fade |= F_MERGE;
      }
      if (arc > 0) fade |= F_OMEGA;
      if (w >= 0.5) Dexp = Math.min(Dexp, D);
      const val = w * b2 + beta * arc;
      take(val, { kind: T_FOOT, surf: S, chain: X.chain, s: X.s, k: X.k, vtx: X.vtx, corner: -1, D, w, v: val });
    };
    for (const A of P) {
      if (A.surf !== S) continue;
      foot(A, A, 1);
      for (const X of A.alts) foot(A, X, X.beta);
    }
    for (const ci of near) {
      const c = this.corners[ci];
      if (c.g !== S) continue;
      const om = c.omega;
      const omBit = om > 0 && om < 1 ? F_OMEGA : 0;
      if (aS > 0) {
        if (om > 0) {
          const DA = Math.hypot(x - c.tax, y - c.tay);
          const DB = Math.hypot(x - c.tbx, y - c.tby);
          const bA = aS * this.band(DA);
          const bB = aS * this.band(DB);
          if (bA > 0 || bB > 0) fade |= omBit;
          if (om >= 0.5 && aS >= 0.5) Dexp = Math.min(Dexp, DA, DB);
          take(om * bA, { kind: T_TA, surf: S, chain: this.arms[c.a].pi, s: c.sA, k: c.kA, vtx: -1, corner: ci, D: DA, w: om, v: om * bA });
          take(om * bB, { kind: T_TB, surf: S, chain: this.arms[c.b].pi, s: c.sB, k: c.kB, vtx: -1, corner: ci, D: DB, w: om, v: om * bB });
        }
        if (om < 1) {
          const DV = Math.hypot(x - c.Vx, y - c.Vy);
          const bV = aS * this.band(DV);
          if (bV > 0) fade |= omBit;
          if (1 - om >= 0.5 && aS >= 0.5) Dexp = Math.min(Dexp, DV);
          take((1 - om) * bV, { kind: T_V, surf: S, chain: -1, s: 0, k: -1, vtx: -1, corner: ci, D: DV, w: 1 - om, v: (1 - om) * bV });
        }
      }
      if (c.r > 0 && om > 0 && this.inWedge(c, x, y)) {
        const D = Math.hypot(x - c.qx, y - c.qy) - c.r;
        const b2 = this.band2(D);
        if (b2 > 0) fade |= omBit;
        if (om >= 0.5) Dexp = Math.min(Dexp, Math.max(D, 0));
        take(om * b2, { kind: T_ARC, surf: S, chain: -1, s: 0, k: -1, vtx: -1, corner: ci, D, w: om, v: om * b2 });
      }
    }
    return { v, term, fade, Dexp, a: aS, afade: al.fade };
  }

  private pbuf: Piece[] = [];
  private ubuf: number[] = [];

  evalPoint(x: number, y: number): PixelEval {
    const P = this.pbuf;
    const fade = this.pieces(x, y, P);
    // The cap mix (S1c F2; Q2 in the header): the pieces inside their cap
    // ramps, sorted by ramp. Configuration k makes the k lowest OWN and the
    // rest full members, and weighs ramp[k] − ramp[k − 1] (ramp[−1] = 0,
    // ramp[n] = 1). The ink is the weighted sum; the labels are the heaviest
    // configuration's, the term the one that inks most.
    const U = this.ubuf;
    U.length = 0;
    for (const A of P) if (A.g >= 0 && A.ramp < 1) U.push(A.idx);
    if (U.length === 0) {
      const one = this.evalLayers(x, y, P);
      one.fade |= fade;
      return one;
    }
    U.sort((i, k) => P[i].ramp - P[k].ramp);
    let res: PixelEval | null = null;
    let wRes = -1;
    let term: Term | null = null;
    let vTerm = -1;
    let ink = 0;
    let fd = fade;
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k <= U.length; k++) {
      const wk = (k < U.length ? P[U[k]].ramp : 1) - (k > 0 ? P[U[k - 1]].ramp : 0);
      if (!(wk > 0)) continue;
      for (let i = 0; i < U.length; i++) {
        const A = P[U[i]];
        A.surf = i < k ? OWN + A.idx : A.g;
      }
      const r = this.evalLayers(x, y, P);
      ink += wk * r.ink;
      fd |= r.fade;
      lo = Math.min(lo, r.ink);
      hi = Math.max(hi, r.ink);
      if (wk * r.ink > vTerm) {
        vTerm = wk * r.ink;
        term = r.term;
      }
      if (wk > wRes) {
        wRes = wk;
        res = r;
      }
    }
    for (const i of U) P[i].surf = P[i].g;
    const out = res as PixelEval;
    out.ink = Math.min(1, ink);
    out.term = term;
    out.fade = fd | (hi - lo > 1e-9 ? F_CAP : 0);
    return out;
  }

  /** One configuration's layered composite at (x, y), with the pieces' surf as set. */
  private evalLayers(x: number, y: number, P: Piece[]): PixelEval {
    const h = this.h;
    const aa = this.aa;
    let fade = 0;
    // Every surface whose coverage reaches the pixel, keyed by Q1's cone key
    // (max over its pieces and fills). Covering: a piece within h, or a fill.
    // Two keys per surface (S3b F1): the reach key over everything within
    // reach orders the ink's composite; the cover key over the covering
    // pieces and fills alone picks and names the label's top (labelBy).
    const surf: SurfEntry[] = [];
    const entry = (id: number): SurfEntry => {
      let e = surf.find((u) => u.id === id);
      if (!e) {
        e = { id, key: -Infinity, z: 0, chain: -1, s: 0, ckey: -Infinity, cz: 0, cchain: -1, cs: 0, pieceCover: false, fillW: 0 };
        surf.push(e);
      }
      return e;
    };
    for (const A of P) {
      if (!(A.d < h + aa)) continue;
      const e = entry(A.surf);
      const cov = A.d < h && A.selfW >= 0.5;
      if (cov) e.pieceCover = true;
      if (A.key > e.key) {
        e.key = A.key;
        e.z = A.z;
        e.chain = A.chain;
        e.s = A.s;
      }
      if (cov && A.key > e.ckey) {
        e.ckey = A.key;
        e.cz = A.z;
        e.cchain = A.chain;
        e.cs = A.s;
      }
    }
    for (const ci of this.cornersNear(x, y)) {
      const c = this.corners[ci];
      if (!(c.r > 0 && c.omega > 0)) continue;
      const dq = Math.hypot(x - c.qx, y - c.qy);
      if (!(dq > c.r - aa) || dq > c.rV * (1 + 1e-9) + 1e-12 || !this.inWedge(c, x, y)) continue;
      const nearerA = this.fillKey === "nearer" ? Math.hypot(x - c.tax, y - c.tay) <= Math.hypot(x - c.tbx, y - c.tby) : this.fillKey === "a";
      const z = nearerA ? c.zA : c.zB;
      const key = this.K === Infinity ? z : z - h / this.K;
      const e = entry(c.g);
      const inF = this.inFill(c, x, y);
      if (inF) e.fillW = Math.max(e.fillW, c.omega);
      if (key > e.key) {
        e.key = key;
        e.z = z;
        e.chain = this.arms[nearerA ? c.a : c.b].pi;
        e.s = nearerA ? c.sA : c.sB;
      }
      if (inF && key > e.ckey) {
        e.ckey = key;
        e.cz = z;
        e.cchain = this.arms[nearerA ? c.a : c.b].pi;
        e.cs = nearerA ? c.sA : c.sB;
      }
    }
    surf.sort((u, v) => v.key - u.key);
    const outs = surf.map((e) => this.inkOf(e.id, x, y, P));
    const covers = (e: SurfEntry) => e.pieceCover || e.fillW > 0;
    const res: PixelEval = { ink: 0, top: -1, chain: -1, s: 0, z: 0, key: -Infinity, term: null, fade: 0, nSurf: surf.filter(covers).length, dz: Infinity, dkey: Infinity, Dexp: Infinity };
    // The label's top: the covering surface with the highest label key (the
    // cover key, or the reach key under labelBy "reach"); among equal keys
    // the first in the composite order. The runner-up gives dz and dkey.
    const byCover = this.labelBy === "cover";
    const lkey = (e: SurfEntry) => (byCover ? e.ckey : e.key);
    let i1 = -1;
    let i2 = -1;
    for (let i = 0; i < surf.length; i++) {
      if (!covers(surf[i])) continue;
      if (i1 < 0 || lkey(surf[i]) > lkey(surf[i1])) {
        i2 = i1;
        i1 = i;
      } else if (i2 < 0 || lkey(surf[i]) > lkey(surf[i2])) i2 = i;
    }
    if (i1 >= 0) {
      const S1 = surf[i1];
      res.top = S1.id;
      res.chain = byCover ? S1.cchain : S1.chain;
      res.s = byCover ? S1.cs : S1.s;
      res.z = byCover ? S1.cz : S1.z;
      res.key = lkey(S1);
      res.Dexp = outs[i1].Dexp;
      if (i2 >= 0) {
        res.dz = Math.abs(res.z - (byCover ? surf[i2].cz : surf[i2].z));
        res.dkey = res.key - lkey(surf[i2]);
      }
    }
    // Premultiplied "over" in key order (F4): each surface's ink through the
    // coverage of every surface above it. A fill covers at ω, so what lies
    // below shows through it at 1 − ω (F_OMEGA when that is visible).
    const comp = (ord: number[]) => {
      let T = 1;
      let ink = 0;
      let best = 0;
      let term: Term | null = null;
      let fd = 0;
      let pend = 0;
      for (const i of ord) {
        const o = outs[i];
        const c = T * o.v;
        if (c > 0) {
          ink += c;
          fd |= o.fade | pend;
          if (c > best) {
            best = c;
            term = o.term;
          }
        }
        pend |= o.afade;
        T *= 1 - o.a;
        if (!(T > 0)) break;
      }
      return { ink: Math.min(1, ink), term, fd };
    };
    const order = surf.map((_, i) => i);
    let r = comp(order);
    // The tie mix (Q1): the first adjacent pair within zt whose order matters
    // blends its two orders by t = ss(−zt, zt, Δkey).
    for (let i = 0; i + 1 < order.length; i++) {
      const gap = surf[i].key - surf[i + 1].key;
      if (!(gap < this.zt)) continue;
      const sw = order.slice();
      sw[i] = i + 1;
      sw[i + 1] = i;
      const r2 = comp(sw);
      if (r2.ink === r.ink) continue;
      const t = this.force.tie ?? ss(-this.zt, this.zt, gap);
      const ink = t * r.ink + (1 - t) * r2.ink;
      fade |= F_TIE;
      r = (1 - t) * r2.ink > t * r.ink ? { ink, term: r2.term, fd: r.fd | r2.fd } : { ink, term: r.term, fd: r.fd | r2.fd };
      break;
    }
    res.ink = r.ink;
    res.term = r.term;
    res.fade = fade | r.fd;
    return res;
  }

  // -------------------------------------------------------------------------
  // The max decomposition (F7's band pass): one strip per tube edge (a
  // segment's side), fillet arc and dead end's cap, reaching W + aa inside
  // its piece and aa outside. A term is evaluated by the strips it belongs
  // to; stripCheck says whether the pixel lies in one of them.

  /** tan(φ/2) of the chain's turn φ at vertex v (0 at an open end), at most tan 80°. */
  turnTan(pi: number, v: number): number {
    const p = this.polys[pi];
    if (!p.closed && (v <= 0 || v >= p.n - 1)) return 0;
    const k1 = v;
    const k0 = p.closed ? (v - 1 + p.nseg) % p.nseg : v - 1;
    const b0 = segB(p, k0);
    const b1 = segB(p, k1);
    const ax = p.x[b0] - p.x[k0];
    const ay = p.y[b0] - p.y[k0];
    const bx = p.x[b1] - p.x[k1];
    const by = p.y[b1] - p.y[k1];
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (!(la > 0 && lb > 0)) return 0;
    const phi = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb))));
    return Math.min(Math.tan(phi / 2), Math.tan((80 * Math.PI) / 180));
  }

  /**
   * Segment k's edge strip: a quad along the segment, mitred at each end by
   * (h + aa)·tan(φ/2) for the turn φ there, from (h − W − aa)·cos(φ/2) to
   * h + aa off the centreline. The mitre covers the convex side of a vertex,
   * whose band points have the vertex as their nearest point (finding F8).
   */
  inEdgeStrip(pi: number, k: number, x: number, y: number): boolean {
    const p = this.polys[pi];
    if (k < 0 || k >= p.nseg) return false;
    const b = segB(p, k);
    const ex = p.x[b] - p.x[k];
    const ey = p.y[b] - p.y[k];
    const l2 = ex * ex + ey * ey;
    if (!(l2 > 0)) return false;
    const len = Math.sqrt(l2);
    const tan0 = this.turnTan(pi, k);
    const tan1 = this.turnTan(pi, b);
    const out = this.h + this.aa;
    const t = ((x - p.x[k]) * ex + (y - p.y[k]) * ey) / l2;
    if (t < -(out * tan0) / len - 1e-12 || t > 1 + (out * tan1) / len + 1e-12) return false;
    const d = Math.abs((x - p.x[k]) * ey - (y - p.y[k]) * ex) / len;
    const cosHalf = 1 / Math.sqrt(1 + Math.max(tan0, tan1) ** 2);
    return d >= (this.h - this.W - this.aa) * cosHalf - 1e-12 && d <= out + 1e-12;
  }

  inArcStrip(c: Corner, x: number, y: number): boolean {
    if (!(c.r > 0) || !this.inWedge(c, x, y)) return false;
    const dq = Math.hypot(x - c.qx, y - c.qy);
    return dq >= c.r - this.aa - 1e-12 && dq <= c.r + this.W + this.aa + 1e-12;
  }

  inCapStrip(pi: number, atEnd: boolean, x: number, y: number): boolean {
    const p = this.polys[pi];
    if (p.closed) return false;
    const k = atEnd ? p.nseg - 1 : 0;
    const vi = atEnd ? p.n - 1 : 0;
    const ex = p.x[atEnd ? p.n - 1 : 1] - p.x[atEnd ? p.n - 2 : 0];
    const ey = p.y[atEnd ? p.n - 1 : 1] - p.y[atEnd ? p.n - 2 : 0];
    const along = (x - p.x[vi]) * ex + (y - p.y[vi]) * ey;
    if (atEnd ? along < -1e-12 : along > 1e-12) return false;
    void k;
    const d = Math.hypot(x - p.x[vi], y - p.y[vi]);
    return d >= this.h - this.W - this.aa - 1e-12 && d <= this.h + this.aa + 1e-12;
  }

  /** ok: the winning term's pixel lies in a strip that evaluates it; cls names the case. */
  stripCheck(t: Term, x: number, y: number): { ok: boolean; cls: string } {
    if (t.kind === T_FOOT) {
      const p = this.polys[t.chain];
      if (t.vtx < 0) return { ok: this.inEdgeStrip(t.chain, t.k, x, y), cls: "edge" };
      if (!p.closed && (t.vtx === 0 || t.vtx === p.n - 1)) return { ok: this.inCapStrip(t.chain, t.vtx !== 0, x, y), cls: "cap" };
      const kPrev = p.closed ? (t.vtx - 1 + p.nseg) % p.nseg : t.vtx - 1;
      const ok = this.inEdgeStrip(t.chain, kPrev, x, y) || this.inEdgeStrip(t.chain, t.vtx, x, y);
      return { ok, cls: "join" };
    }
    const c = this.corners[t.corner];
    if (t.kind === T_ARC) return { ok: this.inArcStrip(c, x, y), cls: "arc" };
    const pa = this.arms[c.a].pi;
    const pb = this.arms[c.b].pi;
    if (t.kind === T_TA) return { ok: this.inArcStrip(c, x, y) || this.nearStrips(pa, c.kA, x, y), cls: "endpoint" };
    if (t.kind === T_TB) return { ok: this.inArcStrip(c, x, y) || this.nearStrips(pb, c.kB, x, y), cls: "endpoint" };
    const fa = this.footArm(c.a, c.Vx, c.Vy);
    const fb = this.footArm(c.b, c.Vx, c.Vy);
    return { ok: this.nearStrips(pa, fa.k, x, y) || this.nearStrips(pb, fb.k, x, y), cls: "V" };
  }

  /** Is (x, y) in the edge strip of a segment within W + 2aa of arc length from segment k0 (an endpoint disc's reach)? */
  nearStrips(pi: number, k0: number, x: number, y: number): boolean {
    const p = this.polys[pi];
    if (this.inEdgeStrip(pi, k0, x, y)) return true;
    const R = this.W + 2 * this.aa;
    for (const dir of [-1, 1]) {
      let acc = 0;
      let k = k0;
      for (let i = 0; i < p.nseg; i++) {
        k += dir;
        if (p.closed) k = ((k % p.nseg) + p.nseg) % p.nseg;
        else if (k < 0 || k >= p.nseg) break;
        if (acc > R) break;
        if (this.inEdgeStrip(pi, k, x, y)) return true;
        acc += p.segLen[k];
      }
    }
    return false;
  }
}
