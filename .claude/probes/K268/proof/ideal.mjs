// K268 proof stage: the census's CPU IDEAL for a shaped slot, a line-for-line
// mirror of what the explore program draws, as paint_math.ts mirrors the
// paint. Sources mirrored (keep in step with them):
//   gap_mask.ts     gapKeepAt, gapSeg / gapSegFull, gapNearestFull,
//                   gapStrength, gapInterval
//   explore_glsl.ts kExDotsSd, kExploreLook, exploreCutCover,
//                   exploreGapEdits (SURE, CUT, FAR, KEEP, SHAPE)
// One slot at a time: the census measures a slot by S (as shaped), R (the
// slot rejected: its keep 1) and F (the full solved cut, shape cleared), and
// the drawn pixel is linear in the under ribbon's keep (alpha), so the
// measured m = (S - R) / (F - R) = cutEff(S) / cutEff(F), cutEff = cut * gst
// (1 - keep for this slot alone). idealM returns that ratio and its parts.
//
// What is not exact (named, so a residual can be told from a defect):
// - the fragment's own arc fa and tangent tanv: the GPU interpolates the
//   under ribbon's per-sample aArcPos (a unit vector, decoded by atan) and
//   aTan across the strip's triangles; here they come from the pixel
//   center's nearest point on the under chain's sample polyline;
// - protect (gapProtCover) reads other chains' SAMP ranges: not mirrored;
//   a pixel where the protect interval is open reports prot = true and the
//   caller judges it apart;
// - float32 (GPU) against double (here).
export const GAP_TEX_W = 25, GAP_PROF_BASE = 22;
export const EXPLORE_DOTS_SPAN = 2.15;
export const EXPLORE_DOT_AT = [0.44, 0.88];
export const EXPLORE_DOT_R = [0.3 * (1 - 0.4 * 0.44), 0.3 * (1 - 0.4 * 0.88)];

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const kSmooth = (x) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };

// A slot's texel k as [x, y, z, w].
export const texel = (T, k) => [T[k * 4], T[k * 4 + 1], T[k * 4 + 2], T[k * 4 + 3]];

// explore_glsl.ts kExDotsSd (CPU twin: paint_math.ts kExDotsSdCpu).
export function kExDotsSd(s, la, lf, tw) {
  const g = clamp(lf / (EXPLORE_DOTS_SPAN * tw), 1e-3, 1);
  const ca = 0.5 * tw * g, cb = 0.5 * tw;
  const k0 = Math.hypot(s / ca, la / cb);
  const k1 = Math.hypot(s / (ca * ca), la / (cb * cb));
  const dCap = k1 > 1e-6 ? (k0 * (k0 - 1)) / k1 : -ca;
  const dDot = Math.min(
    Math.hypot(s - EXPLORE_DOT_AT[0] * lf, la) - EXPLORE_DOT_R[0] * tw * g,
    Math.hypot(s - EXPLORE_DOT_AT[1] * lf, la) - EXPLORE_DOT_R[1] * tw * g);
  return Math.min(dCap, dDot);
}

// explore_glsl.ts kExploreLook (U = uKExplore [mode, look, -, tw]).
export function kExploreLook(U, look, v, u, s, lf, lat, sideFw, pxW) {
  if (u < 0 || look < 2) return v;
  const tw = U[3];
  if (look === 2) return 1 - kSmooth((u - 0.4) / 0.6);
  if (look === 4) {
    const fl = lat * 2;
    let cov = 0;
    for (let i = -1; i <= 1; i++) {
      const cf = i * (0.5 + 0.3 * u) + 0.12 * u * Math.sin(s * 7 + i * 2.1);
      const wf = 0.34 + (0.1 - 0.34) * u;
      cov = Math.max(cov, clamp((wf - Math.abs(fl - cf)) / Math.max(4 * sideFw, 1e-4) + 0.5, 0, 1));
    }
    cov = 1 + (cov - 1) * kSmooth(u / 0.12);
    return cov * (1 - kSmooth((u - 0.5) / 0.5));
  }
  const dd = kExDotsSd(s, lat * tw, lf, tw);
  return clamp(-dd / pxW + 0.5, 0, 1) * (U[0] > 1.5 ? 1 : 1 - 0.55 * u * u);
}

