/**
 * K1257: form B's corner growth in closed form, the growth K1240's outline
 * grows its corners with (K1247 stage 6, the `cf*` functions of
 * `.claude/probes/K1240/proto/outline.ts`), ported so that form B's fill and
 * the outline agree at every corner. Where the two share an equation, the
 * outline's is the one matched; this file imports nothing from the probe.
 *
 * The ball's centre q runs along V's branch of the medial axis of the two
 * arms' polylines. Between events the branch is one closed-form piece, by
 * which sites the two feet stand on:
 *  - ty 0, a line: both feet on segments (q at distance rho from both lines);
 *  - ty 1 / 2, a parabola: one foot on a segment, the other on a vertex;
 *  - ty 3, a line again: both feet on vertices (the bisector of the two).
 * A piece ends at the first event of either arm:
 *  - kinds 1 / 2: a segment foot reaches the segment's end (forward /
 *    backward) and moves onto the vertex;
 *  - kinds 3 / 4: a vertex foot hands on to the next (previous) segment;
 *  - kinds 5 / 6: the lag switch at a concave vertex. Form B's tracked foot
 *    (`footT`, the nearest point within h/32 of the last one) passes a
 *    concave vertex onto the next segment once that segment's point comes
 *    nearer than the window's reach, not where the projection reaches the
 *    vertex; q then jumps (a jump over 1e-3 h splits the integral there);
 *  - kind 9: the arm window's end or a chain's end: the branch ends.
 * Only exit roots end a piece (a piece starting on the boundary it just
 * crossed is not ended at once).
 *
 * The growth integrates the running minimum S of w (form B's gates, from a
 * callback) over rho in [h, h + r0] by an adaptive trapezoid: 10 nodes, an
 * error budget of 5e-4 h, intervals no shorter than 1e-3 h, a midpoint
 * test, splits at q's jumps and at a line piece's steep-gate dip, and a
 * refinement up to the branch's end. A jump over 0.1 h ends the branch.
 * `grow` returns -1 when the pieces cannot start at V (form B then grows
 * the old way).
 */
import { normS, segOfS, type Foot, type Poly } from "./geom";

export type CfFoot = Foot & { u: number };

/** One arm as the growth reads it. */
export interface CfArmIn {
  p: Poly;
  /** Unit segment tangents of p (a zero-length segment's are 0). */
  tx: Float64Array;
  ty: Float64Array;
  /** The arm's window in s (form B's armWindow). */
  lo: number;
  hi: number;
  /** V's foot on the arm, and its s in the window's domain. */
  foot: Foot;
  u0: number;
}

interface CfArm {
  p: Poly;
  tx: Float64Array;
  ty: Float64Array;
  sgn: number;
  lo: number;
  hi: number;
  /** 1: the foot is on vertex i; 0: on segment i. */
  v: number;
  i: number;
  /** u - s on this site (a closed chain's laps). */
  sh: number;
}

const CF_MAXP = 160;
const CF_TURN = 1e-12;
/** A q jump over this (in h) splits the integral there. */
const JUMP_TOL = 1e-3;
/** A q jump over this (in h) ends the branch. */
const KF_JUMP = 0.1;
const GROW_N = 10;
const GROW_E = 5e-4;
const GROW_Z = 1e-3;

/** Counts for the probes: corners grown, and corners whose pieces could not start at V. */
export const cfStats = { corners: 0, fails: 0 };

const ss01 = (x: number): number => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};

function mkArm(): CfArm {
  return { p: null as unknown as Poly, tx: new Float64Array(0), ty: new Float64Array(0), sgn: 1, lo: 0, hi: 0, v: 0, i: 0, sh: 0 };
}
function mkFoot(): CfFoot {
  return { d: 0, x: 0, y: 0, s: 0, k: 0, t: 0, u: 0 };
}

/** Unit segment tangents of a poly (the outline's tanTx / tanTy). */
export function polyTangents(p: Poly): { tx: Float64Array; ty: Float64Array } {
  const tx = new Float64Array(Math.max(1, p.nseg));
  const ty = new Float64Array(Math.max(1, p.nseg));
  for (let k = 0; k < p.nseg; k++) {
    const b = k + 1 === p.n ? 0 : k + 1;
    const l = p.segLen[k] || 1;
    tx[k] = (p.x[b] - p.x[k]) / l;
    ty[k] = (p.y[b] - p.y[k]) / l;
  }
  return { tx, ty };
}

