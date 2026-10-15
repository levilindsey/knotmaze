// K120: moves by DIRECTION - the arrow keys, WASD and the move pad (ui/
// move_pad.ts) pick a run at the player's junction by where it goes on
// screen, then move along it exactly as a tap on that run would (main.ts).
//
// THE DIRECTION OF A RUN (departureVectors): the chord from the junction
// to the point KEY_REACH world units of arc along the run (its far end when
// it is shorter). The camera only scales and translates, so a world
// direction IS the screen direction (y down).
//
// THE PICK (keyMap): each key takes the run whose direction is nearest its
// own, within KEY_TOLERANCE. When the runner-up lies within KEY_TIE of that
// best, the key is AMBIGUOUS: it takes, of the runs near-tied for it, the
// one run that no unambiguous key already reaches. So at a fork of
// up-right, down-right and left, up and down take the two right-hand runs
// and right does nothing, while at up-right, down-right and down-left,
// right and down both take the down-right run (up and left have the
// others): every run has a key.
// TIE CYCLES (K329): where no key is unambiguous that never starts. At an
// X (four arms near the diagonals) each key ties between the two arms
// beside it, and before K329 no key moved at all (Levi's link
// `?qoietk.KaIeBFFfBGVG3x8Mj4`, the junction after the entrance). Ambiguous
// keys that share their free runs one to one get a run each: at an X (four
// keys, four arms) every key takes the arm CLOCKWISE of it - up the
// up-right arm, right the down-right, down the down-left, left the up-left
// - while every key is within KEY_TIE of its two arms the deal does not
// depend on which arm is a degree nearer, so it holds while the threads
// drift (it changes only where a key's nearer arm wins by more than
// KEY_TIE, and then elimination decides); at a narrow fork (two adjacent
// keys, two branches under KEY_TIE apart between them) each key takes the
// branch on its own side. A key whose near-tied runs no other key shares
// is a real fork: nothing.
//  - A PRESS moves along its key's run. Like a tap, it may advance,
//    backtrack (the run the player came along, when it is the key's) or
//    win.
//  - A HOLD (the key kept down) takes its key's next run when the dot
//    arrives, from the runs other than the one it arrived on (it would
//    ping-pong). It stops where its key has no run: nothing within the
//    tolerance, an ambiguous fork (a tie cycle's pick included: the player
//    chose no arm there), a dead-end tip (its only run is the arrival) and
//    the finish.
// CHORDS (K333): two ADJACENT keys pressed together (up + right, ...) name
// a diagonal; chordMap picks over the four diagonals by the same rules,
// and a chord held is a hold along its diagonal. Keys that go down within
// CHORD_WINDOW_MS of each other are a chord; opposite keys are none. A lone
// press waits out the window only where a chord could change it: the key
// alone is ambiguous (tied, a tie or nothing) and a chord with a key beside
// it picks another run (chordMatters). Everywhere else it moves at once,
// and a second key inside the window whose chord picks the run already
// taken adds nothing (absorbsChord).
// NO SNAP (K334, MoveWait; main.ts keyPress, queueTap): no input cuts a
// move short any more. A press, a pad touch, a tap or a click while the dot
// travels in turn mode waits for the dot to arrive and is taken on the
// arrival frame (the latest input wins; the hover shows its run). Levi,
// 2026-10-14: every input waits, so every move animates (main.ts
// `tapsWait`; the hook's setTapsWait(false) restores the tap snap for
// A/Bs). A HELD key chains: its next move starts on the frame the dot
// arrives (holdDue), no rest frame and no snap, except after a first run
// shorter than HOLD_DELAY_MS, where it waits for the delay (a quick press
// stays one move). The chase queues its own inputs, as before.
// THE CENSUS (K120, before K329: 24 settled mazes at codec v4's defaults,
// 4259 junctions, 96% of degree 3; .claude/probes/K120/census*.txt): runs
// leave a junction mostly DIAGONALLY (half of them within 9 degrees of a
// diagonal). Their chords separate best close to the junction - the
// smallest angle between two runs of a junction, 1st percentile: 62
// degrees at a 0.5 reach, 48 at 1, 21 at 1.5, 0 at the far ends (runs bend
// toward each other). At reach 0.5, tolerance 70 and tie 15, four keys
// reach every run at 98.9% of junctions; a press does nothing for 1.9% of
// key-junction pairs (no run within 70) and 9.4% (ambiguous); a hold that
// arrived moving its key's way goes on 83%, stops at a fork 15% and finds
// nothing 2%. Tie 10 would go on 87% at the price of taking forks whose
// two branches differ by less than 15 degrees; tie 0 (the best always)
// leaves a run of 5% of junctions on no key. `__knotKeyMoves().censusPress()`
// counts one maze with K329's rules.
//
// KEYS (keyDirOf): the arrows by `key`, WASD by `code` - the physical
// positions, so AZERTY's ZQSD and every layout's WASD cluster work. Two
// keys held ONE AFTER THE OTHER (not a chord) are an order of preference,
// newest first (HeldKeys.dirs, pickHold) - hold right, then add up, and
// the hold takes an up run where up has one and goes on right where it has
// none; let go of up and right steers alone again.

