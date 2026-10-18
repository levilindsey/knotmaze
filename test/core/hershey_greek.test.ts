import { describe, expect, it } from "vitest";
import { HERSHEY_GREEK } from "../../src/core/hershey_greek";

// K115 stage 6c: the Greek print table (generated from greek.jhf; the
// generator's re-run identity is a probe-side check, stated in the
// stage handoff, not a unit test). These assert the shipped table's
// integrity and its documented codepoint mapping/gaps.

const CAPITALS: Array<[number, string]> = [
  [0x0391, "Alpha"], [0x0392, "Beta"], [0x0393, "Gamma"], [0x0394, "Delta"],
  [0x0395, "Epsilon"], [0x0396, "Zeta"], [0x0397, "Eta"], [0x0398, "Theta"],
  [0x0399, "Iota"], [0x039a, "Kappa"], [0x039b, "Lambda"], [0x039c, "Mu"],
  [0x039d, "Nu"], [0x039e, "Xi"], [0x039f, "Omicron"], [0x03a0, "Pi"],
  [0x03a1, "Rho"], [0x03a3, "Sigma"], [0x03a4, "Tau"], [0x03a5, "Upsilon"],
  [0x03a6, "Phi"], [0x03a7, "Chi"], [0x03a8, "Psi"], [0x03a9, "Omega"],
];
const LOWERS: Array<[number, string]> = [
  [0x03b1, "alpha"], [0x03b2, "beta"], [0x03b3, "gamma"], [0x03b4, "delta"],
  [0x03b5, "epsilon"], [0x03b6, "zeta"], [0x03b7, "eta"], [0x03b8, "theta"],
  [0x03b9, "iota"], [0x03ba, "kappa"], [0x03bb, "lambda"], [0x03bc, "mu"],
  [0x03bd, "nu"], [0x03be, "xi"], [0x03bf, "omicron"], [0x03c0, "pi"],
  [0x03c1, "rho"], [0x03c3, "sigma"], [0x03c4, "tau"], [0x03c5, "upsilon"],
  [0x03c6, "phi"], [0x03c7, "chi"], [0x03c8, "psi"], [0x03c9, "omega"],
];

describe("HERSHEY_GREEK (K115 stage 6c)", () => {
  it("covers every in-scope letter with strokes and a positive advance", () => {
    // 24 capitals + 24 lowercase + the final-sigma entry.
    expect(Object.keys(HERSHEY_GREEK)).toHaveLength(49);
    for (const [cp] of [...CAPITALS, ...LOWERS]) {
      const glyph = HERSHEY_GREEK[cp];
      expect(glyph, `U+${cp.toString(16)}`).toBeDefined();
      expect(glyph.strokes.length, `U+${cp.toString(16)}`).toBeGreaterThan(0);
      expect(glyph.right - glyph.left, `U+${cp.toString(16)}`).toBeGreaterThan(0);
    }
    expect(HERSHEY_GREEK[0x03c2]).toBeDefined();
  });

  it("is integers only", () => {
    for (const [cp, glyph] of Object.entries(HERSHEY_GREEK)) {
      expect(Number.isInteger(glyph.left), cp).toBe(true);
      expect(Number.isInteger(glyph.right), cp).toBe(true);
      for (const stroke of glyph.strokes) {
        for (const p of stroke) {
          expect(Number.isInteger(p[0]), cp).toBe(true);
          expect(Number.isInteger(p[1]), cp).toBe(true);
        }
      }
    }
  });

  it("pins the transliteration-slot mapping by glyph shape", () => {
    // Slot A (Alpha): two diagonals and a crossbar. Slot C is Chi (an X),
    // slot G is Gamma, slot Q is Theta, slot F is Phi -- the slots are
    // sounds, not alphabet positions (see gen_greek.mjs).
    expect(HERSHEY_GREEK[0x0391].strokes).toEqual([
      [[0, -12], [-8, 9]],
      [[0, -12], [8, 9]],
      [[-5, 2], [5, 2]],
    ]);
    expect(HERSHEY_GREEK[0x03a7].strokes).toEqual([
      [[-7, -12], [7, 9]],
      [[-7, 9], [7, -12]],
    ]);
    expect(HERSHEY_GREEK[0x0393].strokes).toEqual([
      [[-6, -12], [-6, 9]],
      [[-6, -12], [6, -12]],
    ]);
    expect(HERSHEY_GREEK[0x039e].strokes).toEqual([
      [[-7, -12], [7, -12]],
      [[-3, -2], [3, -2]],
      [[-7, 9], [7, 9]],
    ]);
  });

  it("documents its gaps instead of inventing glyphs", () => {
    // Dialytika codepoints have no glyph in greek.jhf; their NFD bases
    // ship bare (builder-tested in text_graph.test.ts).
    for (const cp of [0x03aa, 0x03ab, 0x03ca, 0x03cb]) {
      expect(HERSHEY_GREEK[cp], `U+${cp.toString(16)}`).toBeUndefined();
    }
    // Final sigma reuses the medial glyph: greek.jhf has no distinct
    // final-sigma strokes, so both entries are the slot-s data.
    expect(HERSHEY_GREEK[0x03c2]).toEqual(HERSHEY_GREEK[0x03c3]);
    expect(HERSHEY_GREEK[0x03c2].strokes.length).toBeGreaterThan(0);
  });
});
