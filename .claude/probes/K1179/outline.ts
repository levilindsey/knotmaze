// K1179 S1 spike (K1178 Run I): shared outline sampling for the fill-outline
// rule "the union of the arm bodies (half-width h) and form B's rounds",
// under master's form B settings: `new FormB(scene)` with no params at HEAD.
// At this run's start master is 4007c5db and Run H (K1163, ab7cad9a) has
// landed, so the defaults include rootBand 0.5 with rootBandScale "tip"
// (the tip-scaled root gate is ON), dEdge "near" + dEdgeTip 1, reach "quad".
// Sampling is float64 throughout: 100 points per round, every 0.01h along
// the edges (docs/design/K1179_geometry_review.md section 7, Run I task 2).
import { readFileSync } from "node:fs";
import { FormB, ROOT_BAND_REF_THETA } from "../../../src/render/field/form_b";
import type { Corner } from "../../../src/render/field/form_b";
import { candidates, pointAt, segB } from "../../../src/render/field/geom";
import type { Cand } from "../../../src/render/field/geom";
import type { FieldScene } from "../../../src/render/field/scene";

export const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
export const SCENES_12 = [
  "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64",
  "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
export const RECORDINGS = ["def_drag", "def_flow", "muse_drag", "muse_flow"];

export function loadScene(name: string): FieldScene {
  const s = JSON.parse(readFileSync(`${SCENE_DIR}/${name}.json`, "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
}
export const fmt = (v: number, d = 4): string => (Number.isFinite(v) ? v.toFixed(d) : String(v));
export const pct = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

/** The root gate's effective band for a corner, as form_b.ts wOf computes it. */
export function rootBandEff(fb: FormB, theta: number): number {
  const s = Math.sin(theta / 2);
  let scale = 1;
  if (fb.rootBandScale === "tip" && s > 0) {
    const t = 1 / s - 1;
    const tRef = 1 / Math.sin(ROOT_BAND_REF_THETA / 2) - 1;
    scale = t > 0 ? Math.min(1, t / tRef) : 0;
  }
  return Math.max(fb.rootBand * fb.h * scale, 1e-9 * fb.h);
}

/** Outward unit tangent and left normal of arm `ai` at arm-distance d. */
export function armFrame(fb: FormB, ai: number, d: number): { cx: number; cy: number; ux: number; uy: number; nx: number; ny: number; sAbs: number } {
  const a = fb.arms[ai];
  const sAbs = a.sR + a.dir * d;
  const at = pointAt(fb.polys[a.pi], sAbs);
  const ux = at.tx * a.dir;
  const uy = at.ty * a.dir;
  return { cx: at.x, cy: at.y, ux, uy, nx: -uy, ny: ux, sAbs };
}

/** Which side (+1 left of outward, -1 right) of arm `ai` faces corner point (tx, ty) at distance dA. */
export function facingSide(fb: FormB, ai: number, dA: number, tx: number, ty: number): number {
  const f = armFrame(fb, ai, dA);
  const dPlus = Math.hypot(f.cx + f.nx * fb.h - tx, f.cy + f.ny * fb.h - ty);
  const dMinus = Math.hypot(f.cx - f.nx * fb.h - tx, f.cy - f.ny * fb.h - ty);
  return dPlus <= dMinus ? 1 : -1;
}

export function edgePoint(fb: FormB, ai: number, d: number, side: number): { x: number; y: number } {
  const f = armFrame(fb, ai, d);
  return { x: f.cx + f.nx * side * fb.h, y: f.cy + f.ny * side * fb.h };
}

/** Signed Menger curvature of a triple; sign = left-turn sign in scene coords. */
export function menger(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number {
  const a = Math.hypot(x1 - x0, y1 - y0);
  const b = Math.hypot(x2 - x1, y2 - y1);
  const c = Math.hypot(x2 - x0, y2 - y0);
  if (!(a > 0 && b > 0 && c > 0)) return 0;
  return (2 * ((x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1))) / (a * b * c);
}

/**
 * The tube outline of arm `ai` on `side` between arm-distances d0..d1
 * (d0 < d1): offset segment pieces joined at centreline vertices by an arc
 * of radius h on the convex side and by the offset lines' intersection on
 * the concave side - the boundary of the union of discs along the polyline,
 * not a chord through the offset points.
 */
export function edgeOutlinePoints(fb: FormB, ai: number, side: number, d0: number, d1: number): { x: number; y: number }[] {
  const a = fb.arms[ai];
  const p = fb.polys[a.pi];
  const h = fb.h;
  const out: { x: number; y: number }[] = [];
  const ptAt = (d: number): { x: number; y: number; ux: number; uy: number } => {
    const f = armFrame(fb, ai, d);
    return { x: f.cx + f.nx * side * h, y: f.cy + f.ny * side * h, ux: f.ux, uy: f.uy };
  };
  out.push(ptAt(d0));
  // Centreline vertices strictly between d0 and d1, in arm-distance order.
  const verts: { d: number; x: number; y: number }[] = [];
  for (let vtx = 0; vtx < p.n; vtx++) {
    const s = p.s[vtx];
    let d = (s - a.sR) * a.dir;
    if (p.closed) d = ((d % p.len) + p.len) % p.len;
    if (d > d0 + 1e-9 && d < d1 - 1e-9) verts.push({ d, x: p.x[vtx], y: p.y[vtx] });
  }
  verts.sort((u, v) => u.d - v.d);
  for (const v of verts) {
    const before = ptAt(v.d - 1e-6);
    const after = ptAt(v.d + 1e-6);
    // Segment units either side of the vertex (outward arm direction).
    const uPrev = { x: before.ux, y: before.uy };
    const uNext = { x: after.ux, y: after.uy };
    // Left normals (armFrame's n) recomputed from the segment units.
    const lnPrev = { x: -uPrev.y, y: uPrev.x };
    const lnNext = { x: -uNext.y, y: uNext.x };
    const pMinus = { x: v.x + lnPrev.x * side * h, y: v.y + lnPrev.y * side * h };
    const pPlus = { x: v.x + lnNext.x * side * h, y: v.y + lnNext.y * side * h };
    const cross = uPrev.x * uNext.y - uPrev.y * uNext.x;
    if (cross * side < 0) {
      // Convex side: arc of radius h around the vertex, pMinus -> pPlus.
      const a0 = Math.atan2(pMinus.y - v.y, pMinus.x - v.x);
      let a1 = Math.atan2(pPlus.y - v.y, pPlus.x - v.x);
      while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
      while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
      const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.01));
      for (let i = 1; i < steps; i++) {
        const an = a0 + ((a1 - a0) * i) / steps;
        out.push({ x: v.x + h * Math.cos(an), y: v.y + h * Math.sin(an) });
      }
      out.push(pPlus);
    } else if (Math.abs(cross) > 1e-12) {
      // Concave side: the two offset lines meet at one point.
      const det = uPrev.x * uNext.y - uPrev.y * uNext.x;
      const dx = pPlus.x - pMinus.x;
      const dy = pPlus.y - pMinus.y;
      const t = (dx * uNext.y - dy * uNext.x) / det;
      out.push({ x: pMinus.x + uPrev.x * t, y: pMinus.y + uPrev.y * t });
    } else {
      out.push(pPlus);
    }
  }
  out.push(ptAt(d1));
  return out;
}

export interface CornerSeq {
  pts: { x: number; y: number; part: "edgeA" | "arc" | "edgeB"; d?: number }[];
  sideA: number;
  sideB: number;
  expectedSign: number;
}

/**
 * The boundary from 0.01h-stepped edge points 0.1h outside foot A, through
 * the round (100 points, foot to foot), to edge points 0.1h outside foot B.
 * Traversal is arm A (decreasing arm-distance) -> arc -> arm B (increasing),
 * the cyclic order FormB's corner loop uses. A corner with no live round
 * (r ~ 0 or omega ~ 0) contributes its V as a single point.
 */
export function cornerSequence(fb: FormB, c: Corner): CornerSeq {
  const h = fb.h;
  const A = fb.arms[c.a];
  const B = fb.arms[c.b];
  const live = c.r > 1e-12 && c.omega > 0;
  const sideA = facingSide(fb, c.a, c.dA, c.tax, c.tay);
  const sideB = facingSide(fb, c.b, c.dB, c.tbx, c.tby);
  const expectedSign = -Math.sign(A.ux * B.uy - A.uy * B.ux) || 1;
  const pts: CornerSeq["pts"] = [];
  // Edge A from 0.1h outside the foot down to it (true tube outline:
  // segment offsets with vertex arcs/intersections), then the round.
  for (const p of edgeOutlinePoints(fb, c.a, sideA, c.dA, c.dA + 0.1 * h).reverse()) pts.push({ ...p, part: "edgeA" });
  if (live) {
    const a0 = Math.atan2(c.tay - c.qy, c.tax - c.qx);
    let a1 = Math.atan2(c.tby - c.qy, c.tbx - c.qx);
    const vmx = c.Vx - c.qx;
    const vmy = c.Vy - c.qy;
    // Unwrap a1 the short way that passes the V direction.
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    const aV = Math.atan2(vmy, vmx);
    let aVu = aV;
    while (aVu - a0 > Math.PI) aVu -= 2 * Math.PI;
    while (aVu - a0 < -Math.PI) aVu += 2 * Math.PI;
    if ((aVu - a0) * (a1 - a0) < 0) a1 += a1 > a0 ? -2 * Math.PI : 2 * Math.PI;
    for (let i = 0; i < 100; i++) {
      const t = i / 99;
      const an = a0 + (a1 - a0) * t;
      pts.push({ x: c.qx + c.r * Math.cos(an), y: c.qy + c.r * Math.sin(an), part: "arc" });
    }
  } else {
    pts.push({ x: c.Vx, y: c.Vy, part: "arc" });
  }
  for (const p of edgeOutlinePoints(fb, c.b, sideB, c.dB, c.dB + 0.1 * h)) pts.push({ ...p, part: "edgeB" });
  // Scene centrelines carry near-duplicate vertices below the 0.01h sample
  // step; a repeated point would read as a curvature spike. Drop them.
  const clean = pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 1e-9);
  return { pts: clean, sideA, sideB, expectedSign };
}

const candBuf: Cand[] = [];
/**
 * Is (x, y) strictly inside some chain's tube (distance < h)? A sampled
 * outline point on the exposed union boundary sits at distance h from its
 * own centreline and >= h from every other part; a point inside a tight
 * bend's fold is nearer another part of a tube and is buried, not boundary.
 */
export function isBuried(fb: FormB, x: number, y: number): boolean {
  candBuf.length = 0;
  candidates(fb.grid, x, y, fb.h, candBuf);
  for (const c of candBuf) if (c.d < fb.h - 1e-7) return true;
  return false;
}

/** Resample a polyline at uniform arc-length step (linear interpolation). */
export function resampleUniform(pts: { x: number; y: number }[], step: number): { x: number; y: number }[] {
  if (pts.length < 2) return pts.slice();
  const out: { x: number; y: number }[] = [pts[0]];
  let acc = 0;
  let next = step;
  for (let i = 1; i < pts.length; i++) {
    let ax = pts[i - 1].x;
    let ay = pts[i - 1].y;
    const bx = pts[i].x;
    const by = pts[i].y;
    let seg = Math.hypot(bx - ax, by - ay);
    while (acc + seg >= next && seg > 0) {
      const t = (next - acc) / seg;
      ax = ax + (bx - ax) * t;
      ay = ay + (by - ay) * t;
      out.push({ x: ax, y: ay });
      seg = Math.hypot(bx - ax, by - ay);
      next += step;
    }
    acc += seg;
  }
  const last = pts[pts.length - 1];
  if (Math.hypot(last.x - out[out.length - 1].x, last.y - out[out.length - 1].y) > 1e-12) out.push(last);
  return out;
}

export interface FootMetric { gapWorld: number; jumpDeg: number; at: "A" | "B" }

/**
 * Criterion 2 at one foot: the distance from the tangent point to the arm's
 * offset edge (sampled every 0.01h over +-1h around the foot), and the angle
 * between the arc's tangent there and the edge's tangent, both oriented
 * along the traversal (A side decreasing d, B side increasing d).
 */
export function footMetric(fb: FormB, c: Corner, which: "A" | "B"): FootMetric {
  const h = fb.h;
  const ai = which === "A" ? c.a : c.b;
  const dF = which === "A" ? c.dA : c.dB;
  const tx = which === "A" ? c.tax : c.tbx;
  const ty = which === "A" ? c.tay : c.tby;
  // The drawn outline at the foot (edgeOutlinePoints: segment offsets with
  // vertex arcs). Gap = t's distance to it; tangent = its direction at the
  // closest point, oriented along the traversal. At a foot in a segment's
  // interior this is the segment's direction; at a vertex foot it is the
  // vertex arc's tangent, which the ball's arc shares by construction.
  void dF;
  const sideF = facingSide(fb, ai, which === "A" ? c.dA : c.dB, tx, ty);
  const dFoot = which === "A" ? c.dA : c.dB;
  const ol = edgeOutlinePoints(fb, ai, sideF, Math.max(0, dFoot - 0.1 * h), dFoot + 0.1 * h);
  let best = Infinity;
  let bi = 0;
  for (let i = 0; i + 1 < ol.length; i++) {
    const ax = ol[i].x;
    const ay = ol[i].y;
    const exx = ol[i + 1].x - ax;
    const eyy = ol[i + 1].y - ay;
    const l2 = exx * exx + eyy * eyy;
    const tt = l2 > 0 ? Math.min(1, Math.max(0, ((tx - ax) * exx + (ty - ay) * eyy) / l2)) : 0;
    const dd = Math.hypot(tx - (ax + exx * tt), ty - (ay + eyy * tt));
    if (dd < best) {
      best = dd;
      bi = i;
    }
  }
  let ex = ol[Math.min(bi + 1, ol.length - 1)].x - ol[bi].x;
  let ey = ol[Math.min(bi + 1, ol.length - 1)].y - ol[bi].y;
  if (which === "A") {
    ex = -ex;
    ey = -ey;
  }
  const el = Math.hypot(ex, ey) || 1;
  // Arc tangent at the foot, oriented A -> B along the short arc through V.
  let rx = tx - c.qx;
  let ry = ty - c.qy;
  const rl = Math.hypot(rx, ry);
  let gx = 0;
  let gy = 0;
  if (rl > 1e-12 && c.r > 1e-12) {
    rx /= rl;
    ry /= rl;
    // Travel A -> B sweeps the radius by s = sign(cross(tA-q, tB-q)); the
    // tangent at either foot is s * perp(radius) with perp(x, y) = (-y, x).
    const sweep = Math.sign((c.tax - c.qx) * (c.tby - c.qy) - (c.tay - c.qy) * (c.tbx - c.qx)) || 1;
    gx = sweep * -ry;
    gy = sweep * rx;
  } else {
    // Sharp corner: the "arc" tangent is the edge direction past V.
    gx = ex / el;
    gy = ey / el;
  }
  let jumpDeg: number;
  if (c.r < 0.05 * h) {
    // A micro-round's arc tangent is below the sampling scale: the G1 join
    // is the two edges' meeting at V. Measure edge-into-V against
    // edge-out-of-V (the same angle at both feet).
    const other = which === "A" ? c.b : c.a;
    const dO = which === "A" ? c.dB : c.dA;
    const tO = which === "A" ? [c.tbx, c.tby] : [c.tax, c.tay];
    const sO = facingSide(fb, other, dO, tO[0], tO[1]);
    const q0 = edgePoint(fb, other, Math.max(0, dO - 0.02 * h), sO);
    const q1 = edgePoint(fb, other, dO + 0.02 * h, sO);
    let ox = q1.x - q0.x;
    let oy = q1.y - q0.y;
    if (which === "B") {
      ox = -ox;
      oy = -oy;
    }
    const ol = Math.hypot(ox, oy) || 1;
    const d2 = Math.min(1, Math.max(-1, (ex * ox) / (el * ol) + (ey * oy) / (el * ol)));
    const c2 = (ex * oy) / (el * ol) - (ey * ox) / (el * ol);
    jumpDeg = (Math.atan2(Math.abs(c2), d2) * 180) / Math.PI;
    // Gap for a micro-round: V's distance to this edge (t is ~V here).
    return { gapWorld: best, jumpDeg, at: which };
  }
  const dot = Math.min(1, Math.max(-1, (gx * ex) / el + (gy * ey) / el));
  const cross = (gx * ey) / el - (gy * ex) / el;
  jumpDeg = (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
  return { gapWorld: best, jumpDeg, at: which };
}

export interface TrackedPoint { x: number; y: number; cx: number; cy: number; cx2?: number; cy2?: number; buried: boolean }
export type TrackedMap = Map<string, TrackedPoint>;

/**
 * Boundary points tracked by identity across frames (Run I task 3.3): edge
 * points (junction, arm, side, 0.1h steps along the arm) with their
 * centreline foot, and round points (corner, 21 fractions foot A -> foot B)
 * with both ball feet. Burial (inside another tube) is marked per point.
 */
export function trackedMap(fb: FormB, sc: FieldScene): TrackedMap {
  const h = fb.h;
  const m: TrackedMap = new Map();
  const step = 0.1 * h;
  sc.junctions.forEach((_j, ji) => {
    for (let ai = 0; ai < fb.arms.length; ai++) {
      const a = fb.arms[ai];
      if (a.j !== ji) continue;
      for (const side of [1, -1]) {
        for (let d = 0, di = 0; d <= a.L + 1e-9; d += step, di++) {
          const f = armFrame(fb, ai, d);
          const px = f.cx + f.nx * side * h;
          const py = f.cy + f.ny * side * h;
          m.set(`E|${ji}|${a.ei}|${side}|${di}`, { x: px, y: py, cx: f.cx, cy: f.cy, buried: isBuried(fb, px, py) });
        }
      }
    }
  });
  for (const c of fb.corners) {
    const A = fb.arms[c.a];
    const B = fb.arms[c.b];
    const live = c.r > 1e-12 && c.omega > 0;
    const a0 = Math.atan2(c.tay - c.qy, c.tax - c.qx);
    let a1 = Math.atan2(c.tby - c.qy, c.tbx - c.qx);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    let aV = Math.atan2(c.Vy - c.qy, c.Vx - c.qx);
    while (aV - a0 > Math.PI) aV -= 2 * Math.PI;
    while (aV - a0 < -Math.PI) aV += 2 * Math.PI;
    if ((aV - a0) * (a1 - a0) < 0) a1 += a1 > a0 ? -2 * Math.PI : 2 * Math.PI;
    for (let fi = 0; fi <= 20; fi++) {
      const f = fi / 20;
      const p = live
        ? { x: c.qx + c.r * Math.cos(a0 + (a1 - a0) * f), y: c.qy + c.r * Math.sin(a0 + (a1 - a0) * f) }
        : { x: c.Vx, y: c.Vy };
      const fa = pointAt(fb.polys[A.pi], c.sA);
      const fbq = pointAt(fb.polys[B.pi], c.sB);
      m.set(`R|${c.j}|${A.ei}-${B.ei}|${fi}`, { x: p.x, y: p.y, cx: fa.x, cy: fa.y, cx2: fbq.x, cy2: fbq.y, buried: isBuried(fb, p.x, p.y) });
    }
  }
  return m;
}

/** Compare two tracked maps: max/mean excess over skeleton motion, in dev px. */
export function compareTracked(prev: TrackedMap, cur: TrackedMap, dev: number): { compared: number; over: number; maxExcess: number; worstKey: string } {
  let compared = 0;
  let over = 0;
  let maxExcess = 0;
  let worstKey = "";
  for (const [k, c] of cur) {
    const p = prev.get(k);
    if (!p || p.buried || c.buried) continue;
    compared++;
    const disp = Math.hypot(c.x - p.x, c.y - p.y);
    let skel = Math.hypot(c.cx - p.cx, c.cy - p.cy);
    if (c.cx2 !== undefined && p.cx2 !== undefined) skel = Math.max(skel, Math.hypot(c.cx2 - p.cx2, c.cy2! - p.cy2!));
    const excess = (disp - skel) * dev;
    if (excess > 1) over++;
    if (excess > maxExcess) {
      maxExcess = excess;
      worstKey = k;
    }
  }
  return { compared, over, maxExcess, worstKey };
}

/** Small scene builders shared by the sweeps (copied stands; see spike_sweeps.ts). */
export function linePts(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const o: number[] = [];
  for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return o;
}
export function synthScene(name: string, chains: { pts: number[]; closed?: boolean }[], junctions: FieldScene["junctions"], crossings: FieldScene["crossings"] = []): FieldScene {
  return {
    version: 1,
    name,
    source: { kind: "synthetic", generator: "K1179 spike", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 2, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: chains.map((c, id) => ({ id, closed: !!c.closed, pts: c.pts, z: new Array(c.pts.length / 2).fill(0) })),
    crossings,
    junctions,
    deadEnds: [],
  } as FieldScene;
}
