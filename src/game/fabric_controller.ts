// P4 branching-maze solve state over the walk graph. The player stands at a
// VERTEX (junction or end) and advances one walk edge per tap - BRANCH-POINT-
// ONLY interaction: a tap may only choose among the runs incident to the
// current head, never past a later branch point. Tapping the run just
// traversed retracts it (backtracking, one branching segment at a time).
//
// Two distance readouts, both in deterministic lattice arc:
//  - pathLength: the CURRENT path (the stack from the start to the head),
//    compared against walk.optimalLength.
//  - backtrackDist: cumulative distance retracted via backtracking, summed
//    forever (a separate price-paid meter; never decreases).
//  - walkedDist (K155, the star rating's measure): every run walked,
//    forward and back. It equals pathLength + 2 x backtrackDist until a K80
//    respawn empties the path; the walk from the entrance after a catch
//    adds on.
//
// MEMORY-TRAIL MODE (Stage 23, `trailMode`): backtracking does not exist -
// EVERY legal tap is an advance, including re-tapping the run just arrived
// by (that is simply another advance that happens to revisit the previous
// vertex), so pathLength only ever accumulates and backtrackDist stays 0.
// The branch-point-only rule and the win condition are unchanged. The flag
// is live-togglable mid-solve (gameplay interpretation only; the path state
// is valid under either reading).
//
// K19 STATS (definitions in game/maze_stats.ts): the distinct junctions and
// dead-end tips the head has reached, and a per-move log for the share
// grid. All reset with reset().
//
// K47 SAVED ATTEMPTS: `taps` lists every accepted tap's run, in order. The
// whole solve state is a pure function of that list and the walk graph, so
// replay(taps) rebuilds it exactly (path, meters, stats, move log) - that
// is what a saved daily attempt stores. retreatToStart() is a daily's
// Reset path: backtracks, one run at a time, to the entrance.
//
// K100 RESTARTS: `restarts` counts reset() calls (the constructor's and
// replay()'s included), so a new value means the solve started over. The
// fog of war's explored memory (render/fabric_maze_renderer.ts) starts
// over when it moves and only then: a backtrack to the entrance, by hand
// or by retreatToStart(), and a K80 respawn() keep it. reset() is also the
// one thing that empties `taps`, so the taps are everything explored
// (game/daily_attempt.ts exploredRuns). K174: `refogs` counts respawn(true)
// calls, a catch that returns the fog to the solve's start (minoRefog);
// the fog starts over when either counter moves.
//
// K114 BURN RACE (game/fire.ts): with a `fire`, the fire's clock is
// walkedDist. A tap on a smoldering arm (the fire reaches its far end
// first) is refused with "smolder": not logged, not a turn, nothing
// changes. Every arrival lowers `fireClosest` (the closest call, T(v) - L);
// an arrival with no safe arm left sets `fireLost`, after which every tap
// is a "noop" and choices() is empty until reset() relights the fuse
// (main.ts shows the Burnt banner, then restarts). replay(taps) rebuilds
// all of it; a refused tap in a tap list fails the replay.
//
// K114 stage 2, THE REAL-TIME FIRE (fire.clock = realtime; game/fire_clock.ts
// is the clock): main.ts feeds the clock in with setFireNow(L) every frame,
// and the dot runs at the clock's own pace, so a move that LEAVES at L
// arrives at L + len. fireL is the departure clock: max(the clock, the
// running move's arrival), so a tap queued during a move is tested as it
// leaves on arrival, and the HUD's lead reads the arrival's margin while
// the dot runs. The arm test is the same (L + len < T(far)), applied when
// the dot leaves. LOST: the fire reaches you where you stand, T(head) <= L
// once the dot has arrived (setFireNow); arriving with no safe arm is no
// loss under this clock, standing there is. For r < 1 nothing is lost
// mid-run: the fire behind you gains on nothing, and the arm test kept the
// far end ahead of it. THE CLOSEST CALL: every arrival's T(v) - L, as on
// the turn clock, and every departure's (the least margin a stop had),
// except the first departure from the start; a loss makes it 0. replay()
// leaves every tap the moment the last one arrives (no thinking time), so
// its L is walkedDist; a replay never loses by standing.
//
// K137 FRAGILE RUNS (game/fragile.ts; brief docs/design/K137_s1.md): with
// `fragile` on, every accepted tap is one crossing of its run (`crossings`,
// advances and backtracks alike) and a run whose crossings reach its limit
// (`breakLimits`, from the mode at reset(); Infinity for END and title
// runs) is BROKEN: choices() leaves it out and a tap on it is a "reject".
// After each move, no route over unbroken runs from the head to the exit
// sets `stranded`: every tap is then a "noop" and choices() is empty
// (main.ts sings the strand and offers Undo, replay(taps minus the last),
// and Restart). The breaks derive from the taps, so replay() rebuilds them;
// reset() clears them and a K80 respawn() keeps them. `justBroke` is the run
// the last tap broke (-1: none), for the snap's sound.
//
// K137 PAR (game/par.ts): `par` = P, fixed at reset() from `fewestRuns` (F,
// the BFS from the start) and `parSlack`. Under parMode strict, a move
// after which the fewest unbroken runs from the head to the exit exceed
// the strokes left (P - taps) sets `parLost`: every tap is a "noop" and
// choices() is empty, as after a burn loss, until reset(). Under strokes
// nothing is ever lost; the finish reads strokes against par.
//
// K139 COLLAPSE (game/collapse.ts; brief docs/design/K139.md): `collapse`
// (finish | free) rides the fragile machinery with collapse.ts's limits
// (every maze run breaks after one crossing, END runs too; title runs
// never), overriding `fragile` and `parMode` (setRules). A walk is a
// trail: the run behind you is broken, so there is no backtrack.
// `collapsedUnits` sums each broken run's units (the score). finish: the
// exit wins and the strand is K137's. free: the exit is a dead end, and the
// game ENDS, as a finish with the score (`solved`, the move returns "win";
// never `stranded`), once no unbroken maze run is reachable from the head
// (`freeStranded`), after a move or a respawn. `collapsePar` (the
// step-budgeted search) runs once per walk and mode, on first read.
//
// K114 CUT (brief docs/design/K114_cut.md; game/cut.ts is the rule): the
// player deletes whole runs. Only in the classic game with fragile, par,
// collapse and the fire all off (setRules decides; `cutOn`). A cut is an
// ACTION, not a move: `actions` lists one entry per player action, a move
// (its first run) or a cut, and replayActions(actions) rebuilds the state,
// so Undo pops one action (a whole contracted move, or one cut). `taps` and
// the move log stay one entry per run walked; with cut off every tap is one
// move action. A cut run is gone as a broken run is (`broken`, choices, the
// pick). CONTRACTION: a move arriving at a junction left with two live runs
// carries on (cut.ts carryChain); tapEdge applies one run at a time, so the
// rest of the chain waits in `carry` and the next tapEdge must take
// `carry[0]` (main.ts drives it on each arrival). `distToExit` (the move
// log's g/d, the hints) is recomputed over the live runs on every cut; the
// stars keep the walk's uncut optimal.

