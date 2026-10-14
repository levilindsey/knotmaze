// Tweakpane control panel, organized into collapsible FOLDERS. Every
// non-button row carries: a native `title` tooltip, a small inline
// reset-to-default glyph, and a MODIFIED indicator - the label (and the
// glyph) tint gold whenever the value differs from its default, the
// standard settings-UX affordance (VS Code's gutter accent, JetBrains'
// blue-bold values) adapted to Tweakpane's DOM.

import { Pane } from "tweakpane";
import { APP_VERSION, BUILD_SHA, BUILD_TIME } from "../build_info";
import type { UrlParams } from "./url_state";
import {
  PARAM_DEFAULTS,
  appearModeFor,
  applyAppearMode,
  seedFromText,
  seedText,
} from "./url_state";
import { gridAlignSlider, gridAlignStrength } from "./grid_align_curve";
import {
  BACKGROUND_ACCENTS_USED,
  BACKGROUND_ANGLE_AUTO,
  BACKGROUND_DETAIL_MAX,
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
  BACKGROUND_SPEED_AUTO,
  BACKGROUND_SPEED_MAX,
  BACKGROUND_TEXTURE_MAX,
  autoSilkAngle,
  effectiveSpeed,
  isAutoAngle,
  isAutoSpeed,
  readsDetail,
} from "../render/background_model";
import type { MotionPref } from "./motion";

export interface PanelSettings {
  temperature: number;
  showDebug: boolean;
  muted: boolean;
  // The bottom-left build/perf readout (persisted per browser).
  showStats: boolean;
  // The maze HUD: path vs optimal + backtracked (persisted per browser).
  showMazeStats: boolean;
  // K73 viewer preferences (persisted per browser; not part of the design,
  // so not link params - K84 sorts every param later): the finish's
  // off-screen indicator, and whether tapping an indicator pans the camera
  // to its target (off: indicators let taps through to the maze).
  finishIndicator: boolean;
  tapToPan: boolean;
  // K53 viewer preference (persisted per browser by ui/motion.ts): follow
  // the OS's reduce-motion setting, or override it either way.
  motion: MotionPref;
}

const SETTINGS_DEFAULTS: PanelSettings = {
  temperature: 0,
  showDebug: false,
  muted: false,
  showStats: false,
  showMazeStats: false,
  finishIndicator: true,
  tapToPan: true,
  motion: "system",
};

export interface PanelCallbacks {
  onRegenerate: () => void;
  onReseed: () => void;
  // A seed typed into the seed row (rebuilds that design; same seed = no-op).
  onSetSeed: (seed: number) => void;
  onReplaySettle: () => void;
  // The physics checkbox: freeze (after settling) / resume, live.
  onPhysicsToggle: () => void;
  onDebugToggle: (visible: boolean) => void;
  onStatsToggle: (visible: boolean) => void;
  onMazeStatsToggle: (visible: boolean) => void;
  onFinishIndicatorToggle: (visible: boolean) => void;
  onTapToPanToggle: (on: boolean) => void;
  onMotionChange: (pref: MotionPref) => void;
  onSlackChange: () => void;
  onStyleChange: () => void;
  onTemperatureChange: () => void;
  onModeChange: () => void;
  // Color-only Look change (scheme / hue / gamut / palette / path color):
  // recolors the live scene in place - no rebuild, progress survives.
  onRecolor: () => void;
  // Shader background effect / intensity / speed / shape / colors: the
  // background layer (and the page color) only.
  onBackgroundChange: () => void;
  // The design's own background accents as "#rrggbb", accent 1 (the main
  // one) first: what switching the background colors to custom starts from.
  backgroundGamutColors: () => [string, string, string];
  // Memory-trail mode + trail length: gameplay interpretation and paint
  // only, applied live (no scene rebuild).
  onTrailChange: () => void;
  onResetPath: () => void;
  // Audio-only change (sound mode / pitch space / octaves): re-derive the
  // pitch assignment without rebuilding the scene.
  onAudioChange: () => void;
  onVolumeChange: () => void;
  // The daily row (K20): load today's daily maze / open the daily stats.
  onPlayDaily: () => void;
  onShowDailyStats: () => void;
}

// What main.ts can ask of the panel after building it.
export interface PanelApi {
  pane: Pane;
  // Every row re-reads params (replaced wholesale - loading a daily),
  // WITHOUT running any row's change effects.
  syncFromParams: () => void;
  // The daily row's label (today's number turns at local midnight).
  setDailyLabel: (text: string, tip: string) => void;
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
  addButton: (opts: { title: string; label?: string }) => unknown;
}

