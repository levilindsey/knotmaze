import type { TangleGraph, GenerationParams, ParamField } from "./types";
import { NODE_TYPE } from "./types";
import {
  createTangleGraph,
  addNode,
  addEdge,
  assignCheckerboardParity,
} from "./tangle_graph";
import { ConstantField } from "./param_field";
import { buildCellMask } from "./shapes";
import { initRNG, rng } from "../util/random";

// The knot lives on a "doubled" integer lattice: cell (cx, cy) spans
// [2cx, 2cx+2] x [2cy, 2cy+2]. Midpoints of cell-border segments sit at
// points with odd coordinate sum:
//   - (odd, even): midpoint of a horizontal border segment
//   - (even, odd): midpoint of a vertical border segment
// Each interior midpoint is either OPEN (the two cells connect; threads cross
// there) or a WALL (threads bounce off it). Outer-border midpoints are always
// walls, so every thread stays inside and every strand closes into a loop.
//
// Threads travel diagonally, stepping midpoint -> adjacent midpoint (each
// step also flips the midpoint class above). At an open midpoint the thread
// passes straight through (CROSSING); at a wall it reflects off the wall's
// axis (TURN). The knot is the medial of the maze's passage graph: corridors
// carry the threads, so the maze and the knot are the same object.
//
// Planarity holds by construction: within a cell, thread segments connect
// midpoints of adjacent sides, so any two segments in one cell are either
// parallel diagonals or share a midpoint endpoint.

type Vec = [number, number];

const key = (x: number, y: number): string => `${x},${y}`;

// Diagonal class: "/" for NE-SW travel (dx*dy > 0), "\" for NW-SE.
const lineClass = (dx: number, dy: number): string =>
  dx * dy > 0 ? "/" : "\\";

