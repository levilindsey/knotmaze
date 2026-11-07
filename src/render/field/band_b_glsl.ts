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
float topDist(uint wd, vec2 p, int ci, float sA) {
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
      best = min(best, distance(p, mix(Pa.xy, Pb.xy, t)));
    }
    run += distance(Pa.xy, Pb.xy);
    if (run > 2.0 * w) break;
    Pa = Pb;
    j = jb;
    if (!cl && j == 0) break;
  }
  return best;
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
    for (int qq = 0; qq < 4096; qq++) {
      if (qq >= cnt) break;
      int jb = (jj + 1 == bn) ? 0 : jj + 1;
      vec4 Pb = fetch(uPts, boff + jb);
      float t = clamp(segT(p, Pa.xy, Pb.xy), 0.0, 1.0);
      float dp = distance(p, mix(Pa.xy, Pb.xy, t));
      if (dp < bestDp) {
        bestDp = dp;
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
    aP = max(aP, ss(-uAa, uAa, uH - bestDp));
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
          cj[i] = cj[i - 1];
          at = i - 1;
        } else break;
      }
      cd[at] = dq;
      cs[at] = sq;
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
  float zA = zX;
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
  if (wd != 0u && !names(wd, code, ci, sA, closed, len, c1.x)) {
    if (!(dX < uH)) {
      vec2 qp = fX + (uH - 1.5 * uAa) * nX;
      vec2 dev = vec2(uM0.x * qp.x + uM0.z * qp.y + uM1.x, uM0.y * qp.x + uM0.w * qp.y + uM1.y);
      ivec2 tq = clamp(ivec2(floor(dev.x), floor(uView.y - dev.y)), ivec2(0), ts - 1);
      uint wq = texelFetch(uLabel, tq, 0).r;
      if (wq == 0u || names(wq, code, ci, sA, closed, len, c1.x)) lay = 2;
    }
    dT = topDist(wd, p, ci, sA);
    if (lay == 0) {
      if (!(dT > uH - uAa)) discard;
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
      dT = topDist(wi, p, ci, sA);
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
      for (int q = 0; q < 4; q++) {
        ivec2 o = q == 0 ? ivec2(1, 0) : q == 1 ? ivec2(-1, 0) : q == 2 ? ivec2(0, 1) : ivec2(0, -1);
        uint wn = texelFetch(uLabel, clamp(pc + o, ivec2(0), ts - 1), 0).r;
        if (wn != 0u && !names(wn, code, ci, sA, closed, len, c1.x)) {
          float dTn = topDist(wn, p, ci, sA);
          if (dTn >= 0.0 && dTn < bestT) bestT = dTn;
        }
      }
      if (bestT < uH + uAa) {
        lay = 3;
        dT = bestT;
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
        if (bestSeg + 1 < bn || bcl) {
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
  if (g >= 0) {
    float burC = cornerBurial(g, p, fX + uH * nX, ci, sX, closed, len, arcC);
    bur = max(bur, rA * burC);
  }
  float v = (rA - bur + (1.0 - rA) * ownVis) * w0 * band2(uH - dX) + rA * beta * arcC;
  if (lay == 1) {
    float DT = uH - dT;
    v = band2(DT) + (1.0 - ss(-uAa, uAa, DT)) * v;
  } else if (lay == 2 && dT >= 0.0) {
    v += (1.0 - selfW * ss(-uAa, uAa, uH - dX)) * band2(uH - dT);
  } else if (lay == 3) {
    // T is on top at the inward probe: form B's over of the two rims
    // (T's rim approximated unburied, as in lay 1).
    float DT = uH - dT;
    v = band2(DT) + (1.0 - ss(-uAa, uAa, DT)) * v;
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
  if (bd > v) v = max(v, alphaG(g, p) * bd);
  if (!(v > 0.0)) discard;
  ivec2 ts = textureSize(uLabel, 0);
  uint wd = texelFetch(uLabel, clamp(ivec2(gl_FragCoord.xy), ivec2(0), ts - 1), 0).r;
  if (wd != 0u && int((wd >> 19) & 255u) != g + 1) {
    float dT = topDist(wd, p, -1, 0.0);
    if (!(dT > uH - uAa)) discard;
    float DT = uH - dT;
    v = band2(DT) + (1.0 - ss(-uAa, uAa, DT)) * v;
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