import type { WalkGraph } from "../core/walk_graph";
import { runsToExit } from "../core/walk_graph";
import type { MoveKind } from "./maze_stats";
import type { Fire } from "./fire";
import { armSafe, fireLead, fireTime, fireTrapped, refire, runBurnAt } from "./fire";
import type { FragileMode } from "./fragile";
import {
  anyBreakable,
  brokenRuns as brokenRunsOf,
  crackedRuns as crackedRunsOf,
  fragileLimits,
  isBroken,
  isCracked,
} from "./fragile";
import type { ParMode } from "./par";
import { PAR_SLACK_DEFAULT, parFor, strictLost } from "./par";
import type { CollapseMode, CollapsePar } from "./collapse";
import {
  collapseLimits,
  collapsePar as searchCollapsePar,
  freeStranded,
  runUnits,
  sharePercent,
  totalUnits,
} from "./collapse";
import type { CutMode, CutResult, FabricAction } from "./cut";
import { carryChain, cutVerdict, distancesToExit } from "./cut";
import { hintsOf, liveDistances, nextGoodArm } from "./hints";
import { spoolCapacity, spoolRefuses, spoolShareUsed } from "./spool";
import type { ColorRuleMode } from "./color_rule";
import { colorRule, placeColors } from "./color_rule";
import { ICE_SHARE_MAX, iceRule, placeIce } from "./ice";
import type { RuleMove, RuleSearch, WalkRule } from "./rule_search";
import { composeRules, ruleSearch } from "./rule_search";

// K137: the solve's rules beyond the clock: fragile runs and par (K139:
// and collapse; K114: cut; K138: ice runs and the color rule). Change them
// only with a reset() after (main.ts restarts the solve).
export interface FabricRules {
  fragile?: FragileMode;
  parMode?: ParMode;
  parSlack?: number;
  collapse?: CollapseMode;
  cut?: CutMode;
  // K137 stage 2: the spool's slack (null or absent = no spool) and the
  // hints a solve (0 = none).
  spool?: number | null;
  hints?: number;
  // K138: the share of core runs that are icy (0: off), and the color rule.
  ice?: number;
  colorRule?: ColorRuleMode;
}

// K138: what the rules' placement reads beyond the walk: the design's seed
// and the walker map's continuation table (a thunk: built on first use).
export interface RuleSource {
  seed: number;
  cont: () => Int32Array;
}

// K138: one placement of the rules on this walk (per ice share and color
// mode). `placed`: every rule on found a solvable layout (else the HUD says
// so and the rule that did place plays alone); `bites`: the layout changes
// the best route.
export interface RuleLook {
  icy: Uint8Array | null;
  colors: Int8Array | null;
  mode: ColorRuleMode;
  placed: boolean;
  bites: boolean;
  draws: number;
}

interface RulePlacement extends RuleLook {
  key: string;
  rule: WalkRule | null;
  // Memos: the kit's fewest taps per search node, and the search from the
  // start (per backtracks flag).
  fwd: Map<string, number>;
  start: Map<boolean, RuleSearch>;
}

export type FabricTapResult =
  | "advance" // stepped across a run to its far vertex
  | "backtrack" // retracted the last run
  | "reject" // the run is not incident to the current head (or K137: broken; K114: cut, or not the run a contracted move carries on along)
  | "noop" // after solving (or a K114 burn-race loss, K137 stranded or out of strokes)
  | "win" // advanced onto the exit tail (K139 free collapse: the move that ended the game)
  | "smolder" // K114: refused, the fire reaches the arm's far end first
  | "spool" // K137 s2: refused, the move would pay yarn out past the spool
  | "refused"; // K138: a rule refuses the run (the color rule, or a slide that breaks it); nothing changes

export class FabricMazeController {
  readonly walk: WalkGraph;
  pathVertices: string[] = [];
  pathEdges: number[] = [];
  backtrackDist = 0;
  walkedDist = 0;
  solved = false;
  // Distinct JUNCTION vertices (not END) the head has arrived at.
  visitedJunctions = new Set<string>();
  // Distinct dead-end tips the head has arrived at: END vertices other
  // than the start and the exit (main.ts shows them only with deadEnds on).
  deadEndTips = new Set<string>();
  // One entry per accepted move: g(ood) / d(etour) / b(acktrack). K552: a
  // move on a title run is not logged (the share grid and a saved attempt
  // are maze-only, game/daily_attempt.ts's maze form).
  moveLog: MoveKind[] = [];
  // The run of every accepted tap, in order (replay() reproduces the rest).
  taps: number[] = [];
  // reset() calls so far: a new value = a restarted solve (K100).
  restarts = 0;
  // respawn(true) calls so far: a new value = the fog of war starts over,
  // the solve goes on (K174).
  refogs = 0;
  // respawn() calls since the last reset(): the catches whose walk
  // walkedDist still holds (K80 turns stage 3a, K293 (a): the stars say
  // which catches they rate).
  respawns = 0;

  // Memory-trail mode: advance-only taps (see the header comment). Set at
  // construction and freely togglable from main.ts afterwards.
  trailMode: boolean;

