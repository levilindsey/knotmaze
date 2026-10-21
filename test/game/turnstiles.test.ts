import { describe, it, expect } from "vitest";
import { FabricMazeController, type FabricRules } from "../../src/game/fabric_controller";
import { composeRules, plainRule, ruleSearch, type RuleWalk } from "../../src/game/rule_search";
import {
  closedArm,
  openPair,
  placeTurnstiles,
  turnstileAllows,
  turnstileCandidates,
  turnstileRule,
  type Turnstile,
} from "../../src/game/turnstiles";
import { iceRule, placeIce } from "../../src/game/ice";
import { ruleMaze } from "./rule_fixtures";

// K138 stage 2: turnstile junctions (turnstiles.ts), the kit's move clock
// and its bounces (rule_search.ts), and the turnstiles in the controller.

// S --0-- J --1-- X (exit), and J --2-- K (a dead end). J's arms: 0, 1, 2.
function tee(): RuleWalk {
  const v = (id: string, isEnd: boolean, edges: number[]) => ({ id, isEnd, chain: 0, ctrl: 0, edges });
  const e = (id: number, va: string, vb: string, length: number) => ({
    id,
    va,
    vb,
    chain: id,
    ctrlA: 0,
    ctrlB: 2,
    length,
  });
  return {
    vertices: new Map([
      ["S", v("S", true, [0])],
      ["J", v("J", false, [0, 1, 2])],
      ["X", v("X", true, [1])],
      ["K", v("K", true, [2])],
    ]),
    edges: [e(0, "S", "J", 1), e(1, "J", "X", 1), e(2, "J", "K", 0.5)],
    start: "S",
    exit: "X",
  };
}

const at = (phase0: number): Turnstile => ({ vertex: "J", arms: [0, 1, 2], phase0 });

describe("turnstiles: the rule", () => {
  it("opens one pair at a time, turning one step per move", () => {
    const t = at(0);
    expect(openPair(t, 0)).toEqual([0, 1]);
    expect(openPair(t, 1)).toEqual([1, 2]);
    expect(openPair(t, 2)).toEqual([2, 0]);
    expect(openPair(t, 3)).toEqual([0, 1]);
    expect(closedArm(t, 0)).toBe(2);
    expect(closedArm(at(2), 0)).toBe(1);
  });

  it("joins the open pair, always lets you back out, and opens any open arm from nowhere", () => {
    const t = at(0); // clock 0: {0, 1} open
    expect(turnstileAllows(t, 1, 0, 0)).toBe(true);
    expect(turnstileAllows(t, 2, 0, 0)).toBe(false);
    expect(turnstileAllows(t, 0, 2, 0)).toBe(false);
    expect(turnstileAllows(t, 2, 2, 0)).toBe(true); // back the way you came
    expect(turnstileAllows(t, 0, -1, 0)).toBe(true);
    expect(turnstileAllows(t, 2, -1, 0)).toBe(false);
  });

  it("judges only the turnstile's own junction", () => {
    const w = tee();
    const r = turnstileRule(w, [at(1)]);
    expect(r.period).toBe(3);
    expect(r.step("S", 0, 0, -1, 0)).not.toBeNull();
    expect(r.step("J", 1, 0, 0, 1)).toBeNull(); // {2, 0} open at clock 1
    expect(r.step("J", 2, 0, 0, 1)!.to).toBe("K");
    expect(r.step("K", 2, 0, 2, 2)!.to).toBe("J");
    expect(r.step("S", 1, 0, -1, 0)).toBeNull(); // not incident
  });
});

