import { describe, it, expect } from "vitest";
import { FabricMazeController, type FabricRules } from "../../src/game/fabric_controller";
import { composeRules, plainRule, ruleSearch, type RuleWalk } from "../../src/game/rule_search";
import {
  KEYS_MAX,
  keyMasks,
  keysIn,
  lockCandidates,
  lockModeOf,
  lockOpens,
  lockRule,
  placeLocks,
  shortcutCandidates,
  type LockLayout,
} from "../../src/game/locks";
import { oneWayCore } from "../../src/game/one_way";
import { iceRule, placeIce } from "../../src/game/ice";
import { ruleMaze } from "./rule_fixtures";

// K138 stage 4: locks and keys (locks.ts) and the controller's lock rule.

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


const KEY_B: LockLayout = { mode: "exit", keys: ["B"], locks: new Map([[4, 1]]) };

// The shortcut form's stage: route S-0-A-1-B-2-C-3-X; the long way
// round run 2 is B-4-D-5-E-6-C (2 runs more); K (runs 7, 8, 10) is a
// core junction 2 runs of fetching off B.
function shortcutWalk(): RuleWalk {
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
      ["A", v("A", false, [0, 1])],
      ["B", v("B", false, [1, 2, 4, 8])],
      ["C", v("C", false, [2, 3, 6])],
      ["X", v("X", true, [3])],
      ["D", v("D", false, [4, 5, 7])],
      ["E", v("E", false, [5, 6, 9])],
      ["K", v("K", false, [7, 8, 10])],
    ]),
    edges: [
      e(0, "S", "A", 1),
      e(1, "A", "B", 1),
      e(2, "B", "C", 1),
      e(3, "C", "X", 1),
      e(4, "B", "D", 1),
      e(5, "D", "E", 1),
      e(6, "E", "C", 1),
      e(7, "D", "K", 1),
      e(8, "K", "B", 1),
      e(9, "K", "E", 1),
    ],
    start: "S",
    exit: "X",
  };
}

const SEEDS = [1, 2, 3, 5, 7, 8, 13, 21];

describe("locks and keys: the rule", () => {
  it("refuses a lock without its keys, and takes a key on arrival", () => {
    const w = tri();
    const r = lockRule(w, KEY_B);
    expect(r.states).toBe(2);
    expect(r.start).toBe(0);
    expect(r.step("C", 4, 0)).toBeNull();
    expect(r.step("C", 4, 1)!.to).toBe("X");
    const m = r.step("A", 1, 0)!;
    expect(m.to).toBe("B");
    expect(m.state).toBe(1);
    expect(r.step("B", 1, 1)!.state).toBe(1); // never used up
    expect(r.step("S", 1, 0)).toBeNull(); // not incident
    expect(lockOpens(KEY_B, 4, 0)).toBe(false);
    expect(lockOpens(KEY_B, 4, 1)).toBe(true);
    expect(lockOpens(KEY_B, 2, 0)).toBe(true); // no lock
    expect(keysIn(0b101)).toBe(2);
    expect([...keyMasks({ mode: "exit", keys: ["B", "C", "B"], locks: new Map() })]).toEqual([
      ["B", 0b101],
      ["C", 0b010],
    ]);
    expect(lockModeOf("exit")).toBe("exit");
    expect(lockModeOf("nope")).toBe("exit");
  });

  it("par is the (vertex, keys held) search: the fewest taps and the shortest length", () => {
    const w = tri();
    expect(ruleSearch(w, plainRule(w)).route).toEqual([0, 3, 4]);
    const s = ruleSearch(w, lockRule(w, KEY_B));
    expect(s.route).toEqual([0, 1, 2, 4]);
    expect(s.fewest).toBe(4);
    expect(s.shortest).toBeCloseTo(4, 9);
    // A key in the dead end is no use: the search never retraces a run.
    const deadEnd: LockLayout = { mode: "exit", keys: ["D"], locks: new Map([[4, 1]]) };
    expect(ruleSearch(w, lockRule(w, deadEnd)).solvable).toBe(false);
  });

  it("searches from mid-solve", () => {
    const w = tri();
    const r = lockRule(w, KEY_B);
    // At C from A without the key: round by B, then back to C and out.
    expect(ruleSearch(w, r, { vertex: "C", state: 0, last: 3 }).route).toEqual([2, 1, 3, 4]);
    // With the key: straight out.
    expect(ruleSearch(w, r, { vertex: "C", state: 1, last: 3 }).route).toEqual([4]);
  });
});

