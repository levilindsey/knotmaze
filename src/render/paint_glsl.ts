// G2 SHADER PAINT - the GLSL library (strings only). Every per-sample and
// per-tick COLOR the CPU used to bake now evaluates here, per vertex
// (section color) or per pixel (reveal FX, gameplay paint), from:
//   - three page-lifetime RGBA32F data textures, read with texelFetch only
//     (paint_model.ts owns them; layouts below):
//       uKStatic  CHAINS | CTRLIDX | RUNS | SRC        (events)
//       uKGeom    per-chain arc tables                  (per update())
//       uKPaint   per-run gameplay paint records        (gameplay events)
//   - one uniform group (knotUniforms) whose clocks are reduced on the CPU
//     in float64 - no absolute clock ever reaches the GPU.
// The CPU mirror (paint_math.ts) transliterates every function here line
// for line; numeric constants come from paint_const.ts (glslConstBlock).
//
// CALLER CONTRACT: a fragment supplies its chain, its fractional ctrl, its
// arc along the chain, its side across the ribbon (0..1) and pxArc (world
// arc per pixel, from fwidth() at the TOP of main - uniform control flow).
//
// LAYOUTS (texel = vec4; i = linear texel index, row = i >> 10):
//   CHAINS (texel 2ch, 2ch+1):  C0 = (nCtrl, closed, sampleCount, idxBase)
//                               C1 = (geomBase, srcFirst, srcCount, -)
//   KGEOM at geomBase:          G0 = (total, arcPer, -, -), then the
//                               control arcs packed 4 per texel (slot order)

import { PAINT_CONST, glslConstBlock } from "./paint_const";

const W1 = (1 << PAINT_CONST.K_ROW_SHIFT) - 1;
const S = PAINT_CONST.K_ROW_SHIFT;

// The shared uniform block (paint_model.ts knotUniforms()).
//   uKBase  = (runBase, srcBase, debugView, paletteMode)
export const KNOT_UNIFORMS_GLSL = /* glsl */ `
uniform vec4 uKBase;
`;

// Data access + chain geometry (vertex and fragment stages).
export const PAINT_DATA_GLSL = /* glsl */ `
uniform highp sampler2D uKStatic;
uniform highp sampler2D uKGeom;
${glslConstBlock()}
const float K_TAU = 6.283185307179586;
const float K_INV_TAU = 0.15915494309189535;

highp vec4 kS(int i) { return texelFetch(uKStatic, ivec2(i & ${W1}, i >> ${S}), 0); }
highp vec4 kG(int i) { return texelFetch(uKGeom, ivec2(i & ${W1}, i >> ${S}), 0); }

struct KChain {
  int ch;
  int nCtrl;
  bool closed;
  int count;
  int idx;
  int geom;
  int src0;
  int srcN;
  float total;
  float arcPer;
};

KChain kChainOf(int ch, highp vec4 a, highp vec4 b, highp vec4 g) {
  KChain c;
  c.ch = ch;
  c.nCtrl = int(a.x + 0.5);
  c.closed = a.y > 0.5;
  c.count = int(a.z + 0.5);
  c.idx = int(a.w + 0.5);
  c.geom = int(b.x + 0.5);
  c.src0 = int(b.y + 0.5);
  c.srcN = int(b.z + 0.5);
  c.total = g.x;
  c.arcPer = g.y;
  return c;
}

KChain kChain(int ch) {
  highp vec4 a = kS(2 * ch);
  highp vec4 b = kS(2 * ch + 1);
  return kChainOf(ch, a, b, kG(int(b.x + 0.5)));
}

// Control i's arc (i in [0, nCtrl)).
highp float kCA(KChain c, int i) {
  highp vec4 t = kG(c.geom + 1 + (i >> 2));
  int j = i & 3;
  return j == 0 ? t.x : j == 1 ? t.y : j == 2 ? t.z : t.w;
}

// The renderer's paintArcAt: closed rings wrap, open chains clamp the slot
// (ctrl < 0 extrapolates to a negative arc, as on the CPU).
highp float kArcOfCtrl(KChain c, highp float x) {
  int n = c.nCtrl;
  if (c.closed) {
    highp float fl = floor(x);
    highp float t = x - fl;
    int i0 = int(fl - float(n) * floor(fl / float(n)));
    int i1 = i0 + 1 >= n ? 0 : i0 + 1;
    highp float a0 = kCA(c, i0);
    highp float a1 = kCA(c, i1);
    if (a1 <= a0) a1 += c.total;
    highp float a = a0 + (a1 - a0) * t;
    return a - c.total * floor(a / c.total);
  }
  int i = clamp(int(floor(x)), 0, n - 1);
  highp float a0 = kCA(c, i);
  highp float a1 = i + 1 < n ? kCA(c, i + 1) : c.total;
  return min(c.total, a0 + (a1 - a0) * (x - float(i)));
}

// Monotone unwrapped arc of an unwrapped ctrl.
highp float kArcU(KChain c, highp float x) {
  return c.closed
    ? kArcOfCtrl(c, x) + c.total * floor(x / float(c.nCtrl))
    : kArcOfCtrl(c, x);
}

// The bake's arc -> ctrl map, by binary search (vertex stage; 13 steps
// cover 8192 controls).
highp float kCtrlOfArc(KChain c, highp float a) {
  int lo = 0;
  int hi = c.nCtrl - 1;
  for (int it = 0; it < 14; it++) {
    if (lo >= hi) break;
    int m = (lo + hi + 1) >> 1;
    if (kCA(c, m) <= a) lo = m;
    else hi = m - 1;
  }
  highp float a0 = kCA(c, lo);
  highp float a1 = lo < c.nCtrl - 1 ? kCA(c, lo + 1) : c.total;
  return float(lo) + (a1 > a0 ? min(1.0, (a - a0) / (a1 - a0)) : 0.0);
}

// The exact ctrl at arc a from an approximate one (fragment stage: the
// interpolated vertex ctrl is off by a fraction of a slot where a control
// breakpoint falls inside a quad): ring-aware slot walk, then the clamped
// fraction.
highp float kCtrlNear(KChain c, highp float a, highp float approx) {
  int n = c.nCtrl;
  int s = int(floor(approx));
  if (c.closed) s -= n * int(floor(float(s) / float(n)));
  else s = clamp(s, 0, n - 1);
  highp float a0 = 0.0;
  highp float a1 = 0.0;
  for (int it = 0; it < 6; it++) {
    a0 = kCA(c, s);
    a1 = s + 1 < n ? kCA(c, s + 1) : c.total;
    highp float d = a - a0;
    if (c.closed) d -= c.total * floor(d / c.total + 0.5);
    if (d < 0.0) {
      if (!c.closed && s == 0) break;
      s = s == 0 ? n - 1 : s - 1;
    } else if (d >= a1 - a0) {
      if (!c.closed && s == n - 1) break;
      s = s + 1 == n ? 0 : s + 1;
    } else {
      break;
    }
  }
  highp float d = a - a0;
  if (c.closed) d -= c.total * floor(d / c.total + 0.5);
  highp float t = a1 > a0 ? clamp(d / (a1 - a0), 0.0, 1.0) : 0.0;
  return float(s) + t;
}

// A decoded arc TURN (gap_mask.ts / RibbonMesh aArcPos) -> world arc:
// closed rings go once around, open runs span 0.45 of a turn.
highp float kArcScale(KChain c) {
  return c.closed ? c.total : c.total / 0.45;
}
`;

