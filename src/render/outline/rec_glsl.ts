// K1247 s19: the fill's record placement in GLSL (outline_app's placement pass with oe=1, REC_PLACE_VS
// under transform feedback once per reply; the s19 twin probe checks it against fill_tri's CPU placement).
const BAND_TEX_W = 1024; // band_gpu.BAND_TEX_W

/** K1247 s19: texels per record strip in the strip table (fill_tri recStrip2 writes it): (rL0, rL1,
 *  rR0, rR1), (s0, ds, side sign, mode: 0 fallback, else REC_KEY_*), (chain, N, L span | fallback row,
 *  R span), and (K1247 s26) the L piece's end points (x0, y0, x1, y1), then the R piece's. A span packs
 *  the side's first column p0 and column count n2 on fillFrame's matched s scale (K1314 s6) as
 *  p0 * (N + 1) + n2 (0, N where the side runs the whole strip); a column past it holds at its piece's
 *  end point, unless the mode's bits 2 (end A) and 3 (end B) mirror it there (K1314 s7's mirA, mirB:
 *  the other side reflected across the chain; bits 4 and 5: L, R have a centre polyline). */
export const REC_TEXELS = 5;
/** K1247 s26 (K1322): a record strip's keys, as fill_tri's fillFrame keys it (K1314 s5, s6). MID
 *  (matched spans): each border row by its own side's s on the matched scale, the centre by the
 *  depth at their midpoint. FLOOR (ranges that differ without matched spans: they part at a junction
 *  end, or do not overlap): the same with the sides' s uniform over the strip and the centre floored
 *  at the row's s (s0 + ds i / N). ROW (equal ranges): every row by the row's s. */
export const REC_KEY_MID = 1;
export const REC_KEY_FLOOR = 2;
export const REC_KEY_ROW = 3;

