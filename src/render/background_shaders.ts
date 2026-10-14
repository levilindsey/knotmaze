// SHADER BACKGROUNDS (K21) - the GLSL. Three programs:
//   - one EFFECT program per background, drawn as a quad into the low-res
//     render texture (vUV spans the texture = the screen, y down);
//   - the BLIT, which stretches that texture over the screen as the first
//     layer of the main canvas, dithered;
//   - the FOG BACKDROP: the fog of war, drawn as the same background (see
//     background.ts) with the fog canvas as its coverage.
// All effects are noise built from one integer hash (PCG2D, Jarzynski and
// Olano 2020) - no sin() hashes, so the patterns hold at any coordinate.
// Every effect returns the design's INK plus a small, intensity-scaled
// share of its accents: dark, low-contrast, the threads' own colors.

import { readsDetail } from "./background_model";
import type { BackgroundId } from "./background_model";

// Uniforms every effect reads (one shared UniformGroup, background.ts):
//   uView   = (screen w, screen h in CSS px, 1 / min(w, h), drift time s)
//   uParams = (seed offset x, seed offset y, intensity [0, 1], unused)
//   uInk, uA1-uA3 = the design's ink and accents (rgb, .w unused): the
//     gamut's 0.12 / 0.5 / 0.88 colors, or the custom accents 2 / 1 / 3
// (the shaped programs add uShape and uShape2: SHAPE_HEAD).
const EFFECT_HEAD = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
out vec4 finalColor;

uniform vec4 uView;
uniform vec4 uParams;
uniform vec4 uInk;
uniform vec4 uA1;
uniform vec4 uA2;
uniform vec4 uA3;
`;

// Hashes and noise. gnoise: gradient (Perlin) noise, about [-0.7, 0.7];
// fbm: rotated octaves (each x2 frequency, half amplitude).
const NOISE_GLSL = /* glsl */ `
uvec2 pcg2d(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ (v >> 16u);
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ (v >> 16u);
  return v;
}
vec2 rnd2(ivec2 c) {
  return vec2(pcg2d(uvec2(c))) * (1.0 / 4294967296.0);
}
// Triangular-PDF noise in (-1, 1) per pixel: +-1 LSB dither hides 8-bit
// banding in dark, slow gradients.
float tpdf(vec2 fc) {
  uvec2 h = pcg2d(uvec2(ivec2(fc)) + uvec2(40503u, 9137u));
  return (float(h.x >> 8u) + float(h.y >> 8u)) * (1.0 / 16777216.0) - 1.0;
}
float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  ivec2 c = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float va = dot(rnd2(c) * 2.0 - 1.0, f);
  float vb = dot(rnd2(c + ivec2(1, 0)) * 2.0 - 1.0, f - vec2(1.0, 0.0));
  float vc = dot(rnd2(c + ivec2(0, 1)) * 2.0 - 1.0, f - vec2(0.0, 1.0));
  float vd = dot(rnd2(c + ivec2(1, 1)) * 2.0 - 1.0, f - vec2(1.0, 1.0));
  return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y);
}
const mat2 OCT = mat2(1.6, -1.2, 1.2, 1.6);
float fbm(vec2 p, int oct) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * gnoise(p);
    p = OCT * p + vec2(3.17, 1.39);
    a *= 0.5;
  }
  return s;
}
`;

// Interleaved gradient noise (Jimenez 2014) in [0, 1): a three-multiply
// dither for the FULL-resolution passes (blit, fog) - the PCG hash cost
// 0.06 ms a frame there at 3200x1800. The blit and the fog backdrop must
// share it exactly: fully fogged pixels are then the background's pixels.
const IGN_GLSL = /* glsl */ `
float ign(vec2 fc) {
  return fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
}
`;

// Each effect body defines vec3 effect(vec2 p, float t, float I): p is the
// screen position centered with the short side spanning 1, t the drift
// time, I the intensity. It returns the color; main() adds the dither.
const EFFECT_MAIN = /* glsl */ `
void main(void) {
  vec2 px = vUV * uView.xy;
  vec2 p = (px - 0.5 * uView.xy) * uView.z;
  vec3 c = effect(p, uView.w, uParams.z);
  c += tpdf(gl_FragCoord.xy) * (1.0 / 255.0);
  finalColor = vec4(c, 1.0);
}
`;

// VELLUM - dark vellum, as under an illuminated knot: broad mottling,
// cloudy pulp, short fibers in five directions and a fine grain, under a
// soft vignette. It keeps the page's own ink ON AVERAGE (the texture lifts
// toward the design's hue and sinks toward black about equally), so it
// reads as a surface, not a recolor. Static (rendered once per change).
// This is the program for drift time 0 - vellum's default, still at auto
// speed - kept VERBATIM from K21 so its frames stay bit-identical; any
// other time renders VELLUM_DRIFT (see effectProgram).
const VELLUM = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  vec2 s = p + uParams.xy;
  float m1 = fbm(s * 2.1, 5);
  float m2 = fbm(s * 7.5 + 11.3, 4);
  float fib = 0.0;
  for (int k = 0; k < 5; k++) {
    float a = 0.4 + 1.2566 * float(k) + uParams.y;
    vec2 dir = vec2(cos(a), sin(a));
    vec2 q = vec2(dot(s, dir), dot(s, vec2(-dir.y, dir.x)));
    float n = gnoise(q * vec2(28.0, 520.0) + float(k) * 17.0);
    float dens = 0.55 + 0.45 * gnoise(q * 6.0 + float(k) * 5.3);
    fib += pow(max(0.0, 1.0 - abs(n) * 4.0), 4.0) * dens;
  }
  float grain = tpdf(gl_FragCoord.xy + 31.0);
  float lift = I * (0.55 * m1 + 0.28 * m2 + 0.2 * (fib - 0.12) + 0.08 * grain);
  vec3 c = lift > 0.0
    ? mix(uInk.rgb, mix(uInk.rgb, uA2.rgb, 0.55), min(lift, 1.0))
    : uInk.rgb * (1.0 + 0.9 * max(lift, -0.6));
  float vig = smoothstep(0.35, 1.3, length(p));
  return c * (1.0 - 0.34 * I * vig);
}
`;

