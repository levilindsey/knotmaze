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

  // The two ends: the strand nodes nearest opposite corners (min / max of
  // x+y), so start and exit sit far apart (and, later, off opposite edges).
  let aIdx = 0;
  let bIdx = 0;
  let aMin = Infinity;
  let bMax = -Infinity;
  for (let i = 0; i < nodeCount; i++) {
    const p = graph.nodes.get(nodes[i])!.latticePos;
    const s = p[0] + p[1];
    if (s < aMin) {
      aMin = s;
      aIdx = i;
    }
    if (s > bMax) {
      bMax = s;
      bIdx = i;
    }
  }

  // Trace the LONGER of the two arcs between the ends (the more interesting
  // path). Represent it as a forward run of increasing control from the start.
  const fwd = (((bIdx - aIdx) % nodeCount) + nodeCount) % nodeCount;
  let ctrlStart: number;
  let steps: number;
  if (fwd >= nodeCount - fwd) {
    ctrlStart = aIdx * 2;
    steps = fwd;
  } else {
    ctrlStart = bIdx * 2;
    steps = nodeCount - fwd;
  }

  return { strand, chainLen, ctrlStart, steps };
}
