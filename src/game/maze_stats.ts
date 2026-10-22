// MAZE STATS (K19): the solve metrics beside the path and backtrack meters,
// and their exact definitions. Distances are lattice arc (walk-graph run
// lengths), like the existing meters.
//
// - TIME: wall-clock milliseconds from the first move (the first accepted
//   tap - always the entrance run) to the dot's ARRIVAL at the exit, with
//   the time the page spent hidden left out (SolveClock). Reset path and a
//   rebuild reset it; it does not run before the first move. A DAILY
//   attempt (K47) is saved instead: a reload or a rebuild resumes it, and
//   its Reset path backtracks to the entrance with the clock running.
// - EFFICIENCY: optimal / path, where path is the route you ended on (the
//   current-path meter at the exit) - so backtracked detours do not lower
//   it (the backtrack meter prices them separately, as designed in Stage
//   8); in trail mode, which has no backtracking, path is everything you
//   walked. Defined only for a finished route: the HUD shows it after the
//   solve. Shown as a whole percent rounded DOWN, so 100% means optimal.
// - JUNCTIONS: distinct junction vertices your position has reached
//   (revisits and backtracking onto them do not count again).
// - DEAD ENDS: distinct dead-end tips reached - END vertices that are
//   neither the entrance nor the exit. Counted only while the deadEnds
//   param is on (the HUD hides the row otherwise).
// - MOVES (the share grid): one letter per accepted tap - "g" a step along
//   a shortest route to the exit (run length + the far vertex's distance
//   to the exit equals the near vertex's), "d" any other advance (a
//   detour), "b" a backtrack; "x" (K80 turns stage 2) the move a minotaur
//   caught you on (FabricMazeController.markCaught: it replaces that
//   move's letter; a turn-clock wait you were caught on, otherwise not
//   logged, adds one). replay(taps) never writes "x": a minotaur's maze is
//   never a daily, so nothing replays it.

export type MoveKind = "g" | "d" | "b" | "x";

// WHAT EACH FIGURE MEANS (K274): the label and one plain line for every row
// the win banner, the Burnt banner and the HUD can show, keyed by the row's
// id (ui/maze_hud.ts builds every row from this table, so a row cannot name
// a stat that has no line). The banners' info popover prints the lines of
// the rows it shows, under the stars' rules, and the daily stats view's
// legend reuses time's and efficiency's. test/ui/maze_hud.test.ts fails when
// a row has no line or a line has no row: a stage that adds a stat adds it
// here, with the line, in the same commit. Each line is written from the
// definition named beside it - change one only with the other.
export type StatId =
  | "time"
  | "path"
  | "efficiency"
  | "backtracked"
  | "junctions"
  | "deadEnds"
  | "caught"
  | "closeCalls"
  | "seen"
  | "chased"
  | "restarts"
  | "fireLead"
  | "closestCall"
  | "walked"
  | "snapped"
  | "par"
  | "strokes"
  | "collapsed"
  | "cuts"
  | "hearts"
  | "walker"
  | "sword"
  | "sprint"
  | "woken"
  | "lures" // K137 stage 4
  | "snares"
  | "spool"
  | "spoolUsed"
  | "hints"
  | "hintsUsed"
  // K138: the rules row (stage 1's ice and color rule), the turnstiles and
  // the hidden runs (stage 2).
  | "rules"
  | "turnstiles"
  | "hidden"
  // K138 stage 3: the one-way runs.
  | "oneWay"
  // K138 stage 4: the keys.
  | "keys"
  // K137 s5: the muddy runs laid.
  | "muddy";

