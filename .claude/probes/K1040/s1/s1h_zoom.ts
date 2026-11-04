// K1114 S1h: zoomed crop of one site, before | after | diff side by side, no labels (the crops the `seen` lines were
// written from at zoom 6-8). The diff is signed like s1h_pair.ts's: red = more ink after, blue = less ink after, over a
// faint grey of the larger ink. before = S1f's final (form_b_s1f_q.ts), after = today's defaults (src/render/field/form_b.ts).
// Usage (from the worktree): ARGS="<scene> <X world> <Y world> <halfH> <zoom> <out.png>" \
//   npx.cmd vite-node .claude/probes/K1040/s1/s1h_zoom.ts      (or the same six words as arguments)
// Example: ARGS="muse_hash 14.105 14.474 2 8 $env:TEMP\s17.png"  (the window is 2 * halfH * h device px square, dpr 2).
import { readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { FormB as FormBOld } from "./form_b_s1f_q";
import { encodePng } from "../../../../test/render/field/png";
const [scene, X, Y, halfH, zoom, out] = process.argv.slice(2).length ? process.argv.slice(2) : (process.env.ARGS ?? "").split(" ");
const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${scene}.json`, "utf8")) as FieldScene;
sc.look.ctrlArc ??= 0.47;
const O: any = new FormBOld(sc, { dpr: 2 });
const N: any = new FormB(sc, { dpr: 2 });
const ppu = N.ppuDev, h = O.h, z = +zoom;
const n = Math.round(+halfH * 2 * h * ppu);
// The grid is aligned to the device-pixel lattice and centred on the site.
const x0 = Math.round(+X * ppu - n / 2) / ppu, y0 = Math.round(+Y * ppu - n / 2) / ppu;
const W = 3 * n * z + 2 * 8, H = n * z;
const d = new Uint8Array(W * H * 4).fill(255);
const put = (px: number, py: number, c: number[]) => { const o = (py * W + px) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
  const wx = x0 + (i + 0.5) / ppu, wy = y0 + (j + 0.5) / ppu;
  const a = O.evalPoint(wx, wy).ink, b = N.evalPoint(wx, wy).ink;
  const ga = Math.round(255 * (1 - a)), gb = Math.round(255 * (1 - b));
  const dd = b - a, df = Math.abs(dd), base = 255 - Math.round(60 * Math.max(a, b));
  const lo = Math.round(base * (1 - Math.min(1, df * 1.5)));
  const c3 = df > 0.004 ? (dd > 0 ? [255, lo, lo] : [lo, lo, 255]) : [base, base, base];
  for (let q = 0; q < z; q++) for (let r = 0; r < z; r++) {
    put(i * z + r, j * z + q, [ga, ga, ga]);
    put(n * z + 8 + i * z + r, j * z + q, [gb, gb, gb]);
    put(2 * (n * z + 8) + i * z + r, j * z + q, c3);
  }
}
writeFileSync(out, encodePng(W, H, d));
