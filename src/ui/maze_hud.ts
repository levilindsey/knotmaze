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
// K274: the same popover goes on to say what each number in the banner's
// rows means, from game/maze_stats.ts's STATS table; every row is built as a
// StatEntry keyed by that table, so a row cannot exist without its line.

import { efficiencyPercent, explainedStats, formatDuration, STATS } from "../game/maze_stats";
import type { StatId } from "../game/maze_stats";
import { starExplanation, starLabel } from "../game/star_rating";
import type { StarRating } from "../game/star_rating";
import type { WalkerScore } from "../game/walker";
import type { SwordPhase } from "../game/sword";
import { spoolGauge } from "../game/spool";

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
  // K80 turns stage 2 (absent or null elsewhere): the turn minotaur's close
  // calls and turns seen; on both clocks the Reset-path restarts under a
  // minotaur (the row shows only above 0).
  closeCalls?: number | null;
  seen?: number | null;
  restarts?: number | null;
  // K114's burn race (absent elsewhere; lattice units): the fire's lead at
  // your junction while the race runs, T(v) - L, and the closest call (the
  // smallest lead at any arrival) once it is over.
  fireLead?: number | null;
  closestCall?: number | null;
  // K137 (absent elsewhere): the runs broken so far (fragile runs on);
  // strict par's par and the moves left; the strokes mode's strokes and par.
  snapped?: number | null;
  parLeft?: { par: number; left: number } | null;
  parStrokes?: { par: number; strokes: number } | null;
  // K139 (absent elsewhere): collapse's score, a whole percent, and its par
  // as text (game/collapse.ts parText: "≥N%" when the search gave up).
  collapse?: { pct: number; par: string } | null;
  // K114 (absent elsewhere): the runs cut so far, while the cut is on.
  cuts?: number | null;
  // K137 stage 3a (absent elsewhere): the hearts left of the lives setting,
  // while lives are on under a minotaur.
  hearts?: { left: number; of: number } | null;
  // K114 walker (absent elsewhere): Lead's par, Delay's walk and the walk
  // it wanted.
  walker?: WalkerScore | null;
  // K137 stage 3b (absent elsewhere): the sword, while it is on and laid.
  sword?: SwordShown | null;
  // K137 stage 3c (absent elsewhere): sprint's row value (game/sprint.ts
  // sprintValue), while sprint is on under a chase.
  sprint?: string | null;
  // K137 stage 2 (absent elsewhere): the spool while it is on (runs paid
  // out of its capacity) and the hints left while hints are on; the win
  // banner's share of the spool used (a whole percent) and hints used.
  spool?: { used: number; cap: number } | null;
  hints?: { left: number; of: number } | null;
  spoolUsed?: number | null;
  hintsUsed?: number | null;
  // K138 (absent elsewhere): the rules row ("ice 25% · cycle"), the
  // turnstiles laid, and the hidden runs found of those laid with the
  // fewest moves without and with them.
  rules?: string | null;
  turnstiles?: number | null;
  hidden?: HiddenShown | null;
}

// K138 stage 2: what the hidden row reads.
export interface HiddenShown {
  found: number;
  of: number;
  fewest: number;
  withAll: number;
}

// K138 stage 2: "1 / 2 found · fewest 16, 14 with them" (a dash for no way).
export function hiddenValue(h: HiddenShown): string {
  return `${h.found} / ${h.of} found \u00B7 fewest ${fmtPar(h.fewest)}, ${fmtPar(h.withAll)} with them`;
}

// K137 stage 3b: what the sword row reads (game/sword.ts SwordState).
export interface SwordShown {
  phase: SwordPhase;
  left: number;
  slainAt: number;
}

// "ready", "5 left", "used" or "slain on move 9".
export function swordValue(s: SwordShown): string {
  if (s.phase === "fleeing") return `${s.left} left`;
  if (s.phase === "slain") return `slain on move ${s.slainAt}`;
  return s.phase;
}

// Distances read x10 as whole numbers, as the HUD always has.
export const fmtDist = (v: number): string =>
  Number.isFinite(v) ? String(Math.round(v * 10)) : "—";

