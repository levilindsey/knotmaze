import { describe, it, expect } from "vitest";
import { runsToExit } from "../../src/core/walk_graph";
import {
  composeRules,
  exemptRun,
  meterLength,
  placeRule,
  plainRule,
  ruleRng,
  ruleSearch,
  PLACE_DRAWS,
  type RuleWalk,
  type WalkRule,
} from "../../src/game/rule_search";
import { cuttable } from "../../src/game/cut";
import { ruleMaze } from "./rule_fixtures";

// K138 stage 1: the rule kit (rule_search.ts).

// A judge that refuses the runs in `blocked` (one state).
function blockRule(walk: RuleWalk, blocked: Set<number>): WalkRule {
  const plain = plainRule(walk);
  return {
    states: 1,
    start: 0,
    step: (from, run, state) => (blocked.has(run) ? null : plain.step(from, run, state)),
  };
}

// A judge that counts runs mod 2 and refuses nothing.
function parityRule(walk: RuleWalk): WalkRule {
  const plain = plainRule(walk);
  return {
    states: 2,
    start: 0,
    step(from, run, state) {
      const m = plain.step(from, run, state);
      return m && { ...m, state: 1 - state };
    },
  };
}

const SEEDS = [1, 2, 3, 5, 8, 13];

describe("rule kit: the plain rule", () => {
  it("matches runsToExit and the walk's optimal length", () => {
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      const s = ruleSearch(walk, plainRule(walk));
      expect(s.solvable).toBe(true);
      expect(s.fewest).toBe(runsToExit(walk).get(walk.start));
      expect(s.shortest).toBeCloseTo(walk.optimalLength, 9);
      expect(s.route.length).toBe(s.fewest);
      expect(s.routeRuns).toEqual(s.route);
      // The route is walkable from the start and ends at the exit.
      let at = walk.start;
      for (const r of s.route) {
        const e = walk.edges[r];
        expect(e.va === at || e.vb === at).toBe(true);
        at = e.va === at ? e.vb : e.va;
      }
      expect(at).toBe(walk.exit);
    }
  });

  it("searches from any vertex", () => {
    const { walk } = ruleMaze(3);
    const runs = runsToExit(walk);
    for (const id of walk.vertices.keys()) {
      const s = ruleSearch(walk, plainRule(walk), { vertex: id, state: 0 });
      expect(s.fewest).toBe(runs.get(id));
    }
  });

  it("is solved at the exit", () => {
    const { walk } = ruleMaze(2);
    const s = ruleSearch(walk, plainRule(walk), { vertex: walk.exit, state: 0 });
    expect(s).toEqual({ solvable: true, fewest: 0, shortest: 0, route: [], routeRuns: [] });
  });

  it("bars the run the head arrived by (a backtrack), unless backtracks are off", () => {
    // A dead-end tip: its only run is the one the head arrived by.
    const isTip = (w: RuleWalk, v: { id: string; edges: number[] }): boolean =>
      v.id !== w.start && v.id !== w.exit && v.edges.length === 1;
    let seed = 1;
    while (![...ruleMaze(seed, 10, 1).walk.vertices.values()].some((v) => isTip(ruleMaze(seed, 10, 1).walk, v))) seed++;
    const { walk } = ruleMaze(seed, 10, 1);
    const tip = [...walk.vertices.values()].find((v) => isTip(walk, v));
    expect(tip).toBeDefined();
    const run = tip!.edges[0];
    const barred = ruleSearch(walk, plainRule(walk), { vertex: tip!.id, state: 0, last: run });
    expect(barred.solvable).toBe(false);
    expect(barred.fewest).toBe(Infinity);
    const trail = ruleSearch(walk, plainRule(walk), { vertex: tip!.id, state: 0, last: run }, false);
    expect(trail.solvable).toBe(true);
    expect(trail.fewest).toBe(runsToExit(walk).get(tip!.id));
  });
});

