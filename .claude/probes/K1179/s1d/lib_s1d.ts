// K1179 S1d (K1184 Run H): a round pinned at V, in closed form, offline.
// The rule (docs/design/K1179_s1d.md): per corner form B makes, V and
// theta exactly as solveCorner computes them; L = style*(cr/3)*
// min(1.5h, 2h*cot(theta/2)) (form B's straight-arm touch distance
// r0*cot(theta/2)); gates g = cap * steep evaluated ONCE at the
// provisional feet L from V along each arm's exact edge (no branch
// walk, no iteration); feet at arc L*g along the exact edges; the round
// is the rational quadratic Fa->Fb whose control point C is the feet's
// tangent-line intersection, weight cos(phi/2) (exactly form B's circle
// on straight arms), with a tangent-handle cubic where the lines do
// not meet on the fill side or C is farther than 4h from V. Variant
// (ii) adds form B's margin gate, evaluated once on variant (i)'s
// round at t = 0.25/0.5/0.75 and not iterated. No warm start, no
// tracking, no Newton, no bisection in the rule itself: the only
// searches are the edge piece walk (pieces of the exact outline the
// foot passes) and, for variant (ii), the centreline pieces the grid
// returns within h + L of three round points. V in the production
// path (solveVPair) is the pair iteration of closed.ts, which S1c
// measured exact against solveCorner (max dV = 0); the measurement
// scripts take V from the built FormB corner, which is the same point.
import { candidates, dS, pointAt, segB, segOfS } from "../../../../src/render/field/geom";
import { ss } from "../../../../src/render/field/form_b";
import { armFrame, edgeOutlinePoints, facingSide, isBuried, rootBandEff } from "../outline";
import { buildWindow, nearest, pairPoint } from "../s1c/closed";
import type { Pair, WinArm } from "../s1c/closed";

export const fmt = (v: number, d = 4): string => (Number.isFinite(v) ? v.toFixed(d) : String(v));
export const pctile = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
export const keyOf = (c: any): string => `${c.j}|${c.a}-${c.b}`;
export const siteOf = (fb: any, sc: any, c: any): string =>
  `${sc.junctions[c.j]?.id ?? `j${c.j}`} arms ${fb.arms[c.a].ei}-${fb.arms[c.b].ei}`;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const cross2 = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;

// ---------------------------------------------------------------- V (production path)
export interface S1dTiming { vTheta: number; feet: number; round: number; capGate: number; marginGate: number; calls: number }
export const newTiming = (): S1dTiming => ({ vTheta: 0, feet: 0, round: 0, capGate: 0, marginGate: 0, calls: 0 });

function pairOf(wA: WinArm, nA: any, wB: WinArm, nB: any, qx: number, qy: number): Pair {
  const sign = (w: WinArm, f: any): number => {
    if (f.kind === "vtx") return 0;
    return (qx - w.x[f.idx]) * -w.uy[f.idx] + (qy - w.y[f.idx]) * w.ux[f.idx] >= 0 ? 1 : -1;
  };
  return { fa: nA.feat, fb: nB.feat, sa: sign(wA, nA.feat), sb: sign(wB, nB.feat) };
}

/** V by the closed pair iteration (S1c's V, measured exact). Null when no V. */
export function solveVPair(fb: any, a: number, b: number, ji: number, th0: number, cache: Map<number, WinArm>): { Vx: number; Vy: number; dVa: number; dVb: number } | null {
  const h: number = fb.h;
  const A = fb.arms[a], B = fb.arms[b];
  if (!(A.L > 1e-9 && B.L > 1e-9)) return null;
  let wA = cache.get(a); if (!wA) { wA = buildWindow(fb, a); cache.set(a, wA); }
  let wB = cache.get(b); if (!wB) { wB = buildWindow(fb, b); cache.set(b, wB); }
  const j = fb.scene.junctions[ji];
  let bx = A.ux + B.ux, by = A.uy + B.uy;
  const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
  const sn = Math.sin(th0 / 2);
  let qx = j.c[0] + (bx * h) / sn, qy = j.c[1] + (by * h) / sn;
  let ok = false;
  for (let it = 0; it < 24; it++) {
    const nA = nearest(wA, qx, qy), nB = nearest(wB, qx, qy);
    const p = pairPoint(wA, pairOf(wA, nA, wB, nB, qx, qy), wB, h, qx, qy);
    if (!p) return null;
    const moved = Math.hypot(p.x - qx, p.y - qy);
    if (moved > h) { qx += ((p.x - qx) * h) / moved; qy += ((p.y - qy) * h) / moved; continue; }
    qx = p.x; qy = p.y;
    if (moved < 1e-12 * h) { ok = true; break; }
    if (it === 23) ok = Math.abs(nearest(wA, qx, qy).dist - h) < 1e-9 * Math.max(1, h) && Math.abs(nearest(wB, qx, qy).dist - h) < 1e-9 * Math.max(1, h);
  }
  if (!ok) return null;
  const dVa = nearest(wA, qx, qy).fd, dVb = nearest(wB, qx, qy).fd;
  const tol = 1e-9 * h;
  if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) return null;
  const crossA = A.ux * (qy - j.c[1]) - A.uy * (qx - j.c[0]);
  const crossB = B.ux * (qy - j.c[1]) - B.uy * (qx - j.c[0]);
  const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
  if (!(crossA * sgn > 0 && crossB * sgn < 0)) return null;
  return { Vx: qx, Vy: qy, dVa, dVb };
}

