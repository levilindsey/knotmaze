// K138 TURNSTILE JUNCTIONS (brief docs/design/K138_s2.md; plan
// docs/design/K138_plan.md 4.12; design docs/design/K80_gameplay_additions.md
// 4.12). A turnstile is a three-arm junction that joins two of its arms at a
// time. Its arms A, B, C are its three runs in the walk vertex's order, and
// the OPEN PAIR turns one step per move, from a seeded phase per junction
// (call 2):
//   k = (phase0 + clock) % 3: 0 {A, B}, 1 {B, C}, 2 {C, A}
// THE CLOCK (call 1) is the kit's phase: the MOVES made, an advance or a
// backtrack alike (a slide is one move), in every mode, real time included
// (one link, one solution). Every turnstile turns together, wherever the
// head is. A tap is judged at the clock before it, every run of a slide at
// the same clock. A backtrack turns the clock on like any move (so a
// closed arm opens by stepping out and back, a bounce); Undo turns it back.
// THE RULE: leaving a turnstile by run Y after arriving by run X is allowed
// when Y is X (going back the way you came is always allowed) or {X, Y} is
// the open pair; with no arrival run (none at the start of a walk) any run
// of the open pair. Under ice a slide through a closed turnstile is refused
// whole (composeRules judges every run of a tap).
//
// PLACEMENT (placeTurnstiles): candidates are junctions with three distinct
// runs and no self-loop, never the start, the maze start, the exit or a
// title vertex, within NEAR_HOPS junction hops of the plain shortest route
// (on it: 0 hops). Each draw takes `count` of them from the "turnstiles"
// stream (fewer when fewer qualify) and a phase per junction; the kit's
// placeRule keeps the first draw that is solvable and bites (else the last
// solvable, else none). Count 0 places nothing and draws nothing.

import type { RuleWalk, WalkRule, Placement } from "./rule_search";
import { composeRules, meterLength, placeRule, plainRule, ruleRng, ruleSearch } from "./rule_search";

export const TURNSTILE_PERIOD = 3;
export const TURNSTILES_MAX = 8;
// How far from the plain route a turnstile may sit, in junction hops.
export const NEAR_HOPS = 2;

export type TurnstileWalk = RuleWalk & { titleVertices?: Set<string> };

export interface Turnstile {
  vertex: string;
  // A, B, C: the junction's runs in the walk vertex's order.
  arms: readonly [number, number, number];
  phase0: number;
}

export type TurnstileLayout = readonly Turnstile[];

// The open pair's index at clock `phase`: 0 {A, B}, 1 {B, C}, 2 {C, A}.
export function openIndex(t: Turnstile, phase: number): number {
  return (t.phase0 + phase) % TURNSTILE_PERIOD;
}

// The open pair's two runs at clock `phase`.
export function openPair(t: Turnstile, phase: number): [number, number] {
  const k = openIndex(t, phase);
  return [t.arms[k], t.arms[(k + 1) % 3]];
}

// The closed (third) arm at clock `phase`.
export function closedArm(t: Turnstile, phase: number): number {
  return t.arms[(openIndex(t, phase) + 2) % 3];
}

// K138 s4: every turnstile's closed arm at clock `phase`, as the run's end
// at the turnstile (0: va, 1: vb). The page dims those ends so the open
// pair's band reads (section_colors dimRunTable).
export function closedArmEnds(
  walk: RuleWalk,
  layout: TurnstileLayout,
  phase: number
): { run: number; end: 0 | 1 }[] {
  const out: { run: number; end: 0 | 1 }[] = [];
  for (const t of layout) {
    const run = closedArm(t, phase);
    const e = walk.edges[run];
    if (!e) continue;
    if (e.va === t.vertex) out.push({ run, end: 0 });
    if (e.vb === t.vertex) out.push({ run, end: 1 });
  }
  return out;
}

// May the head leave turnstile `t` by `run`, having arrived by `last` (-1:
// none), at clock `phase`?
export function turnstileAllows(t: Turnstile, run: number, last: number, phase: number): boolean {
  if (run === last) return true;
  const [a, b] = openPair(t, phase);
  if (last === t.arms[0] || last === t.arms[1] || last === t.arms[2]) {
    return (last === a && run === b) || (last === b && run === a);
  }
  return run === a || run === b;
}

