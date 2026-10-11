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
//          (burn cooling, reveal glow and gameplay paint included). Each
//          chain owns a contiguous texel range; rows wrap (chains longer
//          than a row are fine). Only rows of chains a paint tick rewrote
//          upload.
//   RECORD (RGBA32F, linear texel index): one record per junction / tip:
//          header (jx, jy, nArms, fx); per arm a header pair
//          (paintBase, sampleCount, closed, total) + (arc0, dir, domain, 0)
//          and its RADIAL PROFILE, one texel per FIELD_PROF_DR radius step:
//          (angle[g], arc[g], angle[g+1], arc[g+1]) - both ends of a lookup
//          in one fetch. nArms 0 = an AXIS record (free dead-end tip, or the
//          host-axis fallback): (paintBase, count, closed, total) +
//          (arc0, axisX, axisY, 0) - the thread's own material at the
//          point's axis projection.
//
// Float data is read with texelFetch + manual interpolation only (NEAREST
// sampling): float LINEAR filtering needs OES_texture_float_linear, which
// WebKit/mobile do not guarantee - a float texture whose sampler asks for
// LINEAR without it is INCOMPLETE and samples as black, even via texelFetch.
// Samplers are declared highp (fragment samplers default to lowp, which
// some mobile GPUs honor for float textures).
//
// Both textures and both shaders live for the PAGE lifetime and are
// refilled per scene (grown in place when a bigger scene needs more rows)
// - never destroyed: pixi's retained render state can reference a source
// the frame after a rebuild (the PALETTE_CACHE lore).

import {
  Buffer,
  BufferImageSource,
  BufferUsage,
  ExtensionType,
  Shader,
  Texture,
  UniformGroup,
  extensions,
} from "pixi.js";
import type { MeshGeometry } from "pixi.js";

// Field geometry constants (shared with the CPU side in ribbon_renderer):
// arm radial profiles resample the centerline (walked in FIELD_PROF_ARC
// world-arc steps) onto a uniform FIELD_PROF_DR radius grid; FIELD_BLEND_MIN
// is the smallest share of a wedge's angle the arm-to-arm blend keeps where
// ribbons overlap.
export const FIELD_PROF_DR = 0.06;
export const FIELD_PROF_ARC = 0.08;
export const FIELD_BLEND_MIN = 0.5;
// Over-fill pixels within FILL_JOINT_IN fillHalfs of a fused joint wear the
// junction field, easing back to the exact copied material by
// FILL_JOINT_OUT (see "FILLS WEAR THE JOINT FIELD" in rebuildFillets).
export const FILL_JOINT_IN = 2.0;
export const FILL_JOINT_OUT = 3.0;
// Arms per junction the shader scans (its loop bound). The fabric's fused
// junctions carry 3 (splice) or 4 (merge) arms.
export const MAX_ARMS = 12;
// Texel row widths of the two data textures (linear index -> (i % W, i / W),
// done in GLSL as a mask and a shift - both widths are 2^ROW_SHIFT).
const ROW_SHIFT = 10;
export const RECORD_W = 1 << ROW_SHIFT;
export const PAINT_W = 1 << ROW_SHIFT;

// ---------------------------------------------------------------------------
// Row-dirty float data textures.

// A BufferImageSource whose uploads go through ROWS_UPLOADER: a resize (or
// the first upload) allocates with texImage2D; afterwards only the rows
// marked dirty since the last upload are sent (texSubImage2D) - a paint
// tick rewrites a few chains, not the whole texture.
class RowSource extends BufferImageSource {
  dirtyLo = 0;
  dirtyHi = 0;
  constructor(data: Float32Array, width: number, rows: number) {
    super({
      resource: data,
      width,
      height: rows,
      format: "rgba32float",
      // The payload is DATA: never premultiply (pixi sets
      // UNPACK_PREMULTIPLY_ALPHA_WEBGL from this before every upload).
      alphaMode: "premultiplied-alpha",
      scaleMode: "nearest",
      addressMode: "clamp-to-edge",
      autoGenerateMipmaps: false,
    });
    this.uploadMethodId = "knot-float-rows";
  }
}

interface GlTextureLike {
  target: number;
  width: number;
  height: number;
  internalFormat: number;
  format: number;
  type: number;
}

