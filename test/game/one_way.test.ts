import { describe, it, expect } from "vitest";
import { FabricMazeController, type FabricRules } from "../../src/game/fabric_controller";
import { composeRules, plainRule, ruleSearch, type RuleWalk } from "../../src/game/rule_search";
import {
  oneWayAllows,
  oneWayBlocksBack,
  oneWayCore,
  oneWayDirection,
  oneWayOnRoute,
  oneWayRule,
  placeOneWay,
  type OneWayLayout,
} from "../../src/game/one_way";
import { iceRule, placeIce } from "../../src/game/ice";
import { ruleMaze } from "./rule_fixtures";
import { ruleFields, ruleShareTags } from "../../src/app/rule_loss";
import { paramsFromValues } from "../../src/ui/url_state";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { walkerMapOf } from "../../src/game/walker";
import { ruleHasTrap } from "../../src/game/rule_search";

// K138 stage 3: one-way runs (one_way.ts) and the controller's one-way rule.

// S --0-- A, the triangle A --1-- B --2-- C --3-- A, C --4-- X (exit), and
// the pocket B --5-- D (a dead end).
function tri(): RuleWalk {
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
      ["A", v("A", false, [0, 1, 3])],
      ["B", v("B", false, [1, 2, 5])],
      ["C", v("C", false, [2, 3, 4])],
      ["X", v("X", true, [4])],
      ["D", v("D", true, [5])],
    ]),
    edges: [e(0, "S", "A", 1), e(1, "A", "B", 1), e(2, "B", "C", 1), e(3, "C", "A", 1), e(4, "C", "X", 1), e(5, "B", "D", 1)],
    start: "S",
    exit: "X",
  };
}

// Directed reachability under a layout: from every vertex to the exit, and
// from the start to every vertex.
function reach(walk: RuleWalk, layout: OneWayLayout): { toExit: Set<string>; fromStart: Set<string> } {
  const fwd = new Map<string, string[]>();
  const rev = new Map<string, string[]>();
  for (const id of walk.vertices.keys()) {
    fwd.set(id, []);
    rev.set(id, []);
  }
  for (const e of walk.edges) {
    if (e.va === e.vb) continue;
    for (const [a, b] of [
      [e.va, e.vb],
      [e.vb, e.va],
    ]) {
      if (!oneWayAllows(layout, a, e.id)) continue;
      fwd.get(a)!.push(b);
      rev.get(b)!.push(a);
    }
  }
  const bfs = (from: string, adj: Map<string, string[]>): Set<string> => {
    const seen = new Set([from]);
    const q = [from];
    for (let i = 0; i < q.length; i++) for (const u of adj.get(q[i])!) if (!seen.has(u)) (seen.add(u), q.push(u));
    return seen;
  };
  return { toExit: bfs(walk.exit, rev), fromStart: bfs(walk.start, fwd) };
}

const SEEDS = [1, 2, 3, 5, 7, 8, 13, 21];

describe("one-way runs: the rule", () => {
  it("lets a one-way run be tapped from its entry only", () => {
    const w = tri();
    const layout = new Map([[1, "A"]]);
    const r = oneWayRule(w, layout);
    expect(r.step("A", 1, 0)!.to).toBe("B");
    expect(r.step("B", 1, 0)).toBeNull();
    expect(r.step("B", 2, 0)!.to).toBe("C"); // two-way
    expect(r.step("C", 2, 0)!.to).toBe("B");
    expect(r.step("S", 1, 0)).toBeNull(); // not incident
    expect(oneWayDirection(w, layout, 1)).toBe(1);
    expect(oneWayDirection(w, new Map([[1, "B"]]), 1)).toBe(-1);
    expect(oneWayDirection(w, layout, 2)).toBe(0);
    expect(oneWayBlocksBack(layout, [2])).toBe(false);
    expect(oneWayBlocksBack(layout, [2, 1])).toBe(true);
  });

  it("par is the directed search: the fewest taps and the shortest length", () => {
    const w = tri();
    const plain = ruleSearch(w, plainRule(w));
    expect(plain.route).toEqual([0, 3, 4]);
    // A -> C stays open: the plain route.
    const with3 = ruleSearch(w, oneWayRule(w, new Map([[3, "A"]])));
    expect(with3.route).toEqual([0, 3, 4]);
    // C -> A only: around by B.
    const against = ruleSearch(w, oneWayRule(w, new Map([[3, "C"]])));
    expect(against.route).toEqual([0, 1, 2, 4]);
    expect(against.fewest).toBe(4);
    expect(against.shortest).toBeCloseTo(4, 9);
  });

  it("searches from mid-solve", () => {
    const w = tri();
    const r = oneWayRule(w, new Map([[3, "C"]]));
    // At B having come from A: on to C, then out.
    const s = ruleSearch(w, r, { vertex: "B", state: 0, last: 1 });
    expect(s.route).toEqual([2, 4]);
    // At A from S: never C directly.
    const t = ruleSearch(w, r, { vertex: "A", state: 0, last: 0 });
    expect(t.route).toEqual([1, 2, 4]);
  });
});

