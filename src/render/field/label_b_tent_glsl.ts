// K1040 S3c: the label pass without discards - form B's top surface as tents.
//
// S3b's pass (label_b_glsl.ts) shades a capsule's whole quad and discards
// what its fragment rule rejects, and writes gl_FragDepth; a tile-based GPU
// cannot drop a fragment that may still discard (S3b F4). Here the label is
// geometry whose vertex depth is the cone key (Q1: z - d/K, form_b.ts), so
// the depth test alone decides and the fragment shader neither discards nor
// writes gl_FragDepth (K923's label set depth from the vertex the same way):
//   segments  per (chain, k) one strip: the joint's wedge at a (a fan around
//             a on the convex side, from the previous segment's corner to
//             this one's, NW facets at most), then the two side quads (key z
//             on the line, z - h/K at distance h: affine, so exact);
//   caps      per free end a half cone (NC facets);
//   fills     per corner fill the annular sector (r, Rp], split at the
//             tangent points' bisector, a constant key per half (NF facets
//             a half at most).
// A wedge's, cap's or fill arc's inner vertices sit at the balanced radius
// (the chord's error split evenly inside and outside the circle); the ends
// that meet another primitive's corner are made by the same expression from
// the same texels (emit: P + N * o), so the shared edges match bit for bit.
// What S3b's fragment rule did by discard and these tents cannot say (the
// merge scan, the fill's foot windows, the exact curved outline) is the
// brief's Findings (docs/design/K1040_s3c_label.md).
//
// One fragment shader for all three: s from the segment's t (segT of the
// fragment's own point, as S3b's), the surface code from the span at s (the
// vertex shader finds the span at the segment's start, so the fragment walks
// only past a switch), the word as label_b.ts packs it. DEBUG_OUT's key is
// read back from gl_FragCoord.z.

import { FILL_TEXELS, TEX_W } from "./label_b";