export const STATS: Record<StatId, { label: string; line: string }> = {
  // TIME above (SolveClock). The Burnt banner shows it too, for a run the
  // fire ended, so it says "the end of the run".
  time: {
    label: "time",
    line: "From your first move to the end of the run. Time the page spends hidden does not count.",
  },
  // path = FabricMazeController.pathLength (the stack from the entrance to
  // the head, a backed-out run popped); optimal = WalkGraph.optimalLength.
  path: {
    label: "path / optimal",
    line:
      "The length of the route you ended on, then of the shortest route " +
      "from the entrance to the exit, in the game's own units. A run you " +
      "backed out of is not part of your route.",
  },
  // EFFICIENCY above (efficiencyOf, efficiencyPercent): optimal / the route
  // you ended on, so a wander that was walked back reads 100% while the
  // stars (star_rating.ts walkedOf) count every step, backtracks twice.
  efficiency: {
    label: "efficiency",
    line:
      "The shortest route divided by the route you ended on, rounded down. " +
      "Backing out of a wrong turn erases it from your route, so a wander " +
      "you walked back can still read 100%, while the stars count every " +
      "step. With the memory trail on nothing is erased.",
  },
  // FabricMazeController.backtrackDist: the length of every retracted run,
  // summed over the attempt (a K80 catch keeps it; reset() zeroes it).
  backtracked: {
    label: "backtracked",
    line:
      "The total length of the runs you walked back out of, added up over " +
      "the attempt. The stars count each of them twice, out and back.",
  },
  // JUNCTIONS above (FabricMazeController.visitedJunctions).
  junctions: {
    label: "junctions",
    line:
      "How many different junctions you have reached. Coming back to one " +
      "does not count it again, and the entrance and exit are not junctions.",
  },
  // DEAD ENDS above (FabricMazeController.deadEndTips).
  deadEnds: {
    label: "dead ends",
    line:
      "How many different dead ends you have reached. The entrance and the " +
      "exit are not dead ends.",
  },
  // MinotaurChase.catches / TurnMinotaur.catches (K80); the cap is
  // star_rating.ts rateRun (any catch: at most two stars). K273: with the
  // level reset on a catch (minoRestart) a catch is restartSolve(true), whose
  // reset() zeroes the walked meter, and the count carries over (carry()).
  caught: {
    label: "caught",
    line:
      "How many times the minotaur has caught you. Each catch sends you " +
      "back to the entrance, or starts the maze over if a catch resets " +
      "the level, and the count carries on. Any catch caps the stars at two.",
  },
  // TurnMinotaur.closeCalls (turn clock only): a move ("moved", no catch,
  // no win) after whose minotaur turn you stand off the start exactly one
  // run (hop) from it, once it has left its lair.
  closeCalls: {
    label: "close calls",
    line:
      "How many of your moves ended one run away from the minotaur " +
      "without it catching you.",
  },
  // TurnMinotaur.seen (turn clock only): the turns it spent hunting you,
  // the turns its marker glows red (the stalker while you are off the
  // start, the others while their committed mode is hunt or check).
  seen: {
    label: "seen",
    line:
      "How many turns the minotaur spent hunting you, the turns it glowed " +
      "red, added up over the run.",
  },
  // MinotaurChase.huntSeconds (real time only): the ticks spent in "hunt",
  // which begins within detectStart and ends beyond detectEnd (thread
  // distance) or at a catch.
  chased: {
    label: "chased",
    line:
      "How long the minotaur spent hunting you, added up over the run. A " +
      "hunt starts when you come close enough along the threads for it to " +
      "notice you, and ends when you get clear of it, it catches you or " +
      "you finish.",
  },
  // MinotaurChase.restarts / TurnMinotaur.restarts (K80 turns section
  // 2.10): Reset path while a minotaur is out and the maze unsolved, after
  // at least one move. Shown only when above 0.
  restarts: {
    label: "restarts",
    line:
      "How many times you started the maze over with Reset path while the " +
      "minotaur was out. A restart is not a catch.",
  },
  // game/fire.ts fireLead: T(v) - L, with T(v) = delay + d(v) / speed and
  // L = walkedDist. HUD only while the race runs (the banners show the
  // closest call), so the closest call's popover carries this line too
  // (explainedStats).
  fireLead: {
    label: "fire lead",
    line:
      "How much further you can walk before the fire reaches the junction " +
      "you stand at. The fire spreads only as you walk, backing up included.",
  },
  // FabricMazeController.fireClosest: the least lead over every arrival.
  closestCall: {
    label: "closest call",
    line:
      "The smallest fire lead you had on any arrival, the exit included. " +
      "The nearer to 0, the closer the fire came.",
  },
  // FabricMazeController.walkedDist: every run walked, forward and back; it
  // is the fire's clock (game/fire.ts) and the stars' measure.
  walked: {
    label: "walked",
    line:
      "Every run you walked this attempt, forward and back. The fire's " +
      "clock runs on it, not on time.",
  },
  // K137: FabricMazeController.brokenRuns() (game/fragile.ts: snap breaks a
  // run at its first crossing, crack at its second).
  snapped: {
    label: "snapped",
    line:
      "Runs that broke behind you. Under snap a run breaks the first time " +
      "you cross it, under crack the second; a broken run is gone for the " +
      "rest of the attempt.",
  },
  // K137: game/par.ts parFor (the fewest runs to the exit plus the slack)
  // and strokesLeft, under strict par.
  par: {
    label: "par",
    line:
      "The moves this maze allows (the fewest runs from the entrance to the " +
      "exit, plus some slack), then how many are left. Every run walked is " +
      "a move, backing up included; once the exit is more runs away than " +
      "you have moves left, the attempt is lost.",
  },
  // K137: FabricMazeController.strokes against par, in the strokes mode.
  strokes: {
    label: "strokes",
    line:
      "Your moves so far against par, the moves this maze allows (the " +
      "fewest runs from the entrance to the exit, plus some slack). Every " +
      "run walked is a move, backing up included; going over par still " +
      "finishes, and the share says by how much.",
  },
  // K139: FabricMazeController.collapsePercent (game/collapse.ts
  // sharePercent of the collapsed units) against collapsePar (the longest
  // trail the step-budgeted search found; parText, ">=" once it gave up).
  collapsed: {
    label: "collapsed",
    line:
      "How much of the maze's thread has collapsed behind you, by length, " +
      "rounded down, then par: the most one walk can collapse (reaching the " +
      "finish, unless the game is free). A ≥ means the search for par " +
      "stopped early, so the true best may be higher.",
  },
  // K114: FabricMazeController.cutCount (game/cut.ts), while the cut is on.
  cuts: {
    label: "cuts",
    line:
      "Runs you cut with the scissors. A cut deletes a whole run for the " +
      "rest of the attempt; a junction left with two runs is no choice any " +
      "more, so a move through it carries on. A cut that would leave no way " +
      "to the exit is refused. When you lead the walker, par is the fewest " +
      "cuts that bring it to the exit.",
  },
  // K114 walker: Delay's walker, FabricMazeController.taps.length (the
  // runs it has walked) against delayRoute's length on the uncut maze
  // (game/walker.ts).
  walker: {
    label: "walker",
    line:
      "Runs the walker has walked so far, then the shortest walk it wanted, " +
      "from the entrance to the exit on the uncut maze. The longer you keep " +
      "it from the exit, the better.",
  },
  // K137 stage 3a: main.ts's heartsLeft of livesOf(lives) (game/lives.ts),
  // while lives are on under a minotaur.
  hearts: {
    label: "hearts",
    line:
      "Hearts left, of the lives you started with. Each catch costs one " +
      "and sends you back to the entrance; losing the last starts the level " +
      "over with every heart back, and your catches still count.",
  },
  // K137 stage 3b: the sword's SwordState (game/sword.ts) on either clock,
  // while the sword is on and was laid down.
  sword: {
    label: "sword",
    line:
      "The sword: ready until you walk onto it, then the moves the minotaur " +
      "still flees you (runs walked in real time). Touch it while it flees: " +
      "timed sends it back to its lair, one use slays it for good. Used once " +
      "the flight is over.",
  },
  // K137 stage 3c: game/sprint.ts SprintState, while sprint is on under a
  // chase (main.ts sprintState; the turn clock's skips, real time's pace).
  sprint: {
    label: "sprint",
    line:
      "Sprint, once a game: your next two moves cost the minotaur one turn " +
      "(in real time you run your next two runs at twice your pace). A catch " +
      "spends it; starting over gives it back.",
  },
  // K137 stage 3d: TurnMinotaur.woken, the sleepers woken this attempt (a
  // follower setting off is not counted), while sleepers are on under the
  // turn clock's chase (game/monsters.ts).
  woken: {
    label: "woken",
    line:
      "Sleepers you woke: each lies on a junction off the shortest way and " +
      "wakes when you walk onto it, then hunts you as the minotaur does. A " +
      "catch puts every monster back to sleep.",
  },
  // K137 stage 4 (4.10, 4.30): main.ts's luresLeft and snaresLeft of the
  // stocks (game/lures.ts luresOf, game/snares.ts snaresOf), while that tool
  // is on under the turn clock's chase.
  lures: {
    label: "lures",
    line:
      "Lures left, of the stock you started with. Arm the note and tap a " +
      "run: the minotaur and any sleeper within range of it head for its " +
      "nearer end, at no cost in moves. Starting over refills them.",
  },
  snares: {
    label: "snares",
    line:
      "Snares left, of the stock you started with. Arm the loop and tap a " +
      "run at your junction: the first monster to step onto it stands at " +
      "its near end for a few turns. Starting over refills them.",
  },
  // K137 stage 2: game/spool.ts spoolGauge of the controller's spoolUsed
  // (pathEdges.length) against spoolCap (parFor(fewestRuns, spoolSlack)).
  // K137 s5 (4.33): the muddy runs laid this maze (game/mud.ts).
  muddy: {
    label: "muddy",
    line:
      "Muddy runs laid on the shortest route. Crossing one takes two " +
      "moves, for you and the minotaur alike, so the fewest-moves way " +
      "and the shortest way part.",
  },
  spool: {
    label: "spool",
    line:
      "Yarn left on Ariadne's spool. Each run you walk pays out one run of " +
      "yarn, loops included; walking back along the last run reels it in, " +
      "and so does Undo. A move past the spool is refused.",
  },
  // K137 stage 2: spoolPercentUsed at the finish (game/spool.ts).
  spoolUsed: {
    label: "spool used",
    line:
      "The share of the spool paid out when you reached the exit: the runs " +
      "on your yarn against the spool, which holds the fewest runs to the " +
      "exit plus the slack.",
  },
  // K137 stage 2: the controller's hintsLeft of hintsOf(hints).
  hints: {
    label: "hints",
    line:
      "Hints left this solve. A hint lights the next run of the shortest way " +
      "to the exit for a few seconds; a restart gives them all back.",
  },
  // K137 stage 2: the controller's hintsUsed at the finish.
  hintsUsed: {
    label: "hints used",
    line: "Hints you used on the way to the exit.",
  },
  // K138 (the row came with stage 2): ice's share and the color rule, and
  // "no layout" when one found no layout on this maze.
  rules: {
    label: "rules",
    line:
      "The run rules in play: ice and the share of icy runs (you slide on " +
      "across them), and the color rule (alternate or cycle the shades). " +
      "\"no layout\": a rule found no layout on this maze and is off.",
  },
  // K138 stage 2: the turnstiles laid.
  turnstiles: {
    label: "turnstiles",
    line:
      "Turnstile junctions. Each connects two of its three runs, and the " +
      "open pair turns one step with every move you make. Going back the " +
      "way you came is always allowed.",
  },
  // K138 stage 2: the hidden runs found of those laid; the fewest moves
  // without them (the rating's) and with them.
  hidden: {
    label: "hidden",
    line:
      "Hidden runs found of those in the maze. A hidden run draws nothing " +
      "until you pluck a thread of the same note within a few runs of it. " +
      "Fewest: the fewest moves to the exit without the hidden runs (what " +
      "the stars rate against), then with them.",
  },
  // K138 stage 3: the one-way runs laid.
  oneWay: {
    label: "one-way",
    line:
      "One-way runs. Chevrons along a one-way run point the way; a tap " +
      "against them is refused, and so is a backtrack over one. The way out " +
      "never closes.",
  },
  // K138 stage 4: the keys held of those laid.
  keys: {
    label: "keys",
    line:
      "Keys held of those laid. Walk onto a key to take it; the runs into " +
      "the exit stay locked until you hold every key. Going back over the " +
      "move that took a key drops it.",
  },
};

