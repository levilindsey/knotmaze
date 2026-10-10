// Renders the knot as smooth ribbons. Base layer: every strand's fill ribbon.
// At each crossing, two patches recompute every frame:
//   1. An "under erase" patch: a background-colored ribbon that follows the
//      UNDER thread through the crossing, slightly wider than the thread, so
//      its footprint never exceeds the under thread's own and it cannot
//      notch anything else. Its end caps are the visible cut ends of the
//      under thread. Each cap corner is found by marching along its
//      under-ribbon edge until "perpendicular distance to the over
//      CENTERLINE CURVE equals overHalfWidth" (the over ribbon's
//      SILHOUETTE) flips, against a locally sampled polyline of the over
//      centerline - then the cap is pushed outward by `gap` as ARC LENGTH
//      along the under thread. The margin must be constant ALONG the
//      thread, not perpendicular to the over thread: a perpendicular
//      margin projects as gap/sin(angle) of bare background at oblique
//      crossings, which reads as a giant naked gap at loop-end twists
//      (spans up to 1.07 at 30-degree crossings measured, vs gap 0.06).
//   2. The OVER pass fill, redrawn on top so the over thread rides above
//      the hole, with a length that adapts to the crossing angle.
// All erases render below all fills, so patches never slice each other.

import { BufferImageSource, Container, Graphics, Texture } from "pixi.js";
import { createNoise2D } from "simplex-noise";
import type { ParticleSystem, CrossingPass } from "../physics/particle_system";
import type { VSegment, ColorScheme } from "../core/section_colors";
import { SeededRNG } from "../util/random";
import type { SplineSamples } from "../geometry/spline_generator";
import {
  sampleClosedSpline,
  sampleOpenSpline,
} from "../geometry/spline_generator";
import { RibbonMesh, PatchGridMesh } from "./ribbon_mesh";

export interface RibbonStyle {
  threadWidth: number; // In lattice units.
  casingWidth: number; // Thread width + twice the crossing gap.
  background: number;
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
}

// PAINT: gameplay recoloring, declared by the fabric overlay and rendered by
// steering each sample's palette coordinate.
export interface PaintSpan {
  chain: number;
  c0: number; // Chain ctrl span, unwrapped (c1 >= c0; sampled modulo).
  c1: number;
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
const vRow = (v: number): number => {
  const q = v < 0 ? 0 : v > 1 ? 1 : v;
  return (0.5 + q * (PAL_H - 1)) / PAL_H;
};
const bandU = (onPath: boolean, p: number): number => {
  const q = p < 0 ? 0 : p > 1 ? 1 : p;
  return onPath ? (124.5 + q * 110) / PAL_W : (111.5 - q * 110) / PAL_W;
};
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
const CREST_WIDTH = 0.55;
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
  private filletGfx: Graphics | null = null;
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
  private palettePx: Uint8Array | null = null;
  private sectionSegs: VSegment[][] = [];
  private sectionNoise: ((x: number, y: number) => number) | null = null;
  private vCache: (Float32Array | number)[] = [];
  private vCacheReady = false;

