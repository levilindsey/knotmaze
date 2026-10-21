// K525 (docs/design/K525_telegraph.md): the turn minotaur's telegraphed
// route as paint pieces, the TELE item's input (paint_glsl.ts
// TELE_ITEM_GLSL; ribbon_renderer.ts setTelegraph). Pure: the fabric
// renderer's drawTelegraph calls it with the chase graph's run ends and
// lengths and the walk's runs; test/render/telegraph_route.test.ts pins it.
//
// A piece is one run's stretch [c0, c1] in unwrapped walk ctrls (c1 > c0)
// with an alpha RELATIVE to the look's strength (1 for the first run, the
// lead's when there is one, TELEGRAPH_LATER_SHARE for every later run; the
// strength rides uKTele.w) and, per end, whether it is a junction end (j:
// the rim keeps the web's gap there, as the hover glow does) or a mid-run
// end (the minotaur's spot or a by-length stop: gap 0, a short fade).
//
// By runs, a step is the whole run. By length (fromSpot and segLens, as
// drawTelegraphLength reads them), the first step enters at fromSpot and
// each step covers segLens[s] from its entry. The lead is the K324 ChasePlan
// shape: the partial run the minotaur is on, from pos to the end it walks
// toward, drawn before the steps (the real-time chase feeds it, through
// chaseRoute below; the turn minotaur passes none). It draws at the first
// run's alpha, and so does the first whole step after it (K324 stage 2:
// "the first run (with the lead) at the look's alpha, the rest at half").
// A step whose run is missing ends the route, as in drawTelegraph; a
// stretch shorter than PIECE_EPS ctrl is dropped.
//
// RIDING (K654). With `ride`, the lead's piece holds its whole run's fixed
// range, its moving end (the minotaur's spot) flagged `ride` (0: c0, 1: c1)
// and its ctrl in `at`: the renderer keys KPAINT on the fixed fields only and
// sends `at` as a uniform (uKTeleAt.x), so a walking minotaur rewrites no
// texel until it changes runs. The TELE branch clamps the flagged end to
// `at` (paint_glsl.ts TELE_ITEM_GLSL), which lights exactly the [spot, end]
// stretch the unridden piece holds.

import { TELEGRAPH_LATER_SHARE } from "../game/mino_feedback";

export interface RouteRun {
  readonly chain: number;
  readonly ctrlA: number;
  readonly ctrlB: number;
}

export interface RouteEnds {
  readonly ea: ArrayLike<number>;
  readonly eb: ArrayLike<number>;
  readonly len: ArrayLike<number>;
}

export interface RouteLead {
  readonly edge: number;
  readonly pos: number;
  readonly dir: 1 | -1;
}

export interface RouteTelegraph {
  readonly steps: readonly (readonly [number, number])[];
  readonly fromSpot?: { readonly edge: number; readonly pos: number; readonly vertex: number };
  readonly segLens?: readonly number[];
  readonly stops?: unknown;
}

export interface RoutePiece {
  chain: number;
  c0: number;
  c1: number;
  alpha: number;
  j0: boolean;
  j1: boolean;
  // K654: the end that rides uKTeleAt (a riding lead only) and its ctrl.
  ride?: 0 | 1;
  at?: number;
}

const PIECE_EPS = 1e-6;

// The ctrl of a position along a run, exact at both ends.
function ctrlAt(run: RouteRun, pos: number, len: number): number {
  if (pos <= 0) return run.ctrlA;
  if (pos >= len) return run.ctrlB;
  return run.ctrlA + ((run.ctrlB - run.ctrlA) * pos) / (len || 1);
}

// One run's stretch between positions p and q (either order), clamped to
// the run; an end at 0 or len is a junction end.
function stretch(run: RouteRun, len: number, p: number, q: number, alpha: number): RoutePiece | null {
  const lo = Math.max(0, Math.min(p, q));
  const hi = Math.min(len, Math.max(p, q));
  const c0 = ctrlAt(run, lo, len);
  const c1 = ctrlAt(run, hi, len);
  if (!(c1 - c0 > PIECE_EPS)) return null;
  return { chain: run.chain, c0, c1, alpha, j0: lo <= 0, j1: hi >= len };
}