export type KeyDir = "up" | "down" | "left" | "right";

// Screen (= world) unit vectors, y down.
export const KEY_VECTORS: Readonly<Record<KeyDir, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// World units of arc along a run to the point its direction is read at.
export const KEY_REACH = 0.5;
// The widest angle a match may lie off the key (radians).
export const KEY_TOLERANCE = (70 * Math.PI) / 180;
// A key is ambiguous when its runner-up lies within this of the best
// (radians).
export const KEY_TIE = (15 * Math.PI) / 180;
// A hold's first follow-up move waits until its key has been down this
// long (ms), so a quick press on a short run stays one move: the dot can
// arrive in 60 ms, inside an ordinary press.
export const HOLD_DELAY_MS = 200;
// K333: two keys that go down within this of each other are a chord (ms).
// A lone press waits this long only where a chord could change its pick
// (chordMatters). Two keys pressed "together" land 0-50 ms apart; fighting
// games accept 2-5 frames (33-83 ms) for a simultaneous press. 80 covers a
// sloppy chord, stays under the ~100 ms where a delay starts to read as
// lag, and sits well inside HOLD_DELAY_MS.
export const CHORD_WINDOW_MS = 80;
// Ctrl step of the reach walk.
const REACH_STEP = 0.1;

const ARROWS: Readonly<Record<string, KeyDir>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
const WASD: Readonly<Record<string, KeyDir>> = {
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

// The direction a key names, or null (any other key).
export function keyDirOf(e: { key: string; code?: string }): KeyDir | null {
  return ARROWS[e.key] ?? (e.code ? WASD[e.code] : undefined) ?? null;
}

// The run fields the reach walk needs (core/walk_graph.ts WalkEdge).
export interface RunEnds {
  va: string;
  vb: string;
  chain: number;
  ctrlA: number;
  ctrlB: number; // Unwrapped: >= ctrlA.
}

// World position of a chain at a ctrl (wrapping is the sampler's job).
export type PointAt = (chain: number, ctrl: number, out: Float32Array) => void;

// One way out of a junction: a run and the unit direction it leaves in. A
// self-loop leaves twice (once from each end), under the same run id.
export interface Departure {
  edge: number;
  dx: number;
  dy: number;
}

const tmp = new Float32Array(2);

// The unit chord from (ox, oy) to the point `reach` world units of arc
// along the run from one end (fromA: ctrlA upward, else ctrlB downward),
// or the far end when the run is shorter. Null when the chord vanishes.
export function chordDirection(
  e: RunEnds,
  fromA: boolean,
  ox: number,
  oy: number,
  pointAt: PointAt,
  reach: number = KEY_REACH
): [number, number] | null {
  const len = e.ctrlB - e.ctrlA;
  const start = fromA ? e.ctrlA : e.ctrlB;
  const sign = fromA ? 1 : -1;
  pointAt(e.chain, start, tmp);
  let px = tmp[0];
  let py = tmp[1];
  let arc = 0;
  // A self-loop's far end is the junction itself: its farthest point
  // from the junction stands in for the end.
  let fx = px;
  let fy = py;
  let fd = -1;
  for (let f = REACH_STEP; ; f += REACH_STEP) {
    const ff = Math.min(f, len);
    pointAt(e.chain, start + sign * ff, tmp);
    const sx = tmp[0] - px;
    const sy = tmp[1] - py;
    arc += Math.sqrt(sx * sx + sy * sy);
    px = tmp[0];
    py = tmp[1];
    const d = (px - ox) * (px - ox) + (py - oy) * (py - oy);
    if (d > fd) {
      fd = d;
      fx = px;
      fy = py;
    }
    if (arc >= reach) break;
    if (ff >= len) {
      // Shorter than the reach: its end, or for a loop back to the
      // junction, its farthest point.
      if (d < 0.25 * fd) {
        px = fx;
        py = fy;
      }
      break;
    }
  }
  const dx = px - ox;
  const dy = py - oy;
  const n = Math.sqrt(dx * dx + dy * dy);
  if (!(n > 1e-6)) return null;
  return [dx / n, dy / n];
}

// Every way out of junction `vertex` at (ox, oy) along the runs `choices`.
export function departureVectors(
  edges: readonly RunEnds[],
  choices: readonly number[],
  vertex: string,
  ox: number,
  oy: number,
  pointAt: PointAt,
  reach: number = KEY_REACH
): Departure[] {
  const out: Departure[] = [];
  for (const eid of choices) {
    const e = edges[eid];
    if (!e) continue;
    for (const fromA of [true, false]) {
      if ((fromA ? e.va : e.vb) !== vertex) continue;
      const d = chordDirection(e, fromA, ox, oy, pointAt, reach);
      if (d) out.push({ edge: eid, dx: d[0], dy: d[1] });
    }
  }
  return out;
}

export interface PickOptions {
  hold: boolean; // The hold rules: no arrival run, a tie stops.
  exclude?: number; // The run a hold just arrived on (-1: none).
  tolerance?: number; // Radians; KEY_TOLERANCE.
  tie?: number; // Radians; KEY_TIE.
}

// A run a key (or a chord) takes, or why it takes none. `tied`: the key
// was ambiguous and the tie rules settled it; `cycle`: settled by a tie
// cycle (K329), where a hold stops.
export type KeyPick =
  | { edge: number; err: number; tied?: true; cycle?: true }
  | { edge: -1; stop: "none" | "tie" };

const NONE: KeyPick = { edge: -1, stop: "none" };
const TIE: KeyPick = { edge: -1, stop: "tie" };

// True for a pick the tie rules settled (see KeyPick).
export function pickTied(p: KeyPick): boolean {
  return p.edge >= 0 && "err" in p && p.tied === true;
}

// Angle between a unit departure and a unit key vector, in [0, pi].
export function angleOff(d: Departure, kx: number, ky: number): number {
  const c = d.dx * kx + d.dy * ky;
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

export const KEY_DIRS: readonly KeyDir[] = ["up", "down", "left", "right"];

// K333: two adjacent keys pressed together name a diagonal.
export type Diagonal = "upRight" | "downRight" | "downLeft" | "upLeft";
export const DIAGONALS: readonly Diagonal[] = ["upRight", "downRight", "downLeft", "upLeft"];
const R2 = Math.SQRT1_2;
// Screen (= world) unit vectors, y down.
export const DIAGONAL_VECTORS: Readonly<Record<Diagonal, readonly [number, number]>> = {
  upRight: [R2, -R2],
  downRight: [R2, R2],
  downLeft: [-R2, R2],
  upLeft: [-R2, -R2],
};
// The two keys beside each key: its chord partners.
export const ADJACENT: Readonly<Record<KeyDir, readonly [KeyDir, KeyDir]>> = {
  up: ["left", "right"],
  down: ["left", "right"],
  left: ["up", "down"],
  right: ["up", "down"],
};

// The diagonal two keys name, in either order; null for one key twice or
// opposite keys (up + down is no direction).
export function chordOf(a: KeyDir, b: KeyDir): Diagonal | null {
  const keys = [a, b];
  const up = keys.includes("up");
  const down = keys.includes("down");
  const left = keys.includes("left");
  const right = keys.includes("right");
  if (up === down || left === right) return null;
  if (up) return right ? "upRight" : "upLeft";
  return right ? "downRight" : "downLeft";
}

// Whether `edge` leaves clockwise of the direction (kx, ky) on screen (y
// down), from its departure nearest that direction.
function leavesClockwise(
  deps: readonly Departure[],
  edge: number,
  kx: number,
  ky: number
): boolean {
  let best = Infinity;
  let cross = 0;
  for (const d of deps) {
    if (d.edge !== edge) continue;
    const a = angleOff(d, kx, ky);
    if (a < best) {
      best = a;
      cross = kx * d.dy - ky * d.dx;
    }
  }
  return cross > 0;
}

// Every direction's run at a junction, over directions 90 degrees apart:
// the four keys, or K333's four diagonals. The rules are THE PICK and TIE
// CYCLES in the header.
function dirMap<D extends string>(
  deps: readonly Departure[],
  dirs: readonly D[],
  vectors: Readonly<Record<D, readonly [number, number]>>,
  o: { exclude?: number; tolerance?: number; tie?: number }
): Record<D, KeyPick> {
  const tol = o.tolerance ?? KEY_TOLERANCE;
  const tie = o.tie ?? KEY_TIE;
  const exclude = o.exclude ?? -1;
  // Each run's error for each direction, from its best departure (a
  // self-loop leaves twice).
  const errs = new Map<number, number[]>();
  for (const d of deps) {
    if (d.edge === exclude) continue;
    const e = dirs.map((k) => angleOff(d, vectors[k][0], vectors[k][1]));
    const prev = errs.get(d.edge);
    errs.set(d.edge, prev ? prev.map((p, i) => Math.min(p, e[i])) : e);
  }
  const errOf = (edge: number, k: D): number => errs.get(edge)![dirs.indexOf(k)];
  const out = {} as Record<D, KeyPick>;
  const near = new Map<D, number[]>();
  const claimed = new Set<number>();
  dirs.forEach((k, i) => {
    let best = Infinity;
    for (const e of errs.values()) best = Math.min(best, e[i]);
    if (!(best <= tol)) {
      out[k] = NONE;
      return;
    }
    const ids: number[] = [];
    for (const [id, e] of errs) if (e[i] <= tol && e[i] - best <= tie) ids.push(id);
    if (ids.length === 1) {
      out[k] = { edge: ids[0], err: best };
      claimed.add(ids[0]);
    } else {
      near.set(k, ids);
    }
  });
  // Resolving one direction can settle another (its run is claimed now).
  for (let pass = 0; pass < dirs.length && near.size > 0; pass++) {
    const taken = new Set(claimed);
    for (const [k, ids] of near) {
      const free = ids.filter((id) => !taken.has(id));
      if (free.length !== 1) continue;
      out[k] = { edge: free[0], err: errOf(free[0], k), tied: true };
      claimed.add(free[0]);
      near.delete(k);
    }
    if (claimed.size === taken.size) break;
  }
  // K329 TIE CYCLES. What is left has two free runs or none per direction
  // (one would have been taken above). A run lies within the tolerance (70
  // degrees) of at most two directions, the two beside it, so directions
  // joined by shared free runs, as many runs as directions, form an even
  // cycle: two adjacent directions between two close runs, or all four
  // around an X. Such a cycle has two one-to-one deals: an X takes the
  // clockwise one, two directions the smaller worst error (each the run on
  // its own side). Anything else stays a tie.
  const free = new Map<D, number[]>();
  for (const [k, ids] of near) free.set(k, ids.filter((id) => !claimed.has(id)));
  const seen = new Set<D>();
  for (const k0 of [...near.keys()]) {
    if (seen.has(k0) || free.get(k0)!.length < 2) continue;
    const keys: D[] = [];
    const runs: number[] = [];
    const stack = [k0];
    seen.add(k0);
    while (stack.length > 0) {
      const k = stack.pop()!;
      keys.push(k);
      for (const r of free.get(k)!) {
        if (runs.includes(r)) continue;
        runs.push(r);
        for (const [k2, ids] of free) {
          if (!seen.has(k2) && ids.includes(r)) {
            seen.add(k2);
            stack.push(k2);
          }
        }
      }
    }
    if (keys.length !== runs.length || keys.length > dirs.length) continue;
    keys.sort((a, b) => dirs.indexOf(a) - dirs.indexOf(b));
    runs.sort((a, b) => a - b);
    const around = keys.length === dirs.length;
    // The best one-to-one deal: [runs by key, score]. Score, lowest first:
    // around an X the keys whose run is not clockwise of them, then the
    // worst error, then the total.
    const best: { deal: number[] | null; score: number[] } = { deal: null, score: [] };
    const tryDeals = (i: number, used: number[]): void => {
      if (i === keys.length) {
        const es = keys.map((k, j) => errOf(used[j], k));
        const ccw = around
          ? keys.filter((k, j) => !leavesClockwise(deps, used[j], vectors[k][0], vectors[k][1]))
              .length
          : 0;
        const score = [ccw, Math.max(...es), es.reduce((a, b) => a + b, 0)];
        let better = best.deal === null;
        for (let s = 0; !better && s < score.length; s++) {
          if (score[s] < best.score[s] - 1e-12) better = true;
          else if (score[s] > best.score[s] + 1e-12) break;
        }
        if (better) {
          best.deal = [...used];
          best.score = score;
        }
        return;
      }
      for (const r of free.get(keys[i])!) {
        if (used.includes(r)) continue;
        used.push(r);
        tryDeals(i + 1, used);
        used.pop();
      }
    };
    tryDeals(0, []);
    const dealt = best.deal;
    if (dealt === null) continue;
    keys.forEach((k, j) => {
      out[k] = { edge: dealt[j], err: errOf(dealt[j], k), tied: true, cycle: true };
      near.delete(k);
    });
  }
  for (const k of near.keys()) out[k] = TIE;
  return out;
}

// Every key's run at a junction (see the header for the rules).
export function keyMap(
  deps: readonly Departure[],
  o: { exclude?: number; tolerance?: number; tie?: number } = {}
): Record<KeyDir, KeyPick> {
  return dirMap(deps, KEY_DIRS, KEY_VECTORS, o);
}

// K333: every chord's run at a junction, by the same rules over the four
// diagonals.
export function chordMap(
  deps: readonly Departure[],
  o: { exclude?: number; tolerance?: number; tie?: number } = {}
): Record<Diagonal, KeyPick> {
  return dirMap(deps, DIAGONALS, DIAGONAL_VECTORS, o);
}

// A hold stops at a tie cycle's pick: the player chose no arm there.
function holdRules(p: KeyPick, hold: boolean): KeyPick {
  return hold && p.edge >= 0 && "err" in p && p.cycle === true ? TIE : p;
}

// The run one key picks among `deps`: a press, or with `hold` a hold's
// next move (the arrival run excluded).
export function pickDeparture(
  deps: readonly Departure[],
  dir: KeyDir,
  o: PickOptions
): KeyPick {
  const m = keyMap(deps, {
    exclude: o.hold ? (o.exclude ?? -1) : -1,
    tolerance: o.tolerance,
    tie: o.tie,
  });
  return holdRules(m[dir], o.hold);
}

// K333: the run a chord picks, by the same rules.
export function pickChord(
  deps: readonly Departure[],
  diag: Diagonal,
  o: PickOptions
): KeyPick {
  const m = chordMap(deps, {
    exclude: o.hold ? (o.exclude ?? -1) : -1,
    tolerance: o.tolerance,
    tie: o.tie,
  });
  return holdRules(m[diag], o.hold);
}

// A press of one key, or of a chord (two adjacent keys): `dirs` oldest
// first. Two keys that are no chord press the newer one.
export function pickMove(
  deps: readonly Departure[],
  dirs: readonly KeyDir[],
  o: PickOptions
): KeyPick {
  if (dirs.length === 0) return NONE;
  const diag = dirs.length >= 2 ? chordOf(dirs[0], dirs[1]) : null;
  return diag ? pickChord(deps, diag, o) : pickDeparture(deps, dirs[dirs.length - 1], o);
}

// K333: what the chord of `dir` with each key beside it picks (-1:
// nothing).
export function chordEdges(
  deps: readonly Departure[],
  dir: KeyDir
): Partial<Record<KeyDir, number>> {
  const chords = chordMap(deps);
  const out: Partial<Record<KeyDir, number>> = {};
  for (const other of ADJACENT[dir]) out[other] = chords[chordOf(dir, other)!].edge;
  return out;
}

// K333: whether a lone press of `dir` waits CHORD_WINDOW_MS for a second
// key: only where the key alone is ambiguous or finds nothing (tied, a tie
// or none) AND a chord with a key beside it picks another run. Where the
// key alone is clear it moves at once (runs leave mostly diagonally, so a
// chord picks another run almost everywhere: waiting on that alone would
// delay nearly every press).
export function chordMatters(deps: readonly Departure[], dir: KeyDir): boolean {
  const lone = keyMap(deps)[dir];
  if (lone.edge >= 0 && !pickTied(lone)) return false;
  const chords = chordEdges(deps, dir);
  return ADJACENT[dir].some((other) => {
    const e = chords[other] ?? -1;
    return e >= 0 && e !== lone.edge;
  });
}

// A press waiting to be taken (K333's chord window, or K334's moving dot):
// its keys, oldest first, and when its first key went down (ms).
export interface PendingPress {
  dirs: readonly KeyDir[];
  at: number;
}

// K333: a fresh key joins a waiting one-key press as a chord when it lies
// beside that key and comes within the window.
export function joinsChord(p: PendingPress | null, dir: KeyDir, now: number): boolean {
  return (
    p !== null &&
    p.dirs.length === 1 &&
    chordOf(p.dirs[0], dir) !== null &&
    now - p.at <= CHORD_WINDOW_MS
  );
}

// The last lone press that moved at once: its key, when (ms), its run and
// what its chords picked at the junction it left (chordEdges).
export interface LastPress {
  dir: KeyDir;
  at: number;
  edge: number;
  chords: Partial<Record<KeyDir, number>>;
}

// K333: the second key of a chord whose first key already moved (it was
// clear alone, so it did not wait) adds nothing when it comes within the
// window, the first key is still down and the chord picks the run already
// taken. Otherwise it is a press of its own.
export function absorbsChord(
  last: LastPress | null,
  dir: KeyDir,
  now: number,
  firstHeld: boolean
): boolean {
  return (
    last !== null &&
    firstHeld &&
    last.edge >= 0 &&
    now - last.at <= CHORD_WINDOW_MS &&
    chordOf(last.dir, dir) !== null &&
    last.chords[dir] === last.edge
  );
}

// K333/K334: a move not taken yet: keys (oldest first), or a tap's run
// (`edge` >= 0), from `at` (ms). `queued`: it waits for the dot's arrival
// (K334); otherwise for the rest of its chord window (K333).
export interface WaitingMove {
  dirs: KeyDir[];
  at: number;
  queued: boolean;
  edge: number;
}

// What a fresh key press does (MoveWait.press):
//  - "chord": it joins the waiting key as a chord (taken at once unless it
//    waits for the arrival: takeNow);
//  - "absorb": the second key of a chord whose first key already moved
//    along the run the chord picks: nothing more;
//  - "queue": the dot travels, so it waits for the arrival (the latest
//    press or tap wins), never snapping the dot to the run's end;
//  - "window": ambiguous alone, it waits CHORD_WINDOW_MS for a key beside
//    it;
//  - "now": it moves at once.
export type PressAction = "chord" | "absorb" | "queue" | "window" | "now";

// K333/K334: the one move waiting to be taken, a press waiting out its
// chord window or a press or tap waiting for the dot's arrival. The caller
// takes what it hands back, along the run the junction it leaves from
// picks then, and drops it (clear) when a tap, reset, catch or rebuild
// changes the solve under it.
export class MoveWait {
  waiting: WaitingMove | null = null;

  // Before a fresh press: a press waiting out its window that this key does
  // not join goes first (handed back, to take before the new one).
  before(dir: KeyDir, at: number): WaitingMove | null {
    const w = this.waiting;
    if (w === null || w.queued || joinsChord(w, dir, at)) return null;
    this.waiting = null;
    return w;
  }

  // A fresh key press at `at`. `moving`: the dot travels. `absorbed`:
  // absorbsChord for this key. `ambiguous`: chordMatters for it at the
  // junction it leaves from.
  press(
    dir: KeyDir,
    at: number,
    o: { moving: boolean; absorbed: boolean; ambiguous: () => boolean }
  ): PressAction {
    const w = this.waiting;
    if (w !== null && w.edge < 0 && joinsChord(w, dir, at)) {
      w.dirs = [w.dirs[0], dir];
      return "chord";
    }
    if (o.absorbed) return "absorb";
    if (o.moving) {
      this.waiting = { dirs: [dir], at, queued: true, edge: -1 };
      return "queue";
    }
    if (o.ambiguous()) {
      this.waiting = { dirs: [dir], at, queued: false, edge: -1 };
      return "window";
    }
    return "now";
  }

  // A tap on run `edge` (K334): while the dot travels it waits for the
  // arrival, the latest press or tap winning. True when it waits.
  tap(edge: number, at: number, moving: boolean): boolean {
    if (!moving) return false;
    this.waiting = { dirs: [], at, queued: true, edge };
    return true;
  }

  // Every frame, after the move animation stepped: "wait" while the move
  // waits (a hold waits with it), the move when it is due (taken off), or
  // null with none. On the arrival a lone key that a key beside it could
  // still turn into a chord there (`ambiguous`) waits out the rest of its
  // window; anything else goes on the arrival frame.
  step(
    now: number,
    moving: boolean,
    ambiguous: (dir: KeyDir) => boolean
  ): WaitingMove | "wait" | null {
    const w = this.waiting;
    if (w === null) return null;
    if (w.queued) {
      if (moving) return "wait";
      w.queued = false;
      if (
        w.edge < 0 &&
        w.dirs.length === 1 &&
        now - w.at < CHORD_WINDOW_MS &&
        ambiguous(w.dirs[0])
      ) {
        return "wait";
      }
    } else if (now - w.at < CHORD_WINDOW_MS) {
      return "wait";
    }
    this.waiting = null;
    return w;
  }

  // A key came up: a press waiting out its window with every key up is due
  // at once (no second key is coming). Handed back, to take.
  release(holds: (dir: KeyDir) => boolean): WaitingMove | null {
    const w = this.waiting;
    if (w === null || w.queued || w.edge >= 0 || w.dirs.some(holds)) return null;
    this.waiting = null;
    return w;
  }

  // The waiting move, taken off now (a chord just completed).
  takeNow(): WaitingMove | null {
    const w = this.waiting;
    this.waiting = null;
    return w;
  }

  clear(): void {
    this.waiting = null;
  }
}

// A hold's next move is due on the frame the dot arrives, once the key has
// been down HOLD_DELAY_MS (a quick press on a short run stays one move):
// the chain goes on with no frame at rest in between.
export function holdDue(o: { moving: boolean; now: number; since: number }): boolean {
  return !o.moving && o.now - o.since >= HOLD_DELAY_MS;
}

// The directions held down, newest last, by source (a key, a pad pointer):
// the newest steers.
export class HeldKeys {
  private held: { id: string; dir: KeyDir; at: number }[] = [];

  // True when `id` was not already held (a fresh press). `at`: when it
  // went down (ms), for chords.
  press(id: string, dir: KeyDir, at = 0): boolean {
    if (this.held.some((h) => h.id === id)) return false;
    this.held.push({ id, dir, at });
    return true;
  }

  release(id: string): void {
    this.held = this.held.filter((h) => h.id !== id);
  }

  has(id: string): boolean {
    return this.held.some((h) => h.id === id);
  }

  // Whether any source holds `dir`.
  holds(dir: KeyDir): boolean {
    return this.held.some((h) => h.dir === dir);
  }

  clear(): void {
    this.held = [];
  }

  get current(): KeyDir | null {
    return this.held.length > 0 ? this.held[this.held.length - 1].dir : null;
  }

  // Every held direction once, newest first: a hold's order of preference.
  get dirs(): KeyDir[] {
    const out: KeyDir[] = [];
    for (let i = this.held.length - 1; i >= 0; i--) {
      if (!out.includes(this.held[i].dir)) out.push(this.held[i].dir);
    }
    return out;
  }

  get size(): number {
    return this.held.length;
  }

  // K333: the diagonal the two newest held keys name when they went down
  // within `window` ms of each other (a chord held), else null.
  chord(window: number = CHORD_WINDOW_MS): Diagonal | null {
    const n = this.held.length;
    if (n < 2) return null;
    const a = this.held[n - 2];
    const b = this.held[n - 1];
    if (Math.abs(b.at - a.at) > window) return null;
    return chordOf(a.dir, b.dir);
  }
}

// A hold's next run with keys down: a chord held (K333) goes along its
// diagonal; where the diagonal finds nothing, or with no chord, the newest
// key's match, else the next older key's, and so on (right held, then up
// pressed: "up where there is an up, else right"). A tie on anything it
// reaches stops the hold there - it is ambiguous in a direction the player
// asked for.
export function pickHold(
  deps: readonly Departure[],
  dirs: readonly KeyDir[],
  exclude: number,
  o: { tolerance?: number; tie?: number; chord?: Diagonal | null } = {}
): KeyPick {
  const opts = { tolerance: o.tolerance, tie: o.tie, hold: true, exclude };
  if (o.chord) {
    const c = pickChord(deps, o.chord, opts);
    if (c.edge >= 0 || ("stop" in c && c.stop === "tie")) return c;
  }
  for (const dir of dirs) {
    const p = pickDeparture(deps, dir, opts);
    if (p.edge >= 0 || ("stop" in p && p.stop === "tie")) return p;
  }
  return NONE;
}

// A keydown the maze must leave alone: a modifier chord, or one aimed at a
// text field, the settings panel or an open modal (they use the arrows).
export function keyBelongsElsewhere(e: {
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
  target: EventTarget | null;
}): boolean {
  if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || e.defaultPrevented) {
    return true;
  }
  const t = e.target as Element | null;
  if (t && typeof t.closest === "function") {
    if (t.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) {
      return true;
    }
    // Tweakpane's rows (sliders, lists, pads) read the arrows while
    // focused; its buttons (folders, Reset path) do not, so a key after a
    // panel click still moves.
    if (t.closest(".tp-dfwv, .tp-rotv") && !t.closest("button")) return true;
  }
  // A modal dialog (the daily stats view) owns the keyboard while open.
  if (typeof document !== "undefined" && document.querySelector("[aria-modal='true']")) {
    return true;
  }
  return false;
}
