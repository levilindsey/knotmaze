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

const BACKGROUND = 0x151b28;
const FIT_MARGIN = 40;

// Bumped manually with each rendering/physics change, so a browser tab's
// code state is verifiable at a glance (repos sync across machines with lag;
// stale tabs and stale checkouts happen).
const BUILD_STAMP = "P2.9 miter+march 2026-07-16";

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
  const settings: PanelSettings = { temperature: 0, showDebug: false };

  const root = new Container();
  app.stage.addChild(root);

  let ps: ParticleSystem | null = null;
  let renderer: RibbonRenderer | null = null;
  let debug: DebugRenderer | null = null;
  let latticeExtent = 1;

  function fitToScreen(): void {
    const w = app.screen.width;
    const h = app.screen.height;
    const scale = Math.min(
      (w - FIT_MARGIN * 2) / latticeExtent,
      (h - FIT_MARGIN * 2) / latticeExtent
    );
    root.scale.set(scale);
    root.position.set(
      (w - latticeExtent * scale) / 2,
      (h - latticeExtent * scale) / 2
    );
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
      threadWidth: 0.42,
      casingWidth: 0.78,
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
    latticeExtent = params.gridSize * 2;
    fitToScreen();
    writeParams(params);

    console.log(
      `KnotMaze: seed ${params.seed}, ${graph.nodes.size} nodes, ` +
        `${graph.edges.size} edges, ${graph.strands.length} strands.`
    );
  }

  buildPanel(params, settings, {
    onRegenerate: rebuild,
    onReseed: () => {
      params.seed = newSeed();
      rebuild();
    },
    onReplaySettle: () => ps?.reset(),
    onDebugToggle: (visible) => {
      if (debug) debug.container.visible = visible;
    },
    onSlackChange: () => writeParams(params),
  });

  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    fitToScreen();
  });

  app.ticker.add((ticker) => {
    if (!ps || !renderer) return;
    ps.step(ticker.deltaMS / 1000, settings.temperature, params.slack);
    renderer.update();
  });

  // Verifiable code-state stamp: on screen and in the console, with the
  // environment facts that matter when debugging rendering discrepancies.
  const stamp = document.createElement("div");
  stamp.textContent = BUILD_STAMP;
  stamp.style.cssText =
    "position:fixed;left:6px;bottom:4px;font:10px monospace;" +
    "color:#5a6478;pointer-events:none;z-index:10";
  document.body.appendChild(stamp);

  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
  console.log(
    `KnotMaze ${BUILD_STAMP} | dpr ${window.devicePixelRatio} | ` +
      `gpu ${gl ? gl.getParameter(gl.RENDERER) : "unknown"}`
  );

  rebuild();
}

main().catch(console.error);