  constructor(ps: ParticleSystem, style: RibbonStyle) {
    this.ps = ps;
    this.style = style;
    this.root = new Container();

    const baseLayer = new Container();
    const filletLayer = new Container();
    const eraseLayer = new Container();
    const overLayer = new Container();
    this.root.addChild(baseLayer, filletLayer, eraseLayer, overLayer);
    if (style.paletteMode) {
      this.filletGfx = new Graphics();
      filletLayer.addChild(this.filletGfx);
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
        this.palettePx = pal.px;
        fill.mesh.texture = pal.tex;
        fill.mesh.tint = 0xffffff;
        fill.writeUVs(new Float32Array(count).fill(U_BASE), 0.5);
      }
      this.fills.push(fill);
      baseLayer.addChild(fill.mesh);
    });
    this.vCache = ps.chains.map(() => 0.5);
    this.sectionSegs = ps.chains.map(() => []);

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

      const erase = new PatchGridMesh(
        ERASE_STATIONS,
        ERASE_LANES,
        style.background
      );
      const fill = new RibbonMesh(OVER_PATCH_MAX_SAMPLES, false, 0xffffff);
      this.underErases.push(erase);
      this.overFills.push(fill);
      eraseLayer.addChild(erase.mesh);
      overLayer.addChild(fill.mesh);
    }

    for (let k = 0; k < EMERGENT_POOL; k++) {
      const erase = new PatchGridMesh(
        ERASE_STATIONS,
        ERASE_LANES,
        style.background
      );
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
  // as [x, y, tx, ty].
  private sampleAt(
    samples: SplineSamples,
    arc: number,
    out: Float32Array,
    offset: number
  ): void {
    const total = samples.totalLength;
    const wrapped = ((arc % total) + total) % total;
    const f = (wrapped / total) * samples.count;
    const i0 = Math.floor(f) % samples.count;
    const i1 = (i0 + 1) % samples.count;
    const frac = f - Math.floor(f);

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

  update(): void {
    const { positions } = this.ps;

    this.ps.chains.forEach((chain, i) => {
      const controls = this.chainControls[i];
      for (let k = 0; k < chain.length; k++) {
        controls[k * 2] = positions[chain[k] * 2];
        controls[k * 2 + 1] = positions[chain[k] * 2 + 1];
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
      this.fills[i].update(
        samples.positions,
        samples.tangents,
        this.style.threadWidth / 2
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
            reserveCap = Math.max(0.12, gapLimit - reserve);
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
      // for the fill NEIGHBOR-GAP RESERVE (see reachAlongOver).
      if (index >= 0) {
        let ePos = 0;
        let eNeg = 0;
        for (let l = 0; l < ERASE_LANES; l++) {
          if (this.laneCutsPos[l] > ePos) ePos = this.laneCutsPos[l];
          if (-this.laneCutsNeg[l] > eNeg) eNeg = -this.laneCutsNeg[l];
        }
        this.eraseExtentPos[index] = ePos;
        this.eraseExtentNeg[index] = eNeg;
      }

      // Build the erase grid: each lane spans its own solved cut interval,
      // so the cap rows are polylines lying on the over ribbon's offset
      // curve - they curve with the over thread.
      const erase = eraseMesh;
      const midLane = (ERASE_LANES - 1) / 2;
      for (let k = 0; k < ERASE_STATIONS; k++) {
        const t = k / (ERASE_STATIONS - 1);

        // Station miter factor from the local turn of the under centerline,
        // matching the base ribbon's mitered extrusion so the erase keeps
        // covering it at kinks.
        const sMid =
          underCenter +
          this.laneCutsNeg[midLane] +
          (this.laneCutsPos[midLane] - this.laneCutsNeg[midLane]) * t;
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
            this.laneCutsNeg[l] +
            (this.laneCutsPos[l] - this.laneCutsNeg[l]) * t;
          const f = 1 - (2 * l) / (ERASE_LANES - 1);
          const u = (f >= 0 ? wLeftE : wRightE) * f;
          this.sampleAt(underSamples, underCenter + s, this.sampleScratch, 0);
          erase.setVertex(
            k,
            l,
            this.sampleScratch[0] - this.sampleScratch[3] * u,
            this.sampleScratch[1] + this.sampleScratch[2] * u
          );
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
  // to run while the physics sleeps.
  tickPaint(dt: number): void {
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
      mesh.writeUVs(us, this.vCache[chain]);
      return;
    }

    const closed = this.ps.chainBreakAfter[chain] < 0;
    const total = samples.totalLength;
    const arcOf = (k: number): number =>
      closed ? (k / count) * total : (k / (count - 1)) * total;

    // Traveled spans -> gold.
    for (const s of this.paintSpans) {
      if (s.chain !== chain) continue;
      const a0 = this.paintArcAt(samples, s.c0, closed);
      const a1 = this.paintArcAt(samples, s.c1, closed);
      // A closed chain's unwrapped span can cross the arc seam.
      const wraps = closed && a1 <= a0 && s.c1 > s.c0;
      for (let k = 0; k < count; k++) {
        const a = arcOf(k);
        const inside = wraps ? a >= a0 || a <= a1 : a >= a0 && a <= a1;
        if (inside) us[k] = U_GOLD;
      }
    }

    // Traversed-junction caps -> gold discs around each arm occurrence.
    for (const cp of this.paintCaps) {
      if (cp.chain !== chain) continue;
      const aC = this.paintArcAt(samples, cp.ctrl, closed);
      for (let k = 0; k < count; k++) {
        let d = Math.abs(arcOf(k) - aC);
        if (closed) d = Math.min(d, total - d);
        if (d <= cp.radius) us[k] = U_GOLD;
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
    mesh.writeUVs(us, this.vCache[chain]);
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
    return Math.min(1, (floor + bump * 0.8) * fade * endWin);
  }

  // The paint field at a single chain position (same rules as
  // writeChainPaint, point-evaluated): used to color fillets in sync with
  // the live paint, including the pulse animation.
  private paintUAt(chain: number, ctrl: number): number {
    const samples = this.chainSamples[chain];
    if (!samples) return U_BASE;
    const closed = this.ps.chainBreakAfter[chain] < 0;
    return this.paintUAtArc(
      chain,
      this.paintArcAt(samples, ctrl, closed),
      closed
    );
  }

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
      if (wraps ? a >= a0 || a <= a1 : a >= a0 && a <= a1) u = U_GOLD;
    }
    for (const cp of this.paintCaps) {
      if (cp.chain !== chain) continue;
      const aC = this.paintArcAt(samples, cp.ctrl, closed);
      let d = Math.abs(a - aC);
      if (closed) d = Math.min(d, total - d);
      if (d <= cp.radius) u = U_GOLD;
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

  // CPU-side 2D palette sample (bilinear, matching the GPU's filtering
  // closely enough for flat fills).
  private paletteColor2(u: number, v: number): number {
    const px = this.palettePx;
    if (!px) return 0xffffff;
    const x = Math.max(0.5, Math.min(PAL_W - 1.5, u * PAL_W - 0.5));
    const i0 = Math.floor(x);
    const fx = x - i0;
    const y = Math.max(0.5, Math.min(PAL_H - 1.5, vRow(v) * PAL_H - 0.5));
    const r0 = Math.floor(y);
    const fy = y - r0;
    const chan = (row: number, col: number, c: number): number =>
      px[(row * PAL_W + col) * 4 + c];
    const lerp2 = (c: number): number => {
      const top = chan(r0, i0, c) + (chan(r0, i0 + 1, c) - chan(r0, i0, c)) * fx;
      const bot =
        chan(r0 + 1, i0, c) + (chan(r0 + 1, i0 + 1, c) - chan(r0 + 1, i0, c)) * fx;
      return top + (bot - top) * fy;
    };
    return (
      (Math.round(lerp2(0)) << 16) |
      (Math.round(lerp2(1)) << 8) |
      Math.round(lerp2(2))
    );
  }

  // Rounded junction fillets: for each wedge between adjacent arms, a
  // concave patch from one arm's edge to the next (quadratic bezier with
  // the edge-intersection corner as control), split at its midpoint so
  // each half wears its own arm's live paint color. Redrawn every paint
  // tick: positions are live, and the colors ride the gameplay animation.
  private rebuildFillets(): void {
    const g = this.filletGfx;
    if (!g) return;
    g.clear();
    const fillHalf = this.style.threadWidth / 2;

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
    // Rounded caps: dead-end tips get a disc at the terminal colored from
    // their own live paint (nothing overlaps a free tip).
    for (const tip of this.freeTips) {
      const samples = this.chainSamples[tip.chain];
      if (!samples) continue;
      tipXY(samples, tip.atEnd);
      const ctrl = tip.atEnd ? this.ps.chains[tip.chain].length - 1 : 0;
      g.circle(this.sampleScratch[0], this.sampleScratch[1], fillHalf * 0.99);
      g.fill({
        color: this.paletteColor2(
          this.paintUAt(tip.chain, ctrl),
          this.sectionVAt(tip.chain, ctrl)
        ),
      });
    }
    // Tucked fused tips get the same disc (rounds the cap, covers its
    // corner ears and the cap/host sliver) but wear the HOST's paint: the
    // disc lies mostly on the host's face, and arm-colored discs rendered
    // as floating pale/gold dots wherever the two paints disagreed.
    for (const tip of this.fusedTips) {
      const samples = this.chainSamples[tip.chain];
      if (!samples) continue;
      tipXY(samples, tip.atEnd);
      g.circle(this.sampleScratch[0], this.sampleScratch[1], fillHalf * 0.99);
      g.fill({
        color: this.paletteColor2(
          this.paintUAt(tip.hostChain, tip.hostCtrl),
          this.sectionVAt(tip.hostChain, tip.hostCtrl)
        ),
      });
    }

    if (this.junctionArms.length === 0) return;
    const w = fillHalf * 0.97;
    const L = fillHalf * FILLET_REACH_PER_HALF * this.cuspRadius;
    const drawWedges = this.cuspRadius > 0.05 && L > w * 0.3;
    const pos = this.ps.positions;

    for (const jn of this.junctionArms) {
      let jx = 0;
      let jy = 0;
      for (const p of jn.particles) {
        jx += pos[p * 2];
        jy += pos[p * 2 + 1];
      }
      jx /= jn.particles.length;
      jy /= jn.particles.length;

      const arms: Array<{
        ang: number;
        dx: number;
        dy: number;
        color: number;
      }> = [];
      for (const a of jn.arms) {
        const samples = this.chainSamples[a.chain];
        if (!samples) continue;
        this.sampleAt(
          samples,
          this.paintArcAt(
            samples,
            a.slot + a.dir * 0.8,
            this.ps.chainBreakAfter[a.chain] < 0
          ),
          this.sampleScratch,
          0
        );
        let dx = this.sampleScratch[0] - jx;
        let dy = this.sampleScratch[1] - jy;
        const len = Math.hypot(dx, dy);
        if (len < 0.15) continue;
        dx /= len;
        dy /= len;
        // Color probe scales with the patch reach: the fillet is a FLAT
        // fill over [0, ~L] of the arm, so sample near its centroid - a
        // fixed far offset rendered dark wings inside the bright junction
        // core once cuspRadius grew the patches.
        const closedA = this.ps.chainBreakAfter[a.chain] < 0;
        let colorArc =
          this.paintArcAt(samples, a.slot, closedA) +
          a.dir * Math.max(0.15, L * 0.45);
        const totalA = samples.totalLength;
        colorArc = closedA
          ? ((colorArc % totalA) + totalA) % totalA
          : Math.max(0, Math.min(totalA, colorArc));
        arms.push({
          ang: Math.atan2(dy, dx),
          dx,
          dy,
          color: this.paletteColor2(
            this.paintUAtArc(a.chain, colorArc, closedA),
            this.sectionVAt(a.chain, a.slot + a.dir)
          ),
        });
      }
      if (arms.length < 2) continue;

      // Seal the junction center with a host-colored disc under the
      // fillets: the concave-side miter clamp can thin a host ribbon at a
      // bend, opening a nick between a tucked cap and the receded edge
      // regardless of tuck depth. Color from a pass-through occurrence
      // (one with both directions present), the thread the disc lies on.
      let hostArm = jn.arms[0];
      const seen = new Map<string, number>();
      for (const a of jn.arms) {
        const key = `${a.chain}:${a.slot}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
        if (seen.get(key) === 2) hostArm = a;
      }
      g.circle(jx, jy, fillHalf * 0.92);
      g.fill({
        color: this.paletteColor2(
          this.paintUAt(hostArm.chain, hostArm.slot),
          this.sectionVAt(hostArm.chain, hostArm.slot)
        ),
      });

      if (!drawWedges) continue;
      arms.sort((p, q) => p.ang - q.ang);

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

        const pax = o1x + A.dx * L;
        const pay = o1y + A.dy * L;
        const pbx = o2x + B.dx * L;
        const pby = o2y + B.dy * L;

        // Quadratic bezier PA -> (corner) -> PB, split at the midpoint.
        const n = FILLET_BEZIER_STEPS;
        const ptsX: number[] = [];
        const ptsY: number[] = [];
        for (let i = 0; i <= n; i++) {
          const q = i / n;
          const m0 = (1 - q) * (1 - q);
          const m1 = 2 * (1 - q) * q;
          const m2 = q * q;
          ptsX.push(m0 * pax + m1 * cx + m2 * pbx);
          ptsY.push(m0 * pay + m1 * cy + m2 * pby);
        }
        const half = n / 2;
        const polyA: number[] = [cx, cy];
        for (let i = 0; i <= half; i++) polyA.push(ptsX[i], ptsY[i]);
        g.poly(polyA).fill({ color: A.color });
        const polyB: number[] = [cx, cy];
        for (let i = half; i <= n; i++) polyB.push(ptsX[i], ptsY[i]);
        g.poly(polyB).fill({ color: B.color });
      }
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
    // Palette textures deliberately survive in PALETTE_CACHE - see its
    // comment for why destroying them here blanks the screen.
  }
}
