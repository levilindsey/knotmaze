// K115 Stage 1b Part A: cursive text as a free-form TangleGraph.
//
// buildTextGraph turns a string into pinned strands drawn from Hershey
// Script Simplex integer strokes (src/core/hershey_script.ts, data by
// Dr. A. V. Hershey / James Hurt -- see notices/credits.ts). The layout,
// planar stroke graph, thread path, Hermite connectors for capitals,
// opened cusps, junction spurs, dot loops, bar strands and the run-phase
// over/under solver follow docs/design/K115_cursive_text.md sections
// 2.3 and 3.1-3.6 and docs/design/K115_stage1.md Part A.
//
// Determinism (K108): this file uses only +, -, *, /, Math.sqrt via
// hypot2, and integer helpers. No other Math functions.

import { HERSHEY_SCRIPT } from "./hershey_script";
import { NODE_TYPE } from "./types";
import type { Node, Strand, TangleGraph } from "./types";
import { hypot2 } from "../util/det_math";
import { buildWalkGraph } from "./walk_graph";
import { buildCellMask } from "./shapes";
import type { ShapeId } from "./shapes";

type Pt = [number, number];

const JOIN_Y = 4; // Hershey join line.
const X_HEIGHT_HU = 9;
const SPACE_ADVANCE = 16; // The space glyph's right - left.
const MAX_EDGE_LU = 1.4; // TURN chains: at most this per edge.
const BLUNT_LU = 0.9; // Opened cusp tip width.
const ON_TOL2 = 0.25; // Point-on-stroke tolerance, squared (HU).
const NODE_TOL2 = 0.0025; // Same-node tolerance, squared (HU).
export const TITLE_GAP = 2; // LU between a title band's bottom and the maze top.

function d2(a: Pt, b: Pt): number {
  const x = a[0] - b[0];
  const y = a[1] - b[1];
  return x * x + y * y;
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ---------------------------------------------------------------------------
// Planar segment graph (used per glyph, then once for the whole word)
// ---------------------------------------------------------------------------

interface SegIn {
  a: Pt;
  b: Pt;
  stroke: number;
  seg: number;
  isMain: boolean;
}

interface AtomEdge {
  a: number;
  b: number;
  stroke: number;
  seg: number;
  isMain: boolean;
}

interface Built {
  nodes: Pt[];
  edges: AtomEdge[];
  cross: boolean[];
  // Atomic edge ids per input segment, in segment order.
  perSeg: number[][];
}

function segPointDist2(p: Pt, a: Pt, b: Pt): { dd: number; t: number } {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy;
  let t = 0;
  if (len2 > 0) t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const q = lerpPt(a, b, t);
  return { dd: d2(p, q), t };
}

function buildPlanar(segs: SegIn[], markers: Pt[]): Built {
  const splits: Array<Array<{ t: number; p: Pt }>> = segs.map((s) => [
    { t: 0, p: s.a },
    { t: 1, p: s.b },
  ]);
  const crossPts: Pt[] = [];
  const addSplit = (i: number, t: number, p: Pt): void => {
    if (t < -0.000000001 || t > 1.000000001) return;
    const tt = t < 0 ? 0 : t > 1 ? 1 : t;
    const list = splits[i];
    for (const s of list) if (Math.abs(s.t - tt) < 0.000000001) return;
    list.push({ t: tt, p });
  };

  // Proper crossings, point-on-segment contacts, collinear overlaps.
  for (let i = 0; i < segs.length; i++) {
    for (let j = i; j < segs.length; j++) {
      const A = segs[i];
      const B = segs[j];
      if (j === i) {
        // A stroke may cross itself; handled below by pair logic with j>i
        // on distinct segments only, so nothing to do for i === j here.
        continue;
      }
      const p = A.a;
      const q = A.b;
      const r = B.a;
      const s = B.b;
      const d1x = q[0] - p[0];
      const d1y = q[1] - p[1];
      const d2x = s[0] - r[0];
      const d2y = s[1] - r[1];
      const den = d1x * d2y - d1y * d2x;
      if (Math.abs(den) > 0.000000000001) {
        const t = ((r[0] - p[0]) * d2y - (r[1] - p[1]) * d2x) / den;
        const u = ((r[0] - p[0]) * d1y - (r[1] - p[1]) * d1x) / den;
        if (t > 0.000000001 && t < 0.999999999 && u > 0.000000001 && u < 0.999999999) {
          const at = lerpPt(p, q, t);
          addSplit(i, t, at);
          addSplit(j, u, at);
          crossPts.push(at);
        }
      } else {
        // Parallel: a collinear overlap is split at both projections so
        // the duplicate atomic edges below collapse into one.
        const cA = segPointDist2(r, p, q);
        const cB = segPointDist2(s, p, q);
        if (cA.dd <= ON_TOL2 && cB.dd <= ON_TOL2) {
          const lo = Math.min(cA.t, cB.t);
          const hi = Math.max(cA.t, cB.t);
          if ((hi - lo) * hypot2(d1x, d1y) > 0.5) {
            addSplit(i, lo, lerpPt(p, q, lo));
            addSplit(i, hi, lerpPt(p, q, hi));
            const eA = segPointDist2(p, r, s);
            const eB = segPointDist2(q, r, s);
            addSplit(j, Math.min(eA.t, eB.t), lerpPt(r, s, Math.min(eA.t, eB.t)));
            addSplit(j, Math.max(eA.t, eB.t), lerpPt(r, s, Math.max(eA.t, eB.t)));
          }
        }
      }
    }
  }
  // Self-crossings within one input list are covered above because the
  // loops run over segment pairs (distinct SegIn entries), not strokes.

  // Endpoints / vertices (every segment end) and markers on other segments.
  const probes: Pt[] = [];
  for (const s of segs) {
    probes.push(s.a);
    probes.push(s.b);
  }
  for (const m of markers) probes.push(m);
  for (const p of probes) {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (d2(p, s.a) <= 0.000000001 || d2(p, s.b) <= 0.000000001) continue;
      const hit = segPointDist2(p, s.a, s.b);
      if (hit.dd <= ON_TOL2 && hit.t > 0.000000001 && hit.t < 0.999999999) {
        addSplit(i, hit.t, lerpPt(s.a, s.b, hit.t));
      }
    }
  }

  const nodes: Pt[] = [];
  const findNode = (p: Pt): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (d2(p, nodes[i]) <= NODE_TOL2) return i;
    }
    nodes.push([p[0], p[1]]);
    return nodes.length - 1;
  };

  const edges: AtomEdge[] = [];
  const edgeByKey = new Map<string, number>();
  const perSeg: number[][] = segs.map(() => []);
  for (let i = 0; i < segs.length; i++) {
    const list = splits[i].slice().sort((x, y) => x.t - y.t || x.p[0] - y.p[0] || x.p[1] - y.p[1]);
    for (let k = 0; k + 1 < list.length; k++) {
      if (list[k + 1].t - list[k].t < 0.000000001) continue;
      const na = findNode(list[k].p);
      const nb = findNode(list[k + 1].p);
      if (na === nb) continue;
      const key = na < nb ? `${na}_${nb}` : `${nb}_${na}`;
      let ei = edgeByKey.get(key);
      if (ei === undefined) {
        ei = edges.length;
        edges.push({ a: na, b: nb, stroke: segs[i].stroke, seg: segs[i].seg, isMain: segs[i].isMain });
        edgeByKey.set(key, ei);
      } else if (segs[i].isMain) {
        edges[ei].isMain = true;
      }
      if (!perSeg[i].includes(ei)) perSeg[i].push(ei);
    }
  }

  const cross = nodes.map((p) => crossPts.some((c) => d2(p, c) <= NODE_TOL2));
  return { nodes, edges, cross, perSeg };
}

