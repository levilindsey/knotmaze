// K1325 s1: where the plateau reference (K922 overlap depth) changes the census reference's ink, per crossing.
//
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_footprint.ts [scene,...] [--ppu=40] [--d=0.25] [--top=8]
//
// For every pixel (at --ppu) in the plateau gate, compares the plateau form B's ink with plain form B's, counts the
// pixels that differ by more than --d, scales them to census pixels (ppu 160), and attributes each to the nearest
// flagged crossing. Prints per scene the flagged crossings, the gated pixels and the changed ones, then the top
// crossings by changed pixels with their reach ratio.
import { buildModel, plainOf, plateauOf } from "../K1314/k1314_census";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ALL = "muse_hash,g41_def_tw42,g41_ring_tw64,user_tw42.lightpaper,def,fat,g41_def_tw64,g41_user_tw42,muse_default_tw,ring,g41_ring_tw42,g41_user_tw64";
const names = (pos[0] ?? ALL).split(",");
const ppu = Number(opt("ppu") ?? 40); const D = Number(opt("d") ?? 0.25); const TOP = Number(opt("top") ?? 8);
const scale = (160 / ppu) ** 2;
for (const nm of names) {
  const m = buildModel(nm); const P = plateauOf(m); const pl = plainOf(m);
  if (!P.n) { console.log(`${nm}: flagged ${P.xs.length}, no z changed`); continue; }
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const l of P.g.values()) for (let q = 0; q < l.length; q += 2) { x0 = Math.min(x0, l[q]); x1 = Math.max(x1, l[q]); y0 = Math.min(y0, l[q + 1]); y1 = Math.max(y1, l[q + 1]); }
  x0 -= P.R; y0 -= P.R; x1 += P.R; y1 += P.R;
  const per = new Map<number, number>(); const add = new Map<number, number>(); let gated = 0; let changed = 0;
  for (let r = Math.floor(y0 * ppu); r <= y1 * ppu; r++) for (let c = Math.floor(x0 * ppu); c <= x1 * ppu; c++) {
    const x = (c + 0.5) / ppu; const y = (r + 0.5) / ppu;
    // plateauNear is exported for the census; recompute it here through the grid
    const ci = Math.floor(x / P.cell); const ri = Math.floor(y / P.cell); let near = false;
    for (let i = ci - 1; i <= ci + 1 && !near; i++) for (let k = ri - 1; k <= ri + 1 && !near; k++) {
      const l = P.g.get(`${i},${k}`); if (!l) continue;
      for (let q = 0; q < l.length; q += 2) if ((l[q] - x) ** 2 + (l[q + 1] - y) ** 2 < P.R * P.R) { near = true; break; }
    }
    if (!near) continue;
    gated++;
    const a = P.F.evalPoint(x, y).ink; const b = pl.evalPoint(x, y).ink;
    if (Math.abs(Math.min(1, Math.max(0, a)) - Math.min(1, Math.max(0, b))) <= D) continue;
    changed++;
    let best = -1; let bd = Infinity;
    for (const xi of P.xs) { const p = m.xPts[xi]; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = xi; } }
    per.set(best, (per.get(best) ?? 0) + 1); if (a > b) add.set(best, (add.get(best) ?? 0) + 1);
  }
  console.log(`${nm}: flagged ${P.xs.length}, gated ${Math.round(gated * scale)} px, changed ${Math.round(changed * scale)} px at ${per.size} crossings`);
  const top = [...per].sort((u, v) => v[1] - u[1]).slice(0, TOP);
  console.log("  " + top.map(([xi, n]) => `x${xi} (${m.xPts[xi].x.toFixed(2)}, ${m.xPts[xi].y.toFixed(2)}) ${Math.round(n * scale)} (+${Math.round((add.get(xi) ?? 0) * scale)})`).join("; "));
  if (process.argv.includes("--x304")) for (const xi of [302, 303, 304]) console.log(`  x${xi} ${Math.round((per.get(xi) ?? 0) * scale)} (+${Math.round((add.get(xi) ?? 0) * scale)})`);
}
