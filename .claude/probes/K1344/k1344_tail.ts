// K1344 s1: one tail's inputs and the final border it walks (from outline_proto.ts, a copy of outline.ts
// that records them for one corner).
//   node scripts/run_node.mjs .claude/probes/K1344/k1344_tail.ts <scene> <corner> [s0:s1]
// Prints the TailIn (sT, endS, dirE, x0, y0, h, l1, bp(sT)) and the final border's vertices (xy, sc, s)
// over [s0, s1] (default: the tail's line part), with each step's dot against the previous one.
import * as P from "./outline_proto";
import { loadScene } from "../K1314/k1314_census";

const a = process.argv.slice(2);
const scene = loadScene(a[0]);
P.K1344.corner = Number(a[1]);
const st = P.structure(scene as never); P.frame(st, scene as never);
const K = P.K1344 as unknown as { tin: { sT: number; endS: number; dirE: number; x0: number; y0: number; h: number; W: number; bp: (s: number, o: Float64Array) => void }; piE: number; sideE: number; xy: number[]; sc: number[]; s: number[] };
if (!K.tin) { console.log("no tail at that corner"); process.exit(0); }
const t = K.tin; const l1 = Math.max(0, t.dirE * (t.sT - t.endS));
const b = new Float64Array(2); t.bp(t.sT, b);
console.log(`piE ${K.piE} side ${K.sideE} sT ${t.sT.toFixed(5)} endS ${t.endS.toFixed(5)} dirE ${t.dirE} l1 ${l1.toFixed(4)} h ${t.h} x0,y0 (${t.x0.toFixed(4)}, ${t.y0.toFixed(4)}) bp(sT) (${b[0].toFixed(4)}, ${b[1].toFixed(4)}) off (${(t.x0 - b[0]).toFixed(4)}, ${(t.y0 - b[1]).toFixed(4)})`);
let s0 = Math.min(t.sT, t.endS) - 0.05; let s1 = Math.max(t.sT, t.endS) + 0.05;
if (a[2]) [s0, s1] = a[2].split(":").map(Number);
let px = NaN; let py = NaN; let dx0 = 0; let dy0 = 0;
for (let i = 0; i < K.sc.length; i++) {
  if (K.sc[i] < s0 || K.sc[i] > s1) { px = NaN; continue; }
  const x = K.xy[2 * i]; const y = K.xy[2 * i + 1];
  let q = "";
  if (Number.isFinite(px)) { const dx = x - px; const dy = y - py; q = ` step ${Math.hypot(dx, dy).toFixed(4)} dot ${((dx * dx0 + dy * dy0) * 1e6).toFixed(1)}e-6`; dx0 = dx; dy0 = dy; }
  console.log(`${String(i).padStart(5)} (${x.toFixed(4)}, ${y.toFixed(4)}) sc ${K.sc[i].toFixed(5)} s ${K.s[i].toFixed(5)}${q}`);
  px = x; py = y;
}
// the walk's grid: u = U i / 16, the border point at s = sT - dirE u (line part)
const U = l1 + 0.5 * Math.PI * t.h;
for (let i = 0; i <= 16; i++) { const u = (U * i) / 16; if (u > l1) break; t.bp(t.sT - t.dirE * u, b); console.log(`  u${i} ${u.toFixed(4)} s ${(t.sT - t.dirE * u).toFixed(5)} bp (${b[0].toFixed(4)}, ${b[1].toFixed(4)})`); }
