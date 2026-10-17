// K76 THREAD REVEAL, stage 2b: the gates the reveal puts on crossing gaps,
// marker gaps and junction joints (docs/design/K76_reveal_mode.md 2.3-2.5).
//
// 1. GapMaskTable.setVis: a slot's gap is as strong as its over thread is
//    visible; k = 1 restores the slot exactly as solved, k <= 0 rejects it
//    through texel 0's radii, a GATED slot (intro gate pending, strength < 0)
//    keeps its encoding.
// 2. A CPU census of the joint gate against the model: the renderer's rule
//    (explore_gaps.ts exploreJointShown: every arm solid, vis >= 0.98, at its
//    slot and min(0.25, 0.45 run) ctrl out; a free tip's cap when its thread
//    is solid at the tip) evaluated on explore_view's pieces, on generated
//    mazes, entering and after 2 and 10 moves: every visited junction
//    shows, no unvisited junction shows (its arms fade out to 0 into it),
//    and an END shows exactly when the model shows its thread to the tip.

import { describe, expect, it } from "vitest";
import { GapMaskTable, gapChunkBounds, type GapSlotParams } from "../../src/render/gap_mask";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { buildWalkGraph, type WalkGraph } from "../../src/core/walk_graph";
import { chainVis, exploreView, type ExplorePiece } from "../../src/game/explore_view";
import { protVisScale, pushRampedWindow, uwRampScale } from "../../src/render/ribbon/explore_gaps";

function slotParams(strength: number): GapSlotParams {
  return {
    hOver: 0.25,
    margin: 0.1,
    fade: 0.2,
    strength,
    perp: true,
    arcScale: 1,
    centerArc: 0.5,
    winNeg: -1,
    winPos: 1,
    closed: false,
    totalU: 10,
    tanX: 1,
    tanY: 0,
    selfExcl: 0,
    over: { base: 0, kStart: 0, n: 3, stride: 1, count: 100, closed: false },
    overArcPer: 1,
    overChunks: gapChunkBounds((j) => [PTS[j * 2], PTS[j * 2 + 1]], 3),
    marginScaleNeg: 1,
    marginScalePos: 1,
    fadeScaleNeg: 1,
    fadeScalePos: 1,
    centerX: 0,
    centerY: 0,
    sminK: 0,
    farK: 0,
    protNegA: 0,
    protNegB: 0,
    protPosA: 0,
    protPosB: 0,
    protNeg: null,
    protPos: null,
    protNegCircle: null,
    protPosCircle: null,
  };
}

const PTS = new Float32Array([-1, 0, 0, 0, 1, 0]);

describe("explore gates (K76 2b): the gap gate", () => {
  it("scales a slot's strength by vis, rejects it at 0 and restores it exactly at 1", () => {
    const t = new GapMaskTable(6);
    t.writeSlot(2, slotParams(1));
    const solved = t.readSlot(2);
    expect(solved.header[2]).toBeGreaterThan(0);
    expect(solved.header[3]).toBeGreaterThan(0);
    expect(t.setVis(2, 1)).toBe(false); // As solved: nothing to do.
    expect(t.setVis(2, 0.5)).toBe(true);
    let h = t.readSlot(2).header;
    expect(h[7]).toBe(0.5);
    expect(h[2]).toBe(solved.header[2]);
    expect(h[3]).toBe(solved.header[3]);
    expect(t.setVis(2, 0.5)).toBe(false);
    expect(t.setVis(2, 0)).toBe(true);
    h = t.readSlot(2).header;
    expect(h[2]).toBe(-1);
    expect(h[3]).toBe(-1);
    expect(h[7]).toBe(0);
    expect(t.visOf(2)).toBe(0);
    expect(t.setVis(2, 1)).toBe(true);
    expect(t.readSlot(2)).toEqual(solved);
    // Its neighbors never moved.
    expect(t.readSlot(1).header[2]).toBe(-1);
    expect(t.readSlot(3).header[2]).toBe(-1);
  });

  it("keeps a gated slot's encoding while its over thread shows at all", () => {
    const t = new GapMaskTable(6);
    t.writeSlot(4, slotParams(-3.5)); // Fades in from tShow 2.5.
    const solved = t.readSlot(4);
    t.setVis(4, 0.3);
    expect(t.readSlot(4)).toEqual(solved);
    t.setVis(4, 0);
    expect(t.readSlot(4).header[2]).toBe(-1);
    expect(t.readSlot(4).header[7]).toBe(-3.5);
    t.setVis(4, 1);
    expect(t.readSlot(4)).toEqual(solved);
  });

  it("lets a new solve win over the last factor", () => {
    const t = new GapMaskTable(6);
    t.writeSlot(1, slotParams(1));
    t.setVis(1, 0);
    t.writeSlot(1, slotParams(0.75));
    expect(t.visOf(1)).toBe(1);
    expect(t.readSlot(1).header[7]).toBe(0.75);
    expect(t.readSlot(1).header[2]).toBeGreaterThan(0);
    // A cleared slot stays cleared whatever the factor.
    t.clearSlot(1);
    t.setVis(1, 0.5);
    expect(t.readSlot(1).header[2]).toBe(-1);
    expect(t.readSlot(1).header[7]).toBe(0);
  });
});

