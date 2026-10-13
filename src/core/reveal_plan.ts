// P4 Stage 22, the APPEARANCE PLAN: pure, deterministic reveal schedules
// for the maze/knot "animate in" modes. A plan is a set of per-chain
// SOURCES - directional fronts along a chain's ctrl axis, each with a start
// time and a rate - evaluated at any time t into revealed ctrl INTERVALS.
// The render layer converts intervals to per-sample width multipliers; this
// module never touches physics, pixi, or live positions (the one geometric
// input - initial world points for the decorative-loop fallback - comes in
// through a callback so the module stays pure and testable).
//
// Modes:
//   trace - multi? no: SINGLE-source flood from the walk start vertex,
//           expanding along thread runs and splitting at junctions (BFS
//           over the walk graph with deterministic LATTICE edge lengths).
//   bloom - the same flood from the walk start PLUS 3-5 seed vertices
//           picked deterministically from params.seed.
//   draw  - pen-draw strand by strand: each chain sweeps ctrl 0 -> end,
//           several strands in flight, starts staggered.
//   ink   - handled render-side (a world-distance dye front); this module
//           only records the origin and speed.
//
// Fronts within a run: a walk edge reveals from BOTH ends, each starting
// when the flood reaches that end's vertex, meeting where the arrival
// times balance - exactly the water-filling picture, so loops close at
// their far point instead of popping.

import type { WalkGraph } from "./walk_graph";
import { SeededRNG } from "../util/random";
import { hypot2 } from "../util/det_math";

// How the reveal travels (the appearSequence param; ui/url_state's
// appearMode presets pick it together with the effect and speed).
export const APPEAR_SEQUENCES = [
  "instant",
  "trace",
  "bloom",
  "draw",
  "ink",
] as const;
export type AppearSequence = (typeof APPEAR_SEQUENCES)[number];

// Frontier particle styles for the appearance animation (Stage 26). The
// effect itself is render-side (render/appear_fx); the list lives here
// beside APPEAR_SEQUENCES so ui/url_state stays pixi-free. none | rainbow
// (6-stripe rainbow riding the fresh thread + saturated spark spray;
// formerly "sparks" - a legacy afx=sparks URL falls back to the default,
// which is this mode anyway) | comet (blue-green streaked head, thread
// fades in behind) | dust (twinkling motes, thread fades in).
export const APPEAR_FX_MODES = [
  "none",
  "rainbow",
  "comet",
  "dust",
  "burn",
  "roots",
] as const;
export type AppearFxMode = (typeof APPEAR_FX_MODES)[number];

// One directional reveal front along a chain. Ctrls are UNWRAPPED (walk
// wrap runs run past the chain length; the loop fallback can go negative);
// consumers evaluate modulo/clamped exactly like paint spans.
export interface RevealSource {
  chain: number;
  cFrom: number; // Fixed end (revealing starts here)...
  cTo: number; // ...toward this end.
  t0: number; // Seconds (speed-1 clock) when the front starts.
  rate: number; // Ctrl per second.
}

// A revealed ctrl interval at some time t. c0 <= c1; a `soft` end is still
// advancing and gets the frontier taper (a finished or vertex-anchored end
// renders at full width).
export interface RevealInterval {
  c0: number;
  c1: number;
  soft0: boolean;
  soft1: boolean;
}

export interface ChainGeom {
  len: number; // Ctrl count (chain length).
  closed: boolean;
  worldLen: number; // Initial arc length, seam-aware for open chains.
}

export interface RevealPlan {
  mode: Exclude<AppearSequence, "instant">;
  sources: RevealSource[][]; // Per chain.
  duration: number; // Speed-1 seconds to full reveal (ink: a safety cap).
  origin: { chain: number; ctrl: number }; // Ink dye origin (walk start).
  inkSpeed: number; // World units/s of the dye radius (ink only).
}