/** Facets: a joint's wedge at most, a free end's half disc, a fill's half at most. */
export const TENT_NW = 3;
export const TENT_NC = 96;
export const TENT_NF = 24;
/** Vertices per instance (triangle strips). */
export const TENT_SEG_VERTS = 2 * TENT_NW + 6;
export const TENT_CAP_VERTS = 2 * TENT_NC + 1;
export const TENT_FILL_VERTS = 4 * TENT_NF + 6;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define TEX_W ${TEX_W}
#define FILL_TEXELS ${FILL_TEXELS}
#define NW ${TENT_NW}
#define NC ${TENT_NC}
#define NF ${TENT_NF}
uniform sampler2D uPts;
uniform sampler2D uChain;
uniform sampler2D uSpan;
uniform sampler2D uFill;
// world -> target px: u = m0.x x + m0.z y + m1.x, v = m0.y x + m0.w y + m1.y
uniform vec4 uM0;
uniform vec2 uM1;
// target px -> world (the fragment's p, as S3b's worldAt)
uniform vec4 uI0;
uniform vec2 uI1;
uniform vec2 uView;
uniform float uH;
uniform float uInvK;
uniform float uKeyScale;
// 0.25 / sqrt(eps), eps the facets' chord error target in world units
uniform float uFacetK;
vec4 fetch(sampler2D t, int i) {
  return texelFetch(t, ivec2(i % TEX_W, i / TEX_W), 0);
}
`;

// S3c's flats (VS_FLATS), the geometry (VS_GEOM) and the span search
// (VS_SPAN): VS_LIB is the three, the vertex-light tent's (VS_LIB_V) the
// geometry alone with one flat ivec3 (K1040 S3d).
const VS_FLATS = `
invariant gl_Position;
// The segment's a and b (a cap's or fill's point twice): the fragment's t is
// segT(p, a, b) from gl_FragCoord, exact as S3b's (an interpolated t carried
// the vertex snap, ~1/256 px, past the census's s tolerance).
flat out vec4 vAB;
// (sA, sB, s0, len): s = sA + t (sB - sA); the chain's s0 and len for the word
flat out vec4 vS;
// (chain, flags: 1 fill, 2 cap, 4 closed, the span index at sA, its code)
flat out ivec4 vI;
// (the next span's lo, 1e30 = none; the chain's span offset, span count)
flat out vec3 vSp;
`;

const VS_GEOM = `#ifdef DEBUG_OUT
out float vD;
#endif
// The one place a vertex is made: a corner two primitives share is P + N * o
// with the same P, N and o in both, so their edge matches bit for bit.
void emit(vec2 P, vec2 N, float o, float key) {
  vec2 w = P + N * o;
  vec2 dev = vec2(uM0.x * w.x + uM0.z * w.y + uM1.x, uM0.y * w.x + uM0.w * w.y + uM1.y);
  gl_Position = vec4(dev.x / uView.x * 2.0 - 1.0, 1.0 - dev.y / uView.y * 2.0, -2.0 * key * uKeyScale, 1.0);
#ifdef DEBUG_OUT
  vD = abs(o);
#endif
}
// The left normal of a -> b (CAPSULE_VS's nr).
vec2 nrm(vec2 a, vec2 b) {
  vec2 dv = b - a;
  float l = length(dv);
  vec2 u = l > 0.0 ? dv / l : vec2(1.0, 0.0);
  return vec2(-u.y, u.x);
}
// Facets for an arc of angle ang at radius rad: the balanced chord's error
// rad (1 - cos(d / 2)) / 2 ~ rad d^2 / 16 stays under eps, so d = 4
// sqrt(eps / rad) and the count is ang / d = ang sqrt(rad) uFacetK, at most
// nmax (clamped as a float: int() of a huge float is undefined). Written as
// a product, not a rounded quotient (K299): a count one off at an exact
// multiple would only move the chord error by a facet, and every vertex of
// an instance computes the same count from the same inputs.
int facets(float ang, float rad, int nmax) {
  return int(clamp(ceil(ang * sqrt(max(rad, 0.0)) * uFacetK), 1.0, float(nmax)));
}
// The balanced radius of an arc's inner vertices, facet angle d.
float balanced(float rad, float d) {
  return 2.0 * rad / (1.0 + cos(0.5 * d));
}
// Unit vector at fraction f from v0 to v1 (angle ang between them; ang > 0).
vec2 slerp2(vec2 v0, vec2 v1, float ang, float f) {
  return (sin((1.0 - f) * ang) * v0 + sin(f * ang) * v1) / sin(ang);
}
`;

const VS_SPAN = `// The chain's span holding s (spans sorted by lo, the first at s0): its
// index and code, and the next span's lo (1e30 if none).
void spanAt(vec4 c1, float s, out int idx, out int code, out float nextLo) {
  int so = int(c1.z);
  int ns = int(c1.w);
  int lo = 0;
  int hi = ns - 1;
  for (int it = 0; it < 16; it++) {
    if (lo >= hi) break;
    int mid = (lo + hi + 1) / 2;
    if (fetch(uSpan, so + mid).x <= s) lo = mid;
    else hi = mid - 1;
  }
  idx = lo;
  code = int(fetch(uSpan, so + lo).y);
  nextLo = lo + 1 < ns ? fetch(uSpan, so + lo + 1).x : 1e30;
}
void flats(int ci, int flags, float sA, float sB, vec4 c1, float sCode) {
  int idx;
  int code;
  float nextLo;
  spanAt(c1, sCode, idx, code, nextLo);
  vS = vec4(sA, sB, c1.x, c1.y);
  vI = ivec4(ci, flags, idx, code);
  vSp = vec3(nextLo, c1.z, c1.w);
}
`;

const VS_LIB = VS_FLATS + VS_GEOM + VS_SPAN;

// The segment's and the cap's main() up to the emit; each tent closes it with
// its own flats.
const SEG_MAIN = `in vec2 aSeg;
void main() {
  int ci = int(aSeg.x);
  int k = int(aSeg.y);
  vec4 c0 = fetch(uChain, 2 * ci);
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  int off = int(c0.x);
  int n = int(c0.y);
  int nseg = int(c0.z);
  bool closed = c0.w > 0.5;
  int kb = (k + 1 == n) ? 0 : k + 1;
  vec4 A = fetch(uPts, off + k);
  vec4 B = fetch(uPts, off + kb);
  vec2 nr = nrm(A.xy, B.xy);
  // The joint at a (a closed chain, or k > 0): the wedge on its convex side,
  // from the previous segment's corner (its own expression: P = a, N = its
  // normal, o = +-h) to this segment's. np is made unconditionally, by the
  // same call the previous instance made its nr with, so the corner matches.
  bool joint = closed || k > 0;
  vec2 Pp = fetch(uPts, off + (k > 0 ? k - 1 : closed ? nseg - 1 : 0)).xy;
  vec2 np = nrm(Pp, A.xy);
  float cr = np.x * nr.y - np.y * nr.x;
  float side = joint && cr > 0.0 ? -1.0 : 1.0;
  float phi = joint ? atan(abs(cr), dot(np, nr)) : 0.0;
  if (!joint) np = nr;
  int v = gl_VertexID;
  vec2 P = A.xy;
  vec2 N = vec2(0.0);
  float o = 0.0;
  float z = A.w;
  if (v < 2 * NW) {
    // The fan W0, a, W1, a, ..., W(NW-1), a; the strip's first vertex below is W(NW).
    if ((v & 1) == 0) {
      int i = v >> 1;
      int nf = facets(phi, uH, NW);
      if (i == 0) {
        N = np;
        o = side * uH;
      } else if (i >= nf) {
        N = nr;
        o = side * uH;
      } else {
        N = slerp2(side * np, side * nr, phi, float(i) / float(nf));
        o = balanced(uH, phi / float(nf));
      }
    }
  } else {
    // The side quads: a + side h n, b + side h n, a, b, a - side h n, b - side h n.
    int q = v - 2 * NW;
    if ((q & 1) == 1) {
      P = B.xy;
      z = B.w;
    }
    N = nr;
    o = q < 2 ? side * uH : q < 4 ? 0.0 : -side * uH;
  }
  emit(P, N, o, z - abs(o) * uInvK);
`;

const SEG_VS = `${HEAD}${VS_LIB}
${SEG_MAIN}  vAB = vec4(A.xy, B.xy);
  float sB = kb == 0 ? c1.x + c1.y : B.z;
  flats(ci, closed ? 4 : 0, A.z, sB, c1, A.z);
}
`;

const CAP_MAIN = `// (chain, end): 0 the start of an open chain, 1 its end.
in vec2 aSeg;
void main() {
  int ci = int(aSeg.x);
  bool atEnd = aSeg.y > 0.5;
  vec4 c0 = fetch(uChain, 2 * ci);
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  int off = int(c0.x);
  int nseg = int(c0.z);
  int k = atEnd ? nseg - 1 : 0;
  vec4 A = fetch(uPts, off + k);
  vec4 B = fetch(uPts, off + k + 1);
  vec2 nr = nrm(A.xy, B.xy);
  vec4 C = atEnd ? B : A;
  int v = gl_VertexID;
  vec2 N = vec2(0.0);
  float o = 0.0;
  // The fan R0, c, R1, c, ..., c, R(NC): from c + h n round the back (or
  // the front, at the end) to c - h n; the ends are the quad's corners.
  // Facets past nf collapse onto the last.
  if ((v & 1) == 0) {
    int nf = facets(3.14159265358979, uH, NC);
    int i = min(v >> 1, nf);
    if (i == 0) {
      N = nr;
      o = uH;
    } else if (i == nf) {
      N = nr;
      o = -uH;
    } else {
      float th = 3.14159265358979 * float(i) / float(nf);
      vec2 u = vec2(nr.y, -nr.x);
      N = nr * cos(th) + (atEnd ? u : -u) * sin(th);
      o = balanced(uH, 3.14159265358979 / float(nf));
    }
  }
  emit(C.xy, N, o, C.w - abs(o) * uInvK);
`;

const CAP_VS = `${HEAD}${VS_LIB}
${CAP_MAIN}  vAB = vec4(C.xy, C.xy);
  flats(ci, 2, C.z, C.z, c1, C.z);
}
`;

const FILL_VS = `${HEAD}${VS_LIB}
void main() {
  int fo = FILL_TEXELS * gl_InstanceID;
  vec4 f0 = fetch(uFill, fo);
  vec4 f1 = fetch(uFill, fo + 1);
  vec4 f2 = fetch(uFill, fo + 2);
  vec4 f3 = fetch(uFill, fo + 3);
  vec2 q = f0.xy;
  vec2 ra = normalize(f1.xy - q);
  vec2 rb = normalize(f1.zw - q);
  vec2 m = normalize(ra + rb);
  float hang = 0.5 * atan(abs(ra.x * rb.y - ra.y * rb.x), dot(ra, rb));
  int nf = facets(hang, f0.w, NF);
  float dl = hang / float(nf);
  // Half a: vertices 0 .. 2NF+1 (I0, O0, ..., I(NF), O(NF)), from the ray to
  // ta to the bisector; two bridge vertices; half b: 2NF+4 .. 4NF+5, from the
  // bisector to the ray to tb. Facets past nf collapse onto the last.
  int v = gl_VertexID;
  bool hb = v >= 2 * NF + 3;
  int w;
  if (v < 2 * NF + 2) w = v;
  else if (v == 2 * NF + 2) w = 2 * NF + 1;
  else if (v == 2 * NF + 3) w = 0;
  else w = v - (2 * NF + 4);
  int i = min(w >> 1, nf);
  bool outer = (w & 1) == 1;
  vec2 v0 = hb ? m : ra;
  vec2 v1 = hb ? rb : m;
  vec2 N = i == 0 ? v0 : i == nf ? v1 : slerp2(v0, v1, hang, float(i) / float(nf));
  bool rayEnd = hb ? i == nf : i == 0;
  float rad = outer ? f0.w : f0.z;
  float o = rayEnd ? rad : balanced(rad, dl);
  int ci = int(hb ? f3.y : f3.x);
  float key = (hb ? f2.y : f2.x) - uH * uInvK;
  emit(q, N, o, key);
  vAB = vec4(q, q);
  vec4 c0 = fetch(uChain, 2 * ci);
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  float s = hb ? f2.w : f2.z;
  vS = vec4(s, s, c1.x, c1.y);
  vI = ivec4(ci, 1 | (c0.w > 0.5 ? 4 : 0), 0, int(f3.z));
  vSp = vec3(1e30, c1.z, c1.w);
}
`;

const FS = `${HEAD}
flat in vec4 vAB;
flat in vec4 vS;
flat in ivec4 vI;
flat in vec3 vSp;
#ifdef DEBUG_OUT
in float vD;
#endif
layout(location = 0) out uint oWord;
#ifdef DEBUG_OUT
layout(location = 1) out vec4 oDbg;
#endif
void main() {
  vec2 dev = vec2(gl_FragCoord.x, uView.y - gl_FragCoord.y);
  vec2 p = vec2(uI0.x * dev.x + uI0.z * dev.y + uI1.x, uI0.y * dev.x + uI0.w * dev.y + uI1.y);
  vec2 ab = vAB.zw - vAB.xy;
  float l2 = dot(ab, ab);
  float t = l2 > 0.0 ? clamp(dot(p - vAB.xy, ab) / l2, 0.0, 1.0) : 0.0;
  float s = vS.x + t * (vS.y - vS.x);
  int code = vI.w;
  bool closed = (vI.y & 4) != 0;
  // Past the segment's span switch (or a closed chain's wrap): walk the spans.
  // A fill keeps its corner's code and s as they are (fillAt).
  int i0 = -1;
  if ((vI.y & 1) != 0) {
  } else if (closed && s >= vS.z + vS.w) {
    s -= vS.w;
    i0 = 0;
  } else if (s >= vSp.x) i0 = vI.z + 1;
  if (i0 >= 0) {
    int so = int(vSp.y);
    int ns = int(vSp.z);
    if (i0 == 0) code = int(fetch(uSpan, so).y);
    for (int i = max(i0, 1); i < 256; i++) {
      if (i >= ns) break;
      vec4 e = fetch(uSpan, so + i);
      if (e.x <= s) code = int(e.y);
      else break;
    }
  }
  uint s11 = uint(clamp((s - vS.z) / vS.w, 0.0, 1.0) * 2047.0 + 0.5);
  uint fl = uint(vI.y);
  oWord = uint(vI.x + 1) | (s11 << 8) | (uint(code) << 19) | ((fl & 1u) << 27) | (((fl >> 1) & 1u) << 28) | (((fl >> 2) & 1u) << 29);
#ifdef DEBUG_OUT
  oDbg = vec4((0.5 - gl_FragCoord.z) / uKeyScale, s, vD, float(fl & 1u));
#endif
}
`;

// K1040 S3d: the vertex-light tent (mode "tentv"). S3c's segment and cap
// vertex shaders found the span at the segment's start with a binary search
// per VERTEX (spanAt: up to 18 dependent fetches) and wrote 15 flat
// components; on the Pixel, S3d's step 1 priced the two at 2.8 ms (VS) and
// 2.2 ms (varyings), medians of the 12 scenes. Here the CPU finds each
// point's span once (tentSpanRecord, label_b_tent.ts: the same search on the
// same floats; table "ps", one texel per point, in nb's place), the vertex
// shaders write one flat ivec3 (the two points' indices; chain | flags << 8,
// flags 2 cap, 4 closed, 8 the closing segment, whose sB is s0 + len), and
// the fragment shader fetches what S3c's flats carried: the two points, the
// chain's c1 and the record at the first point. The geometry is S3c's
// (SEG_MAIN, CAP_MAIN: the same emit lines), the word S3c's arithmetic on the
// same values. Fills keep S3c's programs (their flats were already
// fetch-free).
const VS_LIB_V = `
invariant gl_Position;
// (the first point's index, the second's: a cap's point twice; chain | flags << 8)
flat out ivec3 vQ;
${VS_GEOM}`;

const SEG_VS_V = `${HEAD}${VS_LIB_V}
${SEG_MAIN}  vQ = ivec3(off + k, off + kb, ci | (((closed ? 4 : 0) | (kb == 0 ? 8 : 0)) << 8));
}
`;

const CAP_VS_V = `${HEAD}${VS_LIB_V}
${CAP_MAIN}  int ic = off + (atEnd ? k + 1 : k);
  vQ = ivec3(ic, ic, ci | (2 << 8));
}
`;

const FS_V = `${HEAD}
// Per point (the span index at its s, that span's code, the next span's lo
// (1e30 = none), 0).
uniform sampler2D uPs;
flat in ivec3 vQ;
#ifdef DEBUG_OUT
in float vD;
#endif
layout(location = 0) out uint oWord;
#ifdef DEBUG_OUT
layout(location = 1) out vec4 oDbg;
#endif
void main() {
  vec4 A = fetch(uPts, vQ.x);
  vec4 B = fetch(uPts, vQ.y);
  int ci = vQ.z & 255;
  int fl = vQ.z >> 8;
  vec4 c1 = fetch(uChain, 2 * ci + 1);
  vec4 sp = fetch(uPs, vQ.x);
  float sB = (fl & 8) != 0 ? c1.x + c1.y : B.z;
  vec2 dev = vec2(gl_FragCoord.x, uView.y - gl_FragCoord.y);
  vec2 p = vec2(uI0.x * dev.x + uI0.z * dev.y + uI1.x, uI0.y * dev.x + uI0.w * dev.y + uI1.y);
  vec2 ab = B.xy - A.xy;
  float l2 = dot(ab, ab);
  float t = l2 > 0.0 ? clamp(dot(p - A.xy, ab) / l2, 0.0, 1.0) : 0.0;
  float s = A.z + t * (sB - A.z);
  int code = int(sp.y);
  bool closed = (fl & 4) != 0;
  // Past the segment's span switch (or a closed chain's wrap): walk the spans.
  int i0 = -1;
  if (closed && s >= c1.x + c1.y) {
    s -= c1.y;
    i0 = 0;
  } else if (s >= sp.z) i0 = int(sp.x) + 1;
  if (i0 >= 0) {
    int so = int(c1.z);
    int ns = int(c1.w);
    if (i0 == 0) code = int(fetch(uSpan, so).y);
    for (int i = max(i0, 1); i < 256; i++) {
      if (i >= ns) break;
      vec4 e = fetch(uSpan, so + i);
      if (e.x <= s) code = int(e.y);
      else break;
    }
  }
  uint s11 = uint(clamp((s - c1.x) / c1.y, 0.0, 1.0) * 2047.0 + 0.5);
  uint f = uint(fl & 7);
  oWord = uint(ci + 1) | (s11 << 8) | (uint(code) << 19) | ((f & 1u) << 27) | (((f >> 1) & 1u) << 28) | (((f >> 2) & 1u) << 29);
#ifdef DEBUG_OUT
  oDbg = vec4((0.5 - gl_FragCoord.z) / uKeyScale, s, vD, float(f & 1u));
#endif
}
`;

export interface LabelBTentSources {
  segVs: string;
  capVs: string;
  fillVs: string;
  fs: string;
}

export function labelBTentSources(debugOut: boolean): LabelBTentSources {
  const def = (s: string) => (debugOut ? s.replace("#version 300 es\n", "#version 300 es\n#define DEBUG_OUT 1\n") : s);
  return { segVs: def(SEG_VS), capVs: def(CAP_VS), fillVs: def(FILL_VS), fs: def(FS) };
}

/** The vertex-light tent's segment and cap programs (K1040 S3d; its fills are labelBTentSources'). */
export interface LabelBTentVSources {
  segVs: string;
  capVs: string;
  fs: string;
}

// K1040 S3f3 lever 2: one continuous strip per chain run, drawn
// non-instanced (label_b_pass.ts builds the vertex buffer on layout
// changes). Each chain point contributes its cross-section twice, once
// closing the previous segment's quad and once opening the next one's,
// because tentv's fragment shader takes its segment from a flat vQ and
// a strip triangle's provoking vertex is its last: both of a quad's
// triangles provoke on the closing pair, which carries that segment's
// (A, B, chain|flags). The duplicates and the two vertices joining
// chains are degenerate. The cross-section's corner is the two
// segments' mitre (the bisector at h / cos(phi/2), clamped), where
// today's per-segment tents put a wedge arc on the convex side and the
// quad corner on the concave: the strip's outline is the mitred
// polygon through the same centre points, keyed z - |o| / K at the
// corner as today's emit keys its corners. The fragment shader is
// tentv's (FS_V above), unchanged.
const STRIP_VS = `${HEAD}${VS_LIB_V}
in vec4 aSeg;
in vec4 aInfo;
void main() {
  int self = int(aSeg.x);
  int prev = int(aSeg.y);
  int next = int(aSeg.z);
  float side = aSeg.w;
  vec4 A = fetch(uPts, self);
  vec4 Pp = fetch(uPts, prev);
  vec4 Pn = fetch(uPts, next);
  vec2 np = prev == self ? nrm(A.xy, Pn.xy) : nrm(Pp.xy, A.xy);
  vec2 nr = next == self ? np : nrm(A.xy, Pn.xy);
  vec2 bis = np + nr;
  float bl = length(bis);
  bis = bl > 1e-6 ? bis / bl : np;
  float cosHalf = clamp(sqrt(max(0.5 * (1.0 + dot(np, nr)), 0.0)), 0.25, 1.0);
  float o = side * uH / cosHalf;
  emit(A.xy, bis, o, A.w - abs(o) * uInvK);
  vQ = ivec3(int(aInfo.x), int(aInfo.y), int(aInfo.z));
}
`;

/** The strip segment program for lever 2 (its fragment shader is labelBTentVSources'). */
export function labelBTentStripSources(debugOut: boolean): { segVs: string } {
  const def = (s: string) => (debugOut ? s.replace("#version 300 es\n", "#version 300 es\n#define DEBUG_OUT 1\n") : s);
  return { segVs: def(STRIP_VS) };
}

export function labelBTentVSources(debugOut: boolean): LabelBTentVSources {
  const def = (s: string) => (debugOut ? s.replace("#version 300 es\n", "#version 300 es\n#define DEBUG_OUT 1\n") : s);
  return { segVs: def(SEG_VS_V), capVs: def(CAP_VS_V), fs: def(FS_V) };
}

// K1040 S3f4 (ftentvvid): tentv's segment strips as one non-instanced
// draw. The vertex shader is tentv's, with the corner taken from
// gl_VertexID modulo the strip length (in the instanced draw
// gl_VertexID is already the corner, 0..2*NW+5); the pass feeds aSeg
// per vertex (divisor 0) and separates the strips with an index
// buffer's primitive restart, so every position is bit-identical to
// the instanced draw's. Its fragment shader is tentv's (FS_V).
export function labelBTentVidSources(debugOut: boolean): { segVs: string } {
  const sv = labelBTentVSources(debugOut);
  const a = "int v = gl_VertexID;";
  if (sv.segVs.split(a).length !== 2) throw new Error("vid: gl_VertexID line not found once in tentv's segVs");
  return { segVs: sv.segVs.replace(a, "int v = gl_VertexID % (2 * NW + 6);") };
}
