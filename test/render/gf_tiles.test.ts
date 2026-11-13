// K1362 s5: gf_tiles.ts's tile route against the CPU mirror (GfEval), point by point on the field scenes.
// opt 0 (the exact bound): every point of a tier tile holds no more pieces / corners than the tier, and no ramp in a
// NORAMP tier. Every opt: a point in no drawn tile has the empty output (no piece, no corner), and the rects are the
// classes in order, each tile once.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { buildTables } from "../../src/render/gpu_field/tables";
import { buildTileRoute } from "../../src/render/gpu_field/gf_tiles";
import { GF_TILE_TIERS } from "../../src/render/gpu_field/gf_pass";
import { GfEval } from "../../src/render/gpu_field/eval";

const dir = join(__dirname, "field", "scenes");
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};

describe("gf_tiles route", () => {
  for (const name of ["k42.json", "x4_ends.json", "kink.json", "j_pair_cross.json"]) {
    it(name, () => {
      const T = buildTables(load(name), { aa: 0.5 / 320 });
      const ev = new GfEval(T) as unknown as GfEval & { np: number; nk: number; pg: Int32Array; pramp: Float64Array };
      // the samples: a third of a cell apart, off the tile edges
      const step = T.G / 3; const nxs = Math.floor((T.gW * T.G) / step); const nys = Math.floor((T.gH * T.G) / step);
      const P = new Int32Array(nxs * nys); const K = new Int32Array(nxs * nys); const R = new Uint8Array(nxs * nys); const E = new Uint8Array(nxs * nys);
      for (let j = 0; j < nys; j++) for (let i = 0; i < nxs; i++) {
        const o = ev.eval(T.gx0 + (i + 0.37) * step, T.gy0 + (j + 0.61) * step);
        const id = j * nxs + i; P[id] = ev.np; K[id] = ev.nk;
        let r = 0; for (let m = 0; m < ev.np; m++) if (ev.pg[m] >= 0 && ev.pramp[m] > 0 && ev.pramp[m] < 1) r = 1;
        R[id] = r; E[id] = o.ink === 0 && o.cov === 0 ? 1 : 0;
      }
      let tierTiles = 0;
      for (const tc of [1, 2, 4]) for (const opt of [0, 1, 2]) {
        const R0 = buildTileRoute(T, GF_TILE_TIERS, tc, undefined, undefined, opt);
        const nx = Math.ceil(T.gW / tc); const ny = Math.ceil(T.gH / tc); const side = tc * T.G;
        expect(R0.total).toBe(nx * ny);
        const cls = new Uint8Array(nx * ny).fill(255);
        let n = 0;
        for (let c = 0; c < R0.count.length; c++) {
          expect(R0.first[c]).toBe(n);
          for (let t = R0.first[c]; t < R0.first[c] + R0.count[c]; t++, n++) {
            const tx = Math.round((R0.rects[4 * t] - T.gx0) / side); const ty = Math.round((R0.rects[4 * t + 1] - T.gy0) / side);
            expect(cls[ty * nx + tx]).toBe(255);
            cls[ty * nx + tx] = c;
          }
        }
        expect(n + R0.empty).toBe(nx * ny);
        if (opt === 0) for (let c = 0; c < GF_TILE_TIERS.length; c++) tierTiles += R0.count[c];
        const bad = [0, 0, 0, 0];
        for (let j = 0; j < nys; j++) for (let i = 0; i < nxs; i++) {
          const id = j * nxs + i;
          const c = cls[Math.floor(((j + 0.61) * step) / side) * nx + Math.floor(((i + 0.37) * step) / side)];
          if (c === 255) { if (!E[id] || P[id] > 0 || K[id] > 0) bad[3]++; continue; }
          if (opt > 0 || c >= GF_TILE_TIERS.length) continue;
          const t = GF_TILE_TIERS[c];
          if (P[id] > t.p) bad[0]++;
          if (K[id] > t.k) bad[1]++;
          if (!t.ramps && R[id]) bad[2]++;
        }
        expect(`tc ${tc} opt ${opt}: ${bad.join("/")}`).toBe(`tc ${tc} opt ${opt}: 0/0/0/0`);
      }
      // the exact bound must still route something to the tiers, or the check above proves nothing
      expect(tierTiles).toBeGreaterThan(0);
    });
  }
});
