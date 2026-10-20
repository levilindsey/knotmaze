// SAVED DAILY ATTEMPTS (K47): turning the live solve into a stored record
// (game/daily_store.ts DailyAttempt) and back. Pure - main.ts owns the
// clock, the store and the screen.
//
// The record's taps ARE the attempt: FabricMazeController.replay rebuilds
// the path, both meters, the visited junctions and dead ends and the move
// log from them. A restore is refused - the controller left at the
// entrance - when the walk graph is not the one the taps were made on (its
// fingerprint differs: the generation code moved), when a tap is not a
// legal move, or when the replay does not arrive at the saved path.
//
// THE MAZE FORM (K552). A daily may wear its title thread or not (the
// dailyTitleThread flag), and the title never changes the maze: the
// titled walk is the untitled walk plus the title's runs (the seam takes
// the old start's place; test/core/title_topology.test.ts pins it). So an
// attempt is stored in maze form: its taps and path name only maze runs,
// by their index among the walk's non-title runs (which is the untitled
// walk's own run id), and the fingerprint hashes the maze portion only. A
// record saved with the title on restores with it off and back, and an
// untitled record is exactly what K47 stored (for an untitled walk the
// maze form is the identity). On a titled scene a restore first replays
// the title's forced walk (titlePrefix: the shortest walk from the start
// to the seam, taps the player makes anyway), then the maze taps.
//
// One titled walk does not survive the round trip, and its restore is
// refused ("path") rather than rebuilt wrong: the title's runs hold
// cycles, so a walk that comes back to the seam by a maze advance, enters
// the title, returns to the seam around a title cycle (advances all the
// way) and then takes the entrance run again advances where the title-free
// replay backtracks. The heads, the walked meter and so the stars agree;
// the path, the backtrack meter and the move log would not.

import type { WalkGraph } from "../core/walk_graph";
import { walkDistances } from "../core/walk_graph";
import type { FabricMazeController } from "./fabric_controller";
import type { DailyAttempt } from "./daily_store";

// A walk's maze form: walk run id -> maze run index (-1 for a title run),
// and back. The identity on an untitled walk.
interface MazeForm {
  toMaze: Int32Array;
  fromMaze: Int32Array;
}

const forms = new WeakMap<WalkGraph, MazeForm>();

function mazeForm(walk: WalkGraph): MazeForm {
  let f = forms.get(walk);
  if (f) return f;
  const title = walk.titleEdges;
  const toMaze = new Int32Array(walk.edges.length);
  const from: number[] = [];
  for (let id = 0; id < walk.edges.length; id++) {
    if (title?.has(id)) {
      toMaze[id] = -1;
    } else {
      toMaze[id] = from.length;
      from.push(id);
    }
  }
  f = { toMaze, fromMaze: Int32Array.from(from) };
  forms.set(walk, f);
  return f;
}

// Walk run ids -> maze run indices, title runs dropped.
function toMazeRuns(walk: WalkGraph, runs: readonly number[]): number[] {
  const { toMaze } = mazeForm(walk);
  const out: number[] = [];
  for (const id of runs) {
    const m = toMaze[id];
    if (m !== undefined && m >= 0) out.push(m);
  }
  return out;
}

// Maze run indices -> walk run ids. A value that names no maze run maps to
// -1, which the replay rejects.
function fromMazeRuns(walk: WalkGraph, runs: readonly number[]): number[] {
  const { fromMaze } = mazeForm(walk);
  return runs.map((m) => (Number.isInteger(m) && m >= 0 && m < fromMaze.length ? fromMaze[m] : -1));
}

// The maze-form taps of the solve on a controller (what a saved record of
// it holds), for comparing a stored attempt with the live one.
export function mazeTaps(c: FabricMazeController): number[] {
  return toMazeRuns(c.walk, c.taps);
}

// The title's forced walk (titled walks; [] otherwise): the shortest walk
// from the start to the seam, as taps. Deterministic: Dijkstra's
// distances, then back from the seam along exact-distance title runs, the
// lowest run id first.
export function titlePrefix(walk: WalkGraph): number[] {
  const seam = walk.mazeStart;
  const title = walk.titleEdges;
  if (seam === undefined || !title) return [];
  const dist = walkDistances(walk.vertices, walk.edges, walk.start);
  if (!Number.isFinite(dist.get(seam) ?? Infinity)) return [];
  const out: number[] = [];
  let v = seam;
  while (v !== walk.start) {
    const dv = dist.get(v)!;
    let pick = -1;
    let prev = "";
    for (const eid of walk.vertices.get(v)!.edges) {
      if (!title.has(eid)) continue;
      const e = walk.edges[eid];
      const u = e.va === v ? e.vb : e.va;
      if (u === v) continue;
      if (dist.get(u)! + e.length === dv && (pick < 0 || eid < pick)) {
        pick = eid;
        prev = u;
      }
    }
    if (pick < 0) return [];
    out.push(pick);
    v = prev;
  }
  return out.reverse();
}

