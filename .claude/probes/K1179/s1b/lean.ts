// K1179 S1b task 3: the lean corner solve. Same rule as task 2's
// reference (margin band [0, 0.05h], all other gates unchanged), at
// bounded work. It reads a built form-B instance (either flavour) for
// its arms, windows and polylines - the inputs form B builds - and
// solves one corner without touching that instance's corners.
//
// Bounded work per corner (the maxima, all constants below):
// - V: at most LEAN_MAX_NEWTON_V (12) Newton iterations (reference: 60),
//   each 2 foot searches over the arm window;
// - foot tracking: at most LEAN_MAX_FOOT_TRACK (128) window moves of
//   h/32 (reference: 4096);
// - the ball: at most LEAN_NODES (32) rho nodes (as the reference), each
//   advanced by at most LEAN_MAX_HALVINGS (6) predictor retries and
//   LEAN_MAX_NEWTON_BALL (8) Newton iterations (reference: 60);
// - no candidate grid search for the solve itself (the omega scan at
//   the end reuses the instance's segment grid, as the reference does).
// Deterministic: a pure function of the frame (predictors start from
// V's branch, never from a previous frame), so a cold and a warm solve
// are the same solve and agree exactly (0 <= 1e-9h).
import { candidates, dS, footInWindow, zAt } from "../../../../src/render/field/geom";
import type { Foot, Poly } from "../../../../src/render/field/geom";
import { rootBandEff } from "../outline";
import { marginOf, ss } from "./lib_s1b";

export const LEAN_NODES = 32;
export const LEAN_MAX_NEWTON_V = 12;
export const LEAN_MAX_NEWTON_BALL = 8;
export const LEAN_MAX_FOOT_TRACK = 128;
export const LEAN_MAX_HALVINGS = 6;

export interface LeanTiming { v: number; spans: number; ball: number; gates: number; calls: number }

type TFoot = Foot & { u: number };
type Tk = { x: number; y: number; fa: TFoot; fb: TFoot };

function solveEqLean(fb: any, a: number, b: number, rho: number, x0: number, y0: number): { x: number; y: number; fa: Foot; fb: Foot; ok: boolean } {
  const h = fb.h;
  let x = x0;
  let y = y0;
  for (let it = 0; it < LEAN_MAX_NEWTON_V; it++) {
    const fa = fb.footArm(a, x, y);
    const fbq = fb.footArm(b, x, y);
    const Fa = fa.d - rho;
    const Fb = fbq.d - rho;
    if (Math.abs(Fa) < 1e-13 * Math.max(1, rho) && Math.abs(Fb) < 1e-13 * Math.max(1, rho)) return { x, y, fa, fb: fbq, ok: true };
    if (!(fa.d > 1e-12 && fbq.d > 1e-12)) return { x, y, fa, fb: fbq, ok: false };
    const gax = (x - fa.x) / fa.d;
    const gay = (y - fa.y) / fa.d;
    const gbx = (x - fbq.x) / fbq.d;
    const gby = (y - fbq.y) / fbq.d;
    const det = gax * gby - gay * gbx;
    if (Math.abs(det) < 1e-12) return { x, y, fa, fb: fbq, ok: false };
    let dx = (-Fa * gby + Fb * gay) / det;
    let dy = (-Fb * gax + Fa * gbx) / det;
    const dl = Math.hypot(dx, dy);
    if (dl > h) {
      dx *= h / dl;
      dy *= h / dl;
    }
    x += dx;
    y += dy;
  }
  const fa = fb.footArm(a, x, y);
  const fbq = fb.footArm(b, x, y);
  const ok = Math.abs(fa.d - rho) < 1e-9 * Math.max(h, rho) && Math.abs(fbq.d - rho) < 1e-9 * Math.max(h, rho);
  return { x, y, fa, fb: fbq, ok };
}

