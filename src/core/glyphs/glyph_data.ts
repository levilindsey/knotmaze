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
import { dotLoop, knotsToPath, type Knot } from "./glyph_knots";

const LOW: readonly [number, number] = [5, 6];

/** The fork angle variants the stage 9 fork measurement renders. */
export const FORK_VARIANTS = [0, 15, 30, 45, 60, 90] as const;
export type ForkAngle = (typeof FORK_VARIANTS)[number];

// The upstroke's arrival direction into the i's junction for each fork
// angle: the stem runs along (1, 3); the arrival turns from it by the
// angle (the arms below the junction then open by that angle). The 0
// form is exact: its incoming arm, outgoing arm and stem spur all lie
// on the (1, 3) line, so glyphI builds it as a tangent join, not a fork.
const I_ARRIVAL: Record<ForkAngle, readonly [number, number, number]> = {
  0: [1, 3, 3],
  15: [3, 4, 2],
  30: [1, 1, 5],
  45: [5, 3, 2],
  60: [7, 2, 1],
  90: [4, -1, 2],
};

/** The i in Levi's spur form (call 3), with the fork opened by `fork`°. */
/** K831 follow-up (Levi, 2026-10-23): the default form is the exact
 * tangent join. At J the arriving body arm, the departing body arm
 * and the stem spur are collinear on (1, 3); opened variants remain
 * available for the stage 9 fork measurement. */
export function glyphI(fork: ForkAngle = 0): Glyph {
  const a = I_ARRIVAL[fork];
  // K850 (measured rework): the K847 entry flattened then steepened
  // into J (headings 50 -> 25 -> 71.6 deg: the bump Levi flagged),
  // and the bottom turned at R ~ 5 GU. Now the entry rotates one
  // way from the join line (5, 6) into J along (1, 3) - colinear
  // with the stem spur and with the body's own exit from J along
  // (-1, -3) - and the bottom sweeps at R ~ 19 GU.
  const body: Knot[] = [
    [0, 32, LOW[0], LOW[1], 0, 1.2],
    // The junction J: arrives along the upstroke, leaves down the stem.
    // K831 follow-up: J sits at (22, 50), four GU higher than the first
    // form - at (20, 46) the folded arms could not part to the thread
    // width inside the entry's arc (tangentRoot returned null) and the
    // entry's S into J bottomed at R 5.8 GU.
    [22, 50, a[0], a[1], a[2], 3, -1, -3],
    [18, 29, -1, -3, 2, 3],
    [34, 6, 1, 0, 12, 12],
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
        ...(fork === 0 ? { tangent: true } : {}),
        // K843: the stem leaves J fatter than normal, tapering to its
        // plain width at the dead-end tip.
        // K850: the stem is ~31 GU; K847's 50-long flare was still
        // fat at the tip. 36 reaches plain width just at the tip.
        flare: { peak: 6, len: 36 },
        path: knotsToPath([
          [22, 50, 1, 3, 0, 2],
          [32, 79, 1, 3, 2, 0],
        ]),
      },
    ],
    floats: [],
    // The tittle: a closed ellipse loop (dotLoop), not a segment.
    // Half-axes (2, 6) along the stem's (1, 3) slant and (5, -2)
    // across it: a slightly skewed ellipse leaning with the stem.
    dots: [dotLoop([39, 108], [2, 6], [5, -2])],
    crossings: 0,
  };
}

