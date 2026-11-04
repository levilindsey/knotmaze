import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { pulsePath, pulseTree } from "../../src/render/pulse_path";

// K1139 S2 (plan 4.1): the pure lit-tree model on small invented graphs.
// T6 (cycles' two-ended form) and T7 (self-loops) are S4's; here a cycle
// arm keeps the one parent the tree gives it.

// A hand-built walk graph from runs [va, vb, lattice length] (the
// route_plan.test.ts helper's shape).
function graph(runs: Array<[string, string, number]>): WalkGraph {
  const vertices = new Map<string, WalkVertex>();
  const edges: WalkEdge[] = [];
  const at = (id: string): WalkVertex => {
    let v = vertices.get(id);
    if (!v) {
      v = { id, isEnd: false, chain: 0, ctrl: 0, edges: [] };
      vertices.set(id, v);
    }
    return v;
  };
  runs.forEach(([va, vb, length], id) => {
    edges.push({ id, va, vb, chain: id, ctrlA: 0, ctrlB: 2, length });
    at(va).edges.push(id);
    if (vb !== va) at(vb).edges.push(id);
  });
  for (const v of vertices.values()) v.isEnd = v.edges.length === 1;
  return { vertices, edges, start: runs[0][0], exit: runs[0][1], optimalLength: 0, distToExit: new Map() };
}

const spansOf =
  (spans: Record<number, number>) =>
  (eid: number): number =>
    spans[eid];

// H's arms: e3 to the end A, e0 to the 4-arm junction J; J on to the
// ends B and C and through K (e4) to the end D (e5). Drawn spans differ
// from the lattice lengths on purpose (e0: 2 lattice, 2.2 drawn).
const TREE = graph([
  ["H", "J", 2],
  ["J", "B", 1],
  ["J", "C", 1],
  ["H", "A", 1],
  ["J", "K", 1],
  ["K", "D", 1],
]);
const TREE_SPANS = { 0: 2.2, 1: 1.1, 2: 0.9, 3: 1.05, 4: 1.3, 5: 0.7 };

describe("pulsePath (K1139 S2, T1-T5/T8/T9)", () => {
  it("T1 distance: dist0 is the sum of drawn spans along the tree path", () => {
    const items = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS));
    const by = new Map(items.map((i) => [i.edge, i]));
    expect(by.get(0)!.dist0).toBe(0);
    expect(by.get(3)!.dist0).toBe(0);
    expect(by.get(1)!.dist0).toBeCloseTo(2.2, 9);
    expect(by.get(2)!.dist0).toBeCloseTo(2.2, 9);
    expect(by.get(4)!.dist0).toBeCloseTo(2.2, 9);
    expect(by.get(5)!.dist0).toBeCloseTo(3.5, 9);
    expect(by.get(1)!.span).toBe(1.1);
  });

  it("T2 continuity: a child's dist0 is its parent's dist0 + span", () => {
    const items = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS));
    const by = new Map(items.map((i) => [i.edge, i]));
    for (const it of items) {
      if (it.parent < 0) continue;
      const p = by.get(it.parent)!;
      expect(Math.abs(it.dist0 - (p.dist0 + p.span))).toBeLessThanOrEqual(1e-3);
    }
    // The 4-arm junction J: three children start where e0 ended.
    for (const eid of [1, 2, 4]) expect(by.get(eid)!.parent).toBe(0);
    expect(by.get(5)!.parent).toBe(4);
  });

  it("T3 carry-through: cont exactly on arms ending at a junction inside the reach", () => {
    const items = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS));
    const cont = new Map(items.map((i) => [i.edge, i.cont]));
    expect(cont.get(0)).toBe(true); // your choice into J carries on
    expect(cont.get(4)).toBe(true); // J -> K carries on
    expect(cont.get(3)).toBe(false); // dead end A
    expect(cont.get(1)).toBe(false);
    expect(cont.get(2)).toBe(false);
    expect(cont.get(5)).toBe(false);
  });

  it("T8 reach: nothing past the reach; a cut arm carries no cont", () => {
    const cut = pulsePath(TREE, "H", -1, 2.5, spansOf(TREE_SPANS));
    expect(cut.map((i) => i.edge).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(cut.find((i) => i.edge === 4)!.cont).toBe(false); // K is past it
    expect(cut.find((i) => i.edge === 0)!.cont).toBe(true); // J is inside it
    const tight = pulsePath(TREE, "H", -1, 1.5, spansOf(TREE_SPANS));
    expect(tight.map((i) => i.edge).sort()).toEqual([0, 3]);
    expect(tight.find((i) => i.edge === 0)!.cont).toBe(false);
  });

  it("T4 direction: behind you runs inward, the rest outward", () => {
    // You came from P by e0; P's other arms and their children are the
    // back region. X is your way on.
    const G = graph([
      ["P", "H", 2],
      ["P", "Q", 1],
      ["P", "R", 1],
      ["H", "X", 1],
      ["Q", "S", 1],
    ]);
    const items = pulsePath(G, "H", 0, 10, () => 1);
    const inward = new Map(items.map((i) => [i.edge, i.inward]));
    expect(inward.get(0)).toBe(true); // the arrival itself
    expect(inward.get(1)).toBe(true);
    expect(inward.get(2)).toBe(true);
    expect(inward.get(4)).toBe(true); // beyond P, through Q
    expect(inward.get(3)).toBe(false);
    // One upstream arm per junction but yours: P is reached by e0, Q by e1.
    expect(items.find((i) => i.edge === 1)!.parent).toBe(0);
    expect(items.find((i) => i.edge === 4)!.parent).toBe(1);
    // The back arms' light starts at the previous junction: dist0 is the
    // arrival's drawn span.
    expect(items.find((i) => i.edge === 1)!.dist0).toBe(1);
  });

  it("T5 stability: drawn-span wobble moves dist0, never the parents", () => {
    const a = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS));
    const b = pulsePath(
      TREE,
      "H",
      -1,
      10,
      (eid) => TREE_SPANS[eid as keyof typeof TREE_SPANS] * 1.05
    );
    expect(b.map((i) => [i.edge, i.parent, i.near])).toEqual(
      a.map((i) => [i.edge, i.parent, i.near])
    );
    for (let k = 0; k < a.length; k++) {
      const pathDrawn = a[k].dist0 + a[k].span;
      expect(Math.abs(b[k].dist0 - a[k].dist0)).toBeLessThanOrEqual(0.05 * pathDrawn + 1e-3);
    }
  });

  it("a cycle arm keeps the one parent the tree gives it (S4's two-ended form aside)", () => {
    const G = graph([
      ["H", "A", 1],
      ["A", "B", 1],
      ["B", "H", 1.5],
    ]);
    const items = pulsePath(G, "H", -1, 10, () => 1);
    expect(items.map((i) => i.edge).sort()).toEqual([0, 1, 2]); // each once
    // B is nearer through e2 (1.5) than through A (2): e2 is B's parent
    // arm and is itself lit from H; e1 hangs off A.
    expect(items.find((i) => i.edge === 2)!.near).toBe("H");
    expect(items.find((i) => i.edge === 1)!.parent).toBe(0);
    expect(items.find((i) => i.edge === 1)!.near).toBe("A");
  });

  it("T9 determinism: same input, byte-identical output; sub-1e-3 jitter holds dist0", () => {
    const a = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS));
    const b = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    const jittered = pulsePath(TREE, "H", -1, 10, (eid) => TREE_SPANS[eid as keyof typeof TREE_SPANS] + 0.0002);
    expect(jittered.map((i) => i.dist0)).toEqual(a.map((i) => i.dist0));
  });

  it("a gated beyond-head arm neither lights nor carries light; a blocked arm is barred at the head too", () => {
    const gated = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS), (eid) => eid !== 4);
    expect(gated.map((i) => i.edge).sort()).toEqual([0, 1, 2, 3]);
    const blocked = pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS), undefined, (eid) => eid === 0);
    expect(blocked.map((i) => i.edge)).toEqual([3]);
    expect(pulsePath(TREE, "nowhere", -1, 10, spansOf(TREE_SPANS))).toEqual([]);
  });
});

