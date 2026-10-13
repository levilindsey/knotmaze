// Renders the knot as smooth ribbons: every strand's fill ribbon in one
// base layer, drawn through the shared SECTION SHADER.
// CROSSING GAPS ARE PER-PIXEL (gap_mask.ts): each crossing (registered,
// emergent, and the start/exit marker discs) owns a GAP SLOT - the over
// thread's local centerline polyline plus the under thread's arc window -
// and the shader hides every UNDER-thread fragment inside that window that
// lies within (over half-width + margin) of the polyline: a constant-width
// CASING around the over thread (gapMode "perp", the default; the erase
// era's arc-length margin - P3.21, gap * |sin(local angle)| per pixel -
// survives as gapMode "arc", see its field for why it lost). fadeLength
// ramps alpha beyond the edge. The over thread is never touched, so there
// are no erase grids and no over-fill copies: whichever thread the base
// layer draws first, a hidden under pixel reveals the over ribbon or the
// backdrop (the canvas is transparent - Stage 18 - so gaps still CLIP the
// thread layer and a textured backdrop drops in unchanged). The gap's
// edge is the exact offset curve of the over centerline: the erase grid's
// lane caps met acute thread edges as wedges and slits that swung with
// the flow (crossing 57 at the tw 0.64 repro), and cannot exist here.
// Per-frame CPU work per crossing is two short centerline marches (the
// under window, the over reach) and one polyline sample - no lanes.
// Junction fans (the GPU junction field, junction_field.ts) read the same
// gap table: a fan whose arm dives under a crossing near the joint is
// masked by that crossing's slot exactly like the arm's own ribbon.

import {
  BufferImageSource,
  Container,
  Graphics,
  Shader,
  Texture,
} from "pixi.js";
import { createNoise2D, createNoise3D } from "simplex-noise";
import type { ParticleSystem, CrossingPass } from "../physics/particle_system";
import type { VSegment, ColorScheme } from "../core/section_colors";
import { gamutRgb } from "../core/section_colors";
import type { AppearFxMode, RevealTip } from "../core/reveal_plan";
import type { RevealAnimator } from "./reveal";
import { AppearFxSystem } from "./appear_fx";
import { SeededRNG } from "../util/random";
import type { SplineSamples } from "../geometry/spline_generator";
import {
  sampleClosedSpline,
  sampleOpenSpline,
} from "../geometry/spline_generator";
import { ProbeTriMesh, RibbonMesh, TriFanMesh } from "./ribbon_mesh";
import {
  KNOT_UNIFORMS_GLSL,
  PAINT_DATA_GLSL,
  PAINT_FRAG_DECL,
  PAINT_FRAG_LIB,
  PAINT_FX_GLSL,
  PAINT_VERT_DECL,
  PAINT_VERT_MAIN,
} from "./paint_glsl";
import {
  PaintScene,
  kData,
  kGeom,
  kReveal,
  kStatic,
  knotUniformValues,
  knotUniforms,
} from "./paint_model";
import {
  MAX_KNOTS,
  kCA,
  kChain,
  kCtrlNear,
  kCtrlOfArc,
  kFxAge,
  kFxColor,
  kFxDoneWall,
  kFxSettleWall,
  kIgnition,
  kRevealMaskAt,
  kRevealTime,
  kSampleArc,
  kShadeFx,
  kSwell,
  kWall,
  smoothInv,
  sourcePieces,
  type KChain,
  type KData,
  type KIgn,
} from "./paint_math";
import { FX_STYLE, PAINT_CONST } from "./paint_const";
import { PluckOverlay } from "./pluck_overlay";
import type { PluckHost, PluckNode } from "./pluck_overlay";
import {
  FIELD_BLEND_MIN,
  FIELD_PROF_ARC,
  FIELD_PROF_DR,
  MAX_ARMS,
  bindFieldAccent,
  bindFieldGap,
  junctionShader,
  paintData,
  recordData,
  setFieldParams,
} from "./junction_field";
import {
  GAP_FRAG,
  GAP_MAX_PTS,
  GAP_PROT_PTS,
  GAP_SLOTS,
  GAP_VERT_DECL,
  GAP_VERT_MAIN,
  GapMaskTable,
  defaultGapTexture,
} from "./gap_mask";

export interface RibbonStyle {
  threadWidth: number; // In lattice units.
  casingWidth: number; // Thread width + twice the crossing gap.
  baseHue: number; // [0, 360) starting hue for the strand palette.
  // Optional strand -> palette-slot mapping (maze fabric: bridges/stubs and
  // cut halves inherit their host strand's hue so splices read as thread
  // material). Identity when absent.
  hueGroup?: number[];
  // PALETTE MODE (maze fabric): each chain's section RGB comes from the
  // section field and gameplay recoloring (traveled gold, choice pulses,
  // hover) steers a 256x1 ACCENT strip through per-vertex U, so it paints
  // the ACTUAL thread pixels - and with per-pixel gaps there is no copy of
  // any thread to keep in sync. Knot mode leaves this off: its chains
  // render through the same shader (the gaps live there) with one
  // constant section color each and a neutral U.
  paletteMode?: boolean;
  // Seed for the flow-undulation noise field (defaults to 1).
  flowSeed?: number;
  // Traversal-highlight color (the "gold"); accent strips cache per color.
  pathColor?: number;
}

// PAINT: gameplay recoloring, declared by the fabric overlay and rendered by
// steering each sample's palette coordinate.
export interface PaintSpan {
  chain: number;
  c0: number; // Chain ctrl span, unwrapped (c1 >= c0; sampled modulo).
  c1: number;
  // Optional gold intensity at each end (memory-trail tail fade): 1 = full
  // gold (the default), 0 = base. Interpolates linearly in arc between the
  // ends; the resulting U sweeps only the CONTIGUOUS base..gold texels, so
  // the palette-order invariant holds (no band/accent crossing).
  p0?: number;
  p1?: number;
}
export interface PulseArm {
  chain: number;
  cJunction: number; // Ctrl at the branch-point end of the run.
  cFar: number; // Ctrl at the far end (direction + extent).
  inward: boolean; // Crest slides INTO the junction (the arrival run).
  onPath: boolean; // Underlying color is traveled gold (use the gold band).
  hovered: boolean; // Steady bright highlight instead of the pulse.
}
// A small gold disc of thread around one occurrence of a traversed
// junction. At a fusion several ribbons overlap; painting every arm's
// immediate neighborhood hides the overlap footprint in both directions
// (a painted bridge tip on an unpainted host, and vice versa).
export interface PaintCap {
  chain: number;
  ctrl: number;
  radius: number; // Arc radius.
  // Optional gold intensity (memory-trail fade), default 1. Caps never
  // DARKEN: they write max(existing, their own U), which is identical to
  // the old unconditional gold write whenever p is 1.
  p?: number;
}

// ACCENT strip layout (one shared 256x1 RGBA strip; linear filtering).
// Each texel encodes the gameplay paint at that U as an (accent color,
// mix weight) pair: the section shader computes
//   mix(sectionRGB, accent.rgb, accent.a)
// so the SECTION color is per-vertex (the aColor attribute - arbitrary
// RGB pairs blend directly along threads and through junctions) while the
// gameplay paint stays a 1D U coordinate exactly as before. Encoding per
// family, chosen so the mono case reproduces the old 2D palette texel for
// texel (mix is affine in the weight, so linear filtering commutes):
//   band A texels: accent WHITE, weight 0.94 * (1 - i/111) - the old
//     lighten-toward-white curve;
//   base texels: weight 0 (pure section color); their rgb is GOLD so the
//     base->gold texel interpolation sweeps mix(section, gold, t) - the
//     exact old base->gold ramp (rgb is a don't-care AT weight-0 texels
//     but load-bearing BETWEEN texels);
//   gold / band B texels: the old gold / gold-toward-white colors at
//     weight 1 (the traveled path is section-independent, as before).
//
// ORDER IS LOAD-BEARING: per-vertex Us interpolate LINEARLY between
// samples, so the strip must be arranged so that every adjacency the paint
// can produce (base<->bandA at pulse-region ends, base<->gold at traveled
// ends, gold<->bandB on the arrival arm) interpolates only through its own
// two color families - the original [base, gold, hover, bandA...] layout
// swept the U straight across the gold+hover texels at every band/base
// boundary, rendering a thin bright hairline there (the reported "distinct
// line at the end of the gradient"):
//   0..111   band A, REVERSED: near-white accent -> base
//   112..117 base thread color
//   118..123 traveled gold
//   124..235 band B: gold -> near-white accent
//   236..255 band B accent (guard)
const PAL_W = 256;
const U_BASE = 115 / PAL_W;
const U_GOLD = 121 / PAL_W;
const bandU = (onPath: boolean, p: number): number => {
  const q = p < 0 ? 0 : p > 1 ? 1 : p;
  return onPath ? (124.5 + q * 110) / PAL_W : (111.5 - q * 110) / PAL_W;
};
// U for a gold intensity p in [0, 1] (memory-trail tail fade): a straight
// lerp base -> gold, exactly U_GOLD at p 1 and U_BASE at p 0. The sweep
// stays inside the contiguous base+gold texel families.
const goldU = (p: number): number =>
  p >= 1 ? U_GOLD : p <= 0 ? U_BASE : U_BASE + (U_GOLD - U_BASE) * p;
const PATH_GOLD = 0xffd24a;
// Pulse geometry/motion, in ARC units (world-ish): the influence zone
// reaches this far from the junction, crests are this wide, and travel at
// this speed. The period and phase are GLOBAL (period = 2 * PULSE_REACH,
// driven by the paint clock alone): every outgoing arm pulses at the same
// interval and phase, in sync with the single inbound arm - as a crest
// sinks into the junction its successor emerges outward, one continuous
// flow that splits across the branches. Short arms clip the zone; both the
// reach end and the arm end get smooth windows (a hard cutoff rendered as
// a distinct moving line where a crest hit the boundary).
const PULSE_REACH = 2.0;
const CREST_WIDTH = 0.72;
const PULSE_SPEED = 1.6;
// Steady floor of the choice tint at the junction (fades with distance),
// plus a bright core right at the branch point so the inbound (gold-band)
// and outbound (base-band) arms converge to a near-common bright tone
// instead of meeting in two visibly different mid-tints.
const PULSE_FLOOR = 0.38;
// Core reaches FULL band strength at d=0 (0.38 + 0.62 = 1), where both
// bands are the same near-white accent - see buildAccentPixels.
const PULSE_CORE_BOOST = 0.62;
const PULSE_CORE_RADIUS = 0.55;
// Crest amplitude ramps with its distance from the junction: an outbound
// crest swells OUT of the core glow instead of being born full-strength
// (the reported abrupt onset), and symmetrically the inbound crest
// submerges into it.
const CREST_RAMP = 0.5;
const PULSE_END_WINDOW = 0.45;
// Outbound crests run this many SECONDS ahead of the inbound clock, so a
// departure visibly answers each arrival instead of waiting out the full
// half-cycle.
const PULSE_OUT_LEAD = 0.3;
// Seconds for a new junction's pulse animation to breathe in.
const PULSE_FADE_IN = 0.45;
// RENDER-ONLY PLUCK node keys (pluck_overlay.ts PluckNode.key): crossing
// passes are 2 * crossing + (under ? 1 : 0); the other kinds start above.
const PLUCK_KEY_JOINT = 1e6;
const PLUCK_KEY_MARKER = 2e8;
const PLUCK_KEY_END = 3e8;
// JUNCTION JOINERY. Fused arms (bridge/stub/merge terminals) tuck their
// rendered tip back by the host's half-width so the ribbon lands flush on
// the host's near edge instead of overhanging past its centerline - the
// overhang read as floating scraps and gapless fake crossings. Each wedge
// between adjacent arms then gets a rounded FILLET: a concave patch from
// one arm's edge to the next, split at its midpoint so each half wears its
// own arm's live paint color. Reach and curvature are in thread-width
// units; wedges flatter than FILLET_MAX_WEDGE (a near-straight pass-through
// side) get no fillet.
// Fillets hug the junction tightly: the arm edges are straight-line
// approximations from the junction point, and a host that curves away from
// them leaves any far-reaching patch floating in the background. The
// user's cuspRadius slider multiplies the reach (0 disables the fillets;
// the center/tip seal discs stay regardless).
const FILLET_REACH_PER_HALF = 1.25; // * fillHalf, along each arm.
const FILLET_MAX_WEDGE = 2.6; // Radians.
const FILLET_CORNER_LIM = 2.2; // * edge half-width: skip distant corners.
const FILLET_BEZIER_STEPS = 8;
// Samples per curve-hugging wedge flank: at least FILLET_EDGE_PTS, more as
// the reach grows so no flank chord exceeds FILLET_EDGE_CHORD world (reach
// tops out near 3 world: threadWidth 0.8 at cuspRadius 6). The flank is a
// polyline through points on its arm's edge; where the arm wraps a small
// eye, each chord cuts across the curved edge and leaves a circular
// segment (sagitta c^2/8R) that neither web nor ribbon covers - a thin dark
// crescent. A fixed 5 made 0.48-world chords at cuspRadius 6 (crescents at
// 12 of 41 joints on the user's ring URL); 0.3 still left specks.
const FILLET_EDGE_PTS = 5;
const FILLET_EDGE_CHORD = 0.15;
const FILLET_EDGE_PTS_MAX = 20;
// Under-gap flank clamp (rebuildFillets armReach): stop this many
// fillHalfs short of the arm's nearest cut (underWindows carry MID-lane
// extents; the wedge-side lanes of an oblique crossing cut nearer - a
// 0.5 pad still left small points at the repro's oblique dives), never
// below this fraction of the full reach (the joint still needs rounding).
const FILLET_GAP_PAD = 1.0;
const FILLET_GAP_MIN_FRAC = 0.3;
// The junction field itself (profile grid, blend band, fill-joint radii)
// is configured in junction_field.ts and evaluated PER PIXEL on the GPU.
// SECTION CACHE DRIFT: the per-sample RGB cache maps sample -> ctrl through
// the arc table at BAKE time, but lookups (and the joint itself) live at
// the CURRENT table. Relaxation shifts a chain's ctrl/arc distribution by
// ~1 ctrl near joints - a whole segments junction ramp (SEG_RAMP_CTRL 1) -
// so hosts stopped converging at their joints (29/41 at the repro). Re-bake
// a chain once its table drifts this far (ctrl units).
const CACHE_REBAKE_CTRL = 0.1;
// Layer vote: an under-near arm only pins its joint to the punchable
// bottom layer when its gap starts within this many fillHalfs (see
// rebuildFillets armDives).
const FILLET_DIVE_NEAR = 2.0;
const DISC_SEGS = 16; // Rim segments on tip/junction seal discs.
// FUSED-TIP DISC radius, in half-widths. A tucked cap keeps a quarter
// half-width of overlap with its host (tuckFusedTips) that only the fans
// hide, and its corners sit a full half-width from the tuck point: at
// 0.99 the 16-gon's chords (cos(pi/16) inside the radius) left the corner
// strips uncovered, so whichever raw ribbon drew on top showed between
// the disc and the wedges - the light merge-core hairlines (user URL x160,
// masked on master by over-fills). 1.06 = the chord inset plus about a
// pixel of AA at the default fit; the rim is clamped to the bridge's own
// strip (TIP_DISC_SIDE half-widths each side, a hair inside its edges, so
// the ribbon's own AA edge stays untouched) - it never bulges past the
// bridge's sides into the backdrop or a neighbor's gap.
const TIP_DISC_SCALE = 1.06;
const TIP_DISC_SIDE = 0.995;
// Unit-circle rim of a disc fan (closed: the first point repeats).
const DISC_COS = new Float64Array(DISC_SEGS + 1);
const DISC_SIN = new Float64Array(DISC_SEGS + 1);
for (let i = 0; i <= DISC_SEGS; i++) {
  const th = ((i % DISC_SEGS) / DISC_SEGS) * Math.PI * 2;
  DISC_COS[i] = Math.cos(th);
  DISC_SIN[i] = Math.sin(th);
}

// Wrap (closed) or clamp (open) a world arc into a chain's [0, total].
function normArc(a: number, total: number, closed: boolean): number {
  if (total <= 0) return 0;
  if (closed) return ((a % total) + total) % total;
  return Math.max(0, Math.min(total, a));
}

// FLOW UNDULATION (render-side ONLY). A seeded, slowly drifting simplex
// field displaces each chain's spline CONTROL points right after they are
// copied from the particle positions, so the fabric sways as if in water.
// Everything downstream of chainControls (splines, the gap-slot marches
// and polylines, tuck) reads chainSamples and therefore rides the same
// field coherently; the few consumers that read raw physics positions
// (junction fillet centroids here, markers/hit-tests in the fabric
// overlay) add flowOffset() explicitly. The PHYSICS state is never
// touched: the sim's sleep gate stays sacred - main.ts keeps calling
// update() while asleep/paused only when flowStrength > 0, and at 0 the
// displacement pass is skipped entirely (byte-identical rest behavior).
const FLOW_FREQ = 0.22; // Spatial noise frequency (1 / lattice units).
const FLOW_TIME_SCALE = 0.35; // Noise-time seconds per flow-clock second.
const FLOW_AMP = 0.38; // Displacement in world units at flowStrength 1.

// REVEAL (Stage 22 appearance animation) and APPEARANCE FX: the numbers
// live in paint_const.ts (shared with the shaders). The width mask is a
// per-chain per-sample multiplier in [0, 1] (CPU mirror until G3):
// unrevealed samples collapse to zero width, the frontier gets a short
// 0 -> 1 taper so tips read rounded, and a glow rides just behind each
// advancing tip. Interval modes (trace/bloom/draw) taper over arc; ink
// tapers over world distance. A crossing's gap shows only once BOTH passes
// are at REVEAL_CROSSING_MIN of full width locally (a gap for a not-yet-
// visible over thread would cut a naked hole in the revealed under thread)
// and, for materializing / swelling FX, once both have settled.
const {
  REVEAL_TAPER_ARC,
  REVEAL_CROSSING_MIN,
  REVEAL_GLOW_ARC,
  RAINBOW_GLOW_ARC,
  RAINBOW_GLOW_HOLD,
  HOVER_PULSE_W,
} = PAINT_CONST;
// Comet streak tail polyline: points sampled along the host thread
// behind each reveal tip (spawnTipFrontier -> AppearFxSystem).
const FX_PATH_PTS = 8;
const FX_PATH_STEP = 0.5;
const GOLD_FAMILY_MIN = 118 / PAL_W;
// Every appearance FX settles within this many wall seconds of its last
// ignition (burn's recovery, the longest, plus a margin): fxOn drops after.
const FX_TAIL = PAINT_CONST.BURN_RECOVER_END + 0.15;
// A gated crossing's slot is solved from this many seconds before its show
// time (earlier it is cleared and skipped - the solve is update()'s main
// cost, and early in a reveal most crossings are still hidden).
const GATE_LEAD = 0.1;
// Pass ctrl drift (ctrl units) under which a pending gate's show-time solve
// is reused (ribbon_renderer gateCache).
const GATE_CTRL_EPS = 0.1;
// Wall seconds after ignition the rainbow width swell lasts (progress down
// to RAINBOW_SWELL_MIN_P: the swell factor is exactly 1 below it).
const RAINBOW_SWELL_END =
  PAINT_CONST.RAINBOW_HOLD +
  PAINT_CONST.RAINBOW_FADE * smoothInv(1 - PAINT_CONST.RAINBOW_SWELL_MIN_P);

function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

// The accent strip + section shader live for the PAGE lifetime - nothing
// ever destroys them mid-session: pixi's retained render state (bind
// groups listen to their texture resources) can still reference a source
// on the frame after a rebuild, and destroying it then null-derefs inside
// setResource on every subsequent render - the ticker dies and the screen
// goes blank. (They are also seed-independent now - the strip carries
// only white/gold accents; section colors arrive per vertex.)
// Accent strips are PAGE-LIFETIME cached PER PATH COLOR (the pathColor
// param) - pixi's retained render state can reference a TextureSource a
// frame after a rebuild, so these are never destroyed (the PALETTE_CACHE
// lore).
const ACCENT_CACHE = new Map<number, Texture>();
const ACCENT_PIX_CACHE = new Map<number, Uint8Array>();

// CPU accent-strip sample with the GPU's linear filtering (1D lerp over
// texels), for overlays that must composite the accent BEFORE
// interpolation - a fan triangle interpolating raw U across a band seam
// sweeps the strip THROUGH the gold rows mid-triangle (the palette-order
// lore, fan edition: the jagged gold shards at traversed junctions).
function accentSampleCpu(
  px: Uint8Array,
  u: number,
  out: Float32Array
): void {
  const f = Math.max(0, Math.min(PAL_W - 1, u * PAL_W - 0.5));
  const i0 = Math.floor(f);
  const i1 = Math.min(PAL_W - 1, i0 + 1);
  const t = f - i0;
  for (let c = 0; c < 4; c++) {
    out[c] =
      ((px[i0 * 4 + c] * (1 - t) + px[i1 * 4 + c] * t) / 255) *
      (c === 3 ? 1 : 1);
  }
}
// Mesh.shader wants a TextureShader (a Shader carrying its texture).
type SectionShader = Shader & { texture: Texture };
let SECTION_SHADER: SectionShader | null = null;

function buildAccentPixels(gold: number): Uint8Array {
  const px = new Uint8Array(PAL_W * 4);
  const put = (i: number, hex: number, w: number): void => {
    px[i * 4] = (hex >> 16) & 255;
    px[i * 4 + 1] = (hex >> 8) & 255;
    px[i * 4 + 2] = hex & 255;
    px[i * 4 + 3] = Math.round(w * 255);
  };
  // Both bands converge to the SAME near-white accent (0.94 toward white)
  // so that at full strength - the junction core - the inbound gold band,
  // the outbound base bands, and every joinery overlay (discs, fillets)
  // meet in one color; family tints only separate mid-arm.
  for (let i = 0; i < 112; i++) put(i, 0xffffff, 0.94 * (1 - i / 111));
  for (let i = 112; i < 118; i++) put(i, gold, 0);
  for (let i = 118; i < 124; i++) put(i, gold, 1);
  for (let i = 124; i < 236; i++) {
    put(i, mixHex(gold, 0xffffff, (0.94 * (i - 124)) / 111), 1);
  }
  for (let i = 236; i < 256; i++) {
    put(i, mixHex(gold, 0xffffff, 0.94), 1);
  }
  return px;
}

function accentPixels(gold: number = PATH_GOLD): Uint8Array {
  let px = ACCENT_PIX_CACHE.get(gold);
  if (!px) {
    px = buildAccentPixels(gold);
    ACCENT_PIX_CACHE.set(gold, px);
  }
  return px;
}

function accentTexture(gold: number = PATH_GOLD): Texture {
  let tex = ACCENT_CACHE.get(gold);
  if (!tex) {
    tex = new Texture({
      source: new BufferImageSource({
        resource: accentPixels(gold),
        width: PAL_W,
        height: 1,
        // The alpha channel is a MIX WEIGHT consumed by the shader, not
        // transparency; declare premultiplied so nothing rescales the
        // bytes and the mesh blend state stays plain 'normal' (WebGL
        // ignores the premultiply flag for buffer uploads regardless -
        // the bytes pass through verbatim, as with the FADE texture).
        alphaMode: "premultiplied-alpha",
      }),
    });
    ACCENT_CACHE.set(gold, tex);
  }
  return tex;
}

// The section shader (every ribbon, both modes; the app forces WebGL, so a
// GL program suffices). Attribute layout: aPosition/aUV as pixi's default
// mesh program (aUV.x = the paint U, aUV.y = the side across the ribbon),
// aColor = the per-vertex section RGB, plus the gap (G1) and paint (G2)
// attributes. Transforms and alpha mirror the default mesh program's
// skeleton: the mesh pipe force-assigns the global (uProjectionMatrix,
// uWorldTransformMatrix, uWorldColorAlpha) and local (uTransformMatrix,
// uColor) uniform groups to EVERY mesh shader, custom ones included, and
// the GL backend syncs them by name.
const SECTION_VERT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 aPosition;
in vec2 aUV;
in vec3 aColor;
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
${PAINT_DATA_GLSL}

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
  vSection = aColor;
  vColor = uColor * uWorldColorAlpha;
${GAP_VERT_MAIN}
${PAINT_VERT_MAIN}
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

uniform sampler2D uTexture;
${KNOT_UNIFORMS_GLSL}
${PAINT_DATA_GLSL}
${PAINT_FX_GLSL}
${PAINT_FRAG_LIB}
${GAP_FRAG}
void main(void) {
  highp vec2 gfw = fwidth(vPos);
  highp float pxW = max(max(gfw.x, gfw.y), 1e-5);
  highp float gTurn = gapTurn();
  // G2: this fragment's chain point (wrap-pair picks need derivatives in
  // uniform control flow - here, at the top).
  KChain kc = kFragChain();
  highp vec2 kpt = kFragPoint(kc);
  if (uKBase.z > 0.5) {
    // DEBUG VIEW (probes): 1 = ctrl, 2 = arc - (fract(v), fract(16 v),
    // chain / 63); the census decodes 1e-4 precision through 8 bits.
    highp float kv = uKBase.z < 1.5 ? kCtrlNear(kc, kpt.x, kpt.y) : kpt.x;
    finalColor = vec4(fract(kv), fract(kv * 16.0), float(kc.ch % 64) / 63.0, 1.0);
    return;
  }
  vec4 acc = texture(uTexture, vec2(vUV.x, 0.5));
  vec3 base = vSection;
  highp float pRain = 0.0;
  highp float aM = 1.0;
  // (kFxColor's own early outs, hoisted to skip the ctrl refinement: no
  // style, or this chain's FX all settled.)
  if (uKFx.w > 0.5 && uKFx.x > 0.5 && uKFx.z < kc.fxDone) {
    highp float kctrl = kCtrlNear(kc, kpt.x, kpt.y);
    base = kFxColor(kc, kctrl, kpt.x / kc.arcPer, base, pRain, aM);
  }
  if (pRain > 0.0) base = kRainbowBlend(base, pRain, vUV.y);
  vec3 rgb = mix(base, acc.rgb, acc.a);
  float gk = gapKeep(pxW, gTurn);
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

// Point the ONE shared section shader at an accent strip. Under a custom
// shader pixi binds nothing from mesh.texture (its setter only updates
// shader.texture bookkeeping; GlMeshAdaptor binds uTexture for the
// DEFAULT shader only), so this rebind is the only way a path color
// reaches the ribbons. It never did before: ribbons kept the default gold
// strip while the CPU-composed fillet fans used pathColor - olive fans on
// gold paths at a khaki pc= (the user's "olive smudge" report).
function bindAccent(tex: Texture): void {
  // The GPU junction-field shader (fans) composes the same strip and
  // follows it too.
  bindFieldAccent(tex);
  const sh = sectionShader();
  if (sh.texture === tex) return;
  sh.resources.uTexture = tex.source;
  sh.resources.uSampler = tex.source.style;
  sh.texture = tex;
}

function sectionShader(): SectionShader {
  if (!SECTION_SHADER) {
    const tex = accentTexture();
    const sh = Shader.from({
      gl: { vertex: SECTION_VERT, fragment: SECTION_FRAG, name: "section-rgb" },
      resources: {
        uTexture: tex.source,
        uSampler: tex.source.style,
        // Bound like uTexture (pixi binds every TextureSource resource to
        // the sampler uniform of the same name); bindGap swaps it per scene.
        uGapData: defaultGapTexture().source,
        // G2 shader paint (paint_model.ts): page-lifetime data textures +
        // the shared uniform group.
        uKStatic: kStatic().source,
        uKGeom: kGeom().source,
        uKReveal: kReveal().source,
        knotUniforms: knotUniforms(),
      },
    }) as SectionShader;
    sh.texture = tex;
    SECTION_SHADER = sh;
  }
  return SECTION_SHADER;
}

// Point both gap readers - the shared section shader (ribbons) and the
// junction-field shader (fans) - at a scene's gap-slot table (gap tables
// are page-lifetime and sized per scene - see gap_mask.ts).
function bindGap(tex: Texture): void {
  bindFieldGap(tex);
  const sh = sectionShader();
  if (sh.resources.uGapData !== tex.source) sh.resources.uGapData = tex.source;
}

// Dense enough that tight bends near crossings (low slack) stay resolved.
const SAMPLE_SPACING = 0.09;
const MIN_SAMPLES = 48;
// GAP SLOT GEOMETRY (per-pixel gaps; see gap_mask.ts). Marches walk one
// thread's centerline in MARCH_STEP arc steps against the OTHER thread's
// coarse local polyline (COARSE_SPACING, nearest-vertex distance - within
// ~0.01 of the curve at casing range).
const MARCH_STEP = 0.07;
const COARSE_SPACING = 0.1;
const COARSE_MAX = 128;
// The shader's over polyline is measured by SEGMENT distance, so its error
// is the chord sag spacing^2 * curvature / 8 (< 0.003 world even at a
// radius-0.3 kink).
const FINE_SPACING = 0.075;
// Adaptive polyline resolution (computeGapSlot): the coarsest spacing a
// straight over pass gets, and the chord sagitta allowed on a bend.
const POLY_SPACING_MAX = 0.3;
const POLY_SAG_TOL = 0.0015;
// Far-branch smooth-min radius: SMIN_K_PER x (half-width + margin),
// clamped (gap_mask.ts).
const SMIN_K_PER = 0.3;
const SMIN_K_MIN = 0.03;
const SMIN_K_MAX = 0.15;
// Arc padding on each protect interval (computeGapSlot), in half-widths
// plus a constant. Generous on purpose: the interval only bounds the search,
// the protect polyline decides per pixel (an interval ending at the
// measured overlap still left 11 margin-band px over the covered ribbon
// at a squeezed self-twist, user x31 after the gesture battery).
const PROTECT_PAD_PER_HALF = 1.0;
const PROTECT_PAD = 0.02;
// Measured protect extents (protectReach): march step and the most it may
// add past the straight-thread estimate.
const PROTECT_STEP = 0.03;
const PROTECT_MARCH_MAX = 1.5;
// Longest stretch of the covered thread a protect polyline spans per side,
// and its point spacing (coarser only when GAP_PROT_PTS cannot cover the
// span): every margin-band fragment inside a protect interval tests its
// segments, so a short polyline keeps that cheap.
const PROT_POLY_SPAN_MAX = 3.0;
const PROT_POLY_SPACING = 0.2;
// Render-only pluck over-node footprints (computeGapSlot): the cover's
// slack past the casing band, and its floor - the over-fill window's
// OVER_PATCH_MARGIN / OVER_HALF_LENGTH_MIN, which they replace.
const PLUCK_OVER_PAD = 0.12;
const PLUCK_OVER_MIN = 0.35;
// Reach caps scale with thread width (the P3.27 lesson: caps calibrated at
// tw 0.42 truncated fat shallow overlaps) and admit the long cinched-twist
// rides (P3.36). Both marches stop where the threads actually part, so
// the caps only bound pathological runs.
const CUT_REACH_PER_HALF = 6.5;
const OVER_REACH_PER_HALF = 5.8;
const CUT_REACH_MIN = 1.35;
const OVER_REACH_MIN = 1.2;
const RIDE_REACH_CAP = 4.5;
// Neighbor clearance: a window (along the under chain) or polyline (along
// the over chain) stops this fraction of the way to the next crossing pass
// in that direction. TWINS (the neighbor crossing pairs the same two
// chains - a twist, where the over/under roles swap) and self-crossings
// split at the midpoint, so the two gaps meet at one flip line instead of
// overlapping (both threads hidden = a dark pinch band).
const NB_CLEAR = 0.8;
const NB_CLEAR_TWIN = 0.5;
// A window ends one step after the under ribbon's footprint (centerline
// offset up to the 2x miter clamp) has left the over thread's casing +
// fade; the over polyline likewise past the window's footprint.
const UNDER_FOOT_PER_HALF = 2.0;
const GAP_EXIT_PAD = 0.05;
// Visible margin bias, kept from the erase era for gap-width parity: the
// gap reads as `gap + CUT_BIAS` of arc along the under thread.
const CUT_BIAS = 0.03;
// Gap slots for emergent (tunneled) crossings discovered by the physics.
// Sized for taut knots: at slack ~0 dozens of real emergent crossings can
// coexist, and a starved pool renders some overlaps gap-less.
const EMERGENT_POOL = 64;
// Gap slots for marker discs (start/exit dots).
const MARKER_SLOTS = 4;
// Fillet layer-vote reach terms (rebuildFillets): how much of the wedge
// reach (fillHalf * FILLET_REACH_PER_HALF * cuspRadius) counts as a
// joint's clearance, and the old erase-width pad - both kept so the vote
// classifies exactly as before.
const JOINT_CLEAR_REACH_SCALE = 0.55;
// Junction clearance floors (computeGapSlot): a squeezed side keeps at
// least half its cosmetic margin (zero read as a "busted gap on one
// side") and FADE_JOINT_FLOOR of its fade (zero room rendered an ABRUPT
// edge beside the other side's full roll-off) - the erase era's values.
const JOINT_MARGIN_FLOOR = 0.5;
const FADE_JOINT_FLOOR = 0.45;
const ERASE_WIDTH_PAD = 0.02;

function hslToHex(h: number, s: number, l: number): number {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    (Math.round(f(0) * 255) << 16) |
    (Math.round(f(8) * 255) << 8) |
    Math.round(f(4) * 255)
  );
}

