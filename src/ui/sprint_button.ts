// K137 stage 3c (4.29): the SPRINT button (game/sprint.ts holds the state
// machine and the key; main.ts wires it). One round button, bottom left in
// the scissors' row (K114's cut is the classic game's and the walker's,
// never a chase's, so the two never show together), styled like them and
// the move pad; Hint and Chalk (K137 stage 2) sit 60 px above that row.
// Shown while sprint is on under either clock's minotaur, the keys are live
// and no open panel covers it (main.ts sprintTick). Lit while armed or
// running, dimmed and disabled once spent. The group carries K698's
// `km-control` class, so the bottom toasts keep clear of it.

export interface SprintButtonHooks {
  press: () => void;
}

// A lightning bolt.
const BOLT =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5 5.5 13.4h5.6' +
  'L9.8 21.5l8.7-11.6h-5.7z" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linejoin="round"/></svg>';

function injectStyle(): void {
  if (document.getElementById("km-sprint-style")) return;
  const st = document.createElement("style");
  st.id = "km-sprint-style";
  st.textContent =
    // The scissors' spot and look (ui/cut_buttons.ts). Hidden by visibility,
    // not display, so that covered() can measure it.
    ".km-sprint{position:fixed;z-index:18;display:flex;visibility:hidden;" +
    "left:max(16px,env(safe-area-inset-left));" +
    "bottom:max(24px,calc(env(safe-area-inset-bottom) + 12px))}" +
    ".km-sprint button{width:48px;height:48px;padding:0;border:0;border-radius:50%;" +
    "background:#1b2233b8;box-shadow:0 0 0 1px #3a4254 inset;color:#c9d3e6;" +
    "display:flex;align-items:center;justify-content:center;cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation;" +
    "transition:opacity .15s,color .12s,background .12s,box-shadow .12s}" +
    ".km-sprint.km-on{visibility:visible}" +
    ".km-sprint svg{width:22px;height:22px;display:block}" +
    ".km-sprint button:hover:not(:disabled){background:#2a3247d0;color:#e4ecf8}" +
    ".km-sprint button.km-armed{background:#e8c45a38;color:#ffe9a8;" +
    "box-shadow:0 0 0 2px #e8c45a inset,0 0 12px #e8c45a66}" +
    ".km-sprint button:disabled{opacity:.38;cursor:default}" +
    ".km-sprint button:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}";
  document.head.appendChild(st);
}

export type SprintLook = "ready" | "armed" | "used";

export class SprintButton {
  readonly el: HTMLDivElement;
  private readonly btn: HTMLButtonElement;
  private shown = false;
  private look: SprintLook = "ready";

  constructor(hooks: SprintButtonHooks) {
    injectStyle();
    const el = document.createElement("div");
    el.className = "km-sprint km-control";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Sprint");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "km-sprint-btn";
    b.setAttribute("aria-label", "Sprint");
    b.setAttribute("aria-pressed", "false");
    b.title =
      "Sprint (F), once a game: your next two moves cost the minotaur one turn (in real time you run your next two runs at twice your pace).";
    b.innerHTML = BOLT;
    b.addEventListener("click", () => hooks.press());
    el.appendChild(b);
    document.body.appendChild(el);
    this.el = el;
    this.btn = b;
  }

  setShown(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    this.el.classList.toggle("km-on", on);
  }

  get isShown(): boolean {
    return this.shown;
  }

  // Does a rect (an open panel's) cover the button, shown or not?
  covered(r: { left: number; top: number; right: number; bottom: number }): boolean {
    const b = this.el.getBoundingClientRect();
    return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
  }

  // ready: plain; armed: lit (armed, or under way); used: dimmed, disabled.
  setLook(look: SprintLook): void {
    if (look === this.look) return;
    this.look = look;
    this.btn.classList.toggle("km-armed", look === "armed");
    this.btn.setAttribute("aria-pressed", look === "armed" ? "true" : "false");
    this.btn.disabled = look === "used";
  }

  get currentLook(): SprintLook {
    return this.look;
  }
}
