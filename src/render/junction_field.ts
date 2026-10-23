// GPU JUNCTION FIELD. The junction field (see RibbonRenderer.rebuildFillets)
// used to be evaluated on the CPU at every fan vertex - ring-subdivided so
// Gouraud could approximate a nonlinear field - and at every over-fill
// vertex near a joint, every paint tick: 5-30 ms per tick at big
// cuspRadius, while the GPU sat idle. It now runs PER PIXEL in fragment
// shaders. The CPU only builds geometry (positions + a per-vertex RECORD
// index) and uploads two float DATA TEXTURES:
//
//   (G2: the arm MATERIAL - the ribbon's own section Gouraud, burn /
//   roots and the gameplay paint, composed exactly as the ribbon shader
//   composes them - comes from the ARM STRIPS (arm_strip.ts, the K4 fan
//   fix): rendered once per frame per arm into an RGBA8 row, read here as
//   two texels per arm. Evaluating it per pixel, twice per web pixel, cost
//   the phone 60 -> 44 fps.)
//   RECORD (RGBA32F, linear texel index): one record per junction / tip:
//          header (jx, jy, nArms, routeBase), the GATE texel J1 = (tOn,
//          tLast, 0, nRoutes) (G2.1: reveal-relative wall times - shown
//          once every arm is revealed, fading in as the latest-ignited
//          arm's appearance FX settles; paint_glsl knotFanAlpha reads .xy
//          only; K81's routes below), then per arm a header pair
//          (chain, ctrlSlope, stripRow, stripScale) + (arc0, dir, domain,
//          jointCtrl) (the strip row holds the arm's material from its
//          joint outward, stripScale texels per world arc; chain, slope,
//          arc0, dir and the joint ctrl are what the strip row was written
//          from - the CPU mirror reads them) and its RADIAL PROFILE, one
//          texel per FIELD_PROF_DR radius step: (angle[g], arc[g],
//          angle[g+1], arc[g+1]) - both ends of a lookup in one fetch.
//          nArms 0 = an AXIS record (free dead-end tip, or the host-axis
//          fallback): header, J1, (chain, stripRow, stripScale, offset) +
//          (arc0, axisX, axisY, ctrl0) - the thread's own material at the
//          point's axis projection (strip texel (t + offset) * stripScale).
//   ROUTES (K81): where the player's route passes a junction, the gold
//          reads as ONE smooth band from the arrival arm to the departure
//          arm instead of two straight ribbons meeting in an L whose outer
//          corners and wedge blends were gold too (the "flat nub" Levi
//          reported). A routed record (nRoutes > 0) lists its passes at
//          routeBase, oldest first: per route R0 = (nVerts, m, armA, armB
//          or -1 for a one-arm route) then nVerts texels (x, y, tau, 0) -
//          the band's centerline: arm A's own centerline in to arc d, a
//          cubic turn, arm B's out (tau = -arc along A, +arc along B). In a
//          routed record each arm owns TWO strip rows: its composed
//          material at stripRow and its UNTRAVELED material (arm_strip.ts:
//          the paint without its gold amount) at stripRow + 1. The base
//          field reads the untraveled rows, so the web is untraveled
//          everywhere off the bands; each band is the thread's width and
//          wears its arms' COMPOSED rows (A at -tau, B at +tau,
//          smoothstep-blended over |tau| < m), so it follows every paint
//          the arms show - trail fades included, with no clock of its own.
//          Band reads are floored at texel 1: a span ending at the joint
//          half-covers texel 0. The CPU side re-draws the arms' ribbon
//          quads near a routed joint in this pass (COVER STRIPS, tagged by
//          a fractional aRec: STRIP_REC_TAG) and drops the paint caps
//          there, so the field and the bands decide those pixels.
//          FULLY TRAVELED (K127): J1.z > 0 marks a routed record whose arms
//          the path has ALL traveled (junction_routes.ts traveledRoutes).
//          Its base reads the COMPOSED rows instead - the pre-K81 angular
//          blend of the arms' paint, trail fade and pulses included - its
//          caps stay, and the bands still draw over it. K169: J1.z is the
//          LEVEL the web has faded in to (web_fade.ts, eased, rewritten in
//          place each paint tick): 0 = the untraveled rows, 1 = the composed
//          ones, and between the two bases blend; a fading record keeps its
//          untraveled rows until it reaches 1.
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

