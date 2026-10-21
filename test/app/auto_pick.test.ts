import { describe, expect, it } from "vitest";
import { assignPitches } from "../../src/audio/pitch_space";
import {
  findValidCtrl,
  nearestValidCtrl,
  pickMusicSegment,
  pickRandomSegment,
} from "../../src/app/auto_pick";

// K244 (docs/design/K244_cores.md): the auto plucks choose only a site that
// would draw (a junction core draws nothing, so it must not sound either).
// The pickers are pure: the tests hand them the "would it draw?" answer and a
// seeded random source.

// A small seeded generator (mulberry32), so a failure replays.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("random mode picks only a valid segment (K244)", () => {
  it("never picks an invalid segment over many picks, and reaches every valid one", () => {
    const n = 284; // K180's fabric: 21 of its taps fell in cores.
    const bad = new Set<number>();
    for (let i = 0; i < n; i += 13) bad.add(i); // about 8% invalid.
    const valid = (s: number) => !bad.has(s);
    const rand = seeded(1);
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i++) {
      const s = pickRandomSegment(n, valid, rand);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(bad.has(s)).toBe(false);
      seen.add(s);
    }
    expect(seen.size).toBe(n - bad.size);
  });

  it("is uniform among the valid ones", () => {
    const n = 10;
    const valid = (s: number) => s % 2 === 1; // 1, 3, 5, 7, 9.
    const rand = seeded(7);
    const hits = new Array<number>(n).fill(0);
    const picks = 50000;
    for (let i = 0; i < picks; i++) hits[pickRandomSegment(n, valid, rand)]++;
    for (let s = 0; s < n; s++) {
      if (valid(s)) expect(Math.abs(hits[s] / picks - 0.2)).toBeLessThan(0.01);
      else expect(hits[s]).toBe(0);
    }
  });

  it("finds a lone valid segment among hundreds (the full scan behind the draws)", () => {
    const n = 500;
    for (const lone of [0, 1, 249, 498, 499]) {
      const rand = seeded(100 + lone);
      for (let i = 0; i < 50; i++) {
        expect(pickRandomSegment(n, (s) => s === lone, rand)).toBe(lone);
      }
    }
  });

  it("returns -1 when no segment is valid, or there are none", () => {
    expect(pickRandomSegment(40, () => false, seeded(3))).toBe(-1);
    expect(pickRandomSegment(0, () => true, seeded(3))).toBe(-1);
    expect(pickRandomSegment(Number.NaN, () => true, seeded(3))).toBe(-1);
  });

  it("asks about few segments when most are valid, and each at most twice", () => {
    const n = 284;
    const asked = new Map<number, number>();
    const rand = seeded(5);
    for (let i = 0; i < 200; i++) {
      asked.clear();
      pickRandomSegment(
        n,
        (s) => {
          asked.set(s, (asked.get(s) ?? 0) + 1);
          return true;
        },
        rand
      );
      expect(asked.size).toBe(1); // the first draw is valid: no sweep.
    }
  });
});

describe("music mode picks a valid segment near the note's pitch (K244)", () => {
  // 48 segments over a chromatic scale: a dozen-odd pitch classes of ~2-4.
  const lengths = Array.from({ length: 48 }, (_, i) => 50 - i);
  const assign = assignPitches("chromatic", 2, 5, lengths);
  const rows = assign.byFreq;

  it("never picks an invalid segment, and stays in the note's own pitch while it can", () => {
    const f = rows[10].freq;
    const bad = new Set(rows[10].segs.slice(0, 1)); // a class with one core.
    const valid = (s: number) => !bad.has(s);
    const rand = seeded(11);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const s = pickMusicSegment(assign, f, valid, rand);
      expect(bad.has(s)).toBe(false);
      expect(rows[10].segs).toContain(s);
      seen.add(s);
    }
    expect(seen.size).toBe(rows[10].segs.length - bad.size);
  });

  it("falls back to the nearest pitch that has a valid segment", () => {
    const f = rows[10].freq;
    const dead = new Set(rows[10].segs); // every segment of the note's pitch is a core.
    const valid = (s: number) => !dead.has(s);
    const rand = seeded(12);
    for (let i = 0; i < 200; i++) {
      // A hair sharp lands on the next pitch up, a hair flat on the one below.
      expect(rows[11].segs).toContain(pickMusicSegment(assign, f * 1.01, valid, rand));
      expect(rows[9].segs).toContain(pickMusicSegment(assign, f * 0.99, valid, rand));
    }
    // Two classes dead: the next nearest.
    for (const s of rows[11].segs) dead.add(s);
    for (let i = 0; i < 200; i++) {
      const s = pickMusicSegment(assign, f * 1.01, valid, rand);
      expect(dead.has(s)).toBe(false);
      expect([...rows[9].segs, ...rows[12].segs]).toContain(s);
    }
  });

  it("returns -1 when no segment is valid anywhere, or the note is not a pitch", () => {
    expect(pickMusicSegment(assign, rows[3].freq, () => false, seeded(2))).toBe(-1);
    expect(pickMusicSegment(assign, Number.NaN, () => true, seeded(2))).toBe(-1);
    expect(pickMusicSegment({ segFreq: [], byFreq: [] }, 220, () => true, seeded(2))).toBe(-1);
  });
});