// explore_glsl.ts exploreCutCover: { cover, cutOn, cutSd }.
export function exploreCutCover(U, T, fl, A, lat, pxW) {
  const out = { cover: 1, cutOn: false, cutSd: 0 };
  const look = Math.round(U[1]);
  const dots = look === 3 || look === 5;
  const mx = (fl & 16) !== 0;
  let best = mx ? -1 : 2, bu = -1, bs = 0, bf = 0;
  for (let r = 0; r < 2; r++) {
    if ((fl & (1 << r)) === 0) continue;
    const R = texel(T, GAP_PROF_BASE + r);
    const d = (A - R[0]) / R[1];
    let v = 1, u = -1;
    if (d > 0) {
      let t = d < R[2] ? d * (R[3] / R[2]) : R[3] + (d - R[2]) * ((1 - R[3]) / Math.max(1 - R[2], 1e-6));
      t = Math.min(t, 1);
      v = 1 - t * t * (3 - 2 * t);
      if ((t < 1 || dots) && (fl & (4 << r)) !== 0) u = t;
    }
    if (mx ? v > best || (v === best && u < 0) : v < best) {
      best = v; bu = u; bs = Math.abs(A - R[0]); bf = Math.abs(R[1]);
    }
  }
  if (best > 1) return out;
  if (best < 0) { out.cover = 0; return out; }
  if (dots && bu >= 0) {
    out.cutOn = true;
    out.cutSd = kExDotsSd(bs, lat, bf, U[3]);
    out.cover = U[0] > 1.5 ? 1 : 1 - 0.55 * bu * bu;
    return out;
  }
  out.cover = kExploreLook(U, look, best, bu, bs, bf, 0, pxW / Math.max(U[3], 1e-6), pxW);
  return out;
}

// gap_mask.ts gapStrength (the FX clock stopped or long past: a gated slot
// reads 1; the census never runs a gate).
export const gapStrength = (s) => (s >= 0 ? s : 1);
const gapInterval = (o, a, b) => (a >= b ? 0 : clamp(Math.min(o - a, b - o) / 0.04 + 0.5, 0, 1));

// The explore edits' far-branch geometric cut (exCutAtDist).
function exCutAtDist(dv, hOv, marg, fadePv, pxWv, winMv, fadeRaw, inWF) {
  const e = dv - hOv - marg;
  const k = kSmooth((e + 0.5 * pxWv) / Math.max(fadePv, pxWv));
  let fs = clamp(winMv / Math.max(0.5 * fadeRaw, pxWv), 0, 1);
  fs = 1 + (kSmooth(fs) - 1) * clamp(e / pxWv, 0, 1);
  return (1 - k) * inWF * fs;
}

// Nearest segment of the slot's over range to p (gapNearestFull with the
// prunings off: they never change the answer, gap_mask.ts's brute pin):
// segment k of the range runs over.pt(k) -> over.pt(k + 1). Returns
// [best, bk] with best the squared distance (from best0, bk -1 if none).
function nearest(sm, p, ex, fa, s0, st, per, skipLo, skipHi, best0) {
  const n = sm.n;
  let best = best0, bk = -1;
  for (let k = 0; k < n - 1; k++) {
    if (k >= skipLo && k <= skipHi) continue;
    const a = sm.pt(k), b = sm.pt(k + 1);
    const abx = b[0] - a[0], aby = b[1] - a[1], pax = p[0] - a[0], pay = p[1] - a[1];
    const l2 = abx * abx + aby * aby;
    const h = l2 > 1e-12 ? clamp((pax * abx + pay * aby) / l2, 0, 1) : 0;
    if (ex > 0) {
      let da = s0 + (k + h) * st - fa;
      if (per > 0) da -= per * Math.floor(da / per + 0.5);
      if (Math.abs(da) < ex) continue;
    }
    const qx = pax - abx * h, qy = pay - aby * h, d2 = qx * qx + qy * qy;
    if (d2 < best) { best = d2; bk = k; }
  }
  return [best, bk];
}