  // K114 burn race: the fire (null = off). Change it only with a reset()
  // after (main.ts restarts the solve). K137-b: a move that breaks a run
  // refires it (fire.ts refire: it burns on without the broken runs), so
  // the getter reads the live fire; reset() restores the one set.
  private fireBuilt: Fire | null = null;
  private fireLive: Fire | null = null;
  get fire(): Fire | null {
    return this.fireLive;
  }
  set fire(fire: Fire | null) {
    this.fireBuilt = fire;
    this.fireLive = fire;
  }
  // No safe arm was left at the head: the race is lost.
  fireLost = false;
  // The closest call so far, T(v) - L over every arrival (Infinity before
  // the first move).
  fireClosest = Infinity;
  // Real-time fire: the clock main.ts last set, and the running (or last)
  // move's departure and arrival clocks.
  fireNow = 0;
  fireDepartL = 0;
  fireArriveL = 0;

  // K137 fragile runs: the mode (change it only with a reset() after).
  fragile: FragileMode = "off";
  // Per run, the crossings it takes before it breaks (Infinity: never);
  // reset() derives them from `fragile`.
  breakLimits: Float64Array = new Float64Array(0);
  // Per run, the accepted taps along it since the last reset().
  crossings: Uint32Array = new Uint32Array(0);
  // No route over unbroken runs from the head to the exit.
  stranded = false;
  // The run the last accepted tap broke, or -1.
  justBroke = -1;
  // Does any run break (fragile on and a run not exempt)?
  private breakable = false;

  // K137 par: the mode and the slack (change them only with a reset()
  // after), F and P (fixed at reset()), and the strict loss.
  parMode: ParMode = "off";
  parSlack = PAR_SLACK_DEFAULT;
  fewestRuns = Infinity;
  par = Infinity;
  parLost = false;
  // runsToExit with nothing blocked (the walk never changes).
  private openRuns: Map<string, number> | null = null;

  // K139 collapse: the mode (change it only with a reset() after), the
  // units collapsed so far, and per mode the par (computed on first read).
  collapse: CollapseMode = "off";
  collapsedUnits = 0;
  private collapseTotalUnits = -1;
  private collapseParOf: Partial<Record<CollapseMode, CollapsePar>> = {};

  // K114 cut: the mode (setRules decides; change it only with a reset()
  // after), the cut runs, the player's actions since the last reset(), the
  // runs the move under way still carries on along, and the walk distances
  // to the exit over the live runs (the walk's own field with no cuts).
  cutMode: CutMode = "off";
  cuts = new Set<number>();
  actions: FabricAction[] = [];
  carry: number[] = [];
  distToExit: Map<string, number>;

  // K137 stage 2, the player's aids. The spool: its slack (null = off;
  // change it only with a reset() after) and its capacity in runs (fixed at
  // reset(); Infinity = no spool). The yarn paid out is pathEdges.length.
  // Hints a solve and the hints used, and the chalk marks (junction ids):
  // reset() leaves those two alone, because Undo replays through it; a real
  // restart calls clearAids() (main.ts restartSolve).
  spoolSlack: number | null = null;
  spoolCap = Infinity;
  hintsMax = 0;
  hintsUsed = 0;
  chalk = new Set<string>();

  // K138 rules (ice runs and the color rule; rule_search.ts is the kit):
  // the settings (setRules decides; change them only with a reset() after),
  // the placement source, the placements made (per setting; the walk never
  // changes), the one in play and its rule (null: no rule), the rule's
  // state, and per forward move the path length and the state before it (a
  // backtrack undoes the whole move).
  iceShare = 0;
  colorMode: ColorRuleMode = "off";
  private ruleSource: RuleSource | null;
  private placements = new Map<string, RulePlacement>();
  private placement: RulePlacement | null = null;
  rule: WalkRule | null = null;
  ruleState = 0;
  private moveStarts: number[] = [];
  private stateStack: number[] = [];
  // The kit's runs left: while a move carries on, the value at its end;
  // otherwise memoized per tap count.
  private pendingLeft = Infinity;
  private leftMemo = { taps: -1, trail: false, value: Infinity };

  constructor(
    walk: WalkGraph,
    trailMode = false,
    fire: Fire | null = null,
    rules: FabricRules = {},
    ruleSource: RuleSource | null = null
  ) {
    this.walk = walk;
    this.trailMode = trailMode;
    this.fire = fire;
    this.distToExit = walk.distToExit;
    this.ruleSource = ruleSource;
    this.setRules(rules);
    this.reset();
  }

  // K137: new rules; they take at the next reset() (main.ts restartSolve).
  setRules(rules: FabricRules): void {
    // K139: collapse overrides fragile and par (its own limits and par).
    this.collapse = rules.collapse ?? "off";
    const collapsing = this.collapse !== "off";
    this.fragile = collapsing ? "off" : rules.fragile ?? "off";
    this.parMode = collapsing ? "off" : rules.parMode ?? "off";
    this.parSlack = rules.parSlack ?? PAR_SLACK_DEFAULT;
    // K137 s2: the spool's slack (null: no spool).
    this.spoolSlack = rules.spool ?? null;
    // K114: cutting only with every rule above off and no fire (main.ts
    // passes `cut` for the classic game only, so never with a minotaur).
    // K137 s2: nor with the spool (the yarn is the path stack).
    const plain =
      !collapsing &&
      this.fragile === "off" &&
      this.parMode === "off" &&
      !this.fire &&
      this.spoolSlack === null;
    this.cutMode = plain ? rules.cut ?? "off" : "off";
    // K137 s2: the hints a solve; none in the walker's modes (it walks).
    const walker = this.cutMode === "lead" || this.cutMode === "delay";
    this.hintsMax = walker ? 0 : hintsOf(rules.hints ?? 0);
    // K138: the rules only with collapse, fragile, the cut, the fire and the
    // spool off (par composes: its F and strict's runs left come from the
    // kit; a hint and the compass point along the kit's route).
    const ruled =
      !collapsing &&
      this.fragile === "off" &&
      this.cutMode === "off" &&
      !this.fire &&
      this.spoolSlack === null;
    const share = rules.ice ?? 0;
    this.iceShare = ruled && share > 0 ? Math.min(ICE_SHARE_MAX, share) : 0;
    this.colorMode = ruled ? rules.colorRule ?? "off" : "off";
  }

