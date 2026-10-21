// K114 WALKER: the walker's buttons (brief docs/design/K114_walker.md;
// main.ts wires them). Go, Reset and Undo, bottom left where the scissors
// sit and styled like them (the scissors show only with the cut "on", these
// only in "lead" and "delay"), shown while the keys are live and no open
// panel covers them (main.ts cutTick). There are no scissors to arm: in a
// walker mode a tap on a run cuts it.
// - Lead: Go sends the walker off along its route; Reset stops it and puts
//   it back at the start with the cuts kept; Undo takes back the last cut.
// - Delay: Go reads "Let it walk" (a pass: the walker takes one run with no
//   cut); Reset restarts the walk; Undo takes back the last turn.
// Keys (walkerKeyOf, by the typed letter like cutKeyOf): G goes, U undoes.

export interface WalkerButtonsHooks {
  go: () => void;
  reset: () => void;
  undo: () => void;
}

export type WalkerKey = "go" | "undo";

// The walker's key a keydown names, or null.
export function walkerKeyOf(e: { key: string }): WalkerKey | null {
  switch (e.key) {
    case "g":
    case "G":
      return "go";
    case "u":
    case "U":
      return "undo";
    default:
      return null;
  }
}

// A circular arrow (Reset).
const RESET =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5M5 4v4h4" ' +
  'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
  'stroke-linejoin="round"/></svg>';
// The design Undo's arrow (ui/undo_buttons.ts, cut_buttons.ts).
const ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.5 4 10l4.5 ' +
  '4.5M4 10h10.5a5 5 0 0 1 0 10H10" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function injectStyle(): void {
  if (document.getElementById("km-walk-style")) return;
  const st = document.createElement("style");
  st.id = "km-walk-style";
  st.textContent =
    // cut_buttons.ts's corner and look; Go is a pill in the walker's colour.
    ".km-walk{position:fixed;z-index:18;display:flex;visibility:hidden;gap:10px;" +
    "left:max(16px,env(safe-area-inset-left));" +
    "bottom:max(24px,calc(env(safe-area-inset-bottom) + 12px))}" +
    ".km-walk button{width:48px;height:48px;padding:0;border:0;border-radius:24px;" +
    "background:#1b2233b8;box-shadow:0 0 0 1px #3a4254 inset;color:#c9d3e6;" +
    "display:flex;align-items:center;justify-content:center;cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "font:600 15px system-ui,sans-serif;white-space:nowrap;" +
    "transition:opacity .15s,color .12s,background .12s,box-shadow .12s}" +
    ".km-walk.km-on{visibility:visible}" +
    ".km-walk svg{width:22px;height:22px;display:block}" +
    ".km-walk button.km-go{width:auto;padding:0 20px;color:#bfefff;" +
    "box-shadow:0 0 0 2px #3fd0ff inset,0 0 10px #3fd0ff55}" +
    ".km-walk button:hover:not(:disabled){background:#2a3247d0;color:#e4ecf8}" +
    ".km-walk button:disabled{opacity:.38;cursor:default}" +
    ".km-walk button:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}";
  document.head.appendChild(st);
}

export class WalkerButtons {
  readonly el: HTMLDivElement;
  private readonly goBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly undoBtn: HTMLButtonElement;
  private shown = false;
  private goText = "";

  constructor(hooks: WalkerButtonsHooks) {
    injectStyle();
    const el = document.createElement("div");
    el.className = "km-walk";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Walker");
    const make = (cls: string, label: string, tip: string, html: string, act: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.setAttribute("aria-label", label);
      b.title = tip;
      b.innerHTML = html;
      b.addEventListener("click", () => act());
      el.appendChild(b);
      return b;
    };
    this.goBtn = make("km-go", "Go", "", "Go", hooks.go);
    this.resetBtn = make(
      "km-walk-reset",
      "Reset",
      "Reset: the walker back to the start",
      RESET,
      hooks.reset
    );
    this.undoBtn = make(
      "km-walk-undo",
      "Undo",
      "Undo (U): take back the last cut",
      ARROW,
      hooks.undo
    );
    this.undoBtn.disabled = true;
    document.body.appendChild(el);
    this.el = el;
  }

  setShown(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    this.el.classList.toggle("km-on", on);
  }

  // Does a rect (an open panel's) cover the buttons, shown or not?
  covered(r: { left: number; top: number; right: number; bottom: number }): boolean {
    const b = this.el.getBoundingClientRect();
    return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
  }

  get isShown(): boolean {
    return this.shown;
  }

  // Go's text and tooltip ("Go" for Lead, "Let it walk" for Delay).
  setGo(text: string, tip: string, enabled: boolean): void {
    if (text !== this.goText) {
      this.goText = text;
      this.goBtn.textContent = text;
      this.goBtn.setAttribute("aria-label", text);
      this.goBtn.title = tip;
    }
    if (this.goBtn.disabled === enabled) this.goBtn.disabled = !enabled;
  }

  setReset(enabled: boolean): void {
    if (this.resetBtn.disabled === enabled) this.resetBtn.disabled = !enabled;
  }

  setUndo(enabled: boolean, tip: string): void {
    if (this.undoBtn.disabled === enabled) this.undoBtn.disabled = !enabled;
    if (this.undoBtn.title !== tip) this.undoBtn.title = tip;
  }
}
