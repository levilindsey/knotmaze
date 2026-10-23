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

// K8 G3-2 (design 3.1): the SDF ribbons' own tables and cone. The
// vertex stage reads the G3 CHAIN record (samp_table.ts writeChainTexels:
// (sampBase, radBase, capStart, capEnd), (winBase, nWin, rangeBase,
// nRange), two texels per chain) plus RADII and RANGES; the fragment
// stage needs only sdCone/aaCov.
export const SDF_TEX_GLSL = /* glsl */ `
uniform highp sampler2D uRadii;
uniform highp sampler2D uG3Chain;
uniform highp sampler2D uRanges;
vec4 g3ChainAt(int chain, int part) {
  int t = chain * 2 + part;
  return texelFetch(uG3Chain, ivec2(t & ${ROW_W - 1}, t >> 10), 0);
}
float radAt(int radBase, int j) {
  int f = radBase + j; // RADII packs one float per sample (four per texel).
  vec4 q = texelFetch(uRadii, ivec2((f >> 2) & ${ROW_W - 1}, (f >> 2) >> 10), 0);
  return q[f & 3];
}
vec4 rangeAt(int i) {
  return texelFetch(uRanges, ivec2(i & ${ROW_W - 1}, i >> 10), 0);
}
`;
export const SDF_CONE_GLSL = /* glsl */ `
// Signed distance to the round cone (a,ra)->(b,rb) (iq's uneven
// capsule); t = projection param, lat = signed lateral (+ = left).
float sdCone(vec2 p, vec2 a, vec2 b, float ra, float rb, out float t, out float lat) {
  vec2 ba = b - a, pa = p - a; float l2 = dot(ba, ba);
  if (l2 < 1e-12) { t = 0.0; lat = 0.0; return length(pa) - max(ra, rb); }
  float l = sqrt(l2); vec2 u = ba / l;
  float y = dot(pa, u); lat = u.x * pa.y - u.y * pa.x; float x = abs(lat);
  t = clamp(y / l, 0.0, 1.0);
  float s = (ra - rb) / l;
  if (abs(s) >= 1.0) return min(length(pa) - ra, length(p - b) - rb);
  float c = sqrt(1.0 - s * s), k = c * y - s * x;
  if (k < 0.0) return length(pa) - ra;
  if (k > c * l) return length(p - b) - rb;
  return c * x + s * y - ra;
}
float aaCov(float a, float pxW) { return clamp(0.5 - a / pxW, 0.0, 1.0); }
// K826: signed distance to the segment's MITERED quad (the strip's
// silhouette): corners at the two joints' bisector points, the miter
// clamped (the fold pinch: past it the capsule union stands). The
// capsule union alone rounds the outside of every bend, which read
// thinner than the strip at joins (the G3-2 A/B); the union of the two
// distances restores the miter without spikes at folds.
float sdSegDist(vec2 p, vec2 a, vec2 b) {
  vec2 ba = b - a, pa = p - a;
  float h = dot(ba, ba) > 1e-12 ? clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0) : 0.0;
  return length(pa - ba * h);
}
float sdMiterQuad(vec2 p, vec2 p0, vec2 p1, vec2 p2, vec2 p3, float r1, float r2) {
  vec2 d1 = p2 - p1;
  float l1 = length(d1);
  if (l1 < 1e-9) return 1e9;
  d1 /= l1;
  vec2 dp = p1 - p0;
  dp = length(dp) > 1e-9 ? normalize(dp) : d1;
  vec2 dn = p3 - p2;
  dn = length(dn) > 1e-9 ? normalize(dn) : d1;
  vec2 np1 = vec2(-d1.y, d1.x);
  vec2 b1 = vec2(-dp.y, dp.x) + np1;
  vec2 b2 = vec2(-dn.y, dn.x) + np1;
  float s1 = 1.0 / max(dot(normalize(b1 + vec2(1e-9)), np1), 0.35);
  float s2 = 1.0 / max(dot(normalize(b2 + vec2(1e-9)), np1), 0.35);
  vec2 A = p1 + normalize(b1 + vec2(1e-9)) * (r1 * s1);
  vec2 B = p2 + normalize(b2 + vec2(1e-9)) * (r2 * s2);
  vec2 C = p2 - normalize(b2 + vec2(1e-9)) * (r2 * s2);
  vec2 D = p1 - normalize(b1 + vec2(1e-9)) * (r1 * s1);
  float d = min(min(sdSegDist(p, A, B), sdSegDist(p, B, C)), min(sdSegDist(p, C, D), sdSegDist(p, D, A)));
  // Inside test: the quad is convex with a consistent winding.
  float c1 = (B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x);
  float c2 = (C.x - B.x) * (p.y - B.y) - (C.y - B.y) * (p.x - B.x);
  float c3 = (D.x - C.x) * (p.y - C.y) - (D.y - C.y) * (p.x - C.x);
  float c4 = (A.x - D.x) * (p.y - D.y) - (A.y - D.y) * (p.x - D.x);
  bool inside = (c1 >= 0.0 && c2 >= 0.0 && c3 >= 0.0 && c4 >= 0.0)
    || (c1 <= 0.0 && c2 <= 0.0 && c3 <= 0.0 && c4 <= 0.0);
  return inside ? -d : d;
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
