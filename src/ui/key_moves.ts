// K120: moves by DIRECTION - the arrow keys, WASD and the move pad (ui/
// move_pad.ts) pick a run at the player's junction by where it goes on
// screen, then move along it exactly as a tap on that run would (main.ts).
//
// THE DIRECTION OF A RUN (departureVectors): the chord from the junction
// to the point KEY_REACH world units of arc along the run (its far end when
// it is shorter). Not the tangent at the head: every arm of a junction
// coincides there (the junction cover; edgeAt skips HEAD_EXCLUDE ctrl of it
// for the same reason) and the threads bend within the first world unit. The
// camera only scales and translates, so a world direction IS the screen
// direction (y down).
//
// THE PICK (pickDeparture): the run whose direction is nearest the key's,
// if it lies within KEY_TOLERANCE of it.
//  - A PRESS takes that best match whatever the runner-up: a press must do
//    something, and the player sees the result at once. Like a tap, it may
//    advance, backtrack (the run the player came along, when it matches) or
//    win.
//  - A HOLD (the key kept down) fires its next move when the dot arrives,
//    with the hold rules: never the run it just arrived on (it would
//    ping-pong), and a TIE stops it - when the runner-up lies within
//    KEY_TIE of the best, the hold waits at the junction for the player to
//    choose, rather than guess. It also stops when nothing matches, at a
//    dead-end tip (its only run is the arrival) and at the finish.
// The thresholds come from a census of junctions over settled mazes
// (.claude/probes/K120/, docs/history.md K120).
//
// KEYS (keyDirOf): the arrows by `key`, WASD by `code` - the physical
// positions, so AZERTY's ZQSD and every layout's WASD cluster work. Each
// press moves at once in its own direction. TWO KEYS HELD are not a
// diagonal: they are an order of preference, newest first (HeldKeys.dirs,
// pickHold) - hold right, then add up, and the hold takes an up run where
// one matches and goes on right where none does; let go of up and right
// steers alone again. A diagonal vector would need a chord window (a delay
// on every press) and would split the maze's mostly square runs between
// two keys.

export type KeyDir = "up" | "down" | "left" | "right";

// Screen (= world) unit vectors, y down.
export const KEY_VECTORS: Readonly<Record<KeyDir, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// World units of arc along a run to the point its direction is read at.
export const KEY_REACH = 1.5;
// The widest angle a match may lie off the key (radians).
export const KEY_TOLERANCE = (70 * Math.PI) / 180;
// A hold stops when the runner-up lies within this of the best (radians).
export const KEY_TIE = (15 * Math.PI) / 180;
// A hold's first follow-up move waits until its key has been down this
// long (ms), so a quick press on a short run stays one move: the dot can
// arrive in 60 ms, inside an ordinary press.
export const HOLD_DELAY_MS = 200;
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

export type KeyPick =
  | { edge: number; err: number }
  | { edge: -1; stop: "none" | "tie" };

// Angle between a unit departure and a unit key vector, in [0, pi].
export function angleOff(d: Departure, kx: number, ky: number): number {
  const c = d.dx * kx + d.dy * ky;
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

// The run a key picks among `deps` (see the header for the rules).
export function pickDeparture(
  deps: readonly Departure[],
  dir: KeyDir,
  o: PickOptions
): KeyPick {
  const tol = o.tolerance ?? KEY_TOLERANCE;
  const tie = o.tie ?? KEY_TIE;
  const exclude = o.hold ? (o.exclude ?? -1) : -1;
  const [kx, ky] = KEY_VECTORS[dir];
  // Each run's best departure (a self-loop has two).
  const errs = new Map<number, number>();
  for (const d of deps) {
    if (d.edge === exclude) continue;
    const a = angleOff(d, kx, ky);
    const prev = errs.get(d.edge);
    if (prev === undefined || a < prev) errs.set(d.edge, a);
  }
  let best = -1;
  let bestErr = Infinity;
  let second = Infinity;
  for (const [eid, a] of errs) {
    // Ties in the angle itself break to the lower run id (deterministic).
    if (a < bestErr || (a === bestErr && eid < best)) {
      second = bestErr;
      bestErr = a;
      best = eid;
    } else if (a < second) {
      second = a;
    }
  }
  if (best < 0 || bestErr > tol) return { edge: -1, stop: "none" };
  if (o.hold && second <= tol && second - bestErr < tie) {
    return { edge: -1, stop: "tie" };
  }
  return { edge: best, err: bestErr };
}

// The directions held down, newest last, by source (a key, a pad pointer):
// the newest steers.
export class HeldKeys {
  private held: { id: string; dir: KeyDir }[] = [];

  // True when `id` was not already held (a fresh press).
  press(id: string, dir: KeyDir): boolean {
    if (this.held.some((h) => h.id === id)) return false;
    this.held.push({ id, dir });
    return true;
  }

  release(id: string): void {
    this.held = this.held.filter((h) => h.id !== id);
  }

  has(id: string): boolean {
    return this.held.some((h) => h.id === id);
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
}

// A hold's next run with several keys down: the newest key's match, else
// the next older key's, and so on (right held, then up pressed: "up where
// there is an up, else right"). A tie on any key stops the hold there - it
// is ambiguous in a direction the player asked for.
export function pickHold(
  deps: readonly Departure[],
  dirs: readonly KeyDir[],
  exclude: number,
  o: { tolerance?: number; tie?: number } = {}
): KeyPick {
  for (const dir of dirs) {
    const p = pickDeparture(deps, dir, { ...o, hold: true, exclude });
    if (p.edge >= 0 || ("stop" in p && p.stop === "tie")) return p;
  }
  return { edge: -1, stop: "none" };
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
    // Tweakpane's rows (sliders, lists) read the arrows while focused.
    if (t.closest(".tp-dfwv, .tp-rotv")) return true;
  }
  // A modal dialog (the daily stats view) owns the keyboard while open.
  if (typeof document !== "undefined" && document.querySelector("[aria-modal='true']")) {
    return true;
  }
  return false;
}
