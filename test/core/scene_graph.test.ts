import { describe, it, expect } from "vitest";
import { buildSceneGraph } from "../../src/core/scene_graph";
import type { SceneParams } from "../../src/core/scene_graph";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { SHAPES } from "../../src/core/shapes";
import { dailyParams, dailyTitle } from "../../src/ui/daily_link";

// K115 stage 3a: titled scenes (the daily title thread).

function scene(n: number, over: Partial<SceneParams> = {}): SceneParams {
  return { ...dailyParams(n), title: dailyTitle(n), ...over };
}

function serialize(g: {
  nodes: Map<string, { id: string; type: string; latticePos: [number, number] }>;
  edges: Map<string, { id: string; nodeA: string; nodeB: string }>;
  strands: Array<{ nodes: string[]; edgeIds: string[] }>;
}): string {
  const parts: string[] = [];
  for (const n of g.nodes.values()) {
    parts.push(`${n.id}:${n.type}:${n.latticePos[0]},${n.latticePos[1]}`);
  }
  for (const e of g.edges.values()) parts.push(`${e.id}:${e.nodeA}>${e.nodeB}`);
  for (const s of g.strands) parts.push(s.nodes.join(">") + "|" + s.edgeIds.join(","));
  return parts.join(";");
}

describe("titled scenes (K115 stage 3a)", () => {
  it("hangs the title on the chosen entrance, keeping exit and optimal", () => {
    const untitled = buildSceneGraph(scene(12, { title: "" }));
    const walk0 = buildWalkGraph(untitled.graph)!;
    const titled = buildSceneGraph(scene(12));
    const w = titled.walk!;
    expect(w).toBeDefined();
    expect(w.start).toBe("mentr_a");
    expect(w.mazeStart).toBe("tseam");
    expect(w.exit).toBe(walk0.exit);
    expect(w.optimalLength).toBeCloseTo(walk0.optimalLength, 9);
    expect(w.titleLength).toBeGreaterThan(0);
    // The seam is the old entrance tail tip.
    const oldTip = untitled.graph.nodes.get(walk0.start)!;
    const seamPos = oldTip.anchor ?? oldTip.latticePos;
    expect(titled.graph.nodes.get("tseam")!.latticePos).toEqual(seamPos);
    // Maze walk edges keep their indices and lengths (title appended).
    expect(w.edges.length).toBeGreaterThan(walk0.edges.length);
    for (let i = 0; i < walk0.edges.length; i++) {
      expect(w.edges[i].length).toBe(walk0.edges[i].length);
      expect(w.edges[i].chain).toBe(walk0.edges[i].chain);
    }
    // One hue slot per appended title strand, all the first one's index.
    const before = untitled.graph.strands.length;
    expect(titled.hueGroup).toHaveLength(titled.graph.strands.length);
    for (let i = before; i < titled.graph.strands.length; i++) {
      expect(titled.hueGroup![i]).toBe(before);
    }
  });

  it("builds the same titled scene twice, bit for bit", () => {
    const a = buildSceneGraph(scene(12));
    const b = buildSceneGraph(scene(12));
    expect(serialize(a.graph)).toBe(serialize(b.graph));
    expect(a.walk!.edges).toEqual(b.walk!.edges);
    expect(a.walk!.optimalLength).toBe(b.walk!.optimalLength);
    expect(a.walk!.titleLength).toBe(b.walk!.titleLength);
  });

  it("titles a small (gs 6) maze and a shaped (heart) maze", () => {
    for (const over of [
      { gridSize: 6 },
      { gridSize: 12, shape: "heart" as const },
    ]) {
      const untitled = buildSceneGraph(scene(5, { title: "", ...over }));
      const walk0 = buildWalkGraph(untitled.graph)!;
      const titled = buildSceneGraph(scene(5, over));
      expect(titled.walk, JSON.stringify(over)).toBeDefined();
      expect(titled.walk!.exit).toBe(walk0.exit);
      expect(titled.walk!.optimalLength).toBeCloseTo(walk0.optimalLength, 9);
      expect(titled.walk!.titleLength).toBeGreaterThan(0);
    }
  });

  it("squeezes Daily #999 into its maze's width", () => {
    const titled = buildSceneGraph(scene(999));
    expect(titled.walk).toBeDefined();
    let x0 = Infinity;
    let x1 = -Infinity;
    for (const n of titled.graph.nodes.values()) {
      if (n.id === "tseam" || n.id.startsWith("m") || n.id.startsWith("tcn")) continue;
      if (n.id !== "mentr_a" && !n.id.startsWith("t")) continue;
      if (n.latticePos[0] < x0) x0 = n.latticePos[0];
      if (n.latticePos[0] > x1) x1 = n.latticePos[0];
    }
    const mazeWidth = 2 * titled.graph.params.gridSize;
    expect(x1 - x0).toBeLessThanOrEqual(mazeWidth + 1e-9);
  });

  // Kill criterion: the connector crosses no maze material (attach
  // returns a seam only then) on any daily 1-30 or shape at gs 6/12/18,
  // and forcing never moves the exit or the maze optimal.
  it(
    "attaches on dailies 1-30 and every shape at gs 6/12/18",
    { timeout: 180000 },
    () => {
      for (let n = 1; n <= 30; n++) {
        const untitled = buildSceneGraph(scene(n, { title: "" }));
        const walk0 = buildWalkGraph(untitled.graph)!;
        const titled = buildSceneGraph(scene(n));
        expect(titled.walk, `daily ${n}`).toBeDefined();
        expect(titled.walk!.exit, `daily ${n}`).toBe(walk0.exit);
        expect(titled.walk!.optimalLength, `daily ${n}`).toBeCloseTo(
          walk0.optimalLength,
          9
        );
      }
      for (const shape of SHAPES) {
        for (const gridSize of [6, 12, 18]) {
          const over = { shape, gridSize, seed: 11512 };
          const untitled = buildSceneGraph(scene(12, { title: "", ...over }));
          const walk0 = buildWalkGraph(untitled.graph)!;
          const titled = buildSceneGraph(scene(12, over));
          expect(titled.walk, `${shape} gs${gridSize}`).toBeDefined();
          expect(titled.walk!.exit, `${shape} gs${gridSize}`).toBe(walk0.exit);
          expect(
            titled.walk!.optimalLength,
            `${shape} gs${gridSize}`
          ).toBeCloseTo(walk0.optimalLength, 9);
        }
      }
    }
  );
});
