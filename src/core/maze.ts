// P4 maze mode: the maze thread is one of the knot's own strands. Following a
// strand is exactly "always continue straight at crossings" - that is how
// traceKnot built it - so the traced path is a contiguous run of one strand
// from a start end to an exit end.

import type { TangleGraph, MazeGraph } from "./types";

export function buildMazeGraph(graph: TangleGraph): MazeGraph {
  // The longest strand makes the richest thread to trace.
  let strand = 0;
  let bestCount = -1;
  graph.strands.forEach((s, i) => {
    const count = s.nodes.length - 1; // last node repeats the first.
    if (count > bestCount) {
      bestCount = count;
      strand = i;
    }
  });

  const nodes = graph.strands[strand].nodes;
  const nodeCount = Math.max(1, nodes.length - 1);
  const chainLen = nodeCount * 2;

  // Open the loop VISUALLY at its most peripheral edge (the edge whose
  // midpoint sits farthest from the strand centroid, i.e. out at the border).
  // That edge is hidden and the two flanking nodes become the loose ends that
  // run off-screen; the traced path is the whole strand minus that one edge.
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < nodeCount; i++) {
    const p = graph.nodes.get(nodes[i])!.latticePos;
    cx += p[0];
    cy += p[1];
  }
  cx /= nodeCount;
  cy /= nodeCount;

  let cut = 0;
  let bestD = -1;
  for (let i = 0; i < nodeCount; i++) {
    const a = graph.nodes.get(nodes[i])!.latticePos;
    const b = graph.nodes.get(nodes[(i + 1) % nodeCount])!.latticePos;
    const mx = (a[0] + b[0]) / 2 - cx;
    const my = (a[1] + b[1]) / 2 - cy;
    const d = mx * mx + my * my;
    if (d > bestD) {
      bestD = d;
      cut = i;
    }
  }

  // Start end = the node just after the cut; trace forward the whole loop but
  // for the one hidden edge, so the exit end is the node just before the cut.
  const ctrlStart = 2 * ((cut + 1) % nodeCount);
  const steps = Math.max(1, nodeCount - 1);

  return { strand, chainLen, ctrlStart, steps };
}
