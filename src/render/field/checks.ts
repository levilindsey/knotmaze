// K868 S1b: the design's section 6 checks (1-9 and 11), pure TS.
//
// Geometry comes from the oracle's model (where the outlines, corners, caps
// and crossings are); ink comes from an InkProbe, so the same check runs on
// the oracle's own field (an exact 0/1 predicate, run ends by bisection) and
// on any image (master's screenshots, later the GPU's frames: coverage from
// luminance, bilinear, run ends by linear interpolation). Distances are in
// world units inside and in CSS px at the scene's camera in the results.

import { type Cand, candidates, dS, footInWindow, normS, pointAt } from "./geom";
import type { Camera, FieldModel, Prim } from "./oracle";
import type { FieldScene } from "./scene";

export interface InkProbe {
  /** Ink coverage at a world point, 0..1. */
  cov(x: number, y: number): number;
  /** True: cov is an exact 0/1 predicate and run ends are bisected. */
  exact: boolean;
  label: string;
}

export interface CheckResult {
  id: number;
  name: string;
  /** "pass" | "fail" | "n/a" (nothing to measure in this scene or probe). */
  status: "pass" | "fail" | "n/a";
  /** Short measured value, e.g. "max 0.003 px". */
  value: string;
  threshold: string;
  /** Sites measured, and sites skipped with the reason. */
  n: number;
  skipped?: string;
  /** The worst site in world coordinates. */
  worst?: [number, number];
  details?: string[];
}

export function oracleProbe(model: FieldModel): InkProbe {
  return { cov: (x, y) => (model.evalPoint(x, y, false).ink ? 1 : 0), exact: true, label: "oracle" };
}

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Coverage of an RGBA image whose device pixel (i, j) covers CSS
 * [(x0 + i) / dpr, (x0 + i + 1) / dpr) under the camera.
 */
export function imageProbe(
  img: { w: number; h: number; rgba: Uint8Array },
  cam: Camera,
  x0: number,
  y0: number,
  paper: [number, number, number],
  ink: [number, number, number],
  label: string,
): InkProbe & { covAt: Float32Array } {
  const Lp = lum(...paper);
  const Li = lum(...ink);
  const covAt = new Float32Array(img.w * img.h);
  for (let i = 0; i < img.w * img.h; i++) {
    const L = lum(img.rgba[i * 4], img.rgba[i * 4 + 1], img.rgba[i * 4 + 2]);
    covAt[i] = Math.min(1, Math.max(0, (Lp - L) / (Lp - Li)));
  }
  const [a, b, c, d, e, f] = cam.worldToCss;
  const px = (i: number, j: number) => {
    const ii = Math.min(img.w - 1, Math.max(0, i));
    const jj = Math.min(img.h - 1, Math.max(0, j));
    return covAt[jj * img.w + ii];
  };
  return {
    covAt,
    exact: false,
    label,
    cov(x, y) {
      const u = (a * x + c * y + e) * cam.dpr - x0 - 0.5;
      const v = (b * x + d * y + f) * cam.dpr - y0 - 0.5;
      const i = Math.floor(u);
      const j = Math.floor(v);
      const fu = u - i;
      const fv = v - j;
      return (
        (px(i, j) * (1 - fu) + px(i + 1, j) * fu) * (1 - fv) + (px(i, j + 1) * (1 - fu) + px(i + 1, j + 1) * fu) * fv
      );
    },
  };
}

type Path = (t: number) => [number, number];

function edgeT(probe: InkProbe, f: Path, ta: number, ca: number, tb: number, cb: number): number {
  if (!probe.exact) return ta + ((0.5 - ca) / (cb - ca)) * (tb - ta);
  const inA = ca >= 0.5;
  for (let k = 0; k < 32; k++) {
    const tm = 0.5 * (ta + tb);
    if (probe.cov(...f(tm)) >= 0.5 === inA) ta = tm;
    else tb = tm;
  }
  return 0.5 * (ta + tb);
}

/** Ink runs (coverage ≥ 0.5) along f over [t0, t1], t0 < t1, sampled every step. */
export function runsOn(probe: InkProbe, f: Path, t0: number, t1: number, step: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.max(1, Math.ceil((t1 - t0) / step));
  const dt = (t1 - t0) / n;
  let pt = t0;
  let pc = probe.cov(...f(t0));
  let start = pc >= 0.5 ? t0 : NaN;
  for (let i = 1; i <= n; i++) {
    const t = t0 + dt * i;
    const c = probe.cov(...f(t));
    if (c >= 0.5 !== pc >= 0.5) {
      const te = edgeT(probe, f, pt, pc, t, c);
      if (c >= 0.5) start = te;
      else {
        out.push([start, te]);
        start = NaN;
      }
    }
    pt = t;
    pc = c;
  }
  if (!Number.isNaN(start)) out.push([start, t1]);
  return out;
}

export interface CheckContext {
  model: FieldModel;
  scene: FieldScene;
  /** CSS px per world unit at the scene's camera. */
  ppu: number;
  /** World point inside the scene's viewport, with a margin in CSS px. */
  inView(x: number, y: number, marginPx: number): boolean;
  crossingPts: [number, number][];
  /**
   * Per crossing, how far from its centre the over's outline runs inside the
   * under's tube: h / sin(θ/2) for crossing angle θ (the parallelogram's far
   * vertex), at least 2h.
   */
  crossingR: number[];
  junctionPts: [number, number][];
}

export function checkContext(model: FieldModel): CheckContext {
  const scene = model.scene;
  const [a, b, c, d, e, f] = scene.camera.worldToCss;
  const [vw, vh] = scene.camera.viewport;
  const crossingPts: [number, number][] = scene.crossings.map((x) => {
    const p = model.polys[model.idxOf.get(x.a.chain)!];
    const at = pointAt(p, normS(p, x.a.s));
    return [at.x, at.y];
  });
  const crossingR = scene.crossings.map((x) => {
    const pa = model.polys[model.idxOf.get(x.a.chain)!];
    const pb = model.polys[model.idxOf.get(x.b.chain)!];
    const ta = pointAt(pa, normS(pa, x.a.s));
    const tb = pointAt(pb, normS(pb, x.b.s));
    const half = 0.5 * Math.acos(Math.min(1, Math.abs(ta.tx * tb.tx + ta.ty * tb.ty)));
    return Math.max(2 * model.h, model.h / Math.max(0.1, Math.sin(half)));
  });
  return {
    model,
    scene,
    ppu: scene.camera.pxPerUnit,
    inView(x, y, m) {
      const u = a * x + c * y + e;
      const v = b * x + d * y + f;
      return u >= m && v >= m && u <= vw - m && v <= vh - m;
    },
    crossingPts,
    crossingR,
    junctionPts: scene.junctions.map((j) => [j.c[0], j.c[1]]),
  };
}

const fmt = (v: number, k = 3) => (Number.isFinite(v) ? v.toFixed(k) : String(v));

function near(pts: [number, number][], x: number, y: number, R: number): boolean {
  for (const [px, py] of pts) if ((px - x) ** 2 + (py - y) ** 2 < R * R) return true;
  return false;
}

/** Within crossingR + extra of any crossing (the over's outline inside the under). */
function nearCrossing(ctx: CheckContext, x: number, y: number, extra: number): boolean {
  return ctx.crossingPts.some(([px, py], i) => (px - x) ** 2 + (py - y) ** 2 < (ctx.crossingR[i] + extra) ** 2);
}

const sharedCands: Cand[] = [];

/**
 * S2: how many distinct chains' tubes contain (x, y) (centreline within h).
 * Three or more is an area no per-pixel depth can order consistently when
 * their crossings form a cyclic triple (§3.3, k42): #6 and #7 skip sites
 * there and count them.
 */
export function tubesAt(model: FieldModel, x: number, y: number): number {
  candidates(model.grid, x, y, model.h, sharedCands);
  const seen = new Set<number>();
  for (const c of sharedCands) if (c.d < model.h) seen.add(c.chain);
  return seen.size;
}

// ---------------------------------------------------------------------------
// Check 1: interior ink, from a render's coverage and the oracle's F.

/**
 * cov and F are per device pixel of one render (F in CSS px at the scene
 * camera); world(i, j) gives the pixel centre in world units.
 */
