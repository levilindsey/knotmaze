// K1362 s2: the per-pixel junction look as a fragment shader, a line-for-line
// port of eval.ts's GfEval (the CPU mirror; keep the two in step). The
// tables come from one RGBA32F texture (gf_pack.ts's layout).
//
// Two variants: the app's (PROBE off) writes (ink, coverage, 0, 1) into an
// RGBA8 target the app composites; the probe's writes three RGBA32F targets:
// (ink, coverage, label chain, label s), (winKind, winA, winB, nSeg),
// (nK, pieces, surfaces, 0), read back against GfEval. The winning term per
// pixel (side, arc, cap, tangent point, K1049 arc, and which piece / corner)
// is computed in both, never blended.
//
// World position: x = uMap.x * fragX + uMap.y, y = uMap.z * fragY + uMap.w
// (gl_FragCoord, pixel centres): the app maps device pixels through the
// camera, the probe maps its tile rows bottom-up (readPixels' row order).
import { GF_LOG } from "./gf_pack";
import { MAXP } from "./tables";
import { MAXK, MAXR } from "./eval";
import { constantLoops, GF_PACK, packArrays, scalarizeArrays } from "./gf_reg";

export const GF_VS = `#version 300 es
void main() {
  int id = gl_VertexID;
  gl_Position = vec4(id == 1 ? 3.0 : -1.0, id == 2 ? 3.0 : -1.0, 0.0, 1.0);
}`;

/**
 * K1362 s4: a TIER is the same program with smaller per-pixel arrays (p pieces, k corners), drawn first under a
 * stencil route (gf_pass.ts): a pixel that would need more than the tier holds (a (p+1)th piece, a (k+1)th corner,
 * or, without `ramps`, a ramping piece) is DISCARDED, and a later tier or the full program draws it. Where a tier
 * writes, its state is the full program's state step for step, so its output is the full program's (the mirror's).
 * `half`: the tier keeps its integer and [0, 1] per-pixel state in mediump (fp16 on mobile; ignored by desktop GPUs).
 * `reg` (K1362 s6): the tier's arrays become scalars read through selects (gf_reg.ts). `unroll` (K1362 s6): every
 * loop over the per-pixel lists gets a constant trip count (the list's capacity) and breaks at the list's end, so a
 * compiler can unroll it and index the arrays by constants. `pack` (K1362 s6): the per-piece arrays share one vec4
 * and one ivec4 array (gf_reg.ts packArrays); "f" packs only the floats, "i" only the ints.
 */
export interface GfTier { p: number; k: number; ramps: boolean; half?: boolean; reg?: boolean; unroll?: boolean; pack?: GfPackForm }
export type GfPackForm = boolean | "f" | "i";

/** The program's source forms (gf_reg.ts); a tier's own flags set them by default. The probe keeps the plain form. */
/** oldKeys: the keys over the chain's whole pin and arm lists (before gf_keys.ts's bins; a bench's A/B). */
/**
 * split (K1362 s7, gf_split.ts): the tier in two passes. 1 = the scan, keys and corners, packed into four unsigned
 * targets (RGBA32UI x3 for the pieces, RG32UI for the corners and counts; a value that does not fit discards, so
 * the full program draws that pixel); 2 = layers() and composite() from them, rebuilding pd, pfx, pfy, the corner
 * radii and thruQ from their indices with the scan's own lines. Needs a tier (its p and k size the targets' use).
 */
export interface GfForm { reg?: boolean; unroll?: boolean; pack?: GfPackForm; oldKeys?: boolean; split?: 1 | 2 }

export function gfFs(probe: boolean, tangentTerms = true, tier?: GfTier, form: GfForm = { reg: tier?.reg, unroll: tier?.unroll, pack: tier?.pack }): string {
  let src = gfSrc(probe, tangentTerms, tier);
  if (form.oldKeys) src = src.replace("precision highp float;\n", "precision highp float;\n#define OLDKEYS 1\n");
  if (form.split) {
    if (probe || !tier || tier.p > 3 || tier.k > 2) throw new Error("gfFs: split needs a non-probe tier of at most p3/k2");
    src = src.replace("precision highp float;\n", `precision highp float;\n#define SPLIT${form.split} 1\n`);
  }
  if (probe) return src;
  const mp = tier ? tier.p : MAXP;
  const mk = tier ? tier.k : MAXK;
  if (form.unroll) src = constantLoops(src, { np: mp, nk: mk, ns: mp + mk, nr: MAXR, nTj: 8 });
  if (form.pack) {
    const pick = form.pack === "f" ? "pPF" : form.pack === "i" ? "pPI" : "";
    src = packArrays(src, pick ? GF_PACK.filter((g) => g.name === pick) : GF_PACK);
  }
  if (form.reg) src = scalarizeArrays(src, { MAXP: mp, MAXK: mk, MAXS: mp + mk });
  return src;
}

