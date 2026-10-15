import { describe, expect, it } from "vitest";
import {
  CONTRAST_KEY,
  CONTRAST_PREFS,
  CONTRAST_QUERY,
  ContrastSetting,
  HIGH_CONTRAST_GAP_MIN,
  HIGH_CONTRAST_MARKER_MIN,
  HIGH_CONTRAST_OVERRIDES,
  HIGH_CONTRAST_ROOT,
  NO_A11Y,
  REDUCED_MOTION_OVERRIDES,
  browserContrastQuery,
  effectiveParam,
  effectiveParams,
  highContrastChoice,
  overriddenKeys,
  parseContrastPref,
  reducedMotionChoice,
} from "../../src/ui/accessibility";
import type { A11yFlags, ContrastRootLike } from "../../src/ui/accessibility";
import { MotionSetting } from "../../src/ui/motion";
import type { MotionQueryLike } from "../../src/ui/motion";
import type { StorageLike } from "../../src/game/daily_store";
import { MARKER_SIZE_MAX, MARKER_SIZE_MIN } from "../../src/render/marker_glyphs";
import { GAMUT_PALETTES } from "../../src/core/section_colors";
import {
  BACKGROUNDS,
  BACKGROUND_COLOR_MODES,
} from "../../src/render/background_model";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

// An in-memory Storage that can refuse reads and/or writes (motion.test.ts).
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

const root = (): ContrastRootLike => ({ dataset: {} });
const on = (o: Partial<A11yFlags>): A11yFlags => ({ ...NO_A11Y, ...o });

describe("parseContrastPref", () => {
  it("reads the three choices and defaults everything else to system", () => {
    expect(CONTRAST_PREFS).toEqual(["system", "normal", "high"]);
    expect(parseContrastPref("high")).toBe("high");
    expect(parseContrastPref("normal")).toBe("normal");
    expect(parseContrastPref("system")).toBe("system");
    for (const v of [null, undefined, "", "High", "1", "more", 3, {}]) {
      expect(parseContrastPref(v)).toBe("system");
    }
  });
});

