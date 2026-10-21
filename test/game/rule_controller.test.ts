import { describe, it, expect } from "vitest";
import { FabricMazeController, type FabricRules } from "../../src/game/fabric_controller";
import { colorRule } from "../../src/game/color_rule";
import { parFor } from "../../src/game/par";
import { ruleSearch } from "../../src/game/rule_search";
import { SeededRNG } from "../../src/util/random";
import { ruleMaze } from "./rule_fixtures";

// K138 stage 1: the rules in the controller (ice's slide, the color rule's
// refusals, the whole-move backtrack, par and strict from the kit).

function make(seed: number, rules: FabricRules, trail = false): FabricMazeController {
  const { walk, cont } = ruleMaze(seed);
  return new FabricMazeController(walk, trail, null, rules, { seed, cont: () => cont });
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

describe("rules in the controller: ice", () => {
  it("a slide walks its runs and counts one stroke; the kit's route wins", () => {
    let slid = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const c = make(seed, { ice: 0.5 });
      expect(c.rulesOn).toBe(true);
      const best = ruleSearch(c.walk, c.rule!);
      expect(c.fewestRuns).toBe(best.fewest);
      for (const run of best.route) {
        const before = c.taps.length;
        const r = tap(c, run);
        expect(r === "advance" || r === "win").toBe(true);
        if (c.taps.length - before >= 2) slid++;
      }
      expect(c.solved).toBe(true);
      expect(c.strokes).toBe(best.route.length);
      expect(c.taps).toEqual(best.routeRuns);
      expect(c.moveLog.length).toBe(best.route.length);
      expect(c.moveLog.every((m) => m === "g")).toBe(true);
    }
    expect(slid).toBeGreaterThan(0);
  });

  it("a backtrack undoes the whole slide, and replay and Undo rebuild one", () => {
    let checked = 0;
    for (let seed = 1; seed <= 8 && checked < 3; seed++) {
      const c = make(seed, { ice: 0.5 });
      const route = ruleSearch(c.walk, c.rule!).route;
      // Walk the route to its first slide.
      for (const run of route) {
        const path0 = [...c.pathEdges];
        const state0 = c.ruleState;
        const head0 = c.head;
        const strokes0 = c.strokes;
        if (tap(c, run) === "win") break;
        if (c.pathEdges.length - path0.length < 2) continue;
        // Replay and Undo rebuild the slide.
        const d = make(seed, { ice: 0.5 });
        expect(d.replay(c.taps)).toBe(true);
        expect(d.head).toBe(c.head);
        expect(d.ruleState).toBe(c.ruleState);
        expect(d.strokes).toBe(c.strokes);
        const u = make(seed, { ice: 0.5 });
        expect(u.replayActions(c.actions)).toBe(true);
        expect(u.pathEdges).toEqual(c.pathEdges);
        expect(u.strokes).toBe(c.strokes);
        // One tap on the path's top undoes all of it.
        expect(c.tapEdge(c.arrivalEdge)).toBe("backtrack");
        expect(c.carry.length).toBeGreaterThan(0);
        while (c.carry.length > 0) expect(c.tapEdge(c.carry[0])).toBe("backtrack");
        expect(c.pathEdges).toEqual(path0);
        expect(c.head).toBe(head0);
        expect(c.ruleState).toBe(state0);
        expect(c.strokes).toBe(strokes0 + 2);
        expect(c.moveLog[c.moveLog.length - 1]).toBe("b");
        // And the undo replays too.
        const v = make(seed, { ice: 0.5 });
        expect(v.replayActions(c.actions)).toBe(true);
        expect(v.pathEdges).toEqual(path0);
        checked++;
        break;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("rules in the controller: the color rule", () => {
  it("a refused tap changes nothing, and choices() leaves it out", () => {
    let refused = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const c = make(seed, { colorRule: "alternate" });
      const rng = new SeededRNG(seed);
      for (let i = 0; i < 40 && !c.solved; i++) {
        const no = c.refusedChoices();
        for (const run of no) {
          expect(c.choices()).not.toContain(run);
          const snap = [c.taps.length, c.head, c.ruleState, c.actions.length, c.moveLog.length];
          expect(c.tapEdge(run)).toBe("refused");
          expect([c.taps.length, c.head, c.ruleState, c.actions.length, c.moveLog.length]).toEqual(snap);
          refused++;
        }
        const ch = c.choices();
        if (ch.length === 0) break;
        tap(c, ch[rng.nextInt(ch.length)]);
      }
    }
    expect(refused).toBeGreaterThan(0);
  });

  it("par and strict mode read the kit; a backtrack restores the state", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const c = make(seed, { colorRule: "cycle", parMode: "strict", parSlack: 0 });
      const best = ruleSearch(c.walk, colorRule(c.walk, "cycle", c.ruleLook!.colors!));
      expect(c.fewestRuns).toBe(best.fewest);
      expect(c.par).toBe(parFor(best.fewest, 0));
      expect(c.runsLeft).toBe(best.fewest);
      expect(c.optimal).toBeCloseTo(best.shortest, 9);
      // A move off every best route loses strict par at slack 0.
      const start = c.ruleState;
      const off = c.choices().find((run) => {
        const t = make(seed, { colorRule: "cycle" });
        t.tapEdge(run);
        return t.runsLeft >= best.fewest;
      });
      if (off === undefined) continue;
      tap(c, off);
      expect(c.parLost).toBe(true);
      expect(c.choices()).toEqual([]);
      // Without strict, the backtrack brings the state back.
      const d = make(seed, { colorRule: "cycle" });
      d.tapEdge(off);
      d.tapEdge(d.arrivalEdge);
      expect(d.ruleState).toBe(start);
      expect(d.runsLeft).toBe(best.fewest);
    }
  });
});

describe("rules in the controller: hints", () => {
  it("the good arm follows the kit: never refused, and following it wins in the fewest taps", () => {
    for (const rules of [{ ice: 0.5 }, { colorRule: "alternate" as const }, { ice: 0.25, colorRule: "cycle" as const }]) {
      for (let seed = 1; seed <= 4; seed++) {
        const c = make(seed, rules);
        const fewest = c.fewestRuns;
        // A wrong first move, if there is one, then the good arms home.
        const off = c.choices().find((run) => run !== c.goodArm());
        if (off !== undefined) tap(c, off);
        let strokes = 0;
        for (let i = 0; i < 200 && !c.solved; i++) {
          const arm = c.goodArm();
          expect(arm).toBeGreaterThanOrEqual(0);
          expect(c.refusedChoices()).not.toContain(arm);
          expect(c.choices()).toContain(arm);
          tap(c, arm);
          strokes++;
        }
        expect(c.solved).toBe(true);
        if (off === undefined) expect(strokes).toBe(fewest);
      }
    }
  });
});

describe("rules in the controller: off", () => {
  it("with both rules off every result is as before", () => {
    for (let seed = 1; seed <= 4; seed++) {
      const { walk, cont } = ruleMaze(seed);
      const a = new FabricMazeController(walk, false, null, { parMode: "count" });
      const b = new FabricMazeController(
        walk,
        false,
        null,
        { parMode: "count", ice: 0, colorRule: "off" },
        { seed, cont: () => cont }
      );
      expect(b.rulesOn).toBe(false);
      expect(b.ruleLook).toBeNull();
      const rng = new SeededRNG(seed * 7);
      for (let i = 0; i < 60 && !a.solved; i++) {
        const ch = a.choices();
        expect(b.choices()).toEqual(ch);
        const run = ch[rng.nextInt(ch.length)];
        expect(b.tapEdge(run)).toBe(a.tapEdge(run));
        expect(b.runsLeft).toBe(a.runsLeft);
        expect(b.strokes).toBe(a.taps.length);
        expect(b.optimal).toBe(walk.optimalLength);
      }
      expect(b.moveLog).toEqual(a.moveLog);
      expect(b.replaysActions).toBe(false);
    }
  });

  it("a rule yields to fragile runs, collapse, the cut and the fire", () => {
    expect(make(2, { ice: 0.25, fragile: "some" as never }).rulesOn).toBe(false);
    expect(make(2, { colorRule: "alternate", collapse: "free" }).rulesOn).toBe(false);
    expect(make(2, { colorRule: "alternate", cut: "on" }).rulesOn).toBe(false);
    expect(make(2, { ice: 0.25, spool: 0.5 }).rulesOn).toBe(false);
    expect(make(2, { ice: 0.25, parMode: "count" }).rulesOn).toBe(true);
    // No source: no rule.
    const { walk } = ruleMaze(2);
    expect(new FabricMazeController(walk, false, null, { ice: 0.25 }).rulesOn).toBe(false);
  });
});