// VELLUM, MOVING (K79: vellum at a set animation speed). The mottling and
// the pulp drift apart slowly, so their sum evolves rather than slides,
// and the vignette's light wanders; the fibers and the grain stay put, the
// paper itself. Every time term vanishes at t = 0, but the compiled
// program does not reproduce VELLUM's bits there (the GPU compiler fuses
// the multiply-adds differently: 34 px at 1 LSB of 1.26 M in a same-state
// A/B), hence two programs.
const VELLUM_DRIFT = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  vec2 s = p + uParams.xy;
  float m1 = fbm(s * 2.1 + t * vec2(0.006, -0.004), 5);
  float m2 = fbm(s * 7.5 + 11.3 + t * vec2(-0.012, 0.009), 4);
  float fib = 0.0;
  for (int k = 0; k < 5; k++) {
    float a = 0.4 + 1.2566 * float(k) + uParams.y;
    vec2 dir = vec2(cos(a), sin(a));
    vec2 q = vec2(dot(s, dir), dot(s, vec2(-dir.y, dir.x)));
    float n = gnoise(q * vec2(28.0, 520.0) + float(k) * 17.0);
    float dens = 0.55 + 0.45 * gnoise(q * 6.0 + float(k) * 5.3);
    fib += pow(max(0.0, 1.0 - abs(n) * 4.0), 4.0) * dens;
  }
  float grain = tpdf(gl_FragCoord.xy + 31.0);
  float lift = I * (0.55 * m1 + 0.28 * m2 + 0.2 * (fib - 0.12) + 0.08 * grain);
  vec3 c = lift > 0.0
    ? mix(uInk.rgb, mix(uInk.rgb, uA2.rgb, 0.55), min(lift, 1.0))
    : uInk.rgb * (1.0 + 0.9 * max(lift, -0.6));
  float vig = smoothstep(0.35, 1.3,
    length(p - 0.08 * vec2(sin(0.05 * t), sin(0.037 * t))));
  return c * (1.0 - 0.34 * I * vig);
}
`;

// MIST - domain-warped fbm (a warp of a warp, after Inigo Quilez): slow
// marbled smoke in the design's accents.
const MIST = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  vec2 s = p * 1.15 + uParams.xy;
  vec2 q = vec2(fbm(s + vec2(0.0, 0.013 * t), 4),
                fbm(s + vec2(5.2, 1.3) - vec2(0.011 * t, 0.0), 4));
  vec2 r = vec2(fbm(s + 3.2 * q + vec2(1.7, 9.2) + 0.008 * t, 4),
                fbm(s + 3.2 * q + vec2(8.3, 2.8) - 0.006 * t, 4));
  float f = fbm(s + 3.0 * r, 5);
  float dens = smoothstep(-0.3, 0.5, f);
  float warm = clamp(0.5 + 1.1 * r.x, 0.0, 1.0);
  float glow = clamp(dot(q, q) * 2.2, 0.0, 1.0);
  vec3 c = uInk.rgb;
  c = mix(c, mix(uA1.rgb, uA3.rgb, warm), dens * 0.30 * I);
  c = mix(c, uA2.rgb, glow * 0.14 * I);
  return c;
}
`;

