// K93 (Levi, 2026-10-13: "Trail fade, yes"): the memory trail's spans
// (render/trail_paint.ts, the pure half of FabricMazeRenderer.buildTrail).
// The trail is solid gold out to its fade start and fades linearly over the
// oldest TRAIL_FADE_FRAC of its length; a span's paint is linear between its
// two ends, so the piece holding the fade start is split there. Every other
// span is the pre-K93 one, byte for byte.

import { describe, expect, it } from "vitest";
import {
  TRAIL_FADE_FRAC,
  trailFade,
  trailSpans,
  type TrailPiece,
  type TrailSpan,
} from "../../src/render/trail_paint";

// The pre-K93 buildTrail span walk, verbatim but for its inputs (the
// reference for every piece the split does not touch).
function oldTrailSpans(pieces: readonly TrailPiece[], trailLength: number): TrailSpan[] {
  const L = Math.max(1e-6, trailLength);
  const fadeStart = L * (1 - TRAIL_FADE_FRAC);
  const pAt = (d: number): number =>
    d <= fadeStart ? 1 : Math.max(0, (L - d) / (L - fadeStart));
  const spans: TrailSpan[] = [];
  let d = 0;
  for (let i = pieces.length - 1; i >= 0 && d < L; i--) {
    const s = pieces[i];
    if (s.len <= 1e-9) continue;
    const dNear = d;
    let dFar = d + s.len;
    let fromC = s.from;
    if (dFar > L) {
      const keep = (L - dNear) / s.len;
      fromC = s.to - (s.to - s.from) * keep;
      dFar = L;
    }
    const toIsC0 = s.to <= fromC;
    spans.push({
      chain: s.chain,
      c0: Math.min(fromC, s.to),
      c1: Math.max(fromC, s.to),
      p0: toIsC0 ? pAt(dNear) : pAt(dFar),
      p1: toIsC0 ? pAt(dFar) : pAt(dNear),
    });
    d += s.len;
  }
  spans.reverse();
  return spans;
}

// A path of four runs, oldest first, one chain each, traversed in both ctrl
// directions: lengths 4, 3, 2.5, 3.5 (13 in all), and a zero-length piece
// (skipped). Path distance behind the head: chain 3 [0, 3.5], chain 2
// [3.5, 6], chain 1 [6, 9], chain 0 [9, 13].
const PIECES: TrailPiece[] = [
  { chain: 0, from: 2, to: 18, len: 4 },
  { chain: 1, from: 40, to: 28, len: 3 },
  { chain: 4, from: 7, to: 7, len: 0 },
  { chain: 2, from: 11, to: 21, len: 2.5 },
  { chain: 3, from: 33, to: 9, len: 3.5 },
];

// The paint a list of spans declares at ctrl c of a chain, with hard span
// edges, assigned in write order (kPaintAt with px 0; p linear between a
// span's ends, here in ctrl), or null where no span covers.
function paintAt(spans: readonly TrailSpan[], chain: number, c: number): number | null {
  let p: number | null = null;
  for (const s of spans) {
    if (s.chain !== chain || c < s.c0 || c > s.c1) continue;
    const t = s.c1 > s.c0 ? (c - s.c0) / (s.c1 - s.c0) : 0;
    p = s.p0 + (s.p1 - s.p0) * t;
  }
  return p;
}

// Where each piece's ctrl c sits behind the head (lattice length, linear in
// ctrl within a piece, as buildTrail's partial spans assume).
function distAt(piece: TrailPiece, dNear: number, c: number): number {
  return dNear + ((piece.to - c) / (piece.to - piece.from)) * piece.len;
}