  // K137 s2: a real restart (not Undo's replay) clears the hints used and
  // the chalk marks.
  clearAids(): void {
    this.hintsUsed = 0;
    this.chalk.clear();
  }

  // K137 s2: the yarn paid out (runs), and whether the spool is on.
  get spoolOn(): boolean {
    return Number.isFinite(this.spoolCap);
  }
  get spoolUsed(): number {
    return this.pathEdges.length;
  }
  // The share of the spool paid out, 0..1 (0 without a spool).
  get spoolShare(): number {
    return spoolShareUsed(this.pathEdges.length, this.spoolCap);
  }
  // Would a tap on `eid` pay yarn out past the spool? A retrace of the
  // yarn's last run reels in and is never refused. The real-time chase asks
  // before it sets off along a run (its departure taps the controller).
  spoolWouldRefuse(eid: number): boolean {
    if (!this.spoolOn) return false;
    if (!this.trailMode && eid === this.pathEdges[this.pathEdges.length - 1]) return false;
    return spoolRefuses(this.pathEdges.length, this.spoolCap);
  }

  // K137 s2: hints left this solve; useHint() spends one (false when none
  // is left, the hints are off or the solve is over).
  get hintsLeft(): number {
    return Math.max(0, this.hintsMax - this.hintsUsed);
  }
  useHint(): boolean {
    if (this.hintsLeft <= 0 || this.solved) return false;
    this.hintsUsed++;
    return true;
  }

  // K137 s2: the next good arm from the head, for a hint and the compass:
  // the first run of the shortest route to the exit over the runs still
  // there (never a broken, cut or burnt one), or -1 (solved, lost, at the
  // exit, or no route left). It ignores the minotaur (it still points to
  // the exit) and the spool (a refused arm can still be the good one).
  goodArm(): number {
    if (this.choices().length === 0) return -1;
    if (this.rule) return this.ruleGoodArm();
    const fire = this.fire;
    const L = fire ? this.fireL : 0;
    const gone = this.breakable || this.cuts.size > 0;
    const live =
      gone || fire
        ? (eid: number): boolean =>
            !this.broken(eid) && !(fire && runBurnAt(this.walk, fire, eid, L).state === "burnt")
        : undefined;
    return nextGoodArm(this.walk, liveDistances(this.walk, live), this.head, live);
  }

  // K137 s2: chalk a tick on a junction (the head's by default), or rub it
  // out. True when the junction is marked afterwards.
  toggleChalk(at: string = this.head): boolean {
    if (this.chalk.delete(at)) return false;
    this.chalk.add(at);
    return true;
  }

  // K138: the placement for the current settings (null: no rule on, or no
  // source), made once per setting.
  private placeRules(): RulePlacement | null {
    const src = this.ruleSource;
    if (!src || (this.iceShare === 0 && this.colorMode === "off")) return null;
    const key = `${this.iceShare}|${this.colorMode}`;
    const made = this.placements.get(key);
    if (made) return made;
    const cont = this.iceShare > 0 ? src.cont() : null;
    const ice = cont ? placeIce(this.walk, cont, this.iceShare, src.seed) : null;
    const icy = ice?.layout ?? null;
    const col =
      this.colorMode === "off"
        ? null
        : placeColors(this.walk, this.colorMode, src.seed, cont && icy ? { cont, icy } : null);
    const rules: WalkRule[] = [];
    if (cont && icy) rules.push(iceRule(this.walk, cont, icy));
    if (col?.layout) rules.push(colorRule(this.walk, this.colorMode, col.layout));
    const p: RulePlacement = {
      key,
      icy,
      colors: col?.layout ?? null,
      mode: this.colorMode,
      placed: (!ice || ice.layout !== null) && (!col || col.layout !== null),
      bites: col ? col.bites : ice?.bites ?? false,
      draws: Math.max(ice?.draws ?? 0, col?.draws ?? 0),
      rule: rules.length === 0 ? null : rules.length === 1 ? rules[0] : composeRules(...rules),
      fwd: new Map(),
      start: new Map(),
    };
    this.placements.set(key, p);
    return p;
  }

  // K138: is a rule in play (ice or the color rule, with a layout)?
  get rulesOn(): boolean {
    return this.rule !== null;
  }

  // K138: the rules' layout for the looks and the HUD (null: none on).
  get ruleLook(): RuleLook | null {
    return this.placement;
  }

  // K138: names the layout in play ("" none): a new value = the run colors
  // change (main.ts recolors).
  get ruleKey(): string {
    return this.placement?.key ?? "";
  }

  // K138: the color rule's state, the last color walked + 1 (0: none yet).
  // The ice rule has one state, so the composed state is the color's.
  get colorState(): number {
    return this.placement?.colors ? this.ruleState : 0;
  }

  // K138: Undo replays the actions (replayActions) with the cut or a rule
  // on: a move may carry on along several runs.
  get replaysActions(): boolean {
    return this.cutOn || this.rule !== null;
  }

  // K138: the kit's fewest taps to the exit from a search node (memoized
  // per placement).
  private ruleFwd(vertex: string, state: number, last: number, back: boolean): number {
    const p = this.placement!;
    const key = `${vertex}|${state}|${last}|${back ? 1 : 0}`;
    let v = p.fwd.get(key);
    if (v === undefined) {
      v = ruleSearch(this.walk, p.rule!, { vertex, state, last }, back).fewest;
      p.fwd.set(key, v);
    }
    return v;
  }

  // K138: the kit's search from the start (memoized per placement).
  private ruleStart(): RuleSearch {
    const p = this.placement!;
    const back = !this.trailMode;
    let s = p.start.get(back);
    if (!s) {
      s = ruleSearch(this.walk, p.rule!, undefined, back);
      p.start.set(back, s);
    }
    return s;
  }

  // K138: the fewest taps to the exit from a node with `undoable` earlier
  // moves on the stack: k backtracks (each undoes a whole move), then
  // forward taps only (an optimal walk never undoes a move of its own).
  // Trail mode has no backtracks.
  private ruleLeftFrom(vertex: string, state: number, last: number, undoable: number): number {
    const back = !this.trailMode;
    let best = this.ruleFwd(vertex, state, last, back);
    if (!back) return best;
    for (let k = 1, i = undoable; i > 0 && k < best; k++) {
      i--;
      const d = this.moveStarts[i];
      const f = this.ruleFwd(
        this.pathVertices[d],
        this.stateStack[i],
        d > 0 ? this.pathEdges[d - 1] : -1,
        back
      );
      if (k + f < best) best = k + f;
    }
    return best;
  }

