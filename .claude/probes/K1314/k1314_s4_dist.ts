// K1314 s4: distance (in h) from points to the nearest few chains' centrelines, and the s there.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s4_dist.ts <scene> x,y [x,y ...] [--seg=x0,y0,x1,y1 (sample 9 points along)]
import { buildModel, chainPt } from "./k1314_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const m = buildModel(args[0]); const sc = m.scene; const h = m.table.h;
const pts: number[][] = args.slice(1).map((a) => a.split(",").map(Number));
const seg = opt("seg"); if (seg) { const [a, b, c, d] = seg.split(",").map(Number); for (let i = 0; i <= 8; i++) pts.push([a + ((c - a) * i) / 8, b + ((d - b) * i) / 8]); }
for (const a of (opt("at") ?? "").split(";").filter((v) => v !== "")) {
  const [ci, s] = a.split(",").map(Number); const ch = sc.chains[ci]; const p = chainPt(ch.pts, ch.closed, s);
  console.log(`c${ci} s ${s}: centre (${p.x.toFixed(3)},${p.y.toFixed(3)}) side+1 (${(p.x - p.ty * h).toFixed(3)},${(p.y + p.tx * h).toFixed(3)}) side-1 (${(p.x + p.ty * h).toFixed(3)},${(p.y - p.tx * h).toFixed(3)})`);
}
for (const [x, y] of pts) {
  const best: { ci: number; d: number; s: number; side: number }[] = [];
  sc.chains.forEach((ch, ci) => {
    const n = ch.pts.length / 2; let s = 0; let bd = Infinity; let bs = 0; let bside = 0;
    const segs = ch.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const ax = ch.pts[2 * i], ay = ch.pts[2 * i + 1], bx = ch.pts[(2 * i + 2) % (2 * n)], by = ch.pts[(2 * i + 3) % (2 * n)];
      const L = Math.hypot(bx - ax, by - ay); if (L < 1e-12) continue;
      let t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (L * L); t = Math.max(0, Math.min(1, t));
      const px = ax + t * (bx - ax), py = ay + t * (by - ay); const d = Math.hypot(x - px, y - py);
      if (d < bd) { bd = d; bs = s + t * L; bside = Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax)); }
      s += L;
    }
    best.push({ ci, d: bd, s: bs, side: bside });
  });
  best.sort((p, q) => p.d - q.d);
  console.log(`(${x.toFixed(3)},${y.toFixed(3)}) ` + best.slice(0, 3).map((b) => `c${b.ci} ${(b.d / h).toFixed(2)}h s ${b.s.toFixed(2)} side ${b.side}`).join(" | "));
}
