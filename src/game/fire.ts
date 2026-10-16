// K114 burn race (stage 1, brief docs/design/K114_burn.md): the fire model.
// A fuse lit at the walk start burns along every run of the walk graph,
// slower than you; burnt runs are gone. Pure, and exact arithmetic only
// (+ - * /, K108), because an attempt is a tap list that replays on any
// device.
//
// THE CLOCK L is an input, picked by `clock` (the fireClock param). The
// turn-based fire's L is the controller's walkedDist: each move advances it
// by the run's length, a backtrack too ("backtracking feeds the fire"), and
// it is 0 until the first move, so the lit fuse waits at the entrance. The
// real-time fire's L (K114 stage 2, game/fire_clock.ts) is FIRE_V_REF x
// the fixed-step time since the first accepted move: the dot runs at
// FIRE_V_REF too, so a move that leaves at L arrives at L + len, and
// standing still lets the fire close in (the controller's header has the
// rules).
//
// THE MODEL (R.3.3, derived in the brief's "The model"):
// - d(v) = v's walk distance from WalkGraph.start; the fire reaches v at
//   T(v) = h + d(v)/r (h = the delay, r = the speed, both per lattice unit
//   walked). Unreachable vertices never burn (T = Infinity).
// - A run u-w of length len burns from both ends: its point at distance x
//   from u burns at h + min(d(u) + x, d(w) + len - x)/r. It starts burning
//   at h + min(d(u), d(w))/r and is burnt at h + (d(u) + d(w) + len)/(2r).
//   A point is burnt once T(point) <= L.
// - An arm from u to w is SAFE when L + len < T(w) (strict: arriving with
//   the fire is too late), SMOLDERING otherwise. A smoldering arm refuses
//   the tap.
// - LOST: no safe arm at the junction you reach (the exit wins instead).
// - THE CLOSEST CALL: the least T(v) - L over every arrival, the exit
//   included; standing at the start before the first move is not one.
// - Every accepted move keeps L < T at the vertex reached, so no arm at
//   the head is ever burnt: each is safe or smoldering. On a shortest
//   route L(v) = d(v) < T(v) for every v past the start (r < 1): the
//   optimal route always escapes.

import type { WalkGraph } from "../core/walk_graph";
import { walkDistances } from "../core/walk_graph";

// K114 stage 2: what drives L (the header's THE CLOCK).
export type FireClock = "turn" | "realtime";

export interface Fire {
  readonly speed: number; // r: fire distance per lattice unit walked
  readonly delay: number; // h: lattice units walked before it spreads
  readonly clock: FireClock;
  // d(v) from WalkGraph.start (Infinity where unreachable).
  readonly dist: ReadonlyMap<string, number>;
}

export function buildFire(
  walk: WalkGraph,
  speed: number,
  delay: number,
  clock: FireClock = "turn"
): Fire {
  return {
    speed,
    delay,
    clock,
    dist: walkDistances(walk.vertices, walk.edges, walk.start),
  };
}

// T(v): the clock at which the fire reaches vertex v.
export function fireTime(fire: Fire, v: string): number {
  const d = fire.dist.get(v);
  if (d === undefined || d === Infinity) return Infinity;
  return fire.delay + d / fire.speed;
}

// The far end of the arm `eid` leaving vertex `from` (a self-loop's is
// `from` itself).
export function armFar(walk: WalkGraph, eid: number, from: string): string {
  const e = walk.edges[eid];
  return e.va === from ? e.vb : e.va;
}

// The arm test: walking `eid` from `from` at clock L arrives strictly
// before the fire reaches its far end.
export function armSafe(
  walk: WalkGraph,
  fire: Fire,
  L: number,
  from: string,
  eid: number
): boolean {
  return L + walk.edges[eid].length < fireTime(fire, armFar(walk, eid, from));
}

// The safe arms at vertex `at` at clock L, in the vertex's edge order.
export function safeArms(walk: WalkGraph, fire: Fire, L: number, at: string): number[] {
  const v = walk.vertices.get(at);
  if (!v) return [];
  return v.edges.filter((eid) => armSafe(walk, fire, L, at, eid));
}

// The loss test: no safe arm left at `at` (never at the exit: it wins).
export function fireTrapped(walk: WalkGraph, fire: Fire, L: number, at: string): boolean {
  if (at === walk.exit) return false;
  return safeArms(walk, fire, L, at).length === 0;
}

// A run's state at clock L. `burnt` lists the burnt stretches as
// [from, to] distances from the run's va end, ascending and disjoint
// (one from each end at most). `front` lists the fire's fronts on the run
// (distances from va), where the burning edge is now.
export type RunBurn =
  | { state: "unburnt" }
  | { state: "burning"; burnt: Array<[number, number]>; front: number[] }
  | { state: "burnt" };

const UNBURNT: RunBurn = { state: "unburnt" };
const BURNT: RunBurn = { state: "burnt" };

export function runBurnAt(walk: WalkGraph, fire: Fire, eid: number, L: number): RunBurn {
  const e = walk.edges[eid];
  const da = fire.dist.get(e.va) ?? Infinity;
  const db = fire.dist.get(e.vb) ?? Infinity;
  const len = e.length;
  const r = fire.speed;
  const h = fire.delay;
  const first = da < db ? da : db;
  if (first === Infinity || L < h + first / r) return UNBURNT;
  if (da !== Infinity && db !== Infinity && L >= h + (da + db + len) / (2 * r)) {
    return BURNT;
  }
  // The fire's reach along the graph at clock L, in lattice units.
  const reach = (L - h) * r;
  const burnt: Array<[number, number]> = [];
  const front: number[] = [];
  if (da !== Infinity && reach >= da) {
    const x = Math.min(len, reach - da);
    burnt.push([0, x]);
    front.push(x);
  }
  if (db !== Infinity && reach >= db) {
    const x = Math.max(0, len - (reach - db));
    burnt.push([x, len]);
    front.push(x);
  }
  // Rounding at the meeting point: both stretches met, so it is burnt.
  if (burnt.length === 2 && burnt[0][1] >= burnt[1][0]) return BURNT;
  return { state: "burning", burnt, front };
}

// The fire's lead at vertex v at clock L: T(v) - L (lattice units). It is
// the margin of an arrival at v; the closest call is its least value.
export function fireLead(fire: Fire, v: string, L: number): number {
  return fireTime(fire, v) - L;
}
