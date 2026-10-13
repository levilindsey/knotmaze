// G2.3 (gameplay paint per pixel): the CPU mirror (kPaintAt +
// kComposePaint - line-for-line twins of the shader's) against the frozen
// retired per-sample pass and its accent strip (fixtures/pre_g23.ts), at
// the ribbon's own sample arcs, on random declarations over random chains.

import { describe, expect, it } from "vitest";
import { ITEM_FLAG, PAINT_ITEM } from "../../src/render/paint_const";
import {
  MAX_KNOTS,
  kArcOfCtrl,
  kChain,
  kComposePaint,
  kPaintAt,
  writeChainHeader,
  writeGeomTable,
  type KData,
  type KPaintState,
  type KUniforms,
} from "../../src/render/paint_math";
import { randomChain } from "./fixtures/chains";
import {
  oldCompose,
  oldPaintU,
  oldStrip,
  type OldCap,
  type OldClock,
  type OldPulse,
  type OldSpan,
} from "./fixtures/pre_g23";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

const GOLD = 0xffd24a;

function uniforms(k: OldClock): KUniforms {
  const K = new Float32Array(MAX_KNOTS * 4);
  K.set([0, 0, 1, 1]);
  const s = Math.max(0.5, k.spacing);
  const mod = (x: number): number => x - s * Math.floor(x / s);
  const fi = Math.min(1, Math.max(0, (k.clock - k.pulseBorn) / 0.45));
  return {
    uKBase: new Float32Array([0, 0, 0, 1]),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: K,
    uKGamut: new Float32Array([0, 280, 0.45, 0.64]),
    uKSect: new Float32Array(4),
    uKPaint: new Float32Array([1, 0, 0, 0.5 + 0.3 * Math.sin(k.clock * 5.2)]),
    uKPulse: new Float32Array([mod(k.clock * 1.6), mod((k.clock + 0.3) * 1.6), s, fi * fi * (3 - 2 * fi)]),
    uKGold: new Float32Array([((GOLD >> 16) & 255) / 255, ((GOLD >> 8) & 255) / 255, (GOLD & 255) / 255, 0]),
  };
}

// One chain's tables + its declaration as KPAINT (the layout
// PaintScene.setPaintItems writes: per-slot (first, count) at idxBase,
// refs 4 per texel, items 2 texels each).
function scene(
  cal: number[],
  total: number,
  count: number,
  closed: boolean,
  spans: OldSpan[],
  caps: OldCap[],
  pulses: OldPulse[],
  U: KUniforms
): KData {
  const n = cal.length;
  const idxBase = 2;
  const stat = new Float32Array((idxBase + n) * 4);
  writeChainHeader(stat, 0, { nCtrl: n, closed, count, idxBase, geomBase: 0, srcFirst: 0, srcCount: 0, paintBase: 0 });
  const geom = new Float32Array((2 + Math.ceil(n / 4)) * 4);
  writeGeomTable(geom, 0, total, count, closed, cal);
  // Items in evaluation order, and every slot each one can touch (all
  // slots: the test chains are short - order is what matters).
  const items: number[] = [];
  for (const s of spans) items.push(PAINT_ITEM.SPAN, s.c0, s.c1, s.p0 ?? 1, s.p1 ?? 1, 0, 0, 0);
  for (const c of caps) items.push(PAINT_ITEM.CAP, c.ctrl, c.ctrl, c.p ?? 1, 0, 0, c.radius, 0);
  for (const p of pulses) {
    const f = (p.inward ? ITEM_FLAG.INWARD : 0) | (p.onPath ? ITEM_FLAG.ON_PATH : 0) | (p.hovered ? ITEM_FLAG.HOVER : 0);
    items.push(PAINT_ITEM.PULSE, p.cJunction, p.cFar, 0, 0, f, 0, 0);
  }
  const nItems = items.length / 8;
  const refBase = idxBase + n;
  const itemBase = refBase + Math.ceil((n * nItems) / 4) + 1;
  const paint = new Float32Array((itemBase + 2 * nItems + 1) * 4);
  let r = 0;
  for (let s = 0; s < n; s++) {
    paint[(idxBase + s) * 4] = r;
    paint[(idxBase + s) * 4 + 1] = nItems;
    for (let i = 0; i < nItems; i++, r++) paint[(refBase + (r >> 2)) * 4 + (r & 3)] = i;
  }
  for (let i = 0; i < items.length; i++) paint[itemBase * 4 + i] = Math.fround(items[i]);
  U.uKPaint[1] = refBase;
  U.uKPaint[2] = itemBase;
  return { stat, geom, reveal: new Float32Array(8), paint };
}

