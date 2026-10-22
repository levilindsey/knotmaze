// K800: the link-look chip. When a link sets the maze's look (K800's
// LOOK_KEYS in ui/daily_link.ts), this chip sits under the mode badge
// (top right) and one tap turns the link's look off for this maze: the
// look params go back to today's defaults. The choice is not remembered
// (a reload reads the link again).

export interface LookChipHooks {
  clear: () => void;
}

function injectStyle(): void {
  if (document.getElementById("km-look-style")) return;
  const st = document.createElement("style");
  st.id = "km-look-style";
  st.textContent =
    ".km-look{position:fixed;z-index:30;display:none;" +
    "top:calc(max(10px,env(safe-area-inset-top)) + 52px);" +
    "right:max(10px,env(safe-area-inset-right));" +
    "padding:7px 12px;border:0;border-radius:9px;" +
    "background:rgba(40,41,46,.92);box-shadow:0 2px 8px rgba(0,0,0,.35);" +
    "color:#c8cad3;font:12px/1.2 system-ui,sans-serif;cursor:pointer;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-look.on{display:block}" +
    ".km-look:hover{background:rgba(58,60,68,.95);color:#e4ecf8}" +
    ".km-look:focus-visible{outline:2px solid #8ea0c0;outline-offset:2px}";
  document.head.appendChild(st);
}

export class LookChip {
  readonly el: HTMLButtonElement;

  constructor(hooks: LookChipHooks) {
    injectStyle();
    this.el = document.createElement("button");
    this.el.type = "button";
    this.el.className = "km-look";
    this.el.textContent = "Link look ×";
    this.el.title = "Turn off the look this link set (this maze only)";
    this.el.setAttribute("aria-label", "Turn off the link's look for this maze");
    this.el.addEventListener("click", () => hooks.clear());
    document.body.appendChild(this.el);
  }

  set(on: boolean): void {
    this.el.classList.toggle("on", on);
  }
}
