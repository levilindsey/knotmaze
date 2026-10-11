import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import {
  checkStructure,
  checkAlternation,
  checkStrandPartition,
} from "../../src/core/tangle_graph";
import {
  SHAPES,
  buildCellMask,
  maskExtremePoint,
  planAnchors,
} from "../../src/core/shapes";
import type { ShapeId, AnchorId } from "../../src/core/shapes";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { TangleGraph } from "../../src/core/types";

function gen(seed: number, shape?: ShapeId, gridSize = 12): TangleGraph {
  return generateLatticeKnotwork({
    gridSize,
    weaveDensity: 0.35,
    turnBias: 0.7,
    randSeed: seed,
    ...(shape === undefined ? {} : { shape }),
  });
}

// Full structural serialization: node identities/positions, edge wiring,
// strand traversals. Byte-level equality of two generator outputs.
function serialize(g: TangleGraph): string {
  const nodes = [...g.nodes.values()]
    .map((n) => `${n.id}:${n.type}:${n.latticePos}:${n.isOver ?? ""}`)
    .join("|");
  const edges = [...g.edges.values()]
    .map((e) => `${e.id}:${e.nodeA}:${e.nodeB}:${JSON.stringify(e.latticePoints)}`)
    .join("|");
  const strands = g.strands
    .map((s) => `${s.isClosed}:${s.edgeIds.join(",")}:${s.nodes.join(",")}`)
    .join("|");
  return `${nodes}#${edges}#${strands}`;
}

// Connected components of the traced graph over nodes+edges (the physical
// "one piece of knotwork" census).
function graphComponents(g: TangleGraph): number {
  const seen = new Set<string>();
  let comps = 0;
  for (const id of g.nodes.keys()) {
    if (seen.has(id)) continue;
    comps++;
    const queue = [id];
    seen.add(id);
    for (let h = 0; h < queue.length; h++) {
      for (const eid of g.adjacency.get(queue[h]) ?? []) {
        const e = g.edges.get(eid)!;
        for (const nb of [e.nodeA, e.nodeB]) {
          if (!seen.has(nb)) {
            seen.add(nb);
            queue.push(nb);
          }
        }
      }
    }
  }
  return comps;
}

const SCULPTED = SHAPES.filter((s) => s !== "rect");

describe("shaped lattices: grower", () => {
  it("rect is byte-identical to the unshaped grower (RNG order guard)", () => {
    for (const seed of [5, 2773729296]) {
      const plain = gen(seed);
      const rect = gen(seed, "rect");
      expect(serialize(rect)).toBe(serialize(plain));
    }
  });

  it("keeps all invariants on every sculpted shape", () => {
    for (const shape of SCULPTED) {
      for (const seed of [5, 42, 1234]) {
        const g = gen(seed, shape);
        expect(g.nodes.size, `${shape} seed ${seed}`).toBeGreaterThan(0);
        expect(checkStructure(g), `${shape} seed ${seed}`).toBe(true);
        expect(checkAlternation(g), `${shape} seed ${seed}`).toBe(true);
        expect(checkStrandPartition(g), `${shape} seed ${seed}`).toBe(true);
        for (const strand of g.strands) expect(strand.isClosed).toBe(true);
      }
    }
  });

  it("holds invariants at weave-density extremes on a masked lattice", () => {
    for (const shape of ["ring", "star"] as const) {
      for (const weaveDensity of [0, 1]) {
        const g = generateLatticeKnotwork({
          gridSize: 12,
          weaveDensity,
          turnBias: 0.7,
          randSeed: 123,
          shape,
        });
        expect(checkStructure(g)).toBe(true);
        expect(checkAlternation(g)).toBe(true);
        expect(checkStrandPartition(g)).toBe(true);
        expect(graphComponents(g)).toBe(1);
      }
    }
  });

  it("traces one connected piece of knotwork (no orphan islands)", () => {
    for (const shape of SHAPES) {
      for (const seed of [5, 42]) {
        const g = gen(seed, shape);
        expect(graphComponents(g), `${shape} seed ${seed}`).toBe(1);
      }
    }
  });

  it("confines every node to in-mask cells", () => {
    for (const shape of SCULPTED) {
      const size = 12;
      const mask = buildCellMask(shape, size)!;
      expect(mask).not.toBeNull();
      const g = gen(7, shape, size);
      for (const n of g.nodes.values()) {
        const [x, y] = n.latticePos;
        // A node lies in the closed box of at least one in-mask cell.
        let ok = false;
        for (let cy = 0; cy < size && !ok; cy++) {
          for (let cx = 0; cx < size && !ok; cx++) {
            if (!mask[cy * size + cx]) continue;
            if (
              x >= 2 * cx &&
              x <= 2 * cx + 2 &&
              y >= 2 * cy &&
              y <= 2 * cy + 2
            ) {
              ok = true;
            }
          }
        }
        expect(ok, `${shape}: node ${n.id} at ${x},${y} escapes mask`).toBe(
          true
        );
      }
    }
  });

  it("ring keeps a real interior hole", () => {
    for (const size of [12, 16]) {
      const g = gen(11, "ring", size);
      expect(g.nodes.size).toBeGreaterThan(0);
      // The annulus floor is r >= 0.52 (normalized); nothing may sit more
      // than one cell inside it.
      const holeR = 0.52 * size - 2;
      expect(holeR).toBeGreaterThan(2);
      for (const n of g.nodes.values()) {
        const d = Math.hypot(n.latticePos[0] - size, n.latticePos[1] - size);
        expect(d, `node ${n.id} inside the ring hole`).toBeGreaterThan(holeR);
      }
    }
  });

  it("degenerate resolutions fall back to the full lattice, not a crash", () => {
    // gridSize 2: most masks keep < 2 cells and must fall back to rect.
    for (const shape of SCULPTED) {
      const g = gen(3, shape, 2);
      expect(g.nodes.size).toBeGreaterThan(0);
      expect(checkStructure(g)).toBe(true);
      expect(checkAlternation(g)).toBe(true);
    }
  });
});

