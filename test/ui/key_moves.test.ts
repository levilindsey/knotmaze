import { describe, expect, it } from "vitest";
import {
  chordDirection,
  departureVectors,
  HeldKeys,
  KEY_REACH,
  KEY_TIE,
  KEY_TOLERANCE,
  keyBelongsElsewhere,
  keyDirOf,
  pickDeparture,
  pickHold,
} from "../../src/ui/key_moves";
import type { Departure, PointAt, RunEnds } from "../../src/ui/key_moves";

// K120: the arrow keys (and the move pad) pick a run at the junction by
// where it goes on screen.

const DEG = Math.PI / 180;
const dep = (edge: number, deg: number): Departure => ({
  edge,
  dx: Math.cos(deg * DEG),
  // Screen y is down: +90 degrees here points DOWN.
  dy: Math.sin(deg * DEG),
});

describe("keyDirOf", () => {
  it("reads the arrows by key and WASD by physical position", () => {
    expect(keyDirOf({ key: "ArrowUp", code: "ArrowUp" })).toBe("up");
    expect(keyDirOf({ key: "ArrowDown", code: "ArrowDown" })).toBe("down");
    expect(keyDirOf({ key: "ArrowLeft", code: "ArrowLeft" })).toBe("left");
    expect(keyDirOf({ key: "ArrowRight", code: "ArrowRight" })).toBe("right");
    expect(keyDirOf({ key: "w", code: "KeyW" })).toBe("up");
    expect(keyDirOf({ key: "a", code: "KeyA" })).toBe("left");
    expect(keyDirOf({ key: "s", code: "KeyS" })).toBe("down");
    expect(keyDirOf({ key: "d", code: "KeyD" })).toBe("right");
    // AZERTY's Z sits where QWERTY's W does: still up.
    expect(keyDirOf({ key: "z", code: "KeyW" })).toBe("up");
    // Dvorak's comma sits at KeyW too.
    expect(keyDirOf({ key: ",", code: "KeyW" })).toBe("up");
  });

  it("ignores every other key", () => {
    expect(keyDirOf({ key: "x", code: "KeyX" })).toBeNull();
    expect(keyDirOf({ key: "Enter", code: "Enter" })).toBeNull();
    expect(keyDirOf({ key: "w" })).toBeNull();
    expect(keyDirOf({ key: " ", code: "Space" })).toBeNull();
  });
});

describe("pickDeparture", () => {
  // A plain T-junction: right (0), up (-90), left (180).
  const tee = [dep(0, 0), dep(1, -90), dep(2, 180)];

  it("takes the best match for each key", () => {
    expect(pickDeparture(tee, "right", { hold: false })).toMatchObject({ edge: 0 });
    expect(pickDeparture(tee, "up", { hold: false })).toMatchObject({ edge: 1 });
    expect(pickDeparture(tee, "left", { hold: false })).toMatchObject({ edge: 2 });
    // Nothing goes down.
    expect(pickDeparture(tee, "down", { hold: false })).toEqual({ edge: -1, stop: "none" });
  });

  it("matches within the tolerance and not beyond it", () => {
    const tolDeg = KEY_TOLERANCE / DEG;
    const inside = [dep(4, -(tolDeg - 1))]; // up-right, just inside for "right"
    const outside = [dep(4, -(tolDeg + 1))];
    expect(pickDeparture(inside, "right", { hold: false })).toMatchObject({ edge: 4 });
    expect(pickDeparture(outside, "right", { hold: false })).toEqual({
      edge: -1,
      stop: "none",
    });
    // A custom tolerance wins over the default.
    expect(pickDeparture(inside, "right", { hold: false, tolerance: 10 * DEG })).toEqual({
      edge: -1,
      stop: "none",
    });
  });

  it("reports how far off the match is", () => {
    const p = pickDeparture([dep(3, 20)], "right", { hold: false });
    expect(p.edge).toBe(3);
    if (p.edge >= 0 && "err" in p) expect(p.err).toBeCloseTo(20 * DEG, 9);
  });

  it("a press takes the best even on a near tie; a hold stops there", () => {
    const tieDeg = KEY_TIE / DEG;
    // Two runs either side of "right", the second just inside the tie.
    const fork = [dep(5, -20), dep(6, 20 + tieDeg * 0.5)];
    expect(pickDeparture(fork, "right", { hold: false })).toMatchObject({ edge: 5 });
    expect(pickDeparture(fork, "right", { hold: true })).toEqual({ edge: -1, stop: "tie" });
    // Clear of the tie margin, the hold goes on.
    const clear = [dep(5, -10), dep(6, 10 + tieDeg + 1)];
    expect(pickDeparture(clear, "right", { hold: true })).toMatchObject({ edge: 5 });
    // A runner-up beyond the tolerance is no rival, however close.
    const tolDeg = KEY_TOLERANCE / DEG;
    const far = [dep(5, -(tolDeg - 2)), dep(6, tolDeg + 1)];
    expect(pickDeparture(far, "right", { hold: true })).toMatchObject({ edge: 5 });
  });

  it("an exact tie in angle breaks to the lower run id", () => {
    const sym = [dep(9, -30), dep(4, 30)];
    expect(pickDeparture(sym, "right", { hold: false })).toMatchObject({ edge: 4 });
  });

  it("a hold never turns straight back on the run it arrived on", () => {
    // Arrived along run 7 from the left; the key is still left.
    const deps = [dep(7, 180), dep(8, -60), dep(9, 60)];
    expect(pickDeparture(deps, "left", { hold: true, exclude: 7 })).toEqual({
      edge: -1,
      stop: "none",
    });
    // A press may turn back (a backtrack, like tapping that run).
    expect(pickDeparture(deps, "left", { hold: false, exclude: 7 })).toMatchObject({
      edge: 7,
    });
  });

  it("stops at a dead-end tip: its only run is the arrival", () => {
    expect(pickDeparture([dep(3, 0)], "right", { hold: true, exclude: 3 })).toEqual({
      edge: -1,
      stop: "none",
    });
  });

  it("a self-loop's two departures are one run, not rivals", () => {
    // The loop leaves at -10 and comes back in at +12: both near "right".
    const deps = [dep(2, -10), dep(2, 12), dep(3, 180)];
    expect(pickDeparture(deps, "right", { hold: true })).toMatchObject({ edge: 2 });
  });

  it("nothing to choose from is a stop", () => {
    expect(pickDeparture([], "up", { hold: false })).toEqual({ edge: -1, stop: "none" });
    expect(pickDeparture([], "up", { hold: true })).toEqual({ edge: -1, stop: "none" });
  });
});

