// Renders the knot as smooth ribbons. Base layer: every strand's fill ribbon.
// At each crossing, two patches recompute every frame:
//   1. An "under erase" patch: an alpha-PUNCH ribbon (pixi 'erase' blend,
//      destination-out - the canvas is transparent and the page CSS behind
//      it supplies the backdrop, so gaps CLIP the thread layer instead of
//      painting a background color and survive any future textured
//      backdrop) that follows the UNDER thread through the crossing,
//      slightly wider than the thread, so its footprint never exceeds the
//      under thread's own and it cannot notch anything else. Its end caps
//      are the visible cut ends of the under thread. Each cap corner is
//      found by marching along its under-ribbon edge until "perpendicular
//      distance to the over CENTERLINE CURVE equals overHalfWidth" (the
//      over ribbon's SILHOUETTE) flips, against a locally sampled polyline
//      of the over centerline - then the cap is pushed outward by `gap` as
//      ARC LENGTH along the under thread. The margin must be constant
//      ALONG the thread, not perpendicular to the over thread: a
//      perpendicular margin projects as gap/sin(angle) of bare background
//      at oblique crossings, which reads as a giant naked gap at loop-end
//      twists (spans up to 1.07 at 30-degree crossings measured, vs gap
//      0.06). A nonzero fadeLength softens the caps: the erase's strength
//      fades out over that arc length past each solved cap (see the FADE
//      texture), so the under thread dissolves into the backdrop instead
//      of ending at a hard edge.
//   2. The OVER pass fill, redrawn on top so the over thread rides above
//      the hole, with a length that adapts to the crossing angle.
// All erases render below all fills, so patches never slice each other.

import { BufferImageSource, Container, Graphics, Texture } from "pixi.js";
import { createNoise2D, createNoise3D } from "simplex-noise";
import type { ParticleSystem, CrossingPass } from "../physics/particle_system";
import type { VSegment, ColorScheme } from "../core/section_colors";
import type { AppearFxMode } from "../core/reveal_plan";
import type { RevealAnimator } from "./reveal";
import { AppearFxSystem } from "./appear_fx";
import { SeededRNG } from "../util/random";
import type { SplineSamples } from "../geometry/spline_generator";
import {
  sampleClosedSpline,
  sampleOpenSpline,
} from "../geometry/spline_generator";
import { RibbonMesh, PatchGridMesh, TriFanMesh } from "./ribbon_mesh";

