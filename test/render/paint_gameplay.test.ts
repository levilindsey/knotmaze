// G2.3 (gameplay paint per pixel): the CPU mirror (kPaintAt +
// kComposePaint - line-for-line twins of the shader's) against the frozen
// retired per-sample pass and its accent strip (fixtures/pre_g23.ts), at
// the ribbon's own sample arcs, on random declarations over random chains.
// K75: a pulse brightens the thread's OWN paint (the retired pass picked a
// band family per pulse arm, which drew gold crests over a fading trail).

import { describe, expect, it } from "vitest";
import { ITEM_FLAG, PAINT_CONST, PAINT_ITEM } from "../../src/render/paint_const";
import {
  MAX_KNOTS,
  kArcOfCtrl,
  kChain,
  kComposePaint,
  kPaintAt,
  kPulseV,
  kReachWin,
  kRimAcross,
  writeChainHeader,
  writeGeomTable,
  type KData,
  type KPaintState,
  type KUniforms,
} from "../../src/render/paint_math";
import { TRAIL_FADE_FRAC, trailFade, trailSpans, type TrailPiece } from "../../src/render/trail_paint";
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
    // Whole arms (the retired pass had no reach window), unless a test sets one.
    uKReach: new Float32Array([1e6, 1, 0, 0]),
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
  U: KUniforms,
  // K145: hover-glow runs (RIM items: unwrapped ctrl span and end gap).
  rims: { c0: number; c1: number; gap: number }[] = []
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
    const f = (p.inward ? ITEM_FLAG.INWARD : 0) | (p.hovered ? ITEM_FLAG.HOVER : 0);
    items.push(PAINT_ITEM.PULSE, p.cJunction, p.cFar, 0, 0, f, 0, 0);
  }
  for (const m of rims) items.push(PAINT_ITEM.RIM, m.c0, m.c1, m.gap, 0, 0, 0, 0);
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
  // The retired pass chose each pulse's band FAMILY per arm (onPath: gold ->
  // white, else section -> white). Gold mode keeps the two consistent - a
  // traveled arm is gold along its whole run, an untraveled one unpainted -
  // and there the mirror must reproduce the strip. Where a random
  // declaration contradicts its own flag (a gold-band crest over unpainted
  // thread, or the other way round) the retired pass drew the K75 bands:
  // those points are skipped here and pinned by the K75 test below.
  it("gold spans, caps, pulses and hover compose as the accent strip did", () => {
    const r = rng(2323);
    const strip = oldStrip(GOLD);
    let checked = 0;
    let bands = 0;
    let skipped = 0;
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
      // Gold mode: a traveled (onPath) arm wears gold along its whole run.
      for (const p of pulses) {
        if (p.onPath) spans.push({ c0: Math.min(p.cJunction, p.cFar), c1: Math.max(p.cJunction, p.cFar) });
      }
      const clock: OldClock = { clock: 3 + r() * 40, pulseBorn: r() * 4, spacing: 1 + r() * 3 };
      const U = uniforms(clock);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, closed, spans, caps, pulses, U);
      const c = kChain(D, 0);
      const arcs: number[] = [];
      for (let k = 0; k < ch.count; k++) arcs.push(k * c.arcPer);
      const arcOf = (x: number): number => kArcOfCtrl(D, c, x);
      const us = oldPaintU(arcs, c.total, closed, arcOf, spans, caps, pulses, clock);
      // The thread's paint under the pulses (spans + caps alone).
      const under = oldPaintU(arcs, c.total, closed, arcOf, spans, caps, [], clock);
      const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
      for (let k = 0; k < ch.count; k++) {
        const famB = us[k] >= 124 / 256;
        const famA = us[k] < 112 / 256;
        if ((famB && under[k] !== 121 / 256) || (famA && under[k] !== 115 / 256)) {
          skipped++;
          continue;
        }
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
      kComposePaint(U, got, { p, band: false, v: 0, rim: 0 }, 0);
      const goldRgb = [U.uKGold[0], U.uKGold[1], U.uKGold[2]];
      for (let c = 0; c < 3; c++) expect(got[c]).toBeCloseTo(S[c] + (goldRgb[c] - S[c]) * p, 6);
      // The retired look, for the record.
      const old = oldCompose(S, (115 + 6 * p) / 256, strip);
      const g = Math.min(1, Math.max(0, 6 * p - 2.5));
      for (let c = 0; c < 3; c++) expect(Math.abs(old[c] - (S[c] + (goldRgb[c] - S[c]) * g))).toBeLessThan(1.6 / 255);
    }
  });

  // K75 (Levi, 2026-10-12: "unexpected yellow banding" on the incoming
  // segment's pulses in trail mode). The head junction's arrival run is the
  // trail's newest span, fading from gold at the head toward base; the
  // retired pass gave its inbound crests the GOLD band (its onPath flag
  // came from the arm's junction end), so each crest's flanks were pure
  // gold over the faded thread. A pulse must brighten the thread's own
  // paint, and the color along the run must stay continuous.
  it("K75: crests over a trail fade brighten the thread's own paint (no gold bands)", () => {
    const r = rng(75);
    const ch = randomChain(r, 60, false);
    const S = [0.55, 0.35, 0.75];
    // The arrival run 10..30 (head junction at 30), gold at the head fading
    // to 0.13 at its old end, the oldest partial run 6..10 fading out, a
    // cap at the previous junction at the trail's local intensity; the
    // inbound arm and an untraveled outbound arm at the head.
    const spans: OldSpan[] = [
      { c0: 6, c1: 10, p0: 0, p1: 0.13 },
      { c0: 10, c1: 30, p0: 0.13, p1: 1 },
    ];
    const caps: OldCap[] = [{ ctrl: 10, radius: 0.31, p: 0.13 }];
    const pulses: OldPulse[] = [
      { cJunction: 30, cFar: 10, inward: true, onPath: true, hovered: false },
      { cJunction: 30, cFar: 45, inward: false, onPath: false, hovered: false },
    ];
    const strip = oldStrip(GOLD);
    const PX = 0.02;
    let maxStep = 0;
    let maxStepOld = 0;
    let crestsOverFade = 0;
    for (let t = 0; t < 12; t++) {
      const clock: OldClock = { clock: 20 + t * 0.13, pulseBorn: 0, spacing: 2.5 };
      const U = uniforms(clock);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, caps, pulses, U);
      const U0 = uniforms(clock);
      const D0 = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, caps, [], U0);
      const c = kChain(D, 0);
      const c0 = kChain(D0, 0);
      const arcOf = (x: number): number => kArcOfCtrl(D, c, x);
      const a0 = arcOf(5);
      const a1 = arcOf(46);
      const arcs: number[] = [];
      for (let a = a0; a <= a1; a += 0.005) arcs.push(a);
      const oldU = oldPaintU(arcs, c.total, false, arcOf, spans, caps, pulses, clock);
      const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
      const st0: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
      let prev: number[] | null = null;
      let prevOld: number[] | null = null;
      arcs.forEach((a, k) => {
        let lo = 0;
        let hi = 59;
        for (let it = 0; it < 50; it++) {
          const m = (lo + hi) / 2;
          if (arcOf(m) < a) lo = m;
          else hi = m;
        }
        const ctrl = (lo + hi) / 2;
        // The thread's paint without the pulses ... (span ends antialiased
        // over a pixel's arc, as on screen: the head junction's span end is
        // a real paint edge)
        const paint = [...S];
        kComposePaint(U0, paint, kPaintAt(D0, U0, c0, ctrl, a, PX, st0), 0);
        // ... and with them: exactly that paint, brightened by the band.
        const got = [...S];
        kPaintAt(D, U, c, ctrl, a, PX, st);
        kComposePaint(U, got, st, 0);
        const w = st.band ? PAINT_CONST.K_BAND * Math.min(1, st.v) : 0;
        for (let i = 0; i < 3; i++) expect(got[i]).toBeCloseTo(paint[i] + (1 - paint[i]) * w, 6);
        if (st.band && st.p > 0.2 && st.p < 0.95) crestsOverFade++;
        if (prev) maxStep = Math.max(maxStep, ...got.map((x, i) => Math.abs(x - prev![i])));
        prev = got;
        const old = oldCompose(S, oldU[k], strip);
        if (prevOld) maxStepOld = Math.max(maxStepOld, ...old.map((x, i) => Math.abs(x - prevOld![i])));
        prevOld = old;
      });
    }
    // The scene exercises the K75 case, the retired composition banded on
    // it, and the mirror's color moves continuously along the run.
    expect(crestsOverFade).toBeGreaterThan(500);
    expect(maxStepOld).toBeGreaterThan(40 / 255);
    expect(maxStep).toBeLessThan(6 / 255);
  });

  // K75 (Levi: the pulses should "only extend a set distance away from the
  // junction along the segment ... and fade out at the end"): uKReach =
  // (reach, fade) windows the trains. K93 (Levi, 2026-10-13: "hover should
  // stop at pulseReach (and fade-out toward the end, same as pulseReach)"):
  // the hover takes the same window; it used to light the whole run.
  it("K75 + K93: pulse trains and the hover end at the reach, fading over its end", () => {
    for (const R of [3, 15]) {
      const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
      const U0 = uniforms(k); // Whole arms.
      const U = uniforms(k);
      const F = Math.min(PAINT_CONST.PULSE_REACH_FADE, 0.5 * R); // The renderer's rule.
      U.uKReach[0] = R;
      U.uKReach[1] = F;
      const span = R + 9; // An arm longer than the reach.
      const steps = span * 1000;
      expect(U.uKPaint[3]).toBeGreaterThan(0.2);
      expect(kReachWin(U, R - F)).toBe(1);
      expect(kReachWin(U, R - F / 2)).toBeCloseTo(0.5, 12);
      expect(kReachWin(U, R)).toBe(0);
      for (const inward of [true, false]) {
        let prev = kPulseV(U, 0, span, inward, false);
        let prevH = kPulseV(U, 0, span, inward, true);
        let maxStep = 0;
        let maxStepH = 0;
        let lit = 0;
        let litH = 0;
        for (let i = 0; i <= steps; i++) {
          const d = i / 1000;
          const v = kPulseV(U, d, span, inward, false);
          const whole = kPulseV(U0, d, span, inward, false);
          if (d <= R - F) expect(v).toBe(whole);
          if (d >= R) expect(v).toBe(0);
          expect(v).toBeLessThanOrEqual(whole);
          if (v > PAINT_CONST.PULSE_MIN_V) lit++;
          maxStep = Math.max(maxStep, Math.abs(v - prev));
          prev = v;
          // The hover: the old whole-run breath, inside the same window.
          const h = kPulseV(U, d, span, inward, true);
          const hWhole = kPulseV(U0, d, span, inward, true);
          // The breath (0.40 at this clock), out to the run's end window.
          if (d < span - PAINT_CONST.PULSE_END_WINDOW - 1e-6) expect(hWhole).toBe(U.uKPaint[3]);
          expect(h).toBeCloseTo(hWhole * kReachWin(U, d), 12);
          if (d <= R - F) expect(h).toBe(hWhole);
          if (d >= R) expect(h).toBe(0);
          if (h > PAINT_CONST.PULSE_MIN_V) litH++;
          maxStepH = Math.max(maxStepH, Math.abs(h - prevH));
          prevH = h;
        }
        expect(lit).toBeGreaterThan(2000); // The floor + crests near the joint.
        expect(maxStep).toBeLessThan(0.01); // No step at the window.
        // The hover lights the reach less the end of its fade (where it
        // drops under PULSE_MIN_V), and fades out smoothly.
        expect(litH / 1000).toBeGreaterThan(R - F / 2);
        expect(litH / 1000).toBeLessThan(R);
        expect(maxStepH).toBeLessThan(0.01);
      }
    }
  });

  // K93 (Levi, 2026-10-13: "Trail fade, yes"): the memory trail is solid
  // gold out to its fade start and fades linearly after it. The run holding
  // the fade start is two spans (trail_paint.ts): a solid one reaching past
  // the fade start and a fading one written after it, so the per-pixel paint
  // has no seam at the split; the single pre-K93 span faded that run from
  // its head junction on.
  it("K93: the trail's fade starts at the fade start, with no seam at the split", () => {
    const r = rng(93);
    const ch = randomChain(r, 60, false);
    // The arrival run 10..30 (head junction at 30, lattice length 5), the
    // run before it 4..10 (lattice length 1.5), a 6-long trail: the fade
    // start (4.2 behind the head) lies inside the arrival run, the trail's
    // end inside the older one.
    const L = 6;
    const pieces: TrailPiece[] = [
      { chain: 0, from: 4, to: 10, len: 1.5 },
      { chain: 0, from: 10, to: 30, len: 5 },
    ];
    const spans = trailSpans(pieces, L);
    expect(spans.length).toBe(3); // The older run's, then the split pair.
    const pAt = trailFade(L);
    // The cap buildTrail lays at the junction between the runs.
    const caps: OldCap[] = [{ ctrl: 10, radius: 0.31, p: pAt(5) }];
    // The pre-K93 single span over the arrival run.
    const oldSpans: OldSpan[] = [spans[0], { c0: 10, c1: 30, p0: pAt(5), p1: 1 }];
    const cS = 30 - 20 * (L * (1 - TRAIL_FADE_FRAC) / 5); // The fade start's ctrl.
    const PX = 0.02; // World arc per pixel.
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const U = uniforms(k);
    const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, caps, [], U);
    const Uo = uniforms(k);
    const Do = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, oldSpans, caps, [], Uo);
    const c = kChain(D, 0);
    const co = kChain(Do, 0);
    const arcOf = (x: number): number => kArcOfCtrl(D, c, x);
    const aJ = arcOf(10);
    const aS = arcOf(cS);
    const aH = arcOf(30);
    const farP = pAt(5);
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    let prev = -1;
    let maxStep = 0;
    let solid = 0;
    let fading = 0;
    let oldAtSplit = 1;
    // Along the arrival run, clear of the junction cap and the head's edge.
    for (let a = aJ + 0.31 + PX; a <= aH - PX; a += 0.005) {
      let lo = 0;
      let hi = 59;
      for (let it = 0; it < 50; it++) {
        const m = (lo + hi) / 2;
        if (arcOf(m) < a) lo = m;
        else hi = m;
      }
      const ctrl = (lo + hi) / 2;
      const p = kPaintAt(D, U, c, ctrl, a, PX, st).p;
      // Exact away from the fade start's pixel (inside it the fading span's
      // edge ramp blends the two, both near 1).
      if (a >= aS + PX) {
        // Head side of the fade start: solid gold.
        expect(p).toBe(1);
        solid++;
      } else if (a <= aS - PX) {
        // The fading part: linear in arc from 1 at the fade start down to
        // the trail's paint at the junction.
        expect(p).toBeCloseTo(farP + ((1 - farP) * (a - aJ)) / (aS - aJ), 5);
        fading++;
      } else {
        // Between the fading paint a pixel short of the fade start and 1.
        expect(p).toBeGreaterThan(farP + ((1 - farP) * (aS - PX - aJ)) / (aS - aJ) - 1e-6);
        expect(p).toBeLessThanOrEqual(1);
      }
      if (prev >= 0) maxStep = Math.max(maxStep, Math.abs(p - prev));
      prev = p;
      if (Math.abs(a - aS) < 0.003) oldAtSplit = kPaintAt(Do, Uo, co, ctrl, a, PX, st).p;
    }
    expect(solid).toBeGreaterThan(100);
    expect(fading).toBeGreaterThan(50);
    expect(maxStep).toBeLessThan(0.02); // No seam (a seam dips by 0.25).
    // The old span had already faded by the fade start.
    expect(oldAtSplit).toBeLessThan(0.95);
  });

  // K145 (Levi, 2026-10-13: "a long glow along either side of the thread,
  // but that doesn't extend past the bounds of the thread, and this glow
  // would fade-out quickly toward the center of the thread, and this glow
  // would fade-out at a distance from the hover position"; about 16:12: it
  // fades out toward the run's junctions). A RIM item holds the run's
  // unwrapped ctrl span and its end gap; uKReach.zw the strength and the
  // hover point. kPaintAt's `rim` is the strength along the thread and
  // kRimAcross shapes it across the ribbon.
  it("K145, K111 stage 3: the hover glow peaks at both edges and fades out toward the middle", () => {
    const W = PAINT_CONST.RIM_EDGE;
    expect(kRimAcross(0)).toBe(1);
    expect(kRimAcross(1)).toBe(1);
    let prev = kRimAcross(0.5);
    expect(prev).toBe(0);
    for (let i = 0; i <= 2000; i++) {
      const s = 0.5 + (0.5 * i) / 2000; // From the center line to an edge.
      const v = kRimAcross(s);
      expect(kRimAcross(1 - s)).toBeCloseTo(v, 12);
      if (Math.abs(2 * s - 1) <= 1 - W) expect(v).toBe(0);
      else expect(v).toBeGreaterThan(0);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v - prev).toBeLessThan(0.01);
      prev = v;
    }
    // Levi's look (K248): high at the edge, half strength halfway through the
    // fade, and wider than K145's square over the outer 0.6 (half strength
    // 0.18 of the half-width in from the edge). `inside` is the depth from
    // the edge, in half-widths.
    const at = (inside: number): number => kRimAcross(0.5 + 0.5 * (1 - inside));
    expect(at(W / 2)).toBeCloseTo(0.5, 12);
    expect(at(0.1 * W)).toBeGreaterThan(0.95);
    expect(at(0.3)).toBeGreaterThan(0.5);
    expect(W).toBeGreaterThan(0.6);
    expect(W).toBeLessThanOrEqual(1);
  });

  // The ctrl at an arc (a binary search over the mirror's own map).
  const ctrlAt = (D: KData, a: number, top: number): number => {
    const c = kChain(D, 0);
    let lo = 0;
    let hi = top;
    for (let it = 0; it < 60; it++) {
      const m = (lo + hi) / 2;
      if (kArcOfCtrl(D, c, m) < a) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  };

  it("K145: the glow peaks at the hover point, ends at the reach and fades toward the run's ends", () => {
    const r = rng(145);
    const ch = randomChain(r, 90, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const pulses: OldPulse[] = [{ cJunction: 10, cFar: 30, inward: false, onPath: false, hovered: false }];
    const spans: OldSpan[] = [{ c0: 40, c1: 70 }];
    const G = 0.45;
    const EF = PAINT_CONST.RIM_END_FADE;
    const PX = 0.02;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    const st0: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    // The sample arcs and their ctrls, found once (the tables are shared).
    const samples: [number, number][] = [];
    {
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], uniforms(k));
      for (let a = 0; a <= ch.totalLength; a += 0.002) samples.push([a, ctrlAt(D, a, n - 1)]);
    }
    for (const R of [0.5, 3, 15]) {
      for (const hoverAt of [50, 22, 12]) {
        const U = uniforms(k);
        const c0 = 10;
        const c1 = 80;
        const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, [], pulses, U, [{ c0, c1, gap: G }]);
        const U0 = uniforms(k);
        const D0 = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, [], pulses, U0);
        U.uKReach[0] = U0.uKReach[0] = R;
        U.uKReach[1] = U0.uKReach[1] = Math.min(PAINT_CONST.PULSE_REACH_FADE, 0.5 * R);
        U.uKReach[2] = 0.4;
        U.uKReach[3] = hoverAt;
        const S = U.uKReach[2];
        const c = kChain(D, 0);
        const c00 = kChain(D0, 0);
        const u0 = kArcOfCtrl(D, c, c0);
        const u1 = kArcOfCtrl(D, c, c1);
        const uh = kArcOfCtrl(D, c, hoverAt);
        let prev = 0;
        let maxStep = 0;
        let lit = 0;
        // Violations, counted (an expect per sample is slow): the rest of
        // the paint differs from the glow-less paint, the glow leaves [0, S],
        // it is lit off the run, inside an end gap or past the reach, or,
        // clear of the ends' fade, it is not the distance falloff alone.
        let otherPaint = 0;
        let range = 0;
        let darkLit = 0;
        let falloff = 0;
        for (const [a, ctrl] of samples) {
          const g = kPaintAt(D, U, c, ctrl, a, PX, st).rim;
          const s0 = kPaintAt(D0, U0, c00, ctrl, a, PX, st0);
          if (st.p !== s0.p || st.band !== s0.band || st.v !== s0.v || s0.rim !== 0) otherPaint++;
          if (!(g >= 0 && g <= S)) range++;
          const dEnd = Math.min(a - u0, u1 - a);
          if ((a < u0 || a > u1 || dEnd <= G || Math.abs(a - uh) >= R) && g !== 0) darkLit++;
          if (dEnd >= G + EF && Math.abs(g - S * (1 - smoothstep(Math.abs(a - uh) / R))) > 1e-6) falloff++;
          if (g > 0.01) lit++;
          maxStep = Math.max(maxStep, Math.abs(g - prev));
          prev = g;
        }
        expect([otherPaint, range, darkLit, falloff]).toEqual([0, 0, 0, 0]);
        // Full strength at a hover point clear of the ends' fade.
        const dEndH = Math.min(uh - u0, u1 - uh);
        const atH = kPaintAt(D, U, c, hoverAt, uh, PX, st).rim;
        if (dEndH >= G + EF) expect(atH).toBeCloseTo(S, 6);
        else expect(atH).toBeLessThan(S);
        // A smooth glow: no step between samples 0.002 apart.
        expect(maxStep).toBeLessThan(0.005);
        expect(lit).toBeGreaterThan(0);
        expect(lit * 0.002).toBeLessThan(2 * R);
      }
    }
  });

  it("K145: the glow wraps across a closed chain's seam, and strength 0 draws nothing", () => {
    const r = rng(1450);
    const ch = randomChain(r, 70, true);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const G = 0.45;
    const PX = 0.02;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    // A run across the seam (slots n - 12 .. n + 12, unwrapped), hovered just
    // past the seam (unwrapped too, as FabricMazeRenderer.setGlow gives it).
    const c0 = n - 12;
    const c1 = n + 12;
    for (const strength of [0.4, 0]) {
      const U = uniforms(k);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, true, [], [], [], U, [{ c0, c1, gap: G }]);
      U.uKReach[0] = 3;
      U.uKReach[1] = 1;
      U.uKReach[2] = strength;
      U.uKReach[3] = n + 1;
      const c = kChain(D, 0);
      const total = ch.totalLength;
      const uh = kArcOfCtrl(D, c, 1); // The hover point's arc (wrapped).
      let prev = -1;
      let maxStep = 0;
      let lit = 0;
      let peak = 0;
      // Walk the ring once from the middle of the far side, across the seam.
      for (let i = 0; i <= 20000; i++) {
        const a = (total / 2 + (total * i) / 20000) % total;
        const ctrl = ctrlAt(D, a, n - 1e-9);
        const g = kPaintAt(D, U, c, ctrl, a, PX, st).rim;
        if (strength === 0) expect(g).toBe(0);
        // The ring distance to the hover point.
        const dd = Math.abs(a - uh);
        const ring = Math.min(dd, total - dd);
        if (ring >= 3) expect(g).toBe(0);
        if (g > 0.01) lit++;
        peak = Math.max(peak, g);
        if (prev >= 0) maxStep = Math.max(maxStep, Math.abs(g - prev));
        prev = g;
      }
      if (strength > 0) {
        expect(peak).toBeCloseTo(Math.fround(strength), 3);
        // Lit on both sides of the seam: arcs just under the total and just
        // over 0 both glow.
        const before = kPaintAt(D, U, c, ctrlAt(D, total - 0.05, n - 1e-9), total - 0.05, PX, st).rim;
        const after = kPaintAt(D, U, c, ctrlAt(D, 0.05, n - 1e-9), 0.05, PX, st).rim;
        expect(before).toBeGreaterThan(0.2);
        expect(after).toBeGreaterThan(0.2);
        expect(lit).toBeGreaterThan(0);
      } else {
        expect(lit).toBe(0);
      }
      expect(maxStep).toBeLessThan(0.01);
    }
  });

  // K236 (c), K111 stage 3: the fade in from each end gap takes at most
  // RIM_END_SHARE of the stretch between the gap and the run's middle, so a
  // short run (K145's fixed 0.75 lit a 1.2-world run to a tenth) glows in
  // full mid-run, and still nothing inside its end gaps.
  it("K111 stage 3: a short run glows in full mid-run (the end fade scales to the run)", () => {
    const r = rng(1111);
    const ch = randomChain(r, 90, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const G = 0.45;
    const PX = 0.02;
    const S = 0.4;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    const D0 = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], uniforms(k));
    const c0 = 30;
    const u0 = kArcOfCtrl(D0, kChain(D0, 0), c0);
    for (const L of [1.2, 1.8, 2.4, 3.2]) {
      const c1 = ctrlAt(D0, u0 + L, n - 1);
      const U = uniforms(k);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], U, [{ c0, c1, gap: G }]);
      const c = kChain(D, 0);
      // The run's far end as the mirror's own (f32) arc table puts it.
      const u1 = kArcOfCtrl(D, c, c1);
      const um = (u0 + u1) / 2;
      U.uKReach[0] = 15;
      U.uKReach[1] = 1;
      U.uKReach[2] = S;
      U.uKReach[3] = ctrlAt(D, um, n - 1);
      expect(kPaintAt(D, U, c, U.uKReach[3], um, PX, st).rim).toBeCloseTo(S, 5);
      let prev = 0;
      let maxStep = 0;
      let gapLit = 0;
      for (let a = u0 - 0.2; a <= u1 + 0.2; a += 0.002) {
        const g = kPaintAt(D, U, c, ctrlAt(D, a, n - 1), a, PX, st).rim;
        // (1e-6: the item holds the gap as f32, 0.44999999.)
        if (Math.min(a - u0, u1 - a) <= G - 1e-6 && g !== 0) gapLit++;
        maxStep = Math.max(maxStep, Math.abs(g - prev));
        prev = g;
      }
      expect(gapLit).toBe(0);
      expect(maxStep).toBeLessThan(0.02);
    }
  });
});

// The mirror's smoothstep on [0, 1] (3x^2 - 2x^3, clamped).
function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
