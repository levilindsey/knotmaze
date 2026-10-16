// P4 branching-maze overlay for the fabric. Since Stage 10 the traveled
// path, the branch-point choice indication, and the hover highlight all
// recolor the ACTUAL thread ribbons (RibbonRenderer palette mode: per-vertex
// palette coordinates; crossing patches copy UVs, so the weave is
// pixel-identical) - this class declares WHAT to paint and draws only the
// markers on top. The old overdrawn Graphics strokes (which could never sit
// perfectly on the ribbon) are gone.
//
// Choice arms pulse: a steady alternate tint near the junction, fading with
// distance, plus a crest that radiates OUT of the junction along each
// choosable run - while on the arrival run (the backtrack) the crest slides
// IN, phase-synced so the flow reads as continuous through the junction.
// The trains reach pulseReach along each arm (K75; RibbonRenderer).
// Hovering a choosable run lights it steadily out to the same reach,
// fading over its end like the trains (K93).
//
// MEMORY-TRAIL MODE (Stage 23, `trailMode`): instead of the full traveled
// path, only the trailing SUFFIX of the path stays gold - walked backward
// from the visual head accumulating each run's deterministic lattice
// length until `trailLength` is spent; the oldest included run gets a
// partial ctrl span and the tail ramps gold->base over the oldest 30% of
// the budget (fading footprints; trail_paint.ts, which splits the run
// holding the fade start - K93). Junction caps appear only inside the
// trail, at the trail's local intensity. The head-junction pulse/choice/
// hover machinery is untouched.

import {
  Container,
  DisplacementFilter,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import type { ParticleSystem } from "../physics/particle_system";
import type { WalkGraph, WalkEdge } from "../core/walk_graph";
import type { FabricMazeController } from "../game/fabric_controller";
import type {
  RibbonRenderer,
  PaintSpan,
  PulseArm,
  PaintCap,
  PaintRim,
} from "./ribbon_renderer";
import { legRoutes, pathLegs, traveledRoutes } from "./junction_routes";
import type { PaintRoute } from "./junction_routes";
import { trailFade, trailSpans } from "./trail_paint";
import type { MinoFog, PathViz } from "../ui/url_state";
import { spotCtrl } from "../game/minotaur";
import type { ChaseGraph, MinotaurMode, Spot } from "../game/minotaur";
import type { TurnTelegraph } from "../game/minotaur_turns";
import { firePassed, runBurnAt, type Fire } from "../game/fire";
import { finishHold, finishLifted } from "../game/explore_finish";
import { WebFade } from "./web_fade";

// What syncMinotaur draws: the real-time chase (MinotaurChase) or the
// turn-aligned minotaur (K80 turns, TurnMinotaur) - where it stands on the
// walk graph and its display mode.
export interface MinotaurView {
  readonly g: ChaseGraph;
  readonly mino: Spot;
  readonly mode: MinotaurMode;
}
import { FogBackdrop } from "./background";
import { fogArcStations, moveEnds, travelOrder } from "./fog_arc";
import { MarkerMesh } from "./marker_mesh";
import {
  chainVis,
  exploreDistances,
  exploreView,
  subtractBurnt,
  wholePieces,
} from "../game/explore_view";
import type { BurnFront, BurntSpan, ExplorePiece, ExploreView } from "../game/explore_view";
import { AppearFxSystem } from "./appear_fx";
import { EXPLORE_LOOK_DEFAULT, exploreLookHasHalo } from "./explore_glsl";

// K76 THREAD REVEAL (stage 2a; docs/design/K76.md): a newly visited
// vertex's arms grow out over this many seconds (eased), and the halo
// look's sprite (beneath the weave at the middle of each frontier fade).
const EXPLORE_GROW_S = 0.45;
// K76 stage 2c: the intro's close-in, as long as the fog's (FOG_INTRO_DUR).
const EXPLORE_CLOSE_S = 1.6;
// The fit camera's box: sampled every 2 ctrl, grown by 1 world (context
// around what shows; main.ts adds its 0.3 on top).
const EXPLORE_FIT_STEP = 2;
const EXPLORE_FIT_PAD = 1;
const HALO_TINT = 0xa8e4ff;
const HALO_ALPHA = 0.8;
// K76 stage 2c (question 9): the halo BREATHES between these alphas over
// HALO_BREATH_S; Reduced motion holds it at HALO_ALPHA, High contrast draws
// it at full strength in pure white.
const HALO_BREATH_LO = 0.6;
const HALO_BREATH_HI = 0.85;
const HALO_BREATH_S = 2.5;
import {
  DEFAULT_GLYPHS,
  MARKER_SIZE_DEFAULT,
  markerDotRadiusFor,
  markerGlyph,
  markerRadiusFor,
  sanitizeMarkerSize,
} from "./marker_glyphs";
import type { MarkerRole } from "./marker_glyphs";

// The win ring's accent around the finish marker.
const EXIT_COLOR = 0xff6b3d;

// MARKERS (K83): the start, the finish and the current position are black
// discs with a white stroked glyph (marker_glyphs.ts), drawn per pixel by
// marker_mesh.ts, all at markerRadiusFor(threadWidth, markerSize) (world
// units; K98's markerSize param, the disc's diameter in thread widths).
// K98: the start and the finish sit on a dot of their thread's own color
// (markerDotRadiusFor: a rim around the disc at every size). The win ring,
// in radii of the finish's dot (its stroke stays a fraction of the thread
// width).
const WIN_RING_R = 1.32;

// THE MINOTAUR (K80, the real-time mode): a K83 marker wearing its glyph
// over a red highlight, at the player's size (K98: the brief puts every
// marker at the head's size; until K98 it was 1.15 marker radii and never
// under 10 CSS px).
// The highlight's diameter in minotaur radii, and its opacity by mode: dim
// in the lair, plain while it roams, larger and full while it hunts.
const MINO_GLOW_DIAM = 3;
const MINO_GLOW_DIAM_HUNT = 3.8;
const MINO_GLOW_ALPHA: Record<MinotaurMode, number> = {
  lair: 0.4,
  wander: 0.65,
  pause: 0.65,
  hunt: 1,
};
// K80 turns, the telegraph's FIRST LOOK (stage 2 builds the final one): the
// run(s) the turn minotaur committed to, as a red line along the threads
// (width in thread widths, so 2-3 px at phone fit scale over 4-5 px
// threads), and a red ring around where it will stand (radius in minotaur
// radii; stroke in thread widths). Sampled every TELEGRAPH_STEP ctrl.
const TELEGRAPH_COLOR = 0xff2418;
const TELEGRAPH_WIDTH = 0.55;
const TELEGRAPH_ALPHA = 0.95;
const TELEGRAPH_RING_R = 1.45;
const TELEGRAPH_RING_W = 0.32;
const TELEGRAPH_STEP = 0.5;

// K114 burn race, the look (K290 stage 3b, brief docs/design/K114_burn.md).
// The burnt thread, the char band and ember at each front, the lit fuse and
// the smoldering arms draw in the explore programs (explore_glsl.ts, the
// FRONT and SMOLDER items; declared by syncExplore). Here: the `burn`
// frontier FX at the fronts and the fire's light under the fog.
// FIRE_FX_RATE scales the appearance's burn rates (110 smoke and 36 sparks
// a second per front); past FIRE_FX_FRONTS fronts the rate is shared, so a
// late race's many fronts emit no more than that many.
const FIRE_FX_RATE = 0.4;
const FIRE_FX_FRONTS = 12;
// The FX's travel direction: the thread's chord over this many ctrl each
// side of the front, toward the unburnt side.
const FIRE_DIR_STEP = 0.15;
// The fire's light under the fog of war: a hole at each burning front, this
// share of the explored stamps' radius; the fog redraws once a front moved
// FIRE_FOG_LIGHT_STEP world.
const FIRE_FOG_LIGHT = 0.75;
const FIRE_FOG_LIGHT_STEP = 0.3;
// The lit fuse: an ember on each run out of the entrance, this many thread
// widths past the start disc's rim (a world distance from the disc's
// center, found along the run in FIRE_FUSE_STEP lattice steps), until the
// fire spreads.
const FIRE_FUSE_OUT = 1.0;
const FIRE_FUSE_STEP = 0.1;
// UNSEEN FRONTS (K383, Levi's open call): false = a front the thread reveal
// does not show draws as nothing, as char does (its ember and FX hidden
// with the thread); true = its ember shows over a small piece of thread
// (FIRE_UNSEEN_HALF ctrl each side) and its FX emits.
const FIRE_UNSEEN_FRONTS = false;
const FIRE_UNSEEN_HALF = 0.4;
// fireEmit's stride: x, y, dx, dy, chain, ctrl, kind.
const FIRE_EMIT_STRIDE = 7;

// K290 stage 3b: whether two declarations' stretches (or fronts) match.
function sameSpanList(a: BurntSpan[] | null, b: BurntSpan[] | null): boolean {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].chain !== b[i].chain || a[i].b0 !== b[i].b0 || a[i].b1 !== b[i].b1) return false;
  }
  return true;
}
function sameFronts(a: BurnFront[] | null, b: BurnFront[] | null): boolean {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (p.chain !== q.chain || p.c !== q.c || p.dir !== q.dir || p.kind !== q.kind) return false;
  }
  return true;
}

// K408: the start marker's fade sets (its one id, 0: shown or not).
const START_SHOWN: ReadonlySet<number> = new Set([0]);
const START_HIDDEN: ReadonlySet<number> = new Set();

// The marker meshes live for the page (each scene's overlay borrows them;
// destroy() hands them back undestroyed - the PALETTE_CACHE lore). The
// spider glyph has no mesh yet (K114 decides what it marks).
type MeshRole = Exclude<MarkerRole, "spider">;
let MARKER_MESHES: Record<MeshRole, MarkerMesh> | null = null;
function markerMeshes(): Record<MeshRole, MarkerMesh> {
  if (!MARKER_MESHES) {
    MARKER_MESHES = {
      start: new MarkerMesh(),
      head: new MarkerMesh(),
      exit: new MarkerMesh(),
      minotaur: new MarkerMesh(),
    };
  }
  return MARKER_MESHES;
}

// Hit-test sampling density along runs (ctrl units).
const SAMPLE_STEP = 0.25;
// Hit-testing ignores samples this close (ctrl) to the branch point: all
// arms converge there, so taps on the junction blob itself stay ambiguous
// and are rejected rather than resolved arbitrarily.
const HEAD_EXCLUDE = 0.7;
// Traversal animation: a CONSTANT base rate (deliberately independent of
// the run's length - long runs take proportionally longer), slowed through
// bends like natural motion: the live rate is base / (1 + k * turn), where
// turn is the local bend angle per ctrl at the dot's position. The user's
// moveSpeed slider multiplies the base.
const MOVE_CTRL_PER_S = 34;
const MOVE_CURVE_SLOWDOWN = 2.2; // Per radian-per-ctrl of local turn.
const MOVE_MIN_FACTOR = 0.3;
// Memory-trail tail fade: trail_paint.ts (TRAIL_FADE_FRAC, the K93 split).

// ARIADNE STRING (Stage 24, pathViz "string"): instead of recoloring the
// thread, a thin white yarn UNSPOOLS along everywhere you walk - one
// append-only EVENT per traversal (a backtrack is its own return pass
// that U-turns at the junction; nothing is ever picked up). Each event
// stores ctrl stations plus a unit-amplitude wander profile; tension and
// world positions are applied at draw time, so the laid string rides the
// deforming/flowing threads and the tension slider reshapes it live.
const YARN_STATION_CTRL = 0.32; // Station spacing (ctrl, ~3 per world unit).
const YARN_WIDTH = 0.046; // Stroke width, lattice units.
const YARN_SHADOW_W = 0.075;
const YARN_SHADOW_OFF = 0.034; // Drop-shadow offset (down-right).
const YARN_END_WIN = 0.16; // Wander tapers over this fraction at each end.

interface YarnEvent {
  chain: number;
  c0: number; // Travel-ordered ctrl endpoints (beginMove's convention).
  c1: number;
  ctrls: Float64Array;
  wave: Float64Array; // Unit-amplitude slack-cotton wander per station.
  lane: number; // Per-pass lane bias in [-1, 1].
}

// FOG OF WAR (Stage 25, `fogOfWar`): the maze hides under a fog layer
// until explored; explored stays visible. The fog is ONE sprite whose
// texture is an offscreen 2D canvas - background-filled, with soft
// destination-out holes at every explored stamp. Stamps land where the
// head rests and, during a move, at fixed stations along its run
// (fog_arc.ts, K99: the same at any frame rate or move speed), at least
// the world spacing below apart, and persist for the whole solve: K100
// clears them only when it restarts (the controller's `restarts` moves),
// never on a backtrack to the entrance (by hand or a daily's Reset path);
// a K80 catch clears them only under K174's minoRefog (the controller's
// `refogs` moves). The radius slider re-renders every hole (a retroactive
// view setting).
// The canvas redraws only when a stamp lands or settings change, so
// the steady per-frame cost is one static sprite. Fog is a SPATIAL
// memory anchored in world space (it deliberately does not ride the
// flow field - mist hangs over places, not threads).
const FOG_CANVAS = 512;
const FOG_MARGIN = 8; // World margin around the build-time bounds.
const FOG_STAMP_SPACING = 0.8;
// Fog-edge undulation: a DisplacementFilter over the fog sprite, driven
// by a slowly drifting TILEABLE noise map. Displacing the uniform fog
// interior is invisible - only the EDGES of the lifted regions wobble,
// like living mist - and the whole effect is one GPU filter pass that
// keeps animating while the physics sleeps (pixi re-renders every
// frame). The map texture is page-lifetime cached (never destroyed).
const FOG_DISP_SCALE = 14; // Screen-px of edge wobble.
const FOG_DISP_DRIFT_X = 0.37; // World units/s of map drift.
const FOG_DISP_DRIFT_Y = 0.22;
// Fog INTRO (fowIntro): after an unfogged appearance animation the fog
// closes in - it fades in over FOG_INTRO_FADE seconds while its reveal
// radius contracts from the whole maze to fowRadius over FOG_INTRO_DUR.
const FOG_INTRO_DUR = 1.6;
const FOG_INTRO_FADE = 0.6;

// Head-position halo rendered BENEATH the weave: world-space size and a
// soft radial falloff; page-lifetime cached texture like the fog maps.
// The under-gap erases legitimately punch it (gaps clip to the backdrop).
const HEAD_GLOW_DIAM = 4.2;
const HEAD_GLOW_ALPHA = 0.3;

let HEAD_GLOW_TEX: Texture | null = null;
function headGlowTexture(): Texture {
  if (HEAD_GLOW_TEX) return HEAD_GLOW_TEX;
  const N = 128;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    N / 2,
    N / 2,
    0,
    N / 2,
    N / 2,
    N / 2
  );
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, N, N);
  HEAD_GLOW_TEX = Texture.from(canvas);
  return HEAD_GLOW_TEX;
}