// WASH - ink wash / watercolor: three overlapping washes, each a soft
// blotch with its pigment pooled along the edge, drifting apart slowly.
const WASH = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  vec2 s = p * 1.05 + uParams.xy;
  vec3 c = uInk.rgb;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec2 o = vec2(3.7 * fk, 1.9 * fk)
      + 0.006 * t * vec2(cos(2.1 * fk + 0.4), sin(2.1 * fk + 0.4));
    float f = fbm(s * (1.0 + 0.28 * fk) + o, 5) + 0.06 * fbm(s * 7.0 + o, 2);
    float m = smoothstep(0.0, 0.1, f);
    float rim = m * (1.0 - m) * 4.0;
    vec3 tint = k == 0 ? uA1.rgb : (k == 1 ? uA2.rgb : uA3.rgb);
    c = mix(c, tint, (m * 0.07 + rim * 0.07) * I);
  }
  return c;
}
`;

// SILK - flow streaks: long thin streaks along a slowly meandering, warped
// flow (one direction per design), sheened by broad light bands - draped
// silk, or a slow current.
const SILK = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  vec2 s = p + uParams.xy;
  vec2 w = vec2(fbm(s * 0.75 + vec2(0.0, 0.008 * t), 3),
                fbm(s * 0.75 + vec2(4.7, 2.3) - vec2(0.006 * t, 0.0), 3));
  vec2 q = p + 1.1 * w;
  float a = uParams.y * 0.3;
  vec2 dir = vec2(cos(a), sin(a));
  vec2 r = vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x)));
  float n = fbm(vec2(r.x * 1.3 - 0.015 * t, r.y * 16.0) + uParams.xy, 4);
  float sheen = smoothstep(-0.25, 0.5,
    fbm(s * 0.6 + vec2(0.005 * t, 0.0) + 7.0, 3));
  vec3 tint = mix(uA1.rgb, uA3.rgb, clamp(0.5 + 1.2 * w.x, 0.0, 1.0));
  float k = clamp(0.5 + 1.8 * n, 0.0, 1.0);
  return mix(uInk.rgb, tint, k * (0.3 + 0.7 * sheen) * 0.44 * I);
}
`;

