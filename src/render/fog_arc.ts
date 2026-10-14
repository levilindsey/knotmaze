// FOG ALONG THE ARC (K99): a move lifts the fog of war at fixed STATIONS
// of its run - every FOG_ARC_STEP ctrl from the departure end, then the
// arrival end - as the dot passes them. The stations a move stamps are
// therefore the same at any frame rate and any move speed; stamping the
// dot's position once per frame (the Stage 25 rule) skipped whatever a
// long frame jumped, and an instant move uncovered only its two ends.
// Pure (no pixi): fabric_maze_renderer.ts turns stations into world stamps.

// Station spacing in ctrl: well under FOG_STAMP_SPACING's 0.8 world at the
// measured 0.45-0.9 lattice units per ctrl, so the spacing filter, not the
// stations, sets the stamp density (exploreRuns samples runs the same).
export const FOG_ARC_STEP = 0.5;

// The stations a dot passes moving from `prev` to `cur` on a run traveled
// from `from` to `to`, in travel order: the grid stations inside the
// traveled interval (prev, cur], plus `to` once `cur` reaches it. Any
// split of one move into frames yields every station exactly once, in
// order (the intervals partition (from, to]). `from` itself is never a
// station - the dot was stamped there at rest before the move began.
export function fogArcStations(
  from: number,
  to: number,
  prev: number,
  cur: number,
  step = FOG_ARC_STEP
): number[] {
  const dir = to >= from ? 1 : -1;
  const total = Math.abs(to - from);
  // Distances traveled from the departure end, clamped to the run.
  const a = Math.min(total, Math.max(0, (prev - from) * dir));
  const b = Math.min(total, Math.max(0, (cur - from) * dir));
  const out: number[] = [];
  if (b <= a) return out;
  // Grid stations strictly inside the run; `to` closes it below. The
  // d > a test, not the start index, decides the interval's open end, so
  // a station exactly at a frame boundary lands once whatever a / step
  // rounds to.
  for (let k = Math.max(1, Math.floor(a / step)); ; k++) {
    const d = k * step;
    if (d >= total || d > b) break;
    if (d > a) out.push(from + dir * d);
  }
  if (b >= total) out.push(to);
  return out;
}
