import { describe, it, expect } from "vitest";
import {
  coreRuns,
  iceRule,
  placeIce,
  slide,
  ICE_SHARE_MAX,
} from "../../src/game/ice";
import { exemptRun, meterLength, ruleSearch } from "../../src/game/rule_search";
import { ruleMaze } from "./rule_fixtures";

// K138 stage 1: ice runs (ice.ts).

// Every slide from every vertex obeys the rules of the header.
function checkSlides(seed: number, icy: Uint8Array): { multi: number } {
  const { walk, cont } = ruleMaze(seed);
  let multi = 0;
  for (const [id, v] of walk.vertices) {
    for (const run of v.edges) {
      const s = slide(walk, cont, icy, id, run)!;
      expect(s.runs[0]).toBe(run);
      expect(new Set(s.runs).size).toBe(s.runs.length);
      let d = walk.edges[run].va === id ? 2 * run : 2 * run + 1;
      let at = (d & 1) === 0 ? walk.edges[run].vb : walk.edges[run].va;
      let length = meterLength(walk, run);
      for (let i = 1; i < s.runs.length; i++) {
        // Carried on: the run before was icy, its arrival no stop.
        expect(icy[d >> 1]).toBe(1);
        expect(at).not.toBe(walk.exit);
        expect(walk.vertices.get(at)!.isEnd).toBe(false);
        const next = cont[d ^ 1];
        expect(next >> 1).toBe(s.runs[i]);
        d = next;
        const e = walk.edges[d >> 1];
        at = (d & 1) === 0 ? e.vb : e.va;
        length += meterLength(walk, d >> 1);
      }
      expect(s.to).toBe(at);
      expect(s.length).toBeCloseTo(length, 12);
      // It stopped for a reason.
      const next = cont[d ^ 1];
      const stopped =
        icy[d >> 1] === 0 ||
        at === walk.exit ||
        walk.vertices.get(at)!.isEnd ||
        next < 0 ||
        s.runs.includes(next >> 1);
      expect(stopped).toBe(true);
      if (s.runs.length >= 3) multi++;
    }
  }
  return { multi };
}

describe("ice: the slide", () => {
  it("walks straight on along the strand and stops where the header says", () => {
    let multi = 0;
    for (const seed of [1, 2, 3, 4]) {
      const { walk } = ruleMaze(seed);
      // Every core run icy: the longest slides.
      const icy = new Uint8Array(walk.edges.length);
      for (const r of coreRuns(walk)) icy[r] = 1;
      multi += checkSlides(seed, icy).multi;
      // And a placed layout.
      const placed = placeIce(walk, ruleMaze(seed).cont, 0.5, seed);
      multi += checkSlides(seed, placed.layout!).multi;
    }
    // Slides through two or more junctions happen.
    expect(multi).toBeGreaterThan(0);
  });

  it("is the plain step when nothing is icy, and refuses a run not at the vertex", () => {
    const { walk, cont } = ruleMaze(5);
    const none = new Uint8Array(walk.edges.length);
    const rule = iceRule(walk, cont, none);
    for (const [id, v] of walk.vertices) {
      for (const run of v.edges) {
        const e = walk.edges[run];
        expect(rule.step(id, run, 0)).toEqual({
          runs: [run],
          to: e.va === id ? e.vb : e.va,
          state: 0,
          length: meterLength(walk, run),
        });
      }
    }
    const far = walk.edges.findIndex((e) => e.va !== walk.start && e.vb !== walk.start);
    expect(rule.step(walk.start, far, 0)).toBeNull();
    expect(rule.expands).toBe(true);
  });
});

describe("ice: placement", () => {
  it("never ices an exempt run and ices round(share x core) runs", () => {
    for (const seed of [1, 2, 3, 6, 9]) {
      const { walk, cont } = ruleMaze(seed);
      const core = coreRuns(walk);
      for (const share of [0.1, 0.25, 0.5]) {
        const p = placeIce(walk, cont, share, seed);
        expect(p.layout).not.toBeNull();
        let n = 0;
        for (let r = 0; r < walk.edges.length; r++) {
          if (p.layout![r] === 1) {
            n++;
            expect(exemptRun(walk, r)).toBe(false);
          }
        }
        expect(n).toBe(Math.round(share * core.length));
        expect(ruleSearch(walk, iceRule(walk, cont, p.layout!)).solvable).toBe(true);
        expect(p.draws).toBeGreaterThanOrEqual(1);
        expect(p.draws).toBeLessThanOrEqual(32);
      }
    }
  });

  it("gives one layout per seed and another for another seed", () => {
    const { walk, cont } = ruleMaze(4);
    const a = placeIce(walk, cont, 0.25, 77);
    const b = placeIce(walk, cont, 0.25, 77);
    const c = placeIce(walk, cont, 0.25, 78);
    expect([...b.layout!]).toEqual([...a.layout!]);
    expect(b.draws).toBe(a.draws);
    expect([...c.layout!]).not.toEqual([...a.layout!]);
  });

  it("clamps the share", () => {
    const { walk, cont } = ruleMaze(2);
    const core = coreRuns(walk);
    const zero = placeIce(walk, cont, 0, 1);
    expect(zero).toEqual({ layout: new Uint8Array(walk.edges.length), bites: false, draws: 0 });
    expect(placeIce(walk, cont, -1, 1).draws).toBe(0);
    const big = placeIce(walk, cont, 0.9, 1);
    const n = big.layout!.reduce((a, b) => a + b, 0);
    expect(n).toBe(Math.round(ICE_SHARE_MAX * core.length));
  });

  it("bites on most mazes (the slide changes the best route)", () => {
    let biting = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { walk, cont } = ruleMaze(seed);
      if (placeIce(walk, cont, 0.25, seed).bites) biting++;
    }
    expect(biting).toBeGreaterThanOrEqual(7);
  });
});