describe("shaped lattices: anchors", () => {
  it("rect anchor extremes reproduce the historic corners exactly", () => {
    const size = 12;
    expect(maskExtremePoint(null, size, "nw")).toEqual([0, 0]);
    expect(maskExtremePoint(null, size, "se")).toEqual([2 * size, 2 * size]);
    // Edge anchors pick the boundary midpoint, not a corner.
    expect(maskExtremePoint(null, size, "n")).toEqual([size, 0]);
    expect(maskExtremePoint(null, size, "s")).toEqual([size, 2 * size]);
    expect(maskExtremePoint(null, size, "e")).toEqual([2 * size, size]);
    expect(maskExtremePoint(null, size, "w")).toEqual([0, size]);
  });

  it("planAnchors(rect, nw, se) is the historic corner plan", () => {
    const a = planAnchors("rect", 12, "nw", "se");
    const s = Math.SQRT1_2;
    expect(a.entrancePoint).toEqual([0, 0]);
    expect(a.exitPoint).toEqual([24, 24]);
    expect(a.entranceDir).toEqual([-s, -s]);
    expect(a.exitDir).toEqual([s, s]);
  });

  it("default maze plan is unchanged by explicit rect/nw/se anchors", () => {
    for (const seed of [5, 42]) {
      const g1 = gen(seed, undefined, 8);
      const g2 = gen(seed, "rect", 8);
      const plain = buildMazePlan(g1);
      const anchored = buildMazePlan(g2, {
        ...DEFAULT_MAZE_PARAMS,
        ...planAnchors("rect", 8, "nw", "se"),
      });
      expect(JSON.stringify(anchored)).toBe(JSON.stringify(plain));
    }
  });

  it("shaped anchor targets land in in-mask material (nudge off slivers)", () => {
    for (const shape of SCULPTED) {
      const size = 12;
      const mask = buildCellMask(shape, size)!;
      for (const sa of ["nw", "n", "e", "s", "w", "se"] as AnchorId[]) {
        const a = planAnchors(shape, size, sa, sa);
        const [px, py] = a.entrancePoint;
        const cx = Math.min(size - 1, Math.max(0, Math.floor(px / 2)));
        const cy = Math.min(size - 1, Math.max(0, Math.floor(py / 2)));
        expect(
          mask[cy * size + cx],
          `${shape} ${sa} target ${px.toFixed(1)},${py.toFixed(1)} off-mask`
        ).toBe(true);
      }
    }
  });

  it("shaped extreme points sit on the mask boundary toward the anchor", () => {
    const size = 16;
    const mask = buildCellMask("ring", size)!;
    const n = maskExtremePoint(mask, size, "n");
    const s = maskExtremePoint(mask, size, "s");
    // Top/bottom of the OUTER ring boundary, centered horizontally.
    expect(n[1]).toBeLessThan(4);
    expect(s[1]).toBeGreaterThan(2 * size - 4);
    expect(Math.abs(n[0] - size)).toBeLessThanOrEqual(4);
    expect(Math.abs(s[0] - size)).toBeLessThanOrEqual(4);
  });
});

