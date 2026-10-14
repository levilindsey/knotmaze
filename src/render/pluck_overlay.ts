// RENDER-ONLY PLUCKS: the "time-exposure string" overlay. A tap or an auto
// pluck never touches the physics - no grab, no drag, no wake. The plucked
// thread's UNIT (fabric: the walk run under the tap, capped at +-6 lobes;
// knot: the tapped lobe +-2) is drawn over the finished weave as one strip
// mesh whose fragment shader computes the vibrating string's exact
// time-averaged coverage (render/pluck_model.ts), plus a faint strobe ghost
// for speed. Nothing else is re-solved: the overlay never calls the
// renderer's update(), and its per-frame cost is one small buffer write.
//
// THE FOUR WEAVE RULES (why crossings stay pixel-static):
//  1. The overlay layer sits ABOVE every ribbon, erase, fillet and fill.
//  2. Footprints are never modified. The plucked thread's BASE ribbon is
//     narrowed only outside every node footprint, and at most to the width
//     the overlay's opaque core covers for the whole ring (collapse mask,
//     rounded, fixed at pluck start - amplitude only decreases). Over-fill windows copy
//     base vertices only inside footprints, so they never see it.
//  3. Under-gaps: per-station alpha is the renderer's underGapVisibility -
//     the overlay vanishes where its thread dives, exactly like the yarn.
//  4. Under-node partner clip: near a node where the plucked thread goes
//     UNDER, overlay pixels inside the partner's casing band are discarded,
//     so lateral blur tucks under the partner instead of painting over it.
//     (At over-nodes the overlay is SUPPOSED to draw over the partner.)
// Soft nodes keep the overlay's core opaque inside footprints (amplitude
// under 0.9 h there), where the static thread is still drawn beneath.
//
// REDUCED MOTION (K104 goal 3): a pluck started under the Motion setting's
// reduced mode is STILL - the same strip at zero amplitude (exactly the
// thread's own anti-aliased band), drawn in WHITE at a per-station alpha
// that brightens the unit and fades on the voice's clock (pluck_model's
// cueWeight; writeStill). Nothing moves, so nothing is collapsed and no
// neighbor is measured. Its crossing gaps are not rules 3 and 4: it draws
// with its own program ("pluck-still"), which hides exactly what the
// ribbon beneath hides - G1's gapKeepAt over the ribbon's own slots, at
// the band's turn and tangent - so the brightening never reaches into a
// partner's casing (the straight clip line left a sliver past h + gap,
// ticks where the partner curves, and a fade that differed from the
// mask's). The sound is main.ts's and does not change.

import {
  Buffer,
  BufferUsage,
  Container,
  Mesh,
  MeshGeometry,
  Shader,
  Texture,
  UniformGroup,
} from "pixi.js";
import type { SplineSamples } from "../geometry/spline_generator";
import { GAP_FRAG_LIB, GAP_SLOTS, defaultGapTexture } from "./gap_mask";
import { KNOT_UNIFORMS_GLSL, PAINT_CONST_GLSL } from "./paint_glsl";
import { knotUniforms } from "./paint_model";
import {
  ATTACK_MIX,
  CUE_KILL,
  CUE_RAMP,
  CUE_WHITE,
  cueStrength,
  cueWeight,
  GHOST_HZ,
  GHOST_JITTER,
  GHOST_TINT,
  KILL_PX,
  NODE_SLOPE,
  ONSET_STAGGER,
  CLEAR_OVERLAP,
  WHOLE_AMP,
  WHOLE_NODE_ZONE,
  clampBeta,
  drawnSwing,
  envelope,
  gapTurn,
  ghostShape,
  glowCue,
  nodeCap,
  peakShape,
  pinchCap,
  pluckShows,
  SHOW_DT,
  rescaleSympathetic,
  roomAt,
  roundCollapse,
  roundTau,
  segmentLobes,
  slopeLimitUniform,
  softMin,
  sympatheticAmplitude,
  tapAmplitude,
  throughStation,
  unionGapIds,
  unitShift,
  visualTau,
  wholeAmplitude,
  wholeRoom,
  wholeShape,
} from "./pluck_model";
import type { PluckCrossings, PluckGlow } from "./pluck_model";

// How the whole-segment term W meets the rest of the weave (K104; the pick
// is Levi's decision): "overlap" = W displaces the unit, running into a
// neighbor's edge by at most WHOLE_OVERLAP h; "free" = no neighbor cap;
// "cue" = no W displacement, the unit brightens instead.
export type WholeMode = "overlap" | "free" | "cue";

// How W meets the crossings INSIDE its unit (K104; Levi's decision; the
// unit's own end nodes and hide-zone nodes are W's frets in every mode):
// "through" = the soft-node cap holds only the lobe term there and W adds
// on top, so the unit's halo carries across its crossings and grows with
// pluckSize; "ride" = the soft node caps the sum - fabric's short lobes then
// keep W near 1 h at any pluckSize (the node cap never opens); "pinch" = W
// itself pinches to wholePinch h at them. (The pluckCrossings param, K180.)
export type WholeNodes = PluckCrossings;
const WHOLE_PINCH = 0.3; // "pinch": W's core at an interior node, x h.

// A node the plucked thread passes (see the model's NODES AND LOBES).
export interface PluckNode {
  arc: number; // Arc along the chain, in [0, total].
  footNeg: number; // Static-footprint half-length toward -arc...
  footPos: number; // ...and toward +arc.
  // Arc radius around the node where the overlay HIDES and the static
  // render shows as-is (junction webs, marker gaps); 0 = none.
  hide: number;
  under: boolean; // The plucked thread dives UNDER a partner here.
  // The partner's centerline near the node, as a line [x, y, dx, dy] (unit
  // direction) - the under-node clip (rule 4). null at over / other nodes.
  line: [number, number, number, number] | null;
  key: number; // Stable identity on the chain (re-plucks merge by it).
}

// What the overlay needs from the ribbon renderer.
export interface PluckHost {
  halfWidth(): number;
  // Partner band the under-node clip hides: partner half-width + gap +
  // G1's CUT_BIAS (the casing G1 hides the under ribbon in).
  casing(): number;
  // The chain's ribbon gap-slot ids (G1): sample-major, GAP_SLOTS lanes per
  // sample (-1 = none), as of the last update(); null = none yet. Read by
  // still plucks, never written.
  gapIds(chain: number): Float32Array | null;
  samples(chain: number): SplineSamples | null;
  allSamples(): ReadonlyArray<SplineSamples | null>;
  closed(chain: number): boolean;
  nodes(chain: number): PluckNode[];
  sampleAt(
    samples: SplineSamples,
    arc: number,
    out: Float32Array,
    offset: number
  ): void;
  // Rule 3: 0 inside this chain's under-gaps, ramping to 1 past them.
  visibility(chain: number, arc: number): number;
  // The thread's composed color at an arc (section color + live gameplay
  // paint in fabric mode, the chain tint in knot mode), 0..1 RGB.
  color(chain: number, arc: number, out: Float32Array): void;
  // True when this frame's colors are static (knot mode): computed once
  // per layout instead of every frame.
  staticColors(): boolean;
  viewScale(): number; // CSS px per world unit.
  // A chain mid-reveal / mid-FX (plucks there are sound-only).
  hot(chain: number): boolean;
  // Install (or clear) a chain's base-ribbon width multiplier; the host
  // re-extrudes that one chain at once and composes it in update().
  setCollapse(chain: number, mul: Float32Array | null): void;
  geomRev(): number;
  baseSampleCount(chain: number): number;
}

export interface PluckRequest {
  chain: number;
  arc: number; // Where along the chain it was plucked.
  side: number; // +1 = the left normal (-ty, tx) side, -1 the other.
  gain: number; // Amplitude multiplier (tap 1; auto 0.75-1.25; drag 0.6-1.4).
  freq: number; // The segment's pitch: the decay clock follows the voice.
  reach: number; // Lobes kept each side of the plucked one.
  span?: [number, number] | null; // Unwrapped arc span (the walk run).
  beta?: number; // Pluck position in its lobe (default: from `arc`).
  delay?: number; // Seconds before the visual starts (audio latency).
  // An arc the unit must not contain (a particle the user is holding):
  // when it does, the pluck stays sound-only.
  avoidArc?: number;
}

// Station budget per pluck strip (node stations are duplicated at lobe
// boundaries so each lobe carries its own clip attributes).
const MAX_STATIONS = 480;
const STATION_DS = 0.07; // Target station spacing, world arc.
const MIN_LOBE_STATIONS = 8;
const LOBE_MIN_LEN = 0.05; // Shorter node pairs are not lobes.
const POOL_MAX = 8; // Simultaneous live plucks; the oldest is evicted.
const EVICT_TIME = 0.05; // Seconds an evicted pluck takes to damp out.
const STRIP_PAD = 0.04; // World margin past the swept edge (AA ramp).
const COLLAPSE_PAD = 0.02; // Base kept this far inside the overlay's core.
// The base collapse RAMPS IN over this much arc past a footprint, never
// stepping: a one-sample step from the intact thread to its narrowed width
// exposed the time exposure's translucent edge along a ragged line. Within
// the ramp the swing stays under NODE_CORE h, so the (wider) base never
// shows through a translucent center.
const COLLAPSE_RAMP = 0.3;
// The collapse's depth profile is ROUNDED (pluck_model.ts roundCollapse):
// the narrowed base edge bends no tighter than this radius, x h. Its raw
// profile met its limits in min()s, and where two limits (a footprint
// ramp, a tight bend's ramp, a gap fade) closed in on a short window the
// edge dipped to a V that read through the translucent fringe as a sharp
// wedge cut into the thread (K77). 1 h until Levi found it "still a bit
// too acute" (K104, 2026-10-13); 1.5 h since. Same-state A/B on K77's 14
// sites (.claude/probes/K104/collapse/): worst second difference
// -0.98 -> -0.66 K, keeping 88% of 1 h's integrated thinning; 1.25 was
// the timid step, 1.75 the next one if 1.5 still reads acute.
const COLLAPSE_ROUND = 1.5;
const HIDE_RAMP = 0.1; // Arc over which a hide zone fades back in.
// Ghost flash guard (WCAG 2.3.1): the ghost's on-screen area is capped.
const GHOST_AREA_PX = 15000;
// Under-node clip reach along the partner (world).
const CLIP_REACH = 1.5;
// Clearance measurement: neighbor search margin (world, past the swing).
const CLEAR_MARGIN = 0.6;
// Stations around a too-tight bend that keep the base intact (and so the
// swing under NODE_CORE h).
const TIGHT_K = 2;
// The concave-side swing cap may change by at most this much per unit of
// arc. The raw cap (0.9 x the local radius, minus the thread) follows a
// noisy curvature estimate, and at a tight loop it jumped 0.06 -> 0.52
// world within two stations; the envelope and the strip edge follow the
// cap, so every jump drew a radial crease through the blur and a ragged
// rim around the loop's eye. Limiting only ever LOWERS a cap, and the cap
// exists only to keep the strip from folding, so this is always safe.
const CAP_SLOPE = 1.0;
// W's neighbor room ("overlap") is measured every WHOLE_ROOM_DS of arc at
// pluck time and may change by at most WHOLE_ROOM_SLOPE per unit of arc, so
// a close neighbor dents the envelope gently instead of notching it.
const WHOLE_ROOM_DS = 0.15;
const WHOLE_ROOM_SLOPE = 0.3;

