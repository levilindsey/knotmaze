// @vitest-environment happy-dom
// K740 (first gap): a control that appears while a toast shows must move
// it. showToast (src/ui/share.ts) places the toast once at show time; this
// file drives the real showToast/placeToast in happy-dom - the toast's
// and the control's rects are stubbed the way the shipped helpers need
// (a laid-out box, visible, opaque, taking touches), and fake timers run
// the re-place clock. The pure rule stays pinned in toast_place.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOAST_AVOID_CLASS, TOAST_REFLOW_MS, showToast } from "../../src/ui/share";
import { TOAST_GAP } from "../../src/ui/toast_place";

const VH = window.innerHeight;
// The control's top is 100 px above the viewport's bottom edge, so the
// lifted toast sits at 100 + TOAST_GAP whatever VH the window reports.
const LIFTED = `${100 + TOAST_GAP}px`;

function stubRect(
  el: HTMLElement,
  rect: { left: number; top: number; right: number; bottom: number }
): void {
  const { left, top, right, bottom } = rect;
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        x: left,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

// A bottom control in the toast's column, as TOAST_AVOID reads it.
function makeControl(): HTMLElement {
  const el = document.createElement("div");
  el.className = TOAST_AVOID_CLASS;
  el.style.visibility = "visible";
  el.style.opacity = "1";
  el.style.pointerEvents = "auto";
  stubRect(el, { left: 120, top: VH - 100, right: 280, bottom: VH - 52 });
  document.body.appendChild(el);
  return el;
}

function show(message = "Mind the gap", ms = 2200): HTMLElement {
  showToast(message, ms);
  const el = document.querySelector<HTMLElement>(".km-toast");
  if (!el) throw new Error("no toast shown");
  stubRect(el, { left: 100, top: VH - 52, right: 300, bottom: VH - 18 });
  return el;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.querySelectorAll(`.${TOAST_AVOID_CLASS}`).forEach((el) => el.remove());
});

afterEach(() => {
  // Let the message fade (and its clock stop) before real timers return.
  vi.advanceTimersByTime(10_000);
  vi.useRealTimers();
  document.querySelectorAll(`.${TOAST_AVOID_CLASS}`).forEach((el) => el.remove());
});

describe("K740: a showing toast re-places when a control appears or leaves", () => {
  it("re-places on a slow clock, not per frame", () => {
    expect(TOAST_REFLOW_MS).toBeGreaterThanOrEqual(200);
    expect(TOAST_REFLOW_MS).toBeLessThanOrEqual(300);
  });

  it("lifts within one cadence of a control appearing, and settles back when it leaves", () => {
    const el = show();
    expect(el.style.bottom).toBe(""); // at the floor: nothing under it
    const control = makeControl();
    vi.advanceTimersByTime(TOAST_REFLOW_MS);
    expect(el.style.bottom).toBe(LIFTED);
    control.remove();
    vi.advanceTimersByTime(TOAST_REFLOW_MS);
    expect(el.style.bottom).toBe("");
  });

  it("stays at the floor when nothing appears", () => {
    const el = show();
    vi.advanceTimersByTime(1000);
    expect(el.style.bottom).toBe("");
    expect(el.classList.contains("km-toast-on")).toBe(true);
  });

  it("a fresh toast restarts both timers", () => {
    const el = show("one");
    vi.advanceTimersByTime(2000);
    show("two"); // restarts the fade (2.2 s) and the re-place clock
    makeControl();
    vi.advanceTimersByTime(TOAST_REFLOW_MS);
    expect(el.style.bottom).toBe(LIFTED);
    // Past the first message's fade, the second still shows.
    expect(el.classList.contains("km-toast-on")).toBe(true);
  });

  it("leaves no timer running once it fades", () => {
    const el = show();
    makeControl();
    vi.advanceTimersByTime(TOAST_REFLOW_MS);
    expect(el.style.bottom).toBe(LIFTED);
    vi.advanceTimersByTime(2200);
    expect(el.classList.contains("km-toast-on")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    const bottom = el.style.bottom;
    makeControl();
    vi.advanceTimersByTime(2000);
    expect(el.style.bottom).toBe(bottom);
  });
});
