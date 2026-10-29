// K868 S3a2: the label pass's shaders (module map: label_app.ts). Two
// programs, each compiled PACKED (one R32UI word) or WIDE (RGBA32UI, the
// probes' 128-bit form) by a #define:
//
//   PACKED  bits 0-7 chain + 1 (0 = paper), 8-18 s11 = round((s - s0) /
//           len * 2047), 19-26 cluster + 1 (0 = none), 27 fill, 28 cap,
//           29 closed, 30-31 reserved (K943)
//   WIDE    x = chain + 1 | fill << 16 | cap << 17 | closed << 18,
//           y = s (float bits), z = cluster + 1, w = z (float bits)
//
// PACKED tubes also write s exactly (float bits) to a second target, S
// (R32UI, K868 S3a3): the fill pass's yield reads it there, not the 11-bit
// s of the word.
//
// z is not in the packed word: the depth buffer (D2, DEPTH_COMPONENT32F)
// carries it. Tubes write 0.5 - v and fills 0.09 * (0.5 - v), with
// v = 0.45 zn + 2e-4 rank / nKeys + 2e-6 s / smax (S3a v6's tube depth),
// so a fill that passes its tests is in front of every tube, and a depth
// above LABEL_FILL_DEPTH_MAX is a tube's.
//
// The camera is uM, world to device pixels, with row 0 the canvas's TOP
// row (gl_FragCoord.y = device y): a pass reading the label at a canvas
// pixel fetches row y, not height - 1 - y.

