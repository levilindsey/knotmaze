import { Container, Graphics } from "pixi.js";
import type { TangleGraph } from "../core/types";
import { NODE_TYPE } from "../core/types";

export class DebugRenderer {
  container: Container;
  cellSize: number = 20;

  constructor() {
    this.container = new Container();
  }

  render(graph: TangleGraph): void {
    this.container.removeChildren();

    // Draw lattice grid.
    const gridGraphics = new Graphics();
    gridGraphics.stroke({ color: 0xcccccc, width: 0.5 });
    const maxSize = Math.max(
      ...Array.from(graph.nodes.values()).map((n) => Math.max(...n.latticePos))
    ) + 1;

    for (let i = 0; i <= maxSize; i++) {
      gridGraphics.moveTo(i * this.cellSize, 0);
      gridGraphics.lineTo(i * this.cellSize, maxSize * this.cellSize);
      gridGraphics.moveTo(0, i * this.cellSize);
      gridGraphics.lineTo(maxSize * this.cellSize, i * this.cellSize);
    }
    this.container.addChild(gridGraphics);

    // Draw edges.
    for (const [_edgeId, edge] of graph.edges) {
      const edgeGraphics = new Graphics();
      edgeGraphics.stroke({ color: 0x666666, width: 1 });

      if (edge.latticePoints.length > 0) {
        const start = edge.latticePoints[0];
        edgeGraphics.moveTo(start[0] * this.cellSize, start[1] * this.cellSize);

        for (let i = 1; i < edge.latticePoints.length; i++) {
          const point = edge.latticePoints[i];
          edgeGraphics.lineTo(
            point[0] * this.cellSize,
            point[1] * this.cellSize
          );
        }
      }
      this.container.addChild(edgeGraphics);
    }

    // Draw nodes.
    for (const [_nodeId, node] of graph.nodes) {
      const nodeGraphics = new Graphics();
      const [x, y] = node.latticePos;
      const px = x * this.cellSize;
      const py = y * this.cellSize;

      let color = 0x000000;
      let radius = 3;

      if (node.type === NODE_TYPE.CROSSING) {
        color = node.isOver ? 0xff6600 : 0x0066ff;
        radius = 5;
      } else if (node.type === NODE_TYPE.JUNCTION) {
        color = 0x00cc00;
        radius = 4;
      } else if (node.type === NODE_TYPE.END) {
        color = 0xff0000;
        radius = 4;
      } else if (node.type === NODE_TYPE.TURN) {
        color = 0xcccccc;
        radius = 2;
      }

      nodeGraphics.circle(px, py, radius);
      nodeGraphics.fill({ color });
      this.container.addChild(nodeGraphics);
    }
  }
}
