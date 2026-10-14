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
import { whenReduced } from "./motion";

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
  // K80's real-time mode (absent elsewhere): the minotaur's catches, and
  // the time it spent hunting the player (the win banner's).
  catches?: number | null;
  chasedMs?: number | null;
}

// Distances read x10 as whole numbers, as the HUD always has.
export const fmtDist = (v: number): string =>
  Number.isFinite(v) ? String(Math.round(v * 10)) : "—";

// The stat rows (label, value) the HUD and the win banner both show, in
// one order. A null field drops its row.
type StatFields = Pick<
  HudSnapshot,
  | "timeMs" | "path" | "optimal" | "efficiency" | "backtrack" | "junctions" | "deadEnds"
  | "catches" | "chasedMs"
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
  if (s.catches != null) rows.push(["caught", String(s.catches)]);
  if (s.chasedMs != null) rows.push(["chased", formatDuration(s.chasedMs)]);
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
    // Mode badge (ui/mode_badge.ts, K73): a pill just left of the
    // hamburger (42 px square at max(10px, safe area) from the top-right
    // corner), vertically centered on it; fit() picks the label width.
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
    ".km-mode .km-mode-s{display:none}" +
    ".km-mode.km-fit-short .km-mode-l{display:none}" +
    ".km-mode.km-fit-short .km-mode-s{display:inline}" +
    ".km-mode.km-fit-icon .km-mode-l,.km-mode.km-fit-icon .km-mode-s" +
    "{display:none}" +
    ".km-mode.km-fit-icon{width:32px;padding:0;justify-content:center}" +
    // Last resort on very narrow screens: the icon below the hamburger.
    ".km-mode.km-fit-low{top:calc(max(10px,env(safe-area-inset-top)) + 50px);" +
    "right:max(10px,env(safe-area-inset-right))}" +
    // Not the daily: neutral slate. A replay: muted amber (the HUD's gold).
    ".km-mode.km-free{background:#1b2233eb;color:#c8d3e8;" +
    "border:1px solid #3a4a6a}" +
    ".km-mode.km-free svg{color:#9fb0cf}" +
    ".km-mode.km-free:hover{background:#26314aeb}" +
    ".km-mode.km-replay{background:#2b2415eb;color:#e7c56f;" +
    "border:1px solid #74602c}" +
    ".km-mode.km-replay:hover{background:#372d19eb}" +
    ".km-mode:focus-visible{outline:2px solid #8fe6ff;outline-offset:2px}" +
    "@keyframes km-mode-in{from{opacity:0}to{opacity:1}}" +
    // Static under reduced motion (the Motion setting, ui/motion.ts).
    whenReduced(".km-mode", "animation:none") +
    "@media (pointer:coarse){.km-hud{font-size:13px}" +
    ".km-hud .km-title{font-size:13px}.km-btn{min-height:40px}" +
    // Touch: the hamburger's full height, a finger-sized target.
    ".km-mode{top:max(10px,env(safe-area-inset-top));height:42px;" +
    "border-radius:21px;padding:0 15px 0 12px;font-size:13px}" +
    ".km-mode.km-fit-icon{width:42px;padding:0}}";
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
    // K80: the real-time mode's catch count is part of the game, not a
    // stat: its row shows with the stat rows off too.
    const chase = s?.catches != null;
    if (!s || (!s.title && !s.showStats && !chase)) {
      this.el.hidden = true;
      this.lastSig = "";
      return;
    }
    const rows: Array<[string, string]> = s.showStats
      ? statRows(s)
      : chase
        ? [["caught", String(s.catches)]]
        : [];
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
      this.title.classList.toggle("km-solo", rows.length === 0);
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
  // K80's real-time mode: catches and time chased (absent elsewhere).
  catches?: number | null;
  chasedMs?: number | null;
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
    this.onHide();
  }

  get shown(): boolean {
    return !this.el.hidden;
  }
}