/** Fills' depths lie below this, tubes' above it. */
export const LABEL_FILL_DEPTH_MAX = 0.047;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
`;

export const TUBE_VS = `${HEAD}
in vec4 aAB; in vec4 aS; in vec4 aK; in vec4 aN; in vec2 aC;
uniform mat3 uM; uniform vec2 uSize; uniform float uH;
out vec2 vP; flat out vec4 vAB; flat out vec4 vS; flat out vec4 vK; flat out vec4 vN; flat out vec2 vC;
void main() {
  vec2 a = aAB.xy, b = aAB.zw, d = b - a; float L = length(d);
  vec2 u = L > 1e-9 ? d / L : vec2(1.0, 0.0); vec2 n = vec2(-u.y, u.x);
  float r = uH * 1.05 + 1e-3; int id = gl_VertexID;
  vec2 p = id == 0 ? a - u * r - n * r : id == 1 ? b + u * r - n * r : id == 2 ? a - u * r + n * r : b + u * r + n * r;
  vP = p; vAB = aAB; vS = aS; vK = aK; vN = aN; vC = aC;
  vec2 dev = (uM * vec3(p, 1.0)).xy;
  gl_Position = vec4(dev / uSize * 2.0 - 1.0, 0.0, 1.0);
}`;

export const TUBE_FS = `${HEAD}
uniform float uH; uniform float uEps; uniform float uZmin; uniform float uZinv; uniform float uRinv; uniform float uSinv;
in vec2 vP; flat in vec4 vAB; flat in vec4 vS; flat in vec4 vK; flat in vec4 vN; flat in vec2 vC;
#ifdef PACKED
layout(location = 0) out uint o;
layout(location = 1) out uint oS;
#else
out uvec4 o;
#endif
void main() {
  vec2 a = vAB.xy, b = vAB.zw, d = b - a; float L2 = dot(d, d);
  float tr = L2 > 0.0 ? dot(vP - a, d) / L2 : 0.5;
  // S3a v5's local-minimum clip, EPS of overlap (a twentieth of a pixel).
  float eL = uEps / max(sqrt(L2), 1e-9);
  if (tr > 1.0 + eL && (vN.z < 0.5 || (vN.z < 1.5 && dot(vP - b, vN.xy) >= uEps))) discard;
  if (tr < -eL && vN.w < 1.5) discard;
  float t = clamp(tr, 0.0, 1.0); vec2 f = a + d * t; if (length(vP - f) >= uH) discard;
  float s = mix(vS.x, vS.y, t); float z = mix(vS.z, vS.w, t);
  gl_FragDepth = 0.5 - 0.45 * (z - uZmin) * uZinv - 2e-4 * vK.z * uRinv - 2e-6 * s * uSinv;
  uint chain = uint(vK.x + 0.5) + 1u;
  uint cl = uint(vK.y + 1.5);
  uint closed = uint(vK.w + 0.5) & 1u;
  uint cap = ((tr > 1.0 && vN.z > 1.5) || (tr < 0.0 && vN.w > 1.5)) ? 1u : 0u;
#ifdef PACKED
  uint s11 = uint(clamp((s - vC.x) * vC.y, 0.0, 1.0) * 2047.0 + 0.5);
  o = chain | (s11 << 8) | (cl << 19) | (cap << 28) | (closed << 29);
  oS = floatBitsToUint(s);
#else
  o = uvec4(chain | (cap << 17) | (closed << 18), floatBitsToUint(s), cl, floatBitsToUint(z));
#endif
}`;

export const FILL_VS = `${HEAD}
in vec4 aQ; in vec4 aU; in vec4 aJ; in vec4 aO; in vec2 aX;
uniform mat3 uM; uniform vec2 uSize;
out vec2 vP; flat out vec4 vQ; flat out vec4 vU; flat out vec4 vJ; flat out vec4 vO; flat out vec2 vX;
void main() {
  float R = aQ.w * 1.02 + 1e-3; int id = gl_VertexID;
  vec2 p = aQ.xy + vec2((id == 1 || id == 3) ? R : -R, id >= 2 ? R : -R);
  vP = p; vQ = aQ; vU = aU; vJ = aJ; vO = aO; vX = aX;
  vec2 dev = (uM * vec3(p, 1.0)).xy;
  gl_Position = vec4(dev / uSize * 2.0 - 1.0, 0.0, 1.0);
}`;

/** K868 S3a8a: plateauDepth over the pin table (label_tables.ts refDepth),
 * shared by the GPU tubes and, with the GPU pieces on, the fills. Needs tb(),
 * uWin and uRho. */
const PLATEAU_GLSL = `float hat(float z, float d, float w) {
  if (w <= 1e-12) return d <= 0.0 ? z : 0.0;
  return d >= w ? 0.0 : z * (1.0 - d / w);
}
float trap(float z, float d, float r, float w) { return d <= r ? z : hat(z, d - r, w); }
float pairDepth(float zL, float sL, float aL, float zR, float sR, float aR, float u) {
  float g = sR - sL; float a = aL; float b = aR;
  if (zL == zR) { if (a + b >= g) return zL; }
  else if (a + b > 0.0) { float k = min(1.0, max(0.0, g - uRho) / (a + b)); a *= k; b *= k; }
  float w = min(uWin, g - a - b);
  return trap(zL, u - sL, a, w) + trap(zR, sR - u, b, w);
}
// plateauDepth over the pin table (s, z, rL, rR): refDepth.
float depthAt(vec4 c0, vec4 c1, float s0, float s) {
  int pb = int(c1.z + 0.5), n = int(c1.w + 0.5);
  if (n == 0) return 0.0;
  bool closed = c0.z > 0.5; float len = c0.w;
  float u = s;
  if (closed) { u = u - s0; u = u - len * floor(u / len); u = u + s0; }
  int lo = -1, hi = n;
  while (hi - lo > 1) { int mid = (lo + hi) >> 1; if (tb(pb + mid).x <= u) lo = mid; else hi = mid; }
  if (closed) {
    int iL = lo < 0 ? n - 1 : lo; int iR = lo + 1 >= n ? 0 : lo + 1;
    vec4 PL = tb(pb + iL), PR = tb(pb + iR);
    float sL = lo < 0 ? PL.x - len : PL.x;
    float sR = lo + 1 >= n ? PR.x + len : PR.x;
    if (n == 1) return trap(PL.y, min(u - sL, sR - u), max(PL.z, PL.w), min(uWin, len * 0.5));
    return pairDepth(PL.y, sL, PL.w, PR.y, sR, PR.z, u);
  }
  if (lo < 0) { vec4 P0 = tb(pb); return trap(P0.y, P0.x - u, P0.z, uWin); }
  if (lo + 1 >= n) { vec4 Pn = tb(pb + n - 1); return trap(Pn.y, u - Pn.x, Pn.w, uWin); }
  vec4 PL = tb(pb + lo), PR = tb(pb + lo + 1);
  return pairDepth(PL.y, PL.x, PL.w, PR.y, PR.x, PR.z, u);
}`;

export const FILL_FS = `${HEAD}
uniform sampler2D uData; uniform usampler2D uT;
#ifdef PACKED
uniform usampler2D uS;
#endif
#ifdef GPU_FILLS
uniform sampler2D uTbl; uniform float uWin; uniform float uRho;
#endif
uniform float uH; uniform float uSigma; uniform float uZmin; uniform float uZinv; uniform float uRinv; uniform float uSinv;
in vec2 vP; flat in vec4 vQ; flat in vec4 vU; flat in vec4 vJ; flat in vec4 vO; flat in vec2 vX;
#ifdef PACKED
out uint o;
#else
out uvec4 o;
#endif
const int DW = DATA_W;
vec4 tx(int i) { return texelFetch(uData, ivec2(i % DW, i / DW), 0); }
float cr(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
#ifdef GPU_FILLS
vec4 tb(int i) { return texelFetch(uTbl, ivec2(i % TBL_W, i / TBL_W), 0); }
${PLATEAU_GLSL}
// K868 S3a8a, the GPU pieces on: footInWindow over one record per segment
// piece, (ta, tb, chain, k) then (tx, ty, 0, 0). The segment and its s come
// from the tables, so the foot's s is the GPU tube's s[k] + t segLen[k]
// (the same clamp of the same dot product inside [ta, tb]) and its depth
// the tube's exact plateau depth at that s.
void foot(int off, int cnt, vec2 P, out float fd, out vec2 fp, out vec2 ft, out float fs, out float fz, out float fc) {
  fd = 1e30; fp = vec2(0.0); ft = vec2(0.0); fs = 0.0; fz = 0.0; fc = -1.0;
  for (int i = 0; i < cnt; i++) {
    int r = off + i * 2;
    vec4 w = tx(r);
    int ci = int(w.z + 0.5);
    int pk = int(tb(3 * ci).x + 0.5) + int(w.w + 0.5);
    vec4 A = tb(pk);
    vec2 a = A.xy, d = tb(pk + 1).xy - a; float L2 = dot(d, d);
    float t = L2 > 0.0 ? clamp(dot(P - a, d) / L2, w.x, w.y) : w.x;
    vec2 c = a + d * t; float dd = length(P - c);
    if (dd < fd) { fd = dd; fp = c; ft = tx(r + 1).xy; fs = A.z + t * A.w; fc = w.z; }
  }
  if (fc >= 0.0) { int ci = int(fc + 0.5); fz = depthAt(tb(3 * ci), tb(3 * ci + 1), tb(3 * ci + 2).x, fs); }
}
#else
// footInWindow over one arm window's records: the nearest foot, the first
// on a tie; d = 1e30 when the window is empty.
void foot(int off, int cnt, vec2 P, out float fd, out vec2 fp, out vec2 ft, out float fs, out float fz, out float fc) {
  fd = 1e30; fp = vec2(0.0); ft = vec2(0.0); fs = 0.0; fz = 0.0; fc = -1.0;
  for (int i = 0; i < cnt; i++) {
    int r = off + i * 3;
    vec4 ab = tx(r); vec4 sz = tx(r + 1); vec4 tc = tx(r + 2);
    vec2 a = ab.xy, d = ab.zw - ab.xy; float L2 = dot(d, d);
    float t = L2 > 0.0 ? clamp(dot(P - a, d) / L2, 0.0, 1.0) : 0.0;
    vec2 c = a + d * t; float dd = length(P - c);
    if (dd < fd) { fd = dd; fp = c; ft = tc.xy; fs = mix(sz.x, sz.y, t); fz = mix(sz.z, sz.w, t); fc = tc.z; }
  }
}
#endif
void main() {
  // inFill (g1): the ring between r and vq + h, inside both arm directions,
  // left of arm A's outgoing direction and right of arm B's.
  vec2 v = vP - vQ.xy; float dq = length(v);
  if (dq < vQ.z || dq > vQ.w) discard;
  float sg = vJ.z;
  if (cr(vU.xy, v) * sg < 0.0) discard;
  if (cr(v, vU.zw) * sg < 0.0) discard;
  float ad; vec2 ap; vec2 at; float asv; float az; float ac;
  foot(int(vO.x + 0.5), int(vO.y + 0.5), vP, ad, ap, at, asv, az, ac);
  if (ad < 1e29 && cr(at, vP - ap) < 0.0) discard;
  float bd; vec2 bp; vec2 bt; float bsv; float bz; float bc;
  foot(int(vO.z + 0.5), int(vO.w + 0.5), vP, bd, bp, bt, bsv, bz, bc);
  if (bd < 1e29 && cr(bt, vP - bp) > 0.0) discard;
  // The tube label under the fill (a copy of pass 1's target).
  int J = int(vJ.x + 0.5);
  uvec4 T = texelFetch(uT, ivec2(gl_FragCoord.xy), 0);
#ifdef PACKED
  int tch = int(T.x & 255u) - 1;
  int tcl = int((T.x >> 19) & 255u) - 1;
#else
  int tch = int(T.x & 65535u) - 1;
  int tcl = int(T.z) - 1;
#endif
  if (tch >= 0) {
    if (tcl == J) discard;
#ifdef PACKED
    float ts = uintBitsToFloat(texelFetch(uS, ivec2(gl_FragCoord.xy), 0).x);
#else
    float ts = uintBitsToFloat(T.y);
#endif
    // fillOrder: the nearest of this cluster's crossings on T's chain
    // within sigma decides; the fill wins only if T's chain is under there.
    float best = 1e30; bool wins = false;
    int xo = int(vX.x + 0.5), xn = int(vX.y + 0.5);
    for (int i = 0; i < xn; i++) {
      vec4 e = tx(xo + i);
      if (int(e.x + 0.5) != tch) continue;
      float dd = ts - e.y;
      if (e.w > 0.0) dd = mod(dd + 0.5 * e.w, e.w) - 0.5 * e.w;
      dd = abs(dd);
      if (dd <= uSigma && dd < best) { best = dd; wins = e.z < 0.5; }
    }
    if (!wins) discard;
  }
  // The label: the nearer arm foot (the oracle's nearest member of J).
  bool useA = ad <= bd;
  float fd = useA ? ad : bd; float fs = useA ? asv : bsv; float fz = useA ? az : bz; float fc = useA ? ac : bc;
  if (fc < 0.0) discard;
  gl_FragDepth = 0.09 * (0.5 - 0.45 * (fz - uZmin) * uZinv - 2e-4 * vJ.y * uRinv - 2e-6 * fs * uSinv);
  int chi = int(fc + 0.5);
  vec4 cht = tx(chi);
  uint chain = uint(chi) + 1u;
  uint cl = uint(J) + 1u;
  uint fill = fd >= uH ? 1u : 0u;
  uint closed = cht.z > 0.5 ? 1u : 0u;
#ifdef PACKED
  uint s11 = uint(clamp((fs - cht.x) / max(cht.y, 1e-9), 0.0, 1.0) * 2047.0 + 0.5);
  o = chain | (s11 << 8) | (cl << 19) | (fill << 27) | (closed << 29);
#else
  o = uvec4(chain | (fill << 16) | (closed << 18), floatBitsToUint(fs), cl, floatBitsToUint(fz));
#endif
}`;

/** K868 S3a7, the GPU pieces (labelGpu): one tube instance per chain
 * segment (aSeg = the chain's row, k), placed from the segment's two points
 * in the tables (label_tables.ts), with buildLabelPieces' end kinds (the
 * joint to the next non-degenerate segment, an open chain's caps). Per
 * fragment: s = s[k] + t segLen[k], the cluster and rank from the span
 * table, the exact depth (plateauDepth over the pin table), then TUBE_FS's
 * depth formula and words. label_tables.ts refS, refCluster and refDepth
 * are its float32 reference, line for line. Master's pieces overlap by
 * uEps at interior piece ends; these switch cluster exactly at the span
 * bounds. */
export const GPU_TUBE_VS = `${HEAD}
uniform sampler2D uTbl;
in vec2 aSeg;
uniform mat3 uM; uniform vec2 uSize; uniform float uH;
out vec2 vP; flat out vec4 vAB; flat out vec4 vN; flat out ivec2 vSeg;
vec4 tb(int i) { return texelFetch(uTbl, ivec2(i % TBL_W, i / TBL_W), 0); }
void main() {
  int ci = int(aSeg.x + 0.5), k = int(aSeg.y + 0.5);
  vec4 c0 = tb(3 * ci);
  int pt = int(c0.x + 0.5), nseg = int(c0.y + 0.5);
  bool closed = c0.z > 0.5;
  vec2 a = tb(pt + k).xy, b = tb(pt + k + 1).xy;
  // buildLabelPieces' end kind: the next segment with a direction (1), or
  // an open chain's last end (2).
  float endKind = 1.0; vec2 nx = vec2(0.0);
  for (int j = 1; j <= 8; j++) {
    int kn = k + j;
    if (kn >= nseg) {
      if (!closed) { endKind = 2.0; break; }
      kn -= nseg;
      if (kn >= nseg) continue;
    }
    vec2 dd = tb(pt + kn + 1).xy - tb(pt + kn).xy; float l = length(dd);
    if (l > 1e-9) { nx = dd / l; break; }
  }
  float startKind = !closed && k == 0 ? 2.0 : 0.0;
  vec2 d = b - a; float L = length(d);
  vec2 u = L > 1e-9 ? d / L : vec2(1.0, 0.0); vec2 n = vec2(-u.y, u.x);
  float r = uH * 1.05 + 1e-3; int id = gl_VertexID;
  vec2 p = id == 0 ? a - u * r - n * r : id == 1 ? b + u * r - n * r : id == 2 ? a - u * r + n * r : b + u * r + n * r;
  vP = p; vAB = vec4(a, b); vN = vec4(nx, endKind, startKind); vSeg = ivec2(ci, k);
  vec2 dev = (uM * vec3(p, 1.0)).xy;
  gl_Position = vec4(dev / uSize * 2.0 - 1.0, 0.0, 1.0);
}`;

export const GPU_TUBE_FS = `${HEAD}
uniform sampler2D uTbl;
uniform float uH; uniform float uEps; uniform float uZmin; uniform float uZinv; uniform float uRinv; uniform float uSinv;
uniform float uWin; uniform float uRho;
in vec2 vP; flat in vec4 vAB; flat in vec4 vN; flat in ivec2 vSeg;
#ifdef PACKED
layout(location = 0) out uint o;
layout(location = 1) out uint oS;
#else
out uvec4 o;
#endif
vec4 tb(int i) { return texelFetch(uTbl, ivec2(i % TBL_W, i / TBL_W), 0); }
${PLATEAU_GLSL}
void main() {
  vec2 a = vAB.xy, b = vAB.zw, d = b - a; float L2 = dot(d, d);
  float tr = L2 > 0.0 ? dot(vP - a, d) / L2 : 0.5;
  // TUBE_FS's ends: EPS of overlap at the start, the joint's outer side.
  float eL = uEps / max(sqrt(L2), 1e-9);
  if (tr > 1.0 + eL && (vN.z < 0.5 || (vN.z < 1.5 && dot(vP - b, vN.xy) >= uEps))) discard;
  if (tr < -eL && vN.w < 1.5) discard;
  float t = clamp(tr, 0.0, 1.0); vec2 f = a + d * t; if (length(vP - f) >= uH) discard;
  int ci = vSeg.x;
  vec4 c0 = tb(3 * ci), c1 = tb(3 * ci + 1), c2 = tb(3 * ci + 2);
  vec4 A = tb(int(c0.x + 0.5) + vSeg.y);
  // refS, refCluster (an open chain clamps s into [s0, s0 + len]).
  float s = A.z + t * A.w;
  bool closedB = c0.z > 0.5;
  float u = closedB ? s : min(max(s, c2.x), c2.x + c0.w);
  int sb = int(c1.x + 0.5), lo = 0, hi = int(c1.y + 0.5) - 1;
  while (lo < hi) { int mid = (lo + hi + 1) >> 1; if (tb(sb + mid).x <= u) lo = mid; else hi = mid - 1; }
  vec4 sp = tb(sb + lo);
  float z = depthAt(c0, c1, c2.x, s);
  gl_FragDepth = 0.5 - 0.45 * (z - uZmin) * uZinv - 2e-4 * sp.z * uRinv - 2e-6 * s * uSinv;
  uint chain = uint(ci) + 1u;
  uint cl = uint(sp.y + 1.5);
  uint closed = closedB ? 1u : 0u;
  uint cap = ((tr > 1.0 && vN.z > 1.5) || (tr < 0.0 && vN.w > 1.5)) ? 1u : 0u;
#ifdef PACKED
  uint s11 = uint(clamp((s - c2.x) * c2.y, 0.0, 1.0) * 2047.0 + 0.5);
  o = chain | (s11 << 8) | (cl << 19) | (cap << 28) | (closed << 29);
  oS = floatBitsToUint(s);
#else
  o = uvec4(chain | (cap << 17) | (closed << 18), floatBitsToUint(s), cl, floatBitsToUint(z));
#endif
}`;

/** K868 S3a8a: keeps one side of each `#ifdef GPU_FILLS` block (the side
 * this program compiles), so a fill program carries only its own foot (K320:
 * no dead text); without GPU_FILLS the text is S3a7's, char for char. The
 * blocks hold no nested directive. */
