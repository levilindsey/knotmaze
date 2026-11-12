// K1314 s4: a crop row (form B or the fillet reference | today | rp=outline, 8 h wide) with the outline's
// geometry drawn over panels 1 and 3: centrelines (blue), borders at h (light blue), junction centres
// (orange), each corner's V (red), arc centre q (green), arc circle r (green ring) and tangent points ta/tb
// (magenta). Prints the corners in the window.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s4_plot.ts <scene> <x> <y> <out.png> [--px=600] [--fillet]
import { cropRow, writePng } from "./k1314_crops";
import { buildModel, chainPt } from "./k1314_census";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const [nm, xs, ys, out] = args; const X = +xs; const Y = +ys;
const P = +(opt("px") ?? "600");
const m = buildModel(nm); const tb = m.table; const st = m.st; const h = tb.h;
const S = +(opt("zoom") ?? "8") * h; const ppu = P / S;
const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
const row = cropRow(nm, X, Y, 0, P, undefined, S / h);
const Wt = 3 * P + 8;
const dot = (wx: number, wy: number, rgb: number[], rad = 1): void => {
  const c = Math.round(wx * ppu - c0 - 0.5); const r = Math.round(wy * ppu - r0 - 0.5);
  for (const col of [0, 2]) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    const cc = c + dc; const rr = r + dr; if (cc < 0 || rr < 0 || cc >= P || rr >= P) continue;
    const o = 3 * (rr * Wt + col * (P + 4) + cc); row[o] = rgb[0]; row[o + 1] = rgb[1]; row[o + 2] = rgb[2];
  }
};
const sc = m.scene;
const inWin = (x: number, y: number): boolean => Math.abs(x - X) < S && Math.abs(y - Y) < S;
for (const ch of sc.chains) {
  const n = ch.pts.length / 2; let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(ch.pts[2 * i] - ch.pts[2 * i - 2], ch.pts[2 * i + 1] - ch.pts[2 * i - 1]);
  if (ch.closed) len += Math.hypot(ch.pts[0] - ch.pts[2 * n - 2], ch.pts[1] - ch.pts[2 * n - 1]);
  for (let s = 0; s <= len; s += 0.5 / ppu) {
    const p = chainPt(ch.pts, ch.closed, s); if (!inWin(p.x, p.y)) continue;
    dot(p.x, p.y, [40, 80, 255], 0);
    dot(p.x - p.ty * h, p.y + p.tx * h, [120, 200, 255], 0); dot(p.x + p.ty * h, p.y - p.tx * h, [120, 200, 255], 0);
  }
}
sc.junctions.forEach((j, ji) => {
  if (!inWin(j.c[0], j.c[1])) return; dot(j.c[0], j.c[1], [255, 140, 0], 2);
  st.corners.forEach((dc, ci) => {
    if (dc.ji !== ji) return; const c = tb.corners[ci];
    console.log(`j${ji} corner ${ci} c${c.aChain}/c${c.bChain}${dc.thru ? " THRU" : ""} ok ${c.ok} th ${((c.theta * 180) / Math.PI).toFixed(1)} r ${(c.r / h).toFixed(3)}h V (${c.Vx.toFixed(3)},${c.Vy.toFixed(3)}) q (${c.qx.toFixed(3)},${c.qy.toFixed(3)}) ${c.why ?? ""}`);
    dot(c.Vx, c.Vy, [230, 0, 0], 2);
    const px = (wx: number, wy: number): string => `${Math.round(wx * ppu - c0)},${Math.round(wy * ppu - r0)}`;
    console.log(`   px V ${px(c.Vx, c.Vy)} q ${px(c.qx, c.qy)} ta ${px(c.tax, c.tay)} tb ${px(c.tbx, c.tby)} J ${px(j.c[0], j.c[1])}`);
    if (c.r > 1e-9) {
      dot(c.qx, c.qy, [0, 170, 0], 2);
      for (let a = 0; a < 2 * Math.PI; a += 0.5 / (c.r * ppu)) dot(c.qx + c.r * Math.cos(a), c.qy + c.r * Math.sin(a), [0, 170, 0], 0);
      dot(c.tax, c.tay, [220, 0, 220], 2); dot(c.tbx, c.tby, [220, 0, 220], 2);
    }
  });
});
for (const rs of (opt("region") ?? "").split(",").filter((v) => v !== "")) {
  const rg = tb.regions[+rs]; const n = rg.pts.length / 2;
  console.log(`region ${rs} owner ${rg.ownerChain} group ${rg.group} hole ${rg.hole} n ${n} pieces ${rg.pieces.join(" ")}`);
  for (let i = 0; i < n; i++) {
    const ax = rg.pts[2 * i], ay = rg.pts[2 * i + 1], bx = rg.pts[(2 * i + 2) % (2 * n)], by = rg.pts[(2 * i + 3) % (2 * n)];
    const L = Math.hypot(bx - ax, by - ay) * ppu;
    for (let k = 0; k <= L; k++) dot(ax + ((bx - ax) * k) / Math.max(L, 1), ay + ((by - ay) * k) / Math.max(L, 1), [255, 255, 0], 0);
    if (inWin(ax, ay)) dot(ax, ay, [255, 255, 0], 1);
    console.log(`  v${i} (${ax.toFixed(3)},${ay.toFixed(3)}) px ${Math.round(ax * ppu - c0)},${Math.round(ay * ppu - r0)}`);
  }
}
writePng(out, row, Wt, P);
console.log(`-> ${out} (${(1 / ppu).toFixed(4)} world per px, origin ${(c0 / ppu).toFixed(3)},${(r0 / ppu).toFixed(3)})`);