interface PassNeighbors {
  prev: { chain: number; ctrl: number };
  next: { chain: number; ctrl: number };
}

export class RibbonRenderer {
  root: Container;

  private ps: ParticleSystem;
  private style: RibbonStyle;
  private fills: RibbonMesh[] = [];
  // Knot mode: each chain's constant section color (the old per-strand
  // tint, now an aColor through the section shader).
  private knotRgb: Float32Array[] = [];
  private chainControls: Float32Array[] = [];
  private chainSamples: (SplineSamples | null)[] = [];
  private sampleScratch = new Float32Array(4);
  // Per crossing: neighbor crossing passes along the over and under threads.
  private overNeighbors: PassNeighbors[] = [];
  private underNeighbors: PassNeighbors[] = [];
  // Pass -> owning crossing index + whether it is the UNDER pass (the
  // twin test of the neighbor clearance - see NB_CLEAR_TWIN).
  private passInfo = new Map<
    CrossingPass,
    { index: number; isUnder: boolean }
  >();
  // PER-PIXEL GAPS (gap_mask.ts): the slot table (registered crossings,
  // then the emergent pool, then marker discs), this frame's windows per
  // under chain as flat [slot, centerArc, winNeg, winPos] quads (vertex
  // slot ids + junction fan masks are assigned from these), scratch
  // polylines, and the per-sample id scratch per chain.
  private gaps: GapMaskTable;
  private emergentBase = 0;
  private markerBase = 0;
  private chainWins = new Map<number, number[]>();
  private coarseO = new Float32Array(COARSE_MAX * 2);
  private coarseU = new Float32Array(COARSE_MAX * 2);
  private fineO = new Float32Array(GAP_MAX_PTS * 2);
  private idScratch = new Map<number, Float32Array>();
  private nearIdx = 0; // Out-param of polyDist (nearest vertex index).
  // Per junction: the gap slots masking its fans (pooled; rebuildFillets).
  private jointMaskPool: Float32Array[] = [];
  private tipMaskScratch = new Float32Array(GAP_SLOTS);
  // [marginNeg, fadeNeg, marginPos, fadePos] clearance scales
  // (computeGapSlot).
  private clearScratch = new Float32Array(4);
  // [negA, negB, posA, posB] protect intervals (computeGapSlot).
  private protScratch = new Float32Array(4);
  // protectReach's samples of the two threads.
  private protScA = new Float32Array(4);
  private protScB = new Float32Array(4);
  // The two protect polylines of the slot being written (negative side,
  // positive side; GAP_PROT_PTS points each).
  private protPts = new Float32Array(GAP_PROT_PTS * 4);
  private protPolyNeg = this.protPts.subarray(0, GAP_PROT_PTS * 2);
  private protPolyPos = this.protPts.subarray(GAP_PROT_PTS * 2);
  // Per gap slot: the over pass's chain (-1: marker disc / unused) and its
  // arc, written by computeGapSlot - jointMask tells a joint's own arms
  // from foreign over threads with them.
  private slotOverChain = new Int32Array(0);
  private slotOverArc = new Float32Array(0);
  // Mask switch (probes A/B the bare base layer) and margin look:
  // "perp" (default): a constant-width CASING around the over thread -
  // the gap's edge is one level set of the distance to the over
  // centerline, continuous everywhere;
  // "arc": the erase era's P3.21 margin - `gap` measured along the under
  // thread, i.e. gap * |sin(local angle)| perpendicular. Per pixel that
  // angle is taken at the NEAREST over point, which jumps between branches
  // of a curled over pass (fat kinks, eyes): the margin jumps with it and
  // the gap edge renders STEPPED there (x124 at the tw 0.64 repro), and
  // the casing thins to nothing at shallow crossings.
  maskEnabled = true;
  // Probe view: masked material is tinted magenta instead of removed.
  maskDebug = false;
  // A fused tip's disc radius in half-widths (TIP_DISC_SCALE; public for
  // same-state probes).
  tipDiscScale = TIP_DISC_SCALE;
  // The gap slots' far-branch smooth-min (gap_mask.ts); off = A/B probes.
  smoothMin = true;
  // The gap slots' protect intervals (computeGapSlot); off = A/B probes.
  protect = true;
  gapMode: "arc" | "perp" = "perp";
  // Windows dropped because a sample already carried GAP_SLOTS slots
  // (diagnostic; should stay 0).
  gapOverflow = 0;
  // Per-chain UNDER-GAP windows, rebuilt every update() from the live
  // crossing solve (emergent crossings included): flat triplets
  // [centerArc, extNeg, extPos] along the UNDER chain - where its
  // CENTERLINE is hidden. Overlay consumers (the Ariadne yarn, the fillet
  // flank clamp) use these to dip under with their host thread - see
  // underGapVisibility().
  private underWindows = new Map<number, number[]>();
  // Palette-mode paint state (see PaintSpan/PulseArm). The paint pass is
  // deliberately decoupled from update(): it rewrites only UV buffers, so
  // the pulse animation can run while the physics sleeps.
  private paintSpans: PaintSpan[] = [];
  private paintPulses: PulseArm[] = [];
  private pulseKey = "";
  private pulseBorn = -1e9;
  private paintCaps: PaintCap[] = [];
  private paintRev = 0;
  private chainRev = new Map<number, number>();
  private uScratch = new Map<number, Float32Array>();
  private paintClock = 0;
  // Junction joinery: arms per fused junction (built once), per-chain
  // fused-terminal flags for the tuck, and palette pixel rows for CPU-side
  // fillet coloring.
  // Live junction-rounding radius multiplier (the cuspRadius slider;
  // main.ts keeps it synced every tick).
  cuspRadius = 1;
  // Live under-gap fade length (the fadeLength slider; main.ts keeps it
  // synced every tick): arc length past each gap edge over which the under
  // thread fades back in. 0 = sharp (one-pixel antialiased) edges.
  fadeLength = 0;
  // Live world-unit spacing between crests in a run's pulse train (the
  // pulseSpacing panel param; main.ts syncs it every tick).
  pulseSpacing = 2.5;
  // Live flow-undulation controls (sliders; main.ts syncs them every tick
  // like cuspRadius). See the FLOW_* constants: render-side displacement
  // only, never the physics state.
  flowStrength = 0;
  flowSpeed = 1;
  private flowTime = 0;
  private flowScratch = new Float32Array(2);
  private flowNoise: (x: number, y: number, z: number) => number;
  private axisScratch = new Float32Array(2);
  private junctionArms: Array<{
    particles: number[];
    arms: Array<{ chain: number; slot: number; dir: 1 | -1 }>;
  }> = [];
  // JUNCTION CLEARANCE + layer votes: per-chain ctrls of every fused
  // joint (with its junctionArms index), so crossing marches/fades can
  // treat joints as virtual neighbors (renderCrossing) and the joinery
  // can classify junctions against nearby crossings (rebuildFillets).
  // Built once with junctionArms; empty in knot mode.
  private junctionArcCtrls = new Map<
    number,
    Array<{ ctrl: number; jn: number }>
  >();
  // Free (unanchored, unfused) open-chain tips: dead-end thread ends. They
  // get rounded caps, drawn with the fillets and colored from the live
  // paint.
  private freeTips: Array<{ chain: number; atEnd: boolean }> = [];
  // Fused (tucked) tips get the same disc treatment: it rounds the tucked
  // cap and covers its corner ears and the hairline sliver between the cap
  // and the host's edge. The disc lies mostly ON the host's face, so it
  // wears the HOST's paint at the junction (hostChain/hostCtrl) - coloring
  // it from the arm's own tip rendered floating pale/gold dots wherever
  // the two paints disagreed (pulsing arm over a traveled host, traveled
  // bridge over a backtracked host).
  private fusedTips: Array<{
    chain: number;
    atEnd: boolean;
    hostChain: number;
    hostCtrl: number;
  }> = [];
  private chainTipFused: Array<[boolean, boolean]> = [];
  // The section color field: piecewise-linear rgb(ctrl) per chain from
  // section_colors (or spatial noise), baked to a per-SAMPLE RGB cache on
  // the first update. A cache entry of length 3 is a constant chain
  // color; otherwise it is 3 * sampleCount channel triplets.
  private accentTex: Texture | null = null;
  private filletLayer: Container | null = null;
  // TWO-LAYER JOINERY (pre-per-pixel-gaps; kept for the junction-shader
  // merge): the per-wedge layer vote still sorts fans between this layer
  // and the bottom one, but with no erase layer between them the choice
  // no longer changes coverage - what used to depend on it (a diving
  // arm's gap punching its web) is now the fan's own gap mask (see
  // junction masks in rebuildFillets).
  private filletTopLayer: Container | null = null;
  private filletTopMesh: TriFanMesh | null = null;
  // MARKER DISC OCCLUDERS (start/exit dots): each owns a gap slot on its
  // thread whose "over polyline" is the disc center and whose margin is
  // CONCENTRIC - the thread is hidden inside radius (disc + gap).
  private markerOccluders: Array<{
    chain: number;
    ctrl: number;
    radius: number;
  }> = [];
  // Crossing VISIBILITY GATES (G2.1): a gated crossing's gap slot carries
  // its SHOW TIME (reveal-relative wall seconds, encoded in the slot's
  // strength) and the GPU ramps it in from the clock - no per-crossing
  // fade state on the CPU. `gateOpenAt` = the latest show time written this
  // frame (update() keeps running until it has passed, so the CPU-side
  // bookkeeping that follows a gate - underWindows, pluck footprints -
  // catches up).
  private gateOpenAt = -Infinity;
  // LATCHED show times (registered crossings by index; joints / lone caps
  // by key): once a gate has opened it keeps the time it opened at. The
  // estimate is re-solved every frame from the live arc tables, which keep
  // moving while the knot settles under the reveal - an open gap or fan
  // must never fade back out (master latched its fade start the same way).
  private gateLatch = new Float64Array(0);
  private jointLatch = new Map<string, [number, number]>();
  // Show-time CACHE for gates not yet open: an exact solve is reused while
  // its inputs are unchanged (gateRev: the speed knots, the FX style, the
  // reveal taper shape) and every point's ctrl stays
  // within GATE_CTRL_EPS of the solved one (a show time moves by about
  // 1/rate per ctrl - milliseconds per GATE_CTRL_EPS - while the solve was
  // update()'s largest new cost: every pending crossing, every frame).
  // Registered crossings: [tShow, overCtrl, underCtrl, gateRev] by index.
  private gateRev = 0;
  private gateCache = new Float64Array(0);
  private jointCache = new Map<
    string,
    { rev: number; ctrls: Float64Array; out: [number, number] }
  >();
  // Per-frame mirror views (no allocation in the hot loops): the data
  // texture mirrors and one KChain per chain, refreshed by update() (the
  // chain's arc table changes every update).
  private kd: KData = kData();
  private kcv: KChain[] = [];
  private ignTmp: KIgn = { hit: false, tA: 0, cFrom: 0, dir: 1, t0: 0, rate: 1, tEnd: 0, span: 0 };
  private acc4Scratch = new Float32Array(4);
  // REVEAL CLOCKS (G2.1; advanceClocks): the paint clock at reveal start
  // (fxNow = paintClock - revealWall0), the speed knot count, and the wall
  // time after which every appearance FX has settled (fxOn drops).
  private revealWall0 = 0;
  private knotCount = 1;
  private fxEnd = -Infinity;
  // Whether the live reveal (or its FX tail) is attached to the shaders.
  private fxLive = false;
  // Per-chain width multiplier (reveal mask x rainbow swell), pooled, and
  // the one update() last used per chain (the pluck light path reuses it).
  private widthScratch = new Map<number, Float32Array>();
  private widthLast: (Float32Array | null)[] = [];
  // Per-chain ignition scratch for the mask pass (sample ctrls).
  private ignScratch = { pRain: 0, alpha: 1 };
  // RENDER-ONLY PLUCKS (pluck_overlay.ts): the overlay itself, each
  // crossing's static footprints - along its over thread (the over pass's
  // stretch that covers the under thread's gap) and along its under
  // thread (the arc where any lane of the under ribbon is hidden, the
  // erase era's extents) - both solved by computeGapSlot, and the
  // per-chain base COLLAPSE multipliers the overlay installs (composed into
  // widthMul here, never inside a footprint).
  readonly plucks: PluckOverlay;
  private overHalfNeg = new Float32Array(0);
  private overHalfPos = new Float32Array(0);
  private eraseExtentNeg = new Float32Array(0);
  private eraseExtentPos = new Float32Array(0);
  private pluckCollapse = new Map<number, Float32Array>();
  private collapseScratch = new Map<number, Float32Array>();
  // update() calls so far (probes: a render-only pluck must add none).
  updateCount = 0;
  // G2 SHADER PAINT: this scene's data-texture layout, the debug view
  // (probes: 0 off, 1 = ctrl, 2 = arc - see SECTION_FRAG) and the probe
  // triangle mesh (lazily built by probeTris).
  private paintScene: PaintScene;
  paintDebug = 0;
  private probeMesh: ProbeTriMesh | null = null;
  private filletMesh: TriFanMesh | null = null;
  private sectionSegs: VSegment[][] = [];
  private sectionNoise: ((x: number, y: number) => number) | null = null;
  private rgbCache: Float32Array[] = [];
  private rgbCacheReady = false;
  // Per chain: each control's arc FRACTION when its cache was baked (null
  // for constant / spatial-noise caches) - see CACHE_REBAKE_CTRL.
  private bakeFrac: (Float32Array | null)[] = [];
  // Chains re-baked by update() whose colors the next paint tick uploads.
  private recolorPending = new Set<number>();
  // Junction arm -> next joint ctrl along it (see armNextJointCtrl).
  private nextJointCache = new Map<string, number | null>();
  // Junction-field arm profiles, pooled across fillet rebuilds (fixed
  // length per rebuild geometry; reset when the length changes).
  private fieldProfPool: Float32Array[] = [];
  private fieldProfLen = 0;
  // GPU JUNCTION FIELD (junction_field.ts): each chain's first texel in the
  // shared PAINT data texture (palette mode; one texel per ribbon sample).
  private paintBase = new Int32Array(0);
  // Joinery rebuild gating (see rebuildFillets): bumped by every update();
  // the last rebuild's inputs.
  private geomRev = 0;
  private filletKey = "";
  // Scratch for the junction-field composition (rebuildFillets).
  private fieldAccScratch = new Float32Array(4);
  private fieldMbScratch = new Float32Array(4);
  // PROBE HOOK (diagnostics only): the last rebuild's junction field -
  // `at(ji, x, y, out)` writes the composed [r, g, b] (+ U_BASE) at a world
  // point (junction index = junctionArms index); `arms(ji)` lists that
  // joint's arms. A CPU transliteration of the GPU shader reading the SAME
  // record + paint data the shader samples (cpuJunctionField) - the ground
  // truth for GPU-vs-CPU and field-vs-ribbon censuses.
  fieldProbe: {
    at: (ji: number, x: number, y: number, out: Float32Array) => boolean;
    arms: (ji: number) => unknown[];
    center: (ji: number) => [number, number] | null;
    // The joint's record texel index (-1: no field) - what a fan's aRec
    // carries.
    record: (ji: number) => number;
  } | null = null;
  // Default section color (the gamut midpoint = the seed-hue base color).
  private baseRgb = new Float32Array(3);
  // Scratch triplet for point color lookups (colorAtArc consumers).
  private rgbScratch = new Float32Array(3);
  // REVEAL state (Stage 22): the animator, the per-chain width masks
  // (null = fully revealed - the zero-cost resting state), the frontier
  // tips cached once per paint tick for the glow, and the knot-mode tip
  // glow overlay. `revealOn` is refreshed at the top of update() and read
  // by the paint/fillet/emergent passes in the same frame.
  private revealAnim: RevealAnimator | null = null;
  private revealOn = false;
  private revealWas = false;
  private revealMask: (Float32Array | null)[] = [];
  private revealMaskPool = new Map<number, Float32Array>();
  private revealTips: RevealTip[] = [];
  private glowChains = new Set<number>();
  private revealTipGfx: Graphics | null = null;
  // APPEARANCE FX (Stage 26): frontier particles while revealing. The
  // style is synced from params every tick (live dropdown switches, no
  // rebuild); the pooled system + its ParticleContainer are created
  // lazily on the first revealing frame with a non-none style and then
  // live for the renderer's lifetime (the shared texture is page-lifetime
  // - see appear_fx.ts).
  appearFx: AppearFxMode = "none";
  private appearFxSys: AppearFxSystem | null = null;
  private fxScanStart = 0;
  // Reusable tail polyline handed to comet streak emission (consumed
  // synchronously per frontier).
  private fxPathScratch = new Float32Array(FX_PATH_PTS * 2);

  constructor(ps: ParticleSystem, style: RibbonStyle) {
    this.ps = ps;
    this.style = style;
    this.root = new Container();
    this.baseRgb.set(gamutRgb(style.baseHue, 0.5));

    const flowRng = new SeededRNG(((style.flowSeed ?? 1) ^ 0xf10a) >>> 0);
    this.flowNoise = createNoise3D(() => flowRng.next());

    const baseLayer = new Container();
    const filletLayer = new Container();
    const filletTopLayer = new Container();
    // Layer order: base ribbons (the gaps are cut INSIDE them, per pixel),
    // then both fillet layers. The two empty containers keep the historic
    // child indices (0 base, 1 bottom fillets, 2 erases, 3 top fillets,
    // 4 over fills) that the probe scripts toggle - with per-pixel gaps
    // there are no erase or over-fill meshes.
    this.root.addChild(
      baseLayer,
      filletLayer,
      new Container(),
      filletTopLayer,
      new Container()
    );
    // Render-only plucks draw ABOVE every ribbon, erase, fillet and fill
    // (rule 1 in pluck_overlay.ts); the lazily added reveal-tip glow and
    // appearance-FX containers still land on top of it.
    this.plucks = new PluckOverlay(this.makePluckHost());
    this.root.addChild(this.plucks.layer);
    this.filletTopLayer = filletTopLayer;
    if (style.paletteMode) {
      this.filletLayer = filletLayer;
    }
    // Every chain renders through the section shader (the gap mask lives
    // there): palette mode wears the section field, knot mode one constant
    // color per chain (the old tint) with a neutral accent U.
    const accent = accentTexture(style.pathColor);
    this.accentTex = accent;
    bindAccent(accent);

    ps.chains.forEach((chain, i) => {
      this.chainControls.push(new Float32Array(chain.length * 2));
      this.chainSamples.push(null);

      // Sample count fixed from the initial (longest) arc; relaxation only
      // shortens strands, so uniform resampling stays dense enough.
      let arc = 0;
      for (let k = 0; k < chain.length; k++) {
        const a = chain[k];
        const b = chain[(k + 1) % chain.length];
        arc += Math.hypot(
          ps.positions[b * 2] - ps.positions[a * 2],
          ps.positions[b * 2 + 1] - ps.positions[a * 2 + 1]
        );
      }
      const count = Math.max(MIN_SAMPLES, Math.round(arc / SAMPLE_SPACING));

      // An already-carved chain (maze mode) renders as an OPEN ribbon: no
      // closing quad across the removed seam.
      const closed = ps.chainBreakAfter[i] < 0;
      const fill = new RibbonMesh(count, closed, 0xffffff, true, i);
      fill.mesh.texture = accent;
      fill.mesh.shader = sectionShader();
      this.knotRgb.push(this.knotChainRgb(i));
      fill.writePaint(
        new Float32Array(count).fill(U_BASE),
        style.paletteMode ? this.baseRgb : this.knotRgb[i]
      );
      this.fills.push(fill);
      baseLayer.addChild(fill.mesh);
    });
    this.rgbCache = ps.chains.map(() => this.baseRgb);
    this.sectionSegs = ps.chains.map(() => []);
    this.revealMask = ps.chains.map(() => null);
    // GPU junction field: every chain's samples get a contiguous texel
    // range in the shared paint texture (filled by writeFillPaint).
    if (style.paletteMode) {
      this.paintBase = new Int32Array(ps.chains.length);
      let texels = 0;
      for (let i = 0; i < ps.chains.length; i++) {
        this.paintBase[i] = texels;
        texels += this.fills[i].sampleCount;
      }
      paintData().ensure(texels);
    }
    // G2 SHADER PAINT: the per-scene data-texture layout (paint_model.ts).
    // Open chains are always break-after-last (arc grows with the slot).
    this.paintScene = new PaintScene(
      ps.chains.map((chain, i) => ({
        nCtrl: chain.length,
        closed: ps.chainBreakAfter[i] < 0,
        count: this.fills[i].sampleCount,
        paintBase: this.paintBase.length > i ? this.paintBase[i] : 0,
      }))
    );
    const U = knotUniformValues();
    U.uKBase[3] = style.paletteMode ? 1 : 0;
    // A new scene starts with no reveal attached.
    U.uKFx[3] = 0;
    U.uKFx2[2] = 0;
    U.uKInk[1] = 0;

    // Neighboring crossing passes along each thread come from the particle
    // system; passes slide live, so we hold references and read their
    // current fractional positions each frame.
    let crossingIndex = 0;
    for (const crossing of ps.crossings) {
      this.passInfo.set(crossing.over, {
        index: crossingIndex,
        isUnder: false,
      });
      this.passInfo.set(crossing.under, {
        index: crossingIndex,
        isUnder: true,
      });
      crossingIndex++;
      this.overNeighbors.push(ps.passNeighbors(crossing.over));
      this.underNeighbors.push(ps.passNeighbors(crossing.under));
    }
    this.overHalfNeg = new Float32Array(ps.crossings.length);
    this.overHalfPos = new Float32Array(ps.crossings.length);
    this.eraseExtentNeg = new Float32Array(ps.crossings.length);
    this.eraseExtentPos = new Float32Array(ps.crossings.length);
    // Gap slots: registered crossings, then the emergent pool, then the
    // marker discs.
    this.emergentBase = ps.crossings.length;
    this.markerBase = this.emergentBase + EMERGENT_POOL;
    this.gaps = new GapMaskTable(this.markerBase + MARKER_SLOTS);
    bindGap(this.gaps.tex);
    this.slotOverChain = new Int32Array(this.gaps.slots).fill(-1);
    this.slotOverArc = new Float32Array(this.gaps.slots);

    // Junction joinery bookkeeping (fabric only; knot mode has no fused
    // junctions). Arms = directed half-threads leaving each junction.
    this.chainTipFused = ps.chains.map(() => [false, false]);
    if (style.paletteMode && ps.fusedJunctions.length > 0) {
      const slotOf = new Map<number, { chain: number; slot: number }>();
      ps.chains.forEach((chain, ci) => {
        chain.forEach((p, si) => {
          if (!slotOf.has(p)) slotOf.set(p, { chain: ci, slot: si });
        });
      });
      const fusedSet = new Set<number>();
      const groupOf = new Map<number, number[]>();
      for (const grp of ps.fusedJunctions) {
        for (const p of grp) {
          fusedSet.add(p);
          groupOf.set(p, grp);
        }
      }
      const hostOf = (
        p: number,
        fallbackChain: number,
        fallbackCtrl: number
      ): { hostChain: number; hostCtrl: number } => {
        const grp = groupOf.get(p);
        const q = grp?.find((x) => x !== p);
        const occ = q !== undefined ? slotOf.get(q) : undefined;
        return occ
          ? { hostChain: occ.chain, hostCtrl: occ.slot }
          : { hostChain: fallbackChain, hostCtrl: fallbackCtrl };
      };
      ps.chains.forEach((chain, ci) => {
        if (ps.chainBreakAfter[ci] < 0) return;
        if (fusedSet.has(chain[0])) {
          this.chainTipFused[ci][0] = true;
          this.fusedTips.push({
            chain: ci,
            atEnd: false,
            ...hostOf(chain[0], ci, 0),
          });
        } else if (!ps.isAnchored(chain[0])) {
          this.freeTips.push({ chain: ci, atEnd: false });
        }
        if (fusedSet.has(chain[chain.length - 1])) {
          this.chainTipFused[ci][1] = true;
          this.fusedTips.push({
            chain: ci,
            atEnd: true,
            ...hostOf(chain[chain.length - 1], ci, chain.length - 1),
          });
        } else if (!ps.isAnchored(chain[chain.length - 1])) {
          this.freeTips.push({ chain: ci, atEnd: true });
        }
      });
      for (const grp of ps.fusedJunctions) {
        const arms: Array<{ chain: number; slot: number; dir: 1 | -1 }> = [];
        for (const p of grp) {
          const occ = slotOf.get(p);
          if (!occ) continue;
          const len = ps.chains[occ.chain].length;
          const closed = ps.chainBreakAfter[occ.chain] < 0;
          if (closed || occ.slot > 0) {
            arms.push({ chain: occ.chain, slot: occ.slot, dir: -1 });
          }
          if (closed || occ.slot < len - 1) {
            arms.push({ chain: occ.chain, slot: occ.slot, dir: 1 });
          }
        }
        if (arms.length >= 2) {
          this.junctionArms.push({ particles: [...grp], arms });
          // JUNCTION CLEARANCE lookup: ctrl positions of every joint per
          // chain (ctrls are static; arcs are re-derived live each
          // frame).
          const jnIdx = this.junctionArms.length - 1;
          for (const a of arms) {
            let list = this.junctionArcCtrls.get(a.chain);
            if (!list) {
              list = [];
              this.junctionArcCtrls.set(a.chain, list);
            }
            if (!list.some((e) => e.ctrl === a.slot && e.jn === jnIdx)) {
              list.push({ ctrl: a.slot, jn: jnIdx });
            }
          }
        }
      }
    }
  }