// The stat rows (label, value) the HUD and the win banner both show, in
// one order. A null field drops its row.
type StatFields = Pick<
  HudSnapshot,
  | "timeMs" | "path" | "optimal" | "efficiency" | "backtrack" | "junctions" | "deadEnds"
  | "catches" | "chasedMs" | "fireLead" | "closestCall" | "closeCalls" | "seen"
  | "restarts" | "snapped" | "parLeft" | "parStrokes" | "collapse" | "cuts"
  | "hearts" | "walker" | "sword" | "spool" | "hints" | "spoolUsed" | "hintsUsed"
  | "sprint"
>;

// A row (K274): its id names its line in STATS (game/maze_stats.ts), which
// also holds the label, so the label shown and the line explaining it never
// part. Every row the HUD and the banners show is built through `entry`.
export interface StatEntry {
  id: StatId;
  label: string;
  value: string;
}

const entry = (id: StatId, value: string): StatEntry => ({ id, label: STATS[id].label, value });

// The rows that are part of the game, not stats (K80's catches, K114's
// fire): the HUD shows them with the stat rows off too.
type GameFields = Pick<
  HudSnapshot,
  | "catches" | "fireLead" | "closestCall" | "snapped" | "parLeft" | "parStrokes" | "collapse"
  | "cuts" | "hearts" | "walker" | "sword" | "spool" | "hints" | "spoolUsed" | "hintsUsed"
  | "sprint"
>;
// K137 stage 3a: "hearts 2 / 3" while lives are on.
const heartsValue = (h: { left: number; of: number }): string => `${h.left} / ${h.of}`;
export function gameEntries(s: GameFields): StatEntry[] {
  const rows: StatEntry[] = [];
  if (s.catches != null) rows.push(entry("caught", String(s.catches)));
  if (s.hearts) rows.push(entry("hearts", heartsValue(s.hearts)));
  if (s.sword) rows.push(entry("sword", swordValue(s.sword))); // K137 s3b
  if (s.sprint) rows.push(entry("sprint", s.sprint)); // K137 s3c
  if (s.fireLead != null) rows.push(entry("fireLead", fmtDist(s.fireLead)));
  if (s.closestCall != null) rows.push(entry("closestCall", fmtDist(s.closestCall)));
  rows.push(...ruleEntries(s)); // K137
  return rows;
}

export function statEntries(s: StatFields): StatEntry[] {
  const rows: StatEntry[] = [];
  rows.push(entry("time", formatDuration(s.timeMs)));
  rows.push(entry("path", `${fmtDist(s.path)} / ${fmtDist(s.optimal)}`));
  if (s.efficiency !== null) {
    rows.push(entry("efficiency", `${efficiencyPercent(s.efficiency)}%`));
  }
  if (s.backtrack !== null) rows.push(entry("backtracked", fmtDist(s.backtrack)));
  rows.push(entry("junctions", String(s.junctions)));
  if (s.deadEnds !== null) rows.push(entry("deadEnds", String(s.deadEnds)));
  if (s.catches != null) rows.push(entry("caught", String(s.catches)));
  if (s.hearts) rows.push(entry("hearts", heartsValue(s.hearts)));
  if (s.sword) rows.push(entry("sword", swordValue(s.sword))); // K137 s3b
  if (s.sprint) rows.push(entry("sprint", s.sprint)); // K137 s3c
  if (s.closeCalls != null) rows.push(entry("closeCalls", String(s.closeCalls)));
  if (s.seen != null) rows.push(entry("seen", String(s.seen)));
  if (s.chasedMs != null) rows.push(entry("chased", formatDuration(s.chasedMs)));
  if (s.restarts != null && s.restarts > 0) {
    rows.push(entry("restarts", String(s.restarts)));
  }
  if (s.fireLead != null) rows.push(entry("fireLead", fmtDist(s.fireLead)));
  if (s.closestCall != null) rows.push(entry("closestCall", fmtDist(s.closestCall)));
  rows.push(...ruleEntries(s)); // K137
  return rows;
}

