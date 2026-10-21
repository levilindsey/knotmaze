// G2.3 (gameplay paint per pixel): the CPU mirror (kPaintAt +
// kComposePaint - line-for-line twins of the shader's) against the frozen
// retired per-sample pass and its accent strip (fixtures/pre_g23.ts), at
// the ribbon's own sample arcs, on random declarations over random chains.
// K75: a pulse brightens the thread's OWN paint (the retired pass picked a
// band family per pulse arm, which drew gold crests over a fading trail).

import { describe, expect, it } from "vitest";
import { ITEM_FLAG, PAINT_CONST, PAINT_ITEM, PAINT_ITEM_TELE } from "../../src/render/paint_const";
import {
  MAX_KNOTS,
  kArcOfCtrl,
  kArcU,
  kChain,
  kComposePaint,
  kPaintAt,
  kPulseV,
  kReachWin,
  kRimAcross,
  kRimOver,
  kRimScale,
  kShadeAll,
  kTeleOver,
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

// K525: one telegraph piece as the renderer packs it: an unwrapped ctrl
// span, the piece's alpha, and each end's gap and fade.
type Tele = { c0: number; c1: number; alpha: number; g0: number; g1: number; f0: number; f1: number };

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
    // (blendDist, ease) 0; the hover glow's length and end fade (K298) as
    // they were before their sliders (pulseReach's whole arms, RIM_END_FADE
    // 0.75), unless a test sets them.
    uKSect: new Float32Array([0, 0, 1e6, 0.75]),
    uKPaint: new Float32Array([1, 0, 0, 0.5 + 0.3 * Math.sin(k.clock * 5.2)]),
    uKPulse: new Float32Array([mod(k.clock * 1.6), mod((k.clock + 0.3) * 1.6), s, fi * fi * (3 - 2 * fi)]),
    // Whole arms (the retired pass had no reach window), unless a test sets one.
    uKReach: new Float32Array([1e6, 1, 0, 0]),
    uKGold: new Float32Array([((GOLD >> 16) & 255) / 255, ((GOLD >> 8) & 255) / 255, (GOLD & 255) / 255, 1]),
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
  rims: { c0: number; c1: number; gap: number }[] = [],
  // K525: telegraph pieces (TELE items), written before the RIM items as
  // the renderer writes them.
  teles: Tele[] = []
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
  for (const t of teles) items.push(PAINT_ITEM_TELE, t.c0, t.c1, t.alpha, t.g0, t.g1, t.f0, t.f1);
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

  // K480 stage 2: a branched arm (past a short first run) is phased by
  // its GLOBAL distance from the head (dist0 + local), ends at the same
  // reach window, and carries through its far end when cont is set (no
  // end fade at a junction the light branches on from).
  it("K480: branched pulse arms read global distance and carry through continuing ends", () => {
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const U = uniforms(k);
    U.uKReach[0] = 3;
    U.uKReach[1] = Math.min(PAINT_CONST.PULSE_REACH_FADE, 0.5 * 3);
    // Phase continuity: a branched arm at local d reads as a head arm at
    // dist0 + d (both away from any end window or reach fade).
    const Ubig = uniforms(k);
    for (let d = 0; d <= 4; d += 0.25) {
      expect(kPulseV(Ubig, d, 100, false, false, 2.5, true)).toBeCloseTo(
        kPulseV(Ubig, 2.5 + d, 102.5, false, false),
        12
      );
    }
    // The reach window acts on the global distance, not the local one.
    expect(kPulseV(U, 0.4, 10, false, false, 2, true)).toBeGreaterThan(0);
    expect(kPulseV(U, 1.1, 10, false, false, 2, true)).toBe(0);
    expect(kPulseV(U, 0.4, 10, false, true, 2, true)).toBeGreaterThan(0);
    expect(kPulseV(U, 1.1, 10, false, true, 2, true)).toBe(0);
    // At a continuing far end there is no end fade; at a terminal one
    // the hover is gone exactly at the end, as before.
    const span = 2;
    expect(kPulseV(Ubig, span, span, false, true, 2, true)).toBeCloseTo(Ubig.uKPaint[3], 12);
    expect(kPulseV(Ubig, span, span, false, true, 2, false)).toBe(0);
    // Through kPaintAt: the item's dist0 (T0.w) and cont (T1.z) slots.
    const r = rng(480);
    const ch = randomChain(r, 60, false);
    const pulses: OldPulse[] = [
      { cJunction: 10, cFar: 30, inward: false, onPath: false, hovered: false },
    ];
    const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], pulses, U);
    const itemBase = Math.round(U.uKPaint[2]);
    D.paint[itemBase * 4 + 3] = 2; // dist0
    D.paint[itemBase * 4 + 6] = 1; // cont
    const c = kChain(D, 0);
    const aJ = kArcOfCtrl(D, c, 10);
    const aF = kArcOfCtrl(D, c, 30);
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    const mid = aJ + 0.4;
    const got = kPaintAt(D, U, c, 11, mid, 0.02, st);
    expect(got.band).toBe(true);
    expect(got.v).toBeCloseTo(kPulseV(U, mid - aJ, aF - aJ, false, false, 2, true), 12);
    // Past the reach (global) the same point would be dark: dist0 alone
    // already beyond it leaves nothing, however short the local arc is.
    D.paint[itemBase * 4 + 3] = 99;
    const dark = kPaintAt(D, U, c, 11, mid, 0.02, st);
    expect(dark.band).toBe(false);
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
  // K111 stage 4 (K264): the width is a viewer's slider (hoverGlowWidth,
  // [0.3, 1]); it reaches kRimAcross as a scale on RIM_EDGE (uKGold.w,
  // kRimScale), exactly 1 at the default. The scale goes through a
  // Float32Array as the uniform does.
  const rimScale = (w: number): number => new Float32Array([kRimScale(w)])[0];
  it("K111 stage 4: the hover glow's width scale is exactly 1 at the default", () => {
    expect(rimScale(PAINT_CONST.RIM_EDGE)).toBe(1);
    expect(kRimScale(0)).toBe(1); // garbage reads as the default
    expect(kRimScale(-1)).toBe(1);
    expect(kRimScale(2)).toBeCloseTo(PAINT_CONST.RIM_EDGE, 12); // clamped to 1
  });
  it("K111 stage 4: at any width the mirror is 1 - smoothstep((1 - e) / width)", () => {
    for (const W of [0.3, 0.5, 0.7, 0.85, 1]) {
      const k = rimScale(W);
      for (let i = 0; i <= 400; i++) {
        const s = i / 400;
        const e = Math.abs(2 * s - 1);
        const x = Math.min(1, Math.max(0, (1 - e) / W));
        expect(kRimAcross(s, k)).toBeCloseTo(1 - x * x * (3 - 2 * x), 6);
      }
      // Half strength halfway through the fade, at every width.
      expect(kRimAcross(0.5 + 0.5 * (1 - W / 2), k)).toBeCloseTo(0.5, 6);
    }
  });
  it("K145, K111 stage 3: the hover glow peaks at both edges and fades out toward the middle", () => {
   for (const W of [0.3, PAINT_CONST.RIM_EDGE, 1]) {
    const k = rimScale(W);
    const kRimAt = (s: number): number => kRimAcross(s, k);
    expect(kRimAt(0)).toBe(1);
    expect(kRimAt(1)).toBe(1);
    let prev = kRimAt(0.5);
    expect(prev).toBeLessThan(1e-6);
    for (let i = 0; i <= 2000; i++) {
      const s = 0.5 + (0.5 * i) / 2000; // From the center line to an edge.
      const v = kRimAt(s);
      expect(kRimAt(1 - s)).toBeCloseTo(v, 12);
      if (Math.abs(2 * s - 1) <= 1 - W - 1e-9) expect(v).toBe(0);
      else if (Math.abs(2 * s - 1) > 1 - W + 1e-6) expect(v).toBeGreaterThan(0);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v - prev).toBeLessThan(0.01 / Math.max(0.5, W));
      prev = v;
    }
   }
    const W = PAINT_CONST.RIM_EDGE;
    const kRimAt = (s: number): number => kRimAcross(s, rimScale(W));
    // Levi's look (K248): high at the edge, half strength halfway through the
    // fade, and wider than K145's square over the outer 0.6 (half strength
    // 0.18 of the half-width in from the edge). `inside` is the depth from
    // the edge, in half-widths.
    const at = (inside: number): number => kRimAt(0.5 + 0.5 * (1 - inside));
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

  // K298: the glow's length (R, uKSect.z) and end fade (EF, uKSect.w) are
  // its own sliders; the pulses' reach (uKReach.x, here 7) no longer
  // touches it. EF 0 reads as the 1e-4 floor: a hard edge at the end gap.
  it("K145, K298: the glow peaks at the hover point, ends at its length and fades toward the run's ends", () => {
    const r = rng(145);
    const ch = randomChain(r, 90, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const pulses: OldPulse[] = [{ cJunction: 10, cFar: 30, inward: false, onPath: false, hovered: false }];
    const spans: OldSpan[] = [{ c0: 40, c1: 70 }];
    const G = 0.45;
    const PX = 0.02;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    const st0: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    // The sample arcs and their ctrls, found once (the tables are shared).
    const samples: [number, number][] = [];
    {
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], uniforms(k));
      for (let a = 0; a <= ch.totalLength; a += 0.002) samples.push([a, ctrlAt(D, a, n - 1)]);
    }
    const cases: [number, number][] = [
      [0.5, 0.2],
      [3, 0.2],
      [15, 0.2],
      [3, 0.75],
      [3, 0.1],
      [15, 0],
    ];
    for (const [R, EF] of cases) {
      const EFf = Math.max(Math.fround(EF), 1e-4);
      for (const hoverAt of [50, 22, 12]) {
        const U = uniforms(k);
        const c0 = 10;
        const c1 = 80;
        const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, [], pulses, U, [{ c0, c1, gap: G }]);
        const U0 = uniforms(k);
        const D0 = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, [], pulses, U0);
        U.uKReach[0] = U0.uKReach[0] = 7;
        U.uKReach[1] = U0.uKReach[1] = PAINT_CONST.PULSE_REACH_FADE;
        U.uKSect[2] = R;
        U.uKSect[3] = EF;
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
          if (dEnd >= G + EFf && Math.abs(g - S * (1 - smoothstep(Math.abs(a - uh) / R))) > 1e-6) falloff++;
          if (g > 0.01) lit++;
          maxStep = Math.max(maxStep, Math.abs(g - prev));
          prev = g;
        }
        expect([otherPaint, range, darkLit, falloff]).toEqual([0, 0, 0, 0]);
        // Full strength at a hover point clear of the ends' fade.
        const dEndH = Math.min(uh - u0, u1 - uh);
        const atH = kPaintAt(D, U, c, hoverAt, uh, PX, st).rim;
        if (dEndH >= G + EFf) expect(atH).toBeCloseTo(S, 6);
        else expect(atH).toBeLessThan(S);
        // A smooth glow: no step between samples 0.002 apart beyond what the
        // two smoothsteps' steepest slopes (1.5 S / length, 1.5 S / fade)
        // allow; EF 0 is a hard edge by design.
        if (EF > 0) expect(maxStep).toBeLessThan(0.002 * 1.5 * S * (1 / R + 1 / EF) * 1.1);
        expect(lit).toBeGreaterThan(0);
        expect(lit * 0.002).toBeLessThan(2 * R);
      }
    }
  });

  it("K298: the end fade is the slider's, at most RIM_END_SHARE of the stretch to mid-run", () => {
    // Where the fade ends, measured on a long run: the glow first reaches
    // full strength EF past the end gap (EF 0: right at it).
    const r = rng(298);
    const ch = randomChain(r, 90, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const G = 0.45;
    const PX = 0.02;
    const S = 0.4;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    for (const EF of [0, 0.1, 0.2, 0.3, 0.75, 1.5]) {
      const U = uniforms(k);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], U, [{ c0: 10, c1: 80, gap: G }]);
      const c = kChain(D, 0);
      const u0 = kArcOfCtrl(D, c, 10);
      U.uKSect[2] = 1e6; // Whole run: only the end fade shapes it.
      U.uKSect[3] = EF;
      U.uKReach[2] = S;
      U.uKReach[3] = ctrlAt(D, u0 + 20, n - 1);
      const at = (dEnd: number): number => kPaintAt(D, U, c, ctrlAt(D, u0 + dEnd, n - 1), u0 + dEnd, PX, st).rim;
      expect(at(G - 0.01)).toBe(0);
      const EFf = Math.max(EF, 1e-4);
      expect(at(G + EFf + 0.01)).toBeCloseTo(S, 5);
      if (EF > 0) {
        // Half strength halfway through the fade (a smoothstep).
        expect(at(G + EF / 2)).toBeCloseTo(S / 2, 2);
        expect(at(G + EF * 0.9)).toBeLessThan(S);
      }
    }
  });

  it("K298: the glow reads its own length and fade, never the pulses' reach", () => {
    const r = rng(2981);
    const ch = randomChain(r, 60, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const G = 0.45;
    const PX = 0.02;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    const U = uniforms(k);
    const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], U, [{ c0: 5, c1: 50, gap: G }]);
    const c = kChain(D, 0);
    const uh = kArcOfCtrl(D, c, 25);
    U.uKReach[2] = 0.4;
    U.uKReach[3] = 25;
    U.uKSect[2] = 3;
    U.uKSect[3] = 0.2;
    const probe = (): number[] => {
      const out: number[] = [];
      for (let d = -4; d <= 4; d += 0.05) out.push(kPaintAt(D, U, c, ctrlAt(D, uh + d, n - 1), uh + d, PX, st).rim);
      return out;
    };
    U.uKReach[0] = 0.5;
    U.uKReach[1] = 0.25;
    const a = probe();
    U.uKReach[0] = 15;
    U.uKReach[1] = 1;
    expect(probe()).toEqual(a);
    U.uKSect[2] = 1.5;
    const b = probe();
    expect(b).not.toEqual(a);
    // Gone at the length, lit inside it.
    expect(kPaintAt(D, U, c, ctrlAt(D, uh + 1.6, n - 1), uh + 1.6, PX, st).rim).toBe(0);
    expect(kPaintAt(D, U, c, ctrlAt(D, uh + 1.0, n - 1), uh + 1.0, PX, st).rim).toBeGreaterThan(0);
  });

  // K298 (Levi: "render it in-addition to the adjacent-to-current-juction
  // highlight for those segments"; then "Keep both."): a hovered choice
  // shows its breath band (0.2-0.8) and the glow over it. kRimOver whitens
  // the COMPOSED paint by the glow, so the glow lifts the band at every
  // breath phase without reaching white; where no band is drawn it is
  // exactly the old composition (the glow joined the reveal glow's max).
  it("K298: a hovered choice's band and the glow both show, at every breath phase", () => {
    const r = rng(2982);
    const ch = randomChain(r, 60, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const G = 0.45;
    const PX = 0.02;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
    const pulses: OldPulse[] = [{ cJunction: 5, cFar: 50, inward: false, onPath: false, hovered: true }];
    const sideEdge = 0.04; // Near a ribbon edge, where the glow is strong.
    let checked = 0;
    for (const breath of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      for (const strength of [0.4, 1]) {
        const U = uniforms(k);
        const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], pulses, U, [{ c0: 5, c1: 50, gap: G }]);
        const c = kChain(D, 0);
        U.uKPaint[3] = breath;
        U.uKReach[2] = strength;
        U.uKReach[3] = 20;
        U.uKSect[2] = 3;
        U.uKSect[3] = 0.2;
        const uh = kArcOfCtrl(D, c, 20);
        const across = kRimAcross(sideEdge, 1);
        for (let d = -2.5; d <= 2.5; d += 0.1) {
          const a = uh + d;
          const ctrl = ctrlAt(D, a, n - 1);
          kPaintAt(D, U, c, ctrl, a, PX, st);
          expect(st.band).toBe(true);
          expect(st.v).toBeCloseTo(breath, 5);
          const rim = st.rim * across;
          for (const S0 of [[0.2, 0.45, 0.7], [0.9, 0.3, 0.1], [0.05, 0.05, 0.05]]) {
            const band = Float32Array.from(S0);
            kComposePaint(U, band, st, 0);
            const both = Float32Array.from(band);
            kRimOver(both, rim);
            // The old composition: the glow in the band's max.
            const old = Float32Array.from(S0);
            kComposePaint(U, old, st, rim);
            for (let i = 0; i < 3; i++) {
              expect(both[i]).toBeLessThan(1);
              if (rim > 0.01) {
                expect(both[i]).toBeGreaterThan(band[i]);
                // Brighter than the max kept, which hid a glow under the band.
                expect(both[i]).toBeGreaterThanOrEqual(old[i] - 1e-6);
              } else {
                expect(both[i]).toBeCloseTo(band[i], 6);
              }
            }
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("K298: with no band the glow over the paint is exactly the old composition", () => {
    const r = rng(2983);
    const U = uniforms({ clock: 20, pulseBorn: 0, spacing: 2.5 });
    for (let i = 0; i < 2000; i++) {
      const S0 = [r(), r(), r()];
      const st: KPaintState = { p: r() < 0.3 ? 0 : r(), band: false, v: r(), rim: 0 };
      const rim = r() < 0.1 ? 0 : r() * 0.6;
      // Plain arrays: the shader keeps the intermediate color at its own
      // precision too (a Float32Array would round it between the steps).
      const old = [...S0];
      kComposePaint(U, old, st, rim);
      const now = [...S0];
      kComposePaint(U, now, st, 0);
      kRimOver(now, rim);
      expect(now).toEqual(old);
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
      U.uKSect[2] = 3; // The glow's length (K298).
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
    for (const [L, EF] of [
      [1.2, 0.75],
      [1.8, 0.75],
      [2.4, 0.75],
      [3.2, 0.75],
      [1.2, 0.2],
      [2.4, 0.2],
    ]) {
      const c1 = ctrlAt(D0, u0 + L, n - 1);
      const U = uniforms(k);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], U, [{ c0, c1, gap: G }]);
      const c = kChain(D, 0);
      // The run's far end as the mirror's own (f32) arc table puts it.
      const u1 = kArcOfCtrl(D, c, c1);
      const um = (u0 + u1) / 2;
      U.uKSect[2] = 15; // The glow's length and end fade (K298).
      U.uKSect[3] = EF;
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

  // K525: the minotaur's telegraph route as TELE items. A piece lights its
  // whole span (no hover-point falloff) at its alpha, between its end gaps
  // (a junction end skips the web's reach, rimGap 0.975 at the defaults; a
  // mid-run end, the minotaur's spot or a by-length stop, none) and fades
  // (each clamped to RIM_END_SHARE of half the piece less its gap, as the
  // hover glow's is). kTele is the max over the pieces, and no other paint
  // moves.
  const TJ = { g: 0.975, f: 0.2 }; // A junction end (TELE_JUNCTION_FADE).
  const TM = { g: 0, f: 0.3 }; // A mid-run end (TELE_MID_FADE).
  const tele = (c0: number, c1: number, alpha: number, e0: typeof TJ, e1: typeof TJ): Tele => ({
    c0,
    c1,
    alpha,
    g0: e0.g,
    g1: e1.g,
    f0: e0.f,
    f1: e1.f,
  });
  // A piece's expected strength at an unwrapped arc, from the f32 values
  // the item holds.
  const teleWant = (u: number, u0: number, u1: number, t: Tele): number => {
    if (u < u0 || u > u1) return 0;
    const hl = 0.5 * (u1 - u0);
    const g0 = Math.fround(t.g0);
    const g1 = Math.fround(t.g1);
    const f0 = Math.min(Math.max(PAINT_CONST.RIM_END_SHARE * (hl - g0), 1e-4), Math.max(Math.fround(t.f0), 1e-4));
    const f1 = Math.min(Math.max(PAINT_CONST.RIM_END_SHARE * (hl - g1), 1e-4), Math.max(Math.fround(t.f1), 1e-4));
    return Math.fround(t.alpha) * Math.min(smoothstep((u - u0 - g0) / f0), smoothstep((u1 - u - g1) / f1));
  };

  it("K525: a telegraph piece lights its span between its end gaps and fades, at its alpha", () => {
    const r = rng(525);
    const ch = randomChain(r, 90, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const PX = 0.02;
    const pulses: OldPulse[] = [{ cJunction: 10, cFar: 30, inward: false, onPath: false, hovered: false }];
    const spans: OldSpan[] = [{ c0: 40, c1: 70 }];
    const rims = [{ c0: 10, c1: 80, gap: 0.45 }];
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    const st0: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    const U0 = uniforms(k);
    const D0 = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, [], pulses, U0, rims);
    U0.uKReach[2] = 0.4;
    U0.uKReach[3] = 45;
    const c00 = kChain(D0, 0);
    const samples: [number, number][] = [];
    for (let a = 0; a <= ch.totalLength; a += 0.002) samples.push([a, ctrlAt(D0, a, n - 1)]);
    // A piece 1.5 world long from ctrl 40: under two junction gaps (1.95).
    const cShort = ctrlAt(D0, kArcOfCtrl(D0, c00, 40) + 1.5, n - 1);
    const cases: [string, Tele[]][] = [
      ["a whole run", [tele(10, 80, 1, TJ, TJ)]],
      ["a lead partial (from the minotaur's spot)", [tele(33.5, 80, 1, TM, TJ)]],
      ["a tail partial (to a by-length stop)", [tele(10, 51.25, 0.5, TJ, TM)]],
      ["both ends mid-run", [tele(22.5, 61.75, 1, TM, TM)]],
      ["two pieces on one run", [tele(10, 30, 1, TJ, TM), tele(25, 80, 0.5, TM, TJ)]],
      ["a run under two gaps", [tele(40, cShort, 1, TJ, TJ)]],
      ["a short mid-run piece", [tele(40, cShort, 0.95, TM, TM)]],
    ];
    for (const [name, pieces] of cases) {
      const U = uniforms(k);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, [], pulses, U, rims, pieces);
      U.uKReach[2] = 0.4;
      U.uKReach[3] = 45;
      const c = kChain(D, 0);
      const ends = pieces.map((t) => [kArcU(D, c, Math.fround(t.c0)), kArcU(D, c, Math.fround(t.c1))]);
      const amax = Math.max(...pieces.map((t) => Math.fround(t.alpha)));
      // Violations, counted: the rest of the paint moved, the strength left
      // [0, max alpha], is lit off every piece or inside an end gap, or is
      // not the max of the pieces' shapes.
      let otherPaint = 0;
      let range = 0;
      let darkLit = 0;
      let shape = 0;
      let lit = 0;
      let prev = 0;
      let maxStep = 0;
      for (const [a, ctrl] of samples) {
        const g = kPaintAt(D, U, c, ctrl, a, PX, st).tele;
        const s0 = kPaintAt(D0, U0, c00, ctrl, a, PX, st0);
        if (st.p !== s0.p || st.band !== s0.band || st.v !== s0.v || st.rim !== s0.rim || s0.tele !== 0) otherPaint++;
        if (!(g >= 0 && g <= amax)) range++;
        let inside = false;
        let want = 0;
        pieces.forEach((t, i) => {
          const [u0, u1] = ends[i];
          if (a - u0 > Math.fround(t.g0) && u1 - a > Math.fround(t.g1)) inside = true;
          want = Math.max(want, teleWant(a, u0, u1, t));
        });
        if (!inside && g !== 0) darkLit++;
        if (Math.abs(g - want) > 1e-9) shape++;
        if (g > 0.01) lit++;
        maxStep = Math.max(maxStep, Math.abs(g - prev));
        prev = g;
      }
      expect([name, otherPaint, range, darkLit, shape]).toEqual([name, 0, 0, 0, 0]);
      // Full alpha mid-piece once the piece clears both gaps; half alpha
      // halfway through a full-length fade (a smoothstep).
      pieces.forEach((t, i) => {
        const [u0, u1] = ends[i];
        const len = u1 - u0;
        const um = (u0 + u1) / 2;
        const gm = kPaintAt(D, U, c, ctrlAt(D, um, n - 1), um, PX, st).tele;
        if (len > Math.fround(t.g0) + Math.fround(t.g1) + 1e-3) expect(gm).toBeGreaterThanOrEqual(Math.fround(t.alpha) - 1e-6);
        else if (pieces.length === 1) expect(gm).toBe(0); // The webs cover a run under two gaps.
        if (pieces.length === 1 && len > 2 * (Math.fround(t.g0) + Math.fround(t.f0) + 0.5)) {
          const uh = u0 + Math.fround(t.g0) + Math.fround(t.f0) / 2;
          const gh = kPaintAt(D, U, c, ctrlAt(D, uh, n - 1), uh, PX, st).tele;
          expect(gh).toBeCloseTo(Math.fround(t.alpha) / 2, 3);
        }
      });
      if (name !== "a run under two gaps") expect(lit).toBeGreaterThan(0);
      // Smooth: no step between samples 0.002 apart beyond the steepest fade
      // (a smoothstep's 1.5 alpha / fade; the shortest clamped fade is about
      // 0.45 on the short mid-run piece).
      expect(maxStep).toBeLessThan(0.002 * 1.5 * (1 / 0.2) * 1.1);
    }
  });

  it("K525: the telegraph mixes toward its colour across both rims, under the hover glow's whitening", () => {
    const r = rng(5252);
    const ch = randomChain(r, 90, false);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const PX = 0.02;
    const RED = [1, 0x24 / 255, 0x18 / 255];
    const pulses: OldPulse[] = [{ cJunction: 10, cFar: 30, inward: false, onPath: false, hovered: false }];
    const spans: OldSpan[] = [{ c0: 40, c1: 70 }];
    const rims = [{ c0: 10, c1: 80, gap: 0.45 }];
    const pieces = [tele(10, 80, 1, TJ, TJ), tele(80, 88, 0.5, TJ, TM)];
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    const sides = [0, 0.04, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.96, 1];
    const mk = (withTele: boolean, withRim: boolean, width: number, strength: number) => {
      const U = uniforms(k);
      const D = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, spans, [], pulses, U, withRim ? rims : [], withTele ? pieces : []);
      U.uKGold[3] = kRimScale(width);
      U.uKReach[2] = 0.4;
      U.uKReach[3] = 45;
      U.uKSect[2] = 3;
      U.uKSect[3] = 0.2;
      U.uKTele = new Float32Array([RED[0], RED[1], RED[2], strength]);
      return { U, D, c: kChain(D, 0) };
    };
    const base = (a: number): number[] => [0.2 + 0.5 * Math.sin(a) ** 2, 0.35, 0.6 - 0.3 * Math.cos(a) ** 2];
    for (const width of [0.3, 0.85, 1]) {
      for (const strength of [0.45, 0.95]) {
        const T = mk(true, false, width, strength);
        const N = mk(false, false, width, strength);
        const B = mk(true, true, width, strength);
        const H = mk(false, true, width, strength);
        let mixBad = 0;
        let orderBad = 0;
        let edgeMax = 0;
        let centerMax = 0;
        for (let a = 0; a <= ch.totalLength; a += 0.05) {
          const ctrl = ctrlAt(T.D, a, n - 1);
          const t = kPaintAt(T.D, T.U, T.c, ctrl, a, PX, st).tele;
          for (const side of sides) {
            // Telegraph only: the tele-less color mixed toward the red by
            // t x across x strength.
            const S = base(a);
            kShadeAll(T.D, T.U, T.c, ctrl, a, side, PX, S);
            const S0 = base(a);
            kShadeAll(N.D, N.U, N.c, ctrl, a, side, PX, S0);
            const w = Math.min(1, t * kRimAcross(side, T.U.uKGold[3]) * Math.fround(strength));
            for (let i = 0; i < 3; i++) if (Math.abs(S[i] - (S0[i] + (RED[i] - S0[i]) * w)) > 1e-6) mixBad++;
            const lift = Math.hypot(S[0] - S0[0], S[1] - S0[1], S[2] - S0[2]);
            if (side === 0 || side === 1) edgeMax = Math.max(edgeMax, w);
            if (side === 0.5) centerMax = Math.max(centerMax, lift);
            // A hovered run on the route: the red first, then the glow's
            // whitening over it.
            const SB = base(a);
            kShadeAll(B.D, B.U, B.c, ctrl, a, side, PX, SB);
            const rim = kPaintAt(B.D, B.U, B.c, ctrl, a, PX, st).rim;
            const SR = base(a);
            kShadeAll(T.D, T.U, T.c, ctrl, a, side, PX, SR);
            if (rim > 0) kRimOver(SR, rim * kRimAcross(side, B.U.uKGold[3]));
            for (let i = 0; i < 3; i++) if (Math.abs(SB[i] - SR[i]) > 1e-6) orderBad++;
          }
        }
        expect([width, strength, mixBad, orderBad]).toEqual([width, strength, 0, 0]);
        // Full strength on both edges mid-run, nothing at the center line.
        expect(edgeMax).toBeCloseTo(Math.fround(strength), 5);
        expect(centerMax).toBe(0);
        // No telegraph colour, or strength 0: exactly the tele-less paint.
        for (const strip of [0, -1]) {
          const Z = mk(true, true, width, strip === 0 ? 0 : strength);
          if (strip === -1) delete Z.U.uKTele;
          for (let a = 0; a <= ch.totalLength; a += 0.25) {
            const ctrl = ctrlAt(Z.D, a, n - 1);
            for (const side of [0, 0.2, 0.5, 1]) {
              const S = base(a);
              kShadeAll(Z.D, Z.U, Z.c, ctrl, a, side, PX, S);
              const S0 = base(a);
              kShadeAll(H.D, H.U, H.c, ctrl, a, side, PX, S0);
              expect(S).toEqual(S0);
            }
          }
        }
      }
    }
    // kTeleOver clamps its weight to [0, 1] and reads no colour it lacks.
    const U = uniforms(k);
    const S = [0.2, 0.4, 0.6];
    kTeleOver(U, S, 0.7);
    expect(S).toEqual([0.2, 0.4, 0.6]);
    U.uKTele = new Float32Array([1, 0, 0, 1]);
    kTeleOver(U, S, 3);
    expect(S[0]).toBeCloseTo(1, 12);
    expect(S[1]).toBeCloseTo(0, 12);
    expect(S[2]).toBeCloseTo(0, 12);
  });

  it("K525: a telegraph piece wraps across a closed chain's seam, and a seam run (ctrlB = n) ends at it", () => {
    const r = rng(5253);
    const ch = randomChain(r, 70, true);
    const n = ch.controlArcLengths.length;
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const PX = 0.02;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    const total = ch.totalLength;
    for (const [name, t] of [
      ["across the seam", tele(n - 12, n + 12, 0.95, TJ, TJ)],
      ["a seam run, ctrlB = n", tele(n - 20, n, 1, TJ, TJ)],
      ["the next run, from the seam", tele(n, n + 15, 0.45, TJ, TM)],
    ] as [string, Tele][]) {
      const U = uniforms(k);
      const D = scene(ch.controlArcLengths, total, ch.count, true, [], [], [], U, [], [t]);
      const c = kChain(D, 0);
      const u0 = kArcU(D, c, Math.fround(t.c0));
      const u1 = kArcU(D, c, Math.fround(t.c1));
      let shape = 0;
      let prev = -1;
      let maxStep = 0;
      let peak = 0;
      // Walk the ring once from the middle of the far side, across the seam;
      // each arc is the piece's unwrapped arc in [u0, u0 + total).
      for (let i = 0; i <= 20000; i++) {
        const a = (total / 2 + (total * i) / 20000) % total;
        const ctrl = ctrlAt(D, a, n - 1e-9);
        const g = kPaintAt(D, U, c, ctrl, a, PX, st).tele;
        let u = a;
        while (u < u0) u += total;
        while (u >= u0 + total) u -= total;
        if (Math.abs(g - teleWant(u, u0, u1, t)) > 1e-9) shape++;
        peak = Math.max(peak, g);
        if (prev >= 0) maxStep = Math.max(maxStep, Math.abs(g - prev));
        prev = g;
      }
      expect([name, shape]).toEqual([name, 0]);
      expect(peak).toBeCloseTo(Math.fround(t.alpha), 5);
      // No step beyond the junction fade's steepest slope over one sample.
      expect(maxStep).toBeLessThan((total / 20000) * 1.5 * (1 / 0.2) * 1.1);
      const before = kPaintAt(D, U, c, ctrlAt(D, total - 0.05, n - 1e-9), total - 0.05, PX, st).tele;
      const after = kPaintAt(D, U, c, ctrlAt(D, 0.05, n - 1e-9), 0.05, PX, st).tele;
      if (name === "across the seam") {
        // Lit on both sides of the seam.
        expect(before).toBeCloseTo(Math.fround(t.alpha), 5);
        expect(after).toBeCloseTo(Math.fround(t.alpha), 5);
      } else {
        // The seam is the junction end: its gap leaves both sides dark.
        expect(before).toBe(0);
        expect(after).toBe(0);
      }
    }
  });

  // K324 stage 2 (K654): the lead piece RIDES. Its item holds the whole run
  // [ctrlA, ctrlB] and marks the end at the minotaur's spot with a negative
  // fade (gap 0); kPaintAt reads that end's ctrl from uKTeleAt.x, so the
  // spot moves every frame with no texel written. A riding piece must paint
  // exactly what the fixed piece [at, ctrlB] (or [ctrlA, at]) with a mid-run
  // end paints, and uKTeleAt must move no piece that does not ride.
  it("K324 s2: a riding lead piece paints the fixed piece from uKTeleAt, on open and closed chains", () => {
    const k: OldClock = { clock: 20, pulseBorn: 0, spacing: 2.5 };
    const PX = 0.02;
    const st: KPaintState = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    const RIDE = { g: 0, f: -0.3 }; // The riding end (-TELE_MID_FADE).
    for (const closed of [false, true]) {
      const r = rng(closed ? 6542 : 6541);
      const ch = randomChain(r, closed ? 70 : 90, closed);
      const n = ch.controlArcLengths.length;
      const total = ch.totalLength;
      const cMax = closed ? n - 1e-9 : n - 1;
      const N = 4000;
      const arcs: number[] = [];
      for (let i = 0; i < N || (!closed && i === N); i++) arcs.push((total * i) / N);
      const runs: [string, number, number, typeof TJ][] = closed
        ? [
            ["a run across the seam", n - 12, n + 12, TJ],
            ["a seam run, ctrlB = n", n - 20, n, TJ],
          ]
        : [
            ["a whole run", 10, 80, TJ],
            ["a run to a by-length stop", 10, 51.25, TM],
          ];
      for (const [name, cA, cB, far] of runs) {
        for (const ride of [0, 1] as const) {
          for (const frac of [0, 0.004, 0.37, 0.5, 0.93, 0.999]) {
            const at = Math.fround(cA + (cB - cA) * frac);
            const riding = ride === 0 ? tele(cA, cB, 1, RIDE, far) : tele(cA, cB, 1, far, RIDE);
            const fixed = ride === 0 ? tele(at, cB, 1, TM, far) : tele(cA, at, 1, far, TM);
            const UR = uniforms(k);
            UR.uKTeleAt = new Float32Array([at, 0, 0, 0]);
            const DR = scene(ch.controlArcLengths, total, ch.count, closed, [], [], [], UR, [], [riding]);
            const UF = uniforms(k);
            const DF = scene(ch.controlArcLengths, total, ch.count, closed, [], [], [], UF, [], [fixed]);
            const cR = kChain(DR, 0);
            const cF = kChain(DF, 0);
            let diff = 0;
            let lit = 0;
            for (const a of arcs) {
              const ctrl = ctrlAt(DF, a, cMax);
              const g = kPaintAt(DR, UR, cR, ctrl, a, PX, st).tele;
              const want = kPaintAt(DF, UF, cF, ctrl, a, PX, st).tele;
              if (g !== want) diff++;
              if (g > 0.01) lit++;
            }
            expect([name, ride, frac, diff]).toEqual([name, ride, frac, 0]);
            // Not vacuous: a piece well clear of its gaps lights.
            if (frac > 0.3 && frac < 0.6) expect(lit).toBeGreaterThan(0);
          }
        }
      }
    }
    // uKTeleAt moves no piece that does not ride, and an absent uniform
    // (the mirror's default) reads as the shader's zero vector.
    const r = rng(6543);
    const ch = randomChain(r, 90, false);
    const n = ch.controlArcLengths.length;
    const still = [tele(10, 30, 1, TJ, TM), tele(25, 80, 0.5, TM, TJ)];
    const U0 = uniforms(k);
    const D0 = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], U0, [], still);
    const U1 = uniforms(k);
    U1.uKTeleAt = new Float32Array([47.5, 3, 2, 1]);
    const D1 = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], U1, [], still);
    const riding = [tele(10, 80, 1, RIDE, TJ)];
    const UA = uniforms(k);
    const DA = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], UA, [], riding);
    const UZ = uniforms(k);
    UZ.uKTeleAt = new Float32Array(4);
    const DZ = scene(ch.controlArcLengths, ch.totalLength, ch.count, false, [], [], [], UZ, [], riding);
    let moved = 0;
    let absentBad = 0;
    for (let a = 0; a <= ch.totalLength; a += 0.01) {
      const ctrl = ctrlAt(D0, a, n - 1);
      if (kPaintAt(D0, U0, kChain(D0, 0), ctrl, a, PX, st).tele !== kPaintAt(D1, U1, kChain(D1, 0), ctrl, a, PX, st).tele) moved++;
      if (kPaintAt(DA, UA, kChain(DA, 0), ctrl, a, PX, st).tele !== kPaintAt(DZ, UZ, kChain(DZ, 0), ctrl, a, PX, st).tele) absentBad++;
    }
    expect([moved, absentBad]).toEqual([0, 0]);
  });
});

// The mirror's smoothstep on [0, 1] (3x^2 - 2x^3, clamped).
function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