// The daily stats view's "best time" tile aggregates `time` (daily_store.ts
// dailyAggregates: the fastest OFFICIAL result; replays and practice never
// count).
export const BEST_TIME_LINE =
  "The fastest time among your official results. Replays and practice do not count.";

// The ids whose lines a set of rows needs. The fire's lead is a HUD row (a
// banner means the race is over), and the closest call is its smallest
// value, so a banner showing the closest call explains both.
export function explainedStats(ids: readonly StatId[]): StatId[] {
  const out: StatId[] = [];
  for (const id of ids) {
    if (id === "closestCall" && !ids.includes("fireLead")) out.push("fireLead");
    out.push(id);
  }
  return out;
}

// optimal / path in (0, 1], or null when undefined (no path yet, or a maze
// with no finite optimal).
export function efficiencyOf(optimal: number, path: number): number | null {
  if (!Number.isFinite(optimal) || optimal <= 0) return null;
  if (!Number.isFinite(path) || path <= 0) return null;
  return Math.min(1, optimal / path);
}

// Whole percent, rounded DOWN (a 99.9% route is not optimal), with an
// epsilon for the float noise of summing the same run lengths in another
// order (path == optimal must read 100).
export function efficiencyPercent(eff: number): number {
  return Math.max(0, Math.min(100, Math.floor(eff * 100 + 1e-7)));
}