const pairs = (rows: readonly StatEntry[]): Array<[string, string]> =>
  rows.map((r) => [r.label, r.value]);

export const gameRows = (s: GameFields): Array<[string, string]> => pairs(gameEntries(s));
export const statRows = (s: StatFields): Array<[string, string]> => pairs(statEntries(s));

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
    // K137 stage 2: the spool gauge's flash on a refused move.
    "@keyframes km-flash{0%,40%{color:#ff8a7a;text-shadow:0 0 6px #ff5a40}" +
    "100%{color:#e4ecf8;text-shadow:none}}" +
    ".km-hud .v.km-flash{animation:km-flash .7s ease-out}" +
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
    ".km-banner.km-rule{border-color:#d9b44a}" +
    ".km-banner.km-rule .km-head{color:#f0d488}" +
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
    // (K274: the popover also lists what the rows mean; on a short or
    // narrow screen it scrolls inside the banner rather than growing past it.)
    ".km-why{margin:0 0 8px;padding:7px 10px;border-radius:7px;" +
    `background:#222b40;text-align:left;font:12px/1.5 ${sans};color:#8ea0c0;` +
    "max-height:min(40vh,320px);overflow-y:auto;overscroll-behavior:contain}" +
    ".km-why[hidden]{display:none}" +
    ".km-why .km-hit{color:#e7c56f;font-weight:650}" +
    ".km-why .km-you{color:#e4ecf8;margin-top:4px}" +
    ".km-why .km-lines-head{margin-top:8px;padding-top:7px;" +
    "border-top:1px solid #39466a;color:#c8d3e8;font-weight:650}" +
    ".km-why .km-lines-head:first-child{margin-top:0;padding-top:0;border-top:0}" +
    ".km-why .km-stat{margin-top:4px}" +
    ".km-why .km-stat b{color:#c8d3e8;font-weight:650}" +
    // The info button of a banner with no stars to hang the popover on (the
    // Burnt banner): the stars button's icon and focus ring, as a text label.
    ".km-info{display:inline-flex;align-items:center;gap:6px;margin:0 0 6px;" +
    "padding:0 10px;min-height:32px;border:0;border-radius:7px;background:none;" +
    `cursor:pointer;color:#8ea0c0;font:12px/1.2 ${sans};` +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-info:hover{background:#ffffff0d}" +
    ".km-info svg{width:15px;height:15px;flex:0 0 auto}" +
    ".km-info:focus-visible{outline:2px solid #8fe6ff;outline-offset:2px}" +
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
    "@media (pointer:coarse){.km-hud{font-size:13px}.km-btn,.km-info{min-height:40px}}";
  document.head.appendChild(style);
}

// An "i" in a circle: the stars explain themselves when tapped.
const INFO_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.8" ' +
  'fill="none" stroke="currentColor" stroke-width="1.4"/><path ' +
  'fill="currentColor" d="M7.2 7h1.6v4.6H7.2zM8 4.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>';

let whyIds = 0;

// A popover's panel, hidden until its button is tapped (the button flips
// aria-expanded with it).
function popover(btn: HTMLButtonElement): HTMLDivElement {
  const why = document.createElement("div");
  why.className = "km-why";
  why.id = `km-why-${++whyIds}`;
  why.hidden = true;
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", why.id);
  btn.addEventListener("click", () => {
    why.hidden = !why.hidden;
    btn.setAttribute("aria-expanded", String(!why.hidden));
  });
  return why;
}

// K274: "What the numbers mean", one line per row, in the rows' order. The
// fire's lead is not a banner row (the HUD shows it while the race runs),
// but the closest call is its smallest value, so explainedStats adds it.
function appendStatLines(why: HTMLElement, rows: readonly StatEntry[]): void {
  if (rows.length === 0) return;
  const head = document.createElement("div");
  head.className = "km-lines-head";
  head.textContent = "What the numbers mean";
  why.appendChild(head);
  for (const id of explainedStats(rows.map((r) => r.id))) {
    const d = document.createElement("div");
    d.className = "km-stat";
    const name = document.createElement("b");
    name.textContent = STATS[id].label;
    d.append(name, ` ${STATS[id].line}`);
    why.appendChild(d);
  }
}

