import { describe, it, expect } from "vitest";
import type { WalkEdge, WalkGraph, WalkVertex } from "../../src/core/walk_graph";
import { pulsePath, pulseTree } from "../../src/render/pulse_path";

// K1139 S2 (plan 4.1): the pure lit-tree model on small invented graphs.
// S4: T6 (an arm lit from both ends is one two-ended item) and T7
// (self-loops: one item per loop). The two-ended field itself (kPulseV2:
// the nearer end wins, continuous at the ridge) is pinned on the CPU
// mirror in paint_gameplay.test.ts.

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

  it("a cycle arm keeps the one parent the tree gives it", () => {
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

  // The triangle H-A-B: B's tree arm is e2 (1.5 < 2 through A), so e1
  // (A-B) closes the cycle. Drawn spans differ from the lattice.
  const TRI = graph([
    ["H", "A", 1],
    ["A", "B", 1],
    ["B", "H", 1.5],
  ]);
  const TRI_SPANS = { 0: 1.1, 1: 0.9, 2: 1.4 };

  it("T6 cycles: an arm lit from both ends is one two-ended item; the tree arms stay one-ended", () => {
    const items = pulsePath(TRI, "H", -1, 10, spansOf(TRI_SPANS));
    const e1 = items.find((i) => i.edge === 1)!;
    expect(e1).toMatchObject({ near: "A", far: "B", atA: true, two: true, cont: true, inward: false, inwardB: false });
    expect(e1.dist0).toBeCloseTo(1.1, 9); // A through e0
    expect(e1.dB).toBeCloseTo(1.4, 9); // B through e2, not through A
    for (const eid of [0, 2]) {
      expect(items.find((i) => i.edge === eid)).toMatchObject({ two: false, dB: 0, inwardB: false });
    }
    // The ridge: dA + d = dB + W - d, d = (dB + W - dA) / 2 = 0.6.
    const dR = (e1.dB + e1.span - e1.dist0) / 2;
    expect(dR).toBeCloseTo(0.6, 9);
    expect(e1.dist0 + dR).toBeCloseTo(e1.dB + e1.span - dR, 9);
  });

  it("T6 cycles: the far end must be lit, past its own gate; else the arm stays one-ended", () => {
    // Reach 1.3: A (1) lit, B (1.5) not - e1 lights from A alone.
    const short = pulsePath(TRI, "H", -1, 1.3, spansOf(TRI_SPANS)).find((i) => i.edge === 1)!;
    expect(short).toMatchObject({ near: "A", two: false, cont: false, dB: 0 });
    // B's end of e1 gated (hidden there): one-ended from A.
    const gated = pulsePath(TRI, "H", -1, 10, spansOf(TRI_SPANS), (eid, atA) => !(eid === 1 && !atA));
    expect(gated.find((i) => i.edge === 1)).toMatchObject({ near: "A", two: false, cont: true });
    // A's end gated: spent, as before S4 (it never lights from B).
    const spent = pulsePath(TRI, "H", -1, 10, spansOf(TRI_SPANS), (eid, atA) => !(eid === 1 && atA));
    expect(spent.find((i) => i.edge === 1)).toBeUndefined();
  });

  it("T6 cycles: behind you each end keeps its own direction", () => {
    // Arrived by e0 from A: A's side is behind you, B's ahead; e1 joins
    // the two (crests run A-ward on A's side, away from B on B's).
    const items = pulsePath(TRI, "H", 0, 10, spansOf(TRI_SPANS));
    expect(items.find((i) => i.edge === 1)).toMatchObject({ two: true, inward: true, inwardB: false });
    // A head arm that closes a cycle: two-ended, its A end at you.
    const G = graph([
      ["H", "B", 1],
      ["H", "B", 2.5],
      ["B", "C", 1],
      ["B", "D", 1],
    ]);
    const e1 = pulsePath(G, "H", -1, 10, () => 1).find((i) => i.edge === 1)!;
    expect(e1).toMatchObject({ near: "H", far: "B", two: true, dist0: 0, dB: 1 });
  });

  it("T7 self-loops: one item per loop, two-ended at its junction", () => {
    const G = graph([
      ["H", "J", 1],
      ["J", "J", 3],
      ["J", "E", 1],
      ["H", "F", 1],
      ["H", "H", 2],
    ]);
    const items = pulsePath(G, "H", -1, 10, (eid) => [1.2, 2.8, 1, 1, 1.9][eid]);
    const loops = items.filter((i) => i.edge === 1 || i.edge === 4);
    expect(loops.map((i) => i.edge).sort()).toEqual([1, 4]); // each once
    const j = loops.find((i) => i.edge === 1)!;
    expect(j).toMatchObject({ near: "J", far: "J", atA: true, two: true, cont: true, inward: false, inwardB: false });
    expect(j.dB).toBe(j.dist0);
    expect(j.dist0).toBeCloseTo(1.2, 9);
    // Your own loop: dist0 = dB = 0; arrived by it, both ends inward.
    expect(loops.find((i) => i.edge === 4)).toMatchObject({ near: "H", two: true, dist0: 0, dB: 0 });
    expect(pulsePath(G, "H", 4, 10, () => 1).find((i) => i.edge === 4)).toMatchObject({ two: true, inward: true, inwardB: true });
    // One end gated: one-ended from the other end (from ctrlB: atA false).
    const fromB = pulsePath(G, "H", -1, 10, () => 1, (eid, atA) => !(eid === 1 && atA)).filter((i) => i.edge === 1);
    expect(fromB).toHaveLength(1);
    expect(fromB[0]).toMatchObject({ near: "J", atA: false, two: false, cont: false });
    // Both ends gated: dark.
    expect(pulsePath(G, "H", -1, 10, () => 1, (eid) => eid !== 1).some((i) => i.edge === 1)).toBe(false);
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
      { vertex: "K", aEdge: 4, bEdge: 5, distJ: 3.5, inward: false, bAtA: true, gR: 0, inwardR: false },
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
      { vertex: "Q", aEdge: 1, bEdge: 4, distJ: 2, inward: true, bAtA: true, gR: 0, inwardR: false },
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

  it("T10 cycles (S4): a two-ended arm gets a band at each lit end, after the tree-child bands", () => {
    const G = graph([
      ["H", "A", 1],
      ["A", "B", 1],
      ["B", "H", 1.5],
      ["A", "C", 1],
    ]);
    const { bands } = pulseTree(G, "H", -1, 10, () => 1);
    // At A: e0 into the tree child e3 first, then into the cycle arm e1;
    // at B (e1's far end): from B's own parent e2, at B's distance.
    expect(bands.map((b) => [b.vertex, b.aEdge, b.bEdge, b.distJ, b.bAtA])).toEqual([
      ["A", 0, 3, 1, true],
      ["A", 0, 1, 1, true],
      ["B", 2, 1, 1, false],
    ]);
    // S4b: the cycle arm's bands carry its ridge, (dA + dB + span) / 2,
    // and the other end's direction; the tree child's none.
    expect(bands.map((b) => [b.gR, b.inwardR])).toEqual([
      [0, false],
      [1.5, false],
      [1.5, false],
    ]);
    // Arrived by e2 (B's side runs inward): each end's band names the
    // OTHER end's direction.
    const back = pulseTree(G, "H", 2, 10, () => 1).bands;
    expect(back.map((b) => [b.vertex, b.bEdge, b.inward, b.gR, b.inwardR])).toEqual([
      ["A", 3, false, 0, false],
      ["A", 1, false, 1.5, true],
      ["B", 1, true, 1.5, false],
    ]);
    // A one-ended cycle arm (its far end past the reach) is banded at
    // its near end alone.
    const one = pulseTree(G, "H", -1, 1.3, () => 1).bands;
    expect(one.map((b) => [b.vertex, b.bEdge])).toEqual([
      ["A", 3],
      ["A", 1],
    ]);
  });

  it("T10 self-loops (S4): a loop past your junction gets a band at each lit end", () => {
    const G = graph([
      ["H", "J", 1],
      ["J", "J", 3],
      ["J", "E", 1],
    ]);
    const { bands } = pulseTree(G, "H", -1, 10, () => 1);
    expect(bands.map((b) => [b.vertex, b.aEdge, b.bEdge, b.bAtA])).toEqual([
      ["J", 0, 2, true],
      ["J", 0, 1, true],
      ["J", 0, 1, false],
    ]);
    // S4b: both loop bands carry the loop's ridge (1 + 1 + 1) / 2.
    expect(bands.map((b) => b.gR)).toEqual([0, 1.5, 1.5]);
    // Your own loop: no band (S5).
    const own = pulseTree(graph([["H", "H", 3], ["H", "E", 1]]), "H", -1, 10, () => 1);
    expect(own.bands).toEqual([]);
  });

  it("pulsePath still returns exactly pulseTree's items", () => {
    expect(pulsePath(TREE, "H", -1, 10, spansOf(TREE_SPANS))).toEqual(
      pulseTree(TREE, "H", -1, 10, spansOf(TREE_SPANS)).items
    );
  });
});
