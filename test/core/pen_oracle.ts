import { crossingPenTimes } from "../../src/core/text_graph";
import { NODE_TYPE } from "../../src/core/types";
import type { TangleGraph } from "../../src/core/types";

// K558: the test oracle for pen-order over/under (docs/design/K558.md).
//
// Where the graph alone decides the order, it is read from the graph,
// independently of the builder's pen clock:
// - MAIN/MAIN: both passes on the text's main strand (a loop). The later
//   visit is over (its up-pass under, its down-pass over).
// - LIFTED: a strand whose component (strands joined at non-crossing nodes
//   off the main strand) meets the main strand only at crossings is drawn
//   after the whole body, so it is over any main or spur pass.
// - SPUR AFTER: a component whose earliest non-crossing touch of the main
//   strand comes after a main pass is drawn after that pass (when the pen
//   leaves the touch, or after the body if the builder lifts it), so it
//   is over that pass.
// A component that touches the main strand BEFORE the pass is left to the
// pen times: a touch need not be an attachment (in "Daily #12" a stroke
// of `#` ends on the connector into "1", a junction, and is still a lifted
// stroke), and only the builder knows which touches are.
// Every crossing, those included, is also checked against the builder's
// own pen times (crossingPenTimes): present, more than the tie threshold
// apart, agreeing with overFirst, and marked penOrder. That last check
// alone decides the pairs the graph cannot (two spurs, two lifted strokes,
// whose order is the glyphs' and their stroke clocks').
//
// A crossing that does not have exactly two passes is MALFORMED: listed in
// `malformed`, not in `failures`. Pen order needs two passes, so the builder
// gives it assignOverUnder's fallback (overFirst true, isOver false, no pen
// times), which the oracle checks. Today's one source is "20": the 0's
// loop closes on the connector from the 2, a node where the main strand
// passes and two strands end (a topology residual, not a pen-order one).
//
// `isText` picks the text's crossings (all of them for a standalone word;
// the title's or the cartouche's in a maze scene). The text's main strand
// is the first strand, in index order, through a text node.

export interface PenOracleReport {
  crossings: number; // Text crossings checked.
  mainMain: number; // Decided by the graph: a loop on the main strand.
  lifted: number; // Decided by the graph: a lifted stroke over main or a spur.
  spurMain: number; // Decided by the graph: a spur touching main after the pass.
  penOnly: number; // Decided only by the builder's pen times.
  malformed: string[]; // Crossings without exactly two passes (the fallback).
  failures: string[];
}

const PEN_TIE = 1e-9;

export const ALL_NODES = (): boolean => true;

