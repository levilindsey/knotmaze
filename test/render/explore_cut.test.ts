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
import {
  classifyExploreCut,
  EXPLORE_FAN_SURE_GLSL,
  EXPLORE_GAP_SURE_GLSL,
  EXPLORE_LOOK_GLSL,
  EXPLORE_MAIN_GLSL,
  exploreArcMap,
} from "../../src/render/explore_glsl";
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

  // K268 stage 2's first defect (crossing 275 of K76 2c's census walk): a
  // hard LOW end's fade is -0, and the classifier read the side off its sign
  // (-0 < 0 is false), so a low hard end hid ABOVE itself. Two walked runs
  // meeting at a vertex inside a footprint then both cut only below it, and
  // the threads fused wherever the under thread passed above.
  it("a hard low end hides below it; two runs meeting at a vertex cut the whole footprint", () => {
    const arc = exploreArcMap(open.cal, open.total, false, 5, 0);
    const [lo, hi] = [arc(3), arc(7)];
    // A stub up from a vertex at 5: a hard low end, its fade past the footprint.
    const up = classifyExploreCut([piece(0, 5, 9, 0, 0.5, false, true)], false, n, false, 5, lo, hi, arc, 1);
    expect(up.kind).toBe("shaped");
    expect(up.shape!.ramps.length).toBe(1);
    expect(up.shape!.ramps[0].F).toBe(-1e-6);
    const pUp = profileOf(up.shape!, 1);
    expect(exploreCutCoverCpu(pUp, Math.fround(arc(4.9)), 0, 0.2, 0.01)).toBe(0);
    expect(exploreCutCoverCpu(pUp, Math.fround(arc(5.1)), 0, 0.2, 0.01)).toBe(1);
    // Its mirror: a stub down to the vertex (a hard high end).
    const down = classifyExploreCut([piece(0, 1, 5, 0.5, 0, true, false)], false, n, false, 5, lo, hi, arc, 1);
    expect(down.shape!.ramps[0].F).toBe(1e-6);
    // Two walked runs meeting there (f = 0 at every end): best-of, one ramp
    // per side, and the cut covers every point of the footprint.
    const runs = [piece(0, 1, 5, 0, 0, false, false), piece(0, 5, 9, 0, 0, false, false)];
    const meet = classifyExploreCut(runs, false, n, false, 5, lo, hi, arc, 1);
    expect(meet.kind).toBe("shaped");
    expect(meet.shape!.max).toBe(true);
    expect(meet.shape!.ramps.map((R) => Math.sign(R.F))).toEqual([1, -1]);
    const pMeet = profileOf(meet.shape!, 1);
    for (let i = 0; i <= 64; i++) {
      const A = Math.fround(lo + ((hi - lo) * i) / 64);
      expect(exploreCutCoverCpu(pMeet, A, 0, 0.2, 0.01)).toBe(1);
    }
    // The same on a ring, the vertex at the seam (the copies k - 1 and k).
    const ra = exploreArcMap(ring.cal, ring.total, true, 0.25, 3);
    const seam = [piece(0, 8, 12, 0, 0, false, false), piece(0, 0, 3, 0, 0, false, false)];
    const rc = classifyExploreCut(seam, false, n, true, 0.25, ra(-1), ra(1), ra, 1);
    expect(rc.kind).toBe("shaped");
    expect(rc.shape!.ramps.map((R) => Math.sign(R.F))).toEqual([1, -1]);
    const pr = profileOf(rc.shape!, 1);
    for (let i = 0; i <= 32; i++) {
      expect(exploreCutCoverCpu(pr, Math.fround(ra(-1 + i / 16)), 0, 0.2, 0.01)).toBe(1);
    }
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

  // The trials above never drew a hard end (every fade >= 0.35), which hid
  // the -0 defect. Here a quarter of the ends are hard (explore_view's
  // walked runs and a stub's vertex end) and a third of the second pieces
  // start where the first ends (two runs meeting at a vertex).
  it("agrees with hard ends and pieces that meet (K268 stage 2)", () => {
    const r = rng(2682);
    let checked = 0;
    let meetings = 0;
    let worst = 0;
    const fade = (): number => (r() < 0.25 ? 0 : 0.35 + r() * 0.65);
    for (let trial = 0; trial < 600; trial++) {
      const n = 6 + Math.floor(r() * 14);
      const closed = r() < 0.5;
      const { cal, total } = chainArcs(n, r, closed);
      const pieces: ExplorePiece[] = [];
      const np = 1 + Math.floor(r() * 2);
      let at = r() * 2;
      let met = false;
      for (let k = 0; k < np; k++) {
        const c0 = at;
        const c1 = Math.min(closed ? n * 0.9 : n - 1, c0 + r() * 3);
        const meet = k === 0 && r() < 0.35;
        pieces.push(piece(0, c0, c1, fade(), meet ? 0 : fade(), r() < 0.5, r() < 0.5));
        if (meet) {
          at = c1;
          met = true;
          // The next piece's low end is the same vertex: hard too.
          const c1b = Math.min(closed ? n * 0.9 : n - 1, at + r() * 3);
          pieces.push(piece(0, at, c1b, 0, fade(), false, r() < 0.5));
          break;
        }
        at = c1 + 1.5 + r() * 3;
        if (at > (closed ? n * 0.9 : n - 1.5)) break;
      }
      const overCtrl = r() * (closed ? n : n - 1);
      const overArc = 2 + r() * 5;
      const arc = exploreArcMap(cal, total, closed, overCtrl, overArc);
      const reach = 0.5 + r() * 2.5;
      const cLo = closed ? overCtrl - reach : Math.max(0, overCtrl - reach);
      const cHi = closed ? overCtrl + reach : Math.min(n - 1, overCtrl + reach);
      const cut = classifyExploreCut(pieces, false, n, closed, overCtrl, arc(cLo), arc(cHi), arc, 1);
      if (cut.kind !== "shaped") continue;
      if (met) meetings++;
      const prof = profileOf(cut.shape!, 1);
      // pieceVis's 1e-3 solid tolerance reaches past a hard end on either
      // side, where the cut steps: skip points that near an end (sub-pixel).
      const near = (c: number, e: number): boolean => {
        const d = (((c - e) % n) + n) % n;
        return Math.min(d, n - d) < 2e-3;
      };
      for (let i = 0; i <= 64; i++) {
        const c = cLo + ((cHi - cLo) * i) / 64;
        if (pieces.some((p) => near(c, p.c0) || near(c, p.c1))) continue;
        const want = chainVis(pieces, 0, c, n, closed);
        const got = exploreCutCoverCpu(prof, Math.fround(arc(c)), 0, 0.2, 0.01);
        worst = Math.max(worst, Math.abs(got - want));
        checked++;
      }
    }
    expect(meetings).toBeGreaterThan(20);
    expect(checked).toBeGreaterThan(3000);
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

// K76 stage 2d (question 9): under High contrast the dots look (3, and the
// beacon 5) draws its dots at full strength in pure white. The GLSL is
// kExploreLook's `uKExplore.x > 1.5` branch and kExDot, which the thread's
// main mixes to white; the CPU twin takes `hc` and reports `out.dot`.
describe("K76 stage 2d: High contrast dots (kExploreLookCpu hc, out.dot)", () => {
  const tw = 0.52;
  const pxW = 0.02;
  const sideFw = pxW / tw;

  it("HC lifts only the strength: hc x (1 - 0.55 u^2) is the plain coverage", () => {
    const o1 = { dot: -1 };
    const o2 = { dot: -1 };
    let lit = 0;
    for (const look of [3, 5]) {
      for (let iu = 0; iu <= 20; iu++) {
        const u = iu / 20;
        for (let is = 0; is <= 60; is++) {
          const s = (is / 60) * 6 * tw;
          for (const lat of [-0.45, -0.2, 0, 0.1, 0.3]) {
            const plain = kExploreLookCpu(look, 0.7, u, s, lat, sideFw, pxW, tw, false, o1);
            const hc = kExploreLookCpu(look, 0.7, u, s, lat, sideFw, pxW, tw, true, o2);
            expect(o2.dot).toBe(o1.dot);
            expect(hc * (1 - 0.55 * u * u)).toBeCloseTo(plain, 12);
            expect(hc).toBeGreaterThanOrEqual(plain);
            if (plain > 0) lit++;
          }
        }
      }
    }
    expect(lit).toBeGreaterThan(500);
  });

  it("a dot's center is full under HC and dimmed without; out.dot says dot or cap", () => {
    const sp = 0.95 * tw;
    const o = { dot: -1 };
    for (const look of [3, 5]) {
      for (const kk of [1, 2, 5]) {
        const u = 0.95;
        expect(kExploreLookCpu(look, 0, u, kk * sp, 0, sideFw, pxW, tw, true, o)).toBe(1);
        expect(o.dot).toBe(1);
        expect(kExploreLookCpu(look, 0, u, kk * sp, 0, sideFw, pxW, tw, false, o)).toBeCloseTo(
          1 - 0.55 * u * u,
          12
        );
        expect(o.dot).toBe(1);
      }
      // The cap (the solid end's round end) is not a dot: it keeps the
      // thread's color under HC.
      expect(kExploreLookCpu(look, 0, 0.1, 0.1 * tw, 0, sideFw, pxW, tw, true, o)).toBe(1);
      expect(o.dot).toBe(0);
      expect(kExploreLookCpu(look, 0, 0.1, 0, 0.2, sideFw, pxW, tw, true, o)).toBe(1);
      expect(o.dot).toBe(0);
    }
  });

  it("every other look, and every point outside a frontier, ignores HC (out.dot 0)", () => {
    const o = { dot: -1 };
    for (const look of [0, 1, 2, 4]) {
      for (const u of [0, 0.3, 0.7, 0.99]) {
        for (const s of [0, 0.4, 1.3]) {
          const plain = kExploreLookCpu(look, 0.6, u, s, 0.1, sideFw, pxW, tw, false, o);
          expect(o.dot).toBe(0);
          expect(kExploreLookCpu(look, 0.6, u, s, 0.1, sideFw, pxW, tw, true, o)).toBe(plain);
          expect(o.dot).toBe(0);
        }
      }
    }
    for (const look of [3, 5]) {
      o.dot = -1;
      expect(kExploreLookCpu(look, 0.6, -1, 1, 0, sideFw, pxW, tw, true, o)).toBe(0.6);
      expect(o.dot).toBe(0);
    }
  });

  it("the shaped cut follows the dots' strength under HC (exploreCutCoverCpu hc)", () => {
    const shape: GapShape = {
      k2b: 1,
      ramps: [{ aS: 1, F: 3, dK: 1, tK: 1, front: true }],
      max: false,
    };
    const prof = profileOf(shape, 1);
    let differ = 0;
    for (let i = 0; i <= 120; i++) {
      const A = 1 + (i / 120) * 3;
      // aS 1 and F 3 are exact in f32, so the twin's arithmetic is this.
      const d = (A - 1) / 3;
      const t = Math.min(d, 1);
      const v = 1 - t * t * (3 - 2 * t);
      const u = t < 1 ? t : -1;
      const s = Math.abs(A - 1);
      for (const look of [0, 1, 2, 3, 4, 5]) {
        const plain = exploreCutCoverCpu(prof, A, look, tw, pxW);
        const hc = exploreCutCoverCpu(prof, A, look, tw, pxW, true);
        expect(hc).toBeCloseTo(kExploreLookCpu(look, v, u, s, 0, pxW / tw, pxW, tw, true), 6);
        if (look === 3 || look === 5) {
          if (hc !== plain) differ++;
        } else {
          expect(hc).toBe(plain);
        }
      }
    }
    expect(differ).toBeGreaterThan(20);
  });

  it("the GLSL carries the twin's branch, and main whitens the dots before char", () => {
    expect(EXPLORE_LOOK_GLSL).toContain("highp float kExDot;");
    expect(EXPLORE_LOOK_GLSL).toContain("  kExDot = 0.0;\n  if (u < 0.0 || look < 2) return v;");
    expect(EXPLORE_LOOK_GLSL).toContain("  kExDot = dDot < dCap ? 1.0 : 0.0;");
    expect(EXPLORE_LOOK_GLSL).toContain(
      "(uKExplore.x > 1.5 ? 1.0 : 1.0 - 0.55 * u * u)"
    );
    const call = EXPLORE_MAIN_GLSL.indexOf("ev = kExploreLook(look, evRaw, u, exS");
    const white = EXPLORE_MAIN_GLSL.indexOf("if (uKExplore.x > 1.5) rgb = mix(rgb, vec3(1.0), kExDot);");
    const debug = EXPLORE_MAIN_GLSL.indexOf("if (uKBase.z > 5.5)");
    const char = EXPLORE_MAIN_GLSL.indexOf("kCharAt(kc, kctrl)");
    expect(call).toBeGreaterThan(0);
    expect(white).toBeGreaterThan(call);
    expect(debug).toBeGreaterThan(white);
    expect(char).toBeGreaterThan(white);
    // Every other reader of uKExplore.x tests it against 0.5, so 2 is "on".
    for (const g of [EXPLORE_GAP_SURE_GLSL, EXPLORE_FAN_SURE_GLSL]) {
      expect(g).toContain("uKExplore.x > 0.5");
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