  // Knot-mode chain color: the historic per-strand tint (hue by hueGroup
  // slot, golden-angle spaced) as 0..1 RGB for the aColor path - the same
  // bytes the tint multiplied into a white texture.
  private knotChainRgb(i: number): Float32Array {
    const slot = this.style.hueGroup?.[i] ?? i;
    const hex = hslToHex(
      (this.style.baseHue + slot * 137.508) % 360,
      0.45,
      0.64
    );
    return new Float32Array([
      ((hex >> 16) & 255) / 255,
      ((hex >> 8) & 255) / 255,
      (hex & 255) / 255,
    ]);
  }

  // Interpolate position and unit tangent at an arc position into `out`
  // as [x, y, tx, ty]. Closed chains are rings: `count` segments, arcs wrap
  // modulo total. Open chains are runs: `count - 1` segments, arcs CLAMP -
  // the arc-wrap family's fourth bite lived here, in the ring math itself:
  // applied to an open chain it maps any arc within one sample spacing of
  // total onto a phantom last->first chord, so terminal queries (bridge
  // arms, corner tails - arc0 == total) interpolated ~99.8% of the way to
  // the chain's OTHER END. Every fused bridge junction fanned fillet
  // slivers toward its twin junction; the corner junctions drew the
  // start/finish shards.
  private sampleAt(
    samples: SplineSamples,
    arc: number,
    out: Float32Array,
    offset: number
  ): void {
    const total = samples.totalLength;
    let i0: number;
    let i1: number;
    let frac: number;
    if (samples.closed) {
      const wrapped = ((arc % total) + total) % total;
      const f = (wrapped / total) * samples.count;
      i0 = Math.floor(f) % samples.count;
      i1 = (i0 + 1) % samples.count;
      frac = f - Math.floor(f);
    } else {
      const clamped = Math.max(0, Math.min(total, arc));
      const f = (clamped / total) * (samples.count - 1);
      i0 = Math.max(0, Math.min(samples.count - 2, Math.floor(f)));
      i1 = i0 + 1;
      frac = f - i0;
    }

    out[offset] =
      samples.positions[i0 * 2] +
      (samples.positions[i1 * 2] - samples.positions[i0 * 2]) * frac;
    out[offset + 1] =
      samples.positions[i0 * 2 + 1] +
      (samples.positions[i1 * 2 + 1] - samples.positions[i0 * 2 + 1]) * frac;

    let tx =
      samples.tangents[i0 * 2] +
      (samples.tangents[i1 * 2] - samples.tangents[i0 * 2]) * frac;
    let ty =
      samples.tangents[i0 * 2 + 1] +
      (samples.tangents[i1 * 2 + 1] - samples.tangents[i0 * 2 + 1]) * frac;
    const len = Math.hypot(tx, ty) || 1;
    out[offset + 2] = tx / len;
    out[offset + 3] = ty / len;
  }

  // Sample a chain's centerline over arcs [center - neg, center + pos] into
  // a flat [x, y, ...] polyline of at most maxPts points about `spacing`
  // apart; returns the point count (>= 2). Open chains clamp at their ends
  // (sampleAt), which only repeats an endpoint.
  private buildPoly(
    poly: Float32Array,
    samples: SplineSamples,
    center: number,
    neg: number,
    pos: number,
    spacing: number,
    maxPts: number
  ): number {
    const span = Math.max(0, neg + pos);
    const n = Math.max(2, Math.min(maxPts, Math.ceil(span / spacing) + 1));
    for (let m = 0; m < n; m++) {
      this.sampleAt(
        samples,
        center - neg + (span * m) / (n - 1),
        this.sampleScratch,
        0
      );
      poly[m * 2] = this.sampleScratch[0];
      poly[m * 2 + 1] = this.sampleScratch[1];
    }
    return n;
  }

