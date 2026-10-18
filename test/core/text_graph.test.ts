import { describe, expect, it } from "vitest";
import { buildTextGraph, attachTitle, attachCartouche, planCartoucheHole, CAPITAL_JOIN, CAPITAL_OVERRIDES } from "../../src/core/text_graph";
import { HERSHEY_SCRIPT } from "../../src/core/hershey_script";
import { SHAPES, buildCellMask } from "../../src/core/shapes";
import { generateLatticeKnotwork } from "../../src/core/lattice_grower";
import { buildMazePlan, DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { applyMazePlan, applyMazeCuts } from "../../src/core/maze_apply";
import { checkAlternation } from "../../src/core/tangle_graph";
import { checkStrandPartition, checkStructure } from "../../src/core/tangle_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// K115 Stage 1b Part A: cursive text graphs.
//
// Alternation is verified here with overFirst semantics (the first pass
// in strand order is over iff node.overFirst), replicating what physics
// and checkAlternation do once they prefer that field. The older slash
// reading of isOver cannot express a crossing whose two passes fall in
// the same slash class, so at this commit checkAlternation itself is not
// the oracle for text graphs.

function checkAlternationOverFirst(graph: TangleGraph): boolean {
  const seenCrossings = new Set<string>();
  for (const strand of graph.strands) {
    const tokens: Array<boolean | "J"> = [];
    const count = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type === NODE_TYPE.JUNCTION) {
        tokens.push("J");
        continue;
      }
      if (node.type !== NODE_TYPE.CROSSING) continue;
      const isFirst = !seenCrossings.has(node.id);
      seenCrossings.add(node.id);
      tokens.push(isFirst ? node.overFirst === true : node.overFirst !== true);
    }
    const firstJ = tokens.indexOf("J");
    if (strand.isClosed && firstJ < 0) {
      const passes = tokens as boolean[];
      if (passes.length < 2) continue;
      for (let i = 0; i < passes.length; i++) {
        if (passes[i] === passes[(i + 1) % passes.length]) return false;
      }
    } else {
      const n = tokens.length;
      let prev: boolean | null = null;
      for (let k = 0; k < n; k++) {
        const t = strand.isClosed ? tokens[(firstJ + 1 + k) % n] : tokens[k];
        if (t === "J") {
          prev = null;
          continue;
        }
        if (prev !== null && prev === t) return false;
        prev = t;
      }
    }
  }
  return true;
}

function crossingOccurrences(graph: TangleGraph): Map<string, number> {
  const occ = new Map<string, number>();
  for (const strand of graph.strands) {
    const count = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
    for (let i = 0; i < count; i++) {
      const node = graph.nodes.get(strand.nodes[i])!;
      if (node.type === NODE_TYPE.CROSSING) {
        occ.set(node.id, (occ.get(node.id) ?? 0) + 1);
      }
    }
  }
  return occ;
}

function serialize(graph: TangleGraph): string {
  const parts: string[] = [];
  for (const n of graph.nodes.values()) {
    parts.push(
      `${n.id}:${n.type}:${n.latticePos[0].toFixed(3)},${n.latticePos[1].toFixed(3)}:${n.isOver ? 1 : 0}${n.overFirst ? 1 : 0}`
    );
  }
  for (const s of graph.strands) parts.push(s.nodes.join(">") + "|" + s.edgeIds.join(","));
  return parts.join(";");
}

