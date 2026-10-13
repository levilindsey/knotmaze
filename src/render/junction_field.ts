// GPU JUNCTION FIELD. The junction field (see RibbonRenderer.rebuildFillets)
// used to be evaluated on the CPU at every fan vertex - ring-subdivided so
// Gouraud could approximate a nonlinear field - and at every over-fill
// vertex near a joint, every paint tick: 5-30 ms per tick at big
// cuspRadius, while the GPU sat idle. It now runs PER PIXEL in fragment
// shaders. The CPU only builds geometry (positions + a per-vertex RECORD
// index) and uploads two float DATA TEXTURES:
//
//   PAINT  (RGBA32F, linear texel index): one texel per ribbon sample,
//          (section r, g, b, paint U) - exactly what RibbonMesh.writePaint
//          handed the ribbon, so the field reads the ribbons' own material
//          (reveal glow and gameplay paint included). Each chain owns a
//          contiguous texel range (its base: the G2 chain header C1.w);
//          rows wrap (chains longer than a row are fine). Only rows of
//          chains a paint tick rewrote upload.
//   RECORD (RGBA32F, linear texel index): one record per junction / tip:
//          header (jx, jy, nArms, -), the GATE texel J1 = (tOn, tLast, -, -)
//          (G2.1: reveal-relative wall times - shown once every arm is
//          revealed, fading in as the latest-ignited arm's appearance FX
//          settles; paint_glsl knotFanAlpha), then per arm a header pair
//          (chain, sampleCount, closed, total) + (arc0, dir, domain, 0) and
//          its RADIAL PROFILE, one texel per FIELD_PROF_DR radius step:
//          (angle[g], arc[g], angle[g+1], arc[g+1]) - both ends of a lookup
//          in one fetch. nArms 0 = an AXIS record (free dead-end tip, or the
//          host-axis fallback): header, J1, (chain, count, closed, total) +
//          (arc0, axisX, axisY, 0) - the thread's own material at the
//          point's axis projection.
// Burn / roots tint the arm material PER PIXEL here exactly as on the
// ribbons (G2.1: the same reveal sources and clock - paint_glsl.ts).
//
// Float data is read with texelFetch + manual interpolation only (NEAREST
// sampling): float LINEAR filtering needs OES_texture_float_linear, which
// WebKit/mobile do not guarantee - a float texture whose sampler asks for
// LINEAR without it is INCOMPLETE and samples as black, even via texelFetch.
// Samplers are declared highp (fragment samplers default to lowp, which
// some mobile GPUs honor for float textures).
//
// Both textures and the shader live for the PAGE lifetime and are
// refilled per scene (grown in place when a bigger scene needs more rows)
// - never destroyed: pixi's retained render state can reference a source
// the frame after a rebuild (the PALETTE_CACHE lore).
//
// PER-PIXEL GAPS (gap_mask.ts): fan pixels are masked by the gap slots
// their vertices carry (aMaskId) - the same casing test the ribbons run -
// so a web beside a diving arm dives with it. (The over-fill FILL shader
// that wore this field is gone with the over-fills: no thread is copied
// over the webs any more.)

import { Buffer, BufferUsage, Shader, Texture, UniformGroup } from "pixi.js";
import type { MeshGeometry } from "pixi.js";
import { GAP_FRAG_LIB, defaultGapTexture } from "./gap_mask";
import { FloatRows, ROW_SHIFT } from "./float_rows";
import {
  KNOT_UNIFORMS_GLSL,
  PAINT_DATA_GLSL,
  PAINT_FX_GLSL,
} from "./paint_glsl";
import { kGeom, kReveal, kStatic, knotUniforms } from "./paint_model";

// Field geometry constants (shared with the CPU side in ribbon_renderer):
// arm radial profiles resample the centerline (walked in FIELD_PROF_ARC
// world-arc steps) onto a uniform FIELD_PROF_DR radius grid; FIELD_BLEND_MIN
// is the smallest share of a wedge's angle the arm-to-arm blend keeps where
// ribbons overlap.
export const FIELD_PROF_DR = 0.06;
export const FIELD_PROF_ARC = 0.08;
export const FIELD_BLEND_MIN = 0.5;
// Arms per junction the shader scans (its loop bound). The fabric's fused
// junctions carry 3 (splice) or 4 (merge) arms.
export const MAX_ARMS = 12;
// Texel row widths of the two data textures (linear index -> (i % W, i / W),
// done in GLSL as a mask and a shift - both widths are 2^ROW_SHIFT; the
// FloatRows class and its row uploader live in float_rows.ts).
export const RECORD_W = 1 << ROW_SHIFT;
export const PAINT_W = 1 << ROW_SHIFT;

