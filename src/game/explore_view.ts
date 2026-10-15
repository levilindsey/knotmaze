// K76 THREAD REVEAL: what the player can see of the maze. Pure (no pixi,
// no physics): from the walk graph and the explored state it returns
// VISIBILITY PIECES per chain - solid ctrl intervals with a fade at either
// end - which the renderer evaluates per pixel (the paint item PI_VIS, read
// by kExploreAt in the explore shader variant, src/render/explore_glsl.ts)
// and on the CPU (its twin in paint_math.ts).
//
// THE RULE (Levi, 2026-10-12; docs/design/K76_reveal_mode.md section 1):
//   - a run the player has walked (explored) shows whole;
//   - every run incident to a VISITED vertex shows `reach` lattice units out
//     from that vertex, its last `fade` lattice units fading out;
//   - a run whose far vertex is an END (dead-end tip, decoy or exit tail)
//     within reach shows solid to the tip - the thread visibly ends;
//   - a run whose two visited ends' reaches meet shows whole;
//   - JOINTS ARE BINARY: a stub stays solid through its own junction's web
//     domain (`web`: the fillet reach, at most half the run), so a fade
//     never runs under a junction's fans (translucent fans over translucent
//     arms double their alpha - faceted smudges); an unvisited junction is
//     never drawn (a stub fades out into it, its fans stay hidden);
//   - a fade is at least FADE_MIN long (it may run past the reach, into the
//     hidden far junction, never past the run);
//   - a newly visited junction pops in whole (web domain solid) and its arms
//     GROW from there to the reach (progress 0 -> 1);
//   - the run being walked shows behind the dot, fading just ahead of it.
// Distances are LATTICE units converted to ctrl per run through the run's
// lattice length (junctionBlend's convention), so they ride the material.
// Ctrls are the walk graph's: unwrapped along each run (ctrlB >= ctrlA, past
// the ring's count on a run that wraps), compared modulo the ring by
// pieceVis.

import type { WalkGraph } from "../core/walk_graph";

// The shortest fade a frontier gets (lattice units).
export const FADE_MIN = 0.35;

export interface ExplorePiece {
  chain: number;
  // Solid from c0 to c1 (unwrapped ctrls, c0 <= c1).
  c0: number;
  c1: number;
  // Fade lengths (ctrl) below c0 and above c1; 0 = a hard end.
  f0: number;
  f1: number;
  // That end is a FRONTIER (an unexplored continuation).
  tip0: boolean;
  tip1: boolean;
}

export interface ExploreFrontier {
  chain: number;
  edge: number;
  cSolid: number; // Where the fade starts (unwrapped ctrl).
  cEnd: number; // Where it reaches zero.
}

export interface ExploreInput {
  walk: WalkGraph;
  // Visited vertices -> their arms' growth progress in [0, 1].
  visited: ReadonlyMap<string, number>;
  // Walked runs (walk-edge ids): they show whole.
  explored: ReadonlySet<number>;
  // The run being walked (unexplored before this move), if any: the dot
  // left `from` and is at `cur` (unwrapped ctrls on that run).
  inflight: { edge: number; from: number; cur: number } | null;
  reach: number; // Lattice units.
  fade: number; // Lattice units.
  web: number; // A junction's web domain along each arm (lattice units).
}

export interface ExploreView {
  pieces: ExplorePiece[];
  frontiers: ExploreFrontier[];
}

