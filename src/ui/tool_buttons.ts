// K137 stage 4 (4.10, 4.30): the LURE and SNARE buttons (game/lures.ts and
// game/snares.ts hold the rules, minotaur_turns.ts the mechanics; main.ts
// wires them). Two round buttons, bottom left in the sprint's row, styled
// like it; shifted one button right while the sprint shows. Each carries
// its stock in a corner badge (AidButtons' look) and is dimmed and disabled
// at 0. A press ARMS the tool (lit gold, like an armed sprint), and the
// next tap on a run uses it; a second press, Esc or a tap off the runs
// puts it down. Shown while a tool is on under the turn clock's minotaur,
// the keys are live and no open panel covers the group (main.ts toolTick).
// The group carries K698's `km-control` class, so the bottom toasts keep
// clear of it.

export type ToolKind = "lure" | "snare";

export interface ToolButtonsHooks {
  press: (k: ToolKind) => void;
}

// The keys: L (lure) and N (snare), by `key`, so they follow the layout.
// Not X, Esc, U, Z, Q, WASD, the arrows, `.` or Space (s3a's list), nor C
// or H (the aids), G (the walker's Go) or F (sprint).
export function toolKeyOf(e: { key: string }): ToolKind | null {
  if (e.key === "l" || e.key === "L") return "lure";
  if (e.key === "n" || e.key === "N") return "snare";
  return null;
}

// A note (the lure is a pluck).
const NOTE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="8.6" cy="17.2" ' +
  'rx="3.3" ry="2.6" fill="currentColor"/><path d="M11.7 17V4.4c1.5 2.7 5.6 ' +
  '3.1 5.6 7.2" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';
// A loop with crossed tails (the snare).
const LOOP =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.6" r="5.2" ' +
  'fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.6 13.4 14.6 ' +
  '21M14.4 13.4 9.4 21" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round"/></svg>';

function injectStyle(): void {
  if (document.getElementById("km-tools-style")) return;
  const st = document.createElement("style");
  st.id = "km-tools-style";
  st.textContent =
    // The sprint's spot and look (ui/sprint_button.ts). Hidden by
    // visibility, not display, so that covered() can measure it.
    ".km-tools{position:fixed;z-index:18;display:flex;gap:12px;visibility:hidden;" +
    "left:max(16px,env(safe-area-inset-left));" +
    "bottom:max(24px,calc(env(safe-area-inset-bottom) + 12px))}" +
    ".km-tools.km-shift{left:calc(max(16px,env(safe-area-inset-left)) + 60px)}" +
    ".km-tools button{position:relative;width:48px;height:48px;padding:0;border:0;" +
    "border-radius:50%;background:#1b2233b8;box-shadow:0 0 0 1px #3a4254 inset;" +
    "color:#c9d3e6;display:flex;align-items:center;justify-content:center;" +
    "cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "transition:opacity .15s,color .12s,background .12s,box-shadow .12s}" +
    ".km-tools.km-on{visibility:visible}" +
    ".km-tools button.km-off{display:none}" +
    ".km-tools svg{width:22px;height:22px;display:block}" +
    ".km-tools button:hover:not(:disabled){background:#2a3247d0;color:#e4ecf8}" +
    ".km-tools button.km-armed{background:#e8c45a38;color:#ffe9a8;" +
    "box-shadow:0 0 0 2px #e8c45a inset,0 0 12px #e8c45a66}" +
    ".km-tools button:disabled{opacity:.38;cursor:default}" +
    ".km-tools button:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}" +
    // AidButtons' count badge (ui/aid_buttons.ts).
    ".km-tools .km-count{position:absolute;right:-2px;top:-2px;min-width:18px;" +
    "height:18px;border-radius:9px;background:#2a3247;color:#e4ecf8;" +
    "font:600 11px/18px system-ui,sans-serif;text-align:center;" +
    "box-shadow:0 0 0 1px #3a4254;pointer-events:none}";
  document.head.appendChild(st);
}

interface ToolButton {
  readonly btn: HTMLButtonElement;
  readonly badge: HTMLSpanElement;
  on: boolean;
  count: number;
}

export class ToolButtons {
  readonly el: HTMLDivElement;
  private readonly lure: ToolButton;
  private readonly snare: ToolButton;
  private shown = false;
  private shifted = false;
  private armed: ToolKind | null = null;

  constructor(hooks: ToolButtonsHooks) {
    injectStyle();
    const el = document.createElement("div");
    el.className = "km-tools km-control";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Lures and snares");
    const make = (k: ToolKind, glyph: string, label: string, title: string): ToolButton => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `km-tool-${k} km-off`;
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", "false");
      b.title = title;
      b.innerHTML = glyph;
      const badge = document.createElement("span");
      badge.className = "km-count";
      badge.textContent = "0";
      b.appendChild(badge);
      b.addEventListener("click", () => hooks.press(k));
      el.appendChild(b);
      return { btn: b, badge, on: false, count: -1 };
    };
    this.lure = make(
      "lure",
      NOTE,
      "Lure",
      "Lure (L): arm it, then tap a run to pluck it. The minotaur and any sleeper within six runs head for the run's nearer end. Costs no move."
    );
    this.snare = make(
      "snare",
      LOOP,
      "Snare",
      "Snare (N): arm it, then tap a run at your junction. The first monster to step onto it stands three turns."
    );
    document.body.appendChild(el);
    this.el = el;
  }

  setShown(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    this.el.classList.toggle("km-on", on);
  }

  get isShown(): boolean {
    return this.shown;
  }

  // Which tools this game has (a tool that is off takes no room).
  setTools(lure: boolean, snare: boolean): void {
    for (const [t, on] of [
      [this.lure, lure],
      [this.snare, snare],
    ] as const) {
      if (t.on === on) continue;
      t.on = on;
      t.btn.classList.toggle("km-off", !on);
    }
  }

  // The stocks left: the badges, and a tool at 0 dimmed and disabled.
  setCounts(lure: number, snare: number): void {
    for (const [t, n] of [
      [this.lure, lure],
      [this.snare, snare],
    ] as const) {
      if (t.count === n) continue;
      t.count = n;
      t.badge.textContent = String(n);
      t.btn.disabled = n <= 0;
    }
  }

  // The armed tool, lit (null: none).
  setArmed(k: ToolKind | null): void {
    if (k === this.armed) return;
    this.armed = k;
    for (const [t, kind] of [
      [this.lure, "lure"],
      [this.snare, "snare"],
    ] as const) {
      const on = k === kind;
      t.btn.classList.toggle("km-armed", on);
      t.btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  // One button right, past the sprint (its row's first spot).
  setShift(on: boolean): void {
    if (on === this.shifted) return;
    this.shifted = on;
    this.el.classList.toggle("km-shift", on);
  }

  // Does a rect (an open panel's) cover the group, shown or not?
  covered(r: { left: number; top: number; right: number; bottom: number }): boolean {
    const b = this.el.getBoundingClientRect();
    return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
  }
}
