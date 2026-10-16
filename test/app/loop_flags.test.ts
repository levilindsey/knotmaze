import { describe, it, expect } from "vitest";
import {
  Flag,
  FLAG_NAMES,
  FLAG_COUNT,
  VISUAL,
  AMBIENT,
  SCENE_ACTIVE,
  ALL_FLAGS,
  RING,
  flagNames,
  createLoopFlags,
  type FrameObservation,
} from "../../src/app/loop_flags";

const QUIET: FrameObservation = { active: false, stepUnflagged: false };

describe("loop flags: the masks", () => {
  it("names every bit in order", () => {
    expect(FLAG_NAMES.length).toBe(FLAG_COUNT);
    FLAG_NAMES.forEach((n, i) => expect(Flag[n]).toBe(1 << i));
    expect(ALL_FLAGS).toBe((1 << FLAG_COUNT) - 1);
  });
  it("VISUAL is all but AUDIO and INPUT; AMBIENT is flow, ambient paint and the background", () => {
    expect(VISUAL & Flag.AUDIO).toBe(0);
    expect(VISUAL & Flag.INPUT).toBe(0);
    expect(flagNames(ALL_FLAGS & ~VISUAL)).toEqual(["AUDIO", "INPUT"]);
    expect(flagNames(AMBIENT)).toEqual(["FLOW", "PAINT_AMBIENT", "BACKGROUND"]);
    expect(SCENE_ACTIVE & Flag.BACKGROUND).toBe(0);
    expect(SCENE_ACTIVE | Flag.BACKGROUND).toBe(VISUAL);
  });
});

describe("loop flags: frames", () => {
  it("a frame's need is the carried polls OR the pushes", () => {
    const f = createLoopFlags();
    f.endFrame(Flag.FLOW, QUIET); // frame 1: nothing; FLOW polled for frame 2
    f.push(Flag.GEOM);
    expect(f.need).toBe(Flag.FLOW | Flag.GEOM);
    const need = f.endFrame(0, QUIET);
    expect(need).toBe(Flag.FLOW | Flag.GEOM);
    expect(f.lastNeed).toBe(Flag.FLOW | Flag.GEOM);
    expect(f.need).toBe(0);
  });
  it("polls read at the end of frame N belong to frame N+1, not N", () => {
    const f = createLoopFlags();
    expect(f.endFrame(Flag.PHYS, QUIET)).toBe(0);
    expect(f.endFrame(0, QUIET)).toBe(Flag.PHYS);
    expect(f.endFrame(0, QUIET)).toBe(0);
  });
  it("defer() lands in the next frame, after this one's polls", () => {
    const f = createLoopFlags();
    f.defer(Flag.GEOM);
    expect(f.need).toBe(0);
    expect(f.endFrame(0, QUIET)).toBe(0);
    expect(f.endFrame(0, QUIET)).toBe(Flag.GEOM);
    expect(f.endFrame(0, QUIET)).toBe(0);
  });
  it("counts frames per flag, sole frames and pushes", () => {
    const f = createLoopFlags();
    f.push(Flag.CAMERA);
    f.push(Flag.CAMERA | Flag.INPUT);
    f.endFrame(Flag.PHYS | Flag.AUDIO, QUIET); // CAMERA (+INPUT): CAMERA sole
    f.endFrame(0, QUIET); // PHYS + AUDIO: PHYS sole (AUDIO is not visual)
    const r = f.report();
    expect(r.frames).toBe(2);
    expect(r.flags.CAMERA).toEqual({ frames: 1, sole: 1, pushes: 2 });
    expect(r.flags.INPUT).toEqual({ frames: 1, sole: 0, pushes: 1 });
    expect(r.flags.PHYS).toEqual({ frames: 1, sole: 1, pushes: 0 });
    expect(r.flags.AUDIO).toEqual({ frames: 1, sole: 0, pushes: 0 });
  });
});

describe("loop flags: empty runs and restarts", () => {
  it("counts empty frames, runs and the longest run", () => {
    const f = createLoopFlags();
    f.endFrame(0, QUIET); // empty
    f.endFrame(0, QUIET); // empty
    f.push(Flag.INPUT);
    f.endFrame(0, QUIET); // empty (INPUT is not visual)
    f.push(Flag.GEOM);
    f.endFrame(0, QUIET); // restart by push
    f.endFrame(Flag.FLOW, QUIET); // empty
    f.endFrame(0, QUIET); // FLOW: restart by poll, ambient only
    const r = f.report();
    expect(r.empty).toBe(4);
    expect(r.emptyRuns).toEqual({ count: 2, longest: 3, current: 0 });
    expect(r.restarts.push).toBe(1);
    expect(r.restarts.byPush).toEqual({ GEOM: 1 });
    expect(r.restarts.poll).toBe(1);
    expect(r.restarts.byPoll).toEqual({ FLOW: 1 });
    expect(r.restarts.pollWithInput).toBe(0);
    expect(r.ambientOnly).toBe(1);
  });
  it("a restart by poll notes an INPUT push in its window", () => {
    const f = createLoopFlags();
    f.endFrame(Flag.CAMERA, QUIET); // empty, CAMERA polled
    f.push(Flag.INPUT);
    f.endFrame(0, QUIET); // CAMERA by poll, with input
    const r = f.report();
    expect(r.restarts.poll).toBe(1);
    expect(r.restarts.pollWithInput).toBe(1);
    expect(r.restarts.byPoll).toEqual({ CAMERA: 1 });
  });
  it("an unbroken run reports its current length", () => {
    const f = createLoopFlags();
    for (let i = 0; i < 5; i++) f.endFrame(0, QUIET);
    expect(f.report().emptyRuns).toEqual({ count: 1, longest: 5, current: 5 });
  });
});

describe("loop flags: the observer", () => {
  it("counts sceneActive frames and unflagged physics steps (K6-2 slimmed it)", () => {
    const f = createLoopFlags();
    f.endFrame(0, QUIET);
    f.endFrame(0, { ...QUIET, active: true });
    f.endFrame(0, { ...QUIET, active: true, stepUnflagged: true });
    expect(f.report().observer).toEqual({ active: 2, stepUnflagged: 1 });
  });
});

describe("loop flags: the ring and reset", () => {
  it("keeps the last RING frames' needs and pushes, oldest first", () => {
    const f = createLoopFlags();
    for (let i = 0; i < RING + 3; i++) {
      f.push(i % 2 ? Flag.GEOM : Flag.INPUT);
      f.endFrame(0, QUIET);
    }
    const r = f.report();
    expect(r.recent.length).toBe(RING);
    expect(r.recentPush.length).toBe(RING);
    // frame RING+2 (the last) is even-indexed: INPUT
    expect(r.recent[RING - 1]).toBe(Flag.INPUT);
    expect(r.recentPush[RING - 1]).toBe(Flag.INPUT);
    expect(r.recent[RING - 2]).toBe(Flag.GEOM);
  });
  it("reset() zeroes the counters and keeps the open frame", () => {
    const f = createLoopFlags();
    f.push(Flag.GEOM);
    f.endFrame(Flag.PHYS, QUIET);
    f.push(Flag.CAMERA);
    f.reset();
    const r = f.report();
    expect(r.frames).toBe(0);
    expect(r.flags.GEOM.pushes).toBe(0);
    expect(r.recent).toEqual([]);
    expect(f.need).toBe(Flag.PHYS | Flag.CAMERA);
    expect(f.endFrame(0, QUIET)).toBe(Flag.PHYS | Flag.CAMERA);
  });
});
