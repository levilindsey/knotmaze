import { describe, expect, it } from "vitest";
import { dailyParams } from "../../src/ui/daily_link";
import { PARAM_DEFAULTS, type UrlParams } from "../../src/ui/url_state";
import {
  LIVE_EFFECTS,
  UNDO_CAP,
  UndoStack,
  designKey,
  designState,
  restorePlan,
  undoFlags,
} from "../../src/ui/undo_stack";

const design = (over: Partial<UrlParams> = {}): UrlParams => ({
  seed: 12345,
  ...PARAM_DEFAULTS,
  ...over,
});
const strings = (initial = "a"): UndoStack<string> =>
  new UndoStack<string>(initial, (s) => s);

describe("UndoStack", () => {
  it("steps back and forward through committed states", () => {
    const st = strings();
    expect(st.canUndo).toBe(false);
    expect(st.canRedo).toBe(false);
    expect(st.commit("b")).toBe(true);
    expect(st.commit("c")).toBe(true);
    expect(st.current).toBe("c");
    expect(st.undo()).toBe("b");
    expect(st.undo()).toBe("a");
    expect(st.undo()).toBeNull();
    expect(st.current).toBe("a");
    expect(st.depth).toEqual({ undo: 0, redo: 2 });
    expect(st.redo()).toBe("b");
    expect(st.redo()).toBe("c");
    expect(st.redo()).toBeNull();
    expect(st.current).toBe("c");
  });

  it("records nothing for the current state", () => {
    const st = strings();
    expect(st.commit("a")).toBe(false);
    expect(st.canUndo).toBe(false);
    st.commit("b");
    expect(st.commit("b")).toBe(false);
    expect(st.depth).toEqual({ undo: 1, redo: 0 });
  });

  it("clears the redo side on a new change after an undo", () => {
    const st = strings();
    st.commit("b");
    st.commit("c");
    st.undo();
    expect(st.canRedo).toBe(true);
    // Committing the state already current keeps the redo side.
    st.commit("b");
    expect(st.canRedo).toBe(true);
    st.commit("d");
    expect(st.canRedo).toBe(false);
    expect(st.undo()).toBe("b");
    expect(st.undo()).toBe("a");
  });

  it("keeps the newest UNDO_CAP states behind the current one", () => {
    expect(UNDO_CAP).toBe(100);
    const st = new UndoStack<number>(0, String);
    for (let i = 1; i <= 105; i++) st.commit(i);
    expect(st.depth.undo).toBe(100);
    let last = 105;
    let steps = 0;
    for (let s = st.undo(); s !== null; s = st.undo()) {
      last = s;
      steps++;
    }
    expect(steps).toBe(100);
    // 0 to 4 dropped; 5 is the oldest left.
    expect(last).toBe(5);
    expect(st.depth).toEqual({ undo: 0, redo: 100 });
    const small = new UndoStack<number>(0, String, 3);
    for (let i = 1; i <= 5; i++) small.commit(i);
    expect([small.undo(), small.undo(), small.undo(), small.undo()]).toEqual([
      4, 3, 2, null,
    ]);
  });
});

describe("design states", () => {
  it("snapshots the params", () => {
    const p = design();
    const s = designState(p, null, false);
    p.hueShift = 90;
    expect(s.params.hueShift).toBe(PARAM_DEFAULTS.hueShift);
  });

  it("round-trips a daily through the stack", () => {
    const daily = designState(dailyParams(3), 3, true);
    const st = new UndoStack(daily, designKey);
    // The "Free play" badge's undo case in reverse: the daily left for a
    // free design, then back.
    st.commit(designState(design({ seed: 777 }), null, true));
    const back = st.undo();
    expect(back).not.toBeNull();
    expect(back!.daily).toBe(3);
    expect(back!.floating).toBe(true);
    expect(back!.params).toEqual(dailyParams(3));
    expect(designKey(back!)).toBe(designKey(daily));
  });

  it("keys a design by its link and the daily on screen", () => {
    const p = design({ gap: 1.45 });
    const base = designKey(designState(p, null, false));
    // Float noise from a slider step is the same link.
    expect(designKey(designState({ ...p, gap: 1.4500000000000002 }, null, false))).toBe(base);
    // floating means nothing off a daily.
    expect(designKey(designState(p, null, true))).toBe(base);
    expect(designKey(designState(p, 4, false))).not.toBe(base);
    expect(designKey(designState(p, 4, true))).not.toBe(
      designKey(designState(p, 4, false))
    );
    // A playback preference on a daily is a change (K92's call).
    const d = dailyParams(3);
    expect(designKey(designState({ ...d, volume: d.volume / 2 }, 3, false))).not.toBe(
      designKey(designState(d, 3, false))
    );
  });
});

