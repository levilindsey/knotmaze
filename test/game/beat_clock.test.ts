// K114's beat clock (src/game/beat_clock.ts): the beat math, the fixed-step
// loop, the feed's sources, pausing while hidden or held.
import { describe, expect, it } from "vitest";
import {
  BEAT_BACKSTEP_S,
  BeatClock,
  BeatFeed,
  FEED_RELOCK_S,
  TICKS_PER_MINUTE,
  beatAt,
  beatPhase,
  beatTick,
} from "../../src/game/beat_clock";
import { CHASE_HZ, MAX_STEPS_PER_ADVANCE } from "../../src/game/minotaur";

describe("beat math", () => {
  it("puts beats on whole ticks of the 120 Hz clock", () => {
    expect(TICKS_PER_MINUTE).toBe(CHASE_HZ * 60);
    expect(beatTick(1, 100)).toBe(72);
    expect(beatTick(1, 120)).toBe(60);
    // 132 bpm: 54.5 ticks a beat, so the beats alternate 55 and 54 apart.
    expect([1, 2, 3, 4].map((k) => beatTick(k, 132))).toEqual([55, 110, 164, 219]);
  });

  it("round-trips every beat of every tempo", () => {
    for (let tempo = 40; tempo <= 180; tempo++) {
      for (let k = 0; k <= 1000; k++) {
        const t = beatTick(k, tempo);
        expect(beatAt(t, tempo)).toBe(k);
        // The tick before a beat still belongs to the beat before it.
        if (k > 0) expect(beatAt(t - 1, tempo)).toBe(k - 1);
      }
    }
  });

  it("reads the phase into a beat", () => {
    expect(beatPhase(0, 100)).toBe(0);
    expect(beatPhase(36, 100)).toBe(0.5);
    expect(beatPhase(72, 100)).toBe(0);
    expect(beatPhase(71, 100)).toBeCloseTo(71 / 72, 12);
  });
});

describe("BeatFeed", () => {
  it("reads the wall clock while no context runs", () => {
    const f = new BeatFeed();
    expect(f.read(null, 0.05, 1500)).toEqual({ now: 1.5, source: "wall" });
  });

  it("locks the wall clock to the audio clock's render quanta", () => {
    const q = 128 / 48000;
    const trueOff = 3.21; // audio time - wall time
    const lat = 0.04;
    const f = new BeatFeed();
    const nows: number[] = [];
    for (let i = 0; i < 240; i++) {
      const wall = 5 + i / 60;
      const audio = Math.floor((wall + trueOff) / q) * q; // currentTime's steps
      const r = f.read(audio, lat, wall * 1000);
      expect(r.source).toBe("audio");
      // Never ahead of what the ear hears, and never a quantum behind it.
      expect(r.now).toBeLessThanOrEqual(wall + trueOff - lat + 1e-9);
      expect(r.now).toBeGreaterThan(wall + trueOff - lat - q - 1e-3);
      nows.push(r.now);
    }
    // Smooth: after the lock settles, every frame is 1/60 s to within 0.3 ms,
    // where the raw clock's frames are 6 or 7 quanta (16.0 or 18.7 ms).
    let worst = 0;
    for (let i = 60; i < nows.length; i++) {
      worst = Math.max(worst, Math.abs(nows[i] - nows[i - 1] - 1 / 60));
    }
    expect(worst).toBeLessThan(3e-4);
  });

  it("relocks when the audio clock jumps (a new context)", () => {
    const f = new BeatFeed();
    f.read(10, 0, 1000);
    f.read(10 + 1 / 60, 0, 1000 + 1000 / 60);
    const r = f.read(0.02, 0, 1000 + 2000 / 60);
    expect(Math.abs(r.now - 0.02)).toBeLessThan(1e-9);
    expect(FEED_RELOCK_S).toBeLessThan(BEAT_BACKSTEP_S);
  });
});