  // K138: the kit's runs left from the head (see runsLeft).
  private ruleRunsLeft(): number {
    if (this.carry.length > 0) return this.pendingLeft;
    const m = this.leftMemo;
    if (m.taps === this.taps.length && m.trail === this.trailMode) return m.value;
    const value = this.ruleLeftFrom(this.head, this.ruleState, this.arrivalEdge, this.moveStarts.length);
    this.leftMemo = { taps: this.taps.length, trail: this.trailMode, value };
    return value;
  }

  // K138: a hint's and the compass's arm under a rule: the backtrack when
  // undoing the last move leads to fewer taps, else the first tap of the
  // kit's best route on (-1: no legal route left).
  private ruleGoodArm(): number {
    const back = !this.trailMode;
    const last = this.arrivalEdge;
    const fwd = this.ruleFwd(this.head, this.ruleState, last, back);
    if (back && this.moveStarts.length > 0 && this.ruleRunsLeft() < fwd) return last;
    if (!Number.isFinite(fwd)) return -1;
    const from = { vertex: this.head, state: this.ruleState, last };
    return ruleSearch(this.walk, this.rule!, from, back).route[0] ?? -1;
  }

  // K138: the runs out of the head the rule refuses (the backtrack run is
  // never refused; nothing while a move carries on).
  refusedChoices(): number[] {
    const rule = this.rule;
    if (!rule || this.carry.length > 0 || this.solved || this.parLost) return [];
    const head = this.head;
    const back = this.trailMode ? -1 : this.arrivalEdge;
    return this.walk.vertices
      .get(head)!
      .edges.filter((eid) => eid !== back && rule.step(head, eid, this.ruleState) === null);
  }

  // K138: the shortest walk to the exit the rules allow (with no rule the
  // walk's own optimal length), for the stars and the efficiency.
  get optimal(): number {
    return this.rule ? this.ruleStart().shortest : this.walk.optimalLength;
  }

  reset(): void {
    this.breakLimits =
      this.collapse !== "off" ? collapseLimits(this.walk) : fragileLimits(this.walk, this.fragile);
    this.breakable = anyBreakable(this.breakLimits);
    this.crossings = new Uint32Array(this.walk.edges.length);
    this.stranded = false;
    this.justBroke = -1;
    this.collapsedUnits = 0;
    // K138: the rule in play (a placement made once per setting).
    this.placement = this.placeRules();
    this.rule = this.placement?.rule ?? null;
    this.ruleState = this.rule?.start ?? 0;
    this.moveStarts = [];
    this.stateStack = [];
    this.pendingLeft = Infinity;
    this.leftMemo = { taps: -1, trail: false, value: Infinity };
    this.openRuns ??= runsToExit(this.walk);
    // K138: under a rule, par's F is the kit's fewest legal taps.
    this.fewestRuns = this.rule
      ? this.ruleStart().fewest
      : this.openRuns.get(this.walk.start) ?? Infinity;
    this.par = parFor(this.fewestRuns, this.parSlack);
    // K137 s2: the spool holds par's measure times (1 + slack).
    this.spoolCap =
      this.spoolSlack === null ? Infinity : spoolCapacity(this.fewestRuns, this.spoolSlack);
    this.parLost = false;
    this.fireLive = this.fireBuilt;
    this.fireLost = false;
    this.fireClosest = Infinity;
    this.fireNow = 0;
    this.fireDepartL = 0;
    this.fireArriveL = 0;
    this.pathVertices = [this.walk.start];
    this.pathEdges = [];
    this.backtrackDist = 0;
    this.walkedDist = 0;
    this.solved = false;
    this.visitedJunctions = new Set();
    this.deadEndTips = new Set();
    this.moveLog = [];
    this.taps = [];
    this.cuts = new Set();
    this.actions = [];
    this.carry = [];
    this.distToExit = this.walk.distToExit;
    this.respawns = 0;
    this.restarts++;
  }

  // Rebuild the solve state from a tap list (a saved attempt): reset, then
  // apply every tap. False - and a reset controller - when any tap is not
  // a legal move from where the previous ones led (a different maze, or a
  // damaged record).
  replay(taps: readonly number[]): boolean {
    this.reset();
    for (const eid of taps) {
      // K137: a tap after the solve was stranded or out of strokes is a
      // "noop", so no saved list holds one; a replay of a stranded game's
      // taps ends stranded.
      const r = Number.isInteger(eid) ? this.tapEdge(eid) : "reject";
      if (r === "reject" || r === "noop" || r === "smolder" || r === "spool" || r === "refused") {
        this.reset();
        return false;
      }
    }
    return true;
  }

  // K114 cut: rebuild the solve state from an action list (Undo replays the
  // actions but the last): reset, then every cut and every move with the
  // runs it carries on along. False - and a reset controller - when an
  // action is not legal where the previous ones led.
  replayActions(actions: readonly FabricAction[]): boolean {
    this.reset();
    const fail = (): boolean => {
      this.reset();
      return false;
    };
    const step = (eid: number): boolean => {
      const r = Number.isInteger(eid) ? this.tapEdge(eid) : "reject";
      return r !== "reject" && r !== "noop" && r !== "smolder" && r !== "spool" && r !== "refused";
    };
    for (const a of actions) {
      if (a.kind === "cut") {
        if (this.cut(a.run) !== "cut") return fail();
        continue;
      }
      if (!step(a.run)) return fail();
      while (this.carry.length > 0) if (!step(this.carry[0])) return fail();
    }
    return true;
  }