function gfSrc(probe: boolean, tangentTerms: boolean, tier?: GfTier): string {
  const mp = tier ? tier.p : MAXP;
  const mk = tier ? tier.k : MAXK;
  const half = !!(tier && tier.half);
  return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define MAXP ${mp}
#define MAXK ${mk}
#define MAXR ${MAXR}
#define MAXS ${mp + mk}
#define LOG ${GF_LOG}
#define TWM ${(1 << GF_LOG) - 1}
#define BIG 1e30
#define BIGT 1e29
#define IQ ${half ? "mediump" : "highp"}
#define FQ ${half ? "mediump" : "highp"}
${probe ? "#define PROBE 1" : ""}
${tangentTerms ? "#define TANGENT 1" : ""}
${tier ? "#define TIER 1" : ""}
${tier && !tier.ramps ? "#define NORAMP 1" : ""}
uniform sampler2D uD;
uniform int uOCh, uOV, uOPin, uOArm, uOK, uOChk, uOCell, uOChL, uOKL, uOKC, uOKB, uOKA;
uniform float uH, uW, uAA, uSigma, uZt, uWin, uRc;
uniform vec4 uGrid; // gx0, gy0, G, 0
uniform ivec2 uGDim; // gW, gH
uniform vec4 uMap;
#ifdef PROBE
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
#elif defined(SPLIT1)
layout(location = 0) out uvec4 o0;
layout(location = 1) out uvec4 o1;
layout(location = 2) out uvec4 o2;
layout(location = 3) out uvec2 o3;
#else
out vec4 o0;
#endif
#ifdef SPLIT2
uniform highp usampler2D uP0, uP1, uP2, uP3;
#endif
#ifdef PROBE
#define PR(x) x
#else
#define PR(x)
#endif
#ifdef SPLIT1
#define S1(x) x
#else
#define S1(x)
#endif

vec4 F(int i) { return texelFetch(uD, ivec2(i & TWM, i >> LOG), 0); }
float L4(int base, int i) { vec4 t = F(base + (i >> 2)); int c = i & 3; return c == 0 ? t.x : c == 1 ? t.y : c == 2 ? t.z : t.w; }
float ss(float e0, float e1, float x) { float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
int pmod(int k, int n) { int r = k - n * int(floor(float(k) / float(n))); if (r < 0) r += n; if (r >= n) r -= n; return r; }

// pieces (ptx, pty, pend, the surfaces' scs / swk / swa / swb and cWk / cWa / cWb feed only the probe's label
// and winner outputs, never ink or coverage: the app's program, without PROBE, does not carry them)
IQ int pc[MAXP]; float ps[MAXP]; float pd[MAXP]; float pfx[MAXP]; float pfy[MAXP]; IQ int plo[MAXP]; IQ int phi[MAXP];
float pkey[MAXP]; IQ int pg[MAXP]; FQ float pramp[MAXP];
#ifdef SPLIT1
IQ int pkq[MAXP]; // K1362 s7: the nearest segment's index as the scan unwrapped it (plo <= pkq <= phi): pass 2 rebuilds pd, pfx, pfy from it
#endif
#ifdef PROBE
float ptx[MAXP]; float pty[MAXP]; bool pend[MAXP];
#endif
IQ int psurf[MAXP]; int np;
// corners near p
IQ int kk[MAXK]; float krho[MAXK]; IQ int kIn[MAXK]; bool kSec[MAXK]; int nk;
// surfaces
IQ int sid[MAXS]; float skey[MAXS]; float sckey[MAXS]; IQ int scch[MAXS]; bool scov[MAXS];
FQ float sv[MAXS]; FQ float sa[MAXS]; IQ int sord[MAXS]; int ns;
#ifdef PROBE
float scs[MAXS]; int swk[MAXS]; int swa[MAXS]; int swb[MAXS];
#endif
int labC; float labS; int cWk; int cWa; int cWb; float cCov;

// K1362 s6 keys per bin (gf_keys.ts): the piece's bin on its chain, (pin search lo, hi, first candidate arm, count).
// u is depth()'s own u; the bin's bounds and candidates hold for any u within half a bin of it.
#ifdef OLDKEYS
#define KAB uOArm
vec4 keyBin(int c, float s) { vec4 C1 = F(uOCh + 3 * c + 1); return vec4(-1.0, C1.z, C1.w, F(uOCh + 3 * c + 2).x); }
#else
#define KAB uOKA
vec4 keyBin(int c, float s) {
  vec4 C0 = F(uOCh + 3 * c); vec4 C1 = F(uOCh + 3 * c + 1);
  float u = s;
  if (C0.z > 0.5) { u = mod(s - C1.x, C0.w); u += C1.x; }
  vec4 KC = F(uOKC + c);
  float bi = clamp(floor((u - KC.w) / KC.z), 0.0, KC.y - 1.0);
  return F(uOKB + int(KC.x) + int(bi));
}
#endif

int mg; float mramp;
void member(int c, float s, vec4 KB) {
  vec4 C0 = F(uOCh + 3 * c);
  int a0 = int(KB.z); int an = int(KB.w); float lam = uH; bool closed = C0.z > 0.5; float len = C0.w;
  int g = -1; float ramp = 0.0;
  for (int i = a0; i < a0 + an; i++) {
    vec4 A = F(KAB + 2 * i);
    float d = (s - A.x) * A.y; if (closed) d = mod(d, len);
    if (d < -1e-12 || d > A.z + 1e-12) continue;
    float Lc = A.w;
    float rp = Lc >= BIGT ? 1.0 : ss(Lc, Lc - lam, d);
    if (g < 0 || rp > ramp) { g = int(F(KAB + 2 * i + 1).x); ramp = rp; }
  }
  if (g >= 0 && ramp > 0.0) {
    for (int i = a0; i < a0 + an; i++) {
      vec4 A = F(KAB + 2 * i); float Lc = A.w;
      if (int(F(KAB + 2 * i + 1).x) != g || Lc >= BIGT) continue;
      float d = (s - A.x) * A.y; if (closed) { d = mod(d, len); if (d > len / 2.0) d -= len; }
      if (!(d < 1e-12 && d > Lc - lam)) continue;
      ramp = min(ramp, ss(Lc, Lc - lam, d));
    }
  }
  mg = g; mramp = g < 0 ? 1.0 : ramp;
}

float hat(float z, float d, float w) { return w <= 1e-12 ? (d <= 0.0 ? z : 0.0) : d >= w ? 0.0 : z * (1.0 - d / w); }
float depth(int c, float s, vec4 KB) {
  vec4 C0 = F(uOCh + 3 * c); vec4 C1 = F(uOCh + 3 * c + 1);
  int n = int(C1.z); if (n == 0) return 0.0;
  int b = uOPin + int(C1.y); float win = uWin; bool closed = C0.z > 0.5; float len = C0.w;
  float u = s;
  if (closed) { u = mod(s - C1.x, len); u += C1.x; }
  int lo = int(KB.x); int hi = int(KB.y);
  while (hi - lo > 1) { int m = (lo + hi) >> 1; if (F(b + m).x <= u) lo = m; else hi = m; }
  float zL = 0.0; float dL = 0.0; float zR = 0.0; float dR = 0.0; float w = win;
  if (closed) {
    int iL = lo < 0 ? n - 1 : lo; vec4 PL = F(b + iL); float sL = lo < 0 ? PL.x - len : PL.x;
    int iR = lo + 1 >= n ? 0 : lo + 1; vec4 PR = F(b + iR); float sR = lo + 1 >= n ? PR.x + len : PR.x;
    w = min(win, sR - sL); zL = PL.y; dL = u - sL; zR = PR.y; dR = sR - u;
  } else if (lo < 0) { vec4 P = F(b); zR = P.y; dR = P.x - u; dL = BIG; }
  else if (lo + 1 >= n) { vec4 P = F(b + n - 1); zL = P.y; dL = u - P.x; dR = BIG; }
  else { vec4 PL = F(b + lo); vec4 PR = F(b + lo + 1); w = min(win, PR.x - PL.x); zL = PL.y; dL = u - PL.x; zR = PR.y; dR = PR.x - u; }
  return hat(zL, dL, w) + hat(zR, dR, w);
}

float pieceD(int j, vec2 p) {
  int c = pc[j]; vec4 C0 = F(uOCh + 3 * c); int v0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
  float d2 = BIG;
  for (int q = plo[j]; q <= phi[j]; q++) {
    int k = q; if (closed) k = pmod(k, nseg); else if (k < 0 || k >= nseg) continue;
    vec4 A = F(uOV + v0 + k); vec4 B = F(uOV + v0 + k + 1);
    vec2 a = A.xy; vec2 dd = B.xy - a;
    float l2 = dot(dd, dd); float u = l2 > 0.0 ? clamp(dot(p - a, dd) / l2, 0.0, 1.0) : 0.0;
    vec2 e = p - a - dd * u; float e2 = dot(e, e);
    if (e2 < d2) d2 = e2;
  }
  return d2;
}

bool inSector(int k, vec2 p) {
  vec4 K0 = F(uOK + 6 * k); vec4 K2 = F(uOK + 6 * k + 2);
  float rx = p.x - K0.x; float ry = p.y - K0.y;
  float cab = K2.x * K2.w - K2.y * K2.z;
  float c1 = K2.x * ry - K2.y * rx; float c2 = rx * K2.w - ry * K2.z;
  return cab >= 0.0 ? c1 >= 0.0 && c2 >= 0.0 : c1 <= 0.0 && c2 <= 0.0;
}

bool outsideArms(int k, int own, vec2 p) {
  float lim = uH - 2.0 * uAA; float lim2 = lim * lim;
  vec4 K3 = F(uOK + 6 * k + 3);
  for (int side = 0; side < 2; side++) {
    int c = side == 0 ? int(K3.x) : int(K3.y); if (c == own) continue;
    for (int m = 0; m < np; m++) if (pc[m] == c && pieceD(m, p) < lim2) return false;
  }
  return true;
}

int entry(int id) {
  for (int i = 0; i < ns; i++) if (sid[i] == id) return i;
  int i = ns++; sid[i] = id; skey[i] = -BIG; sckey[i] = -BIG; scch[i] = -1; PR(scs[i] = 0.0;) scov[i] = false; return i;
}
float band2(float D) { return (1.0 - ss(uW - uAA, uW + uAA, D)) * ss(-uAA, uAA, D); }

void layers(vec2 p) {
  float h = uH; float aa = uAA; float W = uW;
  ns = 0;
  for (int j = 0; j < np; j++) {
    if (!(pd[j] < h + aa)) continue;
    int e = entry(psurf[j]);
    if (pkey[j] > skey[e]) skey[e] = pkey[j];
    if (pd[j] < h) { scov[e] = true; if (pkey[j] > sckey[e]) { sckey[e] = pkey[j]; scch[e] = pc[j]; PR(scs[e] = ps[j];) } }
  }
  float zt = uZt;
  for (int i = 0; i < nk; i++) {
    int k = kk[i]; if (kIn[i] != 2) continue;
    vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); vec4 K3 = F(uOK + 6 * k + 3); vec4 K4 = F(uOK + 6 * k + 4); vec4 K5 = F(uOK + 6 * k + 5);
    vec2 ta = p - K4.zw; vec2 tb = p - K5.xy;
    bool nearerA = dot(ta, ta) <= dot(tb, tb);
    float z = nearerA ? K4.x : K4.y; float key = z - zt;
    int e = entry(int(K1.z));
    if (key > skey[e]) skey[e] = key;
    if (krho[i] > K0.z) { scov[e] = true; if (key > sckey[e]) { sckey[e] = key; scch[e] = nearerA ? int(K3.x) : int(K3.y); PR(scs[e] = nearerA ? K3.z : K3.w;) } }
  }
  for (int i = 0; i < ns; i++) sord[i] = i;
  for (int i = 1; i < ns; i++) { int v = sord[i]; int m = i - 1; while (m >= 0 && skey[sord[m]] < skey[v]) { sord[m + 1] = sord[m]; m--; } sord[m + 1] = v; }
  for (int e = 0; e < ns; e++) {
    int S = sid[e]; float D = -BIG; float v = 0.0; PR(int wk = 0; int wa = -1; int wb = 0;)
    for (int j = 0; j < np; j++) {
      if (psurf[j] != S || !(pd[j] < h + aa)) continue;
      float X = pd[j]; if (h - X > D) D = h - X;
      if (!(X > h - W - aa && X > 1e-12)) continue;
      vec2 f = vec2(pfx[j], pfy[j]);
      vec2 q = f + (h * (p - f)) / X;
      float bur = 0.0;
      for (int m = 0; m < np && bur < 1.0; m++) {
        if (m == j || psurf[m] != S) continue;
        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));
        if (wb2 > bur) bur = wb2;
      }
      for (int i = 0; i < nk && bur < 1.0; i++) {
        int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S) continue;
        float rq = length(q - K0.xy);
        if (rq > K0.z && rq < K0.w && inSector(k, q) && outsideArms(k, pc[j], q)) bur = 1.0;
      }
      float val = (1.0 - bur) * band2(h - X);
      if (val > v) { v = val; PR(wk = pend[j] ? 3 : 1; wa = pc[j]; wb = ptx[j] * (p.y - pfy[j]) - pty[j] * (p.x - pfx[j]) >= 0.0 ? 1 : -1;) }
    }
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || !kSec[i]) continue;
      float rho = krho[i]; float Dk = rho - K0.z;
      if (kIn[i] == 2 && Dk > D) D = Dk;
      if (!(rho > 1e-12)) continue;
      vec2 q = K0.xy + (K0.z * (p - K0.xy)) / rho;
      float bur = 0.0;
      for (int m = 0; m < np && bur < 1.0; m++) {
        if (psurf[m] != S) continue;
        float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, q)));
        if (wb2 > bur) bur = wb2;
      }
      float val = (1.0 - bur) * band2(Dk);
      if (val > v) { v = val; PR(wk = 2; wa = k; wb = 0;) }
    }