export class CornerGrowth {
  private readonly ar: CfArm[] = [mkArm(), mkArm()];
  private readonly R = new Float64Array(CF_MAXP + 2);
  /** 1 where q jumps at R[j] (a lag switch's lag). */
  private readonly J = new Uint8Array(CF_MAXP + 2);
  /** A piece's steep-gate minimum (NaN = not computed), and its rho. */
  private readonly St = new Float64Array(CF_MAXP + 2);
  private readonly Sr = new Float64Array(CF_MAXP + 2);
  private readonly Ty = new Int8Array(CF_MAXP + 2);
  private readonly K = new Float64Array((CF_MAXP + 2) * 8);
  private readonly SV = new Uint8Array((CF_MAXP + 2) * 2);
  private readonly SI = new Int32Array((CF_MAXP + 2) * 2);
  private readonly SH = new Float64Array((CF_MAXP + 2) * 2);
  private readonly lgArm = new Int8Array(4);
  private readonly lgK = new Int32Array(4);
  private readonly lgF = new Int8Array(4);
  private readonly lgLo = new Float64Array(4);
  private readonly lgHi = new Float64Array(4);
  private readonly bk = new Float64Array(8);
  private readonly sFa = mkFoot();
  private readonly sFb = mkFoot();
  private n = 0;
  private ended = false;
  private rMax = 0;
  private cur = 0;
  private Qx = 0;
  private Qy = 0;
  private evArm = 0;
  private evKind = 0;
  private tol = 0;
  private del = 0;
  private h = 1;
  private Vx = 0;
  private Vy = 0;
  private denV = 1;
  private wEnd = 0;
  /** q and the feet at the last `at` (what the w callback reads). */
  qx = 0;
  qy = 0;
  rhoCur = 0;
  readonly fa: CfFoot = mkFoot();
  readonly fb: CfFoot = mkFoot();

  /**
   * The ball's growth from V: returns r (q and the feet at h + r are left in
   * qx, qy, fa, fb), or -1 when the pieces cannot start at V. w() reads
   * qx, qy, fa and fb.
   */
  grow(h: number, Vx: number, Vy: number, r0: number, denV: number, A: CfArmIn, B: CfArmIn, w: () => number): number {
    this.h = h;
    this.Vx = Vx;
    this.Vy = Vy;
    this.denV = denV;
    if (!this.init(r0, A, B)) {
      cfStats.fails++;
      return -1;
    }
    cfStats.corners++;
    const N = GROW_N;
    const dN = r0 / N;
    const E = GROW_E * h;
    const Lmin = GROW_Z * h;
    this.at(h);
    let a = h;
    let wa = w();
    let integ = 0;
    for (let kk = 1; kk <= N && wa > 0; kk++) {
      const b = kk === N ? h + r0 : h + kk * dN;
      const okb = this.at(b);
      if (!okb) {
        // The branch ends before b: refine up to its end.
        const f = this.rhoCur;
        const s = Math.min(wa, w());
        if (f - a > Lmin && (wa - s) * (f - a) * 0.5 > E) integ += this.refine(a, wa, f, s, E, Lmin, w);
        else integ += 0.5 * (wa + s) * Math.max(0, f - a);
        break;
      }
      const wb = Math.min(wa, w());
      if ((wa - wb) * (b - a) * 0.5 <= E && this.jumpIn(a, b) < 0 && this.dipIn(a, b, wb) < 0) {
        integ += 0.5 * (wa + wb) * (b - a);
        wa = wb;
      } else {
        integ += this.refine(a, wa, b, wb, E, Lmin, w);
        wa = this.wEnd;
      }
      a = b;
    }
    this.at(h + integ);
    return Math.max(0, this.rhoCur - h);
  }

  private make(i: number, qx: number, qy: number): boolean {
    const a = this.ar[0];
    const b = this.ar[1];
    const o = i * 8;
    const K = this.K;
    this.SV[2 * i] = a.v;
    this.SI[2 * i] = a.i;
    this.SH[2 * i] = a.sh;
    this.SV[2 * i + 1] = b.v;
    this.SI[2 * i + 1] = b.i;
    this.SH[2 * i + 1] = b.sh;
    if (!a.v && !b.v) {
      const nax = -a.sgn * a.ty[a.i];
      const nay = a.sgn * a.tx[a.i];
      const ca = nax * a.p.x[a.i] + nay * a.p.y[a.i];
      const nbx = -b.sgn * b.ty[b.i];
      const nby = b.sgn * b.tx[b.i];
      const cb = nbx * b.p.x[b.i] + nby * b.p.y[b.i];
      const det = nax * nby - nay * nbx;
      if (!(Math.abs(det) > 1e-9)) return false;
      K[o] = (ca * nby - nay * cb) / det;
      K[o + 1] = (nax * cb - ca * nbx) / det;
      K[o + 2] = (nby - nay) / det;
      K[o + 3] = (nax - nbx) / det;
      this.Ty[i] = 0;
      return true;
    }
    if (a.v && b.v) {
      const pax = a.p.x[a.i];
      const pay = a.p.y[a.i];
      const pbx = b.p.x[b.i];
      const pby = b.p.y[b.i];
      const mx = 0.5 * (pax + pbx);
      const my = 0.5 * (pay + pby);
      const dx = pbx - pax;
      const dy = pby - pay;
      const L2 = dx * dx + dy * dy;
      if (!(L2 > 1e-24)) return false;
      const L = Math.sqrt(L2);
      const ux = -dy / L;
      const uy = dx / L;
      K[o] = mx;
      K[o + 1] = my;
      K[o + 2] = ux;
      K[o + 3] = uy;
      K[o + 4] = 0.25 * L2;
      K[o + 5] = (qx - mx) * ux + (qy - my) * uy >= 0 ? 1 : -1;
      this.Ty[i] = 3;
      return true;
    }
    const S = a.v ? b : a;
    const Pn = a.v ? a : b;
    const tx = S.tx[S.i];
    const ty = S.ty[S.i];
    const nx = -S.sgn * ty;
    const ny = S.sgn * tx;
    const px = Pn.p.x[Pn.i];
    const py = Pn.p.y[Pn.i];
    const e = nx * (px - S.p.x[S.i]) + ny * (py - S.p.y[S.i]);
    if (!(e > 1e-12)) return false;
    K[o] = px;
    K[o + 1] = py;
    K[o + 2] = nx;
    K[o + 3] = ny;
    K[o + 4] = tx;
    K[o + 5] = ty;
    K[o + 6] = e;
    K[o + 7] = (qx - px) * tx + (qy - py) * ty >= 0 ? 1 : -1;
    this.Ty[i] = a.v ? 2 : 1;
    return true;
  }

