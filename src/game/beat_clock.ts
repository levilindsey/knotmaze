// K114's beat rider: THE BEAT CLOCK (pure; brief docs/design/K114_beat.md,
// design docs/design/K80_gameplay_additions.md R.5.1 and R.4.2). Beats are
// integers on a fixed-step game clock: ticks at CHASE_HZ (the chase's and
// the fire's rate), beat k starting at tick ceil(k * TICKS_PER_MINUTE /
// tempo). Only exact operations (* / ceil floor on integers), so a tempo
// lands every beat on the same tick in every engine (K108).
//
// The clock is FED, never free-running: each frame hands it a reading of
// its time source, the audio clock minus the output latency while a context
// runs (what the ear hears now, R.4.4) or performance.now() otherwise. A
// change of source keeps the beat's place (as SongScheduler does): the new
// source is re-anchored and the ticks carry on. It does not tick while the
// page is hidden or while the player holds the pause control, and a stall
// drops its backlog past MAX_STEPS_PER_ADVANCE (R.4.2), so nothing jumps
// after a freeze. The renderer animates toward the clock's state, never the
// reverse.
import { CHASE_HZ, MAX_STEPS_PER_ADVANCE } from "./minotaur";

export type BeatSource = "audio" | "wall";

// Game ticks per minute: a tempo's beats are 7200 / tempo ticks apart.
export const TICKS_PER_MINUTE = CHASE_HZ * 60;

// A reading this far behind the last one is a new clock (a context made
// anew), not jitter: the clock re-anchors instead of waiting for it.
export const BEAT_BACKSTEP_S = 0.25;

const DT = 1 / CHASE_HZ;

// The tick beat k starts on (k >= 0, integer tempo in bpm).
export function beatTick(k: number, tempo: number): number {
  return Math.ceil((k * TICKS_PER_MINUTE) / tempo);
}

// The beat a tick falls in: the last beat that started at or before it.
export function beatAt(tick: number, tempo: number): number {
  return Math.floor((tick * tempo) / TICKS_PER_MINUTE);
}

// How far into its beat a tick is, 0 at the beat's own tick, toward 1.
export function beatPhase(tick: number, tempo: number): number {
  const k = beatAt(tick, tempo);
  const a = beatTick(k, tempo);
  const b = beatTick(k + 1, tempo);
  return b > a ? (tick - a) / (b - a) : 0;
}

// Float noise in a frame's seconds (5.5 + 1/60 - 5.5 is a hair under 1/60):
// a tick owed within this much is stepped, so a 60 Hz frame steps 2.
const TICK_EPS = 1e-9;

// The audio feed relocks when its clock jumps this far from the lock (a
// context made anew), and lets the lock sink this fast (s per s) so a slow
// drift between the two hardware clocks is followed.
export const FEED_RELOCK_S = 0.05;
export const FEED_DRIFT = 0.001;

// A frame's reading of the beat's time source: the audio clock minus the
// output latency while a context runs (`audio` not null), else
// performance.now() (`wallMs`). AudioContext.currentTime advances a render
// quantum at a time (128 frames, 2.7 ms at 48 kHz), so it is not read raw:
// the feed locks performance.now() to it (the offset's upper envelope,
// since currentTime trails the true time by up to a quantum), which keeps
// the wall clock's smoothness and the audio clock's place.
export class BeatFeed {
  private off = NaN;
  private lastWall = NaN;

  read(
    audio: number | null,
    latency: number,
    wallMs: number
  ): { now: number; source: BeatSource } {
    const wall = wallMs / 1000;
    const dt = Number.isFinite(this.lastWall) ? Math.max(0, wall - this.lastWall) : 0;
    this.lastWall = wall;
    if (audio === null || !Number.isFinite(audio)) {
      this.off = NaN;
      return { now: wall, source: "wall" };
    }
    const o = audio - wall;
    if (!Number.isFinite(this.off) || Math.abs(o - this.off) > FEED_RELOCK_S) {
      this.off = o;
    } else {
      this.off = Math.max(o, this.off - FEED_DRIFT * dt);
    }
    return { now: wall + this.off - latency, source: "audio" };
  }
}

export class BeatClock {
  // Whole ticks stepped since the last reset: the game's time.
  ticks = 0;
  private acc = 0;
  private last = NaN;
  private source: BeatSource | null = null;
  private hidden = false;
  private held = false;

  // Ticking: the page visible and the pause control not held.
  get running(): boolean {
    return !this.hidden && !this.held;
  }

  get isHeld(): boolean {
    return this.held;
  }

  // The game's time in seconds (whole ticks: the renderer never runs ahead).
  get seconds(): number {
    return this.ticks / CHASE_HZ;
  }

  // A frame's reading of the time source; the ticks stepped. The first
  // reading, a new source, the first after a pause and one far behind the
  // last anchor the clock without stepping it. A reading a little behind
  // (the latency estimate rose) waits for the source to catch up.
  sync(now: number, source: BeatSource): number {
    if (!Number.isFinite(now)) return 0;
    if (source !== this.source || !Number.isFinite(this.last)) {
      this.source = source;
      this.last = now;
      return 0;
    }
    const dt = now - this.last;
    if (dt < -BEAT_BACKSTEP_S) {
      this.last = now;
      return 0;
    }
    if (dt <= 0) return 0;
    this.last = now;
    return this.advance(dt);
  }

  // Step `seconds` of game time (R.4.2's loop): whole ticks, at most
  // MAX_STEPS_PER_ADVANCE, the rest of a stall's backlog dropped.
  advance(seconds: number): number {
    if (!(seconds > 0) || !this.running) return 0;
    this.acc += seconds;
    let n = 0;
    while (this.acc >= DT - TICK_EPS && n < MAX_STEPS_PER_ADVANCE) {
      this.acc -= DT;
      this.ticks++;
      n++;
    }
    if (this.acc >= DT - TICK_EPS) this.acc = 0;
    return n;
  }

  // The page hidden or shown: no ticks while hidden, and the first reading
  // after it re-anchors, so the time away is not stepped.
  setHidden(hidden: boolean): void {
    if (hidden !== this.hidden) this.last = NaN;
    this.hidden = hidden;
  }

  // The pause control: held, the beat stops (and the board hides, main.ts).
  setHeld(held: boolean): void {
    if (held !== this.held) this.last = NaN;
    this.held = held;
  }

  // A new ride (Restart, a rebuild): tick 0, the pause released. The source
  // stays anchored.
  reset(): void {
    this.ticks = 0;
    this.acc = 0;
    this.held = false;
    this.last = NaN;
  }
}
