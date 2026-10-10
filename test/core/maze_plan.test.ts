import { describe, it, expect } from "vitest";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import type { MazeParams, SpliceSite } from "../../src/core/maze_plan";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// P4 Stage 5: the combinatorial maze plan, splice model.

function build(seed: number, gridSize = 8): TangleGraph {
  return generateLatticeKnotwork({
    gridSize,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
}

const P = (over: Partial<MazeParams>): MazeParams => ({
  ...DEFAULT_MAZE_PARAMS,
  ...over,
});

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

// Strict-interior segment intersection (mirror of the module's test).
function properIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const r1x = bx - ax, r1y = by - ay;
  const r2x = dx - cx, r2y = dy - cy;
  const denom = r1x * r2y - r1y * r2x;
  if (Math.abs(denom) < 1e-12) return false;
  const qx = cx - ax, qy = cy - ay;
  const u = (qx * r2y - qy * r2x) / denom;
  const v = (qx * r1y - qy * r1x) / denom;
  return u > 1e-6 && u < 1 - 1e-6 && v > 1e-6 && v < 1 - 1e-6;
}

const SEEDS = [5, 42, 1234, 2773729296, 99];

describe("maze plan: connectivity backbone", () => {
  it("partitions every strand into maze or culled", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const plan = buildMazePlan(g);
      const all = [...plan.mazeStrands, ...plan.culledStrands].sort((a, b) => a - b);
      expect(all).toEqual(g.strands.map((_, i) => i));
      expect(new Set(all).size).toBe(g.strands.length);
    }
  });

  it("makes every maze strand reachable via the spanning sites", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const plan = buildMazePlan(g);

      const adj = new Map<number, number[]>();
      for (const s of plan.mazeStrands) adj.set(s, []);
      for (const sp of plan.spanningSplices) {
        adj.get(sp.strandA)!.push(sp.strandB);
        adj.get(sp.strandB)!.push(sp.strandA);
      }
      const cs = crossingStrands(g);
      for (const cid of plan.spanningMerges) {
        const [a, b] = cs.get(cid)!;
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
      }
      // Decoy-trim merges are real strand connections too.
      for (const cut of [plan.entrance, plan.exit]) {
        if (!cut.trim) continue;
        const [a, b] = cs.get(cut.trim.mergeCrossing)!;
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
      const quarterDiag = (bound * Math.SQRT2) / 4;
      expect(nearestPoint(plan.entrance.edgeId, [0, 0])).toBeLessThan(quarterDiag);
      expect(nearestPoint(plan.exit.edgeId, [bound, bound])).toBeLessThan(quarterDiag);
      expect(plan.entrance.edgeId).not.toBe(plan.exit.edgeId);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = buildMazePlan(build(1234));
    const b = buildMazePlan(build(1234));
    expect(a).toEqual(b);
  });
});

