// K1369 s3: the renderer's LEAN mode (ribbon_renderer.ts `lean`), which
// rp=gf turns on while it is attached (gpu_field/gf_app.ts). The methods
// run on stand-in objects: a RibbonRenderer needs a GL context. The browser
// probe `.claude/probes/K1369/k1369s3_lean.mjs` checks the real page (a
// lean update against a full one, at rest and mid-drag; a pluck's fresh
// footprints).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RibbonRenderer } from "../../src/render/ribbon_renderer";
import { StripPass } from "../../src/render/ribbon/strip_pass";

const SRC = (p: string): string => readFileSync(new URL(`../../src/${p}`, import.meta.url), "utf8");

type Fake = Record<string, unknown>;
const as = (f: Fake): RibbonRenderer => f as unknown as RibbonRenderer;

function fakeRenderer(leanNow: boolean): { r: Fake; solved: number[] } {
  const solved: number[] = [];
  const r: Fake = {
    leanNow,
    leanPoint: new Float32Array(2),
    diagData: new Float32Array(5).fill(7),
    ps: {
      crossings: [0, 1, 2],
      bindingPoint(p: { x: number; y: number }, out: Float32Array, o: number): void {
        out[o] = p.x;
        out[o + 1] = p.y;
      },
    },
    crossing: {
      computeGapSlot(_slot: number, _c: unknown, index: number): void {
        solved.push(index);
      },
    },
  };
  return { r, solved };
}

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

  it("a lean solve writes only diagData's x, y, as the full solve does", () => {
    const { r, solved } = fakeRenderer(true);
    call(r, 2);
    const d = r.diagData as Float32Array;
    expect(d.length).toBe(15); // grown to crossings * 5
    expect(Array.from(d.subarray(10, 15))).toEqual([1.5, -2.25, 0, 0, 0]);
    expect(solved).toEqual([]);
    // Index < 0 (an emergent slot) writes nothing.
    const before = Array.from(d);
    call(r, -1, { x: 9, y: 9 });
    expect(Array.from(d)).toEqual(before);
    expect(solved).toEqual([]);
  });

  it("a full update delegates to the crossing part", () => {
    const { r, solved } = fakeRenderer(false);
    call(r, 1);
    call(r, -1);
    expect(solved).toEqual([1, -1]);
    expect(Array.from(r.diagData as Float32Array)).toEqual([7, 7, 7, 7, 7]);
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
