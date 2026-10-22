// K137 stage 2 (4.28): HINTS AND THE COMPASS. Both point along the next
// good arm: the first run of the shortest walk-graph route from the head to
// the exit, over the live runs (broken and cut runs removed). They ignore
// the minotaur and the fire: with a chase on they still point to the exit.
// Pure.

import type { WalkGraph } from "../core/walk_graph";
import { walkDistances } from "../core/walk_graph";

export const HINTS_MAX = 5;
// How long a hint lights its arm (seconds of wall time; a move ends it): the
// `hintSeconds` param (K795), in HINT_SECONDS_MIN..HINT_SECONDS_MAX;
// HINT_SECONDS is its default.
export const HINT_SECONDS = 2;
export const HINT_SECONDS_MIN = 0.5;
export const HINT_SECONDS_MAX = 10;

// The param's seconds, in HINT_SECONDS_MIN..HINT_SECONDS_MAX (garbage:
// HINT_SECONDS).
export function hintSecondsOf(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return HINT_SECONDS;
  return Math.max(HINT_SECONDS_MIN, Math.min(HINT_SECONDS_MAX, n));
}

// Hints a solve, an integer in [0, HINTS_MAX]; garbage reads 0.
export function hintsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(HINTS_MAX, Math.max(0, Math.round(n)));
}

// Walk distances to the exit over the runs `live` accepts (all of them
// when it is omitted, which is the walk's own distToExit).
export function liveDistances(
  walk: WalkGraph,
  live?: (eid: number) => boolean
): Map<string, number> {
  if (!live) return walk.distToExit;
  const removed = new Set<number>();
  for (const e of walk.edges) if (!live(e.id)) removed.add(e.id);
  if (removed.size === 0) return walk.distToExit;
  return walkDistances(walk.vertices, walk.edges, walk.exit, removed);
}

// The next good arm from `head`: the live incident run minimizing its length
// plus its far end's distance to the exit (lowest id on a tie), or -1 at
// the exit or with no route. A self-loop never helps (its far end is head).
export function nextGoodArm(
  walk: WalkGraph,
  dist: ReadonlyMap<string, number>,
  head: string,
  live?: (eid: number) => boolean
): number {
  if (head === walk.exit) return -1;
  const v = walk.vertices.get(head);
  if (!v) return -1;
  let best = -1;
  let bestCost = Infinity;
  for (const eid of v.edges) {
    const e = walk.edges[eid];
    if (!e || (live && !live(eid))) continue;
    const far = e.va === head ? e.vb : e.va;
    if (far === head) continue;
    const d = dist.get(far);
    if (d === undefined || !Number.isFinite(d)) continue;
    const cost = e.length + d;
    if (cost < bestCost - 1e-9 || (Math.abs(cost - bestCost) <= 1e-9 && eid < best)) {
      best = eid;
      bestCost = cost;
    }
  }
  return best;
}

// The share text's tag: "💡1" (hints used), null when none was used.
export function hintsTag(used: number): string | null {
  return used > 0 ? `💡${used}` : null;
}