const ORTHOGONAL: Vec[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function generateLatticeKnotwork(
  params: GenerationParams
): TangleGraph {
  // Self-seed so a graph is fully determined by params alone
  // (URL-as-complete-state).
  initRNG(params.randSeed);

  const graph = createTangleGraph(params.randSeed, params);
  const size = Math.max(2, Math.round(params.gridSize));

  const weaveDensityField = new ConstantField(params.weaveDensity);
  const turnBiasField = new ConstantField(params.turnBias);

  // SHAPED LATTICES: an analytic silhouette mask over the cells (null for
  // rect = the full lattice). Computed without RNG, so the rect path's
  // consumption order is untouched (byte-identity guard).
  const mask = buildCellMask(params.shape ?? "rect", size, params.hole);

  const open = carveWalls(size, weaveDensityField, turnBiasField, mask);
  traceKnot(graph, size, open);
  assignCheckerboardParity(graph);

  return graph;
}

// Decide which interior midpoints are open (crossings), in doubled coords.
// A growing-tree maze guarantees every cell is reachable (no strand can be an
// isolated diamond trapped inside a fully-walled cell); weaveDensity then
// opens extra non-tree walls for denser weave and more loops.
//
// With a shape mask, the tree and the extra openings are restricted to
// in-mask cells: masked-out cells keep every border midpoint walled, so they
// contain only never-traced diamond orbits - no knotwork. The mask is one
// orthogonally-connected component (core/shapes.ts), so the tree still spans
// every growable cell. A null mask is the full lattice and consumes RNG in
// exactly the historic order (every guard below passes without drawing).
function carveWalls(
  size: number,
  weaveDensityField: ParamField,
  turnBiasField: ParamField,
  mask: boolean[] | null
): Set<string> {
  const open = new Set<string>();
  const visited: boolean[] = new Array(size * size).fill(false);
  const cellIdx = (cx: number, cy: number): number => cy * size + cx;
  const inMask = (cx: number, cy: number): boolean =>
    mask === null || mask[cellIdx(cx, cy)];

  // Rejection-sample the tree root into the mask: a full mask accepts the
  // first draw, keeping the rect path's RNG consumption identical.
  let start: Vec = [rng().nextInt(size), rng().nextInt(size)];
  while (!inMask(start[0], start[1])) {
    start = [rng().nextInt(size), rng().nextInt(size)];
  }
  visited[cellIdx(start[0], start[1])] = true;
  const active: Vec[] = [start];

  while (active.length > 0) {
    // turnBias: probability of expanding the newest cell (long winding
    // corridors) instead of a random active cell (bushier branching).
    const newest = active[active.length - 1];
    const bias = turnBiasField.evaluate([
      newest[0] * 2 + 1,
      newest[1] * 2 + 1,
    ]);
    const idx =
      rng().next() < bias ? active.length - 1 : rng().nextInt(active.length);
    const [cx, cy] = active[idx];

    const unvisited = ORTHOGONAL.map(
      ([dx, dy]) => [cx + dx, cy + dy] as Vec
    ).filter(
      ([nx, ny]) =>
        nx >= 0 &&
        nx < size &&
        ny >= 0 &&
        ny < size &&
        inMask(nx, ny) &&
        !visited[cellIdx(nx, ny)]
    );

    if (unvisited.length === 0) {
      active.splice(idx, 1);
      continue;
    }

    const [nx, ny] = rng().nextChoice(unvisited);
    // Midpoint of the border segment shared by (cx,cy) and (nx,ny).
    open.add(key(cx + nx + 1, cy + ny + 1));
    visited[cellIdx(nx, ny)] = true;
    active.push([nx, ny]);
  }

  // Open extra non-tree walls with probability weaveDensity. Mask-boundary
  // walls (one flanking cell outside) never open - and never draw RNG, so
  // the full-mask path consumes in the historic order.
  for (let cx = 1; cx < size; cx++) {
    for (let cy = 0; cy < size; cy++) {
      if (!inMask(cx - 1, cy) || !inMask(cx, cy)) continue;
      const k = key(2 * cx, 2 * cy + 1);
      if (!open.has(k) && rng().next() < weaveDensityField.evaluate([2 * cx, 2 * cy + 1])) {
        open.add(k);
      }
    }
  }
  for (let cy = 1; cy < size; cy++) {
    for (let cx = 0; cx < size; cx++) {
      if (!inMask(cx, cy - 1) || !inMask(cx, cy)) continue;
      const k = key(2 * cx + 1, 2 * cy);
      if (!open.has(k) && rng().next() < weaveDensityField.evaluate([2 * cx + 1, 2 * cy])) {
        open.add(k);
      }
    }
  }

  return open;
}

// Trace every thread, building nodes, edges, and strands as we go. Each
// crossing has two undirected diagonal lines ("/" and "\"); each line belongs
// to exactly one strand pass, so enumerating untraced lines covers the whole
// knot exactly once.
function traceKnot(graph: TangleGraph, size: number, open: Set<string>): void {
  const bound = size * 2;
  const crossingNodes = new Map<string, string>();
  const tracedLines = new Set<string>();

  const getCrossing = (x: number, y: number): string => {
    const k = key(x, y);
    let id = crossingNodes.get(k);
    if (id === undefined) {
      id = addNode(graph, NODE_TYPE.CROSSING, [x, y]);
      crossingNodes.set(k, id);
    }
    return id;
  };

  const starts: Vec[] = [];
  for (let y = 0; y <= bound; y++) {
    for (let x = 0; x <= bound; x++) {
      if (open.has(key(x, y))) starts.push([x, y]);
    }
  }

  const startDirs: Vec[] = [
    [1, 1],
    [1, -1],
  ];

  for (const [sx, sy] of starts) {
    for (const [dx, dy] of startDirs) {
      if (tracedLines.has(`${key(sx, sy)}:${lineClass(dx, dy)}`)) continue;
      traceStrandLoop(graph, open, bound, sx, sy, dx, dy, getCrossing, tracedLines);
    }
  }
}

function traceStrandLoop(
  graph: TangleGraph,
  open: Set<string>,
  bound: number,
  sx: number,
  sy: number,
  startDx: number,
  startDy: number,
  getCrossing: (x: number, y: number) => string,
  tracedLines: Set<string>
): void {
  const startId = getCrossing(sx, sy);
  tracedLines.add(`${key(sx, sy)}:${lineClass(startDx, startDy)}`);

  const edgeIds: string[] = [];
  const nodes: string[] = [startId];

  let px = sx;
  let py = sy;
  let dx = startDx;
  let dy = startDy;
  let currentId = startId;
  let currentPos: Vec = [sx, sy];

  // Orbits are finite (each directed half-segment is traversed at most once).
  const maxSteps = (bound + 1) * (bound + 1) * 8;

  for (let step = 0; ; step++) {
    if (step > maxSteps) {
      throw new Error("Knot trace failed to close; lattice walk bug.");
    }

    const qx = px + dx;
    const qy = py + dy;
    if (qx < 0 || qx > bound || qy < 0 || qy > bound) {
      throw new Error("Knot trace left the lattice; reflection bug.");
    }

    if (open.has(key(qx, qy))) {
      // Crossing: pass straight through.
      if (qx === sx && qy === sy && dx === startDx && dy === startDy) {
        // Returned to the starting state: the loop is closed.
        edgeIds.push(addEdge(graph, currentId, startId, [currentPos, [qx, qy]]));
        nodes.push(startId);
        break;
      }
      tracedLines.add(`${key(qx, qy)}:${lineClass(dx, dy)}`);
      const id = getCrossing(qx, qy);
      edgeIds.push(addEdge(graph, currentId, id, [currentPos, [qx, qy]]));
      nodes.push(id);
      currentId = id;
      currentPos = [qx, qy];
      px = qx;
      py = qy;
    } else {
      // Wall (interior or border): bounce. The turn node sits half a step off
      // the wall midpoint, on the thread's side, so the two threads bouncing
      // off opposite sides of an interior wall don't coincide.
      const horizontalWall = qx % 2 === 1;
      const pos: Vec = horizontalWall
        ? [qx, qy - 0.5 * dy]
        : [qx - 0.5 * dx, qy];
      const id = addNode(graph, NODE_TYPE.TURN, pos);
      edgeIds.push(addEdge(graph, currentId, id, [currentPos, pos]));
      nodes.push(id);
      currentId = id;
      currentPos = pos;
      px = qx;
      py = qy;
      if (horizontalWall) {
        dy = -dy;
      } else {
        dx = -dx;
      }
    }
  }

  graph.strands.push({ edgeIds, isClosed: true, nodes });
}
