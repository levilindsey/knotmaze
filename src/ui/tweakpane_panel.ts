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
  // Memory-trail mode + trail length: gameplay interpretation and paint
  // only, applied live (no scene rebuild).
  onTrailChange: () => void;
  onResetPath: () => void;
  // Audio-only change (sound mode / pitch space / octaves): re-derive the
  // pitch assignment without rebuilding the scene.
  onAudioChange: () => void;
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

  // The pane has outgrown short viewports: cap Tweakpane's fixed wrapper
  // at the window height and scroll INSIDE it (wheel over the panel stays
  // in the panel; the thin scrollbar matches the dark theme).
  const wrap = pane.element.parentElement;
  if (wrap) {
    wrap.style.maxHeight = "calc(100vh - 16px)";
    wrap.style.overflowY = "auto";
    wrap.style.overscrollBehavior = "contain";
    wrap.style.scrollbarWidth = "thin";
    const style = document.createElement("style");
    style.textContent =
      ".tp-dfwv::-webkit-scrollbar{width:6px}" +
      ".tp-dfwv::-webkit-scrollbar-thumb{background:#3a4254;border-radius:3px}" +
      ".tp-dfwv::-webkit-scrollbar-track{background:transparent}";
    document.head.appendChild(style);
  }

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
    pane.addBinding(params, "soundMode", {
      options: { none: "none", manual: "manual", random: "random", music: "music" },
    }),
    "Pluck behavior: none = silent; manual = your plucks only; random = the knot plucks a random thread now and then; music = a scripted song plays itself on matching threads. Auto plucks physically move the thread."
  ).on("change", callbacks.onAudioChange);
  tip(
    pane.addBinding(params, "pitchSpace", {
      options: {
        chromatic: "chromatic",
        pentMajor: "pentMajor",
        pentMinor: "pentMinor",
        hirajoshi: "hirajoshi",
        insen: "insen",
        dorian: "dorian",
        lydian: "lydian",
        wholeTone: "wholeTone",
        harmMinor: "harmMinor",
      },
    }),
    "Scale the thread pitches live in: every maze segment gets one pitch by length (longer rings lower). chromatic = all 12 half steps - enough to play anything."
  ).on("change", callbacks.onAudioChange);
  tip(
    pane.addBinding(params, "octaves", { min: 1, max: 4, step: 1 }),
    "How many octaves the segment pitches spread across."
  ).on("change", callbacks.onAudioChange);
  tip(
    pane.addBinding(params, "pluckStyle", {
      options: { string: "string", soft: "soft" },
    }),
    "Release feel: string = sharp snap-back with a decaying ring, like a real plucked string; soft = gentle ease home (speed = the snapBack slider)."
  ).on("change", callbacks.onSlackChange);
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

  tip(
    pane.addBinding(params, "mazeFabric"),
    "Branching maze: walk the thread from the green entrance to the orange exit. Tap a highlighted run at your branch point to advance (tap the gold one to backtrack); tug anywhere else."
  ).on("change", callbacks.onModeChange);
  tip(
    pane.addBinding(params, "colorScheme", {
      options: {
        mono: "mono",
        strands: "strands",
        depth: "depth",
        segments: "segments",
        noise: "noise",
      },
    }),
    "Section coloring: mono = one color; strands = per-thread hues; depth = gradient by distance from the start; segments = a random gamut color per run between intersections; noise = a spatial dye field. Sections blend smoothly through intersections. Rebuilds the scene."
  ).on("change", callbacks.onModeChange);
  tip(
    pane.addBinding(params, "deadEnds"),
    "Dead ends: some loops become long threads that end, somewhere far away, in a loose tip. Off = a pure braided maze where every wrong turn loops back. Regenerates the maze."
  ).on("change", callbacks.onModeChange);
  const pathVizRow = tip(
    pane.addBinding(params, "pathViz", {
      options: { gold: "gold", trail: "trail", string: "string" },
    }),
    "How your route is shown: gold = the traveled thread recolors; trail = memory mode, only a short trail stays gold and there is no backtracking; string = unroll a thin white yarn behind you - it U-turns at junctions when you backtrack and is never picked up. Applies live."
  );
  const trailLenRow = tip(
    pane.addBinding(params, "trailLength", { min: 1, max: 15, step: 0.5 }),
    "How much recent path stays lit in memory mode, in lattice units. Applies live."
  );
  trailLenRow.on("change", callbacks.onTrailChange);
  const tensionRow = tip(
    pane.addBinding(params, "tension", { min: 0, max: 1, step: 0.05 }),
    "Ariadne string tension: 1 lays the yarn taut along the thread, 0 leaves it loose and wavy like slack cotton. Applies live."
  );
  tensionRow.on("change", callbacks.onTrailChange);
  const fowRow = tip(
    pane.addBinding(params, "fogOfWar"),
    "Fog of war: the maze hides until you have explored close by; explored areas stay visible. Applies live."
  );
  const fowRadiusRow = tip(
    pane.addBinding(params, "fowRadius", { min: 1.5, max: 10, step: 0.25 }),
    "How far around your explored path the fog lifts, in lattice units. Applies live and reshapes everything already explored."
  );
  fowRadiusRow.on("change", callbacks.onTrailChange);
  // The per-mode rows only show for their mode.
  const refreshVizRows = (): void => {
    trailLenRow.hidden = params.pathViz !== "trail";
    tensionRow.hidden = params.pathViz !== "string";
    fowRadiusRow.hidden = !params.fogOfWar;
  };
  refreshVizRows();
  pathVizRow.on("change", () => {
    refreshVizRows();
    callbacks.onTrailChange();
  });
  fowRow.on("change", () => {
    refreshVizRows();
    callbacks.onTrailChange();
  });
  tip(
    pane.addBinding(params, "moveSpeed", { min: 0.25, max: 4, step: 0.05 }),
    "Maze travel speed: how fast the dot and the gold front move along the thread. Applies live."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "cuspRadius", { min: 0, max: 3, step: 0.05 }),
    "How far the rounded corners reach where threads join at an intersection. 0 = sharp joints. Applies live."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "fadeLength", { min: 0, max: 1.2, step: 0.02 }),
    "How far the under thread fades out approaching a crossing gap. 0 = sharp cut. Applies live."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "flowStrength", { min: 0, max: 1, step: 0.05 }),
    "Flow undulation: how far the whole fabric sways, as if drifting in water. 0 = perfectly still. Render-only - applies live, even while the knot sleeps."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "flowSpeed", { min: 0, max: 3, step: 0.05 }),
    "How fast the flow undulation drifts. Applies live."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "tugLimit", { min: 0.5, max: 6, step: 0.1 }),
    "How far a thread can be tugged, in thread widths. The stretch resists more as it nears the limit (drag further, move less). Applies live."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "snapBack", { min: 0, max: 12, step: 0.5 }),
    "How quickly a released thread eases back to where it was grabbed. 0 = no snap-back (release in place). Applies live."
  ).on("change", callbacks.onSlackChange);
  tip(
    pane.addBinding(params, "appearMode", {
      options: {
        instant: "instant",
        trace: "trace",
        bloom: "bloom",
        draw: "draw",
        ink: "ink",
      },
    }),
    "How the design animates in: instant = appear fully drawn; trace = grow outward from the maze entrance, splitting at every junction; bloom = the same flood from several random spots at once; draw = pen-draw each strand end to end; ink = a dye wave spreading from the entrance. Rebuilds the scene."
  ).on("change", callbacks.onModeChange);
  tip(
    pane.addBinding(params, "appearSpeed", { min: 0.3, max: 4, step: 0.05 }),
    "How fast the appearance animation reveals the threads. Applies live."
  ).on("change", callbacks.onSlackChange);
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