  private q(i: number, rho: number): void {
    const o = i * 8;
    const K = this.K;
    const t = this.Ty[i];
    if (t === 0) {
      this.Qx = K[o] + K[o + 2] * rho;
      this.Qy = K[o + 1] + K[o + 3] * rho;
      return;
    }
    if (t === 3) {
      const r = Math.sqrt(Math.max(0, rho * rho - K[o + 4])) * K[o + 5];
      this.Qx = K[o] + K[o + 2] * r;
      this.Qy = K[o + 1] + K[o + 3] * r;
      return;
    }
    const e = K[o + 6];
    const al = rho - e;
    const be = Math.sqrt(Math.max(0, e * (2 * rho - e))) * K[o + 7];
    this.Qx = K[o] + al * K[o + 2] + be * K[o + 4];
    this.Qy = K[o + 1] + al * K[o + 3] + be * K[o + 5];
  }

  // The first rho >= rs where g(q) = cx qx + cy qy - d leaves g >= 0 on piece
  // i: rs when g(rs) < -tol, or when rs sits on (or within roundoff past) an
  // EXIT root (g' < 0 there); Infinity when it never does.
  private root(i: number, cx: number, cy: number, d: number, rs: number): number {
    const o = i * 8;
    const K = this.K;
    const t = this.Ty[i];
    if (t === 0 || t === 3) {
      let g1: number;
      let xs: number;
      if (t === 0) {
        g1 = cx * K[o + 2] + cy * K[o + 3];
        xs = rs;
      } else {
        g1 = K[o + 5] * (cx * K[o + 2] + cy * K[o + 3]);
        xs = Math.sqrt(Math.max(0, rs * rs - K[o + 4]));
      }
      const g0 = cx * K[o] + cy * K[o + 1] - d;
      if (g0 + g1 * xs < -this.tol) return rs;
      if (!(g1 < 0)) return Infinity;
      const x = -g0 / g1;
      if (x <= xs) return rs;
      return t === 0 ? x : Math.sqrt(x * x + K[o + 4]);
    }
    const e = K[o + 6];
    const sg = K[o + 7];
    const cn = cx * K[o + 2] + cy * K[o + 3];
    const ct = cx * K[o + 4] + cy * K[o + 5];
    const A2 = cn / (2 * e);
    const A1 = sg * ct;
    const A0 = cx * K[o] + cy * K[o + 1] - d - 0.5 * cn * e;
    const bS = Math.sqrt(Math.max(0, e * (2 * rs - e)));
    if (A0 + bS * (A1 + A2 * bS) < -this.tol) return rs;
    let bR = Infinity;
    if (A2 === 0) {
      if (A1 < 0) bR = -A0 / A1;
    } else {
      const D = A1 * A1 - 4 * A2 * A0;
      if (D >= 0) {
        const qq = -0.5 * (A1 + (A1 >= 0 ? Math.sqrt(D) : -Math.sqrt(D)));
        const r1 = qq / A2;
        const r2 = qq !== 0 ? A0 / qq : r1;
        if (A1 + 2 * A2 * r1 < 0 && r1 > bS - this.del && r1 < bR) bR = r1;
        if (A1 + 2 * A2 * r2 < 0 && r2 > bS - this.del && r2 < bR) bR = r2;
      }
    }
    if (bR === Infinity) return Infinity;
    if (bR <= bS) return rs;
    return (bR * bR + e * e) / (2 * e);
  }

  /** > 0: the border bends toward q at vertex v (concave); needs both segments. */
  private turn(X: CfArm, v: number): number {
    const p = X.p;
    const nseg = p.nseg;
    const km = v - 1 >= 0 ? v - 1 : p.closed ? nseg - 1 : -1;
    const kp = v < nseg ? v : -1;
    if (km < 0 || kp < 0) return NaN;
    return X.sgn * (X.tx[km] * X.ty[kp] - X.ty[km] * X.tx[kp]);
  }

