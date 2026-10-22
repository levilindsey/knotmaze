// K138 LOCKS AND KEYS (brief docs/design/K138_s4.md item 2, from
// docs/design/K138_s3.md item 2; plan docs/design/K138_plan.md 4.1; design
// docs/design/K80_gameplay_additions.md 4.1). A LOCK is a run that refuses a
// tap until the keys it needs are held. A KEY is a bead at a junction, taken
// when the head arrives there (a slide over the ice takes every key it
// passes) and never used up.
//
// THE STATE (lockRule): a bit per key, the keys held, so the rule has
// 1 << keys states and the kit's search runs over (vertex, keys held): par,
// strict, the stars and the fewest moves read the keys (call 5: par is rated
// against the best legal route). In the game a backtrack retraces a whole
// move and gives back the state from before it (the controller's
// stateStack), so it drops a key that move took (call 4: Undo, a replay and
// a backtrack restore the keys held). The search never backtracks, so a key
// that can only be left the way it was entered is no use; placement skips
// the junctions that hang off the core.
//
// THE FORMS (lockMode; LOCK_MODES grows by appending, which needs no codec
// bump): exit, the runs into the exit are the lock and need every key.
// Shortcut and colors come later.
//
// PLACEMENT (placeLocks): the candidates are junctions (three runs or more)
// of the one-way core (`oneWayCore`: 2-edge-connected, so a key there can be
// left by another run), never the start, the exit or the maze's start,
// within KEY_RADIUS runs of the base route (the rules beneath's, else the
// plain one), whose DETOUR is 1 to KEY_DETOUR_MAX runs: the runs from the
// start to the junction and on to the lock's near end, less the runs from
// the start straight there (both over the walk without the locks). A draw
// samples `keys` of them (fewer when fewer qualify) without replacement from
// the "locks" stream, a candidate's tickets its detour, and the kit's
// placeRule keeps the first solvable draw that bites (else the last
// solvable). Keys 0, or no candidate, places nothing and draws nothing, so
// off is bit-identical.

import type { RuleWalk, WalkRule, Placement } from "./rule_search";
import { composeRules, meterLength, placeRule, plainRule, ruleRng, ruleSearch } from "./rule_search";
import { oneWayCore } from "./one_way";

export type LockMode = "exit";
export const LOCK_MODES: readonly LockMode[] = ["exit"];
export const KEYS_MAX = 3;
// Keys lie within this many runs of the base route...
export const KEY_RADIUS = 4;
// ...and cost a detour of at most this many runs.
export const KEY_DETOUR_MAX = 11;

export interface LockLayout {
  mode: LockMode;
  keys: readonly string[]; // key i's junction (bit 1 << i)
  locks: ReadonlyMap<number, number>; // lock run -> the key bits it needs
}

export function lockModeOf(v: unknown): LockMode {
  return LOCK_MODES.includes(v as LockMode) ? (v as LockMode) : "exit";
}

// Junction -> the key bits found there.
export function keyMasks(layout: LockLayout): Map<string, number> {
  const out = new Map<string, number>();
  layout.keys.forEach((v, i) => out.set(v, (out.get(v) ?? 0) | (1 << i)));
  return out;
}

// Does `run` let a player holding `held` through?
export function lockOpens(layout: LockLayout, run: number, held: number): boolean {
  const need = layout.locks.get(run) ?? 0;
  return (held & need) === need;
}

// The number of keys in a held mask.
export function keysIn(held: number): number {
  let n = 0;
  for (let h = held; h > 0; h &= h - 1) n++;
  return n;
}

export function lockRule(walk: RuleWalk, layout: LockLayout): WalkRule {
  const at = keyMasks(layout);
  return {
    states: 1 << layout.keys.length,
    start: at.get(walk.start) ?? 0,
    step(from, run, state) {
      const e = walk.edges[run];
      if (!e || (e.va !== from && e.vb !== from)) return null;
      if (!lockOpens(layout, run, state)) return null;
      const to = e.va === from ? e.vb : e.va;
      return { runs: [run], to, state: state | (at.get(to) ?? 0), length: meterLength(walk, run) };
    },
  };
}

// Runs from the nearest source to every vertex, never over `skip`.
function runDistances(walk: RuleWalk, sources: readonly string[], skip: ReadonlySet<number>): Map<string, number> {
  const d = new Map<string, number>();
  const q: string[] = [];
  for (const s of sources) {
    if (d.has(s)) continue;
    d.set(s, 0);
    q.push(s);
  }
  for (let qi = 0; qi < q.length; qi++) {
    const v = q[qi];
    const dv = d.get(v)!;
    for (const r of walk.vertices.get(v)?.edges ?? []) {
      if (skip.has(r)) continue;
      const e = walk.edges[r];
      if (!e) continue;
      const u = e.va === v ? e.vb : e.va;
      if (d.has(u)) continue;
      d.set(u, dv + 1);
      q.push(u);
    }
  }
  return d;
}