// K155: a run's stars as a button that opens its explanation (what each
// star needs, where this run landed; the tier earned is highlighted), with
// the same text on hover. K274: given the banner's rows, the same popover
// goes on to say what each of them means. Returns the button and the panel,
// to place.
export function starsWidget(
  r: StarRating,
  stats: readonly StatEntry[] = []
): [HTMLButtonElement, HTMLDivElement] {
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
  // (The hover text stays the stars' rules; the lines below are for a tap.)
  btn.title = lines.join("\n");
  btn.setAttribute(
    "aria-label",
    `${starLabel(r.stars)} - how stars ${stats.length > 0 ? "and stats " : ""}work`
  );
  const why = popover(btn);
  lines.forEach((text, i) => {
    const d = document.createElement("div");
    // The rules come first, best tier first; the last line is this run.
    d.className = i === lines.length - 1 ? "km-you" : i === 3 - r.stars ? "km-hit" : "";
    d.textContent = text;
    why.appendChild(d);
  });
  appendStatLines(why, stats);
  return [btn, why];
}

// K274: the same popover for a banner with no stars (the Burnt banner, a win
// with no rating): an info button labelled for what it explains, and only
// the rows' lines.
export function statsInfoWidget(stats: readonly StatEntry[]): [HTMLButtonElement, HTMLDivElement] {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "km-info";
  btn.insertAdjacentHTML("beforeend", INFO_ICON);
  btn.append("What the numbers mean");
  const why = popover(btn);
  appendStatLines(why, stats);
  return [btn, why];
}

// A banner's rows: label at the left edge and value at the right, as in the
// HUD.
function rowsEl(rows: readonly StatEntry[]): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "km-rows";
  for (const r of rows) {
    const kEl = document.createElement("span");
    kEl.className = "k";
    kEl.textContent = r.label;
    const vEl = document.createElement("span");
    vEl.className = "v";
    vEl.textContent = r.value;
    el.append(kEl, vEl);
  }
  return el;
}

