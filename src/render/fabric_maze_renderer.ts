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
import type { MinotaurChase, MinotaurMode } from "../game/minotaur";
import { FogBackdrop } from "./background";
import { fogArcStations, moveEnds, travelOrder } from "./fog_arc";
import { MarkerMesh } from "./marker_mesh";
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
// never on a backtrack to the entrance (by hand or a daily's Reset path)
// or a K80 catch. The radius slider re-renders every hole (a retroactive
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
  // and the hover point on it (an unwrapped ctrl in its span). A choice is
  // left out when the paint is declared (rimDecl), not here: the run under
  // a still pointer can stop or start being one with a move.
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
  // The controller's `restarts` the stamps belong to (K100).
  private fogRestarts = -1;
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
  // K80: the minotaur (syncMinotaur): its marker over its red highlight,
  // one layer above the other markers, moved above or below the fog.
  private minoLayer: Container;
  private minoGlow: Sprite;
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
    this.minoLayer = new Container();
    this.minoLayer.addChild(this.minoGlow, this.markers.minotaur.mesh);
    this.minoLayer.visible = false;
    this.overContainer.addChild(this.minoLayer);
    for (const m of Object.values(this.markers)) m.hide();
    this.syncMarkerOccluders();
    this.underContainer = new Container();
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
    this.ribbons.setMarkerOccluders([
      { chain: s.chain, ctrl: s.ctrl, radius: r },
      { chain: e.chain, ctrl: e.ctrl, radius: r },
    ]);
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

  // K145: the hover glow's run as the ribbons declare it - none on a
  // choice, which keeps its own, stronger hover (Levi: "This highlight
  // shouldn't happen on adjacent-to-current-junction segments").
  private rimDecl(controller: FabricMazeController): PaintRim | null {
    const eid = this.glowEdge;
    if (eid < 0 || controller.choices().includes(eid)) return null;
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
  // point where all arms coincide.
  edgeAt(x: number, y: number, controller: FabricMazeController): number {
    const maxD = Math.max(0.9, this.threadWidth * 1.6);
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
        if (!nearHead || e.ctrlB - e.ctrlA <= 2 * HEAD_EXCLUDE) {
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

  // --- Traversal animation: game state moves instantly; the dot and the
  // gold front travel the thread's actual curve to catch up (ctrl-space
  // interpolation through pointOnChain, so the motion follows every bend).

  // K169: a fully traveled web is still fading in (main.ts sceneAnimating()).
  get webFading(): boolean {
    return this.ribbons.webFade.active;
  }

  get animating(): boolean {
    return this.anim !== null;
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
    this.anim = null;
  }

  // K80's catch: the move ends where the dot is, and the fog (which a
  // catch keeps, K100) lifts only as far as the dot got. cancelMove would
  // uncover the rest of the run, right for a move the controller made in
  // full; a caught player never got there.
  stopMove(): void {
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
      this.anim = null;
      this.update(controller);
      return;
    }
    this.emitAnimFrame(controller);
  }

  // --- The minotaur (K80). Drawn from the chase every frame by main.ts.

  // Place the minotaur where `chase` has it (null: no chase, hidden).
  // `fog` decides whether it shows through the fog of war: "always",
  // "hunting" (only while it hunts) or "never" (only where the fog has
  // lifted). Like the exit marker, it waits for the intro to draw its
  // thread.
  syncMinotaur(chase: MinotaurChase | null, fog: MinoFog): void {
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
    const over = fog === "always" || (fog === "hunting" && chase.mode === "hunt");
    const kids = this.overContainer.children;
    const li = kids.indexOf(this.minoLayer);
    const fi = this.fogSprite ? kids.indexOf(this.fogSprite) : -1;
    if (over && fi > li) {
      this.overContainer.setChildIndex(this.minoLayer, kids.length - 1);
    } else if (!over && fi >= 0 && li > fi) {
      this.overContainer.setChildIndex(this.minoLayer, fi);
    }
    this.minoShown = true;
    this.minoUnderFog = this.fogOfWar && !over;
    this.minoX = x;
    this.minoY = y;
    this.minoR = r;
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
  // and the solve restart the stamps belong to.
  fogProbe(): { on: boolean; held: boolean; stamps: number[]; radius: number; restarts: number } {
    return {
      on: this.fogOfWar,
      held: this.fogHeld,
      stamps: [...this.fogStamps],
      radius: this.fowRadius * this.fogRadiusMul(),
      restarts: this.fogRestarts,
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

  // K198: the right edge (world x) of the start, head and exit discs on
  // show (-Infinity with none); the fit camera's pan range reads it.
  markersRight(): number {
    let x = -Infinity;
    for (const mk of [this.markers.start, this.markers.head, this.markers.exit]) {
      if (mk.mesh.visible) x = Math.max(x, mk.mesh.position.x + mk.mesh.scale.x);
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
    this.syncYarn(controller);
    this.ribbons.setRim(this.rimDecl(controller));
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
    if (this.anim) {
      this.emitAnimFrame(controller);
      return;
    }
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
    this.ribbons.setRim(this.rimDecl(controller));
    // K100: the fog's explored memory belongs to one solve. It starts over
    // when the solve restarts (Reset path's restart, a clock change, a
    // restore's replay: the controller's `restarts` moved) and only then -
    // an empty path (a backtrack to the entrance, a K80 catch) keeps it.
    // Keyed on the event, not on the state it leaves, so a reset followed
    // by taps before this runs (replay) still reads as a restart.
    if (controller.restarts !== this.fogRestarts) {
      this.fogRestarts = controller.restarts;
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
    if (
      this.revealQuery &&
      this.revealQuery(exitV.chain, exitV.ctrl) < 0.98
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
