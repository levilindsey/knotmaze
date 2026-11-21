// K1362 s1: the per-pixel evaluation, the CPU mirror of gf_glsl.ts's
// fragment shader. Written loop for loop in the shader's style (fixed
// capacities, flat arrays, no allocation per pixel) so the two can be proved
// equal by reading the GPU's pixels back.
//
// Per pixel, from the tables (tables.ts) alone:
// 1. Pieces: every segment of the pixel's bin within rc folds by chain and
//    arc length (|ds| < sigma = pi h, the nearer kept) into at most MAXP
//    pieces, each with its foot, its s, and the segment range it spans.
// 2. Each piece's key z - d zt / h (z: the pins' hats, form B's diagram
//    depth) and its membership (the arm table: group and cap ramp).
// 3. The ramping pieces (0 < ramp < 1) mix whole composites, one per
//    configuration (form B's Q2), at most MAXR of them.
// 4. Surfaces (a group, or a piece of its own) in key order; per surface the
//    coverage and the ink, the max over its exposed-outline terms: each
//    member's side foot (buried by another member's tube or a fillet of the
//    group) and each fillet's arc. The term that wins is kept (`win*`):
//    which piece side or which fillet draws the pixel's outline.
// 5. The composite top-down (ink += T v, T *= 1 - a), with one adjacent
//    swap mixed where two surfaces' keys tie within zt (form B's tie).
// The label (chain, s) is the top covering surface's max-key covering member.

import { CH, MAXP, type GfTables } from "./tables";

