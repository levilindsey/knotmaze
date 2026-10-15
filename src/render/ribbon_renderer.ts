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
  Container,
  ExtensionType,
  GlProgram,
  Graphics,
  Shader,
  Texture,
  extensions,
} from "pixi.js";
import type { Renderer } from "pixi.js";
import { createNoise2D, createNoise3D } from "simplex-noise";
import type { ParticleSystem, CrossingPass } from "../physics/particle_system";
import type { ColorScheme, SectionRuns } from "../core/section_colors";
import {
  blendEase,
  constantSectionRuns,
  gamutConfig,
  gamutRgb,
} from "../core/section_colors";
import type { AppearFxMode } from "../core/reveal_plan";
import type { RevealAnimator } from "./reveal";
import { AppearFxSystem } from "./appear_fx";
import { SeededRNG } from "../util/random";
import type { SplineSamples } from "../geometry/spline_generator";
import {
  sampleClosedSpline,
  sampleOpenSpline,
  splineBend,
} from "../geometry/spline_generator";
import { ProbeTriMesh, RibbonMesh, TriFanMesh } from "./ribbon_mesh";
import {
  KNOT_UNIFORMS_GLSL,
  PAINT_CONST_GLSL,
  PAINT_DATA_GLSL,
  PAINT_FRAG_DECL,
  PAINT_FRAG_LIB,
  PAINT_FX_GLSL,
  PAINT_GATE_GLSL,
  PAINT_PAINT_GLSL,
  PAINT_SECTION_GLSL,
  PAINT_VERT_DECL,
  PAINT_VERT_MAIN,
} from "./paint_glsl";
import {
  PaintScene,
  kData,
  kGeom,
  kPaint,
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
  kCtrlOfArcNear,
  kFxAge,
  kFxColor,
  kFxDoneWall,
  kFxSettleWall,
  kIgnition,
  kRevealMaskAt,
  kRevealTime,
  kSampleArc,
  kSectionAtArc,
  kShadeFx,
  kSwell,
  kWall,
  kComposePaint,
  kGlow,
  kExploreAt,
  kPaintAt,
  kRimAcross,
  kRimOver,
  kRimScale,
  kWrap,
  knotSection,
  smoothInv,
  sourcePieces,
  type KChain,
  type KData,
  type KExploreState,
  type KPaintState,
  type KIgn,
} from "./paint_math";
import { FX_STYLE, ITEM_FLAG, PAINT_CONST, PAINT_ITEM } from "./paint_const";
import { PluckOverlay, bindPluckGap } from "./pluck_overlay";
import type { PluckHost, PluckNode } from "./pluck_overlay";
import {
  FIELD_BLEND_MIN,
  FIELD_PROF_ARC,
  FIELD_PROF_DR,
  MAX_ARMS,
  MAX_ROUTES,
  MAX_ROUTE_VERTS,
  ROUTE_BAND_PAD,
  bindFieldGap,
  junctionShader,
  junctionShaderExplore,
  recordData,
  setFieldParams,
} from "./junction_field";
import { pickRoutes, routeCorner, routeCubic } from "./junction_routes";
import { WebFade } from "./web_fade";
import {
  EXPLORE_ITEM_CHAR,
  EXPLORE_ITEM_VIS,
  chainWhole,
  charItem,
  charRange,
  classifyExploreCut,
  exploreArcMap,
  visItem,
  visRange,
  withExplore,
} from "./explore_glsl";
import type { ExploreCut } from "./explore_glsl";
import { pieceVis } from "../game/explore_view";
import type { ExploreBurn, ExplorePiece } from "../game/explore_view";
import type { PaintRoute } from "./junction_routes";
import {
  STRIP_STATS,
  STRIP_W,
  setStripExplore,
  setStripRows,
  stripTable,
  stripTexture,
} from "./arm_strip";
import {
  GAP_FRAG,
  GAP_MAX_PTS,
  GAP_UPLOAD_STATS,
  GAP_PROT_PTS,
  GAP_SLOTS,
  GAP_VERT_DECL,
  GAP_VERT_MAIN,
  GapMaskTable,
  defaultGapTexture,
} from "./gap_mask";
import { FloatRows, ROW_W } from "./float_rows";
import {
  RANGE_FLOATS,
  SAMP_UPLOAD_STATS,
  assignWindowLanes,
  b64ToF32,
  b64ToF64,
  chainCaps,
  g3Layout,
  maxRangeEntries,
  packRadii,
  packRanges,
  packSamp,
  typedToB64,
  writeChainTexels,
} from "./samp_table";
import { EMERGENT_MAX, EMERGENT_ROW } from "../physics/particle_system";

// K8 G3-0: the probe capture (captureScene / restoreScene): plain JSON, typed
// arrays as base64.
export interface SceneCapture {
  v: 1;
  n: number;
  c: number;
  positions: string;
  passes: string;
  emergent: string;
  scalars: string;
  gateLatch: string;
  gateCache: string;
  uniforms: Record<string, string>;
  explore: ExplorePiece[] | null;
}
// The appearance reveal's clock (RevealAnimator keeps `t` private).
interface RevealClock {
  t: number;
  done: boolean;
  speed: number;
}
import type { G3Layout } from "./samp_table";

// G3-0 DATA PLANE (K8 stage 2; samp_table.ts is the format): the four
// page-lifetime tables the SDF ribbons will read - SAMP, RADII, G3 CHAIN,
// RANGES. Nothing samples them yet, so no shader binds them: G3DataSystem
// makes each one GPU-resident on the current context (initSource:
// allocate + full upload) and uploads dirty rows before every render.
// RibbonRenderer.update() writes the mirrors and flushes (dirty rows only;
// nothing while asleep, when update() does not run). One live renderer at
// a time writes them (like the G2 paint tables).
interface G3Tables {
  samp: FloatRows;
  radii: FloatRows;
  chain: FloatRows;
  ranges: FloatRows;
  // RANGES entries in use (a shorter frame zeroes the stale tail).
  rangeCount: number;
}
let G3: G3Tables | null = null;
function g3Tables(): G3Tables {
  if (!G3) {
    G3 = {
      samp: new FloatRows(ROW_W, 1, SAMP_UPLOAD_STATS),
      radii: new FloatRows(ROW_W, 1, SAMP_UPLOAD_STATS),
      chain: new FloatRows(ROW_W, 1, SAMP_UPLOAD_STATS),
      ranges: new FloatRows(ROW_W, 1, SAMP_UPLOAD_STATS),
      rangeCount: 0,
    };
  }
  return G3;
}
function g3List(t: G3Tables): FloatRows[] {
  return [t.samp, t.radii, t.chain, t.ranges];
}
function g3Flush(): void {
  if (G3) for (const t of g3List(G3)) t.flush();
}
class G3DataSystem {
  static extension = {
    type: [ExtensionType.WebGLSystem],
    name: "knotG3Data",
    priority: 0,
  };
  private readonly renderer: Renderer;
  // Tables with a GL texture on the current context.
  private readonly resident = new Set<FloatRows>();
  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }
  prerender(): void {
    if (!G3) return;
    for (const t of g3List(G3)) {
      if (!this.resident.has(t)) {
        this.renderer.texture.initSource(t.source);
        this.resident.add(t);
      } else {
        t.flush();
      }
    }
  }
  // A restored context starts without textures: re-create and re-upload.
  contextChange(): void {
    this.resident.clear();
  }
  destroy(): void {}
}
extensions.add(G3DataSystem);

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
// K145: the hover glow's run - a walk run that is not a choice, under the
// pointer (or a touch press). Its ctrl span is unwrapped (c1 >= c0, a
// closed chain's c1 may pass its length), and `at` is the hover point as
// an unwrapped ctrl inside it.
export interface PaintRim {
  chain: number;
  c0: number;
  c1: number;
  at: number;
}
// K81: a route (junction_routes.ts PaintRoute) resolved against the static
// junction arms: the arm it arrived by and the arm it left by (null = a
// one-arm route), as junction arms (chain, particle slot, direction).
interface RouteJArm {
  chain: number;
  slot: number;
  dir: 1 | -1;
}
interface ResolvedRoute {
  a: RouteJArm;
  b: RouteJArm | null;
}

