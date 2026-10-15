// K268 stage 1, THE SHAPED CUT (docs/design/K268.md "Stage 1 design"):
// 1. the profile encoding (GapMaskTable.setShape) and its interplay with
//    2b's scalar gate (setVis) and a re-solve (writeSlot);
// 2. the classifier (explore_glsl.ts classifyExploreCut): hidden, solid,
//    shaped by MIN and by best-of, fallback, open terminals, ring wraps and
//    the approximate knot;
// 3. the CPU twin of the shader's cut (paint_math.ts exploreCutCoverCpu)
//    against the model's own visibility (explore_view.ts chainVis), through
//    the f32 profile texels, at look 0 (the fade): exact up to f32 rounding
//    wherever a fade holds at most one integer ctrl (f <= 1);
// 4. the row-partial upload: writes mark their rows, the uploader sends
//    each dirty run once and a clean table nothing.

import { describe, expect, it } from "vitest";
import {
  GAP_PROF_F0,
  GAP_PROF_F1,
  GAP_PROF_MAX,
  GAP_PROF_R0,
  GAP_PROF_R1,
  GAP_ROWS_UPLOADER,
  GAP_TEX_W,
  GAP_UPLOAD_STATS,
  GapMaskTable,
  type GapShape,
  type GapSlotParams,
} from "../../src/render/gap_mask";
import { classifyExploreCut, exploreArcMap } from "../../src/render/explore_glsl";
import { exploreCutCoverCpu, kExploreLookCpu } from "../../src/render/paint_math";
import { chainVis, type ExplorePiece } from "../../src/game/explore_view";

function slotParams(strength: number, polyStart = 0, polyStep = 0): GapSlotParams {
  return {
    hOver: 0.25,
    margin: 0.1,
    fade: 0.2,
    strength,
    perp: true,
    arcScale: 1,
    centerArc: 0.5,
    winNeg: -1,
    winPos: 1,
    closed: false,
    totalU: 10,
    tanX: 1,
    tanY: 0,
    selfExcl: 0,
    polyStart,
    polyStep,
    marginScaleNeg: 1,
    marginScalePos: 1,
    fadeScaleNeg: 1,
    fadeScalePos: 1,
    centerX: 0,
    centerY: 0,
    sminK: 0,
    farK: 0,
    protNegA: 0,
    protNegB: 0,
    protPosA: 0,
    protPosB: 0,
    protPts: null,
    protNegN: 0,
    protPosN: 0,
  };
}

const PTS = new Float32Array([-1, 0, 0, 0, 1, 0]);

function piece(chain: number, c0: number, c1: number, f0: number, f1: number, tip0 = true, tip1 = true): ExplorePiece {
  return { chain, c0, c1, f0, f1, tip0, tip1 };
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
}

// A chain's control arcs (cal[0] = 0, increasing) and total, uneven spacing.
function chainArcs(n: number, r: () => number, closed: boolean): { cal: Float64Array; total: number } {
  const cal = new Float64Array(n);
  let a = 0;
  for (let i = 0; i < n; i++) {
    cal[i] = a;
    if (i < n - 1 || closed) a += 0.4 + r() * 0.9;
  }
  return { cal, total: closed ? a : cal[n - 1] };
}

// The 12 profile floats setShape writes, through f32 (what the shader reads).
function profileOf(shape: GapShape, strength: number): Float32Array {
  const p = new Float32Array(12);
  let flags = shape.max ? GAP_PROF_MAX : 0;
  shape.ramps.forEach((R, r) => {
    flags |= (r === 0 ? GAP_PROF_R0 : GAP_PROF_R1) | (R.front ? (r === 0 ? GAP_PROF_F0 : GAP_PROF_F1) : 0);
    p.set([R.aS, R.F, R.dK, R.tK], r * 4);
  });
  p[8] = strength;
  p[9] = flags;
  return p;
}

