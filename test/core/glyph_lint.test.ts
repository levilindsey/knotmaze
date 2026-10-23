// K115 stage 9: the glyph lint (src/core/glyphs/glyph_lint.ts). Every
// authored glyph passes at xh 2.0 and 3.0, except the known failures listed
// below; synthetic glyphs pin each rule.
import { describe, expect, it } from "vitest";
import { lintGlyph, LINT } from "../../src/core/glyphs/glyph_lint";
import { A_LANDED, A_TANGENT, FORK_VARIANTS, GLYPHS, glyphI } from "../../src/core/glyphs/glyph_data";
import { knotsToPath, type Knot } from "../../src/core/glyphs/glyph_knots";
import { buildGlyphGraph, TAPER_PART_LU } from "../../src/core/glyphs/glyph_graph";
import { widenCrotch } from "../../src/core/glyphs/glyph_inject";
import type { Glyph } from "../../src/core/glyphs/glyph_types";
import { buildTextGraph } from "../../src/core/text_graph";

/**
 * Known failures: glyph -> the rules it is allowed to break (and only
 * those). None today. K580: the preserved A_TANGENT exemplar's o-kind J
 * is a TANGENT join (its connector-in and oval-out arms leave J together
 * and draw as one tapered root), so the fork and crotch-clearance rules
 * give way to the taper checks. Stage 1's equal-arc root failed taper-g1
 * at xh 2 (0.022 LU out of the strokes at R); stage 2's medial root stays
 * inside at both sizes (docs/design/K580_s2.md). The K831 a joins at a
 * fork instead; A_TANGENT keeps the tangent machinery calibrated.
 */
