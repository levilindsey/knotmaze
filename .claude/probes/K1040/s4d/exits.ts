// K934 step 1: the free-end check's exit count, as pure functions.
//
// The check floods the ink component of a run end inside a disc of radius
// R on a grid (indep.ts: R = 0.8h, grid W/2, 8-connected) and counts where
// that component leaves the disc. One exit (or none) is a free end.
//
// - "angle" (K900..K940): the component's cells on the outer ring, sorted
//   by angle; every angular gap over 2.5/N rad starts a new exit. Two legs
//   whose ring cells sit closer than 2.5/N rad (a V), or two legs joined
//   by an arc at the ring (an L whose inside holds another line), count as
//   one exit, so continuous ink is reported as a free end (K922 Step 5).
// - "runs" (K934): exits are connected runs of component cells on a ring
//   (8-connected inside the ring, 1.5 cells thick). Three rings, at N,
//   0.75N and 0.5N cells: a run on an inner ring counts only when it
//   reaches the outer ring through component cells outside that ring's
//   inner edge (so a notch inside a stub is not an exit). The count is the
//   most runs any ring sees: the mid ring separates two legs that an arc
//   joins at the outer ring. No outer-ring cell means no exit (0).
//   Limits: a wedge filled solid past R reads as one exit; a stub that
//   forks into two short prongs inside the disc reads as two; two legs
//   that touch only diagonally on the W/2 grid stay one run.

export type Cell = [number, number];

const KEY = 4096;
const key = (i: number, j: number) => (i + KEY) * 2 * KEY + (j + KEY);

/** The ink component of the centre, 8-connected, inside i²+j² <= N². */
export function floodComp(ink: (i: number, j: number) => boolean, N: number): Cell[] {
  const comp: Cell[] = [];
  const visited = new Set<number>();
  const stack: Cell[] = [[0, 0]];
  visited.add(key(0, 0));
  while (stack.length) {
    const [i, j] = stack.pop()!;
    if (!ink(i, j)) continue;
    comp.push([i, j]);
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) {
        const a = i + di;
        const b = j + dj;
        if ((di || dj) && a * a + b * b <= N * N && !visited.has(key(a, b))) {
          visited.add(key(a, b));
          stack.push([a, b]);
        }
      }
  }
  return comp;
}

/** The old count (indep.ts through K940), verbatim. */
export function exitsAngle(comp: Cell[], N: number): number {
  const ring = comp
    .filter(([i, j]) => i * i + j * j > (N - 1.5) * (N - 1.5))
    .map(([i, j]) => Math.atan2(j, i))
    .sort((a, b) => a - b);
  if (!ring.length) return 0;
  const gap = 2.5 / N;
  let n = 0;
  for (let k = 0; k < ring.length; k++) {
    const prev = k ? ring[k - 1] : ring[ring.length - 1] - 2 * Math.PI;
    if (ring[k] - prev > gap) n++;
  }
  return Math.max(n, 1);
}

/** 8-connected components of a cell set; returns the component id per key. */
function components(cells: Cell[]): Map<number, number> {
  const id = new Map<number, number>();
  const set = new Set(cells.map(([i, j]) => key(i, j)));
  let next = 0;
  for (const [i0, j0] of cells) {
    const k0 = key(i0, j0);
    if (id.has(k0)) continue;
    const c = next++;
    id.set(k0, c);
    const stack: Cell[] = [[i0, j0]];
    while (stack.length) {
      const [i, j] = stack.pop()!;
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++) {
          if (!di && !dj) continue;
          const k = key(i + di, j + dj);
          if (set.has(k) && !id.has(k)) {
            id.set(k, c);
            stack.push([i + di, j + dj]);
          }
        }
    }
  }
  return id;
}

// Ring outer radii as fractions of N: every half cell from N down to 2.5 cells.
export const RING_FRACS = [1, 0.75, 0.5];
export const ringFracs = (N: number): number[] => { const out: number[] = []; for (let r = N; r >= 2.5 - 1e-9; r -= 0.5) out.push(r / N); return out; };
const THICK = 1.5;

/** The new count: the most outward-reaching runs on any of the rings. */
export function exitsRuns(comp: Cell[], N: number, fracs = RING_FRACS): { n: number; rings: number[] } {
  const r2 = ([i, j]: Cell) => i * i + j * j;
  const outerLo = (N - THICK) * (N - THICK);
  if (!comp.some((c) => r2(c) > outerLo)) return { n: 0, rings: fracs.map(() => 0) };
  const rings = fracs.map((f) => {
    const rho = N * f;
    const lo = Math.max(0, rho - THICK) ** 2;
    const hi = rho * rho;
    // Cells outside the ring's inner edge, and which of their components
    // reach the outer ring.
    const outside = comp.filter((c) => r2(c) > lo);
    const sid = components(outside);
    const reach = new Set<number>();
    for (const c of outside) if (r2(c) > outerLo) reach.add(sid.get(key(c[0], c[1]))!);
    const ring = outside.filter((c) => r2(c) <= hi);
    const rid = components(ring);
    const runs = new Set<number>();
    for (const c of ring) {
      const k = key(c[0], c[1]);
      if (reach.has(sid.get(k)!)) runs.add(rid.get(k)!);
    }
    return runs.size;
  });
  return { n: Math.max(...rings), rings };
}

/** Both counts for one run end, from one flood on the grid g. */
export function exitsBoth(inkXY: (x: number, y: number) => boolean, x0: number, y0: number, R: number, g: number) {
  const N = Math.ceil(R / g);
  const memo = new Map<number, boolean>();
  const ink = (i: number, j: number): boolean => {
    const k = key(i, j);
    let v = memo.get(k);
    if (v === undefined) {
      v = i * i + j * j <= N * N && inkXY(x0 + i * g, y0 + j * g);
      memo.set(k, v);
    }
    return v;
  };
  const comp = floodComp(ink, N);
  const runs = exitsRuns(comp, N, ringFracs(N)); // S4d: browser bundle has no process.env (K934's RINGS=3 A/B dropped)
  return { N, angle: exitsAngle(comp, N), runs: runs.n, rings: runs.rings, cells: comp.length };
}