let PAINT_DATA: FloatRows | null = null;
let RECORD_DATA: FloatRows | null = null;
export function paintData(): FloatRows {
  if (!PAINT_DATA) PAINT_DATA = new FloatRows(PAINT_W, 16);
  return PAINT_DATA;
}
export function recordData(): FloatRows {
  if (!RECORD_DATA) RECORD_DATA = new FloatRows(RECORD_W, 16);
  return RECORD_DATA;
}

// Field parameters (live: thread width and cuspRadius are sliders).
// uJParams = (fillHalf, profN, 0, 0) - .zw carried the over-fills'
// joint radii; uJParams2 = (FIELD_PROF_DR, FIELD_BLEND_MIN, 0, 0).
let FIELD_UNIFORMS: UniformGroup | null = null;
function fieldUniforms(): UniformGroup {
  if (!FIELD_UNIFORMS) {
    FIELD_UNIFORMS = new UniformGroup({
      uJParams: { value: new Float32Array([0.21, 2, 0, 0]), type: "vec4<f32>" },
      uJParams2: {
        value: new Float32Array([FIELD_PROF_DR, FIELD_BLEND_MIN, 0, 0]),
        type: "vec4<f32>",
      },
    });
  }
  return FIELD_UNIFORMS;
}
export function setFieldParams(fillHalf: number, profN: number): void {
  const u = fieldUniforms().uniforms as { uJParams: Float32Array };
  u.uJParams[0] = fillHalf;
  u.uJParams[1] = profN;
}

// ---------------------------------------------------------------------------
// GLSL. The field function mirrors RibbonRenderer's CPU reference
// (cpuJunctionField) line for line; keep them in sync.

const FIELD_GLSL = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uJData;
uniform sampler2D uPData;
uniform sampler2D uTexture;
uniform vec4 uJParams;
uniform vec4 uJParams2;
${KNOT_UNIFORMS_GLSL}
${PAINT_DATA_GLSL}
${PAINT_FX_GLSL}

const float TAU = 6.283185307179586;
const float HALF_PI = 1.5707963267948966;

vec4 jAt(int i) { return texelFetch(uJData, ivec2(i & ${RECORD_W - 1}, i >> ${ROW_SHIFT}), 0); }
vec4 pAt(int i) { return texelFetch(uPData, ivec2(i & ${PAINT_W - 1}, i >> ${ROW_SHIFT}), 0); }

// The material (r, g, b, paint u) of chain ch at a world arc: the paint
// texels lerped (closed chains wrap, open chains clamp - colorAtArc's
// sample mapping, i.e. the ribbon's own Gouraud), then the appearance FX
// that tint the color (burn / roots) exactly as the ribbon shader does.
vec4 chainMaterial(int ch, float a) {
  KChain c = kChain(ch);
  int base = int(kS(2 * ch + 1).w + 0.5);
  int count = c.count;
  float total = c.total;
  if (total <= 0.0 || count < 2) return pAt(base);
  int k0;
  int k1;
  float fr;
  float an;
  if (c.closed) {
    an = a - total * floor(a / total);
    float f = an / total * float(count);
    float fl = floor(f);
    k0 = int(fl) % count;
    k1 = (k0 + 1) % count;
    fr = f - fl;
  } else {
    an = clamp(a, 0.0, total);
    float f = an / total * float(count - 1);
    float fl = floor(f);
    k0 = min(int(fl), count - 1);
    k1 = min(count - 1, k0 + 1);
    fr = f - fl;
  }
  vec4 m = mix(pAt(base + k0), pAt(base + k1), fr);
  if (uKFx.w > 0.5) {
    int st = int(uKFx.x + 0.5);
    if (st == 4 || st == 5) {
      highp float ctrl = kCtrlOfArc(c, an);
      KIgn g = kIgnition(c, ctrl);
      if (g.hit && uKFx.y >= g.tA) {
        m.rgb = kBurn(m.rgb, kBurnAge(c, g, ctrl), an / c.arcPer, st == 5);
      }
    }
  }
  return m;
}

