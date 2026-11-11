// K1283 s3: a run or ghost piece's tie alpha (draw.ts tieAlpha, as bandData feeds it) beside
// form B's ink at the band's middle, for the pieces of one chain over [s0, s1] (or near (x, y)).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283s3_ghostcmp.ts <scene> <chain> <s0> <s1> [--every=2] [--dbg]
import * as O from "../../../../src/render/outline/outline";
import { tieAlpha, zChains, footNear, zAtC } from "../../../../src/render/outline/draw";
import { FormB } from "../../../../src/render/field/form_b";
import { loadScene } from "./k1279_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, cs, s0s, s1s] = args;
const CH = Number(cs); const S0 = Number(s0s); const S1 = Number(s1s); const every = Number(opt("every") ?? 2);
const scene = loadScene(nm);
const table = O.frame(O.structure(scene), scene);
const zz = zChains(scene);
const h = table.h; const W = table.W; const zt = 0.1 * scene.look.depthAmp;
const ref = tieAlpha(zz, h, W, zt);
const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number }; pieces(x: number, y: number, out: { chain: number; s: number; d: number; z: number; key: number; g: number; ramp: number }[]): number };
const C = zz.zc[CH];
console.log(`passes of ${CH}: ${zz.passes[CH].map((P) => `o ${P.o} s ${P.s.toFixed(2)} [-${P.lo.toFixed(2)}, +${P.hi.toFixed(2)}]`).join("; ")}`);
table.pieces.forEach((p, pi) => {
  if (p.chain !== CH || (p.kind !== "run" && p.kind !== "ghost")) return;
  const lo = Math.min(p.s0, p.s1); const hi = Math.max(p.s0, p.s1);
  if (hi < S0 || lo > S1) return;
  const np = p.pts.length / 2;
  console.log(`${p.kind} ${pi} side ${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} np ${np}`);
  const cum: number[] = [0];
  for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
  const L = cum[np - 1] || 1;
  for (let i = 0; i < np; i += i + every < np ? every : Math.max(1, np - 1 - i)) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
    const s = footNear(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + ((p.s1 - p.s0) * cum[i]) / L, 2 * h, 0, 0).s;
    let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const mx = x + dx * W * 0.5; const my = y + dy * W * 0.5;
    const a = ref(CH, mx, my, s, h - W * 0.5);
    const ev = fb.evalPoint(mx, my);
    console.log(`  ${i} (${mx.toFixed(3)}, ${my.toFixed(3)}) s ${s.toFixed(3)} z ${zAtC(C, s).toFixed(3)} tie ${a.toFixed(2)} formB ink ${ev.ink.toFixed(2)} top ${ev.chain}`);
    if (process.argv.includes("--dbg")) { const P: { chain: number; s: number; d: number; z: number; key: number; g: number; ramp: number }[] = []; fb.pieces(mx, my, P); for (const q of P) console.log(`      fb piece chain ${q.chain} s ${q.s.toFixed(3)} d ${q.d.toFixed(3)} z ${q.z.toFixed(3)} key ${q.key.toFixed(3)} g ${q.g} ramp ${q.ramp.toFixed(2)}`); }
    if (i === np - 1) break;
  }
});