// The vertices of a route of runs from the walk's start, in order.
function routeVertices(walk: RuleWalk, routeRuns: readonly number[]): string[] {
  const out = [walk.start];
  let cur = walk.start;
  for (const r of routeRuns) {
    const e = walk.edges[r];
    if (!e) break;
    cur = e.va === cur ? e.vb : e.va;
    out.push(cur);
  }
  return out;
}

export interface KeyCandidate {
  vertex: string;
  detour: number;
}

// The exit form's lock runs (into the exit) and the key candidates (see the
// header), in vertex order.
export function lockCandidates(
  walk: RuleWalk,
  base: WalkRule | null = null
): { locks: number[]; candidates: KeyCandidate[] } {
  const locks = [...new Set(walk.vertices.get(walk.exit)?.edges ?? [])];
  const skip = new Set(locks);
  const gates = locks.map((r) => (walk.edges[r].va === walk.exit ? walk.edges[r].vb : walk.edges[r].va));
  const dS = runDistances(walk, [walk.start], skip);
  const dG = runDistances(walk, gates, skip);
  let straight = Infinity;
  for (const g of gates) straight = Math.min(straight, dS.get(g) ?? Infinity);
  const plain = ruleSearch(walk, base ?? plainRule(walk));
  const near = runDistances(walk, routeVertices(walk, plain.routeRuns), skip);
  const core = oneWayCore(walk, plain.routeRuns);
  const inCore = new Set<string>();
  for (const r of core.runs) {
    inCore.add(walk.edges[r].va);
    inCore.add(walk.edges[r].vb);
  }
  const barred = new Set([walk.start, walk.exit, walk.mazeStart ?? walk.start]);
  const candidates: KeyCandidate[] = [];
  if (!Number.isFinite(straight)) return { locks, candidates };
  for (const [v, info] of walk.vertices) {
    if (barred.has(v) || !inCore.has(v) || info.edges.length < 3) continue;
    const r = near.get(v);
    if (r === undefined || r > KEY_RADIUS) continue;
    const a = dS.get(v);
    const b = dG.get(v);
    if (a === undefined || b === undefined) continue;
    const detour = a + b - straight;
    if (detour >= 1 && detour <= KEY_DETOUR_MAX) candidates.push({ vertex: v, detour });
  }
  return { locks, candidates };
}

// Place the keys and the lock (see the header). `base` is the rules beneath
// (ice, the color rule, turnstiles, one-way runs); the layout's rule is
// composed onto it.
export function placeLocks(
  walk: RuleWalk,
  keys: number,
  mode: LockMode,
  seed: number,
  base: WalkRule | null = null
): Placement<LockLayout> {
  const k0 = Math.max(0, Math.min(KEYS_MAX, Math.floor(keys)));
  if (!(k0 > 0)) return { layout: null, bites: false, draws: 0 };
  const { locks, candidates: found } = lockCandidates(walk, base);
  if (locks.length === 0) return { layout: null, bites: false, draws: 0 };
  const ruleOf = (layout: LockLayout): WalkRule =>
    base ? composeRules(base, lockRule(walk, layout)) : lockRule(walk, layout);
  // The run distances ignore the rules beneath, and the color rule bars many
  // (junction, color) states: keep the junctions whose key alone still
  // leaves the maze solvable.
  const one = new Map<number, number>(locks.map((r) => [r, 1]));
  const candidates = found.filter(
    (c) => ruleSearch(walk, ruleOf({ mode, keys: [c.vertex], locks: one })).solvable
  );
  const count = Math.min(k0, candidates.length);
  if (count === 0) return { layout: null, bites: false, draws: 0 };
  const all = (1 << count) - 1;
  const lockMap = new Map<number, number>(locks.map((r) => [r, all]));
  const rng = ruleRng(seed, "locks");
  const draw = (): LockLayout => {
    const pool = candidates.slice();
    let total = 0;
    for (const c of pool) total += c.detour;
    const picked: string[] = [];
    for (let k = 0; k < count; k++) {
      let t = rng.nextInt(total);
      let j = 0;
      while (t >= pool[j].detour) {
        t -= pool[j].detour;
        j++;
      }
      picked.push(pool[j].vertex);
      total -= pool[j].detour;
      pool.splice(j, 1);
    }
    return { mode, keys: picked, locks: lockMap };
  };
  return placeRule(walk, draw, ruleOf, base);
}
