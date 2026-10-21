// K114's beat rider: THE RIDER (pure; brief docs/design/K114_beat.md, item
// 3). Under clock=beat the dot never stops: each run takes
// beatsForRun(length) beats and the dot reaches each junction on a beat.
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
// one is refused it comes to rest there until the next tap.
//
// Ticks are BeatClock's (beat_clock.ts): integers, so a run's arrival tick
// is exact and the same on every device.
import { beatAt, beatTick } from "./beat_clock";
import { arrivalOf, departureOf, departures, leadEntries } from "./walker";
import type { WalkerMap } from "./walker";

// Beats a run takes: max(1, round(length / unit)), at most `cap` (a whole
// number, at least 1). A non-positive length or unit takes one beat.
export function beatsForRun(length: number, unit: number, cap: number): number {
  const c = Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : 1;
  if (!(length > 0) || !(unit > 0)) return 1;
  return Math.min(c, Math.max(1, Math.round(length / unit)));
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

  constructor(
    readonly map: WalkerMap,
    public tempo: number,
    public unit: number,
    public cap: number,
    at: string
  ) {
    this.at = at;
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
      for (const x of this.order(v, arrived)) {
        if (commit(x >> 1, x)) {
          next = x;
          break;
        }
      }
      this.queued = -1;
      if (next < 0) {
        this.restAt(v);
        break;
      }
      const beats = beatsForRun(this.map.walk.edges[next >> 1].length, this.unit, this.cap);
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
