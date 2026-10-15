// MEMORY-TRAIL PAINT SPANS, the pure half of FabricMazeRenderer.buildTrail
// (Stage 23 trail mode, `trl`). Walking back from the visual head, the path
// stays gold for its newest trailLength of lattice length: solid out to the
// fade start, then fading linearly to the section color over the oldest
// TRAIL_FADE_FRAC of that length (K4: linear in p).
//
// K93 (Levi, 2026-10-13: "Trail fade, yes"). A span's paint is linear in
// arc between its two ends, so the one span holding the fade start used to
// fade all the way from its head-side end instead of from the fade start:
// the run whose far part should fade began dimming at the head junction.
// That run is now TWO spans: a solid one from its head-side end, and a
// fading one from the fade start (p 1) to its far end.
//
// The two overlap, and the order matters: each span edge has a one-pixel
// coverage ramp (paint_math kPaintAt), so two spans that merely ABUTTED
// would each cover the shared point by half, and p there would dip to
// 1 - (1 - 0.5)(1 - 0.5) = 0.75 - a one-pixel seam across the thread. So the
// solid span reaches on past the fade start, halfway into the fading part,
// and the fading span is written AFTER it: from half a pixel inside its own
// near end it covers fully and replaces the solid paint, and at its near end
// both say p = 1. Seamless while the fading part spans a pixel or more
// (halfway leaves half a pixel either side); below that it is sub-pixel.

// The oldest fraction of the trail that ramps gold -> section color.
export const TRAIL_FADE_FRAC = 0.3;

// The split is skipped when the fade start lies within this lattice length
// of a piece's end: the plain linear span is then already right.
const SPLIT_EPS = 1e-6;

// One traversed (possibly partial) piece of the path, directed from the
// older end toward the visual head, with its lattice length.
export interface TrailPiece {
  chain: number;
  from: number; // Ctrl at the older end.
  to: number; // Ctrl at the head-side end.
  len: number;
}

// RibbonRenderer's PaintSpan with both intensities set: chain ctrl c0..c1
// (unwrapped, c1 >= c0), gold amount p0 at c0 .. p1 at c1.
export interface TrailSpan {
  chain: number;
  c0: number;
  c1: number;
  p0: number;
  p1: number;
}

// The trail's gold amount at path distance d behind the visual head.
export function trailFade(trailLength: number, frac = TRAIL_FADE_FRAC): (d: number) => number {
  const L = Math.max(1e-6, trailLength);
  const fadeStart = L * (1 - frac);
  return (d: number): number =>
    d <= fadeStart ? 1 : Math.max(0, (L - d) / (L - fadeStart));
}

// A span from ctrl cA (gold pA) to ctrl cB (gold pB), either order.
function spanOf(chain: number, cA: number, pA: number, cB: number, pB: number): TrailSpan {
  return cA <= cB
    ? { chain, c0: cA, c1: cB, p0: pA, p1: pB }
    : { chain, c0: cB, c1: cA, p0: pB, p1: pA };
}

// The trail's spans in WRITE order (oldest first: where consecutive runs
// share a junction sample, the newest, brightest, write wins). `pieces` are
// in path order, the newest last. The oldest included piece keeps only its
// suffix nearest the head (its ctrl span interpolated by the remaining
// budget), and the piece holding the fade start is split (K93, above).
export function trailSpans(
  pieces: readonly TrailPiece[],
  trailLength: number,
  frac = TRAIL_FADE_FRAC
): TrailSpan[] {
  const L = Math.max(1e-6, trailLength);
  const fadeStart = L * (1 - frac);
  const pAt = trailFade(L, frac);
  const spans: TrailSpan[] = [];
  let d = 0; // Path distance behind the visual head.
  for (let i = pieces.length - 1; i >= 0 && d < L; i--) {
    const s = pieces[i];
    if (s.len <= 1e-9) continue;
    const dNear = d;
    let dFar = d + s.len;
    let fromC = s.from;
    if (dFar > L) {
      const keep = (L - dNear) / s.len;
      fromC = s.to - (s.to - s.from) * keep;
      dFar = L;
    }
    if (fadeStart - dNear > SPLIT_EPS && dFar - fadeStart > SPLIT_EPS) {
      // Newest first here (the list is reversed below): the fading span
      // lands AFTER the solid one in write order.
      const cS = s.to - (s.to - s.from) * ((fadeStart - dNear) / s.len);
      spans.push(spanOf(s.chain, cS, 1, fromC, pAt(dFar)));
      spans.push(spanOf(s.chain, s.to, 1, cS + (fromC - cS) * 0.5, 1));
    } else {
      spans.push(spanOf(s.chain, s.to, pAt(dNear), fromC, pAt(dFar)));
    }
    d += s.len;
  }
  spans.reverse();
  return spans;
}