const ROWS_UPLOADER = {
  id: "knot-float-rows",
  upload(
    source: RowSource,
    glTexture: GlTextureLike,
    gl: WebGL2RenderingContext
  ): void {
    const w = source.pixelWidth;
    const h = source.pixelHeight;
    const data = source.resource as Float32Array;
    if (glTexture.width !== w || glTexture.height !== h) {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        w,
        h,
        0,
        glTexture.format,
        glTexture.type,
        data
      );
      glTexture.width = w;
      glTexture.height = h;
    } else if (source.dirtyHi > source.dirtyLo) {
      const lo = Math.max(0, source.dirtyLo);
      const hi = Math.min(h, source.dirtyHi);
      if (hi > lo) {
        gl.texSubImage2D(
          glTexture.target,
          0,
          0,
          lo,
          w,
          hi - lo,
          glTexture.format,
          glTexture.type,
          data.subarray(lo * w * 4, hi * w * 4)
        );
      }
    }
    source.dirtyLo = 0;
    source.dirtyHi = 0;
  },
};
// Registered at module load - before the app creates its renderer, whose
// GlTextureSystem merges the uploader map at construction.
extensions.add({
  type: ExtensionType.TextureUploaderWebGL,
  name: ROWS_UPLOADER.id,
  ref: ROWS_UPLOADER,
});

// CPU mirror + GPU source of one data texture. `data` is the mirror
// (RGBA float per texel); write into it, mark the touched texel range,
// flush() once per frame.
export class FloatRows {
  readonly width: number;
  data: Float32Array;
  rows: number;
  readonly source: RowSource;

  constructor(width: number, rows: number) {
    this.width = width;
    this.rows = rows;
    this.data = new Float32Array(width * rows * 4);
    this.source = new RowSource(this.data, width, rows);
  }

  // Capacity for at least `texels` texels. Growing swaps the mirror for a
  // larger one (contents kept) and resizes the SAME source - pixi
  // re-allocates the same GL texture; nothing is destroyed.
  ensure(texels: number): void {
    const need = Math.max(1, Math.ceil(texels / this.width));
    if (need <= this.rows) return;
    const rows = Math.max(need, Math.ceil(this.rows * 1.5));
    const next = new Float32Array(this.width * rows * 4);
    next.set(this.data);
    this.data = next;
    this.rows = rows;
    this.source.resource = next;
    this.source.resize(this.width, rows);
  }

  // Mark texels [t0, t1) for upload.
  markDirty(t0: number, t1: number): void {
    if (t1 <= t0) return;
    const r0 = Math.floor(t0 / this.width);
    const r1 = Math.min(this.rows, Math.ceil(t1 / this.width));
    const s = this.source;
    if (s.dirtyHi <= s.dirtyLo) {
      s.dirtyLo = r0;
      s.dirtyHi = r1;
    } else {
      if (r0 < s.dirtyLo) s.dirtyLo = r0;
      if (r1 > s.dirtyHi) s.dirtyHi = r1;
    }
  }

  get dirty(): boolean {
    return this.source.dirtyHi > this.source.dirtyLo;
  }

  // Upload the dirty rows now (no-op when clean). Before the source's first
  // bind there is no GL texture yet: the first bind uploads everything.
  flush(): void {
    if (this.dirty) this.source.update();
  }
}

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

