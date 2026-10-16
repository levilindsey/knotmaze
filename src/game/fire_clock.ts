// K114 stage 2, THE REAL-TIME FIRE's clock (fireClock = realtime; brief
// docs/design/K114_stage2.md). Pure: no render, no DOM.
//
// L = FIRE_V_REF x the fixed-step time since the first accepted move, on
// the real-time chase's step (CHASE_HZ ticks a second, at most
// MAX_STEPS_PER_ADVANCE a call, a stall's backlog dropped: game/minotaur.ts
// CLOCK). The tick count is an integer and L = ticks x FIRE_V_REF /
// CHASE_HZ, so a tick's L is the same on every device (K108). main.ts
// advances it only while the race runs (after the first move, before the
// fire reaches you or the winning move lands, the page visible) and resets
// it with the solve, so it idles until the next first move.
//
// THE DOT runs at FIRE_V_REF too (moveSpeed is unused under this clock):
// a move that leaves at L arrives at L + len, and L and the dot advance
// together while it runs. Standing still is what lets the fire close in.

import { CHASE_HZ, MAX_STEPS_PER_ADVANCE } from "./minotaur";

// Lattice units a second: the turn animation's mean pace at moveSpeed 1,
// 11.80 u/s over dailies 1-6 (3320 run directions,
// .claude/probes/K114/stage2/vref_probe.mjs), rounded.
export const FIRE_V_REF = 12;

const DT = 1 / CHASE_HZ;

// The clock at `ticks` fixed steps.
export function fireClockL(ticks: number): number {
  return (ticks * FIRE_V_REF) / CHASE_HZ;
}

export class FireClock {
  ticks = 0;
  private acc = 0;

  get L(): number {
    return fireClockL(this.ticks);
  }

  // Run the whole ticks `seconds` of wall time cover; returns how many.
  advance(seconds: number): number {
    if (!(seconds > 0)) return 0;
    this.acc += seconds;
    let n = 0;
    while (this.acc >= DT && n < MAX_STEPS_PER_ADVANCE) {
      this.acc -= DT;
      this.ticks++;
      n++;
    }
    if (this.acc >= DT) this.acc = 0; // Drop a stall's backlog.
    return n;
  }

  reset(): void {
    this.ticks = 0;
    this.acc = 0;
  }
}
