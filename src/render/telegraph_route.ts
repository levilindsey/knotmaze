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
// toward, drawn before the steps (K324 stage 2 feeds it; the turn
// minotaur passes none). A step whose run is missing ends the route, as
// in drawTelegraph; a stretch shorter than PIECE_EPS ctrl is dropped.

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
  lead: RouteLead | null = null
): RoutePiece[] {
  const out: RoutePiece[] = [];
  let first = true;
  const push = (p: RoutePiece | null): void => {
    if (p) out.push(p);
  };
  if (lead) {
    // An empty lead (the minotaur at the end it walks toward) leaves the
    // first step as the first run.
    const run = runs[lead.edge];
    const p = run ? stretch(run, g.len[lead.edge], lead.pos, lead.dir > 0 ? g.len[lead.edge] : 0, 1) : null;
    if (p) {
      out.push(p);
      first = false;
    }
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
