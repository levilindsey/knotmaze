// K1040 S4a: the band pass's shaders - form B's term 1, the foot, per pixel.
//
// One instanced strip per (segment, side), two per segment (band_b.ts). The
// strip covers the band's annulus [h - W - aa, h + aa] on its side of the
// segment, the convex wedge at its start vertex (which owns it, as geom.ts
// candidates() has it) and an open end's cap. Each fragment evaluates
// form_b.ts inkOf's foot term for the candidate X its segment owns:
//   - X: the foot on segment k when candidates() takes it (the label's rule);
//     no ink unless h - W - aa < d_X < h + aa.
//   - D1's merge (pieces()): this chain's candidates within R over NB2's
//     window, sorted by d, merged greedily within sigma; X kept is A (beta
//     1), X dropped into A weighs mergeW's beta (the barrier walk included).
//   - D2's fold: A's selfW from the nearer kept pieces of its chain within
//     2 sigma.
//   - Its surface: member(chain, s_A) (the arms, the F10 rule) and the span
//     code; the label L read at the pixel (d < h) or just inside A's outline
//     (d >= h) says whether A's surface is on top there: the same code, and
//     for an own surface the same chain within sigma of s_A; paper passes.
//   - The burial: over the group's arm windows (GW), each window's nearest
//     segment is its burier B (form B's piece), except A's own stretch
//     (|ds| <= sigma) and with the fold's weight on its chain; B buries A's
//     outline at min(ramp_A, ramp_B) winW(f) with winW over the +-3 segments
//     around B (K1040 S4a2): the cap-mix's weight for one burier.
//   - v = (1 - bur) selfW_A beta band2(h - d_X), written with MAX blending, so
//     the pixel keeps form B's max over its foot terms.
// Not here (S4b): the corner terms (V, t_a, t_b, the arc, omega), the fill
// burial and F9's same-chain corner rule, ties (D4), the outer edge's
// composite under a top surface's AA ((1 - a_top) v_below; MAX instead), the
// exact cap-mix for several buriers.