#ifdef TANGENT
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K1 = F(uOK + 6 * k + 1); if (int(K1.z) != S || K1.x > 0.5) continue;
      vec4 K4 = F(uOK + 6 * k + 4); vec4 K5 = F(uOK + 6 * k + 5);
      for (int t = 0; t < 2; t++) {
        vec2 T = t == 1 ? K5.xy : K4.zw;
        float dT = length(p - T); if (!(dT < W + aa)) continue;
        float bur = 0.0;
        for (int m = 0; m < np && bur < 1.0; m++) {
          if (psurf[m] != S) continue;
          float wb2 = 1.0 - ss(h - 2.0 * aa, h, sqrt(pieceD(m, T)));
          if (wb2 > bur) bur = wb2;
        }
        float val = (1.0 - bur) * band2(dT) * ss(-aa, aa, D);
        if (val > v) { v = val; PR(wk = 4; wa = k; wb = t;) }
      }
    }
#endif
    sv[e] = v; sa[e] = ss(-aa, aa, D); PR(swk[e] = wk; swa[e] = wa; swb[e] = wb;)
  }
  int top = -1;
  for (int i = 0; i < ns; i++) if (scov[i] && (top < 0 || sckey[i] > sckey[top])) top = i;
  labC = top >= 0 ? scch[top] : -1; PR(labS = top >= 0 ? scs[top] : 0.0;)
}

