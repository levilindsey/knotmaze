// K137 stage 5, MUDDY RUNS (design docs/design/K80_gameplay_additions.md
// 4.33; decided in docs/design/K137_s3b.md Decided 6; brief
// docs/design/K137_s5.md). Thick runs that take two moves to cross, for
// the player and the minotaur alike: a slower but safer route, or the
// reverse. Placement picks runs on the fewest-moves route, so the
// fewest-moves route and the shortest (length) route differ; crossing
// one counts as two moves in the controller's strokes, in par's F
// (walk_graph's runsToExit with this cost) and in the monsters'
// routing, the turn minotaur also spends its next turn in the mud, the
// real-time chase crosses at half speed, and the dot crosses at half
// speed. Stars keep the length metric. Pure: the layout and the cost.

import type { WalkGraph } from "../core/walk_graph";
import { runsToExit } from "../core/walk_graph";
import { ruleRng } from "./rule_search";

export const MUD_MAX = 6;

// The param's count: an integer in 0..MUD_MAX (garbage: 0, off).
export function mudOf(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MUD_MAX, Math.floor(n)));
}

// A run's move cost under `mud` (1 elsewhere, 2 on a muddy run).
export function mudCost(mud: ReadonlySet<number>): (eid: number) => number {
  return (eid) => (mud.has(eid) ? 2 : 1);
}

// The fewest-moves route's runs, start to exit (empty: no route). The
// route walks the runsToExit field downhill, first fitting run first.
export function fewestRoute(walk: WalkGraph): number[] {
  const dist = runsToExit(walk);
  const route: number[] = [];
  let cur = walk.start;
  const guard = new Set<string>([cur]);
  while (cur !== walk.exit) {
    const d = dist.get(cur) ?? Infinity;
    if (!Number.isFinite(d) || d === 0) return [];
    let stepped = false;
    for (const eid of walk.vertices.get(cur)?.edges ?? []) {
      const e = walk.edges[eid];
      const other = e.va === cur ? e.vb : e.va;
      if ((dist.get(other) ?? Infinity) === d - 1) {
        route.push(eid);
        cur = other;
        stepped = true;
        break;
      }
    }
    if (!stepped || guard.has(cur)) return [];
    guard.add(cur);
  }
  return route;
}

// The muddy runs for this maze: up to `count` runs of the fewest-moves
// route, drawn in a seeded order from the "muddyRuns" stream, never a
// run touching the start or the exit (their tails stay clean) and never
// a self-loop. In route order. Count 0 lays none and draws nothing.
export function placeMud(
  walk: WalkGraph,
  count: number,
  seed: number
): number[] {
  const n = mudOf(count);
  if (n === 0) return [];
  const route = fewestRoute(walk);
  const cands = route.filter((eid) => {
    const e = walk.edges[eid];
    return (
      e.va !== e.vb &&
      e.va !== walk.start &&
      e.vb !== walk.start &&
      e.va !== walk.exit &&
      e.vb !== walk.exit
    );
  });
  if (cands.length === 0) return [];
  const rng = ruleRng(seed, "muddyRuns");
  const shuffled = [...cands];
  for (let j = shuffled.length - 1; j > 0; j--) {
    const k = rng.nextInt(j + 1);
    const t = shuffled[j];
    shuffled[j] = shuffled[k];
    shuffled[k] = t;
  }
  const chosen = new Set(shuffled.slice(0, n));
  return route.filter((eid) => chosen.has(eid));
}