describe("ContrastSetting", () => {
  it("follows the system by default, live", () => {
    const q = new FakeQuery(false);
    const r = root();
    const c = new ContrastSetting(new FakeStorage(), q, r);
    expect(c.pref).toBe("system");
    expect(c.high).toBe(false);
    expect(r.dataset.contrast).toBe("normal");
    q.flip(true);
    expect(c.system).toBe(true);
    expect(c.high).toBe(true);
    expect(r.dataset.contrast).toBe("high");
    q.flip(false);
    expect(c.high).toBe(false);
    expect(r.dataset.contrast).toBe("normal");
  });

  it("starts high when the system already asks for contrast", () => {
    const c = new ContrastSetting(new FakeStorage(), new FakeQuery(true), null);
    expect(c.high).toBe(true);
    expect(c.pref).toBe("system");
  });

  it("follows the system through the legacy addListener too", () => {
    const q = new FakeQuery(false, true);
    const c = new ContrastSetting(null, q, null);
    q.flip(true);
    expect(c.high).toBe(true);
  });

  it("normal and high override the system, and ignore its changes", () => {
    const q = new FakeQuery(true);
    const r = root();
    const c = new ContrastSetting(new FakeStorage(), q, r);
    c.setPref("normal");
    expect(c.high).toBe(false);
    expect(r.dataset.contrast).toBe("normal");
    q.flip(false);
    q.flip(true);
    expect(c.high).toBe(false);
    expect(c.system).toBe(true);
    c.setPref("high");
    q.flip(false);
    expect(c.high).toBe(true);
    expect(r.dataset.contrast).toBe("high");
    // Back to the system: its answer as of now.
    c.setPref("system");
    expect(c.high).toBe(false);
    expect(r.dataset.contrast).toBe("normal");
  });

  it("remembers the choice per browser", () => {
    const s = new FakeStorage();
    const c = new ContrastSetting(s, new FakeQuery(false), null);
    c.setPref("high");
    expect(s.map.get(CONTRAST_KEY)).toBe("high");
    const again = new ContrastSetting(s, new FakeQuery(false), null);
    expect(again.pref).toBe("high");
    expect(again.high).toBe(true);
    again.setPref("system");
    expect(
      new ContrastSetting(s, new FakeQuery(true), null).pref
    ).toBe("system");
  });

  it("reads a damaged or unknown stored value as system", () => {
    for (const v of ["", "HIGH", "more", "{}", "true"]) {
      const s = new FakeStorage();
      s.map.set(CONTRAST_KEY, v);
      const c = new ContrastSetting(s, new FakeQuery(true), null);
      expect(c.pref).toBe("system");
      expect(c.high).toBe(true);
    }
  });

  it("survives storage that throws on every access (session only)", () => {
    const s = new FakeStorage();
    s.map.set(CONTRAST_KEY, "high");
    s.failGet = true;
    s.failSet = true;
    const r = root();
    const c = new ContrastSetting(s, new FakeQuery(false), r);
    expect(c.pref).toBe("system");
    expect(c.high).toBe(false);
    expect(() => c.setPref("high")).not.toThrow();
    expect(c.pref).toBe("high");
    expect(c.high).toBe(true);
    expect(r.dataset.contrast).toBe("high");
    expect(s.map.get(CONTRAST_KEY)).toBe("high"); // the old value, unread
  });

  it("works with no storage, no media query and no root", () => {
    const c = new ContrastSetting(null, null, null);
    expect(c.pref).toBe("system");
    expect(c.system).toBe(false);
    expect(c.high).toBe(false);
    c.setPref("high");
    expect(c.high).toBe(true);
  });

  it("survives a media query whose listener registration throws", () => {
    const q: MotionQueryLike = {
      matches: true,
      addEventListener: () => {
        throw new Error("no");
      },
    };
    expect(new ContrastSetting(null, q, null).high).toBe(true);
  });

  it("tells its listeners about a choice and an OS flip, and survives a throwing one", () => {
    const q = new FakeQuery(false);
    const c = new ContrastSetting(null, q, null);
    let n = 0;
    c.subscribe(() => {
      throw new Error("bad listener");
    });
    c.subscribe(() => n++);
    c.setPref("high");
    expect(n).toBe(1);
    q.flip(true);
    expect(n).toBe(2);
  });

  it("finds no media query outside a browser", () => {
    // Node has no matchMedia.
    expect(browserContrastQuery()).toBeNull();
  });

  it("names both OS settings in one query list", () => {
    expect(CONTRAST_QUERY).toBe(
      "(prefers-contrast: more), (forced-colors: active)"
    );
    expect(HIGH_CONTRAST_ROOT).toBe(':root[data-contrast="high"]');
  });
});

describe("MotionSetting.subscribe (K111)", () => {
  it("tells listeners about a choice and an OS flip, and survives a throwing one", () => {
    const q = new FakeQuery(false);
    const m = new MotionSetting(null, q, null);
    let n = 0;
    m.subscribe(() => {
      throw new Error("bad listener");
    });
    m.subscribe(() => n++);
    m.setPref("reduced");
    expect(n).toBe(1);
    q.flip(true);
    expect(n).toBe(2);
    expect(m.reduced).toBe(true);
  });
});