// m:ss below an hour, h:mm:ss from there; seconds round down.
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// The solve clock: idle until start(), then running until stop(). Time the
// page spends HIDDEN (another tab, the phone's home screen) does not count:
// nothing can be played then, and the arrival animation would not finish
// until the page came back anyway. Every method takes the current time
// (performance.now() in the app), so the tests drive it exactly.
//
// A SAVED attempt (K47) comes back PAUSED at its saved time - restore() -
// and resume() carries on from there: main.ts resumes once the scene is on
// screen (after the intro), or at the next move, whichever comes first.
export class SolveClock {
  private startAt = 0;
  private stopAt = 0;
  private hiddenSince: number | null = null;
  private hiddenTotal = 0;
  private pausedMs = 0;
  state: "idle" | "paused" | "running" | "stopped" = "idle";

  get started(): boolean {
    return this.state !== "idle";
  }

  start(now: number, hidden = false): void {
    this.runFrom(now, 0, hidden);
  }

  // A saved attempt's clock: paused at `elapsedMs` until resume().
  restore(elapsedMs: number): void {
    this.state = "paused";
    this.pausedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
    this.hiddenSince = null;
    this.hiddenTotal = 0;
  }

  // Run on from the paused time (no-op unless paused).
  resume(now: number, hidden = false): void {
    if (this.state !== "paused") return;
    this.runFrom(now, this.pausedMs, hidden);
  }

