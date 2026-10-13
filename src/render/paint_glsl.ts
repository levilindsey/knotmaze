// G2 SHADER PAINT - the GLSL library (strings only). Every per-sample and
// per-tick COLOR the CPU used to bake now evaluates here, per vertex
// (section color) or per pixel (reveal FX, gameplay paint), from:
//   - three page-lifetime RGBA32F data textures, read with texelFetch only
//     (paint_model.ts owns them; layouts below):
//       uKStatic  CHAINS | CTRLIDX | RUNS               (events)
//       uKGeom    per-chain arc tables                  (per update())
//       uKReveal  reveal SOURCES                        (reveal start)
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
//   uKBase  = (runBase, -, debugView, paletteMode)
//   uKFx    = (style, animT, fxNow, fxOn)   style: FX_STYLE ids; animT =
//             the reveal clock (anim s); fxNow = wall s since reveal start
//   uKFx2   = (phase13, phase29, revealOn, flTime)  burn flicker phases
//             (reduced mod 2 pi on the CPU) and its uniform part
//   uKShape = (taperArc, tipFloor, glowArc, glowHold)
//   uKInk   = (inkSpeed, isInk, -, -)
//   uKKnots = anim -> wall speed knots (animT, wallT, invSpeed, valid)
export const KNOT_UNIFORMS_GLSL = /* glsl */ `
uniform vec4 uKBase;
uniform vec4 uKFx;
uniform vec4 uKFx2;
uniform vec4 uKShape;
uniform vec4 uKInk;
uniform vec4 uKKnots[8];
`;

// Data access + chain geometry (vertex and fragment stages).
export const PAINT_DATA_GLSL = /* glsl */ `
uniform highp sampler2D uKStatic;
uniform highp sampler2D uKGeom;
uniform highp sampler2D uKReveal;
${glslConstBlock()}
const float K_TAU = 6.283185307179586;
const float K_INV_TAU = 0.15915494309189535;

highp vec4 kS(int i) { return texelFetch(uKStatic, ivec2(i & ${W1}, i >> ${S}), 0); }
highp vec4 kG(int i) { return texelFetch(uKGeom, ivec2(i & ${W1}, i >> ${S}), 0); }
highp vec4 kR(int i) { return texelFetch(uKReveal, ivec2(i & ${W1}, i >> ${S}), 0); }

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
  float fxDone;
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
  c.fxDone = g.z;
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

// G2.1 REVEAL + APPEARANCE FX (needs PAINT_DATA_GLSL + KNOT_UNIFORMS_GLSL).
// Every function mirrors paint_math.ts line for line.
export const PAINT_FX_GLSL = /* glsl */ `
struct KIgn {
  bool hit;
  float tA;
  float cFrom;
  float dir;
  float t0;
  float rate;
  float tEnd;
  float span;
};

KIgn kIgnition(KChain c, highp float ctrl) {
  KIgn r;
  r.hit = false;
  r.tA = 1e9;
  r.cFrom = 0.0;
  r.dir = 1.0;
  r.t0 = 0.0;
  r.rate = 1.0;
  r.tEnd = 0.0;
  r.span = 0.0;
  int n = c.nCtrl;
  int sl = clamp(int(floor(ctrl)), 0, n - 1);
  highp vec4 I = kS(c.idx + sl);
  if (uKInk.y > 0.5) {
    int j = c.closed ? (sl + 1 == n ? 0 : sl + 1) : min(sl + 1, n - 1);
    highp float b = kS(c.idx + j).w;
    r.hit = true;
    r.tA = I.w + (b - I.w) * (ctrl - float(sl));
    return r;
  }
  if (I.y < -0.5) return r;
  // The slot's hint: its first touching source + (count - 1) / 8.
  int s0 = int(I.y);
  int cnt = int(fract(I.y) * 8.0 + 0.5) + 1;
  for (int k = 0; k < 4; k++) {
    if (k >= cnt) break;
    int s = s0 + k;
    if (s >= c.src0 + c.srcN) break;
    highp vec4 A = kR(2 * s);
    if (ctrl < A.x - 1e-4 || ctrl > A.y + 1e-4) continue;
    highp vec4 B = kR(2 * s + 1);
    highp float t = B.x + abs(ctrl - A.z) / B.y;
    if (t < r.tA) {
      r.hit = true;
      r.tA = t;
      r.cFrom = A.z;
      r.dir = A.w;
      r.t0 = B.x;
      r.rate = B.y;
      r.tEnd = B.z;
      r.span = B.w;
    }
  }
  return r;
}