describe("explore gates (K430): the under-window ramp", () => {
  it("is the visibility itself, clamped: absent at 0, whole at 1, no step at 0.5", () => {
    expect(uwRampScale(-0.25)).toBe(0);
    expect(uwRampScale(0)).toBe(0);
    expect(uwRampScale(0.25)).toBe(0.25);
    expect(uwRampScale(0.5)).toBe(0.5);
    expect(uwRampScale(0.75)).toBe(0.75);
    expect(uwRampScale(1)).toBe(1);
    expect(uwRampScale(1.5)).toBe(1);
    // Continuous across the old binary threshold.
    expect(uwRampScale(0.5) - uwRampScale(0.4999)).toBeCloseTo(0.0001, 6);
  });

  it("protect's waiver scale is the covered thread's visibility, clamped, with no step at 0.5", () => {
    expect(protVisScale(-0.25)).toBe(0);
    expect(protVisScale(0)).toBe(0);
    expect(protVisScale(0.25)).toBe(0.25);
    expect(protVisScale(0.5)).toBe(0.5);
    expect(protVisScale(0.75)).toBe(0.75);
    expect(protVisScale(1)).toBe(1);
    expect(protVisScale(1.5)).toBe(1);
    expect(protVisScale(0.5) - protVisScale(0.4999)).toBeCloseTo(0.0001, 6);
  });

  it("scales a window's extents toward its center; scale 0 writes no window", () => {
    const out: number[] = [];
    pushRampedWindow(out, 10, 2, 3, uwRampScale(0));
    expect(out).toEqual([]);
    pushRampedWindow(out, 10, 2, 3, uwRampScale(0.5));
    expect(out).toEqual([10, 1, 1.5]);
    pushRampedWindow(out, 20, 4, 1, uwRampScale(1));
    expect(out).toEqual([10, 1, 1.5, 20, 4, 1]);
  });
});

// ---- The joint census ----

interface Maze {
  walk: WalkGraph;
  n: number[]; // Chain ctrl counts.
  closed: boolean[];
}

function mazeFor(seed: number): Maze {
  const g = generateLatticeKnotwork({ gridSize: 8, weaveDensity: 0.3, turnBias: 0.6, randSeed: seed });
  const plan = buildMazePlan(g, DEFAULT_MAZE_PARAMS);
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  const walk = buildWalkGraph(g)!;
  // walk_graph.ts: strand node i sits at chain ctrl 2i, one particle per
  // node occurrence plus one per edge midpoint; open chains stop at the end.
  const n = g.strands.map((s) => (s.isClosed ? 2 * (s.nodes.length - 1) : 2 * s.nodes.length - 1));
  const closed = g.strands.map((s) => s.isClosed);
  return { walk, n, closed };
}

interface Arm {
  chain: number;
  slot: number;
  dir: number;
  run: number;
}

function armsOf(walk: WalkGraph, v: string): Arm[] {
  const out: Arm[] = [];
  for (const e of walk.edges) {
    const run = e.ctrlB - e.ctrlA;
    if (e.va === v) out.push({ chain: e.chain, slot: e.ctrlA, dir: 1, run });
    if (e.vb === v) out.push({ chain: e.chain, slot: e.ctrlB, dir: -1, run });
  }
  return out;
}

