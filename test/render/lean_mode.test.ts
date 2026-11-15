// K1369 s3: the renderer's LEAN mode (ribbon_renderer.ts `lean`), which
// rp=gf turns on while it is attached (gpu_field/gf_app.ts). The methods
// run on stand-in objects: a RibbonRenderer needs a GL context. The browser
// probe `.claude/probes/K1369/k1369s3_lean.mjs` checks the real page (a
// lean update against a full one, at rest and mid-drag; a pluck's fresh
// footprints).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RibbonRenderer } from "../../src/render/ribbon_renderer";
import { CrossingGaps } from "../../src/render/ribbon/crossing_gaps";
import { StripPass } from "../../src/render/ribbon/strip_pass";

const SRC = (p: string): string => readFileSync(new URL(`../../src/${p}`, import.meta.url), "utf8");

type Fake = Record<string, unknown>;
const as = (f: Fake): RibbonRenderer => f as unknown as RibbonRenderer;

function fakeRenderer(leanNow: boolean): { r: Fake; solved: number[]; lean: number[] } {
  const solved: number[] = [];
  const lean: number[] = [];
  const r: Fake = {
    leanNow,
    diagData: new Float32Array(5).fill(7),
    crossing: {
      computeGapSlot(_slot: number, _c: unknown, index: number): void {
        solved.push(index);
      },
      leanSlot(_slot: number, _c: unknown, index: number): void {
        lean.push(index);
      },
    },
  };
  return { r, solved, lean };
}

// K1387: CrossingGaps.leanSlot on a stand-in renderer, the under march's
// setup and march stubbed to fixed results (`res`, read at setup time for
// the setup's fields). Since s2 the march waits in a per-under-chain queue
// until a reader flushes it; `marched` lists the slots marched, in order.
function fakePart(res: Fake): { part: CrossingGaps; r: Fake; marched: number[] } {
  const r: Fake = {
    diagData: new Float32Array(5).fill(7),
    sampleScratch: new Float32Array(8),
    slotAllNeg: new Float32Array(4),
    slotAllPos: new Float32Array(4),
    slotCutNeg: new Float32Array(4),
    slotCutPos: new Float32Array(4),
    chainCuts: new Map<number, number[]>(),
    underWindows: new Map<number, number[]>(),
    ps: {
      crossings: [0, 1, 2],
      bindingPoint(p: { x: number; y: number }, out: Float32Array, o: number): void {
        out[o] = p.x;
        out[o + 1] = p.y;
      },
    },
  };
  const part = new CrossingGaps(r as never);
  const marched: number[] = [];
  const p = part as unknown as Fake;
  p.setupUnder = (m: Fake, slot: number, crossing: { under: { chain: number } }): void => {
    m.slot = slot;
    m.underChain = crossing.under.chain;
    m.underCenter = res.underCenter;
    m.exploreVis = res.exploreVis;
    m.uwShown = res.uwShown;
  };
  p.marchUnder = (m: Fake): void => {
    marched.push(m.slot as number);
    m.cutNeg = res.cutNeg;
    m.cutPos = res.cutPos;
    m.allNeg = res.allNeg;
    m.allPos = res.allPos;
  };
  return { part, r, marched };
}

const leanCall = (
  part: CrossingGaps,
  slot: number,
  index: number,
  over = { x: 1.5, y: -2.25 },
  chain = 4
): void =>
  part.leanSlot(slot, { over: over as never, under: { chain } as never }, index, null, null, 0.25, 0.1);

const call = (r: Fake, index: number, over = { x: 1.5, y: -2.25 }): void =>
  RibbonRenderer.prototype.computeGapSlot.call(
    as(r),
    0,
    { over: over as never, under: {} as never },
    index,
    null,
    null,
    0.25,
    0.1,
    1
  );

