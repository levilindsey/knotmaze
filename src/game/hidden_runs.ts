// K138 HIDDEN RUNS (brief docs/design/K138_s2.md; plan
// docs/design/K138_plan.md 4.27; design docs/design/K80_gameplay_additions.md
// 4.27). A hidden run is invisible and cannot be tapped until it is
// REVEALED, for the rest of the solve, by a pluck on a thread of the same
// note within REVEAL_RUNS runs of it (call 3: a tap near it does nothing; a
// pluck is not a move). Hidden runs are shortcuts: the maze solves without
// them.
// - THE RULE: an unrevealed hidden run is refused (hiddenRule), so the
//   kit's searches from the head are exact for the reveals made so far.
// - REVEALS are the controller's actions ({kind: "reveal"}), outside the
//   rule state: a backtrack keeps them and Undo past one hides the run again
//   (call 4).
// - PAR (call 5): par, strict mode, the stars and the efficiency rate the
//   solve against the maze WITHOUT the hidden runs (none revealed); the HUD
//   also shows the shorter par WITH them (all revealed).
// - DISTANCE: runs that share a vertex are 1 apart (the hidden run itself
//   0), counted over every run, hidden ones included.
//
// PLACEMENT (placeHidden): each draw hides up to `count` runs one at a
// time from the "hiddenRuns" stream: a run of the current fewest-taps route
// (with the runs hidden so far refused) that is not exempt (rule_search.ts
// exemptRun), not icy and not a self-loop, whose hiding leaves the maze
// solvable; candidates in a seeded order, the first that leaves it solvable
// wins. The kit's placeRule keeps the first draw that is solvable and bites
// (else the last solvable, else none). Count 0 places nothing and draws
// nothing.

import type { RuleWalk, WalkRule, Placement } from "./rule_search";
import { composeRules, exemptRun, meterLength, placeRule, ruleRng, ruleSearch } from "./rule_search";

export const HIDDEN_MAX = 4;
export const REVEAL_RUNS = 3;

export type HiddenLayout = readonly number[];

// The hidden runs as a kit rule: an unrevealed hidden run is refused.
export function hiddenRule(
  walk: RuleWalk,
  hidden: readonly number[],
  revealed: ReadonlySet<number> = new Set()
): WalkRule {
  const off = new Set<number>();
  for (const r of hidden) if (!revealed.has(r)) off.add(r);
  return {
    states: 1,
    start: 0,
    step(from, run, state) {
      const e = walk.edges[run];
      if (!e || (e.va !== from && e.vb !== from)) return null;
      if (off.has(run)) return null;
      return { runs: [run], to: e.va === from ? e.vb : e.va, state, length: meterLength(walk, run) };
    },
  };
}

// The rule for a layout and a set of reveals, over `base` (ice, the color
// rule and the turnstiles, composed) when there is one.
export function hiddenOver(
  walk: RuleWalk,
  base: WalkRule | null,
  hidden: readonly number[],
  revealed?: ReadonlySet<number>
): WalkRule {
  const h = hiddenRule(walk, hidden, revealed);
  return base ? composeRules(base, h) : h;
}

// Run distances from `run` (0) out to `max`: runs sharing a vertex are 1
// apart.
export function runsNear(walk: RuleWalk, run: number, max = REVEAL_RUNS): Map<number, number> {
  const dist = new Map<number, number>([[run, 0]]);
  let frontier = [run];
  for (let d = 1; d <= max && frontier.length > 0; d++) {
    const next: number[] = [];
    for (const r of frontier) {
      const e = walk.edges[r];
      for (const v of e.va === e.vb ? [e.va] : [e.va, e.vb]) {
        for (const s of walk.vertices.get(v)!.edges) {
          if (dist.has(s)) continue;
          dist.set(s, d);
          next.push(s);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

// The hidden runs a pluck on run `plucked` reveals: unrevealed, of the same
// note, within REVEAL_RUNS runs of it. `noteOf` is the run's note (the
// audio map's frequency); null: no note known (nothing is revealed).
export function revealedBy(
  walk: RuleWalk,
  hidden: readonly number[],
  revealed: ReadonlySet<number>,
  plucked: number,
  noteOf: (run: number) => number | null
): number[] {
  if (plucked < 0 || !walk.edges[plucked]) return [];
  const note = noteOf(plucked);
  if (note === null) return [];
  const near = runsNear(walk, plucked);
  const out: number[] = [];
  for (const h of hidden) {
    if (revealed.has(h) || h === plucked) continue;
    if (!near.has(h)) continue;
    if (noteOf(h) !== note) continue;
    out.push(h);
  }
  return out;
}

// The walk run holding chain ctrl `ctrl` (-1: none). A closed chain's run
// may carry an unwrapped ctrlB past the chain's length `chainLen`.
export function runAtCtrl(
  walk: RuleWalk,
  chain: number,
  ctrl: number,
  chainLen = Infinity
): number {
  let best = -1;
  for (const e of walk.edges) {
    if (e.chain !== chain) continue;
    if ((ctrl >= e.ctrlA && ctrl <= e.ctrlB) || (ctrl + chainLen >= e.ctrlA && ctrl + chainLen <= e.ctrlB)) {
      best = e.id;
      break;
    }
  }
  return best;
}

// The hidden runs for this maze, count and seed (see the header). `base` is
// the rule already placed; `skip` marks runs that may not hide (icy runs).
export function placeHidden(
  walk: RuleWalk,
  count: number,
  seed: number,
  base: WalkRule | null = null,
  skip: (run: number) => boolean = () => false
): Placement<HiddenLayout> {
  const n = Math.max(0, Math.min(HIDDEN_MAX, Math.floor(count)));
  if (n === 0) return { layout: null, bites: false, draws: 0 };
  const rng = ruleRng(seed, "hiddenRuns");
  const ok = (r: number): boolean => {
    const e = walk.edges[r];
    return e.va !== e.vb && !exemptRun(walk, r) && !skip(r);
  };
  const draw = (): HiddenLayout => {
    const hidden: number[] = [];
    for (let i = 0; i < n; i++) {
      const route = ruleSearch(walk, hiddenOver(walk, base, hidden)).routeRuns;
      const cands = [...new Set(route)].filter((r) => ok(r) && !hidden.includes(r));
      for (let j = cands.length - 1; j > 0; j--) {
        const k = rng.nextInt(j + 1);
        const t = cands[j];
        cands[j] = cands[k];
        cands[k] = t;
      }
      let took = false;
      for (const c of cands) {
        if (ruleSearch(walk, hiddenOver(walk, base, [...hidden, c])).solvable) {
          hidden.push(c);
          took = true;
          break;
        }
      }
      if (!took) break;
    }
    return hidden;
  };
  return placeRule(walk, draw, (layout) => hiddenOver(walk, base, layout), base);
}
