// K480 (stage 1): multi-run taps - the pure route planner and the stop
// rules. No renderer, no DOM: main.ts measures the tapped point on the
// live threads, this decides the run list and when a queued route (or a
// key/pad hold) must hand control back, and the controller walks the
// route one run at a time like an arrow-key hold. Each run is logged as
// its own tap (`fc.taps`), so a saved attempt is still a tap list and
// replays to the same game with no new format. Design: docs/design/
// K480.md (decisions 1-6); the lore is gameplay-moves.md's MULTI-RUN TAPS.
//
// THE ROUTE (decision 2): the shortest walk (in lattice arc, the walk
// graph's lengths) from the head to the tapped point, then the tapped
// run finished to its far end. The runs leaving the head are tappable
// along their whole length as before; past them, a point counts only
// within `reach` (the pulseReach param, world arc from the head) along
// the graph - where a short run ends inside the reach the route carries
// through its far junction and branches, so a chain of short runs is one
// tap. Only the tapped point's reach is judged: every intermediate point
// of the shortest route is nearer.
//
// THE STOPS (decisions 4-6, routeWarning): a queued route stops BEFORE
// its next run at a catch, the finish or a loss (the caller reads those
// off the controller / minotaur), and otherwise when a warning matters:
//   - the turn minotaur has just started hunting you (spotted: hunting
//     flipped false -> true on the last move);
//   - its new telegraph touches the rest of the route (a run it will
//     walk, or a junction the route ends a run on);
//   - under the turn-clock burn, the next run would be smoldering when
//     the player gets to it (the fire is deterministic on L = walked
//     distance, so this is checked at the departure clock exactly as
//     the controller's own refusal tests it).
// Holds get the same three warnings, with the hold's next run as the
// "rest of the route". Real time (the chase, or the realtime fire) has
// no warning stops: the route queues run by run and a smoldering arm is
// refused when it comes up, as today.

import type { WalkGraph } from "../core/walk_graph";
import type { Fire } from "./fire";
import { armSafe } from "./fire";

// A tapped point on a run: the walk-edge id and the lattice distance of
// the point along the run from its va end, in [0, length].
export interface TappedRun {
  edge: number;
  at: number;
}

// Dijkstra from `source` over the walk multigraph, with edge `banned`
// never traversed (the tapped run: the approach must not cross it, or the
// route would finish it and then finish it again), nor any run `blocked`
// names (K137: a broken run). Same deterministic scan and tie-breaking as
// walk_graph's walkDistances; `prev` records the run each vertex was
// first reached by, for reconstruction.
function dijkstraAvoid(
  walk: WalkGraph,
  source: string,
  banned: number,
  blocked?: (eid: number) => boolean
): { dist: Map<string, number>; prev: Map<string, { from: string; eid: number }> } {
  const dist = new Map<string, number>();
  const prev = new Map<string, { from: string; eid: number }>();
  const done = new Set<string>();
  for (const id of walk.vertices.keys()) dist.set(id, Infinity);
  dist.set(source, 0);
  for (;;) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const [id, d] of dist) {
      if (done.has(id) || d === Infinity) continue;
      if (d < curD || (d === curD && cur !== null && id < cur)) {
        curD = d;
        cur = id;
      }
    }
    if (cur === null) break;
    done.add(cur);
    for (const eid of walk.vertices.get(cur)!.edges) {
      if (eid === banned || (blocked && blocked(eid))) continue;
      const e = walk.edges[eid];
      const other = e.va === cur ? e.vb : e.va;
      const nd = curD + e.length;
      if (nd < dist.get(other)!) {
        dist.set(other, nd);
        prev.set(other, { from: cur, eid });
      }
    }
  }
  return { dist, prev };
}

// The run list a tap on `target` walks from `head`, the tapped run last,
// or null when the tap is refused: no such run, or its point is not
// reachable within `reach` (decision 1). A run incident to the head -
// the arrival run included, and a self-loop at the head - is the whole
// route whatever the reach (a tap well along it is a backtrack, as
// before). The approach never crosses the tapped run: entering it from
// whichever end reaches the tapped point sooner finishes it once. K137:
// `blocked` names runs the route may not walk (broken runs): a blocked
// target is refused and the approach goes around blocked runs; without
// it the planner is exactly as before.
export function planRoute(
  walk: WalkGraph,
  head: string,
  target: TappedRun,
  reach: number,
  blocked?: (eid: number) => boolean
): number[] | null {
  const e = walk.edges[target.edge];
  if (!e || !walk.vertices.has(head)) return null;
  if (blocked && blocked(e.id)) return null;
  if (e.va === head || e.vb === head) return [e.id];
  const at = Math.min(e.length, Math.max(0, target.at));
  const { dist, prev } = dijkstraAvoid(walk, head, e.id, blocked);
  const viaA = (dist.get(e.va) ?? Infinity) + at;
  const viaB = (dist.get(e.vb) ?? Infinity) + (e.length - at);
  const entry = viaB < viaA - 1e-12 ? e.vb : e.va;
  const total = Math.min(viaA, viaB);
  if (!Number.isFinite(total) || total > reach + 1e-9) return null;
  const route: number[] = [];
  for (let v = entry; v !== head; ) {
    const p = prev.get(v);
    if (!p) return null;
    route.unshift(p.eid);
    v = p.from;
  }
  route.push(e.id);
  return route;
}