export interface RibbonStyle {
  threadWidth: number; // In lattice units.
  casingWidth: number; // Thread width + twice the crossing gap.
  baseHue: number; // [0, 360) starting hue for the strand palette.
  // Optional strand -> palette-slot mapping (maze fabric: bridges/stubs and
  // cut halves inherit their host strand's hue so splices read as thread
  // material). Identity when absent.
  hueGroup?: number[];
  // PALETTE MODE (maze fabric): each chain's fill samples a 256x1 palette
  // texture through per-vertex UVs instead of a flat tint, so gameplay
  // recoloring (traveled gold, choice pulses, hover) paints the ACTUAL
  // thread pixels - over-fill patches copy the UVs along with the vertices,
  // making the weave pixel-identical. Knot mode leaves this off and keeps
  // the original tint path untouched.
  paletteMode?: boolean;
  // Seed for the flow-undulation noise field (defaults to 1).
  flowSeed?: number;
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

// Palette layout (one 256x1 RGBA strip per hue group; linear filtering).
// ORDER IS LOAD-BEARING: per-vertex UVs interpolate LINEARLY between
// samples, so the strip must be arranged so that every adjacency the paint
// can produce (base<->bandA at pulse-region ends, base<->gold at traveled
// ends, gold<->bandB on the arrival arm) interpolates only through its own
// two color families - the original [base, gold, hover, bandA...] layout
// swept the UV straight across the gold+hover texels at every band/base
// boundary, rendering a thin bright hairline there (the reported "distinct
// line at the end of the gradient"):
//   0..111   band A, REVERSED: near-white accent -> base
//   112..117 base thread color
//   118..123 traveled gold
//   124..235 band B: gold -> near-white accent
//   236..255 band B accent (guard)
//
// SECOND DIMENSION (V): the palette is PAL_H rows, each the same strip
// built from a different base color along a bounded GAMUT ramp. Per-vertex
// V selects the section color; bilinear filtering blends adjacent-sample
// Vs through intermediate gamut colors - smooth section transitions along
// threads and through junctions for free, always inside the gamut.
// Gameplay paint (U) rides on top unchanged: the gold/band-B half of every
// row is identical, so the traveled path stays uniform gold.
const PAL_W = 256;
const PAL_H = 64;
const U_BASE = 115 / PAL_W;
const U_GOLD = 121 / PAL_W;
// The gamut: a 280-degree hue arc around the seed hue at the fabric's
// saturation/lightness - wide enough to read as distinct sections, no
// full wrap so V-interpolation never has a long-way-around ambiguity.
const GAMUT_SWEEP = 280;
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
// bands are the same near-white accent - see buildPalettePixels.
const PULSE_CORE_BOOST = 0.62;
const PULSE_CORE_RADIUS = 0.55;
// Crest amplitude ramps with its distance from the junction: an outbound
// crest swells OUT of the core glow instead of being born full-strength
// (the reported abrupt onset), and symmetrically the inbound crest
// submerges into it.
const CREST_RAMP = 0.5;
const PULSE_END_WINDOW = 0.45;
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
const FILLET_EDGE_PTS = 5; // Samples per curve-hugging wedge flank.
const DISC_SEGS = 16; // Rim segments on tip/junction seal discs.

// Wrap (closed) or clamp (open) a world arc into a chain's [0, total].
function normArc(a: number, total: number, closed: boolean): number {
  if (total <= 0) return 0;
  if (closed) return ((a % total) + total) % total;
  return Math.max(0, Math.min(total, a));
}

// FLOW UNDULATION (render-side ONLY). A seeded, slowly drifting simplex
// field displaces each chain's spline CONTROL points right after they are
// copied from the particle positions, so the fabric sways as if in water.
// Everything downstream of chainControls (splines, erase/fill marches,
// tuck, over-fill windows) reads chainSamples and therefore rides the same
// field coherently; the few consumers that read raw physics positions
// (junction fillet centroids here, markers/hit-tests in the fabric
// overlay) add flowOffset() explicitly. The PHYSICS state is never
// touched: the sim's sleep gate stays sacred - main.ts keeps calling
// update() while asleep/paused only when flowStrength > 0, and at 0 the
// displacement pass is skipped entirely (byte-identical rest behavior).
const FLOW_FREQ = 0.22; // Spatial noise frequency (1 / lattice units).
const FLOW_TIME_SCALE = 0.35; // Noise-time seconds per flow-clock second.
const FLOW_AMP = 0.38; // Displacement in world units at flowStrength 1.

// REVEAL (Stage 22 appearance animation). The mask is a per-chain
// per-sample width multiplier in [0, 1]: unrevealed samples collapse to
// zero width, the frontier gets a short 0 -> 1 taper so tips read rounded,
// and a glow rides just behind each advancing tip. Interval modes
// (trace/bloom/draw) taper over arc; ink tapers over world distance (its
// dye edge is wider and softer).
const REVEAL_TAPER_ARC = 0.3;
const INK_TAPER_WORLD = 0.6;
// A crossing renders its erase + over fill only once BOTH passes are at
// full width locally: an erase for a not-yet-visible thread would punch a
// naked hole in whatever is revealed beneath it.
const REVEAL_CROSSING_MIN = 0.98;
// Frontier glow reach (arc) along the revealed side of a tip, and the
// palette-U family split (>= gold band start -> brighten via band B,
// else via band A; both bands end at the same near-white accent).
const REVEAL_GLOW_ARC = 1.15;
const GOLD_FAMILY_MIN = 118 / PAL_W;

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

// Palette textures are cached for the PAGE lifetime, keyed by base color.
// Rebuilds (checkbox toggles regenerate the whole scene) reuse them, and -
// load-bearing - nothing ever destroys one mid-session: pixi's retained
// render state (bind groups listen to their texture resources) can still
// reference a source on the frame after a rebuild, and destroying it then
// null-derefs inside setResource on every subsequent render - the ticker
// dies and the screen goes blank. Growth is bounded by distinct thread
// colors seen (a reseed adds at most one strand-palette's worth of 1KB
// strips).
const PALETTE_CACHE = new Map<number, { tex: Texture; px: Uint8Array }>();

function gamutHex(baseHue: number, v: number): number {
  const h = (((baseHue + (v - 0.5) * GAMUT_SWEEP) % 360) + 360) % 360;
  return hslToHex(h, 0.45, 0.64);
}

// The full 2D palette for one seed hue: PAL_H gamut rows of the standard
// paint strip. Cached for the page lifetime keyed by (rounded) base hue.
function paletteFor(baseHue: number): { tex: Texture; px: Uint8Array } {
  const key = Math.round(baseHue);
  let entry = PALETTE_CACHE.get(key);
  if (!entry) {
    const px = new Uint8Array(PAL_W * PAL_H * 4);
    for (let r = 0; r < PAL_H; r++) {
      const row = buildPalettePixels(gamutHex(baseHue, r / (PAL_H - 1)));
      px.set(row, r * PAL_W * 4);
    }
    entry = {
      px,
      tex: new Texture({
        source: new BufferImageSource({
          resource: px,
          width: PAL_W,
          height: PAL_H,
        }),
      }),
    };
    PALETTE_CACHE.set(key, entry);
  }
  return entry;
}

function buildPalettePixels(base: number): Uint8Array {
  const px = new Uint8Array(PAL_W * 4);
  const put = (i: number, hex: number): void => {
    px[i * 4] = (hex >> 16) & 255;
    px[i * 4 + 1] = (hex >> 8) & 255;
    px[i * 4 + 2] = hex & 255;
    px[i * 4 + 3] = 255;
  };
  // Both bands converge to the SAME near-white accent (0.94 toward white)
  // so that at full strength - the junction core - the inbound gold band,
  // the outbound base bands, and every flat-colored overlay (discs,
  // fillets) meet in one color; family tints only separate mid-arm.
  for (let i = 0; i < 112; i++) {
    put(i, mixHex(base, 0xffffff, 0.94 * (1 - i / 111)));
  }
  for (let i = 112; i < 118; i++) put(i, base);
  for (let i = 118; i < 124; i++) put(i, PATH_GOLD);
  for (let i = 124; i < 236; i++) {
    put(i, mixHex(PATH_GOLD, 0xffffff, (0.94 * (i - 124)) / 111));
  }
  for (let i = 236; i < 256; i++) put(i, mixHex(PATH_GOLD, 0xffffff, 0.94));
  return px;
}

// FADE texture: one shared 256x1 strip of erase STRENGTH, sampled by every
// erase patch through per-vertex U. Column u carries alpha 1 at u <= 0 (the
// solved cut interval - full punch, the sharp look) smoothstepped to 0 at
// u = 1 (the far end of a fade tail - no punch), so under the 'erase'
// blend the under thread dissolves gradually into the backdrop. Stored
// premultiplied (r = g = b = a): WebGL2 ignores
// UNPACK_PREMULTIPLY_ALPHA_WEBGL for ArrayBufferView uploads, so the
// buffer itself must match the alphaMode declaration - and under the
// erase blendFunc (ZERO, ONE_MINUS_SRC_ALPHA) only src alpha matters
// anyway. Cached for the page lifetime and NEVER destroyed, for exactly
// the PALETTE_CACHE reason above. At fadeLength 0 every vertex samples
// u = 0 -> strength 1: bit-identical to the old full-strength erase.
const FADE_W = 256;
let FADE_TEXTURE: Texture | null = null;
function fadeTexture(): Texture {
  if (!FADE_TEXTURE) {
    const px = new Uint8Array(FADE_W * 4);
    for (let i = 0; i < FADE_W; i++) {
      const u = i / (FADE_W - 1);
      const v = Math.round(255 * (1 - u * u * (3 - 2 * u)));
      px[i * 4] = v;
      px[i * 4 + 1] = v;
      px[i * 4 + 2] = v;
      px[i * 4 + 3] = v;
    }
    FADE_TEXTURE = new Texture({
      source: new BufferImageSource({
        resource: px,
        width: FADE_W,
        height: 1,
        alphaMode: "premultiplied-alpha",
      }),
    });
  }
  return FADE_TEXTURE;
}

// Dense enough that tight bends near crossings (low slack) stay resolved;
// patch outlines interpolate this same data, keeping them aligned with the
// base ribbons.
const SAMPLE_SPACING = 0.09;
const MIN_SAMPLES = 48;
// The over-fill patch copies base-ribbon vertices verbatim, so its capacity
// just needs to cover the longest window (in samples) a crossing can need.
// Sized for the widest thread: over windows scale with fillHalf.
const OVER_PATCH_MAX_SAMPLES = 128;
// The over-fill window clamps to a fraction of the arc distance to the
// nearest crossing pass along the same thread. The erase march gets a larger
// budget: truncating a lane's boundary solve leaves that cap corner short
// (visibly closer to the over thread), and any overreach toward the
// neighboring crossing is repainted by its vertex-exact over-fill - the two
// fractions summing past 1.0 guarantees the windows overlap.
const NEIGHBOR_CLEARANCE = 0.5;
const ERASE_NEIGHBOR_CLEARANCE = 0.8;
const OVER_HALF_LENGTH_MIN = 0.35;
const OVER_PATCH_MARGIN = 0.12;
// Slight overhang so the erase fully covers the under ribbon's antialiased
// edges.
const ERASE_WIDTH_PAD = 0.02;
// Boundary-march parameters: each thread's centerline is sampled as a local
// polyline around the crossing, and marches measure distances against it.
// The erase marches several lanes across the under ribbon outward until
// each exits the cut region (multiple lanes let cap edges curve with the
// over thread); the over-fill window marches along the over thread until
// it is provably beyond the erase's reach - direct measurement, robust to
// kinked centerlines and any crossing angle.
const LOCAL_SAMPLES = 48;
const MARCH_STEP = 0.07;
// Reach limits SCALE WITH THREAD WIDTH (fillHalf): they were absolute
// constants calibrated at width 0.42, and at wider threads a shallow
// crossing's overlap extends past them - the erase cap then sits INSIDE
// the overlap and everything beyond renders as an uncut merge (reported
// as "heavy penetration" at tw 0.52; the physics state was clean).
const CUT_REACH_PER_HALF = 6.5; // * fillHalf, floored at the 0.42 values.
const OVER_REACH_PER_HALF = 5.8;
const CUT_REACH_MIN = 1.35;
const OVER_REACH_MIN = 1.2;
// Long-overlap cap: a cinched twist (grab a thread just past the twist,
// pull perpendicular - the user's gesture) leaves the two threads
// genuinely STACKED for several units, which physics must not undo (that
// is what a tightened twist is) and the erase must therefore cover. The
// marches already stop where overlap truly ends; the old width-scaled
// caps (~1.7) truncated them mid-ride, and the truncation boundary
// rendered as the jagged lengthwise seam reported four times. All other
// limits (neighbor clearance, self-split, total/4) still apply.
const RIDE_REACH_CAP = 4.5;
const LOCAL_REACH_PAD = 0.8; // Local polylines must out-reach the marches.
// Matches the base ribbon's sample spacing so the erase's miter factor
// tracks the base extrusion's at kinks.
const MITER_PROBE = 0.09;
const ERASE_STATIONS = 16;
// Stations (quads) pinned to EACH fade tail when fadeLength > 0; the
// remaining ERASE_STATIONS - 1 - 2*tail quads span the opaque cut. Keeps
// the roll-off resolved regardless of how long the solved cut is.
const FADE_TAIL_STATIONS = 3;
// 13 lanes (was 5): cap rows are polylines approximating the over
// silhouette's level set, and at loop-end twists that boundary is
// genuinely CURVED (the over thread bends sharply at the crossing) - 5
// segments rendered it as an angular wedge. Finer lanes also shrink the
// D2 clamp's per-point spacing, so genuine curvature passes through it.
const ERASE_LANES = 13;
// Patch pool for emergent (tunneled) crossings discovered by the physics.
// Sized for taut knots: at slack ~0 dozens of real emergent crossings can
// coexist, and a starved pool renders some overlaps gap-less.
const EMERGENT_POOL = 64;
// Cut arcs extend outward by this much: widens the gap imperceptibly while
// swallowing base-ribbon slivers that poke past the cap at tight bends.
const CUT_BIAS = 0.03;
// Adjacent-lane arc-step limits for the erase grid. A grid quad's edges
// are straight, so when neighboring lanes sit at different arcs the edge
// chords across the under thread's bend (wander ~ (dS^2/8) * curvature).
// On STRAIGHT spans long lane diagonals are safe and load-bearing
// (cinched-twist rides, P3.36 - one lane legitimately stays inside the
// overlap for units after its neighbor exits, and the chords hug a
// straight thread), so the allowed step scales with the local
// straightness between the two arcs; over a bend it pins to the base
// step - unbounded steps sheared quads across whole hairpin bulbs and
// slashed background slits into them (the loop-end gap-shape artifact;
// one erase measured covering its entire bulb interior). Enforced by
// TRUNCATION of the longer lane only: raising the shorter lane erases
// material its march never certified (the old symmetric median clamp's
// bite), while truncated overlap is repainted by the over fill, which
// rides the same overlap.
const LANE_STEP_MIN = 0.12;
const LANE_STEP_RIDE = 1.0;
// Corner rounding for cap polylines: a kinked over centerline makes the
// distance level set genuinely angular; clamping each interior cap point's
// second difference rounds corners while leaving gentle bows untouched.
// At 13-lane spacing a silhouette curvature up to ~8/unit stays under this
// bound, so only true spikes are rounded. There is deliberately NO clamp
// toward the cap CHORD: the boundary at a sharply-bent over thread is
// genuinely curved, and flattening it rendered the loop-end twist gaps as
// angular wedge-slashes (the P3.40 artifact class).
const CAP_D2_MAX = 0.03;

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
  private underErases: PatchGridMesh[] = [];
  private overFills: RibbonMesh[] = [];
  private emergentErases: PatchGridMesh[] = [];
  private emergentFills: RibbonMesh[] = [];
  private chainControls: Float32Array[] = [];
  private chainSamples: (SplineSamples | null)[] = [];
  private sampleScratch = new Float32Array(4);
  private overLocal = new Float32Array(LOCAL_SAMPLES * 2);
  private underLocal = new Float32Array(LOCAL_SAMPLES * 2);
  private laneCutsPos = new Float32Array(ERASE_LANES);
  private laneCutsNeg = new Float32Array(ERASE_LANES);
  private lanePrevG = new Float32Array(ERASE_LANES);
  private laneStepScratch = new Float32Array(ERASE_LANES);
  private capScratch = new Float32Array(ERASE_LANES * 4); // [x, y, tx, ty]
  // Per crossing: neighbor crossing passes along the over and under threads.
  private overNeighbors: PassNeighbors[] = [];
  private underNeighbors: PassNeighbors[] = [];
  // Pass -> owning crossing index + whether it is the UNDER pass; and each
  // crossing's measured erase extents along its under thread (max |cut|
  // across lanes, per arc direction). The fill NEIGHBOR-GAP RESERVE quotes
  // these: a fill marching toward a pass where its thread goes UNDER must
  // not repaint that crossing's erased under-gap. Extents are fresh for
  // lower-indexed neighbors and one frame stale for higher - fine at any
  // realistic frame rate.
  private passInfo = new Map<
    CrossingPass,
    { index: number; isUnder: boolean }
  >();
  private eraseExtentPos = new Float32Array(0);
  private eraseExtentNeg = new Float32Array(0);
  // Per-chain UNDER-GAP windows, rebuilt every update() from the live
  // crossing solve (emergent crossings included): flat triplets
  // [centerArc, extNeg, extPos] along the UNDER chain. Overlay consumers
  // (the Ariadne yarn) use these to dip under with their host thread -
  // see underGapVisibility().
  private underWindows = new Map<number, number[]>();
  // Palette-mode paint state (see PaintSpan/PulseArm). The paint pass is
  // deliberately decoupled from update(): it rewrites only UV buffers, so
  // the pulse animation can run while the physics sleeps.
  private paintSpans: PaintSpan[] = [];
  private paintPulses: PulseArm[] = [];
  private paintCaps: PaintCap[] = [];
  private paintRev = 0;
  private chainRev = new Map<number, number>();
  private uScratch = new Map<number, Float32Array>();
  private paintClock = 0;
  // Cached over-fill windows (per crossing / per emergent pool slot) so the
  // paint pass can re-copy recolored UVs into patches without re-running
  // the full crossing solve.
  private overWindows = new Int32Array(0);
  private overChainCrossings = new Map<number, number[]>();
  private emergentWindows: Array<{
    chain: number;
    start: number;
    span: number;
  } | null> = [];
  private lastWindowStart = 0;
  private lastWindowSpan = 0;
  // Junction joinery: arms per fused junction (built once), per-chain
  // fused-terminal flags for the tuck, and palette pixel rows for CPU-side
  // fillet coloring.
  // Live junction-rounding radius multiplier (the cuspRadius slider;
  // main.ts keeps it synced every tick).
  cuspRadius = 1;
  // Live under-gap fade length (the fadeLength slider; main.ts keeps it
  // synced every tick): arc length past each solved cut cap over which the
  // erase strength fades to nothing. 0 = sharp caps, exactly the original
  // render.
  fadeLength = 0;
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
  // Shared 2D palette pixels (CPU-side fillet/disc sampling) + the section
  // color field: piecewise-linear v(ctrl) per chain from section_colors
  // (or spatial noise), baked to a per-SAMPLE V cache on the first update.
  private paletteTex: Texture | null = null;
  private filletLayer: Container | null = null;
  private filletMesh: TriFanMesh | null = null;
  private sectionSegs: VSegment[][] = [];
  private sectionNoise: ((x: number, y: number) => number) | null = null;
  private vCache: (Float32Array | number)[] = [];
  private vCacheReady = false;
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
  private revealTips: Array<{ chain: number; ctrl: number }> = [];
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

