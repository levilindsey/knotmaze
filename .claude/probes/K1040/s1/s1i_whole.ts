// K1114 S1i: the whole scene's ink at rest, S1f's final against today,
// restored and restored without the root gate, on the 12 K868 scenes at dpr 2
// (every device px over the chains' bounds + 2h). Per form: the px whose ink
// differs from S1f's by more than 0.02, and by more than 0.5 (lost: less ink,
// gained: more), how far the differing px lie from S1f's 0.5 contour (device
// px, 4-connected, as s1i_sites.ts: the largest and the count beyond 3 px),
// and the 4h cells with the most differing px.
// Run: npx.cmd vite-node .claude/probes/K1040/s1/s1i_whole.ts [scene,...]
//   (writes out/s1i/whole.txt, or whole_<TAG>.txt with env TAG; env SKIP_RB0=1
//   leaves out the rootBand 0 form)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type FormBParams } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", "s1i");
mkdirSync(outDir, { recursive: true });
const SCENES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const names = process.argv[2] ? process.argv[2].split(",") : ALL;
const S1F: FormBParams = { dEdge: "skip", rootBand: 0 };
const FORMS: [string, FormBParams][] = [
  ["today (dEdgeTip 0)", { dEdgeTip: 0 }],
  ["restored (S1i)", {}],
  ["restored, rootBand 0", { rootBand: 0 }],
];
if (process.env.SKIP_RB0) FORMS.pop();
/** Each px's 4-connected distance (px) to S's 0.5 contour (a px on either side of a crossing). */
function contourDist(s: Float32Array, nx: number, ny: number): Int32Array {
  const D = new Int32Array(nx * ny).fill(1 << 30);
  const q: number[] = [];
  const nbs = (k: number): number[] => {
    const i = k % nx;
    const j = (k - i) / nx;
    return [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1];
  };
  for (let k = 0; k < nx * ny; k++) {
    const a = s[k] >= 0.5;
    if (nbs(k).some((m) => m >= 0 && s[m] >= 0.5 !== a)) {
      D[k] = 0;
      q.push(k);
    }
  }
  for (let h = 0; h < q.length; h++) {
    const k = q[h];
    for (const m of nbs(k))
      if (m >= 0 && D[m] > D[k] + 1) {
        D[m] = D[k] + 1;
        q.push(m);
      }
  }
  return D;
}
const DPR = 2;
const f = (v: number, d = 3) => v.toFixed(d);
const out: string[] = [];
const log = (s: string) => {
  out.push(s);
  console.log(s);
};
log(`form B's ink over each whole scene at dpr ${DPR}, against S1f's final ${JSON.stringify(S1F)}; differ = |Δink| > 0.02, lost / gained = by more than 0.5`);
const tot = FORMS.map(() => ({ differ: 0, lost: 0, gained: 0, maxD: 0, far3: 0 }));
for (const name of names) {
  const sc = JSON.parse(readFileSync(`${SCENES}/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const t0 = Date.now();
  const S = new FormB(sc, { dpr: DPR, ...S1F });
  const h = S.h;
  const px = 1 / S.ppuDev;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of sc.chains)
    for (let i = 0; i < c.pts.length; i += 2) {
      x0 = Math.min(x0, c.pts[i]);
      x1 = Math.max(x1, c.pts[i]);
      y0 = Math.min(y0, c.pts[i + 1]);
      y1 = Math.max(y1, c.pts[i + 1]);
    }
  x0 -= 2 * h;
  y0 -= 2 * h;
  x1 += 2 * h;
  y1 += 2 * h;
  const nx = Math.ceil((x1 - x0) / px);
  const ny = Math.ceil((y1 - y0) / px);
  const raster = (fb: FormB): Float32Array => {
    const ink = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) ink[j * nx + i] = fb.evalPoint(x0 + (i + 0.5) * px, y0 + (j + 0.5) * px).ink;
    return ink;
  };
  const iS = raster(S);
  const D = contourDist(iS, nx, ny);
  log(`== ${name}: ${nx} x ${ny} px, h ${f(h)} world = ${f(h * S.ppuDev, 2)} px`);
  FORMS.forEach(([label, P], k) => {
    const iF = raster(new FormB(sc, { dpr: DPR, ...P }));
    let differ = 0;
    let lost = 0;
    let gained = 0;
    let maxD = 0;
    let far3 = 0;
    const cell = 4 * h;
    const cells = new Map<string, number>();
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const d = iF[j * nx + i] - iS[j * nx + i];
        if (Math.abs(d) <= 0.02) continue;
        differ++;
        if (d < -0.5) lost++;
        if (d > 0.5) gained++;
        const dd = D[j * nx + i] >= 1 << 30 ? 999 : D[j * nx + i];
        if (dd > maxD) maxD = dd;
        if (dd > 3) far3++;
        const key = `${Math.floor(((i + 0.5) * px) / cell)},${Math.floor(((j + 0.5) * px) / cell)}`;
        cells.set(key, (cells.get(key) ?? 0) + 1);
      }
    tot[k].differ += differ;
    tot[k].lost += lost;
    tot[k].gained += gained;
    tot[k].maxD = Math.max(tot[k].maxD, maxD);
    tot[k].far3 += far3;
    const top = [...cells.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, n]) => {
        const [ci, cj] = key.split(",").map(Number);
        return `(${f(x0 + (ci + 0.5) * cell, 2)}, ${f(y0 + (cj + 0.5) * cell, 2)}) ${n}`;
      });
    log(`  ${label.padEnd(22)} differ ${String(differ).padStart(6)} (lost ${lost}, gained ${gained}; max ${maxD} px from S1f's contour, ${far3} beyond 3 px)${top.length ? `; 4h cells: ${top.join(", ")}` : ""}`);
  });
  log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
log(`== all: ${FORMS.map(([label], k) => `${label} differ ${tot[k].differ} (lost ${tot[k].lost}, gained ${tot[k].gained}; max ${tot[k].maxD} px, ${tot[k].far3} beyond 3 px)`).join("; ")}`);
writeFileSync(join(outDir, process.env.TAG ? `whole_${process.env.TAG}.txt` : "whole.txt"), out.join("\n") + "\n");