// Field parameters shared by both shaders (live: thread width and
// cuspRadius are sliders). uJParams = (fillHalf, profN, fill-joint inner
// radius, outer radius); uJParams2 = (FIELD_PROF_DR, FIELD_BLEND_MIN, 0, 0).
let FIELD_UNIFORMS: UniformGroup | null = null;
function fieldUniforms(): UniformGroup {
  if (!FIELD_UNIFORMS) {
    FIELD_UNIFORMS = new UniformGroup({
      uJParams: { value: new Float32Array([0.21, 2, 0.42, 0.63]), type: "vec4<f32>" },
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
  u.uJParams[2] = fillHalf * FILL_JOINT_IN;
  u.uJParams[3] = fillHalf * FILL_JOINT_OUT;
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

const float TAU = 6.283185307179586;
const float HALF_PI = 1.5707963267948966;

vec4 jAt(int i) { return texelFetch(uJData, ivec2(i & ${RECORD_W - 1}, i >> ${ROW_SHIFT}), 0); }
vec4 pAt(int i) { return texelFetch(uPData, ivec2(i & ${PAINT_W - 1}, i >> ${ROW_SHIFT}), 0); }

// Paint (r, g, b, u) of a chain at a world arc (closed chains wrap, open
// chains clamp - colorAtArc's sample mapping). h = (base, count, closed,
// total).
vec4 paintAtArc(vec4 h, float a) {
  int base = int(h.x + 0.5);
  int count = int(h.y + 0.5);
  float total = h.w;
  if (total <= 0.0 || count < 2) return pAt(base);
  int k0;
  int k1;
  float fr;
  if (h.z > 0.5) {
    float w = a - total * floor(a / total);
    float f = w / total * float(count);
    float fl = floor(f);
    k0 = int(fl) % count;
    k1 = (k0 + 1) % count;
    fr = f - fl;
  } else {
    float c = clamp(a, 0.0, total);
    float f = c / total * float(count - 1);
    float fl = floor(f);
    k0 = min(int(fl), count - 1);
    k1 = min(count - 1, k0 + 1);
    fr = f - fl;
  }
  return mix(pAt(base + k0), pAt(base + k1), fr);
}

// An arm's material at arc offset s along it (clamped to its domain).
vec4 armPaint(int ab, float s) {
  vec4 h = jAt(ab);
  vec4 a = jAt(ab + 1);
  return paintAtArc(h, a.x + a.y * min(s, a.z));
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
    vec4 ax = jAt(rec + 2);
    vec4 m = paintAtArc(jAt(rec + 1), ax.x + dot(e, ax.yz));
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
    vec4 t = jAt(rec + 1 + i * stride + 2 + gi);
    float ra = phi - mix(t.x, t.z, gf);
    ra -= TAU * floor(ra / TAU);
    float rb = ra > 0.0 ? TAU - ra : 0.0;
    if (ra < relA) { relA = ra; ia = i; }
    if (rb < relB) { relB = rb; ib = i; }
  }
  int abA = rec + 1 + ia * stride;
  vec4 mA = armPaint(abA, profArc(abA, relA < HALF_PI ? rho * cos(relA) : 0.0));
  vec3 cA = composeU(mA.rgb, mA.w);
  if (ia == ib) return cA;
  int abB = rec + 1 + ib * stride;
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
// vertex carries only its position and its record's texel index.
const JUNCTION_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
in float aRec;

out vec2 vPos;
flat out float vRec;
out vec4 vColor;
${MESH_UNIFORMS}
void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition;
  vRec = aRec;
  vColor = uColor * uWorldColorAlpha;
}
`;

// Header .w = fx: [-1, 0) is the appearance-FX materialize transparency
// (fans fade in with their least-settled arm), 0 = inert.
const JUNCTION_FRAG = /* glsl */ `#version 300 es
${FIELD_GLSL}
in vec2 vPos;
flat in float vRec;
in vec4 vColor;

out vec4 finalColor;

void main(void) {
  int rec = int(vRec + 0.5);
  vec3 rgb = junctionField(rec, vPos);
  float fx = jAt(rec).w;
  float aM = fx < 0.0 ? clamp(1.0 + fx, 0.0, 1.0) : 1.0;
  finalColor = vec4(rgb, 1.0) * vColor * aM;
}
`;

// Over-fill / emergent-fill patches: the section shader plus FILLS WEAR
// THE JOINT FIELD - aJoint carries up to four nearby junction records
// (texel index + 1; 0 = none, constant across a patch). Per pixel, the
// nearest joint within the outer radius blends its (composed) field over
// the patch's own COMPOSED color - weight 1 inside the inner radius,
// smoothstepping to 0 at the outer; between two joints the hand-off is a
// smooth band across the bisector. Composed colors blend, never U (the
// old per-vertex override lerped U toward U_BASE: a band-B fill swept
// through gold on its way to the field).
const FILL_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aUV;
in vec3 aColor;
in float aFx;
in vec4 aJoint;

out vec2 vUV;
out vec3 vSection;
out vec4 vColor;
out float vFx;
out vec2 vPos;
flat out vec4 vJ;
${MESH_UNIFORMS}
void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
  vSection = aColor;
  vColor = uColor * uWorldColorAlpha;
  vFx = aFx;
  vPos = aPosition;
  vJ = aJoint;
}
`;

const FILL_FRAG = /* glsl */ `#version 300 es
${FIELD_GLSL}
in vec2 vUV;
in vec3 vSection;
in vec4 vColor;
in float vFx;
in vec2 vPos;
flat in vec4 vJ;

out vec4 finalColor;

void considerJoint(float c, inout float d1, inout int r1, inout float d2, inout int r2) {
  if (c < 0.5) return;
  int rec = int(c - 0.5);
  float d = distance(vPos, jAt(rec).xy);
  if (d < d1) {
    d2 = d1;
    r2 = r1;
    d1 = d;
    r1 = rec;
  } else if (d < d2) {
    d2 = d;
    r2 = rec;
  }
}

float jointWeight(float d) {
  float rIn = uJParams.z;
  float rOut = uJParams.w;
  if (d >= rOut) return 0.0;
  if (d <= rIn) return 1.0;
  float t = (d - rIn) / (rOut - rIn);
  return 1.0 - t * t * (3.0 - 2.0 * t);
}

void main(void) {
  vec3 base = vSection;
  vec4 acc = texture(uTexture, vec2(vUV.x, 0.5));
  // How much reveal FX (rainbow stripes, white wash) shows. The joint
  // field yields to it, so a patch shows exactly what its own ribbon shows
  // while the FX plays (the fans stay hidden until their arms settle).
  float fxShow = 0.0;
  if (vFx > 0.0) {
    float p = min(vFx, 1.0);
    int bi = int(min(vUV.y, 0.99999) * 6.0);
    vec3 stripe = bi == 0 ? vec3(0.92, 0.15, 0.18)
      : bi == 1 ? vec3(1.0, 0.55, 0.08)
      : bi == 2 ? vec3(1.0, 0.88, 0.12)
      : bi == 3 ? vec3(0.12, 0.78, 0.3)
      : bi == 4 ? vec3(0.15, 0.42, 1.0)
      : vec3(0.58, 0.25, 0.95);
    float rb = smoothstep(0.30, 0.52, p);
    float wh = smoothstep(0.06, 0.26, p) * (1.0 - smoothstep(0.38, 0.60, p));
    base = mix(base, stripe, rb);
    base = mix(base, vec3(0.93, 0.93, 0.95), wh * 0.6);
    fxShow = max(rb, wh);
  }
  vec3 rgb = mix(base, acc.rgb, acc.a);
  if (vJ.x > 0.5 && fxShow < 1.0) {
    float d1 = 1e9;
    float d2 = 1e9;
    int r1 = -1;
    int r2 = -1;
    considerJoint(vJ.x, d1, r1, d2, r2);
    considerJoint(vJ.y, d1, r1, d2, r2);
    considerJoint(vJ.z, d1, r1, d2, r2);
    considerJoint(vJ.w, d1, r1, d2, r2);
    float w1 = r1 >= 0 ? jointWeight(d1) : 0.0;
    if (w1 > 0.0) {
      // Each joint PULLS the patch toward its own field by its own weight;
      // equidistant from two joints the pulls hand off smoothly (q = 0.5 on
      // the bisector) instead of switching fields along it. Weighting the
      // pulls - not mixing fields and weights separately - keeps the far
      // joint's share as small as its weight, so nothing steps where it
      // leaves range.
      float q = 1.0;
      float w2 = 0.0;
      float band = uJParams.x;
      if (r2 >= 0 && d2 - d1 < band) {
        float s = (d2 - d1) / band;
        q = 0.5 + 0.5 * s * s * (3.0 - 2.0 * s);
        w2 = jointWeight(d2);
      }
      vec3 pull = q * w1 * (junctionField(r1, vPos) - rgb);
      if (w2 > 0.0) pull += (1.0 - q) * w2 * (junctionField(r2, vPos) - rgb);
      rgb += pull * (1.0 - fxShow);
    }
  }
  float aM = vFx < 0.0 ? clamp(1.0 + vFx, 0.0, 1.0) : 1.0;
  finalColor = vec4(rgb, 1.0) * vColor * aM;
}
`;

type FieldShader = Shader & { texture: Texture };
let JUNCTION_SHADER: FieldShader | null = null;
let FILL_SHADER: FieldShader | null = null;

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
      fieldUniforms: fieldUniforms(),
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

export function fillShader(accent: Texture): FieldShader {
  if (!FILL_SHADER) {
    FILL_SHADER = makeShader(FILL_VERT, FILL_FRAG, "fill-joint-field", accent);
  }
  return FILL_SHADER;
}

// Point both field shaders at an accent strip (custom shaders ignore
// mesh.texture - see bindAccent in ribbon_renderer).
export function bindFieldAccent(tex: Texture): void {
  for (const sh of [JUNCTION_SHADER, FILL_SHADER]) {
    if (!sh || sh.texture === tex) continue;
    sh.resources.uTexture = tex.source;
    sh.resources.uSampler = tex.source.style;
    sh.texture = tex;
  }
}

// Per-vertex float attribute helper (aRec on fans, aJoint on fills).
export function addFloatAttribute(
  geometry: MeshGeometry,
  name: string,
  data: Float32Array,
  components: 1 | 4
): void {
  geometry.addAttribute(name, {
    buffer: new Buffer({
      data,
      label: "attribute-" + name,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
    }),
    format: components === 1 ? "float32" : "float32x4",
    stride: components * 4,
    offset: 0,
  });
}
