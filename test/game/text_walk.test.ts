import { describe, it, expect } from "vitest";
import { buildTextGraph } from "../../src/core/text_graph";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { FabricMazeController } from "../../src/game/fabric_controller";

// K115 stage 2: the standalone word is walkable. Waypoints (one per
// letter, at each glyph's lead-in join point, plus mexit_a) are walk
// vertices even at degree 2, so scripted taps write the word letter by
// letter; spur junctions still offer their dead ends.

function textWalk(word: string): { g: TangleGraph; walk: WalkGraph } {
  const g = buildTextGraph(word);
  const walk = buildWalkGraph(g);
  expect(walk, `walk graph for ${JSON.stringify(word)}`).not.toBeNull();
  return { g, walk: walk! };
}

// Waypoint node ids in reading order (main-strand order), exit last.
function waypointsOf(g: TangleGraph): string[] {
  return g.strands[0].nodes.filter((id) => g.nodes.get(id)?.waypoint === true);
}

// The next run on a shortest path (fabric_controller.test.ts idiom).
function bestChoice(c: FabricMazeController): number {
  let best = -1;
  let bestCost = Infinity;
  for (const eid of c.choices()) {
    const e = c.walk.edges[eid];
    const far = e.va === c.head ? e.vb : e.va;
    const cost = e.length + (c.walk.distToExit.get(far) ?? Infinity);
    if (cost < bestCost) {
      bestCost = cost;
      best = eid;
    }
  }
  return best;
}

// Walk-edge ids of a fewest-runs route from `from` to `to` (BFS).
function routeTo(w: WalkGraph, from: string, to: string): number[] {
  const prev = new Map<string, [string, number]>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const v = queue.shift()!;
    if (v === to) break;
    for (const eid of w.vertices.get(v)!.edges) {
      const e = w.edges[eid];
      const u = e.va === v ? e.vb : e.va;
      if (seen.has(u)) continue;
      seen.add(u);
      prev.set(u, [v, eid]);
      queue.push(u);
    }
  }
  const out: number[] = [];
  for (let v = to; v !== from; ) {
    const [p, eid] = prev.get(v)!;
    out.unshift(eid);
    v = p;
  }
  return out;
}