function nearestNode(built: Built, p: Pt): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < built.nodes.length; i++) {
    const dd = d2(p, built.nodes[i]);
    if (dd < bestD) {
      bestD = dd;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Glyph preparation
// ---------------------------------------------------------------------------

function openCusps(pts: Pt[], xHeight: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  const halfHu = BLUNT_LU * (X_HEIGHT_HU / xHeight) * 0.5;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i + 1 < pts.length; i++) {
    const p = pts[i];
    const ax = p[0] - pts[i - 1][0];
    const ay = p[1] - pts[i - 1][1];
    const bx = pts[i + 1][0] - p[0];
    const by = pts[i + 1][1] - p[1];
    const la = hypot2(ax, ay);
    const lb = hypot2(bx, by);
    const dot = ax * bx + ay * by;
    // Reversal sharper than about 150 degrees: blunt the tip.
    if (la > 0 && lb > 0 && dot < 0 && dot * dot > 0.75 * la * la * lb * lb) {
      const u1x = (pts[i - 1][0] - p[0]) / la;
      const u1y = (pts[i - 1][1] - p[1]) / la;
      const u2x = (pts[i + 1][0] - p[0]) / lb;
      const u2y = (pts[i + 1][1] - p[1]) / lb;
      let bx2 = u1x + u2x;
      let by2 = u1y + u2y;
      const bl = hypot2(bx2, by2);
      if (bl < 0.000000001) {
        bx2 = -u1y;
        by2 = u1x;
      } else {
        bx2 = bx2 / bl;
        by2 = by2 / bl;
      }
      const px = -by2;
      const py = bx2;
      const c1: Pt = [p[0] + px * halfHu, p[1] + py * halfHu];
      const c2: Pt = [p[0] - px * halfHu, p[1] - py * halfHu];
      if (d2(c1, pts[i - 1]) <= d2(c2, pts[i - 1])) out.push(c1, c2);
      else out.push(c2, c1);
    } else {
      out.push(p);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Drop the parts of a later stroke that retrace an earlier stroke
// collinearly; the non-overlapping remainder stays, as its own pieces.
function dropRetraces(strokes: Pt[][]): Pt[][] {
  const out: Pt[][] = [];
  for (let si = 0; si < strokes.length; si++) {
    const stroke = strokes[si];
    if (si === 0 || out.length === 0) {
      out.push(stroke);
      continue;
    }
    const pieces: Pt[][] = [];
    let cur: Pt[] = [];
    const flush = (): void => {
      if (cur.length >= 2) pieces.push(cur);
      cur = [];
    };
    for (let k = 0; k + 1 < stroke.length; k++) {
      const a = stroke[k];
      const b = stroke[k + 1];
      const segLen = hypot2(b[0] - a[0], b[1] - a[1]);
      const bad: Array<[number, number]> = [];
      if (segLen > 0) {
        for (const prev of out) {
          for (let m = 0; m + 1 < prev.length; m++) {
            const cA = segPointDist2(a, prev[m], prev[m + 1]);
            const cB = segPointDist2(b, prev[m], prev[m + 1]);
            if (cA.dd > ON_TOL2 || cB.dd > ON_TOL2) continue;
            // This segment lies on the earlier one: where do the earlier
            // segment's ends fall along it?
            const sA = segPointDist2(prev[m], a, b).t;
            const sB = segPointDist2(prev[m + 1], a, b).t;
            const lo = Math.min(sA, sB);
            const hi = Math.max(sA, sB);
            if ((hi - lo) * segLen > 0.5) bad.push([lo, hi]);
          }
        }
      }
      bad.sort((x, y) => x[0] - y[0]);
      const kept: Array<[number, number]> = [];
      let at = 0;
      for (const iv of bad) {
        if (iv[0] > at) kept.push([at, Math.min(iv[0], 1)]);
        if (iv[1] > at) at = iv[1];
      }
      if (at < 1) kept.push([at, 1]);
      if (kept.length === 0) {
        flush();
        continue;
      }
      for (const iv of kept) {
        if (iv[1] - iv[0] < 0.000000001) continue;
        const ps = lerpPt(a, b, iv[0]);
        const pe = lerpPt(a, b, iv[1]);
        if (cur.length === 0) cur = [ps, pe];
        else if (d2(cur[cur.length - 1], ps) <= 0.000000001) cur.push(pe);
        else {
          flush();
          cur = [ps, pe];
        }
      }
    }
    flush();
    for (const piece of pieces) out.push(piece);
  }
  return out;
}

function closestOnStrokes(strokes: Pt[][], target: Pt): Pt {
  let best: Pt = strokes[0][0];
  let bestD = Infinity;
  for (const s of strokes) {
    for (let k = 0; k + 1 < s.length; k++) {
      const hit = segPointDist2(target, s[k], s[k + 1]);
      if (hit.dd < bestD) {
        bestD = hit.dd;
        best = lerpPt(s[k], s[k + 1], hit.t);
      }
    }
  }
  return best;
}

function closestEndpoint(strokes: Pt[][], target: Pt): Pt {
  let best: Pt = strokes[0][0];
  let bestD = Infinity;
  for (const s of strokes) {
    for (const p of [s[0], s[s.length - 1]]) {
      const dd = d2(p, target);
      if (dd < bestD) {
        bestD = dd;
        best = p;
      }
    }
  }
  return best;
}

interface GlyphRoute {
  routePts: Pt[]; // Absolute HU, entry to exit along the thread path.
  leftovers: Array<[Pt, Pt]>; // Atomic edges not on the path (HU).
  dots: Pt[][]; // Tiny closed loops (HU).
}

function routeGlyph(
  strokesIn: Pt[][],
  entryPt: Pt,
  exitPt: Pt,
  xHeight: number
): GlyphRoute {
  const dots: Pt[][] = [];
  const activeRaw: Pt[][] = [];
  for (const s of strokesIn) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of s) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const closed = s.length >= 2 && d2(s[0], s[s.length - 1]) <= 0.000000001;
    if (closed && maxX - minX <= 3 && maxY - minY <= 3) dots.push(s.slice());
    else activeRaw.push(s.slice());
  }
  if (activeRaw.length === 0) return { routePts: [], leftovers: [], dots };

  const opened = activeRaw.map((s) => openCusps(s, xHeight));
  const strokes = dropRetraces(opened);

  const segs: SegIn[] = [];
  strokes.forEach((s, si) => {
    for (let k = 0; k + 1 < s.length; k++) {
      if (d2(s[k], s[k + 1]) > 0.000000001) {
        segs.push({ a: s[k], b: s[k + 1], stroke: si, seg: k, isMain: false });
      }
    }
  });
  const built = buildPlanar(segs, [entryPt, exitPt]);
  const entryNode = nearestNode(built, entryPt);
  const exitNode = nearestNode(built, exitPt);

  const adj = new Map<number, Array<{ e: number; to: number }>>();
  built.edges.forEach((e, ei) => {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push({ e: ei, to: e.b });
    adj.get(e.b)!.push({ e: ei, to: e.a });
  });

  const pathEdges = findRoute(built, adj, entryNode, exitNode);
  const onPath = new Set(pathEdges);
  const routePts: Pt[] = [];
  if (pathEdges.length > 0) {
    let cur = entryNode;
    routePts.push(built.nodes[cur]);
    for (const ei of pathEdges) {
      const e = built.edges[ei];
      cur = e.a === cur ? e.b : e.a;
      routePts.push(built.nodes[cur]);
    }
  } else {
    routePts.push(built.nodes[entryNode]);
  }
  const leftovers: Array<[Pt, Pt]> = [];
  built.edges.forEach((e, ei) => {
    if (!onPath.has(ei)) leftovers.push([built.nodes[e.a], built.nodes[e.b]]);
  });
  return { routePts, leftovers, dots };
}

// Deterministic trail search entry -> exit. Prefers continuing the same
// stroke in the same direction, then later strokes, with backtracking;
// falls back to a shortest path, then to a greedy trail.
function findRoute(
  built: Built,
  adj: Map<number, Array<{ e: number; to: number }>>,
  entryNode: number,
  exitNode: number
): number[] {
  if (entryNode === exitNode) return [];
  const exitPos = built.nodes[exitNode];
  let budget = 20000;

  const score = (
    cand: { e: number; to: number },
    inStroke: number,
    inRel: number,
    inVec: Pt
  ): number => {
    const e = built.edges[cand.e];
    const rel = cand.to === e.b ? 1 : -1;
    let base = 0;
    if (inStroke >= 0) {
      if (e.stroke === inStroke && rel === inRel) base = 0;
      else if (e.stroke === inStroke) base = 3;
      else if (e.stroke === inStroke + 1) base = 1;
      else if (e.stroke > inStroke) base = 2;
      else base = 4;
    }
    const from = built.nodes[cand.to === e.b ? e.a : e.b];
    const to = built.nodes[cand.to];
    const vx = to[0] - from[0];
    const vy = to[1] - from[1];
    const vl = hypot2(vx, vy);
    let dot = 0;
    if (vl > 0 && (inVec[0] !== 0 || inVec[1] !== 0)) {
      dot = (vx * inVec[0] + vy * inVec[1]) / vl;
    }
    const near = hypot2(to[0] - exitPos[0], to[1] - exitPos[1]) * 0.001;
    return base - dot * 0.4 + near;
  };

  const used = new Set<number>();
  const path: number[] = [];
  const dfs = (node: number, inStroke: number, inRel: number, inVec: Pt): boolean => {
    if (node === exitNode) return true;
    if (budget-- <= 0) return false;
    const cands = (adj.get(node) ?? [])
      .filter((c) => !used.has(c.e))
      .map((c) => ({ c, s: score(c, inStroke, inRel, inVec) }))
      .sort((x, y) => x.s - y.s || x.c.e - y.c.e);
    for (const { c } of cands) {
      const e = built.edges[c.e];
      const rel = c.to === e.b ? 1 : -1;
      const from = built.nodes[node];
      const to = built.nodes[c.to];
      const il = hypot2(to[0] - from[0], to[1] - from[1]);
      const vec: Pt = il > 0 ? [(to[0] - from[0]) / il, (to[1] - from[1]) / il] : [0, 0];
      used.add(c.e);
      path.push(c.e);
      if (dfs(c.to, e.stroke, rel, vec)) return true;
      path.pop();
      used.delete(c.e);
      if (budget <= 0) return false;
    }
    return false;
  };
  if (dfs(entryNode, -1, 0, [0, 0])) return path.slice();

  // Shortest path (BFS over nodes).
  const prevEdge = new Map<number, number>();
  const prevNode = new Map<number, number>();
  const seen = new Set<number>([entryNode]);
  const queue = [entryNode];
  while (queue.length > 0) {
    const n = queue.shift()!;
    if (n === exitNode) break;
    for (const c of adj.get(n) ?? []) {
      if (seen.has(c.to)) continue;
      seen.add(c.to);
      prevEdge.set(c.to, c.e);
      prevNode.set(c.to, n);
      queue.push(c.to);
    }
  }
  if (seen.has(exitNode) && exitNode !== entryNode) {
    const out: number[] = [];
    let n = exitNode;
    while (n !== entryNode) {
      out.push(prevEdge.get(n)!);
      n = prevNode.get(n)!;
    }
    return out.reverse();
  }

  // Greedy trail to wherever the glyph's connected piece leads.
  const out: number[] = [];
  const taken = new Set<number>();
  let node = entryNode;
  let inStroke = -1;
  let inRel = 0;
  let inVec: Pt = [0, 0];
  for (let guard = 0; guard < built.edges.length + 1; guard++) {
    const cands = (adj.get(node) ?? [])
      .filter((c) => !taken.has(c.e))
      .map((c) => ({ c, s: score(c, inStroke, inRel, inVec) }))
      .sort((x, y) => x.s - y.s || x.c.e - y.c.e);
    if (cands.length === 0) break;
    const c = cands[0].c;
    const e = built.edges[c.e];
    taken.add(c.e);
    out.push(c.e);
    const from = built.nodes[node];
    const to = built.nodes[c.to];
    const il = hypot2(to[0] - from[0], to[1] - from[1]);
    inVec = il > 0 ? [(to[0] - from[0]) / il, (to[1] - from[1]) / il] : [0, 0];
    inStroke = e.stroke;
    inRel = c.to === e.b ? 1 : -1;
    node = c.to;
    if (node === exitNode) break;
  }
  return out;
}

// Cubic Hermite samples (excluding both ends) from p to q, tangents
// scaled by the gap so the connector keeps the neighbours' directions.
function hermitePts(p: Pt, tanP: Pt, q: Pt, tanQ: Pt): Pt[] {
  const gap = hypot2(q[0] - p[0], q[1] - p[1]);
  const lp = hypot2(tanP[0], tanP[1]);
  const lq = hypot2(tanQ[0], tanQ[1]);
  // Tangents scaled well under the gap: a full-gap tangent overshoots the
  // endpoint (and retraces itself) when a glyph's entry direction points
  // back across the gap, as a digit's does after a word space.
  const m0: Pt = lp > 0 ? [(tanP[0] / lp) * gap * 0.45, (tanP[1] / lp) * gap * 0.45] : [q[0] - p[0], q[1] - p[1]];
  const m1: Pt = lq > 0 ? [(tanQ[0] / lq) * gap * 0.45, (tanQ[1] / lq) * gap * 0.45] : [q[0] - p[0], q[1] - p[1]];
  const out: Pt[] = [];
  for (let k = 1; k < 8; k++) {
    const t = k / 8;
    const t2 = t * t;
    const t3 = t2 * t;
    const h1 = 2 * t3 - 3 * t2 + 1;
    const h2 = t3 - 2 * t2 + t;
    const h3 = -2 * t3 + 3 * t2;
    const h4 = t3 - t2;
    out.push([
      h1 * p[0] + h2 * m0[0] + h3 * q[0] + h4 * m1[0],
      h1 * p[1] + h2 * m0[1] + h3 * q[1] + h4 * m1[1],
    ]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The builder
// ---------------------------------------------------------------------------

export function buildTextGraph(text: string, opts?: { xHeight?: number }): TangleGraph {
  const xHeight =
    opts && opts.xHeight !== undefined && opts.xHeight > 0 ? opts.xHeight : 3;
  const scale = xHeight / X_HEIGHT_HU;

  // --- Layout and per-glyph routing, in Hershey units. ---
  let cursor = 0;
  const mainPts: Pt[] = [];
  // K115 stage 2: the main-path join point of each glyph (HU, reading
  // order) - where its lead-in begins. Mapped to graph nodes below and
  // flagged `waypoint`, one per glyph on the path.
  const glyphJoins: Pt[] = [];
  const extraSegs: Array<[Pt, Pt]> = [];
  const dotLoops: Pt[][] = [];

  const chars = Array.from(text);
  for (const ch of chars) {
    const code = ch.codePointAt(0) ?? -1;
    if (code === 32) {
      cursor += SPACE_ADVANCE;
      if (mainPts.length > 0) {
        const swash: Pt = [cursor, JOIN_Y];
        if (d2(mainPts[mainPts.length - 1], swash) > 0.000000001) mainPts.push(swash);
      }
      continue;
    }
    if (code < 32 || code > 126) {
      cursor += SPACE_ADVANCE; // Unsupported: space advance only.
      continue;
    }
    const glyph = HERSHEY_SCRIPT[code - 32];
    const cursorPrev = cursor;
    const cursorNext = cursor + (glyph.right - glyph.left);
    const dx = cursor - glyph.left;
    cursor = cursorNext;
    if (glyph.strokes.length === 0) continue;

    const placed: Pt[][] = glyph.strokes.map((s) =>
      s.map((p) => [p[0] + dx, p[1]] as Pt)
    );
    const isLower = ch >= "a" && ch <= "z";
    let entryPt: Pt;
    let exitPt: Pt;
    if (isLower) {
      entryPt = closestOnStrokes(placed, [cursorPrev, JOIN_Y]);
      exitPt = closestEndpoint(placed, [cursorNext, JOIN_Y]);
      if (d2(exitPt, [cursorNext, JOIN_Y]) > 9) {
        exitPt = closestOnStrokes(placed, [cursorNext, JOIN_Y]);
      }
      // Merge-class letters (a c d e g o q) enter on the body: that point
      // is exactly the closest stroke point to the join anchor found
      // above, and their own start stays behind as a spur. Join-class
      // letters start at that same anchor point.
    } else {
      // Capitals, digits, punctuation: first stroke start to last stroke end.
      entryPt = placed[0][0];
      const lastStroke = placed[placed.length - 1];
      exitPt = lastStroke[lastStroke.length - 1];
    }

    const routed = routeGlyph(placed, entryPt, exitPt, xHeight);
    for (const seg of routed.leftovers) extraSegs.push(seg);
    for (const dot of routed.dots) dotLoops.push(dot);
    if (routed.routePts.length === 0) continue;

    if (mainPts.length === 0) {
      glyphJoins.push([routed.routePts[0][0], routed.routePts[0][1]]);
      for (const p of routed.routePts) mainPts.push(p);
    } else {
      const p = mainPts[mainPts.length - 1];
      const q = routed.routePts[0];
      if (d2(p, q) <= 0.25) {
        // The lead-in joins at the previous point itself.
        glyphJoins.push([p[0], p[1]]);
        for (let k = 1; k < routed.routePts.length; k++) mainPts.push(routed.routePts[k]);
      } else {
        glyphJoins.push([q[0], q[1]]);
        const prev = mainPts.length >= 2 ? mainPts[mainPts.length - 2] : p;
        const tanP: Pt = [p[0] - prev[0], p[1] - prev[1]];
        const nxt =
          routed.routePts.length >= 2 ? routed.routePts[1] : routed.routePts[0];
        const tanQ: Pt = [nxt[0] - q[0], nxt[1] - q[1]];
        for (const hp of hermitePts(p, tanP, q, tanQ)) mainPts.push(hp);
        for (const rp of routed.routePts) mainPts.push(rp);
      }
    }
  }

  if (mainPts.length < 2) {
    const endX = cursor > 0 ? cursor : X_HEIGHT_HU;
    glyphJoins.length = 0; // No glyph made the path; the line below is bare.
    mainPts.length = 0;
    mainPts.push([0, JOIN_Y], [endX, JOIN_Y]);
  }
  // Lead-in / lead-out tails: the entrance and exit ends sit 4 HU back
  // along the path tangents, so mentr_a / mexit_a are degree-1 ends even
  // when a glyph's entry point is also an interior point of its stroke
  // (a capital D passes its own start again).
  {
    const f = mainPts[0];
    const fn = mainPts[1];
    const fl = hypot2(fn[0] - f[0], fn[1] - f[1]);
    if (fl > 0) mainPts.unshift([f[0] - ((fn[0] - f[0]) / fl) * 4, f[1] - ((fn[1] - f[1]) / fl) * 4]);
    const l = mainPts[mainPts.length - 1];
    const lp = mainPts[mainPts.length - 2];
    const ll = hypot2(l[0] - lp[0], l[1] - lp[1]);
    if (ll > 0) mainPts.push([l[0] + ((l[0] - lp[0]) / ll) * 4, l[1] + ((l[1] - lp[1]) / ll) * 4]);
  }

  // --- Whole-word planar graph in HU. ---
  const segs: SegIn[] = [];
  for (let k = 0; k + 1 < mainPts.length; k++) {
    if (d2(mainPts[k], mainPts[k + 1]) > 0.000000001) {
      segs.push({ a: mainPts[k], b: mainPts[k + 1], stroke: -1, seg: k, isMain: true });
    }
  }
  const mainSegCount = segs.length;
  for (const seg of extraSegs) {
    if (d2(seg[0], seg[1]) > 0.000000001) {
      segs.push({ a: seg[0], b: seg[1], stroke: -2, seg: 0, isMain: false });
    }
  }
  for (const dot of dotLoops) {
    for (let k = 0; k + 1 < dot.length; k++) {
      if (d2(dot[k], dot[k + 1]) > 0.000000001) {
        segs.push({ a: dot[k], b: dot[k + 1], stroke: -3, seg: k, isMain: false });
      }
    }
    const last = dot[dot.length - 1];
    if (dot.length > 1 && d2(last, dot[0]) > 0.000000001) {
      segs.push({ a: last, b: dot[0], stroke: -3, seg: dot.length, isMain: false });
    }
  }
  const built = buildPlanar(segs, [mainPts[0], mainPts[mainPts.length - 1]]);

  // --- Scale to LU, normalise the origin, resample into TURN chains. ---
  let minX = Infinity;
  let minY = Infinity;
  const luNodes = built.nodes.map((p) => {
    const q: Pt = [p[0] * scale, p[1] * scale];
    if (q[0] < minX) minX = q[0];
    if (q[1] < minY) minY = q[1];
    return q;
  });
  for (const q of luNodes) {
    q[0] -= minX;
    q[1] -= minY;
  }

  interface FNode {
    pos: Pt;
    type: (typeof NODE_TYPE)[keyof typeof NODE_TYPE];
    cross: boolean;
  }
  const fNodes: FNode[] = built.nodes.map((_, i) => ({
    pos: luNodes[i],
    type: NODE_TYPE.TURN,
    cross: built.cross[i],
  }));
  interface FEdge {
    a: number;
    b: number;
    isMain: boolean;
  }
  const fEdges: FEdge[] = [];
  // Per atomic edge: expanded final edge ids and node ids, a -> b.
  const expansion: Array<{ edges: number[]; nodes: number[] }> = [];
  built.edges.forEach((e) => {
    const aPos = luNodes[e.a];
    const bPos = luNodes[e.b];
    const len = hypot2(bPos[0] - aPos[0], bPos[1] - aPos[1]);
    let chunks = Math.ceil(len / MAX_EDGE_LU - 0.000000001);
    if (chunks < 1) chunks = 1;
    const expEdges: number[] = [];
    const expNodes: number[] = [e.a];
    let prev = e.a;
    for (let c = 1; c < chunks; c++) {
      const t = c / chunks;
      const ni = fNodes.length;
      fNodes.push({ pos: lerpPt(aPos, bPos, t), type: NODE_TYPE.TURN, cross: false });
      expEdges.push(fEdges.length);
      fEdges.push({ a: prev, b: ni, isMain: e.isMain });
      expNodes.push(ni);
      prev = ni;
    }
    expEdges.push(fEdges.length);
    fEdges.push({ a: prev, b: e.b, isMain: e.isMain });
    expNodes.push(e.b);
    expansion.push({ edges: expEdges, nodes: expNodes });
  });

  // Degrees and feature types.
  const degree = fNodes.map(() => 0);
  const adjacencyF: number[][] = fNodes.map(() => []);
  fEdges.forEach((e, ei) => {
    degree[e.a] += 1;
    degree[e.b] += 1;
    adjacencyF[e.a].push(ei);
    adjacencyF[e.b].push(ei);
  });
  fNodes.forEach((n, i) => {
    if (i < built.nodes.length) {
      if (degree[i] === 1) n.type = NODE_TYPE.END;
      else if (degree[i] === 2) n.type = NODE_TYPE.TURN;
      else if (degree[i] === 4 && n.cross) n.type = NODE_TYPE.CROSSING;
      else if (degree[i] >= 3) n.type = NODE_TYPE.JUNCTION;
      else n.type = NODE_TYPE.TURN;
    }
  });

  // The main strand's expanded edge/node sequence.
  const mainStartBuilt = nearestNode(built, mainPts[0]);
  const mainEndBuilt = nearestNode(built, mainPts[mainPts.length - 1]);
  const mainEdgeIds: number[] = [];
  const mainNodeSeq: number[] = [mainStartBuilt];
  for (let si = 0; si < mainSegCount; si++) {
    for (const ei of built.perSeg[si]) {
      if (!built.edges[ei].isMain) continue;
      const exp = expansion[ei];
      let eList = exp.edges;
      let nList = exp.nodes;
      if (nList[0] !== mainNodeSeq[mainNodeSeq.length - 1]) {
        eList = exp.edges.slice().reverse();
        nList = exp.nodes.slice().reverse();
      }
      for (const fe of eList) if (!mainEdgeIds.includes(fe)) mainEdgeIds.push(fe);
      for (let k = 1; k < nList.length; k++) mainNodeSeq.push(nList[k]);
    }
  }

  // Node ids: mentr_a / mexit_a at the path ends, t namespace elsewhere.
  const nodeIds = fNodes.map((_, i) =>
    i === mainStartBuilt ? "mentr_a" : i === mainEndBuilt ? "mexit_a" : `tn${i}`
  );

  // K115 stage 2: waypoint built-node indices - each glyph's join point
  // (its entry is a main-path vertex by construction, so the nearest
  // built node is exact), plus the exit end.
  const waypointBuilt = new Set<number>();
  for (const jp of glyphJoins) waypointBuilt.add(nearestNode(built, jp));
  waypointBuilt.add(mainEndBuilt);

  // Crossing pass pairing (straightest continuation), for strand tracing.
  const pairOf = new Map<number, number>();
  fNodes.forEach((n, ni) => {
    if (n.type !== NODE_TYPE.CROSSING) return;
    const incident = adjacencyF[ni].slice();
    const dirOf = (ei: number): Pt => {
      const e = fEdges[ei];
      const other = e.a === ni ? fNodes[e.b].pos : fNodes[e.a].pos;
      return [other[0] - n.pos[0], other[1] - n.pos[1]];
    };
    const left = incident.slice();
    while (left.length >= 2) {
      const first = left.shift()!;
      let bestIdx = 0;
      let bestDot = Infinity;
      for (let k = 0; k < left.length; k++) {
        const dA = dirOf(first);
        const dB = dirOf(left[k]);
        const la = hypot2(dA[0], dA[1]);
        const lb = hypot2(dB[0], dB[1]);
        const dot = la > 0 && lb > 0 ? (dA[0] * dB[0] + dA[1] * dB[1]) / (la * lb) : 0;
        if (dot < bestDot) {
          bestDot = dot;
          bestIdx = k;
        }
      }
      const partner = left.splice(bestIdx, 1)[0];
      pairOf.set(first, partner);
      pairOf.set(partner, first);
    }
  });

  // --- Strand tracing: main first, then every remaining edge. ---
  const usedEdges = new Set<number>(mainEdgeIds);
  interface RawStrand {
    edges: number[];
    nodes: number[];
    closed: boolean;
  }
  const rawStrands: RawStrand[] = [
    { edges: mainEdgeIds.slice(), nodes: mainNodeSeq.slice(), closed: false },
  ];

  const startPriority = (ni: number): number => {
    const t = fNodes[ni].type;
    if (t === NODE_TYPE.END) return 0;
    if (t === NODE_TYPE.JUNCTION) return 1;
    if (t === NODE_TYPE.CROSSING) return 2;
    return 3;
  };

  for (;;) {
    // Choose the next strand's first edge deterministically.
    let chosen = -1;
    let chosenStart = -1;
    let chosenPrio = Infinity;
    for (let ei = 0; ei < fEdges.length; ei++) {
      if (usedEdges.has(ei)) continue;
      const e = fEdges[ei];
      const pa = startPriority(e.a);
      const pb = startPriority(e.b);
      const prio = Math.min(pa, pb);
      if (prio < chosenPrio || (prio === chosenPrio && (chosen < 0 || ei < chosen))) {
        chosen = ei;
        chosenPrio = prio;
        chosenStart = pa <= pb ? e.a : e.b;
      }
    }
    if (chosen < 0) break;

    const seqEdges: number[] = [];
    const seqNodes: number[] = [chosenStart];
    let current = chosenStart;
    let prevEdge = -1;
    let closed = false;
    for (let guard = 0; guard < fEdges.length + 2; guard++) {
      if (seqEdges.length > 0) {
        if (current === chosenStart) {
          closed = true;
          break;
        }
        const ct = fNodes[current].type;
        if (ct === NODE_TYPE.JUNCTION || ct === NODE_TYPE.END) break;
      }
      let nextEdge = -1;
      if (seqEdges.length === 0) {
        nextEdge = chosen;
      } else if (fNodes[current].type === NODE_TYPE.CROSSING) {
        const p = pairOf.get(prevEdge);
        if (p !== undefined && !usedEdges.has(p)) nextEdge = p;
      } else {
        for (const ei of adjacencyF[current]) {
          if (ei === prevEdge || usedEdges.has(ei)) continue;
          if (nextEdge < 0 || ei < nextEdge) nextEdge = ei;
        }
      }
      if (nextEdge < 0) break;
      const e = fEdges[nextEdge];
      const nxt = e.a === current ? e.b : e.a;
      usedEdges.add(nextEdge);
      seqEdges.push(nextEdge);
      seqNodes.push(nxt);
      prevEdge = nextEdge;
      current = nxt;
    }
    if (seqEdges.length === 0) break; // Defensive; cannot happen.
    rawStrands.push({ edges: seqEdges, nodes: seqNodes, closed });
  }

  // --- Emit the TangleGraph. ---
  const nodes = new Map<string, Node>();
  fNodes.forEach((n, i) => {
    nodes.set(nodeIds[i], {
      id: nodeIds[i],
      type: n.type,
      latticePos: [n.pos[0], n.pos[1]],
      ...(waypointBuilt.has(i) ? { waypoint: true } : {}),
    });
  });
  const edges = new Map<string, { id: string; nodeA: string; nodeB: string; latticePoints: Array<[number, number]> }>();
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  fEdges.forEach((e, ei) => {
    const id = `te${ei}`;
    const a = nodeIds[e.a];
    const b = nodeIds[e.b];
    edges.set(id, {
      id,
      nodeA: a,
      nodeB: b,
      latticePoints: [
        [fNodes[e.a].pos[0], fNodes[e.a].pos[1]],
        [fNodes[e.b].pos[0], fNodes[e.b].pos[1]],
      ],
    });
    adjacency.get(a)!.push(id);
    adjacency.get(b)!.push(id);
  });
  const strands: Strand[] = rawStrands.map((r) => ({
    edgeIds: r.edges.map((ei) => `te${ei}`),
    isClosed: r.closed,
    nodes: r.nodes.map((ni) => nodeIds[ni]),
    pinned: true,
  }));

  const graph: TangleGraph = {
    nodes,
    edges,
    adjacency,
    strands,
    seed: 0,
    params: { gridSize: 0, weaveDensity: 0, turnBias: 0, randSeed: 0 },
  };

  assignOverUnder(graph);
  return graph;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// K115 stage 3a: attach a title word to an applied maze's entrance tail.
// The word is built at the fitted x-height, placed in a band above the
// maze, and its main strand is extended by a Hermite connector to the
// chosen entrance END, which becomes the degree-2 JUNCTION `tseam`.
// Returns the seam id, or null (graph untouched) when the title builds
// no glyphs or the connector would cross maze material twice over.
// ---------------------------------------------------------------------------

function renameGraphNode(graph: TangleGraph, oldId: string, newId: string): void {
  const node = graph.nodes.get(oldId);
  if (!node || oldId === newId) return;
  graph.nodes.delete(oldId);
  node.id = newId;
  graph.nodes.set(newId, node);
  const adj = graph.adjacency.get(oldId);
  graph.adjacency.delete(oldId);
  graph.adjacency.set(newId, adj ?? []);
  for (const e of graph.edges.values()) {
    if (e.nodeA === oldId) e.nodeA = newId;
    if (e.nodeB === oldId) e.nodeB = newId;
  }
  for (const s of graph.strands) {
    for (let i = 0; i < s.nodes.length; i++) {
      if (s.nodes[i] === oldId) s.nodes[i] = newId;
    }
  }
}

function orient(a: Pt, b: Pt, c: Pt): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function properIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return (
    ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
  );
}

export function attachTitle(graph: TangleGraph, title: string): string | null {
  let hasGlyph = false;
  for (const ch of title) {
    const code = ch.codePointAt(0) ?? -1;
    if (code > 32 && code <= 126 && HERSHEY_SCRIPT[code - 32].strokes.length > 0) {
      hasGlyph = true;
    }
  }
  if (!hasGlyph) return null;
  const walk0 = buildWalkGraph(graph);
  if (!walk0) return null;
  const seamOld = walk0.start;
  const seamNode0 = graph.nodes.get(seamOld);
  if (!seamNode0) return null;

  let mazeMinX = Infinity;
  let mazeMinY = Infinity;
  let mazeMaxX = -Infinity;
  for (const e of graph.edges.values()) {
    for (const p of e.latticePoints) {
      if (p[0] < mazeMinX) mazeMinX = p[0];
      if (p[0] > mazeMaxX) mazeMaxX = p[0];
      if (p[1] < mazeMinY) mazeMinY = p[1];
    }
  }
  if (!Number.isFinite(mazeMinX)) return null;
  const declaredWidth = 2 * (graph.params.gridSize ?? 0);
  const mazeWidth = declaredWidth > 0 ? declaredWidth : mazeMaxX - mazeMinX;
  const seamPos: Pt = seamNode0.anchor
    ? [seamNode0.anchor[0], seamNode0.anchor[1]]
    : [seamNode0.latticePos[0], seamNode0.latticePos[1]];
  // The tail strand's neighbour of the seam: the connector arrives along
  // the tail's own line (seam -> neighbour is the player's way in).
  let neighbourPos: Pt | null = null;
  for (const s of graph.strands) {
    const i = s.nodes.indexOf(seamOld);
    if (i < 0) continue;
    const nId = i + 1 < s.nodes.length ? s.nodes[i + 1] : s.nodes[i - 1];
    const n = nId ? graph.nodes.get(nId) : undefined;
    if (n) neighbourPos = [n.latticePos[0], n.latticePos[1]];
    break;
  }
  if (!neighbourPos) return null;

  let word = buildTextGraph(title, { xHeight: 3 });
  const wordBounds = (): [number, number, number, number] => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const n of word.nodes.values()) {
      if (n.latticePos[0] < x0) x0 = n.latticePos[0];
      if (n.latticePos[0] > x1) x1 = n.latticePos[0];
      if (n.latticePos[1] < y0) y0 = n.latticePos[1];
      if (n.latticePos[1] > y1) y1 = n.latticePos[1];
    }
    return [x0, y0, x1, y1];
  };
  let wb = wordBounds();
  const wordWidth = wb[2] - wb[0];
  if (wordWidth > mazeWidth && wordWidth > 0) {
    word = buildTextGraph(title, { xHeight: (3 * mazeWidth) / wordWidth });
    wb = wordBounds();
  }
  const dx = (mazeMinX + mazeMaxX) / 2 - (wb[0] + wb[2]) / 2;
  const dy = mazeMinY - TITLE_GAP - wb[3];
  for (const n of word.nodes.values()) {
    n.latticePos = [n.latticePos[0] + dx, n.latticePos[1] + dy];
  }
  for (const e of word.edges.values()) {
    e.latticePoints = e.latticePoints.map(
      (p) => [p[0] + dx, p[1] + dy] as Pt
    );
  }
  wb = wordBounds();

  renameGraphNode(word, "mexit_a", "texit");
  const endNode = word.nodes.get("texit");
  if (!endNode) return null;
  endNode.type = NODE_TYPE.TURN; // Keeps its waypoint: the writing stops here.
  const main = word.strands[0];
  const prevId = main.nodes[main.nodes.length - 2];
  const prevNode = prevId ? word.nodes.get(prevId) : undefined;
  if (!prevNode) return null;
  const endPos: Pt = [endNode.latticePos[0], endNode.latticePos[1]];
  const tanP: Pt = [endPos[0] - prevNode.latticePos[0], endPos[1] - prevNode.latticePos[1]];
  const tanQ: Pt = [neighbourPos[0] - seamPos[0], neighbourPos[1] - seamPos[1]];

  const mazeSegs: Array<[Pt, Pt]> = [];
  for (const e of graph.edges.values()) {
    for (let i = 0; i + 1 < e.latticePoints.length; i++) {
      mazeSegs.push([e.latticePoints[i], e.latticePoints[i + 1]]);
    }
  }
  let connPts: Pt[] | null = null;
  for (let attempt = 0; attempt < 3 && !connPts; attempt++) {
    let pts: Pt[];
    if (attempt === 2) {
      // Last resort: around the outside of the maze's bounds to a point
      // on the tail's own outward line, then in along it (the tail
      // escape already cleared that corridor).
      const ox = seamPos[0] - neighbourPos[0];
      const oy = seamPos[1] - neighbourPos[1];
      const ol = hypot2(ox, oy);
      if (ol <= 0) break;
      const via: Pt = [seamPos[0] + (ox / ol) * 3, seamPos[1] + (oy / ol) * 3];
      const boxL = mazeMinX - 3;
      const boxR = mazeMaxX + 3;
      const sideX =
        Math.abs(via[0] - boxL) <= Math.abs(via[0] - boxR) ? boxL : boxR;
      pts = [endPos, [sideX, endPos[1]], [sideX, via[1]], via, seamPos];
    } else {
      const samples = hermitePts(endPos, tanP, seamPos, tanQ);
      if (attempt === 1 && samples.length > 3) {
        samples[3] = [samples[3][0], wb[1]]; // Mid control to the band's top edge.
      }
      pts = [endPos, ...samples, seamPos];
    }
    let crosses = false;
    for (let i = 0; i + 1 < pts.length && !crosses; i++) {
      for (const [c, d] of mazeSegs) {
        if (properIntersect(pts[i], pts[i + 1], c, d)) {
          crosses = true;
          break;
        }
      }
    }
    if (!crosses) connPts = pts;
  }
  if (!connPts) return null;

  // Resample the connector into TURN edges of at most MAX_EDGE_LU.
  const connNodes: Pt[] = [];
  for (let i = 0; i + 1 < connPts.length; i++) {
    const a = connPts[i];
    const b = connPts[i + 1];
    const len = hypot2(b[0] - a[0], b[1] - a[1]);
    let chunks = Math.ceil(len / MAX_EDGE_LU - 0.000000001);
    if (chunks < 1) chunks = 1;
    for (let c = 1; c <= chunks; c++) {
      connNodes.push(c === chunks ? [b[0], b[1]] : lerpPt(a, b, c / chunks));
    }
  }
  if (connNodes.length === 0) connNodes.push(seamPos);

  // Mutate the maze: seam first (freeing mentr_a for the word's start).
  renameGraphNode(graph, seamOld, "tseam");
  const seam = graph.nodes.get("tseam")!;
  seam.type = NODE_TYPE.JUNCTION;
  delete seam.anchor;
  seam.latticePos = [seamPos[0], seamPos[1]];
  if (graph.nodes.has("mentr_a")) renameGraphNode(graph, "mentr_a", "mentr_decoy");

  for (const n of word.nodes.values()) graph.nodes.set(n.id, n);
  for (const n of word.nodes.values()) {
    graph.adjacency.set(n.id, (word.adjacency.get(n.id) ?? []).slice());
  }
  for (const e of word.edges.values()) graph.edges.set(e.id, e);

  let prevConnId = "texit";
  let prevConnPos = endPos;
  const connEdgeIds: string[] = [];
  const connNodeIds: string[] = [];
  connNodes.forEach((p, i) => {
    const isSeam = i === connNodes.length - 1;
    const nodeId = isSeam ? "tseam" : `tcn${i}`;
    if (!isSeam) {
      graph.nodes.set(nodeId, { id: nodeId, type: NODE_TYPE.TURN, latticePos: [p[0], p[1]] });
      graph.adjacency.set(nodeId, []);
      connNodeIds.push(nodeId);
    }
    const eid = `tce${i}`;
    graph.edges.set(eid, {
      id: eid,
      nodeA: prevConnId,
      nodeB: nodeId,
      latticePoints: [
        [prevConnPos[0], prevConnPos[1]],
        [p[0], p[1]],
      ],
    });
    graph.adjacency.get(prevConnId)!.push(eid);
    graph.adjacency.get(nodeId)!.push(eid);
    connEdgeIds.push(eid);
    prevConnId = nodeId;
    prevConnPos = p;
  });

  for (const s of word.strands) graph.strands.push(s);
  main.edgeIds.push(...connEdgeIds);
  main.nodes.push(...connNodeIds, "tseam");
  return "tseam";
}

// ---------------------------------------------------------------------------
// K115 stage 4a: the cartouche (E2). planCartoucheHole fits a word into a
// rectangular hole stamped in the kept mask (shapes.ts) and picks the
// hole's cell; attachCartouche hangs the fitted word across the hole on
// two frame junctions. Both follow docs/design/K115_stage4.md: pinned
// word, landmark route (counted like any maze run), one hue slot.
// ---------------------------------------------------------------------------

export const PAD_LU = 2;
export const FRAME_MIN = 2;
export const MIN_XHEIGHT = 2.0;

export interface CartoucheHole {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface CartouchePlan {
  hole: CartoucheHole;
  xHeight: number;
}

function textHasGlyph(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? -1;
    if (code > 32 && code <= 126 && HERSHEY_SCRIPT[code - 32].strokes.length > 0) {
      return true;
    }
  }
  return false;
}

function graphBounds(
  graph: TangleGraph
): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const n of graph.nodes.values()) {
    if (n.latticePos[0] < x0) x0 = n.latticePos[0];
    if (n.latticePos[0] > x1) x1 = n.latticePos[0];
    if (n.latticePos[1] < y0) y0 = n.latticePos[1];
    if (n.latticePos[1] > y1) y1 = n.latticePos[1];
  }
  return [x0, y0, x1, y1];
}

export function planCartoucheHole(
  text: string,
  gridSize: number,
  shape: ShapeId
): CartouchePlan | null {
  if (!textHasGlyph(text)) return null;
  const size = Math.max(2, Math.round(gridSize));
  let mask: boolean[];
  if (shape === "rect") {
    mask = new Array(size * size).fill(true);
  } else {
    const kept = buildCellMask(shape, size);
    if (kept === null) return null;
    mask = kept;
  }
  let minCx = size;
  let minCy = size;
  let maxCx = -1;
  let maxCy = -1;
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let cy = 0; cy < size; cy++) {
    for (let cx = 0; cx < size; cx++) {
      if (!mask[cy * size + cx]) continue;
      if (cx < minCx) minCx = cx;
      if (cx > maxCx) maxCx = cx;
      if (cy < minCy) minCy = cy;
      if (cy > maxCy) maxCy = cy;
      count++;
      sumX += 2 * cx + 1;
      sumY += 2 * cy + 1;
    }
  }
  if (count < 2 || maxCx < 0) return null;
  const bboxW = maxCx - minCx + 1;
  const bboxH = maxCy - minCy + 1;
  const maxW = (bboxW - 2 * FRAME_MIN) * 2 - 2 * PAD_LU;
  const maxH = (bboxH - 2 * FRAME_MIN) * 2 - 2 * PAD_LU;
  if (maxW <= 0 || maxH <= 0) return null;
  let word = buildTextGraph(text, { xHeight: 3 });
  let wb = graphBounds(word);
  let w = wb[2] - wb[0];
  let h = wb[3] - wb[1];
  if (!(w > 0) || !(h > 0)) return null;
  let xHeight = 3;
  if (w > maxW || h > maxH) {
    const scale = Math.min(maxW / w, maxH / h);
    xHeight = 3 * scale;
    if (xHeight < MIN_XHEIGHT) return null;
    word = buildTextGraph(text, { xHeight });
    wb = graphBounds(word);
    w = wb[2] - wb[0];
    h = wb[3] - wb[1];
    if (!(w > 0) || !(h > 0)) return null;
  }
  const W = Math.ceil((w + 2 * PAD_LU) / 2 - 0.000000001);
  const H = Math.ceil((h + 2 * PAD_LU) / 2 - 0.000000001);
  if (W < 1 || H < 1) return null;
  const centX = sumX / count;
  const centY = sumY / count;
  interface Cand {
    cx: number;
    cy: number;
    dist: number;
  }
  const cands: Cand[] = [];
  for (let cy = 0; cy + H <= size; cy++) {
    for (let cx = 0; cx + W <= size; cx++) {
      if (cx < minCx + FRAME_MIN || cy < minCy + FRAME_MIN) continue;
      if (cx + W - 1 > maxCx - FRAME_MIN || cy + H - 1 > maxCy - FRAME_MIN) {
        continue;
      }
      let ok = true;
      for (let yy = cy - 1; yy <= cy + H && ok; yy++) {
        for (let xx = cx - 1; xx <= cx + W; xx++) {
          if (xx < 0 || xx >= size || yy < 0 || yy >= size || !mask[yy * size + xx]) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;
      const holeCx = 2 * cx + W;
      const holeCy = 2 * cy + H;
      const dx = holeCx - centX;
      const dy = holeCy - centY;
      cands.push({ cx, cy, dist: dx * dx + dy * dy });
    }
  }
  cands.sort((a, b) => a.dist - b.dist || a.cy - b.cy || a.cx - b.cx);
  for (const c of cands) {
    const hole: CartoucheHole = { cx: c.cx, cy: c.cy, w: W, h: H };
    const stamped = buildCellMask(shape, size, hole);
    if (stamped === null) continue;
    if (stamped[c.cy * size + c.cx]) continue;
    return { hole, xHeight };
  }
  return null;
}

function resampleConnector(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = hypot2(b[0] - a[0], b[1] - a[1]);
    let chunks = Math.ceil(len / MAX_EDGE_LU - 0.000000001);
    if (chunks < 1) chunks = 1;
    for (let c = 1; c <= chunks; c++) {
      out.push(c === chunks ? [b[0], b[1]] : lerpPt(a, b, c / chunks));
    }
  }
  return out;
}

function freshId(graph: TangleGraph, prefix: string): string {
  let n = 0;
  while (graph.nodes.has(`${prefix}${n}`) || graph.edges.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

function splitFrameEdge(
  graph: TangleGraph,
  edgeId: string,
  junctionId: string,
  pos: Pt
): void {
  let strandIdx = -1;
  let edgeIdx = -1;
  graph.strands.forEach((s, i) => {
    const j = s.edgeIds.indexOf(edgeId);
    if (j >= 0) {
      strandIdx = i;
      edgeIdx = j;
    }
  });
  if (strandIdx < 0) throw new Error(`cartouche: edge ${edgeId} not on a strand`);
  const strand = graph.strands[strandIdx];
  const edge = graph.edges.get(edgeId)!;
  const p0 = edge.latticePoints[0];
  const p1 = edge.latticePoints[edge.latticePoints.length - 1];
  graph.nodes.set(junctionId, {
    id: junctionId,
    type: NODE_TYPE.JUNCTION,
    latticePos: [pos[0], pos[1]],
  });
  graph.adjacency.set(junctionId, []);
  const e1 = `${junctionId}_e0`;
  const e2 = `${junctionId}_e1`;
  graph.edges.set(e1, {
    id: e1,
    nodeA: edge.nodeA,
    nodeB: junctionId,
    latticePoints: [
      [p0[0], p0[1]],
      [pos[0], pos[1]],
    ],
  });
  graph.edges.set(e2, {
    id: e2,
    nodeA: junctionId,
    nodeB: edge.nodeB,
    latticePoints: [
      [pos[0], pos[1]],
      [p1[0], p1[1]],
    ],
  });
  const rm = (nodeId: string): void => {
    const list = graph.adjacency.get(nodeId)!;
    const i = list.indexOf(edgeId);
    if (i >= 0) list.splice(i, 1);
  };
  rm(edge.nodeA);
  rm(edge.nodeB);
  graph.edges.delete(edgeId);
  graph.adjacency.get(edge.nodeA)!.push(e1);
  graph.adjacency.get(junctionId)!.push(e1, e2);
  graph.adjacency.get(edge.nodeB)!.push(e2);
  strand.edgeIds.splice(edgeIdx, 1, e1, e2);
  strand.nodes.splice(edgeIdx + 1, 0, junctionId);
}

export function attachCartouche(
  graph: TangleGraph,
  text: string,
  hole: CartoucheHole,
  xHeight: number,
  junctionSpacing = 2
): [string, string] | null {
  if (!textHasGlyph(text)) return null;
  if (
    graph.nodes.has("cj_a") ||
    graph.nodes.has("cj_b") ||
    graph.nodes.has("cstart") ||
    graph.nodes.has("cend")
  ) {
    return null;
  }
  const word = buildTextGraph(text, { xHeight });
  const wb0 = graphBounds(word);
  if (!Number.isFinite(wb0[0])) return null;
  const holeX0 = 2 * hole.cx;
  const holeY0 = 2 * hole.cy;
  const holeX1 = 2 * (hole.cx + hole.w);
  const holeY1 = 2 * (hole.cy + hole.h);
  const holeCx = (holeX0 + holeX1) / 2;
  const dx = holeCx - (wb0[0] + wb0[2]) / 2;
  const dy = (holeY0 + holeY1) / 2 - (wb0[1] + wb0[3]) / 2;
  for (const n of word.nodes.values()) {
    n.latticePos = [n.latticePos[0] + dx, n.latticePos[1] + dy];
  }
  for (const e of word.edges.values()) {
    e.latticePoints = e.latticePoints.map(
      (p) => [p[0] + dx, p[1] + dy] as Pt
    );
  }
  const startNode = word.nodes.get("mentr_a");
  const endNode = word.nodes.get("mexit_a");
  if (!startNode || !endNode) return null;
  const startPos: Pt = [startNode.latticePos[0], startNode.latticePos[1]];
  const endPos: Pt = [endNode.latticePos[0], endNode.latticePos[1]];
  const entryPt: Pt = [holeX0, startPos[1]];
  const exitPt: Pt = [holeX1, endPos[1]];
  const main0 = word.strands[0];
  if (!main0 || main0.nodes.length < 2) return null;
  const secondNode = word.nodes.get(main0.nodes[1]);
  const prevNode = word.nodes.get(main0.nodes[main0.nodes.length - 2]);
  if (!secondNode || !prevNode) return null;
  const firstTan: Pt = [
    secondNode.latticePos[0] - startPos[0],
    secondNode.latticePos[1] - startPos[1],
  ];
  const lastTan: Pt = [
    endPos[0] - prevNode.latticePos[0],
    endPos[1] - prevNode.latticePos[1],
  ];
  const minSep = Math.max(2, junctionSpacing);
  // Frame candidates: every maze edge with a lattice point on the hole
  // rect's perimeter or a midpoint within 1.0 LU of the rect, ranked by
  // midpoint distance to the projected lead-in (west half) and lead-out
  // (east half) points. A candidate's spacing is its Euclidean distance
  // to the nearest junction on its own host strand (design 4.2's
  // junctions on the frame; junctions on parallel passes are ordinary
  // maze spacing). Candidates are tried in ranked order and the first
  // whose connector crosses nothing wins, preferring one that also
  // keeps the spacing: on swept seeds the nearest inner-pass edges
  // keep less than 2 LU from a host junction, and the first
  // spacing-keeping edge is on the outer pass, whose connector must
  // cross the inner pass - spacing as a hard gate and the crossing
  // assertion together leave no attach at all there.
  interface FCand {
    edgeId: string;
    mid: Pt;
    dEntry: number;
    dExit: number;
    clear: number;
  }
  const cands: FCand[] = [];
  for (const e of graph.edges.values()) {
    const lp = e.latticePoints;
    if (lp.length < 2) continue;
    const mid: Pt = [
      (lp[0][0] + lp[lp.length - 1][0]) / 2,
      (lp[0][1] + lp[lp.length - 1][1]) / 2,
    ];
    const rdx = Math.max(holeX0 - mid[0], 0, mid[0] - holeX1);
    const rdy = Math.max(holeY0 - mid[1], 0, mid[1] - holeY1);
    let onPerim = false;
    for (const p of lp) {
      const onVert =
        (Math.abs(p[0] - holeX0) < 0.000000001 ||
          Math.abs(p[0] - holeX1) < 0.000000001) &&
        p[1] >= holeY0 - 0.000000001 &&
        p[1] <= holeY1 + 0.000000001;
      const onHoriz =
        (Math.abs(p[1] - holeY0) < 0.000000001 ||
          Math.abs(p[1] - holeY1) < 0.000000001) &&
        p[0] >= holeX0 - 0.000000001 &&
        p[0] <= holeX1 + 0.000000001;
      if (onVert || onHoriz) onPerim = true;
    }
    if (!onPerim && hypot2(rdx, rdy) > 1.0) continue;
    const host = graph.strands.find((s) => s.edgeIds.includes(e.id));
    if (!host) continue;
    let clear = Infinity;
    for (const id of host.nodes) {
      const n = graph.nodes.get(id);
      if (!n || n.type !== NODE_TYPE.JUNCTION) continue;
      const d = hypot2(mid[0] - n.latticePos[0], mid[1] - n.latticePos[1]);
      if (d < clear) clear = d;
    }
    cands.push({
      edgeId: e.id,
      mid,
      dEntry: hypot2(mid[0] - entryPt[0], mid[1] - entryPt[1]),
      dExit: hypot2(mid[0] - exitPt[0], mid[1] - exitPt[1]),
      clear,
    });
  }
  const mazeSegs: Array<[Pt, Pt]> = [];
  for (const e of graph.edges.values()) {
    for (let i = 0; i + 1 < e.latticePoints.length; i++) {
      mazeSegs.push([e.latticePoints[i], e.latticePoints[i + 1]]);
    }
  }
  const wordSegs: Array<[Pt, Pt]> = [];
  for (const e of word.edges.values()) {
    for (let i = 0; i + 1 < e.latticePoints.length; i++) {
      wordSegs.push([e.latticePoints[i], e.latticePoints[i + 1]]);
    }
  }
  const crossesAny = (pts: Pt[]): boolean => {
    for (let i = 0; i + 1 < pts.length; i++) {
      for (const [c, d] of mazeSegs) {
        if (properIntersect(pts[i], pts[i + 1], c, d)) return true;
      }
      for (const [c, d] of wordSegs) {
        if (properIntersect(pts[i], pts[i + 1], c, d)) return true;
      }
    }
    return false;
  };
  const byId = (a: FCand, b: FCand): number =>
    a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0;
  const west = cands
    .filter((c) => c.mid[0] < holeCx)
    .sort((a, b) => a.dEntry - b.dEntry || byId(a, b));
  const east = cands
    .filter((c) => c.mid[0] >= holeCx)
    .sort((a, b) => a.dExit - b.dExit || byId(a, b));
  const leadInFor = (mid: Pt): Pt[] => [
    mid,
    ...hermitePts(mid, [1, 0], startPos, firstTan),
    startPos,
  ];
  const leadOutFor = (mid: Pt): Pt[] => [
    endPos,
    ...hermitePts(endPos, lastTan, mid, [1, 0]),
    mid,
  ];
  const choose = (
    list: FCand[],
    make: (mid: Pt) => Pt[],
    other: Pt | null
  ): { cand: FCand; pts: Pt[] } | null => {
    let firstOk: { cand: FCand; pts: Pt[] } | null = null;
    for (const c of list) {
      if (
        other !== null &&
        hypot2(c.mid[0] - other[0], c.mid[1] - other[1]) <
          minSep - 0.000000001
      ) {
        continue;
      }
      const pts = make(c.mid);
      if (crossesAny(pts)) continue;
      const hit = { cand: c, pts };
      if (c.clear >= minSep - 0.000000001) return hit;
      if (firstOk === null) firstOk = hit;
    }
    return firstOk;
  };
  const westHit = choose(west, leadInFor, null);
  if (westHit === null) return null;
  const eastHit = choose(east, leadOutFor, westHit.cand.mid);
  if (eastHit === null || eastHit.cand.edgeId === westHit.cand.edgeId) {
    return null;
  }
  const westPick = westHit.cand;
  const eastPick = eastHit.cand;
  const cjA: Pt = [westPick.mid[0], westPick.mid[1]];
  const cjB: Pt = [eastPick.mid[0], eastPick.mid[1]];
  const leadInRaw: Pt[] = westHit.pts;
  const leadOutRaw: Pt[] = eastHit.pts;

  renameGraphNode(word, "mentr_a", "cstart");
  renameGraphNode(word, "mexit_a", "cend");
  for (const id of [...word.nodes.keys()]) {
    if (id === "cstart" || id === "cend") continue;
    if (!graph.nodes.has(id)) continue;
    let nid = `c${id}`;
    while (word.nodes.has(nid) || graph.nodes.has(nid)) nid = `c${nid}`;
    renameGraphNode(word, id, nid);
  }
  for (const eid of [...word.edges.keys()]) {
    if (!graph.edges.has(eid)) continue;
    let nid = `c${eid}`;
    while (word.edges.has(nid) || graph.edges.has(nid)) nid = `c${nid}`;
    const e = word.edges.get(eid)!;
    word.edges.delete(eid);
    e.id = nid;
    word.edges.set(nid, e);
    for (const list of word.adjacency.values()) {
      const i = list.indexOf(eid);
      if (i >= 0) list[i] = nid;
    }
    for (const s of word.strands) {
      for (let i = 0; i < s.edgeIds.length; i++) {
        if (s.edgeIds[i] === eid) s.edgeIds[i] = nid;
      }
    }
  }
  const cstart = word.nodes.get("cstart")!;
  cstart.type = NODE_TYPE.TURN;
  delete cstart.waypoint;
  const cend = word.nodes.get("cend")!;
  cend.type = NODE_TYPE.TURN;
  splitFrameEdge(graph, westPick.edgeId, "cj_a", cjA);
  splitFrameEdge(graph, eastPick.edgeId, "cj_b", cjB);
  for (const n of word.nodes.values()) graph.nodes.set(n.id, n);
  for (const n of word.nodes.values()) {
    graph.adjacency.set(n.id, (word.adjacency.get(n.id) ?? []).slice());
  }
  for (const e of word.edges.values()) graph.edges.set(e.id, e);
  const buildConnector = (
    fromId: string,
    fromPos: Pt,
    pts: Pt[],
    toId: string
  ): { edgeIds: string[]; nodeIds: string[] } => {
    const edgeIds: string[] = [];
    const nodeIds: string[] = [];
    let prevId = fromId;
    let prevPos = fromPos;
    pts.forEach((p, i) => {
      const isLast = i === pts.length - 1;
      const nodeId = isLast ? toId : freshId(graph, "ccn");
      if (!isLast) {
        graph.nodes.set(nodeId, {
          id: nodeId,
          type: NODE_TYPE.TURN,
          latticePos: [p[0], p[1]],
        });
        graph.adjacency.set(nodeId, []);
        nodeIds.push(nodeId);
      }
      const eid = freshId(graph, "cce");
      graph.edges.set(eid, {
        id: eid,
        nodeA: prevId,
        nodeB: nodeId,
        latticePoints: [
          [prevPos[0], prevPos[1]],
          [p[0], p[1]],
        ],
      });
      graph.adjacency.get(prevId)!.push(eid);
      graph.adjacency.get(nodeId)!.push(eid);
      edgeIds.push(eid);
      prevId = nodeId;
      prevPos = p;
    });
    return { edgeIds, nodeIds };
  };
  const leadIn = buildConnector(
    "cj_a",
    cjA,
    resampleConnector(leadInRaw),
    "cstart"
  );
  const leadOut = buildConnector(
    "cend",
    endPos,
    resampleConnector(leadOutRaw),
    "cj_b"
  );
  for (const s of word.strands) graph.strands.push(s);
  const main = word.strands[0];
  main.edgeIds = [...leadIn.edgeIds, ...main.edgeIds, ...leadOut.edgeIds];
  main.nodes = [
    "cj_a",
    ...leadIn.nodeIds,
    ...main.nodes,
    ...leadOut.nodeIds,
    "cj_b",
  ];
  return ["cj_a", "cj_b"];
}

// Over/under: run-phase parity solver (design section 3.5)
// ---------------------------------------------------------------------------

// K115 stage 5a: exported for the emblem builder (emblem_graph.ts), which
// reuses this solver for closed strands; its text call site is unchanged.
// Returns the accepted-conflict count (0 = perfectly alternating phases
// exist); the solver still assigns best-effort phases when it is not 0.
export function assignOverUnder(graph: TangleGraph): number {
  // Runs: maximal strand spans between JUNCTION / END stops.
  interface Pass {
    strand: number;
    index: number;
    run: number;
    k: number;
  }
  const passesByNode = new Map<string, Pass[]>();
  let runCount = 0;

  graph.strands.forEach((strand, si) => {
    const unique = strand.isClosed ? strand.nodes.length - 1 : strand.nodes.length;
    const typeAt = (i: number): string => graph.nodes.get(strand.nodes[i])!.type;
    const stops: number[] = [];
    for (let i = 0; i < unique; i++) {
      if (typeAt(i) === NODE_TYPE.JUNCTION || typeAt(i) === NODE_TYPE.END) stops.push(i);
    }
    const runOf = new Array<number>(unique).fill(-1);
    const kOf = new Array<number>(unique).fill(0);
    const assignRun = (idxs: number[]): void => {
      const run = runCount++;
      let k = 0;
      for (const i of idxs) {
        runOf[i] = run;
        if (typeAt(i) === NODE_TYPE.CROSSING) kOf[i] = k++;
      }
    };
    if (!strand.isClosed) {
      if (stops.length < 2) {
        assignRun(strand.nodes.map((_, i) => i).slice(0, unique));
      } else {
        for (let s = 0; s + 1 < stops.length; s++) {
          const idxs: number[] = [];
          for (let i = stops[s]; i <= stops[s + 1]; i++) idxs.push(i);
          assignRun(idxs);
        }
      }
    } else if (stops.length === 0) {
      const idxs: number[] = [];
      for (let i = 0; i < unique; i++) idxs.push(i);
      assignRun(idxs);
    } else {
      // Rotate so the order starts at the first stop; runs follow, and the
      // last run wraps around the seam back to that stop.
      const order: number[] = [];
      for (let k = 0; k < unique; k++) order.push((stops[0] + k) % unique);
      const stopSet = new Set(stops);
      let cur: number[] = [order[0]];
      for (let k = 1; k < order.length; k++) {
        cur.push(order[k]);
        if (stopSet.has(order[k])) {
          assignRun(cur);
          cur = [order[k]];
        }
      }
      if (cur.length > 1) {
        cur.push(order[0]);
        assignRun(cur);
      }
    }
    for (let i = 0; i < unique; i++) {
      if (typeAt(i) !== NODE_TYPE.CROSSING) continue;
      const id = strand.nodes[i];
      const pass: Pass = { strand: si, index: i, run: runOf[i], k: kOf[i] };
      const list = passesByNode.get(id);
      if (list) list.push(pass);
      else passesByNode.set(id, [pass]);
    }
  });

  // Parity union-find over runs.
  const parent = new Array<number>(runCount);
  const parity = new Array<number>(runCount).fill(0);
  const size = new Array<number>(runCount).fill(1);
  for (let i = 0; i < runCount; i++) parent[i] = i;
  const find = (x: number): { root: number; par: number } => {
    let root = x;
    let acc = 0;
    while (parent[root] !== root) {
      acc = acc ^ parity[root];
      root = parent[root];
    }
    // Path compression with parity.
    let node = x;
    let suffix = 0;
    while (parent[node] !== root) {
      const nxt = parent[node];
      const p = parity[node];
      parity[node] = acc ^ suffix;
      parent[node] = root;
      suffix = suffix ^ p;
      node = nxt;
    }
    return { root, par: acc };
  };
  let conflicts = 0;
  const union = (a: number, b: number, rhs: number): void => {
    const fa = find(a);
    const fb = find(b);
    if (fa.root === fb.root) {
      if ((fa.par ^ fb.par) !== rhs) conflicts++;
      return;
    }
    // Attach the smaller tree under the larger; tie: b under a.
    if (size[fa.root] < size[fb.root]) {
      parent[fa.root] = fb.root;
      parity[fa.root] = fa.par ^ fb.par ^ rhs;
      size[fb.root] += size[fa.root];
    } else {
      parent[fb.root] = fa.root;
      parity[fb.root] = fa.par ^ fb.par ^ rhs;
      size[fa.root] += size[fb.root];
    }
  };

  const crossingIds: string[] = [];
  for (const [id, node] of graph.nodes) {
    if (node.type === NODE_TYPE.CROSSING) crossingIds.push(id);
  }
  for (const id of crossingIds) {
    const passes = passesByNode.get(id) ?? [];
    if (passes.length !== 2) continue;
    const rhs = 1 ^ (passes[0].k & 1) ^ (passes[1].k & 1);
    union(passes[0].run, passes[1].run, rhs);
  }
  // Accepted where parity is unsatisfiable (design 3.5); returned for tests.

  for (const id of crossingIds) {
    const node = graph.nodes.get(id)!;
    const passes = passesByNode.get(id) ?? [];
    if (passes.length !== 2) {
      node.overFirst = true;
      node.isOver = false;
      continue;
    }
    const phi = (run: number): number => find(run).par; // Root phase is 0.
    const overBit = (pass: Pass): number => phi(pass.run) ^ (pass.k & 1) ^ 1;
    const firstOver = overBit(passes[0]) === 1;
    node.overFirst = firstOver;
    // Slash reading: agree with overFirst wherever the two passes fall in
    // different slash classes (the only case the old reading can express).
    const overPass = firstOver ? passes[0] : passes[1];
    const strand = graph.strands[overPass.strand];
    const edge = graph.edges.get(strand.edgeIds[overPass.index]);
    let isSlash = false;
    if (edge && edge.latticePoints.length >= 2) {
      const lp = edge.latticePoints;
      const fwd = edge.nodeA === strand.nodes[overPass.index];
      const a = fwd ? lp[0] : lp[lp.length - 1];
      const b = fwd ? lp[1] : lp[lp.length - 2];
      isSlash = (b[0] - a[0]) * (b[1] - a[1]) > 0;
    }
    node.isOver = isSlash;
  }
  return conflicts;
}

