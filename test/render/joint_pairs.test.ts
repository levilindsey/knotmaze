// K397 stage 3: a fused joint is not a crossing. The emergent pool skips a
// pair whose two passes both lie within JOINT_PAIR_REACH ctrl of one fused
// junction (crossing_gaps.ts isJointPair). The fixtures are the two tuck
// points the stage 3 scan found on 2gozcj (h1scan), with junctionArcCtrls'
// shape: per chain, every joint's slot and its junction index.
import { describe, expect, it } from "vitest";
import {
  JOINT_PAIR_REACH,
  isJointPair,
} from "../../src/render/ribbon/crossing_gaps";

type Joints = Map<number, Array<{ ctrl: number; jn: number }>>;

// Chain 48 (open, 9 particles) starts tucked into closed host 71 at slot 2
// (junction 126); chain 50 (open, 13) ends tucked into open host 56 at slot
// 62 (junction 132). Host 56 also carries junction 140 at slot 20, where
// open chain 90 (11) ends.
const joints: Joints = new Map([
  [48, [{ ctrl: 0, jn: 126 }]],
  [71, [{ ctrl: 2, jn: 126 }]],
  [50, [{ ctrl: 12, jn: 132 }]],
  [56, [
    { ctrl: 62, jn: 132 },
    { ctrl: 20, jn: 140 },
  ]],
  [90, [{ ctrl: 10, jn: 140 }]],
  [33, [{ ctrl: 0, jn: 7 }]],
]);
const len: Record<number, number> = { 48: 9, 71: 64, 50: 13, 56: 80, 90: 11, 33: 40 };
const closedSet = new Set([71]);
const chainLen = (c: number): number => len[c];
const closed = (c: number): boolean => closedSet.has(c);
const pair = (
  ac: number,
  actrl: number,
  bc: number,
  bctrl: number,
  j: Joints = joints
): boolean =>
  isJointPair({ chain: ac, ctrl: actrl }, { chain: bc, ctrl: bctrl }, j, chainLen, closed);

describe("isJointPair (K397 s3): the emergent pool's fused-joint skip", () => {
  it("skips the two tuck pairs the scan found, either pass over", () => {
    // 48s: host 71 over stub 48 (stage 1's node_12 sliver).
    expect(pair(71, 1.99, 48, 0)).toBe(true);
    expect(pair(48, 0, 71, 1.99)).toBe(true);
    // 50e: stub 50 over host 56 (the knuckle U).
    expect(pair(50, 11.98, 56, 61.99)).toBe(true);
    expect(pair(56, 61.99, 50, 11.98)).toBe(true);
  });

  it("reaches JOINT_PAIR_REACH ctrl along each pass, no further", () => {
    expect(JOINT_PAIR_REACH).toBe(2);
    expect(pair(50, 12 - 1.9, 56, 62 + 1.9)).toBe(true);
    expect(pair(50, 12 - 2.1, 56, 62)).toBe(false);
    expect(pair(50, 12, 56, 62 - 2.1)).toBe(false);
  });

  it("wraps a closed host and not an open one", () => {
    // Closed host 71 (64 particles): a joint at slot 1 is 1.5 ctrl from
    // 63.5 across the seam; at slot 2 it is 2.5.
    const ring: Joints = new Map([
      [71, [{ ctrl: 1, jn: 5 }]],
      [48, [{ ctrl: 0, jn: 5 }]],
    ]);
    expect(pair(71, 63.5, 48, 0.3, ring)).toBe(true);
    expect(pair(71, 63.5, 48, 0.3)).toBe(false);
    // Open host 56 (80 particles) does not wrap: 79.5 is far from slot 0.
    const j: Joints = new Map([
      [56, [{ ctrl: 0, jn: 9 }]],
      [33, [{ ctrl: 0, jn: 9 }]],
    ]);
    expect(pair(56, 79.5, 33, 0, j)).toBe(false);
    expect(pair(56, 0.5, 33, 0, j)).toBe(true);
  });

  it("keeps pairs at two different junctions, other chains and self-crossings", () => {
    // Stub 90's tuck is junction 140 on host 56; stub 50 is junction 132.
    expect(pair(90, 10, 56, 62)).toBe(false);
    expect(pair(90, 10, 50, 12)).toBe(false);
    // Host 56 near both of its joints is still one chain against another.
    expect(pair(90, 9.5, 56, 20.5)).toBe(true);
    // A chain with no joint, or a chain against itself.
    expect(pair(12, 0, 56, 62)).toBe(false);
    expect(pair(56, 61, 56, 62)).toBe(false);
    // Chain 33's joint is junction 7, which no other chain shares.
    expect(pair(33, 0, 48, 0)).toBe(false);
  });

  it("finds nothing in knot mode (no fused junctions)", () => {
    expect(pair(71, 1.99, 48, 0, new Map())).toBe(false);
  });
});
