// Tweakpane control panel: generation params (regenerate on change),
// temperature (live), and view toggles. Every row carries a native
// `title` tooltip explaining what the parameter does.

import { Pane } from "tweakpane";
import type { UrlParams } from "./url_state";
import { DEFAULTS } from "./url_state";

export interface PanelSettings {
  temperature: number;
  showDebug: boolean;
  muted: boolean;
}

export interface PanelCallbacks {
  onRegenerate: () => void;
  onReseed: () => void;
  onReplaySettle: () => void;
  onDebugToggle: (visible: boolean) => void;
  onSlackChange: () => void;
  onStyleChange: () => void;
  onTemperatureChange: () => void;
  onModeChange: () => void;
  onResetPath: () => void;
}

interface ChangeEvent {
  last?: boolean;
  value: unknown;
}

// Rows expose their root DOM element; a native title attribute is the
// lightest tooltip that works for sliders, checkboxes, and buttons alike.
interface RowApi {
  element: HTMLElement;
}

function tip<T extends RowApi>(api: T, text: string): T {
  api.element.title = text;
  return api;
}

export function buildPanel(
  params: UrlParams,
  settings: PanelSettings,
  callbacks: PanelCallbacks
): Pane {
  const pane = new Pane({ title: "Knotmaze" });

  const regenerateWhenDone = (ev: ChangeEvent): void => {
    if (ev.last !== false) callbacks.onRegenerate();
  };

  tip(
    pane.addBinding(params, "gridSize", { min: 4, max: 24, step: 1 }),
    "Lattice size. Bigger = a larger, denser knot with more threads. Regenerates the design."
  ).on("change", regenerateWhenDone);
  tip(
    pane.addBinding(params, "weaveDensity", { min: 0, max: 1, step: 0.05 }),
    "How much of the lattice fills with woven thread. Low = sparse open tangle, high = tight fabric. Regenerates the design."
  ).on("change", regenerateWhenDone);
  tip(
    pane.addBinding(params, "turnBias", { min: 0, max: 1, step: 0.05 }),
    "How often growing threads turn instead of running straight. Low = long runs, high = curly meanders. Regenerates the design."
  ).on("change", regenerateWhenDone);
  tip(
    pane.addButton({ title: "New seed" }),
    "Regenerate a fresh design from a new random seed."
  ).on("click", callbacks.onReseed);

  // Physics tuning applies live (no regeneration).
  tip(
    pane.addBinding(params, "simSpeed", { min: 0, max: 10, step: 0.5 }),
    "Simulation speed. 0 pauses, 5 is real time, 10 is 5x."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "slack", { min: 0, max: 1, step: 0.05 }),
    "How loose the threads rest. 0 pulls the knot rope-taut, 1 leaves it soft and open."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "drag", { min: 0, max: 1, step: 0.05 }),
    "Motion damping. Low = springy, waves ring after a pluck; high = movement dies quickly."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "repulsion", { min: 0.4, max: 1.8, step: 0.05 }),
    "Breathing room between parallel threads. Higher spreads the composition apart."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "bend", { min: 0.2, max: 2.5, step: 0.05 }),
    "Bending stiffness. Higher resists sharp curves - smoother, rounder thread paths."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "stiffness", { min: 0.1, max: 1.35, step: 0.05 }),
    "Structural spring strength along each thread. Higher = firmer, less stretchy material."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "smooth", { min: 0, max: 1, step: 0.05 }),
    "Curvature smoothing. Evens out wiggles along threads so they read as continuous curves."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "gridAlign"),
    "Softly pull every thread back toward its original lattice position - a more formal, grid-like composition."
  ).on("change", callbacks.onSlackChange);

  // Ribbon styling applies live to the renderer.
  tip(
    pane.addBinding(params, "threadWidth", { min: 0.15, max: 0.8, step: 0.01 }),
    "Ribbon width of every thread, in lattice units."
  ).on("change", callbacks.onStyleChange);
  tip(
    pane.addBinding(params, "gap", { min: 0.04, max: 0.5, step: 0.01 }),
    "Visible break in the under thread at each crossing - the classic over/under gap."
  ).on("change", callbacks.onStyleChange);

  tip(
    pane.addBinding(settings, "temperature", { min: 0, max: 1, step: 0.01 }),
    "Agitation. Shake the knot with noise; slide back to 0 and it settles into a new pose."
  ).on("change", callbacks.onTemperatureChange);
  tip(
    pane.addBinding(settings, "muted"),
    "Silence the pluck sounds threads make when released."
  );
  tip(
    pane.addButton({ title: "Replay settle" }),
    "Restart the knot from its angular lattice state and watch it relax again."
  ).on("click", callbacks.onReplaySettle);

  tip(
    pane.addBinding(settings, "showDebug"),
    "Overlay the physics debug view (particles, bindings, contacts)."
  ).on("change", (ev: ChangeEvent) => {
    callbacks.onDebugToggle(ev.value === true);
  });

  // Maze mode: repurposes the pointer to trace a solve path (tugging off).
  tip(
    pane.addBinding(params, "mazeMode"),
    "Maze mode: tap the entrance, then adjacent cells, to trace a path to the exit. Thread-tugging is off while solving."
  ).on("change", callbacks.onModeChange);
  tip(
    pane.addButton({ title: "Reset path" }),
    "Clear the traced maze path and start over from the entrance."
  ).on("click", callbacks.onResetPath);

  tip(
    pane.addButton({ title: "Reset to defaults" }),
    "Restore every parameter to its default value (keeps the current seed) and regenerate."
  ).on("click", () => {
    Object.assign(params, DEFAULTS, { gridAlign: false });
    settings.temperature = 0;
    pane.refresh();
    callbacks.onRegenerate();
  });

  return pane;
}
