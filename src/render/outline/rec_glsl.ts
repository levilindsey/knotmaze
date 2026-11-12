// K1247 s19: the fill's record placement in GLSL (outline_app's placement pass with oe=1, REC_PLACE_VS
// under transform feedback once per reply; the s19 twin probe checks it against fill_tri's CPU placement).
const BAND_TEX_W = 1024; // band_gpu.BAND_TEX_W

// K1247 s19 (oe=1): the fill's record vertices placed here from the chain
// samples, as fill_tri's recStrip places them on the CPU (chain_frame's
// offsetRow, zRow; tangents by chainTangents' formula). aRec: the strip's
// ordinal (-1: the worker placed the vertex) and (row << 16) | column. The
// strip table holds REC_TEXELS texels a strip: (rL0, rL1, rR0, rR1), (s0,
// ds, side sign, 1 record / 0 fallback), (chain, N, fallback row, 0); a
// fallback strip's vertices come as rows (x, y, key, s) of uRecFb.
export const REC_GLSL = `layout(location=6) in ivec2 aRec;
uniform highp sampler2D uRecChain;
uniform highp sampler2D uRecCi;
uniform highp sampler2D uRecStrip;
uniform highp sampler2D uRecFb;
uniform float uRecHW;
uniform float uRecZt;
uniform float uRecSag;
vec4 recT(highp sampler2D t, int q) { return texelFetch(t, ivec2(q % ${BAND_TEX_W}, q / ${BAND_TEX_W}), 0); }
vec3 recTan(int b, int n, bool closed, int i) {
  int a = closed ? (i - 1 + n) % n : max(0, i - 1);
  int c = closed ? (i + 1) % n : min(n - 1, i + 1);
  vec2 P = recT(uRecChain, b + i).xy;
  vec2 av = P - recT(uRecChain, b + a).xy; vec2 bv = recT(uRecChain, b + c).xy - P;
  vec2 d = av + bv; float l = length(d); if (!(l > 0.0)) l = 1.0;
  vec3 o = vec3(d / l, 0.0);
  float la = length(av); float lb = length(bv);
  if (la > 1e-12 && lb > 1e-12) {
    float cr = (av.x * bv.y - av.y * bv.x) / (la * lb); float dt = (av.x * bv.x + av.y * bv.y) / (la * lb);
    o.z = atan(cr, dt) / (0.5 * (la + lb));
  }
  return o;
}
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
vec2 recOff(int b, int n, float L, float u0, float sgn, float st) {
  int k; int j; float f; recSeg(b, n, L, recWrap(b, n - 1, L, u0), k, j, f);
  vec2 A = recT(uRecChain, b + k).xy; vec2 B = recT(uRecChain, b + j).xy;
  vec3 ta = recTan(b, n, L > 0.0, k); vec3 tb = recTan(b, n, L > 0.0, j);
  vec2 p = A + (B - A) * f;
  vec2 ax = ta.xy + (tb.xy - ta.xy) * f; float l = length(ax); if (!(l > 0.0)) l = 1.0; ax /= l;
  float kap = ta.z + (tb.z - ta.z) * f; float ak = abs(kap);
  float bb = sgn * kap > 0.0 ? min(uRecHW, 0.9 / ak) : uRecHW + uRecSag * st * st * ak * (1.0 + uRecHW * ak) / 8.0;
  return vec2(p.x - sgn * bb * ax.y, p.y + sgn * bb * ax.x);
}
float recZ(int b, int n, float L, float u0) {
  int m = n - 1; float u = recWrap(b, m, L, u0);
  if (!(L > 0.0) && u >= recT(uRecChain, b + m).z) return recT(uRecChain, b + m).w;
  int k; int j; float f; recSeg(b, n, L, u, k, j, f);
  float zk = recT(uRecChain, b + k).w; return zk + (recT(uRecChain, b + j).w - zk) * f;
}
void recPlace(inout vec2 P, inout float key, inout vec4 S) {
  if (aRec.x < 0) return;
  int q = 3 * aRec.x; vec4 t0 = recT(uRecStrip, q); vec4 t1 = recT(uRecStrip, q + 1); vec4 t2 = recT(uRecStrip, q + 2);
  int r = aRec.y >> 16; int i = aRec.y & 65535; int N = int(t2.y);
  if (t1.w < 0.5) { vec4 v = recT(uRecFb, int(t2.z) + r * (N + 1) + i); P = v.xy; key = v.z; S.x = v.w; return; }
  vec4 ci = recT(uRecCi, int(t2.x)); int b = int(ci.x); int n = int(ci.y); float L = ci.z;
  float fi = float(i); float fN = float(N);
  float z = recZ(b, n, L, t1.x + t1.y * fi / fN);
  float sL = t0.x + t0.y * fi / fN; float sR = t0.z + t0.w * fi / fN;
  vec2 pl = r != 2 ? recOff(b, n, L, sL, t1.z, t0.y / fN) : vec2(0.0);
  vec2 pr = r != 0 ? recOff(b, n, L, sR, -t1.z, t0.w / fN) : vec2(0.0);
  if (r == 0) { P = pl; key = z - uRecZt; S.x = sL; }
  else if (r == 2) { P = pr; key = z - uRecZt; S.x = sR; }
  else { P = (pl + pr) / 2.0; key = z; S.x = (sL + sR) / 2.0; }
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
