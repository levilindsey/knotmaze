// K1407 c3: per spot, the pixels where two crop sets differ (any channel by more than T levels), their max level
// difference and bounding box, and a diff image (red where they differ) per changed spot.
//   node scripts/run_node.mjs .claude/probes/K1407/k1407c3_diff.ts <dirA> <dirB> <spots> [T=8] [sfx=gf] [outDir]
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { writePng } from "../K1314/k1314_crops.ts";

const [dA, dB, list, ts, sfx0, outDir] = process.argv.slice(2);
const T = ts ? +ts : 8; const sfx = sfx0 || "gf"; const P = 480;
if (outDir) mkdirSync(outDir, { recursive: true });
for (const s of list.split(",")) {
  const [nm, x, y] = s.split(":"); const base = `${nm}_${(+x).toFixed(2)}_${(+y).toFixed(2)}_${sfx}.bin`;
  const fa = `${dA}/${base}`, fb = `${dB}/${base}`;
  if (!existsSync(fa) || !existsSync(fb)) { console.log(`${s}  missing ${existsSync(fa) ? "" : "A "}${existsSync(fb) ? "" : "B"}`); continue; }
  const a = readFileSync(fa), b = readFileSync(fb);
  let n = 0, mx = 0, c0 = P, c1 = -1, r0 = P, r1 = -1;
  const img = new Uint8Array(P * P * 3);
  for (let i = 0; i < P * P; i++) {
    const d = Math.max(Math.abs(a[3 * i] - b[3 * i]), Math.abs(a[3 * i + 1] - b[3 * i + 1]), Math.abs(a[3 * i + 2] - b[3 * i + 2]));
    const g = (a[3 * i] + a[3 * i + 1] + a[3 * i + 2]) / 6 + 64;
    img[3 * i] = g; img[3 * i + 1] = g; img[3 * i + 2] = g;
    if (d > T) {
      n++; if (d > mx) mx = d; const c = i % P, r = Math.floor(i / P);
      if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r;
      img[3 * i] = 255; img[3 * i + 1] = 0; img[3 * i + 2] = 0;
    }
  }
  console.log(`${s}  diff ${n} px  max ${mx}${n ? `  box c${c0}-${c1} r${r0}-${r1}` : ""}`);
  if (outDir && n) writePng(`${outDir}/${base.replace(".bin", "_diff.png")}`, img, P, P);
}