// In place, per lobe: v[i] = min over j of v[j] + slope * |arc[i] - arc[j]|
// (a two-pass running min; Infinity stays Infinity until a finite value
// spreads in).
function slopeLimit(
  v: Float32Array,
  arc: Float32Array,
  lobeOf: Int16Array,
  n: number,
  slope: number
): void {
  for (let i = 1; i < n; i++) {
    if (lobeOf[i] !== lobeOf[i - 1]) continue;
    const c = v[i - 1] + slope * Math.abs(arc[i] - arc[i - 1]);
    if (c < v[i]) v[i] = c;
  }
  for (let i = n - 2; i >= 0; i--) {
    if (lobeOf[i] !== lobeOf[i + 1]) continue;
    const c = v[i + 1] + slope * Math.abs(arc[i + 1] - arc[i]);
    if (c < v[i]) v[i] = c;
  }
}

const PLUCK_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aUV;
in vec2 aEnv;
in vec4 aAux;
in vec3 aCol;
in vec4 aClipA;
in vec4 aClipB;
in vec2 aClipF;

out float vLat;
out vec2 vEnv;
out vec4 vAux;
out vec3 vCol;
out vec2 vPos;
out vec4 vClipA;
out vec4 vClipB;
out vec2 vClipF;
out vec4 vColor;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vLat = aUV.x;
  vEnv = aEnv;
  vAux = aAux;
  vCol = aCol;
  vPos = aPosition;
  vClipA = aClipA;
  vClipB = aClipB;
  vClipF = aClipF;
  vColor = uColor * uWorldColorAlpha;
}
`;

// aUV.x = lateral offset from the REST centerline (world, linear across the
// strip); aEnv = the swept interval [lo, hi]; aAux = (attack double-image
// mix m, ghost offset, ghost alpha, visibility); aCol = the thread color.
// Output is premultiplied (pixi's normal blend). At zero amplitude the
// coverage is exactly an anti-aliased band - the plain thread.
const PLUCK_FRAG = /* glsl */ `#version 300 es
precision highp float;

in float vLat;
in vec2 vEnv;
in vec4 vAux;
in vec3 vCol;
in vec2 vPos;
in vec4 vClipA;
in vec4 vClipB;
in vec2 vClipF;
in vec4 vColor;

out vec4 finalColor;

// (half-width h, partner casing band, ghost tint, unused)
uniform vec4 uPluck;

const float PI = 3.141592653589793;

// Integral of the arcsine CDF on [lo, hi]: 0 below, r at hi, slope 1
// beyond. Differencing it box-filters the dwell density over the pixel.
float G(float y, float lo, float hi) {
  float r = 0.5 * (hi - lo);
  float c = 0.5 * (hi + lo);
  if (r < 1e-6) return max(0.0, y - c);
  float t = (y - c) / r;
  if (t <= -1.0) return 0.0;
  if (t >= 1.0) return r * t;
  return r * (0.5 * t + (t * asin(t) + sqrt(max(0.0, 1.0 - t * t))) / PI);
}

// Time-averaged coverage of a thread of half-width h whose centerline
// dwells on [lo, hi] with the arcsine density, over a pixel of width p.
float cover(float u, float h, float lo, float hi, float p) {
  float a = G(u + h + 0.5 * p, lo, hi) - G(u + h - 0.5 * p, lo, hi);
  float b = G(u - h + 0.5 * p, lo, hi) - G(u - h - 0.5 * p, lo, hi);
  return clamp((a - b) / p, 0.0, 1.0);
}

float band(float v, float h, float p) {
  return clamp((h - abs(v)) / p + 0.5, 0.0, 1.0);
}

// Rule 4: inside the partner's casing band near an UNDER node -> hidden.
// The partner is a straight line through the crossing, trusted only out
// to reach along it (it curves away beyond), fading over the last 0.2.
float clipAt(vec4 L, float reach, vec2 P, float px) {
  if (reach <= 0.0) return 1.0;
  vec2 d = P - L.xy;
  float along = abs(dot(d, L.zw));
  if (along > reach) return 1.0;
  float perp = abs(d.x * L.w - d.y * L.z);
  float k = clamp((perp - uPluck.y) / px + 0.5, 0.0, 1.0);
  return mix(k, 1.0, smoothstep(reach - 0.2, reach, along));
}

void main(void) {
  float h = uPluck.x;
  float p = max(length(vec2(dFdx(vLat), dFdy(vLat))), 1e-4);
  float lo = vEnv.x;
  float hi = vEnv.y;
  float m = vAux.x;
  float c = (1.0 - m) * cover(vLat, h, lo, hi, p)
          + 0.5 * m * (band(vLat - hi, h, p) + band(vLat - lo, h, p));
  float g = vAux.z * band(vLat - vAux.y, h, p);
  vec3 gc = mix(vCol, vec3(1.0), uPluck.z);
  vec3 rgb = gc * g + vCol * c * (1.0 - g);
  float a = g + c * (1.0 - g);
  float px = max(length(dFdx(vPos)), 1e-4);
  float k = clipAt(vClipA, vClipF.x, vPos, px) * clipAt(vClipB, vClipF.y, vPos, px);
  finalColor = vec4(rgb, a) * (vAux.w * k) * vColor;
}
`;

// Page-lifetime singletons (never destroyed: pixi's retained render state
// can reference them the frame after a rebuild - the PALETTE_CACHE lore).
let PLUCK_UNIFORMS: UniformGroup | null = null;
// Mesh.shader wants a TextureShader (a Shader carrying its texture); this
// one samples nothing, so it carries the WHITE placeholder.
type PluckShader = Shader & { texture: Texture };
let PLUCK_SHADER: PluckShader | null = null;
function pluckUniforms(): UniformGroup {
  if (!PLUCK_UNIFORMS) {
    PLUCK_UNIFORMS = new UniformGroup({
      uPluck: {
        value: new Float32Array([0.21, 0.4, GHOST_TINT, CLIP_REACH]),
        type: "vec4<f32>",
      },
    });
  }
  return PLUCK_UNIFORMS;
}
function pluckShader(): PluckShader {
  if (!PLUCK_SHADER) {
    const sh = Shader.from({
      gl: { vertex: PLUCK_VERT, fragment: PLUCK_FRAG, name: "pluck-blur" },
      resources: { pluckUniforms: pluckUniforms() },
    }) as PluckShader;
    sh.texture = Texture.WHITE;
    PLUCK_SHADER = sh;
  }
  return PLUCK_SHADER;
}

// REDUCED MOTION's program ("pluck-still"): the strip at zero swing is the
// thread's own band (the moving program's cover() at lo = hi = 0), white at
// aAux.w, and it hides exactly where the ribbon beneath hides: G1's
// gapKeepAt over the ribbon's own gap slots, read at the band's arc turn
// and tangent (aGap = turn, tx, ty) with the slot ids of the quad's stations
// (aGapId, flat like the ribbon's). No clip lines, no envelope, no color.
const PLUCK_STILL_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aUV;
in vec4 aAux;
in vec4 aGap;
in vec4 aGapId;

out float vLat;
out float vA;
out vec2 vPos;
out float vTurn;
out vec2 vTan;
flat out vec4 vMaskId;
out vec4 vColor;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vLat = aUV.x;
  vA = aAux.w;
  vPos = aPosition;
  vTurn = aGap.x;
  vTan = aGap.yz;
  vMaskId = aGapId;
  vColor = uColor * uWorldColorAlpha;
}
`;

const PLUCK_STILL_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${KNOT_UNIFORMS_GLSL}
${PAINT_CONST_GLSL}
in float vLat;
in float vA;
in vec2 vPos;
in float vTurn;
in vec2 vTan;
flat in vec4 vMaskId;
in vec4 vColor;

out vec4 finalColor;

// (half-width h, partner casing band, ghost tint, unused)
uniform vec4 uPluck;
${GAP_FRAG_LIB}
// The band [-h, h] box-filtered over a pixel of width p.
float bandCover(float u, float h, float p) {
  return clamp((min(u + 0.5 * p, h) - max(u - 0.5 * p, -h)) / p, 0.0, 1.0);
}

