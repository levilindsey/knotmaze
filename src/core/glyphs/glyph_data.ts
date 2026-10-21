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
    [16, 50, a[0], a[1], a[2], 5, -1, -4],
    [18, 2, 1, 0, 6, 8],
    [40, 32, LOW[0], LOW[1], 2, 0],
  ];
  return {
    ch: "i",
    entry: { at: [0, 32], dir: LOW, kind: "b" },
    exit: { at: [40, 32], dir: LOW, cls: "B" },
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
// the spur J-S; the oval leaves J counter-clockwise, rises on the right
// inside the spur's arc and crosses it steeply, up to the stem's top; the
// stem's retrace is a second spur (J2-T).
const A_GLYPH: Glyph = {
  ch: "a",
  entry: { at: [0, 32], dir: LOW, kind: "o" },
  exit: { at: [98, 32], dir: LOW, cls: "B" },
  body: knotsToPath([
    [0, 32, LOW[0], LOW[1], 0, 2],
    [12, 62, 1, 2, 4, 4],
    // J: the connector arrives heading right; the oval leaves heading left.
    [46, 72, 1, 0, 16, 10, -1, 0],
    [28, 36, 0, -1, 20, 20],
    [46, 0, 1, 0, 9, 9],
    [62, 34, 0, 1, 18, 10],
    // J2: the closure arrives up-right; the stem leaves down.
    [74, 76, 1, 3, 4, 8, 0, -1],
    [78, 4, 1, 0, 8, 8],
    [98, 32, LOW[0], LOW[1], 2, 0],
  ]),
  spurs: [
    {
      at: 6,
      path: knotsToPath([
        [46, 72, 1, 0, 0, 14],
        [88, 46, 1, -2, 6, 0],
      ]),
    },
    {
      at: 18,
      path: knotsToPath([
        [74, 76, 1, 3, 0, 2],
        [78, 88, 1, 3, 2, 0],
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
