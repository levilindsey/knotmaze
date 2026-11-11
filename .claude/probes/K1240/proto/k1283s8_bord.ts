// K1283 s8: print the base border points (x, y, bs, foot) of two chain sides near a spot, from the frame
// cache of src's outline (k1283s8_dbg_outline.ts: a copy of src/render/outline/outline.ts with its
// cache map exported; make it with k1283s8_bord.ps1, which copies and runs this).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s8_bord.ts <scene> <x> <y> <R> <chain>:<side> [<chain>:<side> ...]
import * as O from "./k1283s8_dbg_outline";
import { loadScene } from "./k1279_census";

const args = process.argv.slice(2);
const [name, xs, ys, rs, ...sides] = args;
const X = Number(xs); const Y = Number(ys); const R = Number(rs);
const scene = loadScene(name);
const st = O.structure(scene);
O.frame(st, scene);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (O as any).__fastCaches.get(st);
const f = (v: number): string => v.toFixed(3);
for (const sp of sides) {
  const [ch, sd] = sp.split(":").map(Number);
  const B = C.bords[ch * 2 + (sd === 1 ? 0 : 1)];
  const row: string[] = [];
  for (let i = 0; i < B.nb; i++) if (Math.hypot(B.bx[i] - X, B.by[i] - Y) < R) row.push(`${i}:(${f(B.bx[i])},${f(B.by[i])}) s${f(B.bs[i])}`);
  console.log(`ch${ch} side ${sd} nb ${B.nb}: ${row.join(" ")}`);
}
for (let ai = 0; ai < C.nArms; ai++) {
  const a = C.armObj[ai];
  if (sides.some((sp) => Number(sp.split(":")[0]) === a.pi)) {
    const sR = C.armSR[ai];
    console.log(`arm ${ai} chain ${a.pi} sR ${f(sR)} dir ${C.armDir[ai]} L ${f(C.armL[ai])} Lcut ${f(C.armLcut[ai])}`);
  }
}
