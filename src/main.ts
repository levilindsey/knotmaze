import { Application } from "pixi.js";
import { initRNG } from "./util/random";
import { generateLatticeKnotwork } from "./core/lattice_grower";
import { checkStructure, checkAlternation } from "./core/tangle_graph";
import { DebugRenderer } from "./render/debug_renderer";
import type { GenerationParams } from "./core/types";

const app = new Application();

async function main(): Promise<void> {
  // Initialize canvas and PixiJS stage.
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio, 2),
  });

  document.body.appendChild(app.canvas);

  // Handle window resize.
  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
  });

  // Parse URL parameters.
  const params = new URLSearchParams(window.location.search);
  const seed = parseInt(params.get("seed") ?? String(Date.now()), 10);

  // Initialize global RNG.
  initRNG(seed);

  // Generate a knot.
  const genParams: GenerationParams = {
    gridSize: 12,
    weaveDensity: 0.35,
    turnBias: 0.7,
    randSeed: seed,
  };

  const graph = generateLatticeKnotwork(genParams);

  if (!checkStructure(graph) || !checkAlternation(graph)) {
    console.warn("Knot invariants violated; generation bug.");
  }

  // Debug render.
  const renderer = new DebugRenderer();
  renderer.render(graph, app.screen.width, app.screen.height);
  app.stage.addChild(renderer.container);

  console.log(
    `KnotMaze initialized. Seed: ${seed}, Nodes: ${graph.nodes.size}, Edges: ${graph.edges.size}, Strands: ${graph.strands.length}`
  );
}

main().catch(console.error);