// An arm's material at arc offset s along it (clamped to its domain).
vec4 armPaint(int ab, float s) {
  vec4 h = jAt(ab);
  vec4 a = jAt(ab + 1);
  return chainMaterial(int(h.x + 0.5), a.x + a.y * min(s, a.z));
}

// Arc along an arm at projected radius rp (its radial profile; straight
// extrapolation past the grid).
float profArc(int ab, float rp) {
  int last = int(uJParams.y + 0.5) - 1;
  float x = rp / uJParams2.x;
  if (x >= float(last)) {
    return jAt(ab + 2 + last).y + (rp - float(last) * uJParams2.x);
  }
  int i = int(x);
  vec4 t = jAt(ab + 2 + i);
  return mix(t.y, t.w, x - float(i));
}

vec3 composeU(vec3 rgb, float u) {
  // Explicit LOD: this runs in non-uniform control flow, where implicit
  // derivatives are undefined (the strip has one mip level either way).
  vec4 acc = textureLod(uTexture, vec2(u, 0.5), 0.0);
  return mix(rgb, acc.rgb, acc.a);
}

// The composed junction-field color at world point p for the record at
// texel rec: bracketing arms by their profile angles AT p's radius, each
// sampled at p's projected radius, EDGE-AWARE smoothstep blend across the
// gap between the two ribbons' edges. Each arm's material is COMPOSED
// (section RGB mixed with the accent at its own paint U, exactly as the
// section shader composes the ribbon) BEFORE the blend: lerping the raw U
// between arms swept the accent strip across unrelated paint families
// (band A -> base -> gold -> band B: phantom gold between two near-white
// pulse cores; a traveled/untraveled pair stepped sharply inside the
// blend instead of ramping) - the palette-order lore, field edition.
vec3 junctionField(int rec, vec2 p) {
  vec4 hd = jAt(rec);
  int n = int(hd.z + 0.5);
  vec2 e = p - hd.xy;
  if (n == 0) {
    vec4 ax = jAt(rec + 3);
    vec4 m = chainMaterial(int(jAt(rec + 2).x + 0.5), ax.x + dot(e, ax.yz));
    return composeU(m.rgb, m.w);
  }
  float rho = length(e);
  float phi = atan(e.y, e.x);
  int profN = int(uJParams.y + 0.5);
  int last = profN - 1;
  int stride = 2 + profN;
  float gx = rho / uJParams2.x;
  int gi;
  float gf;
  if (gx >= float(last)) {
    gi = last - 1;
    gf = 1.0;
  } else {
    gi = int(gx);
    gf = gx - float(gi);
  }
  float relA = 1e9;
  float relB = 1e9;
  int ia = 0;
  int ib = 0;
  for (int i = 0; i < ${MAX_ARMS}; i++) {
    if (i >= n) break;
    vec4 t = jAt(rec + 2 + i * stride + 2 + gi);
    float ra = phi - mix(t.x, t.z, gf);
    ra -= TAU * floor(ra / TAU);
    float rb = ra > 0.0 ? TAU - ra : 0.0;
    if (ra < relA) { relA = ra; ia = i; }
    if (rb < relB) { relB = rb; ib = i; }
  }
  int abA = rec + 2 + ia * stride;
  vec4 mA = armPaint(abA, profArc(abA, relA < HALF_PI ? rho * cos(relA) : 0.0));
  vec3 cA = composeU(mA.rgb, mA.w);
  if (ia == ib) return cA;
  int abB = rec + 2 + ib * stride;
  vec4 mB = armPaint(abB, profArc(abB, relB < HALF_PI ? rho * cos(relB) : 0.0));
  vec3 cB = composeU(mB.rgb, mB.w);
  float fh = uJParams.x;
  float span = relA + relB;
  float hw = rho > fh ? asin(fh / rho) : HALF_PI;
  float lo = hw;
  float hi = span - hw;
  float minW = span * uJParams2.y;
  if (hi - lo < minW) {
    lo = (span - minW) * 0.5;
    hi = lo + minW;
  }
  float t = hi > lo ? (relA - lo) / (hi - lo) : (relA < span * 0.5 ? 0.0 : 1.0);
  t = clamp(t, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  return mix(cA, cB, t);
}
`;

// Uniform block every pixi mesh shader receives (see SECTION_VERT).
const MESH_UNIFORMS = /* glsl */ `
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;
`;

// Junction fans (seal discs, fused-tip discs, wedges, free-tip caps): the
// vertex carries its position, its record's texel index, and the gap slots
// masking its joint (aMaskId, see gap_mask.ts).
const JUNCTION_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
in float aRec;
in vec4 aMaskId;

out vec2 vPos;
flat out float vRec;
flat out vec4 vMaskId;
out vec4 vColor;
${MESH_UNIFORMS}
void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition;
  vRec = aRec;
  vMaskId = aMaskId;
  vColor = uColor * uWorldColorAlpha;
}
`;

// The record's gate texel J1 (rec + 1): invisible until every arm is
// revealed, then the latest-ignited arm's FX solidity (knotFanAlpha). The
// gap mask (fan mode: no window, header tangent) scales the premultiplied
// output; pxW comes from fwidth() HERE, in uniform control flow.
const JUNCTION_FRAG = /* glsl */ `#version 300 es
${FIELD_GLSL}
in vec2 vPos;
flat in float vRec;
flat in vec4 vMaskId;
in vec4 vColor;

out vec4 finalColor;
${GAP_FRAG_LIB}
void main(void) {
  vec2 gfw = fwidth(vPos);
  float pxW = max(max(gfw.x, gfw.y), 1e-5);
  int rec = int(vRec + 0.5);
  float aM = knotFanAlpha(jAt(rec + 1));
  if (aM <= 0.002) discard;
  vec3 rgb = junctionField(rec, vPos);
  float gk = gapKeepAt(pxW, vPos, -1.0, vec2(0.0), vMaskId);
  if (gk < 1.0 && gapProbe()) {
    rgb = mix(rgb, vec3(1.0, 0.0, 0.85), (1.0 - gk) * 0.75);
    gk = 1.0;
  }
  if (gk <= 0.002) discard;
  finalColor = vec4(rgb, 1.0) * vColor * (aM * gk);
}
`;

type FieldShader = Shader & { texture: Texture };
let JUNCTION_SHADER: FieldShader | null = null;
// The current scene's gap-slot table (bindFieldGap) - the shader is built
// lazily, after the renderer bound it.
let GAP_TEX: Texture | null = null;

function makeShader(
  vertex: string,
  fragment: string,
  name: string,
  accent: Texture
): FieldShader {
  const sh = Shader.from({
    gl: { vertex, fragment, name },
    resources: {
      uTexture: accent.source,
      uSampler: accent.source.style,
      uJData: recordData().source,
      uPData: paintData().source,
      uGapData: (GAP_TEX ?? defaultGapTexture()).source,
      fieldUniforms: fieldUniforms(),
      // G2 shader paint (paint_model.ts).
      uKStatic: kStatic().source,
      uKGeom: kGeom().source,
      uKReveal: kReveal().source,
      knotUniforms: knotUniforms(),
    },
  }) as FieldShader;
  sh.texture = accent;
  return sh;
}

export function junctionShader(accent: Texture): FieldShader {
  if (!JUNCTION_SHADER) {
    JUNCTION_SHADER = makeShader(
      JUNCTION_VERT,
      JUNCTION_FRAG,
      "junction-field",
      accent
    );
  }
  return JUNCTION_SHADER;
}

// Point the field shader at an accent strip (custom shaders ignore
// mesh.texture - see bindAccent in ribbon_renderer).
export function bindFieldAccent(tex: Texture): void {
  const sh = JUNCTION_SHADER;
  if (!sh || sh.texture === tex) return;
  sh.resources.uTexture = tex.source;
  sh.resources.uSampler = tex.source.style;
  sh.texture = tex;
}

// Point the field shader at a scene's gap-slot table (see bindGap in
// ribbon_renderer; a shader built later binds the table current then).
export function bindFieldGap(tex: Texture): void {
  GAP_TEX = tex;
  const sh = JUNCTION_SHADER;
  if (sh && sh.resources.uGapData !== tex.source) {
    sh.resources.uGapData = tex.source;
  }
}

// Per-vertex float attribute helper (aRec / aMaskId on fans).
export function addFloatAttribute(
  geometry: MeshGeometry,
  name: string,
  data: Float32Array,
  components: 1 | 2 | 4
): void {
  geometry.addAttribute(name, {
    buffer: new Buffer({
      data,
      label: "attribute-" + name,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
    }),
    format:
      components === 1 ? "float32" : components === 2 ? "float32x2" : "float32x4",
    stride: components * 4,
    offset: 0,
  });
}
