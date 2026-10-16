// K76 THREAD REVEAL (stage 2a): the CPU mirror of the explore shader's
// kExploreAt (paint_math.ts, line-for-line twin of explore_glsl.ts) against
// the model's own visibility (explore_view.ts chainVis), through the KPAINT
// layout the renderer writes: VIS items referenced from every control slot
// their range touches (the renderer's touch rule: +-1 slot, rings wrap),
// the whole-chain flag at KPAINT texel `chain` .x. Piece values are dyadic,
// so the f32 texture holds them exactly and the two must agree EXACTLY.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAINT_ITEM } from "../../src/render/paint_const";
import {
  kChain,
  kExploreAt,
  kPaintAt,
  writeChainHeader,
  type KData,
  type KExploreState,
  type KPaintState,
  type KUniforms,
} from "../../src/render/paint_math";
import { GAP_FRAG, GAP_FRAG_LIB } from "../../src/render/gap_mask";
import {
  EXPLORE_DECL_GLSL,
  EXPLORE_GAP_CUT_GLSL,
  EXPLORE_GAP_SHAPE_GLSL,
  EXPLORE_GAP_SURE_GLSL,
  EXPLORE_ITEM_VIS,
  EXPLORE_MAIN_GLSL,
  chainWhole,
  visItem,
  visRange,
  withExplore,
} from "../../src/render/explore_glsl";
import { chainVis, type ExplorePiece } from "../../src/game/explore_view";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

// A dyadic value in [0, m) (1/64 steps: exact in f32).
function dy(r: () => number, m: number): number {
  return Math.floor(r() * m * 64) / 64;
}

function uniforms(): KUniforms {
  return {
    uKBase: new Float32Array([0, 0, 0, 1]),
    uKFx: new Float32Array(4),
    uKFx2: new Float32Array(4),
    uKShape: new Float32Array([1, 0, 1, 0]),
    uKInk: new Float32Array([1, 0, 0, 0]),
    uKKnots: new Float32Array(16),
    uKGamut: new Float32Array([0, 280, 0.45, 0.64]),
    uKSect: new Float32Array(4),
    uKPaint: new Float32Array([1, 0, 0, 0.5]),
    uKPulse: new Float32Array([0, 0.3, 1.5, 1]),
    uKReach: new Float32Array([1e6, 1, 0, 0]),
    uKGold: new Float32Array([1, 0.8235, 0.2902, 1]),
  };
}

interface TestChain {
  n: number;
  closed: boolean;
  pieces: ExplorePiece[];
  // Extra (non-VIS) items on this chain: 8 floats each.
  extra?: number[][];
}