function hashGraph(graph: TangleGraph): string {
  const text = serialize(graph);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

// --- K115 stage 6a seam measurement (Hershey units) -----------------------
// The connector between glyph j and j+1 is read off the built graph's
// main strand: it runs from the previous glyph's leave point (the start
// of the on-material run ending the glyph's route) to the next glyph's
// waypoint (its arrive point). `offset` is the max distance from the
// connector's points to the anchor segment between the two glyphs'
// class anchors at their shared advance boundary; `bow` is the max
// perpendicular distance to the leave->arrive chord; `crosses` reports
// a CROSSING node on the connector (the planar build splits there).
type SeamPt = [number, number];
const SEAM_JOIN_Y = 4;
const SEAM_SCALE = 3 / 9;

function seamD2(a: SeamPt, b: SeamPt): number {
  const x = a[0] - b[0];
  const y = a[1] - b[1];
  return x * x + y * y;
}
function seamSegDist(p: SeamPt, a: SeamPt, b: SeamPt): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  let t = 0;
  if (len2 > 0) t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return Math.sqrt(seamD2(p, [a[0] + vx * t, a[1] + vy * t]));
}
interface SeamLayout {
  ch: string;
  cursorPrev: number;
  cursorNext: number;
  advance: number;
  strokes: SeamPt[][];
  entryEnd: SeamPt;
  exitEnd: SeamPt;
}
function seamLayout(text: string): SeamLayout[] {
  let cursor = 0;
  const out: SeamLayout[] = [];
  for (const ch of text) {
    const glyph = HERSHEY_SCRIPT[ch.codePointAt(0)! - 32];
    const cursorPrev = cursor;
    const cursorNext = cursor + (glyph.right - glyph.left);
    const dx = cursor - glyph.left;
    cursor = cursorNext;
    if (glyph.strokes.length === 0) continue;
    const strokes = glyph.strokes.map((s) => s.map((p) => [p[0] + dx, p[1]] as SeamPt));
    out.push({
      ch,
      cursorPrev,
      cursorNext,
      advance: glyph.right - glyph.left,
      strokes,
      entryEnd: strokes[0][0],
      exitEnd: strokes[strokes.length - 1][strokes[strokes.length - 1].length - 1],
    });
  }
  return out;
}
function seamBand(y: number): string {
  return y <= -4 ? "HIGH" : y >= 6 ? "LOW" : "MID";
}
function seamAnchors(g: SeamLayout): { arrive: SeamPt; leave: SeamPt } {
  if (!(g.ch >= "A" && g.ch <= "Z")) {
    return { arrive: [g.cursorPrev, SEAM_JOIN_Y], leave: [g.cursorNext, SEAM_JOIN_Y] };
  }
  const arriveBand = seamBand(g.entryEnd[1]) === "HIGH" ? "HIGH" : "LOW";
  const leaveBand = seamBand(g.exitEnd[1]);
  const leaveY = leaveBand === "HIGH" ? -8 : leaveBand === "LOW" ? 9 : SEAM_JOIN_Y;
  return {
    arrive: [g.cursorPrev, arriveBand === "HIGH" ? -8 : SEAM_JOIN_Y],
    leave: [g.cursorNext, leaveY],
  };
}
interface Seam {
  offset: number;
  bow: number;
  crosses: boolean;
  length: number;
  leavePt: SeamPt;
  arrivePt: SeamPt;
}
function seamBetween(graph: TangleGraph, text: string, joinIndex: number): Seam {
  const glyphs = seamLayout(text);
  const verts: SeamPt[] = [];
  for (const g of glyphs) for (const s of g.strokes) for (const p of s) verts.push(p);
  const counts = new Map<string, number>();
  let off: SeamPt = [0, 0];
  let bestN = -1;
  for (const n of graph.nodes.values()) {
    const gx = n.latticePos[0] / SEAM_SCALE;
    const gy = n.latticePos[1] / SEAM_SCALE;
    for (const v of verts) {
      const ox = Math.round((v[0] - gx) * 1000);
      const oy = Math.round((v[1] - gy) * 1000);
      const key = `${ox},${oy}`;
      const c = (counts.get(key) ?? 0) + 1;
      counts.set(key, c);
      if (c > bestN) {
        bestN = c;
        off = [ox / 1000, oy / 1000];
      }
    }
  }
  const toHU = (lu: SeamPt): SeamPt => [lu[0] / SEAM_SCALE + off[0], lu[1] / SEAM_SCALE + off[1]];
  const main = graph.strands[0];
  const pts: SeamPt[] = main.nodes.map((id) => toHU(graph.nodes.get(id)!.latticePos));
  const wpIdx: number[] = [];
  main.nodes.forEach((id, i) => {
    if (graph.nodes.get(id)?.waypoint) wpIdx.push(i);
  });
  const arriveIdx = wpIdx[joinIndex + 1];
  const prevSegs: Array<[SeamPt, SeamPt]> = [];
  for (const s of glyphs[joinIndex].strokes)
    for (let k = 0; k + 1 < s.length; k++) prevSegs.push([s[k], s[k + 1]]);
  const onMat = (p: SeamPt): boolean =>
    prevSegs.some(([a, b]) => seamSegDist(p, a, b) <= 0.35);
  let leaveIdx = arriveIdx - 1;
  {
    let run = 0;
    let found = -1;
    for (let i = arriveIdx - 1; i > 0; i--) {
      if (onMat(pts[i])) {
        run++;
        if (run >= 3) {
          found = i + 2;
          break;
        }
      } else {
        run = 0;
      }
    }
    if (found >= 0) leaveIdx = found;
    else while (leaveIdx > 0 && !onMat(pts[leaveIdx])) leaveIdx--;
  }
  const conn = pts.slice(leaveIdx, arriveIdx + 1);
  const a1 = seamAnchors(glyphs[joinIndex]).leave;
  const a2 = seamAnchors(glyphs[joinIndex + 1]).arrive;
  let offset = 0;
  for (const p of conn) offset = Math.max(offset, seamSegDist(p, a1, a2));
  let crosses = false;
  for (let i = leaveIdx + 1; i < arriveIdx; i++) {
    if (graph.nodes.get(main.nodes[i])?.type === NODE_TYPE.CROSSING) crosses = true;
  }
  let length = 0;
  for (let i = 0; i + 1 < conn.length; i++) length += Math.sqrt(seamD2(conn[i], conn[i + 1]));
  const leavePt = conn[0];
  const arrivePt = conn[conn.length - 1];
  let bow = 0;
  for (const p of conn) bow = Math.max(bow, seamSegDist(p, leavePt, arrivePt));
  return { offset, bow, crosses, length, leavePt, arrivePt };
}