// Flood speed for trace/bloom, in LATTICE units per second (walk edge
// lengths are deterministic lattice arc). Draw sweeps faster (a pen stroke
// reads as a stroke, not a crawl); ink's radial front covers area, so its
// linear speed sits lower.
const FLOOD_SPEED = 8;
const DRAW_SPEED = 14;
const INK_SPEED = 4.5;
// Fraction of a strand's draw time that elapses before the next strand's
// pen starts. Small: dense knots carry dozens of strands, and a serial
// crawl (0.3 measured 33s on a 49-strand knot) reads as loading, not
// drawing - this keeps the whole pass near the longest strand's time.
const DRAW_STAGGER = 0.12;
// Per-strand draw time is clamped: giant strands speed their pen up
// instead of dragging the whole animation past ~12s (a 246-world-unit
// strand at constant pen speed alone took 17s), and confetti strands
// still read as strokes rather than pops.
const DRAW_TIME_MIN = 0.6;
const DRAW_TIME_MAX = 6.5;
// CONNECTORS LAST: the short splice bridges (and any other short
// junction-to-junction chain - see connectorRuns) used to sit in the
// shuffle with the long strands, so they popped in from the first frame as
// confetti floating in empty space (the user's rect URL drew 28 bridges
// and no long strand in its first two seconds). They now draw as the
// closing cascade of the long-strand pass: starts spread over its last
// CONNECT_TAIL, the last connector finishing together with the last long
// strand, so connectors add no running time of their own. Each is also
// held back until both host junctions it joins have been drawn: the bare
// cascade left 0-7 bridges per fabric drawn up to 1.4s before a thread
// they attach to (7 fabrics measured). That hold can overrun the long
// pass by at most one connector stroke (+0-0.5s measured).
const CONNECT_TAIL = 0.2;
// A connector is SHORT: its run's lattice length is at most this. Splice
// bridges span 1.2-2.2 lattice (maze_plan's splice length window); the
// shortest non-connector chain across 10 surveyed fabrics was 8.7 world
// units long, so a long thread that happens to run junction to junction
// with no choice on it keeps its slot among the strands.
const CONNECTOR_MAX_LEN = 4;
const INK_CAP_RADIUS = 80; // Safety cap on the dye radius (world units).