export function penOracle(
  graph: TangleGraph,
  isText: (id: string) => boolean,
  reverse = false
): PenOracleReport {
  const report: PenOracleReport = {
    crossings: 0,
    mainMain: 0,
    lifted: 0,
    spurMain: 0,
    penOnly: 0,
    malformed: [],
    failures: [],
  };
  // Passes in assignPenOrder's enumeration: strands in index order, a closed
  // strand's repeated start skipped, crossings only.
  const passes = new Map<string, Array<{ strand: number; index: number }>>();
  graph.strands.forEach((s, si) => {
    const count = s.isClosed ? s.nodes.length - 1 : s.nodes.length;
    for (let i = 0; i < count; i++) {
      const id = s.nodes[i];
      if (graph.nodes.get(id)?.type !== NODE_TYPE.CROSSING || !isText(id)) continue;
      const list = passes.get(id);
      if (list) list.push({ strand: si, index: i });
      else passes.set(id, [{ strand: si, index: i }]);
    }
  });

  let main = -1;
  for (let si = 0; si < graph.strands.length && main < 0; si++) {
    if (graph.strands[si].nodes.some((id) => isText(id))) main = si;
  }
  const firstVisit = new Map<string, number>();
  if (main >= 0) {
    graph.strands[main].nodes.forEach((id, i) => {
      if (!firstVisit.has(id)) firstVisit.set(id, i);
    });
  }

  // Components of the other strands, joined at non-crossing nodes off the
  // main strand; each one's earliest non-crossing touch of the main strand.
  const parent = graph.strands.map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const ownerOf = new Map<string, number>();
  graph.strands.forEach((s, si) => {
    if (si === main) return;
    for (const id of s.nodes) {
      if (firstVisit.has(id) || graph.nodes.get(id)?.type === NODE_TYPE.CROSSING) continue;
      const o = ownerOf.get(id);
      if (o === undefined) ownerOf.set(id, si);
      else {
        const ra = find(o);
        const rb = find(si);
        if (ra !== rb) parent[rb] = ra;
      }
    }
  });
  const touchOf = new Map<number, number>();
  graph.strands.forEach((s, si) => {
    if (si === main) return;
    for (const id of s.nodes) {
      const j = firstVisit.get(id);
      if (j === undefined || graph.nodes.get(id)?.type === NODE_TYPE.CROSSING) continue;
      const r = find(si);
      const prev = touchOf.get(r);
      if (prev === undefined || j < prev) touchOf.set(r, j);
    }
  });
  type Kind = { kind: "main"; at: number } | { kind: "spur"; at: number } | { kind: "lifted" };
  const kindOf = (p: { strand: number; index: number }): Kind => {
    if (p.strand === main) return { kind: "main", at: p.index };
    const at = touchOf.get(find(p.strand));
    return at === undefined ? { kind: "lifted" } : { kind: "spur", at };
  };

  for (const [id, list] of passes) {
    const node = graph.nodes.get(id)!;
    report.crossings++;
    const fail = (why: string): void => {
      report.failures.push(`${id}: ${why}`);
    };
    if (node.penOrder !== true) fail("not marked penOrder");
    if (list.length !== 2) {
      report.malformed.push(id);
      if (node.overFirst !== true || node.isOver !== false || crossingPenTimes(node) !== undefined) {
        fail(`${list.length} passes without the fallback`);
      }
      continue;
    }
    const pt = crossingPenTimes(node);
    if (pt === undefined) {
      fail("no pen times");
      continue;
    }
    const gap = pt[0] - pt[1];
    if (!(gap > PEN_TIE || gap < -PEN_TIE)) {
      fail(`equal pen times ${pt[0]} ${pt[1]}`);
      continue;
    }
    if (node.overFirst !== (reverse ? gap < 0 : gap > 0)) {
      fail(`overFirst ${node.overFirst} against pen times ${pt[0]} ${pt[1]}`);
    }
    // The graph's own answer, where it has one: is the FIRST pass the
    // later stroke?
    const a = kindOf(list[0]);
    const b = kindOf(list[1]);
    let firstLater: boolean | null = null;
    if (a.kind === "main" && b.kind === "main") {
      firstLater = a.at > b.at;
      report.mainMain++;
    } else if (a.kind === "lifted" && b.kind !== "lifted") {
      firstLater = true;
      report.lifted++;
    } else if (b.kind === "lifted" && a.kind !== "lifted") {
      firstLater = false;
      report.lifted++;
    } else if (a.kind === "spur" && b.kind === "main" && a.at > b.at) {
      firstLater = true;
      report.spurMain++;
    } else if (a.kind === "main" && b.kind === "spur" && b.at > a.at) {
      firstLater = false;
      report.spurMain++;
    } else {
      report.penOnly++;
    }
    if (firstLater !== null) {
      if (firstLater !== gap > 0) fail(`pen times ${pt[0]} ${pt[1]} against the graph (${a.kind}/${b.kind})`);
      if (node.overFirst !== (reverse ? !firstLater : firstLater)) {
        fail(`overFirst ${node.overFirst} against the graph (${a.kind}/${b.kind})`);
      }
    }
  }
  return report;
}
