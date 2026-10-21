// K114 CUT: the SCISSORS and UNDO buttons (brief docs/design/K114_cut.md;
// main.ts wires them). Two round buttons, bottom left, styled like the move
// pad (K120, bottom right), shown only while the cut is on and the keys are
// live (the frame loop's cutTick). The scissors arm the next tap on the maze
// (it cuts the run under it instead of moving); a second press disarms, and
// the button stays lit while armed. Undo pops one action, a move (with the
// runs it carried on along) or a cut. The keys are cutKeyOf's: X arms or
// disarms, Esc disarms, U undoes (by the typed letter, so every layout's X
// and U; WASD and the arrows move by their codes and never reach it).

export interface CutButtonsHooks {
  arm: () => void;
  undo: () => void;
}

export type CutKey = "arm" | "disarm" | "undo";

// The scissors' key a keydown names, or null.
export function cutKeyOf(e: { key: string }): CutKey | null {
  switch (e.key) {
    case "x":
    case "X":
      return "arm";
    case "Escape":
      return "disarm";
    case "u":
    case "U":
      return "undo";
    default:
      return null;
  }
}

// Two finger rings and two blades crossing between them.
const SCISSORS =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="2.8"/>' +
  '<circle cx="6.5" cy="17.5" r="2.8"/><path d="M8.7 8.3 20 17M8.7 15.7 20 7"/></g></svg>';
// The design Undo's arrow (ui/undo_buttons.ts).
const ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.5 4 10l4.5 ' +
  '4.5M4 10h10.5a5 5 0 0 1 0 10H10" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function injectStyle(): void {
  if (document.getElementById("km-cut-style")) return;
  const st = document.createElement("style");
  st.id = "km-cut-style";
  st.textContent =
    // Above the build stamp (bottom left, 10 px text) and clear of the move
    // pad, which keeps to the bottom right.
    ".km-cut{position:fixed;z-index:18;display:none;gap:10px;" +
    "left:max(16px,env(safe-area-inset-left));" +
    "bottom:max(24px,calc(env(safe-area-inset-bottom) + 12px))}" +
    ".km-cut button{width:48px;height:48px;padding:0;border:0;border-radius:50%;" +
    "background:#1b2233b8;box-shadow:0 0 0 1px #3a4254 inset;color:#c9d3e6;" +
    "display:flex;align-items:center;justify-content:center;cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "transition:opacity .15s,color .12s,background .12s,box-shadow .12s}" +
    ".km-cut svg{width:22px;height:22px;display:block}" +
    ".km-cut button:hover:not(:disabled){background:#2a3247d0;color:#e4ecf8}" +
    ".km-cut button.km-armed{background:#e8c45a38;color:#ffe9a8;" +
    "box-shadow:0 0 0 2px #e8c45a inset,0 0 12px #e8c45a66}" +
    ".km-cut button:disabled{opacity:.38;cursor:default}" +
    ".km-cut button:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}";
  document.head.appendChild(st);
}

export class CutButtons {
  readonly el: HTMLDivElement;
  private readonly scissors: HTMLButtonElement;
  private readonly undoBtn: HTMLButtonElement;
  private shown = false;
  private armed = false;

  constructor(hooks: CutButtonsHooks) {
    injectStyle();
    const el = document.createElement("div");
    el.className = "km-cut";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Scissors");
    const make = (cls: string, label: string, tip: string, svg: string, act: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.setAttribute("aria-label", label);
      b.title = tip;
      b.innerHTML = svg;
      b.addEventListener("click", () => act());
      el.appendChild(b);
      return b;
    };
    this.scissors = make(
      "km-scissors",
      "Scissors",
      "Scissors (X): the next tap cuts a whole run. Press again or Esc to put them down.",
      SCISSORS,
      hooks.arm
    );
    this.scissors.setAttribute("aria-pressed", "false");
    this.undoBtn = make(
      "km-cut-undo",
      "Undo",
      "Undo (U): take back the last move or cut",
      ARROW,
      hooks.undo
    );
    document.body.appendChild(el);
    this.el = el;
  }

  setShown(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    this.el.style.display = on ? "flex" : "none";
  }

  get isShown(): boolean {
    return this.shown;
  }

  // The scissors lit while armed (aria-pressed says so too).
  setArmed(on: boolean): void {
    if (on === this.armed) return;
    this.armed = on;
    this.scissors.classList.toggle("km-armed", on);
    this.scissors.setAttribute("aria-pressed", on ? "true" : "false");
  }

  // Undo enabled only when there is an action to take back.
  setUndo(enabled: boolean): void {
    if (this.undoBtn.disabled === enabled) this.undoBtn.disabled = !enabled;
  }
}