  /** The piece's end: the first event of either arm's site after rs. */
  private next(i: number, rs: number): number {
    const w = this.h / 32;
    let best = Infinity;
    this.evArm = 0;
    this.evKind = 9;
    let nLg = 0;
    for (let j = 0; j < 2; j++) {
      const X = this.ar[j];
      const p = X.p;
      const k = this.SI[2 * i + j];
      if (!this.SV[2 * i + j]) {
        const tx = X.tx[k];
        const ty = X.ty[k];
        const l = p.segLen[k];
        const tP = tx * p.x[k] + ty * p.y[k];
        const s0 = p.s[k] + this.SH[2 * i + j];
        // forward: (q - P_k) . T <= fl
        const fl = Math.min(l, X.hi - s0);
        let r = this.root(i, -tx, -ty, -(fl + tP), rs);
        if (r < Infinity) {
          if (fl < l || (!p.closed && k + 1 >= p.nseg)) {
            if (r < best) {
              best = r;
              this.evArm = j;
              this.evKind = 9;
            }
          } else if (this.turn(X, k + 1 >= p.n ? 0 : k + 1) > CF_TURN) {
            // The lag switch lies in [rw, r]; solved below only if it can win.
            const rw = l - w > 0 ? this.root(i, -tx, -ty, -(l - w + tP), rs) : rs;
            this.lgArm[nLg] = j;
            this.lgK[nLg] = k;
            this.lgF[nLg] = 1;
            this.lgLo[nLg] = Math.max(rs, Math.min(rw, r));
            this.lgHi[nLg] = r;
            nLg++;
          } else if (r < best) {
            best = r;
            this.evArm = j;
            this.evKind = 1;
          }
        }
        // backward: (q - P_k) . T >= bl
        const bl = Math.max(0, X.lo - s0);
        r = this.root(i, tx, ty, tP + bl, rs);
        if (r < Infinity) {
          if (bl > 0 || (!p.closed && k === 0)) {
            if (r < best) {
              best = r;
              this.evArm = j;
              this.evKind = 9;
            }
          } else if (this.turn(X, k) > CF_TURN) {
            const rw = this.root(i, tx, ty, tP + Math.min(w, l), rs);
            this.lgArm[nLg] = j;
            this.lgK[nLg] = k;
            this.lgF[nLg] = 0;
            this.lgLo[nLg] = Math.max(rs, Math.min(rw, r));
            this.lgHi[nLg] = r;
            nLg++;
          } else if (r < best) {
            best = r;
            this.evArm = j;
            this.evKind = 2;
          }
        }
      } else {
        const v = k;
        const px = p.x[v];
        const py = p.y[v];
        const kp = v < p.nseg ? v : -1;
        const km = v - 1 >= 0 ? v - 1 : p.closed ? p.nseg - 1 : -1;
        if (kp >= 0) {
          const tx = X.tx[kp];
          const ty = X.ty[kp];
          const r = this.root(i, -tx, -ty, -(tx * px + ty * py), rs);
          if (r < best) {
            best = r;
            this.evArm = j;
            this.evKind = 3;
          }
        }
        if (km >= 0) {
          const tx = X.tx[km];
          const ty = X.ty[km];
          const r = this.root(i, tx, ty, tx * px + ty * py, rs);
          if (r < best) {
            best = r;
            this.evArm = j;
            this.evKind = 4;
          }
        }
      }
    }
    for (let g = 0; g < nLg; g++) {
      if (!(this.lgLo[g] < best)) continue;
      const X = this.ar[this.lgArm[g]];
      const k = this.lgK[g];
      const fwd = this.lgF[g] === 1;
      // Illinois regula falsi on the switch function (negative = switched).
      let lo = this.lgLo[g];
      let hi = this.lgHi[g];
      if (this.Ty[i] === 0) {
        const rr = this.lagLine(i, X, k, fwd, lo, hi, w);
        if (rr < best) {
          best = rr;
          this.evArm = this.lgArm[g];
          this.evKind = fwd ? 5 : 6;
        }
        continue;
      }
      this.q(i, lo);
      let flo = this.lagF(X, k, fwd, this.Qx, this.Qy, w);
      let rr = hi;
      if (flo < 0) rr = lo;
      else {
        this.q(i, hi);
        let fhi = this.lagF(X, k, fwd, this.Qx, this.Qy, w);
        if (fhi < 0) {
          let side = 0;
          const tol = 1e-10 * this.h;
          for (let it = 0; it < 60 && hi - lo > tol; it++) {
            let m = (lo * fhi - hi * flo) / (fhi - flo);
            if (!(m > lo && m < hi) || it % 8 === 7) m = 0.5 * (lo + hi);
            this.q(i, m);
            const fm = this.lagF(X, k, fwd, this.Qx, this.Qy, w);
            if (fm < 0) {
              hi = m;
              fhi = fm;
              if (side === -1) flo *= 0.5;
              side = -1;
            } else {
              lo = m;
              flo = fm;
              if (side === 1) fhi *= 0.5;
              side = 1;
            }
          }
          rr = hi;
        }
      }
      if (rr < best) {
        best = rr;
        this.evArm = this.lgArm[g];
        this.evKind = fwd ? 5 : 6;
      }
    }
    return best;
  }

