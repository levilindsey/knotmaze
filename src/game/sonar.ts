// K137 sonar (4.26, docs/design/K80_gameplay_additions.md): in fog, a
// pluck makes the nearby runs of its own note ring and show briefly
// through the fog. Pure: which runs ring, and the ping budget. The
// fog holes and the sound are the renderer's and main's.

import type { RuleWalk } from "./rule_search";
import { runsNear } from "./hidden_runs";

// How far the ring carries, in runs (sharing a vertex is 1 apart).
export const SONAR_RUNS = 4;
// How long a ping's holes stay open, in seconds.
export const SONAR_SECONDS = 2.5;

// The runs that ring for a pluck on `plucked`: its own note (noteOf,
// the audio map's frequency; null rings nothing), within `maxRuns`
// runs, nearest first. The plucked run itself is left out (it rings
// by the pluck itself; the caller re-adds it for the hole).
export function sonarRuns(
  walk: RuleWalk,
  plucked: number,
  noteOf: (run: number) => number | null,
  maxRuns = SONAR_RUNS
): number[] {
  if (plucked < 0 || !walk.edges[plucked]) return [];
  const note = noteOf(plucked);
  if (note === null) return [];
  const near = runsNear(walk, plucked, maxRuns);
  const found: { run: number; d: number }[] = [];
  for (const [run, d] of near) {
    if (run === plucked) continue;
    if (noteOf(run) === note) found.push({ run, d });
  }
  found.sort((a, b) => a.d - b.d || a.run - b.run);
  return found.map((f) => f.run);
}

// Pings left of a per-solve limit (limit <= 0: unlimited).
export function pingsLeft(limit: number, used: number): number {
  if (!(limit > 0)) return Infinity;
  return Math.max(0, limit - used);
}