float comp(int sw) {
  float Tt = 1.0; float ink = 0.0; float best = 0.0;
  for (int i = 0; i < ns; i++) {
    int e = sord[i]; if (sw >= 0 && i == sw) e = sord[i + 1]; else if (sw >= 0 && i == sw + 1) e = sord[i - 1];
    float c = Tt * sv[e];
    if (c > 0.0) { ink += c; PR(if (c > best && sw < 0) { best = c; cWk = swk[e]; cWa = swa[e]; cWb = swb[e]; }) }
    Tt *= 1.0 - sa[e];
    if (!(Tt > 0.0)) break;
  }
  if (sw < 0) cCov = 1.0 - max(Tt, 0.0);
  return min(1.0, ink);
}

float composite() {
  float zt = uZt;
  cWk = 0; cWa = -1; cWb = 0;
  float r = comp(-1);
  for (int i = 0; i + 1 < ns; i++) {
    float gap = skey[sord[i]] - skey[sord[i + 1]];
    if (!(gap < zt)) continue;
    float r2 = comp(i);
    if (r2 == r) continue;
    float t = ss(-zt, zt, gap);
    r = t * r + (1.0 - t) * r2;
    break;
  }
  return r;
}

void main() {
  vec2 p = vec2(uMap.x * gl_FragCoord.x + uMap.y, uMap.z * gl_FragCoord.y + uMap.w);
  float x = p.x; float y = p.y;
  float h = uH; float aa = uAA; float W = uW;
  int nSeg = 0; int nK = 0;
  float oInk = 0.0; float oCov = 0.0; int oCh = -1; float oS = 0.0; int oWk = 0; int oWa = -1; int oWb = 0;
  np = 0; nk = 0; ns = 0; bool ovf = false;
  int gx = int(floor((x - uGrid.x) / uGrid.z)); int gy = int(floor((y - uGrid.y) / uGrid.z));
#ifdef SPLIT1
  uint s3x = 0u; uint s3y = 0u; // K1362 s7: pass 1's corners and counts (outside the grid: none)
  uvec4 e0 = uvec4(0u); uvec4 e1 = uvec4(0u); uvec4 e2 = uvec4(0u);
#endif
  if (gx >= 0 && gy >= 0 && gx < uGDim.x && gy < uGDim.y) {
#ifdef SPLIT2
    // K1362 s7 pass 2 (gf_split.ts): pass 1's pieces, keys and corners, read back; everything pass 1 dropped
    // (ps, the scan's state) is not needed below, and pd, pfx, pfy, krho, kSec, kIn and thruQ are rebuilt from
    // their indices by the same lines that made them.
    ivec2 pix = ivec2(gl_FragCoord.xy);
    uvec2 S3 = texelFetch(uP3, pix, 0).xy;
    np = int((S3.y >> 19) & 3u); nk = int((S3.y >> 17) & 3u);
    int thruK = int(S3.y & 0xffffu) - 1; bool yielded = ((S3.y >> 16) & 1u) != 0u; float thruQ = 0.0;
    if (thruK >= 0) { vec4 K0 = F(uOK + 6 * thruK); float rx = x - K0.x; float ry = y - K0.y; float d2 = rx * rx + ry * ry; thruQ = sqrt(d2); }
    int nr = 0; int rIdx0 = 0; int rIdx1 = 0;
    for (int j = 0; j < np; j++) {
      uvec4 E = j == 0 ? texelFetch(uP0, pix, 0) : j == 1 ? texelFetch(uP1, pix, 0) : texelFetch(uP2, pix, 0);
      int c = int(E.x & 0xffffu); pc[j] = c; pg[j] = int(E.x >> 16) - 1;
      plo[j] = int(E.y & 0xffffu) - 32768; phi[j] = plo[j] + int((E.y >> 16) & 0xffu); int kq = plo[j] + int(E.y >> 24);
      pkey[j] = uintBitsToFloat(E.z); pramp[j] = uintBitsToFloat(E.w);
      vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5;
      int v = cV0 + (closed ? pmod(kq, nseg) : kq);
      vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
      float ax = A.x; float ay = A.y; float dx = B.x - ax; float dy = B.y - ay;
      float l2 = dx * dx + dy * dy; float u = l2 > 0.0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0.0, 1.0) : 0.0;
      float fx = ax + dx * u; float fy = ay + dy * u; float ex = x - fx; float ey = y - fy; float d2 = ex * ex + ey * ey;
      pd[j] = sqrt(d2); pfx[j] = fx; pfy[j] = fy;
      if (pg[j] >= 0 && pramp[j] > 0.0 && pramp[j] < 1.0) { if (nr == 0) rIdx0 = j; else rIdx1 = j; nr++; }
    }
    if (nk > 0) kk[0] = int(S3.x & 0xffffu);
    if (nk > 1) kk[1] = int(S3.x >> 16);
    for (int i = 0; i < nk; i++) {
      int k = kk[i]; vec4 K0 = F(uOK + 6 * k);
      float rx = x - K0.x; float ry = y - K0.y; float rho = sqrt(rx * rx + ry * ry);
      bool sec = inSector(k, p); bool inR = rho <= K0.w && sec;
      kSec[i] = sec; krho[i] = rho; kIn[i] = !inR ? 0 : rho > K0.z - aa ? 2 : 1;
    }
#else
    int cell = gy * uGDim.x + gx; float rc = uRc; float rc2 = rc * rc;
    vec4 CE = F(uOCell + cell);
    int c0 = int(CE.x); int cn = int(CE.y);
    for (int q = c0; q < c0 + cn; q++) {
#ifdef TIER
      if (ovf) break; // not in the loop's condition: ANGLE's D3D translation of "q < c0 + cn && !ovf" lost pieces (K1362 s4)
#endif
      int ch = int(L4(uOChL, q));
      vec4 H0 = F(uOChk + 2 * ch); vec4 BX = F(uOChk + 2 * ch + 1);
      float bx = max(max(BX.x - x, 0.0), x - BX.z); float by = max(max(BX.y - y, 0.0), y - BX.w);
      if (bx * bx + by * by >= rc2) continue;
      int c = int(H0.z); int v0 = int(H0.x); int chn = int(H0.y);
      vec4 C0 = F(uOCh + 3 * c); int cV0 = int(C0.x); int nseg = int(C0.y) - 1; bool closed = C0.z > 0.5; float len = C0.w;
      for (int i = 0; i < chn; i++) {
        int v = v0 + i; nSeg++;
        vec4 A = F(uOV + v); vec4 B = F(uOV + v + 1);
        float ax = A.x; float ay = A.y; float dx = B.x - ax; float dy = B.y - ay;
        float l2 = dx * dx + dy * dy; float u = l2 > 0.0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0.0, 1.0) : 0.0;
        float fx = ax + dx * u; float fy = ay + dy * u; float ex = x - fx; float ey = y - fy; float d2 = ex * ex + ey * ey;
        if (d2 >= rc2) continue;
        float d = sqrt(d2); float s = A.z + u * (B.z - A.z); int k = v - cV0;
        bool isEnd = !closed && ((k == 0 && u <= 0.0) || (k == nseg - 1 && u >= 1.0));
        int j = -1;
        for (int m = 0; m < np; m++) {
          if (pc[m] != c) continue;
          float ds = abs(s - ps[m]); if (closed) ds = min(ds, len - ds);
          if (ds < uSigma) { j = m; break; }
        }
        if (j >= 0) {
          int q2 = k;
          if (closed) { int ref = plo[j]; float hn = float(nseg) / 2.0; while (float(q2 - ref) > hn) q2 -= nseg; while (float(ref - q2) > hn) q2 += nseg; }
          if (q2 < plo[j]) plo[j] = q2; if (q2 > phi[j]) phi[j] = q2;
          if (d < pd[j]) { pd[j] = d; ps[j] = s; pfx[j] = fx; pfy[j] = fy; PR(ptx[j] = dx; pty[j] = dy; pend[j] = isEnd;) S1(pkq[j] = q2;) }
          continue;
        }
        if (np < MAXP) j = np++;
#ifdef TIER
        else { ovf = true; break; } // the full program keeps this piece: it draws the pixel
#else
        else { int far = 0; for (int m = 1; m < MAXP; m++) if (pd[m] > pd[far]) far = m; if (pd[far] <= d) continue; j = far; }
#endif
        pc[j] = c; pd[j] = d; ps[j] = s; pfx[j] = fx; pfy[j] = fy; plo[j] = k; phi[j] = k; PR(ptx[j] = dx; pty[j] = dy; pend[j] = isEnd;) S1(pkq[j] = k;)
      }
    }
