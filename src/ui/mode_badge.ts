// MODE BADGE (K73, Levi 2026-10-12; K151, 2026-10-14): a small pill just
// left of the settings button naming what the solve on screen is:
// - FREE PLAY: an ordinary design, not a daily. A tap does what the
//   panel's Daily button does (today's daily). The tap LEAVES free play,
//   so the pill always shows an X (K151, Levi: without it the pill read
//   as a button that starts free play; K200, Levi 2026-10-14: always, on
//   the desktop too, where it first faded in on hover).
// - DAILY: the attempt that counts. K151 moved the daily's name here from
//   the HUD's title row: "Daily #12", then " · Oct 11" for any day but
//   today, and " · solved" once this attempt set the official result. A
//   tap opens the daily stats (the title row's job), which leaves nothing,
//   so no X.
// - REPLAY: a daily whose official result is already recorded - the
//   first finish counts, later runs are replays.
// - PRACTICE (K146): a daily begun after its day. Never scored.
// A replay's or practice run's tap explains it in a toast (touch has no
// hover to show the tooltip); no X, nothing is left. modeBadgeFor (pure,
// unit-tested) decides; main.ts feeds it the daily on screen, the store's
// official result, what this attempt's finish recorded and whether the
// attempt began after its day.
//
// PLACEMENT: top-right, left of the hamburger, inside the safe area, at
// the hamburger's height on touch screens (a finger-sized target). The
// HUD owns the top-left and the win banner the top-center on wide screens:
// wherever the badge would come within FIT_GAP of either, fit() steps down
// to a shorter label, then one word, then the bare icon, then the icon
// below the menu button. Static under reduced motion (the Motion setting;
// otherwise a short fade-in).

import { formatDayDate } from "../game/daily_calendar";
import type { SolveRecord } from "../game/daily_store";
import { whenReduced } from "./motion";

export type ModeBadgeKind = "free" | "daily" | "replay" | "practice";

export interface ModeBadgeState {
  // The daily on screen (main.ts dailyN), or null for an ordinary design.
  daily: number | null;
  // That daily's official result is recorded (DailyStore.hasOfficial).
  official: boolean;
  // What the current attempt's finish recorded (main.ts attemptRecord):
  // null while it is unfinished.
  record: SolveRecord | null;
  // K146: the attempt began (or, unstarted, would begin) after its day.
  late: boolean;
}

// Which badge the state calls for.
export function modeBadgeFor(s: ModeBadgeState): ModeBadgeKind {
  if (s.daily === null) return "free";
  // A finish recorded: what it recorded. "official" = this attempt IS the
  // score.
  if (s.record === "official") return "daily";
  if (s.record === "practice") return "practice";
  if (s.record === "replay") return "replay";
  // Unfinished. A day whose official result exists (recorded earlier, in
  // another tab, or by this tab before a reset) is a replay, as the store
  // records it (DailyStore.recordSolve); one begun after its day practice.
  if (s.official) return "replay";
  return s.late ? "practice" : "daily";
}

export interface ModeBadgeText {
  // The label, a shorter one for tight screens, one word for tighter ones
  // (a phone with the HUD's stat rows on: "Daily #3 replay" left only the
  // icon there), and the tooltip (also the aria-label, and for the replay
  // and practice badges the toast a tap shows).
  long: string;
  short: string;
  tiny: string;
  tip: string;
}

// `solved`: the daily badge's attempt set the official result.
export function modeBadgeText(
  kind: ModeBadgeKind,
  daily: number | null,
  today: number,
  solved = false
): ModeBadgeText {
  if (kind === "free") {
    return {
      long: "Free play",
      short: "Free play",
      tiny: "Free play",
      tip:
        "Free play: this isn't today's daily, so it won't count toward " +
        `your daily stats. Tap to leave it for today's daily, #${today}.`,
    };
  }
  const name = daily === null ? "this daily" : `Daily #${daily}`;
  const date = daily !== null && daily !== today ? formatDayDate(daily) : null;
  if (kind === "daily") {
    let long = name;
    if (date !== null) long += ` · ${date}`;
    if (solved) long += " · solved";
    const what = solved
      ? `${name}: this run is its official result.`
      : `${name}${date !== null ? `, the maze for ${date}` : ""}: ` +
        "your first finish is its official result.";
    return {
      long,
      short: name,
      tiny: name,
      tip: `${what} Tap for your daily stats.`,
    };
  }
  if (kind === "replay") {
    return {
      long: `${name} replay · not scored`,
      short: `${name} replay`,
      tiny: "Replay",
      tip:
        `Replay, not scored: your first finish of ${name} is its official ` +
        "result, and this run won't change it.",
    };
  }
  return {
    long: `${name} practice · not scored`,
    short: `${name} practice`,
    tiny: "Practice",
    tip:
      `Practice, not scored: ${name} was the maze for ` +
      `${date ?? "another day"}. A run begun after its day stays out of ` +
      "your daily stats; your history keeps it as practice.",
  };
}