export function exploreView(inp: ExploreInput): ExploreView {
  const pieces: ExplorePiece[] = [];
  const frontiers: ExploreFrontier[] = [];
  const reach = Math.max(0, inp.reach);
  const fade = Math.max(0, inp.fade);
  const isEnd = (id: string): boolean => inp.walk.vertices.get(id)?.isEnd ?? false;
  for (const e of inp.walk.edges) {
    const A = e.ctrlA;
    const B = e.ctrlB;
    const span = B - A;
    if (span <= 1e-9) continue;
    const L = Math.max(e.length, 1e-6);
    const k = span / L; // Ctrl per lattice unit.
    const whole = (): void => {
      pieces.push({ chain: e.chain, c0: A, c1: B, f0: 0, f1: 0, tip0: false, tip1: false });
    };
    if (inp.explored.has(e.id)) {
      whole();
      continue;
    }
    const fl = inp.inflight && inp.inflight.edge === e.id ? inp.inflight : null;
    // A junction end's web domain along this run (0 at an END vertex).
    const dom = (v: string): number => (isEnd(v) ? 0 : Math.min(inp.web, L / 2));
    // The reach out of a visited end: its web domain at once, the rest
    // growing in.
    const reachOf = (v: string): number => {
      const g = inp.visited.get(v);
      if (g === undefined) return 0;
      const d0 = dom(v);
      return d0 + Math.max(0, reach - d0) * Math.min(1, Math.max(0, g));
    };
    const rA = reachOf(e.va);
    const rB = reachOf(e.vb);
    if (rA > 0 && rB > 0 && rA + rB >= L) {
      whole();
      continue;
    }
    // A stub out of one visited end (+1: from A toward B; -1: from B).
    const stub = (dir: 1 | -1, r: number): void => {
      if (r <= 1e-6) return;
      const near = dir > 0 ? e.va : e.vb;
      const far = dir > 0 ? e.vb : e.va;
      if (r >= L && isEnd(far)) {
        whole();
        return;
      }
      const d0 = dom(near);
      let ext = Math.max(d0, Math.min(r, L));
      let fLen = Math.min(fade, ext - d0);
      if (fLen < FADE_MIN) {
        ext = Math.min(L, d0 + FADE_MIN);
        fLen = Math.max(0, ext - d0);
      }
      const solid = (ext - fLen) * k;
      // A stub whose run is being walked has no frontier: the dot is it.
      const tip = fl === null && fLen > 0;
      if (dir > 0) {
        pieces.push({ chain: e.chain, c0: A, c1: A + solid, f0: 0, f1: fLen * k, tip0: false, tip1: tip });
        if (tip) frontiers.push({ chain: e.chain, edge: e.id, cSolid: A + solid, cEnd: A + ext * k });
      } else {
        pieces.push({ chain: e.chain, c0: B - solid, c1: B, f0: fLen * k, f1: 0, tip0: tip, tip1: false });
        if (tip) frontiers.push({ chain: e.chain, edge: e.id, cSolid: B - solid, cEnd: B - ext * k });
      }
    };
    stub(1, rA);
    stub(-1, rB);
    if (fl) {
      // Walked so far, plus a short lead fade ahead of the dot.
      const lo = Math.max(A, Math.min(fl.from, fl.cur));
      const hi = Math.min(B, Math.max(fl.from, fl.cur));
      const lead = Math.max(FADE_MIN, Math.min(fade, L)) * k;
      const fwd = fl.cur >= fl.from;
      pieces.push({
        chain: e.chain,
        c0: lo,
        c1: hi,
        f0: fwd ? 0 : Math.min(lead, lo - A),
        f1: fwd ? Math.min(lead, B - hi) : 0,
        tip0: false,
        tip1: false,
      });
    }
  }
  return { pieces, frontiers };
}

// One piece's visibility at a chain ctrl (the shader's kExploreAt, per
// piece): 1 inside, smoothstep fades beyond, 0 elsewhere. `n` = the chain's
// ctrl count, `closed` = a ring (ctrls compare modulo n, unwrapped toward
// the piece's middle).
export function pieceVis(p: ExplorePiece, ctrl: number, n: number, closed: boolean): number {
  let x = ctrl;
  if (closed) {
    const mid = 0.5 * (p.c0 + p.c1);
    x += n * Math.floor((mid - x) / n + 0.5);
  }
  if (x < p.c0 - 1e-3) {
    if (p.f0 <= 1e-4) return 0;
    const t = Math.min(1, (p.c0 - x) / p.f0);
    return 1 - t * t * (3 - 2 * t);
  }
  if (x > p.c1 + 1e-3) {
    if (p.f1 <= 1e-4) return 0;
    const t = Math.min(1, (x - p.c1) / p.f1);
    return 1 - t * t * (3 - 2 * t);
  }
  return 1;
}

// A chain point's visibility: the most visible piece of that chain there
// (0 on a chain with no piece).
export function chainVis(
  pieces: readonly ExplorePiece[],
  chain: number,
  ctrl: number,
  n: number,
  closed: boolean
): number {
  let best = 0;
  for (const p of pieces) {
    if (p.chain !== chain) continue;
    const v = pieceVis(p, ctrl, n, closed);
    if (v > best) best = v;
  }
  return best;
}