describe("turnstiles: the kit's move clock", () => {
  it("bounces to turn the clock: the fewest taps and the shortest length", () => {
    const w = tee();
    // phase0 2: {0, 1} open at clock 1, the plain route walks.
    expect(ruleSearch(w, turnstileRule(w, [at(2)])).route).toEqual([0, 1]);
    // phase0 0: {0, 1} again at clock 3: a bounce at the start first.
    const b = ruleSearch(w, turnstileRule(w, [at(0)]));
    expect(b.fewest).toBe(4);
    expect(b.route).toEqual([0, 0, 0, 1]);
    expect(b.shortest).toBeCloseTo(4, 12);
    // phase0 1: {0, 1} at clock 2 or 5: out to K and back twice (a deep
    // bounce), then through.
    const d = ruleSearch(w, turnstileRule(w, [at(1)]));
    expect(d.fewest).toBe(6);
    expect(d.route).toEqual([0, 2, 2, 0, 0, 1]);
    expect(d.routeRuns).toEqual([0, 2, 2, 0, 0, 1]);
    expect(d.shortest).toBeCloseTo(5, 12);
  });

  it("searches from mid-solve with the arrival run and the clock", () => {
    const w = tee();
    const r = turnstileRule(w, [at(1)]);
    // At J by run 0 after 2 moves: {0, 1} open, one tap.
    expect(ruleSearch(w, r, { vertex: "J", state: 0, last: 0, phase: 2 }).fewest).toBe(1);
    // After 1 move: {2, 0} open; out to K and back turns it to {1, 2}, still
    // closed for 0 -> 1, and nothing else is legal there.
    expect(ruleSearch(w, r, { vertex: "J", state: 0, last: 0, phase: 1 }).solvable).toBe(false);
    // Trail mode has no backtracks, so no bounces: a tap on the arrival run
    // walks it again, and arriving at J by 2 makes {2, 1} the pair to wait
    // for.
    const t = ruleSearch(w, turnstileRule(w, [at(1)]), undefined, false);
    expect(t.route).toEqual([0, 2, 2, 1]);
  });

  it("finds the same best walk with a clock that nothing reads", () => {
    for (const seed of [5, 8]) {
      const { walk, cont } = ruleMaze(seed);
      const ice = placeIce(walk, cont, 0.25, seed);
      const r = iceRule(walk, cont, ice.layout!);
      const s = ruleSearch(walk, r);
      const t = ruleSearch(walk, composeRules(r, turnstileRule(walk, [])));
      expect(t.fewest).toBe(s.fewest);
      expect(t.shortest).toBeCloseTo(s.shortest, 9);
    }
  });
});

function make(seed: number, rules: Partial<FabricRules>, trail = false): FabricMazeController {
  const { walk, cont } = ruleMaze(seed);
  return new FabricMazeController(walk, trail, null, rules as FabricRules, { seed, cont: () => cont });
}

// One tap and the runs it carries on along; the result of the tap.
function tap(c: FabricMazeController, run: number): string {
  const r = c.tapEdge(run);
  if (r === "advance" || r === "backtrack") {
    while (c.carry.length > 0) {
      const rr = c.tapEdge(c.carry[0]);
      if (rr === "win") return rr;
      expect(["advance", "backtrack"]).toContain(rr);
    }
  }
  return r;
}

const SEEDS = [1, 2, 3, 5, 7, 8, 13, 21];

describe("turnstiles: placement", () => {
  it("places one layout per seed, on or near the plain route, solvable and biting", () => {
    let bit = 0;
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      const a = placeTurnstiles(walk, 4, seed);
      const b = placeTurnstiles(walk, 4, seed);
      expect(a).toEqual(b);
      expect(a.layout).not.toBeNull();
      const pool = new Set(turnstileCandidates(walk));
      for (const t of a.layout!) {
        expect(pool.has(t.vertex)).toBe(true);
        expect(t.arms).toEqual(walk.vertices.get(t.vertex)!.edges);
        expect(t.phase0).toBeGreaterThanOrEqual(0);
        expect(t.phase0).toBeLessThan(3);
      }
      expect(new Set(a.layout!.map((t) => t.vertex)).size).toBe(a.layout!.length);
      expect(ruleSearch(walk, turnstileRule(walk, a.layout!)).solvable).toBe(true);
      if (a.bites) bit++;
      expect(a.draws).toBeGreaterThanOrEqual(1);
    }
    expect(bit).toBeGreaterThanOrEqual(SEEDS.length - 1);
  });

  it("places nothing and draws nothing at count 0", () => {
    const { walk } = ruleMaze(3);
    expect(placeTurnstiles(walk, 0, 3)).toEqual({ layout: null, bites: false, draws: 0 });
  });

  it("is off in the controller at count 0: no rule, the plain walk", () => {
    const c = make(3, { turnstiles: 0, hiddenRuns: 0 });
    expect(c.rulesOn).toBe(false);
    expect(c.ruleLook).toBeNull();
  });
});

