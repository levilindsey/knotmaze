// K155 STAR RATING: one to three stars for a finished maze, from how far
// the player walked against the shortest route.
//
// THE MEASURE: ratio = walked / optimal. `walked` is every run walked,
// forward and back (FabricMazeController.walkedDist): the path the player
// finished on, plus each run backed out of twice (walked out, walked
// back), plus, under a K80 minotaur (real time or turns), the walk from
// the entrance again after each catch. A level restart (a catch under
// minoRestart, or a Reset path) starts the walk over while the catches
// carry, so `walkedCatches` says how many catches' walks it holds and the
// explanation says what is rated (K293 (a), K80 turns stage 3a). In
// memory-trail mode the path already holds everything walked (backtracking
// does not exist there). `optimal` is the walk graph's shortest
// entrance-to-exit route, so 1.0x is a perfect solve.
//
// STARS: one for any finish; two within TWO_STAR_RATIO; three within
// THREE_STAR_RATIO and, under a minotaur, never caught (the re-walk a
// catch forces already counts in the ratio; the cap keeps three stars for
// a clean run, and counts every catch, a restarted one too). No finite
// optimal, or nothing walked: no rating.
//
// THRESHOLDS come from simulated solvers over 288 mazes at today's defaults
// and 288 dailies (the table and the solvers: .claude/rules/gameplay-stars.md,
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
  // A K80 minotaur's catches (either clock); null without a minotaur.
  catches: number | null;
  // Of those, the catches whose walk `walked` holds: the ones since the
  // level last started over (0..catches; null without a minotaur).
  walkedCatches: number | null;
  // K114 walker: Lead the walker's cuts against its par (absent: a walk
  // rating). The walker walked, not you, so a Lead rating holds no walk:
  // ratio is NaN and walked / optimal 0, and the explanation reads this.
  // K713: `upper` true when par is an upper bound (its search ran past the
  // budget); the explanation then says "par is at most P".
  cuts?: { cuts: number; par: number; upper?: true };
}

// K114 walker, Lead the walker (the brief's call 4): three stars at par or
// under (an upper-bound par can be beaten), two one cut over, one beyond.
// No rating for a count that is not a whole number >= 0. `upper` (K713)
// marks an upper-bound par; it changes the explanation, not the stars.
export function rateCuts(cuts: number, par: number, upper = false): StarRating | null {
  if (!Number.isInteger(cuts) || cuts < 0) return null;
  if (!Number.isInteger(par) || par < 0) return null;
  const stars: StarCount = cuts <= par ? 3 : cuts === par + 1 ? 2 : 1;
  return {
    stars,
    ratio: Number.NaN,
    walked: 0,
    optimal: 0,
    catches: null,
    walkedCatches: null,
    cuts: upper ? { cuts, par, upper: true } : { cuts, par },
  };
}

// What each of Lead's stars needs.
export function cutRules(): string[] {
  return [
    "★★★ at par: the fewest cuts that lead the walker out",
    "★★ one cut over par",
    "★ any finish",
  ];
}

// Every run walked, from a turn-based record: the finished path plus each
// backed-out run twice.
export function walkedOf(path: number, backtrack: number): number {
  return path + 2 * backtrack;
}

// `walkedCatches`: how many of the catches the walk holds (the controller's
// `respawns`); by default all of them. Clamped to 0..catches.
export function rateRun(
  walked: number,
  optimal: number,
  catches: number | null = null,
  walkedCatches: number | null = catches
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
  const inWalk =
    catches === null
      ? null
      : Math.max(0, Math.min(catches, walkedCatches ?? catches));
  return { stars, ratio, walked, optimal, catches, walkedCatches: inWalk };
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
const times = (n: number): string =>
  n === 1 ? "once" : n === 2 ? "twice" : `${n} times`;

// The tap explanation: the rules, then where this run landed.
export function starExplanation(r: StarRating): string[] {
  if (r.cuts) {
    const { cuts, par, upper } = r.cuts;
    return [
      ...cutRules(),
      `You led the walker out with ${cuts === 1 ? "1 cut" : `${cuts} cuts`}; ` +
        `par is ${upper ? `at most ${par}` : par}.`,
    ];
  }
  let landed =
    `You walked ${fmtRatio(r.ratio)} the shortest route: ` +
    `${hudDist(r.walked)} against ${hudDist(r.optimal)}, ` +
    "backtracks counted both ways.";
  // A catch empties the path, so the HUD's path and backtrack no longer
  // add up to the walk: say where the rest went. A level restart starts
  // the walk over (K293 (a)): then say only the walk since counts.
  const n = r.catches;
  if (n !== null && n > 0) {
    const k = r.walkedCatches ?? n;
    landed += ` Caught ${times(n)}`;
    if (k >= n) {
      landed += `: the walk before ${n === 1 ? "it" : "each catch"} counts too.`;
    } else if (k <= 0) {
      landed += ": only the walk since the level last started over counts.";
    } else {
      landed +=
        `, ${times(k)} since the level last started over: only the walk ` +
        `since then counts, the walk before ${k === 1 ? "that catch" : "those catches"} included.`;
    }
  }
  return [...starRules(r.catches !== null), landed];
}

// The stars' accessible name, e.g. "2 of 3 stars".
export function starLabel(stars: number): string {
  return `${stars} of 3 stars`;
}
