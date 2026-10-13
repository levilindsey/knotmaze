// K101: music mode's note scheduler. A song runs on a grid of note start
// times, in seconds of one clock: the audio clock once the context runs, wall
// time before the autoplay gate opens (nothing sounds then; the plucks still
// animate). Each tick hands out every note that starts before now +
// lookahead, with its exact start time, so the synth can start it on the
// right sample instead of at the next frame. The next note goes one slot
// after the last one's start, not after the frame that played it, so a late
// frame never stretches the tempo.

import type { Song, SongNote } from "./songs";

export interface ScheduledNote {
  row: SongNote;
  at: number; // Start time, in the clock's seconds.
}

// Silence before a song's first note (the pre-K101 delay).
export const SONG_START_DELAY = 1.2;
// A grid further behind than this (a hidden tab, a long stall, a mute) picks
// up from now instead of rushing the missed notes out together.
export const SONG_MAX_LAG = 0.25;
// The most notes one tick hands out (a guard against a zero-length song).
const MAX_PER_TICK = 64;

export class SongScheduler {
  private nextAt: number | null = null;
  private index = 0;
  private clock: string | null = null;

  // Back to the song's start, after the start delay.
  reset(): void {
    this.nextAt = null;
    this.index = 0;
    this.clock = null;
  }

  // The notes (rests included) that start before now + lookahead. `clock`
  // names the time base: a change of clock (wall to audio at the autoplay
  // gate) keeps the song's place and plays its next note now. `rate` scales
  // the tempo (soundSpeed).
  due(
    song: Song,
    now: number,
    clock: string,
    lookahead: number,
    rate: number
  ): ScheduledNote[] {
    const out: ScheduledNote[] = [];
    if (song.notes.length === 0) return out;
    if (this.nextAt === null) {
      this.nextAt = now + SONG_START_DELAY;
    } else if (clock !== this.clock || this.nextAt < now - SONG_MAX_LAG) {
      this.nextAt = now;
    }
    this.clock = clock;
    const beat = 60 / (song.bpm * Math.max(0.1, rate));
    for (let k = 0; k < MAX_PER_TICK && this.nextAt <= now + lookahead; k++) {
      const row = song.notes[this.index % song.notes.length];
      this.index++;
      out.push({ row, at: Math.max(this.nextAt, now) });
      this.nextAt += Math.max(1e-3, row.beats * beat);
    }
    return out;
  }
}
