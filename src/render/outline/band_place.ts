// K1247 s23 (ob=1): main places the band's tied runs and ghosts, once per reply, by transform feedback
// (outline_app placeBand), as REC_PLACE_VS places the fill's records. The worker sends band_rec's
// per-piece table (BT texels a diagram piece), the quads it still placed itself (faded runs and the
// pieces without records, compact) and the fan-step prefix; this shader writes every band vertex of the
// fixed layout (6 Q) in band_rec's CPU order, which BAND_VS then draws unchanged:
// - a record quad i joins columns i and i + 1: colAt at h outside and h - W inside (REC_GLSL's recCol),
//   columns 0 and N from the table (today's end points); s as the CPU's sa = sv[i], sb = sa + dSC(sa,
//   sv[i + 1]); z = zAtC (recZ); its slots: the chain's passes whose lo/hi + h window meets [sa, sb]
//   (band_rec's cand filter first), at most BAND_SLOTS. Past BAND_SLOTS the CPU keeps the passes whose
//   other thread is nearest (footNear); this keeps the nearest in s instead (band_rec counts those
//   quads in `dropped`).
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
//   7 (s of the start arc's vertex, s of the end arc's vertex, 0, 0)
import { REC_GLSL } from "./rec_glsl";

export const BT = 8;
const W = 1024; // band_gpu.BAND_TEX_W
const PT = 4; // band_gpu.PT

const glsl = REC_GLSL.replace("layout(location=6) in ivec2 aRec;", "const ivec2 aRec = ivec2(-1, 0);").replace("uniform float uRecHW;", "float uRecHW = 0.0;");
if (!glsl.includes("const ivec2 aRec") || !glsl.includes("float uRecHW = 0.0;")) throw new Error("band_place: REC_GLSL changed");

export const BAND_PLACE_VS = `#version 300 es
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
out vec2 tPos;
out vec4 tA;
flat out int tCh;
flat out ivec4 tSl;
// draw.ts dSC: b - a, on a loop wrapped into (-L/2, L/2].
float bpD(float L, float a, float b) { float d = b - a; if (L > 0.0) { d = mod(d, L); if (d > L / 2.0) d -= L; } return d; }
// Column k of record piece o (x, y, s): the table's ends, else colAt at hh.
vec3 bpCol(int o, int b, int n, float L, vec4 t1, int N, float sgn, int k, bool inner) {
  if (k == 0) { vec4 e = recT(uBpTab, o + 2); return vec3(inner ? e.zw : e.xy, recT(uBpTab, o + 4).x); }
  if (k == N) { vec4 e = recT(uBpTab, o + 3); return vec3(inner ? e.zw : e.xy, recT(uBpTab, o + 4).y); }
  uRecHW = inner ? uBpH - uBpW : uBpH;
  vec4 fS = recT(uBpTab, o + 5); vec4 fE = recT(uBpTab, o + 6); int nS = int(fS.w); int nE = int(fE.w);
  if (nS < 0) { vec4 e0 = recT(uBpTab, o + 2); vec4 e1 = recT(uBpTab, o + 3); vec2 s01 = recT(uBpTab, o + 4).xy; float t = float(k) / float(N); return vec3(mix(inner ? e0.zw : e0.xy, inner ? e1.zw : e1.xy, t), mix(s01.x, s01.y, t)); }
  if (nS > 0 && k <= nS) { float a = fS.y + float(k - 1) * fS.z; return vec3(recT(uRecChain, b + int(fS.x)).xy + uRecHW * vec2(cos(a), sin(a)), recT(uBpTab, o + 7).x); }
  if (nE > 0 && k >= N - nE) { float a = fE.y + float(k - N + nE) * fE.z; return vec3(recT(uRecChain, b + int(fE.x)).xy + uRecHW * vec2(cos(a), sin(a)), recT(uBpTab, o + 7).y); }
  int oS = nS > 0 ? nS + 1 : 0;
  return recCol(b, n, L, t1.x, t1.y, N - oS - (nE > 0 ? nE + 1 : 0), sgn, k - oS);
}
float bpColS(int o, int b, int n, float L, vec4 t1, int N, float sgn, int k) {
  if (k == 0) return recT(uBpTab, o + 4).x;
  if (k == N) return recT(uBpTab, o + 4).y;
  int nS = int(recT(uBpTab, o + 5).w); int nE = int(recT(uBpTab, o + 6).w);
  if (nS < 0) { vec2 s01 = recT(uBpTab, o + 4).xy; return mix(s01.x, s01.y, float(k) / float(N)); }
  if (nS > 0 && k <= nS) return recT(uBpTab, o + 7).x;
  if (nE > 0 && k >= N - nE) return recT(uBpTab, o + 7).y;
  uRecHW = uBpH;
  int oS = nS > 0 ? nS + 1 : 0;
  return recCol(b, n, L, t1.x, t1.y, N - oS - (nE > 0 ? nE + 1 : 0), sgn, k - oS).z;
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
  int pb = int(t1.z); int np = int(t1.w); float U = t4.z; float sm = 0.5 * (sa + sb);
  int id[4] = int[4](-1, -1, -1, -1); float key[4] = float[4](0.0, 0.0, 0.0, 0.0); int ns = 0;
  for (int j = 0; j < np; j++) {
    vec4 Pj = recT(uBpPass, ${PT} * (pb + j));
    float d0 = bpD(L, Pj.x, t4.x);
    if (!(d0 + U >= -Pj.y - uBpH - 1e-6 && d0 <= Pj.z + uBpH + 1e-6)) continue;
    float da = bpD(L, Pj.x, sa); float db = da + (sb - sa);
    if (!(max(da, db) >= -Pj.y - uBpH && min(da, db) <= Pj.z + uBpH)) continue;
    float kk = abs(bpD(L, Pj.x, sm));
    if (ns < 4) { id[ns] = pb + j; key[ns] = kk; }
    else {
      int w = 0; for (int r = 1; r < 4; r++) if (key[r] > key[w]) w = r;
      if (kk < key[w]) { id[w] = pb + j; key[w] = kk; }
    }
    ns++;
  }
  if (ns > 4) for (int x = 0; x < 3; x++) for (int y = 0; y < 3 - x; y++) if (id[y] > id[y + 1]) { int t = id[y]; id[y] = id[y + 1]; id[y + 1] = t; }
  tSl = ivec4(id[0], id[1], id[2], id[3]);
}`;
export const BAND_PLACE_FS = "#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }";
/** Interleaved: tPos (2), tA (4), tCh (1 int), tSl (4 ints): BAND_PLACE_STRIDE 4-byte words a vertex. */
export const BAND_PLACE_OUT = ["tPos", "tA", "tCh", "tSl"];
export const BAND_PLACE_STRIDE = 11;
export const BAND_PLACE_TEX_W = W;
