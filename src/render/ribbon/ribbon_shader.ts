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
// once for every player. K320 stage 2b: SECTION_FRAG is the paint half
// (it samples the gap pre-pass mask, GAP_MASK_FRAG below); the combined
// in-shader search survives only as SECTION_FRAG_COMBINED, drawn where
// no half-float target exists (gapSplitActive false) and warmed only there. Two readers slice SECTION_FRAG out of this file's
// text, from its declaration to the next backtick-semicolon:
// paint_explore.test.ts and the probes' dump_variants.ts copies.

import { GlProgram, Shader, Texture } from "pixi.js";
import { applyEdits, exploreGapEdits, withExplore, withExplorePaint } from "../explore_glsl";
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
} from "../paint_glsl";
import { PAINT_CONST } from "../paint_const";
import { kGeom, kPaint, kReveal, kStatic, knotUniforms } from "../paint_model";
import { bindPluckGap } from "../pluck_overlay";
import { fabricUniforms, gapMaskUniforms, gapSplitActive, sampSource } from "../fabric_sdf";

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
flat out highp int vChain;

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
  vChain = int(aKey.x + 0.5);
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
// K320 stage 2b: the paint fragment's gap term — one texelFetch of the
// pre-pass mask (gap_prepass.ts) instead of the search. R = gapKeep,
// G = draw index + 1 (ps.chains order, the same index kFragChain reads);
// a fragment whose texel belongs to a later ribbon keeps 1.0 (that owner's
// paint applies the stored keep). The row mirrors (Pixi flips
// render-target projections; gapMaskTexel is the CPU twin). uFabricGap.y
// is the probe tint flag (gapProbe() leaves with the library).
export const GAP_MASK_FRAG = /* glsl */ `
in highp vec2 vPos;
uniform highp sampler2D uGapMask;
uniform vec2 uGapSize;
uniform vec4 uFabricGap;
highp float gapKeepFromMask(int self) {
  ivec2 tc = ivec2(int(gl_FragCoord.x), int(uGapSize.y) - 2 - int(gl_FragCoord.y));
  vec4 m = texelFetch(uGapMask, tc, 0);
  if (int(m.g + 0.5) - 1 != self) return 1.0;
  return m.r;
}
bool gapProbe() {
  return uFabricGap.y > 0.5;
}
`;
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
${GAP_MASK_FRAG}
void main(void) {
  highp vec2 gfw = fwidth(vPos);
  highp float pxW = max(max(gfw.x, gfw.y), 1e-5);
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
  // The hover glow (K145): kst.w is its strength along the thread, shaped
  // across the ribbon here (only the ribbons have an across coordinate).
  highp float krim = kst.w > 0.0 ? kst.w * kRimAcross(vUV.y) : 0.0;
  // A High contrast prototype shapes a choice across the ribbon (K111
  // stage 4; kComposePaint itself under today's look).
  vec3 rgb = paintHere ? kComposePaintAcross(base, kst, kgl, vUV.y) : base;
  // K298: the hover glow composes OVER the paint, so it shows on a hovered
  // choice at every breath phase of its own hover band (a max with the
  // band hid it under the breath). Off a band and the reveal glow this is
  // the old max(kgl, krim) whitening exactly.
  if (krim > 0.0) rgb = kRimOver(rgb, krim);
  float gk = gapKeepFromMask(kc.ch);
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
  if (gk <= 0.002) discard;
  finalColor = vec4(rgb, 1.0) * vColor * (aM * gk);
}
`;
// K320 stage 2b fallback: today's combined program (paint + in-shader
// gapKeep), kept only for contexts with no half-float color buffer
// (program_registry gapSplit false). Never warmed beside the split pair.
export const SECTION_FRAG_COMBINED = /* glsl */ `#version 300 es
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
  // The hover glow (K145): kst.w is its strength along the thread, shaped
  // across the ribbon here (only the ribbons have an across coordinate).
  highp float krim = kst.w > 0.0 ? kst.w * kRimAcross(vUV.y) : 0.0;
  // A High contrast prototype shapes a choice across the ribbon (K111
  // stage 4; kComposePaint itself under today's look).
  vec3 rgb = paintHere ? kComposePaintAcross(base, kst, kgl, vUV.y) : base;
  // K298: the hover glow composes OVER the paint, so it shows on a hovered
  // choice at every breath phase of its own hover band (a max with the
  // band hid it under the breath). Off a band and the reveal glow this is
  // the old max(kgl, krim) whitening exactly.
  if (krim > 0.0) rgb = kRimOver(rgb, krim);
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
  if (gk <= 0.002) discard;
  finalColor = vec4(rgb, 1.0) * vColor * (aM * gk);
}
`;


// K307 WARM-UP: the section programs, for the warm-up registry
// (program_registry.ts). GlProgram.from caches by source, so this is the
// very program the section shaders draw with.
let SECTION_EXPLORE_FRAG: string | null = null;
let SECTION_EXPLORE_COMBINED_FRAG: string | null = null;
// K320 stage 2b: split selects the paint half; !split the combined
// fallback. The registry passes its WarmContext's answer; the renderer
// passes the live flag (fabric_sdf gapSplitActive).
export function sectionProgramFor(split: boolean, explore = false): GlProgram {
  if (!explore) {
    return GlProgram.from({
      vertex: SECTION_VERT,
      fragment: split ? SECTION_FRAG : SECTION_FRAG_COMBINED,
      name: "section-rgb",
    });
  }
  const frag = split
    ? (SECTION_EXPLORE_FRAG ??= withExplorePaint(SECTION_FRAG))
    : (SECTION_EXPLORE_COMBINED_FRAG ??= withExplore(SECTION_FRAG_COMBINED));
  return GlProgram.from({ vertex: SECTION_VERT, fragment: frag, name: "section-rgb-explore" });
}
export function sectionProgram(explore = false): GlProgram {
  return sectionProgramFor(gapSplitActive(), explore);
}

// The ONE shared section shader. (The path color reaches it as a uniform,
// uKGold - since G2.3 nothing samples mesh.texture, which custom shaders
// ignore anyway: the olive-smudge lore.)
// K320 STAGE 2a: THE GAP-ONLY PRE-PASS PROGRAMS (docs/design/K320_stage2.md
// sections 3.1-3.2, sub-step 2a). Same vertex shader and geometry as the
// section programs; the fragment is Stage 0's gap skeleton grown to a real
// output: GAP_FRAG (the unedited search text) plus only what gapKeepAt reads
// from the paint side (uKFx, CROSSING_FADE_IN for gapStrength). R = gapKeep,
// G = chain (draw) index + 1, written into the gap mask target by
// gap_prepass.ts. Nothing consumes the mask yet: the section programs keep
// their in-shader gapKeep until 2b.
const GAP_KSMOOTH = ((): string => {
  const i = PAINT_GATE_THREAD_GLSL.indexOf("highp float kSmooth(");
  return PAINT_GATE_THREAD_GLSL.slice(i, PAINT_GATE_THREAD_GLSL.indexOf("}\n", i) + 2);
})();
export const GAP_ONLY_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
flat in highp int vChain;
uniform vec4 uKFx;
const float CROSSING_FADE_IN = ${PAINT_CONST.CROSSING_FADE_IN};
out vec4 finalColor;
${GAP_FRAG}
void main(void) {
  highp vec2 gfw = fwidth(vPos);
  highp float pxW = max(max(gfw.x, gfw.y), 1e-5);
  highp float gk = gapKeep(pxW, gapTurn());
  finalColor = vec4(gk, float(vChain) + 1.0, 0.0, 1.0);
}
`;
let GAP_ONLY_EXPLORE_FRAG: string | null = null;
export function gapOnlyFragExplore(): string {
  GAP_ONLY_EXPLORE_FRAG ??= applyEdits(
    GAP_ONLY_FRAG,
    exploreGapEdits(false, "uniform vec4 uKExplore;\n" + GAP_KSMOOTH),
    "gap explore variant",
  );
  return GAP_ONLY_EXPLORE_FRAG;
}
export function sectionGapProgram(explore = false): GlProgram {
  if (!explore) {
    return GlProgram.from({ vertex: SECTION_VERT, fragment: GAP_ONLY_FRAG, name: "section-rgb-gap" });
  }
  return GlProgram.from({
    vertex: SECTION_VERT,
    fragment: gapOnlyFragExplore(),
    name: "section-rgb-gap-explore",
  });
}
let GAP_SHADER: SectionShader | null = null;
let GAP_EXPLORE_SHADER: SectionShader | null = null;
export function sectionGapShader(explore = false): SectionShader {
  const have = explore ? GAP_EXPLORE_SHADER : GAP_SHADER;
  if (have) return have;
  const sh = new Shader({
    glProgram: sectionGapProgram(explore),
    resources: {
      uGapData: (CURRENT_GAP_TEX ?? defaultGapTexture()).source,
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
  if (explore) GAP_EXPLORE_SHADER = sh;
  else GAP_SHADER = sh;
  return sh;
}
// The gap mask the paint shaders sample (gap_prepass.ts target); bound by
// bindGapMask, WHITE until then (its G reads chain 0, R reads 1: no cut).
let GAP_MASK_TEX: Texture | null = null;
function paintResources(): Record<string, unknown> {
  return {
    uGapMask: (GAP_MASK_TEX ?? Texture.WHITE).source,
    gapMaskUniforms: gapMaskUniforms(),
    fabricUniforms: fabricUniforms(),
    uKStatic: kStatic().source,
    uKGeom: kGeom().source,
    uKReveal: kReveal().source,
    uKPaintData: kPaint().source,
    knotUniforms: knotUniforms(),
  };
}
// The scene slot table bindGap last pointed every reader at; shaders
// created after that call (the gap pair at first prerender, a fallback
// pair at a probe toggle) seed from it instead of the placeholder.
let CURRENT_GAP_TEX: Texture | null = null;
function fallbackResources(): Record<string, unknown> {
  return {
    uGapData: (CURRENT_GAP_TEX ?? defaultGapTexture()).source,
    uSamp: sampSource(),
    fabricUniforms: fabricUniforms(),
    uKStatic: kStatic().source,
    uKGeom: kGeom().source,
    uKReveal: kReveal().source,
    uKPaintData: kPaint().source,
    knotUniforms: knotUniforms(),
  };
}
let SECTION_FALLBACK_SHADER: SectionShader | null = null;
let SECTION_EXPLORE_FALLBACK_SHADER: SectionShader | null = null;
export function sectionShader(): SectionShader {
  if (!gapSplitActive()) {
    if (!SECTION_FALLBACK_SHADER) {
      const sh = new Shader({
        glProgram: sectionProgramFor(false, false),
        resources: fallbackResources(),
      }) as SectionShader;
      sh.texture = Texture.WHITE;
      SECTION_FALLBACK_SHADER = sh;
    }
    return SECTION_FALLBACK_SHADER;
  }
  if (!SECTION_SHADER) {
    const sh = new Shader({
      glProgram: sectionProgramFor(true, false),
      resources: paintResources(),
    }) as unknown as SectionShader;
    sh.texture = Texture.WHITE;
    SECTION_SHADER = sh;
  }
  return SECTION_SHADER;
}
export function bindGapMask(tex: Texture): void {
  GAP_MASK_TEX = tex;
  for (const sh of [SECTION_SHADER, SECTION_EXPLORE_SHADER]) {
    if (sh && sh.resources.uGapMask !== tex.source) {
      sh.resources.uGapMask = tex.source as never;
    }
  }
}

// K76 THREAD REVEAL: the section program's explore variant (the master
// fragment text plus explore_glsl.ts's insertions; the same resources).
// Built the first time the mode turns on: with the mode off no ribbon binds
// it, so every frame runs master's program exactly.
let SECTION_EXPLORE_SHADER: SectionShader | null = null;
export function sectionShaderExplore(): SectionShader {
  if (!gapSplitActive()) {
    if (!SECTION_EXPLORE_FALLBACK_SHADER) {
      const sh = new Shader({
        glProgram: sectionProgramFor(false, true),
        resources: fallbackResources(),
      }) as SectionShader;
      sh.texture = Texture.WHITE;
      SECTION_EXPLORE_FALLBACK_SHADER = sh;
    }
    return SECTION_EXPLORE_FALLBACK_SHADER;
  }
  if (!SECTION_EXPLORE_SHADER) {
    const sh = new Shader({
      glProgram: sectionProgramFor(true, true),
      resources: paintResources(),
    }) as unknown as SectionShader;
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
  CURRENT_GAP_TEX = tex;
  bindFieldGap(tex);
  bindPluckGap(tex);
  const samp = sampSource();
  // K320 2b: the paint shaders read the mask, not the slot table; only the
  // fallback pair and the gap pair still bind uGapData/uSamp here.
  for (const sh of [SECTION_FALLBACK_SHADER, SECTION_EXPLORE_FALLBACK_SHADER]) {
    if (!sh) continue;
    if (sh.resources.uGapData !== tex.source) sh.resources.uGapData = tex.source;
    if (sh.resources.uSamp !== samp) sh.resources.uSamp = samp;
  }
  for (const g of [GAP_SHADER, GAP_EXPLORE_SHADER]) {
    if (!g) continue;
    if (g.resources.uGapData !== tex.source) g.resources.uGapData = tex.source;
    if (g.resources.uSamp !== samp) g.resources.uSamp = samp;
  }
}