#ifdef TIER
    if (ovf) { discard; return; } // D3D (ANGLE on Windows) runs on past a discard: end the pixel outright
#endif
    // keys and membership
    float zK = uZt / h;
    int nr = 0; int rIdx0 = 0; int rIdx1 = 0;
    for (int j = 0; j < np; j++) {
      vec4 KB = keyBin(pc[j], ps[j]);
      float pz = depth(pc[j], ps[j], KB); pkey[j] = pz - pd[j] * zK;
      member(pc[j], ps[j], KB); pg[j] = mg; pramp[j] = mramp;
      if (mg >= 0 && mramp > 0.0 && mramp < 1.0) {
        if (nr < MAXR) { if (nr == 0) rIdx0 = j; else rIdx1 = j; nr++; }
        else pramp[j] = mramp >= 0.5 ? 1.0 : 0.0;
      }
    }
#ifdef NORAMP
    if (nr > 0) { discard; return; } // ramping pieces: the configurations below; a later program draws the pixel
#endif
    // corners near p
    int k0 = int(CE.z); int kn = int(CE.w);
    int thruK = -1; float thruQ = 0.0; bool yielded = false; int nTj = 0; int tj[8];
    for (int q = k0; q < k0 + kn; q++) {
      int k = int(L4(uOKL, q)); vec4 K1 = F(uOK + 6 * k + 1); if (K1.x < 0.5) continue;
      vec4 K0 = F(uOK + 6 * k);
      float rx = x - K0.x; float ry = y - K0.y; float d2 = rx * rx + ry * ry; float lim = K1.y + W + 4.0 * aa;
      if (d2 <= lim * lim && inSector(k, p)) { if (thruK < 0) { thruK = k; thruQ = sqrt(d2); } if (nTj < 8) tj[nTj++] = int(K1.w); }
    }
    if (thruK >= 0) {
      for (int q = k0; q < k0 + kn && !yielded; q++) {
        int k = int(L4(uOKL, q)); vec4 K1 = F(uOK + 6 * k + 1); if (K1.x > 0.5) continue;
        bool same = false; for (int i = 0; i < nTj; i++) if (tj[i] == int(K1.w)) same = true;
        if (!same && inSector(k, p)) yielded = true;
      }
    }
