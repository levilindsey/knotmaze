// Layer 1: Combinatorial graph types.

import type { ShapeId } from "./shapes";

export const NODE_TYPE = {
  CROSSING: "crossing",   // degree 4, over/under bit
  JUNCTION: "junction",   // degree 3+, branch/merge
  END: "end",             // degree 1, running end
  TURN: "turn",           // degree 2, path control
} as const;

export type NodeType = (typeof NODE_TYPE)[keyof typeof NODE_TYPE];

export interface Node {
  id: string;
  type: NodeType;
  latticePos: [number, number];  // Doubled-lattice position (turns may be fractional).
  isOver?: boolean;              // For crossings: true if the "/" (NE-SW) pass goes over.
  // K115 free-form crossings: when set, the first pass in strand order is
  // the over pass when true. Physics and checkAlternation prefer this over
  // the slash reading, which is ambiguous off the lattice. Lattice graphs
  // never set it, so their behavior is unchanged.
  overFirst?: boolean;
  // K558: a text crossing whose overFirst follows pen order (the later
  // stroke over, text_graph.ts assignPenOrder), not alternation, so
  // checkAlternation skips it. Lattice and emblem graphs never set it.
  penOrder?: true;
  // K115: a letter-boundary stop on a text scene's main path (the walk
  // graph treats it as a vertex even at degree 2, so each tap writes the
  // next letter). Lattice graphs never set it.
  waypoint?: boolean;
  // K580 (#glyphs2 only): a tapered root's start R, a degree-1 TURN where
  // the root strand begins on the midline of two body strokes. Never a walk
  // vertex or a dead end (its run to the junction precedes the strand's
  // first stop). Lattice graphs never set it.
  rootStart?: true;
  // P4 maze: entrance/exit END nodes are pinned to this world position by the
  // physics; free END tips (dead-end stubs) carry no anchor.
  anchor?: [number, number];
}

export interface Edge {
  id: string;
  nodeA: string;  // Node ID.
  nodeB: string;  // Node ID.
  latticePoints: Array<[number, number]>;  // Path through lattice.
  // K115 stage 9: the authored curve's mid-arc point between the two nodes
  // (glyph text edges only; the chain slot uses it in place of the chord
  // midpoint). Knot and maze edges never carry it.
  mid?: [number, number];
}

// A strand is a sequence of edges between junctions/ends.
export interface Strand {
  edgeIds: string[];
  isClosed: boolean;  // true if it forms a loop.
  nodes: string[];    // nodes traversed; first and last may be the same if closed.
  // K115: every particle of a pinned strand (nodes and edge midpoints) is
  // anchored at its authored position by the physics. Lattice strands
  // never set it, so their behavior is unchanged.
  pinned?: boolean;
  // K115 stage 6b: a floating accent mark (not letter material). The walk
  // graph skips a decorative strand whole, so its END tips never become
  // walk vertices or dead ends. Only the text builder's mark emitter sets
  // it; letter-body spurs stay travelable.
  decorative?: boolean;
  // K580 (#glyphs2 only): a TAPERED ROOT. The strand starts on the midline
  // of two body strokes that meet tangentially at a junction and runs to
  // that junction (node index `joint`) before its own path. `sep` is the
  // centerline separation (LU) of the two strokes the root covers, at even
  // steps of the root's arc from its start (R) to the joint (0 there); the
  // renderer widens the ribbon to 1 + sep / threadWidth, so the root's
  // edges are the strokes' outer edges.
  // K620 (the root's paint): `footC` / `footO` = each side's foot at the
  // same steps as `sep`, as a ctrl (node i = ctrl 2i) of the BODY strand,
  // the other strand through the joint node, which carries both strokes (C
  // into the joint, O out of it); `sideC` = TangentRoot's.
  taper?: { sep: number[]; joint: number; footC?: number[]; footO?: number[]; sideC?: 1 | -1 };
  // K580 s5 (#glyphs2 only): a GLYPH strand. The glyph graph sets it on
  // every strand it builds (tapered and notaper, floats included), and the
  // renderer reads it per chain: a glyph's fused spur tip gets the stadium
  // cap cover (joinery.ts), which maze bridges must not.
  glyph?: true;
}

// Main combinatorial graph. (The legacy single-strand MazeGraph - the old
// mazeMode / md=1 - was RETIRED 2026-10-10 once fabric gameplay strictly
// superseded it; the branching maze lives in core/maze_plan + walk_graph.)
export interface TangleGraph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  adjacency: Map<string, string[]>;  // node ID -> list of edge IDs.
  strands: Strand[];
  seed: number;
  params: GenerationParams;
}

// Parameters for generation.
export interface GenerationParams {
  gridSize: number;     // Number of lattice cells per dimension.
  weaveDensity: number; // [0, 1] P(non-tree wall opened): more = denser weave.
  turnBias: number;     // [0, 1] growing-tree newest-cell bias: more = windier corridors.
  randSeed: number;     // RNG seed.
  // Silhouette mask id (core/shapes.ts). Absent or "rect" = the full
  // rectangular lattice, byte-identical to the pre-shape grower.
  shape?: ShapeId;
  // K115 stage 4a: a rectangular cartouche hole stamped into the kept
  // mask (integer cell coordinates of the hole's top-left cell; absent
  // = today, byte-identical). See core/shapes.ts buildCellMask and
  // core/text_graph.ts planCartoucheHole.
  hole?: { cx: number; cy: number; w: number; h: number };
}

export interface ParamFieldConfig {
  type: "constant" | "simplex" | "painted";
  value?: number;                           // For constant.
  simplexScale?: number;                    // For simplex.
  simplexOctaves?: number;
}

export interface ParamField {
  config: ParamFieldConfig;
  evaluate(latticePos: [number, number]): number;
}
