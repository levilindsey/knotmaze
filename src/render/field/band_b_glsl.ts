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
//   - The burial: over the group's arm windows (GW), every segment within R
//     of the pixel (form B's pieces B), except A's own stretch (|ds| <= sigma)
//     and with the fold's weight on its chain, buries A's outline at
//     min(ramp_A, ramp_B) winW(f): the cap-mix's weight for one burier.
//   - v = (1 - bur) selfW_A beta band2(h - d_X), written with MAX blending, so
//     the pixel keeps form B's max over its foot terms.
// Not here (S4b): the corner terms (V, t_a, t_b, the arc, omega), the fill
// burial and F9's same-chain corner rule, ties (D4), the outer edge's
// composite under a top surface's AA ((1 - a_top) v_below; MAX instead), the
// exact cap-mix for several buriers.

import { TEX_W } from "./label_b";

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

const FS = `${HEAD}
flat in ivec3 vInst;
out vec4 oInk;
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
float candOn(vec2 p, int off, int n, int nseg, bool closed, vec4 c1, int j, out float s, out vec2 f) {
  int jb = (j + 1 == n) ? 0 : j + 1;
  vec4 A = fetch(uPts, off + j);
  vec4 B = fetch(uPts, off + jb);
  float tr = segT(p, A.xy, B.xy);
  s = 0.0;
  f = vec2(0.0);
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
  float sb = jb == 0 ? c1.x + c1.y : B.z;
  s = A.z + t * (sb - A.z);
  if (closed && s >= c1.x + c1.y) s -= c1.y;
  return distance(p, f);
}
// Whether label word wd names A's surface (its code; an own surface: chain
// ci within sigma of s_A, plus the word's s step).
bool names(uint wd, int code, int ci, float sA, bool closed, float len, float s0) {
  if (int((wd >> 19) & 255u) != code) return false;
  if (code != 0) return true;
  if (int(wd & 255u) - 1 != ci) return false;
  float ws = s0 + float((wd >> 8) & 2047u) / 2047.0 * len;
  return abs(dS(ws, sA, closed, len)) <= uSig + len / 2047.0;
}
// The distance from p to the label's top T when T is an own surface: its
// chain's centreline within sigma (plus the word's s step) of the word's s,
// A's own stretch skipped. -1 for a group's surface or a fill, whose alpha
// is a max over pieces this does not see (the fragment stays hidden).
float topDist(uint wd, vec2 p, int ci, float sA) {
  if (int((wd >> 19) & 255u) != 0 || ((wd >> 27) & 1u) != 0u) return -1.0;
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
  float dX = candOn(p, off, n, nseg, closed, c1, k, sX, fX);
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
    float dq = j == k ? dX : candOn(p, off, n, nseg, closed, c1, j, sq, fq);
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
  vec4 ca = fetch(uCarm, ci);
  int ao = int(ca.x);
  int an = int(ca.y);
  int g = -1;
  float rA = 0.0;
  for (int i = 0; i < 64; i++) {
    if (i >= an) break;
    int ai = int(fetch(uAix, ao + i).x);
    vec4 a0 = fetch(uArm, 2 * ai);
    float lc = fetch(uArm, 2 * ai + 1).x;
    float d = armDist(a0, sA, closed, len);
    if (d < -1e-12 || d > a0.w + 1e-12) continue;
    float rp = lc >= 1e29 ? 1.0 : ss(lc, lc - uLam, d);
    if (g < 0 || rp > rA) {
      g = int(a0.x);
      rA = rp;
    }
  }
  if (g >= 0 && rA > 0.0) {
    for (int i = 0; i < 64; i++) {
      if (i >= an) break;
      int ai = int(fetch(uAix, ao + i).x);
      vec4 a0 = fetch(uArm, 2 * ai);
      float lc = fetch(uArm, 2 * ai + 1).x;
      if (int(a0.x) != g || lc >= 1e29) continue;
      float d = armDist(a0, sA, closed, len);
      if (closed && d > len / 2.0) d -= len;
      if (!(d < 1e-12 && d > lc - uLam)) continue;
      rA = min(rA, ss(lc, lc - uLam, d));
    }
  }
  if (g < 0) rA = 1.0;
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
  } else if (wd == 0u && !(dX < uH)) {
    // Paper here, on A's rim: a second surface's rim can overlap it (a gap
    // under 1 px between two threads). The pixel 1 px past here names it;
    // form B's over of two rims is their union (lay 3).
    vec2 qo = p + 2.0 * uAa * nX;
    vec2 dev = vec2(uM0.x * qo.x + uM0.z * qo.y + uM1.x, uM0.y * qo.x + uM0.w * qo.y + uM1.y);
    ivec2 to = clamp(ivec2(floor(dev.x), floor(uView.y - dev.y)), ivec2(0), ts - 1);
    uint wo = texelFetch(uLabel, to, 0).r;
    if (wo != 0u && !names(wo, code, ci, sA, closed, len, c1.x)) {
      dT = topDist(wo, p, ci, sA);
      if (dT >= 0.0 && dT < uH + uAa) lay = 3;
    }
  }
  // The burial: the group's other pieces within R, winW at f.
  float bur = 0.0;
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
      int jj = k0;
      vec4 Pa = fetch(uPts, boff + jj);
      for (int qq = 0; qq < 4096; qq++) {
        if (qq >= cnt) break;
        int jb = (jj + 1 == bn) ? 0 : jj + 1;
        vec4 Pb = fetch(uPts, boff + jb);
        float t = clamp(segT(p, Pa.xy, Pb.xy), 0.0, 1.0);
        float dp = distance(p, mix(Pa.xy, Pb.xy, t));
        if (dp < uR) {
          float sb = jb == 0 ? b1.x + b1.y : Pb.z;
          float sj = Pa.z + t * (sb - Pa.z);
          if (bcl && sj >= b1.x + b1.y) sj -= b1.y;
          float fw = 1.0;
          bool ok = true;
          if (bj == ci) {
            float ds = abs(dS(sA, sj, closed, len));
            if (ds <= uSig) ok = false;
            else if (ds < 2.0 * uSig && dp > dA) fw = ss(uSig, 2.0 * uSig, ds);
          }
          if (ok) {
            float tf = clamp(segT(f, Pa.xy, Pb.xy), 0.0, 1.0);
            float wb = 1.0 - ss(uH - 2.0 * uAa, uH, distance(f, mix(Pa.xy, Pb.xy, tf)));
            if (wb > 0.0) {
              float d = armDist(a0, sj, bcl, b1.y);
              float rB = (d < -1e-12 || d > a0.w + 1e-12) ? 0.0 : (lc >= 1e29 ? 1.0 : ss(lc, lc - uLam, d));
              bur = max(bur, min(rA, rB) * fw * wb);
            }
          }
        }
        Pa = Pb;
        jj = jb;
      }
    }
  }
  float v = (1.0 - bur) * w0 * band2(uH - dX);
  if (lay == 1) {
    float DT = uH - dT;
    v = band2(DT) + (1.0 - ss(-uAa, uAa, DT)) * v;
  } else if (lay == 2 && dT >= 0.0) {
    v += (1.0 - selfW * ss(-uAa, uAa, uH - dX)) * band2(uH - dT);
  } else if (lay == 3) {
    float b = band2(uH - dT);
    v = v + b - v * b;
  }
  if (!(v > 0.0)) discard;
  oInk = vec4(v, v, v, 1.0);
}
`;

export interface BandBSources {
  vs: string;
  fs: string;
}

export function bandBSources(): BandBSources {
  return { vs: VS, fs: FS };
}