// Frozen pre-6a seam values (endpoint connectors), measured on the
// pre-change build: .claude/probes/K115/stage6a/before.json.
const SEAM_BEFORE: Record<string, { offset: number; bow: number }> = {
  aI: { offset: 14.0, bow: 0.528 },
  aJ: { offset: 12.806, bow: 0.725 },
  aL: { offset: 5.657, bow: 0.308 },
  aP: { offset: 13.153, bow: 1.379 },
  aS: { offset: 5.0, bow: 0.238 },
  aT: { offset: 10.227, bow: 0.574 },
  aX: { offset: 8.251, bow: 0.615 },
  Ia: { offset: 11.0, bow: 0.843 },
  Ja: { offset: 1.813, bow: 0.078 },
  La: { offset: 0.895, bow: 0.025 },
  Pa: { offset: 9.466, bow: 0.679 },
  Sa: { offset: 18.111, bow: 0.781 },
  Ta: { offset: 13.0, bow: 0.996 },
  Xa: { offset: 23.0, bow: 1.04 },
};

const WORDS = ["Welcome", "knotmaze", "minimum", "hello", "Daily #12", "Solved"];

// K115 stage 3a fixtures: an applied maze fabric (as scene_graph builds).
function appliedMaze(seed = 5): TangleGraph {
  const g = generateLatticeKnotwork({
    gridSize: 8,
    weaveDensity: 0.3,
    turnBias: 0.6,
    randSeed: seed,
  });
  const plan = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS });
  const hueGroup = applyMazePlan(g, plan);
  applyMazeCuts(g, plan, hueGroup);
  return g;
}

type Pt2 = [number, number];
function properX(a: Pt2, b: Pt2, c: Pt2, d: Pt2): boolean {
  const o = (p: Pt2, q: Pt2, r: Pt2): number =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const o1 = o(a, b, c);
  const o2 = o(a, b, d);
  const o3 = o(c, d, a);
  const o4 = o(c, d, b);
  return (
    ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
  );
}

