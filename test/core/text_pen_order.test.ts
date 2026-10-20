import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEmblemGraph } from "../../src/core/emblem_graph";
import { EMBLEM_IDS } from "../../src/core/emblem_data";
import { buildSceneGraph } from "../../src/core/scene_graph";
import { buildTextGraph, crossingPenTimes } from "../../src/core/text_graph";
import { checkAlternation } from "../../src/core/tangle_graph";
import type { SceneParams } from "../../src/core/scene_graph";
import { dailyParams, dailyTitle } from "../../src/ui/daily_link";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";
import { ALL_NODES, penOracle } from "./pen_oracle";

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

// The text's crossings in a maze scene: a title's and a cartouche word's
// nodes keep the text builder's ids (`tn<k>`); the maze's are `node_` and
// `mnode_`, the cartouche frame's connectors `ccn`, `cj_` and `c...`.
const TEXT_ID = (id: string): boolean => /^tn\d/.test(id);

function titledDaily(n: number, penReverse = false): TangleGraph {
  return buildSceneGraph({ ...dailyParams(n), title: dailyTitle(n), penReverse } as SceneParams).graph;
}

function cartoucheScene(word: string, penReverse = false): TangleGraph {
  return buildSceneGraph({
    ...dailyParams(1),
    title: "",
    cartouche: word,
    seed: 11,
    shape: "rect",
    gridSize: 18,
    penReverse,
  } as SceneParams).graph;
}

// Words and their text crossings today. The glyph source draws l, e and t
// without crossings (a loop closes and a bar meets its stem at a junction;
// K115 stage 8/9 turns those into crossings), so those words check nothing
// until then; the rest carry each kind the oracle reads from the graph.
const WORDS: Array<[string, number]> = [
  ["l", 0],
  ["e", 0],
  ["tt", 0],
  ["little", 0],
  ["Daily #8", 4],
  ["6", 1],
  ["8", 1],
  ["&", 1],
  ["@", 1],
  ["β", 1],
  ["ξενος", 1],
  ["λογος", 1],
];

