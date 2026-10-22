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
  FIRE_DELAY_MAX,
  FIRE_SPEED_MAX,
  FIRE_SPEED_MIN,
  HOVER_GLOW_FADE_MAX,
  HOVER_GLOW_LENGTH_MAX,
  HOVER_GLOW_LENGTH_MIN,
  HOVER_GLOW_WIDTH_MAX,
  HOVER_GLOW_WIDTH_MIN,
  LOAD_SETTLE_MAX,
  MINO_GIVE_UP_MAX,
  MINO_ROAM_MIN_MAX,
  MINO_ROAM_RUNS_MAX,
  MINO_RUNS_MIN,
  MINO_SIGHT_MAX,
  MINO_SLEEP_MAX,
  MINO_TERRITORY_MAX,
  PARAM_DEFAULTS,
  PICK_CHOICE_RATIO_MAX,
  PICK_CHOICE_RATIO_MIN,
  PICK_MARGIN_MAX,
  SETTLE_BUDGET_MAX,
  appearModeFor,
  applyAppearMode,
  clockOf,
  seedFromText,
  seedText,
  pathVizOf,
} from "./url_state";
import { gridAlignSlider, gridAlignStrength } from "./grid_align_curve";
import { createPanelSearch, type PanelSearchUi } from "./panel_search_ui";
import { PARAM_TAGS } from "./param_tags";
import { PAR_SLACK_MAX, PAR_SLACK_MIN } from "../game/par";
import { SPOOL_SLACK_MAX, SPOOL_SLACK_MIN } from "../game/spool";
import { HINTS_MAX } from "../game/hints";
import { ICE_SHARE_MAX, ICE_SHARE_ON } from "../game/ice";
import { TURNSTILES_MAX } from "../game/turnstiles";
import { HIDDEN_MAX } from "../game/hidden_runs";
import { ONE_WAY_MAX } from "../game/one_way";
import { KEYS_MAX } from "../game/locks";
import { LIVES_MAX, LIVES_RECOMMENDED, livesOf } from "../game/lives";
import { SWORD_MOVES_MAX, SWORD_MOVES_MIN } from "../game/sword";
import { SLEEPERS_MAX } from "../game/monsters";
import { LURES_MAX } from "../game/lures"; // K137 stage 4
import { SNARES_MAX } from "../game/snares";
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
import {
  CANNON_AMOUNT_MAX,
  CONFETTI_AMOUNT_MAX,
  CONFETTI_SHINE_MAX,
} from "../render/confetti_model";
import { MARKER_SIZE_MAX, MARKER_SIZE_MIN } from "../render/marker_glyphs";
import {
  INDICATOR_SCALE_MAX,
  INDICATOR_SCALE_MIN,
} from "./offscreen_indicators";
import { PLUCK_WHOLE_MAX, RIPPLE_STRENGTH_MAX } from "../render/pluck_model";
import { telegraphOn } from "../game/minotaur_turns";
import type { MotionPref } from "./motion";
import {
  SHEET_FONT_PX,
  SHEET_QUERY,
  SheetHistory,
  helpEnabled,
  panelStartsOpen,
} from "./panel_sheet";

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
  // K198 stage 2 viewer preferences (persisted per browser, never link
  // params): the head's and the minotaur's indicators, and one size for all
  // three (a multiplier on the default size).
  headIndicator: boolean;
  minotaurIndicator: boolean;
  indicatorSize: number;
  // K120 viewer preference (persisted per browser; ui/move_pad.ts): the
  // four-way move pad, on by default for coarse pointers.
  movePad: boolean;
  // K137 stage 2 viewer preference (persisted per browser; ui/aid_buttons.ts):
  // chalk marks, off by default.
  chalk: boolean;
  // K53 viewer preference (persisted per browser by ui/motion.ts): follow
  // the OS's reduce-motion setting, or override it either way.
  motion: MotionPref;
  // K111 (ui/accessibility.ts): the Accessibility group's two master
  // switches, shown as what is in force right now. Reduced motion DRIVES the
  // Motion setting above (one answer, never two); High contrast has its own
  // preference and follows the OS until chosen. Neither is a design param.
  reducedMotion: boolean;
  highContrast: boolean;
}

// K111: prefixes the tooltip of a row an Accessibility switch overrides.
const OVERRIDDEN_NOTE =
  "Overridden by an Accessibility switch while it is on (your value is kept and comes back when it is off). ";

const SETTINGS_DEFAULTS: PanelSettings = {
  temperature: 0,
  showDebug: false,
  muted: false,
  showStats: false,
  showMazeStats: false,
  finishIndicator: true,
  tapToPan: true,
  headIndicator: true,
  minotaurIndicator: true,
  indicatorSize: 1,
  movePad:
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches,
  chalk: false,
  motion: "system",
  reducedMotion: false,
  highContrast: false,
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
  // K198 stage 2: the head's and the minotaur's indicators, and the size.
  onHeadIndicatorToggle: (visible: boolean) => void;
  onMinotaurIndicatorToggle: (visible: boolean) => void;
  onIndicatorSizeChange: (scale: number) => void;
  onTapToPanToggle: (on: boolean) => void;
  onMovePadToggle: (on: boolean) => void;
  // K137 stage 2: the chalk preference; the compass (a design param that
  // restarts nothing).
  onChalkToggle: (on: boolean) => void;
  onAidsChange: () => void;
  onMotionChange: (pref: MotionPref) => void;
  // K111: the Accessibility group's switches (viewer preferences).
  onReducedMotionToggle: (on: boolean) => void;
  onHighContrastToggle: (on: boolean) => void;
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
  // K80: the maze clock (turn-based / real time): restarts the solve.
  onClockChange: () => void;
  // K80: the real-time chase's tuning (paces, pauses, distances) and how
  // the minotaur shows under fog: applied live, the chase goes on.
  onChaseChange: () => void;
  // K80 turns: the turn-aligned minotaur's speed, telegraph and behavior,
  // applied live (its `minotaur` row runs onClockChange: a restart).
  onTurnMinoChange: () => void;
  // K140: the finish confetti (on/off, amount): render-only, applied live.
  onConfettiChange: () => void;
  // K98: the markers' size (the player's dot, the start, the finish, the
  // minotaur): render-only, applied live.
  onMarkerSizeChange: () => void;
  // K552: the daily's title thread (dailyTitleThread): a daily rebuilds
  // and keeps its attempt; off a daily it builds nothing.
  onTitleThreadChange: () => void;
  // Audio-only change (sound mode / pitch space / octaves): re-derive the
  // pitch assignment without rebuilding the scene.
  onAudioChange: () => void;
  onVolumeChange: () => void;
  // The daily row (K20): load today's daily maze / open the daily stats.
  onPlayDaily: () => void;
  onShowDailyStats: () => void;
  // K468: Back closed the settings sheet. The entry it returned to holds
  // the link from before the sheet opened, so write the design's link again.
  onSheetBack?: () => void;
}

// What main.ts can ask of the panel after building it.
export interface PanelApi {
  pane: Pane;
  // Every row re-reads params (replaced wholesale - loading a daily),
  // WITHOUT running any row's change effects.
  syncFromParams: () => void;
  // K111: the Motion row and the two Accessibility switches re-read from
  // the settings in force (the OS flipped, or the Motion row moved the same
  // answer), WITHOUT running any row's change effects.
  syncAccessibility: (v: {
    motion: MotionPref;
    reducedMotion: boolean;
    highContrast: boolean;
  }) => void;
  // K111: dims the design rows an Accessibility switch is overriding right
  // now (their stored values are kept and come back when it is off).
  markOverridden: (keys: readonly string[]) => void;
  // The daily row's label (today's number turns at local midnight).
  setDailyLabel: (text: string, tip: string) => void;
  // K552: a daily is on screen (or not): the rows that only mean something
  // on a daily are disabled off one, never hidden (the panel keeps its
  // layout, Call C3).
  setOnDaily: (on: boolean) => void;
  // K92: the panel's open state (the hamburger), and a listener for its
  // changes (the undo buttons and the mode badge move with it).
  isOpen: () => boolean;
  onOpenChange: (cb: (open: boolean) => void) => void;
  // K92: true while a row's change runs before its release (a slider or a
  // color picker mid-drag): the design is not final yet.
  midDrag: () => boolean;
  // K92: the callbacks the panel was built with (an undo runs a live row's
  // effect as the row's own edit did).
  callbacks: PanelCallbacks;
  // K325: the credit line's "Made by Snoring Cat" link, for main.ts to hang
  // the snore on (ui/snore_link.ts).
  studioLink: HTMLAnchorElement;
}

interface ChangeEvent {
  last?: boolean;
  value: unknown;
}

