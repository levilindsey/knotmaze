// K138 ICE RUNS (brief docs/design/K138_s1.md section 2; design
// docs/design/K80_gameplay_additions.md 4.19): a tap on an icy run walks
// it, then carries on STRAIGHT through its far junction, along the same
// strand, into the next run, and keeps going while the runs are icy. The
// slide stops at the far end of the first run that is not icy, and also
// where the strand does not go on (the walker map's `cont` is -1), at an
// END, at the exit, and before a run this slide has already walked, so no
// slide loops. "Straight on" is the strand's continuation (game/walker.ts
// `cont`, topological: chain and control index), so it is engine-exact;
// there is no heading test.
//
// A tap from v on run r is the directed run d = 2 r when e.va === v (a
// self-loop too), else 2 r + 1; the run end at the arrival is d ^ 1, so
// the slide's next directed run is cont[d ^ 1].
//
// PLACEMENT (placeIce): k = round(share x core) of the core runs (every run
// but the exempt ones, rule_search.ts exemptRun) by a partial Fisher-Yates
// from the "ice" stream, redrawn by the kit's placeRule.

import type { RuleWalk, WalkRule, Placement } from "./rule_search";
import { exemptRun, meterLength, placeRule, ruleRng } from "./rule_search";

export const ICE_SHARE_MAX = 0.5;
// Call 2: the share a panel switch-on picks (the param's own default is 0).
export const ICE_SHARE_ON = 0.25;

export interface IceSlide {
  runs: number[];
  to: string;
  length: number;
}

// The slide a tap on `run` from `from` makes (null: the run is not at
// `from`).
export function slide(
  walk: RuleWalk,
  cont: Int32Array,
  icy: Uint8Array,
  from: string,
  run: number
): IceSlide | null {
  const e = walk.edges[run];
  if (!e || (e.va !== from && e.vb !== from)) return null;
  let d = e.va === from ? 2 * run : 2 * run + 1;
  let at = (d & 1) === 0 ? e.vb : e.va;
  const runs = [run];
  let length = meterLength(walk, run);
  while (icy[d >> 1] === 1) {
    if (at === walk.exit) break;
    const v = walk.vertices.get(at);
    if (!v || v.isEnd) break;
    const next = cont[d ^ 1];
    if (next < 0) break;
    const nr = next >> 1;
    if (runs.includes(nr)) break;
    const ne = walk.edges[nr];
    if (!ne) break;
    runs.push(nr);
    length += meterLength(walk, nr);
    d = next;
    at = (d & 1) === 0 ? ne.vb : ne.va;
  }
  return { runs, to: at, length };
}

// Ice as a kit rule (one state; it expands a tap into its slide).
export function iceRule(walk: RuleWalk, cont: Int32Array, icy: Uint8Array): WalkRule {
  return {
    states: 1,
    start: 0,
    expands: true,
    step(from, run, state) {
      const s = slide(walk, cont, icy, from, run);
      return s && { runs: s.runs, to: s.to, state, length: s.length };
    },
  };
}

// The core runs (the ones a rule may touch), in id order.
export function coreRuns(walk: RuleWalk): number[] {
  const out: number[] = [];
  for (let r = 0; r < walk.edges.length; r++) if (!exemptRun(walk, r)) out.push(r);
  return out;
}

// The icy runs for this maze, share and seed (see the header). A share
// that rounds to no run places none (layout all zero, bites false).
export function placeIce(
  walk: RuleWalk,
  cont: Int32Array,
  share: number,
  seed: number
): Placement<Uint8Array> {
  const core = coreRuns(walk);
  const s = share > ICE_SHARE_MAX ? ICE_SHARE_MAX : share > 0 ? share : 0;
  const k = Math.round(s * core.length);
  if (k === 0) return { layout: new Uint8Array(walk.edges.length), bites: false, draws: 0 };
  const rng = ruleRng(seed, "ice");
  const draw = (): Uint8Array => {
    const icy = new Uint8Array(walk.edges.length);
    const pool = core.slice();
    for (let i = 0; i < k; i++) {
      const j = i + rng.nextInt(pool.length - i);
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
      icy[pool[i]] = 1;
    }
    return icy;
  };
  return placeRule(walk, draw, (icy) => iceRule(walk, cont, icy));
}
