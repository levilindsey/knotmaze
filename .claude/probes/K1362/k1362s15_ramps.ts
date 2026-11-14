// K1362 s15: how many pixels ramp (nr > 0, the configuration loop runs more than once) at the bench map, and how many
// 8x4 blocks hold one (a block with one ramping pixel runs the loop's trips for all of its lanes).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s15_ramps.ts <sceneDir> [w] [h]
import { readFileSync, readdirSync } from "node:fs";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import { GfEval } from "../../../src/render/gpu_field/eval";

const dir = process.argv[2]; const W = +(process.argv[3] ?? 822); const H = +(process.argv[4] ?? 1506); const FIT = 0.917;
const SCENES = (process.argv[5] ?? "def,muse_hash,fat").split(",");
for (const name of SCENES) {
  const scene = JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8"));
  scene.look ??= {}; scene.look.ctrlArc ??= 0.47;
  let T: GfTables = buildTables(scene, { aa: 0.01 });
  let s = 1; let cx = 0; let cy = 0;
  for (let k = 0; k < 2; k++) {
    const bw = T.gW * T.G; const bh = T.gH * T.G;
    s = FIT * Math.min(W / bw, H / bh); cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
    T = buildTables(scene, { aa: 0.5 / s });
  }
  const e = W / 2 - s * cx; const f = H / 2 - s * cy;
  const ev = new GfEval(T) as unknown as { eval(x: number, y: number): unknown; np: number; pg: Int32Array; pramp: Float64Array };
  const BW = 8, BH = 4; const nbx = Math.ceil(W / BW); const blk = new Uint8Array(nbx * Math.ceil(H / BH)); const blkAny = new Uint8Array(blk.length);
  let pix = 0, ramp = 0, ramp2 = 0, ovf = 0, inked = 0;
  for (let py = 0; py < H; py++) {
    const y = -(py + 0.5) / s + (H - f) / s;
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / s - e / s;
      const o = ev.eval(x, y) as { ink: number };
      pix++; if (o.ink > 0) inked++;
      const b = Math.floor(py / BH) * nbx + Math.floor(px / BW); blkAny[b] = 1;
      if (ev.np > 3) { ovf++; continue; }
      let nr = 0; for (let j = 0; j < ev.np; j++) if (ev.pg[j] >= 0 && ev.pramp[j] > 0 && ev.pramp[j] < 1) nr++;
      if (nr > 0) { ramp++; blk[b] = 1; } if (nr > 1) ramp2++;
    }
  }
  const nb = blkAny.reduce((a, v) => a + v, 0); const nbr = blk.reduce((a, v) => a + v, 0);
  console.log(`${name.padEnd(12)} px ${pix} inked ${(100 * inked / pix).toFixed(1)}% | ramp px ${(100 * ramp / pix).toFixed(2)}% (nr2 ${(100 * ramp2 / pix).toFixed(2)}%) | 8x4 blocks with a ramp px ${(100 * nbr / nb).toFixed(1)}% | np>3 ${(100 * ovf / pix).toFixed(3)}%`);
}
