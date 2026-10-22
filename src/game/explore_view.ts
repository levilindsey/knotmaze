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
//   - the run being walked shows behind the dot, fading just ahead of it;
//   - a CAUGHT move's run (stage 2c, Levi's question 3) shows from where
//     the dot left up to where it was caught, a frontier fade beyond;
//   - the INTRO'S CLOSE-IN (stage 2c, `hold`): at 1 every run shows whole,
//     and as it falls to 0 what shows contracts onto the plain view, each
//     run covered up to `R - d` from either end (`d` = that end's walk
//     distance from the visited set, R = hold x the radius that covers
//     everything), its own fade and no frontier.
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
  // Caught moves' runs (stage 2c): the dot left `from` and was caught at
  // `cur` (unwrapped ctrls on that run, as `inflight`'s).
  partial?: readonly { edge: number; from: number; cur: number }[];
  // The intro's close-in (stage 2c): 1 = every run whole, 0 = the plain
  // view; `holdDist` = each vertex's walk distance from the visited set
  // (exploreDistances). Without holdDist the close-in is off.
  hold?: number;
  holdDist?: ReadonlyMap<string, number>;
  // K466 THE ENDS: stretches a frontier's fade must stay out of (where its
  // thread passes under a crossing). Without it, the plain placement.
  keepOut?: ExploreKeepOut;
}

// K466: where a frontier's fade may not lie, and which way it moves.
// `spans(chain)` = flat [c0, c1, c0, c1, ...] unwrapped chain ctrls (c0 <=
// c1; a ring's span may run below 0 or past its count), `ring(chain)` = the
// chain's ring count (0 = open). "past" pushes the fade beyond the stretch
// (more thread shows), "back" pulls it in before (less); each falls back to
// the other, then to the plain placement.
export interface ExploreKeepOut {
  spans(chain: number): readonly number[] | undefined;
  ring(chain: number): number;
  mode: "past" | "back";
}

// K466: a fade [e - f, e] pushed past every span it overlaps (flat [u0, u1,
// ...] in the stub's frame), NaN once its end passes `limit` or it would
// need more than `steps` pushes.
export function endPushPast(sp: readonly number[], e: number, f: number, limit: number, steps = 32): number {
  let x = e;
  for (let it = 0; it <= steps; it++) {
    let hit = -Infinity;
    for (let i = 0; i + 1 < sp.length; i += 2) {
      if (sp[i + 1] > x - f && sp[i] < x && sp[i + 1] > hit) hit = sp[i + 1];
    }
    if (hit === -Infinity) return x;
    if (it === steps) return Number.NaN;
    x = hit + f;
    if (x > limit + 1e-9) return Number.NaN;
  }
  return Number.NaN;
}

// K466: the same fade pulled back before every span it overlaps, NaN once
// its start passes below `floor` or it would need more than `steps` pulls.
export function endPullBack(sp: readonly number[], e: number, f: number, floor: number, steps = 32): number {
  let x = e;
  for (let it = 0; it <= steps; it++) {
    let hit = Infinity;
    for (let i = 0; i + 1 < sp.length; i += 2) {
      if (sp[i + 1] > x - f && sp[i] < x && sp[i] < hit) hit = sp[i];
    }
    if (hit === Infinity) return x;
    if (it === steps) return Number.NaN;
    x = hit;
    if (x - f < floor - 1e-9) return Number.NaN;
  }
  return Number.NaN;
}

// K466: a stub's end moves past (or back before) ONE crossing at most. The
// sheet's first run chained pushes past up to three under-crossings (the
// fade plus the casing and pads fill most of the room between two of
// them), showing up to 3.9 lattice units of unexplored thread.
export const END_MOVE_STEPS = 1;

export interface ExploreView {
  pieces: ExplorePiece[];
  frontiers: ExploreFrontier[];
}

