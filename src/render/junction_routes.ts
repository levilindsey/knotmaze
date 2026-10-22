// K81 ROUTE BANDS, the pure half. Levi: "We show a discontinuous flat nub
// across the bottom side of this intersection ... Ideally, the yellow
// highlight should indicate whether the player traveled, so a smooth
// continuous arc from right to left would probably be best." The junction
// field blends ANGULARLY between the two arms bracketing a pixel, so where
// the route turned, the gold-to-section transition ran straight across the
// wedge (the nub), and the wedges beside a gold arm were gold whether the
// route crossed them or not. Now each junction the route passes holds a
// ROUTE: the arm it arrived by and the arm it left by. The renderer draws
// one band per route in the junction pass (junction_field.ts ROUTES): the
// arrival arm's centerline, a cubic turn tangent to both arms, the
// departure arm's centerline, at thread width, wearing the arms' own
// composed paint; everything else in the web shows the untraveled material
// (unless the path has traveled every arm: K127, below).
//
// This module decides WHICH arms (from the walk path and the move in
// flight) and the band's corner geometry. RibbonRenderer resolves each
// route against its junction records (rebuildFillets) and draws it.
//
// DECISIONS (K81; also in .claude/rules/render-routes.md "Route bands"):
// - A route exists at every vertex of the path's legs, the move in flight
//   included: both ends of an advancing or retracting run carry the band,
//   so the gold slides into and out of a junction along the band instead
//   of fanning into its wedges for the frames before the dot arrives.
// - BACKTRACK: the band follows the WALK, like the gold (K794: the
//   walked set, from the taps). A backtracked pass's band stays; a
//   junction the walk truly passes twice holds two
//   bands, the newer drawn last. A record keeps the newest MAX_ROUTES.
// - HEAD: one-arm band (the arrival arm in to the joint center, round
//   end), under the head marker. The start, the exit and dead ends are
//   free tips, not junction records: they keep their caps and get none.
// - The band reads the arms' COMPOSED paint (gold amount, pulses, hover,
//   glow), so it follows every fade the arms show (K93, trail mode) with
//   no clock of its own; the rest of the web reads the arms' UNTRAVELED
//   paint (the same without the gold amount).
// - FULLY TRAVELED (K127, Levi 2026-10-13): a web whose arms the path has
//   ALL traveled draws, outside its bands, what it drew before K81: the
//   angular blend of the arms' COMPOSED paint, with the junction caps kept
//   (the bands still draw over it). An arm is TRAVELED when a pass of the
//   WALK in gold mode (the stack in trail mode; traveledRoutes over the
//   legs fed) arrives or leaves by it, whatever the trail
//   still paints: an arm that has faded out of the trail counts, and its
//   composed paint is then its untraveled material, which is what the web
//   showed there before K81 (a fade-driven rule would flip the other arms'
//   gold sectors as a pass faded). The move in flight counts at the dot:
//   an advance's arriving arm counts on arrival, a backtracked arm stops
//   counting at the tap, and the arm a move departs by counts at the tap.
//   So a 3-arm joint passed twice is full; the head's joint counts its
//   arrival arm.

// A route through one junction, as junction arms: the arm it ARRIVED by
// (A) and the arm it LEFT by (B, the out* fields; absent = a one-arm route,
// e.g. the head). An arm is a directed half-thread leaving the junction:
// its chain, the ctrl of its joint occurrence (walk ctrls are particle
// slots; a closed chain's ctrl may be unwrapped past its length) and the
// direction it runs away from the joint (+1 = increasing ctrl).
export interface PaintRoute {
  chain: number;
  ctrl: number;
  dir: 1 | -1;
  outChain?: number;
  outCtrl?: number;
  outDir?: 1 | -1;
}

export interface RouteArm {
  chain: number;
  ctrl: number;
  dir: 1 | -1;
}

// The walk-edge fields this module reads (WalkEdge satisfies it).
export interface RouteEdge {
  va: string;
  vb: string;
  chain: number;
  ctrlA: number;
  ctrlB: number;
  length: number;
}