export function check1(
  ctx: CheckContext,
  w: number,
  h: number,
  cov: Float32Array,
  F: Float32Array,
  ppuRender: number,
  world: (i: number, j: number) => [number, number],
): CheckResult {
  const { model } = ctx;
  // One render pixel of slack: a pixel whose centre is that deep can still be
  // half covered by the band.
  const lim = model.W * ppuRender + 1;
  const mouthR = 2 * model.h + model.params.rRound + model.W;
  let bad = 0;
  let mouth = 0;
  let worst: [number, number] | undefined;
  let worstF = 0;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const o = j * w + i;
      // Strict majority: with point-symmetric subsamples, a pixel whose centre
      // lies across a jump of F (the over's outline over the under's interior)
      // can be exactly half ink; that is the band's edge pixel, not interior ink.
      if (cov[o] > 0.5 && F[o] > lim) {
        bad++;
        const p = world(i, j);
        if (near(ctx.junctionPts, p[0], p[1], mouthR)) mouth++;
        if (F[o] > worstF) {
          worstF = F[o];
          worst = p;
        }
      }
    }
  return {
    id: 1,
    name: "interior ink",
    status: bad === 0 ? "pass" : "fail",
    value: `${bad} px deeper than W + 1 px (mouth ${mouth} px)${bad ? `, deepest F ${fmt(worstF, 2)} px` : ""}`,
    threshold: "0 px",
    n: w * h,
    worst,
  };
}

// ---------------------------------------------------------------------------
// Check 2: corner joins (model only).

function tangentOf(pr: Prim, x: number, y: number): [number, number] {
  if (pr.kind === 0) {
    const l = Math.hypot(pr.bx - pr.ax, pr.by - pr.ay);
    return [(pr.bx - pr.ax) / l, (pr.by - pr.ay) / l];
  }
  const l = Math.hypot(x - pr.cx, y - pr.cy);
  return [-(y - pr.cy) / l, (x - pr.cx) / l];
}

function lineAngleDeg(a: [number, number], b: [number, number]): number {
  const c = Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1]));
  return (Math.acos(c) * 180) / Math.PI;
}

export function check2(ctx: CheckContext): CheckResult {
  const { model, ppu } = ctx;
  const details: string[] = [];
  let maxGap = 0;
  let maxAng = 0;
  let worst: [number, number] | undefined;
  let n = 0;
  let failedSolves = 0;
  const near2 = (x: number, y: number, skip: Prim | null, chains: number[]) => {
    let best = Infinity;
    let bp: Prim | null = null;
    for (const pr of model.prims) {
      if (pr === skip || pr.role === "corner" || !chains.includes(pr.chain)) continue;
      const d = model.primDist(pr, x, y);
      if (d < best) {
        best = d;
        bp = pr;
      }
    }
    return { d: best, pr: bp };
  };
  model.corners.forEach((c, ci) => {
    const name = `${model.scene.junctions[c.junction].id}/${c.index}`;
    if (!c.ok) {
      failedSolves++;
      details.push(`corner ${name}: solve FAILED`);
      return;
    }
    if (!ctx.inView(c.V[0], c.V[1], 0)) return;
    n++;
    if (c.r > 0) {
      // S2: a G2 corner is a chain of segment prims; its ends are the first
      // prim's start and the last prim's end.
      const pcs = model.prims.filter((p) => p.role === "corner" && p.corner === ci);
      const ends: [number, number, number, Prim][] = [
        [...model.primPoint(pcs[0], 0).slice(0, 2), c.a, pcs[0]] as [number, number, number, Prim],
        [...model.primPoint(pcs[pcs.length - 1], 1).slice(0, 2), c.b, pcs[pcs.length - 1]] as [number, number, number, Prim],
      ];
      for (const [x, y, chain, pc] of ends) {
        const { d, pr } = near2(x, y, pc, [chain]);
        const ang = pr ? lineAngleDeg(tangentOf(pc, x, y), tangentOf(pr, x, y)) : 90;
        if (d * ppu > maxGap) {
          maxGap = d * ppu;
          worst = [x, y];
        }
        if (ang > maxAng) maxAng = ang;
        details.push(`corner ${name} end on chain ${model.idOf[chain]}: gap ${fmt(d * ppu, 4)} px, angle ${fmt(ang, 3)} deg`);
      }
    } else {
      for (const chain of [c.a, c.b]) {
        const { d } = near2(c.V[0], c.V[1], null, [chain]);
        if (d * ppu > maxGap) {
          maxGap = d * ppu;
          worst = c.V;
        }
        details.push(`corner ${name} (sharp) V to chain ${model.idOf[chain]}'s outline: gap ${fmt(d * ppu, 4)} px`);
      }
    }
  });
  const pass = failedSolves === 0 && maxGap <= 0.01 && maxAng <= 0.5;
  return {
    id: 2,
    name: "corner joins",
    status: n === 0 && failedSolves === 0 ? "n/a" : pass ? "pass" : "fail",
    value: `gap max ${fmt(maxGap, 4)} px, tangent angle max ${fmt(maxAng, 3)} deg${failedSolves ? `, ${failedSolves} solves failed` : ""}`,
    threshold: "≤ 0.01 px; ≤ 0.5°",
    n,
    worst,
    details,
  };
}

// ---------------------------------------------------------------------------
// Check 3: dead-end caps.

export function check3(ctx: CheckContext, probe: InkProbe | null): CheckResult {
  const { model, ppu } = ctx;
  const h = model.h;
  let geo = 0;
  let img = 0;
  let n = 0;
  let worst: [number, number] | undefined;
  for (const pr of model.prims) {
    // Dead ends only: an END arm's terminal inside a junction is buried.
    if (pr.role !== "cap" || !ctx.inView(pr.cx, pr.cy, 0) || model.clusterAt(pr.chain, pr.sLo) >= 0 || pr.exp.length === 0) continue;
    n++;
    // The true semicircle about the terminal, against the exposed outline.
    for (let k = 0; k <= 180; k++) {
      const a = pr.a0 + (pr.sweep * k) / 180;
      const x = pr.cx + h * Math.cos(a);
      const y = pr.cy + h * Math.sin(a);
      const d = model.nearestExposed(x, y, 0.5 * h) * ppu;
      if (d > geo) {
        geo = d;
        worst = [x, y];
      }
      // The exposed cap samples against the semicircle.
      const [qx, qy] = model.primPoint(pr, k / 180);
      if (model.primDist(pr, qx, qy) < 1e-9) geo = Math.max(geo, Math.abs(Math.hypot(qx - pr.cx, qy - pr.cy) - h) * ppu);
      if (probe && k % 5 === 0) {
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const runs = runsOn(probe, (t) => [pr.cx + t * ca, pr.cy + t * sa], 0.3 * h, h + model.W, 0.1 / ppu);
        const r = runs.length ? runs[runs.length - 1][1] : 0;
        const dv = Math.abs(r - h) * ppu;
        if (dv > img) img = dv;
      }
    }
  }
  const pass = geo <= 0.05 && (!probe || img <= 0.5);
  return {
    id: 3,
    name: "dead-end caps",
    status: n === 0 ? "n/a" : pass ? "pass" : "fail",
    value: `Hausdorff ${fmt(geo, 4)} px${probe ? `; image ${fmt(img, 3)} px (${probe.label})` : ""}`,
    threshold: "≤ 0.05 px; image ≤ 0.5 px",
    n,
    worst,
  };
}

// ---------------------------------------------------------------------------
// Sections (checks 4, 8, 9): cross-sections of isolated arms.

