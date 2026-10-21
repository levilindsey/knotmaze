// K115 stage 9: the glyph lint (docs/design/K115_stage9.md, item 2;
// glyphs doc section 5). One glyph at one x-height, on the authored
// cubics, in GU (thresholds are LU, converted by 72 / xh). It checks:
// - the declared structure: crossings found = `crossings`, each converged
//   and two-pass (no triple point), spurs (one JUNCTION and one END each)
//   and floats (two ENDs each);
// - every crossing's sin >= 0.55, and consecutive crossings along one pass
//   >= 0.30/sin1 + 0.30/sin2 LU apart;
// - G1: a body corner only at a spur's junction; spurs and floats smooth;
// - the FORK rule at every spur junction: the two arms that leave along
//   the overlap's direction open by >= 15 degrees (LINT.forkMinCos) and
//   reach full clearance within LINT.forkMaxLU (measured on the stage 9 fork
//   stills);
// - clearance (rule 5): centerlines >= 0.60 LU apart, except within a
//   declared crossing's overlap span (0.60/sin along each pass), within a
//   junction's fork zone, and along one path within the U-turn window
//   (pi/2 x 0.60 LU of arc: a legal U-turn's legs);
// - END tips (spur tips, float ends) >= 0.56 LU from every other thread,
//   and a spur that crosses a thread runs on >= 0.56/sin LU past it;
// - radii: R >= 11 GU (error), a G2 warning where R < 0.6 LU;
// - K580, a TANGENT join (a spur declared `tangent`: its two body arms
//   leave J along one line and draw as one tapered root, glyph_graph.ts
//   tangentRoot): the fork rule is waived for the arms that leave together,
//   and the clearance floor between them up to where their gap reaches it
//   (the crotch). Checked instead: the strokes part (a part point R
//   exists); the root's width is normal at J and grows toward J by no more
//   than LINT.taperBulgeLU a side; its outline stays inside the two strokes'
//   ribbons (LINT.taperBulgeLU), so the drawn edges are the strokes' own
//   outer edges, G1 by construction (where each root edge starts against
//   its outer edge, and at what angle, is reported, not judged, and so are
//   how far the outline sinks inside the ribbons and how far past R the
//   strokes' inner edges still overlap); and the crotch reaches the
//   clearance floor within LINT.forkMaxLU of R's foot on each stroke (the
//   fork rule's measured distance).
// The body is extended at both ends by straight lead tails along its entry
// and exit tangents (the joins concatenate exactly, so a neighbor leaves
// along the same line): an arm that runs off the glyph keeps its fork
// measured. K108: + - * / and Math.sqrt only (src/core is scanned).

import type { CubicPath, Glyph, Pt } from "./glyph_types";
import {
  bezAt,
  bezDeriv,
  densePath,
  findCrossings,
  g1Failures,
  K_STEPS,
  segCount,
  segOf,
  type SegRef,
} from "./glyph_eval";
import { tangentRoot, TAPER_PART_LU } from "./glyph_graph";

export const GU_PER_XH = 72;