// A walk graph's identity: its size, the entrance and exit, and every run
// (ends + lattice length) hashed (FNV-1a), so a moved maze never accepts
// another maze's taps (run ids are only indices). K552: the maze portion
// only - the title's runs are skipped, the seam stands for the start and
// renamed vertices read by their maze names - so a titled walk and its
// untitled walk share one fingerprint, and an untitled walk's is the one
// K47 computed.
export function walkFingerprint(walk: WalkGraph): string {
  let h = 0x811c9dc5;
  const add = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    }
  };
  const title = walk.titleEdges;
  const names = walk.mazeNames;
  const name = (id: string): string => names?.get(id) ?? id;
  add(`${name(walk.mazeStart ?? walk.start)}>${name(walk.exit)};`);
  let runs = 0;
  const ends = new Set<string>();
  for (const e of walk.edges) {
    if (title?.has(e.id)) continue;
    const a = name(e.va);
    const b = name(e.vb);
    add(`${a}>${b}:${Math.round(e.length * 1e6)};`);
    runs++;
    if (title) {
      ends.add(a);
      ends.add(b);
    }
  }
  const hex = h.toString(16).padStart(8, "0");
  return `w1.${title ? ends.size : walk.vertices.size}.${runs}.${hex}`;
}

export interface AttemptInfo {
  startedAt: number;
  day: number;
  elapsedMs: number;
  maze: string;
  def: number;
  savedAt: number;
}

// The record of the solve in progress, in maze form (null before its first
// maze move). The move log holds maze moves only (the controller logs no
// title move), so it lines up with the taps.
export function attemptRecord(
  c: FabricMazeController,
  info: AttemptInfo
): DailyAttempt | null {
  const taps = toMazeRuns(c.walk, c.taps);
  if (taps.length === 0) return null;
  return {
    startedAt: info.startedAt,
    day: info.day,
    elapsedMs: Math.max(0, Math.round(info.elapsedMs)),
    taps,
    path: toMazeRuns(c.walk, c.pathEdges),
    moves: c.moveLog.join(""),
    backtrack: c.backtrackDist,
    maze: info.maze,
    def: info.def,
    savedAt: info.savedAt,
  };
}

export type RestoreOutcome = "ok" | "maze" | "taps" | "path";

// Put a saved attempt back onto a fresh controller for the same maze.
// Anything but "ok" leaves the controller at the entrance.
export function restoreAttempt(
  c: FabricMazeController,
  a: DailyAttempt,
  maze: string
): RestoreOutcome {
  if (a.maze !== maze) {
    c.reset();
    return "maze";
  }
  if (!c.replay([...titlePrefix(c.walk), ...fromMazeRuns(c.walk, a.taps)])) return "taps";
  const path = toMazeRuns(c.walk, c.pathEdges);
  const same = path.length === a.path.length && path.every((e, i) => e === a.path[i]);
  if (!same) {
    c.reset();
    return "path";
  }
  return "ok";
}

// What the Reset path button does. Inside a daily's unfinished attempt -
// the one that will be official - it never restarts the attempt: it is
// backtracking to the entrance (FabricMazeController.retreatToStart),
// the clock running on; memory-trail mode has no way back, so there it
// does nothing. Anywhere else - an ordinary design, a replay, a practice
// run (K146), a finished solve - it starts a fresh attempt, as it always
// has. The real-time minotaur mode (K80) always restarts: a free walk back
// to the entrance would be an escape from the chase (no undo there, Levi's
// call 4).
export type ResetPathAction = "backtrack" | "refuse" | "restart";

export function resetPathAction(s: {
  // The solve on screen is the daily's own unfinished attempt.
  dailyAttempt: boolean;
  // That daily already has its official result (this is a replay).
  official: boolean;
  solved: boolean;
  trailMode: boolean;
  realtime?: boolean;
  // K146: the attempt began after its day (practice, never scored).
  practice?: boolean;
}): ResetPathAction {
  if (s.realtime || !s.dailyAttempt || s.official || s.practice || s.solved) {
    return "restart";
  }
  return s.trailMode ? "refuse" : "backtrack";
}

// What the fog of war has explored: every run crossed since the solve last
// restarted, in tap order, repeats kept (live play stamps a run again each
// time it is walked). K100: the live fog starts over only when the solve
// restarts (FabricMazeController.reset), which is also the one thing that
// empties the taps, so the taps are exactly what it has explored; a
// backtrack to the entrance, by hand or by a daily's Reset path
// (retreatToStart), keeps both. main.ts re-explores these runs when a saved
// attempt comes back (pendingExplored), so the restored fog is the one the
// page showed before the reload.
export function exploredRuns(c: FabricMazeController): number[] {
  return [...c.taps];
}