// One run of the path, in path order: the edge, whether it departs from
// its A end (self-loops always do: they run A -> B, the beginMove
// convention), and its lattice length behind the visual head (a run in
// flight counts only its swept part, exactly as trailSegments does).
export interface RouteLeg {
  e: RouteEdge;
  fromA: boolean;
  len: number;
}

// The move in flight (FabricMazeRenderer's MoveAnim): `from` is the ctrl
// the dot left, `to` the controller's new head end, `cur` the dot.
export interface RouteAnim {
  e: RouteEdge;
  from: number;
  to: number;
  cur: number;
  kind: "advance" | "backtrack";
}

// The arm an edge occupies at one of its ends.
export function edgeArm(e: RouteEdge, atA: boolean): RouteArm {
  return atA
    ? { chain: e.chain, ctrl: e.ctrlA, dir: 1 }
    : { chain: e.chain, ctrl: e.ctrlB, dir: -1 };
}

// K138 s2 TURNSTILES: each pair of runs a junction lets through as one band
// across it (arm `a` in, arm `b` out), so a turnstile's open pair reads as
// one thread through the joint and its third arm meets the band. The
// renderer lists these BEFORE the path's routes, so the path's bands draw
// over them and a full record drops them first.
export function pairRoutes(
  edges: readonly RouteEdge[],
  pairs: readonly { vertex: string; a: number; b: number }[]
): PaintRoute[] {
  const out: PaintRoute[] = [];
  for (const p of pairs) {
    const ea = edges[p.a];
    const eb = edges[p.b];
    if (!ea || !eb || ea.chain < 0 || eb.chain < 0 || p.a === p.b) continue; // chain < 0: a tunnel arm (K137 4.13)
    const a = edgeArm(ea, ea.va === p.vertex);
    const b = edgeArm(eb, eb.va === p.vertex);
    out.push({ chain: a.chain, ctrl: a.ctrl, dir: a.dir, outChain: b.chain, outCtrl: b.ctrl, outDir: b.dir });
  }
  return out;
}

// The path's legs, with the move in flight folded in the way the paint
// folds it. The controller is already updated when a move starts: an
// ADVANCE has pushed its edge (the last leg, partially swept: from -> cur),
// a BACKTRACK has popped it (appended here as the REMNANT still painted,
// departing the new head: to -> cur).
export function pathLegs(
  edges: readonly RouteEdge[],
  pathVertices: readonly string[],
  pathEdges: readonly number[],
  anim: RouteAnim | null
): RouteLeg[] {
  const legs: RouteLeg[] = [];
  for (let i = 0; i < pathEdges.length; i++) {
    const e = edges[pathEdges[i]];
    legs.push({
      e,
      fromA: e.va === e.vb || pathVertices[i] === e.va,
      len: e.length,
    });
  }
  if (anim) {
    const full = Math.abs(anim.to - anim.from);
    const part = (c: number): number =>
      full > 1e-9 ? (anim.e.length * Math.abs(anim.cur - c)) / full : 0;
    if (anim.kind === "advance") {
      const last = legs[legs.length - 1];
      if (last) last.len = part(anim.from);
    } else {
      legs.push({ e: anim.e, fromA: anim.to === anim.e.ctrlA, len: part(anim.to) });
    }
  }
  return legs;
}

// The routes the legs make, in path order (oldest first): vertex k joins
// leg k-1's arrival arm to leg k's departure arm (one arm at the path's
// two ends). keep(dv) filters by the vertex's path distance behind the
// visual head (trail mode keeps the routes its paint still reaches).
export function legRoutes(
  legs: readonly RouteLeg[],
  keep: (dv: number) => boolean = () => true
): PaintRoute[] {
  const n = legs.length;
  const out: PaintRoute[] = [];
  if (n === 0) return out;
  const dv = new Float64Array(n + 1);
  for (let k = n - 1; k >= 0; k--) dv[k] = dv[k + 1] + legs[k].len;
  for (let k = 0; k <= n; k++) {
    if (!keep(dv[k])) continue;
    const arrive = k > 0 ? edgeArm(legs[k - 1].e, !legs[k - 1].fromA) : null;
    const depart = k < n ? edgeArm(legs[k].e, legs[k].fromA) : null;
    const a = arrive ?? depart!;
    const b = arrive ? depart : null;
    const r: PaintRoute = { chain: a.chain, ctrl: a.ctrl, dir: a.dir };
    if (b) {
      r.outChain = b.chain;
      r.outCtrl = b.ctrl;
      r.outDir = b.dir;
    }
    out.push(r);
  }
  return out;
}