interface Section {
  pi: number;
  s: number;
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export function sections(ctx: CheckContext, every: number): { list: Section[]; skipped: Record<string, number> } {
  const { model } = ctx;
  const h = model.h;
  const W = model.W;
  const list: Section[] = [];
  const skipped: Record<string, number> = { span: 0, crossing: 0, end: 0, view: 0, neighbour: 0 };
  const cand: Cand[] = [];
  model.polys.forEach((p, pi) => {
    const s1 = p.s0 + p.len;
    for (let s = p.s0 + 0.5 * every; s < s1; s += every) {
      const at = pointAt(p, s);
      if (!p.closed && (s - p.s0 < 2 * h || s1 - s < 2 * h)) {
        skipped.end++;
        continue;
      }
      if (model.clusterAt(pi, s) >= 0 || model.chainSpans[pi].some(([lo, hi]) => Math.abs(dS(p, lo, s)) < h || Math.abs(dS(p, hi, s)) < h)) {
        skipped.span++;
        continue;
      }
      if (near(ctx.crossingPts, at.x, at.y, 3 * h + W)) {
        skipped.crossing++;
        continue;
      }
      if (!ctx.inView(at.x, at.y, 2 * h * ctx.ppu)) {
        skipped.view++;
        continue;
      }
      candidates(model.grid, at.x, at.y, 2.6 * h + 2 * W, cand);
      if (cand.some((cd) => cd.chain !== pi || Math.abs(dS(p, cd.s, s)) > 4 * h)) {
        skipped.neighbour++;
        continue;
      }
      list.push({ pi, s, x: at.x, y: at.y, nx: -at.ty, ny: at.tx });
    }
  });
  return { list, skipped };
}

const skipText = (sk: Record<string, number>) =>
  Object.entries(sk)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

export function checks489(ctx: CheckContext, probe: InkProbe): CheckResult[] {
  const { model, ppu } = ctx;
  const h = model.h;
  const W = model.W;
  const { list, skipped } = sections(ctx, 1.5 * h);
  let wDev = 0;
  let wWorst: [number, number] | undefined;
  let not2 = 0;
  let n2Worst: [number, number] | undefined;
  let bDev = 0;
  let bWorst: [number, number] | undefined;
  const reach = h + 0.5 * W + 0.3 * h;
  for (const sc of list) {
    const runs = runsOn(probe, (t) => [sc.x + t * sc.nx, sc.y + t * sc.ny], -reach, reach, 0.1 / ppu);
    if (runs.length !== 2) {
      not2++;
      n2Worst = [sc.x, sc.y];
    }
    if (runs.length >= 1) {
      const width = runs[runs.length - 1][1] - runs[0][0];
      const dv = Math.abs(width - 2 * h) * ppu;
      if (dv > wDev) {
        wDev = dv;
        wWorst = [sc.x, sc.y];
      }
    }
    for (const [a, b] of runs) {
      const dv = Math.abs(b - a - W) * ppu;
      if (dv > bDev) {
        bDev = dv;
        bWorst = [sc.x, sc.y];
      }
    }
  }
  const n = list.length;
  const sk = skipText(skipped);
  return [
    {
      id: 4,
      name: "arm width",
      status: n === 0 ? "n/a" : wDev <= 0.05 ? "pass" : "fail",
      value: `max |2h' − 2h| ${fmt(wDev, 4)} px`,
      threshold: "2h ± 0.05 px",
      n,
      skipped: sk,
      worst: wWorst,
    },
    {
      id: 8,
      name: "two edges per section",
      status: n === 0 ? "n/a" : not2 === 0 ? "pass" : "fail",
      value: `${not2} of ${n} sections without exactly 2 runs`,
      threshold: "exactly 2 runs",
      n,
      skipped: sk,
      worst: n2Worst,
    },
    {
      id: 9,
      name: "band width (sections)",
      status: n === 0 ? "n/a" : bDev <= 0.25 ? "pass" : "fail",
      value: `max |W' − W| ${fmt(bDev, 4)} px`,
      threshold: "W ± 0.25 px",
      n,
      skipped: sk,
      worst: bWorst,
    },
  ];
}

// ---------------------------------------------------------------------------
// Check 5 (and 9 along outlines): walks inward from the exposed outline.

export function check5(ctx: CheckContext, probe: InkProbe): CheckResult[] {
  const { model, ppu } = ctx;
  const h = model.h;
  const W = model.W;
  const step = 1 / ppu;
  let n = 0;
  let bad = 0;
  let worst: [number, number] | undefined;
  let maxRun = 0;
  let bDev = 0;
  let bWorst: [number, number] | undefined;
  const skipped: Record<string, number> = { view: 0, neighbour: 0, outside: 0, group: 0 };
  for (const pr of model.prims) {
    const L = model.primLength(pr);
    for (let i = 0; i < pr.exp.length; i += 2) {
      const u0 = pr.exp[i];
      const u1 = pr.exp[i + 1];
      const m = Math.max(1, Math.floor(((u1 - u0) * L) / step));
      for (let k = 0; k < m; k++) {
        const u = u0 + ((k + 0.5) / m) * (u1 - u0);
        const [x, y, nx, ny] = model.primPoint(pr, u);
        if (!ctx.inView(x, y, 2)) {
          skipped.view++;
          continue;
        }
        // Another outline within h of the walk's deep end: a junction wedge,
        // a sharp V or a tight bend, where two bands legitimately meet.
        const dx = x - h * nx;
        const dy = y - h * ny;
        if (model.nearestExposed(dx, dy, h) < h - 1e-6) {
          skipped.neighbour++;
          continue;
        }
        // The walk starts on paper: where its outward start is inside some
        // region, another outline runs within W/2 outside this one (the other
        // arm of a sharp V, a junction wedge, an over crossing this outline),
        // and the first run is that outline's own band (x4_ends' sharp 60°
        // corner, 0.08 from V: the other arm's band at t = -0.19..-0.14).
        const tOut = model.evalPoint(x + 0.5 * W * nx, y + 0.5 * W * ny, false).top;
        if (tOut >= 0) {
          skipped.outside++;
          continue;
        }
        // The walk must stay in one group through the band to its deep end.
        const t0 = model.evalPoint(x - 0.5 * W * nx, y - 0.5 * W * ny, false).top;
        if (t0 !== model.evalPoint(dx, dy, false).top) {
          skipped.group++;
          continue;
        }
        n++;
        const runs = runsOn(probe, (t) => [x - t * nx, y - t * ny], -0.5 * W, h, 0.1 / ppu);
        const len = runs.length ? runs[0][1] - runs[0][0] : 0;
        if (len > maxRun) maxRun = len;
        if (runs.length !== 1 || len > 1.1 * W) {
          bad++;
          worst = [x, y];
        }
        if (runs.length === 1) {
          const dv = Math.abs(len - W) * ppu;
          if (dv > bDev) {
            bDev = dv;
            bWorst = [x, y];
          }
        }
      }
    }
  }
  const sk = skipText(skipped);
  return [
    {
      id: 5,
      name: "no double strokes",
      status: n === 0 ? "n/a" : bad === 0 ? "pass" : "fail",
      value: `${bad} of ${n} walks not one run ≤ 1.1W (longest ${fmt(maxRun * ppu, 3)} px, W = ${fmt(W * ppu, 2)} px)`,
      threshold: "one run, ≤ 1.1 W",
      n,
      skipped: sk,
      worst,
    },
    {
      id: 9,
      name: "band width (outline walks)",
      status: n === 0 ? "n/a" : bDev <= 0.25 ? "pass" : "fail",
      value: `max |W' − W| ${fmt(bDev, 4)} px`,
      threshold: "W ± 0.25 px",
      n,
      skipped: sk,
      worst: bWorst,
    },
  ];
}

// ---------------------------------------------------------------------------
// Checks 6, 7, 11: crossings.

export function checksCrossings(ctx: CheckContext, probe: InkProbe | null): CheckResult[] {
  const { model, ppu, scene } = ctx;
  const h = model.h;
  const W = model.W;
  let n6 = 0;
  let dev6 = 0;
  let gaps = 0;
  let w6: [number, number] | undefined;
  let n7 = 0;
  let breaks = 0;
  let thirdOnly = 0;
  const d7: string[] = [];
  let w7: [number, number] | undefined;
  let n11 = 0;
  let wrong = 0;
  const d11: string[] = [];
  const d6: string[] = [];
  // S2: sites inside an area three or more tubes share (tubesAt).
  let shared6 = 0;
  let shared7 = 0;
  scene.crossings.forEach((cx, ci) => {
    const ov = cx.over === "a" ? cx.a : cx.b;
    const un = cx.over === "a" ? cx.b : cx.a;
    const po = model.polys[model.idxOf.get(ov.chain)!];
    const pu = model.polys[model.idxOf.get(un.chain)!];
    const at = pointAt(pu, normS(pu, un.s));
    if (!ctx.inView(at.x, at.y, 2 * h * ppu)) return;
    // 11: depth order at the crossing centre.
    n11++;
    const e = model.evalPoint(at.x, at.y, true);
    const okChain = e.topChain === ov.chain;
    const okS = ov.chain !== un.chain || Math.abs(dS(po, e.topS, ov.s)) < Math.abs(dS(po, e.topS, un.s));
    if (!okChain || !okS) {
      wrong++;
      d11.push(`crossing ${ci}: top chain ${e.topChain} at s ${fmt(e.topS, 2)}, expected ${ov.chain} at s ${fmt(ov.s, 2)}`);
    }
    if (!probe) return;
    // The over pass only: on a self-crossing the window stops short of the
    // under's own pass.
    const win = ov.chain === un.chain ? Math.min(6 * h, 0.45 * Math.abs(dS(po, un.s, ov.s))) : 6 * h;
    const overDist = (x: number, y: number) => footInWindow(po, x, y, ov.s - win, ov.s + win).d;
    // 6: along the under's band mid-lines toward the crossing. Under ink runs
    // into the over's band and stops at its inner edge, |p − c_o| = h − W.
    for (const side of [-1, 1])
      for (const dir of [-1, 1]) {
        const off = side * (h - 0.5 * W);
        const P = (t: number): [number, number] => {
          const a = pointAt(pu, normS(pu, un.s + dir * t));
          return [a.x - a.ty * off, a.y + a.tx * off];
        };
        // Start where the band is clear of the over's tube.
        let tFar = 0;
        while (tFar < 8 * h && overDist(...P(tFar)) < h + W) tFar += 0.05 * h;
        if (tFar >= 8 * h) continue;
        tFar += 0.5 * h;
        if (probe.cov(...P(tFar)) < 0.5) continue;
        // Model end: walking in, the first point inside the over's interior.
        const dt = 0.02 * h;
        let tIn = NaN;
        for (let t = tFar; t > -6 * h; t -= dt)
          if (overDist(...P(t)) <= h - W) {
            tIn = t;
            break;
          }
        if (Number.isNaN(tIn)) continue;
        let lo = tIn;
        let hi = tIn + dt;
        for (let k = 0; k < 50; k++) {
          const m = 0.5 * (lo + hi);
          if (overDist(...P(m)) > h - W) hi = m;
          else lo = m;
        }
        const tModel = 0.5 * (lo + hi);
        // Image: walking in from tFar, the first ink→paper edge.
        const span = tFar - tModel + h;
        const runs = runsOn(probe, (u) => P(tFar - u), 0, span, 0.1 / ppu);
        n6++;
        const first = runs.length && runs[0][0] === 0 ? tFar - runs[0][1] : NaN;
        const dv = Number.isNaN(first) ? Infinity : Math.abs(first - tModel) * ppu;
        const shared =
          dv > 0.5 && (tubesAt(model, ...P(tModel)) >= 3 || (!Number.isNaN(first) && tubesAt(model, ...P(first)) >= 3));
        if (shared) {
          shared6++;
          d6.push(
            `crossing ${ci} side ${side} dir ${dir}: ink ends ${fmt((first - tModel) * ppu, 3)} px off, inside an area three tubes share (skipped)`,
          );
          continue;
        }
        if (dv > dev6) {
          dev6 = dv;
          w6 = P(tModel);
        }
        if (dv > 0.5) {
          gaps++;
          // Which groups meet where the ink ends (model tops either side).
          const tops = Number.isNaN(first)
            ? "no ink run from the start"
            : `top chain ${model.evalPoint(...P(first + 0.005 * h), false).topChain} → ${model.evalPoint(...P(first - 0.005 * h), false).topChain} there, over ${ov.chain}, under ${un.chain}`;
          d6.push(
            `crossing ${ci} side ${side} dir ${dir}: ink ends ${fmt((first - tModel) * ppu, 3)} px ${first > tModel ? "before (gap)" : "past (overlap)"} the over's inner band edge (${tops})`,
          );
        }
      }
    // 7: along the over's band mid-lines through the crossing.
    for (const side of [-1, 1]) {
      const off = side * (h - 0.5 * W);
      const P = (t: number): [number, number] => {
        const a = pointAt(po, normS(po, ov.s + t));
        return [a.x - a.ty * off, a.y + a.tx * off];
      };
      n7++;
      const runs = runsOn(probe, P, -2 * h, 2 * h, 0.1 / ppu);
      // Paper stretches along the line; one under a third chain is that
      // chain's business (tight triples), one under the over or the under is
      // a break.
      const gapsAt: [number, number][] = [];
      let prev = -2 * h;
      for (const [r0, r1] of runs) {
        if (r0 > prev + 1e-9) gapsAt.push([prev, r0]);
        prev = r1;
      }
      if (prev < 2 * h - 1e-9) gapsAt.push([prev, 2 * h]);
      let own = 0;
      let third = 0;
      for (const [g0, g1] of gapsAt) {
        const e = model.evalPoint(...P(0.5 * (g0 + g1)), false);
        if (e.inside && e.topChain !== ov.chain && e.topChain !== un.chain) third++;
        else if (tubesAt(model, ...P(0.5 * (g0 + g1))) >= 3) {
          shared7++;
          d7.push(
            `crossing ${ci} side ${side}: paper over t ∈ [${fmt(g0 / h, 2)}h, ${fmt(g1 / h, 2)}h], top chain ${e.topChain}, inside an area three tubes share (skipped)`,
          );
        } else {
          own++;
          d7.push(
            `crossing ${ci} side ${side}: paper over t ∈ [${fmt(g0 / h, 2)}h, ${fmt(g1 / h, 2)}h] from the crossing along the over, top chain ${e.topChain} (over ${ov.chain}, under ${un.chain})`,
          );
        }
      }
      if (own > 0) {
        breaks++;
        w7 = P(0);
      } else if (third > 0) thirdOnly++;
    }
  });
  const out: CheckResult[] = [];
  if (probe) {
    out.push(
      {
        id: 6,
        name: "under bands end on the over's outline",
        status: n6 - shared6 === 0 ? "n/a" : gaps === 0 ? "pass" : "fail",
        value: `max end error ${fmt(dev6, 3)} px; ${gaps} of ${n6 - shared6} band ends off by more than 0.5 px`,
        threshold: "within 0.5 px, no gap, no overlap",
        n: n6 - shared6,
        skipped: shared6 ? `${shared6} off inside an area three tubes share` : undefined,
        worst: w6,
        details: d6,
      },
      {
        id: 7,
        name: "over edges continuous",
        status: n7 === 0 ? "n/a" : breaks === 0 ? "pass" : "fail",
        value: `${breaks} of ${n7} over band lines broken within ±2h${thirdOnly ? ` (${thirdOnly} more interrupted only by a third chain on top, not counted)` : ""}`,
        threshold: "no break",
        n: n7,
        skipped: shared7 ? `${shared7} paper stretches inside an area three tubes share` : undefined,
        worst: w7,
        details: d7,
      },
    );
  }
  out.push({
    id: 11,
    name: "depth order at crossings",
    status: n11 === 0 ? "n/a" : wrong === 0 ? "pass" : "fail",
    value: `${n11 - wrong} of ${n11} crossings topped by the scene's over`,
    threshold: "all",
    n: n11,
    details: d11,
  });
  return out;
}

/**
 * 14 (S2): every crossing keeps its recorded over/under at its centre:
 * z(over pass) > z(under pass) under the model's depth rule, and the group
 * on top at the centre is not the under's (a third chain on top is counted
 * apart). Every crossing in the table, in view or not.
 */
export function check14(ctx: CheckContext): CheckResult {
  const { model, scene } = ctx;
  const amp = scene.look.depthAmp || 1;
  let n = 0;
  let bad = 0;
  let third = 0;
  let minGap = Infinity;
  // Failure causes: both passes inside one junction cluster's span (§3.4
  // joins them into one group, so the crossing has no over/under), and
  // table passes that do not meet in the exported geometry.
  let inCluster = 0;
  let apart = 0;
  const det: string[] = [];
  let worst: [number, number] | undefined;
  scene.crossings.forEach((cx, ci) => {
    const ov = cx.over === "a" ? cx.a : cx.b;
    const un = cx.over === "a" ? cx.b : cx.a;
    const io = model.idxOf.get(ov.chain);
    const iu = model.idxOf.get(un.chain);
    if (io === undefined || iu === undefined) return;
    n++;
    const po = model.polys[io];
    const pu = model.polys[iu];
    const gap = (model.depthAt(io, ov.s) - model.depthAt(iu, un.s)) / amp;
    const at = pointAt(pu, normS(pu, un.s));
    const ao = pointAt(po, normS(po, ov.s));
    const sep = Math.hypot(at.x - ao.x, at.y - ao.y);
    const clO = model.clusterAt(io, ov.s);
    const clU = model.clusterAt(iu, un.s);
    const e = model.evalPoint(at.x, at.y, false);
    const nearer = (s: number) => Math.abs(dS(po, e.topS, ov.s)) < Math.abs(dS(po, e.topS, s));
    const topOver = e.topChain === ov.chain && (ov.chain !== un.chain || nearer(un.s));
    const topUnder = e.topChain === un.chain && !topOver;
    if (gap < minGap) {
      minGap = gap;
      if (!(gap > 0)) worst = [at.x, at.y];
    }
    if (!(gap > 0) || topUnder || !e.inside) {
      bad++;
      worst = [at.x, at.y];
      let cause = !(gap > 0) ? "z inverted" : "the under on top";
      if (sep > model.h) {
        apart++;
        cause = `the table's passes are ${fmt(sep / model.h, 2)}h apart in the geometry`;
      } else if (clO >= 0 && clO === clU) {
        inCluster++;
        cause = `both passes inside junction cluster ${clO}'s span: one group (§3.4)`;
      }
      det.push(
        `crossing ${ci} (over ${ov.chain} s ${fmt(ov.s, 2)}, under ${un.chain} s ${fmt(un.s, 2)}): z_over − z_under = ${fmt(gap, 3)}·amp, top chain ${e.topChain}; ${cause}`,
      );
    } else if (!topOver) third++;
  });
  const causes = [inCluster ? `${inCluster} inside one junction cluster's span` : "", apart ? `${apart} with table passes apart` : ""].filter(Boolean);
  return {
    id: 14,
    name: "pinned depth keeps each crossing's over/under",
    status: n === 0 ? "n/a" : bad === 0 ? "pass" : "fail",
    value: `${n - bad} of ${n} crossings; min z_over − z_under ${fmt(minGap, 3)}·amp${third ? `; ${third} topped by a third chain at the centre` : ""}${causes.length ? ` (failures: ${causes.join(", ")})` : ""}`,
    threshold: "z_over > z_under and the under never on top, at every crossing",
    n,
    worst,
    details: det,
  };
}

// ---------------------------------------------------------------------------
// K883: the border census, and checks 15 and 16.
//
// A thread side should show unless it is under an over pass or inside its
// own junction's union. The census samples every side's ink band, decides
// from the scene whether the side should show there, and asks the ink probe
// whether it does. Truth, per side sample (chain i at s, side ±): just
// outside the outline, at O = c(s) ± (h + 0.6W)·n, and deep in the band, at
// c(s) ± (h − W/2)·n within h − W of a centreline, a piece of another tube
// hides the side when it is
//   - its own tube within σ (a tight bend),
//   - the over at a crossing in the table where this side is the under (an
//     under never hides its over),
//   - in the union of one junction with it: both inside that junction's
//     natural spans (the rule's corners, no caps), or a corner fill there,
//   - else higher under the model's depth rule.
// The ink is read at c(s) ± (h − W/2)·n.

export type BorderClass = "a" | "b" | "c" | "d" | "e" | "f";

export const BORDER_CLASSES: Record<BorderClass, string> = {
  a: "a crossing inside one junction's span (§3.4)",
  b: "two clusters merged through overlapping spans",
  c: "a failed corner solve",
  d: "a short arm",
  e: "the corner with no V",
  f: "other",
};

export interface MissingStretch {
  /** Scene chain id, side (+1 left of travel), arc range, samples. */
  chain: number;
  side: 1 | -1;
  s0: number;
  s1: number;
  n: number;
  cls: BorderClass;
  why: string;
  /** The middle sample's band point, world units. */
  at: [number, number];
}

export interface BorderCensus {
  /** Side samples that should show (in view). */
  samples: number;
  missing: number;
  /** Samples whose own outline is drawn up to 1.5W further out (not missing). */
  shifted: number;
  /** Samples that should be hidden but are drawn deep inside the hider. */
  extra: number;
  stretches: MissingStretch[];
  byClass: Record<BorderClass, { stretches: number; samples: number; ids: string[] }>;
}

interface PassPair {
  x: number;
  io: number;
  so: number;
  iu: number;
  su: number;
  th: number;
  /** h·cot(θ/2): how far the two tubes' overlap reaches along each pass. */
  L: number;
}

interface Truth {
  model: FieldModel;
  pairs: PassPair[];
  pairsOf: Map<number, PassPair[]>;
  /** Per poly: [lo, hi, junction, arm] of the natural and the final spans. */
  nat: [number, number, number, number][][];
  fin: [number, number, number, number][][];
  cornersOf: number[][];
  /** Per junction, per arm: how far from the root the junction's core
   * reaches (the farthest V foot of the arm's corners; a no-V corner's
   * overlap; a failed corner's natural extent). */
  core: number[][];
  /** Per corner: its fill's bounding box [x0, y0, x1, y1]. */
  fillBox: [number, number, number, number][];
  sc: Cand[];
}

function passPairs(model: FieldModel): PassPair[] {
  const out: PassPair[] = [];
  model.scene.crossings.forEach((cx, x) => {
    const ov = cx.over === "a" ? cx.a : cx.b;
    const un = cx.over === "a" ? cx.b : cx.a;
    const io = model.idxOf.get(ov.chain);
    const iu = model.idxOf.get(un.chain);
    if (io === undefined || iu === undefined) return;
    const to = pointAt(model.polys[io], normS(model.polys[io], ov.s));
    const tu = pointAt(model.polys[iu], normS(model.polys[iu], un.s));
    const th = Math.max(1e-3, Math.asin(Math.min(1, Math.abs(to.tx * tu.ty - to.ty * tu.tx))));
    out.push({ x, io, so: ov.s, iu, su: un.s, th, L: model.h / Math.tan(th / 2) });
  });
  return out;
}

function perPoly(model: FieldModel, spans: [number, number, number, number][][]): [number, number, number, number][][] {
  const out: [number, number, number, number][][] = model.polys.map(() => []);
  spans.forEach((l, ji) => {
    for (const [pi, lo, hi, ai] of l) out[pi].push([lo, hi, ji, ai]);
  });
  return out;
}

function truthOf(model: FieldModel): Truth {
  const pairs = passPairs(model);
  const pairsOf = new Map<number, PassPair[]>();
  for (const pp of pairs)
    for (const i of pp.io === pp.iu ? [pp.io] : [pp.io, pp.iu]) {
      const l = pairsOf.get(i) ?? [];
      l.push(pp);
      pairsOf.set(i, l);
    }
  const cornersOf: number[][] = model.scene.junctions.map(() => []);
  model.corners.forEach((c, k) => cornersOf[c.junction].push(k));
  const core: number[][] = model.scene.junctions.map((J) => J.arms.map(() => 0));
  const fillBox: [number, number, number, number][] = [];
  for (const c of model.corners) {
    const pa = model.polys[c.a];
    const pb = model.polys[c.b];
    let ea: number;
    let eb: number;
    if (c.noV) {
      ea = Math.abs(dS(pa, c.armA.s, c.noVA!));
      eb = Math.abs(dS(pb, c.armB.s, c.noVB!));
    } else if (c.ok) {
      ea = Math.abs(dS(pa, c.armA.s, c.sVA));
      eb = Math.abs(dS(pb, c.armB.s, c.sVB));
    } else ea = eb = model.h / Math.tan(Math.max(c.theta, 1e-3) / 2);
    const ca = core[c.junction];
    if (c.armIdxA !== undefined) ca[c.armIdxA] = Math.max(ca[c.armIdxA], ea);
    if (c.armIdxB !== undefined) ca[c.armIdxB] = Math.max(ca[c.armIdxB], eb);
    // inFill's region: around q, out to |V − q| + h (or G2's own box).
    const e = c.vq + model.h;
    fillBox.push(c.g2?.ok ? [c.g2.box[0], c.g2.box[1], c.g2.box[2], c.g2.box[3]] : [c.q[0] - e, c.q[1] - e, c.q[0] + e, c.q[1] + e]);
  }
  return {
    model,
    pairs,
    pairsOf,
    nat: perPoly(model, model.naturalSpans),
    fin: perPoly(model, model.junctionSpans),
    cornersOf,
    core,
    fillBox,
    sc: [],
  };
}

/** The junction whose core holds both (i, s) and (j, sj): both arms' pieces lie within their core extents. */
function coreOf(T: Truth, i: number, s: number, j: number, sj: number): number | null {
  const { model } = T;
  const hi = holders(model, T.nat, i, s);
  if (!hi.length) return null;
  const hj = holders(model, T.nat, j, sj);
  for (const [ji, ai] of hi)
    for (const [jj, aj] of hj) {
      if (jj !== ji || (aj === ai && i === j)) continue;
      const J = model.scene.junctions[ji];
      const tol = model.h / 4;
      const di = Math.abs(dS(model.polys[i], J.arms[ai].s, s));
      const dj = Math.abs(dS(model.polys[j], J.arms[aj].s, sj));
      if (di <= T.core[ji][ai] + tol && dj <= T.core[ji][aj] + tol) return ji;
    }
  return null;
}

/** The [junction, arm] pairs whose span (per-poly list) holds (pi, s). */
function holders(model: FieldModel, idx: [number, number, number, number][][], pi: number, s: number): [number, number][] {
  const p = model.polys[pi];
  const out: [number, number][] = [];
  for (const [lo, hi, ji, ai] of idx[pi]) {
    if (!p.closed) {
      if (s >= lo && s <= hi) out.push([ji, ai]);
    } else
      for (const sh of [-p.len, 0, p.len])
        if (s + sh >= lo && s + sh <= hi) {
          out.push([ji, ai]);
          break;
        }
  }
  return out;
}

/** The crossing (if any) between chain i near s and chain j near sj, and whether i is its over there. */
function pairOf(T: Truth, i: number, s: number, j: number, sj: number): { pp: PassPair; iOver: boolean } | null {
  const { model } = T;
  const pi = model.polys[i];
  const pj = model.polys[j];
  let best: { pp: PassPair; iOver: boolean } | null = null;
  let bestD = Infinity;
  for (const pp of T.pairsOf.get(i) ?? []) {
    const tol = pp.L + 2 * model.h;
    for (const iOver of [true, false]) {
      const [ii, si, jj, sjj] = iOver ? [pp.io, pp.so, pp.iu, pp.su] : [pp.iu, pp.su, pp.io, pp.so];
      if (ii !== i || jj !== j) continue;
      const d1 = Math.abs(dS(pi, s, si));
      const d2 = Math.abs(dS(pj, sj, sjj));
      if (d1 <= tol && d2 <= tol && d1 + d2 < bestD) {
        bestD = d1 + d2;
        best = { pp, iOver };
      }
    }
  }
  return best;
}

/** Why (x, y) hides chain i's side at s: a qualifying piece within dLim of it, or null. */
function hiderAt(T: Truth, i: number, s: number, x: number, y: number, dLim: number): string | null {
  const { model } = T;
  const pi = model.polys[i];
  candidates(model.grid, x, y, model.h, T.sc);
  const cs = T.sc.slice();
  let hi: [number, number][] | null = null;
  for (const c of cs) {
    if (!(c.d < dLim)) continue;
    if (c.chain === i && Math.abs(dS(pi, s, c.s)) <= model.sigma) return "self";
    // Both pieces inside one junction's core (between the root and the V
    // feet, where its arms' tubes overlap anyway): the union's interior.
    const jc = coreOf(T, i, s, c.chain, c.s);
    if (jc !== null) return `in j${jc}'s core`;
    const pr = pairOf(T, i, s, c.chain, c.s);
    if (pr) {
      if (!pr.iOver) return `under at crossing ${pr.pp.x}`;
      continue;
    }
    hi ??= holders(model, T.nat, i, s);
    if (hi.length) {
      const hj = holders(model, T.nat, c.chain, c.s);
      const J = hi.find(([a]) => hj.some(([b]) => b === a));
      if (J) return `in j${J[0]}'s union`;
    }
    if (model.depthAt(c.chain, c.s) > model.depthAt(i, s) + 1e-9) return `under chain ${model.idOf[c.chain]}`;
  }
  return null;
}

function fillAt(T: Truth, i: number, s: number, x: number, y: number): string | null {
  const { model } = T;
  const own = new Set(holders(model, T.nat, i, s).map(([ji]) => ji));
  const zi = model.depthAt(i, s);
  let cs: Cand[] | null = null;
  for (let k = 0; k < model.corners.length; k++) {
    const b = T.fillBox[k];
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    if (!model.inFill(k, x, y)) continue;
    const c = model.corners[k];
    const tag = `fill of j${c.junction}/${c.index}`;
    if (own.has(c.junction)) return tag;
    // Another junction's fill: it hides this side only where that
    // junction lies over the thread (the depth of its nearest arm here).
    if (!cs) {
      candidates(model.grid, x, y, model.h + model.W, T.sc);
      cs = T.sc.slice();
    }
    let best: Cand | null = null;
    for (const q of cs) if ((q.chain === c.a || q.chain === c.b) && (!best || q.d < best.d)) best = q;
    const zj = best ? model.depthAt(best.chain, best.s) : Math.max(model.depthAt(c.a, c.sTA), model.depthAt(c.b, c.sTB));
    if (zj > zi + 1e-9) return tag;
  }
  return null;
}

/** The cause behind an arm's span: its extent's corner when that corner has no V, failed, or did not fit. */
function armCause(T: Truth, ji: number, ai: number): { cls: BorderClass; note: string } | null {
  const { model } = T;
  for (const k of T.cornersOf[ji]) {
    const c = model.corners[k];
    if (c.armIdxA !== ai && c.armIdxB !== ai) continue;
    if (c.noV) return { cls: "e", note: `corner j${ji}/${c.index} has no V` };
  }
  for (const k of T.cornersOf[ji]) {
    const c = model.corners[k];
    if (c.armIdxA !== ai && c.armIdxB !== ai) continue;
    if (!c.ok) {
      const arm = ai === c.armIdxA ? c.armA : c.armB;
      const p = model.polys[ai === c.armIdxA ? c.a : c.b];
      const room = p.closed ? Infinity : arm.dir > 0 ? p.s0 + p.len - arm.s : arm.s - p.s0;
      const need = (c.rRule ?? c.r) / Math.tan(c.theta / 2);
      if (room < need) return { cls: "d", note: `corner j${ji}/${c.index}: arm ends ${fmt(room / model.h, 2)}h out, the ball needs ${fmt(need / model.h, 2)}h` };
      return { cls: "c", note: `corner j${ji}/${c.index} failed its solve` };
    }
  }
  return null;
}

function classify(T: Truth, i: number, s: number, bx: number, by: number, ox: number, oy: number): { cls: BorderClass; why: string } {
  const { model } = T;
  const h = model.h;
  const pi = model.polys[i];
  model.recordGroups = true;
  model.evalPoint(bx, by, false);
  const le = model.lastEval;
  model.recordGroups = false;
  if (!le || !le.top) return { cls: "f", why: "outside every group" };
  const own = (c: Cand) => c.chain === i && Math.abs(dS(pi, c.s, s)) <= model.sigma;
  if (!le.top.some((k) => own(le.cands[k]))) {
    const c = le.cands[le.topNear];
    return { cls: "f", why: `chain ${model.idOf[c.chain]}'s group on top` };
  }
  const topCl = new Set(le.top.map((k) => le.cl[k]).filter((v) => v >= 0));
  const members = le.top.map((k) => le.cands[k]);
  candidates(model.grid, ox, oy, h, T.sc);
  const cul = T.sc
    .filter((c) => c.d < h && !own(c))
    .filter(
      (c) =>
        topCl.has(model.clusterAt(c.chain, c.s)) ||
        members.some((m) => m.chain === c.chain && Math.abs(dS(model.polys[c.chain], m.s, c.s)) <= model.sigma),
    )
    .map((c) => ({ c, pr: pairOf(T, i, s, c.chain, c.s) }))
    .sort((u, v) => (u.pr ? 0 : 1) - (v.pr ? 0 : 1));
  for (const { c, pr } of cul) {
    const hi = holders(model, T.fin, i, s);
    const hj = holders(model, T.fin, c.chain, c.s);
    const both = hi.filter(([a]) => hj.some(([b]) => b === a));
    const what = pr ? `crossing ${pr.pp.x}` : `chain ${model.idOf[c.chain]}'s tube`;
    if (both.length) {
      const [ji] = both[0];
      // The arm holding the piece farther from the root drags it in.
      const ai = hi.find(([a]) => a === ji)![1];
      const aj = hj.find(([a]) => a === ji)![1];
      const ri = Math.abs(dS(pi, model.scene.junctions[ji].arms[ai].s, s));
      const rj = Math.abs(dS(model.polys[c.chain], model.scene.junctions[ji].arms[aj].s, c.s));
      const cause = armCause(T, ji, ri >= rj ? ai : aj);
      if (cause) return { cls: cause.cls, why: `${what} in j${ji}'s spans: ${cause.note}` };
      return { cls: pr ? "a" : "f", why: `${what} in j${ji}'s spans${pr ? "" : " (no crossing)"}` };
    }
    if (hi.length && hj.length) {
      const cause = armCause(T, hj[0][0], hj[0][1]) ?? armCause(T, hi[0][0], hi[0][1]);
      if (cause) return { cls: cause.cls, why: `${what}: j${hi[0][0]} + j${hj[0][0]} merged; ${cause.note}` };
      return { cls: "b", why: `${what}: j${hi[0][0]} + j${hj[0][0]} merged (cluster ${model.clusterAt(i, s)})` };
    }
    return { cls: "f", why: `${what} in the same group, no junction holds both` };
  }
  for (const ci of topCl)
    for (const k of model.clusters[ci].corners)
      if (model.inFill(k, ox, oy)) {
        const c = model.corners[k];
        return { cls: "f", why: `under the fill of j${c.junction}/${c.index}` };
      }
  return { cls: "f", why: "buried, no culprit found" };
}

/**
 * K883: every thread side that should show and does not, by cause. step is
 * the arc-length sample spacing (default h/4); inView limits the samples
 * (default: the scene's viewport); probe reads the ink (default: the
 * oracle's own predicate).
 */
export function borderCensus(
  model: FieldModel,
  opts: { step?: number; inView?: (x: number, y: number) => boolean; probe?: InkProbe; only?: (pi: number, s: number) => boolean } = {},
): BorderCensus {
  const h = model.h;
  const W = model.W;
  const T = truthOf(model);
  const ctx = opts.inView ? null : checkContext(model);
  const inView = opts.inView ?? ((x: number, y: number) => ctx!.inView(x, y, 1));
  const ink = opts.probe ? (x: number, y: number) => opts.probe!.cov(x, y) > 0.5 : (x: number, y: number) => model.evalPoint(x, y, false).ink;
  const step = opts.step ?? h / 4;
  const out: BorderCensus = {
    samples: 0,
    missing: 0,
    shifted: 0,
    extra: 0,
    stretches: [],
    byClass: { a: blank(), b: blank(), c: blank(), d: blank(), e: blank(), f: blank() },
  };
  model.polys.forEach((p, pi) => {
    const n = Math.max(1, Math.ceil(p.len / step));
    for (const side of [1, -1] as const) {
      let run: MissingStretch | null = null;
      let mid: [number, number][] = [];
      const flush = () => {
        if (run) {
          run.at = mid[Math.floor(mid.length / 2)];
          out.stretches.push(run);
        }
        run = null;
        mid = [];
      };
      for (let k = 0; k <= (p.closed ? n - 1 : n); k++) {
        const s = p.s0 + (k / n) * p.len;
        if (opts.only && !opts.only(pi, s)) {
          flush();
          continue;
        }
        const at = pointAt(p, normS(p, s));
        const nx = -at.ty * side;
        const ny = at.tx * side;
        const bx = at.x + nx * (h - W / 2);
        const by = at.y + ny * (h - W / 2);
        if (!inView(bx, by)) {
          flush();
          continue;
        }
        const ox = at.x + nx * (h + 0.6 * W);
        const oy = at.y + ny * (h + 0.6 * W);
        const hid = hiderAt(T, pi, s, ox, oy, h) ?? hiderAt(T, pi, s, bx, by, h - W) ?? fillAt(T, pi, s, ox, oy);
        if (hid) {
          // Extra: drawn though hidden deep inside the hider.
          if (hiderAt(T, pi, s, bx, by, h - 1.5 * W) && hid !== "self" && ink(bx, by)) out.extra++;
          flush();
          continue;
        }
        out.samples++;
        if (ink(bx, by)) {
          flush();
          continue;
        }
        // Shifted, not missing: this piece's own outline drawn a little
        // further out (on a corner's round, or a merged group's outline).
        if (shiftedInk(model, opts.probe, pi, s, at, nx, ny)) {
          out.shifted++;
          flush();
          continue;
        }
        out.missing++;
        const { cls, why } = classify(T, pi, s, bx, by, ox, oy);
        if (run && (run as MissingStretch).cls === cls && (run as MissingStretch).why === why) {
          (run as MissingStretch).s1 = s;
          (run as MissingStretch).n++;
        } else {
          flush();
          run = { chain: model.idOf[pi], side, s0: s, s1: s, n: 1, cls, why, at: [bx, by] };
        }
        mid.push([bx, by]);
      }
      flush();
    }
  });
  for (const st of out.stretches) {
    const b = out.byClass[st.cls];
    b.stretches++;
    b.samples += st.n;
    if (!b.ids.includes(st.why)) b.ids.push(st.why);
  }
  out.stretches.sort((u, v) => v.n - u.n);
  return out;
}

/** Ink on the normal from h − W to h + W whose top group holds this piece (the oracle), or any ink there (a probe). */
function shiftedInk(
  model: FieldModel,
  probe: InkProbe | undefined,
  pi: number,
  s: number,
  at: { x: number; y: number },
  nx: number,
  ny: number,
): boolean {
  const { h, W } = model;
  for (let o = h - W; o <= h + W + 1e-9; o += W / 4) {
    const x = at.x + nx * o;
    const y = at.y + ny * o;
    if (probe) {
      if (probe.cov(x, y) > 0.5) return true;
      continue;
    }
    model.recordGroups = true;
    const e = model.evalPoint(x, y, false);
    const le = model.lastEval;
    model.recordGroups = false;
    if (!e.ink || !le?.top) continue;
    const p = model.polys[pi];
    if (le.top.some((k) => le.cands[k].chain === pi && Math.abs(dS(p, s, le.cands[k].s)) <= model.sigma)) return true;
  }
  return false;
}

function blank() {
  return { stretches: 0, samples: 0, ids: [] as string[] };
}

/**
 * 15 (K883): no group holds both passes of a crossing. At each crossing's
 * centre and two points along each pass inside the overlap (±L/2, L =
 * h·cot(θ/2)), no group of the field may hold candidates of both passes.
 * A kink whose loop is shorter than σ joins its own passes by the
 * same-chain rule; those are counted apart. On a longer kink a member counts
 * for the pass it is nearer, within half the loop: at a shallow kink L + h
 * outreaches half the loop, and the pass alone read as "both" (K883: three
 * false hits at 2-14°).
 */
export function check15(ctx: CheckContext): CheckResult {
  const { model } = ctx;
  const T = truthOf(model);
  let n = 0;
  let bad = 0;
  let sigmaJoined = 0;
  const det: string[] = [];
  let worst: [number, number] | undefined;
  for (const pp of T.pairs) {
    const po = model.polys[pp.io];
    const pu = model.polys[pp.iu];
    if (pp.io === pp.iu && Math.abs(dS(po, pp.so, pp.su)) <= model.sigma) {
      sigmaJoined++;
      continue;
    }
    n++;
    const kink = pp.io === pp.iu;
    const half = kink ? 0.5 * Math.abs(dS(po, pp.so, pp.su)) : Infinity;
    const win = Math.min(pp.L + model.h, half);
    const pts: [number, number][] = [];
    for (const [p, s] of [
      [po, pp.so],
      [pu, pp.su],
    ] as const)
      for (const f of [0, -0.5, 0.5]) {
        const a = pointAt(p, normS(p, s + f * Math.min(pp.L, half)));
        pts.push([a.x, a.y]);
      }
    // On a kink a member counts for its nearer pass only.
    const dO = (c: { chain: number; s: number }) => (c.chain === pp.io ? Math.abs(dS(po, c.s, pp.so)) : Infinity);
    const dU = (c: { chain: number; s: number }) => (c.chain === pp.iu ? Math.abs(dS(pu, c.s, pp.su)) : Infinity);
    let hit = "";
    model.recordGroups = true;
    for (const [x, y] of pts) {
      model.evalPoint(x, y, false);
      const le = model.lastEval;
      if (!le) continue;
      for (const g of le.groups) {
        const hasO = g.some((k) => dO(le.cands[k]) <= win && (!kink || dO(le.cands[k]) <= dU(le.cands[k])));
        const hasU = g.some((k) => dU(le.cands[k]) <= win && (!kink || dU(le.cands[k]) < dO(le.cands[k])));
        if (hasO && hasU) {
          const cls = new Set(g.map((k) => le.cl[k]).filter((v) => v >= 0));
          hit = cls.size ? `cluster ${[...cls].join("+")} (junctions ${[...cls].map((c) => model.clusters[c].junctions.map((j) => `j${j}`).join(",")).join(" | ")})` : "the same-chain rule";
          worst = [x, y];
          break;
        }
      }
      if (hit) break;
    }
    model.recordGroups = false;
    if (hit) {
      bad++;
      det.push(`crossing ${pp.x} (over ${model.idOf[pp.io]} s ${fmt(pp.so, 2)}, under ${model.idOf[pp.iu]} s ${fmt(pp.su, 2)}): one group via ${hit}`);
    }
  }
  return {
    id: 15,
    name: "no group holds both passes of a crossing",
    status: n === 0 ? "n/a" : bad === 0 ? "pass" : "fail",
    value: `${n - bad} of ${n} crossings${sigmaJoined ? `; ${sigmaJoined} kink(s) inside σ skipped` : ""}`,
    threshold: "0 crossings with both passes in one group",
    n,
    skipped: sigmaJoined ? `${sigmaJoined} kink crossings whose passes are within σ` : undefined,
    worst,
    details: det,
  };
}

/**
 * 16 (K883): every crossing's over pass keeps both its borders through the
 * crossing: its side samples over s_over ± (L + h) that the census's truth
 * says should show are inked.
 */
export function check16(ctx: CheckContext, probe: InkProbe): CheckResult {
  const { model } = ctx;
  const T = truthOf(model);
  const win = new Map<number, [number, number][]>();
  for (const pp of T.pairs) {
    const l = win.get(pp.io) ?? [];
    l.push([pp.so - pp.L - model.h, pp.so + pp.L + model.h]);
    win.set(pp.io, l);
  }
  const only = (pi: number, s: number) => {
    const p = model.polys[pi];
    return (win.get(pi) ?? []).some(([lo, hi]) => Math.abs(dS(p, (lo + hi) / 2, s)) <= (hi - lo) / 2);
  };
  const c = borderCensus(model, { step: model.h / 8, only, probe, inView: (x, y) => ctx.inView(x, y, 1) });
  const bad = c.stretches.length;
  const det = c.stretches.slice(0, 40).map((st) => `chain ${st.chain} side ${st.side > 0 ? "L" : "R"} s ${fmt(st.s0, 2)}..${fmt(st.s1, 2)} (${st.n}): (${st.cls}) ${st.why}`);
  return {
    id: 16,
    name: "every crossing's over keeps both its borders",
    status: c.samples === 0 ? "n/a" : bad === 0 ? "pass" : "fail",
    value: `${c.samples - c.missing} of ${c.samples} over-side samples inked; ${bad} missing stretch(es)`,
    threshold: "0 missing stretches",
    n: c.samples,
    worst: c.stretches[0]?.at,
    details: det,
  };
}

/** Every check that needs no render (2, 3-4-5-6-7-8-9 via the probe, 11, 14, 15, 16). */
export function runChecks(model: FieldModel, probe: InkProbe): CheckResult[] {
  const ctx = checkContext(model);
  const all = [
    check2(ctx),
    check3(ctx, probe),
    ...checks489(ctx, probe),
    ...check5(ctx, probe),
    ...checksCrossings(ctx, probe),
    check14(ctx),
    check15(ctx),
    check16(ctx, probe),
  ];
  return all.sort((a, b) => a.id - b.id);
}

/** One caption line per result: "#4 arm width: PASS, max ... (n 12)". */
export function captionLines(results: CheckResult[]): string[] {
  return results.map(
    (r) =>
      `#${r.id === 0 ? "EDT" : r.id} ${r.name}: ${r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "n/a"}, ${r.value} [${r.threshold}; n ${r.n}${
        r.skipped ? `; skipped ${r.skipped}` : ""
      }]`,
  );
}

// ---------------------------------------------------------------------------
// EDT cross-check: the oracle's exact F against a brute-force distance
// transform of its own inside predicate.

/** 1-D squared distance transform (Felzenszwalb and Huttenlocher), f → d. */
function edt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Squared EDT (grid units) to the nearest 0 cell of a mask (1 = inside). */
export function edt2(mask: Uint8Array, nx: number, ny: number): Float64Array {
  const INF = 1e20;
  const D = new Float64Array(nx * ny);
  for (let i = 0; i < nx * ny; i++) D[i] = mask[i] ? INF : 0;
  const n = Math.max(nx, ny);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) f[j] = D[j * nx + i];
    edt1(f, ny, d, v, z);
    for (let j = 0; j < ny; j++) D[j * nx + i] = d[j];
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) f[i] = D[j * nx + i];
    edt1(f, nx, d, v, z);
    for (let i = 0; i < nx; i++) D[j * nx + i] = d[i];
  }
  return D;
}