// ---------------------------------------------------------------- edge walk
export interface Walk {
  pts: { x: number; y: number; cum: number }[];
  total: number;
  at(arc: number): { x: number; y: number; tx: number; ty: number };
  arcOf(x: number, y: number): number;
}

/** The exact edge from V outward along arm `ai`'s facing side, as a
 * polyline (offset segments and vertex arcs at outline.ts's 0.01 rad
 * subdivision; chord-vs-arc length error < 1e-5 relative). */
export function walkEdge(fb: any, ai: number, side: number, dV: number, Vx: number, Vy: number, maxArc: number): Walk {
  const h: number = fb.h;
  const A = fb.arms[ai];
  const dEnd = Math.min(A.L, dV + maxArc + 2 * h);
  let raw = edgeOutlinePoints(fb, ai, side, dV, Math.max(dEnd, dV + 1e-12));
  const pts: { x: number; y: number; cum: number }[] = [{ x: Vx, y: Vy, cum: 0 }];
  if (raw.length) {
    const d0 = Math.hypot(raw[0].x - Vx, raw[0].y - Vy);
    if (d0 > 1e-9) {
      // V sits mid-arc at a vertex foot: fill the arc V -> raw[0] around
      // the centreline vertex at outline.ts's step.
      const a = fb.arms[ai];
      const ctr = pointAt(fb.polys[a.pi], a.sR + a.dir * dV);
      const aV = Math.atan2(Vy - ctr.y, Vx - ctr.x);
      let a0 = Math.atan2(raw[0].y - ctr.y, raw[0].x - ctr.x);
      while (a0 - aV > Math.PI) a0 -= 2 * Math.PI;
      while (a0 - aV < -Math.PI) a0 += 2 * Math.PI;
      const steps = Math.max(1, Math.ceil(Math.abs(a0 - aV) / 0.01));
      for (let i = 1; i < steps; i++) {
        const an = aV + ((a0 - aV) * i) / steps;
        pts.push({ x: ctr.x + h * Math.cos(an), y: ctr.y + h * Math.sin(an), cum: 0 });
      }
    }
    for (const p of raw) if (Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y) > 1e-12) pts.push({ x: p.x, y: p.y, cum: 0 });
  }
  let total = 0;
  for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); pts[i].cum = total; }
  const at = (arc: number): { x: number; y: number; tx: number; ty: number } => {
    const t = clamp(arc, 0, total);
    let i = 1;
    while (i < pts.length - 1 && pts[i].cum < t) i++;
    const p0 = pts[i - 1], p1 = pts[i] ?? p0;
    const seg = Math.max(p1.cum - p0.cum, 1e-300);
    const f = clamp((t - p0.cum) / seg, 0, 1);
    const ex = p1.x - p0.x, ey = p1.y - p0.y;
    const el = Math.hypot(ex, ey) || 1;
    return { x: p0.x + ex * f, y: p0.y + ey * f, tx: ex / el, ty: ey / el };
  };
  const arcOf = (x: number, y: number): number => {
    let best = Infinity, bestArc = 0;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const ex = p1.x - p0.x, ey = p1.y - p0.y;
      const l2 = ex * ex + ey * ey;
      const f = l2 > 0 ? clamp(((x - p0.x) * ex + (y - p0.y) * ey) / l2, 0, 1) : 0;
      const dd = Math.hypot(x - (p0.x + ex * f), y - (p0.y + ey * f));
      if (dd < best) { best = dd; bestArc = p0.cum + Math.sqrt(l2) * f; }
    }
    return bestArc;
  };
  return { pts, total, at, arcOf };
}