describe("maze plan: splice geometry", () => {
  it("finds a healthy candidate pool (choice splices exist)", () => {
    for (const seed of SEEDS) {
      const plan = buildMazePlan(build(seed));
      expect(plan.choiceSplices.length).toBeGreaterThan(0);
    }
  });

  it("bridges are short, on their claimed strands, and cross no thread", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const plan = buildMazePlan(g);
      const splices: SpliceSite[] = [
        ...plan.spanningSplices,
        ...plan.choiceSplices,
      ];
      const bridges: Array<{
        seg: [number, number, number, number];
        hosts: string[];
      }> = splices.map((sp) => ({
        seg: [sp.a[0], sp.a[1], sp.b[0], sp.b[1]],
        hosts: [sp.edgeA, sp.edgeB],
      }));

      for (const sp of splices) {
        const len = Math.hypot(sp.a[0] - sp.b[0], sp.a[1] - sp.b[1]);
        expect(len).toBeGreaterThanOrEqual(1.2);
        expect(len).toBeLessThanOrEqual(2.2);
        expect(g.strands[sp.strandA].edgeIds).toContain(sp.edgeA);
        expect(g.strands[sp.strandB].edgeIds).toContain(sp.edgeB);
      }

      // No bridge may properly cross any existing edge (other than glancing
      // its own hosts, whose midpoints are its endpoints).
      for (const br of bridges) {
        for (const [eid, edge] of g.edges) {
          if (br.hosts.includes(eid)) continue;
          const p0 = edge.latticePoints[0];
          const p1 = edge.latticePoints[edge.latticePoints.length - 1];
          expect(
            properIntersect(
              br.seg[0], br.seg[1], br.seg[2], br.seg[3],
              p0[0], p0[1], p1[0], p1[1]
            )
          ).toBe(false);
        }
      }
    }
  });

  it("never places two junction sites on the same edge", () => {
    for (const seed of SEEDS) {
      const plan = buildMazePlan(build(seed), P({ branchDensity: 0.8, deadEndDensity: 0.5 }));
      const edges: string[] = [];
      for (const sp of [...plan.spanningSplices, ...plan.choiceSplices]) {
        edges.push(sp.edgeA, sp.edgeB);
      }
      for (const dc of plan.deadEndCuts) edges.push(dc.edgeId);
      edges.push(plan.entrance.edgeId, plan.exit.edgeId);
      expect(new Set(edges).size).toBe(edges.length);
    }
  });
});

