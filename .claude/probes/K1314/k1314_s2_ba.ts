// K1314 s2: form B | before | after from two k1314_crops.ts directories rendered at the same spots.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s2_ba.ts --before=<dir> --after=<dir> --out=<dir>
// Pairs the two manifests in order; each row is the after crop's form B, the before crop's rp=outline and
// the after crop's rp=outline. Writes <out>/<file> and <out>/manifest.json (labels from the after crops)
// for k1314_sheet.ps1 (whose header still reads "form B | today | rp=outline": read it as form B | before | after).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readPng, writePng } from "./k1314_crops";

const args = process.argv.slice(2);
const opt = (k: string): string => { const v = args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3); if (!v) throw new Error(`--${k}= needed`); return v; };
const bDir = opt("before"); const aDir = opt("after"); const out = opt("out");
mkdirSync(out, { recursive: true });
type M = { n: number; file: string; kind: string; label: string };
const bm = JSON.parse(readFileSync(join(bDir, "manifest.json"), "utf8")) as M[];
const am = JSON.parse(readFileSync(join(aDir, "manifest.json"), "utf8")) as M[];
if (bm.length !== am.length) throw new Error(`before has ${bm.length} crops, after ${am.length}`);
const man: M[] = [];
for (let k = 0; k < am.length; k++) {
  const B = readPng(join(bDir, bm[k].file)); const A = readPng(join(aDir, am[k].file));
  if (B.W !== A.W || B.H !== A.H) throw new Error(`${am[k].file}: sizes differ`);
  const Wt = A.W; const P = (Wt - 8) / 3; const H = A.H; const bpA = A.px.length / (Wt * H); const bpB = B.px.length / (Wt * H);
  const px = new Uint8Array(Wt * H * 3).fill(255);
  const copy = (src: Uint8Array, bp: number, from: number, to: number): void => {
    for (let r = 0; r < H; r++) for (let c = 0; c < P; c++) {
      const s = bp * (r * Wt + from * (P + 4) + c); const d = 3 * (r * Wt + to * (P + 4) + c);
      px[d] = src[s]; px[d + 1] = src[s + 1]; px[d + 2] = src[s + 2];
    }
  };
  copy(A.px, bpA, 0, 0); copy(B.px, bpB, 2, 1); copy(A.px, bpA, 2, 2);
  writePng(join(out, am[k].file), px, Wt, H);
  man.push({ ...am[k], label: am[k].label + " (form B | before | after)" });
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(man, null, 1));
console.log(`${man.length} rows -> ${out}`);
