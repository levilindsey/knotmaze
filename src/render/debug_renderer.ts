import { Container, Graphics } from "pixi.js";
import type { TangleGraph } from "../core/types";
import { NODE_TYPE } from "../core/types";

export class DebugRenderer {
  container: Container;
  cellSize: number = 20;

  constructor() {
    this.container = new Container();
  }

  render(graph: TangleGraph, screenWidth?: number, screenHeight?: number): void {
    this.container.removeChildren();

    // Draw the cell grid (primal lines sit at even doubled-lattice coords).
    const gridGraphics = new Graphics();
    const maxSize =
      Math.ceil(
        Math.max(
          ...Array.from(graph.nodes.values()).map((n) =>
            Math.max(...n.latticePos)
          )
        ) / 2
      ) * 2;

    for (let i = 0; i <= maxSize; i += 2) {
      gridGraphics.moveTo(i * this.cellSize, 0);
      gridGraphics.lineTo(i * this.cellSize, maxSize * this.cellSize);
      gridGraphics.moveTo(0, i * this.cellSize);
      gridGraphics.lineTo(maxSize * this.cellSize, i * this.cellSize);
    }
    gridGraphics.stroke({ color: 0x333333, width: 0.5 });
    this.container.addChild(gridGraphics);

    // Draw edges.
    for (const [_edgeId, edge] of graph.edges) {
      const edgeGraphics = new Graphics();

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
      edgeGraphics.stroke({ color: 0x999999, width: 1.5 });
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

      // At crossings, draw a tick along the over diagonal. Lattice "/"
      // renders as screen "\" (y is flipped), but the picture is mirrored
      // consistently, so alternation still reads correctly.
      if (node.type === NODE_TYPE.CROSSING) {
        const t = this.cellSize * 0.35;
        const sy = node.isOver ? 1 : -1;
        nodeGraphics.moveTo(px - t, py - t * sy);
        nodeGraphics.lineTo(px + t, py + t * sy);
        nodeGraphics.stroke({ color: 0xffffff, width: 2 });
      }

      this.container.addChild(nodeGraphics);
    }

    // Center and scale to fit the screen.
    if (screenWidth !== undefined && screenHeight !== undefined) {
      this.fitToScreen(graph, screenWidth, screenHeight);
    }
  }

  private fitToScreen(
    graph: TangleGraph,
    screenWidth: number,
    screenHeight: number
  ): void {
    // Compute lattice-space bounds across nodes and edge paths.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const include = ([x, y]: [number, number]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    for (const node of graph.nodes.values()) {
      include(node.latticePos);
    }
    for (const edge of graph.edges.values()) {
      for (const point of edge.latticePoints) {
        include(point);
      }
    }

    if (!isFinite(minX)) return;

    const contentWidth = (maxX - minX) * this.cellSize;
    const contentHeight = (maxY - minY) * this.cellSize;
    const margin = 40;

    const scale = Math.min(
      (screenWidth - margin * 2) / Math.max(contentWidth, 1),
      (screenHeight - margin * 2) / Math.max(contentHeight, 1)
    );

    this.container.scale.set(scale);
    this.container.position.set(
      (screenWidth - contentWidth * scale) / 2 - minX * this.cellSize * scale,
      (screenHeight - contentHeight * scale) / 2 - minY * this.cellSize * scale
    );
  }
}