describe("pulseTree bands (K1139 S3a, T10)", () => {
  it("T10 bands: one band from the parent arm into each tree child", () => {
    const { bands } = pulseTree(TREE, "H", -1, 10, spansOf(TREE_SPANS));
    const at = (v: string) => bands.filter((b) => b.vertex === v);
    // The 4-arm junction J: e0 in, e1/e2/e4 on (3 bands); K: e4 in, e5 on.
    expect(at("J").map((b) => [b.aEdge, b.bEdge, b.inward])).toEqual([
      [0, 1, false],
      [0, 2, false],
      [0, 4, false],
    ]);
    expect(at("K")).toEqual([
      { vertex: "K", aEdge: 4, bEdge: 5, distJ: 3.5, inward: false },
    ]);
    // distJ is where the parent arm ended (its dist0 + span), quantized.
    for (const b of at("J")) expect(b.distJ).toBeCloseTo(2.2, 9);
    // Your own junction gets no band (its hand-off is S5's).
    expect(at("H")).toEqual([]);
  });

  it("T10 behind you: the bands run from each back arm into the arrival-side arm", () => {
    const G = graph([
      ["P", "H", 2],
      ["P", "Q", 1],
      ["P", "R", 1],
      ["H", "X", 1],
      ["Q", "S", 1],
    ]);
    const { bands } = pulseTree(G, "H", 0, 10, () => 1);
    const at = (v: string) => bands.filter((b) => b.vertex === v);
    // At P the head-side arm is the arrival e0; both back arms band into it.
    expect(at("P").map((b) => [b.aEdge, b.bEdge, b.inward, b.distJ])).toEqual([
      [0, 1, true, 1],
      [0, 2, true, 1],
    ]);
    // One junction further back the same rule: e4 bands into e1.
    expect(at("Q")).toEqual([
      { vertex: "Q", aEdge: 1, bEdge: 4, distJ: 2, inward: true },
    ]);
    expect(at("H")).toEqual([]);
  });

  it("T10 reach: a junction whose children the reach cuts holds no band", () => {
    const cut = pulseTree(TREE, "H", -1, 1.5, spansOf(TREE_SPANS));
    expect(cut.bands).toEqual([]); // J's arms are not lit at reach 1.5.
    const mid = pulseTree(TREE, "H", -1, 2.5, spansOf(TREE_SPANS));
    expect(mid.bands.filter((b) => b.vertex === "J").length).toBe(3);
    expect(mid.bands.filter((b) => b.vertex === "K")).toEqual([]); // e5 unlit.
  });

  it("T10 cycles: a non-tree arm gets no band (the two-ended form is S4's)", () => {
    const G = graph([
      ["H", "A", 1],
      ["A", "B", 1],
      ["B", "H", 1.5],
    ]);
    const { bands } = pulseTree(G, "H", -1, 10, () => 1);
    expect(bands).toEqual([]);
  });

  it("pulsePath still returns exactly pulseTree's items", () => {
    expect(pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS))).toEqual(
      pulseTree(TREE, "H", -1, 10, spansOf(TREE_SPANS)).items
    );
  });
});
