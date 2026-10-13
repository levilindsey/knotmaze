// SHAPED LATTICES: implicit silhouette masks over the cell grid.
//
// A shape is an analytic inside/outside test (circles / polygons / unions -
// SDF-ish, resolution-free) sampled at cell centers at whatever resolution
// gridSize gives. The grower restricts its growing tree and its extra weave
// openings to in-mask cells, so masked-out cells carry no open midpoints and
// grow no knotwork; mask-boundary midpoints stay walls, so threads bounce
// along the silhouette exactly like they bounce off the outer border.
//
// CONNECTEDNESS: buildCellMask keeps only the LARGEST orthogonally-connected
// cell component (deterministic BFS, no RNG). The growing tree spans every
// kept cell, so the passage graph - and therefore the traced knotwork - is
// one connected piece: knot mode never renders orphan islands, and holes
// (ring) are simply out-of-mask interiors. Strand-level stragglers are still
// the maze plan's largest-component cull, unchanged.
//
// `rect` returns a null mask: the grower takes its original code path with
// identical RNG consumption (byte-identity guarded by test/core/shapes.test
// and the physics golden snapshot).
//
// The masks decide the maze, so they use exact operations only (util/
// det_math, K108): no trig, no `**`, Math.hypot only through hypot2.

import { hypot2 } from "../util/det_math";

export const SHAPES = [
  "rect",
  "heart",
  "star",
  "fish",
  "tree",
  "ring",
  "circle", // Appended 2026-10-12: codec v3's shape option 6.
] as const;
export type ShapeId = (typeof SHAPES)[number];

// Entrance/exit anchor compass points (maze fabric on shaped lattices).
export const ANCHORS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
export type AnchorId = (typeof ANCHORS)[number];

const SQ = Math.SQRT1_2;
// Outward unit direction per anchor, in LATTICE coordinates (y grows DOWN,
// so "n" is -y). nw/se are exactly the historic corner-cut directions.
export const ANCHOR_DIRS: Record<AnchorId, [number, number]> = {
  nw: [-SQ, -SQ],
  n: [0, -1],
  ne: [SQ, -SQ],
  e: [1, 0],
  se: [SQ, SQ],
  s: [0, 1],
  sw: [-SQ, SQ],
  w: [-1, 0],
};

// Shape tests over normalized coordinates: x in [-1, 1] left->right,
// y in [-1, 1] with +y UP (the sampler flips lattice y). Tuned by an ASCII
// cell census at gridSize 8/12/16/24: every shape is a single orthogonal
// component with a recognizable silhouette at 12+.
type ShapeFn = (x: number, y: number) => boolean;

// The star's mirror lines, from sqrt alone (correctly rounded by the spec).
const STAR_S5 = Math.sqrt(5);
const STAR_C36 = (1 + STAR_S5) / 4; // cos 36
const STAR_S36 = Math.sqrt(10 - 2 * STAR_S5) / 4; // sin 36
const STAR_C72 = (STAR_S5 - 1) / 4; // cos 72
const STAR_S72 = Math.sqrt(10 + 2 * STAR_S5) / 4; // sin 72

