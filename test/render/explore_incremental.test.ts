// K1082: the incremental burn declare's touched-chain computation
// (ribbon/explore_gaps.ts). A burning frame moves only the fronts and
// the charred spans on a few chains; every other chain's declaration
// must compare untouched so setExplore can leave its slots alone.

import { describe, expect, it } from "vitest";
import type { ExploreBurn, ExplorePiece } from "../../src/game/explore_view";
import {
  exploreTouchedChains,
  groupPiecesByChain,
} from "../../src/render/ribbon/explore_gaps";

const P = (chain: number, c0: number, c1: number): ExplorePiece => ({
  chain,
  c0,
  c1,
  f0: 0,
  f1: 0,
  tip0: false,
  tip1: false,
});

describe("K1082 exploreTouchedChains", () => {
  it("groups pieces by chain in declaration order", () => {
    const g = groupPiecesByChain([P(2, 0, 5), P(0, 0, 9), P(2, 6, 8)]);
    expect([...g.keys()]).toEqual([2, 0]);
    expect(g.get(2)).toEqual([P(2, 0, 5), P(2, 6, 8)]);
  });

  it("an identical redeclaration touches nothing", () => {
    const pieces = [P(0, 0, 10), P(1, 0, 8)];
    const prev = groupPiecesByChain(pieces);
    const burn: ExploreBurn = {
      gate: null,
      char: [{ chain: 1, b0: 2, b1: 5 }],
      fronts: [{ chain: 1, c: 5, dir: 1, kind: 0 }],
      smolder: null,
    };
    expect([...exploreTouchedChains(prev, pieces, burn, burn)]).toEqual([]);
  });

  it("a moved front touches only its chain", () => {
    const pieces = [P(0, 0, 10), P(1, 0, 8), P(2, 0, 6)];
    const prev = groupPiecesByChain(pieces);
    const a: ExploreBurn = {
      gate: null,
      char: null,
      fronts: [{ chain: 1, c: 5, dir: 1, kind: 0 }],
      smolder: null,
    };
    const b: ExploreBurn = {
      gate: null,
      char: null,
      fronts: [{ chain: 1, c: 5.4, dir: 1, kind: 0 }],
      smolder: null,
    };
    expect([...exploreTouchedChains(prev, pieces, a, b)]).toEqual([1]);
  });

  it("a moved char span and a moved piece boundary touch their chains", () => {
    const prev = groupPiecesByChain([P(0, 0, 10), P(1, 0, 8)]);
    const next = [P(0, 0, 9.5), P(1, 0, 8)];
    const a: ExploreBurn = {
      gate: null,
      char: [{ chain: 1, b0: 2, b1: 5 }],
      fronts: null,
      smolder: null,
    };
    const b: ExploreBurn = {
      gate: null,
      char: [{ chain: 1, b0: 2, b1: 5.5 }],
      fronts: null,
      smolder: null,
    };
    expect([...exploreTouchedChains(prev, next, a, b)].sort()).toEqual([0, 1]);
  });

  it("a chain that loses its pieces, and a gate change, are touched", () => {
    const prev = groupPiecesByChain([P(0, 0, 10), P(1, 0, 8)]);
    const a: ExploreBurn = { gate: [P(1, 0, 8)], char: null, fronts: null, smolder: null };
    const b: ExploreBurn = { gate: null, char: null, fronts: null, smolder: null };
    expect([...exploreTouchedChains(prev, [P(0, 0, 10)], a, b)].sort()).toEqual([1]);
  });
});
