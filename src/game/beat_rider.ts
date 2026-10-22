// K114's beat rider: THE RIDER (pure; brief docs/design/K114_beat.md, item
// 3). Under clock=beat the dot never stops: each run takes a whole number
// of beats and the dot reaches each junction on a beat. The timing (K795,
// Levi 2026-10-21) says how many: even (the default) gives every run the
// same beats (one by default), so the dot's speed varies with the run's
// length and the junctions come on a steady pulse; length gives
// beatsForRun(length), K114's multi-beat runs.
// A tap (or a key, or the move pad) on an arm of the junction ahead QUEUES
// that arm; the last one before the junction wins, and the queue clears on
// arrival. With nothing queued (or the queued arm refused) the dot goes
// straight on: the strand's continuation, then keep right, then back
// (walker.ts leadEntries, the walker's Lead order), so an END turns it
// back. Before the first move the dot waits at the start, and the first
// tap starts it on the next beat (call 5).
//
// The rider decides; the game commits. `advance` hands each departure to a
// `commit` callback (main.ts: moveAlong, the normal move path, so the
// controller, the minotaur's turn and the fire's step run exactly as on
// the turn clock, once per committed move), which may refuse it (a broken
// or burning run): the rider then tries the next in order, and when every
// one is refused it comes to rest there until the next tap. A commit that
// rests the rider itself (restAt: main.ts lands a pending catch before the
// next move, K774, and the respawn rests it at the entrance) ends the
// advance where it rested.
//
// Ticks are BeatClock's (beat_clock.ts): integers, so a run's arrival tick
// is exact and the same on every device.
import { beatAt, beatTick } from "./beat_clock";
import { arrivalOf, departureOf, departures, leadEntries } from "./walker";
import type { WalkerMap } from "./walker";

// Beats a run takes under the length timing: max(1, round(length / unit)),
// at most `cap` (a whole number, at least 1). A non-positive length or unit
// takes one beat.
export function beatsForRun(length: number, unit: number, cap: number): number {
  const c = Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : 1;
  if (!(length > 0) || !(unit > 0)) return 1;
  return Math.min(c, Math.max(1, Math.round(length / unit)));
}

// K795: how a run's beats are counted (Levi, 2026-10-21: "each segment is
// traveled in the same amount of time", then a toggle between the
// multi-beat runs and one beat per run). even: every run takes the
// beatPerRun param's beats (one by default), so the dot rides a long run
// fast and a short one slow and lands on a junction every that many beats;
// length: K114's beatsForRun (beatLength, beatCap), so the dot keeps one
// pace and a long run takes more beats.
export type BeatTiming = "even" | "length";
export const BEAT_TIMINGS: BeatTiming[] = ["even", "length"];
// Beats every run takes under even (the beatPerRun param's range and default).
export const BEAT_PER_RUN = 1;
export const BEAT_PER_RUN_MIN = 1;
export const BEAT_PER_RUN_MAX = 4;

// Beats a run of `length` takes: under even `perRun` (a whole number, at
// least 1), under length beatsForRun(length, unit, cap).
export function runBeats(
  length: number,
  timing: BeatTiming,
  perRun: number,
  unit: number,
  cap: number
): number {
  if (timing === "length") return beatsForRun(length, unit, cap);
  return Number.isFinite(perRun) ? Math.max(1, Math.floor(perRun)) : 1;
}

// One departure the rider made: the run (and its direction, 2 run + end),
// the beat and tick it left on and the beats it takes.
export interface BeatDeparture {
  run: number;
  d: number;
  beat: number;
  tick: number;
  beats: number;
}

export class BeatRider {
  // The directed run the dot rides, or -1 at rest (at `at`).
  d = -1;
  // Where the dot rests while d is -1.
  at: string;
  // The ride on d left at tick t0 and reaches its junction at t1.
  t0 = 0;
  t1 = 0;
  // A departure queued at the junction ahead, or -1.
  queued = -1;
  // The beat the first run leaves on, once a tap asked for it (-1: none).
  startBeat = -1;
  // K774: bumped by restAt, so a commit that rests the rider (a catch's
  // respawn or a restart, landed from inside it) ends the advance there.
  private rests = 0;

  readonly map: WalkerMap;
  // Beats a minute, lattice units a beat covers, the most beats a run takes
  // (unit and cap count under the length timing), the timing and the beats
  // every run takes under even (K795).
  tempo: number;
  unit: number;
  cap: number;
  timing: BeatTiming;
  perRun: number;