describe("turnstiles: the controller", () => {
  it("walks the kit's route, bounces included, at the kit's fewest strokes", () => {
    let bounced = 0;
    for (const seed of SEEDS) {
      for (const n of [4, 8]) {
        const c = make(seed, { turnstiles: n });
        expect(c.rulesOn).toBe(true);
        const best = ruleSearch(c.walk, c.rule!);
        expect(best.solvable).toBe(true);
        expect(c.fewestRuns).toBe(best.fewest);
        for (const run of best.route) {
          const r = tap(c, run);
          expect(["advance", "backtrack", "win"]).toContain(r);
          if (r === "backtrack") bounced++;
        }
        expect(c.solved).toBe(true);
        expect(c.strokes).toBe(best.fewest);
        expect(c.optimal).toBeCloseTo(best.shortest, 9);
      }
    }
    expect(bounced).toBeGreaterThan(0);
  });

  it("a refused tap changes nothing, names the turnstile, and opens a move later", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const c = make(seed, { turnstiles: 8 });
      const route = ruleSearch(c.walk, c.rule!).route;
      for (const run of route) {
        const refused = c.refusedChoices();
        if (refused.length > 0) {
          const eid = refused[0];
          const before = {
            taps: [...c.taps],
            actions: c.actions.length,
            head: c.head,
            phase: c.rulePhase,
            strokes: c.strokes,
          };
          expect(c.refusalOf(eid)).toBe("turnstile");
          expect(c.tapEdge(eid)).toBe("refused");
          expect([...c.taps]).toEqual(before.taps);
          expect(c.actions.length).toBe(before.actions);
          expect(c.head).toBe(before.head);
          expect(c.rulePhase).toBe(before.phase);
          expect(c.strokes).toBe(before.strokes);
          checked++;
          break;
        }
        if (tap(c, run) === "win") break;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("a backtrack turns the clock on; Undo and replay turn it back", () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const c = make(seed, { turnstiles: 4 });
      expect(c.rulePhase).toBe(0);
      const route = ruleSearch(c.walk, c.rule!).route;
      expect(tap(c, route[0])).toBe("advance");
      expect(c.rulePhase).toBe(1);
      const top = c.pathEdges[c.pathEdges.length - 1];
      expect(tap(c, top)).toBe("backtrack");
      expect(c.pathEdges.length).toBe(0);
      expect(c.rulePhase).toBe(2);
      expect(c.strokes).toBe(2);
      // Undo: replay every action but the last.
      const u = make(seed, { turnstiles: 4 });
      expect(u.replayActions(c.actions.slice(0, -1))).toBe(true);
      expect(u.rulePhase).toBe(1);
      expect(u.head).not.toBe(c.walk.start);
      const r = make(seed, { turnstiles: 4 });
      expect(r.replayActions(c.actions)).toBe(true);
      expect(r.rulePhase).toBe(2);
      expect(r.head).toBe(c.walk.start);
    }
  });

  it("composes with ice and the color rule", () => {
    for (const seed of SEEDS.slice(0, 5)) {
      for (const rules of [
        { ice: 0.25, turnstiles: 4 },
        { colorRule: "alternate" as const, turnstiles: 4 },
      ]) {
        const c = make(seed, rules);
        const look = c.ruleLook!;
        expect(look.turnstiles).not.toBeNull();
        expect(look.placed).toBe(true);
        const best = ruleSearch(c.walk, c.rule!);
        expect(best.solvable).toBe(true);
        for (const run of best.route) expect(["advance", "backtrack", "win"]).toContain(tap(c, run));
        expect(c.solved).toBe(true);
        expect(c.strokes).toBe(best.fewest);
      }
    }
  });

  it("par and strict mode read the kit's fewest taps", () => {
    const c = make(7, { turnstiles: 4, parMode: "strict", parSlack: 0 });
    const best = ruleSearch(c.walk, c.rule!);
    expect(c.par).toBe(best.fewest);
    expect(c.runsLeft).toBe(best.fewest);
    const plain = ruleSearch(c.walk, plainRule(c.walk));
    expect(best.fewest).toBeGreaterThanOrEqual(plain.fewest);
  });
});
