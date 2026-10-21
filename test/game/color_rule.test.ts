import { describe, it, expect } from "vitest";
import {
  colorAllowed,
  colorCount,
  colorRule,
  nextColor,
  obeyAlong,
  placeColors,
  plantRoute,
  type ColorRuleMode,
} from "../../src/game/color_rule";
import { iceRule, placeIce } from "../../src/game/ice";
import { composeRules, exemptRun, ruleRng, ruleSearch } from "../../src/game/rule_search";
import { ruleMaze } from "./rule_fixtures";

// K138 stage 1: the color rule (color_rule.ts).

const MODES: ColorRuleMode[] = ["alternate", "cycle"];

describe("color rule: the rule", () => {
  it("alternate never walks one shade twice in a row; cycle walks 0, 1, 2 in order", () => {
    expect(colorCount("alternate")).toBe(2);
    expect(colorCount("cycle")).toBe(3);
    expect(colorCount("off")).toBe(0);
    // State 0: anything goes.
    for (const c of [0, 1, 2]) {
      expect(colorAllowed("cycle", 0, c)).toBe(true);
      expect(colorAllowed("alternate", 0, c % 2)).toBe(true);
    }
    // alternate: last 0 (state 1) refuses 0, allows 1; last 1 refuses 1.
    expect(colorAllowed("alternate", 1, 0)).toBe(false);
    expect(colorAllowed("alternate", 1, 1)).toBe(true);
    expect(colorAllowed("alternate", 2, 1)).toBe(false);
    expect(colorAllowed("alternate", 2, 0)).toBe(true);
    // cycle: after c comes (c + 1) mod 3 only.
    for (let last = 0; last < 3; last++) {
      for (let c = 0; c < 3; c++) {
        expect(colorAllowed("cycle", last + 1, c)).toBe(c === (last + 1) % 3);
      }
      expect(nextColor("cycle", last + 1)).toBe((last + 1) % 3);
    }
    expect(nextColor("alternate", 2)).toBe(1);
    expect(nextColor("cycle", 0)).toBe(-1);
    // A colorless run always passes.
    expect(colorAllowed("cycle", 2, -1)).toBe(true);
  });

  it("refuses a wrong color, keeps the state over a colorless run, and moves it on", () => {
    const { walk } = ruleMaze(3);
    const colors = new Int8Array(walk.edges.length).fill(-1);
    const r = walk.vertices.get(walk.start)!.edges[0];
    const e = walk.edges[r];
    const rule = colorRule(walk, "alternate", colors);
    expect(rule.states).toBe(3);
    expect(rule.step(walk.start, r, 2)!.state).toBe(2); // colorless: state kept
    colors[r] = 1;
    expect(rule.step(walk.start, r, 2)).toBeNull(); // last 1, this 1
    const m = rule.step(walk.start, r, 1)!; // last 0, this 1
    expect(m.state).toBe(2);
    expect(m.to).toBe(e.va === walk.start ? e.vb : e.va);
    expect(colorRule(walk, "cycle", colors).states).toBe(4);
  });
});

describe("color rule: placement", () => {
  it("the planted route is legal after obeyAlong, on every draw", () => {
    for (const mode of MODES) {
      for (let seed = 1; seed <= 12; seed++) {
        const { walk } = ruleMaze(seed);
        const rng = ruleRng(seed, "test");
        for (let t = 0; t < 4; t++) {
          const colors = new Int8Array(walk.edges.length).fill(-1);
          for (let r = 0; r < walk.edges.length; r++) {
            if (!exemptRun(walk, r)) colors[r] = rng.nextInt(colorCount(mode));
          }
          const route = plantRoute(walk, rng)!;
          expect(route).not.toBeNull();
          obeyAlong(mode, colors, route);
          const rule = colorRule(walk, mode, colors);
          let at = walk.start;
          let state = rule.start;
          for (const r of route) {
            const m = rule.step(at, r, state);
            expect(m).not.toBeNull();
            at = m!.to;
            state = m!.state;
          }
          expect(at).toBe(walk.exit);
          // A simple route: no vertex twice.
          expect(new Set(route).size).toBe(route.length);
        }
      }
    }
  });

  it("colors every core run, no exempt run, and every placement is solvable", () => {
    for (const mode of MODES) {
      let biting = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const { walk } = ruleMaze(seed);
        const p = placeColors(walk, mode, seed);
        expect(p.layout).not.toBeNull();
        expect(p.draws).toBeGreaterThanOrEqual(1);
        for (let r = 0; r < walk.edges.length; r++) {
          const c = p.layout![r];
          if (exemptRun(walk, r)) expect(c).toBe(-1);
          else expect(c >= 0 && c < colorCount(mode)).toBe(true);
        }
        expect(ruleSearch(walk, colorRule(walk, mode, p.layout!)).solvable).toBe(true);
        if (p.bites) biting++;
      }
      expect(biting).toBeGreaterThanOrEqual(9);
    }
  });

  it("gives one layout per seed", () => {
    const { walk } = ruleMaze(6);
    const a = placeColors(walk, "cycle", 41);
    const b = placeColors(walk, "cycle", 41);
    expect([...b.layout!]).toEqual([...a.layout!]);
    expect(placeColors(walk, "off", 41)).toEqual({ layout: null, bites: false, draws: 0 });
  });

  it("skips icy runs and composes with ice", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const { walk, cont } = ruleMaze(seed);
      const ice = placeIce(walk, cont, 0.25, seed);
      const icy = ice.layout!;
      const p = placeColors(walk, "alternate", seed, { cont, icy });
      if (!p.layout) continue; // no solvable draw: the HUD says so
      for (let r = 0; r < walk.edges.length; r++) {
        if (icy[r] === 1) expect(p.layout[r]).toBe(-1);
      }
      const rule = composeRules(iceRule(walk, cont, icy), colorRule(walk, "alternate", p.layout));
      expect(rule.states).toBe(3);
      expect(ruleSearch(walk, rule).solvable).toBe(true);
      // A slide that would end on a run of the wrong shade is refused whole.
      for (const [id, v] of walk.vertices) {
        for (const run of v.edges) {
          const slide = iceRule(walk, cont, icy).step(id, run, 0)!;
          for (let state = 0; state < 3; state++) {
            const m = rule.step(id, run, state);
            let s = state;
            let ok = true;
            for (const r of slide.runs) {
              const c = p.layout[r];
              if (c < 0) continue;
              if (s > 0 && c === s - 1) ok = false;
              s = c + 1;
            }
            expect(m !== null).toBe(ok);
            if (m) expect(m.runs).toEqual(slide.runs);
          }
        }
      }
    }
  });
});
