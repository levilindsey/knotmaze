import { describe, expect, it } from "vitest";
import {
  MOTION_KEY,
  MOTION_PREFS,
  MotionSetting,
  REDUCED_ROOT,
  browserMotionQuery,
  parseMotionPref,
  whenReduced,
} from "../../src/ui/motion";
import type { MotionQueryLike, MotionRootLike } from "../../src/ui/motion";
import type { StorageLike } from "../../src/game/daily_store";

// An in-memory Storage that can refuse reads and/or writes.
class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  failGet = false;
  failSet = false;
  getItem(k: string): string | null {
    if (this.failGet) throw new DOMException("denied", "SecurityError");
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    if (this.failSet) throw new DOMException("full", "QuotaExceededError");
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

// A media query whose OS answer the test flips. `legacy`: only the old
// addListener API (older Safari).
type Listener = (e: { matches: boolean }) => void;
class FakeQuery implements MotionQueryLike {
  matches: boolean;
  addEventListener?: (type: "change", fn: Listener) => void;
  addListener: (fn: Listener) => void;
  private fns: Listener[] = [];
  constructor(matches: boolean, legacy = false) {
    this.matches = matches;
    if (!legacy) this.addEventListener = (_type, fn) => this.fns.push(fn);
    this.addListener = (fn) => {
      if (legacy) this.fns.push(fn);
    };
  }
  flip(matches: boolean): void {
    this.matches = matches;
    for (const fn of this.fns) fn({ matches });
  }
}

const root = (): MotionRootLike => ({ dataset: {} });

describe("parseMotionPref", () => {
  it("reads the three choices and defaults everything else to system", () => {
    expect(MOTION_PREFS).toEqual(["system", "full", "reduced"]);
    expect(parseMotionPref("full")).toBe("full");
    expect(parseMotionPref("reduced")).toBe("reduced");
    expect(parseMotionPref("system")).toBe("system");
    for (const v of [null, undefined, "", "Reduced", "1", "slow", 3, {}]) {
      expect(parseMotionPref(v)).toBe("system");
    }
  });
});

describe("MotionSetting", () => {
  it("follows the system by default, live", () => {
    const q = new FakeQuery(false);
    const r = root();
    const m = new MotionSetting(new FakeStorage(), q, r);
    expect(m.pref).toBe("system");
    expect(m.reduced).toBe(false);
    expect(r.dataset.motion).toBe("full");
    q.flip(true);
    expect(m.system).toBe(true);
    expect(m.reduced).toBe(true);
    expect(r.dataset.motion).toBe("reduced");
    q.flip(false);
    expect(m.reduced).toBe(false);
    expect(r.dataset.motion).toBe("full");
  });

  it("follows the system through the legacy addListener too", () => {
    const q = new FakeQuery(false, true);
    const m = new MotionSetting(null, q, null);
    q.flip(true);
    expect(m.reduced).toBe(true);
  });

  it("full and reduced override the system, and ignore its changes", () => {
    const q = new FakeQuery(true);
    const r = root();
    const s = new FakeStorage();
    const m = new MotionSetting(s, q, r);
    expect(m.reduced).toBe(true);
    m.setPref("full");
    expect(m.reduced).toBe(false);
    expect(r.dataset.motion).toBe("full");
    q.flip(false);
    q.flip(true);
    expect(m.reduced).toBe(false);
    expect(m.system).toBe(true);
    m.setPref("reduced");
    q.flip(false);
    expect(m.reduced).toBe(true);
    expect(r.dataset.motion).toBe("reduced");
    // Back to the system: its answer as of now.
    m.setPref("system");
    expect(m.reduced).toBe(false);
    expect(r.dataset.motion).toBe("full");
  });

  it("remembers the choice per browser", () => {
    const s = new FakeStorage();
    const m = new MotionSetting(s, new FakeQuery(false), null);
    m.setPref("reduced");
    expect(s.map.get(MOTION_KEY)).toBe("reduced");
    const again = new MotionSetting(s, new FakeQuery(false), null);
    expect(again.pref).toBe("reduced");
    expect(again.reduced).toBe(true);
    again.setPref("system");
    expect(new MotionSetting(s, new FakeQuery(true), null).pref).toBe(
      "system"
    );
  });

  it("reads a damaged or unknown stored value as system", () => {
    for (const v of ["", "REDUCED", "none", "{}", "true"]) {
      const s = new FakeStorage();
      s.map.set(MOTION_KEY, v);
      const m = new MotionSetting(s, new FakeQuery(true), null);
      expect(m.pref).toBe("system");
      expect(m.reduced).toBe(true);
    }
  });

  it("survives storage that throws on every access (session only)", () => {
    const s = new FakeStorage();
    s.map.set(MOTION_KEY, "reduced");
    s.failGet = true;
    s.failSet = true;
    const r = root();
    const m = new MotionSetting(s, new FakeQuery(false), r);
    expect(m.pref).toBe("system");
    expect(m.reduced).toBe(false);
    expect(() => m.setPref("reduced")).not.toThrow();
    expect(m.pref).toBe("reduced");
    expect(m.reduced).toBe(true);
    expect(r.dataset.motion).toBe("reduced");
    expect(s.map.get(MOTION_KEY)).toBe("reduced"); // the old value, unread
  });

  it("works with no storage, no media query and no root", () => {
    const m = new MotionSetting(null, null, null);
    expect(m.pref).toBe("system");
    expect(m.system).toBe(false);
    expect(m.reduced).toBe(false);
    m.setPref("reduced");
    expect(m.reduced).toBe(true);
  });

  it("survives a media query whose listener registration throws", () => {
    const q: MotionQueryLike = {
      matches: true,
      addEventListener: () => {
        throw new Error("no");
      },
    };
    const m = new MotionSetting(null, q, null);
    expect(m.reduced).toBe(true);
  });

  it("finds no media query outside a browser", () => {
    // Node has no matchMedia.
    expect(browserMotionQuery()).toBeNull();
  });
});

describe("whenReduced", () => {
  it("prefixes every selector of a list with the root attribute", () => {
    expect(REDUCED_ROOT).toBe(':root[data-motion="reduced"]');
    expect(whenReduced(".a, .b .c", "animation:none")).toBe(
      ':root[data-motion="reduced"] .a,' +
        ':root[data-motion="reduced"] .b .c{animation:none}'
    );
  });
});