// The renderer's slot rule for a VIS item: every slot from floor(lo) - 1 to
// floor(hi) + 1, wrapped on a ring, clamped away on an open chain.
function touchSlots(lo: number, hi: number, n: number, closed: boolean): number[] {
  const out: number[] = [];
  for (let s = Math.floor(lo) - 1; s <= Math.floor(hi) + 1; s++) {
    let t = s;
    if (closed) t = ((s % n) + n) % n;
    else if (t < 0 || t > n - 1) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

// KSTATIC chain headers + KPAINT (flags at texel `chain`, slot tables, refs
// and items), the layout PaintScene writes.
function scene(chains: TestChain[], U: KUniforms, flags: boolean): KData {
  const nch = chains.length;
  const idxBase: number[] = [];
  let t = 2 * nch;
  for (const c of chains) {
    idxBase.push(t);
    t += c.n;
  }
  const idxEnd = t;
  const stat = new Float32Array(idxEnd * 4);
  chains.forEach((c, ch) =>
    writeChainHeader(stat, ch, {
      nCtrl: c.n,
      closed: c.closed,
      count: 64,
      idxBase: idxBase[ch],
      geomBase: 0,
      srcFirst: 0,
      srcCount: 0,
      paintBase: 0,
    })
  );
  const items: number[] = [];
  const slots: number[][][] = chains.map((c) => Array.from({ length: c.n }, () => []));
  chains.forEach((c, ch) => {
    for (const e of c.extra ?? []) {
      const id = items.length / 8;
      items.push(...e);
      for (let s = 0; s < c.n; s++) slots[ch][s].push(id);
    }
    for (const p of c.pieces) {
      const id = items.length / 8;
      items.push(...visItem(p));
      const [lo, hi] = visRange(p);
      for (const s of touchSlots(lo, hi, c.n, c.closed)) slots[ch][s].push(id);
    }
  });
  let nRefs = 0;
  for (const sc of slots) for (const l of sc) nRefs += l.length;
  const refBase = idxEnd;
  const itemBase = refBase + Math.ceil(nRefs / 4);
  const paint = new Float32Array((itemBase + items.length / 4 + 1) * 4);
  let r = 0;
  chains.forEach((c, ch) => {
    if (flags) paint[ch * 4] = chainWhole(c.pieces, c.n, c.closed) ? 1 : 0;
    for (let s = 0; s < c.n; s++) {
      const l = slots[ch][s];
      expect(l.length).toBeLessThanOrEqual(32);
      paint[(idxBase[ch] + s) * 4] = r;
      paint[(idxBase[ch] + s) * 4 + 1] = l.length;
      for (const it of l) {
        paint[(refBase + (r >> 2)) * 4 + (r & 3)] = it;
        r++;
      }
    }
  });
  for (let i = 0; i < items.length; i++) paint[itemBase * 4 + i] = Math.fround(items[i]);
  U.uKPaint[1] = refBase;
  U.uKPaint[2] = itemBase;
  return { stat, geom: new Float32Array(16), reveal: new Float32Array(8), paint };
}

// Random pieces the model can produce: solid spans with fades on either
// end (frontier or not), wrapping past the ring's end, empty spans, hard
// ends.
function randomPieces(r: () => number, ch: number, n: number, closed: boolean, k: number): ExplorePiece[] {
  const out: ExplorePiece[] = [];
  const top = closed ? n : n - 1;
  for (let i = 0; i < k; i++) {
    const c0 = dy(r, top);
    const span = r() < 0.15 ? 0 : dy(r, Math.min(top, closed ? n : top - c0));
    const f0 = r() < 0.3 ? 0 : dy(r, 3);
    const f1 = r() < 0.3 ? 0 : dy(r, 3);
    out.push({ chain: ch, c0, c1: c0 + span, f0, f1, tip0: r() < 0.5, tip1: r() < 0.5 });
  }
  return out;
}

const fresh = (): KExploreState => ({ v: 0, tip: 0, solid: 0, end: 0, x: 0 });

describe("K76 kExploreAt mirror vs the model's chainVis", () => {
  it("VIS is not a paint item type (the shared program's PI_ constants stay master's)", () => {
    expect(Object.values(PAINT_ITEM)).not.toContain(EXPLORE_ITEM_VIS);
  });

  it("agrees exactly on random pieces (rings, wraps, open chains), flags off", () => {
    const r = rng(7676);
    let checked = 0;
    let partial = 0;
    for (let trial = 0; trial < 40; trial++) {
      const chains: TestChain[] = [];
      for (let ch = 0; ch < 3; ch++) {
        const closed = (trial + ch) % 2 === 0;
        const n = 12 + Math.floor(r() * 40);
        chains.push({ n, closed, pieces: randomPieces(r, ch, n, closed, 1 + Math.floor(r() * 4)) });
      }
      const U = uniforms();
      const D = scene(chains, U, false);
      chains.forEach((tc, ch) => {
        const c = kChain(D, ch);
        const top = tc.closed ? tc.n : tc.n - 1;
        for (let q = 0; q <= top * 16; q++) {
          const ctrl = Math.min(top - 1 / 1024, q / 16);
          const want = chainVis(tc.pieces, ch, ctrl, tc.n, tc.closed);
          const got = kExploreAt(D, U, c, ctrl, fresh()).v;
          expect(got).toBe(want);
          checked++;
          if (want > 0 && want < 1) partial++;
        }
      });
    }
    expect(checked).toBeGreaterThan(4000);
    expect(partial).toBeGreaterThan(300);
  });

  it("reports the frontier fade a point lies in (tip progress, solid end, unwrapped x)", () => {
    // A ring of 20 ctrls: a stub from 18 to 21 (wrapping) fading out 2 ctrls
    // past 21 as a frontier, and a non-frontier fade below 18.
    const p: ExplorePiece = { chain: 0, c0: 18, c1: 21, f0: 1, f1: 2, tip0: false, tip1: true };
    const U = uniforms();
    const D = scene([{ n: 20, closed: true, pieces: [p] }], U, false);
    const c = kChain(D, 0);
    const a = kExploreAt(D, U, c, 2, fresh()); // Unwrapped 22: halfway through the frontier fade.
    expect(a.v).toBe(0.5);
    expect(a.tip).toBe(0.5);
    expect(a.solid).toBe(21);
    expect(a.x).toBe(22);
    const b = kExploreAt(D, U, c, 17.5, fresh()); // Inside the plain low fade: no frontier.
    expect(b.v).toBe(0.5);
    expect(b.tip).toBe(-1);
    const s = kExploreAt(D, U, c, 0.5, fresh()); // Solid (unwrapped 20.5).
    expect(s.v).toBe(1);
    expect(s.tip).toBe(-1);
    // A solid point of another piece outranks a frontier fade (equal-best
    // ties prefer the non-frontier piece).
    const q: ExplorePiece = { chain: 0, c0: 21.5, c1: 23, f0: 0, f1: 0, tip0: false, tip1: false };
    const D2 = scene([{ n: 20, closed: true, pieces: [p, q] }], U, false);
    const t = kExploreAt(D2, U, kChain(D2, 0), 2, fresh());
    expect(t.v).toBe(1);
    expect(t.tip).toBe(-1);
  });

  it("the whole-chain flag is sound: chainWhole => visibility 1 everywhere", () => {
    const r = rng(1212);
    let whole = 0;
    for (let trial = 0; trial < 300; trial++) {
      const closed = trial % 2 === 0;
      const n = 8 + Math.floor(r() * 30);
      const pieces = randomPieces(r, 0, n, closed, 2 + Math.floor(r() * 6));
      // Every third trial: tile the chain with abutting solid spans.
      if (trial % 3 === 0) {
        const top = closed ? n : n - 1;
        let a = closed ? dy(r, n) : 0;
        const end = closed ? a + n : top;
        while (a < end) {
          const b = Math.min(end, a + 1 + dy(r, 6));
          pieces.push({ chain: 0, c0: a, c1: b, f0: 0, f1: 0, tip0: false, tip1: false });
          a = b;
        }
      }
      if (!chainWhole(pieces, n, closed)) continue;
      whole++;
      const top = closed ? n : n - 1;
      for (let q = 0; q <= top * 16; q++) {
        const ctrl = Math.min(top - 1 / 1024, q / 16);
        expect(chainVis(pieces, 0, ctrl, n, closed)).toBe(1);
      }
      // And the flagged mirror returns 1 without scanning.
      const U = uniforms();
      const D = scene([{ n, closed, pieces }], U, true);
      expect(D.paint[0]).toBe(1);
      expect(kExploreAt(D, U, kChain(D, 0), top / 2, fresh()).v).toBe(1);
    }
    expect(whole).toBeGreaterThan(90);
  });

  it("chainWhole rejects gaps and partial coverage", () => {
    const P = (c0: number, c1: number): ExplorePiece => ({ chain: 0, c0, c1, f0: 1, f1: 1, tip0: false, tip1: false });
    expect(chainWhole([P(0, 19)], 20, false)).toBe(true);
    expect(chainWhole([P(0, 18.5)], 20, false)).toBe(false);
    expect(chainWhole([P(0, 10), P(10.25, 19)], 20, false)).toBe(false);
    expect(chainWhole([P(5, 25)], 20, true)).toBe(true);
    expect(chainWhole([P(5, 24)], 20, true)).toBe(false);
    expect(chainWhole([P(15, 30), P(9, 15)], 20, true)).toBe(true);
    expect(chainWhole([], 20, true)).toBe(false);
  });

  it("kPaintAt skips VIS items (the paint is the VIS-less paint)", () => {
    const r = rng(99);
    for (let trial = 0; trial < 20; trial++) {
      const closed = trial % 2 === 0;
      const n = 16 + Math.floor(r() * 20);
      const top = closed ? n : n - 1;
      const a = dy(r, top - 4);
      const span = [PAINT_ITEM.SPAN, a, a + 3, 1, 0.5, 0, 0, 0];
      const pieces = randomPieces(r, 0, n, closed, 3);
      const U = uniforms();
      const D0 = scene([{ n, closed, pieces: [], extra: [span] }], U, false);
      const U1 = uniforms();
      const D1 = scene([{ n, closed, pieces, extra: [span] }], U1, false);
      const c0 = kChain(D0, 0);
      const c1 = kChain(D1, 0);
      for (let q = 0; q < top * 8; q++) {
        const ctrl = q / 8;
        const s0: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
        const s1: KPaintState = { p: 0, band: false, v: 0, rim: 0 };
        kPaintAt(D0, U, c0, ctrl, ctrl, 0.01, s0);
        kPaintAt(D1, U1, c1, ctrl, ctrl, 0.01, s1);
        expect(s1).toEqual(s0);
      }
    }
  });
});

describe("K76 the explore program variant (withExplore)", () => {
  // The section fragment as ribbon/ribbon_shader.ts writes it (source text;
  // the anchors hold no interpolation), with the gap library's text where the
  // module interpolates it (K268: the shaped cut's anchors are in gapKeepAt).
  const src = readFileSync(new URL("../../src/render/ribbon/ribbon_shader.ts", import.meta.url), "utf8").replace(
    /\r\n/g,
    "\n"
  );
  const start = src.indexOf("const SECTION_FRAG = /* glsl */ `");
  const end = src.indexOf("`;", start);
  const sectionText = src.slice(start, end).replace("${GAP_FRAG}", GAP_FRAG);
  const KEEP_AT = "highp float gapKeepAt(highp float pxW, highp vec2 p, highp float turn,";
  const SURE = "    highp float sure2 = sure > 0.0 ? sure * sure : 0.0;\n";
  const BK = "    if (bk < 0) continue; // Nothing of this slot within reach.\n";

  it("finds each anchor exactly once in the real section fragment", () => {
    expect(start).toBeGreaterThan(0);
    expect(sectionText).toContain(GAP_FRAG_LIB);
    for (const a of [
      KEEP_AT,
      SURE,
      BK,
      "void main(void) {\n  highp vec2 gfw = fwidth(vPos);",
      "highp float pxArc = (ksw.y < 0.5 * ksw.x ? ksw.y : ksw.x) * float(kc.count) * kc.arcPer;\n",
      "highp float kctrl = fxHere || paintHere ? kCtrlNear(kc, kpt.x, kpt.y) : 0.0;",
      "  float gk = gapKeep(pxW, gTurn);",
      "    highp float e = d - hO - margin;\n",
    ]) {
      const i = sectionText.indexOf(a);
      expect(i, a).toBeGreaterThan(0);
      expect(sectionText.indexOf(a, i + 1), a).toBe(-1);
    }
  });

  it("inserts the declarations, the shaped cut, the side derivative, the ctrl and the visibility in order", () => {
    const v = withExplore(sectionText);
    const iDecl = v.indexOf(EXPLORE_DECL_GLSL);
    const iKeepAt = v.indexOf(KEEP_AT);
    const iSure = v.indexOf(SURE + EXPLORE_GAP_SURE_GLSL);
    const iCut = v.indexOf(BK + EXPLORE_GAP_CUT_GLSL);
    const iShape = v.indexOf(EXPLORE_GAP_SHAPE_GLSL + "    highp float e = d - hO - margin;\n");
    const iSmin = v.indexOf("d = mix(d2, d, hb) - sk * hb * (1.0 - hb);");
    const iMain = v.indexOf("void main(void) {");
    const iFw = v.indexOf("highp float kSideFw = fwidth(vUV.y);");
    const iCtrl = v.indexOf("bool exHere = uKExplore.x > 0.5;");
    const iVis = v.indexOf(EXPLORE_MAIN_GLSL);
    const iGap = v.indexOf("  float gk = gapKeep(pxW, gTurn);");
    expect(iDecl).toBeGreaterThan(0);
    expect(iDecl + EXPLORE_DECL_GLSL.length).toBe(iKeepAt);
    expect(iSure).toBeGreaterThan(iKeepAt);
    expect(iCut).toBeGreaterThan(iSure);
    // K397: the dots' casing shape replaces d after the far-branch
    // smooth-min, just before the casing's distance.
    expect(iSmin).toBeGreaterThan(iCut);
    expect(iShape).toBeGreaterThan(iSmin);
    expect(iMain).toBeGreaterThan(iShape);
    expect(iFw).toBeGreaterThan(iMain);
    expect(iCtrl).toBeGreaterThan(iFw);
    expect(iVis).toBeGreaterThan(iCtrl);
    expect(iGap).toBeGreaterThan(iVis);
    expect(v).toContain("fxHere || paintHere || exHere ? kCtrlNear");
    expect(v).not.toContain("fxHere || paintHere ? kCtrlNear");
    // Everything else is the master text.
    const back = v
      .replace(EXPLORE_DECL_GLSL, "")
      .replace(EXPLORE_GAP_SURE_GLSL, "")
      .replace(EXPLORE_GAP_CUT_GLSL, "")
      .replace(EXPLORE_GAP_SHAPE_GLSL, "")
      .replace("  highp float kSideFw = fwidth(vUV.y);\n", "")
      .replace("bool exHere = uKExplore.x > 0.5;\n  ", "")
      .replace("fxHere || paintHere || exHere ?", "fxHere || paintHere ?")
      .replace(EXPLORE_MAIN_GLSL, "");
    expect(back).toBe(sectionText);
  });

  it("leaves the shared gap library (fans, the still pluck, master's ribbons) without the shaped cut", () => {
    for (const t of [GAP_FRAG_LIB, GAP_FRAG, sectionText]) {
      expect(t).not.toContain("exShaped");
      expect(t).not.toContain("exploreCutCover");
      expect(t).not.toContain("kExCutOn");
      expect(t).not.toContain("uKExplore");
    }
  });

  it("throws on a missing or repeated anchor", () => {
    expect(() => withExplore("void main(void) {}")).toThrow(/anchor/);
    expect(() => withExplore(sectionText + sectionText)).toThrow(/anchor/);
  });
});