/** The lint's thresholds (LU unless named GU). */
export const LINT = {
  clearLU: 0.6,
  tipLU: 0.56,
  sinMin: 0.55,
  crossGapLU: 0.3,
  minRGU: 11,
  g2WarnRLU: 0.6,
  /**
   * cos of the smallest clean fork angle: 15 degrees. Measured on the stage
   * 9 stills (`.claude/probes/K115/stage9/shots1`, `shots2`, seeds 7 and 9):
   * the i's fork drew cleanly at 15, 30, 45 and 60 degrees and as an
   * overlap streak at 0; at 90 the arrival forced a clearance failure.
   */
  forkMinCos: 0.9659258262890683,
  /**
   * The longest measured clean distance to full clearance: the round-bottom
   * i at xh 3 (1.20 LU; 1.08 at xh 2; `shots3`). The first i form drew
   * cleanly at 0.97 LU for every angle >= 15, so the angle, not this
   * distance, separated clean from broken in the measurement.
   * K643 checked both rules that read it on stills at the desk (1600x1000,
   * dsf 3) and phone scale (411x753, dsf 2). fork-distance: the i's fork
   * in "ai" (1.08 LU at xh 2, 1.20 at xh 3) shows no fork defect at either
   * (only a hairline seam inside the xh 3 junction, in today's build too).
   * taper-crotch: `widenCrotch` (glyph_inject.ts, `#glyphs2=crotch<L>`)
   * lengthens the a's crotch smoothly to 0.67 LU at xh 2 and 0.79 at xh 3,
   * and both draw cleanly; past that the release down C bends under the
   * radius floor (9.4 GU at 0.68, xh 2; 8.3 at 0.92, xh 3) and the stills
   * show those kinks, not a crotch defect. (The dark half-disc in some
   * cells is K580 s5's unidentified gap-mask slot, which comes and goes
   * with any perturbation, a 0.002 bump included: see the K643 Handoff.)
   * No crotch length read badly, so 1.2 stays; on the taper side it is
   * evidenced only to 0.79. Sheets: `.claude/probes/K643/sheets/`
   * `crotch_*.png` and `bulge_*_ifork_x*.png`.
   */
  forkMaxLU: 1.2,
  /** Lead tail length (LU) the body is extended by at each end. */
  leadLU: 2,
  /** K580: the thread width (LU) the taper's edges are measured at. */
  threadLU: 0.52,
  /**
   * K580: how far (LU) a tapered root's outline may leave the two strokes'
   * ribbons. Inside them, the drawn outline IS the strokes' outer edges, G1
   * by construction; outside, the root draws an edge of its own, which
   * starts at R with a kink (the root's edge is not G1 with the outer edge:
   * 31 degrees at xh 2, 9 at xh 3, measured against the nearest outer-edge
   * point). The authored a: stage 1's equal-arc root 0.022 at R (xh 2),
   * 0.0001 (xh 3); stage 2's medial root 0.0002 and 0.0003 (its far side
   * sinks into O instead, by 0.053 and 0.049: the inset).
   * K643 calibrated it on stills of injected bumps (`#glyphs2=bulge<b>`,
   * lintGlyph's bulgeLU; the lint reads 0.95-0.97 of each): a bump draws
   * at its full height, 2.7 device px per 0.01 LU on the desk (1600x1000,
   * dsf 3) and 1.2 at phone scale (411x753, dsf 2), so the desk is the
   * tighter. On the xh 3 root's nearly straight outer edge a bump first
   * shows on the desk at 0.015 (the edge rises and falls again; plain at
   * 0.022; at phone scale faint at 0.015, plain at 0.022), and 0.01 still
   * reads as a smooth edge at both; xh 2's curved edge hides even 0.03.
   * So 0.01 holds and stays. Sheets: `.claude/probes/K643/sheets/`
   * `bulge_desk*.png` (first defect: `bulge_desk_edge_x3_mag4.png`, the
   * 0.015 cell) and `bulge_phone*.png`.
   */
  taperBulgeLU: 0.01,
} as const;

/**
 * K580: a tangent join's taper, measured on the authored cubics. The root
 * runs along the strokes' medial axis from the part point R (the medial
 * point a thread width across, touching C at arc aR from J and O at bR) to
 * J (stage 2; stage 1 paired the strokes by equal arc).
 */
export interface TaperReport {
  junction: number;
  /** Arc (LU) from J along the arriving stroke C to R's foot on it. */
  aRLU: number;
  /** Arc (LU) from J along the departing stroke O to R's foot on it. */
  bRLU: number;
  /** The width multiplier at R (1 at J): 2 / cos of the strokes' half-angle there. */
  mR: number;
  /** Worst gap (LU) and kink (cos) between a root edge and its stroke's outer edge at R. */
  edgeGapLU: number;
  edgeCos: number;
  /** How far the root's outline leaves the two strokes' ribbons, in LU. */
  bulgeLU: number;
  /** How far the root's outline sinks inside the strokes' ribbons, in LU (not judged). */
  insetLU: number;
  /** The width falls monotonically from R to J and is normal width at J. */
  monotone: boolean;
  /** The most the width grows toward J, per side (LU; judged by LINT.taperBulgeLU). */
  riseLU: number;
  /**
   * Arc (LU) from J along each stroke to where its ribbon leaves the other
   * stroke's (nearest centerline distance >= the thread width) and to where
   * the gap reaches the clearance floor; the larger of the two strokes.
   */
  partLU: number;
  clearLU: number;
  /** The crotch: arc (LU) past R's foot, on either stroke, to the clearance floor. */
  crotchLU: number;
  /**
   * Arc (LU) past R's foot at which either stroke's inner edge leaves the
   * other stroke's ribbon: 0 when the inner edges cross at R.
   */
  overlapLU: number;
}

export interface LintIssue {
  rule: string;
  msg: string;
  /** GU, y up. */
  at?: [number, number];
}

export interface ForkReport {
  /** Body joint index of the spur's junction. */
  junction: number;
  arms: [ArmName, ArmName];
  /** cos of the angle between the two arms' tangents leaving the junction. */
  cos: number;
  /** Arc distance (LU, along both arms) to full clearance; Infinity if never. */
  dClearLU: number;
}

