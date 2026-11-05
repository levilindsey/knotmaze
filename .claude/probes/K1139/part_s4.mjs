// K1139 Stage 4 (4.2 task 6): ji 149's yellow/teal boundary, offline. Per box
// pixel along a line: each band's e = (reach - dnow)/pxW, cov; the drawing
// band's yield to the shared gold, 1 - smoothstep(0, 3 pxW, D_draw -
// D_shared) (rule (c), junction_field.ts:406); the twin's out RGB and the
// GPU's n-frame RGB.
//   node part_s4.mjs <dumpDir> <ji> <phase> <X0,Y0,X1,Y1> [n=12]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadTwin, img, NB, PB, PX } from "./cover_lib.mjs";
const [DIR, JI, K, LN, NS = "12"] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const rc = meta.recs.find((r) => r.ji === Number(JI));
const T = loadTwin(DIR, rc.ji, Number(K));
const gN = img(DIR, Number(K), "n");
const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
const REACH = meta.fh + 0.5 * meta.pxW, PXW = meta.pxW;
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const [X0, Y0, X1, Y1] = LN.split(",").map(Number);
console.log(`ji ${rc.ji} t${K}: bands ${rc.bands.map((b, i) => `${i}: ia ${b.ia} ib ${b.ib}${b.shared > 0.5 ? " shared" : ""}`).join(", ")}; reach ${(REACH / PXW).toFixed(2)} px`);
for (let j = 0; j <= Number(NS); j++) {
  const X = Math.round(X0 + ((X1 - X0) * j) / Number(NS)), Y = Math.round(Y0 + ((Y1 - Y0) * j) / Number(NS));
  const i = Y * rc.box.w + X, o = i * PX;
  let dS = 1e20;
  rc.bands.forEach((b, bi) => { if (b.shared > 0.5) dS = Math.min(dS, T.f32[(i * NB + bi) * 2]); });
  const parts = rc.bands.map((b, bi) => {
    const D = T.f32[(i * NB + bi) * 2];
    const y = b.shared > 0.5 ? "" : ` yield ${(1 - ss(0, 3 * PXW, D - dS)).toFixed(2)} (D-Dsh ${((D - dS) / PXW).toFixed(2)} px)`;
    return `b${bi} e ${((REACH - D) / PXW).toFixed(2)} cov ${T.u8[o + bi * PB + 1]}${y}`;
  });
  const g = gN ? [0, 1, 2].map((c) => gN.data[((Y + oy) * gN.W + X + ox) * 3 + c]) : [];
  console.log(`(${X},${Y}) ${parts.join(" | ")} | win b${T.u8[o + 45] - 1} twin ${[42, 43, 44].map((c) => T.u8[o + c]).join(",")} GPU ${g.join(",")}`);
}
