// K137 stage 4 (4.10, stage 3d's remainder): LURE PLUCKS on the turn clock.
// `lures` (0 off, 1..LURES_MAX) is the stock for an attempt, refilled by a
// level restart (main.ts keeps the count). The lure button (or its key)
// arms the next tap, which plucks that run with its sound and overlay and
// uses one lure, nothing heard or not. A lure is FREE IN TIME: no turn
// passes (s3b call 5's rec; the alternative, a lure costs a move).
//
// HEARING (TurnMinotaur.lure): a monster hears a lure within LURE_RANGE runs
// of walk distance (the hop matrix, so a broken run's cut stops the sound).
// Its TARGET is the plucked run's end nearer to it by runs (ties to the lower
// vertex index; never the start or the exit, which no monster steps onto).
// - The minotaur (not fleeing the sword, not slain) makes the target its next
//   destination: decide() and decideLengthHop() step toward it before the
//   model's rules, and on arrival it reverts to its model. Its hunt and roam
//   are forgotten (mode 0), so a hunter it lured away has to see you again.
// - A sleeper hears it too: asleep it wakes (woken++), and comes.
// - A follower ignores it (s3b's rec).
// The committed move is re-decided at once, so the telegraph shows the lured
// route. A lure nobody hears still uses a lure; main.ts toasts "Nothing heard
// the lure.".
//
// Pure: no state, no draws. The graph is TurnGraph's shape (typed here so
// that minotaur_turns.ts can import this module).

export const LURES_MAX = 5;
export const LURE_RANGE = 6;

export interface LureGraph {
  hopd(a: number, b: number): number;
  readonly start: number;
  readonly exit: number;
  readonly chase: { readonly ea: ArrayLike<number>; readonly eb: ArrayLike<number> };
}

// The param's stock: an integer in 0..LURES_MAX (garbage: 0).
export function luresOf(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(LURES_MAX, Math.round(n)));
}

// Where a monster standing at `v` goes for a lure on run `edge`: the run's
// end nearer by runs (ties to the lower vertex index), skipping the start and
// the exit; -1 when neither end is within LURE_RANGE (or reachable).
export function lureTarget(g: LureGraph, v: number, edge: number, range = LURE_RANGE): number {
  const ea = g.chase.ea;
  if (!Number.isInteger(edge) || edge < 0 || edge >= ea.length) return -1;
  const ends = [ea[edge], g.chase.eb[edge]].sort((a, b) => a - b);
  let best = -1;
  let bestD = Infinity;
  for (const w of ends) {
    if (w === g.start || w === g.exit) continue;
    const d = g.hopd(v, w);
    if (d < 0 || d > range) continue;
    if (d < bestD) {
      best = w;
      bestD = d;
    }
  }
  return best;
}
