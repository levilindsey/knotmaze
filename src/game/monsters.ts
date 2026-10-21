// K137 stage 3d (design 4.9 and Levi's follower; brief docs/design/K137_s3d.md,
// design docs/design/K137_s3b.md "Decided" 1-3): MORE THAN ONE MONSTER. The
// minotaur stays the chase's first monster; these are the extras that step
// with it on either clock (TurnMinotaur.extras, MinotaurChase.extras).
//
// WHERE THEY SLEEP (sleeperSpots): junctions SLEEPER_RING_MIN..MAX (1-3) runs
// off one shortest start-exit route (sword.ts's BFS), never the start, the
// exit or either tail's junction, never within one run of the entrance's
// junction, and clear of the lair as the sword is (`avoid`). Distinct
// vertices, drawn without replacement from the sleepers' own counter stream
// (TurnRng on the seed xor "SLPR"), so no other draw shifts. Fewer
// candidates than asked: fewer sleepers.
//
// WHAT KIND (monsterKinds): sleepKind wake (every one a 4.9 sleeper), follow
// (every one a follower) or both (alternating, the first drawn on the same
// stream). Each monster draws from its own stream (monsterRng: the seed xor
// "MNST" xor a per-index hash).
//
// THE RULES (both clocks hold the mechanics):
// - A SLEEPER wakes when you move along a run that touches its junction (in
//   practice: you step onto it). It catches nobody while it sleeps or on the
//   move that wakes it; awake, it is a hunter with the minotaur's pace and
//   catch rules (turn clock: decide() with a prox config at the minotaur's
//   speed, sight and accuracy; real time: the hunter's pursuit at
//   approachPace within the hunter's sight, a random walk at wanderPace
//   otherwise). Turn clock: standing on your junction when its turn comes,
//   it holds (you walked onto it: leave, or be caught); real time: it gets
//   up SLEEPER_GRACE_S after it wakes.
// - A FOLLOWER does not wake when you pass. Leaving its junction starts it:
//   it appears there FOLLOW_DELAY 1 or 2 of your moves later (drawn per
//   follower) and walks your trail behind you, a run a turn (real time: at
//   approachPace). Walking back into it is a catch. At each junction there
//   is a FOLLOW_SHORTCUT chance (its stream) that it steps along its
//   shortest route to you instead, and it rejoins your trail where it
//   lands on it.
// - A CATCH by any monster is the minotaur's catch (s3b call 1, rec): you go
//   back to the entrance, the minotaur to its lair (or where it stands, lair
//   off), and every extra back to its junction, asleep.
// - No telegraph for the extras (s3b call 2, rec).

import type { ChaseGraph } from "./minotaur";
import { TurnRng, mix32 } from "./minotaur_turns";
import { optimalRouteVertices, runHops, tailJunction, type SwordAvoid } from "./sword";

export const SLEEPERS_MAX = 3;
export type SleepKind = "wake" | "follow" | "both";
export const SLEEP_KINDS: readonly SleepKind[] = ["wake", "follow", "both"];
export type MonsterKind = "sleeper" | "follower";
// asleep: on its junction (a follower: hidden in plain sight, the sleeper's
// glyph); waiting: a follower counting down after you left it, or (real
// time) a sleeper getting up; awake: hunting or following.
export type MonsterPhase = "asleep" | "waiting" | "awake";

export const SLEEPER_RING_MIN = 1;
export const SLEEPER_RING_MAX = 3;
// The sleepers' spot stream ("SLPR") and the monsters' own streams ("MNST").
export const SLEEPER_SALT = 0x534c5052;
export const MONSTER_SALT = 0x4d4e5354;
// Real time: seconds a woken sleeper takes to get up (no move, no catch).
export const SLEEPER_GRACE_S = 1;
// The follower: its delay (moves after you leave its junction) is 1 or 2,
// and at each junction this chance it steps toward you instead (call 3).
export const FOLLOW_DELAY_MIN = 1;
export const FOLLOW_DELAY_MAX = 2;
export const FOLLOW_SHORTCUT = 0.25;