// Build the reveal plan. `walk` may be null (knot mode / old maze mode):
// trace and bloom then fall back to draw. `pointAt` supplies INITIAL world
// positions (used only for chains the walk graph does not cover).
export function buildRevealPlan(
  mode: Exclude<AppearSequence, "instant">,
  walk: WalkGraph | null,
  chains: ChainGeom[],
  seed: number,
  pointAt: (chain: number, ctrl: number) => readonly [number, number]
): RevealPlan {
  const effective: Exclude<AppearSequence, "instant"> =
    (mode === "trace" || mode === "bloom") && !walk ? "draw" : mode;

  const origin = walk
    ? originOf(walk)
    : { chain: 0, ctrl: 0 };

  if (effective === "ink") {
    return {
      mode: effective,
      sources: chains.map(() => []),
      duration: INK_CAP_RADIUS / INK_SPEED,
      origin,
      inkSpeed: INK_SPEED,
    };
  }

  const sources: RevealSource[][] = chains.map(() => []);

  if (effective === "draw") {
    // Deterministic strand order, staggered starts. Short CONNECTORS keep
    // their shuffled order but sit out the long-strand pass and draw as its
    // closing cascade (CONNECT_TAIL); without a walk graph (knot mode) there
    // are none and the plan is exactly the plain shuffled stagger.
    const order = chains.map((_, i) => i);
    const rng = new SeededRNG((seed ^ 0xd4a3) >>> 0);
    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    const runs = walk ? connectorRuns(walk, chains) : null;
    let start = 0;
    let duration = 0;
    for (const chain of order) {
      if (runs?.[chain]) continue; // Connector: closing cascade below.
      const g = chains[chain];
      const span = g.closed ? g.len : g.len - 1;
      if (span <= 0) continue;
      const dur = drawTime(g);
      sources[chain].push({
        chain,
        cFrom: 0,
        cTo: span,
        t0: start,
        rate: span / dur,
      });
      if (start + dur > duration) duration = start + dur;
      start += dur * DRAW_STAGGER;
    }
    if (runs) {
      duration = drawConnectors(order, runs, walk!, chains, sources, duration);
    }
    return { mode: effective, sources, duration, origin, inkSpeed: INK_SPEED };
  }

  // trace / bloom: flood over the walk graph.
  const wg = walk!;
  const seeds: string[] = [wg.start];
  if (effective === "bloom") {
    const ids = [...wg.vertices.keys()].sort();
    const rng = new SeededRNG((seed ^ 0xb100) >>> 0);
    const want = 3 + rng.nextInt(3); // 3-5 extra seeds.
    for (let k = 0; k < want && ids.length > 0; k++) {
      const pick = ids[rng.nextInt(ids.length)];
      if (!seeds.includes(pick)) seeds.push(pick);
    }
  }

  // Multi-source Dijkstra (time = lattice distance / FLOOD_SPEED), with the
  // walk_graph O(V^2) scan + id tie-break (the graph is small and this
  // keeps arrival times deterministic).
  const T = new Map<string, number>();
  for (const id of wg.vertices.keys()) T.set(id, Infinity);
  for (const s of seeds) T.set(s, 0);
  const done = new Set<string>();
  for (;;) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const [id, d] of T) {
      if (done.has(id) || d === Infinity) continue;
      if (d < curD || (d === curD && cur !== null && id < cur)) {
        curD = d;
        cur = id;
      }
    }
    if (cur === null) break;
    done.add(cur);
    for (const eid of wg.vertices.get(cur)!.edges) {
      const e = wg.edges[eid];
      const other = e.va === cur ? e.vb : e.va;
      const nd = curD + e.length / FLOOD_SPEED;
      if (nd < T.get(other)!) T.set(other, nd);
    }
  }
  // Unreachable vertices (shouldn't exist in a spanned maze, but never
  // leave material unrevealed): start them after the last reached one.
  let maxT = 0;
  for (const d of T.values()) {
    if (Number.isFinite(d) && d > maxT) maxT = d;
  }
  for (const [id, d] of T) {
    if (!Number.isFinite(d)) T.set(id, maxT + 0.4);
  }

  let duration = 0;
  const addSource = (s: RevealSource): void => {
    sources[s.chain].push(s);
    const end = s.t0 + Math.abs(s.cTo - s.cFrom) / s.rate;
    if (end > duration) duration = end;
  };

  // Per-chain ctrl coverage (open chains can carry uncovered tails when a
  // terminal node is not a walk vertex; closed chains with any stop are
  // fully covered by construction, wrap run included).
  const covMin = chains.map((g) => (g.closed ? 0 : Infinity));
  const covMax = chains.map(() => -Infinity);
  const covTime = new Map<number, { atMin: number; atMax: number }>();

  for (const e of wg.edges) {
    const Ta = T.get(e.va)!;
    const Tb = T.get(e.vb)!;
    const spanCtrl = e.ctrlB - e.ctrlA;
    const lat = Math.max(e.length, 1e-6);
    const rate = (FLOOD_SPEED * spanCtrl) / lat;
    if (spanCtrl <= 1e-9) continue;
    // Fronts from both ends meet where arrival times balance.
    const tMeet = (lat / FLOOD_SPEED + Ta + Tb) / 2;
    const latA = Math.max(0, Math.min(lat, (tMeet - Ta) * FLOOD_SPEED));
    const cMeet = e.ctrlA + (spanCtrl * latA) / lat;
    if (cMeet - e.ctrlA > 1e-9) {
      addSource({ chain: e.chain, cFrom: e.ctrlA, cTo: cMeet, t0: Ta, rate });
    }
    if (e.ctrlB - cMeet > 1e-9) {
      addSource({ chain: e.chain, cFrom: e.ctrlB, cTo: cMeet, t0: Tb, rate });
    }
    const cov = covTime.get(e.chain) ?? { atMin: 0, atMax: 0 };
    if (e.ctrlA < covMin[e.chain]) {
      covMin[e.chain] = e.ctrlA;
      cov.atMin = Ta;
    }
    if (e.ctrlB > covMax[e.chain]) {
      covMax[e.chain] = e.ctrlB;
      cov.atMax = Tb;
    }
    covTime.set(e.chain, cov);
  }

  // Uncovered OPEN-chain tails: continue outward from the covered end's
  // vertex at the chain's own rate.
  chains.forEach((g, chain) => {
    if (sources[chain].length === 0) return; // Handled by the loop fallback.
    if (g.closed) return;
    const rate = (FLOOD_SPEED * (g.len - 1)) / Math.max(g.worldLen, 1e-6);
    const cov = covTime.get(chain)!;
    if (covMin[chain] > 0.5) {
      addSource({ chain, cFrom: covMin[chain], cTo: 0, t0: cov.atMin, rate });
    }
    if (covMax[chain] < g.len - 1.5) {
      addSource({
        chain,
        cFrom: covMax[chain],
        cTo: g.len - 1,
        t0: cov.atMax,
        rate,
      });
    }
  });

  // Decorative loops (no walk vertices at all): the flood jumps across
  // from the nearest vertex when it arrives there, then wraps the loop
  // from the landing point in both directions.
  chains.forEach((g, chain) => {
    if (sources[chain].length > 0) return;
    if (g.len <= 0) return;
    let bestD = Infinity;
    let bestT = 0;
    let bestCtrl = 0;
    for (const v of wg.vertices.values()) {
      const [vx, vy] = pointAt(v.chain, v.ctrl);
      for (let c = 0; c < g.len; c += 2) {
        const [x, y] = pointAt(chain, c);
        const d = hypot2(x - vx, y - vy);
        if (d < bestD) {
          bestD = d;
          bestT = T.get(v.id)! + d / FLOOD_SPEED;
          bestCtrl = c;
        }
      }
    }
    const rate = (FLOOD_SPEED * g.len) / Math.max(g.worldLen, 1e-6);
    const half = g.closed ? g.len / 2 : 0;
    if (g.closed) {
      addSource({ chain, cFrom: bestCtrl, cTo: bestCtrl + half, t0: bestT, rate });
      addSource({ chain, cFrom: bestCtrl, cTo: bestCtrl - half, t0: bestT, rate });
    } else {
      addSource({ chain, cFrom: bestCtrl, cTo: 0, t0: bestT, rate });
      addSource({ chain, cFrom: bestCtrl, cTo: g.len - 1, t0: bestT, rate });
    }
  });

  return { mode: effective, sources, duration, origin, inkSpeed: INK_SPEED };
}

