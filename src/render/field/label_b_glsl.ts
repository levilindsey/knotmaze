// K1040 S3: the label pass's shaders - form B's top surface, depth-tested.
//
// Two instanced draws into L (R32UI, the packed word) and D (DEPTH32F, the
// cone key): capsules, one instance per segment (chain, k), and the corner
// fills, one per corner. Both write gl_FragDepth = 0.5 - key * uKeyScale, so
// LESS keeps the highest key (Q1's cone key z - d/K, form_b.ts). The tables
// and the fragment rule are label_b.ts's (its header); labelAt mirrors this
// code line for line in float64, except the two S3b cuts, which give its
// result: the capsule's slab clip (no fragment it drops was kept) and the
// merge scan's carried points (the same tests in another order).
//
// DEBUG_OUT adds a second target (RGBA32F: key, s, d, fill) for the probes'
// verdicts; the label itself is the word and the depth.

import { FILL_TEXELS, TEX_W } from "./label_b";

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define TEX_W ${TEX_W}
#define FILL_TEXELS ${FILL_TEXELS}
uniform sampler2D uPts;
uniform sampler2D uChain;
uniform sampler2D uSpan;
uniform sampler2D uFill;
// per segment (as uPts) its merge-scan window (m-, m+) (label_b.ts nbWindows)
uniform sampler2D uNb;
// world -> device px: u = m0.x x + m0.z y + m1.x, v = m0.y x + m0.w y + m1.y
uniform vec4 uM0;
uniform vec2 uM1;
// device px -> world, the inverse
uniform vec4 uI0;
uniform vec2 uI1;
uniform vec2 uView;
uniform float uH;
uniform float uInvK;
uniform float uKeyScale;
uniform float uPad;
// the merge scan's reach in s (label_b.ts foldR)
uniform float uFold;
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
uint packWord(int ci, float s, vec4 c1, uint code, uint fill, uint cap, uint closed) {
  uint s11 = uint(clamp((s - c1.x) / c1.y, 0.0, 1.0) * 2047.0 + 0.5);
  return uint(ci + 1) | (s11 << 8) | (code << 19) | (fill << 27) | (cap << 28) | (closed << 29);
}
`;

// Fragment shaders only (gl_FragCoord).
const OUTS = `
layout(location = 0) out uint oWord;
#ifdef DEBUG_OUT
layout(location = 1) out vec4 oDbg;
#endif
vec2 worldAt() {
  vec2 dev = vec2(gl_FragCoord.x, uView.y - gl_FragCoord.y);
  return vec2(uI0.x * dev.x + uI0.z * dev.y + uI1.x, uI0.y * dev.x + uI0.w * dev.y + uI1.y);
}
`;

const CAPSULE_VS = `${HEAD}
in vec2 aSeg;
flat out ivec2 vSeg;
void main() {
  int ci = int(aSeg.x);
  int k = int(aSeg.y);
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
  vec2 u = l > 0.0 ? dv / l : vec2(1.0, 0.0);
  vec2 nr = vec2(-u.y, u.x);
  float r = uH + uPad;
  // S3b: the slab clip. The fragment shader keeps t in [0, 1), a free end's
  // cap, and at t <= 0 the convex wedge at a (beyond the previous segment's
  // end too, within uH): it reaches back uH sin(phi) for a turn phi below 90
  // degrees, uH past it. So an inner end extends by that and the pad, not by
  // uH (the quads overlapped their neighbours 6-13 times over).
  float e0 = r;
  float e1 = r;
  if (l > 0.0) {
    if (closed || k + 1 < nseg) e1 = uPad;
    if (closed || k > 0) {
      vec2 pv = a - fetch(uPts, off + (k > 0 ? k - 1 : nseg - 1)).xy;
      float lp = length(pv);
      if (lp > 0.0) {
        vec2 up = pv / lp;
        e0 = (dot(up, u) >= 0.0 ? uH * abs(up.x * u.y - up.y * u.x) : uH) + uPad;
      }
    }
  }
  float sx = float(gl_VertexID & 1);
  float sy = float(gl_VertexID >> 1) * 2.0 - 1.0;
  gl_Position = toClip(mix(a - u * e0, b + u * e1, sx) + nr * (r * sy));
  vSeg = ivec2(ci, k);
}
`;

const CAPSULE_FS = `${HEAD}${OUTS}
flat in ivec2 vSeg;
void main() {
  vec2 p = worldAt();
  int ci = vSeg.x;
  int k = vSeg.y;
  vec4 c0 = fetch(uChain, 2 * ci);
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  int off = int(c0.x);
  int n = int(c0.y);
  int nseg = int(c0.z);
  bool closed = c0.w > 0.5;
  int kb = (k + 1 == n) ? 0 : k + 1;
  vec4 A = fetch(uPts, off + k);
  vec4 B = fetch(uPts, off + kb);
  float tr = segT(p, A.xy, B.xy);
  uint cap = 0u;
  // The foot is a candidate exactly when geom.ts candidates() takes it.
  if (tr <= 0.0) {
    if (closed || k > 0) {
      int kp = k > 0 ? k - 1 : nseg - 1;
      if (segT(p, fetch(uPts, off + kp).xy, A.xy) < 1.0) discard;
    } else cap = 1u;
  } else if (tr >= 1.0) {
    if (closed || k + 1 < nseg) discard;
    cap = 1u;
  }
  float t = clamp(tr, 0.0, 1.0);
  float d = distance(p, mix(A.xy, B.xy, t));
  if (!(d < uH)) discard;
  float key = mix(A.w, B.w, t) - d * uInvK;
  float sb = kb == 0 ? c1.x + c1.y : B.z;
  float s = A.z + t * (sb - A.z);
  if (closed && s >= c1.x + c1.y) s -= c1.y;
  // The merge scan (form B's merge and fold): a nearer candidate of this
  // chain within uFold of s hides this one. Only segment k's window.
  // S3b: consecutive segments share a point, so the scan carries it (one
  // fetch a step, not two or three), and it tests the distance before the
  // foot rule (both only skip, so the order does not change the result:
  // labelAt's order).
  vec4 nb = fetch(uNb, off + k);
  int m0 = int(nb.x);
  int m1 = int(nb.y);
  int j = k - m0;
  if (j < 0) j += nseg;
  vec4 Qa = fetch(uPts, off + j);
  vec4 Qp = Qa;
  for (int q = 0; q < 4096; q++) {
    if (q > m0 + m1) break;
    int jb = (j + 1 == n) ? 0 : j + 1;
    vec4 Qb = fetch(uPts, off + jb);
    if (j != k) {
      float tq = segT(p, Qa.xy, Qb.xy);
      float dq = distance(p, mix(Qa.xy, Qb.xy, clamp(tq, 0.0, 1.0)));
      if (dq < d) {
        bool foot = true;
        if (tq <= 0.0) {
          if (closed || j > 0) {
            vec2 pp = q > 0 ? Qp.xy : fetch(uPts, off + (j > 0 ? j - 1 : nseg - 1)).xy;
            foot = !(segT(p, pp, Qa.xy) < 1.0);
          }
        } else if (tq >= 1.0) {
          foot = !(closed || j + 1 < nseg);
        }
        if (foot) {
          float sq = Qa.z + clamp(tq, 0.0, 1.0) * ((jb == 0 ? c1.x + c1.y : Qb.z) - Qa.z);
          float ds = sq - s;
          // s and sq both lie in [s0, s0 + len], so one lap wraps ds (no
          // rounded quotient: K299's rule, test/render/paint_ring_lap.test.ts).
          if (closed) ds -= ds > 0.5 * c1.y ? c1.y : ds < -0.5 * c1.y ? -c1.y : 0.0;
          if (abs(ds) < uFold) discard;
        }
      }
    }
    Qp = Qa;
    Qa = Qb;
    j = jb;
  }
  int so = int(c1.z);
  int ns = int(c1.w);
  uint code = uint(fetch(uSpan, so).y);
  for (int i = 1; i < 256; i++) {
    if (i >= ns) break;
    vec4 e = fetch(uSpan, so + i);
    if (e.x <= s) code = uint(e.y);
    else break;
  }
  oWord = packWord(ci, s, c1, code, 0u, cap, closed ? 1u : 0u);
#ifdef DEBUG_OUT
  oDbg = vec4(key, s, d, 0.0);
#endif
  gl_FragDepth = 0.5 - key * uKeyScale;
}
`;

const FILL_VS = `${HEAD}
flat out int vFill;
void main() {
  int fi = gl_InstanceID;
  vec4 f0 = fetch(uFill, FILL_TEXELS * fi);
  float r = f0.w + uPad;
  float sx = float(gl_VertexID & 1) * 2.0 - 1.0;
  float sy = float(gl_VertexID >> 1) * 2.0 - 1.0;
  gl_Position = toClip(f0.xy + vec2(sx, sy) * r);
  vFill = fi;
}
`;

const FILL_FS = `${HEAD}${OUTS}
flat in int vFill;
// FormB.footArm over an arm's window w = (sLo, sHi, k0, cnt) (geom.ts footInWindow).
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
void main() {
  vec2 p = worldAt();
  int o = FILL_TEXELS * vFill;
  vec4 f0 = fetch(uFill, o);
  vec4 f1 = fetch(uFill, o + 1);
  vec4 f2 = fetch(uFill, o + 2);
  vec4 f3 = fetch(uFill, o + 3);
  float dq = distance(p, f0.xy);
  if (!(dq > f0.z) || dq > f0.w) discard;
  vec2 ra = f1.xy - f0.xy;
  vec2 rb = f1.zw - f0.xy;
  vec2 w = p - f0.xy;
  float sg = ra.x * rb.y - ra.y * rb.x;
  if (sg == 0.0) discard;
  if (!((ra.x * w.y - ra.y * w.x) * sg >= 0.0 && (w.x * rb.y - w.y * rb.x) * sg >= 0.0)) discard;
  if (footWin(p, int(f3.x), fetch(uFill, o + 4)) < f3.w) discard;
  if (footWin(p, int(f3.y), fetch(uFill, o + 5)) < f3.w) discard;
  bool nearerA = distance(p, f1.xy) <= distance(p, f1.zw);
  float key = (nearerA ? f2.x : f2.y) - uH * uInvK;
  int ci = int(nearerA ? f3.x : f3.y);
  float s = nearerA ? f2.z : f2.w;
  vec4 c0 = fetch(uChain, 2 * ci);
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  oWord = packWord(ci, s, c1, uint(f3.z), 1u, 0u, c0.w > 0.5 ? 1u : 0u);
#ifdef DEBUG_OUT
  oDbg = vec4(key, s, dq, 1.0);
#endif
  gl_FragDepth = 0.5 - key * uKeyScale;
}
`;

export interface LabelBSources {
  capsuleVs: string;
  capsuleFs: string;
  fillVs: string;
  fillFs: string;
}

export function labelBSources(debugOut: boolean): LabelBSources {
  const def = (s: string) => (debugOut ? s.replace("#version 300 es\n", "#version 300 es\n#define DEBUG_OUT 1\n") : s);
  return { capsuleVs: def(CAPSULE_VS), capsuleFs: def(CAPSULE_FS), fillVs: def(FILL_VS), fillFs: def(FILL_FS) };
}