// K1247 s19 (oe=1): the fill's record vertices placed here from the chain
// samples, as fill_tri's recStrip2 places them on the CPU (chain_frame's
// colAt, zAt1; K1247 s20; fillFrame's spans and keys, s26). aRec: the
// strip's ordinal (-1: the worker placed the vertex) and (row << 16) |
// column. The strip table: REC_TEXELS above; a fallback strip's vertices
// come as rows (x, y, key, s) of uRecFb.
export const REC_GLSL = `layout(location=6) in ivec2 aRec;
uniform highp sampler2D uRecChain;
uniform highp sampler2D uRecCi;
uniform highp sampler2D uRecStrip;
uniform highp sampler2D uRecFb;
uniform highp sampler2D uRecPf;
uniform float uRecHW;
uniform float uRecZt;
uniform float uRecSag;
vec4 recT(highp sampler2D t, int q) { return texelFetch(t, ivec2(q % ${BAND_TEX_W}, q / ${BAND_TEX_W}), 0); }
float recWrap(int b, int m, float L, float u0) {
  float u = u0;
  if (L > 0.0) { if (u < 0.0 || u >= L) u = mod(u, L); }
  else u = clamp(u, 0.0, recT(uRecChain, b + m).z);
  return u;
}
void recSeg(int b, int n, float L, float u, out int k, out int j, out float f) {
  int m = n - 1;
  if (u >= recT(uRecChain, b + m).z) k = L > 0.0 ? m : m - 1;
  else { int lo = 0; int hi = m; while (hi - lo > 1) { int q = (lo + hi) >> 1; if (recT(uRecChain, b + q).z <= u) lo = q; else hi = q; } k = lo; }
  j = k < m ? k + 1 : 0;
  float sk = recT(uRecChain, b + k).z; float e = k < m ? recT(uRecChain, b + k + 1).z : L; float sl = e - sk;
  f = sl > 0.0 ? (u - sk) / sl : 0.0;
}
// K1247 s20: chain_frame's colAt, line for line (mode 4: the border's own polygon, every polygon vertex
// on a column). uRecPf: the fan steps' inclusive prefix per chain sample, 4 a texel. V is unwrapped
// (sample V % n, one lap of L per n).
float recPfAt(int g) { vec4 t = recT(uRecPf, g >> 2); int c = g & 3; return c == 0 ? t.x : c == 1 ? t.y : c == 2 ? t.z : t.w; }
float recPfU(int b, int n, int V) { if (V < 0) return 0.0; int q = V / n; return recPfAt(b + V - q * n) + float(q) * recPfAt(b + n - 1); }
float recSV(int b, int n, float L, int V) { int q = V / n; return recT(uRecChain, b + V - q * n).z + (q > 0 ? float(q) * L : 0.0); }
void recSpan(int b, int n, float L, float sA, float dS, out float a, out float sB, out float base, out int k, out int V2) {
  int m = n - 1; float sm = recT(uRecChain, b + m).z;
  base = 0.0;
  if (L > 0.0) { a = sA - L * floor(sA / L); base = sA - a; } else a = clamp(sA, 0.0, sm);
  sB = (L > 0.0 ? sA + dS : clamp(sA + dS, 0.0, sm)) - base;
  if (a >= sm) k = L > 0.0 ? m : m - 1;
  else { int lo = 0; int hi = m; while (hi - lo > 1) { int q = (lo + hi) >> 1; if (recT(uRecChain, b + q).z <= a) lo = q; else hi = q; } k = lo; }
  int lo = k; int hi = L > 0.0 ? k + 1 + n * (int(floor(max(0.0, sB) / L)) + 2) : m;
  while (hi - lo > 1) { int q = (lo + hi) >> 1; if (recSV(b, n, L, q) < sB) lo = q; else hi = q; }
  V2 = lo;
}
// Sample v's corner on side sgn: 0 none, 1 convex (a fan from a0 by da), 2 concave (its miter M, trim).
int recCorner(int b, int n, float L, int v, float sgn, out float tr, out vec2 M, out float a0, out float da) {
  int m = n - 1; tr = 0.0; M = vec2(0.0); a0 = 0.0; da = 0.0;
  if (!(L > 0.0) && (v <= 0 || v >= m)) return 0;
  int p = v > 0 ? v - 1 : m; int q = v < m ? v + 1 : 0;
  vec2 P = recT(uRecChain, b + v).xy; vec2 av = P - recT(uRecChain, b + p).xy; vec2 bv = recT(uRecChain, b + q).xy - P;
  float la = length(av); float lb = length(bv);
  if (!(la > 0.0 && lb > 0.0)) return 0;
  av /= la; bv /= lb;
  float cr = av.x * bv.y - av.y * bv.x; float dt = dot(av, bv);
  if (abs(cr) < 1e-12) return 0;
  vec2 n1 = sgn * vec2(-av.y, av.x); vec2 n2 = sgn * vec2(-bv.y, bv.x);
  da = atan(n1.x * n2.y - n1.y * n2.x, dot(n1, n2));
  if (sgn * cr > 0.0) { tr = uRecHW * abs(cr) / (1.0 + dt); M = P + uRecHW * (n1 + n2) / (1.0 + dot(n1, n2)); return 2; }
  a0 = atan(n1.y, n1.x); return 1;
}
vec2 recEdge(int b, int n, float L, int K, float s, float sgn) {
  int m = n - 1; int k = K - (K / n) * n; int j = k < m ? k + 1 : 0;
  float st = recSV(b, n, L, K); float en = st + ((k < m ? recT(uRecChain, b + k + 1).z : L) - recT(uRecChain, b + k).z);
  float tr; vec2 M; float a0; float da;
  if (recCorner(b, n, L, k, sgn, tr, M, a0, da) == 2 && s - st < tr) return M;
  if (recCorner(b, n, L, j, sgn, tr, M, a0, da) == 2 && en - s < tr) return M;
  vec2 A = recT(uRecChain, b + k).xy; vec2 d = recT(uRecChain, b + j).xy - A; float l = length(d); if (!(l > 0.0)) l = 1.0; d /= l;
  return A + d * (s - st) + sgn * uRecHW * vec2(-d.y, d.x);
}
vec2 recFan(int b, int n, float L, int V, float sgn, float st, float g) {
  int v = V - (V / n) * n; float tr; vec2 M; float a0; float da;
  int ty = recCorner(b, n, L, v, sgn, tr, M, a0, da);
  if (ty == 2) return M;
  if (ty == 1 && st > 0.0) { float an = a0 + da * g / st; return recT(uRecChain, b + v).xy + uRecHW * vec2(cos(an), sin(an)); }
  return recEdge(b, n, L, v, recT(uRecChain, b + v).z, sgn);
}
float recCs(int b, int n, float L, float a, float B, float S, float p0, int V) { return floor((recSV(b, n, L, V) - a) * B / S + 0.5) + recPfU(b, n, V - 1) - p0; }
// Column i of a record side: (x, y, its centreline s in sA's frame).
vec3 recCol(int b, int n, float L, float sA, float dS, int N, float sgn, int i) {
  float a; float sB; float base; int k; int V2; recSpan(b, n, L, sA, dS, a, sB, base, k, V2);
  int V1 = k + 1; float S = sB - a; float p0 = recPfU(b, n, V1 - 1); float B = float(N) - (recPfU(b, n, V2) - p0);
  float fi = float(i); int lo = V1 - 1; int hi = V2 + 1;
  while (hi - lo > 1) { int q = (lo + hi) >> 1; if (recCs(b, n, L, a, B, S, p0, q) <= fi) lo = q; else hi = q; }
  int V = lo; float s; int K;
  if (V >= V1) {
    float st = recPfU(b, n, V) - recPfU(b, n, V - 1); float c0 = recCs(b, n, L, a, B, S, p0, V); float g = fi - c0; float sv = recSV(b, n, L, V);
    if (g <= st) return vec3(recFan(b, n, L, V, sgn, st, g), sv + base);
    float ce = c0 + st; float cn = V < V2 ? recCs(b, n, L, a, B, S, p0, V + 1) : float(N); float sn = V < V2 ? recSV(b, n, L, V + 1) : sB;
    s = sv + (sn - sv) * (fi - ce) / (cn - ce); K = V;
  } else {
    float cn = V2 >= V1 ? recCs(b, n, L, a, B, S, p0, V1) : float(N); float sn = V2 >= V1 ? recSV(b, n, L, V1) : sB;
    s = a + (sn - a) * fi / cn; K = k;
  }
  return vec3(recEdge(b, n, L, K, s, sgn), s + base);
}
float recZ(int b, int n, float L, float u0) {
  int m = n - 1; float u = recWrap(b, m, L, u0);
  if (!(L > 0.0) && u >= recT(uRecChain, b + m).z) return recT(uRecChain, b + m).w;
  int k; int j; float f; recSeg(b, n, L, u, k, j, f);
  float zk = recT(uRecChain, b + k).w; return zk + (recT(uRecChain, b + j).w - zk) * f;
}
// chain_frame's pointAt: the chain's centre at arc u0 (a mirrored column reflects the other side across it).
vec2 recPt(int b, int n, float L, float u0) {
  float u = recWrap(b, n - 1, L, u0);
  int k; int j; float f; recSeg(b, n, L, u, k, j, f);
  vec2 pk = recT(uRecChain, b + k).xy; return pk + (recT(uRecChain, b + j).xy - pk) * f;
}
// K1247 s26: column i of a side whose span starts at column p0 and runs n2 columns: its piece's end
// points (e.xy at s sA, e.zw at sA + dS) at and past the span's ends, else recCol over n2 columns.
vec3 recSide(int b, int n, float L, float sA, float dS, float sgn, int i, int p0, int n2, vec4 e) {
  int k = clamp(i - p0, 0, n2);
  if (k == 0) return vec3(e.xy, sA);
  if (k == n2) return vec3(e.zw, sA + dS);
  return recCol(b, n, L, sA, dS, n2, sgn, k);
}
void recPlace(inout vec2 P, inout float key, inout vec4 S) {
  if (aRec.x < 0) return;
  int q = ${REC_TEXELS} * aRec.x; vec4 t0 = recT(uRecStrip, q); vec4 t1 = recT(uRecStrip, q + 1); vec4 t2 = recT(uRecStrip, q + 2);
  int r = aRec.y >> 16; int i = aRec.y & 65535; int N = int(t2.y);
  if (t1.w < 0.5) { vec4 v = recT(uRecFb, int(t2.z) + r * (N + 1) + i); P = v.xy; key = v.z; S.x = v.w; return; }
  vec4 ci = recT(uRecCi, int(t2.x)); int b = int(ci.x); int n = int(ci.y); float L = ci.z;
  int W = N + 1; int cL = int(t2.z + 0.5); int pL = cL / W; int nL = cL - pL * W; int cR = int(t2.w + 0.5); int pR = cR / W; int nR = cR - pR * W;
  int mw = int(t1.w + 0.5); int md = mw & 3;
  // K1314 s7 (fill_tri recStrip2's mirL / mirR): a column past one side's span but within the other's,
  // at a mirrored end (bit 2: before the span, bit 3: after it), on the chain, the other side having a
  // centre polyline (bits 5, 4).
  bool mA = (mw & 4) != 0; bool mB = (mw & 8) != 0; bool mL = false; bool mR = false;
  if (mA || mB) {
    float u0 = min(t0.x, t0.z); float u1 = max(t0.x + t0.y, t0.z + t0.w); float su = u0 + (u1 - u0) * float(i) / float(N);
    bool onC = L > 0.0 || (su >= 0.0 && su <= recT(uRecChain, b + n - 1).z);
    mL = onC && (i < pL ? mA : mB) && (mw & 32) != 0 && (i < pL || i > pL + nL) && i >= pR && i <= pR + nR;
    mR = onC && (i < pR ? mA : mB) && (mw & 16) != 0 && (i < pR || i > pR + nR) && i >= pL && i <= pL + nL;
  }
  vec3 cl = !mL && (r != 2 || mR) ? recSide(b, n, L, t0.x, t0.y, t1.z, i, pL, nL, recT(uRecStrip, q + 3)) : vec3(0.0);
  vec3 cr = !mR && (r != 0 || mL) ? recSide(b, n, L, t0.z, t0.w, -t1.z, i, pR, nR, recT(uRecStrip, q + 4)) : vec3(0.0);
  if (mL) cl = vec3(2.0 * recPt(b, n, L, cr.z) - cr.xy, cr.z);
  if (mR) cr = vec3(2.0 * recPt(b, n, L, cl.z) - cl.xy, cl.z);
  // fillFrame's keys (REC_KEY_*): the sides' s on the strip's scale (a mirrored side: the other's), the row's s.
  float kL0 = t0.x + t0.y * clamp(float(i - pL) / float(nL), 0.0, 1.0);
  float kR0 = t0.z + t0.w * clamp(float(i - pR) / float(nR), 0.0, 1.0);
  float kL = mL ? kR0 : kL0; float kR = mR ? kL0 : kR0;
  float zs = md != ${REC_KEY_MID} ? recZ(b, n, L, t1.x + t1.y * float(i) / float(N)) : 0.0;
  if (r == 0) { P = cl.xy; key = (md == ${REC_KEY_ROW} ? zs : recZ(b, n, L, kL)) - uRecZt; S.x = cl.z; }
  else if (r == 2) { P = cr.xy; key = (md == ${REC_KEY_ROW} ? zs : recZ(b, n, L, kR)) - uRecZt; S.x = cr.z; }
  else {
    float zm = md == ${REC_KEY_ROW} ? zs : recZ(b, n, L, (kL + kR) / 2.0);
    P = (cl.xy + cr.xy) / 2.0; key = md == ${REC_KEY_FLOOR} ? max(zs, zm) : zm; S.x = (cl.z + cr.z) / 2.0;
  }
}
`;
/** A fill vertex shader with the records placed in it (oe=1). */
export function recVs(vs: string): string {
  const out = vs
    .replace("layout(location=0) in vec2 aPos;", "layout(location=0) in vec2 aPos0;")
    .replace("layout(location=2) in float aKey;", "layout(location=2) in float aKey0;")
    .replace("layout(location=5) in vec4 aS;", "layout(location=5) in vec4 aS0;")
    .replace("void main() {", `${REC_GLSL}void main() {\n  vec2 aPos = aPos0; float aKey = aKey0; vec4 aS = aS0; recPlace(aPos, aKey, aS);`);
  if (!out.includes("aPos0;") || !out.includes("aKey0;") || !out.includes("aS0;") || !out.includes("recPlace(aPos")) throw new Error("recVs: the fill shader changed");
  return out;
}

// K1247 s19: outline_app places the fill once per reply, by transform feedback, into one buffer of
// REC_PLACE_STRIDE floats a vertex, (x, y, key, 0) then aS, which the fill programs draw from: a frame
// without a reply (at rest) pays nothing for the placement. The twin probe checks this same shader.
export const REC_PLACE_VS = recVs(`#version 300 es
layout(location=0) in vec2 aPos;
layout(location=2) in float aKey;
layout(location=5) in vec4 aS;
out vec4 tPK;
out vec4 tS;
void main() {
  tPK = vec4(aPos, aKey, 0.0); tS = aS; gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`);
export const REC_PLACE_FS = "#version 300 es\nprecision highp float; out vec4 o; void main() { o = vec4(0.0); }";
export const REC_PLACE_OUT = ["tPK", "tS"];
export const REC_PLACE_STRIDE = 8;
