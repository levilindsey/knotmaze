// K1179 S1b (K1178 Run K): shared helpers for the corrected measurement,
// the failure classes, and gate-factor reads. Imports Run I's probes
// (../outline.ts, ../seq13_lib.ts); Run I's files are unchanged.
import { candidates, footInWindow, pointAt, segB } from "../../../../src/render/field/geom";
import type { Poly } from "../../../../src/render/field/geom";
import { edgeOutlinePoints, isBuried, menger, rootBandEff } from "../outline";

export const ss = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const fmt = (v: number, d = 4): string => (Number.isFinite(v) ? v.toFixed(d) : String(v));
export const pctile = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

// ---- marginOf, copied from form_b.ts solveCorner (the basin walk) -------
// How much nearer to (x, y) the arm's window comes, outside the tracked
// foot's basin, than the foot itself (dc = the foot's distance).
export function marginOf(pl: Poly, x: number, y: number, sf: number, win: [number, number], dc: number): number {
  const normS = (p: Poly, s: number): number => {
    if (p.closed) {
      let u = (s - p.s0) % p.len;
      if (u < 0) u += p.len;
      return p.s0 + u;
    }
    return Math.min(Math.max(s, p.s0), p.s0 + p.len);
  };
  const f0 = pointAt(pl, sf);
  const base = sf - normS(pl, sf);
  let hi = win[1];
  let k = f0.k;
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
  k = f0.k;
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
}

/** Margins at a corner's q (its stored feet), for either form-B flavour. */
export function marginsAt(fb: any, c: any): { mA: number; mB: number; min: number } {
  const winA = fb.armWindow(c.a) as [number, number];
  const winB = fb.armWindow(c.b) as [number, number];
  const rho = fb.h + c.r;
  const mA = marginOf(fb.polys[fb.arms[c.a].pi], c.qx, c.qy, c.sA, winA, rho);
  const mB = marginOf(fb.polys[fb.arms[c.b].pi], c.qx, c.qy, c.sB, winB, rho);
  return { mA, mB, min: Math.min(mA, mB) };
}

/** The gate factors at a corner's q, separated (task 5 and the classes). */
export function gateFactors(fb: any, c: any): Record<string, number> {
  const h = fb.h;
  const A = fb.arms[c.a];
  const B = fb.arms[c.b];
  const rho = h + c.r;
  const fa = pointAt(fb.polys[A.pi], c.sA);
  const fbq = pointAt(fb.polys[B.pi], c.sB);
  const den = 1 + ((c.qx - fa.x) * (c.qx - fbq.x) + (c.qy - fa.y) * (c.qy - fbq.y)) / (rho * rho);
  // den at V: V's feet by a fresh foot search at V.
  const va = fb.footArm(c.a, c.Vx, c.Vy);
  const vb = fb.footArm(c.b, c.Vx, c.Vy);
  const denV = 1 + ((c.Vx - va.x) * (c.Vx - vb.x) + (c.Vy - va.y) * (c.Vy - vb.y)) / (h * h);
  const { mA, mB, min: mMin } = marginsAt(fb, c);
  const slack = Math.min(A.L - fb.W - c.dA, B.L - fb.W - c.dB);
  const rb = rootBandEff(fb, c.theta);
  return {
    mAH: mA / h, mBH: mB / h, mMinH: mMin / h,
    marginOld: ss(0, 1, 1 + Math.min(0, mMin) / (0.05 * h)),
    marginNew: ss(0, 1, mMin / (0.05 * h)),
    den, denV, steep: ss(0, 1, (den / denV - 0.3) / 0.4),
    cap: ss(0, 1, slack / (0.5 * h)), slackH: slack / h,
    root: ss(0, 1, c.dA / rb) * ss(0, 1, c.dB / rb), rbEffH: rb / h,
  };
}