// K127: the passes whose arms count as TRAVELED - every route of the path
// stack, unfiltered by the trail, except the one-arm route at the far end
// of the move in flight (legRoutes' last; inFlight = a move is animating):
// an advance's arriving arm counts on arrival, a backtracked arm stops
// counting at the tap.
export function traveledRoutes(
  legs: readonly RouteLeg[],
  inFlight: boolean
): PaintRoute[] {
  const out = legRoutes(legs);
  if (inFlight) out.pop();
  return out;
}

// Per junction: the newest `max` routes, oldest first, a repeated pass
// over the same pair of arms (either order) kept once, at its newest.
export function pickRoutes<T>(
  routes: readonly T[],
  pairKey: (r: T) => string,
  max: number
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = routes.length - 1; i >= 0 && out.length < max; i--) {
    const k = pairKey(routes[i]);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(routes[i]);
  }
  return out.reverse();
}

// The band's corner: the arc d along each arm where the turn starts, and
// the half-length m (in tau) of the A -> B material blend. alpha = the
// angle between the two arms' outward directions (pi = straight through,
// 0 = a U-turn); reach = the shorter arm's web reach; fh = the thread's
// half-width; capA/capB = how far along each arm the renderer can redraw
// the arm's ribbon (the cover strips). The turn radius scales with the
// turn angle (a straight route joins the centerlines through the joint),
// and d is capped so the band still covers the joint center: a turn
// tangent to both arms at d (a circle of radius d tan(alpha/2)) passes
// d (1 - sin(alpha/2)) / cos(alpha/2) from the center, kept <= 0.9 fh.
export function routeCorner(
  alpha: number,
  reach: number,
  fh: number,
  capA: number,
  capB: number
): { d: number; m: number } {
  const theta = Math.PI - alpha;
  let d = Math.max(reach, fh) * Math.min(1, Math.max(0, theta) / (Math.PI / 2));
  const s = Math.sin(alpha / 2);
  if (s < 1 - 1e-9) {
    d = Math.min(d, (0.9 * fh * Math.cos(alpha / 2)) / (1 - s));
  }
  d = Math.max(0, Math.min(d, capA - 0.5 * fh, capB - 0.5 * fh));
  return { d, m: Math.max(d, 0.5 * fh) };
}

// The turn: a cubic from pa (arm A's centerline at arc d) to pb (arm B's),
// tangent to both arms. ta / tb are the arms' OUTWARD unit tangents there:
// the band travels inward along A and outward along B, so its control
// points sit at pa - ta hl and pb - tb hl. hl is the circular-arc handle
// (4/3) tan(theta/4) R for the turn angle theta (0 = straight through),
// with R from the chord. Pushes steps + 1 points (x, y, tau), t = 0..1,
// tau running linearly -d -> +d.
export function routeCubic(
  pax: number,
  pay: number,
  tax: number,
  tay: number,
  pbx: number,
  pby: number,
  tbx: number,
  tby: number,
  d: number,
  steps: number,
  out: number[]
): void {
  const chord = Math.hypot(pbx - pax, pby - pay);
  const cosT = Math.max(-1, Math.min(1, -(tax * tbx + tay * tby)));
  const theta = Math.acos(cosT);
  const hl =
    theta < 1e-6
      ? chord / 3
      : ((2 / 3) * chord * Math.tan(theta / 4)) / Math.sin(theta / 2);
  const p1x = pax - tax * hl;
  const p1y = pay - tay * hl;
  const p2x = pbx - tbx * hl;
  const p2y = pby - tby * hl;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;
    out.push(
      b0 * pax + b1 * p1x + b2 * p2x + b3 * pbx,
      b0 * pay + b1 * p1y + b2 * p2y + b3 * pby,
      -d + 2 * d * t
    );
  }
}
