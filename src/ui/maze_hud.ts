// The fabric maze's on-screen readouts (K19, K20): the HUD in the top-left
// corner and the win banner. Plain DOM over the canvas; main.ts owns the
// game state and hands these a snapshot.
//
// HUD: an optional title row (the daily on screen - a button that opens
// the daily stats), then label/value rows. Rows appear only where they
// mean something: efficiency once solved, backtracked outside trail mode,
// dead ends with deadEnds on. The container ignores the pointer (taps on
// the maze underneath still land); only the title takes clicks.

import { efficiencyPercent, formatDuration } from "../game/maze_stats";

export interface HudSnapshot {
  // Title row text (the daily on screen), or null for none.
  title: string | null;
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
}

// Distances read x10 as whole numbers, as the HUD always has.
export const fmtDist = (v: number): string =>
  Number.isFinite(v) ? String(Math.round(v * 10)) : "—";

// The stat rows (label, value) the HUD and the win banner both show, in
// one order. A null field drops its row.
type StatFields = Pick<
  HudSnapshot,
  "timeMs" | "path" | "optimal" | "efficiency" | "backtrack" | "junctions" | "deadEnds"
>;
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
    ".km-hud .km-title{grid-column:1/-1;pointer-events:auto;cursor:pointer;" +
    "display:flex;align-items:center;gap:6px;margin:0;padding:1px 0 2px;" +
    "border:0;background:none;color:#e7c56f;text-align:left;" +
    `font:600 12px/1.5 ${mono};-webkit-tap-highlight-color:transparent}` +
    ".km-hud .km-title.km-solo{padding:0}" +
    ".km-hud .km-title:not(.km-solo){border-bottom:1px solid #2c3a55;" +
    "margin-bottom:3px;padding-bottom:4px}" +
    ".km-hud .km-title svg{width:12px;height:12px;flex:0 0 auto;opacity:.8}" +
    ".km-hud .km-title:focus-visible{outline:2px solid #8ea0c0;" +
    "outline-offset:2px}" +
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
    "@media (max-width:900px){.km-banner{top:auto;" +
    "bottom:max(14px,env(safe-area-inset-bottom))}}" +
    // Toast (ui/share.ts).
    ".km-toast{position:fixed;left:50%;bottom:max(18px," +
    "env(safe-area-inset-bottom));transform:translate(-50%,8px);z-index:60;" +
    "padding:8px 14px;border-radius:8px;background:#e4ecf8;color:#1b2233;" +
    `font:600 13px/1.3 ${sans};opacity:0;pointer-events:none;` +
    "transition:opacity .2s,transform .2s}" +
    ".km-toast.km-toast-on{opacity:1;transform:translate(-50%,0)}" +
    "@media (pointer:coarse){.km-hud{font-size:13px}" +
    ".km-hud .km-title{font-size:13px}.km-btn{min-height:40px}}";
  document.head.appendChild(style);
}

const CHART_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" ' +
  'd="M2 13h12v1.5H2zM3 8h2.4v4H3zm3.8-4h2.4v8H6.8zm3.8 2H13v6h-2.4z"/></svg>';

export class MazeHud {
  readonly el: HTMLDivElement;
  private readonly title: HTMLButtonElement;
  private readonly onTitle: () => void;
  private timeCell: HTMLElement | null = null;
  private lastSig = "";

  constructor(onTitle: () => void) {
    ensureHudStyles();
    this.onTitle = onTitle;
    this.el = document.createElement("div");
    this.el.id = "maze-hud";
    this.el.className = "km-hud";
    this.el.hidden = true;
    this.title = document.createElement("button");
    this.title.type = "button";
    this.title.className = "km-title";
    this.title.addEventListener("click", () => this.onTitle());
    document.body.appendChild(this.el);
  }

  // Draw a snapshot (null hides the HUD). Rebuilds the rows only when
  // their set or values change; the ticking time takes setTime().
  render(s: HudSnapshot | null): void {
    if (!s || (!s.title && !s.showStats)) {
      this.el.hidden = true;
      this.lastSig = "";
      return;
    }
    const rows = s.showStats ? statRows(s) : [];
    const sig = JSON.stringify([s.title, rows]);
    this.el.hidden = false;
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.el.textContent = "";
    this.timeCell = null;
    if (s.title) {
      this.title.innerHTML = "";
      this.title.append(s.title);
      this.title.insertAdjacentHTML("beforeend", CHART_ICON);
      this.title.title = "Your daily stats";
      this.title.setAttribute("aria-label", `${s.title} - open your daily stats`);
      this.title.classList.toggle("km-solo", !s.showStats);
      this.el.appendChild(this.title);
    }
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
  // Show the daily stats button.
  stats: boolean;
}

export class WinBanner {
  readonly el: HTMLDivElement;
  private readonly onShare: () => void;
  private readonly onStats: () => void;

  constructor(onShare: () => void, onStats: () => void) {
    ensureHudStyles();
    this.onShare = onShare;
    this.onStats = onStats;
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
    el.append(head, rows, btns, x);
    el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }

  get shown(): boolean {
    return !this.el.hidden;
  }
}
