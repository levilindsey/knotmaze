// THE SECTION PROGRAM (K5 R1): the shader every ribbon draws with, its K76
// explore variant, and bindGap. Moved verbatim from ribbon_renderer.ts
// (9041939: 514-722 and 774-785); only `export` was added. The renderer
// calls sectionShader, sectionShaderExplore and bindGap; K307's warm-up
// registry (program_registry.ts) builds sectionProgram. G3-1 extends
// bindGap and G3-3 deletes the strip program (docs/design/K5_K6_split.md
// 2.3).
//
//   SectionShader, SECTION_SHADER  the shared shader's type and instance
//   SECTION_VERT, SECTION_FRAG     the program's text (master)
//   SECTION_EXPLORE_FRAG           the explore variant's fragment text
//   sectionProgram(explore)        the GlProgram (the registry builds it)
//   sectionShader()                the shared section shader
//   SECTION_EXPLORE_SHADER,        the K76 explore variant, built the first
//     sectionShaderExplore()         time the thread reveal turns on
//   bindGap(tex)                   every gap reader onto a scene's slot table
//
// The text is the intro's cold-compile critical path (section-rgb, 2.8 s
// of FXC on the desktop, render-shaders.md): any edit to it compiles cold
// once for every player. Two readers slice SECTION_FRAG out of this file's
// text, from its declaration to the next backtick-semicolon:
// paint_explore.test.ts and the probes' dump_variants.ts copies.

import { GlProgram, Shader, Texture } from "pixi.js";
import { withExplore } from "../explore_glsl";
import { GAP_FRAG, GAP_VERT_DECL, GAP_VERT_MAIN, defaultGapTexture } from "../gap_mask";
import { bindFieldGap } from "../junction_field";
import {
  KNOT_UNIFORMS_GLSL,
  PAINT_CONST_GLSL,
  PAINT_DATA_GLSL,
  PAINT_FRAG_DECL,
  PAINT_FRAG_LIB,
  PAINT_FX_GLSL,
  PAINT_GATE_THREAD_GLSL,
  PAINT_PAINT_RIBBON_GLSL,
  PAINT_SECTION_GLSL,
  PAINT_VERT_DECL,
  PAINT_VERT_MAIN,
  ROOT_FRAG_GLSL,
} from "../paint_glsl";
import { kGeom, kPaint, kReveal, kStatic, knotUniforms } from "../paint_model";
import { bindPluckGap } from "../pluck_overlay";
import { fabricUniforms, sampSource } from "../fabric_sdf";

// Mesh.shader wants a TextureShader (a Shader carrying its texture).
type SectionShader = Shader & { texture: Texture };
let SECTION_SHADER: SectionShader | null = null;

// The section shader (every ribbon, both modes; the app forces WebGL, so a
// GL program suffices). Attribute layout: aPosition/aUV as pixi's default
// mesh program (aUV.y = the side across the ribbon; aUV.x is unused since
// G2.3 - the paint is evaluated per pixel),
// plus the gap (G1) and paint (G2) attributes; the section RGB is computed
// HERE per vertex (paint_glsl knotSection at the vertex's ctrl through this
// frame's arc table - no per-sample cache, no drift re-bake, G2.2).
// Transforms and alpha mirror the default mesh program's
// skeleton: the mesh pipe force-assigns the global (uProjectionMatrix,
// uWorldTransformMatrix, uWorldColorAlpha) and local (uTransformMatrix,
// uColor) uniform groups to EVERY mesh shader, custom ones included, and
// the GL backend syncs them by name.
const SECTION_VERT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 aPosition;
in vec2 aUV;
${GAP_VERT_DECL}
${PAINT_VERT_DECL}
out vec2 vUV;
out vec3 vSection;
out vec4 vColor;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;
${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_DATA_GLSL}
${PAINT_SECTION_GLSL}

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
  vColor = uColor * uWorldColorAlpha;
