// ARM MATERIAL STRIPS (K4 fan fix). The junction fans used to evaluate
// each bracketing arm's COMPOSED material (the ribbon's section Gouraud,
// burn / roots, gameplay paint, the reveal glow) PER PIXEL: two full paint
// evaluations per web pixel - 0.57 -> 1.84 ms of GPU at 3200x1800 on the
// desktop, and 60 -> 44 fps at rest on the phone (Pixel 11, PowerVR). The
// material along an arm is a 1D function of the arc offset from its joint,
// so it is now rendered ONCE per frame per arm into an RGBA8 strip: STRIP_W
// texels covering the stretch the fans can query, one row per arm (and per
// free-tip cap axis). Fans read two texels per arm and lerp
// (STRIP_LOOKUP_GLSL); the planned G4 SDF webs read the same rows.
//
//   STRIP TABLE (RGBA32F FloatRows, 2 texels per row r):
//     T0 = (chain, arc0, arcStep, px)   texel k is the material at
//     T1 = (seed0, seedStep, -, -)      arc0 + arcStep * k (ctrl search
//                                       seed seed0 + seedStep * k), its
//                                       gameplay-paint edges antialiased
//                                       over px (the strip's own step)
//   STRIP TEXTURE (RGBA8 render target, STRIP_RT_W wide): row r occupies
//     texels [(r % STRIP_LINE) * STRIP_W, +STRIP_W) of line r / STRIP_LINE.
//     Read with texelFetch + manual lerp (exact weights: the CPU mirror in
//     RibbonRenderer.cpuStripAt quotes it to the bit).
//
// SCHEDULING: a pixi WebGL SYSTEM (registered at module load, like the
// float-rows uploader) re-renders the strips in its `prerender` hook -
// before any frame that might draw a fan - whenever an input changed: the
// table, the paint data textures, or any knot uniform. A static scene
// re-renders nothing.
//
// LIFETIME: the table, the render texture, the pass mesh and its shader
// live for the PAGE (grown in place, never destroyed - the PALETTE_CACHE
// lore).

import {
  Container,
  ExtensionType,
  Geometry,
  Mesh,
  RenderTexture,
  Shader,
  Texture,
  UniformGroup,
  extensions,
} from "pixi.js";
import type { Renderer } from "pixi.js";
import { FloatRows, ROW_SHIFT, ROW_W } from "./float_rows";
import {
  KNOT_UNIFORMS_GLSL,
  PAINT_CONST_GLSL,
  PAINT_DATA_GLSL,
  PAINT_FX_GLSL,
  PAINT_GATE_GLSL,
  PAINT_PAINT_GLSL,
  PAINT_SECTION_GLSL,
} from "./paint_glsl";
import {
  kGeom,
  kPaint,
  kReveal,
  kStatic,
  knotUniformValues,
  knotUniforms,
} from "./paint_model";

// Texels per strip row (a power of two), rows per render-texture line.
export const STRIP_W_SHIFT = 6;
export const STRIP_W = 1 << STRIP_W_SHIFT;
export const STRIP_LINE_SHIFT = 4;
export const STRIP_LINE = 1 << STRIP_LINE_SHIFT;
export const STRIP_RT_W = STRIP_W * STRIP_LINE;

let TABLE: FloatRows | null = null;
export function stripTable(): FloatRows {
  if (!TABLE) TABLE = new FloatRows(ROW_W, 2);
  return TABLE;
}

let RT: RenderTexture | null = null;
export function stripTexture(): RenderTexture {
  if (!RT) {
    RT = RenderTexture.create({
      width: STRIP_RT_W,
      height: 1,
      resolution: 1,
      format: "rgba8unorm",
      dynamic: true,
      antialias: false,
      scaleMode: "nearest",
      autoGenerateMipmaps: false,
    });
  }
  return RT;
}

// The rows in use (set by the renderer after it writes the table) and the
// pass bookkeeping; probes read `stats`.
const STATE = {
  rows: 0,
  tableRev: 0,
  // Dirty key of the last render: data-texture revisions + table revision.
  lastRevs: new Float64Array(5).fill(-1),
  lastU: new Float32Array(0),
  // Probes: passes so far, their main-thread ms, the rows / lines drawn.
  stats: { renders: 0, ms: 0, rows: 0, lines: 0 },
};
export const STRIP_STATS = STATE.stats;

// The renderer wrote rows [0, rows) of the table (and flushed it).
export function setStripRows(rows: number): void {
  STATE.rows = rows;
  STATE.tableRev++;
}

// Force the next frame's pass (probes; a re-bound scene).
export function invalidateStrips(): void {
  STATE.lastRevs.fill(-1);
}