describe("maze plan: knobs", () => {
  it("branchDensity 0 yields no choice sites at all", () => {
    for (const seed of SEEDS) {
      const plan = buildMazePlan(build(seed), P({ branchDensity: 0 }));
      expect(plan.choiceSplices).toEqual([]);
      expect(plan.fourWayMerges).toEqual([]);
      expect(plan.deadEndCuts).toEqual([]);
    }
  });

  it("choice-site count grows with branchDensity", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const count = (bd: number): number => {
        const p = buildMazePlan(g, P({ branchDensity: bd }));
        return p.choiceSplices.length + p.fourWayMerges.length;
      };
      expect(count(0.5)).toBeGreaterThanOrEqual(count(0.15));
      expect(count(0.5)).toBeGreaterThan(0);
    }
  });

  it("fourWayFraction 0 -> no merges; 1 -> no choice splices", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const none = buildMazePlan(g, P({ fourWayFraction: 0 }));
      expect(none.fourWayMerges).toEqual([]);
      const all = buildMazePlan(g, P({ fourWayFraction: 1, branchDensity: 0.4 }));
      expect(all.choiceSplices).toEqual([]);
    }
  });

  it("deadEndDensity 0 -> no cuts; raising it adds long dead-end cuts", () => {
    let totalCuts = 0;
    for (const seed of SEEDS) {
      const g = build(seed);
      const none = buildMazePlan(g, P({ deadEndDensity: 0 }));
      expect(none.deadEndCuts).toEqual([]);
      const some = buildMazePlan(
        g,
        P({ deadEndDensity: 1, branchDensity: 0.5 })
      );
      // Eligibility is strand-level: closed maze strands that don't host
      // the corner cuts. Tiny test knots can have none (seed 5 at gridSize
      // 8 is two strands, both corner hosts).
      const eligible = some.mazeStrands.filter(
        (s) =>
          g.strands[s].isClosed &&
          s !== some.entrance.strand &&
          s !== some.exit.strand
      ).length;
      if (eligible === 0) {
        expect(some.deadEndCuts).toEqual([]);
      } else {
        expect(some.deadEndCuts.length).toBeGreaterThan(0);
      }
      expect(some.deadEndCuts.length).toBeLessThanOrEqual(eligible);
      totalCuts += some.deadEndCuts.length;
    }
    expect(totalCuts).toBeGreaterThan(0);
  });

  it("dead-end cuts: one per closed maze strand, trimmed, off-limits edges", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const plan = buildMazePlan(
        g,
        P({ deadEndDensity: 1, branchDensity: 0.5 })
      );
      const strands = plan.deadEndCuts.map((c) => c.strand);
      expect(new Set(strands).size).toBe(strands.length);
      for (const dc of plan.deadEndCuts) {
        expect(g.strands[dc.strand].isClosed).toBe(true);
        expect(plan.mazeStrands).toContain(dc.strand);
        expect(dc.strand).not.toBe(plan.entrance.strand);
        expect(dc.strand).not.toBe(plan.exit.strand);
        // Every dead-end cut carries a planned trim; its stub never eats
        // another site's edge.
        expect(dc.trim).toBeDefined();
        for (const se of dc.trim!.stubEdges) {
          expect(se).not.toBe(plan.entrance.edgeId);
          expect(se).not.toBe(plan.exit.edgeId);
          for (const other of plan.deadEndCuts) {
            if (other !== dc) expect(se).not.toBe(other.edgeId);
          }
        }
      }
    }
  });

  it("choice sites respect corner clearance and the spacing floor", () => {
    for (const seed of SEEDS) {
      const g = build(seed);
      const params = P({
        branchDensity: 0.8,
        deadEndDensity: 0.4,
        exitClearance: 5,
        entranceClearance: 3,
        junctionSpacing: 2,
      });
      const plan = buildMazePlan(g, params);
      const bound = Math.max(2, Math.round(g.params.gridSize)) * 2;

      // Per-site point groups: a splice's own two ends are one site.
      const sites: number[][] = [];
      for (const sp of plan.choiceSplices) {
        sites.push([sp.a[0], sp.a[1], sp.b[0], sp.b[1]]);
      }
      for (const cid of plan.fourWayMerges) {
        const pos = g.nodes.get(cid)!.latticePos;
        sites.push([pos[0], pos[1]]);
      }
      for (const dc of plan.deadEndCuts) {
        const e = g.edges.get(dc.edgeId)!;
        const p0 = e.latticePoints[0];
        const p1 = e.latticePoints[e.latticePoints.length - 1];
        sites.push([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]);
      }

      for (const pts of sites) {
        for (let k = 0; k < pts.length; k += 2) {
          expect(Math.hypot(pts[k], pts[k + 1])).toBeGreaterThanOrEqual(
            params.entranceClearance
          );
          expect(
            Math.hypot(pts[k] - bound, pts[k + 1] - bound)
          ).toBeGreaterThanOrEqual(params.exitClearance);
        }
      }

      // Spacing between DIFFERENT sites (spanning sites included as
      // obstacles the choice phase must respect).
      const obstacles: number[][] = [...sites];
      for (const sp of plan.spanningSplices) {
        obstacles.push([sp.a[0], sp.a[1], sp.b[0], sp.b[1]]);
      }
      const cs = crossingStrands(g);
      for (const cid of plan.spanningMerges) {
        expect(cs.has(cid)).toBe(true);
        const pos = g.nodes.get(cid)!.latticePos;
        obstacles.push([pos[0], pos[1]]);
      }
      const nChoice = sites.length;
      for (let i = 0; i < nChoice; i++) {
        for (let j = 0; j < obstacles.length; j++) {
          if (obstacles[j] === sites[i]) continue;
          // Only enforce for pairs where at least one is a choice site.
          if (j >= nChoice && i >= nChoice) continue;
          let d = Infinity;
          for (let k = 0; k < sites[i].length; k += 2) {
            for (let m = 0; m < obstacles[j].length; m += 2) {
              d = Math.min(
                d,
                Math.hypot(
                  sites[i][k] - obstacles[j][m],
                  sites[i][k + 1] - obstacles[j][m + 1]
                )
              );
            }
          }
          expect(d).toBeGreaterThanOrEqual(params.junctionSpacing - 1e-9);
        }
      }
    }
  });
});
