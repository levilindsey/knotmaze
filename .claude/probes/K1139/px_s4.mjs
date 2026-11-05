// K1139 Stage 4 (4.2 task 5): per pixel of a box, the GPU's debug-5 G against the fan twin, the strip twin,
// the webs-off frame and cover_lib's composite, the sample kinds and the record (aRec) winning each sample.
//   node px_s4.mjs <dumpDir> <ji> <phase> <x0,x1,y0,y1>
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, composite, loadTwin, pickOrient, twinG, owners } from "./cover_lib.mjs";
const DIR = process.argv[2], JI = Number(process.argv[3]), K = Number(process.argv[4]);
const [x0, x1, y0, y1] = process.argv[5].split(",").map(Number);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const rc = meta.recs.find((r) => r.ji === JI);
const kinds = coverage(DIR, rc), po = pickOrient(DIR, meta, rc, kinds, [0, 1, 2, 3, 4, 5, 6, 7]);
const T = loadTwin(DIR, JI, K), C = composite(DIR, meta, rc, kinds, K, po.or, T);
const BW = rc.box.w;
const own = owners(DIR, rc, po.or);
// Which record owns the other-record samples: re-run coverage per record id.
const f = join(DIR, `r${JI}.tri.bin`), buf = readFileSync(f), TR = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const recs = new Map();
for (let t = 0; t < TR.length / 14; t++) { const r = TR[t * 14 + 11]; recs.set(r, (recs.get(r) ?? 0) + 1); }
console.log(`ji ${JI} rb ${rc.rb} t${K} orientation ${po.or}; records in the capture: ${[...recs.entries()].map(([r, n]) => `${r}:${n}`).join(" ")}`);
console.log("X Y | GPU G | fan twin G | strip twin G | webs-off G | composite G | samples none/fan/strip/other | aRec per sample");
for (let Y = y0; Y <= y1; Y++)
  for (let X = x0; X <= x1; X++) {
    const i = Y * BW + X;
    const c = [0, 1, 2, 3].map((j) => C.cnt[i * 4 + j]);
    console.log(`${X} ${Y} | ${C.gpuG[i]} | ${twinG(T, i).toFixed(1)} | ${T.s ? twinG(T.s, i).toFixed(1) : "-"} | ${C.at(C.gDW, X, Y, 1)} | ${C.G[i].toFixed(1)} | ${c.join("/")} | ${[0, 1, 2, 3].map((s) => own[i * 4 + s]).join(",")}`);
  }