// AURORA - curtains of light across the sky: each hangs up from a wavy
// lower hem (sharp below, a long fade upward), striated by fine vertical
// rays that bend with its folds; folds and bands drift slowly. Placed by
// screen height (vUV.y), so the sky reads the same at any aspect.
const AURORA = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  float x = p.x + uParams.x;
  float y = vUV.y;
  vec3 c = uInk.rgb;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float hem = 0.34 + 0.2 * fk
      + 0.13 * fbm(vec2(x * 0.7 + 5.0 * fk, 0.012 * t + 3.0 * fk), 3);
    float d = y - hem;
    float shape = d < 0.0 ? exp(d * 3.4) : exp(-d * 16.0);
    float fold = fbm(vec2(x * 1.3 + 4.0 * fk, 0.016 * t + fk), 2);
    float rays = 0.5 + 0.5 * gnoise(vec2(x * 22.0 + 3.0 * fold + 9.0 * fk,
                                         y * 0.45 - 0.02 * t));
    rays = smoothstep(0.25, 0.85, rays);
    float band = smoothstep(-0.28, 0.32,
      fbm(vec2(x * 0.8 - 0.008 * t + 9.0 * fk, 4.0 * fk), 3));
    vec3 lo = k == 0 ? uA1.rgb : (k == 1 ? uA3.rgb : uA2.rgb);
    vec3 tint = mix(lo, uA2.rgb, clamp(-d * 1.5, 0.0, 1.0));
    c = mix(c, tint, shape * (0.2 + 0.8 * rays) * band * 0.38 * I);
  }
  return c;
}
`;

// CONTOURS - the contour lines of a slowly morphing height field, a map of
// the land under the maze: thin antialiased lines (fwidth), every fifth
// one stronger, over a faint height tint.
const CONTOURS = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  vec2 s = p * 1.3 + uParams.xy;
  float h = fbm(s + vec2(0.004 * t, 0.003 * t), 5);
  float v = h * 12.0;
  float fw = max(fwidth(v), 1e-4);
  float g = abs(fract(v + 0.5) - 0.5);
  float line = 1.0 - smoothstep(0.4 * fw, 1.4 * fw, g);
  float idx = abs(mod(floor(v + 0.5), 5.0)) < 0.5 ? 1.0 : 0.55;
  vec3 tint = mix(uA1.rgb, uA3.rgb, clamp(h * 0.8 + 0.5, 0.0, 1.0));
  return mix(uInk.rgb, tint, (0.06 * (h + 0.5) + 0.30 * line * idx) * I);
}
`;

// Keyed by PROGRAM id: an effect id, or "vellum-drift".
const BODIES: Record<string, string> = {
  vellum: VELLUM,
  "vellum-drift": VELLUM_DRIFT,
  mist: MIST,
  wash: WASH,
  silk: SILK,
  aurora: AURORA,
  contours: CONTOURS,
};

// THE SHAPED PROGRAMS (K79 stage B; `<id>-x`): every effect once more,
// reading the shape params (background_model.ts BackgroundShape) as
// uniforms. An effect switches to its shaped program only when a param it
// reads leaves its default, so every default frame still comes from the
// programs above, untouched (their sources are pinned by hash in
// test/render/background_shaders.test.ts) - the VELLUM_DRIFT lesson: a
// generalized program does not reproduce the bits of the one it
// generalizes, even where the math is the same.
//   uShape  = (1 / scale, fbm gain, fiber strength, grain strength)
//   uShape2 = (silk's streak angle, radians; < 0 = the seed's; unused x3)
// The fbm gain is read only by mist, wash, silk and contours (readsDetail):
// vellum's and aurora's shaped programs use the designed fbm.
// gScreen / gWall hand an effect the UNSCALED screen position and drift
// time, for what must not scale (vellum's vignette and fibers).
const SHAPE_HEAD = /* glsl */ `uniform vec4 uShape;
uniform vec4 uShape2;

vec2 gScreen;
float gWall;
`;

function replaceOnce(src: string, from: string, to: string): string {
  const i = src.indexOf(from);
  if (i < 0 || src.indexOf(from, i + 1) >= 0) {
    throw new Error(`background shader: expected one "${from.trim()}"`);
  }
  return src.slice(0, i) + to + src.slice(i + from.length);
}

// fbm with the octave gain uShape.y (detail; 0.5 = the designed fbm),
// rescaled to the designed fbm's RMS amplitude: detail changes how rough
// the field is, not how strong - thresholds and contrast hold.
const FBM_DESIGNED = /* glsl */ `float fbm(vec2 p, int oct) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * gnoise(p);
    p = OCT * p + vec2(3.17, 1.39);
    a *= 0.5;
  }
  return s;
}`;
const FBM_SHAPED = /* glsl */ `float fbm(vec2 p, int oct) {
  float s = 0.0;
  float a = 0.5;
  float v = 0.0;
  float a0 = 0.5;
  float v0 = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * gnoise(p);
    v += a * a;
    v0 += a0 * a0;
    p = OCT * p + vec2(3.17, 1.39);
    a *= uShape.y;
    a0 *= 0.5;
  }
  return s * sqrt(v0 / v);
}`;
const NOISE_SHAPED = replaceOnce(NOISE_GLSL, FBM_DESIGNED, FBM_SHAPED);

