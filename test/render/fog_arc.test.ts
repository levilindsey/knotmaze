// K99: a move stamps the fog at the same stations however it is split
// into frames.
import { describe, it, expect } from "vitest";
import { FOG_ARC_STEP, fogArcStations } from "../../src/render/fog_arc";

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
