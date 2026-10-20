import { describe, expect, it } from "vitest";
import { encodeParams, PARAM_DEFAULTS, parseParams } from "../../src/ui/url_state";
import {
  DAILY_EXEMPT_KEYS,
  dailyParams,
  dailyTitle,
  parseLaunch,
  sceneTitle,
} from "../../src/ui/daily_link";
import { LIVE_EFFECTS, restorePlan } from "../../src/ui/undo_stack";

// K552: the dailyTitleThread flag (`dtt`). Off by default, a daily
// playback preference (exempt: the daily stays the daily), and the one
// gate for a scene's title is sceneTitle (main.ts's prebuild and its
// rebuilds both call it).

describe("K552 the dailyTitleThread flag", () => {
  it("sceneTitle titles only a daily with the flag on", () => {
    expect(sceneTitle(8, { dailyTitleThread: false })).toBe("");
    expect(sceneTitle(8, { dailyTitleThread: true })).toBe(dailyTitle(8));
    expect(sceneTitle(null, { dailyTitleThread: true })).toBe("");
    expect(sceneTitle(null, { dailyTitleThread: false })).toBe("");
    expect(sceneTitle(8, dailyParams(8))).toBe("");
  });

  it("is off by default, and the default link is unchanged", () => {
    expect(PARAM_DEFAULTS.dailyTitleThread).toBe(false);
    expect(encodeParams({ ...PARAM_DEFAULTS, seed: 123456 })).toBe((123456).toString(36));
  });

  it("round-trips through the link token, on and off", () => {
    const on = { ...PARAM_DEFAULTS, seed: 98765, dailyTitleThread: true };
    const token = encodeParams(on);
    expect(token).not.toBe((98765).toString(36));
    expect(parseParams(`?${token}`).dailyTitleThread).toBe(true);
    expect(parseParams(`?${token}`)).toEqual(on);
    const off = { ...on, dailyTitleThread: false };
    expect(parseParams(`?${encodeParams(off)}`).dailyTitleThread).toBe(false);
    // key=value overrides after a token, and key=value links.
    expect(parseParams(`?${(98765).toString(36)}&dtt=1`).dailyTitleThread).toBe(true);
    expect(parseParams(`?${token}&dtt=0`).dailyTitleThread).toBe(false);
    expect(parseParams("?s=98765&dtt=1").dailyTitleThread).toBe(true);
  });

  it("keeps the daily: a link with the flag on, or the stored pref", () => {
    const today = 12;
    const link = parseLaunch("?daily=8&dtt=1", today);
    expect(link.daily).toBe(8);
    expect(link.params.dailyTitleThread).toBe(true);
    expect(sceneTitle(link.daily, link.params)).toBe(dailyTitle(8));
    // Everything else is the daily's design.
    expect({ ...link.params, dailyTitleThread: false }).toEqual(dailyParams(8));

    const plain = parseLaunch("?daily=8", today);
    expect(plain.params.dailyTitleThread).toBe(false);
    expect(sceneTitle(plain.daily, plain.params)).toBe("");

    // The stored pref (merged into `launch` before main.ts's prebuild).
    const pref = parseLaunch("?daily=8", today, { dailyTitleThread: true });
    expect(pref.daily).toBe(8);
    expect(pref.params.dailyTitleThread).toBe(true);
    const bare = parseLaunch("", today, { dailyTitleThread: true });
    expect(bare.daily).toBe(today);
    expect(sceneTitle(bare.daily, bare.params)).toBe(dailyTitle(today));
    // A link's own value wins over the pref.
    expect(parseLaunch("?daily=8&dtt=0", today, { dailyTitleThread: true }).params.dailyTitleThread).toBe(false);

    expect(DAILY_EXEMPT_KEYS).toContain("dailyTitleThread");
  });

  it("is not a live effect: a toggle and its undo rebuild the scene", () => {
    for (const keys of Object.values(LIVE_EFFECTS)) {
      expect(keys as readonly string[]).not.toContain("dailyTitleThread");
    }
    const from = dailyParams(8);
    const to = { ...from, dailyTitleThread: true };
    expect(restorePlan(from, to, false)).toEqual({
      changed: ["dailyTitleThread"],
      rebuild: true,
      effects: [],
    });
    expect(restorePlan(to, from, false).rebuild).toBe(true);
  });
});