// Scale zooms the pattern about the screen center (p / scale). The drift
// time scales with it, so a drift still crosses the screen at its designed
// speed in CSS px (the contours' ~1 px/s): bigger patterns evolve slower.
const EFFECT_MAIN_SHAPED = /* glsl */ `
void main(void) {
  vec2 px = vUV * uView.xy;
  gScreen = (px - 0.5 * uView.xy) * uView.z;
  gWall = uView.w;
  vec3 c = effect(gScreen * uShape.x, uView.w * uShape.x, uParams.z);
  c += tpdf(gl_FragCoord.xy) * (1.0 / 255.0);
  finalColor = vec4(c, 1.0);
}
`;

// VELLUM, SHAPED: VELLUM_DRIFT (it is VELLUM at t = 0) with fiber and
// grain strengths. The fibers scale up with the pattern but never shrink
// below their designed size (one texel per CSS px cannot draw them finer);
// at strength 0 their loop is skipped. The vignette is the screen's.
const VELLUM_SHAPED = /* glsl */ `
vec3 effect(vec2 p, float t, float I) {
  vec2 s = p + uParams.xy;
  float m1 = fbm(s * 2.1 + t * vec2(0.006, -0.004), 5);
  float m2 = fbm(s * 7.5 + 11.3 + t * vec2(-0.012, 0.009), 4);
  float fib = 0.0;
  if (uShape.z > 0.0) {
    vec2 sf = gScreen * min(uShape.x, 1.0) + uParams.xy;
    for (int k = 0; k < 5; k++) {
      float a = 0.4 + 1.2566 * float(k) + uParams.y;
      vec2 dir = vec2(cos(a), sin(a));
      vec2 q = vec2(dot(sf, dir), dot(sf, vec2(-dir.y, dir.x)));
      float n = gnoise(q * vec2(28.0, 520.0) + float(k) * 17.0);
      float dens = 0.55 + 0.45 * gnoise(q * 6.0 + float(k) * 5.3);
      fib += pow(max(0.0, 1.0 - abs(n) * 4.0), 4.0) * dens;
    }
  }
  float grain = tpdf(gl_FragCoord.xy + 31.0);
  float lift = I * (0.55 * m1 + 0.28 * m2 + 0.2 * uShape.z * (fib - 0.12)
    + 0.08 * uShape.w * grain);
  vec3 c = lift > 0.0
    ? mix(uInk.rgb, mix(uInk.rgb, uA2.rgb, 0.55), min(lift, 1.0))
    : uInk.rgb * (1.0 + 0.9 * max(lift, -0.6));
  float vig = smoothstep(0.35, 1.3,
    length(gScreen - 0.08 * vec2(sin(0.05 * gWall), sin(0.037 * gWall))));
  return c * (1.0 - 0.34 * I * vig);
}
`;

// SILK, SHAPED: a set streak (and flow) direction replaces the seed's.
const SILK_SHAPED = replaceOnce(
  SILK,
  "  float a = uParams.y * 0.3;\n",
  "  float a = uShape2.x < 0.0 ? uParams.y * 0.3 : uShape2.x;\n"
);

// Keyed by EFFECT id (the program id without "-x").
const SHAPED_BODIES: Record<string, string> = {
  vellum: VELLUM_SHAPED,
  mist: MIST,
  wash: WASH,
  silk: SILK_SHAPED,
  aurora: AURORA,
  contours: CONTOURS,
};

// The program an effect renders with at drift time t: its own, except
// vellum away from t = 0 (VELLUM's comment) - or, when its shape params
// leave their defaults (shaped; needsShapeProgram), its shaped program.
export function effectProgram(id: string, t: number, shaped = false): string {
  if (shaped) return `${id}-x`;
  return id === "vellum" && t !== 0 ? "vellum-drift" : id;
}