function gpuFillsText(src: string, on: boolean): string {
  return src.replace(/#ifdef GPU_FILLS\n([\s\S]*?)(?:#else\n([\s\S]*?))?#endif\n/g, (_m, a: string, b: string | undefined) => (on ? a : (b ?? "")));
}

/** The two programs' sources for one mode. */
export function labelSources(packed: boolean, dataW: number, gpuFills = false, tblW = 0): { tubeVs: string; tubeFs: string; fillVs: string; fillFs: string } {
  const gf = gpuFills ? `#define GPU_FILLS 1\n#define TBL_W ${tblW}\n` : "";
  const def = (src: string): string =>
    src.replace("precision highp usampler2D;\n", `precision highp usampler2D;\n${packed ? "#define PACKED 1\n" : ""}#define DATA_W ${dataW}\n${gf}`);
  return { tubeVs: def(TUBE_VS), tubeFs: def(TUBE_FS), fillVs: def(FILL_VS), fillFs: gpuFillsText(def(FILL_FS), gpuFills) };
}

/** The GPU pieces' tube program for one mode (K868 S3a7). */
export function labelGpuSources(packed: boolean, tblW: number): { tubeVs: string; tubeFs: string } {
  const def = (src: string): string =>
    src.replace("precision highp usampler2D;\n", `precision highp usampler2D;\n${packed ? "#define PACKED 1\n" : ""}#define TBL_W ${tblW}\n`);
  return { tubeVs: def(GPU_TUBE_VS), tubeFs: def(GPU_TUBE_FS) };
}
