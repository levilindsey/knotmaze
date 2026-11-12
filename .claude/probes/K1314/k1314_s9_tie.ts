// K1314 s9: a tied run's tie alpha along its border (draw.ts tieAlpha at each point, outer and inner), and the
// same along its chain's border extended past either end, to see where form B's fade would run on.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s9_tie.ts <scene> <piece> [--ext=0.5] [--n=12]
import { buildModel } from "./k1314_census";
import * as D from "../../../src/render/outline/draw";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, ps] = args.filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const p = m.table.pieces[+ps]; const h = m.table.h; const W = m.table.W;
const zt = 0.1 * m.scene.look.depthAmp; const A = D.tieAlpha(m.zz, h, W, zt);
const c = p.chain; const C = m.zz.zc[c];
console.log(`piece ${ps} ${p.kind} c${c} side ${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} h ${h} W ${W} passes ${m.zz.passes[c].map((P) => `o${P.o}@${P.s.toFixed(2)}[-${P.lo.toFixed(2)},+${P.hi.toFixed(2)}]`).join(" ")}`);
const n = Number(opt("n") ?? 12); const np = p.pts.length / 2;
const out: string[] = [];
for (let i = 0; i < Math.min(n, np); i++) {
  const x = p.pts[2 * i]; const y = p.pts[2 * i + 1]; const cx = p.cpts[2 * i]; const cy = p.cpts[2 * i + 1];
  const f = D.footNear(C, cx, cy, p.s0, 2 * h, 0, 0);
  const dx = cx - x; const dy = cy - y; const l = Math.hypot(dx, dy) || 1;
  out.push(`${i}:s${f.s.toFixed(3)} a${A(c, x, y, f.s, h).toFixed(2)}/${A(c, x + (W * dx) / l, y + (W * dy) / l, f.s, h - W).toFixed(2)}`);
}
console.log(out.join(" "));
// The chain's side border past the start: centreline point at s, offset h on the piece's side.
const ext = Number(opt("ext") ?? 0.5); const o2: string[] = [];
for (let k = 0; k <= 10; k++) {
  const s = p.s0 - (ext * k) / 10; const q = D.footNear(C, p.cpts[0], p.cpts[1], s, 0, 0, 0);
  void q;
  const P = (D as unknown as { zPointAt?: (C: unknown, s: number) => { x: number; y: number; tx: number; ty: number } }).zPointAt;
  if (!P) { o2.push("no zPointAt"); break; }
  const pt = P(C, s); const nx = -pt.ty * p.side; const ny = pt.tx * p.side;
  const x = pt.x + h * nx; const y = pt.y + h * ny;
  o2.push(`s${s.toFixed(3)}(${x.toFixed(3)},${y.toFixed(3)}) a${A(c, x, y, s, h).toFixed(2)}`);
}
console.log("ext: " + o2.join(" "));
