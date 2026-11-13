// K1362 s2: gf_pack.ts's texture layout, the one gf_glsl.ts reads. Every
// table value lands at its section's texel and component, float32-rounded,
// with Infinity as GF_BIG; sections are contiguous and fit the rows.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { buildTables, type GfTables } from "../../src/render/gpu_field/tables";
import { GF_BIG, GF_TW, packTables } from "../../src/render/gpu_field/gf_pack";

const dir = join(__dirname, "field", "scenes");
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
const f32 = (v: number): number => Math.fround(v === Infinity ? GF_BIG : v === -Infinity ? -GF_BIG : v);

let corners = 0;
describe("gf_pack layout", () => {
  for (const name of ["k42.json", "x4_ends.json", "kink.json", "j_pair_cross.json"]) {
    it(name, () => {
      const T: GfTables = buildTables(load(name), { aa: 0.5 / 320 });
      corners += T.nK;
      const P = packTables(T);
      const d = P.data;
      const at = (t: number, j: number): number => d[4 * t + j];
      const o = P.o;
      // Sections in order, back to back.
      expect(o.ch).toBe(0);
      expect(o.v).toBe(3 * T.nC);
      expect(o.pin).toBe(o.v + T.nV);
      expect(o.arm).toBe(o.pin + T.pinS.length);
      expect(o.k).toBe(o.arm + 2 * T.nA);
      expect(o.chk).toBe(o.k + 6 * T.nK);
      expect(o.cell).toBe(o.chk + 2 * T.nCh);
      expect(o.chl).toBe(o.cell + T.gW * T.gH);
      expect(o.kl).toBe(o.chl + Math.ceil(T.cellChList.length / 4));
      expect(P.rows * GF_TW).toBeGreaterThanOrEqual(o.kl + Math.ceil(T.cellKList.length / 4));
      expect(d.length).toBe(P.rows * GF_TW * 4);
      for (let c = 0; c < T.nC; c++) {
        const b = o.ch + 3 * c;
        expect([at(b, 0), at(b, 1), at(b, 2), at(b, 3)]).toEqual([T.cV0[c], T.cNV[c], T.cClosed[c], f32(T.cLen[c])]);
        expect([at(b + 1, 0), at(b + 1, 1), at(b + 1, 2), at(b + 1, 3)]).toEqual([f32(T.cS0[c]), T.cPin0[c], T.cPinN[c], T.cArm0[c]]);
        expect(at(b + 2, 0)).toBe(T.cArmN[c]);
      }
      for (let v = 0; v < T.nV; v++) {
        expect([at(o.v + v, 0), at(o.v + v, 1), at(o.v + v, 2)]).toEqual([f32(T.vx[v]), f32(T.vy[v]), f32(T.vs[v])]);
      }
      for (let i = 0; i < T.pinS.length; i++) expect([at(o.pin + i, 0), at(o.pin + i, 1)]).toEqual([f32(T.pinS[i]), f32(T.pinZ[i])]);
      for (let a = 0; a < T.nA; a++) {
        const b = o.arm + 2 * a;
        expect([at(b, 0), at(b, 1), at(b, 2), at(b, 3), at(b + 1, 0)]).toEqual([f32(T.aSR[a]), f32(T.aDir[a]), f32(T.aL[a]), f32(T.aLcut[a]), T.aG[a]]);
      }
      for (let k = 0; k < T.nK; k++) {
        const b = o.k + 6 * k;
        const want = [
          [T.kCx[k], T.kCy[k], T.kR[k], T.kRmax[k]],
          [T.kThru[k], T.kRV[k], T.kG[k], T.kJ[k]],
          [T.kEax[k], T.kEay[k], T.kEbx[k], T.kEby[k]],
          [T.kCa[k], T.kCb[k], T.kSa[k], T.kSb[k]],
          [T.kZa[k], T.kZb[k], T.kTax[k], T.kTay[k]],
          [T.kTbx[k], T.kTby[k], 0, 0],
        ];
        for (let r = 0; r < 6; r++) for (let j = 0; j < 4; j++) expect(at(b + r, j)).toBe(f32(want[r][j]));
      }
      for (let q = 0; q < T.nCh; q++) {
        const b = o.chk + 2 * q;
        expect([at(b, 0), at(b, 1), at(b, 2)]).toEqual([T.chV0[q], T.chN[q], T.chC[q]]);
        for (let j = 0; j < 4; j++) expect(at(b + 1, j)).toBe(f32(T.chBox[4 * q + j]));
      }
      for (let i = 0; i < T.gW * T.gH; i++) {
        expect([at(o.cell + i, 0), at(o.cell + i, 1), at(o.cell + i, 2), at(o.cell + i, 3)]).toEqual([T.cellCh0[i], T.cellChN[i], T.cellK0[i], T.cellKN[i]]);
      }
      for (let i = 0; i < T.cellChList.length; i++) expect(d[4 * o.chl + i]).toBe(T.cellChList[i]);
      for (let i = 0; i < T.cellKList.length; i++) expect(d[4 * o.kl + i]).toBe(T.cellKList[i]);
      // Integers ride exactly (below 2^24), and the buffer is reused when large enough.
      expect(Math.max(T.nV, T.nK, T.cellChList.length)).toBeLessThan(1 << 24);
      expect(packTables(T, P).data).toBe(P.data);
    });
  }
  it("covers corners", () => expect(corners).toBeGreaterThan(0));
});