// Inline icons (currentColor): a compass for free play, a chart for the
// daily (a tap opens the stats), a circling arrow for a replay, a calendar
// for practice (another day's maze).
const ICONS: Record<ModeBadgeKind, string> = {
  free:
    '<svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5"/>' +
    '<path fill="currentColor" d="M11 5 9.1 9.1 5 11 6.9 6.9z"/></svg>',
  daily:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" ' +
    'd="M2 13h12v1.5H2zM3 8h2.4v4H3zm3.8-4h2.4v8H6.8zm3.8 2H13v6h-2.4z"/></svg>',
  replay:
    '<svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" d="M4 5.6A5 5 0 1 0 8.5 3.5"/>' +
    '<path fill="currentColor" d="M6.3 3.3 8.9 1.4 8.5 5.6z"/></svg>',
  practice:
    '<svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<rect x="2.2" y="3.2" width="11.6" height="10.8" rx="1.8" fill="none" ' +
    'stroke="currentColor" stroke-width="1.4"/>' +
    '<path fill="currentColor" d="M2.5 6.2h11v1.4h-11zM4.8 1.5h1.5v3.2H4.8z' +
    'm4.9 0h1.5v3.2H9.7zM5 9.2h2v2H5z"/></svg>',
};

// K151: the X a tap that leaves the mode wears (decoration: the whole pill
// is the button).
const X_ICON =
  '<svg class="km-mode-x" viewBox="0 0 16 16" aria-hidden="true">' +
  '<path fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" d="M4.5 4.5l7 7m0-7-7 7"/></svg>';

let styled = false;
function ensureBadgeStyles(): void {
  if (styled) return;
  styled = true;
  const sans = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const style = document.createElement("style");
  style.textContent =
    // A pill just left of the hamburger (42 px square at max(10px, safe
    // area) from the top-right corner), vertically centered on it; fit()
    // picks the label width.
    ".km-mode{position:fixed;z-index:30;box-sizing:border-box;margin:0;" +
    "top:calc(max(10px,env(safe-area-inset-top)) + 5px);" +
    "right:calc(max(10px,env(safe-area-inset-right)) + 50px);" +
    "height:32px;display:inline-flex;align-items:center;gap:6px;" +
    "padding:0 12px 0 9px;border-radius:16px;white-space:nowrap;" +
    `font:600 12px/1 ${sans};cursor:pointer;` +
    "box-shadow:0 2px 8px #00000059;animation:km-mode-in .25s ease-out;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-mode[hidden]{display:none}" +
    ".km-mode svg{width:15px;height:15px;flex:0 0 auto;display:block}" +
    // K151: the free pill ends in the X (always shown, K200), so its own
    // right padding is a little smaller.
    ".km-mode .km-mode-x{width:11px;height:11px;margin-left:-1px}" +
    ".km-mode.km-free{padding-right:10px}" +
    ".km-mode .km-mode-s,.km-mode .km-mode-t{display:none}" +
    ".km-mode.km-fit-short .km-mode-l{display:none}" +
    ".km-mode.km-fit-short .km-mode-s{display:inline}" +
    ".km-mode.km-fit-tiny .km-mode-l,.km-mode.km-fit-tiny .km-mode-s" +
    "{display:none}" +
    ".km-mode.km-fit-tiny .km-mode-t{display:inline}" +
    ".km-mode.km-fit-icon .km-mode-l,.km-mode.km-fit-icon .km-mode-s," +
    ".km-mode.km-fit-icon .km-mode-t,.km-mode.km-fit-icon .km-mode-x" +
    "{display:none}" +
    ".km-mode.km-fit-icon{width:32px;padding:0;justify-content:center}" +
    // Last resort on very narrow screens: the icon below the hamburger.
    ".km-mode.km-fit-low{top:calc(max(10px,env(safe-area-inset-top)) + 50px);" +
    "right:max(10px,env(safe-area-inset-right))}" +
    // Free play: neutral slate. The daily: the HUD's gold on its navy (the
    // title row it replaces). A replay: muted amber. Practice: violet.
    ".km-mode.km-free{background:#1b2233eb;color:#c8d3e8;" +
    "border:1px solid #3a4a6a}" +
    ".km-mode.km-free svg{color:#9fb0cf}" +
    ".km-mode.km-free:hover{background:#26314aeb}" +
    ".km-mode.km-free:hover .km-mode-x{color:#e4ecf8}" +
    ".km-mode.km-daily{background:#1b2233eb;color:#e7c56f;" +
    "border:1px solid #5e5233}" +
    ".km-mode.km-daily svg{opacity:.85}" +
    ".km-mode.km-daily:hover{background:#26314aeb}" +
    ".km-mode.km-replay{background:#2b2415eb;color:#e7c56f;" +
    "border:1px solid #74602c}" +
    ".km-mode.km-replay:hover{background:#372d19eb}" +
    ".km-mode.km-practice{background:#221f36eb;color:#b9a8f0;" +
    "border:1px solid #4d4380}" +
    ".km-mode.km-practice:hover{background:#2c2846eb}" +
    ".km-mode:focus-visible{outline:2px solid #8fe6ff;outline-offset:2px}" +
    "@keyframes km-mode-in{from{opacity:0}to{opacity:1}}" +
    // Static under reduced motion (the Motion setting, ui/motion.ts).
    whenReduced(".km-mode", "animation:none") +
    // Touch: the hamburger's full height, a finger-sized target.
    "@media (pointer:coarse){" +
    ".km-mode{top:max(10px,env(safe-area-inset-top));height:42px;" +
    "border-radius:21px;padding:0 15px 0 12px;font-size:13px}" +
    ".km-mode.km-free{padding-right:13px}" +
    ".km-mode .km-mode-x{width:12px;height:12px}" +
    ".km-mode.km-fit-icon{width:42px;padding:0}}";
  document.head.appendChild(style);
}