// The slice of Tweakpane's blade API the helpers need.
interface RowApi {
  element: HTMLElement;
  hidden: boolean;
  // Tweakpane's own switch (K552: the title row off a daily).
  disabled?: boolean;
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
  // BELOW the menu button's row and the mode badge's (K92: the badge moves
  // there while the panel is open, making room for undo and redo beside the
  // menu button), inside the safe area (notches): --kp-top, set below.
  const wrap = pane.element.parentElement;
  const SCROLL_KEY = "knotmaze.panelScroll";
  if (wrap) {
    const top = "var(--kp-top)";
    wrap.style.top = top;
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
    // K541 (K339 Q4): the desktop panel widens 256 -> 320 px so the
    // word labels fit uncut; the phone sheet overrides this below.
    ".tp-dfwv{width:320px}" +
    ".tp-dfwv::-webkit-scrollbar{width:6px}" +
    ".tp-dfwv::-webkit-scrollbar-thumb{background:#3a4254;border-radius:3px}" +
    ".tp-dfwv::-webkit-scrollbar-track{background:transparent}" +
    ".kp-reset{cursor:pointer;opacity:0;margin-left:4px;font-size:11px;" +
    "line-height:1;display:inline-block;color:#8ea0c0;" +
    "transition:opacity .12s,color .12s}" +
    ".kp-row:hover .kp-reset{opacity:.45}" +
    ".kp-row.kp-mod .kp-reset{opacity:.9;color:#e7c56f}" +
    ".kp-row.kp-mod .tp-lblv_l{color:#e7c56f}" +
    // K111: a row an Accessibility switch is overriding keeps its stored
    // value, shown dimmed.
    ".kp-row.kp-overridden .tp-lblv_v{opacity:.4}" +
    ".kp-row.kp-overridden .tp-lblv_l{opacity:.6;font-style:italic}" +
    // K115 stage 5b: the cartouche word row greys while a cartouche
    // shape tenants the hole (display only; the builder's precedence
    // governs links that name both).
    ".kp-row.kp-greyed .tp-lblv_v{opacity:.4}" +
    ".kp-row.kp-greyed .tp-lblv_l{opacity:.6}" +
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
    // K340 look F (K339 call 3): a nested folder's bar loses its fill and
    // bold, takes lighter text and a 2px accent rule; while open its body
    // sits 6px in, in a dark well that deepens at depth 3 (the translucent
    // backgrounds stack). A closed subfolder keeps only the lighter bar.
    ".tp-fldv_c>.tp-fldv{margin-left:6px;background-color:rgba(0,0,0,.14);border-radius:0 3px 3px 0}" +
    ".tp-fldv_c>.tp-fldv>.tp-fldv_i{color:rgba(142,160,192,.55)}" +
    ".tp-fldv_c>.tp-fldv>.tp-fldv_i::before{width:2px}" +
    ".tp-fldv_c>.tp-fldv>.tp-fldv_b{background-color:transparent;font-weight:400;color:#b4c0d6;box-shadow:inset 2px 0 0 rgba(142,160,192,.55)}" +
    ".tp-fldv_c>.tp-fldv>.tp-fldv_b:hover{background-color:rgba(255,255,255,.05)}" +
    ".tp-fldv_c>.tp-fldv>.tp-fldv_b::before{border-top-color:rgba(142,160,192,.8)}" +
    ".tp-fldv_c>.tp-fldv:not(.tp-fldv-expanded){background-color:transparent}" +
    ".tp-fldv_c>.tp-fldv:not(.tp-fldv-expanded)>.tp-fldv_i::before{opacity:0}" +
    // Header: name left, the version de-emphasized in the corner; under
    // it the credit line (the studio link, the licenses link at the far end).
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
    // Far end of the line; the padding (cancelled by the negative margin)
    // widens the tap target of 10 px text without moving it.
    ".kp-credit a.kp-licenses{margin:-6px -4px -6px auto;padding:6px 4px;" +
    "opacity:.75;text-decoration:underline;text-underline-offset:2px}" +
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
    // K92: the panel's top. The menu button's row (42 px at max(10px, safe
    // area)) and 8 px, then the open panel's mode badge row (32 px; 42 on
    // touch, ui/mode_badge.ts) and 8 px.
    ":root{--kp-top:calc(max(10px,env(safe-area-inset-top)) + 90px)}" +
    // Touch screens: finger-sized rows and a wider panel.
    "@media (pointer:coarse){.tp-dfwv{width:min(320px,calc(100vw - 20px));" +
    "--tp-container-unit-size:30px;--tp-blade-value-width:150px}" +
    ":root{--kp-top:calc(max(10px,env(safe-area-inset-top)) + 100px)}" +
    ".kp-reset{opacity:.45;font-size:14px;padding:0 4px}}" +
    // K467 ROW HELP: a tap on a row's label opens the row's tooltip text in a
    // block INSIDE the row, under the label and the control (the row wraps
    // only while a block is open). Closed, a row is what it always was: the
    // block and the (i) mark are display:none, and the mark shows only where
    // there is no hover tooltip (touch screens, the sheet).
    ".kp-help{display:none;flex:0 0 100%;box-sizing:border-box;" +
    "margin:3px 0 5px;padding:6px 9px;border-radius:5px;" +
    "background:rgba(255,255,255,.06);color:#c8cad3;font-size:11px;" +
    "line-height:1.4;white-space:pre-line}" +
    ".kp-row.kp-help-open{flex-wrap:wrap}" +
    ".kp-row.kp-help-open>.kp-help{display:block}" +
    ".kp-i{display:none;box-sizing:border-box;width:11px;height:11px;" +
    "margin-left:5px;border:1px solid currentColor;border-radius:50%;" +
    "font:italic 600 8px/9px Georgia,serif;text-align:center;opacity:.5;" +
    "vertical-align:1px;pointer-events:none}" +
    ".kp-i::before{content:'i'}" +
    ".kp-row.kp-help-open .kp-i{opacity:.95;color:#8ea0c0}" +
    ".kp-has-help>.tp-lblv_l:focus-visible{outline:1px solid #8ea0c0;" +
    "outline-offset:-1px;border-radius:3px}" +
    "@media (pointer:coarse)," + SHEET_QUERY + "{" +
    ".kp-has-help .kp-i{display:inline-block}" +
    ".kp-has-help>.tp-lblv_l{cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent}}" +
    // K552: a disabled row that must still explain itself (Title thread off
    // a daily). Tweakpane's disabled rule puts pointer-events:none on the
    // whole row, which hides its tooltip and its label-tap help, so the row
    // takes them back. Its control stays inert: the checkbox view carries
    // its own tp-v-disabled (Tweakpane's rule still applies to it), the
    // input is disabled, and the value cell is made inert here as well.
    ".tp-rotv .kp-tip-when-disabled.tp-v-disabled{pointer-events:auto}" +
    ".tp-rotv .kp-tip-when-disabled.tp-v-disabled>.tp-lblv_v" +
    "{pointer-events:none}" +
    // The top bar's strip behind the sheet's buttons (shown only by the
    // sheet, below).
    ".kp-bar{display:none;position:fixed;z-index:29;top:0;left:0;right:0;" +
    "height:var(--kp-top);background:#28292e;" +
    "box-shadow:0 1px 0 rgba(255,255,255,.07)}" +
    // K468 THE SHEET: on a phone the open panel fills the screen (Tweakpane's
    // fixed wrapper, whose top, right and max-height are inline for the side
    // panel, hence the !important), opaque and scrolling inside itself, below
    // a top bar of the close button, undo and redo and the mode badge. The
    // value column takes a share of the width. LAST, so its --kp-top beats
    // the touch rule's.
    "@media " + SHEET_QUERY + "{" +
    ":root{--kp-top:calc(max(10px,env(safe-area-inset-top)) + 52px)}" +
    // Tweakpane's wrapper is position:absolute; fixed with an explicit
    // height, so a phone's moving URL bar cannot misplace the sheet.
    ".tp-dfwv{box-sizing:border-box;position:fixed;z-index:28;left:0;" +
    "right:0!important;width:auto!important;" +
    "height:calc(100vh - var(--kp-top));height:calc(100dvh - var(--kp-top));" +
    "max-height:none!important;" +
    "padding:0 max(10px,env(safe-area-inset-right)) " +
    "max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));" +
    "background:#28292e;--tp-container-unit-size:32px;" +
    "--tp-blade-value-width:min(50%,440px)}" +
    ".tp-rotv{border-radius:0;box-shadow:none;font-size:" + SHEET_FONT_PX + "px}" +
    ".kp-head{font-size:" + SHEET_FONT_PX + "px}" +
    ".kp-help{font-size:" + SHEET_FONT_PX + "px}" +
    ".kp-open .kp-bar{display:block}" +
    // THE PEEK: while a row is dragged on the sheet, everything but that row
    // is invisible (visibility, so the row shows inside its hidden parents)
    // and the sheet clears, to watch the design change; it returns on
    // release.
    ".kp-peek .tp-dfwv,.kp-peek .tp-rotv{background:transparent!important;" +
    "scrollbar-color:transparent transparent}" +
    ".kp-peek .tp-dfwv *{visibility:hidden}" +
    ".kp-peek .tp-dfwv .kp-peeking,.kp-peek .tp-dfwv .kp-peeking *" +
    "{visibility:visible}" +
    ".kp-peek .kp-peeking{background:rgba(40,41,46,.9);border-radius:6px}" +
    ".kp-peek .kp-menu,.kp-peek .kp-bar,.kp-peek .km-undo,.kp-peek .km-mode" +
    "{visibility:hidden}}";
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
  // K92: set while a row's effects run for a change before its release
  // (`last === false`: a slider or a color picker mid-drag).
  let dragging = false;
  // K793: the search box (built once every row exists), and the flag that
  // keeps its own folder opening and closing out of the saved folds.
  let searchUi: PanelSearchUi | null = null;
  let searchMutesFolds = false;

  // K468: whether the layout is the phone's full-screen sheet right now.
  const sheetMQ = window.matchMedia(SHEET_QUERY);
  const sheetNow = (): boolean => sheetMQ.matches;
  // K482: row help is on only for a coarse pointer or the sheet (K483's
  // font and this share SHEET_QUERY); the desktop keeps its title tooltip.
  const coarseMQ = window.matchMedia("(pointer: coarse)");
  const helpWanted = (): boolean => helpEnabled(coarseMQ.matches, sheetNow());

  // K467 ROW HELP: a tap on a row's label opens the row's tooltip text in a
  // block inside that row. One block at a time. The text is the row's
  // `title`, read when the block opens and again when markOverridden changes
  // it: one source (OVERRIDDEN_NOTE rides along), never a copy.
  interface HelpRow {
    row: HTMLElement;
    label: HTMLElement;
    block: HTMLElement;
  }
  let helpOpen: HelpRow | null = null;
  let helpSeq = 0;
  const helpRows: HelpRow[] = [];
  const closeHelp = (): void => {
    const h = helpOpen;
    if (!h) return;
    helpOpen = null;
    h.row.classList.remove("kp-help-open");
    h.label.setAttribute("aria-expanded", "false");
  };
  const openHelp = (h: HelpRow): void => {
    closeHelp();
    helpOpen = h;
    h.block.textContent = h.row.title;
    h.row.classList.add("kp-help-open");
    h.label.setAttribute("aria-expanded", "true");
  };
  // The open block's text follows its row's title (markOverridden).
  const syncHelpText = (): void => {
    if (helpOpen && helpOpen.block.textContent !== helpOpen.row.title) {
      helpOpen.block.textContent = helpOpen.row.title;
    }
  };
  // A block goes with its row: hidden by refreshCond, or inside a folder that
  // is (or just got) collapsed. Read from the classes, not the layout (a
  // closed panel has none).
  const closeHelpIfHidden = (): void => {
    const h = helpOpen;
    if (!h) return;
    // K793: a row the search hides counts as hidden.
    let gone = h.row.closest(".tp-v-hidden, .kp-sx-out") !== null;
    for (
      let f = h.row.parentElement?.closest(".tp-fldv") ?? null;
      !gone && f;
      f = f.parentElement?.closest(".tp-fldv") ?? null
    ) {
      if (!f.classList.contains("tp-fldv-expanded")) gone = true;
    }
    if (gone) closeHelp();
  };
  // K482: the label is a button only while help is wanted. Off (fine-pointer
  // side panel) it carries no role or Tab stop and a click keeps its native
  // behaviour (the title tooltip); on, it is focusable with aria state. The
  // (i) mark and the block stay in the DOM (display:none off the sheet), so
  // a live resize or rotation switches help with the layout.
  const applyHelpGate = (h: HelpRow): void => {
    if (helpWanted()) {
      h.label.setAttribute("role", "button");
      h.label.tabIndex = 0;
      h.label.setAttribute("aria-expanded", helpOpen === h ? "true" : "false");
      h.label.setAttribute("aria-controls", h.block.id);
    } else {
      if (helpOpen === h) closeHelp();
      h.label.removeAttribute("role");
      h.label.removeAttribute("tabindex");
      h.label.removeAttribute("aria-expanded");
      h.label.removeAttribute("aria-controls");
    }
  };
  const syncHelpGate = (): void => {
    if (!helpWanted()) closeHelp();
    for (const h of helpRows) applyHelpGate(h);
  };
  sheetMQ.addEventListener("change", syncHelpGate);
  coarseMQ.addEventListener("change", syncHelpGate);
  const wireHelp = (
    rowEl: HTMLElement,
    label: HTMLElement,
    glyph: Node | null
  ): void => {
    const id = `kp-help-${++helpSeq}`;
    const block = document.createElement("div");
    block.className = "kp-help";
    block.id = id;
    rowEl.appendChild(block);
    const mark = document.createElement("span");
    mark.className = "kp-i";
    mark.setAttribute("aria-hidden", "true");
    // The "i" is CSS (.kp-i::before), so the label's text stays the label's.
    label.insertBefore(mark, glyph);
    rowEl.classList.add("kp-has-help");
    const h: HelpRow = { row: rowEl, label, block };
    helpRows.push(h);
    applyHelpGate(h);
    const toggle = (): void => {
      if (helpOpen === h) closeHelp();
      else openHelp(h);
    };
    label.addEventListener("click", (e) => {
      // K482: off the sheet with a fine pointer the label is not a help
      // button at all (its title tooltip is the help).
      if (!helpWanted()) return;
      // The reset glyph has its own pointerdown; never open help for it.
      if ((e.target as Element | null)?.closest(".kp-reset")) return;
      // Never a toggle of the row's control (a checkbox row's label).
      e.preventDefault();
      toggle();
    });
    label.addEventListener("keydown", (e) => {
      if (!helpWanted()) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      toggle();
    });
  };

  // K468 THE PEEK: while a row is dragged on the sheet, everything but that
  // row turns invisible and the sheet clears (CSS, keyed on `kp-peek` on the
  // root and `kp-peeking` on the row), so the design shows live behind it.
  // It starts on the drag's SECOND change (a tap that only sets a value
  // would flash the sheet away) and ends on release: the row's last change,
  // or any pointer end on the window.
  let peekRow: HTMLElement | null = null;
  let peekMoves = 0;
  const setPeek = (el: HTMLElement | null): void => {
    if (peekRow === el) return;
    peekRow?.classList.remove("kp-peeking");
    peekRow = el;
    el?.classList.add("kp-peeking");
    document.documentElement.classList.toggle("kp-peek", el !== null);
  };
  const endPeek = (): void => {
    peekMoves = 0;
    setPeek(null);
  };
  for (const type of ["pointerup", "pointercancel", "touchend", "touchcancel", "mouseup"]) {
    window.addEventListener(type, endPeek, true);
  }
  window.addEventListener("blur", endPeek);
  for (const type of ["pointerdown", "touchstart", "mousedown"]) {
    window.addEventListener(type, () => (peekMoves = 0), true);
  }

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
        // K552: a disabled row keeps its value, the reset glyph included.
        if (api.disabled === true) return;
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
      // K467: a row with a tooltip has help under its label (before the
      // reset glyph, which keeps its own tap).
      if (tipText && label instanceof HTMLElement) wireHelp(api.element, label, btn);
    }
    api.on("change", (ev) => {
      fired = true;
      markRow(t);
      if (syncing) return;
      dragging = ev.last === false;
      // K468: the peek follows a drag on the sheet (see setPeek).
      if (dragging && sheetNow() && open) {
        if (++peekMoves >= 2) setPeek(api.element);
      } else if (peekRow === api.element) {
        endPeek();
      }
      try {
        after(ev);
      } finally {
        dragging = false;
      }
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
  // K795: the Clock rows' view (the gridAlign pattern; K323 question 2:
  // the "Real time" checkbox became a Clock list once K114's beat landed).
  // Two rows, since a row's options are fixed: the minotaur reads all
  // three clocks, classic and the burn race turns and beat only (clockOf
  // plays a stored realtime there on turns). Both show `clock` and write
  // it; `clockViewOf` derives both keys from it alone, so a game mode
  // change needs no resync.
  const clockViewOf = (): { mino: string; plain: string } => ({
    mino: params.clock,
    plain: params.clock === "beat" ? "beat" : "turn",
  });
  const clockView: Record<string, unknown> = { ...clockViewOf() };

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
  const saveFolds = (): void => {
    try {
      localStorage.setItem(FOLD_KEY, JSON.stringify(folds));
    } catch {
      // Storage unavailable: folds just don't persist.
    }
  };
  // `inside`: a subfolder of that folder (titles stay unique: they key the
  // persisted folds).
  const folder = (
    title: string,
    defaultExpanded: boolean,
    inside?: Parent
  ): Parent & { hidden: boolean } => {
    const host = (inside ?? pane) as unknown as {
      addFolder: (opts: { title: string; expanded: boolean }) => unknown;
    };
    const f = host.addFolder({
      title,
      expanded: folds[title] ?? defaultExpanded,
    }) as unknown as Parent & { hidden: boolean } & {
      on: (ev: "fold", cb: (e: { expanded: boolean }) => void) => unknown;
    };
    f.on("fold", (e) => {
      // K793: the search opens and closes folders for its results without
      // saving them; a fold the player makes during a search is kept when
      // it clears.
      if (!searchMutesFolds) {
        folds[title] = e.expanded;
        saveFolds();
        searchUi?.playerFold(title);
      }
      // K467: a help block goes with its folder (read after the class flips).
      queueMicrotask(closeHelpIfHidden);
    });
    return f;
  };
  const regenerateWhenDone = (ev?: ChangeEvent): void => {
    if (!ev || ev.last !== false) callbacks.onRegenerate();
  };

  // --- Accessibility (K111) -----------------------------------------------
  // Two master switches at the top. While one is on it OVERRIDES every
  // setting relevant to it; off, the viewer's own values are back (an
  // override is a view over the stored params, never a write). Viewer
  // preferences like the Motion setting: no link, no daily, no undo
  // (ui/accessibility.ts holds the override lists).
  const fAccess = folder("Accessibility", true);
  const reducedMotionRow = row(
    fAccess, s, "reducedMotion", { label: "Reduced motion" },
    "Master switch: stills what the Motion setting covers (backdrop drift, plucks, the camera's ease to an edge marker, the loading knot, mode badge and edge markers) AND the maze's flow undulation (flowStrength and flowSpeed keep your values and come back when it is off). The intro animation and the pulses beside the player keep playing. Shows what is in force: it follows your device's reduce-motion setting until you choose (the Motion row below holds the detailed choice, including follow system). Remembered per browser.",
    SETTINGS_DEFAULTS.reducedMotion,
    () => callbacks.onReducedMotionToggle(settings.reducedMotion === true)
  );
  const highContrastRow = row(
    fAccess, s, "highContrast", { label: "High contrast" },
    "Master switch. While on it overrides, and dims, these rows (your values come back when it is off): background = none and a black page (no texture behind or through the crossings), palette = pastel (the lightest threads), pathColor = yellow, fadeLength = 0 (crossings cut crisp), gap at least 0.12 (a wider dark line between over and under threads), markerSize at least 1.5. Follows your device's high-contrast setting (prefers-contrast: more, forced colors) until you choose. Remembered per browser.",
    SETTINGS_DEFAULTS.highContrast,
    () => callbacks.onHighContrastToggle(settings.highContrast === true)
  );

  // --- Design -------------------------------------------------------------
  const fDesign = folder("Design", true);
  // K541: every top-level folder is created here, in display order, so a
  // row can be created wherever its code lives and still land in its folder.
  const fGame = folder("Game", true);
  const fMaze = folder("Maze", true);
  const fPath = folder("Path & view", true);
  const fLook = folder("Look", true);
  const fMotion = folder("Motion & intro", false);
  const fFeel = folder("Touch & feel", false);
  const fSound = folder("Sound", false);
  const fPhysics = folder("Physics", false);
  const fDeveloper = folder("Developer", false);
  row(
    fDesign, p, "gridSize", { min: 4, max: 24, step: 1, label: "Grid size" },
    "Lattice size. Bigger = a larger, denser knot with more threads. Regenerates the design.",
    D.gridSize, regenerateWhenDone
  );
  row(
    fDesign, p, "shape",
    {
      label: "Maze shape",
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
    fMaze, p, "startAnchor", { ...ANCHOR_OPTS, label: "Entrance side" },
    "Which side of the shape hosts the maze ENTRANCE (compass point). Regenerates the maze.",
    D.startAnchor, regenerateWhenDone
  );
  const exitAnchorRow = row(
    fMaze, p, "exitAnchor", { ...ANCHOR_OPTS, label: "Exit side" },
    "Which side of the shape hosts the maze EXIT (compass point). Regenerates the maze.",
    D.exitAnchor, regenerateWhenDone
  );
  row(
    fDesign, p, "weaveDensity", { min: 0, max: 1, step: 0.05, label: "Weave density" },
    "How much of the lattice fills with woven thread. Low = sparse open tangle, high = tight fabric. Regenerates the design.",
    D.weaveDensity, regenerateWhenDone
  );
  row(
    fDesign, p, "turnBias", { min: 0, max: 1, step: 0.05, label: "Turn bias" },
    "How often growing threads turn instead of running straight. Low = long runs, high = curly meanders. Regenerates the design.",
    D.turnBias, regenerateWhenDone
  );
  row(
    fDesign, p, "text", { label: "Text" },
    "Cursive text design: type words to build them as pinned knotwork text instead of the lattice maze. Empty = the usual design. Regenerates the design.",
    D.text, regenerateWhenDone
  );
  const cartoucheRow = row(
    fDesign, p, "cartouche", { label: "Cartouche" },
    "In-maze cartouche: a word inside the maze, in a stamped hole with a thread frame; walking it counts like any maze run (4-5 letters fit at grid 18). Empty = no cartouche. Regenerates the design.",
    D.cartouche, regenerateWhenDone
  );
  row(
    fDesign, p, "emblem",
    {
      label: "Emblem",
      options: { none: "", star: "star", trefoil: "trefoil", triquetra: "triquetra", solomon: "solomon", wreath: "wreath" },
    },
    "Standalone emblem: a predefined knot shape shown alone instead of the lattice maze. None = the usual design. Regenerates the design.",
    D.emblem, regenerateWhenDone
  );
  row(
    fDesign, p, "cartoucheShape",
    {
      label: "Cartouche shape",
      options: { none: "", star: "star", trefoil: "trefoil", triquetra: "triquetra", solomon: "solomon", wreath: "wreath" },
    },
    "Cartouche shape: a predefined knot emblem floating as a decorative island inside the cartouche hole (found visually, never walked or counted). Wins the hole over the Cartouche word. None = the word (or no cartouche). Regenerates the design.",
    D.cartoucheShape, regenerateWhenDone
  );
  // K558: which stroke of a cursive crossing lies on top (text, title and
  // cartouche words). Off = pen order, the later stroke over.
  row(
    fDesign, p, "penReverse", { label: "Earlier stroke on top" },
    "Cursive text crossings: each stroke passes over the strokes drawn before it, as a pen draws (a t's bar over its stem, an l's downstroke over its upstroke). Check to reverse it, so the earlier stroke lies on top. Applies to the Text, the daily's title and the Cartouche word. Regenerates the design.",
    D.penReverse, regenerateWhenDone
  );
  // SEED ROW: the design's seed as the link's base-36 token (?<seed>...).
  // Typing a seed (or any word - it hashes to one) and pressing Enter loads
  // that design; the dice button in the row rolls a random one. The row
  // always re-shows the canonical token, so a hashed word shows its seed.
  const seedView = { seed: seedText(params.seed) };
  const seedApi = fDesign.addBinding(seedView, "seed" as never, { label: "Seed" } as Record<string, unknown>) as RowApi;
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
  // K793: its search id, kept while main.ts adds the day to the title.
  dailyApi.element.dataset.kpId = "btn:Daily";
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

  // --- Game (K323 Stage A) ------------------------------------------------
  // After Design, before Maze, expanded (K323 question 1). Every row is a
  // design row (none daily-exempt); the exploration rows sit right under
  // Game mode (question 3, sooner than K323 proposed, per K339).
  const gameModeRow = row(
    fGame, p, "gameMode",
    { options: { Classic: "classic", Minotaur: "minotaur", "Burn race": "burn" }, label: "Game mode" },
    "Game mode: Classic = the plain maze. Minotaur = a minotaur hunts you (on turns, a beat or real time: the Clock row below). Burn race = a fuse burns the maze behind you. Restarts the solve.",
    D.gameMode, () => callbacks.onClockChange()
  );
  void gameModeRow;

  // --- Maze ---------------------------------------------------------------
  // (The mazeFabric switch left the panel in K323 Stage A: the codec
  // entry is gone and the field stays on until K326 deletes knot mode.)
  // K795: the Clock rows over `clock` (clockView above): the minotaur's
  // offers real time too; classic's and the burn race's turns and beat.
  // Each writes `clock`, re-shows the other row under the `syncing` guard
  // (a refresh fires change handlers) and restarts the solve.
  const BEAT_CLOCK_TIP =
    "Beat: you ride a beat. The dot never stops: it reaches each junction on a beat and takes the run you tapped last (no tap: straight on; a dead end turns it back). The pause button hides the maze. No undo.";
  const setClock = (clock: string, other: () => RowApi): void => {
    params.clock = clock as UrlParams["clock"];
    Object.assign(clockView, clockViewOf());
    syncing = true;
    try {
      other().refresh?.();
    } finally {
      syncing = false;
    }
    callbacks.onClockChange();
  };
  const clockMinoRow: RowApi = row(
    fGame, clockView, "mino",
    { options: { Turns: "turn", Beat: "beat", "Real time": "realtime" }, label: "Clock" },
    `Turns: the maze waits for each move, and the minotaur moves after yours. ${BEAT_CLOCK_TIP} The minotaur moves once per run you ride. Real time: you run the threads at your own pace while the minotaur roams them from the finish; it hunts you once you come close, and a catch sends you back to the entrance (counted in the stats). No undo. Restarts the solve.`,
    "turn", () => setClock(String(clockView.mino), () => clockPlainRow)
  );
  const clockPlainRow: RowApi = row(
    fGame, clockView, "plain",
    { options: { Turns: "turn", Beat: "beat" }, label: "Clock" },
    `Turns: the maze waits for each move. ${BEAT_CLOCK_TIP} No cut either, and in the burn race the fire burns once per run you ride, at its turn speed. Restarts the solve.`,
    "turn", () => setClock(String(clockView.plain), () => clockMinoRow)
  );
  // K795: the beat rider's tuning (K114; BeatSettings), shown only while
  // the design plays the beat. Each restarts the solve, as the fire
  // clock's rows do (undo_stack.ts lists them under onClockChange). Tempo
  // and cap are whole numbers (beatSettingsOf rounds them); the length
  // takes no step (K130) and an edit keeps the 0.05 grid.
  const beatTempoRow = row(
    fGame, p, "beatTempo", { min: 40, max: 180, step: 1, label: "Beat tempo (bpm)" },
    "Beat: beats a minute. The dot reaches a junction on every beat and plucks its next run's note as it leaves, so a faster tempo leaves less time to tap your next run (100 is 0.6 s a beat). Restarts the solve.",
    D.beatTempo, () => callbacks.onClockChange()
  );
  const beatLengthRow = row(
    fGame, p, "beatLength",
    { min: 0.5, max: 8, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label: "Beat length (units)" },
    "Beat: how much thread the dot rides in one beat, in lattice units (a run is about 4). A run takes its length divided by this in beats, rounded: at least one and at most Max beats per run. Smaller rides long runs in more beats, larger in fewer. Restarts the solve.",
    D.beatLength, () => {
      params.beatLength = Math.round(params.beatLength * 20) / 20;
      callbacks.onClockChange();
    }
  );
  const beatCapRow = row(
    fGame, p, "beatCap", { min: 1, max: 8, step: 1, label: "Max beats per run" },
    "Beat: the most beats one run takes, however long it is, so a long run never crawls past this. 1 rides every run in one beat. Restarts the solve.",
    D.beatCap, () => callbacks.onClockChange()
  );
  const playerPaceRow = row(
    fGame, p, "playerPace", { min: 2, max: 30, step: 0.5, label: "Your speed (units/s)" },
    "Your speed in real time, along the threads, in lattice units per second. Applies live.",
    D.playerPace, () => callbacks.onChaseChange()
  );
  const deadEndDensityRow = row(
    fMaze, p, "deadEndDensity", { min: 0, max: 1, step: 0.05, label: "Dead-end density" },
    "Fraction of eligible loops cut into dead-end threads (long threads that end in a loose tip). 0 = a pure braided maze where every wrong turn loops back; 1 = maximally tree-like. Regenerates the maze.",
    D.deadEndDensity, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const deadEndLengthRow = row(
    fMaze, p, "deadEndLength", { min: 0, max: 40, step: 1, label: "Dead-end length" },
    "How far each dead end runs before it ends (half lattice cells of thread with no junction on it): longer tails take longer to find out. 0 = the older placement, spread out and mostly short. Regenerates the maze.",
    D.deadEndLength, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const hCutShareRow = row(
    fMaze, p, "hCutShare", { min: 0, max: 1, step: 0.05, label: "Fused arm cuts" },
    "Fused arm cuts (H1): the share of bridges between two neighbouring threads replaced by one smooth junction, so the bridge's two junctions become one. 0 = off, every bridge kept. Regenerates the maze.",
    D.hCutShare, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const exitCorridorRow = row(
    fMaze, p, "exitCorridor", { min: 0, max: 32, step: 1, label: "Exit corridor" },
    "Trap-zone finish: how much of the exit thread (half lattice cells of arc from the exit) carries no choice junction, so threads near the finish are near misses that do not lead in. 0 = off. Regenerates the maze.",
    D.exitCorridor, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const exitFlankRow = row(
    fMaze, p, "exitFlank",
    {
      label: "Exit flank kept", options: { stub: "stub", away: "away", near: "near" } },
    "Which side of the exit cut keeps the tail: stub = the shorter stub is trimmed (the older rule); away = the flank that wanders farthest from the exit is kept; near = the other. Regenerates the maze.",
    D.exitFlank, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const exitTaperRadiusRow = row(
    fMaze, p, "exitTaperRadius", { min: 0, max: 32, step: 1, label: "Exit taper radius" },
    "Exit taper: within this radius of the exit (half lattice cells), choice junctions space out further (the strength sets how much). 0 = off. Regenerates the maze.",
    D.exitTaperRadius, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const exitTaperStrengthRow = row(
    fMaze, p, "exitTaperStrength", { min: 0, max: 2, step: 0.1, label: "Taper strength" },
    "How much wider the junction spacing grows at the exit under the taper. 0 = off. Regenerates the maze.",
    D.exitTaperStrength, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const greedyTrapRow = row(
    fMaze, p, "greedyTrap",
    { options: { off: "off", on: "on" }, label: "Greedy trap" },
    "Greedy-trap search: after the maze is planned, delete choice junctions near the exit that let a player who heads straight for the exit through, until both naive walkers take long enough (the targets beside it). Off = today's maze. Regenerates the maze.",
    D.greedyTrap, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapTargetFRow = row(
    fMaze, p, "trapTargetF", { min: 1, max: 6, step: 0.1, label: "Trap far target" },
    "How long the far-end greedy walk must get (x the shortest route) before the search stops cutting. Regenerates the maze.",
    D.trapTargetF, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapTargetHRow = row(
    fMaze, p, "trapTargetH", { min: 1, max: 8, step: 0.1, label: "Trap heading target" },
    "How long the heading greedy walk must get (x the shortest route) before the search stops cutting. Regenerates the maze.",
    D.trapTargetH, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapMaxFRow = row(
    fMaze, p, "trapMaxF", { min: 2, max: 12, step: 0.5, label: "Trap far cap" },
    "No trap may push the far-end greedy walk past this (x the shortest route). Regenerates the maze.",
    D.trapMaxF, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapMaxHRow = row(
    fMaze, p, "trapMaxH", { min: 2, max: 16, step: 0.5, label: "Trap heading cap" },
    "No trap may push the heading greedy walk past this (x the shortest route). Regenerates the maze.",
    D.trapMaxH, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapMaxGrowRow = row(
    fMaze, p, "trapMaxGrow", { min: 1, max: 1.5, step: 0.05, label: "Trap route growth" },
    "How much longer the shortest route may grow while trapping (x its original length). Regenerates the maze.",
    D.trapMaxGrow, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapRadiusRow = row(
    fMaze, p, "trapRadius", { min: 0, max: 40, step: 1, label: "Trap radius" },
    "Only junctions within this distance of the exit (half lattice cells) may be cut as traps. Regenerates the maze.",
    D.trapRadius, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapItersRow = row(
    fMaze, p, "trapIters", { min: 0, max: 24, step: 1, label: "Trap cuts" },
    "At most this many junctions the search may delete. Regenerates the maze.",
    D.trapIters, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapTriesRow = row(
    fMaze, p, "trapTries", { min: 1, max: 16, step: 1, label: "Trap tries" },
    "Trial deletions tried per round before the search gives up on that round. Regenerates the maze.",
    D.trapTries, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const trapSurplusRow = row(
    fMaze, p, "trapSurplus", { min: 1, max: 2, step: 0.05, label: "Trap surplus" },
    "Banked difficulty the search may not spend: a walker over its target may not drop below it, nor below this x its target. Regenerates the maze.",
    D.trapSurplus, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const branchDensityRow = row(
    fMaze, p, "branchDensity", { min: 0, max: 1, step: 0.05, label: "Branch density" },
    "How many extra choice junctions the maze adds beyond the minimum needed to connect everything. Regenerates the maze.",
    D.branchDensity, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const fourWayRow = row(
    fMaze, p, "fourWayFraction", { min: 0, max: 1, step: 0.05, label: "Four-way share" },
    "Share of junctions realized as 4-way crossings instead of 3-way splits. Regenerates the maze.",
    D.fourWayFraction, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const junctionSpacingRow = row(
    fMaze, p, "junctionSpacing", { min: 0.5, max: 8, step: 0.25, label: "Junction spacing" },
    "Minimum distance between junctions (half lattice cells): higher spreads the choices out, so fewer fit. Regenerates the maze.",
    D.junctionSpacing, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const entranceClearanceRow = row(
    fMaze, p, "entranceClearance", { min: 0, max: 12, step: 0.5, label: "Entrance clearance" },
    "Junction-free radius around the entrance (half lattice cells): the first stretch is a single path. Regenerates the maze.",
    D.entranceClearance, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  const exitClearanceRow = row(
    fMaze, p, "exitClearance", { min: 0, max: 20, step: 0.5, label: "Exit clearance" },
    "Junction-free radius around the exit (half lattice cells), so the endgame isn't cluttered with choices. Regenerates the maze.",
    D.exitClearance, (ev) => { if (!ev || ev.last !== false) callbacks.onModeChange(); }
  );
  // LABELS AND VALUES DIFFER ON PURPOSE (K73, Levi 2026-10-12: "rename
  // 'gold' to 'fullPath', and 'trail' to 'recentPath'"). Only the shown
  // labels changed: the values stay gold / trail / string, because links
  // store the option's index in the codec's list (param_codec.ts), `pv=`
  // overrides name the values, and the daily records keep the value a
  // result ended in.
  const pathVizRow = row(
    fPath, p, "pathViz",
    { options: { fullPath: "gold", recentPath: "trail", string: "string" }, label: "Path display" },
    "How your route is shown: fullPath = your whole traveled route stays recolored; recentPath = memory mode: only the last stretch of your route stays lit (trailLength sets how much) and there is no backtracking; string = unroll a thin white yarn behind you - it U-turns at junctions when you backtrack and is never picked up. Applies live.",
    D.pathViz, () => callbacks.onTrailChange()
  );
  const cameraRow = row(
    fPath, p, "cameraMode",
    { options: { fit: "fit", follow: "follow" }, label: "Camera" },
    "Camera: fit = frame the whole maze (under fog: just what you can see); follow = chase your position. Pinch, scroll or drag to zoom and pan in either - in follow mode a gentle pull brings the view back after a moment. Double-click / double-tap empty space to reset the view. Applies live.",
    D.cameraMode, () => callbacks.onTrailChange()
  );
  // Max 30 since the default went 5 -> 10 (codec v4): the slider keeps
  // its old headroom of three times the default.
  const trailLenRow = row(
    fPath, p, "trailLength", { min: 1, max: 30, step: 0.5, label: "Recent path length" },
    "How much of your recent path stays lit in recentPath mode, in lattice units. Applies live.",
    D.trailLength, () => callbacks.onTrailChange()
  );
  const tensionRow = row(
    fPath, p, "tension", { min: 0, max: 1, step: 0.05, label: "String tension" },
    "Ariadne string tension: 1 lays the yarn taut along the thread, 0 leaves it loose and wavy like slack cotton. Applies live.",
    D.tension, () => callbacks.onTrailChange()
  );
  // K76 stage 2c: the fog of war's checkbox became the exploration mode.
  const fowRow = row(
    fGame, p, "exploration",
    { options: { off: "off", "fog of war": "fog", "thread reveal": "threads" }, label: "Exploration" },
    "How much of the maze you see. off: all of it. fog of war: the maze hides until you have explored close by; explored areas stay visible. thread reveal: only the threads you have walked show, and the arms of the junctions you have reached, fading out a little way along. Applies live.",
    D.exploration, () => callbacks.onTrailChange()
  );
  const fowRadiusRow = row(
    fGame, p, "fowRadius", { min: 1.5, max: 10, step: 0.25, label: "Fog radius" },
    "How far around your explored path the fog lifts, in lattice units. Applies live and reshapes everything already explored.",
    D.fowRadius, () => callbacks.onTrailChange()
  );
  const fowIntroRow = row(
    fGame, p, "fowIntro", { label: "Intro in the open" },
    "Play the intro appearance animation in the open, then hide what you have not explored: the fog closes in around you (it fades in while its reveal radius contracts), or the threads you have not seen withdraw toward you. Applies to the next intro.",
    D.fowIntro, () => callbacks.onTrailChange()
  );
  // K76 stage 2c: the thread reveal's reach, its fade and its end look.
  const revealDistanceRow = row(
    fGame, p, "revealDistance", { min: 1, max: 12, step: 0.25, label: "Reveal distance" },
    "How far the arms of the junctions you have reached show, in lattice units; the last part fades out. Applies live.",
    D.revealDistance, () => callbacks.onTrailChange()
  );
  const revealFadeRow = row(
    fGame, p, "revealFade", { min: 0.35, max: 4, step: 0.05, label: "Reveal fade" },
    "How long that fade-out is, in lattice units (never longer than the reveal distance). Applies live.",
    D.revealFade, () => callbacks.onTrailChange()
  );
  const revealLookRow = row(
    fGame, p, "revealLook",
    {
      options: { fade: "fade", halo: "halo", glow: "glow", dots: "dots", fray: "fray", beacon: "beacon" },
      label: "Reveal end",
    },
    "How a thread you have not explored ends: fade (it just fades out), halo (a soft light where it fades), glow (the fade glows), dots (it breaks into dots), fray (it frays into fibers) or beacon (dots and the halo). Applies live.",
    D.revealLook, () => callbacks.onTrailChange()
  );
  // K466 THE ENDS (Levi, 2026-10-15: "emphasize the unexplored thread ends
  // a bit more, maybe especially for ends that lie under a crossing").
  const revealEndCrossRow = row(
    fGame, p, "revealEndCross",
    { options: { under: "under", past: "past", back: "back" }, label: "End at crossing" },
    "Where a thread you have not explored ends when its end would lie under a crossing, hidden by the thread on top: under (it stays there), past (it shows a little further, beyond the crossing) or back (it ends before the crossing). Applies live.",
    D.revealEndCross, () => callbacks.onTrailChange()
  );
  const revealEndGlowRow = row(
    fGame, p, "revealEndGlow",
    { options: { soft: "soft", bright: "bright" }, label: "End glow" },
    "How strongly the light at the end of a thread you have not explored shows (the halo and beacon ends): soft or bright (larger and brighter). Applies live.",
    D.revealEndGlow, () => callbacks.onTrailChange()
  );
  // K465: the finish shows from the start (Levi, 2026-10-15).
  const revealFinishRow = row(
    fGame, p, "revealFinish", { label: "Show finish" },
    "Show where the finish is from the start: its marker, the gap around it and the arrow at the screen edge while it is off screen, even over thread you have not explored. Off hides the finish until you have seen it. Applies live.",
    D.revealFinish, () => callbacks.onTrailChange()
  );
  const moveSpeedRow = row(
    fGame, p, "moveSpeed", { min: 0.25, max: 4, step: 0.05, label: "Travel speed" },
    "Maze travel speed: how fast the dot and the gold front move along the thread. Applies live.",
    D.moveSpeed, () => callbacks.onSlackChange()
  );
  const pulseSpacingRow = row(
    fPath, p, "pulseSpacing", { min: 0.8, max: 6, step: 0.1, label: "Pulse spacing" },
    "Distance between traveling pulses on the current junction's arms. Applies live.",
    D.pulseSpacing, () => callbacks.onSlackChange()
  );
  const pulseReachRow = row(
    fPath, p, "pulseReach", { min: 0.5, max: 15, step: 0.25, label: "Pulse reach" },
    "How far the current junction's pulses, and the hover highlight on a choice, reach along each arm, in lattice units, before fading out. Applies live.",
    D.pulseReach, () => callbacks.onTrailChange()
  );
  // K145: the subtle glow on the run under the pointer (a choice too since
  // K298, over its own hover look), with its personal settings under it.
  const fHover = folder("Hover glow", false, fPath);
  const hoverGlowRow = row(
    fHover, p, "hoverGlow", { min: 0, max: 1, step: 0.05, label: "Hover glow" },
    "Hover glow: the run under the pointer (or under a touch press) glows softly along both edges near it, fading toward its junctions; on one of your choices it adds to the choice's own highlight. 0 turns it off. Applies live.",
    D.hoverGlow, () => callbacks.onTrailChange()
  );
  // K298: its own length (pulseReach's until K298) and its end fade.
  const hoverGlowLengthRow = row(
    fHover, p, "hoverGlowLength",
    { min: HOVER_GLOW_LENGTH_MIN, max: HOVER_GLOW_LENGTH_MAX, step: 0.25, label: "Hover glow length" },
    "Hover glow length: how far the hover glow reaches along the thread from the pointer, in lattice units, before it has faded out. Applies live.",
    D.hoverGlowLength, () => callbacks.onTrailChange()
  );
  const hoverGlowFadeRow = row(
    fHover, p, "hoverGlowFade",
    { min: 0, max: HOVER_GLOW_FADE_MAX, step: 0.05, label: "Hover glow end fade" },
    "Hover glow end fade: how long the hover glow takes to fade in past each end of the run, where the junctions cover it, in lattice units (0 = a hard edge). Applies live.",
    D.hoverGlowFade, () => callbacks.onTrailChange()
  );
  // K111 stage 4 (K264): that glow's thickness, a personal setting like it
  // (the param keeps its name, hoverGlowWidth, and its link key, hgw).
  const hoverGlowWidthRow = row(
    fHover, p, "hoverGlowWidth",
    { min: HOVER_GLOW_WIDTH_MIN, max: HOVER_GLOW_WIDTH_MAX, step: 0.05, label: "Hover glow thickness" },
    "Hover glow thickness: how far in from each edge of the thread the hover glow reaches, as a share of the half-width (1 = the two edges' glows meet in the middle). Applies live.",
    D.hoverGlowWidth, () => callbacks.onTrailChange()
  );
  const mazeStatsRow = row(
    fPath, s, "showMazeStats", { label: "Maze stats" },
    "Show the maze readout in the top-left corner: solve time (from your first move to arriving at the exit), your path vs the optimal route, efficiency once solved, the distance you backtracked, junctions visited and (with dead ends on) dead ends entered. Remembered per browser.",
    SETTINGS_DEFAULTS.showMazeStats,
    () => callbacks.onMazeStatsToggle(settings.showMazeStats === true)
  );
  // K73 viewer preferences (K84 will move them with the others).
  const fArrows = folder("Off-screen arrows", false, fPath);
  const finishIndicatorRow = row(
    fArrows, s, "finishIndicator", { label: "Arrow to the finish" },
    "While the finish is off screen, a marker at the edge of the screen points the way to it (under fog of war too, as a direction only). Remembered per browser.",
    SETTINGS_DEFAULTS.finishIndicator,
    () => callbacks.onFinishIndicatorToggle(settings.finishIndicator === true)
  );
  // K198 stage 2: the other two indicators' switches and one size for all
  // three (no step: an edit keeps 2 decimals).
  const headIndicatorRow = row(
    fArrows, s, "headIndicator", { label: "Arrow to you" },
    "While your own position is off screen (you panned away, or a long run outpaced the camera), a marker at the edge of the screen points back to it. Remembered per browser.",
    SETTINGS_DEFAULTS.headIndicator,
    () => callbacks.onHeadIndicatorToggle(settings.headIndicator === true)
  );
  const minotaurIndicatorRow = row(
    fArrows, s, "minotaurIndicator", { label: "Arrow to the minotaur" },
    "In a real-time chase, while the minotaur is off screen, a marker at the edge of the screen points to it. Remembered per browser.",
    SETTINGS_DEFAULTS.minotaurIndicator,
    () => callbacks.onMinotaurIndicatorToggle(settings.minotaurIndicator === true)
  );
  const indicatorSizeRow = row(
    fArrows, s, "indicatorSize",
    {
      label: "Off-screen arrow size",
      min: INDICATOR_SCALE_MIN,
      max: INDICATOR_SCALE_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "The size of the edge markers (the finish's, your position's, the minotaur's): 1 = the default. The markers in the maze have their own size (markerSize). Remembered per browser.",
    SETTINGS_DEFAULTS.indicatorSize,
    () => {
      settings.indicatorSize = Math.round(settings.indicatorSize * 100) / 100;
      callbacks.onIndicatorSizeChange(settings.indicatorSize);
    }
  );
  const tapToPanRow = row(
    fArrows, s, "tapToPan", { label: "Tap arrow to pan" },
    "Tapping an edge marker (the finish's, your own position's, the minotaur's) brings what it points at into view. Off: the markers only point, and taps go through them to the maze. Remembered per browser.",
    SETTINGS_DEFAULTS.tapToPan,
    () => callbacks.onTapToPanToggle(settings.tapToPan === true)
  );
  // K120: the move pad (ui/move_pad.ts), a viewer preference like the two
  // above.
  const movePadRow = row(
    fPath, s, "movePad", { label: "Move pad" },
    "A four-way pad in the bottom-right corner that moves like the arrow keys: press a direction to take the run that best matches it, and keep it pressed to keep going at each junction until nothing matches. On by default on touch screens. Remembered per browser.",
    SETTINGS_DEFAULTS.movePad,
    () => callbacks.onMovePadToggle(settings.movePad === true)
  );
  // K137 stage 2: chalk marks (ui/aid_buttons.ts), a viewer preference.
  const chalkRow = row(
    fPath, s, "chalk", { label: "Chalk marks" },
    "A Chalk button (or C) ticks the junction you stand on, or rubs its tick out, to remember where you have been. The marks clear on a restart. Remembered per browser.",
    SETTINGS_DEFAULTS.chalk,
    () => callbacks.onChalkToggle(settings.chalk === true)
  );
  // K140: the finish confetti amount (0 = none since K323 merged the
  // on/off switch into it). Daily-exempt (how a finish celebrates, not
  // what was played). No step (K130); an edit keeps 2 decimals.
  const confettiAmountRow = row(
    fPath, p, "confettiAmount",
    {
      label: "Confetti amount",
      min: 0,
      max: CONFETTI_AMOUNT_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "How much confetti a finish throws: 1 = the default, 0 = none, up to 3x. Reduced motion throws none.",
    D.confettiAmount, () => {
      params.confettiAmount = Math.round(params.confettiAmount * 100) / 100;
      callbacks.onConfettiChange();
    }
  );
  // K337: the confetti's shine (its specular strength) and the share of
  // foil pieces, which shows only while the shine is on. Daily-exempt,
  // like the amount; both apply at the next finish.
  const confettiShineRow = row(
    fPath, p, "confettiShine",
    {
      label: "Confetti shine",
      min: 0,
      max: CONFETTI_SHINE_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "How brightly the confetti flashes as pieces turn through the light: 1 = the default, 0 = lit but no flashes, up to 2x.",
    D.confettiShine, () => {
      params.confettiShine = Math.round(params.confettiShine * 100) / 100;
      callbacks.onConfettiChange();
    }
  );
  const foilShareRow = row(
    fPath, p, "foilShare",
    {
      label: "Foil confetti",
      min: 0,
      max: 1,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "The share of pieces that are foil: foil flashes near white for a moment as it turns through the light, while paper shows a soft sheen. 0 = all paper, 1 = all foil.",
    D.foilShare, () => {
      params.foilShare = Math.round(params.foilShare * 100) / 100;
      callbacks.onConfettiChange();
    }
  );
  // K336: the side cannons (on/off) and their own amount, which shows only
  // while they are on. Daily-exempt, like the amount; both apply at the
  // next finish.
  const confettiCannonsRow = row(
    fPath, p, "confettiCannons", { label: "Side cannons" },
    "Two cannons just past the left and right edges of the screen fire confetti in and up when you finish, and it falls back in an arc.",
    D.confettiCannons,
    () => callbacks.onConfettiChange()
  );
  const cannonAmountRow = row(
    fPath, p, "cannonAmount",
    {
      label: "Cannon amount",
      min: 0,
      max: CANNON_AMOUNT_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "How much confetti the side cannons fire: 1 = the default, 0 = none, up to 3x.",
    D.cannonAmount, () => {
      params.cannonAmount = Math.round(params.cannonAmount * 100) / 100;
      callbacks.onConfettiChange();
    }
  );
  const streamerShareRow = row(
    fPath, p, "streamerShare",
    {
      label: "Streamers",
      min: 0,
      max: 1,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "The share of the side cannons' confetti fired as long, curling paper streamers: 0 = none, 1 = all.",
    D.streamerShare, () => {
      params.streamerShare = Math.round(params.streamerShare * 100) / 100;
      callbacks.onConfettiChange();
    }
  );
  // K98: the markers' diameter in thread widths. Daily-exempt (only the
  // look). No step, like the confetti amount: an edit keeps 2 decimals.
  const markerSizeRow = row(
    fPath, p, "markerSize",
    {
      label: "Maze marker size",
      min: MARKER_SIZE_MIN,
      max: MARKER_SIZE_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "Marker size: the diameter of your position marker, in thread widths. The start, the finish and the minotaur match it; the start and the finish keep a ring of their thread's color around the icon. Applies live.",
    D.markerSize, () => {
      params.markerSize = Math.round(params.markerSize * 100) / 100;
      callbacks.onMarkerSizeChange();
    }
  );
  // K552: the daily's title thread, a playback preference (daily-exempt).
  // It changes the graph, so a daily rebuilds, and keeps the attempt (the
  // maze is the same either way). Disabled off a daily (setOnDaily).
  const titleThreadRow = row(
    fPath, p, "dailyTitleThread", { label: "Title thread" },
    "Write the daily's name as a thread at the entrance. The maze is the same either way, and your attempt is kept. Dailies only.",
    D.dailyTitleThread,
    () => callbacks.onTitleThreadChange()
  );
  titleThreadRow.disabled = true;
  // Disabled, it still shows why (the tooltip and the label-tap help); the
  // reset glyph keeps its own disabled guard (row()).
  titleThreadRow.element.classList.add("kp-tip-when-disabled");
  const resetPathBtn = button(
    fGame,
    "Reset path",
    "Clear the traced maze path and start over from the entrance."
  ) as ButtonApi & { hidden: boolean };
  resetPathBtn.on("click", callbacks.onResetPath);
  void fowRow;
  void pathVizRow;

  // K114: the burn race (game/fire.ts; gameMode "burn" since K323).
  // Every row restarts the solve. No slider steps
  // (a step snaps a link's off-grid value on the next refresh, K130); an
  // edit keeps 2 decimals of speed, 1 of delay. K440: each fire clock has
  // its own speed and delay params; the panel shows one speed row and one
  // delay row, the clock's own (refreshCond), under the same labels, so
  // the clock row comes first: fire, clock, speed, delay, burnt. A clock
  // change only swaps which rows show; it refreshes no value, so no row's
  // handler runs.
  // K323: the burn race is gameMode "burn" (no fire toggle row); a fuse
  // lit at the entrance burns along every thread behind you. The rows
  // below show only in that mode.
  const fFire = fGame;
  // K114 stage 2: the fire's clock (game/fire_clock.ts).
  const fireClockRow = row(
    fFire, p, "fireClock",
    { options: { turn: "turn", realtime: "realtime" }, label: "Fire clock" },
    "turn: the fire burns as far as you walk, so standing still to think is free. realtime: it burns on a clock from your first move, your dot walks at a fixed pace, and if the fire reaches you while you stand there, you burn. Each clock keeps its own fireSpeed and fireDelay. Restarts the solve.",
    D.fireClock, () => callbacks.onClockChange()
  );
  // The turn clock's pair.
  const fireSpeedRow = row(
    fFire, p, "fireSpeed",
    { min: FIRE_SPEED_MIN, max: FIRE_SPEED_MAX, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label: "Fire speed (x yours)" },
    "The fire's speed as a fraction of yours: at 0.6 it burns 3 units of thread while you walk 5. Restarts the solve.",
    D.fireSpeed, () => {
      params.fireSpeed = Math.round(params.fireSpeed * 100) / 100;
      callbacks.onClockChange();
    }
  );
  const fireDelayRow = row(
    fFire, p, "fireDelay",
    { min: 0, max: FIRE_DELAY_MAX, pointerScale: 0.1, format: (v: number) => v.toFixed(1), label: "Head start (units)" },
    "How far you walk before the fire starts to spread, in lattice units (a run is about 4). Restarts the solve.",
    D.fireDelay, () => {
      params.fireDelay = Math.round(params.fireDelay * 10) / 10;
      callbacks.onClockChange();
    }
  );
  // K440: the real-time clock's pair (fireSpeedRt, fireDelayRt), under the
  // turn pair's labels. FIRE_V_REF (game/fire_clock.ts) is the dot's fixed
  // pace and the fire clock's rate: 12 lattice units a second.
  const fireSpeedRtRow = row(
    fFire, p, "fireSpeedRt",
    { min: FIRE_SPEED_MIN, max: FIRE_SPEED_MAX, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label: "Fire speed (x yours)" },
    "The fire's speed as a fraction of your dot's fixed pace (12 lattice units a second; a run is about 4): at 0.2 it burns 2.4 units of thread a second, 1 for every 5 your dot walks. Restarts the solve.",
    D.fireSpeedRt, () => {
      params.fireSpeedRt = Math.round(params.fireSpeedRt * 100) / 100;
      callbacks.onClockChange();
    }
  );
  const fireDelayRtRow = row(
    fFire, p, "fireDelayRt",
    { min: 0, max: FIRE_DELAY_MAX, pointerScale: 0.1, format: (v: number) => v.toFixed(1), label: "Head start (units)" },
    "How long after your first move the fire starts to spread, in lattice units at your dot's fixed pace (12 a second; a run is about 4): 20 is about 1.7 s, 40 about 3.3 s. Restarts the solve.",
    D.fireDelayRt, () => {
      params.fireDelayRt = Math.round(params.fireDelayRt * 10) / 10;
      callbacks.onClockChange();
    }
  );
  // K290 (burn stage 3a): a look, so it applies live and keeps the solve.
  const burntRow = row(
    fFire, p, "burnt",
    { options: { gone: "gone", char: "char" }, label: "Burnt threads" },
    "How burnt thread looks: gone (it is not drawn, and a thread it crossed over closes its gap) or char (a dark burnt coloring that keeps the over and under gaps). Applies live.",
    D.burnt, () => callbacks.onTrailChange()
  );

  // K137 stage 1: fragile runs and par (game/fragile.ts, game/par.ts), in
  // every game mode. Every row restarts the solve. The slack slider takes
  // no step (K130) and an edit keeps it on the 0.05 grid.
  const fragileRow = row(
    fGame, p, "fragile",
    { options: { off: "off", crack: "crack", snap: "snap" }, label: "Fragile runs" },
    "Runs break behind you. snap: a run breaks once you have crossed it. crack: it cracks the first time and breaks the second. A dead-end tail, the entrance's and the exit's never break. With no unbroken way to the exit left you are stranded: undo the last move or restart. Restarts the solve.",
    D.fragile, () => callbacks.onClockChange()
  );
  const parModeRow = row(
    fGame, p, "parMode",
    { options: { off: "off", strict: "strict", strokes: "strokes" }, label: "Par" },
    "A par of moves (runs walked, back and forth): the fewest runs from the entrance to the exit, plus the slack below. strict: you lose the moment the exit is out of reach within par. strokes: never lost; the finish reads against par, golf style (+2, E, -1). Restarts the solve.",
    D.parMode, () => callbacks.onClockChange()
  );
  const parSlackRow = row(
    fGame, p, "parSlack",
    { min: PAR_SLACK_MIN, max: PAR_SLACK_MAX, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label: "Par slack (x fewest)" },
    "Moves allowed past the fewest, as a fraction of the fewest: at 0.25 a maze whose shortest route takes 12 runs has a par of 15. Restarts the solve.",
    D.parSlack, () => {
      params.parSlack = Math.round(params.parSlack * 20) / 20;
      callbacks.onClockChange();
    }
  );
  // K139: collapse (game/collapse.ts). It overrides the three rows above,
  // which stay visible (call 4 of docs/design/K139.md). Restarts the solve.
  const collapseRow = row(
    fGame, p, "collapse",
    { options: { off: "off", finish: "finish", free: "free" }, label: "Collapse" },
    "Runs collapse behind you: a run you have walked cannot be walked again. Collapse as much of the maze as you can. finish: and still reach the exit; with no way left to it you are stranded (undo the last move or restart). free: the exit is just another run end; the game ends when no unbroken run is left to walk, and scores the share collapsed. Overrides Fragile runs and Par. Restarts the solve.",
    D.collapse, () => callbacks.onClockChange()
  );
  // K114: cut (game/cut.ts), the classic game only; off while any row above
  // is on (FabricMazeController.setRules), which stay visible as K139's do.
  // Restarts the solve.
  const cutRow = row(
    fGame, p, "cut",
    { options: { off: "off", on: "on", lead: "lead", delay: "delay" }, label: "Cut" },
    "Scissors: delete whole runs. on: press the scissors button (or X), then tap a run to cut it; Esc or a second press puts them away. A junction left with two runs is no longer a decision: a move through it carries on. lead: a walker takes the same turn at every junction (straight on, else the next run clockwise); tap runs to cut them, then Go. Reach the exit in as few cuts as you can (par shown); if it goes in circles you are back to planning, cuts kept. delay: a walker takes the shortest way out; each turn cut a run or pass (Let it walk), then it walks one run. Make its walk as long as you can. A cut that would leave no way to the exit is refused, and the entrance's and the exit's runs cannot be cut. Undo (the button or U) takes back one move or one cut. Classic game only; off while Fragile runs, Par or Collapse is on. Restarts the solve.",
    D.cut, () => callbacks.onClockChange()
  );
  // K137 stage 2 (game/spool.ts, game/hints.ts): the player's aids. The
  // spool, its slack and the hints restart the solve; the compass does not.
  const spoolRow = row(
    fGame, p, "spool", { label: "Ariadne's spool" },
    "Your yarn pays out behind you as you walk and reels back in when you retrace your last run (or undo). It is only so long: the fewest runs to the exit plus the slack below. A move past its end is refused. Restarts the solve.",
    D.spool, () => callbacks.onClockChange()
  );
  const spoolSlackRow = row(
    fGame, p, "spoolSlack",
    { min: SPOOL_SLACK_MIN, max: SPOOL_SLACK_MAX, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label: "Spool slack (x fewest)" },
    "Yarn past the fewest runs, as a fraction of the fewest: at 0.3 a maze whose shortest route takes 10 runs gives 13 runs of yarn. Restarts the solve.",
    D.spoolSlack, () => {
      params.spoolSlack = Math.round(params.spoolSlack * 20) / 20;
      callbacks.onClockChange();
    }
  );
  const hintsRow = row(
    fGame, p, "hints",
    { min: 0, max: HINTS_MAX, step: 1, label: "Hints" },
    "Hints per solve (0: none). The Hint button (or H) lights the run that starts the shortest way to the exit for two seconds. A restart gives them back. Restarts the solve.",
    D.hints, () => callbacks.onClockChange()
  );
  const compassRow = row(
    fGame, p, "compass", { label: "Compass" },
    "A small arrow beside you points along the run that starts the shortest way to the exit (not straight at the exit), updated after every move.",
    D.compass, () => callbacks.onAidsChange()
  );
  // K138 stage 1 (game/ice.ts, game/color_rule.ts): the movement rules, the
  // classic game only; off while collapse, fragile runs, the cut, the fire
  // or the spool is on (FabricMazeController.setRules), their rows kept
  // visible as K139's are. The share slider takes no step (K130) and an edit
  // keeps the 0.05 grid. Both restart the solve.
  const iceRow = row(
    fGame, p, "ice",
    { min: 0, max: ICE_SHARE_MAX, pointerScale: 0.01, format: (v: number) => (v === 0 ? "off" : v.toFixed(2)), label: "Ice (share of runs)" },
    `Some runs are icy (frosted): a move onto ice slides on, run after run, to the next junction where you can stop, and counts as one move. A backtrack undoes the whole slide. The share of runs that are icy; ${ICE_SHARE_ON} is a good start, 0 is off. The fewest moves and par read the slides. Classic game only; off while Fragile runs, Collapse, Cut or the spool is on. Restarts the solve.`,
    D.ice, () => {
      params.ice = Math.round(params.ice * 20) / 20;
      callbacks.onClockChange();
    }
  );
  const colorRuleRow = row(
    fGame, p, "colorRule",
    { options: { off: "off", alternate: "alternate", cycle: "cycle" }, label: "Color rule" },
    "Each run has a color, and a move must follow the rule. alternate: never the same color twice in a row (light, dark, light...). cycle: three colors in a fixed order, then the first again. A run the rule forbids is refused. Backtracking steps the rule back too. The fewest moves and par follow the rule. Classic game only; off while Fragile runs, Collapse, Cut or the spool is on. Restarts the solve.",
    D.colorRule, () => callbacks.onClockChange()
  );
  // K138 stage 2 (game/turnstiles.ts, game/hidden_runs.ts): turnstile
  // junctions and hidden runs, the same scope and restart as ice.
  const turnstilesRow = row(
    fGame, p, "turnstiles",
    { min: 0, max: TURNSTILES_MAX, step: 1, label: "Turnstiles" },
    "Turnstile junctions (0: none). At a turnstile only two of its three runs connect, and the open pair turns one step with every move you make, backtracks included; a band through the junction shows the open pair. Going back the way you came is always allowed. The fewest moves and par read the turnstiles. Classic game only; off while Fragile runs, Collapse, Cut or the spool is on. Restarts the solve.",
    D.turnstiles, () => callbacks.onClockChange()
  );
  const hiddenRunsRow = row(
    fGame, p, "hiddenRuns",
    { min: 0, max: HIDDEN_MAX, step: 1, label: "Hidden runs" },
    "Hidden shortcut runs (0: none). A hidden run draws nothing and cannot be tapped until you pluck a thread of the same note within three runs of it; then it shows for the rest of the solve (Undo past the pluck hides it again). Par and the stars rate the maze without them; the HUD shows the shorter par with them too. Classic game only; off while Fragile runs, Collapse, Cut or the spool is on. Restarts the solve.",
    D.hiddenRuns, () => callbacks.onClockChange()
  );
  // K138 stage 3 (game/one_way.ts): one-way runs, the same scope and restart.
  const oneWayRow = row(
    fGame, p, "oneWay",
    { min: 0, max: ONE_WAY_MAX, pointerScale: 0.01, format: (v: number) => (v === 0 ? "off" : v.toFixed(2)), label: "One-way runs" },
    "Some runs are one-way: chevrons along the run point the way, and a tap against them is refused. A backtrack over a one-way run is refused too. The share of the maze's loop runs that are one-way; 0.3 is a good start, 0 is off. The way out never closes. The fewest moves and par follow the arrows. Classic game only; off while Fragile runs, Collapse, Cut or the spool is on. Restarts the solve.",
    D.oneWay, () => {
      params.oneWay = Math.round(params.oneWay * 20) / 20;
      callbacks.onClockChange();
    }
  );
  // K138 stage 4 (game/locks.ts): keys and the lock, the same scope and
  // restart.
  const keysRow = row(
    fGame, p, "keys",
    { min: 0, max: KEYS_MAX, step: 1, format: (v: number) => (v === 0 ? "off" : String(v)), label: "Keys" },
    "Keys (0: none). Key beads lie on junctions a few runs off the way out; walk onto one to take it. The runs into the exit stay locked until you hold every key, and a tap on a lock is refused. Going back over the move that took a key drops it again. The fewest moves and par count the keys. Classic game only; off while Fragile runs, Collapse, Cut or the spool is on. Restarts the solve.",
    D.keys, () => callbacks.onClockChange()
  );
  const lockModeRow = row(
    fGame, p, "lockMode",
    { options: { "the exit": "exit" }, label: "Lock" },
    "Which runs the keys open: the exit, the runs into the way out (they need every key). Restarts the solve.",
    D.lockMode, () => callbacks.onClockChange()
  );

  // K80: the real-time chase's tuning (game/minotaur.ts ChaseParams; the
  // defaults were picked by a headless simulation). All live. Since K80
  // turns the folder also holds the turn-aligned minotaur's rows, first;
  // each clock shows only its own rows (refreshCond), and minoFog,
  // minoRefog and the indicator setting serve both.
  const fMino = fGame;
  // Real time's own rows (hidden under the turn clock). K324 stage 3: they
  // live in the "Minotaur tuning" subfolder (fMinoBehavior, created after
  // the turn clock's top rows below); the shared rows stay in the Game
  // folder, after the subfolder.
  const rtRows: RowApi[] = [];
  const chaseRow = (
    key: string,
    opts: Record<string, unknown>,
    tipText: string,
    shared = false
  ): RowApi => {
    const r = row(shared ? fMino : fMinoBehavior, p, key, opts, tipText, D[key], () => callbacks.onChaseChange());
    if (!shared) rtRows.push(r);
    return r;
  };
  // K80 turns: the turn-aligned minotaur (game/minotaur_turns.ts), a
  // modifier of the turn clock. The mode restarts the solve; the rest apply
  // live. Chances keep the pace rows' pattern (no step, 2 decimals, K130).
  // K324 stage 3: the Behavior row picks real time's model too.
  const minotaurRow = row(
    fMino, p, "minotaur",
    { options: { Hunter: "hunter", Guard: "guard", Stalker: "stalker" }, label: "Behavior" },
    "Behavior: Hunter roams and hunts you once you come within sight, then checks where it last saw you. Guard keeps to the ground around the finish. Stalker always hunts you. It starts in its lair at the finish; running into it sends you back to the entrance (counted); the entrance tail is a sanctuary. On the turn clock it moves when you move, and a tap on your own position waits a turn. No undo. Restarts the solve.",
    D.minotaur, () => callbacks.onClockChange()
  );
  const turnRow = (
    parent: Parent,
    key: string,
    opts: Record<string, unknown>,
    tipText: string
  ): RowApi => row(parent, p, key, opts, tipText, D[key], () => callbacks.onTurnMinoChange());
  const minoSpeedRow = turnRow(
    fMino, "minoSpeed",
    { options: { "half (every other turn)": "half", one: "one", "charge (two while hunting)": "charge", two: "two" }, label: "Runs per turn" },
    "Runs it takes each turn: half = one run every other turn; one; charge = one, two while it hunts you; two. Charge and two always show its next move. Applies live."
  );
  const minoByLengthRow = turnRow(
    fMino, "minoByLength", { label: "Travel by length" },
    "Travel by thread length: each turn it moves its speed times your move's length (times the tuned travel scale), stopping mid-run and turning back on a run; a wait moves it the maze's median run length. Contact is by thread distance through the move. Off: it takes whole runs. Applies live."
  );
  // K324 stage 2: shown on both clocks (the real-time chase draws its
  // plan); its look applies to both.
  const minoTelegraphRow = turnRow(
    fMino, "minoTelegraph", { label: "Show its next move" },
    "Show its next move in red. Turn clock: the run it will take and where it will stand, decided when your move ends (forced on at charge and two). Real time: the rest of the run it is on and the runs it plans next (Telegraph reach), with a ring where it is headed once the route reaches it; faint while it roams, bright while it hunts. Applies live."
  );
  // K525: how the telegraph draws. Hidden while no telegraph shows (the
  // row above off; on the turn clock charge and two force it on).
  const minoTelegraphLookRow = turnRow(
    fMino, "minoTelegraphLook",
    { options: { Rims: "rims", Line: "line", Both: "both" }, label: "Telegraph look" },
    "Telegraph look: rims light both edges of the run it will take in red; line draws a red line over it; both draws the two. The ring where it will stand shows in every look. Applies live."
  );
  // K324: the tuning subfolder sits after each clock's top rows (the turn
  // clock's above hide in real time) and before the shared rows. It holds
  // real time's rows (K80's, moved here by K324 stage 3, then the models'
  // and K324's) and the turn clock's model rows, each shown only under its
  // clock.
  const fMinoBehavior = folder("Minotaur tuning", false, fGame);
  // K174: the minotaur's paces as multiples of yours (playerPace). No step
  // (Tweakpane's step grid would snap a link's 0.73, K130); an edit keeps
  // 2 decimals, so 0.9 x 10 stays exactly the default's 9 (K324's re-tune).
  const paceRow = (key: "minoWanderPace" | "minoHuntPace", label: string, tipText: string): RowApi => {
    const r = row(
      fMinoBehavior, p, key,
      { min: 0, max: 2, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label },
      tipText, D[key], () => {
        params[key] = Math.round(params[key] * 100) / 100;
        callbacks.onChaseChange();
      }
    );
    rtRows.push(r);
    return r;
  };
  paceRow(
    "minoWanderPace", "Wander speed (x yours)",
    "The minotaur's pace while it roams, as a multiple of your pace (playerPace): 0.5 = half as fast as you. Applies live."
  );
  paceRow(
    "minoHuntPace", "Hunt speed (x yours)",
    "Its pace while it hunts you, along the shortest way to you, as a multiple of your pace: below 1 you outrun it by moving away. Applies live."
  );
  chaseRow(
    "minoPaceJitter", { min: 0, max: 0.5, step: 0.05, label: "Speed variation" },
    "Pace variety: each roaming leg runs at the wander pace times 1 ± up to this, at random. Applies live."
  );
  const minoPauseChanceRow = chaseRow(
    "minoPauseChance", { min: 0, max: 1, step: 0.05, label: "Chance of a long stop" },
    "Hunter and guard: chance it stops for a while at a junction it roams through. Applies live."
  );
  const minoPauseMinRow = chaseRow(
    "minoPauseMin", { min: 0, max: 10, step: 0.1, label: "Long stop, shortest (s)" },
    "Hunter and guard: the shortest long stop, in seconds (also its rest where a roam ends). Applies live."
  );
  const minoPauseMaxRow = chaseRow(
    "minoPauseMax", { min: 0, max: 10, step: 0.1, label: "Long stop, longest (s)" },
    "Hunter and guard: the longest long stop, in seconds (at least the shortest). Applies live."
  );
  const minoDetectRow = chaseRow(
    "minoDetect", { min: 0, max: 100, step: 1, label: "Spots you within" },
    "Hunter: it starts hunting you once you are this close, measured along the threads (lattice units). The stalker charges within it. Applies live."
  );
  const minoLoseRow = chaseRow(
    "minoLose", { min: 0, max: 150, step: 1, label: "Loses you beyond" },
    "Hunter: it loses you once you are farther than this along the threads (never less than the distance above). The stalker's charge ends there too. Applies live."
  );
  // K324 stage 3: the guard's own territory, sight and accuracy and the
  // stalker's accuracy, in real time's units (lattice units along the
  // threads, chances). The turn clock's rows are minoTerritory,
  // minoGuardSight, minoGuardAccuracy and minoStalkerAccuracy.
  const minoGuardRoamRow = chaseRow(
    "minoGuardRoam", { min: 5, max: 150, step: 1, label: "Territory" },
    "Guard: it roams only within this distance of the finish's junction, along the threads (lattice units); a hunt may take it out, and it walks back after. Applies live."
  );
  const minoGuardDetectRow = chaseRow(
    "minoGuardDetect", { min: 0, max: 100, step: 1, label: "Spots you within" },
    "Guard: it starts hunting you once you are this close, measured along the threads (lattice units). Applies live."
  );
  const minoGuardLoseRow = chaseRow(
    "minoGuardLose", { min: 0, max: 150, step: 1, label: "Loses you beyond" },
    "Guard: it loses you once you are farther than this along the threads (never less than the distance above); then it checks where it last saw you. Applies live."
  );
  const accuracyRow = (key: "minoGuardAccuracyRt" | "minoStalkerAccuracyRt", tipText: string): RowApi => {
    const r = row(
      fMinoBehavior, p, key,
      { min: 0, max: 1, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label: "Accuracy" },
      tipText, D[key], () => {
        params[key] = Math.round(params[key] * 100) / 100;
        callbacks.onChaseChange();
      }
    );
    rtRows.push(r);
    return r;
  };
  const minoGuardAccuracyRtRow = accuracyRow(
    "minoGuardAccuracyRt",
    "Guard: while it hunts, the chance each junction's step takes a shortest way to you; otherwise it steps at random. Applies live."
  );
  const minoStalkerAccuracyRtRow = accuracyRow(
    "minoStalkerAccuracyRt",
    "Stalker: the chance each junction's step takes a shortest way to you (always, while you are off the entrance and exit tails); otherwise it steps at random. Applies live."
  );
  chaseRow(
    "minoCatch", { min: 0.2, max: 5, step: 0.1, label: "Catch distance" },
    "Catch distance: closer than this along the threads and it catches you, sending you back to the entrance. Applies live."
  );
  const minoDeadEndsRow = chaseRow(
    "minoDeadEnds", { min: 0, max: 1, step: 0.05, label: "Visits dead ends" },
    "Hunter and guard: how often it roams to a dead-end tip instead of a junction: dead ends are its hunting ground. Applies live."
  );
  const minoRoamRow = chaseRow(
    "minoRoam", { min: 5, max: 150, step: 1, label: "Roam range" },
    "Hunter: the farthest it roams in one go, along the threads (lattice units). Applies live."
  );
  const minoPullRow = chaseRow(
    "minoPull", { min: 0, max: 1, step: 0.05, label: "Roams toward you" },
    "Hunter and guard: how often its roaming legs head only for places nearer you along the threads, so it finds you more often (0 = it roams at random, 1 = always toward you). A player on the entrance or exit tail pulls nothing. Applies live."
  );
  chaseRow(
    "minoWake", { min: 0, max: 20, step: 0.5, label: "Lair wait (s)" },
    "Seconds it waits in its lair at the finish, at the start and after each catch. Applies live."
  );
  // K294 (K80 turns 3a): sight and accuracy are per model. minoSight is the
  // hunter's, and the stalker's charge reads it too, so it also shows for
  // the stalker at charge; the guard has its own sight and accuracy rows,
  // the stalker its own accuracy row.
  const minoSightRow = turnRow(
    fMinoBehavior, "minoSight", { min: 0, max: MINO_SIGHT_MAX, step: 1, label: "Sight (runs)" },
    "Hunter: sight, in runs. It hunts you once you are this few runs away and gives up beyond minoGiveUp more. The stalker charges within this sight. It never sees you on the entrance tail. Applies live."
  );
  const minoGuardSightRow = turnRow(
    fMinoBehavior, "minoGuardSight", { min: 0, max: MINO_SIGHT_MAX, step: 1, label: "Sight (runs)" },
    "Guard: sight, in runs. It hunts you once you are this few runs away and gives up beyond minoGiveUp more. It never sees you on the entrance tail. Applies live."
  );
  // K324 section 4.3 (K80 turns 3a): the two constants the harness fixed.
  const minoGiveUpRow = turnRow(
    fMinoBehavior, "minoGiveUp", { min: 0, max: MINO_GIVE_UP_MAX, step: 1, label: "Give-up margin (runs)" },
    "How many runs past its sight you must get before it gives up the hunt; then it checks where it last saw you. Applies live."
  );
  // K272: roam and territory start at 1 (0 stood still, or walked at
  // random); 1 = destinations one run away, or next to the finish.
  const minoRoamMinRow = turnRow(
    fMinoBehavior, "minoRoamMin", { min: MINO_RUNS_MIN, max: MINO_ROAM_MIN_MAX, step: 1, label: "Roam nearest (runs)" },
    "Hunter: the nearest it roams in one go, in runs (minoRoamRuns if that is less). Applies live."
  );
  const minoRoamRunsRow = turnRow(
    fMinoBehavior, "minoRoamRuns", { min: MINO_RUNS_MIN, max: MINO_ROAM_RUNS_MAX, step: 1, label: "Roam range (runs)" },
    "Hunter: the farthest it roams in one go, in runs. Applies live."
  );
  const minoTerritoryRow = turnRow(
    fMinoBehavior, "minoTerritory", { min: MINO_RUNS_MIN, max: MINO_TERRITORY_MAX, step: 1, label: "Territory (runs)" },
    "Guard: it roams only to junctions within this many runs of the finish. Applies live."
  );
  const chanceRow = (
    key: "minoAccuracy" | "minoGuardAccuracy" | "minoStalkerAccuracy" | "minoTurnPull" | "minoPause",
    label: string,
    tipText: string
  ): RowApi =>
    row(
      fMinoBehavior, p, key,
      { min: 0, max: 1, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label },
      tipText, D[key], () => {
        params[key] = Math.round(params[key] * 100) / 100;
        callbacks.onTurnMinoChange();
      }
    );
  const minoTurnPullRow = chanceRow(
    "minoTurnPull", "Roams toward you",
    "The chance a roam ends nearer you than where it stands (when any such junction is in range); otherwise anywhere in range. It still roams; only where a roam ends leans toward you. Applies live."
  );
  const minoAccuracyRow = chanceRow(
    "minoAccuracy", "Accuracy",
    "Hunter: while it hunts, the chance each step takes a shortest way to you; otherwise it steps at random. Applies live."
  );
  const minoGuardAccuracyRow = chanceRow(
    "minoGuardAccuracy", "Accuracy",
    "Guard: while it hunts, the chance each step takes a shortest way to you; otherwise it steps at random. Applies live."
  );
  const minoStalkerAccuracyRow = chanceRow(
    "minoStalkerAccuracy", "Accuracy",
    "Stalker: the chance each step takes a shortest way to you (always, while you are off the entrance tail); otherwise it steps at random. Applies live."
  );
  const minoPauseRow = chanceRow("minoPause", "Chance it waits a turn", "The chance it stands still for a turn. Applies live.");
  // K293 (e): true with minoLair off too (a catch leaves it where it caught
  // you, and it sleeps again there).
  const minoSleepRow = turnRow(
    fMinoBehavior, "minoSleep", { min: 0, max: MINO_SLEEP_MAX, step: 1, label: "Lair sleep (turns)" },
    "Turns it waits before it first moves: at the start, and again after each catch (in its lair, or where it caught you while minoLair is off). Applies live."
  );
  // K324: the junction stops, turn-back margin, roam window and telegraph
  // reach (design 4.2), in the tuning subfolder under real time (q8). No
  // step on the continuous ones (K130), an edit keeps 2 decimals.
  const tuneRow = (
    key: "minoStopMin" | "minoStopMax" | "minoHuntStop" | "minoTurnBack" | "minoTipReach" | "minoRoamNear",
    min: number,
    max: number,
    label: string,
    tipText: string
  ): RowApi => {
    const r = row(
      fMinoBehavior, p, key,
      { min, max, pointerScale: 0.01, format: (v: number) => v.toFixed(2), label },
      tipText, D[key], () => {
        params[key] = Math.round(params[key] * 100) / 100;
        callbacks.onChaseChange();
      }
    );
    rtRows.push(r);
    return r;
  };
  tuneRow(
    "minoStopMin", 0, 2, "Junction stop, min (s)",
    "Real time: it stops at every junction it reaches (never at a dead-end tip) for a time drawn between this and the max, in seconds; a long stop replaces it. 0 for both: no junction stops. Applies live."
  );
  tuneRow(
    "minoStopMax", 0, 2, "Junction stop, max (s)",
    "Real time: the longest junction stop, in seconds (at least the min). Applies live."
  );
  tuneRow(
    "minoHuntStop", 0, 1, "Stop while hunting (x)",
    "Real time: its junction stops while it hunts you, as a multiple of the roaming ones (0 = none, 1 = as long). Spotting you does not cut a junction stop short. Applies live."
  );
  tuneRow(
    "minoTurnBack", 0, 10, "Turn-back margin",
    "Real time: while it hunts, it turns back mid-run only when the way to you behind it is shorter than the way ahead by more than this, along the threads (lattice units). Applies live."
  );
  const minoTipReachRow = tuneRow(
    "minoTipReach", 0.5, 4, "Dead-end reach (x roam)",
    "Real time, hunter: how far away a dead-end tip may be for a roam to head there, as a multiple of Roam range. Applies live."
  );
  const minoRoamNearRow = tuneRow(
    "minoRoamNear", 0, 1, "Nearest roam (x roam)",
    "Real time, hunter: the nearest junction a roam heads for, as a multiple of Roam range (0.25 = a quarter of it). Applies live."
  );
  rtRows.push(
    row(
      fMinoBehavior, p, "minoTelegraphRuns", { min: 0, max: 3, step: 1, label: "Telegraph reach (runs)" },
      "Real time: how many runs of its next move show (with Show its next move), past the run it is on. Applies live.",
      D.minoTelegraphRuns, () => callbacks.onChaseChange()
    )
  );
  const minoFogRow = chaseRow(
    "minoFog",
    { options: { always: "always", "while hunting": "hunting", never: "never" }, label: "Seen through fog" },
    "With fog of war or the thread reveal: show the minotaur always, only while it hunts you, or never (only where the fog has lifted, or on thread you can see). Applies live.",
    true
  );
  // K137 stage 3a (4.32, game/lives.ts): hearts, on both clocks. While on,
  // they replace "Catch restarts level" (hidden): the last heart restarts.
  const livesRow = chaseRow(
    "lives",
    { min: 0, max: LIVES_MAX, step: 1, format: (v: number) => (v === 0 ? "off" : String(v)), label: "Lives" },
    `Hearts: each catch costs one and sends you back to the entrance as usual; losing the last restarts the level (your catches still count) with every heart back. ${LIVES_RECOMMENDED} is a good start. Off: catches cost nothing (Catch restarts level decides). Applies live.`,
    true
  );
  // K137 stage 3b (4.7, game/sword.ts): the sword, on both clocks. Shared
  // rows like lives, but they restart the solve (onClockChange): a new
  // chase lays the sword down, or none.
  const swordRow = row(
    fMino, p, "sword",
    { options: { off: "off", timed: "timed", "one use": "oneuse" }, label: "Sword" },
    "A sword lies a few runs off the shortest way. Take it and the minotaur flees you for a while: touch it then and timed sends it back to its lair, one use slays it for good. Restarts the solve.",
    D.sword, () => callbacks.onClockChange()
  );
  const swordMovesRow = row(
    fMino, p, "swordMoves",
    { min: SWORD_MOVES_MIN, max: SWORD_MOVES_MAX, step: 1, label: "Sword lasts" },
    "How long the minotaur flees once you take the sword: moves on the turn clock (a wait counts), runs walked in real time. Restarts the solve.",
    D.swordMoves, () => callbacks.onClockChange()
  );
  // K137 stage 3c (4.29, game/sprint.ts): sprint, on both clocks. Like the
  // sword it restarts the solve (onClockChange), which gives sprint back.
  const sprintRow = row(
    fMino, p, "sprint",
    { options: { off: "off", on: "on" }, label: "Sprint" },
    "Once a game, the lightning button (or F) spends a sprint: on the turn clock your next two moves cost the minotaur one turn; in real time you run your next two runs at twice your pace. A catch spends it; starting over gives it back. Restarts the solve.",
    D.sprint, () => callbacks.onClockChange()
  );
  // K137 stage 3d (4.9, game/monsters.ts): the extra monsters, turn clock
  // only. Like the sword they restart the solve (onClockChange): a new
  // chase lays them at their homes.
  const sleepersRow = row(
    fMino, p, "sleepers",
    { min: 0, max: SLEEPERS_MAX, step: 1, format: (v: number) => (v === 0 ? "off" : String(v)), label: "Sleepers" },
    "Turn clock: more monsters asleep in the maze, a few runs off the shortest way. Walk a run next to one and it wakes and hunts you as the minotaur does; any catch sends you back to the entrance and every monster back to sleep. Restarts the solve.",
    D.sleepers, () => callbacks.onClockChange()
  );
  const sleepKindRow = row(
    fMino, p, "sleepKind",
    { options: { wakes: "wake", follows: "follow", both: "both" }, label: "Sleeper kind" },
    "Turn clock: wakes hunts you once woken; follows trails your path a run or two behind, so stopping or turning back lets it catch you (the entrance puts it back to sleep); both mixes the two. Restarts the solve.",
    D.sleepKind, () => callbacks.onClockChange()
  );
  // K137 stage 4 (4.10, 4.30; game/lures.ts, game/snares.ts): the lures
  // and snares, turn clock only. A restart refills both (onClockChange).
  const luresRow = row(
    fMino, p, "lures",
    { min: 0, max: LURES_MAX, step: 1, format: (v: number) => (v === 0 ? "off" : String(v)), label: "Lures" },
    "Turn clock: arm the note button (or L), then tap a run to pluck it. The minotaur, and any sleeper in range, hears it and heads for the run's nearer end; it costs no move. Out of range nothing hears it, and the lure is spent anyway. Restarts the solve.",
    D.lures, () => callbacks.onClockChange()
  );
  const snaresRow = row(
    fMino, p, "snares",
    { min: 0, max: SNARES_MAX, step: 1, format: (v: number) => (v === 0 ? "off" : String(v)), label: "Snares" },
    "Turn clock, by runs: arm the loop button (or N), then tap a run touching your junction. The first monster to step onto it stops at the near end and stands there three turns; it still catches you if you walk onto it. One snare a run. Restarts the solve.",
    D.snares, () => callbacks.onClockChange()
  );
  // K80 turns stage 2 (K273): what a catch resets, on both clocks. While
  // the level row is on a catch resets everything, so the other two hide.
  const minoRestartRow = chaseRow(
    "minoRestart", { label: "Catch restarts level" },
    "A catch restarts the level: your path, the fog and the clock start over, and the minotaur goes back to its lair. Your catches still count. Off: a catch sends you back to the entrance and the solve goes on (the rows below say what else resets). Applies from the next catch.",
    true
  );
  const minoLairRow = chaseRow(
    "minoLair", { label: "Lair after a catch" },
    "A catch sends the minotaur back to its lair at the finish. Off: it stays where it caught you, and roams on from there (in real time after its wake pause). Applies from the next catch.",
    true
  );
  const minoRefogRow = chaseRow(
    "minoRefog", { label: "Catch restores fog" },
    "With fog of war or the thread reveal: a catch returns the fog (or the hidden threads) to how it stood at the start of the solve. Off: what you explored stays uncovered. Applies from the next catch.",
    true
  );

  // --- Look ---------------------------------------------------------------
  row(
    fLook, p, "colorScheme",
    {
      label: "Color scheme",
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
    fLook, p, "junctionBlend", { min: 0, max: 6, step: 0.05, label: "Junction blend" },
    "How far (in lattice units) each intersection's blended color bleeds into the sections meeting there, beyond the short built-in blend. 0 = the blend stays inside the intersection; a section shorter than twice this becomes one continuous gradient between its two intersections. Segments and strands schemes. Applies live.",
    D.junctionBlend, () => callbacks.onRecolor()
  );
  row(
    fLook, p, "hueShift", { min: 0, max: 359, step: 1, label: "Hue shift" },
    "Rotates the whole color gamut around the hue wheel (added to the seed's base hue). Applies live.",
    D.hueShift, () => callbacks.onRecolor()
  );
  row(
    fLook, p, "gamutArc", { min: 40, max: 360, step: 5, label: "Gamut arc" },
    "Width of the hue arc colors are drawn from: narrow = one tight family, 360 = the full rainbow. Applies live.",
    D.gamutArc, () => callbacks.onRecolor()
  );
  row(
    fLook, p, "palette",
    {
      label: "Palette",
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
    fPath, p, "pathColor", { view: "color", label: "Path color" },
    "Color of the traveled-path highlight (the classic gold). Applies live.",
    D.pathColor, () => callbacks.onRecolor()
  );
  row(
    fLook, p, "threadWidth", { min: 0.15, max: 0.8, step: 0.01, label: "Thread width" },
    "Ribbon width of every thread, in lattice units.",
    D.threadWidth, () => callbacks.onStyleChange()
  );
  row(
    fLook, p, "gap", { min: 0.04, max: 0.5, step: 0.01, label: "Crossing gap" },
    "Visible break in the under thread at each crossing - the classic over/under gap.",
    D.gap, () => callbacks.onStyleChange()
  );
  row(
    fLook, p, "fadeLength", { min: 0, max: 1.2, step: 0.02, label: "Crossing fade" },
    "How far the under thread fades out approaching a crossing gap. 0 = sharp cut. Applies live.",
    D.fadeLength, () => callbacks.onSlackChange()
  );
  row(
    fLook, p, "cuspRadius", { min: 0, max: 6, step: 0.05, label: "Corner reach" },
    "How far the rounded corners reach where threads join at an intersection. 0 = sharp joints. Applies live.",
    D.cuspRadius, () => callbacks.onSlackChange()
  );
  row(
    fLook, p, "background",
    {
      label: "Backdrop",
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
    fLook, p, "backgroundIntensity", { min: 0, max: 1, step: 0.05, label: "Backdrop intensity" },
    "Backdrop contrast: 0 = the plain page color, 1 = the strongest look. Applies live.",
    D.backgroundIntensity, () => callbacks.onBackgroundChange()
  );
  // K79: the backdrop's animation speed. The param's default is AUTO (-1:
  // each effect's own pace - 1 for the drifting ones, 0 for vellum), so
  // the row binds a view holding the SHOWN speed and writes the param only
  // when the slider moves off it; the reset glyph returns to auto. No step
  // (a step constraint snaps an off-step speed from a link on the next
  // refresh); the param keeps 2 decimals.
  const fBackdrop = folder("Backdrop tuning", false, fLook);
  const backgroundSpeedRow = row(
    fBackdrop, bgView, "backgroundSpeed",
    {
      label: "Backdrop speed",
      min: 0,
      max: BACKGROUND_SPEED_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "How fast the backdrop moves: 0 = still, 1 = the effect's own pace, up to 8x. Vellum is still until you give it a speed (then its mottling drifts and its light wanders; the grain stays put). The reset glyph returns to each effect's own pace. Reduced motion (Accessibility) keeps every backdrop still. Applies live.",
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
  const SHAPE_LABELS: Record<string, string> = { backgroundScale: "Backdrop size", backgroundDetail: "Backdrop detail", backgroundFibers: "Paper fibers", backgroundGrain: "Paper grain" };
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
      fBackdrop, p, key,
      {
        min,
        max,
        keyScale: 0.05,
        pointerScale: 0.01,
        format: (v: number) => v.toFixed(2),
        label: SHAPE_LABELS[key],
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
    fBackdrop, bgView, "backgroundAngle",
    {
      label: "Silk angle",
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
    fBackdrop, p, "backgroundColorMode",
    {
      label: "Backdrop colors", options: { design: "gamut", custom: "custom" } },
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
  const COLOR_LABELS: Record<string, string> = { backgroundBase: "Page color", backgroundAccent1: "Backdrop accent 1", backgroundAccent2: "Backdrop accent 2", backgroundAccent3: "Backdrop accent 3" };
  customKeys.forEach((key, i) => {
    colorRows.push(
      row(
        fBackdrop, p, key, { view: "color", label: COLOR_LABELS[key] }, colorTips[i],
        D[key], () => callbacks.onBackgroundChange()
      )
    );
  });

  // --- Motion & intro -----------------------------------------------------
  // THE MOTION SETTING (K53): a viewer preference, not a design param (no
  // link, no daily; ui/motion.ts stores it).
  const motionRow = row(
    fAccess, s, "motion",
    { options: { "follow system": "system", full: "full", reduced: "reduced" }, label: "Motion" },
    "How much the page moves. follow system = your device's reduce-motion setting (it switches live); full = all motion; reduced = backdrops hold still, a plucked thread brightens briefly instead of vibrating (the sound is the same), the camera jumps to an edge marker's target instead of easing there, the loading knot, the mode badge and the edge markers stop breathing and fading, and the maze's flow undulation holds still. The Accessibility group's Reduced motion switch sets this same answer. Remembered per browser.",
    SETTINGS_DEFAULTS.motion,
    () => callbacks.onMotionChange(settings.motion)
  );
  row(
    fMotion, p, "flowStrength", { min: 0, max: 1, step: 0.05, label: "Flow strength" },
    "Flow undulation: how far the whole fabric sways, as if drifting in water. 0 = perfectly still. Render-only - applies live, even while the knot sleeps. Reduced motion (Accessibility, or the Motion row above) holds it still without changing this value.",
    D.flowStrength, () => callbacks.onSlackChange()
  );
  const flowSpeedRow = row(
    fMotion, p, "flowSpeed", { min: 0, max: 3, step: 0.05, label: "Flow speed" },
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
      label: "Appearance preset",
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
      label: "Appearance sequence",
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
    fMotion, p, "appearSpeed", { min: 0.3, max: 4, step: 0.05, label: "Appearance speed" },
    "How fast the appearance animation reveals the threads. Applies live.",
    D.appearSpeed, appearEdited(() => callbacks.onSlackChange())
  );
  const appearFxRow = row(
    fMotion, p, "appearFx",
    {
      label: "Appearance effect",
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
  // THE LOAD SETTLE (K147, main.ts): how the first settle is paced. Both
  // take effect at the next load or Replay settle (the budget also follows
  // the slider while a settle is running).
  row(
    fDeveloper, p, "settleBudget", { min: 0, max: SETTLE_BUDGET_MAX, step: 1, label: "Settle budget" },
    "Settle budget: at most this many milliseconds of physics per frame while the knot first settles after loading, so the intro stays smooth on slow devices - the settle plays in slow motion instead of the frame rate dropping. Ends when the knot first comes to rest (or at the latest after five minutes on screen). 0 = off: the physics keeps up with real time and the intro stutters while it settles. Applies at the next load or Replay settle.",
    D.settleBudget, () => callbacks.onSlackChange()
  );
  row(
    fDeveloper, p, "loadSettle", { min: 0, max: LOAD_SETTLE_MAX, step: 0.05, label: "Load settle" },
    "Load settle: seconds of physics to run before the knot appears, so it starts its intro already partly relaxed. A loading knot shows if this takes a noticeable moment. 0 = appear at once; the max = wait until the knot is fully at rest (settle first, then the intro). Applies at the next load or Replay settle.",
    D.loadSettle, () => callbacks.onSlackChange()
  );
  button(
    fMotion,
    "Replay settle",
    "Restart the knot from its angular lattice state and watch it relax (and appear) again."
  ).on("click", callbacks.onReplaySettle);

  // --- Touch & feel ---------------------------------------------------------
  row(
    fFeel, p, "pluckSize", { min: 0, max: 3, step: 0.05, label: "Pluck size" },
    "How wide a plucked thread swings. A tap (or an auto pluck) sets the thread between its crossings vibrating - visual only, nothing else moves. 0 = sound only. Applies live.",
    D.pluckSize, () => callbacks.onSlackChange()
  );
  const pluckGhostRow = row(
    fFeel, p, "pluckGhost", { min: 0, max: 1, step: 0.05, label: "Pluck ghost" },
    "The speed cue on a vibrating thread: a faint crisp copy of the string flickering inside the blur. 0 = a pure time-exposure blur. Off under reduced motion (Motion & intro). Applies live.",
    D.pluckGhost, () => callbacks.onSlackChange()
  );
  row(
    fFeel, p, "pluckReach",
    {
      label: "Pluck reach", options: { run: "run", lobe: "lobe" } },
    "What a pluck sets vibrating: run = the whole maze segment you hear, each stretch between crossings humming (in knot mode, the plucked stretch and two either side); lobe = only the stretch between the two nearest crossings. Applies to the next pluck.",
    D.pluckReach, () => callbacks.onSlackChange()
  );
  // K180's pluck params: W's amount (no step, K130; an edit keeps 2
  // decimals), how W meets the segment's crossings, and the glow.
  const pluckWholeRow = row(
    fFeel, p, "pluckWhole",
    {
      label: "Whole-pluck swing",
      min: 0,
      max: PLUCK_WHOLE_MAX,
      keyScale: 0.05,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
    },
    "How far the whole plucked segment swings as one string, on top of the stretch you tapped (scales with pluckSize). 0 = only the tapped stretch and its neighbors move; 0.75 = the default; up to 1.5. Applies to the next pluck.",
    D.pluckWhole, () => {
      params.pluckWhole = Math.round(params.pluckWhole * 100) / 100;
      callbacks.onSlackChange();
    }
  );
  const pluckCrossingsRow = row(
    fFeel, p, "pluckCrossings",
    {
      label: "Pluck crossings", options: { through: "through", ride: "ride", pinch: "pinch" } },
    "How the whole segment's swing meets the crossings inside it: through = it carries across them, so the segment's blur stays one piece; ride = it stays within each crossing's soft limit (short stretches keep it near a thread width); pinch = it narrows to a waist at every crossing. Applies live.",
    D.pluckCrossings, () => callbacks.onSlackChange()
  );
  const pluckGlowRow = row(
    fFeel, p, "pluckGlow",
    {
      label: "Pluck glow", options: { off: "off", instead: "instead", with: "with", fallback: "fallback" } },
    "A glow on the plucked segment, brightening toward white as it rings: off = movement only; instead = the glow replaces the whole segment's swing (the tapped stretch still moves); with = the swing and the glow; fallback = the glow only on plucks whose movement is too small to see (zoomed out, or hemmed in by other threads). Reduced motion always glows instead of moving. Applies to the next pluck.",
    D.pluckGlow, () => callbacks.onSlackChange()
  );
  // K279 stage 1's pluck emphasis (prototypes for Levi to pick from). The
  // number rows have no step (K130); an edit keeps 2 decimals.
  const round2Feel = (key: "rippleStrength" | "rippleAuto" | "pluckSheen" |
    "pluckTug" | "autoPluckGain") => () => {
    params[key] = Math.round(params[key] * 100) / 100;
    callbacks.onSlackChange();
  };
  const twoDec = (max: number) => ({
    min: 0,
    max,
    keyScale: 0.05,
    pointerScale: 0.01,
    format: (v: number) => v.toFixed(2),
  });
  row(
    fFeel, p, "pluckRipple",
    {
      label: "Pluck ripple", options: { off: "off", wave: "wave", glint: "glint", ring: "ring" } },
    "A ripple spreading from where a thread is plucked, drawn over the threads (render only: nothing physically moves). wave = the threads it passes bend for a moment; glint = a bright band sweeps outward along them; ring = a soft ring expands from the pluck; off = none. Auto plucks ripple more faintly (rippleAuto). Off under reduced motion. Applies to the next pluck.",
    D.pluckRipple, () => callbacks.onSlackChange()
  );
  const rippleStrengthRow = row(
    fFeel, p, "rippleStrength", { ...twoDec(RIPPLE_STRENGTH_MAX), label: "Ripple strength" },
    "How strong your own plucks' ripple is (taps and drag releases). 0 = none; 1 = the default; up to 2. Applies to the next pluck.",
    D.rippleStrength, round2Feel("rippleStrength")
  );
  const rippleAutoRow = row(
    fFeel, p, "rippleAuto", { ...twoDec(RIPPLE_STRENGTH_MAX), label: "Auto ripple strength" },
    "How strong auto plucks' ripple is (the random and music sound modes), kept below your own so the knot's own music stays subtle. 0 = none. Applies to the next pluck.",
    D.rippleAuto, round2Feel("rippleAuto")
  );
  const pluckSheenRow = row(
    fFeel, p, "pluckSheen", { ...twoDec(1), label: "Pluck sheen" },
    "A bright sheen at the edges of a vibrating thread's blur, where a real string spends most of its swing (like a long-exposure photo of one). 0 = none. Off under reduced motion. Applies live.",
    D.pluckSheen, round2Feel("pluckSheen")
  );
  const pluckTugRow = row(
    fFeel, p, "pluckTug", { ...twoDec(1), label: "Pluck tug" },
    "A small real tug on the plucked stretch on top of the drawn vibration: the thread twitches toward the side you plucked and the knot settles back. 0 = drawn vibration only. None with physics off or under reduced motion. Applies to the next pluck.",
    D.pluckTug, round2Feel("pluckTug")
  );
  const tugAutoRow = row(
    fFeel, p, "tugAuto", { label: "Auto plucks tug" },
    "Auto plucks tug too (the random and music sound modes). Off = only your own plucks tug, so the knot can rest while the music plays. Applies to the next pluck.",
    D.tugAuto, () => callbacks.onSlackChange()
  );
  // K298: how near a thread the MOUSE picks it (a pen's too; touch keeps
  // its own wider reach). No step (K130); an edit keeps 2 decimals.
  row(
    fFeel, p, "pickMargin",
    {
      min: 0,
      max: PICK_MARGIN_MAX,
      keyScale: 0.5,
      pointerScale: 0.05,
      format: (v: number) => v.toFixed(2),
      label: "Mouse pick margin",
    },
    "Mouse pick margin: how far past a thread's edge, in screen pixels, the mouse still hovers, clicks or grabs it (a pen too; touch keeps its own wider reach). 0 = only on the thread itself. Applies live.",
    D.pickMargin, () => {
      params.pickMargin = Math.round(params.pickMargin * 100) / 100;
      callbacks.onSlackChange();
    }
  );
  const pickChoiceRatioRow = row(
    fFeel, p, "pickChoiceRatio",
    {
      min: PICK_CHOICE_RATIO_MIN,
      max: PICK_CHOICE_RATIO_MAX,
      keyScale: 0.1,
      pointerScale: 0.01,
      format: (v: number) => v.toFixed(2),
      label: "Choice pick ratio",
    },
    "Choice pick ratio: the mouse pick margin of your next moves (the runs out of your current junction), as a multiple of the margin above, so a choice is easier to hit than other threads. 1 = the same margin. Applies live.",
    D.pickChoiceRatio, () => {
      params.pickChoiceRatio = Math.round(params.pickChoiceRatio * 100) / 100;
      callbacks.onSlackChange();
    }
  );
  const tugLimitRow = row(
    fFeel, p, "tugLimit", { min: 0.5, max: 6, step: 0.1, label: "Tug limit" },
    "Dragging a thread tugs it (taps pluck instead). How far a thread can be tugged, in thread widths; the stretch resists more as it nears the limit (drag further, move less). Applies live.",
    D.tugLimit, () => callbacks.onSlackChange()
  );
  const snapBackRow = row(
    fFeel, p, "snapBack", { min: 0, max: 12, step: 0.5, label: "Snap back" },
    "After a drag: how quickly the released thread eases back to where it was grabbed (soft release style). 0 = release in place. Applies live.",
    D.snapBack, () => callbacks.onSlackChange()
  );
  const pluckStyleRow = row(
    fFeel, p, "pluckStyle",
    {
      label: "Release style", options: { string: "string", soft: "soft" } },
    "After a drag: string = let go at once - the knot snaps back and the released stretch vibrates like a plucked string; soft = ease home gently (speed = the snapBack slider), no vibration.",
    D.pluckStyle, () => callbacks.onSlackChange()
  );
  const temperatureRow = row(
    fPhysics, s, "temperature", { min: 0, max: 0.5, step: 0.01, label: "Agitation" },
    "Agitation. Shake the knot with noise; slide back to 0 and it settles into a new pose.",
    SETTINGS_DEFAULTS.temperature, () => callbacks.onTemperatureChange()
  );

  // --- Sound ----------------------------------------------------------------
  row(
    fSound, s, "muted", { label: "Muted" },
    "Silence everything (also pauses the random/music auto-pluck modes).",
    SETTINGS_DEFAULTS.muted, () => {}
  );
  row(
    fSound, p, "volume", { min: 0, max: 1, step: 0.01, label: "Volume" },
    "Master output level.",
    D.volume, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "autoPluckGain", { ...twoDec(1), label: "Auto pluck loudness" },
    "How loud auto plucks play (the random and music sound modes) next to your own: 1 = as loud as a tap; 0.5 = the default, half the level (-6 dB); 0 = silent. Applies to the next pluck.",
    D.autoPluckGain, round2Feel("autoPluckGain")
  );
  row(
    fSound, p, "soundMode",
    {
      label: "Sound mode",
      options: { none: "none", manual: "manual", random: "random", music: "music" },
    },
    "Pluck behavior: none = silent; manual = your plucks only; random = the knot plucks a random thread now and then; music = a scripted song plays itself on matching threads. Auto plucks make the thread ring (visual only - nothing else moves).",
    D.soundMode, () => callbacks.onAudioChange()
  );
  const soundSpeedRow = row(
    fSound, p, "soundSpeed", { min: 0.25, max: 6, step: 0.05, label: "Sound speed" },
    "Tempo of music mode and cadence of random plucks. 1 = normal.",
    D.soundSpeed, () => callbacks.onAudioChange()
  );
  const pitchSpaceRow = row(
    fSound, p, "pitchSpace",
    {
      label: "Pitch scale",
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
    fSound, p, "octaves", { min: 1, max: 4, step: 1, label: "Octaves" },
    "How many octaves the segment pitches spread across.",
    D.octaves, () => callbacks.onAudioChange()
  );
  const rootNoteRow = row(
    fSound, p, "rootNote",
    {
      label: "Root note",
      options: {
        seed: "seed", C: "C", "C#": "C#", D: "D", "D#": "D#", E: "E",
        F: "F", "F#": "F#", G: "G", "G#": "G#", A: "A", "A#": "A#", B: "B",
      },
    },
    "Root note of the pluck scale. 'seed' derives it from the design seed.",
    D.rootNote, () => callbacks.onAudioChange()
  );
  const tonicEmphasisRow = row(
    fSound, p, "tonicEmphasis", { min: 0, max: 1, step: 0.05, label: "Tonic emphasis" },
    "How strongly the segment pitches gravitate to the key: more threads ring the tonic (up to 3x), the dominant (2x) and the third (1.5x). 0 = every scale note equally often.",
    D.tonicEmphasis, (ev) => { if (!ev || ev.last !== false) callbacks.onAudioChange(); }
  );
  row(
    fSound, p, "reverb", { min: 0, max: 1, step: 0.01, label: "Reverb" },
    "Hall reverb amount. 0 = dry strings, 1 = a wash of room.",
    D.reverb, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "brightness", { min: 0, max: 1, step: 0.01, label: "Brightness" },
    "String brightness: low = felted and dark, high = wiry and bright. Applies from the next pluck.",
    D.brightness, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "sustain", { min: 0, max: 1, step: 0.01, label: "Sustain" },
    "How long strings ring after a pluck.",
    D.sustain, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "shimmer", { min: 0, max: 1, step: 0.01, label: "Shimmer" },
    "Unison-course detune: the slow beating shimmer of paired strings. 0 = a single pure string.",
    D.shimmer, () => callbacks.onVolumeChange()
  );
  row(
    fSound, p, "pickPosition", { min: 0, max: 1, step: 0.01, label: "Pick position" },
    "Where along the string the finger plucks: low = near the end (nasal, thin), high = near the middle (round, hollow).",
    D.pickPosition, () => callbacks.onVolumeChange()
  );

  // --- Physics --------------------------------------------------------------
  row(
    fPhysics, p, "physics", { label: "Physics" },
    "Physics simulation. Off: each design settles behind a loading spinner, then its layout freezes - nothing simulates afterwards (lighter on battery and slow devices). Threads can still be plucked (and flow, pulses and the intro still play), but not tugged: a drag pans the view. Applies live - turning it off first lets a moving knot come to rest; the sliders below still shape the frozen layout.",
    D.physics, () => callbacks.onPhysicsToggle()
  );
  const simSpeedRow = row(
    fDeveloper, p, "simSpeed", { min: 0, max: 10, step: 0.5, label: "Sim speed" },
    "Simulation speed. 0 pauses, 5 is real time, 10 is 5x.",
    D.simSpeed, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "slack", { min: 0, max: 1, step: 0.05, label: "Slack" },
    "How loose the threads rest. 0 pulls the knot rope-taut, 1 leaves it soft and open.",
    D.slack, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "drag", { min: 0, max: 1, step: 0.05, label: "Motion damping" },
    "Motion damping. Low = springy, waves ring after a pluck; high = movement dies quickly.",
    D.drag, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "repulsion", { min: 0.4, max: 1.8, step: 0.05, label: "Repulsion" },
    "Breathing room between parallel threads. Higher spreads the composition apart.",
    D.repulsion, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "bend", { min: 0.2, max: 2.5, step: 0.05, label: "Bend stiffness" },
    "Bending stiffness. Higher resists sharp curves - smoother, rounder thread paths.",
    D.bend, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "stiffness", { min: 0.1, max: 1.35, step: 0.05, label: "Spring stiffness" },
    "Structural spring strength along each thread. Higher = firmer, less stretchy material.",
    D.stiffness, () => callbacks.onSlackChange()
  );
  row(
    fPhysics, p, "smooth", { min: 0, max: 1, step: 0.05, label: "Smoothing" },
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
    {
      label: "Grid alignment", min: 0, max: 1, format: (v: number) => v.toFixed(2) },
    "How strongly every thread is pulled back toward its lattice position, on an exponential scale (each tenth of the slider doubles the pull): 0 = free-flowing curves, 1 = a formal, grid-like composition. Applies live.",
    gridAlignSlider(PARAM_DEFAULTS.gridAlign), () => {
      params.gridAlign = gridAlignStrength(gaView.gridAlign as number);
      callbacks.onSlackChange();
    }
  );

  // --- Developer (K541: Advanced renamed; Reset to defaults is at the root) ---
  row(
    fDeveloper, s, "showDebug", { label: "Debug overlay" },
    "Overlay the physics debug view (particles, bindings, contacts).",
    SETTINGS_DEFAULTS.showDebug,
    () => callbacks.onDebugToggle(settings.showDebug === true)
  );
  row(
    fDeveloper, s, "showStats", { label: "Stats readout" },
    "Show the build + performance readout (version, sim/wall time, frame cost) in the bottom-left corner. Remembered per browser.",
    SETTINGS_DEFAULTS.showStats,
    () => callbacks.onStatsToggle(settings.showStats === true)
  );
  button(
    pane as unknown as Parent,
    "Reset to defaults",
    "Restore every parameter to its default value (keeps the current seed) and regenerate."
  ).on("click", () => {
    Object.assign(params, PARAM_DEFAULTS);
    settings.temperature = SETTINGS_DEFAULTS.temperature;
    Object.assign(clockView, clockViewOf()); // K795: the Clock rows too
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
    // K115 stage 5b: a named cartouche shape greys the word row.
    cartoucheRow.element.classList.toggle("kp-greyed", params.cartoucheShape !== "");
    const fab = params.mazeFabric;
    fGame.hidden = !fab;
    startAnchorRow.hidden = !fab;
    exitAnchorRow.hidden = !fab;
    deadEndDensityRow.hidden = !fab;
    deadEndLengthRow.hidden = !fab || params.deadEndDensity === 0;
    hCutShareRow.hidden = !fab;
    branchDensityRow.hidden = !fab;
    fourWayRow.hidden = !fab;
    junctionSpacingRow.hidden = !fab;
    entranceClearanceRow.hidden = !fab;
    exitClearanceRow.hidden = !fab;
    exitCorridorRow.hidden = !fab;
    exitFlankRow.hidden = !fab;
    exitTaperRadiusRow.hidden = !fab;
    exitTaperStrengthRow.hidden = !fab;
    greedyTrapRow.hidden = !fab;
    const trapOn = fab && params.greedyTrap === "on";
    trapTargetFRow.hidden = !trapOn;
    trapTargetHRow.hidden = !trapOn;
    trapMaxFRow.hidden = !trapOn;
    trapMaxHRow.hidden = !trapOn;
    trapMaxGrowRow.hidden = !trapOn;
    trapRadiusRow.hidden = !trapOn;
    trapItersRow.hidden = !trapOn;
    trapTriesRow.hidden = !trapOn;
    trapSurplusRow.hidden = !trapOn;
    pathVizRow.hidden = !fab;
    cameraRow.hidden = !fab;
    trailLenRow.hidden = !fab || pathVizOf(params) !== "trail";
    tensionRow.hidden = !fab || pathVizOf(params) !== "string";
    fowRow.hidden = !fab;
    const fog = fab && params.exploration === "fog";
    const threads = fab && params.exploration === "threads";
    fowRadiusRow.hidden = !fog;
    fowIntroRow.hidden =
      !(fog || threads) || params.appearSequence === "instant";
    revealDistanceRow.hidden = !threads;
    revealFadeRow.hidden = !threads;
    revealLookRow.hidden = !threads;
    revealEndCrossRow.hidden = !threads;
    revealEndGlowRow.hidden = !threads;
    revealFinishRow.hidden = !threads;
    // K323: only the minotaur reads a realtime `clock` (clockOf); classic
    // and the burn race play it on the turn clock. K795: every game mode
    // reads the beat (K114), so a Clock row shows in each, and the beat's
    // rows only while the design plays it. Under the beat the minotaur
    // plays the turn clock (minoClockOf), so its turn rows show.
    const gameMino = fab && params.gameMode === "minotaur";
    const realtime = gameMino && params.clock === "realtime";
    const beat = fab && clockOf(params) === "beat";
    clockMinoRow.hidden = !gameMino;
    clockPlainRow.hidden = !fab || gameMino;
    beatTempoRow.hidden = !beat;
    beatLengthRow.hidden = !beat;
    beatCapRow.hidden = !beat;
    playerPaceRow.hidden = !realtime;
    const turnMinoOn = gameMino && !realtime;
    const minoOn = gameMino;
    for (const r of rtRows) r.hidden = !realtime;
    // K324 stage 3: real time plays all three models; each shows the rows
    // it reads (the stalker never roams: no long stops, no destinations).
    const rtGuard = realtime && params.minotaur === "guard";
    const rtStalker = realtime && params.minotaur === "stalker";
    const rtHunter = realtime && !rtGuard && !rtStalker;
    minoDetectRow.hidden = !(rtHunter || rtStalker);
    minoLoseRow.hidden = !(rtHunter || rtStalker);
    minoGuardRoamRow.hidden = !rtGuard;
    minoGuardDetectRow.hidden = !rtGuard;
    minoGuardLoseRow.hidden = !rtGuard;
    minoGuardAccuracyRtRow.hidden = !rtGuard;
    minoStalkerAccuracyRtRow.hidden = !rtStalker;
    minoPauseChanceRow.hidden = !(rtHunter || rtGuard);
    minoPauseMinRow.hidden = !(rtHunter || rtGuard);
    minoPauseMaxRow.hidden = !(rtHunter || rtGuard);
    minoDeadEndsRow.hidden = !(rtHunter || rtGuard);
    minoPullRow.hidden = !(rtHunter || rtGuard);
    minoRoamRow.hidden = !rtHunter;
    minoTipReachRow.hidden = !rtHunter;
    minoRoamNearRow.hidden = !rtHunter;
    minotaurRow.hidden = !gameMino;
    minoSpeedRow.hidden = !turnMinoOn;
    // K324 stage 2: the telegraph rows show on both clocks.
    minoTelegraphRow.hidden = !gameMino;
    minoTelegraphLookRow.hidden =
      !gameMino ||
      (realtime
        ? !params.minoTelegraph
        : !telegraphOn({ telegraph: params.minoTelegraph, speed: params.minoSpeed }));
    minoByLengthRow.hidden = !turnMinoOn;
    // K324: the tuning subfolder shows under both clocks; each clock's rows
    // in it hide under the other (real time's K324 rows are in rtRows).
    fMinoBehavior.hidden = !gameMino;
    minoPauseRow.hidden = !turnMinoOn;
    minoSleepRow.hidden = !turnMinoOn;
    // K294 (K80 turns 3a): each model's own rows. The stalker never roams
    // (no pull, no give-up) and charges within the shared sight.
    const hunter = turnMinoOn && params.minotaur === "hunter";
    const guard = turnMinoOn && params.minotaur === "guard";
    const stalker = turnMinoOn && params.minotaur === "stalker";
    minoSightRow.hidden = !(hunter || (stalker && params.minoSpeed === "charge"));
    minoGuardSightRow.hidden = !guard;
    minoGiveUpRow.hidden = !(hunter || guard);
    minoRoamMinRow.hidden = !hunter;
    minoRoamRunsRow.hidden = !hunter;
    minoTerritoryRow.hidden = !guard;
    minoTurnPullRow.hidden = !(hunter || guard);
    minoAccuracyRow.hidden = !hunter;
    minoGuardAccuracyRow.hidden = !guard;
    minoStalkerAccuracyRow.hidden = !stalker;
    // K323/K114: the burn race is gameMode "burn" (its own clock,
    // fireClock); its rows show only in that mode. K440: the speed and
    // delay rows are the fire clock's own pair. K795: under the beat the
    // fire plays the turn pair whatever fireClock says (fireSettingsOf), so
    // the fire clock's row hides and the turn pair shows.
    const fireOn = fab && params.gameMode === "burn";
    const fireRt = params.fireClock === "realtime" && !beat;
    fireClockRow.hidden = !fireOn || beat;
    fireSpeedRow.hidden = !fireOn || fireRt;
    fireDelayRow.hidden = !fireOn || fireRt;
    fireSpeedRtRow.hidden = !fireOn || !fireRt;
    fireDelayRtRow.hidden = !fireOn || !fireRt;
    burntRow.hidden = !fireOn;
    // K137: fragile runs and par play in every game mode, fabric only.
    fragileRow.hidden = !fab;
    parModeRow.hidden = !fab;
    parSlackRow.hidden = !fab || params.parMode === "off";
    collapseRow.hidden = !fab; // K139, every game mode too
    // K114; the beat drops the cut too (fabricRulesOf, K114 call 7).
    cutRow.hidden = !fab || params.gameMode !== "classic" || beat;
    spoolRow.hidden = !fab; // K137 stage 2
    spoolSlackRow.hidden = !fab || !params.spool;
    hintsRow.hidden = !fab;
    compassRow.hidden = !fab;
    // K138 stage 1: the classic game only, as the cut's row.
    iceRow.hidden = !fab || params.gameMode !== "classic";
    colorRuleRow.hidden = !fab || params.gameMode !== "classic";
    turnstilesRow.hidden = !fab || params.gameMode !== "classic"; // K138 stage 2
    hiddenRunsRow.hidden = !fab || params.gameMode !== "classic";
    oneWayRow.hidden = !fab || params.gameMode !== "classic"; // K138 stage 3
    keysRow.hidden = !fab || params.gameMode !== "classic"; // K138 stage 4
    lockModeRow.hidden = keysRow.hidden || params.keys <= 0;
    // Under the thread reveal too (K76 stage 2c: the same two settings).
    minoFogRow.hidden = !minoOn || !(fog || threads);
    // K137 stage 3a: lives replace the level row while on (game/lives.ts).
    const livesOn = livesOf(params.lives) > 0;
    const restartOn = params.minoRestart && !livesOn;
    livesRow.hidden = !minoOn;
    swordRow.hidden = !minoOn; // K137 stage 3b
    swordMovesRow.hidden = !minoOn || params.sword === "off";
    sprintRow.hidden = !minoOn; // K137 stage 3c
    // K137 stage 3d: the extra monsters play on the turn clock only.
    sleepersRow.hidden = !minoOn || realtime;
    sleepKindRow.hidden = !minoOn || realtime || params.sleepers <= 0;
    // K137 stage 4: the lures and snares play on the turn clock only, and
    // snares by runs only (TurnMinotaur.setSnare refuses by length).
    luresRow.hidden = !minoOn || realtime;
    snaresRow.hidden = !minoOn || realtime || params.minoByLength === true;
    minoRestartRow.hidden = !minoOn || livesOn;
    minoLairRow.hidden = !minoOn || restartOn;
    minoRefogRow.hidden = !minoOn || !(fog || threads) || restartOn;
    moveSpeedRow.hidden = !fab || realtime;
    mazeStatsRow.hidden = !fab;
    finishIndicatorRow.hidden = !fab;
    headIndicatorRow.hidden = !fab;
    minotaurIndicatorRow.hidden = !minoOn;
    indicatorSizeRow.hidden = !fab;
    tapToPanRow.hidden = !fab;
    movePadRow.hidden = !fab;
    chalkRow.hidden = !fab;
    confettiAmountRow.hidden = !fab;
    confettiShineRow.hidden = !fab || params.confettiAmount <= 0;
    foilShareRow.hidden = confettiShineRow.hidden || params.confettiShine <= 0;
    confettiCannonsRow.hidden = !fab || params.confettiAmount <= 0;
    cannonAmountRow.hidden =
      confettiCannonsRow.hidden || !params.confettiCannons;
    streamerShareRow.hidden =
      cannonAmountRow.hidden || params.cannonAmount <= 0;
    markerSizeRow.hidden = !fab;
    resetPathBtn.hidden = !fab;
    pulseSpacingRow.hidden = !fab;
    pulseReachRow.hidden = !fab;
    hoverGlowRow.hidden = !fab;
    hoverGlowLengthRow.hidden = !fab;
    hoverGlowFadeRow.hidden = !fab;
    hoverGlowWidthRow.hidden = !fab;
    // K298: knot mode has no choices (the mouse margin row always shows).
    pickChoiceRatioRow.hidden = !fab;
    // The gold recolor paints in gold/trail modes; the yarn replaces it.
    pathColorRow.hidden = !fab || pathVizOf(params) === "string";
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
    // K180: nothing to see without a drawn pluck; the crossings rule only
    // shapes a whole-segment swing that exists.
    pluckWholeRow.hidden = params.pluckSize <= 0;
    pluckGlowRow.hidden = params.pluckSize <= 0;
    pluckCrossingsRow.hidden =
      params.pluckSize <= 0 ||
      params.pluckWhole <= 0 ||
      params.pluckGlow === "instead";
    // K279: the strengths only with a ripple; the sheen only with a drawn
    // pluck; the tug only where physics can move.
    rippleStrengthRow.hidden = params.pluckRipple === "off";
    rippleAutoRow.hidden = params.pluckRipple === "off";
    pluckSheenRow.hidden = params.pluckSize <= 0;
    pluckTugRow.hidden = !live;
    tugAutoRow.hidden = !live || params.pluckTug <= 0;
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
    // K793: a search's folders and count follow the rows a mode shows.
    searchUi?.refresh();
    // K467: an open help block goes with its row.
    closeHelpIfHidden();
  };
  refreshCond();

  // K793 THE SEARCH BOX, with collapse all and expand all, above the rows
  // (under the header) once every row exists: panel_search_ui.ts. It never
  // writes a param, the link or a saved fold of its own.
  const search = createPanelSearch({
    pane: pane as unknown as { readonly children: readonly unknown[] },
    scroller: wrap,
    muteFolds: (on) => {
      searchMutesFolds = on;
    },
    saveFold: (title, expanded) => {
      folds[title] = expanded;
      saveFolds();
    },
    tags: PARAM_TAGS,
    onFilter: closeHelpIfHidden,
  });
  head.after(search.bar);
  search.reindex();
  searchUi = search;
  (window as unknown as Record<string, unknown>).__knotPanelSearch = () =>
    search.state();

  // HAMBURGER: shows/hides the whole panel. Open by default on roomy,
  // pointer-precise screens; closed on phones (it would cover the maze).
  // The choice persists per browser.
  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "kp-menu";
  menu.setAttribute("aria-label", "Settings");
  menu.innerHTML = "<span></span><span></span><span></span>";
  document.body.appendChild(menu);
  // K468: the top bar's strip behind the sheet's buttons (CSS shows it only
  // on the sheet, while the panel is open).
  const bar = document.createElement("div");
  bar.className = "kp-bar";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  const OPEN_KEY = "knotmaze.panelOpen";
  let storedOpen: string | null = null;
  try {
    storedOpen = localStorage.getItem(OPEN_KEY);
  } catch {
    // Storage unavailable: the default stands.
  }
  // A sheet never starts open (it would cover the page); the side panel
  // follows the stored choice, else the screen.
  let open = panelStartsOpen(
    sheetNow(),
    storedOpen,
    !window.matchMedia("(max-width: 700px), (pointer: coarse)").matches
  );
  // K468: an open sheet owns one history entry, so Android's Back closes it.
  const sheetHistory = new SheetHistory(
    {
      push: (state) => history.pushState(state, ""),
      back: () => history.back(),
    },
    {
      close: () => setOpen(false),
      rewriteLink: () => callbacks.onSheetBack?.(),
    }
  );
  window.addEventListener("popstate", () => sheetHistory.onPop());
  // The menu button reads as a close button while the sheet is up.
  const labelMenu = (): void => {
    const sheetOpen = open && sheetNow();
    menu.setAttribute("aria-label", sheetOpen ? "Close settings" : "Settings");
    menu.title = !open ? "Show settings" : sheetOpen ? "Close settings" : "Hide settings";
  };
  // Scroll restores on the first OPEN (a hidden wrapper has no layout).
  let scrollRestored = false;
  const openListeners: Array<(open: boolean) => void> = [];
  const setOpen = (v: boolean): void => {
    open = v;
    if (wrap) wrap.style.display = v ? "" : "none";
    menu.setAttribute("aria-expanded", String(v));
    labelMenu();
    if (v && sheetNow()) sheetHistory.open();
    else sheetHistory.release();
    if (!v) endPeek();
    // K92: the stylesheets follow it (undo and redo show, the mode badge
    // takes the row below them).
    document.documentElement.classList.toggle("kp-open", v);
    for (const cb of openListeners) cb(v);
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
    // The sheet's open state is never stored: a phone layout starts closed.
    if (sheetNow()) return;
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // Storage unavailable: state just doesn't persist.
    }
  });
  // K468: a rotation or a resize switches between the sheet and the side
  // panel live, and an open one takes or gives back its history entry.
  sheetMQ.addEventListener("change", () => {
    if (open) {
      if (sheetNow()) sheetHistory.open();
      else sheetHistory.release();
    }
    labelMenu();
    endPeek();
  });
  setOpen(open);

  return {
    pane,
    syncFromParams: () => {
      syncing = true;
      try {
        Object.assign(clockView, clockViewOf());
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
    syncAccessibility: (v) => {
      settings.motion = v.motion;
      settings.reducedMotion = v.reducedMotion;
      settings.highContrast = v.highContrast;
      // Only these three rows: a whole-pane refresh() can write a snapped
      // value back into a param, and a switch must never touch a design.
      syncing = true;
      try {
        motionRow.refresh?.();
        reducedMotionRow.refresh?.();
        highContrastRow.refresh?.();
      } finally {
        syncing = false;
      }
      markAll();
    },
    markOverridden: (keys) => {
      const set = new Set(keys);
      for (const t of tracked) {
        if (t.obj !== p) continue;
        const el = t.api.element;
        const on = set.has(t.key);
        if (on === el.classList.contains("kp-overridden")) continue;
        el.classList.toggle("kp-overridden", on);
        if (on) {
          el.dataset.kpTip = el.title;
          el.title = OVERRIDDEN_NOTE + el.title;
        } else if (el.dataset.kpTip !== undefined) {
          el.title = el.dataset.kpTip;
          delete el.dataset.kpTip;
        }
      }
      // K467: an open help block shows the title as it is now.
      syncHelpText();
    },
    setDailyLabel: (text, tip) => {
      if (dailyApi.title !== text) {
        dailyApi.title = text;
        searchUi?.relabel();
      }
      dailyApi.element.title = tip;
    },
    setOnDaily: (on) => {
      if (titleThreadRow.disabled !== !on) titleThreadRow.disabled = !on;
    },
    isOpen: () => open,
    onOpenChange: (cb) => {
      openListeners.push(cb);
    },
    midDrag: () => dragging,
    callbacks,
    studioLink: studio,
  };
}