describe("rule kit: refusals and composition", () => {
  it("a refusing judge routes around its runs", () => {
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      const plain = ruleSearch(walk, plainRule(walk));
      // Refuse the plain route's middle run where that leaves a way out.
      const r = plain.route[plain.route.length >> 1];
      if (!cuttable(walk, r)) continue;
      const blocked = new Set([r]);
      const want = runsToExit(walk, (eid) => blocked.has(eid)).get(walk.start)!;
      const legal = ruleSearch(walk, composeRules(plainRule(walk), blockRule(walk, blocked)));
      if (want === Infinity) {
        expect(legal.solvable).toBe(false);
        continue;
      }
      expect(legal.fewest).toBe(want);
      expect(legal.route).not.toContain(r);
      expect(legal.fewest).toBeGreaterThanOrEqual(plain.fewest);
    }
  });

  it("an unsolvable rule says so", () => {
    const { walk } = ruleMaze(8);
    const atExit = new Set(walk.vertices.get(walk.exit)!.edges);
    const s = ruleSearch(walk, blockRule(walk, atExit));
    expect(s.solvable).toBe(false);
    expect(s.fewest).toBe(Infinity);
    expect(s.shortest).toBe(Infinity);
    expect(s.route).toEqual([]);
  });

  it("composes states as a mixed-radix product and keeps the plain answer", () => {
    const { walk } = ruleMaze(13);
    const both = composeRules(plainRule(walk), parityRule(walk));
    expect(both.states).toBe(2);
    expect(both.start).toBe(0);
    const a = ruleSearch(walk, plainRule(walk));
    const b = ruleSearch(walk, both);
    expect(b.fewest).toBe(a.fewest);
    expect(b.shortest).toBeCloseTo(a.shortest, 9);
    // The composed state threads the judge's parity.
    const r = walk.vertices.get(walk.start)!.edges[0];
    const m = both.step(walk.start, r, 0)!;
    expect(m.state).toBe(1);
    const triple = composeRules(plainRule(walk), parityRule(walk), parityRule(walk));
    expect(triple.states).toBe(4);
    expect(triple.step(walk.start, r, 0)!.state).toBe(1 * 1 + 2 * 1);
  });

  it("rejects no rules and two expanding rules", () => {
    const { walk } = ruleMaze(1);
    expect(() => composeRules()).toThrow();
    const ex: WalkRule = { ...plainRule(walk), expands: true };
    expect(() => composeRules(ex, { ...ex })).toThrow();
    expect(composeRules(plainRule(walk)).states).toBe(1);
  });
});

describe("rule kit: lengths, exempt runs and placement", () => {
  it("exempt runs are the uncuttable ones", () => {
    const { walk } = ruleMaze(2);
    for (let r = 0; r < walk.edges.length; r++) expect(exemptRun(walk, r)).toBe(!cuttable(walk, r));
    expect(meterLength(walk, 0)).toBe(walk.edges[0].length);
  });

  it("each mechanism has its own stream", () => {
    const a = ruleRng(7, "ice");
    const b = ruleRng(7, "ice");
    const c = ruleRng(7, "colorRule");
    const xs = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(xs);
    expect([c.next(), c.next(), c.next()]).not.toEqual(xs);
    expect(ruleRng(8, "ice").next()).not.toBe(xs[0]);
  });

  it("keeps the first biting draw, else the last solvable, else none", () => {
    const { walk } = ruleMaze(3);
    const plain = ruleSearch(walk, plainRule(walk));
    // A route run whose refusal leaves a way out.
    const r = plain.route.find(
      (x) => cuttable(walk, x) && runsToExit(walk, (eid) => eid === x).get(walk.start)! < Infinity
    );
    expect(r).toBeDefined();
    let n = 0;
    // Draw 1 refuses nothing (no bite), draw 2 refuses that run.
    const first = placeRule(
      walk,
      () => ++n,
      (k) => blockRule(walk, k === 1 ? new Set() : new Set([r!]))
    );
    expect(first.layout).toBe(2);
    expect(first.bites).toBe(true);
    expect(first.draws).toBe(2);
    let m = 0;
    const never = placeRule(walk, () => ++m, () => plainRule(walk));
    expect(never).toEqual({ layout: PLACE_DRAWS, bites: false, draws: PLACE_DRAWS });
    const atExit = new Set(walk.vertices.get(walk.exit)!.edges);
    const none = placeRule(walk, () => 0, () => blockRule(walk, atExit));
    expect(none.layout).toBeNull();
    expect(none.bites).toBe(false);
  });
});