${GAP_VERT_MAIN}
${PAINT_VERT_MAIN}
  vSection = kVertSection;
}
`;
// APPEARANCE FX, PER PIXEL (G2.1; paint_glsl.ts kFxColor): each fragment
// finds the reveal source covering its exact ctrl, the anim time the front
// reached it (closed form - no per-frame CPU state), and its age in wall
// seconds through the speed knots. Burn / roots tint the SECTION color by
// age; rainbow blends 6 stripes - along vUV.y, i.e. PARALLEL to the thread,
// UNDER the accent so the white-hot reveal tip and the gold path stay on
// top - then a brief faded-white wash; dust / comet materialize (alpha,
// premultiplied by scaling the whole output). A uniform branch (uKFx.w)
// skips all of it once the FX have settled.
// PER-PIXEL GAPS: gapKeep (gap_mask.ts) scales the premultiplied output;
// fully hidden fragments discard. pxW (world units per pixel, for the
// analytic AA of the gap edge) comes from fwidth() HERE, in uniform
// control flow - derivatives inside gapKeep's data-dependent loop would
// be undefined.
const SECTION_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vSection;
in vec4 vColor;
${PAINT_FRAG_DECL}

out vec4 finalColor;

${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_DATA_GLSL}
${PAINT_GATE_THREAD_GLSL}
${PAINT_FX_GLSL}
${PAINT_PAINT_RIBBON_GLSL}
${PAINT_FRAG_LIB}
${ROOT_FRAG_GLSL}
${GAP_FRAG}
void main(void) {
  highp vec2 gfw = fwidth(vPos);
  highp float pxW = max(max(gfw.x, gfw.y), 1e-5);
  highp float gTurn = gapTurn();
  // G2: this fragment's chain point (wrap-pair picks need derivatives in
  // uniform control flow - here, at the top), and its world arc per pixel
  // (the gameplay paint's edge coverage).
  KChain kc = kFragChain();
  highp vec2 kpt = kFragPoint(kc);
  highp vec2 ksw = fwidth(vSamp);
  highp float pxArc = (ksw.y < 0.5 * ksw.x ? ksw.y : ksw.x) * float(kc.count) * kc.arcPer;
  if (uKBase.z > 0.5 && uKBase.z < 4.5) {
    // DEBUG VIEW (probes): 1 = ctrl, 2 = arc - (fract(v), fract(16 v),
    // chain / 63); the census decodes 1e-4 precision through 8 bits.
    highp float kv = uKBase.z < 1.5 ? kCtrlNear(kc, kpt.x, kpt.y) : kpt.x;
    finalColor = vec4(fract(kv), fract(kv * 16.0), float(kc.ch % 64) / 63.0, 1.0);
    return;
  }
  vec3 base = vSection;
  // K620: a tapered root wears its strokes' sections, blending into its own at J.
  if (vKR0.x > 0.5 && kpt.x < vKR0.z) base = kRootSection(kpt.x, pxW);
  highp float pRain = 0.0;
  highp float aM = 1.0;
  // The exact ctrl, when the FX (kFxColor's own early outs hoisted: no
  // style, or this chain's FX all settled) or the paint / glow need it.
  bool fxHere = uKFx.w > 0.5 && uKFx.x > 0.5 && uKFx.z < kc.fxDone;
  bool paintHere = (uKPaint.x > 0.5 && kc.paintOn) || uKFx2.z > 0.5;
  highp float kctrl = fxHere || paintHere ? kCtrlNear(kc, kpt.x, kpt.y) : 0.0;
  if (fxHere) base = kFxColor(kc, kctrl, kpt.x / kc.arcPer, base, pRain, aM);
  if (pRain > 0.0) base = kRainbowBlend(base, pRain, vUV.y);
  // Gameplay paint + the reveal glow, composed over the section (G2.3).
  highp vec4 kst = paintHere ? kPaintAt(kc, kctrl, kpt.x, pxArc) : vec4(0.0);
  highp float kgl = paintHere ? kGlow(kc, kctrl) : 0.0;
  // K799: the traveled path's look (uKPath.x = width 0..1, .y = texture
  // 0 solid, 1 pencil, 2 crayon, 3 highlighter): narrow the gold toward
  // the centerline and grain it, ribbon-only (fans and strips keep the
  // full fill). A width of 0 hides the gold entirely.
  if (paintHere && kst.x > 0.0 && (uKPath.x < 1.0 || uKPath.y > 0.5)) {
    highp float ge = abs(2.0 * vUV.y - 1.0);
    highp float fwG = max(fwidth(vUV.y) * 3.0, 0.02);
    highp float gw2 = uKPath.y > 2.5 ? min(uKPath.x * 1.15, 1.0) : uKPath.x;
    highp float gm = clamp((gw2 - ge) / fwG + 0.5, 0.0, 1.0)
      * step(0.001, uKPath.x);
    if (uKPath.y > 0.5 && uKPath.y < 1.5) {
      gm *= 0.7 + 0.3 * fract(sin(dot(
        floor(vec2(vUV.x * 260.0, ge * 7.0)),
        vec2(12.9898, 78.233))) * 43758.5453);
    } else if (uKPath.y > 1.5 && uKPath.y < 2.5) {
      gm *= 0.45 + 0.55 * fract(sin(dot(
        floor(vec2(vUV.x * 90.0, ge * 4.0)),
        vec2(26.651, 41.313))) * 28001.8384);
    } else if (uKPath.y > 2.5) {
      gm *= 0.55;
    }
    kst.x *= gm;
  }
  // The hover glow (K145): kst.w is its strength along the thread, shaped
  // across the ribbon here (only the ribbons have an across coordinate).
  highp float krim = kst.w > 0.0 ? kst.w * kRimAcross(vUV.y) : 0.0;
  // A High contrast prototype shapes a choice across the ribbon (K111
  // stage 4; kComposePaint itself under today's look).
  vec3 rgb = paintHere ? kComposePaintAcross(base, kst, kgl, vUV.y) : base;
  // K525: the telegraph rims (paint_glsl.ts TELE_ITEM_GLSL).
  if (kTele > 0.0) rgb = kTeleOver(rgb, kTele * kRimAcross(vUV.y) * uKTele.w);
  // K298: the hover glow composes OVER the paint, so it shows on a hovered
  // choice at every breath phase of its own hover band (a max with the
  // band hid it under the breath). Off a band and the reveal glow this is
  // the old max(kgl, krim) whitening exactly.
  if (krim > 0.0) rgb = kRimOver(rgb, krim);
  // K137 fray (4.3's look, prototype): a cracked run goes pale (mix
  // toward its luminance) and thin (frayA below keeps only the middle
  // of the ribbon). Ribbon-only: the fans keep the full fill, as with
  // K799's traveled look.
  highp float frayA = 1.0;
  if (paintHere && kFrayHere > 0.0) {
    highp float lumF = dot(rgb, vec3(0.299, 0.587, 0.114));
    rgb = mix(rgb, vec3(lumF) * 0.85, 0.75 * kFrayHere);
    highp float eF = abs(2.0 * vUV.y - 1.0);
    highp float fwF = max(fwidth(vUV.y) * 3.0, 0.02);
    frayA = mix(1.0, clamp((0.45 - eF) / fwF + 0.5, 0.0, 1.0), kFrayHere);
  }
  // K797b THREAD LOOK (prototype; the CPU mirror and parity tests wait
  // for Levi's pick, per the ledger's render-prototype rule): an edge
  // stroke in darkened section color along each side. Border-only also
  // clears the interior, so over/under and joins read from the strokes
  // and the backdrop shows between them. Junction fans still fill.
  highp float lookA = 1.0;
  // K798: a border-at-a-time intro (uKLook.y: 1 = fill follows each
  // strand, 2 = all fills last; uKLook.z: the intro is running) makes
  // even the fill look draw its borders first while it runs.
  bool edgesIntro = uKLook.y > 0.5 && uKLook.z > 0.5;
  if (uKLook.x > 0.5 || edgesIntro) {
    highp float eAcross = abs(2.0 * vUV.y - 1.0);
    highp float fwA = max(fwidth(vUV.y) * 3.0, 0.02);
    highp float edge = smoothstep(0.62, 0.62 + fwA, eAcross);
    vec3 stroke = mix(rgb * 0.30, vec3(0.09, 0.085, 0.08), 0.5);
    if (uKLook.x > 0.5 && uKLook.x < 1.5) { rgb = stroke; lookA = edge; }
    else {
      rgb = mix(rgb, stroke, edge * 0.9);
      if (edgesIntro) {
        highp float fillOn = uKLook.y < 1.5
          ? (uKFx.z >= kc.fxDone ? 1.0 : 0.0)
          : 0.0;
        lookA = mix(fillOn, 1.0, edge);
      }
    }
  }
  float gk = gapKeep(pxW, gTurn);
  if (uKBase.z > 4.5) {
    // DEBUG VIEW 5 (probes): the paint terms of the VISIBLE thread (gaps
    // cut as in the normal view) - (gold amount p, the pulse band's
    // strength v, the reveal glow or the hover rim, the stronger; the rim
    // composes over the paint since K298).
    if (gk <= 0.002) discard;
    finalColor = vec4(clamp(kst.x, 0.0, 1.0), kst.y > 0.5 ? kst.z : 0.0, max(kgl, krim), 1.0);
    return;
  }
  // Probe view (globals texel .y): masked material tinted, not removed
  // (only masked fragments read the flag).
  if (gk < 1.0 && gapProbe()) {
    rgb = mix(rgb, vec3(1.0, 0.0, 0.85), (1.0 - gk) * 0.75);
    gk = 1.0;
  }
  if (gk * lookA * frayA <= 0.002) discard;
  finalColor = vec4(rgb, 1.0) * vColor * (aM * gk * lookA * frayA);
}
`;

