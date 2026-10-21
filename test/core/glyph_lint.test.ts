// K115 stage 9: the glyph lint (src/core/glyphs/glyph_lint.ts). Every
// authored glyph passes at xh 2.0 and 3.0, except the known failures listed
// below; synthetic glyphs pin each rule.
import { describe, expect, it } from "vitest";
import { lintGlyph, LINT } from "../../src/core/glyphs/glyph_lint";
import { FORK_VARIANTS, GLYPHS, glyphI } from "../../src/core/glyphs/glyph_data";
import { knotsToPath, type Knot } from "../../src/core/glyphs/glyph_knots";
import type { Glyph } from "../../src/core/glyphs/glyph_types";

/**
 * Known failures: glyph -> the rules it is allowed to break (and only
 * those). The a's o-kind J is a same-way tangent fork: its connector-in and
 * oval-out arms leave J together (1 degree; the thorn on the stills), and
 * at xh 2 the connector's arch runs 0.56 LU from the oval's shoulder. Both
 * wait on Levi's call (docs/design/K115_stage9.md, Handoff).
 */
const KNOWN: Record<string, Record<number, string[]>> = {
  a: { 2: ["fork-angle", "clearance"], 3: ["fork-angle"] },
};

const rulesOf = (g: Glyph, xh: number): string[] => lintGlyph(g, xh).errors.map((e) => e.rule);

/** An arch from (0, 32) to (72, 32), its top at (36, 60). */
function arch(top: Knot = [36, 60, 1, 0, 12, 12], over: Partial<Glyph> = {}): Glyph {
  return {
    ch: "t",
    entry: { at: [0, 32], dir: [5, 6], kind: "b" },
    exit: { at: [72, 32], dir: [5, -6], cls: "B" },
    body: knotsToPath([[0, 32, 5, 6, 0, 3], top, [72, 32, 5, -6, 3, 0]]),
    spurs: [],
    floats: [],
    crossings: 0,
    ...over,
  };
}

describe("glyph lint: the authored set", () => {
  for (const [ch, g] of GLYPHS) {
    for (const xh of [2, 3]) {
      it(`${ch} at xh ${xh}`, () => {
        const r = lintGlyph(g, xh);
        const allowed = KNOWN[ch]?.[xh] ?? [];
        const rules = r.errors.map((e) => e.rule);
        expect(rules.filter((x) => !allowed.includes(x)), JSON.stringify(r.errors)).toEqual([]);
        // A known failure that stops failing must leave the list.
        for (const k of allowed) expect(rules, `${ch} xh ${xh} no longer fails ${k}`).toContain(k);
        expect(r.crossings.length).toBe(g.crossings);
      });
    }
  }

  it("the i's fork variants: under 15 degrees fails the fork rule; 15 to 45 pass", () => {
    for (const f of FORK_VARIANTS) {
      const rules = rulesOf(glyphI(f), 2);
      expect(rules.includes("fork-angle"), `f${f}`).toBe(f < 15);
      if (f >= 15 && f <= 45) expect(rules, `f${f}`).toEqual([]);
    }
  });

  it("the i's fork reaches full clearance within the measured distance", () => {
    for (const xh of [2, 3]) {
      const f = lintGlyph(glyphI(30), xh).forks.find((x) => x.arms[0] === "in" && x.arms[1] === "out")!;
      expect(f.dClearLU).toBeLessThanOrEqual(LINT.forkMaxLU);
      expect(f.dClearLU).toBeGreaterThan(0.9);
    }
  });
});

describe("glyph lint: synthetic rules", () => {
  it("a plain arch passes", () => {
    expect(rulesOf(arch(), 2)).toEqual([]);
    expect(rulesOf(arch(), 3)).toEqual([]);
  });

  it("a tight bend is a radius error", () => {
    expect(rulesOf(arch([36, 60, 1, 0, 2, 2]), 2)).toContain("radius");
  });

  it("a body corner without a spur is a G1 error", () => {
    expect(rulesOf(arch([36, 60, 1, 0, 12, 12, 1, -1]), 2)).toContain("g1");
  });

  it("an undeclared crossing is an error", () => {
    // A loop: up the right side, over, down the left, out: one crossing.
    const loop = arch(undefined, {
      exit: { at: [70, 32], dir: [5, -6], cls: "B" },
      body: knotsToPath([
        [0, 32, 5, 6, 0, 3],
        [50, 70, 0, 1, 12, 12],
        [20, 70, 0, -1, 12, 12],
        [70, 32, 5, -6, 3, 0],
      ]),
    });
    const r = lintGlyph(loop, 2);
    expect(r.crossings.length).toBe(1);
    expect(r.crossings[0].sin).toBeGreaterThan(LINT.sinMin);
    expect(r.errors.map((e) => e.rule)).toContain("declared");
    expect(rulesOf({ ...loop, crossings: 1 }, 2)).not.toContain("declared");
  });

  it("a float tip near a thread is a tip error", () => {
    const near = arch(undefined, { floats: [knotsToPath([[30, 66, 1, 0, 0, 2], [42, 66, 1, 0, 2, 0]])] });
    expect(rulesOf(near, 2)).toContain("tip");
    const far = arch(undefined, { floats: [knotsToPath([[30, 100, 1, 0, 0, 2], [42, 100, 1, 0, 2, 0]])] });
    expect(rulesOf(far, 2)).toEqual([]);
  });

  it("two strokes closer than 0.60 LU are a clearance error at xh 2, not at xh 3", () => {
    // A float along the arch's top, 15 GU above it: 0.42 LU at xh 2, 0.63 at xh 3.
    const par = arch(undefined, { floats: [knotsToPath([[24, 75, 1, 0, 0, 4], [48, 75, 1, 0, 4, 0]])] });
    expect(rulesOf(par, 2)).toContain("clearance");
    expect(rulesOf(par, 3)).toEqual([]);
  });
});