// GAMEPLAY PAINT (G2.3): the paint declaration (setPaint - traveled
// spans, junction caps, pulse arms) is evaluated PER PIXEL by the section
// shader (paint_glsl kPaintAt / kComposePaint, from KPAINT records) and
// composed in closed form - the 256x1 accent strip it replaces held
//   band A (white, weight 0.94 (1 - i / 111)) | base (weight 0) | gold |
//   band B (gold -> 0.94 white),
// so mix(section, strip(U)) == mix(S, white, K_BAND v) on band A,
// mix(gold, white, K_BAND v) on band B and mix(S, gold, p) on the gold
// ramp. The strip's ORDER was load-bearing because per-vertex U
// interpolated linearly between samples (the hairline lore); per pixel
// there is no interpolation left to protect. Since K75 a pulse brightens
// the thread's OWN paint, mix(mix(S, gold, p), white, K_BAND v): the two
// bands are its p = 0 / p = 1 cases, and the per-arm band choice (an
// onPath flag) that drew gold crest bands over a fading trail is gone.
// (The pulse constants live in paint_const.ts - the shaders evaluate the
// trains; see paint_math kPulseV for their model.)
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
// (SECTION CACHE DRIFT is gone since G2.2: the vertex shader evaluates the
// section at each vertex's ctrl through the CURRENT arc table every frame,
// so a joint always converges - the old per-sample cache needed re-bakes
// past 0.1 ctrl of drift, ~30 per second under flow.)
// Layer vote: an under-near arm only pins its joint to the punchable
// bottom layer when its gap starts within this many fillHalfs (see
// rebuildFillets armDives).
const FILLET_DIVE_NEAR = 2.0;
const DISC_SEGS = 16; // Rim segments on tip/junction seal discs.
// K81 COVER STRIPS: at a routed junction every arm's ribbon is redrawn in
// the junction pass (the field's untraveled base under the route bands)
// out to its cover reach, from the arm's own extruded ribbon vertices: the
// arms' gold ribbons would otherwise square off the band's turn (the union
// of two straight gold ribbons fills the corner outside the arc). At most
// this many ribbon samples per strip.
const COVER_STRIP_PTS = 32;
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
} = PAINT_CONST;
// Comet streak tail polyline: points sampled along the host thread
// behind each reveal tip (spawnTipFrontier -> AppearFxSystem).
const FX_PATH_PTS = 8;
const FX_PATH_STEP = 0.5;
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
${PAINT_GATE_GLSL}
${PAINT_FX_GLSL}
${PAINT_PAINT_GLSL}
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
function sectionShader(): SectionShader {
  if (!SECTION_SHADER) {
    const sh = new Shader({
      glProgram: sectionProgram(false),
      resources: {
        // pixi binds every TextureSource resource to the sampler uniform of
        // the same name; bindGap swaps it per scene.
        uGapData: defaultGapTexture().source,
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
function sectionShaderExplore(): SectionShader {
  if (!SECTION_EXPLORE_SHADER) {
    const sh = new Shader({
      glProgram: sectionProgram(true),
      resources: {
        uGapData: sectionShader().resources.uGapData,
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

function samePieces(a: readonly ExplorePiece[], b: readonly ExplorePiece[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (
      p.chain !== q.chain ||
      p.c0 !== q.c0 ||
      p.c1 !== q.c1 ||
      p.f0 !== q.f0 ||
      p.f1 !== q.f1 ||
      p.tip0 !== q.tip0 ||
      p.tip1 !== q.tip1
    ) {
      return false;
    }
  }
  return true;
}

// K290: whether two burn declarations are the same (null = no burn).
function sameBurn(a: ExploreBurn | null, b: ExploreBurn | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const g = a.gate === b.gate || (!!a.gate && !!b.gate && samePieces(a.gate, b.gate));
  if (!g) return false;
  if (a.char === b.char) return true;
  if (!a.char || !b.char || a.char.length !== b.char.length) return false;
  for (let i = 0; i < a.char.length; i++) {
    const p = a.char[i];
    const q = b.char[i];
    if (p.chain !== q.chain || p.b0 !== q.b0 || p.b1 !== q.b1) return false;
  }
  return true;
}

// Point every gap reader - the shared section shader (ribbons), the
// junction-field shader (fans) and the still-pluck program - at a scene's
// gap-slot table (gap tables are page-lifetime and sized per scene - see
// gap_mask.ts).
function bindGap(tex: Texture): void {
  bindFieldGap(tex);
  bindPluckGap(tex);
  const sh = sectionShader();
  if (sh.resources.uGapData !== tex.source) sh.resources.uGapData = tex.source;
  const ex = SECTION_EXPLORE_SHADER;
  if (ex && ex.resources.uGapData !== tex.source) ex.resources.uGapData = tex.source;
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
// K76 2b, the thread reveal's marker gate: a marker disc's gap shows once
// its thread point is this visible (the exit marker's own rule;
// applyExploreGaps).
const EXPLORE_MARKER_VIS = 0.98;
// K268 stage 2 (K275), the joint gate: a junction's web and fans emit no
// record once an arm's visibility at its slot is at most this, nor a free
// tip's cap once its thread's is at the tip (exploreJointShown). Above it
// they draw, faded with their threads by the arm strips' premultiplied
// alpha (arm_strip.ts withExploreStrip, junction_field.ts withExploreField).
const EXPLORE_JOINT_MIN = 0.002;
// K76 stage 2c: hidden thread is empty space for input below this
// visibility (pickThread, exploreShownAt: taps, hover, plucks, the tug's
// grab).
const EXPLORE_PICK_VIS = 0.5;
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
  // K76 2b, per gap slot: the over pass's render ctrl (its visibility gates
  // the gap), whether update() solved the slot this frame (1) or cleared it
  // (0: a far-future gate, an unused emergent slot), and whether the thread
  // reveal kept the slot's CPU bookkeeping (underWindows, pluck footprints)
  // out because its over thread was hidden (vis <= 0.5) when update() ran.
  private slotOverCtrl = new Float64Array(0);
  private slotLive = new Uint8Array(0);
  private slotExploreHid = new Uint8Array(0);
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
  // K145: the hover glow's run (setRim) and the key of the KPAINT item it
  // last wrote; the hover point rides a uniform (setRimAt).
  private paintRim: PaintRim | null = null;
  private rimKey = "";
  private rimAt = 0;
  private paintClock = 0;
  // K81 route bands (junction_routes.ts): the path's passes through
  // junctions, oldest first; routeKey keys the fillet rebuild that draws
  // them, routedArms holds every arm ("chain:slot") of a junction holding
  // at least one resolved route - the paint caps there are dropped (the
  // band and the untraveled web decide those pixels) - unless the junction
  // is FULLY TRAVELED (K127: fullJn, every arm on a traveled pass), which
  // keeps its caps and the pre-K81 composed web under its bands.
  private paintRoutes: PaintRoute[] = [];
  private paintTraveled: PaintRoute[] = [];
  private routeKey = "";
  private routedArms = new Set<string>();
  private fullJn = new Set<number>();
  // K169: the fully traveled webs fading in, and (K191) the ones that stopped
  // being full fading out (web_fade.ts), and each record's base texel by
  // junction index (the fade rewrites J1.z there without a fillet rebuild).
  // `webFade.seconds = 0` turns the fades off (probes).
  webFade = new WebFade();
  private recBaseByJn = new Map<number, number>();
  // The routes resolved to junctions (junctionArms index -> its passes,
  // oldest first, at most MAX_ROUTES; b null = a one-arm route), and the
  // lookup that resolves them ("chain:slot:dir" -> junctionArms index;
  // built lazily, junctionArms never changes).
  private routesByJn = new Map<number, ResolvedRoute[]>();
  private armJunction: Map<string, number> | null = null;
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
  // Live reach of the pulse trains along each arm, world (= lattice) units
  // of arc from the junction (the pulseReach panel param, K75; main.ts
  // syncs it every tick): the train fades out over the last
  // PULSE_REACH_FADE of it (at most half). Infinity = whole arms (the
  // pre-K75 trains).
  pulseReach = Infinity;
  // Live strength of the hover glow (the hoverGlow panel param, K145;
  // main.ts syncs it every tick): 0 = off. The glow's run comes from
  // setRim.
  hoverGlow = 0;
  // Its width, how far in from each edge it reaches in half-widths (the
  // hoverGlowWidth panel param, K111 stage 4; main.ts syncs it every tick).
  hoverGlowWidth: number = PAINT_CONST.RIM_EDGE;
  // Its own length along the thread, world arc from the hover point to
  // where it has faded out (hoverGlowLength, K298; pulseReach's before),
  // and the fade in from each end gap (hoverGlowFade, K298; RIM_END_FADE
  // 0.75 before). main.ts syncs both every tick.
  hoverGlowLength = 3;
  hoverGlowFade = 0.2;
  // High contrast's highlight prototype (K111 stage 4, K265; main.ts syncs
  // it every tick: 0 unless High contrast is on), sent as uKBase.y. 0 =
  // today's pulses.
  hcLook = 0;
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
  // G3-0 DATA PLANE (module G3 above): this scene's layout in the tables,
  // each chain's cap kinds (2 per chain), its RADII base or -1 (unit
  // width) as last written, its RANGES slot windows (base, count), and
  // the frame's RANGES scratch. `g3Data` false skips every G3 write (A/B
  // probes: the cost of the data plane in one page).
  g3Data = true;
  private g3: G3Layout;
  private g3Caps: Int32Array;
  private g3Rad: Int32Array;
  private g3WinBase: Int32Array;
  private g3NWin: Int32Array;
  private g3Accepted: number[] = [];
  private g3RangeScratch = new Float32Array(256 * RANGE_FLOATS);
  // G2 SHADER PAINT: this scene's data-texture layout, the debug view
  // (probes: 0 off, 1 = ctrl, 2 = arc, 3 / 4 = the fans' per-arm views,
  // 5 = the ribbons' paint terms - see SECTION_FRAG) and the probe
  // triangle mesh (lazily built by probeTris).
  private paintScene: PaintScene;
  paintDebug = 0;
  private probeMesh: ProbeTriMesh | null = null;
  private filletMesh: TriFanMesh | null = null;
  // G2.2 SECTION RUNS (core/section_colors; evaluated by the vertex shader):
  // the noise scheme's field, junctionBlend (lattice units; a uniform), and
  // every chain's control positions at construction - the noise scheme's
  // coordinates are read there, so its colors stick to the material
  // (deterministic, whatever the pre-sim and flow do).
  private sectionNoise: ((x: number, y: number) => number) | null = null;
  private junctionBlend = 0;
  private initialControls: Float32Array[] = [];
  // Junction arm -> next joint ctrl along it (see armNextJointCtrl).
  private nextJointCache = new Map<string, number | null>();
  // Junction-field arm profiles, pooled across fillet rebuilds (fixed
  // length per rebuild geometry; reset when the length changes).
  private fieldProfPool: Float32Array[] = [];
  private fieldProfLen = 0;
  // Joinery rebuild gating (see rebuildFillets): bumped by every update();
  // the last rebuild's inputs.
  private geomRev = 0;
  private filletKey = "";
  // Scratch for the junction-field composition (rebuildFillets).
  private fieldMbScratch = new Float32Array(4);
  // K81: the band corner's two arm frames (rebuildFillets cornerCubic).
  private routeScratch = new Float64Array(8);
  // PROBE HOOK (diagnostics only): the last rebuild's junction field -
  // `at(ji, x, y, out, px?, strip?)` writes the composed [r, g, b] at a
  // world point (junction index = junctionArms index; px = world units per
  // pixel, strip = a K81 cover-strip pixel); `arms(ji)` lists that joint's
  // arms, `routes(ji)` its K81 route bands. A CPU transliteration of the
  // GPU shader reading the SAME record + paint data the shader samples
  // (cpuJunctionField) - the ground truth for GPU-vs-CPU and
  // field-vs-ribbon censuses.
  fieldProbe: {
    at: (
      ji: number,
      x: number,
      y: number,
      out: Float32Array,
      px?: number,
      strip?: boolean
    ) => boolean;
    arms: (ji: number) => unknown[];
    routes: (ji: number) => unknown[];
    center: (ji: number) => [number, number] | null;
    // The joint's record texel index (-1: no field) - what a fan's aRec
    // carries.
    record: (ji: number) => number;
    // The joint's gate texel J1 = (tOn, tLast) (reveal-relative wall s).
    gate: (ji: number) => [number, number] | null;
    // The arms the last at() sampled: [chain, arc, seed] per arm (probes).
    lastArms: () => number[];
    // K127: the joint is fully traveled (its routed web reads composed).
    full: (ji: number) => boolean;
    // K169: the record's J1.z, how far the fully traveled web has faded in
    // (0 untraveled .. 1 composed; -1: no record).
    fade: (ji: number) => number;
  } | null = null;
  private fieldLastArm: number[] = [];
  // ARM STRIPS (arm_strip.ts): rows written by the current rebuild, and
  // the CPU mirror's scratch (two quantized texels).
  private stripRowsUsed = 0;
  private stripK0 = new Float32Array(4);
  private stripK1 = new Float32Array(4);
  // K268 stage 2: kExploreAt's CPU twin's scratch (cpuChainMaterial).
  private exploreAtScratch: KExploreState = { v: 0, tip: -1, solid: 0, x: 0 };
  // Diagnostics (probes): the strip pass's counters and its render texture.
  get stripStats(): { renders: number; ms: number; rows: number; lines: number } {
    return STRIP_STATS;
  }
  get stripRT(): unknown {
    return stripTexture();
  }
  get stripTableData(): Float32Array {
    return stripTable().data;
  }
  // Default section color (the gamut midpoint = the seed-hue base color).
  private baseRgb = new Float32Array(3);
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
    // K90 stage 1b, a debug hook only (no link, no panel row): turn the
    // spline's bend bound on or off, optionally retune it, and re-render.
    // `__knotSplineBend()` with no arguments reports the state.
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__knotSplineBend = (
        on?: boolean,
        opts?: Partial<
          Record<"ratio" | "maxShift" | "maxTurn" | "iterations" | "marginMax" | "passes", number> &
            Record<"soft", boolean>
        >
      ) => {
        if (on !== undefined || opts) {
          if (on !== undefined) splineBend.enabled = !!on;
          if (opts) Object.assign(splineBend, opts);
          splineBend.moved = 0;
          splineBend.shiftMax = 0;
          splineBend.runs = 0;
          splineBend.skipped = 0;
          this.update();
          this.rebuildFillets(true);
        }
        return { ...splineBend };
      };
    }
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
    // there): palette mode wears the section field and the gameplay paint,
    // knot mode one constant color per chain (the old tint).
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
      fill.mesh.shader = sectionShader();
      this.knotRgb.push(this.knotChainRgb(i));
      this.fills.push(fill);
      baseLayer.addChild(fill.mesh);
      // The material's control positions at construction (the renderer is
      // built before the first physics step: these are ps.initial).
      const ic = new Float32Array(chain.length * 2);
      for (let k = 0; k < chain.length; k++) {
        ic[k * 2] = ps.positions[chain[k] * 2];
        ic[k * 2 + 1] = ps.positions[chain[k] * 2 + 1];
      }
      this.initialControls.push(ic);
    });
    this.revealMask = ps.chains.map(() => null);
    // G2 SHADER PAINT: the per-scene data-texture layout (paint_model.ts).
    // Open chains are always break-after-last (arc grows with the slot).
    // (C1.w, the retired PAINT texture's base, stays 0.)
    this.paintScene = new PaintScene(
      ps.chains.map((chain, i) => ({
        nCtrl: chain.length,
        closed: ps.chainBreakAfter[i] < 0,
        count: this.fills[i].sampleCount,
        paintBase: 0,
      }))
    );
    const U = knotUniformValues();
    U.uKBase[3] = style.paletteMode ? 1 : 0;
    // Gameplay paint: palette mode only; an empty declaration until the
    // fabric overlay's first setPaint.
    U.uKPaint[0] = style.paletteMode ? 1 : 0;
    this.syncGold();
    this.paintScene.setPaintItems(new Float32Array(0), 0, []);
    // A new scene starts with no reveal attached.
    U.uKFx[3] = 0;
    U.uKFx2[2] = 0;
    U.uKInk[1] = 0;
    // ...and no arm strips until its first joinery rebuild (the strip
    // table's rows belonged to the previous scene's chains).
    setStripRows(0);
    // Section colors: a constant default until the caller installs its
    // scheme's runs (knot mode: each strand's tint, for good).
    this.installRuns(null);

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
    this.slotOverCtrl = new Float64Array(this.gaps.slots);
    this.slotLive = new Uint8Array(this.gaps.slots);
    this.slotExploreHid = new Uint8Array(this.gaps.slots);

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

    // G3-0: the scene's table layout and its static per-chain records.
    const n = ps.chains.length;
    const closedOf = ps.chains.map((_, i) => ps.chainBreakAfter[i] < 0);
    this.g3 = g3Layout(
      this.fills.map((f) => f.sampleCount),
      closedOf
    );
    this.g3Caps = new Int32Array(n * 2);
    this.g3Rad = new Int32Array(n).fill(-1);
    this.g3WinBase = new Int32Array(n);
    this.g3NWin = new Int32Array(n);
    // Caps from each end's kind, as the joinery classifies them (fused:
    // a tucked round end; else anchored: Stage 7b's square cap; else a
    // free round tip), whatever the palette mode.
    const fusedP = new Set<number>();
    for (const grp of ps.fusedJunctions) for (const p of grp) fusedP.add(p);
    ps.chains.forEach((chain, i) => {
      const a = chain[0];
      const b = chain[chain.length - 1];
      const [cs, ce] = chainCaps(
        closedOf[i],
        fusedP.has(a),
        ps.isAnchored(a),
        fusedP.has(b),
        ps.isAnchored(b)
      );
      this.g3Caps[i * 2] = cs;
      this.g3Caps[i * 2 + 1] = ce;
    });
    this.initG3Tables();
  }

  // Size the G3 tables for this scene and clear its regions (a previous
  // scene's data must not survive in padding or in an unwritten RADII
  // region); the CHAIN records start with no windows.
  private initG3Tables(): void {
    const T = g3Tables();
    const L = this.g3;
    T.samp.ensure(L.sampTexels);
    T.radii.ensure(L.radTexels);
    T.chain.ensure(L.chains * 2);
    T.samp.data.fill(0, 0, L.sampTexels * 4);
    T.samp.markDirty(0, L.sampTexels);
    T.radii.data.fill(0, 0, L.radTexels * 4);
    T.radii.markDirty(0, L.radTexels);
    T.chain.data.fill(0, 0, L.chains * 2 * 4);
    this.g3WriteChainRecords();
    T.chain.markDirty(0, L.chains * 2);
    if (T.rangeCount > 0) {
      T.ranges.data.fill(0, 0, T.rangeCount * RANGE_FLOATS);
      T.ranges.markDirty(0, T.rangeCount);
      T.rangeCount = 0;
    }
  }

  // SAMP and RADII of chain c from this frame's samples and the width
  // multiplier its strip ribbon received; dirty only where values changed.
  private g3WriteChain(
    c: number,
    samples: SplineSamples,
    mul: Float32Array | null
  ): void {
    const T = G3;
    const L = this.g3;
    if (!T || samples.count !== L.count[c]) return;
    const d = T.samp.data;
    const p = samples.positions;
    const base = L.sampBase[c] * 2;
    const nf = L.count[c] * 2;
    let f0 = 0;
    while (f0 < nf && d[base + f0] === p[f0]) f0++;
    if (f0 < nf) {
      let f1 = nf - 1;
      while (f1 > f0 && d[base + f1] === p[f1]) f1--;
      d.set(p.subarray(f0, f1 + 1), base + f0);
      T.samp.markDirty((base + f0) >> 2, ((base + f1) >> 2) + 1);
    }
    this.g3WriteRadii(c, mul);
  }

  private g3WriteRadii(c: number, mul: Float32Array | null): void {
    const T = G3;
    const L = this.g3;
    if (!T) return;
    if (!mul) {
      this.g3Rad[c] = -1;
      return;
    }
    this.g3Rad[c] = L.radBase[c];
    const rd = T.radii.data;
    const rb = L.radBase[c];
    const h = this.style.threadWidth / 2;
    const count = L.count[c];
    let k0 = -1;
    let k1 = -1;
    for (let k = 0; k < count; k++) {
      const v = Math.fround(h * mul[k]);
      if (rd[rb + k] !== v) {
        rd[rb + k] = v;
        if (k0 < 0) k0 = k;
        k1 = k;
      }
    }
    if (k0 >= 0) T.radii.markDirty((rb + k0) >> 2, ((rb + k1) >> 2) + 1);
  }

  // Every chain's two G3 CHAIN texels; marks the changed span.
  private g3WriteChainRecords(): void {
    const T = G3;
    const L = this.g3;
    if (!T) return;
    const cd = T.chain.data;
    let c0 = -1;
    let c1 = -1;
    for (let c = 0; c < L.chains; c++) {
      const wb = this.g3WinBase[c];
      const nw = this.g3NWin[c];
      if (
        writeChainTexels(
          cd,
          c,
          L.sampBase[c],
          this.g3Rad[c],
          this.g3Caps[c * 2],
          this.g3Caps[c * 2 + 1],
          wb,
          nw,
          wb + nw,
          0
        )
      ) {
        if (c0 < 0) c0 = c;
        c1 = c;
      }
    }
    if (c0 >= 0) T.chain.markDirty(c0 * 2, c1 * 2 + 2);
  }

  // This frame's RANGES (the scratch, `entries` long) into the table:
  // copies and marks only the changed span, zeroes a shorter frame's stale
  // tail; then the CHAIN records.
  private g3WriteRanges(entries: number): void {
    const T = G3;
    if (!T) return;
    T.ranges.ensure(Math.max(entries, T.rangeCount));
    const d = T.ranges.data;
    const s = this.g3RangeScratch;
    const nf = entries * RANGE_FLOATS;
    let f0 = 0;
    while (f0 < nf && d[f0] === s[f0]) f0++;
    if (f0 < nf) {
      let f1 = nf - 1;
      while (f1 > f0 && d[f1] === s[f1]) f1--;
      d.set(s.subarray(f0, f1 + 1), f0);
      T.ranges.markDirty(f0 >> 2, (f1 >> 2) + 1);
    }
    if (T.rangeCount > entries) {
      d.fill(0, nf, T.rangeCount * RANGE_FLOATS);
      T.ranges.markDirty(entries, T.rangeCount);
    }
    T.rangeCount = entries;
    this.g3WriteChainRecords();
  }

  // Knot-mode chain color: the historic per-strand tint (hue by hueGroup
  // slot, golden-angle spaced) as 0..1 RGB for a constant section run - the
  // same bytes the tint multiplied into a white texture.
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
    // The section color at an arc (the ribbon's own Gouraud), exactly at
    // the arc's ctrl (what a probe vertex there evaluates), and at a ctrl.
    sectionAt: (ch: number, arc: number) => number[];
    sectionExact: (ch: number, arc: number) => number[];
    sectionAtCtrl: (ch: number, ctrl: number) => number[];
    // The section shader's full color at the material point exactly at
    // the arc's ctrl (section, FX, paint + glow; px = edge coverage):
    // [r, g, b, alpha] - what a probe vertex there renders (G2.3 census).
    shadeAll: (ch: number, arc: number, side: number, px?: number) => number[];
    // The section shader's color at a material point before the gameplay
    // accent: [r, g, b, alpha] (FX on the given base color).
    shadeFx: (ch: number, arc: number, side: number, base: number[]) => number[];
    // The point's ignition (anim time; Infinity = none) and FX age.
    ignition: (ch: number, arc: number) => { tA: number; age: number };
    // The gameplay paint state at the material point exactly at the arc's
    // ctrl (kPaintAt, px = edge coverage) and its reveal glow (kGlow).
    paintState: (
      ch: number,
      arc: number,
      px?: number
    ) => KPaintState & { glow: number };
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
      sectionExact: (ch, arc) => {
        const c = kChain(data, ch);
        knotSection(data, U, c, kCtrlOfArc(data, c, arc), scratch);
        return [scratch[0], scratch[1], scratch[2]];
      },
      sectionAtCtrl: (ch, ctrl) => {
        knotSection(data, U, kChain(data, ch), ctrl, scratch);
        return [scratch[0], scratch[1], scratch[2]];
      },
      shadeAll: (ch, arc, side, px = 0) => {
        const c = kChain(data, ch);
        const ctrl = kCtrlOfArc(data, c, arc);
        const rgb = [0, 0, 0];
        knotSection(data, U, c, ctrl, rgb);
        const a = kShadeFx(data, U, c, ctrl, arc / c.arcPer, side, rgb);
        const st = kPaintAt(data, U, c, ctrl, arc, px, this.paintTmp);
        // The hover glow (K145), shaped across at `side` and composed over
        // the paint (K298) as SECTION_FRAG does.
        const rim = st.rim > 0 ? st.rim * kRimAcross(side, U.uKGold[3]) : 0;
        kComposePaint(U, rgb, st, kGlow(data, U, c, ctrl));
        if (rim > 0) kRimOver(rgb, rim);
        return [rgb[0], rgb[1], rgb[2], a];
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
      paintState: (ch, arc, px = 0) => {
        const c = kChain(data, ch);
        const ctrl = kCtrlOfArc(data, c, arc);
        const st = kPaintAt(data, U, c, ctrl, arc, px, {
          p: 0,
          band: false,
          v: 0,
          rim: 0,
        });
        return { ...st, glow: kGlow(data, U, c, ctrl) };
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

    // K90's bend bound (off unless the debug hook turns it on) holds the
    // centerline's turn radius against this ribbon's half-width.
    splineBend.halfWidth = this.style.threadWidth / 2;

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
      const width = this.widthMulFor(i, samples);
      this.widthLast[i] = width;
      const mul = this.withPluckCollapse(i, samples.count, width);
      this.fills[i].update(
        samples.positions,
        samples.tangents,
        this.style.threadWidth / 2,
        0,
        mul
      );
      if (this.g3Data) this.g3WriteChain(i, samples, mul);
    });
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
          this.slotLive[c] = 0;
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
    // K76 2b: every slot was just solved as master solves it (visibility
    // factor 1); the thread reveal scales each by its over thread's.
    if (this.explorePieces) this.applyExploreGaps();
    this.exploreUpdatePending = false;
    this.gaps.upload();
    this.paintScene.flushGeom();
    if (this.g3Data) g3Flush();
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
    const overCtrl = this.renderCtrl(crossing.over);
    const overCenter = this.arcAt(overSamples, overCtrl);
    const underCenter = this.arcAt(
      underSamples,
      this.renderCtrl(crossing.under)
    );
    const totalO = overSamples.totalLength;
    const totalU = underSamples.totalLength;
    this.slotOverChain[slot] = crossing.over.chain;
    this.slotOverArc[slot] = overCenter;
    // K76 2b: a crossing whose over thread the reveal hides (vis <= 0.5 at
    // the over pass) keeps nothing on the CPU side - no under window for the
    // yarn and the fillets, no pluck footprint - as a gate not yet open.
    // The slot itself is still solved; applyExploreGaps scales it.
    this.slotOverCtrl[slot] = overCtrl;
    this.slotLive[slot] = 1;
    const exploreHid =
      this.explorePieces !== null &&
      this.exploreVisAt(crossing.over.chain, overCtrl) <= 0.5;
    this.slotExploreHid[slot] = exploreHid ? 1 : 0;
    if (exploreHid) shown = false;

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
      this.slotLive[this.emergentBase + k] = 0;
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
  // value is consistent. Uploads only chains whose ids changed. The lane
  // packing is samp_table.ts assignWindowLanes (moved verbatim); G3-0 also
  // packs each chain's kept windows into the frame's RANGES.
  private assignGapIds(): void {
    const g3 = this.g3Data && G3 !== null;
    let entries = 0;
    for (let c = 0; c < this.fills.length; c++) {
      const fill = this.fills[c];
      const count = fill.sampleCount;
      let ids = this.idScratch.get(c);
      if (!ids) {
        ids = new Float32Array(count * GAP_SLOTS);
        this.idScratch.set(c, ids);
      }
      const samples = this.chainSamples[c];
      const closed = samples ? samples.closed : false;
      this.gapOverflow += assignWindowLanes(
        this.chainWins.get(c),
        count,
        closed,
        samples ? samples.totalLength : 0,
        GAP_SLOTS,
        ids,
        g3 ? this.g3Accepted : null
      );
      if (g3) {
        const need =
          (entries + maxRangeEntries(this.g3Accepted.length / 4)) *
          RANGE_FLOATS;
        if (need > this.g3RangeScratch.length) {
          const next = new Float32Array(
            Math.max(need, this.g3RangeScratch.length * 2)
          );
          next.set(this.g3RangeScratch);
          this.g3RangeScratch = next;
        }
        const n = packRanges(
          this.g3Accepted,
          count,
          closed,
          this.g3RangeScratch,
          entries
        );
        this.g3WinBase[c] = entries;
        this.g3NWin[c] = n;
        entries += n;
      }
      fill.setMaskIds(ids);
    }
    if (g3) this.g3WriteRanges(entries);
  }

  // Install a scheme's section runs (core/section_colors buildSectionRuns)
  // and junctionBlend (lattice units - a uniform, no table change). The
  // noise scheme reads a seeded simplex field at each control's initial
  // position (its coordinate rides the material: CTRLIDX.z).
  setSectionRuns(
    sr: SectionRuns,
    scheme: ColorScheme,
    seed: number,
    blendDist = 0
  ): void {
    if (scheme === "noise") {
      const rng = new SeededRNG((seed ^ 0x5ec7c0) >>> 0);
      this.sectionNoise = createNoise2D(() => rng.next());
    } else {
      this.sectionNoise = null;
    }
    this.junctionBlend = blendDist;
    this.installRuns(sr);
  }

  // Write a run table (null = the constant default: palette mode's gamut
  // midpoint, or knot mode's strand tints - knot mode always uses those).
  // Event time; only changed texels upload (an identical rebuild - a
  // junctionBlend drag - sends nothing), then the uniforms.
  private installRuns(sr: SectionRuns | null): void {
    const chains = this.ps.chains.map((c, i) => ({
      len: c.length,
      closed: this.ps.chainBreakAfter[i] < 0,
    }));
    let runs: SectionRuns;
    if (!this.style.paletteMode) {
      runs = constantSectionRuns(chains, (i) => [
        this.knotRgb[i][0],
        this.knotRgb[i][1],
        this.knotRgb[i][2],
      ]);
    } else {
      runs =
        sr ??
        constantSectionRuns(chains, () => [
          this.baseRgb[0],
          this.baseRgb[1],
          this.baseRgb[2],
        ]);
    }
    let noise: Float32Array[] | null = null;
    if (runs.noise && this.sectionNoise) {
      noise = this.initialControls.map((ic) => {
        const z = new Float32Array(ic.length / 2);
        for (let k = 0; k < z.length; k++) {
          z[k] = this.noiseV(ic[k * 2], ic[k * 2 + 1]);
        }
        return z;
      });
    }
    this.lastRunUpload = this.paintScene.setRuns(runs.runs, runs.slotRun, noise);
    this.syncSectionUniforms();
  }

  // Texels the last run install uploaded (probes: a jbl drag sends 0).
  lastRunUpload = 0;

  // uKGamut (the live gamut: baseHue + gamutConfig) and uKSect (the
  // junctionBlend distance and its ease).
  private syncSectionUniforms(): void {
    const U = knotUniformValues();
    const [arc, sat, light] = gamutConfig();
    U.uKGamut[0] = this.style.baseHue;
    U.uKGamut[1] = arc;
    U.uKGamut[2] = sat;
    U.uKGamut[3] = light;
    U.uKSect[0] = Math.max(0, this.junctionBlend);
    U.uKSect[1] = blendEase(this.junctionBlend);
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
    sr: SectionRuns,
    scheme: ColorScheme,
    seed: number,
    blendDist = 0
  ): void {
    this.style.baseHue = baseHue;
    this.style.hueGroup = hueGroup;
    this.baseRgb.set(gamutRgb(baseHue, 0.5));
    if (this.style.paletteMode) {
      if (this.style.pathColor !== pathColor) {
        this.style.pathColor = pathColor;
        this.syncGold();
      }
      // Sections are evaluated per vertex from the run table + uniforms:
      // nothing to repaint (the gameplay U does not depend on them).
      this.setSectionRuns(sr, scheme, seed, blendDist);
    } else {
      this.fills.forEach((_, i) => {
        this.knotRgb[i] = this.knotChainRgb(i);
      });
      this.installRuns(null);
    }
  }

  // The noise scheme's gamut coordinate at a world point.
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


  // Declare the current gameplay paint (traveled spans + branch-point
  // pulse arms + junction caps + K81 route bands, and K127's traveled
  // passes: junction_routes.ts traveledRoutes). Called every awake
  // frame; KPAINT is rewritten only when the declaration's content changed
  // (a traversal move changes its swept span every frame - a few texels),
  // the routes re-resolve only when they changed (a tap, a move's end).
  setPaint(
    spans: PaintSpan[],
    pulses: PulseArm[],
    caps: PaintCap[],
    routes: PaintRoute[] = [],
    traveled: PaintRoute[] = []
  ): void {
    this.paintSpans = spans;
    this.paintPulses = pulses;
    this.paintCaps = caps;
    const rk = JSON.stringify(routes) + "|" + JSON.stringify(traveled);
    if (rk !== this.routeKey) {
      this.routeKey = rk;
      this.paintRoutes = routes;
      this.paintTraveled = traveled;
      this.resolveRoutes();
    }
    // The routes key the caps too: a routed junction drops its caps
    // (unless fully traveled, K127).
    const declKey = JSON.stringify([spans, pulses, caps]) + "|" + rk;
    if (declKey !== this.paintKey && this.style.paletteMode) {
      this.paintKey = declKey;
      this.writePaintItems();
    }
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

  // K145: declare the hover glow's run (null = none). KPAINT is rewritten
  // only when the run or its end gap changes, or the glow turns on or off
  // (hoverGlow 0 writes no item, so the paint is exactly the glow-less
  // one); a pointer moving along the run only moves the hover point, a
  // uniform (setRimAt).
  setRim(rim: PaintRim | null): void {
    this.paintRim = rim;
    if (rim) this.rimAt = rim.at;
    this.syncRimItem();
  }

  setRimAt(at: number): void {
    this.rimAt = at;
  }

  // The KPAINT key of the hover glow's item ("" = no item).
  private rimItemKey(): string {
    const r = this.paintRim;
    return r && this.hoverGlow > 0
      ? `${r.chain}|${r.c0}|${r.c1}|${this.rimGap()}`
      : "";
  }

  private syncRimItem(): void {
    if (!this.style.paletteMode) return;
    if (this.rimItemKey() !== this.rimKey) this.writePaintItems();
  }

  // K145: the stretch at each end of a glowing run that stays dark - the
  // junction web's reach along an arm (its wedge flanks, else the tip-disc
  // rims). The webs draw over the ribbons there from arm strips, which
  // carry no across coordinate, so a glow reaching under them would end
  // at their silhouettes.
  private rimGap(): number {
    const fillHalf = this.style.threadWidth / 2;
    return Math.max(fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius, 2 * fillHalf);
  }

  // K81: a walk ctrl's particle slot on its chain (walk ctrls are particle
  // slots; a closed chain's may be unwrapped past its length), -1 for a
  // chain that does not exist.
  private routeArmSlot(chain: number, ctrl: number): number {
    const ch = this.ps.chains[chain];
    if (!ch || ch.length === 0) return -1;
    const len = ch.length;
    const s = Math.round(ctrl);
    return this.ps.chainBreakAfter[chain] < 0
      ? ((s % len) + len) % len
      : Math.max(0, Math.min(len - 1, s));
  }

  // K81: resolve the declared routes against the junction arms. A route
  // needs its arrival arm on a junction and its departure arm on the SAME
  // junction (or none, or the arrival arm again: a one-arm route); free
  // tips (start, exit, dead ends) resolve to nothing and keep their caps.
  // Each junction keeps its newest MAX_ROUTES passes over distinct arm
  // pairs (junction_routes pickRoutes), and every arm of a routed junction
  // is listed in routedArms: its paint caps are dropped (writePaintItems).
  // K127: a routed junction whose every arm a traveled pass arrives or
  // leaves by is FULLY TRAVELED (fullJn): it keeps its caps, and its
  // record's base reads the composed rows (J1.z = 1). K191: one that stops
  // being full while it holds a route fades its gold back out (webFade).
  private resolveRoutes(): void {
    if (!this.armJunction) {
      const m = new Map<string, number>();
      this.junctionArms.forEach((jn, ji) => {
        for (const a of jn.arms) m.set(a.chain + ":" + a.slot + ":" + a.dir, ji);
      });
      this.armJunction = m;
    }
    const aj = this.armJunction;
    const armKey = (x: RouteJArm): string => x.chain + ":" + x.slot + ":" + x.dir;
    const perJn = new Map<number, ResolvedRoute[]>();
    for (const r of this.paintRoutes) {
      const sa = this.routeArmSlot(r.chain, r.ctrl);
      if (sa < 0) continue;
      const a: RouteJArm = { chain: r.chain, slot: sa, dir: r.dir };
      const ja = aj.get(armKey(a));
      if (ja === undefined) continue;
      let b: RouteJArm | null = null;
      if (
        r.outChain !== undefined &&
        r.outCtrl !== undefined &&
        r.outDir !== undefined
      ) {
        const sb = this.routeArmSlot(r.outChain, r.outCtrl);
        if (sb < 0) continue;
        b = { chain: r.outChain, slot: sb, dir: r.outDir };
        if (aj.get(armKey(b)) !== ja) continue;
        if (armKey(b) === armKey(a)) b = null;
      }
      let list = perJn.get(ja);
      if (!list) {
        list = [];
        perJn.set(ja, list);
      }
      list.push({ a, b });
    }
    // K127: the arms the traveled passes arrive or leave by.
    const covered = new Set<string>();
    const cover = (chain: number, ctrl: number, dir: 1 | -1): void => {
      const s = this.routeArmSlot(chain, ctrl);
      if (s >= 0) covered.add(chain + ":" + s + ":" + dir);
    };
    for (const r of this.paintTraveled) {
      cover(r.chain, r.ctrl, r.dir);
      if (r.outChain !== undefined && r.outCtrl !== undefined && r.outDir) {
        cover(r.outChain, r.outCtrl, r.outDir);
      }
    }
    this.routesByJn = new Map();
    this.routedArms = new Set();
    this.fullJn = new Set();
    for (const [ji, list] of perJn) {
      this.routesByJn.set(
        ji,
        pickRoutes(
          list,
          (r) => (r.b ? [armKey(r.a), armKey(r.b)].sort().join("|") : armKey(r.a)),
          MAX_ROUTES
        )
      );
      const arms = this.junctionArms[ji].arms;
      if (arms.every((a) => covered.has(a.chain + ":" + a.slot + ":" + a.dir))) {
        this.fullJn.add(ji);
        continue;
      }
      for (const a of arms) {
        this.routedArms.add(a.chain + ":" + a.slot);
      }
    }
    // K169: a newly full web starts its fade in; K191: one that stopped being
    // full fades out, if it still holds a route (perJn) to blend over.
    this.webFade.retarget(this.fullJn, this.paintClock, perJn);
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
  // K76 stage 2c: under the thread reveal a hidden sample (visibility below
  // EXPLORE_PICK_VIS) is empty space, so hidden thread is never picked.
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
    const reveal = this.explorePieces !== null;
    for (let c = 0; c < this.chainSamples.length; c++) {
      const s = this.chainSamples[c];
      if (!s) continue;
      // The reveal: a chain with no piece is hidden whole, a whole one
      // shown whole; any other is gated per sample.
      if (reveal && !this.exploreWhole[c] && !this.exploreByChain.has(c)) continue;
      const gate = reveal && !this.exploreWhole[c];
      const per = s.totalLength / (s.closed ? s.count : s.count - 1);
      let best = r2;
      let bk = -1;
      for (let k = 0; k < s.count; k++) {
        const dx = s.positions[k * 2] - x;
        const dy = s.positions[k * 2 + 1] - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
          if (gate && this.exploreVisAt(c, this.ctrlAtArc(s, k * per)) < EXPLORE_PICK_VIS) continue;
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
  // mid-reveal, or nothing to vibrate). K76 stage 2c: under the thread
  // reveal the unit is clipped to the thread that shows around the plucked
  // point (exploreShownSpan), and a pluck on hidden thread is sound-only.
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
    let sc = req.spanCtrl ?? null;
    if (this.explorePieces && !this.exploreWhole[req.chain]) {
      const at = req.ctrl ?? this.ctrlAtArc(samples, arc);
      sc = this.exploreShownSpan(req.chain, at, sc, len, closed);
      if (!sc) return false;
    }
    let span: [number, number] | null = null;
    if (sc) {
      const a0 = ctrlArc(sc[0]);
      let a1 = ctrlArc(sc[1]);
      // A wrap run on a closed chain (c1 past the seam) or a whole loop.
      if (closed && (a1 < a0 || sc[1] - sc[0] >= len)) {
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

  // K279: the drawn thread's world point at an arc (or a ctrl) of a chain,
  // where a pluck's ripple starts. Null when the chain has no samples.
  pluckPoint(chain: number, at: { ctrl?: number; arc?: number }): { x: number; y: number } | null {
    const samples = this.chainSamples[chain];
    if (!samples) return null;
    const out = this.sampleScratch;
    this.sampleAt(samples, this.arcOfPluck(chain, samples, at), out, 0);
    return { x: out[0], y: out[1] };
  }

  // A pluck's arc: `at.arc`, or the arc of `at.ctrl` (pluck()'s ctrlArc).
  private arcOfPluck(
    chain: number,
    samples: SplineSamples,
    at: { ctrl?: number; arc?: number }
  ): number {
    if (at.arc !== undefined) return at.arc;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const len = this.ps.chains[chain].length;
    const c = at.ctrl ?? 0;
    return this.paintArcAt(
      samples,
      closed ? ((c % len) + len) % len : Math.max(0, Math.min(len - 1, c)),
      closed
    );
  }

  // K279 TUG: the stretch a tap's physical tug may move, as fractional ctrls
  // c0 < tap < c1 (unwrapped past the seam of a closed chain): from the
  // tapped arc out to the nearest pluck node on each side (a crossing pass,
  // a joint, a marker, an open end), at most `maxCtrl` ctrl each way - a
  // string stopped at its contacts. The crest sits at the tap, kept to the
  // middle half of the stretch (a crest beside a crossing would kink the
  // thread at it). Null when the tap sits inside a node's hide zone (a
  // junction core, a marker disc) or the stretch holds no particle. Stage 1
  // first stopped the stretch at the nodes' FOOTPRINTS (the overlay's lobe
  // bounds): that left most fabric spans, 1.2-2 world between crossings,
  // with no particle to move (one tug in four fabric taps).
  tugSpan(
    chain: number,
    at: { ctrl?: number; arc?: number },
    maxCtrl: number
  ): { c0: number; c1: number; tap: number } | null {
    const samples = this.chainSamples[chain];
    if (!samples) return null;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const len = this.ps.chains[chain].length;
    const total = samples.totalLength;
    if (!(total > 0) || len < 3) return null;
    const a = normArc(this.arcOfPluck(chain, samples, at), total, closed);
    let lo = closed ? a - total / 2 : 0;
    let hi = closed ? a + total / 2 : total;
    for (const n of this.pluckNodes(chain)) {
      let d = n.arc - a;
      if (closed) d -= total * Math.round(d / total);
      if (Math.abs(d) <= n.hide) return null;
      if (d > 0) hi = Math.min(hi, a + d);
      else lo = Math.max(lo, a + d);
    }
    const at0 = this.ctrlAtArc(samples, a);
    let c0 = this.ctrlAtArc(samples, normArc(lo, total, closed));
    let c1 = this.ctrlAtArc(samples, normArc(hi, total, closed));
    if (closed) {
      if (c0 > at0) c0 -= len;
      if (c1 < at0) c1 += len;
    }
    c0 = Math.max(c0, at0 - maxCtrl);
    c1 = Math.min(c1, at0 + maxCtrl);
    if (!(c0 < at0 && at0 < c1) || Math.ceil(c1) - Math.floor(c0) < 2) return null;
    const q = 0.25 * (c1 - c0);
    const tap = Math.max(c0 + q, Math.min(c1 - q, at0));
    return { c0, c1, tap };
  }

  // Per-frame pluck pass (every ticker branch, after tickPaint so fabric
  // colors read this frame's paint). Never calls update().
  tickPlucks(dt: number): void {
    this.plucks.tick(dt);
  }

  private makePluckHost(): PluckHost {
    return {
      halfWidth: () => this.style.threadWidth / 2,
      casing: () => this.style.casingWidth / 2 + CUT_BIAS,
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
      gapIds: (c) => this.idScratch.get(c) ?? null,
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
    const mul = this.withPluckCollapse(
      chain,
      samples.count,
      this.widthLast[chain] ?? null
    );
    this.fills[chain].update(
      samples.positions,
      samples.tangents,
      this.style.threadWidth / 2,
      0,
      mul
    );
    // G3-0: the collapse is part of the chain's radii.
    if (this.g3Data && G3) {
      this.g3WriteRadii(chain, mul);
      this.g3WriteChainRecords();
      g3Flush();
    }
  }

  // The thread's composed color at an arc, 0..1 RGB: the section color,
  // the burn / roots tint, then the gameplay paint and the reveal glow -
  // the section shader's own composition (through the mirror).
  private pluckColor(chain: number, arc: number, out: Float32Array): void {
    this.composedAtArc(chain, arc, 0, out);
  }

  // The ribbon's composed color at a world arc (no FX stripes or alpha):
  // colorAtArc's section (the ribbon's Gouraud) + burn, then the paint at
  // the exact point with edge coverage over `px` (0 = hard).
  private composedAtArc(chain: number, arc: number, px: number, out: Float32Array): void {
    this.colorAtArc(chain, arc, out);
    if (!this.style.paletteMode) return;
    const D = kData();
    const c = kChain(D, chain);
    if (!(c.total > 0)) return;
    const U = knotUniformValues();
    const an = normArc(arc, c.total, c.closed);
    const ctrl = kCtrlOfArc(D, c, an);
    kComposePaint(U, out, kPaintAt(D, U, c, ctrl, an, px, this.paintTmp), kGlow(D, U, c, ctrl));
  }
  private paintTmp: KPaintState = { p: 0, band: false, v: 0, rim: 0 };

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
        let selfArc: number | undefined;
        let footNeg: number;
        let footPos: number;
        if (isUnder) {
          footNeg = this.eraseExtentNeg[ci] + fade;
          footPos = this.eraseExtentPos[ci] + fade;
          const os = this.chainSamples[cr.over.chain];
          if (os) {
            const oc = this.ps.chainBreakAfter[cr.over.chain] < 0;
            const oArc = this.paintArcAt(os, this.renderCtrl(cr.over), oc);
            this.sampleAt(os, oArc, sc, 0);
            line = [sc[0], sc[1], sc[2], sc[3]];
            // K344: a self-crossing's clip stops short of its own over pass.
            if (cr.over.chain === chain) selfArc = oArc;
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
          selfArc,
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
          prev.selfArc = n.selfArc;
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
    // K76 2b: the thread reveal changed what update() derives (a gap's
    // under window, a marker's gap - and the fabric's markers ride the pass).
    if (this.exploreUpdatePending) return true;
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
    // GAMEPLAY PAINT (G2.3): every pixel evaluates the declaration (KPAINT,
    // written by setPaint when it changes) and the reveal glow; the tick
    // only reduces the animation clocks to uniforms - in float64, mod the
    // crest spacing, so no absolute clock reaches the GPU.
    const U = knotUniformValues();
    const clock = this.paintClock;
    const spacing = Math.max(0.5, this.pulseSpacing);
    const modS = (x: number): number => x - spacing * Math.floor(x / spacing);
    U.uKPulse[0] = modS(clock * PAINT_CONST.PULSE_SPEED);
    U.uKPulse[1] = modS((clock + PAINT_CONST.PULSE_OUT_LEAD) * PAINT_CONST.PULSE_SPEED);
    U.uKPulse[2] = spacing;
    const fi = Math.min(1, Math.max(0, (clock - this.pulseBorn) / PAINT_CONST.PULSE_FADE_IN));
    U.uKPulse[3] = fi * fi * (3 - 2 * fi);
    // The trains' and the hover's reach window (finite on the GPU: 1e6 =
    // whole arms).
    const reach = Math.min(1e6, Math.max(0, this.pulseReach));
    U.uKReach[0] = reach;
    U.uKReach[1] = Math.min(PAINT_CONST.PULSE_REACH_FADE, 0.5 * reach);
    // Hover: a slow breath between 0.2 and 0.8 strength, out to the reach.
    U.uKPaint[3] = 0.5 + 0.3 * Math.sin(clock * PAINT_CONST.HOVER_PULSE_W);
    // K145, the hover glow: its strength (steady, no breath) and the hover
    // point; its item follows the strength turning on or off.
    this.syncRimItem();
    U.uKReach[2] = this.paintRim ? Math.max(0, this.hoverGlow) : 0;
    U.uKReach[3] = this.rimAt;
    // K111 stage 4: its width, as the scale kRimAcross reads (1 at the default).
    U.uKGold[3] = kRimScale(this.hoverGlowWidth);
    // K298: its own length and end fade (the shader floors both at 1e-4).
    U.uKSect[2] = Math.min(1e6, Math.max(0, this.hoverGlowLength));
    U.uKSect[3] = Math.max(0, this.hoverGlowFade);
    // K111 stage 4: High contrast's highlight prototype (0 = the pulses).
    U.uKBase[1] = this.hcLook;
    // Junction fillets ride the same tick: live positions, live paint.
    this.rebuildFillets();
    this.tickWebFade();
  }

  // K169: the arms ("chain:slot") of the webs fading, in or (K191) out, with
  // their level.
  private fadingArmLevels(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [ji, lv] of this.webFade.levels(this.paintClock)) {
      for (const a of this.junctionArms[ji].arms) out.set(a.chain + ":" + a.slot, lv);
    }
    return out;
  }

  // K169: advance the fully traveled webs' fades, in and (K191) out. Each
  // fading web's J1.z (the level the junction shader blends its two bases
  // by) is rewritten in place - a texel and its row upload, no fillet
  // rebuild - and the caps' paint is rewritten at the same level. The step
  // that reaches 1 (or 0) writes it once; the fade is then forgotten and the
  // record is the K127 one (full) or an untraveled one.
  private tickWebFade(): void {
    if (!this.webFade.active) return;
    const steps = this.webFade.step(this.paintClock);
    const rd = recordData();
    let wrote = false;
    for (const [ji, lv] of steps) {
      const rb = this.recBaseByJn.get(ji);
      if (rb === undefined) continue;
      rd.data[(rb + 1) * 4 + 2] = lv;
      rd.markDirty(rb + 1, rb + 2);
      wrote = true;
    }
    if (wrote) rd.flush();
    if (this.style.paletteMode) this.writePaintItems();
  }

  // The path color as the uKGold uniform (0xRRGGBB -> 0..1 floats).
  private syncGold(): void {
    const g = this.style.pathColor ?? 0xffd24a;
    const U = knotUniformValues();
    U.uKGold[0] = ((g >> 16) & 255) / 255;
    U.uKGold[1] = ((g >> 8) & 255) / 255;
    U.uKGold[2] = (g & 255) / 255;
  }

  // The declaration as KPAINT records (paint_math kPaintAt): items in the
  // retired pass's evaluation order (spans, caps, pulses), each referenced
  // from every control slot it can touch - spans and pulses over their ctrl
  // range, caps over their arc radius at the chain's tightest slot (doubled:
  // the knot keeps moving under a static declaration), every range widened
  // by a slot for the edge coverage ramp. Only changed texels upload.
  private writePaintItems(): void {
    const items: number[] = [];
    const n = this.ps.chains.length;
    const slots: Array<Array<number[] | undefined> | null> = new Array(n).fill(null);
    let overflow = 0;
    // The chains carrying gameplay paint (KGEOM G0.w): K76's VIS items set
    // none, so the paint evaluation stays gated on real paint.
    const painted = new Uint8Array(n);
    const touch = (chain: number, lo: number, hi: number, item: number): void => {
      const type = items[item * 8];
      if (type !== EXPLORE_ITEM_VIS && type !== EXPLORE_ITEM_CHAR) painted[chain] = 1;
      const len = this.ps.chains[chain].length;
      const closed = this.ps.chainBreakAfter[chain] < 0;
      let s0 = Math.floor(lo) - 1;
      let s1 = Math.floor(hi) + 1;
      if (!closed) {
        s0 = Math.max(0, s0);
        s1 = Math.min(len - 1, s1);
      } else if (s1 - s0 >= len) {
        s0 = 0;
        s1 = len - 1;
      }
      let sc = slots[chain];
      if (!sc) {
        sc = new Array(len);
        slots[chain] = sc;
      }
      for (let s = s0; s <= s1; s++) {
        const k = closed ? ((s % len) + len) % len : s;
        let l = sc[k];
        if (!l) {
          l = [];
          sc[k] = l;
        }
        if (l[l.length - 1] === item) continue;
        if (l.length >= 32) {
          overflow++;
          continue;
        }
        l.push(item);
      }
    };
    const minArcPerCtrl = (chain: number): number => {
      const smp = this.chainSamples[chain];
      if (!smp) return 0.05;
      const cal = smp.controlArcLengths;
      let m = Infinity;
      for (let k = 0; k + 1 < cal.length; k++) m = Math.min(m, cal[k + 1] - cal[k]);
      return Math.max(0.05, Number.isFinite(m) ? m : 0.05);
    };
    for (const s of this.paintSpans) {
      const i = items.length / 8;
      items.push(PAINT_ITEM.SPAN, s.c0, s.c1, s.p0 ?? 1, s.p1 ?? 1, 0, 0, 0);
      touch(s.chain, Math.min(s.c0, s.c1), Math.max(s.c0, s.c1), i);
    }
    // K169: the caps of a web that is fading wear its level (K191: out as
    // well as in).
    const fadeArms = this.webFade.active ? this.fadingArmLevels() : null;
    for (const cp of this.paintCaps) {
      // K81: a routed junction's band and untraveled web decide its
      // pixels; a cap there would paint gold down every arm's ribbon. A
      // fully traveled one (K127) is not in routedArms: it keeps its caps.
      // K191: nor is one fading out (routed, no longer full): its caps stay
      // at its level until the fade ends.
      const armKey = cp.chain + ":" + this.routeArmSlot(cp.chain, cp.ctrl);
      const lvl = fadeArms?.get(armKey);
      if (lvl === undefined && this.routedArms.size > 0 && this.routedArms.has(armKey)) {
        continue;
      }
      const i = items.length / 8;
      items.push(
        PAINT_ITEM.CAP,
        cp.ctrl,
        cp.ctrl,
        (cp.p ?? 1) * (lvl ?? 1),
        0,
        0,
        cp.radius,
        0
      );
      const r = (2 * cp.radius) / minArcPerCtrl(cp.chain);
      touch(cp.chain, cp.ctrl - r, cp.ctrl + r, i);
    }
    for (const p of this.paintPulses) {
      const i = items.length / 8;
      const flags =
        (p.inward ? ITEM_FLAG.INWARD : 0) | (p.hovered ? ITEM_FLAG.HOVER : 0);
      items.push(PAINT_ITEM.PULSE, p.cJunction, p.cFar, 0, 0, flags, 0, 0);
      touch(p.chain, Math.min(p.cJunction, p.cFar), Math.max(p.cJunction, p.cFar), i);
    }
    // K76: the thread reveal's visibility pieces (explore_glsl.ts), but
    // none on a whole chain (its flag answers without a scan).
    if (this.explorePieces) {
      for (const p of this.explorePieces) {
        if (p.chain >= n || this.exploreWhole[p.chain]) continue;
        const i = items.length / 8;
        items.push(...visItem(p));
        const [lo, hi] = visRange(p);
        touch(p.chain, lo, hi, i);
      }
      // K290: the char look's burnt stretches (kCharAt), whole chains too.
      for (const s of this.exploreBurn?.char ?? []) {
        if (s.chain >= n || !(s.b1 > s.b0)) continue;
        const i = items.length / 8;
        items.push(...charItem(s));
        const [lo, hi] = charRange(s);
        touch(s.chain, lo, hi, i);
      }
    }
    // K145: the hover glow's run, (RIM, c0, c1, end gap).
    this.rimKey = this.rimItemKey();
    const rim = this.paintRim;
    if (this.rimKey !== "" && rim) {
      const i = items.length / 8;
      items.push(PAINT_ITEM.RIM, rim.c0, rim.c1, this.rimGap(), 0, 0, 0, 0);
      touch(rim.chain, rim.c0, rim.c1, i);
    }
    if (overflow > 0 && !this.paintOverflowWarned) {
      this.paintOverflowWarned = true;
      console.warn(`G2 paint: ${overflow} slot references beyond the shader's 32 per slot`);
    }
    this.paintScene.setPaintFlags(painted);
    this.lastPaintUpload = this.paintScene.setPaintItems(
      Float32Array.from(items),
      items.length / 8,
      slots
    );
  }

  // ---- K76 THREAD REVEAL (stage 2a; docs/design/K76_reveal_mode.md) -----

  // The visible pieces (null = the mode is off), per chain, and the chains
  // they cover whole (KPAINT texel `chain` .x).
  private explorePieces: ExplorePiece[] | null = null;
  private readonly exploreByChain = new Map<number, ExplorePiece[]>();
  private exploreWhole = new Uint8Array(0);
  // K290: the fire's part of the declaration, and its gate's pieces per
  // chain (null: no burn, or the reveal off).
  private exploreBurn: ExploreBurn | null = null;
  private exploreGateByChain: Map<number, ExplorePiece[]> | null = null;
  // K76 2b: update() must re-run (needsFxRender) because the declaration
  // changed what update() derives from it: a crossing's over thread crossed
  // vis 0.5 (its under window and pluck footprint) or a marker's gap turned
  // (the fabric redraws its markers in the same pass). Growth frames that
  // only move fades set nothing; update() clears it.
  exploreUpdatePending = false;
  // Bumped by every declaration change; the joint gate follows it.
  private exploreRev = 0;
  // K76 stage 2d (question 9): High contrast. uKExplore.x is 2 instead of 1
  // while the mode is on, and the dots look draws its dots at full strength
  // in pure white (kExploreLook, kExDot).
  private exploreContrast = false;

  // High contrast for the reveal's end look (the fabric forwards a11y's
  // setting each tick). Takes effect at the next draw: uKExplore is a
  // uniform, no update() needed.
  setExploreContrast(on: boolean): void {
    this.exploreContrast = on;
    const E = knotUniformValues().uKExplore!;
    if (E[0] > 0.5) E[0] = on ? 2 : 1;
  }

  // Declare the visible pieces (null = the mode off: every chain draws on
  // master's program again). With the mode on, the ribbons draw with the
  // explore program, a chain with no piece is not drawn at all, and the
  // pieces ride the paint declaration as VIS items. look = an
  // EXPLORE_LOOKS index, breath = the glow look's strength.
  // K290 (burn stage 3a): `burn` = the fire's part (explore_view
  // ExploreBurn; null = none): under "gone" the pieces already lack the
  // burnt thread and `burn.gate` (the reveal's own pieces) decides which
  // junctions hide; under "char" `burn.char` lists the stretches to darken.
  setExplore(
    pieces: ExplorePiece[] | null,
    look = 0,
    breath = 1,
    burn: ExploreBurn | null = null
  ): void {
    const E = knotUniformValues().uKExplore!;
    E[0] = pieces ? (this.exploreContrast ? 2 : 1) : 0;
    E[1] = look;
    E[2] = breath;
    E[3] = this.style.threadWidth;
    if (!pieces) burn = null;
    const prev = this.explorePieces;
    if (
      (prev === pieces || (prev && pieces && samePieces(prev, pieces))) &&
      sameBurn(this.exploreBurn, burn)
    ) {
      return;
    }
    this.explorePieces = pieces;
    this.exploreBurn = burn;
    this.exploreByChain.clear();
    for (const p of pieces ?? []) {
      let l = this.exploreByChain.get(p.chain);
      if (!l) {
        l = [];
        this.exploreByChain.set(p.chain, l);
      }
      l.push(p);
    }
    this.exploreGateByChain = null;
    if (burn?.gate) {
      const g = new Map<number, ExplorePiece[]>();
      for (const p of burn.gate) {
        let l = g.get(p.chain);
        if (!l) g.set(p.chain, (l = []));
        l.push(p);
      }
      this.exploreGateByChain = g;
    }
    const n = this.ps.chains.length;
    const whole = new Uint8Array(n);
    for (const [c, l] of this.exploreByChain) {
      if (c < n && chainWhole(l, this.ps.chains[c].length, this.ps.chainBreakAfter[c] < 0)) {
        whole[c] = 1;
      }
    }
    this.exploreWhole = whole;
    let charred: Uint8Array | null = null;
    if (burn?.char && burn.char.length > 0) {
      charred = new Uint8Array(n);
      for (const s of burn.char) if (s.chain < n && s.b1 > s.b0) charred[s.chain] = 1;
    }
    const sh = pieces ? sectionShaderExplore() : sectionShader();
    for (let c = 0; c < this.fills.length; c++) {
      const m = this.fills[c].mesh;
      if (m.shader !== sh) m.shader = sh;
      m.renderable = !pieces || this.exploreByChain.has(c);
    }
    // K268 stage 2 (K275): the arm strips write the visibility as
    // premultiplied alpha, and the fans read them so (a web fades with its
    // arms, a cap with its thread). The fans and the still plucks also take
    // the shaped crossing cut (a cut fades with its over thread).
    setStripExplore(!!pieces);
    this.plucks.setExplore(!!pieces);
    const fsh = pieces ? junctionShaderExplore() : junctionShader();
    if (this.filletMesh) this.filletMesh.mesh.shader = fsh;
    if (this.filletTopMesh) this.filletTopMesh.mesh.shader = fsh;
    this.paintScene.setExploreFlags(pieces ? whole : null, charred);
    if (this.style.paletteMode) this.writePaintItems();
    this.exploreRev++;
    // The gap gate follows at once (the slots keep their last solve).
    if (this.applyExploreGaps()) this.gaps.upload();
  }

  // K76 2b, THE GAP GATE (K76_reveal_mode.md 2.3, 2.5): a crossing's gap is
  // as strong as its over thread is visible at the over pass (the slot's
  // strength times vis; vis 0 rejects the slot in texel 0, for ribbons and
  // fans alike), so a hidden over thread cuts nothing and a visible
  // crossing keeps its gap exactly. A marker disc's gap shows only once its
  // thread point is fully visible (EXPLORE_MARKER_VIS, the exit marker's own
  // rule). With the mode off every slot is restored as solved. Flags
  // exploreUpdatePending when update()'s bookkeeping no longer matches
  // (see there). Returns whether the slot table changed.
  //
  // K268 stage 1, THE SHAPED CUT (docs/design/K268.md): with the mode on, a
  // slot whose footprint holds one or two piece ends gets a visibility
  // profile instead (GapMaskTable.setShape): the explore program cuts each
  // under fragment by the over thread's visibility at its projection, so a
  // fade's gap fades along the over thread exactly as the thread does.
  // Hidden, solid and fallback slots keep 2b's scalar (setVis); a shaped
  // slot's texel 1.w still carries it for the fans and the still pluck.
  private applyExploreGaps(): boolean {
    const on = this.explorePieces !== null;
    let changed = false;
    const st = this.exploreGapCounts;
    st.hidden = st.solid = st.shaped = st.fallback = st.approx = st.mismatch = 0;
    for (let s = 0; s < this.markerBase; s++) {
      if (!this.slotLive[s]) continue;
      const v = on ? this.exploreVisAt(this.slotOverChain[s], this.slotOverCtrl[s]) : 1;
      const cut = on ? this.exploreCutAt(s, v) : null;
      if (cut && cut.shape) {
        if (this.gaps.setShape(s, cut.shape)) changed = true;
      } else {
        if (this.gaps.setShape(s, null)) changed = true;
        if (this.gaps.setVis(s, v)) changed = true;
      }
      if (cut) {
        st[cut.kind]++;
        if (cut.approx) st.approx++;
        if ((cut.kind === "hidden" && v !== 0) || (cut.kind === "solid" && v !== 1)) {
          st.mismatch++;
        }
      }
      if ((on && v <= 0.5 ? 1 : 0) !== this.slotExploreHid[s]) {
        this.exploreUpdatePending = true;
      }
    }
    for (let m = 0; m < MARKER_SLOTS; m++) {
      const occ = this.markerOccluders[m];
      const k =
        on && occ && this.exploreVisAt(occ.chain, occ.ctrl) < EXPLORE_MARKER_VIS ? 0 : 1;
      if (this.gaps.setVis(this.markerBase + m, k)) {
        changed = true;
        this.exploreUpdatePending = true;
      }
    }
    return changed;
  }

  // K268: how the over thread's visibility runs across slot s's footprint
  // (the arc range its polyline spans), given 2b's scalar v at the over
  // pass (the shaped slot's texel 1.w).
  private exploreCutAt(s: number, v: number): ExploreCut {
    const ch = this.slotOverChain[s];
    const samples = this.chainSamples[ch];
    if (ch < 0 || !samples || this.exploreWhole[ch]) {
      return classifyExploreCut([], true, 0, false, 0, 0, 0, () => 0, v);
    }
    const oc = this.slotOverCtrl[s];
    const n = this.ps.chains[ch].length;
    const closed = this.ps.chainBreakAfter[ch] < 0;
    const [aLo, aHi] = this.gaps.polyRange(s);
    const arc = exploreArcMap(
      samples.controlArcLengths,
      samples.totalLength,
      closed,
      oc,
      this.arcAt(samples, oc)
    );
    const pieces = this.exploreByChain.get(ch) ?? [];
    return classifyExploreCut(pieces, false, n, closed, oc, aLo, aHi, arc, v);
  }

  // K268: what the last gap gate made of the live crossing slots (counts by
  // kind; mismatch = a hidden slot with vis != 0 or a solid one with vis !=
  // 1 at the over pass, which should not happen) and the slot table's
  // upload totals (probes).
  private readonly exploreGapCounts = {
    hidden: 0,
    solid: 0,
    shaped: 0,
    fallback: 0,
    approx: 0,
    mismatch: 0,
  };
  exploreGapState(): {
    hidden: number;
    solid: number;
    shaped: number;
    fallback: number;
    approx: number;
    mismatch: number;
    uploadBytes: number;
    uploadCalls: number;
    shapedSlots: number[];
  } {
    const shapedSlots: number[] = [];
    for (let s = 0; s < this.markerBase; s++) {
      if (this.slotLive[s] && this.gaps.isShaped(s)) shapedSlots.push(s);
    }
    return {
      ...this.exploreGapCounts,
      uploadBytes: GAP_UPLOAD_STATS.bytes,
      uploadCalls: GAP_UPLOAD_STATS.calls,
      shapedSlots,
    };
  }

  // G3-0 probes: the data plane's state and its upload accounting
  // (SAMP_UPLOAD_STATS: every byte and call the four G3 tables sent).
  g3DataState(): {
    on: boolean;
    uploadBytes: number;
    uploadCalls: number;
    chains: number;
    sampTexels: number;
    radTexels: number;
    rangeEntries: number;
    rows: number[];
    radOn: number;
  } {
    const T = G3;
    let radOn = 0;
    for (let c = 0; c < this.g3.chains; c++) if (this.g3Rad[c] >= 0) radOn++;
    return {
      on: this.g3Data,
      uploadBytes: SAMP_UPLOAD_STATS.bytes,
      uploadCalls: SAMP_UPLOAD_STATS.calls,
      chains: this.g3.chains,
      sampTexels: this.g3.sampTexels,
      radTexels: this.g3.radTexels,
      rangeEntries: T ? T.rangeCount : 0,
      rows: T ? g3List(T).map((t) => t.rows) : [],
      radOn,
    };
  }

  // G3-0 probes: the four tables (mirror `data`, GPU `source`).
  g3TableRows(): FloatRows[] {
    return G3 ? g3List(G3) : [];
  }

  // G3-0 probes: every table packed afresh from the renderer's current
  // state by samp_table.ts's packers - what the incrementally written
  // mirrors and the GPU textures must hold (RADII only for chains whose
  // CHAIN record names a radius region, `radOn`).
  g3Expected(): {
    samp: Float32Array;
    radii: Float32Array;
    radOn: number[];
    chain: Float32Array;
    ranges: Float32Array;
    entries: number;
  } {
    const L = this.g3;
    const samp = new Float32Array(L.sampTexels * 4);
    const radii = new Float32Array(L.radTexels * 4);
    const chain = new Float32Array(L.chains * 2 * 4);
    const radOn: number[] = [];
    const winBase = new Int32Array(L.chains);
    const nWin = new Int32Array(L.chains);
    const radB = new Int32Array(L.chains).fill(-1);
    let ranges = new Float32Array(1024);
    let entries = 0;
    const acc: number[] = [];
    const h = this.style.threadWidth / 2;
    for (let c = 0; c < L.chains; c++) {
      const s = this.chainSamples[c];
      const count = L.count[c];
      if (s && s.count === count) {
        packSamp(samp, L.sampBase[c], s.positions, count);
        const mul = this.withPluckCollapse(
          c,
          count,
          this.widthLast[c] ?? null
        );
        if (mul) {
          packRadii(radii, L.radBase[c], h, mul, count);
          radB[c] = L.radBase[c];
          radOn.push(c);
        }
      }
      const ids = new Float32Array(count * GAP_SLOTS);
      assignWindowLanes(
        this.chainWins.get(c),
        count,
        s ? s.closed : false,
        s ? s.totalLength : 0,
        GAP_SLOTS,
        ids,
        acc
      );
      const need = (entries + maxRangeEntries(acc.length / 4)) * RANGE_FLOATS;
      if (need > ranges.length) {
        const next = new Float32Array(need * 2);
        next.set(ranges);
        ranges = next;
      }
      winBase[c] = entries;
      nWin[c] = packRanges(acc, count, s ? s.closed : false, ranges, entries);
      entries += nWin[c];
    }
    for (let c = 0; c < L.chains; c++) {
      writeChainTexels(
        chain,
        c,
        L.sampBase[c],
        radB[c],
        this.g3Caps[c * 2],
        this.g3Caps[c * 2 + 1],
        winBase[c],
        nWin[c],
        winBase[c] + nWin[c],
        0
      );
    }
    return {
      samp,
      radii,
      radOn,
      chain,
      ranges: ranges.slice(0, entries * RANGE_FLOATS),
      entries,
    };
  }

  // ---- K8 G3-0: SAME-STATE CAPTURE / RESTORE (G3G4_sdf_geometry.md 5.0) --
  //
  // Everything update() reads that a second page of the same link does not
  // share, as plain JSON (typed arrays in base64, so NaN and +-Infinity
  // survive): the physics fields the renderer reads (positions, each
  // crossing's pass ctrl and displayF, the emergent rows - what K7's
  // snapshot carries), the renderer's clocks, gate latches and gate cache,
  // the appearance reveal's clock, the thread reveal's pieces, and every
  // paint uniform. restoreScene ends with an update(). Not captured: the
  // paint declaration and hover (main re-declares them from the fabric
  // every frame), plucks (none at rest), the camera (main's). The restoring
  // page must keep its physics frozen (a probe no-ops ps.step): velocities
  // are not restored, and the emergent list stays pinned to the captured
  // rows until the page reloads.
  captureScene(): SceneCapture {
    const ps = this.ps;
    const n = ps.particleCount;
    const c = ps.crossings.length;
    const passes = new Float64Array(4 * c);
    for (let k = 0; k < c; k++) {
      const x = ps.crossings[k];
      passes[k * 4] = x.over.ctrl;
      passes[k * 4 + 1] = x.over.displayF ?? NaN;
      passes[k * 4 + 2] = x.under.ctrl;
      passes[k * 4 + 3] = x.under.displayF ?? NaN;
    }
    const em = new Float32Array(EMERGENT_MAX * EMERGENT_ROW);
    const emN = ps.writeEmergentRows(em, 0);
    const U = knotUniformValues() as unknown as Record<string, Float32Array>;
    const uniforms: Record<string, string> = {};
    for (const k of Object.keys(U)) uniforms[k] = typedToB64(U[k]);
    const ra = this.revealAnim as unknown as RevealClock | null;
    const scalars = new Float64Array([
      this.flowTime,
      this.paintClock,
      this.pulseBorn,
      this.gateRev,
      this.fxLive ? 1 : 0,
      this.gateOpenAt,
      this.revealOn ? 1 : 0,
      this.revealWas ? 1 : 0,
      this.exploreUpdatePending ? 1 : 0,
      this.revealWall0,
      this.fxEnd,
      this.rimAt,
      ra ? 1 : 0,
      ra ? ra.t : 0,
      ra && ra.done ? 1 : 0,
      ra ? ra.speed : 1,
    ]);
    return {
      v: 1,
      n,
      c,
      positions: typedToB64(ps.positions.slice(0, 2 * n)),
      passes: typedToB64(passes),
      emergent: typedToB64(em.slice(0, emN * EMERGENT_ROW)),
      scalars: typedToB64(scalars),
      gateLatch: typedToB64(this.gateLatch),
      gateCache: typedToB64(this.gateCache),
      uniforms,
      explore: this.explorePieces
        ? (JSON.parse(JSON.stringify(this.explorePieces)) as ExplorePiece[])
        : null,
    };
  }

  // Restore a captureScene() from a page of the same link (same build,
  // same scene: particle and crossing counts must match), then update().
  restoreScene(s: SceneCapture): void {
    const ps = this.ps;
    if (s.n !== ps.particleCount || s.c !== ps.crossings.length) {
      throw new Error(
        `restoreScene: ${s.n} particles / ${s.c} crossings captured, ` +
          `${ps.particleCount} / ${ps.crossings.length} here`
      );
    }
    ps.positions.set(b64ToF32(s.positions));
    const passes = b64ToF64(s.passes);
    const df = (v: number) => (Number.isNaN(v) ? undefined : v);
    for (let k = 0; k < s.c; k++) {
      const x = ps.crossings[k];
      x.over.ctrl = passes[k * 4];
      x.over.displayF = df(passes[k * 4 + 1]);
      x.under.ctrl = passes[k * 4 + 2];
      x.under.displayF = df(passes[k * 4 + 3]);
    }
    const rows = b64ToF32(s.emergent);
    const pairOf = (
      ps as unknown as {
        emergentPair(
          i: number,
          u: number,
          j: number,
          v: number,
          aOver: boolean
        ): { over: CrossingPass; under: CrossingPass };
      }
    ).emergentPair.bind(ps);
    Object.defineProperty(ps, "emergentCrossings", {
      configurable: true,
      get: () => {
        const out: Array<{ over: CrossingPass; under: CrossingPass }> = [];
        for (let o = 0; o + EMERGENT_ROW <= rows.length; o += EMERGENT_ROW) {
          out.push(
            pairOf(rows[o], rows[o + 1], rows[o + 2], rows[o + 3], rows[o + 4] !== 0)
          );
        }
        return out;
      },
    });
    const S = b64ToF64(s.scalars);
    this.flowTime = S[0];
    this.paintClock = S[1];
    this.pulseBorn = S[2];
    this.gateRev = S[3];
    this.fxLive = S[4] !== 0;
    this.gateOpenAt = S[5];
    this.revealOn = S[6] !== 0;
    this.revealWas = S[7] !== 0;
    this.exploreUpdatePending = S[8] !== 0;
    this.revealWall0 = S[9];
    this.fxEnd = S[10];
    this.rimAt = S[11];
    const ra = this.revealAnim as unknown as RevealClock | null;
    if (ra && S[12] !== 0) {
      ra.t = S[13];
      ra.done = S[14] !== 0;
      ra.speed = S[15];
    }
    this.gateLatch = b64ToF64(s.gateLatch).slice();
    this.gateCache = b64ToF64(s.gateCache).slice();
    const U = knotUniformValues() as unknown as Record<string, Float32Array>;
    const E = b64ToF32(s.uniforms.uKExplore ?? "");
    this.setExplore(s.explore, E.length > 2 ? E[1] : 0, E.length > 2 ? E[2] : 1);
    for (const k of Object.keys(s.uniforms)) {
      const v = b64ToF32(s.uniforms[k]);
      if (U[k] && U[k].length === v.length) U[k].set(v);
    }
    this.update();
  }

  // K76 2b, THE JOINT GATE (K76_reveal_mode.md 2.4): which joints the
  // thread reveal hides - junction webs and fans (by junctionArms index),
  // free-tip caps (by freeTips index) - recomputed when the declaration
  // changes, and the key rebuildFillets adds to its own (the fans rebuild
  // when the hidden SET changes, not on growth frames). Since K268 stage 2
  // (K275) the gate is no longer binary: a junction hides once any arm's
  // visibility at its slot is at most EXPLORE_JOINT_MIN, a free tip's cap
  // once its thread's is at the tip, and whatever draws fades with its
  // threads through the arm strips' premultiplied alpha. In the model's
  // states the hidden set is 2b's: a visited junction's arms are solid
  // through its web domain (at least 2.3 half-widths, at most half the
  // run), and a stub fades out INTO an unvisited one (vis 0 at its slot).
  private exploreJointRev = -1;
  private exploreHideJn: Uint8Array | null = null;
  private exploreHideFree: Uint8Array | null = null;
  private exploreJointKey = "";
  private syncExploreJoints(): void {
    if (this.exploreJointRev === this.exploreRev) return;
    this.exploreJointRev = this.exploreRev;
    if (!this.explorePieces) {
      this.exploreHideJn = null;
      this.exploreHideFree = null;
      this.exploreJointKey = "";
      return;
    }
    const hideJn = new Uint8Array(this.junctionArms.length);
    const hideFree = new Uint8Array(this.freeTips.length);
    const parts: string[] = [];
    for (let jn = 0; jn < this.junctionArms.length; jn++) {
      if (!this.exploreJointShown(jn)) {
        hideJn[jn] = 1;
        parts.push("j" + jn);
      }
    }
    for (let i = 0; i < this.freeTips.length; i++) {
      const tip = this.freeTips[i];
      const n = this.ps.chains[tip.chain].length;
      if (this.exploreVisAt(tip.chain, tip.atEnd ? n - 1 : 0) <= EXPLORE_JOINT_MIN) {
        hideFree[i] = 1;
        parts.push("t" + i);
      }
    }
    this.exploreHideJn = hideJn;
    this.exploreHideFree = hideFree;
    this.exploreJointKey = "x" + parts.join(",");
  }

  // The joint gate's part of the fillet key ("" with the mode off).
  private exploreJointsKey(): string {
    this.syncExploreJoints();
    return this.exploreJointKey;
  }

  // Whether a junction draws under the reveal (the joint gate): every arm
  // visible past EXPLORE_JOINT_MIN at its slot. An unvisited junction, whose
  // stubs fade out into it, hides; a drawn web fades with its arms.
  // K290 (burn stage 3a): under a burn the reveal's own pieces (the gate)
  // apply that rule, and the declared pieces (which lack the burnt thread)
  // hide a junction only when every arm is gone; otherwise the web draws
  // and a burnt arm's lobe fades out with its strip (the joint fade).
  // Without a burn the two are the same pieces: the rule above, exactly.
  private exploreJointShown(jn: number): boolean {
    let any = false;
    for (const a of this.junctionArms[jn].arms) {
      const n = this.ps.chains[a.chain].length;
      const closed = this.ps.chainBreakAfter[a.chain] < 0;
      const c = closed ? a.slot : Math.max(0, Math.min(n - 1, a.slot));
      if (this.exploreGateVisAt(a.chain, c) <= EXPLORE_JOINT_MIN) return false;
      if (this.exploreVisAt(a.chain, c) > EXPLORE_JOINT_MIN) any = true;
    }
    return any || this.junctionArms[jn].arms.length === 0;
  }

  // K290: the reveal's own visibility at a chain point (exploreVisAt with
  // no burn; 1 with a burn and the reveal off).
  private exploreGateVisAt(chain: number, ctrl: number): number {
    if (!this.exploreBurn) return this.exploreVisAt(chain, ctrl);
    const g = this.exploreGateByChain;
    if (!g) return 1;
    const l = g.get(chain);
    if (!l) return 0;
    const n = this.ps.chains[chain].length;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    let best = 0;
    for (const p of l) best = Math.max(best, pieceVis(p, ctrl, n, closed));
    return best;
  }

  // Probe view of the joint gate: hidden junctionArms / freeTips indices
  // (empty with the mode off).
  exploreJointState(): { junctions: number[]; freeTips: number[] } {
    this.syncExploreJoints();
    const pick = (a: Uint8Array | null): number[] => {
      const out: number[] = [];
      if (a) a.forEach((v, i) => v && out.push(i));
      return out;
    };
    return { junctions: pick(this.exploreHideJn), freeTips: pick(this.exploreHideFree) };
  }

  get exploreOn(): boolean {
    return this.explorePieces !== null;
  }

  // The CPU twin of kExploreAt's visibility (explore_view.ts chainVis): a
  // chain point's visibility, 1 with the mode off.
  exploreVisAt(chain: number, ctrl: number): number {
    if (!this.explorePieces) return 1;
    if (this.exploreWhole[chain]) return 1;
    const l = this.exploreByChain.get(chain);
    if (!l) return 0;
    const n = this.ps.chains[chain].length;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    let best = 0;
    for (const p of l) {
      const v = pieceVis(p, ctrl, n, closed);
      if (v > best) best = v;
    }
    return best;
  }

  // K76 stage 2c: whether input may touch a chain point (always with the
  // reveal off).
  exploreShownAt(chain: number, ctrl: number): boolean {
    return this.exploreVisAt(chain, ctrl) >= EXPLORE_PICK_VIS;
  }

  // K76 stage 2c: the shown stretch (unwrapped ctrls, found in 0.25 ctrl
  // steps) around a chain ctrl, inside `lim` (a pluck unit's span; else
  // half a loop each way, or the open chain); null when the point itself
  // is hidden. A pluck's unit is clipped to it.
  private exploreShownSpan(
    chain: number,
    ctrl: number,
    lim: [number, number] | null,
    len: number,
    closed: boolean
  ): [number, number] | null {
    const STEP = 0.25;
    let u = ctrl;
    let lo0: number;
    let hi0: number;
    if (lim) {
      [lo0, hi0] = lim;
      if (closed && u < lo0) u += len;
      u = Math.max(lo0, Math.min(hi0, u));
    } else if (closed) {
      lo0 = u - len / 2;
      hi0 = u + len / 2;
    } else {
      lo0 = 0;
      hi0 = len - 1;
    }
    const at = (c: number): boolean =>
      this.exploreShownAt(chain, closed ? ((c % len) + len) % len : Math.max(0, Math.min(len - 1, c)));
    if (!at(u)) return null;
    let lo = u;
    while (lo > lo0) {
      const n = Math.max(lo0, lo - STEP);
      if (!at(n)) break;
      lo = n;
    }
    let hi = u;
    while (hi < hi0) {
      const n = Math.min(hi0, hi + STEP);
      if (!at(n)) break;
      hi = n;
    }
    return [lo, hi];
  }

  // Texels the last paint declaration change uploaded (probes).
  lastPaintUpload = 0;
  private paintOverflowWarned = false;
  // The declaration last written to KPAINT (setPaint skips identical ones).
  private paintKey = "";

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

  // K98: the thread's own color at a marker (its section color, burn /
  // roots included - colorAtArc) into out[0..2], for the start and finish
  // markers' colored dots.
  sectionColorAt(chain: number, ctrl: number, out: Float32Array): void {
    const samples = this.chainSamples[chain];
    if (!samples) {
      out.set(this.baseRgb);
      return;
    }
    const closed = this.ps.chainBreakAfter[chain] < 0;
    this.colorAtArc(chain, this.paintArcAt(samples, ctrl, closed), out);
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

  // CPU REFERENCE of the GPU junction field (junction_field.ts FIELD_GLSL)
  // and of the arm strips it reads (arm_strip.ts), transliterated line for
  // line and reading the SAME record, strip table and paint data the
  // shaders sample - the fieldProbe ground truth. Not on any hot path.
  // GLSL twin (arm_strip STRIP_FRAG) chainMaterial: the COMPOSED material of a chain at a world
  // arc - the ribbon's section color there (its own Gouraud between
  // samples; `seed` = a ctrl near the arc), burn / roots, then the gameplay
  // paint and the reveal glow with edge coverage over `px` - into out[0..2].
  // untrav (K81): the paint without its gold amount (an untraveled row).
  // out[3]: the thread's visibility there under the thread reveal (K268
  // stage 2, withExploreStrip's kStripVis), else 1.
  private cpuChainMaterial(
    ch: number,
    a: number,
    out: Float32Array,
    seedIn: number,
    px = 0,
    untrav = false
  ): void {
    const D = kData();
    const U = knotUniformValues();
    const c = kChain(D, ch);
    // GLSL twin: the seed normalized onto the chain (rings wrap, runs clamp).
    const nc = c.nCtrl;
    const seed = c.closed ? kWrap(seedIn, nc) : Math.max(0, Math.min(nc - 1, seedIn));
    const total = c.total;
    if (!(total > 0) || c.count < 2) {
      knotSection(D, U, c, 0, out);
      out[3] = 1;
      return;
    }
    const an = c.closed ? kWrap(a, total) : Math.max(0, Math.min(total, a));
    const c0 = kSectionAtArc(D, U, c, a, seed, out);
    const actrl = kCtrlOfArcNear(D, c, an, c0);
    if (U.uKFx[3] >= 0.5 && U.uKFx[2] < c.fxDone) {
      const st = Math.round(U.uKFx[0]);
      if (st === FX_STYLE.burn || st === FX_STYLE.roots) {
        kFxColor(D, U, c, actrl, an / c.arcPer, out, this.ignScratch);
      }
    }
    if ((U.uKPaint[0] > 0.5 && c.paintOn) || U.uKFx2[2] > 0.5) {
      const st = kPaintAt(D, U, c, actrl, an, px, this.paintTmp);
      if (untrav) st.p = 0;
      kComposePaint(U, out, st, kGlow(D, U, c, actrl));
    }
    const E = U.uKExplore;
    out[3] = E && E[0] > 0.5 ? kExploreAt(D, U, c, actrl, this.exploreAtScratch).v : 1;
  }
  // Append one ARM STRIP row (arm_strip.ts table layout): texel k = the
  // material of `chain` at arc arc0 + arcStep * k (ctrl seed seed0 +
  // seedStep * k), paint edges antialiased over px; untrav 1 = the
  // untraveled material (K81). Returns the row.
  private writeStripRow(
    chain: number,
    arc0: number,
    arcStep: number,
    px: number,
    seed0: number,
    seedStep: number,
    untrav = 0
  ): number {
    const r = this.stripRowsUsed++;
    const tb = stripTable();
    tb.ensure(2 * r + 2);
    const d = tb.data;
    const o = r * 8;
    d[o] = chain;
    d[o + 1] = arc0;
    d[o + 2] = arcStep;
    d[o + 3] = px;
    d[o + 4] = seed0;
    d[o + 5] = seedStep;
    d[o + 6] = untrav;
    d[o + 7] = 0;
    return r;
  }

  // GLSL twin of arm_strip STRIP_LOOKUP_GLSL stripAt: strip row `row` at
  // texel coordinate x, from the two nearest texels - each the strip pass's
  // material (cpuChainMaterial at the row's arc / seed / px) quantized to
  // the render texture's 8 bits - lerped with exact weights.
  private cpuStripAt(row: number, x: number, out: Float32Array): void {
    const T = stripTable().data;
    const o = row * 8;
    const xc = Math.max(0, Math.min(STRIP_W - 1, x));
    const k0 = Math.floor(xc);
    const k1 = Math.min(k0 + 1, STRIP_W - 1);
    const f = xc - k0;
    const q = (v: number): number => Math.round(Math.max(0, Math.min(1, v)) * 255) / 255;
    const m0 = this.stripK0;
    const m1 = this.stripK1;
    const un = T[o + 6] > 0.5;
    this.cpuChainMaterial(T[o], T[o + 1] + T[o + 2] * k0, m0, T[o + 4] + T[o + 5] * k0, T[o + 3], un);
    this.cpuChainMaterial(T[o], T[o + 1] + T[o + 2] * k1, m1, T[o + 4] + T[o + 5] * k1, T[o + 3], un);
    // K268 stage 2: the texels are premultiplied by the visibility (1 with
    // the reveal off: master's texels), and out[3] is the lerped alpha.
    const v0 = m0[3];
    const v1 = m1[3];
    for (let c = 0; c < 3; c++) {
      const a = q(m0[c] * v0);
      out[c] = a + (q(m1[c] * v1) - a) * f;
    }
    const a3 = q(v0);
    out[3] = a3 + (q(v1) - a3) * f;
  }

  // The composed junction-field color at (x, y) for the record at texel
  // `rec` into out[0..2] (the arms' materials come from their strip rows,
  // which antialias the paint over their own step): FIELD_GLSL
  // junctionField, K81 route bands included. px = world units per pixel
  // (the shader's pxW, floored the same way); strip = the pixel belongs to
  // a cover strip (the band's solid pad).
  // Under the thread reveal (K268 stage 2) the color is premultiplied and
  // out[3] is its alpha (the strips'); with the reveal off out[3] is 0.
  private cpuJunctionField(
    rec: number,
    x: number,
    y: number,
    out: Float32Array,
    px = 0,
    strip = false
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
    this.fieldLastArm.length = 0;
    const ex = x - J[hd];
    const ey = y - J[hd + 1];
    const mA = this.acc4Scratch;
    // (Materials arrive composed - the shader blends composed colors.)
    const exA = (knotUniformValues().uKExplore?.[0] ?? 0) > 0.5;
    const nc = exA ? 4 : 3;
    const compose = (m: Float32Array): void => {
      out[0] = m[0];
      out[1] = m[1];
      out[2] = m[2];
      out[3] = exA ? m[3] : 0;
    };
    if (n === 0) {
      const h = at(rec + 2);
      const ax = at(rec + 3);
      this.cpuStripAt(
        Math.round(J[h + 1]),
        (ex * J[ax + 1] + ey * J[ax + 2] + J[h + 3]) * J[h + 2],
        mA
      );
      compose(mA);
      return;
    }
    // K81: a routed record's base reads the untraveled rows (row + 1),
    // unless J1.z marks it fully traveled (K127); K169: J1.z is the level it
    // has faded in to, and in between the two bases blend.
    const nr = Math.round(J[at(rec + 1) + 3]);
    const routed = nr > 0;
    const fz = routed ? J[at(rec + 1) + 2] : 0;
    const armPaint = (
      ab: number,
      s: number,
      band: boolean,
      untrav: boolean,
      m: Float32Array
    ): void => {
      const h = at(ab);
      const a = at(ab + 1);
      const sc = Math.min(band ? Math.max(s, 1 / J[h + 3]) : s, J[a + 2]);
      // (Probes: the exact arc and ctrl seed the strip texel stands for.)
      this.fieldLastArm.push(Math.round(J[h]), J[a] + J[a + 1] * sc, J[a + 3] + J[a + 1] * sc * J[h + 1]);
      this.cpuStripAt(Math.round(J[h + 2]) + (untrav ? 1 : 0), sc * J[h + 3], m);
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
    const abB = rec + 2 + ib * stride;
    const mB = this.fieldMbScratch;
    // Probe views (uKBase.z 3 / 4): one bracketing arm's material alone.
    const dbg = Math.round(knotUniformValues().uKBase[2]);
    let onlyA = ia === ib || dbg === 3;
    let onlyB = !onlyA && dbg === 4;
    // The blend weight first (FIELD_GLSL: a pixel inside one arm's
    // footprint evaluates that arm alone - identical, mix at 0 / 1 is exact).
    let t = 0;
    if (!onlyA && !onlyB) {
      const span = relA + relB;
      const hw = rho > fillHalf ? Math.asin(fillHalf / rho) : Math.PI / 2;
      let lo = hw;
      let hi = span - hw;
      const minW = span * FIELD_BLEND_MIN;
      if (hi - lo < minW) {
        lo = (span - minW) * 0.5;
        hi = lo + minW;
      }
      t = hi > lo ? (relA - lo) / (hi - lo) : relA < span * 0.5 ? 0 : 1;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      t = t * t * (3 - 2 * t);
      if (t <= 0) onlyA = true;
      else if (t >= 1) onlyB = true;
    }
    const baseField = (untravSide: boolean): void => {
      if (!onlyB) {
        armPaint(abA, profArc(abA, relA < Math.PI / 2 ? rho * Math.cos(relA) : 0), false, untravSide, mA);
      }
      if (onlyA) {
        compose(mA);
      } else {
        armPaint(abB, profArc(abB, relB < Math.PI / 2 ? rho * Math.cos(relB) : 0), false, untravSide, mB);
        if (onlyB) {
          compose(mB);
        } else {
          // Composed colors blend (see FIELD_GLSL).
          for (let c = 0; c < nc; c++) out[c] = mA[c] + (mB[c] - mA[c]) * t;
          if (!exA) out[3] = 0;
        }
      }
    };
    baseField(routed && fz < 0.5);
    if (routed && fz > 0 && fz < 1) {
      // K169, mid-fade (FIELD_GLSL junctionField): the other side's base,
      // blended by the level. (lastArms then lists that second pass's arms.)
      const p0 = out[0];
      const p1 = out[1];
      const p2 = out[2];
      const p3 = out[3];
      this.fieldLastArm.length = 0;
      baseField(fz >= 0.5);
      // The first pass was untraveled below 0.5 and composed from there on.
      const lo = fz < 0.5;
      const o0 = out[0];
      const o1 = out[1];
      const o2 = out[2];
      out[0] = lo ? p0 + (o0 - p0) * fz : o0 + (p0 - o0) * fz;
      out[1] = lo ? p1 + (o1 - p1) * fz : o1 + (p1 - o1) * fz;
      out[2] = lo ? p2 + (o2 - p2) * fz : o2 + (p2 - o2) * fz;
      if (exA) {
        const o3 = out[3];
        out[3] = lo ? p3 + (o3 - p3) * fz : o3 + (p3 - o3) * fz;
      }
    }
    if (!routed || dbg === 3 || dbg === 4) return;
    // K81 ROUTE BANDS, oldest first (FIELD_GLSL junctionField): the nearest
    // point of each band's centerline polyline and its tau; a one-pixel
    // ramp centered on the half-width (a cover strip: solid ROUTE_BAND_PAD
    // pixels further first).
    const pxW = Math.max(px, 1e-5);
    const reach = fillHalf + (strip ? ROUTE_BAND_PAD + 1 : 0.5) * pxW;
    let base = Math.round(J[hd + 3]);
    const nrr = Math.min(nr, MAX_ROUTES);
    for (let r = 0; r < nrr; r++) {
      const r0 = at(base);
      const nv = Math.round(J[r0]);
      let best = 1e20;
      let tau = 0;
      let q0 = at(base + 1);
      for (let k = 0; k < MAX_ROUTE_VERTS - 1 && k + 1 < nv; k++) {
        const q1 = at(base + 2 + k);
        const dx = J[q1] - J[q0];
        const dy = J[q1 + 1] - J[q0 + 1];
        const wx = x - J[q0];
        const wy = y - J[q0 + 1];
        const l2 = dx * dx + dy * dy;
        const u = l2 > 1e-12 ? Math.max(0, Math.min(1, (wx * dx + wy * dy) / l2)) : 0;
        const ox = wx - dx * u;
        const oy = wy - dy * u;
        const dd = ox * ox + oy * oy;
        if (dd < best) {
          best = dd;
          tau = J[q0 + 2] + (J[q1 + 2] - J[q0 + 2]) * u;
        }
        q0 = q1;
      }
      const cov = Math.max(0, Math.min(1, (reach - Math.sqrt(best)) / pxW));
      if (cov > 0) {
        armPaint(rec + 2 + Math.round(J[r0 + 2]) * stride, -tau, true, false, mA);
        if (J[r0 + 3] > -0.5) {
          armPaint(rec + 2 + Math.round(J[r0 + 3]) * stride, tau, true, false, mB);
          const m = J[r0 + 1];
          let s = Math.max(0, Math.min(1, (tau + m) / (2 * m)));
          s = s * s * (3 - 2 * s);
          for (let c = 0; c < nc; c++) mA[c] = mA[c] + (mB[c] - mA[c]) * s;
        }
        for (let c = 0; c < nc; c++) out[c] = out[c] + (mA[c] - out[c]) * cov;
      }
      base += 1 + nv;
    }
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

  // Section RGB at a world ARC along a chain into out[0..2] - the ribbon's
  // own color there (its vertex shader's section at the two bracketing
  // samples, lerped), so overlay geometry sampling through here matches the
  // adjacent ribbon exactly at a seam.
  private colorAtArc(chain: number, arc: number, out: Float32Array): void {
    this.sectionAtArc(chain, arc, out);
    // Burn / roots wear on the CPU-drawn overlays too (pluck colors): the
    // shader's own FX function at the point, via the mirror - a plucked
    // stretch burns exactly as its ribbon does.
    if (!this.fxLive) return;
    const U = knotUniformValues();
    if (U.uKFx[0] !== FX_STYLE.burn && U.uKFx[0] !== FX_STYLE.roots) return;
    const D = kData();
    const c = kChain(D, chain);
    if (!(c.total > 0)) return;
    const a = normArc(arc, c.total, c.closed);
    kFxColor(D, U, c, kCtrlOfArc(D, c, a), a / c.arcPer, out, this.ignScratch);
  }

  // Mean ctrl per world arc along a junction arm over its first `d` of arc
  // (the fan shader's ctrl search seed slope; 0 when degenerate).
  private armCtrlSlope(
    a: { chain: number; slot: number; dir: number; arc0: number; total: number; closed: boolean },
    d: number
  ): number {
    if (!(d > 1e-6)) return 0;
    const D = kData();
    const c = kChain(D, a.chain);
    if (!(c.total > 0)) return 0;
    const ctrl = kCtrlOfArc(D, c, normArc(a.arc0 + a.dir * d, c.total, c.closed));
    let delta = ctrl - a.slot;
    if (c.closed) {
      const n = c.nCtrl;
      delta -= n * Math.round(delta / n);
    }
    return Math.abs(delta) / d;
  }

  // The section color at an arc: the ribbon's own Gouraud between its
  // vertices (paint_math kSectionAtArc - the vertex shader's knotSection at
  // the two bracketing samples, lerped).
  private sectionAtArc(chain: number, arc: number, out: Float32Array): void {
    const D = kData();
    const c = kChain(D, chain);
    if (!(c.total > 0) || !this.chainSamples[chain]) {
      knotSection(D, knotUniformValues(), c, 0, out);
      return;
    }
    kSectionAtArc(D, knotUniformValues(), c, arc, -1, out);
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
    if (!this.filletLayer) return;
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
      this.fadeLength +
      "|" +
      this.routeKey +
      this.exploreJointsKey();
    // A reveal moves the joint gate times (their speed extrapolation) every
    // frame; the FX fades themselves animate on the GPU from the record's
    // J1 times (G2.1), so they need no rebuild.
    if (!force && !this.revealOn && key === this.filletKey) return;
    this.filletKey = key;
    this.stripRowsUsed = 0;
    if (!this.filletMesh) {
      let armTotal = 0;
      for (const jn of this.junctionArms) armTotal += jn.arms.length;
      const wedgeRim = 2 * FILLET_EDGE_PTS_MAX + FILLET_BEZIER_STEPS + 1;
      // + one K81 cover strip per arm (COVER_STRIP_PTS samples, two
      // vertices each, two triangles per segment).
      const verts =
        armTotal * (1 + wedgeRim + 2 * COVER_STRIP_PTS) +
        nDiscs * (2 + DISC_SEGS);
      const idx =
        (armTotal * (wedgeRim - 1 + 2 * (COVER_STRIP_PTS - 1)) +
          nDiscs * DISC_SEGS) *
        3;
      this.filletMesh = new TriFanMesh(verts, idx);
      this.filletMesh.mesh.shader = this.explorePieces ? junctionShaderExplore() : junctionShader();
      this.filletLayer.addChild(this.filletMesh.mesh);
      // The top mesh gets the same capacity: any junction can flip
      // layers frame to frame as threads move.
      this.filletTopMesh = new TriFanMesh(verts, idx);
      this.filletTopMesh.mesh.shader = this.explorePieces ? junctionShaderExplore() : junctionShader();
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
      ctrl0: number,
      rad: number
    ): number => {
      // The cap's strip row spans the axis projections [-rad, rad].
      const step = (2 * rad) / (STRIP_W - 1);
      const row = this.writeStripRow(chain, arc0 - rad, step, step, ctrl0, 0);
      rd.ensure(cursor + 4);
      const D = rd.data;
      const o = cursor * 4;
      D[o] = cx;
      D[o + 1] = cy;
      D[o + 2] = 0;
      D[o + 3] = 0;
      D[o + 4] = j1[0];
      D[o + 5] = j1[1];
      D[o + 6] = 0;
      D[o + 7] = 0;
      D[o + 8] = chain;
      D[o + 9] = row;
      D[o + 10] = 1 / step;
      D[o + 11] = rad;
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
      const rb = writeAxis(cx, cy, j1, chain, arc0, ax, ay, gateCtrl, r);
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
      // Arc from the joint to an open chain's end along the arm (Infinity
      // on a closed chain): bounds the K81 route band's arm stretches.
      toEnd: number;
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
      // The farthest any of its fan vertices lies from (jx, jy): bounds the
      // arc its arms' strip rows must cover.
      rMax: number;
      // K81 ROUTE BANDS through this joint, oldest first: arm indexes into
      // arms[0..n) (ib -1 = a one-arm band, the head), the turn's start
      // arc d along both arms and the half-length m of its A -> B blend.
      routes: Array<{ ia: number; ib: number; d: number; m: number }>;
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
          toEnd,
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
        rMax: 0,
        routes: [],
      });
    }
    // JUNCTION RECORDS (joints with >= 2 arms - nothing else draws or reads
    // a field): header, the gate texel J1 = (tOn, tLast), then per arm (in
    // angle order) its chain/arc header pair and its profile, one texel per
    // radius step carrying both ends of a lookup.
    setFieldParams(fillHalf, profN);
    const armStride = 2 + profN;
    this.recBaseByJn.clear();
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
      // K127: > 0 = fully traveled; K169: the level it has faded in to (0 =
      // the untraveled rows, 1 = the composed rows, between = their blend);
      // K191: a web that stopped being full fades back down through it.
      D[o + 6] = this.webFade.level(rec.jn, this.paintClock);
      D[o + 7] = 0;
      for (let i = 0; i < n; i++) {
        const a = rec.arms[i];
        const ab = (cursor + 2 + i * armStride) * 4;
        const pth = a.pth;
        const ps = a.ps;
        D[ab] = a.chain;
        // The ctrl search SEED along the arm: its joint ctrl (.w of the next
        // texel) plus the arc offset times this mean ctrl-per-arc over the
        // stretch the field samples (G2.2: the fans evaluate the ribbon's
        // section from the arc table; a seed from the joint alone cost the
        // fan shader ~0.6 ms/frame in walks at 3200x1800).
        D[ab + 1] = this.armCtrlSlope(a, Math.min(a.domain, ps[profN - 1]));
        // The arm's strip row and its texels per world arc: written in
        // finish(), once the fans have bounded the reach (rMax).
        D[ab + 2] = 0;
        D[ab + 3] = 0;
        D[ab + 4] = a.arc0;
        D[ab + 5] = a.dir;
        D[ab + 6] = Math.min(a.domain, 1e9);
        D[ab + 7] = a.slot; // The arm's joint ctrl (the shader's search seed).
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
      this.recBaseByJn.set(rec.jn, cursor);
      cursor += 2 + n * armStride;
    }
    // K81 ROUTES: each record's resolved routes as indexes into its arms
    // (the first n, in angle order - what the record holds). A route whose
    // arm has no record entry (shorter than 0.15 world, or past MAX_ARMS)
    // gets no band; its junction's caps are dropped all the same (residual).
    if (this.routesByJn.size > 0) {
      for (const rec of recs) {
        if (rec.rb < 0) continue;
        const list = this.routesByJn.get(rec.jn);
        if (!list) continue;
        const n = Math.min(rec.arms.length, MAX_ARMS);
        const find = (x: RouteJArm): number => {
          for (let i = 0; i < n; i++) {
            const a = rec.arms[i];
            if (a.chain === x.chain && a.slot === x.slot && a.dir === x.dir) {
              return i;
            }
          }
          return -1;
        };
        for (const r of list) {
          const ia = find(r.a);
          if (ia < 0) continue;
          const ib = r.b ? find(r.b) : -1;
          if (r.b && ib < 0) continue;
          rec.routes.push({ ia, ib, d: 0, m: 0.5 * fillHalf });
        }
      }
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
      at: (ji, x, y, out, px = 0, strip = false) => {
        const rec = recs[ji];
        if (!rec || rec.rb < 0) return false;
        this.cpuJunctionField(rec.rb, x, y, out, px, strip);
        return true;
      },
      arms: (ji) => recs[ji]?.arms ?? [],
      routes: (ji) => recs[ji]?.routes ?? [],
      center: (ji) => (recs[ji] ? [recs[ji].jx, recs[ji].jy] : null),
      record: (ji) => recs[ji]?.rb ?? -1,
      gate: (ji) => recs[ji]?.j1 ?? null,
      lastArms: () => [...this.fieldLastArm],
      full: (ji) => this.fullJn.has(ji),
      fade: (ji) => {
        const r = recs[ji];
        return r && r.rb >= 0 ? recordData().data[(r.rb + 1) * 4 + 2] : -1;
      },
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
      // A triangle's farthest point from the joint is one of its vertices.
      let r2 = (cx - rec.jx) * (cx - rec.jx) + (cy - rec.jy) * (cy - rec.jy);
      for (let i = 0; i < rim.length; i += 2) {
        const dx = rim[i] - rec.jx;
        const dy = rim[i + 1] - rec.jy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) r2 = d2;
      }
      const r = Math.sqrt(r2);
      if (r > rec.rMax) rec.rMax = r;
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
    const hideJn = this.exploreHideJn; // K76 2b: the joint gate.
    const hideFree = this.exploreHideFree;
    for (let ti = 0; ti < this.freeTips.length; ti++) {
      const tip = this.freeTips[ti];
      if (hideFree && hideFree[ti]) continue;
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
        if (hideJn && hideJn[rec.jn]) continue;
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
      if (
        this.explorePieces &&
        (this.exploreVisAt(tip.hostChain, tip.hostCtrl) <= EXPLORE_JOINT_MIN ||
          this.exploreVisAt(
            tip.chain,
            tip.atEnd ? this.ps.chains[tip.chain].length - 1 : 0
          ) <= EXPLORE_JOINT_MIN)
      ) {
        continue;
      }
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
      // ARM STRIP ROWS (arm_strip.ts): each arm's row covers the arc its
      // fans can query - from the joint out to the profile's arc at the
      // record's outermost fan vertex (a pixel's projected radius never
      // exceeds its distance from the joint; the profile is monotone),
      // capped by the arm's domain - in STRIP_W texels.
      const last = profN - 1;
      const profArcAt = (ps: Float32Array, rp: number): number => {
        const x = rp / FIELD_PROF_DR;
        if (x >= last) return ps[last] + (rp - last * FIELD_PROF_DR);
        const i = Math.floor(x);
        const i1 = i + 1 < profN ? i + 1 : i;
        return ps[i] + (ps[i1] - ps[i]) * (x - i);
      };
      // K81: a routed record's bands run each arm's centerline out to
      // bandEnd - a half-width past the farthest fan or cover-strip vertex,
      // so no band's round end shows inside what the pass draws - and its
      // rows must cover that far.
      const bandEnd = (rec: JRec, a: JArm): number =>
        Math.min(a.toEnd, profArcAt(a.ps, rec.rMax) + fillHalf);
      const pts: number[] = [];
      for (const rec of recs) {
        if (rec.rb < 0) continue;
        const n = Math.min(rec.arms.length, MAX_ARMS);
        const routed = rec.routes.length > 0;
        // K127: a fully traveled record's base reads the composed rows;
        // K169: while it fades in, it still blends from the untraveled ones
        // (K191: and while it fades out, down to them).
        const untrav = routed && (!this.fullJn.has(rec.jn) || this.webFade.has(rec.jn));
        for (let i = 0; i < n; i++) {
          const a = rec.arms[i];
          const ab = (rec.rb + 2 + i * armStride) * 4;
          const sMax = Math.max(
            1e-4,
            Math.min(a.domain, routed ? bandEnd(rec, a) : profArcAt(a.ps, rec.rMax))
          );
          const step = sMax / (STRIP_W - 1);
          const slope = rd.data[ab + 1];
          const row = this.writeStripRow(
            a.chain,
            a.arc0,
            a.dir * step,
            step,
            a.slot,
            a.dir * step * slope
          );
          // A routed record's arms also get their UNTRAVELED row (row + 1).
          if (untrav) {
            this.writeStripRow(a.chain, a.arc0, a.dir * step, step, a.slot, a.dir * step * slope, 1);
          }
          rd.data[ab + 2] = row;
          rd.data[ab + 3] = 1 / step;
        }
        if (!routed) continue;
        // ROUTE BLOCKS (junction_field.ts ROUTES): per band R0 = (nVerts, m,
        // armA, armB or -1), then its centerline (x, y, tau, 0) - arm A's
        // own centerline in from bandEnd to the turn's start d, the turn,
        // arm B's out to bandEnd (tau = -arc along A, +arc along B); a
        // one-arm band (the head) runs in to the joint (tau 0 there).
        const routeBase = cursor;
        let nr = 0;
        for (const r of rec.routes) {
          const A = rec.arms[r.ia];
          pts.length = 0;
          const scratch = this.routeScratch;
          // Centerline points of `arm` from arc s0 to s1 in at most `cap`
          // segments of ~0.08 world, tau = sign * arc; each end included
          // on request. Vertex budget: 24 + 15 (the turn) + 24, or 41.
          const along = (
            arm: JArm,
            s0: number,
            s1: number,
            sign: number,
            cap: number,
            incStart: boolean,
            incEnd: boolean
          ): void => {
            const len = Math.abs(s1 - s0);
            const segs = len < 1e-4 ? 0 : Math.min(cap, Math.max(1, Math.ceil(len / 0.08)));
            const k0 = incStart ? 0 : 1;
            const k1 = incEnd ? segs : segs - 1;
            for (let k = k0; k <= k1; k++) {
              const s = segs > 0 ? s0 + ((s1 - s0) * k) / segs : s1;
              armAt(arm, s, scratch, 0);
              pts.push(scratch[0], scratch[1], sign * s);
            }
          };
          if (r.ib >= 0) {
            const B = rec.arms[r.ib];
            along(A, Math.max(bandEnd(rec, A), r.d), r.d, -1, 24, true, false);
            cornerCubic(A, B, r.d, pts);
            along(B, r.d, Math.max(bandEnd(rec, B), r.d), 1, 24, false, true);
          } else {
            along(A, bandEnd(rec, A), 0, -1, 40, true, true);
          }
          const nv = Math.min(pts.length / 3, MAX_ROUTE_VERTS);
          if (nv < 2) continue;
          rd.ensure(cursor + 1 + nv);
          const D = rd.data;
          const o = cursor * 4;
          D[o] = nv;
          D[o + 1] = r.m;
          D[o + 2] = r.ia;
          D[o + 3] = r.ib;
          for (let k = 0; k < nv; k++) {
            D[o + 4 + k * 4] = pts[k * 3];
            D[o + 5 + k * 4] = pts[k * 3 + 1];
            D[o + 6 + k * 4] = pts[k * 3 + 2];
            D[o + 7 + k * 4] = 0;
          }
          cursor += 1 + nv;
          nr++;
        }
        const D = rd.data;
        D[rec.rb * 4 + 3] = routeBase;
        D[rec.rb * 4 + 7] = nr;
      }
      const tb = stripTable();
      tb.markDirty(0, this.stripRowsUsed * 2);
      tb.flush();
      setStripRows(this.stripRowsUsed);
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

    // K81 ROUTE GEOMETRY. COVER CAP: how far along an arm its ribbon may be
    // re-emitted as a cover strip - short of its nearest under-gap (a fan
    // takes only a foreign over thread's silhouette, not the casing), within
    // its domain, and inside the pluck overlay's never-collapsed joint
    // footprint (pluckNodes: max(fillHalf + gap + 2 CUT_BIAS, the web
    // reach)), so a strip copied before a pluck never stands over a
    // collapsed base.
    const casingGap = (this.style.casingWidth - this.style.threadWidth) / 2;
    const footCap = Math.max(
      fillHalf + casingGap + 2 * CUT_BIAS,
      drawWedges ? L : 0
    );
    const coverCap = (X: JArm): number =>
      Math.min(gapNearOf(X) - FILLET_GAP_PAD * fillHalf, X.domain, footCap);
    // An arm's centerline point at arc s out from its joint and its OUTWARD
    // unit tangent, into out[o..o+3].
    const armAt = (arm: JArm, s: number, out: Float64Array, o: number): void => {
      this.sampleAtSafe(
        this.chainSamples[arm.chain]!,
        normArc(arm.arc0 + arm.dir * s, arm.total, arm.closed),
        arm.closed,
        this.sampleScratch,
        0
      );
      out[o] = this.sampleScratch[0];
      out[o + 1] = this.sampleScratch[1];
      let tx = this.sampleScratch[2] * arm.dir;
      let ty = this.sampleScratch[3] * arm.dir;
      const tl = Math.hypot(tx, ty);
      if (tl > 1e-6) {
        tx /= tl;
        ty /= tl;
      } else {
        tx = arm.dx;
        ty = arm.dy;
      }
      out[o + 2] = tx;
      out[o + 3] = ty;
    };
    // The band's turn from arm A at arc d to arm B at arc d (routeCubic:
    // tangent to both centerlines, tau -d -> +d), appended to out as
    // (x, y, tau) triples. routeScratch keeps the two arm frames.
    const cornerCubic = (A: JArm, B: JArm, d: number, out: number[]): void => {
      const q = this.routeScratch;
      armAt(A, d, q, 0);
      armAt(B, d, q, 4);
      routeCubic(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], d, d > 1e-6 ? 14 : 1, out);
    };
    // The web a route's turn crosses: the wedge between its two arms when
    // they are adjacent around the joint and that wedge is the turn's inner
    // side (narrower than a half turn); null = none drawn there.
    const routeRim = (
      arms: JArm[],
      ia: number,
      ib: number,
      rims: Array<number[] | null> | null
    ): number[] | null => {
      if (!rims) return null;
      const len = arms.length;
      const gapAfter = (k: number): number =>
        arms[(k + 1) % len].ang - arms[k].ang + (k === len - 1 ? Math.PI * 2 : 0);
      if (ib === (ia + 1) % len && gapAfter(ia) < Math.PI) return rims[ia];
      if (ia === (ib + 1) % len && gapAfter(ib) < Math.PI) return rims[ib];
      return null;
    };
    // Distance from (ox, oy) along the unit ray (ux, uy) to the nearest rim
    // segment it crosses (Infinity: none).
    const rayToRim = (
      ox: number,
      oy: number,
      ux: number,
      uy: number,
      rim: number[]
    ): number => {
      let best = Infinity;
      for (let i = 0; i + 3 < rim.length; i += 2) {
        const sx = rim[i + 2] - rim[i];
        const sy = rim[i + 3] - rim[i + 1];
        const den = ux * sy - uy * sx;
        if (Math.abs(den) < 1e-12) continue;
        const wx = rim[i] - ox;
        const wy = rim[i + 1] - oy;
        const t = (wx * sy - wy * sx) / den;
        const s = (wx * uy - wy * ux) / den;
        if (t > 0 && s >= 0 && s <= 1 && t < best) best = t;
      }
      return best;
    };
    // Does a turn starting at arc d keep the band's INNER edge (the side
    // the turn cuts across) inside what the junction pass draws there? A
    // point is covered within either arm's ribbon (a straight ray from the
    // joint) or the seal disc; elsewhere only the web covers it - out to its
    // rim less a quarter half-width (with no web, a 0.04 fillHalf slack).
    const fitPts: number[] = [];
    const turnFits = (
      rec: JRec,
      A: JArm,
      B: JArm,
      d: number,
      rim: number[] | null
    ): boolean => {
      if (d <= 1e-6) return true;
      fitPts.length = 0;
      cornerCubic(A, B, d, fitPts);
      const q = this.routeScratch;
      // Turning left (CCW) when travel in (-tA) crosses travel out (tB) > 0.
      const left = q[3] * q[6] - q[2] * q[7] > 0;
      const np = fitPts.length / 3;
      for (let i = 1; i < np - 1; i++) {
        let tx = fitPts[(i + 1) * 3] - fitPts[(i - 1) * 3];
        let ty = fitPts[(i + 1) * 3 + 1] - fitPts[(i - 1) * 3 + 1];
        const tl = Math.hypot(tx, ty);
        if (tl < 1e-9) continue;
        tx /= tl;
        ty /= tl;
        const ex = fitPts[i * 3] + (left ? -ty : ty) * fillHalf - rec.jx;
        const ey = fitPts[i * 3 + 1] + (left ? tx : -tx) * fillHalf - rec.jy;
        const rr = Math.hypot(ex, ey);
        let e = rr - 0.92 * fillHalf;
        for (const X of [A, B]) {
          if (ex * X.dx + ey * X.dy < 0) continue;
          const lat = Math.abs(ex * X.dy - ey * X.dx) - fillHalf;
          if (lat < e) e = lat;
        }
        if (e <= 0) continue;
        if (rim) {
          if (rr + Math.min(e, 0.25 * fillHalf) > rayToRim(rec.jx, rec.jy, ex / rr, ey / rr, rim)) {
            return false;
          }
        } else if (e > 0.04 * fillHalf) {
          return false;
        }
      }
      return true;
    };

    // K81: a routed record's wedge rims (flank tip A, the outer bezier,
    // flank tip B; null = a skipped wedge), kept for the route pass.
    const rimsOf = new Map<JRec, Array<number[] | null>>();
    for (const rec of recs) {
      const jx = rec.jx;
      const jy = rec.jy;
      const arms = rec.arms;
      if (arms.length < 2) continue;
      if (rec.j1[0] > fxNowJ + GATE_LEAD || (hideJn && hideJn[rec.jn])) {
        // Nothing of a gated joint draws this rebuild, its bands included
        // (K76 2b: nor of a joint the thread reveal hides).
        rec.routes.length = 0;
        continue;
      }
      fm = layerFor(rec);
      setFanMask(rec.mask);
      const jointTop = arms.some(armTop);
      const rims =
        drawWedges && rec.routes.length > 0
          ? new Array<number[] | null>(arms.length).fill(null)
          : null;
      if (rims) rimsOf.set(rec, rims);

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
        if (rims) rims[k] = rim.slice((nA - 1) * 2, (nA + n) * 2);
        emitFan(rec, jx, jy, rim);
      }
    }

    // K81 ROUTE PASS, per routed record: each band's corner (d, m), then
    // the COVER STRIPS - every arm's own ribbon quads re-emitted in the
    // junction pass out to its cover reach, so the field (the untraveled
    // base with the bands over it) decides those pixels: the arms' own
    // gold ribbons met in an L whose outer corner squared off the turn.
    for (const rec of recs) {
      if (rec.routes.length === 0 || rec.rb < 0) continue;
      const arms = rec.arms;
      const n = Math.min(arms.length, MAX_ARMS);
      const rims = rimsOf.get(rec) ?? null;
      // Per arm: the largest turn start of a band on it (-1: no band).
      const dArm = new Float64Array(n).fill(-1);
      let dMax = 0;
      for (const r of rec.routes) {
        if (r.ib < 0) {
          // The head: a one-arm band in to the joint center.
          r.d = 0;
          r.m = 0.5 * fillHalf;
          dArm[r.ia] = Math.max(dArm[r.ia], 0);
          continue;
        }
        const A = arms[r.ia];
        const B = arms[r.ib];
        const alpha = Math.acos(
          Math.max(-1, Math.min(1, A.dx * B.dx + A.dy * B.dy))
        );
        const rim = routeRim(arms, r.ia, r.ib, rims);
        let d = routeCorner(
          alpha,
          drawWedges ? Math.min(armReach(A), armReach(B)) : fillHalf,
          fillHalf,
          coverCap(A),
          coverCap(B)
        ).d;
        // The turn must stay inside what the junction pass draws: the arms'
        // ribbons, the seal disc and the web between them (its rim, less a
        // margin). Bisect the largest start that fits.
        if (!turnFits(rec, A, B, d, rim)) {
          let lo = 0;
          let hi = d;
          for (let it = 0; it < 6; it++) {
            const mid = (lo + hi) / 2;
            if (turnFits(rec, A, B, mid, rim)) lo = mid;
            else hi = mid;
          }
          d = lo;
        }
        r.d = d;
        r.m = Math.max(d, 0.5 * fillHalf);
        dArm[r.ia] = Math.max(dArm[r.ia], d);
        dArm[r.ib] = Math.max(dArm[r.ib], d);
        if (d > dMax) dMax = d;
      }
      setFanMask(rec.mask);
      const jointTop = arms.some(armTop);
      for (let i = 0; i < n; i++) {
        const X = arms[i];
        // A band's arm is covered a half-width past its turn; every other
        // arm past the farthest turn (a band's edge can cross its start).
        const want =
          dArm[i] >= 0
            ? Math.max(dArm[i] + 0.5 * fillHalf, 1.5 * fillHalf)
            : Math.max(1.25 * fillHalf, dMax + fillHalf);
        const R = Math.min(want, coverCap(X));
        if (!(R > 0)) continue;
        const samples = this.chainSamples[X.chain];
        const fill = this.fills[X.chain];
        if (!samples || !fill || fill.sampleCount !== samples.count) continue;
        const cnt = samples.count;
        const sp = samples.totalLength / (X.closed ? cnt : cnt - 1);
        if (!(sp > 0)) continue;
        // The ribbon samples from the joint out to R (nearest first, at
        // most COVER_STRIP_PTS), emitted in INCREASING sample order so the
        // strip's triangles are the ribbon's own (same diagonals).
        let kLo: number;
        let kHi: number;
        if (X.dir > 0) {
          kLo = Math.floor(X.arc0 / sp);
          kHi = Math.min(Math.ceil((X.arc0 + R) / sp), kLo + COVER_STRIP_PTS - 1);
        } else {
          kHi = Math.ceil(X.arc0 / sp);
          kLo = Math.max(Math.floor((X.arc0 - R) / sp), kHi - COVER_STRIP_PTS + 1);
        }
        if (!X.closed) {
          kLo = Math.max(0, kLo);
          kHi = Math.min(cnt - 1, kHi);
        }
        if (kHi - kLo < 1) continue;
        const V = fill.vertices;
        const pts: number[] = [];
        for (let k = kLo; k <= kHi; k++) {
          const kk = X.closed ? ((k % cnt) + cnt) % cnt : k;
          for (let c = 0; c < 4; c += 2) {
            const vx = V[kk * 4 + c];
            const vy = V[kk * 4 + c + 1];
            pts.push(vx, vy);
            const r = Math.hypot(vx - rec.jx, vy - rec.jy);
            if (r > rec.rMax) rec.rMax = r;
          }
        }
        fm = jointTop && !X.dives ? fmTop : fmBottom;
        fm.pushStrip(pts, rec.rb);
      }
      fm = fmBottom;
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
