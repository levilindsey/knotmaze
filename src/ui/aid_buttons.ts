// K137 stage 2: the AID buttons (brief docs/design/K137_s2.md; main.ts wires
// them). Hint (key H) shows while the solve has hints (the `hints` param),
// with the count left on it; Chalk (key C) shows while the viewer's chalk
// preference is on, and ticks or rubs out the head's junction. Round
// buttons styled like the scissors (K114, cut_buttons.ts), bottom left ONE
// ROW ABOVE them (call 3: clear of the move pad, bottom right, and of the
// scissors' row), shown only while the keys are live and no open panel
// covers them (main.ts aidTick). Keys by the typed letter (aidKeyOf), so
// every layout's H and C; WASD and the arrows move by their codes and never
// reach it.

export interface AidButtonsHooks {
  hint: () => void;
  chalk: () => void;
}

export type AidKey = "hint" | "chalk";

// The chalk viewer preference (default off), stored per browser.
export const CHALK_KEY = "knotmaze.chalk";
export function chalkPref(stored: string | null): boolean {
  return stored === "1";
}

// The aid a keydown names, or null.
export function aidKeyOf(e: { key: string }): AidKey | null {
  switch (e.key) {
    case "h":
    case "H":
      return "hint";
    case "c":
    case "C":
      return "chalk";
    default:
      return null;
  }
}

// A bulb: the glass, its neck and two base lines.
const BULB =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M9 16.5c0-2-3-3.6-3-7.5a6 6 0 0 1 12 0c0 3.9-3 5.5-3 7.5z"/>' +
  '<path d="M9.5 19.5h5M10.5 22h3"/></g></svg>';
// A chalk tick.
const TICK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 9.5 17.5 19.5 6.5" ' +
  'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" ' +
  'stroke-linejoin="round"/></svg>';

function injectStyle(): void {
  if (document.getElementById("km-aid-style")) return;
  const st = document.createElement("style");
  st.id = "km-aid-style";
  st.textContent =
    // One 48 px button plus a 12 px gap above the scissors' row.
    ".km-aid{position:fixed;z-index:18;display:flex;visibility:hidden;gap:10px;" +
    "left:max(16px,env(safe-area-inset-left));" +
    "bottom:calc(max(24px,calc(env(safe-area-inset-bottom) + 12px)) + 60px)}" +
    ".km-aid button{position:relative;width:48px;height:48px;padding:0;border:0;" +
    "border-radius:50%;background:#1b2233b8;box-shadow:0 0 0 1px #3a4254 inset;" +
    "color:#c9d3e6;display:flex;align-items:center;justify-content:center;" +
    "cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "transition:opacity .15s,color .12s,background .12s,box-shadow .12s}" +
    ".km-aid button[hidden]{display:none}" +
    ".km-aid.km-on{visibility:visible}" +
    ".km-aid svg{width:22px;height:22px;display:block}" +
    ".km-aid button:hover:not(:disabled){background:#2a3247d0;color:#e4ecf8}" +
    ".km-aid button.km-lit{background:#7dffc430;color:#d8ffef;" +
    "box-shadow:0 0 0 2px #7dffc4 inset,0 0 12px #7dffc466}" +
    ".km-aid button:disabled{opacity:.38;cursor:default}" +
    ".km-aid button:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}" +
    ".km-aid .km-count{position:absolute;right:-2px;top:-2px;min-width:18px;height:18px;" +
    "border-radius:9px;background:#2a3247;color:#e4ecf8;font:600 11px/18px system-ui," +
    "sans-serif;text-align:center;box-shadow:0 0 0 1px #3a4254}";
  document.head.appendChild(st);
}

export class AidButtons {
  readonly el: HTMLDivElement;
  private readonly hintBtn: HTMLButtonElement;
  private readonly hintCount: HTMLSpanElement;
  private readonly chalkBtn: HTMLButtonElement;
  private hintShown = false;
  private chalkShown = false;
  private visible = false;
  private left = -1;
  private lit = false;
  private marked = false;

  constructor(hooks: AidButtonsHooks) {
    injectStyle();
    const el = document.createElement("div");
    el.className = "km-aid";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Aids");
    const make = (cls: string, label: string, tip: string, svg: string, act: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.setAttribute("aria-label", label);
      b.title = tip;
      b.innerHTML = svg;
      b.hidden = true;
      b.addEventListener("click", () => act());
      el.appendChild(b);
      return b;
    };
    this.hintBtn = make(
      "km-hint",
      "Hint",
      "Hint (H): light the next good run for two seconds",
      BULB,
      hooks.hint
    );
    this.hintCount = document.createElement("span");
    this.hintCount.className = "km-count";
    this.hintCount.setAttribute("aria-hidden", "true");
    this.hintBtn.appendChild(this.hintCount);
    this.chalkBtn = make(
      "km-chalk",
      "Chalk mark",
      "Chalk (C): tick this junction, or rub its tick out",
      TICK,
      hooks.chalk
    );
    this.chalkBtn.setAttribute("aria-pressed", "false");
    document.body.appendChild(el);
    this.el = el;
  }

  // Which buttons the group lays out (whether or not it is visible, so that
  // covered() measures the same box either way).
  setButtons(hint: boolean, chalk: boolean): void {
    if (hint === this.hintShown && chalk === this.chalkShown) return;
    this.hintShown = hint;
    this.chalkShown = chalk;
    this.hintBtn.hidden = !hint;
    this.chalkBtn.hidden = !chalk;
  }

  // The group shown (by visibility) or hidden.
  setVisible(on: boolean): void {
    if (on === this.visible) return;
    this.visible = on;
    this.el.classList.toggle("km-on", on);
  }

  // The hints left (disabled at none) and whether a hint is lit now.
  setHint(left: number, lit: boolean): void {
    if (left !== this.left) {
      this.left = left;
      this.hintCount.textContent = String(left);
      this.hintBtn.disabled = left <= 0;
      this.hintBtn.setAttribute("aria-label", `Hint, ${left} left`);
    }
    if (lit !== this.lit) {
      this.lit = lit;
      this.hintBtn.classList.toggle("km-lit", lit);
    }
  }

  // Lit while the head's junction carries a tick.
  setChalk(marked: boolean): void {
    if (marked === this.marked) return;
    this.marked = marked;
    this.chalkBtn.classList.toggle("km-lit", marked);
    this.chalkBtn.setAttribute("aria-pressed", marked ? "true" : "false");
  }

  // Does a rect (an open panel's) cover the buttons, shown or not?
  covered(r: { left: number; top: number; right: number; bottom: number }): boolean {
    const b = this.el.getBoundingClientRect();
    return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
  }

  get isShown(): boolean {
    return this.visible && (this.hintShown || this.chalkShown);
  }
}
