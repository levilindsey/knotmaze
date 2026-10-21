// K115 stage 9: the glyph builder behind the #glyphs2 switch. It lays a
// word out from the authored cubic glyphs (glyph_data.ts) and builds the
// TangleGraph straight from the exact geometry: no planarisation, no
// Hershey path. Hershey stays the path for any text with a character
// outside the set (the caller counts the fallback).
//
// Graph shape (the Hershey builder's conventions, so attachTitle and the
// walk graph read it unchanged):
// - strands[0] is the whole body, mentr_a (lead-in tail) to mexit_a
//   (lead-out tail), passing through every spur JUNCTION;
// - each spur is its own strand, from its junction to its END tip;
// - each float is a decorative strand with two END tips;
// - every strand is pinned; crossings are shared CROSSING nodes on the
//   Bezier; each glyph after the first starts at a `waypoint` (its entry,
//   never a crossing).
// Layer 2 (glyphs doc section 9): nodes at the crossings, ends, junctions,
// waypoints and curvature maxima (R < 1 LU), elsewhere uniform per run at
// <= min(0.5 LU, 0.6 R); each edge carries its mid-arc point (`mid`).
// Pen keys (K558): the body's arc length from mentr_a; a spur as the pen
// leaves its junction (PEN_EPS per GU); floats after the body, glyph by
// glyph, FLOAT_GAP apart. The caller runs assignPenOrder.

import { NODE_TYPE, type Edge, type Node, type Strand, type TangleGraph } from "../types";
import type { CubicPath, Glyph, Pt } from "./glyph_types";
import {
  K_STEPS,
  bezAt,
  bezAtK,
  bezCurvature,
  findCrossings,
  segCount,
  segOf,
  type CrossingHit,
  type SegRef,
} from "./glyph_eval";
import { A_LANDED, FORK_VARIANTS, GLYPHS, LEAD_STEPS, glyphI } from "./glyph_data";
import { knotsToPath } from "./glyph_knots";

export const GU_PER_XH = 72;
const PEN_EPS = 0.00001;
const FLOAT_GAP = 8;
/** A space: the gap between the exit and the next entry, in GU. */
const SPACE_GU = 40;

export interface GlyphBuildOpts {
  xHeight: number;
  /** Fork measurement: the k-th i takes FORK_VARIANTS[k % 6]. */
  forks?: boolean;
  /** Fork measurement: every i takes this FORK_VARIANTS angle. */
  fork?: number;
  /** Stage 9 kill criterion: every a takes the landed J (A_LANDED). */
  aLanded?: boolean;
}

export interface GlyphBuildStats {
  ends: number;
  junctions: number;
  crossings: number;
  spurs: number;
  floats: number;
  /** Crossings whose Newton refinement failed to converge. */
  unconverged: number;
  nodes: number;
}

export interface GlyphBuild {
  graph: TangleGraph;
  edgePen: Map<string, [number, number]>;
  stats: GlyphBuildStats;
}

/** True when every character of `text` is in the glyph set (or a space). */
export function glyphSetCovers(text: string): boolean {
  let any = false;
  for (const ch of text) {
    if (ch === " ") continue;
    if (!GLYPHS.has(ch)) return false;
    any = true;
  }
  return any;
}

// A placed path: GU, y up.
interface PathRec {
  kind: "body" | "spur" | "float";
  path: Pt[];
  /** Spur: the body point index of its junction. */
  junction: number;
  glyph: number;
}

// A point on a path the node chain must pass through.
interface Forced {
  p: number; // seg + t
  kind: "start" | "end" | "junction" | "waypoint" | "crossing" | "kmax";
  id?: string; // shared node id (crossings, junctions)
}

function appendPath(into: Pt[], path: readonly Pt[]): void {
  for (let i = into.length === 0 ? 0 : 1; i < path.length; i++) into.push(path[i]);
}

function place(path: CubicPath, dx: number, dy: number): Pt[] {
  return path.map((p) => [p[0] + dx, p[1] + dy] as Pt);
}

