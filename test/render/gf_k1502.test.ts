// K1502 (26L): the pin reach key windows are baked with home off too. Before, home off kept win
// everywhere, so past a shallow crossing both depth hats read 0 and the under surface buried the
// over thread's edge ink (K1477, ring x68). The windows (reach, then the arm clip in
// assembleGfTables) must not depend on the home switch; membership still does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { buildGfPrefix, buildTables, GF_REACH_K, pinReach, type ReachPrep } from "../../src/render/gpu_field/tables";

const dir = join(__dirname, "field", "scenes");
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
const AA = 0.5 / 320;

describe("K1502 reach key windows with home off", () => {
  it("home off bakes the same clipped windows as home on, and some exceed win", () => {
    let widened = 0;
    for (const n of ["j_cross.json", "oblique30.json", "acute20.json", "curved.json"]) {
      const off = buildTables(load(n), { aa: AA, home: false });
      const on = buildTables(load(n), { aa: AA, home: true });
      expect(off.homeOn).toBe(false);
      expect(Array.from(off.pinWL)).toEqual(Array.from(on.pinWL));
      expect(Array.from(off.pinWR)).toEqual(Array.from(on.pinWR));
      for (let i = 0; i < off.pinS.length; i++) {
        if (off.pinWL[i] > off.win + 1e-9 || off.pinWR[i] > off.win + 1e-9) widened++;
        // a window never runs below win, and never past its pin gap's clip floor of win
        expect(off.pinWL[i]).toBeGreaterThanOrEqual(off.win);
        expect(off.pinWR[i]).toBeGreaterThanOrEqual(off.win);
      }
    }
    expect(widened).toBeGreaterThan(0);
  });

  // K1502 26N: the prep path (per-segment prune + block jumps in the stretch search) must
  // return the no-prep reach on every side: a skipped segment updates neither d nor kp.
  it("pinReach with prep returns the no-prep reach on every pin side", () => {
    let sides = 0;
    for (const n of ["j_cross.json", "oblique30.json", "acute20.json", "curved.json"]) {
      const P = buildGfPrefix(load(n), { aa: AA, home: false });
      const RW = { cV0: P.cV0, cNV: P.cNV, cClosed: P.cClosed, cLen: P.cLen, cS0: P.cS0, vx: P.vx, vy: P.vy, vs: P.vs };
      const prep = new Map<number, ReachPrep>();
      const from = P.win / GF_REACH_K;
      for (let c = 0; c < P.nC; c++) {
        const cnt = P.cPinN[c]; const b = P.cPin0[c];
        for (let i = 0; i < cnt; i++) {
          const q = b + i;
          for (const dir of [-1, 1] as const) {
            const gap = P.cClosed[c] ? P.cLen[c] : Infinity;
            const withPrep = pinReach(RW, c, P.pinS[q], dir, P.pinPC[q], P.pinPS[q], P.h, gap, from, prep);
            const noPrep = pinReach(RW, c, P.pinS[q], dir, P.pinPC[q], P.pinPS[q], P.h, gap, from, undefined);
            expect(withPrep).toBe(noPrep);
            sides++;
          }
        }
      }
    }
    expect(sides).toBeGreaterThan(0);
  });
});