  // The timing defaults to length, K114's rule, which reads the unit and cap
  // given here; the game passes its own (beatSettingsOf: even since K795).
  constructor(
    map: WalkerMap,
    tempo: number,
    unit: number,
    cap: number,
    at: string,
    timing: BeatTiming = "length",
    perRun = BEAT_PER_RUN
  ) {
    this.map = map;
    this.tempo = tempo;
    this.unit = unit;
    this.cap = cap;
    this.at = at;
    this.timing = timing;
    this.perRun = perRun;
  }

  get riding(): boolean {
    return this.d >= 0;
  }

  // The junction the dot is heading for, or the one it rests at.
  get ahead(): string {
    return this.d >= 0 ? arrivalOf(this.map, this.d) : this.at;
  }

  // Rest at v (a new ride, a restart, a catch's respawn, a stop): the next
  // tap starts the dot again on the next beat.
  restAt(v: string): void {
    this.d = -1;
    this.at = v;
    this.queued = -1;
    this.startBeat = -1;
    this.rests++;
  }

  // A tap on `run` at `tick`: queued when it is an arm of the junction
  // ahead (the run the dot is on counts: it turns back there), ignored
  // otherwise (false). At rest, it also starts the ride on the next beat.
  queue(run: number, tick: number): boolean {
    const v = this.ahead;
    const dep = departures(this.map, v).find((x) => x >> 1 === run);
    if (dep === undefined) return false;
    this.queued = dep;
    if (this.d < 0 && this.startBeat < 0) this.startBeat = beatAt(tick, this.tempo) + 1;
    return true;
  }

  // How far along its run the dot is at `tick` (0 at rest).
  progress(tick: number): number {
    if (this.d < 0 || this.t1 <= this.t0) return 0;
    const f = (tick - this.t0) / (this.t1 - this.t0);
    return f < 0 ? 0 : f > 1 ? 1 : f;
  }

  // Step the ride to `tick`: every junction reached by then (and the start,
  // once its beat comes) departs, through `commit`. Returns the departures.
  advance(tick: number, commit: (run: number, d: number) => boolean): BeatDeparture[] {
    const out: BeatDeparture[] = [];
    // A run takes at least one beat, so a frame (at most 30 ticks) crosses
    // few junctions; the bound only guards a broken map.
    for (let guard = 0; guard < 64; guard++) {
      let beat: number;
      let v: string;
      let arrived: number;
      if (this.d < 0) {
        if (this.startBeat < 0 || tick < beatTick(this.startBeat, this.tempo)) break;
        beat = this.startBeat;
        v = this.at;
        arrived = -1;
      } else {
        if (tick < this.t1) break;
        beat = beatAt(this.t1, this.tempo);
        v = arrivalOf(this.map, this.d);
        arrived = this.d;
      }
      let next = -1;
      const rests = this.rests;
      for (const x of this.order(v, arrived)) {
        const took = commit(x >> 1, x);
        // K774: the commit rested the rider (main.ts lands a pending catch
        // there: the respawn rests it at the entrance). That rest stands:
        // the other arms of v belong to the game before it.
        if (this.rests !== rests) return out;
        if (took) {
          next = x;
          break;
        }
      }
      this.queued = -1;
      if (next < 0) {
        this.restAt(v);
        break;
      }
      const length = this.map.walk.edges[next >> 1].length;
      const beats = runBeats(length, this.timing, this.perRun, this.unit, this.cap);
      this.d = next;
      this.startBeat = -1;
      this.t0 = beatTick(beat, this.tempo);
      this.t1 = beatTick(beat + beats, this.tempo);
      out.push({ run: next >> 1, d: next, beat, tick: this.t0, beats });
      // A commit that ended the game leaves the rider to the caller, which
      // stops it after this call (a beat is at least 40 ticks at 180 bpm, so
      // one frame's 30 ticks reach at most one more junction).
    }
    return out;
  }

  // The order the rider tries departures from v: the queued arm, then the
  // Lead order of the run it arrived by (continuation, keep right, back),
  // or at the start the start's run ends by index.
  order(v: string, arrived: number): number[] {
    const list: number[] = [];
    const q = this.queued;
    if (q >= 0 && departureOf(this.map, q) === v) list.push(q);
    const rest =
      arrived >= 0
        ? Array.from(leadEntries(this.map, arrived))
        : departures(this.map, v).sort((a, b) => a - b);
    for (const x of rest) if (x !== q) list.push(x);
    return list;
  }
}