function sameDir(a: Pt, b: Pt): boolean {
  return a[0] * b[1] - a[1] * b[0] === 0 && a[0] * b[0] + a[1] * b[1] > 0;
}

/** A straight run of `steps` primitive steps along `dir`, ending at (or
 *  starting from) `at`. */
function tail(at: Pt, dir: Pt, steps: number, before: boolean): Pt[] {
  const a: Pt = before ? [at[0] - dir[0] * steps, at[1] - dir[1] * steps] : at;
  const b: Pt = before ? at : [at[0] + dir[0] * steps, at[1] + dir[1] * steps];
  const h = Math.max(1, Math.floor(steps / 3));
  return knotsToPath([
    [a[0], a[1], dir[0], dir[1], 0, h],
    [b[0], b[1], dir[0], dir[1], h, 0],
  ]);
}

/** A connector cubic between mismatched tangents (or across a space). */
function connector(a: Pt, da: Pt, b: Pt, db: Pt): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.sqrt(dx * dx + dy * dy);
  const la = Math.sqrt(da[0] * da[0] + da[1] * da[1]);
  const lb = Math.sqrt(db[0] * db[0] + db[1] * db[1]);
  const ha = Math.max(1, Math.round(d / 3 / la));
  const hb = Math.max(1, Math.round(d / 3 / lb));
  return knotsToPath([
    [a[0], a[1], da[0], da[1], 0, ha],
    [b[0], b[1], db[0], db[1], hb, 0],
  ]);
}

// Per path: the dense cumulative arc length (K_STEPS chords per segment).
interface ArcTable {
  path: Pt[];
  cum: Float64Array;
  kappa: Float64Array;
}

function arcTable(path: Pt[]): ArcTable {
  const n = segCount(path);
  const cum = new Float64Array(n * K_STEPS + 1);
  const kappa = new Float64Array(n * K_STEPS + 1);
  let acc = 0;
  let prev: [number, number] | null = null;
  for (let s = 0; s < n; s++) {
    const c = segOf(path, s);
    for (let k = s === 0 ? 0 : 1; k <= K_STEPS; k++) {
      const p = bezAtK(c, k);
      if (prev) {
        const dx = p[0] - prev[0];
        const dy = p[1] - prev[1];
        acc += Math.sqrt(dx * dx + dy * dy);
      }
      const gi = s * K_STEPS + k;
      cum[gi] = acc;
      kappa[gi] = bezCurvature(c, k / K_STEPS);
      prev = p;
    }
  }
  return { path, cum, kappa };
}

function splitP(path: Pt[], p: number): [number, number] {
  const n = segCount(path);
  let seg = Math.floor(p);
  if (seg >= n) seg = n - 1;
  if (seg < 0) seg = 0;
  return [seg, p - seg];
}

function posAtP(path: Pt[], p: number): [number, number] {
  const [seg, t] = splitP(path, p);
  return bezAt(segOf(path, seg), t);
}

function arcAtP(tab: ArcTable, p: number): number {
  const [seg, t] = splitP(tab.path, p);
  const c = segOf(tab.path, seg);
  let k = Math.floor(t * K_STEPS);
  if (k >= K_STEPS) k = K_STEPS - 1;
  const base = bezAtK(c, k);
  const q = bezAt(c, t);
  const dx = q[0] - base[0];
  const dy = q[1] - base[1];
  return tab.cum[seg * K_STEPS + k] + Math.sqrt(dx * dx + dy * dy);
}

function pAtArc(tab: ArcTable, L: number): number {
  const cum = tab.cum;
  let lo = 0;
  let hi = cum.length - 1;
  if (L <= 0) return 0;
  if (L >= cum[hi]) return hi / K_STEPS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= L) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo];
  const f = span > 0 ? (L - cum[lo]) / span : 0;
  return (lo + f) / K_STEPS;
}

function maxKappa(tab: ArcTable, L0: number, L1: number): number {
  let m = 0;
  for (let i = 0; i < tab.cum.length; i++) {
    if (tab.cum[i] < L0 || tab.cum[i] > L1) continue;
    const k = Math.abs(tab.kappa[i]);
    if (k > m) m = k;
  }
  return m;
}

