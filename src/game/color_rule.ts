// K138 THE COLOR RULE (brief docs/design/K138_s1.md section 3; design
// docs/design/K80_gameplay_additions.md 4.18). Every core run wears a
// color, and the runs you walk must follow the rule:
// - alternate: two shades (0 light, 1 dark); never two of one shade in a
//   row;
// - cycle: three colors walked in order 0, 1, 2, 0, ...; the first run may
//   be any color.
// The state is the last color walked plus one (0: none yet). Runs with no
// color (-1: the exempt runs, rule_search.ts exemptRun, and icy runs) pass
// and keep the state. A backtrack is always allowed and restores the state
// from before the move it undoes (FabricMazeController's stateStack); the
// kit's search never needs it.
//
// PLACEMENT (placeColors): each draw colors every colored run from the
// "colorRule" stream, then plants one legal route: a seeded DETOUR from the
// start through a random junction W to the exit (a randomized BFS to W,
// then one to the exit that avoids the first leg's vertices; 8 tries, else
// a randomized BFS straight to the exit), whose colored runs are recolored
// in walk order to obey the rule. Without ice every draw is then solvable;
// under ice the composed search decides (a slide can carry the walk off the
// detour), and the kit's placeRule redraws.

import type { SeededRNG } from "../util/random";
import type { RuleWalk, WalkRule, Placement } from "./rule_search";
import { composeRules, meterLength, placeRule, ruleRng } from "./rule_search";
import { coreRuns, iceRule } from "./ice";

export type ColorRuleMode = "off" | "alternate" | "cycle";
export const COLOR_RULE_MODES: readonly ColorRuleMode[] = ["off", "alternate", "cycle"];

export type ColorWalk = RuleWalk & { titleVertices?: Set<string> };

export const DETOUR_TRIES = 8;

// The colors a mode uses (0: off).
export function colorCount(mode: ColorRuleMode): number {
  return mode === "cycle" ? 3 : mode === "alternate" ? 2 : 0;
}

// May a run of color `c` be walked in `state`?
export function colorAllowed(mode: ColorRuleMode, state: number, c: number): boolean {
  if (state === 0 || c < 0) return true;
  if (mode === "cycle") return c === state % 3;
  if (mode === "alternate") return c !== state - 1;
  return true;
}

// The color the next run must have under cycle (-1: any), or the shade it
// must not have under alternate (-1: none).
export function nextColor(mode: ColorRuleMode, state: number): number {
  if (state === 0) return -1;
  return mode === "cycle" ? state % 3 : state - 1;
}

// The color rule as a kit rule.
export function colorRule(walk: RuleWalk, mode: ColorRuleMode, colors: Int8Array): WalkRule {
  return {
    states: colorCount(mode) + 1,
    start: 0,
    step(from, run, state) {
      const e = walk.edges[run];
      if (!e || (e.va !== from && e.vb !== from)) return null;
      const c = colors[run];
      let next = state;
      if (c >= 0) {
        if (!colorAllowed(mode, state, c)) return null;
        next = c + 1;
      }
      return { runs: [run], to: e.va === from ? e.vb : e.va, state: next, length: meterLength(walk, run) };
    },
  };
}

// A breadth-first route from `a` to `b` over runs in a seeded order,
// through no vertex of `avoid` (`b` may be in it). null: none.
function randomRoute(
  walk: RuleWalk,
  rng: SeededRNG,
  a: string,
  b: string,
  avoid: Set<string>
): number[] | null {
  if (a === b) return [];
  const via = new Map<string, number>([[a, -1]]);
  const queue = [a];
  for (let qi = 0; qi < queue.length; qi++) {
    const v = queue[qi];
    const runs = walk.vertices.get(v)!.edges.slice();
    for (let i = runs.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      const t = runs[i];
      runs[i] = runs[j];
      runs[j] = t;
    }
    for (const run of runs) {
      const e = walk.edges[run];
      const w = e.va === v ? e.vb : e.va;
      if (via.has(w) || (avoid.has(w) && w !== b)) continue;
      via.set(w, run);
      if (w === b) {
        const out: number[] = [];
        for (let x = b; x !== a; ) {
          const r = via.get(x)!;
          out.push(r);
          const re = walk.edges[r];
          x = re.va === x ? re.vb : re.va;
        }
        return out.reverse();
      }
      queue.push(w);
    }
  }
  return null;
}

// The vertices a route from `a` visits, `a` included.
function routeVertices(walk: RuleWalk, a: string, route: number[]): Set<string> {
  const out = new Set<string>([a]);
  let at = a;
  for (const r of route) {
    const e = walk.edges[r];
    at = e.va === at ? e.vb : e.va;
    out.add(at);
  }
  return out;
}

// The planted detour (see the header).
export function plantRoute(walk: ColorWalk, rng: SeededRNG): number[] | null {
  const pool: string[] = [];
  for (const [id, v] of walk.vertices) {
    if (v.isEnd || id === walk.start || id === walk.exit || id === walk.mazeStart) continue;
    if (walk.titleVertices?.has(id)) continue;
    pool.push(id);
  }
  for (let t = 0; t < DETOUR_TRIES && pool.length > 0; t++) {
    const w = pool[rng.nextInt(pool.length)];
    const leg1 = randomRoute(walk, rng, walk.start, w, new Set());
    if (!leg1) continue;
    const seen = routeVertices(walk, walk.start, leg1);
    seen.delete(w);
    const leg2 = randomRoute(walk, rng, w, walk.exit, seen);
    if (leg2) return [...leg1, ...leg2];
  }
  return randomRoute(walk, rng, walk.start, walk.exit, new Set());
}

// Recolor a route's colored runs, in walk order, to obey the rule.
export function obeyAlong(mode: ColorRuleMode, colors: Int8Array, route: number[]): void {
  let state = 0;
  for (const r of route) {
    const c = colors[r];
    if (c < 0) continue;
    if (state > 0 && !colorAllowed(mode, state, c)) {
      colors[r] = mode === "cycle" ? state % 3 : 1 - c;
    }
    state = colors[r] + 1;
  }
}

// The colors for this maze, mode and seed (see the header). `ice` is the
// icy layout already placed (its runs stay colorless) and the walker map's
// continuation table.
export function placeColors(
  walk: ColorWalk,
  mode: ColorRuleMode,
  seed: number,
  ice?: { cont: Int32Array; icy: Uint8Array } | null
): Placement<Int8Array> {
  const k = colorCount(mode);
  if (k === 0) return { layout: null, bites: false, draws: 0 };
  const rng = ruleRng(seed, "colorRule");
  const core = coreRuns(walk).filter((r) => !ice || ice.icy[r] === 0);
  const draw = (): Int8Array => {
    const colors = new Int8Array(walk.edges.length).fill(-1);
    for (const r of core) colors[r] = rng.nextInt(k);
    const route = plantRoute(walk, rng);
    if (route) obeyAlong(mode, colors, route);
    return colors;
  };
  return placeRule(walk, draw, (colors) =>
    ice
      ? composeRules(iceRule(walk, ice.cont, ice.icy), colorRule(walk, mode, colors))
      : colorRule(walk, mode, colors)
  );
}
