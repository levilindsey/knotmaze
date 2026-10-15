import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEAR_MS,
  MAX_DELAY_MS,
  SnoreLink,
  attachSnoreLink,
  delaysTraversal,
  hoverSounds,
  traversalDelayMs,
  type ClickInfo,
  type SnoreDeps,
} from "../../src/ui/snore_link";
import type { PlayResult } from "../../src/audio/snore_sfx";

// K325: the credit link's snore - which pointers play it, and when a tap's
// traversal is held back so the snore is heard.

// A stand-in for SnoreSfx: `next` is what play() answers; a started snore
// resets the clock to 0 ms heard.
class FakeSnore implements SnoreDeps {
  plays = 0;
  next: PlayResult = "started";
  since: number | null = null;
  play(): PlayResult {
    this.plays++;
    if (this.next === "started") this.since = 0;
    return this.next;
  }
  sinceStartMs(): number | null {
    return this.since;
  }
}

const click = (over: Partial<ClickInfo> = {}): ClickInfo => ({
  trusted: true,
  button: 0,
  detail: 1,
  modified: false,
  ...over,
});

describe("traversalDelayMs", () => {
  it("holds a tap until the snore has been heard HEAR_MS, at most MAX_DELAY_MS", () => {
    expect(traversalDelayMs(0)).toBe(MAX_DELAY_MS);
    expect(traversalDelayMs(100)).toBe(MAX_DELAY_MS);
    expect(traversalDelayMs(HEAR_MS - MAX_DELAY_MS)).toBe(MAX_DELAY_MS);
    expect(traversalDelayMs(150)).toBe(250);
    expect(traversalDelayMs(250)).toBe(150);
    expect(traversalDelayMs(399)).toBe(1);
  });

  it("does not hold a tap once the snore has been heard long enough", () => {
    expect(traversalDelayMs(HEAR_MS)).toBe(0);
    expect(traversalDelayMs(600)).toBe(0);
    expect(traversalDelayMs(5000)).toBe(0);
  });

  it("does not hold a tap when nothing is sounding", () => {
    expect(traversalDelayMs(null)).toBe(0);
    expect(traversalDelayMs(Number.NaN)).toBe(0);
    expect(traversalDelayMs(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("treats a negative clock as just started", () => {
    expect(traversalDelayMs(-50)).toBe(MAX_DELAY_MS);
  });

  it("stays far inside the shortest transient-activation window", () => {
    // Chrome keeps a tap's activation 5 s, Safari about 1 s.
    expect(MAX_DELAY_MS).toBeLessThanOrEqual(400);
    // The snore is 0.915 s: the wait ends while it still plays.
    expect(HEAR_MS).toBeLessThan(915);
  });
});

describe("pointer kinds", () => {
  it("plays on hover for a mouse and a pen, never for a touch", () => {
    expect(hoverSounds("mouse")).toBe(true);
    expect(hoverSounds("pen")).toBe(true);
    expect(hoverSounds("touch")).toBe(false);
    expect(hoverSounds("")).toBe(false);
  });

  it("delays only a touch or a pen, never a mouse or an unknown source", () => {
    expect(delaysTraversal("touch")).toBe(true);
    expect(delaysTraversal("pen")).toBe(true);
    expect(delaysTraversal("mouse")).toBe(false);
    expect(delaysTraversal("")).toBe(false);
  });
});

describe("SnoreLink", () => {
  it("plays when a mouse arrives, once per call it makes", () => {
    const snore = new FakeSnore();
    const link = new SnoreLink(snore);
    link.enter("mouse");
    expect(snore.plays).toBe(1);
    link.leave();
    link.enter("mouse");
    // The sound's own rule keeps a second play from stacking; the link just
    // asks again on every arrival.
    expect(snore.plays).toBe(2);
  });

  it("does not play when a touch arrives, but does at touch-down", () => {
    const snore = new FakeSnore();
    const link = new SnoreLink(snore);
    link.enter("touch");
    expect(snore.plays).toBe(0);
    link.down("touch");
    expect(snore.plays).toBe(1);
  });

  it("does not play again at the press when the hover started it", () => {
    const snore = new FakeSnore();
    const link = new SnoreLink(snore);
    link.enter("mouse");
    link.down("mouse");
    expect(snore.plays).toBe(1);
  });

  it("does not play at the press when the hover found it still sounding", () => {
    const snore = new FakeSnore();
    snore.next = "sounding";
    const link = new SnoreLink(snore);
    link.enter("mouse");
    link.down("mouse");
    expect(snore.plays).toBe(1);
  });

  it("plays at the press when the hover could not (the audio had not unlocked)", () => {
    const snore = new FakeSnore();
    snore.next = "unavailable";
    const link = new SnoreLink(snore);
    link.enter("mouse");
    expect(snore.plays).toBe(1);
    snore.next = "started";
    link.down("mouse");
    expect(snore.plays).toBe(2);
  });

  it("plays at the press of a mouse that never hovered (a click without a move)", () => {
    const snore = new FakeSnore();
    const link = new SnoreLink(snore);
    link.down("mouse");
    expect(snore.plays).toBe(1);
  });

  it("forgets the hover when the pointer leaves", () => {
    const snore = new FakeSnore();
    const link = new SnoreLink(snore);
    link.enter("mouse");
    link.leave();
    link.down("mouse");
    expect(snore.plays).toBe(2);
  });

  describe("a tap", () => {
    it("is held while the snore is young: touch click 100 ms in waits 300", () => {
      const snore = new FakeSnore();
      const link = new SnoreLink(snore);
      link.down("touch");
      snore.since = 100;
      expect(link.click(click())).toEqual({ kind: "delay", ms: 300 });
    });

    it("waits less as the snore ages", () => {
      for (const [since, ms] of [
        [250, 150],
        [350, 50],
      ]) {
        const snore = new FakeSnore();
        const link = new SnoreLink(snore);
        link.down("touch");
        snore.since = since;
        expect(link.click(click())).toEqual({ kind: "delay", ms });
      }
    });

    it("opens at once when the snore has been heard long enough", () => {
      const snore = new FakeSnore();
      const link = new SnoreLink(snore);
      link.down("touch");
      snore.since = 450;
      expect(link.click(click())).toEqual({ kind: "native" });
    });

    it("opens at once when nothing is sounding (muted, or the file never loaded)", () => {
      const snore = new FakeSnore();
      snore.next = "unavailable";
      const link = new SnoreLink(snore);
      link.down("touch");
      // The click retries the play, which still cannot sound.
      snore.since = null;
      expect(link.click(click())).toEqual({ kind: "native" });
    });

    it("retries the play at the click when the touch-down could not sound", () => {
      // Chrome opens the audio gate at pointerup, so a first-ever touch finds
      // it closed at touch-down and open at the click.
      const snore = new FakeSnore();
      snore.next = "unavailable";
      const link = new SnoreLink(snore);
      link.down("touch");
      expect(snore.plays).toBe(1);
      snore.next = "started";
      expect(link.click(click())).toEqual({ kind: "delay", ms: 300 });
      expect(snore.plays).toBe(2);
    });

    it("does not retry when the touch-down sounded", () => {
      const snore = new FakeSnore();
      const link = new SnoreLink(snore);
      link.down("touch");
      snore.since = 120;
      link.click(click());
      expect(snore.plays).toBe(1);
    });

    it("holds a pen's tap like a touch", () => {
      const snore = new FakeSnore();
      const link = new SnoreLink(snore);
      link.enter("pen");
      link.down("pen");
      expect(snore.plays).toBe(1);
      snore.since = 80;
      expect(link.click(click())).toEqual({ kind: "delay", ms: 300 });
    });

    it("swallows a second tap while the open is queued, then lets the next through", () => {
      const snore = new FakeSnore();
      const link = new SnoreLink(snore);
      link.down("touch");
      snore.since = 100;
      expect(link.click(click())).toEqual({ kind: "delay", ms: 300 });
      link.down("touch");
      expect(link.click(click())).toEqual({ kind: "swallow" });
      link.release();
      link.down("touch");
      snore.since = 700;
      expect(link.click(click())).toEqual({ kind: "native" });
    });
  });

  describe("everything else opens at once", () => {
    function pressed(type: string): { link: SnoreLink; snore: FakeSnore } {
      const snore = new FakeSnore();
      const link = new SnoreLink(snore);
      link.enter(type);
      link.down(type);
      snore.since = 50; // A fresh snore: a touch would wait.
      return { link, snore };
    }

    it("a mouse click (the page stays alive, the snore plays on)", () => {
      const { link } = pressed("mouse");
      expect(link.click(click())).toEqual({ kind: "native" });
    });

    it("Enter on the focused link (no pointer, click count 0)", () => {
      const snore = new FakeSnore();
      snore.since = 50;
      const link = new SnoreLink(snore);
      expect(link.click(click({ detail: 0 }))).toEqual({ kind: "native" });
      expect(snore.plays).toBe(0);
    });

    it("a script's click, even right after a touch", () => {
      const { link } = pressed("touch");
      expect(link.click(click({ trusted: false }))).toEqual({ kind: "native" });
    });

    it("a modified click (the browser's own new-tab paths)", () => {
      for (const over of [{ modified: true }, { button: 1 }, { button: 2 }]) {
        const { link } = pressed("touch");
        expect(link.click(click(over))).toEqual({ kind: "native" });
      }
    });

    it("a click with no press before it", () => {
      const snore = new FakeSnore();
      snore.since = 50;
      const link = new SnoreLink(snore);
      expect(link.click(click())).toEqual({ kind: "native" });
    });

    it("a keyboard click after an earlier touch tap (the press is spent)", () => {
      const { link, snore } = pressed("touch");
      expect(link.click(click())).toEqual({ kind: "delay", ms: 300 });
      link.release();
      snore.since = 50;
      expect(link.click(click({ detail: 0 }))).toEqual({ kind: "native" });
    });
  });
});

// attachSnoreLink on a fake anchor: events in, preventDefault and the delayed
// re-click out. The re-click is untrusted, so it takes the native path.
interface FakeEvent {
  isTrusted: boolean;
  pointerType?: string;
  button: number;
  detail: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  preventDefault(): void;
}

function ev(over: Partial<FakeEvent> = {}): FakeEvent {
  const e: FakeEvent = {
    isTrusted: true,
    button: 0,
    detail: 1,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    preventDefault() {
      e.defaultPrevented = true;
    },
    ...over,
  };
  return e;
}

class FakeAnchor {
  private handlers = new Map<string, Array<(e: FakeEvent) => void>>();
  // Clicks the browser would have followed (not defaultPrevented).
  navigations = 0;
  addEventListener(type: string, fn: (e: FakeEvent) => void): void {
    const list = this.handlers.get(type) ?? [];
    list.push(fn);
    this.handlers.set(type, list);
  }
  fire(type: string, e: FakeEvent): FakeEvent {
    for (const fn of this.handlers.get(type) ?? []) fn(e);
    if (type === "click" && !e.defaultPrevented) this.navigations++;
    return e;
  }
  // HTMLElement.click(): an untrusted click, click count 0.
  click(): void {
    this.fire("click", ev({ isTrusted: false, detail: 0 }));
  }
}

describe("attachSnoreLink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function wired(): { a: FakeAnchor; snore: FakeSnore } {
    const a = new FakeAnchor();
    const snore = new FakeSnore();
    attachSnoreLink(a as unknown as HTMLAnchorElement, snore);
    return { a, snore };
  }

  it("holds a touch tap, then re-clicks the link once", () => {
    const { a, snore } = wired();
    a.fire("pointerdown", ev({ pointerType: "touch" }));
    expect(snore.plays).toBe(1);
    snore.since = 100;
    const e = a.fire("click", ev());
    expect(e.defaultPrevented).toBe(true);
    expect(a.navigations).toBe(0);
    vi.advanceTimersByTime(299);
    expect(a.navigations).toBe(0);
    vi.advanceTimersByTime(1);
    expect(a.navigations).toBe(1);
  });

  it("opens only one tab for a double tap", () => {
    const { a, snore } = wired();
    a.fire("pointerdown", ev({ pointerType: "touch" }));
    snore.since = 100;
    a.fire("click", ev());
    vi.advanceTimersByTime(100);
    a.fire("pointerdown", ev({ pointerType: "touch" }));
    const second = a.fire("click", ev());
    expect(second.defaultPrevented).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(a.navigations).toBe(1);
  });

  it("takes a tap after the queued open as a fresh one", () => {
    const { a, snore } = wired();
    a.fire("pointerdown", ev({ pointerType: "touch" }));
    snore.since = 100;
    a.fire("click", ev());
    vi.advanceTimersByTime(300);
    expect(a.navigations).toBe(1);
    a.fire("pointerdown", ev({ pointerType: "touch" }));
    snore.since = 700;
    const e = a.fire("click", ev());
    expect(e.defaultPrevented).toBe(false);
    expect(a.navigations).toBe(2);
  });

  it("leaves a mouse click and Enter alone", () => {
    const { a, snore } = wired();
    snore.since = 50;
    a.fire("pointerenter", ev({ pointerType: "mouse" }));
    a.fire("pointerdown", ev({ pointerType: "mouse" }));
    const mouse = a.fire("click", ev());
    expect(mouse.defaultPrevented).toBe(false);
    const enter = a.fire("click", ev({ detail: 0 }));
    expect(enter.defaultPrevented).toBe(false);
    expect(a.navigations).toBe(2);
    vi.advanceTimersByTime(1000);
    expect(a.navigations).toBe(2);
  });

  it("leaves a modified touch click alone (ctrl, meta, shift, alt)", () => {
    for (const key of ["ctrlKey", "metaKey", "shiftKey", "altKey"] as const) {
      const { a, snore } = wired();
      a.fire("pointerdown", ev({ pointerType: "touch" }));
      snore.since = 100;
      const e = a.fire("click", ev({ [key]: true }));
      expect(e.defaultPrevented).toBe(false);
    }
  });

  it("ignores a secondary-button press", () => {
    const { a, snore } = wired();
    a.fire("pointerdown", ev({ pointerType: "mouse", button: 2 }));
    expect(snore.plays).toBe(0);
  });

  it("plays on a mouse arrival and not on a touch arrival", () => {
    const { a, snore } = wired();
    a.fire("pointerenter", ev({ pointerType: "touch" }));
    expect(snore.plays).toBe(0);
    a.fire("pointerenter", ev({ pointerType: "mouse" }));
    expect(snore.plays).toBe(1);
  });
});