void main(void) {
  // Derivatives first, in uniform control flow (gap_mask.ts).
  vec2 gfw = fwidth(vPos);
  float pxW = max(max(gfw.x, gfw.y), 1e-5);
  float p = max(length(vec2(dFdx(vLat), dFdy(vLat))), 1e-4);
  float c = bandCover(vLat, uPluck.x, p) * vA;
  if (c <= 0.002) discard;
  vec3 rgb = vec3(1.0);
  float gk = gapKeepAt(pxW, vPos, vTurn, vTan, vMaskId);
  if (gk < 1.0 && gapProbe()) {
    rgb = mix(rgb, vec3(1.0, 0.0, 0.85), (1.0 - gk) * 0.75);
    gk = 1.0;
  }
  float a = c * gk;
  if (a <= 0.002) discard;
  finalColor = vec4(rgb, 1.0) * a * vColor;
}
`;

let PLUCK_STILL_SHADER: PluckShader | null = null;
// The current scene's gap-slot table (bindPluckGap): the still program is
// built lazily, maybe before the renderer binds one.
let STILL_GAP_TEX: Texture | null = null;
function pluckStillShader(): PluckShader {
  if (!PLUCK_STILL_SHADER) {
    const sh = Shader.from({
      gl: { vertex: PLUCK_STILL_VERT, fragment: PLUCK_STILL_FRAG, name: "pluck-still" },
      resources: {
        uGapData: (STILL_GAP_TEX ?? defaultGapTexture()).source,
        knotUniforms: knotUniforms(),
        pluckUniforms: pluckUniforms(),
      },
    }) as PluckShader;
    sh.texture = Texture.WHITE;
    PLUCK_STILL_SHADER = sh;
  }
  return PLUCK_STILL_SHADER;
}

// Point the still program at a scene's gap-slot table (ribbon_renderer's
// bindGap, beside the section and junction shaders).
export function bindPluckGap(tex: Texture): void {
  STILL_GAP_TEX = tex;
  const sh = PLUCK_STILL_SHADER;
  if (sh && sh.resources.uGapData !== tex.source) sh.resources.uGapData = tex.source;
}

function vertexBuffer(data: Float32Array, label: string): Buffer {
  return new Buffer({
    data,
    label,
    usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
  });
}

// One pluck's strip: two vertices per station, quads between consecutive
// stations of the SAME lobe (rebuilt per layout - lobes need not be laid
// out adjacent, e.g. after a re-pluck merge; unused index slots are zero,
// i.e. degenerate). Every upload sends the WHOLE buffer (pixi remembers
// partial sizes - the PARTIAL BUFFER UPLOADS lore).
class PluckBlurMesh {
  readonly mesh: Mesh;
  readonly indices = new Uint32Array((MAX_STATIONS - 1) * 6);
  readonly pos = new Float32Array(MAX_STATIONS * 4);
  readonly uv = new Float32Array(MAX_STATIONS * 4);
  readonly env = new Float32Array(MAX_STATIONS * 4);
  readonly aux = new Float32Array(MAX_STATIONS * 8);
  readonly col = new Float32Array(MAX_STATIONS * 6);
  readonly clipA = new Float32Array(MAX_STATIONS * 8);
  readonly clipB = new Float32Array(MAX_STATIONS * 8);
  readonly clipF = new Float32Array(MAX_STATIONS * 4);
  // Still plucks only ("pluck-still"): the station's arc turn and tangent
  // (turn, tx, ty, 0) and the gap-slot ids its quads read (-1 = none).
  readonly gap = new Float32Array(MAX_STATIONS * 8);
  readonly gapId = new Float32Array(MAX_STATIONS * 8).fill(-1);
  // Per-station layout state (CPU only).
  readonly lobeOf = new Int16Array(MAX_STATIONS);
  readonly xOf = new Float32Array(MAX_STATIONS);
  readonly arcOf = new Float32Array(MAX_STATIONS);
  readonly fOf = new Float32Array(MAX_STATIONS); // Soft-node cap factor.
  readonly visOf = new Float32Array(MAX_STATIONS);
  readonly dsOf = new Float32Array(MAX_STATIONS); // Arc share (ghost area).
  // Concave-side swing caps (+normal / -normal side; Infinity = free).
  readonly capLOf = new Float32Array(MAX_STATIONS);
  readonly capROf = new Float32Array(MAX_STATIONS);
  // The strip's narrower (concave-side) half-extent per station: where it
  // is under the thread's own half-width the base must stay intact.
  readonly wInOf = new Float32Array(MAX_STATIONS);
  readonly pkOf = new Float32Array(MAX_STATIONS); // Capped peak swing.
  // The whole-segment term per station, x W0: its displacement share after
  // every cap (the frame's W swing is aW x wOf; 0 in cue mode) and its bare
  // shape.
  readonly wOf = new Float32Array(MAX_STATIONS);
  readonly wsOf = new Float32Array(MAX_STATIONS);
  readonly cueOf = new Float32Array(MAX_STATIONS); // A still pluck's cueWeight.
  readonly tightOf = new Uint8Array(MAX_STATIONS); // Bend tighter than the strip.
  readonly tightAllow = new Float32Array(MAX_STATIONS); // Collapse allowance.
  used = 0;

  constructor() {
    const geometry = new MeshGeometry({
      positions: this.pos,
      uvs: this.uv,
      indices: this.indices,
    });
    const add = (name: string, data: Float32Array, n: 2 | 3 | 4): void => {
      geometry.addAttribute(name, {
        buffer: vertexBuffer(data, "attribute-" + name),
        format: n === 2 ? "float32x2" : n === 3 ? "float32x3" : "float32x4",
        stride: n * 4,
        offset: 0,
      });
    };
    add("aEnv", this.env, 2);
    add("aAux", this.aux, 4);
    add("aCol", this.col, 3);
    add("aClipA", this.clipA, 4);
    add("aClipB", this.clipB, 4);
    add("aClipF", this.clipF, 2);
    add("aGap", this.gap, 4);
    add("aGapId", this.gapId, 4);
    this.mesh = new Mesh({ geometry, shader: pluckShader(), texture: Texture.WHITE });
    this.mesh.visible = false;
  }

  upload(names: string[]): void {
    const g = this.mesh.geometry;
    for (const n of names) {
      const b = g.getBuffer(n);
      b.update(b.data.byteLength);
    }
  }

  // Quads between consecutive stations of one lobe only.
  writeQuads(): void {
    const ix = this.indices;
    ix.fill(0);
    let o = 0;
    for (let i = 0; i + 1 < this.used; i++) {
      if (this.lobeOf[i] !== this.lobeOf[i + 1]) continue;
      const a = i * 2;
      ix[o++] = a;
      ix[o++] = a + 1;
      ix[o++] = a + 2;
      ix[o++] = a + 1;
      ix[o++] = a + 3;
      ix[o++] = a + 2;
    }
    const b = this.mesh.geometry.getIndex();
    b.update(b.data.byteLength);
  }
}

interface Lobe {
  keyA: number; // Node keys (-1: a pseudo lobe on a node-less loop).
  keyB: number;
  s0: number; // Last resolved arcs (unwrapped, s0 < s1).
  s1: number;
  k: number; // Offset from the plucked lobe.
  A0: number; // Initial amplitude (world), clearance-capped.
  beta: number;
  attack: boolean; // Shows the parallelogram attack (the plucked lobe).
  onset: number; // Seconds after the pluck's clock starts.
  phase: number; // Ghost phase offset (lobes ring independently).
  footA: number;
  footB: number;
  hideA: number;
  hideB: number;
  lineA: [number, number, number, number] | null;
  lineB: [number, number, number, number] | null;
  dead: boolean;
  drawn: boolean; // Got stations in the last layout (only drawn lobes collapse).
  st0: number; // Its first station index in the strip...
  segs: number; // ...and its station intervals.
  // The VIBRATING span (unwrapped arcs): the lobe minus its end nodes'
  // hide zones - a junction core or marker gap hides the overlay, so the
  // string's effective fret sits where its hide ramp ends. The shape
  // (triangle, lens, ghost) is laid over this span, not node to node.
  e0: number;
  e1: number;
  // UNIT COORDINATE: arc + shift is continuous over the whole unit, across
  // a closed chain's seam (layout re-resolves s0 into [0, total); the model's
  // unitShift). The whole-segment term is laid out over it.
  shift: number;
  // W's neighbor room ("overlap"), sampled uniformly node to node at pluck
  // time; Infinity = unmeasured (near a node). null = uncapped.
  room: Float32Array | null;
}

// The vibrating span of a node-to-node lobe [s0, s1] (see Lobe.e0/e1).
function vibratingSpan(
  s0: number,
  s1: number,
  hideA: number,
  hideB: number
): [number, number] {
  const e0 = s0 + (hideA > 0 ? hideA + HIDE_RAMP : 0);
  const e1 = s1 - (hideB > 0 ? hideB + HIDE_RAMP : 0);
  return [e0, Math.max(e0, e1)];
}

interface ActivePluck {
  id: number;
  chain: number;
  t: number;
  tau: number;
  tauR: number;
  side: number;
  freq: number;
  lobes: Lobe[];
  mesh: PluckBlurMesh;
  evicting: boolean;
  fade: number;
  layoutRev: number;
  needsLayout: boolean;
  mask: Float32Array | null; // This pluck's base collapse (per base sample).
  ghostArea: number; // Last frame's on-screen ghost area (px^2).
  amp: Float64Array; // Per-lobe scratch: this frame's amplitude...
  qv: Float64Array; // ...and overtone weight.
  // The whole-segment term: initial amplitude (world; 0 = none), its ghost
  // phase, and the unit's vibrating extent in unit coordinates (per layout).
  W0: number;
  wPhase: number;
  uE0: number;
  uE1: number;
  // Reduced motion: no displacement, the unit brightens (writeStill) at
  // cueGain (the request's gain, capped) x its brightest station's weight.
  still: boolean;
  cueGain: number;
  cuePeak: number;
  // K180, resolved at pluck time from the glow option: how W meets the
  // weave for this pluck ("cue" under glow "instead"), whether the moving
  // pluck carries the cue, and (glow "fallback" only, else -1) its drawn
  // peak in world units as K104's census measures it.
  wMode: WholeMode;
  cue: boolean;
  peakEst: number;
}

const smooth01 = (x: number): number => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

export class PluckOverlay {
  readonly layer = new Container();
  // Live tuning (main.ts syncs these every tick, like cuspRadius).
  size = 1; // pluckSize: visual amplitude multiplier (0 = sound only).
  ghost = 0.35; // pluckGhost: strobe-ghost strength.
  sustain = 0.5; // The voice's sustain (decay clock).
  // Reduced motion: set each frame from the Motion setting (ui/motion.ts).
  // Plucks started under it are still (the unit brightens, nothing moves);
  // plucks already ringing when it turns on keep moving, without their
  // ghost and attack.
  reducedMotion = false;
  // The collapse's edge radius, x h (COLLAPSE_ROUND; 0 = the raw profile,
  // for same-state A/Bs - set it, then flag every live pluck needsLayout).
  collapseRound = COLLAPSE_ROUND;
  // The whole-segment term (K104): its amount (x pluckSize x gain x h; 0 =
  // the lobes alone, exactly the pre-K104 pluck), how it meets neighbors
  // (WholeMode; applies to plucks started after a change - "overlap"
  // measures its room at pluck time), and how it meets the unit's interior
  // crossings (WholeNodes, with the pinch's core x h; set them, then flag
  // every live pluck needsLayout).
  wholeAmp = WHOLE_AMP;
  wholeMode: WholeMode = "overlap";
  wholeNodes: WholeNodes = "through";
  wholePinch = WHOLE_PINCH;
  // The cue on a full-motion pluck (K180's pluckGlow; pluck_model's PLUCK
  // PARAMS): applies to plucks started after a change. "instead" lays the
  // pluck out in wholeMode "cue"; "fallback" measures the pluck's drawn
  // peak at pluck time (peakEstimate) and cues it only when that cannot
  // show. A still pluck (reduced motion) ignores it.
  glow: PluckGlow = "off";
  // Diagnostics: plucks drawn, requests skipped (and why), merges, evictions.
  readonly stats = {
    plucks: 0,
    skipped: 0,
    merged: 0,
    evicted: 0,
    skipHot: 0, // Chain mid-reveal / mid-FX.
    skipCore: 0, // The plucked stretch lies inside junction cores.
    skipHeld: 0, // The unit holds a particle the user is dragging.
    skipOther: 0, // No samples / no lobes / pluckSize 0.
    // Still-pluck stations whose quads touch more than GAP_SLOTS gap slots
    // (the extras are dropped: their gaps would show the cue).
    gapOverflow: 0,
  };
  private host: PluckHost;
  private active: ActivePluck[] = [];
  private free: PluckBlurMesh[] = [];
  private nextId = 1;
  private ghostPhase = 0;
  private ghostClock = 0;
  private scratch = new Float32Array(4);
  private env2 = new Float64Array(2);
  private station3 = new Float64Array(3);
  private rgb = new Float32Array(3);
  private depthBuf = new Float32Array(0); // roundCollapse scratch.
  private roundBuf = new Float32Array(0);
  // Layout scratch per station: W's room, and the arc and shape coordinate
  // in float64 (the peak is computed from these exactly as before K104).
  private wRoomBuf = new Float32Array(MAX_STATIONS);
  private arcBuf = new Float64Array(MAX_STATIONS);
  private xBuf = new Float64Array(MAX_STATIONS);
  // Per-chain combined collapse (min over that chain's plucks).
  private collapseOf = new Map<number, Float32Array>();
  // SHADER WARM-UP: the first pluck used to land ~100 ms late while the
  // GPU compiled the program; a pool mesh of degenerate triangles (zero
  // indices) is drawn for the first few frames to compile it up front.
  private warm: PluckBlurMesh | null = null;
  private warmFrames = 3;
  // The still program likewise, the first frame reduced motion is on (its
  // gap library makes it the costlier compile; never paid without it).
  private warmStill: PluckBlurMesh | null = null;
  private warmStillFrames = 0;
  private stillWarmed = false;
  // Per-station gap-slot union scratch (still plucks).
  private idBuf = new Float32Array(GAP_SLOTS);

  constructor(host: PluckHost) {
    this.host = host;
    this.warm = this.newMesh();
    this.warm.mesh.visible = true;
  }

  get activeCount(): number {
    return this.active.length;
  }

  // K180's pluck params (main.ts syncs them every frame, like size). W's
  // amount and the glow apply to plucks started after a change; a new
  // crossings rule re-lays the live plucks out (it is read by layout()).
  setWhole(amp: number, nodes: WholeNodes, glow: PluckGlow): void {
    this.wholeAmp = amp;
    this.glow = glow;
    if (nodes === this.wholeNodes) return;
    this.wholeNodes = nodes;
    for (const p of this.active) p.needsLayout = true;
  }

  // Diagnostic snapshot (probes): one row per live pluck.
  state(): Array<Record<string, unknown>> {
    return this.active.map((p) => ({
      id: p.id,
      chain: p.chain,
      t: +p.t.toFixed(3),
      tau: +p.tau.toFixed(3),
      side: p.side,
      evicting: p.evicting,
      stations: p.mesh.used,
      still: p.still,
      // [gain, brightest station's cueWeight] of a still pluck's cue.
      cue: p.still ? [+p.cueGain.toFixed(3), +p.cuePeak.toFixed(3)] : null,
      // K180: W's mode, whether the moving pluck glows, and the fallback
      // estimate (world units; -1 = not measured).
      wMode: p.wMode,
      glow: p.cue,
      peakEst: +p.peakEst.toFixed(5),
      W0: +p.W0.toFixed(4),
      unit: [+p.uE0.toFixed(3), +p.uE1.toFixed(3)],
      lobes: p.lobes.map((l) => ({
        k: l.k,
        s0: +l.s0.toFixed(3),
        s1: +l.s1.toFixed(3),
        shift: +l.shift.toFixed(3),
        A0: +l.A0.toFixed(4),
        beta: +l.beta.toFixed(3),
        attack: l.attack,
        keys: [l.keyA, l.keyB],
      })),
    }));
  }

  // Start a pluck. Returns false when it is sound-only (a chain mid-
  // reveal, no samples yet, nothing vibrates, or pluckSize 0).
  add(req: PluckRequest): boolean {
    const host = this.host;
    const samples = host.samples(req.chain);
    if (host.hot(req.chain)) {
      this.stats.skipped++;
      this.stats.skipHot++;
      return false;
    }
    if (!samples || samples.totalLength <= 0 || this.size <= 0) {
      this.stats.skipped++;
      this.stats.skipOther++;
      return false;
    }
    const closed = host.closed(req.chain);
    const total = samples.totalLength;
    const nodes = host.nodes(req.chain);
    const spans = segmentLobes(
      nodes.map((n) => n.arc),
      total,
      closed,
      req.arc,
      Math.max(0, Math.round(req.reach)),
      req.span ?? null
    ).filter((s) => s.s1 - s.s0 >= LOBE_MIN_LEN);
    const tapped = spans.find((s) => s.k === 0);
    const avoid = req.avoidArc;
    const holds = (s0: number, s1: number): boolean => {
      if (avoid === undefined) return false;
      for (const shift of closed ? [-total, 0, total] : [0]) {
        if (avoid + shift >= s0 && avoid + shift <= s1) return true;
      }
      return false;
    };
    if (!tapped) {
      this.stats.skipped++;
      this.stats.skipOther++;
      return false;
    }
    if (spans.some((s) => holds(s.s0, s.s1))) {
      this.stats.skipped++;
      this.stats.skipHeld++;
      return false;
    }
    const h = host.halfWidth();
    // Reduced motion: a STILL pluck - the unit brightens instead of moving
    // (writeStill); the sound is main.ts's and does not change.
    const still = this.reducedMotion;
    // Vibrating spans (hide zones trimmed) set the shape and amplitude.
    const span = (s: { a: number; b: number; s0: number; s1: number }): [number, number] =>
      vibratingSpan(
        s.s0,
        s.s1,
        s.a >= 0 ? nodes[s.a].hide : 0,
        s.b >= 0 ? nodes[s.b].hide : 0
      );
    const [t0, t1] = span(tapped);
    const tapLen = t1 - t0;
    if (tapLen < LOBE_MIN_LEN) {
      // The whole plucked stretch sits inside a junction core: sound only.
      this.stats.skipped++;
      this.stats.skipCore++;
      return false;
    }
    const beta = clampBeta(req.beta ?? (req.arc - t0) / tapLen);
    const aTap = tapAmplitude(tapLen, h, this.size, req.gain);
    // The whole-segment term: a set amount, whatever the unit's length.
    let W0 = still ? 0 : wholeAmplitude(h, this.size, req.gain, this.wholeAmp);
    const lobes: Lobe[] = spans.map((s) => {
      const nA = s.a >= 0 ? nodes[s.a] : null;
      const nB = s.b >= 0 ? nodes[s.b] : null;
      const [e0, e1] = span(s);
      const len = e1 - e0;
      const isTap = s.k === 0;
      return {
        e0,
        e1,
        keyA: nA ? nA.key : -1,
        keyB: nB ? nB.key : -1,
        s0: s.s0,
        s1: s.s1,
        k: s.k,
        A0: len >= LOBE_MIN_LEN ? sympatheticAmplitude(aTap, s.k, len, tapLen) : 0,
        beta: isTap ? beta : 0.5,
        attack: isTap && !still,
        onset: Math.abs(s.k) * ONSET_STAGGER,
        phase: Math.random() * Math.PI * 2,
        footA: nA ? nA.footPos : 0,
        footB: nB ? nB.footNeg : 0,
        hideA: nA ? nA.hide : 0,
        hideB: nB ? nB.hide : 0,
        lineA: nA && nA.under ? nA.line : null,
        lineB: nB && nB.under ? nB.line : null,
        dead: false,
        drawn: false,
        st0: 0,
        segs: 0,
        shift: 0,
        room: null,
      };
    });
    if (!still) {
      // (A still pluck never leaves its band: no neighbor to measure.)
      const cand = this.neighbors(samples, lobes, h);
      this.capClearance(req.chain, samples, lobes, h, cand);
      if (W0 > 0) this.wholeRooms(req.chain, samples, lobes, h, cand);
      // K105: neighbors follow the tapped lobe's capped swing.
      const capped = lobes.map((l) => ({ k: l.k, A0: l.A0, len: l.e1 - l.e0 }));
      rescaleSympathetic(capped, tapLen);
      for (let i = 0; i < lobes.length; i++) lobes[i].A0 = capped[i].A0;
    }

    // RE-PLUCK: a ringing unit that shares a lobe with this one is absorbed
    // - shared lobes restart their attack at max(current, new) amplitude
    // (a harp re-pluck damps and re-excites), its other lobes ride along
    // at their current amplitude, and so does its whole-segment term.
    // Still plucks never merge: white over white compounds in either draw
    // order, each cue on its own clock. A still and a moving pluck never
    // share a lobe either - the cue would hide under the moving core or
    // sit on its blur, by pool order - so the newer one takes over.
    for (let i = this.active.length - 1; i >= 0; i--) {
      const old = this.active[i];
      if (old.chain !== req.chain || old.evicting) continue;
      if (still && old.still) continue;
      const shares = old.lobes.some((ol) =>
        lobes.some((nl) => nl.keyA === ol.keyA && nl.keyB === ol.keyB && ol.keyA >= 0)
      );
      if (!shares) continue;
      if (old.still !== still) {
        this.release(i, false);
        continue;
      }
      // The old unit's coordinates may sit a whole loop away from this
      // one's on a closed chain: align them through a shared lobe.
      let delta = 0;
      if (closed) {
        for (const ol of old.lobes) {
          if (ol.keyA < 0) continue;
          const nl = lobes.find((q) => q.keyA === ol.keyA && q.keyB === ol.keyB);
          if (!nl) continue;
          delta = Math.round((nl.s0 + nl.shift - (ol.s0 + ol.shift)) / total) * total;
          break;
        }
      }
      for (const ol of old.lobes) {
        if (ol.dead) continue;
        const cur = this.amplitudeOf(old, ol);
        const match = lobes.find((nl) => nl.keyA === ol.keyA && nl.keyB === ol.keyB);
        if (match) {
          match.A0 = Math.max(match.A0, cur);
        } else if (cur > 0) {
          lobes.push({
            ...ol,
            A0: cur,
            onset: 0,
            attack: false,
            shift: ol.shift + delta,
          });
        }
      }
      W0 = Math.max(W0, this.wholeNow(old));
      this.stats.merged++;
      this.release(i, false);
    }

    // Pool: the oldest live pluck damps out over EVICT_TIME.
    const live = this.active.filter((p) => !p.evicting);
    if (live.length >= POOL_MAX) {
      live[0].evicting = true;
      this.stats.evicted++;
    }
    const tau = visualTau(req.freq, this.sustain);
    // K180's glow: "instead" lays this pluck out in wholeMode "cue" (the
    // probes' wholeMode "cue" still works: it cues every moving pluck).
    const glow: PluckGlow = still ? "off" : this.glow;
    const wMode: WholeMode = glow === "instead" ? "cue" : this.wholeMode;
    const pl: ActivePluck = {
      id: this.nextId++,
      chain: req.chain,
      t: -Math.max(0, req.delay ?? 0),
      tau,
      tauR: roundTau(tau),
      side: req.side >= 0 ? 1 : -1,
      freq: req.freq,
      lobes,
      mesh: this.takeMesh(still),
      evicting: false,
      fade: 1,
      layoutRev: -1,
      needsLayout: true,
      mask: null,
      ghostArea: 0,
      amp: new Float64Array(lobes.length),
      qv: new Float64Array(lobes.length),
      W0,
      // (No draw without a term: wholeAmp 0 keeps the RNG stream, and so
      // every same-state A/B, exactly pre-K104.)
      wPhase: W0 > 0 ? Math.random() * Math.PI * 2 : 0,
      uE0: 0,
      uE1: 0,
      still,
      cueGain: still ? cueStrength(this.size, req.gain) : 0,
      cuePeak: 0,
      wMode,
      cue: false,
      peakEst: -1,
    };
    lobes.sort((p, q) => p.s0 + p.shift - (q.s0 + q.shift));
    this.active.push(pl);
    if (!this.layout(pl)) {
      this.release(this.active.length - 1, true);
      this.stats.skipped++;
      this.stats.skipOther++;
      return false;
    }
    if (!still) {
      let shows = true;
      if (glow === "fallback") {
        pl.peakEst = this.peakEstimate(pl);
        shows = pluckShows(pl.peakEst, h, host.viewScale());
      }
      pl.cue = glowCue(glow, shows) || wMode === "cue";
    }
    this.refreshCollapse(pl.chain);
    this.writeFrame(pl);
    pl.mesh.mesh.visible = true;
    this.stats.plucks++;
    return true;
  }

  // Advance every live pluck by dt (wall seconds). Runs in every ticker
  // branch; never calls the renderer's update().
  tick(dt: number): void {
    if (this.warm && --this.warmFrames <= 0) {
      this.warm.mesh.visible = false;
      this.free.push(this.warm);
      this.warm = null;
    }
    if (this.reducedMotion && !this.stillWarmed) {
      this.stillWarmed = true;
      // A fresh mesh: its indices are all zero (a pool mesh keeps its last
      // pluck's quads).
      this.warmStill = this.newMesh();
      this.warmStill.mesh.shader = pluckStillShader();
      this.warmStill.mesh.visible = true;
      this.warmStillFrames = 3;
    }
    if (this.warmStill && --this.warmStillFrames <= 0) {
      this.warmStill.mesh.visible = false;
      this.free.push(this.warmStill);
      this.warmStill = null;
    }
    if (this.active.length === 0) return;
    const host = this.host;
    // Ghost cadence: at most one phase step per frame, GHOST_HZ in wall
    // time (a 120 Hz display holds each phase for two frames).
    this.ghostClock += dt;
    if (this.ghostClock >= 1 / GHOST_HZ - 1e-4) {
      this.ghostClock = Math.min(this.ghostClock - 1 / GHOST_HZ, 1 / GHOST_HZ);
      this.ghostPhase +=
        Math.PI * (1 + GHOST_JITTER * (2 * Math.random() - 1));
    }
    const u = pluckUniforms().uniforms as { uPluck: Float32Array };
    u.uPluck[0] = host.halfWidth();
    u.uPluck[1] = host.casing();
    const rev = host.geomRev();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.t += dt;
      if (p.evicting) {
        p.fade -= dt / EVICT_TIME;
        if (p.fade <= 0) {
          this.release(i, true);
          continue;
        }
      }
      if (p.needsLayout || p.layoutRev !== rev) {
        if (!this.layout(p)) {
          this.release(i, true);
          continue;
        }
        this.refreshCollapse(p.chain);
      }
      if (!this.writeFrame(p)) this.release(i, true);
    }
  }

  // Drop everything (scene rebuild / destroy): meshes die with the layer.
  clear(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(i, true);
  }

  // ---- internals ----------------------------------------------------------

  private newMesh(): PluckBlurMesh {
    const m = new PluckBlurMesh();
    this.layer.addChild(m.mesh);
    return m;
  }

  // A pool mesh with the program its pluck draws with (pixi caches a VAO
  // per program, and each program reads only its own attributes).
  private takeMesh(still: boolean): PluckBlurMesh {
    const m = this.free.pop() ?? this.newMesh();
    m.mesh.shader = still ? pluckStillShader() : pluckShader();
    return m;
  }

  private release(index: number, restore: boolean): void {
    const p = this.active[index];
    this.active.splice(index, 1);
    p.mesh.mesh.visible = false;
    p.mesh.used = 0;
    this.free.push(p.mesh);
    p.mask = null;
    if (restore) this.refreshCollapse(p.chain);
  }

  private amplitudeOf(p: ActivePluck, l: Lobe): number {
    const tl = p.t - l.onset;
    if (tl < 0) return 0;
    return l.A0 * Math.exp(-tl / p.tau) * (p.evicting ? Math.max(0, p.fade) : 1);
  }

  // The whole-segment term's current amplitude (same clock, onset 0).
  private wholeNow(p: ActivePluck): number {
    if (p.W0 <= 0 || p.t < 0) return 0;
    return p.W0 * Math.exp(-p.t / p.tau) * (p.evicting ? Math.max(0, p.fade) : 1);
  }

  // Candidate neighbor samples around a unit, [x, y, chain, arc] each: the
  // unit's bounding box grown by the largest possible swing.
  private neighbors(samples: SplineSamples, lobes: Lobe[], h: number): number[] {
    const host = this.host;
    const sc = this.scratch;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const l of lobes) {
      for (let s = l.s0; s <= l.s1 + 1e-9; s += 0.25) {
        host.sampleAt(samples, s, sc, 0);
        if (sc[0] < x0) x0 = sc[0];
        if (sc[0] > x1) x1 = sc[0];
        if (sc[1] < y0) y0 = sc[1];
        if (sc[1] > y1) y1 = sc[1];
      }
    }
    const grow = Math.max(2.2, this.wholeAmp) * h * this.size + 2 * h + CLEAR_MARGIN;
    x0 -= grow;
    y0 -= grow;
    x1 += grow;
    y1 += grow;
    const cand: number[] = [];
    const all = host.allSamples();
    for (let c = 0; c < all.length; c++) {
      const s = all[c];
      if (!s) continue;
      const cl = host.closed(c);
      const per = s.totalLength / (cl ? s.count : s.count - 1);
      for (let k = 0; k < s.count; k++) {
        const x = s.positions[k * 2];
        const y = s.positions[k * 2 + 1];
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        cand.push(x, y, c, k * per);
      }
    }
    return cand;
  }

  // Squared distance from the point (px, py) at `arc` of a lobe to its
  // nearest NEIGHBOR among `cand`. Crossing partners and junction arms are
  // not neighbors: a point closer to an end node (at a / b) than the
  // station itself is (dA / dB; a cone around the node) is ignored, as is
  // the plucked thread's own material within ownWindow of the arc.
  private nearest2(
    cand: number[],
    chain: number,
    closed: boolean,
    total: number,
    arc: number,
    px: number,
    py: number,
    a: Float32Array,
    b: Float32Array,
    dA: number,
    dB: number,
    ownWindow: number
  ): number {
    let best = Infinity;
    for (let q = 0; q < cand.length; q += 4) {
      const qx = cand[q];
      const qy = cand[q + 1];
      const dx = qx - px;
      const dy = qy - py;
      const d2 = dx * dx + dy * dy;
      if (d2 >= best) continue;
      if (cand[q + 2] === chain) {
        let da = Math.abs(cand[q + 3] - (((arc % total) + total) % total));
        if (closed) da = Math.min(da, total - da);
        if (da < ownWindow) continue;
      }
      const ex = qx - a[0];
      const ey = qy - a[1];
      if (ex * ex + ey * ey < dA * dA) continue;
      const fx = qx - b[0];
      const fy = qy - b[1];
      if (fx * fx + fy * fy < dB * dB) continue;
      best = d2;
    }
    return best;
  }

  // Cap each lobe's amplitude by its lateral room: the swing may run into
  // its nearest neighbor's edge by at most CLEAR_OVERLAP * h. Measured once
  // at pluck time over each lobe's middle 60% (nearest2's neighbors).
  private capClearance(
    chain: number,
    samples: SplineSamples,
    lobes: Lobe[],
    h: number,
    cand: number[]
  ): void {
    const host = this.host;
    const sc = this.scratch;
    const total = samples.totalLength;
    const closed = host.closed(chain);
    const ownWindow = 0.6 + 2 * h;
    const ax = new Float32Array(2);
    const bx = new Float32Array(2);
    for (const l of lobes) {
      const L = l.e1 - l.e0;
      if (L <= 0 || l.A0 <= 0) continue;
      host.sampleAt(samples, l.s0, sc, 0);
      ax[0] = sc[0];
      ax[1] = sc[1];
      host.sampleAt(samples, l.s1, sc, 0);
      bx[0] = sc[0];
      bx[1] = sc[1];
      const steps = Math.max(4, Math.ceil((0.6 * L) / 0.1));
      let cap = l.A0;
      for (let j = 0; j <= steps; j++) {
        const x = 0.2 + (0.6 * j) / steps;
        const env = peakShape(l.beta, x, l.attack);
        if (env < 0.15) continue;
        const arc = l.e0 + x * L;
        host.sampleAt(samples, arc, sc, 0);
        const best = this.nearest2(
          cand, chain, closed, total, arc, sc[0], sc[1], ax, bx,
          arc - l.s0, l.s1 - arc, ownWindow
        );
        if (!Number.isFinite(best)) continue;
        const gap = Math.sqrt(best) - 2 * h;
        cap = Math.min(cap, (Math.max(0, gap) + CLEAR_OVERLAP * h) / env);
      }
      l.A0 = Math.max(0, Math.min(l.A0, cap));
    }
  }

  // The whole-segment term's neighbor room ("overlap"), per lobe, sampled
  // uniformly node to node: wholeRoom of the gap to nearest2's neighbor,
  // unmeasured (Infinity) within WHOLE_NODE_ZONE h + 0.1 of a keyed node -
  // there the crossing machinery (rules 3-4, the soft node) decides - and
  // slope-limited along the lobe. Layout limits it again across the unit.
  private wholeRooms(
    chain: number,
    samples: SplineSamples,
    lobes: Lobe[],
    h: number,
    cand: number[]
  ): void {
    const host = this.host;
    const sc = this.scratch;
    const total = samples.totalLength;
    const closed = host.closed(chain);
    const ownWindow = 0.6 + 2 * h;
    const zone = WHOLE_NODE_ZONE * h + 0.1;
    const ax = new Float32Array(2);
    const bx = new Float32Array(2);
    for (const l of lobes) {
      const L = l.s1 - l.s0;
      if (!(L > 0)) continue;
      host.sampleAt(samples, l.s0, sc, 0);
      ax[0] = sc[0];
      ax[1] = sc[1];
      host.sampleAt(samples, l.s1, sc, 0);
      bx[0] = sc[0];
      bx[1] = sc[1];
      const N = Math.max(2, Math.ceil(L / WHOLE_ROOM_DS));
      const room = new Float32Array(N + 1).fill(Infinity);
      let measured = false;
      for (let j = 0; j <= N; j++) {
        const dA = (L * j) / N;
        const dB = L - dA;
        if ((l.keyA >= 0 && dA < zone) || (l.keyB >= 0 && dB < zone)) continue;
        const arc = l.s0 + dA;
        host.sampleAt(samples, arc, sc, 0);
        const best = this.nearest2(
          cand, chain, closed, total, arc, sc[0], sc[1], ax, bx, dA, dB, ownWindow
        );
        if (!Number.isFinite(best)) continue;
        room[j] = wholeRoom(Math.sqrt(best) - 2 * h, h);
        measured = true;
      }
      if (!measured) continue;
      slopeLimitUniform(room, L / N, WHOLE_ROOM_SLOPE);
      l.room = room;
    }
  }

  // (Re)build the strip geometry from the chain's current samples + nodes.
  // Returns false when nothing is left to draw.
  private layout(p: ActivePluck): boolean {
    const host = this.host;
    const samples = host.samples(p.chain);
    if (!samples || samples.totalLength <= 0) return false;
    const total = samples.totalLength;
    const closed = host.closed(p.chain);
    // The ribbon's own flag, for everything read against its gap slots.
    const gClosed = samples.closed;
    const h = host.halfWidth();
    p.layoutRev = host.geomRev();
    p.needsLayout = false;

    // Resolve each lobe's nodes on the live chain.
    const byKey = new Map<number, PluckNode>();
    for (const n of host.nodes(p.chain)) byKey.set(n.key, n);
    for (const l of p.lobes) {
      if (l.keyA < 0) continue; // Pseudo lobe: keeps its stored arcs.
      const a = byKey.get(l.keyA);
      const b = byKey.get(l.keyB);
      if (!a || !b) {
        l.dead = true;
        continue;
      }
      let s0 = a.arc;
      let s1 = b.arc;
      if (closed && s1 <= s0 + 1e-6) s1 += total;
      if (s1 - s0 < LOBE_MIN_LEN) {
        l.dead = true;
        continue;
      }
      // Keep the unit coordinate (arc + shift) continuous across the seam.
      l.shift = unitShift(l.s0 + l.shift, s0, total, closed);
      l.s0 = s0;
      l.s1 = s1;
      l.footA = a.footPos;
      l.footB = b.footNeg;
      l.hideA = a.hide;
      l.hideB = b.hide;
      [l.e0, l.e1] = vibratingSpan(s0, s1, a.hide, b.hide);
      l.lineA = a.under ? a.line : null;
      l.lineB = b.under ? b.line : null;
    }
    const lobes = p.lobes;
    let unitLen = 0;
    let liveLobes = 0;
    p.uE0 = Infinity;
    p.uE1 = -Infinity;
    for (const l of lobes) {
      if (l.dead) continue;
      unitLen += l.s1 - l.s0;
      liveLobes++;
      // The whole-segment term spans the unit's vibrating extent.
      p.uE0 = Math.min(p.uE0, l.e0 + l.shift);
      p.uE1 = Math.max(p.uE1, l.e1 + l.shift);
    }
    if (liveLobes === 0) return false;
    // Spacing: the target, widened when the unit would overflow the strip
    // (each lobe also pays up to MIN_LOBE_STATIONS + 1 fixed stations).
    const ds = Math.max(
      STATION_DS,
      unitLen /
        Math.max(1, MAX_STATIONS - liveLobes * (MIN_LOBE_STATIONS + 2))
    );

    const m = p.mesh;
    const sc = this.scratch;
    const wRoom = this.wRoomBuf;
    const arcAt = this.arcBuf;
    const xAt = this.xBuf;
    let n = 0;
    for (let li = 0; li < lobes.length; li++) {
      const l = lobes[li];
      l.drawn = false;
      if (l.dead) continue;
      const L = l.s1 - l.s0;
      const segs = Math.max(MIN_LOBE_STATIONS - 1, Math.ceil(L / ds));
      if (n + segs + 1 > MAX_STATIONS) continue;
      l.drawn = true;
      l.st0 = n;
      l.segs = segs;
      // Under-node clip reach along the partner: past the swing + thread.
      const reach = Math.min(CLIP_REACH, host.casing() + l.A0 + p.W0 + h + 0.1);
      // A still pluck's arc turns (pluck_model gapTurn): one whole number
      // of ring lengths off per lobe keeps them >= 0 and smooth.
      const base = gClosed ? Math.floor(l.s0 / total) * total : 0;
      const eL = l.e1 - l.e0;
      for (let i = 0; i <= segs; i++) {
        const arc = l.s0 + (L * i) / segs;
        const dA = arc - l.s0;
        // Shape coordinate over the vibrating span (0 / 1 at its frets).
        const x = eL > 1e-6 ? Math.max(0, Math.min(1, (arc - l.e0) / eL)) : 0;
        m.lobeOf[n] = li;
        m.xOf[n] = x;
        m.arcOf[n] = arc;
        m.dsOf[n] = L / segs;
        // A still pluck's gaps are the shader's exact mask: here only the
        // hide zones.
        m.visOf[n] = this.visAt(p.chain, l, arc, !p.still);
        // The whole-segment term's neighbor room here (the W pass below).
        wRoom[n] = l.room ? roomAt(l.room, dA / L) : Infinity;
        arcAt[n] = arc;
        xAt[n] = x;
        host.sampleAt(samples, arc, sc, 0);
        m.pos[n * 4] = sc[0];
        m.pos[n * 4 + 1] = sc[1];
        // Stash the unit normal for the extrude pass below.
        m.pos[n * 4 + 2] = -sc[3];
        m.pos[n * 4 + 3] = sc[2];
        if (p.still) {
          const tn = gapTurn(arc - base, total, gClosed);
          for (let v = 0; v < 2; v++) {
            const o4 = (n * 2 + v) * 4;
            m.gap[o4] = tn;
            m.gap[o4 + 1] = sc[2];
            m.gap[o4 + 2] = sc[3];
            m.gap[o4 + 3] = 0;
          }
          n++;
          continue;
        }
        // Clip lines (rule 4); the flag carries the reach (0 = no clip).
        const la = l.lineA;
        const lb = l.lineB;
        for (let v = 0; v < 2; v++) {
          const o4 = (n * 2 + v) * 4;
          const o2 = (n * 2 + v) * 2;
          if (la) {
            m.clipA[o4] = la[0];
            m.clipA[o4 + 1] = la[1];
            m.clipA[o4 + 2] = la[2];
            m.clipA[o4 + 3] = la[3];
          } else {
            m.clipA.fill(0, o4, o4 + 4);
          }
          if (lb) {
            m.clipB[o4] = lb[0];
            m.clipB[o4 + 1] = lb[1];
            m.clipB[o4 + 2] = lb[2];
            m.clipB[o4 + 3] = lb[3];
          } else {
            m.clipB.fill(0, o4, o4 + 4);
          }
          m.clipF[o2] = la ? reach : 0;
          m.clipF[o2 + 1] = lb ? reach : 0;
        }
        n++;
      }
    }
    if (n < 2) return false;
    m.used = n;
    if (p.still) this.writeGapIds(p, gClosed, total);

    // THE WHOLE-SEGMENT TERM (K104): W(u) = W0 sin(pi (u - uE0) / (uE1 -
    // uE0)) over the unit, under its caps - the neighbor room ("overlap",
    // slope-limited across the whole unit so no lobe boundary steps it) and
    // the pinch at interior nodes - as a share wOf of W0. The lobe's peak
    // and W's add up. "through" soft-caps the lobe term alone at the unit's
    // interior nodes and then the sum once at W's frets (the unit's end
    // nodes, hide zones); the lobe's share never drops under its pre-K104
    // swing and W draws what the cap leaves (throughStation), each term
    // with its own factor (fOf the lobe's; W's folded into wOf), and the
    // tight-bend cap below keeps the lobe's share first too. Otherwise the
    // soft node caps the SUM and fOf scales both terms alike.
    const W0 = p.W0;
    const mode = p.wMode;
    const nodes = this.wholeNodes;
    const pinch = nodes === "pinch" ? this.wholePinch : 0;
    // Without a live W the pre-K104 path runs, bit for bit.
    const through = nodes === "through" && W0 > 0 && mode !== "cue";
    if (W0 > 0 && mode === "overlap") {
      let uPrev = arcAt[0] + lobes[m.lobeOf[0]].shift;
      for (let i = 1; i < n; i++) {
        const u = arcAt[i] + lobes[m.lobeOf[i]].shift;
        const c = wRoom[i - 1] + WHOLE_ROOM_SLOPE * Math.abs(u - uPrev);
        if (c < wRoom[i]) wRoom[i] = c;
        uPrev = u;
      }
      for (let i = n - 2; i >= 0; i--) {
        const u = arcAt[i] + lobes[m.lobeOf[i]].shift;
        const c = wRoom[i + 1] + WHOLE_ROOM_SLOPE * Math.abs(uPrev - u);
        if (c < wRoom[i]) wRoom[i] = c;
        uPrev = u;
      }
    }
    let cuePeak = 0;
    for (let i = 0; i < n; i++) {
      const l = lobes[m.lobeOf[i]];
      const arc = arcAt[i];
      if (p.still) {
        // Nothing swings: the strip is the thread's own band, and cueOf
        // carries how much of the cue each station shows (cueWeight).
        m.pkOf[i] = 0;
        m.wOf[i] = 0;
        m.wsOf[i] = 0;
        m.fOf[i] = 0;
        const c = cueWeight(
          arc + l.shift,
          p.uE0,
          p.uE1,
          CUE_RAMP * h,
          l.k === 0 ? Math.sin(Math.PI * xAt[i]) : 0
        );
        m.cueOf[i] = c;
        if (c > cuePeak) cuePeak = c;
        continue;
      }
      const dA = arc - l.s0;
      const dB = l.s1 - arc;
      const shape = wholeShape(arc + l.shift, p.uE0, p.uE1);
      let wm = shape;
      if (W0 > 0 && shape > 0) {
        if (mode === "overlap") wm = Math.min(wm, wRoom[i] / W0);
        if (pinch > 0) {
          // Interior nodes only: the unit's own ends are W's frets.
          if (l.keyA >= 0 && l.s0 + l.shift > p.uE0 + 1e-6) {
            wm = Math.min(wm, pinchCap(h, dA, l.footA + COLLAPSE_RAMP, pinch) / W0);
          }
          if (l.keyB >= 0 && l.s1 + l.shift < p.uE1 - 1e-6) {
            wm = Math.min(wm, pinchCap(h, dB, l.footB + COLLAPSE_RAMP, pinch) / W0);
          }
        }
      }
      m.wsOf[i] = shape;
      m.wOf[i] = W0 > 0 && mode !== "cue" ? Math.max(0, wm) : 0;
      if (through) {
        const lobeRaw = l.A0 * peakShape(l.beta, xAt[i], l.attack);
        const endA = !(l.s0 + l.shift > p.uE0 + 1e-6);
        const endB = !(l.s1 + l.shift < p.uE1 - 1e-6);
        const capInt = this.capAt(l, dA, dB, h, !endA, !endB, false);
        const lobeInt =
          lobeRaw > 1e-9
            ? Math.max(0, Math.min(lobeRaw, softMin(lobeRaw, capInt, 0.25 * h)))
            : 0;
        const st = this.station3;
        throughStation(
          lobeRaw,
          lobeInt,
          this.peakAt(l, xAt[i], dA, dB, h),
          W0 * m.wOf[i],
          this.capAt(l, dA, dB, h, endA, endB),
          h,
          st
        );
        m.pkOf[i] = st[0];
        m.fOf[i] = st[1];
        m.wOf[i] *= st[2];
      } else {
        // The soft-node ceiling (tight bends tighten it below).
        m.pkOf[i] = this.peakAt(l, xAt[i], dA, dB, h, W0 * m.wOf[i]);
      }
    }
    p.cuePeak = cuePeak;
    if (p.still && cuePeak <= 0) return false;

    // Extrude with the CONCAVE-SIDE clamp (a strip wider than the local
    // turn radius folds over itself - the P3.34 lesson, which RibbonMesh
    // answers per sample). The strip is far wider than a ribbon, so the
    // radius comes from a 5-station baseline (the circumcircle of i-2, i,
    // i+2, within the lobe) and the clamp uses the smallest radius within
    // +-2 stations: offsets under the local radius of curvature cannot
    // fold. The ENVELOPE is capped to the clamped side too (capL / capR),
    // so the blur fades out before the strip edge instead of being cut.
    // TIGHT BENDS (the clamped side inside the thread itself) keep their
    // base intact (see the collapse below), so they act as soft nodes:
    // within TIGHT_K stations the swing stays under NODE_CORE h - the
    // overlay's core stays opaque over the intact thread.
    const cx = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      cx[i * 2] = m.pos[i * 4];
      cx[i * 2 + 1] = m.pos[i * 4 + 1];
    }
    const radius = new Float32Array(n);
    const turn = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      const li = m.lobeOf[i];
      let a = i;
      let b = i;
      for (let k = 0; k < 2; k++) {
        if (a - 1 >= 0 && m.lobeOf[a - 1] === li) a--;
        if (b + 1 < n && m.lobeOf[b + 1] === li) b++;
      }
      let mid = i;
      if (mid === a || mid === b) mid = (a + b) >> 1;
      radius[i] = Infinity;
      if (b - a < 2 || mid === a || mid === b) continue;
      const ax = cx[mid * 2] - cx[a * 2];
      const ay = cx[mid * 2 + 1] - cx[a * 2 + 1];
      const bx = cx[b * 2] - cx[mid * 2];
      const by = cx[b * 2 + 1] - cx[mid * 2 + 1];
      const cr = ax * by - ay * bx;
      const la = Math.hypot(ax, ay);
      const lb = Math.hypot(bx, by);
      const lc = Math.hypot(ax + bx, ay + by);
      if (Math.abs(cr) > 1e-12) radius[i] = (la * lb * lc) / (2 * Math.abs(cr));
      turn[i] = cr > 0 ? 1 : cr < 0 ? -1 : 0;
    }
    const rMinOf = new Float32Array(n);
    const tightLimit = (h + STRIP_PAD) / 0.9;
    for (let i = 0; i < n; i++) {
      const li = m.lobeOf[i];
      let rMin = radius[i];
      for (let j = i - 2; j <= i + 2; j++) {
        if (j >= 0 && j < n && m.lobeOf[j] === li && radius[j] < rMin) {
          rMin = radius[j];
        }
      }
      rMinOf[i] = rMin;
      m.tightOf[i] = rMin < tightLimit ? 1 : 0;
    }
    // Arc distance to the nearest tight station of the same lobe: the
    // base stays intact within TIGHT_K stations, its collapse ramps in over
    // COLLAPSE_RAMP beyond, and the swing stays under NODE_CORE h until the
    // ramp is done (tightAllow = the collapse allowance).
    for (let i = 0; i < n; i++) {
      const li = m.lobeOf[i];
      let d = Infinity;
      for (let j = i - 60; j <= i + 60; j++) {
        if (j < 0 || j >= n || m.lobeOf[j] !== li || !m.tightOf[j]) continue;
        d = Math.min(d, Math.abs(m.arcOf[j] - m.arcOf[i]));
      }
      m.tightAllow[i] = 1;
      if (Number.isFinite(d)) {
        const d0 = d - (TIGHT_K + 1) * m.dsOf[i];
        m.tightAllow[i] = smooth01(d0 / COLLAPSE_RAMP);
        const c = nodeCap(h, d0, COLLAPSE_RAMP);
        if (m.pkOf[i] > c) {
          if (through) {
            // The lobe keeps its share up to c and W gets the rest
            // (throughStation's rule: W never lowers the lobe's swing).
            const wS = W0 * m.wOf[i];
            const lobeS = Math.max(0, m.pkOf[i] - wS);
            if (lobeS > c) m.fOf[i] *= c / lobeS;
            m.wOf[i] = Math.max(0, c - Math.min(lobeS, c)) / W0;
          }
          m.pkOf[i] = c;
        }
      }
    }
    // Toward the center of curvature the swing is capped by the local
    // radius (innerCap = 0.9 radius minus the thread), CONTINUOUSLY along
    // the lobe (CAP_SLOPE), so the strip never needs clamping - a clamped
    // strip edge drew a hard notch - except at a genuinely tight bend (the
    // thread alone is wider than 0.9 radius), where the base stays intact
    // and the strip's inner edge may cut inside it. (Only the concave side
    // is capped: capping the swing on both sides kept a loop's eye clean
    // when zoomed in, but at normal zoom the noisy curvature cap carved
    // the outer blur of every hook into lumps.)
    for (let i = 0; i < n; i++) {
      const innerCap = Math.max(0, 0.9 * rMinOf[i] - h - STRIP_PAD);
      m.capLOf[i] = turn[i] > 0 ? innerCap : Infinity;
      m.capROf[i] = turn[i] < 0 ? innerCap : Infinity;
    }
    slopeLimit(m.capLOf, m.arcOf, m.lobeOf, n, CAP_SLOPE);
    slopeLimit(m.capROf, m.arcOf, m.lobeOf, n, CAP_SLOPE);
    for (let i = 0; i < n; i++) {
      if (!through) {
        // One factor for both terms; the frame reads W's from wOf.
        const l = lobes[m.lobeOf[i]];
        const raw = l.A0 * peakShape(l.beta, m.xOf[i], l.attack) + W0 * m.wOf[i];
        m.fOf[i] = raw > 1e-9 ? Math.max(0, m.pkOf[i] / raw) : 1;
        m.wOf[i] *= m.fOf[i];
      }
      // Half extent of the strip, per side: the (capped) swing + the thread
      // + AA pad; a concave edge past 0.9 radius (a tight bend) is clamped.
      const pk = m.pkOf[i];
      const r9 = 0.9 * rMinOf[i];
      const t = turn[i];
      const sideW = (cap: number, concave: boolean): number => {
        if (!Number.isFinite(cap)) return pk + h + STRIP_PAD;
        const ws = Math.min(pk, cap) + h + STRIP_PAD;
        return concave && ws > r9 ? Math.max(r9, 0.3 * h) : ws;
      };
      const wLeft = sideW(m.capLOf[i], t > 0);
      const wRight = sideW(m.capROf[i], t < 0);
      m.wInOf[i] = Math.min(wLeft, wRight);
      const nx = m.pos[i * 4 + 2];
      const ny = m.pos[i * 4 + 3];
      const px = cx[i * 2];
      const py = cx[i * 2 + 1];
      m.pos[i * 4] = px + nx * wLeft;
      m.pos[i * 4 + 1] = py + ny * wLeft;
      m.pos[i * 4 + 2] = px - nx * wRight;
      m.pos[i * 4 + 3] = py - ny * wRight;
      m.uv[i * 4] = wLeft;
      m.uv[i * 4 + 1] = 0;
      m.uv[i * 4 + 2] = -wRight;
      m.uv[i * 4 + 3] = 0;
    }
    // Unused stations repeat the last one (never indexed anyway).
    for (let i = n; i < MAX_STATIONS; i++) {
      m.pos.copyWithin(i * 4, (n - 1) * 4, n * 4);
      m.uv.copyWithin(i * 4, (n - 1) * 4, n * 4);
    }
    m.upload(
      p.still
        ? ["aPosition", "aUV", "aGap", "aGapId"]
        : ["aPosition", "aUV", "aClipA", "aClipB", "aClipF"]
    );
    m.writeQuads();

    // Static colors (knot mode): once per layout. (The still program draws
    // white.)
    if (!p.still && host.staticColors()) this.writeColors(p);

    // This pluck's base collapse: inside lobes, outside footprints, the
    // base narrows to what the overlay's opaque core always covers. A
    // still pluck's band covers the thread exactly: nothing to collapse.
    const count = host.baseSampleCount(p.chain);
    if (count > 1 && !p.still) {
      if (!p.mask || p.mask.length !== count) p.mask = new Float32Array(count);
      const mask = p.mask;
      mask.fill(1);
      const per = total / (closed ? count : count - 1);
      for (const l of lobes) {
        if (l.dead || !l.drawn) continue;
        const L = l.s1 - l.s0;
        const k0 = Math.ceil(l.s0 / per);
        const k1 = Math.floor(l.s1 / per);
        for (let k = k0; k <= k1; k++) {
          const arc = k * per;
          const dA = arc - l.s0;
          const dB = l.s1 - arc;
          // Footprints stay static; past them the collapse ramps in.
          const dFoot = Math.min(
            l.keyA >= 0 ? dA - l.footA : Infinity,
            l.keyB >= 0 ? dB - l.footB : Infinity
          );
          if (dFoot <= 0) continue;
          let allow = smooth01(dFoot / COLLAPSE_RAMP);
          // The base edge tapers linearly to each neighboring sample, so
          // narrowing scales with the overlay's visibility across both
          // intervals (a narrowed sample inside a hide ramp or a gap fade
          // read as a bite out of the thread).
          allow *= Math.min(
            this.visAt(p.chain, l, arc - per),
            this.visAt(p.chain, l, arc),
            this.visAt(p.chain, l, arc + per)
          );
          // The strip must span the whole thread width (at a bend tighter
          // than the strip its concave side is clamped inside the thread).
          const j = l.st0 + Math.round((dA / L) * l.segs);
          let pk = 0;
          for (let q = j - 1; q <= j + 1; q++) {
            if (q < l.st0 || q > l.st0 + l.segs) continue;
            if (m.wInOf[q] < h + STRIP_PAD) allow = 0;
            allow = Math.min(allow, m.tightAllow[q]);
            if (m.pkOf[q] > pk) pk = m.pkOf[q];
          }
          if (allow <= 0) continue;
          // The overlay's opaque core is h minus the swing; the base keeps
          // no more than that (the peak of the nearest stations).
          const raw = Math.max(0, Math.min(1, 1 - (pk + COLLAPSE_PAD) / h));
          const mul = 1 - allow * (1 - raw);
          let kk = k;
          if (closed) kk = ((k % count) + count) % count;
          else if (k < 0 || k >= count) continue;
          if (mul < mask[kk]) mask[kk] = mul;
        }
      }
      // Round it: the deepest profile under the allowance whose edge bends
      // no tighter than COLLAPSE_ROUND h. A window too short for the full
      // depth gets a shallow round dip instead of a V, and every shoulder is
      // round; nothing narrows past the allowance, so footprints, gap fades
      // and tight bends keep their limits.
      if (this.collapseRound > 0) {
        if (this.depthBuf.length !== count) {
          this.depthBuf = new Float32Array(count);
          this.roundBuf = new Float32Array(count);
        }
        const depth = this.depthBuf;
        const round = this.roundBuf;
        for (let k = 0; k < count; k++) depth[k] = 1 - mask[k];
        roundCollapse(depth, per, closed, 1 / (this.collapseRound * h * h), round);
        for (let k = 0; k < count; k++) mask[k] = 1 - round[k];
      }
    } else {
      p.mask = null;
    }
    return true;
  }

  // The amplitude ceiling at a lobe station. A crossing node is a SOFT
  // node: inside its static footprint the swing stays under NODE_CORE h
  // (the overlay's core stays opaque over the static patches), opening at
  // NODE_SLOPE beyond. A hide-zone node (junction core, marker gap) is a
  // rigid fret where its hide ramp ends - the overlay is invisible before
  // it, so a swing there would only pop in at the ramp - and a soft node
  // past that, out to its footprint (a junction's spans the fillet web).
  // softA / softB = false drops that end's crossing (soft) node; a hide-zone
  // node counts unless hides = false.
  private capAt(
    l: Lobe,
    dA: number,
    dB: number,
    h: number,
    softA = true,
    softB = true,
    hides = true
  ): number {
    const one = (
      key: number,
      d: number,
      foot: number,
      hide: number,
      useSoft: boolean
    ): number => {
      if (key < 0 || (!useSoft && hide <= 0) || (!hides && hide > 0)) return Infinity;
      const soft = nodeCap(h, d, foot + COLLAPSE_RAMP);
      if (hide > 0) {
        return Math.min(NODE_SLOPE * Math.max(0, d - hide - HIDE_RAMP), soft);
      }
      return soft;
    };
    return Math.min(
      one(l.keyA, dA, l.footA, l.hideA, softA),
      one(l.keyB, dB, l.footB, l.hideB, softB)
    );
  }

  // The capped peak swing at a station (x = position in the lobe): the
  // lobe's plus the whole-segment term's (wRaw, world), capped as one.
  private peakAt(
    l: Lobe,
    x: number,
    dA: number,
    dB: number,
    h: number,
    wRaw = 0
  ): number {
    const raw = l.A0 * peakShape(l.beta, x, l.attack) + wRaw;
    if (raw <= 1e-9) return 0;
    return Math.max(
      0,
      Math.min(raw, softMin(raw, this.capAt(l, dA, dB, h), 0.25 * h))
    );
  }

  // Overlay visibility at an arc of a lobe: the chain's under-gaps (rule 3;
  // gaps false: none) times the end nodes' hide zones (junction cores,
  // marker gaps).
  private visAt(chain: number, l: Lobe, arc: number, gaps = true): number {
    let vis = gaps ? this.host.visibility(chain, arc) : 1;
    const dA = arc - l.s0;
    const dB = l.s1 - arc;
    if (l.hideA > 0) vis *= smooth01((dA - l.hideA) / HIDE_RAMP);
    if (l.hideB > 0) vis *= smooth01((dB - l.hideB) / HIDE_RAMP);
    return vis;
  }

  // A still pluck's gap-slot ids: each station carries every slot whose
  // ribbon window touches the arc from its previous to its next station of
  // the same lobe, so a quad's flat ids cover it whichever vertex provokes
  // them (the shader's arc test does the real windowing, as on the ribbon).
  private writeGapIds(p: ActivePluck, closed: boolean, total: number): void {
    const m = p.mesh;
    const host = this.host;
    const ids = host.gapIds(p.chain);
    const count = host.baseSampleCount(p.chain);
    const buf = this.idBuf;
    for (let i = 0; i < m.used; i++) {
      const li = m.lobeOf[i];
      const a0 = i > 0 && m.lobeOf[i - 1] === li ? m.arcOf[i - 1] : m.arcOf[i];
      const a1 = i + 1 < m.used && m.lobeOf[i + 1] === li ? m.arcOf[i + 1] : m.arcOf[i];
      let k = 0;
      if (ids) {
        k = unionGapIds(ids, count, GAP_SLOTS, closed, total, a0, a1, buf, 0);
      } else {
        buf.fill(-1);
      }
      if (k > GAP_SLOTS) this.stats.gapOverflow++;
      for (let v = 0; v < 2; v++) {
        const o4 = (i * 2 + v) * 4;
        for (let s = 0; s < 4; s++) m.gapId[o4 + s] = s < GAP_SLOTS ? buf[s] : -1;
      }
    }
  }

  // Station colors: the thread's own, brightened toward white by the
  // whole-segment cue (cue = this frame's CUE_WHITE share; x its shape).
  private writeColors(p: ActivePluck, cue = 0): void {
    const m = p.mesh;
    const rgb = this.rgb;
    for (let i = 0; i < m.used; i++) {
      this.host.color(p.chain, m.arcOf[i], rgb);
      if (cue > 0) {
        const k = cue * m.wsOf[i];
        rgb[0] += (1 - rgb[0]) * k;
        rgb[1] += (1 - rgb[1]) * k;
        rgb[2] += (1 - rgb[2]) * k;
      }
      const o = i * 6;
      m.col[o] = rgb[0];
      m.col[o + 1] = rgb[1];
      m.col[o + 2] = rgb[2];
      m.col[o + 3] = rgb[0];
      m.col[o + 4] = rgb[1];
      m.col[o + 5] = rgb[2];
    }
    m.upload(["aCol"]);
  }

  // Per-frame attributes: the swept envelope, attack mix, ghost, colors.
  // Returns false once the pluck has died away.
  private writeFrame(p: ActivePluck): boolean {
    if (p.still) return this.writeStill(p);
    const host = this.host;
    const m = p.mesh;
    const h = host.halfWidth();
    const scale = Math.max(2, host.viewScale());
    const reduced = this.reducedMotion;
    const ghost = reduced ? 0 : this.ghost;
    // WCAG 2.3.1 guard from last frame's measured ghost area.
    const areaScale =
      p.ghostArea > GHOST_AREA_PX ? GHOST_AREA_PX / p.ghostArea : 1;
    let area = 0;
    let alive = false;
    // Per-lobe time state.
    const lobes = p.lobes;
    const amp = p.amp;
    const qv = p.qv;
    amp.fill(0);
    qv.fill(0);
    for (let li = 0; li < lobes.length; li++) {
      const l = lobes[li];
      const tl = p.t - l.onset;
      if (l.dead) continue;
      if (tl < 0) {
        alive = true;
        continue;
      }
      const a = this.amplitudeOf(p, l);
      amp[li] = a;
      qv[li] = l.attack && !reduced ? Math.exp(-tl / p.tauR) : 0;
      if (a * scale >= KILL_PX) alive = true;
    }
    // The whole-segment term: a lens (no attack) on the same clock, with
    // its own ghost phase.
    const aW = this.wholeNow(p);
    if (aW * scale >= KILL_PX) alive = true;
    // The cue (K180's glow; K104's "cue" mode): the unit brightens toward
    // white by up to CUE_WHITE on W's shape and clock, whatever W's amount,
    // and keeps the pluck alive until it fades under CUE_KILL.
    const cue = p.cue
      ? p.t < 0
        ? 0
        : CUE_WHITE * Math.exp(-p.t / p.tau) * (p.evicting ? Math.max(0, p.fade) : 1)
      : 0;
    if (cue >= CUE_KILL) alive = true;
    if (!alive) return false;
    const wGhost = Math.cos(this.ghostPhase + p.wPhase);
    const env = this.env2;
    for (let i = 0; i < m.used; i++) {
      const li = m.lobeOf[i];
      const l = lobes[li];
      const a = amp[li];
      const q = qv[li];
      const x = m.xOf[i];
      const s = a * m.fOf[i];
      const w = aW * m.wOf[i];
      let lo = 0;
      let hi = 0;
      let yg = 0;
      let gA = 0;
      if (s > 0 || w > 0) {
        if (s > 0) {
          envelope(l.beta, x, q, env);
          lo = env[0] * s;
          hi = env[1] * s;
          if (p.side < 0) {
            const t = lo;
            lo = -hi;
            hi = -t;
          }
          yg = p.side * s * ghostShape(l.beta, x, q, this.ghostPhase + l.phase);
        }
        if (w > 0) {
          lo -= w;
          hi += w;
          yg += w * wGhost;
        }
        // Concave side: the strip is clamped there, so is the swing.
        const cL = m.capLOf[i];
        const cR = m.capROf[i];
        if (hi > cL) hi = cL;
        if (-lo > cR) lo = -cR;
        if (yg > cL) yg = cL;
        if (-yg > cR) yg = -cR;
        const decay = s > 0 && l.A0 > 0 ? a / l.A0 : p.W0 > 0 ? aW / p.W0 : 0;
        if (ghost > 0 && decay > 0) {
          const span = 0.5 * (hi - lo);
          gA =
            ghost *
            Math.sqrt(Math.min(1, decay)) *
            smooth01((span - 0.15 * h) / (0.45 * h));
          if (gA > 0.004) area += 2 * h * m.dsOf[i] * scale * scale;
          gA *= areaScale;
        }
      }
      const vis = m.visOf[i];
      for (let v = 0; v < 2; v++) {
        const o2 = (i * 2 + v) * 2;
        const o4 = (i * 2 + v) * 4;
        m.env[o2] = lo;
        m.env[o2 + 1] = hi;
        m.aux[o4] = ATTACK_MIX * q;
        m.aux[o4 + 1] = yg;
        m.aux[o4 + 2] = gA;
        m.aux[o4 + 3] = vis;
      }
    }
    p.ghostArea = area;
    m.upload(["aEnv", "aAux"]);
    if (!host.staticColors() || cue > 0) this.writeColors(p, cue);
    return true;
  }

  // K180's fallback estimate: the pluck's largest DRAWN swing (world units)
  // as K104's census measures it - writeFrame's envelope (drawnSwing) at
  // each lobe onset plus SHOW_DT, over the stations at least half visible.
  // Run once at pluck time, after layout(); reads nothing writeFrame
  // writes, so the pluck's own frames are untouched.
  private peakEstimate(p: ActivePluck): number {
    const m = p.mesh;
    const lobes = p.lobes;
    const env = this.env2;
    const times: number[] = [];
    for (const l of lobes) for (const dt of SHOW_DT) times.push(l.onset + dt);
    let peak = 0;
    for (const T of times) {
      const aW = p.W0 > 0 ? p.W0 * Math.exp(-T / p.tau) : 0;
      for (let i = 0; i < m.used; i++) {
        if (m.visOf[i] < 0.5) continue;
        const l = lobes[m.lobeOf[i]];
        const tl = T - l.onset;
        if (l.dead) continue;
        const a = tl < 0 ? 0 : l.A0 * Math.exp(-tl / p.tau);
        const q = tl >= 0 && l.attack ? Math.exp(-tl / p.tauR) : 0;
        const v = drawnSwing(
          l.beta,
          m.xOf[i],
          q,
          a * m.fOf[i],
          aW * m.wOf[i],
          p.side,
          m.capLOf[i],
          m.capROf[i],
          env
        );
        if (v > peak) peak = v;
      }
    }
    return peak;
  }

  // A still pluck's frame (reduced motion): no envelope, no ghost, no
  // attack - only the cue's alpha, the voice's decay on the same clock as
  // a moving pluck's (instant rise; the eviction fade included). Returns
  // false once the cue's brightest station drops under CUE_KILL.
  private writeStill(p: ActivePluck): boolean {
    const m = p.mesh;
    const level =
      p.t < 0
        ? 0
        : p.cueGain * Math.exp(-p.t / p.tau) * (p.evicting ? Math.max(0, p.fade) : 1);
    if (p.t >= 0 && level * p.cuePeak < CUE_KILL) return false;
    for (let i = 0; i < m.used; i++) {
      const a = m.visOf[i] * Math.min(1, level * m.cueOf[i]);
      for (let v = 0; v < 2; v++) {
        const o4 = (i * 2 + v) * 4;
        m.aux[o4] = 0;
        m.aux[o4 + 1] = 0;
        m.aux[o4 + 2] = 0;
        m.aux[o4 + 3] = a;
      }
    }
    p.ghostArea = 0;
    m.upload(["aAux"]);
    return true;
  }

  // Combine every live pluck's mask on a chain (min) and hand it to the
  // host, which re-extrudes that chain's base ribbon once.
  private refreshCollapse(chain: number): void {
    let combined: Float32Array | null = null;
    for (const p of this.active) {
      if (p.chain !== chain || !p.mask) continue;
      if (!combined) {
        combined = new Float32Array(p.mask);
      } else if (combined.length === p.mask.length) {
        for (let k = 0; k < combined.length; k++) {
          if (p.mask[k] < combined[k]) combined[k] = p.mask[k];
        }
      }
    }
    const prev = this.collapseOf.get(chain) ?? null;
    if (!combined && !prev) return;
    if (combined && prev && combined.length === prev.length) {
      let same = true;
      for (let k = 0; k < combined.length; k++) {
        if (combined[k] !== prev[k]) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    if (combined) this.collapseOf.set(chain, combined);
    else this.collapseOf.delete(chain);
    this.host.setCollapse(chain, combined);
  }
}
