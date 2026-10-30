import { describe, it, expect } from "vitest";
import { FabricMazeController, type FabricRules } from "../../src/game/fabric_controller";
import { plainRule, ruleSearch, type RuleWalk } from "../../src/game/rule_search";
import {
  hiddenOver,
  hiddenRule,
  placeHidden,
  revealedBy,
  runAtCtrl,
  runsNear,
  REVEAL_RUNS,
} from "../../src/game/hidden_runs";
import { ruleMaze } from "./rule_fixtures";
import { ruleFields, ruleShareTags, rulesValue } from "../../src/app/rule_loss";

// K138 stage 2: hidden runs (hidden_runs.ts) and the reveals in the
// controller.

// A line S -0- a -1- b -2- c -3- d -4- X, with a shortcut a -5- X.
function line(): RuleWalk {
  const names = ["S", "a", "b", "c", "d", "X"];
  const edges = [0, 1, 2, 3, 4].map((i) => ({
    id: i,
    va: names[i],
    vb: names[i + 1],
    chain: 0,
    ctrlA: 2 * i,
    ctrlB: 2 * i + 2,
    length: 1,
  }));
  edges.push({ id: 5, va: "a", vb: "X", chain: 1, ctrlA: 0, ctrlB: 2, length: 1 });
  const at = (id: string) => edges.filter((e) => e.va === id || e.vb === id).map((e) => e.id);
  return {
    vertices: new Map(
      names.map((id) => [id, { id, isEnd: id === "S" || id === "X", chain: 0, ctrl: 0, edges: at(id) }])
    ),
    edges,
    start: "S",
    exit: "X",
  };
}

describe("hidden runs: the rule and the reveals", () => {
  it("refuses an unrevealed hidden run and allows it once revealed", () => {
    const w = line();
    expect(ruleSearch(w, plainRule(w)).fewest).toBe(2);
    const hid = ruleSearch(w, hiddenRule(w, [5]));
    expect(hid.fewest).toBe(5);
    expect(hiddenRule(w, [5]).step("a", 5, 0)).toBeNull();
    expect(ruleSearch(w, hiddenRule(w, [5], new Set([5]))).fewest).toBe(2);
    expect(ruleSearch(w, hiddenOver(w, null, [5], new Set([5]))).fewest).toBe(2);
  });

  it("counts run distance over shared vertices", () => {
    const w = line();
    const near = runsNear(w, 0);
    expect(near.get(0)).toBe(0);
    expect(near.get(1)).toBe(1);
    expect(near.get(5)).toBe(1);
    expect(near.get(2)).toBe(2);
    expect(near.get(3)).toBe(3);
    expect(near.has(4)).toBe(true); // 4 meets 5 at X
    expect(REVEAL_RUNS).toBe(3);
  });

  it("reveals the hidden runs of the plucked note within 3 runs", () => {
    const w = line();
    const notes = [1, 2, 3, 1, 2, 1];
    const noteOf = (r: number) => notes[r];
    expect(revealedBy(w, [5], new Set(), 0, noteOf)).toEqual([5]);
    expect(revealedBy(w, [5], new Set(), 3, noteOf)).toEqual([5]); // 3 meets 4 meets 5
    expect(revealedBy(w, [5], new Set(), 1, noteOf)).toEqual([]); // another note
    expect(revealedBy(w, [5], new Set([5]), 0, noteOf)).toEqual([]); // already shown
    expect(revealedBy(w, [5], new Set(), 0, () => null)).toEqual([]);
    // Too far: a long line with the shortcut's note 5 runs away.
    const far: RuleWalk = {
      ...w,
      vertices: new Map(w.vertices),
      edges: w.edges.map((e) => (e.id === 5 ? { ...e, va: "S", vb: "a" } : e)),
    };
    far.vertices.set("S", { ...w.vertices.get("S")!, edges: [0, 5] });
    far.vertices.set("X", { ...w.vertices.get("X")!, edges: [4] });
    expect(runsNear(far, 4).has(5)).toBe(false);
    expect(revealedBy(far, [5], new Set(), 4, () => 7)).toEqual([]);
  });

  it("finds the run holding a chain ctrl", () => {
    const w = line();
    expect(runAtCtrl(w, 0, 3)).toBe(1);
    expect(runAtCtrl(w, 1, 1)).toBe(5);
    expect(runAtCtrl(w, 2, 1)).toBe(-1);
  });
});

const SEEDS = [1, 2, 3, 5, 7, 8, 13, 21];

describe("hidden runs: placement", () => {
  it("one layout per seed; the maze solves without them, and they shorten it", () => {
    let shorter = 0;
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      const a = placeHidden(walk, 2, seed);
      expect(placeHidden(walk, 2, seed)).toEqual(a);
      expect(a.layout).not.toBeNull();
      expect(a.layout!.length).toBeGreaterThan(0);
      expect(new Set(a.layout!).size).toBe(a.layout!.length);
      const without = ruleSearch(walk, hiddenOver(walk, null, a.layout!));
      expect(without.solvable).toBe(true);
      const plain = ruleSearch(walk, plainRule(walk));
      expect(without.fewest).toBeGreaterThanOrEqual(plain.fewest);
      if (a.bites) shorter++;
    }
    expect(shorter).toBeGreaterThanOrEqual(SEEDS.length - 1);
  });

  it("places nothing and draws nothing at count 0", () => {
    const { walk } = ruleMaze(3);
    expect(placeHidden(walk, 0, 3)).toEqual({ layout: null, bites: false, draws: 0 });
  });
});

