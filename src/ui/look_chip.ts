// K800: the link-look chip. When a link sets the maze's look (K800's
// LOOK_KEYS in ui/daily_link.ts), this chip sits under the mode badge
// (top right) and one tap turns the link's look off for this maze: the
// look params go back to today's defaults. The choice is not remembered
// (a reload reads the link again).
//
// K844 (was K837): the badge drops to this chip's row when the panel
// is open (.kp-open) or in its low fit on narrow screens (.km-fit-low).
// They stay on that one row. K848: on that row the chip BUTTS against
// the badge's left edge (layout(), main.ts re-runs it whenever the
// badge re-fits: open/close, resize, label change), so it tracks the
// badge wherever it lands - never stranded at the screen's left edge.
// On the settings sheet the badge keeps the top row, so the chip stays
// at the right under the sheet's top bar.

import { SHEET_QUERY } from "./panel_sheet";

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
    "body:has(.km-mode.km-fit-low) .km-look,.kp-open .km-look{" +
    "left:max(10px,env(safe-area-inset-left));right:auto}" +
    "@media " + SHEET_QUERY + "{.kp-open .km-look{" +
    "left:auto;right:max(10px,env(safe-area-inset-right))}}" +
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

  // K848: on the shared (dropped-badge) row, dock the chip's right edge
  // against the badge's left edge with an 8 px gap and center it on
  // the badge's height. Any other state clears the inline position and
  // the stylesheet rules own the placement. If the chip cannot fit
  // left of the badge it stays at the screen's left inset (the row is
  // then too narrow for the pairing anyway).
  layout(badge: HTMLElement | null): void {
    const el = this.el;
    const clear = (): void => {
      el.style.left = "";
      el.style.right = "";
      el.style.top = "";
    };
    if (!el.classList.contains("on") || badge === null || badge.hidden) {
      clear();
      return;
    }
    if (
      document.documentElement.classList.contains("kp-open") &&
      window.matchMedia(SHEET_QUERY).matches
    ) {
      clear();
      return;
    }
    const sharedRow =
      document.documentElement.classList.contains("kp-open") ||
      badge.classList.contains("km-fit-low");
    if (!sharedRow) {
      clear();
      return;
    }
    const b = badge.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) {
      clear();
      return;
    }
    const chip = el.getBoundingClientRect();
    const gap = 8;
    el.style.right = "auto";
    el.style.left = `${Math.max(10, b.left - gap - chip.width)}px`;
    el.style.top = `${b.top + (b.height - chip.height) / 2}px`;
  }
}
