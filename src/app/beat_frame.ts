// K114's beat rider, THE FRAME SIDE (brief docs/design/K114_beat.md, items
// 3-5). main.ts builds one with createBeat and calls it from a few sites:
// the frame loop's GAME block (tick, which drives the head marker instead
// of the renderer's own move animation while the dot rides), the tap and
// move paths (queue), restartSolve (reset) and the pause control (setHeld).
// The pure pieces are game/beat_clock.ts (the clock and its audio-locked
// feed) and game/beat_rider.ts (what the dot does at each junction).
//
// Each departure commits through `commit` (main.ts: moveAlong, the normal
// move path), so the controller, the turn minotaur and the fire step
// exactly as on the turn clock, once per committed move. After a commit
// that ends the game (a win, a burn) the next junction's commits are
// refused and the rider comes to rest. A catch lands at its contact moment
// (main.ts: tickTurnMino, or moveAlong before the next departure when the
// arrival and that departure share one advance, K774), and its respawn
// rests the rider at the entrance, ending the advance; a head that moved
// under it (a restart) puts it at rest there too.
import { BeatClock, BeatFeed, beatPhase } from "../game/beat_clock";
import { CHASE_HZ } from "../game/minotaur";
import { BeatRider } from "../game/beat_rider";
import type { WalkerMap } from "../game/walker";
import type { BeatSettings } from "../ui/url_state";

export interface BeatDeps {
  // The beat's settings while clock=beat and a fabric game plays, else null.
  settings: () => BeatSettings | null;
  // The walk graph's identity: a new one rebuilds the rider.
  walkKey: () => unknown;
  buildMap: () => WalkerMap | null;
  // The controller's head (during a ride: the junction ahead).
  head: () => string | null;
  // Commit a departure as a normal move; true when it was a move.
  commit: (run: number) => boolean;
  // Drive the head marker along the run just committed (0..1).
  progress: (frac: number) => void;
  animating: () => boolean;
  // The audio clock and its output latency while sound plays, else null.
  audio: () => { time: number; latency: number } | null;
  // Pluck a run's note at audio-context time `when`.
  note: (run: number, when: number) => void;
}

export interface BeatFrame {
  readonly clock: BeatClock;
  rider(): BeatRider | null;
  needsFrame(): boolean;
  queue(run: number): boolean;
  tick(dt: number): boolean;
  reset(): void;
  setHeld(held: boolean): void;
  // How far into its beat the clock is (0 on the beat), or -1 when off.
  phase(): number;
}

export function createBeat(deps: BeatDeps): BeatFrame {
  const clock = new BeatClock();
  const feed = new BeatFeed();
  let rider: BeatRider | null = null;
  let key: unknown = null;
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => clock.setHidden(document.hidden));
  }

  // The rider for today's walk and settings, built or rebuilt (a rebuild
  // restarts the clock); null while the beat is off.
  const ensure = (): BeatRider | null => {
    const s = deps.settings();
    if (!s) {
      rider = null;
      return null;
    }
    const k = deps.walkKey();
    if (
      rider === null ||
      k !== key ||
      rider.tempo !== s.tempo ||
      rider.unit !== s.unit ||
      rider.cap !== s.cap
    ) {
      const map = deps.buildMap();
      const head = deps.head();
      if (!map || head === null) return null;
      rider = new BeatRider(map, s.tempo, s.unit, s.cap, head);
      key = k;
      clock.reset();
    }
    return rider;
  };

  const tick = (_dt: number): boolean => {
    const r = ensure();
    if (!r) return false;
    const head = deps.head();
    if (head !== null && head !== r.ahead) r.restAt(head);
    const a = deps.audio();
    const read = feed.read(a ? a.time : null, a ? a.latency : 0, performance.now());
    clock.sync(read.now, read.source);
    const deps0 = r.advance(clock.ticks, (run) => deps.commit(run));
    if (a && deps0.length > 0) {
      // The beat each departure left on, on the audio context's clock: the
      // clock runs on what the ear hears now (audio minus the latency).
      for (const d of deps0) {
        const when = read.now + a.latency + (d.tick / CHASE_HZ - clock.seconds);
        deps.note(d.run, Math.max(a.time, when));
      }
    }
    if (r.riding) {
      deps.progress(r.progress(clock.ticks));
      return true;
    }
    if (deps.animating()) deps.progress(1);
    return false;
  };

  // Probe hook: the rider and the clock (probes.md, K114 beat).
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__knotBeat = () => ({
      on: rider !== null,
      ticks: clock.ticks,
      running: clock.running,
      held: clock.isHeld,
      d: rider ? rider.d : -1,
      run: rider && rider.d >= 0 ? rider.d >> 1 : -1,
      ahead: rider ? rider.ahead : null,
      queued: rider ? rider.queued : -1,
      startBeat: rider ? rider.startBeat : -1,
      t0: rider ? rider.t0 : 0,
      t1: rider ? rider.t1 : 0,
      tempo: rider ? rider.tempo : 0,
      phase: rider ? beatPhase(clock.ticks, rider.tempo) : -1,
      // The runs the rider would try at the junction ahead, in order.
      order: rider ? rider.order(rider.ahead, rider.d).map((x) => x >> 1) : [],
    });
  }

  return {
    clock,
    rider: () => rider,
    needsFrame: () =>
      rider !== null && clock.running && (rider.riding || rider.startBeat >= 0),
    queue: (run) => {
      // Paused, nothing queues (keys and the pad; the hidden canvas takes no taps).
      if (clock.isHeld) return false;
      const r = ensure();
      return r ? r.queue(run, clock.ticks) : false;
    },
    tick,
    reset: () => {
      clock.reset();
      const head = deps.head();
      if (rider && head !== null) rider.restAt(head);
    },
    setHeld: (held) => clock.setHeld(held),
    phase: () => (rider ? beatPhase(clock.ticks, rider.tempo) : -1),
  };
}
