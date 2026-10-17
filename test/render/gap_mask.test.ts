// K8 G3-1: SDF gap rows (src/render/gap_mask.ts, fabric_sdf.ts). The row
// layout, the SAMP range rounding (outward; open chains clamped at their
// end, closed ones across the seam), the stride cap, the chunk circles,
// the protect ranges, the marker disc (nPts 0), and a CPU mirror of the
// shader's chunk-pruned search against brute force (the GPU 0 px check
// on G1's set is the brief's browser A/B; this pins the same maths).
import { describe, expect, it } from "vitest";
import {
  GAP_CHUNK,
  GAP_MAX_CHUNKS,
  GAP_MAX_PTS,
  GAP_MAX_STRIDE,
  GAP_PROF_BASE,
  GAP_TEX_W,
  GapMaskTable,
  gapChunkBounds,
  gapRangeCircle,
  gapSampRange,
  type GapSlotParams,
} from "../../src/render/gap_mask";
import { sampAtCpu } from "../../src/render/fabric_sdf";
import { packSamp } from "../../src/render/samp_table";

describe("gapSampRange: rounded outward", () => {
  it("holds every sample the reach touches, no more than one extra a side", () => {
    // 100 samples over 9 world: arcPer 0.09 (closed) / 9/99 (open).
    const { ref, arcPer } = gapSampRange(9, 100, true, 4.5, 1.0, 2.0);
    expect(arcPer).toBeCloseTo(0.09, 12);
    const arc = (j: number) => (ref.kStart + j * ref.stride) * arcPer;
    expect(arc(0)).toBeLessThanOrEqual(3.5);
    expect(arc(0)).toBeGreaterThan(3.5 - arcPer);
    expect(arc(ref.n - 1)).toBeGreaterThanOrEqual(6.5);
    expect(arc(ref.n - 1)).toBeLessThan(6.5 + arcPer);
    expect(ref.stride).toBe(1);
  });

  it("an open chain clamps at its end (never a last-to-first chord)", () => {
    const { ref, arcPer } = gapSampRange(9, 100, false, 8.9, 2.0, 2.0);
    expect(ref.kStart).toBeGreaterThanOrEqual(0);
    expect(ref.kStart + (ref.n - 1) * ref.stride).toBe(99);
    expect((ref.kStart + (ref.n - 1) * ref.stride) * arcPer).toBeCloseTo(9, 9);
    const head = gapSampRange(9, 100, false, 0.1, 2.0, 1.0).ref;
    expect(head.kStart).toBe(0);
  });

  it("a closed chain crosses its seam (negative kStart wraps)", () => {
    const { ref, arcPer } = gapSampRange(9, 100, true, 0.2, 1.0, 1.0);
    expect(ref.kStart).toBeLessThan(0);
    const wrapped = ((ref.kStart % 100) + 100) % 100;
    expect(wrapped).toBeGreaterThan(80);
    // The covered arcs still bracket the reach, one sample of slack a side.
    expect(ref.kStart * arcPer).toBeLessThanOrEqual(-0.8);
    expect((ref.kStart + ref.n - 1) * arcPer).toBeGreaterThanOrEqual(1.2);
  });

  it("a slot over the cap strides at most 3 and never cuts the reach", () => {
    // 134 raw samples (12 world at 0.09): stride 3, chord 0.27 <= 0.3.
    const { ref, arcPer } = gapSampRange(18, 200, true, 9, 6, 6);
    expect(ref.stride).toBeLessThanOrEqual(GAP_MAX_STRIDE);
    expect(ref.n).toBeLessThanOrEqual(GAP_MAX_PTS);
    expect(ref.stride * arcPer).toBeLessThanOrEqual(0.3);
    expect(ref.kStart * arcPer).toBeLessThanOrEqual(3);
    expect((ref.kStart + (ref.n - 1) * ref.stride) * arcPer).toBeGreaterThanOrEqual(15 - 3 * arcPer);
    // A mid-size span strides 2, a small one stays 1.
    expect(gapSampRange(9, 100, true, 4.5, 4.5, 4.5).ref.stride).toBe(2);
    expect(gapSampRange(9, 100, true, 4.5, 1, 1).ref.stride).toBe(1);
  });
});

