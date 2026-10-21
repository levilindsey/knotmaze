// K137 stage 1, FRAGILE RUNS (design docs/design/K80_gameplay_additions.md
// section 4.3; brief docs/design/K137_s1.md). Runs break behind the player.
// Pure: the rule, the crossing counts from a walk of taps, and the strand
// search. FabricMazeController holds the state and calls these.
//
// THE RULE IS DATA: every run has a LIMIT, the crossings it takes before it
// breaks (Infinity: it never breaks). A crossing is one completed move along
// the run, advance or backtrack alike (in trail mode every move is an
// advance). A run is BROKEN once its crossings reach its limit and CRACKED
// while it has some crossings but fewer than a finite limit above 1. The
// fragile modes set one limit for every run that is not exempt: snap 1 (it
// breaks after its first crossing), crack 2 (it cracks after the first and
// breaks after the second). K139's collapse rides the same machinery with a
// limit of 1 (breakLimits(walk, 1), or a table of its own).
//
// EXEMPT RUNS (limit Infinity):
//  - a run with an END vertex at either end: it can only be walked in and
//    back out, so breaking it would strand the player at once without a
//    choice. The start's and the exit's tails are such runs (a K80 catch
//    respawns at the start), and so is every dead-end stub's;
//  - a K115 title run: walked, but outside every maze meter.
//
// STRANDED: no route over unbroken runs from the head to the exit
// (runsToExit with the broken runs blocked). A breadth-first route never
// crosses a run twice, so a route over unbroken runs can always be walked:
// a cracked run on it is crossed once more and breaks behind the player.

import type { WalkGraph } from "../core/walk_graph";
import { runsToExit } from "../core/walk_graph";

export type FragileMode = "off" | "crack" | "snap";
export const FRAGILE_MODES: readonly FragileMode[] = ["off", "crack", "snap"];

// Crossings a run takes before it breaks, by mode (Infinity: never).
export function breakAfter(mode: FragileMode): number {
  return mode === "snap" ? 1 : mode === "crack" ? 2 : Infinity;
}

// Does the run never break (see the header's EXEMPT RUNS)?
export function exemptRun(walk: WalkGraph, eid: number): boolean {
  const e = walk.edges[eid];
  if (!e) return true;
  if (walk.titleEdges?.has(eid)) return true;
  return (walk.vertices.get(e.va)?.isEnd ?? false) || (walk.vertices.get(e.vb)?.isEnd ?? false);
}

// Per run, the crossings it takes before it breaks: `crossings` for every
// run that is not exempt, Infinity for the exempt ones (and for every run
// when `crossings` is Infinity, fragile off).
export function breakLimits(walk: WalkGraph, crossings: number): Float64Array {
  const out = new Float64Array(walk.edges.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.isFinite(crossings) && !exemptRun(walk, i) ? crossings : Infinity;
  }
  return out;
}

// The limits a fragile mode sets.
export function fragileLimits(walk: WalkGraph, mode: FragileMode): Float64Array {
  return breakLimits(walk, breakAfter(mode));
}

// Does any run break under these limits?
export function anyBreakable(limits: ArrayLike<number>): boolean {
  for (let i = 0; i < limits.length; i++) if (Number.isFinite(limits[i])) return true;
  return false;
}

// Crossings per run from a tap list: every accepted tap is one completed
// move along its run. (The controller counts them as it goes; this is the
// same count from the taps alone, for tests and the headless sims.)
export function crossingCounts(walk: WalkGraph, taps: readonly number[]): Uint32Array {
  const out = new Uint32Array(walk.edges.length);
  for (const eid of taps) if (eid >= 0 && eid < out.length) out[eid]++;
  return out;
}

export function isBroken(limits: ArrayLike<number>, crossings: ArrayLike<number>, eid: number): boolean {
  return crossings[eid] >= limits[eid];
}

export function isCracked(limits: ArrayLike<number>, crossings: ArrayLike<number>, eid: number): boolean {
  const lim = limits[eid];
  return Number.isFinite(lim) && crossings[eid] > 0 && crossings[eid] < lim;
}

// The broken runs, in id order.
export function brokenRuns(limits: ArrayLike<number>, crossings: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < limits.length; i++) if (isBroken(limits, crossings, i)) out.push(i);
  return out;
}

// The cracked runs, in id order.
export function crackedRuns(limits: ArrayLike<number>, crossings: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < limits.length; i++) if (isCracked(limits, crossings, i)) out.push(i);
  return out;
}

// Fewest unbroken runs from `head` to the exit (Infinity: stranded).
export function runsLeft(
  walk: WalkGraph,
  head: string,
  limits: ArrayLike<number>,
  crossings: ArrayLike<number>
): number {
  return runsToExit(walk, (eid) => isBroken(limits, crossings, eid)).get(head) ?? Infinity;
}

// Is there no route over unbroken runs from `head` to the exit?
export function strandedAt(
  walk: WalkGraph,
  head: string,
  limits: ArrayLike<number>,
  crossings: ArrayLike<number>
): boolean {
  return !Number.isFinite(runsLeft(walk, head, limits, crossings));
}