describe("the checkboxes", () => {
  it("Reduced motion: on pins reduced; off follows the system unless it asks", () => {
    expect(reducedMotionChoice(true, false)).toBe("reduced");
    expect(reducedMotionChoice(true, true)).toBe("reduced");
    // A calm system: unticking goes back to following it.
    expect(reducedMotionChoice(false, false)).toBe("system");
    // A system that asks: "system" would leave the box ticked, so pin full.
    expect(reducedMotionChoice(false, true)).toBe("full");
  });

  it("High contrast: on pins high; off follows the system unless it asks", () => {
    expect(highContrastChoice(true, false)).toBe("high");
    expect(highContrastChoice(true, true)).toBe("high");
    expect(highContrastChoice(false, false)).toBe("system");
    expect(highContrastChoice(false, true)).toBe("normal");
  });

  it("a tick and an untick through the settings land where they started", () => {
    const q = new FakeQuery(false);
    const m = new MotionSetting(new FakeStorage(), q, null);
    m.setPref(reducedMotionChoice(true, m.system));
    expect(m.reduced).toBe(true);
    m.setPref(reducedMotionChoice(false, m.system));
    expect(m.pref).toBe("system");
    expect(m.reduced).toBe(false);
    // The OS flips later: still followed.
    q.flip(true);
    expect(m.reduced).toBe(true);
    // On a system that asks, unticking really clears the box.
    m.setPref(reducedMotionChoice(false, m.system));
    expect(m.reduced).toBe(false);
    expect(m.pref).toBe("full");

    const hq = new FakeQuery(true);
    const c = new ContrastSetting(new FakeStorage(), hq, null);
    expect(c.high).toBe(true);
    c.setPref(highContrastChoice(false, c.system));
    expect(c.high).toBe(false);
    expect(c.pref).toBe("normal");
  });
});

// The stored params the overrides read: today's defaults, plus a viewer's
// own values on the keys the overrides touch.
const viewer = {
  ...PARAM_DEFAULTS,
  flowStrength: 0.7,
  flowSpeed: 1.5,
  background: "aurora" as const,
  backgroundColorMode: "gamut" as const,
  backgroundBase: "#336699",
  palette: "ember" as const,
  pathColor: "#12ab34",
  fadeLength: 0.5,
  gap: 0.05,
  markerSize: 0.8,
};