export class MazeHud {
  readonly el: HTMLDivElement;
  private timeCell: HTMLElement | null = null;
  // K114 stage 2: the fire's lead row, which the real-time fire counts
  // down every frame (setFireLead).
  private leadCell: HTMLElement | null = null;
  // K137 stage 2: the spool row, which flashes when a move is refused.
  private spoolCell: HTMLElement | null = null;
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
    this.leadCell = null;
    this.spoolCell = null;
    for (const [k, v] of rows) {
      const kEl = document.createElement("span");
      kEl.className = "k";
      kEl.textContent = k;
      const vEl = document.createElement("span");
      vEl.className = "v";
      vEl.textContent = v;
      if (k === "time") this.timeCell = vEl;
      if (k === STATS.fireLead.label) this.leadCell = vEl;
      if (k === STATS.spool.label) this.spoolCell = vEl;
      this.el.append(kEl, vEl);
    }
  }

  // K137 stage 2: a refused move flashes the spool gauge (the animation
  // restarts on every refusal: drop the class, reflow, put it back).
  flashSpool(): void {
    const cell = this.spoolCell;
    if (!cell || this.el.hidden) return;
    cell.classList.remove("km-flash");
    void cell.offsetWidth;
    cell.classList.add("km-flash");
  }

  // K114 stage 2: the real-time fire's lead, every frame (one text node,
  // only when its shown value changes; null: no row to write).
  setFireLead(v: number | null): void {
    if (v === null || !this.leadCell || this.el.hidden) return;
    const t = fmtDist(v);
    if (this.leadCell.textContent !== t) this.leadCell.textContent = t;
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
  // K80 turns stage 2: the turn minotaur's close calls and turns seen, and
  // the Reset-path restarts under a minotaur (absent elsewhere).
  closeCalls?: number | null;
  seen?: number | null;
  restarts?: number | null;
  // K114's burn race: the closest call (absent elsewhere).
  closestCall?: number | null;
  // K155: the run's stars (null or absent: no rating, no stars).
  rating?: StarRating | null;
  // K139: a collapse game's score against par (absent elsewhere).
  collapse?: { pct: number; par: string } | null;
  // K114: the runs cut (absent or null: the cut off).
  cuts?: number | null;
  // K137 stage 3a: the hearts left (absent or null: lives off).
  hearts?: { left: number; of: number } | null;
  // K114 walker: the walker's score (absent or null: no walker).
  walker?: WalkerScore | null;
  // K137 stage 3b: the sword (absent or null: off, or none laid).
  sword?: SwordShown | null;
  // K137 stage 3c: sprint's row value (absent or null: sprint off).
  sprint?: string | null;
  // K137 stage 2: the share of the spool used, a whole percent, and the
  // hints used (absent or null: that aid off).
  spoolUsed?: number | null;
  hintsUsed?: number | null;
  // K138: the rules row, the turnstiles and the hidden runs (absent or
  // null: that rule off).
  rules?: string | null;
  turnstiles?: number | null;
  hidden?: HiddenShown | null;
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
    // K155: the stars under the heading; a tap opens their explanation,
    // and (K274) what each row below means. No stars (no rating): the same
    // lines behind a plain info button.
    const entries = statEntries(w);
    el.append(...(w.rating ? starsWidget(w.rating, entries) : statsInfoWidget(entries)));
    // One stat per row.
    const rows = rowsEl(entries);
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
  // K114 stage 2: the real-time fire reached you where you stood (that
  // clock refuses no way on, so it never traps you); absent or false: the
  // turn clock's trap.
  reached?: boolean;
}

// The Burnt banner's rows (K274: built through `entry`, like every row).
export function lossEntries(l: LossInfo): StatEntry[] {
  return [
    entry("time", formatDuration(l.timeMs)),
    entry("walked", fmtDist(l.walked)),
    entry("closestCall", fmtDist(l.closest)),
  ];
}

// K137's rule fields (the HUD's, the rule banners' and the share's), and
// K139's collapse.
// K114's cuts and walker.
export type RuleFields = Pick<
  HudSnapshot,
  | "snapped" | "parLeft" | "parStrokes" | "collapse" | "cuts" | "walker"
  | "spool" | "hints" | "spoolUsed" | "hintsUsed"
  | "rules" | "turnstiles" | "hidden"
>;

// A par or a count of moves; an infinite par (no way to the exit) reads as
// a dash.
function fmtPar(n: number): string {
  return Number.isFinite(n) ? String(n) : "\u2014";
}