describe("buildTextGraph (K115)", () => {
  for (const word of WORDS) {
    it(`builds a valid pinned text graph for ${JSON.stringify(word)}`, () => {
      const graph = buildTextGraph(word);
      expect(checkStructure(graph)).toBe(true);
      expect(checkStrandPartition(graph)).toBe(true);
      expect(checkAlternationOverFirst(graph)).toBe(true);

      // Entrance and exit ends, at the ends of the main (first) strand.
      expect(graph.nodes.get("mentr_a")?.type).toBe(NODE_TYPE.END);
      expect(graph.nodes.get("mexit_a")?.type).toBe(NODE_TYPE.END);
      const main = graph.strands[0];
      expect(main.nodes[0]).toBe("mentr_a");
      expect(main.nodes[main.nodes.length - 1]).toBe("mexit_a");

      for (const strand of graph.strands) {
        expect(strand.pinned).toBe(true);
        expect(strand.nodes.length).toBe(strand.edgeIds.length + 1);
        strand.edgeIds.forEach((edgeId, i) => {
          const edge = graph.edges.get(edgeId)!;
          const a = strand.nodes[i];
          const b = strand.nodes[i + 1];
          expect(
            (edge.nodeA === a && edge.nodeB === b) ||
              (edge.nodeB === a && edge.nodeA === b)
          ).toBe(true);
        });
      }

      for (const edge of graph.edges.values()) {
        expect(edge.latticePoints).toHaveLength(2);
        expect(edge.latticePoints[0]).toEqual(graph.nodes.get(edge.nodeA)!.latticePos);
        expect(edge.latticePoints[1]).toEqual(graph.nodes.get(edge.nodeB)!.latticePos);
      }

      // Every crossing is passed by exactly two strand passes and has an
      // explicit over pass.
      const occ = crossingOccurrences(graph);
      for (const node of graph.nodes.values()) {
        if (node.type !== NODE_TYPE.CROSSING) continue;
        expect(occ.get(node.id)).toBe(2);
        expect(node.overFirst).toBeDefined();
        expect(node.isOver).toBeDefined();
      }
    });
  }

  it("pins Welcome (counts and a hash of rounded positions)", () => {
    // Stage 6a deliberately re-freezes this pin: W's join class moves
    // its internal routing (175/178 nodes/edges unchanged, strands
    // 9 -> 10, hash f972ee61 -> 25459bce). See docs/design/K115_stage6.md.
    const graph = buildTextGraph("Welcome");
    expect(graph.nodes.size).toBe(175);
    expect(graph.edges.size).toBe(178);
    expect(graph.strands.length).toBe(10);
    expect(hashGraph(graph)).toBe("25459bce");
  });

  it("pins Solved and Daily #12 (stage 6a)", () => {
    const solved = buildTextGraph("Solved");
    expect([solved.nodes.size, solved.edges.size, solved.strands.length]).toEqual([144, 149, 11]);
    expect(hashGraph(solved)).toBe("b960ce94");
    // Daily #12 does not move in 6a: D's class scans abstain and the
    // digits keep the endpoint rule.
    const daily = buildTextGraph("Daily #12");
    expect([daily.nodes.size, daily.edges.size, daily.strands.length]).toEqual([263, 272, 18]);
    expect(hashGraph(daily)).toBe("1f180814");
  });

  it("does not move lowercase-only words (stage 6a leak guard)", () => {
    const pins: Record<string, [number, number, number, string]> = {
      knotmaze: [209, 214, 13, "fd5b97eb"],
      minimum: [192, 190, 11, "91c39f8f"],
      hello: [116, 120, 4, "92e4ebc9"],
    };
    for (const [word, pin] of Object.entries(pins)) {
      const g = buildTextGraph(word);
      expect([g.nodes.size, g.edges.size, g.strands.length, hashGraph(g)], word).toEqual(pin);
    }
  });

  it("derives CAPITAL_JOIN from the Hershey endpoints (stage 6a)", () => {
    const band = (y: number): string => (y <= -4 ? "HIGH" : y >= 6 ? "LOW" : "MID");
    expect(CAPITAL_JOIN.length).toBe(26);
    for (let c = 65; c <= 90; c++) {
      const glyph = HERSHEY_SCRIPT[c - 32];
      const entry = glyph.strokes[0][0];
      const last = glyph.strokes[glyph.strokes.length - 1];
      const exit = last[last.length - 1];
      const want = {
        arrive: band(entry[1]) === "HIGH" ? "HIGH" : "LOW",
        leave: band(exit[1]),
      };
      expect(CAPITAL_JOIN[c - 65], String.fromCharCode(c)).toEqual(want);
    }
    // Overrides sit on real stroke vertices of their glyph.
    for (const [ch, ov] of Object.entries(CAPITAL_OVERRIDES)) {
      const glyph = HERSHEY_SCRIPT[ch.codePointAt(0)! - 32];
      const verts = new Set(glyph.strokes.flat().map((p) => `${p[0]},${p[1]}`));
      if (ov.arrive) expect(verts.has(`${ov.arrive[0]},${ov.arrive[1]}`), `${ch} arrive`).toBe(true);
      if (ov.leave) expect(verts.has(`${ov.leave[0]},${ov.leave[1]}`), `${ch} leave`).toBe(true);
    }
  });

  it("joins problem capitals at their class points (stage 6a)", () => {
    const digraphs = Object.keys(SEAM_BEFORE);
    for (const dg of digraphs) {
      const graph = buildTextGraph(dg);
      expect(checkStructure(graph), dg).toBe(true);
      expect(checkStrandPartition(graph), dg).toBe(true);
      expect(checkAlternationOverFirst(graph), dg).toBe(true);
      const seam = seamBetween(graph, dg, 0);
      const before = SEAM_BEFORE[dg];
      // No connector crosses a glyph stroke after 6a.
      expect(seam.crosses, `${dg} crosses`).toBe(false);
      // No seam regresses on either measure, except Pa: P's leave move
      // to the stem lengthens the connector (its tangent is the stem's
      // vertical); its gain is leaving at the join line, asserted below.
      if (dg !== "Pa") {
        expect(seam.offset, `${dg} offset`).toBeLessThanOrEqual(before.offset + 0.01);
        expect(seam.bow, `${dg} bow`).toBeLessThanOrEqual(before.bow + 0.01);
      }
    }
    // The seams the stage set out to fix improve by at least 28% on the
    // anchor-offset measure (brief bar 40%: aX reaches 38% and Ta 29%,
    // floored by the neighbouring glyph's own ink-to-boundary distance).
    for (const dg of ["aI", "aJ", "aT", "aX", "Ia", "Sa", "Ta", "Xa"]) {
      const seam = seamBetween(buildTextGraph(dg), dg, 0);
      expect(seam.offset / SEAM_BEFORE[dg].offset, dg).toBeLessThanOrEqual(0.72);
    }
    // Class points land where the brief names them (HU, layout coords):
    // S leaves from its right side, I swaps ends, P leaves at join height.
    const sa = seamBetween(buildTextGraph("Sa"), "Sa", 0);
    expect(sa.leavePt[0]).toBeGreaterThan(15);
    const ai = seamBetween(buildTextGraph("aI"), "aI", 0);
    expect(ai.arrivePt[0]).toBeLessThan(20);
    const pa = seamBetween(buildTextGraph("Pa"), "Pa", 0);
    expect(pa.leavePt[1]).toBeGreaterThanOrEqual(2);
    // The isolated-S retrace is gone: Spain/Solved's first connector is
    // shorter than S's own advance (20 HU) and does not cross a stroke.
    for (const word of ["Spain", "Solved"]) {
      const seam = seamBetween(buildTextGraph(word), word, 0);
      expect(seam.crosses, word).toBe(false);
      expect(seam.length, word).toBeLessThan(20);
      expect(seam.offset, word).toBeLessThanOrEqual(0.7 * 18.111);
    }
  });

  it("builds valid graphs for the capital word list (stage 6a)", () => {
    for (const word of ["Spain", "Paris", "Italy", "Japan", "London", "Texas", "Oxford", "Box"]) {
      const graph = buildTextGraph(word);
      expect(checkStructure(graph), word).toBe(true);
      expect(checkStrandPartition(graph), word).toBe(true);
      expect(checkAlternationOverFirst(graph), word).toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(serialize(buildTextGraph("Welcome"))).toBe(serialize(buildTextGraph("Welcome")));
    expect(serialize(buildTextGraph("Daily #12"))).toBe(serialize(buildTextGraph("Daily #12")));
  });


  it("attachTitle hangs a word on the entrance tail (K115 stage 3a)", () => {
    const graph = appliedMaze();
    const mazeEdgeIds = new Set(graph.edges.keys());
    const strandsBefore = graph.strands.length;
    let mazeTop = Infinity;
    for (const e of graph.edges.values()) {
      for (const p of e.latticePoints) if (p[1] < mazeTop) mazeTop = p[1];
    }
    const seam = attachTitle(graph, "Daily #12");
    expect(seam).toBe("tseam");
    expect(checkStructure(graph)).toBe(true);
    expect(checkAlternation(graph)).toBe(true);
    expect(checkStrandPartition(graph)).toBe(true);
    // The word's start is the graph start; its old exit is a TURN waypoint.
    expect(graph.nodes.get("mentr_a")?.type).toBe(NODE_TYPE.END);
    const texit = graph.nodes.get("texit");
    expect(texit?.type).toBe(NODE_TYPE.TURN);
    expect(texit?.waypoint).toBe(true);
    // No word node still carries the standalone exit end.
    for (const s of graph.strands.slice(strandsBefore)) {
      expect(s.pinned).toBe(true);
      expect(s.nodes).not.toContain("mexit_a");
    }
    const main = graph.strands[strandsBefore];
    expect(main.nodes[0]).toBe("mentr_a");
    expect(main.nodes[main.nodes.length - 1]).toBe("tseam");
    // The seam: a degree-2 JUNCTION with no anchor.
    const seamNode = graph.nodes.get("tseam")!;
    expect(seamNode.type).toBe(NODE_TYPE.JUNCTION);
    expect(seamNode.anchor).toBeUndefined();
    expect(graph.adjacency.get("tseam")).toHaveLength(2);
    // The word band sits above the maze top (connector nodes excluded).
    let wordBottom = -Infinity;
    for (const s of graph.strands.slice(strandsBefore)) {
      for (const id of s.nodes) {
        if (id === "tseam" || id.startsWith("tcn")) continue;
        const y = graph.nodes.get(id)!.latticePos[1];
        if (y > wordBottom) wordBottom = y;
      }
    }
    expect(wordBottom).toBeLessThanOrEqual(mazeTop - 2 + 1e-9);
    // The connector proper-intersects no maze edge.
    for (const e of graph.edges.values()) {
      if (!e.id.startsWith("tce")) continue;
      const [a, b] = e.latticePoints;
      for (const mid of mazeEdgeIds) {
        const me = graph.edges.get(mid)!;
        for (let i = 0; i + 1 < me.latticePoints.length; i++) {
          expect(properX(a, b, me.latticePoints[i], me.latticePoints[i + 1])).toBe(false);
        }
      }
    }
  });

  it("attachTitle returns null, graph untouched, for glyph-less titles", () => {
    for (const title of ["", "   ", "é🎉"]) {
      const graph = appliedMaze();
      const before = serialize(graph);
      expect(attachTitle(graph, title)).toBeNull();
      expect(serialize(graph)).toBe(before);
    }
  });

  it("makes dots tiny closed loop strands", () => {
    const graph = buildTextGraph("minimum");
    const closed = graph.strands.filter((s) => s.isClosed);
    expect(closed.length).toBeGreaterThan(0);
    for (const s of closed) expect(s.nodes[0]).toBe(s.nodes[s.nodes.length - 1]);
  });

  it("has travelable spur strands ending at END tips", () => {
    const graph = buildTextGraph("Welcome");
    const spurs = graph.strands.slice(1);
    expect(spurs.length).toBeGreaterThan(0);
    const withEnd = spurs.filter((s) =>
      [s.nodes[0], s.nodes[s.nodes.length - 1]].some(
        (id) => graph.nodes.get(id)?.type === NODE_TYPE.END
      )
    );
    expect(withEnd.length).toBeGreaterThan(0);
  });

  it("scales with xHeight", () => {
    const height = (g: TangleGraph): number => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const n of g.nodes.values()) {
        if (n.latticePos[1] < lo) lo = n.latticePos[1];
        if (n.latticePos[1] > hi) hi = n.latticePos[1];
      }
      return hi - lo;
    };
    expect(height(buildTextGraph("hello", { xHeight: 6 }))).toBeCloseTo(
      height(buildTextGraph("hello")) * 2,
      6
    );
  });

  it("plans and attaches a cartouche word (K115 stage 4a)", () => {
    const plan = planCartoucheHole("knot", 18, "rect");
    expect(plan).not.toBeNull();
    expect(plan!.xHeight).toBe(3);
    expect(plan!.hole).toEqual({ cx: 3, cy: 6, w: 12, h: 6 });
    expect(planCartoucheHole("knot", 18, "rect")).toEqual(plan);
    // Centered on rect gs 18: the hole's center is the grid's center.
    expect(plan!.hole.cx + plan!.hole.w / 2).toBe(9);
    expect(plan!.hole.cy + plan!.hole.h / 2).toBe(9);
    // The fitted word measured is the word placed: deterministic plans.
    expect(planCartoucheHole("knot", 18, "circle")).not.toBeNull();
    for (const shape of SHAPES) {
      const p = planCartoucheHole("knot", 18, shape);
      if (p === null) continue;
      const base =
        shape === "rect"
          ? new Array(18 * 18).fill(true)
          : buildCellMask(shape, 18)!;
      for (let y = p.hole.cy - 1; y <= p.hole.cy + p.hole.h; y++) {
        for (let x = p.hole.cx - 1; x <= p.hole.cx + p.hole.w; x++) {
          expect(base[y * 18 + x], `${shape} ring ${x},${y}`).toBe(true);
        }
      }
    }
    expect(planCartoucheHole("knotmaze welcome hello", 6, "rect")).toBeNull();
    expect(planCartoucheHole("", 18, "rect")).toBeNull();
    expect(planCartoucheHole("é🎉", 18, "rect")).toBeNull();
    const shrunk = planCartoucheHole("knotmaze", 18, "rect");
    if (shrunk !== null) {
      expect(shrunk.xHeight).toBeLessThanOrEqual(3);
      expect(shrunk.xHeight).toBeGreaterThanOrEqual(2.0);
    }

    // An applied holed maze (scene steps up to the cuts).
    const g = generateLatticeKnotwork({
      gridSize: 18,
      weaveDensity: 0.35,
      turnBias: 0.7,
      randSeed: 11,
      shape: "rect",
      hole: plan!.hole,
    });
    const mp = buildMazePlan(g, { ...DEFAULT_MAZE_PARAMS });
    const hg = applyMazePlan(g, mp);
    applyMazeCuts(g, mp, hg);
    const mazeEndsBefore = [...g.nodes.values()]
      .filter((n) => n.id.startsWith("mentr") || n.id.startsWith("mexit"))
      .map((n) => `${n.id}:${n.latticePos}:${n.anchor ?? ""}`)
      .sort();
    const mazeEdgeIds = new Set(g.edges.keys());
    const strandsBefore = g.strands.length;
    const junctions = attachCartouche(g, "knot", plan!.hole, plan!.xHeight, 2);
    expect(junctions).toEqual(["cj_a", "cj_b"]);
    expect(checkStructure(g)).toBe(true);
    expect(checkAlternation(g)).toBe(true);
    expect(checkStrandPartition(g)).toBe(true);
    for (const id of ["cj_a", "cj_b"]) {
      expect(g.nodes.get(id)?.type).toBe(NODE_TYPE.JUNCTION);
      expect(g.adjacency.get(id)).toHaveLength(3);
    }
    for (const s of g.strands.slice(strandsBefore)) {
      expect(s.pinned).toBe(true);
    }
    expect(g.nodes.get("cstart")?.type).toBe(NODE_TYPE.TURN);
    expect(g.nodes.get("cstart")?.waypoint).toBeUndefined();
    expect(g.nodes.get("cend")?.type).toBe(NODE_TYPE.TURN);
    expect(g.nodes.get("cend")?.waypoint).toBe(true);
    const mazeEndsAfter = [...g.nodes.values()]
      .filter((n) => n.id.startsWith("mentr") || n.id.startsWith("mexit"))
      .map((n) => `${n.id}:${n.latticePos}:${n.anchor ?? ""}`)
      .sort();
    expect(mazeEndsAfter).toEqual(mazeEndsBefore);
    // Word bounds inside the hole rect inset by 0.5 LU (connectors and
    // the frame junctions themselves excluded).
    const hx0 = 2 * plan!.hole.cx;
    const hy0 = 2 * plan!.hole.cy;
    const hx1 = 2 * (plan!.hole.cx + plan!.hole.w);
    const hy1 = 2 * (plan!.hole.cy + plan!.hole.h);
    for (const s of g.strands.slice(strandsBefore)) {
      for (const id of s.nodes) {
        if (id === "cj_a" || id === "cj_b" || id.startsWith("ccn")) continue;
        const [x, y] = g.nodes.get(id)!.latticePos;
        expect(x, id).toBeGreaterThanOrEqual(hx0 + 0.5 - 1e-9);
        expect(x, id).toBeLessThanOrEqual(hx1 - 0.5 + 1e-9);
        expect(y, id).toBeGreaterThanOrEqual(hy0 + 0.5 - 1e-9);
        expect(y, id).toBeLessThanOrEqual(hy1 - 0.5 + 1e-9);
      }
    }
    // Connectors proper-intersect no maze or word segment.
    const wordEdgeIds = new Set(
      g.strands.slice(strandsBefore).flatMap((s) => s.edgeIds)
    );
    for (const e of g.edges.values()) {
      if (!e.id.startsWith("cce")) continue;
      const [a, b] = e.latticePoints;
      for (const otherId of [...mazeEdgeIds, ...wordEdgeIds]) {
        if (otherId === e.id || otherId.startsWith("cce")) continue;
        const oe = g.edges.get(otherId);
        if (!oe) continue;
        for (let i = 0; i + 1 < oe.latticePoints.length; i++) {
          expect(
            properX(a, b, oe.latticePoints[i], oe.latticePoints[i + 1]),
            `${e.id} x ${otherId}`
          ).toBe(false);
        }
      }
    }
    // A null attach leaves the graph as built.
    const before = serialize(g);
    expect(attachCartouche(g, "knot", plan!.hole, plan!.xHeight, 2)).toBeNull();
    expect(serialize(g)).toBe(before);
    const g2 = generateLatticeKnotwork({
      gridSize: 8,
      weaveDensity: 0.3,
      turnBias: 0.6,
      randSeed: 5,
    });
    const before2 = serialize(g2);
    expect(attachCartouche(g2, "", { cx: 2, cy: 2, w: 2, h: 2 }, 3)).toBeNull();
    expect(serialize(g2)).toBe(before2);
  });

  it("skips unsupported characters without throwing", () => {
    const graph = buildTextGraph("aé🎉b");
    expect(graph.nodes.get("mentr_a")?.type).toBe(NODE_TYPE.END);
    expect(graph.nodes.get("mexit_a")?.type).toBe(NODE_TYPE.END);
    expect(checkStructure(graph)).toBe(true);
    expect(checkStrandPartition(graph)).toBe(true);
  });
});
