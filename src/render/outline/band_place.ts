// K1247 s23 (ob=1): main places the band's tied runs and ghosts, once per reply, by transform feedback
// (outline_app placeBand), as REC_PLACE_VS places the fill's records. The worker sends band_rec's
// per-piece table (BT texels a diagram piece), the quads it still placed itself (faded runs and the
// pieces without records, compact) and the fan-step prefix; this shader writes every band vertex of the
// fixed layout (6 Q) in band_rec's CPU order, which BAND_VS then draws unchanged:
// - a record quad i joins columns i and i + 1: colAt at h outside and h - W inside (REC_GLSL's recCol),
//   columns 0 and N from the table (today's end points); s as the CPU's sa = sv[i], sb = sa + dSC(sa,
//   sv[i + 1]); z = zAtC (recZ); its slots: the chain's passes whose lo/hi + h window meets [sa, sb]
//   (band_rec's cand filter first), at most BAND_SLOTS. Past BAND_SLOTS (band_rec counts those quads in
//   `dropped`) it keeps, as the CPU and today do, the passes whose other thread is nearest the quad's
//   outer midpoint (footNear, bpNear here; s24).
// - a worker-placed quad is copied from uBpFb; the rest of its piece's range is zero-area padding.
// The table (band_rec.ts writes it), per diagram piece d at texel BT d:
//   0 (mode, a, b, c): mode 0 absent; 1 worker-placed (a: first quad in uBpFb, b: quads, c: chain);
//     2 record (a: chain, b: N, c: side)
//   1 (s0, dS, first global pass, passes)   2, 3: column 0, column N (outer x, y, inner x, y)
//   4 (s of column 0, s of column N, the columns' s span, the piece's first quad off[d])
//   5, 6 (v, a0, dA, n): the run-end arcs (band_rec endFans), n 0 none: columns 1..nS are the start arc's
//     points j = 0..nS - 1, columns N - nE..N - 1 the end arc's, point j at chain vertex v + r (cos, sin)(a0 +
//     j dA) (r = h, or h - W inside; texel 5's n -1: a two-point piece, every column lerps the ends); colAt places the columns between (its own ends too where an arc takes
//     over: nS + 1..N - nE - 1, NM = N - (nS + 1) - (nE + 1)) over texel 1's span
//   7 (s of the start arc's vertex, s of the end arc's vertex, sh, eh): s24, band_rec rowShift: sh 1 when there is
//     no start arc and colAt's row would give its first vertex column 0 (the row then starts at column 1), eh 1 when
//     there is no end arc and its last fan point would be column N (the row then ends at column N - 1)
import { REC_GLSL } from "./rec_glsl";

export const BT = 8;
const W = 1024; // band_gpu.BAND_TEX_W
const PT = 4; // band_gpu.PT

const glsl = REC_GLSL.replace("layout(location=6) in ivec2 aRec;", "const ivec2 aRec = ivec2(-1, 0);").replace("uniform float uRecHW;", "float uRecHW = 0.0;");
if (!glsl.includes("const ivec2 aRec") || !glsl.includes("float uRecHW = 0.0;")) throw new Error("band_place: REC_GLSL changed");