// Walk distances from a set of vertices (a multi-source Dijkstra by run
// length; the walk graph is small). A vertex no source reaches gets the
// largest finite distance, so a close-in still covers it last.
export function exploreDistances(walk: WalkGraph, sources: Iterable<string>): Map<string, number> {
  const dist = new Map<string, number>();
  for (const id of walk.vertices.keys()) dist.set(id, Infinity);
  for (const id of sources) if (dist.has(id)) dist.set(id, 0);
  const done = new Set<string>();
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
      const e = walk.edges[eid];
      const other = e.va === cur ? e.vb : e.va;
      const nd = curD + e.length;
      if (nd < dist.get(other)!) dist.set(other, nd);
    }
  }
  let far = 0;
  for (const d of dist.values()) if (d !== Infinity && d > far) far = d;
  for (const [id, d] of dist) if (d === Infinity) dist.set(id, far);
  return dist;
}

// The close-in radius that covers every run whole (hold 1).
export function exploreHoldRadius(walk: WalkGraph, dist: ReadonlyMap<string, number>): number {
  let r = 0;
  for (const e of walk.edges) {
    const v = 0.5 * ((dist.get(e.va) ?? 0) + (dist.get(e.vb) ?? 0) + e.length);
    if (v > r) r = v;
  }
  return r;
}