function footAt(fb: any, ai: number, x: number, y: number, dLo: number, dHi: number): { d: number; s: number; fx: number; fy: number } {
  const f = fb.footArm(ai, x, y, Math.max(0, dLo), dHi);
  return { d: fb.armDist(ai, f.s), s: f.s, fx: f.x, fy: f.y };
}

/** Centreline curvature x h at arm-distance d (Menger over +-0.05h). */
export function curvAt(fb: any, ai: number, d: number): number {
  const h: number = fb.h;
  const A = fb.arms[ai];
  const c0 = armFrame(fb, ai, clamp(d - 0.05 * h, 0, A.L));
  const c1 = armFrame(fb, ai, clamp(d, 0, A.L));
  const c2 = armFrame(fb, ai, clamp(d + 0.05 * h, 0, A.L));
  const a = Math.hypot(c1.cx - c0.cx, c1.cy - c0.cy), b = Math.hypot(c2.cx - c1.cx, c2.cy - c1.cy), cc = Math.hypot(c2.cx - c0.cx, c2.cy - c0.cy);
  if (!(a > 0 && b > 0 && cc > 0)) return 0;
  return (2 * ((c1.cx - c0.cx) * (c2.cy - c1.cy) - (c1.cy - c0.cy) * (c2.cx - c1.cx))) / (a * b * cc) * h;
}

// ---------------------------------------------------------------- the rule
export interface S1dCorner {
  j: number; a: number; b: number; theta: number; style: number;
  Vx: number; Vy: number; dVa: number; dVb: number;
  L: number; g: number; cap: number; steep: number; den: number; denV: number; slack: number;
  marginM: number; marginGate: number;
  Fa: { x: number; y: number }; Fb: { x: number; y: number };
  dFootA: number; dFootB: number; sFootA: number; sFootB: number;
  tA: { x: number; y: number }; tB: { x: number; y: number };
  kind: "quad" | "cubic" | "none"; fallback: boolean;
  Cx: number; Cy: number; w: number;
  live: boolean; beyondA: boolean; beyondB: boolean;
  walkA: Walk; walkB: Walk; arcMasterA: number; arcMasterB: number;
}

function buildRound(c: S1dCorner): void {
  // Travel Fa -> Fb arrives at Fa heading toward V's side of arm A
  // (inward, -tA) and leaves Fb outward along arm B (+tB): tA/tB are
  // the edges' outward tangents. C is where those travel lines meet.
  const d0 = { x: -c.tA.x, y: -c.tA.y }, d1 = { x: c.tB.x, y: c.tB.y };
  const det = cross2(d0.x, d0.y, d1.x, d1.y);
  let ok = false;
  if (Math.abs(det) > 1e-12) {
    const Dx = c.Fb.x - c.Fa.x, Dy = c.Fb.y - c.Fa.y;
    const s = cross2(Dx, Dy, d1.x, d1.y) / det;
    const u = cross2(Dx, Dy, d0.x, d0.y) / det;
    const Cx = c.Fa.x + s * d0.x, Cy = c.Fa.y + s * d0.y;
    if (s > 1e-12 && u < -1e-12) {
      c.Cx = Cx; c.Cy = Cy;
      ok = true;
    }
  }
  if (ok) {
    c.kind = "quad"; c.fallback = false;
    const cosPhi = clamp(d0.x * d1.x + d0.y * d1.y, -1, 1);
    c.w = Math.cos(Math.acos(cosPhi) / 2);
  } else {
    c.kind = "cubic"; c.fallback = true; c.w = 1;
    c.Cx = NaN; c.Cy = NaN;
  }
}

/** One S1d corner from a master corner's V/theta (measurement path) or
 * from solveVPair's V (production path passes the same fields). */