describe("BeatClock", () => {
  it("steps two ticks a 60 Hz frame, exactly", () => {
    const c = new BeatClock();
    for (let i = 0; i < 60; i++) c.advance(1 / 60);
    expect(c.ticks).toBe(120);
    expect(c.seconds).toBe(1);
  });

  it("anchors on the first reading, then steps by the source's time", () => {
    const c = new BeatClock();
    expect(c.sync(5, "wall")).toBe(0);
    expect(c.ticks).toBe(0);
    expect(c.sync(5.5, "wall")).toBe(MAX_STEPS_PER_ADVANCE); // a 0.5 s frame: capped
    expect(c.ticks).toBe(MAX_STEPS_PER_ADVANCE);
    c.sync(5.5 + 1 / 60, "wall");
    expect(c.ticks).toBe(MAX_STEPS_PER_ADVANCE + 2);
  });

  it("drops a stall's backlog (R.4.2)", () => {
    const c = new BeatClock();
    expect(c.advance(10)).toBe(MAX_STEPS_PER_ADVANCE);
    expect(c.advance(1 / 240)).toBe(0); // nothing owed from the stall
    expect(c.ticks).toBe(MAX_STEPS_PER_ADVANCE);
  });

  it("keeps the beat's place across a change of source", () => {
    const c = new BeatClock();
    c.sync(100, "wall");
    for (let i = 1; i <= 30; i++) c.sync(100 + i / 60, "wall");
    expect(c.ticks).toBe(60);
    // The context starts: its clock reads 0.2 s. No jump either way.
    expect(c.sync(0.2, "audio")).toBe(0);
    expect(c.ticks).toBe(60);
    c.sync(0.2 + 1 / 60, "audio");
    expect(c.ticks).toBe(62);
    // And back to the wall clock (sound turned off).
    expect(c.sync(200, "wall")).toBe(0);
    expect(c.ticks).toBe(62);
  });

  it("waits out a small step back and re-anchors on a large one", () => {
    const c = new BeatClock();
    c.sync(10, "audio");
    c.sync(10 + 1 / 60, "audio");
    expect(c.ticks).toBe(2);
    // The latency estimate rose by 10 ms: wait until the source catches up.
    expect(c.sync(10 + 1 / 60 - 0.01, "audio")).toBe(0);
    expect(c.sync(10 + 1 / 60 + 1 / 120, "audio")).toBe(1);
    expect(c.ticks).toBe(3);
    // A context made anew restarts its clock near 0: anchor, do not wait.
    expect(c.sync(0.05, "audio")).toBe(0);
    expect(c.sync(0.05 + 1 / 60, "audio")).toBe(2);
    expect(c.ticks).toBe(5);
    expect(BEAT_BACKSTEP_S).toBeGreaterThan(0.05);
  });

  it("does not tick while hidden, and does not jump after", () => {
    const c = new BeatClock();
    c.sync(0, "wall");
    c.sync(1 / 60, "wall");
    c.setHidden(true);
    expect(c.running).toBe(false);
    expect(c.sync(0.5, "wall")).toBe(0);
    expect(c.advance(1)).toBe(0);
    c.setHidden(false);
    // The first reading after the page returns anchors; 30 s away step nothing.
    expect(c.sync(30, "wall")).toBe(0);
    expect(c.ticks).toBe(2);
    c.sync(30 + 1 / 60, "wall");
    expect(c.ticks).toBe(4);
  });

  it("holds under the pause control, and a reset releases it", () => {
    const c = new BeatClock();
    c.sync(0, "wall");
    c.sync(0.1, "wall");
    const before = c.ticks;
    c.setHeld(true);
    expect(c.isHeld).toBe(true);
    c.sync(0.2, "wall");
    c.sync(3, "wall");
    expect(c.ticks).toBe(before);
    c.setHeld(false);
    c.sync(3.1, "wall"); // anchors
    expect(c.ticks).toBe(before);
    c.setHeld(true);
    c.reset();
    expect(c.isHeld).toBe(false);
    expect(c.ticks).toBe(0);
    expect(c.sync(4, "wall")).toBe(0); // a reset re-anchors too
    c.sync(4 + 1 / 60, "wall");
    expect(c.ticks).toBe(2);
  });

  it("ignores readings that are not numbers", () => {
    const c = new BeatClock();
    c.sync(1, "wall");
    expect(c.sync(Number.NaN, "wall")).toBe(0);
    c.sync(1 + 1 / 60, "wall");
    expect(c.ticks).toBe(2);
  });
});
