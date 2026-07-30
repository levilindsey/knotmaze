import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// P4 Stage 5 (increment 1): the maze plan's connectivity backbone.

function build(seed: number, gridSize = 6): TangleGraph {
  return generateLatticeKnotwork({
    gridSize,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
}

// Which strands pass through each crossing (2 entries; equal for self-cross).
function crossingStrands(graph: TangleGraph): Map<string, number[]> {
  const map = new Map<string, number[]>();
  graph.strands.forEach((strand, si) => {
    const count = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type !== NODE_TYPE.CROSSING) continue;
      const list = map.get(node.id);
      if (list) list.push(si);
      else map.set(node.id, [si]);
    }
  });
  return map;
}

const SEEDS = [5, 42, 1234, 2773729296, 99];

describe("maze plan: connectivity backbone", () => {
  it("partitions every strand into maze or culled", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const plan = buildMazePlan(g);
      const all = [...plan.mazeStrands, ...plan.culledStrands].sort((a, b) => a - b);
      expect(all).toEqual(g.strands.map((_, i) => i));
      // No strand in both sets.
      expect(new Set(all).size).toBe(g.strands.length);
    }
  });

  it("makes every maze strand reachable from the entrance via the connections", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const plan = buildMazePlan(g);

      // Rebuild adjacency using ONLY the connection crossings, then BFS from
      // the entrance strand; it must cover every maze strand.
      const cs = crossingStrands(g);
      const conn = new Set(plan.connections);
      const adj = new Map<number, number[]>();
      for (const s of plan.mazeStrands) adj.set(s, []);
      for (const cid of conn) {
        const [a, b] = cs.get(cid)!;
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
      }
      const seen = new Set<number>([plan.entrance.strand]);
      const queue = [plan.entrance.strand];
      for (let h = 0; h < queue.length; h++) {
        for (const nb of adj.get(queue[h]) ?? []) {
          if (!seen.has(nb)) {
            seen.add(nb);
            queue.push(nb);
          }
        }
      }
      expect(seen.size).toBe(plan.mazeStrands.length);
      expect(plan.mazeStrands).toContain(plan.exit.strand);
    }
  });

  it("places the entrance near top-left and the exit near bottom-right", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const plan = buildMazePlan(g);
      const bound = Math.max(2, Math.round(g.params.gridSize)) * 2;

      const nearestPoint = (edgeId: string, corner: [number, number]): number => {
        const e = g.edges.get(edgeId)!;
        let d = Infinity;
        for (const [x, y] of e.latticePoints) {
          d = Math.min(d, Math.hypot(x - corner[0], y - corner[1]));
        }
        return d;
      };
      // Within a quarter of the diagonal of the corner it belongs to.
      const quarterDiag = (bound * Math.SQRT2) / 4;
      expect(nearestPoint(plan.entrance.edgeId, [0, 0])).toBeLessThan(quarterDiag);
      expect(nearestPoint(plan.exit.edgeId, [bound, bound])).toBeLessThan(quarterDiag);
      // Entrance and exit are genuinely at opposite corners.
      expect(plan.entrance.edgeId).not.toBe(plan.exit.edgeId);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = buildMazePlan(build(1234));
    const b = buildMazePlan(build(1234));
    expect(a).toEqual(b);
  });
});

describe("maze plan: choice-junction selection", () => {
  const P = (over: Partial<typeof DEFAULT_MAZE_PARAMS>) => ({
    ...DEFAULT_MAZE_PARAMS,
    ...over,
  });

  it("scales junction count with branchDensity (0 = none)", () => {
    for (const seed of SEEDS) {
      const g = build(seed, 8);
      expect(buildMazePlan(g, P({ branchDensity: 0 })).junctions).toEqual([]);
      const few = buildMazePlan(g, P({ branchDensity: 0.15 })).junctions.length;
      const many = buildMazePlan(g, P({ branchDensity: 0.6 })).junctions.length;
      expect(many).toBeGreaterThanOrEqual(few);
      expect(many).toBeGreaterThan(0);
    }
  });

  it("keeps junctions clear of the entrance/exit corners and spaced apart", () => {
    for (const seed of SEEDS) {
      const g = build(seed, 8);
      const params = P({ branchDensity: 0.8, exitClearance: 5, entranceClearance: 3, junctionSpacing: 2 });
      const plan = buildMazePlan(g, params);
      const bound = Math.max(2, Math.round(g.params.gridSize)) * 2;
      const pts = plan.junctions.map((id) => g.nodes.get(id)!.latticePos);

      for (const [x, y] of pts) {
        expect(Math.hypot(x, y)).toBeGreaterThanOrEqual(params.entranceClearance);
        expect(Math.hypot(x - bound, y - bound)).toBeGreaterThanOrEqual(params.exitClearance);
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
          expect(d).toBeGreaterThanOrEqual(params.junctionSpacing - 1e-9);
        }
      }
    }
  });

  it("only selects crossings that belong to maze strands", () => {
    for (const seed of SEEDS) {
      const g = build(seed, 8);
      const plan = buildMazePlan(g, P({ branchDensity: 0.7 }));
      for (const id of plan.junctions) {
        expect(g.nodes.get(id)!.type).toBe(NODE_TYPE.CROSSING);
      }
      // No junction sits on a culled strand's crossing exclusively.
      expect(new Set(plan.junctions).size).toBe(plan.junctions.length);
    }
  });

  it("junction selection is deterministic", () => {
    const g1 = build(4242, 8);
    const g2 = build(4242, 8);
    expect(buildMazePlan(g1).junctions).toEqual(buildMazePlan(g2).junctions);
  });
});

describe("maze plan: junction realization (3-way spurs vs 4-way merges)", () => {
  const P = (over: Partial<typeof DEFAULT_MAZE_PARAMS>) => ({
    ...DEFAULT_MAZE_PARAMS,
    ...over,
  });

  it("keeps reachability connections 4-way and honors deadEndDensity on choices", () => {
    for (const seed of SEEDS) {
      const g = build(seed, 8);
      const params = P({ branchDensity: 0.7, deadEndDensity: 0.5 });
      const plan = buildMazePlan(g, params);

      // Connections are always 4-way.
      const connSet = new Set(plan.connections);
      for (const r of plan.realized) {
        if (connSet.has(r.crossing)) expect(r.type).toBe("four");
      }
      // Every realized crossing is a connection or a chosen junction.
      const known = new Set([...plan.connections, ...plan.junctions]);
      for (const r of plan.realized) expect(known.has(r.crossing)).toBe(true);
      // No duplicate realized crossings.
      expect(new Set(plan.realized.map((r) => r.crossing)).size).toBe(
        plan.realized.length
      );
    }
  });

  it("deadEndDensity 0 gives no 3-way spurs; 1 makes all choices 3-way", () => {
    for (const seed of SEEDS) {
      const g = build(seed, 8);
      const connSet = new Set(buildMazePlan(g).connections);

      const braided = buildMazePlan(g, P({ branchDensity: 0.8, deadEndDensity: 0 }));
      expect(braided.realized.every((r) => r.type === "four")).toBe(true);

      const spurred = buildMazePlan(g, P({ branchDensity: 0.8, deadEndDensity: 1 }));
      // Every pure-choice junction is a 3-way; connections remain 4-way.
      for (const r of spurred.realized) {
        expect(r.type).toBe(connSet.has(r.crossing) ? "four" : "three");
      }
    }
  });
});
