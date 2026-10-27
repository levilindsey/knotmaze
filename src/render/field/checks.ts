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
    junctionPts: scene.junctions.map((j) => [j.c[0], j.c[1]]),
  };
}

const fmt = (v: number, k = 3) => (Number.isFinite(v) ? v.toFixed(k) : String(v));

function near(pts: [number, number][], x: number, y: number, R: number): boolean {
  for (const [px, py] of pts) if ((px - x) ** 2 + (py - y) ** 2 < R * R) return true;
  return false;
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
      if (cov[o] >= 0.5 && F[o] > lim) {
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
      const pc = model.prims.find((p) => p.role === "corner" && p.corner === ci)!;
      const ends: [number, number, number][] = [
        [...model.primPoint(pc, 0).slice(0, 2), c.a] as [number, number, number],
        [...model.primPoint(pc, 1).slice(0, 2), c.b] as [number, number, number],
      ];
      for (const [x, y, chain] of ends) {
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
  const skipped: Record<string, number> = { view: 0, neighbour: 0, group: 0 };
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
  let w7: [number, number] | undefined;
  let n11 = 0;
  let wrong = 0;
  const d11: string[] = [];
  const d6: string[] = [];
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
        if (dv > dev6) {
          dev6 = dv;
          w6 = P(tModel);
        }
        if (dv > 0.5) {
          gaps++;
          d6.push(
            `crossing ${ci} side ${side} dir ${dir}: ink ends ${fmt((first - tModel) * ppu, 3)} px ${first > tModel ? "before (gap)" : "past (overlap)"} the over's inner band edge`,
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
      if (runs.length !== 1 || runs[0][0] > -2 * h + 1e-9 || runs[0][1] < 2 * h - 1e-9) {
        breaks++;
        w7 = P(0);
      }
    }
  });
  const out: CheckResult[] = [];
  if (probe) {
    out.push(
      {
        id: 6,
        name: "under bands end on the over's outline",
        status: n6 === 0 ? "n/a" : gaps === 0 ? "pass" : "fail",
        value: `max end error ${fmt(dev6, 3)} px; ${gaps} of ${n6} band ends off by more than 0.5 px`,
        threshold: "within 0.5 px, no gap, no overlap",
        n: n6,
        worst: w6,
        details: d6,
      },
      {
        id: 7,
        name: "over edges continuous",
        status: n7 === 0 ? "n/a" : breaks === 0 ? "pass" : "fail",
        value: `${breaks} of ${n7} over band lines broken within ±2h`,
        threshold: "no break",
        n: n7,
        worst: w7,
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

/** Every check that needs no render (2, 3-4-5-6-7-8-9 via the probe, 11). */
export function runChecks(model: FieldModel, probe: InkProbe): CheckResult[] {
  const ctx = checkContext(model);
  const all = [
    check2(ctx),
    check3(ctx, probe),
    ...checks489(ctx, probe),
    ...check5(ctx, probe),
    ...checksCrossings(ctx, probe),
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
      if (near(ctx.crossingPts, x, y, excl)) continue;
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