// gapKeepAt for ONE ribbon slot (full, not a fan) at world point p, with the
// fragment's arc turn already decoded (fa = turn * t1.x) and its tangent
// tanv. shaped = whether the slot carries the SHAPED flag (S) or not (F).
// Returns { cut, gst, eff: cut * gst (this slot's 1 - keep), ... }.
export function slotCut(sm, p, fa, tanv, pxW, shaped) {
  const T = sm.T, U = sm.U;
  const res = { cut: 0, gst: 0, eff: 0, why: "" };
  const t0 = texel(T, 0), t1 = texel(T, 1), t2 = texel(T, 2);
  const rr = t0[2] + 2 * pxW;
  const dbx = p[0] - t0[0], dby = p[1] - t0[1];
  if (rr <= 0 || dbx * dbx + dby * dby > rr * rr) { res.why = "reject"; return res; }
  const hO = t2[2];
  let gst = gapStrength(t1[3]);
  let off = fa - t1[1];
  if (t1[2] > 0) off -= t1[2] * Math.floor(off / t1[2] + 0.5);
  const offA = off;
  const m = Math.min(off + t2[0], t2[1] - off);
  if (m <= -pxW) { res.why = "window"; return res; }
  const inWin = clamp(m / pxW + 0.5, 0, 1), inFoot = 1, winM = m;
  const t3 = texel(T, 3);
  const fl = Math.round(t3[3]);
  const perp = (fl & 1) !== 0;
  const n = Math.round(t2[3]);
  const t4 = texel(T, 4), t9 = texel(T, 9);
  let ex = 0, s0 = 0, st = 0, per = 0;
  if ((fl & 2) !== 0) {
    ex = t4[0];
    s0 = Math.floor(t4[2] + 0.5) * t4[3];
    st = Math.max(Math.round(t9[0]), 1) * t4[3];
    per = t1[2];
  }
  const reach = hO + (t0[2] - t0[3]) + 2 * pxW;
  const tol = Math.max(pxW, t4[3]);
  const sure = hO - 1.0 * tol;
  let sure2 = sure > 0 ? sure * sure : 0;
  // EXPLORE_GAP_SURE_GLSL
  const exShaped = shaped && (fl & 4) !== 0 && U[0] > 0.5;
  let exFarOn = false;
  if (exShaped) sure2 = 0;
  if (n <= 1) { res.why = "n<=1 (not mirrored)"; res.unmirrored = true; return res; }
  let [best, bk] = nearest(sm, p, ex, fa, s0, st, per, 0, -1, reach * reach);
  if (bk < 0) { res.why = "reach"; return res; }
  // EXPLORE_GAP_CUT_GLSL
  let cutOn = false, cutSd = 0, exCoverNear = 1, exStrength = 1, exP2 = null;
  if (exShaped) {
    const exP0 = sm.pt(bk), exP1 = sm.pt(bk + 1);
    const abx = exP1[0] - exP0[0], aby = exP1[1] - exP0[1];
    const bl = abx * abx + aby * aby;
    const bt = bl > 1e-12 ? clamp(((p[0] - exP0[0]) * abx + (p[1] - exP0[1]) * aby) / bl, 0, 1) : 0;
    const exA = (t4[2] + (bk + bt) * t9[0]) * t4[3];
    exP2 = texel(T, GAP_PROF_BASE + 2);
    const cc = exploreCutCover(U, T, Math.round(exP2[1]), exA, Math.sqrt(best), pxW);
    exCoverNear = cc.cover; cutOn = cc.cutOn; cutSd = cc.cutSd;
    exStrength = gapStrength(exP2[0]);
    gst = exStrength * exCoverNear;
    res.A = exA; res.cover = exCoverNear;
    if (gst <= 0) { res.why = "cover0"; res.gst = gst; return res; }
  }
  if (best < sure2) {
    res.cut = inWin * inFoot; res.gst = gst; res.eff = res.cut * gst; res.why = "sure";
    return res;
  }
  // PROTECT: the interval only (gapProtCover not mirrored, see the header).
  const t7 = texel(T, 7);
  const pn = gapInterval(offA, t7[0], t7[1]), pp = gapInterval(offA, t7[2], t7[3]);
  if (pn > 0 || pp > 0) res.prot = true;
  const pr = 0;
  const t5 = texel(T, 5), t6 = texel(T, 6), t8 = texel(T, 8);
  let to = [1, 0];
  const needTan = !perp || t8[1] > 0;
  let tu = [t6[0], t6[1]];
  if (n >= 2 && needTan) {
    const tl = Math.hypot(tanv[0], tanv[1]);
    if (tl > 1e-3) tu = [tanv[0] / tl, tanv[1] / tl];
    const pm = sm.pt(bk - 1), p0 = sm.pt(bk), p1 = sm.pt(bk + 1), pq = sm.pt(bk + 2);
    const abx = p1[0] - p0[0], aby = p1[1] - p0[1];
    const blk = abx * abx + aby * aby;
    const bt = blk > 1e-12 ? clamp(((p[0] - p0[0]) * abx + (p[1] - p0[1]) * aby) / blk, 0, 1) : 0;
    let ta = [p1[0] - pm[0], p1[1] - pm[1]], tb = [pq[0] - p0[0], pq[1] - p0[1]];
    const la = Math.max(Math.hypot(ta[0], ta[1]), 1e-6), lb = Math.max(Math.hypot(tb[0], tb[1]), 1e-6);
    ta = [ta[0] / la, ta[1] / la]; tb = [tb[0] / lb, tb[1] / lb];
    to = [ta[0] + (tb[0] - ta[0]) * bt, ta[1] + (tb[1] - ta[1]) * bt];
    const lo = Math.max(Math.hypot(to[0], to[1]), 1e-6);
    to = [to[0] / lo, to[1] / lo];
  }
  let d = Math.sqrt(best);
  const sinT = n >= 2 && needTan ? Math.abs(tu[0] * to[1] - tu[1] * to[0]) : 1;
  const posSide = offA >= 0;
  let margin = (perp ? t8[0] : t8[0] * sinT) * (posSide ? t6[3] : t6[2]);
  let fadeP = t8[1] * (perp ? Math.max(sinT, 0.2) : sinT) * (posSide ? t5[1] : t5[0]);
  margin *= 1 - pr;
  fadeP *= 1 - pr;
  const sk = t8[2];
  let exBlendCut = 0;
  if (n >= 2 && sk > 0) {
    const lo = hO + margin - 0.5 * pxW;
    const hi = hO + margin + Math.max(fadeP, pxW) + 0.25 * sk;
    if (d > lo && d < hi) {
      const farK = Math.round(t8[3]);
      const [best2, bk2] = nearest(sm, p, ex, fa, s0, st, per, bk - farK, bk + farK, (d + sk) * (d + sk));
      if (bk2 >= 0) {
        res.far = true;
        const d2 = Math.sqrt(best2);
        const hb = clamp(0.5 + 0.5 * (d2 - d) / sk, 0, 1);
        const dS = d2 + (d - d2) * hb - sk * hb * (1 - hb);
        // EXPLORE_FAR_GLSL
        if (exShaped && !cutOn) {
          const F0 = sm.pt(bk2), F1 = sm.pt(bk2 + 1);
          const abx = F1[0] - F0[0], aby = F1[1] - F0[1];
          const bl = abx * abx + aby * aby;
          const fbt = bl > 1e-12 ? clamp(((p[0] - F0[0]) * abx + (p[1] - F0[1]) * aby) / bl, 0, 1) : 0;
          const exA2 = (t4[2] + (bk2 + fbt) * t9[0]) * t4[3];
          // As drawn since the far-flag fix (2026-11-10): the far branch's
          // cover reads the PROFILE's flags (texel P2.y), as the near call.
          // farFlags "slot" models the slip before it (fl, texel 3.w).
          const exCoverFar = exploreCutCover(U, T, sm.farFlags === "slot" ? fl : Math.round(exP2[1]), exA2, d2, pxW).cover;
          const gN = exCutAtDist(d, hO, margin, fadeP, pxW, winM, t8[1], inWin * inFoot);
          const gF = exCutAtDist(d2, hO, margin, fadeP, pxW, winM, t8[1], inWin * inFoot);
          const gS = exCutAtDist(dS, hO, margin, fadeP, pxW, winM, t8[1], inWin * inFoot);
          exBlendCut = Math.max(exCoverNear * gN, exCoverFar * gF) + Math.min(exCoverNear, exCoverFar) * (gS - Math.max(gN, gF));
          exFarOn = true;
        } else {
          d = dS;
        }
      }
    }
  }
  // EXPLORE_GAP_SHAPE_GLSL
  if (exShaped && cutOn) d = hO + cutSd;
  const e = d - hO - margin;
  const k = kSmooth((e + 0.5 * pxW) / Math.max(fadeP, pxW));
  let fs = clamp(winM / Math.max(0.5 * t8[1], pxW), 0, 1);
  fs = 1 + (kSmooth(fs) - 1) * clamp(e / pxW, 0, 1);
  let cut = (1 - k) * inWin * inFoot * fs;
  // EXPLORE_KEEP_GLSL
  if (exFarOn) { cut = exBlendCut; gst = exStrength; }
  res.cut = cut; res.gst = gst; res.eff = cut * gst; res.why = "casing";
  res.e = e; res.margin = margin; res.cutOn = cutOn;
  return res;
}