describe("chordDirection / departureVectors", () => {
  // Chain 0: a straight line along +x, one world unit per ctrl.
  // Chain 1: a quarter-turn hook - one ctrl right, then down.
  // Chain 2: a loop of circumference 4 through (0, 0), drawn clockwise
  // on screen: right, down, left, back up.
  const pointAt: PointAt = (chain, ctrl, out) => {
    if (chain === 0) {
      out[0] = ctrl;
      out[1] = 0;
    } else if (chain === 1) {
      out[0] = Math.min(ctrl, 1);
      out[1] = Math.max(0, ctrl - 1);
    } else {
      const a = (ctrl / 4) * 2 * Math.PI - Math.PI / 2;
      // Circle of radius 2/pi centered below the origin.
      const r = 2 / Math.PI;
      out[0] = r * Math.cos(a);
      out[1] = r + r * Math.sin(a);
    }
  };
  const line: RunEnds = { va: "J", vb: "K", chain: 0, ctrlA: 0, ctrlB: 10 };

  it("reads a straight run's direction from either end", () => {
    const fromA = chordDirection(line, true, 0, 0, pointAt)!;
    expect(fromA[0]).toBeCloseTo(1, 9);
    expect(fromA[1]).toBeCloseTo(0, 9);
    const fromB = chordDirection(line, false, 10, 0, pointAt)!;
    expect(fromB[0]).toBeCloseTo(-1, 9);
  });

  it("aims the chord KEY_REACH along the arc, not at the tangent", () => {
    // From (0,0) along the hook: 1 right, then KEY_REACH - 1 down.
    const hook: RunEnds = { va: "J", vb: "K", chain: 1, ctrlA: 0, ctrlB: 5 };
    const d = chordDirection(hook, true, 0, 0, pointAt)!;
    const ex = 1;
    const ey = KEY_REACH - 1;
    const n = Math.hypot(ex, ey);
    expect(d[0]).toBeCloseTo(ex / n, 1);
    expect(d[1]).toBeCloseTo(ey / n, 1);
    // A longer reach leans further down.
    const d4 = chordDirection(hook, true, 0, 0, pointAt, 4)!;
    expect(d4[1]).toBeGreaterThan(d[1]);
  });

  it("a run shorter than the reach aims at its far end", () => {
    const short: RunEnds = { va: "J", vb: "K", chain: 1, ctrlA: 0, ctrlB: 1.2 };
    const d = chordDirection(short, true, 0, 0, pointAt, 5)!;
    const n = Math.hypot(1, 0.2);
    expect(d[0]).toBeCloseTo(1 / n, 6);
    expect(d[1]).toBeCloseTo(0.2 / n, 6);
  });

  it("a short self-loop aims at its farthest point, from each end", () => {
    const loop: RunEnds = { va: "J", vb: "J", chain: 2, ctrlA: 0, ctrlB: 4 };
    const deps = departureVectors([loop], [0], "J", 0, 0, pointAt, 10);
    expect(deps.length).toBe(2);
    for (const d of deps) {
      // The loop's farthest point is straight below the junction.
      expect(d.edge).toBe(0);
      expect(d.dx).toBeCloseTo(0, 1);
      expect(d.dy).toBeCloseTo(1, 2);
    }
    // At a short reach the two ends leave in different directions.
    const near = departureVectors([loop], [0], "J", 0, 0, pointAt, 0.5);
    expect(near[0].dx).toBeGreaterThan(0.5);
    expect(near[1].dx).toBeLessThan(-0.5);
  });

  it("lists one departure per run end at the junction", () => {
    const back: RunEnds = { va: "K", vb: "J", chain: 0, ctrlA: -10, ctrlB: 0 };
    const deps = departureVectors([line, back], [0, 1], "J", 0, 0, pointAt);
    expect(deps.map((d) => d.edge)).toEqual([0, 1]);
    expect(deps[0].dx).toBeCloseTo(1, 9);
    expect(deps[1].dx).toBeCloseTo(-1, 9);
    expect(pickDeparture(deps, "left", { hold: false })).toMatchObject({ edge: 1 });
  });
});