export interface MonsterSpec {
  readonly kind: MonsterKind;
  readonly home: number; // Vertex index (ChaseGraph = TurnGraph order).
}

export function sleepersOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(SLEEPERS_MAX, Math.max(0, Math.round(n)));
}

// Monster i's own counter stream.
export function monsterRng(seed: number, i: number): TurnRng {
  const s = Math.floor(Math.abs(seed)) % 4294967296;
  return new TurnRng((s ^ MONSTER_SALT ^ mix32(i + 1)) >>> 0);
}

// The follower's delay, 1 or 2 (draw 0 of its stream's turn -1 counter, so
// it never meets a turn's draw).
export function followDelay(seed: number, i: number): number {
  const u = monsterRng(seed, i).at(-1).next();
  return u < 0.5 ? FOLLOW_DELAY_MIN : FOLLOW_DELAY_MAX;
}

// Where the sleepers lie, in draw order (index i = monster i). `skip`:
// vertices taken already (the sword's spot).
export function sleeperSpots(
  g: ChaseGraph,
  seed: number,
  count: number,
  avoid: SwordAvoid = {},
  skip: readonly number[] = []
): number[] {
  const n = sleepersOf(count);
  if (n === 0) return [];
  const route = optimalRouteVertices(g);
  if (route.length === 0) return [];
  const hop = runHops(g, route);
  const startJ = tailJunction(g, g.start);
  const exitJ = tailJunction(g, g.exit);
  const nearStart = startJ >= 0 ? runHops(g, [startJ]) : null;
  const near = exitJ >= 0 && avoid.hops != null ? runHops(g, [exitJ]) : null;
  const dEx = exitJ >= 0 && avoid.dist != null ? g.from(exitJ, false) : null;
  const c: number[] = [];
  for (let v = 0; v < g.ids.length; v++) {
    if (g.isEnd[v]) continue; // Junctions only.
    if (v === g.start || v === g.exit || v === startJ || v === exitJ) continue;
    const h = hop[v];
    if (h < SLEEPER_RING_MIN || h > SLEEPER_RING_MAX) continue;
    if (nearStart && nearStart[v] >= 0 && nearStart[v] <= 1) continue;
    if (near && near[v] >= 0 && near[v] <= (avoid.hops as number)) continue;
    if (dEx && dEx[v] <= (avoid.dist as number)) continue;
    if (skip.includes(v)) continue;
    c.push(v);
  }
  const s = Math.floor(Math.abs(seed)) % 4294967296;
  const rng = new TurnRng((s ^ SLEEPER_SALT) >>> 0).at(0);
  const out: number[] = [];
  for (let i = 0; i < n && c.length > 0; i++) {
    const k = Math.min(c.length - 1, Math.floor(rng.next() * c.length));
    out.push(c[k]);
    c.splice(k, 1);
  }
  return out;
}

// The kinds for `n` monsters under sleepKind.
export function monsterKinds(seed: number, n: number, mode: SleepKind): MonsterKind[] {
  const out: MonsterKind[] = [];
  if (mode === "wake" || mode === "follow") {
    for (let i = 0; i < n; i++) out.push(mode === "wake" ? "sleeper" : "follower");
    return out;
  }
  const s = Math.floor(Math.abs(seed)) % 4294967296;
  const first = new TurnRng((s ^ SLEEPER_SALT) >>> 0).at(1).next() < 0.5;
  for (let i = 0; i < n; i++) out.push((i % 2 === 0) === first ? "sleeper" : "follower");
  return out;
}

// The monsters for a design: spots and kinds together.
export function monsterSpecs(
  g: ChaseGraph,
  seed: number,
  count: number,
  mode: SleepKind,
  avoid: SwordAvoid = {},
  skip: readonly number[] = []
): MonsterSpec[] {
  const spots = sleeperSpots(g, seed, count, avoid, skip);
  const kinds = monsterKinds(seed, spots.length, mode);
  return spots.map((home, i) => ({ kind: kinds[i], home }));
}