export function exploreView(inp: ExploreInput): ExploreView {
  const pieces: ExplorePiece[] = [];
  const frontiers: ExploreFrontier[] = [];
  const reach = Math.max(0, inp.reach);
  const fade = Math.max(0, inp.fade);
  const isEnd = (id: string): boolean => inp.walk.vertices.get(id)?.isEnd ?? false;
  const hold = Math.max(0, Math.min(1, inp.hold ?? 0));
  const hd = inp.holdDist;
  const R = hd && hold > 0 ? hold * exploreHoldRadius(inp.walk, hd) : 0;
  const caught = new Map<number, { from: number; cur: number }[]>();
  for (const pt of inp.partial ?? []) {
    const l = caught.get(pt.edge);
    if (l) l.push(pt);
    else caught.set(pt.edge, [pt]);
  }
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
    // The close-in's cover from each end (lattice units; <= 0 = none).
    let kA = 0;
    let kB = 0;
    if (R > 0 && hd) {
      kA = R - (hd.get(e.va) ?? 0);
      kB = R - (hd.get(e.vb) ?? 0);
      if (kA + kB >= L - 1e-9 || kA >= L || kB >= L) {
        whole();
        continue;
      }
    }
    // A caught move's extent from each end (lattice units; 0 = none).
    let pA = 0;
    let pB = 0;
    for (const pt of caught.get(e.id) ?? []) {
      if (Math.abs(pt.from - A) <= Math.abs(pt.from - B)) pA = Math.max(pA, (pt.cur - A) / k);
      else pB = Math.max(pB, (B - pt.cur) / k);
    }
    const lead = Math.max(FADE_MIN, Math.min(fade, L));
    // K466: this run's keep-out stretches in lattice units from A (every
    // ring lap that overlaps the run), built on first use.
    let outA: number[] | null = null;
    const keepOutA = (): number[] => {
      if (outA) return outA;
      outA = [];
      const ko = inp.keepOut;
      const sp = ko ? ko.spans(e.chain) : undefined;
      if (!ko || !sp) return outA;
      const n = ko.ring(e.chain);
      for (let i = 0; i + 1 < sp.length; i += 2) {
        const m0 = n > 0 ? Math.floor((A - sp[i + 1]) / n) : 0;
        const m1 = n > 0 ? Math.ceil((B - sp[i]) / n) : 0;
        for (let m = m0; m <= m1; m++) {
          const c0 = sp[i] + m * n;
          const c1 = sp[i + 1] + m * n;
          if (c1 > A && c0 < B) outA.push((c0 - A) / k, (c1 - A) / k);
        }
      }
      return outA;
    };
    // A stub's plain end (lattice units from its near end) at reach `r`.
    const plain = (r: number, d0: number): [number, number] => {
      let ext = Math.max(d0, Math.min(r, L));
      let fLen = Math.min(fade, ext - d0);
      if (fLen < FADE_MIN) {
        ext = Math.min(L, d0 + FADE_MIN);
        fLen = Math.max(0, ext - d0);
      }
      return [ext, fLen];
    };
    // A stub out of one visited end (+1: from A toward B; -1: from B),
    // reaching `r`, extended to a caught move's dot at `p`.
    const stub = (dir: 1 | -1, r: number, p: number): void => {
      if (r <= 1e-6 && p <= 1e-6) return;
      const near = dir > 0 ? e.va : e.vb;
      const far = dir > 0 ? e.vb : e.va;
      if (r >= L && isEnd(far)) {
        whole();
        return;
      }
      const d0 = dom(near);
      let [ext, fLen] = plain(r, d0);
      if (inp.keepOut && p <= 1e-6 && fLen > 0) {
        // K466: where the fully grown stub's fade would lie, moved out of
        // every keep-out stretch; the move scales with the growth, so a
        // growing arm reaches the moved end continuously.
        const dF = dom(far);
        const rFull = d0 + Math.max(0, reach - d0);
        const [eF, fF] = plain(rFull, d0);
        const sA = keepOutA();
        const sp: number[] = [];
        for (let i = 0; i + 1 < sA.length; i += 2) {
          if (dir > 0) sp.push(sA[i], sA[i + 1]);
          else sp.push(L - sA[i + 1], L - sA[i]);
        }
        if (sp.length && fF > 0) {
          // A visited far end's fully grown stub keeps the other half of
          // the gap between the two plain tips; else the far junction's
          // web domain is the limit.
          let limit = L - dF;
          let meets = false;
          if (inp.visited.has(far)) {
            const rFar = dF + Math.max(0, reach - dF);
            meets = rFull + rFar >= L; // Grown, the run shows whole.
            const [eFar] = plain(rFar, dF);
            limit = Math.min(limit, 0.5 * (eF + L - eFar));
          }
          const past = (): number => endPushPast(sp, eF, fF, limit, END_MOVE_STEPS);
          const back = (): number => endPullBack(sp, eF, fF, d0, END_MOVE_STEPS);
          let to = meets ? Number.NaN : inp.keepOut.mode === "back" ? back() : past();
          if (Number.isNaN(to) && !meets) to = inp.keepOut.mode === "back" ? past() : back();
          if (!Number.isNaN(to) && to !== eF) {
            const gp = rFull - d0 > 1e-9 ? Math.max(0, Math.min(1, (r - d0) / (rFull - d0))) : 1;
            ext = Math.max(d0 + fLen, Math.min(L, ext + (to - eF) * gp));
          }
        }
      }
      if (p > ext - fLen) {
        // Seen up to where the dot was caught, a lead fade beyond.
        const s0 = Math.min(p, L);
        ext = Math.min(L, s0 + lead);
        fLen = ext - s0;
      }
      const solid = (ext - fLen) * k;
      // A stub whose run is being walked has no frontier: the dot is it;
      // nor one the close-in covers (the near end's cover past its end, or
      // the far end's past its fade's start).
      const kNear = dir > 0 ? kA : kB;
      const kFar = dir > 0 ? kB : kA;
      const covered = kNear >= ext || kFar >= L - ext + fLen;
      const tip = fl === null && fLen > 0 && !covered;
      if (dir > 0) {
        pieces.push({ chain: e.chain, c0: A, c1: A + solid, f0: 0, f1: fLen * k, tip0: false, tip1: tip });
        if (tip) frontiers.push({ chain: e.chain, edge: e.id, cSolid: A + solid, cEnd: A + ext * k });
      } else {
        pieces.push({ chain: e.chain, c0: B - solid, c1: B, f0: fLen * k, f1: 0, tip0: tip, tip1: false });
        if (tip) frontiers.push({ chain: e.chain, edge: e.id, cSolid: B - solid, cEnd: B - ext * k });
      }
    };
    stub(1, rA, pA);
    stub(-1, rB, pB);
    // The close-in's own stubs: no frontier (the cover is passing through).
    const close = (dir: 1 | -1, c: number): void => {
      if (c <= 1e-6) return;
      const d0 = dom(dir > 0 ? e.va : e.vb);
      let ext = Math.max(d0, Math.min(c, L));
      let fLen = Math.min(fade, ext - d0);
      if (fLen < FADE_MIN) {
        ext = Math.min(L, d0 + FADE_MIN);
        fLen = Math.max(0, ext - d0);
      }
      const solid = (ext - fLen) * k;
      if (dir > 0) {
        pieces.push({ chain: e.chain, c0: A, c1: A + solid, f0: 0, f1: fLen * k, tip0: false, tip1: false });
      } else {
        pieces.push({ chain: e.chain, c0: B - solid, c1: B, f0: fLen * k, f1: 0, tip0: false, tip1: false });
      }
    };
    close(1, kA);
    close(-1, kB);
    if (fl) {
      // Walked so far, plus a short lead fade ahead of the dot.
      const lo = Math.max(A, Math.min(fl.from, fl.cur));
      const hi = Math.min(B, Math.max(fl.from, fl.cur));
      const fwd = fl.cur >= fl.from;
      pieces.push({
        chain: e.chain,
        c0: lo,
        c1: hi,
        f0: fwd ? 0 : Math.min(lead * k, lo - A),
        f1: fwd ? Math.min(lead * k, B - hi) : 0,
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

// K290 (burn stage 3a): a burnt stretch of a chain, in the walk graph's
// unwrapped ctrls (b0 <= b1).
export interface BurntSpan {
  chain: number;
  b0: number;
  b1: number;
}

// A cut that leaves less than this (ctrl) leaves nothing; a fade shorter
// than this is a hard end.
const CUT_EPS = 1e-4;

// One piece minus [b0, b1] (one unwrapped copy of a burnt span), its
// remnants pushed to `out`. A remnant keeps the piece's far end (its fade
// and frontier flag). A cut through the solid part is a HARD end (fade 0,
// no frontier: the fire's front is there). A cut through a fade shortens
// that fade to end at the cut, so the thread never shows more than the
// piece did; the fade tail beyond a cut (below full visibility all along)
// goes.
function cutPiece(p: ExplorePiece, b0: number, b1: number, out: ExplorePiece[]): void {
  const lo = p.c0 - p.f0;
  const hi = p.c1 + p.f1;
  if (b1 <= lo || b0 >= hi) {
    out.push(p);
    return;
  }
  // What lies below the cut.
  if (b0 > lo) {
    if (b0 > p.c1) {
      const f1 = b0 - p.c1;
      out.push({ ...p, f1: f1 > CUT_EPS ? f1 : 0, tip1: false });
    } else if (b0 >= p.c0) {
      if (b0 - p.c0 > CUT_EPS || p.f0 > CUT_EPS) {
        out.push({ ...p, c1: b0, f1: 0, tip1: false });
      }
    }
  }
  // What lies above it.
  if (b1 < hi) {
    if (b1 < p.c0) {
      const f0 = p.c0 - b1;
      out.push({ ...p, f0: f0 > CUT_EPS ? f0 : 0, tip0: false });
    } else if (b1 <= p.c1) {
      if (p.c1 - b1 > CUT_EPS || p.f1 > CUT_EPS) {
        out.push({ ...p, c0: b1, f0: 0, tip0: false });
      }
    }
  }
}

// K796: whether chain point `ctrl` (any unwrapped copy) lies in a burnt
// span — the yarn's per-station burn test (the string burns away with the
// thread under it). Ring copies -2n..+2n, as subtractBurnt cuts.
export function burntAt(
  spans: readonly BurntSpan[] | null,
  chain: number,
  ctrl: number,
  ringN: (chain: number) => number
): boolean {
  if (!spans) return false;
  const n = ringN(chain);
  for (const s of spans) {
    if (s.chain !== chain || !(s.b1 > s.b0)) continue;
    if (n <= 0) {
      if (ctrl >= s.b0 && ctrl < s.b1) return true;
      continue;
    }
    const m = ((ctrl % n) + n) % n;
    for (let k = -2; k <= 2; k++) {
      if (m + k * n >= s.b0 && m + k * n < s.b1) return true;
      if (ctrl + k * n >= s.b0 && ctrl + k * n < s.b1) return true;
    }
  }
  return false;
}

// K290: the pieces with every burnt span cut out (burnt thread is not
// drawn: the `burnt` param's "gone"). `ringN(chain)` = the chain's ctrl
// count for a ring, 0 for an open chain; a ring's span is cut at each
// unwrapped copy that can meet a piece (pieces and spans both lie in
// [0, 2n), so copies -2n..+2n cover every meeting, fades included).
// Pieces of chains without a span pass through unchanged (the same
// objects), so nothing burnt returns the pieces as they were.
export function subtractBurnt(
  pieces: readonly ExplorePiece[],
  spans: readonly BurntSpan[],
  ringN: (chain: number) => number
): ExplorePiece[] {
  const byChain = new Map<number, BurntSpan[]>();
  for (const s of spans) {
    if (!(s.b1 > s.b0)) continue;
    let l = byChain.get(s.chain);
    if (!l) byChain.set(s.chain, (l = []));
    l.push(s);
  }
  const out: ExplorePiece[] = [];
  for (const p of pieces) {
    const ss = byChain.get(p.chain);
    if (!ss || p.c1 < p.c0) {
      out.push(p);
      continue;
    }
    const n = ringN(p.chain);
    const k0 = n > 0 ? -2 : 0;
    const k1 = n > 0 ? 2 : 0;
    let cur: ExplorePiece[] = [p];
    for (const s of ss) {
      for (let k = k0; k <= k1; k++) {
        const next: ExplorePiece[] = [];
        for (const q of cur) cutPiece(q, s.b0 + k * n, s.b1 + k * n, next);
        cur = next;
      }
    }
    for (const q of cur) out.push(q);
  }
  return out;
}

// K290: the burn's part of a visibility declaration (ribbon_renderer
// setExplore). `gate`: the thread reveal's own pieces (null with the reveal
// off), which alone decide which junctions hide (a burnt arm only drops its
// lobe from the web); `char`: the burnt stretches the char look darkens
// (null under "gone", whose pieces lack them instead).
export interface ExploreBurn {
  gate: ExplorePiece[] | null;
  char: BurntSpan[] | null;
  // K290 stage 3b: the fire's fronts (char band and ember, or the lit
  // fuse's ember) and the smoldering arms' stretches; null or absent = none.
  fronts?: BurnFront[] | null;
  smolder?: BurntSpan[] | null;
}

// K290 stage 3b: a fire front on a chain. `c` = its unwrapped chain ctrl,
// `dir` = +-1, the ctrl direction of the unburnt side; kind 0 = burning (the
// char band ahead and the ember), 1 = the lit fuse (the ember only).
export interface BurnFront {
  chain: number;
  c: number;
  dir: number;
  kind: number;
}

// K290: every chain whole, as pieces (the burn's visibility with the
// reveal off): a ring [0, n], an open chain [0, n - 1], hard ends.
export function wholePieces(chains: readonly { n: number; closed: boolean }[]): ExplorePiece[] {
  const out: ExplorePiece[] = [];
  for (let c = 0; c < chains.length; c++) {
    const { n, closed } = chains[c];
    if (n < 2) continue;
    out.push({ chain: c, c0: 0, c1: closed ? n : n - 1, f0: 0, f1: 0, tip0: false, tip1: false });
  }
  return out;
}