import { Buffer, BufferUsage, GlProgram, Shader, Texture, UniformGroup } from "pixi.js";
import type { MeshGeometry } from "pixi.js";
import { GAP_FRAG_LIB_FAN, defaultGapTexture } from "./gap_mask";
import { FloatRows, ROW_SHIFT } from "./float_rows";
import { KNOT_UNIFORMS_GLSL, PAINT_CONST_GLSL, PAINT_GATE_GLSL } from "./paint_glsl";
import { knotUniforms } from "./paint_model";
import { STRIP_LOOKUP_GLSL, STRIP_LOOKUP_P_GLSL, stripTexture } from "./arm_strip";
import { exploreGapEdits } from "./explore_glsl";
import { fabricUniforms, sampSource } from "./fabric_sdf";

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
// K81 route bands per record (the shader's loop bounds): passes through
// one junction (a revisit adds one; the CPU keeps the newest) and band
// centerline vertices per pass.
export const MAX_ROUTES = 4;
export const MAX_ROUTE_VERTS = 64;
// A band's solid pad past the thread half-width, in pixels, on COVER STRIPS
// only (junctionField): a strip's own edge is the ribbon's MSAA edge, and
// the pad keeps the untraveled material out of it.
export const ROUTE_BAND_PAD = 0.5;
// Added to a cover strip's aRec (TriFanMesh.pushStrip): the fragment tells a
// strip from a fan by fract(vRec) and still finds the record at
// int(vRec + 0.5) (exact in float32 below 2^21 records).
export const STRIP_REC_TAG = 0.25;
// Texel row widths of the two data textures (linear index -> (i % W, i / W),
// done in GLSL as a mask and a shift - both widths are 2^ROW_SHIFT; the
// FloatRows class and its row uploader live in float_rows.ts).
export const RECORD_W = 1 << ROW_SHIFT;