describe("K268 the shaped cut: the profile encoding", () => {
  it("writes the ramps, keeps the solved radii, carries 2b's scalar in texel 1.w", () => {
    const t = new GapMaskTable(6);
    t.writeSlot(2, slotParams(0.75, -1.5, 1.5), PTS, 3);
    const solved = t.readSlot(2);
    expect(t.polyRange(2)).toEqual([-1.5, 1.5, 3]);
    const shape: GapShape = {
      k2b: 0,
      ramps: [{ aS: 0.5, F: 0.75, dK: 0.5, tK: 0.25, front: true }],
      max: false,
    };
    expect(t.setShape(2, shape)).toBe(true);
    expect(t.isShaped(2)).toBe(true);
    expect(t.readShape(2)).toEqual([0.5, 0.75, 0.5, 0.25, 0, 0, 0, 0, 0.75, GAP_PROF_R0 | GAP_PROF_F0, 0, 0]);
    const h = t.readSlot(2).header;
    // Never rejected (the cut decides per fragment), strength 0 for the fans.
    expect(h[2]).toBe(solved.header[2]);
    expect(h[3]).toBe(solved.header[3]);
    expect(h[7]).toBe(0);
    expect(t.setShape(2, shape)).toBe(false); // Unchanged: nothing written.
    const two: GapShape = {
      k2b: 0.5,
      ramps: [
        { aS: -1, F: -0.5, dK: 1, tK: 1, front: false },
        { aS: 1, F: 0.5, dK: 0.5, tK: 0.5, front: true },
      ],
      max: true,
    };
    expect(t.setShape(2, two)).toBe(true);
    expect(t.readShape(2)).toEqual([
      -1, -0.5, 1, 1, 1, 0.5, 0.5, 0.5, 0.75, GAP_PROF_MAX | GAP_PROF_R0 | GAP_PROF_R1 | GAP_PROF_F1, 0, 0,
    ]);
    expect(t.readSlot(2).header[7]).toBe(0.375);
  });

  it("hands back to 2b's scalar: null clears the bit and the profile, setVis writes again", () => {
    const t = new GapMaskTable(6);
    t.writeSlot(1, slotParams(1, 0, 1), PTS, 3);
    const solved = t.readSlot(1);
    t.setShape(1, { k2b: 0.25, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    expect(t.setShape(1, null)).toBe(true);
    expect(t.isShaped(1)).toBe(false);
    expect(t.readShape(1)).toBeNull();
    expect(Number.isNaN(t.visOf(1))).toBe(true);
    // setVis always writes after a shape (the factor is unknown).
    expect(t.setVis(1, 1)).toBe(true);
    expect(t.readSlot(1)).toEqual(solved);
    expect(t.setShape(1, null)).toBe(false); // An unshaped slot: a no-op.
    expect(t.setVis(1, 0)).toBe(true);
    expect(t.readSlot(1).header[2]).toBe(-1);
  });

  it("a re-solve clears the shape (the renderer re-applies it after update())", () => {
    const t = new GapMaskTable(6);
    t.writeSlot(3, slotParams(1, 0, 1), PTS, 3);
    t.setShape(3, { k2b: 1, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    t.writeSlot(3, slotParams(0.5, 0, 1), PTS, 3);
    expect(t.isShaped(3)).toBe(false);
    expect(t.visOf(3)).toBe(1);
    expect(t.readSlot(3).header[7]).toBe(0.5);
    t.setShape(3, { k2b: 1, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    t.clearSlot(3);
    expect(t.isShaped(3)).toBe(false);
  });

  it("a gated slot (intro gate pending) keeps its show time in texel 1.w and the profile", () => {
    const t = new GapMaskTable(6);
    t.writeSlot(4, slotParams(-3.5, 0, 1), PTS, 3);
    t.setShape(4, { k2b: 0.5, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    expect(t.readSlot(4).header[7]).toBe(-3.5);
    expect(t.readShape(4)![8]).toBe(-3.5);
    t.setShape(4, { k2b: 0, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    expect(t.readSlot(4).header[7]).toBe(0);
    expect(t.readShape(4)![8]).toBe(-3.5);
  });
});

describe("K268 the shaped cut: the classifier", () => {
  const n = 12;
  const r = rng(7);
  const open = chainArcs(n, r, false);
  const ring = chainArcs(n, r, true);

  it("whole chains and covering pieces are solid; no piece in reach is hidden", () => {
    const arc = exploreArcMap(open.cal, open.total, false, 5, 0);
    const [lo, hi] = [arc(4), arc(6)];
    expect(classifyExploreCut([], true, n, false, 5, lo, hi, arc, 1).kind).toBe("solid");
    expect(classifyExploreCut([piece(0, 3, 7, 0.5, 0.5)], false, n, false, 5, lo, hi, arc, 1).kind).toBe("solid");
    expect(classifyExploreCut([piece(0, 8, 9, 0.5, 0.5)], false, n, false, 5, lo, hi, arc, 0).kind).toBe("hidden");
    // A fade that stops short of the footprint, either side.
    expect(classifyExploreCut([piece(0, 1, 3, 0.5, 0.9)], false, n, false, 5, lo, hi, arc, 0).kind).toBe("hidden");
    // A covering piece wins over an end elsewhere (best-of: solid is 1).
    const both = [piece(0, 3, 7, 0.5, 0.5), piece(0, 5.5, 9, 0.5, 0.5)];
    expect(classifyExploreCut(both, false, n, false, 5, lo, hi, arc, 1).kind).toBe("solid");
  });

  it("one piece's ends combine by MIN, ends of two pieces by best-of", () => {
    const arc = exploreArcMap(open.cal, open.total, false, 5, 0);
    const [lo, hi] = [arc(3), arc(7)];
    const one = classifyExploreCut([piece(0, 4, 6, 0.5, 0.5)], false, n, false, 5, lo, hi, arc, 1);
    expect(one.kind).toBe("shaped");
    expect(one.shape!.max).toBe(false);
    expect(one.shape!.ramps.length).toBe(2);
    expect(one.shape!.ramps[0].F).toBeLessThan(0); // The low end fades down.
    expect(one.shape!.ramps[1].F).toBeGreaterThan(0);
    const two = classifyExploreCut(
      [piece(0, 1, 4, 0.5, 0.5), piece(0, 6, 9, 0.5, 0.5, true, false)],
      false,
      n,
      false,
      5,
      lo,
      hi,
      arc,
      0
    );
    expect(two.kind).toBe("shaped");
    expect(two.shape!.max).toBe(true);
    expect(two.shape!.ramps.map((R) => R.front)).toEqual([true, true]);
    expect(two.shape!.k2b).toBe(0);
    const three = classifyExploreCut(
      [piece(0, 1, 4, 0.5, 0.5), piece(0, 5.5, 6.5, 0.25, 0.25)],
      false,
      n,
      false,
      5,
      lo,
      hi,
      arc,
      0
    );
    expect(three.kind).toBe("fallback");
  });

  it("an open chain's terminal never matters; a hard end is a step", () => {
    const arc = exploreArcMap(open.cal, open.total, false, 0.5, 0);
    const lo = arc(-0.5);
    const hi = arc(1.5);
    // Solid from the terminal: only the high end shapes the cut.
    const t0 = classifyExploreCut([piece(0, 0, 1, 0, 0.5)], false, n, false, 0.5, lo, hi, arc, 1);
    expect(t0.kind).toBe("shaped");
    expect(t0.shape!.ramps.length).toBe(1);
    expect(t0.shape!.ramps[0].F).toBeGreaterThan(0);
    const hard = classifyExploreCut([piece(0, 0, 1, 0, 0)], false, n, false, 0.5, lo, hi, arc, 1);
    expect(hard.shape!.ramps[0].F).toBe(1e-6);
    const solid = classifyExploreCut([piece(0, 0, 3, 0, 0.5)], false, n, false, 0.5, lo, hi, arc, 1);
    expect(solid.kind).toBe("solid");
  });

  it("a ring piece across the seam is found from either side", () => {
    const arc = exploreArcMap(ring.cal, ring.total, true, 0.25, 3);
    const lo = arc(-0.8);
    const hi = arc(0.8);
    const p = [piece(0, 8, 11, 0.5, 0.5)]; // Ends at 11, fades to 11.5 = -0.5.
    const cut = classifyExploreCut(p, false, n, true, 0.25, lo, hi, arc, 0);
    expect(cut.kind).toBe("shaped");
    expect(cut.shape!.ramps.length).toBe(1);
    expect(cut.shape!.ramps[0].aS).toBeCloseTo(arc(-1), 12);
    expect(cut.shape!.ramps[0].F).toBeCloseTo(arc(-0.5) - arc(-1), 12);
    // The same piece one lap up is the same cut.
    const p2 = [piece(0, 8 + n, 11 + n, 0.5, 0.5)];
    const cut2 = classifyExploreCut(p2, false, n, true, 0.25, lo, hi, arc, 0);
    expect(cut2.shape!.ramps[0].aS).toBeCloseTo(cut.shape!.ramps[0].aS, 9);
  });

  it("keeps one interior knot (exact) and flags a fade holding several (approx)", () => {
    const arc = exploreArcMap(open.cal, open.total, false, 5, 0);
    const lo = arc(2);
    const hi = arc(8);
    const k1 = classifyExploreCut([piece(0, 4.5, 9, 0.75, 0.5)], false, n, false, 5, lo, hi, arc, 1);
    expect(k1.approx).toBe(false);
    const R = k1.shape!.ramps[0];
    expect(R.tK).toBeCloseTo(0.5 / 0.75, 12);
    expect(R.dK).toBeCloseTo((arc(4) - arc(4.5)) / (arc(3.75) - arc(4.5)), 12);
    const k3 = classifyExploreCut([piece(0, 6.5, 9, 3, 0.5)], false, n, false, 5, lo, hi, arc, 1);
    expect(k3.approx).toBe(true);
    expect(k3.shape!.ramps[0].tK).toBeCloseTo(1.5 / 3, 12); // Nearest 0.5.
  });
});

describe("K268 the shaped cut: exploreCutCoverCpu vs the model's chainVis (look 0)", () => {
  it("agrees through every fade, rings and open chains, MIN and best-of", () => {
    const r = rng(268);
    let checked = 0;
    let worst = 0;
    for (let trial = 0; trial < 400; trial++) {
      const n = 6 + Math.floor(r() * 14);
      const closed = r() < 0.5;
      const { cal, total } = chainArcs(n, r, closed);
      // One or two pieces, fades in [0.35, 1] (FADE_MIN up to one ctrl).
      const pieces: ExplorePiece[] = [];
      const np = 1 + Math.floor(r() * 2);
      let at = r() * 2;
      for (let k = 0; k < np; k++) {
        const c0 = at;
        const c1 = Math.min(closed ? n * 0.9 : n - 1, c0 + r() * 3);
        pieces.push(piece(0, c0, c1, 0.35 + r() * 0.65, 0.35 + r() * 0.65, r() < 0.5, r() < 0.5));
        at = c1 + 1.5 + r() * 3;
        if (at > (closed ? n * 0.9 : n - 1.5)) break;
      }
      const overCtrl = r() * (closed ? n : n - 1);
      const overArc = 2 + r() * 5;
      const arc = exploreArcMap(cal, total, closed, overCtrl, overArc);
      const reach = 0.5 + r() * 2.5;
      const cLo = closed ? overCtrl - reach : Math.max(0, overCtrl - reach);
      const cHi = closed ? overCtrl + reach : Math.min(n - 1, overCtrl + reach);
      const lo = arc(cLo);
      const hi = arc(cHi);
      const cut = classifyExploreCut(pieces, false, n, closed, overCtrl, lo, hi, arc, 1);
      if (cut.kind !== "shaped") continue;
      expect(cut.approx).toBe(false);
      const prof = profileOf(cut.shape!, 1);
      for (let i = 0; i <= 64; i++) {
        const c = cLo + ((cHi - cLo) * i) / 64;
        // pieceVis's 1e-3 solid tolerance is not mirrored (sub-pixel).
        if (pieces.some((p) => Math.abs(((c - p.c0) % n + n) % n) < 2e-3 || Math.abs(((c - p.c1) % n + n) % n) < 2e-3)) {
          continue;
        }
        const want = chainVis(pieces, 0, c, n, closed);
        const got = exploreCutCoverCpu(prof, Math.fround(arc(c)), 0, 0.2, 0.01);
        worst = Math.max(worst, Math.abs(got - want));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(2000);
    expect(worst).toBeLessThan(1e-4);
  });

  it("the end looks at a frontier read the same as the thread's own (kExploreLookCpu)", () => {
    // Beyond the fade the cut is 0 for every look; inside it, at lat 0.
    const shape: GapShape = {
      k2b: 1,
      ramps: [{ aS: 1, F: 0.5, dK: 1, tK: 1, front: true }],
      max: false,
    };
    const prof = profileOf(shape, 1);
    for (const look of [0, 1, 2, 3, 4, 5]) {
      expect(exploreCutCoverCpu(prof, 0.5, look, 0.2, 0.01)).toBe(1);
      expect(exploreCutCoverCpu(prof, 1.6, look, 0.2, 0.01)).toBe(0);
      const A = 1.2;
      const t = 0.4;
      const v = 1 - t * t * (3 - 2 * t);
      expect(exploreCutCoverCpu(prof, A, look, 0.2, 0.01)).toBeCloseTo(
        kExploreLookCpu(look, v, t, Math.fround(A) - 1, 0, 0.01 / 0.2, 0.01, 0.2),
        6
      );
    }
  });
});

describe("K268 the row-partial gap upload", () => {
  interface Call {
    kind: "img" | "sub";
    y: number;
    h: number;
  }
  function fakeGl(calls: Call[]): WebGL2RenderingContext {
    return {
      texImage2D: (_t: number, _l: number, _f: number, _w: number, h: number) => calls.push({ kind: "img", y: 0, h }),
      texSubImage2D: (_t: number, _l: number, _x: number, y: number, _w: number, h: number) =>
        calls.push({ kind: "sub", y, h }),
    } as unknown as WebGL2RenderingContext;
  }

  it("sends each dirty run once, then nothing while clean", () => {
    const t = new GapMaskTable(6);
    const source = (t as unknown as { source: Parameters<typeof GAP_ROWS_UPLOADER.upload>[0] }).source;
    const rows = source.pixelHeight;
    const tex = { target: 0, width: 0, height: 0, internalFormat: 0, format: 0, type: 0 };
    const calls: Call[] = [];
    const gl = fakeGl(calls);
    expect(t.uploadPending).toBe(true);
    const bytes0 = GAP_UPLOAD_STATS.bytes;
    GAP_ROWS_UPLOADER.upload(source, tex, gl);
    expect(calls).toEqual([{ kind: "img", y: 0, h: rows }]);
    expect(GAP_UPLOAD_STATS.bytes - bytes0).toBe(GAP_TEX_W * rows * 16);
    expect(t.uploadPending).toBe(false);
    calls.length = 0;
    GAP_ROWS_UPLOADER.upload(source, tex, gl);
    expect(calls).toEqual([]);
    t.writeSlot(1, slotParams(1, 0, 1), PTS, 3);
    t.writeSlot(2, slotParams(1, 0, 1), PTS, 3);
    t.writeSlot(4, slotParams(1, 0, 1), PTS, 3);
    GAP_ROWS_UPLOADER.upload(source, tex, gl);
    // Slots 1, 2 = rows 2, 3 (one run); slot 4 = row 5.
    expect(calls).toEqual([
      { kind: "sub", y: 2, h: 2 },
      { kind: "sub", y: 5, h: 1 },
    ]);
    calls.length = 0;
    // An unchanged shape or factor marks nothing.
    t.setVis(4, 1);
    t.setShape(4, null);
    expect(t.uploadPending).toBe(false);
    t.setShape(4, { k2b: 1, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    expect(t.uploadPending).toBe(true);
    GAP_ROWS_UPLOADER.upload(source, tex, gl);
    expect(calls).toEqual([{ kind: "sub", y: 5, h: 1 }]);
    calls.length = 0;
    t.setShape(4, { k2b: 1, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    expect(t.uploadPending).toBe(false);
    t.setEnabled(false);
    GAP_ROWS_UPLOADER.upload(source, tex, gl);
    expect(calls).toEqual([{ kind: "sub", y: 0, h: 1 }]);
  });
});
