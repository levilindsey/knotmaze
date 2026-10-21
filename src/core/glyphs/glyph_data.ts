// K115 stage 9: the authored glyph set (docs/design/K115_glyphs.md
// sections 3-6, with Levi's 2026-10-20 answers, section 11). GU, y up:
// 72 per x-height, baseline 0, join line 32. Every low exit and low entry
// meets the join line along (5, 6), so matched joins concatenate exactly
// (the next glyph's entry is placed on the previous exit: G1 exact, no
// connector); a connector cubic is built only where the tangents differ.
//
// Spur forms (calls 3 and 6): the i's stem and the o-kind join meet at a
// JUNCTION where the strokes would overlap; the overlap is one dead-end
// spur. A body corner is allowed only at a spur's junction (the knot's
// second direction).

import type { Glyph } from "./glyph_types";
import { knotsToPath, type Knot } from "./glyph_knots";

const LOW: readonly [number, number] = [5, 6];

/** The fork angle variants the stage 9 fork measurement renders. */
export const FORK_VARIANTS = [0, 15, 30, 45, 60, 90] as const;
export type ForkAngle = (typeof FORK_VARIANTS)[number];

// The upstroke's arrival direction into the i's junction for each fork
// angle: the stem runs along (1, 4); the arrival turns from it by the
// angle (the arms below the junction then open by that angle).
const I_ARRIVAL: Record<ForkAngle, readonly [number, number, number]> = {
  0: [1, 4, 2],
  15: [5, 9, 1],
  30: [1, 1, 5],
  45: [5, 3, 2],
  60: [7, 2, 1],
  90: [4, -1, 2],
};

/** The i in Levi's spur form (call 3), with the fork opened by `fork`°. */
export function glyphI(fork: ForkAngle = 30): Glyph {
  const a = I_ARRIVAL[fork];
  const body: Knot[] = [
    [0, 32, LOW[0], LOW[1], 0, 1],
    // The junction J: arrives along the upstroke, leaves down the stem.
    [16, 50, a[0], a[1], a[2], 6, -1, -4],
    // The round bottom the lint forced (R >= 11 GU, legs >= 0.60 LU apart
    // at xh 2): the first form turned at (18, 2) with R 1.9 GU, the thorn.
    [10, 22, -1, -4, 3, 3],
    [26, 2, 1, 0, 10, 14],
    [58, 32, LOW[0], LOW[1], 2, 0],
  ];
  return {
    ch: "i",
    entry: { at: [0, 32], dir: LOW, kind: "b" },
    exit: { at: [58, 32], dir: LOW, cls: "B" },
    body: knotsToPath(body),
    spurs: [
      {
        at: 3,
        path: knotsToPath([
          [16, 50, 1, 4, 0, 2],
          [23, 78, 1, 4, 2, 0],
        ]),
      },
    ],
    floats: [
      knotsToPath([
        [25, 102, 4, 3, 0, 1],
        [37, 111, 4, 3, 1, 0],
      ]),
    ],
    crossings: 0,
  };
}

// The a in Levi's o-kind form (call 6): the entry connector arches over
// the oval's left shoulder onto J at the top and runs on along the top as
// the spur J-S; the oval leaves J counter-clockwise. Its right side is the
// stem: the closure rises to J2 low on the right, where the tail leaves
// down to the exit, and runs on up the stem's slant as a second spur
// (J2-T) that crosses the first steeply (one crossing). The first form
// (d2a82a9) put J2 above the run-on, so the closure AND the stem crossed
// it (two crossings, and the stem 10 GU from the bowl).
// At xh 2 the rules set the lengths: the crossing sits >= 0.60 LU from J,
// and both tips run on >= 0.56 / sin(theta) LU past it (section 5 rule 3).
const A_GLYPH: Glyph = {
  ch: "a",
  entry: { at: [0, 32], dir: LOW, kind: "o" },
  exit: { at: [120, 32], dir: LOW, cls: "B" },
  body: knotsToPath([
    [0, 32, LOW[0], LOW[1], 0, 2],
    [12, 62, 1, 2, 5, 5],
    // J: the connector arrives heading right; the oval leaves heading left.
    [46, 72, 1, 0, 16, 14, -1, 0],
    [28, 36, 0, -1, 20, 20],
    [46, 0, 1, 0, 13, 13],
    // J2: the closure arrives along the stem's slant; the tail leaves
    // down-right (the fork opens 41 degrees off the closure).
    [66, 24, 1, 4, 3, 6, 1, -2],
    // The tail's round bottom (the lint: R 5.5 GU at the first form's).
    [88, 4, 1, 0, 10, 14],
    [120, 32, LOW[0], LOW[1], 2, 0],
  ]),
  spurs: [
    {
      at: 6,
      path: knotsToPath([
        [46, 72, 1, 0, 0, 18],
        [100, 70, 1, 0, 18, 0],
      ]),
    },
    {
      at: 15,
      path: knotsToPath([
        [66, 24, 1, 4, 0, 3],
        [83, 92, 1, 4, 3, 0],
      ]),
    },
  ],
  floats: [],
  crossings: 1,
};

/** Lead tails: a straight run along the entry or exit tangent. */
export const LEAD_STEPS = 4;

export const GLYPHS: ReadonlyMap<string, Glyph> = new Map<string, Glyph>([
  ["i", glyphI()],
  ["a", A_GLYPH],
]);