// ---------------------------------------------------------------------------
// GLSL.

// The consumer side (fans now, G4 webs next): row r's material at texel
// coordinate x (0 = the row's first texel; clamped), lerped between the two
// nearest texels with exact weights.
export const STRIP_LOOKUP_GLSL = /* glsl */ `
uniform highp sampler2D uStrip;
vec3 stripAt(int row, highp float x) {
  highp float xc = clamp(x, 0.0, ${STRIP_W - 1}.0);
  int k0 = int(floor(xc));
  int k1 = min(k0 + 1, ${STRIP_W - 1});
  highp float f = xc - float(k0);
  ivec2 base = ivec2((row & ${STRIP_LINE - 1}) << ${STRIP_W_SHIFT}, row >> ${STRIP_LINE_SHIFT});
  vec3 a = texelFetch(uStrip, base + ivec2(k0, 0), 0).rgb;
  vec3 b = texelFetch(uStrip, base + ivec2(k1, 0), 0).rgb;
  return mix(a, b, f);
}
`;

const MESH_UNIFORMS = /* glsl */ `
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;
`;

const STRIP_VERT = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPosition;
${MESH_UNIFORMS}
void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}
`;

// One fragment = one strip texel: gl_FragCoord addresses the render
// texture's memory exactly as texelFetch does on the read side (whatever
// way the projection maps the covering quad).
const STRIP_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform highp sampler2D uStripTable;
uniform vec4 uStripInfo;
${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_DATA_GLSL}
${PAINT_SECTION_GLSL}
${PAINT_GATE_GLSL}
${PAINT_FX_GLSL}
${PAINT_PAINT_GLSL}

// The strip's paint edge coverage width (world arc; the row's step).
highp float kStripPx;

// The material of chain ch at a world arc, COMPOSED exactly as the ribbon
// shader composes it: the RIBBON's section color there (its vertex
// shader's section at the two bracketing samples, lerped - its own
// Gouraud; seed = a ctrl near the arc), the appearance FX that tint (burn /
// roots - the joinery wears no stripes or transparency: its gate fades
// it), then the gameplay paint and the reveal glow (G2.3).
vec3 chainMaterial(int ch, highp float a, highp float seedIn) {
  KChain c = kChain(ch);
  // The ctrl search seed, normalized onto the chain (rings wrap, runs clamp).
  highp float nc = float(c.nCtrl);
  highp float seed = c.closed ? seedIn - nc * floor(seedIn / nc) : clamp(seedIn, 0.0, nc - 1.0);
  highp float total = c.total;
  if (total <= 0.0 || c.count < 2) return knotSection(c, 0.0);
  highp float an = c.closed ? a - total * floor(a / total) : clamp(a, 0.0, total);
  vec3 m = kSectionAtArc(c, a, seed);
  highp float actrl = kCtrlOfArcNear(c, an, kSecK0);
  if (uKFx.w > 0.5 && uKFx.z < c.fxDone) {
    int st = int(uKFx.x + 0.5);
    if (st == 4 || st == 5) {
      highp float pR;
      highp float al;
      m = kFxColor(c, actrl, an / c.arcPer, m, pR, al);
    }
  }
  if ((uKPaint.x > 0.5 && c.paintOn) || uKFx2.z > 0.5) {
    m = kComposePaint(m, kPaintAt(c, actrl, an, kStripPx), kGlow(c, actrl));
  }
  return m;
}

out vec4 finalColor;
void main(void) {
  ivec2 fc = ivec2(gl_FragCoord.xy);
  int row = (fc.y << ${STRIP_LINE_SHIFT}) + (fc.x >> ${STRIP_W_SHIFT});
  int k = fc.x & ${STRIP_W - 1};
  if (row >= int(uStripInfo.x + 0.5)) {
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  int t = 2 * row;
  highp vec4 t0 = texelFetch(uStripTable, ivec2(t & ${ROW_W - 1}, t >> ${ROW_SHIFT}), 0);
  highp vec4 t1 = texelFetch(uStripTable, ivec2((t + 1) & ${ROW_W - 1}, (t + 1) >> ${ROW_SHIFT}), 0);
  kStripPx = t0.w;
  highp float fk = float(k);
  finalColor = vec4(chainMaterial(int(t0.x + 0.5), t0.y + t0.z * fk, t1.x + t1.y * fk), 1.0);
}
`;

// ---------------------------------------------------------------------------
// The pass: one quad over the used lines of the render texture.