#ifdef TIER
    for (int q = k0; q < k0 + kn; q++) {
#else
    for (int q = k0; q < k0 + kn && nk < MAXK; q++) {
#endif
      int k = int(L4(uOKL, q)); nK++;
      vec4 K0 = F(uOK + 6 * k); vec4 K1 = F(uOK + 6 * k + 1);
      if (K1.x > 0.5) {
        if (yielded) continue;
        float tx = x - K0.x; float ty = y - K0.y; float lim = K1.y + W + 4.0 * aa;
        if (!(tx * tx + ty * ty <= lim * lim) || !inSector(k, p)) continue;
      }
      float rx = x - K0.x; float ry = y - K0.y; float rho = sqrt(rx * rx + ry * ry);
      if (!(rho > K0.z - aa - W) || rho > K0.w + W + 2.0 * aa) continue;
      bool sec = inSector(k, p); bool inR = rho <= K0.w && sec;
#ifdef TIER
      if (nk == MAXK) { ovf = true; break; } // the full program keeps this corner: it draws the pixel
#endif
      kSec[nk] = sec; kk[nk] = k; krho[nk] = rho; kIn[nk] = !inR ? 0 : rho > K0.z - aa ? 2 : 1; nk++;
    }
#ifdef TIER
    if (ovf) { discard; return; } // never past the arrays: D3D runs on past a discard
#endif
#endif
#ifdef SPLIT1
    // K1362 s7 pass 1: pack the pieces and corners for pass 2. A value that does not fit its field discards, so
    // the stencil stays 0 and the full program draws the pixel (exact by construction, like the tier's overflow).
    bool bad = thruK + 1 >= 65536;
    for (int j = 0; j < np; j++) {
      int span = phi[j] - plo[j]; int ko = pkq[j] - plo[j];
      if (pc[j] >= 65535 || pg[j] + 1 >= 65536 || plo[j] < -32768 || plo[j] >= 32768 || span >= 256 || ko < 0 || ko >= 256) bad = true;
    }
    for (int i = 0; i < nk; i++) if (kk[i] >= 65535) bad = true;
    if (bad) { discard; return; }
    for (int j = 0; j < np; j++) {
      uvec4 E = uvec4(uint(pc[j]) | (uint(pg[j] + 1) << 16), uint(plo[j] + 32768) | (uint(phi[j] - plo[j]) << 16) | (uint(pkq[j] - plo[j]) << 24),
        floatBitsToUint(pkey[j]), floatBitsToUint(pramp[j]));
      if (j == 0) e0 = E; else if (j == 1) e1 = E; else e2 = E;
    }
    s3x = nk > 0 ? uint(kk[0]) | (nk > 1 ? uint(kk[1]) << 16 : 0u) : 0u;
    s3y = uint(thruK + 1) | (yielded ? 1u << 16 : 0u) | (uint(nk) << 17) | (uint(np) << 19);
#else
    // configurations over the ramping pieces
    if (nr == 2 && pramp[rIdx0] < pramp[rIdx1]) { int t = rIdx0; rIdx0 = rIdx1; rIdx1 = t; }
    float ink = 0.0; float cov = 0.0; int lab = -1; PR(float labSv = 0.0; int wk = 0; int wa = -1; int wb = 0;) float bestW = -1.0;
    // Under NORAMP nr == 0 here (the discard above), so the loop runs once: one layering, weight 1. It stays a loop
    // on a runtime bound: inlined straight-line, D3D's compiler (ANGLE on Windows) failed the program at draw.
    for (int cfg = 0; cfg <= nr; cfg++) {
      float hiR = cfg == 0 ? 1.0 : pramp[cfg == 1 ? rIdx0 : rIdx1];
      float loR = cfg == nr ? 0.0 : pramp[cfg == 0 ? rIdx0 : rIdx1];
      float wgt = hiR - loR; if (!(wgt > 0.0) && nr > 0) continue;
      for (int j = 0; j < np; j++) {
        bool mem = pg[j] >= 0 && pramp[j] >= 1.0;
        if (pg[j] >= 0 && pramp[j] > 0.0 && pramp[j] < 1.0) { mem = (cfg >= 1 && rIdx0 == j) || (cfg >= 2 && rIdx1 == j); }
        psurf[j] = mem ? pg[j] : -1 - j;
      }
      layers(p);
      float r = composite();
      float w = nr == 0 ? 1.0 : wgt;
      ink += w * r; cov += w * cCov;
      if (w > bestW) { bestW = w; lab = labC; PR(labSv = labS; wk = cWk; wa = cWa; wb = cWb;) }
    }
    if (thruK >= 0) {
      vec4 K0 = F(uOK + 6 * thruK); vec4 K3 = F(uOK + 6 * thruK + 3);
      int own = int(K3.x); float r = K0.z; float outv = 1.0 - ss(r + W - aa, r + W + aa, thruQ);
      if (!yielded) { if (lab < 0 || lab == own) { ink = ss(r - aa, r + aa, thruQ) * outv; if (lab < 0 && ink > 0.0) { lab = own; PR(labSv = K3.z;) } PR(wk = 5; wa = thruK;) } }
      else if (lab == own) ink = min(ink, outv);
    }
    oInk = min(1.0, ink); oCov = min(1.0, cov); PR(oCh = lab; oS = labSv; oWk = wk; oWa = wa; oWb = wb;)
#endif
  }
#ifdef PROBE
  o0 = vec4(oInk, oCov, float(oCh), oS);
  o1 = vec4(float(oWk), float(oWa), float(oWb), float(nSeg));
  o2 = vec4(float(nK), float(np), float(ns), 0.0);
#elif defined(SPLIT1)
  o0 = e0; o1 = e1; o2 = e2; o3 = uvec2(s3x, s3y);
#else
  o0 = vec4(oInk, oCov, 0.0, 1.0);
#endif
}
`;
}
