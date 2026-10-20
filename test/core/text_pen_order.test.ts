import { describe, expect, it } from "vitest";
import { buildEmblemGraph } from "../../src/core/emblem_graph";
import { EMBLEM_IDS } from "../../src/core/emblem_data";
import { buildSceneGraph } from "../../src/core/scene_graph";
import type { SceneParams } from "../../src/core/scene_graph";
import { dailyParams, dailyTitle } from "../../src/ui/daily_link";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// K558: cursive text crossings follow pen order (docs/design/K558.md).

function fnv(text: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

// Every crossing's over/under fields, in node-id order.
function crossingBits(graph: TangleGraph): string {
  const parts: string[] = [];
  const ids = [...graph.nodes.keys()].sort();
  for (const id of ids) {
    const n = graph.nodes.get(id)!;
    if (n.type !== NODE_TYPE.CROSSING) continue;
    parts.push(`${id}:${n.isOver === undefined ? "u" : n.isOver ? 1 : 0}${n.overFirst === undefined ? "u" : n.overFirst ? 1 : 0}`);
  }
  return parts.join(";");
}

function emblemScene(emblem: string, seed: number, gridSize: number): SceneParams {
  return {
    ...dailyParams(1),
    title: "",
    cartouche: "",
    cartoucheShape: emblem,
    seed,
    shape: "rect",
    gridSize,
  } as SceneParams;
}

describe("K558 emblems keep assignOverUnder byte for byte", () => {
  it("pins every emblem's crossings (frozen before pen order existed)", () => {
    const parts: string[] = [];
    for (const id of EMBLEM_IDS) parts.push(`${id}=${crossingBits(buildEmblemGraph(id))}`);
    expect(fnv(parts.join("|"))).toBe("44780313");
  });

  it("pins an emblem island scene's crossings, maze and island", () => {
    const s = buildSceneGraph(emblemScene("trefoil", 11, 18));
    expect(crossingBits(s.graph).length).toBeGreaterThan(0);
    expect(fnv(crossingBits(s.graph))).toBe("d0d22192");
  });

  it("pins the maze crossings of titled and cartouche scenes (text excluded)", () => {
    const maze = (g: TangleGraph): TangleGraph => {
      const nodes = new Map([...g.nodes].filter(([id]) => !/^c*tn\d/.test(id)));
      return { ...g, nodes };
    };
    const titled = buildSceneGraph({ ...dailyParams(8), title: dailyTitle(8) });
    const cart = buildSceneGraph({
      ...dailyParams(1),
      title: "",
      cartouche: "knot",
      seed: 11,
      shape: "rect",
      gridSize: 18,
    } as SceneParams);
    expect(fnv(crossingBits(maze(titled.graph)))).toBe("35326d33");
    expect(fnv(crossingBits(maze(cart.graph)))).toBe("679fff0f");
  });
});