describe("HeldKeys", () => {
  it("the newest held direction steers; releasing it returns to the older", () => {
    const h = new HeldKeys();
    expect(h.current).toBeNull();
    expect(h.press("ArrowRight", "right")).toBe(true);
    expect(h.press("ArrowUp", "up")).toBe(true);
    expect(h.current).toBe("up");
    h.release("ArrowUp");
    expect(h.current).toBe("right");
    h.release("ArrowRight");
    expect(h.current).toBeNull();
  });

  it("a source already held is not a fresh press", () => {
    const h = new HeldKeys();
    expect(h.press("KeyD", "right")).toBe(true);
    expect(h.press("KeyD", "right")).toBe(false);
    expect(h.size).toBe(1);
    expect(h.has("KeyD")).toBe(true);
    expect(h.has("ArrowRight")).toBe(false);
    h.clear();
    expect(h.size).toBe(0);
    expect(h.has("KeyD")).toBe(false);
  });

  it("lists each held direction once, newest first", () => {
    const h = new HeldKeys();
    h.press("ArrowRight", "right");
    h.press("KeyW", "up");
    h.press("KeyD", "right"); // A second source for right: now the newest.
    expect(h.dirs).toEqual(["right", "up"]);
    h.release("KeyD");
    expect(h.dirs).toEqual(["up", "right"]);
    h.press("pad:3", "down");
    expect(h.dirs).toEqual(["down", "up", "right"]);
  });
});

describe("pickHold", () => {
  // A junction with runs right (0), up (1) and down-right (2).
  const deps = [dep(0, 0), dep(1, -90), dep(2, 60)];

  it("takes the newest key's match", () => {
    expect(pickHold(deps, ["up", "right"], -1)).toMatchObject({ edge: 1 });
    expect(pickHold(deps, ["right", "up"], -1)).toMatchObject({ edge: 0 });
  });

  it("falls back to an older key where the newest has no match", () => {
    expect(pickHold(deps, ["left", "right"], -1)).toMatchObject({ edge: 0 });
    // Up is the arrival run: excluded, so the older key steers.
    expect(pickHold(deps, ["up", "right"], 1)).toMatchObject({ edge: 0 });
  });

  it("stops on a tie in any key it reaches", () => {
    // Runs 15 degrees either side of down: down is a tie.
    const fork = [dep(0, 0), dep(1, 75), dep(2, 105)];
    expect(pickHold(fork, ["down", "right"], -1)).toMatchObject({
      edge: -1,
      stop: "tie",
    });
    // Right comes first and matches: the tie in down is never reached.
    expect(pickHold(fork, ["right", "down"], -1)).toMatchObject({ edge: 0 });
  });

  it("no key matching is a stop", () => {
    expect(pickHold(deps, ["left"], -1)).toEqual({ edge: -1, stop: "none" });
    expect(pickHold(deps, [], -1)).toEqual({ edge: -1, stop: "none" });
  });
});

describe("keyBelongsElsewhere", () => {
  const base = {
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target: null as EventTarget | null,
  };
  const el = (matches: string[]) =>
    ({
      closest: (sel: string) =>
        sel.split(",").some((s) => matches.includes(s.trim())) ? {} : null,
    }) as unknown as EventTarget;

  it("leaves modifier chords and handled keys alone", () => {
    expect(keyBelongsElsewhere(base)).toBe(false);
    expect(keyBelongsElsewhere({ ...base, ctrlKey: true })).toBe(true);
    expect(keyBelongsElsewhere({ ...base, altKey: true })).toBe(true);
    expect(keyBelongsElsewhere({ ...base, metaKey: true })).toBe(true);
    expect(keyBelongsElsewhere({ ...base, shiftKey: true })).toBe(true);
    expect(keyBelongsElsewhere({ ...base, defaultPrevented: true })).toBe(true);
  });

  it("leaves text fields and the panel alone", () => {
    expect(keyBelongsElsewhere({ ...base, target: el(["input"]) })).toBe(true);
    expect(keyBelongsElsewhere({ ...base, target: el(["textarea"]) })).toBe(true);
    expect(keyBelongsElsewhere({ ...base, target: el([".tp-rotv"]) })).toBe(true);
    expect(keyBelongsElsewhere({ ...base, target: el(["canvas"]) })).toBe(false);
  });
});
