// K1283 s3: a tail's own alpha (src outline.ts, piece.alpha) beside form B's ink at the same
// points (the band's middle, W/2 in from the border point), for the tails near (x, y).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283s3_tailcmp.ts <scene> <x> <y> [R=1] [--every=2]
import * as O from "../../../../src/render/outline/outline";
import { FormB } from "../../../../src/render/field/form_b";
import { loadScene } from "./k1279_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys, rs] = args;
const X = Number(xs); const Y = Number(ys); const R = Number(rs ?? 1); const every = Number(opt("every") ?? 2);
const scene = loadScene(nm);
(globalThis as { __tailDbg?: unknown[] }).__tailDbg = process.argv.includes("--dbg") ? [] : undefined;
const table = O.frame(O.structure(scene), scene);
const dbgAll = (globalThis as { __tailDbg?: { x: number; y: number }[] }).__tailDbg; (globalThis as { __tailDbg?: unknown[] }).__tailDbg = undefined;
const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number; top: number; chain: number; s: number }; pieces(x: number, y: number, out: { chain: number; s: number; d: number; z: number; key: number; g: number; ramp: number }[]): number; K: number };
const W = table.W;
let sumA = 0; let sumF = 0; let n = 0;
table.pieces.forEach((p, pi) => {
  if (p.kind !== "tail") return;
  const np = p.pts.length / 2; if (np < 2) return;
  let near = false; for (let i = 0; i < np; i++) if (Math.hypot(p.pts[2 * i] - X, p.pts[2 * i + 1] - Y) < R) near = true;
  if (!near) return;
  console.log(`tail ${pi} chain ${p.chain} corner ${p.corner} np ${np}`);
  for (let i = 0; i < np; i += i + every < np ? every : Math.max(1, np - 1 - i)) {
    const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
    let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const mx = x + dx * W * 0.5; const my = y + dy * W * 0.5;
    const ev = fb.evalPoint(mx, my);
    const a = p.alpha ? 0.5 * (p.alpha[2 * i] + p.alpha[2 * i + 1]) : 1;
    sumA += a; sumF += ev.ink; n++;
    console.log(`  ${i} (${mx.toFixed(3)}, ${my.toFixed(3)}) alpha ${a.toFixed(2)} formB ink ${ev.ink.toFixed(2)} top ${ev.chain}`);
    if (process.argv.includes("--dbg")) { const P: { chain: number; s: number; d: number; z: number; key: number; g: number; ramp: number }[] = []; fb.pieces(mx, my, P); for (const q of P) console.log(`      fb piece chain ${q.chain} s ${q.s.toFixed(3)} d ${q.d.toFixed(3)} z ${q.z.toFixed(3)} key ${q.key.toFixed(3)} g ${q.g} ramp ${q.ramp.toFixed(2)}`); const zt = 0.1 * scene.look.depthAmp; const kE = Math.max(...P.filter((q) => q.chain === p.chain).map((q) => q.key)); const kX = Math.max(...P.filter((q) => q.chain !== p.chain).map((q) => q.key)); let tt = (kE - kX + zt) / (2 * zt); tt = Math.min(1, Math.max(0, tt)); console.log(`      h ${table.h.toFixed(3)} W ${W.toFixed(3)} zt ${zt.toFixed(3)} keyE - keyX ${(kE - kX).toFixed(3)} ss ${(tt * tt * (3 - 2 * tt)).toFixed(2)}`); }
    if (dbgAll) { let bi = -1; let bd = Infinity; dbgAll.forEach((q, k) => { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; bi = k; } }); if (bi >= 0 && bd < 1e-6) console.log(`      src ${JSON.stringify(dbgAll[bi], (k, v) => (typeof v === "number" ? Number(v.toFixed(4)) : v))}`); }
    if (i === np - 1) break;
  }
});
console.log(`mean alpha ${(sumA / Math.max(1, n)).toFixed(3)} form B ${(sumF / Math.max(1, n)).toFixed(3)} over ${n}`);