export interface LintReport {
  ch: string;
  xh: number;
  errors: LintIssue[];
  warnings: LintIssue[];
  forks: ForkReport[];
  /** K580: one per tangent join. */
  tapers: TaperReport[];
  crossings: Array<{ pos: [number, number]; sin: number }>;
  ends: number;
  junctions: number;
  /** Smallest centerline distance (LU) outside the exemptions. */
  minClearLU: number;
  /** Smallest END-tip distance (LU) to another thread. */
  minTipLU: number;
  /** Smallest radius (GU) on any path. */
  minRGU: number;
}

type ArmName = "in" | "out" | "spur";

interface PathRec {
  id: number;
  kind: "body" | "spur" | "float";
  /** Dense samples: positions (GU) and cumulative arc (GU). */
  xs: number[];
  ys: number[];
  arc: number[];
  /** For the body: arc offset of the original start (after the lead). */
  arc0: number;
  len: number;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function unit(v: Pt): [number, number] {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  return [v[0] / l, v[1] / l];
}

/** Dense samples of a path, optionally with straight lead tails. */
function sampleRec(
  id: number,
  kind: PathRec["kind"],
  path: CubicPath,
  lead: { gu: number; inDir: Pt; outDir: Pt } | null
): PathRec {
  const ds = densePath(path);
  const xs: number[] = [];
  const ys: number[] = [];
  const arc: number[] = [];
  let arc0 = 0;
  const step = 1;
  if (lead) {
    const u = unit(lead.inDir);
    const p0 = ds[0].pos;
    const n = Math.ceil(lead.gu / step);
    for (let i = n; i >= 1; i--) {
      xs.push(p0[0] - u[0] * i * step);
      ys.push(p0[1] - u[1] * i * step);
      arc.push((n - i) * step);
    }
    arc0 = n * step;
  }
  for (const s of ds) {
    xs.push(s.pos[0]);
    ys.push(s.pos[1]);
    arc.push(arc0 + s.s);
  }
  if (lead) {
    const u = unit(lead.outDir);
    const last = ds[ds.length - 1];
    const n = Math.ceil(lead.gu / step);
    for (let i = 1; i <= n; i++) {
      xs.push(last.pos[0] + u[0] * i * step);
      ys.push(last.pos[1] + u[1] * i * step);
      arc.push(arc0 + last.s + i * step);
    }
  }
  return { id, kind, xs, ys, arc, arc0, len: arc[arc.length - 1] };
}

/** Position at arc distance `a` along a record (clamped). */
function posAt(r: PathRec, a: number): [number, number] {
  if (a <= 0) return [r.xs[0], r.ys[0]];
  if (a >= r.len) return [r.xs[r.xs.length - 1], r.ys[r.ys.length - 1]];
  let lo = 0;
  let hi = r.arc.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (r.arc[m] <= a) lo = m;
    else hi = m;
  }
  const f = (a - r.arc[lo]) / (r.arc[hi] - r.arc[lo] || 1);
  return [r.xs[lo] + (r.xs[hi] - r.xs[lo]) * f, r.ys[lo] + (r.ys[hi] - r.ys[lo]) * f];
}

/** Arc (GU, in the record's frame) of dense index `seg * 64 + k` of the authored path. */
function arcOfParam(r: PathRec, seg: number, t: number): number {
  const idx = seg * K_STEPS + t * K_STEPS;
  const lead = r.kind === "body" ? Math.round(r.arc0) : 0;
  const i0 = Math.max(0, Math.min(r.arc.length - 1, lead + Math.floor(idx)));
  const i1 = Math.min(r.arc.length - 1, i0 + 1);
  const f = idx - Math.floor(idx);
  return r.arc[i0] + (r.arc[i1] - r.arc[i0]) * f;
}

interface Arm {
  name: ArmName;
  rec: PathRec;
  /** Arc of the junction on rec, and the walking sign (+1 forward). */
  a0: number;
  sign: number;
  len: number;
}

function armPos(arm: Arm, d: number): [number, number] {
  return posAt(arm.rec, arm.a0 + arm.sign * d);
}

