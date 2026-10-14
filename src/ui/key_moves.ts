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
// one run that no unambiguous key already reaches, and does nothing when
// that leaves none or several. So at a fork of up-right, down-right and
// left, up and down take the two right-hand runs and right does nothing,
// while at up-right, down-right and down-left, right and down both take the
// down-right run (up and left have the others): every run has a key.
//  - A PRESS moves along its key's run at once. Like a tap, it may
//    advance, backtrack (the run the player came along, when it is the
//    key's) or win.
//  - A HOLD (the key kept down) takes its key's next run when the dot
//    arrives, from the runs other than the one it arrived on (it would
//    ping-pong). It stops where its key has no run: nothing within the
//    tolerance, an ambiguous fork, a dead-end tip (its only run is the
//    arrival) and the finish.
// THE CENSUS (K120: 24 settled mazes at codec v4's defaults, 4259
// junctions, 96% of degree 3; .claude/probes/K120/census*.txt): runs leave
// a junction mostly DIAGONALLY (half of them within 9 degrees of a
// diagonal). Their chords separate best close to the junction - the
// smallest angle between two runs of a junction, 1st percentile: 62
// degrees at a 0.5 reach, 48 at 1, 21 at 1.5, 0 at the far ends (runs bend
// toward each other). At reach 0.5, tolerance 70 and tie 15, four keys
// reach every run at 98.9% of junctions; a press does nothing for 1.9% of
// key-junction pairs (no run within 70) and 9.4% (ambiguous); a hold that
// arrived moving its key's way goes on 83%, stops at a fork 15% and finds
// nothing 2%. Tie 10 would go on 87% at the price of taking forks whose
// two branches differ by less than 15 degrees; tie 0 (the best always)
// leaves a run of 5% of junctions on no key.
//
// KEYS (keyDirOf): the arrows by `key`, WASD by `code` - the physical
// positions, so AZERTY's ZQSD and every layout's WASD cluster work. Each
// press moves at once in its own direction. TWO KEYS HELD are not a
// diagonal: they are an order of preference, newest first (HeldKeys.dirs,
// pickHold) - hold right, then add up, and the hold takes an up run where
// up has one and goes on right where it has none; let go of up and right
// steers alone again. A diagonal vector would need a chord window (a delay
// on every press), and the tie rule already gives each diagonal run a key.

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

export const KEY_DIRS: readonly KeyDir[] = ["up", "down", "left", "right"];

// Every key's run at a junction (see the header for the rules): each key's
// best match within the tolerance; a key whose runner-up lies within the
// tie margin takes, of those near-tied runs, the one run no unambiguous key
// already reaches, and stops ("tie") when that leaves none or several.
export function keyMap(
  deps: readonly Departure[],
  o: { exclude?: number; tolerance?: number; tie?: number } = {}
): Record<KeyDir, KeyPick> {
  const tol = o.tolerance ?? KEY_TOLERANCE;
  const tie = o.tie ?? KEY_TIE;
  const exclude = o.exclude ?? -1;
  // Each run's error for each key, from its best departure (a self-loop
  // leaves twice).
  const errs = new Map<number, number[]>();
  for (const d of deps) {
    if (d.edge === exclude) continue;
    const e = KEY_DIRS.map((k) => angleOff(d, KEY_VECTORS[k][0], KEY_VECTORS[k][1]));
    const prev = errs.get(d.edge);
    errs.set(d.edge, prev ? prev.map((p, i) => Math.min(p, e[i])) : e);
  }
  const out = {} as Record<KeyDir, KeyPick>;
  const near = new Map<KeyDir, number[]>();
  const claimed = new Set<number>();
  KEY_DIRS.forEach((k, i) => {
    let best = Infinity;
    for (const e of errs.values()) best = Math.min(best, e[i]);
    if (!(best <= tol)) {
      out[k] = { edge: -1, stop: "none" };
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
  // Resolving one key can settle another (its run is claimed now).
  for (let pass = 0; pass < KEY_DIRS.length && near.size > 0; pass++) {
    const taken = new Set(claimed);
    for (const [k, ids] of near) {
      const free = ids.filter((id) => !taken.has(id));
      if (free.length !== 1) continue;
      out[k] = { edge: free[0], err: errs.get(free[0])![KEY_DIRS.indexOf(k)] };
      claimed.add(free[0]);
      near.delete(k);
    }
    if (claimed.size === taken.size) break;
  }
  for (const k of near.keys()) out[k] = { edge: -1, stop: "tie" };
  return out;
}

// The run one key picks among `deps`: a press, or with `hold` a hold's
// next move (the arrival run excluded).
export function pickDeparture(
  deps: readonly Departure[],
  dir: KeyDir,
  o: PickOptions
): KeyPick {
  return keyMap(deps, {
    exclude: o.hold ? (o.exclude ?? -1) : -1,
    tolerance: o.tolerance,
    tie: o.tie,
  })[dir];
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
