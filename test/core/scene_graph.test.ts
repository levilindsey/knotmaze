import { describe, it, expect } from "vitest";
import { buildSceneGraph } from "../../src/core/scene_graph";
import type { SceneParams } from "../../src/core/scene_graph";
import { buildWalkGraph } from "../../src/core/walk_graph";
import { SHAPES, planAnchors } from "../../src/core/shapes";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { planCartoucheHole } from "../../src/core/text_graph";
import { walkDistances } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { dailyParams, dailyTitle } from "../../src/ui/daily_link";
import { buildEmblemGraph } from "../../src/core/emblem_graph";


// K115 stage 3a: titled scenes (the daily title thread).

function scene(n: number, over: Partial<SceneParams> = {}): SceneParams {
  return { ...dailyParams(n), title: dailyTitle(n), ...over };
}

function hashText(text: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
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

describe("cartouche scenes (K115 stage 4a)", () => {
  function cartoucheScene(
    word: string,
    seed: number,
    shape: SceneParams["shape"],
    gridSize: number
  ): SceneParams {
    return {
      ...dailyParams(1),
      title: "",
      cartouche: word,
      seed,
      shape,
      gridSize,
    } as SceneParams;
  }

  // The frame alone (holed maze, no word): scene steps up to the cuts.
  function frameWalk(base: SceneParams): WalkGraph | null {
    const plan = planCartoucheHole(base.cartouche, base.gridSize, base.shape);
    if (plan === null) {
      return buildWalkGraph(
        buildSceneGraph({ ...base, cartouche: "" }).graph
      );
    }
    const g = generateLatticeKnotwork({
      gridSize: base.gridSize,
      weaveDensity: base.weaveDensity,
      turnBias: base.turnBias,
      randSeed: base.seed,
      shape: base.shape,
      hole: plan.hole,
    });
    const mp = buildMazePlan(g, {
      ...DEFAULT_MAZE_PARAMS,
      branchDensity: base.branchDensity,
      fourWayFraction: base.fourWayFraction,
      deadEndDensity: base.deadEndDensity,
      deadEndLength: base.deadEndLength,
      hCutShare: base.hCutShare,
      exitCorridor: base.exitCorridor,
      exitFlank: base.exitFlank,
      exitTaperRadius: base.exitTaperRadius,
      exitTaperStrength: base.exitTaperStrength,
      entranceClearance: base.entranceClearance,
      exitClearance: base.exitClearance,
      junctionSpacing: base.junctionSpacing,
      ...planAnchors(base.shape, base.gridSize, base.startAnchor, base.exitAnchor),
    });
    const hg = applyMazePlan(g, mp);
    applyMazeCuts(g, mp, hg);
    return buildWalkGraph(g);
  }

  it("pins a rect gs 18 cartouche scene (frozen counts + hash)", () => {
    const s = buildSceneGraph(cartoucheScene("knot", 11, "rect", 18));
    expect(s.graph.nodes.size).toBe(919);
    expect(s.graph.edges.size).toBe(1257);
    expect(s.graph.strands.length).toBe(80);
    expect(hashText(serialize(s.graph))).toBe("217408a4");
    expect(s.walk?.start).toBe("mentr_b");
    expect(s.walk?.exit).toBe("mexit_b");
    // One hue slot per appended word strand, all the first one's index.
    expect(s.hueGroup).toHaveLength(s.graph.strands.length);
    const pinnedIdx = s.graph.strands
      .map((st, i) => (st.pinned === true ? i : -1))
      .filter((i) => i >= 0);
    expect(pinnedIdx.length).toBeGreaterThan(0);
    for (const i of pinnedIdx) expect(s.hueGroup![i]).toBe(pinnedIdx[0]);
    const again = buildSceneGraph(cartoucheScene("knot", 11, "rect", 18));
    expect(serialize(again.graph)).toBe(serialize(s.graph));
    expect(again.walk!.edges).toEqual(s.walk!.edges);
  });

  it("keeps title and cartouche as two hue slots, title first", () => {
    const s = buildSceneGraph({
      ...dailyParams(12),
      title: dailyTitle(12),
      cartouche: "knot",
    } as SceneParams);
    expect(s.walk?.start).toBe("mentr_a");
    expect(s.walk?.mazeStart).toBe("tseam");
    expect(s.graph.nodes.has("cj_a")).toBe(true);
    expect(s.hueGroup).toHaveLength(s.graph.strands.length);
  });

  it("ships an ordinary maze when the word refuses (gs 6, long word)", () => {
    const withWord = buildSceneGraph(
      cartoucheScene("knotmaze welcome", 11, "rect", 6)
    );
    const plain = buildSceneGraph(cartoucheScene("", 11, "rect", 6));
    expect(withWord.graph.nodes.has("cj_a")).toBe(false);
    expect(serialize(withWord.graph)).toBe(serialize(plain.graph));
  });

  it(
    "never disconnects start/exit (solvability sweep)",
    { timeout: 180000 },
    () => {
      const cases: Array<[string, number, SceneParams["shape"], number]> = [];
      for (const word of ["knot", "maze"]) {
        for (const seed of [11, 23]) {
          for (const shape of ["rect", "heart", "ring", "circle"] as const) {
            for (const gs of [12, 18]) cases.push([word, seed, shape, gs]);
          }
        }
      }
      for (const shape of SHAPES) cases.push(["knot", 11, shape, 18]);
      for (const [word, seed, shape, gs] of cases) {
        const base = cartoucheScene(word, seed, shape, gs);
        const label = `${word} seed${seed} ${shape} gs${gs}`;
        const plan = planCartoucheHole(word, gs, shape);
        const s = buildSceneGraph(base);
        const attached = s.graph.nodes.has("cj_a");
        // Kill criterion: a planned hole is never left empty.
        expect([label, plan !== null, attached], label).toEqual([
          label,
          plan !== null,
          plan !== null ? true : attached,
        ]);
        if (plan !== null) expect(attached, label).toBe(true);
        const w = s.walk ?? buildWalkGraph(s.graph);
        expect(w, label).not.toBeNull();
        expect(Number.isFinite(w!.optimalLength), label).toBe(true);
        const fw = frameWalk(base);
        expect(fw, label).not.toBeNull();
        expect([label, w!.start, w!.exit], label).toEqual([
          label,
          fw!.start,
          fw!.exit,
        ]);
        // With every word walk edge removed, the frame alone still
        // connects start to exit.
        const keep = s.graph.strands.map((st) => st.pinned !== true);
        const verts = new Map(
          [...w!.vertices].map(([id, v]) => [
            id,
            {
              ...v,
              edges: v.edges.filter((eid) => keep[w!.edges[eid].chain]),
            },
          ])
        );
        const d = walkDistances(verts as never, w!.edges, w!.start);
        expect(
          [label, Number.isFinite(d.get(w!.exit)!)],
          label
        ).toEqual([label, true]);
      }
    }
  );
});

describe("standalone emblem scenes (K115 stage 5a)", () => {
  it("builds the emblem alone, ignoring maze params, with no walk", () => {
    const s = buildSceneGraph(scene(12, { title: "", emblem: "star", gridSize: 6, shape: "heart" }));
    const emblem = buildEmblemGraph("star");
    expect(serialize(s.graph)).toBe(serialize(emblem));
    expect(s.hueGroup).toBeUndefined();
    expect(s.walk).toBeUndefined();
    expect(buildWalkGraph(s.graph)).toBeNull();
    expect(s.graph.nodes.has("mentr_a")).toBe(false);
  });

  it("gives text precedence over emblem", () => {
    const s = buildSceneGraph(scene(12, { title: "", text: "Hi", emblem: "star" }));
    expect(s.graph.nodes.has("mentr_a")).toBe(true);
    const t = buildSceneGraph(scene(12, { title: "", text: "Hi", emblem: "" }));
    expect(serialize(s.graph)).toBe(serialize(t.graph));
  });

  it("builds every emblem standalone twice bit-identically", () => {
    for (const emblem of ["star", "trefoil", "triquetra", "solomon", "wreath"] as const) {
      const a = buildSceneGraph(scene(3, { title: "", emblem }));
      const b = buildSceneGraph(scene(3, { title: "", emblem }));
      expect(serialize(a.graph)).toBe(serialize(b.graph));
    }
  });
});