export const MAXR = 2; // ramping pieces mixed per pixel
export const MAXK = 6; // corners per pixel
/** K1438: GfEval.fadeLength's default, url_state's `fadeLength` default (a test pins the two equal). */
export const GF_FADE_LENGTH = 0.14;
const TANGENT_TERMS = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_TANG !== "0";
const SELF_BURIAL =(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_SELFBUR === "1";
/** K1482 s33 (probes): env GF_S33 "0" turns runT off, "all" lets it fire on every lone over pass (s31's rule). */
const S33E = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_S33 ?? "";
const MAXS = MAXP + MAXK; // surfaces

export function ss(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export interface GfPixel {
  ink: number;
  /** Fill coverage (K1362 s2): the configurations' weighted 1 - T after the top-down composite. */
  cov: number;
  /** Label chain index (scene order), -1 for paper. */
  chain: number;
  s: number;
  /** Winning outline term: 0 none, 1 a side (winA = chain, winB = +-1 side), 2 a fillet arc (winA = corner), 3 a cap/end (side at an open end), 4 a fillet tangent point (winA = corner, winB = 0 A / 1 B), 5 a K1049 through-pass arc. */
  winKind: number; winA: number; winB: number;
  /** Candidates tested: segments and corners. */
  nSeg: number; nK: number;
}

/** Scratch for one pixel; reused. */
export class GfEval {
  /** K1482 s33 (probes): env GF_S33 at load; a probe may set it between evals. */
  static S33 = S33E;
  /** K1482 s34 (probes): "0" turns the end-arm burial off (the retry programs keep it: gf_glsl.ts T34); a probe may
   * set it between evals. Env GF_S34 at load. */
  static S34 = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_S34 ?? "";
  /** K1482 s34 (probes): pixels where the end-arm burial took ink. */
  s34n = 0;
  /** K1482 s34 (probes): the last burial's [chain, s] of the inked piece and of the burying partner, ... */
  s34w: number[] = [];
  readonly T: GfTables;
  // pieces
  private pc = new Int32Array(MAXP); private ps = new Float64Array(MAXP); private pd = new Float64Array(MAXP);
  private pfx = new Float64Array(MAXP); private pfy = new Float64Array(MAXP); private plo = new Int32Array(MAXP); private phi = new Int32Array(MAXP);
  private pz = new Float64Array(MAXP); private pkey = new Float64Array(MAXP); private pg = new Int32Array(MAXP); private pramp = new Float64Array(MAXP); private phb = new Int32Array(MAXP);
  /** K1482 s34: member()'s m34 per piece (the keys loop). */
  private p34 = new Int32Array(MAXP);
  private ptx = new Float64Array(MAXP); private pty = new Float64Array(MAXP); private pend = new Uint8Array(MAXP);
  private psurf = new Int32Array(MAXP);
  private np = 0;
  // corners near p
  private kk = new Int32Array(MAXK); private krho = new Float64Array(MAXK); private kIn = new Uint8Array(MAXK); private nk = 0; private tj = new Int32Array(8); private kSec = new Uint8Array(MAXK);
  // surfaces
  private sid = new Int32Array(MAXS); private skey = new Float64Array(MAXS); private sckey = new Float64Array(MAXS);
  private scch = new Int32Array(MAXS); private scs = new Float64Array(MAXS); private scov = new Uint8Array(MAXS);
  private sv = new Float64Array(MAXS); private sa = new Float64Array(MAXS); private swk = new Int32Array(MAXS); private swa = new Int32Array(MAXS); private swb = new Int32Array(MAXS);
  private sord = new Int32Array(MAXS); private ns = 0;
  readonly out: GfPixel = { ink: 0, cov: 0, chain: -1, s: 0, winKind: 0, winA: -1, winB: 0, nSeg: 0, nK: 0 };

  /**
   * K1438: the crossing fade (`fadeLength`, world units; url_state's default, pinned by a test), read per pixel
   * like a uniform: set it at any time, no table rebuild. With home membership on (T.homeOn), a piece inside an
   * arm's home interval stays in the arm's junction group while its depth is near 0 and leaves it as the thread
   * dives: membership 1 - ss(zt, Z, |z|), Z = fadeLength * amp / win, the depth a full-window hat (slope amp / win)
   * reaches over fadeLength of arc. So the fade ends fadeLength of arc into the dive (less where two pins share a
   * shorter window), the same length the look's crossing gap ramps over (gf_look.ts lkGap). K1449: a full member
   * down to zt (the depth within which two surfaces' keys tie, composite()): a piece shallower than that is never a
   * second surface keyed within zt of its own junction, so the dive draws no tie band; and a Z at or below zt
   * (fadeLength 0 included) is a hard step at zt, clear of the tent's foot, where |z| leaves 0 by f32 noise (K1439's
   * parity outlier). K1435's tgr (3 zt) is fadeLength 0.3 win.
   */
  fadeLength = GF_FADE_LENGTH;

  constructor(T: GfTables) { this.T = T; }

  /** K1438/K1449: the home membership's ramp at depth |z| = az (1 = full member); gf_glsl.ts homeForm mirrors it. */
  homeRamp(az: number): number {
    const zt = this.T.zt;
    const Z = (this.fadeLength * this.T.amp) / this.T.win;
    if (!(Z > zt)) return az > zt ? 0 : 1;
    return 1 - ss(zt, Z, az);
  }

  /** K1482 s2: an open chain's end cap (the foot clamped to the chain's tip, s at the chain's first or last vertex)
   * sinks one pass (amp = 10 zt, tables.ts) when its piece belongs to a junction group: a fused tail's cap yields to
   * the thread it meets, as the approved look's outline runs on unbroken at under-tail ends. gf_glsl.ts tipSink.
   * K1482 s3: the sink tapers to 0 over the last h/2 of arc length (e = s's distance from the nearer tip). Stage 2's
   * step (cap only) put a key jump of 10 zt across the tip's perpendicular: square ink knobs at the tail ends and,
   * in the fill look, a hard dark block (ring 1.77, 15.26). A longer taper (h) grows spurs. */
  tipSink(c: number, s: number): number {
    const T = this.T; if (T.cClosed[c] === 1) return 0;
    const v0 = T.cV0[c]; const e = Math.min(s - T.vs[v0], T.vs[v0 + T.cNV[c] - 1] - s);
    return 10 * T.zt * (1 - ss(0, 0.5 * T.h, e));
  }

  /** Membership of (c, s) as eval() takes it (group -1 = none; ramp 1 = full): for tests and probes. */
  memberAt(c: number, s: number): { g: number; ramp: number } {
    this.depth(c, s); this.member(c, s, this.mz);
    return { g: this.mg, ramp: this.mramp };
  }

  /** Membership of (c, s): group (-1 none) and cap ramp (form B's member()). K1407 c5: loop 2 skips the arms rooted
   * where loop 1's arm is (a through pass's other half). Their cut reaches back past the root by the straight reach
   * h / tan(theta / 2), which a shallow crossing on curved threads stretches over the whole of loop 1's arm (muse_hash
   * 29.74,20.26: 14 degrees, reach 3.2, the arm 1.18 long), demoting it and drawing an outline inside the junction's
   * fill, or burying a corner fill's other arm (22.56,34.84). A pass behind loop 1's arm's root already bounds it
   * through tables' k uB. Roots compare within 1e-4 (the GLSL reads them as float32).
   * K1438 (T.homeOn): the same loop finds the home arm, the nearest root whose home interval (aHome) holds s; a
   * piece that is not already a full member takes that arm's group at homeRamp(|z|) when that is more than it has. */
  private member(c: number, s: number, z: number): void {
    const T = this.T; const a0 = T.cArm0[c]; const an = T.cArmN[c]; const lam = T.h;
    const closed = T.cClosed[c] === 1; const len = T.cLen[c];
    const home = T.homeOn; let hg = -1; let hb = Infinity;
    let g = -1; let ramp = 0; let sRa = 0;
    for (let i = a0; i < a0 + an; i++) {
      let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) d = ((d % len) + len) % len;
      if (home && !(d < -1e-12 || d > T.aHome[i] + 1e-12 || d >= hb)) { hb = d; hg = T.aG[i]; }
      if (d < -1e-12 || d > T.aL[i] + 1e-12) continue;
      const Lc = T.aLcut[i];
      const rp = Lc === Infinity ? 1 : ss(Lc, Lc - lam, d);
      if (g < 0 || rp > ramp) { g = T.aG[i]; ramp = rp; sRa = T.aSR[i]; }
    }
    if (g >= 0 && ramp > 0) {
      for (let i = a0; i < a0 + an; i++) {
        const Lc = T.aLcut[i]; if (T.aG[i] !== g || Lc === Infinity || Math.abs(T.aSR[i] - sRa) < 1e-4) continue;
        let d = (s - T.aSR[i]) * T.aDir[i]; if (closed) { d = ((d % len) + len) % len; if (d > len / 2) d -= len; }
        if (!(d < 1e-12 && d > Lc - lam)) continue;
        ramp = Math.min(ramp, ss(Lc, Lc - lam, d));
      }
    }
    if (g < 0) ramp = 1;
    if (hg >= 0 && !(g >= 0 && ramp >= 1)) {
      const r = this.homeRamp(Math.abs(z));
      if (r > 0 && !(g === hg && ramp >= r)) { g = hg; ramp = r; }
    }
    // K1482 s34 (retry tables, T.a34; gf_glsl.ts homeBurial's member, line for line): m34 = (C + 1) * 2 + e over
    // the arms of the piece's group or home G (no wrap: e needs an open chain, and a cut root's home lies past it).
    // e = 1: the piece lies on an end-rooted arm of its group (g >= 0) within max(aL, aHome); C: the first arm of G
    // holding it within aHome whose a34 names a cutting chain.
    let m34 = 0; const A34 = T.homeOn ? T.a34 : undefined; const G = g >= 0 ? g : hg;
    if (A34 && G >= 0) {
      let C = -1; let e = 0;
      for (let i = a0; i < a0 + an; i++) {
        const q = A34[i]; if (T.aG[i] !== G || q === 0) continue;
        const d = (s - T.aSR[i]) * T.aDir[i];
        if (g >= 0 && (q & 1) === 1 && d > -1e-12 && d < Math.max(T.aL[i], T.aHome[i]) + 1e-12) e = 1;
        if (C < 0 && q >= 2 && d > -1e-12 && d < T.aHome[i] + 1e-12) C = (q >> 1) - 1;
      }
      m34 = (C + 1) * 2 + e;
    }
    this.mg = g; this.mramp = ramp; this.mhb = g < 0 ? hg : -1; this.m34 = m34;
  }
  /** K1482 s28: member()'s home group for a piece left out of every group (its arm's home, too deep in z), else -1. */
  private mhb = -1;
  /** K1482 s34: member()'s end-arm code (tables.ts arms34). */
  private m34 = 0;
  /** K1482 s32: the t84e fold rule (retry programs: foldD's lone fold, the sibling burial); OFF unless env GF_S32=1. */
  private s32 = false;
  private mg = -1; private mramp = 1;

  /** member()'s depth at the last depth() call: today's window (tables.depthAt). */
  private mz = 0;

  /** K1451: the KEY depth (gf_glsl.ts depth()): the neighbouring pins' hats, each over min(its own window on the
   * facing side, T.pinWL / pinWR, the pin gap). Also leaves the diagram depth over min(win, the gap) in mz
   * (tables.depthAt, inlined for the shader), which member() and the corners keep. */
  private depth(c: number, s: number): number {
    const T = this.T; const n = T.cPinN[c]; if (n === 0) { this.mz = 0; return 0; }
    const b = T.cPin0[c]; const win = T.win;
    let u = s; const len = T.cLen[c];
    if (T.cClosed[c]) { u = (s - T.cS0[c]) % len; if (u < 0) u += len; u += T.cS0[c]; }
    let lo = -1; let hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.pinS[b + m] <= u) lo = m; else hi = m; }
    let zL = 0; let dL = 0; let zR = 0; let dR = 0; let w = win; let wL = win; let wR = win;
    if (T.cClosed[c]) {
      const iL = lo < 0 ? n - 1 : lo; const sL = lo < 0 ? T.pinS[b + iL] - len : T.pinS[b + iL];
      const iR = lo + 1 >= n ? 0 : lo + 1; const sR = lo + 1 >= n ? T.pinS[b + iR] + len : T.pinS[b + iR];
      const g = sR - sL; w = Math.min(win, g); wL = Math.min(T.pinWR[b + iL], g); wR = Math.min(T.pinWL[b + iR], g);
      zL = T.pinZ[b + iL]; dL = u - sL; zR = T.pinZ[b + iR]; dR = sR - u;
    } else if (lo < 0) { zR = T.pinZ[b]; dR = T.pinS[b] - u; dL = Infinity; wR = T.pinWL[b]; }
    else if (lo + 1 >= n) { zL = T.pinZ[b + n - 1]; dL = u - T.pinS[b + n - 1]; dR = Infinity; wL = T.pinWR[b + n - 1]; }
    else {
      const g = T.pinS[b + lo + 1] - T.pinS[b + lo]; w = Math.min(win, g); wL = Math.min(T.pinWR[b + lo], g); wR = Math.min(T.pinWL[b + lo + 1], g);
      zL = T.pinZ[b + lo]; dL = u - T.pinS[b + lo]; zR = T.pinZ[b + lo + 1]; dR = T.pinS[b + lo + 1] - u;
    }
    const hat = (z: number, d: number, ww: number): number => (ww <= 1e-12 ? (d <= 0 ? z : 0) : d >= ww ? 0 : z * (1 - d / ww));
    this.mz = hat(zL, dL, w) + hat(zR, dR, w);
    return hat(zL, dL, wL) + hat(zR, dR, wR);
  }

  /** Squared distance from (x, y) to piece j's segments (its fold range). */
  /** form B's inFill arm test: (x, y) lies outside both arms' tubes (deeper than h - 2aa inside one is not
   * the fill), the arm on the foot's own chain skipped; the arms read through the gathered pieces. */
  private outsideArms(k: number, own: number, x: number, y: number): boolean {
    const T = this.T; const lim = T.h - 2 * T.aa; const lim2 = lim * lim;
    for (let side = 0; side < 2; side++) {
      const c = side === 0 ? T.kCa[k] : T.kCb[k]; if (c === own) continue;
      for (let m = 0; m < this.np; m++) if (this.pc[m] === c && this.pieceD(m, x, y) < lim2) return false;
    }
    return true;
  }

  /**
   * K1482 s7: a hairpin's own fold. Piece j buries its side face's point (qx, qy) by its own segments, as another
   * piece would, only at a junction (p inside another piece of surface S) and only by segments turned more than
   * 120 degrees from p's nearest segment (the fold's other run, never a bend's next segment). Returns the squared
   * distance from q to those segments, BIG when the rule does not apply. Off everywhere else: form B never buries a
   * piece by its whole fold (K1362 s1: 132 census finds were that self-burial).
   */
  private foldD(j: number, S: number, x: number, y: number, qx: number, qy: number): number {
    if (!(this.phi[j] - this.plo[j] > 1)) return Infinity;
    let inOther = false;
    for (let m = 0; m < this.np; m++) if (m !== j && this.psurf[m] === S && this.pd[m] < this.T.h) { inOther = true; break; }
    const T = this.T; const c = this.pc[j]; const v0 = T.cV0[c]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1;
    let tx = 0; let ty = 0; let dp = Infinity;
    for (let kk = this.plo[j]; kk <= this.phi[j]; kk++) {
      let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
      const v = v0 + k; const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
      const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const ex = x - ax - dx * u; const ey = y - ay - dy * u; const e2 = ex * ex + ey * ey;
      if (e2 < dp) { dp = e2; tx = dx; ty = dy; }
    }
    const tl = Math.sqrt(tx * tx + ty * ty); let d2 = Infinity; let sf = 0; let fc = 1;
    for (let kk = this.plo[j]; kk <= this.phi[j]; kk++) {
      let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
      const v = v0 + k; const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
      const l2 = dx * dx + dy * dy; if (!(dx * tx + dy * ty < -0.5 * Math.sqrt(l2) * tl)) continue;
      const u = l2 > 0 ? Math.min(1, Math.max(0, ((qx - ax) * dx + (qy - ay) * dy) / l2)) : 0;
      const ex = qx - ax - dx * u; const ey = qy - ay - dy * u; const e2 = ex * ex + ey * ey;
      if (e2 < d2) { d2 = e2; sf = T.vs[v] + u * (T.vs[v + 1] - T.vs[v]); fc = -(dx * tx + dy * ty) / (Math.sqrt(l2) * tl); }
    }
    if (!inOther) {
      // K1482 s32 (OFF: env GF_S32=1 in the mirror; gf_glsl.ts loneFold, not applied): a hairpin folded into ONE piece away from
      // a junction (t84e: chain 84's legs at about 35 degrees, both inner bands inked past the cusp into a dark patch).
      // The fold's other run buries q when it turns more than about 52 degrees back (cos > 0.62) and q lies inside its
      // tube, and either it turns more than 45 degrees (cos > 0.7, found by the plain search) with a piece of the chain
      // on another surface within arc 2 (the sibling), or the run's foot (member at its arc) is homed in a group but in
      // none while p's piece is in none, or p's piece is in a group the run's foot is not. Where the plain search finds
      // no fold, a second one also takes segments turned back from the tangents at arc +-0.3 (the D search), fold only.
      if (!this.s32) return Infinity;
      let viaD = false; const SD = 0.3;
      if (!(d2 < T.h * T.h)) { viaD = true;
        const L = T.cLen[c]; const sp0 = this.ps[j]; let t1x = tx; let t1y = ty; let t2x = tx; let t2y = ty;
        for (let kk = this.plo[j]; kk <= this.phi[j]; kk++) {
          let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
          const v = v0 + k; const a0 = T.vs[v]; const a1 = T.vs[v + 1];
          for (let sgn = -1; sgn <= 1; sgn += 2) {
            let sa = sp0 + sgn * SD; if (closed) { if (sa < 0) sa += L; else if (sa >= L) sa -= L; }
            if (sa >= a0 && sa < a1) { if (sgn < 0) { t1x = T.vx[v + 1] - T.vx[v]; t1y = T.vy[v + 1] - T.vy[v]; } else { t2x = T.vx[v + 1] - T.vx[v]; t2y = T.vy[v + 1] - T.vy[v]; } }
          }
        }
        const l1 = Math.sqrt(t1x * t1x + t1y * t1y); const l2t = Math.sqrt(t2x * t2x + t2y * t2y);
        d2 = Infinity; fc = 1;
        for (let kk = this.plo[j]; kk <= this.phi[j]; kk++) {
          let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
          const v = v0 + k; const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
          const l2 = dx * dx + dy * dy; const ll = Math.sqrt(l2); if (!(ll > 0)) continue;
          const f0 = -(dx * tx + dy * ty) / (ll * tl); const f1 = -(dx * t1x + dy * t1y) / (ll * l1); const f2 = -(dx * t2x + dy * t2y) / (ll * l2t);
          const fm = Math.max(f0, f1, f2); if (!(fm > 0.5)) continue;
          const u = Math.min(1, Math.max(0, ((qx - ax) * dx + (qy - ay) * dy) / l2));
          const ex = qx - ax - dx * u; const ey = qy - ay - dy * u; const e2 = ex * ex + ey * ey;
          if (e2 < d2) { d2 = e2; sf = T.vs[v] + u * (T.vs[v + 1] - T.vs[v]); fc = fm; }
        }
      }
      if (!(d2 < T.h * T.h) || !(fc > 0.62)) return Infinity;
      const hi = fc > 0.7 && !viaD;
      let sib = false;
      for (let m = 0; m < this.np; m++) {
        if (m === j || this.pc[m] !== c || this.psurf[m] === S) continue;
        let ds = Math.abs(this.ps[m] - this.ps[j]); if (closed) ds = Math.min(ds, T.cLen[c] - ds);
        if (ds < 2) { sib = true; break; }
      }
      if (sib && hi) return d2;
      const zf = this.depth(c, sf); this.member(c, sf, zf);
      if (this.pg[j] < 0 && this.mg < 0 && this.mhb >= 0) return d2;
      return hi && this.pg[j] >= 0 && this.pg[j] !== this.mg ? d2 : Infinity;
    }
    return d2;
  }

  private pieceD(j: number, x: number, y: number): number {
    const T = this.T; const c = this.pc[j]; const v0 = T.cV0[c]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1;
    let d2 = Infinity;
    for (let kk = this.plo[j]; kk <= this.phi[j]; kk++) {
      let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
      const v = v0 + k; const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
      const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const ex = x - ax - dx * u; const ey = y - ay - dy * u; const e2 = ex * ex + ey * ey;
      if (e2 < d2) d2 = e2;
    }
    return d2;
  }

  /** Is (x, y) inside corner k's sector (between its rays, the short way)? */
  private inSector(k: number, x: number, y: number): boolean {
    const T = this.T; const rx = x - T.kCx[k]; const ry = y - T.kCy[k];
    const ax = T.kEax[k]; const ay = T.kEay[k]; const bx = T.kEbx[k]; const by = T.kEby[k];
    const cab = ax * by - ay * bx; // orientation of a -> b
    const c1 = ax * ry - ay * rx; const c2 = rx * by - ry * bx;
    return cab >= 0 ? c1 >= 0 && c2 >= 0 : c1 <= 0 && c2 <= 0;
  }

  /** K1407 c2: a corner face (arc or tangent point (qx, qy) of corner k, seen from the pixel (x, y)) against the
   * other corners' fills of its surface. q is tested a step aa toward k's own ball; when a fill k2 covers it, the
   * paper next to k's circle there is the lens of the two balls, which ends where the circles cross. The face keeps
   * only band(|p - X|), X the crossing nearest q (the lens corner's round cap), and nothing when the circles do not
   * cross or X lies inside a tube of the surface. c1 tested a step W deep and buried whole, so an arc whose paper
   * side was the lens ran on past X into k2's fill: the pointed stubs at K1315's under-tail ends (c1 rows 5-10).
   * K1407 c4: the burial is 1 - band(|p - X|) / band(|p - q|), so the face keeps min(band(|p - q|), band(|p - X|)),
   * and it starts where q itself leaves k2's ball when the circles cross (the inset test alone switched aa / tan of
   * the crossing angle past X), so at the switch q = X and the face's value is the unburied one. c3 multiplied the
   * cap in where i entered the fill: up to 0.33 of ink dropped across the outer edge where two near-coincident arcs
   * hand over (the def seam notches). Capping at that switch instead left a bulge (out/c4 sheet_c4_notches, c4a).
   * Returns the burial, max over the fills. gf_glsl.ts's fillBur, line for line. */
  private fillBur(k: number, qx: number, qy: number, x: number, y: number, S: number): number {
    const T = this.T; const r = T.kR[k]; const cx = T.kCx[k]; const cy = T.kCy[k]; const aa = T.aa; const W = T.W;
    const inF = r > 0 ? Math.min(aa, 0.5 * r) / r : 0;
    const ix = qx + (cx - qx) * inF; const iy = qy + (cy - qy) * inF;
    const bq = 1 - ss(W - aa, W + aa, Math.sqrt((x - qx) * (x - qx) + (y - qy) * (y - qy)));
    const lim = T.h - 2 * aa; const lim2 = lim * lim;
    let fbur = 0;
    for (let i2 = 0; i2 < this.nk; i2++) {
      const k2 = this.kk[i2]; if (k2 === k || T.kG[k2] !== S) continue;
      const c2x = T.kCx[k2]; const c2y = T.kCy[k2]; const r2 = T.kR[k2];
      const rq = Math.sqrt((ix - c2x) * (ix - c2x) + (iy - c2y) * (iy - c2y));
      const rqq = Math.sqrt((qx - c2x) * (qx - c2x) + (qy - c2y) * (qy - c2y));
      if (!((rq > r2 || rqq > r2) && rq < T.kRmax[k2] && this.inSector(k2, ix, iy) && this.outsideArms(k2, -1, ix, iy))) continue;
      let b = rq > r2 ? 1 : 0;
      const dx = c2x - cx; const dy = c2y - cy; const d2 = dx * dx + dy * dy; const d = Math.sqrt(d2);
      if (d > 1e-9) {
        const a = (r * r - r2 * r2 + d2) / (2 * d); const hh2 = r * r - a * a;
        if (hh2 >= 0) {
          const hh = Math.sqrt(hh2); const ux = dx / d; const uy = dy / d; const bx = cx + a * ux; const by = cy + a * uy;
          const sg = (qx - bx) * -uy + (qy - by) * ux >= 0 ? hh : -hh;
          const Xx = bx - uy * sg; const Xy = by + ux * sg;
          let inTube = false;
          for (let m = 0; m < this.np; m++) if (this.psurf[m] === S && this.pieceD(m, Xx, Xy) < lim2) { inTube = true; break; }
          if (!inTube) {
            const bX = 1 - ss(W - aa, W + aa, Math.sqrt((x - Xx) * (x - Xx) + (y - Xy) * (y - Xy)));
            b = bq > bX ? 1 - bX / bq : 0;
          }
        }
      }
      if (b > fbur) fbur = b;
      if (fbur >= 1) break;
    }
    return fbur;
  }

  private fX = 0; private fY = 0;
  /** pieceD, and the nearest point in (fX, fY). gf_glsl.ts's pieceF, line for line. */
  private pieceF(j: number, x: number, y: number): number {
    const T = this.T; const c = this.pc[j]; const v0 = T.cV0[c]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1;
    let d2 = Infinity; this.fX = x; this.fY = y;
    for (let kk = this.plo[j]; kk <= this.phi[j]; kk++) {
      let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue;
      const v = v0 + k; const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
      const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const ex = x - ax - dx * u; const ey = y - ay - dy * u; const e2 = ex * ex + ey * ey;
      if (e2 < d2) { d2 = e2; this.fX = ax + dx * u; this.fY = ay + dy * u; }
    }
    return d2;
  }

  /** K1482 s33 (probes): the last runT's narrowest pair, band chain and over chain. */
  rtC = -1; rtM = -1;
  /** K1482 s33 (s31's runT, gated): the width factor of surface S's band at outline point q (outward normal n): 1, or
   * less where a lone piece m over it (z higher by 0.05..0.2) faces q across a gap g = |q - m| - h under 5 aa, tapering
   * to 0 at 1 aa. Only on the over chain the tables name for the band's chain (T.rtM, a long tangent run: j59's
   * step); env GF_S33=all lets every lone over piece count (s31's ungated rule, probes only). */
  private runT(S: number, C: number, zj: number, qx: number, qy: number, nx: number, ny: number): number {
    const T = this.T; const h = T.h; const aa = T.aa; let t = 1;
    const all = GfEval.S33 === "all"; const M = T.rtM !== undefined ? T.rtM[C] : -1; if (!all && !(M >= 0)) return 1;
    for (let m = 0; m < this.np; m++) {
      if (this.psurf[m] >= 0 || this.psurf[m] === S || this.pc[m] === C || (!all && this.pc[m] !== M)) continue;
      const over = ss(0.05, 0.2, this.pkey[m] + (this.pd[m] * T.zt) / h - zj); if (!(over > 0)) continue;
      const dm = Math.sqrt(this.pieceF(m, qx, qy)); const g = dm - h; if (!(g < 5 * aa)) continue;
      const face = dm > 1e-12 && (nx !== 0 || ny !== 0) ? ss(0.9, 0.97, -(nx * (qx - this.fX) + ny * (qy - this.fY)) / dm) : 1;
      const tm = 1 - over * face * (1 - ss(aa, 5 * aa, g));
      if (tm < t) { t = tm; this.rtC = C; this.rtM = this.pc[m]; }
    }
    return t;
  }

  private vtxA = -1; private vtxB = -1;
  /** K1407 c3: the vertices of surface S's outline where two of its members' tubes cross. Each side band stops
   * where its foot is buried by the other tube, so in the normal cone at the vertex V (the pixels whose feet on
   * both outlines are buried) no side term draws, and the band broke at two straight cuts (the muse_hash eye). V is
   * a point of the outline, so band(|p - V|) bounds the true band from above, as the tangent points do. V is where
   * the two outline lines through the pixel's feet meet, kept only when it lies on both tubes' boundaries (within
   * aa: a far V, or one past a piece's end, is not) and nothing else of S covers it: another member's tube, as a
   * side face is buried, or a corner's fill (the fillet replaces the vertex). Returns band(|p - V|) times the
   * burial's complement, max over the pairs; vtxA / vtxB are the pair's chains. gf_glsl.ts's vtx, line for line. */
  private vtx(S: number, x: number, y: number): number {
    const T = this.T; const h = T.h; const aa = T.aa; const W = T.W;
    let best = 0; this.vtxA = -1; this.vtxB = -1;
    for (let j = 0; j < this.np; j++) {
      const Xj = this.pd[j]; if (this.psurf[j] !== S || !(Xj < h + W + aa && Xj > 1e-12)) continue;
      // the outline line n . q = h + n . f, in coordinates relative to p (n . (f - p) = -X): well conditioned in fp32
      const njx = (x - this.pfx[j]) / Xj; const njy = (y - this.pfy[j]) / Xj; const cj = h - Xj;
      for (let m = j + 1; m < this.np; m++) {
        const Xm = this.pd[m]; if (this.psurf[m] !== S || !(Xm < h + W + aa && Xm > 1e-12)) continue;
        const nmx = (x - this.pfx[m]) / Xm; const nmy = (y - this.pfy[m]) / Xm; const cm = h - Xm;
        const det = njx * nmy - njy * nmx; if (!(Math.abs(det) > 1e-6)) continue;
        const r0x = (cj * nmy - cm * njy) / det; const r0y = (njx * cm - nmx * cj) / det;
        if (!(r0x * r0x + r0y * r0y < 4 * (W + aa) * (W + aa))) continue;
        const V0x = x + r0x; const V0y = y + r0y;
        // once more from the vertex's own feet: the lines through p's feet are the outlines' tangents there, not at
        // V, so on a bend V moved with p and the term's edge came out ragged (the eye's cap, first try)
        const ej = this.pieceF(j, V0x, V0y); const gjx = this.fX; const gjy = this.fY;
        const em = this.pieceF(m, V0x, V0y); const gmx = this.fX; const gmy = this.fY;
        if (!(ej > 1e-24 && em > 1e-24)) continue;
        const rj = Math.sqrt(ej); const rm = Math.sqrt(em);
        const ujx = (V0x - gjx) / rj; const ujy = (V0y - gjy) / rj; const kj = h + ujx * (gjx - x) + ujy * (gjy - y);
        const umx = (V0x - gmx) / rm; const umy = (V0y - gmy) / rm; const km = h + umx * (gmx - x) + umy * (gmy - y);
        const det2 = ujx * umy - ujy * umx; if (!(Math.abs(det2) > 1e-6)) continue;
        const Vx = x + (kj * umy - km * ujy) / det2; const Vy = y + (ujx * km - umx * kj) / det2;
        const dV = Math.sqrt((x - Vx) * (x - Vx) + (y - Vy) * (y - Vy)); if (!(dV < W + aa)) continue;
        const fV = 1 - ss(W - aa, W + aa, dV); if (!(fV > best)) continue;
        if (!(Math.abs(Math.sqrt(this.pieceD(j, Vx, Vy)) - h) < aa && Math.abs(Math.sqrt(this.pieceD(m, Vx, Vy)) - h) < aa)) continue;
        let vb = 0;
        for (let n = 0; n < this.np && vb < 1; n++) {
          if (n === j || n === m || this.psurf[n] !== S) continue;
          const b2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(n, Vx, Vy)));
          if (b2 > vb) vb = b2;
        }
        for (let i = 0; i < this.nk && vb < 1; i++) {
          const k = this.kk[i]; if (T.kG[k] !== S) continue;
          const rV = Math.sqrt((Vx - T.kCx[k]) * (Vx - T.kCx[k]) + (Vy - T.kCy[k]) * (Vy - T.kCy[k]));
          if (rV > T.kR[k] && rV < T.kRmax[k] && this.inSector(k, Vx, Vy) && this.outsideArms(k, -1, Vx, Vy)) vb = 1;
        }
        let val = (1 - vb) * fV;
        if (val > best && S >= 0 && T.homeOn && T.kExt !== undefined && GfEval.S33 !== "0") { // K1482 s33: the vertex cap, likewise
          const tr = this.runT(S, this.pc[j], this.pkey[j] + (Xj * T.zt) / h, Vx, Vy, 0, 0);
          if (tr < 1) { const w = W * tr; val = (1 - vb) * (1 - ss(w - aa, w + aa, dV)) * ss(0, 2 * aa, w); }
        }
        if (val > best) { best = val; this.vtxA = this.pc[j]; this.vtxB = this.pc[m]; }
      }
    }
    return best;
  }

  eval(x: number, y: number): GfPixel {
    const T = this.T; const h = T.h; const aa = T.aa; const W = T.W; const o = this.out;
    o.ink = 0; o.cov = 0; o.chain = -1; o.s = 0; o.winKind = 0; o.winA = -1; o.winB = 0; o.nSeg = 0; o.nK = 0;
    const gx = Math.floor((x - T.gx0) / T.G); const gy = Math.floor((y - T.gy0) / T.G);
    if (gx < 0 || gy < 0 || gx >= T.gW || gy >= T.gH) return o;
    const cell = gy * T.gW + gx; const rc = T.rc; const rc2 = rc * rc;
    // 1. pieces
    let np = 0;
    const c0 = T.cellCh0[cell]; const cn = T.cellChN[cell];
    for (let q = c0; q < c0 + cn; q++) {
      const ch = T.cellChList[q]; const b = 4 * ch;
      const bx = Math.max(T.chBox[b] - x, 0, x - T.chBox[b + 2]); const by = Math.max(T.chBox[b + 1] - y, 0, y - T.chBox[b + 3]);
      if (bx * bx + by * by >= rc2) continue;
      const c = T.chC[ch]; const v0 = T.chV0[ch]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
      for (let i = 0; i < T.chN[ch]; i++) {
        const v = v0 + i; o.nSeg++;
        const ax = T.vx[v]; const ay = T.vy[v]; const dx = T.vx[v + 1] - ax; const dy = T.vy[v + 1] - ay;
        const l2 = dx * dx + dy * dy; const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
        const fx = ax + dx * u; const fy = ay + dy * u; const ex = x - fx; const ey = y - fy; const d2 = ex * ex + ey * ey;
        if (d2 >= rc2) continue;
        const d = Math.sqrt(d2); const s = T.vs[v] + u * (T.vs[v + 1] - T.vs[v]); const k = v - T.cV0[c];
        // fold into a piece of chain c within sigma
        let j = -1;
        for (let m = 0; m < np; m++) {
          if (this.pc[m] !== c) continue;
          let ds = Math.abs(s - this.ps[m]); if (closed) ds = Math.min(ds, len - ds);
          if (ds < T.sigma) { j = m; break; }
        }
        if (j >= 0) {
          // unwrapped segment index nearest the piece's range
          let kk = k; if (closed) { const ref = this.plo[j]; while (kk - ref > nseg / 2) kk -= nseg; while (ref - kk > nseg / 2) kk += nseg; }
          if (kk < this.plo[j]) this.plo[j] = kk; if (kk > this.phi[j]) this.phi[j] = kk;
          if (d < this.pd[j]) { this.pd[j] = d; this.ps[j] = s; this.pfx[j] = fx; this.pfy[j] = fy; this.ptx[j] = dx; this.pty[j] = dy; this.pend[j] = (!closed && ((k === 0 && u <= 0) || (k === nseg - 1 && u >= 1))) ? 1 : 0; }
          continue;
        }
        if (np < MAXP) j = np++;
        else { let far = 0; for (let m = 1; m < MAXP; m++) if (this.pd[m] > this.pd[far]) far = m; if (this.pd[far] <= d) continue; j = far; }
        this.pc[j] = c; this.pd[j] = d; this.ps[j] = s; this.pfx[j] = fx; this.pfy[j] = fy; this.plo[j] = k; this.phi[j] = k; this.ptx[j] = dx; this.pty[j] = dy;
        this.pend[j] = (!closed && ((k === 0 && u <= 0) || (k === nseg - 1 && u >= 1))) ? 1 : 0;
      }
    }
    this.np = np;
    // 2. keys and membership
    const zK = T.zt / h;
    let nr = 0; const rIdx = [0, 0]; // the ramping pieces
    for (let j = 0; j < np; j++) {
      this.pz[j] = this.depth(this.pc[j], this.ps[j]); this.pkey[j] = this.pz[j] - this.pd[j] * zK;
      this.member(this.pc[j], this.ps[j], this.mz); this.pg[j] = this.mg; this.pramp[j] = this.mramp; this.phb[j] = this.mhb; this.p34[j] = this.m34;
      if (this.mg >= 0) this.pkey[j] -= this.tipSink(this.pc[j], this.ps[j]);
      if (this.mg >= 0 && this.mramp > 0 && this.mramp < 1) {
        if (nr < MAXR) rIdx[nr++] = j;
        else { /* past MAXR: rounds to the nearer configuration */ this.pramp[j] = this.mramp >= 0.5 ? 1 : 0; }
      }
    }
    // corners near p. kIn: 2 = p in the fill region (in sector, inside the far bound) past the ball's AA,
    // 1 = in the region inside it, 0 = only a burier (its fill may hold the foot of a side term, which lies
    // within W + aa of p).
    let nk = 0;
    const k0 = T.cellK0[cell]; const kn = T.cellKN[cell];
    // K1049: a through pass's bend corner counts only inside its cone (in its sector, within rV + W + 4aa),
    // where the open eye is the arc's band; a non-through corner of another junction whose sector holds p
    // yields it (the census reference's filletPick, arcInk and yieldInk, less yieldInk's inner ramp).
    let thruK = -1; let thruQ = 0; let yielded = false; let nTj = 0;
    for (let q = k0; q < k0 + kn; q++) {
      const k = T.cellKList[q]; if (!T.kThru[k]) continue;
      const rx = x - T.kCx[k]; const ry = y - T.kCy[k]; const d2 = rx * rx + ry * ry; const lim = T.kRV[k] + W + 4 * aa;
      if (d2 <= lim * lim && this.inSector(k, x, y)) { if (thruK < 0) { thruK = k; thruQ = Math.sqrt(d2); } if (nTj < 8) this.tj[nTj++] = T.kJ[k]; }
    }
    if (thruK >= 0) {
      for (let q = k0; q < k0 + kn && !yielded; q++) {
        const k = T.cellKList[q]; if (T.kThru[k]) continue;
        let same = false; for (let i = 0; i < nTj; i++) if (this.tj[i] === T.kJ[k]) same = true;
        if (!same && this.inSector(k, x, y)) yielded = true;
      }
    }
    for (let q = k0; q < k0 + kn && nk < MAXK; q++) {
      const k = T.cellKList[q]; o.nK++;
      if (T.kThru[k]) {
        if (yielded) continue;
        const tx = x - T.kCx[k]; const ty = y - T.kCy[k]; const lim = T.kRV[k] + W + 4 * aa;
        if (!(tx * tx + ty * ty <= lim * lim) || !this.inSector(k, x, y)) continue;
      }
      const rx = x - T.kCx[k]; const ry = y - T.kCy[k]; const rho = Math.sqrt(rx * rx + ry * ry);
      if (!(rho > T.kR[k] - aa - W) || rho > T.kRmax[k] + W + 2 * aa) continue;
      const sec = this.inSector(k, x, y); const inR = rho <= T.kRmax[k] && sec && T.kR[k] > 0; // K1407 23A: a null corner fills nothing (form B)
      this.kSec[nk] = sec ? 1 : 0; // form B's arc term reads the wedge alone, not the fill's far bound rV
      this.kk[nk] = k; this.krho[nk] = rho; this.kIn[nk] = !inR ? 0 : rho > T.kR[k] - aa ? 2 : 1; nk++;
    }
    this.nk = nk;
    // 3. configurations over the ramping pieces
    if (nr === 2 && this.pramp[rIdx[0]] < this.pramp[rIdx[1]]) { const t = rIdx[0]; rIdx[0] = rIdx[1]; rIdx[1] = t; }
    let ink = 0; let cov = 0; let lab = -1; let labS = 0; let wk = 0; let wa = -1; let wb = 0; let bestW = -1;
    for (let cfg = 0; cfg <= nr; cfg++) {
      // cfg: the first cfg ramping pieces (by ramp, descending) are members
      const hiR = cfg === 0 ? 1 : this.pramp[rIdx[cfg - 1]];
      const loR = cfg === nr ? 0 : this.pramp[rIdx[cfg]];
      const wgt = hiR - loR; if (!(wgt > 0) && nr > 0) continue;
      for (let j = 0; j < np; j++) {
        let mem = this.pg[j] >= 0 && this.pramp[j] >= 1;
        if (this.pg[j] >= 0 && this.pramp[j] > 0 && this.pramp[j] < 1) { mem = false; for (let r = 0; r < cfg; r++) if (rIdx[r] === j) mem = true; }
        this.psurf[j] = mem ? this.pg[j] : -1 - j; // a piece of its own: -1 - j
      }
      this.layers(x, y);
      const r = this.composite();
      const w = nr === 0 ? 1 : wgt;
      ink += w * r; cov += w * this.cCov;
      if (w > bestW) { bestW = w; lab = this.labC; labS = this.labS; wk = this.cWk; wa = this.cWa; wb = this.cWb; }
    }
    if (thruK >= 0) {
      const own = T.kCa[thruK]; const r = T.kR[thruK]; const out = 1 - ss(r + W - aa, r + W + aa, thruQ);
      if (!yielded) { if (lab < 0 || lab === own) { ink = ss(r - aa, r + aa, thruQ) * out; if (lab < 0 && ink > 0) { lab = own; labS = T.kSa[thruK]; } wk = 5; wa = thruK; } }
      else if (lab === own) ink = Math.min(ink, out);
    }
    o.ink = Math.min(1, ink); o.cov = Math.min(1, cov); o.chain = lab; o.s = labS; o.winKind = wk; o.winA = wa; o.winB = wb;
    return o;
  }

  private labC = -1; private labS = 0; private cCov = 0; private cWk = 0; private cWa = -1; private cWb = 0;

  /** Surfaces of the current configuration, their keys, cover, labels, coverage and ink. */
  private layers(x: number, y: number): void {
    const T = this.T; const h = T.h; const aa = T.aa; const W = T.W;
    const kxh = T.homeOn && T.kExt !== undefined; // K1482 s28: retryForm's programs (home membership with the retry)
    let ns = 0;
    const entry = (id: number): number => {
      for (let i = 0; i < ns; i++) if (this.sid[i] === id) return i;
      const i = ns++; this.sid[i] = id; this.skey[i] = -Infinity; this.sckey[i] = -Infinity; this.scch[i] = -1; this.scs[i] = 0; this.scov[i] = 0; return i;
    };
    for (let j = 0; j < this.np; j++) {
      if (!(this.pd[j] < h + aa)) continue;
      const e = entry(this.psurf[j]);
      if (this.pkey[j] > this.skey[e]) this.skey[e] = this.pkey[j];
      if (this.pd[j] < h) { this.scov[e] = 1; if (this.pkey[j] > this.sckey[e]) { this.sckey[e] = this.pkey[j]; this.scch[e] = this.pc[j]; this.scs[e] = this.ps[j]; } }
    }
    const zt = T.zt;
    for (let i = 0; i < this.nk; i++) {
      const k = this.kk[i]; if (this.kIn[i] !== 2) continue;
      const nearerA = (x - T.kTax[k]) ** 2 + (y - T.kTay[k]) ** 2 <= (x - T.kTbx[k]) ** 2 + (y - T.kTby[k]) ** 2;
      const z = nearerA ? T.kZa[k] : T.kZb[k]; const key = z - zt;
      const e = entry(T.kG[k]);
      if (key > this.skey[e]) this.skey[e] = key;
      if (this.krho[i] > T.kR[k] && T.kExt?.[k] !== 1) { this.scov[e] = 1; if (key > this.sckey[e]) { this.sckey[e] = key; this.scch[e] = nearerA ? T.kCa[k] : T.kCb[k]; this.scs[e] = nearerA ? T.kSa[k] : T.kSb[k]; } }
    }
    this.ns = ns;
    // order by key, descending (insertion sort; ns is small)
    for (let i = 0; i < ns; i++) this.sord[i] = i;
    for (let i = 1; i < ns; i++) { const v = this.sord[i]; let m = i - 1; while (m >= 0 && this.skey[this.sord[m]] < this.skey[v]) { this.sord[m + 1] = this.sord[m]; m--; } this.sord[m + 1] = v; }
    // per surface: coverage a and ink v (max over exposed terms, the winner kept)
    const band = (D: number): number => 1 - ss(W - aa, W + aa, D);
    const band2 = (D: number): number => band(D) * ss(-aa, aa, D);
    // K1482 s32: the t84e fold rule (foldD, and the sibling burial below), in retryForm's programs only (gf_glsl.ts
    // loneFold, OFF until its program renders in the browser); env GF_S32=1 turns it on in the mirror
    this.s32 = kxh && (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GF_S32 === "1";
    for (let e = 0; e < ns; e++) {
      const S = this.sid[e]; let D = -Infinity; let v = 0; let wk = 0; let wa = -1; let wb = 0;
      for (let j = 0; j < this.np; j++) {
        if (this.psurf[j] !== S || !(this.pd[j] < h + aa)) continue;
        const X = this.pd[j]; if (h - X > D) D = h - X;
        if (!(X > h - W - aa && X > 1e-12)) continue;
        const qx = this.pfx[j] + (h * (x - this.pfx[j])) / X; const qy = this.pfy[j] + (h * (y - this.pfy[j])) / X;
        let bur = 0;
        // K1482 s27 (t4s): where q sits a shallow fold fo inside the piece's own tube (a swallowtail under 2-4 aa
        // deep), another piece m buries it only as far as m reaches past that fold: m's distance counts fo more.
        // A tube whose edge runs along the outline (an arm extension's end disc on this piece's spine) then no longer
        // nibbles the fold's points into a step and a pinhole. A deep fold (j58's) keeps the plain burial, and an
        // unfolded q (fo 0) is untouched. fo is taken only once some m reaches q (dm < h; else wb2 is exactly 0).
        let fo = -1;
        for (let m = 0; m < this.np && bur < 1; m++) {
          if (m === j || this.psurf[m] !== S) continue;
          const dm = Math.sqrt(this.pieceD(m, qx, qy)); if (!(dm < h)) continue;
          if (fo < 0) { const f0 = Math.max(0, h - Math.sqrt(this.pieceD(j, qx, qy))); fo = f0 * (1 - ss(2 * aa, 4 * aa, f0)); }
          const wb2 = 1 - ss(h - 2 * aa, h, dm + fo);
          if (wb2 > bur) bur = wb2;
        }
        // the piece's own tube elsewhere along its fold (a tight bend folded into one piece): OFF, form B never
        // buries a piece by its own fold (K1362 s1: 132 census finds were this self-burial)
        // K1482 s32 (retry programs): a piece of the same chain on another surface within arc 2 of this one (its
        // sibling across a group step) buries q by its tube, as a same-surface piece would
        if (this.s32 && bur < 1) {
          for (let m = 0; m < this.np && bur < 1; m++) {
            if (m === j || this.pc[m] !== this.pc[j] || this.psurf[m] === S) continue;
            const c = this.pc[j]; let ds = Math.abs(this.ps[m] - this.ps[j]); if (T.cClosed[c] === 1) ds = Math.min(ds, T.cLen[c] - ds);
            if (!(ds < 2)) continue;
            const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(m, qx, qy)));
            if (wb2 > bur) bur = wb2;
          }
        }
        if (SELF_BURIAL && bur < 1 && this.phi[j] - this.plo[j] > 1) {
          const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(j, qx, qy)));
          if (wb2 > bur) bur = wb2;
        }
        for (let i = 0; i < this.nk && bur < 1; i++) {
          const k = this.kk[i]; if (T.kG[k] !== S) continue;
          const rq = Math.hypot(qx - T.kCx[k], qy - T.kCy[k]);
          if (rq > T.kR[k] && rq < T.kRmax[k] && this.inSector(k, qx, qy) && this.outsideArms(k, this.pc[j], qx, qy)) bur = 1;
        }
        if (bur < 1) { const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.foldD(j, S, x, y, qx, qy))); if (wb2 > bur) bur = wb2; } // K1482 s7: a hairpin's own fold
        // K1482 s28 (with the retry): a piece outside every group (S < 0) that is heading into group B (its ramp's
        // group, or its arm's home group while too deep in z to join) inks no deeper inside B's tubes of other chains
        // than their own band (p within h - W of one): its outline meets theirs in a mitred corner instead of running
        // on over B's fill to the square end where the piece joins B (j47, t45s, j59's stub). Only against a piece m out
        // of every crossing's depth window (z 0, a junction's plane): where m dips under the piece at a crossing, the
        // piece's outline is the over-pass line and stays (t56s, |z| >= 0.024 there; the stubs' partners sit at 0).
        // m's z is read back from its key (pkey + pd zK), the one value every GPU program holds for m. K1482 s29: the
        // guard's ramp is 1e-4..1e-3 (was 0.004..0.02, which also took m at the foot of its crossing's tent: t56s's
        // corner, 1039,266 and 1040,267, where chain 56 reads |z| 0.005 under chain 28's outline); out of every window
        // m's read-back z is 0 to f32 noise (about 1e-8: pkey travels as float bits)
        if (bur < 1 && S < 0 && kxh) {
          const B = this.pg[j] >= 0 ? this.pg[j] : this.phb[j];
          for (let m = 0; m < this.np && bur < 1 && B >= 0; m++) {
            if (this.psurf[m] !== B || this.pc[m] === this.pc[j]) continue;
            let wb2 = 1 - ss(h - W - aa, h - W + aa, this.pd[m]);
            if (!(wb2 > bur)) continue;
            wb2 *= 1 - ss(1e-4, 1e-3, Math.abs(this.pkey[m] + (this.pd[m] * T.zt) / h));
            if (wb2 > bur) bur = wb2;
          }
        }
        // K1482 s34 (with the retry): the converse of s28. A group's piece on an arm rooted at its chain's open end
        // (a thread that starts in the junction) inks nowhere inside the tube of a partner left out of that group by
        // depth (mhb = the group: its home there, diving under a crossing next to the junction). j15: chain 70's start
        // turns sharply at s 0, and that corner's band ran across chain 5's paper, whose group-15 arm chain 70's own
        // pass cuts (the Z spike); chain 5 ranks under the group's key there, so nothing covered it.
        // The tables decide which arms (tables.ts arms34): j's end bit (p34 & 1, its arm of S rooted at an open end),
        // m's cutting chain (p34 >> 1, an arm of S cut at its root by another pass of j's chain, 2 or more of arc from
        // that chain's end arms in S). gf_glsl.ts homeBurial's T34, the same test.
        if (bur < 1 && S >= 0 && kxh && GfEval.S34 !== "0" && (this.p34[j] & 1) === 1) {
          for (let m = 0; m < this.np && bur < 1; m++) {
            if (this.psurf[m] === S || this.pc[m] === this.pc[j] || (this.pg[m] >= 0 ? this.pg[m] : this.phb[m]) !== S || (this.p34[m] >> 1) - 1 !== this.pc[j]) continue;
            const wb2 = 1 - ss(h - W - aa, h - W + aa, this.pd[m]);
            if (wb2 > bur) { if (wb2 - bur > 0.02 && band2(h - X) > 0.02) { this.s34n++; this.s34w = [this.pc[j], this.ps[j], this.pc[m], this.ps[m], S, this.pg[m], this.psurf[m], this.pkey[j], this.pkey[m], this.pramp[m], this.pd[m] / h, X / h]; } bur = wb2; }
          }
        }
        let val = (1 - bur) * band2(h - X);
        if (val > v && S >= 0 && kxh && GfEval.S33 !== "0") { // K1482 s33: the band ends along a long run under a lone over pass
          const tr = this.runT(S, this.pc[j], this.pkey[j] + (X * T.zt) / h, qx, qy, (qx - this.pfx[j]) / h, (qy - this.pfy[j]) / h);
          if (tr < 1) { const w = W * tr; val = (1 - bur) * (1 - ss(w - aa, w + aa, h - X)) * ss(-aa, aa, h - X) * ss(0, 2 * aa, w); }
        }
        if (val > v) { v = val; wk = this.pend[j] ? 3 : 1; wa = this.pc[j]; wb = this.ptx[j] * (y - this.pfy[j]) - this.pty[j] * (x - this.pfx[j]) >= 0 ? 1 : -1; }
      }
      for (let i = 0; i < this.nk; i++) {
        const k = this.kk[i]; if (T.kG[k] !== S || !this.kSec[i] || !(T.kR[k] > 0)) continue; // K1407 23A: no arc at r = 0
        const rho = this.krho[i]; const Dk = rho - T.kR[k];
        if (this.kIn[i] === 2 && Dk > D && T.kExt?.[k] !== 1) D = Dk; // K1482 s20: a retry corner inks only
        if (!(rho > 1e-12)) continue;
        const qx = T.kCx[k] + (T.kR[k] * (x - T.kCx[k])) / rho; const qy = T.kCy[k] + (T.kR[k] * (y - T.kCy[k])) / rho;
        const cA = T.kCa[k]; const cB = T.kCb[k]; // K1407 c1: the corner's own arms never bury its faces
        let bur = 0;
        for (let m = 0; m < this.np && bur < 1; m++) {
          if (this.psurf[m] !== S || this.pc[m] === cA || this.pc[m] === cB) continue;
          const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(m, qx, qy)));
          if (wb2 > bur) bur = wb2;
        }
        if (bur < 1) bur = Math.max(bur, this.fillBur(k, qx, qy, x, y, S));
        const val = (1 - bur) * band2(Dk); // K1407 c1: buried by other arms' tubes and other corners' fills
        if (val > v) { v = val; wk = 2; wa = k; wb = 0; }
      }
      // form B's T_TA / T_TB: a fillet's tangent points are points of the trimmed outline, so their distance
      // bounds the true one from above (never ink outside the true band); they close the wedge between a side
      // cut at the fillet and the arc's sector, which neither covers (the hairline seams of K1362 s1's census)
      if (TANGENT_TERMS) for (let i = 0; i < this.nk; i++) {
        const k = this.kk[i]; if (T.kG[k] !== S || T.kThru[k]) continue;
        const cA = T.kCa[k]; const cB = T.kCb[k]; // K1407 c1: as the arc
        for (let t = 0; t < 2; t++) {
          const tx = t ? T.kTbx[k] : T.kTax[k]; const ty = t ? T.kTby[k] : T.kTay[k];
          const dT = Math.sqrt((x - tx) * (x - tx) + (y - ty) * (y - ty)); if (!(dT < W + aa)) continue;
          let bur = 0;
          for (let m = 0; m < this.np && bur < 1; m++) {
            if (this.psurf[m] !== S || this.pc[m] === cA || this.pc[m] === cB) continue;
            const wb2 = 1 - ss(h - 2 * aa, h, Math.sqrt(this.pieceD(m, tx, ty)));
            if (wb2 > bur) bur = wb2;
          }
          if (bur < 1) bur = Math.max(bur, this.fillBur(k, tx, ty, x, y, S));
          const val = (1 - bur) * band(dT) * ss(-aa, aa, D); // K1407 c1: form B's tangent term, buried as the arc
          if (val > v) { v = val; wk = 4; wa = k; wb = t; }
        }
      }
      if (v < 1 && D > -aa) { // K1407 c3: the vertex cap (vtx); it cannot raise v elsewhere
        const vxv = this.vtx(S, x, y) * ss(-aa, aa, D);
        if (vxv > v) { v = vxv; wk = 6; wa = this.vtxA; wb = this.vtxB; }
      }
      this.sv[e] = v; this.sa[e] = ss(-aa, aa, D); this.swk[e] = wk; this.swa[e] = wa; this.swb[e] = wb;
    }
    // the label: the top covering surface's max-key covering member
    let top = -1;
    for (let i = 0; i < ns; i++) if (this.scov[i] && (top < 0 || this.sckey[i] > this.sckey[top])) top = i;
    this.labC = top >= 0 ? this.scch[top] : -1; this.labS = top >= 0 ? this.scs[top] : 0;
  }

  /** Top-down composite; one adjacent swap mixed where keys tie within zt. */
  private composite(): number {
    const ns = this.ns; const zt = this.T.zt;
    const comp = (sw: number): number => {
      let Tt = 1; let ink = 0; let best = 0;
      for (let i = 0; i < ns; i++) {
        let e = this.sord[i]; if (sw >= 0 && i === sw) e = this.sord[i + 1]; else if (sw >= 0 && i === sw + 1) e = this.sord[i - 1];
        const c = Tt * this.sv[e];
        if (c > 0) { ink += c; if (c > best && sw < 0) { best = c; this.cWk = this.swk[e]; this.cWa = this.swa[e]; this.cWb = this.swb[e]; } }
        Tt *= 1 - this.sa[e];
        if (!(Tt > 0)) break;
      }
      if (sw < 0) this.cCov = 1 - Math.max(Tt, 0);
      return Math.min(1, ink);
    };
    this.cWk = 0; this.cWa = -1; this.cWb = 0;
    let r = comp(-1);
    for (let i = 0; i + 1 < ns; i++) {
      const gap = this.skey[this.sord[i]] - this.skey[this.sord[i + 1]];
      if (!(gap < zt)) continue;
      const r2 = comp(i);
      if (r2 === r) continue;
      const t = ss(-zt, zt, gap);
      r = t * r + (1 - t) * r2;
      break;
    }
    return r;
  }
}

export { CH };
