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
import { MazeRenderer } from "./render/maze_renderer";
import { MazeController } from "./game/maze_controller";
import { FabricMazeRenderer } from "./render/fabric_maze_renderer";
import { FabricMazeController } from "./game/fabric_controller";
import { readParams, writeParams, newSeed } from "./ui/url_state";
import { buildPanel } from "./ui/tweakpane_panel";
import type { PanelSettings } from "./ui/tweakpane_panel";
import type { GenerationParams, MazeGraph } from "./core/types";
import { KnotSynth, pitchForLoopLength } from "./audio/knot_synth";

const BACKGROUND = 0x151b28;
const FIT_MARGIN = 40;

// Bumped manually with each rendering/physics change, so a browser tab's
// code state is verifiable at a glance (repos sync across machines with lag;
// stale tabs and stale checkouts happen).
const BUILD_STAMP = "P4 Stage 17: flow undulation 2026-10-09";

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
    background: BACKGROUND,
  });
  document.body.appendChild(app.canvas);

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
  let maze: MazeRenderer | null = null;
  let controller: MazeController | null = null;
  let mazeGraph: MazeGraph | null = null;
  let walkGraph: WalkGraph | null = null;
  let fabric: FabricMazeRenderer | null = null;
  let fabricController: FabricMazeController | null = null;

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

  function rebuild(): void {
    renderer?.destroy();
    debug?.container.destroy({ children: true });
    maze?.destroy();
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
    // junctions, anchored ends). The old single-strand maze overlay is
    // incompatible with the applied graph and is skipped entirely.
    const oldMaze = params.mazeMode && !params.mazeFabric;
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

    // Old maze mode carves the maze strand OPEN (real off-screen loose ends)
    // BEFORE the renderer is built - the base ribbon reads chainBreakAfter to
    // render that strand as an open spline. Knot mode leaves it closed. The
    // two loose ends are pinned at their lattice (border) positions.
    mazeGraph = oldMaze ? graph.maze! : null;
    if (oldMaze && mazeGraph) {
      const chain = ps.chains[mazeGraph.strand];
      const brk = mazeGraph.breakSlot;
      const pa = chain[brk];
      const pb = chain[(brk + 1) % chain.length];
      ps.openChain(
        mazeGraph.strand,
        brk,
        [ps.positions[pa * 2], ps.positions[pa * 2 + 1]],
        [ps.positions[pb * 2], ps.positions[pb * 2 + 1]]
      );
    }

    // The walk graph feeds both the section coloring and (in fabric mode)
    // the gameplay, so it builds before the renderer.
    walkGraph = params.mazeFabric ? buildWalkGraph(graph) : null;

    renderer = new RibbonRenderer(ps, {
      threadWidth: params.threadWidth,
      casingWidth: params.threadWidth + params.gap * 2,
      background: BACKGROUND,
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

    // Maze overlay + solve state (old single-strand maze mode only).
    if (oldMaze && mazeGraph) {
      controller = new MazeController(mazeGraph);
      maze = new MazeRenderer(ps, mazeGraph, params.threadWidth);
      maze.setVisible(true);
      maze.update(controller);
    } else {
      controller = null;
      maze = null;
    }

    // Branching gameplay over the fabric: branch-point-only solve state +
    // the thread-true paint overlay (the walk graph was built above).
    if (params.mazeFabric && walkGraph) {
      fabricController = new FabricMazeController(walkGraph);
      fabric = new FabricMazeRenderer(
        ps,
        walkGraph,
        params.threadWidth,
        renderer
      );
      fabric.update(fabricController);
    } else {
      fabricController = null;
      fabric = null;
    }
    pendingWin = false;
    updateHud();
    hideWin();

    debug = new DebugRenderer();
    debug.render(graph);
    // The debug renderer draws at cellSize px per lattice unit; the root
    // container already maps lattice units to screen, so counter-scale.
    debug.container.scale.set(1 / debug.cellSize);
    debug.container.visible = settings.showDebug;

    // Order: the maze under-layer, ribbons, the maze over-layer (so the solve
    // strand weaves under threads at crossings and over them between), debug.
    if (maze) root.addChild(maze.underContainer);
    root.addChild(renderer.root);
    if (maze) root.addChild(maze.overContainer);
    if (fabric) root.addChild(fabric.overContainer);
    root.addChild(debug.container);
    fitToScreen();
    writeParams(params);

    console.log(
      `KnotMaze: seed ${params.seed}, ${graph.nodes.size} nodes, ` +
        `${graph.edges.size} edges, ${graph.strands.length} strands.`
    );
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
      maze?.setWidths(params.threadWidth);
      if (maze && controller) maze.update(controller);
      fabric?.setWidths(params.threadWidth);
      if (fabric && fabricController) fabric.update(fabricController);
      writeParams(params);
      wake();
    },
    onTemperatureChange: () => wake(),
    onModeChange: () => {
      // Maze mode changes the strand's TOPOLOGY (open vs closed), which is
      // baked into the ribbon meshes at build time, so a full rebuild is
      // required rather than a visibility toggle.
      writeParams(params);
      rebuild();
      app.canvas.style.cursor = "default";
      wake();
    },
    onResetPath: () => {
      controller?.reset();
      fabricController?.reset();
      fabric?.cancelMove();
      pendingWin = false;
      hideWin();
      if (maze && controller) maze.update(controller);
      if (fabric && fabricController) fabric.update(fabricController);
      updateHud();
      wake();
    },
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

  // Win banner (maze mode). Hidden until a solve completes.
  const banner = document.createElement("div");
  banner.id = "maze-banner";
  banner.style.cssText =
    "position:fixed;top:16px;left:50%;transform:translateX(-50%);" +
    "padding:10px 18px;background:#1b2233ee;color:#8fe6ff;" +
    "font:14px/1.3 monospace;border:1px solid #39d353;border-radius:6px;" +
    "z-index:20;display:none;pointer-events:none";
  document.body.appendChild(banner);
  const showWin = (steps: number): void => {
    banner.textContent = `Solved in ${steps} steps \u{1F389}`;
    banner.style.display = "block";
  };
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
    hud.textContent =
      `path ${fmt(c.pathLength)} / optimal ${fmt(c.walk.optimalLength)}\n` +
      `backtracked ${fmt(c.backtrackDist)}`;
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
      `${fmt(c.walk.optimalLength)}${over} · backtracked ` +
      `${fmt(c.backtrackDist)} \u{1F389}`;
    banner.style.display = "block";
  };

  // Maze mode: resolve a tap to a node ON the maze thread and move the trace
  // there; redraw immediately so it lands even while the knot sleeps.
  const handleMazeTap = (x: number, y: number): void => {
    if (!maze || !controller) return;
    const node = maze.nodeAt(x, y);
    if (node < 0) return;
    const result = controller.tapNode(node);
    maze.update(controller);
    wake();
    if (result === "win") showWin(controller.total);
  };
  const mazeActionable = (x: number, y: number): boolean =>
    maze ? maze.nodeAt(x, y) >= 0 : false;

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

  app.canvas.style.touchAction = "none";
  app.canvas.addEventListener("pointerdown", (e) => {
    if (!ps) return;
    wake();
    const [x, y] = toLattice(e);
    // Alt+click: dump the nearest crossing's render state to the console
    // (diagnostic; makes broken-crossing reports exactly reproducible).
    if (e.altKey) {
      renderer?.requestInspect(x, y);
      return;
    }
    if (params.mazeMode && !params.mazeFabric) {
      handleMazeTap(x, y);
      return;
    }
    if (params.mazeFabric && handleFabricTap(x, y)) return;
    if (ps.grab(x, y, GRAB_RADIUS) >= 0) {
      app.canvas.setPointerCapture(e.pointerId);
      app.canvas.style.cursor = "grabbing";
    }
  });
  app.canvas.addEventListener("pointermove", (e) => {
    if (!ps) return;
    const [x, y] = toLattice(e);
    if (params.mazeMode && !params.mazeFabric) {
      app.canvas.style.cursor = mazeActionable(x, y) ? "pointer" : "default";
      return;
    }
    if (ps.grabbedParticle >= 0) {
      ps.dragTo(x, y);
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
    if (params.mazeMode && !params.mazeFabric) return; // no grab/pluck while solving
    const pluck = ps.release();
    if (pluck && pluck.chain >= 0) {
      wake();
      if (!settings.muted) {
        const freq = pitchForLoopLength(ps.chainArcLength(pluck.chain));
        synth.pluck(freq, Math.min(1, pluck.speed / 25));
      }
    }
    if (app.canvas.hasPointerCapture(e.pointerId)) {
      app.canvas.releasePointerCapture(e.pointerId);
    }
    app.canvas.style.cursor = "default";
  };
  app.canvas.addEventListener("pointerup", endDrag);
  app.canvas.addEventListener("pointercancel", endDrag);

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
    // The gameplay animations (traversal, pulse, hover) run even while
    // paused or asleep - they touch only markers and UV buffers, never
    // physics or splines.
    const fabricTick = (): void => {
      renderer!.cuspRadius = params.cuspRadius;
      renderer!.flowStrength = params.flowStrength;
      renderer!.flowSpeed = params.flowSpeed;
      if (params.mazeFabric && fabric && fabricController) {
        fabric.moveSpeed = params.moveSpeed;
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
    // (no render at all while asleep).
    const flowRender = (): void => {
      if (params.flowStrength <= 0) return;
      renderer!.update();
      if (params.mazeMode && maze && controller) maze.update(controller);
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

    if (asleep) {
      flowRender();
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
    // Keep the maze overlays locked to the deforming knot while it moves.
    if (params.mazeMode && maze && controller) maze.update(controller);
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
  // Raw renderer access for probe scripting (patch visibility/tinting).
  (window as unknown as Record<string, unknown>).__knotRenderer = () =>
    renderer;
  // Maze-mode diagnostics: solve state + a path node's live SCREEN position
  // (via the live root transform), for scripted solve verification.
  (window as unknown as Record<string, unknown>).__knotMaze = () => {
    if (!maze || !controller || !mazeGraph) return null;
    return {
      strand: mazeGraph.strand,
      steps: mazeGraph.steps,
      head: controller.head,
      solved: controller.solved,
      nodeScreen: (k: number) => {
        const out = new Float32Array(2);
        maze!.nodeWorld(k, out, 0);
        return {
          x: out[0] * root.scale.x + root.position.x,
          y: out[1] * root.scale.y + root.position.y,
        };
      },
    };
  };
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