  // K114 cut: cut a run, a player action. "refused" when no route from the
  // head to the exit would be left; "invalid" with cut off, the solve over,
  // a contracted move still carrying on, or a run that cannot be cut or is
  // cut already. Only "cut" changes anything.
  cut(eid: number): CutResult {
    if (this.cutMode === "off" || this.solved || this.carry.length > 0) return "invalid";
    const verdict = cutVerdict(this.walk, this.head, this.cuts, eid);
    if (verdict !== "cut") return verdict;
    this.cuts.add(eid);
    this.actions.push({ kind: "cut", run: eid });
    this.distToExit = distancesToExit(this.walk, this.cuts);
    return "cut";
  }

  // K114 cut: is cutting on in this solve?
  get cutOn(): boolean {
    return this.cutMode !== "off";
  }

  // K114 walker: the walker's mode ("lead" or "delay"), or null when the
  // cut is off or the player's own scissors ("on").
  get walkerMode(): "lead" | "delay" | null {
    return this.cutMode === "lead" || this.cutMode === "delay" ? this.cutMode : null;
  }

  // K114 cut: the cut runs, in id order.
  cutRuns(): number[] {
    return [...this.cuts].sort((a, b) => a - b);
  }

  // K114 cut: the cuts made so far (the HUD's and the share's count).
  get cutCount(): number {
    return this.cuts.size;
  }

  // Back to the entrance by backtracking every run of the path, newest
  // first - exactly the taps a player could make (each is logged "b" and
  // priced on the backtrack meter). Returns the runs retracted. Nothing in
  // memory-trail mode (no backtracking exists there) or once solved.
  retreatToStart(): number[] {
    const out: number[] = [];
    if (this.trailMode || this.solved) return out;
    while (this.pathEdges.length > 0) {
      const eid = this.pathEdges[this.pathEdges.length - 1];
      if (this.tapEdge(eid) !== "backtrack") break;
      out.push(eid);
    }
    return out;
  }

  // K80's minotaur (real time, and the turn clock since K80 turns) caught
  // the player. Back to the entrance in one jump, not a restart: the stats,
  // the move log, the taps, the backtrack and walked meters and `restarts`
  // stay (replay(taps) cannot reproduce a respawn; a minotaur's maze is
  // never a daily, so nothing replays it), and `respawns` counts it.
  // `refog` (K174, the minoRefog param) returns the fog of war to the
  // solve's start; without it the explored fog stays.
  respawn(refog = false): void {
    if (refog) this.refogs++;
    this.respawns++;
    this.pathVertices = [this.walk.start];
    this.pathEdges = [];
    this.solved = false;
    // K137: the breaks stay; the strand and the par are judged anew from
    // the start.
    this.justBroke = -1;
    // K138: a rule starts over too (no minotaur plays under one today).
    if (this.rule) {
      this.ruleState = this.rule.start;
      this.moveStarts = [];
      this.stateStack = [];
      this.carry = [];
    }
    this.judge();
  }

  // K80 turns stage 2: the move log's "x", the move a minotaur caught you
  // on. It replaces the last move's letter (the run you were on; in real
  // time, caught standing, the run that brought you there). `wait`: a
  // turn-clock wait, which is otherwise not logged, adds an "x" (so does an
  // empty log). The taps keep the run: a catch is not a tap, and an added
  // "x" is not a move (moveCount reads the taps).
  markCaught(wait = false): void {
    if (wait || this.moveLog.length === 0) this.moveLog.push("x");
    else this.moveLog[this.moveLog.length - 1] = "x";
  }

  // Moves made (accepted taps) since the last reset. The taps, not the
  // move log: a catch's added "x" (on an empty log, or for a wait) counts
  // no move (K293 (c), K80 turns stage 3a).
  get moveCount(): number {
    return this.taps.length;
  }

  get head(): string {
    return this.pathVertices[this.pathVertices.length - 1];
  }

  // K479: the run the player arrived on (the path's last), or -1 before the
  // first move and back at the start. A tap on it is a backtrack (a trail
  // walks it back instead), so it is the one choice that tap_pick.ts holds
  // to a stricter pick than the runs out of the head.
  get arrivalEdge(): number {
    const n = this.pathEdges.length;
    return n > 0 ? this.pathEdges[n - 1] : -1;
  }

  // K115 stage 3a: a title run is walked but outside every maze meter.
  private isTitleEdge(eid: number): boolean {
    return this.walk.titleEdges?.has(eid) ?? false;
  }

  get pathLength(): number {
    let sum = 0;
    for (const eid of this.pathEdges) {
      if (!this.isTitleEdge(eid)) sum += this.walk.edges[eid].length;
    }
    return sum;
  }

  // Walk-edge ids tappable right now: every run incident to the head (the
  // last traversed one among them means "backtrack"). K114: none after a
  // loss, and never a burnt run (smoldering arms stay: their tap is
  // refused with "smolder", so the caller can say why).
  choices(): number[] {
    if (this.solved || this.fireLost || this.stranded || this.parLost) return [];
    let edges = this.walk.vertices.get(this.head)!.edges;
    // K137: never a broken run (K114: nor a cut one).
    if (this.breakable || this.cuts.size > 0) edges = edges.filter((eid) => !this.broken(eid));
    // K138: never a run the rule refuses (refusedChoices lists them; the
    // backtrack run stays, and a carried move's next run is the carry's).
    const rule = this.rule;
    if (rule && this.carry.length === 0) {
      const head = this.head;
      const back = this.trailMode ? -1 : this.arrivalEdge;
      edges = edges.filter((eid) => eid === back || rule.step(head, eid, this.ruleState) !== null);
    }
    const fire = this.fire;
    if (!fire) return edges;
    const L = this.fireL;
    return edges.filter((eid) => runBurnAt(this.walk, fire, eid, L).state !== "burnt");
  }

  // K114: the fire's clock L, the one read of it (fire.ts's header). The
  // turn clock is walkedDist; the real-time one is the departure clock
  // (the header's THE REAL-TIME FIRE).
  get fireL(): number {
    if (this.fire?.clock === "realtime") {
      return this.fireNow > this.fireArriveL ? this.fireNow : this.fireArriveL;
    }
    return this.walkedDist;
  }

  // K114 stage 2: is the real-time fire's race on (a move made, not lost,
  // not won)? main.ts also runs the clock while the winning move plays.
  get fireRacing(): boolean {
    return (
      this.fire?.clock === "realtime" &&
      this.taps.length > 0 &&
      !this.fireLost &&
      !this.solved
    );
  }

