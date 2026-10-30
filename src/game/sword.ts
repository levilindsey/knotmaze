// K137 stage 3b (design 4.7): the sword. Free play, both clocks; brief
// docs/design/K137_s3b.md ("Design").
//
// WHERE IT LIES (swordSpot): a vertex SWORD_RING_MIN..MAX (4-8) runs off
// the optimal route (a multi-source BFS in runs from every vertex of one
// shortest start-exit route), never the start, the exit or either tail's
// junction, and never near the lair: `avoid` names run hops and/or thread
// distance around the exit tail's junction (1 hop for the hunter and the
// stalker; the guard's territory). Dead-end tips first (a dead end with a
// reward), else junctions; the candidates sorted by vertex index, one drawn
// from the sword's own counter stream (TurnRng on the seed xor "SWRD"), so
// no other draw shifts. None in range: no sword. Render-only: the maze does
// not change.
//
// WHAT IT DOES (SwordState, shared by both clocks): arriving on its spot
// takes it (ready -> fleeing, left = moves); while it flees the minotaur
// steps away from you and a touch is no catch: timed banishes it to its
// lair (the sword is spent: used), one-use slays it for the rest of the
// attempt (slain, slainAt = the move). The flee runs down per accepted
// move on the turn clock (a wait included) and per run walked in real time
// (s3a call 3); at 0 the sword is spent (used).

import type { ChaseGraph } from "./minotaur";
import { TurnRng } from "./minotaur_turns";

export type SwordMode = "off" | "timed" | "oneuse";
export const SWORD_MODES: readonly SwordMode[] = ["off", "timed", "oneuse"];
export const SWORD_MOVES_MIN = 4;
export const SWORD_MOVES_MAX = 20;
export const SWORD_MOVES_DEFAULT = 8;
// Runs off the optimal route the sword may lie.
export const SWORD_RING_MIN = 4;
export const SWORD_RING_MAX = 8;
// K807: the sword ring params' range (runs).
export const SWORD_RING_PARAM_MIN = 0;
export const SWORD_RING_PARAM_MAX = 12;

// A sword ring param's value (garbage: the constant named by `fallback`).
export function swordRingOf(n: unknown, fallback: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(SWORD_RING_PARAM_MIN, Math.min(SWORD_RING_PARAM_MAX, Math.round(n)));
}
// The sword's own stream ("SWRD").
export const SWORD_SALT = 0x53575244;

export type SwordPhase = "ready" | "fleeing" | "used" | "slain";

export interface SwordState {
  readonly spot: number; // Vertex index (ChaseGraph = TurnGraph order).
  readonly mode: "timed" | "oneuse";
  readonly moves: number; // The flee's length: moves (turns) or runs walked.
  phase: SwordPhase;
  left: number; // Flee moves left while fleeing.
  takenAt: number; // The move it was taken on (1-based); -1 before.
  slainAt: number; // The move it slew the minotaur on; -1 otherwise.
  banished: number; // Timed: banishes (0 or 1: a banish spends it).
}

export function swordMovesOf(n: number): number {
  if (!Number.isFinite(n)) return SWORD_MOVES_DEFAULT;
  return Math.min(SWORD_MOVES_MAX, Math.max(SWORD_MOVES_MIN, Math.round(n)));
}

export function newSword(spot: number, mode: "timed" | "oneuse", moves: number): SwordState {
  return { spot, mode, moves: swordMovesOf(moves), phase: "ready", left: 0, takenAt: -1, slainAt: -1, banished: 0 };
}

export function swordFleeing(s: SwordState | null): boolean {
  return s !== null && s.phase === "fleeing";
}

// Arriving on the spot with the sword still there takes it.
export function swordTake(s: SwordState | null, at: number, move: number): boolean {
  if (s === null || s.phase !== "ready" || at !== s.spot) return false;
  s.phase = "fleeing";
  s.left = s.moves;
  s.takenAt = move;
  return true;
}

