// Tweakpane control panel, organized into collapsible FOLDERS. Every
// non-button row carries: a native `title` tooltip, a small inline
// reset-to-default glyph, and a MODIFIED indicator - the label (and the
// glyph) tint gold whenever the value differs from its default, the
// standard settings-UX affordance (VS Code's gutter accent, JetBrains'
// blue-bold values) adapted to Tweakpane's DOM.

import { Pane } from "tweakpane";
import type { UrlParams } from "./url_state";
import { PARAM_DEFAULTS } from "./url_state";

export interface PanelSettings {
  temperature: number;
  showDebug: boolean;
  muted: boolean;
}

const SETTINGS_DEFAULTS: PanelSettings = {
  temperature: 0,
  showDebug: false,
  muted: false,
};

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
  onVolumeChange: () => void;
}

interface ChangeEvent {
  last?: boolean;
  value: unknown;
}

// The slice of Tweakpane's blade API the helpers need.
interface RowApi {
  element: HTMLElement;
  hidden: boolean;
  refresh?: () => void;
  on: (event: "change", cb: (ev: ChangeEvent) => void) => unknown;
}
interface ButtonApi {
  element: HTMLElement;
  on: (event: "click", cb: () => void) => unknown;
}
interface Parent {
  addBinding: (
    obj: object,
    key: never,
    opts?: Record<string, unknown>
  ) => unknown;
  addButton: (opts: { title: string }) => unknown;
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
  const SCROLL_KEY = "knotmaze.panelScroll";
  if (wrap) {
    wrap.style.maxHeight = "calc(100vh - 16px)";
    wrap.style.overflowY = "auto";
    wrap.style.overscrollBehavior = "contain";
    wrap.style.scrollbarWidth = "thin";
    // Scroll position persists across sessions (restored at the end of
    // buildPanel, once the folders exist and the pane has its height).
    wrap.addEventListener(
      "scroll",
      () => {
        try {
          localStorage.setItem(SCROLL_KEY, String(wrap.scrollTop));
        } catch {
          // Storage unavailable: position just doesn't persist.
        }
      },
      { passive: true }
    );
  }
  const style = document.createElement("style");
  style.textContent =
    ".tp-dfwv::-webkit-scrollbar{width:6px}" +
    ".tp-dfwv::-webkit-scrollbar-thumb{background:#3a4254;border-radius:3px}" +
    ".tp-dfwv::-webkit-scrollbar-track{background:transparent}" +
    ".kp-reset{cursor:pointer;opacity:0;margin-left:4px;font-size:11px;" +
    "line-height:1;display:inline-block;color:#8ea0c0;" +
    "transition:opacity .12s,color .12s}" +
    ".kp-row:hover .kp-reset{opacity:.45}" +
    ".kp-row.kp-mod .kp-reset{opacity:.9;color:#e7c56f}" +
    ".kp-row.kp-mod .tp-lblv_l{color:#e7c56f}";
  document.head.appendChild(style);

  // --- Modified-state tracking + per-row reset ---------------------------
  interface Tracked {
    api: RowApi;
    obj: Record<string, unknown>;
    key: string;
    def: unknown;
  }
  const tracked: Tracked[] = [];
  const markRow = (t: Tracked): void => {
    const v = t.obj[t.key];
    const mod =
      typeof t.def === "number"
        ? Math.abs((v as number) - t.def) > 1e-9
        : v !== t.def;
    t.api.element.classList.toggle("kp-mod", mod);
  };
  const markAll = (): void => {
    for (const t of tracked) markRow(t);
  };

  // Conditional visibility (assigned after all rows exist): rows that
  // only matter under some other param's value hide otherwise. Runs
  // after EVERY row change/reset, so dependencies never go stale.
  let refreshCond: () => void = () => {};