// ---- the fill, as form_b.ts inFill defines it (standalone copy) ---------
export function inWedgeS1b(c: any, x: number, y: number): boolean {
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

export function inFillS1b(fb: any, c: any, x: number, y: number): boolean {
  if (!(c.r > 0 && c.omega > 0)) return false;
  const dq = Math.hypot(x - c.qx, y - c.qy);
  if (!(dq > c.r) || dq > c.rV + (2 * fb.aa) / Math.max(0.1, Math.sin(c.theta / 2)) + 1e-12) return false;
  if (!inWedgeS1b(c, x, y)) return false;
  const lim = fb.h - 2 * fb.aa;
  const fa = fb.footArm(c.a, x, y, 0, Math.max(c.dVa, c.dA) + 2 * fb.h);
  if (fa.d < lim) return false;
  const fbq = fb.footArm(c.b, x, y, 0, Math.max(c.dVb, c.dB) + 2 * fb.h);
  return fbq.d >= lim;
}

/** Buried under the union: inside a tube (Run I's test) or under a fill. */
export function isBuriedUnion(fb: any, corners: any[], x: number, y: number): boolean {
  if (isBuried(fb, x, y)) return true;
  for (const c of corners) {
    // inFill's own distance bound first (cheap reject for far corners).
    const dq = Math.hypot(x - c.qx, y - c.qy);
    if (dq > c.rV + (2 * fb.aa) / Math.max(0.1, Math.sin(Math.max(c.theta, 1e-9) / 2)) + 1e-12) continue;
    if (inFillS1b(fb, c, x, y)) return true;
  }
  return false;
}

/** Buried only under a fill (not in a tube): class (a)'s test. */
export function isUnderFill(fb: any, corners: any[], x: number, y: number): boolean {
  if (isBuried(fb, x, y)) return false;
  for (const c of corners) {
    const dq = Math.hypot(x - c.qx, y - c.qy);
    if (dq > c.rV + (2 * fb.aa) / Math.max(0.1, Math.sin(Math.max(c.theta, 1e-9) / 2)) + 1e-12) continue;
    if (inFillS1b(fb, c, x, y)) return true;
  }
  return false;
}

// ---- sequences with parts, resampled uniformly --------------------------
export interface SPt { x: number; y: number; part: string }

export function resampleParts(pts: SPt[], step: number): SPt[] {
  if (pts.length < 2) return pts.slice();
  const out: SPt[] = [{ ...pts[0] }];
  let acc = 0;
  let next = step;
  for (let i = 1; i < pts.length; i++) {
    let ax = pts[i - 1].x;
    let ay = pts[i - 1].y;
    const bx = pts[i].x;
    const by = pts[i].y;
    const part = pts[i].part;
    let seg = Math.hypot(bx - ax, by - ay);
    while (acc + seg >= next && seg > 0) {
      const t = (next - acc) / seg;
      ax = ax + (bx - ax) * t;
      ay = ay + (by - ay) * t;
      out.push({ x: ax, y: ay, part });
      seg = Math.hypot(bx - ax, by - ay);
      next += step;
    }
    acc += seg;
  }
  const last = pts[pts.length - 1];
  if (Math.hypot(last.x - out[out.length - 1].x, last.y - out[out.length - 1].y) > 1e-12) out.push({ ...last });
  return out;
}

/** Min normalised curvature (k*h, sign-corrected) over a resampled sequence. */
export function minCurv(uni: SPt[], expectedSign: number, h: number): { minK: number; at: SPt | null } {
  let minK = Infinity;
  let at: SPt | null = null;
  for (let i = 0; i < uni.length; i++) {
    const p0 = uni[Math.max(0, i - 5)];
    const p1 = uni[i];
    const p2 = uni[Math.min(uni.length - 1, i + 5)];
    if (p0 === p1 || p1 === p2) continue;
    const k = (menger(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y) / expectedSign) * h;
    if (k < minK) {
      minK = k;
      at = p1;
    }
  }
  return { minK, at };
}

/** The bare tube edge's own min curvature on either arm near its foot. */
export function bareMinK(fb: any, c: any, expectedSign: number): number {
  const h = fb.h;
  let best = Infinity;
  for (const [ai, dF] of [[c.a, c.dA], [c.b, c.dB]] as [number, number][]) {
    // The side facing the tangent point.
    const tx = ai === c.a ? c.tax : c.tbx;
    const ty = ai === c.a ? c.tay : c.tby;
    // Facing side the way outline.ts facingSide reads it.
    const fr = (() => {
      const a = fb.arms[ai];
      const sAbs = a.sR + a.dir * dF;
      const at = pointAt(fb.polys[a.pi], sAbs);
      const ux = at.tx * a.dir;
      const uy = at.ty * a.dir;
      const nx = -uy;
      const ny = ux;
      const dPlus = Math.hypot(at.x + nx * h - tx, at.y + ny * h - ty);
      const dMinus = Math.hypot(at.x - nx * h - tx, at.y - ny * h - ty);
      return dPlus <= dMinus ? 1 : -1;
    })();
    const lo = Math.max(0, dF - 0.15 * h);
    const hi = dF + 0.15 * h;
    let pts = edgeOutlinePoints(fb, ai, fr, lo, hi);
    if (ai === c.a) pts = pts.reverse();
    const uni = resampleParts(pts.map((p) => ({ ...p, part: "edge" })), 0.01 * h);
    const { minK } = minCurv(uni, expectedSign, h);
    best = Math.min(best, minK);
  }
  return best;
}

/** Distance from q to the nearest other part (not the corner's own arms). */
export function otherDist(fb: any, c: any): number {
  const R = fb.h + c.r;
  const out: any[] = [];
  candidates(fb.grid, c.qx, c.qy, R, out);
  let best = Infinity;
  for (const cd of out) {
    if (cd.d >= best) continue;
    // On arm a's or b's window (arc distance inside the span)?
    let own = false;
    for (const ai of [c.a, c.b]) {
      const a = fb.arms[ai];
      if (a.pi !== cd.chain) continue;
      const d = fb.armDist(ai, cd.s);
      if (d >= -1e-9 && d <= a.L + 1e-9) own = true;
    }
    if (!own) best = cd.d;
  }
  return best;
}

export { edgeOutlinePoints };

/** A fill checker with a q-grid, for measuring many points per scene. */
export function fillChecker(fb: any, corners: any[]): (x: number, y: number) => boolean {
  const cell = Math.max(2 * fb.h, 0.25);
  const maxReach = corners.reduce((m: number, c: any) => Math.max(m, c.rV + (2 * fb.aa) / Math.max(0.1, Math.sin(Math.max(c.theta, 1e-9) / 2))), 0);
  const rings = Math.max(1, Math.ceil(maxReach / cell));
  const grid = new Map<string, any[]>();
  for (const c of corners) {
    const key = `${Math.floor(c.qx / cell)},${Math.floor(c.qy / cell)}`;
    const l = grid.get(key) ?? [];
    l.push(c);
    grid.set(key, l);
  }
  const near: any[] = [];
  return (x: number, y: number): boolean => {
    if (isBuried(fb, x, y)) return true;
    near.length = 0;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let ix = cx - rings; ix <= cx + rings; ix++)
      for (let iy = cy - rings; iy <= cy + rings; iy++) {
        const l = grid.get(`${ix},${iy}`);
        if (l) near.push(...l);
      }
    for (const c of near) if (inFillS1b(fb, c, x, y)) return true;
    return false;
  };
}

