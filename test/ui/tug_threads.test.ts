import { describe, expect, it } from "vitest";
import {
  TUG_THREADS_KEY,
  readTugThreadsPref,
  tugThreadsPref,
  writeTugThreadsPref,
} from "../../src/ui/tug_threads";
import type { StorageLike } from "../../src/game/daily_store";

// K1173: the Tug threads viewer preference (on by default, per browser,
// never in a link), as test/ui/move_pad.test.ts tests the move pad's pref
// and test/ui/motion.test.ts tests storage failures.

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

describe("tugThreadsPref", () => {
  it("follows the stored choice", () => {
    expect(tugThreadsPref("1")).toBe(true);
    expect(tugThreadsPref("0")).toBe(false);
  });

  it("defaults to on when nothing (readable) is stored", () => {
    expect(tugThreadsPref(null)).toBe(true);
    expect(tugThreadsPref("yes")).toBe(true);
    expect(tugThreadsPref("")).toBe(true);
  });
});

describe("the Tug threads preference in storage", () => {
  it("persists off and on per browser, under its own key", () => {
    const s = new FakeStorage();
    expect(readTugThreadsPref(s)).toBe(true);
    writeTugThreadsPref(s, false);
    expect(s.map.get(TUG_THREADS_KEY)).toBe("0");
    expect(readTugThreadsPref(s)).toBe(false);
    writeTugThreadsPref(s, true);
    expect(s.map.get(TUG_THREADS_KEY)).toBe("1");
    expect(readTugThreadsPref(s)).toBe(true);
  });

  it("survives storage that throws on read (the default stands)", () => {
    const s = new FakeStorage();
    s.map.set(TUG_THREADS_KEY, "0");
    s.failGet = true;
    expect(readTugThreadsPref(s)).toBe(true);
  });

  it("survives storage that throws on write (this session only)", () => {
    const s = new FakeStorage();
    s.failSet = true;
    expect(() => writeTugThreadsPref(s, false)).not.toThrow();
    expect(s.map.has(TUG_THREADS_KEY)).toBe(false);
  });

  it("works with no storage at all", () => {
    expect(readTugThreadsPref(null)).toBe(true);
    expect(() => writeTugThreadsPref(null, false)).not.toThrow();
  });
});
