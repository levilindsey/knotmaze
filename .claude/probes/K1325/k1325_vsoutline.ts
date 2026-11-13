// K1325 s1: at each plateau-flagged crossing, which reference agrees with rp=outline: plain form B or the plateau.
//
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_vsoutline.ts [scene,...] [--ppu=80] [--d=0.5] [--top=10]
//
// Rasters rp=outline in a box of +-R around each flagged crossing, and counts, inside the plateau gate, the pixels
// where plain form B's ink and the plateau's ink differ from the outline's by more than --d (in census pixels,
// ppu 160). Prints per scene the totals, then the crossings where the plateau disagrees with the outline more than
// plain form B does (the places a plateau reference would raise a find).
import { buildModel, plainOf, plateauOf, plateauNear, rasterOutline } from "../K1314/k1314_census";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ALL = "muse_hash,g41_ring_tw64,g41_def_tw64,muse_default_tw,ring,g41_user_tw64";
const ppu = Number(opt("ppu") ?? 80); const D = Number(opt("d") ?? 0.5); const TOP = Number(opt("top") ?? 10);
const sc = (160 / ppu) ** 2; const cl = (v: number): number => Math.min(1, Math.max(0, v));
for (const nm of (pos[0] ?? ALL).split(",")) {
  const m = buildModel(nm); const P = plateauOf(m); const pl = plainOf(m);
  const done = new Set<string>(); let tp = 0; let tz = 0; const rows: [number, number, number][] = [];
  for (const xi of P.xs) {
    const q = m.xPts[xi]; const c0 = Math.floor((q.x - P.R) * ppu); const r0 = Math.floor((q.y - P.R) * ppu); const n = Math.ceil(2 * P.R * ppu);
    const O = rasterOutline(m, c0, r0, n, n, ppu); let bp = 0; let bz = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const key = `${c0 + c},${r0 + r}`; if (done.has(key)) continue;
      const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu; if (!plateauNear(P, x, y)) continue;
      done.add(key); const o = cl(O.ink[r * n + c]);
      if (Math.abs(cl(pl.evalPoint(x, y).ink) - o) > D) bp++;
      if (Math.abs(cl(P.F.evalPoint(x, y).ink) - o) > D) bz++;
    }
    tp += bp; tz += bz; rows.push([xi, bp, bz]);
  }
  console.log(`${nm}: flagged ${P.xs.length}; off the outline: plain ${Math.round(tp * sc)} px, plateau ${Math.round(tz * sc)} px`);
  const worse = rows.filter((r) => r[2] > r[1]).sort((u, v) => (v[2] - v[1]) - (u[2] - u[1])).slice(0, TOP);
  if (worse.length) console.log("  plateau worse: " + worse.map(([xi, a, b]) => `x${xi} (${m.xPts[xi].x.toFixed(2)}, ${m.xPts[xi].y.toFixed(2)}) ${Math.round(a * sc)}->${Math.round(b * sc)}`).join("; "));
  const LS = (opt("list") ?? "").split(",").filter(Boolean).map(Number);
  if (LS.length) console.log("  listed: " + rows.filter((r) => LS.includes(r[0])).map(([xi, a, b]) => `x${xi} ${Math.round(a * sc)}->${Math.round(b * sc)}`).join("; "));
  const better = rows.filter((r) => r[2] < r[1]).sort((u, v) => (v[1] - v[2]) - (u[1] - u[2])).slice(0, 5);
  if (better.length) console.log("  plateau better: " + better.map(([xi, a, b]) => `x${xi} ${Math.round(a * sc)}->${Math.round(b * sc)}`).join("; "));
}
