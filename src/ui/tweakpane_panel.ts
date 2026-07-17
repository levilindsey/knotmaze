// Tweakpane control panel: generation params (regenerate on change),
// temperature (live), and view toggles.

import { Pane } from "tweakpane";
import type { UrlParams } from "./url_state";

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
}

interface ChangeEvent {
  last?: boolean;
  value: unknown;
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

  pane
    .addBinding(params, "gridSize", { min: 4, max: 24, step: 1 })
    .on("change", regenerateWhenDone);
  pane
    .addBinding(params, "weaveDensity", { min: 0, max: 1, step: 0.05 })
    .on("change", regenerateWhenDone);
  pane
    .addBinding(params, "turnBias", { min: 0, max: 1, step: 0.05 })
    .on("change", regenerateWhenDone);
  pane.addButton({ title: "New seed" }).on("click", callbacks.onReseed);

  // Physics tuning applies live (no regeneration).
  pane
    .addBinding(params, "slack", { min: 0, max: 1, step: 0.05 })
    .on("change", callbacks.onSlackChange);
  pane
    .addBinding(params, "drag", { min: 0, max: 1, step: 0.05 })
    .on("change", callbacks.onSlackChange);
  pane
    .addBinding(params, "repulsion", { min: 0.4, max: 1.8, step: 0.05 })
    .on("change", callbacks.onSlackChange);
  pane
    .addBinding(params, "bend", { min: 0.2, max: 2.5, step: 0.05 })
    .on("change", callbacks.onSlackChange);
  pane
    .addBinding(params, "gridAlign")
    .on("change", callbacks.onSlackChange);

  // Ribbon styling applies live to the renderer.
  pane
    .addBinding(params, "threadWidth", { min: 0.15, max: 0.8, step: 0.01 })
    .on("change", callbacks.onStyleChange);
  pane
    .addBinding(params, "gap", { min: 0.04, max: 0.5, step: 0.01 })
    .on("change", callbacks.onStyleChange);

  pane
    .addBinding(settings, "temperature", { min: 0, max: 1, step: 0.01 })
    .on("change", callbacks.onTemperatureChange);
  pane.addBinding(settings, "muted");
  pane
    .addButton({ title: "Replay settle" })
    .on("click", callbacks.onReplaySettle);

  pane.addBinding(settings, "showDebug").on("change", (ev: ChangeEvent) => {
    callbacks.onDebugToggle(ev.value === true);
  });

  return pane;
}
