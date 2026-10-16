import { describe, it, expect } from "vitest";
import {
  ARRIVAL_BIAS,
  coveredByDot,
  pickRun,
} from "../../src/game/tap_pick";
import type { RunReach } from "../../src/game/tap_pick";

// K479: which run a tap takes. The arrival run (a tap on it backtracks)
// must be clearly nearer than the nearest outgoing run; `reach` lists the
// runs within the pick radius with their distances, `halfWidth` is half the
// thread (0 = a plain centerline ratio).

const HW = 0.26; // Half of the default 0.52 thread width (world).
const r = (eid: number, d: number): RunReach => ({ eid, d });

describe("pickRun (K479)", () => {
  it("takes nothing when no run is in reach", () => {
    expect(pickRun([], -1)).toBe(-1);
    expect(pickRun([], 3)).toBe(-1);
  });

  it("has no bias without an arrival run: the nearest wins, the first listed on a tie", () => {
    expect(pickRun([r(4, 0.5), r(9, 0.3), r(2, 0.3)], -1)).toBe(9);
    expect(pickRun([r(4, 0.5)], -1, ARRIVAL_BIAS, HW)).toBe(4);
    // However large the bias, with no arrival run it changes nothing.
    expect(pickRun([r(4, 0.5), r(9, 0.45)], -1, 100)).toBe(9);
  });

  it("keeps the arrival run to a stricter pick: it must be bias times nearer", () => {
    // Centerline ratio (halfWidth 0), bias 1.5: 1.0 * 1.5 < d.
    expect(pickRun([r(0, 1.0), r(1, 1.6)], 0, 1.5)).toBe(0);
    expect(pickRun([r(0, 1.0), r(1, 1.5)], 0, 1.5)).toBe(1); // an exact tie
    expect(pickRun([r(0, 1.0), r(1, 1.4)], 0, 1.5)).toBe(1);
    // The same toss-up as the old nearest pick, in either order of listing.
    expect(pickRun([r(1, 1.4), r(0, 1.0)], 0, 1.5)).toBe(1);
    // The default bias is 1.5.
    expect(ARRIVAL_BIAS).toBe(1.5);
    expect(pickRun([r(0, 1.0), r(1, 1.6)], 0)).toBe(0);
    expect(pickRun([r(0, 1.0), r(1, 1.4)], 0)).toBe(1);
  });

  it("gives an outgoing run that is nearer the tap whatever the bias", () => {
    expect(pickRun([r(0, 0.5), r(1, 0.4)], 0, 1.5, HW)).toBe(1);
    expect(pickRun([r(0, 0.5), r(1, 0.5)], 0, 1, HW)).toBe(1); // ties go outgoing
    expect(pickRun([r(0, 0.5), r(1, 0.4)], 0, 1, HW)).toBe(1);
  });

  it("measures against the nearest outgoing run, not each of them", () => {
    // 1.0 * 1.5 < 1.7 would win, but another outgoing run sits at 1.2.
    expect(pickRun([r(0, 1.0), r(5, 1.7), r(6, 1.2)], 0, 1.5)).toBe(6);
    // The first outgoing run wins among the outgoing ones on a tie.
    expect(pickRun([r(5, 0.3), r(6, 0.3), r(0, 0.9)], 0, 1.5)).toBe(5);
  });

  it("lets the arrival run alone in reach take the tap, however far along it", () => {
    expect(pickRun([r(7, 0.01)], 7, 1.5, HW)).toBe(7);
    expect(pickRun([r(7, 0.88)], 7, 1.5, HW)).toBe(7);
    expect(pickRun([r(7, 0.88)], 7, 100, HW)).toBe(7);
  });

  it("gives the tap to an outgoing run when the arrival run is out of reach", () => {
    expect(pickRun([r(2, 0.8), r(3, 0.85)], 7, 1.5, HW)).toBe(2);
    expect(pickRun([r(3, 0.85)], 7)).toBe(3);
  });

  it("measures past the drawn edge: inside only the arrival ribbon it keeps the tap", () => {
    // 0.2 from the arrival centerline (inside its 0.26 half-width), 0.3
    // from the outgoing one (just outside): the ribbon the tap is in.
    expect(pickRun([r(0, 0.2), r(1, 0.3)], 0, 1.5, HW)).toBe(0);
    // A plain centerline ratio would hand it to the outgoing run (0.3 is
    // not 1.5 times the 0.2): the invariant the edge distance exists for.
    expect(pickRun([r(0, 0.2), r(1, 0.3)], 0, 1.5, 0)).toBe(1);
    // And the other way: inside only the outgoing ribbon, it keeps it.
    expect(pickRun([r(0, 0.3), r(1, 0.2)], 0, 1.5, HW)).toBe(1);
  });

  it("gives a tap inside both ribbons (the arms overlap) to the outgoing run", () => {
    expect(pickRun([r(0, 0.1), r(1, 0.25)], 0, 1.5, HW)).toBe(1);
    expect(pickRun([r(0, 0.05), r(1, 0.2)], 0, 1.5, HW)).toBe(1);
    expect(pickRun([r(0, 0), r(1, 0)], 0, 1.5, HW)).toBe(1);
  });

  it("makes the arrival run bias times nearer to its edge in the margin around them", () => {
    // 0.10 past the arrival edge against 0.17 past the outgoing one:
    // 0.10 * 1.5 = 0.15 < 0.17.
    expect(pickRun([r(0, 0.36), r(1, 0.43)], 0, 1.5, HW)).toBe(0);
    // Against 0.12: 0.15 > 0.12.
    expect(pickRun([r(0, 0.36), r(1, 0.38)], 0, 1.5, HW)).toBe(1);
    // Outside the arrival ribbon, inside the outgoing one: outgoing.
    expect(pickRun([r(0, 0.31), r(1, 0.2)], 0, 1.5, HW)).toBe(1);
  });

  it("holds a self-loop arrival run, listed once (as choices() lists it), to the same pick", () => {
    // 0.3 * 1.5 = 0.45 < 0.5: the loop; 0.4 * 1.5 = 0.6: the other arm.
    expect(pickRun([r(7, 0.3), r(2, 0.5)], 7, 1.5, 0)).toBe(7);
    expect(pickRun([r(7, 0.4), r(2, 0.5)], 7, 1.5, 0)).toBe(2);
    expect(pickRun([r(7, 0.4)], 7, 1.5, 0)).toBe(7);
  });

  it("takes a self-loop arrival run's nearest distance when it is listed twice", () => {
    const loopTwice = [r(7, 0.4), r(7, 0.3), r(2, 0.5)];
    // The nearest end (0.3 * 1.5 = 0.45 < 0.5) wins; the far end alone
    // (0.4 * 1.5 = 0.6) would not.
    expect(pickRun(loopTwice, 7, 1.5, 0)).toBe(7);
    expect(pickRun([r(7, 0.4), r(2, 0.5)], 7, 1.5, 0)).toBe(2);
    // The same loop alone in reach, twice, takes the tap.
    expect(pickRun([r(7, 0.4), r(7, 0.3)], 7, 1.5, HW)).toBe(7);
  });

  it("lets a bias of 1 reproduce the nearest pick, ties to the outgoing run", () => {
    expect(pickRun([r(0, 0.4), r(1, 0.5)], 0, 1, 0)).toBe(0);
    expect(pickRun([r(0, 0.5), r(1, 0.5)], 0, 1, 0)).toBe(1);
    expect(pickRun([r(0, 0.6), r(1, 0.5)], 0, 1, 0)).toBe(1);
  });
});

