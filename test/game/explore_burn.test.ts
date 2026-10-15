// K290 (burn stage 3a): burnt thread cut out of the visibility pieces.
import { describe, it, expect } from "vitest";
import {
  chainVis,
  subtractBurnt,
  wholePieces,
  type BurntSpan,
  type ExplorePiece,
} from "../../src/game/explore_view";

const piece = (
  chain: number,
  c0: number,
  c1: number,
  f0 = 0,
  f1 = 0,
  tip0 = false,
  tip1 = false
): ExplorePiece => ({ chain, c0, c1, f0, f1, tip0, tip1 });

const open = () => 0;

describe("subtractBurnt (K290)", () => {
  it("returns the same pieces when nothing is burnt", () => {
    const ps = [piece(0, 1, 4, 0.5, 0.5, true, false), piece(2, 0, 9)];
    const out = subtractBurnt(ps, [], open);
    expect(out).toEqual(ps);
    expect(out[0]).toBe(ps[0]);
    // A span on another chain leaves them alone too.
    const out2 = subtractBurnt(ps, [{ chain: 1, b0: 0, b1: 5 }], open);
    expect(out2[0]).toBe(ps[0]);
    expect(out2[1]).toBe(ps[1]);
  });

  it("cuts a burnt stretch out of a whole open chain with hard ends", () => {
    const out = subtractBurnt([piece(0, 0, 10)], [{ chain: 0, b0: 3, b1: 5 }], open);
    expect(out).toEqual([piece(0, 0, 3), piece(0, 5, 10)]);
  });

  it("burns a run's end off: the remnant keeps its far end", () => {
    const p = piece(0, 2, 6, 1, 1, true, true);
    const out = subtractBurnt([p], [{ chain: 0, b0: 0, b1: 3 }], open);
    expect(out).toEqual([piece(0, 3, 6, 0, 1, false, true)]);
    const out2 = subtractBurnt([p], [{ chain: 0, b0: 5, b1: 9 }], open);
    expect(out2).toEqual([piece(0, 2, 5, 1, 0, true, false)]);
  });

  it("shortens a fade the cut runs into, never showing more", () => {
    const p = piece(0, 2, 4, 1, 1, true, true);
    // Into the high fade: it now ends at the cut.
    expect(subtractBurnt([p], [{ chain: 0, b0: 4.5, b1: 8 }], open)).toEqual([
      piece(0, 2, 4, 1, 0.5, true, false),
    ]);
    // Into the low fade.
    expect(subtractBurnt([p], [{ chain: 0, b0: 0, b1: 1.25 }], open)).toEqual([
      piece(0, 2, 4, 0.75, 1, false, true),
    ]);
    // The whole piece and its fades: nothing left.
    expect(subtractBurnt([p], [{ chain: 0, b0: 0.5, b1: 5.5 }], open)).toEqual([]);
  });

  it("cuts a ring's span at the copy that meets the piece", () => {
    // A ring of 8: the span [7, 9] is [7, 8] + [0, 1].
    const out = subtractBurnt([piece(0, 0, 8)], [{ chain: 0, b0: 7, b1: 9 }], () => 8);
    expect(out).toEqual([piece(0, 1, 7)]);
    // A piece unwrapped past the count ([6, 11] = 6..8 + 0..3) and a span
    // on the low copy ([1, 2]).
    const out2 = subtractBurnt([piece(0, 6, 11)], [{ chain: 0, b0: 1, b1: 2 }], () => 8);
    expect(out2).toEqual([piece(0, 6, 9), piece(0, 10, 11)]);
  });

  it("drops what a burnt span leaves of nothing", () => {
    expect(subtractBurnt([piece(0, 3, 5)], [{ chain: 0, b0: 3, b1: 5 }], open)).toEqual([]);
    // A zero-length span burns nothing.
    expect(subtractBurnt([piece(0, 3, 5)], [{ chain: 0, b0: 4, b1: 4 }], open)).toEqual([
      piece(0, 3, 5),
    ]);
  });

  it("hides every burnt point and keeps every unburnt solid point (seeded)", () => {
    let s = 12345;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x80000000;
    };
    for (let trial = 0; trial < 300; trial++) {
      const closed = rnd() < 0.5;
      const n = 8 + Math.floor(rnd() * 20);
      const pieces: ExplorePiece[] = [];
      const np = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < np; i++) {
        const c0 = rnd() * (n - 1);
        // On a ring, pieceVis (and the shader) unwrap a ctrl toward the
        // piece's middle, so a piece is well defined while its solid part
        // plus twice its longer fade (2 here) is shorter than the ring.
        const len = rnd() * (closed ? n - 5 : n - 1 - c0);
        pieces.push(piece(0, c0, c0 + len, rnd() < 0.5 ? 0 : rnd() * 2, rnd() < 0.5 ? 0 : rnd() * 2));
      }
      const spans: BurntSpan[] = [];
      const ns = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < ns; i++) {
        const b0 = rnd() * (n - 1);
        const len = rnd() * 4;
        spans.push({ chain: 0, b0, b1: closed ? b0 + len : Math.min(n - 1, b0 + len) });
      }
      const out = subtractBurnt(pieces, spans, () => (closed ? n : 0));
      const inSpan = (x: number, m: number): boolean =>
        spans.some((sp) => {
          for (let k = -2; k <= 2; k++) {
            const sh = closed ? k * n : 0;
            if (x > sp.b0 + sh + m && x < sp.b1 + sh - m) return true;
            if (!closed) break;
          }
          return false;
        });
      const nearSpan = (x: number, m: number): boolean =>
        spans.some((sp) => {
          for (let k = -2; k <= 2; k++) {
            const sh = closed ? k * n : 0;
            if (x > sp.b0 + sh - m && x < sp.b1 + sh + m) return true;
            if (!closed) break;
          }
          return false;
        });
      for (let i = 0; i <= 400; i++) {
        const x = ((closed ? n : n - 1) * i) / 400;
        const before = chainVis(pieces, 0, x, n, closed);
        const after = chainVis(out, 0, x, n, closed);
        // Never more than before.
        expect(after).toBeLessThanOrEqual(before + 1e-9);
        // Burnt: hidden (pieceVis keeps 1e-3 of tolerance at an end).
        if (inSpan(x, 2e-3)) expect(after).toBe(0);
        // Solid and away from every burnt span: unchanged.
        if (before === 1 && !nearSpan(x, 2e-3)) expect(after).toBe(1);
      }
    }
  });
});

describe("wholePieces (K290)", () => {
  it("covers a ring [0, n] and an open chain [0, n - 1] with hard ends", () => {
    expect(
      wholePieces([
        { n: 12, closed: true },
        { n: 7, closed: false },
      ])
    ).toEqual([piece(0, 0, 12), piece(1, 0, 6)]);
  });
});
