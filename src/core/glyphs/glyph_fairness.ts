// K860 (cursive research shortlist 1, measurement half): Farin-style
// fairness metrics for authored glyph paths, computed on the dense
// samples (arc length + signed curvature). A fair letter curve has
// curvature of one sign per path (the heading turns one way), few
// monotone curvature pieces, and no ripple: total curvature
// variation beyond what its monotone pieces need. These are
// REPORTS, not lint failures: the design targets live in FAIR and
// the measure probe (.claude/probes/K860/measure.mts) prints the
// current a/i against them; glyph data changes only on a measured
// deficiency, never on eyeballed stills. K108: + - * / and
// Math.sqrt only (src/core is scanned).

import type { CubicPath, Glyph } from "./glyph_types";
import { densePath } from "./glyph_eval";

/**
 * Curvature deadband (1/GU): below this the path counts as straight
 * (R > 240 GU across a 72 GU x-height is visually straight), so
 * sign noise there is not a flip.
 */
export const KAPPA_EPS = 1 / 240;
/** An extremum must swing kappa by more than this (1/GU) to split a
 * monotone piece; smaller wiggles fold into the ripple metric. */
export const KAPPA_SWING = 1 / 120;

export interface PathFairness {
  lengthGU: number;
  /** 1 / max|kappa| (GU); Infinity on a straight path. */
  minRadiusGU: number;
  /** Sign changes of kappa outside the deadband. One-way heading
   * (the a/i design intent) means 0. */
  signFlips: number;
  /** Monotone runs of kappa, split at extrema beyond KAPPA_SWING.
   * Farin-fair curves need few (a simple bowl: 1-2). */
  kappaPieces: number;
  /** Total variation of kappa along arc (1/GU). */
  kappaVariation: number;
  /** Variation beyond the monotone-piece skeleton - the ripple.
   * 0 when kappa moves monotonically within each piece. */
  kappaExcess: number;
  /** Steepest |dkappa/ds| (1/GU^2). */
  maxKappaSlope: number;
}

export function pathFairness(path: CubicPath): PathFairness {
  const sm = densePath(path);
  let maxK = 0;
  let variation = 0;
  let maxSlope = 0;
  // Sign flips with a deadband: track the last committed sign.
  let committed = 0;
  let signFlips = 0;
  // Monotone pieces: walk extrema of kappa beyond KAPPA_SWING.
  // piece skeleton: the running extremum values (start, each
  // confirmed extremum, end); excess = variation the skeleton
  // cannot explain.
  let dir = 0; // current kappa direction: +1 rising, -1 falling
  let extreme = sm.length > 0 ? sm[0].kappa : 0;
  let skeleton = 0;
  let prevExtreme = extreme;
  let turns = 0;
  for (let i = 0; i < sm.length; i++) {
    const k = sm[i].kappa;
    if (Math.abs(k) > maxK) maxK = Math.abs(k);
    if (i > 0) {
      const dk = k - sm[i - 1].kappa;
      const ds = sm[i].s - sm[i - 1].s;
      variation += Math.abs(dk);
      if (ds > 0) {
        const slope = Math.abs(dk) / ds;
        if (slope > maxSlope) maxSlope = slope;
      }
    }
    const s = k > KAPPA_EPS ? 1 : k < -KAPPA_EPS ? -1 : 0;
    if (s !== 0) {
      if (committed !== 0 && s !== committed) signFlips++;
      committed = s;
    }
    if (i === 0) continue;
    const kPrev = sm[i - 1].kappa;
    if (dir >= 0 && k > extreme) extreme = k;
    if (dir <= 0 && k < extreme) extreme = k;
    if (dir === 0) {
      if (k - kPrev > 0) dir = 1;
      else if (k - kPrev < 0) dir = -1;
      extreme = k;
    } else if (dir === 1 && k < extreme - KAPPA_SWING) {
      skeleton += Math.abs(extreme - prevExtreme);
      prevExtreme = extreme;
      dir = -1;
      extreme = k;
      turns++;
    } else if (dir === -1 && k > extreme + KAPPA_SWING) {
      skeleton += Math.abs(extreme - prevExtreme);
      prevExtreme = extreme;
      dir = 1;
      extreme = k;
      turns++;
    }
  }
  skeleton += Math.abs(extreme - prevExtreme);
  const pieces = 1 + turns;
  return {
    lengthGU: sm.length > 0 ? sm[sm.length - 1].s : 0,
    minRadiusGU: maxK > 0 ? 1 / maxK : Infinity,
    signFlips,
    kappaPieces: pieces,
    kappaVariation: variation,
    kappaExcess: Math.max(0, variation - skeleton),
    maxKappaSlope: maxSlope,
  };
}

/** Design targets (from the a/i design comments: one-way heading
 * turns, single wide arcs, no ripple). A report, not a lint gate. */
export const FAIR = {
  signFlips: 0,
  kappaPieces: 3,
  kappaExcess: 0.004, // 1/GU of ripple across a whole path
} as const;

export interface GlyphFairness {
  ch: string;
  body: PathFairness;
  spurs: PathFairness[];
  floats: PathFairness[];
}

export function glyphFairness(g: Glyph): GlyphFairness {
  return {
    ch: g.ch,
    body: pathFairness(g.body),
    spurs: g.spurs.map((s) => pathFairness(s.path)),
    floats: g.floats.map((f) => pathFairness(f)),
  };
}

export function fairnessViolations(f: PathFairness): string[] {
  const out: string[] = [];
  if (f.signFlips > FAIR.signFlips) out.push(`signFlips ${f.signFlips} > ${FAIR.signFlips}`);
  if (f.kappaPieces > FAIR.kappaPieces) out.push(`kappaPieces ${f.kappaPieces} > ${FAIR.kappaPieces}`);
  if (f.kappaExcess > FAIR.kappaExcess)
    out.push(`kappaExcess ${f.kappaExcess.toFixed(4)} > ${FAIR.kappaExcess}`);
  return out;
}
