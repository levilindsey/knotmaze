// K115 stage 9: the authored cubic glyph records (docs/design/K115_glyphs.md
// section 3). Every coordinate is an integer in glyph units (GU), y up:
// 72 GU per x-height, baseline 0, join line 32. A path is P0 followed by
// three points per cubic segment; joints are G1 exact (the in and out
// handles are positive multiples of one primitive integer vector).

import type { CornerPin } from "../types";

export type Pt = readonly [number, number];

/** P0, then (P1, P2, P3) per cubic segment. Integers, GU, y up. */
export type CubicPath = readonly Pt[];

export type ExitClass = "B" | "H" | "D";
export type EntryKind = "b" | "o" | "m";

/**
 * A dead-end spur (calls 3 and 6): where two strokes would overlap, they
 * meet at a JUNCTION at the start of the overlap and the overlap is drawn
 * once, as this path from the junction to its free tip.
 */
export interface SpurDef {
  /** Index of the body joint the spur leaves from (a multiple of 3). */
  at: number;
  /** The spur, from the junction (equal to body[at]) to its tip. */
  path: CubicPath;
  /**
   * K580: the body's two strokes meet TANGENTIALLY at the junction (a cusp
   * the spur continues). Under #glyphs2 the spur then starts with a
   * tapered root on the strokes' medial axis (glyph_graph.ts, tangentRoot).
   */
  tangent?: true;
  /**
   * K831: the spur's tip LANDS on the body (its last point is a body
   * joint): the far end is a second junction, not a free END - a stroke
   * landing on another stroke, as cursive strokes land. The builder
   * forces a junction node at both ends; the lint checks the landing
   * like a junction instead of holding the tip 0.56 LU clear.
   */
  land?: true;
  /** K830: force the root junction's wedges round or sharp. */
  cornerPin?: CornerPin;
  /** K830: force a landing spur's far junction's wedges round or sharp. */
  landCornerPin?: CornerPin;
}

export interface Glyph {
  ch: string;
  /** Where the body starts; dir is the primitive tangent there. */
  entry: { at: Pt; dir: Pt; kind: EntryKind };
  /** Where the body ends; dir is the primitive tangent there. */
  exit: { at: Pt; dir: Pt; cls: ExitClass };
  body: CubicPath;
  spurs: readonly SpurDef[];
  /**
   * K831: body joints (point indices, multiples of 3) where the body may
   * turn a CORNER with no spur there - Levi's exception for a letter's
   * skeleton corners (the a's top-right): a sharp cusp the strand turns
   * through, not a filleted junction. The corner still answers to the
   * radius floor. Everywhere else a body corner needs a spur.
   */
  corners?: readonly number[];
  /** Lifted-pen strokes: decorative strands with two free ENDs each. */
  floats: readonly CubicPath[];
  /**
   * K831 follow-up: dots (the i's tittle), drawn by dotLoop as CLOSED
   * decorative loops - no ENDs, no tip or radius rules; the builder
   * emits them as closed strands. Each path's last point is its first.
   */
  dots?: readonly CubicPath[];
  /** Declared proper crossings inside the glyph (body, spurs, floats). */
  crossings: number;
}