// The fragment's arc and tangent from the under chain: the pixel center's
// nearest point on the under sample polyline, restricted to the slot's
// window (centerArc +- the window and a thread width), so another pass of
// the same chain is never taken. Returns [fa, tanv] or null.
export function underAt(sm, p) {
  const u = sm.under, T = sm.T;
  const t1 = texel(T, 1), t2 = texel(T, 2);
  const cnt = u.count, closed = u.closed;
  const nSeg = closed ? cnt : cnt - 1;
  const per = u.totalLength / (closed ? cnt : cnt - 1);
  const span = Math.max(Math.abs(t2[0]), Math.abs(t2[1])) + 4 * sm.U[3];
  let best = Infinity, bk = -1, bh = 0;
  for (let k = 0; k < nSeg; k++) {
    let da = k * per - t1[1];
    if (closed) da -= u.totalLength * Math.floor(da / u.totalLength + 0.5);
    if (Math.abs(da) > span + per) continue;
    const k1 = closed ? (k + 1) % cnt : k + 1;
    const ax = u.positions[2 * k], ay = u.positions[2 * k + 1];
    const abx = u.positions[2 * k1] - ax, aby = u.positions[2 * k1 + 1] - ay;
    const l2 = abx * abx + aby * aby;
    const h = l2 > 1e-12 ? clamp(((p[0] - ax) * abx + (p[1] - ay) * aby) / l2, 0, 1) : 0;
    const qx = ax + abx * h - p[0], qy = ay + aby * h - p[1], d2 = qx * qx + qy * qy;
    if (d2 < best) { best = d2; bk = k; bh = h; }
  }
  if (bk < 0) return null;
  const k1 = closed ? (bk + 1) % cnt : bk + 1;
  let fa = (bk + bh) * per;
  if (!closed) fa = (fa / u.totalLength) * 0.45 * (u.totalLength / 0.45);
  const tx = u.tangents[2 * bk] + (u.tangents[2 * k1] - u.tangents[2 * bk]) * bh;
  const ty = u.tangents[2 * bk + 1] + (u.tangents[2 * k1 + 1] - u.tangents[2 * bk + 1]) * bh;
  return [fa, [tx, ty], Math.sqrt(best)];
}