highp float kWall(highp float tA) {
  highp vec4 k = uKKnots[0];
  for (int i = 1; i < 8; i++) {
    highp vec4 q = uKKnots[i];
    if (q.w < 0.5 || q.x > tA) break;
    k = q;
  }
  return k.y + (tA - k.x) * k.z;
}

highp float kSmooth(highp float x) {
  highp float c = clamp(x, 0.0, 1.0);
  return c * c * (3.0 - 2.0 * c);
}

highp float kFxTail(int st) {
  highp float t = st == 1 ? RAINBOW_HOLD + RAINBOW_FADE
    : st == 2 ? COMET_FADE_IN
    : st == 3 ? DUST_FADE_IN
    : BURN_RECOVER_END;
  return t + 0.02;
}

highp float kBurnAge(KChain c, KIgn g, highp float ctrl) {
  int n = c.nCtrl;
  int sl = int(floor(ctrl));
  if (c.closed) sl -= n * int(floor(float(sl) / float(n)));
  else sl = clamp(sl, 0, n - 1);
  highp float a0 = kCA(c, sl);
  highp float a1 = sl + 1 < n ? kCA(c, sl + 1) : c.total;
  highp float apc = max(1e-4, a1 - a0);
  highp float tl = min(g.tA + BURN_HOT_ARC / (g.rate * apc), g.tEnd);
  return max(0.0, uKFx.z - kWall(tl));
}

highp float kRainbowP(highp float age) {
  return age >= RAINBOW_HOLD + RAINBOW_FADE
    ? 0.0
    : 1.0 - kSmooth((age - RAINBOW_HOLD) / RAINBOW_FADE);
}

highp float kMaterialize(highp float age, int style) {
  highp float e = style == 3 ? DUST_FADE_IN : COMET_FADE_IN;
  return age >= e ? 1.0 : kSmooth(age / e);
}

vec3 kBurn(vec3 rgb, highp float t, highp float k, bool roots) {
  if (t >= BURN_RECOVER_END) return rgb;
  if (roots) {
    highp float brown = 1.0 - kSmooth((t - ROOTS_START) / ROOTS_FADE);
    if (brown > 0.004) rgb += (vec3(0.35, 0.25, 0.18) - rgb) * brown;
    return rgb;
  }
  highp float heatW = 1.0 - kSmooth((t - 0.015) / 0.05);
  highp float heatY = kSmooth(t / 0.02) * (1.0 - kSmooth((t - 0.1) / 0.12));
  highp float ember = kSmooth(t / 0.08) * (1.0 - kSmooth((t - BURN_EMBER_END) / 0.25));
  highp float chr = kSmooth((t - BURN_EMBER_END * 0.55) / 0.25) *
    (1.0 - kSmooth((t - BURN_CHAR_END) / (BURN_RECOVER_END - BURN_CHAR_END)));
  rgb += (vec3(0.14, 0.11, 0.1) - rgb) * (chr * 0.92);
  if (ember > 0.01) {
    highp float spatial = 1.0 - chr;
    highp float fl = 0.5 +
      spatial * (0.3 * sin(uKFx2.x + k * 0.31) + 0.2 * sin(uKFx2.y + k * 0.83)) +
      (1.0 - spatial) * uKFx2.w;
    highp float e = ember * 0.85 * (1.0 - heatW * 0.7);
    rgb += (vec3(1.0 - 0.3 * fl, 0.54 - 0.35 * fl, 0.16 - 0.08 * fl) - rgb) * e;
  }
  if (heatY > 0.001) rgb += (vec3(1.0, 0.84, 0.3) - rgb) * heatY;
  if (heatW > 0.001) rgb += (vec3(1.0, 0.97, 0.88) - rgb) * heatW;
  return rgb;
}

