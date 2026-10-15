// K99: a move stamps the fog at the same stations however it is split
// into frames. K100: a restore stamps each run in the direction it was
// traveled.
import { describe, it, expect } from "vitest";
import {
  FOG_ARC_STEP,
  type FogRun,
  fogArcStations,
  moveEnds,
  travelOrder,
} from "../../src/render/fog_arc";

// Every station of one move, its frames ending at the given points.
function stationsBy(from: number, to: number, frameEnds: number[]): number[] {
  const out: number[] = [];
  let prev = from;
  for (const cur of frameEnds) {
    out.push(...fogArcStations(from, to, prev, cur));
    prev = cur;
  }
  return out;
}

describe("fogArcStations", () => {
  it("covers a run with its grid and arrival end, in travel order", () => {
    expect(fogArcStations(10, 12.2, 10, 12.2)).toEqual([
      10.5, 11, 11.5, 12, 12.2,
    ]);
    expect(fogArcStations(12.2, 10, 12.2, 10)).toEqual([
      11.7, 11.2, 10.7, 10.2, 10,
    ].map((v) => expect.closeTo(v, 12)));
  });

  it("never stamps the departure end, and closes the run once", () => {
    expect(fogArcStations(4, 6, 4, 4.4)).toEqual([]);
    expect(fogArcStations(4, 6, 4, 6)).toEqual([4.5, 5, 5.5, 6]);
    // Already arrived: nothing left to stamp.
    expect(fogArcStations(4, 6, 6, 6)).toEqual([]);
  });

  it("is the same whatever the frame split", () => {
    const cases: Array<[number, number]> = [
      [3, 17.3],
      [40.25, 31],
      [0, 0.4],
      [7, 7.5],
    ];
    for (const [from, to] of cases) {
      const whole = fogArcStations(from, to, from, to);
      // Instant (ms=100000), 60 fps-like, irregular, frame ends exactly on
      // stations, and an overshooting last frame (the dot passes `to`).
      // The arrival frame ends at `to` exactly: tickAnim clamps it there.
      const dir = Math.sign(to - from);
      const len = Math.abs(to - from);
      const even = (n: number): number[] =>
        Array.from({ length: n }, (_, i) =>
          i === n - 1 ? to : from + (dir * len * (i + 1)) / n
        );
      const onGrid: number[] = [];
      for (let d = FOG_ARC_STEP; d < len; d += FOG_ARC_STEP) {
        onGrid.push(from + dir * d);
      }
      onGrid.push(to);
      const splits = [
        [to],
        even(29),
        even(3),
        [from + dir * len * 0.07, from + dir * len * 0.61, to],
        onGrid,
        [from + dir * len * 0.5, to + dir * 3],
      ];
      for (const ends of splits) {
        expect(stationsBy(from, to, ends)).toEqual(whole);
      }
    }
  });

  it("lands a station on a frame boundary once with an inexact step", () => {
    // 3 * 0.3 = 0.8999999999999999, and that over 0.3 floors to 2.
    const step = 0.3;
    const at = 3 * step;
    const first = fogArcStations(0, 2, 0, at, step);
    const second = fogArcStations(0, 2, at, 2, step);
    expect([...first, ...second]).toEqual(fogArcStations(0, 2, 0, 2, step));
    expect(first[first.length - 1]).toBe(at);
    expect(second[0]).toBeGreaterThan(at);
  });

  it("stamps nothing for a frame that does not advance", () => {
    expect(fogArcStations(1, 5, 2.5, 2.5)).toEqual([]);
    // A frame reported behind the dot (never happens) stamps nothing either.
    expect(fogArcStations(1, 5, 2.5, 2)).toEqual([]);
  });
});

// s -0- a -1- b, a -2- c stored with c as its A end, and a self-loop 3 at a.
const RUNS: FogRun[] = [
  { va: "s", vb: "a", ctrlA: 0, ctrlB: 3 },
  { va: "a", vb: "b", ctrlA: 10, ctrlB: 14 },
  { va: "c", vb: "a", ctrlA: 20, ctrlB: 25 },
  { va: "a", vb: "a", ctrlA: 30, ctrlB: 38 },
];

describe("moveEnds (a live move's direction)", () => {
  it("departs the end the head is not at", () => {
    expect(moveEnds(RUNS[0], "a")).toEqual({ from: 0, to: 3 });
    expect(moveEnds(RUNS[0], "s")).toEqual({ from: 3, to: 0 });
    expect(moveEnds(RUNS[2], "c")).toEqual({ from: 25, to: 20 });
    expect(moveEnds(RUNS[2], "a")).toEqual({ from: 20, to: 25 });
  });

  it("sweeps a self-loop, or a run off the head, A -> B", () => {
    expect(moveEnds(RUNS[3], "a")).toEqual({ from: 30, to: 38 });
    expect(moveEnds(RUNS[1], "s")).toEqual({ from: 10, to: 14 });
  });
});

describe("travelOrder (K100)", () => {
  const order = (runs: number[], start = "s") =>
    travelOrder(RUNS, runs, start).map((t) => [t.run, t.from, t.to]);

  it("mirrors a walk out and back", () => {
    expect(order([0, 1, 1, 0])).toEqual([
      [0, 0, 3],
      [1, 10, 14],
      [1, 14, 10],
      [0, 3, 0],
    ]);
  });

  it("goes B -> A along a run whose B end the head is at", () => {
    expect(order([0, 2, 2])).toEqual([
      [0, 0, 3],
      [2, 25, 20],
      [2, 20, 25],
    ]);
  });

  it("sweeps a self-loop A -> B and leaves the head on it", () => {
    expect(order([0, 3, 3, 1])).toEqual([
      [0, 0, 3],
      [3, 30, 38],
      [3, 30, 38],
      [1, 10, 14],
    ]);
  });

  it("walks from any start (a Reset path retreat from the head)", () => {
    expect(order([1, 0], "b")).toEqual([
      [1, 14, 10],
      [0, 3, 0],
    ]);
  });

  it("explores a run off the head A -> B and keeps the head", () => {
    expect(order([1, 0])).toEqual([
      [1, 10, 14],
      [0, 0, 3],
    ]);
  });

  it("ends at an unknown run, since the head is lost", () => {
    expect(order([0, 99, 1])).toEqual([[0, 0, 3]]);
    expect(order([])).toEqual([]);
  });

  it("agrees with a live move's direction, tap by tap", () => {
    // A legal walk, and the head after each tap: a live move's direction
    // is moveEnds of its run and that head (beginMove).
    const taps = [0, 1, 1, 2, 2, 3, 0];
    const after = ["a", "b", "a", "c", "a", "a", "s"];
    const got = travelOrder(RUNS, taps, "s");
    expect(got.map((t) => t.run)).toEqual(taps);
    got.forEach((t, i) => {
      expect({ from: t.from, to: t.to }).toEqual(moveEnds(RUNS[t.run], after[i]));
    });
  });

  it("lets a restore stamp the live move's stations", () => {
    // A live move stamps its departure end at rest, then its stations
    // (whatever the frames); exploreRuns stamps [from, ...whole move].
    const t = travelOrder(RUNS, [0, 1], "s")[1];
    const live = [t.from, ...stationsBy(t.from, t.to, [11.2, 12.9, t.to])];
    expect([t.from, ...fogArcStations(t.from, t.to, t.from, t.to)]).toEqual(live);
    expect(live).toEqual([10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14]);
  });
});