function make(seed: number, rules: Partial<FabricRules>): FabricMazeController {
  const { walk, cont } = ruleMaze(seed);
  return new FabricMazeController(walk, false, null, rules as FabricRules, { seed, cont: () => cont });
}

describe("hidden runs: the controller", () => {
  it("rates against the maze without them and shows the shorter par with them", () => {
    for (const seed of SEEDS.slice(0, 5)) {
      const c = make(seed, { hiddenRuns: 2 });
      const hidden = c.ruleLook!.hidden!;
      const without = ruleSearch(c.walk, hiddenOver(c.walk, null, hidden));
      const withAll = ruleSearch(c.walk, plainRule(c.walk));
      expect(c.fewestRuns).toBe(without.fewest);
      expect(c.optimal).toBeCloseTo(without.shortest, 9);
      expect(c.fewestWithHidden).toBe(withAll.fewest);
      expect(c.fewestWithHidden).toBeLessThanOrEqual(c.fewestRuns);
    }
  });

  it("a tap on a hidden run does nothing; a reveal opens it, and Undo hides it again", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const c = make(seed, { hiddenRuns: 4 });
      const hidden = c.hiddenRuns();
      // Walk the legal route until the head touches a hidden run.
      const route = ruleSearch(c.walk, c.rule!).route;
      let h = -1;
      for (const run of route) {
        h = c.walk.vertices.get(c.head)!.edges.find((r) => hidden.includes(r)) ?? -1;
        if (h >= 0) break;
        c.tapEdge(run);
      }
      if (h < 0) continue;
      const taps = [...c.taps];
      expect(c.isHidden(h)).toBe(true);
      expect(c.choices()).not.toContain(h);
      expect(c.refusedChoices()).not.toContain(h);
      expect(c.refusalOf(h)).toBe("hidden");
      expect(c.tapEdge(h)).toBe("reject");
      expect([...c.taps]).toEqual(taps);
      // Reveal it: not a stroke, and the run is walkable.
      const strokes = c.strokes;
      expect(c.reveal(h)).toBe(true);
      expect(c.reveal(h)).toBe(false);
      expect(c.isHidden(h)).toBe(false);
      expect(c.strokes).toBe(strokes);
      expect(c.actions[c.actions.length - 1]).toEqual({ kind: "reveal", run: h });
      expect(c.choices()).toContain(h);
      // Undo past the reveal hides it again (call 4).
      const u = make(seed, { hiddenRuns: 4 });
      expect(u.replayActions(c.actions.slice(0, -1))).toBe(true);
      expect(u.isHidden(h)).toBe(true);
      // Replay keeps it; walking it and backing out keeps it too.
      const r = make(seed, { hiddenRuns: 4 });
      expect(r.replayActions(c.actions)).toBe(true);
      expect(r.isHidden(h)).toBe(false);
      expect(["advance", "win"]).toContain(c.tapEdge(h));
      if (!c.solved) {
        expect(c.tapEdge(h)).toBe("backtrack");
        expect(c.isHidden(h)).toBe(false);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("fills the HUD rows and the share tags", () => {
    const c = make(3, { hiddenRuns: 2, turnstiles: 4, ice: 0.25 });
    const look = c.ruleLook!;
    const f = ruleFields(c);
    expect(f.rules).toBe("ice 25%");
    expect(f.turnstiles).toBe(look.turnstiles!.length);
    expect(f.hidden).toEqual({
      found: 0,
      of: look.hidden!.length,
      fewest: c.fewestRuns,
      withAll: c.fewestWithHidden,
    });
    expect(ruleShareTags(c)).toEqual({
      ice: 25,
      colorRule: null,
      turnstiles: look.turnstiles!.length,
      hidden: { found: 0, of: look.hidden!.length },
      oneWay: null, // K138 stage 3
      keys: null, // K138 stage 4
    });
    expect(c.reveal(look.hidden![0])).toBe(true);
    expect(ruleFields(c).hidden!.found).toBe(1);
    expect(ruleShareTags(c).hidden).toEqual({ found: 1, of: look.hidden!.length });
    // Off: no rows, no tags.
    const off = make(3, {});
    const g = ruleFields(off);
    expect([g.rules, g.turnstiles, g.hidden]).toEqual([null, null, null]);
    expect(ruleShareTags(off)).toEqual({
      ice: null,
      colorRule: null,
      turnstiles: null,
      hidden: null,
      oneWay: null,
      keys: null,
    });
    expect(rulesValue(make(3, { colorRule: "alternate" }))).toBe("alternate");
  });

  it("shows no 0 / 0 counter when no hidden run was placed (K763)", () => {
    // Seed 1 under alternate places no hidden run (the color rule bars
    // every candidate), so the HUD row stays away entirely.
    const c = make(1, { hiddenRuns: 2, colorRule: "alternate" });
    expect(c.ruleLook!.hidden).toBeNull();
    expect(ruleFields(c).hidden).toBeNull();
  });

  it("composes with turnstiles and ice", () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const c = make(seed, { hiddenRuns: 2, turnstiles: 4, ice: 0.25 });
      const look = c.ruleLook!;
      expect(look.placed).toBe(true);
      for (const r of look.hidden ?? []) expect(look.icy![r]).toBe(0);
      const best = ruleSearch(c.walk, c.rule!);
      expect(best.solvable).toBe(true);
      for (const run of best.route) {
        const res = c.tapEdge(run);
        expect(["advance", "backtrack", "win"]).toContain(res);
        while (c.carry.length > 0) c.tapEdge(c.carry[0]);
      }
      expect(c.solved).toBe(true);
      expect(c.strokes).toBe(best.fewest);
    }
  });
});
