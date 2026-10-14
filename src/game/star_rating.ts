// K155 STAR RATING: one to three stars for a finished maze, from how far
// the player walked against the shortest route.
//
// THE MEASURE: ratio = walked / optimal. `walked` is every run walked,
// forward and back (FabricMazeController.walkedDist): the path the player
// finished on, plus each run backed out of twice (walked out, walked
// back), plus, in K80's real-time mode, the walk from the entrance again
// after each catch. In memory-trail mode the path already holds everything
// walked (backtracking does not exist there). `optimal` is the walk graph's
// shortest entrance-to-exit route, so 1.0x is a perfect solve.
//
// STARS: one for any finish; two within TWO_STAR_RATIO; three within
// THREE_STAR_RATIO and, in real-time mode, never caught (the re-walk a
// catch forces already counts in the ratio; the cap keeps three stars for
// a clean run). No finite optimal, or nothing walked: no rating.
//
// THRESHOLDS come from simulated solvers over 288 mazes at today's defaults
// and 288 dailies (the table and the solvers: .claude/rules/gameplay.md,
// K155): a careful solver earns three stars nine times in ten, a greedy
// one earns exactly two about half the time.
//
// DISPLAY: the ratio rounds UP to one decimal (ratioShown), so the number
// on screen agrees with the star edges: 1.5x and below is three stars,
// 1.6x is two. A daily's stored result keeps path, optimal and backtrack,
// so its stars derive from the record (ratingForResult), old records too:
// dailies are always turn-based, and nothing new is stored.

export const THREE_STAR_RATIO = 1.5;
export const TWO_STAR_RATIO = 4;
// Float noise at the edges: an exact 1.5x walk is three stars.
const EDGE_EPS = 1e-9;

export type StarCount = 1 | 2 | 3;

export interface StarRating {
  stars: StarCount;
  ratio: number; // walked / optimal
  walked: number; // lattice units, like the HUD's meters
  optimal: number;
  // K80's real-time catches; null in turn-based play.
  catches: number | null;
}

// Every run walked, from a turn-based record: the finished path plus each
// backed-out run twice.
export function walkedOf(path: number, backtrack: number): number {
  return path + 2 * backtrack;
}

export function rateRun(
  walked: number,
  optimal: number,
  catches: number | null = null
): StarRating | null {
  if (!Number.isFinite(optimal) || optimal <= 0) return null;
  if (!Number.isFinite(walked) || walked <= 0) return null;
  const ratio = walked / optimal;
  const caught = catches !== null && catches > 0;
  const stars: StarCount =
    ratio <= THREE_STAR_RATIO + EDGE_EPS && !caught
      ? 3
      : ratio <= TWO_STAR_RATIO + EDGE_EPS
        ? 2
        : 1;
  return { stars, ratio, walked, optimal, catches };
}

// A stored daily result's rating (game/daily_store.ts DailyResult): null
// when a field it needs is missing or unusable, never a throw.
export function ratingForResult(r: unknown): StarRating | null {
  if (typeof r !== "object" || r === null) return null;
  const { path, optimal, backtrack } = r as Record<string, unknown>;
  if (typeof path !== "number" || !Number.isFinite(path) || path <= 0) {
    return null;
  }
  if (typeof backtrack !== "number" || !Number.isFinite(backtrack) || backtrack < 0) {
    return null;
  }
  if (typeof optimal !== "number") return null;
  return rateRun(walkedOf(path, backtrack), optimal);
}

// The ratio as shown: rounded UP to one decimal, never below 1.0.
export function ratioShown(ratio: number): number {
  return Math.max(1, Math.ceil((ratio - EDGE_EPS) * 10) / 10);
}

export function fmtRatio(ratio: number): string {
  return `${ratioShown(ratio).toFixed(1)}×`;
}

// "★★☆": the stars earned, then the ones not.
export function starGlyphs(stars: number): string {
  const n = Math.max(0, Math.min(3, Math.round(stars)));
  return "★".repeat(n) + "☆".repeat(3 - n);
}

// What each star needs (real time adds the no-catch rule).
export function starRules(realtime: boolean): string[] {
  return [
    `★★★ within ${THREE_STAR_RATIO}× the shortest route` +
      (realtime ? ", never caught" : ""),
    `★★ within ${TWO_STAR_RATIO}×`,
    "★ any finish",
  ];
}

// Distances as the HUD shows them (ui/maze_hud.ts fmtDist: x10, whole).
const hudDist = (v: number): string => String(Math.round(v * 10));

// The tap explanation: the rules, then where this run landed.
export function starExplanation(r: StarRating): string[] {
  let landed =
    `You walked ${fmtRatio(r.ratio)} the shortest route: ` +
    `${hudDist(r.walked)} against ${hudDist(r.optimal)}, ` +
    "backtracks counted both ways.";
  // A catch empties the path, so the HUD's path and backtrack no longer
  // add up to the walk: say where the rest went.
  const n = r.catches;
  if (n !== null && n > 0) {
    landed +=
      ` Caught ${n === 1 ? "once" : n === 2 ? "twice" : `${n} times`}: ` +
      `the walk before ${n === 1 ? "it" : "each catch"} counts too.`;
  }
  return [...starRules(r.catches !== null), landed];
}

// The stars' accessible name, e.g. "2 of 3 stars".
export function starLabel(stars: number): string {
  return `${stars} of 3 stars`;
}