describe("one-way runs: the orientation", () => {
  it("orients the bridgeless core by one DFS, leaving tails and pockets two-way", () => {
    const w = tri();
    const core = oneWayCore(w, [0, 3, 4]);
    expect(core.root).toBe("A");
    expect(core.runs).toEqual([1, 2, 3]);
    expect([...core.entry]).toEqual([
      [1, "A"],
      [2, "B"],
      [3, "C"],
    ]);
    // The whole orientation leaves every vertex reaching the exit.
    const all = reach(w, core.entry);
    expect(all.toExit.size).toBe(w.vertices.size);
    expect(all.fromStart.size).toBe(w.vertices.size);
  });

  it("is strongly connected on every real core, and keeps every vertex reaching the exit", () => {
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      const core = oneWayCore(walk, ruleSearch(walk, plainRule(walk)).routeRuns);
      expect(core.runs.length).toBeGreaterThan(10);
      // Strongly connected over the core's vertices.
      const coreV = new Set<string>();
      for (const r of core.runs) (coreV.add(walk.edges[r].va), coreV.add(walk.edges[r].vb));
      const only = { ...walk, edges: walk.edges.filter((e) => core.entry.has(e.id)) };
      const root = core.root!;
      const fw = reach({ ...only, start: root, exit: root }, core.entry);
      for (const v of coreV) {
        expect(fw.fromStart.has(v)).toBe(true);
        expect(fw.toExit.has(v)).toBe(true);
      }
      // And with the rest of the maze two-way.
      const all = reach(walk, core.entry);
      expect(all.toExit.size).toBe(walk.vertices.size);
      expect(all.fromStart.size).toBe(walk.vertices.size);
    }
  });
});