export function buildGlyphGraph(text: string, opts: GlyphBuildOpts): GlyphBuild | null {
  if (!glyphSetCovers(text)) return null;
  const xh = opts.xHeight > 0 ? opts.xHeight : 3;
  const sc = xh / GU_PER_XH;
  const guPerLu = GU_PER_XH / xh;

  // --- Layout (GU, y up). ---
  const body: Pt[] = [];
  const spurs: PathRec[] = [];
  const floats: PathRec[] = [];
  const entryIdx: number[] = []; // body point index of each glyph's entry
  let prevExit: { at: Pt; dir: Pt } | null = null;
  let pendingSpace = false;
  let iCount = 0;
  let glyphNo = 0;
  for (const ch of text) {
    if (ch === " ") {
      pendingSpace = true;
      continue;
    }
    let g: Glyph = GLYPHS.get(ch)!;
    if (ch === "a" && opts.aLanded) g = A_LANDED;
    if (ch === "i" && (opts.forks || opts.fork !== undefined)) {
      const f = opts.fork !== undefined ? FORK_VARIANTS.find((v) => v === opts.fork) : FORK_VARIANTS[iCount % FORK_VARIANTS.length];
      g = glyphI(f ?? 30);
      iCount++;
    }
    let dx: number;
    let dy: number;
    if (!prevExit) {
      dx = 0;
      dy = 0;
      appendPath(body, tail(g.entry.at, g.entry.dir, LEAD_STEPS, true));
    } else if (!pendingSpace && sameDir(prevExit.dir, g.entry.dir)) {
      dx = prevExit.at[0] - g.entry.at[0];
      dy = prevExit.at[1] - g.entry.at[1];
    } else {
      const gap = pendingSpace ? SPACE_GU : SPACE_GU / 2;
      dx = prevExit.at[0] + gap - g.entry.at[0];
      dy = 0;
      const at: Pt = [g.entry.at[0] + dx, g.entry.at[1] + dy];
      appendPath(body, connector(prevExit.at, prevExit.dir, at, g.entry.dir));
    }
    pendingSpace = false;
    const start = body.length - 1;
    entryIdx.push(start);
    appendPath(body, place(g.body, dx, dy));
    for (const s of g.spurs) {
      spurs.push({ kind: "spur", path: place(s.path, dx, dy), junction: start + s.at, glyph: glyphNo });
    }
    for (const f of g.floats) {
      floats.push({ kind: "float", path: place(f, dx, dy), junction: -1, glyph: glyphNo });
    }
    prevExit = {
      at: [g.exit.at[0] + dx, g.exit.at[1] + dy],
      dir: g.exit.dir,
    };
    glyphNo++;
  }
  if (!prevExit) return null;
  appendPath(body, tail(prevExit.at, prevExit.dir, LEAD_STEPS, false));

  const paths: PathRec[] = [
    { kind: "body", path: body, junction: -1, glyph: -1 },
    ...spurs,
    ...floats,
  ];

  // --- Crossings. ---
  const segs: SegRef[] = [];
  paths.forEach((r, pi) => {
    for (let s = 0; s < segCount(r.path); s++) {
      segs.push({ path: pi, seg: s, ctrl: segOf(r.path, s) });
    }
  });
  const skip = (a: SegRef, b: SegRef): boolean => {
    if (a.path === b.path) return Math.abs(a.seg - b.seg) <= 1;
    // A spur's first segment against the body segments at its junction.
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const r = paths[x.path];
      if (r.kind === "spur" && x.seg === 0 && y.path === 0) {
        const js = r.junction / 3;
        if (y.seg === js || y.seg === js - 1) return true;
      }
    }
    return false;
  };
  const rawHits = findCrossings(segs, skip);
  const hits: CrossingHit[] = [];
  for (const h of rawHits) {
    const dup = hits.some(
      (o) =>
        o.a === h.a &&
        o.b === h.b &&
        Math.abs(o.s - h.s) < 1e-6 &&
        Math.abs(o.t - h.t) < 1e-6
    );
    if (!dup) hits.push(h);
  }
  let unconverged = 0;
  for (const h of hits) if (!h.converged) unconverged++;

  // --- Forced points per path. ---
  const forced: Forced[][] = paths.map((r) => [
    { p: 0, kind: "start" as const },
    { p: segCount(r.path), kind: "end" as const },
  ]);
  for (let gi = 1; gi < entryIdx.length; gi++) {
    forced[0].push({ p: entryIdx[gi] / 3, kind: "waypoint" });
  }
  spurs.forEach((s, si) => {
    const id = `tj${si}`;
    forced[0].push({ p: s.junction / 3, kind: "junction", id });
    forced[1 + si][0] = { p: 0, kind: "junction", id };
  });
  hits.forEach((h, hi) => {
    const id = `tx${hi}`;
    forced[h.a.path].push({ p: h.a.seg + h.s, kind: "crossing", id });
    forced[h.b.path].push({ p: h.b.seg + h.t, kind: "crossing", id });
  });

  const tabs = paths.map((r) => arcTable(r.path));
  // Curvature maxima where R < 1 LU.
  paths.forEach((_r, pi) => {
    const tab = tabs[pi];
    const kap = tab.kappa;
    for (let i = 1; i + 1 < kap.length; i++) {
      const k = Math.abs(kap[i]);
      if (k * guPerLu <= 1) continue;
      if (k > Math.abs(kap[i - 1]) && k >= Math.abs(kap[i + 1])) {
        forced[pi].push({ p: i / K_STEPS, kind: "kmax" });
      }
    }
  });

  // --- Node chains. ---
  const nodePos = new Map<string, [number, number]>(); // GU, y up
  const nodeType = new Map<string, Node["type"]>();
  const waypoints = new Set<string>();
  let nextNode = 0;
  const freshId = (): string => `tn${nextNode++}`;
  interface ChainNode {
    id: string;
    arc: number;
  }
  const chains: ChainNode[][] = [];
  const hmax = 0.5 * guPerLu;
  paths.forEach((r, pi) => {
    const tab = tabs[pi];
    const total = tab.cum[tab.cum.length - 1];
    const minSep = 0.2 * Math.min(hmax, 6);
    const fs = forced[pi]
      .map((f) => ({ f, arc: arcAtP(tab, f.p) }))
      .sort((x, y) => x.arc - y.arc);
    // Drop a curvature maximum that crowds a structural point.
    const kept: Array<{ f: Forced; arc: number }> = [];
    for (const e of fs) {
      if (e.f.kind === "kmax") {
        const crowded = fs.some(
          (o) => o.f.kind !== "kmax" && Math.abs(o.arc - e.arc) < Math.max(minSep, 0.25 * hmax)
        );
        if (crowded) continue;
        if (kept.length > 0 && kept[kept.length - 1].f.kind === "kmax" && e.arc - kept[kept.length - 1].arc < 0.25 * hmax) continue;
      }
      kept.push(e);
    }
    const chain: ChainNode[] = [];
    const idOf = (f: Forced): string => {
      if (f.id) return f.id;
      if (pi === 0 && f.kind === "start") return "mentr_a";
      if (pi === 0 && f.kind === "end") return "mexit_a";
      return freshId();
    };
    for (let i = 0; i < kept.length; i++) {
      const e = kept[i];
      const id = idOf(e.f);
      if (!nodePos.has(id)) {
        nodePos.set(id, posAtP(r.path, e.f.p));
        let type: Node["type"] = NODE_TYPE.TURN;
        if (e.f.kind === "crossing") type = NODE_TYPE.CROSSING;
        else if (e.f.kind === "junction") type = NODE_TYPE.JUNCTION;
        else if (e.f.kind === "start" || e.f.kind === "end") type = NODE_TYPE.END;
        nodeType.set(id, type);
        if (e.f.kind === "waypoint") waypoints.add(id);
      }
      chain.push({ id, arc: e.arc });
      if (i + 1 < kept.length) {
        const L0 = e.arc;
        const L1 = kept[i + 1].arc;
        const len = L1 - L0;
        const km = maxKappa(tab, L0, L1);
        const h = km > 0 ? Math.min(hmax, 0.6 / km) : hmax;
        const n = Math.max(1, Math.ceil(len / h));
        for (let j = 1; j < n; j++) {
          const L = L0 + (len * j) / n;
          const nid = freshId();
          nodePos.set(nid, posAtP(r.path, pAtArc(tab, L)));
          nodeType.set(nid, NODE_TYPE.TURN);
          chain.push({ id: nid, arc: L });
        }
      }
    }
    void total;
    chains.push(chain);
  });

  // --- Emit (graph units: LU, y down, origin at the minimum). ---
  let minX = Infinity;
  let minY = Infinity;
  const toGraph = (q: readonly [number, number]): [number, number] => [q[0] * sc, -q[1] * sc];
  for (const q of nodePos.values()) {
    const g = toGraph(q);
    if (g[0] < minX) minX = g[0];
    if (g[1] < minY) minY = g[1];
  }
  const norm = (q: readonly [number, number]): [number, number] => {
    const g = toGraph(q);
    return [g[0] - minX, g[1] - minY];
  };
  const nodes = new Map<string, Node>();
  for (const [id, q] of nodePos) {
    nodes.set(id, {
      id,
      type: nodeType.get(id)!,
      latticePos: norm(q),
      ...(waypoints.has(id) ? { waypoint: true } : {}),
    });
  }
  const edges = new Map<string, Edge>();
  const adjacency = new Map<string, string[]>();
  for (const id of nodes.keys()) adjacency.set(id, []);
  const edgePen = new Map<string, [number, number]>();
  const strands: Strand[] = [];
  let nextEdge = 0;
  // Pen clocks.
  const bodyTotal = tabs[0].cum[tabs[0].cum.length - 1];
  const junctionPen = new Map<string, number>();
  for (const c of chains[0]) junctionPen.set(c.id, c.arc);
  let floatBase = bodyTotal + FLOAT_GAP;
  chains.forEach((chain, pi) => {
    const r = paths[pi];
    const tab = tabs[pi];
    const penOf = (arc: number): number => {
      if (r.kind === "body") return arc;
      if (r.kind === "spur") return (junctionPen.get(chain[0].id) ?? 0) + PEN_EPS * arc;
      return floatBase + arc;
    };
    const edgeIds: string[] = [];
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = chain[i];
      const b = chain[i + 1];
      const id = `te${nextEdge++}`;
      const mid = norm(posAtP(r.path, pAtArc(tab, (a.arc + b.arc) / 2)));
      edges.set(id, {
        id,
        nodeA: a.id,
        nodeB: b.id,
        latticePoints: [nodes.get(a.id)!.latticePos.slice() as [number, number], nodes.get(b.id)!.latticePos.slice() as [number, number]],
        mid,
      });
      adjacency.get(a.id)!.push(id);
      adjacency.get(b.id)!.push(id);
      edgePen.set(id, [penOf(a.arc), penOf(b.arc)]);
      edgeIds.push(id);
    }
    if (r.kind === "float") floatBase += tab.cum[tab.cum.length - 1] + FLOAT_GAP;
    strands.push({
      edgeIds,
      isClosed: false,
      nodes: chain.map((c) => c.id),
      pinned: true,
      ...(r.kind === "float" ? { decorative: true } : {}),
    });
  });

  const graph: TangleGraph = {
    nodes,
    edges,
    adjacency,
    strands,
    seed: 0,
    params: { gridSize: 0, weaveDensity: 0, turnBias: 0, randSeed: 0 },
  };
  let ends = 0;
  let junctions = 0;
  let crossings = 0;
  for (const n of nodes.values()) {
    if (n.type === NODE_TYPE.END) ends++;
    else if (n.type === NODE_TYPE.JUNCTION) junctions++;
    else if (n.type === NODE_TYPE.CROSSING) crossings++;
  }
  return {
    graph,
    edgePen,
    stats: {
      ends,
      junctions,
      crossings,
      spurs: spurs.length,
      floats: floats.length,
      unconverged,
      nodes: nodes.size,
    },
  };
}
