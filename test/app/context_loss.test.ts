import { describe, it, expect } from "vitest";
import {
  ContextLossModel,
  MESSAGE_DELAY_MS,
  LOSS_POLL_MS,
  installContextLoss,
  type LossCover,
} from "../../src/app/context_loss";

describe("context loss (K456): the model", () => {
  it("shows the message only after MESSAGE_DELAY_MS of visible lost time", () => {
    const m = new ContextLossModel();
    expect(m.lose(1000, false)).toBe(true);
    expect(m.tick(1000 + MESSAGE_DELAY_MS - 1, false)).toBe(false);
    expect(m.showMessage).toBe(false);
    expect(m.tick(1000 + MESSAGE_DELAY_MS, false)).toBe(true);
    expect(m.showMessage).toBe(true);
    // Due once.
    expect(m.tick(1000 + MESSAGE_DELAY_MS + 500, false)).toBe(false);
  });

  it("does not count hidden time", () => {
    const m = new ContextLossModel();
    m.lose(0, true);
    // Hidden for 10 s: nothing counts.
    expect(m.tick(10000, false)).toBe(false);
    expect(m.visibleMs).toBe(0);
    // Visible from 10 s: 2.9 s counts, then hidden again.
    expect(m.tick(12900, true)).toBe(false);
    expect(m.visibleMs).toBe(2900);
    expect(m.tick(20000, false)).toBe(false);
    expect(m.visibleMs).toBe(2900);
    expect(m.tick(20100, false)).toBe(true);
  });

  it("ignores a second loss and a restore without a loss", () => {
    const m = new ContextLossModel();
    expect(m.restore()).toBe(false);
    expect(m.lose(0, false)).toBe(true);
    expect(m.lose(100, false)).toBe(false);
    expect(m.losses).toBe(1);
    expect(m.restore()).toBe(true);
    expect(m.restore()).toBe(false);
    expect(m.restores).toBe(1);
  });

  it("resets on a restore, so the next loss waits again", () => {
    const m = new ContextLossModel();
    m.lose(0, false);
    m.tick(MESSAGE_DELAY_MS, false);
    expect(m.showMessage).toBe(true);
    m.restore();
    expect(m.showMessage).toBe(false);
    expect(m.visibleMs).toBe(0);
    m.lose(10000, false);
    expect(m.tick(10000 + MESSAGE_DELAY_MS - 1, false)).toBe(false);
    expect(m.tick(10000 + MESSAGE_DELAY_MS, false)).toBe(true);
    expect(m.losses).toBe(2);
  });

  it("does not tick while not lost", () => {
    const m = new ContextLossModel();
    expect(m.tick(1e6, false)).toBe(false);
    expect(m.visibleMs).toBe(0);
  });
});

function harness(opts: { hidden?: boolean; throwOnLost?: boolean } = {}) {
  const canvas = new EventTarget();
  const log: string[] = [];
  let now = 0;
  let hidden = opts.hidden ?? false;
  const timers = new Map<number, () => void>();
  let nextId = 1;
  const cover: LossCover = {
    show: () => log.push("show"),
    message: () => log.push("message"),
    hide: () => log.push("hide"),
  };
  const handle = installContextLoss({
    canvas,
    cover,
    isHidden: () => hidden,
    now: () => now,
    onLost: () => {
      log.push("onLost");
      if (opts.throwOnLost) throw new Error("boom");
    },
    onRestored: () => log.push("onRestored"),
    setInterval: (fn) => {
      const id = nextId++;
      timers.set(id, fn);
      return id;
    },
    clearInterval: (id) => {
      timers.delete(id as number);
    },
  });
  const advance = (ms: number): void => {
    for (let t = 0; t < ms; t += LOSS_POLL_MS) {
      now += LOSS_POLL_MS;
      for (const fn of [...timers.values()]) fn();
    }
  };
  const lose = (): Event => {
    const e = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(e);
    return e;
  };
  const restore = (): void => {
    canvas.dispatchEvent(new Event("webglcontextrestored"));
  };
  return {
    canvas,
    log,
    handle,
    timers,
    advance,
    lose,
    restore,
    setHidden: (h: boolean) => {
      hidden = h;
    },
  };
}

describe("context loss (K456): the installer", () => {
  it("covers, hands off and keeps the event restorable on a loss", () => {
    const h = harness();
    const e = h.lose();
    expect(e.defaultPrevented).toBe(true);
    expect(h.log).toEqual(["show", "onLost"]);
    expect(h.handle.lost).toBe(true);
    expect(h.timers.size).toBe(1);
  });

  it("shows the message once, after the delay", () => {
    const h = harness();
    h.lose();
    h.advance(MESSAGE_DELAY_MS - LOSS_POLL_MS);
    expect(h.log).toEqual(["show", "onLost"]);
    h.advance(LOSS_POLL_MS * 8);
    expect(h.log).toEqual(["show", "onLost", "message"]);
    expect(h.handle.report().message).toBe(true);
  });

  it("waits for visible time when the loss happens in a hidden tab", () => {
    const h = harness({ hidden: true });
    h.lose();
    h.advance(MESSAGE_DELAY_MS * 3);
    expect(h.log).toEqual(["show", "onLost"]);
    h.setHidden(false);
    h.advance(MESSAGE_DELAY_MS + LOSS_POLL_MS);
    expect(h.log).toEqual(["show", "onLost", "message"]);
  });

  it("uncovers, resumes and stops polling on a restore", () => {
    const h = harness();
    h.lose();
    h.advance(1000);
    h.restore();
    expect(h.log).toEqual(["show", "onLost", "hide", "onRestored"]);
    expect(h.timers.size).toBe(0);
    expect(h.handle.report()).toEqual({
      lost: false,
      losses: 1,
      restores: 1,
      message: false,
      visibleMs: 0,
    });
  });

  it("ignores a restore with no loss and a second loss event", () => {
    const h = harness();
    h.restore();
    expect(h.log).toEqual([]);
    h.lose();
    h.lose();
    expect(h.log).toEqual(["show", "onLost"]);
    expect(h.timers.size).toBe(1);
  });

  it("still polls for the message when the handler throws", () => {
    const h = harness({ throwOnLost: true });
    const warn = console.warn;
    const warned: unknown[] = [];
    console.warn = (...a: unknown[]) => warned.push(a);
    try {
      h.lose();
    } finally {
      console.warn = warn;
    }
    expect(warned.length).toBe(1);
    h.advance(MESSAGE_DELAY_MS + LOSS_POLL_MS);
    expect(h.log).toEqual(["show", "onLost", "message"]);
  });

  it("removes its listeners on dispose", () => {
    const h = harness();
    h.handle.dispose();
    h.lose();
    h.restore();
    expect(h.log).toEqual([]);
  });
});