describe("a knot strand's ctrl (K244)", () => {
  it("is a plain random ctrl when most of the strand would draw", () => {
    const rand = seeded(21);
    for (let i = 0; i < 500; i++) {
      const c = findValidCtrl(120, () => true, rand);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(120);
    }
  });

  it("finds a narrow valid window by the sweep, and only ever returns a valid ctrl", () => {
    // One window of 0.6 ctrl on a strand of 200: a dozen random draws will
    // usually miss it (0.3% of the strand); the sweep cannot.
    const ok = (c: number) => c >= 133.2 && c < 133.8;
    for (let seed = 0; seed < 300; seed++) {
      const c = findValidCtrl(200, ok, seeded(seed));
      expect(c).toBeGreaterThanOrEqual(0);
      expect(ok(c)).toBe(true);
    }
  });

  it("wraps its sweep past the strand's end, and finds a window at the seam", () => {
    const ok = (c: number) => c < 0.4 || c >= 99.7; // the seam of a strand of 100.
    for (let seed = 0; seed < 100; seed++) {
      const c = findValidCtrl(100, ok, seeded(1000 + seed));
      expect(ok(c)).toBe(true);
    }
  });

  it("returns -1 when no ctrl on the strand would draw, or it has no length", () => {
    expect(findValidCtrl(100, () => false, seeded(4))).toBe(-1);
    expect(findValidCtrl(0, () => true, seeded(4))).toBe(-1);
    expect(findValidCtrl(-3, () => true, seeded(4))).toBe(-1);
  });
});

describe("a fabric run's ctrl (K244)", () => {
  it("keeps the run's midpoint when it would draw", () => {
    expect(nearestValidCtrl(10, 14, 12, () => true)).toBe(12);
  });

  it("clamps a midpoint that lies outside the run (a wrapped run's)", () => {
    // The midpoint of a run [98, 103] on a chain of 100 may sit past c1.
    expect(nearestValidCtrl(98, 103, 108, () => true)).toBe(103);
    expect(nearestValidCtrl(98, 103, 90, () => true)).toBe(98);
  });

  it("looks outward from the midpoint for the nearest place that draws", () => {
    // Core around the middle (11.2 to 12.8), valid toward both ends.
    const ok = (c: number) => c < 11.2 || c > 12.8;
    const c = nearestValidCtrl(10, 14, 12, ok);
    expect(c).not.toBeNull();
    expect(ok(c as number)).toBe(true);
    // Nearest: no valid ctrl on the 0.5 grid is closer to the midpoint.
    expect(Math.abs((c as number) - 12)).toBeLessThanOrEqual(1);
    // Valid on one side only: it goes there.
    expect(nearestValidCtrl(10, 14, 12, (x) => x >= 13)).toBe(13);
    expect(nearestValidCtrl(10, 14, 12, (x) => x <= 10.5)).toBe(10.5);
  });

  it("stays inside the run and returns null when all of it is a core", () => {
    const asked: number[] = [];
    expect(
      nearestValidCtrl(10, 14, 12, (x) => {
        asked.push(x);
        return false;
      })
    ).toBeNull();
    for (const x of asked) {
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThanOrEqual(14);
    }
    // A run with its ends the other way round is the same run.
    expect(nearestValidCtrl(14, 10, 12, (x) => x === 10)).toBe(10);
    // A zero-length run is one question.
    expect(nearestValidCtrl(5, 5, 5, () => false)).toBeNull();
    expect(nearestValidCtrl(5, 5, 5, () => true)).toBe(5);
  });
});
