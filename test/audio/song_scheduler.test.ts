import { describe, expect, it } from "vitest";
import {
  SONG_MAX_LAG,
  SONG_START_DELAY,
  SongScheduler,
  type ScheduledNote,
} from "../../src/audio/song_scheduler";
import { SCARBOROUGH_FAIR, type Song } from "../../src/audio/songs";

const SONG: Song = {
  name: "test",
  bpm: 60, // One beat = one second.
  notes: [
    { note: "D4", beats: 1 },
    { note: "E4", beats: 0.5 },
    { note: null, beats: 0.5 },
    { note: "F4", beats: 2 },
  ],
};

// Runs the scheduler from t = 10 on frames of the given lengths and returns
// every note it hands out.
function play(
  frames: number[],
  lookahead: number,
  song: Song = SONG
): ScheduledNote[] {
  const s = new SongScheduler();
  let t = 10;
  const out = [...s.due(song, t, "audio", lookahead, 1)];
  for (const dt of frames) {
    t += dt;
    out.push(...s.due(song, t, "audio", lookahead, 1));
  }
  return out;
}

const repeat = (dt: number, total: number): number[] =>
  Array.from({ length: Math.round(total / dt) }, () => dt);

const expectTimes = (notes: ScheduledNote[], times: number[]): void => {
  expect(notes.length).toBe(times.length);
  notes.forEach((n, i) => expect(n.at).toBeCloseTo(times[i], 9));
};

describe("K101 song scheduler", () => {
  it("starts after the start delay and keeps the song's rhythm", () => {
    const s = new SongScheduler();
    expect(s.due(SONG, 10, "audio", 0.3, 1)).toEqual([]);
    const t0 = 10 + SONG_START_DELAY;
    const first = s.due(SONG, t0 - 0.2, "audio", 0.3, 1);
    expectTimes(first, [t0]);
    expect(first[0].row.note).toBe("D4");
    // The next three, the rest included, on the grid.
    const later = s.due(SONG, t0 + 0.75, "audio", 1.3, 1);
    expect(later.map((n) => n.row.note)).toEqual(["E4", null, "F4"]);
    expectTimes(later, [t0 + 1, t0 + 1.5, t0 + 2]);
  });

  it("gives the same note times at 60 fps and 7 fps", () => {
    const fast = play(repeat(1 / 60, 30), 0.3, SCARBOROUGH_FAIR);
    const slow = play(repeat(0.15, 30), 0.3, SCARBOROUGH_FAIR);
    expect(fast.length).toBeGreaterThan(40);
    const n = Math.min(fast.length, slow.length);
    expect(n).toBeGreaterThan(40);
    for (let i = 0; i < n; i++) {
      expect(slow[i].at).toBe(fast[i].at);
      expect(slow[i].row).toBe(fast[i].row);
    }
  });

  it("hands every note out before it starts while frames are shorter than the lookahead", () => {
    const s = new SongScheduler();
    let t = 0;
    let count = 0;
    for (const dt of repeat(0.15, 20)) {
      t += dt;
      for (const n of s.due(SCARBOROUGH_FAIR, t, "audio", 0.3, 1)) {
        expect(n.at).toBeGreaterThanOrEqual(t);
        count++;
      }
    }
    expect(count).toBeGreaterThan(30);
  });

  it("without lookahead, never stretches the tempo by the frames' lateness", () => {
    // 0.13 s frames: each note is handed out up to a frame late, but the grid
    // continues from its slot, not from the late frame.
    const out = play(repeat(0.13, 10), 0, SONG);
    const t0 = 10 + SONG_START_DELAY;
    const grid = [0, 1, 1.5, 2, 4, 5, 5.5, 6, 8].map((x) => t0 + x);
    expect(out.length).toBe(grid.length);
    for (let i = 0; i < grid.length; i++) {
      expect(out[i].at).toBeGreaterThanOrEqual(grid[i] - 1e-9);
      expect(out[i].at - grid[i]).toBeLessThan(0.13 + 1e-9);
    }
  });

  it("scales the tempo by the rate", () => {
    const s = new SongScheduler();
    s.due(SONG, 0, "audio", 0, 2);
    const t0 = SONG_START_DELAY;
    expectTimes(s.due(SONG, t0, "audio", 1.01, 2), [
      t0,
      t0 + 0.5,
      t0 + 0.75,
      t0 + 1,
    ]);
  });

  it("picks up from now after a stall instead of rushing the missed notes", () => {
    const s = new SongScheduler();
    s.due(SONG, 0, "audio", 0.3, 1);
    s.due(SONG, SONG_START_DELAY, "audio", 0.3, 1); // D4 at 1.2
    // A hidden tab: 30 s without a frame.
    const back = s.due(SONG, 31.2, "audio", 0.3, 1);
    expect(back.map((n) => n.row.note)).toEqual(["E4"]);
    expect(back[0].at).toBe(31.2);
    // A lag under SONG_MAX_LAG plays the note now and keeps the grid.
    const s2 = new SongScheduler();
    s2.due(SONG, 0, "audio", 0, 1);
    s2.due(SONG, SONG_START_DELAY, "audio", 0, 1); // D4 at 1.2, E4 due 2.2
    const now = 2.2 + SONG_MAX_LAG * 0.8;
    const late = s2.due(SONG, now, "audio", 0, 1);
    expect(late.map((n) => n.at)).toEqual([now]);
    // The rest after E4 is still due at 2.7, on the grid.
    expectTimes(s2.due(SONG, 2.6, "audio", 0.3, 1), [2.7]);
  });

  it("keeps the song's place across a change of clock", () => {
    const s = new SongScheduler();
    s.due(SONG, 100, "wall", 0, 1);
    const d4 = s.due(SONG, 100 + SONG_START_DELAY, "wall", 0, 1);
    expect(d4.map((n) => n.row.note)).toEqual(["D4"]);
    // The autoplay gate opens; the audio clock reads 0.5.
    const after = s.due(SONG, 0.5, "audio", 0.3, 1);
    expect(after.map((n) => n.row.note)).toEqual(["E4"]);
    expect(after[0].at).toBe(0.5);
  });

  it("restarts from the top after reset", () => {
    const s = new SongScheduler();
    s.due(SONG, 0, "audio", 0, 1);
    s.due(SONG, 5, "audio", 0, 1);
    s.reset();
    expect(s.due(SONG, 50, "audio", 0, 1)).toEqual([]);
    const top = s.due(SONG, 50 + SONG_START_DELAY, "audio", 0, 1);
    expect(top.map((n) => n.row.note)).toEqual(["D4"]);
  });

  it("cannot spin on zero-length notes or an empty song", () => {
    const zero: Song = { name: "z", bpm: 60, notes: [{ note: "A4", beats: 0 }] };
    const s = new SongScheduler();
    s.due(zero, 0, "audio", 0, 1);
    expect(s.due(zero, SONG_START_DELAY, "audio", 0.3, 1).length).toBe(64);
    const empty: Song = { name: "e", bpm: 60, notes: [] };
    expect(new SongScheduler().due(empty, 0, "audio", 1, 1)).toEqual([]);
  });
});
