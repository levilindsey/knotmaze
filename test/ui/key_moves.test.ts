import { describe, expect, it } from "vitest";
import {
  absorbsChord,
  CHORD_WINDOW_MS,
  chordDirection,
  chordEdges,
  chordMap,
  chordMatters,
  chordOf,
  departureVectors,
  HeldKeys,
  holdDue,
  joinsChord,
  KEY_REACH,
  KEY_TIE,
  KEY_TOLERANCE,
  keyBelongsElsewhere,
  keyDirOf,
  keyMap,
  MoveWait,
  pickChord,
  pickDeparture,
  pickHold,
  pickMove,
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

  it("an ambiguous key takes the near-tied run no other key reaches", () => {
    // Up-right, down-right, down-left: right and down are each torn
    // between two runs; up and left take theirs, so both take down-right.
    const m = keyMap([dep(1, -45), dep(2, 45), dep(3, 135)]);
    expect(m.up).toMatchObject({ edge: 1 });
    expect(m.left).toMatchObject({ edge: 3 });
    expect(m.right).toMatchObject({ edge: 2 });
    expect(m.down).toMatchObject({ edge: 2 });
  });

  it("an ambiguous key whose runs other keys reach does nothing", () => {
    // Up-right, down-right, left: right is a fork that up and down settle.
    const deps = [dep(1, -40), dep(2, 48), dep(3, 180)];
    expect(pickDeparture(deps, "right", { hold: false })).toEqual({ edge: -1, stop: "tie" });
    expect(pickDeparture(deps, "right", { hold: true })).toEqual({ edge: -1, stop: "tie" });
    expect(pickDeparture(deps, "up", { hold: false })).toMatchObject({ edge: 1 });
    expect(pickDeparture(deps, "down", { hold: false })).toMatchObject({ edge: 2 });
    // Clear of the tie margin, right takes the nearer.
    const tieDeg = KEY_TIE / DEG;
    const clear = [dep(1, -10), dep(2, 10 + tieDeg + 1), dep(3, 180)];
    expect(pickDeparture(clear, "right", { hold: true })).toMatchObject({ edge: 1 });
    // A runner-up beyond the tolerance is no rival, however close.
    const tolDeg = KEY_TOLERANCE / DEG;
    const far = [dep(5, -(tolDeg - 2)), dep(6, tolDeg + 1)];
    expect(pickDeparture(far, "right", { hold: true })).toMatchObject({ edge: 5 });
  });

  it("an exact tie is ambiguous too", () => {
    const sym = [dep(9, -30), dep(4, 30)];
    expect(pickDeparture(sym, "right", { hold: false })).toEqual({ edge: -1, stop: "tie" });
    // Two near-tied runs that no other key reaches: still nothing.
    const m = keyMap([dep(9, -30), dep(4, 30)], { tolerance: 50 * DEG });
    expect(m.right).toEqual({ edge: -1, stop: "tie" });
    expect(m.up).toEqual({ edge: -1, stop: "none" });
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

  it("aims the chord the reach along the arc, not at the tangent", () => {
    // From (0,0) along the hook: 1 right, then 0.5 down.
    const hook: RunEnds = { va: "J", vb: "K", chain: 1, ctrlA: 0, ctrlB: 5 };
    const d = chordDirection(hook, true, 0, 0, pointAt, 1.5)!;
    const ex = 1;
    const ey = 0.5;
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

  it("reads at KEY_REACH by default", () => {
    const hook: RunEnds = { va: "J", vb: "K", chain: 1, ctrlA: 0, ctrlB: 5 };
    const d = chordDirection(hook, true, 0, 0, pointAt)!;
    const e = chordDirection(hook, true, 0, 0, pointAt, KEY_REACH)!;
    expect(d).toEqual(e);
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
    // A panel button (a folder title, Reset path) does not use the arrows.
    expect(keyBelongsElsewhere({ ...base, target: el([".tp-rotv", "button"]) })).toBe(false);
  });
});

// K329: Levi's link ?qoietk.KaIeBFFfBGVG3x8Mj4, the junction right after the
// entrance (node_2), as the live maze measured it: four arms near the
// diagonals. Every key tied between the two arms beside it, nothing was
// unambiguous, and no key moved.
const NODE_2 = [dep(15, -50.8), dep(54, 41.9), dep(18, 147.4), dep(53, -138)];
const keysOf = (m: ReturnType<typeof keyMap>) => [
  m.up.edge,
  m.right.edge,
  m.down.edge,
  m.left.edge,
];

describe("K329 tie cycles", () => {
  it("every key moves at Levi's X (no key did before K329)", () => {
    const m = keyMap(NODE_2);
    // Each key the arm clockwise of it: up the up-right arm, right the
    // down-right, down the down-left, left the up-left (the way back).
    expect(m.up).toMatchObject({ edge: 15, tied: true, cycle: true });
    expect(m.right).toMatchObject({ edge: 54, tied: true, cycle: true });
    expect(m.down).toMatchObject({ edge: 18, tied: true, cycle: true });
    expect(m.left).toMatchObject({ edge: 53, tied: true, cycle: true });
    for (const dir of ["up", "right", "down", "left"] as const) {
      expect(pickDeparture(NODE_2, dir, { hold: false }).edge).toBeGreaterThanOrEqual(0);
    }
  });

  it("an X deals its arms clockwise while every key is tied", () => {
    for (const tilt of [-7, -3, 0, 3, 7]) {
      const x = [dep(1, -45 + tilt), dep(2, 45 + tilt), dep(3, 135 + tilt), dep(4, -135 + tilt)];
      expect(keysOf(keyMap(x))).toEqual([1, 2, 3, 4]);
    }
    // Past the tie margin each key simply takes the nearer arm.
    const ccw = [dep(1, -45 + 9), dep(2, 45 + 9), dep(3, 135 + 9), dep(4, -135 + 9)];
    expect(keysOf(keyMap(ccw))).toEqual([4, 1, 2, 3]);
    const cw = [dep(1, -45 - 20), dep(2, 45 - 20), dep(3, 135 - 20), dep(4, -135 - 20)];
    expect(keysOf(keyMap(cw))).toEqual([1, 2, 3, 4]);
  });

  it("a narrow fork between two keys gives each key the branch on its side", () => {
    // Two branches 14 degrees apart between up and right, and a run left.
    const fork = [dep(1, -52), dep(2, -38), dep(3, 180)];
    const m = keyMap(fork);
    expect(m.up).toMatchObject({ edge: 1, cycle: true });
    expect(m.right).toMatchObject({ edge: 2, cycle: true });
    expect(m.left).toMatchObject({ edge: 3 });
    expect(m.down).toEqual({ edge: -1, stop: "none" });
  });

  it("a hold stops where only a tie cycle picked", () => {
    expect(pickDeparture(NODE_2, "up", { hold: true })).toEqual({ edge: -1, stop: "tie" });
    expect(pickHold(NODE_2, ["right"], -1)).toEqual({ edge: -1, stop: "tie" });
    // Arrived along the way back (53): up and left are clear now, and right
    // and down both take the down-right arm, as before K329.
    expect(keysOf(keyMap(NODE_2, { exclude: 53 }))).toEqual([15, 54, 54, 18]);
    expect(pickHold(NODE_2, ["up"], 53)).toMatchObject({ edge: 15 });
  });
});

describe("K333 chords", () => {
  const tee = [dep(0, 0), dep(1, -90), dep(2, 180)];

  it("names a diagonal for two adjacent keys, in either order", () => {
    expect(chordOf("up", "right")).toBe("upRight");
    expect(chordOf("right", "up")).toBe("upRight");
    expect(chordOf("down", "right")).toBe("downRight");
    expect(chordOf("left", "down")).toBe("downLeft");
    expect(chordOf("up", "left")).toBe("upLeft");
    expect(chordOf("up", "down")).toBeNull();
    expect(chordOf("left", "right")).toBeNull();
    expect(chordOf("up", "up")).toBeNull();
  });

  it("picks along the diagonal by the keys' rules", () => {
    const c = chordMap(NODE_2);
    expect(c.upRight).toMatchObject({ edge: 15 });
    expect(c.downRight).toMatchObject({ edge: 54 });
    expect(c.downLeft).toMatchObject({ edge: 18 });
    expect(c.upLeft).toMatchObject({ edge: 53 });
    // A plain T (right, up, left): down + right and down + left take the
    // side runs, so up + right and up + left, each torn between a side run
    // and up, take up.
    expect(pickChord(tee, "downRight", { hold: false })).toMatchObject({ edge: 0 });
    expect(pickChord(tee, "downLeft", { hold: false })).toMatchObject({ edge: 2 });
    expect(pickChord(tee, "upRight", { hold: false })).toMatchObject({ edge: 1, tied: true });
    expect(pickChord(tee, "upLeft", { hold: false })).toMatchObject({ edge: 1, tied: true });
  });

  it("a press is a chord of two adjacent keys, else the newer key", () => {
    expect(pickMove(NODE_2, ["up", "left"], { hold: false })).toMatchObject({ edge: 53 });
    expect(pickMove(NODE_2, ["left", "up"], { hold: false })).toMatchObject({ edge: 53 });
    expect(pickMove(NODE_2, ["down", "right"], { hold: false })).toMatchObject({ edge: 54 });
    expect(pickMove(NODE_2, ["up", "down"], { hold: false })).toMatchObject({ edge: 18 });
    expect(pickMove(NODE_2, ["left"], { hold: false })).toMatchObject({ edge: 53 });
    expect(pickMove(NODE_2, [], { hold: false })).toEqual({ edge: -1, stop: "none" });
  });

  it("lists what each chord of a key picks", () => {
    expect(chordEdges(NODE_2, "up")).toEqual({ left: 53, right: 15 });
    expect(chordEdges(NODE_2, "right")).toEqual({ up: 15, down: 54 });
  });

  it("a lone press waits for a chord only where the key alone is unclear", () => {
    // The X: up alone is a tie cycle's pick, and up + left picks another arm.
    expect(chordMatters(NODE_2, "up")).toBe(true);
    // A plain T: every key with a run is clear.
    for (const k of ["up", "right", "left"] as const) expect(chordMatters(tee, k)).toBe(false);
    // Nothing goes down, and down's chords find the side runs.
    expect(chordMatters(tee, "down")).toBe(true);
    // Up-right, down-right, left: right ties, and its chords pick the
    // branches.
    const fork = [dep(1, -40), dep(2, 48), dep(3, 180)];
    expect(chordMatters(fork, "right")).toBe(true);
    expect(chordMatters(fork, "up")).toBe(false);
    // A dead-end tip: no chord picks anything but the one run.
    expect(chordMatters([dep(3, 0)], "right")).toBe(false);
  });

  it("joins a second key inside the window", () => {
    const p = { dirs: ["up"] as const, at: 1000 };
    expect(joinsChord(p, "right", 1050)).toBe(true);
    expect(joinsChord(p, "left", 1000 + CHORD_WINDOW_MS)).toBe(true);
    expect(joinsChord(p, "right", 1001 + CHORD_WINDOW_MS)).toBe(false);
    expect(joinsChord(p, "down", 1010)).toBe(false); // Opposite.
    expect(joinsChord(p, "up", 1010)).toBe(false); // The same key.
    expect(joinsChord({ dirs: ["up", "right"], at: 1000 }, "left", 1010)).toBe(false);
    expect(joinsChord(null, "up", 0)).toBe(false);
  });

  it("absorbs a late second key whose chord took the run already taken", () => {
    const last = { dir: "right" as const, at: 1000, edge: 5, chords: { up: 5, down: 7 } };
    expect(absorbsChord(last, "up", 1040, true)).toBe(true);
    expect(absorbsChord(last, "down", 1040, true)).toBe(false); // Another run.
    expect(absorbsChord(last, "up", 1001 + CHORD_WINDOW_MS, true)).toBe(false);
    expect(absorbsChord(last, "up", 1040, false)).toBe(false); // First key up.
    expect(absorbsChord(last, "left", 1040, true)).toBe(false);
    expect(absorbsChord(null, "up", 1040, true)).toBe(false);
  });

  it("holds a chord of two keys that went down together", () => {
    const h = new HeldKeys();
    h.press("ArrowUp", "up", 1000);
    expect(h.chord()).toBeNull();
    h.press("ArrowRight", "right", 1050);
    expect(h.chord()).toBe("upRight");
    expect(h.holds("up")).toBe(true);
    expect(h.holds("down")).toBe(false);
    h.release("ArrowUp");
    expect(h.chord()).toBeNull();
    h.press("KeyW", "up", 1050 + CHORD_WINDOW_MS + 1); // Too late: no chord.
    expect(h.chord()).toBeNull();
    const o = new HeldKeys();
    o.press("ArrowUp", "up", 0);
    o.press("ArrowDown", "down", 10);
    expect(o.chord()).toBeNull();
  });

  it("a held chord steers the hold, and falls back to the keys", () => {
    // Arrived along 53: up + right goes up-right, down + right down-right.
    expect(pickHold(NODE_2, ["right", "up"], 53, { chord: "upRight" })).toMatchObject({
      edge: 15,
    });
    expect(pickHold(NODE_2, ["right", "down"], 53, { chord: "downRight" })).toMatchObject({
      edge: 54,
    });
    // Up + left would go back the way it came: excluded, so the keys steer.
    expect(pickHold(NODE_2, ["left", "up"], 53, { chord: "upLeft" })).toMatchObject({
      edge: 18,
    });
    // A tie cycle on the chord stops the hold.
    const four = [dep(0, 0), dep(1, -90), dep(2, 180), dep(3, 90)];
    expect(pickHold(four, ["up", "right"], -1, { chord: "upRight" })).toEqual({
      edge: -1,
      stop: "tie",
    });
  });
});

describe("K334 the move wait", () => {
  const still = { moving: false, absorbed: false, ambiguous: () => false };
  const travels = { moving: true, absorbed: false, ambiguous: () => false };

  it("a press while the dot travels waits for the arrival, the latest winning", () => {
    const w = new MoveWait();
    expect(w.press("up", 0, travels)).toBe("queue");
    expect(w.press("down", 300, travels)).toBe("queue");
    expect(w.step(320, true, () => false)).toBe("wait");
    // Taken on the arrival frame, never before (no snap).
    expect(w.step(400, false, () => false)).toMatchObject({ dirs: ["down"], edge: -1 });
    expect(w.waiting).toBeNull();
  });

  it("a tap while the dot travels waits too, in the same slot", () => {
    const w = new MoveWait();
    expect(w.tap(7, 0, false)).toBe(false); // At rest: the tap moves at once.
    expect(w.tap(7, 10, true)).toBe(true);
    expect(w.waiting).toMatchObject({ edge: 7, queued: true });
    // A later key press wins, and a later tap wins over it.
    w.press("left", 20, travels);
    expect(w.waiting).toMatchObject({ dirs: ["left"], edge: -1 });
    w.tap(9, 30, true);
    expect(w.step(40, true, () => true)).toBe("wait");
    // A tap's run goes on the arrival frame, chord window or not.
    expect(w.step(50, false, () => true)).toMatchObject({ edge: 9 });
  });

  it("a key beside a queued key, inside the window, makes a chord on arrival", () => {
    const w = new MoveWait();
    w.press("up", 0, travels);
    expect(w.press("right", 40, travels)).toBe("chord");
    expect(w.waiting).toMatchObject({ dirs: ["up", "right"], queued: true });
    expect(w.step(60, true, () => true)).toBe("wait");
    expect(w.step(90, false, () => true)).toMatchObject({ dirs: ["up", "right"] });
    // Too late, or not beside it: the newer key replaces it.
    w.press("up", 0, travels);
    w.press("right", CHORD_WINDOW_MS + 1, travels);
    expect(w.waiting).toMatchObject({ dirs: ["right"] });
    w.press("left", CHORD_WINDOW_MS + 10, travels);
    expect(w.waiting).toMatchObject({ dirs: ["left"] });
  });

  it("on the arrival, a lone key unclear there waits out the rest of its window", () => {
    const w = new MoveWait();
    w.press("up", 0, travels);
    expect(w.step(30, false, () => true)).toBe("wait");
    expect(w.waiting).toMatchObject({ queued: false });
    expect(w.step(79, false, () => true)).toBe("wait");
    expect(w.step(CHORD_WINDOW_MS, false, () => true)).toMatchObject({ dirs: ["up"] });
    // Clear there: taken on the arrival frame.
    w.press("up", 0, travels);
    expect(w.step(30, false, () => false)).toMatchObject({ dirs: ["up"] });
  });

  it("an unclear press at rest waits the window for a key beside it", () => {
    const w = new MoveWait();
    const unclear = { ...still, ambiguous: () => true };
    expect(w.press("up", 0, unclear)).toBe("window");
    expect(w.step(40, false, () => true)).toBe("wait");
    expect(w.press("left", 50, unclear)).toBe("chord");
    expect(w.takeNow()).toMatchObject({ dirs: ["up", "left"] });
    // Alone, it goes when the window ends...
    w.press("up", 0, unclear);
    expect(w.step(CHORD_WINDOW_MS, false, () => true)).toMatchObject({ dirs: ["up"] });
    // ...or as soon as its key comes up...
    w.press("up", 0, unclear);
    expect(w.release(() => true)).toBeNull();
    expect(w.release(() => false)).toMatchObject({ dirs: ["up"] });
    // ...or before any key that does not join it.
    w.press("up", 0, unclear);
    expect(w.before("left", 20)).toBeNull(); // It joins.
    expect(w.before("down", 20)).toMatchObject({ dirs: ["up"] });
    expect(w.waiting).toBeNull();
  });

  it("a clear press at rest moves at once; an absorbed key does nothing", () => {
    const w = new MoveWait();
    expect(w.press("up", 0, still)).toBe("now");
    expect(w.press("right", 20, { ...still, absorbed: true })).toBe("absorb");
    expect(w.waiting).toBeNull();
  });
});

describe("K334 a held key chains its moves", () => {
  const FRAME = 1000 / 60;
  // main.ts's frame order: the move animation steps, then the keys (the
  // waiting move first, then the hold). Runs after the first take 12
  // frames (200 ms). `held`: the frames the key is down.
  const run = (firstFrames: number, held: number, pressAt = -1) => {
    const w = new MoveWait();
    let left = firstFrames; // Frames left in the move in flight.
    const rest: number[] = [];
    let moves = 1;
    const start = (): void => {
      left = 12;
      moves++;
    };
    for (let f = 1; f <= 90; f++) {
      const now = f * FRAME;
      if (f === pressAt) {
        w.press("up", now, { moving: left > 0, absorbed: false, ambiguous: () => false });
      }
      if (left > 0) left--;
      const moving = left > 0;
      const due = w.step(now, moving, () => false);
      if (due !== null && due !== "wait") start();
      else if (due === null && f <= held && holdDue({ moving, now, since: 0 })) start();
      if (left === 0) rest.push(f);
    }
    return { rest, moves };
  };

  it("takes the next run on the arrival frame: no frame at rest", () => {
    const r = run(12, 60);
    expect(r.rest.filter((f) => f <= 60)).toEqual([]);
    expect(r.moves).toBe(6);
  });

  it("a first run shorter than HOLD_DELAY_MS waits for it (a quick press stays one move)", () => {
    const r = run(6, 60);
    // Frames 6-11 at rest, then the chain runs on with none.
    expect(r.rest.filter((f) => f <= 60)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(holdDue({ moving: false, now: 199, since: 0 })).toBe(false);
    expect(holdDue({ moving: false, now: 200, since: 0 })).toBe(true);
    expect(holdDue({ moving: true, now: 900, since: 0 })).toBe(false);
  });

  it("a press while the dot travels starts on the arrival frame", () => {
    const r = run(12, 0, 4);
    // The first move ends on frame 12 and the press's move starts there,
    // running to frame 24, where the dot comes to rest.
    expect(r.rest.filter((f) => f <= 30)).toEqual([24, 25, 26, 27, 28, 29, 30]);
    expect(r.moves).toBe(2);
  });
});