const SHAPE_FNS: Record<Exclude<ShapeId, "rect">, ShapeFn> = {
  heart: (x, y) => {
    // Valentine heart: two lobe circles + a point triangle, minus an
    // explicit notch wedge (the classic implicit heart curve's notch is
    // sub-cell at playable grid sizes and never renders).
    const ax = Math.abs(x);
    const lx = ax - 0.42;
    const ly = y - 0.38;
    const inLobe = lx * lx + ly * ly <= 0.52 * 0.52;
    const inTri =
      y <= 0.28 && y >= -0.98 && ax <= 0.92 * (1 - (0.28 - y) / 1.26);
    const inNotch = y >= 0.18 && ax <= 0.26 * ((y - 0.18) / 0.82);
    return (inLobe || inTri) && !inNotch;
  },
  star: (x, y) => {
    // CHUNKY 5-point star, point up: fold the angle from +y into one
    // half-spike and test against the outer->inner boundary line. Inner
    // radius 0.57 (vs the classic pentagram's 0.5) widens every tip angle
    // tree-like - a classic pentagram's 36-degree points quantize into
    // 2-cell-wide tubes at playable grid sizes, whose hairpin-only thread
    // ladders kept tearing at the maze cuts (sleep census, 2026-10-10).
    // The slight downward shift keeps the two leg points on the lattice.
    // The fold is done by REFLECTIONS with sqrt-only constants (K108), not
    // atan2/sin/cos: the same mask as the trig version at every size 2..400
    // (closest cell center 2.9e-8 from the boundary; 7.8e-6 at sizes
    // 2..64), exact in every engine.
    let px = Math.abs(x);
    let py = y + 0.06;
    // Rotate back by 72 degrees while past the 72-degree ray, mirroring x.
    for (let k = 0; k < 2; k++) {
      if (STAR_S72 * py - STAR_C72 * px < 0) {
        const nx = px * STAR_C72 - py * STAR_S72;
        py = py * STAR_C72 + px * STAR_S72;
        px = Math.abs(nx);
      }
    }
    // Past the 36-degree ray (through an inner vertex): reflect across it.
    if (STAR_S36 * py - STAR_C36 * px < 0) {
      const d = 2 * (px * STAR_S36 + py * STAR_C36);
      px = d * STAR_S36 - px;
      py = d * STAR_C36 - py;
    }
    // Outer tip (0, 1) to inner vertex 0.57 * (sin 36, cos 36).
    const qx = 0.57 * STAR_S36;
    const qy = 0.57 * STAR_C36;
    return qx * (py - 1.0) - (qy - 1.0) * px <= 0;
  },
  fish: (x, y) => {
    // Body ellipse (nose left, bluntly truncated) + tail triangle fanning
    // right; deep overlap + a thick joint keep the mask one meaty
    // component (thin variants bred standing physics fights at the maze
    // cuts - measured in the shaped-maze sleep census, 2026-10-10).
    if (x >= -0.78) {
      const bx = (x + 0.18) / 0.62;
      const by = y / 0.48;
      if (bx * bx + by * by <= 1) return true;
    }
    if (x < 0.26 || x > 0.95) return false;
    const t = (x - 0.26) / 0.69;
    return Math.abs(y) <= 0.18 + t * 0.34;
  },
  tree: (x, y) => {
    // Broadleaf: a BUSHY round canopy (a cloud of overlapping lobes) on a
    // long skinny trunk with a slight root flare.
    const lobe = (cx: number, cy: number, r: number): boolean =>
      (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
    if (
      lobe(0, 0.36, 0.5) ||
      lobe(-0.47, 0.24, 0.34) ||
      lobe(0.47, 0.24, 0.34) ||
      lobe(-0.27, 0.66, 0.32) ||
      lobe(0.27, 0.66, 0.32) ||
      lobe(0, 0.8, 0.2)
    ) {
      return true;
    }
    const flare = 0.4 * Math.max(0, -0.8 - y);
    return Math.abs(x) <= 0.12 + flare && y >= -1.0 && y <= 0;
  },
  ring: (x, y) => {
    // Annulus: the interior hole proves hole support end to end.
    const r = hypot2(x, y);
    return r >= 0.52 && r <= 0.98;
  },
  circle: (x, y) => {
    // A plain disc, the ring's outer edge (squared distances).
    return x * x + y * y <= 0.98 * 0.98;
  },
};

// Cell mask for a shape at a given lattice size: mask[cy * size + cx] true
// where knotwork may grow. Returns null for `rect` (the grower's untouched
// full-lattice path) and for degenerate resolutions where the largest
// connected component has fewer than 2 cells (a 1-cell mask has no openable
// midpoints and would trace an empty graph).
export function buildCellMask(
  shape: ShapeId,
  size: number
): boolean[] | null {
  if (shape === "rect") return null;
  const fn = SHAPE_FNS[shape];
  const mask: boolean[] = new Array(size * size).fill(false);
  for (let cy = 0; cy < size; cy++) {
    for (let cx = 0; cx < size; cx++) {
      const nx = ((cx + 0.5) / size) * 2 - 1;
      const ny = -(((cy + 0.5) / size) * 2 - 1); // lattice y down -> math y up
      mask[cy * size + cx] = fn(nx, ny);
    }
  }
  return keepLargestComponent(mask, size) >= 2 ? mask : null;
}

// Zero every in-mask cell outside the largest orthogonally-connected
// component (ties: first component in row-major scan order). Returns the
// kept component's size (0 when the mask is empty).
function keepLargestComponent(mask: boolean[], size: number): number {
  const comp = new Int32Array(size * size).fill(-1);
  const compSizes: number[] = [];
  const queue: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || comp[i] >= 0) continue;
    const label = compSizes.length;
    comp[i] = label;
    queue.length = 0;
    queue.push(i);
    let count = 0;
    for (let h = 0; h < queue.length; h++) {
      const j = queue[h];
      count++;
      const x = j % size;
      const y = (j - x) / size;
      const tryCell = (nx: number, ny: number): void => {
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) return;
        const k = ny * size + nx;
        if (mask[k] && comp[k] < 0) {
          comp[k] = label;
          queue.push(k);
        }
      };
      tryCell(x + 1, y);
      tryCell(x - 1, y);
      tryCell(x, y + 1);
      tryCell(x, y - 1);
    }
    compSizes.push(count);
  }
  if (compSizes.length === 0) return 0;
  let main = 0;
  for (let c = 1; c < compSizes.length; c++) {
    if (compSizes[c] > compSizes[main]) main = c;
  }
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && comp[i] !== main) mask[i] = false;
  }
  return compSizes[main];
}