describe("locks and keys: placement", () => {
  it("names the triangle's one candidate", () => {
    const w = tri();
    const { locks, candidates } = lockCandidates(w);
    expect(locks).toEqual([4]);
    // A and C cost no detour (they are on the way); D hangs off the core.
    expect(candidates).toEqual([{ vertex: "B", detour: 1 }]);
    const p = placeLocks(w, 2, "exit", 3);
    expect(p.layout).toEqual(KEY_B); // fewer keys when fewer qualify
    expect(p.bites).toBe(true);
    expect(p.draws).toBe(1);
  });

  it("places one layout per seed: its keys at core junctions, every lock needing every key, solvable", () => {
    let bit = 0;
    let placed = 0;
    for (const seed of SEEDS) {
      const { walk } = ruleMaze(seed);
      const plain = ruleSearch(walk, plainRule(walk));
      const core = oneWayCore(walk, plain.routeRuns);
      const inCore = new Set<string>();
      for (const r of core.runs) (inCore.add(walk.edges[r].va), inCore.add(walk.edges[r].vb));
      for (let keys = 1; keys <= KEYS_MAX; keys++) {
        const a = placeLocks(walk, keys, "exit", seed);
        expect(placeLocks(walk, keys, "exit", seed)).toEqual(a);
        expect(a.layout).not.toBeNull();
        const layout = a.layout!;
        placed++;
        expect(layout.keys.length).toBe(keys);
        expect(new Set(layout.keys).size).toBe(keys);
        for (const k of layout.keys) {
          expect(inCore.has(k)).toBe(true);
          expect(walk.vertices.get(k)!.edges.length).toBeGreaterThanOrEqual(3);
          expect([walk.start, walk.exit]).not.toContain(k);
        }
        expect([...layout.locks.keys()]).toEqual([...new Set(walk.vertices.get(walk.exit)!.edges)]);
        for (const need of layout.locks.values()) expect(need).toBe((1 << keys) - 1);
        const s = ruleSearch(walk, lockRule(walk, layout));
        expect(s.solvable).toBe(true);
        expect(s.fewest).toBeGreaterThanOrEqual(plain.fewest);
        expect(a.draws).toBeGreaterThanOrEqual(1);
        if (a.bites) bit++;
      }
    }
    expect(bit).toBe(placed);
  });

  it("places nothing and draws nothing at keys 0", () => {
    const { walk } = ruleMaze(3);
    expect(placeLocks(walk, 0, "exit", 3)).toEqual({ layout: null, bites: false, draws: 0 });
    expect(placeLocks(tri(), 0, "exit", 3)).toEqual({ layout: null, bites: false, draws: 0 });
  });

  it("composes with ice: a slide takes every key it passes, and is refused through a lock", () => {
    for (const seed of SEEDS.slice(0, 5)) {
      const { walk, cont } = ruleMaze(seed);
      const ice = placeIce(walk, cont, 0.25, seed);
      const base = iceRule(walk, cont, ice.layout!);
      const a = placeLocks(walk, 2, "exit", seed, base);
      expect(a.layout).not.toBeNull();
      const layout = a.layout!;
      const lock = lockRule(walk, layout);
      const rule = composeRules(base, lock);
      const best = ruleSearch(walk, rule);
      expect(best.solvable).toBe(true);
      // Walk the best route, tracking the keys by hand over every run.
      const at = keyMasks(layout);
      let v = walk.start;
      let last = -1;
      let state = rule.start;
      let held = 0;
      for (const run of best.route) {
        const m = rule.step(v, run, state, last);
        expect(m).not.toBeNull();
        let cur = v;
        for (const r of m!.runs) {
          expect(lockOpens(layout, r, held)).toBe(true);
          const e = walk.edges[r];
          cur = e.va === cur ? e.vb : e.va;
          held |= at.get(cur) ?? 0;
        }
        v = m!.to;
        last = m!.runs[m!.runs.length - 1];
        state = m!.state;
        expect(Math.floor(state / base.states)).toBe(held);
      }
      expect(v).toBe(walk.exit);
      expect(held).toBe((1 << layout.keys.length) - 1);
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

describe("locks and keys: the controller", () => {
  it("is off at keys 0: no rule, the plain walk", () => {
    const c = make(3, { keys: 0 });
    expect(c.rulesOn).toBe(false);
    expect(c.ruleLook).toBeNull();
    expect(c.keysTotal).toBe(0);
    expect(c.keysHeld).toBe(0);
  });

  it("walks the kit's route at the kit's fewest strokes, taking every key; par and strict read the kit", () => {
    for (const seed of SEEDS) {
      const c = make(seed, { keys: 2, parMode: "strict", parSlack: 0 });
      expect(c.rulesOn).toBe(true);
      const look = c.ruleLook!;
      expect(look.locks).not.toBeNull();
      expect(look.lockDiv).toBe(1);
      expect(c.keysTotal).toBe(2);
      const best = ruleSearch(c.walk, c.rule!);
      expect(c.fewestRuns).toBe(best.fewest);
      expect(c.par).toBe(best.fewest);
      let held = 0;
      for (const run of best.route) {
        expect(["advance", "win"]).toContain(tap(c, run));
        expect(c.keysHeld).toBeGreaterThanOrEqual(held);
        held = c.keysHeld;
      }
      expect(c.solved).toBe(true);
      expect(c.keysHeld).toBe(2);
      expect(c.strokes).toBe(best.fewest);
      expect(c.optimal).toBeCloseTo(best.shortest, 9);
    }
  });

  it("a tap on a lock without the keys changes nothing and names the lock", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const c = make(seed, { keys: 3 });
      const layout = c.ruleLook!.locks!;
      const gate = [...layout.locks.keys()].map((r) => {
        const e = c.walk.edges[r];
        return e.va === c.walk.exit ? e.vb : e.va;
      });
      // Walk the plain route to the gate, keyless.
      const plain = ruleSearch(c.walk, plainRule(c.walk));
      for (const run of plain.route) {
        if (gate.includes(c.head)) break;
        if (c.refusalOf(run) !== null) break;
        tap(c, run);
      }
      if (!gate.includes(c.head) || c.keysHeld === 3) continue;
      const lock = [...layout.locks.keys()].find((r) => c.walk.edges[r].va === c.head || c.walk.edges[r].vb === c.head)!;
      const before = { taps: [...c.taps], actions: c.actions.length, head: c.head, strokes: c.strokes };
      expect(c.choices()).not.toContain(lock);
      expect(c.refusedChoices()).toContain(lock);
      expect(c.refusalOf(lock)).toBe("lock");
      expect(c.tapEdge(lock)).toBe("refused");
      expect([...c.taps]).toEqual(before.taps);
      expect(c.actions.length).toBe(before.actions);
      expect(c.head).toBe(before.head);
      expect(c.strokes).toBe(before.strokes);
      expect(Number.isFinite(c.runsLeft)).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(4);
  });

  it("a backtrack drops the key its move took; Undo and a replay restore the keys held", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const c = make(seed, { keys: 2 });
      const best = ruleSearch(c.walk, c.rule!);
      for (const run of best.route) {
        const before = c.keysHeld;
        if (tap(c, run) === "win") break;
        if (c.keysHeld === before) continue;
        const after = c.keysHeld;
        const actions = c.actions.slice();
        // The replay of the same actions holds the same keys.
        const r = make(seed, { keys: 2 });
        expect(r.replayActions(actions)).toBe(true);
        expect(r.keysHeldMask).toBe(c.keysHeldMask);
        // Undo (the actions but the last) gives the key back.
        const u = make(seed, { keys: 2 });
        expect(u.replayActions(actions.slice(0, -1))).toBe(true);
        expect(u.keysHeld).toBe(before);
        // A backtrack retraces the move and drops the key.
        expect(tap(c, c.arrivalEdge)).toBe("backtrack");
        expect(c.keysHeld).toBe(before);
        expect(after).toBe(before + 1);
        checked++;
        break;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  });

  it("never traps the player without ice: the exit stays reachable from every state a walker reaches", () => {
    for (const rules of [{ keys: 3 }, { keys: 2, oneWay: 0.4 }]) {
      for (const seed of SEEDS) {
        let s = seed;
        const pick = (n: number): number => {
          s = (s * 48271) % 2147483647;
          return s % n;
        };
        for (let walkNo = 0; walkNo < 6; walkNo++) {
          const c = make(seed, rules);
          for (let step = 0; step < 60 && !c.solved; step++) {
            expect(Number.isFinite(c.runsLeft)).toBe(true);
            const ch = c.choices();
            expect(ch.length).toBeGreaterThan(0);
            tap(c, ch[pick(ch.length)]);
          }
        }
      }
    }
  });

  it("composes with ice, the color rule, turnstiles, one-way runs and hidden runs", () => {
    const placedOf = new Map<string, number>();
    for (const seed of [1, 2, 3, 5, 7]) {
      for (const rules of [
        { ice: 0.25, keys: 2 },
        { colorRule: "alternate" as const, keys: 2 },
        { turnstiles: 3, keys: 2 },
        { oneWay: 0.4, keys: 2 },
        { hiddenRuns: 1, keys: 2 },
      ]) {
        const c = make(seed, rules);
        const name = JSON.stringify(rules);
        expect(c.rulesOn).toBe(true);
        const look = c.ruleLook!;
        if (!look.locks) {
          expect(look.placed).toBe(false);
          continue;
        }
        placedOf.set(name, (placedOf.get(name) ?? 0) + 1);
        const colors = "colorRule" in rules ? 3 : 1;
        expect(look.lockDiv).toBe(colors);
        const best = ruleSearch(c.walk, c.rule!);
        expect(best.solvable).toBe(true);
        for (const run of best.route) {
          expect(["advance", "backtrack", "win"]).toContain(tap(c, run));
          expect(c.colorState).toBeLessThan(colors);
        }
        expect(c.solved).toBe(true);
        expect(c.keysHeld).toBe(c.keysTotal);
      }
    }
    // Under the color rule a key must be reachable and leavable in color,
    // so keys may not place at all (as one-way runs may not); the rest place
    // on most seeds.
    for (const [n, k] of placedOf) {
      expect(k).toBeGreaterThanOrEqual(n.includes("colorRule") ? 2 : 4);
    }
    expect(placedOf.size).toBe(5);
  });
});

describe("locks and keys: the shortcut form (K138 slice 3)", () => {
  it("candidates sit on the plain route with a competing key", () => {
    const w = shortcutWalk();
    const found = shortcutCandidates(w);
    expect(found.map((c) => c.run)).toEqual([2]);
    expect(found[0].bypass).toBe(2);
    const at = found[0].keysAt.map((k) => k.vertex).sort();
    expect(at).toContain("K");
    for (const k of found[0].keysAt) {
      expect(k.detour).toBeGreaterThanOrEqual(1);
      expect(k.detour).toBeLessThanOrEqual(found[0].bypass + 2); // slice 3: census-widened
    }
  });
  it("places one key for the route's lock, and the rule reads it", () => {
    const w = shortcutWalk();
    for (const seed of SEEDS) {
      const placed = placeLocks(w, 1, "shortcut", seed);
      if (!placed.layout) continue;
      expect(placed.layout.mode).toBe("shortcut");
      expect(placed.layout.locks.size).toBe(1);
      expect(placed.layout.locks.get(2)).toBe(1);
      expect(placed.layout.keys).toHaveLength(1);
      const r = lockRule(w, placed.layout);
      expect(r.step("B", 2, 0)).toBeNull();
      expect(r.step("B", 2, 1)!.to).toBe("C");
      expect(ruleSearch(w, r).solvable).toBe(true);
      return;
    }
    throw new Error("no seed placed a shortcut lock");
  });
  it("the exit form is untouched by the new mode", () => {
    const w = shortcutWalk();
    expect(lockModeOf("shortcut")).toBe("shortcut");
    expect(lockModeOf("bogus")).toBe("exit");
    const placed = placeLocks(w, 1, "exit", 3);
    if (placed.layout) expect(placed.layout.mode).toBe("exit");
  });
});