// K480 stage 2, THE LIGHT (decision 1): one lit arm of the branching
// pulse/hover light. `atA` = the arm's junction end is the run's ctrlA
// end; `dist0` = world arc from the head to that junction along the
// shortest walk (the arm's own crests are phased by dist0 + local arc,
// so a train crosses a junction without a phase step); `cont` = the
// light carries on past the far end (it ends inside the reach at a
// junction, not an END), so no end fade applies there.
export interface LitArm {
  edge: number;
  atA: boolean;
  dist0: number;
  cont: boolean;
}

// Every arm lit from `head` out to `reach` (world arc): the runs out of
// the head whole, then, where a lit run ends inside the reach, every run
// out of its far junction (not back along itself), until the reach runs
// out. Each walk edge appears once, from its nearer end (Dijkstra
// order); a self-loop appears twice, once per end. `gate(eid, atA)` may
// veto a BEYOND-head arm (hidden or burnt thread is not lit, decision
// 3); a vetoed arm neither lights nor carries light through. Head arms
// are never gated (they are today's choices, lit as before). K137:
// `blocked` names runs that are gone (broken), at the head too: a
// blocked run neither lights nor carries light through.
export function litArms(
  walk: WalkGraph,
  head: string,
  reach: number,
  gate?: (eid: number, atA: boolean) => boolean,
  blocked?: (eid: number) => boolean
): LitArm[] {
  const arms: LitArm[] = [];
  if (!walk.vertices.has(head)) return arms;
  const dist = new Map<string, number>();
  for (const id of walk.vertices.keys()) dist.set(id, Infinity);
  dist.set(head, 0);
  const emitted = new Set<number>();
  const done = new Set<string>();
  for (;;) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const [id, d] of dist) {
      if (done.has(id) || !Number.isFinite(d)) continue;
      if (d < curD || (d === curD && cur !== null && id < cur)) {
        curD = d;
        cur = id;
      }
    }
    if (cur === null) break;
    done.add(cur);
    if (cur !== head && !(curD < reach)) continue;
    for (const eid of walk.vertices.get(cur)!.edges) {
      if (emitted.has(eid)) continue;
      if (blocked && blocked(eid)) {
        emitted.add(eid);
        continue;
      }
      const e = walk.edges[eid];
      const atA = e.va === cur;
      if (e.va === e.vb) {
        emitted.add(eid);
        arms.push({ edge: eid, atA: true, dist0: curD, cont: false });
        arms.push({ edge: eid, atA: false, dist0: curD, cont: false });
        continue;
      }
      const other = atA ? e.vb : e.va;
      if (curD > 0 && gate && !gate(eid, atA)) {
        emitted.add(eid);
        continue;
      }
      emitted.add(eid);
      const nd = curD + e.length;
      const far = walk.vertices.get(other);
      arms.push({
        edge: eid,
        atA,
        dist0: curD,
        cont: nd < reach && !!far && !far.isEnd,
      });
      if (nd < (dist.get(other) ?? Infinity)) dist.set(other, nd);
    }
  }
  return arms;
}

// The index of the first run of `route` (walked from `head` at fire
// clock `L`) that the fire would refuse - the run that would be
// smoldering when the player gets to it - or -1 when the whole route
// stays ahead of the fire. Exact on the turn clock, where L is the
// controller's walkedDist at planning time and each run adds its length.
export function firstSmolderIndex(
  walk: WalkGraph,
  fire: Fire,
  L: number,
  head: string,
  route: readonly number[]
): number {
  let cur = head;
  let l = L;
  for (let i = 0; i < route.length; i++) {
    if (!armSafe(walk, fire, l, cur, route[i])) return i;
    const e = walk.edges[route[i]];
    l += e.length;
    cur = e.va === cur ? e.vb : e.va;
  }
  return -1;
}

// Whether a telegraph (the runs the turn minotaur will walk next, and
// the walk vertices they end on or it ends on) touches the rest of a
// route from `head`: it walks one of the route's remaining runs, or it
// ends a step on a junction the route ends a run on. The player's own
// junction is not "the rest of the route".
export function telegraphTouchesRoute(
  walk: WalkGraph,
  head: string,
  route: readonly number[],
  teleEdges: readonly number[],
  teleVertices: readonly string[]
): boolean {
  if (route.length === 0 || (teleEdges.length === 0 && teleVertices.length === 0)) {
    return false;
  }
  const runs = new Set(route);
  for (const eid of teleEdges) if (runs.has(eid)) return true;
  const stops = new Set<string>();
  let cur = head;
  for (const eid of route) {
    const e = walk.edges[eid];
    if (!e) continue;
    cur = e.va === cur ? e.vb : e.va;
    stops.add(cur);
  }
  for (const v of teleVertices) if (stops.has(v)) return true;
  return false;
}

// The warning a queued route (or a hold) stops for before its next run,
// or null to keep going. `huntWas` / `huntIs`: the turn minotaur's
// hunting flag around the last move; `smolderAt`: the first smoldering
// index of the remaining route at its departure clock (firstSmolderIndex;
// -1 or undefined = none, and always none under real time).
export type RouteStop = "hunt" | "telegraph" | "smolder";
export function routeWarning(o: {
  huntWas: boolean;
  huntIs: boolean;
  walk: WalkGraph;
  head: string;
  remaining: readonly number[];
  teleEdges?: readonly number[];
  teleVertices?: readonly string[];
  smolderAt?: number;
}): RouteStop | null {
  if (o.remaining.length === 0) return null;
  if (!o.huntWas && o.huntIs) return "hunt";
  if (
    telegraphTouchesRoute(o.walk, o.head, o.remaining, o.teleEdges ?? [], o.teleVertices ?? [])
  ) {
    return "telegraph";
  }
  if (o.smolderAt === 0) return "smolder";
  return null;
}