  private runFrom(now: number, offsetMs: number, hidden: boolean): void {
    this.state = "running";
    this.startAt = now - offsetMs;
    this.stopAt = now;
    this.hiddenTotal = 0;
    this.hiddenSince = hidden ? now : null;
  }

  stop(now: number): void {
    if (this.state === "paused") {
      // Finished without resuming (a restored winning move): its saved time.
      this.startAt = 0;
      this.stopAt = this.pausedMs;
      this.hiddenTotal = 0;
      this.hiddenSince = null;
      this.state = "stopped";
      return;
    }
    if (this.state !== "running") return;
    this.settleHidden(now);
    this.stopAt = now;
    this.state = "stopped";
  }

  reset(): void {
    this.state = "idle";
    this.hiddenSince = null;
    this.hiddenTotal = 0;
  }

  // The page's visibility changed (visibilitychange).
  setHidden(hidden: boolean, now: number): void {
    if (this.state !== "running") return;
    if (hidden) {
      if (this.hiddenSince === null) this.hiddenSince = now;
    } else {
      this.settleHidden(now);
    }
  }

  private settleHidden(now: number): void {
    if (this.hiddenSince !== null) {
      this.hiddenTotal += Math.max(0, now - this.hiddenSince);
      this.hiddenSince = null;
    }
  }

  elapsed(now: number): number {
    if (this.state === "idle") return 0;
    if (this.state === "paused") return this.pausedMs;
    const end = this.state === "running" ? now : this.stopAt;
    const hiddenNow =
      this.state === "running" && this.hiddenSince !== null
        ? Math.max(0, now - this.hiddenSince)
        : 0;
    return Math.max(0, end - this.startAt - this.hiddenTotal - hiddenNow);
  }
}

// The Wordle-style move grid for sharing: one square per move (green = a
// shortest-route step, yellow = a detour, red = a backtrack, the ox 🐂 = a
// move the minotaur caught you on), `perRow` to a line, at most `maxRows`
// lines - a longer solve ends its last line in "+N" (the moves not drawn).
const SQUARE: Record<MoveKind, string> = {
  g: "\u{1F7E9}",
  d: "\u{1F7E8}",
  b: "\u{1F7E5}",
  x: "\u{1F402}",
};

export function moveGrid(moves: string, perRow = 10, maxRows = 6): string {
  const kinds = [...moves].filter((c): c is MoveKind => c in SQUARE);
  if (kinds.length === 0) return "";
  const cap = perRow * maxRows;
  const shown = kinds.length > cap ? kinds.slice(0, cap - 1) : kinds;
  const rows: string[] = [];
  for (let i = 0; i < shown.length; i += perRow) {
    rows.push(
      shown
        .slice(i, i + perRow)
        .map((k) => SQUARE[k])
        .join("")
    );
  }
  if (kinds.length > cap) rows[rows.length - 1] += ` +${kinds.length - shown.length}`;
  return rows.join("\n");
}