export function s1dCorner(fb: any, src: { j: number; a: number; b: number; theta: number; style: number; Vx: number; Vy: number; dVa: number; dVb: number }, variant: 1 | 2, timing?: S1dTiming): S1dCorner {
  const h: number = fb.h;
  const A = fb.arms[src.a], B = fb.arms[src.b];
  const theta = src.theta, style = src.style;
  const tF = timing ? performance.now() : 0;
  const sideA = facingSide(fb, src.a, src.dVa, src.Vx, src.Vy);
  const sideB = facingSide(fb, src.b, src.dVb, src.Vx, src.Vy);
  const cot = 1 / Math.tan(theta / 2);
  const L = style * (fb.cr / 3) * Math.min(1.5 * h, 2 * h * cot);
  const walkA = walkEdge(fb, src.a, sideA, src.dVa, src.Vx, src.Vy, Math.max(L, 1e-9));
  const walkB = walkEdge(fb, src.b, sideB, src.dVb, src.Vx, src.Vy, Math.max(L, 1e-9));
  // Provisional feet at L: gates evaluated there, once.
  const pA = walkA.at(L), pB = walkB.at(L);
  const fA0 = footAt(fb, src.a, pA.x, pA.y, src.dVa, src.dVa + L / h + 2 * h);
  const fB0 = footAt(fb, src.b, pB.x, pB.y, src.dVb, src.dVb + L / h + 2 * h);
  const fvA = footAt(fb, src.a, src.Vx, src.Vy, 0, Infinity);
  const fvB = footAt(fb, src.b, src.Vx, src.Vy, 0, Infinity);
  if (timing) timing.feet += performance.now() - tF;
  const tG = timing ? performance.now() : 0;
  const nVa = { x: (src.Vx - fvA.fx) / h, y: (src.Vy - fvA.fy) / h };
  const nVb = { x: (src.Vx - fvB.fx) / h, y: (src.Vy - fvB.fy) / h };
  const denV = 1 + nVa.x * nVb.x + nVa.y * nVb.y;
  const nA0 = { x: (pA.x - fA0.fx) / h, y: (pA.y - fA0.fy) / h };
  const nB0 = { x: (pB.x - fB0.fx) / h, y: (pB.y - fB0.fy) / h };
  const den = 1 + nA0.x * nB0.x + nA0.y * nB0.y;
  const slack = Math.min(A.L - fb.W - fA0.d, B.L - fb.W - fB0.d);
  const steep = ss(0, 1, (den / denV - 0.3) / 0.4);
  const cap = ss(0, 1, slack / (0.5 * h));
  const g = style > 0 && L > 0 ? steep * cap : 0;
  if (timing) timing.capGate += performance.now() - tG;
  const mk = (arcLen: number): S1dCorner => {
    const tR = timing ? performance.now() : 0;
    const fa = walkA.at(arcLen), fbb = walkB.at(arcLen);
    const fA = footAt(fb, src.a, fa.x, fa.y, src.dVa, src.dVa + L / h + 2 * h);
    const fB = footAt(fb, src.b, fbb.x, fbb.y, src.dVb, src.dVb + L / h + 2 * h);
    const c: S1dCorner = {
      j: src.j, a: src.a, b: src.b, theta, style, Vx: src.Vx, Vy: src.Vy, dVa: src.dVa, dVb: src.dVb,
      L, g, cap, steep, den, denV, slack, marginM: Infinity, marginGate: 1,
      Fa: { x: fa.x, y: fa.y }, Fb: { x: fbb.x, y: fbb.y },
      dFootA: fA.d, dFootB: fB.d, sFootA: fA.s, sFootB: fB.s,
      tA: { x: fa.tx, y: fa.ty }, tB: { x: fbb.tx, y: fbb.ty },
      kind: "none", fallback: false, Cx: NaN, Cy: NaN, w: 1,
      live: false, beyondA: arcLen > walkA.total + 1e-9, beyondB: arcLen > walkB.total + 1e-9,
      walkA, walkB, arcMasterA: 0, arcMasterB: 0,
    };
    if (arcLen > 1e-12 && Math.hypot(c.Fb.x - c.Fa.x, c.Fb.y - c.Fa.y) > 1e-12) {
      buildRound(c);
      if (c.kind === "quad" && Math.hypot(c.Cx - c.Vx, c.Cy - c.Vy) > 4 * h) { c.kind = "cubic"; c.fallback = true; c.Cx = NaN; c.Cy = NaN; }
      c.live = true;
    }
    if (timing) timing.round += performance.now() - tR;
    return c;
  };
  let c = mk(L * g);
  if (variant === 2 && c.live) {
    const tM = timing ? performance.now() : 0;
    let m = Infinity;
    for (const t of [0.25, 0.5, 0.75]) {
      const p = evalRound(c, t);
      const cand: any[] = [];
      candidates(fb.grid, p.x, p.y, h + L, cand);
      for (const cd of cand) {
        let own = false;
        for (const [ai, sF] of [[src.a, c.sFootA], [src.b, c.sFootB]] as [number, number][]) {
          const arm = fb.arms[ai];
          if (cd.chain !== arm.pi) continue;
          if (Math.abs(dS(fb.polys[arm.pi], cd.s, sF)) < 0.5 * h) { own = true; break; }
        }
        if (!own) m = Math.min(m, cd.d - h);
      }
    }
    c.marginM = m;
    c.marginGate = ss(0, 1, 1 + Math.min(0, m) / (0.05 * h));
    if (timing) timing.marginGate += performance.now() - tM;
    if (c.marginGate < 1 - 1e-15) {
      const keep = { marginM: c.marginM, marginGate: c.marginGate };
      c = mk(L * g * c.marginGate);
      c.marginM = keep.marginM; c.marginGate = keep.marginGate;
    }
  }
  if (timing) timing.calls++;
  return c;
}