// The mask's extreme point in an anchor direction, in DOUBLED-lattice
// coordinates: the in-mask cell corner maximizing dot(corner, dir), ties
// broken by minimal |cross(corner - centroid, dir)| (closest to the
// centroid's ray - so "n" picks the top-middle, not the top-left). All
// corners are even integers; for a null (full) mask, nw is exactly [0, 0]
// and se exactly [2*size, 2*size] - the historic maze corners.
export function maskExtremePoint(
  mask: boolean[] | null,
  size: number,
  anchor: AnchorId
): [number, number] {
  const [dx, dy] = ANCHOR_DIRS[anchor];
  // Corner lattice: corner (ix, iy) belongs to the region when any of its
  // up-to-4 adjacent cells is in-mask.
  const n1 = size + 1;
  const inCorner = (ix: number, iy: number): boolean => {
    if (mask === null) return true;
    const cell = (cx: number, cy: number): boolean =>
      cx >= 0 && cx < size && cy >= 0 && cy < size && mask[cy * size + cx];
    return (
      cell(ix - 1, iy - 1) || cell(ix, iy - 1) || cell(ix - 1, iy) || cell(ix, iy)
    );
  };

  // Centroid of the region's corners (for the tie-break ray).
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (let iy = 0; iy < n1; iy++) {
    for (let ix = 0; ix < n1; ix++) {
      if (!inCorner(ix, iy)) continue;
      sx += ix * 2;
      sy += iy * 2;
      count++;
    }
  }
  const cxm = count > 0 ? sx / count : size;
  const cym = count > 0 ? sy / count : size;

  const EPS = 1e-9;
  let best: [number, number] = [0, 0];
  let bestDot = -Infinity;
  let bestCross = Infinity;
  for (let iy = 0; iy < n1; iy++) {
    for (let ix = 0; ix < n1; ix++) {
      if (!inCorner(ix, iy)) continue;
      const px = ix * 2;
      const py = iy * 2;
      const dot = px * dx + py * dy;
      const cross = Math.abs((px - cxm) * dy - (py - cym) * dx);
      if (
        dot > bestDot + EPS ||
        (dot > bestDot - EPS && cross < bestCross - EPS)
      ) {
        bestDot = dot;
        bestCross = cross;
        best = [px, py];
      }
    }
  }
  return best;
}

