import { describe, expect, it } from "vitest";
import { buildSceneGraph } from "../../src/core/scene_graph";
import type { SceneGraph, SceneParams } from "../../src/core/scene_graph";
import { buildWalkGraph } from "../../src/core/walk_graph";
import type { WalkGraph } from "../../src/core/walk_graph";
import { SHAPES } from "../../src/core/shapes";
import { NODE_TYPE } from "../../src/core/types";
import { dailyParams, dailyTitle, sceneTitle } from "../../src/ui/daily_link";
import { walkFingerprint } from "../../src/game/daily_attempt";

// K552: THE TITLE NEVER CHANGES THE MAZE. A daily wears its title thread
// only with the dailyTitleThread flag (off by default), and the maze is
// the same either way: for dailies 1-30 and stage 3a's shape sweep, the
// titled build is the untitled build plus the title's strands. Pinned:
// - the plan's output: every untitled node, edge and strand is in the
//   titled graph unchanged, under its maze name (attachTitle renames the
//   old start to the seam, which becomes a junction, and a leftover
//   mentr_a to mentr_decoy; WalkGraph.mazeNames maps both back), and the
//   title only appends strands and hue groups;
// - the maze-portion walk: the titled walk's runs minus titleEdges are
//   the untitled walk's runs, index for index (ends, chain, controls,
//   lengths), with the same vertices and distances to the exit;
// - untitled start === titled mazeStart, the same exit and optimal;
// - the untitled build is today's daily build: sceneTitle reads "" with
//   the flag at its default, and that is the call made here;
// - one fingerprint for both (the maze form), and the untitled walk's is
//   the one K47 computed, so saved untitled attempts keep restoring.
// The game/ side (attempts, stats, share text) is title_attempt.test.ts.

// K47's walkFingerprint, verbatim (master c24cc97), the byte-identity
// reference for untitled walks.
function k47Fingerprint(walk: WalkGraph): string {
  let h = 0x811c9dc5;
  const add = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    }
  };
  add(`${walk.start}>${walk.exit};`);
  for (const e of walk.edges) {
    add(`${e.va}>${e.vb}:${Math.round(e.length * 1e6)};`);
  }
  const hex = h.toString(16).padStart(8, "0");
  return `w1.${walk.vertices.size}.${walk.edges.length}.${hex}`;
}

interface Case {
  label: string;
  // The design (a daily's, or a sweep variant of Daily #12's).
  design: ReturnType<typeof dailyParams>;
  // The daily whose title the flag would write.
  day: number;
}

function sweepCases(): Case[] {
  const out: Case[] = [];
  for (let n = 1; n <= 30; n++) {
    out.push({ label: `daily ${n}`, design: dailyParams(n), day: n });
  }
  for (const shape of SHAPES) {
    for (const gridSize of [6, 12, 18]) {
      out.push({
        label: `${shape} gs${gridSize}`,
        design: { ...dailyParams(12), shape, gridSize, seed: 11512 },
        day: 12,
      });
    }
  }
  return out;
}

// The scene a page builds for this design, flag off or on (main.ts:
// `{ ...params, title: sceneTitle(daily, params) }`).
function build(c: Case, flag: boolean): SceneGraph {
  const params = { ...c.design, dailyTitleThread: flag };
  const p: SceneParams = { ...params, title: sceneTitle(c.day, params), glyphs2: "" };
  return buildSceneGraph(p);
}

function nodeRow(n: {
  type: string;
  latticePos: [number, number];
  isOver?: boolean;
  overFirst?: boolean;
  waypoint?: boolean;
  anchor?: [number, number];
}): string {
  return JSON.stringify([n.type, n.latticePos, n.isOver, n.overFirst, n.waypoint, n.anchor]);
}

// Graph level: the plan's output graph, unchanged under maze names.
function graphDiffs(U: SceneGraph, T: SceneGraph, tw: WalkGraph, uStart: string): string[] {
  const diffs: string[] = [];
  const toT = new Map<string, string>();
  for (const [t, u] of tw.mazeNames ?? []) toT.set(u, t);
  const tId = (id: string): string => toT.get(id) ?? id;
  const mazeNodesT = new Set<string>();
  for (const [id, n] of U.graph.nodes) {
    const tn = T.graph.nodes.get(tId(id));
    mazeNodesT.add(tId(id));
    if (!tn) {
      diffs.push(`node ${id} missing`);
      continue;
    }
    if (id === uStart) {
      // The seam: the old start END, now the title's junction (anchor
      // dropped, placed where the anchor held it).
      if (tn.type !== NODE_TYPE.JUNCTION) diffs.push(`seam ${id} is ${tn.type}`);
      continue;
    }
    if (nodeRow(tn) !== nodeRow(n)) diffs.push(`node ${id}: ${nodeRow(n)} -> ${nodeRow(tn)}`);
  }
  for (const [id, e] of U.graph.edges) {
    const te = T.graph.edges.get(id);
    if (!te) {
      diffs.push(`edge ${id} missing`);
      continue;
    }
    const a = [tId(e.nodeA), tId(e.nodeB), e.latticePoints];
    const b = [te.nodeA, te.nodeB, te.latticePoints];
    if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`edge ${id} differs`);
  }
  U.graph.strands.forEach((s, i) => {
    const ts = T.graph.strands[i];
    const a = [s.nodes.map(tId), s.edgeIds, s.isClosed, s.pinned, s.decorative];
    const b = ts && [ts.nodes, ts.edgeIds, ts.isClosed, ts.pinned, ts.decorative];
    if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`strand ${i} differs`);
  });
  // Every node the title added lives on the appended strands only.
  T.graph.strands.forEach((s, i) => {
    if (i >= U.graph.strands.length) return;
    for (const id of s.nodes) {
      if (!mazeNodesT.has(id)) diffs.push(`maze strand ${i} holds title node ${id}`);
    }
  });
  const uh = U.hueGroup ?? [];
  const th = (T.hueGroup ?? []).slice(0, uh.length);
  if (JSON.stringify(uh) !== JSON.stringify(th)) diffs.push("hueGroup prefix differs");
  return diffs;
}