export function evalRound(c: S1dCorner, t: number): { x: number; y: number; tx: number; ty: number } {
  if (c.kind === "quad") {
    const u = 1 - t;
    const w0 = u * u, w1 = 2 * c.w * t * u, w2 = t * t;
    const den = w0 + w1 + w2;
    const x = (w0 * c.Fa.x + w1 * c.Cx + w2 * c.Fb.x) / den;
    const y = (w0 * c.Fa.y + w1 * c.Cy + w2 * c.Fb.y) / den;
    // Derivative via numerator/denominator quotient (unnormalised).
    const nx = w0 * c.Fa.x + w1 * c.Cx + w2 * c.Fb.x, ny = w0 * c.Fa.y + w1 * c.Cy + w2 * c.Fb.y;
    const d0 = -2 * u, d1 = 2 * c.w * (1 - 2 * t), d2 = 2 * t;
    const dnx = d0 * c.Fa.x + d1 * c.Cx + d2 * c.Fb.x, dny = d0 * c.Fa.y + d1 * c.Cy + d2 * c.Fb.y;
    const dden = d0 + d1 + d2;
    let tx = (dnx * den - nx * dden) / (den * den), ty = (dny * den - nx * 0 - (ny * dden)) / (den * den);
    tx = (dnx * den - nx * dden) / (den * den); ty = (dny * den - ny * dden) / (den * den);
    const l = Math.hypot(tx, ty) || 1;
    return { x, y, tx: tx / l, ty: ty / l };
  }
  if (c.kind === "cubic") {
    const Lh = 0.55 * Math.hypot(c.Fb.x - c.Fa.x, c.Fb.y - c.Fa.y);
    const P1 = { x: c.Fa.x - c.tA.x * Lh, y: c.Fa.y - c.tA.y * Lh };
    const P2 = { x: c.Fb.x - c.tB.x * Lh, y: c.Fb.y - c.tB.y * Lh };
    const u = 1 - t;
    const x = u * u * u * c.Fa.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * c.Fb.x;
    const y = u * u * u * c.Fa.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * c.Fb.y;
    let tx = 3 * u * u * (P1.x - c.Fa.x) + 6 * u * t * (P2.x - P1.x) + 3 * t * t * (c.Fb.x - P2.x);
    let ty = 3 * u * u * (P1.y - c.Fa.y) + 6 * u * t * (P2.y - P1.y) + 3 * t * t * (c.Fb.y - P2.y);
    const l = Math.hypot(tx, ty) || 1;
    return { x, y, tx: tx / l, ty: ty / l };
  }
  return { x: c.Vx, y: c.Vy, tx: 1, ty: 0 };
}

export function sampleRound(c: S1dCorner, n: number): { x: number; y: number; tx: number; ty: number }[] {
  const out: { x: number; y: number; tx: number; ty: number }[] = [];
  for (let i = 0; i <= n; i++) out.push(evalRound(c, i / n));
  return out;
}

/** Fill boundary loop: V -> Fa along edge A, round, Fb -> V along edge B. */
export function fillLoop(c: S1dCorner, roundN = 25): { x: number; y: number }[] {
  const loop: { x: number; y: number }[] = [];
  const aPts = c.walkA.pts.filter((p) => p.cum <= c.walkA.arcOf(c.Fa.x, c.Fa.y) + 1e-9);
  for (const p of aPts) loop.push({ x: p.x, y: p.y });
  loop.push({ x: c.Fa.x, y: c.Fa.y });
  for (let i = 1; i < roundN; i++) { const p = evalRound(c, i / roundN); loop.push({ x: p.x, y: p.y }); }
  loop.push({ x: c.Fb.x, y: c.Fb.y });
  const bArc = c.walkB.arcOf(c.Fb.x, c.Fb.y);
  const bPts = c.walkB.pts.filter((p) => p.cum <= bArc + 1e-9).reverse();
  for (const p of bPts) loop.push({ x: p.x, y: p.y });
  return loop;
}