  // One adjustable row: tooltip + reset glyph + modified tint. `after`
  // runs on every change AND after a glyph reset (the forwarded ev lets
  // regenerate rows keep their drag-end suppression).
  const row = (
    parent: Parent,
    obj: Record<string, unknown>,
    key: string,
    opts: Record<string, unknown> | undefined,
    tipText: string,
    def: unknown,
    after: (ev?: ChangeEvent) => void
  ): RowApi => {
    const api = parent.addBinding(
      obj as object,
      key as never,
      opts
    ) as RowApi;
    api.element.title = tipText;
    api.element.classList.add("kp-row");
    const t: Tracked = { api, obj, key, def };
    const label = api.element.querySelector(".tp-lblv_l");
    if (label) {
      const btn = document.createElement("span");
      btn.className = "kp-reset";
      btn.textContent = "⟲";
      btn.title = "Reset to default";
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (obj[key] === def) return;
        obj[key] = def;
        api.refresh?.();
        markRow(t);
        after();
        refreshCond();
      });
      label.appendChild(btn);
    }
    api.on("change", (ev) => {
      markRow(t);
      after(ev);
      refreshCond();
    });
    tracked.push(t);
    markRow(t);
    return api;
  };
  const button = (parent: Parent, title: string, tipText: string): ButtonApi => {
    const api = parent.addButton({ title }) as ButtonApi;
    api.element.title = tipText;
    return api;
  };

  const p = params as unknown as Record<string, unknown>;
  const s = settings as unknown as Record<string, unknown>;
  const D = PARAM_DEFAULTS as unknown as Record<string, unknown>;

  // Folder open/closed state persists across sessions (localStorage),
  // keyed by folder title.
  const FOLD_KEY = "knotmaze.panelFolds";
  let folds: Record<string, boolean> = {};
  try {
    folds = JSON.parse(localStorage.getItem(FOLD_KEY) ?? "{}") as Record<
      string,
      boolean
    >;
  } catch {
    folds = {};
  }
  const folder = (title: string, defaultExpanded: boolean): Parent => {
    const f = pane.addFolder({
      title,
      expanded: folds[title] ?? defaultExpanded,
    }) as unknown as Parent & {
      on: (ev: "fold", cb: (e: { expanded: boolean }) => void) => unknown;
    };
    f.on("fold", (e) => {
      folds[title] = e.expanded;
      try {
        localStorage.setItem(FOLD_KEY, JSON.stringify(folds));
      } catch {
        // Storage unavailable: folds just don't persist.
      }
    });
    return f;
  };
  const regenerateWhenDone = (ev?: ChangeEvent): void => {
    if (!ev || ev.last !== false) callbacks.onRegenerate();
  };

  // --- Design -------------------------------------------------------------
  const fDesign = folder("Design", true);
  row(
    fDesign, p, "gridSize", { min: 4, max: 24, step: 1 },
    "Lattice size. Bigger = a larger, denser knot with more threads. Regenerates the design.",
    D.gridSize, regenerateWhenDone
  );
  row(
    fDesign, p, "weaveDensity", { min: 0, max: 1, step: 0.05 },
    "How much of the lattice fills with woven thread. Low = sparse open tangle, high = tight fabric. Regenerates the design.",
    D.weaveDensity, regenerateWhenDone
  );
  row(
    fDesign, p, "turnBias", { min: 0, max: 1, step: 0.05 },
    "How often growing threads turn instead of running straight. Low = long runs, high = curly meanders. Regenerates the design.",
    D.turnBias, regenerateWhenDone
  );
  button(fDesign, "New seed", "Regenerate a fresh design from a new random seed.")
    .on("click", callbacks.onReseed);

  // --- Maze ---------------------------------------------------------------
  const fMaze = folder("Maze", true);
  row(
    fMaze, p, "mazeFabric", undefined,
    "Branching maze: walk the thread from the green entrance to the orange exit. Tap a highlighted run at your branch point to advance (tap the gold one to backtrack); tug anywhere else.",
    D.mazeFabric, () => callbacks.onModeChange()
  );
  const deadEndsRow = row(
    fMaze, p, "deadEnds", undefined,
    "Dead ends: some loops become long threads that end, somewhere far away, in a loose tip. Off = a pure braided maze where every wrong turn loops back. Regenerates the maze.",
    D.deadEnds, () => callbacks.onModeChange()
  );
  const pathVizRow = row(
    fMaze, p, "pathViz",
    { options: { gold: "gold", trail: "trail", string: "string" } },
    "How your route is shown: gold = the traveled thread recolors; trail = memory mode, only a short trail stays gold and there is no backtracking; string = unroll a thin white yarn behind you - it U-turns at junctions when you backtrack and is never picked up. Applies live.",
    D.pathViz, () => callbacks.onTrailChange()
  );
  const trailLenRow = row(
    fMaze, p, "trailLength", { min: 1, max: 15, step: 0.5 },
    "How much recent path stays lit in memory mode, in lattice units. Applies live.",
    D.trailLength, () => callbacks.onTrailChange()
  );
  const tensionRow = row(
    fMaze, p, "tension", { min: 0, max: 1, step: 0.05 },
    "Ariadne string tension: 1 lays the yarn taut along the thread, 0 leaves it loose and wavy like slack cotton. Applies live.",
    D.tension, () => callbacks.onTrailChange()
  );
  const fowRow = row(
    fMaze, p, "fogOfWar", undefined,
    "Fog of war: the maze hides until you have explored close by; explored areas stay visible. Applies live.",
    D.fogOfWar, () => callbacks.onTrailChange()
  );
  const fowRadiusRow = row(
    fMaze, p, "fowRadius", { min: 1.5, max: 10, step: 0.25 },
    "How far around your explored path the fog lifts, in lattice units. Applies live and reshapes everything already explored.",
    D.fowRadius, () => callbacks.onTrailChange()
  );
  const moveSpeedRow = row(
    fMaze, p, "moveSpeed", { min: 0.25, max: 4, step: 0.05 },
    "Maze travel speed: how fast the dot and the gold front move along the thread. Applies live.",
    D.moveSpeed, () => callbacks.onSlackChange()
  );
  const pulseSpacingRow = row(
    fMaze, p, "pulseSpacing", { min: 0.8, max: 6, step: 0.1 },
    "Distance between traveling pulses on the current junction's arms. Applies live.",
    D.pulseSpacing, () => callbacks.onSlackChange()
  );
  const resetPathBtn = button(
    fMaze,
    "Reset path",
    "Clear the traced maze path and start over from the entrance."
  ) as ButtonApi & { hidden: boolean };
  resetPathBtn.on("click", callbacks.onResetPath);
  void fowRow;
  void pathVizRow;

  // --- Look ---------------------------------------------------------------
  const fLook = folder("Look", true);
  row(
    fLook, p, "colorScheme",
    {
      options: {
        mono: "mono",
        strands: "strands",
        depth: "depth",
        segments: "segments",
        noise: "noise",
      },
    },
    "Section coloring: mono = one color; strands = per-thread hues; depth = gradient by distance from the start; segments = a random gamut color per run between intersections; noise = a spatial dye field. Sections blend smoothly through intersections. Rebuilds the scene.",
    D.colorScheme, () => callbacks.onModeChange()
  );
  row(
    fLook, p, "threadWidth", { min: 0.15, max: 0.8, step: 0.01 },
    "Ribbon width of every thread, in lattice units.",
    D.threadWidth, () => callbacks.onStyleChange()
  );
  row(
    fLook, p, "gap", { min: 0.04, max: 0.5, step: 0.01 },
    "Visible break in the under thread at each crossing - the classic over/under gap.",
    D.gap, () => callbacks.onStyleChange()
  );
  row(
    fLook, p, "fadeLength", { min: 0, max: 1.2, step: 0.02 },
    "How far the under thread fades out approaching a crossing gap. 0 = sharp cut. Applies live.",
    D.fadeLength, () => callbacks.onSlackChange()
  );
  row(
    fLook, p, "cuspRadius", { min: 0, max: 3, step: 0.05 },
    "How far the rounded corners reach where threads join at an intersection. 0 = sharp joints. Applies live.",
    D.cuspRadius, () => callbacks.onSlackChange()
  );

  // --- Motion & intro -----------------------------------------------------
  const fMotion = folder("Motion & intro", false);
  row(
    fMotion, p, "flowStrength", { min: 0, max: 1, step: 0.05 },
    "Flow undulation: how far the whole fabric sways, as if drifting in water. 0 = perfectly still. Render-only - applies live, even while the knot sleeps.",
    D.flowStrength, () => callbacks.onSlackChange()
  );
  const flowSpeedRow = row(
    fMotion, p, "flowSpeed", { min: 0, max: 3, step: 0.05 },
    "How fast the flow undulation drifts. Applies live.",
    D.flowSpeed, () => callbacks.onSlackChange()
  );
  row(
    fMotion, p, "appearMode",
    {
      options: {
        instant: "instant",
        trace: "trace",
        bloom: "bloom",
        draw: "draw",
        ink: "ink",
      },
    },
    "How the design animates in: instant = appear fully drawn; trace = grow outward from the maze entrance, splitting at every junction; bloom = the same flood from several random spots at once; draw = pen-draw each strand end to end; ink = a dye wave spreading from the entrance. Rebuilds the scene.",
    D.appearMode, () => callbacks.onModeChange()
  );
  const appearSpeedRow = row(
    fMotion, p, "appearSpeed", { min: 0.3, max: 4, step: 0.05 },
    "How fast the appearance animation reveals the threads. Applies live.",
    D.appearSpeed, () => callbacks.onSlackChange()
  );
  const appearFxRow = row(
    fMotion, p, "appearFx",
    {
      options: {
        none: "none",
        sparks: "sparks",
        comet: "comet",
        dust: "dust",
      },
    },
    "Particle effect at the growing thread ends while the design draws itself in: sparks = warm ember spray; comet = an icy streaking head with a glowing halo; dust = slow twinkling glitter motes. Applies live.",
    D.appearFx, () => callbacks.onSlackChange()
  );
  button(
    fMotion,
    "Replay settle",
    "Restart the knot from its angular lattice state and watch it relax (and appear) again."
  ).on("click", callbacks.onReplaySettle);

  // --- Touch & feel ---------------------------------------------------------
  const fFeel = folder("Touch & feel", false);
  row(
    fFeel, p, "tugLimit", { min: 0.5, max: 6, step: 0.1 },
    "How far a thread can be tugged, in thread widths. The stretch resists more as it nears the limit (drag further, move less). Applies live.",
    D.tugLimit, () => callbacks.onSlackChange()
  );
  const snapBackRow = row(
    fFeel, p, "snapBack", { min: 0, max: 12, step: 0.5 },
    "How quickly a released thread eases back to where it was grabbed (soft pluck style). 0 = release in place. Applies live.",
    D.snapBack, () => callbacks.onSlackChange()
  );
  row(
    fFeel, p, "pluckStyle",
    { options: { string: "string", soft: "soft" } },
    "Release feel: string = sharp snap-back with a decaying ring, like a real plucked string; soft = gentle ease home (speed = the snapBack slider).",
    D.pluckStyle, () => callbacks.onSlackChange()
  );
  row(
    fFeel, s, "temperature", { min: 0, max: 0.5, step: 0.01 },
    "Agitation. Shake the knot with noise; slide back to 0 and it settles into a new pose.",
    SETTINGS_DEFAULTS.temperature, () => callbacks.onTemperatureChange()
  );

  // --- Sound ----------------------------------------------------------------
  const fSound = folder("Sound", false);
  row(
    fSound, p, "soundMode",
    {
      options: { none: "none", manual: "manual", random: "random", music: "music" },
    },
    "Pluck behavior: none = silent; manual = your plucks only; random = the knot plucks a random thread now and then; music = a scripted song plays itself on matching threads. Auto plucks physically move the thread.",
    D.soundMode, () => callbacks.onAudioChange()
  );
  const pitchSpaceRow = row(
    fSound, p, "pitchSpace",
    {
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
    },
    "Scale the thread pitches live in: every maze segment gets one pitch by length (longer rings lower). chromatic = all 12 half steps - enough to play anything.",
    D.pitchSpace, () => callbacks.onAudioChange()
  );
  const octavesRow = row(
    fSound, p, "octaves", { min: 1, max: 4, step: 1 },
    "How many octaves the segment pitches spread across.",
    D.octaves, () => callbacks.onAudioChange()
  );
  const soundSpeedRow = row(
    fSound, p, "soundSpeed", { min: 0.25, max: 3, step: 0.05 },
    "Tempo of music mode and cadence of random plucks. 1 = normal.",
    D.soundSpeed, () => callbacks.onAudioChange()
  );
  row(
    fSound, p, "volume", { min: 0, max: 1, step: 0.01 },
    "Master output level.",
    D.volume, () => callbacks.onVolumeChange()
  );
  row(
    fSound, s, "muted", undefined,
    "Silence everything (also pauses the random/music auto-pluck modes).",
    SETTINGS_DEFAULTS.muted, () => {}
  );

  // --- Physics --------------------------------------------------------------
  const fPhysics = folder("Physics", false);
  row(
    fPhysics, p, "simSpeed", { min: 0, max: 10, step: 0.5 },
    "Simulation speed. 0 pauses, 5 is real time, 10 is 5x.",
    D.simSpeed, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "slack", { min: 0, max: 1, step: 0.05 },
    "How loose the threads rest. 0 pulls the knot rope-taut, 1 leaves it soft and open.",
    D.slack, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "drag", { min: 0, max: 1, step: 0.05 },
    "Motion damping. Low = springy, waves ring after a pluck; high = movement dies quickly.",
    D.drag, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "repulsion", { min: 0.4, max: 1.8, step: 0.05 },
    "Breathing room between parallel threads. Higher spreads the composition apart.",
    D.repulsion, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "bend", { min: 0.2, max: 2.5, step: 0.05 },
    "Bending stiffness. Higher resists sharp curves - smoother, rounder thread paths.",
    D.bend, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "stiffness", { min: 0.1, max: 1.35, step: 0.05 },
    "Structural spring strength along each thread. Higher = firmer, less stretchy material.",
    D.stiffness, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "smooth", { min: 0, max: 1, step: 0.05 },
    "Curvature smoothing. Evens out wiggles along threads so they read as continuous curves.",
    D.smooth, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "gridAlign", undefined,
    "Softly pull every thread back toward its original lattice position - a more formal, grid-like composition.",
    D.gridAlign, () => callbacks.onSlackChange()
  );

  // --- Advanced ---------------------------------------------------------------
  const fAdvanced = folder("Advanced", false);
  row(
    fAdvanced, s, "showDebug", undefined,
    "Overlay the physics debug view (particles, bindings, contacts).",
    SETTINGS_DEFAULTS.showDebug,
    () => callbacks.onDebugToggle(settings.showDebug === true)
  );
  button(
    fAdvanced,
    "Reset to defaults",
    "Restore every parameter to its default value (keeps the current seed) and regenerate."
  ).on("click", () => {
    Object.assign(params, PARAM_DEFAULTS);
    settings.temperature = SETTINGS_DEFAULTS.temperature;
    pane.refresh();
    markAll();
    callbacks.onRegenerate();
    refreshCond();
  });

  // The full conditional-visibility map (the 2026-10-10 audit): a row
  // hides whenever the feature it tunes is off or owned by another mode.
  refreshCond = (): void => {
    const fab = params.mazeFabric;
    deadEndsRow.hidden = !fab;
    pathVizRow.hidden = !fab;
    trailLenRow.hidden = !fab || params.pathViz !== "trail";
    tensionRow.hidden = !fab || params.pathViz !== "string";
    fowRow.hidden = !fab;
    fowRadiusRow.hidden = !fab || !params.fogOfWar;
    moveSpeedRow.hidden = !fab;
    resetPathBtn.hidden = !fab;
    pulseSpacingRow.hidden = !fab;
    // Music mode derives its pitch set from the song itself; manual and
    // random are the modes where the space/octaves choices apply.
    const freePitch =
      params.soundMode === "manual" || params.soundMode === "random";
    pitchSpaceRow.hidden = !freePitch;
    octavesRow.hidden = !freePitch;
    soundSpeedRow.hidden =
      params.soundMode !== "random" && params.soundMode !== "music";
    snapBackRow.hidden = params.pluckStyle !== "soft";
    appearSpeedRow.hidden = params.appearMode === "instant";
    appearFxRow.hidden = params.appearMode === "instant";
    flowSpeedRow.hidden = params.flowStrength <= 0;
  };
  refreshCond();

  if (wrap) {
    const saved = Number(localStorage.getItem(SCROLL_KEY) ?? "0");
    if (saved > 0) {
      requestAnimationFrame(() => {
        wrap.scrollTop = saved;
      });
    }
  }

  return pane;
}
