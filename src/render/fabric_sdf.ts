// G3-1 SHARED SDF GEOMETRY (K8; design: docs/design/G3G4_sdf_geometry.md
// sections 2.4 and 3.1, brief docs/design/K8_G3-1.md). The one place the
// gap search's shader helpers and their CPU mirrors live: sampAt over the
// G3 SAMP table (samp_table.ts: two samples per RGBA32F texel, ROW_W 1024)
// and the fabricUniforms group, which carries the gap globals that row 0
// of the old GAP texture held (G1's "drop the globals fetch" lever).
//
// uFabricGap = (gapEnabled, gapProbeTint, bruteForce, -): set by
// GapMaskTable.setEnabled (enabled / tint) and by probes (bruteForce: the
// search ignores its chunk bounds and its sure2 early exit, so a
// brute-force against pruned A/B on one page must read 0 px apart).
// Every program that includes GAP_FRAG_LIB (the section program and its
// explore variant, the junction fans, the still pluck) binds uSamp and
// fabricUniforms through bindGap's one binding list
// (ribbon/ribbon_shader.ts).

import { UniformGroup } from "pixi.js";
import type { BufferImageSource } from "pixi.js";
import { FloatRows, ROW_W } from "./float_rows";

// GLSL: the SAMP fetch and the gap globals. Included by gap_mask.ts's
// GAP_FRAG_LIB, so every gap reader declares them exactly once.
export const FABRIC_GLSL = /* glsl */ `
uniform highp sampler2D uSamp;
uniform vec4 uFabricGap;
vec2 sampAt(int i) {
  int t = i >> 1;
  vec4 q = texelFetch(uSamp, ivec2(t & ${ROW_W - 1}, t >> 10), 0);
  return (i & 1) == 0 ? q.xy : q.zw;
}
`;

// sampAt's CPU mirror over a SAMP mirror (samp_table.ts readSamp's maths,
// inlined so this module stays the search's one home).
export function sampAtCpu(data: Float32Array, i: number, out: Float32Array | number[]): void {
  const o = (i >> 1) * 4 + (i & 1) * 2;
  out[0] = data[o];
  out[1] = data[o + 1];
}

// The current scene's SAMP source (the renderer's G3 tables), swapped by
// bindGap's binding list; shaders built before a scene exists bind the
// placeholder below and are re-pointed by the same list.
let SAMP_SOURCE: BufferImageSource | null = null;
let SAMP_PLACEHOLDER: FloatRows | null = null;
export function setSampSource(source: BufferImageSource): void {
  SAMP_SOURCE = source;
}
export function sampSource(): BufferImageSource {
  if (SAMP_SOURCE) return SAMP_SOURCE;
  SAMP_PLACEHOLDER ??= new FloatRows(ROW_W, 1);
  return SAMP_PLACEHOLDER.source as unknown as BufferImageSource;
}

let FABRIC_UNIFORMS: UniformGroup | null = null;
export function fabricUniforms(): UniformGroup {
  if (!FABRIC_UNIFORMS) {
    FABRIC_UNIFORMS = new UniformGroup({
      uFabricGap: { value: new Float32Array([1, 0, 0, 0]), type: "vec4<f32>" },
    });
  }
  return FABRIC_UNIFORMS;
}

// The gap globals (see the header): enabled and the probe tint come from
// GapMaskTable.setEnabled; brute is a probe switch (the renderer's
// gapBrute toggle), never a link or panel value.
// K320 stage 2b: the split's shared state — whether the gap mask target
// can exist on this context (the half-float check in gap_prepass.ts) and
// the mask's size uniform the paint fragments read for the Y flip. Kept
// here (no import cycle: gap_prepass and ribbon_shader both import this
// module) — the paint shader's choice (mask sample vs the combined
// in-shader search) and the warm-up's registry both read the one flag.
// K320 2b meant to land the split dark: parity is blocked on K550 (split
// cuts wider bars), so the combined in-shader path stays the default
// until 2c proves 0 px. K551: detectGapSplit and the pre-pass system's
// contextChange set this flag from capability, so the split went live on
// every half-float GPU from 2026-10-18, and on the desktop (D3D11) it drew
// no crossing gaps at all (.claude/probes/K551/). Only the renderer's
// setGapSplit (the probe A/B) sets it now; the pre-pass's framebuffer
// check may still clear it.
let GAP_SPLIT = false;
export function gapSplitActive(): boolean {
  return GAP_SPLIT;
}
export function setGapSplitActive(on: boolean): void {
  GAP_SPLIT = on;
}

let GAP_MASK_UNIFORMS: UniformGroup | null = null;
export function gapMaskUniforms(): UniformGroup {
  if (!GAP_MASK_UNIFORMS) {
    GAP_MASK_UNIFORMS = new UniformGroup({
      uGapSize: { value: new Float32Array([1, 1]), type: "vec2<f32>" },
    });
  }
  return GAP_MASK_UNIFORMS;
}
export function setGapMaskSize(w: number, h: number): void {
  const v = (gapMaskUniforms().uniforms as unknown as { uGapSize: Float32Array }).uGapSize;
  v[0] = Math.max(1, Math.round(w));
  v[1] = Math.max(1, Math.round(h));
}

export function setFabricGap(enabled: boolean, probe: boolean, brute = false): void {
  const v = (fabricUniforms().uniforms as unknown as { uFabricGap: Float32Array }).uFabricGap;
  v[0] = enabled ? 1 : 0;
  v[1] = probe ? 1 : 0;
  v[2] = brute ? 1 : 0;
}
export function fabricGapBrute(): boolean {
  return (fabricUniforms().uniforms as unknown as { uFabricGap: Float32Array }).uFabricGap[2] > 0.5;
}
export function setFabricGapBrute(brute: boolean): void {
  (fabricUniforms().uniforms as unknown as { uFabricGap: Float32Array }).uFabricGap[2] = brute ? 1 : 0;
}
