import { Application, Container } from "pixi.js";
import { generateLatticeKnotwork } from "./core/lattice_grower";
import {
  buildMazePlan,
  DEFAULT_MAZE_PARAMS,
  DEAD_END_DENSITY_ON,
} from "./core/maze_plan";
import { buildSectionField } from "./core/section_colors";
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
import { readParams, writeParams, newSeed } from "./ui/url_state";
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

const BACKGROUND = 0x151b28;
const FIT_MARGIN = 40;

// Bumped manually with each rendering/physics change, so a browser tab's
// code state is verifiable at a glance (repos sync across machines with lag;
// stale tabs and stale checkouts happen).
const BUILD_STAMP = "P4: appear-fx frontier particles 2026-10-10";

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
  const settings: PanelSettings = {
    temperature: 0,
    showDebug: false,
    muted: false,
  };
  const synth = new KnotSynth();

  const root = new Container();
  app.stage.addChild(root);

  let ps: ParticleSystem | null = null;
  let renderer: RibbonRenderer | null = null;
  let debug: DebugRenderer | null = null;
  let walkGraph: WalkGraph | null = null;
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
    const pad = params.threadWidth / 2 + 0.3;
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

  function fitToScreen(): void {
    computeFitTarget();
    root.scale.set(fitTarget.scale);
    root.position.set(fitTarget.x, fitTarget.y);
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
    reveal.speed = params.appearSpeed;
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
        deadEndDensity: params.deadEnds ? DEAD_END_DENSITY_ON : 0,
      });
      hueGroup = applyMazePlan(graph, plan);
      applyMazeCuts(graph, plan, hueGroup);
    }

    if (!checkStructure(graph) || !checkAlternation(graph)) {
      console.warn("Knot invariants violated; generation bug.");
    }

    ps = new ParticleSystem(graph);

    // The walk graph feeds both the section coloring and (in fabric mode)
    // the gameplay, so it builds before the renderer.
    walkGraph = params.mazeFabric ? buildWalkGraph(graph) : null;

    renderer = new RibbonRenderer(ps, {
      threadWidth: params.threadWidth,
      casingWidth: params.threadWidth + params.gap * 2,
      baseHue: params.seed % 360,
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
        params.seed
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
      const root = params.seed % 12;
      assignFor = (lengths) =>
        assignPitches(params.pitchSpace, params.octaves, root, lengths);
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
    },
  });
  synth.setVolume(params.volume);

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
    "position:fixed;top:10px;left:10px;padding:7px 12px;" +
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
  let snapMode: "none" | "soft" | "string" = "none";
  const strum = { t: 0, ax: 0, ay: 0, amp: 0, hz: 5 };
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
  // slow, high strings shimmer.
  const visibleHz = (freq: number): number =>
    Math.min(8, Math.max(3, 3.2 + 1.3 * Math.log2(Math.max(55, freq) / 110)));

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
    if (style === "string" && amp > 0.02) {
      strum.t = 0;
      strum.ax = ax;
      strum.ay = ay;
      strum.amp = amp;
      strum.hz = hz;
      snapMode = "string";
    } else if (style === "soft" && params.snapBack > 0) {
      snapMode = "soft";
    } else {
      snapMode = "none";
      ps?.release();
    }
  };

  app.canvas.style.touchAction = "none";
  app.canvas.addEventListener("pointerdown", (e) => {
    if (!ps) return;
    wake();
    cancelSnap();
    const [x, y] = toLattice(e);
    // Alt+click: dump the nearest crossing's render state to the console
    // (diagnostic; makes broken-crossing reports exactly reproducible).
    if (e.altKey) {
      renderer?.requestInspect(x, y);
      return;
    }
    if (params.mazeFabric && handleFabricTap(x, y)) return;
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
    }
  });
  app.canvas.addEventListener("pointermove", (e) => {
    if (!ps) return;
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
      // Frontier particle style (Stage 26): live dropdown, consumed by the
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
        fabric.tickFog(ticker.deltaMS / 1000);
        fabricController.trailMode = params.pathViz === "trail";
        fabric.tickAnim(ticker.deltaMS / 1000, fabricController);
        if (pendingWin && !fabric.animating) {
          pendingWin = false;
          showFabricWin();
        }
      }
      renderer!.tickPaint(ticker.deltaMS / 1000);
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
      if (params.flowStrength <= 0 && !revealing) return;
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

    // Release animations: ease (soft) or ring (string) the freed target
    // around the grab origin, then free the grab. Runs ahead of the
    // asleep check (wake() keeps the sim stepping while the thread
    // moves); skipped while paused - a frozen world holds.
    if (snapMode !== "none") {
      if (ps.grabbedParticle >= 0) {
        const dt = ticker.deltaMS / 1000;
        if (snapMode === "soft") {
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
          // String: sharp return + damped ring along the release axis.
          strum.t += dt;
          const env = strum.amp * Math.exp(-strum.t / 0.33);
          const off = env * Math.cos(2 * Math.PI * strum.hz * strum.t);
          dragPos[0] = grabOrigin[0] + strum.ax * off;
          dragPos[1] = grabOrigin[1] + strum.ay * off;
          ps.dragTo(dragPos[0], dragPos[1]);
          wake();
          if (env < 0.015) {
            snapMode = "none";
            ps.release();
          }
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
      flowParity = !flowParity;
      if (flowParity) flowRender();
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
    if (perf.frames % 15 === 0) computeFitTarget();
    root.scale.set(root.scale.x + (fitTarget.scale - root.scale.x) * 0.08);
    root.position.set(
      root.position.x + (fitTarget.x - root.position.x) * 0.08,
      root.position.y + (fitTarget.y - root.position.y) * 0.08
    );

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
  const stamp = document.createElement("div");
  stamp.style.cssText =
    "position:fixed;left:6px;bottom:4px;font:10px monospace;" +
    "color:#5a6478;pointer-events:none;z-index:10";
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