  // The lag switch on a line piece in closed form: a (q's projection to the
  // vertex) and P (q along the next segment) are linear in rho, so the switch
  // condition is piecewise quadratic between the breakpoints where s =
  // min(P, w - a, ln) changes branch (and P = 0, a = w). The first rho in
  // [lo, hi] where it holds; hi when it never does.
  private lagLine(i: number, X: CfArm, k: number, fwd: boolean, lo: number, hi: number, w: number): number {
    const o = i * 8;
    const K = this.K;
    const p = X.p;
    const q0x = K[o];
    const q0y = K[o + 1];
    const ux = K[o + 2];
    const uy = K[o + 3];
    const tx = X.tx[k];
    const ty = X.ty[k];
    let vx: number;
    let vy: number;
    let nx: number;
    let ny: number;
    let ln: number;
    let a0: number;
    let a1: number;
    if (fwd) {
      const kn = k + 1 >= p.nseg ? 0 : k + 1;
      const v = k + 1 >= p.n ? 0 : k + 1;
      vx = p.x[v];
      vy = p.y[v];
      nx = X.tx[kn];
      ny = X.ty[kn];
      ln = p.segLen[kn];
      a0 = (vx - q0x) * tx + (vy - q0y) * ty;
      a1 = -(ux * tx + uy * ty);
    } else {
      const kn = k - 1 >= 0 ? k - 1 : p.nseg - 1;
      vx = p.x[k];
      vy = p.y[k];
      nx = -X.tx[kn];
      ny = -X.ty[kn];
      ln = p.segLen[kn];
      a0 = (q0x - vx) * tx + (q0y - vy) * ty;
      a1 = ux * tx + uy * ty;
    }
    const P0 = (q0x - vx) * nx + (q0y - vy) * ny;
    const P1 = ux * nx + uy * ny;
    // breakpoints: P = 0, a = w, a = w - ln, P + a = w, P = ln
    const bk = this.bk;
    let nb = 0;
    const add = (c0: number, c1: number): void => {
      if (c1 !== 0) {
        const x = -c0 / c1;
        if (x > lo && x < hi) bk[nb++] = x;
      }
    };
    add(P0, P1);
    add(a0 - w, a1);
    add(a0 - w + ln, a1);
    add(P0 + a0 - w, P1 + a1);
    add(P0 - ln, P1);
    for (let x = 1; x < nb; x++) {
      const v = bk[x];
      let y = x - 1;
      while (y >= 0 && bk[y] > v) {
        bk[y + 1] = bk[y];
        y--;
      }
      bk[y + 1] = v;
    }
    let x0 = lo;
    for (let b = 0; b <= nb; b++) {
      const x1 = b < nb ? bk[b] : hi;
      if (!(x1 >= x0)) continue;
      const xm = 0.5 * (x0 + x1);
      const am = a0 + a1 * xm;
      const Pm = P0 + P1 * xm;
      const smax = Math.min(w - am, ln);
      if (smax > 0 && Pm > 0) {
        // f = c2 rho^2 + c1 rho + c0 on [x0, x1]
        let c2: number;
        let c1: number;
        let c0: number;
        if (Pm <= smax) {
          // s = P: a^2 - P^2
          c2 = a1 * a1 - P1 * P1;
          c1 = 2 * (a0 * a1 - P0 * P1);
          c0 = a0 * a0 - P0 * P0;
        } else if (w - am <= ln) {
          // s = w - a: a^2 + (w - a)^2 - 2 P (w - a)
          const s0 = w - a0;
          const s1 = -a1;
          c2 = a1 * a1 + s1 * s1 - 2 * P1 * s1;
          c1 = 2 * (a0 * a1 + s0 * s1 - P0 * s1 - P1 * s0);
          c0 = a0 * a0 + s0 * s0 - 2 * P0 * s0;
        } else {
          // s = ln: a^2 + ln^2 - 2 P ln
          c2 = a1 * a1;
          c1 = 2 * a0 * a1 - 2 * P1 * ln;
          c0 = a0 * a0 + ln * ln - 2 * P0 * ln;
        }
        const f0 = c0 + x0 * (c1 + c2 * x0);
        if (f0 < 0) return x0;
        // the first root in (x0, x1] where f turns negative
        let r = Infinity;
        if (c2 === 0) {
          if (c1 < 0) r = -c0 / c1;
        } else {
          const D = c1 * c1 - 4 * c2 * c0;
          if (D >= 0) {
            const qq = -0.5 * (c1 + (c1 >= 0 ? Math.sqrt(D) : -Math.sqrt(D)));
            const r1 = qq / c2;
            const r2 = qq !== 0 ? c0 / qq : r1;
            if (c1 + 2 * c2 * r1 < 0 && r1 >= x0 && r1 < r) r = r1;
            if (c1 + 2 * c2 * r2 < 0 && r2 >= x0 && r2 < r) r = r2;
          }
        }
        if (r <= x1) return r;
      }
      x0 = x1;
    }
    return hi;
  }