  // K114 stage 2: the real-time fire's clock moved to L. True when the
  // fire reached you where you stand (the race is lost now).
  setFireNow(L: number): boolean {
    this.fireNow = L;
    const fire = this.fire;
    if (!fire || fire.clock !== "realtime" || !this.fireRacing) return false;
    if (L < this.fireArriveL) return false; // Still running: never caught.
    if (fireTime(fire, this.head) > L) return false;
    this.fireLost = true;
    if (this.fireClosest > 0) this.fireClosest = 0;
    return true;
  }

  // K114: the fire's lead at the head, T(head) - L (lattice units; null
  // without a fire).
  get fireLeadHere(): number | null {
    return this.fire ? fireLead(this.fire, this.head, this.fireL) : null;
  }

  // K114: would the fire refuse this arm from the head now?
  smoldering(edgeId: number): boolean {
    const fire = this.fire;
    if (!fire || !this.walk.edges[edgeId]) return false;
    return !armSafe(this.walk, fire, this.fireL, this.head, edgeId);
  }

  // K137: is this run broken (fragile on, its crossings at its limit)? K114:
  // or cut - gone either way (cutRuns lists the cuts, brokenRuns the breaks).
  broken(eid: number): boolean {
    if (this.cuts.size > 0 && this.cuts.has(eid)) return true;
    return this.breakable && isBroken(this.breakLimits, this.crossings, eid);
  }

  // K137: is this run cracked (crossed, not yet broken)?
  cracked(eid: number): boolean {
    return this.breakable && isCracked(this.breakLimits, this.crossings, eid);
  }

  // K137: the broken runs, in id order.
  brokenRuns(): number[] {
    return this.breakable ? brokenRunsOf(this.breakLimits, this.crossings) : [];
  }

  // K137: the cracked runs, in id order.
  crackedRuns(): number[] {
    return this.breakable ? crackedRunsOf(this.breakLimits, this.crossings) : [];
  }

  // K137: does any run break in this solve?
  get fragileOn(): boolean {
    return this.breakable;
  }

  // K137: the fewest unbroken runs from the head to the exit (Infinity:
  // stranded). K138: under a rule, the kit's fewest legal taps (a backtrack
  // counts one tap and undoes a whole move).
  get runsLeft(): number {
    if (this.rule) return this.ruleRunsLeft();
    if (!this.breakable && this.cuts.size === 0) return this.openRuns!.get(this.head) ?? Infinity;
    return runsToExit(this.walk, (eid) => this.broken(eid)).get(this.head) ?? Infinity;
  }

  // K137 par: the strokes so far (moves) and the strokes left before par.
  // K138: under a rule a stroke is a tap (an action): a slide is one.
  get strokes(): number {
    return this.rule ? this.actions.length : this.taps.length;
  }

  get strokesLeft(): number {
    return this.par - this.strokes;
  }

  tapEdge(edgeId: number): FabricTapResult {
    if (this.solved || this.fireLost || this.stranded || this.parLost) return "noop";
    // K114 cut: while a contracted move carries on, only its next run.
    const carrying = this.carry.length > 0;
    if (carrying && edgeId !== this.carry[0]) return "reject";
    const e = this.walk.edges[edgeId];
    const head = this.head;
    if (!e || (e.va !== head && e.vb !== head)) return "reject";
    // K137: a broken run is gone.
    if (this.broken(edgeId)) return "reject";
    // K114: a smoldering arm refuses the tap before anything changes.
    if (this.smoldering(edgeId)) return "smolder";
    // K114 stage 2: the real-time fire's departure clock.
    const depart = this.fireL;

    if (
      !this.trailMode &&
      this.pathEdges.length > 0 &&
      edgeId === this.pathEdges[this.pathEdges.length - 1]
    ) {
      // K138: a fresh backtrack under a rule undoes the whole move: the
      // state comes back, and the move's other runs wait in the carry,
      // newest first (each the path's top in turn).
      let undo: number[] | null = null;
      if (this.rule && !carrying && this.moveStarts.length > 0) {
        const d = this.moveStarts.pop()!;
        this.ruleState = this.stateStack.pop()!;
        undo = this.pathEdges.slice(d, -1).reverse();
        this.pendingLeft = this.ruleLeftFrom(
          this.pathVertices[d],
          this.ruleState,
          d > 0 ? this.pathEdges[d - 1] : -1,
          this.moveStarts.length
        );
      }
      this.pathEdges.pop();
      this.pathVertices.pop();
      if (!this.isTitleEdge(edgeId)) {
        this.backtrackDist += e.length;
        this.walkedDist += e.length;
        // K138: under a rule one entry per tap (a whole undo is one "b").
        if (!this.rule || !carrying) this.moveLog.push("b");
      }
      this.taps.push(edgeId);
      this.logMove(head, edgeId, carrying);
      if (undo) this.carry = undo;
      this.cross(edgeId);
      this.fireArrive(head, depart, e.length, this.head);
      this.judge();
      return this.solved ? "win" : "backtrack"; // K139: a free collapse game's end
    }

    // K137 s2: a move that would pay yarn out past the spool is refused,
    // changing nothing (a retrace above reels in, so the limit never traps).
    if (spoolRefuses(this.pathEdges.length, this.spoolCap)) return "spool";

    // K138: a fresh tap under a rule asks the rule first: a refusal changes
    // nothing; otherwise the rest of the move (ice's slide) waits in the
    // carry, and the move logs one entry, good when the kit's fewest taps
    // from its end are one fewer than from its start.
    let move: RuleMove | null = null;
    let good = false;
    if (this.rule && !carrying) {
      move = this.rule.step(head, edgeId, this.ruleState);
      if (!move) return "refused";
      const before = this.ruleRunsLeft();
      const fwd = this.ruleFwd(move.to, move.state, move.runs[move.runs.length - 1], !this.trailMode);
      // The new move's own undo leads back to `before`.
      const after = this.trailMode ? fwd : Math.min(fwd, 1 + before);
      good = Number.isFinite(after) && after === before - 1;
      this.pendingLeft = after;
    }

    // A self-loop run returns to the same vertex; everything else crosses.
    const far = e.va === head ? e.vb : e.va;
    if (!this.isTitleEdge(edgeId)) {
      if (!this.rule) this.moveLog.push(this.onShortestRoute(head, e.length, far) ? "g" : "d");
      else if (move) this.moveLog.push(good ? "g" : "d");
    }
    this.taps.push(edgeId);
    this.logMove(head, edgeId, carrying);
    if (move) {
      this.moveStarts.push(this.pathEdges.length);
      this.stateStack.push(this.ruleState);
      this.ruleState = move.state;
      this.carry = move.runs.slice(1);
    }
    this.cross(edgeId);
    if (!this.isTitleEdge(edgeId)) this.walkedDist += e.length;
    this.pathEdges.push(edgeId);
    this.pathVertices.push(far);
    this.arrive(far);
    this.fireArrive(head, depart, e.length, far);
    // K139: in a free collapse game the exit is only a dead end.
    if (far === this.walk.exit && this.collapse !== "free") {
      this.solved = true;
      this.carry = [];
      return "win";
    }
    this.judge();
    return this.solved ? "win" : "advance"; // K139: a free collapse game's end
  }

