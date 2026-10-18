// K115 stage 6b: authored accent marks for buildTextGraph.
//
// Six marks cover the nine picked precomposed letters (e + U+0301 etc.).
// Each mark is polylines in Hershey units (HU) in a canonical box, on the
// same scale as src/core/hershey_script.ts (x-height 9, baseline y = 9,
// ascender top y = -12, y grows down). Above-mark locals put the box's
// bottom at 0 and its centre at x = 0, extending up (negative y); the
// cedilla puts its top at 0 and hangs down. Half-unit steps are exact in
// binary floating point, so K108 exactness holds without trig.
//
// Sizes (stage 6 brief, picked): acute/grave one diagonal 4 HU across
// with 2 HU rise; circumflex 5 HU wide, 2.5 HU rise; diaeresis two 1x1
// HU dot loops with centres 4 HU apart; tilde 5 HU wide, 1.5 HU
// amplitude; cedilla descends 4 HU with a leftward hook.

export type AccentMark =
  | "acute"
  | "grave"
  | "circumflex"
  | "diaeresis"
  | "tilde"
  | "cedilla";

// Combining codepoint -> authored mark. Combining marks outside this
// table (caron, macron, ring, ...) are dropped by the builder.
export const COMBINING_TO_MARK: Readonly<Record<number, AccentMark>> = {
  0x0300: "grave",
  0x0301: "acute",
  0x0302: "circumflex",
  0x0303: "tilde",
  0x0308: "diaeresis",
  0x0327: "cedilla",
};

export interface MarkPiece {
  pts: Array<[number, number]>;
  closed: boolean;
}

type LPt = [number, number];

// Placed pieces for `mark` centred at cx (HU). For an above mark,
// anchorY is the box bottom (the mark extends from anchorY up). For
// the cedilla, anchorY is the box top at the baseline (it extends
// from anchorY down). A diaeresis yields two closed dot loops, the
// `i` dot's 1x1 HU form; every other mark yields one open polyline.
export function markPieces(
  mark: AccentMark,
  cx: number,
  anchorY: number
): MarkPiece[] {
  const at = (locals: LPt[]): LPt[] =>
    locals.map((p) => [cx + p[0], anchorY + p[1]] as LPt);
  switch (mark) {
    case "acute":
      return [{ pts: at([[-2, 0], [2, -2]]), closed: false }];
    case "grave":
      return [{ pts: at([[-2, -2], [2, 0]]), closed: false }];
    case "circumflex":
      return [{ pts: at([[-2.5, 0], [0, -2.5], [2.5, 0]]), closed: false }];
    case "tilde":
      return [
        {
          pts: at([
            [-2.5, -0.75],
            [-1.25, -1.5],
            [0, -0.75],
            [1.25, 0],
            [2.5, -0.75],
          ]),
          closed: false,
        },
      ];
    case "diaeresis":
      return [
        { pts: at([[-2, -1], [-1.5, -0.5], [-2, 0], [-2.5, -0.5]]), closed: true },
        { pts: at([[2, -1], [2.5, -0.5], [2, 0], [1.5, -0.5]]), closed: true },
      ];
    case "cedilla":
      return [
        {
          pts: at([[0, 0], [1, 1], [1, 2], [0, 3], [-1, 4], [-2, 3]]),
          closed: false,
        },
      ];
  }
}
