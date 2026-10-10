// P4 section coloring: assign every stretch of thread a SECTION COLOR
// COORDINATE v in [0, 1] - an index into a bounded color gamut (the
// renderer's 2D palette rows) - as piecewise-linear functions of chain
// ctrl. Pure combinatorics: schemes are deterministic from (graph, walk,
// seed), per URL-as-complete-state.
//
// THE BLENDING CONTRACT: at a junction several runs meet, and their colors
// must transition smoothly through it in every direction. Each junction
// gets ONE converged coordinate vJ, and every incident run ramps from its
// own color to vJ over the last RAMP_CTRL of ctrl - so any number of arms
// always meet in a single shared color. Schemes whose field is already
// continuous across junctions (depth) need no ramps; the renderer's
// bilinearly-filtered palette turns these v functions into smooth pigment.

import type { WalkGraph } from "./walk_graph";

export type ColorScheme = "mono" | "strands" | "depth" | "segments" | "noise";

export const COLOR_SCHEMES: ColorScheme[] = [
  "mono",
  "strands",
  "depth",
  "segments",
  "noise",
];

// One piecewise-linear piece of a chain's v(ctrl) function.
export interface VSegment {
  c0: number; // Ctrl span, unwrapped (sampled modulo chain length).
  c1: number;
  v0: number;
  v1: number;
}

// Ramp length at each end of a discontinuous run (ctrl units; ~1.2 world).
const RAMP_CTRL = 2.4;

// Deterministic hash -> [0, 1) for per-run colors.
function hash01(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ((h >>> 8) & 0xffffff) / 0x1000000;
}