  // K114 cut: a move's first run is a player action, and with runs cut it
  // may carry on (the rest of its chain waits in `carry`); a carried-on run
  // only uses up the carry.
  private logMove(from: string, eid: number, carrying: boolean): void {
    if (carrying) {
      this.carry.shift();
      return;
    }
    this.actions.push({ kind: "move", run: eid });
    // K114 walker: a walker takes one run per move, so no contraction there.
    if (this.cutMode === "on" && this.cuts.size > 0) {
      this.carry = carryChain(this.walk, this.cuts, from, eid).slice(1);
    }
  }

  // K137: one crossing of the run; `justBroke` names it when this one
  // broke it. K139: a collapse adds the run's units to the score.
  private cross(eid: number): void {
    const n = ++this.crossings[eid];
    this.justBroke = this.breakable && n === this.breakLimits[eid] ? eid : -1;
    if (this.justBroke >= 0 && this.collapse !== "off") {
      this.collapsedUnits += runUnits(this.walk, eid);
    }
  }

  // K139: is a collapse game on?
  get collapseOn(): boolean {
    return this.collapse !== "off";
  }

  // K139: the maze's units (every maze run's), the score's denominator.
  get collapseTotal(): number {
    if (this.collapseTotalUnits < 0) this.collapseTotalUnits = totalUnits(this.walk);
    return this.collapseTotalUnits;
  }

  // K139: the score, the share of the maze collapsed (a whole percent,
  // rounded down).
  get collapsePercent(): number {
    return sharePercent(this.collapsedUnits, this.collapseTotal);
  }

  // K139: the par of this walk under the current collapse mode (null:
  // collapse off). The search runs once per walk and mode, on first read.
  get collapsePar(): CollapsePar | null {
    const mode = this.collapse;
    if (mode === "off") return null;
    return (this.collapseParOf[mode] ??= searchCollapsePar(this.walk, mode));
  }

  // K137: after a move (or a respawn), from the head: stranded (fragile
  // on) and the strict par loss (which stays lost until reset()).
  private judge(): void {
    if (this.solved) return;
    if (this.collapse === "free") {
      // K139: the game ends, a finish with the score, when no unbroken maze
      // run is reachable.
      if (freeStranded(this.walk, this.head, (eid) => this.broken(eid))) this.solved = true;
      return;
    }
    const strict = this.parMode === "strict";
    if (!this.breakable && !strict) return;
    // K138: a move under a rule is judged once its carry is walked.
    if (this.rule && this.carry.length > 0) return;
    const left = this.runsLeft;
    if (this.breakable) this.stranded = !Number.isFinite(left);
    if (strict && strictLost(left, this.par, this.strokes)) this.parLost = true;
  }

  // K114: an arrival's margin lowers the closest call; no safe arm left
  // loses the race (the exit wins instead). Real time: the move left
  // `from` at `depart` and arrives at depart + len; the departure's margin
  // counts too (not the first move's), and nothing is lost on arrival.
  // K137-b: a move that broke a run refires the fire at the move's end
  // clock (walkedDist; real time, the arrival) before the arrival's margin
  // and the trap test read it; the departure's margin reads it as it was.
  private fireArrive(from: string, depart: number, len: number, at: string): void {
    const before = this.fireLive;
    if (!before) return;
    let fire = before;
    if (this.justBroke >= 0) {
      const end = fire.clock === "realtime" ? depart + len : this.walkedDist;
      fire = this.fireLive = refire(this.walk, before, end, (eid) => this.broken(eid));
    }
    if (fire.clock === "realtime") {
      if (this.taps.length > 1) {
        const left = fireLead(before, from, depart);
        if (left < this.fireClosest) this.fireClosest = left;
      }
      this.fireDepartL = depart;
      this.fireArriveL = depart + len;
      const lead = fireLead(fire, at, this.fireArriveL);
      if (lead < this.fireClosest) this.fireClosest = lead;
      return;
    }
    const L = this.fireL;
    const lead = fireLead(fire, at, L);
    if (lead < this.fireClosest) this.fireClosest = lead;
    if (fireTrapped(this.walk, fire, L, at)) this.fireLost = true;
  }

  // Does stepping from `from` across a run of `len` to `to` stay on a
  // shortest route to the exit? K114: over the live runs (`distToExit`).
  private onShortestRoute(from: string, len: number, to: string): boolean {
    const d0 = this.distToExit.get(from) ?? Infinity;
    const d1 = this.distToExit.get(to) ?? Infinity;
    if (!Number.isFinite(d0) || !Number.isFinite(d1)) return false;
    return len + d1 <= d0 + 1e-9 * Math.max(1, d0);
  }

  private arrive(id: string): void {
    // K115 stage 3a: title vertices (waypoints, spur tips, the seam)
    // never count as visited junctions or dead ends.
    if (this.walk.titleVertices?.has(id)) return;
    const v = this.walk.vertices.get(id);
    if (!v) return;
    if (!v.isEnd) this.visitedJunctions.add(id);
    else if (id !== this.walk.start && id !== this.walk.exit) {
      this.deadEndTips.add(id);
    }
  }
}