// Vertex-stage declarations + main-body lines. aKey = (chain, sample
// index): the vertex's arc is exactly k * arcPer. Out: the chain header
// (flat, so fragments skip three fetches), the vertex's exact ctrl and its
// sample position, each as a WRAP PAIR (A wraps at 0/1, B at 0.5 - the
// gap_mask turn trick: across a closed ring's wrap quad one of them jumps,
// the fragment takes the other by fwidth).
export const PAINT_VERT_DECL = /* glsl */ `
in vec2 aKey;
out highp vec2 vCtrl;
out highp vec2 vSamp;
flat out highp vec4 vKC0;
flat out highp vec4 vKC1;
flat out highp vec4 vKG0;
`;
export const PAINT_VERT_MAIN = /* glsl */ `
  {
    int kch = int(aKey.x + 0.5);
    highp vec4 kc0 = kS(2 * kch);
    highp vec4 kc1 = kS(2 * kch + 1);
    highp vec4 kg0 = kG(int(kc1.x + 0.5));
    KChain kc = kChainOf(kch, kc0, kc1, kg0);
    highp float kctrl = kCtrlOfArc(kc, aKey.y * kc.arcPer);
    highp float kcf = kctrl / float(kc.nCtrl);
    vCtrl = vec2(kcf, kc.closed && kcf < 0.5 ? kcf + 1.0 : kcf);
    highp float ksf = aKey.y / float(kc.count);
    vSamp = vec2(ksf, kc.closed && ksf < 0.5 ? ksf + 1.0 : ksf);
    vKC0 = kc0;
    vKC1 = vec4(kc1.xyz, float(kch));
    vKG0 = kg0;
  }
`;

// Fragment-stage declarations for PAINT_VERT_*'s varyings, and the
// per-fragment chain point: call kFragPoint at the TOP of main (fwidth).
export const PAINT_FRAG_DECL = /* glsl */ `
in highp vec2 vCtrl;
in highp vec2 vSamp;
flat in highp vec4 vKC0;
flat in highp vec4 vKC1;
flat in highp vec4 vKG0;
`;
// The fragment's wrap-pair picks (uniform control flow), then its arc and
// approximate ctrl. Needs PAINT_DATA_GLSL.
export const PAINT_FRAG_LIB = /* glsl */ `
// x = arc along the chain, y = approximate ctrl (refine with kCtrlNear).
highp vec2 kFragPoint(KChain c) {
  highp vec2 cw = fwidth(vCtrl);
  highp vec2 sw = fwidth(vSamp);
  highp float cf = cw.y < 0.5 * cw.x ? vCtrl.y : vCtrl.x;
  highp float sf = sw.y < 0.5 * sw.x ? vSamp.y : vSamp.x;
  highp float arc = c.closed
    ? fract(sf) * c.total
    : min(sf * float(c.count) * c.arcPer, c.total);
  highp float ctrl = c.closed ? fract(cf) * float(c.nCtrl) : cf * float(c.nCtrl);
  return vec2(arc, ctrl);
}
KChain kFragChain() {
  return kChainOf(int(vKC1.w + 0.5), vKC0, vKC1, vKG0);
}
`;