  /** The switch condition as a number: negative iff the tracked foot has switched. */
  private lagF(X: CfArm, k: number, fwd: boolean, qx: number, qy: number, w: number): number {
    const p = X.p;
    const tx = X.tx[k];
    const ty = X.ty[k];
    let a: number;
    let vx: number;
    let vy: number;
    let nx: number;
    let ny: number;
    let ln: number;
    if (fwd) {
      const kn = k + 1 >= p.nseg ? 0 : k + 1;
      const v = k + 1 >= p.n ? 0 : k + 1;
      vx = p.x[v];
      vy = p.y[v];
      a = (vx - qx) * tx + (vy - qy) * ty;
      nx = X.tx[kn];
      ny = X.ty[kn];
      ln = p.segLen[kn];
    } else {
      const kn = k - 1 >= 0 ? k - 1 : p.nseg - 1;
      vx = p.x[k];
      vy = p.y[k];
      a = (qx - vx) * tx + (qy - vy) * ty;
      nx = -X.tx[kn];
      ny = -X.ty[kn];
      ln = p.segLen[kn];
    }
    const P = (qx - vx) * nx + (qy - vy) * ny;
    const smax = Math.min(w - a, ln);
    if (!(smax > 0 && P > 0)) return a * a + w * w;
    const s = P < smax ? P : smax;
    return a * a + s * s - 2 * P * s;
  }

  private apply(X: CfArm, kind: number): boolean {
    const p = X.p;
    switch (kind) {
      case 1:
        X.v = 1;
        X.i++;
        if (X.i >= p.n) {
          if (!p.closed) return false;
          X.i = 0;
          X.sh += p.len;
        }
        return true;
      case 2:
        X.v = 1;
        return true;
      case 3:
        if (X.i >= p.nseg) return false;
        X.v = 0;
        return true;
      case 4:
        X.v = 0;
        X.i--;
        if (X.i < 0) {
          if (!p.closed) return false;
          X.i = p.nseg - 1;
          X.sh -= p.len;
        }
        return true;
      case 5:
        X.i++;
        if (X.i >= p.nseg) {
          if (!p.closed) return false;
          X.i = 0;
          X.sh += p.len;
        }
        return true;
      case 6:
        X.i--;
        if (X.i < 0) {
          if (!p.closed) return false;
          X.i = p.nseg - 1;
          X.sh -= p.len;
        }
        return true;
    }
    return false;
  }

  /** Is a site of piece i invalid at q? Sets evArm / evKind to its fix. */
  private bad(i: number, qx: number, qy: number): boolean {
    const tol = 1e-9 * this.h;
    for (let j = 0; j < 2; j++) {
      const X = this.ar[j];
      const p = X.p;
      const k = this.SI[2 * i + j];
      if (!this.SV[2 * i + j]) {
        const tx = X.tx[k];
        const ty = X.ty[k];
        const l = p.segLen[k];
        const tt = (qx - p.x[k]) * tx + (qy - p.y[k]) * ty;
        const s0 = p.s[k] + this.SH[2 * i + j];
        const fl = Math.min(l, X.hi - s0);
        const bl = Math.max(0, X.lo - s0);
        this.evArm = j;
        if (tt > fl + tol) {
          this.evKind = fl < l || (!p.closed && k + 1 >= p.nseg) ? 9 : this.turn(X, k + 1 >= p.n ? 0 : k + 1) > CF_TURN ? 5 : 1;
          return true;
        }
        if (tt < bl - tol) {
          this.evKind = bl > 0 || (!p.closed && k === 0) ? 9 : this.turn(X, k) > CF_TURN ? 6 : 2;
          return true;
        }
      } else {
        const v = k;
        const px = p.x[v];
        const py = p.y[v];
        const kp = v < p.nseg ? v : -1;
        const km = v - 1 >= 0 ? v - 1 : p.closed ? p.nseg - 1 : -1;
        this.evArm = j;
        if (kp >= 0 && (qx - px) * X.tx[kp] + (qy - py) * X.ty[kp] > tol) {
          this.evKind = 3;
          return true;
        }
        if (km >= 0 && (qx - px) * X.tx[km] + (qy - py) * X.ty[km] < -tol) {
          this.evKind = 4;
          return true;
        }
        if (kp < 0 || km < 0) {
          this.evKind = 9;
          return true;
        }
      }
    }
    return false;
  }

  /** One piece: from the frontier to its first event, then the next sites. */
  private step(): void {
    const i = this.n;
    const rs = this.R[i];
    const h = this.h;
    if (i >= CF_MAXP - 1) {
      this.ended = true;
      return;
    }
    let rE = this.next(i, rs);
    if (rE < rs) rE = rs;
    if (rE >= this.rMax) {
      this.R[i + 1] = this.rMax;
      this.n = i + 1;
      this.ended = true;
      return;
    }
    this.R[i + 1] = rE;
    this.n = i + 1;
    this.q(i, rE);
    const qx = this.Qx;
    const qy = this.Qy;
    let kind = this.evKind;
    let X = this.ar[this.evArm];
    for (let it = 0; ; it++) {
      if (kind === 9 || it > 8 || !this.apply(X, kind) || !this.make(i + 1, qx, qy)) {
        this.ended = true;
        return;
      }
      this.q(i + 1, rE);
      if (!this.bad(i + 1, this.Qx, this.Qy)) break;
      kind = this.evKind;
      X = this.ar[this.evArm];
    }
    const dx = this.Qx - qx;
    const dy = this.Qy - qy;
    this.J[i + 1] = dx * dx + dy * dy > JUMP_TOL * JUMP_TOL * h * h ? 1 : 0;
    this.St[i + 1] = NaN;
    if (dx * dx + dy * dy > KF_JUMP * KF_JUMP * h * h) this.ended = true;
  }