describe("K93: the trail's spans", () => {
  it("trailFade is solid to the fade start, then linear to 0 at the trail's end", () => {
    for (const L of [2, 5, 10, 15]) {
      const pAt = trailFade(L);
      const fs = L * (1 - TRAIL_FADE_FRAC);
      expect(pAt(0)).toBe(1);
      expect(pAt(fs)).toBe(1);
      expect(pAt(fs + (L - fs) / 2)).toBeCloseTo(0.5, 12);
      expect(pAt(L)).toBe(0);
      expect(pAt(L + 1)).toBe(0);
    }
  });

  it("splits only the piece holding the fade start; every other span is the old one", () => {
    // [L, the piece (by chain) holding the fade start, or -1 when it lies on
    // a piece boundary or beyond the path]. L 5 puts the fade start (3.5) on
    // the boundary of chains 3 and 2; L 6 ends the trail on a boundary.
    const cases: Array<[number, number]> = [
      [2, 3],
      [5, -1],
      [6, 2],
      [10, 1],
      [15, 0],
      [25, -1],
    ];
    for (const [L, splitChain] of cases) {
      const spans = trailSpans(PIECES, L);
      const old = oldTrailSpans(PIECES, L);
      if (splitChain < 0) {
        expect(spans).toEqual(old);
        continue;
      }
      expect(spans.length).toBe(old.length + 1);
      const k = spans.findIndex((s) => s.chain === splitChain);
      // Write order: the solid span, then the fading one after it.
      expect(spans[k + 1].chain).toBe(splitChain);
      expect(spans.slice(0, k)).toEqual(old.slice(0, k));
      expect(spans.slice(k + 2)).toEqual(old.slice(k + 1));
      const solid = spans[k];
      const fading = spans[k + 1];
      const was = old[k];
      expect(solid.p0).toBe(1);
      expect(solid.p1).toBe(1);
      // The fading span ends where the old span did, at the same paint.
      const piece = PIECES.find((p) => p.chain === splitChain)!;
      const headIsC0 = piece.to <= piece.from;
      const oldFar = headIsC0 ? was.c1 : was.c0;
      const oldFarP = headIsC0 ? was.p1 : was.p0;
      const fadeFar = headIsC0 ? fading.c1 : fading.c0;
      const fadeFarP = headIsC0 ? fading.p1 : fading.p0;
      expect(fadeFar).toBe(oldFar);
      expect(fadeFarP).toBe(oldFarP);
      // ... and starts at the fade start, at p 1.
      const cS = headIsC0 ? fading.c0 : fading.c1;
      expect(headIsC0 ? fading.p0 : fading.p1).toBe(1);
      // The solid span runs from the head-side end past the fade start,
      // halfway into the fading part (the overlap that keeps the seam shut).
      expect(headIsC0 ? solid.c0 : solid.c1).toBe(piece.to);
      const solidFar = headIsC0 ? solid.c1 : solid.c0;
      expect(solidFar).toBeCloseTo((cS + oldFar) / 2, 12);
    }
  });

  it("paints the ideal fade along the whole trail; the old spans faded early", () => {
    for (const L of [2, 3.7, 5, 6, 10, 12.5, 15]) {
      const pAt = trailFade(L);
      const fs = L * (1 - TRAIL_FADE_FRAC);
      const spans = trailSpans(PIECES, L);
      const old = oldTrailSpans(PIECES, L);
      let dNear = 0;
      let worstOld = 0;
      let checked = 0;
      for (let i = PIECES.length - 1; i >= 0 && dNear < L; i--) {
        const pc = PIECES[i];
        if (pc.len <= 1e-9) continue;
        for (let j = 0; j <= 400; j++) {
          const c = pc.to + ((pc.from - pc.to) * j) / 400;
          const d = distAt(pc, dNear, c);
          if (d > L - 1e-9) break;
          const got = paintAt(spans, pc.chain, c);
          expect(got).not.toBeNull();
          expect(got!).toBeCloseTo(pAt(d), 9);
          worstOld = Math.max(worstOld, Math.abs(paintAt(old, pc.chain, c)! - pAt(d)));
          checked++;
        }
        dNear += pc.len;
      }
      expect(checked).toBeGreaterThan(200); // 229 at L 2, the shortest.
      // The pre-K93 spans dimmed the run holding the fade start from its
      // head-side end (by 0.06 at L 12.5, up to 0.7 at L 2), unless the fade
      // start falls on a run boundary (L 5) and no run holds it.
      const onBoundary = [3.5, 6, 9].some((b) => Math.abs(b - fs) < 1e-9) || fs >= 13;
      if (onBoundary) expect(worstOld).toBeLessThan(1e-9);
      else expect(worstOld).toBeGreaterThan(0.05);
    }
  });

  it("skips a split within SPLIT_EPS of a piece's end", () => {
    // Fade start 3.5 + 5e-7 behind the head: inside chain 2's run by less
    // than the epsilon, so no split; at + 1e-5 it splits.
    const near = (3.5 + 5e-7) / (1 - TRAIL_FADE_FRAC);
    const far = (3.5 + 1e-5) / (1 - TRAIL_FADE_FRAC);
    expect(trailSpans(PIECES, near)).toEqual(oldTrailSpans(PIECES, near));
    expect(trailSpans(PIECES, far).length).toBe(oldTrailSpans(PIECES, far).length + 1);
  });
});
