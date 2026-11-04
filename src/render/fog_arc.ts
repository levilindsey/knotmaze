// FOG ALONG THE ARC (K99): a move lifts the fog of war at fixed STATIONS
// of its run - every FOG_ARC_STEP ctrl from the departure end, then the
// arrival end - as the dot passes them. The stations a move stamps are
// therefore the same at any frame rate and any move speed; stamping the
// dot's position once per frame (the Stage 25 rule) skipped whatever a
// long frame jumped, and an instant move uncovered only its two ends.
// Pure (no pixi): fabric_maze_renderer.ts turns stations into world stamps.

// Station spacing in ctrl: well under FOG_STAMP_SPACING's 0.8 world at the
// measured 0.45-0.9 lattice units per ctrl, so the spacing filter, not the
// stations, sets the stamp density (exploreRuns stamps the same stations,
// K100: travelOrder below).
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

// The two ends of a run, as core/walk_graph's WalkEdge holds them.
export interface FogRun {
  va: string;
  vb: string;
  ctrlA: number;
  ctrlB: number;
}

// The run, departure end and arrival end (ctrl) of each tap of a walk.
export interface FogTravel {
  run: number;
  from: number;
  to: number;
}

// The ends (ctrl) of a move along `e` that arrives at vertex `arrival`
// (the controller's head once the tap is made; beginMove): it departs the
// other end. A self-loop's direction is unknowable, so it runs A -> B, as
// does a run that does not touch `arrival`.
export function moveEnds(
  e: FogRun,
  arrival: string
): { from: number; to: number } {
  if (e.va === arrival && e.vb !== arrival) return { from: e.ctrlB, to: e.ctrlA };
  return { from: e.ctrlA, to: e.ctrlB };
}

// K207: the spatial dedupe's cell and neighbourhood math. Stamps live
// in grid cells of the stamp spacing itself, so a point within
// `spacing` of a candidate sits in the candidate's cell or one of the
// eight around it (cell indices differ by at most one per axis) - a
// 3x3 check is the whole search. Exactly at the spacing is NOT within
// (the stamp lands), matching the renderer's spacing filter.
export function fogCell(
  x: number,
  y: number,
  spacing: number
): [number, number] {
  return [Math.floor(x / spacing), Math.floor(y / spacing)];
}

// The stamps of one solve, indexed by fogCell. Pure: the renderer
// beside it owns when a stamp is offered (maybeStampFog) and when the
// list is cleared or compacted (its count check rebuilds then).
export class FogStampIndex {
  private cells = new Map<string, number[]>();
  private n = 0;

  get count(): number {
    return this.n;
  }

  clear(): void {
    this.cells.clear();
    this.n = 0;
  }

  rebuild(stamps: readonly number[], spacing: number): void {
    this.clear();
    for (let i = 0; i + 1 < stamps.length; i += 2) {
      this.add(stamps[i], stamps[i + 1], spacing);
    }
  }

  hasWithin(x: number, y: number, spacing: number): boolean {
    const [cx, cy] = fogCell(x, y, spacing);
    const s2 = spacing * spacing;
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const pts = this.cells.get(`${gx},${gy}`);
        if (!pts) continue;
        for (let i = 0; i + 1 < pts.length; i += 2) {
          const dx = x - pts[i];
          const dy = y - pts[i + 1];
          if (dx * dx + dy * dy < s2) return true;
        }
      }
    }
    return false;
  }

  add(x: number, y: number, spacing: number): void {
    const [cx, cy] = fogCell(x, y, spacing);
    const key = `${cx},${cy}`;
    let pts = this.cells.get(key);
    if (!pts) {
      pts = [];
      this.cells.set(key, pts);
    }
    pts.push(x, y);
    this.n++;
  }
}

// K100: the direction each run of a tap list was traveled, walking from
// `start`. Every tap, advance or backtrack, moves the head to its run's
// other end, and the direction is moveEnds', the rule a live move uses.
// exploreRuns stamps each run from its departure end, so a restore, or a
// daily's Reset path retreat, lifts the fog at the stations the live moves
// did: fogArcStations counts them from the departure end, and a run walked
// out and back has two sets of stations, not one twice. A run that does
// not touch the head (never, in a legal tap list) is still explored, A ->
// B, and leaves the head where it was; an unknown run ends the walk, since
// the head is unknowable after it.
export function travelOrder(
  edges: readonly FogRun[],
  runs: readonly number[],
  start: string
): FogTravel[] {
  const out: FogTravel[] = [];
  let head = start;
  for (const run of runs) {
    const e = edges[run];
    if (!e) break;
    head = e.va === head ? e.vb : e.vb === head ? e.va : head;
    out.push({ run, ...moveEnds(e, head) });
  }
  return out;
}