// K137's rows: "snapped N" (fragile runs), "par P \u00B7 L left" (strict
// par), "strokes S / par P" (the strokes mode); each absent while its rule
// is off.
export function ruleEntries(s: RuleFields): StatEntry[] {
  const rows: StatEntry[] = [];
  if (s.snapped != null) rows.push(entry("snapped", String(s.snapped)));
  if (s.parLeft) {
    rows.push(entry("par", `${fmtPar(s.parLeft.par)} \u00B7 ${fmtPar(s.parLeft.left)} left`));
  }
  if (s.parStrokes) {
    rows.push(entry("strokes", `${s.parStrokes.strokes} / par ${fmtPar(s.parStrokes.par)}`));
  }
  // K139: "collapsed N% · par M%" (par "≥M%" once its search gave up).
  if (s.collapse) rows.push(entry("collapsed", `${s.collapse.pct}% · par ${s.collapse.par}`));
  // K114: "cuts N" while the cut is on (zero included); Lead's walker adds
  // its par, "cuts N · par P" (a dash while there is none). Delay's walker:
  // "walker W · shortest S", the runs it has walked and its uncut route.
  // K713: an upper-bound par (WalkerScore.upper) reads "par ≤ P".
  if (s.cuts != null) {
    const w = s.walker;
    const le = w && w.mode === "lead" && w.upper && w.par != null ? "≤ " : "";
    const par = w && w.mode === "lead" ? ` · par ${le}${fmtPar(w.par ?? Infinity)}` : "";
    rows.push(entry("cuts", `${s.cuts}${par}`));
  }
  if (s.walker && s.walker.mode === "delay") {
    rows.push(entry("walker", `${s.walker.walk} · shortest ${s.walker.shortest}`));
  }
  // K137 stage 2: "spool ██████░░ 75%" (the share left), "hints 2 / 3"
  // (left of the setting); at the finish "spool used 62%", "hints used 1".
  if (s.spool) rows.push(entry("spool", spoolGauge(s.spool.used, s.spool.cap)));
  if (s.hints) rows.push(entry("hints", `${s.hints.left} / ${s.hints.of}`));
  // K138: "rules ice 25% · cycle", "turnstiles 4", "hidden 1 / 2 found ·
  // fewest 16, 14 with them".
  if (s.rules) rows.push(entry("rules", s.rules));
  if (s.turnstiles != null) rows.push(entry("turnstiles", String(s.turnstiles)));
  if (s.hidden) rows.push(entry("hidden", hiddenValue(s.hidden)));
  if (s.spoolUsed != null) rows.push(entry("spoolUsed", `${s.spoolUsed}%`));
  if (s.hintsUsed != null) rows.push(entry("hintsUsed", String(s.hintsUsed)));
  return rows;
}

// The Stranded and Out of strokes banners' rows.
export function ruleLossEntries(l: { timeMs: number; walked: number } & RuleFields): StatEntry[] {
  return [entry("time", formatDuration(l.timeMs)), entry("walked", fmtDist(l.walked)), ...ruleEntries(l)];
}

export interface RuleButton {
  label: string;
  onClick: () => void;
}

// K137: a rule loss's banner (LossBanner.showRule).
export interface RuleBanner {
  title: string;
  sub: string;
  entries: StatEntry[];
  primary: RuleButton;
  secondary?: RuleButton;
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
    el.className = "km-banner km-burnt"; // K137: showRule may have changed it.
    el.textContent = "";
    const head = document.createElement("div");
    head.className = "km-head";
    head.textContent = "Burnt \u{1F525}";
    const sub = document.createElement("div");
    sub.className = "km-sub";
    sub.textContent = l.reached
      ? "The fire reaches you where you stand."
      : "The fire reaches the end of every way on before you.";
    const entries = lossEntries(l);
    const rows = rowsEl(entries);
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
    // K274: the info button sits under the sentence, as the stars do on the
    // win banner.
    el.append(head, sub, ...statsInfoWidget(entries), rows, btns, x);
    el.hidden = false;
  }

  // K137: a rule loss (Stranded, Out of strokes) in the same place, with a
  // gold border, its own title and sentence, and an optional second button.
  showRule(r: RuleBanner): void {
    const el = this.el;
    el.className = "km-banner km-rule";
    el.textContent = "";
    const head = document.createElement("div");
    head.className = "km-head";
    head.textContent = r.title;
    const sub = document.createElement("div");
    sub.className = "km-sub";
    sub.textContent = r.sub;
    const rows = rowsEl(r.entries);
    const btns = document.createElement("div");
    btns.className = "km-btns";
    const button = (b: RuleButton, primary: boolean): HTMLButtonElement => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = primary ? "km-btn km-primary" : "km-btn";
      btn.textContent = b.label;
      btn.addEventListener("click", () => {
        this.hide();
        b.onClick();
      });
      return btn;
    };
    btns.appendChild(button(r.primary, true));
    if (r.secondary) btns.appendChild(button(r.secondary, false));
    const x = document.createElement("button");
    x.type = "button";
    x.className = "km-x";
    x.textContent = "\u00D7";
    x.title = "Close";
    x.setAttribute("aria-label", "Close");
    x.addEventListener("click", () => this.hide());
    el.append(head, sub, ...statsInfoWidget(r.entries), rows, btns, x);
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