describe("undoFlags", () => {
  it("enables each button only when it can act", () => {
    const st = new UndoStack(designState(design(), null, false), designKey);
    const first = designState(design(), null, false);
    expect(undoFlags(st, first)).toEqual({ undo: false, redo: false });
    const second = designState(design({ hueShift: 30 }), null, false);
    // On screen but not recorded yet (a drag under way): undo can act.
    expect(undoFlags(st, second)).toEqual({ undo: true, redo: false });
    st.commit(second);
    expect(undoFlags(st, second)).toEqual({ undo: true, redo: false });
    st.undo();
    expect(undoFlags(st, first)).toEqual({ undo: false, redo: true });
    // A change after the undo will clear redo: redo is off at once.
    const third = designState(design({ gap: 2 }), null, false);
    expect(undoFlags(st, third)).toEqual({ undo: true, redo: false });
  });
});

describe("restorePlan", () => {
  it("applies live params in place and rebuilds for the rest", () => {
    const a = design();
    expect(restorePlan(a, { ...a }, false)).toEqual({
      changed: [],
      rebuild: false,
      effects: [],
    });
    expect(restorePlan(a, { ...a, hueShift: 40 }, false)).toEqual({
      changed: ["hueShift"],
      rebuild: false,
      effects: ["onRecolor"],
    });
    const several = restorePlan(
      a,
      { ...a, clock: "realtime", volume: 0.1, threadWidth: 0.5, slack: 0.9 },
      false
    );
    expect(several.rebuild).toBe(false);
    expect(several.effects).toEqual([
      "onSlackChange",
      "onStyleChange",
      "onVolumeChange",
      "onClockChange",
    ]);
    expect(restorePlan(a, { ...a, seed: 99 }, false).rebuild).toBe(true);
    expect(restorePlan(a, { ...a, gridSize: a.gridSize + 2 }, false).rebuild).toBe(true);
    expect(restorePlan(a, { ...a, hueShift: 40, deadEnds: !a.deadEnds }, false)).toMatchObject({
      rebuild: true,
      effects: [],
    });
    // Opening a daily always rebuilds: its saved attempt comes back.
    expect(restorePlan(a, { ...a }, true).rebuild).toBe(true);
    // Float noise is no change.
    expect(restorePlan(a, { ...a, gap: a.gap + 1e-12 }, false).changed).toEqual([]);
  });

  it("skips an appearance preset's implied values", () => {
    const a = design({ appearMode: "random" });
    const rolled = { ...a, appearSpeed: a.appearSpeed + 1, appearSequence: "spiral" } as UrlParams;
    expect(restorePlan(a, rolled, false).changed).toEqual([]);
    const custom = design({ appearMode: "custom" });
    expect(
      restorePlan(custom, { ...custom, appearSequence: "spiral" } as UrlParams, false).rebuild
    ).toBe(true);
  });

  // K145's hover glow: its row runs onTrailChange, so undoing it keeps the
  // solve on screen.
  it("applies the choices' look live", () => {
    const a = design();
    expect(restorePlan(a, { ...a, hoverGlow: 0.9 }, false)).toEqual({
      changed: ["hoverGlow"],
      rebuild: false,
      effects: ["onTrailChange"],
    });
  });

  it("lists only real params, each under one effect", () => {
    const seen = new Set<string>();
    for (const keys of Object.values(LIVE_EFFECTS)) {
      for (const k of keys) {
        expect(Object.hasOwn(PARAM_DEFAULTS, k), k).toBe(true);
        expect(seen.has(k), k).toBe(false);
        seen.add(k);
      }
    }
  });
});