// The minotaur's red highlight (K80), page-lifetime like the head's halo.
let MINO_GLOW_TEX: Texture | null = null;
function minoGlowTexture(): Texture {
  if (MINO_GLOW_TEX) return MINO_GLOW_TEX;
  const N = 128;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  grad.addColorStop(0, "rgba(255,46,30,0.95)");
  grad.addColorStop(0.45, "rgba(230,24,16,0.55)");
  grad.addColorStop(1, "rgba(200,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, N, N);
  MINO_GLOW_TEX = Texture.from(canvas);
  return MINO_GLOW_TEX;
}

let FOG_DISP_TEX: Texture | null = null;
function fogDispTexture(): Texture {
  if (FOG_DISP_TEX) return FOG_DISP_TEX;
  const N = 128;
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  // Integer wave numbers keep the field exactly periodic (tileable);
  // two decorrelated channel mixes for x/y displacement.
  const termsR: Array<[number, number, number, number]> = [
    [2, 1, 0.9, 0.3],
    [3, 2, 0.55, 2.1],
    [1, 3, 0.45, 4.4],
  ];
  const termsG: Array<[number, number, number, number]> = [
    [1, 2, 0.9, 1.2],
    [3, 1, 0.55, 3.6],
    [2, 3, 0.45, 5.1],
  ];
  const evalTerms = (
    terms: Array<[number, number, number, number]>,
    x: number,
    y: number
  ): number => {
    let v = 0;
    for (const [a, b, amp, ph] of terms) {
      v += amp * Math.sin((2 * Math.PI * (a * x + b * y)) / N + ph);
    }
    return v / 1.9; // Normalize to ~[-1, 1].
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const o = (y * N + x) * 4;
      img.data[o] = Math.round(128 + 120 * evalTerms(termsR, x, y));
      img.data[o + 1] = Math.round(128 + 120 * evalTerms(termsG, x, y));
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  FOG_DISP_TEX = Texture.from(canvas);
  FOG_DISP_TEX.source.style.addressMode = "repeat";
  return FOG_DISP_TEX;
}

interface MoveAnim {
  e: WalkEdge;
  from: number; // Ctrl at the departure end.
  to: number; // Ctrl at the destination end (the controller's new head).
  cur: number; // Current dot position (ctrl).
  kind: "advance" | "backtrack";
}

// One traversed (possibly partial) piece of the path, directed from the
// older end toward the visual head, with its lattice length.
interface TrailSeg {
  e: WalkEdge;
  from: number;
  to: number;
  len: number;
}

interface TrailPaint {
  spans: PaintSpan[];
  caps: PaintCap[];
  // K81: the route bands of the joints the trail's paint still reaches.
  routes: PaintRoute[];
  // K127: every pass of the path stack (the arms it has traveled).
  traveled: PaintRoute[];
}

export class FabricMazeRenderer {
  overContainer: Container;
  // Below the ribbon layers (main.ts inserts it under renderer.root): a
  // soft halo tracking the head dot, read through the weave's gaps.
  underContainer: Container;
  private glowSprite: Sprite;
  private ps: ParticleSystem;
  private walk: WalkGraph;
  private ribbons: RibbonRenderer;
  // The win ring (the markers themselves are MarkerMeshes).
  private gfx: Graphics;
  private markers: Record<MeshRole, MarkerMesh>;
  // The glyph each marker wears (marker_glyphs.ts ids; probes swap them
  // through setMarkerStyle) and a size multiplier on the marker radius.
  private markerGlyphIds: Record<MarkerRole, string> = { ...DEFAULT_GLYPHS };
  private markerScale = 1;
  // K98: the markers' diameter in thread widths (see the markerSize
  // accessors) and the dots' color scratch.
  private size = MARKER_SIZE_DEFAULT;
  private dotRgb = new Float32Array(3);
  private threadWidth: number;
  private hoverEdge = -1;
  // K145: the run under the pointer (or a touch press) for the hover glow,
  // and the hover point on it (an unwrapped ctrl in its span); a hovered
  // choice's run since K298 (setGlowRun).
  private glowEdge = -1;
  private glowAt = 0;
  private anim: MoveAnim | null = null;
  private scratch = new Float32Array(2);
  private flowScratch = new Float32Array(2);
  // Live traversal-speed multiplier (the moveSpeed slider; main.ts keeps
  // it synced every tick).
  moveSpeed = 1;
  // Memory-trail mode + budget (lattice units of recent path kept lit);
  // main.ts syncs both every tick and refreshes the paint on change.
  trailMode = false;
  trailLength = 5;
  // Path-visualization mode + Ariadne string tension (main.ts syncs
  // every tick; see the YARN block above).
  pathViz: PathViz = "gold";
  tension = 0.45;
  private yarnGfx: Graphics;
  private yarnEvents: YarnEvent[] = [];
  private yarnSeed = 0;
  // Fog of war (main.ts syncs the first two every tick; see FOG block).
  fogOfWar = false;
  fowRadius = 4;
  fogColor = 0x151b28;
  private fogSprite: Sprite | null = null;
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogTexture: Texture | null = null;
  private fogRect = { x0: 0, y0: 0, span: 1 };
  private fogStamps: number[] = []; // Flat explored world [x, y, ...].
  // The controller's `restarts` (K100) and `refogs` (K174) the stamps
  // belong to.
  private fogRestarts = -1;
  private fogRefogs = -1;
  private fogDirty = true;
  private fogLastRadius = -1;
  private fogDispSprite: Sprite | null = null;
  // Shader background (K21): with one active the fog draws AS that
  // background (FogBackdrop) instead of the flat sprite - see
  // setFogBackdrop.
  private fogBackdrop: FogBackdrop | null = null;
  private fogBackdropTex: Texture | null = null;
  private fogTime = 0;
  // Intro hold (fog hidden while the appearance animation plays) and the
  // close-in clock that follows (-1 = not running); see setFogHold.
  private fogHeld = false;
  private fogIntroT = -1;
  // Where the head dot was last drawn (world; mid-move included) - the
  // follow camera's target (main.ts).
  private headX = 0;
  private headY = 0;
  private headValid = false;
  // REVEAL (Stage 22): while the appearance animation runs, main.ts wires
  // this to the renderer's reveal mask. The start marker (and the head
  // dot sitting on it) shows from the first frame; the exit marker waits
  // until its thread is revealed. Null / fully-revealed = everything
  // draws. Gameplay input is never gated.
  revealQuery: ((chain: number, ctrl: number) => number) | null = null;
  // K76 THREAD REVEAL (stage 2a: driven by the __knotExplore probe hook
  // only; params, panel and the event-fed model are stage 2c): the switch,
  // reach and fade (lattice units) and the look (an EXPLORE_LOOKS index);
  // the vertices seen (-> the clock when first reached, -Infinity = shown
  // grown) and runs walked, the restart they belong to, the clock, the last
  // view and the halo sprites.
  explore = { on: false, reach: 2.5, fade: 1, look: EXPLORE_LOOK_DEFAULT };
  // K290 (burn stage 3a): how burnt thread draws, the `burnt` param (main.ts
  // syncExploration): gone (not drawn) or char (a burnt coloring).
  burntLook: "gone" | "char" = "gone";
  // K465: the `revealFinish` param (main.ts syncExploration): on, the exit's
  // marker, gap slot and indicator show from the start under the thread
  // reveal, over thread not yet seen (game/explore_finish.ts).
  revealFinish = true;
  // K290: the burnt stretches drawFire last found (null = nothing burnt or
  // the fire off), declared to the ribbons by syncExplore.
  private burnSpans: BurntSpan[] | null = null;
  private seenV = new Map<string, number>();
  private seenRuns = new Set<number>();
  private seenRestart = -1;
  private exploreClock = 0;
  private exploreLast: ExploreView | null = null;
  private exploreHeld = false;
  // K76 stage 2c: the refog count the seen set belongs to (K174's
  // `refogs`), caught moves' runs, the intro close-in's clock (-1 = idle;
  // counts up from 0 once the hold releases) and its distances (from the
  // seen set, for that many seen vertices).
  private seenRefogs = -1;
  private seenPartial: { edge: number; from: number; cur: number }[] = [];
  private exploreHoldT = -1;
  private holdDist: Map<string, number> | null = null;
  private holdDistN = -1;
  // The fit camera's box and the declaration it was measured for.
  private exploreBox: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private exploreBoxFor: ExploreView | null = null;
  private haloLayer: Container;
  private haloSprites: Sprite[] = [];
  // K80: the minotaur (syncMinotaur): its marker over its red highlight,
  // one layer above the other markers, moved above or below the fog.
  private minoLayer: Container;
  private minoGlow: Sprite;
  // K80 turns: the telegraph (its committed next move), under the glow.
  private teleGfx: Graphics;
  // K114: the burn race (drawFire); fireDrawn = a fire is declared (cleared
  // once the fire is off). fireDirty: update() ran since the last draw (the
  // threads, flow or game state moved); fireKey: the fire's clock and state
  // at the last draw. K290 stage 3b: the `burn` FX (over the yarn, under the
  // markers; made at the first front), its emitters (FIRE_EMIT_STRIDE per
  // front), the declared fronts and smoldering stretches, and the fog's
  // fire lights (world x, y per burning front; as last drawn).
  private fireFx: AppearFxSystem | null = null;
  private fireEmit: number[] = [];
  private fireFxT = -1;
  private fireFxTurn = 0;
  private burnFronts: BurnFront[] | null = null;
  private burnSmolder: BurntSpan[] | null = null;
  private fogFireLights: number[] = [];
  private fogFireDrawn: number[] = [];
  private fireDrawn = false;
  private fireDirty = true;
  private fireKey = "";
  private fireLast: Fire | null = null;
  // K408 (Levi, via K383): the start marker hides once the fire has passed
  // its thread point (firePassed at the walk start), under both burnt looks
  // and both fire clocks, fading over WEB_FADE_S 0.25 s with the gold web's
  // smoothstep (web_fade.ts, one id: no marker faded before) on the explore
  // clock. startShown is the target; the start's gap slot follows it (see
  // syncStartMarker).
  private startFade = new WebFade();
  private startShown = true;
  // Where syncMinotaur last drew it (world), and whether a fog of war
  // covers it there; minoShown false = not drawn.
  private minoShown = false;
  private minoUnderFog = false;
  private minoX = 0;
  private minoY = 0;
  private minoR = 0;

  constructor(
    ps: ParticleSystem,
    walk: WalkGraph,
    threadWidth: number,
    ribbons: RibbonRenderer
  ) {
    this.ps = ps;
    this.walk = walk;
    this.ribbons = ribbons;
    this.threadWidth = threadWidth;
    this.overContainer = new Container();
    this.yarnGfx = new Graphics();
    this.gfx = new Graphics();
    this.markers = markerMeshes();
    // Yarn under the markers: the markers stay readable on top of the
    // laid string. The head sits above the start (at the entrance the
    // player sees where they are) and below the finish (once solved, the
    // flag and the win ring show). (Start/exit under-gaps are gap slots
    // owned by the ribbon renderer - see syncMarkerOccluders.)
    this.overContainer.addChild(
      this.yarnGfx,
      this.markers.start.mesh,
      this.markers.head.mesh,
      this.markers.exit.mesh,
      this.gfx
    );
    // K80: the minotaur above them all (on the player's dot, a catch shows
    // the minotaur). Hidden until a real-time chase syncs it.
    this.minoGlow = new Sprite(minoGlowTexture());
    this.minoGlow.anchor.set(0.5);
    this.teleGfx = new Graphics();
    this.teleGfx.visible = false;
    this.minoLayer = new Container();
    this.minoLayer.addChild(
      this.teleGfx,
      this.minoGlow,
      this.markers.minotaur.mesh
    );
    this.minoLayer.visible = false;
    this.overContainer.addChild(this.minoLayer);
    for (const m of Object.values(this.markers)) m.hide();
    // K408: the meshes outlive the scene; a new one starts with the start
    // marker shown (the fade's first retarget only learns the set).
    this.markers.start.mesh.alpha = 1;
    this.markers.start.mesh.renderable = true;
    this.startFade.retarget(START_SHOWN, 0);
    this.syncMarkerOccluders();
    this.underContainer = new Container();
    this.haloLayer = new Container();
    this.underContainer.addChild(this.haloLayer);
    this.glowSprite = new Sprite(headGlowTexture());
    this.glowSprite.anchor.set(0.5);
    this.glowSprite.width = HEAD_GLOW_DIAM;
    this.glowSprite.height = HEAD_GLOW_DIAM;
    this.glowSprite.alpha = HEAD_GLOW_ALPHA;
    this.glowSprite.visible = false;
    this.underContainer.addChild(this.glowSprite);
  }

  setWidths(threadWidth: number): void {
    this.threadWidth = threadWidth;
    this.syncMarkerOccluders();
  }

  // K98: the markers' diameter in thread widths (the markerSize param;
  // main.ts keeps it synced). A change resizes the start/exit gap slots;
  // the renderer re-solves them on its next update().
  get markerSize(): number {
    return this.size;
  }

  set markerSize(v: number) {
    const s = sanitizeMarkerSize(v);
    if (s === this.size) return;
    this.size = s;
    this.syncMarkerOccluders();
  }

  // The black disc's world radius: the head, the minotaur, and the start
  // and finish discs (whose colored dots are markerDotRadius).
  markerRadius(): number {
    return markerRadiusFor(this.threadWidth, this.size, this.markerScale);
  }

  // Start/exit markers are DISC OCCLUDERS in the ribbon renderer: each
  // owns a gap slot that hides its thread inside radius (dot + gap),
  // concentric with the dot by construction (markerWorld). The finish's
  // off-screen indicator (main.ts) reads it too: its "on screen" test needs
  // the whole marker in view.
  markerDotRadius(): number {
    return markerDotRadiusFor(this.threadWidth, this.size, this.markerScale);
  }

  // The glyph a marker wears now; the finish's indicator draws the same.
  markerGlyphId(role: MarkerRole): string {
    return this.markerGlyphIds[role];
  }

  // Swap marker glyphs (marker_glyphs.ts ids) and/or scale the marker
  // radius - placeholder exploration (the K83 contact sheets). A size
  // change resizes the start/exit gap slots; the renderer re-solves them
  // on its next update(), and the markers take the size when next drawn.
  setMarkerStyle(style: {
    start?: string;
    exit?: string;
    head?: string;
    minotaur?: string;
    scale?: number;
  }): void {
    for (const role of ["start", "exit", "head", "minotaur"] as const) {
      const id = style[role];
      if (id === undefined) continue;
      this.markerGlyphIds[role] = id;
      this.markers[role].setGlyph(markerGlyph(id, role));
    }
    if (style.scale !== undefined && style.scale > 0) {
      this.markerScale = style.scale;
      this.syncMarkerOccluders();
    }
  }

  markerStyle(): Record<MarkerRole, string> & {
    scale: number;
    size: number;
    radius: number;
    dotRadius: number;
  } {
    return {
      ...this.markerGlyphIds,
      scale: this.markerScale,
      size: this.size,
      radius: this.markerRadius(),
      dotRadius: this.markerDotRadius(),
    };
  }

  private syncMarkerOccluders(): void {
    const s = this.walk.vertices.get(this.walk.start);
    const e = this.walk.vertices.get(this.walk.exit);
    if (!s || !e) return;
    const r = this.markerDotRadius();
    // K465: `exit` names the exit's slot, which the revealFinish param lifts
    // off the thread reveal's gate (the start's slot is never lifted).
    const exit = { chain: e.chain, ctrl: e.ctrl, radius: r, exit: true as const };
    // K408: a start marker the fire has passed gives up its slot.
    this.ribbons.setMarkerOccluders(
      this.startShown ? [{ chain: s.chain, ctrl: s.ctrl, radius: r }, exit] : [exit]
    );
  }

  // K408: show or hide the start marker (drawFire, every frame). A change of
  // target starts the fade from the level on show (no jump on a reversal)
  // and moves the start's gap slot at once: it leaves as the fade-out
  // starts, so under the char look the burnt thread beneath shows through
  // the fading disc instead of a hole that closes when the fade ends, and
  // it returns as a fade-in starts (a restart). The slot is re-solved on
  // the next update(), which exploreUpdatePending forces at rest.
  private syncStartMarker(shown: boolean): void {
    if (shown !== this.startShown) {
      this.startShown = shown;
      this.startFade.retarget(shown ? START_SHOWN : START_HIDDEN, this.exploreClock);
      this.syncMarkerOccluders();
      this.ribbons.exploreUpdatePending = true;
    }
    const k = this.startFade.level(0, this.exploreClock);
    const m = this.markers.start.mesh;
    m.alpha = k;
    m.renderable = k > 0;
  }

  // K408 probes: the start marker's target and drawn level.
  get startMarkerState(): { shown: boolean; level: number } {
    return { shown: this.startShown, level: this.markers.start.mesh.alpha };
  }

  // Track the hovered choosable run; returns true when it changed (the
  // caller then refreshes the paint declaration).
  setHover(edgeId: number): boolean {
    if (edgeId === this.hoverEdge) return false;
    this.hoverEdge = edgeId;
    return true;
  }

  // K145: the thread point under the pointer for the hover glow (a chain
  // and its fractional ctrl, as RibbonRenderer.pickThread finds them;
  // chain < 0 = none). Returns true when the run under it changed (the
  // caller then refreshes the paint declaration); a move along the same
  // run only moves the glow's center, a uniform.
  setGlow(chain: number, ctrl: number): boolean {
    let eid = -1;
    let at = 0;
    const ch = chain >= 0 ? this.ps.chains[chain] : undefined;
    if (ch && ch.length > 0) {
      const n = ch.length;
      const closed = this.ps.chainBreakAfter[chain] < 0;
      for (const e of this.walk.edges) {
        if (e.chain !== chain) continue;
        // A closed chain's run may be unwrapped past its length.
        const x = closed ? e.ctrlA + ((((ctrl - e.ctrlA) % n) + n) % n) : ctrl;
        if (x >= e.ctrlA && x <= e.ctrlB) {
          eid = e.id;
          at = x;
          break;
        }
      }
    }
    this.glowAt = at;
    if (eid === this.glowEdge) {
      this.ribbons.setRimAt(at);
      return false;
    }
    this.glowEdge = eid;
    return true;
  }

  // K298: the hover glow on a choice, run eid (edgeAt's pick): centered at
  // the nearest point of the run's sample polyline (edgeAt's samples) to
  // the world point, an unwrapped ctrl in [ctrlA, ctrlB]. Returns true when
  // the run changed, as setGlow does.
  setGlowRun(eid: number, x: number, y: number): boolean {
    const e = eid >= 0 ? this.walk.edges[eid] : undefined;
    if (!e) return this.setGlow(-1, 0);
    let at = e.ctrlA;
    let bestD = Infinity;
    let pf = 0;
    let px = 0;
    let py = 0;
    for (let f = e.ctrlA, first = true; ; f += SAMPLE_STEP, first = false) {
      const ff = Math.min(f, e.ctrlB);
      this.pointFlowed(e.chain, this.ctrlMod(e.chain, ff), this.scratch, 0);
      const qx = this.scratch[0];
      const qy = this.scratch[1];
      // The nearest point of the chord from the previous sample (a lone
      // first sample is a chord of length 0).
      const ax = first ? qx : px;
      const ay = first ? qy : py;
      const af = first ? ff : pf;
      const dx = qx - ax;
      const dy = qy - ay;
      const l2 = dx * dx + dy * dy;
      const t =
        l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const ex = ax + t * dx - x;
      const ey = ay + t * dy - y;
      const d = ex * ex + ey * ey;
      if (d < bestD) {
        bestD = d;
        at = af + t * (ff - af);
      }
      pf = ff;
      px = qx;
      py = qy;
      if (ff >= e.ctrlB) break;
    }
    this.glowAt = at;
    if (eid === this.glowEdge) {
      this.ribbons.setRimAt(at);
      return false;
    }
    this.glowEdge = eid;
    return true;
  }

  // K145: the hover glow's run as the ribbons declare it. Since K298 a
  // choice glows too, on top of its pulses and its own hover look (Levi:
  // "render it in-addition to the adjacent-to-current-juction highlight
  // for those segments"; K145 had left choices out).
  private rimDecl(): PaintRim | null {
    const eid = this.glowEdge;
    if (eid < 0) return null;
    const e = this.walk.edges[eid];
    return { chain: e.chain, c0: e.ctrlA, c1: e.ctrlB, at: this.glowAt };
  }

  // World position on a chain plus the ribbons' flow-undulation offset:
  // the ribbons render their splines through RibbonRenderer's flow field,
  // so every position this overlay draws or hit-tests must ride the same
  // field or the markers detach from the undulating threads. Exact
  // pass-through at flowStrength 0.
  private pointFlowed(
    chain: number,
    ctrl: number,
    out: Float32Array,
    offset: number
  ): void {
    this.ps.pointOnChain(chain, ctrl, out, offset);
    this.ribbons.flowOffset(out[offset], out[offset + 1], this.flowScratch);
    out[offset] += this.flowScratch[0];
    out[offset + 1] += this.flowScratch[1];
  }

  // Live world position of a walk vertex (any fused occurrence works: the
  // junction coincidence holds them together).
  vertexWorld(id: string, out: Float32Array, offset: number): void {
    const v = this.walk.vertices.get(id)!;
    this.pointFlowed(v.chain, this.ctrlMod(v.chain, v.ctrl), out, offset);
  }

  private ctrlMod(chain: number, f: number): number {
    const len = this.ps.chains[chain].length;
    return ((f % len) + len) % len;
  }

  // Nearest tappable run to a world point among the current choices, or -1.
  // Samples each run's full span, excluding the neighborhood of the branch
  // point where all arms coincide. maxD is the pick radius from the
  // centerline (world): main.ts pickRadius (K298), touch's max(0.9, 1.6 x
  // threadWidth), the mouse's half-width plus its choice margin.
  edgeAt(
    x: number,
    y: number,
    controller: FabricMazeController,
    maxD: number
  ): number {
    let best = -1;
    let bestD = maxD * maxD;
    for (const eid of controller.choices()) {
      const e = this.walk.edges[eid];
      // Exclude the neighborhood of every end that touches the head (both
      // ends of a self-loop run return to the branch point).
      const exA = e.va === controller.head;
      const exB = e.vb === controller.head;
      for (let f = e.ctrlA; ; f += SAMPLE_STEP) {
        const ff = Math.min(f, e.ctrlB);
        const nearHead =
          (exA && ff - e.ctrlA <= HEAD_EXCLUDE) ||
          (exB && e.ctrlB - ff <= HEAD_EXCLUDE);
        if ((!nearHead || e.ctrlB - e.ctrlA <= 2 * HEAD_EXCLUDE) && this.shownAt(e.chain, ff)) {
          this.pointFlowed(e.chain, this.ctrlMod(e.chain, ff), this.scratch, 0);
          const dx = this.scratch[0] - x;
          const dy = this.scratch[1] - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = eid;
          }
        }
        if (ff >= e.ctrlB) break;
      }
    }
    return best;
  }

  // K76 stage 2c: under the thread reveal, hidden thread is empty space
  // for every tap and hover (the ribbons' exploreShownAt). K290: so is
  // burnt thread under the `burnt` param's "gone", reveal on or off.
  private shownAt(chain: number, ctrl: number): boolean {
    if (!this.ribbons.exploreOn) return true;
    return this.ribbons.exploreShownAt(chain, this.ctrlMod(chain, ctrl));
  }

  // K80 turns: the distance from a world point to the nearest tappable
  // sample of the current choices, every run's head neighborhood excluded
  // (short runs too), or Infinity. The wait tap (main.ts onHead) wins only
  // nearer the junction than this, so a tap on a run's arm stays a move.
  runDistance(x: number, y: number, controller: FabricMazeController): number {
    let bestD = Infinity;
    for (const eid of controller.choices()) {
      const e = this.walk.edges[eid];
      const exA = e.va === controller.head;
      const exB = e.vb === controller.head;
      for (let f = e.ctrlA; ; f += SAMPLE_STEP) {
        const ff = Math.min(f, e.ctrlB);
        const nearHead =
          (exA && ff - e.ctrlA <= HEAD_EXCLUDE) ||
          (exB && e.ctrlB - ff <= HEAD_EXCLUDE);
        if (!nearHead && this.shownAt(e.chain, ff)) {
          this.pointFlowed(e.chain, this.ctrlMod(e.chain, ff), this.scratch, 0);
          const dx = this.scratch[0] - x;
          const dy = this.scratch[1] - y;
          bestD = Math.min(bestD, dx * dx + dy * dy);
        }
        if (ff >= e.ctrlB) break;
      }
    }
    return Math.sqrt(bestD);
  }

  // --- Traversal animation: game state moves instantly; the dot and the
  // gold front travel the thread's actual curve to catch up (ctrl-space
  // interpolation through pointOnChain, so the motion follows every bend).

  // K169: a fully traveled web is still fading in or out (needsFrame()'s
  // event bit, the frame loop's PAINT poll since K6-1).
  get webFading(): boolean {
    return this.ribbons.webFade.active;
  }

  // K6-1, the frame loop's PAINT polls (the ribbons' paintNeedsFrame()
  // covers the paint itself). Bit 2 (PAINT_AMBIENT): the fog shows, and its
  // edges wobble every frame (tickFog). Bit 1 (PAINT): the fog's intro, the
  // fire's FX (fronts spawning, particles alive), a web fade, the start
  // marker's fade (K408), the explore growth and close-in, and the halos'
  // breath (K76).
  needsFrame(): number {
    let need = 0;
    if (this.fogOfWar && this.fogDispSprite) need |= 2;
    if (this.fogOfWar && this.fogIntroT >= 0) need |= 1;
    if (this.fireEmit.length > 0 && !this.exploreStill) need |= 1;
    if (this.fireFx && this.fireFx.aliveCount > 0) need |= 1;
    if (this.webFading) need |= 1;
    // (startFade is never stepped, so its fade is never forgotten: test
    // the level against its end.)
    if (this.startFade.has(0) && this.startFade.level(0, this.exploreClock) !== (this.startShown ? 1 : 0)) {
      need |= 1;
    }
    if (this.explore.on) {
      if (!this.exploreHeld && this.exploreHoldT >= 0) need |= 1;
      else if (this.exploreGrowing(0)) need |= 1;
    }
    if (!this.exploreStill && !this.exploreHc) {
      for (const sp of this.haloSprites) {
        if (sp.visible) {
          need |= 1;
          break;
        }
      }
    }
    return need;
  }

  get animating(): boolean {
    return this.anim !== null;
  }

  // K80 turns: how far the in-flight move has got, 0..1 in ctrl along its
  // run (1 = no move in flight). The turn minotaur's run plays over the same
  // stretch of time.
  get moveProgress(): number {
    const a = this.anim;
    if (!a || a.to === a.from) return 1;
    const f = (a.cur - a.from) / (a.to - a.from);
    return f <= 0 ? 0 : f >= 1 ? 1 : f;
  }

  // K80 turns: how long tickAnim takes over `ctrl` of thread at the current
  // moveSpeed, before the slowdown through bends (a wait's own animation).
  moveSeconds(ctrl: number): number {
    return ctrl / (MOVE_CTRL_PER_S * Math.max(1e-3, this.moveSpeed));
  }

  // Start animating the move the controller just performed. The controller
  // head is already at the destination; the dot departs the other end.
  beginMove(
    edgeId: number,
    kind: "advance" | "backtrack",
    controller: FabricMazeController
  ): void {
    // A tap mid-flight snaps the previous move: its dot lands at once, and
    // the fog still lifts along the rest of its run (K99).
    this.finishFogArc();
    if (this.anim) this.exploreArrive(this.anim);
    this.anim = null;
    const e = this.walk.edges[edgeId];
    // A self-loop run's direction is unknowable: it sweeps A -> B (moveEnds,
    // shared with the fog's restore, K100).
    const { from, to } = moveEnds(e, controller.head);
    this.anim = { e, from, to, cur: from, kind };
    // String mode: every move - advance OR backtrack - lays one new yarn
    // pass in the dot's travel direction (the backtrack pass IS the
    // U-turning return; nothing is removed).
    if (this.pathViz === "string") this.pushYarnEvent(e, from, to);
    this.emitAnimFrame(controller);
  }

  cancelMove(): void {
    this.finishFogArc();
    if (this.anim) this.exploreArrive(this.anim);
    this.anim = null;
  }

  // K80's catch: the move ends where the dot is, and the fog (which a
  // catch keeps, K100) lifts only as far as the dot got. cancelMove would
  // uncover the rest of the run, right for a move the controller made in
  // full; a caught player never got there.
  stopMove(): void {
    // K76 stage 2c: the thread reveal shows the run only up to the dot.
    const a = this.anim;
    if (a && !this.seenRuns.has(a.e.id)) {
      this.seenPartial.push({ edge: a.e.id, from: a.from, cur: a.cur });
    }
    this.anim = null;
  }

  // K99: lift the fog at the stations of the in-flight move between `prev`
  // and `cur` (fogArcStations), wherever the threads lie now.
  private stampFogArc(a: MoveAnim, prev: number, cur: number): void {
    if (!this.fogOfWar) return;
    for (const f of fogArcStations(a.from, a.to, prev, cur)) {
      this.pointFlowed(a.e.chain, this.ctrlMod(a.e.chain, f), this.scratch, 0);
      this.maybeStampFog(this.scratch[0], this.scratch[1]);
    }
  }

  // A move cut short still uncovers its whole run.
  private finishFogArc(): void {
    if (this.anim) this.stampFogArc(this.anim, this.anim.cur, this.anim.to);
  }

  // Advance the in-flight move; on arrival, hand back to the full refresh.
  // The rate slows through bends (natural motion): local turn measured
  // from three points one ctrl apart around the dot.
  tickAnim(dt: number, controller: FabricMazeController): void {
    const a = this.anim;
    if (!a) return;
    const dir = Math.sign(a.to - a.from) || 1;

    const chain = this.ps.chains[a.e.chain];
    const len = chain.length;
    const closed = this.ps.chainBreakAfter[a.e.chain] < 0;
    const at = (f: number): [number, number] => {
      const fc = closed
        ? ((f % len) + len) % len
        : Math.max(0, Math.min(len - 1, f));
      this.pointFlowed(a.e.chain, fc, this.scratch, 0);
      return [this.scratch[0], this.scratch[1]];
    };
    const [x0, y0] = at(a.cur - 1);
    const [x1, y1] = at(a.cur);
    const [x2, y2] = at(a.cur + 1);
    const v1x = x1 - x0;
    const v1y = y1 - y0;
    const v2x = x2 - x1;
    const v2y = y2 - y1;
    const n1 = Math.hypot(v1x, v1y) || 1;
    const n2 = Math.hypot(v2x, v2y) || 1;
    const cosT = Math.max(
      -1,
      Math.min(1, (v1x * v2x + v1y * v2y) / (n1 * n2))
    );
    const turn = Math.acos(cosT); // Radians over ~2 ctrl.
    const factor = Math.max(
      MOVE_MIN_FACTOR,
      1 / (1 + MOVE_CURVE_SLOWDOWN * turn)
    );

    const prev = a.cur;
    a.cur += dir * MOVE_CTRL_PER_S * this.moveSpeed * factor * dt;
    const arrived = (dir > 0 && a.cur >= a.to) || (dir < 0 && a.cur <= a.to);
    // The fog lifts at every station the dot passed this frame, not only
    // where the frame left it (K99).
    this.stampFogArc(a, prev, arrived ? a.to : a.cur);
    if (arrived) {
      this.exploreArrive(a);
      this.anim = null;
      this.update(controller);
      return;
    }
    this.emitAnimFrame(controller);
  }

  // K80: the real-time mode drives the in-flight move from the chase's
  // clock instead of tickAnim's own pace. `frac` is the player's progress
  // along the run, 0..1 (MinotaurChase.playerProgress: linear in ctrl, the
  // way spotCtrl places the minotaur, and in beginMove's travel direction).
  // At 1 the dot lands and the full refresh runs.
  setMoveProgress(frac: number, controller: FabricMazeController): void {
    const a = this.anim;
    if (!a) return;
    const f = Math.max(0, Math.min(1, frac));
    const cur = a.from + (a.to - a.from) * f;
    // Forward only: K99's stations are stamped once, in travel order.
    if ((cur - a.cur) * (Math.sign(a.to - a.from) || 1) > 0) {
      const prev = a.cur;
      a.cur = cur;
      this.stampFogArc(a, prev, cur);
    }
    if (f >= 1) {
      this.exploreArrive(a);
      this.anim = null;
      this.update(controller);
      return;
    }
    this.emitAnimFrame(controller);
  }

  // --- The minotaur (K80). Drawn from the chase every frame by main.ts.

  // Place the minotaur where `chase` has it (null: no minotaur, hidden):
  // the real-time chase or, K80 turns, the turn-aligned minotaur, whose
  // committed next move `telegraph` draws (null: none to show).
  // `fog` decides whether it shows through the fog of war: "always",
  // "hunting" (only while it hunts) or "never" (only where the fog has
  // lifted). Like the exit marker, it waits for the intro to draw its
  // thread. The telegraph rides the minotaur's layer, so the same fog rule
  // covers it.
  syncMinotaur(
    chase: MinotaurView | null,
    fog: MinoFog,
    telegraph: TurnTelegraph | null = null
  ): void {
    this.minoShown = false;
    if (!chase) {
      this.minoLayer.visible = false;
      return;
    }
    const at = spotCtrl(this.walk, chase.g, chase.mino);
    const ctrl = this.ctrlMod(at.chain, at.ctrl);
    if (this.revealQuery && this.revealQuery(at.chain, ctrl) < 0.98) {
      this.minoLayer.visible = false;
      return;
    }
    const over = fog === "always" || (fog === "hunting" && chase.mode === "hunt");
    // K76 stage 2c (question 2): the thread reveal has no fog sprite to slip
    // under, so a minotaur the rule keeps under the fog hides while its
    // thread point is not solid (the exit marker's test).
    if (!over && this.explore.on && this.ribbons.exploreVisAt(at.chain, ctrl) < 0.98) {
      this.minoLayer.visible = false;
      return;
    }
    const m = chase.mino;
    if (m.edge < 0 && m.vertex === chase.g.exit) {
      // In its lair: concentric with the exit marker it covers.
      this.ribbons.markerWorld(at.chain, at.ctrl, this.scratch);
    } else {
      this.pointFlowed(at.chain, ctrl, this.scratch, 0);
    }
    const x = this.scratch[0];
    const y = this.scratch[1];
    const r = this.markerRadius();
    const d =
      r * (chase.mode === "hunt" ? MINO_GLOW_DIAM_HUNT : MINO_GLOW_DIAM);
    this.minoGlow.position.set(x, y);
    this.minoGlow.width = d;
    this.minoGlow.height = d;
    this.minoGlow.alpha = MINO_GLOW_ALPHA[chase.mode];
    const mk = this.markers.minotaur;
    mk.setGlyph(markerGlyph(this.markerGlyphIds.minotaur, "minotaur"));
    mk.place(x, y, r);
    this.minoLayer.visible = true;
    // Over the fog, or right under it (the fog sprite and its twins are
    // the overlay's topmost children once ensureFog has run).
    const kids = this.overContainer.children;
    const li = kids.indexOf(this.minoLayer);
    const fi = this.fogSprite ? kids.indexOf(this.fogSprite) : -1;
    if (over && fi > li) {
      this.overContainer.setChildIndex(this.minoLayer, kids.length - 1);
    } else if (!over && fi >= 0 && li > fi) {
      this.overContainer.setChildIndex(this.minoLayer, fi);
    }
    this.minoShown = true;
    // Under the reveal too: an indicator must not give it away (K73).
    this.minoUnderFog = (this.fogOfWar || this.explore.on) && !over;
    this.minoX = x;
    this.minoY = y;
    this.minoR = r;
    this.drawTelegraph(chase.g, telegraph, r);
  }

  // K80 turns, the telegraph's first look: a red line along each committed
  // run, oriented from the junction it leaves, and a red ring where the
  // minotaur will end its turn (around itself when it stays). Redrawn every
  // frame: the threads move under it.
  private drawTelegraph(
    g: ChaseGraph,
    t: TurnTelegraph | null,
    r: number
  ): void {
    const gfx = this.teleGfx;
    gfx.clear();
    if (!t) {
      gfx.visible = false;
      return;
    }
    const pts: number[] = [];
    let a = t.from;
    for (const [e, b] of t.steps) {
      const we = this.walk.edges[e];
      if (!we) break;
      const fwd = g.ea[e] === a;
      const c0 = fwd ? we.ctrlA : we.ctrlB;
      const c1 = fwd ? we.ctrlB : we.ctrlA;
      const n = Math.max(1, Math.ceil(Math.abs(c1 - c0) / TELEGRAPH_STEP));
      for (let i = pts.length === 0 ? 0 : 1; i <= n; i++) {
        const c = c0 + ((c1 - c0) * i) / n;
        this.pointFlowed(we.chain, this.ctrlMod(we.chain, c), this.scratch, 0);
        pts.push(this.scratch[0], this.scratch[1]);
      }
      a = b;
    }
    const w = this.threadWidth;
    if (pts.length >= 4) {
      gfx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) gfx.lineTo(pts[i], pts[i + 1]);
      gfx.stroke({
        color: TELEGRAPH_COLOR,
        width: w * TELEGRAPH_WIDTH,
        alpha: TELEGRAPH_ALPHA,
        cap: "round",
        join: "round",
      });
    }
    // The ring: at the destination's live position (the exit's lair spot
    // never comes up: it never returns there).
    const dv = this.walk.vertices.get(g.ids[t.dest]);
    if (dv) {
      this.pointFlowed(dv.chain, this.ctrlMod(dv.chain, dv.ctrl), this.scratch, 0);
      this.polyCircle(gfx, this.scratch[0], this.scratch[1], r * TELEGRAPH_RING_R, 48);
      gfx.stroke({
        color: TELEGRAPH_COLOR,
        width: w * TELEGRAPH_RING_W,
        alpha: TELEGRAPH_ALPHA,
      });
    }
    gfx.visible = true;
  }

  // K114 burn race; its look since K290 stage 3b. The fire's clock rides
  // the dot: mid-move it is the clock before the move plus the share of the
  // run the dot has covered, so the fire advances with the head's animation
  // instead of jumping at its end. Every run's burnt stretches (the `burnt`
  // param: gone or char), its fronts (a char band ahead of each and an
  // ember at it), the lit fuse (an ember on each run out of the entrance,
  // just past the start disc, while the clock is within the delay: at
  // h = 0, until the first move) and the smoldering arms (while the dot
  // stands at its junction in a live race) go to the ribbons as one
  // declaration (setBurn, syncExplore): the explore programs draw them
  // under the crossing gaps, and under the thread reveal only where it
  // shows thread. Drawn here: the `burn` FX at the fronts (tickFireFx) and
  // the fire's light under the fog (syncFireLights, renderFog). Called
  // every frame, it recomputes only when update() ran since (the threads,
  // the flow or the game state moved: update() rides every ribbon render)
  // or the fire's clock or state changed; the FX tick every frame.
  drawFire(controller: FabricMazeController): void {
    const fire = controller.fire;
    if (!fire) {
      if (this.fireDrawn) {
        this.fireDrawn = false;
        this.fireEmit.length = 0;
        this.fireFx?.clear();
        this.fireFxT = -1;
        this.syncFireLights();
      }
      this.setBurn(null, null, null);
      this.syncStartMarker(true);
      return;
    }
    const a = this.anim;
    // K114 stage 2: the real-time fire's L is its clock (main.ts feeds the
    // controller every frame, and the dot rides the same clock).
    const L =
      fire.clock === "realtime"
        ? controller.fireNow
        : controller.walkedDist - (a ? (1 - this.moveProgress) * a.e.length : 0);
    this.syncStartMarker(!firePassed(fire, this.walk.start, L));
    const key =
      `${L}|${controller.head}|${controller.solved}|${controller.fireLost}|` +
      `${a ? 1 : 0}|${this.threadWidth}|${this.fogOfWar}|${this.markerRadius()}`;
    if (this.fireDrawn && !this.fireDirty && key === this.fireKey && fire === this.fireLast) {
      if (this.burnLookDeclared !== this.burntLook) {
        this.setBurn(this.burnSpans, this.burnFronts, this.burnSmolder, true);
      }
      this.tickFireFx();
      return;
    }
    this.fireDirty = false;
    this.fireKey = key;
    this.fireLast = fire;
    this.fireDrawn = true;
    const spans: BurntSpan[] = [];
    const fronts: BurnFront[] = [];
    this.fireEmit.length = 0;
    const lit = L <= fire.delay;
    for (let eid = 0; eid < this.walk.edges.length; eid++) {
      const e = this.walk.edges[eid];
      const b = runBurnAt(this.walk, fire, eid, L);
      if (b.state === "unburnt") continue;
      if (b.state === "burnt") {
        spans.push(this.burnSpan(e, 0, e.length));
        continue;
      }
      const sk = e.ctrlB >= e.ctrlA ? 1 : -1;
      for (let i = 0; i < b.burnt.length; i++) {
        const [x0, x1] = b.burnt[i];
        if (x1 > x0) spans.push(this.burnSpan(e, x0, x1));
        // Within the delay the fire has not spread (at h = 0 the start's
        // runs hold zero-length stretches): the lit fuse stands for it.
        if (lit) continue;
        // runBurnAt pairs each stretch with its front: from the va end
        // [0, x] (the unburnt side lies toward vb), from the vb end [x, len].
        const x = b.front[i];
        const fromA = x0 === 0 && x === x1;
        this.pushFront(fronts, e, x, fromA ? sk : -sk, 0);
      }
    }
    if (lit) {
      const out = this.markerRadius() + FIRE_FUSE_OUT * this.threadWidth;
      const sv = this.walk.vertices.get(this.walk.start)!;
      this.ribbons.markerWorld(sv.chain, sv.ctrl, this.scratch);
      const cx = this.scratch[0];
      const cy = this.scratch[1];
      for (const e of this.walk.edges) {
        const sk = e.ctrlB >= e.ctrlA ? 1 : -1;
        if (e.va === this.walk.start) {
          this.pushFront(fronts, e, this.runOut(e, true, cx, cy, out), sk, 1);
        }
        if (e.vb === this.walk.start) {
          this.pushFront(fronts, e, e.length - this.runOut(e, false, cx, cy, out), -sk, 1);
        }
      }
    }
    // A smoldering arm is marked from the head to its first burnt stretch,
    // so a burning arm (the run just walked, say) keeps its char and ember
    // in view. The head's own end is never burnt (an arrival beats the fire).
    const smolder: BurntSpan[] = [];
    if (!a && !controller.solved && !controller.fireLost) {
      for (const eid of controller.choices()) {
        if (!controller.smoldering(eid)) continue;
        const e = this.walk.edges[eid];
        const b = runBurnAt(this.walk, fire, eid, L);
        const fromA = e.va === controller.head;
        let x0 = 0;
        let x1 = e.length;
        if (b.state === "burning") {
          for (const [s0, s1] of b.burnt) {
            if (fromA) x1 = Math.min(x1, s0);
            else x0 = Math.max(x0, s1);
          }
        }
        if (x1 > x0) smolder.push(this.burnSpan(e, x0, x1));
      }
    }
    this.setBurn(
      spans.length > 0 ? spans : null,
      fronts.length > 0 ? fronts : null,
      smolder.length > 0 ? smolder : null
    );
    this.syncFireLights();
    this.tickFireFx();
  }

  // K290 stage 3b: how far along run `e`, in lattice units from its va end
  // (fromA) or its vb end, the drawn thread first lies `dist` world from
  // (cx, cy): sampled every FIRE_FUSE_STEP, refined linearly, at most half
  // the run. The lit fuse's placement: markerRadius and threadWidth are
  // world lengths and a run's x is lattice units (about 0.65 world at seed
  // 7's entrance), so using the world sum as x put the ember under the disc.
  private runOut(e: WalkEdge, fromA: boolean, cx: number, cy: number, dist: number): number {
    const cap = e.length / 2;
    if (!(cap > 0)) return 0;
    const k = (e.ctrlB - e.ctrlA) / e.length;
    const s = this.scratch;
    let px = 0;
    let pd = 0;
    for (let i = 0; ; i++) {
      const x = Math.min(cap, i * FIRE_FUSE_STEP);
      this.pointFlowed(e.chain, this.ctrlMod(e.chain, e.ctrlA + (fromA ? x : e.length - x) * k), s, 0);
      const dx = s[0] - cx;
      const dy = s[1] - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= dist) return i > 0 && d > pd ? px + ((x - px) * (dist - pd)) / (d - pd) : x;
      if (x >= cap) return cap;
      px = x;
      pd = d;
    }
  }

  // K290 stage 3b: one front at lattice distance x along run `e` (from its
  // va end), `dir` the ctrl direction of its unburnt side, and its FX
  // emitter: the world point and the chord toward the unburnt side, clamped
  // to the run.
  private pushFront(fronts: BurnFront[], e: WalkEdge, x: number, dir: number, kind: number): void {
    const k = e.length > 0 ? (e.ctrlB - e.ctrlA) / e.length : 0;
    const c = e.ctrlA + x * k;
    fronts.push({ chain: e.chain, c, dir, kind });
    const lo = Math.min(e.ctrlA, e.ctrlB);
    const hi = Math.max(e.ctrlA, e.ctrlB);
    const s = this.scratch;
    const at = (f: number): void => {
      this.pointFlowed(e.chain, this.ctrlMod(e.chain, Math.min(hi, Math.max(lo, f))), s, 0);
    };
    at(c - dir * FIRE_DIR_STEP);
    const bx = s[0];
    const by = s[1];
    at(c + dir * FIRE_DIR_STEP);
    const fx = s[0];
    const fy = s[1];
    at(c);
    this.fireEmit.push(s[0], s[1], fx - bx, fy - by, e.chain, c, kind);
  }

  // K290 stage 3b: the fog's fire lights, one per burning front (the lit
  // fuse stands at the entrance, always seen). The fog redraws when a light
  // appears or goes, or one moved FIRE_FOG_LIGHT_STEP world.
  private syncFireLights(): void {
    const lights = this.fogFireLights;
    lights.length = 0;
    if (this.fogOfWar) {
      const emit = this.fireEmit;
      for (let i = 0; i < emit.length; i += FIRE_EMIT_STRIDE) {
        if (emit[i + 6] === 0) lights.push(emit[i], emit[i + 1]);
      }
    }
    const drawn = this.fogFireDrawn;
    let moved = lights.length !== drawn.length;
    for (let i = 0; i < lights.length && !moved; i += 2) {
      const dx = lights[i] - drawn[i];
      const dy = lights[i + 1] - drawn[i + 1];
      moved = dx * dx + dy * dy > FIRE_FOG_LIGHT_STEP * FIRE_FOG_LIGHT_STEP;
    }
    if (!moved) return;
    this.fogFireDrawn = lights.slice();
    this.fogDirty = true;
    this.renderFog();
  }

  // K290 stage 3b: the `burn` frontier FX (appear_fx.ts) at each front, then
  // the pool's tick, every frame (the particles fly on while the knot
  // sleeps). No spawns while the tab is hidden or under Reduced motion
  // (exploreStill), and under the thread reveal none from a front it does
  // not show (FIRE_UNSEEN_FRONTS).
  private tickFireFx(): void {
    const now = performance.now() / 1000;
    const dt = this.fireFxT < 0 ? 0 : Math.min(0.1, Math.max(0, now - this.fireFxT));
    this.fireFxT = now;
    const emit = this.fireEmit;
    if (!this.fireFx) {
      if (emit.length === 0) return;
      const created = new AppearFxSystem(0xf17e);
      created.style = "burn";
      this.fireFx = created;
      // Over the yarn, under the markers (the start disc stays readable over
      // the lit fuse's smoke) and the fog.
      this.overContainer.addChildAt(
        created.container,
        this.overContainer.getChildIndex(this.markers.start.mesh)
      );
    }
    const fx = this.fireFx;
    fx.unit = this.threadWidth;
    const count = emit.length / FIRE_EMIT_STRIDE;
    if (count > 0 && dt > 0 && !this.exploreStill && !document.hidden) {
      const share = FIRE_FX_RATE * Math.min(1, FIRE_FX_FRONTS / count);
      const pieces = this.explore.on && !FIRE_UNSEEN_FRONTS ? this.exploreLast?.pieces : null;
      const start = this.fireFxTurn++ % count;
      for (let j = 0; j < count; j++) {
        const o = ((start + j) % count) * FIRE_EMIT_STRIDE;
        if (pieces) {
          const chain = emit[o + 4];
          const n = this.ps.chains[chain].length;
          const closed = this.ps.chainBreakAfter[chain] < 0;
          if (chainVis(pieces, chain, emit[o + 5], n, closed) < 0.5) continue;
        }
        fx.spawnFrontier(emit[o], emit[o + 1], emit[o + 2], emit[o + 3], 0, dt * share);
      }
    }
    fx.tick(dt);
  }

  // K290: run `e` from lattice distance x0 to x1 as a burnt span of its
  // chain (unwrapped ctrls, as the reveal's pieces; ctrl linear in distance
  // along a run).
  private burnSpan(e: WalkEdge, x0: number, x1: number): BurntSpan {
    const k = e.length > 0 ? (e.ctrlB - e.ctrlA) / e.length : 0;
    const c0 = e.ctrlA + x0 * k;
    const c1 = e.ctrlA + x1 * k;
    return { chain: e.chain, b0: Math.min(c0, c1), b1: Math.max(c0, c1) };
  }

  // K290: record the burnt stretches, the fronts and the smoldering arms
  // (null = none) and re-declare the ribbons' visibility when one of them or
  // the look changed (`force`: the look).
  private burnLookDeclared: "gone" | "char" = "gone";
  private setBurn(
    spans: BurntSpan[] | null,
    fronts: BurnFront[] | null,
    smolder: BurntSpan[] | null,
    force = false
  ): void {
    const same =
      !force &&
      this.burnLookDeclared === this.burntLook &&
      sameSpanList(this.burnSpans, spans) &&
      sameSpanList(this.burnSmolder, smolder) &&
      sameFronts(this.burnFronts, fronts);
    this.burnSpans = spans;
    this.burnFronts = fronts;
    this.burnSmolder = smolder;
    if (same) return;
    this.burnLookDeclared = this.burntLook;
    this.syncExplore();
  }

  // K290: a chain's ctrl count if it is a ring, 0 if open (subtractBurnt).
  private readonly ringN = (chain: number): number =>
    this.ps.chainBreakAfter[chain] < 0 ? this.ps.chains[chain].length : 0;

  // K290: the burn's visibility with the reveal off: every chain whole,
  // less what burnt under "gone".
  private burnOnlyPieces(spans: BurntSpan[], gone: boolean): ExplorePiece[] {
    const chains: { n: number; closed: boolean }[] = [];
    for (let c = 0; c < this.ps.chains.length; c++) {
      chains.push({ n: this.ps.chains[c].length, closed: this.ps.chainBreakAfter[c] < 0 });
    }
    const base = wholePieces(chains);
    return gone ? subtractBurnt(base, spans, this.ringN) : base;
  }

  // Where the minotaur was last drawn (world), for its off-screen
  // indicator; false when it is not drawn.
  minotaurWorld(out: Float32Array | Float64Array): boolean {
    if (!this.minoShown) return false;
    out[0] = this.minoX;
    out[1] = this.minoY;
    return true;
  }

  minotaurRadius(): number {
    return this.minoR > 0 ? this.minoR : this.markerRadius();
  }

  // True while a fog of war covers the minotaur (minoFog "never", or
  // "hunting" while it is not hunting): only lifted fog shows it.
  get minotaurUnderFog(): boolean {
    return this.minoShown && this.minoUnderFog;
  }

  // --- Ariadne string (Stage 24). See the YARN block up top.

  private pushYarnEvent(e: WalkEdge, from: number, to: number): void {
    const n = Math.max(
      3,
      Math.ceil(Math.abs(to - from) / YARN_STATION_CTRL) + 1
    );
    const ctrls = new Float64Array(n);
    const wave = new Float64Array(n);
    const sd = ++this.yarnSeed;
    const h = (k: number): number => {
      let x = (Math.imul(sd, 374761393) + Math.imul(k, 668265263)) >>> 0;
      x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
      return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
    };
    // Slack-cotton wander: two incommensurate wavelengths (~1.2-2.6
    // world) plus a fine ripple, tapered at the ends so junction U-turns
    // meet near the lane instead of flying off mid-wave.
    const Lw = Math.abs(to - from) * 0.5; // Ctrl -> approx world units.
    const f1 = 0.42 + h(1) * 0.35;
    const f2 = f1 * (1.9 + h(2) * 0.8);
    // The fine ripple stays SLOW (2.6x base): at 4.3x it fell under the
    // station sampling rate and rendered as zigzag jitter, not ripple -
    // the reported jagged feel.
    const f3 = f1 * 2.6;
    const p1 = h(3);
    const p2 = h(4);
    const p3 = h(5);
    for (let k = 0; k < n; k++) {
      const u = n > 1 ? k / (n - 1) : 0;
      ctrls[k] = from + (to - from) * u;
      const s = u * Lw;
      const ew = Math.min(1, Math.min(u, 1 - u) / YARN_END_WIN);
      const win = ew * ew * (3 - 2 * ew);
      wave[k] =
        (0.6 * Math.sin(2 * Math.PI * (f1 * s + p1)) +
          0.32 * Math.sin(2 * Math.PI * (f2 * s + p2)) +
          0.06 * Math.sin(2 * Math.PI * (f3 * s + p3))) *
        win;
    }
    this.yarnEvents.push({
      chain: e.chain,
      c0: from,
      c1: to,
      ctrls,
      wave,
      lane: (h(6) - 0.5) * 2,
    });
  }

  // Entering string mode mid-game re-lays the current path as a single
  // chain of advances (the backtrack history is not retained elsewhere).
  private rebuildYarnFromPath(controller: FabricMazeController): void {
    this.yarnEvents.length = 0;
    const pe = controller.pathEdges;
    const pv = controller.pathVertices;
    for (let i = 0; i < pe.length; i++) {
      const e = this.walk.edges[pe[i]];
      if (e.va === e.vb || e.va === pv[i]) {
        this.pushYarnEvent(e, e.ctrlA, e.ctrlB);
      } else {
        this.pushYarnEvent(e, e.ctrlB, e.ctrlA);
      }
    }
  }

  // Keep the yarn store consistent with the mode + path (reset clears;
  // leaving string mode drops the laid string).
  private syncYarn(controller: FabricMazeController): void {
    if (this.pathViz !== "string") {
      if (this.yarnEvents.length > 0) {
        this.yarnEvents.length = 0;
        this.yarnGfx.clear();
      }
      return;
    }
    // NOTE: an EMPTY path no longer clears the yarn - backtracking all
    // the way to the start leaves the laid string on the maze (it is
    // never picked up, per the Ariadne model). Only the explicit reset
    // button (clearYarn) or leaving string mode drops it.
    if (this.yarnEvents.length === 0 && controller.pathEdges.length > 0) {
      this.rebuildYarnFromPath(controller);
    }
  }

  // Explicit reset (the panel button): drop the laid string.
  clearYarn(): void {
    this.yarnEvents.length = 0;
    this.yarnGfx.clear();
  }

  // K47 RESTORE: lay a restored attempt's string again - one pass per
  // tap, in the dot's travel direction, exactly as beginMove lays them
  // (the head after a tap is the run's other end, a self-loop runs A -> B;
  // the pass seeds count up the same way). Then update() draws it.
  restoreYarn(taps: readonly number[]): void {
    this.yarnEvents.length = 0;
    if (this.pathViz !== "string") return;
    let head = this.walk.start;
    for (const eid of taps) {
      const e = this.walk.edges[eid];
      if (!e) break;
      head = e.va === head ? e.vb : e.va;
      if (e.va === e.vb) this.pushYarnEvent(e, e.ctrlA, e.ctrlB);
      else if (e.va === head) this.pushYarnEvent(e, e.ctrlB, e.ctrlA);
      else this.pushYarnEvent(e, e.ctrlA, e.ctrlB);
    }
  }

  // The fog of war explores along whole runs, without a dot: `runs` are
  // taps walked from vertex `start`. K47 RESTORE: the runs crossed before
  // the page was reloaded, from the entrance (main.ts calls this once the
  // restored scene is on screen, so the stamps land where the settled
  // threads lie). K100: a daily's Reset path, whose way back to the
  // entrance jumps instead of animating, explores the runs it retraced from
  // the head, so the live fog is the one a restore of the same taps draws.
  // Each run is stamped as a move along it is: its departure end (where the
  // dot rested), then fogArcStations in travel direction (travelOrder), so
  // a run walked out and back lifts the fog at both moves' stations.
  exploreRuns(runs: readonly number[], start: string = this.walk.start): void {
    this.exploreMarkRuns(runs); // K76 stage 2c: the thread reveal's too.
    if (!this.fogOfWar) return;
    for (const { run, from, to } of travelOrder(this.walk.edges, runs, start)) {
      const chain = this.walk.edges[run].chain;
      for (const f of [from, ...fogArcStations(from, to, from, to)]) {
        this.pointFlowed(chain, this.ctrlMod(chain, f), this.scratch, 0);
        this.maybeStampFog(this.scratch[0], this.scratch[1]);
      }
    }
    this.renderFog();
  }

  private drawYarn(): void {
    const g = this.yarnGfx;
    g.clear();
    if (this.pathViz !== "string" || this.yarnEvents.length === 0) return;
    const slack = 1 - this.tension;
    const amp = this.threadWidth * (0.05 + 0.5 * slack);
    const laneAmp = this.threadWidth * 0.3 * slack;

    // Resolve every station to world (centerline, then offset along the
    // local normal), concatenating events with a rounded overshoot past
    // each junction - the visible U-turn on a backtrack. Each point also
    // carries a VISIBILITY from the renderer's live under-gap windows,
    // quantized to a few alpha levels: the yarn dips under and fades out
    // exactly where its host thread does, instead of bridging over the
    // threads its host passes under.
    const xs: number[] = [];
    const ys: number[] = [];
    const as: number[] = [];
    const evStarts: number[] = []; // Point index where each pass begins.
    const a = this.anim;
    for (let ev = 0; ev < this.yarnEvents.length; ev++) {
      const y = this.yarnEvents[ev];
      // The newest pass unspools with the dot while its move animates.
      let tClip = 1;
      if (
        a &&
        ev === this.yarnEvents.length - 1 &&
        y.chain === a.e.chain &&
        Math.abs(y.c0 - a.from) < 1e-6 &&
        Math.abs(y.c1 - a.to) < 1e-6
      ) {
        const span = y.c1 - y.c0;
        tClip =
          Math.abs(span) > 1e-9
            ? Math.max(0, Math.min(1, (a.cur - y.c0) / span))
            : 1;
      }
      const n = y.ctrls.length;
      const kMaxF = tClip * (n - 1);
      const kMax = Math.floor(kMaxF);
      const cxs: number[] = [];
      const cys: number[] = [];
      for (let k = 0; k <= kMax; k++) {
        this.pointFlowed(
          y.chain,
          this.ctrlMod(y.chain, y.ctrls[k]),
          this.scratch,
          0
        );
        cxs.push(this.scratch[0]);
        cys.push(this.scratch[1]);
      }
      if (kMax < n - 1 && kMaxF > kMax) {
        const f =
          y.ctrls[kMax] + (y.ctrls[kMax + 1] - y.ctrls[kMax]) * (kMaxF - kMax);
        this.pointFlowed(y.chain, this.ctrlMod(y.chain, f), this.scratch, 0);
        cxs.push(this.scratch[0]);
        cys.push(this.scratch[1]);
      }
      if (cxs.length < 2) continue;
      evStarts.push(xs.length);
      // Junction join. Overshoot past the junction ONLY on a genuine
      // U-TURN (the backtrack return doubles back on itself) - that is
      // what reads as the string looping around the corner. An ordinary
      // pass-through continuation just joins and lets the corner-cutting
      // round it; the unconditional overshoot poked a little hook past
      // every junction (user report).
      if (xs.length >= 2) {
        const ex = xs[xs.length - 1];
        const ey = ys[ys.length - 1];
        const inx = ex - xs[xs.length - 2];
        const iny = ey - ys[ys.length - 2];
        const il = Math.hypot(inx, iny) || 1;
        const ox = cxs[1] - cxs[0];
        const oy = cys[1] - cys[0];
        const ol = Math.hypot(ox, oy) || 1;
        const dot = (inx * ox + iny * oy) / (il * ol);
        if (dot < -0.35) {
          const o = 0.16 + 0.2 * slack;
          xs.push(ex + (inx / il) * o);
          ys.push(ey + (iny / il) * o);
          as.push(1);
        }
      }
      for (let k = 0; k < cxs.length; k++) {
        const kp = Math.max(0, k - 1);
        const kn = Math.min(cxs.length - 1, k + 1);
        let tx = cxs[kn] - cxs[kp];
        let ty = cys[kn] - cys[kp];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const kk = Math.min(k, y.wave.length - 1);
        const off = y.wave[kk] * amp + y.lane * laneAmp;
        xs.push(cxs[k] - ty * off);
        ys.push(cys[k] + tx * off);
        const ctrlK = y.ctrls[Math.min(k, y.ctrls.length - 1)];
        const vis = this.ribbons.underGapVisibility(
          y.chain,
          this.ribbons.arcForCtrl(y.chain, this.ctrlMod(y.chain, ctrlK))
        );
        as.push(vis);
      }
    }
    if (xs.length < 2) return;

    // CHAIKIN corner-cutting (two passes; one when the lay gets huge):
    // stations connect as straight segments, and the wander's direction
    // change between them read as kinks at play zoom - corner cutting
    // renders the lay as smooth curves. Visibility interpolates along
    // and re-quantizes at stroke time.
    let sx = xs;
    let sy = ys;
    let sa = as;
    const passes = xs.length > 2600 ? 1 : 2;
    for (let p = 0; p < passes; p++) {
      const nx: number[] = [sx[0]];
      const ny: number[] = [sy[0]];
      const na: number[] = [sa[0]];
      for (let i = 0; i < sx.length - 1; i++) {
        nx.push(
          sx[i] * 0.75 + sx[i + 1] * 0.25,
          sx[i] * 0.25 + sx[i + 1] * 0.75
        );
        ny.push(
          sy[i] * 0.75 + sy[i + 1] * 0.25,
          sy[i] * 0.25 + sy[i + 1] * 0.75
        );
        na.push(
          sa[i] * 0.75 + sa[i + 1] * 0.25,
          sa[i] * 0.25 + sa[i + 1] * 0.75
        );
      }
      nx.push(sx[sx.length - 1]);
      ny.push(sy[sy.length - 1]);
      na.push(sa[sa.length - 1]);
      sx = nx;
      sy = ny;
      sa = na;
    }

    // Stroke contiguous runs of equal (quantized) visibility, skipping
    // hidden spans. Shadow and yarn INTERLEAVE per pass (shadow k, yarn
    // k, shadow k+1, ...) so a later pass's shadow falls on the earlier
    // passes it crosses - the string shades ITSELF, not just the maze.
    const quant = (i: number): number =>
      Math.round(Math.min(sa[i], sa[i + 1]) * 5) / 5;
    const strokeRuns = (
      dx: number,
      dy: number,
      width: number,
      color: number,
      baseAlpha: number,
      from: number,
      to: number
    ): void => {
      let i = from;
      while (i < to) {
        const q = quant(i);
        if (q <= 0) {
          i++;
          continue;
        }
        g.moveTo(sx[i] + dx, sy[i] + dy);
        let j = i + 1;
        g.lineTo(sx[j] + dx, sy[j] + dy);
        while (j < to && quant(j) === q) {
          j++;
          g.lineTo(sx[j] + dx, sy[j] + dy);
        }
        g.stroke({
          width,
          color,
          alpha: baseAlpha * q,
          cap: "round",
          join: "round",
        });
        i = j;
      }
    };
    // Map pass boundaries through the Chaikin passes (each doubles the
    // point count; approximate index scaling is plenty for stroke splits).
    const scale = Math.pow(2, passes);
    const bounds = evStarts.map((b) =>
      Math.min(sx.length - 1, Math.round(b * scale))
    );
    bounds.push(sx.length - 1);
    for (let k = 0; k + 1 < bounds.length; k++) {
      const from = k === 0 ? 0 : bounds[k];
      const to = bounds[k + 1];
      if (to <= from) continue;
      strokeRuns(
        YARN_SHADOW_OFF,
        YARN_SHADOW_OFF * 1.3,
        YARN_SHADOW_W,
        0x05070c,
        0.3,
        from,
        to
      );
      strokeRuns(0, 0, YARN_WIDTH, 0xf7f3e8, 0.95, from, to);
    }
  }

  // --- Fog of war (Stage 25). See the FOG block up top.

  private ensureFog(): void {
    if (this.fogSprite) return;
    // Mapping square from the current particle bounds + margin (threads
    // drift far less than the margin after this point).
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const pos = this.ps.positions;
    for (let i = 0; i < this.ps.particleCount; i++) {
      const x = pos[i * 2];
      const y = pos[i * 2 + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const span = Math.max(maxX - minX, maxY - minY) + FOG_MARGIN * 2;
    this.fogRect = {
      x0: (minX + maxX) / 2 - span / 2,
      y0: (minY + maxY) / 2 - span / 2,
      span,
    };
    const canvas = document.createElement("canvas");
    canvas.width = FOG_CANVAS;
    canvas.height = FOG_CANVAS;
    this.fogCanvas = canvas;
    this.fogTexture = Texture.from(canvas);
    const sp = new Sprite(this.fogTexture);
    sp.position.set(this.fogRect.x0, this.fogRect.y0);
    sp.width = span;
    sp.height = span;
    this.fogSprite = sp;
    // Topmost in the overlay: fog covers markers too - the head/start
    // sit inside the lifted area by construction; the exit emerges only
    // once explored, which is the point.
    this.overContainer.addChild(sp);
    // Edge undulation (see the FOG_DISP block): the map sprite is only
    // a sampling transform for the filter, never drawn itself.
    const disp = new Sprite(fogDispTexture());
    disp.renderable = false;
    disp.width = span;
    disp.height = span;
    disp.position.set(this.fogRect.x0, this.fogRect.y0);
    this.fogDispSprite = disp;
    this.overContainer.addChild(disp);
    sp.filters = [
      new DisplacementFilter({ sprite: disp, scale: FOG_DISP_SCALE }),
    ];
    // The background-colored twin (K21), right above the flat sprite;
    // renderFog shows exactly one of them.
    this.fogBackdrop = new FogBackdrop(
      this.fogTexture,
      fogDispTexture(),
      this.fogRect,
      FOG_DISP_SCALE
    );
    this.fogBackdrop.setBackground(this.fogBackdropTex);
    this.overContainer.addChildAt(
      this.fogBackdrop.mesh,
      this.overContainer.getChildIndex(sp) + 1
    );
  }

  // The shader background's texture (null: none, the flat fog). Fog of war
  // hides the maze; over a shader background "hidden" must mean "showing
  // the background", or the fog reads as a flat square with flat blots.
  setFogBackdrop(tex: Texture | null): void {
    this.fogBackdropTex = tex;
    this.fogBackdrop?.setBackground(tex);
    this.renderFog();
  }

  // The flat fog's color = the page color, which a custom background base
  // color (K79) changes live.
  setFogColor(hex: number): void {
    if (hex === this.fogColor) return;
    this.fogColor = hex;
    this.fogDirty = true;
    this.renderFog();
  }

  // Drift the displacement map so the fog edges breathe. Called every
  // ticker frame (all branches) - cheap: one sprite transform; the GPU
  // filter does the rest even while the physics sleeps.
  tickFog(dt: number): void {
    if (this.fogOfWar && this.fogIntroT >= 0) {
      this.fogIntroT += dt;
      if (this.fogIntroT >= FOG_INTRO_DUR) this.fogIntroT = -1;
      this.fogDirty = true;
      this.renderFog();
    }
    if (!this.fogOfWar || !this.fogDispSprite) return;
    this.fogTime += dt;
    const span = this.fogRect.span;
    this.fogDispSprite.position.set(
      this.fogRect.x0 + ((this.fogTime * FOG_DISP_DRIFT_X) % span),
      this.fogRect.y0 + ((this.fogTime * FOG_DISP_DRIFT_Y) % span)
    );
    this.fogBackdrop?.setDispOrigin(
      this.fogDispSprite.position.x,
      this.fogDispSprite.position.y
    );
  }

  private maybeStampFog(x: number, y: number): void {
    if (!this.fogOfWar) return;
    const n = this.fogStamps.length;
    if (n >= 2) {
      const dx = x - this.fogStamps[n - 2];
      const dy = y - this.fogStamps[n - 1];
      if (dx * dx + dy * dy < FOG_STAMP_SPACING * FOG_STAMP_SPACING) {
        return;
      }
    }
    this.fogStamps.push(x, y);
    this.fogDirty = true;
  }

  // K100 probes (main.ts __knotFabric): the explored stamps (world x, y
  // pairs), the live reveal radius (renderFog's, before its canvas scale)
  // and the solve restart (and K174 re-fog) the stamps belong to.
  fogProbe(): {
    on: boolean;
    held: boolean;
    stamps: number[];
    radius: number;
    restarts: number;
    refogs: number;
  } {
    return {
      on: this.fogOfWar,
      held: this.fogHeld,
      stamps: [...this.fogStamps],
      radius: this.fowRadius * this.fogRadiusMul(),
      restarts: this.fogRestarts,
      refogs: this.fogRefogs,
    };
  }

  // The head dot's last drawn world position (false before the first
  // marker pass).
  headPosition(out: Float32Array | Float64Array): boolean {
    if (!this.headValid) return false;
    out[0] = this.headX;
    out[1] = this.headY;
    return true;
  }

  // Hold the fog off (true) while an unfogged intro plays; releasing the
  // hold starts the close-in (fade + contracting radius).
  setFogHold(hold: boolean): void {
    if (hold === this.fogHeld) return;
    this.fogHeld = hold;
    this.fogIntroT = hold ? -1 : 0;
    this.fogDirty = true;
    this.renderFog();
  }

  // The fog's reveal radius multiplier during the close-in (1 at rest).
  private fogRadiusMul(): number {
    if (this.fogIntroT < 0) return 1;
    const u = Math.min(1, this.fogIntroT / FOG_INTRO_DUR);
    const e = u * u * (3 - 2 * u);
    const big = Math.max(1, this.fogRect.span / Math.max(0.5, this.fowRadius));
    return big + (1 - big) * e;
  }

  // World bounds of what the fog lets you see (explored stamps grown by
  // the live reveal radius), or null when fog is off / held / unexplored.
  // main.ts fits the camera to this while fog is on.
  fogVisibleBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null {
    if (!this.fogOfWar || this.fogHeld || this.fogStamps.length < 2) {
      return null;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.fogStamps.length; i += 2) {
      const x = this.fogStamps[i];
      const y = this.fogStamps[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const r = this.fowRadius * this.fogRadiusMul();
    return { minX: minX - r, minY: minY - r, maxX: maxX + r, maxY: maxY + r };
  }

  // K76 stage 2c: world bounds of the thread the reveal shows (each piece's
  // solid part and half its fades, sampled every EXPLORE_FIT_STEP ctrl),
  // grown by EXPLORE_FIT_PAD; null with the reveal off. Cached per
  // declaration (syncExplore runs on every update() and move frame).
  // main.ts fits the camera to it, as to the fog's box; while the intro
  // holds everything shows, so it frames the whole maze, and the close-in
  // zooms in onto what was seen.
  exploreVisibleBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null {
    const v = this.exploreLast;
    if (!this.explore.on || !v || v.pieces.length === 0) return null;
    if (this.exploreBoxFor === v) return this.exploreBox;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of v.pieces) {
      const a = p.c0 - 0.5 * p.f0;
      const b = p.c1 + 0.5 * p.f1;
      const n = Math.max(1, Math.ceil((b - a) / EXPLORE_FIT_STEP));
      for (let i = 0; i <= n; i++) {
        this.pointFlowed(p.chain, this.ctrlMod(p.chain, a + ((b - a) * i) / n), this.scratch, 0);
        const x = this.scratch[0];
        const y = this.scratch[1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const r = EXPLORE_FIT_PAD;
    this.exploreBox = { minX: minX - r, minY: minY - r, maxX: maxX + r, maxY: maxY + r };
    this.exploreBoxFor = v;
    return this.exploreBox;
  }

  // K198: the right edge (world x) of the start, head and exit discs on
  // show (-Infinity with none); the fit camera's pan range reads it.
  markersRight(): number {
    let x = -Infinity;
    for (const mk of [this.markers.start, this.markers.head, this.markers.exit]) {
      // K408: a start marker faded out (not renderable) is not on show.
      if (mk.mesh.visible && mk.mesh.renderable) {
        x = Math.max(x, mk.mesh.position.x + mk.mesh.scale.x);
      }
    }
    return x;
  }

  private renderFog(): void {
    if (!this.fogOfWar || this.fogHeld) {
      if (this.fogSprite) this.fogSprite.visible = false;
      if (this.fogBackdrop) this.fogBackdrop.mesh.visible = false;
      return;
    }
    this.ensureFog();
    // Over a shader background the fog draws as the background (K21).
    const backdrop = this.fogBackdropTex !== null;
    this.fogSprite!.visible = !backdrop;
    this.fogBackdrop!.mesh.visible = backdrop;
    // Close-in: the fog fades in over the first FOG_INTRO_FADE seconds.
    this.fogSprite!.alpha =
      this.fogIntroT >= 0
        ? Math.min(1, this.fogIntroT / FOG_INTRO_FADE)
        : 1;
    this.fogBackdrop!.mesh.alpha = this.fogSprite!.alpha;
    if (!this.fogDirty && this.fogLastRadius === this.fowRadius) return;
    this.fogDirty = false;
    this.fogLastRadius = this.fowRadius;
    const ctx = this.fogCanvas!.getContext("2d")!;
    const k = FOG_CANVAS / this.fogRect.span;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `#${this.fogColor.toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, FOG_CANVAS, FOG_CANVAS);
    ctx.globalCompositeOperation = "destination-out";
    const r = Math.max(2, this.fowRadius * this.fogRadiusMul() * k);
    for (let i = 0; i < this.fogStamps.length; i += 2) {
      const px = (this.fogStamps[i] - this.fogRect.x0) * k;
      const py = (this.fogStamps[i + 1] - this.fogRect.y0) * k;
      const grad = ctx.createRadialGradient(px, py, r * 0.45, px, py, r);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // K290 stage 3b: the fire's light, a softer hole at each burning front
    // (syncFireLights), so the fire shows the branches it reached and the
    // player has not.
    const rl = r * FIRE_FOG_LIGHT;
    const fl = this.fogFireLights;
    for (let i = 0; i < fl.length; i += 2) {
      const px = (fl[i] - this.fogRect.x0) * k;
      const py = (fl[i + 1] - this.fogRect.y0) * k;
      const grad = ctx.createRadialGradient(px, py, rl * 0.3, px, py, rl);
      grad.addColorStop(0, "rgba(0,0,0,0.85)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rl, 0, Math.PI * 2);
      ctx.fill();
    }
    this.fogTexture!.source.update();
  }

  // --- Memory-trail paint (Stage 23).

  // Traversal segments in path order, each directed older-end -> head
  // (self-loop runs sweep A -> B, matching beginMove's convention). With an
  // advance mid-flight, the last path edge contributes only its swept
  // partial; a backtrack remnant (reachable only by toggling trail mode on
  // mid-retract) contributes the leftover between the new head and the dot.
  // Lattice lengths scale partials by their swept ctrl fraction.
  private trailSegments(
    controller: FabricMazeController,
    anim: MoveAnim | null
  ): TrailSeg[] {
    const segs: TrailSeg[] = [];
    const pe = controller.pathEdges;
    const pv = controller.pathVertices;
    const nFull = anim && anim.kind === "advance" ? pe.length - 1 : pe.length;
    for (let i = 0; i < nFull; i++) {
      const e = this.walk.edges[pe[i]];
      const fromA = e.va === e.vb || pv[i] === e.va;
      segs.push({
        e,
        from: fromA ? e.ctrlA : e.ctrlB,
        to: fromA ? e.ctrlB : e.ctrlA,
        len: e.length,
      });
    }
    if (anim) {
      const fullCtrl = Math.abs(anim.to - anim.from);
      const isAdv = anim.kind === "advance";
      const fromC = isAdv ? anim.from : anim.to;
      const sweptCtrl = Math.abs(anim.cur - fromC);
      if (sweptCtrl > 1e-9 && fullCtrl > 1e-9) {
        segs.push({
          e: anim.e,
          from: fromC,
          to: anim.cur,
          len: (anim.e.length * sweptCtrl) / fullCtrl,
        });
      }
    }
    return segs;
  }

  // Walk backward from the visual head accumulating lattice length until
  // trailLength is exhausted (trail_paint.ts trailSpans): the oldest
  // included segment keeps only the suffix nearest the head, solid gold
  // out to the fade start, then a linear ramp to base over the oldest
  // TRAIL_FADE_FRAC of the budget (K93: the segment holding the fade start
  // is split there). Junction caps only inside the trail, at the trail's
  // local intensity (a full-gold cap on a faded ribbon would float - the
  // overlays-sample-what-they-overlap rule).
  private buildTrail(
    controller: FabricMazeController,
    anim: MoveAnim | null
  ): TrailPaint {
    const segs = this.trailSegments(controller, anim);
    const L = Math.max(1e-6, this.trailLength);
    const pAt = trailFade(L);
    const spans: PaintSpan[] = trailSpans(
      segs.map((s) => ({ chain: s.e.chain, from: s.from, to: s.to, len: s.len })),
      L
    );

    // Caps: vertex i departs segment i (segment counts mirror path-edge
    // indices in every anim case), so its distance behind the head is the
    // summed length of segments i..end. Most-recent-first keeps a
    // revisited junction's brightest occurrence; the head keeps its pulse
    // affordance (no cap) until solved, mirroring buildCaps.
    const caps: PaintCap[] = [];
    const capR = Math.max(0.22, this.threadWidth * 0.6);
    const seenCap = new Set<string>();
    const addCaps = (vid: string, p: number): void => {
      const v = this.walk.vertices.get(vid)!;
      for (const eid of v.edges) {
        const e = this.walk.edges[eid];
        const atA = e.va === v.id;
        const ctrl = atA ? e.ctrlA : e.ctrlB;
        const key = `${e.chain}:${ctrl}`;
        if (!seenCap.has(key)) {
          seenCap.add(key);
          caps.push({ chain: e.chain, ctrl, radius: capR, p });
        }
        if (atA && e.vb === v.id) {
          const key2 = `${e.chain}:${e.ctrlB}`;
          if (!seenCap.has(key2)) {
            seenCap.add(key2);
            caps.push({ chain: e.chain, ctrl: e.ctrlB, radius: capR, p });
          }
        }
      }
    };
    if (controller.solved && !anim) addCaps(controller.head, 1);
    let dv = 0;
    for (let i = segs.length - 1; i >= 0; i--) {
      dv += segs[i].len;
      if (dv >= L) break;
      if (!controller.solved && i >= controller.pathVertices.length - 1) {
        continue; // The unsolved head (backtrack-remnant edge case).
      }
      const p = pAt(dv);
      if (p > 0.01) addCaps(controller.pathVertices[i], p);
    }
    // K81: a band wears its arms' composed paint, so a joint's band fades
    // with the trail by itself; keep the joints the trail still reaches.
    // K127: which arms are traveled does not fade (junction_routes.ts).
    const legs = pathLegs(
      this.walk.edges,
      controller.pathVertices,
      controller.pathEdges,
      anim
    );
    const routes = legRoutes(legs, (dvr) => dvr < L && pAt(dvr) > 0.01);
    const traveled = traveledRoutes(legs, anim !== null);
    return { spans, caps, routes, traveled };
  }

  // K81: the route bands of the whole path (fullPath mode), the move in
  // flight folded in (junction_routes.ts pathLegs), and K127's traveled
  // passes (the same, less the far end of the move in flight).
  private pathRoutes(
    controller: FabricMazeController,
    anim: MoveAnim | null
  ): { routes: PaintRoute[]; traveled: PaintRoute[] } {
    const legs = pathLegs(
      this.walk.edges,
      controller.pathVertices,
      controller.pathEdges,
      anim
    );
    return {
      routes: legRoutes(legs),
      traveled: traveledRoutes(legs, anim !== null),
    };
  }

  // Paint + markers for one animation frame: the stack minus the in-flight
  // run, plus the swept part of it (growing behind the dot on an advance,
  // the shrinking remnant ahead of it on a backtrack); pulses stay quiet
  // until arrival. In trail mode the spans are the trailing suffix instead,
  // with the in-flight partial as the newest material.
  private emitAnimFrame(controller: FabricMazeController): void {
    const a = this.anim!;
    this.exploreEpoch(controller, false); // K76 stage 2c.
    this.syncExplore(); // K76: the dot uncovers its run.
    this.syncYarn(controller);
    this.ribbons.setRim(this.rimDecl());
    if (this.pathViz === "string") {
      // The yarn is the record: no gold spans or caps; pulses stay quiet
      // mid-move exactly like the other modes.
      this.ribbons.setPaint([], [], [], []);
      this.drawMarkers(controller, a.e.chain, a.cur, false);
      this.drawYarn();
      this.renderFog();
      return;
    }
    if (this.trailMode) {
      const trail = this.buildTrail(controller, a);
      this.ribbons.setPaint(
        trail.spans,
        [],
        trail.caps,
        trail.routes,
        trail.traveled
      );
      this.drawMarkers(controller, a.e.chain, a.cur, false);
      this.renderFog();
      return;
    }
    const spans: PaintSpan[] = [];
    for (const eid of controller.pathEdges) {
      if (a.kind === "advance" && eid === a.e.id) continue;
      const e = this.walk.edges[eid];
      spans.push({ chain: e.chain, c0: e.ctrlA, c1: e.ctrlB });
    }
    const lo = Math.min(a.cur, a.kind === "advance" ? a.from : a.to);
    const hi = Math.max(a.cur, a.kind === "advance" ? a.from : a.to);
    if (hi - lo > 1e-6) {
      spans.push({ chain: a.e.chain, c0: lo, c1: hi });
    }
    const passes = this.pathRoutes(controller, a);
    this.ribbons.setPaint(
      spans,
      [],
      this.buildCaps(controller),
      passes.routes,
      passes.traveled
    );
    this.drawMarkers(controller, a.e.chain, a.cur, false);
    this.renderFog();
  }

  // Refresh the paint declaration (traveled spans + pulse arms) and redraw
  // the markers. While a move is animating, tickAnim owns the frame. In
  // trail mode the spans/caps come from the trailing suffix instead of the
  // full path; the pulse machinery is identical (a pulse brightens whatever
  // paint its thread wears there - the shader composes it per pixel).
  update(controller: FabricMazeController): void {
    this.fireDirty = true; // K114: drawFire redraws on the next frame.
    if (this.anim) {
      this.emitAnimFrame(controller);
      return;
    }
    // K76 stage 2c: always, so turning the reveal on mid-solve shows the
    // real walk.
    this.exploreEpoch(controller, true);
    this.syncExplore();
    this.syncYarn(controller);
    // String mode: the yarn is the traversal record - no gold spans or
    // junction caps; the choice pulses/hover (choice UI, not path viz)
    // stay, over the threads' own colors.
    const stringViz = this.pathViz === "string";
    const trail =
      !stringViz && this.trailMode ? this.buildTrail(controller, null) : null;
    const spans: PaintSpan[] = trail ? trail.spans : [];
    if (!trail && !stringViz) {
      for (const eid of controller.pathEdges) {
        const e = this.walk.edges[eid];
        spans.push({ chain: e.chain, c0: e.ctrlA, c1: e.ctrlB });
      }
    }

    const caps = stringViz
      ? []
      : trail
        ? trail.caps
        : this.buildCaps(controller);
    // K81 route bands: none in string mode (no gold to carry).
    const passes = stringViz
      ? { routes: [], traveled: [] }
      : trail
        ? trail
        : this.pathRoutes(controller, null);

    const pulses: PulseArm[] = [];
    if (!controller.solved) {
      const last =
        controller.pathEdges.length > 0
          ? controller.pathEdges[controller.pathEdges.length - 1]
          : -1;
      for (const eid of controller.choices()) {
        const e = this.walk.edges[eid];
        const hovered = eid === this.hoverEdge;
        const inward = eid === last;
        const arm = (cJunction: number, cFar: number): void => {
          pulses.push({ chain: e.chain, cJunction, cFar, inward, hovered });
        };
        if (e.va === e.vb) {
          // A self-loop run returns to the branch point: pulse both ends.
          arm(e.ctrlA, e.ctrlB);
          arm(e.ctrlB, e.ctrlA);
        } else if (e.va === controller.head) {
          arm(e.ctrlA, e.ctrlB);
        } else {
          arm(e.ctrlB, e.ctrlA);
        }
      }
    }
    this.ribbons.setPaint(spans, pulses, caps, passes.routes, passes.traveled);
    this.ribbons.setRim(this.rimDecl());
    // K100: the fog's explored memory belongs to one solve. It starts over
    // when the solve restarts (Reset path's restart, a clock change, a
    // restore's replay: the controller's `restarts` moved) and only then -
    // an empty path (a backtrack to the entrance, a K80 catch) keeps it.
    // Keyed on the event, not on the state it leaves, so a reset followed
    // by taps before this runs (replay) still reads as a restart. K174: a
    // catch under minoRefog (the controller's `refogs` moved) starts it
    // over too.
    if (controller.restarts !== this.fogRestarts || controller.refogs !== this.fogRefogs) {
      this.fogRestarts = controller.restarts;
      this.fogRefogs = controller.refogs;
      this.fogStamps.length = 0;
      this.fogDirty = true;
    }
    this.drawMarkers(controller, -1, 0, controller.solved);
    this.drawYarn();
    this.renderFog();
  }

  // Junction caps: at every vertex the path traversed, several ribbons
  // converge and overlap (bridge tips ride their hosts; merged crossings
  // overlap diagonally). Painting each arm's immediate neighborhood gold
  // hides the overlap footprint in both directions. The head vertex keeps
  // its pulse affordance instead (and wears the head marker), except once
  // solved.
  private buildCaps(controller: FabricMazeController): PaintCap[] {
    const caps: PaintCap[] = [];
    // Just enough to cover the overlap footprint at the junction center
    // (~half a thread width): the tuck + fillets own the joint geometry
    // now, and bigger caps painted gold ticks on every unchosen side arm.
    const capR = Math.max(0.22, this.threadWidth * 0.6);
    const seenCap = new Set<string>();
    // Only arms the path actually TRAVELED: capping every incident edge
    // painted gold ticks on the unchosen side arms (the "little stubs
    // around intersections" report). The fillet joinery owns the joint
    // overlap footprint now; untraveled arms need no gold cover.
    const traveled = new Set(controller.pathEdges);
    const nVisited =
      controller.pathVertices.length - (controller.solved ? 0 : 1);
    for (let i = 0; i < nVisited; i++) {
      const v = this.walk.vertices.get(controller.pathVertices[i])!;
      for (const eid of v.edges) {
        if (!traveled.has(eid)) continue;
        const e = this.walk.edges[eid];
        const atA = e.va === v.id;
        const ctrl = atA ? e.ctrlA : e.ctrlB;
        const key = `${e.chain}:${ctrl}`;
        if (seenCap.has(key)) continue;
        seenCap.add(key);
        caps.push({ chain: e.chain, ctrl, radius: capR });
        // A self-loop run touches the vertex at BOTH its ends.
        if (atA && e.vb === v.id) {
          const key2 = `${e.chain}:${e.ctrlB}`;
          if (!seenCap.has(key2)) {
            seenCap.add(key2);
            caps.push({ chain: e.chain, ctrl: e.ctrlB, radius: capR });
          }
        }
      }
    }
    return caps;
  }

  // Explicit N-gon circle: pixi's adaptive circle tessellation counts
  // segments from the RAW radius, and these markers are fractions of a
  // world unit - they rendered as visible polygons at typical zoom.
  private polyCircle(
    g: Graphics,
    x: number,
    y: number,
    r: number,
    n: number
  ): void {
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.poly(pts);
  }

  // Markers (K83): the start and finish discs (set into a punched gap as
  // though their thread passes UNDER them), the current position (at the
  // given chain position mid-move, at the head vertex otherwise; its
  // under-weave halo follows it), and the win ring. All three are black
  // discs with a white glyph, one radius; K98: the start and the finish sit
  // on a dot of their thread's own color (radius dotR, the gap slots' too).
  private drawMarkers(
    controller: FabricMazeController,
    dotChain: number,
    dotCtrl: number,
    showRing: boolean
  ): void {
    const g = this.gfx;
    g.clear();
    const r = this.markerRadius();
    const dotR = this.markerDotRadius();
    const m = this.markers;
    if (dotChain >= 0) {
      this.pointFlowed(dotChain, this.ctrlMod(dotChain, dotCtrl), this.scratch, 0);
    } else {
      this.vertexWorld(controller.head, this.scratch, 0);
    }
    this.headX = this.scratch[0];
    this.headY = this.scratch[1];
    this.headValid = true;
    // Fog explores wherever the head rests; mid-move, the run's stations
    // stamp it (tickAnim, K99) - the dot's per-frame position would make
    // what a move uncovers depend on frame timing.
    if (dotChain < 0) this.maybeStampFog(this.headX, this.headY);
    // The under-weave halo follows the head.
    this.glowSprite.visible = true;
    this.glowSprite.position.set(this.headX, this.headY);
    m.head.setGlyph(markerGlyph(this.markerGlyphIds.head, "head"));
    m.head.place(this.headX, this.headY, r);

    // Start/exit discs sit at the renderer's OWN sample of their ctrl
    // (markerWorld), concentric with the gap slots the renderer cuts for
    // them (setMarkerOccluders).
    const startV = this.walk.vertices.get(this.walk.start)!;
    this.ribbons.markerWorld(startV.chain, startV.ctrl, this.scratch);
    m.start.setGlyph(markerGlyph(this.markerGlyphIds.start, "start"));
    this.ribbons.sectionColorAt(startV.chain, startV.ctrl, this.dotRgb);
    m.start.setRingColor(this.dotRgb);
    m.start.place(this.scratch[0], this.scratch[1], r, dotR);

    const exitV = this.walk.vertices.get(this.walk.exit)!;
    // K465: the revealFinish param lifts the thread reveal's hold on the
    // exit (marker, gap slot and indicator alike); the renderer gates the
    // gap slot by the same rule (game/explore_finish.ts). Declared BEFORE
    // the early return so the marker and its gap change in the same frame.
    const lifted = this.exitLifted();
    this.ribbons.setExploreFinish(lifted);
    if (
      finishHold({
        // The intro reveal still holds the exit until it has revealed it.
        introMul: this.revealQuery
          ? this.revealQuery(exitV.chain, exitV.ctrl)
          : 1,
        // K76 2b: and the thread reveal, unless lifted.
        exploreVis: this.ribbons.exploreVisAt(exitV.chain, exitV.ctrl),
        lifted,
      }) !== ""
    ) {
      m.exit.hide(); // Exit still unrevealed: no marker, no gap, no ring.
      return;
    }
    this.ribbons.markerWorld(exitV.chain, exitV.ctrl, this.scratch);
    m.exit.setGlyph(markerGlyph(this.markerGlyphIds.exit, "exit"));
    this.ribbons.sectionColorAt(exitV.chain, exitV.ctrl, this.dotRgb);
    m.exit.setRingColor(this.dotRgb);
    m.exit.place(this.scratch[0], this.scratch[1], r, dotR);
    if (showRing) {
      this.polyCircle(g, this.scratch[0], this.scratch[1], dotR * WIN_RING_R, 72);
      g.stroke({
        color: EXIT_COLOR,
        width: this.threadWidth * 0.25,
        alpha: 0.9,
      });
    }
  }

  // --- K76 THREAD REVEAL (stage 2a; the event-fed model is stage 2c) -----

  // THE MODEL IS FED BY MOVE EVENTS (stage 2c), recorded whether or not the
  // mode is on: a dot that LANDS (tickAnim / setMoveProgress arrival, a move
  // snapped by the next or cancelled) walked its run and reached its far
  // end; a CAUGHT dot (stopMove, K80) saw its run only up to where it was
  // caught (a partial). The controller records a tap when its move STARTS,
  // so the 2a probe model read moves the dot never finished.
  private exploreArrive(a: MoveAnim): void {
    const id = a.e.id;
    this.seenRuns.add(id);
    if (this.seenPartial.length) this.seenPartial = this.seenPartial.filter((p) => p.edge !== id);
    const dest = a.to === a.e.ctrlB ? a.e.vb : a.e.va;
    if (!this.seenV.has(dest)) this.seenV.set(dest, this.exploreClock);
  }

  // Runs walked without a dot (a restore, a daily's Reset path): both ends
  // seen, grown at once.
  private exploreMarkRuns(runs: Iterable<number>): void {
    for (const id of runs) {
      const e = this.walk.edges[id];
      if (!e) continue;
      this.seenRuns.add(id);
      if (!this.seenV.has(e.va)) this.seenV.set(e.va, -Infinity);
      if (!this.seenV.has(e.vb)) this.seenV.set(e.vb, -Infinity);
    }
    if (this.seenPartial.length) {
      this.seenPartial = this.seenPartial.filter((p) => !this.seenRuns.has(p.edge));
    }
  }

  // A restart (the controller's `restarts`, K100) or a re-fogging catch
  // (`refogs`, K174: minoRefog) forgets everything, as the fog does; the
  // entrance is always seen, and so is the head at rest (`head`: not while
  // a move is in flight, whose head is already its destination).
  private exploreEpoch(c: FabricMazeController, head: boolean): void {
    if (this.seenRestart !== c.restarts || this.seenRefogs !== c.refogs) {
      this.seenRestart = c.restarts;
      this.seenRefogs = c.refogs;
      this.seenV.clear();
      this.seenRuns.clear();
      this.seenPartial = [];
    }
    if (!this.seenV.has(this.walk.start)) this.seenV.set(this.walk.start, -Infinity);
    if (head && !this.seenV.has(c.head)) this.seenV.set(c.head, -Infinity);
  }

  // K47 RESTORE: rebuild the reveal from the replayed controller (its taps
  // from the entrance), grown at once. main.ts calls it before the
  // restore's update().
  exploreRestore(c: FabricMazeController): void {
    this.exploreEpoch(c, false);
    this.exploreMarkRuns(c.taps);
  }

  // The explore clock, called every frame by main.ts in every clock mode
  // (the real-time chase never runs tickAnim): a re-declaration every frame
  // while a newly visited vertex's arms grow or the intro closes in (a move
  // in flight re-declares anyway, emitAnimFrame).
  tickExplore(dt: number): void {
    this.exploreClock += dt;
    let closing = false;
    if (!this.exploreHeld && this.exploreHoldT >= 0) {
      this.exploreHoldT += dt;
      closing = true; // The last step declares hold 0.
      if (this.exploreHoldT >= EXPLORE_CLOSE_S) {
        this.exploreHoldT = -1;
        this.holdDist = null;
      }
    }
    if (this.explore.on && !this.anim && (closing || this.exploreGrowing(dt))) this.syncExplore();
    else this.styleHalos();
  }

  // THE INTRO HOLD (main.ts: the reveal on, fowIntro on and the intro
  // playing): every run shows whole; releasing it starts the CLOSE-IN, a
  // front contracting onto the plain view over EXPLORE_CLOSE_S (the fog's
  // FOG_INTRO_DUR), never a dissolve (a dissolve would cross-fade two
  // translucent layers of the same thread).
  setExploreHold(hold: boolean): void {
    if (hold === this.exploreHeld) return;
    this.exploreHeld = hold;
    this.exploreHoldT = hold ? -1 : 0;
    this.holdDist = null;
    if (this.explore.on && !this.anim) this.syncExplore();
  }

  // The close-in's level: 1 held, falling through a smoothstep once
  // released, 0 at rest.
  private exploreHoldLevel(): number {
    if (this.exploreHeld) return 1;
    if (this.exploreHoldT < 0) return 0;
    const u = Math.min(1, this.exploreHoldT / EXPLORE_CLOSE_S);
    return 1 - u * u * (3 - 2 * u);
  }

  // Whether a visited vertex's arms are still growing (this frame's dt
  // included, so the last step lands at full growth).
  private exploreGrowing(dt: number): boolean {
    for (const t of this.seenV.values()) {
      if (t > this.exploreClock - EXPLORE_GROW_S - dt) return true;
    }
    return false;
  }

  // Declare what is visible to the ribbons (or the mode off) and place the
  // halo sprites. K290 (burn stage 3a): a burn composes with it. Under
  // "gone" the burnt stretches are cut out of the pieces (the reveal's own
  // pieces still decide which junctions hide: `gate`); under "char" they
  // ride as char spans. With the reveal off and something burnt, every
  // chain is declared whole (less the burnt stretches), so the explore
  // programs draw the burn; nothing burnt keeps master's path.
  private syncExplore(): void {
    const spans = this.burnSpans;
    const fronts = this.burnFronts;
    const smolder = this.burnSmolder;
    const burning = !!(spans || fronts || smolder);
    const gone = this.burntLook === "gone";
    if (!this.explore.on) {
      if (burning) {
        this.exploreLast = null;
        this.ribbons.setExplore(this.burnOnlyPieces(spans ?? [], gone), this.explore.look, 1, {
          gate: null,
          char: gone ? null : spans,
          fronts,
          smolder,
        });
        this.drawFrontierMarks();
        return;
      }
      if (this.exploreLast || this.ribbons.exploreOn) {
        this.exploreLast = null;
        this.ribbons.setExplore(null);
        this.drawFrontierMarks();
      }
      return;
    }
    const visited = new Map<string, number>();
    for (const [v, t] of this.seenV) {
      const p =
        t === -Infinity ? 1 : Math.max(0, Math.min(1, (this.exploreClock - t) / EXPLORE_GROW_S));
      visited.set(v, 1 - (1 - p) * (1 - p) * (1 - p));
    }
    const a = this.anim;
    const inflight =
      a && a.kind === "advance" && !this.seenRuns.has(a.e.id)
        ? { edge: a.e.id, from: a.from, cur: a.cur }
        : null;
    // A junction's web domain along its arms: the fillet reach (ribbon
    // renderer: fillHalf * FILLET_REACH_PER_HALF 1.25 * cuspRadius), at
    // least the seal and tip discs, plus a margin (world ~ lattice units).
    const fillHalf = this.threadWidth / 2;
    const web = 1.15 * Math.max(fillHalf * 1.25 * this.ribbons.cuspRadius, fillHalf * 2);
    const hold = this.exploreHoldLevel();
    if (hold > 0 && (!this.holdDist || this.holdDistN !== this.seenV.size)) {
      this.holdDist = exploreDistances(this.walk, this.seenV.keys());
      this.holdDistN = this.seenV.size;
    }
    this.exploreLast = exploreView({
      walk: this.walk,
      visited,
      explored: this.seenRuns,
      inflight,
      reach: this.explore.reach,
      fade: this.explore.fade,
      web,
      partial: this.seenPartial,
      hold,
      holdDist: hold > 0 ? this.holdDist ?? undefined : undefined,
    });
    const pieces = this.exploreLast.pieces;
    if (burning) {
      // K383 (Levi's open call): a front the reveal does not show draws as
      // nothing unless FIRE_UNSEEN_FRONTS adds a little thread around it.
      let shown = pieces;
      if (FIRE_UNSEEN_FRONTS && fronts) {
        const h = FIRE_UNSEEN_HALF / 2;
        shown = pieces.concat(
          fronts.map((f) => ({
            chain: f.chain,
            c0: f.c - h,
            c1: f.c + h,
            f0: h,
            f1: h,
            tip0: false,
            tip1: false,
          }))
        );
      }
      this.ribbons.setExplore(
        gone && spans ? subtractBurnt(shown, spans, this.ringN) : shown,
        this.explore.look,
        1,
        { gate: pieces, char: gone ? null : spans, fronts, smolder }
      );
    } else {
      this.ribbons.setExplore(pieces, this.explore.look, 1);
    }
    this.drawFrontierMarks();
  }

  // K290: whether a chain point lies in a burnt stretch that is not drawn
  // ("gone"): a frontier there gets no halo.
  private burntGoneAt(chain: number, ctrl: number): boolean {
    const spans = this.burnSpans;
    if (!spans || this.burntLook !== "gone") return false;
    const n = this.ringN(chain);
    for (const s of spans) {
      if (s.chain !== chain) continue;
      for (let k = n > 0 ? -2 : 0; k <= (n > 0 ? 2 : 0); k++) {
        if (ctrl >= s.b0 + k * n && ctrl <= s.b1 + k * n) return true;
      }
    }
    return false;
  }

  // K465: whether the thread reveal's hold on the exit is lifted: the
  // `revealFinish` param, unless the fire burnt the exit's own point away
  // (a burnt-gone exit stays hidden, as with the mode off). The marker, its
  // gap slot (ribbons.setExploreFinish) and main.ts's finish indicator read
  // it; the rule is game/explore_finish.ts's.
  exitLifted(): boolean {
    const e = this.walk.vertices.get(this.walk.exit);
    if (!e) return this.revealFinish;
    return finishLifted(this.revealFinish, this.burntGoneAt(e.chain, e.ctrl));
  }

  // The looks drawn BESIDE the thread: the halo (halo, beacon) - a soft
  // glow beneath the weave at the middle of each frontier fade.
  private drawFrontierMarks(): void {
    let fr = this.exploreLast?.frontiers ?? [];
    if (this.burnSpans && this.burntLook === "gone") {
      fr = fr.filter((f) => !this.burntGoneAt(f.chain, f.cSolid + (f.cEnd - f.cSolid) * 0.5));
    }
    const halo = this.explore.on && exploreLookHasHalo(this.explore.look);
    const want = halo ? fr.length : 0;
    while (this.haloSprites.length < want) {
      const sp = new Sprite(headGlowTexture());
      sp.anchor.set(0.5);
      sp.tint = HALO_TINT;
      sp.alpha = HALO_ALPHA;
      this.haloLayer.addChild(sp);
      this.haloSprites.push(sp);
    }
    for (let i = 0; i < this.haloSprites.length; i++) {
      this.haloSprites[i].visible = i < want;
    }
    const d = Math.max(1.8, this.threadWidth * 3.8);
    for (let i = 0; i < want; i++) {
      const f = fr[i];
      const c = f.cSolid + (f.cEnd - f.cSolid) * 0.5;
      this.pointFlowed(f.chain, this.ctrlMod(f.chain, c), this.scratch, 0);
      const sp = this.haloSprites[i];
      sp.position.set(this.scratch[0], this.scratch[1]);
      sp.width = d;
      sp.height = d;
    }
    this.styleHalos();
  }

  // K76 stage 2c (question 9), read every frame (main.ts): Reduced motion
  // stills the halo's breath; High contrast draws it full strength, white,
  // and (stage 2d) the dots look's dots too (the renderer's uKExplore.x).
  exploreStill = false;
  private exploreHc = false;
  get exploreContrast(): boolean {
    return this.exploreHc;
  }
  set exploreContrast(on: boolean) {
    this.exploreHc = on;
    this.ribbons.setExploreContrast(on);
  }

  // The halos' breath, tint and strength (every frame, tickExplore).
  private styleHalos(): void {
    if (this.haloSprites.length === 0) return;
    const hc = this.exploreContrast;
    const a = hc
      ? 1
      : this.exploreStill
        ? HALO_ALPHA
        : HALO_BREATH_LO +
          (HALO_BREATH_HI - HALO_BREATH_LO) *
            (0.5 - 0.5 * Math.cos((2 * Math.PI * this.exploreClock) / HALO_BREATH_S));
    const tint = hc ? 0xffffff : HALO_TINT;
    for (const sp of this.haloSprites) {
      if (!sp.visible) continue;
      sp.alpha = a;
      sp.tint = tint;
    }
  }

  // PROBE (the GPU cost bound): every vertex counts as visited (grown), so
  // every run shows whole. The next update() declares it.
  exploreVisitAll(): void {
    for (const id of this.walk.vertices.keys()) {
      if (!this.seenV.has(id)) this.seenV.set(id, -Infinity);
    }
  }

  // Probe view of the mode and the last declaration.
  exploreState(): {
    explore: { on: boolean; reach: number; fade: number; look: number };
    view: ExploreView | null;
    seen: string[];
    runs: number[];
    held: boolean;
    hold: number;
    partial: { edge: number; from: number; cur: number }[];
    gaps: ReturnType<RibbonRenderer["exploreGapState"]>;
  } {
    return {
      explore: { ...this.explore },
      view: this.exploreLast,
      seen: [...this.seenV.keys()],
      runs: [...this.seenRuns],
      held: this.exploreHeld,
      hold: this.exploreHoldLevel(),
      partial: this.seenPartial.map((p) => ({ ...p })),
      // K268: the gap gate's slot kinds and the slot table's uploads.
      gaps: this.ribbons.exploreGapState(),
    };
  }

  destroy(): void {
    // The marker meshes outlive the scene (markerMeshes): hand them back
    // before the containers go (the minotaur's sits in minoLayer).
    for (const mk of Object.values(this.markers)) {
      mk.mesh.removeFromParent();
      mk.hide();
    }
    this.overContainer.destroy({ children: true });
    this.underContainer.destroy({ children: true });
  }
}
