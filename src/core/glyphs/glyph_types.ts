// K115 stage 9: the authored cubic glyph records (docs/design/K115_glyphs.md
// section 3). Every coordinate is an integer in glyph units (GU), y up:
// 72 GU per x-height, baseline 0, join line 32. A path is P0 followed by
// three points per cubic segment; joints are G1 exact (the in and out
// handles are positive multiples of one primitive integer vector).

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
}

export interface Glyph {
  ch: string;
  /** Where the body starts; dir is the primitive tangent there. */
  entry: { at: Pt; dir: Pt; kind: EntryKind };
  /** Where the body ends; dir is the primitive tangent there. */
  exit: { at: Pt; dir: Pt; cls: ExitClass };
  body: CubicPath;
  spurs: readonly SpurDef[];
  /** Lifted-pen strokes: decorative strands with two free ENDs each. */
  floats: readonly CubicPath[];
  /** Declared proper crossings inside the glyph (body, spurs, floats). */
  crossings: number;
}