describe("G2.3 paint mirror vs the retired per-sample pass", () => {
  it("gold spans, caps, pulses and hover compose as the accent strip did", () => {
    const r = rng(2323);
    const strip = oldStrip(GOLD);
    let checked = 0;
    let bands = 0;
    for (let trial = 0; trial < 24; trial++) {
      const closed = trial % 2 === 0;
      const ch = randomChain(r, 20 + Math.floor(r() * 50), closed);
      const n = ch.controlArcLengths.length;
      const top = closed ? n : n - 1;
      const spans: OldSpan[] = [];
      for (let i = 0; i < 2; i++) {
        const a = r() * top;
        spans.push({ c0: a, c1: a + r() * Math.min(8, top - a) });
      }
      const caps: OldCap[] = [{ ctrl: r() * top, radius: 0.31 }, { ctrl: r() * top, radius: 0.31 }];
      const pulses: OldPulse[] = [];
      for (let i = 0; i < 2; i++) {
        const j = Math.floor(r() * (top - 6));
        const far = j + 3 + Math.floor(r() * 3);
        pulses.push(r() < 0.5
          ? { cJunction: j, cFar: far, inward: r() < 0.5, onPath: r() < 0.5, hovered: r() < 0.25 }
          : { cJunction: far, cFar: j, inward: r() < 0.5, onPath: r() < 0.5, hovered: r() < 0.25 });
      }
      const clock: OldClock = { clock: 3 + r() * 40, pulseBorn: r() * 4, spacing: 1 + r() * 3 };
      const U = uniforms(clock);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, closed, spans, caps, pulses, U);
      const c = kChain(D, 0);
      const arcs: number[] = [];
      for (let k = 0; k < ch.count; k++) arcs.push(k * c.arcPer);
      const us = oldPaintU(arcs, c.total, closed, (x) => kArcOfCtrl(D, c, x), spans, caps, pulses, clock);
      const st: KPaintState = { p: 0, band: false, famB: false, v: 0 };
      for (let k = 0; k < ch.count; k++) {
        // The sample's ctrl through the same table (the vertex's own).
        let lo = 0;
        let hi = top;
        for (let it = 0; it < 50; it++) {
          const m = (lo + hi) / 2;
          if (kArcOfCtrl(D, c, m) < arcs[k]) lo = m;
          else hi = m;
        }
        const S = [r(), r(), r()];
        const got = [...S];
        kPaintAt(D, U, c, (lo + hi) / 2, arcs[k], 0, st);
        kComposePaint(U, got, st, 0);
        if (st.band) bands++;
        const want = oldCompose(S, us[k], strip);
        // The strip was 8-bit (rgb and weight): within ~1/255.
        for (let i = 0; i < 3; i++) expect(Math.abs(got[i] - want[i])).toBeLessThan(1.6 / 255);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(2000);
    expect(bands).toBeGreaterThan(100);
  });

  it("the trail fade is linear in p (K4); the strip compressed it into clamp(6p - 2.5)", () => {
    const strip = oldStrip(GOLD);
    const U = uniforms({ clock: 0, pulseBorn: 0, spacing: 2.5 });
    const S = [0.3, 0.5, 0.7];
    for (let i = 0; i <= 20; i++) {
      const p = i / 20;
      const got = [...S];
      kComposePaint(U, got, { p, band: false, famB: false, v: 0 }, 0);
      const goldRgb = [U.uKGold[0], U.uKGold[1], U.uKGold[2]];
      for (let c = 0; c < 3; c++) expect(got[c]).toBeCloseTo(S[c] + (goldRgb[c] - S[c]) * p, 6);
      // The retired look, for the record.
      const old = oldCompose(S, (115 + 6 * p) / 256, strip);
      const g = Math.min(1, Math.max(0, 6 * p - 2.5));
      for (let c = 0; c < 3; c++) expect(Math.abs(old[c] - (S[c] + (goldRgb[c] - S[c]) * g))).toBeLessThan(1.6 / 255);
    }
  });
});
