import { Application, Container } from "pixi.js";
import { generateLatticeKnotwork } from "./core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "./core/maze_plan";
import { buildSectionField, setGamutConfig } from "./core/section_colors";
import { planAnchors } from "./core/shapes";
import { applyMazePlan, applyMazeCuts } from "./core/maze_apply";
import { buildWalkGraph } from "./core/walk_graph";
import type { WalkGraph } from "./core/walk_graph";
import { checkStructure, checkAlternation } from "./core/tangle_graph";
import { ParticleSystem } from "./physics/particle_system";
import { RibbonRenderer } from "./render/ribbon_renderer";
import { DebugRenderer } from "./render/debug_renderer";
import { FabricMazeRenderer } from "./render/fabric_maze_renderer";
import { FabricMazeController } from "./game/fabric_controller";
import { RevealAnimator } from "./render/reveal";
import { readParams, writeParams, newSeed, ROOT_NOTES } from "./ui/url_state";
import { buildPanel } from "./ui/tweakpane_panel";
import type { PanelSettings } from "./ui/tweakpane_panel";
import type { GenerationParams } from "./core/types";
import { KnotSynth } from "./audio/knot_synth";
import {
  assignPitches,
  assignPitchesFromList,
  segmentsNear,
  noteToFreq,
} from "./audio/pitch_space";
import type { PitchAssignment } from "./audio/pitch_space";
import { SCARBOROUGH_FAIR } from "./audio/songs";
import { APP_VERSION, BUILD_SHA, BUILD_TIME } from "./build_info";

const BACKGROUND = 0x151b28;
const FIT_MARGIN = 40;

// Code-state stamp, so a tab's build is verifiable at a glance (repos sync
// across machines with lag; stale tabs and stale checkouts happen). DERIVED
// at build time (vite.config.ts): version + git short SHA ("+" = built with
// uncommitted changes) + build time - it can no longer drift like the old
// hand-bumped description did. Leads with the roadmap phase: the diag
// scripts find the stamp by its /^P\d/ prefix.
const BUILD_STAMP =
  `P4 v${APP_VERSION} ${BUILD_SHA}` + (BUILD_TIME ? ` ${BUILD_TIME}` : "");
// The stamp/perf readout's visibility persists per browser.
const STATS_KEY = "knotmaze.showStats";
// Pinch / wheel zoom ceiling, as a multiple of the auto-fit scale.
const MAX_ZOOM = 8;
// FOLLOW camera (cameraMode follow): framing span (lattice units across
// the short screen side), the grace period after a pan/zoom gesture
// before the pull-back spring engages, its ease-in time, and its
// full-strength angular rate (critically damped - weak, no overshoot).
const FOLLOW_SPAN = 13;
const FOLLOW_DELAY = 1.2;
const FOLLOW_RAMP = 1.0;
const FOLLOW_W = 2.4;

// Appearance pre-sim: with any non-instant appear mode the sim settles
// briefly BEFORE the first rendered frame, so the reveal plays over a
// calm fabric instead of the violent initial snap. Bounded by sim time
// AND wall time, whichever first (normal step() calls in a loop - the
// physics numerics are untouched).
const PRE_SIM_SECONDS = 1.2;
const PRE_SIM_WALL_MS = 450;

const app = new Application();