describe("one-way runs: placement", () => {
  it("places one layout per seed, its share of the core, with no trap", () => {
    let bit = 0;
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      for (const share of [0.2, 0.4, 0.6]) {
        const a = placeOneWay(walk, share, seed);
        expect(placeOneWay(walk, share, seed)).toEqual(a);
        expect(a.layout).not.toBeNull();
        const core = oneWayCore(walk, ruleSearch(walk, plainRule(walk)).routeRuns);
        expect(a.layout!.size).toBe(Math.round(share * core.runs.length));
        for (const [run, entry] of a.layout!) {
          expect(core.entry.has(run)).toBe(true);
          const e = walk.edges[run];
          expect(entry === e.va || entry === e.vb).toBe(true);
        }
        const r = reach(walk, a.layout!);
        expect(r.toExit.size).toBe(walk.vertices.size);
        expect(r.fromStart.size).toBe(walk.vertices.size);
        expect(ruleSearch(walk, oneWayRule(walk, a.layout!)).solvable).toBe(true);
        expect(a.draws).toBeGreaterThanOrEqual(1);
        if (a.bites) bit++;
      }
    }
    expect(bit).toBeGreaterThanOrEqual(SEEDS.length * 2);
  });

  it("weights the draw toward the plain route", () => {
    let onRoute = 0;
    let placed = 0;
    let routeShare = 0;
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      const plain = ruleSearch(walk, plainRule(walk));
      const core = oneWayCore(walk, plain.routeRuns);
      routeShare += oneWayOnRoute(core.entry, plain.routeRuns) / core.runs.length;
      const a = placeOneWay(walk, 0.2, seed);
      onRoute += oneWayOnRoute(a.layout!, plain.routeRuns);
      placed += a.layout!.size;
    }
    expect(onRoute / placed).toBeGreaterThan((routeShare / SEEDS.length) * 1.5);
  });

  it("places nothing and draws nothing at share 0", () => {
    const { walk } = ruleMaze(3);
    expect(placeOneWay(walk, 0, 3)).toEqual({ layout: null, bites: false, draws: 0 });
    expect(placeOneWay(tri(), 0, 3)).toEqual({ layout: null, bites: false, draws: 0 });
  });

  it("composes with ice: the kit refuses a slide through a run against its arrow", () => {
    for (const seed of SEEDS.slice(0, 5)) {
      const { walk, cont } = ruleMaze(seed);
      const ice = placeIce(walk, cont, 0.25, seed);
      const base = iceRule(walk, cont, ice.layout!);
      const a = placeOneWay(walk, 0.4, seed, base);
      expect(a.layout).not.toBeNull();
      const rule = composeRules(base, oneWayRule(walk, a.layout!));
      const best = ruleSearch(walk, rule);
      expect(best.solvable).toBe(true);
      // Every move of the best route walks each one-way run from its entry.
      let at = walk.start;
      let last = -1;
      let state = rule.start;
      for (const run of best.route) {
        const m = rule.step(at, run, state, last);
        expect(m).not.toBeNull();
        let cur = at;
        for (const r of m!.runs) {
          expect(oneWayAllows(a.layout!, cur, r)).toBe(true);
          const e = walk.edges[r];
          cur = e.va === cur ? e.vb : e.va;
        }
        at = m!.to;
        last = m!.runs[m!.runs.length - 1];
        state = m!.state;
      }
      expect(at).toBe(walk.exit);
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

describe("one-way runs: the controller", () => {
  it("is off at share 0: no rule, the plain walk", () => {
    const c = make(3, { oneWay: 0 });
    expect(c.rulesOn).toBe(false);
    expect(c.ruleLook).toBeNull();
  });

  it("walks the kit's route at the kit's fewest strokes; par and strict read the kit", () => {
    for (const seed of SEEDS) {
      const c = make(seed, { oneWay: 0.4, parMode: "strict", parSlack: 0 });
      expect(c.rulesOn).toBe(true);
      expect(c.ruleLook!.oneWay).not.toBeNull();
      const best = ruleSearch(c.walk, c.rule!);
      expect(c.fewestRuns).toBe(best.fewest);
      expect(c.par).toBe(best.fewest);
      for (const run of best.route) expect(["advance", "win"]).toContain(tap(c, run));
      expect(c.solved).toBe(true);
      expect(c.strokes).toBe(best.fewest);
      expect(c.optimal).toBeCloseTo(best.shortest, 9);
    }
  });

  it("a tap against the arrow changes nothing and names the one-way run", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const c = make(seed, { oneWay: 0.6 });
      const layout = c.ruleLook!.oneWay!;
      const route = ruleSearch(c.walk, c.rule!).route;
      for (const run of route) {
        const against = c.refusedChoices().filter((e) => layout.has(e));
        if (against.length > 0) {
          const eid = against[0];
          expect(layout.get(eid)).not.toBe(c.head);
          const before = { taps: [...c.taps], actions: c.actions.length, head: c.head, strokes: c.strokes };
          expect(c.refusalOf(eid)).toBe("oneWay");
          expect(c.tapEdge(eid)).toBe("refused");
          expect([...c.taps]).toEqual(before.taps);
          expect(c.actions.length).toBe(before.actions);
          expect(c.head).toBe(before.head);
          expect(c.strokes).toBe(before.strokes);
          checked++;
          break;
        }
        if (tap(c, run) === "win") break;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("a backtrack against the arrow is refused, and Undo still takes the move back", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const c = make(seed, { oneWay: 0.6 });
      const layout = c.ruleLook!.oneWay!;
      const route = ruleSearch(c.walk, c.rule!).route;
      for (const run of route) {
        if (tap(c, run) === "win") break;
        const back = c.arrivalEdge;
        if (!layout.has(back)) {
          // A two-way arrival run backtracks as before.
          expect(c.refusalOf(back)).toBeNull();
          expect(c.choices()).toContain(back);
          continue;
        }
        const before = { taps: [...c.taps], actions: c.actions.length, head: c.head, strokes: c.strokes };
        expect(c.choices()).not.toContain(back);
        expect(c.refusedChoices()).toContain(back);
        expect(c.refusalOf(back)).toBe("oneWay");
        expect(c.tapEdge(back)).toBe("refused");
        expect([...c.taps]).toEqual(before.taps);
        expect(c.actions.length).toBe(before.actions);
        expect(c.head).toBe(before.head);
        expect(c.strokes).toBe(before.strokes);
        // Undo: replay every action but the last.
        const u = make(seed, { oneWay: 0.6 });
        expect(u.replayActions(c.actions.slice(0, -1))).toBe(true);
        expect(u.pathEdges.length).toBe(c.pathEdges.length - 1);
        checked++;
        break;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("never leaves the player stuck: a fresh run or the backtrack is always open", () => {
    for (const seed of SEEDS) {
      let s = seed;
      const pick = (n: number): number => {
        s = (s * 48271) % 2147483647;
        return s % n;
      };
      for (let walkNo = 0; walkNo < 10; walkNo++) {
        const c = make(seed, { oneWay: 0.6 });
        for (let step = 0; step < 40 && !c.solved; step++) {
          const ch = c.choices();
          expect(ch.length).toBeGreaterThan(0);
          expect(Number.isFinite(c.runsLeft)).toBe(true);
          tap(c, ch[pick(ch.length)]);
        }
      }
    }
  });

  it("composes with ice and the color rule", () => {
    // Under the color rule a directed walk must also keep the colors, so a
    // draw can fail (seed 1 alternate finds no solvable draw): then no run is
    // one-way, the placement says so, and the rules beneath still play.
    const placedOf = new Map<string, number>();
    for (const seed of SEEDS.slice(0, 5)) {
      for (const rules of [
        { ice: 0.25, oneWay: 0.4 },
        { colorRule: "alternate" as const, oneWay: 0.4 },
      ]) {
        const c = make(seed, rules);
        const name = JSON.stringify(rules);
        if (!c.ruleLook!.oneWay) {
          expect(c.ruleLook!.placed).toBe(false);
          expect(c.rulesOn).toBe(true);
          continue;
        }
        placedOf.set(name, (placedOf.get(name) ?? 0) + 1);
        const best = ruleSearch(c.walk, c.rule!);
        expect(best.solvable).toBe(true);
        for (const run of best.route) expect(["advance", "backtrack", "win"]).toContain(tap(c, run));
        expect(c.solved).toBe(true);
        expect(c.strokes).toBe(best.fewest);
      }
    }
    for (const n of placedOf.values()) expect(n).toBeGreaterThanOrEqual(4);
    expect(placedOf.size).toBe(2);
  });

  it("K788: seeds 3 and 4 lay no one-way + ice trap, with or without keys", () => {
    for (const seed of [3, 4]) {
      const params = paramsFromValues(seed, {});
      const { graph, walk: built } = buildSceneGraph({ ...params, title: "", glyphs2: "" });
      const walk = built ?? buildWalkGraph(graph);
      let cont: Int32Array | null = null;
      const source = () => ({
        seed: params.seed,
        cont: () => (cont ??= walkerMapOf(graph, walk).cont),
      });
      for (const rules of [{ oneWay: 0.4, ice: 0.25 }, { keys: 2, oneWay: 0.4, ice: 0.25 }]) {
        const c = new FabricMazeController(walk, false, null, rules, source());
        expect(c.rule).not.toBeNull();
        expect(ruleHasTrap(walk, c.rule!)).toBe(false);
      }
      // Off: no rule at all (nothing changes with one-way and ice at 0).
      const off = new FabricMazeController(walk, false, null, {}, source());
      expect(off.rulesOn).toBe(false);
      expect(off.ruleLook).toBeNull();
    }
  });

  it("composes with turnstiles and hidden runs, and fills the HUD row and the share tag", () => {
    let placed = 0;
    for (const seed of [1, 2, 3, 5, 7]) {
      const c = make(seed, { oneWay: 0.3, turnstiles: 3, hiddenRuns: 1 });
      expect(c.rulesOn).toBe(true);
      const look = c.ruleLook!;
      if (!look.oneWay) {
        expect(look.placed).toBe(false);
        continue;
      }
      placed++;
      expect(ruleFields(c).oneWay).toBe(look.oneWay.size);
      expect(ruleShareTags(c).oneWay).toBe(look.oneWay.size);
      const best = ruleSearch(c.walk, c.rule!);
      expect(best.solvable).toBe(true);
      for (const run of best.route) expect(["advance", "backtrack", "win"]).toContain(tap(c, run));
      expect(c.solved).toBe(true);
    }
    expect(placed).toBeGreaterThanOrEqual(4);
    // Off: no row, no tag.
    const off = make(3, {});
    expect(ruleFields(off).oneWay).toBeNull();
    expect(ruleShareTags(off).oneWay).toBeNull();
  });
});