// K307 WARM-UP: the section programs, for the warm-up registry
// (program_registry.ts). GlProgram.from caches by source, so this is the
// very program the section shaders draw with.
let SECTION_EXPLORE_FRAG: string | null = null;
export function sectionProgram(explore = false): GlProgram {
  if (!explore) {
    return GlProgram.from({ vertex: SECTION_VERT, fragment: SECTION_FRAG, name: "section-rgb" });
  }
  SECTION_EXPLORE_FRAG ??= withExplore(SECTION_FRAG);
  return GlProgram.from({
    vertex: SECTION_VERT,
    fragment: SECTION_EXPLORE_FRAG,
    name: "section-rgb-explore",
  });
}

// The ONE shared section shader. (The path color reaches it as a uniform,
// uKGold - since G2.3 nothing samples mesh.texture, which custom shaders
// ignore anyway: the olive-smudge lore.)
export function sectionShader(): SectionShader {
  if (!SECTION_SHADER) {
    const sh = new Shader({
      glProgram: sectionProgram(false),
      resources: {
        // pixi binds every TextureSource resource to the sampler uniform of
        // the same name; bindGap swaps it per scene.
        uGapData: defaultGapTexture().source,
        // G3-1: the shared SAMP table and the gap globals (fabric_sdf.ts).
        uSamp: sampSource(),
        fabricUniforms: fabricUniforms(),
        // G2 shader paint (paint_model.ts): page-lifetime data textures +
        // the shared uniform group.
        uKStatic: kStatic().source,
        uKGeom: kGeom().source,
        uKReveal: kReveal().source,
        uKPaintData: kPaint().source,
        knotUniforms: knotUniforms(),
      },
    }) as SectionShader;
    sh.texture = Texture.WHITE;
    SECTION_SHADER = sh;
  }
  return SECTION_SHADER;
}