const BP_HEAD = `#version 300 es
precision highp float;
precision highp int;
${glsl}
uniform highp sampler2D uBpTab;
uniform highp sampler2D uBpFb;
uniform highp sampler2D uBpSl;
uniform highp sampler2D uBpPass;
uniform int uBpND;
uniform float uBpH;
uniform float uBpW;
`;
const BP_LIB = `
// draw.ts dSC: b - a, on a loop wrapped into (-L/2, L/2].
float bpD(float L, float a, float b) { float d = b - a; if (L > 0.0) { d = mod(d, L); if (d > L / 2.0) d -= L; } return d; }
// K1247 s24: draw.ts footNear(O, p, sC, r, 0, 0).d on chain texels ob.. (on vertices, oL its closed length or
// -1 open): the segments of [first(a), s <= b] whose arc span meets [sC - r, sC + r]. 1e30 when none.
int bpFirst(int ob, int segs, float u) {
  if (recT(uRecChain, ob).z > u) return 0;
  int lo = 0; int hi = segs - 1;
  while (hi > lo) { int m = (lo + hi + 1) >> 1; if (recT(uRecChain, ob + m).z <= u) lo = m; else hi = m - 1; }
  return lo;
}
float bpRange(int ob, int on, int segs, float oL, vec2 p, float sC, float r, float a, float b, float best) {
  for (int k = bpFirst(ob, segs, a); k < segs; k++) {
    vec4 A = recT(uRecChain, ob + k); if (A.z > b) break;
    int j = k + 1 == on ? 0 : k + 1; vec4 B = recT(uRecChain, ob + j);
    float lk = j == 0 ? oL - A.z : B.z - A.z;
    if (abs(bpD(oL, sC, A.z + lk / 2.0)) > r + lk / 2.0) continue;
    vec2 e = B.xy - A.xy; float l2 = dot(e, e);
    float t = l2 > 0.0 ? clamp(dot(p - A.xy, e) / l2, 0.0, 1.0) : 0.0;
    float d = length(p - A.xy - t * e);
    if (d < best) best = d;
  }
  return best;
}
float bpNear(int ob, int on, float oL, vec2 p, float sC, float r) {
  int segs = oL > 0.0 ? on : on - 1; float best = 1e30;
  if (segs <= 0) return best;
  if (oL > 0.0) {
    if (2.0 * r >= oL) return bpRange(ob, on, segs, oL, p, sC, r, -1e30, 1e30, best);
    float a = mod(sC - r, oL); float b = a + 2.0 * r;
    if (b <= oL) return bpRange(ob, on, segs, oL, p, sC, r, a, b, best);
    best = bpRange(ob, on, segs, oL, p, sC, r, a, oL, best);
    return bpRange(ob, on, segs, oL, p, sC, r, 0.0, b - oL, best);
  }
  return bpRange(ob, on, segs, oL, p, sC, r, sC - r, sC + r, best);
}
`;