  constructor(ps: ParticleSystem, style: RibbonStyle) {
    this.ps = ps;
    this.style = style;
    this.root = new Container();

    const flowRng = new SeededRNG(((style.flowSeed ?? 1) ^ 0xf10a) >>> 0);
    this.flowNoise = createNoise3D(() => flowRng.next());

    const baseLayer = new Container();
    const filletLayer = new Container();
    const eraseLayer = new Container();
    const overLayer = new Container();
    this.root.addChild(baseLayer, filletLayer, eraseLayer, overLayer);
    if (style.paletteMode) {
      this.filletLayer = filletLayer;
    }

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

      const slot = style.hueGroup?.[i] ?? i;
      const hue = (style.baseHue + slot * 137.508) % 360;
      // An already-carved chain (maze mode) renders as an OPEN ribbon: no
      // closing quad across the removed seam.
      const closed = ps.chainBreakAfter[i] < 0;
      const base = hslToHex(hue, 0.45, 0.64);
      const fill = new RibbonMesh(count, closed, base);
      if (style.paletteMode) {
        const pal = paletteFor(style.baseHue);
        this.paletteTex = pal.tex;
        fill.mesh.texture = pal.tex;
        fill.mesh.tint = 0xffffff;
        fill.writeUVs(new Float32Array(count).fill(U_BASE), 0.5);
      }
      this.fills.push(fill);
      baseLayer.addChild(fill.mesh);
    });
    this.vCache = ps.chains.map(() => 0.5);
    this.sectionSegs = ps.chains.map(() => []);
    this.revealMask = ps.chains.map(() => null);

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
      const occ = this.overChainCrossings.get(crossing.over.chain);
      if (occ) occ.push(crossingIndex - 1);
      else this.overChainCrossings.set(crossing.over.chain, [crossingIndex - 1]);

      // Erase patches PUNCH the thread layer (destination-out through the
      // shared fade-strength texture; the transparent canvas lets the page
      // backdrop show through) instead of painting a background color -
      // same visuals over today's flat CSS color, textured-backdrop-ready.
      const erase = new PatchGridMesh(ERASE_STATIONS, ERASE_LANES, 0xffffff);
      erase.mesh.texture = fadeTexture();
      erase.mesh.blendMode = "erase";
      const fill = new RibbonMesh(OVER_PATCH_MAX_SAMPLES, false, 0xffffff);
      this.underErases.push(erase);
      this.overFills.push(fill);
      eraseLayer.addChild(erase.mesh);
      overLayer.addChild(fill.mesh);
    }

    for (let k = 0; k < EMERGENT_POOL; k++) {
      const erase = new PatchGridMesh(ERASE_STATIONS, ERASE_LANES, 0xffffff);
      erase.mesh.texture = fadeTexture();
      erase.mesh.blendMode = "erase";
      const fill = new RibbonMesh(OVER_PATCH_MAX_SAMPLES, false, 0xffffff);
      erase.mesh.visible = false;
      fill.mesh.visible = false;
      this.emergentErases.push(erase);
      this.emergentFills.push(fill);
      eraseLayer.addChild(erase.mesh);
      overLayer.addChild(fill.mesh);
    }

    this.eraseExtentPos = new Float32Array(ps.crossings.length);
    this.eraseExtentNeg = new Float32Array(ps.crossings.length);
    this.overWindows = new Int32Array(ps.crossings.length * 2);
    this.emergentWindows = new Array(EMERGENT_POOL).fill(null);

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
        }
      }
    }
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

  // Distance from a point to a locally sampled centerline polyline. The
  // polylines are dense (~0.15 spacing), so nearest-vertex distance is
  // within ~0.007 of the true curve distance at the ranges we care about.
  private distToLocal(poly: Float32Array, x: number, y: number): number {
    let best = Infinity;
    for (let m = 0; m < LOCAL_SAMPLES; m++) {
      const dx = poly[m * 2] - x;
      const dy = poly[m * 2 + 1] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }

  // guardCenter/guardHalf mask an arc neighborhood out of the polyline
  // (sentinel far away): for SELF-crossings the "other thread" is the same
  // chain, and without the mask the under region measures distance to
  // itself (always ~0), blowing the boundary marches out to their clamps.
  private buildLocal(
    poly: Float32Array,
    samples: SplineSamples,
    center: number,
    reachNeg: number,
    reachPos: number,
    guardCenter = Number.NaN,
    guardHalf = 0
  ): void {
    const total = samples.totalLength;
    const span = reachNeg + reachPos;
    for (let m = 0; m < LOCAL_SAMPLES; m++) {
      const arc = center - reachNeg + (span * m) / (LOCAL_SAMPLES - 1);
      if (!Number.isNaN(guardCenter)) {
        let d = Math.abs(arc - guardCenter) % total;
        d = Math.min(d, total - d);
        if (d < guardHalf) {
          poly[m * 2] = 1e9;
          poly[m * 2 + 1] = 1e9;
          continue;
        }
      }
      this.sampleAt(samples, arc, this.sampleScratch, 0);
      poly[m * 2] = this.sampleScratch[0];
      poly[m * 2 + 1] = this.sampleScratch[1];
    }
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
  // [worldX, worldY, eraseSpanMean, overSpan, selfPassDist(-1 if not self)]
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

  // --- REVEAL (Stage 22 appearance animation) ---

  // Attach a running appearance animator; masks start collapsed and grow
  // as the animator's clock advances. Passing null (or the animator
  // finishing) restores the exact non-reveal render.
  beginReveal(anim: RevealAnimator | null): void {
    this.revealAnim = anim;
    this.revealMask = this.ps.chains.map(() => null);
    this.revealTips = [];
    // Fresh reveal, fresh particle field: a Replay-settle resets particle
    // positions, and motes from the previous run would float over the
    // re-angular knot.
    this.appearFxSys?.clear();
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

  private crossingRevealed(crossing: {
    over: CrossingPass;
    under: CrossingPass;
  }): boolean {
    return (
      this.revealMulAtCtrl(
        crossing.over.chain,
        this.renderCtrl(crossing.over)
      ) >= REVEAL_CROSSING_MIN &&
      this.revealMulAtCtrl(
        crossing.under.chain,
        this.renderCtrl(crossing.under)
      ) >= REVEAL_CROSSING_MIN
    );
  }

  // Compute (or clear) one chain's reveal mask for this frame. Returns
  // null when the chain is fully revealed - the fills then take their
  // untouched fast path, so the finished state is bit-identical to a
  // non-reveal render.
  private revealMaskFor(
    chain: number,
    samples: SplineSamples
  ): Float32Array | null {
    const anim = this.revealAnim!;
    const count = samples.count;
    let mask = this.revealMaskPool.get(chain);
    if (!mask || mask.length !== count) {
      mask = new Float32Array(count);
      this.revealMaskPool.set(chain, mask);
    }
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const total = samples.totalLength;

    if (anim.mode === "ink") {
      if (anim.inkChainLatched(chain)) {
        this.revealMask[chain] = null;
        return null;
      }
      // Dye front: world distance from the (live, flow-displaced) origin
      // vs the expanding radius, edge wobbled by seeded simplex noise.
      const o = anim.inkOrigin;
      const len = this.ps.chains[o.chain].length;
      this.ps.pointOnChain(
        o.chain,
        ((o.ctrl % len) + len) % len,
        this.sampleScratch,
        0
      );
      this.flowOffset(
        this.sampleScratch[0],
        this.sampleScratch[1],
        this.flowScratch
      );
      const ox = this.sampleScratch[0] + this.flowScratch[0];
      const oy = this.sampleScratch[1] + this.flowScratch[1];
      const R = anim.inkRadius;
      let minM = 1;
      for (let k = 0; k < count; k++) {
        const x = samples.positions[k * 2];
        const y = samples.positions[k * 2 + 1];
        const d = Math.hypot(x - ox, y - oy) + anim.inkPerturb(x, y);
        const m = Math.max(0, Math.min(1, (R - d) / INK_TAPER_WORLD));
        mask[k] = m;
        if (m < minM) minM = m;
      }
      if (minM >= 1) {
        anim.latchInkChain(chain);
        this.revealMask[chain] = null;
        return null;
      }
      this.revealMask[chain] = mask;
      return mask;
    }

    // Interval modes: union of the plan's revealed ctrl intervals,
    // converted to arc per frame (paintArcAt clamps open-chain terminals -
    // the arc-wrap family bites here otherwise).
    mask.fill(0);
    const intervals = anim.intervalsFor(chain);
    let minM = 1;
    for (const iv of intervals) {
      const A0 = this.paintArcAt(samples, iv.c0, closed);
      const A1 = this.paintArcAt(samples, iv.c1, closed);
      const wraps = closed && A1 <= A0 && iv.c1 > iv.c0 + 1e-9;
      for (let k = 0; k < count; k++) {
        const a = closed ? (k / count) * total : (k / (count - 1)) * total;
        let dIn0: number;
        let dIn1: number;
        if (wraps) {
          if (a < A0 && a > A1) continue;
          dIn0 = a >= A0 ? a - A0 : a + total - A0;
          dIn1 = a <= A1 ? A1 - a : A1 + total - a;
        } else {
          if (a < A0 || a > A1) continue;
          dIn0 = a - A0;
          dIn1 = A1 - a;
        }
        let m = 1;
        if (iv.soft0) m = Math.min(m, dIn0 / REVEAL_TAPER_ARC);
        if (iv.soft1) m = Math.min(m, dIn1 / REVEAL_TAPER_ARC);
        if (m > mask[k]) mask[k] = m;
      }
    }
    for (let k = 0; k < count; k++) {
      if (mask[k] < minM) minM = mask[k];
    }
    if (minM >= 1) {
      this.revealMask[chain] = null;
      return null;
    }
    this.revealMask[chain] = mask;
    return mask;
  }

  // One-shot restore when the animator completes (or is detached): every
  // crossing patch visible again, masks dropped, tip glow cleared. The
  // next paint tick clears any frontier glow (its chain set goes empty).
  private finishReveal(): void {
    this.revealAnim = null;
    this.revealMask = this.ps.chains.map(() => null);
    this.revealTips = [];
    for (let c = 0; c < this.underErases.length; c++) {
      this.underErases[c].mesh.visible = true;
      this.overFills[c].mesh.visible = true;
    }
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
      this.sampleAt(samples, arc, this.sampleScratch, 0);
      const perCtrl =
        samples.totalLength / Math.max(1, this.ps.chains[tip.chain].length);
      fx.spawnFrontier(
        this.sampleScratch[0],
        this.sampleScratch[1],
        this.sampleScratch[2] * tip.dir,
        this.sampleScratch[3] * tip.dir,
        tip.rate * anim.speed * perCtrl,
        dt
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
      if (this.style.paletteMode && !this.vCacheReady) {
        this.buildVCacheFor(i, samples);
      }
      const mask = this.revealOn ? this.revealMaskFor(i, samples) : null;
      this.fills[i].update(
        samples.positions,
        samples.tangents,
        this.style.threadWidth / 2,
        0,
        mask
      );
    });
    if (this.style.paletteMode && !this.vCacheReady) {
      this.vCacheReady = true;
      // One full UV write so every chain wears its section colors; chains
      // with gameplay paint get rewritten by the next paint tick.
      this.ps.chains.forEach((_, i) => {
        const count = this.fills[i].sampleCount;
        let us = this.uScratch.get(i);
        if (!us || us.length < count) {
          us = new Float32Array(count);
          this.uScratch.set(i, us);
        }
        us.fill(U_BASE, 0, count);
        this.fills[i].writeUVs(us, this.vCache[i]);
      });
      this.chainRev.clear();
    }

    const fillHalf = this.style.threadWidth / 2;
    const gap = (this.style.casingWidth - this.style.threadWidth) / 2;

    this.ps.crossings.forEach((crossing, c) => {
      // REVEAL: a crossing's erase + over fill stay hidden until BOTH its
      // threads are revealed at the crossing - an erase for an invisible
      // over thread would punch a naked hole in a revealed under thread.
      if (this.revealOn) {
        const on = this.crossingRevealed(crossing);
        this.underErases[c].mesh.visible = on;
        this.overFills[c].mesh.visible = on;
        if (!on) {
          this.eraseExtentPos[c] = 0;
          this.eraseExtentNeg[c] = 0;
          this.overWindows[c * 2 + 1] = 0;
          return;
        }
      }
      this.renderCrossing(
        crossing,
        c,
        this.underErases[c],
        this.overFills[c],
        this.overNeighbors[c],
        this.underNeighbors[c],
        fillHalf,
        gap
      );
    });
    this.renderEmergent(fillHalf, gap);
    this.drawRevealTips();
  }

  // Render one crossing's erase + over-fill patches. index < 0 marks an
  // emergent (unregistered) crossing: no neighbor lists, no diagnostics.
  private renderCrossing(
    crossing: { over: CrossingPass; under: CrossingPass; sign?: number },
    index: number,
    eraseMesh: PatchGridMesh,
    fillMesh: RibbonMesh,
    overNbIn: PassNeighbors | null,
    underNbIn: PassNeighbors | null,
    fillHalf: number,
    gap: number
  ): void {
    const c = index;
    const overNb = overNbIn ?? { prev: crossing.over, next: crossing.over };
    const underNb =
      underNbIn ?? { prev: crossing.under, next: crossing.under };
    {
      const overSamples = this.chainSamples[crossing.over.chain]!;
      const underSamples = this.chainSamples[crossing.under.chain]!;
      const overCenter = this.arcAt(overSamples, this.renderCtrl(crossing.over));
      const underCenter = this.arcAt(
        underSamples,
        this.renderCtrl(crossing.under)
      );

      // Local centerline polylines around the crossing. The cut boundary is
      // "distance to the over polyline == fillHalf" (the over ribbon's
      // silhouette), with the visible margin added afterward as ARC LENGTH
      // (see the header comment); the over-fill window is measured against
      // the under polyline. For SELF-crossings each polyline masks out the
      // other pass's neighborhood, and the arc between the passes is split
      // between the over window and the erase zone so the fill can never
      // repaint the gap.
      const selfCross = crossing.over.chain === crossing.under.chain;
      const total = overSamples.totalLength;
      let splitPos = Infinity;
      let splitNeg = Infinity;
      let maskHalf = 0.5;
      if (selfCross) {
        const dPos = (((underCenter - overCenter) % total) + total) % total;
        const dNeg = total - dPos;
        splitPos = Math.max(0.12, dPos / 2 - 0.08);
        splitNeg = Math.max(0.12, dNeg / 2 - 0.08);
        // The mask must never swallow the crossing's own neighborhood: at
        // tight tips the pass separation bounds it.
        maskHalf = Math.max(
          0.1,
          Math.min(0.5, Math.min(dPos, dNeg) / 2 - 0.05)
        );
      }
      const cutReachMax = Math.max(
        CUT_REACH_MIN,
        fillHalf * CUT_REACH_PER_HALF,
        RIDE_REACH_CAP
      );
      const overReachMax = Math.max(
        OVER_REACH_MIN,
        fillHalf * OVER_REACH_PER_HALF,
        RIDE_REACH_CAP
      );
      const [oGapPrev, oGapNext] = this.neighborGaps(
        overSamples,
        crossing.over,
        overNb
      );

      // The over-fill window's reach bound per direction, shared between
      // the fill march (reachAlongOver) and the erase's over polyline so
      // the two CANNOT drift: the erase certifies cut region by distance
      // to the over centerline, and any cut justified by over arcs the
      // fill will never repaint renders as a naked background bite (at
      // hairpin bulbs and loop-end twists the unrestricted polyline let
      // the erase ride the bulb's far wall while the split-capped fill
      // stopped at the neck).
      const fillBound = (dir: number): number => {
        const gapLimit = dir > 0 ? oGapNext : oGapPrev;
        // TWIST FLIP: a flattened twist (threads stacked between its two
        // crossings) drives both fills to their clearance caps, and their
        // two sample-quantized end caps abut mid-span as a ragged seam.
        // When the neighbor pass in this direction is the twist TWIN and
        // this crossing draws LATER (higher index - its fill wins
        // overlaps), extend the clearance by one gap so the flip renders
        // as this fill's single clean cap over the twin's fill. Inert
        // whenever the overlap ends naturally (open eye): the march
        // stops before any cap.
        const nbPass = dir > 0 ? overNb.next : overNb.prev;
        const twinBias = this.ps.twistFillBias(crossing.over, nbPass);
        const twinExtend = twinBias > 0 ? gap : 0;
        // NEIGHBOR-GAP RESERVE: by alternation, the neighbor pass is a
        // crossing where THIS thread goes under - that crossing's erase
        // cuts this thread's under-gap there, and because every fill
        // draws over every erase, a fill that reaches into the gap
        // repaints it (a compressed corridor renders as a blunt fill cap
        // welded to the neighbor's over thread - the pull-outward merge).
        // Cap the march at the neighbor's MEASURED erase footprint so the
        // fill stops where the neighbor's gap begins. Twist twins keep
        // the winner-extension treatment instead (the flip needs one
        // continuous cover); self-partners are owned by the split caps.
        let reserveCap = Infinity;
        if (twinBias === 0 && nbPass !== crossing.under) {
          const info = this.passInfo.get(nbPass);
          if (info && info.isUnder) {
            const reserve =
              dir > 0
                ? this.eraseExtentNeg[info.index]
                : this.eraseExtentPos[info.index];
            // STAGE 18 FADE: the neighbor's erase keeps dissolving for
            // fadeLength past its opaque extent toward us, and a fill
            // marching into that tail repaints it at full alpha - the
            // fade ends on a hard, march-quantized (so jittering) edge,
            // the "inconsistent gap fades" report. Reserve the tail too:
            // this thread goes UNDER there by alternation, so leaving it
            // faded is the correct render.
            reserveCap = Math.max(
              0.12,
              gapLimit - reserve - this.fadeLength
            );
          }
        }
        // Floor sits below the self-crossing split so tight tips can
        // clamp the window all the way down.
        return Math.max(
          0.12,
          Math.min(
            overReachMax,
            NEIGHBOR_CLEARANCE * gapLimit + twinExtend,
            reserveCap,
            dir > 0 ? splitPos : splitNeg,
            overSamples.totalLength / 4
          )
        );
      };
      // What the fill is GUARANTEED to repaint while overlap persists:
      // its march can only stop early where overlap truly ends (where
      // the erase has nothing to cut either).
      const overCoverPos = Math.min(
        Math.max(OVER_HALF_LENGTH_MIN, fillBound(1)),
        splitPos,
        overSamples.totalLength / 4
      );
      const overCoverNeg = Math.min(
        Math.max(OVER_HALF_LENGTH_MIN, fillBound(-1)),
        splitNeg,
        overSamples.totalLength / 4
      );
      this.buildLocal(
        this.overLocal,
        overSamples,
        overCenter,
        overCoverNeg,
        overCoverPos,
        selfCross ? underCenter : Number.NaN,
        maskHalf
      );
      this.buildLocal(
        this.underLocal,
        underSamples,
        underCenter,
        Math.min(overReachMax + LOCAL_REACH_PAD, underSamples.totalLength / 4),
        Math.min(overReachMax + LOCAL_REACH_PAD, underSamples.totalLength / 4),
        selfCross ? overCenter : Number.NaN,
        maskHalf
      );

      const cutBoundary = fillHalf;
      const eraseW = fillHalf + ERASE_WIDTH_PAD;
      const [uGapPrev, uGapNext] = this.neighborGaps(
        underSamples,
        crossing.under,
        underNb
      );

      // Lane offsets span the erase width: lane 0 = left edge (+eraseW),
      // last lane = right edge (-eraseW).
      const laneOffset = (l: number): number =>
        eraseW * (1 - (2 * l) / (ERASE_LANES - 1));

      // March all lanes away from the crossing until each exits the cut
      // region, refining every exit arc by linear interpolation. Writes
      // signed arcs (relative to underCenter, biased outward) into cuts.
      const march = (
        dir: number,
        gapLimit: number,
        cuts: Float32Array,
        selfLimit: number
      ): void => {
        const sMax = Math.max(
          0.15,
          Math.min(
            cutReachMax,
            ERASE_NEIGHBOR_CLEARANCE * gapLimit,
            selfLimit,
            underSamples.totalLength / 4
          )
        );

        let unfinished = 0;
        this.sampleAt(underSamples, underCenter, this.sampleScratch, 0);
        for (let l = 0; l < ERASE_LANES; l++) {
          const u = laneOffset(l);
          const g =
            this.distToLocal(this.overLocal, 
              this.sampleScratch[0] - this.sampleScratch[3] * u,
              this.sampleScratch[1] + this.sampleScratch[2] * u
            ) - cutBoundary;
          if (g >= 0) {
            cuts[l] = 0.01 * dir;
          } else {
            cuts[l] = Number.NaN;
            this.lanePrevG[l] = g;
            unfinished++;
          }
        }

        let prevS = 0;
        for (let s = MARCH_STEP; unfinished > 0; s += MARCH_STEP) {
          const clamped = Math.min(s, sMax);
          this.sampleAt(
            underSamples,
            underCenter + dir * clamped,
            this.sampleScratch,
            0
          );
          for (let l = 0; l < ERASE_LANES; l++) {
            if (!Number.isNaN(cuts[l])) continue;
            const u = laneOffset(l);
            const g =
              this.distToLocal(this.overLocal, 
                this.sampleScratch[0] - this.sampleScratch[3] * u,
                this.sampleScratch[1] + this.sampleScratch[2] * u
              ) - cutBoundary;
            if (g >= 0) {
              const prevG = this.lanePrevG[l];
              cuts[l] =
                dir * (prevS + (clamped - prevS) * (prevG / (prevG - g)));
              unfinished--;
            } else {
              this.lanePrevG[l] = g;
            }
          }
          if (clamped >= sMax) break;
          prevS = clamped;
        }

        for (let l = 0; l < ERASE_LANES; l++) {
          if (Number.isNaN(cuts[l])) cuts[l] = dir * sMax;
          // The visible margin, applied as arc length so it stays `gap`
          // wide along the under thread at every crossing angle.
          cuts[l] += dir * (CUT_BIAS + gap);
        }
      };

      // Forward along the under thread heads into the over->under span's
      // complement (splitNeg); backward heads into the splitPos span.
      march(1, uGapNext, this.laneCutsPos, splitNeg);
      march(-1, uGapPrev, this.laneCutsNeg, splitPos);

      // Shear guard (see LANE_STEP_MIN): bound each adjacent-lane arc
      // step by the thread's straightness between the two arcs, pulling
      // the LONGER lane back. One forward + one backward sweep converges
      // (the constraint graph is a path). Straightness checks the
      // endpoint AND mid-span tangents so S-curves and full wraps cannot
      // read as straight.
      const laneStep = (arcA: number, arcB: number): number => {
        this.sampleAt(underSamples, underCenter + arcA, this.sampleScratch, 0);
        const tax = this.sampleScratch[2];
        const tay = this.sampleScratch[3];
        let c = 1;
        for (const arc of [(arcA + arcB) / 2, arcB]) {
          this.sampleAt(underSamples, underCenter + arc, this.sampleScratch, 0);
          c = Math.min(
            c,
            tax * this.sampleScratch[2] + tay * this.sampleScratch[3]
          );
        }
        const s01 = Math.max(0, Math.min(1, (c - 0.5) / 0.4));
        return LANE_STEP_MIN + LANE_STEP_RIDE * s01;
      };
      for (const [cuts, dir] of [
        [this.laneCutsPos, 1],
        [this.laneCutsNeg, -1],
      ] as [Float32Array, number][]) {
        for (let l = 0; l < ERASE_LANES - 1; l++) {
          this.laneStepScratch[l] = laneStep(cuts[l], cuts[l + 1]);
        }
        for (let l = 0; l < ERASE_LANES - 1; l++) {
          const cap = dir * cuts[l] + this.laneStepScratch[l];
          if (dir * cuts[l + 1] > cap) cuts[l + 1] = dir * cap;
        }
        for (let l = ERASE_LANES - 2; l >= 0; l--) {
          const cap = dir * cuts[l + 1] + this.laneStepScratch[l];
          if (dir * cuts[l] > cap) cuts[l] = dir * cap;
        }
      }

      // One binomial pass across lanes: the marched level set carries
      // small-amplitude discretization noise from the local-polyline
      // distance field (segment scallops), which renders as ragged torn
      // cap edges at 13-lane resolution. A [1,2,1] pass removes it while
      // leaving the low-frequency (genuine silhouette) shape intact.
      // Endpoint lanes stay - they are the strip's side boundaries.
      for (const cuts of [this.laneCutsPos, this.laneCutsNeg]) {
        let prev = cuts[0];
        for (let l = 1; l < ERASE_LANES - 1; l++) {
          const cur = cuts[l];
          cuts[l] = (prev + 2 * cur + cuts[l + 1]) / 4;
          prev = cur;
        }
      }

      // Round genuine corners in the solved boundary: clamp each interior
      // cap point's world second difference (see CAP_D2_MAX).
      for (const cuts of [this.laneCutsPos, this.laneCutsNeg]) {
        for (let l = 0; l < ERASE_LANES; l++) {
          const u = laneOffset(l);
          this.sampleAt(
            underSamples,
            underCenter + cuts[l],
            this.sampleScratch,
            0
          );
          this.capScratch[l * 4] =
            this.sampleScratch[0] - this.sampleScratch[3] * u;
          this.capScratch[l * 4 + 1] =
            this.sampleScratch[1] + this.sampleScratch[2] * u;
          this.capScratch[l * 4 + 2] = this.sampleScratch[2];
          this.capScratch[l * 4 + 3] = this.sampleScratch[3];
        }

        for (let l = 1; l < ERASE_LANES - 1; l++) {
          const midX =
            (this.capScratch[(l - 1) * 4] + this.capScratch[(l + 1) * 4]) / 2;
          const midY =
            (this.capScratch[(l - 1) * 4 + 1] +
              this.capScratch[(l + 1) * 4 + 1]) /
            2;
          const dx = this.capScratch[l * 4] - midX;
          const dy = this.capScratch[l * 4 + 1] - midY;
          const m = Math.hypot(dx, dy);
          if (m <= CAP_D2_MAX) continue;
          const scale = CAP_D2_MAX / m;
          const tx = this.capScratch[l * 4 + 2];
          const ty = this.capScratch[l * 4 + 3];
          const ds =
            (midX + dx * scale - this.capScratch[l * 4]) * tx +
            (midY + dy * scale - this.capScratch[l * 4 + 1]) * ty;
          cuts[l] += ds;
          this.capScratch[l * 4] += tx * ds;
          this.capScratch[l * 4 + 1] += ty * ds;
        }
      }

      // Record this crossing's final erase extents along its under thread
      // for the fill NEIGHBOR-GAP RESERVE (see reachAlongOver), and the
      // under-gap WINDOW for overlay consumers (the Ariadne yarn dips
      // under with its host; emergent crossings included).
      {
        let ePos = 0;
        let eNeg = 0;
        for (let l = 0; l < ERASE_LANES; l++) {
          if (this.laneCutsPos[l] > ePos) ePos = this.laneCutsPos[l];
          if (-this.laneCutsNeg[l] > eNeg) eNeg = -this.laneCutsNeg[l];
        }
        if (index >= 0) {
          this.eraseExtentPos[index] = ePos;
          this.eraseExtentNeg[index] = eNeg;
        }
        // The yarn window quotes the MID-LANE cuts, not the max: the
        // yarn rides the centerline, and the widest (edge-lane) cut at
        // an oblique crossing made it vanish well before its host's own
        // material did - the hidden span must track `gap` exactly.
        const midL = (ERASE_LANES - 1) >> 1;
        let win = this.underWindows.get(crossing.under.chain);
        if (!win) {
          win = [];
          this.underWindows.set(crossing.under.chain, win);
        }
        win.push(
          underCenter,
          -this.laneCutsNeg[midL],
          this.laneCutsPos[midL]
        );
      }

      // Build the erase grid: each lane spans its own solved cut interval,
      // so the cap rows are polylines lying on the over ribbon's offset
      // curve - they curve with the over thread.
      // FADE: a nonzero fadeLength extends each lane's SAMPLED span by
      // `fade` arc past both solved caps, and every vertex carries a
      // texture U of overshoot/fade (0 anywhere inside the cut interval),
      // so the erase strength rolls off across the tails. The extension is
      // purely additive BEYOND the solved boundary: the marches, shear
      // guard, smoothing, D2 rounding, the eraseExtent bookkeeping above
      // (the P3.38 neighbor reserve must keep quoting OPAQUE extents), and
      // the sMid miter probe below all still read the original laneCuts.
      // At fade 0 the spans and every U are bit-identical to the sharp
      // render. (Extending the ERASE past its solved exit is safe only
      // because the overhang is sub-strength and fades to zero - the P3.40
      // "never extend a cut" lesson is about full-strength erases.)
      const erase = eraseMesh;
      const fade = this.fadeLength;
      const midLane = (ERASE_LANES - 1) / 2;
      // Station -> arc parameterization. Fade OFF: uniform across the
      // solved cut, bit-identical to the sharp render. Fade ON: a FIXED
      // station budget pins to each fade tail and the rest span the
      // opaque cut. The old uniform-over-everything spread starved long
      // rides' tails below one station (16 stations over a span of
      // several world units left ~0.4 for a 0.28 tail), collapsing the
      // whole roll-off onto a single quad straddling the boundary - a
      // near-hard edge - and the lattice slid against the boundary as
      // the span breathed, resampling that quad every frame (the
      // "sharper-than-they-should-be gaps jitter" report). Tail stations
      // anchor to the solved boundary, so both symptoms die together.
      // The cap rows themselves are LANE polylines at the boundary
      // stations - their fidelity is unchanged by the re-spread.
      const tailK = fade > 0 ? FADE_TAIL_STATIONS : 0;
      const kIn0 = tailK;
      const kIn1 = ERASE_STATIONS - 1 - tailK;
      for (let k = 0; k < ERASE_STATIONS; k++) {
        // seg: -1 = neg fade tail, 0 = opaque cut, +1 = pos fade tail;
        // g = position within the segment (tails: 1/0 at the boundary).
        let seg = 0;
        let g = k / (ERASE_STATIONS - 1);
        if (tailK > 0) {
          if (k <= kIn0) {
            seg = -1;
            g = k / tailK;
          } else if (k >= kIn1) {
            seg = 1;
            g = (k - kIn1) / tailK;
          } else {
            seg = 0;
            g = (k - kIn0) / (kIn1 - kIn0);
          }
        }

        // Station miter factor from the local turn of the under centerline,
        // matching the base ribbon's mitered extrusion so the erase keeps
        // covering it at kinks.
        const midN = this.laneCutsNeg[midLane];
        const midP = this.laneCutsPos[midLane];
        const sMid =
          underCenter +
          (seg < 0
            ? midN - fade * (1 - g)
            : seg > 0
              ? midP + fade * g
              : midN + (midP - midN) * g);
        this.sampleAt(underSamples, sMid - MITER_PROBE, this.sampleScratch, 0);
        const pax = this.sampleScratch[0];
        const pay = this.sampleScratch[1];
        this.sampleAt(underSamples, sMid + MITER_PROBE, this.sampleScratch, 0);
        const pbx = this.sampleScratch[0];
        const pby = this.sampleScratch[1];
        this.sampleAt(underSamples, sMid, this.sampleScratch, 0);
        let ax = this.sampleScratch[0] - pax;
        let ay = this.sampleScratch[1] - pay;
        let bx = pbx - this.sampleScratch[0];
        let by = pby - this.sampleScratch[1];
        const la = Math.hypot(ax, ay) || 1;
        const lb = Math.hypot(bx, by) || 1;
        ax /= la;
        ay /= la;
        bx /= lb;
        by /= lb;
        const dot = ax * bx + ay * by;
        const cosHalf = Math.sqrt(Math.max((1 + dot) / 2, 0.25));

        // Per-side widths mirroring RibbonMesh.update exactly: mitered
        // width, with the CONCAVE side clamped to the local turn radius.
        // The base under-ribbon thins into tight folds (P3.34); an erase
        // that keeps full mitered width there juts past the ribbon's real
        // inner edge and slashes whatever is drawn beside it - the thin
        // slit biting into loop-end twist bulbs and hairpin tips. The
        // erase must quote the base ribbon's RENDERED footprint (+ pad).
        let wInner = fillHalf / cosHalf;
        const sinHalf = Math.sqrt(Math.max((1 - dot) / 2, 0));
        if (sinHalf > 1e-4) {
          const radius = ((la + lb) / 4) * (cosHalf / sinHalf);
          wInner = Math.min(wInner, Math.max(radius * 0.95, fillHalf * 0.3));
        }
        const cross = ax * by - ay * bx;
        const wOuterE = fillHalf / cosHalf + ERASE_WIDTH_PAD;
        const wInnerE = wInner + ERASE_WIDTH_PAD;
        const wLeftE = cross > 0 ? wInnerE : wOuterE;
        const wRightE = cross > 0 ? wOuterE : wInnerE;

        for (let l = 0; l < ERASE_LANES; l++) {
          const s =
            seg < 0
              ? this.laneCutsNeg[l] - fade * (1 - g)
              : seg > 0
                ? this.laneCutsPos[l] + fade * g
                : this.laneCutsNeg[l] +
                  (this.laneCutsPos[l] - this.laneCutsNeg[l]) * g;
          // Fade coordinate: how far this station overshoots the lane's
          // solved cut interval, as a fraction of the fade length.
          const over = Math.max(
            this.laneCutsNeg[l] - s,
            s - this.laneCutsPos[l]
          );
          const f = 1 - (2 * l) / (ERASE_LANES - 1);
          const u = (f >= 0 ? wLeftE : wRightE) * f;
          this.sampleAt(underSamples, underCenter + s, this.sampleScratch, 0);
          erase.setVertex(
            k,
            l,
            this.sampleScratch[0] - this.sampleScratch[3] * u,
            this.sampleScratch[1] + this.sampleScratch[2] * u
          );
          erase.setVertexU(k, l, fade > 0 && over > 0 ? over / fade : 0);
        }
      }
      erase.commit();

      // Over fill: redraw the over thread across the hole. The window is
      // measured directly: march along the over thread until its centerline
      // is provably beyond the erase's reach of the under thread. No angle
      // estimates, so kinked centerlines can't undersize it. Reach bounds
      // come from fillBound - the same closure the erase's over polyline
      // quoted before the marches ran.
      const overlapReach = eraseW + fillHalf + ERASE_WIDTH_PAD + 0.05;
      const reachAlongOver = (dir: number): number => {
        const rMax = fillBound(dir);
        for (let s = MARCH_STEP; s < rMax; s += MARCH_STEP) {
          this.sampleAt(overSamples, overCenter + dir * s, this.sampleScratch, 0);
          const d = this.distToLocal(
            this.underLocal,
            this.sampleScratch[0],
            this.sampleScratch[1]
          );
          if (d >= overlapReach) {
            return Math.min(s + OVER_PATCH_MARGIN, rMax);
          }
        }
        return rMax;
      };
      // The comfort floor must never override the self-crossing split, or
      // the fill repaints the gap at tight tips.
      const halfPos = Math.min(
        Math.max(OVER_HALF_LENGTH_MIN, reachAlongOver(1)),
        splitPos
      );
      const halfNeg = Math.min(
        Math.max(OVER_HALF_LENGTH_MIN, reachAlongOver(-1)),
        splitNeg
      );

      // Repaint the over thread across the hole by copying the base
      // ribbon's vertices for the window's sample range - pixel-identical
      // to the base ribbon, so no width change and no outline mismatch.
      const overFill = this.fills[crossing.over.chain];
      const arcPerSample = overSamples.totalLength / overSamples.count;
      const startSample = Math.floor((overCenter - halfNeg) / arcPerSample);
      const endSample = Math.ceil((overCenter + halfPos) / arcPerSample);
      const span = Math.min(
        endSample - startSample + 1,
        OVER_PATCH_MAX_SAMPLES,
        overSamples.count
      );
      const palette = this.style.paletteMode === true;
      fillMesh.updateFromRibbonWindow(overFill, startSample, span, palette);
      fillMesh.mesh.tint = overFill.mesh.tint;
      if (palette) fillMesh.mesh.texture = overFill.mesh.texture;
      this.lastWindowStart = startSample;
      this.lastWindowSpan = span;
      if (index >= 0) {
        this.overWindows[index * 2] = startSample;
        this.overWindows[index * 2 + 1] = span;
      }

      if (index >= 0) {
        if (this.diagData.length < this.ps.crossings.length * 5) {
          this.diagData = new Float32Array(this.ps.crossings.length * 5);
        }
        let spanSum = 0;
        for (let l = 0; l < ERASE_LANES; l++) {
          spanSum += this.laneCutsPos[l] - this.laneCutsNeg[l];
        }
        this.ps.bindingPoint(crossing.over as CrossingPass, this.sampleScratch, 0);
        this.diagData[c * 5] = this.sampleScratch[0];
        this.diagData[c * 5 + 1] = this.sampleScratch[1];
        this.diagData[c * 5 + 2] = spanSum / ERASE_LANES;
        this.diagData[c * 5 + 3] = halfPos + halfNeg;
        this.diagData[c * 5 + 4] = selfCross
          ? Math.min(
              (((underCenter - overCenter) % total) + total) % total,
              (((overCenter - underCenter) % total) + total) % total
            )
          : -1;
      }

      if (index >= 0 && c === this.inspectIndex) {
        this.inspectIndex = -1;
        const round = (v: number): number => Math.round(v * 1000) / 1000;
        console.log(
          "CROSSING INSPECT " +
            JSON.stringify({
              crossing: c,
              selfCross,
              over: { chain: crossing.over.chain, ctrl: round(crossing.over.ctrl) },
              under: {
                chain: crossing.under.chain,
                ctrl: round(crossing.under.ctrl),
              },
              sign: crossing.sign,
              overCenter: round(overCenter),
              underCenter: round(underCenter),
              splitPos: round(splitPos),
              splitNeg: round(splitNeg),
              maskHalf: round(maskHalf),
              uGaps: [round(uGapPrev), round(uGapNext)],
              oGaps: [round(oGapPrev), round(oGapNext)],
              halfPos: round(halfPos),
              halfNeg: round(halfNeg),
              cutsPos: [...this.laneCutsPos].map(round),
              cutsNeg: [...this.laneCutsNeg].map(round),
              startSample,
              span,
              totalLength: round(total),
            })
        );
      }
    }
  }

  // Pooled patches for emergent (tunneled) crossings, deduped against
  // registered crossings and each other.
  private renderEmergent(fillHalf: number, gap: number): void {
    let poolUsed = 0;
    const used: number[] = [];
    for (const em of this.ps.emergentCrossings) {
      if (poolUsed >= EMERGENT_POOL) break;
      // REVEAL: same visibility rule as registered crossings.
      if (this.revealOn && !this.crossingRevealed(em)) continue;
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
      this.emergentErases[pool].mesh.visible = true;
      this.emergentFills[pool].mesh.visible = true;
      this.renderCrossing(
        em,
        -1,
        this.emergentErases[pool],
        this.emergentFills[pool],
        null,
        null,
        fillHalf,
        gap
      );
      this.emergentWindows[pool] = this.style.paletteMode
        ? {
            chain: em.over.chain,
            start: this.lastWindowStart,
            span: this.lastWindowSpan,
          }
        : null;
    }
    for (let k = poolUsed; k < EMERGENT_POOL; k++) {
      this.emergentErases[k].mesh.visible = false;
      this.emergentFills[k].mesh.visible = false;
      this.emergentWindows[k] = null;
    }
  }

  // Install the section color field (see core/section_colors). The noise
  // scheme carries no segments - it is evaluated spatially per sample.
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
    this.vCacheReady = false;
  }

  // Section color coordinate at a chain ctrl (piecewise-linear segments,
  // or the spatial noise field).
  private sectionVAt(chain: number, ctrl: number): number {
    if (this.sectionNoise) {
      const samples = this.chainSamples[chain];
      if (!samples) return 0.5;
      this.ps.pointOnChain(
        chain,
        (((ctrl % this.ps.chains[chain].length) +
          this.ps.chains[chain].length) %
          this.ps.chains[chain].length),
        this.sampleScratch,
        0
      );
      return this.noiseV(this.sampleScratch[0], this.sampleScratch[1]);
    }
    const segs = this.sectionSegs[chain];
    if (!segs || segs.length === 0) return 0.5;
    const len = this.ps.chains[chain].length;
    for (const c of [ctrl, ctrl + len]) {
      for (const s of segs) {
        if (c >= s.c0 - 1e-6 && c <= s.c1 + 1e-6) {
          const t = s.c1 > s.c0 ? (c - s.c0) / (s.c1 - s.c0) : 0;
          return s.v0 + (s.v1 - s.v0) * t;
        }
      }
    }
    return segs[0].v0;
  }

  private noiseV(x: number, y: number): number {
    const n = this.sectionNoise!(x * 0.16, y * 0.16);
    return Math.max(0, Math.min(1, 0.5 + 0.62 * n));
  }

  // Bake the per-sample V cache for one chain (initial arc tables; sample
  // k's arc FRACTION is fixed by uniform resampling, so this stays valid
  // as the chain deforms).
  private buildVCacheFor(chain: number, samples: SplineSamples): void {
    const count = samples.count;
    if (this.sectionNoise) {
      const vs = new Float32Array(count);
      for (let k = 0; k < count; k++) {
        vs[k] = this.noiseV(
          samples.positions[k * 2],
          samples.positions[k * 2 + 1]
        );
      }
      this.vCache[chain] = vs;
      return;
    }
    const segs = this.sectionSegs[chain];
    if (!segs || segs.length === 0) {
      this.vCache[chain] = 0.5;
      return;
    }
    if (
      segs.length === 1 &&
      Math.abs(segs[0].v0 - segs[0].v1) < 1e-6
    ) {
      this.vCache[chain] = segs[0].v0;
      return;
    }
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const cal = samples.controlArcLengths;
    const n = cal.length;
    const total = samples.totalLength;
    const vs = new Float32Array(count);
    let slot = 0;
    for (let k = 0; k < count; k++) {
      const a = closed ? (k / count) * total : (k / (count - 1)) * total;
      while (slot < n - 1 && cal[slot + 1] <= a) slot++;
      const a0 = cal[slot];
      const a1 = slot < n - 1 ? cal[slot + 1] : total;
      const t = a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0;
      vs[k] = this.sectionVAt(chain, slot + t);
    }
    this.vCache[chain] = vs;
  }

  // Declare the current gameplay paint (traveled spans + branch-point
  // pulse arms). Cheap; the heavy lifting happens in tickPaint.
  setPaint(spans: PaintSpan[], pulses: PulseArm[], caps: PaintCap[]): void {
    this.paintSpans = spans;
    this.paintPulses = pulses;
    this.paintCaps = caps;
    this.paintRev++;
  }

  // The light per-frame paint pass: advances the pulse clock and rewrites
  // the UV buffers of affected chains (animated chains every tick, static
  // ones only when the declaration changed, dropped ones reset once), then
  // re-copies the over-fill windows riding those chains so crossing patches
  // recolor in the same frame. Touches no positions and no splines - safe
  // to run while the physics sleeps. Also owns the flow-undulation clock
  // (it receives real dt every frame in all ticker branches, both modes).
  tickPaint(dt: number): void {
    this.tickPaintPalette(dt);
    this.tickAppearFx(dt);
    // Flow clock, advanced AFTER the palette/fillet pass so everything
    // rendered this frame (update()'s chain samples, the fillet
    // centroids) read ONE field time. Scaling the ACCUMULATOR by the live
    // speed keeps a flowSpeed slider change from phase-jumping the field,
    // which multiplying at evaluation time would.
    this.flowTime += dt * this.flowSpeed;
  }

  private tickPaintPalette(dt: number): void {
    if (!this.style.paletteMode) return;
    this.paintClock += dt;

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

    for (const chain of toWrite) {
      if (!this.chainSamples[chain]) continue;
      this.writeChainPaint(chain, target.has(chain));
      if (target.has(chain)) this.chainRev.set(chain, this.paintRev);
      else this.chainRev.delete(chain);

      const list = this.overChainCrossings.get(chain);
      if (list) {
        for (const ci of list) {
          const span = this.overWindows[ci * 2 + 1];
          if (span > 0) {
            this.overFills[ci].updateFromRibbonWindow(
              this.fills[chain],
              this.overWindows[ci * 2],
              span,
              true
            );
          }
        }
      }
      for (let k = 0; k < this.emergentWindows.length; k++) {
        const w = this.emergentWindows[k];
        if (w && w.chain === chain) {
          this.emergentFills[k].updateFromRibbonWindow(
            this.fills[chain],
            w.start,
            w.span,
            true
          );
        }
      }
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
      mesh.writeUVs(us, this.vCache[chain]);
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
    mesh.writeUVs(us, this.vCache[chain]);
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
    const samples = this.chainSamples[chain];
    if (!samples || samples.totalLength <= 0) return;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    const total = samples.totalLength;
    const mask = this.revealMask[chain];
    const arcPer = closed ? total / count : total / (count - 1);
    const halfWin = Math.ceil(REVEAL_GLOW_ARC / Math.max(arcPer, 1e-6)) + 1;
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
        if (d > REVEAL_GLOW_ARC) continue;
        if (mask && mask[k] <= 0.004) continue; // Unrevealed side: invisible.
        const g = 1 - d / REVEAL_GLOW_ARC;
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
  // spans spanArc. GLOBAL period and phase (every arm in lockstep): a crest
  // sinks inward along the arrival arm exactly as its successor emerges
  // along all the choices. The steady floor, the crest, and the hover
  // highlight all fade smoothly at both the reach end and the arm's far
  // end - a hard cutoff rendered as a distinct line wherever a crest met
  // the boundary.
  private pulseValueAt(
    d: number,
    spanArc: number,
    inward: boolean,
    hovered: boolean
  ): number {
    const R0 = PULSE_REACH;
    const end = Math.min(R0, spanArc);
    if (d < 0 || d > end) return 0;
    const endWin = Math.min(1, (end - d) / PULSE_END_WINDOW);
    if (hovered) return Math.max(0, endWin);
    const fade = 1 - d / R0;
    const period = 2 * R0;
    const s0 = (((this.paintClock * PULSE_SPEED) % period) + period) % period;
    let bump = 0;
    for (const sPh of [s0, (s0 + R0) % period]) {
      // s in [0, R0) is the inbound half of the cycle, [R0, 2R0) outbound.
      if (inward !== sPh < R0) continue;
      const dC = inward ? R0 - sPh : sPh - R0;
      const b =
        (1 - Math.abs(d - dC) / CREST_WIDTH) *
        Math.min(1, dC / CREST_RAMP);
      if (b > bump) bump = b;
    }
    const floor =
      PULSE_FLOOR +
      PULSE_CORE_BOOST * Math.max(0, 1 - d / PULSE_CORE_RADIUS);
    return Math.min(1, (floor + bump) * fade * endWin);
  }

  // The paint field at a single chain ARC (same rules as writeChainPaint,
  // point-evaluated): colors joinery in sync with the live paint,
  // including the pulse animation.
  private paintUAtArc(chain: number, a: number, closed: boolean): number {
    const samples = this.chainSamples[chain];
    if (!samples) return U_BASE;
    const total = samples.totalLength;
    let u = U_BASE;
    for (const s of this.paintSpans) {
      if (s.chain !== chain) continue;
      const a0 = this.paintArcAt(samples, s.c0, closed);
      const a1 = this.paintArcAt(samples, s.c1, closed);
      const wraps = closed && a1 <= a0 && s.c1 > s.c0;
      if (wraps ? a >= a0 || a <= a1 : a >= a0 && a <= a1) {
        const p0 = s.p0 ?? 1;
        const p1 = s.p1 ?? 1;
        if (p0 >= 1 && p1 >= 1) {
          u = U_GOLD;
        } else {
          const spanLen = Math.max(wraps ? total - a0 + a1 : a1 - a0, 1e-9);
          const da = wraps && a < a0 ? total - a0 + a : a - a0;
          const t = Math.min(1, Math.max(0, da / spanLen));
          u = goldU(p0 + (p1 - p0) * t);
        }
      }
    }
    for (const cp of this.paintCaps) {
      if (cp.chain !== chain) continue;
      const aC = this.paintArcAt(samples, cp.ctrl, closed);
      let d = Math.abs(a - aC);
      if (closed) d = Math.min(d, total - d);
      if (d <= cp.radius) u = Math.max(u, goldU(cp.p ?? 1));
    }
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
      let d: number;
      if (closed) {
        d = dirPos
          ? (((a - aJ) % total) + total) % total
          : (((aJ - a) % total) + total) % total;
      } else {
        d = dirPos ? a - aJ : aJ - a;
      }
      const v = this.pulseValueAt(d, spanArc, p.inward, p.hovered);
      if (v > 0.004) u = bandU(p.onPath, v);
    }
    return u;
  }

  // Positional sampling for junction joinery: sampleAt WRAPS arc == total
  // to arc 0 on open chains (the arc-wrap family - third bite: flank
  // samples at corner-cut terminals flew to the chain START and fanned
  // sliver spikes across the canvas). Clamp open-chain arcs a hair short.
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

  // Section V at a world ARC along a chain, read from the baked per-sample
  // cache - the SAME data the ribbon's own UVs carry, so overlay geometry
  // sampling through here matches the adjacent ribbon exactly at a seam.
  private vAtArc(chain: number, arc: number): number {
    const cache = this.vCache[chain];
    if (typeof cache === "number") return cache;
    const samples = this.chainSamples[chain];
    if (!samples || samples.totalLength <= 0) return 0.5;
    const count = cache.length;
    const total = samples.totalLength;
    if (this.ps.chainBreakAfter[chain] < 0) {
      const f = (normArc(arc, total, true) / total) * count;
      const k0 = Math.floor(f) % count;
      const k1 = (k0 + 1) % count;
      const fr = f - Math.floor(f);
      return cache[k0] + (cache[k1] - cache[k0]) * fr;
    }
    const f = (normArc(arc, total, false) / total) * (count - 1);
    const k0 = Math.floor(f);
    const k1 = Math.min(count - 1, k0 + 1);
    const fr = f - k0;
    return cache[k0] + (cache[k1] - cache[k0]) * fr;
  }

  // Rounded junction joinery: tip/seal discs and, for each wedge between
  // adjacent junction arms, a concave patch from one arm's edge to the
  // next (quadratic bezier with the edge-intersection corner as control).
  // Rebuilt every paint tick: positions are live, and the colors ride the
  // gameplay animation. Everything renders on ONE palette-textured fan
  // mesh: per-vertex UVs let discs and wedges carry the same BLENDED
  // material as the ribbons they join, which no flat Graphics fill can -
  // a flat overlay over a ramping section color drew a visible step (or a
  // stamped circle of junction color) at its boundary, the
  // junction-blotch reports.
  private rebuildFillets(): void {
    if (!this.filletLayer || !this.paletteTex) return;
    const fillHalf = this.style.threadWidth / 2;
    const nDiscs =
      this.freeTips.length + this.fusedTips.length + this.junctionArms.length;
    if (nDiscs === 0) return;
    if (!this.filletMesh) {
      let armTotal = 0;
      for (const jn of this.junctionArms) armTotal += jn.arms.length;
      const wedgeRim = 2 * FILLET_EDGE_PTS + FILLET_BEZIER_STEPS + 1;
      this.filletMesh = new TriFanMesh(
        this.paletteTex,
        armTotal * (wedgeRim + 1) + nDiscs * (DISC_SEGS + 2),
        (armTotal * wedgeRim + nDiscs * DISC_SEGS) * 3
      );
      this.filletLayer.addChild(this.filletMesh.mesh);
    }
    const fm = this.filletMesh;
    fm.begin();

    // A disc fan whose rim samples the underlying thread's own material at
    // each rim point's arc (the point's offset projected onto the thread's
    // local axis): the disc IS a patch of that thread's paint, so it
    // vanishes into ramped section colors instead of stamping a circle.
    const pushDisc = (
      cx: number,
      cy: number,
      r: number,
      chain: number,
      arc0: number,
      ax: number,
      ay: number
    ): void => {
      const closed = this.ps.chainBreakAfter[chain] < 0;
      const samples = this.chainSamples[chain];
      const total = samples ? samples.totalLength : 1;
      const rim: number[] = [];
      for (let i = 0; i <= DISC_SEGS; i++) {
        const th = ((i % DISC_SEGS) / DISC_SEGS) * Math.PI * 2;
        const px = cx + Math.cos(th) * r;
        const py = cy + Math.sin(th) * r;
        const arc = normArc(
          arc0 + (px - cx) * ax + (py - cy) * ay,
          total,
          closed
        );
        rim.push(
          px,
          py,
          this.paintUAtArc(chain, arc, closed),
          this.vAtArc(chain, arc)
        );
      }
      const arcC = normArc(arc0, total, closed);
      fm.pushFan(
        cx,
        cy,
        this.paintUAtArc(chain, arcC, closed),
        this.vAtArc(chain, arcC),
        rim
      );
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

    // THE JUNCTION FIELD: one continuous (u, v) function around each
    // junction, shared by EVERY overlay primitive there. A query point's
    // direction from the junction picks the two bracketing arms (by
    // angle); each arm is sampled at the point's distance PROJECTED onto
    // it (a point beside a thread reads its cross-section, a point along
    // it reads its ramp), and the two samples blend by angular fraction.
    // Disc rims, wedge rims, and the ribbons themselves then agree
    // wherever they meet. Per-primitive sampling (host-axis discs,
    // per-arm wedges) left faint rim arcs wherever one primitive's color
    // crossed ANOTHER arm's material - the circled phone-zoom reports.
    interface JArm {
      ang: number;
      dx: number;
      dy: number;
      chain: number;
      dir: number;
      arc0: number;
      closed: boolean;
      total: number;
    }
    interface JRec {
      jx: number;
      jy: number;
      arms: JArm[];
      on: boolean; // REVEAL: all arm-adjacent samples revealed.
    }
    const pos = this.ps.positions;
    const recs: JRec[] = [];
    for (const jn of this.junctionArms) {
      let jx = 0;
      let jy = 0;
      for (const p of jn.particles) {
        jx += pos[p * 2];
        jy += pos[p * 2 + 1];
      }
      jx /= jn.particles.length;
      jy /= jn.particles.length;
      // The centroid comes from raw physics positions; the arms it joins
      // are displaced chain samples - ride the same flow field.
      this.flowOffset(jx, jy, this.flowScratch);
      jx += this.flowScratch[0];
      jy += this.flowScratch[1];
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
        arms.push({
          ang: Math.atan2(dy, dx),
          dx,
          dy,
          chain: a.chain,
          dir: a.dir,
          arc0: this.paintArcAt(samples, a.slot, closedA),
          closed: closedA,
          total: samples.totalLength,
        });
      }
      arms.sort((p, q) => p.ang - q.ang);
      // REVEAL: joinery waits until every arm-adjacent sample is revealed
      // (half-drawn fillets over zero-width arms read as floating scraps).
      let on = true;
      if (this.revealOn) {
        for (const a of jn.arms) {
          if (
            this.revealMulAtCtrl(a.chain, a.slot + a.dir * 0.8) <
            REVEAL_CROSSING_MIN
          ) {
            on = false;
            break;
          }
        }
      }
      recs.push({ jx, jy, arms, on });
    }

    let fieldU = U_BASE;
    let fieldV = 0.5;
    const armSample = (arm: JArm, proj: number): void => {
      const arc = normArc(arm.arc0 + arm.dir * proj, arm.total, arm.closed);
      fieldU = this.paintUAtArc(arm.chain, arc, arm.closed);
      fieldV = this.vAtArc(arm.chain, arc);
    };
    const fieldAt = (rec: JRec, px: number, py: number): void => {
      const arms = rec.arms;
      if (arms.length === 0) {
        fieldU = U_BASE;
        fieldV = 0.5;
        return;
      }
      const d = Math.hypot(px - rec.jx, py - rec.jy);
      const ang = Math.atan2(py - rec.jy, px - rec.jx);
      let bi = 0;
      while (bi < arms.length && arms[bi].ang < ang) bi++;
      const B = arms[bi % arms.length];
      const A = arms[(bi - 1 + arms.length) % arms.length];
      armSample(A, d * Math.max(0, Math.cos(ang - A.ang)));
      if (A === B) return;
      const uA = fieldU;
      const vA = fieldV;
      armSample(B, d * Math.max(0, Math.cos(ang - B.ang)));
      let span = B.ang - A.ang;
      if (span <= 0) span += Math.PI * 2;
      let off = ang - A.ang;
      if (off < 0) off += Math.PI * 2;
      const t = span > 1e-6 ? Math.min(1, Math.max(0, off / span)) : 0;
      fieldU = uA + (fieldU - uA) * t;
      fieldV = vA + (fieldV - vA) * t;
    };
    const pushDiscField = (
      rec: JRec,
      cx: number,
      cy: number,
      r: number
    ): void => {
      const rim: number[] = [];
      for (let i = 0; i <= DISC_SEGS; i++) {
        const th = ((i % DISC_SEGS) / DISC_SEGS) * Math.PI * 2;
        const px = cx + Math.cos(th) * r;
        const py = cy + Math.sin(th) * r;
        fieldAt(rec, px, py);
        rim.push(px, py, fieldU, fieldV);
      }
      fieldAt(rec, cx, cy);
      fm.pushFan(cx, cy, fieldU, fieldV, rim);
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
      if (
        this.revealOn &&
        this.revealMulAtCtrl(
          tip.chain,
          tip.atEnd ? this.ps.chains[tip.chain].length - 1 : 0
        ) < REVEAL_CROSSING_MIN
      ) {
        continue;
      }
      tipXY(samples, tip.atEnd);
      const cx = this.sampleScratch[0];
      const cy = this.sampleScratch[1];
      const k = tip.atEnd ? samples.count - 1 : 0;
      const tx = samples.tangents[k * 2];
      const ty = samples.tangents[k * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      pushDisc(
        cx,
        cy,
        fillHalf * 0.99,
        tip.chain,
        tip.atEnd ? samples.totalLength : 0,
        tx / tl,
        ty / tl
      );
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
        if (rec.on) pushDiscField(rec, cx, cy, fillHalf * 0.99);
        continue;
      }
      if (
        this.revealOn &&
        this.revealMulAtCtrl(tip.hostChain, tip.hostCtrl) <
          REVEAL_CROSSING_MIN
      ) {
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
        this.axisScratch[1]
      );
    }

    if (recs.length === 0) {
      fm.commit();
      return;
    }
    const w = fillHalf * 0.97;
    const L = fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius;
    const drawWedges = this.cuspRadius > 0.05 && L > w * 0.3;

    for (const rec of recs) {
      const jx = rec.jx;
      const jy = rec.jy;
      const arms = rec.arms;
      if (arms.length < 2) continue;
      if (!rec.on) continue; // REVEAL: joinery waits for its arms.

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
          for (let e = 0; e < FILLET_EDGE_PTS; e++) {
            const sArc =
              (0.12 + (0.88 * e) / (FILLET_EDGE_PTS - 1)) * L;
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
            const samples = this.chainSamples[arm.chain]!;
            this.sampleAtSafe(samples, a0, arm.closed, this.sampleScratch, 0);
            const px = this.sampleScratch[0];
            const py = this.sampleScratch[1];
            this.sampleAtSafe(samples, a1, arm.closed, this.sampleScratch, 0);
            let tx = (this.sampleScratch[0] - px) * arm.dir;
            let ty = (this.sampleScratch[1] - py) * arm.dir;
            const tl = Math.hypot(tx, ty) || 1;
            tx /= tl;
            ty /= tl;
            const sgn = left ? 1 : -1;
            out.push(px - ty * w * sgn, py + tx * w * sgn);
          }
        };
        const edgeA: number[] = [];
        const edgeB: number[] = [];
        flank(A, true, edgeA);
        flank(B, false, edgeB);

        // Perimeter: A's flank inner->outer, bezier rim to B's outer tip
        // (control = corner), B's flank outer->inner. Every vertex
        // evaluates the shared junction field, so the wedge is a window
        // onto the same continuous material as the discs and ribbons.
        const n = FILLET_BEZIER_STEPS;
        const rim: number[] = [];
        const pushPt = (px: number, py: number): void => {
          fieldAt(rec, px, py);
          rim.push(px, py, fieldU, fieldV);
        };
        for (let e = 0; e < FILLET_EDGE_PTS; e++) {
          pushPt(edgeA[e * 2], edgeA[e * 2 + 1]);
        }
        const pax = edgeA[(FILLET_EDGE_PTS - 1) * 2];
        const pay = edgeA[(FILLET_EDGE_PTS - 1) * 2 + 1];
        const pbx = edgeB[(FILLET_EDGE_PTS - 1) * 2];
        const pby = edgeB[(FILLET_EDGE_PTS - 1) * 2 + 1];
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
        for (let e = FILLET_EDGE_PTS - 1; e >= 0; e--) {
          pushPt(edgeB[e * 2], edgeB[e * 2 + 1]);
        }
        // Fan from the JUNCTION CENTER, not the edge-intersection corner:
        // the corner comes from a straight-line edge model and lands
        // OUTSIDE the true silhouette on curved hosts - fan triangles to
        // it poked jagged stick-outs past the edges (user report). The
        // center is always inside the joint; the corner survives only as
        // the outer rim's bezier control.
        fieldAt(rec, jx, jy);
        fm.pushFan(jx, jy, fieldU, fieldV, rim);
      }
    }
    fm.commit();
  }

  destroy(): void {
    this.root.destroy({ children: true });
    // Palette textures deliberately survive in PALETTE_CACHE - see its
    // comment for why destroying them here blanks the screen.
  }
}