describe("shaped lattices: maze fabric end to end", () => {
  const CASES: Array<[ShapeId, AnchorId, AnchorId]> = [
    ["rect", "sw", "ne"],
    ["heart", "w", "e"],
    ["star", "n", "s"],
    ["fish", "w", "e"],
    ["tree", "n", "s"],
    ["ring", "nw", "se"],
  ];

  it("plans, applies, and walks on every shape/anchor combo", () => {
    for (const [shape, sa, xa] of CASES) {
      for (const seed of [5, 42]) {
        const g = gen(seed, shape);
        const anchors = planAnchors(shape, 12, sa, xa);
        const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, ...anchors });

        // The chosen cut edges live near their own anchor, not the other's.
        const edgeDist = (edgeId: string, p: [number, number]): number => {
          const e = g.edges.get(edgeId)!;
          let d = Infinity;
          for (const [x, y] of e.latticePoints) {
            d = Math.min(d, Math.hypot(x - p[0], y - p[1]));
          }
          return d;
        };
        expect(
          edgeDist(plan.entrance.edgeId, anchors.entrancePoint),
          `${shape} ${sa} entrance`
        ).toBeLessThan(edgeDist(plan.entrance.edgeId, anchors.exitPoint));
        expect(
          edgeDist(plan.exit.edgeId, anchors.exitPoint),
          `${shape} ${xa} exit`
        ).toBeLessThan(edgeDist(plan.exit.edgeId, anchors.entrancePoint));

        const hueGroup = applyMazePlan(g, plan);
        // The entrance cut's midpoint (the tail starts there).
        const cutPts = g.edges.get(plan.entrance.edgeId)!.latticePoints;
        const cutA = cutPts[0];
        const cutB = cutPts[cutPts.length - 1];
        const cutMid = [(cutA[0] + cutB[0]) / 2, (cutA[1] + cutB[1]) / 2];
        applyMazeCuts(g, plan, hueGroup);
        expect(checkStructure(g), `${shape} seed ${seed}`).toBe(true);
        expect(checkAlternation(g), `${shape} seed ${seed}`).toBe(true);

        const wg = buildWalkGraph(g);
        expect(wg, `${shape} seed ${seed} walk graph`).not.toBeNull();
        expect(Number.isFinite(wg!.optimalLength)).toBe(true);
        expect(wg!.optimalLength).toBeGreaterThan(0);

        // The anchored tails carry the anchor directions. A fixed tail's
        // pin sits CUT_REACH out from its END along the anchor; an
        // ESCAPED tail (shaped lattices) ends AT its pin, which must head
        // away from the cut (sideways allowed, never back inward) and
        // clear every other edge.
        const entrNode = [...g.nodes.values()].find(
          (n) => n.id.startsWith("mentr") && n.anchor
        )!;
        const d = anchors.entranceDir;
        const pin = entrNode.anchor!;
        const escaped =
          pin[0] === entrNode.latticePos[0] && pin[1] === entrNode.latticePos[1];
        if (!escaped) {
          const off = [
            pin[0] - entrNode.latticePos[0],
            pin[1] - entrNode.latticePos[1],
          ];
          const dot = off[0] * d[0] + off[1] * d[1];
          expect(dot, `${shape} entrance tail direction`).toBeGreaterThan(0);
        } else {
          const off = [pin[0] - cutMid[0], pin[1] - cutMid[1]];
          const len = Math.hypot(off[0], off[1]);
          const dot = off[0] * d[0] + off[1] * d[1];
          expect(dot, `${shape} escaped tail heads outward`).toBeGreaterThan(
            -0.25 * len
          );
          const own = new Set(g.adjacency.get(entrNode.id) ?? []);
          let clear = Infinity;
          for (const e of g.edges.values()) {
            if (own.has(e.id)) continue;
            for (const [x, y] of e.latticePoints) {
              clear = Math.min(clear, Math.hypot(x - pin[0], y - pin[1]));
            }
          }
          expect(clear, `${shape} escaped tail clearance`).toBeGreaterThan(2);
        }
      }
    }
  });

  it("supports equal anchors without colliding the two cuts", () => {
    const g = gen(5, "heart");
    const anchors = planAnchors("heart", 12, "s", "s");
    const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, ...anchors });
    expect(plan.entrance.edgeId).not.toBe(plan.exit.edgeId);
    const hueGroup = applyMazePlan(g, plan);
    applyMazeCuts(g, plan, hueGroup);
    expect(checkStructure(g)).toBe(true);
    expect(buildWalkGraph(g)).not.toBeNull();
  });
});
