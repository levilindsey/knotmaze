import { Application, Container } from "pixi.js";
import { generateLatticeKnotwork } from "./core/lattice_grower";
import { checkStructure, checkAlternation } from "./core/tangle_graph";
import { ParticleSystem } from "./physics/particle_system";
import { RibbonRenderer } from "./render/ribbon_renderer";
import { DebugRenderer } from "./render/debug_renderer";
import { readParams, writeParams, newSeed } from "./ui/url_state";
import { buildPanel } from "./ui/tweakpane_panel";
import type { PanelSettings } from "./ui/tweakpane_panel";
import type { GenerationParams } from "./core/types";
import { KnotSynth, pitchForLoopLength } from "./audio/knot_synth";

const BACKGROUND = 0x151b28;
const FIT_MARGIN = 40;

// Bumped manually with each rendering/physics change, so a browser tab's
// code state is verifiable at a glance (repos sync across machines with lag;
// stale tabs and stale checkouts happen).
const BUILD_STAMP = "P3.2 force params 2026-07-16";

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
    root.removeChildren();

    const genParams: GenerationParams = {
      gridSize: params.gridSize,
      weaveDensity: params.weaveDensity,
      turnBias: params.turnBias,
      randSeed: params.seed,
    };
    const graph = generateLatticeKnotwork(genParams);

    if (!checkStructure(graph) || !checkAlternation(graph)) {
      console.warn("Knot invariants violated; generation bug.");
    }

    ps = new ParticleSystem(graph);
    renderer = new RibbonRenderer(ps, {
      threadWidth: params.threadWidth,
      casingWidth: params.threadWidth + params.gap * 2,
      background: BACKGROUND,
      baseHue: params.seed % 360,
    });

    debug = new DebugRenderer();
    debug.render(graph);
    // The debug renderer draws at cellSize px per lattice unit; the root
    // container already maps lattice units to screen, so counter-scale.
    debug.container.scale.set(1 / debug.cellSize);
    debug.container.visible = settings.showDebug;

    root.addChild(renderer.root, debug.container);
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
      writeParams(params);
      wake();
    },
    onTemperatureChange: () => wake(),
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

  app.canvas.style.touchAction = "none";
  app.canvas.addEventListener("pointerdown", (e) => {
    if (!ps) return;
    wake();
    const [x, y] = toLattice(e);
    if (ps.grab(x, y, GRAB_RADIUS) >= 0) {
      app.canvas.setPointerCapture(e.pointerId);
      app.canvas.style.cursor = "grabbing";
    }
  });
  app.canvas.addEventListener("pointermove", (e) => {
    if (!ps) return;
    if (ps.grabbedParticle >= 0) {
      const [x, y] = toLattice(e);
      ps.dragTo(x, y);
      wake();
    } else {
      const [x, y] = toLattice(e);
      app.canvas.style.cursor =
        ps.nearest(x, y, GRAB_RADIUS) >= 0 ? "grab" : "default";
    }
  });
  const endDrag = (e: PointerEvent): void => {
    if (!ps) return;
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
  const QUIET_EPS = 5e-3; // Max per-component displacement per substep.
  const QUIET_FRAMES = 45;
  let stillFrames = 0;
  let asleep = false;
  const wake = (): void => {
    stillFrames = 0;
    asleep = false;
  };

  app.ticker.add((ticker) => {
    if (!ps || !renderer) return;
    if (asleep) {
      perfLine = " | asleep";
      updateStamp();
      return;
    }
    const t0 = performance.now();
    ps.step(ticker.deltaMS / 1000, {
      temperature: settings.temperature,
      slack: params.slack,
      drag: params.drag,
      repulsion: params.repulsion,
      bend: params.bend,
      gridAlign: params.gridAlign,
    });
    const t1 = performance.now();
    renderer.update();
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
      ps.maxMove < QUIET_EPS
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
        ` ${fps.toFixed(0)}fps`;
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

  rebuild();
}

main().catch(console.error);