let INFO: UniformGroup | null = null;
function stripInfo(): UniformGroup {
  if (!INFO) {
    INFO = new UniformGroup({
      uStripInfo: { value: new Float32Array(4), type: "vec4<f32>" },
    });
  }
  return INFO;
}

let SCENE: Container | null = null;
let QUAD: Mesh<Geometry, Shader> | null = null;
function passScene(): Container {
  if (!SCENE) {
    const shader = Shader.from({
      gl: { vertex: STRIP_VERT, fragment: STRIP_FRAG, name: "arm-strip" },
      resources: {
        uStripTable: stripTable().source,
        stripInfo: stripInfo(),
        uKStatic: kStatic().source,
        uKGeom: kGeom().source,
        uKReveal: kReveal().source,
        uKPaintData: kPaint().source,
        knotUniforms: knotUniforms(),
      },
    }) as Shader & { texture: Texture };
    shader.texture = Texture.WHITE;
    // Positions only (a MeshGeometry's aUV would be an attribute the pass
    // program lacks - a pixi warning per program).
    const geometry = new Geometry({
      attributes: {
        aPosition: { buffer: new Float32Array(8), format: "float32x2", stride: 8, offset: 0 },
      },
      indexBuffer: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    QUAD = new Mesh<Geometry, Shader>({ geometry, shader, texture: Texture.WHITE });
    // Every texel is written: no blending.
    QUAD.blendMode = "none";
    SCENE = new Container();
    SCENE.addChild(QUAD);
  }
  return SCENE;
}

function setQuad(lines: number): void {
  const b = (QUAD!.geometry as Geometry).getBuffer("aPosition");
  const p = b.data as Float32Array;
  p[0] = 0;
  p[1] = 0;
  p[2] = STRIP_RT_W;
  p[3] = 0;
  p[4] = STRIP_RT_W;
  p[5] = lines;
  p[6] = 0;
  p[7] = lines;
  // Whole-buffer uploads only (the PARTIAL BUFFER UPLOADS lore).
  b.update(b.data.byteLength);
}

// Anything the materials read changed since the last pass?
function dirty(): boolean {
  const r = STATE.lastRevs;
  const revs = [
    STATE.tableRev,
    kStatic().rev,
    kGeom().rev,
    kReveal().rev,
    kPaint().rev,
  ];
  let changed = false;
  for (let i = 0; i < revs.length; i++) {
    if (r[i] !== revs[i]) {
      r[i] = revs[i];
      changed = true;
    }
  }
  // Every knot uniform value (clocks, styles, paint, gamut...).
  const U = knotUniformValues() as unknown as Record<string, Float32Array>;
  let n = 0;
  for (const k in U) n += U[k].length;
  if (STATE.lastU.length !== n) {
    STATE.lastU = new Float32Array(n);
    changed = true;
  }
  let o = 0;
  const last = STATE.lastU;
  for (const k in U) {
    const v = U[k];
    for (let i = 0; i < v.length; i++, o++) {
      if (last[o] !== v[i]) {
        last[o] = v[i];
        changed = true;
      }
    }
  }
  return changed;
}

// Render every row now (the system's prerender, or a probe).
export function renderStrips(renderer: Renderer): void {
  const rows = STATE.rows;
  if (rows <= 0) return;
  const t0 = performance.now();
  const lines = Math.ceil(rows / STRIP_LINE);
  const rt = stripTexture();
  if (rt.height < lines) {
    // Grow in place (the same source; pixi re-allocates its GL texture).
    rt.resize(STRIP_RT_W, Math.max(lines, Math.ceil(rt.height * 1.5)), 1);
  }
  const scene = passScene();
  setQuad(lines);
  (stripInfo().uniforms as unknown as { uStripInfo: Float32Array }).uStripInfo[0] = rows;
  renderer.render({ container: scene, target: rt, clear: false });
  STATE.stats.renders++;
  STATE.stats.ms += performance.now() - t0;
  STATE.stats.rows = rows;
  STATE.stats.lines = lines;
}

// The pixi system: before every render that is not our own pass, refresh
// the strips if any input changed. Last in the prerender runner (priority).
class ArmStripSystem {
  static extension = {
    type: [ExtensionType.WebGLSystem],
    name: "knotArmStrips",
    priority: -100,
  };
  private readonly renderer: Renderer;
  private busy = false;
  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }
  prerender(options: { container: Container }): void {
    if (this.busy || STATE.rows <= 0 || options.container === SCENE) return;
    if (!dirty()) return;
    this.busy = true;
    try {
      renderStrips(this.renderer);
    } finally {
      this.busy = false;
    }
  }
  destroy(): void {}
}
extensions.add(ArmStripSystem);
