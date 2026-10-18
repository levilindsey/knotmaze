import { describe, expect, it } from "vitest";
import { buildEmblemGraph, EMBLEM_DIA } from "../../src/core/emblem_graph";
import { EMBLEM_DEFS, EMBLEM_IDS } from "../../src/core/emblem_data";
import type { EmblemId } from "../../src/core/emblem_data";
import { assignOverUnder } from "../../src/core/text_graph";
import {
  checkAlternation,
  checkStrandPartition,
  checkStructure,
} from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";
import { hypot2 } from "../../src/util/det_math";

// K115 stage 5a: emblem builder (docs/design/K115_stage5.md, Tests).

function hashText(text: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function serialize(g: TangleGraph): string {
  const parts: string[] = [];
  for (const n of g.nodes.values()) {
    parts.push(`${n.id}:${n.type}:${n.latticePos[0]},${n.latticePos[1]}`);
  }
  for (const e of g.edges.values()) parts.push(`${e.id}:${e.nodeA}>${e.nodeB}`);
  for (const s of g.strands) parts.push(s.nodes.join(">") + "|" + s.edgeIds.join(","));
  return parts.join(";");
}

function pos(g: TangleGraph, id: string): [number, number] {
  const n = g.nodes.get(id)!;
  return [n.latticePos[0], n.latticePos[1]];
}

// Minimum along-strand arc between consecutive crossing passes (LU).
function minCrossingArc(g: TangleGraph): number {
  let min = Infinity;
  for (const strand of g.strands) {
    const count = strand.nodes.length - 1; // closed: last repeats first
    const cum = [0];
    for (let i = 0; i < count; i++) {
      const e = g.edges.get(strand.edgeIds[i])!;
      let len = 0;
      for (let m = 1; m < e.latticePoints.length; m++) {
        len += hypot2(
          e.latticePoints[m][0] - e.latticePoints[m - 1][0],
          e.latticePoints[m][1] - e.latticePoints[m - 1][1]
        );
      }
      cum.push(cum[i] + len);
    }
    const total = cum[count];
    const at: number[] = [];
    for (let i = 0; i < count; i++) {
      if (g.nodes.get(strand.nodes[i])!.type === NODE_TYPE.CROSSING) at.push(cum[i]);
    }
    for (let i = 0; i < at.length; i++) {
      const arc =
        i + 1 < at.length ? at[i + 1] - at[i] : total - at[i] + at[0];
      if (arc < min) min = arc;
    }
  }
  return min;
}

// Maximum squared cosine between the two passes at any crossing
// (angle >= 30 degrees iff this is <= cos(30)^2 = 0.75; no trig).
function maxCrossingCos2(g: TangleGraph): number {
  let max = 0;
  const crossings = new Set<string>();
  for (const n of g.nodes.values()) {
    if (n.type === NODE_TYPE.CROSSING) crossings.add(n.id);
  }
  for (const id of crossings) {
    const dirs: Array<[number, number]> = [];
    for (const strand of g.strands) {
      const count = strand.nodes.length - 1;
      for (let i = 0; i < count; i++) {
        if (strand.nodes[i] !== id) continue;
        const prev = pos(g, strand.nodes[(i - 1 + count) % count]);
        const next = pos(g, strand.nodes[(i + 1) % count]);
        dirs.push([next[0] - prev[0], next[1] - prev[1]]);
      }
    }
    expect(dirs, id).toHaveLength(2);
    const [a, b] = dirs;
    const dot = a[0] * b[0] + a[1] * b[1];
    const la = hypot2(a[0], a[1]);
    const lb = hypot2(b[0], b[1]);
    const cos2 = (dot * dot) / (la * la * lb * lb);
    if (cos2 > max) max = cos2;
  }
  return max;
}

const PIN: Record<EmblemId, { nodes: number; edges: number; strands: number; hash: string }> = {
  star: { nodes: 35, edges: 40, strands: 1, hash: "ef25df83" },
  trefoil: { nodes: 69, edges: 72, strands: 1, hash: "a1858a7b" },
  triquetra: { nodes: 33, edges: 36, strands: 1, hash: "2c4f02e8" },
  solomon: { nodes: 60, edges: 64, strands: 2, hash: "78024c6e" },
  wreath: { nodes: 136, edges: 144, strands: 2, hash: "d1fea827" },
};

describe("emblem graphs (K115 stage 5a)", () => {
  for (const id of EMBLEM_IDS) {
    it(`builds ${id}: topology, alternation, partition, geometry`, () => {
      const def = EMBLEM_DEFS[id];
      const g = buildEmblemGraph(id);
      expect(checkStructure(g)).toBe(true);
      expect(checkAlternation(g)).toBe(true);
      expect(checkStrandPartition(g)).toBe(true);
      expect(g.strands).toHaveLength(def.loops.length);
      for (const s of g.strands) {
        expect(s.isClosed).toBe(true);
        expect(s.pinned).toBe(def.pinned);
      }
      let crossings = 0;
      for (const n of g.nodes.values()) {
        if (n.type === NODE_TYPE.CROSSING) crossings += 1;
        expect(n.type).not.toBe(NODE_TYPE.END);
        expect(n.type).not.toBe(NODE_TYPE.JUNCTION);
        expect(n.waypoint).toBeUndefined();
      }
      expect(crossings).toBe(def.crossings);
      expect(minCrossingArc(g)).toBeGreaterThanOrEqual(2.2);
      expect(maxCrossingCos2(g)).toBeLessThanOrEqual(0.75 + 1e-9);
      // Solver conflicts zero (re-running the solver is idempotent).
      expect(assignOverUnder(g)).toBe(0);
      // Authored bounds' larger axis is the shipped diameter.
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const n of g.nodes.values()) {
        x0 = Math.min(x0, n.latticePos[0]); x1 = Math.max(x1, n.latticePos[0]);
        y0 = Math.min(y0, n.latticePos[1]); y1 = Math.max(y1, n.latticePos[1]);
      }
      expect(Math.max(x1 - x0, y1 - y0)).toBeCloseTo(EMBLEM_DIA, 9);
      // Double-build bit-identical.
      const again = buildEmblemGraph(id);
      expect(serialize(again)).toBe(serialize(g));
      // Frozen pin.
      const pin = PIN[id];
      expect(g.nodes.size).toBe(pin.nodes);
      expect(g.edges.size).toBe(pin.edges);
      expect(g.strands.length).toBe(pin.strands);
      expect(hashText(serialize(g))).toBe(pin.hash);
    });
  }

  it("keeps the per-shape pinned table (star/trefoil live, rest pinned)", () => {
    expect(EMBLEM_DEFS.star.pinned).toBe(false);
    expect(EMBLEM_DEFS.trefoil.pinned).toBe(false);
    expect(EMBLEM_DEFS.triquetra.pinned).toBe(true);
    expect(EMBLEM_DEFS.solomon.pinned).toBe(true);
    expect(EMBLEM_DEFS.wreath.pinned).toBe(true);
  });

  it("throws on an unknown emblem id", () => {
    expect(() => buildEmblemGraph("bogus" as EmblemId)).toThrow(/unknown emblem/);
  });
});