highp float kFxWeight(int style, highp float age) {
  if (style == 1) return kRainbowP(age);
  if (style == 2 || style == 3) return kMaterialize(age, style) - 1.0;
  return 0.0;
}

highp float kFxSolid(highp float w) {
  if (w < 0.0) return 1.0 + w;
  if (w > 0.0) return 1.0 - kSmooth((w - 0.06) / 0.34);
  return 1.0;
}

highp float kFanAlpha(highp float solid) {
  highp float a = kSmooth((solid - FAN_SOLID_START) / (1.0 - FAN_SOLID_START));
  return a >= 0.999 ? 1.0 : a;
}

// The joint gate (record header J1 = (tOn, tLast)).
highp float knotFanAlpha(highp vec4 J1) {
  if (uKFx.w < 0.5) return 1.0;
  if (uKFx.z < J1.x) return 0.0;
  return kFanAlpha(kFxSolid(kFxWeight(int(uKFx.x + 0.5), uKFx.z - J1.y)));
}

// RAINBOW: p = appearance progress (1 = just appeared -> 0 = recovered).
// Sequence along a fading point: full stripes (6 bands across the ribbon,
// side = vUV.y), then a brief FADED WHITE wash, then the true section
// color - the two windows overlap so every handoff is a crossfade.
vec3 kRainbowBlend(vec3 base, highp float pIn, highp float side) {
  highp float p = min(pIn, 1.0);
  int bi = int(min(side, 0.99999) * 6.0);
  vec3 stripe = bi == 0 ? vec3(0.92, 0.15, 0.18)
    : bi == 1 ? vec3(1.0, 0.55, 0.08)
    : bi == 2 ? vec3(1.0, 0.88, 0.12)
    : bi == 3 ? vec3(0.12, 0.78, 0.3)
    : bi == 4 ? vec3(0.15, 0.42, 1.0)
    : vec3(0.58, 0.25, 0.95);
  highp float rb = smoothstep(0.30, 0.52, p);
  highp float wh = smoothstep(0.06, 0.26, p) * (1.0 - smoothstep(0.38, 0.60, p));
  base = mix(base, stripe, rb);
  return mix(base, vec3(0.93, 0.93, 0.95), wh * 0.6);
}

// FX applied to a material's color at a ribbon point (burn / roots tint;
// rainbow progress and materialize alpha come back through the outs).
// Revealed points only - the caller passes the ctrl and sample position.
vec3 kFxColor(KChain c, highp float ctrl, highp float kSample, vec3 rgb,
    out highp float pRain, out highp float alpha) {
  pRain = 0.0;
  alpha = 1.0;
  int st = int(uKFx.x + 0.5);
  if (uKFx.w < 0.5 || st == 0 || uKFx.z >= c.fxDone) return rgb;
  // A SETTLED SLOT (CTRLIDX .w = its latest source finish): identity.
  if (uKInk.y < 0.5) {
    int sl = clamp(int(floor(ctrl)), 0, c.nCtrl - 1);
    if (uKFx.z >= kWall(kS(c.idx + sl).w) + kFxTail(st)) return rgb;
  }
  KIgn g = kIgnition(c, ctrl);
  if (!g.hit || uKFx.y < g.tA) {
    // Ahead of the front (the tip taper's leading edge): materializing
    // styles stay transparent there, the rest wear no effect yet.
    if (st == 2 || st == 3) alpha = 0.0;
    return rgb;
  }
  if (st == 4 || st == 5) return kBurn(rgb, kBurnAge(c, g, ctrl), kSample, st == 5);
  highp float age = uKFx.z - kWall(g.tA);
  if (st == 1) pRain = kRainbowP(age);
  else alpha = kMaterialize(age, st);
  return rgb;
}
`;