async function main(): Promise<void> {
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio, 2),
    // Keep the canvas CSS size at logical pixels; without this, any
    // devicePixelRatio > 1 blows the canvas up past the viewport.
    autoDensity: true,
    // TRANSPARENT canvas: crossing gaps alpha-PUNCH the thread layer (the
    // renderer's 'erase'-blend patches), so whatever sits behind the canvas
    // shows through them. Today that is the same flat color as ever, moved
    // to the canvas CSS below; later a textured page backdrop can replace
    // it without touching the renderer.
    backgroundAlpha: 0,
  });
  document.body.appendChild(app.canvas);
  app.canvas.style.background = `#${BACKGROUND.toString(16).padStart(6, "0")}`;

  const params = readParams();
  let statsShown = false;
  try {
    statsShown = localStorage.getItem(STATS_KEY) === "1";
  } catch {
    // Storage unavailable: hidden by default.
  }
  const settings: PanelSettings = {
    temperature: 0,
    showDebug: false,
    muted: false,
    showStats: statsShown,
  };
  const synth = new KnotSynth();

  const root = new Container();
  app.stage.addChild(root);

  let ps: ParticleSystem | null = null;
  let renderer: RibbonRenderer | null = null;
  let debug: DebugRenderer | null = null;
  let walkGraph: WalkGraph | null = null;
  // The build's strand hue groups (maze plan; undefined in knot mode) +
  // strand count, kept for live recolors (the Look color controls).
  let buildHueGroup: number[] | undefined;
  let buildStrandCount = 0;
  let fabric: FabricMazeRenderer | null = null;
  let fabricController: FabricMazeController | null = null;
  // Stage 22: the running appearance animation (null = instant / done
  // long ago). Rebuilds and "Replay settle" restart it.
  let reveal: RevealAnimator | null = null;

  // Stage 20 audio: every segment (walk-graph run in fabric mode, whole
  // strand otherwise) owns one pitch from the chosen space, assigned by
  // length bucket. audioRuns maps a chain ctrl to its run for manual
  // plucks; audioSegSite is where auto plucks physically tug.
  let audioAssign: PitchAssignment | null = null;
  let audioRuns: Map<
    number,
    Array<{ c0: number; c1: number; seg: number }>
  > | null = null;
  let audioSegSite: Array<{ chain: number; ctrl: number }> = [];
  let nextRandomPluck = 0;
  let songIndex = 0;
  let songNextAt = 0;

  // The unanchored knot finds its own shape, so the viewport fit follows
  // the live particle bounds, easing toward the target to avoid popping.
  const fitTarget = { scale: 1, x: 0, y: 0 };
  function computeFitTarget(): void {
    if (!ps) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < ps.particleCount; i++) {
      const x = ps.positions[i * 2];
      const y = ps.positions[i * 2 + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    let pad = params.threadWidth / 2 + 0.3;
    // FOG OF WAR: frame only what the fog lets you see (the explored
    // region grown by the reveal radius) - it widens as you explore.
    const fogBox =
      params.mazeFabric && fabric ? fabric.fogVisibleBounds() : null;
    if (fogBox) {
      minX = fogBox.minX;
      minY = fogBox.minY;
      maxX = fogBox.maxX;
      maxY = fogBox.maxY;
      pad = 0.3;
    }
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const w = Math.max(maxX - minX, 1);
    const h = Math.max(maxY - minY, 1);
    // Fit the knot, but never zoom in past a comfortable thread scale.
    fitTarget.scale = Math.min(
      (app.screen.width - FIT_MARGIN * 2) / w,
      (app.screen.height - FIT_MARGIN * 2) / h,
      90
    );
    fitTarget.x = (app.screen.width - w * fitTarget.scale) / 2 - minX * fitTarget.scale;
    fitTarget.y =
      (app.screen.height - h * fitTarget.scale) / 2 - minY * fitTarget.scale;
  }

  // ---- CAMERA ------------------------------------------------------------
  // Two modes (params.cameraMode):
  // FIT - the eased auto-fit (the whole knot, or under fog the visible
  //   region) with the user's zoom/pan composed on top in SCREEN space:
  //   screen = zoom * fitScreen + pan. Zoom 1 is the home view and pans
  //   clamp so the zoomed fit frame always covers the screen (at zoom 1
  //   the pan is forced to 0 - pinching back out lands exactly on the
  //   fit).
  // FOLLOW - a chase camera on the player's head (maze mode): a scale +
  //   world center that gestures move freely, pulled back by a weak,
  //   critically damped spring that stays OFF for FOLLOW_DELAY after the
  //   last gesture and then eases its stiffness in over FOLLOW_RAMP (the
  //   approach itself eases out). During the intro it frames the knot.
  // Gestures speak one primitive - put world point (wx, wy) at screen
  // point (sx, sy) at scale s (placeWorldAt) - and each mode maps it onto
  // its own state, so pinch / wheel / drag behave identically in both.
  const fitCur = { scale: 1, x: 0, y: 0 };
  const view = { zoom: 1, panX: 0, panY: 0 };
  const cam = { s: 1, cx: 0, cy: 0, vl: 0, vx: 0, vy: 0 };
  let camFollow = false;
  let camTouchedAt = -1e9; // performance.now seconds of the last gesture.
  let viewHoming = false; // Fit mode: easing a reset back to the home view.
  const headScratch = new Float64Array(2);
  const nowSec = (): number => performance.now() / 1000;
  const touchCamera = (): void => {
    camTouchedAt = nowSec();
    viewHoming = false;
  };
  const clampView = (): void => {
    view.zoom = Math.min(MAX_ZOOM, Math.max(1, view.zoom));
    const w = app.screen.width;
    const h = app.screen.height;
    view.panX = Math.min(0, Math.max(w * (1 - view.zoom), view.panX));
    view.panY = Math.min(0, Math.max(h * (1 - view.zoom), view.panY));
  };
  const applyView = (): void => {
    root.scale.set(fitCur.scale * view.zoom);
    root.position.set(
      fitCur.x * view.zoom + view.panX,
      fitCur.y * view.zoom + view.panY
    );
  };
  const applyCam = (): void => {
    root.scale.set(cam.s);
    root.position.set(
      app.screen.width / 2 - cam.cx * cam.s,
      app.screen.height / 2 - cam.cy * cam.s
    );
  };
  // Follow framing: FOLLOW_SPAN lattice units across the short screen
  // side - or under fog, the visible disc plus a margin.
  const followScale = (): number => {
    const span = params.fogOfWar
      ? 2 * (params.fowRadius + 1.2)
      : FOLLOW_SPAN;
    return Math.min(app.screen.width, app.screen.height) / span;
  };
  const placeWorldAt = (
    wx: number,
    wy: number,
    sx: number,
    sy: number,
    s: number
  ): void => {
    const lo = camFollow
      ? Math.min(fitTarget.scale, followScale()) * 0.85
      : fitCur.scale;
    const hi = camFollow ? followScale() * 4 : fitCur.scale * MAX_ZOOM;
    const sc = Math.min(hi, Math.max(lo, s));
    const px = sx - wx * sc;
    const py = sy - wy * sc;
    if (camFollow) {
      cam.s = sc;
      cam.cx = (app.screen.width / 2 - px) / sc;
      cam.cy = (app.screen.height / 2 - py) / sc;
      cam.vl = 0;
      cam.vx = 0;
      cam.vy = 0;
      applyCam();
    } else {
      view.zoom = sc / fitCur.scale;
      view.panX = px - fitCur.x * view.zoom;
      view.panY = py - fitCur.y * view.zoom;
      clampView();
      applyView();
    }
  };
  // Zoom by `factor` about screen point (sx, sy).
  const zoomAt = (sx: number, sy: number, factor: number): void => {
    const s = root.scale.x;
    placeWorldAt(
      (sx - root.position.x) / s,
      (sy - root.position.y) / s,
      sx,
      sy,
      s * factor
    );
    touchCamera();
  };
  const panBy = (dx: number, dy: number): void => {
    const s = root.scale.x;
    placeWorldAt(-root.position.x / s, -root.position.y / s, dx, dy, s);
    touchCamera();
  };
  // Double-click / double-tap on empty space: back to the home framing.
  const resetCamera = (): void => {
    if (camFollow) camTouchedAt = -1e9; // Full-strength pull at once.
    else viewHoming = true;
  };
  // Mode switches hand over the CURRENT framing (no jump); each mode then
  // eases to its own target.
  const setCamFollow = (on: boolean): void => {
    if (on === camFollow) return;
    if (on) {
      cam.s = root.scale.x;
      cam.cx = (app.screen.width / 2 - root.position.x) / cam.s;
      cam.cy = (app.screen.height / 2 - root.position.y) / cam.s;
      cam.vl = 0;
      cam.vx = 0;
      cam.vy = 0;
      camTouchedAt = nowSec() - FOLLOW_DELAY;
    } else {
      fitCur.scale = root.scale.x;
      fitCur.x = root.position.x;
      fitCur.y = root.position.y;
      view.zoom = 1;
      view.panX = 0;
      view.panY = 0;
    }
    camFollow = on;
  };

  // Per-frame camera step, in EVERY ticker branch (fog reveals grow and
  // the head travels while the physics sleeps).
  let fitFrames = 0;
  const updateCamera = (dt: number): void => {
    if (fitFrames++ % 3 === 0) computeFitTarget();
    fitCur.scale += (fitTarget.scale - fitCur.scale) * 0.08;
    fitCur.x += (fitTarget.x - fitCur.x) * 0.08;
    fitCur.y += (fitTarget.y - fitCur.y) * 0.08;
    setCamFollow(
      params.cameraMode === "follow" && params.mazeFabric && fabric !== null
    );
    if (!camFollow) {
      if (viewHoming) {
        view.zoom += (1 - view.zoom) * 0.15;
        view.panX -= view.panX * 0.15;
        view.panY -= view.panY * 0.15;
        if (Math.abs(view.zoom - 1) < 1e-3) {
          view.zoom = 1;
          view.panX = 0;
          view.panY = 0;
          viewHoming = false;
        }
        clampView();
      }
      applyView();
      return;
    }
    // Target: the head - or the whole knot while the intro plays.
    let ts = fitTarget.scale;
    let tx = (app.screen.width / 2 - fitTarget.x) / ts;
    let ty = (app.screen.height / 2 - fitTarget.y) / ts;
    const intro = reveal !== null && !reveal.done;
    if (!intro && fabric && fabric.headPosition(headScratch)) {
      ts = followScale();
      tx = headScratch[0];
      ty = headScratch[1];
    }
    const idle = nowSec() - camTouchedAt;
    const r = Math.max(0, Math.min(1, (idle - FOLLOW_DELAY) / FOLLOW_RAMP));
    const ease = r * r * (3 - 2 * r);
    if (ease > 0) {
      const w = FOLLOW_W * ease;
      const h = Math.min(dt, 0.05);
      // Critically damped spring per axis (zoom in log space).
      const step = (
        x: number,
        v: number,
        target: number
      ): [number, number] => {
        const v2 = v + (w * w * (target - x) - 2 * w * v) * h;
        return [x + v2 * h, v2];
      };
      const [ls, vl] = step(Math.log(cam.s), cam.vl, Math.log(ts));
      cam.s = Math.exp(ls);
      cam.vl = vl;
      [cam.cx, cam.vx] = step(cam.cx, cam.vx, tx);
      [cam.cy, cam.vy] = step(cam.cy, cam.vy, ty);
    }
    applyCam();
  };

  function fitToScreen(): void {
    computeFitTarget();
    fitCur.scale = fitTarget.scale;
    fitCur.x = fitTarget.x;
    fitCur.y = fitTarget.y;
    clampView();
    if (camFollow) applyCam();
    else applyView();
  }

  // Stage 22: (re)start the appearance animation. Pre-settles the sim
  // (hidden - nothing has rendered yet on a rebuild, and the reveal masks
  // start collapsed), then hands the renderer a fresh animator. Instant
  // mode detaches everything: the render path is byte-identical to the
  // pre-Stage-22 build.
  function startAppearance(): void {
    if (!ps || !renderer) return;
    if (params.appearMode === "instant") {
      reveal = null;
      renderer.beginReveal(null);
      if (fabric) fabric.revealQuery = null;
      return;
    }
    const tuning = {
      temperature: settings.temperature,
      slack: params.slack,
      drag: params.drag,
      repulsion: params.repulsion,
      bend: params.bend,
      smooth: params.smooth,
      stiffness: params.stiffness,
      gridAlign: params.gridAlign,
      threadWidth: params.threadWidth,
    };
    const wall0 = performance.now();
    const simTarget = ps.simTime + PRE_SIM_SECONDS;
    while (
      ps.simTime < simTarget &&
      performance.now() - wall0 < PRE_SIM_WALL_MS
    ) {
      ps.step(0.1, tuning);
    }
    reveal = new RevealAnimator(params.appearMode, walkGraph, ps, params.seed);
    // Burn eats the threads faster (x1.8) - a creeping fire line, not a
    // slow trace.
    reveal.speed =
      params.appearSpeed * (params.appearFx === "burn" ? 1.8 : 1);
    renderer.beginReveal(reveal);
    if (fabric) {
      const r = renderer;
      fabric.revealQuery = (chain, ctrl) => r.revealMulAtCtrl(chain, ctrl);
    }
  }

  function rebuild(): void {
    renderer?.destroy();
    debug?.container.destroy({ children: true });
    fabric?.destroy();
    root.removeChildren();

    const genParams: GenerationParams = {
      gridSize: params.gridSize,
      weaveDensity: params.weaveDensity,
      turnBias: params.turnBias,
      randSeed: params.seed,
      shape: params.shape,
    };
    const graph = generateLatticeKnotwork(genParams);

    // Branching maze fabric (mazeFabric): plan + apply the splice/merge/stub
    // surgery and carve the corner entrance/exit at GRAPH level, so the
    // particle system builds the fabric natively (open chains, fused
    // junctions, anchored ends).
    let hueGroup: number[] | undefined;
    if (params.mazeFabric) {
      const plan = buildMazePlan(graph, {
        ...DEFAULT_MAZE_PARAMS,
        branchDensity: params.branchDensity,
        fourWayFraction: params.fourWayFraction,
        deadEndDensity: params.deadEnds ? params.deadEndDensity : 0,
        // Entrance/exit anchored to the shape's boundary (shp/sa/xa).
        ...planAnchors(
          params.shape,
          params.gridSize,
          params.startAnchor,
          params.exitAnchor
        ),
      });
      hueGroup = applyMazePlan(graph, plan);
      applyMazeCuts(graph, plan, hueGroup);
    }

    if (!checkStructure(graph) || !checkAlternation(graph)) {
      console.warn("Knot invariants violated; generation bug.");
    }

    ps = new ParticleSystem(graph);
    buildHueGroup = hueGroup;
    buildStrandCount = graph.strands.length;

    // Color space for this build: seed hue rotated by hueShift; arc width
    // and palette preset configure gamutRgb for every consumer (schemes
    // AND the renderer's per-sample noise path).
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, params.palette);

    // The walk graph feeds both the section coloring and (in fabric mode)
    // the gameplay, so it builds before the renderer.
    walkGraph = params.mazeFabric ? buildWalkGraph(graph) : null;

    renderer = new RibbonRenderer(ps, {
      threadWidth: params.threadWidth,
      casingWidth: params.threadWidth + params.gap * 2,
      baseHue: effHue,
      pathColor: parseInt(params.pathColor.slice(1), 16),
      // Knot-mode tints only (palette mode colors via the section field):
      // per-strand hues for the strands scheme, mono otherwise.
      hueGroup:
        params.colorScheme === "strands"
          ? hueGroup
          : graph.strands.map(() => 0),
      // Fabric gameplay recolors the actual threads via palette textures.
      paletteMode: params.mazeFabric,
      flowSeed: params.seed,
    });
    renderer.setSectionField(
      buildSectionField(
        params.colorScheme,
        walkGraph,
        ps.chains.map((c) => c.length),
        hueGroup,
        params.seed,
        effHue // The gamut anchor; matches style.baseHue.
      ),
      params.colorScheme,
      params.seed
    );

    // Branching gameplay over the fabric: branch-point-only solve state +
    // the thread-true paint overlay (the walk graph was built above).
    if (params.mazeFabric && walkGraph) {
      fabricController = new FabricMazeController(
        walkGraph,
        params.pathViz === "trail"
      );
      fabric = new FabricMazeRenderer(
        ps,
        walkGraph,
        params.threadWidth,
        renderer
      );
      fabric.trailMode = params.pathViz === "trail";
      fabric.pathViz = params.pathViz;
      fabric.tension = params.tension;
      fabric.trailLength = params.trailLength;
      fabric.fogOfWar = params.fogOfWar;
      fabric.fowRadius = params.fowRadius;
      fabric.fogColor = BACKGROUND;
      fabric.update(fabricController);
    } else {
      fabricController = null;
      fabric = null;
    }
    pendingWin = false;
    updateHud();
    hideWin();
    rebuildAudioMap();

    // Appearance animation: pre-settle + attach the reveal BEFORE the
    // first frame renders (and before the viewport fit below, which then
    // frames the calmer pre-rolled bounds).
    startAppearance();

    debug = new DebugRenderer();
    debug.render(graph);
    // The debug renderer draws at cellSize px per lattice unit; the root
    // container already maps lattice units to screen, so counter-scale.
    debug.container.scale.set(1 / debug.cellSize);
    debug.container.visible = settings.showDebug;

    // Order: head glow UNDER the weave, ribbons, the fabric gameplay
    // overlay, debug.
    if (fabric) root.addChild(fabric.underContainer);
    root.addChild(renderer.root);
    if (fabric) root.addChild(fabric.overContainer);
    root.addChild(debug.container);
    // A new scene starts at the home view (user zoom/pan reset); a
    // follow camera takes over from this framing on the next frame.
    setCamFollow(false);
    view.zoom = 1;
    view.panX = 0;
    view.panY = 0;
    viewHoming = false;
    fitToScreen();
    writeParams(params);

    console.log(
      `KnotMaze: seed ${params.seed}, ${graph.nodes.size} nodes, ` +
        `${graph.edges.size} edges, ${graph.strands.length} strands.`
    );
  }

  // Re-derive the per-segment pitch assignment (cheap; no scene rebuild).
  function rebuildAudioMap(): void {
    if (!ps) return;
    let assignFor: (lengths: number[]) => PitchAssignment;
    if (params.soundMode === "music") {
      // Music mode: the buckets are EXACTLY the song's distinct pitches,
      // so every thread belongs to some note the piece actually plays
      // and every note has segments to animate. pitchSpace/octaves do
      // not apply here (the panel hides them).
      const set = new Set<number>();
      for (const r of SCARBOROUGH_FAIR.notes) {
        if (!r.note) continue;
        const f = noteToFreq(r.note);
        if (Number.isFinite(f)) set.add(Math.round(f * 1000) / 1000);
      }
      const pitches = [...set].sort((a, b) => a - b);
      assignFor = (lengths) => assignPitchesFromList(pitches, lengths);
    } else {
      // Root: seed-derived unless the rootNote param picks a fixed class.
      const rootIdx = ROOT_NOTES.indexOf(params.rootNote) - 1;
      const root = rootIdx >= 0 ? rootIdx : params.seed % 12;
      assignFor = (lengths) =>
        assignPitches(
          params.pitchSpace,
          params.octaves,
          root,
          lengths,
          params.tonicEmphasis
        );
    }
    if (walkGraph) {
      audioAssign = assignFor(walkGraph.edges.map((e) => e.length));
      audioRuns = new Map();
      audioSegSite = walkGraph.edges.map((e) => ({
        chain: e.chain,
        ctrl: (e.ctrlA + e.ctrlB) / 2,
      }));
      for (const e of walkGraph.edges) {
        let list = audioRuns.get(e.chain);
        if (!list) {
          list = [];
          audioRuns.set(e.chain, list);
        }
        list.push({ c0: e.ctrlA, c1: e.ctrlB, seg: e.id });
      }
    } else {
      audioAssign = assignFor(ps.chains.map((c) => c.length));
      audioRuns = null;
      audioSegSite = ps.chains.map((c, i) => ({
        chain: i,
        ctrl: Math.floor(c.length / 2),
      }));
    }
    nextRandomPluck = 0;
    songIndex = 0;
    songNextAt = 0;
  }

  // Pitch of the segment under a grabbed particle. Chains outside the walk
  // graph (decorative culled loops) hash onto the assignment.
  function freqForGrab(chain: number, particle: number): number {
    if (!audioAssign || !ps) return 220;
    const n = audioAssign.segFreq.length;
    if (n === 0) return 220;
    if (!audioRuns) return audioAssign.segFreq[chain % n];
    const list = audioRuns.get(chain);
    if (!list || list.length === 0) return audioAssign.segFreq[chain % n];
    const ctrl = ps.chains[chain].indexOf(particle);
    const len = ps.chains[chain].length;
    for (const r of list) {
      if (
        (ctrl >= r.c0 && ctrl <= r.c1) ||
        (ctrl + len >= r.c0 && ctrl + len <= r.c1)
      ) {
        return audioAssign.segFreq[r.seg];
      }
    }
    return audioAssign.segFreq[list[0].seg];
  }

  buildPanel(params, settings, {
    onRegenerate: () => {
      rebuild();
      wake();
    },
    onReseed: () => {
      params.seed = newSeed();
      rebuild();
      wake();
    },
    onReplaySettle: () => {
      ps?.reset();
      // Replay the appearance too: fresh pre-roll, fresh reveal clock.
      startAppearance();
      wake();
    },
    onStatsToggle: (visible) => {
      stamp.style.display = visible ? "" : "none";
      try {
        localStorage.setItem(STATS_KEY, visible ? "1" : "0");
      } catch {
        // Storage unavailable: the choice just doesn't persist.
      }
    },
    onDebugToggle: (visible) => {
      if (debug) debug.container.visible = visible;
    },
    onSlackChange: () => {
      writeParams(params);
      wake();
    },
    onStyleChange: () => {
      renderer?.setWidths(params.threadWidth, params.gap);
      fabric?.setWidths(params.threadWidth);
      if (fabric && fabricController) fabric.update(fabricController);
      writeParams(params);
      wake();
    },
    onTemperatureChange: () => wake(),
    // Memory-trail mode + trail length apply LIVE: they change only the
    // gameplay interpretation (controller flag) and the paint declaration,
    // never the scene - no rebuild, and no wake (the paint pass runs in the
    // asleep/paused ticker branches).
    onTrailChange: () => {
      if (fabricController) {
        fabricController.trailMode = params.pathViz === "trail";
      }
      if (fabric && fabricController) {
        fabric.trailMode = params.pathViz === "trail";
        fabric.pathViz = params.pathViz;
        fabric.tension = params.tension;
        fabric.trailLength = params.trailLength;
        fabric.fogOfWar = params.fogOfWar;
        fabric.fowRadius = params.fowRadius;
        fabric.update(fabricController);
      }
      updateHud();
      writeParams(params);
    },
    // Look color controls: recolor the live scene in place (the full
    // rebuild they used to trigger reset the knot, replayed the reveal and
    // wiped the player's progress for a hue tweak).
    onRecolor: () => {
      if (renderer && ps) {
        const effHue =
          (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
        setGamutConfig(params.gamutArc, params.palette);
        renderer.recolor(
          effHue,
          parseInt(params.pathColor.slice(1), 16),
          params.colorScheme === "strands"
            ? buildHueGroup
            : new Array<number>(buildStrandCount).fill(0),
          buildSectionField(
            params.colorScheme,
            walkGraph,
            ps.chains.map((c) => c.length),
            buildHueGroup,
            params.seed,
            effHue
          ),
          params.colorScheme,
          params.seed
        );
        if (fabric && fabricController) fabric.update(fabricController);
      }
      writeParams(params);
      wake();
    },
    onModeChange: () => {
      // Mode changes alter the graph TOPOLOGY (fabric surgery, color
      // field), which is baked in at build time, so a full rebuild is
      // required rather than a visibility toggle.
      writeParams(params);
      rebuild();
      app.canvas.style.cursor = "default";
      wake();
    },
    onResetPath: () => {
      fabricController?.reset();
      fabric?.cancelMove();
      fabric?.clearYarn();
      pendingWin = false;
      hideWin();
      if (fabric && fabricController) fabric.update(fabricController);
      updateHud();
      wake();
    },
    onAudioChange: () => {
      writeParams(params);
      rebuildAudioMap();
    },
    onVolumeChange: () => {
      writeParams(params);
      synth.setVolume(params.volume);
      synth.setReverb(params.reverb);
      synth.setVoice({
        brightness: params.brightness,
        sustain: params.sustain,
        shimmer: params.shimmer,
        pickPosition: params.pickPosition,
      });
    },
  });
  synth.setVolume(params.volume);
  synth.setReverb(params.reverb);
  synth.setVoice({
    brightness: params.brightness,
    sustain: params.sustain,
    shimmer: params.shimmer,
    pickPosition: params.pickPosition,
  });

  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    fitToScreen();
  });

  // Pointer tug: grab the nearest thread particle, drag it (springs carry
  // the tug through the knot), and pluck the strand on release.
  const toLattice = (e: PointerEvent): [number, number] => [
    (e.clientX - root.position.x) / root.scale.x,
    (e.clientY - root.position.y) / root.scale.y,
  ];
  const GRAB_RADIUS = 0.7;

  // Win banner. Hidden until a solve completes.
  const banner = document.createElement("div");
  banner.id = "maze-banner";
  banner.style.cssText =
    "position:fixed;top:16px;left:50%;transform:translateX(-50%);" +
    "padding:10px 18px;background:#1b2233ee;color:#8fe6ff;" +
    "font:14px/1.3 monospace;border:1px solid #39d353;border-radius:6px;" +
    "z-index:20;display:none;pointer-events:none";
  document.body.appendChild(banner);
  const hideWin = (): void => {
    banner.style.display = "none";
  };

  // Fabric-maze HUD: the two distance readouts, both in deterministic
  // lattice arc. (a) the CURRENT path vs the optimal solve, (b) cumulative
  // distance retracted by backtracking - separate meters by design.
  const hud = document.createElement("div");
  hud.id = "maze-hud";
  hud.style.cssText =
    "position:fixed;top:max(10px,env(safe-area-inset-top));" +
    "left:max(10px,env(safe-area-inset-left));padding:7px 12px;" +
    "background:#1b2233cc;color:#c8d3e8;font:12px/1.5 monospace;" +
    "border:1px solid #2c3a55;border-radius:6px;z-index:20;" +
    "display:none;pointer-events:none;white-space:pre";
  document.body.appendChild(hud);
  // Distances display x10 as integers (no decimal point).
  const fmt = (v: number): string =>
    Number.isFinite(v) ? String(Math.round(v * 10)) : "—";
  const updateHud = (): void => {
    if (!params.mazeFabric || !fabricController) {
      hud.style.display = "none";
      return;
    }
    const c = fabricController;
    // Memory-trail mode has no backtracking, so no backtrack meter.
    hud.textContent =
      `path ${fmt(c.pathLength)} / optimal ${fmt(c.walk.optimalLength)}` +
      (params.pathViz === "trail"
        ? ""
        : `\nbacktracked ${fmt(c.backtrackDist)}`);
    hud.style.display = "block";
  };
  // Set when a winning tap lands; the banner shows once the traversal
  // animation delivers the dot to the exit.
  let pendingWin = false;
  const showFabricWin = (): void => {
    if (!fabricController) return;
    const c = fabricController;
    const over =
      Number.isFinite(c.walk.optimalLength) && c.walk.optimalLength > 0
        ? ` (+${(((c.pathLength - c.walk.optimalLength) / c.walk.optimalLength) * 100).toFixed(0)}%)`
        : "";
    banner.textContent =
      `Solved! path ${fmt(c.pathLength)} vs optimal ` +
      `${fmt(c.walk.optimalLength)}${over}` +
      (params.pathViz === "trail"
        ? ""
        : ` · backtracked ${fmt(c.backtrackDist)}`) +
      ` \u{1F389}`;
    banner.style.display = "block";
  };

  // Fabric maze: a tap on a run incident to the current branch point is a
  // move (advance or backtrack); anywhere else falls through to grab/tug,
  // which stays live in fabric mode. Returns true when the tap was a move.
  const handleFabricTap = (x: number, y: number): boolean => {
    if (!fabric || !fabricController) return false;
    const eid = fabric.edgeAt(x, y, fabricController);
    if (eid < 0) return false;
    const result = fabricController.tapEdge(eid);
    fabric.setHover(-1);
    // The game state moved instantly; the dot + gold front animate along
    // the thread to catch up. The win banner waits for the arrival.
    if (result === "advance" || result === "backtrack" || result === "win") {
      fabric.beginMove(
        eid,
        result === "backtrack" ? "backtrack" : "advance",
        fabricController
      );
      if (result === "win") pendingWin = true;
    } else {
      fabric.update(fabricController);
    }
    updateHud();
    wake();
    return result !== "reject";
  };

  // Stage 19 - bounded tug + snap-back, pointer-layer only (the physics
  // grab machinery is untouched, so knot-mode byte identity holds). The
  // drag target is rubber-banded around the grab ORIGIN (the grabbed
  // particle's position at grab time): eff = L * tanh(r / L) with
  // L = tugLimit thread widths, so the first stretch tracks the cursor
  // ~1:1 and the thread asymptotes at the limit - pulling further reads
  // as mounting resistance. On release the target eases home
  // (exponential at snapBack 1/s) before the grab frees; the pluck voice
  // fires at POINTERUP from the tracked drag speed, since by actual
  // release time the eased thread is nearly still.
  // Stage 21 extends the release with a STRING mode: instead of the soft
  // exponential ease home, the target snaps back sharply and rings - a
  // damped cosine along the release axis (origin-crossing within ~50ms,
  // ~4 visible cycles), the visible frequency rising gently with the
  // segment's pitch. Only the grabbed point is driven; the springs
  // low-pass the motion into the neighbors, so the ring stays local to
  // the segment while the pull-out still propagated like any drag.
  const grabOrigin = new Float64Array(2);
  const dragPos = new Float64Array(2);
  let dragVel = 0;
  let lastMoveT = 0;
  let snapMode: "none" | "soft" = "none";
  // In-flight auto-pluck gesture (random/music modes): a short scripted
  // pull-out on the shared grab machinery, released into string mode.
  let autoGesture: {
    t: number;
    dur: number;
    nx: number;
    ny: number;
    amp: number;
    hz: number;
  } | null = null;

  const boundedDragTo = (x: number, y: number): void => {
    if (!ps) return;
    const L = Math.max(0.1, params.tugLimit * params.threadWidth);
    const dx = x - grabOrigin[0];
    const dy = y - grabOrigin[1];
    const r = Math.hypot(dx, dy);
    const s = r > 1e-9 ? (L * Math.tanh(r / L)) / r : 0;
    dragPos[0] = grabOrigin[0] + dx * s;
    dragPos[1] = grabOrigin[1] + dy * s;
    ps.dragTo(dragPos[0], dragPos[1]);
  };

  // End any release animation / auto gesture immediately (new grab,
  // regenerate): free the grab with no sound - the pluck already played.
  const cancelSnap = (): void => {
    if (autoGesture) {
      autoGesture = null;
      ps?.release();
    }
    if (snapMode === "none") return;
    snapMode = "none";
    ps?.release();
  };

  // Visible ring frequency from the audible pitch: low strings wobble
  // slow, high strings shimmer. Band raised 3-8 -> 5-13 Hz ("too loose
  // and wobbly, not enough like an actual plucked string").
  const visibleHz = (freq: number): number =>
    Math.min(
      13,
      Math.max(5, 5.5 + 1.6 * Math.log2(Math.max(55, freq) / 110))
    );

  // Begin the release animation for whatever is currently displaced.
  const beginRelease = (style: "soft" | "string", hz: number): void => {
    const dx = dragPos[0] - grabOrigin[0];
    const dy = dragPos[1] - grabOrigin[1];
    let amp = Math.hypot(dx, dy);
    let ax = amp > 1e-6 ? dx / amp : 1;
    let ay = amp > 1e-6 ? dy / amp : 0;
    // Tap-plucks: the audible pluck fires regardless of drag distance, but
    // a near-zero release offset rang invisibly. Floor the visible
    // amplitude, swinging across the thread (the transverse axis a real
    // string rings on; small drags get the same axis - their direction is
    // pointer noise anyway).
    if (style === "string" && ps && ps.grabbedParticle >= 0) {
      const minAmp = Math.max(0.12, params.threadWidth * 0.35);
      if (amp < minAmp) {
        const p = ps.grabbedParticle;
        const pos = ps.positions;
        const n = pos.length / 2;
        const p0 = Math.max(0, p - 1);
        const p1 = Math.min(n - 1, p + 1);
        const tx = pos[p1 * 2] - pos[p0 * 2];
        const ty = pos[p1 * 2 + 1] - pos[p0 * 2 + 1];
        const tl = Math.hypot(tx, ty);
        if (tl > 1e-6) {
          ax = -ty / tl;
          ay = tx / tl;
        }
        amp = minAmp;
      }
    }
    if (style === "string" && amp > 0.02 && ps && renderer) {
      // RENDER-ONLY RING: release the physics IMMEDIATELY (neighbors
      // feel only the brief natural snap-back - the old grab-driven
      // oscillation shook the whole neighborhood through the crossing
      // couplings, the "too much overall jiggle" report) and paint the
      // visible vibration as a damped standing wave on the render
      // controls. snappiness scales FREQUENCY ONLY - a taut string
      // rings fast but just as long, so the decay stays fixed (the
      // earlier tau tightening made snappy plucks die instantly).
      const p = ps.grabbedParticle;
      const px = p >= 0 ? ps.positions[p * 2] : grabOrigin[0];
      const py = p >= 0 ? ps.positions[p * 2 + 1] : grabOrigin[1];
      let chain = -1;
      if (p >= 0) {
        for (let c = 0; c < ps.chains.length; c++) {
          if (ps.chains[c].includes(p)) {
            chain = c;
            break;
          }
        }
      }
      const s = params.snappiness;
      renderer.addPluckWave(
        chain,
        px,
        py,
        ax,
        ay,
        Math.min(amp, 0.6),
        // Capped well under the ~30Hz Nyquist of a 60fps display - past
        // it the render-sampled ring aliases into a slow beat wobble.
        Math.min(24, hz * (0.35 + 1.8 * s)),
        0.55
      );
      snapMode = "none";
      ps.release();
    } else if (style === "soft" && params.snapBack > 0) {
      snapMode = "soft";
    } else {
      snapMode = "none";
      ps?.release();
    }
  };

  app.canvas.style.touchAction = "none";

  // GESTURES. Touch: two fingers pinch-zoom + pan; one finger tugs
  // threads and taps choices as before, and drags EMPTY space to pan.
  // Touch taps on maze choices resolve on RELEASE (desktop clicks stay on
  // press), so the first finger of a pinch can never move the player; a
  // pinch also drops any tug it interrupts without plucking, and after a
  // pinch, fingers still down do nothing until all have lifted. Desktop:
  // the wheel zooms at the cursor, a trackpad two-finger scroll pans and
  // its pinch (ctrl+wheel) zooms, dragging empty space (or any middle-
  // button drag) pans. Double-click / double-tap empty space resets.
  const touches = new Map<number, { x: number; y: number }>();
  let pinch: {
    d0: number;
    s0: number;
    wx: number;
    wy: number;
  } | null = null;
  let touchLocked = false;
  let pendingTap: {
    id: number;
    sx: number;
    sy: number;
    x: number;
    y: number;
  } | null = null;
  let dragPan: { id: number; x: number; y: number; moved: number } | null =
    null;
  let lastEmptyTap = -1e9;
  const TAP_SLOP = 10; // CSS px a tap may wander and still count.
  const pinchPair = (): [
    { x: number; y: number },
    { x: number; y: number },
  ] => {
    const it = touches.values();
    return [it.next().value!, it.next().value!];
  };
  const beginPinch = (): void => {
    if (ps && ps.grabbedParticle >= 0 && !autoGesture) {
      ps.release();
      snapMode = "none";
    }
    pendingTap = null;
    dragPan = null;
    touchLocked = true;
    const [a, b] = pinchPair();
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const s0 = root.scale.x;
    pinch = {
      d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      s0,
      wx: (mx - root.position.x) / s0,
      wy: (my - root.position.y) / s0,
    };
  };
  const updatePinch = (): void => {
    if (!pinch) return;
    const [a, b] = pinchPair();
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    placeWorldAt(
      pinch.wx,
      pinch.wy,
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      pinch.s0 * (d / pinch.d0)
    );
    touchCamera();
  };
  // Nothing to tap or tug at this lattice point (where empty-space
  // gestures - pan, double-tap reset - may take over).
  const emptyAt = (x: number, y: number): boolean =>
    !!ps &&
    ps.nearest(x, y, GRAB_RADIUS) < 0 &&
    !(
      params.mazeFabric &&
      fabric &&
      fabricController &&
      fabric.edgeAt(x, y, fabricController) >= 0
    );

  app.canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? app.screen.height : 1;
      // A mouse wheel ticks in big integer steps with no deltaX (or in
      // lines); a trackpad pinch arrives as ctrl+wheel; anything else is
      // a two-finger trackpad scroll, which PANS like a laptop map.
      const mouseWheel =
        e.deltaMode !== 0 ||
        (e.deltaX === 0 &&
          Number.isInteger(e.deltaY) &&
          Math.abs(e.deltaY) >= 40);
      if (e.ctrlKey || mouseWheel) {
        const k = e.ctrlKey ? 0.01 : 0.0015;
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * k));
      } else {
        panBy(-e.deltaX * unit, -e.deltaY * unit);
      }
    },
    { passive: false }
  );
  app.canvas.addEventListener("dblclick", (e) => {
    const [x, y] = toLattice(e as unknown as PointerEvent);
    if (emptyAt(x, y)) resetCamera();
  });

  app.canvas.addEventListener("pointerdown", (e) => {
    if (!ps) return;
    if (e.pointerType === "touch") {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2) {
        if (!pinch) beginPinch();
        return;
      }
      if (touchLocked) return;
    }
    // Middle-button drag pans from anywhere.
    if (e.pointerType === "mouse" && e.button === 1) {
      e.preventDefault();
      dragPan = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
      app.canvas.setPointerCapture(e.pointerId);
      app.canvas.style.cursor = "grabbing";
      return;
    }
    wake();
    cancelSnap();
    const [x, y] = toLattice(e);
    // Alt+click: dump the nearest crossing's render state to the console
    // (diagnostic; makes broken-crossing reports exactly reproducible).
    if (e.altKey) {
      renderer?.requestInspect(x, y);
      return;
    }
    if (params.mazeFabric) {
      if (e.pointerType === "touch") {
        if (
          fabric &&
          fabricController &&
          fabric.edgeAt(x, y, fabricController) >= 0
        ) {
          pendingTap = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x, y };
          return;
        }
      } else if (handleFabricTap(x, y)) {
        return;
      }
    }
    if (ps.grab(x, y, GRAB_RADIUS) >= 0) {
      const p = ps.grabbedParticle;
      grabOrigin[0] = ps.positions[p * 2];
      grabOrigin[1] = ps.positions[p * 2 + 1];
      dragPos[0] = grabOrigin[0];
      dragPos[1] = grabOrigin[1];
      dragVel = 0;
      lastMoveT = e.timeStamp;
      app.canvas.setPointerCapture(e.pointerId);
      app.canvas.style.cursor = "grabbing";
    } else {
      // Empty space: drag to pan the camera.
      dragPan = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
      app.canvas.setPointerCapture(e.pointerId);
    }
  });
  app.canvas.addEventListener("pointermove", (e) => {
    if (!ps) return;
    if (e.pointerType === "touch") {
      const t = touches.get(e.pointerId);
      if (t) {
        t.x = e.clientX;
        t.y = e.clientY;
      }
      if (pinch) {
        updatePinch();
        return;
      }
      if (
        pendingTap &&
        pendingTap.id === e.pointerId &&
        Math.hypot(e.clientX - pendingTap.sx, e.clientY - pendingTap.sy) >
          TAP_SLOP
      ) {
        // The finger is dragging, not tapping: it pans instead.
        dragPan = {
          id: e.pointerId,
          x: pendingTap.sx,
          y: pendingTap.sy,
          moved: TAP_SLOP + 1,
        };
        pendingTap = null;
      }
      if (touchLocked) return;
    }
    if (dragPan && dragPan.id === e.pointerId) {
      const dx = e.clientX - dragPan.x;
      const dy = e.clientY - dragPan.y;
      dragPan.x = e.clientX;
      dragPan.y = e.clientY;
      dragPan.moved += Math.abs(dx) + Math.abs(dy);
      if (dragPan.moved > TAP_SLOP) {
        panBy(dx, dy);
        app.canvas.style.cursor = "grabbing";
      }
      return;
    }
    const [x, y] = toLattice(e);
    if (ps.grabbedParticle >= 0 && snapMode === "none" && !autoGesture) {
      const px = dragPos[0];
      const py = dragPos[1];
      boundedDragTo(x, y);
      const dt = Math.max(1e-3, (e.timeStamp - lastMoveT) / 1000);
      lastMoveT = e.timeStamp;
      dragVel =
        dragVel * 0.6 +
        (Math.hypot(dragPos[0] - px, dragPos[1] - py) / dt) * 0.4;
      wake();
    } else if (params.mazeFabric && fabric && fabricController) {
      // Hover: light the choosable run under the pointer (the paint pass
      // animates it even while the physics sleeps - no wake needed).
      const eid = fabric.edgeAt(x, y, fabricController);
      if (fabric.setHover(eid)) fabric.update(fabricController);
      app.canvas.style.cursor =
        eid >= 0
          ? "pointer"
          : ps.nearest(x, y, GRAB_RADIUS) >= 0
            ? "grab"
            : "default";
    } else {
      app.canvas.style.cursor =
        ps.nearest(x, y, GRAB_RADIUS) >= 0 ? "grab" : "default";
    }
  });
  const endDrag = (e: PointerEvent): void => {
    if (!ps) return;
    if (dragPan && dragPan.id === e.pointerId) {
      // A touch that never really moved on empty space is a TAP there:
      // two within 320ms reset the view (double-tap).
      if (
        e.pointerType === "touch" &&
        e.type === "pointerup" &&
        dragPan.moved <= TAP_SLOP &&
        !touchLocked
      ) {
        const t = nowSec();
        if (t - lastEmptyTap < 0.32) {
          resetCamera();
          lastEmptyTap = -1e9;
        } else {
          lastEmptyTap = t;
        }
      }
      dragPan = null;
    }
    if (e.pointerType === "touch") {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
      if (pendingTap && pendingTap.id === e.pointerId) {
        const tap = pendingTap;
        pendingTap = null;
        if (e.type === "pointerup" && !touchLocked) {
          handleFabricTap(tap.x, tap.y);
        }
      }
      // A lifted finger leaves no hover behind (touch has no pointer
      // to move off the run).
      if (fabric && fabricController && fabric.setHover(-1)) {
        fabric.update(fabricController);
      }
      if (touches.size === 0) touchLocked = false;
    }
    if (ps.grabbedParticle >= 0 && snapMode === "none" && !autoGesture) {
      wake();
      const chain = ps.chainOfParticle(ps.grabbedParticle);
      const freq = chain >= 0 ? freqForGrab(chain, ps.grabbedParticle) : 220;
      if (!settings.muted && params.soundMode !== "none" && chain >= 0) {
        synth.pluck(freq, Math.min(1, dragVel / 25));
      }
      beginRelease(params.pluckStyle, visibleHz(freq));
    }
    if (app.canvas.hasPointerCapture(e.pointerId)) {
      app.canvas.releasePointerCapture(e.pointerId);
    }
    app.canvas.style.cursor = "default";
  };
  app.canvas.addEventListener("pointerup", endDrag);
  app.canvas.addEventListener("pointercancel", endDrag);

  // ---- Stage 20: auto plucks (random + music modes). The sound always
  // plays; the physical gesture runs only when the thread is free (a
  // release animation in progress yields - it is post-release cosmetics).
  const triggerAutoPluck = (seg: number, freq: number, amp: number): void => {
    if (!ps || !Number.isFinite(freq)) return;
    if (!settings.muted && params.soundMode !== "none") {
      synth.pluck(freq, amp);
    }
    if (ps.grabbedParticle >= 0 && snapMode === "none" && !autoGesture) {
      return; // Live user drag owns the thread; sound-only.
    }
    cancelSnap();
    const site = audioSegSite[seg];
    if (!site) return;
    const chainArr = ps.chains[site.chain];
    if (!chainArr || chainArr.length === 0) return;
    const len = chainArr.length;
    const idx = ((Math.round(site.ctrl) % len) + len) % len;
    const p = chainArr[idx];
    const px = ps.positions[p * 2];
    const py = ps.positions[p * 2 + 1];
    if (ps.grab(px, py, 0.45) < 0) return;
    const g = ps.grabbedParticle;
    grabOrigin[0] = ps.positions[g * 2];
    grabOrigin[1] = ps.positions[g * 2 + 1];
    dragPos[0] = grabOrigin[0];
    dragPos[1] = grabOrigin[1];
    dragVel = 0;
    // Pull perpendicular to the local thread direction.
    const q = chainArr[(idx + 1) % len];
    const tx = ps.positions[q * 2] - px;
    const ty = ps.positions[q * 2 + 1] - py;
    const tl = Math.hypot(tx, ty) || 1;
    autoGesture = {
      t: 0,
      dur: 0.15,
      nx: -ty / tl,
      ny: tx / tl,
      amp: Math.min(
        params.tugLimit * params.threadWidth * 0.9,
        params.threadWidth * 1.15 + 0.08
      ),
      hz: visibleHz(freq),
    };
    wake();
  };

  const autoAudioTick = (dt: number): void => {
    if (!ps) return;
    // Advance an in-flight gesture: pull out, then release into string
    // mode (auto plucks always ring - that is their point).
    if (autoGesture) {
      if (ps.grabbedParticle < 0) {
        autoGesture = null;
      } else {
        autoGesture.t += dt;
        const u = Math.min(1, autoGesture.t / autoGesture.dur);
        const a = autoGesture.amp * (1 - Math.pow(1 - u, 2));
        dragPos[0] = grabOrigin[0] + autoGesture.nx * a;
        dragPos[1] = grabOrigin[1] + autoGesture.ny * a;
        ps.dragTo(dragPos[0], dragPos[1]);
        wake();
        if (u >= 1) {
          const hz = autoGesture.hz;
          autoGesture = null;
          beginRelease("string", hz);
        }
      }
    }
    if (!audioAssign || settings.muted) return;
    const nowS = performance.now() / 1000;
    if (params.soundMode === "random") {
      if (nextRandomPluck === 0) nextRandomPluck = nowS + 0.8;
      if (nowS >= nextRandomPluck) {
        nextRandomPluck =
          nowS + (0.45 + Math.random() * 1.75) / Math.max(0.1, params.soundSpeed);
        const n = audioSegSite.length;
        if (n > 0) {
          const seg = Math.floor(Math.random() * n);
          triggerAutoPluck(
            seg,
            audioAssign.segFreq[seg] ?? 220,
            0.4 + Math.random() * 0.35
          );
        }
      }
    } else if (params.soundMode === "music") {
      if (songNextAt === 0) songNextAt = nowS + 1.2;
      if (nowS >= songNextAt) {
        const song = SCARBOROUGH_FAIR;
        const row = song.notes[songIndex % song.notes.length];
        songIndex++;
        songNextAt =
          nowS + (row.beats * 60) / (song.bpm * Math.max(0.1, params.soundSpeed));
        if (row.note) {
          const f = noteToFreq(row.note);
          const segs = segmentsNear(audioAssign, f);
          if (segs.length > 0 && Number.isFinite(f)) {
            // The song's true pitch plays; the matching segment moves.
            triggerAutoPluck(
              segs[Math.floor(Math.random() * segs.length)],
              f,
              0.62
            );
          }
        }
      }
    } else {
      nextRandomPluck = 0;
      songNextAt = 0;
      songIndex = 0;
    }
  };

  // Quiescence: a motionless deterministic knot stays motionless without
  // external input, so once displacement stays under threshold, skip both
  // physics and rendering entirely until something wakes it.
  // Sliding crossings leave a sub-pixel oscillation floor at rest, so the
  // threshold sits above it; deliberate motion (temperature > 0, grabs) is
  // guarded explicitly rather than by amplitude.
  // Max per-component displacement per substep. (Briefly 2.2e-2 while the
  // anti-riding floor held standing ~1.8e-2 corrections at shallow
  // crossings; crossing coverage removed those - rest floor is ~2e-3
  // again.)
  const QUIET_EPS = 1.5e-2;
  const QUIET_FRAMES = 45;
  let stillFrames = 0;
  let asleep = false;
  let flowParity = false;
  // Non-finite watchdog: if the physics state ever explodes to NaN/Inf,
  // HALT instead of churning. NaN positions collapse the collision
  // spatial hash into a single bucket (NaN keys compare equal in Map),
  // turning each frame into an O(9*N^2) multi-second task - the page
  // hard-hangs and can't even process a dev-server reload. A halted sim
  // is debuggable; a hung tab is not. Cleared on regenerate.
  let halted = false;
  const wake = (): void => {
    stillFrames = 0;
    asleep = false;
  };

  app.ticker.add((ticker) => {
    if (!ps || !renderer) return;
    if (halted) return;

    // simSpeed [0, 10]: piecewise-linear multiplier hitting the spec's
    // pinned points exactly - 0 paused, 1 -> 0.2x, 5 -> 1x, 10 -> 5x.
    const speedMult =
      params.simSpeed <= 5
        ? params.simSpeed / 5
        : 1 + (params.simSpeed - 5) * 0.8;

    // Stage 22: the appearance reveal advances on WALL time in every
    // branch (awake, asleep, paused). While it runs, the render pass must
    // execute even when the physics does not (see flowRender's guard);
    // once it completes, every branch returns to its exact pre-reveal
    // behavior.
    const revealing = reveal !== null && !reveal.done;
    if (revealing && reveal) {
      reveal.speed = params.appearSpeed;
      reveal.tick(ticker.deltaMS / 1000);
    }
    // The gameplay animations (traversal, pulse, hover) run even while
    // paused or asleep - they touch only markers and UV buffers, never
    // physics or splines.
    const fabricTick = (): void => {
      autoAudioTick(ticker.deltaMS / 1000);
      renderer!.cuspRadius = params.cuspRadius;
      // Applies to knot mode too: the erase grids re-read it in the next
      // renderer.update(), and the slider's onSlackChange wakes the sim.
      renderer!.fadeLength = params.fadeLength;
      renderer!.flowStrength = params.flowStrength;
      renderer!.flowSpeed = params.flowSpeed;
      renderer!.pulseSpacing = params.pulseSpacing;
      // Frontier particle style: live dropdown, consumed by the
      // appearance-FX pass inside tickPaint while a reveal runs.
      renderer!.appearFx = params.appearFx;
      if (params.mazeFabric && fabric && fabricController) {
        fabric.moveSpeed = params.moveSpeed;
        fabric.trailMode = params.pathViz === "trail";
        fabric.pathViz = params.pathViz;
        fabric.tension = params.tension;
        fabric.trailLength = params.trailLength;
        fabric.fogOfWar = params.fogOfWar;
        fabric.fowRadius = params.fowRadius;
        // fowIntro: keep the fog off while the intro animation plays; the
        // release closes it in (fade + contracting radius).
        fabric.setFogHold(params.fogOfWar && params.fowIntro && revealing);
        fabric.tickFog(ticker.deltaMS / 1000);
        fabricController.trailMode = params.pathViz === "trail";
        fabric.tickAnim(ticker.deltaMS / 1000, fabricController);
        if (pendingWin && !fabric.animating) {
          pendingWin = false;
          showFabricWin();
        }
      }
      renderer!.tickPaint(ticker.deltaMS / 1000);
      updateCamera(ticker.deltaMS / 1000);
    };

    // Flow undulation is RENDER-side only: while the physics is paused or
    // asleep the scene must keep swaying, so the render pass (and the
    // overlay updates that ride it, exactly as in the awake path) runs
    // WITHOUT ps.step. At flowStrength 0 this is a no-op and the
    // asleep/paused branches stay byte-identical to the pre-flow behavior
    // (no render at all while asleep). The appearance reveal rides the
    // same channel: its masks animate in update(), so while revealing the
    // render pass runs regardless of flowStrength.
    const flowRender = (): void => {
      // Appearance FX that outlive the reveal (materialize fades, the
      // rainbow swell) gate crossings and reshape ribbons in update() -
      // asleep at flowStrength 0 it must keep running until they settle,
      // or crossings stay hidden until the next wake.
      if (
        params.flowStrength <= 0 &&
        !revealing &&
        !renderer!.needsFxRender()
      ) {
        return;
      }
      renderer!.update();
      if (params.mazeFabric && fabric && fabricController) {
        fabric.update(fabricController);
      }
    };

    if (speedMult === 0) {
      flowRender();
      fabricTick();
      perfLine = " | paused";
      updateStamp();
      return;
    }

    // Release animation (soft style): ease the freed target back to the
    // grab origin, then free the grab. The STRING ring is render-only
    // now (renderer.addPluckWave at release; physics freed instantly).
    // Runs ahead of the asleep check (wake() keeps the sim stepping
    // while the thread moves); skipped while paused - a frozen world
    // holds.
    if (snapMode === "soft") {
      if (ps.grabbedParticle >= 0) {
        const dt = ticker.deltaMS / 1000;
        const f = 1 - Math.exp(-params.snapBack * dt);
        dragPos[0] += (grabOrigin[0] - dragPos[0]) * f;
        dragPos[1] += (grabOrigin[1] - dragPos[1]) * f;
        ps.dragTo(dragPos[0], dragPos[1]);
        wake();
        if (
          Math.hypot(
            dragPos[0] - grabOrigin[0],
            dragPos[1] - grabOrigin[1]
          ) < 0.02
        ) {
          snapMode = "none";
          ps.release();
        }
      } else {
        snapMode = "none";
      }
    }

    if (asleep) {
      // Half-rate the flow re-render at rest (audit F2): the displacement
      // is cheap but moving the controls forces the full spline + crossing
      // re-solve (~10ms/frame). 30fps sway is imperceptible for a slow
      // drift and halves the idle burn; the paint pass stays at full rate.
      // Active pluck waves force FULL rate - a 5-13Hz ring aliases at 30.
      flowParity = !flowParity;
      if (flowParity || renderer.hasActivePluckWaves()) flowRender();
      fabricTick();
      perfLine = " | asleep";
      updateStamp();
      return;
    }
    const t0 = performance.now();
    ps.step((ticker.deltaMS / 1000) * speedMult, {
      temperature: settings.temperature,
      slack: params.slack,
      drag: params.drag,
      repulsion: params.repulsion,
      bend: params.bend,
      smooth: params.smooth,
      stiffness: params.stiffness,
      gridAlign: params.gridAlign,
      threadWidth: params.threadWidth,
    });
    const t1 = performance.now();
    if (!Number.isFinite(ps.maxMove)) {
      halted = true;
      perfLine = " | HALTED: physics went non-finite (regenerate to reset)";
      updateStamp();
      console.error(
        "KnotMaze: physics state went non-finite; simulation halted."
      );
      return;
    }
    renderer.update();
    // Keep the gameplay overlay locked to the deforming knot.
    if (params.mazeFabric && fabric && fabricController) {
      fabric.update(fabricController);
    }
    fabricTick();
    const t2 = performance.now();

    // Follow the free-floating knot with an eased viewport fit.

    if (
      ps.settleComplete &&
      ps.grabbedParticle < 0 &&
      settings.temperature === 0 &&
      ps.maxMove < QUIET_EPS &&
      // Never freeze on an unrenderable overlap - a standing hard
      // violation of the anti-riding floor keeps the sim awake (the
      // work gate is actively resolving it).
      ps.ridersPending === 0
    ) {
      if (++stillFrames >= QUIET_FRAMES) asleep = true;
    } else {
      stillFrames = 0;
    }

    perf.physMs += t1 - t0;
    perf.renderMs += t2 - t1;
    perf.frames++;
    if (t2 - perf.flushedAt >= 500) {
      const fps = (perf.frames * 1000) / (t2 - perf.flushedAt);
      perfLine =
        ` | phys ${(perf.physMs / perf.frames).toFixed(2)}ms` +
        ` render ${(perf.renderMs / perf.frames).toFixed(2)}ms` +
        ` ${fps.toFixed(0)}fps mv ${ps.maxMove.toExponential(1)}`;
      perf.physMs = perf.renderMs = perf.frames = 0;
      perf.flushedAt = t2;
    }
    updateStamp();
  });

  // Verifiable code-state stamp: on screen and in the console, with the
  // environment facts that matter when debugging rendering discrepancies.
  // sim vs wall time exposes rAF throttling (an under-simulated knot is
  // frozen mid-settle and looks kinked/notched).
  // Hidden unless the panel's showStats is on (the text still updates, so
  // probes reading it via textContent keep working either way).
  const stamp = document.createElement("div");
  stamp.style.cssText =
    "position:fixed;left:max(6px,env(safe-area-inset-left));" +
    "bottom:max(4px,env(safe-area-inset-bottom));font:10px monospace;" +
    "color:#5a6478;pointer-events:none;z-index:10";
  stamp.style.display = settings.showStats ? "" : "none";
  document.body.appendChild(stamp);
  const wallStart = performance.now();
  // Rolling per-frame cost, flushed twice a second.
  const perf = { physMs: 0, renderMs: 0, frames: 0, flushedAt: wallStart };
  let perfLine = "";
  const updateStamp = (): void => {
    const wall = (performance.now() - wallStart) / 1000;
    const sim = ps?.simTime ?? 0;
    stamp.textContent =
      `${BUILD_STAMP} | sim ${sim.toFixed(1)}s / wall ${wall.toFixed(1)}s` +
      perfLine;
  };
  updateStamp();

  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
  console.log(
    `KnotMaze ${BUILD_STAMP} | dpr ${window.devicePixelRatio} | ` +
      `gpu ${gl ? gl.getParameter(gl.RENDERER) : "unknown"}`
  );

  // Diagnostic hooks for the automated crossing scanner.
  (window as unknown as Record<string, unknown>).__knotDiag = () =>
    renderer ? Array.from(renderer.getDiag().data) : [];
  (window as unknown as Record<string, unknown>).__knotView = () => ({
    x: root.position.x,
    y: root.position.y,
    s: root.scale.x,
  });
  (window as unknown as Record<string, unknown>).__knotInspect = (
    x: number,
    y: number
  ) => renderer?.requestInspect(x, y);
  // Physics-side twin of __knotDiag: binding state per crossing (world
  // position, ctrls, separation), contact regime, emergent count.
  (window as unknown as Record<string, unknown>).__knotPhys = () => {
    const sys = ps;
    if (!sys) return null;
    const scratch = new Float32Array(4);
    return {
      sticky: sys.contactsStatic,
      simTime: sys.simTime,
      emergent: sys.emergentCrossings.length,
      emergentList: sys.emergentCrossings.map((em) => {
        sys.bindingPoint(em.over, scratch, 0);
        return { x: scratch[0], y: scratch[1] };
      }),
      crossings: sys.crossings.map((c) => {
        sys.bindingPoint(c.over, scratch, 0);
        sys.bindingPoint(c.under, scratch, 2);
        return {
          x: (scratch[0] + scratch[2]) / 2,
          y: (scratch[1] + scratch[3]) / 2,
          over: `${c.over.chain}:${c.over.ctrl.toFixed(2)}`,
          under: `${c.under.chain}:${c.under.ctrl.toFixed(2)}`,
          sep: sys.crossingSeparation(c),
        };
      }),
      slide: sys.readSlideStats(),
    };
  };
  // Raw system access for probe scripting (phase probe, slide stats).
  (window as unknown as Record<string, unknown>).__knotPS = () => ps;
  // Appearance-reveal diagnostics: mode, clock, completion, frontier FX.
  (window as unknown as Record<string, unknown>).__knotReveal = () =>
    reveal
      ? {
          mode: reveal.mode,
          done: reveal.done,
          clock: reveal.clock,
          duration: reveal.planDuration,
          fx: params.appearFx,
          fxAlive: renderer?.appearFxAlive() ?? 0,
        }
      : null;
  // Raw renderer access for probe scripting (patch visibility/tinting).
  (window as unknown as Record<string, unknown>).__knotRenderer = () =>
    renderer;
  // Fabric-maze diagnostics: solve state, metrics, and each current choice
  // with a tappable SCREEN point (via the live root transform) plus its
  // cost-to-exit, for scripted solve verification.
  (window as unknown as Record<string, unknown>).__knotFabric = () => {
    if (!fabric || !fabricController || !walkGraph) return null;
    const c = fabricController;
    const wg = walkGraph;
    const fb = fabric;
    const out = new Float32Array(2);
    const toScreen = (wx: number, wy: number): { x: number; y: number } => ({
      x: wx * root.scale.x + root.position.x,
      y: wy * root.scale.y + root.position.y,
    });
    const sys = ps!;
    return {
      head: c.head,
      solved: c.solved,
      animating: fb.animating,
      pathLength: c.pathLength,
      optimal: wg.optimalLength,
      backtrack: c.backtrackDist,
      trailMode: c.trailMode,
      pathViz: params.pathViz,
      trailLength: params.trailLength,
      pathEdges: [...c.pathEdges],
      choices: c.choices().map((eid) => {
        const e = wg.edges[eid];
        const far = e.va === c.head ? e.vb : e.va;
        const f =
          e.va === c.head
            ? Math.min(e.ctrlA + 1.5, (e.ctrlA + e.ctrlB) / 2)
            : Math.max(e.ctrlB - 1.5, (e.ctrlA + e.ctrlB) / 2);
        const len = sys.chains[e.chain].length;
        sys.pointOnChain(e.chain, ((f % len) + len) % len, out, 0);
        return {
          edge: eid,
          far,
          cost: e.length + (wg.distToExit.get(far) ?? Infinity),
          screen: toScreen(out[0], out[1]),
        };
      }),
      vertexScreen: (id: string) => {
        fb.vertexWorld(id, out, 0);
        return toScreen(out[0], out[1]);
      },
      // Diagnostic: everything within `r` lattice units of a LATTICE point -
      // walk vertices (live position) and walk edges (nearest sample), with
      // chains and path membership. Attribution beats speculation.
      near: (x: number, y: number, r = 1.2) => {
        const verts: Array<Record<string, unknown>> = [];
        for (const [id, v] of wg.vertices) {
          fb.vertexWorld(id, out, 0);
          const d = Math.hypot(out[0] - x, out[1] - y);
          if (d <= r) {
            verts.push({
              id,
              d: +d.toFixed(3),
              isEnd: v.isEnd,
              chain: v.chain,
              ctrl: v.ctrl,
              edges: [...v.edges],
            });
          }
        }
        const edges: Array<Record<string, unknown>> = [];
        for (const e of wg.edges) {
          const len = sys.chains[e.chain].length;
          let bd = Infinity;
          for (let f = e.ctrlA; f <= e.ctrlB; f += 0.5) {
            sys.pointOnChain(e.chain, ((f % len) + len) % len, out, 0);
            const d = Math.hypot(out[0] - x, out[1] - y);
            if (d < bd) bd = d;
          }
          if (bd <= r) {
            edges.push({
              edge: e.id,
              d: +bd.toFixed(3),
              va: e.va,
              vb: e.vb,
              chain: e.chain,
              ctrlA: e.ctrlA,
              ctrlB: e.ctrlB,
              onPath: c.pathEdges.includes(e.id),
            });
          }
        }
        return { verts, edges };
      },
    };
  };
  // World point at a fractional ctrl along a chain (probe scripting).
  (window as unknown as Record<string, unknown>).__knotPoint = (
    chain: number,
    f: number
  ) => {
    const sys = ps;
    if (!sys) return null;
    const scratch = new Float32Array(2);
    sys.pointOnChain(chain, f, scratch, 0);
    return { x: scratch[0], y: scratch[1] };
  };

  rebuild();
}

main().catch(console.error);