describe("K1369 s3 lean mode", () => {
  it("is off unless rp=gf turns it on", () => {
    const src = SRC("render/ribbon_renderer.ts");
    expect(src).toMatch(/^ {2}lean = false;$/m);
    expect(src.match(/\.lean = true/g) ?? []).toHaveLength(0);
    const gf = SRC("render/gpu_field/gf_app.ts");
    expect(gf).toMatch(/opts\(\)\.lean !== false/);
    expect(gf).toMatch(/leanOn\.lean = false/);
    // No instance patches: the mode lives on the renderer.
    expect(gf).not.toMatch(/\.computeGapSlot\s*=/);
    expect(gf).not.toMatch(/\.extrude\s*=/);
  });

  it("a lean update solves every slot through the part's leanSlot (K1387)", () => {
    const { r, solved, lean } = fakeRenderer(true);
    call(r, 2);
    call(r, -1);
    expect(lean).toEqual([2, -1]);
    expect(solved).toEqual([]);
  });

  it("a full update delegates to the crossing part", () => {
    const { r, solved, lean } = fakeRenderer(false);
    call(r, 1);
    call(r, -1);
    expect(solved).toEqual([1, -1]);
    expect(lean).toEqual([]);
    expect(Array.from(r.diagData as Float32Array)).toEqual([7, 7, 7, 7, 7]);
  });

  it("leanSlot writes the under-gap outputs and diagData's x, y (K1387)", () => {
    const march = {
      underCenter: 12.5,
      cutNeg: 0.4,
      cutPos: 0.6,
      allNeg: 0.5,
      allPos: 0.7,
      exploreVis: 0.5,
      uwShown: true,
    };
    const { part, r, marched } = fakePart(march);
    const cuts = r.chainCuts as Map<number, number[]>;
    const uw = r.underWindows as Map<number, number[]>;
    leanCall(part, 3, 2);
    const d = r.diagData as Float32Array;
    expect(d.length).toBe(15); // grown to crossings * 5
    // diagData's x, y are eager (gf reads them every frame); the march waits.
    expect(Array.from(d.subarray(10, 15))).toEqual([1.5, -2.25, 0, 0, 0]);
    expect(marched).toEqual([]);
    expect(cuts.get(4)).toBeUndefined();
    // An emergent slot (index < 0) leaves diagData alone; a hidden window
    // (uwShown false) still records its cut, as the full solve does.
    const before = Array.from(d);
    march.uwShown = false;
    leanCall(part, 1, -1, { x: 9, y: 9 });
    expect(Array.from(d)).toEqual(before);
    expect(part.leanPending).toBe(2);
    part.leanFlushChain(5); // another chain's flush marches nothing
    expect(marched).toEqual([]);
    part.leanFlushChain(4);
    expect(marched).toEqual([3, 1]); // in solve order
    expect((r.slotCutNeg as Float32Array)[3]).toBeCloseTo(0.4, 6);
    expect((r.slotAllPos as Float32Array)[3]).toBeCloseTo(0.7, 6);
    expect(cuts.get(4)).toEqual([3, 12.5, 0.5, 0.7, 1, 12.5, 0.5, 0.7]);
    expect(uw.get(4)).toEqual([12.5, 0.2, 0.3]);
    expect(part.leanPending).toBe(0);
    part.leanFlushChain(4); // each slot marches once
    part.leanFlushAll();
    expect(marched).toEqual([3, 1]);
    expect(part.leanStats).toEqual({ queued: 2, marched: 2 });
  });

  it("the lazy march: flushAll marches every chain, leanReset drops the queue (K1387 s2)", () => {
    const res = { underCenter: 2, cutNeg: 0.1, cutPos: 0.2, allNeg: 0.3, allPos: 0.4, exploreVis: 1, uwShown: true };
    const { part, r, marched } = fakePart(res);
    const uw = r.underWindows as Map<number, number[]>;
    leanCall(part, 0, 0, undefined, 4);
    leanCall(part, 1, 1, undefined, 6);
    leanCall(part, 2, 2, undefined, 4);
    part.leanFlushAll();
    expect(marched.slice().sort()).toEqual([0, 1, 2]);
    expect(marched.indexOf(0)).toBeLessThan(marched.indexOf(2));
    expect(uw.get(4)).toHaveLength(6);
    expect(uw.get(6)).toHaveLength(3);
    // A new update resets the queue: what was queued is never marched.
    leanCall(part, 3, 0, undefined, 4);
    part.leanReset();
    expect(part.leanPending).toBe(0);
    part.leanFlushAll();
    expect(marched).toHaveLength(3);
    // The pool is reused after a reset, and the queue works again.
    leanCall(part, 3, 0, undefined, 6);
    part.leanFlushChain(6);
    expect(marched).toEqual([...marched.slice(0, 3), 3]);
    expect(uw.get(6)).toHaveLength(6);
  });

  it("every reader of the lazy outputs flushes first (K1387 s2)", () => {
    const rr = SRC("render/ribbon_renderer.ts");
    for (const name of ["underClipBand", "underGapVisibility", "underCutCtrls"]) {
      const at = rr.search(new RegExp(`^ {2}${name}\\(`, "m"));
      expect(at, name).toBeGreaterThan(0);
      const body = rr.slice(at, rr.indexOf("\n  }\n", at));
      const flush = body.indexOf("leanFlushChain(chain)");
      expect(flush, name).toBeGreaterThan(0);
      const read = body.search(/underWindows\.get|chainCuts\.get/);
      expect(read, name).toBeGreaterThan(flush);
    }
    // update() drops the last solve's queue as it clears the windows.
    expect(rr).toMatch(/this\.underWindows\.clear\(\);\s*\n\s*(\/\/[^\n]*\n\s*)*this\.crossing\.leanReset\(\);/);
    const jn = SRC("render/ribbon/joinery.ts");
    expect(jn).toMatch(/this\.r\.leanFlush\(arm\.chain\);[^\n]*\n\s*const win = this\.r\.underWindows\.get\(arm\.chain\);/);
    const ex = SRC("render/ribbon/explore_gaps.ts");
    expect(ex.match(/this\.r\.leanFlush\(/g) ?? []).toHaveLength(2);
  });

  it("the site tester refreshes a lean frame's footprints first (K1388)", () => {
    const order: string[] = [];
    const r: Fake = {
      leanFresh(): void {
        order.push("fresh");
      },
      pluckHost: {
        plucks: {
          siteTester(): () => boolean {
            order.push("tester");
            return () => true;
          },
        },
      },
    };
    const test = RibbonRenderer.prototype.pluckSiteTester.call(as(r));
    expect(test(0, 0)).toBe(true);
    expect(order).toEqual(["fresh", "tester"]);
    // The app's two site tests go through it.
    expect(SRC("app/input_pointer.ts")).toMatch(/renderer\.pluckSiteTester\(\)/);
    expect(SRC("app/auto_audio.ts")).toMatch(/renderer\.pluckSiteTester\(\)/);
    expect(SRC("app/input_pointer.ts")).not.toMatch(/plucks\.siteTester\(\)/);
    expect(SRC("app/auto_audio.ts")).not.toMatch(/plucks\.siteTester\(\)/);
  });

  it("a lean extrude skips the fill mesh and returns the same multiplier", () => {
    const mul = new Float32Array([0.5, 1]);
    for (const leanNow of [true, false]) {
      let updates = 0;
      const pass = {
        r: { leanNow, pluckHost: { withPluckCollapse: () => mul } },
        fills: [{ update: () => updates++ }],
        style: { threadWidth: 0.5 },
      };
      const got = StripPass.prototype.extrude.call(
        pass as unknown as StripPass,
        0,
        { count: 2, positions: new Float32Array(4), tangents: new Float32Array(4) } as never,
        null
      );
      expect(got).toBe(mul);
      expect(updates).toBe(leanNow ? 0 : 1);
    }
  });

  it("leanFresh runs one full update after a lean one, and keeps the mode", () => {
    const seen: boolean[] = [];
    const r: Fake = {
      lean: true,
      leanStale: true,
      update(this: Fake): void {
        seen.push(this.lean as boolean);
        this.leanStale = false;
      },
    };
    RibbonRenderer.prototype.leanFresh.call(as(r));
    RibbonRenderer.prototype.leanFresh.call(as(r));
    expect(seen).toEqual([false]);
    expect(r.lean).toBe(true);
  });
});