describe("mid-move (K479): the stretch the dot has covered", () => {
  it("covers from the departure end up to the dot, entered from the A end", () => {
    // A move along a run of ctrl 0..12 with the dot at 3.2.
    expect(coveredByDot(0, 3.2, 0)).toBe(true);
    expect(coveredByDot(0, 3.2, 1.75)).toBe(true);
    expect(coveredByDot(0, 3.2, 3.2)).toBe(true);
    expect(coveredByDot(0, 3.2, 3.25)).toBe(false);
    expect(coveredByDot(0, 3.2, 12)).toBe(false);
  });

  it("covers from the departure end up to the dot, entered from the B end", () => {
    // The same run walked from its B end: departs at 12, the dot at 8.8.
    expect(coveredByDot(12, 8.8, 12)).toBe(true);
    expect(coveredByDot(12, 8.8, 10)).toBe(true);
    expect(coveredByDot(12, 8.8, 8.8)).toBe(true);
    expect(coveredByDot(12, 8.8, 8.75)).toBe(false);
    expect(coveredByDot(12, 8.8, 0)).toBe(false);
  });

  it("covers only the departure point when the dot has just left", () => {
    expect(coveredByDot(4, 4, 4)).toBe(true);
    expect(coveredByDot(4, 4, 4.25)).toBe(false);
    expect(coveredByDot(4, 4, 3.75)).toBe(false);
  });

  it("covers a self-loop run, swept from A to B, like any other", () => {
    expect(coveredByDot(2, 5, 4.5)).toBe(true);
    expect(coveredByDot(2, 5, 6)).toBe(false);
  });

  // The renderer's measuring half in miniature: the samples of the arrival
  // run the dot has not covered do not count, so the run may drop out of
  // reach and an outgoing run wins where the arrival run would have.
  function arrivalReach(
    cur: number,
    nearestCtrl: number,
    maxD: number
  ): RunReach[] {
    // A straight arrival run, ctrl 0..4 sampled every 0.25, 0.5 world per
    // ctrl; the tap sits 0.1 off the run, level with ctrl `nearestCtrl`.
    let best = Infinity;
    for (let c = 0; c <= 4; c += 0.25) {
      if (!coveredByDot(0, cur, c)) continue;
      const along = (c - nearestCtrl) * 0.5;
      best = Math.min(best, Math.hypot(along, 0.1));
    }
    return best < maxD ? [r(7, best)] : [];
  }

  it("makes the stretch ahead of the dot empty space for an outgoing run to win", () => {
    const maxD = 0.5;
    const outgoing = r(2, 0.45);
    // The dot has gone 1.5 ctrl; the tap is level with ctrl 3, on the
    // stretch still ahead: the arrival run is out of reach, the outgoing
    // run takes the tap (it would be the arrival run, backtracking, if the
    // whole run counted).
    const ahead = arrivalReach(1.5, 3, maxD);
    expect(ahead).toEqual([]);
    expect(pickRun([...ahead, outgoing], 7, 1.5, HW)).toBe(2);
    expect(pickRun([r(7, 0.1), outgoing], 7, 1.5, HW)).toBe(7);
    // A tap level with ctrl 1, on the covered stretch, is still a backtrack.
    const behind = arrivalReach(1.5, 1, maxD);
    expect(behind.length).toBe(1);
    expect(pickRun([...behind, outgoing], 7, 1.5, HW)).toBe(7);
  });

  it("leaves the arrival run alone in reach to take a tap on the covered stretch", () => {
    expect(pickRun(arrivalReach(3, 2, 0.5), 7, 1.5, HW)).toBe(7);
    // And nothing on the uncovered stretch when there is no outgoing run.
    expect(pickRun(arrivalReach(1, 3.5, 0.5), 7, 1.5, HW)).toBe(-1);
  });
});