describe("chunk circles and protect ranges", () => {
  const pts: [number, number][] = [];
  for (let j = 0; j < 40; j++) pts.push([Math.cos(j * 0.2) * 3, Math.sin(j * 0.2) * 3]);
  const at = (j: number): readonly [number, number] => pts[j];

  it("every chunk circle holds its points; firstPoint strides by GAP_CHUNK", () => {
    const ch = gapChunkBounds(at, 40);
    expect(ch.length).toBe(GAP_MAX_CHUNKS * 4);
    for (let c = 0; c < GAP_MAX_CHUNKS; c++) {
      expect(ch[c * 4 + 3]).toBe(c * GAP_CHUNK);
      const j0 = c * GAP_CHUNK;
      if (j0 >= 40) {
        expect(ch[c * 4 + 2]).toBe(0);
        continue;
      }
      const j1 = Math.min(j0 + GAP_CHUNK, 39);
      for (let j = j0; j <= j1; j++) {
        expect(Math.hypot(pts[j][0] - ch[c * 4], pts[j][1] - ch[c * 4 + 1])).toBeLessThanOrEqual(ch[c * 4 + 2] + 1e-6);
      }
    }
    const circ = gapRangeCircle(at, 40);
    for (const [x, y] of pts) expect(Math.hypot(x - circ[0], y - circ[1])).toBeLessThanOrEqual(circ[2] + 1e-6);
  });

  it("the pruned search (CPU mirror of the shader) equals brute force", () => {
    const ch = gapChunkBounds(at, 40);
    const segD2 = (p: [number, number], a: [number, number], b: [number, number]): number => {
      const abx = b[0] - a[0], aby = b[1] - a[1];
      const l2 = abx * abx + aby * aby;
      const h = l2 > 1e-12 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2)) : 0;
      const qx = p[0] - a[0] - abx * h, qy = p[1] - a[1] - aby * h;
      return qx * qx + qy * qy;
    };
    let checked = 0;
    for (let i = 0; i < 300; i++) {
      const p: [number, number] = [Math.cos(i * 1.7) * (2 + (i % 7) * 0.4), Math.sin(i * 2.3) * (2 + (i % 5) * 0.5)];
      let brute = Infinity, bkB = -1;
      for (let k = 0; k < 39; k++) {
        const d2 = segD2(p, pts[k], pts[k + 1]);
        if (d2 < brute) { brute = d2; bkB = k; }
      }
      let pruned = Infinity, bkP = -1;
      for (let c = 0; c < GAP_MAX_CHUNKS; c++) {
        const k0 = c * GAP_CHUNK;
        if (k0 >= 39) break;
        const lb = Math.max(0, Math.hypot(p[0] - ch[c * 4], p[1] - ch[c * 4 + 1]) - ch[c * 4 + 2]);
        if (lb * lb >= pruned) continue;
        for (let j = 0; j < GAP_CHUNK && k0 + j < 39; j++) {
          const d2 = segD2(p, pts[k0 + j], pts[k0 + j + 1]);
          if (d2 < pruned) { pruned = d2; bkP = k0 + j; }
        }
      }
      expect(pruned).toBe(brute);
      expect(bkP).toBe(bkB);
      checked++;
    }
    expect(checked).toBe(300);
  });
});

function slotParams(over: GapSlotParams["over"], arcPer: number, chunks: Float32Array): GapSlotParams {
  return {
    hOver: 0.25, margin: 0.1, fade: 0.2, strength: 1, perp: true,
    arcScale: 10, centerArc: 4.5, winNeg: 1, winPos: 2, closed: true, totalU: 9,
    tanX: 1, tanY: 0, selfExcl: 0,
    marginScaleNeg: 1, marginScalePos: 1, fadeScaleNeg: 1, fadeScalePos: 1,
    centerX: 0.5, centerY: -0.5, sminK: 0.05, farK: 7,
    protNegA: -2, protNegB: -0.5, protPosA: 0.5, protPosB: 2,
    over, overArcPer: arcPer, overChunks: chunks,
    protNeg: { base: 40, kStart: -3, n: 12, stride: 2, count: 100, closed: true },
    protPos: null,
    protNegCircle: [1, 2, 3],
    protPosCircle: null,
  };
}