// s23's per-vertex placement: every vertex places its own column (6 per quad, 12 column evaluations a
// quad); s25 keeps it only as the twin's reference (k1247s25_twin.ts runs both).
export const BAND_PLACE_VS = `${BP_HEAD}
out vec2 tPos;
out vec4 tA;
flat out int tCh;
flat out ivec4 tSl;
${BP_LIB}
// Column k of record piece o (x, y, s): the table's ends, else colAt at hh.
vec3 bpCol(int o, int b, int n, float L, vec4 t1, int N, float sgn, int k, bool inner) {
  if (k == 0) { vec4 e = recT(uBpTab, o + 2); return vec3(inner ? e.zw : e.xy, recT(uBpTab, o + 4).x); }
  if (k == N) { vec4 e = recT(uBpTab, o + 3); return vec3(inner ? e.zw : e.xy, recT(uBpTab, o + 4).y); }
  uRecHW = inner ? uBpH - uBpW : uBpH;
  vec4 fS = recT(uBpTab, o + 5); vec4 fE = recT(uBpTab, o + 6); int nS = int(fS.w); int nE = int(fE.w);
  if (nS < 0) { vec4 e0 = recT(uBpTab, o + 2); vec4 e1 = recT(uBpTab, o + 3); vec2 s01 = recT(uBpTab, o + 4).xy; float t = float(k) / float(N); return vec3(mix(inner ? e0.zw : e0.xy, inner ? e1.zw : e1.xy, t), mix(s01.x, s01.y, t)); }
  if (nS > 0 && k <= nS) { float a = fS.y + float(k - 1) * fS.z; return vec3(recT(uRecChain, b + int(fS.x)).xy + uRecHW * vec2(cos(a), sin(a)), recT(uBpTab, o + 7).x); }
  if (nE > 0 && k >= N - nE) { float a = fE.y + float(k - N + nE) * fE.z; return vec3(recT(uRecChain, b + int(fE.x)).xy + uRecHW * vec2(cos(a), sin(a)), recT(uBpTab, o + 7).y); }
  int oS = nS > 0 ? nS + 1 : int(recT(uBpTab, o + 7).z);
  return recCol(b, n, L, t1.x, t1.y, N - oS - (nE > 0 ? nE + 1 : int(recT(uBpTab, o + 7).w)), sgn, k - oS);
}
float bpColS(int o, int b, int n, float L, vec4 t1, int N, float sgn, int k) {
  if (k == 0) return recT(uBpTab, o + 4).x;
  if (k == N) return recT(uBpTab, o + 4).y;
  int nS = int(recT(uBpTab, o + 5).w); int nE = int(recT(uBpTab, o + 6).w);
  if (nS < 0) { vec2 s01 = recT(uBpTab, o + 4).xy; return mix(s01.x, s01.y, float(k) / float(N)); }
  if (nS > 0 && k <= nS) return recT(uBpTab, o + 7).x;
  if (nE > 0 && k >= N - nE) return recT(uBpTab, o + 7).y;
  uRecHW = uBpH;
  int oS = nS > 0 ? nS + 1 : int(recT(uBpTab, o + 7).z);
  return recCol(b, n, L, t1.x, t1.y, N - oS - (nE > 0 ? nE + 1 : int(recT(uBpTab, o + 7).w)), sgn, k - oS).z;
}
void main() {
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  tPos = vec2(0.0); tA = vec4(0.0); tCh = -1; tSl = ivec4(-1);
  int q = gl_VertexID / 6; int c = gl_VertexID - 6 * q;
  int lo = 0; int hi = uBpND;
  while (hi - lo > 1) { int m = (lo + hi) >> 1; if (int(recT(uBpTab, ${BT} * m + 4).w) <= q) lo = m; else hi = m; }
  int o = ${BT} * lo; vec4 t0 = recT(uBpTab, o); vec4 t4 = recT(uBpTab, o + 4);
  int i = q - int(t4.w);
  if (t0.x == 1.0) {
    int f = int(t0.y); int u = int(t0.z); tCh = int(t0.w);
    if (i < u) {
      int v = 6 * (f + i) + c; vec4 a = recT(uBpFb, 2 * v); vec4 e = recT(uBpFb, 2 * v + 1);
      tPos = a.xy; tA = vec4(a.zw, e.xy); tCh = int(e.z); tSl = ivec4(recT(uBpSl, f + i));
    } else if (u > 0) {
      int v = 6 * (f + u - 1) + 1; vec4 a = recT(uBpFb, 2 * v); vec4 e = recT(uBpFb, 2 * v + 1);
      tPos = a.xy; tA = vec4(a.z, uBpH, e.x, 0.0);
    }
    return;
  }
  if (t0.x != 2.0) return;
  int ch = int(t0.y); int N = int(t0.z); float sgn = t0.w; vec4 t1 = recT(uBpTab, o + 1);
  vec4 ci = recT(uRecCi, ch); int b = int(ci.x); int n = int(ci.y); float L = ci.z;
  bool isB = c == 1 || c == 3 || c == 4; bool inner = c == 2 || c == 4 || c == 5;
  vec3 P = bpCol(o, b, n, L, t1, N, sgn, isB ? i + 1 : i, inner);
  float sa; float sn;
  if (isB) { sn = P.z; sa = bpColS(o, b, n, L, t1, N, sgn, i); }
  else { sa = P.z; sn = bpColS(o, b, n, L, t1, N, sgn, i + 1); }
  float sb = sa + bpD(L, sa, sn);
  float s = isB ? sb : sa;
  tPos = P.xy; tA = vec4(s, inner ? uBpH - uBpW : uBpH, recZ(b, n, L, s), 1.0); tCh = ch;
  // The quad's passes (band_rec's cand, then its per-quad window test).
  int pb = int(t1.z); int np = int(t1.w); float U = t4.z;
  int id[4] = int[4](-1, -1, -1, -1); int ns = 0;
  for (int j = 0; j < np; j++) {
    vec4 Pj = recT(uBpPass, ${PT} * (pb + j));
    float d0 = bpD(L, Pj.x, t4.x);
    if (!(d0 + U >= -Pj.y - uBpH - 1e-6 && d0 <= Pj.z + uBpH + 1e-6)) continue;
    float da = bpD(L, Pj.x, sa); float db = da + (sb - sa);
    if (!(max(da, db) >= -Pj.y - uBpH && min(da, db) <= Pj.z + uBpH)) continue;
    if (ns < 4) id[ns] = pb + j;
    ns++;
  }
  // K1247 s24: past BAND_SLOTS, band_rec's (and today's) rule: the passes whose other thread is nearest the
  // quad's outer midpoint (footNear(O, m, so, rO + h)), ties to the lower id, then in id order.
  if (ns > 4) {
    vec2 m = 0.5 * (bpCol(o, b, n, L, t1, N, sgn, i, false).xy + bpCol(o, b, n, L, t1, N, sgn, i + 1, false).xy);
    float key[4] = float[4](1e38, 1e38, 1e38, 1e38); id = int[4](-1, -1, -1, -1);
    for (int j = 0; j < np; j++) {
      vec4 Pj = recT(uBpPass, ${PT} * (pb + j));
      float d0 = bpD(L, Pj.x, t4.x);
      if (!(d0 + U >= -Pj.y - uBpH - 1e-6 && d0 <= Pj.z + uBpH + 1e-6)) continue;
      float da = bpD(L, Pj.x, sa); float db = da + (sb - sa);
      if (!(max(da, db) >= -Pj.y - uBpH && min(da, db) <= Pj.z + uBpH)) continue;
      vec4 P1 = recT(uBpPass, ${PT} * (pb + j) + 1); float oL = recT(uBpPass, ${PT} * (pb + j) + 2).x;
      float kk = bpNear(int(P1.y), int(P1.z), oL, m, P1.x, Pj.w + uBpH);
      int w = 0; for (int r = 1; r < 4; r++) if (key[r] > key[w] || (key[r] == key[w] && id[r] > id[w])) w = r;
      if (kk < key[w] || id[w] < 0) { id[w] = pb + j; key[w] = kk; }
    }
    for (int x = 0; x < 3; x++) for (int y = 0; y < 3 - x; y++) if (id[y] > id[y + 1]) { int t = id[y]; id[y] = id[y + 1]; id[y + 1] = t; }
  }
  tSl = ivec4(id[0], id[1], id[2], id[3]);
}`;
export const BAND_PLACE_FS = "#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }";
/** Interleaved: tPos (2), tA (4), tCh (1 int), tSl (4 ints): BAND_PLACE_STRIDE 4-byte words a vertex. */
export const BAND_PLACE_OUT = ["tPos", "tA", "tCh", "tSl"];
export const BAND_PLACE_STRIDE = 11;
export const BAND_PLACE_TEX_W = W;