describe("K558 text crossings follow pen order (the later stroke over)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const reverse of [false, true]) {
    it(`agrees with the pen oracle on every word, penReverse ${reverse}`, () => {
      for (const [word, crossings] of WORDS) {
        const r = penOracle(buildTextGraph(word, { penReverse: reverse }), ALL_NODES, reverse);
        expect(r.crossings, word).toBe(crossings);
        expect(r.failures, word).toEqual([]);
      }
    });
  }

  it("decides from the graph where it can: loops, lifted strokes, spurs after a pass", () => {
    const kinds = (word: string): number[] => {
      const r = penOracle(buildTextGraph(word), ALL_NODES);
      return [r.mainMain, r.lifted, r.spurMain, r.penOnly];
    };
    // 6's loop is its one alternation conflict: the later pass is over.
    expect(kinds("6")).toEqual([1, 0, 0, 0]);
    expect(kinds("8")).toEqual([1, 0, 0, 0]);
    expect(kinds("Daily #8")).toEqual([1, 1, 2, 0]);
    expect(kinds("λογος")).toEqual([0, 1, 0, 0]);
    expect(kinds("ξενος")).toEqual([0, 0, 1, 0]);
    // β's crossing lies between two of its own spurs: the pen times decide.
    expect(kinds("β")).toEqual([0, 0, 0, 1]);
  });

  it("a titled daily and a cartouche word follow pen order too", () => {
    for (const reverse of [false, true]) {
      const titled = penOracle(titledDaily(8, reverse), TEXT_ID, reverse);
      expect(titled.crossings).toBe(4);
      expect(titled.failures).toEqual([]);
      const cart = penOracle(cartoucheScene("knot", reverse), TEXT_ID, reverse);
      expect(cart.crossings).toBe(1);
      expect(cart.failures).toEqual([]);
    }
  });

  it("marks only text crossings penOrder, and never ties", () => {
    const warn = vi.spyOn(console, "warn");
    for (const [word] of WORDS) buildTextGraph(word);
    const graphs = [titledDaily(8), titledDaily(12), cartoucheScene("knot")];
    for (const g of graphs) {
      for (const [id, n] of g.nodes) {
        if (n.penOrder === true) {
          expect(TEXT_ID(id), id).toBe(true);
          expect(n.type).toBe(NODE_TYPE.CROSSING);
        }
        if (TEXT_ID(id) && n.type === NODE_TYPE.CROSSING) expect(n.penOrder, id).toBe(true);
      }
    }
    const k558 = warn.mock.calls.filter((c) => String(c[0]).includes("K558"));
    expect(k558).toEqual([]);
  });

  it("reverse flips every text crossing and nothing else", () => {
    const flips = (a: TangleGraph, b: TangleGraph, isText: (id: string) => boolean): number => {
      let flipped = 0;
      expect([...b.nodes.keys()]).toEqual([...a.nodes.keys()]);
      for (const [id, na] of a.nodes) {
        const nb = b.nodes.get(id)!;
        if (na.type !== NODE_TYPE.CROSSING) continue;
        if (isText(id)) {
          expect(nb.overFirst, id).toBe(!na.overFirst);
          // The pen times are the same; only the comparison turns.
          expect(crossingPenTimes(nb), id).toEqual(crossingPenTimes(na));
          flipped++;
        } else {
          expect([nb.isOver, nb.overFirst], id).toEqual([na.isOver, na.overFirst]);
        }
      }
      return flipped;
    };
    for (const [word, crossings] of WORDS) {
      expect(flips(buildTextGraph(word), buildTextGraph(word, { penReverse: true }), ALL_NODES), word).toBe(crossings);
    }
    expect(flips(titledDaily(8), titledDaily(8, true), TEXT_ID)).toBe(4);
    expect(flips(cartoucheScene("knot"), cartoucheScene("knot", true), TEXT_ID)).toBe(1);
    // The emblems never read the switch: an island scene with it on keeps
    // its frozen pin.
    const s = buildSceneGraph({ ...emblemScene("trefoil", 11, 18), penReverse: true } as SceneParams);
    expect(fnv(crossingBits(s.graph))).toBe("d0d22192");
  });

  it("keeps checkAlternation true, with no warning, on titled dailies 1-30, cartouches and words", () => {
    const warn = vi.spyOn(console, "warn");
    const malformed: string[] = [];
    for (let n = 1; n <= 30; n++) {
      const g = titledDaily(n);
      expect(checkAlternation(g), `daily ${n}`).toBe(true);
      const r = penOracle(g, TEXT_ID);
      expect(r.failures, `daily ${n}`).toEqual([]);
      for (const id of r.malformed) malformed.push(`daily ${n} ${id}`);
    }
    // "Daily #20"'s "20", the one crossing without two passes (next test).
    expect(malformed).toEqual(["daily 20 tn164"]);
    for (const word of ["knot", "maze", "loop"]) {
      for (const reverse of [false, true]) {
        expect(checkAlternation(cartoucheScene(word, reverse)), word).toBe(true);
      }
    }
    for (const [word] of WORDS) {
      for (const reverse of [false, true]) {
        const g = buildSceneGraph({ ...dailyParams(1), text: word, penReverse: reverse } as SceneParams).graph;
        expect(checkAlternation(g), word).toBe(true);
      }
    }
    const bad = warn.mock.calls.filter((c) => /Knot invariants violated|K558/.test(String(c[0])));
    expect(bad).toEqual([]);
  });

  it("leaves a crossing without two passes on the old fallback (\"20\", a topology residual)", () => {
    // The 0's loop closes on the connector from the 2: the main strand
    // passes the node and two strands end there, so there is no pair of
    // passes to order. assignOverUnder gave it the same fallback.
    for (const reverse of [false, true]) {
      const g = buildTextGraph("20", { penReverse: reverse });
      const r = penOracle(g, ALL_NODES, reverse);
      expect(r.malformed).toEqual(["tn31"]);
      expect(r.failures).toEqual([]);
      const node = g.nodes.get("tn31")!;
      expect([node.penOrder, node.overFirst, node.isOver, crossingPenTimes(node)]).toEqual([
        true,
        true,
        false,
        undefined,
      ]);
    }
  });

  it("still fails checkAlternation on a broken maze crossing (the exemption is text-only)", () => {
    const g = titledDaily(3);
    expect(checkAlternation(g)).toBe(true);
    const maze = [...g.nodes.values()].find(
      (n) => n.type === NODE_TYPE.CROSSING && !TEXT_ID(n.id) && n.penOrder !== true
    )!;
    expect(maze).toBeDefined();
    maze.isOver = !maze.isOver;
    if (maze.overFirst !== undefined) maze.overFirst = !maze.overFirst;
    expect(checkAlternation(g)).toBe(false);
  });
});