// Walk level: the maze portion, index for index, as untitled rows.
function mazePortion(tw: WalkGraph): {
  runs: string[];
  vertices: string[];
  dist: string[];
} {
  const title = tw.titleEdges ?? new Set<number>();
  const titleV = tw.titleVertices ?? new Set<string>();
  const name = (id: string): string => tw.mazeNames?.get(id) ?? id;
  const mazeIndex = new Map<number, number>();
  const runs: string[] = [];
  for (const e of tw.edges) {
    if (title.has(e.id)) continue;
    mazeIndex.set(e.id, runs.length);
    runs.push(`${name(e.va)}>${name(e.vb)} c${e.chain} ${e.ctrlA}-${e.ctrlB} ${e.length}`);
  }
  const vertices: string[] = [];
  const dist: string[] = [];
  for (const [id, v] of tw.vertices) {
    if (titleV.has(id) && id !== tw.mazeStart) continue;
    const edges = v.edges.filter((eid) => !title.has(eid)).map((eid) => mazeIndex.get(eid));
    // The seam's isEnd is the one change by design (END -> JUNCTION).
    const isEnd = id === tw.mazeStart ? "seam" : String(v.isEnd);
    vertices.push(`${name(id)} ${isEnd} c${v.chain}@${v.ctrl} [${edges.join(",")}]`);
    dist.push(`${name(id)} ${tw.distToExit.get(id)}`);
  }
  vertices.sort();
  dist.sort();
  return { runs, vertices, dist };
}

function untitledRows(uw: WalkGraph): { runs: string[]; vertices: string[]; dist: string[] } {
  const runs = uw.edges.map(
    (e) => `${e.va}>${e.vb} c${e.chain} ${e.ctrlA}-${e.ctrlB} ${e.length}`
  );
  const vertices: string[] = [];
  const dist: string[] = [];
  for (const [id, v] of uw.vertices) {
    const isEnd = id === uw.start ? "seam" : String(v.isEnd);
    vertices.push(`${id} ${isEnd} c${v.chain}@${v.ctrl} [${v.edges.join(",")}]`);
    dist.push(`${id} ${uw.distToExit.get(id)}`);
  }
  vertices.sort();
  dist.sort();
  return { runs, vertices, dist };
}

describe("K552 the title never changes the maze", () => {
  it("sceneTitle is off by default (the untitled build is today's daily build)", () => {
    for (let n = 1; n <= 30; n++) {
      expect(dailyParams(n).dailyTitleThread).toBe(false);
      expect(sceneTitle(n, dailyParams(n))).toBe("");
      expect(sceneTitle(n, { dailyTitleThread: true })).toBe(dailyTitle(n));
    }
  });

  it(
    "keeps the plan, the maze walk, start, exit and optimal on dailies 1-30 and every shape at gs 6/12/18",
    { timeout: 240000 },
    () => {
      const failures: string[] = [];
      for (const c of sweepCases()) {
        const U = build(c, false);
        expect(U.walk, c.label).toBeUndefined();
        const uw = buildWalkGraph(U.graph);
        const T = build(c, true);
        const tw = T.walk;
        if (!uw || !tw || tw.mazeStart === undefined) {
          failures.push(`${c.label}: no walk (untitled ${!!uw}, titled ${!!tw})`);
          continue;
        }
        const name = (id: string): string => tw.mazeNames?.get(id) ?? id;
        const where: string[] = [];
        if (name(tw.mazeStart) !== uw.start) where.push(`start ${uw.start} vs ${tw.mazeStart}`);
        if (tw.exit !== uw.exit) where.push(`exit ${uw.exit} vs ${tw.exit}`);
        if (tw.optimalLength !== uw.optimalLength) {
          where.push(`optimal ${uw.optimalLength} vs ${tw.optimalLength}`);
        }
        const tRows = mazePortion(tw);
        const uRows = untitledRows(uw);
        if (JSON.stringify(tRows.runs) !== JSON.stringify(uRows.runs)) {
          const i = tRows.runs.findIndex((r, k) => r !== uRows.runs[k]);
          where.push(`maze runs (#${i}: ${uRows.runs[i]} vs ${tRows.runs[i]}; ${uRows.runs.length} vs ${tRows.runs.length})`);
        }
        if (JSON.stringify(tRows.vertices) !== JSON.stringify(uRows.vertices)) {
          where.push("maze vertices");
        }
        if (JSON.stringify(tRows.dist) !== JSON.stringify(uRows.dist)) where.push("distances");
        where.push(...graphDiffs(U, T, tw, uw.start).slice(0, 5));
        if (walkFingerprint(tw) !== walkFingerprint(uw)) where.push("fingerprint");
        if (walkFingerprint(uw) !== k47Fingerprint(uw)) where.push("untitled fingerprint moved");
        // The title's own runs are not pinned: every daily's holds cycles
        // (glyph waypoints land on cursive crossings), and daily_attempt.ts
        // saves the one walk that matters raw (mazeFormExact).
        if (where.length > 0) failures.push(`${c.label}: ${where.join("; ")}`);
      }
      expect(failures).toEqual([]);
    }
  );
});