  // Nearest-VERTEX distance from (x, y) to an n-point polyline (dense
  // enough that this is within ~0.01 of the curve at casing range); the
  // nearest index lands in nearIdx. ex > 0 = the SELF-CROSSING exclusion
  // (gap_mask.ts): vertices whose chain arc (s0 + m * st) lies within ex of
  // fa (wrapped by per on rings) are skipped. Infinity if all are.
  private polyDist(
    poly: Float32Array,
    n: number,
    x: number,
    y: number,
    ex = 0,
    fa = 0,
    s0 = 0,
    st = 0,
    per = 0
  ): number {
    let best = Infinity;
    let bi = 0;
    for (let m = 0; m < n; m++) {
      if (ex > 0) {
        let da = s0 + m * st - fa;
        if (per > 0) da -= per * Math.floor(da / per + 0.5);
        if (Math.abs(da) < ex) continue;
      }
      const dx = poly[m * 2] - x;
      const dy = poly[m * 2 + 1] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) {
        best = d2;
        bi = m;
      }
    }
    this.nearIdx = bi;
    return Math.sqrt(best);
  }

  // A protect interval's half-length on one side (computeGapSlot): how far
  // along thread A, from its crossing over thread B at aArc, some lane of
  // A's ribbon still overlaps B's ribbon. A lane at A-arc s overlaps while
  // |delta| < h (1 + |cos|), delta = A's centerline distance to its nearest
  // point on B and cos taken between the two tangents there - for straight
  // threads exactly the estimate w0 = h (1 + |cos|) / sin. So the estimate
  // is probed first (one probe in the common case, and never less than it
  // is returned); only where A is still on B there - the threads bend
  // along each other - does the march continue outward. A short interval
  // left the far end of such an overlap to the cosmetic margin of the
  // crossing where A is the under thread: a dark notch in A exactly where
  // it covers B (19 px at the user URL's x170, all freed by +0.15).
  private protectReach(
    aS: SplineSamples,
    aArc: number,
    dir: number,
    bS: SplineSamples,
    bArc: number,
    h: number,
    w0: number
  ): number {
    const a = this.protScA;
    const b = this.protScB;
    let sb = bArc;
    const overlaps = (s: number): boolean => {
      this.sampleAt(aS, aArc + dir * s, a, 0);
      // Nearest point on B: Newton steps along B from the last one.
      for (let it = 0; it < 3; it++) {
        this.sampleAt(bS, sb, b, 0);
        const step = (a[0] - b[0]) * b[2] + (a[1] - b[1]) * b[3];
        sb += step;
        if (!bS.closed) sb = Math.max(0, Math.min(bS.totalLength, sb));
        if (Math.abs(step) < 1e-4) break;
      }
      this.sampleAt(bS, sb, b, 0);
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const c = Math.abs(a[2] * b[2] + a[3] * b[3]);
      return Math.sqrt(dx * dx + dy * dy) < h * (1 + c);
    };
    if (!overlaps(w0)) return w0;
    let s = w0;
    while (s < w0 + PROTECT_MARCH_MAX) {
      s += PROTECT_STEP;
      if (!overlaps(s)) return s - 0.5 * PROTECT_STEP;
    }
    return s;
  }

  // Arc position of a fractional control position, wrapping around the loop.
  private arcAt(samples: SplineSamples, ctrl: number): number {
    const n = samples.controlArcLengths.length;
    const i = Math.floor(ctrl);
    const t = ctrl - i;
    const i0 = ((i % n) + n) % n;
    const i1 = (i0 + 1) % n;
    const a0 = samples.controlArcLengths[i0];
    let a1 = samples.controlArcLengths[i1];
    if (a1 <= a0) a1 += samples.totalLength;
    return (a0 + (a1 - a0) * t) % samples.totalLength;
  }

  // Ctrl a pass RENDERS at: the true intersection when the physics has
  // one (displayF), else the binding. During a tug the ordering clamps
  // can pin the binding away from where the threads actually cross;
  // drawing there mangles the crossing.
  private renderCtrl(pass: CrossingPass): number {
    return pass.displayF ?? pass.ctrl;
  }

  // Arc gap to the neighboring crossing passes, wrapping around the loop.
  private neighborGaps(
    samples: SplineSamples,
    pass: CrossingPass,
    neighbors: PassNeighbors
  ): [number, number] {
    const total = samples.totalLength;
    // OPEN chains: physics unlinks the open seam by SELF-linking (the first
    // pass's prev and the last pass's next point at the pass itself), so
    // a self-linked side has no neighbor - its room is the run to that
    // chain end. The ring rule below only knew `next === pass` (a
    // single-pass ring): first passes read a ZERO prev gap (their
    // chain-start-side cut sat at the march's 0.15 floor) and last passes
    // ignored their real prev neighbor.
    if (!samples.closed) {
      const selfPrev = neighbors.prev === pass;
      const selfNext = neighbors.next === pass;
      if (selfPrev || selfNext) {
        const c = this.paintArcAt(samples, this.renderCtrl(pass), false);
        const gapPrev = selfPrev
          ? c
          : Math.max(
              0,
              c -
                this.paintArcAt(samples, this.renderCtrl(neighbors.prev), false)
            );
        const gapNext = selfNext
          ? total - c
          : Math.max(
              0,
              this.paintArcAt(samples, this.renderCtrl(neighbors.next), false) -
                c
            );
        return [gapPrev, gapNext];
      }
    }
    if (
      neighbors.next === pass ||
      neighbors.next.ctrl === pass.ctrl
    ) {
      return [total / 2, total / 2];
    }
    const center = this.arcAt(samples, this.renderCtrl(pass));
    const gapNext =
      (((this.arcAt(samples, this.renderCtrl(neighbors.next)) - center) %
        total) +
        total) %
      total;
    const gapPrev =
      (((center - this.arcAt(samples, this.renderCtrl(neighbors.prev))) %
        total) +
        total) %
      total;
    return [gapPrev, gapNext];
  }

  private inspectIndex = -1;
  // Per-crossing diagnostic summary, refreshed each update():
  // [worldX, worldY, gapSpan (the under CENTERLINE's hidden arc span),
  //  overSpan (the gap polyline's arc span), selfPassDist (-1 if not self)]
  private diagData = new Float32Array(0);

  getDiag(): { stride: number; data: Float32Array } {
    return { stride: 5, data: this.diagData };
  }

  // Diagnostic: mark the crossing nearest (x, y) in lattice space; the next
  // update() logs its full render state to the console once.
  requestInspect(x: number, y: number): void {
    let best = -1;
    let bestDist = 1.5;
    const scratch = new Float32Array(2);
    this.ps.crossings.forEach((c, i) => {
      this.ps.bindingPoint(c.over, scratch, 0);
      const d = Math.hypot(scratch[0] - x, scratch[1] - y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    this.inspectIndex = best;
    if (best < 0) console.log("INSPECT: no crossing within 1.5 units");
  }

  // Widths are read per frame during update(), so they apply live.
  setWidths(threadWidth: number, gap: number): void {
    this.style.threadWidth = threadWidth;
    this.style.casingWidth = threadWidth + gap * 2;
  }

  // The flow-undulation displacement field at a world point: out[0..1]
  // receives (dx, dy). Exactly zero at flowStrength 0. Public so the
  // fabric overlay can keep its markers and hit-tests on the displaced
  // threads.
  flowOffset(x: number, y: number, out: Float32Array): void {
    const amp = FLOW_AMP * this.flowStrength;
    if (amp === 0) {
      out[0] = 0;
      out[1] = 0;
      return;
    }
    const t = this.flowTime * FLOW_TIME_SCALE;
    out[0] = amp * this.flowNoise(x * FLOW_FREQ, y * FLOW_FREQ, t);
    out[1] =
      amp * this.flowNoise(x * FLOW_FREQ + 61.7, y * FLOW_FREQ + 47.3, t);
  }

  // Arc position of a chain ctrl (paint-side clamping semantics - safe
  // at open-chain terminals). For overlay consumers.
  arcForCtrl(chain: number, ctrl: number): number {
    const samples = this.chainSamples[chain];
    if (!samples) return 0;
    return this.paintArcAt(
      samples,
      ctrl,
      this.ps.chainBreakAfter[chain] < 0
    );
  }

  // Visibility of overlay material riding a chain at `arc`: 0 inside any
  // crossing gap where THIS chain goes under, ramping back to 1 across
  // the fade extension - so the Ariadne yarn dips under and fades out
  // exactly with its host thread. The ramp floors at a small feather so
  // fadeLength 0 still cuts without pixel-popping. 1 where the chain is
  // the over pass (no window on this chain there).
  underGapVisibility(chain: number, arc: number): number {
    const win = this.underWindows.get(chain);
    if (!win) return 1;
    const samples = this.chainSamples[chain];
    const total = samples ? samples.totalLength : 0;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    // The ramp IS fadeLength (the yarn fades out exactly with its host);
    // the tiny floor only prevents per-station alpha popping at fl=0.
    const ramp = Math.max(0.04, this.fadeLength);
    let vis = 1;
    for (let i = 0; i < win.length; i += 3) {
      let d = arc - win[i];
      if (closed && total > 0) {
        d = ((d % total) + total) % total;
        if (d > total / 2) d -= total;
      }
      const past = d >= 0 ? d - win[i + 2] : -d - win[i + 1];
      const v = past <= 0 ? 0 : Math.min(1, past / ramp);
      if (v < vis) {
        vis = v;
        if (vis === 0) break;
      }
    }
    return vis;
  }

  // --- REVEAL (Stage 22 appearance animation; G2.1 per-pixel FX) ---

  // Attach a running appearance animator; masks start collapsed and grow
  // as the animator's clock advances. Passing null (or the animator
  // finishing) restores the exact non-reveal render. G2.1: the plan's
  // sources (or ink's per-control ignition times) go to the GPU once, here;
  // every pixel then finds its own ignition time, so the FX need no
  // per-frame CPU state - a Replay simply starts a fresh clock.
  beginReveal(anim: RevealAnimator | null): void {
    this.revealAnim = anim;
    this.revealMask = this.ps.chains.map(() => null);
    this.revealTips = [];
    // Fresh reveal, fresh particle field: a Replay-settle resets particle
    // positions, and motes from the previous run would float over the
    // re-angular knot.
    this.appearFxSys?.clear();
    const U = knotUniformValues();
    if (!anim) {
      this.paintScene.setReveal(null, null);
      this.fxLive = false;
      this.fxEnd = -Infinity;
      this.gateOpenAt = -Infinity;
      U.uKFx[3] = 0;
      U.uKFx2[2] = 0;
      U.uKInk[1] = 0;
      return;
    }
    const plan = anim.planData;
    const nCh = this.ps.chains.length;
    if (anim.mode === "ink") {
      // INK IS STATELESS (G2.1): every control's ignition time from its
      // REVEAL-START position (physics + flow, the dye origin likewise) -
      // the dye no longer re-reads settling positions, its edge wobble is
      // the same seeded noise, and the duration is exact.
      const o = plan.origin;
      const olen = this.ps.chains[o.chain].length;
      this.ps.pointOnChain(
        o.chain,
        ((o.ctrl % olen) + olen) % olen,
        this.sampleScratch,
        0
      );
      this.flowOffset(this.sampleScratch[0], this.sampleScratch[1], this.flowScratch);
      const ox = this.sampleScratch[0] + this.flowScratch[0];
      const oy = this.sampleScratch[1] + this.flowScratch[1];
      const pos = this.ps.positions;
      let maxT = 0;
      const tig = this.ps.chains.map((chain) => {
        const out = new Float32Array(chain.length);
        for (let k = 0; k < chain.length; k++) {
          let x = pos[chain[k] * 2];
          let y = pos[chain[k] * 2 + 1];
          this.flowOffset(x, y, this.flowScratch);
          x += this.flowScratch[0];
          y += this.flowScratch[1];
          const d = Math.max(0, Math.hypot(x - ox, y - oy) + anim.inkPerturb(x, y));
          out[k] = d / plan.inkSpeed;
          if (out[k] > maxT) maxT = out[k];
        }
        return out;
      });
      anim.setDuration(maxT + PAINT_CONST.INK_TAPER_WORLD / plan.inkSpeed);
      this.paintScene.setReveal(null, tig, plan.inkSpeed);
    } else {
      const pieces = [];
      for (let c = 0; c < nCh; c++) {
        pieces.push(
          sourcePieces(
            plan.sources[c],
            this.ps.chains[c].length,
            this.ps.chainBreakAfter[c] < 0
          )
        );
      }
      this.paintScene.setReveal(pieces, null, plan.inkSpeed);
      if (this.paintScene.hintOverflow > 0) {
        console.warn(
          `G2 reveal: ${this.paintScene.hintOverflow} control slots are ` +
            "touched by more sources than the shader scans"
        );
      }
    }
    // Clocks: fxNow counts wall seconds from now; one speed knot.
    this.revealWall0 = this.paintClock;
    const K = U.uKKnots;
    K.fill(0);
    K[0] = 0;
    K[1] = 0;
    K[2] = 1 / Math.max(1e-6, anim.speed);
    K[3] = 1;
    this.knotCount = 1;
    this.fxLive = true;
    this.fxEnd = Infinity;
    this.gateOpenAt = Infinity;
    if (this.gateLatch.length !== this.ps.crossings.length) {
      this.gateLatch = new Float64Array(this.ps.crossings.length);
    }
    this.gateLatch.fill(Number.NaN);
    this.jointLatch.clear();
    this.gateRev++;
    if (this.gateCache.length !== 4 * this.ps.crossings.length) {
      this.gateCache = new Float64Array(4 * this.ps.crossings.length);
    }
    this.gateCache.fill(Number.NaN);
    this.jointCache.clear();
    U.uKInk[0] = plan.inkSpeed;
    U.uKInk[1] = anim.mode === "ink" ? 1 : 0;
    U.uKFx[1] = 0;
    U.uKFx[2] = 0;
    U.uKFx[3] = 1;
    U.uKFx2[2] = 1;
    this.syncFxStyle();
  }

  // The FX style and frontier shape uniforms from the live dropdown. Knot
  // mode never wears appearance colors (as before G2); ink never burns
  // (it has no fronts - unchanged behavior, K4).
  private syncFxStyle(): void {
    const U = knotUniformValues();
    const ink = this.revealAnim?.mode === "ink" || U.uKInk[1] > 0.5;
    let st: number = FX_STYLE[this.appearFx];
    if (!this.style.paletteMode) st = FX_STYLE.none;
    if (ink && (st === FX_STYLE.burn || st === FX_STYLE.roots)) st = FX_STYLE.none;
    const was0 = U.uKFx[0];
    const was1 = U.uKShape[0];
    const was2 = U.uKShape[1];
    U.uKFx[0] = st;
    const [taperMul, tipFloor] = this.revealShape();
    U.uKShape[0] = REVEAL_TAPER_ARC * taperMul;
    U.uKShape[1] = tipFloor;
    // Show-time inputs changed: cached gate solves lapse.
    if (U.uKFx[0] !== was0 || U.uKShape[0] !== was1 || U.uKShape[1] !== was2) {
      this.gateRev++;
    }
    const rainbow = this.appearFx === "rainbow";
    U.uKShape[2] = rainbow ? RAINBOW_GLOW_ARC : REVEAL_GLOW_ARC;
    U.uKShape[3] = rainbow ? RAINBOW_GLOW_ARC * RAINBOW_GLOW_HOLD : 0;
  }

  // Append a speed knot (anim time, reveal wall time, 1 / speed). A knot
  // within one frame of the last one REPLACES its speed (slider drags);
  // a full table folds history that is long since cooled (every FX settles
  // within FX_TAIL of ignition) into the FLOOR knot (wall -1e4, inv 0).
  private addKnot(animT: number, wallT: number, inv: number): void {
    this.gateRev++; // Every path below edits the table (gate caches lapse).
    const K = knotUniformValues().uKKnots;
    const last = (this.knotCount - 1) * 4;
    if (wallT - K[last + 1] < 1 / 30) {
      // Re-anchor the last knot so the curve stays continuous at animT.
      const w = K[last + 1] + (animT - K[last]) * K[last + 2];
      K[last] = animT;
      K[last + 1] = w;
      K[last + 2] = inv;
      return;
    }
    if (this.knotCount >= MAX_KNOTS) {
      // Drop knots whose successor started before (now - FX_TAIL): their
      // material is fully cooled whatever wall time it maps to.
      let keep = 1;
      while (keep < this.knotCount - 1 && K[(keep + 1) * 4 + 1] < wallT - FX_TAIL) {
        keep++;
      }
      if (keep > 1) {
        const tail = K.slice(keep * 4, this.knotCount * 4);
        K.fill(0, 4);
        K[0] = 0;
        K[1] = -1e4;
        K[2] = 0;
        K[3] = 1;
        K.set(tail, 4);
        this.knotCount = 1 + tail.length / 4;
      }
      if (this.knotCount >= MAX_KNOTS) {
        const l = (this.knotCount - 1) * 4;
        const w = K[l + 1] + (animT - K[l]) * K[l + 2];
        K[l] = animT;
        K[l + 1] = w;
        K[l + 2] = inv;
        return;
      }
    }
    const o = this.knotCount * 4;
    K[o] = animT;
    K[o + 1] = wallT;
    K[o + 2] = inv;
    K[o + 3] = 1;
    this.knotCount++;
  }

  // Reveal multiplier at a chain ctrl (1 once fully revealed / inactive).
  // Public: the fabric overlay gates its exit marker on this, and main.ts
  // wires it through to probes.
  revealMulAtCtrl(chain: number, ctrl: number): number {
    const mask = this.revealMask[chain];
    if (!mask) return 1;
    const samples = this.chainSamples[chain];
    if (!samples || samples.totalLength <= 0) return 0;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const arc = this.paintArcAt(samples, ctrl, closed);
    const count = mask.length;
    const k = closed
      ? Math.round((arc / samples.totalLength) * count) % count
      : Math.max(
          0,
          Math.min(
            count - 1,
            Math.round((arc / samples.totalLength) * (count - 1))
          )
        );
    return mask[k];
  }

  // Per-style frontier shaping, [taper multiplier, tip width floor] (the
  // uKShape uniforms; the mask and the per-pixel ages read them).
  private revealShape(): [number, number] {
    switch (this.appearFx) {
      case "comet":
        return [8, 0.5];
      case "rainbow":
        // A short rounded head that blooms straight into the width swell
        // - the old long needle taper hid the swell.
        return [1.6, 0.55];
      case "roots":
        return [16, 0];
      default:
        return [1, 0];
    }
  }

  // The wall time (reveal-relative) from which chain `chain`'s appearance
  // FX are all the identity (KGEOM G0.z; paint_math kFxDoneWall): the
  // shaders skip the FX evaluation there. 1e9 = never skip.
  private chainFxDone(chain: number): number {
    if (!this.fxLive) return 1e9;
    return kFxDoneWall(knotUniformValues(), this.paintScene.revealSpan(chain)[1]);
  }

  // The wall time (reveal-relative) a crossing pass may show its gap: its
  // reveal mask has reached REVEAL_CROSSING_MIN and its appearance FX have
  // settled (rainbow past its swell, dust/comet opaque). The GPU ramps the
  // gap in from it (paint_math kRevealTime / kFxSettleWall).
  private passShowTime(chain: number, ctrl: number): number {
    const D = this.kd;
    const U = knotUniformValues();
    const c = this.kcv[chain] ?? kChain(D, chain);
    const n = c.nCtrl;
    const x = c.closed ? ctrl - n * Math.floor(ctrl / n) : Math.max(0, Math.min(n - 1, ctrl));
    const g = kIgnition(D, U, c, x, this.ignTmp);
    const fallback = this.revealAnim ? this.revealAnim.planDuration : 0;
    const tRev = kRevealTime(D, U, c, g, x, fallback);
    return Math.max(kWall(U, tRev), kFxSettleWall(U, g));
  }

  // A joint's (or a lone cap's) gate texel J1 = (tOn, tLast), wall times:
  // shown once every given point is revealed, fading in as the latest-
  // ignited one's appearance FX settles (paint_glsl knotFanAlpha).
  // Ungated (no reveal, FX settled): far past.
  private jointGate(
    key: string,
    points: Array<[number, number]>
  ): [number, number] {
    if (!this.fxLive) return [-1e9, -1e9];
    const D = this.kd;
    const U = knotUniformValues();
    const fallback = this.revealAnim ? this.revealAnim.planDuration : 0;
    let tOn = -1e9;
    let tLast = -1e9;
    // Open joints keep their times (latched; nothing left to solve).
    const L = this.jointLatch.get(key);
    if (L !== undefined) return L;
    // A pending joint reuses its last solve while its points hold still
    // (see gateCache).
    const C = this.jointCache.get(key);
    let fresh = C !== undefined && C.rev === this.gateRev && C.ctrls.length === points.length;
    for (let i = 0; fresh && i < points.length; i++) {
      if (Math.abs(points[i][1] - C!.ctrls[i]) >= GATE_CTRL_EPS) fresh = false;
    }
    let out: [number, number];
    if (fresh) {
      out = C!.out;
    } else {
      for (const [chain, ctrl] of points) {
        const c = this.kcv[chain] ?? kChain(D, chain);
        const n = c.nCtrl;
        const x = c.closed
          ? ctrl - n * Math.floor(ctrl / n)
          : Math.max(0, Math.min(n - 1, ctrl));
        const g = kIgnition(D, U, c, x, this.ignTmp);
        tOn = Math.max(tOn, kWall(U, kRevealTime(D, U, c, g, x, fallback)));
        if (g.hit) tLast = Math.max(tLast, kWall(U, g.tA));
      }
      out = [tOn, tLast];
      const ctrls = C && C.ctrls.length === points.length ? C.ctrls : new Float64Array(points.length);
      for (let i = 0; i < points.length; i++) ctrls[i] = points[i][1];
      this.jointCache.set(key, { rev: this.gateRev, ctrls, out });
    }
    if (U.uKFx[2] >= out[0]) {
      this.jointLatch.set(key, out);
      this.jointCache.delete(key);
    }
    return out;
  }

  // A crossing's show time (-Infinity when no reveal / FX gates it).
  private crossingShowTime(crossing: {
    over: CrossingPass;
    under: CrossingPass;
  }): number {
    if (!this.fxLive) return -Infinity;
    return Math.max(
      this.passShowTime(crossing.over.chain, this.renderCtrl(crossing.over)),
      this.passShowTime(crossing.under.chain, this.renderCtrl(crossing.under))
    );
  }

  // The gap slot strength for a show time: 1 (ungated or long open), or the
  // GATED encoding -(1 + tShow) the gap shader ramps from the clock
  // (gap_mask.ts). Tracks the latest pending show time (gateOpenAt).
  private gateStrength(tShow: number, fxNow: number): number {
    if (!(tShow > -1e8) || fxNow >= tShow + PAINT_CONST.CROSSING_FADE_IN) {
      return 1;
    }
    if (tShow > this.gateOpenAt) this.gateOpenAt = tShow;
    return -(1 + Math.max(0, tShow));
  }

  // One chain's ribbon WIDTH multiplier for this frame (CPU mirror of the
  // reveal mask, times the rainbow swell), or null when every sample is at
  // full width - the fills then take their untouched fast path, so the
  // finished state is bit-identical to a non-reveal render. Also records
  // the pure mask in revealMask[chain] (null = fully revealed).
  private widthMulFor(chain: number, samples: SplineSamples): Float32Array | null {
    this.revealMask[chain] = null;
    if (!this.fxLive) return null;
    const U = knotUniformValues();
    const reveal = this.revealOn;
    const swell = U.uKFx[0] === FX_STYLE.rainbow && U.uKFx[3] > 0.5;
    if (!reveal && !swell) return null;
    const D = this.kd;
    const c = this.kcv[chain];
    const count = samples.count;
    let mask = this.revealMaskPool.get(chain);
    if (!mask || mask.length !== count) {
      mask = new Float32Array(count);
      this.revealMaskPool.set(chain, mask);
    }
    let width = this.widthScratch.get(chain);
    if (!width || width.length !== count) {
      width = new Float32Array(count);
      this.widthScratch.set(chain, width);
    }
    const n = c.nCtrl;
    const t = U.uKFx[1];
    // FAST PATHS from the chain's reveal window (anim seconds, from the
    // plan): wholly revealed (and past its swell) -> null; not started ->
    // all zero.
    const [tStart, tDone] = this.paintScene.revealSpan(chain);
    const swellHere =
      swell && t >= tStart && U.uKFx[2] < kWall(U, tDone) + RAINBOW_SWELL_END;
    const maskDone = !reveal || t >= tDone;
    if (maskDone && !swellHere) return null;
    if (reveal && t < tStart) {
      mask.fill(0);
      this.revealMask[chain] = mask;
      return mask;
    }
    let minM = 1;
    let anyW = false;
    let slot = 0;
    for (let k = 0; k < count; k++) {
      // The sample's ctrl: the bake's monotone walk over this frame's arc
      // table (paint_math kCtrlOfArc, incrementally).
      const a = kSampleArc(c, k);
      while (slot < n - 1 && kCA(D, c, slot + 1) <= a) slot++;
      const a0 = kCA(D, c, slot);
      const a1 = slot < n - 1 ? kCA(D, c, slot + 1) : c.total;
      const ctrl = slot + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
      const m = maskDone ? 1 : kRevealMaskAt(D, U, c, ctrl);
      mask[k] = m;
      if (m < minM) minM = m;
      let w = m;
      if (swellHere && m > 0) {
        const g = kIgnition(D, U, c, ctrl, this.ignTmp);
        if (g.hit && t >= g.tA) w *= kSwell(kFxAge(U, g));
      }
      width[k] = w;
      if (w !== 1) anyW = true;
    }
    if (reveal && minM < 1) this.revealMask[chain] = mask;
    return anyW ? width : null;
  }

  // One-shot restore when the animator completes (or is detached): masks
  // dropped, tip glow cleared (every crossing's gap slot is rewritten by
  // this same update). The next paint tick clears any frontier glow (its
  // chain set goes empty). The FX tail (fxEnd) is armed by advanceClocks.
  private finishReveal(): void {
    this.revealAnim = null;
    this.revealMask = this.ps.chains.map(() => null);
    this.revealTips = [];
    this.revealTipGfx?.clear();
  }

  // Knot-mode frontier glow: small additive discs at the advancing tips
  // (fabric mode rides the palette instead - flat overlays cannot
  // represent the blended field there).
  private drawRevealTips(): void {
    if (this.style.paletteMode) return;
    const anim = this.revealAnim;
    const active = this.revealOn && anim !== null && anim.mode !== "ink";
    if (!active) {
      this.revealTipGfx?.clear();
      return;
    }
    if (!this.revealTipGfx) {
      // NORMAL blending, deliberately: the canvas is TRANSPARENT (Stage
      // 18 - gaps clip the thread layer), so an additive halo over empty
      // canvas adds into nothing and composites as a muddy grey disc on
      // the page backdrop. Bright warm fills under normal blending read
      // as a glow over both the backdrop and the threads.
      this.revealTipGfx = new Graphics();
      this.root.addChild(this.revealTipGfx);
    }
    const g = this.revealTipGfx;
    g.clear();
    const tw = this.style.threadWidth;
    for (const tip of anim!.tips()) {
      const len = this.ps.chains[tip.chain].length;
      const closed = this.ps.chainBreakAfter[tip.chain] < 0;
      const f = closed
        ? ((tip.ctrl % len) + len) % len
        : Math.max(0, Math.min(len - 1, tip.ctrl));
      this.ps.pointOnChain(tip.chain, f, this.sampleScratch, 0);
      this.flowOffset(
        this.sampleScratch[0],
        this.sampleScratch[1],
        this.flowScratch
      );
      const x = this.sampleScratch[0] + this.flowScratch[0];
      const y = this.sampleScratch[1] + this.flowScratch[1];
      g.circle(x, y, tw * 1.35);
      g.fill({ color: 0xffedb8, alpha: 0.26 });
      g.circle(x, y, tw * 0.75);
      g.fill({ color: 0xfff6d8, alpha: 0.6 });
      g.circle(x, y, tw * 0.4);
      g.fill({ color: 0xffffff, alpha: 0.95 });
    }
  }

  // Live particle count (diagnostics / probes).
  appearFxAlive(): number {
    return this.appearFxSys?.aliveCount ?? 0;
  }

  // ---- G2 PROBE HOOKS (diagnostics only) --------------------------------

  // The probe triangle mesh (ribbon_mesh.ts ProbeTriMesh), created on first
  // use with `capacity` triangles, drawn with the section shader above every
  // ribbon layer. Hidden (renderable false) until a probe enables it.
  probeTris(capacity: number): ProbeTriMesh {
    if (!this.probeMesh || this.probeMesh.capacity < capacity) {
      if (this.probeMesh) this.probeMesh.mesh.destroy();
      this.probeMesh = new ProbeTriMesh(capacity);
      this.probeMesh.mesh.shader = sectionShader();
      this.root.addChild(this.probeMesh.mesh);
    }
    return this.probeMesh;
  }

  // The CPU mirror's view of this frame (paint_math.ts): the data-texture
  // mirrors, the uniform values, and helpers for probe scripts.
  paintMirror(): {
    data: ReturnType<typeof kData>;
    uniforms: ReturnType<typeof knotUniformValues>;
    chain: (ch: number) => ReturnType<typeof kChain>;
    ctrlOfArc: (ch: number, arc: number) => number;
    ctrlNear: (ch: number, arc: number, approx: number) => number;
    // The section color at an arc (the ribbon's own Gouraud).
    sectionAt: (ch: number, arc: number) => number[];
    // The section shader's color at a material point before the gameplay
    // accent: [r, g, b, alpha] (FX on the given base color).
    shadeFx: (ch: number, arc: number, side: number, base: number[]) => number[];
    // The point's ignition (anim time; Infinity = none) and FX age.
    ignition: (ch: number, arc: number) => { tA: number; age: number };
  } {
    const data = kData();
    const U = knotUniformValues();
    const scratch = new Float32Array(3);
    return {
      data,
      uniforms: U,
      chain: (ch) => kChain(data, ch),
      ctrlOfArc: (ch, arc) => kCtrlOfArc(data, kChain(data, ch), arc),
      ctrlNear: (ch, arc, approx) =>
        kCtrlNear(data, kChain(data, ch), arc, approx),
      sectionAt: (ch, arc) => {
        this.sectionAtArc(ch, arc, scratch);
        return [scratch[0], scratch[1], scratch[2]];
      },
      shadeFx: (ch, arc, side, base) => {
        const c = kChain(data, ch);
        const rgb = [base[0], base[1], base[2]];
        const a = kShadeFx(
          data,
          U,
          c,
          kCtrlOfArc(data, c, arc),
          arc / c.arcPer,
          side,
          rgb
        );
        return [rgb[0], rgb[1], rgb[2], a];
      },
      ignition: (ch, arc) => {
        const c = kChain(data, ch);
        const g = kIgnition(data, U, c, kCtrlOfArc(data, c, arc));
        return {
          tA: g.hit ? g.tA : Infinity,
          age: g.hit ? kFxAge(U, g) : -Infinity,
        };
      },
    };
  }

  // PROBE: pin the running reveal at anim time `t` (and the FX clock at its
  // wall time through the speed knots), then stop both clocks - the next
  // update() evaluates masks and gates there, and the shaders render that
  // instant. Returns false when no reveal is attached.
  revealPin(t: number): boolean {
    const anim = this.revealAnim;
    if (!anim) return false;
    const a = anim as unknown as { t: number; done: boolean; tick: () => void };
    a.t = t;
    a.done = t >= anim.planDuration;
    a.tick = () => {};
    this.paintClock = this.revealWall0 + kWall(knotUniformValues(), t);
    if (!anim.done) this.fxEnd = Infinity;
    Object.getPrototypeOf(this).advanceClocks.call(this, 0);
    this.advanceClocks = () => {};
    return true;
  }

  // APPEARANCE FX: spawn at every advancing frontier, then advance the
  // pool. Runs with tickPaint in every ticker branch (awake, asleep,
  // paused) so the particles keep flying while the physics sleeps. With no
  // system and no reveal this is a two-compare early-return, and once the
  // reveal ends the pool drains and tick() degenerates to one compare -
  // zero per-frame work after the field empties. Spawning skips while the
  // tab is hidden (a resumed tab would burst the whole backlog at once).
  private tickAppearFx(dt: number): void {
    const anim = this.revealAnim;
    const emitting =
      this.revealOn && anim !== null && this.appearFx !== "none";
    if (!this.appearFxSys) {
      if (!emitting) return;
      this.appearFxSys = new AppearFxSystem((this.style.flowSeed ?? 1) >>> 0);
      // Topmost thread-layer child: above every ribbon/fill (and the
      // knot-mode tip glow, created by this frame's earlier update()).
      this.root.addChild(this.appearFxSys.container);
    }
    const fx = this.appearFxSys;
    if (emitting && !document.hidden) {
      fx.style = this.appearFx as Exclude<AppearFxMode, "none">;
      fx.unit = this.style.threadWidth;
      if (anim!.mode === "ink") this.spawnInkFrontier(fx, anim!, dt);
      else this.spawnTipFrontier(fx, anim!, dt);
    }
    fx.tick(dt);
  }

  // Interval modes (trace/bloom/draw): one emitter per advancing reveal
  // tip. Position and tangent come from the live chain samples through the
  // clamping paint-arc path (the arc-wrap family bites open-chain
  // terminals otherwise), so emitters ride flow displacement and tip tucks
  // exactly like the ribbons. The travel direction is the sample tangent
  // signed by the plan's ctrl-axis dir; speed converts ctrl/s to world
  // units through the chain's arc-per-ctrl.
  private spawnTipFrontier(
    fx: AppearFxSystem,
    anim: RevealAnimator,
    dt: number
  ): void {
    const tips = anim.tips();
    if (tips.length === 0) return;
    // Rotate which tip gets first claim on the pool budget.
    const offset = this.fxScanStart++ % tips.length;
    for (let k = 0; k < tips.length; k++) {
      const tip = tips[(k + offset) % tips.length];
      const samples = this.chainSamples[tip.chain];
      if (!samples || samples.totalLength <= 0) continue;
      const closed = this.ps.chainBreakAfter[tip.chain] < 0;
      const arc = this.paintArcAt(samples, tip.ctrl, closed);
      const perCtrl =
        samples.totalLength / Math.max(1, this.ps.chains[tip.chain].length);
      // Comet streaks lie along the HOST THREAD: hand the emitter a short
      // polyline over the revealed side (tip backward), so its strokes
      // orient to the thread's local tangents instead of the head chord.
      // Built BEFORE the tip sample below - both share sampleScratch.
      let path: Float32Array | null = null;
      let pathPts = 0;
      if (this.appearFx === "comet") {
        path = this.fxPathScratch;
        pathPts = FX_PATH_PTS;
        for (let j = 0; j < FX_PATH_PTS; j++) {
          const aj = arc - tip.dir * j * FX_PATH_STEP;
          this.sampleAt(samples, aj, this.sampleScratch, 0);
          path[j * 2] = this.sampleScratch[0];
          path[j * 2 + 1] = this.sampleScratch[1];
        }
      }
      this.sampleAt(samples, arc, this.sampleScratch, 0);
      fx.spawnFrontier(
        this.sampleScratch[0],
        this.sampleScratch[1],
        this.sampleScratch[2] * tip.dir,
        this.sampleScratch[3] * tip.dir,
        tip.rate * anim.speed * perCtrl,
        dt,
        path,
        pathPts
      );
    }
  }

  // Ink mode has no plan tips (the dye front is a world-distance field);
  // the frontier is wherever a chain's mask crosses half-reveal. Scan the
  // live masks for 0.5-crossings between adjacent samples and emit there,
  // travel direction toward the unrevealed side, speed = the dye's radial
  // rate. Budgeted + chain-rotated so dye rings that slice many threads
  // neither explode the spawn count nor starve high-numbered chains.
  private spawnInkFrontier(
    fx: AppearFxSystem,
    anim: RevealAnimator,
    dt: number
  ): void {
    const chains = this.ps.chains.length;
    if (chains === 0) return;
    const speed = anim.inkRate;
    const start = this.fxScanStart++ % chains;
    let budget = 48;
    for (let ci = 0; ci < chains && budget > 0; ci++) {
      const chain = (ci + start) % chains;
      const mask = this.revealMask[chain];
      if (!mask) continue;
      const samples = this.chainSamples[chain];
      if (!samples || samples.totalLength <= 0) continue;
      const count = mask.length;
      const closed = this.ps.chainBreakAfter[chain] < 0;
      const arcPer = closed
        ? samples.totalLength / count
        : samples.totalLength / (count - 1);
      const lim = closed ? count : count - 1;
      for (let k = 0; k < lim && budget > 0; k++) {
        const m0 = mask[k];
        const m1 = mask[(k + 1) % count];
        if (m0 === m1 || (m0 - 0.5) * (m1 - 0.5) > 0) continue;
        const f = (0.5 - m0) / (m1 - m0);
        this.sampleAt(samples, (k + f) * arcPer, this.sampleScratch, 0);
        const dir = m0 > m1 ? 1 : -1; // Toward the unrevealed side.
        fx.spawnFrontier(
          this.sampleScratch[0],
          this.sampleScratch[1],
          this.sampleScratch[2] * dir,
          this.sampleScratch[3] * dir,
          speed,
          dt
        );
        budget--;
      }
    }
  }

  update(): void {
    const { positions } = this.ps;
    this.updateCount++;
    // Mirror arrays may have been swapped by a texture growth (ensure()).
    this.kd = kData();
    // Joinery geometry follows (rebuildFillets rebuilds on a new revision).
    this.geomRev++;
    // Under-gap windows are rebuilt from scratch by this frame's
    // crossing solves (renderCrossing appends).
    this.underWindows.clear();

    // Reveal lifecycle: refresh the active flag, and on the completion
    // frame restore the full render exactly once.
    const ra = this.revealAnim;
    this.revealOn = ra !== null && !ra.done;
    if (!this.revealOn && this.revealWas) this.finishReveal();
    this.revealWas = this.revealOn;

    this.ps.chains.forEach((chain, i) => {
      const controls = this.chainControls[i];
      for (let k = 0; k < chain.length; k++) {
        controls[k * 2] = positions[chain[k] * 2];
        controls[k * 2 + 1] = positions[chain[k] * 2 + 1];
      }
      // Flow undulation: displace the control COPIES (never the physics
      // state) so the splines and the whole crossing machinery downstream
      // ride one coherent field.
      if (this.flowStrength > 0) {
        for (let k = 0; k < chain.length; k++) {
          this.flowOffset(controls[k * 2], controls[k * 2 + 1], this.flowScratch);
          controls[k * 2] += this.flowScratch[0];
          controls[k * 2 + 1] += this.flowScratch[1];
        }
      }
      const brk = this.ps.chainBreakAfter[i];
      const samples =
        brk < 0
          ? sampleClosedSpline(controls, this.fills[i].sampleCount)
          : sampleOpenSpline(controls, this.fills[i].sampleCount, brk);
      // Fused arm tips tuck back by the host's half-width: the terminal
      // particle sits ON the host centerline, so an untucked ribbon
      // overhangs the host and reads as a floating scrap / gapless fake
      // crossing. The fillet pass rounds the resulting butt joint.
      if (brk >= 0) {
        const [fusedA, fusedB] = this.chainTipFused[i];
        if (fusedA || fusedB) this.tuckFusedTips(samples, fusedA, fusedB);
      }
      this.chainSamples[i] = samples;
      // G2: this frame's arc table for the shaders (KGEOM), and the
      // chain's mirror view over it.
      this.paintScene.writeGeom(
        i,
        samples.totalLength,
        samples.count,
        samples.closed,
        samples.controlArcLengths,
        this.chainFxDone(i)
      );
      this.kcv[i] = kChain(this.kd, i, this.kcv[i]);
      if (this.style.paletteMode && !this.rgbCacheReady) {
        this.buildRgbCacheFor(i, samples);
      } else if (
        this.style.paletteMode &&
        this.cacheDrift(i, samples) > CACHE_REBAKE_CTRL
      ) {
        this.buildRgbCacheFor(i, samples);
        this.recolorPending.add(i);
      }
      const width = this.widthMulFor(i, samples);
      this.widthLast[i] = width;
      this.fills[i].update(
        samples.positions,
        samples.tangents,
        this.style.threadWidth / 2,
        0,
        this.withPluckCollapse(i, samples.count, width)
      );
    });
    if (this.style.paletteMode && !this.rgbCacheReady) {
      this.rgbCacheReady = true;
      // One full paint write so every chain wears its section colors;
      // chains with gameplay paint get rewritten by the next paint tick.
      this.ps.chains.forEach((_, i) => {
        const count = this.fills[i].sampleCount;
        let us = this.uScratch.get(i);
        if (!us || us.length < count) {
          us = new Float32Array(count);
          this.uScratch.set(i, us);
        }
        us.fill(U_BASE, 0, count);
        this.writeFillPaint(i, us, this.rgbCache[i]);
      });
      this.chainRev.clear();
    }

    const fillHalf = this.style.threadWidth / 2;
    const gap = (this.style.casingWidth - this.style.threadWidth) / 2;

    // CROSSING GATES (reveal + appearance FX, G2.1): a crossing's gap shows
    // once BOTH its passes are revealed there (a gap for an invisible over
    // thread would cut a naked hole in a revealed under thread) and their
    // FX have settled (a gap through a translucent / swollen pass reads as a
    // hole). The slot is written regardless, carrying its SHOW TIME; the
    // GPU fades it in from the clock (CROSSING_FADE_IN, smoothstep - one
    // ramp serves both draw orders: where the UNDER thread draws on top, a
    // partial mask crossfades the over thread in THROUGH it). The CPU-side
    // bookkeeping that follows a gap (underWindows, pluck footprints) waits
    // for the show time.
    const fxNow = knotUniformValues().uKFx[2];
    this.gateOpenAt = -Infinity;
    for (const w of this.chainWins.values()) w.length = 0; // Pooled arrays.
    this.gaps.setEnabled(this.maskEnabled, this.maskDebug);
    this.ps.crossings.forEach((crossing, c) => {
      let tShow = -Infinity;
      if (this.fxLive) {
        const L = this.gateLatch.length > c ? this.gateLatch[c] : Number.NaN;
        if (!Number.isNaN(L)) {
          tShow = L;
        } else {
          const co = this.renderCtrl(crossing.over);
          const cu = this.renderCtrl(crossing.under);
          const G = this.gateCache;
          const o = 4 * c;
          if (
            o + 3 < G.length &&
            G[o + 3] === this.gateRev &&
            Math.abs(co - G[o + 1]) < GATE_CTRL_EPS &&
            Math.abs(cu - G[o + 2]) < GATE_CTRL_EPS
          ) {
            tShow = G[o];
          } else {
            tShow = Math.max(
              this.passShowTime(crossing.over.chain, co),
              this.passShowTime(crossing.under.chain, cu)
            );
            if (o + 3 < G.length) {
              G[o] = tShow;
              G[o + 1] = co;
              G[o + 2] = cu;
              G[o + 3] = this.gateRev;
            }
          }
          if (fxNow >= tShow) this.gateLatch[c] = tShow;
        }
        // A gate opening well in the future skips its slot solve this frame
        // (as master skipped hidden crossings): update() keeps running while
        // gates are pending, so the slot is solved before its ramp starts.
        if (fxNow < tShow - GATE_LEAD) {
          if (tShow > this.gateOpenAt) this.gateOpenAt = tShow;
          this.eraseExtentPos[c] = 0;
          this.eraseExtentNeg[c] = 0;
          this.overHalfPos[c] = 0;
          this.overHalfNeg[c] = 0;
          this.gaps.clearSlot(c);
          return;
        }
      }
      this.computeGapSlot(
        c,
        crossing,
        c,
        this.overNeighbors[c],
        this.underNeighbors[c],
        fillHalf,
        gap,
        this.gateStrength(tShow, fxNow),
        fxNow >= tShow
      );
    });
    this.renderEmergent(fillHalf, gap);
    this.renderMarkerGaps(fillHalf, gap);
    this.assignGapIds();
    this.gaps.upload();
    this.paintScene.flushGeom();
    this.drawRevealTips();
  }

  // Is the neighbor pass `nb` (along `pass`'s chain) part of a crossing
  // with the SAME other chain as this crossing - a twist twin, where the
  // over/under roles swap - or this crossing's own partner? Those split at
  // the midpoint (NB_CLEAR_TWIN).
  private twinNeighbor(
    crossing: { over: CrossingPass; under: CrossingPass },
    pass: CrossingPass,
    nb: CrossingPass
  ): boolean {
    if (nb === pass) return false;
    if (nb === crossing.over || nb === crossing.under) return true;
    const info = this.passInfo.get(nb);
    if (!info) return false;
    const cr = this.ps.crossings[info.index];
    const nbOther = info.isUnder ? cr.over : cr.under;
    const other = pass === crossing.over ? crossing.under : crossing.over;
    return nbOther.chain === other.chain;
  }

  // Solve one crossing's GAP SLOT: the under thread's arc window, the
  // over thread's local polyline, and the under centerline's hidden span
  // (underWindows). slot = the table row; index = the registered crossing
  // (-1 for emergent ones: no neighbor lists, no diagnostics).
  private computeGapSlot(
    slot: number,
    crossing: { over: CrossingPass; under: CrossingPass; sign?: number },
    index: number,
    overNbIn: PassNeighbors | null,
    underNbIn: PassNeighbors | null,
    fillHalf: number,
    gap: number,
    strength: number,
    shown = true
  ): void {
    const overNb = overNbIn ?? { prev: crossing.over, next: crossing.over };
    const underNb =
      underNbIn ?? { prev: crossing.under, next: crossing.under };
    const overSamples = this.chainSamples[crossing.over.chain]!;
    const underSamples = this.chainSamples[crossing.under.chain]!;
    const overCenter = this.arcAt(overSamples, this.renderCtrl(crossing.over));
    const underCenter = this.arcAt(
      underSamples,
      this.renderCtrl(crossing.under)
    );
    const totalO = overSamples.totalLength;
    const totalU = underSamples.totalLength;
    this.slotOverChain[slot] = crossing.over.chain;
    this.slotOverArc[slot] = overCenter;

    // SELF-crossings: the arc between the two passes splits at its
    // midpoint (less a small guard) between the over polyline and the
    // under window, so the window never masks the over pass's own
    // material and the polyline never measures the under region against
    // itself. fwd/bwd = arc from the over pass forward/backward to the
    // under pass (an open chain reaches it in one direction only).
    const selfCross = crossing.over.chain === crossing.under.chain;
    let splitFwd = Infinity;
    let splitBwd = Infinity;
    let selfDist = -1;
    if (selfCross) {
      let fwd: number;
      let bwd: number;
      if (overSamples.closed) {
        fwd = (((underCenter - overCenter) % totalO) + totalO) % totalO;
        bwd = totalO - fwd;
      } else {
        fwd = underCenter > overCenter ? underCenter - overCenter : Infinity;
        bwd = overCenter > underCenter ? overCenter - underCenter : Infinity;
      }
      splitFwd = Math.max(0.12, fwd / 2 - 0.08);
      splitBwd = Math.max(0.12, bwd / 2 - 0.08);
      selfDist = Math.min(fwd, bwd);
    }

    const margin = gap + CUT_BIAS;
    const fade = this.fadeLength;
    const perp = this.gapMode === "perp";
    // Footprint reach: a point farther than this from the other thread's
    // centerline can neither be hidden nor hide anything.
    const exitD =
      fillHalf * (1 + UNDER_FOOT_PER_HALF) + margin + fade + GAP_EXIT_PAD;
    // SELF-CROSSING exclusion (gap_mask.ts): a thread never measures itself
    // within this much arc - along an unfolded thread that is farther than
    // any hide reach (both half-widths + margin + fade).
    const selfEx = selfCross
      ? 2 * fillHalf + margin + fade + GAP_EXIT_PAD
      : 0;
    const per = selfCross && overSamples.closed ? totalO : 0;
    const cutReach = Math.max(
      CUT_REACH_MIN,
      fillHalf * CUT_REACH_PER_HALF,
      RIDE_REACH_CAP
    );
    const overReach = Math.max(
      OVER_REACH_MIN,
      fillHalf * OVER_REACH_PER_HALF,
      RIDE_REACH_CAP
    );
    const [oGapPrev, oGapNext] = this.neighborGaps(
      overSamples,
      crossing.over,
      overNb
    );
    const [uGapPrev, uGapNext] = this.neighborGaps(
      underSamples,
      crossing.under,
      underNb
    );
    const clr = (pass: CrossingPass, nb: CrossingPass): number =>
      this.twinNeighbor(crossing, pass, nb) ? NB_CLEAR_TWIN : NB_CLEAR;
    const room = (
      samples: SplineSamples,
      center: number,
      dir: number
    ): number =>
      samples.closed
        ? samples.totalLength / 4
        : dir > 0
          ? samples.totalLength - center
          : center;
    const oCapPos = Math.max(
      0.12,
      Math.min(
        overReach,
        clr(crossing.over, overNb.next) * oGapNext,
        splitFwd,
        room(overSamples, overCenter, 1)
      )
    );
    const oCapNeg = Math.max(
      0.12,
      Math.min(
        overReach,
        clr(crossing.over, overNb.prev) * oGapPrev,
        splitBwd,
        room(overSamples, overCenter, -1)
      )
    );
    // From the under pass, forward reaches the over pass after `bwd`.
    const uCapPos = Math.max(
      0.15,
      Math.min(
        cutReach,
        clr(crossing.under, underNb.next) * uGapNext,
        splitBwd,
        room(underSamples, underCenter, 1)
      )
    );
    const uCapNeg = Math.max(
      0.15,
      Math.min(
        cutReach,
        clr(crossing.under, underNb.prev) * uGapPrev,
        splitFwd,
        room(underSamples, underCenter, -1)
      )
    );

    // UNDER MARCH (each direction) against the coarse over polyline, for
    // two arcs along the under centerline:
    //  - the CUT: where its own mask excess first turns >= 0 - the hidden
    //    span of the centerline (the yarn's dip-under window);
    //  - the WINDOW: the CONNECTED overlap only. The march stops where the
    //    two ribbons stop overlapping (centerline distance >= both half
    //    widths: every lane has left the over silhouette), and the window
    //    extends past that by the margin's reach along a lane (arc mode:
    //    exactly margin + fade; perp mode: their arc projection). A window
    //    sized by "the footprint could still touch the casing" ran all the
    //    way around a fat kink loop and shaved its eye walls across the eye
    //    (no crossing there) - the per-pixel test is exact INSIDE the
    //    window, so the window must hold only material connected, lane by
    //    lane, to the crossing core (the erase grid's first-exit lanes had
    //    this property by construction).
    const nO = this.buildPoly(
      this.coarseO,
      overSamples,
      overCenter,
      oCapNeg,
      oCapPos,
      COARSE_SPACING,
      COARSE_MAX
    );
    const co = this.coarseO;
    const sc4 = this.sampleScratch;
    const oS0 = overCenter - oCapNeg;
    const oSt = (oCapNeg + oCapPos) / (nO - 1);
    const overlapD = 2 * fillHalf;
    let cutPos = 0;
    let cutNeg = 0;
    let silPos = 0;
    let silNeg = 0;
    let winPos = 0;
    let winNeg = 0;
    // The arc where every lane of the under ribbon has left the casing, per
    // side (the erase era's extents: a render-only pluck's under-node
    // footprint).
    let allPos = 0;
    let allNeg = 0;
    for (let dir = -1; dir <= 1; dir += 2) {
      const cap = dir > 0 ? uCapPos : uCapNeg;
      let cut = Number.NaN;
      let sil = Number.NaN;
      let win = Number.NaN;
      // Arc where EVERY lane has left the casing (fade not included), and
      // the crossing angle there.
      let all = Number.NaN;
      let allSin = 1;
      let prevS = 0;
      let prevE = Number.NaN;
      let prevF = Number.NaN;
      let prevD = Number.NaN;
      for (let s = 0; ; s += MARCH_STEP) {
        const sc = Math.min(s, cap);
        this.sampleAt(underSamples, underCenter + dir * sc, sc4, 0);
        const d = this.polyDist(
          co,
          nO,
          sc4[0],
          sc4[1],
          selfEx,
          underCenter + dir * sc,
          oS0,
          oSt,
          per
        );
        const i = this.nearIdx;
        const i0 = Math.max(0, i - 1);
        const i1 = Math.min(nO - 1, i + 1);
        const ox = co[i1 * 2] - co[i0 * 2];
        const oy = co[i1 * 2 + 1] - co[i0 * 2 + 1];
        const ol = Math.hypot(ox, oy) || 1;
        const sinT = Math.abs(sc4[2] * oy - sc4[3] * ox) / ol;
        // The centerline's SILHOUETTE exit (where the margin starts) - the
        // junction clearance caps only what lies beyond it.
        if (Number.isNaN(sil)) {
          const f = d - fillHalf;
          if (f >= 0) {
            sil = Number.isNaN(prevF)
              ? sc
              : prevS + (sc - prevS) * (-prevF / (f - prevF));
          }
          prevF = f;
        }
        if (Number.isNaN(cut)) {
          const e = d - fillHalf - (perp ? margin : margin * sinT);
          if (e >= 0) {
            cut = Number.isNaN(prevE)
              ? sc
              : prevS + (sc - prevS) * (-prevE / (e - prevE));
          }
          prevE = e;
        }
        // Arc mode: the hide region reaches exactly margin + fade of arc
        // past each lane's silhouette exit, and every lane has exited once
        // the centerlines are both half widths apart. Perp mode: every lane
        // is clear of the casing + fade once the centerlines are that much
        // farther apart (at shallow angles that is far along the arc, so it
        // is marched, not projected).
        const allD = perp ? overlapD + margin : overlapD;
        if (Number.isNaN(all) && d >= allD) {
          all =
            (Number.isNaN(prevD) || !Number.isFinite(d)
              ? sc
              : prevS + (sc - prevS) * ((allD - prevD) / (d - prevD))) +
            (perp ? 0 : margin);
          allSin = sinT;
        }
        const exitD2 = perp ? overlapD + margin + fade : overlapD;
        if (Number.isNaN(win) && d >= exitD2) {
          const exit =
            Number.isNaN(prevD) || !Number.isFinite(d)
              ? sc
              : prevS + (sc - prevS) * ((exitD2 - prevD) / (d - prevD));
          win = Math.min(
            cap,
            exit + (perp ? 0 : margin + fade) + MARCH_STEP + GAP_EXIT_PAD
          );
        }
        // EYE-WALL LIMIT (casing look): the fade is an ARC past the casing
        // exit, so once the march has gone that far past it the window
        // ends even if the thread still lingers inside the fade band - a
        // narrow twist eye's far wall (it followed the whole wall: a dark
        // wedge where master's lane caps stop) or a parallel ride. The
        // shader's window-end ramp dissolves whatever fade remains.
        if (
          perp &&
          Number.isNaN(win) &&
          !Number.isNaN(all) &&
          sc >= all + fade / Math.max(allSin, 0.2) + MARCH_STEP
        ) {
          win = Math.min(cap, sc + GAP_EXIT_PAD);
        }
        prevD = d;
        prevS = sc;
        if ((!Number.isNaN(cut) && !Number.isNaN(win)) || sc >= cap) break;
      }
      if (Number.isNaN(win)) win = cap;
      if (Number.isNaN(cut)) cut = win;
      cut = Math.min(cut, win);
      if (Number.isNaN(sil)) sil = cut;
      sil = Math.min(sil, cut);
      const allX = Number.isNaN(all) ? win : Math.min(all, win);
      if (dir > 0) {
        cutPos = cut;
        silPos = sil;
        winPos = win;
        allPos = allX;
      } else {
        cutNeg = cut;
        silNeg = sil;
        winNeg = win;
        allNeg = allX;
      }
    }

    // OVER MARCH against the window's centerline: the polyline must hold
    // every over point within the hide reach of the window's footprint (a
    // truncated polyline OVER-measures the distance and leaves material
    // standing).
    const nU = this.buildPoly(
      this.coarseU,
      underSamples,
      underCenter,
      winNeg,
      winPos,
      COARSE_SPACING,
      COARSE_MAX
    );
    const uS0 = underCenter - winNeg;
    const uSt = (winNeg + winPos) / (nU - 1);
    let reachPos = 0;
    let reachNeg = 0;
    // The over pass's stretch that covers the under thread's gap, per side:
    // a render-only pluck's over-node footprint (the over-fill window it
    // replaced: out to where the over ribbon clears the casing band).
    const coverD = overlapD + margin + 0.05;
    let coverPos = 0;
    let coverNeg = 0;
    for (let dir = -1; dir <= 1; dir += 2) {
      const cap = dir > 0 ? oCapPos : oCapNeg;
      let r = cap;
      let cover = Number.NaN;
      let prevS = 0;
      let prevD = Number.NaN;
      for (let s = 0; ; s += MARCH_STEP) {
        const sc = Math.min(s, cap);
        this.sampleAt(overSamples, overCenter + dir * sc, sc4, 0);
        const d = this.polyDist(
          this.coarseU,
          nU,
          sc4[0],
          sc4[1],
          selfEx,
          overCenter + dir * sc,
          uS0,
          uSt,
          per
        );
        if (Number.isNaN(cover) && d >= coverD) {
          cover = Number.isNaN(prevD)
            ? sc
            : prevS + (sc - prevS) * ((coverD - prevD) / (d - prevD));
        }
        prevS = sc;
        prevD = d;
        if (d >= exitD) {
          r = Math.min(cap, sc + MARCH_STEP);
          break;
        }
        if (sc >= cap) break;
      }
      const coverX = Math.min(
        cap,
        Math.max(
          PLUCK_OVER_MIN,
          (Number.isNaN(cover) ? r : cover) + PLUCK_OVER_PAD
        )
      );
      if (dir > 0) {
        reachPos = r;
        coverPos = coverX;
      } else {
        reachNeg = r;
        coverNeg = coverX;
      }
    }
    if (index >= 0) {
      // A gated crossing not yet shown has no footprint to pluck around.
      this.overHalfNeg[index] = shown ? coverNeg : 0;
      this.overHalfPos[index] = shown ? coverPos : 0;
      this.eraseExtentNeg[index] = shown ? allNeg : 0;
      this.eraseExtentPos[index] = shown ? allPos : 0;
    }
    // ADAPTIVE RESOLUTION: the shader's cost is per polyline segment, and a
    // straight over pass needs few. The spacing keeps the chord sagitta
    // (s^2 * curvature / 8) under POLY_SAG_TOL on the tightest bend of the
    // reach, read off the coarse march polyline.
    let kMax = 0;
    {
      const lo = Math.max(1, Math.floor((oCapNeg - reachNeg) / oSt) - 1);
      const hi = Math.min(nO - 2, Math.ceil((oCapNeg + reachPos) / oSt) + 1);
      for (let m = lo; m <= hi; m++) {
        const ax = co[m * 2] - co[(m - 1) * 2];
        const ay = co[m * 2 + 1] - co[(m - 1) * 2 + 1];
        const bx = co[(m + 1) * 2] - co[m * 2];
        const by = co[(m + 1) * 2 + 1] - co[m * 2 + 1];
        const la = Math.hypot(ax, ay);
        const lb = Math.hypot(bx, by);
        if (la < 1e-9 || lb < 1e-9) continue;
        const turn = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
        kMax = Math.max(kMax, turn / (0.5 * (la + lb)));
      }
    }
    const spacing =
      kMax > 1e-6
        ? Math.min(
            POLY_SPACING_MAX,
            Math.max(FINE_SPACING, Math.sqrt((8 * POLY_SAG_TOL) / kMax))
          )
        : POLY_SPACING_MAX;
    const nF = this.buildPoly(
      this.fineO,
      overSamples,
      overCenter,
      reachNeg,
      reachPos,
      spacing,
      GAP_MAX_PTS
    );
    const polyStep = (reachNeg + reachPos) / (nF - 1);
    // FAR-BRANCH SMOOTH-MIN (gap_mask.ts): a straight run's points beyond
    // farK segments are at least sqrt(2 * reach * sminK) * 1.3 + one step
    // of arc from the nearest one, i.e. more than sminK farther - the blend
    // is exact there; only a polyline that bends back gets it.
    const sminK = Math.min(
      SMIN_K_MAX,
      Math.max(SMIN_K_MIN, SMIN_K_PER * (fillHalf + margin))
    );
    const hideReach = fillHalf + margin + fade;
    const farK = Math.ceil(
      (Math.sqrt(2 * hideReach * sminK) * 1.3 + polyStep) /
        Math.max(polyStep, 1e-6)
    );

    // PROTECT: where the under thread A is itself the OVER pass of a
    // neighboring crossing (A over B), this slot's cosmetic margin and fade
    // are waived for A's fragments over B's ribbon (gap_mask.ts). The arc
    // interval bounds the stretch of A that can cover B (per side: h (1 +
    // |cos|) / sin, sin floored at 0.25, or the MEASURED overlap where the
    // threads bend along each other - see protectReach); the protect
    // polyline is B's centerline over the stretch of B that A's ribbon can
    // reach. A compressed cyclic triangle (a over b over c over a)
    // otherwise hid each thread exactly where it must cover the next one.
    const prot = this.protScratch;
    prot[0] = 0;
    prot[1] = 0;
    prot[2] = 0;
    prot[3] = 0;
    let protNegN = 0;
    let protPosN = 0;
    if (index >= 0 && this.protect) {
      for (const nb of [underNb.prev, underNb.next]) {
        if (nb === crossing.under) continue;
        const info = this.passInfo.get(nb);
        if (!info || info.isUnder || info.index === index) continue;
        const xc = this.ps.crossings[info.index];
        const bSamples = this.chainSamples[xc.under.chain];
        if (!bSamples) continue;
        let off = this.arcAt(underSamples, this.renderCtrl(nb)) - underCenter;
        if (underSamples.closed) {
          off = ((off % totalU) + totalU) % totalU;
          if (off > totalU / 2) off -= totalU;
        }
        this.sampleAt(underSamples, underCenter + off, sc4, 0);
        const tax = sc4[2];
        const tay = sc4[3];
        const bArc = this.arcAt(bSamples, this.renderCtrl(xc.under));
        this.sampleAt(bSamples, bArc, sc4, 0);
        const sinX = Math.abs(tax * sc4[3] - tay * sc4[2]);
        const cosX = Math.abs(tax * sc4[2] + tay * sc4[3]);
        const w0 = (fillHalf * (1 + cosX)) / Math.max(sinX, 0.25);
        const aArc = underCenter + off;
        const o = off < 0 ? 0 : 2;
        const pad = PROTECT_PAD_PER_HALF * fillHalf + PROTECT_PAD;
        prot[o] =
          off -
          this.protectReach(underSamples, aArc, -1, bSamples, bArc, fillHalf, w0) -
          pad;
        prot[o + 1] =
          off +
          this.protectReach(underSamples, aArc, 1, bSamples, bArc, fillHalf, w0) +
          pad;
        // B's centerline wherever A's ribbon can reach it: the same overlap
        // measured along B, plus a half-width.
        const bNeg = Math.min(
          PROT_POLY_SPAN_MAX,
          this.protectReach(bSamples, bArc, -1, underSamples, aArc, fillHalf, w0) +
            fillHalf
        );
        const bPos = Math.min(
          PROT_POLY_SPAN_MAX,
          this.protectReach(bSamples, bArc, 1, underSamples, aArc, fillHalf, w0) +
            fillHalf
        );
        const nP = this.buildPoly(
          o === 0 ? this.protPolyNeg : this.protPolyPos,
          bSamples,
          bArc,
          bNeg,
          bPos,
          Math.max(PROT_POLY_SPACING, (bNeg + bPos) / (GAP_PROT_PTS - 1)),
          GAP_PROT_PTS
        );
        if (o === 0) protNegN = nP;
        else protPosN = nP;
      }
    }

    // JUNCTION CLEARANCE (the erase era's rule): every fused joint on the
    // under thread is a virtual neighbor; the room to its rendered edge
    // caps that side's cosmetic margin (floored at half) and then its fade
    // (floored at FADE_JOINT_FLOOR) by the SHORTFALL only, so gaps stop
    // eating into seal discs and webs ("gaps extending into the
    // intersection") without trimming a fade that already fits. Required
    // coverage - the over silhouette - is never reduced (the P3.36/P3.40
    // theorem). A per-pixel switch to the floors past the room compressed
    // fade roll-offs into hard edges once big cuspRadius values pushed
    // the clearance over most crossings.
    let jRoomPos = 1e6;
    let jRoomNeg = 1e6;
    const jCtrls = this.junctionArcCtrls.get(crossing.under.chain);
    if (jCtrls) {
      const jointClear =
        Math.max(
          fillHalf * 1.1,
          fillHalf *
            FILLET_REACH_PER_HALF *
            this.cuspRadius *
            JOINT_CLEAR_REACH_SCALE
        ) +
        gap +
        CUT_BIAS;
      for (const jc of jCtrls) {
        let d =
          this.paintArcAt(underSamples, jc.ctrl, underSamples.closed) -
          underCenter;
        if (underSamples.closed) {
          d = ((d % totalU) + totalU) % totalU;
          if (d > totalU / 2) d -= totalU;
        }
        if (d >= 0) jRoomPos = Math.min(jRoomPos, Math.max(0, d - jointClear));
        else jRoomNeg = Math.min(jRoomNeg, Math.max(0, -d - jointClear));
      }
    }
    const clearScales = (
      room: number,
      sil: number,
      cut: number,
      out: Float32Array,
      o: number
    ): void => {
      out[o] = 1;
      out[o + 1] = 1;
      if (!(room < 1e5)) return;
      const mArc = Math.max(cut - sil, 1e-6);
      const ms = Math.min(1, Math.max(JOINT_MARGIN_FLOOR, (room - sil) / mArc));
      out[o] = ms;
      if (fade > 0) {
        const cutEff = sil + mArc * ms;
        out[o + 1] = Math.min(
          1,
          Math.max(FADE_JOINT_FLOOR, (room - cutEff) / fade)
        );
      }
    };
    const cs = this.clearScratch;
    clearScales(jRoomNeg, silNeg, cutNeg, cs, 0);
    clearScales(jRoomPos, silPos, cutPos, cs, 2);

    this.sampleAt(underSamples, underCenter, sc4, 0);
    this.gaps.writeSlot(
      slot,
      {
        hOver: fillHalf,
        margin,
        fade,
        strength,
        perp,
        arcScale: underSamples.closed ? totalU : totalU / 0.45,
        centerArc: underCenter,
        winNeg,
        winPos,
        closed: underSamples.closed,
        totalU,
        tanX: sc4[2],
        tanY: sc4[3],
        selfExcl: selfEx,
        polyStart: overCenter - reachNeg,
        polyStep,
        marginScaleNeg: cs[0],
        marginScalePos: cs[2],
        fadeScaleNeg: cs[1],
        fadeScalePos: cs[3],
        centerX: sc4[0],
        centerY: sc4[1],
        sminK: this.smoothMin ? sminK : 0,
        farK,
        protNegA: prot[0],
        protNegB: prot[1],
        protPosA: prot[2],
        protPosB: prot[3],
        protPts: this.protPts,
        protNegN,
        protPosN,
      },
      this.fineO,
      nF
    );
    let wins = this.chainWins.get(crossing.under.chain);
    if (!wins) {
      wins = [];
      this.chainWins.set(crossing.under.chain, wins);
    }
    wins.push(slot, underCenter, winNeg, winPos);
    if (shown) {
      let uw = this.underWindows.get(crossing.under.chain);
      if (!uw) {
        uw = [];
        this.underWindows.set(crossing.under.chain, uw);
      }
      uw.push(underCenter, cutNeg, cutPos);
    }

    if (index >= 0) {
      if (this.diagData.length < this.ps.crossings.length * 5) {
        this.diagData = new Float32Array(this.ps.crossings.length * 5);
      }
      this.ps.bindingPoint(crossing.over, sc4, 0);
      this.diagData[index * 5] = sc4[0];
      this.diagData[index * 5 + 1] = sc4[1];
      this.diagData[index * 5 + 2] = cutNeg + cutPos;
      this.diagData[index * 5 + 3] = reachNeg + reachPos;
      this.diagData[index * 5 + 4] = selfDist;
      if (index === this.inspectIndex) {
        this.inspectIndex = -1;
        const round = (v: number): number => Math.round(v * 1000) / 1000;
        console.log(
          "CROSSING INSPECT " +
            JSON.stringify({
              crossing: index,
              slot,
              selfCross,
              over: {
                chain: crossing.over.chain,
                ctrl: round(crossing.over.ctrl),
              },
              under: {
                chain: crossing.under.chain,
                ctrl: round(crossing.under.ctrl),
              },
              sign: crossing.sign,
              overCenter: round(overCenter),
              underCenter: round(underCenter),
              split: [round(splitBwd), round(splitFwd)],
              uCaps: [round(uCapNeg), round(uCapPos)],
              oCaps: [round(oCapNeg), round(oCapPos)],
              cut: [round(cutNeg), round(cutPos)],
              win: [round(winNeg), round(winPos)],
              reach: [round(reachNeg), round(reachPos)],
              polyPts: nF,
              strength: round(strength),
              mode: this.gapMode,
            })
        );
      }
    }
  }

  // Gap slots for emergent (tunneled) crossings, deduped against
  // registered crossings and each other.
  private renderEmergent(fillHalf: number, gap: number): void {
    let poolUsed = 0;
    const used: number[] = [];
    const fxNow = knotUniformValues().uKFx[2];
    for (const em of this.ps.emergentCrossings) {
      if (poolUsed >= EMERGENT_POOL) break;
      // REVEAL + FX: the registered crossings' gate - and since G2.1 the
      // same fade-in (the show time travels with the slot, so a pooled,
      // unstably indexed slot needs no per-crossing clock).
      const tShow = this.crossingShowTime(em);
      // A gate still well in the future skips the solve (as master skipped
      // unrevealed emergent crossings - before the dedup, which reads the
      // registered slots, and those are skipped while pending too).
      if (fxNow < tShow - GATE_LEAD) {
        if (tShow > this.gateOpenAt) this.gateOpenAt = tShow;
        continue;
      }
      this.ps.bindingPoint(em.over, this.sampleScratch, 0);
      const ex = this.sampleScratch[0];
      const ey = this.sampleScratch[1];

      let dup = false;
      for (let c = 0; c * 5 < this.diagData.length; c++) {
        if (
          Math.hypot(
            this.diagData[c * 5] - ex,
            this.diagData[c * 5 + 1] - ey
          ) < 0.8
        ) {
          dup = true;
          break;
        }
      }
      for (let k = 0; !dup && k < used.length; k += 2) {
        if (Math.hypot(used[k] - ex, used[k + 1] - ey) < 0.8) dup = true;
      }
      if (dup) continue;

      used.push(ex, ey);
      const pool = poolUsed++;
      this.computeGapSlot(
        this.emergentBase + pool,
        em,
        -1,
        null,
        null,
        fillHalf,
        gap,
        this.gateStrength(tShow, fxNow),
        fxNow >= tShow
      );
    }
    for (let k = poolUsed; k < EMERGENT_POOL; k++) {
      this.gaps.clearSlot(this.emergentBase + k);
    }
  }

  // MARKER DISC GAPS: a start/exit disc is an "over pass" whose
  // polyline is its center point - its thread is hidden inside the
  // CONCENTRIC circle of radius (disc + gap): the gap's edge curves like a
  // disc grown to reach it (user spec), not like the disc slid outward.
  private renderMarkerGaps(fillHalf: number, gap: number): void {
    const margin = gap + CUT_BIAS;
    for (let m = 0; m < MARKER_SLOTS; m++) {
      const slot = this.markerBase + m;
      const occ = this.markerOccluders[m];
      const samples = occ ? this.chainSamples[occ.chain] : null;
      if (
        !occ ||
        !samples ||
        (this.revealOn &&
          this.revealMulAtCtrl(occ.chain, occ.ctrl) < REVEAL_CROSSING_MIN)
      ) {
        this.gaps.clearSlot(slot);
        continue;
      }
      const closed = this.ps.chainBreakAfter[occ.chain] < 0;
      const total = samples.totalLength;
      const center = this.paintArcAt(samples, occ.ctrl, closed);
      this.sampleAtSafe(samples, center, closed, this.sampleScratch, 0);
      const cx = this.sampleScratch[0];
      const cy = this.sampleScratch[1];
      const tx = this.sampleScratch[2];
      const ty = this.sampleScratch[3];
      const exitD =
        occ.radius +
        margin +
        this.fadeLength +
        fillHalf * UNDER_FOOT_PER_HALF +
        GAP_EXIT_PAD;
      const winOf = (dir: number): number => {
        const cap = closed ? total / 4 : dir > 0 ? total - center : center;
        for (let s = 0; ; s += MARCH_STEP) {
          const sc = Math.min(s, cap);
          this.sampleAtSafe(
            samples,
            center + dir * sc,
            closed,
            this.sampleScratch,
            0
          );
          const d = Math.hypot(
            this.sampleScratch[0] - cx,
            this.sampleScratch[1] - cy
          );
          if (d >= exitD) return Math.min(cap, sc + MARCH_STEP);
          if (sc >= cap) return cap;
        }
      };
      const winNeg = winOf(-1);
      const winPos = winOf(1);
      this.fineO[0] = cx;
      this.fineO[1] = cy;
      this.gaps.writeSlot(
        slot,
        {
          hOver: occ.radius,
          margin,
          fade: this.fadeLength,
          strength: 1,
          perp: true,
          arcScale: closed ? total : total / 0.45,
          centerArc: center,
          winNeg,
          winPos,
          closed,
          totalU: total,
          tanX: tx,
          tanY: ty,
          selfExcl: 0,
          polyStart: 0,
          polyStep: 0,
          marginScaleNeg: 1,
          marginScalePos: 1,
          fadeScaleNeg: 1,
          fadeScalePos: 1,
          centerX: cx,
          centerY: cy,
          sminK: 0,
          farK: 0,
          protNegA: 0,
          protNegB: 0,
          protPosA: 0,
          protPosB: 0,
          protPts: null,
          protNegN: 0,
          protPosN: 0,
        },
        this.fineO,
        1
      );
      let wins = this.chainWins.get(occ.chain);
      if (!wins) {
        wins = [];
        this.chainWins.set(occ.chain, wins);
      }
      wins.push(slot, center, winNeg, winPos);
    }
  }

  // Vertex slot ids from this frame's windows: each window's samples
  // (padded by one, so every quad touching the window carries the id at
  // both ends - the fragment's exact arc test does the real windowing,
  // independent of the flat-varying provoking-vertex convention) get the
  // slot in ONE component, free across the whole range, so the per-quad
  // value is consistent. Uploads only chains whose ids changed.
  private assignGapIds(): void {
    for (let c = 0; c < this.fills.length; c++) {
      const fill = this.fills[c];
      const count = fill.sampleCount;
      let ids = this.idScratch.get(c);
      if (!ids) {
        ids = new Float32Array(count * GAP_SLOTS);
        this.idScratch.set(c, ids);
      }
      ids.fill(-1);
      const wins = this.chainWins.get(c);
      const samples = this.chainSamples[c];
      if (wins && samples && samples.totalLength > 0) {
        const closed = samples.closed;
        const per = (closed ? count : count - 1) / samples.totalLength;
        for (let w = 0; w < wins.length; w += 4) {
          const slot = wins[w];
          // Samples are uniform in arc, so floor/ceil already cover every
          // quad the window touches; one sample of padding absorbs rounding.
          let k0 = Math.floor((wins[w + 1] - wins[w + 2]) * per) - 1;
          let k1 = Math.ceil((wins[w + 1] + wins[w + 3]) * per) + 1;
          if (!closed) {
            k0 = Math.max(0, k0);
            k1 = Math.min(count - 1, k1);
          } else if (k1 - k0 + 1 >= count) {
            k0 = 0;
            k1 = count - 1;
          }
          let comp = -1;
          for (let cc = 0; cc < GAP_SLOTS && comp < 0; cc++) {
            let free = true;
            for (let k = k0; k <= k1; k++) {
              const kk = closed ? ((k % count) + count) % count : k;
              if (ids[kk * GAP_SLOTS + cc] >= 0) {
                free = false;
                break;
              }
            }
            if (free) comp = cc;
          }
          if (comp < 0) {
            this.gapOverflow++;
            continue;
          }
          for (let k = k0; k <= k1; k++) {
            const kk = closed ? ((k % count) + count) % count : k;
            ids[kk * GAP_SLOTS + comp] = slot;
          }
        }
      }
      fill.setMaskIds(ids);
    }
  }

  // Install the section color field (see core/section_colors). The noise
  // scheme carries no segments - it is evaluated spatially per sample and
  // converted to RGB through the shared gamut curve here.
  setSectionField(
    segs: VSegment[][],
    scheme: ColorScheme,
    seed: number
  ): void {
    this.sectionSegs = segs;
    if (scheme === "noise") {
      const rng = new SeededRNG((seed ^ 0x5ec7c0) >>> 0);
      this.sectionNoise = createNoise2D(() => rng.next());
    } else {
      this.sectionNoise = null;
    }
    this.rgbCacheReady = false;
  }

  // LIVE RECOLOR (the Look panel's color controls): swap every color
  // input in place - physics, the reveal and the player's progress all
  // survive, where a scene rebuild reset them. The caller has already
  // applied the gamut config (setGamutConfig) and built the new field.
  // Fans read the live paint texture (there are no thread copies to
  // re-sync: the gaps are cut per pixel in the base ribbons).
  recolor(
    baseHue: number,
    pathColor: number,
    hueGroup: number[] | undefined,
    segs: VSegment[][],
    scheme: ColorScheme,
    seed: number
  ): void {
    this.style.baseHue = baseHue;
    this.style.hueGroup = hueGroup;
    this.baseRgb.set(gamutRgb(baseHue, 0.5));
    if (this.style.paletteMode) {
      if (this.style.pathColor !== pathColor) {
        this.style.pathColor = pathColor;
        const tex = accentTexture(pathColor);
        this.accentTex = tex;
        bindAccent(tex);
        for (const f of this.fills) f.mesh.texture = tex;
      }
      // Constant-color chains hand writePaint the SAME (mutated) baseRgb.
      for (const f of this.fills) f.invalidateColors();
      this.setSectionField(segs, scheme, seed);
      // Gameplay-painted chains repaint on the next paint tick.
      this.chainRev.clear();
    } else {
      this.fills.forEach((fill, i) => {
        this.knotRgb[i] = this.knotChainRgb(i);
        fill.writePaint(
          new Float32Array(fill.sampleCount).fill(U_BASE),
          this.knotRgb[i]
        );
      });
    }
  }

  // Section color at a chain ctrl (piecewise-linear RGB segments, or the
  // spatial noise field), written into out[0..2].
  private sectionRgbAt(chain: number, ctrl: number, out: Float32Array): void {
    if (this.sectionNoise) {
      const len = this.ps.chains[chain].length;
      this.ps.pointOnChain(
        chain,
        ((ctrl % len) + len) % len,
        this.sampleScratch,
        0
      );
      out.set(
        gamutRgb(
          this.style.baseHue,
          this.noiseV(this.sampleScratch[0], this.sampleScratch[1])
        )
      );
      return;
    }
    const segs = this.sectionSegs[chain];
    if (!segs || segs.length === 0) {
      out.set(this.baseRgb);
      return;
    }
    const len = this.ps.chains[chain].length;
    for (const c of [ctrl, ctrl + len]) {
      // Segments are sorted, contiguous runs, so c1 rises with c0: the
      // first segment whose c1 reaches c is the only candidate (a binary
      // search - eased junctionBlend ramps multiply the segment count).
      let lo = 0;
      let hi = segs.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (segs[mid].c1 + 1e-6 < c) lo = mid + 1;
        else hi = mid;
      }
      const s = segs[lo];
      if (s && c >= s.c0 - 1e-6) {
        const t = s.c1 > s.c0 ? (c - s.c0) / (s.c1 - s.c0) : 0;
        out[0] = s.rgb0[0] + (s.rgb1[0] - s.rgb0[0]) * t;
        out[1] = s.rgb0[1] + (s.rgb1[1] - s.rgb0[1]) * t;
        out[2] = s.rgb0[2] + (s.rgb1[2] - s.rgb0[2]) * t;
        return;
      }
    }
    out[0] = segs[0].rgb0[0];
    out[1] = segs[0].rgb0[1];
    out[2] = segs[0].rgb0[2];
  }

  private noiseV(x: number, y: number): number {
    const n = this.sectionNoise!(x * 0.16, y * 0.16);
    return Math.max(0, Math.min(1, 0.5 + 0.62 * n));
  }

  // The ctrl of the next fused joint along a junction arm (its chain, in
  // the arm's direction), or null - static (joint ctrls are fixed chain
  // slots), so cached once; the arc is re-derived live by the caller.
  private armNextJointCtrl(
    jn: number,
    a: { chain: number; slot: number; dir: 1 | -1 }
  ): number | null {
    const key = jn + ":" + a.chain + ":" + a.slot + ":" + a.dir;
    const hit = this.nextJointCache.get(key);
    if (hit !== undefined) return hit;
    const len = this.ps.chains[a.chain].length;
    const closed = this.ps.chainBreakAfter[a.chain] < 0;
    let best: number | null = null;
    let bestD = Infinity;
    for (const e of this.junctionArcCtrls.get(a.chain) ?? []) {
      if (e.jn === jn) continue;
      let d = (e.ctrl - a.slot) * a.dir;
      if (closed) d = ((d % len) + len) % len;
      if (d > 1e-6 && d < bestD) {
        bestD = d;
        best = e.ctrl;
      }
    }
    this.nextJointCache.set(key, best);
    return best;
  }

  // How far (ctrl units, ~) this chain's ctrl -> arc-fraction table has
  // drifted since its cache was baked. The cache maps sample k -> ctrl
  // through the BAKE-time table, while lookups and the joints themselves
  // live at the current one.
  private cacheDrift(chain: number, samples: SplineSamples): number {
    const snap = this.bakeFrac[chain];
    const cal = samples.controlArcLengths;
    const total = samples.totalLength;
    if (!snap || snap.length !== cal.length || total <= 0) return 0;
    let m = 0;
    for (let k = 0; k < cal.length; k++) {
      const d = Math.abs(cal[k] / total - snap[k]);
      if (d > m) m = d;
    }
    return m * cal.length;
  }

  // Bake the per-sample RGB cache for one chain. Sample k sits at a fixed
  // arc FRACTION (uniform resampling), but the ctrl at that fraction moves
  // as the chain deforms - so the bake records its table (bakeFrac) and
  // update() re-bakes once it drifts (CACHE_REBAKE_CTRL). Constant chains
  // store one triplet.
  private buildRgbCacheFor(chain: number, samples: SplineSamples): void {
    const count = samples.count;
    this.bakeFrac[chain] = null;
    if (this.sectionNoise) {
      const rgbs = new Float32Array(count * 3);
      for (let k = 0; k < count; k++) {
        const rgb = gamutRgb(
          this.style.baseHue,
          this.noiseV(samples.positions[k * 2], samples.positions[k * 2 + 1])
        );
        rgbs[k * 3] = rgb[0];
        rgbs[k * 3 + 1] = rgb[1];
        rgbs[k * 3 + 2] = rgb[2];
      }
      this.rgbCache[chain] = rgbs;
      return;
    }
    const segs = this.sectionSegs[chain];
    if (!segs || segs.length === 0) {
      this.rgbCache[chain] = this.baseRgb;
      return;
    }
    if (
      segs.length === 1 &&
      Math.abs(segs[0].rgb0[0] - segs[0].rgb1[0]) < 1e-6 &&
      Math.abs(segs[0].rgb0[1] - segs[0].rgb1[1]) < 1e-6 &&
      Math.abs(segs[0].rgb0[2] - segs[0].rgb1[2]) < 1e-6
    ) {
      this.rgbCache[chain] = new Float32Array(segs[0].rgb0);
      return;
    }
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const cal = samples.controlArcLengths;
    const n = cal.length;
    const total = samples.totalLength;
    const rgbs = new Float32Array(count * 3);
    const tmp = this.rgbScratch;
    let slot = 0;
    for (let k = 0; k < count; k++) {
      const a = closed ? (k / count) * total : (k / (count - 1)) * total;
      while (slot < n - 1 && cal[slot + 1] <= a) slot++;
      const a0 = cal[slot];
      const a1 = slot < n - 1 ? cal[slot + 1] : total;
      const t = a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0;
      this.sectionRgbAt(chain, slot + t, tmp);
      rgbs[k * 3] = tmp[0];
      rgbs[k * 3 + 1] = tmp[1];
      rgbs[k * 3 + 2] = tmp[2];
    }
    this.rgbCache[chain] = rgbs;
    const frac = new Float32Array(n);
    for (let k = 0; k < n; k++) frac[k] = total > 0 ? cal[k] / total : 0;
    this.bakeFrac[chain] = frac;
  }

  // Declare the current gameplay paint (traveled spans + branch-point
  // pulse arms). Cheap; the heavy lifting happens in tickPaint.
  setPaint(spans: PaintSpan[], pulses: PulseArm[], caps: PaintCap[]): void {
    this.paintSpans = spans;
    this.paintPulses = pulses;
    this.paintCaps = caps;
    this.paintRev++;
    // PULSE FADE-IN: pulses live around the current head junction; when
    // that junction changes, restart the fade clock so the gradient
    // animation breathes in instead of popping (the "appear too
    // abruptly" report). Keyed by the inbound arm's junction ctrl.
    const key =
      pulses.length > 0
        ? pulses[0].chain + ":" + Math.round(pulses[0].cJunction * 4)
        : "";
    if (key !== this.pulseKey) {
      this.pulseKey = key;
      this.pulseBorn = this.paintClock;
    }
  }

  // The light per-frame paint pass: advances the pulse clock and rewrites
  // the UV buffers of affected chains (animated chains every tick, static
  // ones only when the declaration changed, dropped ones reset once) -
  // crossings recolor with them for free (their gaps are cut per pixel in
  // the same ribbons). Touches no positions and no splines - safe to run
  // while the physics sleeps. Also owns the flow-undulation clock
  // (it receives real dt every frame in all ticker branches, both modes).
  tickPaint(dt: number): void {
    knotUniformValues().uKBase[2] = this.paintDebug;
    this.tickPaintPalette(dt);
    this.tickAppearFx(dt);
    // Flow clock, advanced AFTER the palette/fillet pass so everything
    // rendered this frame (update()'s chain samples, the fillet
    // centroids) read ONE field time. Scaling the ACCUMULATOR by the live
    // speed keeps a flowSpeed slider change from phase-jumping the field,
    // which multiplying at evaluation time would.
    this.flowTime += dt * this.flowSpeed;
  }

  // ---- RENDER-ONLY PLUCKS (see pluck_overlay.ts) -------------------------

  // The thread under a world point: the nearest rendered sample within
  // `radius`, preferring the OVER thread where the nearest one is inside
  // its own under-gap (the visible thread there is its partner). Returns
  // the chain, its arc + fractional ctrl, the side of the thread the point
  // lies on (+1 = the left normal (-ty, tx)), and the centerline distance.
  pickThread(
    x: number,
    y: number,
    radius: number
  ): {
    chain: number;
    arc: number;
    ctrl: number;
    side: number;
    dist: number;
  } | null {
    const r2 = radius * radius;
    const hits: Array<{ chain: number; k: number; d2: number }> = [];
    for (let c = 0; c < this.chainSamples.length; c++) {
      const s = this.chainSamples[c];
      if (!s) continue;
      let best = r2;
      let bk = -1;
      for (let k = 0; k < s.count; k++) {
        const dx = s.positions[k * 2] - x;
        const dy = s.positions[k * 2 + 1] - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
          best = d2;
          bk = k;
        }
      }
      if (bk >= 0) hits.push({ chain: c, k: bk, d2: best });
    }
    if (hits.length === 0) return null;
    hits.sort((a, b) => a.d2 - b.d2);
    // Refine each candidate's arc by projecting onto its two neighboring
    // sample chords.
    const refine = (
      chain: number,
      k: number
    ): { arc: number; px: number; py: number; d: number } => {
      const s = this.chainSamples[chain]!;
      const closed = s.closed;
      const per = s.totalLength / (closed ? s.count : s.count - 1);
      let bestArc = k * per;
      let bx = s.positions[k * 2];
      let by = s.positions[k * 2 + 1];
      let bd = Math.hypot(bx - x, by - y);
      for (const j of [k - 1, k]) {
        let a = j;
        let b = j + 1;
        if (closed) {
          a = ((a % s.count) + s.count) % s.count;
          b = ((b % s.count) + s.count) % s.count;
        } else if (a < 0 || b >= s.count) {
          continue;
        }
        const ax = s.positions[a * 2];
        const ay = s.positions[a * 2 + 1];
        const ex = s.positions[b * 2] - ax;
        const ey = s.positions[b * 2 + 1] - ay;
        const l2 = ex * ex + ey * ey;
        if (l2 < 1e-12) continue;
        const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
        const px = ax + ex * t;
        const py = ay + ey * t;
        const d = Math.hypot(px - x, py - y);
        if (d < bd) {
          bd = d;
          bx = px;
          by = py;
          bestArc = (j + t) * per;
        }
      }
      return { arc: normArc(bestArc, s.totalLength, closed), px: bx, py: by, d: bd };
    };
    let pick = hits[0];
    let hit = refine(pick.chain, pick.k);
    if (
      hits.length > 1 &&
      this.underGapVisibility(pick.chain, hit.arc) < 0.5
    ) {
      const h = this.style.threadWidth / 2;
      for (let i = 1; i < hits.length; i++) {
        const alt = refine(hits[i].chain, hits[i].k);
        if (alt.d <= hit.d + 1.5 * h) {
          pick = hits[i];
          hit = alt;
          break;
        }
      }
    }
    const s = this.chainSamples[pick.chain]!;
    this.sampleAt(s, hit.arc, this.sampleScratch, 0);
    const tx = this.sampleScratch[2];
    const ty = this.sampleScratch[3];
    const side = tx * (y - hit.py) - ty * (x - hit.px) >= 0 ? 1 : -1;
    return {
      chain: pick.chain,
      arc: hit.arc,
      ctrl: this.ctrlAtArc(s, hit.arc),
      side,
      dist: hit.d,
    };
  }

  // Inverse of paintArcAt: the fractional ctrl at an arc.
  private ctrlAtArc(samples: SplineSamples, arc: number): number {
    const cal = samples.controlArcLengths;
    const n = cal.length;
    const total = samples.totalLength;
    const a = normArc(arc, total, samples.closed);
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cal[mid] <= a) lo = mid;
      else hi = mid - 1;
    }
    const a0 = cal[lo];
    const a1 = lo + 1 < n ? cal[lo + 1] : total;
    return lo + (a1 > a0 ? Math.max(0, Math.min(1, (a - a0) / (a1 - a0))) : 0);
  }

  // Start a render-only pluck on a chain at a ctrl (or an arc). spanCtrl =
  // the unit's ctrl span (the fabric walk run, unwrapped c1 >= c0); reach =
  // lobes kept each side. Returns false when it is sound-only (a chain
  // mid-reveal, or nothing to vibrate).
  pluck(req: {
    chain: number;
    ctrl?: number;
    arc?: number;
    side: number;
    gain: number;
    freq: number;
    reach: number;
    spanCtrl?: [number, number] | null;
    beta?: number;
    delay?: number;
    // A ctrl on this chain the unit must not contain (a held particle):
    // when it does, the pluck stays sound-only.
    avoidCtrl?: number;
  }): boolean {
    const samples = this.chainSamples[req.chain];
    if (!samples) return false;
    const closed = this.ps.chainBreakAfter[req.chain] < 0;
    const len = this.ps.chains[req.chain].length;
    const ctrlArc = (c: number): number =>
      this.paintArcAt(
        samples,
        closed ? ((c % len) + len) % len : Math.max(0, Math.min(len - 1, c)),
        closed
      );
    const arc = req.arc ?? ctrlArc(req.ctrl ?? 0);
    let span: [number, number] | null = null;
    if (req.spanCtrl) {
      const a0 = ctrlArc(req.spanCtrl[0]);
      let a1 = ctrlArc(req.spanCtrl[1]);
      // A wrap run on a closed chain (c1 past the seam) or a whole loop.
      if (closed && (a1 < a0 || req.spanCtrl[1] - req.spanCtrl[0] >= len)) {
        a1 += samples.totalLength;
      }
      span = [a0, a1];
    }
    return this.plucks.add({
      chain: req.chain,
      arc,
      side: req.side,
      gain: req.gain,
      freq: req.freq,
      reach: req.reach,
      span,
      beta: req.beta,
      delay: req.delay,
      avoidArc:
        req.avoidCtrl !== undefined ? ctrlArc(req.avoidCtrl) : undefined,
    });
  }

  // Per-frame pluck pass (every ticker branch, after tickPaint so fabric
  // colors read this frame's paint). Never calls update().
  tickPlucks(dt: number): void {
    this.plucks.tick(dt);
  }

  private makePluckHost(): PluckHost {
    return {
      halfWidth: () => this.style.threadWidth / 2,
      casing: () => this.style.casingWidth / 2,
      samples: (c) => this.chainSamples[c] ?? null,
      allSamples: () => this.chainSamples,
      closed: (c) => this.ps.chainBreakAfter[c] < 0,
      nodes: (c) => this.pluckNodes(c),
      sampleAt: (s, a, out, o) => this.sampleAt(s, a, out, o),
      visibility: (c, a) => this.underGapVisibility(c, a),
      color: (c, a, out) => this.pluckColor(c, a, out),
      staticColors: () => !this.style.paletteMode,
      viewScale: () => {
        const wt = this.root.worldTransform;
        return Math.hypot(wt.a, wt.b);
      },
      // Mid-reveal chains, and every chain while appearance FX still
      // animate (they settle within FX_TAIL of the reveal's end).
      hot: (c) =>
        (this.revealOn && this.revealMask[c] !== null) ||
        (this.fxLive && knotUniformValues().uKFx[0] !== FX_STYLE.none),
      setCollapse: (c, mul) => {
        if (mul) this.pluckCollapse.set(c, mul);
        else this.pluckCollapse.delete(c);
        this.reextrude(c);
      },
      geomRev: () => this.geomRev,
      baseSampleCount: (c) => this.fills[c].sampleCount,
    };
  }

  // Compose a chain's pluck collapse into the width multiplier update()
  // (or reextrude) hands its base ribbon. Inert without a collapse.
  private withPluckCollapse(
    chain: number,
    count: number,
    base: Float32Array | null
  ): Float32Array | null {
    const col = this.pluckCollapse.get(chain);
    if (!col || col.length !== count) return base;
    let buf = this.collapseScratch.get(chain);
    if (!buf || buf.length !== count) {
      buf = new Float32Array(count);
      this.collapseScratch.set(chain, buf);
    }
    for (let k = 0; k < count; k++) buf[k] = (base ? base[k] : 1) * col[k];
    return buf;
  }

  // The LIGHT PATH: re-extrude one chain's base ribbon from its cached
  // samples (pluck collapse on/off) - no spline, no crossing solve. Same
  // inputs as update() everywhere outside the collapse, so the vertices
  // there come out bit-identical.
  private reextrude(chain: number): void {
    const samples = this.chainSamples[chain];
    if (!samples) return;
    this.fills[chain].update(
      samples.positions,
      samples.tangents,
      this.style.threadWidth / 2,
      0,
      this.withPluckCollapse(chain, samples.count, this.widthLast[chain] ?? null)
    );
  }

  // The thread's composed color at an arc, 0..1 RGB: knot mode = the
  // chain tint; fabric = the section color mixed with the live gameplay
  // accent at the ribbon's own paint U (exactly the section shader).
  private pluckColor(chain: number, arc: number, out: Float32Array): void {
    const fill = this.fills[chain];
    if (!this.style.paletteMode) {
      const t = fill.mesh.tint as number;
      out[0] = ((t >> 16) & 255) / 255;
      out[1] = ((t >> 8) & 255) / 255;
      out[2] = (t & 255) / 255;
      return;
    }
    this.colorAtArc(chain, arc, out);
    const samples = this.chainSamples[chain];
    if (!samples || samples.totalLength <= 0) return;
    const count = fill.sampleCount;
    const total = samples.totalLength;
    let k0: number;
    let k1: number;
    let fr: number;
    if (samples.closed) {
      const f = (normArc(arc, total, true) / total) * count;
      k0 = Math.floor(f) % count;
      k1 = (k0 + 1) % count;
      fr = f - Math.floor(f);
    } else {
      const f = (normArc(arc, total, false) / total) * (count - 1);
      k0 = Math.min(count - 1, Math.floor(f));
      k1 = Math.min(count - 1, k0 + 1);
      fr = f - Math.floor(f);
    }
    const u = fill.paintU(k0) + (fill.paintU(k1) - fill.paintU(k0)) * fr;
    const acc = this.acc4Scratch;
    accentSampleCpu(accentPixels(this.style.pathColor), u, acc);
    out[0] += (acc[0] - out[0]) * acc[3];
    out[1] += (acc[1] - out[1]) * acc[3];
    out[2] += (acc[2] - out[2]) * acc[3];
  }

  // The NODES a plucked chain passes (pluck_overlay.ts PluckNode): every
  // registered crossing pass (footprint = its erase extents + fade when
  // the chain goes under, its over-fill half-lengths when over), every
  // fused junction (hide zone = the joint's overlap core, see below),
  // start/exit marker discs, and an open chain's two ends. Sorted by arc.
  private pluckNodes(chain: number): PluckNode[] {
    const samples = this.chainSamples[chain];
    if (!samples) return [];
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const total = samples.totalLength;
    const fillHalf = this.style.threadWidth / 2;
    const gap = (this.style.casingWidth - this.style.threadWidth) / 2;
    const fade = this.fadeLength;
    const sc = this.sampleScratch;
    const out: PluckNode[] = [];
    this.ps.crossings.forEach((cr, ci) => {
      for (let u = 0; u < 2; u++) {
        const isUnder = u === 1;
        const pass = isUnder ? cr.under : cr.over;
        if (pass.chain !== chain) continue;
        const arc = this.paintArcAt(samples, this.renderCtrl(pass), closed);
        let line: [number, number, number, number] | null = null;
        let footNeg: number;
        let footPos: number;
        if (isUnder) {
          footNeg = this.eraseExtentNeg[ci] + fade;
          footPos = this.eraseExtentPos[ci] + fade;
          const os = this.chainSamples[cr.over.chain];
          if (os) {
            const oc = this.ps.chainBreakAfter[cr.over.chain] < 0;
            this.sampleAt(
              os,
              this.paintArcAt(os, this.renderCtrl(cr.over), oc),
              sc,
              0
            );
            line = [sc[0], sc[1], sc[2], sc[3]];
          }
        } else {
          footNeg = this.overHalfNeg[ci];
          footPos = this.overHalfPos[ci];
        }
        out.push({
          arc,
          footNeg,
          footPos,
          hide: 0,
          under: isUnder,
          line,
          key: ci * 2 + u,
        });
      }
    });
    const joints = this.junctionArcCtrls.get(chain);
    if (joints) {
      // The overlay hides only over the joint's OVERLAP CORE: the seal disc
      // (0.92 fillHalf) where the chain passes THROUGH the joint, and for a
      // TERMINAL arm its tucked tip (0.75 fillHalf in) plus the fused-tip
      // disc (0.99 fillHalf) that rounds it. The edge-aware junction field
      // is each arm's own material across that arm's width, so beyond the
      // core the vibrating arm repaints exactly its own color. (Hiding the
      // whole fillet reach - ~1 world at cuspRadius 3 - and later 2
      // fillHalf on every arm left half of all fabric taps without a
      // single vibrating stretch.) The static FOOTPRINT spans the fillet
      // web's flank: each wedge paints a tapering triangle of joint material
      // ON its arms, out to the wedge reach, above the base - a base
      // collapsing under it left that triangle standing as a pale static
      // sliver beside a dark gap (the "spike" at an eye between two arms).
      // Inside it the base stays intact and the swing under NODE_CORE h,
      // as at a crossing.
      const len = this.ps.chains[chain].length;
      const webReach = fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius;
      const web = this.cuspRadius > 0.05 && webReach > fillHalf * 0.97 * 0.3;
      for (const j of joints) {
        const terminal = !closed && (j.ctrl < 0.5 || j.ctrl > len - 1.5);
        const hide = fillHalf * (terminal ? 1.75 : 1.0) + gap;
        const foot = Math.max(hide + 2 * CUT_BIAS, web ? webReach : 0);
        out.push({
          arc: this.paintArcAt(samples, j.ctrl, closed),
          footNeg: foot,
          footPos: foot,
          hide,
          under: false,
          line: null,
          key: PLUCK_KEY_JOINT + j.jn * 1e5 + j.ctrl,
        });
      }
    }
    this.markerOccluders.forEach((mk, mi) => {
      if (mk.chain !== chain) return;
      const r = mk.radius + gap + fade + CUT_BIAS;
      out.push({
        arc: this.paintArcAt(samples, mk.ctrl, closed),
        footNeg: r,
        footPos: r,
        hide: r,
        under: false,
        line: null,
        key: PLUCK_KEY_MARKER + mi,
      });
    });
    if (!closed) {
      out.push({
        arc: 0,
        footNeg: 0,
        footPos: fillHalf,
        hide: 0,
        under: false,
        line: null,
        key: PLUCK_KEY_END,
      });
      out.push({
        arc: total,
        footNeg: fillHalf,
        footPos: 0,
        hide: 0,
        under: false,
        line: null,
        key: PLUCK_KEY_END + 1,
      });
    }
    out.sort((a, b) => a.arc - b.arc || a.key - b.key);
    // Coincident nodes (a fused tip or a marker sitting on a chain end)
    // merge into one: the larger footprint and hide zone, the lower key.
    const merged: PluckNode[] = [];
    for (const n of out) {
      const prev = merged[merged.length - 1];
      if (prev && n.arc - prev.arc < 0.02 && (n.key >= PLUCK_KEY_JOINT || prev.key >= PLUCK_KEY_JOINT)) {
        prev.footNeg = Math.max(prev.footNeg, n.footNeg);
        prev.footPos = Math.max(prev.footPos, n.footPos);
        prev.hide = Math.max(prev.hide, n.hide);
        if (n.key < prev.key) {
          prev.key = n.key;
          prev.under = n.under;
          prev.line = n.line;
        }
        continue;
      }
      merged.push({ ...n });
    }
    return merged;
  }

  // update() must keep running even when the asleep ticker would otherwise
  // skip it while the appearance FX still change GEOMETRY (the rainbow
  // swell's widths - CPU until G3) or a crossing gate is still pending (the
  // GPU fades the gap in by itself, but the CPU bookkeeping that follows a
  // shown gap - underWindows, pluck footprints - is written by update()).
  // Colors need nothing: they animate on the GPU from the clock uniforms.
  needsFxRender(): boolean {
    if (!this.fxLive) return false;
    const U = knotUniformValues();
    if (U.uKFx[0] === FX_STYLE.rainbow && U.uKFx[3] > 0.5) return true;
    // Through the last gate's ramp: the CPU then writes it at full strength.
    return U.uKFx[2] < this.gateOpenAt + PAINT_CONST.CROSSING_FADE_IN;
  }

  // THE PAINT CLOCK (G2): advanced once per frame by main.ts right after
  // the reveal animator's tick - BEFORE update() - so every CPU mirror
  // evaluation inside update() (reveal masks, crossing and joint gates) and
  // this frame's shader uniforms read one clock. Probes freeze the paint
  // animation by overriding this method (tickPaint no longer advances it).
  advanceClocks(dt: number): void {
    this.paintClock += dt;
    if (!this.fxLive) return;
    // REVEAL FX CLOCKS (G2.1), reduced here in float64 so no absolute
    // clock reaches the GPU: fxNow = wall seconds since the reveal began,
    // the anim clock, speed knots (the animator advanced by dt * speed
    // just before this call), and the burn flicker's phases mod 2 pi.
    const U = knotUniformValues();
    const anim = this.revealAnim;
    const fxNow = this.paintClock - this.revealWall0;
    if (anim) {
      const inv = 1 / Math.max(1e-6, anim.speed);
      const last = (this.knotCount - 1) * 4;
      // (The knot table is f32: compare at f32 resolution.)
      if (!anim.done && Math.abs(U.uKKnots[last + 2] - inv) > 1e-6 * inv) {
        this.addKnot(anim.clock - dt * anim.speed, fxNow - dt, inv);
      }
      U.uKFx[1] = anim.clock;
      // The FX tail starts once the last front has finished.
      if (anim.done && this.fxEnd === Infinity) this.fxEnd = fxNow + FX_TAIL;
    }
    U.uKFx[2] = fxNow;
    const revealOn = anim !== null && !anim.done;
    U.uKFx2[2] = revealOn ? 1 : 0;
    const fxOn = revealOn || fxNow < this.fxEnd;
    U.uKFx[3] = fxOn ? 1 : 0;
    // The burn flicker runs on the REVEAL clock (fxNow), not the absolute
    // paint clock: an instant of the reveal then renders the same whatever
    // happened before it (the old phase was the page's paint clock).
    const TAU = Math.PI * 2;
    const c = fxNow;
    U.uKFx2[0] = (13 * c) % TAU;
    U.uKFx2[1] = (29 * c) % TAU;
    U.uKFx2[3] = 0.3 * Math.sin(13 * c) + 0.2 * Math.sin(29 * c);
    this.syncFxStyle();
    if (!fxOn) {
      this.fxLive = false;
      this.gateOpenAt = -Infinity;
    }
  }

  private tickPaintPalette(_dt: number): void {
    if (!this.style.paletteMode) return;

    const target = new Set<number>();
    const animated = new Set<number>();
    for (const s of this.paintSpans) target.add(s.chain);
    for (const cp of this.paintCaps) target.add(cp.chain);
    for (const p of this.paintPulses) {
      target.add(p.chain);
      animated.add(p.chain);
    }
    const toWrite: number[] = [];
    for (const c of target) {
      if (animated.has(c) || this.chainRev.get(c) !== this.paintRev) {
        toWrite.push(c);
      }
    }
    for (const c of this.chainRev.keys()) {
      if (!target.has(c)) toWrite.push(c);
    }
    // Chains whose section cache update() just re-baked (drift).
    for (const c of this.recolorPending) {
      if (!toWrite.includes(c)) toWrite.push(c);
    }
    this.recolorPending.clear();

    // REVEAL frontier glow: chains carrying an advancing tip rewrite every
    // tick (the glow travels), and chains whose glow just ended rewrite
    // once to clear it. The tips are cached here for writeChainPaint.
    this.revealTips =
      this.revealOn && this.revealAnim ? this.revealAnim.tips() : [];
    const glowNow = new Set<number>();
    for (const t of this.revealTips) glowNow.add(t.chain);
    for (const c of glowNow) {
      if (!toWrite.includes(c)) toWrite.push(c);
    }
    for (const c of this.glowChains) {
      if (!glowNow.has(c) && !toWrite.includes(c)) toWrite.push(c);
    }
    this.glowChains = glowNow;

    // (Appearance FX - burn / roots / rainbow / materialize - no longer
    // repaint anything here: since G2.1 every pixel evaluates them from the
    // reveal sources and the clock uniforms.)

    // The paint lives ONLY in each base ribbon's U/colors: crossing gaps
    // are cut per pixel, so no over-fill copy has to replay it.
    for (const chain of toWrite) {
      if (!this.chainSamples[chain]) continue;
      this.writeChainPaint(chain, target.has(chain));
      if (target.has(chain)) this.chainRev.set(chain, this.paintRev);
      else this.chainRev.delete(chain);
    }

    // Junction fillets ride the same tick: live positions, live paint.
    this.rebuildFillets();
  }

  // Collapse the samples within one host half-width of a fused terminal
  // onto the tuck point, so the ribbon ends flush at the host's near edge.
  private tuckFusedTips(
    samples: SplineSamples,
    atStart: boolean,
    atEnd: boolean
  ): void {
    const total = samples.totalLength;
    // Tuck 3/4 of the way to the host's near edge: the remaining overlap
    // hides under the fillets, so no background sliver can open between
    // the tucked cap and the (curved) host edge.
    const trim = Math.min((this.style.threadWidth / 2) * 0.75, total * 0.25);
    const arcPer = total / (samples.count - 1);
    const clamp = (arc: number, from: number, to: number): void => {
      this.sampleAt(samples, arc, this.sampleScratch, 0);
      const [x, y, tx, ty] = this.sampleScratch;
      for (let k = from; k < to; k++) {
        samples.positions[k * 2] = x;
        samples.positions[k * 2 + 1] = y;
        samples.tangents[k * 2] = tx;
        samples.tangents[k * 2 + 1] = ty;
      }
    };
    if (atStart) {
      clamp(trim, 0, Math.min(samples.count - 1, Math.ceil(trim / arcPer)));
    }
    if (atEnd) {
      const k0 = Math.max(1, samples.count - Math.ceil(trim / arcPer));
      clamp(total - trim, k0, samples.count);
    }
  }

  // Register (or clear) marker disc occluders: each gets one gap slot,
  // solved every update() like a crossing's (see renderMarkerGaps). At
  // most MARKER_SLOTS discs.
  setMarkerOccluders(
    list: Array<{ chain: number; ctrl: number; radius: number }>
  ): void {
    this.markerOccluders = list.slice(0, MARKER_SLOTS);
  }

  // World position of a marker: the SAME spline sample its gap slot
  // centers on, so the disc and the gap stay concentric under flow and
  // display adjustments (physics-position markers sat slightly off the
  // rendered centerline).
  markerWorld(chain: number, ctrl: number, out: Float32Array): void {
    const samples = this.chainSamples[chain];
    if (!samples) {
      out[0] = 0;
      out[1] = 0;
      return;
    }
    const closed = this.ps.chainBreakAfter[chain] < 0;
    this.sampleAtSafe(
      samples,
      this.paintArcAt(samples, ctrl, closed),
      closed,
      this.sampleScratch,
      0
    );
    out[0] = this.sampleScratch[0];
    out[1] = this.sampleScratch[1];
  }

  // Arc of a ctrl for PAINT purposes. arcAt's closing modulo is correct
  // for closed chains but wraps an OPEN chain's terminal arc (== total) to
  // ZERO - a traveled bridge's span [0, lastCtrl] collapsed to a point and
  // the bridge stayed base-colored (the "connective bits don't highlight"
  // report). Open chains clamp instead of wrapping.
  private paintArcAt(
    samples: SplineSamples,
    ctrl: number,
    closed: boolean
  ): number {
    if (closed) return this.arcAt(samples, ctrl);
    const n = samples.controlArcLengths.length;
    const i = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
    const t = ctrl - i;
    const a0 = samples.controlArcLengths[i];
    const a1 =
      i + 1 < n ? samples.controlArcLengths[i + 1] : samples.totalLength;
    return Math.min(samples.totalLength, a0 + (a1 - a0) * t);
  }

  // Evaluate the paint field for one chain into palette coordinates, one U
  // per ribbon sample.
  private writeChainPaint(chain: number, painted: boolean): void {
    const samples = this.chainSamples[chain]!;
    const mesh = this.fills[chain];
    const count = mesh.sampleCount;
    let us = this.uScratch.get(chain);
    if (!us || us.length < count) {
      us = new Float32Array(count);
      this.uScratch.set(chain, us);
    }
    us.fill(U_BASE, 0, count);
    if (!painted) {
      this.applyRevealGlowU(chain, us, count);
      this.writeFillPaint(chain, us, this.rgbCache[chain]);
      return;
    }

    const closed = this.ps.chainBreakAfter[chain] < 0;
    const total = samples.totalLength;
    const arcOf = (k: number): number =>
      closed ? (k / count) * total : (k / (count - 1)) * total;

    // Traveled spans -> gold (optionally intensity-graded end to end: the
    // memory-trail tail fade).
    for (const s of this.paintSpans) {
      if (s.chain !== chain) continue;
      const a0 = this.paintArcAt(samples, s.c0, closed);
      const a1 = this.paintArcAt(samples, s.c1, closed);
      // A closed chain's unwrapped span can cross the arc seam.
      const wraps = closed && a1 <= a0 && s.c1 > s.c0;
      const p0 = s.p0 ?? 1;
      const p1 = s.p1 ?? 1;
      if (p0 >= 1 && p1 >= 1) {
        for (let k = 0; k < count; k++) {
          const a = arcOf(k);
          const inside = wraps ? a >= a0 || a <= a1 : a >= a0 && a <= a1;
          if (inside) us[k] = U_GOLD;
        }
      } else {
        const spanLen = Math.max(wraps ? total - a0 + a1 : a1 - a0, 1e-9);
        for (let k = 0; k < count; k++) {
          const a = arcOf(k);
          const inside = wraps ? a >= a0 || a <= a1 : a >= a0 && a <= a1;
          if (!inside) continue;
          const da = wraps && a < a0 ? total - a0 + a : a - a0;
          const t = Math.min(1, Math.max(0, da / spanLen));
          us[k] = goldU(p0 + (p1 - p0) * t);
        }
      }
    }

    // Traversed-junction caps -> gold discs around each arm occurrence.
    // max(): a cap never darkens span paint under it (identical to the old
    // unconditional gold write at full intensity).
    for (const cp of this.paintCaps) {
      if (cp.chain !== chain) continue;
      const aC = this.paintArcAt(samples, cp.ctrl, closed);
      const uCap = goldU(cp.p ?? 1);
      for (let k = 0; k < count; k++) {
        let d = Math.abs(arcOf(k) - aC);
        if (closed) d = Math.min(d, total - d);
        if (d <= cp.radius && uCap > us[k]) us[k] = uCap;
      }
    }

    // Branch-point pulse arms (see pulseValueAt for the phase model).
    for (const p of this.paintPulses) {
      if (p.chain !== chain) continue;
      const aJ = this.paintArcAt(samples, p.cJunction, closed);
      const aF = this.paintArcAt(samples, p.cFar, closed);
      let dirPos: boolean;
      let spanArc: number;
      if (closed) {
        dirPos = p.cFar > p.cJunction;
        spanArc = dirPos
          ? (((aF - aJ) % total) + total) % total
          : (((aJ - aF) % total) + total) % total;
      } else {
        dirPos = aF >= aJ;
        spanArc = Math.abs(aF - aJ);
      }
      if (spanArc <= 1e-6) continue;
      for (let k = 0; k < count; k++) {
        const a = arcOf(k);
        let d: number;
        if (closed) {
          d = dirPos
            ? (((a - aJ) % total) + total) % total
            : (((aJ - a) % total) + total) % total;
        } else {
          d = dirPos ? a - aJ : aJ - a;
        }
        const v = this.pulseValueAt(d, spanArc, p.inward, p.hovered);
        if (v > 0.004) us[k] = bandU(p.onPath, v);
      }
    }
    this.applyRevealGlowU(chain, us, count);
    this.writeFillPaint(chain, us, this.rgbCache[chain]);
  }

  // Every ribbon paint write goes through here: the ribbon gets its per-
  // vertex U + section RGB, and the GPU junction field's PAINT texture
  // gets the same per-sample values (texel = (r, g, b, u)), so joinery and
  // fills near joints read exactly the material the ribbons wear (burn
  // cooling, reveal glow and gameplay paint included). Only the touched
  // rows upload (flushed once per tick by rebuildFillets).
  private writeFillPaint(
    chain: number,
    us: ArrayLike<number>,
    colors: Float32Array
  ): void {
    const fill = this.fills[chain];
    fill.writePaint(us, colors);
    if (this.paintBase.length === 0) return;
    const pd = paintData();
    const d = pd.data;
    const base = this.paintBase[chain];
    const count = fill.sampleCount;
    const constant = colors.length === 3;
    for (let k = 0; k < count; k++) {
      const o = (base + k) * 4;
      const c = constant ? 0 : k * 3;
      d[o] = colors[c];
      d[o + 1] = colors[c + 1];
      d[o + 2] = colors[c + 2];
      d[o + 3] = us[k];
    }
    pd.markDirty(base, base + count);
  }

  // REVEAL frontier glow (palette mode): push the paint U of the samples
  // just behind each advancing tip toward the near-white accent through
  // the EXISTING palette bands - gold-family samples brighten along band
  // B, everything else along band A, both of which end at the same
  // accent, so no new strip adjacency class is introduced (the strip's
  // order is load-bearing). Only ever brightens; the traveled gold and
  // the pulse keep whatever is brighter.
  private applyRevealGlowU(
    chain: number,
    us: Float32Array,
    count: number
  ): void {
    if (!this.revealOn || this.revealTips.length === 0) return;
    // Burn/roots: the thread's own tint IS the frontier treatment -
    // the near-white accent glow sat on the same samples and washed it
    // out completely (acc.a ~0.94 overrides vSection).
    if (this.appearFx === "burn" || this.appearFx === "roots") return;
    const samples = this.chainSamples[chain];
    if (!samples || samples.totalLength <= 0) return;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const total = samples.totalLength;
    const mask = this.revealMask[chain];
    const arcPer = closed ? total / count : total / (count - 1);
    // Rainbow: a LONGER white head with a full-strength plateau.
    const rainbow = this.appearFx === "rainbow";
    const glowArc = rainbow ? RAINBOW_GLOW_ARC : REVEAL_GLOW_ARC;
    const hold = rainbow ? glowArc * RAINBOW_GLOW_HOLD : 0;
    const halfWin = Math.ceil(glowArc / Math.max(arcPer, 1e-6)) + 1;
    for (const tip of this.revealTips) {
      if (tip.chain !== chain) continue;
      const aT = this.paintArcAt(samples, tip.ctrl, closed);
      const kC = Math.round(aT / arcPer);
      for (let o = -halfWin; o <= halfWin; o++) {
        let k = kC + o;
        if (closed) k = ((k % count) + count) % count;
        else if (k < 0 || k >= count) continue;
        const a = k * arcPer;
        let d = Math.abs(a - aT);
        if (closed) d = Math.min(d, total - d);
        if (d > glowArc) continue;
        if (mask && mask[k] <= 0.004) continue; // Unrevealed side: invisible.
        const g = d <= hold ? 1 : 1 - (d - hold) / (glowArc - hold);
        const u = us[k];
        if (u >= GOLD_FAMILY_MIN) {
          const cand = bandU(true, g);
          if (cand > u) us[k] = cand;
        } else {
          const cand = bandU(false, g);
          if (cand < u) us[k] = cand;
        }
      }
    }
  }

  // The pulse field at distance d from the junction along an arm whose run
  // spans spanArc. FULL-LENGTH CREST TRAINS: crests march the entire run
  // at `pulseSpacing` world units apart (live panel param) - inbound
  // trains sink toward the junction while outbound trains emerge along
  // the choices (outbound leads by PULSE_OUT_LEAD). The steady glow floor
  // still hugs the junction (PULSE_REACH); crests hold near-full strength
  // along the whole run, swell in over CREST_RAMP near the junction, and
  // dissolve only across the far-end window.
  private pulseValueAt(
    d: number,
    spanArc: number,
    inward: boolean,
    hovered: boolean
  ): number {
    const end = spanArc;
    if (d < 0 || d > end) return 0;
    const endWin = Math.min(1, Math.max(0, (end - d) / PULSE_END_WINDOW));
    // Hover: a slow whole-run breath between 0.2 and 0.8 strength (the
    // steady full-white read as a frozen slab next to the animated
    // pulses). Still no fade-in - hover is a direct pointer response.
    if (hovered) {
      return (
        endWin * (0.5 + 0.3 * Math.sin(this.paintClock * HOVER_PULSE_W))
      );
    }
    // Fade the whole animation in over the first moments at a NEW head
    // junction (smoothstep; hover stays instant - it is a direct
    // pointer response).
    const fi = Math.min(
      1,
      Math.max(0, (this.paintClock - this.pulseBorn) / PULSE_FADE_IN)
    );
    const fadeIn = fi * fi * (3 - 2 * fi);
    const spacing = Math.max(0.5, this.pulseSpacing);
    const clock = inward ? this.paintClock : this.paintClock + PULSE_OUT_LEAD;
    const travel = clock * PULSE_SPEED;
    // Distance to the nearest crest of the comb (outbound combs slide
    // outward with time, inbound combs slide toward the junction).
    const raw = inward ? d + travel : d - travel;
    const ph = ((raw % spacing) + spacing) % spacing;
    const dist = Math.min(ph, spacing - ph);
    // That crest's own position, for the near-junction swell-in.
    const dC = Math.max(
      0,
      d - (ph <= spacing - ph ? ph : ph - spacing)
    );
    const bump =
      Math.max(0, 1 - dist / CREST_WIDTH) * Math.min(1, dC / CREST_RAMP);
    const floor =
      (PULSE_FLOOR +
        PULSE_CORE_BOOST * Math.max(0, 1 - d / PULSE_CORE_RADIUS)) *
      Math.max(0, 1 - d / PULSE_REACH);
    return Math.min(1, (floor + bump * 0.9) * endWin) * fadeIn;
  }

  // CPU REFERENCE of the GPU junction field (junction_field.ts FIELD_GLSL),
  // transliterated line for line and reading the SAME record + paint data
  // the shader samples - the fieldProbe ground truth. Not on any hot path.
  // GLSL twin chainMaterial: the material (r, g, b, u) of a chain at a
  // world arc from the paint mirror, with burn / roots applied.
  private cpuChainMaterial(ch: number, a: number, out: Float32Array): void {
    const D = kData();
    const U = knotUniformValues();
    const c = kChain(D, ch);
    const d = paintData().data;
    const base = Math.round(D.stat[(2 * ch + 1) * 4 + 3]);
    const count = c.count;
    const total = c.total;
    let k0 = 0;
    let k1 = 0;
    let fr = 0;
    let an = 0;
    if (total > 0 && count >= 2) {
      if (c.closed) {
        an = a - total * Math.floor(a / total);
        const f = (an / total) * count;
        const fl = Math.floor(f);
        k0 = fl % count;
        k1 = (k0 + 1) % count;
        fr = f - fl;
      } else {
        an = Math.max(0, Math.min(total, a));
        const f = (an / total) * (count - 1);
        const fl = Math.floor(f);
        k0 = Math.min(fl, count - 1);
        k1 = Math.min(count - 1, k0 + 1);
        fr = f - fl;
      }
    }
    const o0 = (base + k0) * 4;
    const o1 = (base + k1) * 4;
    for (let i = 0; i < 4; i++) out[i] = d[o0 + i] + (d[o1 + i] - d[o0 + i]) * fr;
    if (!(total > 0 && count >= 2) || U.uKFx[3] < 0.5 || U.uKFx[2] >= c.fxDone) {
      return;
    }
    const st = Math.round(U.uKFx[0]);
    if (st !== FX_STYLE.burn && st !== FX_STYLE.roots) return;
    kFxColor(D, U, c, kCtrlOfArc(D, c, an), an / c.arcPer, out, this.ignScratch);
  }

  // The composed junction-field color at (x, y) for the record at texel
  // `rec` into out[0..2] (out[3] = U_BASE: the accent is already composed).
  private cpuJunctionField(
    rec: number,
    x: number,
    y: number,
    out: Float32Array
  ): void {
    const J = recordData().data;
    const at = (i: number): number => i * 4;
    const TAU = Math.PI * 2;
    const fillHalf = this.style.threadWidth / 2;
    const profN = this.fieldProfLen;
    const last = profN - 1;
    const stride = 2 + profN;
    const hd = at(rec);
    const n = Math.round(J[hd + 2]);
    const ex = x - J[hd];
    const ey = y - J[hd + 1];
    const mA = this.acc4Scratch;
    // Compose in place: m[0..2] = mix(section, accent(u).rgb, accent.a).
    const composeM = (m: Float32Array): void => {
      const acc = this.fieldAccScratch;
      accentSampleCpu(accentPixels(this.style.pathColor), m[3], acc);
      m[0] += (acc[0] - m[0]) * acc[3];
      m[1] += (acc[1] - m[1]) * acc[3];
      m[2] += (acc[2] - m[2]) * acc[3];
    };
    const compose = (m: Float32Array): void => {
      composeM(m);
      out[0] = m[0];
      out[1] = m[1];
      out[2] = m[2];
      out[3] = U_BASE;
    };
    if (n === 0) {
      const h = at(rec + 2);
      const ax = at(rec + 3);
      this.cpuChainMaterial(
        Math.round(J[h]),
        J[ax] + ex * J[ax + 1] + ey * J[ax + 2],
        mA
      );
      compose(mA);
      return;
    }
    const armPaint = (ab: number, s: number, m: Float32Array): void => {
      const h = at(ab);
      const a = at(ab + 1);
      this.cpuChainMaterial(
        Math.round(J[h]),
        J[a] + J[a + 1] * Math.min(s, J[a + 2]),
        m
      );
    };
    const profArc = (ab: number, rp: number): number => {
      const xg = rp / FIELD_PROF_DR;
      if (xg >= last) {
        return J[at(ab + 2 + last) + 1] + (rp - last * FIELD_PROF_DR);
      }
      const i = Math.floor(xg);
      const t = at(ab + 2 + i);
      return J[t + 1] + (J[t + 3] - J[t + 1]) * (xg - i);
    };
    const rho = Math.sqrt(ex * ex + ey * ey);
    const phi = Math.atan2(ey, ex);
    const gx = rho / FIELD_PROF_DR;
    let gi: number;
    let gf: number;
    if (gx >= last) {
      gi = last - 1;
      gf = 1;
    } else {
      gi = Math.floor(gx);
      gf = gx - gi;
    }
    let relA = 1e9;
    let relB = 1e9;
    let ia = 0;
    let ib = 0;
    for (let i = 0; i < Math.min(n, MAX_ARMS); i++) {
      const t = at(rec + 2 + i * stride + 2 + gi);
      let ra = phi - (J[t] + (J[t + 2] - J[t]) * gf);
      ra -= TAU * Math.floor(ra / TAU);
      const rb = ra > 0 ? TAU - ra : 0;
      if (ra < relA) {
        relA = ra;
        ia = i;
      }
      if (rb < relB) {
        relB = rb;
        ib = i;
      }
    }
    const abA = rec + 2 + ia * stride;
    armPaint(abA, profArc(abA, relA < Math.PI / 2 ? rho * Math.cos(relA) : 0), mA);
    if (ia === ib) {
      compose(mA);
      return;
    }
    composeM(mA);
    const mB = this.fieldMbScratch;
    const abB = rec + 2 + ib * stride;
    armPaint(abB, profArc(abB, relB < Math.PI / 2 ? rho * Math.cos(relB) : 0), mB);
    composeM(mB);
    const span = relA + relB;
    const hw = rho > fillHalf ? Math.asin(fillHalf / rho) : Math.PI / 2;
    let lo = hw;
    let hi = span - hw;
    const minW = span * FIELD_BLEND_MIN;
    if (hi - lo < minW) {
      lo = (span - minW) * 0.5;
      hi = lo + minW;
    }
    let t = hi > lo ? (relA - lo) / (hi - lo) : relA < span * 0.5 ? 0 : 1;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    // Composed colors blend - never the raw U (see FIELD_GLSL).
    for (let c = 0; c < 3; c++) out[c] = mA[c] + (mB[c] - mA[c]) * t;
    out[3] = U_BASE;
  }

  // Positional sampling for junction joinery: before the sampleAt
  // open-chain fix this clamp was the only guard against the arc-wrap
  // family's third bite (flank samples at corner-cut terminals flew to
  // the chain START). sampleAt now clamps open chains itself; this stays
  // as a cheap belt-and-suspenders for joinery callers.
  private sampleAtSafe(
    samples: SplineSamples,
    arc: number,
    closed: boolean,
    out: Float32Array,
    offset: number
  ): void {
    const a = closed
      ? arc
      : Math.min(Math.max(0, arc), samples.totalLength - 1e-4);
    this.sampleAt(samples, a, out, offset);
  }

  // Section RGB at a chain CTRL (public: the fabric overlay colors its
  // start/exit markers from the thread they sit on).
  sectionColorAt(chain: number, ctrl: number, out: Float32Array): void {
    const samples = this.chainSamples[chain];
    if (!samples) {
      out.set(this.baseRgb);
      return;
    }
    const closed = this.ps.chainBreakAfter[chain] < 0;
    this.colorAtArc(chain, this.paintArcAt(samples, ctrl, closed), out);
  }

  // Section RGB at a world ARC along a chain, read from the baked
  // per-sample cache into out[0..2] - the SAME data the ribbon's own
  // aColor verts carry, so overlay geometry sampling through here matches
  // the adjacent ribbon exactly at a seam.
  private colorAtArc(chain: number, arc: number, out: Float32Array): void {
    this.sectionAtArc(chain, arc, out);
    // Burn / roots wear on the CPU-drawn overlays too (markers, pluck
    // colors): the shader's own FX function at the point, via the mirror -
    // the start disc burns with its tail exactly as the ribbon does.
    if (!this.fxLive) return;
    const U = knotUniformValues();
    if (U.uKFx[0] !== FX_STYLE.burn && U.uKFx[0] !== FX_STYLE.roots) return;
    const D = kData();
    const c = kChain(D, chain);
    if (!(c.total > 0)) return;
    const a = normArc(arc, c.total, c.closed);
    kFxColor(D, U, c, kCtrlOfArc(D, c, a), a / c.arcPer, out, this.ignScratch);
  }

  // The section color at an arc: the baked per-sample cache, lerped (the
  // ribbon's own Gouraud between its vertices).
  private sectionAtArc(chain: number, arc: number, out: Float32Array): void {
    const cache = this.rgbCache[chain];
    if (cache.length === 3) {
      out[0] = cache[0];
      out[1] = cache[1];
      out[2] = cache[2];
      return;
    }
    const samples = this.chainSamples[chain];
    if (!samples || samples.totalLength <= 0) {
      out.set(this.baseRgb);
      return;
    }
    const count = cache.length / 3;
    const total = samples.totalLength;
    let k0: number;
    let k1: number;
    let fr: number;
    if (this.ps.chainBreakAfter[chain] < 0) {
      const f = (normArc(arc, total, true) / total) * count;
      k0 = Math.floor(f) % count;
      k1 = (k0 + 1) % count;
      fr = f - Math.floor(f);
    } else {
      const f = (normArc(arc, total, false) / total) * (count - 1);
      k0 = Math.floor(f);
      k1 = Math.min(count - 1, k0 + 1);
      fr = f - k0;
    }
    out[0] = cache[k0 * 3] + (cache[k1 * 3] - cache[k0 * 3]) * fr;
    out[1] = cache[k0 * 3 + 1] + (cache[k1 * 3 + 1] - cache[k0 * 3 + 1]) * fr;
    out[2] = cache[k0 * 3 + 2] + (cache[k1 * 3 + 2] - cache[k0 * 3 + 2]) * fr;
  }

  // Rounded junction joinery: tip/seal discs and, for each wedge between
  // adjacent junction arms, a concave patch from one arm's edge to the
  // next (quadratic bezier with the edge-intersection corner as control).
  // Every fan is a window onto ONE continuous junction FIELD, evaluated
  // PER PIXEL on the GPU (junction_field.ts): the CPU builds only the fan
  // geometry (positions + the texel index of the fan's RECORD) and the
  // records (junction center, arms, radial profiles); the shader reads the
  // ribbons' own per-sample paint from the paint texture. A flat overlay
  // over a ramping section color drew a visible step (or a stamped circle
  // of junction color) at its boundary - the junction-blotch reports - and
  // per-vertex evaluation needed ring-subdivided fans to keep Gouraud from
  // faceting the field (5-30 ms per paint tick at big cuspRadius).
  //
  // GATED: the field animates on the GPU, so a paint-only tick just
  // flushes the paint rows its writes touched. The geometry rebuilds when
  // an update() ran (positions, gap windows - the fans' masks - and
  // visibility), a live joinery input moved, or a reveal / appearance FX
  // is gating joints and fading fans. `force` = rebuild regardless (probes).
  rebuildFillets(force = false): void {
    if (!this.filletLayer || !this.accentTex) return;
    paintData().flush();
    const fillHalf = this.style.threadWidth / 2;
    const nDiscs =
      this.freeTips.length + this.fusedTips.length + this.junctionArms.length;
    if (nDiscs === 0) return;
    const key =
      this.geomRev +
      "|" +
      this.cuspRadius +
      "|" +
      this.style.threadWidth +
      "|" +
      this.style.casingWidth +
      "|" +
      this.fadeLength;
    // A reveal moves the joint gate times (their speed extrapolation) every
    // frame; the FX fades themselves animate on the GPU from the record's
    // J1 times (G2.1), so they need no rebuild.
    if (!force && !this.revealOn && key === this.filletKey) return;
    this.filletKey = key;
    if (!this.filletMesh) {
      let armTotal = 0;
      for (const jn of this.junctionArms) armTotal += jn.arms.length;
      const wedgeRim = 2 * FILLET_EDGE_PTS_MAX + FILLET_BEZIER_STEPS + 1;
      const verts = armTotal * (1 + wedgeRim) + nDiscs * (2 + DISC_SEGS);
      const idx = (armTotal * (wedgeRim - 1) + nDiscs * DISC_SEGS) * 3;
      this.filletMesh = new TriFanMesh(verts, idx);
      this.filletMesh.mesh.shader = junctionShader(this.accentTex);
      this.filletLayer.addChild(this.filletMesh.mesh);
      // The top mesh gets the same capacity: any junction can flip
      // layers frame to frame as threads move.
      this.filletTopMesh = new TriFanMesh(verts, idx);
      this.filletTopMesh.mesh.shader = junctionShader(this.accentTex);
      this.filletTopLayer!.addChild(this.filletTopMesh.mesh);
    }
    const fmBottom = this.filletMesh;
    const fmTop = this.filletTopMesh!;
    fmBottom.begin();
    fmTop.begin();
    // All pushes below route through `fm`; per-junction code points it at
    // the voted layer and resets it to bottom afterward.
    let fm = fmBottom;

    // LAYER VOTES (see filletTopLayer), PER-ARM: an arm is "over-near"
    // when a nearby crossing on its chain side has the arm as the OVER
    // pass (a foreign thread dives under it - that crossing's erase
    // swath would clip the web beside the arm), "under-near" when the
    // arm itself dives. Each WEDGE then picks its layer from its own
    // two arms - the earlier per-junction binary let one diving arm
    // force the whole joint punchable, and webs still clipped at
    // crossing overpasses on the other arms.
    const underNear = new Set<string>();
    const overNear = new Set<string>();
    const armKey = (chain: number, slot: number, dir: number): string =>
      chain + ":" + slot + ":" + dir;
    if (this.junctionArcCtrls.size > 0) {
      const gapW = (this.style.casingWidth - this.style.threadWidth) / 2;
      const jointReach = Math.max(
        fillHalf * 1.1,
        fillHalf *
          FILLET_REACH_PER_HALF *
          this.cuspRadius *
          JOINT_CLEAR_REACH_SCALE
      );
      const voteReach =
        jointReach + fillHalf + ERASE_WIDTH_PAD + gapW + this.fadeLength + 0.3;
      // Joint arcs per chain, derived once per rebuild (every pass on a
      // chain compares against the same list).
      const jArcCache = new Map<number, Float64Array>();
      const visit = (
        pass: CrossingPass,
        isOver: boolean
      ): void => {
        const list = this.junctionArcCtrls.get(pass.chain);
        if (!list) return;
        const samples = this.chainSamples[pass.chain];
        if (!samples) return;
        const closed = this.ps.chainBreakAfter[pass.chain] < 0;
        const total = samples.totalLength;
        const pArc = this.paintArcAt(samples, this.renderCtrl(pass), closed);
        let jArcs = jArcCache.get(pass.chain);
        if (!jArcs) {
          jArcs = new Float64Array(list.length);
          for (let i = 0; i < list.length; i++) {
            jArcs[i] = this.paintArcAt(samples, list[i].ctrl, closed);
          }
          jArcCache.set(pass.chain, jArcs);
        }
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const jArc = jArcs[i];
          let d = pArc - jArc;
          if (closed) {
            d = ((d % total) + total) % total;
            if (d > total / 2) d -= total;
          }
          if (Math.abs(d) >= voteReach || Math.abs(d) < 1e-4) continue;
          const key = armKey(pass.chain, e.ctrl, d > 0 ? 1 : -1);
          if (isOver) overNear.add(key);
          else underNear.add(key);
        }
      };
      for (const cr of this.ps.crossings) {
        visit(cr.over, true);
        visit(cr.under, false);
      }
    }

    // RECORDS for the GPU field (layout: junction_field.ts), appended as
    // junctions and tips are built and uploaded once at the end. ensure()
    // may swap the mirror, so writers re-read rd.data after it.
    const rd = recordData();
    let cursor = 0;
    // An AXIS record: the material of `chain` at a point's projection onto
    // the axis (ax, ay) through (cx, cy) at arc0 - a free tip's cap disc
    // (or the host-axis fallback) is a patch of that thread's own paint,
    // so it vanishes into ramped section colors instead of stamping a
    // circle.
    const writeAxis = (
      cx: number,
      cy: number,
      j1: [number, number],
      chain: number,
      arc0: number,
      ax: number,
      ay: number,
      ctrl0: number
    ): number => {
      rd.ensure(cursor + 4);
      const D = rd.data;
      const o = cursor * 4;
      const samples = this.chainSamples[chain];
      D[o] = cx;
      D[o + 1] = cy;
      D[o + 2] = 0;
      D[o + 3] = 0;
      D[o + 4] = j1[0];
      D[o + 5] = j1[1];
      D[o + 6] = 0;
      D[o + 7] = 0;
      D[o + 8] = chain;
      D[o + 9] = this.fills[chain].sampleCount;
      D[o + 10] = this.ps.chainBreakAfter[chain] < 0 ? 1 : 0;
      D[o + 11] = samples ? samples.totalLength : 0;
      D[o + 12] = arc0;
      D[o + 13] = ax;
      D[o + 14] = ay;
      D[o + 15] = ctrl0; // The ctrl at arc0 (the shader's ctrl search seed).
      const base = cursor;
      cursor += 4;
      return base;
    };
    // Gates still far off skip their fans this rebuild (the rebuild runs
    // every frame while a reveal plays; J1 fades the rest in).
    const fxNowJ = knotUniformValues().uKFx[2];
    // A disc fan's rim (closed: DISC_SEGS + 1 points, first repeated).
    const discRim = (cx: number, cy: number, r: number): number[] => {
      const rim: number[] = [];
      for (let i = 0; i <= DISC_SEGS; i++) {
        rim.push(cx + DISC_COS[i] * r, cy + DISC_SIN[i] * r);
      }
      return rim;
    };
    const pushDisc = (
      cx: number,
      cy: number,
      r: number,
      chain: number,
      arc0: number,
      ax: number,
      ay: number,
      gateCtrl: number
    ): void => {
      // A lone cap disc (free tip / host fallback) reads its own thread -
      // and gates on it (shown once revealed there, fading with its FX; a
      // gate still far off skips the cap this rebuild).
      const j1 = this.jointGate("c" + chain + ":" + gateCtrl, [[chain, gateCtrl]]);
      if (j1[0] > fxNowJ + GATE_LEAD) return;
      const rb = writeAxis(cx, cy, j1, chain, arc0, ax, ay, gateCtrl);
      fm.pushFan(cx, cy, discRim(cx, cy, r), rb);
    };
    // Local thread direction at an arc (two nearby probes), into
    // axisScratch.
    const axisAt = (chain: number, arc: number): void => {
      const samples = this.chainSamples[chain]!;
      const closed = this.ps.chainBreakAfter[chain] < 0;
      const total = samples.totalLength;
      this.sampleAtSafe(
        samples,
        normArc(arc + 0.2, total, closed),
        closed,
        this.sampleScratch,
        0
      );
      const x1 = this.sampleScratch[0];
      const y1 = this.sampleScratch[1];
      this.sampleAtSafe(
        samples,
        normArc(arc - 0.2, total, closed),
        closed,
        this.sampleScratch,
        0
      );
      const dx = x1 - this.sampleScratch[0];
      const dy = y1 - this.sampleScratch[1];
      const len = Math.hypot(dx, dy) || 1;
      this.axisScratch[0] = dx / len;
      this.axisScratch[1] = dy / len;
    };

    // THE JUNCTION FIELD: one continuous color function around each
    // junction, shared by EVERY overlay primitive there. A query point's
    // direction from the junction picks the two bracketing arms (by their
    // angles at the point's radius); each arm is sampled at the point's
    // distance PROJECTED onto it (a
    // point beside a thread reads its cross-section, a point along it
    // reads its ramp), composed with its own paint, and the two blend
    // edge-aware across the gap between their ribbons (FIELD_GLSL in
    // junction_field.ts evaluates it per pixel; cpuJunctionField is the CPU
    // reference). Disc rims, wedge rims, and the ribbons themselves then
    // agree wherever they meet. Per-primitive sampling (host-axis discs,
    // per-arm wedges) left faint rim arcs wherever one primitive's color
    // crossed ANOTHER arm's material - the circled phone-zoom reports.
    interface JArm {
      ang: number;
      dx: number;
      dy: number;
      chain: number;
      dir: number;
      slot: number;
      arc0: number;
      closed: boolean;
      total: number;
      // DOMAIN: how far along this arm the joint's joinery may reach or
      // sample - half way to the arm's next joint (a short bridge's far
      // half belongs to the OTHER joint: its ramp converges there), or to
      // an open chain's end. Without it both joints' webs spanned the
      // whole bridge and overlapped with two different fields.
      domain: number;
      // RADIAL PROFILE (see FIELD_PROF_DR): the arm centerline's angle
      // around the joint and its arc, at uniform radius steps - the field
      // follows CURVED arms (flanks hug the true silhouette; a straight
      // axis put curved arms' own edges outside their footprint).
      pth: Float32Array;
      ps: Float32Array;
      // Layer flags (see LAYER VOTES), resolved once per rebuild.
      top: boolean;
      dives: boolean;
      // Flank centerline samples [x, y, tx, ty] per flank point, shared
      // by the arm's two wedges (left and right flanks differ only in the
      // offset side). null until first used.
      flankPts: Float64Array | null;
    }
    interface JRec {
      jx: number;
      jy: number;
      arms: JArm[];
      // REVEAL + FX GATE (record J1): shown once every arm-adjacent point is
      // revealed (half-drawn fillets over zero-width arms read as floating
      // scraps), fading in as its latest-ignited arm settles.
      j1: [number, number];
      jn: number; // Index into junctionArms (for the layer vote).
      rb: number; // Record texel index (-1: < 2 arms, no field).
      mask: Float32Array; // Gap slots masking this joint's fans.
    }
    // Radial profile of one arm around its joint (JArm.pth/ps): walk the
    // centerline outward in FIELD_PROF_ARC steps and resample angle + arc
    // onto a uniform radius grid, so field lookups are O(1). Radius that
    // stalls (an arm curling back) keeps the last outward sample; past the
    // walk, the profile extends straight.
    // Queries reach the wedge tips (L) and tip-disc rims (~2 fillHalf);
    // past the grid the profile extrapolates straight.
    const fieldReach =
      Math.max(fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius, fillHalf * 2) +
      0.25;
    const profN = Math.ceil(fieldReach / FIELD_PROF_DR) + 2;
    if (this.fieldProfLen !== profN) {
      this.fieldProfPool.length = 0;
      this.fieldProfLen = profN;
    }
    let profUsed = 0;
    const buildProfile = (
      samples: SplineSamples,
      arc0: number,
      dir: number,
      closed: boolean,
      toEnd: number,
      jx: number,
      jy: number,
      ang0: number
    ): { pth: Float32Array; ps: Float32Array } => {
      // Pooled across rebuilds (this runs every paint tick).
      while (this.fieldProfPool.length < profUsed + 2) {
        this.fieldProfPool.push(new Float32Array(profN));
      }
      const pth = this.fieldProfPool[profUsed++];
      const ps = this.fieldProfPool[profUsed++];
      const total = samples.totalLength;
      const steps = Math.ceil((fieldReach * 1.4) / FIELD_PROF_ARC);
      let prevR = 0;
      let prevTh = ang0;
      let prevS = 0;
      let first = true;
      let g = 0;
      for (let k = 1; k <= steps && g < profN; k++) {
        const s = Math.min(k * FIELD_PROF_ARC, toEnd);
        this.sampleAtSafe(
          samples,
          normArc(arc0 + dir * s, total, closed),
          closed,
          this.sampleScratch,
          0
        );
        const ex = this.sampleScratch[0] - jx;
        const ey = this.sampleScratch[1] - jy;
        const r = Math.hypot(ex, ey);
        let th = Math.atan2(ey, ex);
        while (th - prevTh > Math.PI) th -= Math.PI * 2;
        while (th - prevTh < -Math.PI) th += Math.PI * 2;
        if (first) {
          prevTh = th; // The grid's innermost entries share the first ray.
          first = false;
        }
        if (r > prevR) {
          while (g < profN && g * FIELD_PROF_DR <= r) {
            const f = (g * FIELD_PROF_DR - prevR) / (r - prevR);
            pth[g] = prevTh + (th - prevTh) * f;
            ps[g] = prevS + (s - prevS) * f;
            g++;
          }
          prevR = r;
          prevTh = th;
          prevS = s;
        }
        if (s >= toEnd) break;
      }
      for (; g < profN; g++) {
        pth[g] = prevTh;
        ps[g] = prevS + (g * FIELD_PROF_DR - prevR);
      }
      return { pth, ps };
    };

    const recs: JRec[] = [];
    for (const jn of this.junctionArms) {
      // APEX FROM THE ARMS' OWN SAMPLES: the physics centroid +
      // flowOffset(point) rides a DIFFERENT displacement model than the
      // ribbons (per-control flow displacement re-splined, plus displayF
      // and tuck adjustments) - the two disagree by up to ~0.06 world
      // under flow (apex-drift census: 82/92 junctions over 0.05), so
      // wedge bases shifted against the curve-hugging flank tips and
      // fanned small ear slivers (the "jagged sticky-outy bits" seen
      // with fw > 0). The mean of each arm's arc0 sample IS the flank
      // pipeline's own junction point - zero mismatch by construction.
      let jx = 0;
      let jy = 0;
      let nA = 0;
      for (const a of jn.arms) {
        const samples = this.chainSamples[a.chain];
        if (!samples) continue;
        const closedA = this.ps.chainBreakAfter[a.chain] < 0;
        this.sampleAtSafe(
          samples,
          this.paintArcAt(samples, a.slot, closedA),
          closedA,
          this.sampleScratch,
          0
        );
        jx += this.sampleScratch[0];
        jy += this.sampleScratch[1];
        nA++;
      }
      if (nA > 0) {
        jx /= nA;
        jy /= nA;
      } else {
        // No live samples (shouldn't happen): physics-centroid fallback.
        for (const p of jn.particles) {
          jx += this.ps.positions[p * 2];
          jy += this.ps.positions[p * 2 + 1];
        }
        jx /= jn.particles.length;
        jy /= jn.particles.length;
        this.flowOffset(jx, jy, this.flowScratch);
        jx += this.flowScratch[0];
        jy += this.flowScratch[1];
      }
      const arms: JArm[] = [];
      for (const a of jn.arms) {
        const samples = this.chainSamples[a.chain];
        if (!samples) continue;
        const closedA = this.ps.chainBreakAfter[a.chain] < 0;
        this.sampleAtSafe(
          samples,
          this.paintArcAt(samples, a.slot + a.dir * 0.8, closedA),
          closedA,
          this.sampleScratch,
          0
        );
        let dx = this.sampleScratch[0] - jx;
        let dy = this.sampleScratch[1] - jy;
        const len = Math.hypot(dx, dy);
        if (len < 0.15) continue;
        dx /= len;
        dy /= len;
        const arc0 = this.paintArcAt(samples, a.slot, closedA);
        const total = samples.totalLength;
        const nextCtrl = this.armNextJointCtrl(recs.length, a);
        let nextJ = Infinity;
        if (nextCtrl !== null) {
          nextJ = (this.paintArcAt(samples, nextCtrl, closedA) - arc0) * a.dir;
          if (closedA) nextJ = ((nextJ % total) + total) % total;
          if (nextJ <= 1e-3) nextJ = Infinity;
        }
        const toEnd = closedA ? Infinity : a.dir > 0 ? total - arc0 : arc0;
        const ang = Math.atan2(dy, dx);
        const prof = buildProfile(
          samples,
          arc0,
          a.dir,
          closedA,
          toEnd,
          jx,
          jy,
          ang
        );
        arms.push({
          ang,
          dx,
          dy,
          chain: a.chain,
          dir: a.dir,
          slot: a.slot,
          arc0,
          closed: closedA,
          total,
          domain: Math.min(nextJ / 2, toEnd),
          pth: prof.pth,
          ps: prof.ps,
          top: false,
          dives: false,
          flankPts: null,
        });
      }
      arms.sort((p, q) => p.ang - q.ang);
      const j1 = this.jointGate(
        "j" + recs.length,
        jn.arms.map((a) => [a.chain, a.slot + a.dir * 0.8] as [number, number])
      );
      let mask = this.jointMaskPool[recs.length];
      if (!mask) {
        mask = new Float32Array(GAP_SLOTS);
        this.jointMaskPool[recs.length] = mask;
      }
      recs.push({
        jx,
        jy,
        arms,
        j1,
        jn: recs.length,
        rb: -1,
        mask,
      });
    }
    // JUNCTION RECORDS (joints with >= 2 arms - nothing else draws or reads
    // a field): header, the gate texel J1 = (tOn, tLast), then per arm (in
    // angle order) its chain/arc header pair and its profile, one texel per
    // radius step carrying both ends of a lookup.
    setFieldParams(fillHalf, profN);
    const armStride = 2 + profN;
    for (const rec of recs) {
      const n = Math.min(rec.arms.length, MAX_ARMS);
      if (n < 2) continue;
      rd.ensure(cursor + 2 + n * armStride);
      const D = rd.data;
      const o = cursor * 4;
      D[o] = rec.jx;
      D[o + 1] = rec.jy;
      D[o + 2] = n;
      D[o + 3] = 0;
      D[o + 4] = rec.j1[0];
      D[o + 5] = rec.j1[1];
      D[o + 6] = 0;
      D[o + 7] = 0;
      for (let i = 0; i < n; i++) {
        const a = rec.arms[i];
        const ab = (cursor + 2 + i * armStride) * 4;
        D[ab] = a.chain;
        D[ab + 1] = this.fills[a.chain].sampleCount;
        D[ab + 2] = a.closed ? 1 : 0;
        D[ab + 3] = a.total;
        D[ab + 4] = a.arc0;
        D[ab + 5] = a.dir;
        D[ab + 6] = Math.min(a.domain, 1e9);
        D[ab + 7] = a.slot; // The arm's joint ctrl (the shader's search seed).
        const pth = a.pth;
        const ps = a.ps;
        for (let g = 0; g < profN; g++) {
          const p = ab + 8 + g * 4;
          const g1 = g + 1 < profN ? g + 1 : g;
          D[p] = pth[g];
          D[p + 1] = ps[g];
          D[p + 2] = pth[g1];
          D[p + 3] = ps[g1];
        }
      }
      rec.rb = cursor;
      cursor += 2 + n * armStride;
    }
    // Nearest under-gap near edge ahead along an arm (mid-lane extents of
    // underWindows), or Infinity.
    const gapNearOf = (arm: JArm): number => {
      const win = this.underWindows.get(arm.chain);
      if (!win) return Infinity;
      let near = Infinity;
      for (let i = 0; i < win.length; i += 3) {
        let along = (win[i] - arm.arc0) * arm.dir;
        if (arm.closed) {
          along = ((along % arm.total) + arm.total) % arm.total;
          if (along > arm.total / 2) along -= arm.total;
        }
        // [center, extNeg, extPos] along the chain -> near/far edges
        // along this arm's outward direction.
        const far = along + (arm.dir > 0 ? win[i + 2] : win[i + 1]);
        if (far <= 0) continue; // Entirely behind the joint.
        const nearEdge = along - (arm.dir > 0 ? win[i + 1] : win[i + 2]);
        if (nearEdge < near) near = nearEdge;
      }
      return near;
    };
    // TOP: some nearby crossing has this arm as its OVER pass, and none
    // has it diving. An arm DIVES AT THE JOINT only when its own gap
    // starts within FILLET_DIVE_NEAR fillHalfs: a farther dive is kept out
    // of the web by the reach clamp (armReach), so the joint may still
    // ride the top layer. Counting every under-near arm as diving pinned
    // "mixed" joints (one arm over-near, another diving ~1 world out) to
    // the bottom layer, where the OVER crossing's under-thread erase
    // punched their seal discs and wedges - the hairline cracks / dark
    // bites at fat widths (crossings 23/43/62 at the cr=3 tw=0.58 repro).
    // Resolved once per arm (the wedge loop asks per wedge).
    for (const rec of recs) {
      for (const a of rec.arms) {
        const k = armKey(a.chain, a.slot, a.dir);
        const under = underNear.has(k);
        a.top = overNear.has(k) && !under;
        a.dives = under && gapNearOf(a) < fillHalf * FILLET_DIVE_NEAR;
      }
    }
    const armTop = (a: JArm): boolean => a.top;
    const armDives = (a: JArm): boolean => a.dives;
    // Discs (seal + fused tips) stay junction-level: top only when some
    // arm needs cover and none dives.
    const layerFor = (rec: JRec): TriFanMesh =>
      rec.arms.some(armTop) && !rec.arms.some(armDives)
        ? fmTop
        : fmBottom;

    // EDGE-AWARE BLEND (the field's model; FIELD_GLSL evaluates it): the
    // two bracketing arms (by their rays' angles AT THE POINT'S RADIUS -
    // curved arms) blend only across the GAP between their ribbon edges;
    // inside an arm's own width the field IS that arm's material. The old
    // centerline-to-centerline angular blend painted neighbor colors onto
    // every arm's footprint off its centerline (~40% at a flank half a
    // world out), so wherever the web met the arm's own ribbon - flank
    // edges, disc rims, crossing over-fills drawn on top with exact colors
    // - a hard seam showed (masked until the section cache re-bake made
    // ramps converge AT the joint). Where the ribbons still overlap near
    // the joint, the blend keeps FIELD_BLEND_MIN of the wedge angle,
    // centered. PROBE HOOK: the CPU reference over THIS rebuild's records.
    this.fieldProbe = {
      at: (ji, x, y, out) => {
        const rec = recs[ji];
        if (!rec || rec.rb < 0) return false;
        this.cpuJunctionField(rec.rb, x, y, out);
        return true;
      },
      arms: (ji) => recs[ji]?.arms ?? [],
      center: (ji) => (recs[ji] ? [recs[ji].jx, recs[ji].jy] : null),
      record: (ji) => recs[ji]?.rb ?? -1,
    };

    // (The over-fill "fills wear the joint field" pass is gone with the
    // over fills themselves: crossing gaps are per-pixel, so no copy of an
    // over thread is drawn on top of the web.)
    // JUNCTION GAP MASKS (per-pixel gaps; see gap_mask.ts): a joint's fans
    // are masked by the gap slots of the crossings whose UNDER pass is one
    // of its arms, whose window comes within the joinery's reach, and
    // whose OVER pass is foreign to the joint. A junction fan hides only
    // inside that over thread's silhouette, so the thread passing over the
    // arm shows on top of the web (what its over-fill used to paint - fans
    // draw above every base ribbon); no casing grooves the joint's own
    // surfaces. Free-tip caps (below) are the under thread's own material
    // and take the full mask.
    const fanReach =
      Math.max(fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius, fillHalf) +
      fillHalf;
    // A slot whose over pass is one of the joint's OWN arms (within the
    // joinery's reach of the joint) is not listed: the field already
    // renders that arm's material, and cutting the joint's disc along it
    // exposed raw tucked tips. Listed slots get the junction-fan id
    // -(slot + 2): the foreign over thread's silhouette only.
    const ownArm = (rec: JRec, slot: number): boolean => {
      const oc = this.slotOverChain[slot];
      if (oc < 0) return false;
      const oa = this.slotOverArc[slot];
      for (const a of rec.arms) {
        if (a.chain !== oc) continue;
        let along = (oa - a.arc0) * a.dir;
        if (a.closed) {
          along = ((along % a.total) + a.total) % a.total;
          if (along > a.total / 2) along -= a.total;
        }
        if (along > -fillHalf && along < fanReach + fillHalf) return true;
      }
      return false;
    };
    const jointMask = (rec: JRec): void => {
      rec.mask.fill(-1);
      const cand: number[] = [];
      for (const a of rec.arms) {
        const wins = this.chainWins.get(a.chain);
        if (!wins) continue;
        for (let w = 0; w < wins.length; w += 4) {
          let along = (wins[w + 1] - a.arc0) * a.dir;
          if (a.closed) {
            along = ((along % a.total) + a.total) % a.total;
            if (along > a.total / 2) along -= a.total;
          }
          const lo = along - (a.dir > 0 ? wins[w + 2] : wins[w + 3]);
          const hi = along + (a.dir > 0 ? wins[w + 3] : wins[w + 2]);
          if (hi < -fillHalf || lo > fanReach) continue;
          const slot = wins[w];
          if (ownArm(rec, slot)) continue;
          const dist = Math.max(0, lo);
          // Search the SLOT entries only: cand interleaves [slot, dist],
          // and slot 0 would match any dist of exactly 0.
          let at = -1;
          for (let i = 0; i < cand.length; i += 2) {
            if (cand[i] === slot) {
              at = i;
              break;
            }
          }
          if (at < 0) cand.push(slot, dist);
          else cand[at + 1] = Math.min(cand[at + 1], dist);
        }
      }
      // Nearest GAP_SLOTS crossings win.
      const n = cand.length / 2;
      for (let k = 0; k < Math.min(GAP_SLOTS, n); k++) {
        let bi = -1;
        let bd = Infinity;
        for (let i = 0; i < n; i++) {
          if (cand[i * 2] >= 0 && cand[i * 2 + 1] < bd) {
            bd = cand[i * 2 + 1];
            bi = i;
          }
        }
        if (bi < 0) break;
        rec.mask[k] = -(cand[bi * 2] + 2);
        cand[bi * 2] = -1;
      }
    };
    for (const rec of recs) jointMask(rec);
    const setFanMask = (ids: Float32Array | null): void => {
      if (ids) {
        fmBottom.maskIds.set(ids);
        fmTop.maskIds.set(ids);
      } else {
        fmBottom.maskIds.fill(-1);
        fmTop.maskIds.fill(-1);
      }
    };
    // Every junction fan (seal disc, fused-tip disc, wedge) goes through
    // here: geometry plus the joint's record index - the shader evaluates
    // the field per pixel, so one apex-to-rim triangle per rim segment
    // renders it exactly (no ring subdivision, no per-vertex colors).
    const emitFan = (
      rec: JRec,
      cx: number,
      cy: number,
      rim: number[]
    ): void => {
      fm.pushFan(cx, cy, rim, rec.rb);
    };
    const pushDiscField = (
      rec: JRec,
      cx: number,
      cy: number,
      r: number
    ): void => {
      emitFan(rec, cx, cy, discRim(cx, cy, r));
    };

    // Tip positions read the ENDPOINT SAMPLE directly: sampleAt wraps its
    // arc modulo totalLength, so asking it for arc == total lands at arc 0
    // - every atEnd tip disc rendered at its chain's START, carrying the
    // far end's host color across the thread (the floating gold/pale dot
    // reports; the arcAt terminal-wrap bug's sibling).
    const tipXY = (samples: SplineSamples, atEnd: boolean): void => {
      const k = atEnd ? samples.count - 1 : 0;
      this.sampleScratch[0] = samples.positions[k * 2];
      this.sampleScratch[1] = samples.positions[k * 2 + 1];
    };
    // Rounded caps: dead-end tips get a disc at the terminal wearing
    // their own live material (nothing overlaps a free tip).
    for (const tip of this.freeTips) {
      const samples = this.chainSamples[tip.chain];
      if (!samples) continue;
      tipXY(samples, tip.atEnd);
      const cx = this.sampleScratch[0];
      const cy = this.sampleScratch[1];
      const k = tip.atEnd ? samples.count - 1 : 0;
      const tx = samples.tangents[k * 2];
      const ty = samples.tangents[k * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      // A tip diving under something wears that gap on its cap disc too.
      const tipArc = tip.atEnd ? samples.totalLength : 0;
      const tm = this.tipMaskScratch;
      tm.fill(-1);
      const tw = this.chainWins.get(tip.chain);
      for (let wi = 0, n = 0; tw && wi < tw.length && n < GAP_SLOTS; wi += 4) {
        const off = tipArc - tw[wi + 1];
        if (off >= -tw[wi + 2] - fillHalf && off <= tw[wi + 3] + fillHalf) {
          tm[n++] = tw[wi];
        }
      }
      setFanMask(tm);
      pushDisc(
        cx,
        cy,
        fillHalf * 0.99,
        tip.chain,
        tipArc,
        tx / tl,
        ty / tl,
        tip.atEnd ? this.ps.chains[tip.chain].length - 1 : 0
      );
      setFanMask(null);
    }
    // Tucked fused tips get the same disc (rounds the cap, covers its
    // corner ears and the cap/host sliver). The tuck point IS a junction,
    // so the disc wears the shared junction field - axis-projected HOST
    // sampling painted host color over the bridge arm's ramp, a faint rim
    // arc on the bridge side (circled in the phone zooms).
    for (const tip of this.fusedTips) {
      const samples = this.chainSamples[tip.chain];
      const hostSamples = this.chainSamples[tip.hostChain];
      if (!samples || !hostSamples) continue;
      tipXY(samples, tip.atEnd);
      const cx = this.sampleScratch[0];
      const cy = this.sampleScratch[1];
      let rec: JRec | null = null;
      let best = fillHalf * fillHalf * 9;
      for (const r of recs) {
        if (r.arms.length < 2) continue;
        const ddx = r.jx - cx;
        const ddy = r.jy - cy;
        const dd = ddx * ddx + ddy * ddy;
        if (dd < best) {
          best = dd;
          rec = r;
        }
      }
      if (rec) {
        if (rec.j1[0] > fxNowJ + GATE_LEAD) continue;
        fm = layerFor(rec);
        setFanMask(rec.mask);
        // CAP COVER (TIP_DISC_SCALE): the disc reaches the tucked cap's
        // corners without bulging past the bridge's sides - every rim
        // point is clamped into the bridge's own strip (|lateral| <=
        // TIP_DISC_SIDE half-widths) and to 0.99 half-widths behind the
        // tuck point (the old disc's reach into the host). A plain wider
        // disc rounded into the backdrop and neighbors' casing gaps.
        const k = tip.atEnd ? samples.count - 1 : 0;
        let ux = samples.tangents[k * 2];
        let uy = samples.tangents[k * 2 + 1];
        const ul = Math.hypot(ux, uy) || 1;
        ux /= ul;
        uy /= ul;
        if (tip.atEnd) {
          // Inward, into the bridge.
          ux = -ux;
          uy = -uy;
        }
        const rim = discRim(cx, cy, fillHalf * this.tipDiscScale);
        const side = fillHalf * TIP_DISC_SIDE;
        const back = fillHalf * 0.99;
        for (let i = 0; i < rim.length; i += 2) {
          const dx = rim[i] - cx;
          const dy = rim[i + 1] - cy;
          const s = Math.max(-back, dx * ux + dy * uy);
          const l = Math.max(-side, Math.min(side, dy * ux - dx * uy));
          rim[i] = cx + ux * s - uy * l;
          rim[i + 1] = cy + uy * s + ux * l;
        }
        emitFan(rec, cx, cy, rim);
        setFanMask(null);
        fm = fmBottom;
        continue;
      }
      // No junction within reach (shouldn't happen): host-axis fallback.
      const closedH = this.ps.chainBreakAfter[tip.hostChain] < 0;
      const arcH = this.paintArcAt(hostSamples, tip.hostCtrl, closedH);
      axisAt(tip.hostChain, arcH);
      pushDisc(
        cx,
        cy,
        fillHalf * 0.99,
        tip.hostChain,
        arcH,
        this.axisScratch[0],
        this.axisScratch[1],
        tip.hostCtrl
      );
    }

    // Upload this rebuild's geometry and records.
    const finish = (): void => {
      fmBottom.commit();
      fmTop.commit();
      rd.markDirty(0, cursor);
      rd.flush();
    };
    if (recs.length === 0) {
      finish();
      return;
    }
    const w = fillHalf * 0.97;
    const L = fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius;
    const drawWedges = this.cuspRadius > 0.05 && L > w * 0.3;
    // JOINERY HONORS THE WEAVE (the yarn's Stage 24b rule): a flank stops
    // short of its arm's nearest under-gap. Junction clearance never caps
    // a cut's COVERAGE, so a crossing parked near a joint cuts within the
    // web's reach (0.24 world vs L 0.55 at cr 2.1); the erase only spans
    // the under thread's width, so web material past the cut survived
    // beside it and floated into the dark gap as a pale spur.
    const armReach = (arm: JArm): number => {
      // The joint's own domain caps every flank (short bridges).
      const dom = Math.min(L, Math.max(L * FILLET_GAP_MIN_FRAC, arm.domain));
      const near = gapNearOf(arm);
      return Math.min(
        dom,
        Math.max(L * FILLET_GAP_MIN_FRAC, near - fillHalf * FILLET_GAP_PAD)
      );
    };

    for (const rec of recs) {
      const jx = rec.jx;
      const jy = rec.jy;
      const arms = rec.arms;
      if (arms.length < 2) continue;
      if (rec.j1[0] > fxNowJ + GATE_LEAD) continue;
      fm = layerFor(rec);
      setFanMask(rec.mask);
      const jointTop = arms.some(armTop);


      // Seal the junction center with a disc of the junction field under
      // the fillets: the concave-side miter clamp can thin a host ribbon
      // at a bend, opening a nick between a tucked cap and the receded
      // edge regardless of tuck depth.
      pushDiscField(rec, jx, jy, fillHalf * 0.92);

      if (!drawWedges) continue;

      for (let k = 0; k < arms.length; k++) {
        const A = arms[k];
        const B = arms[(k + 1) % arms.length];
        let gap = B.ang - A.ang;
        if (k === arms.length - 1) gap += Math.PI * 2;
        // Only the near-straight pass-through side gets no fillet (a patch
        // across ~180 degrees would bulge off the host's far edge).
        if (gap > FILLET_MAX_WEDGE) continue;

        // PER-WEDGE layer: this wedge rides above the erase stack iff a
        // nearby foreign thread dives under ANY arm of this joint and
        // neither of ITS arms dives itself. (Only its own arms was not
        // enough: a joint parked beside a crossing's OVER pass has its
        // other wedges - bridge vs the host's far side - sitting in that
        // crossing's under-thread erase footprint; they stayed bottom and
        // were punched - the dark notches/hairlines at cr=3, tw=0.58.)
        fm =
          (jointTop || armTop(A) || armTop(B)) &&
          !armDives(A) &&
          !armDives(B)
            ? fmTop
            : fmBottom;

        // A's wedge-facing edge is its LEFT edge; B's is its RIGHT edge.
        const o1x = jx - A.dy * w;
        const o1y = jy + A.dx * w;
        const o2x = jx + B.dy * w;
        const o2y = jy - B.dx * w;
        // Corner = the edge intersection when it is sane; otherwise (near-
        // parallel arms - junction arms relax to shallow angles, nothing
        // constrains them - or a curvature-displaced corner) fall back to
        // the midpoint between the edge origins, which collapses the
        // fillet into a sliver-filling patch instead of SKIPPING and
        // leaving the reported V-notch holes between shallow arms.
        const denom = A.dx * B.dy - A.dy * B.dx;
        const lim = w * FILLET_CORNER_LIM;
        let cx = (o1x + o2x) / 2;
        let cy = (o1y + o2y) / 2;
        if (Math.abs(denom) >= 0.08) {
          const rx = o2x - o1x;
          const ry = o2y - o1y;
          const t = (rx * B.dy - ry * B.dx) / denom;
          const s = (rx * A.dy - ry * A.dx) / denom;
          if (t >= -w * 0.5 && t <= lim && s >= -w * 0.5 && s <= lim) {
            cx = o1x + A.dx * t;
            cy = o1y + A.dy * t;
          }
        }

        // Each flank HUGS its arm's true curved silhouette: sample the
        // centerline along the arc out to L and offset to the wedge-
        // facing edge. The old straight-line extrapolation (edge origin
        // + dir * L) diverged from curved arms - fillet EARS poked past
        // the silhouette on a curve's outside and crotch GAPS opened on
        // its inside (user report at cr=1.25). The outer rim stays a
        // corner-controlled bezier between the two flanks' real tips.
        const flank = (
          arm: JArm,
          left: boolean,
          out: number[]
        ): void => {
          // The centerline points + outward tangents are shared by the
          // arm's two wedges (only the offset side differs).
          let fp = arm.flankPts;
          if (!fp) {
            const reach = armReach(arm);
            const samples = this.chainSamples[arm.chain]!;
            const np = Math.min(
              FILLET_EDGE_PTS_MAX,
              Math.max(
                FILLET_EDGE_PTS,
                Math.ceil((0.88 * reach) / FILLET_EDGE_CHORD) + 1
              )
            );
            fp = new Float64Array(np * 4);
            for (let e = 0; e < np; e++) {
              const sArc = (0.12 + (0.88 * e) / (np - 1)) * reach;
              const a0 = normArc(
                arm.arc0 + arm.dir * sArc,
                arm.total,
                arm.closed
              );
              const a1 = normArc(
                arm.arc0 + arm.dir * (sArc + 0.08),
                arm.total,
                arm.closed
              );
              this.sampleAtSafe(samples, a0, arm.closed, this.sampleScratch, 0);
              const px = this.sampleScratch[0];
              const py = this.sampleScratch[1];
              this.sampleAtSafe(samples, a1, arm.closed, this.sampleScratch, 0);
              // a1 already sits FARTHER OUT along the arm than a0 (both
              // step by arm.dir), so this difference IS the outward
              // tangent. Multiplying by arm.dir again (the Stage 16d form)
              // mirrored every dir = -1 flank onto its arm's FAR edge: the
              // fan swept across the whole arm, painting the junction-field
              // blend over the thread and cutting it with a diagonal rim
              // (pale shards / smudges ON the weave; 100% of dir = -1
              // flank vertices measured on the far edge).
              let tx = this.sampleScratch[0] - px;
              let ty = this.sampleScratch[1] - py;
              const tl = Math.hypot(tx, ty);
              if (tl > 1e-6) {
                tx /= tl;
                ty /= tl;
              } else {
                // Both probes inside a fused tip's tuck (samples collapsed
                // onto the tuck point): use the arm's junction direction.
                tx = arm.dx;
                ty = arm.dy;
              }
              fp[e * 4] = px;
              fp[e * 4 + 1] = py;
              fp[e * 4 + 2] = tx;
              fp[e * 4 + 3] = ty;
            }
            arm.flankPts = fp;
          }
          const sgn = left ? w : -w;
          for (let e = 0; e < fp.length / 4; e++) {
            const px = fp[e * 4];
            const py = fp[e * 4 + 1];
            out.push(px - fp[e * 4 + 3] * sgn, py + fp[e * 4 + 2] * sgn);
          }
        };
        const edgeA: number[] = [];
        const edgeB: number[] = [];
        flank(A, true, edgeA);
        flank(B, false, edgeB);

        // Perimeter: A's flank inner->outer, bezier rim to B's outer tip
        // (control = corner), B's flank outer->inner. Every pixel
        // evaluates the shared junction field, so the wedge is a window
        // onto the same continuous material as the discs and ribbons.
        const n = FILLET_BEZIER_STEPS;
        const rim: number[] = [];
        const pushPt = (px: number, py: number): void => {
          rim.push(px, py);
        };
        const nA = edgeA.length / 2;
        const nB = edgeB.length / 2;
        for (let e = 0; e < nA; e++) {
          pushPt(edgeA[e * 2], edgeA[e * 2 + 1]);
        }
        const pax = edgeA[(nA - 1) * 2];
        const pay = edgeA[(nA - 1) * 2 + 1];
        const pbx = edgeB[(nB - 1) * 2];
        const pby = edgeB[(nB - 1) * 2 + 1];
        for (let i = 1; i < n; i++) {
          const q = i / n;
          const m0 = (1 - q) * (1 - q);
          const m1 = 2 * (1 - q) * q;
          const m2 = q * q;
          pushPt(
            m0 * pax + m1 * cx + m2 * pbx,
            m0 * pay + m1 * cy + m2 * pby
          );
        }
        for (let e = nB - 1; e >= 0; e--) {
          pushPt(edgeB[e * 2], edgeB[e * 2 + 1]);
        }
        // Fan from the JUNCTION CENTER, not the edge-intersection corner:
        // the corner comes from a straight-line edge model and lands
        // OUTSIDE the true silhouette on curved hosts - fan triangles to
        // it poked jagged stick-outs past the edges (user report). The
        // center is always inside the joint; the corner survives only as
        // the outer rim's bezier control.
        emitFan(rec, jx, jy, rim);
      }
    }
    setFanMask(null);
    finish();
  }

  destroy(): void {
    this.root.destroy({ children: true });
    // The accent texture and section shader deliberately survive
    // (page-lifetime singletons) - see their comment for why destroying
    // them here blanks the screen.
  }
}
