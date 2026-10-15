import type { Application } from "pixi.js";
import { APP_VERSION, BUILD_SHA, BUILD_TIME } from "../build_info";
import type { PhysicsHost } from "../physics/physics_host";
import type { PanelSettings } from "../ui/tweakpane_panel";
import type { SceneRef } from "./scene_ref";

// Code-state stamp, so a tab's build is verifiable at a glance (repos sync
// across machines with lag; stale tabs and stale checkouts happen). DERIVED
// at build time (vite.config.ts): version + git short SHA ("+" = built with
// uncommitted changes) + build time - it can no longer drift like the old
// hand-bumped description did. Leads with the roadmap phase: the diag
// scripts find the stamp by its /^P\d/ prefix.
export const BUILD_STAMP =
  `P4 v${APP_VERSION} ${BUILD_SHA}` + (BUILD_TIME ? ` ${BUILD_TIME}` : "");

// K5 (docs/design/K5_K6_split.md 2.2): what the stamp reads from main().
export interface StampDeps {
  app: Application;
  host: PhysicsHost;
  settings: PanelSettings;
  // The perf line: the load settle and the frame loop write it (written by
  // several regions, so main.ts keeps the `let` until its owner moves); the
  // stamp only reads it.
  perfLine: () => string;
}

// The rolling per-frame cost the frame loop adds to and flushes.
export interface StampPerf {
  physMs: number;
  renderMs: number;
  frames: number;
  flushedAt: number;
}

export interface Stamp {
  stamp: HTMLDivElement;
  perf: StampPerf;
  updateStamp: () => void;
}

export function createStamp(deps: StampDeps, scene: SceneRef): Stamp {
  const { app, host, settings } = deps;
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
  const updateStamp = (): void => {
    const wall = (performance.now() - wallStart) / 1000;
    const sim = scene.ps?.simTime ?? 0;
    // K147: simulated time the load settle's budget dropped (slow motion),
    // while it runs or after it ended; sim trails wall by at least this.
    // K7 stage 5: with the worker no budget runs; the lag is the worker's
    // backlog dropped past LAG_MAX_S since the build, drags included.
    const lag = host.settleLagS;
    const lagLabel = host.kind === "worker" ? "lag" : "settle lag";
    stamp.textContent =
      `${BUILD_STAMP} | sim ${sim.toFixed(1)}s / wall ${wall.toFixed(1)}s` +
      (lag > 0.05 ? ` | ${lagLabel} ${lag.toFixed(1)}s` : "") +
      deps.perfLine();
  };
  updateStamp();

  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
  console.log(
    `KnotMaze ${BUILD_STAMP} | dpr ${window.devicePixelRatio} | ` +
      `gpu ${gl ? gl.getParameter(gl.RENDERER) : "unknown"}`
  );
  return { stamp, perf, updateStamp };
}