// One flee move spent; at 0 the sword is spent.
export function swordSpend(s: SwordState | null): void {
  if (s === null || s.phase !== "fleeing") return;
  s.left = Math.max(0, s.left - 1);
  if (s.left === 0) s.phase = "used";
}

// A touch while it flees: timed banishes (and spends the sword), one-use
// slays it.
export function swordTouch(s: SwordState, move: number): "banish" | "slay" {
  if (s.mode === "oneuse") {
    s.phase = "slain";
    s.slainAt = move;
    s.left = 0;
    return "slay";
  }
  s.phase = "used";
  s.left = 0;
  s.banished++;
  return "banish";
}

export interface SwordAvoid {
  hops?: number; // Run hops around the exit tail's junction to keep clear.
  dist?: number; // Thread distance around it to keep clear.
}

// The junction at a tail's inner end (-1: none).
export function tailJunction(g: ChaseGraph, end: number): number {
  const a = g.adj[end];
  if (!a || a.length === 0) return -1;
  const e = a[0];
  return g.ea[e] === end ? g.eb[e] : g.ea[e];
}

// One shortest start-exit route's vertices (ties: the lowest run id).
export function optimalRouteVertices(g: ChaseGraph): number[] {
  const dist = g.from(g.exit, false);
  if (!Number.isFinite(dist[g.start])) return [];
  const out = [g.start];
  let v = g.start;
  for (let guard = 0; guard < g.ids.length && v !== g.exit; guard++) {
    let next = -1;
    let best = Infinity;
    for (const e of g.adj[v]) {
      const w = g.ea[e] === v ? g.eb[e] : g.ea[e];
      if (w === v) continue;
      const slack = dist[w] + g.len[e] - dist[v];
      if (slack <= 1e-9 * Math.max(1, dist[v]) && (next < 0 || e < best)) {
        next = w;
        best = e;
      }
    }
    if (next < 0) break;
    v = next;
    out.push(v);
  }
  return out;
}

// Run hops from the sources to every vertex (all runs).
export function runHops(g: ChaseGraph, sources: readonly number[]): Int32Array {
  const hop = new Int32Array(g.ids.length).fill(-1);
  const queue: number[] = [];
  for (const s of sources) {
    if (hop[s] < 0) {
      hop[s] = 0;
      queue.push(s);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const u = queue[q];
    for (const e of g.adj[u]) {
      const w = g.ea[e] === u ? g.eb[e] : g.ea[e];
      if (hop[w] < 0) {
        hop[w] = hop[u] + 1;
        queue.push(w);
      }
    }
  }
  return hop;
}

// Where the sword lies (-1: no spot in range).
export function swordSpot(
  g: ChaseGraph,
  seed: number,
  avoid: SwordAvoid = {},
  ring: { min: number; max: number } = { min: SWORD_RING_MIN, max: SWORD_RING_MAX }
): number {
  const route = optimalRouteVertices(g);
  if (route.length === 0) return -1;
  const hop = runHops(g, route);
  const startJ = tailJunction(g, g.start);
  const exitJ = tailJunction(g, g.exit);
  const near = exitJ >= 0 && avoid.hops != null ? runHops(g, [exitJ]) : null;
  const dEx = exitJ >= 0 && avoid.dist != null ? g.from(exitJ, false) : null;
  const tips: number[] = [];
  const juncs: number[] = [];
  for (let v = 0; v < g.ids.length; v++) {
    if (v === g.start || v === g.exit || v === startJ || v === exitJ) continue;
    const h = hop[v];
    if (h < ring.min || h > ring.max) continue;
    if (near && near[v] >= 0 && near[v] <= (avoid.hops as number)) continue;
    if (dEx && dEx[v] <= (avoid.dist as number)) continue;
    (g.isEnd[v] ? tips : juncs).push(v);
  }
  const c = tips.length > 0 ? tips : juncs;
  if (c.length === 0) return -1;
  const u = new TurnRng((seed ^ SWORD_SALT) >>> 0).at(0).next();
  return c[Math.min(c.length - 1, Math.floor(u * c.length))];
}