// Draw sequence: one pen's time for a whole chain (clamped, see
// DRAW_TIME_MIN/MAX).
function drawTime(g: ChainGeom): number {
  return Math.max(
    DRAW_TIME_MIN,
    Math.min(DRAW_TIME_MAX, g.worldLen / DRAW_SPEED)
  );
}

type WalkRun = WalkGraph["edges"][number];

// The draw sequence's CONNECTORS, structurally: an OPEN chain the walk
// graph covers with exactly one run, from ctrl 0 to its last ctrl, between
// two JUNCTION vertices (no choice on it, no maze end), and SHORT (lattice
// length <= CONNECTOR_MAX_LEN). Splice bridges are exactly this by
// construction (a single-edge open strand between two degree-3 junctions);
// cut tails and dead-end threads carry an END vertex and stay strands.
// Returns the run per connector chain, null for every other chain.
function connectorRuns(
  walk: WalkGraph,
  chains: ChainGeom[]
): (WalkRun | null)[] {
  const only: (WalkRun | null)[] = chains.map(() => null);
  const count = chains.map(() => 0);
  for (const e of walk.edges) {
    if (e.chain < 0 || e.chain >= chains.length) continue;
    count[e.chain]++;
    only[e.chain] = e;
  }
  const junction = (id: string): boolean =>
    walk.vertices.get(id)?.isEnd === false;
  return only.map((e, chain) => {
    const g = chains[chain];
    if (!e || g.closed || count[chain] !== 1) return null;
    if (e.ctrlA !== 0 || e.ctrlB !== g.len - 1) return null;
    if (e.length > CONNECTOR_MAX_LEN) return null;
    return junction(e.va) && junction(e.vb) ? e : null;
  });
}