describe("text waypoints (K115 stage 2)", () => {
  it("flags one waypoint per letter plus the exit, in reading order", () => {
    for (const word of ["Welcome", "Solved", "hello", "minimum"]) {
      const { g } = textWalk(word);
      const wps = waypointsOf(g);
      expect(wps.length, word).toBe([...word].length + 1);
      expect(wps[wps.length - 1]).toBe("mexit_a");
      expect(g.nodes.get("mexit_a")?.waypoint).toBe(true);
      // The entrance tail itself is the start vertex, not a waypoint.
      expect(g.nodes.get("mentr_a")?.waypoint).toBeUndefined();
      // Reading order along the word: x never goes back (HU layout).
      const xs = wps.map((id) => g.nodes.get(id)!.latticePos[0]);
      for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    }
  });

  it("makes every waypoint a walk vertex; degree-2 ones never branch", () => {
    const { g, walk } = textWalk("Welcome");
    expect(walk.start).toBe("mentr_a");
    expect(walk.exit).toBe("mexit_a");
    const wps = waypointsOf(g);
    for (const id of wps) {
      const v = walk.vertices.get(id);
      expect(v, `vertex ${id}`).toBeDefined();
      const node = g.nodes.get(id)!;
      if (node.type === NODE_TYPE.TURN) {
        // A plain letter boundary: exactly its two path neighbours.
        expect(v!.edges.length, id).toBe(2);
      } else if (node.type === NODE_TYPE.END) {
        expect(id).toBe("mexit_a");
        expect(v!.edges.length).toBe(1);
      } else {
        // A merge-class boundary coincides with its spur junction: the
        // two main-path neighbours are among the choices.
        expect(node.type).toBe(NODE_TYPE.JUNCTION);
        expect(v!.edges.length).toBeGreaterThanOrEqual(3);
      }
    }
    // Main-path neighbours of each waypoint (consecutive stops on the
    // main strand) are always both offered at it.
    const stops = g.strands[0].nodes.filter((id) => walk.vertices.has(id));
    for (let i = 0; i < wps.length; i++) {
      const at = stops.indexOf(wps[i]);
      const fars = new Set(
        walk.vertices.get(wps[i])!.edges.map((eid) => {
          const e = walk.edges[eid];
          return e.va === wps[i] ? e.vb : e.va;
        })
      );
      if (at > 0) expect(fars.has(stops[at - 1]), wps[i]).toBe(true);
      if (at + 1 < stops.length) expect(fars.has(stops[at + 1]), wps[i]).toBe(true);
    }
  });

  it("walks the letters in order, one waypoint per letter, to a win", () => {
    const { g, walk } = textWalk("Welcome");
    const wps = waypointsOf(g);
    const c = new FabricMazeController(walk);
    expect(c.head).toBe("mentr_a");
    // The first tap writes the first letter.
    const first = c.choices();
    expect(first.length).toBe(1);
    expect(c.tapEdge(first[0])).toBe("advance");
    expect(c.head).toBe(wps[0]);

    const seen: string[] = [c.head];
    let result = "";
    for (let step = 0; step < 200 && !c.solved; step++) {
      result = c.tapEdge(bestChoice(c));
      expect(result).toMatch(/advance|win/);
      if (g.nodes.get(c.head)?.waypoint && seen[seen.length - 1] !== c.head) {
        seen.push(c.head);
      }
    }
    expect(result).toBe("win");
    expect(c.solved).toBe(true);
    expect(c.head).toBe("mexit_a");
    expect(seen).toEqual(wps);
    expect(c.pathLength).toBeCloseTo(walk.optimalLength, 6);
    expect(c.choices()).toEqual([]);
  });

  it("offers a spur dead end at a waypoint junction, and back", () => {
    const { walk } = textWalk("Welcome");
    // A waypoint with a one-run dead-end arm (a merge letter's spur).
    let junction = "";
    let spur = -1;
    for (const v of walk.vertices.values()) {
      for (const eid of v.edges) {
        const e = walk.edges[eid];
        const far = e.va === v.id ? e.vb : e.va;
        const fv = walk.vertices.get(far)!;
        if (fv.isEnd && far !== walk.start && far !== walk.exit) {
          junction = v.id;
          spur = eid;
          break;
        }
      }
      if (spur >= 0) break;
    }
    expect(spur, "a spur arm").toBeGreaterThanOrEqual(0);

    const c = new FabricMazeController(walk);
    for (const eid of routeTo(walk, walk.start, junction)) {
      expect(c.tapEdge(eid)).toMatch(/advance|win/);
    }
    expect(c.head).toBe(junction);
    expect(c.choices()).toContain(spur);
    const tip = walk.edges[spur].va === junction ? walk.edges[spur].vb : walk.edges[spur].va;
    expect(c.tapEdge(spur)).toBe("advance");
    expect(c.head).toBe(tip);
    expect([...c.deadEndTips]).toEqual([tip]);
    // And back again: the same run retracts to the junction.
    expect(c.tapEdge(spur)).toBe("backtrack");
    expect(c.head).toBe(junction);
    expect(c.deadEndTips.size).toBe(1);
  });

  it("leaves lattice mazes untouched: no waypoint is ever set there", () => {
    const g = generateLatticeKnotwork({
      gridSize: 8,
      weaveDensity: 0.3,
      turnBias: 0.6,
      randSeed: 42,
    });
    const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS, deadEndDensity: 0.5 });
    const hueGroup = applyMazePlan(g, plan);
    applyMazeCuts(g, plan, hueGroup);
    for (const n of g.nodes.values()) expect(n.waypoint).toBeUndefined();
    const walk = buildWalkGraph(g)!;
    for (const v of walk.vertices.values()) {
      const t = g.nodes.get(v.id)!.type;
      expect(t === NODE_TYPE.JUNCTION || t === NODE_TYPE.END).toBe(true);
    }
  });
});