export function pointInLoop(loop: { x: number; y: number }[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const xi = loop[i].x, yi = loop[i].y, xj = loop[j].x, yj = loop[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Buried under the variant union: in a tube, or in another fill. */
export function s1dChecker(fb: any, corners: S1dCorner[]): (x: number, y: number, excl?: S1dCorner) => boolean {
  const live = corners.filter((c) => c.live);
  const loops = new Map<S1dCorner, { x: number; y: number }[]>();
  for (const c of live) loops.set(c, fillLoop(c, 25));
  const cell = Math.max(2 * fb.h, 0.25);
  const grid = new Map<string, S1dCorner[]>();
  for (const c of live) {
    const k = `${Math.floor(c.Vx / cell)},${Math.floor(c.Vy / cell)}`;
    const l = grid.get(k) ?? []; l.push(c); grid.set(k, l);
  }
  return (x: number, y: number, excl?: S1dCorner): boolean => {
    if (isBuried(fb, x, y)) return true;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    for (let ix = cx - 2; ix <= cx + 2; ix++) for (let iy = cy - 2; iy <= cy + 2; iy++) {
      const l = grid.get(`${ix},${iy}`);
      if (!l) continue;
      for (const c of l) {
        if (c === excl) continue;
        if (Math.hypot(x - c.Vx, y - c.Vy) > 6 * fb.h) continue;
        if (pointInLoop(loops.get(c)!, x, y)) return true;
      }
    }
    return false;
  };
}

// ---------------------------------------------------------------- measurement
const angDeg = (ax: number, ay: number, bx: number, by: number): number => {
  const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
  return (Math.acos(clamp(Math.abs((ax * bx + ay * by) / (la * lb)), -1, 1)) * 180) / Math.PI;
};

function tubeTangent(fb: any, chain: number, s: number, x: number, y: number): { tx: number; ty: number } {
  const p = fb.polys[chain];
  const { k, t } = segOfS(p, s);
  if (t > 1e-9 && t < 1 - 1e-9) {
    const b = segB(p, k);
    const l = p.segLen[k] || 1;
    return { tx: (p.x[b] - p.x[k]) / l, ty: (p.y[b] - p.y[k]) / l };
  }
  const vi = t <= 1e-9 ? k : segB(p, k);
  let tx = -(y - p.y[vi]), ty = x - p.x[vi];
  const l = Math.hypot(tx, ty) || 1;
  return { tx: tx / l, ty: ty / l };
}

export interface MeetInfo { jumpDeg: number; overshootDev: number; cls: string; x: number; y: number }
export interface VarMeasure {
  live: boolean;
  feet: { which: string; gapDev: number; jumpDeg: number; fail: boolean }[];
  meets: MeetInfo[]; worstJump: number; failRaw: boolean; failVisible: boolean;
  maxConcaveAnyDeg: number; maxConcave2pxDeg: number; concaveFail: boolean;
  smallOutside: boolean;
}

export function measureVariant(fb: any, c: S1dCorner, master: any, buriedFn: (x: number, y: number, excl?: S1dCorner) => boolean): VarMeasure {
  const h: number = fb.h;
  const dev2 = fb.scene.camera.pxPerUnit * 2;
  const out: VarMeasure = { live: c.live, feet: [], meets: [], worstJump: 0, failRaw: false, failVisible: false, maxConcaveAnyDeg: 0, maxConcave2pxDeg: 0, concaveFail: false, smallOutside: false };
  // Criterion 2 at the feet (tangent by construction; gap on the edge).
  for (const which of ["A", "B"] as const) {
    const F = which === "A" ? c.Fa : c.Fb;
    const rt = evalRound(c, which === "A" ? 0 : 1);
    const et = which === "A" ? c.tA : c.tB;
    // Travel at A is inward (-tA), at B outward (+tB).
    const jump = c.live ? angDeg(rt.tx, rt.ty, which === "A" ? -et.x : et.x, which === "A" ? -et.y : et.y) : 0;
    out.feet.push({ which, gapDev: 0, jumpDeg: jump, fail: c.live && jump > 1 });
  }
  if (!c.live) return out;
  // Concave turning along the round (200 samples): turning against
  // the round's own total tangent turn (an inflection). A quadratic
  // Bezier's tangent angle is monotonic, so this fires only on the
  // fallback cubic or a degenerate round.
  const pts = sampleRound(c, 200);
  const rawTurns: number[] = []; const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  for (let i = 1; i + 1 < pts.length; i++) {
    const ax = pts[i].x - pts[i - 1].x, ay = pts[i].y - pts[i - 1].y;
    const bx = pts[i + 1].x - pts[i].x, by = pts[i + 1].y - pts[i].y;
    rawTurns.push(Math.atan2(cross2(ax, ay, bx, by), ax * bx + ay * by));
  }
  const totalTurn = rawTurns.reduce((s, v) => s + v, 0);
  const ownSign = totalTurn !== 0 ? Math.sign(totalTurn) : (-Math.sign(fb.arms[c.a].ux * fb.arms[c.b].uy - fb.arms[c.a].uy * fb.arms[c.b].ux) || 1);
  const turns = rawTurns.map((dt) => dt * ownSign); // >0 convex in round sense
  for (const dt of turns) if (dt < 0) out.maxConcaveAnyDeg = Math.max(out.maxConcaveAnyDeg, -dt * 180 / Math.PI);
  const winWorld = 2 / dev2;
  for (let i = 0; i < turns.length; i++) {
    let sum = 0;
    for (let j = i; j < turns.length && cum[j + 1] - cum[i] <= winWorld; j++) sum += turns[j];
    if (sum < 0) out.maxConcave2pxDeg = Math.max(out.maxConcave2pxDeg, -sum * 180 / Math.PI);
  }
  out.concaveFail = out.maxConcaveAnyDeg > 0.05;
  // 1v(a) meets: crossings of other centrelines' tubes by the round.
  const N = 400;
  const smp = sampleRound(c, N);
  const crossAt = (x: number, y: number): { d: number; chain: number; s: number } => {
    const cand: any[] = [];
    candidates(fb.grid, x, y, h + c.L + h, cand);
    let best = { d: Infinity, chain: -1, s: 0 };
    for (const cd of cand) {
      let own = false;
      for (const [ai, sF] of [[c.a, c.sFootA], [c.b, c.sFootB]] as [number, number][]) {
        const arm = fb.arms[ai];
        if (cd.chain === arm.pi && Math.abs(dS(fb.polys[arm.pi], cd.s, sF)) < 0.25 * h) { own = true; break; }
      }
      if (!own && cd.d < best.d) best = { d: cd.d, chain: cd.chain, s: cd.s };
    }
    return best;
  };
  const ds = smp.map((p) => crossAt(p.x, p.y));
  let i = 1;
  while (i < N) {
    if (!(ds[i].d < h)) { i++; continue; }
    let j = i;
    let over = 0;
    while (j <= N && ds[j].d < h) { over = Math.max(over, (h - ds[j].d) * dev2); j++; }
    // Entry crossing between i-1 and i (skip the foot neighbourhoods).
    const tEntry = i / N;
    if (tEntry > 0.01 && tEntry < 0.99) {
      const pIn = smp[i], pOut = smp[i - 1];
      const f = clamp((h - ds[i - 1].d) / Math.max(1e-300, ds[i].d - ds[i - 1].d + 2 * (h - ds[i - 1].d)), 0, 1);
      void f;
      const cxp = pOut.x + (pIn.x - pOut.x) * 0.5, cyp = pOut.y + (pIn.y - pOut.y) * 0.5;
      if (!buriedFn(cxp, cyp, c)) {
        const rt = evalRound(c, tEntry);
        const tt = tubeTangent(fb, ds[i].chain, ds[i].s, cxp, cyp);
        const jump = angDeg(rt.tx, rt.ty, tt.tx, tt.ty);
        const ownChain = ds[i].chain === fb.arms[c.a].pi || ds[i].chain === fb.arms[c.b].pi;
        let cls = ownChain ? "c" : "d";
        if (ownChain) {
          // Crossing the edge span V..foot itself is a self-cross (new
          // class s); crossing the arm beyond its foot is Run K's c.
          for (const ai of [c.a, c.b]) {
            if (fb.arms[ai].pi !== ds[i].chain) continue;
            const dArm = fb.armDist(ai, ds[i].s);
            const dFoot = ai === c.a ? c.dFootA : c.dFootB;
            if (dArm <= dFoot + 0.01 * h) cls = "s";
          }
        }
        out.meets.push({ jumpDeg: jump, overshootDev: over, cls, x: cxp, y: cyp });
        out.worstJump = Math.max(out.worstJump, jump);
      }
    }
    i = j + 1;
  }
  out.failRaw = out.meets.some((m) => m.jumpDeg > 1);
  out.failVisible = out.meets.some((m) => m.jumpDeg > 1 && m.overshootDev >= 0.5);
  // Small-round clause (straight-arm equivalent radius vs r0).
  const rEq = (c.live ? Math.max(c.walkA.arcOf(c.Fa.x, c.Fa.y), 0) : 0) * Math.tan(c.theta / 2);
  void rEq;
  const effArc = Math.max(c.walkA.arcOf(c.Fa.x, c.Fa.y), c.walkB.arcOf(c.Fb.x, c.Fb.y));
  const rEq2 = effArc * Math.tan(c.theta / 2);
  if (master.r0 >= h && rEq2 < 0.25 * h) {
    const rb = rootBandEff(fb, c.theta);
    const inNull = c.beyondA || c.beyondB || c.slack <= 0.5 * h || Math.min(c.dVa, c.dVb) < rb;
    out.smallOutside = !inNull;
  }
  return out;
}

/** Hausdorff distance (dev px, dpr 2) between variant and master fill
 * boundaries, each taken from the outer of the two solves' feet. */
export function agreementDev(fb: any, c: S1dCorner, master: any, n = 60): number {
  const dev2 = fb.scene.camera.pxPerUnit * 2;
  if (!c.live && !(master.r > 1e-12 && master.omega > 0)) return 0;
  const arcAm = c.walkA.arcOf(master.tax, master.tay);
  const arcBm = c.walkB.arcOf(master.tbx, master.tby);
  const arcAv = c.walkA.arcOf(c.Fa.x, c.Fa.y);
  const arcBv = c.walkB.arcOf(c.Fb.x, c.Fb.y);
  const outerA = Math.max(arcAm, arcAv), outerB = Math.max(arcBm, arcBv);
  const edgeSpan = (walk: Walk, from: number, to: number): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    const n = Math.max(2, Math.ceil(Math.abs(to - from) / (0.02 * fb.h)));
    for (let i = 0; i <= n; i++) { const p = walk.at(from + ((to - from) * i) / n); out.push({ x: p.x, y: p.y }); }
    return out;
  };
  // Master boundary: outerA -> ta (edge), arc, tb -> outerB (edge).
  const mArc: { x: number; y: number }[] = [];
  if (master.r > 1e-12 && master.omega > 0) {
    const a0 = Math.atan2(master.tay - master.qy, master.tax - master.qx);
    let a1 = Math.atan2(master.tby - master.qy, master.tbx - master.qx);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    let aV = Math.atan2(master.Vy - master.qy, master.Vx - master.qx);
    while (aV - a0 > Math.PI) aV -= 2 * Math.PI;
    while (aV - a0 < -Math.PI) aV += 2 * Math.PI;
    if ((aV - a0) * (a1 - a0) < 0) a1 += a1 > a0 ? -2 * Math.PI : 2 * Math.PI;
    for (let i = 0; i <= n; i++) { const an = a0 + ((a1 - a0) * i) / n; mArc.push({ x: master.qx + master.r * Math.cos(an), y: master.qy + master.r * Math.sin(an) }); }
  } else mArc.push({ x: master.Vx, y: master.Vy });
  const masterB = [...edgeSpan(c.walkA, outerA, arcAm), ...mArc, ...edgeSpan(c.walkB, arcBm, outerB)];
  const vPts = sampleRound(c, n).map((p) => ({ x: p.x, y: p.y }));
  const varB = c.live ? [...edgeSpan(c.walkA, outerA, arcAv), ...vPts, ...edgeSpan(c.walkB, arcBv, outerB)] : [...edgeSpan(c.walkA, outerA, 0), ...edgeSpan(c.walkB, 0, outerB)];
  const distTo = (p: { x: number; y: number }, poly: { x: number; y: number }[]): number => {
    let best = Infinity;
    for (let i = 1; i < poly.length; i++) {
      const ax = poly[i - 1].x, ay = poly[i - 1].y;
      const ex = poly[i].x - ax, ey = poly[i].y - ay;
      const l2 = ex * ex + ey * ey;
      const f = l2 > 0 ? clamp(((p.x - ax) * ex + (p.y - ay) * ey) / l2, 0, 1) : 0;
      best = Math.min(best, Math.hypot(p.x - (ax + ex * f), p.y - (ay + ey * f)));
    }
    return best;
  };
  let mx = 0;
  for (const p of varB) mx = Math.max(mx, distTo(p, masterB));
  for (const p of masterB) mx = Math.max(mx, distTo(p, varB));
  return mx * dev2;
}

export { isBuried };