// K1247 s25: the placement by QUAD. One invocation per quad q (gl_VertexID; Q = 6 Q vertices / 6) places
// its two columns once each, outer and inner together (bpCol2: recCol's span search, fan-step search and
// s are the same at both widths, only recFan / recEdge read uRecHW), runs the slot loop once, and writes
// five vec4s (BAND_QUAD_OUT, interleaved):
//   qO (A outer, B outer)  qI (A inner, B inner)  qS (sa, sb, z(sa), z(sb))  qM (mode, a, ch, 0)  qL slots
// mode 2: a record quad (the band program's corner c picks A / B, outer / inner from qO, qI, qS; w 1);
// mode 1: a worker-placed quad, a = its index in uBpFb (the band program copies vertex 6 a + c, as s23 did);
// mode 0: every corner is qO.xy with attributes qS (padding: the piece's last placed vertex at w 0;
// an empty piece or an absent one: zero, chain qM.z). bandQuadVs turns BAND_VS into the program that
// draws these as instances of 6 vertices (drawArraysInstanced(TRIANGLES, 0, 6, Q)).
const recColSrc = ((): string => {
  const a = glsl.indexOf("vec3 recCol(int b"); const e = glsl.indexOf("\n}\n", a);
  if (a < 0 || e < 0) throw new Error("band_place: recCol not found");
  const fan = "if (g <= st) return vec3(recFan(b, n, L, V, sgn, st, g), sv + base);";
  const edge = "return vec3(recEdge(b, n, L, K, s, sgn), s + base);";
  const head = "vec3 recCol(int b, int n, float L, float sA, float dS, int N, float sgn, int i) {";
  let t = glsl.slice(a, e + 3);
  if (!t.includes(fan) || !t.includes(edge) || !t.includes(head)) throw new Error("band_place: recCol changed");
  t = t.replace(head, "vec3 bpRecCol2(int b, int n, float L, float sA, float dS, int N, float sgn, int i, out vec2 pin) {");
  t = t.replace(fan, "if (g <= st) { uRecHW = uBpH - uBpW; pin = recFan(b, n, L, V, sgn, st, g); uRecHW = uBpH; return vec3(recFan(b, n, L, V, sgn, st, g), sv + base); }");
  t = t.replace(edge, "uRecHW = uBpH - uBpW; pin = recEdge(b, n, L, K, s, sgn); uRecHW = uBpH; return vec3(recEdge(b, n, L, K, s, sgn), s + base);");
  return t;
})();