export function telegraphPieces(
  g: RouteEnds,
  runs: ArrayLike<RouteRun | undefined>,
  t: RouteTelegraph,
  lead: RouteLead | null = null,
  ride = false
): RoutePiece[] {
  const out: RoutePiece[] = [];
  let first = true;
  const push = (p: RoutePiece | null): void => {
    if (p) out.push(p);
  };
  if (lead) {
    // An empty lead (the minotaur at the end it walks toward) draws nothing.
    const run = runs[lead.edge];
    const len = g.len[lead.edge];
    const p = run ? stretch(run, len, lead.pos, lead.dir > 0 ? len : 0, 1) : null;
    if (p && run && ride) {
      // The whole run, the spot's end riding (gap 0 there, as the
      // unridden piece's mid-run end; the far end keeps its junction).
      const fwd = lead.dir > 0;
      out.push({
        chain: run.chain,
        c0: run.ctrlA,
        c1: run.ctrlB,
        alpha: 1,
        j0: fwd ? false : p.j0,
        j1: fwd ? p.j1 : false,
        ride: fwd ? 0 : 1,
        at: fwd ? p.c0 : p.c1,
      });
    } else push(p);
  }
  const byLength = !!(t.fromSpot && t.segLens && t.stops);
  let spot = t.fromSpot ? { edge: t.fromSpot.edge, pos: t.fromSpot.pos, vertex: t.fromSpot.vertex } : null;
  for (let s = 0; s < t.steps.length; s++) {
    const [e, b] = t.steps[s];
    const run = runs[e];
    if (!run) break;
    const alpha = first ? 1 : TELEGRAPH_LATER_SHARE;
    first = false;
    const len = g.len[e];
    if (!byLength || !spot) {
      push(stretch(run, len, 0, len, alpha));
      continue;
    }
    // drawTelegraphLength's entry, direction and covered length.
    const entry = spot.edge === e ? spot.pos : g.ea[e] === spot.vertex ? 0 : len;
    const dir = b === g.eb[e] ? 1 : -1;
    const seg = t.segLens?.[s] ?? len;
    push(stretch(run, len, entry, entry + dir * seg, alpha));
    spot = { edge: -1, pos: 0, vertex: b };
  }
  return out;
}

// K324 stage 2: the real-time chase's plan (MinotaurChase.plan, the
// ChasePlan shape) as the route drawTelegraph draws: `from`, `steps` and
// `dest` as a TurnTelegraph has them (by runs), plus the lead. `from` is
// the vertex the first step leaves: the lead's far end, or (standing at a
// vertex) the first step's other end. An empty lead (the minotaur at the
// end it walks to) becomes null. The ring shows only for a destination the
// route reaches (dest >= 0; -1 draws none). Nothing to draw returns null:
// in the lair until its last LAIR_TELL, or a hunter on the player's run.
export interface PlanRoute {
  readonly lead: RouteLead | null;
  readonly steps: readonly (readonly [number, number])[];
  readonly dest: number;
  readonly hunting: boolean;
}

export interface ChaseRoute {
  readonly from: number;
  readonly steps: readonly (readonly [number, number])[];
  readonly dest: number;
  readonly lead: RouteLead | null;
  readonly hunting: boolean;
}

export function chaseRoute(g: RouteEnds, plan: PlanRoute | null): ChaseRoute | null {
  if (!plan) return null;
  let lead = plan.lead;
  let from = -1;
  if (lead) {
    const len = g.len[lead.edge];
    from = lead.dir > 0 ? g.eb[lead.edge] : g.ea[lead.edge];
    const left = lead.dir > 0 ? len - lead.pos : lead.pos;
    if (!(left > PIECE_EPS)) lead = null;
  } else if (plan.steps.length > 0) {
    const [e, far] = plan.steps[0];
    from = g.ea[e] === far ? g.eb[e] : g.ea[e];
  }
  if (!lead && plan.steps.length === 0 && plan.dest < 0) return null;
  return { from, steps: plan.steps, dest: plan.dest, lead, hunting: plan.hunting };
}
