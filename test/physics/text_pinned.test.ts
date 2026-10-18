import { describe, it, expect } from "vitest";
import { ParticleSystem } from "../../src/physics/particle_system";
import { checkAlternation, checkStructure } from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { Edge, Node, Strand, TangleGraph } from "../../src/core/types";

// K115 Part B: hand-built fixtures (not buildTextGraph). A pinned strand
// anchors every particle; an overFirst crossing takes its over pass from
// strand-occurrence order, not the lattice slash reading.

function graphOf(nodes: Node[], edges: Edge[], strands: Strand[]): TangleGraph {
  const adjacency = new Map<string, string[]>();
  for (const n of nodes) adjacency.set(n.id, []);
  for (const e of edges) {
    adjacency.get(e.nodeA)!.push(e.id);
    adjacency.get(e.nodeB)!.push(e.id);
  }
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges: new Map(edges.map((e) => [e.id, e])),
    adjacency,
    strands,
    seed: 1,
    params: { gridSize: 4, weaveDensity: 0, turnBias: 0, randSeed: 1 },
  };
}

const node = (
  id: string,
  type: Node["type"],
  x: number,
  y: number,
  overFirst?: boolean
): Node => ({ id, type, latticePos: [x, y], overFirst });

const edge = (id: string, a: string, b: string, pa: [number, number], pb: [number, number]): Edge => ({
  id,
  nodeA: a,
  nodeB: b,
  latticePoints: [pa, pb],
});

// One bent open strand: END - TURN - END in an L.
function bentGraph(pinned: boolean): TangleGraph {
  const nodes = [
    node("s", NODE_TYPE.END, 0, 0),
    node("m", NODE_TYPE.TURN, 2, 0),
    node("e", NODE_TYPE.END, 2, 2),
  ];
  const edges = [
    edge("e1", "s", "m", [0, 0], [2, 0]),
    edge("e2", "m", "e", [2, 0], [2, 2]),
  ];
  const strands: Strand[] = [
    { nodes: ["s", "m", "e"], edgeIds: ["e1", "e2"], isClosed: false, pinned },
  ];
  return graphOf(nodes, edges, strands);
}

// Main strand (first) crosses two vertical strands. X1/X2 sit on the
// horizontal/vertical axes, where the slash class (vx*vy > 0) is false for
// every pass, so only overFirst can pick the over pass.
function crossingGraph(): TangleGraph {
  const nodes = [
    node("ms", NODE_TYPE.END, 0, 2),
    node("x1", NODE_TYPE.CROSSING, 2, 2, true),
    node("mid", NODE_TYPE.TURN, 4, 2),
    node("x2", NODE_TYPE.CROSSING, 6, 2, false),
    node("me", NODE_TYPE.END, 8, 2),
    node("bs", NODE_TYPE.END, 2, 0),
    node("be", NODE_TYPE.END, 2, 4),
    node("cs", NODE_TYPE.END, 6, 0),
    node("ce", NODE_TYPE.END, 6, 4),
  ];
  const edges = [
    edge("a1", "ms", "x1", [0, 2], [2, 2]),
    edge("a2", "x1", "mid", [2, 2], [4, 2]),
    edge("a3", "mid", "x2", [4, 2], [6, 2]),
    edge("a4", "x2", "me", [6, 2], [8, 2]),
    edge("b1", "bs", "x1", [2, 0], [2, 2]),
    edge("b2", "x1", "be", [2, 2], [2, 4]),
    edge("c1", "cs", "x2", [6, 0], [6, 2]),
    edge("c2", "x2", "ce", [6, 2], [6, 4]),
  ];
  const strands: Strand[] = [
    { nodes: ["ms", "x1", "mid", "x2", "me"], edgeIds: ["a1", "a2", "a3", "a4"], isClosed: false },
    { nodes: ["bs", "x1", "be"], edgeIds: ["b1", "b2"], isClosed: false },
    { nodes: ["cs", "x2", "ce"], edgeIds: ["c1", "c2"], isClosed: false },
  ];
  return graphOf(nodes, edges, strands);
}

describe("K115 pinned strands and overFirst crossings", () => {
  it("holds every particle of a pinned strand at its initial position", () => {
    const ps = new ParticleSystem(bentGraph(true));
    const start = new Float32Array(ps.positions);
    for (let p = 0; p < ps.particleCount; p++) expect(ps.isAnchored(p)).toBe(true);
    for (let i = 0; i < 120; i++) ps.step(1 / 60);
    expect([...ps.positions]).toEqual([...start]);
  });

  it("lets the same strand move when it is not pinned", () => {
    const ps = new ParticleSystem(bentGraph(false));
    const start = new Float32Array(ps.positions);
    for (let i = 0; i < 120; i++) ps.step(1 / 60);
    let moved = 0;
    for (let i = 0; i < ps.positions.length; i++) {
      moved = Math.max(moved, Math.abs(ps.positions[i] - start[i]));
    }
    expect(moved).toBeGreaterThan(0.001);
  });

  it("takes the over pass from strand-occurrence order when overFirst is set", () => {
    const graph = crossingGraph();
    expect(checkStructure(graph)).toBe(true);
    expect(checkAlternation(graph)).toBe(true);
    const ps = new ParticleSystem(graph);
    expect(ps.crossings).toHaveLength(2);
    // x1 (overFirst): the main strand (chain 0, first occurrence) is over.
    expect(ps.crossings[0].over.chain).toBe(0);
    expect(ps.crossings[0].under.chain).toBe(1);
    // x2 (not overFirst): the vertical strand (chain 2) is over.
    expect(ps.crossings[1].over.chain).toBe(2);
    expect(ps.crossings[1].under.chain).toBe(0);
  });
});
