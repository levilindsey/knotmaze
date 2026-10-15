// The fabric maze's on-screen readouts (K19, K20): the HUD in the top-left
// corner and the win banner. Plain DOM over the canvas; main.ts owns the
// game state and hands these a snapshot.
//
// HUD: label/value rows. Rows appear only where they mean something:
// efficiency once solved, backtracked outside trail mode, dead ends with
// deadEnds on. It ignores the pointer (taps on the maze underneath still
// land). The daily's title row, a button that opened the daily stats, moved
// to the mode badge (K151, ui/mode_badge.ts).
//
// The win banner shows K155's stars under its heading (starsWidget: a tap
// opens what each star needs and where the run landed; hover shows it too).

import { efficiencyPercent, formatDuration } from "../game/maze_stats";
import { starExplanation, starLabel } from "../game/star_rating";
import type { StarRating } from "../game/star_rating";

export interface HudSnapshot {
  // The stats rows (the showMazeStats setting).
  showStats: boolean;
  timeMs: number;
  path: number; // lattice units
  optimal: number;
  // optimal / path - only for a finished route (null hides the row).
  efficiency: number | null;
  backtrack: number | null; // null in trail mode (no backtracking)
  junctions: number;
  deadEnds: number | null; // null with deadEnds off
  // K80's real-time mode (absent elsewhere): the minotaur's catches, and
  // the time it spent hunting the player (the win banner's).
  catches?: number | null;
  chasedMs?: number | null;
  // K114's burn race (absent elsewhere; lattice units): the fire's lead at
  // your junction while the race runs, T(v) - L, and the closest call (the
  // smallest lead at any arrival) once it is over.
  fireLead?: number | null;
  closestCall?: number | null;
}

// Distances read x10 as whole numbers, as the HUD always has.
export const fmtDist = (v: number): string =>
  Number.isFinite(v) ? String(Math.round(v * 10)) : "—";

// The stat rows (label, value) the HUD and the win banner both show, in
// one order. A null field drops its row.
type StatFields = Pick<
  HudSnapshot,
  | "timeMs" | "path" | "optimal" | "efficiency" | "backtrack" | "junctions" | "deadEnds"
  | "catches" | "chasedMs" | "fireLead" | "closestCall"
>;

// The rows that are part of the game, not stats (K80's catches, K114's
// fire): the HUD shows them with the stat rows off too.
type GameFields = Pick<HudSnapshot, "catches" | "fireLead" | "closestCall">;
export function gameRows(s: GameFields): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (s.catches != null) rows.push(["caught", String(s.catches)]);
  if (s.fireLead != null) rows.push(["fire lead", fmtDist(s.fireLead)]);
  if (s.closestCall != null) rows.push(["closest call", fmtDist(s.closestCall)]);
  return rows;
}

export function statRows(s: StatFields): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  rows.push(["time", formatDuration(s.timeMs)]);
  rows.push(["path / optimal", `${fmtDist(s.path)} / ${fmtDist(s.optimal)}`]);
  if (s.efficiency !== null) {
    rows.push(["efficiency", `${efficiencyPercent(s.efficiency)}%`]);
  }
  if (s.backtrack !== null) rows.push(["backtracked", fmtDist(s.backtrack)]);
  rows.push(["junctions", String(s.junctions)]);
  if (s.deadEnds !== null) rows.push(["dead ends", String(s.deadEnds)]);
  if (s.catches != null) rows.push(["caught", String(s.catches)]);
  if (s.chasedMs != null) rows.push(["chased", formatDuration(s.chasedMs)]);
  if (s.fireLead != null) rows.push(["fire lead", fmtDist(s.fireLead)]);
  if (s.closestCall != null) rows.push(["closest call", fmtDist(s.closestCall)]);
  return rows;
}

