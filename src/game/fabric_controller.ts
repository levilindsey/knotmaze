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

import type { WalkGraph } from "../core/walk_graph";
import type { MoveKind } from "./maze_stats";
import type { Fire } from "./fire";
import { armSafe, fireLead, fireTime, fireTrapped, runBurnAt } from "./fire";

export type FabricTapResult =
  | "advance" // stepped across a run to its far vertex
  | "backtrack" // retracted the last run
  | "reject" // the run is not incident to the current head
  | "noop" // after solving (or after a K114 burn-race loss)
  | "win" // advanced onto the exit tail
  | "smolder"; // K114: refused, the fire reaches the arm's far end first

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
  // after (main.ts restarts the solve).
  fire: Fire | null;
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

  constructor(walk: WalkGraph, trailMode = false, fire: Fire | null = null) {
    this.walk = walk;
    this.trailMode = trailMode;
    this.fire = fire;
    this.reset();
  }

  reset(): void {
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
      const r = Number.isInteger(eid) ? this.tapEdge(eid) : "reject";
      if (r === "reject" || r === "noop" || r === "smolder") {
        this.reset();
        return false;
      }
    }
    return true;
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
    if (this.solved || this.fireLost) return [];
    const edges = this.walk.vertices.get(this.head)!.edges;
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

  tapEdge(edgeId: number): FabricTapResult {
    if (this.solved || this.fireLost) return "noop";
    const e = this.walk.edges[edgeId];
    const head = this.head;
    if (!e || (e.va !== head && e.vb !== head)) return "reject";
    // K114: a smoldering arm refuses the tap before anything changes.
    if (this.smoldering(edgeId)) return "smolder";
    // K114 stage 2: the real-time fire's departure clock.
    const depart = this.fireL;

    if (
      !this.trailMode &&
      this.pathEdges.length > 0 &&
      edgeId === this.pathEdges[this.pathEdges.length - 1]
    ) {
      this.pathEdges.pop();
      this.pathVertices.pop();
      if (!this.isTitleEdge(edgeId)) {
        this.backtrackDist += e.length;
        this.walkedDist += e.length;
        this.moveLog.push("b");
      }
      this.taps.push(edgeId);
      this.fireArrive(head, depart, e.length, this.head);
      return "backtrack";
    }

    // A self-loop run returns to the same vertex; everything else crosses.
    const far = e.va === head ? e.vb : e.va;
    if (!this.isTitleEdge(edgeId)) {
      this.moveLog.push(this.onShortestRoute(head, e.length, far) ? "g" : "d");
    }
    this.taps.push(edgeId);
    if (!this.isTitleEdge(edgeId)) this.walkedDist += e.length;
    this.pathEdges.push(edgeId);
    this.pathVertices.push(far);
    this.arrive(far);
    this.fireArrive(head, depart, e.length, far);
    if (far === this.walk.exit) {
      this.solved = true;
      return "win";
    }
    return "advance";
  }

  // K114: an arrival's margin lowers the closest call; no safe arm left
  // loses the race (the exit wins instead). Real time: the move left
  // `from` at `depart` and arrives at depart + len; the departure's margin
  // counts too (not the first move's), and nothing is lost on arrival.
  private fireArrive(from: string, depart: number, len: number, at: string): void {
    const fire = this.fire;
    if (!fire) return;
    if (fire.clock === "realtime") {
      if (this.taps.length > 1) {
        const left = fireLead(fire, from, depart);
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
  // shortest route to the exit?
  private onShortestRoute(from: string, len: number, to: string): boolean {
    const d0 = this.walk.distToExit.get(from) ?? Infinity;
    const d1 = this.walk.distToExit.get(to) ?? Infinity;
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
