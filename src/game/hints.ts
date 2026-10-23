// K137 stage 2 (4.28): HINTS AND THE COMPASS. Both point along the next
// good arm: the first run of the shortest walk-graph route from the head to
// the exit, over the live runs (broken and cut runs removed). They ignore
// the minotaur and the fire: with a chase on they still point to the exit.
// Pure.

import type { WalkGraph } from "../core/walk_graph";
import { walkDistances } from "../core/walk_graph";

export const HINTS_MAX = 5;
// K838: a lit hint has no timer - it stays lit until the player's next
// move puts it out (a Restart or Undo clears it too), and no second
// hint can be spent until that move (FabricMazeController.useHint).

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
// K845: a hint draws HINT_DISTANCE of lattice arc along the route,
// not one whole run: a long run is lit only that far, and a short
// run's remainder spills into the next run (and the next), so the
// segment after a short segment is indicated too.
export const HINT_DISTANCE = 6;

// One drawn piece of a hint: run `eid`'s ctrl span [c0, c1] (chain
// order, c1 >= c0), j0/j1 saying whether that end is a junction
// (true) or a by-distance stop mid-run (false), as PaintTele reads it.
export interface HintSpan {
  eid: number;
  c0: number;
  c1: number;
  j0: boolean;
  j1: boolean;
}

// The hint's drawn pieces: walk `route` (walk runs in travel order
// from `head`, e.g. FabricMazeController.shortestRoute) for
// `distance` of lattice arc. Tunnels (chain < 0) draw nothing but
// still consume their length and pass the walk to their far end.
export function hintSpans(
  walk: WalkGraph,
  head: string,
  route: readonly number[],
  distance: number = HINT_DISTANCE
): HintSpan[] {
  const spans: HintSpan[] = [];
  let v = head;
  let left = distance;
  for (const eid of route) {
    if (!(left > 0)) break;
    const e = walk.edges[eid];
    if (!e) break;
    const fromA = e.va === v;
    const far = fromA ? e.vb : e.va;
    if (far === v) break; // A self-loop goes nowhere (routes carry none).
    const take = Math.min(Math.max(e.length, 0), left);
    if (e.chain >= 0 && take > 0) {
      const frac = e.length > 0 ? take / e.length : 1;
      const span = e.ctrlB - e.ctrlA;
      const full = frac >= 1;
      if (fromA) {
        spans.push({ eid, c0: e.ctrlA, c1: e.ctrlA + span * frac, j0: true, j1: full });
      } else {
        spans.push({ eid, c0: e.ctrlB - span * frac, c1: e.ctrlB, j0: full, j1: true });
      }
    }
    left -= take;
    v = far;
  }
  return spans;
}

export function hintsTag(used: number): string | null {
  return used > 0 ? `💡${used}` : null;
}