export const BAND_QUAD_VS = `${BP_HEAD}
out vec4 qO;
out vec4 qI;
out vec4 qS;
out vec4 qM;
out vec4 qL;
${BP_LIB}
${recColSrc}
// Column k of record piece o: (outer x, y, s), its inner point in pin (bpCol at both widths).
vec3 bpCol2(int o, int b, int n, float L, vec4 t1, int N, float sgn, int k, out vec2 pin) {
  if (k == 0) { vec4 e = recT(uBpTab, o + 2); pin = e.zw; return vec3(e.xy, recT(uBpTab, o + 4).x); }
  if (k == N) { vec4 e = recT(uBpTab, o + 3); pin = e.zw; return vec3(e.xy, recT(uBpTab, o + 4).y); }
  vec4 fS = recT(uBpTab, o + 5); vec4 fE = recT(uBpTab, o + 6); int nS = int(fS.w); int nE = int(fE.w);
  if (nS < 0) { vec4 e0 = recT(uBpTab, o + 2); vec4 e1 = recT(uBpTab, o + 3); vec2 s01 = recT(uBpTab, o + 4).xy; float t = float(k) / float(N); pin = mix(e0.zw, e1.zw, t); return vec3(mix(e0.xy, e1.xy, t), mix(s01.x, s01.y, t)); }
  float hi = uBpH - uBpW;
  if (nS > 0 && k <= nS) { float a = fS.y + float(k - 1) * fS.z; vec2 C = recT(uRecChain, b + int(fS.x)).xy; vec2 u = vec2(cos(a), sin(a)); pin = C + hi * u; return vec3(C + uBpH * u, recT(uBpTab, o + 7).x); }
  if (nE > 0 && k >= N - nE) { float a = fE.y + float(k - N + nE) * fE.z; vec2 C = recT(uRecChain, b + int(fE.x)).xy; vec2 u = vec2(cos(a), sin(a)); pin = C + hi * u; return vec3(C + uBpH * u, recT(uBpTab, o + 7).y); }
  int oS = nS > 0 ? nS + 1 : int(recT(uBpTab, o + 7).z);
  return bpRecCol2(b, n, L, t1.x, t1.y, N - oS - (nE > 0 ? nE + 1 : int(recT(uBpTab, o + 7).w)), sgn, k - oS, pin);
}
void main() {
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  qO = vec4(0.0); qI = vec4(0.0); qS = vec4(0.0); qM = vec4(0.0, 0.0, -1.0, 0.0); qL = vec4(-1.0);
  int q = gl_VertexID;
  int lo = 0; int hi = uBpND;
  while (hi - lo > 1) { int m = (lo + hi) >> 1; if (int(recT(uBpTab, ${BT} * m + 4).w) <= q) lo = m; else hi = m; }
  int o = ${BT} * lo; vec4 t0 = recT(uBpTab, o); vec4 t4 = recT(uBpTab, o + 4);
  int i = q - int(t4.w);
  if (t0.x == 1.0) {
    int f = int(t0.y); int u = int(t0.z);
    if (i < u) { qM = vec4(1.0, float(f + i), 0.0, 0.0); return; }
    qM.z = t0.w;
    if (u > 0) {
      int v = 6 * (f + u - 1) + 1; vec4 a = recT(uBpFb, 2 * v); vec4 e = recT(uBpFb, 2 * v + 1);
      qO = vec4(a.xy, 0.0, 0.0); qS = vec4(a.z, uBpH, e.x, 0.0);
    }
    return;
  }
  if (t0.x != 2.0) return;
  int ch = int(t0.y); int N = int(t0.z); float sgn = t0.w; vec4 t1 = recT(uBpTab, o + 1);
  vec4 ci = recT(uRecCi, ch); int b = int(ci.x); int n = int(ci.y); float L = ci.z;
  vec2 Ai; vec2 Bi;
  vec3 A = bpCol2(o, b, n, L, t1, N, sgn, i, Ai);
  vec3 B = bpCol2(o, b, n, L, t1, N, sgn, i + 1, Bi);
  float sa = A.z; float sb = sa + bpD(L, sa, B.z);
  qO = vec4(A.xy, B.xy); qI = vec4(Ai, Bi); qS = vec4(sa, sb, recZ(b, n, L, sa), recZ(b, n, L, sb)); qM = vec4(2.0, 0.0, float(ch), 0.0);
  // The quad's passes (band_rec's cand, then its per-quad window test); past 4, the nearest (s24's rule).
  int pb = int(t1.z); int np = int(t1.w); float U = t4.z;
  int id[4] = int[4](-1, -1, -1, -1); int ns = 0;
  for (int j = 0; j < np; j++) {
    vec4 Pj = recT(uBpPass, ${PT} * (pb + j));
    float d0 = bpD(L, Pj.x, t4.x);
    if (!(d0 + U >= -Pj.y - uBpH - 1e-6 && d0 <= Pj.z + uBpH + 1e-6)) continue;
    float da = bpD(L, Pj.x, sa); float db = da + (sb - sa);
    if (!(max(da, db) >= -Pj.y - uBpH && min(da, db) <= Pj.z + uBpH)) continue;
    if (ns < 4) id[ns] = pb + j;
    ns++;
  }
  if (ns > 4) {
    vec2 m = 0.5 * (A.xy + B.xy);
    float key[4] = float[4](1e38, 1e38, 1e38, 1e38); id = int[4](-1, -1, -1, -1);
    for (int j = 0; j < np; j++) {
      vec4 Pj = recT(uBpPass, ${PT} * (pb + j));
      float d0 = bpD(L, Pj.x, t4.x);
      if (!(d0 + U >= -Pj.y - uBpH - 1e-6 && d0 <= Pj.z + uBpH + 1e-6)) continue;
      float da = bpD(L, Pj.x, sa); float db = da + (sb - sa);
      if (!(max(da, db) >= -Pj.y - uBpH && min(da, db) <= Pj.z + uBpH)) continue;
      vec4 P1 = recT(uBpPass, ${PT} * (pb + j) + 1); float oL = recT(uBpPass, ${PT} * (pb + j) + 2).x;
      float kk = bpNear(int(P1.y), int(P1.z), oL, m, P1.x, Pj.w + uBpH);
      int w = 0; for (int r = 1; r < 4; r++) if (key[r] > key[w] || (key[r] == key[w] && id[r] > id[w])) w = r;
      if (kk < key[w] || id[w] < 0) { id[w] = pb + j; key[w] = kk; }
    }
    for (int x = 0; x < 3; x++) for (int y = 0; y < 3 - x; y++) if (id[y] > id[y + 1]) { int t = id[y]; id[y] = id[y + 1]; id[y + 1] = t; }
  }
  qL = vec4(float(id[0]), float(id[1]), float(id[2]), float(id[3]));
}`;
export const BAND_QUAD_OUT = ["qO", "qI", "qS", "qM", "qL"];
export const BAND_QUAD_STRIDE = 20;