  private initArm(X: CfArm, A: CfArmIn): void {
    const p = A.p;
    const F = A.foot;
    X.p = p;
    X.tx = A.tx;
    X.ty = A.ty;
    X.lo = A.lo;
    X.hi = A.hi;
    let k = F.k;
    if (k < 0 || k >= p.nseg) k = segOfS(p, normS(p, F.s)).k;
    const tx = X.tx[k];
    const ty = X.ty[k];
    const l = p.segLen[k];
    const tt = Math.min(l, Math.max(0, (F.x - p.x[k]) * tx + (F.y - p.y[k]) * ty));
    X.sh = A.u0 - (p.s[k] + tt);
    X.v = 0;
    X.i = k;
    // The side: q's side of the foot's segment (or of its neighbour's at a vertex).
    let cr = tx * (this.Vy - p.y[k]) - ty * (this.Vx - p.x[k]);
    if (Math.abs(cr) < 1e-9 * this.h) {
      const k2 = tt > 0.5 * l ? (k + 1 < p.nseg ? k + 1 : p.closed ? 0 : k) : k > 0 ? k - 1 : p.closed ? p.nseg - 1 : k;
      cr = X.tx[k2] * (this.Vy - p.y[k2]) - X.ty[k2] * (this.Vx - p.x[k2]);
    }
    X.sgn = cr >= 0 ? 1 : -1;
    const tol = 1e-9 * l;
    if (tt >= l - tol) {
      if (!(this.turn(X, k + 1 >= p.n ? 0 : k + 1) > CF_TURN)) this.apply(X, 1);
    } else if (tt <= tol) {
      if (!(this.turn(X, k) > CF_TURN)) X.v = 1;
    }
  }

  private init(r0: number, A: CfArmIn, B: CfArmIn): boolean {
    const h = this.h;
    this.tol = 1e-9 * h;
    this.del = 1e-6 * h;
    this.initArm(this.ar[0], A);
    this.initArm(this.ar[1], B);
    this.n = 0;
    this.R[0] = h;
    this.ended = false;
    this.rMax = h + r0;
    this.cur = 0;
    this.St[0] = NaN;
    for (let it = 0; ; it++) {
      if (it > 8 || !this.make(0, this.Vx, this.Vy)) return false;
      this.q(0, h);
      if (!this.bad(0, this.Qx, this.Qy)) break;
      if (this.evKind === 9 || !this.apply(this.ar[this.evArm], this.evKind)) return false;
    }
    const dx = this.Qx - this.Vx;
    const dy = this.Qy - this.Vy;
    return dx * dx + dy * dy <= 1e-12 * h * h;
  }

  /** Arm j's foot on piece i at q = (Qx, Qy). */
  private foot(i: number, j: number, rho: number, F: CfFoot): void {
    const X = this.ar[j];
    const p = X.p;
    const k = this.SI[2 * i + j];
    const qx = this.Qx;
    const qy = this.Qy;
    if (!this.SV[2 * i + j]) {
      const tx = X.tx[k];
      const ty = X.ty[k];
      const tt = (qx - p.x[k]) * tx + (qy - p.y[k]) * ty;
      const fx = p.x[k] + tt * tx;
      const fy = p.y[k] + tt * ty;
      F.x = fx;
      F.y = fy;
      F.d = Math.sqrt((qx - fx) * (qx - fx) + (qy - fy) * (qy - fy)) || rho;
      F.s = p.s[k] + tt;
      F.k = k;
      F.t = tt / (p.segLen[k] || 1);
      F.u = F.s + this.SH[2 * i + j];
    } else {
      const fx = p.x[k];
      const fy = p.y[k];
      F.x = fx;
      F.y = fy;
      F.d = Math.sqrt((qx - fx) * (qx - fx) + (qy - fy) * (qy - fy)) || rho;
      F.s = p.s[k];
      F.k = k < p.nseg ? k : k - 1;
      F.t = k < p.nseg ? 0 : 1;
      F.u = F.s + this.SH[2 * i + j];
    }
  }

  /** q and the feet at rho; false when the branch ended before rho (they are then its end). */
  private at(rho: number): boolean {
    while (!this.ended && (this.n === 0 || this.R[this.n] < rho)) this.step();
    if (this.n === 0) {
      this.q(0, this.R[0]);
      this.qx = this.Qx;
      this.qy = this.Qy;
      this.foot(0, 0, this.R[0], this.fa);
      this.foot(0, 1, this.R[0], this.fb);
      this.rhoCur = this.R[0];
      return rho <= this.R[0];
    }
    let r = rho;
    let ok = true;
    if (r > this.R[this.n]) {
      r = this.R[this.n];
      ok = false;
    }
    let i = this.cur < this.n ? this.cur : this.n - 1;
    while (i > 0 && this.R[i] >= r) i--; // at a boundary, the left piece (a jump's left limit)
    while (i < this.n - 1 && this.R[i + 1] < r) i++;
    this.cur = i;
    this.q(i, r);
    this.qx = this.Qx;
    this.qy = this.Qy;
    this.foot(i, 0, r, this.fa);
    this.foot(i, 1, r, this.fb);
    this.rhoCur = r;
    return ok;
  }