// Everything the maze plan needs to host its entrance/exit at the chosen
// anchors of the chosen shape: boundary target points + outward tail
// directions. For (rect, nw, se) this reproduces the historic corners
// exactly - [0,0] / [bound,bound] with the (-√½,-√½) / (√½,√½) tails.
export interface AnchorPlan {
  entrancePoint: [number, number];
  exitPoint: [number, number];
  entranceDir: [number, number];
  exitDir: [number, number];
  // SHAPED masks nudge their cuts into thick material, so their tails
  // must ESCAPE to open space (maze_apply); rect corners never need it.
  escapeTails: boolean;
}

// SHAPED anchor targets are pulled off the silhouette's outermost sliver
// into THICK material (and rect keeps its exact corners - byte identity).
// The raw extreme point sits where the boundary thread doubles back in a
// hairpin - a cut there parks the anchored tail right beside a kink eye,
// and the pin's standing tension holds the eye's crossing torn open
// forever (measured 2026-10-10: every mouth-class non-sleeper's torn pairs
// sat within ~4 ctrl of a cut tail; rect corners never do this because the
// corner lobe is roomy and the decoy trim absorbs it). The target walks
// toward the mask centroid in 1-unit steps until its cell's 3x3 in-mask
// neighborhood reaches ANCHOR_THICK cells (capped at ANCHOR_NUDGE_MAX), so
// a 1-cell arm ledge is escaped while a fat lobe stops immediately.
const ANCHOR_THICK = 6;
const ANCHOR_NUDGE_MAX = 8;

export function planAnchors(
  shape: ShapeId,
  gridSize: number,
  startAnchor: AnchorId,
  exitAnchor: AnchorId
): AnchorPlan {
  const size = Math.max(2, Math.round(gridSize));
  const mask = buildCellMask(shape, size);

  // Cell centroid of the mask, in doubled coordinates.
  let cx0 = size;
  let cy0 = size;
  if (mask !== null) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let cy = 0; cy < size; cy++) {
      for (let cx = 0; cx < size; cx++) {
        if (!mask[cy * size + cx]) continue;
        sx += 2 * cx + 1;
        sy += 2 * cy + 1;
        n++;
      }
    }
    if (n > 0) {
      cx0 = sx / n;
      cy0 = sy / n;
    }
  }

  const thickness = (p: [number, number]): number => {
    const cx = Math.min(size - 1, Math.max(0, Math.floor(p[0] / 2)));
    const cy = Math.min(size - 1, Math.max(0, Math.floor(p[1] / 2)));
    if (!mask![cy * size + cx]) return 0;
    let n = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const x = cx + ox;
        const y = cy + oy;
        if (x >= 0 && x < size && y >= 0 && y < size && mask![y * size + x]) {
          n++;
        }
      }
    }
    return n;
  };

  const nudged = (p: [number, number]): [number, number] => {
    if (mask === null) return p;
    const dx = cx0 - p[0];
    const dy = cy0 - p[1];
    const d = hypot2(dx, dy);
    if (d < 1e-9) return p;
    const ux = dx / d;
    const uy = dy / d;
    const maxStep = Math.min(ANCHOR_NUDGE_MAX, d);
    // First point thick enough wins (stay close to the chosen compass
    // extreme); if none qualifies within the cap - thin arms, or a walk
    // that crosses into a hole (ring) - keep the EARLIEST densest point.
    let best: [number, number] = p;
    let bestT = thickness(p);
    for (let s = 1; s <= maxStep; s += 1) {
      const q: [number, number] = [p[0] + ux * s, p[1] + uy * s];
      const t = thickness(q);
      if (t >= ANCHOR_THICK) return q;
      if (t > bestT) {
        bestT = t;
        best = q;
      }
    }
    return best;
  };

  return {
    entrancePoint: nudged(maskExtremePoint(mask, size, startAnchor)),
    exitPoint: nudged(maskExtremePoint(mask, size, exitAnchor)),
    entranceDir: ANCHOR_DIRS[startAnchor],
    exitDir: ANCHOR_DIRS[exitAnchor],
    escapeTails: mask !== null,
  };
}
