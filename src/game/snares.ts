// K137 stage 4 (4.30, stage 3d's remainder): SNARES on the turn clock, by
// runs. `snares` (0 off, 1..SNARES_MAX) is the stock for an attempt, refilled
// by a level restart (main.ts keeps the count). The snare button (or its
// key) arms the next tap, which lays a snare on a run touching the head's
// junction, the run behind you included (snareRuns). Free in time: no turn
// passes. A gold ring marks the run's middle (filled while it holds;
// fabric_maze_renderer.ts syncSnares, a stand-in for a glyph).
//
// THE HOLD (TurnMinotaur): the first monster whose turn would step onto a
// snared run stops at the run's near end (its path is cut there, snareCut)
// and is held: it stands for its next SNARE_HOLD turns, then the snare is
// spent and it plays on. The telegraph previews the cut, and shows an empty
// move while it is held. Any monster springs it, the minotaur or an extra; a
// sleeper or follower held stands the same way. A held monster still catches
// you if you walk onto it. A catch (or a banish) sends the holder home, and
// its snare is spent. Real time and the by-length mode take no snares yet
// (TurnMinotaur.setSnare refuses by length; the panel hides the row in real
// time): residuals in the stage 4 Handoff.
//
// Pure: the snare records and the cut; TurnMinotaur holds them.

export const SNARES_MAX = 3;
// The turns a snared monster stands: the `snareHold` param (K795), an
// integer in SNARE_HOLD_MIN..SNARE_HOLD_MAX; SNARE_HOLD is its default.
export const SNARE_HOLD = 3;
export const SNARE_HOLD_MIN = 1;
export const SNARE_HOLD_MAX = 8;

export type SnarePhase = "set" | "holding" | "spent";

export interface Snare {
  readonly edge: number;
  phase: SnarePhase;
  holder: number | null; // -1 the minotaur, i extra i; null while set.
  left: number; // Turns it still holds.
}

// The param's stock: an integer in 0..SNARES_MAX (garbage: 0).
export function snaresOf(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(SNARES_MAX, Math.round(n)));
}

// The runs a snare may go on with the head at vertex `head`: every run with
// an end there, in id order.
export function snareRuns(ea: ArrayLike<number>, eb: ArrayLike<number>, head: number): number[] {
  const out: number[] = [];
  for (let e = 0; e < ea.length; e++) if (ea[e] === head || eb[e] === head) out.push(e);
  return out;
}

// May a snare go on run `edge` now? It touches the head's junction and holds
// no snare yet (a spent one included: one snare a run).
export function canSnare(
  snares: readonly Snare[],
  ea: ArrayLike<number>,
  eb: ArrayLike<number>,
  head: number,
  edge: number
): boolean {
  if (!Number.isInteger(edge) || edge < 0 || edge >= ea.length) return false;
  if (ea[edge] !== head && eb[edge] !== head) return false;
  return !snares.some((s) => s.edge === edge);
}

// The first step of `path` onto a set snare's run: that step's index and the
// snare's, or null.
export function snareCut(
  snares: readonly Snare[],
  path: readonly (readonly [number, number])[]
): { step: number; snare: number } | null {
  if (snares.length === 0) return null;
  for (let i = 0; i < path.length; i++) {
    const k = snares.findIndex((s) => s.phase === "set" && s.edge === path[i][0]);
    if (k >= 0) return { step: i, snare: k };
  }
  return null;
}

// The param's hold: an integer in SNARE_HOLD_MIN..SNARE_HOLD_MAX (garbage:
// SNARE_HOLD).
export function snareHoldOf(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return SNARE_HOLD;
  return Math.max(SNARE_HOLD_MIN, Math.min(SNARE_HOLD_MAX, Math.round(n)));
}

// Spring snare `s` on monster `who`, to hold it `hold` turns.
export function springSnare(s: Snare, who: number, hold = SNARE_HOLD): void {
  s.phase = "holding";
  s.holder = who;
  s.left = hold;
}

// Is monster `who` held now (without spending a turn)?
export function heldIndex(snares: readonly Snare[], who: number): number {
  for (let k = 0; k < snares.length; k++) {
    const s = snares[k];
    if (s.phase === "holding" && s.holder === who && s.left > 0) return k;
  }
  return -1;
}

// One turn of monster `who`: true when a snare holds it (it stands), and the
// hold counts down; at 0 the snare is spent.
export function holdTurn(snares: readonly Snare[], who: number): boolean {
  const k = heldIndex(snares, who);
  if (k < 0) return false;
  const s = snares[k];
  s.left--;
  if (s.left <= 0) s.phase = "spent";
  return true;
}

// The holder went home (a catch, a banish): its snare is spent. `who`
// undefined releases every holder.
export function releaseSnares(snares: readonly Snare[], who?: number): void {
  for (const s of snares) {
    if (s.phase === "holding" && (who === undefined || s.holder === who)) {
      s.phase = "spent";
      s.left = 0;
    }
  }
}