// How close (CSS px) the badge may come to the HUD or the banner.
const FIT_GAP = 8;
// Label levels, longest first: the classes each one sets.
const LEVELS: ReadonlyArray<readonly string[]> = [
  [],
  ["km-fit-short"],
  ["km-fit-tiny"],
  ["km-fit-icon"],
  ["km-fit-icon", "km-fit-low"],
];
const LEVEL_CLASSES = ["km-fit-short", "km-fit-tiny", "km-fit-icon", "km-fit-low"];

export interface ModeBadgeActions {
  // Free play's tap: today's daily (the panel's Daily button).
  free: () => void;
  // The daily's tap: the daily stats.
  daily: () => void;
  // A replay's or practice run's tap: explain it (the tip, as a toast).
  explain: (tip: string) => void;
}

export class ModeBadge {
  readonly el: HTMLButtonElement;
  private readonly actions: ModeBadgeActions;
  private kindShown: ModeBadgeKind | null = null;
  private tip = "";
  private sig = "";

  constructor(actions: ModeBadgeActions) {
    ensureBadgeStyles();
    this.actions = actions;
    this.el = document.createElement("button");
    this.el.type = "button";
    this.el.id = "mode-badge";
    this.el.className = "km-mode";
    this.el.hidden = true;
    this.el.addEventListener("click", () => {
      const k = this.kindShown;
      if (k === "free") this.actions.free();
      else if (k === "daily") this.actions.daily();
      else if (k !== null) this.actions.explain(this.tip);
    });
    document.body.appendChild(this.el);
  }

  // The badge on screen (null = none).
  get kind(): ModeBadgeKind | null {
    return this.kindShown;
  }

  // Show `kind` (null hides it); rebuilds only when something changed.
  // `solved`: the daily badge's attempt set the official result.
  set(
    kind: ModeBadgeKind | null,
    daily: number | null,
    today: number,
    solved = false
  ): void {
    const sig = kind === null ? "" : `${kind}|${daily}|${today}|${solved}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.kindShown = kind;
    if (kind === null) {
      this.el.hidden = true;
      return;
    }
    const t = modeBadgeText(kind, daily, today, solved);
    this.tip = t.tip;
    this.el.className = `km-mode km-${kind}`;
    this.el.title = t.tip;
    this.el.setAttribute("aria-label", t.tip);
    this.el.innerHTML = ICONS[kind];
    const long = document.createElement("span");
    long.className = "km-mode-l";
    long.textContent = t.long;
    const short = document.createElement("span");
    short.className = "km-mode-s";
    short.textContent = t.short;
    const tiny = document.createElement("span");
    tiny.className = "km-mode-t";
    tiny.textContent = t.tiny;
    this.el.append(long, short, tiny);
    // The tap leaves the mode: an X says so (K151).
    if (kind === "free") this.el.insertAdjacentHTML("beforeend", X_ICON);
    this.el.hidden = false;
  }

  // The longest label that keeps the badge FIT_GAP clear of `avoid` (the
  // HUD, the win banner) and on screen; the last level stands if none is.
  fit(avoid: ReadonlyArray<Element | null>): void {
    if (this.el.hidden) return;
    const boxes: DOMRect[] = [];
    for (const e of avoid) {
      if (!e) continue;
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) boxes.push(r);
    }
    for (const level of LEVELS) {
      this.el.classList.remove(...LEVEL_CLASSES);
      this.el.classList.add(...level);
      const b = this.el.getBoundingClientRect();
      const clear =
        b.left >= FIT_GAP &&
        !boxes.some(
          (r) =>
            b.left < r.right + FIT_GAP &&
            b.right > r.left - FIT_GAP &&
            b.top < r.bottom + FIT_GAP &&
            b.bottom > r.top - FIT_GAP
        );
      if (clear) return;
    }
  }
}