describe("effectiveParams", () => {
  it("is the stored object itself with both boxes off (today's frame)", () => {
    expect(effectiveParams(viewer, NO_A11Y)).toBe(viewer);
    expect(effectiveParams(PARAM_DEFAULTS, NO_A11Y)).toBe(PARAM_DEFAULTS);
    expect(overriddenKeys(NO_A11Y)).toEqual([]);
    for (const k of Object.keys(HIGH_CONTRAST_OVERRIDES) as Array<
      keyof typeof viewer
    >) {
      expect(effectiveParam(viewer, NO_A11Y, k as never)).toBe(viewer[k]);
    }
  });

  it("Reduced motion stills the flow and touches nothing else", () => {
    const e = effectiveParams(viewer, on({ reducedMotion: true }));
    expect(e).not.toBe(viewer);
    expect(e.flowStrength).toBe(0);
    expect(e.flowSpeed).toBe(0);
    const { flowStrength: _a, flowSpeed: _b, ...rest } = e;
    const { flowStrength: _c, flowSpeed: _d, ...restStored } = viewer;
    expect(rest).toEqual(restStored);
    expect(overriddenKeys(on({ reducedMotion: true })).sort()).toEqual(
      ["flowSpeed", "flowStrength"]
    );
  });

  it("High contrast overrides its list and nothing else", () => {
    const e = effectiveParams(viewer, on({ highContrast: true }));
    expect(e.background).toBe("none");
    expect(e.backgroundColorMode).toBe("custom");
    expect(e.backgroundBase).toBe("#000000");
    expect(e.palette).toBe("pastel");
    expect(e.pathColor).toBe("#ffff00");
    expect(e.fadeLength).toBe(0);
    expect(e.gap).toBe(HIGH_CONTRAST_GAP_MIN);
    expect(e.markerSize).toBe(HIGH_CONTRAST_MARKER_MIN);
    // The flow is Reduced motion's.
    expect(e.flowStrength).toBe(viewer.flowStrength);
    expect(e.flowSpeed).toBe(viewer.flowSpeed);
    // Everything not on the list is as stored.
    const touched = new Set<string>(Object.keys(HIGH_CONTRAST_OVERRIDES));
    for (const k of Object.keys(viewer) as Array<keyof typeof viewer>) {
      if (!touched.has(k)) expect(e[k]).toBe(viewer[k]);
    }
    expect(overriddenKeys(on({ highContrast: true })).sort()).toEqual(
      Object.keys(HIGH_CONTRAST_OVERRIDES).sort()
    );
  });

  it("the raising overrides keep a viewer's own larger value", () => {
    const big = { ...viewer, gap: 0.3, markerSize: 2.5 };
    const e = effectiveParams(big, on({ highContrast: true }));
    expect(e.gap).toBe(0.3);
    expect(e.markerSize).toBe(2.5);
  });

  it("both on is the union, and the two lists do not overlap", () => {
    const e = effectiveParams(viewer, { reducedMotion: true, highContrast: true });
    expect(e.flowStrength).toBe(0);
    expect(e.background).toBe("none");
    const rm = Object.keys(REDUCED_MOTION_OVERRIDES);
    const hc = Object.keys(HIGH_CONTRAST_OVERRIDES);
    expect(rm.filter((k) => hc.includes(k))).toEqual([]);
    expect(overriddenKeys({ reducedMotion: true, highContrast: true }).length).toBe(
      rm.length + hc.length
    );
  });

  it("never writes to the stored params, so off restores the viewer's values", () => {
    const stored = { ...viewer };
    const frozen = Object.freeze({ ...viewer });
    for (const flags of [
      on({ reducedMotion: true }),
      on({ highContrast: true }),
      { reducedMotion: true, highContrast: true },
    ]) {
      expect(() => effectiveParams(frozen, flags)).not.toThrow();
      effectiveParams(stored, flags);
      for (const k of Object.keys(HIGH_CONTRAST_OVERRIDES)) {
        effectiveParam(stored, flags, k as never);
      }
    }
    expect(stored).toEqual(viewer);
    // Off again: the viewer's own values, the same object.
    expect(effectiveParams(stored, NO_A11Y)).toBe(stored);
    expect(effectiveParam(stored, NO_A11Y, "gap")).toBe(0.05);
    expect(effectiveParam(stored, NO_A11Y, "flowStrength")).toBe(0.7);
  });

  it("effectiveParam agrees with effectiveParams, key by key", () => {
    const flags = { reducedMotion: true, highContrast: true };
    const all = effectiveParams(viewer, flags);
    for (const k of overriddenKeys(flags)) {
      expect(effectiveParam(viewer, flags, k)).toEqual(all[k]);
    }
  });
});

describe("the override values are real choices", () => {
  const hc = (k: keyof typeof HIGH_CONTRAST_OVERRIDES): unknown =>
    effectiveParam(viewer, on({ highContrast: true }), k as never);

  it("name existing options and in-range numbers", () => {
    expect(BACKGROUNDS).toContain(hc("background"));
    expect(BACKGROUND_COLOR_MODES).toContain(hc("backgroundColorMode"));
    expect(GAMUT_PALETTES).toContain(hc("palette"));
    expect(hc("backgroundBase")).toMatch(/^#[0-9a-f]{6}$/);
    expect(hc("pathColor")).toMatch(/^#[0-9a-f]{6}$/);
    expect(hc("markerSize") as number).toBeGreaterThanOrEqual(MARKER_SIZE_MIN);
    expect(hc("markerSize") as number).toBeLessThanOrEqual(MARKER_SIZE_MAX);
    // The panel's gap slider runs 0.04..0.5, fadeLength 0..1.2.
    expect(hc("gap") as number).toBeGreaterThanOrEqual(0.04);
    expect(hc("gap") as number).toBeLessThanOrEqual(0.5);
    expect(hc("fadeLength") as number).toBeGreaterThanOrEqual(0);
  });

  it("raise a default that is below the floor", () => {
    expect(PARAM_DEFAULTS.gap).toBeLessThan(HIGH_CONTRAST_GAP_MIN);
    expect(PARAM_DEFAULTS.markerSize).toBeLessThan(HIGH_CONTRAST_MARKER_MIN);
  });
});