export function effectFragment(id: string): string {
  if (id.endsWith("-x")) {
    const effect = id.slice(0, -2);
    const shaped = SHAPED_BODIES[effect];
    if (!shaped) throw new Error(`no background effect "${id}"`);
    // Detail (the fbm's octave gain) reaches only the effects that read it
    // (BACKGROUND_DETAIL_EFFECTS); vellum and aurora keep the designed fbm.
    const noise = readsDetail(effect as BackgroundId) ? NOISE_SHAPED : NOISE_GLSL;
    return EFFECT_HEAD + SHAPE_HEAD + noise + shaped + EFFECT_MAIN_SHAPED;
  }
  const body = BODIES[id];
  if (!body) throw new Error(`no background effect "${id}"`);
  return EFFECT_HEAD + NOISE_GLSL + body + EFFECT_MAIN;
}

// The pixi mesh uniforms every mesh shader receives (see SECTION_VERT in
// ribbon_renderer.ts: the mesh pipe syncs these by name).
const MESH_UNIFORMS = /* glsl */ `
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;
`;

// Quad vertex shader shared by the effect pass and the blit.
export const QUAD_VERT = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
out vec4 vColor;
${MESH_UNIFORMS}
void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
  vColor = uColor * uWorldColorAlpha;
}
`;

// The BLIT: the low-res texture stretched over the screen (bilinear),
// dithered again at full resolution - the upscale interpolates between
// 8-bit texels, and a dark slow gradient shows its 1/255 steps without it.
export const BLIT_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vUV;
in vec4 vColor;
out vec4 finalColor;
uniform sampler2D uBgTex;
${IGN_GLSL}
void main(void) {
  vec3 c = texture(uBgTex, vUV).rgb + (ign(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0);
  finalColor = vec4(c, 1.0) * vColor;
}
`;

// The FOG BACKDROP: the fog of war drawn AS the background (fog of war
// hides the maze; with a shader background, hidden means "background",
// exactly as a flat fog color matched the flat page before). Coverage is
// the fog canvas's alpha, displaced by the fog's drifting map - the same
// edge wobble the flat fog gets from its DisplacementFilter, folded into
// the lookup so the background itself is never displaced (a displaced
// copy would swim against the layer beneath). The color is the background
// texture at this pixel's SCREEN position (the layer is screen-fixed),
// dithered exactly as the blit dithers it - fully fogged pixels are the
// background pixels.
//   uFogRect = (fog x0, y0 (world), 1 / span, wobble amplitude CSS px)
//   uFogDisp = (map origin x, y (world), 1 / map span, unused)
//   uBgScreen = (1 / screen w, 1 / screen h (CSS px), unused, unused)
export const FOG_VERT = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aUV;
out vec2 vWorld;
out vec2 vScreen;
out float vPxPerWorld;
out vec4 vColor;
${MESH_UNIFORMS}
void main(void) {
  mat3 mv = uWorldTransformMatrix * uTransformMatrix;
  vec3 g = mv * vec3(aPosition, 1.0);
  gl_Position = vec4((uProjectionMatrix * g).xy, 0.0, 1.0);
  vWorld = aPosition;
  vScreen = g.xy;
  vPxPerWorld = length(vec2(mv[0][0], mv[0][1]));
  vColor = uColor * uWorldColorAlpha;
}
`;

export const FOG_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vWorld;
in vec2 vScreen;
in float vPxPerWorld;
in vec4 vColor;
out vec4 finalColor;
uniform sampler2D uFogTex;
uniform sampler2D uDispTex;
uniform sampler2D uBgTex;
uniform vec4 uFogRect;
uniform vec4 uFogDisp;
uniform vec4 uBgScreen;
${IGN_GLSL}
void main(void) {
  vec2 m = texture(uDispTex, (vWorld - uFogDisp.xy) * uFogDisp.z).rg - 0.5;
  vec2 w = vWorld + m * (uFogRect.w / max(vPxPerWorld, 1e-6));
  float a = texture(uFogTex, (w - uFogRect.xy) * uFogRect.z).a;
  vec3 c = texture(uBgTex, vScreen * uBgScreen.xy).rgb
    + (ign(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0);
  finalColor = vec4(c, 1.0) * (a * vColor.a);
}
`;