let RECORD_DATA: FloatRows | null = null;
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
uniform vec4 uJParams;
uniform vec4 uJParams2;
${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
${PAINT_GATE_GLSL}
${STRIP_LOOKUP_GLSL}

const float TAU = 6.283185307179586;
const float HALF_PI = 1.5707963267948966;

vec4 jAt(int i) { return texelFetch(uJData, ivec2(i & ${RECORD_W - 1}, i >> ${ROW_SHIFT}), 0); }

// An arm's COMPOSED material at arc offset s along it (clamped to its
// domain): its strip row (h.z) at s times the row's texels per world arc
// (h.w) - arm_strip.ts renders the material there once per frame. K81:
// untrav reads the arm's UNTRAVELED row (h.z + 1, routed records only);
// band floors the lookup at texel 1 (a gold span ending at the joint
// half-covers texel 0, and a band must not half-light its own start).
vec3 armPaint(int ab, float s, bool band, bool untrav) {
  vec4 h = jAt(ab);
  float sc = min(band ? max(s, 1.0 / h.w) : s, jAt(ab + 1).z);
  return stripAt(int(h.z + 0.5) + (untrav ? 1 : 0), sc * h.w);
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
// untrav (K81, a routed record): every arm's UNTRAVELED row - the route
// bands put the gold back along the path itself.
vec3 junctionBase(int rec, vec2 p, vec4 hd, bool untrav) {
  int n = int(hd.z + 0.5);
  vec2 e = p - hd.xy;
  if (n == 0) {
    // AXIS record: (chain, strip row, texels per world, offset), then
    // (arc0, axis x, axis y, ctrl0) - the point's axis projection.
    vec4 hx = jAt(rec + 2);
    vec4 ax = jAt(rec + 3);
    return stripAt(int(hx.y + 0.5), (dot(e, ax.yz) + hx.w) * hx.z);
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
  int abB = rec + 2 + ib * stride;
  // Probe views (uKBase.z 3 / 4): one bracketing arm's material alone.
  bool onlyA = ia == ib || (uKBase.z > 2.5 && uKBase.z < 3.5);
  bool onlyB = !onlyA && uKBase.z > 3.5 && uKBase.z < 4.5;
  // The blend weight does not depend on the materials: compute it first,
  // so a pixel inside one arm's footprint (t 0 or 1 - most of a web)
  // evaluates that arm alone (identical result: mix at 0 / 1 is exact).
  float t = 0.0;
  if (!onlyA && !onlyB) {
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
    t = hi > lo ? (relA - lo) / (hi - lo) : (relA < span * 0.5 ? 0.0 : 1.0);
    t = clamp(t, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    if (t <= 0.0) onlyA = true;
    else if (t >= 1.0) onlyB = true;
  }
  vec3 cA = vec3(0.0);
  vec3 cB = vec3(0.0);
  if (!onlyB) {
    cA = armPaint(abA, profArc(abA, relA < HALF_PI ? rho * cos(relA) : 0.0), false, untrav);
    if (onlyA) return cA;
  }
  cB = armPaint(abB, profArc(abB, relB < HALF_PI ? rho * cos(relB) : 0.0), false, untrav);
  if (onlyB) return cB;
  return mix(cA, cB, t);
}

// The junction pass's color at p (pxW: world units per pixel; strip: the
// fragment belongs to a cover strip): the base field (a routed record's
// untraveled rows, unless J1.z marks it fully traveled - K127: then the
// composed rows, as before K81; K169: J1.z in (0, 1) is a web fading in, the
// two bases blended by it), then each K81 route band through this
// junction composed over it, oldest first (a revisit's newer pass wins
// where two cross). A band pixel takes its nearest point on the band's
// centerline polyline (and that point's tau). In a web the band edge is a
// one-pixel ramp CENTERED on the thread half-width, like a ribbon's MSAA
// edge, so the band is the thread's width. On a cover strip the band stays
// solid ROUTE_BAND_PAD pixels past the half-width before its ramp: the
// strip's own edge is the ribbon's MSAA edge (4x samples sit within 0.4 px
// of the pixel center, where this runs), and the pad keeps the untraveled
// material out of it. The probe views (uKBase.z 3 / 4) show the base alone.
vec3 junctionField(int rec, vec2 p, float pxW, vec4 j1, bool strip) {
  vec4 hd = jAt(rec);
  int nr = int(j1.w + 0.5);
  bool routed = nr > 0 && hd.z > 0.5;
  float fz = routed ? j1.z : 0.0;
  vec3 c = junctionBase(rec, p, hd, routed && fz < 0.5);
  if (routed && fz > 0.0 && fz < 1.0) {
    // K169: a web fading in blends its two bases (c is the side below 0.5).
    vec3 o = junctionBase(rec, p, hd, fz >= 0.5);
    c = fz < 0.5 ? mix(c, o, fz) : mix(o, c, fz);
  }
  if (!routed || (uKBase.z > 2.5 && uKBase.z < 4.5)) return c;
  int base = int(hd.w + 0.5);
  int stride = 2 + int(uJParams.y + 0.5);
  float reach = uJParams.x + (strip ? ${(ROUTE_BAND_PAD + 1).toFixed(3)} : 0.5) * pxW;
  for (int r = 0; r < ${MAX_ROUTES}; r++) {
    if (r >= nr) break;
    vec4 r0 = jAt(base);
    int nv = int(r0.x + 0.5);
    float best = 1e20;
    float tau = 0.0;
    vec4 q0 = jAt(base + 1);
    for (int k = 0; k < ${MAX_ROUTE_VERTS - 1}; k++) {
      if (k + 1 >= nv) break;
      vec4 q1 = jAt(base + 2 + k);
      vec2 d = q1.xy - q0.xy;
      vec2 w = p - q0.xy;
      float l2 = dot(d, d);
      float u = l2 > 1e-12 ? clamp(dot(w, d) / l2, 0.0, 1.0) : 0.0;
      vec2 off = w - d * u;
      float dd = dot(off, off);
      if (dd < best) {
        best = dd;
        tau = mix(q0.z, q1.z, u);
      }
      q0 = q1;
    }
    float cov = clamp((reach - sqrt(best)) / pxW, 0.0, 1.0);
    if (cov > 0.0) {
      vec3 bm = armPaint(rec + 2 + int(r0.z + 0.5) * stride, -tau, true, false);
      if (r0.w > -0.5) {
        bm = mix(
          bm,
          armPaint(rec + 2 + int(r0.w + 0.5) * stride, tau, true, false),
          smoothstep(-r0.y, r0.y, tau)
        );
      }
      c = mix(c, bm, cov);
    }
    base += 1 + nv;
  }
  return c;
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
in float aLook;
in float aFlank;
in vec4 aMaskId;

out vec2 vPos;
flat out float vRec;
out float vLook;
out float vFlank;
flat out vec4 vMaskId;
out vec4 vColor;
${MESH_UNIFORMS}
void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition;
  vRec = aRec;
  vLook = aLook;
  vFlank = aFlank;
  vMaskId = aMaskId;
  vColor = uColor * uWorldColorAlpha;
}
`;

// The record's gate texel J1 (rec + 1): invisible until every arm is
// revealed, then the latest-ignited arm's FX solidity (knotFanAlpha). The
// gap mask (fan mode: no window, header tangent) scales the premultiplied
// output; pxW comes from fwidth() HERE, in uniform control flow.
export const JUNCTION_FRAG = /* glsl */ `#version 300 es
${FIELD_GLSL}
in vec2 vPos;
flat in float vRec;
in float vLook;
in float vFlank;
flat in vec4 vMaskId;
in vec4 vColor;

out vec4 finalColor;
${GAP_FRAG_LIB_FAN}
void main(void) {
  vec2 gfw = fwidth(vPos);
  float pxW = max(max(gfw.x, gfw.y), 1e-5);
  int rec = int(vRec + 0.5);
  // A cover strip's aRec carries STRIP_REC_TAG.
  bool strip = fract(vRec) > ${(STRIP_REC_TAG / 2).toFixed(3)};
  vec4 j1 = jAt(rec + 1);
  float aM = knotFanAlpha(j1);
  // K797b/K798 THREAD LOOK for fillets: aLook is the across coordinate
  // on cover strips (0..1) and the apex-to-rim fraction on fans (0..1),
  // so one edge band follows ribbon edges, fan rims, wedge flanks and
  // free-end caps. During a border-at-a-time intro a junction keeps its
  // fill back until its own gate has settled (edges), or until the
  // whole intro ends (edgesAll, uKLook.z = 0).
  float lookCoord = strip ? abs(2.0 * vLook - 1.0) : vLook;
  float lookFw = min(max(fwidth(vLook) * 3.0, 0.02), 0.38);
  float lookEdge = smoothstep(0.62, 0.62 + lookFw, lookCoord);
  // K815: a wedge fan's outline is its perimeter - the rim arc AND the
  // two flanks (aFlank +1/-1 on the flanks, 0 on the arc): the border
  // look draws max(rim band, flank band), so a junction reads as
  // thread edge -> fillet corner -> thread edge with a hollow middle.
  // Discs and caps (aFlank 2) keep the rim band only; a seal disc
  // (aFlank 3) draws nothing: the wedges around it carry the outline,
  // and its ring only stacked a second arc inside theirs.
  float flankEdge = 0.0;
  if (!strip && vFlank < 1.5) {
    float flankFw = min(max(fwidth(vFlank) * 3.0, 0.02), 0.38);
    flankEdge = smoothstep(0.62, 0.62 + flankFw, abs(vFlank));
  }
  float fanEdge = strip ? lookEdge : max(lookEdge, flankEdge);
  if (!strip && vFlank > 2.5) fanEdge = 0.0;
  bool lookIntro = uKLook.y > 0.5 && uKLook.z > 0.5;
  float lookA = 1.0;
  if (uKLook.x > 0.5 && uKLook.x < 1.5) lookA = fanEdge;
  else if (lookIntro) {
    float fillOn = uKLook.y < 1.5 ? (aM >= 0.999 ? 1.0 : 0.0) : 0.0;
    lookA = mix(fillOn, 1.0, fanEdge);
  }
  if (aM <= 0.002) discard;
  vec3 rgb = junctionField(rec, vPos, pxW, j1, strip);
  if (uKLook.x > 0.5 || lookIntro) {
    vec3 stroke = mix(rgb * 0.30, vec3(0.09, 0.085, 0.08), 0.5);
    rgb = uKLook.x > 0.5 && uKLook.x < 1.5
      ? stroke
      : mix(rgb, stroke, lookEdge * 0.9);
  }
  float gk = gapKeepAt(pxW, vPos, -1.0, vec2(0.0), vMaskId);
  if (gk < 1.0 && gapProbe()) {
    rgb = mix(rgb, vec3(1.0, 0.0, 0.85), (1.0 - gk) * 0.75);
    gk = 1.0;
  }
  if (gk * lookA <= 0.002) discard;
  finalColor = vec4(rgb, 1.0) * vColor * (aM * gk * lookA);
}
`;

// K268 stage 2 (K275): the thread reveal's fan program. The arm strips
// carry the thread's visibility as premultiplied alpha there
// (arm_strip.ts withExploreStrip), so the field reads them premultiplied
// (stripAtP) and blends premultiplied: armPaint, junctionBase and
// junctionField return vec4, the angular blend, the K169 web fade and the
// K81 band mixes included. A web then fades with its arms and a free-tip
// cap with its thread at the tip; over solid arms it is master's color.
// The last three edits give the fans the shaped crossing cut (K268 stage 2,
// explore_glsl.ts exploreGapEdits): a cut fades with its over thread.
// Each [anchor, replacement] must occur exactly once in JUNCTION_FRAG.
export const FIELD_EXPLORE_EDITS: ReadonlyArray<readonly [string, string]> = [
  ["vec4 jAt(int i) {", STRIP_LOOKUP_P_GLSL + "vec4 jAt(int i) {"],
  [
    "vec3 armPaint(int ab, float s, bool band, bool untrav) {",
    "vec4 armPaint(int ab, float s, bool band, bool untrav) {",
  ],
  [
    "  return stripAt(int(h.z + 0.5) + (untrav ? 1 : 0), sc * h.w);",
    "  return stripAtP(int(h.z + 0.5) + (untrav ? 1 : 0), sc * h.w);",
  ],
  [
    "vec3 junctionBase(int rec, vec2 p, vec4 hd, bool untrav) {",
    "vec4 junctionBase(int rec, vec2 p, vec4 hd, bool untrav) {",
  ],
  [
    "    return stripAt(int(hx.y + 0.5), (dot(e, ax.yz) + hx.w) * hx.z);",
    "    return stripAtP(int(hx.y + 0.5), (dot(e, ax.yz) + hx.w) * hx.z);",
  ],
  ["  vec3 cA = vec3(0.0);\n  vec3 cB = vec3(0.0);", "  vec4 cA = vec4(0.0);\n  vec4 cB = vec4(0.0);"],
  [
    "vec3 junctionField(int rec, vec2 p, float pxW, vec4 j1, bool strip) {",
    "vec4 junctionField(int rec, vec2 p, float pxW, vec4 j1, bool strip) {",
  ],
  [
    "  vec3 c = junctionBase(rec, p, hd, routed && fz < 0.5);",
    "  vec4 c = junctionBase(rec, p, hd, routed && fz < 0.5);",
  ],
  [
    "    vec3 o = junctionBase(rec, p, hd, fz >= 0.5);",
    "    vec4 o = junctionBase(rec, p, hd, fz >= 0.5);",
  ],
  ["      vec3 bm = armPaint(", "      vec4 bm = armPaint("],
  [
    "  vec3 rgb = junctionField(rec, vPos, pxW, j1, strip);",
    "  vec4 exC = junctionField(rec, vPos, pxW, j1, strip);",
  ],
  [
    "  if (uKLook.x > 0.5 || lookIntro) {\n    vec3 stroke = mix(rgb * 0.30, vec3(0.09, 0.085, 0.08), 0.5);\n    rgb = uKLook.x > 0.5 && uKLook.x < 1.5\n      ? stroke\n      : mix(rgb, stroke, lookEdge * 0.9);\n  }",
    "  if (uKLook.x > 0.5 || lookIntro) {\n    vec3 base = exC.a > 0.0001 ? exC.rgb / exC.a : vec3(0.0);\n    vec3 stroke = mix(base * 0.30, vec3(0.09, 0.085, 0.08), 0.5);\n    base = uKLook.x > 0.5 && uKLook.x < 1.5\n      ? stroke\n      : mix(base, stroke, lookEdge * 0.9);\n    exC.rgb = base * exC.a;\n  }",
  ],
  [
    "    rgb = mix(rgb, vec3(1.0, 0.0, 0.85), (1.0 - gk) * 0.75);",
    "    exC.rgb = mix(exC.rgb, vec3(1.0, 0.0, 0.85) * exC.a, (1.0 - gk) * 0.75);",
  ],
  [
    "  finalColor = vec4(rgb, 1.0) * vColor * (aM * gk * lookA);",
    "  if (exC.a * lookA <= 0.002) discard;\n  finalColor = exC * vColor * (aM * gk * lookA);",
  ],
  ...exploreGapEdits(true, "uniform vec4 uKExplore;\n"),
];

export function withExploreField(frag: string): string {
  let s = frag;
  for (const [anchor, to] of FIELD_EXPLORE_EDITS) {
    const i = s.indexOf(anchor);
    if (i < 0 || s.indexOf(anchor, i + 1) >= 0) {
      throw new Error(`field explore variant: anchor not found exactly once: ${anchor.slice(0, 48)}`);
    }
    s = s.slice(0, i) + to + s.slice(i + anchor.length);
  }
  return s;
}

type FieldShader = Shader & { texture: Texture };
let JUNCTION_SHADER: FieldShader | null = null;
let JUNCTION_SHADER_EX: FieldShader | null = null;
// The current scene's gap-slot table (bindFieldGap) - the shader is built
// lazily, after the renderer bound it.
let GAP_TEX: Texture | null = null;

// K307 WARM-UP: the fan programs, for the warm-up registry
// (program_registry.ts). GlProgram.from caches by source, so this is the
// very program the fans draw with.
let JUNCTION_EXPLORE_FRAG: string | null = null;
export function junctionProgram(explore: boolean): GlProgram {
  if (!explore) {
    return GlProgram.from({ vertex: JUNCTION_VERT, fragment: JUNCTION_FRAG, name: "junction-field" });
  }
  JUNCTION_EXPLORE_FRAG ??= withExploreField(JUNCTION_FRAG);
  return GlProgram.from({
    vertex: JUNCTION_VERT,
    fragment: JUNCTION_EXPLORE_FRAG,
    name: "junction-field-explore",
  });
}

function makeShader(glProgram: GlProgram): FieldShader {
  const sh = new Shader({
    glProgram,
    resources: {
      uJData: recordData().source,
      uGapData: (GAP_TEX ?? defaultGapTexture()).source,
      uSamp: sampSource(),
      fabricUniforms: fabricUniforms(),
      fieldUniforms: fieldUniforms(),
      // The arms' composed materials (arm_strip.ts), and the clocks the
      // joint gate reads.
      uStrip: stripTexture().source,
      knotUniforms: knotUniforms(),
    },
  }) as FieldShader;
  sh.texture = Texture.WHITE;
  return sh;
}

export function junctionShader(): FieldShader {
  if (!JUNCTION_SHADER) {
    JUNCTION_SHADER = makeShader(junctionProgram(false));
  }
  return JUNCTION_SHADER;
}

// The thread reveal's fan program (K268 stage 2), built the first time the
// mode turns on; setExplore swaps the fan meshes onto it.
export function junctionShaderExplore(): FieldShader {
  if (!JUNCTION_SHADER_EX) {
    JUNCTION_SHADER_EX = makeShader(junctionProgram(true));
  }
  return JUNCTION_SHADER_EX;
}

// Point the field shader at a scene's gap-slot table (see bindGap in
// ribbon/ribbon_shader.ts; a shader built later binds the table current
// then).
export function bindFieldGap(tex: Texture): void {
  GAP_TEX = tex;
  const samp = sampSource();
  for (const sh of [JUNCTION_SHADER, JUNCTION_SHADER_EX]) {
    if (sh && sh.resources.uGapData !== tex.source) {
      sh.resources.uGapData = tex.source;
    }
    if (sh && sh.resources.uSamp !== samp) sh.resources.uSamp = samp;
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