// The renderer's joint rule (ribbon/explore_gaps.ts exploreJointShown).
const JOINT_VIS = 0.98;
const JOINT_OUT = 0.25;
function jointShown(m: Maze, pieces: ExplorePiece[], arms: Arm[]): boolean {
  for (const a of arms) {
    const out = Math.max(0, Math.min(JOINT_OUT, 0.45 * a.run));
    for (const t of [0, out]) {
      let c = a.slot + a.dir * t;
      if (!m.closed[a.chain]) c = Math.max(0, Math.min(m.n[a.chain] - 1, c));
      if (chainVis(pieces, a.chain, c, m.n[a.chain], m.closed[a.chain]) < JOINT_VIS) return false;
    }
  }
  return true;
}

// A deterministic walk: from the entrance, `moves` runs, each the
// lowest-id run not yet walked out of the current vertex (else back).
function walkMoves(
  walk: WalkGraph,
  moves: number
): { visited: Map<string, number>; explored: Set<number>; cur: string } {
  const byId = new Map(walk.edges.map((e) => [e.id, e]));
  const visited = new Map<string, number>([[walk.start, 1]]);
  const explored = new Set<number>();
  let cur = walk.start;
  for (let k = 0; k < moves; k++) {
    const ids = walk.vertices.get(cur)!.edges;
    const fresh = ids.filter((id) => !explored.has(id));
    const id = Math.min(...(fresh.length ? fresh : ids));
    const e = byId.get(id)!;
    cur = e.va === cur ? e.vb : e.va;
    explored.add(id);
    visited.set(cur, 1);
  }
  return { visited, explored, cur };
}

describe("explore gates (K76 2b): the joint census on generated mazes", () => {
  const states: [string, (w: WalkGraph) => { visited: Map<string, number>; explored: Set<number> }][] = [
    // The second move's arrival on its first frame: its arms have not grown.
    [
      "arriving (growth 0)",
      (w) => {
        const s = walkMoves(w, 2);
        s.visited.set(s.cur, 0);
        return s;
      },
    ],
    ["at the entrance", (w) => walkMoves(w, 0)],
    ["two moves in", (w) => walkMoves(w, 2)],
    ["ten moves in", (w) => walkMoves(w, 10)],
  ];
  for (const seed of [5, 42, 777]) {
    for (const [name, make] of states) {
      it(`seed ${seed}, ${name}: visited joints show, unvisited ones never do`, () => {
        const m = mazeFor(seed);
        const { visited, explored } = make(m.walk);
        const { pieces } = exploreView({
          walk: m.walk,
          visited,
          explored,
          inflight: null,
          reach: 2.5,
          fade: 1,
          web: 0.6,
        });
        let shownJn = 0;
        let hiddenJn = 0;
        for (const [id, v] of m.walk.vertices) {
          const arms = armsOf(m.walk, id);
          if (v.isEnd) {
            // A free tip: its cap shows when the thread is solid at the tip.
            const a = arms[0];
            const tipVis = chainVis(pieces, a.chain, a.slot, m.n[a.chain], m.closed[a.chain]);
            const e = m.walk.edges.find((x) => x.va === id || x.vb === id)!;
            const far = e.va === id ? e.vb : e.va;
            // Reached (its run walked) or fully grown: solid to the tip.
            if (explored.has(e.id) || visited.get(id) === 1) expect(tipVis).toBe(1);
            if (!visited.has(id) && !visited.has(far)) expect(tipVis).toBe(0);
            continue;
          }
          const shown = jointShown(m, pieces, arms);
          if (visited.has(id)) {
            expect(shown, `visited junction ${id}`).toBe(true);
            shownJn++;
          } else {
            expect(shown, `unvisited junction ${id}`).toBe(false);
            for (const a of arms) {
              const vis = chainVis(pieces, a.chain, a.slot, m.n[a.chain], m.closed[a.chain]);
              expect(vis, `unvisited junction ${id} arm on chain ${a.chain}`).toBeLessThan(0.02);
            }
            hiddenJn++;
          }
        }
        expect(hiddenJn).toBeGreaterThan(0);
        if (name !== "at the entrance") {
          expect(shownJn).toBeGreaterThan(0);
        }
      });
    }
  }
});