const BQ_IN = `layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aA;
layout(location=2) in int aCh;
layout(location=3) in ivec4 aSl;`;
/** BAND_VS drawing BAND_QUAD_VS's quads as instances (divisor-1 attributes qO..qL at locations 0-4; corner
 *  c = gl_VertexID in s23's order A out, B out, A in, B out, B in, A in): the attributes become globals that
 *  bqLoad fills, so the rest of the program is BAND_VS's, unchanged. uBqFb / uBqSl are uBpFb / uBpSl. */
export function bandQuadVs(vs: string): string {
  if (!vs.includes(BQ_IN) || !vs.includes("void main() {")) throw new Error("band_place: BAND_VS changed");
  return vs.replace(BQ_IN, `layout(location=0) in vec4 qO;
layout(location=1) in vec4 qI;
layout(location=2) in vec4 qS;
layout(location=3) in vec4 qM;
layout(location=4) in vec4 qL;
uniform highp sampler2D uBqFb;
uniform highp sampler2D uBqSl;
uniform float uBqH;
uniform float uBqW;
vec2 aPos; vec4 aA; int aCh; ivec4 aSl;
vec4 bqT(highp sampler2D t, int q) { return texelFetch(t, ivec2(q % ${W}, q / ${W}), 0); }
void bqLoad() {
  int c = gl_VertexID; int md = int(qM.x);
  if (md == 2) {
    bool isB = c == 1 || c == 3 || c == 4; bool inner = c == 2 || c == 4 || c == 5;
    vec4 P = inner ? qI : qO;
    aPos = isB ? P.zw : P.xy; aA = vec4(isB ? qS.y : qS.x, inner ? uBqH - uBqW : uBqH, isB ? qS.w : qS.z, 1.0);
    aCh = int(qM.z); aSl = ivec4(qL);
  } else if (md == 1) {
    int f = int(qM.y); int v = 6 * f + c; vec4 a = bqT(uBqFb, 2 * v); vec4 e = bqT(uBqFb, 2 * v + 1);
    aPos = a.xy; aA = vec4(a.zw, e.xy); aCh = int(e.z); aSl = ivec4(bqT(uBqSl, f));
  } else {
    aPos = qO.xy; aA = qS; aCh = int(qM.z); aSl = ivec4(qL);
  }
}`).replace("void main() {", "void main() {\n  bqLoad();");
}
