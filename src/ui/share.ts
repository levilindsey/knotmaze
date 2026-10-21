// Sharing a result (K20, K33): the phone's native share sheet where there
// is one, else the clipboard. Desktop browsers that also expose
// navigator.share (Chrome and Edge on Windows) get the clipboard - their
// share dialogs are a detour for pasting a result into a chat.

import { toastBottom, type Box } from "./toast_place";

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

const coarse = (): boolean => {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};

export async function shareOrCopy(
  text: string,
  url: string
): Promise<ShareOutcome> {
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  };
  const data: ShareData = { text, url };
  if (typeof nav.share === "function" && coarse()) {
    try {
      if (nav.canShare?.(data) !== false) {
        await nav.share(data);
        return "shared";
      }
    } catch (e) {
      // The player closed the sheet: nothing else to do.
      if (e instanceof DOMException && e.name === "AbortError") {
        return "cancelled";
      }
      // Otherwise (not allowed here, no targets): copy instead.
    }
  }
  return (await copyText(`${text}\n${url}`)) ? "copied" : "failed";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied or unavailable: the old way below.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// A short message near the bottom of the screen that fades by itself
// after `ms` (longer messages - an explanation - want longer).
// K698: it sits above the bottom controls in its column (ui/toast_place.ts),
// placed when it shows and again on a resize while it shows; it never takes
// a touch (pointer-events none, maze_hud.ts's .km-toast).
let toastEl: HTMLDivElement | null = null;
let toastTimer = 0;
// The controls it keeps clear of: anything with class TOAST_AVOID_CLASS, the
// scissors, the walker's buttons, the aids (K137), the move pad, the banner,
// the edge indicators, and whatever setToastAvoid names (main.ts: the chrome
// the indicators avoid). A NEW CONTROL near the bottom of the screen adds
// TOAST_AVOID_CLASS to its element (a group's box counts as one).
export const TOAST_AVOID_CLASS = "km-control";
const TOAST_AVOID =
  `.${TOAST_AVOID_CLASS},.km-cut,.km-walk,.km-aid,.km-pad,.km-banner,.km-ind`;
let avoidSource: (() => ReadonlyArray<Element | null>) | null = null;
export function setToastAvoid(source: () => ReadonlyArray<Element | null>): void {
  avoidSource = source;
}

// A shown control's box: laid out, visible, opaque and taking touches (the
// HUD and the stats stamp take none, so they are not controls; an edge
// indicator counts even when inert, tapToPan off, since it still points).
function controlBox(el: Element | null): Box | null {
  if (!(el instanceof HTMLElement) || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return null; // display none, [hidden]
  const cs = getComputedStyle(el);
  if (cs.visibility !== "visible" || Number(cs.opacity) === 0) return null;
  if (cs.pointerEvents === "none" && !el.classList.contains("km-ind")) return null;
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

function placeToast(): void {
  const el = toastEl;
  if (!el) return;
  el.style.bottom = "";
  const floor = parseFloat(getComputedStyle(el).bottom);
  const boxes: Box[] = [];
  const add = (c: Element | null): void => {
    const b = controlBox(c);
    if (b) boxes.push(b);
  };
  document.querySelectorAll(TOAST_AVOID).forEach(add);
  if (avoidSource) for (const c of avoidSource()) add(c);
  // The column and height are the transform's (translate -50% centres it;
  // the fade's 8 px drop moves neither).
  const r = el.getBoundingClientRect();
  const fl = Number.isFinite(floor) ? floor : 18;
  const bottom = toastBottom(
    { left: r.left, right: r.right, height: r.height },
    boxes,
    window.innerHeight,
    fl
  );
  // At the floor the CSS keeps it (its env() follows the safe area).
  if (bottom > fl) el.style.bottom = `${bottom}px`;
}

export function showToast(message: string, ms = 2200): void {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "km-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastEl);
    window.addEventListener("resize", () => {
      if (toastEl?.classList.contains("km-toast-on")) placeToast();
    });
  }
  toastEl.textContent = message;
  placeToast();
  toastEl.classList.add("km-toast-on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => toastEl?.classList.remove("km-toast-on"),
    ms
  );
}