function armDir(arm: Arm): [number, number] {
  const p = armPos(arm, 0);
  const q = armPos(arm, 0.5);
  const l = dist(p[0], p[1], q[0], q[1]);
  return [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
}

/**
 * Lints glyph `g` at x-height `xh` (LU). `partLU` is the taper's part point
 * (LU), as the builder's `taperPart` (`tp60` builds 0.6); `bulgeLU` is the
 * probe-only bump of the builder's `taperBulge` (K643), so the lint
 * measures the outline the flag draws.
 */
export function lintGlyph(g: Glyph, xh: number, partLU: number = TAPER_PART_LU, bulgeLU = 0): LintReport {
  const k = GU_PER_XH / xh; // GU per LU
  const CLEAR = LINT.clearLU * k;
  const TIP = LINT.tipLU * k;
  const WINDOW = (Math.PI / 2) * CLEAR;
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];

  // --- Paths. ---
  const recs: PathRec[] = [];
  const body = sampleRec(0, "body", g.body, {
    gu: LINT.leadLU * k,
    inDir: g.entry.dir,
    outDir: g.exit.dir,
  });
  recs.push(body);
  g.spurs.forEach((s, i) => recs.push(sampleRec(1 + i, "spur", s.path, null)));
  const floatBase = 1 + g.spurs.length;
  g.floats.forEach((f, i) => recs.push(sampleRec(floatBase + i, "float", f, null)));
  const pathOf = (id: number): CubicPath =>
    id === 0 ? g.body : id < floatBase ? g.spurs[id - 1].path : g.floats[id - floatBase];

  // --- G1 and radii. ---
  const spurJoints = new Set(g.spurs.map((s) => s.at));
  for (const j of g1Failures(g.body)) {
    if (!spurJoints.has(j)) errors.push({ rule: "g1", msg: `body corner at joint ${j} (no spur there)`, at: [g.body[j][0], g.body[j][1]] });
  }
  g.spurs.forEach((s, i) => {
    for (const j of g1Failures(s.path)) errors.push({ rule: "g1", msg: `spur ${i} corner at joint ${j}` });
    if (s.at % 3 !== 0 || s.at <= 0 || s.at >= g.body.length - 1) errors.push({ rule: "spur", msg: `spur ${i} attaches at ${s.at}, not an inner body joint` });
    else {
      const j = g.body[s.at];
      if (s.path[0][0] !== j[0] || s.path[0][1] !== j[1]) errors.push({ rule: "spur", msg: `spur ${i} does not start at its junction` });
    }
  });
  g.floats.forEach((f, i) => {
    for (const j of g1Failures(f)) errors.push({ rule: "g1", msg: `float ${i} corner at joint ${j}` });
  });
  let minR = Infinity;
  const g2R = LINT.g2WarnRLU * k;
  for (let id = 0; id < recs.length; id++) {
    // Every run of samples under the warning radius reports its tightest.
    const ds = densePath(pathOf(id));
    let worst = Infinity;
    let worstAt: [number, number] = [0, 0];
    const flush = (): void => {
      if (worst < LINT.minRGU) errors.push({ rule: "radius", msg: `path ${id}: R ${worst.toFixed(1)} GU < ${LINT.minRGU}`, at: worstAt });
      else if (worst < g2R) warnings.push({ rule: "g2", msg: `path ${id}: R ${worst.toFixed(1)} GU < 0.6 LU (${g2R.toFixed(1)} GU)`, at: worstAt });
      worst = Infinity;
    };
    for (const s of ds) {
      const r = s.kappa !== 0 ? 1 / Math.abs(s.kappa) : Infinity;
      if (r < minR) minR = r;
      if (r < g2R) {
        if (r < worst) {
          worst = r;
          worstAt = s.pos;
        }
      } else if (worst < Infinity) flush();
    }
    if (worst < Infinity) flush();
  }

  // --- Crossings. ---
  const segs: SegRef[] = [];
  for (let id = 0; id < recs.length; id++) {
    const p = pathOf(id);
    for (let s = 0; s < segCount(p); s++) segs.push({ path: id, seg: s, ctrl: segOf(p, s) });
  }
  const skip = (a: SegRef, b: SegRef): boolean => {
    if (a.path === b.path && Math.abs(a.seg - b.seg) <= 1) return true;
    const sp = a.path > 0 && a.path < floatBase ? a : b.path > 0 && b.path < floatBase ? b : null;
    const other = sp === a ? b : a;
    if (sp && sp.seg === 0 && other.path === 0) {
      const js = g.spurs[sp.path - 1].at / 3;
      if (other.seg === js || other.seg === js - 1) return true;
    }
    return false;
  };
  const hits = findCrossings(segs, skip);
  const crossings: LintReport["crossings"] = [];
  interface Pass { path: number; arc: number; sin: number; cross: number }
  const passes: Pass[] = [];
  hits.forEach((h, ci) => {
    crossings.push({ pos: h.pos, sin: h.sin });
    if (!h.converged) errors.push({ rule: "crossing", msg: `crossing ${ci} did not converge`, at: h.pos });
    if (h.sin < LINT.sinMin) errors.push({ rule: "crossing-sin", msg: `crossing ${ci} sin ${h.sin.toFixed(3)} < ${LINT.sinMin}`, at: h.pos });
    passes.push({ path: h.a.path, arc: arcOfParam(recs[h.a.path], h.a.seg, h.s), sin: h.sin, cross: ci });
    passes.push({ path: h.b.path, arc: arcOfParam(recs[h.b.path], h.b.seg, h.t), sin: h.sin, cross: ci });
  });
  if (hits.length !== g.crossings) errors.push({ rule: "declared", msg: `${hits.length} crossings found, ${g.crossings} declared` });
  for (let i = 0; i < hits.length; i++) {
    for (let j = i + 1; j < hits.length; j++) {
      if (dist(hits[i].pos[0], hits[i].pos[1], hits[j].pos[0], hits[j].pos[1]) < CLEAR) {
        errors.push({ rule: "two-pass", msg: `crossings ${i} and ${j} closer than 0.60 LU (a triple point)`, at: hits[i].pos });
      }
    }
  }
  for (let id = 0; id < recs.length; id++) {
    const ps = passes.filter((p) => p.path === id).sort((a, b) => a.arc - b.arc);
    for (let i = 1; i < ps.length; i++) {
      const need = (LINT.crossGapLU / ps[i - 1].sin + LINT.crossGapLU / ps[i].sin) * k;
      if (ps[i].arc - ps[i - 1].arc < need) {
        errors.push({ rule: "crossing-gap", msg: `path ${id}: crossings ${ps[i - 1].cross} and ${ps[i].cross} ${((ps[i].arc - ps[i - 1].arc) / k).toFixed(2)} LU apart < ${(need / k).toFixed(2)}` });
      }
    }
  }

  // --- Junctions: arms and the fork rule. ---
  interface Junction { joint: number; spur: number; arms: Arm[]; d0: Map<string, number> }
  const junctions: Junction[] = [];
  const forks: ForkReport[] = [];
  g.spurs.forEach((s, i) => {
    const sJ = body.arc0 + densePath(g.body)[(s.at / 3) * K_STEPS].s;
    const sp = recs[1 + i];
    const arms: Arm[] = [
      { name: "in", rec: body, a0: sJ, sign: -1, len: sJ },
      { name: "out", rec: body, a0: sJ, sign: 1, len: body.len - sJ },
      { name: "spur", rec: sp, a0: 0, sign: 1, len: sp.len },
    ];
    const d0 = new Map<string, number>();
    for (let a = 0; a < arms.length; a++) {
      for (let b = a + 1; b < arms.length; b++) {
        const A = arms[a];
        const B = arms[b];
        const dmax = Math.min(A.len, B.len);
        let dc = Infinity;
        for (let d = 0; d <= dmax; d += 0.25) {
          const p = armPos(A, d);
          const q = armPos(B, d);
          if (dist(p[0], p[1], q[0], q[1]) >= CLEAR) {
            dc = d;
            break;
          }
        }
        const ua = armDir(A);
        const ub = armDir(B);
        const cos = ua[0] * ub[0] + ua[1] * ub[1];
        d0.set(`${A.name}-${B.name}`, dc);
        forks.push({ junction: s.at, arms: [A.name, B.name], cos, dClearLU: dc / k });
        // The fork rule binds the pair that leaves together (cos > 0). A
        // tangent join draws that pair as one tapered root (K580): checked
        // below instead.
        if (cos > 0 && !s.tangent) {
          if (cos > LINT.forkMinCos) errors.push({ rule: "fork-angle", msg: `junction ${s.at} ${A.name}/${B.name}: arms open by less than 15 degrees (cos ${cos.toFixed(4)})`, at: [g.body[s.at][0], g.body[s.at][1]] });
          if (!(dc / k <= LINT.forkMaxLU)) errors.push({ rule: "fork-distance", msg: `junction ${s.at} ${A.name}/${B.name}: full clearance at ${(dc / k).toFixed(2)} LU > ${LINT.forkMaxLU}`, at: [g.body[s.at][0], g.body[s.at][1]] });
        }
      }
    }
    junctions.push({ joint: s.at, spur: 1 + i, arms, d0 });
  });

  // --- K580: tangent joins. ---
  interface Crotch { sJ: number; spanC: number; spanO: number }
  const crotches: Crotch[] = [];
  const tapers: TaperReport[] = [];
  const H = (LINT.threadLU / 2) * k;
  g.spurs.forEach((s) => {
    if (!s.tangent) return;
    const at: [number, number] = [g.body[s.at][0], g.body[s.at][1]];
    const root = tangentRoot(g.body, s.at, partLU * k, LINT.threadLU * k, bulgeLU * k);
    if (!root) {
      errors.push({ rule: "taper", msg: `junction ${s.at}: the tangent strokes never part to the thread width`, at });
      return;
    }
    const sJ = body.arc0 + densePath(g.body)[(s.at / 3) * K_STEPS].s;
    const C = (a: number): [number, number] => posAt(body, sJ - a);
    const O = (a: number): [number, number] => posAt(body, sJ + a);
    // The width is normal at J and does not grow toward J (beyond the bulge
    // bound, per side: the root follows the strokes' outer edges, which bow
    // a little where the strokes' angle peaks inside the root).
    let rise = 0;
    for (let n = 64, low = root.sepAt(root.aR); n >= 0; n--) {
      const sep = root.sepAt((root.aR * n) / 64);
      if (sep < low) low = sep;
      else if (sep - low > rise) rise = sep - low;
    }
    const monotone = rise <= 1e-9 * k && root.sepAt(0) <= 1e-6 * k;
    if (!(root.sepAt(0) <= 1e-6 * k) || rise / 2 > LINT.taperBulgeLU * k) {
      errors.push({ rule: "taper-monotone", msg: `junction ${s.at}: the root's width grows toward J by ${(rise / 2 / k).toFixed(4)} LU a side, or is not normal at J`, at });
    }
    // The root's edges at R against the strokes' outer edges.
    const segs = segCount(root.path);
    const rootEdge = (p: number, side: number): [number, number] => {
      const si = Math.min(segs - 1, Math.floor(p));
      const seg = segOf(root.path, si);
      const q = bezAt(seg, p - si);
      const d = unit(bezDeriv(seg, p - si));
      const w = H + root.sepAt(root.aR * (1 - p / segs)) / 2;
      return [q[0] - d[1] * w * side, q[1] + d[0] * w * side];
    };
    /** A stroke's outer edge at arc a (its inner edge, toward T, if `inner`). */
    const strokeEdge = (S: (a: number) => [number, number], T: (a: number) => [number, number], a: number, inner = false): [number, number] => {
      const p = S(a);
      const t = unit([S(a - 1)[0] - S(a + 1)[0], S(a - 1)[1] - S(a + 1)[1]]);
      let n: [number, number] = [-t[1], t[0]];
      const o = T(a);
      if (n[0] * (p[0] - o[0]) + n[1] * (p[1] - o[1]) < 0 !== inner) n = [-n[0], -n[1]];
      return [p[0] + n[0] * H, p[1] + n[1] * H];
    };
    const p0 = root.path[0];
    const t0 = unit([root.path[1][0] - p0[0], root.path[1][1] - p0[1]]);
    // Each edge's start at R against the NEAREST point of its stroke's outer
    // edge, searched around that stroke's foot at R (C's at aR, O's at bR),
    // and its direction against that edge's tangent.
    let edgeGap = 0;
    let edgeCos = 1;
    const feet = [
      [C, O, root.aR],
      [O, C, root.bR],
    ] as const;
    for (const [S, T, f] of feet) {
      const sp = S(f);
      const side = -t0[1] * (sp[0] - p0[0]) + t0[0] * (sp[1] - p0[1]) > 0 ? 1 : -1;
      const e0 = rootEdge(0, side);
      const e1 = rootEdge(0.05, side);
      let gap = Infinity;
      let aN = f;
      for (let a = Math.max(1, f - 0.5 * k); a <= f + 0.5 * k; a += 0.25) {
        const se = strokeEdge(S, T, a);
        const d = dist(e0[0], e0[1], se[0], se[1]);
        if (d < gap) {
          gap = d;
          aN = a;
        }
      }
      const s0 = strokeEdge(S, T, aN + 1);
      const s1 = strokeEdge(S, T, aN - 1);
      edgeGap = Math.max(edgeGap, gap);
      const ue = unit([e1[0] - e0[0], e1[1] - e0[1]]);
      const us = unit([s1[0] - s0[0], s1[1] - s0[1]]);
      edgeCos = Math.min(edgeCos, ue[0] * us[0] + ue[1] * us[1]);
    }
    // How far the root's outline leaves the two strokes' ribbons (their
    // union is what the untapered join draws), over the whole root; and how
    // far it sinks inside them (reported, not judged).
    let bulge = 0;
    let inset = 0;
    const span = 2 * Math.max(root.aR, root.bR);
    for (let p = 0; p <= segs + 1e-9; p += 0.05) {
      for (const side of [1, -1]) {
        const e = rootEdge(p, side);
        let near = Infinity;
        for (let a = 0; a <= span; a += 0.5) {
          const c = C(a);
          const o = O(a);
          near = Math.min(near, dist(e[0], e[1], c[0], c[1]), dist(e[0], e[1], o[0], o[1]));
        }
        bulge = Math.max(bulge, near - H);
        inset = Math.max(inset, H - near);
      }
    }
    if (bulge > LINT.taperBulgeLU * k) {
      errors.push({ rule: "taper-g1", msg: `junction ${s.at}: a root edge meets its stroke's outer edge ${(edgeGap / k).toFixed(3)} LU off, cos ${edgeCos.toFixed(4)}, bulge ${(bulge / k).toFixed(3)} LU`, at });
    }
    // The ribbons past R: how far past its foot at R each stroke's INNER
    // edge still runs inside the other stroke's ribbon (0 when the inner
    // edges cross exactly at R; negative when they part before it).
    const bEnd = 3 * Math.max(root.aR, root.bR) + 2 * k;
    const overlap = (S: (a: number) => [number, number], T: (a: number) => [number, number], f: number): number => {
      let last = Math.max(1, f - 0.25 * k);
      for (let a = last; a <= f + k; a += 0.25) {
        const e = strokeEdge(S, T, a, true);
        let near = Infinity;
        for (let b = 0; b <= bEnd; b += 0.25) {
          const q = T(b);
          near = Math.min(near, dist(e[0], e[1], q[0], q[1]));
        }
        if (near < H - 0.001 * k) last = a;
      }
      return last - f;
    };
    const overlapPast = Math.max(overlap(C, O, root.aR), overlap(O, C, root.bR));
    // The crotch: along each stroke from its foot at R, the nearest distance
    // to the other stroke, until it reaches the thread width (the ribbons
    // part, by discs) and the clearance floor.
    const reach = (S: (a: number) => [number, number], other: (a: number) => [number, number], f: number, aMax: number, aOther: number) => {
      let part = Infinity;
      let clear = Infinity;
      for (let a = f; a <= aMax; a += 0.5) {
        const p = S(a);
        let near = Infinity;
        for (let b = 0; b <= aOther; b += 0.5) {
          const q = other(b);
          near = Math.min(near, dist(p[0], p[1], q[0], q[1]));
        }
        if (part === Infinity && near >= 2 * H) part = a;
        if (near >= CLEAR) {
          clear = a;
          break;
        }
      }
      return { part, clear };
    };
    const maxC = sJ;
    const maxO = body.len - sJ;
    const rc = reach(C, O, root.aR, maxC, maxO);
    const ro = reach(O, C, root.bR, maxO, maxC);
    const part = Math.max(rc.part, ro.part);
    const clear = Math.max(rc.clear, ro.clear);
    const crotch = Math.max(rc.clear - root.aR, ro.clear - root.bR);
    if (!(crotch <= LINT.forkMaxLU * k)) {
      errors.push({ rule: "taper-crotch", msg: `junction ${s.at}: the crotch reaches the clearance floor ${(crotch / k).toFixed(2)} LU past R > ${LINT.forkMaxLU}`, at });
    }
    crotches.push({ sJ, spanC: rc.clear, spanO: ro.clear });
    tapers.push({
      junction: s.at,
      aRLU: root.aR / k,
      bRLU: root.bR / k,
      mR: 1 + root.sepAt(root.aR) / (2 * H),
      edgeGapLU: edgeGap / k,
      edgeCos,
      bulgeLU: bulge / k,
      insetLU: inset / k,
      monotone,
      riseLU: rise / 2 / k,
      partLU: part / k,
      clearLU: clear / k,
      crotchLU: crotch / k,
      overlapLU: overlapPast / k,
    });
  });
  /** A body pair across a tangent join's crotch (the taper checks it). */
  const crotchExempt = (P: number, ap: number, Q: number, aq: number): boolean => {
    if (P !== 0 || Q !== 0) return false;
    const a1 = Math.min(ap, aq);
    const a2 = Math.max(ap, aq);
    for (const c of crotches) {
      if (a1 <= c.sJ && a2 >= c.sJ && c.sJ - a1 < c.spanC && a2 - c.sJ < c.spanO) return true;
    }
    return false;
  };

  /** Arm membership of a sample (path id, arc) at junction J, or null. */
  const armOf = (J: Junction, id: number, a: number): { name: ArmName; d: number } | null => {
    if (id === 0) {
      const sJ = J.arms[0].a0;
      return a < sJ ? { name: "in", d: sJ - a } : { name: "out", d: a - sJ };
    }
    if (id === J.spur) return { name: "spur", d: a };
    return null;
  };
  const forkExempt = (P: number, ap: number, Q: number, aq: number): boolean => {
    for (const J of junctions) {
      const x = armOf(J, P, ap);
      const y = armOf(J, Q, aq);
      if (!x || !y || x.name === y.name) continue;
      const key = J.d0.has(`${x.name}-${y.name}`) ? `${x.name}-${y.name}` : `${y.name}-${x.name}`;
      const d0 = J.d0.get(key) ?? Infinity;
      if (Math.min(x.d, y.d) < d0 && Math.max(x.d, y.d) < d0 + CLEAR) return true;
    }
    return false;
  };
  const crossExempt = (P: number, ap: number, Q: number, aq: number): boolean => {
    for (let ci = 0; ci < hits.length; ci++) {
      const pa = passes[2 * ci];
      const pb = passes[2 * ci + 1];
      const e = CLEAR / Math.max(pa.sin, 1e-6);
      if (pa.path === P && pb.path === Q && Math.abs(ap - pa.arc) < e && Math.abs(aq - pb.arc) < e) return true;
      if (pa.path === Q && pb.path === P && Math.abs(aq - pa.arc) < e && Math.abs(ap - pb.arc) < e) return true;
    }
    return false;
  };

  // --- Clearance. ---
  let minClear = Infinity;
  const bodyEnd = body.arc0 + densePath(g.body).at(-1)!.s;
  const worstPair = new Map<string, { d: number; at: [number, number] }>();
  for (let P = 0; P < recs.length; P++) {
    const rp = recs[P];
    for (let Q = P; Q < recs.length; Q++) {
      const rq = recs[Q];
      for (let i = 0; i < rp.xs.length; i++) {
        const j0 = P === Q ? i + 1 : 0;
        for (let j = j0; j < rq.xs.length; j++) {
          if (P === Q && Math.abs(rp.arc[i] - rq.arc[j]) < WINDOW) continue;
          const d = dist(rp.xs[i], rp.ys[i], rq.xs[j], rq.ys[j]);
          if (d >= CLEAR && d >= minClear) continue;
          if (crossExempt(P, rp.arc[i], Q, rq.arc[j])) continue;
          if (forkExempt(P, rp.arc[i], Q, rq.arc[j])) continue;
          if (crotchExempt(P, rp.arc[i], Q, rq.arc[j])) continue;
          // Lead tails meet only through the neighbors: skip lead-lead pairs.
          if (P === 0 && Q === 0 && (rp.arc[i] < body.arc0 || rp.arc[i] > bodyEnd) && (rq.arc[j] < body.arc0 || rq.arc[j] > bodyEnd)) continue;
          if (d < minClear) minClear = d;
          if (d < CLEAR) {
            const key = `${P}-${Q}`;
            const w = worstPair.get(key);
            if (!w || d < w.d) worstPair.set(key, { d, at: [(rp.xs[i] + rq.xs[j]) / 2, (rp.ys[i] + rq.ys[j]) / 2] });
          }
        }
      }
    }
  }
  for (const [key, w] of worstPair) {
    errors.push({ rule: "clearance", msg: `paths ${key}: ${(w.d / k).toFixed(3)} LU < ${LINT.clearLU}`, at: w.at });
  }

  // --- END tips. ---
  let minTip = Infinity;
  const tipCheck = (id: number, end: 0 | 1): void => {
    const r = recs[id];
    const ti = end === 0 ? 0 : r.xs.length - 1;
    const tx = r.xs[ti];
    const ty = r.ys[ti];
    const tArc = r.arc[ti];
    // A spur that crosses a thread runs on >= 0.56/sin past the crossing.
    for (const p of passes.filter((q) => q.path === id)) {
      const runOn = Math.abs(tArc - p.arc);
      if (runOn < TIP / p.sin) errors.push({ rule: "tip-runon", msg: `path ${id} end ${end}: ${(runOn / k).toFixed(2)} LU past crossing ${p.cross} < ${(LINT.tipLU / p.sin).toFixed(2)}` });
    }
    for (let Q = 0; Q < recs.length; Q++) {
      const rq = recs[Q];
      for (let j = 0; j < rq.xs.length; j++) {
        if (Q === id && Math.abs(rq.arc[j] - tArc) < WINDOW) continue;
        if (crossExempt(id, tArc, Q, rq.arc[j])) continue;
        if (forkExempt(id, tArc, Q, rq.arc[j])) continue;
        const d = dist(tx, ty, rq.xs[j], rq.ys[j]);
        if (d < minTip) minTip = d;
        if (d < TIP) {
          errors.push({ rule: "tip", msg: `path ${id} end ${end}: ${(d / k).toFixed(3)} LU from path ${Q} < ${LINT.tipLU}`, at: [tx, ty] });
          return;
        }
      }
    }
  };
  g.spurs.forEach((_s, i) => tipCheck(1 + i, 1));
  g.floats.forEach((_f, i) => {
    tipCheck(floatBase + i, 0);
    tipCheck(floatBase + i, 1);
  });

  return {
    ch: g.ch,
    xh,
    errors,
    warnings,
    forks,
    tapers,
    crossings,
    ends: g.spurs.length + 2 * g.floats.length,
    junctions: g.spurs.length,
    minClearLU: minClear / k,
    minTipLU: minTip / k,
    minRGU: minR,
  };
}