export function leanCorner(fb: any, ji: number, a: number, b: number, th0: number, style: number, timing?: LeanTiming): any | null {
  const tAll = timing ? performance.now() : 0;
  void tAll;
  const h = fb.h;
  const A = fb.arms[a];
  const B = fb.arms[b];
  if (!(A.L > 1e-9 && B.L > 1e-9)) return null;
  const j = fb.scene.junctions[ji];
  const tSpans = timing ? performance.now() : 0;
  const winA = fb.armWindow(a) as [number, number];
  const winB = fb.armWindow(b) as [number, number];
  if (timing) timing.spans += performance.now() - tSpans;
  // V, the straight-arm start as in form B.
  let bx = A.ux + B.ux;
  let by = A.uy + B.uy;
  const bl = Math.hypot(bx, by) || 1;
  bx /= bl;
  by /= bl;
  const sn = Math.sin(th0 / 2);
  const tV = timing ? performance.now() : 0;
  const V = solveEqLean(fb, a, b, h, j.c[0] + (bx * h) / sn, j.c[1] + (by * h) / sn);
  if (timing) timing.v += performance.now() - tV;
  if (!V.ok) return null;
  const dVa = fb.armDist(a, V.fa.s);
  const dVb = fb.armDist(b, V.fb.s);
  const tol = 1e-9 * h;
  if (!(dVa > tol && dVa < A.L - tol && dVb > tol && dVb < B.L - tol)) return null;
  const crossA = A.ux * (V.y - j.c[1]) - A.uy * (V.x - j.c[0]);
  const crossB = B.ux * (V.y - j.c[1]) - B.uy * (V.x - j.c[0]);
  const sgn = Math.sign(A.ux * B.uy - A.uy * B.ux);
  if (!(crossA * sgn > 0 && crossB * sgn < 0)) return null;
  const pa: Poly = fb.polys[A.pi];
  const pb: Poly = fb.polys[B.pi];
  const theta = th0;
  const t2 = Math.tan(theta / 2);
  const r0 = style * (fb.cr / 3) * Math.min(2 * h, 1.5 * h * t2);
  // Tracked feet, capped (form B's footT with LEAN_MAX_FOOT_TRACK).
  const footT = (p: Poly, win: [number, number], x: number, y: number, s0: number): TFoot => {
    const w = h / 32;
    let s = Math.min(Math.max(s0, win[0]), win[1]);
    for (let it = 0; ; it++) {
      const lo = Math.max(win[0], s - w);
      const hi = Math.min(win[1], s + w);
      const ff = footInWindow(p, x, y, lo, hi);
      const u = s + dS(p, s, ff.s);
      const edge = (u <= lo + 1e-9 * h && lo > win[0]) || (u >= hi - 1e-9 * h && hi < win[1]);
      if (!edge || it >= LEAN_MAX_FOOT_TRACK || Math.abs(u - s) <= 1e-12 * h) return { ...ff, u };
      s = u;
    }
  };
  const newtonT = (rho: number, x0: number, y0: number, uA: number, uB: number, limit: number): Tk & { ok: boolean } => {
    let x = x0;
    let y = y0;
    let fA = footT(pa, winA, x, y, uA);
    let fB = footT(pb, winB, x, y, uB);
    for (let it = 0; it < LEAN_MAX_NEWTON_BALL; it++) {
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
  const advance = (from: Tk, rho0: number, rhoT: number, st0: number): { p: Tk; rho: number } => {
    let p = from;
    let rc = rho0;
    let st = st0;
    let halvings = 0;
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
        halvings = 0;
      } else {
        st /= 2;
        halvings++;
        if (st < 1e-5 * h || halvings > LEAN_MAX_HALVINGS) break;
      }
    }
    return { p, rho: rhoT - rc <= 1e-12 * rhoT ? rhoT : rc };
  };
  const denOf = (p: Tk): number => 1 + ((p.x - p.fa.x) * (p.x - p.fb.x) + (p.y - p.fa.y) * (p.y - p.fb.y)) / (p.fa.d * p.fb.d);
  const slackOf = (p: Tk): number => Math.min(A.L - fb.W - (p.fa.u - A.sR) * A.dir, B.L - fb.W - (p.fb.u - B.sR) * B.dir);
  const v0: Tk = { x: V.x, y: V.y, fa: { ...V.fa, u: A.sR + A.dir * dVa }, fb: { ...V.fb, u: B.sR + B.dir * dVb } };
  const denV = denOf(v0);
  const rbEff = rootBandEff(fb, theta);
  const wOf = (p: Tk): number => {
    const tG = timing ? performance.now() : 0;
    // Cheap gates first: if any is 0 the product is 0 in either order,
    // so the margin walk (the expensive gate) is skipped there. Where
    // they are all positive the factors multiply in the reference's
    // order, so the value is the reference's.
    const steep = ss(0, 1, (denOf(p) / denV - 0.3) / 0.4);
    const cap = ss(0, 1, slackOf(p) / (0.5 * h));
    const root = fb.rootBand > 0 ? ss(0, 1, ((p.fa.u - A.sR) * A.dir) / rbEff) * ss(0, 1, ((p.fb.u - B.sR) * B.dir) / rbEff) : 1;
    if (steep === 0 || cap === 0 || root === 0) {
      if (timing) timing.gates += performance.now() - tG;
      return 0;
    }
    const mA = marginOf(pa, p.x, p.y, p.fa.u, winA, p.fa.d);
    const mB = marginOf(pb, p.x, p.y, p.fb.u, winB, p.fb.d);
    // Task 2's band [0, 0.05h], as in form_b_ref.ts.
    const out = ss(0, 1, Math.min(mA, mB) / (0.05 * h)) * steep * cap * root;
    if (timing) timing.gates += performance.now() - tG;
    return out;
  };
  let r = 0;
  let q = v0;
  let room = slackOf(v0);
  if (r0 > 0) {
    const tB = timing ? performance.now() : 0;
    const dN = r0 / LEAN_NODES;
    const nodes: Tk[] = [v0];
    let sPrev = wOf(v0);
    let integ = 0;
    for (let k = 1; k <= LEAN_NODES && sPrev > 0; k++) {
      const rho0 = h + (k - 1) * dN;
      const adv = advance(nodes[k - 1], rho0, h + k * dN, dN);
      const sK = Math.min(sPrev, wOf(adv.p));
      integ += 0.5 * (sPrev + sK) * (adv.rho - rho0);
      room = Math.min(room, slackOf(adv.p));
      if (adv.rho < h + k * dN) break;
      nodes.push(adv.p);
      sPrev = sK;
    }
    const k0 = Math.min(nodes.length - 1, Math.floor(integ / dN));
    const adv = advance(nodes[k0], h + k0 * dN, h + integ, dN);
    q = adv.p;
    r = adv.rho - h;
    if (timing) timing.ball += performance.now() - tB;
  }
  const fa = q.fa;
  const fbq = q.fb;
  const tax = fa.x + (h * (q.x - fa.x)) / fa.d;
  const tay = fa.y + (h * (q.y - fa.y)) / fa.d;
  const tbx = fbq.x + (h * (q.x - fbq.x)) / fbq.d;
  const tby = fbq.y + (h * (q.y - fbq.y)) / fbq.d;
  let ov = 0;
  const R = h + r;
  const tS2 = timing ? performance.now() : 0;
  for (const [ai, f] of [[a, fa], [b, fbq]] as const) {
    const arm = fb.arms[ai];
    const p = fb.polys[arm.pi];
    const out: any[] = [];
    candidates(fb.grid, q.x, q.y, R, out, arm.pi);
    for (const cd of out) {
      const dd = fb.armDist(ai, cd.s);
      if (dd < 0 || dd > arm.L) continue;
      if (Math.abs(dS(p, cd.s, f.s)) < 0.5 * h) continue;
      ov = Math.max(ov, R - cd.d);
    }
  }
  if (timing) timing.spans += performance.now() - tS2;
  const omega = fb.force?.omega ?? ss(0, 1, 1 - (ov - 0.05 * h) / fb.ovw);
  if (timing) timing.calls++;
  return {
    j: ji, g: fb.groupOf[ji], a, b, ok: true, style, theta, r0, r1: r, r, room,
    Vx: V.x, Vy: V.y, qx: q.x, qy: q.y, tax, tay, tbx, tby,
    dVa, dVb, dA: (fa.u - A.sR) * A.dir, dB: (fbq.u - B.sR) * B.dir,
    sA: fa.s, sB: fbq.s, kA: fa.k, kB: fbq.k,
    zA: zAt(pa, fa.s), zB: zAt(pb, fbq.s), omega, ov,
    rV: Math.hypot(V.x - q.x, V.y - q.y),
  };
}

/** Every lean corner of a built instance, in the reference's corner order. */
export function leanCorners(fb: any, timing?: LeanTiming): any[] {
  const out: any[] = [];
  fb.scene.junctions.forEach((j: any, ji: number) => {
    const ais = fb.arms.map((_: any, i: number) => i).filter((i: number) => fb.arms[i].j === ji);
    const n = ais.length;
    if (n < 2) return;
    ais.sort((u: number, v: number) => fb.arms[u].ang - fb.arms[v].ang);
    const styles = j.corners ?? [];
    for (let i = 0; i < n; i++) {
      const a = ais[i];
      const b = ais[(i + 1) % n];
      let th = fb.arms[b].ang - fb.arms[a].ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const ea = fb.arms[a].ei;
      const eb = fb.arms[b].ei;
      const xa = j.arms[ea];
      const xb = j.arms[eb];
      if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      const ne = j.arms.length;
      let st = styles[ea]?.style;
      if ((ea + 1) % ne !== eb && (eb + 1) % ne === ea) st = styles[eb]?.style;
      const style = st === "sharp" ? 0 : 1;
      const c = leanCorner(fb, ji, a, b, th, style, timing);
      if (c) out.push(c);
    }
  });
  return out;
}