/**
 * Rasters evalPoint().inside at spacing g (world) over the render's extent
 * plus 3h, takes its EDT (minus g/2: the outline lies between the last
 * inside and the first outside sample) and compares it with the render's F
 * where 0 < F ≤ 2W, away from crossings (where the top group changes inside
 * the union, so the union's EDT is not the field).
 */
export function edtCheck(
  ctx: CheckContext,
  w: number,
  hgt: number,
  F: Float32Array,
  ppuRender: number,
  world: (i: number, j: number) => [number, number],
  g: number,
): CheckResult & { p99: number } {
  const { model } = ctx;
  const h = model.h;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [i, j] of [
    [0, 0],
    [w - 1, 0],
    [0, hgt - 1],
    [w - 1, hgt - 1],
  ]) {
    const [x, y] = world(i, j);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  x0 -= 3 * h;
  y0 -= 3 * h;
  x1 += 3 * h;
  y1 += 3 * h;
  const nx = Math.ceil((x1 - x0) / g) + 1;
  const ny = Math.ceil((y1 - y0) / g) + 1;
  const mask = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) mask[j * nx + i] = model.evalPoint(x0 + i * g, y0 + j * g, false).inside ? 1 : 0;
  const D = edt2(mask, nx, ny);
  const dist = (u: number, v: number) => Math.sqrt(D[v * nx + u]);
  const errs: number[] = [];
  let worst: [number, number] | undefined;
  let max = 0;
  const excl = 2 * h + 2 * model.W;
  for (let j = 0; j < hgt; j++)
    for (let i = 0; i < w; i++) {
      const Fo = F[j * w + i];
      if (!(Fo > 0 && Fo <= 2 * model.W * ppuRender)) continue;
      const [x, y] = world(i, j);
      if (nearCrossing(ctx, x, y, excl - 2 * h)) continue;
      const u = (x - x0) / g;
      const v = (y - y0) / g;
      const iu = Math.floor(u);
      const iv = Math.floor(v);
      const fu = u - iu;
      const fv = v - iv;
      const e =
        (dist(iu, iv) * (1 - fu) + dist(iu + 1, iv) * fu) * (1 - fv) + (dist(iu, iv + 1) * (1 - fu) + dist(iu + 1, iv + 1) * fu) * fv;
      const Fe = (e - 0.5) * g * ppuRender;
      const err = Math.abs(Fe - Fo);
      errs.push(err);
      if (err > max) {
        max = err;
        worst = [x, y];
      }
    }
  errs.sort((a, b) => a - b);
  const p99 = errs.length ? errs[Math.floor(0.99 * (errs.length - 1))] : 0;
  const lim = g * ppuRender;
  return {
    id: 0,
    name: "EDT cross-check of F",
    status: errs.length === 0 ? "n/a" : max <= lim ? "pass" : "fail",
    value: `max |F − EDT| ${fmt(max, 3)} px, p99 ${fmt(p99, 3)} px (grid ${fmt(g / h, 3)}h)`,
    threshold: `≤ ${fmt(lim, 2)} px (one grid step)`,
    n: errs.length,
    worst,
    p99,
  };
}