export function buildPanel(
  params: UrlParams,
  settings: PanelSettings,
  callbacks: PanelCallbacks
): PanelApi {
  // No Tweakpane title bar: the HAMBURGER button (end of buildPanel) owns
  // open/close - a title would add a second, competing collapse - and a
  // custom header row carries the name + the build's version.
  const pane = new Pane();
  const head = document.createElement("div");
  head.className = "kp-head";
  const headTop = document.createElement("div");
  headTop.className = "kp-head-top";
  const headName = document.createElement("span");
  headName.textContent = "Knotmaze";
  const headVer = document.createElement("span");
  headVer.className = "kp-ver";
  headVer.textContent = `v${APP_VERSION} · ${BUILD_SHA}`;
  if (BUILD_TIME) headVer.title = `Built ${BUILD_TIME} UTC`;
  headTop.append(headName, headVer);
  // Credit line: "[cat] Made by Snoring Cat", the whole phrase one link to
  // the studio site, and at the far end a link to the credits and
  // third-party licenses page (K122: licenses.html, generated by the build
  // from the bundled modules; a new tab, so the maze on screen stays). No
  // repo link: the code is all rights reserved (K117).
  const credit = document.createElement("div");
  credit.className = "kp-credit";
  const studio = document.createElement("a");
  studio.href = "https://snoringcat.games";
  studio.target = "_blank";
  studio.rel = "noopener";
  studio.title = "snoringcat.games";
  const cat = document.createElement("img");
  cat.src = `${import.meta.env.BASE_URL}snoring-cat.png`;
  cat.alt = "";
  studio.append(cat, "Made by Snoring Cat");
  const licenses = document.createElement("a");
  licenses.className = "kp-licenses";
  licenses.href = `${import.meta.env.BASE_URL}licenses.html`;
  licenses.target = "_blank";
  licenses.rel = "noopener";
  licenses.title = "Credits and third-party licenses";
  licenses.textContent = "Licenses";
  credit.append(studio, licenses);
  head.append(headTop, credit);
  pane.element.prepend(head);

  // The pane has outgrown short viewports: cap Tweakpane's fixed wrapper
  // at the window height and scroll INSIDE it (wheel over the panel stays
  // in the panel; the thin scrollbar matches the dark theme). It sits
  // BELOW the menu button, inside the safe area (notches).
  const wrap = pane.element.parentElement;
  const SCROLL_KEY = "knotmaze.panelScroll";
  if (wrap) {
    const top = "(max(10px, env(safe-area-inset-top)) + 50px)";
    wrap.style.top = `calc${top}`;
    wrap.style.right = "max(10px, env(safe-area-inset-right))";
    wrap.style.maxHeight = `calc(100vh - ${top} - 10px)`;
    // Dynamic viewport height where supported (mobile URL bars).
    wrap.style.maxHeight = `calc(100dvh - ${top} - 10px)`;
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
    ".kp-row.kp-mod .tp-lblv_l{color:#e7c56f}" +
    // Folder disclosure marker: a plain triangle (right when collapsed,
    // down when expanded) instead of Tweakpane's default icon; it spins
    // 90 degrees on toggle. Tweakpane marks an open folder with the
    // tp-fldv-expanded class on the FOLDER (it sets no aria-expanded -
    // a rule keyed on that never matched, so the arrow never turned).
    // The button must become a FLEX row - an inline-block ::before next
    // to the block-level title wrapped it out of the button's fixed
    // height (folder headers rendered with no text at all).
    ".tp-fldv_m{display:none}" +
    ".tp-fldv_b{display:flex;align-items:center}" +
    ".tp-fldv_t{flex:1 1 auto}" +
    ".tp-fldv_b::before{content:'';flex:0 0 auto;width:0;height:0;" +
    "border-left:4px solid transparent;border-right:4px solid transparent;" +
    "border-top:5px solid #8ea0c0;margin-right:7px;" +
    "transform:rotate(-90deg);transition:transform .2s ease}" +
    ".tp-fldv.tp-fldv-expanded>.tp-fldv_b::before{transform:rotate(0deg)}" +
    // Header: name left, the version de-emphasized in the corner; under
    // it the credit line (the studio link).
    ".kp-head{padding:7px 10px 6px;" +
    "font:600 11px var(--tp-base-font-family,'Roboto Mono',Menlo,monospace);" +
    "color:var(--tp-label-foreground-color,#bbbcc4);" +
    "border-bottom:1px solid rgba(255,255,255,.06)}" +
    ".kp-head-top{display:flex;align-items:baseline;" +
    "justify-content:space-between;gap:8px}" +
    ".kp-ver{font-weight:400;font-size:10px;opacity:.42;" +
    "white-space:nowrap;font-variant-numeric:tabular-nums}" +
    ".kp-credit{display:flex;align-items:center;gap:5px;margin-top:4px;" +
    "font-weight:400;font-size:10px;color:rgba(187,188,196,.62)}" +
    ".kp-credit a{display:inline-flex;align-items:center;gap:4px;" +
    "color:#c8cad3;text-decoration:none;transition:color .12s}" +
    ".kp-credit a:hover,.kp-credit a:focus-visible{color:#e7c56f}" +
    ".kp-credit img{width:16px;height:16px;display:block}" +
    ".kp-credit a.kp-licenses{margin-left:auto;opacity:.75;text-decoration:underline;" +
    "text-underline-offset:2px}" +
    ".kp-credit a.kp-licenses:hover,.kp-credit a.kp-licenses:focus-visible{opacity:1}" +
    // Seed row: the token field plus a square dice button beside it.
    ".kp-seed .tp-lblv_v{display:flex;align-items:center;gap:4px}" +
    ".kp-seed .tp-txtv{flex:1 1 auto;min-width:0}" +
    ".kp-dice{flex:0 0 auto;width:var(--tp-container-unit-size,20px);" +
    "height:var(--tp-container-unit-size,20px);padding:0;border:0;" +
    "border-radius:var(--tp-blade-border-radius,2px);" +
    "background:var(--tp-button-background-color,#adafb8);" +
    "color:var(--tp-button-foreground-color,#28292e);display:flex;" +
    "align-items:center;justify-content:center;cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".kp-dice:hover{background:var(--tp-button-background-color-hover,#bbbcc4)}" +
    ".kp-dice:active{background:var(--tp-button-background-color-active,#d6d7db)}" +
    ".kp-dice svg{width:14px;height:14px;display:block}" +
    // Daily row: the daily button plus the stats button beside it.
    ".kp-daily .tp-lblv_v{display:flex;align-items:center;gap:4px}" +
    ".kp-daily .tp-btnv{flex:1 1 auto;min-width:0}" +
    // Hamburger: three bars that fold into an X while the panel is open.
    ".kp-menu{position:fixed;z-index:30;" +
    "top:max(10px,env(safe-area-inset-top));" +
    "right:max(10px,env(safe-area-inset-right));" +
    "width:42px;height:42px;padding:0;border:0;border-radius:9px;" +
    "background:rgba(40,41,46,.92);box-shadow:0 2px 8px rgba(0,0,0,.35);" +
    "display:flex;flex-direction:column;align-items:center;" +
    "justify-content:center;gap:4px;cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".kp-menu span{display:block;width:18px;height:2px;border-radius:1px;" +
    "background:#c8cad3;transition:transform .2s,opacity .2s}" +
    ".kp-menu[aria-expanded='true'] span:nth-child(1)" +
    "{transform:translateY(6px) rotate(45deg)}" +
    ".kp-menu[aria-expanded='true'] span:nth-child(2){opacity:0}" +
    ".kp-menu[aria-expanded='true'] span:nth-child(3)" +
    "{transform:translateY(-6px) rotate(-45deg)}" +
    ".kp-menu:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}" +
    // Touch screens: finger-sized rows and a wider panel.
    "@media (pointer:coarse){.tp-dfwv{width:min(320px,calc(100vw - 20px));" +
    "--tp-container-unit-size:30px;--tp-blade-value-width:150px}" +
    ".kp-reset{opacity:.45;font-size:14px;padding:0 4px}}";
  document.head.appendChild(style);

  // --- Modified-state tracking + per-row reset ---------------------------
  // A row whose shown value is not its stored param (a view object, like
  // the background speed's AUTO) says itself whether it is modified and
  // how its reset glyph restores the default.
  interface CustomDefault {
    modified: () => boolean;
    reset: () => void;
  }
  interface Tracked {
    api: RowApi;
    obj: Record<string, unknown>;
    key: string;
    def: unknown;
    custom?: CustomDefault;
  }
  const tracked: Tracked[] = [];
  const markRow = (t: Tracked): void => {
    const v = t.obj[t.key];
    const mod = t.custom
      ? t.custom.modified()
      : typeof t.def === "number"
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
  // Set while syncFromParams refreshes the rows: refresh() fires change
  // handlers, and a wholesale params swap must not run their effects.
  let syncing = false;

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
    after: (ev?: ChangeEvent) => void,
    custom?: CustomDefault
  ): RowApi => {
    const api = parent.addBinding(
      obj as object,
      key as never,
      opts
    ) as RowApi;
    api.element.title = tipText;
    api.element.classList.add("kp-row");
    const t: Tracked = { api, obj, key, def, custom };
    // Set by the change handler: Tweakpane's refresh() fires it whenever the
    // shown value changes, so a reset must not run the row's effects again.
    let fired = false;
    const label = api.element.querySelector(".tp-lblv_l");
    if (label) {
      const btn = document.createElement("span");
      btn.className = "kp-reset";
      btn.textContent = "⟲";
      btn.title = "Reset to default";
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (custom) {
          if (!custom.modified()) return;
          custom.reset();
        } else {
          if (obj[key] === def) return;
          obj[key] = def;
        }
        fired = false;
        api.refresh?.();
        if (fired) return;
        markRow(t);
        after();
        refreshCond();
      });
      label.appendChild(btn);
    }
    api.on("change", (ev) => {
      fired = true;
      markRow(t);
      if (syncing) return;
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
  // The gridAlign row's slider position (see its row).
  const gaView: Record<string, unknown> = {
    gridAlign: gridAlignSlider(params.gridAlign),
  };
  // The background speed row's shown speed: AUTO (-1) shows the effect's
  // own pace (see its row).
  const shownSpeed = (): number =>
    effectiveSpeed(params.background, params.backgroundSpeed);
  // The silk angle row's shown angle: AUTO (-1) shows the seed's own.
  const shownAngle = (): number =>
    isAutoAngle(params.backgroundAngle)
      ? autoSilkAngle(params.seed)
      : params.backgroundAngle;
  const bgView: Record<string, unknown> = {
    backgroundSpeed: shownSpeed(),
    backgroundAngle: shownAngle(),
  };

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
    fDesign, p, "shape",
    {
      options: {
        rect: "rect",
        circle: "circle",
        heart: "heart",
        star: "star",
        fish: "fish",
        tree: "tree",
        ring: "ring",
      },
    },
    "Lattice silhouette: the knotwork grows only inside this shape (ring keeps a real hole in the middle). Regenerates the design.",
    D.shape, regenerateWhenDone
  );
  const ANCHOR_OPTS = {
    options: { nw: "nw", n: "n", ne: "ne", e: "e", se: "se", s: "s", sw: "sw", w: "w" },
  };
  const startAnchorRow = row(
    fDesign, p, "startAnchor", ANCHOR_OPTS,
    "Which side of the shape hosts the maze ENTRANCE (compass point). Regenerates the maze.",
    D.startAnchor, regenerateWhenDone
  );
  const exitAnchorRow = row(
    fDesign, p, "exitAnchor", ANCHOR_OPTS,
    "Which side of the shape hosts the maze EXIT (compass point). Regenerates the maze.",
    D.exitAnchor, regenerateWhenDone
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
  // SEED ROW: the design's seed as the link's base-36 token (?<seed>...).
  // Typing a seed (or any word - it hashes to one) and pressing Enter loads
  // that design; the dice button in the row rolls a random one. The row
  // always re-shows the canonical token, so a hashed word shows its seed.
  const seedView = { seed: seedText(params.seed) };
  const seedApi = fDesign.addBinding(seedView, "seed" as never) as RowApi;
  seedApi.element.title =
    "The design's seed - the first part of the link. Type a seed (or any word) and press Enter to load that design; the dice rolls a random one.";
  seedApi.element.classList.add("kp-row", "kp-seed");
  const syncSeed = (): void => {
    // The silk angle row shows an AUTO angle, which the seed picks (the row
    // is built later; syncSeed only runs once the panel exists).
    syncAngleView();
    const t = seedText(params.seed);
    if (seedView.seed === t) return;
    seedView.seed = t;
    seedApi.refresh?.(); // Re-enters the change handler with t: a no-op.
  };
  seedApi.on("change", (ev) => {
    const s = seedFromText(String(ev.value));
    if (s !== null && s !== params.seed) callbacks.onSetSeed(s);
    syncSeed();
  });
  const dice = document.createElement("button");
  dice.type = "button";
  dice.className = "kp-dice";
  dice.title = "Roll a new random seed";
  dice.setAttribute("aria-label", "Roll a new random seed");
  dice.innerHTML =
    '<svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6"/>' +
    '<circle cx="5" cy="5" r="1.4" fill="currentColor"/>' +
    '<circle cx="8" cy="8" r="1.4" fill="currentColor"/>' +
    '<circle cx="11" cy="11" r="1.4" fill="currentColor"/></svg>';
  dice.addEventListener("click", () => {
    callbacks.onReseed();
    syncSeed();
  });
  seedApi.element.querySelector(".tp-lblv_v")?.appendChild(dice);
  // Focusing the field selects the token, so typing replaces it.
  seedApi.element
    .querySelector("input")
    ?.addEventListener("focus", (e) => (e.target as HTMLInputElement).select());
  // DAILY ROW (K20): today's shared daily maze, plus the daily stats (the
  // chart button beside it). main.ts keeps the label on today's number.
  const dailyApi = fDesign.addButton({
    title: "Daily",
    label: "daily",
  }) as ButtonApi & { title: string };
  dailyApi.element.classList.add("kp-row", "kp-daily");
  dailyApi.on("click", callbacks.onPlayDaily);
  const dailyStats = document.createElement("button");
  dailyStats.type = "button";
  dailyStats.className = "kp-dice";
  dailyStats.title = "Your daily stats";
  dailyStats.setAttribute("aria-label", "Your daily stats");
  dailyStats.innerHTML =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" ' +
    'd="M2 13h12v1.5H2zM3 8h2.4v4H3zm3.8-4h2.4v8H6.8zm3.8 2H13v6h-2.4z"/></svg>';
  dailyStats.addEventListener("click", callbacks.onShowDailyStats);
  dailyApi.element.querySelector(".tp-lblv_v")?.appendChild(dailyStats);

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
  const deadEndDensityRow = row(
    fMaze, p, "deadEndDensity", { min: 0.05, max: 1, step: 0.05 },
    "Fraction of eligible loops cut into dead-end threads. 1 = maximally tree-like. Regenerates the maze.",
    D.deadEndDensity, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const deadEndLengthRow = row(
    fMaze, p, "deadEndLength", { min: 0, max: 40, step: 1 },
    "How far each dead end runs before it ends (half lattice cells of thread with no junction on it): longer tails take longer to find out. 0 = the older placement, spread out and mostly short. Regenerates the maze.",
    D.deadEndLength, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const branchDensityRow = row(
    fMaze, p, "branchDensity", { min: 0, max: 1, step: 0.05 },
    "How many extra choice junctions the maze adds beyond the minimum needed to connect everything. Regenerates the maze.",
    D.branchDensity, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const fourWayRow = row(
    fMaze, p, "fourWayFraction", { min: 0, max: 1, step: 0.05 },
    "Share of junctions realized as 4-way crossings instead of 3-way splits. Regenerates the maze.",
    D.fourWayFraction, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const junctionSpacingRow = row(
    fMaze, p, "junctionSpacing", { min: 0.5, max: 8, step: 0.25 },
    "Minimum distance between junctions (half lattice cells): higher spreads the choices out, so fewer fit. Regenerates the maze.",
    D.junctionSpacing, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const entranceClearanceRow = row(
    fMaze, p, "entranceClearance", { min: 0, max: 12, step: 0.5 },
    "Junction-free radius around the entrance (half lattice cells): the first stretch is a single path. Regenerates the maze.",
    D.entranceClearance, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const exitClearanceRow = row(
    fMaze, p, "exitClearance", { min: 0, max: 20, step: 0.5 },
    "Junction-free radius around the exit (half lattice cells), so the endgame isn't cluttered with choices. Regenerates the maze.",
    D.exitClearance, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  // LABELS AND VALUES DIFFER ON PURPOSE (K73, Levi 2026-10-12: "rename
  // 'gold' to 'fullPath', and 'trail' to 'recentPath'"). Only the shown
  // labels changed: the values stay gold / trail / string, because links
  // store the option's index in the frozen codec tables (param_codec.ts),
  // legacy `pv=` links name the values, `trm=1` reads as trail, and the
  // daily records keep the value a result ended in.
  const pathVizRow = row(
    fMaze, p, "pathViz",
    { options: { fullPath: "gold", recentPath: "trail", string: "string" } },
    "How your route is shown: fullPath = your whole traveled route stays recolored; recentPath = memory mode: only the last stretch of your route stays lit (trailLength sets how much) and there is no backtracking; string = unroll a thin white yarn behind you - it U-turns at junctions when you backtrack and is never picked up. Applies live.",
    D.pathViz, () => callbacks.onTrailChange()
  );
  const cameraRow = row(
    fMaze, p, "cameraMode",
    { options: { fit: "fit", follow: "follow" } },
    "Camera: fit = frame the whole maze (under fog: just what you can see); follow = chase your position. Pinch, scroll or drag to zoom and pan in either - in follow mode a gentle pull brings the view back after a moment. Double-click / double-tap empty space to reset the view. Applies live.",
    D.cameraMode, () => callbacks.onTrailChange()
  );
  // Max 30 since the default went 5 -> 10 (codec v4): the slider keeps
  // its old headroom of three times the default.
  const trailLenRow = row(
    fMaze, p, "trailLength", { min: 1, max: 30, step: 0.5 },
    "How much of your recent path stays lit in recentPath mode, in lattice units. Applies live.",
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
  const fowIntroRow = row(
    fMaze, p, "fowIntro", undefined,
    "Play the intro appearance animation in the open, then close the fog in around you (it fades in while its reveal radius contracts). Applies to the next intro.",
    D.fowIntro, () => callbacks.onTrailChange()
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
  const pulseReachRow = row(
    fMaze, p, "pulseReach", { min: 0.5, max: 15, step: 0.25 },
    "How far the current junction's pulses travel along each arm, in lattice units, before fading out. Applies live.",
    D.pulseReach, () => callbacks.onTrailChange()
  );
  const mazeStatsRow = row(
    fMaze, s, "showMazeStats", undefined,
    "Show the maze readout in the top-left corner: solve time (from your first move to arriving at the exit), your path vs the optimal route, efficiency once solved, the distance you backtracked, junctions visited and (with dead ends on) dead ends entered. Remembered per browser.",
    SETTINGS_DEFAULTS.showMazeStats,
    () => callbacks.onMazeStatsToggle(settings.showMazeStats === true)
  );
  // K73 viewer preferences (K84 will move them with the others).
  const finishIndicatorRow = row(
    fMaze, s, "finishIndicator", undefined,
    "While the finish is off screen, a marker at the edge of the screen points the way to it (under fog of war too, as a direction only). Remembered per browser.",
    SETTINGS_DEFAULTS.finishIndicator,
    () => callbacks.onFinishIndicatorToggle(settings.finishIndicator === true)
  );
  const tapToPanRow = row(
    fMaze, s, "tapToPan", undefined,
    "Tapping an edge marker (the finish's) brings what it points at into view. Off: the markers only point, and taps go through them to the maze. Remembered per browser.",
    SETTINGS_DEFAULTS.tapToPan,
    () => callbacks.onTapToPanToggle(settings.tapToPan === true)
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
    "Section coloring: mono = one color; strands = per-thread hues; depth = gradient by distance from the start; segments = a random gamut color per run between intersections; noise = a spatial dye field. Sections blend smoothly through intersections. Applies live.",
    D.colorScheme, () => callbacks.onRecolor()
  );
  const junctionBlendRow = row(
    fLook, p, "junctionBlend", { min: 0, max: 6, step: 0.05 },
    "How far (in lattice units) each intersection's blended color bleeds into the sections meeting there, beyond the short built-in blend. 0 = the blend stays inside the intersection; a section shorter than twice this becomes one continuous gradient between its two intersections. Segments and strands schemes. Applies live.",
    D.junctionBlend, () => callbacks.onRecolor()
  );
  row(
    fLook, p, "hueShift", { min: 0, max: 359, step: 1 },
    "Rotates the whole color gamut around the hue wheel (added to the seed's base hue). Applies live.",
    D.hueShift, () => callbacks.onRecolor()
  );
  row(
    fLook, p, "gamutArc", { min: 40, max: 360, step: 5 },
    "Width of the hue arc colors are drawn from: narrow = one tight family, 360 = the full rainbow. Applies live.",
    D.gamutArc, () => callbacks.onRecolor()
  );
  row(
    fLook, p, "palette",
    {
      options: {
        pastel: "pastel",
        jewel: "jewel",
        ember: "ember",
        moss: "moss",
        ink: "ink",
      },
    },
    "Saturation/lightness character of the gamut. Applies live.",
    D.palette, () => callbacks.onRecolor()
  );
  const pathColorRow = row(
    fLook, p, "pathColor", { view: "color" },
    "Color of the traveled-path highlight (the classic gold). Applies live.",
    D.pathColor, () => callbacks.onRecolor()
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
    fLook, p, "cuspRadius", { min: 0, max: 6, step: 0.05 },
    "How far the rounded corners reach where threads join at an intersection. 0 = sharp joints. Applies live.",
    D.cuspRadius, () => callbacks.onSlackChange()
  );
  row(
    fLook, p, "background",
    {
      options: {
        none: "none",
        vellum: "vellum",
        mist: "mist",
        wash: "wash",
        silk: "silk",
        aurora: "aurora",
        contours: "contours",
      },
    },
    "Backdrop behind the knot, in the design's own colors (it shows through the crossing gaps too): none = the plain page; vellum = dark parchment grain (still unless given a speed); mist = slow marbled smoke; wash = drifting watercolor blooms; silk = long flowing streaks; aurora = soft curtains of light; contours = the contour lines of a slowly shifting map. Everything but vellum drifts very slowly (backgroundSpeed sets how fast; reduced motion keeps every backdrop still). Applies live.",
    D.background, () => {
      // The speed row shows the new effect's pace while it is on auto.
      bgView.backgroundSpeed = shownSpeed();
      backgroundSpeedRow.refresh?.();
      callbacks.onBackgroundChange();
    }
  );
  const backgroundIntensityRow = row(
    fLook, p, "backgroundIntensity", { min: 0, max: 1, step: 0.05 },
    "Backdrop contrast: 0 = the plain page color, 1 = the strongest look. Applies live.",
    D.backgroundIntensity, () => callbacks.onBackgroundChange()
  );
  // K79: the backdrop's animation speed. The param's default is AUTO (-1:
  // each effect's own pace - 1 for the drifting ones, 0 for vellum), so
  // the row binds a view holding the SHOWN speed and writes the param only
  // when the slider moves off it; the reset glyph returns to auto. No step
  // (a step constraint snaps an off-step speed from a link on the next
  // refresh); the param keeps 2 decimals.
  const backgroundSpeedRow = row(
    fLook, bgView, "backgroundSpeed",
    {
      min: 0,
      max: BACKGROUND_SPEED_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "How fast the backdrop moves: 0 = still, 1 = the effect's own pace, up to 8x. Vellum is still until you give it a speed (then its mottling drifts and its light wanders; the grain stays put). The reset glyph returns to each effect's own pace. Reduced motion (Motion & intro) keeps every backdrop still. Applies live.",
    0, () => {
      const v = bgView.backgroundSpeed as number;
      if (Math.abs(v - shownSpeed()) > 1e-9) {
        params.backgroundSpeed = Math.round(v * 100) / 100;
      }
      callbacks.onBackgroundChange();
    },
    {
      modified: () => !isAutoSpeed(params.backgroundSpeed),
      reset: () => {
        params.backgroundSpeed = BACKGROUND_SPEED_AUTO;
        bgView.backgroundSpeed = shownSpeed();
      },
    }
  );
  // K79 stage B: the backdrop's SHAPE. Scale and detail apply to every
  // effect, fibers and grain to vellum, the angle to silk (each row hides
  // where it does nothing). At their defaults every effect draws exactly as
  // designed (its own program, byte for byte). NO STEP on these sliders:
  // Tweakpane's step grid starts at the row's FIRST value, so after a link
  // with an off-step value a refresh snaps others onto that grid (Reset to
  // defaults would write 0.98 for 1). An edit keeps 2 decimals.
  const round2 = (v: number): number => Math.round(v * 100) / 100;
  const shapeRow = (
    key:
      | "backgroundScale"
      | "backgroundDetail"
      | "backgroundFibers"
      | "backgroundGrain",
    min: number,
    max: number,
    tipText: string
  ): RowApi =>
    row(
      fLook, p, key,
      {
        min,
        max,
        keyScale: 0.05,
        pointerScale: 0.01,
        format: (v: number) => v.toFixed(2),
      },
      tipText,
      D[key], () => {
        params[key] = round2(params[key]);
        callbacks.onBackgroundChange();
      }
    );
  const backgroundScaleRow = shapeRow(
    "backgroundScale", BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX,
    "Backdrop pattern size: 1 = as designed, 0.5 = half as large (finer), up to 2x larger. Applies live."
  );
  const backgroundDetailRow = shapeRow(
    "backgroundDetail", 0, BACKGROUND_DETAIL_MAX,
    "Backdrop roughness (mist, wash, silk and contours): 0 = smooth, soft shapes; 1 = as designed; 2 = rough, the fine detail loud. The contrast stays the same. Applies live."
  );
  const backgroundFibersRow = shapeRow(
    "backgroundFibers", 0, BACKGROUND_TEXTURE_MAX,
    "Vellum's paper fibers: 0 = none, 1 = as designed, up to 3x stronger. Applies live."
  );
  const backgroundGrainRow = shapeRow(
    "backgroundGrain", 0, BACKGROUND_TEXTURE_MAX,
    "Vellum's fine grain: 0 = none, 1 = as designed, up to 3x stronger. Applies live."
  );
  // Silk's streak direction: the speed row's view pattern. AUTO (-1, the
  // default) is the seed's own direction, so the row shows that angle and
  // writes the param only when the slider moves off it (whole degrees,
  // counterclockwise from screen right); the reset glyph returns to auto.
  const backgroundAngleRow = row(
    fLook, bgView, "backgroundAngle",
    {
      min: 0,
      max: 360,
      keyScale: 1,
      pointerScale: 0.5,
      format: (v: number) => v.toFixed(0),
    },
    "Silk's streak direction, in degrees counterclockwise from pointing right (0 = left to right, 90 = upward). Each design picks its own until you set one; the reset glyph returns to it. Applies live.",
    0, () => {
      const v = bgView.backgroundAngle as number;
      if (Math.abs(v - shownAngle()) > 1e-9) {
        params.backgroundAngle = ((Math.round(v) % 360) + 360) % 360;
      }
      callbacks.onBackgroundChange();
    },
    {
      modified: () => !isAutoAngle(params.backgroundAngle),
      reset: () => {
        params.backgroundAngle = BACKGROUND_ANGLE_AUTO;
        bgView.backgroundAngle = shownAngle();
      },
    }
  );
  // A new seed moves an AUTO angle: re-show it without running the row.
  const syncAngleView = (): void => {
    const a = shownAngle();
    if (bgView.backgroundAngle === a) return;
    bgView.backgroundAngle = a;
    const was = syncing;
    syncing = true;
    try {
      backgroundAngleRow.refresh?.();
    } finally {
      syncing = was;
    }
  };

  // K79 stage B: the backdrop's COLORS. design = the page ink plus three
  // accents from the design's own gamut (they follow its hue, gamut arc
  // and palette); custom = a base color (the page itself - behind none and
  // under the flat fog too) plus three accents. Switching to custom with
  // the custom colors untouched starts them from the design's, so nothing
  // jumps; switching back with them still untouched returns them to their
  // defaults, so the link stays short.
  const customKeys = [
    "backgroundBase",
    "backgroundAccent1",
    "backgroundAccent2",
    "backgroundAccent3",
  ] as const;
  const colorRows: RowApi[] = [];
  const setCustomColors = (accents: readonly string[]): void => {
    params.backgroundAccent1 = accents[0];
    params.backgroundAccent2 = accents[1];
    params.backgroundAccent3 = accents[2];
    const was = syncing;
    syncing = true;
    try {
      for (const r of colorRows) r.refresh?.();
    } finally {
      syncing = was;
    }
    markAll();
  };
  const customColorsAre = (accents: readonly string[]): boolean =>
    params.backgroundBase === PARAM_DEFAULTS.backgroundBase &&
    params.backgroundAccent1 === accents[0] &&
    params.backgroundAccent2 === accents[1] &&
    params.backgroundAccent3 === accents[2];
  const defaultAccents = [
    PARAM_DEFAULTS.backgroundAccent1,
    PARAM_DEFAULTS.backgroundAccent2,
    PARAM_DEFAULTS.backgroundAccent3,
  ];
  row(
    fLook, p, "backgroundColorMode",
    { options: { design: "gamut", custom: "custom" } },
    "Backdrop colors: design = the page color plus the design's own colors (they follow hue, gamut and palette); custom = choose the page color and the accent colors yourself (they start from the design's). Applies live.",
    D.backgroundColorMode, () => {
      if (params.backgroundColorMode === "custom") {
        if (customColorsAre(defaultAccents)) {
          setCustomColors(callbacks.backgroundGamutColors());
        }
      } else if (customColorsAre(callbacks.backgroundGamutColors())) {
        setCustomColors(defaultAccents);
      }
      callbacks.onBackgroundChange();
    }
  );
  const colorTips = [
    "The page color: the backdrop's darkest tone, and the plain page behind the knot when there is no backdrop (and the fog of war over it). Applies live.",
    "Accent 1, the backdrop's main color: vellum's tint, mist's glow, aurora's bright crests, one of wash's blooms. Applies live.",
    "Accent 2: one end of the backdrop's color range (mist's smoke, silk's streaks, the contour lines, an aurora curtain, a wash bloom). Applies live.",
    "Accent 3: the other end of the backdrop's color range. Applies live.",
  ];
  customKeys.forEach((key, i) => {
    colorRows.push(
      row(
        fLook, p, key, { view: "color" }, colorTips[i],
        D[key], () => callbacks.onBackgroundChange()
      )
    );
  });

  // --- Motion & intro -----------------------------------------------------
  const fMotion = folder("Motion & intro", false);
  // THE MOTION SETTING (K53): a viewer preference, not a design param (no
  // link, no daily; ui/motion.ts stores it).
  row(
    fMotion, s, "motion",
    { options: { "follow system": "system", full: "full", reduced: "reduced" } },
    "How much the page moves. follow system = your device's reduce-motion setting (it switches live); full = all motion; reduced = backdrops hold still, plucked threads swing less with no speed ghost, the camera jumps to an edge marker's target instead of easing there, and the loading knot, the mode badge and the edge markers stop breathing and fading. Remembered per browser.",
    SETTINGS_DEFAULTS.motion,
    () => callbacks.onMotionChange(settings.motion)
  );
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
  // APPEARANCE: the mode row sets the three rows below it together, and
  // editing any of those re-derives the mode. Each side refreshes the other
  // under `appearSync`, because refresh() fires the change handlers - one
  // choice must rebuild the scene once.
  let appearSync = false;
  const appearRows: RowApi[] = [];
  const appearModeRow = row(
    fMotion, p, "appearMode",
    {
      options: {
        instant: "instant",
        "ink + dust": "ink-dust",
        "trace + burn": "trace-burn",
        "trace + rainbow": "trace-rainbow",
        "trace + roots": "trace-roots",
        "bloom + comet": "bloom-comet",
        random: "random",
        custom: "custom",
      },
    },
    "Appearance preset: sets the sequence, effect and speed below together. random = new random ones every time the page loads; custom = keep them as set. Editing any of the three switches this to custom (or to the preset they match). Rebuilds the scene.",
    D.appearMode, () => {
      if (appearSync) return;
      if (params.appearMode === "custom") {
        callbacks.onSlackChange();
        return;
      }
      applyAppearMode(params);
      appearSync = true;
      for (const r of appearRows) r.refresh?.();
      appearSync = false;
      callbacks.onModeChange();
    }
  );
  const appearEdited = (then: () => void) => (): void => {
    if (appearSync) return;
    params.appearMode = appearModeFor(params);
    appearSync = true;
    appearModeRow.refresh?.();
    appearSync = false;
    then();
  };
  const appearSequenceRow = row(
    fMotion, p, "appearSequence",
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
    D.appearSequence, appearEdited(() => callbacks.onModeChange())
  );
  const appearSpeedRow = row(
    fMotion, p, "appearSpeed", { min: 0.3, max: 4, step: 0.05 },
    "How fast the appearance animation reveals the threads. Applies live.",
    D.appearSpeed, appearEdited(() => callbacks.onSlackChange())
  );
  const appearFxRow = row(
    fMotion, p, "appearFx",
    {
      options: {
        none: "none",
        rainbow: "rainbow",
        comet: "comet",
        dust: "dust",
        burn: "burn",
        roots: "roots",
      },
    },
    "Particle effect at the growing thread ends while the design draws itself in: rainbow = six saturated stripes ride each fresh thread behind a white-hot tip, fading to its true color, with a full-spectrum spark spray; comet = a blue-green streaking head, the thread materializing from transparent behind it; dust = dense twinkling glitter over threads that fade in; burn = the thread smolders in, orange tip charring to black with rising smoke; roots = brown rootlets probing in with a soft dirt spray. Applies live.",
    D.appearFx, appearEdited(() => callbacks.onSlackChange())
  );
  appearRows.push(appearSequenceRow, appearSpeedRow, appearFxRow);
  button(
    fMotion,
    "Replay settle",
    "Restart the knot from its angular lattice state and watch it relax (and appear) again."
  ).on("click", callbacks.onReplaySettle);

  // --- Touch & feel ---------------------------------------------------------
  const fFeel = folder("Touch & feel", false);
  row(
    fFeel, p, "pluckSize", { min: 0, max: 3, step: 0.05 },
    "How wide a plucked thread swings. A tap (or an auto pluck) sets the thread between its crossings vibrating - visual only, nothing else moves. 0 = sound only. Applies live.",
    D.pluckSize, () => callbacks.onSlackChange()
  );
  const pluckGhostRow = row(
    fFeel, p, "pluckGhost", { min: 0, max: 1, step: 0.05 },
    "The speed cue on a vibrating thread: a faint crisp copy of the string flickering inside the blur. 0 = a pure time-exposure blur. Off under reduced motion (Motion & intro). Applies live.",
    D.pluckGhost, () => callbacks.onSlackChange()
  );
  row(
    fFeel, p, "pluckReach",
    { options: { run: "run", lobe: "lobe" } },
    "What a pluck sets vibrating: run = the whole maze segment you hear, each stretch between crossings humming (in knot mode, the plucked stretch and two either side); lobe = only the stretch between the two nearest crossings. Applies to the next pluck.",
    D.pluckReach, () => callbacks.onSlackChange()
  );
  const tugLimitRow = row(
    fFeel, p, "tugLimit", { min: 0.5, max: 6, step: 0.1 },
    "Dragging a thread tugs it (taps pluck instead). How far a thread can be tugged, in thread widths; the stretch resists more as it nears the limit (drag further, move less). Applies live.",
    D.tugLimit, () => callbacks.onSlackChange()
  );
  const snapBackRow = row(
    fFeel, p, "snapBack", { min: 0, max: 12, step: 0.5 },
    "After a drag: how quickly the released thread eases back to where it was grabbed (soft release style). 0 = release in place. Applies live.",
    D.snapBack, () => callbacks.onSlackChange()
  );
  const pluckStyleRow = row(
    fFeel, p, "pluckStyle",
    { options: { string: "string", soft: "soft" } },
    "After a drag: string = let go at once - the knot snaps back and the released stretch vibrates like a plucked string; soft = ease home gently (speed = the snapBack slider), no vibration.",
    D.pluckStyle, () => callbacks.onSlackChange()
  );
  const temperatureRow = row(
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
    "Pluck behavior: none = silent; manual = your plucks only; random = the knot plucks a random thread now and then; music = a scripted song plays itself on matching threads. Auto plucks make the thread ring (visual only - nothing else moves).",
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
  const rootNoteRow = row(
    fSound, p, "rootNote",
    {
      options: {
        seed: "seed", C: "C", "C#": "C#", D: "D", "D#": "D#", E: "E",
        F: "F", "F#": "F#", G: "G", "G#": "G#", A: "A", "A#": "A#", B: "B",
      },
    },
    "Root note of the pluck scale. 'seed' derives it from the design seed.",
    D.rootNote, () => callbacks.onAudioChange()
  );
  const tonicEmphasisRow = row(
    fSound, p, "tonicEmphasis", { min: 0, max: 1, step: 0.05 },
    "How strongly the segment pitches gravitate to the key: more threads ring the tonic (up to 3x), the dominant (2x) and the third (1.5x). 0 = every scale note equally often.",
    D.tonicEmphasis, (ev) => { if (!ev || ev.last !== false) callbacks.onAudioChange(); }
  );
  const soundSpeedRow = row(
    fSound, p, "soundSpeed", { min: 0.25, max: 6, step: 0.05 },
    "Tempo of music mode and cadence of random plucks. 1 = normal.",
    D.soundSpeed, () => callbacks.onAudioChange()
  );
  row(
    fSound, p, "volume", { min: 0, max: 1, step: 0.01 },
    "Master output level.",
    D.volume, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "reverb", { min: 0, max: 1, step: 0.01 },
    "Hall reverb amount. 0 = dry strings, 1 = a wash of room.",
    D.reverb, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "brightness", { min: 0, max: 1, step: 0.01 },
    "String brightness: low = felted and dark, high = wiry and bright. Applies from the next pluck.",
    D.brightness, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "sustain", { min: 0, max: 1, step: 0.01 },
    "How long strings ring after a pluck.",
    D.sustain, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "shimmer", { min: 0, max: 1, step: 0.01 },
    "Unison-course detune: the slow beating shimmer of paired strings. 0 = a single pure string.",
    D.shimmer, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "pickPosition", { min: 0, max: 1, step: 0.01 },
    "Where along the string the finger plucks: low = near the end (nasal, thin), high = near the middle (round, hollow).",
    D.pickPosition, () => callbacks.onVolumeChange()
  );
  row(
    fSound, s, "muted", undefined,
    "Silence everything (also pauses the random/music auto-pluck modes).",
    SETTINGS_DEFAULTS.muted, () => {}
  );

  // --- Physics --------------------------------------------------------------
  const fPhysics = folder("Physics", false);
  row(
    fPhysics, p, "physics", undefined,
    "Physics simulation. Off: each design settles behind a loading spinner, then its layout freezes - nothing simulates afterwards (lighter on battery and slow devices). Threads can still be plucked (and flow, pulses and the intro still play), but not tugged: a drag pans the view. Applies live - turning it off first lets a moving knot come to rest; the sliders below still shape the frozen layout.",
    D.physics, () => callbacks.onPhysicsToggle()
  );
  const simSpeedRow = row(
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
  // gridAlign speaks an EXPONENTIAL slider (grid_align_curve.ts): the row
  // binds a view object holding the slider POSITION, and its change
  // handler writes the STRENGTH back into params - the URL and the physics
  // keep the strength, so every link keeps its look. No step: a step
  // constraint would snap the default (slider 0.669) off its exact value.
  row(
    fPhysics, gaView, "gridAlign",
    { min: 0, max: 1, format: (v: number) => v.toFixed(2) },
    "How strongly every thread is pulled back toward its lattice position, on an exponential scale (each tenth of the slider doubles the pull): 0 = free-flowing curves, 1 = a formal, grid-like composition. Applies live.",
    gridAlignSlider(PARAM_DEFAULTS.gridAlign), () => {
      params.gridAlign = gridAlignStrength(gaView.gridAlign as number);
      callbacks.onSlackChange();
    }
  );

  // --- Advanced ---------------------------------------------------------------
  const fAdvanced = folder("Advanced", false);
  row(
    fAdvanced, s, "showDebug", undefined,
    "Overlay the physics debug view (particles, bindings, contacts).",
    SETTINGS_DEFAULTS.showDebug,
    () => callbacks.onDebugToggle(settings.showDebug === true)
  );
  row(
    fAdvanced, s, "showStats", undefined,
    "Show the build + performance readout (version, sim/wall time, frame cost) in the bottom-left corner. Remembered per browser.",
    SETTINGS_DEFAULTS.showStats,
    () => callbacks.onStatsToggle(settings.showStats === true)
  );
  button(
    fAdvanced,
    "Reset to defaults",
    "Restore every parameter to its default value (keeps the current seed) and regenerate."
  ).on("click", () => {
    Object.assign(params, PARAM_DEFAULTS);
    settings.temperature = SETTINGS_DEFAULTS.temperature;
    gaView.gridAlign = gridAlignSlider(params.gridAlign);
    bgView.backgroundSpeed = shownSpeed();
    bgView.backgroundAngle = shownAngle();
    pane.refresh();
    markAll();
    callbacks.onRegenerate();
    refreshCond();
  });

  // The full conditional-visibility map (the 2026-10-10 audit): a row
  // hides whenever the feature it tunes is off or owned by another mode.
  refreshCond = (): void => {
    const fab = params.mazeFabric;
    startAnchorRow.hidden = !fab;
    exitAnchorRow.hidden = !fab;
    deadEndsRow.hidden = !fab;
    deadEndDensityRow.hidden = !fab || !params.deadEnds;
    deadEndLengthRow.hidden = !fab || !params.deadEnds;
    branchDensityRow.hidden = !fab;
    fourWayRow.hidden = !fab;
    junctionSpacingRow.hidden = !fab;
    entranceClearanceRow.hidden = !fab;
    exitClearanceRow.hidden = !fab;
    pathVizRow.hidden = !fab;
    cameraRow.hidden = !fab;
    trailLenRow.hidden = !fab || params.pathViz !== "trail";
    tensionRow.hidden = !fab || params.pathViz !== "string";
    fowRow.hidden = !fab;
    fowRadiusRow.hidden = !fab || !params.fogOfWar;
    fowIntroRow.hidden =
      !fab || !params.fogOfWar || params.appearSequence === "instant";
    moveSpeedRow.hidden = !fab;
    mazeStatsRow.hidden = !fab;
    finishIndicatorRow.hidden = !fab;
    tapToPanRow.hidden = !fab;
    resetPathBtn.hidden = !fab;
    pulseSpacingRow.hidden = !fab;
    pulseReachRow.hidden = !fab;
    // The gold recolor paints in gold/trail modes; the yarn replaces it.
    pathColorRow.hidden = !fab || params.pathViz === "string";
    // Music mode derives its pitch set from the song itself; manual and
    // random are the modes where the space/octaves choices apply.
    const freePitch =
      params.soundMode === "manual" || params.soundMode === "random";
    pitchSpaceRow.hidden = !freePitch;
    octavesRow.hidden = !freePitch;
    rootNoteRow.hidden = !freePitch;
    tonicEmphasisRow.hidden = !freePitch;
    soundSpeedRow.hidden =
      params.soundMode !== "random" && params.soundMode !== "music";
    // Tugs (and their release controls), agitation and the sim speed exist
    // only while the physics runs.
    const live = params.physics;
    tugLimitRow.hidden = !live;
    pluckStyleRow.hidden = !live;
    snapBackRow.hidden = !live || params.pluckStyle !== "soft";
    temperatureRow.hidden = !live;
    simSpeedRow.hidden = !live;
    pluckGhostRow.hidden = params.pluckSize <= 0;
    appearSpeedRow.hidden = params.appearSequence === "instant";
    appearFxRow.hidden = params.appearSequence === "instant";
    flowSpeedRow.hidden = params.flowStrength <= 0;
    // Only the segments and strands schemes have junction ramps (depth and
    // noise are continuous; knot mode has no junctions).
    junctionBlendRow.hidden =
      !fab ||
      (params.colorScheme !== "segments" && params.colorScheme !== "strands");
    const bg = params.background;
    backgroundIntensityRow.hidden = bg === "none";
    backgroundSpeedRow.hidden = bg === "none";
    backgroundScaleRow.hidden = bg === "none";
    backgroundDetailRow.hidden = bg === "none" || !readsDetail(bg);
    backgroundFibersRow.hidden = bg !== "vellum";
    backgroundGrainRow.hidden = bg !== "vellum";
    backgroundAngleRow.hidden = bg !== "silk";
    // Custom colors: the base always (it is the page), each accent only
    // where the effect uses it.
    const custom = params.backgroundColorMode === "custom";
    colorRows.forEach((r, i) => {
      r.hidden =
        !custom ||
        (i > 0 && !BACKGROUND_ACCENTS_USED[bg].includes(i));
    });
  };
  refreshCond();

  // HAMBURGER: shows/hides the whole panel. Open by default on roomy,
  // pointer-precise screens; closed on phones (it would cover the maze).
  // The choice persists per browser.
  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "kp-menu";
  menu.setAttribute("aria-label", "Settings");
  menu.innerHTML = "<span></span><span></span><span></span>";
  document.body.appendChild(menu);
  const OPEN_KEY = "knotmaze.panelOpen";
  let open = !window.matchMedia("(max-width: 700px), (pointer: coarse)")
    .matches;
  try {
    const v = localStorage.getItem(OPEN_KEY);
    if (v !== null) open = v === "1";
  } catch {
    // Storage unavailable: the default stands.
  }
  // Scroll restores on the first OPEN (a hidden wrapper has no layout).
  let scrollRestored = false;
  const setOpen = (v: boolean): void => {
    open = v;
    if (wrap) wrap.style.display = v ? "" : "none";
    menu.setAttribute("aria-expanded", String(v));
    menu.title = v ? "Hide settings" : "Show settings";
    if (v && !scrollRestored && wrap) {
      scrollRestored = true;
      let saved = 0;
      try {
        saved = Number(localStorage.getItem(SCROLL_KEY) ?? "0");
      } catch {
        // Storage unavailable: start at the top.
      }
      if (saved > 0) {
        requestAnimationFrame(() => {
          wrap.scrollTop = saved;
        });
      }
    }
  };
  menu.addEventListener("click", () => {
    setOpen(!open);
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // Storage unavailable: state just doesn't persist.
    }
  });
  setOpen(open);

  return {
    pane,
    syncFromParams: () => {
      syncing = true;
      try {
        gaView.gridAlign = gridAlignSlider(params.gridAlign);
        bgView.backgroundSpeed = shownSpeed();
        bgView.backgroundAngle = shownAngle();
        pane.refresh();
      } finally {
        syncing = false;
      }
      syncSeed();
      markAll();
      refreshCond();
    },
    setDailyLabel: (text, tip) => {
      if (dailyApi.title !== text) dailyApi.title = text;
      dailyApi.element.title = tip;
    },
  };
}