let styled = false;
export function ensureHudStyles(): void {
  if (styled) return;
  styled = true;
  const mono = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
  const sans = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const style = document.createElement("style");
  style.textContent =
    // HUD.
    ".km-hud{position:fixed;top:max(10px,env(safe-area-inset-top));" +
    "left:max(10px,env(safe-area-inset-left));z-index:20;" +
    "padding:6px 11px 7px;background:#1b2233d9;color:#c8d3e8;" +
    `font:12px/1.55 ${mono};border:1px solid #2c3a55;border-radius:7px;` +
    "pointer-events:none;display:grid;grid-template-columns:auto auto;" +
    "column-gap:16px;max-width:calc(100vw - 84px)}" +
    ".km-hud[hidden]{display:none}" +
    ".km-hud .k{color:#8ea0c0;white-space:nowrap}" +
    ".km-hud .v{color:#e4ecf8;text-align:right;white-space:nowrap;" +
    "font-variant-numeric:tabular-nums}" +
    // Win banner: top-center on wide screens, bottom-center on narrow ones
    // (clear of the HUD in the top-left and the menu in the top-right).
    ".km-banner{position:fixed;left:50%;transform:translateX(-50%);" +
    "top:max(14px,env(safe-area-inset-top));z-index:25;width:max-content;" +
    "max-width:min(440px,calc(100vw - 24px));box-sizing:border-box;" +
    "padding:12px 18px;background:#1b2233f2;color:#c8d3e8;" +
    `font:13px/1.5 ${mono};border:1px solid #39d353;border-radius:10px;` +
    "box-shadow:0 6px 24px #0008;text-align:center}" +
    ".km-banner[hidden]{display:none}" +
    // The heading stays centered and clear of the close button.
    `.km-banner .km-head{font:650 15px/1.35 ${sans};color:#8fe6ff;` +
    "margin-bottom:6px;padding:0 20px}" +
    // K114: the Burnt banner (LossBanner).
    ".km-banner.km-burnt{border-color:#e8643c}" +
    ".km-banner.km-burnt .km-head{color:#ffb27a}" +
    `.km-banner .km-sub{font:12px/1.45 ${sans};color:#8ea0c0;margin:0 0 8px}` +
    ".km-banner .km-rows{display:grid;grid-template-columns:1fr auto;" +
    "column-gap:24px;text-align:left}" +
    ".km-banner .k{color:#8ea0c0;white-space:nowrap}" +
    ".km-banner .v{color:#e4ecf8;text-align:right;white-space:nowrap;" +
    "font-variant-numeric:tabular-nums}" +
    ".km-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;" +
    "margin-top:10px}" +
    ".km-btn{min-height:32px;padding:0 14px;border-radius:7px;" +
    "border:1px solid #3a4a6a;background:#26314a;color:#e4ecf8;" +
    `font:600 13px/1 ${sans};cursor:pointer;` +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-btn:hover{background:#2f3d5c}" +
    ".km-btn.km-primary{background:#e7c56f;border-color:#e7c56f;" +
    "color:#1b2233}" +
    ".km-btn.km-primary:hover{background:#f0d488}" +
    ".km-btn:focus-visible,.km-x:focus-visible{outline:2px solid #8fe6ff;" +
    "outline-offset:2px}" +
    ".km-x{position:absolute;top:4px;right:4px;width:30px;height:30px;" +
    "border:0;border-radius:6px;background:none;color:#8ea0c0;" +
    "font:18px/1 sans-serif;cursor:pointer}" +
    ".km-x:hover{color:#e4ecf8;background:#ffffff12}" +
    // K155 stars: a button (a tap explains them; phones have no hover)
    // and the explanation it opens. Shared by the banner and the stats.
    ".km-stars{display:inline-flex;align-items:center;gap:6px;margin:0 0 6px;" +
    "padding:2px 8px;border:0;border-radius:7px;background:none;" +
    `cursor:pointer;color:#e7c56f;font:22px/1.1 ${sans};letter-spacing:2px;` +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-stars:hover{background:#ffffff0d}" +
    ".km-stars .off{color:#4a5672}" +
    ".km-stars svg{width:15px;height:15px;color:#8ea0c0;flex:0 0 auto}" +
    ".km-stars:focus-visible{outline:2px solid #8fe6ff;outline-offset:2px}" +
    ".km-why{margin:0 0 8px;padding:7px 10px;border-radius:7px;" +
    `background:#222b40;text-align:left;font:12px/1.5 ${sans};color:#8ea0c0}` +
    ".km-why[hidden]{display:none}" +
    ".km-why .km-hit{color:#e7c56f;font-weight:650}" +
    ".km-why .km-you{color:#e4ecf8;margin-top:4px}" +
    "@media (max-width:900px){.km-banner{top:auto;" +
    "bottom:max(14px,env(safe-area-inset-bottom))}}" +
    // Toast (ui/share.ts).
    // (max-content: a fixed box at left:50% would otherwise wrap at half
    // the screen - the mode badge's explanation is a long toast.)
    ".km-toast{position:fixed;left:50%;bottom:max(18px," +
    "env(safe-area-inset-bottom));transform:translate(-50%,8px);z-index:60;" +
    "box-sizing:border-box;width:max-content;" +
    "max-width:min(460px,calc(100vw - 32px));text-align:center;" +
    "padding:8px 14px;border-radius:8px;background:#e4ecf8;color:#1b2233;" +
    `font:600 13px/1.3 ${sans};opacity:0;pointer-events:none;` +
    "transition:opacity .2s,transform .2s}" +
    ".km-toast.km-toast-on{opacity:1;transform:translate(-50%,0)}" +
    // (The mode badge styles itself: ui/mode_badge.ts.)
    "@media (pointer:coarse){.km-hud{font-size:13px}.km-btn{min-height:40px}}";
  document.head.appendChild(style);
}

// An "i" in a circle: the stars explain themselves when tapped.
const INFO_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.8" ' +
  'fill="none" stroke="currentColor" stroke-width="1.4"/><path ' +
  'fill="currentColor" d="M7.2 7h1.6v4.6H7.2zM8 4.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>';

let whyIds = 0;

// K155: a run's stars as a button that opens its explanation (what each
// star needs, where this run landed; the tier earned is highlighted), with
// the same text on hover. Returns the button and the panel, to place.
export function starsWidget(r: StarRating): [HTMLButtonElement, HTMLDivElement] {
  const lines = starExplanation(r);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "km-stars";
  const on = document.createElement("span");
  on.textContent = "★".repeat(r.stars);
  const off = document.createElement("span");
  off.className = "off";
  off.textContent = "☆".repeat(3 - r.stars);
  btn.append(on, off);
  btn.insertAdjacentHTML("beforeend", INFO_ICON);
  btn.title = lines.join("\n");
  btn.setAttribute("aria-label", `${starLabel(r.stars)} - how stars work`);
  const why = document.createElement("div");
  why.className = "km-why";
  why.id = `km-why-${++whyIds}`;
  why.hidden = true;
  lines.forEach((text, i) => {
    const d = document.createElement("div");
    // The rules come first, best tier first; the last line is this run.
    d.className = i === lines.length - 1 ? "km-you" : i === 3 - r.stars ? "km-hit" : "";
    d.textContent = text;
    why.appendChild(d);
  });
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", why.id);
  btn.addEventListener("click", () => {
    why.hidden = !why.hidden;
    btn.setAttribute("aria-expanded", String(!why.hidden));
  });
  return [btn, why];
}

export class MazeHud {
  readonly el: HTMLDivElement;
  private timeCell: HTMLElement | null = null;
  private lastSig = "";

  constructor() {
    ensureHudStyles();
    this.el = document.createElement("div");
    this.el.id = "maze-hud";
    this.el.className = "km-hud";
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  // Draw a snapshot (null hides the HUD). Rebuilds the rows only when
  // their set or values change; the ticking time takes setTime().
  render(s: HudSnapshot | null): void {
    // K80: the real-time mode's catch count is part of the game, not a
    // stat: its row shows with the stat rows off too (K114: and the fire's).
    const game = s ? gameRows(s) : [];
    if (!s || (!s.showStats && game.length === 0)) {
      this.el.hidden = true;
      this.lastSig = "";
      return;
    }
    const rows: Array<[string, string]> = s.showStats ? statRows(s) : game;
    const sig = JSON.stringify(rows);
    this.el.hidden = false;
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.el.textContent = "";
    this.timeCell = null;
    for (const [k, v] of rows) {
      const kEl = document.createElement("span");
      kEl.className = "k";
      kEl.textContent = k;
      const vEl = document.createElement("span");
      vEl.className = "v";
      vEl.textContent = v;
      if (k === "time") this.timeCell = vEl;
      this.el.append(kEl, vEl);
    }
  }

  // The running clock (cheap: one text node, only when the second changes).
  setTime(ms: number): void {
    if (!this.timeCell || this.el.hidden) return;
    const t = formatDuration(ms);
    if (this.timeCell.textContent !== t) this.timeCell.textContent = t;
  }
}

export interface WinInfo {
  heading: string;
  timeMs: number;
  efficiency: number | null;
  path: number;
  optimal: number;
  backtrack: number | null;
  junctions: number;
  deadEnds: number | null;
  // K80's real-time mode: catches and time chased (absent elsewhere).
  catches?: number | null;
  chasedMs?: number | null;
  // K114's burn race: the closest call (absent elsewhere).
  closestCall?: number | null;
  // K155: the run's stars (null or absent: no rating, no stars).
  rating?: StarRating | null;
  // Show the daily stats button.
  stats: boolean;
}

export class WinBanner {
  readonly el: HTMLDivElement;
  private readonly onShare: () => void;
  private readonly onStats: () => void;
  // Called after every hide, the close button's too (main.ts re-fits the
  // mode badge into the room the banner leaves).
  private readonly onHide: () => void;

  constructor(onShare: () => void, onStats: () => void, onHide = (): void => {}) {
    ensureHudStyles();
    this.onShare = onShare;
    this.onStats = onStats;
    this.onHide = onHide;
    this.el = document.createElement("div");
    this.el.id = "maze-banner";
    this.el.className = "km-banner";
    this.el.setAttribute("role", "status");
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  show(w: WinInfo): void {
    const el = this.el;
    el.textContent = "";
    const head = document.createElement("div");
    head.className = "km-head";
    head.textContent = `${w.heading} \u{1F389}`;
    el.appendChild(head);
    // K155: the stars under the heading; a tap opens their explanation.
    if (w.rating) el.append(...starsWidget(w.rating));
    // One stat per row, label at the left edge and value at the right, as
    // in the HUD.
    const rows = document.createElement("div");
    rows.className = "km-rows";
    for (const [k, v] of statRows(w)) {
      const kEl = document.createElement("span");
      kEl.className = "k";
      kEl.textContent = k;
      const vEl = document.createElement("span");
      vEl.className = "v";
      vEl.textContent = v;
      rows.append(kEl, vEl);
    }
    const btns = document.createElement("div");
    btns.className = "km-btns";
    const share = document.createElement("button");
    share.type = "button";
    share.className = "km-btn km-primary";
    share.textContent = "Share";
    share.addEventListener("click", () => this.onShare());
    btns.appendChild(share);
    if (w.stats) {
      const stats = document.createElement("button");
      stats.type = "button";
      stats.className = "km-btn";
      stats.textContent = "Stats";
      stats.addEventListener("click", () => this.onStats());
      btns.appendChild(stats);
    }
    const x = document.createElement("button");
    x.type = "button";
    x.className = "km-x";
    x.textContent = "×";
    x.title = "Close";
    x.setAttribute("aria-label", "Close");
    x.addEventListener("click", () => this.hide());
    el.append(rows, btns, x);
    el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
    this.onHide();
  }

  get shown(): boolean {
    return !this.el.hidden;
  }
}

// K114 call 1: a lost burn race. Lattice units, as the HUD's.
export interface LossInfo {
  timeMs: number;
  walked: number;
  // The smallest lead the fire left you at any arrival (Infinity: none).
  closest: number;
}

// The Burnt banner: where the win banner sits, an ember border, one
// primary button (Try again: main.ts restarts with the fuse relit) and the
// close button.
export class LossBanner {
  readonly el: HTMLDivElement;
  private readonly onRetry: () => void;
  private readonly onHide: () => void;

  constructor(onRetry: () => void, onHide = (): void => {}) {
    ensureHudStyles();
    this.onRetry = onRetry;
    this.onHide = onHide;
    this.el = document.createElement("div");
    this.el.id = "maze-loss";
    this.el.className = "km-banner km-burnt";
    this.el.setAttribute("role", "status");
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  show(l: LossInfo): void {
    const el = this.el;
    el.textContent = "";
    const head = document.createElement("div");
    head.className = "km-head";
    head.textContent = "Burnt \u{1F525}";
    const why = document.createElement("div");
    why.className = "km-sub";
    why.textContent = "The fire reaches the end of every way on before you.";
    const rows = document.createElement("div");
    rows.className = "km-rows";
    const pairs: Array<[string, string]> = [
      ["time", formatDuration(l.timeMs)],
      ["walked", fmtDist(l.walked)],
      ["closest call", fmtDist(l.closest)],
    ];
    for (const [k, v] of pairs) {
      const kEl = document.createElement("span");
      kEl.className = "k";
      kEl.textContent = k;
      const vEl = document.createElement("span");
      vEl.className = "v";
      vEl.textContent = v;
      rows.append(kEl, vEl);
    }
    const btns = document.createElement("div");
    btns.className = "km-btns";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "km-btn km-primary";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => {
      this.hide();
      this.onRetry();
    });
    btns.appendChild(retry);
    const x = document.createElement("button");
    x.type = "button";
    x.className = "km-x";
    x.textContent = "×";
    x.title = "Close";
    x.setAttribute("aria-label", "Close");
    x.addEventListener("click", () => this.hide());
    el.append(head, why, rows, btns, x);
    el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
    this.onHide();
  }

  get shown(): boolean {
    return !this.el.hidden;
  }
}
