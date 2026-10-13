// MODE BADGE (K73, Levi 2026-10-12): a small pill just left of the
// settings button, shown whenever the solve on screen does NOT count
// toward the daily stats:
// - FREE PLAY: an ordinary design, not a daily. A tap does what the
//   panel's Daily button does (today's daily).
// - REPLAY: a daily whose official result is already recorded - the
//   first finish counts, later runs are replays. A tap explains it in a
//   toast (touch has no hover to show the tooltip).
// Nothing shows during the official attempt itself, or once that attempt
// has set the official result. modeBadgeFor (pure, unit-tested) decides;
// main.ts feeds it the daily on screen, the store's official result and
// what this attempt's finish recorded.
//
// PLACEMENT: top-right, left of the hamburger, inside the safe area, at
// the hamburger's height on touch screens (a finger-sized target). The
// HUD owns the top-left and the win banner the top-center on wide screens:
// wherever the badge would come within FIT_GAP of either, fit() steps down
// to a shorter label, then the bare icon, then the icon below the menu
// button. Static under reduced motion (otherwise a short fade-in).

import { ensureHudStyles } from "./maze_hud";

export type ModeBadgeKind = "free" | "replay";

export interface ModeBadgeState {
  // The daily on screen (main.ts dailyN), or null for an ordinary design.
  daily: number | null;
  // That daily's official result is recorded (DailyStore.hasOfficial).
  official: boolean;
  // What the current attempt's finish recorded (main.ts attemptRecord):
  // null while it is unfinished.
  record: "official" | "replay" | null;
}

// Which badge the state calls for, or null for none.
export function modeBadgeFor(s: ModeBadgeState): ModeBadgeKind | null {
  if (s.daily === null) return "free";
  // This attempt's own finish set the official result: it IS the score.
  if (s.record === "official") return null;
  // A finished replay, or a run on a day whose official result exists
  // (recorded earlier, in another tab, or by this tab before a reset).
  if (s.record === "replay" || s.official) return "replay";
  // The official attempt, unfinished.
  return null;
}

export interface ModeBadgeText {
  // The label, a shorter one for tight screens, and the tooltip (also the
  // aria-label, and for the replay badge the toast a tap shows).
  long: string;
  short: string;
  tip: string;
}

export function modeBadgeText(
  kind: ModeBadgeKind,
  daily: number | null,
  today: number
): ModeBadgeText {
  if (kind === "free") {
    return {
      long: "Free play",
      short: "Free play",
      tip:
        "Free play: this isn't today's daily, so it won't count toward " +
        `your daily stats. Tap to play today's daily, #${today}.`,
    };
  }
  const day = daily === null ? "this daily" : `Daily #${daily}`;
  return {
    long: "Replay · not scored",
    short: "Replay",
    tip:
      `Replay, not scored: your first finish of ${day} is its official ` +
      "result, and this run won't change it.",
  };
}

// Inline icons (currentColor): a compass for free play, a circling arrow
// for a replay.
const ICONS: Record<ModeBadgeKind, string> = {
  free:
    '<svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5"/>' +
    '<path fill="currentColor" d="M11 5 9.1 9.1 5 11 6.9 6.9z"/></svg>',
  replay:
    '<svg viewBox="0 0 16 16" aria-hidden="true">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" d="M4 5.6A5 5 0 1 0 8.5 3.5"/>' +
    '<path fill="currentColor" d="M6.3 3.3 8.9 1.4 8.5 5.6z"/></svg>',
};

// How close (CSS px) the badge may come to the HUD or the banner.
const FIT_GAP = 8;
// Label levels, longest first: the classes each one sets.
const LEVELS: ReadonlyArray<readonly string[]> = [
  [],
  ["km-fit-short"],
  ["km-fit-icon"],
  ["km-fit-icon", "km-fit-low"],
];
const LEVEL_CLASSES = ["km-fit-short", "km-fit-icon", "km-fit-low"];

export class ModeBadge {
  readonly el: HTMLButtonElement;
  private readonly onFree: () => void;
  private readonly onReplay: (tip: string) => void;
  private kindShown: ModeBadgeKind | null = null;
  private tip = "";
  private sig = "";

  constructor(onFree: () => void, onReplay: (tip: string) => void) {
    ensureHudStyles();
    this.onFree = onFree;
    this.onReplay = onReplay;
    this.el = document.createElement("button");
    this.el.type = "button";
    this.el.id = "mode-badge";
    this.el.className = "km-mode";
    this.el.hidden = true;
    this.el.addEventListener("click", () => {
      if (this.kindShown === "free") this.onFree();
      else if (this.kindShown === "replay") this.onReplay(this.tip);
    });
    document.body.appendChild(this.el);
  }

  // The badge on screen (null = none).
  get kind(): ModeBadgeKind | null {
    return this.kindShown;
  }

  // Show `kind` (null hides it); rebuilds only when something changed.
  set(kind: ModeBadgeKind | null, daily: number | null, today: number): void {
    const sig = kind === null ? "" : `${kind}|${daily}|${today}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.kindShown = kind;
    if (kind === null) {
      this.el.hidden = true;
      return;
    }
    const t = modeBadgeText(kind, daily, today);
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
    this.el.append(long, short);
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