// Build per-chain v(ctrl) segment lists. `chainLens` are the physics chain
// lengths (slot counts); `chainClosed` mirrors strand closedness. The
// "noise" scheme returns EMPTY lists - the renderer evaluates it spatially
// per sample instead (it is continuous everywhere, junctions included).
export function buildSectionField(
  scheme: ColorScheme,
  walk: WalkGraph | null,
  chainLens: number[],
  hueGroup: number[] | undefined,
  seed: number
): VSegment[][] {
  const nChains = chainLens.length;
  const field: VSegment[][] = chainLens.map(() => []);
  if (scheme === "noise") return field;

  const chainConst = (chain: number): number => {
    if (scheme === "mono") return 0.5;
    if (scheme === "strands") {
      const slot = hueGroup?.[chain] ?? chain;
      return (slot * 0.618034) % 1;
    }
    // depth/segments fallback for chains outside the walk graph
    // (decorative culled loops, knot mode).
    if (scheme === "segments") return hash01(`chain${chain}`, seed);
    return 0.5;
  };

  if (scheme === "mono" || !walk) {
    for (let c = 0; c < nChains; c++) {
      field[c].push({ c0: 0, c1: chainLens[c], v0: chainConst(c), v1: chainConst(c) });
    }
    return field;
  }

  // Per-vertex converged color vJ.
  const vJ = new Map<string, number>();
  if (scheme === "depth") {
    // Distance from the START (Dijkstra over the walk multigraph; the
    // graph ships distToExit, so run the mirror from the start).
    const dist = new Map<string, number>();
    for (const id of walk.vertices.keys()) dist.set(id, Infinity);
    dist.set(walk.start, 0);
    const done = new Set<string>();
    for (;;) {
      let cur: string | null = null;
      let curD = Infinity;
      for (const [id, d] of dist) {
        if (done.has(id) || d === Infinity) continue;
        if (d < curD || (d === curD && cur !== null && id < cur)) {
          curD = d;
          cur = id;
        }
      }
      if (cur === null) break;
      done.add(cur);
      for (const eid of walk.vertices.get(cur)!.edges) {
        const e = walk.edges[eid];
        const other = e.va === cur ? e.vb : e.va;
        const nd = curD + e.length;
        if (nd < dist.get(other)!) dist.set(other, nd);
      }
    }
    let maxD = 0;
    for (const d of dist.values()) {
      if (Number.isFinite(d) && d > maxD) maxD = d;
    }
    for (const [id, d] of dist) {
      vJ.set(id, Number.isFinite(d) && maxD > 0 ? d / maxD : 1);
    }
  } else {
    // Run colors. GAMUT LOCALITY IS LOAD-BEARING: v blends sweep the gamut
    // PATH between two values, so adjacent sections must sit close on the
    // gamut or junction ramps render as rainbow stripes instead of direct
    // blends. segments therefore PROPAGATES colors as a bounded random
    // walk over the maze (BFS from the entrance, steps of at most
    // +/-0.18), covering the full gamut globally while every local
    // transition stays between neighboring colors.
    const reflect = (x: number): number => {
      let y = x;
      if (y < 0) y = -y;
      if (y > 1) y = 2 - y;
      return Math.max(0, Math.min(1, y));
    };
    const runV = walk.edges.map((e) => chainConst(e.chain));
    if (scheme === "segments") {
      runV.fill(-1);
      const queue: Array<{ eid: number; from: number }> = [];
      const seedV = hash01("origin", seed);
      for (const eid of walk.vertices.get(walk.start)?.edges ?? []) {
        queue.push({ eid, from: seedV });
      }
      for (let h = 0; h < queue.length; h++) {
        const { eid, from } = queue[h];
        if (runV[eid] >= 0) continue;
        const step = (hash01(`run${eid}`, seed) - 0.5) * 0.36;
        runV[eid] = reflect(from + step);
        const e = walk.edges[eid];
        for (const vid of [e.va, e.vb]) {
          for (const nb of walk.vertices.get(vid)!.edges) {
            if (runV[nb] < 0) queue.push({ eid: nb, from: runV[eid] });
          }
        }
      }
      for (let i = 0; i < runV.length; i++) {
        if (runV[i] < 0) runV[i] = hash01(`orphan${i}`, seed);
      }
    }
    for (const [id, v] of walk.vertices) {
      if (scheme === "strands") {
        // The through-thread keeps its color across the junction; bridges
        // carry the whole transition along their own length.
        vJ.set(id, chainConst(v.chain));
        continue;
      }
      let sum = 0;
      let n = 0;
      for (const eid of v.edges) {
        sum += runV[eid];
        n++;
        if (walk.edges[eid].va === id && walk.edges[eid].vb === id) {
          sum += runV[eid]; // Self-loops touch twice.
          n++;
        }
      }
      vJ.set(id, n > 0 ? sum / n : 0.5);
    }
    // Emit ramped runs.
    const covered = chainLens.map(() => [] as Array<[number, number]>);
    for (const e of walk.edges) {
      const va = vJ.get(e.va)!;
      const vb = vJ.get(e.vb)!;
      const mid = runV[e.id];
      const span = e.ctrlB - e.ctrlA;
      const r = Math.min(RAMP_CTRL, span / 2.5);
      const segs = field[e.chain];
      segs.push({ c0: e.ctrlA, c1: e.ctrlA + r, v0: va, v1: mid });
      segs.push({ c0: e.ctrlA + r, c1: e.ctrlB - r, v0: mid, v1: mid });
      segs.push({ c0: e.ctrlB - r, c1: e.ctrlB, v0: mid, v1: vb });
      covered[e.chain].push([e.ctrlA, e.ctrlB]);
    }
    // Chains (or chain stretches) outside the walk keep a constant color.
    for (let c = 0; c < nChains; c++) {
      if (field[c].length === 0) {
        field[c].push({ c0: 0, c1: chainLens[c], v0: chainConst(c), v1: chainConst(c) });
      }
    }
    for (const segs of field) segs.sort((p, q) => p.c0 - q.c0);
    return field;
  }

  // depth: every run interpolates its junction values directly (the field
  // is continuous across junctions by construction - no ramps).
  for (const e of walk.edges) {
    field[e.chain].push({
      c0: e.ctrlA,
      c1: e.ctrlB,
      v0: vJ.get(e.va)!,
      v1: vJ.get(e.vb)!,
    });
  }
  for (let c = 0; c < nChains; c++) {
    if (field[c].length === 0) {
      field[c].push({ c0: 0, c1: chainLens[c], v0: 1, v1: 1 });
    }
  }
  for (const segs of field) segs.sort((p, q) => p.c0 - q.c0);
  return field;
}