// Schedule the connectors (`runs`, from connectorRuns) as the long pass's
// closing cascade: in shuffled order, starts spread evenly so the first
// opens the last CONNECT_TAIL of the long pass and the last finishes with
// it, each held back until both host junctions it attaches to have been
// drawn (the earliest long-strand pen to reach that junction). `longEnd` is
// the long pass's end; returns the plan's duration.
function drawConnectors(
  order: number[],
  runs: (WalkRun | null)[],
  walk: WalkGraph,
  chains: ChainGeom[],
  sources: RevealSource[][],
  longEnd: number
): number {
  const conns = order.filter((c) => runs[c] && chains[c].len > 1);
  const n = conns.length;
  if (n === 0) return longEnd;
  const durs = conns.map((c) => drawTime(chains[c]));
  const window = Math.max(CONNECT_TAIL * longEnd, ...durs);

  // When a long-strand pen first draws junction vertex `id` (0 if none
  // does: nothing to wait for).
  const drawnAt = (id: string, self: number): number => {
    const v = walk.vertices.get(id);
    if (!v) return 0;
    let best = Infinity;
    for (const eid of v.edges) {
      const h = walk.edges[eid];
      if (!h || h.chain === self || runs[h.chain]) continue;
      const pen = sources[h.chain]?.[0];
      if (!pen) continue; // A degenerate (span 0) chain draws nothing.
      const len = chains[h.chain].len;
      const at = (ctrl: number): number =>
        pen.t0 + (((ctrl % len) + len) % len) / pen.rate;
      if (h.va === id) best = Math.min(best, at(h.ctrlA));
      if (h.vb === id) best = Math.min(best, at(h.ctrlB));
    }
    return Number.isFinite(best) ? best : 0;
  };

  let duration = longEnd;
  conns.forEach((chain, k) => {
    const run = runs[chain]!;
    const span = chains[chain].len - 1; // Connectors are open.
    const dur = durs[k];
    const slot =
      n > 1
        ? longEnd - window + ((window - dur) * k) / (n - 1)
        : longEnd - dur;
    const t0 = Math.max(
      0,
      slot,
      drawnAt(run.va, chain),
      drawnAt(run.vb, chain)
    );
    sources[chain].push({ chain, cFrom: 0, cTo: span, t0, rate: span / dur });
    if (t0 + dur > duration) duration = t0 + dur;
  });
  return duration;
}

function originOf(walk: WalkGraph): { chain: number; ctrl: number } {
  const v = walk.vertices.get(walk.start)!;
  return { chain: v.chain, ctrl: v.ctrl };
}

// Revealed intervals for one chain at time t (speed-1 clock). Each active
// source contributes [cFrom, head] (normalized c0 <= c1) with the moving
// end soft until it lands on cTo.
export function intervalsAt(
  plan: RevealPlan,
  chain: number,
  t: number
): RevealInterval[] {
  const out: RevealInterval[] = [];
  for (const s of plan.sources[chain]) {
    const dt = t - s.t0;
    if (dt <= 0) continue;
    const span = Math.abs(s.cTo - s.cFrom);
    const prog = Math.min(span, dt * s.rate);
    const finished = prog >= span - 1e-9;
    if (s.cTo >= s.cFrom) {
      out.push({
        c0: s.cFrom,
        c1: s.cFrom + prog,
        soft0: false,
        soft1: !finished,
      });
    } else {
      out.push({
        c0: s.cFrom - prog,
        c1: s.cFrom,
        soft0: !finished,
        soft1: false,
      });
    }
  }
  return out;
}

// An advancing frontier tip at some time t (glows + frontier particles).
// `dir` is the ctrl-axis travel sign and `rate` the ctrl/s advance on the
// speed-1 clock (multiply by the live animator speed for the real rate).
export interface RevealTip {
  chain: number;
  ctrl: number;
  dir: 1 | -1;
  rate: number;
}

// Advancing frontier tips at time t: the moving end of every source that
// has started and not yet landed.
export function tipsAt(plan: RevealPlan, t: number): RevealTip[] {
  const out: RevealTip[] = [];
  for (const perChain of plan.sources) {
    for (const s of perChain) {
      const dt = t - s.t0;
      if (dt <= 0) continue;
      const span = Math.abs(s.cTo - s.cFrom);
      const prog = dt * s.rate;
      if (prog >= span) continue;
      const dir: 1 | -1 = s.cTo >= s.cFrom ? 1 : -1;
      out.push({
        chain: s.chain,
        ctrl: s.cFrom + dir * prog,
        dir,
        rate: s.rate,
      });
    }
  }
  return out;
}
