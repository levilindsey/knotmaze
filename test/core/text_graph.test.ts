import { describe, expect, it } from "vitest";
import { buildTextGraph } from "../../src/core/text_graph";
import { checkStrandPartition, checkStructure } from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// K115 Stage 1b Part A: cursive text graphs.
//
// Alternation is verified here with overFirst semantics (the first pass
// in strand order is over iff node.overFirst), replicating what physics
// and checkAlternation do once they prefer that field. The older slash
// reading of isOver cannot express a crossing whose two passes fall in
// the same slash class, so at this commit checkAlternation itself is not
// the oracle for text graphs.

function checkAlternationOverFirst(graph: TangleGraph): boolean {
  const seenCrossings = new Set<string>();
  for (const strand of graph.strands) {
    const tokens: Array<boolean | "J"> = [];
    const count = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type === NODE_TYPE.JUNCTION) {
        tokens.push("J");
        continue;
      }
      if (node.type !== NODE_TYPE.CROSSING) continue;
      const isFirst = !seenCrossings.has(node.id);
      seenCrossings.add(node.id);
      tokens.push(isFirst ? node.overFirst === true : node.overFirst !== true);
    }
    const firstJ = tokens.indexOf("J");
    if (strand.isClosed && firstJ < 0) {
      const passes = tokens as boolean[];
      if (passes.length < 2) continue;
      for (let i = 0; i < passes.length; i++) {
        if (passes[i] === passes[(i + 1) % passes.length]) return false;
      }
    } else {
      const n = tokens.length;
      let prev: boolean | null = null;
      for (let k = 0; k < n; k++) {
        const t = strand.isClosed ? tokens[(firstJ + 1 + k) % n] : tokens[k];
        if (t === "J") {
          prev = null;
          continue;
        }
        if (prev !== null && prev === t) return false;
        prev = t;
      }
    }
  }
  return true;
}

function crossingOccurrences(graph: TangleGraph): Map<string, number> {
  const occ = new Map<string, number>();
  for (const strand of graph.strands) {
    const count = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type === NODE_TYPE.CROSSING) {
        occ.set(node.id, (occ.get(node.id) ?? 0) + 1);
      }
    }
  }
  return occ;
}

function serialize(graph: TangleGraph): string {
  const parts: string[] = [];
  for (const n of graph.nodes.values()) {
    parts.push(
      `${n.id}:${n.type}:${n.latticePos[0].toFixed(3)},${n.latticePos[1].toFixed(3)}:${n.isOver ? 1 : 0}${n.overFirst ? 1 : 0}`
    );
  }
  for (const s of graph.strands) parts.push(s.nodes.join(">") + "|" + s.edgeIds.join(","));
  return parts.join(";");
}

function hashGraph(graph: TangleGraph): string {
  const text = serialize(graph);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

const WORDS = ["Welcome", "knotmaze", "minimum", "hello", "Daily #12", "Solved"];

describe("buildTextGraph (K115)", () => {
  for (const word of WORDS) {
    it(`builds a valid pinned text graph for ${JSON.stringify(word)}`, () => {
      const graph = buildTextGraph(word);
      expect(checkStructure(graph)).toBe(true);
      expect(checkStrandPartition(graph)).toBe(true);
      expect(checkAlternationOverFirst(graph)).toBe(true);

      // Entrance and exit ends, at the ends of the main (first) strand.
      expect(graph.nodes.get("mentr_a")?.type).toBe(NODE_TYPE.END);
      expect(graph.nodes.get("mexit_a")?.type).toBe(NODE_TYPE.END);
      const main = graph.strands[0];
      expect(main.nodes[0]).toBe("mentr_a");
      expect(main.nodes[main.nodes.length - 1]).toBe("mexit_a");

      for (const strand of graph.strands) {
        expect(strand.pinned).toBe(true);
        expect(strand.nodes.length).toBe(strand.edgeIds.length + 1);
        strand.edgeIds.forEach((edgeId, i) => {
          const edge = graph.edges.get(edgeId)!;
          const a = strand.nodes[i];
          const b = strand.nodes[i + 1];
          expect(
            (edge.nodeA === a && edge.nodeB === b) ||
              (edge.nodeB === a && edge.nodeA === b)
          ).toBe(true);
        });
      }

      for (const edge of graph.edges.values()) {
        expect(edge.latticePoints).toHaveLength(2);
        expect(edge.latticePoints[0]).toEqual(graph.nodes.get(edge.nodeA)!.latticePos);
        expect(edge.latticePoints[1]).toEqual(graph.nodes.get(edge.nodeB)!.latticePos);
      }

      // Every crossing is passed by exactly two strand passes and has an
      // explicit over pass.
      const occ = crossingOccurrences(graph);
      for (const node of graph.nodes.values()) {
        if (node.type !== NODE_TYPE.CROSSING) continue;
        expect(occ.get(node.id)).toBe(2);
        expect(node.overFirst).toBeDefined();
        expect(node.isOver).toBeDefined();
      }
    });
  }

  it("pins Welcome (counts and a hash of rounded positions)", () => {
    const graph = buildTextGraph("Welcome");
    expect(graph.nodes.size).toBe(175);
    expect(graph.edges.size).toBe(178);
    expect(graph.strands.length).toBe(9);
    expect(hashGraph(graph)).toBe("f972ee61");
  });

  it("is deterministic", () => {
    expect(serialize(buildTextGraph("Welcome"))).toBe(serialize(buildTextGraph("Welcome")));
    expect(serialize(buildTextGraph("Daily #12"))).toBe(serialize(buildTextGraph("Daily #12")));
  });

  it("makes dots tiny closed loop strands", () => {
    const graph = buildTextGraph("minimum");
    const closed = graph.strands.filter((s) => s.isClosed);
    expect(closed.length).toBeGreaterThan(0);
    for (const s of closed) expect(s.nodes[0]).toBe(s.nodes[s.nodes.length - 1]);
  });

  it("has travelable spur strands ending at END tips", () => {
    const graph = buildTextGraph("Welcome");
    const spurs = graph.strands.slice(1);
    expect(spurs.length).toBeGreaterThan(0);
    const withEnd = spurs.filter((s) =>
      [s.nodes[0], s.nodes[s.nodes.length - 1]].some(
        (id) => graph.nodes.get(id)?.type === NODE_TYPE.END
      )
    );
    expect(withEnd.length).toBeGreaterThan(0);
  });

  it("scales with xHeight", () => {
    const height = (g: TangleGraph): number => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const n of g.nodes.values()) {
        if (n.latticePos[1] < lo) lo = n.latticePos[1];
        if (n.latticePos[1] > hi) hi = n.latticePos[1];
      }
      return hi - lo;
    };
    expect(height(buildTextGraph("hello", { xHeight: 6 }))).toBeCloseTo(
      height(buildTextGraph("hello")) * 2,
      6
    );
  });

  it("skips unsupported characters without throwing", () => {
    const graph = buildTextGraph("aé🎉b");
    expect(graph.nodes.get("mentr_a")?.type).toBe(NODE_TYPE.END);
    expect(graph.nodes.get("mexit_a")?.type).toBe(NODE_TYPE.END);
    expect(checkStructure(graph)).toBe(true);
    expect(checkStrandPartition(graph)).toBe(true);
  });
});