// K76 THREAD REVEAL: the section program's explore variant (the master
// fragment text plus explore_glsl.ts's insertions; the same resources).
// Built the first time the mode turns on: with the mode off no ribbon binds
// it, so every frame runs master's program exactly.
let SECTION_EXPLORE_SHADER: SectionShader | null = null;
export function sectionShaderExplore(): SectionShader {
  if (!SECTION_EXPLORE_SHADER) {
    const sh = new Shader({
      glProgram: sectionProgram(true),
      resources: {
        uGapData: sectionShader().resources.uGapData,
        uSamp: sampSource(),
        fabricUniforms: fabricUniforms(),
        uKStatic: kStatic().source,
        uKGeom: kGeom().source,
        uKReveal: kReveal().source,
        uKPaintData: kPaint().source,
        knotUniforms: knotUniforms(),
      },
    }) as SectionShader;
    sh.texture = Texture.WHITE;
    SECTION_EXPLORE_SHADER = sh;
  }
  return SECTION_EXPLORE_SHADER;
}

// Point every gap reader - the shared section shader (ribbons), the
// junction-field shader (fans) and the still-pluck program - at a scene's
// gap-slot table (gap tables are page-lifetime and sized per scene - see
// gap_mask.ts).
export function bindGap(tex: Texture): void {
  bindFieldGap(tex);
  bindPluckGap(tex);
  const samp = sampSource();
  const sh = sectionShader();
  if (sh.resources.uGapData !== tex.source) sh.resources.uGapData = tex.source;
  if (sh.resources.uSamp !== samp) sh.resources.uSamp = samp;
  const ex = SECTION_EXPLORE_SHADER;
  if (ex && ex.resources.uGapData !== tex.source) ex.resources.uGapData = tex.source;
  if (ex && ex.resources.uSamp !== samp) ex.resources.uSamp = samp;
}