describe("GapMaskTable: the G3-1 row", () => {
  it("layout: header, range, chunks, protect, profile bases", () => {
    expect(GAP_TEX_W).toBe(25);
    expect(GAP_PROF_BASE).toBe(22);
    const { ref, arcPer } = gapSampRange(9, 100, true, 4.5, 1, 2);
    ref.base = 200;
    const chunks = gapChunkBounds((j) => {
      const raw = ref.kStart + j * ref.stride;
      const idx = ((raw % 100) + 100) % 100;
      return [Math.cos(idx * 0.09), Math.sin(idx * 0.09)] as [number, number];
    }, ref.n);
    const t = new GapMaskTable(4);
    t.writeSlot(1, slotParams(ref, arcPer, chunks));
    const row = t.readRow(1);
    expect(row[11]).toBe(ref.n); // t2.w = sampled nPts
    expect(row[16]).toBe(0); // selfExcl
    expect(row[17]).toBe(200); // overBase
    expect(row[18]).toBe(ref.kStart);
    expect(row[19]).toBeCloseTo(arcPer, 6);
    expect(row[36]).toBe(ref.stride);
    expect(row[37]).toBe(100);
    expect(row[38]).toBe(1); // closed
    expect(Array.from(row.subarray(40, 44))).toEqual(Array.from(chunks.subarray(0, 4)));
    // Protect neg at texel 18, its circle at 19 with a SIGNED count.
    expect(Array.from(row.subarray(72, 76))).toEqual([40, -3, 12, 2]);
    expect(Array.from(row.subarray(76, 80))).toEqual([1, 2, 3, -100]);
    expect(t.readProt(1)).toEqual([[40, -3, 12, 2], [0, 0, 0, 0]]);
    const pr = t.polyRange(1);
    expect(pr[0]).toBeCloseTo(ref.kStart * arcPer, 5);
    expect(pr[1]).toBeCloseTo((ref.kStart + (ref.n - 1) * ref.stride) * arcPer, 5);
    expect(pr[2]).toBe(ref.n);
    // The bound covers the sampled points, grown by hOver.
    const r = t.readSlot(1);
    expect(r.range.base).toBe(200);
    expect(r.range.kStart).toBe(ref.kStart);
    expect(r.range.n).toBe(ref.n);
    expect(r.range.stride).toBe(ref.stride);
    expect(r.range.count).toBe(100);
    expect(r.range.closed).toBe(true);
    expect(r.range.arcPer).toBeCloseTo(arcPer, 6);
    expect(r.header[2]).toBeGreaterThan(0.25);
  });

  it("the marker disc: nPts 0, the bound centered on the disc", () => {
    const t = new GapMaskTable(4);
    const p = slotParams({ base: 0, kStart: 0, n: 0, stride: 1, count: 1, closed: false }, 1, new Float32Array(32));
    p.centerX = 3;
    p.centerY = -2;
    p.hOver = 0.4;
    t.writeSlot(2, p);
    const s = t.readSlot(2);
    expect(s.n).toBe(0);
    expect(s.header[0]).toBe(3);
    expect(s.header[1]).toBe(-2);
    expect(s.header[2]).toBeCloseTo(0.4 + 0.1 + 0.2 + 0.25 * 0.05, 6);
    expect(t.polyRange(2)).toEqual([0, 0, 0]);
  });

  it("protect visibility lives in the spare texels, defaults to full and survives a shape", () => {
    const { ref, arcPer } = gapSampRange(9, 100, true, 4.5, 1, 2);
    ref.base = 0;
    const chunks = gapChunkBounds(() => [0, 0] as [number, number], ref.n);
    const t = new GapMaskTable(4);
    t.writeSlot(0, slotParams(ref, arcPer, chunks));
    // Texel 3.x (neg) and texel 9.w (pos): full waiver as solved.
    expect(t.protVisOf(0)).toEqual([1, 1]);
    expect(t.readRow(0)[12]).toBe(1);
    expect(t.readRow(0)[39]).toBe(1);
    expect(t.setProtVis(0, 0.25, 0)).toBe(true);
    expect(t.protVisOf(0)).toEqual([0.25, 0]);
    expect(t.readRow(0)[12]).toBe(0.25);
    expect(t.readRow(0)[39]).toBe(0);
    expect(t.setProtVis(0, 0.25, 0)).toBe(false);
    // A shaped cut (different texels) leaves the protect factors alone.
    t.setShape(0, { k2b: 1, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false });
    expect(t.protVisOf(0)).toEqual([0.25, 0]);
    expect(t.readRow(0)[12]).toBe(0.25);
    // A re-solve restores the full waiver (applyExploreGaps re-derives it).
    t.writeSlot(0, slotParams(ref, arcPer, chunks));
    expect(t.protVisOf(0)).toEqual([1, 1]);
  });

  it("setVis and setShape keep their texels on the new row", () => {
    const { ref, arcPer } = gapSampRange(9, 100, true, 4.5, 1, 2);
    ref.base = 0;
    const chunks = gapChunkBounds(() => [0, 0] as [number, number], ref.n);
    const t = new GapMaskTable(4);
    t.writeSlot(0, slotParams(ref, arcPer, chunks));
    const solved = t.readSlot(0);
    expect(t.setVis(0, 0)).toBe(true);
    expect(t.readSlot(0).header[2]).toBe(-1);
    expect(t.setVis(0, 1)).toBe(true);
    expect(t.readSlot(0)).toEqual(solved);
    expect(t.setShape(0, { k2b: 1, ramps: [{ aS: 0.5, F: 1, dK: 1, tK: 1, front: false }], max: false })).toBe(true);
    expect(t.isShaped(0)).toBe(true);
    expect(t.readRow(0)[GAP_PROF_BASE * 4 + 8]).toBe(1);
  });
});

describe("sampAt CPU mirror", () => {
  it("decodes SAMP exactly as packed (two samples per texel)", () => {
    const positions = new Float32Array(7 * 2).map((_, i) => i * 0.5 - 2);
    const data = new Float32Array(32).fill(NaN);
    packSamp(data, 4, positions, 7);
    const out = [0, 0];
    for (let k = 0; k < 7; k++) {
      sampAtCpu(data, 4 + k, out);
      expect(out).toEqual([positions[k * 2], positions[k * 2 + 1]]);
    }
  });
});
