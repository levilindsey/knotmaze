// K794: walked gold stays gold. In gold mode (pv=gold) the gold used to
// follow the controller's path STACK, so a backtrack popped its run and
// erased its gold, and re-walking it regrew the gold from zero. Now the
// gold covers every run walked since it last cleared, derived from the
// controller's `taps` (every accepted tap's run, in order) - the same
// record the fog's explored runs derive from, so Undo (a replay of the
// taps minus the last), a resumed attempt (the K47 replay) and a restart
// (reset empties the taps) all agree with no new state in the renderer.
//
// The gold clears when the taps clear (a restart, a new maze) and at a
// refogging catch: the renderer passes `from`, the taps index the gold
// starts at (0, or taps.length when its refogs counter last changed -
// see FabricMazeRenderer's gold epoch), so a minoRefog catch clears the
// gold exactly when it clears the fog, and with refog off both stay.
// A daily's retreatToStart backtracks through tapEdge, so it keeps the
// gold. The win shows the walk (this module's spans), not just the
// final route. Paint only: the controller, its path stack, the stats,
// the stars, the share text and every rule are unchanged.

import {
  legRoutes,
  type PaintRoute,
  type RouteAnim,
  type RouteEdge,
  type RouteLeg,
} from "./junction_routes";

export interface GoldSpan {
  chain: number;
  c0: number;
  c1: number;
}

export interface WalkedGold {
  // One full span per distinct walked run, in first-walk order; a
  // first-time advance in flight carries its swept partial instead.
  spans: GoldSpan[];
  // The walk's junction bands and K127's traveled passes over them.
  routes: PaintRoute[];
  traveled: PaintRoute[];
  // Every run the gold covers (the walked taps, plus the path stack as
  // a safety net), and the walk's vertices in visit order, head last.
  walked: ReadonlySet<number>;
  visited: readonly string[];
  // The walk's legs (the in-flight leg's len is its swept part when the
  // run is new), exposed for tests and route debugging.
  legs: readonly RouteLeg[];
}

// Replay the taps from `from` at the walk's start into legs, the
// first-walk order and the visited sequence. A tap that does not touch
// the current vertex (a respawn kept the taps, or a replay seam) starts
// a new leg chain: no route joins across the break (legRoutes runs per
// chain below). Self-loops run A -> B at their own vertex.
export function replayWalk(
  edges: readonly RouteEdge[],
  start: string,
  taps: readonly number[],
  from: number
): {
  legs: RouteLeg[];
  visited: string[];
  order: number[];
  segStarts: Set<number>;
} {
  const legs: RouteLeg[] = [];
  const visited: string[] = [start];
  const order: number[] = [];
  const seen = new Set<number>();
  const segStarts = new Set<number>([0]);
  let cur = start;
  for (let i = Math.max(0, from); i < taps.length; i++) {
    const eid = taps[i];
    const e = edges[eid];
    if (!e) continue;
    let fromA: boolean;
    let depart: string;
    let next: string;
    if (e.va === e.vb) {
      fromA = true;
      depart = e.va;
      next = e.vb;
    } else if (e.va === cur) {
      fromA = true;
      depart = e.va;
      next = e.vb;
    } else if (e.vb === cur) {
      fromA = false;
      depart = e.vb;
      next = e.va;
    } else {
      // A break: depart from the end the edge offers at the start when
      // it touches it, else from A; a new chain starts at this leg.
      segStarts.add(legs.length);
      if (e.vb === start) {
        fromA = false;
        depart = e.vb;
        next = e.va;
      } else {
        fromA = true;
        depart = e.va;
        next = e.vb;
      }
      visited.push(depart);
    }
    legs.push({ e, fromA, len: e.length });
    if (!seen.has(eid)) {
      seen.add(eid);
      order.push(eid);
    }
    visited.push(next);
    cur = next;
  }
  return { legs, visited, order, segStarts };
}

// The gold for one paint declaration. `anim` is the renderer's move in
// flight (its run is the taps' last entry: the controller is already
// updated when a move starts) with its edge id, else null at rest.
export function walkedGold(
  edges: readonly RouteEdge[],
  start: string,
  taps: readonly number[],
  from: number,
  pathEdges: readonly number[],
  anim: (RouteAnim & { eid: number }) | null
): WalkedGold {
  const { legs, visited, order, segStarts } = replayWalk(
    edges,
    start,
    taps,
    from
  );
  const walked = new Set<number>(order);
  const spanOrder = [...order];
  // The path stack as a safety net (a run the taps somehow missed still
  // paints, exactly as before this change).
  for (const eid of pathEdges) {
    if (walked.has(eid) || !edges[eid]) continue;
    walked.add(eid);
    spanOrder.push(eid);
  }

  // In flight on a run walked for the first time, the gold is the swept
  // part, as before; on a run walked before (either direction - an
  // advance re-walk or a backtrack) it stays full and never regrows.
  let partial: { eid: number; c0: number; c1: number } | null = null;
  let isNewAdvance = false;
  if (anim) {
    let count = 0;
    for (let i = Math.max(0, from); i < taps.length; i++) {
      if (taps[i] === anim.eid) count++;
    }
    isNewAdvance = anim.kind === "advance" && count <= 1;
    if (isNewAdvance) {
      const lo = Math.min(anim.cur, anim.from);
      const hi = Math.max(anim.cur, anim.from);
      partial = { eid: anim.eid, c0: lo, c1: hi };
    }
  }

  const spans: GoldSpan[] = [];
  for (const eid of spanOrder) {
    const e = edges[eid];
    if (partial && eid === partial.eid) {
      if (partial.c1 - partial.c0 > 1e-6) {
        spans.push({ chain: e.chain, c0: partial.c0, c1: partial.c1 });
      }
      continue;
    }
    spans.push({ chain: e.chain, c0: e.ctrlA, c1: e.ctrlB });
  }

  // The walk's legs for the route bands, per unbroken chain. A new
  // advance's in-flight leg counts only its swept part (as pathLegs
  // folds it), so the far junction's band waits for arrival.
  const routeLegs: RouteLeg[] = legs.map((l) => ({ ...l }));
  if (anim && isNewAdvance && routeLegs.length > 0) {
    const full = Math.abs(anim.to - anim.from);
    const last = routeLegs[routeLegs.length - 1];
    last.len =
      full > 1e-9
        ? (anim.e.length * Math.abs(anim.cur - anim.from)) / full
        : 0;
  }
  const routes: PaintRoute[] = [];
  const starts = [...segStarts].sort((a, b) => a - b);
  for (let s = 0; s < starts.length; s++) {
    const a = starts[s];
    const b = s + 1 < starts.length ? starts[s + 1] : routeLegs.length;
    if (b > a) routes.push(...legRoutes(routeLegs.slice(a, b)));
  }
  // K127's traveled passes: every walk route except the far end of the
  // move in flight (traveledRoutes' rule, over the concatenated list).
  const traveledAll =
    anim && routes.length > 0 ? routes.slice(0, -1) : [...routes];

  return {
    spans,
    routes,
    traveled: traveledAll,
    walked,
    visited,
    legs: routeLegs,
  };
}