  // The first piece boundary strictly inside (lo, hi) where q jumps, or -1.
  private jumpIn(lo: number, hi: number): number {
    let j = this.cur < this.n ? this.cur : this.n - 1;
    if (j < 1) j = 1;
    while (j > 1 && this.R[j - 1] > lo) j--;
    const zl = 1e-12 * this.rhoCur;
    for (; j < this.n; j++) {
      const r = this.R[j];
      if (r >= hi - zl) break;
      if (r > lo + zl && this.J[j]) return j;
    }
    return -1;
  }

  private steepAt(j: number, r: number): number {
    const Fa = this.sFa;
    const Fb = this.sFb;
    this.q(j, r);
    this.foot(j, 0, r, Fa);
    this.foot(j, 1, r, Fb);
    const denQ = 1 + ((this.Qx - Fa.x) * (this.Qx - Fb.x) + (this.Qy - Fa.y) * (this.Qy - Fb.y)) / ((Fa.d || 1) * (Fb.d || 1));
    const denRatio = Math.abs(this.denV) > 1e-12 ? denQ / this.denV : 0;
    return ss01((denRatio - 0.3) / 0.4);
  }

  // The steep gate's minimum over piece j: constant on a line piece (both
  // feet on segments), monotone on the others (its minimum at an end).
  private steepOf(j: number): number {
    let s = this.St[j];
    if (s === s) return s;
    if (this.Ty[j] === 0) {
      const r = 0.5 * (this.R[j] + this.R[j + 1]);
      s = this.steepAt(j, r);
      this.Sr[j] = r;
    } else {
      const s0 = this.steepAt(j, this.R[j]);
      const s1 = this.steepAt(j, this.R[j + 1]);
      if (s1 <= s0) {
        s = s1;
        this.Sr[j] = this.R[j + 1];
      } else {
        s = s0;
        this.Sr[j] = this.R[j];
      }
    }
    this.St[j] = s;
    return s;
  }

  // The first piece in [lo, hi] whose steep-gate minimum lies strictly
  // inside and under wcap (w there is lower than at either end), or -1.
  private dipIn(lo: number, hi: number, wcap: number): number {
    if (!(wcap > 1e-12)) return -1;
    let j = this.cur < this.n ? this.cur : this.n - 1;
    if (j < 0) return -1;
    while (j > 0 && this.R[j] > lo) j--;
    const zl = 1e-12 * this.rhoCur;
    for (; j < this.n; j++) {
      const r = this.R[j];
      if (r >= hi) break;
      if (!(this.R[j + 1] - r > zl) || this.R[j + 1] <= lo) continue;
      if (this.steepOf(j) < wcap - 1e-12) {
        const m = this.Sr[j];
        if (m > lo + zl && m < hi - zl) return j;
      }
    }
    return -1;
  }

  private refine(lo: number, wlo: number, hi: number, whi: number, E: number, Lmin: number, w: () => number): number {
    const L = hi - lo;
    if (L > 2 * Lmin) {
      // split at a jump (w at its left limit: at(R[j]) reads piece j - 1);
      // else inside a dip (a line piece under both ends' w)
      const j = this.jumpIn(lo, hi);
      let m = j > 0 ? this.R[j] : -1;
      if (m < 0) {
        const d = this.dipIn(lo, hi, Math.min(wlo, whi));
        if (d >= 0) {
          m = 0.5 * (this.R[d] + Math.min(this.R[d + 1], hi));
          if (m < lo + Lmin) m = lo + Lmin;
          if (m > hi - Lmin) m = hi - Lmin;
        }
      }
      if (m > 0) {
        this.at(m);
        const wm = Math.min(wlo, w());
        const left = this.refine(lo, wlo, m, wm, E, Lmin, w);
        const wmid = this.wEnd;
        if (!(wmid > 0)) {
          this.wEnd = 0;
          return left;
        }
        return left + this.refine(m, wmid, hi, Math.min(wmid, whi), E, Lmin, w);
      }
    }
    if ((wlo - whi) * L * 0.5 <= E || L <= Lmin) {
      this.wEnd = whi;
      return 0.5 * (wlo + whi) * L;
    }
    const m = 0.5 * (lo + hi);
    if (!this.at(m)) {
      this.wEnd = whi;
      return 0.5 * (wlo + whi) * L;
    }
    const wm = Math.min(wlo, w());
    const wh = Math.min(wm, whi);
    if (Math.abs(wlo - 2 * wm + wh) * L * 0.25 <= E) {
      this.wEnd = wh;
      return (wlo + 2 * wm + wh) * L * 0.25;
    }
    const left = this.refine(lo, wlo, m, wm, E, Lmin, w);
    const wmid = this.wEnd;
    if (!(wmid > 0)) {
      this.wEnd = 0;
      return left;
    }
    return left + this.refine(m, wmid, hi, Math.min(wmid, whi), E, Lmin, w);
  }
}