const KNOWN: Record<string, Record<number, string[]>> = {};

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

  it("the i's fork variants: 0 is the exact tangent join; 15 to 45 pass as forks", () => {
    // K831 follow-up: fork 0 is no longer a failed fork - it is the
    // shipped tangent join (Levi: entry, exit and stem collinear at J),
    // judged by the taper rules instead, and clean at xh 2.
    for (const f of FORK_VARIANTS) {
      const rules = rulesOf(glyphI(f), 2);
      expect(rules.includes("fork-angle"), `f${f}`).toBe(false);
      if (f === 0 || (f >= 15 && f <= 45)) expect(rules, `f${f}`).toEqual([]);
    }
  });

  it("the a's landed J (the kill criterion's closest form) passes every rule", () => {
    for (const xh of [2, 3]) {
      const r = lintGlyph(A_LANDED, xh);
      expect(r.errors, JSON.stringify(r.errors)).toEqual([]);
      expect(r.crossings.length).toBe(A_LANDED.crossings);
      const j = r.forks.find((f) => f.junction === 6 && f.cos > 0)!;
      expect(j.cos).toBeLessThan(LINT.forkMinCos);
      expect(j.dClearLU).toBeLessThanOrEqual(LINT.forkMaxLU);
      // No tangent spur, so no taper and no waived rule.
      expect(r.tapers).toEqual([]);
    }
  });

  it("K580: the tangent exemplar's root parts, tapers monotonically from double width and closes its crotch in time", () => {
    for (const xh of [2, 3]) {
      const r = lintGlyph(A_TANGENT, xh);
      expect(r.tapers.map((t) => t.junction), `xh ${xh}`).toEqual([6]);
      const t = r.tapers[0];
      expect(t.monotone).toBe(true);
      // The root leaves R at least at the strokes' combined width (their
      // inner edges touch there): 2.01 at xh 2, 2.15 at xh 3.
      expect(t.mR).toBeGreaterThanOrEqual(2 - 1e-6);
      expect(t.mR).toBeLessThanOrEqual(2.3);
      expect(t.aRLU).toBeGreaterThan(0);
      expect(t.bRLU).toBeGreaterThan(0);
      expect(t.partLU).toBeGreaterThanOrEqual(t.aRLU);
      expect(t.crotchLU).toBeLessThanOrEqual(LINT.forkMaxLU);
      // The ribbons stop overlapping by R (stage 1: 0.26 LU past it at xh 2).
      expect(t.overlapLU).toBeLessThanOrEqual(0);
      // The waived rules stay waived: the crotch is the taper's to judge.
      const rules = r.errors.map((e) => e.rule);
      expect(rules).not.toContain("fork-angle");
      expect(rules).not.toContain("clearance");
    }
  });

  it("K580: the medial root's outline stays inside the strokes; its far side sinks in a little", () => {
    for (const xh of [2, 3]) {
      const t = lintGlyph(A_TANGENT, xh).tapers[0];
      expect(t.bulgeLU, `xh ${xh}`).toBeLessThanOrEqual(LINT.taperBulgeLU);
      // The nearer outer edge bounds the width, so the other side lies
      // inside O's ribbon: 0.053 LU at xh 2, 0.049 at xh 3.
      expect(t.insetLU, `xh ${xh}`).toBeGreaterThan(0);
      expect(t.insetLU, `xh ${xh}`).toBeLessThanOrEqual(0.1);
    }
  });

  it("K643: the lint judges the taper at the part it is given", () => {
    const a = A_TANGENT;
    for (const xh of [2, 3]) {
      expect(lintGlyph(a, xh, TAPER_PART_LU), `xh ${xh}`).toEqual(lintGlyph(a, xh));
      const t52 = lintGlyph(a, xh, 0.52).tapers[0];
      const r60 = lintGlyph(a, xh, 0.6);
      const t60 = r60.tapers[0];
      expect(r60.errors, `xh ${xh}`).toEqual([]);
      // Parting at 0.6 LU (the K580 `tp60` build) moves R out along the
      // strokes and leaves less crotch: 0.64 -> 0.04 LU at xh 2, 0.27 -> 0.17 at xh 3.
      expect(t60.aRLU, `xh ${xh}`).toBeGreaterThan(t52.aRLU);
      expect(t60.crotchLU, `xh ${xh}`).toBeLessThan(t52.crotchLU);
    }
  });

  it("K643: an injected bulge past taperBulgeLU fails taper-g1", () => {
    const a = A_TANGENT;
    for (const xh of [2, 3]) {
      const under = lintGlyph(a, xh, TAPER_PART_LU, 0.9 * LINT.taperBulgeLU);
      expect(under.errors, `xh ${xh}`).toEqual([]);
      // The lint reads the bump a little under its height (0.95-0.97 of it).
      expect(under.tapers[0].bulgeLU).toBeGreaterThan(0.8 * LINT.taperBulgeLU);
      const over = lintGlyph(a, xh, TAPER_PART_LU, 1.5 * LINT.taperBulgeLU);
      expect(over.errors.map((e) => e.rule), `xh ${xh}`).toContain("taper-g1");
    }
  });

  it("K643: widenCrotch lengthens the tangent exemplar's crotch and keeps it lint-clean", () => {
    const a = A_TANGENT;
    // The smooth range (K643 Handoff): 0.64 -> 0.67 LU at xh 2, 0.27 -> 0.79 at xh 3.
    const cases: Array<[number, number, number]> = [
      [2, 0.4, 0.66],
      [3, 1.2, 0.78],
    ];
    for (const [xh, hold, min] of cases) {
      const r = lintGlyph(widenCrotch(a, xh, hold), xh);
      expect(r.errors, `xh ${xh}`).toEqual([]);
      expect(r.tapers.length).toBe(1);
      expect(r.tapers[0].crotchLU, `xh ${xh}`).toBeGreaterThan(min);
      expect(r.tapers[0].crotchLU).toBeGreaterThan(lintGlyph(a, xh).tapers[0].crotchLU);
    }
    // Past it the release down C bends tighter than the radius rule allows.
    expect(rulesOf(widenCrotch(a, 3, 1.6), 3)).toContain("radius");
  });

  it("K643: the probe flags build changed glyphs, and nothing when absent", () => {
    const key = (text: string, g2: string) => {
      const g = buildTextGraph(text, { glyphs2: g2 });
      return JSON.stringify([[...g.nodes.values()], g.strands]);
    };
    for (const text of ["a", "ai"]) {
      // The flags act on tangent joins; the K831 a has none, so they are
      // exercised on the preserved tangent exemplar (`atangent`).
      expect(key(text, "1,atangent,bulge0,crotch0x")).toBe(key(text, "1,atangent"));
      expect(key(text, "1,atangent,bulge0.02")).not.toBe(key(text, "1,atangent"));
      expect(key(text, "1,atangent,crotch1.2")).not.toBe(key(text, "1,atangent"));
    }
    // K831 follow-up: the shipped i now carries a tangent join of its
    // own, so on "ai" the bulge flag acts (through the i's root), while
    // on "a" alone - no tangent join - it still changes nothing.
    expect(key("a", "1,bulge0.02")).toBe(key("a", "1"));
    expect(key("ai", "1,bulge0.02")).not.toBe(key("ai", "1"));
  });

  it("K831 follow-up: the i's dot builds as one closed decorative strand with no ENDs", () => {
    const b = buildGlyphGraph("ai", { xHeight: 2 })!;
    const closed = b.graph.strands.filter((s) => s.isClosed);
    expect(closed.length).toBe(1);
    const dot = closed[0];
    expect(dot.decorative).toBe(true);
    expect(dot.edgeIds.length).toBe(dot.nodes.length);
    // The dot adds no END nodes: lead in/out plus the i's spur tip
    // (the a's spur lands on the body - no free tip).
    expect(b.stats.ends).toBe(3);
    expect(b.stats.floats).toBe(0);
  });

  it("the i's fork reaches full clearance within the measured distance", () => {
    for (const xh of [2, 3]) {
      const f = lintGlyph(glyphI(30), xh).forks.find((x) => x.arms[0] === "in" && x.arms[1] === "out")!;
      expect(f.dClearLU).toBeLessThanOrEqual(LINT.forkMaxLU);
      // K831 follow-up: J moved up to (22, 50); the 30-degree fork now
      // measures 0.854 LU - still well inside forkMaxLU (1.2).
      expect(f.dClearLU).toBeGreaterThan(0.8);
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