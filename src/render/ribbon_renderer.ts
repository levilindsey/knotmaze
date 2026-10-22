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
  extensions,
} from "pixi.js";
import type { Renderer } from "pixi.js";
import { createNoise3D } from "simplex-noise";
import type { ParticleSystem, CrossingPass } from "../physics/particle_system";
import type { ColorScheme, SectionRuns } from "../core/section_colors";
import { gamutRgb } from "../core/section_colors";
import type { AppearFxMode } from "../core/reveal_plan";
import type { RevealAnimator } from "./reveal";
import { SeededRNG } from "../util/random";
import type { SplineSamples } from "../geometry/spline_generator";
import {
  sampleClosedSpline,
  sampleOpenSpline,
  splineBend,
} from "../geometry/spline_generator";
import { ProbeTriMesh, RibbonMesh, TriFanMesh } from "./ribbon_mesh";
import {
  PaintScene,
  kData,
  knotUniformValues,
} from "./paint_model";
import {
  kCA,
  kChain,
  kSampleArc,

  type KChain,
  type KData,

  type KPaintState,
  type KIgn,
} from "./paint_math";
import { PAINT_CONST } from "./paint_const";
import { PluckOverlay } from "./pluck_overlay";
import { WebFade } from "./web_fade";
import type { ExploreCut } from "./explore_glsl";
import { pieceVis } from "../game/explore_view";
import type { ExploreBurn, ExplorePiece } from "../game/explore_view";
import type { PaintRoute } from "./junction_routes";
import {
  STRIP_STATS,
  setStripRows,
  stripTable,
  stripTexture,
} from "./arm_strip";
import {
  GAP_SLOTS,
  GapMaskTable,
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
import { setFabricGapBrute, setSampSource } from "./fabric_sdf";
import { EMERGENT_MAX, EMERGENT_ROW } from "../physics/particle_system";
import { bindGap, sectionShader } from "./ribbon/ribbon_shader";
import * as sampling from "./ribbon/sampling";
import type { PassNeighbors } from "./ribbon/sampling";
import {
  CrossingGaps,
  EMERGENT_POOL,
  GATE_LEAD,
  MARKER_SLOTS,
} from "./ribbon/crossing_gaps";
import { ExploreGaps } from "./ribbon/explore_gaps";
import { RevealFx } from "./ribbon/reveal_fx";
import { PaintState } from "./ribbon/paint_state";
import { PluckHostPart } from "./ribbon/pluck_host";
import { StripPass } from "./ribbon/strip_pass";
import { FILLET_REACH_PER_HALF, Joinery } from "./ribbon/joinery";

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
  // K580 (#glyphs2): per chain, a tangent spur's tapered root (core
  // Strand.taper; null or absent = none). update() widens the root's ribbon
  // and rebuildFillets skips the junction the root ends at. K620: `body` =
  // the chain carrying both strokes, `footC` / `footO` each side's foot as
  // a body ctrl at the same steps as `sep` (the root's paint table).
  taper?: ({
    sep: number[];
    joint: number;
    body?: number;
    footC?: number[];
    footO?: number[];
    sideC?: number;
  } | null)[];
  // K580 s5 (#glyphs2): per chain, a glyph strand (core Strand.glyph;
  // absent = none). A glyph chain's fused spur tip keeps its untucked
  // stroke from J to the tuck point (tuckFusedTips), and rebuildFillets
  // draws the stadium cap cover along it (joinery.ts).
  glyph?: boolean[];
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
  dist0?: number; // K480 s2: arc from the head to this arm's junction (branched arms).
  cont?: boolean; // K480 s2: the light carries past the far end (no end fade).
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
// K525: one piece of the minotaur's telegraph route, lit along both rims
// in the telegraph's colour (a whole run, or part of one). Its ctrl span is
// unwrapped as PaintRim's (c1 > c0; a closed chain's c1 may pass its
// length). `alpha` is the piece's own strength (the second run at half).
// `j0` / `j1` say whether that end is a junction (it skips rimGap(), as
// the hover glow does) or a mid-run point (the minotaur's spot, a
// by-length stop: no gap, a short fade, TELE_MID_FADE).
export interface PaintTele {
  chain: number;
  c0: number;
  c1: number;
  alpha: number;
  j0: boolean;
  j1: boolean;
  // K654 (K324 stage 2): the end that rides uKTeleAt (0: c0, 1: c1; the
  // real-time minotaur's lead, which then holds its whole run) and that
  // end's ctrl now. KPAINT keys on the fixed fields only; `at` is a uniform.
  ride?: 0 | 1;
  at?: number;
}
// K81: a route (junction_routes.ts PaintRoute) resolved against the static
// junction arms: the arm it arrived by and the arm it left by (null = a
// one-arm route), as junction arms (chain, particle slot, direction).
export interface RouteJArm {
  chain: number;
  slot: number;
  dir: 1 | -1;
}
export interface ResolvedRoute {
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
// PLUCK_KEY_JOINT / _MARKER / _END live in ribbon/pluck_host.ts (K5 R4).


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
// The reveal's module constants (REVEAL_TAPER_ARC and kin, FX_PATH_PTS,
// FX_TAIL, RAINBOW_SWELL_END) live in ribbon/reveal_fx.ts since K5 R3.
// Pass ctrl drift (ctrl units) under which a pending gate's show-time solve
// is reused (ribbon_renderer gateCache).
const GATE_CTRL_EPS = 0.1;

// Dense enough that tight bends near crossings (low slack) stay resolved.
const SAMPLE_SPACING = 0.09;
const MIN_SAMPLES = 48;
// K76 stage 2c: hidden thread is empty space for input below this
// visibility (pickThread, exploreShownAt: taps, hover, plucks, the tug's
// grab).
const EXPLORE_PICK_VIS = 0.5;
// K525: the telegraph rims' end fades (world units of arc). A junction end
// fades in over TELE_JUNCTION_FADE past the web's reach (rimGap, as the
// hover glow's hoverGlowFade does); a mid-run end (the minotaur's spot, a
// by-length stop) has no gap and fades over TELE_MID_FADE. Both are capped
// at RIM_END_SHARE of half the piece less its gap, so a short piece still
// peaks. CPU-side numbers in the item, never GLSL text.
// TELE_JUNCTION_FADE / TELE_MID_FADE live in ribbon/paint_state.ts since K5 R3.
// rebuildFillets' erase-width pad lives in ribbon/joinery.ts (K5 R5).

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

export class RibbonRenderer {
  root: Container;

  /** @internal ribbon */ ps: ParticleSystem;
  /** @internal ribbon */ style: RibbonStyle;
  // Knot mode: each chain's constant section color (the old per-strand
  // tint, now an aColor through the section shader).
  /** @internal ribbon */ knotRgb: Float32Array[] = [];
  private chainControls: Float32Array[] = [];
  /** @internal ribbon */ chainSamples: (SplineSamples | null)[] = [];
  /** @internal ribbon */ sampleScratch = new Float32Array(4);
  // Per crossing: neighbor crossing passes along the over and under threads.
  private overNeighbors: PassNeighbors[] = [];
  private underNeighbors: PassNeighbors[] = [];
  // Pass -> owning crossing index + whether it is the UNDER pass (the
  // twin test of the neighbor clearance - see NB_CLEAR_TWIN).
  /** @internal ribbon */ passInfo = new Map<
    CrossingPass,
    { index: number; isUnder: boolean }
  >();
  // PER-PIXEL GAPS (gap_mask.ts): the slot table (registered crossings,
  // then the emergent pool, then marker discs), this frame's windows per
  // under chain as flat [slot, centerArc, winNeg, winPos] quads (vertex
  // slot ids + junction fan masks are assigned from these), scratch
  // polylines, and the per-sample id scratch per chain.
  /** @internal ribbon */ gaps: GapMaskTable;
  /** @internal ribbon */ emergentBase = 0;
  /** @internal ribbon */ markerBase = 0;
  /** @internal ribbon */ chainWins = new Map<number, number[]>();
  // K466: per under chain, every crossing's [slot, underCenter, allNeg,
  // allPos] (arc): the stretch the over pass's casing covers, shown or not.
  /** @internal ribbon */ chainCuts = new Map<number, number[]>();
  // THE CROSSING GAPS (K5 R2): the slot solve, its scratch and the probes'
  // gap toggles live in ribbon/crossing_gaps.ts; update() and the
  // delegations call it.
  private readonly crossing = new CrossingGaps(this);
  // K5 R3: the appearance reveal and its FX (ribbon/reveal_fx.ts).
  readonly revealFx = new RevealFx(this);
  // K5 R3: the gameplay paint state (ribbon/paint_state.ts).
  readonly paintState = new PaintState(this);
  // K5 R4: the render-only plucks' host (ribbon/pluck_host.ts).
  readonly pluckHost = new PluckHostPart(this);
  // K5 R4: the strip pass (ribbon/strip_pass.ts), G3-2's seam.
  readonly stripPass = new StripPass(this);
  get fills(): RibbonMesh[] {
    return this.stripPass.fills;
  }
  /** @internal ribbon */ reextrude(chain: number): void {
    this.stripPass.collapse(chain);
  }
  /** @internal ribbon */ paintTmp: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
  /** @internal ribbon */ g3Active(): boolean {
    return !!G3;
  }
  /** @internal ribbon */ g3FlushNow(): void {
    g3Flush();
  }

  // --- PLUCK façade (K5 R4): the names other code calls, delegated ---
  get plucks(): PluckOverlay {
    return this.pluckHost.plucks;
  }
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
    avoidCtrl?: number;
  }): boolean {
    return this.pluckHost.pluck(req);
  }
  pluckPoint(chain: number, at: { ctrl?: number; arc?: number }): { x: number; y: number } | null {
    return this.pluckHost.pluckPoint(chain, at);
  }
  tugSpan(
    chain: number,
    at: { ctrl?: number; arc?: number },
    maxCtrl: number
  ): { c0: number; c1: number; tap: number } | null {
    return this.pluckHost.tugSpan(chain, at, maxCtrl);
  }
  tickPlucks(dt: number): void {
    this.pluckHost.tickPlucks(dt);
  }
  /** @internal ribbon */ withPluckCollapse(
    chain: number,
    count: number,
    base: Float32Array | null
  ): Float32Array | null {
    return this.pluckHost.withPluckCollapse(chain, count, base);
  }

  // --- PAINT façade (K5 R3): the names other code calls, delegated ---
  setSectionRuns(
    sr: SectionRuns,
    scheme: ColorScheme,
    seed: number,
    blendDist = 0
  ): void {
    this.paintState.setSectionRuns(sr, scheme, seed, blendDist);
  }
  recolor(
    baseHue: number,
    pathColor: number,
    hueGroup: number[] | undefined,
    sr: SectionRuns,
    scheme: ColorScheme,
    seed: number,
    blendDist = 0
  ): void {
    this.paintState.recolor(baseHue, pathColor, hueGroup, sr, scheme, seed, blendDist);
  }
  /** @internal ribbon */ armNextJointCtrl(
    jn: number,
    a: { chain: number; slot: number; dir: 1 | -1 }
  ): number | null {
    return this.paintState.armNextJointCtrl(jn, a);
  }
  setPaint(
    spans: PaintSpan[],
    pulses: PulseArm[],
    caps: PaintCap[],
    routes: PaintRoute[] = [],
    traveled: PaintRoute[] = []
  ): void {
    this.paintState.setPaint(spans, pulses, caps, routes, traveled);
  }
  setRim(rim: PaintRim | null): void {
    this.paintState.setRim(rim);
  }
  setRimAt(at: number): void {
    this.paintState.setRimAt(at);
  }
  setTelegraph(pieces: PaintTele[] | null): void {
    this.paintState.setTelegraph(pieces);
  }
  setFray(spans: PaintSpan[]): void {
    this.paintState.setFray(spans);
  }
  setPathColor(hex: number): void {
    this.paintState.setPathColor(hex);
  }
  tickPaint(dt: number): void {
    this.paintState.tickPaint(dt);
  }
  advanceClocks(dt: number): void {
    this.paintState.advanceClocks(dt);
  }
  needsFxRender(): boolean {
    return this.paintState.needsFxRender();
  }
  paintNeedsFrame(): number {
    return this.paintState.paintNeedsFrame();
  }
  /** @internal ribbon */ writePaintItems(): void {
    this.paintState.writePaintItems();
  }
  paintMirror(): ReturnType<PaintState["paintMirror"]> {
    return this.paintState.paintMirror();
  }
  get paintClock(): number {
    return this.paintState.paintClock;
  }
  set paintClock(v: number) {
    this.paintState.paintClock = v;
  }
  get pulseBorn(): number {
    return this.paintState.pulseBorn;
  }
  set pulseBorn(v: number) {
    this.paintState.pulseBorn = v;
  }
  get rimAt(): number {
    return this.paintState.rimAt;
  }
  get webFade(): WebFade {
    return this.paintState.webFade;
  }
  get lastPaintUpload(): number {
    return this.paintState.lastPaintUpload;
  }

  // --- REVEAL façade (K5 R3): the names other code calls, delegated ---
  beginReveal(anim: RevealAnimator | null): void {
    this.revealFx.beginReveal(anim);
  }
  revealMulAtCtrl(chain: number, ctrl: number): number {
    return this.revealFx.revealMulAtCtrl(chain, ctrl);
  }
  appearFxAlive(): number {
    return this.revealFx.appearFxAlive();
  }
  revealPin(t: number): boolean {
    return this.revealFx.revealPin(t);
  }
  /** @internal ribbon */ gateStrength(tShow: number, fxNow: number): number {
    return this.revealFx.gateStrength(tShow, fxNow);
  }
  /** @internal ribbon */ jointGate(
    key: string,
    points: Array<[number, number]>
  ): [number, number] {
    return this.revealFx.jointGate(key, points);
  }
  /** @internal ribbon */ crossingShowTime(crossing: {
    over: CrossingPass;
    under: CrossingPass;
  }): number {
    return this.revealFx.crossingShowTime(crossing);
  }
  get revealOn(): boolean {
    return this.revealFx.revealOn;
  }
  set revealOn(v: boolean) {
    this.revealFx.revealOn = v;
  }
  get fxLive(): boolean {
    return this.revealFx.fxLive;
  }
  set fxLive(v: boolean) {
    this.revealFx.fxLive = v;
  }
  get appearFx(): AppearFxMode {
    return this.revealFx.appearFx;
  }
  set appearFx(v: AppearFxMode) {
    this.revealFx.appearFx = v;
  }
  get gateOpenAt(): number {
    return this.revealFx.gateOpenAt;
  }
  set gateOpenAt(v: number) {
    this.revealFx.gateOpenAt = v;
  }
  // The module names crossing_gaps reads, as getters (nothing imports a
  // value from this file).
  /** @internal ribbon */ get G3(): G3Tables | null {
    return G3;
  }
  /** @internal ribbon */ get FILLET_REACH_PER_HALF(): number {
    return FILLET_REACH_PER_HALF;
  }
  /** @internal ribbon */ idScratch = new Map<number, Float32Array>();
  // Per gap slot: the over pass's chain (-1: marker disc / unused) and its
  // arc, written by computeGapSlot - jointMask tells a joint's own arms
  // from foreign over threads with them.
  /** @internal ribbon */ slotOverChain = new Int32Array(0);
  /** @internal ribbon */ slotOverArc = new Float32Array(0);
  // K76 2b, per gap slot: the over pass's render ctrl (its visibility gates
  // the gap), whether update() solved the slot this frame (1) or cleared it
  // (0: a far-future gate, an unused emergent slot), and whether the thread
  // reveal kept the slot's pluck footprints out because its over thread was
  // hidden (vis <= 0.5) when update() ran. (UnderWindows ramp instead: K430.)
  /** @internal ribbon */ slotOverCtrl = new Float64Array(0);
  /** @internal ribbon */ slotLive = new Uint8Array(0);
  /** @internal ribbon */ slotExploreHid = new Uint8Array(0);
  // K76 next: the last solve's UNGATED per-slot data (the under chain and
  // its cut window, the over cover and erase extents), so applyExploreGaps
  // can re-derive the gated CPU bookkeeping (underWindows, pluck
  // footprints) when a slot's hidden flag flips, without an update().
  /** @internal ribbon */ slotUnderChain = new Int32Array(0);
  /** @internal ribbon */ slotUnderCenter = new Float32Array(0);
  /** @internal ribbon */ slotCutNeg = new Float32Array(0);
  /** @internal ribbon */ slotCutPos = new Float32Array(0);
  /** @internal ribbon */ slotCoverNeg = new Float32Array(0);
  /** @internal ribbon */ slotCoverPos = new Float32Array(0);
  /** @internal ribbon */ slotAllNeg = new Float32Array(0);
  /** @internal ribbon */ slotAllPos = new Float32Array(0);
  // K430: the under-window ramp scale applyExploreGaps last wrote per slot
  // (the over pass's visibility, clamped; NaN = a fresh solve invalidated
  // it). See ribbon/explore_gaps.ts uwRampScale.
  /** @internal ribbon */ slotUwRamp = new Float32Array(0);
  // K268 PROTECT: per gap slot side (0 neg, 1 pos along the under thread),
  // the covered thread B's chain and pass ctrl where A is over B (-1: no
  // protect on that side), written by computeGapSlot; applyExploreGaps
  // turns them into the waiver factors (ribbon/explore_gaps.ts).
  /** @internal ribbon */ slotProtChain = new Int32Array(0);
  /** @internal ribbon */ slotProtCtrl = new Float64Array(0);
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
  // G3-1 probe toggle: the gap search runs brute-force (no chunk prune,
  // no sure2 exit; fabric_sdf.ts uFabricGap.z). Brute against pruned on
  // one frozen state must read 0 px apart.
  gapBrute = false;
  // tipDiscScale lives in ribbon/joinery.ts (K5 R5) with its comment;
  // same-state probes read and write it here.
  get tipDiscScale(): number {
    return this.joinery.tipDiscScale;
  }
  set tipDiscScale(v: number) {
    this.joinery.tipDiscScale = v;
  }
  // smoothMin, protect, gapMode and gapOverflow live in
  // ribbon/crossing_gaps.ts (K5 R2) with their comments; probes read and
  // write them here.
  get smoothMin(): boolean {
    return this.crossing.smoothMin;
  }
  set smoothMin(v: boolean) {
    this.crossing.smoothMin = v;
  }
  get protect(): boolean {
    return this.crossing.protect;
  }
  set protect(v: boolean) {
    this.crossing.protect = v;
  }
  get gapMode(): "arc" | "perp" {
    return this.crossing.gapMode;
  }
  set gapMode(v: "arc" | "perp") {
    this.crossing.gapMode = v;
  }
  get gapOverflow(): number {
    return this.crossing.gapOverflow;
  }
  set gapOverflow(v: number) {
    this.crossing.gapOverflow = v;
  }
  // The emergent pool's fused-joint skip (crossing_gaps.ts isJointPair,
  // K397 stage 3); false = master's slots at tuck points (A/B probes).
  get skipJointPairs(): boolean {
    return this.crossing.skipJointPairs;
  }
  set skipJointPairs(v: boolean) {
    this.crossing.skipJointPairs = v;
  }
  // Per-chain UNDER-GAP windows, rebuilt every update() from the live
  // crossing solve (emergent crossings included): flat triplets
  // [centerArc, extNeg, extPos] along the UNDER chain - where its
  // CENTERLINE is hidden. Overlay consumers (the Ariadne yarn, the fillet
  // flank clamp) use these to dip under with their host thread - see
  // underGapVisibility().
  /** @internal ribbon */ underWindows = new Map<number, number[]>();
  // K430 (K268 stage 2 item 2, the ramp): bumped whenever applyExploreGaps
  // rewrites a chain's windows outside update() (which geomRev covers), so
  // rebuildFillets' key follows the ramp without an update() per move.
  /** @internal ribbon */ uwRev = 0;
  // K81 route bands (junction_routes.ts): the path's passes through
  // junctions, oldest first; routeKey keys the fillet rebuild that draws
  // them, routedArms holds every arm ("chain:slot") of a junction holding
  // at least one resolved route - the paint caps there are dropped (the
  // band and the untraveled web decide those pixels) - unless the junction
  // is FULLY TRAVELED (K127: fullJn, every arm on a traveled pass), which
  // keeps its caps and the pre-K81 composed web under its bands.
  /** @internal ribbon */ routeKey = "";
  /** @internal ribbon */ routedArms = new Set<string>();
  /** @internal ribbon */ fullJn = new Set<number>();
  // K169: the fully traveled webs fading in, and (K191) the ones that stopped
  // being full fading out (web_fade.ts), and each record's base texel by
  // junction index (the fade rewrites J1.z there without a fillet rebuild).
  // `webFade.seconds = 0` turns the fades off (probes).
  /** @internal ribbon */ recBaseByJn = new Map<number, number>();
  // The routes resolved to junctions (junctionArms index -> its passes,
  // oldest first, at most MAX_ROUTES; b null = a one-arm route), and the
  // lookup that resolves them ("chain:slot:dir" -> junctionArms index;
  // built lazily, junctionArms never changes).
  /** @internal ribbon */ routesByJn = new Map<number, ResolvedRoute[]>();
  /** @internal ribbon */ armJunction: Map<string, number> | null = null;
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
  // K797b: the thread look (0 fill, 1 border, 2 both; panel_wiring syncs
  // it from the threadLook param): the section shader strokes the edges.
  threadLook = 0;
  // K799: the traveled path's width (0..1) and fill texture (0-3);
  // panel_wiring syncs both from the goldWidth/goldTexture params.
  goldWidth = 1;
  goldTexture = 0;
  // K525: the telegraph rims' strength and colour (0xRRGGBB), sent as
  // uKTele (w = the strength while a route is set). The fabric sets them
  // with the route; a piece's alpha multiplies the strength. teleColor is
  // TELEGRAPH_COLOR unless a sheet overrides it.
  teleStrength = 0;
  teleColor = 0xff2418;
  // High contrast's highlight prototype (K111 stage 4, K265; main.ts syncs
  // it every tick: 0 unless High contrast is on), sent as uKBase.y. 0 =
  // today's pulses.
  hcLook = 0;
  // Live flow-undulation controls (sliders; main.ts syncs them every tick
  // like cuspRadius). See the FLOW_* constants: render-side displacement
  // only, never the physics state.
  flowStrength = 0;
  flowSpeed = 1;
  /** @internal ribbon */ flowTime = 0;
  /** @internal ribbon */ flowScratch = new Float32Array(2);
  private flowNoise: (x: number, y: number, z: number) => number;
  /** @internal ribbon */ junctionArms: Array<{
    particles: number[];
    arms: Array<{ chain: number; slot: number; dir: 1 | -1 }>;
  }> = [];
  // JUNCTION CLEARANCE + layer votes: per-chain ctrls of every fused
  // joint (with its junctionArms index), so crossing marches/fades can
  // treat joints as virtual neighbors (renderCrossing) and the joinery
  // can classify junctions against nearby crossings (rebuildFillets).
  // Built once with junctionArms; empty in knot mode.
  /** @internal ribbon */ junctionArcCtrls = new Map<
    number,
    Array<{ ctrl: number; jn: number }>
  >();
  // Free (unanchored, unfused) open-chain tips: dead-end thread ends. They
  // get rounded caps, drawn with the fillets and colored from the live
  // paint.
  /** @internal ribbon */ freeTips: Array<{ chain: number; atEnd: boolean }> = [];
  // fusedTips lives in ribbon/joinery.ts (K5 R5) with its comment; the
  // constructor and the probes read it here.
  get fusedTips(): Joinery["fusedTips"] {
    return this.joinery.fusedTips;
  }
  set fusedTips(v: Joinery["fusedTips"]) {
    this.joinery.fusedTips = v;
  }
  private chainTipFused: Array<[boolean, boolean]> = [];
  // K580 s5: a glyph chain's fused tip keeps its UNTUCKED stroke from J to
  // the tuck point (ribbon/tip_stadium.ts, TipStroke), at index chain * 2 +
  // (atEnd ? 1 : 0). tuckFusedTips writes it, joinery.ts's stadium cap
  // cover reads it. Grown, never shrunk; empty without style.glyph.
  /** @internal ribbon */ glyphTipStroke: (Float32Array | null)[] = [];
  // filletLayer lives in ribbon/joinery.ts (K5 R5) with its comment; the
  // constructor and the probes read it here.
  get filletLayer(): Joinery["filletLayer"] {
    return this.joinery.filletLayer;
  }
  set filletLayer(v: Joinery["filletLayer"]) {
    this.joinery.filletLayer = v;
  }
  // filletTopLayer lives in ribbon/joinery.ts (K5 R5) with its comment;
  // the probes read it here.
  get filletTopLayer(): Joinery["filletTopLayer"] {
    return this.joinery.filletTopLayer;
  }
  set filletTopLayer(v: Joinery["filletTopLayer"]) {
    this.joinery.filletTopLayer = v;
  }
  /** @internal ribbon */ filletTopMesh: TriFanMesh | null = null;
  // MARKER DISC OCCLUDERS (start/exit dots): each owns a gap slot on its
  // thread whose "over polyline" is the disc center and whose margin is
  // CONCENTRIC - the thread is hidden inside radius (disc + gap).
  // K465: `exit` marks the exit's disc, whose gap slot the revealFinish
  // param can lift off the thread reveal's gate (explore_gaps.ts).
  /** @internal ribbon */ markerOccluders: Array<{
    chain: number;
    ctrl: number;
    radius: number;
    exit?: true;
  }> = [];
  // Per-frame mirror views (no allocation in the hot loops): the data
  // texture mirrors and one KChain per chain, refreshed by update() (the
  // chain's arc table changes every update).
  /** @internal ribbon */ kd: KData = kData();
  /** @internal ribbon */ kcv: KChain[] = [];
  /** @internal ribbon */ ignTmp: KIgn = { hit: false, tA: 0, cFrom: 0, dir: 1, t0: 0, rate: 1, tEnd: 0, span: 0 };
  // Per-chain width multiplier (reveal mask x rainbow swell), pooled, and
  // the one update() last used per chain (the pluck light path reuses it).
  /** @internal ribbon */ widthLast: (Float32Array | null)[] = [];
  // K580: per-chain scratch for withTaper's composed multiplier.
  private taperScratch = new Map<number, Float32Array>();
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
  /** @internal ribbon */ g3WinBase: Int32Array;
  /** @internal ribbon */ g3NWin: Int32Array;
  /** @internal ribbon */ g3RangeScratch = new Float32Array(256 * RANGE_FLOATS);
  // G2 SHADER PAINT: this scene's data-texture layout, the debug view
  // (probes: 0 off, 1 = ctrl, 2 = arc, 3 / 4 = the fans' per-arm views,
  // 5 = the ribbons' paint terms - see SECTION_FRAG) and the probe
  // triangle mesh (lazily built by probeTris).
  /** @internal ribbon */ paintScene: PaintScene;
  paintDebug = 0;
  private probeMesh: ProbeTriMesh | null = null;
  /** @internal ribbon */ filletMesh: TriFanMesh | null = null;
  // G2.2 SECTION RUNS (core/section_colors; evaluated by the vertex shader):
  // the noise scheme's field, junctionBlend (lattice units; a uniform), and
  // every chain's control positions at construction - the noise scheme's
  // coordinates are read there, so its colors stick to the material
  // (deterministic, whatever the pre-sim and flow do).
  /** @internal ribbon */ junctionBlend = 0;
  /** @internal ribbon */ initialControls: Float32Array[] = [];
  // Junction arm -> next joint ctrl along it (see armNextJointCtrl).
  /** @internal ribbon */ nextJointCache = new Map<string, number | null>();
  // fieldProfLen lives in ribbon/joinery.ts (K5 R5) with the profile pool;
  // probes read it here.
  get fieldProfLen(): number {
    return this.joinery.fieldProfLen;
  }
  set fieldProfLen(v: number) {
    this.joinery.fieldProfLen = v;
  }
  // Joinery rebuild gating (see rebuildFillets): bumped by every update();
  // the last rebuild's inputs.
  /** @internal ribbon */ geomRev = 0;
  // fieldProbe lives in ribbon/joinery.ts (K5 R5) with its comment;
  // probes read it here (rebuildFillets installs it each rebuild).
  get fieldProbe(): Joinery["fieldProbe"] {
    return this.joinery.fieldProbe;
  }
  set fieldProbe(v: Joinery["fieldProbe"]) {
    this.joinery.fieldProbe = v;
  }
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
  /** @internal ribbon */ baseRgb = new Float32Array(3);

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
    this.root.addChild(this.pluckHost.plucks.layer);
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
      const fill = this.stripPass.build(i, count, closed);
      this.knotRgb.push(this.knotChainRgb(i));
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
    this.revealFx.revealMask = ps.chains.map(() => null);
    // G2 SHADER PAINT: the per-scene data-texture layout (paint_model.ts).
    // Open chains are always break-after-last (arc grows with the slot).
    // (C1.w, the retired PAINT texture's base, stays 0.)
    this.paintScene = new PaintScene(
      ps.chains.map((chain, i) => ({
        nCtrl: chain.length,
        closed: ps.chainBreakAfter[i] < 0,
        count: this.fills[i].sampleCount,
        paintBase: 0,
      })),
      // K620: a root paint table per chain with a tapered root.
      ps.chains.map((_, i) => {
        const tp = style.taper?.[i];
        return tp && tp.body !== undefined && tp.footC && tp.footO ? tp.footC.length : 0;
      })
    );
    const U = knotUniformValues();
    U.uKBase[3] = style.paletteMode ? 1 : 0;
    // Gameplay paint: palette mode only; an empty declaration until the
    // fabric overlay's first setPaint.
    U.uKPaint[0] = style.paletteMode ? 1 : 0;
    this.paintState.syncGold();
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
    this.paintState.installRuns(null);

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
    this.pluckHost.overHalfNeg = new Float32Array(ps.crossings.length);
    this.pluckHost.overHalfPos = new Float32Array(ps.crossings.length);
    this.pluckHost.eraseExtentNeg = new Float32Array(ps.crossings.length);
    this.pluckHost.eraseExtentPos = new Float32Array(ps.crossings.length);
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
    this.slotUnderChain = new Int32Array(this.gaps.slots).fill(-1);
    this.slotUnderCenter = new Float32Array(this.gaps.slots);
    this.slotCutNeg = new Float32Array(this.gaps.slots);
    this.slotCutPos = new Float32Array(this.gaps.slots);
    this.slotCoverNeg = new Float32Array(this.gaps.slots);
    this.slotCoverPos = new Float32Array(this.gaps.slots);
    this.slotAllNeg = new Float32Array(this.gaps.slots);
    this.slotAllPos = new Float32Array(this.gaps.slots);
    this.slotUwRamp = new Float32Array(this.gaps.slots).fill(Number.NaN);
    this.slotProtChain = new Int32Array(this.gaps.slots * 2).fill(-1);
    this.slotProtCtrl = new Float64Array(this.gaps.slots * 2);

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
        } else if (!ps.isAnchored(chain[0]) && !style.taper?.[ci]) {
          // K580: a tapered root's start R is no dead end (its two strokes
          // carry on past it), so it gets no cap disc.
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

    // K580: the junctions a tapered root ends at (J, where the root meets
    // the spur and the two merged strokes): the root covers the merge, so
    // rebuildFillets draws no web there.
    if (style.taper && style.taper.some((t) => t)) {
      const hide = new Uint8Array(this.junctionArms.length);
      let any = false;
      this.junctionArms.forEach((jn, jnIdx) => {
        for (const a of jn.arms) {
          const tp = style.taper![a.chain];
          if (tp && a.slot === 2 * tp.joint) {
            hide[jnIdx] = 1;
            any = true;
          }
        }
      });
      this.taperHideJn = any ? hide : null;
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
    // G3-1: point every gap reader at this scene's SAMP table.
    setSampSource(g3Tables().samp.source as never);
    bindGap(this.gaps.tex);
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

  /** @internal ribbon */ g3WriteRadii(c: number, mul: Float32Array | null): void {
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
  /** @internal ribbon */ g3WriteChainRecords(): void {
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
  // A chain's SAMP base (sample units; samp_table.ts), for the gap
  // slots' ranges (ribbon/crossing_gaps.ts).
  /** @internal ribbon */ g3SampBase(chain: number): number {
    return this.g3.sampBase[chain];
  }

  /** @internal ribbon */ g3WriteRanges(entries: number): void {
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
  /** @internal ribbon */ knotChainRgb(i: number): Float32Array {
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

  // Lives in ribbon/sampling.ts (K5 R1); the class and the probes call it here.
  /** @internal ribbon */ sampleAt(
    samples: SplineSamples,
    arc: number,
    out: Float32Array,
    offset: number
  ): void {
    sampling.sampleAt(samples, arc, out, offset);
  }

  // Lives in ribbon/sampling.ts (K5 R1); since K5 R2 only probes call it.
  /** @internal ribbon */ arcAt(samples: SplineSamples, ctrl: number): number {
    return sampling.arcAt(samples, ctrl);
  }

  // Lives in ribbon/sampling.ts (K5 R1); the class and the probes call it here.
  /** @internal ribbon */ renderCtrl(pass: CrossingPass): number {
    return sampling.renderCtrl(pass);
  }

  // Lives in ribbon/sampling.ts (K5 R1); since K5 R2 only probes call it.
  /** @internal ribbon */ neighborGaps(
    samples: SplineSamples,
    pass: CrossingPass,
    neighbors: PassNeighbors
  ): [number, number] {
    return sampling.neighborGaps(samples, pass, neighbors);
  }

  /** @internal ribbon */ inspectIndex = -1;
  // Per-crossing diagnostic summary, refreshed each update():
  // [worldX, worldY, gapSpan (the under CENTERLINE's hidden arc span),
  //  overSpan (the gap polyline's arc span), selfPassDist (-1 if not self)]
  /** @internal ribbon */ diagData = new Float32Array(0);

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

    // Reveal lifecycle (ribbon/reveal_fx.ts): refresh the active flag,
    // and on the completion frame restore the full render exactly once.
    this.revealFx.lifecycle();

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
        if (fusedA || fusedB) this.stripPass.tuck(samples, fusedA, fusedB, i);
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
        this.revealFx.chainFxDone(i)
      );
      this.kcv[i] = kChain(this.kd, i, this.kcv[i]);
      const width = this.withTaper(i, samples, this.revealFx.widthMulFor(i, samples));
      this.widthLast[i] = width;
      const mul = this.stripPass.extrude(i, samples, width);
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
    for (const w of this.chainCuts.values()) w.length = 0;
    this.gaps.setEnabled(this.maskEnabled, this.maskDebug);
    setFabricGapBrute(this.gapBrute);
    this.ps.crossings.forEach((crossing, c) => {
      let tShow = -Infinity;
      if (this.fxLive) {
        const L = this.revealFx.gateLatch.length > c ? this.revealFx.gateLatch[c] : Number.NaN;
        if (!Number.isNaN(L)) {
          tShow = L;
        } else {
          const co = this.renderCtrl(crossing.over);
          const cu = this.renderCtrl(crossing.under);
          const G = this.revealFx.gateCache;
          const o = 4 * c;
          if (
            o + 3 < G.length &&
            G[o + 3] === this.revealFx.gateRev &&
            Math.abs(co - G[o + 1]) < GATE_CTRL_EPS &&
            Math.abs(cu - G[o + 2]) < GATE_CTRL_EPS
          ) {
            tShow = G[o];
          } else {
            tShow = Math.max(
              this.revealFx.passShowTime(crossing.over.chain, co),
              this.revealFx.passShowTime(crossing.under.chain, cu)
            );
            if (o + 3 < G.length) {
              G[o] = tShow;
              G[o + 1] = co;
              G[o + 2] = cu;
              G[o + 3] = this.revealFx.gateRev;
            }
          }
          if (fxNow >= tShow) this.revealFx.gateLatch[c] = tShow;
        }
        // A gate opening well in the future skips its slot solve this frame
        // (as master skipped hidden crossings): update() keeps running while
        // gates are pending, so the slot is solved before its ramp starts.
        if (fxNow < tShow - GATE_LEAD) {
          if (tShow > this.gateOpenAt) this.gateOpenAt = tShow;
          this.pluckHost.eraseExtentPos[c] = 0;
          this.pluckHost.eraseExtentNeg[c] = 0;
          this.pluckHost.overHalfPos[c] = 0;
          this.pluckHost.overHalfNeg[c] = 0;
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
    this.crossing.renderEmergent(fillHalf, gap);
    this.crossing.renderMarkerGaps(fillHalf, gap);
    this.assignGapIds();
    // K76 2b: every slot was just solved as master solves it (visibility
    // factor 1); the thread reveal scales each by its over thread's.
    if (this.explorePieces) this.applyExploreGaps();
    this.exploreUpdatePending = false;
    this.gaps.upload();
    this.writeRootTables();
    this.paintScene.flushGeom();
    if (this.g3Data) g3Flush();
    this.revealFx.drawRevealTips();
  }

  // Lives in ribbon/crossing_gaps.ts (K5 R2). update(), renderEmergent and
  // the probes call it here, so a probe's patch sees every solve.
  /** @internal ribbon */ computeGapSlot(
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
    this.crossing.computeGapSlot(
      slot,
      crossing,
      index,
      overNbIn,
      underNbIn,
      fillHalf,
      gap,
      strength,
      shown
    );
  }

  // Lives in ribbon/crossing_gaps.ts (K5 R2); update() and probes call it.
  private assignGapIds(): void {
    this.crossing.assignGapIds();
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
      return { arc: sampling.normArc(bestArc, s.totalLength, closed), px: bx, py: by, d: bd };
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

  // K466 THE ENDS: where a chain passes UNDER a crossing, from the last
  // update()'s solve: per crossing, the stretch the over pass's casing
  // covers (`all`, every lane under it) grown by `pad` world of arc at each
  // end, as flat [c0, c1, ...] chain ctrls (c0 <= c1; a ring's span is
  // unwrapped around its crossing, so it may run below 0 or past the
  // count). `shownOnly` keeps the crossings whose over pass shows (vis >=
  // 0.5 at the over pass, the 2b gate's line).
  underCutCtrls(chain: number, pad: number, shownOnly = false): number[] {
    const out: number[] = [];
    const cuts = this.chainCuts.get(chain);
    const samples = this.chainSamples[chain];
    if (!cuts || !cuts.length || !samples) return out;
    const total = samples.totalLength;
    const n = samples.controlArcLengths.length;
    if (!(total > 0) || n < 2) return out;
    const ctrlU = (x: number): number => {
      if (!samples.closed) return this.ctrlAtArc(samples, Math.max(0, Math.min(total, x)));
      const k = Math.floor(x / total);
      return k * n + this.ctrlAtArc(samples, Math.max(0, x - k * total));
    };
    for (let i = 0; i + 3 < cuts.length; i += 4) {
      const slot = cuts[i];
      if (shownOnly && this.exploreVisAt(this.slotOverChain[slot], this.slotOverCtrl[slot]) < 0.5) continue;
      const c = cuts[i + 1];
      const c0 = ctrlU(c - cuts[i + 2] - pad);
      let c1 = ctrlU(c + cuts[i + 3] + pad);
      if (samples.closed && c1 < c0) c1 += n;
      out.push(c0, c1);
    }
    return out;
  }

  // Inverse of paintArcAt: the fractional ctrl at an arc.
  /** @internal ribbon */ ctrlAtArc(samples: SplineSamples, arc: number): number {
    const cal = samples.controlArcLengths;
    const n = cal.length;
    const total = samples.totalLength;
    const a = sampling.normArc(arc, total, samples.closed);
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


  // K580 (#glyphs2): compose a tapered root's width into the multiplier
  // (null = 1): 1 + sep / threadWidth along the root, the profile read at
  // the sample's share of the root's arc on this frame's arc table, so the
  // root's edges sit on the merged strokes' outer edges; 1 from the joint
  // on. A chain without a taper returns `base` untouched.
  private withTaper(
    chain: number,
    samples: SplineSamples,
    base: Float32Array | null
  ): Float32Array | null {
    const tp = this.style.taper?.[chain];
    if (!tp) return base;
    const count = samples.count;
    let buf = this.taperScratch.get(chain);
    if (!buf || buf.length !== count) {
      buf = new Float32Array(count);
      this.taperScratch.set(chain, buf);
    }
    const c = this.kcv[chain];
    const arcJ = kCA(this.kd, c, 2 * tp.joint);
    const n = tp.sep.length - 1;
    const tw = this.style.threadWidth;
    for (let k = 0; k < count; k++) {
      const a = kSampleArc(c, k);
      let m = 1;
      if (arcJ > 0 && a < arcJ) {
        const f = (a / arcJ) * n;
        const i0 = Math.min(n - 1, Math.floor(f));
        m = 1 + (tp.sep[i0] + (tp.sep[i0 + 1] - tp.sep[i0]) * (f - i0)) / tw;
      }
      buf[k] = (base ? base[k] : 1) * m;
    }
    return buf;
  }

  // K620: each tapered root's paint table (PaintScene.setRootTable; layout
  // in paint_math, THE GLYPH ROOT'S PAINT), from this frame's samples. Per
  // step of the root's arc (R -> J, the steps of `sep`): the body's arcs of
  // both feet, the root's half-width, and each stroke's across coordinate
  // (its ribbon's uv.y = 0.5 - dot(P - c, n) / 2h, n = (-ty, tx)) under the
  // root's centerline and under the root's edge on that stroke's side.
  private rootE0 = new Float32Array(0);
  private rootE1 = new Float32Array(0);
  private rootPt = new Float32Array(12);
  private writeRootTables(): void {
    const taper = this.style.taper;
    if (!taper) return;
    const h = this.style.threadWidth / 2;
    const P = this.rootPt;
    const uvOf = (o: number, x: number, y: number): number => {
      const d = (x - P[o]) * -P[o + 3] + (y - P[o + 1]) * P[o + 2];
      return Math.min(Math.max(0.5 - d / (2 * h), 0), 1);
    };
    for (let c = 0; c < taper.length; c++) {
      const tp = taper[c];
      if (!tp || tp.body === undefined || !tp.footC || !tp.footO) continue;
      const rs = this.chainSamples[c];
      const bs = this.chainSamples[tp.body];
      if (!rs || !bs) continue;
      const nr = tp.footC.length;
      if (nr < 2 || tp.footO.length !== nr || tp.sep.length !== nr) continue;
      if (this.rootE0.length < nr * 4) {
        this.rootE0 = new Float32Array(nr * 4);
        this.rootE1 = new Float32Array(nr * 4);
      }
      const e0 = this.rootE0;
      const e1 = this.rootE1;
      const arcJ = kCA(this.kd, this.kcv[c], 2 * tp.joint);
      const bClosed = this.ps.chainBreakAfter[tp.body] < 0;
      // Which side of the root's ribbon C is on: the summed signed offset
      // of C's foot from the centerline over the interior steps (+1 = the
      // uv.y > 0.5 side, the right vertex c - n w).
      let sum = 0;
      for (let k = 0; k < nr; k++) {
        const arcC = sampling.paintArcAt(bs, tp.footC[k], bClosed);
        const arcO = sampling.paintArcAt(bs, tp.footO[k], bClosed);
        e0[k * 4] = arcC;
        e0[k * 4 + 1] = arcO;
        e0[k * 4 + 2] = h + tp.sep[k] / 2;
        e0[k * 4 + 3] = 0;
        if (k === 0 || k === nr - 1) continue;
        sampling.sampleAt(rs, (arcJ * k) / (nr - 1), P, 0);
        sampling.sampleAt(bs, arcC, P, 4);
        sum += (P[4] - P[0]) * -P[3] + (P[5] - P[1]) * P[2];
      }
      const side = sum < 0 ? 1 : -1;
      for (let k = 0; k < nr; k++) {
        sampling.sampleAt(rs, (arcJ * k) / (nr - 1), P, 0);
        sampling.sampleAt(bs, e0[k * 4], P, 4);
        sampling.sampleAt(bs, e0[k * 4 + 1], P, 8);
        const hw = e0[k * 4 + 2];
        const nx = -P[3];
        const ny = P[2];
        // C's edge: c - side n hw; O's: c + side n hw.
        e1[k * 4] = uvOf(4, P[0], P[1]);
        e1[k * 4 + 1] = uvOf(4, P[0] - side * nx * hw, P[1] - side * ny * hw);
        e1[k * 4 + 2] = uvOf(8, P[0], P[1]);
        e1[k * 4 + 3] = uvOf(8, P[0] + side * nx * hw, P[1] + side * ny * hw);
      }
      this.paintScene.setRootTable(
        c,
        tp.body,
        side,
        arcJ,
        2 * tp.joint,
        e0.subarray(0, nr * 4),
        e1.subarray(0, nr * 4)
      );
    }
  }




  // update() must keep running even when the asleep ticker would otherwise
  // skip it while the appearance FX still change GEOMETRY (the rainbow
  // swell's widths - CPU until G3) or a crossing gate is still pending (the
  // GPU fades the gap in by itself, but the CPU bookkeeping that follows a
  // shown gap - underWindows, pluck footprints - is written by update()).
  // Colors need nothing: they animate on the GPU from the clock uniforms.




  // ---- K76 THREAD REVEAL (stage 2a; docs/design/K76_reveal_mode.md) -----

  // The visible pieces (null = the mode is off), per chain, and the chains
  // they cover whole (KPAINT texel `chain` .x).
  /** @internal ribbon */ explorePieces: ExplorePiece[] | null = null;
  /** @internal ribbon */ readonly exploreByChain = new Map<number, ExplorePiece[]>();
  /** @internal ribbon */ exploreWhole = new Uint8Array(0);
  // K290: the fire's part of the declaration, and its gate's pieces per
  // chain (null: no burn, or the reveal off).
  /** @internal ribbon */ exploreBurn: ExploreBurn | null = null;
  // K76 2b: update() must re-run (needsFxRender) when a marker's gap
  // turned (the fabric redraws its markers in the same pass) or the start
  // marker's occluder changed (fabric_maze_renderer syncStartMarker). A
  // crossing slot's vis-0.5 flip no longer sets it: applyExploreGaps
  // re-derives the under window and pluck footprints from the last
  // solve's ungated data (slotUnder*/slotCover*/slotAll*). update()
  // clears it.
  exploreUpdatePending = false;
  // K465: the exit's hold under the thread reveal is lifted (the
  // `revealFinish` param; the fabric declares it each drawMarkers pass), so
  // the exit's gap slot is open from the start. explore_gaps.ts reads it.
  exploreFinish = false;
  // THE THREAD REVEAL'S GAPS (K5 R2): the gap gate, the joint gate and the
  // declaration's bookkeeping (exploreGateByChain, exploreRev) live in
  // ribbon/explore_gaps.ts; the delegations, rebuildFillets and pluck() call
  // it.
  /** @internal ribbon */ readonly explore = new ExploreGaps(this);
  // exploreContrast lives in ribbon/explore_gaps.ts (K5 R2) with its
  // comment; probes read it here.
  /** @internal ribbon */ get exploreContrast(): boolean {
    return this.explore.exploreContrast;
  }
  /** @internal ribbon */ set exploreContrast(v: boolean) {
    this.explore.exploreContrast = v;
  }

  // setExploreContrast: ribbon/explore_gaps.ts (K5 R2); the fabric calls it.
  setExploreContrast(on: boolean): void {
    this.explore.setExploreContrast(on);
  }

  // K465: the fabric declares whether the exit's hold is lifted (the
  // `revealFinish` param) on each drawMarkers pass. A change re-applies the
  // gap gate at once, as setExplore does, so the marker and its gap turn in
  // the same frame; the gate flags the update() it needs only when the exit's
  // slot really turned (never with the mode off, which restores every slot).
  setExploreFinish(lifted: boolean): void {
    if (lifted === this.exploreFinish) return;
    this.exploreFinish = lifted;
    if (this.applyExploreGaps()) this.gaps.upload();
  }

  // setExplore: ribbon/explore_gaps.ts (K5 R2); the fabric, restoreScene and
  // the probes call it here.
  setExplore(
    pieces: ExplorePiece[] | null,
    look = 0,
    breath = 1,
    burn: ExploreBurn | null = null
  ): void {
    this.explore.setExplore(pieces, look, breath, burn);
  }

  // applyExploreGaps: ribbon/explore_gaps.ts (K5 R2). update() and
  // setExplore call it here, so a probe's patch sees every gate.
  /** @internal ribbon */ applyExploreGaps(): boolean {
    return this.explore.applyExploreGaps();
  }

  // exploreCutAt: ribbon/explore_gaps.ts (K5 R2); applyExploreGaps and the
  // probes call it here.
  /** @internal ribbon */ exploreCutAt(s: number, v: number): ExploreCut {
    return this.explore.exploreCutAt(s, v);
  }

  // exploreGapState: ribbon/explore_gaps.ts (K5 R2); the fabric's probe view
  // reads it here.
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
    return this.explore.exploreGapState();
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
    const ra = this.revealFx.revealAnim as unknown as RevealClock | null;
    const scalars = new Float64Array([
      this.flowTime,
      this.paintClock,
      this.paintState.pulseBorn,
      this.revealFx.gateRev,
      this.fxLive ? 1 : 0,
      this.gateOpenAt,
      this.revealOn ? 1 : 0,
      this.revealFx.revealWas ? 1 : 0,
      this.exploreUpdatePending ? 1 : 0,
      this.revealFx.revealWall0,
      this.revealFx.fxEnd,
      this.paintState.rimAt,
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
      gateLatch: typedToB64(this.revealFx.gateLatch),
      gateCache: typedToB64(this.revealFx.gateCache),
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
    this.paintState.pulseBorn = S[2];
    this.revealFx.gateRev = S[3];
    this.fxLive = S[4] !== 0;
    this.gateOpenAt = S[5];
    this.revealOn = S[6] !== 0;
    this.revealFx.revealWas = S[7] !== 0;
    this.exploreUpdatePending = S[8] !== 0;
    this.revealFx.revealWall0 = S[9];
    this.revealFx.fxEnd = S[10];
    this.paintState.rimAt = S[11];
    const ra = this.revealFx.revealAnim as unknown as RevealClock | null;
    if (ra && S[12] !== 0) {
      ra.t = S[13];
      ra.done = S[14] !== 0;
      ra.speed = S[15];
    }
    this.revealFx.gateLatch = b64ToF64(s.gateLatch).slice();
    this.revealFx.gateCache = b64ToF64(s.gateCache).slice();
    const U = knotUniformValues() as unknown as Record<string, Float32Array>;
    const E = b64ToF32(s.uniforms.uKExplore ?? "");
    this.setExplore(s.explore, E.length > 2 ? E[1] : 0, E.length > 2 ? E[2] : 1);
    for (const k of Object.keys(s.uniforms)) {
      const v = b64ToF32(s.uniforms[k]);
      if (U[k] && U[k].length === v.length) U[k].set(v);
    }
    this.update();
  }

  // The joint gate's hidden sets: ribbon/explore_gaps.ts (K5 R2) computes
  // them (THE JOINT GATE); rebuildFillets reads them here.
  /** @internal ribbon */ exploreHideJn: Uint8Array | null = null;
  // K580: the junctions tapered roots end at (no web; the constructor).
  /** @internal ribbon */ taperHideJn: Uint8Array | null = null;
  /** @internal ribbon */ exploreHideFree: Uint8Array | null = null;

  // exploreJointShown: ribbon/explore_gaps.ts (K5 R2); syncExploreJoints
  // and the probes call it here.
  /** @internal ribbon */ exploreJointShown(jn: number): boolean {
    return this.explore.exploreJointShown(jn);
  }

  // exploreGateVisAt: ribbon/explore_gaps.ts (K5 R2); exploreJointShown and
  // the probes call it here.
  /** @internal ribbon */ exploreGateVisAt(chain: number, ctrl: number): number {
    return this.explore.exploreGateVisAt(chain, ctrl);
  }

  // exploreJointState: ribbon/explore_gaps.ts (K5 R2); probes read it here.
  exploreJointState(): { junctions: number[]; freeTips: number[] } {
    return this.explore.exploreJointState();
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

  // exploreShownSpan: ribbon/explore_gaps.ts (K5 R2); pluck() and probes
  // call it here.
  /** @internal ribbon */ exploreShownSpan(
    chain: number,
    ctrl: number,
    lim: [number, number] | null,
    len: number,
    closed: boolean
  ): [number, number] | null {
    return this.explore.exploreShownSpan(chain, ctrl, lim, len, closed);
  }



  // Register (or clear) marker disc occluders: each gets one gap slot,
  // solved every update() like a crossing's (see renderMarkerGaps). At
  // most MARKER_SLOTS discs.
  setMarkerOccluders(
    list: Array<{ chain: number; ctrl: number; radius: number; exit?: true }>
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

  // Lives in ribbon/sampling.ts (K5 R1); the class and the probes call it here.
  private paintArcAt(
    samples: SplineSamples,
    ctrl: number,
    closed: boolean
  ): number {
    return sampling.paintArcAt(samples, ctrl, closed);
  }




  // Lives in ribbon/sampling.ts (K5 R1); the class and the probes call it here.
  private sampleAtSafe(
    samples: SplineSamples,
    arc: number,
    closed: boolean,
    out: Float32Array,
    offset: number
  ): void {
    sampling.sampleAtSafe(samples, arc, closed, out, offset);
  }





  // THE JUNCTION JOINERY (K5 R5): the material lookups, the arm strips
  // and rebuildFillets live in ribbon/joinery.ts; the constructor's bend
  // hook, tickPaintPalette and the probes call rebuildFillets here.
  /** @internal ribbon */ readonly joinery = new Joinery(this);

  // cpuStripAt: ribbon/joinery.ts (K5 R5); cpuJunctionField (in the part)
  // and the probes call it here, so a probe's patch sees every call.
  /** @internal ribbon */ cpuStripAt(
    row: number,
    x: number,
    out: Float32Array
  ): void {
    this.joinery.cpuStripAt(row, x, out);
  }

  // colorAtArc: ribbon/joinery.ts (K5 R5); composedAtArc and
  // sectionColorAt call it here.
  /** @internal ribbon */ colorAtArc(chain: number, arc: number, out: Float32Array): void {
    this.joinery.colorAtArc(chain, arc, out);
  }

  // rebuildFillets: ribbon/joinery.ts (K5 R5).
  rebuildFillets(force = false): void {
    this.joinery.rebuildFillets(force);
  }

  destroy(): void {
    this.root.destroy({ children: true });
    // The accent texture and section shader deliberately survive
    // (page-lifetime singletons) - see their comment for why destroying
    // them here blanks the screen.
  }
}