import { TEX_W } from "./label_b";
import { CRN_TEXELS } from "./band_b";

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
#define TEX_W ${TEX_W}
uniform sampler2D uPts;
uniform sampler2D uChain;
uniform sampler2D uSpan;
uniform sampler2D uNb2;
uniform sampler2D uArm;
uniform sampler2D uCarm;
uniform sampler2D uAix;
uniform sampler2D uGrp;
uniform sampler2D uGw;
uniform usampler2D uLabel;
uniform vec4 uM0;
uniform vec2 uM1;
uniform vec4 uI0;
uniform vec2 uI1;
uniform vec2 uView;
uniform float uH;
uniform float uW;
uniform float uAa;
uniform float uSig;
uniform float uLam;
uniform float uDel;
uniform float uR;
uniform float uPad;
uniform float uInvK;
uniform sampler2D uCrn;
uniform float uCell;
uniform float uZt;
#define CRN_TEXELS ${CRN_TEXELS}
vec4 fetch(sampler2D t, int i) {
  return texelFetch(t, ivec2(i % TEX_W, i / TEX_W), 0);
}
vec4 toClip(vec2 p) {
  vec2 dev = vec2(uM0.x * p.x + uM0.z * p.y + uM1.x, uM0.y * p.x + uM0.w * p.y + uM1.y);
  return vec4(dev.x / uView.x * 2.0 - 1.0, 1.0 - dev.y / uView.y * 2.0, 0.5, 1.0);
}
float segT(vec2 p, vec2 a, vec2 b) {
  vec2 d = b - a;
  float l2 = dot(d, d);
  return l2 > 0.0 ? dot(p - a, d) / l2 : 0.0;
}
`;

const VS = `${HEAD}
in vec3 aInst;
flat out ivec3 vInst;
void main() {
  int ci = int(aInst.x);
  int k = int(aInst.y);
  float side = aInst.z;
  vec4 c0 = fetch(uChain, 2 * ci);
  int off = int(c0.x);
  int n = int(c0.y);
  int nseg = int(c0.z);
  bool closed = c0.w > 0.5;
  int kb = (k + 1 == n) ? 0 : k + 1;
  vec2 a = fetch(uPts, off + k).xy;
  vec2 b = fetch(uPts, off + kb).xy;
  vec2 dv = b - a;
  float l = length(dv);
  float ro = uH + uAa + uPad;
  float lo = max(0.0, uH - uW - uAa - uPad);
  float e0 = uPad;
  float e1 = uPad;
  vec2 u = vec2(1.0, 0.0);
  if (l > 0.0) {
    u = dv / l;
    if (!closed && k == 0) {
      e0 = ro;
      lo = 0.0;
    } else {
      vec2 pv = a - fetch(uPts, off + (k > 0 ? k - 1 : nseg - 1)).xy;
      float lp = length(pv);
      if (lp > 0.0) {
        vec2 up = pv / lp;
        float cr = up.x * u.y - up.y * u.x;
        // The convex side owns the vertex's wedge: it reaches back ro sin(phi)
        // and in to lo cos(phi) for a turn phi below 90 degrees.
        if (side * cr < 0.0) {
          float c = dot(up, u);
          if (c >= 0.0) {
            e0 = ro * abs(cr) + uPad;
            lo = lo * c - uPad;
          } else {
            e0 = ro;
            lo = -ro;
          }
        } else if (side * cr > 0.0) {
          // K1040 S4a2: the concave side's wedge too. A vertex foot's rim
          // points sit behind the start by up to (h + aa) tan(phi/2)
          // (form B inEdgeStrip's mitre at both ends); with e0 = pad they
          // fell between this strip and the previous one, whose end has
          // no extension (g41_user_tw64 chain 1 k131, a dead end's rim).
          // candOn still owns the foot, so the wider quad writes once.
          float c = dot(up, u);
          float tn = c > -1.0 ? min(abs(cr) / (1.0 + c), 5.6713) : 5.6713;
          e0 = ro * tn + uPad;
        }
      } else {
        e0 = ro;
        lo = -ro;
      }
    }
    if (!closed && k + 1 == nseg) {
      e1 = ro;
      lo = min(lo, 0.0);
    }
  } else {
    e0 = ro;
    e1 = ro;
    lo = -ro;
  }
  vec2 nr = vec2(-u.y, u.x) * side;
  float sx = float(gl_VertexID & 1);
  float sy = float(gl_VertexID >> 1);
  gl_Position = toClip(a + u * mix(-e0, l + e1, sx) + nr * mix(lo, ro, sy));
  vInst = ivec3(ci, k, int(side));
}
`;

// The fragment helpers both programs share (the foot's and the corners').
const LIB = `
vec2 worldAt() {
  vec2 dev = vec2(gl_FragCoord.x, uView.y - gl_FragCoord.y);
  return vec2(uI0.x * dev.x + uI0.z * dev.y + uI1.x, uI0.y * dev.x + uI0.w * dev.y + uI1.y);
}
float ss(float e0, float e1, float x) {
  float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
float band2(float D) {
  return (1.0 - ss(uW - uAa, uW + uAa, D)) * ss(-uAa, uAa, D);
}
// One lap's wrap of b - a on a closed chain (K299's rule).
float dS(float a, float b, bool closed, float len) {
  float d = b - a;
  if (closed) d -= d > 0.5 * len ? len : d < -0.5 * len ? -len : 0.0;
  return d;
}
// s and the root a0.y both lie in [s0, s0 + len) on a closed chain, so d is
// within one lap and one exact step wraps it (no rounded quotient, K299).
float armDist(vec4 a0, float s, bool closed, float len) {
  float d = (s - a0.y) * a0.z;
  if (closed && d < 0.0) d += len;
  return d;
}
// The foot on segment j when geom.ts candidates() takes it (-1 otherwise).
float candOn(vec2 p, int off, int n, int nseg, bool closed, vec4 c1, int j, out float s, out vec2 f, out float zz) {
  int jb = (j + 1 == n) ? 0 : j + 1;
  vec4 A = fetch(uPts, off + j);
  vec4 B = fetch(uPts, off + jb);
  float tr = segT(p, A.xy, B.xy);
  s = 0.0;
  f = vec2(0.0);
  zz = 0.0;
  if (tr <= 0.0) {
    if (closed || j > 0) {
      int jp = j > 0 ? j - 1 : nseg - 1;
      if (segT(p, fetch(uPts, off + jp).xy, A.xy) < 1.0) return -1.0;
    }
  } else if (tr >= 1.0) {
    if (closed || j + 1 < nseg) return -1.0;
  }
  float t = clamp(tr, 0.0, 1.0);
  f = mix(A.xy, B.xy, t);
  zz = mix(A.w, B.w, t);
  float sb = jb == 0 ? c1.x + c1.y : B.z;
  s = A.z + t * (sb - A.z);
  if (closed && s >= c1.x + c1.y) s -= c1.y;
  return distance(p, f);
}
// form B member(chain, s): the group and cap ramp, with F10's root-side
// twin (band_b.ts's ARM table; label_b.ts surfCode's rule at full weight).
// K1040 S4a2: the burial reads the burier's ramp from here, not from the
// window arm's own ss - at a through's root the twin can hold a piece at
// ramp 0 while its window arm reads 1 (g41_user_tw64 chain 24 at s 4.28),
// and the old read buried the group's rim dead there.
float memberRamp(int chain, float s, bool closedC, float lenC, out int gOut) {
  vec4 ca2 = fetch(uCarm, chain);
  int ao2 = int(ca2.x);
  int an2 = int(ca2.y);
  int gg = -1;
  float rr = 0.0;
  for (int i = 0; i < 64; i++) {
    if (i >= an2) break;
    int ai = int(fetch(uAix, ao2 + i).x);
    vec4 a0 = fetch(uArm, 2 * ai);
    float lc = fetch(uArm, 2 * ai + 1).x;
    float d = armDist(a0, s, closedC, lenC);
    if (d < -1e-12 || d > a0.w + 1e-12) continue;
    float rp = lc >= 1e29 ? 1.0 : ss(lc, lc - uLam, d);
    if (gg < 0 || rp > rr) {
      gg = int(a0.x);
      rr = rp;
    }
  }
  if (gg >= 0 && rr > 0.0) {
    for (int i = 0; i < 64; i++) {
      if (i >= an2) break;
      int ai = int(fetch(uAix, ao2 + i).x);
      vec4 a0 = fetch(uArm, 2 * ai);
      float lc = fetch(uArm, 2 * ai + 1).x;
      if (int(a0.x) != gg || lc >= 1e29) continue;
      float d = armDist(a0, s, closedC, lenC);
      if (closedC && d > lenC / 2.0) d -= lenC;
      if (!(d < 1e-12 && d > lc - uLam)) continue;
      rr = min(rr, ss(lc, lc - uLam, d));
    }
  }
  gOut = gg;
  return gg < 0 ? 1.0 : rr;
}// Whether label word wd names A's surface (its code; an own surface: chain
// ci within sigma of s_A, plus the word's s step).
bool names(uint wd, int code, int ci, float sA, bool closed, float len, float s0) {
  if (int((wd >> 19) & 255u) != code) return false;
  if (code != 0) return true;
  if (int(wd & 255u) - 1 != ci) return false;
  float ws = s0 + float((wd >> 8) & 2047u) / 2047.0 * len;
  return abs(dS(ws, sA, closed, len)) <= uSig + len / 2047.0;
}
// The distance from p to the label's top T: its naming chain's centreline
// within sigma (plus the word's s step) of the word's s, A's own stretch
// skipped. K1040 S4a2 (R2): a group's surface takes the same walk - the
// word names one member piece, and away from corners that member is the
// group's nearest (the members separate past the junction), so its chain's
// distance is the surface's. -1 only for a fill (S4b's corners), whose
// alpha is a max over pieces this does not see.
float topDistZ(uint wd, vec2 p, int ci, float sA, out float zOut) {
  zOut = 0.0;
  if (((wd >> 27) & 1u) != 0u) return -1.0;
  int c = int(wd & 255u) - 1;
  vec4 d0 = fetch(uChain, 2 * c);
  vec4 d1 = fetch(uChain, 2 * c + 1);
  int off = int(d0.x);
  int n = int(d0.y);
  int nseg = int(d0.z);
  bool cl = d0.w > 0.5;
  float s0 = d1.x;
  float len = d1.y;
  float ws = s0 + float((wd >> 8) & 2047u) / 2047.0 * len;
  float w = uSig + len / 2047.0;
  float a = ws - w;
  // ws is in [s0, s0 + len] and w is far under a lap, so one exact step
  // wraps a closed chain's start (no rounded quotient, K299); a window
  // wider than the lap stays below s0 and the walk starts at point 0.
  if (cl) a += a < s0 ? len : 0.0;
  else a = max(a, s0);
  int lo = 0;
  int hi = n - 1;
  for (int it = 0; it < 32; it++) {
    if (lo >= hi) break;
    int mid = (lo + hi + 1) / 2;
    if (fetch(uPts, off + mid).z <= a) lo = mid;
    else hi = mid - 1;
  }
  float best = 1e30;
  int j = lo;
  float run = 0.0;
  vec4 Pa = fetch(uPts, off + j);
  for (int q = 0; q < 512; q++) {
    if (j >= nseg) break;
    int jb = (j + 1 == n) ? 0 : j + 1;
    vec4 Pb = fetch(uPts, off + jb);
    if (c != ci || abs(dS(Pa.z, sA, cl, len)) > uSig) {
      float t = clamp(segT(p, Pa.xy, Pb.xy), 0.0, 1.0);
      float dd = distance(p, mix(Pa.xy, Pb.xy, t));
      if (dd < best) { best = dd; zOut = mix(Pa.w, Pb.w, t); }
    }
    run += distance(Pa.xy, Pb.xy);
    if (run > 2.0 * w) break;
    Pa = Pb;
    j = jb;
    if (!cl && j == 0) break;
  }
  return best;
}
float topDist(uint wd, vec2 p, int ci, float sA) { float z; return topDistZ(wd, p, ci, sA, z); }
// K1040 S4c: the D4 tie blend of the two composite orders. ordT is T over A,
// ordA is A over T; the order form B sorts first (by cone key) wins by
// t = ss(-zt, zt, |keyT - keyA|), the swapped order by 1 - t.
float tieBlend(float ordT, float ordA, float keyT, float keyA, bool hasKey) {
  if (!hasKey || !(uZt > 0.0)) return ordT;
  float gap = abs(keyT - keyA);
  if (!(gap < uZt)) return keyT >= keyA ? ordT : ordA;
  float t = ss(-uZt, uZt, gap);
  return keyT >= keyA ? t * ordT + (1.0 - t) * ordA : t * ordA + (1.0 - t) * ordT;
}
float band(float D) {
  return 1.0 - ss(uW - uAa, uW + uAa, D);
}
// K1040 S4b: form B inWedge - p inside the wedge from q between t_a and t_b.
bool inWedgeC(vec2 q, vec4 t, vec2 x) {
  vec2 ra = t.xy - q;
  vec2 rb = t.zw - q;
  vec2 w = x - q;
  float sg = ra.x * rb.y - ra.y * rb.x;
  if (sg == 0.0) return false;
  return (ra.x * w.y - ra.y * w.x) * sg >= 0.0 && (w.x * rb.y - w.y * rb.x) * sg >= 0.0;
}
// K1040 S4b: FormB.footArm over an arm's window w = (sLo, sHi, k0, cnt)
// (label_b_glsl.ts footWin, the label's fill test).
float footWin(vec2 p, int ci, vec4 w) {
  vec4 c0 = fetch(uChain, 2 * ci);
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  int off = int(c0.x);
  int n = int(c0.y);
  int nseg = int(c0.z);
  int cnt = int(w.w);
  int k = int(w.z);
  float shift = 0.0;
  float best = 1e30;
  for (int i = 0; i < 4096; i++) {
    if (i >= cnt) break;
    int kb = (k + 1 == n) ? 0 : k + 1;
    vec4 A = fetch(uPts, off + k);
    vec4 B = fetch(uPts, off + kb);
    float sa = A.z + shift;
    float sb = (kb == 0 ? c1.x + c1.y : B.z) + shift;
    float l = sb - sa;
    if (!(l > 0.0)) l = 1.0;
    float a = max(w.x, sa);
    float b = min(w.y, sb);
    if (b >= a) {
      vec2 pa = mix(A.xy, B.xy, (a - sa) / l);
      vec2 pb = mix(A.xy, B.xy, (b - sa) / l);
      float t = clamp(segT(p, pa, pb), 0.0, 1.0);
      best = min(best, distance(p, mix(pa, pb, t)));
    }
    k++;
    if (k == nseg) {
      k = 0;
      shift += c1.y;
    }
  }
  return best;
}
// K1040 S4b: is the piece at (ci, s) on arm ai (form B onArm)?
bool onArmC(int ai, int chain, int ci, float s, bool closed, float len) {
  if (chain != ci) return false;
  vec4 a0 = fetch(uArm, 2 * ai);
  float d = armDist(a0, s, closed, len);
  return d >= -1e-12 && d <= a0.w + 1e-12;
}
// K1040 S4b: form B's corner rules in the foot (inkOf's foot()), for X on
// chain ci at s with outline point f, A's group g: F9's same-chain corner
// burial and the fill's burial at omega, over the corners form B's
// cornersNear(p) lists; arc gets the partial fill's arc share.
float cornerBurial(int g, vec2 p, vec2 f, int ci, float s, bool closed, float len, out float arc) {
  arc = 0.0;
  float bur = 0.0;
  vec4 gr = fetch(uGrp, g);
  int co = int(gr.z);
  int cn = int(gr.w);
  vec2 cell = floor(p / uCell);
  for (int i = 0; i < 1024; i++) {
    if (i >= cn) break;
    int o = CRN_TEXELS * (co + i);
    vec4 c6 = fetch(uCrn, o + 6);
    if (cell.x < c6.x || cell.x > c6.y || cell.y < c6.z || cell.y > c6.w) continue;
    vec4 c0 = fetch(uCrn, o);
    vec4 c2 = fetch(uCrn, o + 2);
    vec4 c3 = fetch(uCrn, o + 3);
    int chA = int(c3.z);
    int chB = int(c3.w);
    bool onA = onArmC(int(c3.x), chA, ci, s, closed, len);
    bool onB = onArmC(int(c3.y), chB, ci, s, closed, len);
    if (chA == ci && chB == ci && (onA || onB)) {
      // F9: the other arm's tube, from the arm.
      float dO = onA ? footWin(f, chB, fetch(uCrn, o + 5)) : footWin(f, chA, fetch(uCrn, o + 4));
      bur = max(bur, 1.0 - ss(uH - 2.0 * uAa, uH, dO));
    }
    float om = c2.z;
    if (!(c0.z > 0.0 && om > 0.0)) continue;
    float dq = distance(f, c0.xy);
    if (!(dq > c0.z) || dq > c2.w) continue;
    if (!inWedgeC(c0.xy, fetch(uCrn, o + 1), f)) continue;
    float lim = uH - 2.0 * uAa;
    if (!onA && footWin(f, chA, fetch(uCrn, o + 4)) < lim) continue;
    if (!onB && footWin(f, chB, fetch(uCrn, o + 5)) < lim) continue;
    bur = max(bur, om);
    if (om < 1.0) arc = max(arc, om * band2(distance(p, c0.xy) - c0.z));
  }
  return bur;
}
// K1040 S4c: the fold weight (form B pieces(): D2) of the piece at segment
// bs of chain bj, at (bsS, bsD): a nearer kept piece of the same chain
// within 2 sigma (a local minimum of the segment distances along the walk
// from bs) fades it by ss(sigma, 2 sigma, ds).
float segDpS(vec2 p, int off, int n, vec4 c1v, bool cl, int j, out float sOut) {
  int jb = (j + 1 == n) ? 0 : j + 1;
  vec4 A = fetch(uPts, off + j);
  vec4 B = fetch(uPts, off + jb);
  float tt = clamp(segT(p, A.xy, B.xy), 0.0, 1.0);
  float sb = jb == 0 ? c1v.x + c1v.y : B.z;
  sOut = A.z + tt * (sb - A.z);
  if (cl && sOut >= c1v.x + c1v.y) sOut -= c1v.y;
  return distance(p, mix(A.xy, B.xy, tt));
}
float foldSelfW(vec2 p, int bj, int bs, float bsS, float bsD) {
  vec4 b0 = fetch(uChain, 2 * bj);
  vec4 b1 = fetch(uChain, 2 * bj + 1);
  int off = int(b0.x);
  int n = int(b0.y);
  int nseg = int(b0.z);
  bool cl = b0.w > 0.5;
  float len = b1.y;
  float sw = 1.0;
  for (int dir = 0; dir < 2; dir++) {
    int j = bs;
    float acc = 0.0;
    float dummy;
    float prev = segDpS(p, off, n, b1, cl, j, dummy);
    for (int step = 0; step < 256; step++) {
      int jn = dir == 0 ? j + 1 : j - 1;
      if (cl) jn = jn >= nseg ? 0 : jn < 0 ? nseg - 1 : jn;
      else if (jn < 0 || jn >= nseg) break;
      float sN;
      float dpN = segDpS(p, off, n, b1, cl, jn, sN);
      int jn2 = dir == 0 ? jn + 1 : jn - 1;
      float dpNext = 1e30;
      if (cl) { jn2 = jn2 >= nseg ? 0 : jn2 < 0 ? nseg - 1 : jn2; float d2; dpNext = segDpS(p, off, n, b1, cl, jn2, d2); }
      else if (jn2 >= 0 && jn2 < nseg) { float d2; dpNext = segDpS(p, off, n, b1, cl, jn2, d2); }
      if (dpN < bsD && dpN <= prev && dpN <= dpNext) {
        float ds = abs(dS(sN, bsS, cl, len));
        if (ds < 2.0 * uSig) sw = min(sw, ss(uSig, 2.0 * uSig, ds));
      }
      acc += distance(fetch(uPts, off + j).xy, fetch(uPts, off + jn).xy);
      prev = dpN;
      j = jn;
      if (acc > 2.0 * uSig) break;
    }
  }
  return sw;
}
// K1040 S4b: group g's alpha at p (form B alphaOf): its pieces' outline AA
// (each arm window's nearest segment, a member of g there) and its fills'.
float alphaG(int g, vec2 p) {
  vec4 gr = fetch(uGrp, g);
  int wo = int(gr.x);
  int wn = int(gr.y);
  float aP = 0.0;
  for (int wi = 0; wi < 1024; wi++) {
    if (wi >= wn || aP >= 1.0) break;
    vec4 w1 = fetch(uGw, 2 * (wo + wi) + 1);
    if (distance(p, w1.xy) > w1.z + uH + uAa) continue;
    vec4 w0v = fetch(uGw, 2 * (wo + wi));
    int bj = int(w0v.x);
    int k0 = int(w0v.y);
    int cnt = int(w0v.z);
    vec4 b0 = fetch(uChain, 2 * bj);
    vec4 b1 = fetch(uChain, 2 * bj + 1);
    int boff = int(b0.x);
    int bn = int(b0.y);
    bool bcl = b0.w > 0.5;
    int jj = k0;
    vec4 Pa = fetch(uPts, boff + jj);
    float bestDp = 1e30;
    float bestSj = 0.0;
    int bestSeg = -1;
    for (int qq = 0; qq < 4096; qq++) {
      if (qq >= cnt) break;
      int jb = (jj + 1 == bn) ? 0 : jj + 1;
      vec4 Pb = fetch(uPts, boff + jb);
      float t = clamp(segT(p, Pa.xy, Pb.xy), 0.0, 1.0);
      float dp = distance(p, mix(Pa.xy, Pb.xy, t));
      if (dp < bestDp) {
        bestDp = dp;
        bestSeg = jj;
        float sb = jb == 0 ? b1.x + b1.y : Pb.z;
        bestSj = Pa.z + t * (sb - Pa.z);
        if (bcl && bestSj >= b1.x + b1.y) bestSj -= b1.y;
      }
      Pa = Pb;
      jj = jb;
    }
    if (!(bestDp < uH + uAa)) continue;
    int gB;
    float rB = memberRamp(bj, bestSj, bcl, b1.y, gB);
    if (gB != g || !(rB > 0.0)) continue;
    // K1040 S4c: form B's alphaOf takes A.selfW * ss(-aa, aa, h - A.d); the
    // old read took the AA alone and over-inked the discs at a fold.
    float swA = bestSeg >= 0 ? foldSelfW(p, bj, bestSeg, bestSj, bestDp) : 1.0;
    aP = max(aP, swA * ss(-uAa, uAa, uH - bestDp));
  }
  if (aP >= 1.0) return 1.0;
  float aF = 0.0;
  int co = int(gr.z);
  int cn = int(gr.w);
  for (int i = 0; i < 1024; i++) {
    if (i >= cn) break;
    int o = CRN_TEXELS * (co + i);
    vec4 c0 = fetch(uCrn, o);
    vec4 c2 = fetch(uCrn, o + 2);
    if (!(c0.z > 0.0 && c2.z > 0.0)) continue;
    float dq = distance(p, c0.xy);
    if (dq > c0.w * (1.0 + 1e-6) || !inWedgeC(c0.xy, fetch(uCrn, o + 1), p)) continue;
    aF = max(aF, c2.z * ss(-uAa, uAa, dq - c0.z));
  }
  return max(aP, aF);
}
// K1040 S4c: a label word's surface coverage at p (form B alphaOf): a group
// reads alphaG (pieces at their fold weight, fills at omega); an own surface
// reads its naming piece's outline AA.
float surfAlpha(uint wd, float dT, vec2 p) {
  int code = int((wd >> 19) & 255u);
  if (code > 0) return alphaG(code - 1, p);
  return dT >= 0.0 ? ss(-uAa, uAa, uH - dT) : 1.0;
}
`;

const FS = `${HEAD}
flat in ivec3 vInst;
out vec4 oInk;
${LIB}
void main() {
  vec2 p = worldAt();
  int ci = vInst.x;
  int k = vInst.y;
  vec4 c0 = fetch(uChain, 2 * ci);
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  int off = int(c0.x);
  int n = int(c0.y);
  int nseg = int(c0.z);
  bool closed = c0.w > 0.5;
  float len = c1.y;
  float sX;
  vec2 fX;
  float zX;
  float dX = candOn(p, off, n, nseg, closed, c1, k, sX, fX, zX);
  if (!(dX > uH - uW - uAa && dX < uH + uAa && dX > 1e-12)) discard;
  // D1: this chain's candidates within R over NB2's window, by d.
  float cd[8];
  float cs[8];
  float cz[8];
  int cj[8];
  int nc = 0;
  vec4 nb = fetch(uNb2, off + k);
  int m0 = int(nb.x);
  int m1 = int(nb.y);
  int j = k - m0;
  if (j < 0) j += nseg;
  for (int q = 0; q < 4096; q++) {
    if (q > m0 + m1) break;
    float sq = sX;
    vec2 fq = fX;
    float zq = zX;
    float dq = j == k ? dX : candOn(p, off, n, nseg, closed, c1, j, sq, fq, zq);
    if (dq >= 0.0 && dq < uR && (nc < 8 || dq < cd[7])) {
      int at = nc < 8 ? nc : 7;
      for (int i = 7; i > 0; i--) {
        if (i > at) continue;
        if (cd[i - 1] > dq) {
          cd[i] = cd[i - 1];
          cs[i] = cs[i - 1];
          cz[i] = cz[i - 1];
          cj[i] = cj[i - 1];
          at = i - 1;
        } else break;
      }
      cd[at] = dq;
      cs[at] = sq;
      cz[at] = zq;
      cj[at] = j;
      if (nc < 8) nc++;
    }
    j = (j + 1 == n) ? 0 : j + 1;
  }
  int into[8];
  int ix = -1;
  for (int i = 0; i < 8; i++) {
    if (i >= nc) break;
    into[i] = -1;
    for (int m = 0; m < 8; m++) {
      if (m >= i) break;
      if (into[m] == -1 && abs(dS(cs[m], cs[i], closed, len)) <= uSig) {
        into[i] = m;
        break;
      }
    }
    if (cj[i] == k && abs(cd[i] - dX) == 0.0) ix = i;
  }
  int ia = ix < 0 ? -1 : (into[ix] < 0 ? ix : into[ix]);
  float sA = ia < 0 ? sX : cs[ia];
  float dA = ia < 0 ? dX : cd[ia];
  float zA = ia < 0 ? zX : cz[ia];
  // D2: the fold (the farther of two kept pieces within 2 sigma fades).
  float selfW = 1.0;
  for (int m = 0; m < 8; m++) {
    if (m >= ia) break;
    if (into[m] != -1) continue;
    float ds = abs(dS(cs[m], sA, closed, len));
    if (ds < 2.0 * uSig) selfW = min(selfW, ss(uSig, 2.0 * uSig, ds));
  }
  // D1's blend weight beta (form_b.ts mergeW).
  float beta = 1.0;
  if (ia >= 0 && ia != ix) {
    beta = 0.0;
    float gap = dX - dA;
    if (gap < uDel) {
      float ds = dS(sA, sX, closed, len);
      float fs = ss(uSig, 0.5 * uSig, abs(ds));
      if (fs > 0.0) {
        float mb = max(dA, dX);
        int ka = cj[ia];
        if (ka != k) {
          bool fwd = ds > 0.0;
          int i = fwd ? ((ka + 1 == n) ? 0 : ka + 1) : ka;
          int e = fwd ? k : ((k + 1 == n) ? 0 : k + 1);
          for (int gg = 0; gg < 4096; gg++) {
            if (gg > n) break;
            mb = max(mb, distance(p, fetch(uPts, off + i).xy));
            if (i == e) break;
            if (fwd) i = i + 1 < n ? i + 1 : (closed ? 0 : -1);
            else i = i > 0 ? i - 1 : (closed ? n - 1 : -1);
            if (i < 0) break;
          }
        }
        float den = mb - dA;
        float u = den > 0.0 ? min(1.0, gap / den) : 0.0;
        beta = ss(1.0, 0.0, u) * ss(uDel, 0.0, gap) * fs;
      }
    }
  }
  float w0 = selfW * beta;
  if (!(w0 > 0.0)) discard;
  // A's surface: member(chain, s_A) with the F10 rule.
  int g = -1;
  float rA = memberRamp(ci, sA, closed, len, g);
  int so = int(c1.z);
  int ns = int(c1.w);
  int code = int(fetch(uSpan, so).y);
  for (int i = 1; i < 256; i++) {
    if (i >= ns) break;
    vec4 e = fetch(uSpan, so + i);
    if (e.x <= sA) code = int(e.y);
    else break;
  }
  // The label: the top surface T here (or paper). Form B composites the
  // surfaces over each other in key order, so A's band shows where nothing
  // covers this pixel, on A's own surface, under T where T's alpha is below
  // 1 (T's outer AA rim, d_T > h - aa: lay 1), and as A's rim over T when A
  // is on top just inside its own edge (lay 2). In lays 1 and 2 the
  // fragment composites T's band with its own, so MAX against T's own
  // fragment keeps form B's sum.
  vec2 nX = (p - fX) / dX;
  ivec2 ts = textureSize(uLabel, 0);
  uint wd = texelFetch(uLabel, clamp(ivec2(gl_FragCoord.xy), ivec2(0), ts - 1), 0).r;
  int lay = 0;
  float dT = -1.0;
  float aT = 1.0;
  float zT = 0.0;
  if (wd != 0u && !names(wd, code, ci, sA, closed, len, c1.x)) {
    if (!(dX < uH)) {
      vec2 qp = fX + (uH - 1.5 * uAa) * nX;
      vec2 dev = vec2(uM0.x * qp.x + uM0.z * qp.y + uM1.x, uM0.y * qp.x + uM0.w * qp.y + uM1.y);
      ivec2 tq = clamp(ivec2(floor(dev.x), floor(uView.y - dev.y)), ivec2(0), ts - 1);
      uint wq = texelFetch(uLabel, tq, 0).r;
      if (wq == 0u || names(wq, code, ci, sA, closed, len, c1.x)) lay = 2;
    }
    dT = topDistZ(wd, p, ci, sA, zT);
    aT = surfAlpha(wd, dT, p);
    if (lay == 0) {
      // K1040 S4c: form B shows A under T wherever T's coverage is below 1
      // (a group covering by a fill at omega, a folded piece, the outer AA
      // rim), not only inside the naming chain's AA rim; the old read
      // discarded A there (muse_hash's near-corner zeros under a group).
      // K1040 S4c: a tie within zt also rescues the fragment - form B
      // blends in the swapped order, where A is on top, even where the
      // top's coverage is 1 (muse_hash chain 71 at (1901, 1128): the
      // sorted order gives 0, the swapped 1, the tie 0.42).
      float gapK0 = abs((zT - dT * uInvK) - (zA - dA * uInvK));
      if (!(dT > uH - uAa) && !(aT < 1.0) && !(dT >= 0.0 && uInvK > 0.0 && gapK0 < uZt)) discard;
      lay = 1;
    }
  } else if (wd == 0u) {
    // Paper here, on A's rim: a second surface's rim can overlap it (a gap
    // under 1 px between two threads). K1040 S4a2 (R1): the old probe 1 px
    // outward lands in paper again exactly where both tubes end together
    // (fat's notch: both d within 0.04 px of h), so the union was lost.
    // Probe 1 px inward instead - inside A's tube, so its label names the
    // top surface there; if that is another surface T, composite A's rim
    // under T's as in lay 1 (lay 3), with dT from T's naming chain.
    vec2 qi = p - 2.0 * uAa * nX;
    vec2 dev = vec2(uM0.x * qi.x + uM0.z * qi.y + uM1.x, uM0.y * qi.x + uM0.w * qi.y + uM1.y);
    ivec2 ti = clamp(ivec2(floor(dev.x), floor(uView.y - dev.y)), ivec2(0), ts - 1);
    uint wi = texelFetch(uLabel, ti, 0).r;
    if (wi != 0u && !names(wi, code, ci, sA, closed, len, c1.x)) {
      dT = topDistZ(wi, p, ci, sA, zT);
      aT = surfAlpha(wi, dT, p);
      if (dT >= 0.0 && dT < uH + uAa) lay = 3;
    }
    if (lay == 0) {
      // The inward probe named A's own surface (A on top inside), or paper
      // again: scan the four neighbour texels. One of them lies toward the
      // other tube and names it, where a 1 px probe along either thread's
      // normal can still land in paper (def chains 58/78 at (1534, 1290):
      // both distances within 0.3 px of h, both normal probes paper).
      ivec2 pc = ivec2(gl_FragCoord.xy);
      float bestT = 1e30;
      uint bestW = 0u;
      for (int q = 0; q < 4; q++) {
        ivec2 o = q == 0 ? ivec2(1, 0) : q == 1 ? ivec2(-1, 0) : q == 2 ? ivec2(0, 1) : ivec2(0, -1);
        uint wn = texelFetch(uLabel, clamp(pc + o, ivec2(0), ts - 1), 0).r;
        if (wn != 0u && !names(wn, code, ci, sA, closed, len, c1.x)) {
          float zTn;
          float dTn = topDistZ(wn, p, ci, sA, zTn);
          if (dTn >= 0.0 && dTn < bestT) { bestT = dTn; bestW = wn; zT = zTn; }
        }
      }
      if (bestT < uH + uAa) {
        lay = 3;
        dT = bestT;
        aT = surfAlpha(bestW, dT, p);
      }
    }
  }
  // The burial: the group's other pieces within R, winW at f.
  float bur = 0.0;
  float burBdp = 1e30;
  float burZ = 0.0;
  float burR = 0.0;
  float nearDp = 1e30;
  float nearZ = 0.0;
  float nearR = 0.0;
  if (g >= 0) {
    vec2 f = fX + uH * nX;
    vec4 gr = fetch(uGrp, g);
    int wo = int(gr.x);
    int wn = int(gr.y);
    for (int wi = 0; wi < 1024; wi++) {
      if (wi >= wn || bur >= 1.0) break;
      vec4 w1 = fetch(uGw, 2 * (wo + wi) + 1);
      if (distance(p, w1.xy) > w1.z + uR) continue;
      vec4 w0v = fetch(uGw, 2 * (wo + wi));
      int bj = int(w0v.x);
      int k0 = int(w0v.y);
      int cnt = int(w0v.z);
      int ai = int(w0v.w);
      vec4 b0 = fetch(uChain, 2 * bj);
      vec4 b1 = fetch(uChain, 2 * bj + 1);
      int boff = int(b0.x);
      int bn = int(b0.y);
      bool bcl = b0.w > 0.5;
      vec4 a0 = fetch(uArm, 2 * ai);
      float lc = fetch(uArm, 2 * ai + 1).x;
      // K1040 S4a2: the burier is B's piece - the window's nearest segment
      // to p - not every segment in the window. A segment past B's foot
      // reads the cap ramp at its own clamped s and buries at that rate
      // (user_tw42: rB 0.78 two segments past the foot against the piece's
      // 0.17 at it); form B buries by the piece, its winW the distance
      // over the +-3 segments around the piece.
      int jj = k0;
      vec4 Pa = fetch(uPts, boff + jj);
      float bestDp = 1e30;
      float bestSj = 0.0;
      float bestZ = 0.0;
      int bestQ = -1;
      int bestSeg = -1;
      for (int qq = 0; qq < 4096; qq++) {
        if (qq >= cnt) break;
        int jb = (jj + 1 == bn) ? 0 : jj + 1;
        vec4 Pb = fetch(uPts, boff + jb);
        float t = clamp(segT(p, Pa.xy, Pb.xy), 0.0, 1.0);
        float dp = distance(p, mix(Pa.xy, Pb.xy, t));
        if (dp < bestDp) {
          bestDp = dp;
          bestZ = mix(Pa.w, Pb.w, t);
          bestSeg = jj;
          bestQ = qq;
          float sb = jb == 0 ? b1.x + b1.y : Pb.z;
          bestSj = Pa.z + t * (sb - Pa.z);
          if (bcl && bestSj >= b1.x + b1.y) bestSj -= b1.y;
        }
        Pa = Pb;
        jj = jb;
      }
      // K1040 S4a2: B is its chain's minimum at p (form B's piece), not
      // just this window's nearest segment. Overlapping windows of one
      // chain (two arms of a group on it) otherwise bury by a segment
      // past B's foot, at that segment's own cap ramp (def chain 62:
      // ramp 0.49 at s 59.94 against the piece's 0.002 at s 59.81, halving
      // chain 65's end rim). The chain's true minimum is a local minimum:
      // no neighbouring segment of the chain is nearer.
      bool isMin = false;
      if (bestQ >= 0 && bestDp < uR) {
        float dpPrev = 1e30;
        float dpNext = 1e30;
        if (bestSeg > 0 || bcl) {
          int jp = bestSeg > 0 ? bestSeg - 1 : bn - 1;
          vec4 Pp0 = fetch(uPts, boff + jp);
          vec4 Pp1 = fetch(uPts, boff + bestSeg);
          float tp = clamp(segT(p, Pp0.xy, Pp1.xy), 0.0, 1.0);
          dpPrev = distance(p, mix(Pp0.xy, Pp1.xy, tp));
        }
        // K1040 S4b: an open chain has n - 1 segments (b0.z); its last
        // segment has no next one. The old bound (n) read a segment from
        // the last point back to the first, which can pass nearer p than
        // B's piece and fail the test (def chain 9's end at (1176, 336):
        // chain 1's rim drawn inside group 1's fill).
        if (bestSeg + 1 < int(b0.z) || bcl) {
          int jn = (bestSeg + 1 == bn) ? 0 : bestSeg + 1;
          int jn2 = (jn + 1 == bn) ? 0 : jn + 1;
          vec4 Pn0 = fetch(uPts, boff + jn);
          vec4 Pn1 = fetch(uPts, boff + jn2);
          float tn = clamp(segT(p, Pn0.xy, Pn1.xy), 0.0, 1.0);
          dpNext = distance(p, mix(Pn0.xy, Pn1.xy, tn));
        }
        isMin = bestDp <= min(dpPrev, dpNext) + 1e-12;
      }
      if (isMin) {
        float fw = 1.0;
        bool ok = true;
        if (bj == ci) {
          float ds = abs(dS(sA, bestSj, closed, len));
          if (ds <= uSig) ok = false;
          else if (ds < 2.0 * uSig && bestDp > dA) fw = ss(uSig, 2.0 * uSig, ds);
        }
        if (ok) {
          int gB;
          float rB = memberRamp(bj, bestSj, bcl, b1.y, gB);
          if (gB != g) rB = 0.0;
          if (bestDp < nearDp) {
            nearDp = bestDp;
            nearZ = bestZ;
            nearR = rB;
          }
          float minDf = 1e30;
          int j2 = k0;
          vec4 Pa2 = fetch(uPts, boff + j2);
          for (int qq = 0; qq < 4096; qq++) {
            if (qq >= cnt || qq > bestQ + 3) break;
            int jb = (j2 + 1 == bn) ? 0 : j2 + 1;
            vec4 Pb = fetch(uPts, boff + jb);
            if (qq >= bestQ - 3) {
              float tf = clamp(segT(f, Pa2.xy, Pb.xy), 0.0, 1.0);
              minDf = min(minDf, distance(f, mix(Pa2.xy, Pb.xy, tf)));
            }
            Pa2 = Pb;
            j2 = jb;
          }
          float wb = 1.0 - ss(uH - 2.0 * uAa, uH, minDf);
          if (wb > 0.0) {
            float cand = min(rA, rB) * fw * wb;
            if (cand > bur) {
              bur = cand;
              burBdp = bestDp;
              burZ = bestZ;
              burR = rB;
            }
          }
        }
      }
    }
  }
  // K1040 S4a2 (R4): A's own cap ramp mixes two configurations (form B's
  // cap mix for one ramp piece): member for rA of the weight, where the
  // burial above already reads min(ramp_A, ramp_B), and OWN for the rest,
  // where A's rim shows only past the group's coverage when the group is
  // above it there (its nearest piece's cone key against A's). Beside a
  // group surface the old (1 - bur) wrote the OWN share at full strength
  // under a group that covers the pixel (user_tw42: 0.38 against 0.13).
  float ownVis = 1.0;
  if (g >= 0 && rA < 1.0) {
    // The OWN share's group is the pieces still members there (ramp >
    // ramp_A): the dominant burier when it is one, else the nearest
    // group piece that is. A piece at ramp 0 is OWN in every weighted
    // configuration and must not hide A's share (def chain 65's end).
    float oDp = 1e30;
    float oZ = 0.0;
    if (bur > 0.0 && burR > rA) {
      oDp = burBdp;
      oZ = burZ;
    } else if (nearR > rA) {
      oDp = nearDp;
      oZ = nearZ;
    }
    if (oDp < 1e29 && zA - dA * uInvK <= oZ - oDp * uInvK) ownVis = 1.0 - ss(-uAa, uAa, uH - oDp);
  }
  // K1040 S4b: the corner rules (F9 and the fill at omega, with the partial
  // fill's arc share) bury A's member share rA, as form B buries A in each
  // configuration where it is the group's (exact at rA = 1, the corners'
  // case: the cap ramps end far out along the arms).
  float arcC = 0.0;
  float burCapSave = bur;
  float burCSave = 0.0;
  if (g >= 0) {
    burCSave = cornerBurial(g, p, fX + uH * nX, ci, sX, closed, len, arcC);
    bur = max(bur, rA * burCSave);
  }
  float vA0s = w0 * band2(uH - dX);
  float arcCs = arcC;
  float v = (rA - bur + (1.0 - rA) * ownVis) * w0 * band2(uH - dX) + rA * beta * arcC;
  if (g >= 0 && burCapSave > 0.0 && burCapSave >= 0.99 * min(rA, burR) && (burR < rA || rA < 1.0)) {
    // K1040 S4c: where a ramp burier actually buries, form B's cap mix
    // values the separate shares (A facing B as another surface) by
    // their composite, not at full strength: v = minR (1 - wb) for the
    // both-member share, then the group-alone and own shares, each
    // composited in cone-key order with the D4 tie (muse_hash chain 42
    // at (1430, 375): 0.52 x buried 1 + 0.48 x tie(1, 0) = 0.19).
    float oDp = burBdp;
    float oZ = burZ;
    float oR = burR;
    float aGrp = alphaG(g, p);
    float vBsep = band2(uH - oDp);
    float keyAsep = zA - dA * uInvK;
    float keyBsep = oZ - oDp * uInvK;
    float aBown = ss(-uAa, uAa, uH - oDp);
    float ordA = vA0s + (1.0 - aGrp) * vBsep;
    float ordB = vBsep + (1.0 - aBown) * vA0s;
    float sepGrp = tieBlend(ordB, ordA, keyBsep, keyAsep, true);
    float aAown = selfW * ss(-uAa, uAa, uH - dA);
    float aB2 = oR > rA ? aGrp : aBown;
    float ordA2 = vA0s + (1.0 - aAown) * vBsep;
    float ordB2 = vBsep + (1.0 - aB2) * vA0s;
    float sepOwn = tieBlend(ordB2, ordA2, keyBsep, keyAsep, true);
    float minR = min(rA, oR);
    float wbCap = minR > 0.0 ? clamp(burCapSave / minR, 0.0, 1.0) : 0.0;
    float wGrp = max(0.0, rA - oR);
    float wOwn = 1.0 - rA;
    v = minR * (1.0 - max(wbCap, burCSave)) * vA0s + wGrp * sepGrp + wOwn * sepOwn + rA * beta * arcCs;
  }
  if (lay == 0 && wd != 0u) {
    // K1040 S4c: the top's own fragment must also blend a tie - the
    // runner-up's strip writes nothing where its band is empty (its piece
    // covers p but its rim lies elsewhere), so no lay-1 fragment ever
    // runs (muse_hash chains 24/6 at (544, 709): the two orders are 1 and
    // 0, the tie 0.5). The neighbour scan finds the runner-up across the
    // depth switch, as lay 3 does on paper.
    float bestB = 1e30;
    float zB = 0.0;
    uint bestBW = 0u;
    ivec2 pc0 = ivec2(gl_FragCoord.xy);
    for (int q = 0; q < 4; q++) {
      ivec2 oo = q == 0 ? ivec2(1, 0) : q == 1 ? ivec2(-1, 0) : q == 2 ? ivec2(0, 1) : ivec2(0, -1);
      uint wn = texelFetch(uLabel, clamp(pc0 + oo, ivec2(0), ts - 1), 0).r;
      if (wn == 0u || names(wn, code, ci, sA, closed, len, c1.x)) continue;
      if (g >= 0 && int((wn >> 19) & 255u) == 0) {
        int cw = int(wn & 255u) - 1;
        if (cw >= 0) {
          vec4 w1v = fetch(uChain, 2 * cw + 1);
          bool clw = fetch(uChain, 2 * cw).w > 0.5;
          float sW = w1v.x + float((wn >> 8) & 2047u) / 2047.0 * w1v.y;
          if (clw && sW >= w1v.x + w1v.y) sW -= w1v.y;
          int gW;
          memberRamp(cw, sW, clw, w1v.y, gW);
          if (gW == g) continue;
        }
      }
      float zBn;
      float dBn = topDistZ(wn, p, ci, sA, zBn);
      if (dBn >= 0.0 && dBn < bestB) { bestB = dBn; zB = zBn; bestBW = wn; }
    }
    if (bestBW != 0u && bestB < uH + uAa && uInvK > 0.0) {
      float keyB = zB - bestB * uInvK;
      float keyA = zA - dA * uInvK;
      if (abs(keyB - keyA) < uZt) {
        float aA2 = g >= 0 ? alphaG(g, p) : selfW * ss(-uAa, uAa, uH - dA);
        float aB = surfAlpha(bestBW, bestB, p);
        float vB = band2(uH - bestB);
        float ordA = v + (1.0 - aA2) * vB;
        float ordB = vB + (1.0 - aB) * v;
        v = tieBlend(ordB, ordA, keyB, keyA, true);
      }
    }
  }
  // K1040 S4c: the two-surface composite, with the D4 tie. ordT is T over
  // A and ordA is A over T (T's ink approximated by its naming piece's rim,
  // unburied, as the old lay 1; A's coverage is alphaOf of A's surface).
  // Form B composites in cone-key order and, where the keys lie within zt,
  // blends the two orders by ss(-zt, zt, gap) instead of taking one.
  if (lay == 1 || lay == 3) {
    float aA = g >= 0 ? alphaG(g, p) : selfW * ss(-uAa, uAa, uH - dA);
    float vT = dT >= 0.0 ? band2(uH - dT) : 0.0;
    float ordT = vT + (1.0 - aT) * v;
    float ordA = v + (1.0 - aA) * vT;
    float keyT = zT - dT * uInvK;
    float keyA = zA - dA * uInvK;
    v = dT >= 0.0 && uInvK > 0.0 && abs(keyT - keyA) < uZt ? tieBlend(ordT, ordA, keyT, keyA, true) : ordT;
  } else if (lay == 2 && dT >= 0.0) {
    float aA = g >= 0 ? alphaG(g, p) : selfW * ss(-uAa, uAa, uH - dA);
    float vT = band2(uH - dT);
    float ordT = vT + (1.0 - aT) * v;
    float ordA = v + (1.0 - aA) * vT;
    float keyT = zT - dT * uInvK;
    float keyA = zA - dA * uInvK;
    v = uInvK > 0.0 && abs(keyT - keyA) < uZt ? tieBlend(ordT, ordA, keyT, keyA, true) : ordA;
  }
  if (!(v > 0.0)) discard;
  oInk = vec4(v, v, v, 1.0);
}
`;

// K1040 S4b: the corner quads - form B inkOf's corner terms, one quad per
// corner over its terms' bbox (band_b.ts CRN texel 7): the endpoint discs
// omega aS band(|p - t_a|), omega aS band(|p - t_b|) and (1 - omega) aS
// band(|p - V|), clipped by the group's alpha aS (alphaOf), and the arc
// omega band2(|p - q| - r) inside the wedge. MAX blending with the foot
// strips keeps form B's max over the surface's terms. The composite with
// the label's top T is lay 1's (T over the group, through T's AA rim); the
// group on top, or paper, writes the term as it is.
const CORNER_VS = `${HEAD}
flat out int vCrn;
void main() {
  int i = gl_InstanceID;
  vec4 bb = fetch(uCrn, CRN_TEXELS * i + 7);
  float sx = float(gl_VertexID & 1);
  float sy = float(gl_VertexID >> 1);
  vCrn = i;
  if (bb.z < bb.x) {
    gl_Position = vec4(2.0, 2.0, 0.5, 1.0);
    return;
  }
  gl_Position = toClip(mix(bb.xy - vec2(uPad), bb.zw + vec2(uPad), vec2(sx, sy)));
}
`;

const CORNER_FS = `${HEAD}
flat in int vCrn;
out vec4 oInk;
${LIB}
void main() {
  vec2 p = worldAt();
  int o = CRN_TEXELS * vCrn;
  vec4 c0 = fetch(uCrn, o);
  vec4 c1 = fetch(uCrn, o + 1);
  vec4 c2 = fetch(uCrn, o + 2);
  vec4 c3 = fetch(uCrn, o + 3);
  float om = c2.z;
  int g = int(fetch(uArm, 2 * int(c3.x)).x);
  float v = 0.0;
  if (c0.z > 0.0 && om > 0.0 && inWedgeC(c0.xy, c1, p)) v = om * band2(distance(p, c0.xy) - c0.z);
  float bd = 0.0;
  if (om > 0.0) bd = om * band(min(distance(p, c1.xy), distance(p, c1.zw)));
  if (om < 1.0) bd = max(bd, (1.0 - om) * band(distance(p, c2.xy)));
  float aG = alphaG(g, p);
  if (bd > v) v = max(v, aG * bd);
  if (!(v > 0.0)) discard;
  ivec2 ts = textureSize(uLabel, 0);
  ivec2 pcC = clamp(ivec2(gl_FragCoord.xy), ivec2(0), ts - 1);
  uint wd = texelFetch(uLabel, pcC, 0).r;
  if (wd != 0u && int((wd >> 19) & 255u) != g + 1) {
    // Lay 1, extended as the foot's (S4c): the corner terms also show under
    // a top whose coverage is below 1, not only in its AA rim.
    float zT;
    float dT = topDistZ(wd, p, -1, 0.0, zT);
    float aT = surfAlpha(wd, dT, p);
    if (!(dT > uH - uAa) && !(aT < 1.0)) discard;
    float vT = dT >= 0.0 ? band2(uH - dT) : 0.0;
    v = vT + (1.0 - aT) * v;
  } else if (wd != 0u) {
    // K1040 S4c lay 2: the group is on top and the surface below shows
    // through its coverage (the foot pass's lay 2); the neighbour scan
    // finds that surface, as the foot's lay 3 does on paper.
    float bestB = 1e30;
    for (int q = 0; q < 4; q++) {
      ivec2 oo = q == 0 ? ivec2(1, 0) : q == 1 ? ivec2(-1, 0) : q == 2 ? ivec2(0, 1) : ivec2(0, -1);
      uint wn = texelFetch(uLabel, clamp(pcC + oo, ivec2(0), ts - 1), 0).r;
      if (wn == 0u || int((wn >> 19) & 255u) == g + 1) continue;
      // An own word of one of the group's member chains is the group there.
      float dB = topDist(wn, p, -1, 0.0);
      if (dB >= 0.0 && dB < bestB) bestB = dB;
    }
    if (bestB < uH + uAa) v += (1.0 - aG) * band2(uH - bestB);
  }
  oInk = vec4(v, v, v, 1.0);
}
`;

export interface BandBSources {
  vs: string;
  fs: string;
  /** K1040 S4b: the corner quads. */
  cornerVs: string;
  cornerFs: string;
}

export function bandBSources(): BandBSources {
  return { vs: VS, fs: FS, cornerVs: CORNER_VS, cornerFs: CORNER_FS };
}