// The a in Levi's K836 arrangement - tangent attachments to an
// otherwise undisturbed letter shape - re-silhouetted in K847 as a
// single-story cursive a (domed top, apex at the top-right, right
// side descending from it; the K836 oval read as a lumpy
// rounded rectangle). The body enters from the south-west and
// touches the bowl halfway up its left side at L, arriving along
// the bowl's own tangent there; it then traces the bowl over the
// top and down the right side to R and leaves for the exit. The
// bottom arc is one landing spur out of R: down the right side
// (the body's arrival and the spur are one smooth curve through
// R), around the bottom and up the left side to land at L, so the
// inside curve is undisturbed at both junctions and a thin acute
// wedge sits under each. No declared corners. The K831
// form (low BL fork, cornered stem) is retired; A_TANGENT stays as
// the probe fixture.
const A_GLYPH: Glyph = {
  ch: "a",
  entry: { at: [12, 10], dir: [1, 1], kind: "o" },
  exit: { at: [120, 32], dir: LOW, cls: "B" },
  // K847 (the cursive rethink): the silhouette is a single-story
  // cursive a - domed top rising to an apex at the top-right, the
  // right side descending from it - not a plain oval. Every knot's
  // tangent is the curve's own direction there and handles stay
  // near a third of their segment (the K836 form's long handles
  // and flattened top made the lumpy rounded-rectangle Levi
  // rejected). Junction tangents stay as K836 set them: entry
  // tangent at L (0.4, 1), the body and the landing spur one smooth
  // curve through R (0.35, -1).
  // K850 (measured rework, .claude/probes/K850/measure.mts): the
  // K847 form measured a flat top (topmost x=49 of a 28..80 bowl),
  // a vertical right wall, curvature sign flips across the top and
  // a hooked spur approach at L. Here the heading turns one way
  // from L (71.6 deg) through the shoulder to a soft apex in the
  // right third (heading crosses level between the (54, 72) and
  // (71, 67) knots, R ~ 14 GU), then descends the right side to R.
  // Handles sit near a third of their segment throughout.
  body: knotsToPath([
    [12, 10, 1, 2, 0, 3],
    [21, 28, 1, 2, 3, 3],
    // L: halfway up the left side, on the bowl's left curve.
    [31, 45, 1, 3, 2, 2],
    [41, 62, 1, 1, 4, 4],
    [52, 71, 1, 1, 3.5, 3.5],
    [66, 75, 3, -1, 2, 3],
    [80, 52, 0, -1, 9, 6],
    // R: down the right side; the exit leaves down-right (the acute
    // wedge under it), the bottom spur continues down the same line.
    [80, 38, 0, -1, 4, 3, 2, -1],
    [98, 28, 2, -1, 3, 3],
    [120, 32, LOW[0], LOW[1], 1, 0],
  ]),
  spurs: [
    {
      // The oval's bottom arc: out of R, around the bottom, up the
      // left side to land at L along its tangent.
      at: 21,
      land: true,
      landTangent: true,
      // K850: out of R colinear with the body's descent, around a
      // wide bottom (R ~ 20 GU) and up the inside left wall with
      // monotone heading (180 -> 71.6 deg, no hook) to land at L
      // exactly along the body's tangent there.
      path: knotsToPath([
        [80, 38, 0, -1, 0, 6],
        [81, 20, 0, -1, 6, 9],
        [64, 5, -1, 0, 9, 5],
        [45, 3, -1, 0, 9, 9],
        [28, 12, -1, 2, 3, 2],
        [26, 26, 0, 1, 6, 6],
        [31, 45, 1, 3, 2, 0],
      ]),
    },
  ],
  // K843: the stroke leaves both tangent attachments fatter than
  // normal above the junction, tapering to the plain width: upward
  // from L (toward the top) and upward from R (toward the top again -
  // "before" the body's travel down the right side). K847: longer,
  // with the renderer's smooth falloff (they ended way too early).
  // K850: flare lengths match the arcs they dress (L->apex ~ 37 GU,
  // R->apex ~ 32 GU); K847's 46 overshot the apex on both.
  bodyFlares: [
    { at: 6, side: "after", peak: 6, len: 40 },
    { at: 21, side: "before", peak: 6, len: 34 },
  ],
  floats: [],
  crossings: 0,
};

/**
 * The a with its connector LANDING on J from above: the stage 9 kill
 * criterion's closest passing form (a_search.ts in the stage 9 probes). The
 * connector climbs steeply, turns over near (22, 77) and lands on the
 * oval's top heading (2, -1), so its arm opens 27.7 degrees off the oval's
 * (the tangent arrival opens 1: the thorn). Every rule passes at xh 2 and 3,
 * at the same advance. Probe switch `#glyphs2=aland`; Levi's call.
 */
export const A_LANDED: Glyph = {
  // K831: preserved as the pre-K831 form (the connector landing on J
  // from above, the top and stem as crossing spurs) for probe
  // comparison; the new A_GLYPH has no tangent join for it to strip.
  ch: "a",
  entry: { at: [0, 32], dir: LOW, kind: "o" },
  exit: { at: [120, 32], dir: LOW, cls: "B" },
  body: knotsToPath([
    [0, 32, LOW[0], LOW[1], 0, 2],
    [22, 77, 3, 1, 8, 3],
    [46, 72, 2, -1, 3, 14, -1, 0],
    [28, 36, 0, -1, 20, 20],
    [46, 0, 1, 0, 13, 13],
    [66, 24, 1, 4, 3, 6, 1, -2],
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

/**
 * K831: the pre-K831 a, preserved as the tangent-join exemplar: the
 * connector and the oval meet tangentially at J (body index 6) and draw
 * as one tapered root (K580). The K831 a joins at a fork instead, so
 * this form is no longer the authored a; it stays as the fixture the
 * K580/K643 taper tests and calibrations run on, and probe switch
 * `#glyphs2=atangent` builds it.
 */
export const A_TANGENT: Glyph = {
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
      // K580: the connector and the oval meet tangentially at J.
      tangent: true,
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
