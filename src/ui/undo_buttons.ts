// K92: the UNDO and REDO buttons for design changes (the stack is
// ui/undo_stack.ts; main.ts wires them). Two squares styled like the
// hamburger, on its row just left of it, shown only while the panel is
// open: the panel sets `kp-open` on the root element, and the mode badge
// drops to a row of its own below them then (ui/mode_badge.ts). A button
// that cannot act stays in place, dimmed and disabled.

export interface UndoButtonsHooks {
  undo: () => void;
  redo: () => void;
}

// A curved arrow back to the left; redo mirrors it.
const ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.5 4 10l4.5 ' +
  '4.5M4 10h10.5a5 5 0 0 1 0 10H10" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function injectStyle(): void {
  if (document.getElementById("km-undo-style")) return;
  const st = document.createElement("style");
  st.id = "km-undo-style";
  st.textContent =
    // The hamburger is 42 px at max(10px, safe area) from the top-right
    // corner; the pair sits 8 px left of it.
    ".km-undo{position:fixed;z-index:30;display:none;gap:8px;" +
    "top:max(10px,env(safe-area-inset-top));" +
    "right:calc(max(10px,env(safe-area-inset-right)) + 50px)}" +
    ".kp-open .km-undo{display:flex}" +
    ".km-undo button{width:42px;height:42px;padding:0;border:0;" +
    "border-radius:9px;background:rgba(40,41,46,.92);" +
    "box-shadow:0 2px 8px rgba(0,0,0,.35);color:#c8cad3;display:flex;" +
    "align-items:center;justify-content:center;cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "transition:opacity .15s,color .12s,background .12s}" +
    ".km-undo svg{width:20px;height:20px;display:block}" +
    ".km-undo .km-redo svg{transform:scaleX(-1)}" +
    ".km-undo button:hover:not(:disabled){background:rgba(58,60,68,.95);" +
    "color:#e4ecf8}" +
    ".km-undo button:disabled{opacity:.38;cursor:default}" +
    ".km-undo button:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}";
  document.head.appendChild(st);
}

export class UndoButtons {
  readonly el: HTMLDivElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly redoBtn: HTMLButtonElement;

  constructor(hooks: UndoButtonsHooks) {
    injectStyle();
    const el = document.createElement("div");
    el.className = "km-undo";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Design history");
    const make = (cls: string, label: string, tip: string, act: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.setAttribute("aria-label", label);
      b.title = tip;
      b.innerHTML = ARROW;
      b.disabled = true;
      b.addEventListener("click", () => act());
      el.appendChild(b);
      return b;
    };
    this.undoBtn = make(
      "km-undo-b",
      "Undo",
      "Undo the last design change (settings, seed, or a switch to or from a daily)",
      hooks.undo
    );
    this.redoBtn = make("km-redo", "Redo", "Redo the design change you undid", hooks.redo);
    document.body.appendChild(el);
    this.el = el;
  }

  // Each button enabled only when it can act.
  set(flags: { undo: boolean; redo: boolean }): void {
    if (this.undoBtn.disabled === flags.undo) this.undoBtn.disabled = !flags.undo;
    if (this.redoBtn.disabled === flags.redo) this.redoBtn.disabled = !flags.redo;
  }

  get flags(): { undo: boolean; redo: boolean } {
    return { undo: !this.undoBtn.disabled, redo: !this.redoBtn.disabled };
  }
}