// A slot model from the census's dump: T (the row's 25 texels, 100
// floats), overPts (points j = -1 .. n of the range, flat), under (the
// under chain's samples), U (uKExplore).
export function slotModel(dump) {
  const n = Math.round(dump.T[2 * 4 + 3]);
  const P = dump.overPts;
  const pt = (j) => { const q = clamp(j, -1, n) + 1; return [P[2 * q], P[2 * q + 1]]; };
  return { T: dump.T, U: dump.U, n, pt, under: dump.under, farFlags: dump.farFlags || "profile" };
}

// The ideal measured ratio at world point p: S's effective cut over F's.
// null where F does not cut (the census skips those pixels: F - R small).
// smF: F's model (its row as setSlot(c, 1) leaves it, judge.mjs rowF);
// defaults to sm.
export function idealM(sm, p, pxW, smF = sm) {
  const ua = underAt(sm, p);
  if (!ua) return { m: null, why: "no under" };
  const [fa, tanv] = ua;
  const S = slotCut(sm, p, fa, tanv, pxW, true);
  const F = slotCut(smF, p, fa, tanv, pxW, false);
  const m = F.eff > 1e-6 ? Math.min(1, S.eff / F.eff) : null;
  return { m, S, F, fa, prot: !!(S.prot || F.prot), far: !!(S.far || F.far) };
}
