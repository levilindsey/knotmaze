import type {
  TangleGraph,
  GenerationParams,
} from "./types";
import { NODE_TYPE } from "./types";
import {
  createTangleGraph,
  addNode,
  addEdge,
  assignCheckerboardParity,
  traceStrands,
} from "./tangle_graph";
import { ConstantField } from "./param_field";
import { rng } from "../util/random";

interface RunningEnd {
  nodeId: string;
  direction: [number, number]; // Current direction (±45° basis).
}

// Directions on a 45° rotated square lattice (8 cardinal + diagonal).
const DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function generateLatticeKnotwork(
  params: GenerationParams
): TangleGraph {
  const graph = createTangleGraph(params.randSeed, params);

  // Create param fields (for now, all constant).
  const branchRateField = new ConstantField(params.branchRate);
  const mergeRateField = new ConstantField(params.mergeRate);
  const weaveDensityField = new ConstantField(params.weaveDensity);

  const latticeOccupancy = new Set<string>();
  const runningEnds: RunningEnd[] = [];

  // Initialize: create thread starting points on the border.
  for (let i = 0; i < Math.min(params.threadCount, 4); i++) {
    const nodeId = addNode(
      graph,
      NODE_TYPE.END,
      [i, 0]
    );
    runningEnds.push({
      nodeId,
      direction: [1, 0],
    });
    latticeOccupancy.add(`${i},0`);
  }

  let stepCount = 0;
  const maxSteps = params.gridSize * params.gridSize * 10; // Avoid infinite loops.

  while (runningEnds.length > 0 && stepCount < maxSteps) {
    stepCount++;

    // Pick a random running end.
    const endIdx = rng().nextInt(runningEnds.length);
    const end = runningEnds[endIdx];
    const endNode = graph.nodes.get(end.nodeId)!;

    // Evaluate actions at this position.
    const branchProb = branchRateField.evaluate(endNode.latticePos);
    const mergeProb = mergeRateField.evaluate(endNode.latticePos);
    const weaveProb = weaveDensityField.evaluate(endNode.latticePos);

    // Action: extend, branch, merge, cross, or terminate.
    const action = rng().next();
    let nextPos = [
      endNode.latticePos[0] + end.direction[0],
      endNode.latticePos[1] + end.direction[1],
    ] as [number, number];

    // Bounds check.
    if (
      nextPos[0] < 0 ||
      nextPos[0] >= params.gridSize ||
      nextPos[1] < 0 ||
      nextPos[1] >= params.gridSize
    ) {
      // Hit boundary; terminate.
      runningEnds.splice(endIdx, 1);
      continue;
    }

    const nextPosKey = `${nextPos[0]},${nextPos[1]}`;
    const nextPosOccupied = latticeOccupancy.has(nextPosKey);

    // Check for branches/merges/crosses.
    if (!nextPosOccupied) {
      // Empty cell: extend or turn.
      if (action < branchProb && runningEnds.length < params.threadCount + 3) {
        // Branch: create a junction + new end.
        const junctionId = addNode(graph, NODE_TYPE.JUNCTION, endNode.latticePos);
        addEdge(graph, end.nodeId, junctionId, [endNode.latticePos]);
        runningEnds.splice(endIdx, 1);

        // New thread starts from junction.
        const newDirection = rng().nextChoice(DIRECTIONS);
        const newEndId = addNode(graph, NODE_TYPE.END, endNode.latticePos);
        runningEnds.push({
          nodeId: newEndId,
          direction: newDirection,
        });
      } else {
        // Extend.
        const nextNodeId = addNode(graph, NODE_TYPE.TURN, nextPos);
        addEdge(graph, end.nodeId, nextNodeId, [
          endNode.latticePos,
          nextPos,
        ]);

        latticeOccupancy.add(nextPosKey);
        end.nodeId = nextNodeId;

        // Random turn with turn bias.
        if (rng().next() < params.turnBias) {
          end.direction = rng().nextChoice(DIRECTIONS);
        }
      }
    } else if (action < weaveProb) {
      // Crossing: create a crossing node.
      const crossingId = addNode(graph, NODE_TYPE.CROSSING, nextPos);
      addEdge(graph, end.nodeId, crossingId, [
        endNode.latticePos,
        nextPos,
      ]);
      end.nodeId = crossingId;
    } else {
      // Hit occupied cell; terminate or attempt merge.
      if (action < branchProb + mergeProb) {
        // Merge: create a junction and remove this end.
        const junctionId = addNode(graph, NODE_TYPE.JUNCTION, endNode.latticePos);
        addEdge(graph, end.nodeId, junctionId, [endNode.latticePos]);
        runningEnds.splice(endIdx, 1);
      } else {
        // Just terminate.
        runningEnds.splice(endIdx, 1);
      }
    }
  }

  // Convert remaining running ends to closed END nodes.
  for (const end of runningEnds) {
    const node = graph.nodes.get(end.nodeId)!;
    node.type = NODE_TYPE.END;
  }

  // Post-processing: compute strands and assign alternation.
  traceStrands(graph);
  assignCheckerboardParity(graph);

  return graph;
}
