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
// - radii: R >= 11 GU (error), a G2 warning where R < 0.6 LU.
// The body is extended at both ends by straight lead tails along its entry
// and exit tangents (the joins concatenate exactly, so a neighbor leaves
// along the same line): an arm that runs off the glyph keeps its fork
// measured. K108: + - * / and Math.sqrt only (src/core is scanned).

import type { CubicPath, Glyph, Pt } from "./glyph_types";
import {
  densePath,
  findCrossings,
  g1Failures,
  K_STEPS,
  segCount,
  segOf,
  type SegRef,
} from "./glyph_eval";

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
   */
  forkMaxLU: 1.2,
  /** Lead tail length (LU) the body is extended by at each end. */
  leadLU: 2,
} as const;

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

export function lintGlyph(g: Glyph, xh: number): LintReport {
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
        // The fork rule binds the pair that leaves together (cos > 0).
        if (cos > 0) {
          if (cos > LINT.forkMinCos) errors.push({ rule: "fork-angle", msg: `junction ${s.at} ${A.name}/${B.name}: arms open by less than 15 degrees (cos ${cos.toFixed(4)})`, at: [g.body[s.at][0], g.body[s.at][1]] });
          if (!(dc / k <= LINT.forkMaxLU)) errors.push({ rule: "fork-distance", msg: `junction ${s.at} ${A.name}/${B.name}: full clearance at ${(dc / k).toFixed(2)} LU > ${LINT.forkMaxLU}`, at: [g.body[s.at][0], g.body[s.at][1]] });
        }
      }
    }
    junctions.push({ joint: s.at, spur: 1 + i, arms, d0 });
  });

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
    crossings,
    ends: g.spurs.length + 2 * g.floats.length,
    junctions: g.spurs.length,
    minClearLU: minClear / k,
    minTipLU: minTip / k,
    minRGU: minR,
  };
}