// The turnstiles as a kit rule (one state; the clock is the kit's phase).
export function turnstileRule(walk: RuleWalk, layout: TurnstileLayout): WalkRule {
  const at = new Map<string, Turnstile>();
  for (const t of layout) at.set(t.vertex, t);
  return {
    states: 1,
    start: 0,
    period: TURNSTILE_PERIOD,
    step(from, run, state, last = -1, phase = 0) {
      const e = walk.edges[run];
      if (!e || (e.va !== from && e.vb !== from)) return null;
      const t = at.get(from);
      if (t && !turnstileAllows(t, run, last, phase)) return null;
      return { runs: [run], to: e.va === from ? e.vb : e.va, state, length: meterLength(walk, run) };
    },
  };
}

// Can a junction be a turnstile? Three distinct runs, none a self-loop, and
// not the start, the maze start, the exit or a title vertex.
export function turnstileArms(walk: TurnstileWalk, id: string): [number, number, number] | null {
  const v = walk.vertices.get(id);
  if (!v || v.isEnd || v.edges.length !== 3) return null;
  if (id === walk.start || id === walk.exit || id === walk.mazeStart) return null;
  if (walk.titleVertices?.has(id)) return null;
  const [a, b, c] = v.edges;
  if (a === b || b === c || a === c) return null;
  for (const r of v.edges) {
    const e = walk.edges[r];
    if (e.va === e.vb) return null;
  }
  return [a, b, c];
}

// The candidates, nearest the plain route first (ties in the walk's vertex
// order): junctions within NEAR_HOPS hops of it.
export function turnstileCandidates(walk: TurnstileWalk, base: WalkRule | null = null): string[] {
  const route = ruleSearch(walk, base ?? plainRule(walk)).routeRuns;
  const hops = new Map<string, number>();
  let frontier: string[] = [];
  let at = walk.start;
  hops.set(at, 0);
  frontier.push(at);
  for (const r of route) {
    const e = walk.edges[r];
    at = e.va === at ? e.vb : e.va;
    if (!hops.has(at)) {
      hops.set(at, 0);
      frontier.push(at);
    }
  }
  for (let h = 1; h <= NEAR_HOPS; h++) {
    const next: string[] = [];
    for (const v of frontier) {
      for (const r of walk.vertices.get(v)!.edges) {
        const e = walk.edges[r];
        const w = e.va === v ? e.vb : e.va;
        if (hops.has(w)) continue;
        hops.set(w, h);
        next.push(w);
      }
    }
    frontier = next;
  }
  const out: { id: string; h: number; i: number }[] = [];
  let i = 0;
  for (const id of walk.vertices.keys()) {
    const h = hops.get(id);
    if (h !== undefined && turnstileArms(walk, id)) out.push({ id, h, i });
    i++;
  }
  out.sort((p, q) => p.h - q.h || p.i - q.i);
  return out.map((c) => c.id);
}

// The turnstiles for this maze, count and seed (see the header). `base` is
// the rule already placed (ice and the color rule, composed), which the
// turnstiles must bite against and compose with.
export function placeTurnstiles(
  walk: TurnstileWalk,
  count: number,
  seed: number,
  base: WalkRule | null = null
): Placement<TurnstileLayout> {
  const n = Math.max(0, Math.min(TURNSTILES_MAX, Math.floor(count)));
  if (n === 0) return { layout: null, bites: false, draws: 0 };
  const pool = turnstileCandidates(walk, base);
  if (pool.length === 0) return { layout: null, bites: false, draws: 0 };
  const rng = ruleRng(seed, "turnstiles");
  const draw = (): TurnstileLayout => {
    const ids = pool.slice();
    const k = Math.min(n, ids.length);
    const out: Turnstile[] = [];
    for (let i = 0; i < k; i++) {
      const j = i + rng.nextInt(ids.length - i);
      const t = ids[i];
      ids[i] = ids[j];
      ids[j] = t;
      out.push({ vertex: ids[i], arms: turnstileArms(walk, ids[i])!, phase0: rng.nextInt(3) });
    }
    return out;
  };
  return placeRule(
    walk,
    draw,
    (layout) => (base ? composeRules(base, turnstileRule(walk, layout)) : turnstileRule(walk, layout)),
    base
  );
}
