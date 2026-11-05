// K1139 Stage 2 (a): are the GPU's same-band seams compression ramps or
// jumps? For each GPU seam pair (dbg 5's G step > T, footIn on both, the
// CPU winner the same band on both) it reads that band's CPU tau on the
// pair and on the pairs either side along the same direction:
//   comp = |dtau| / pxW (tau's gradient along the step, 1 on a straight arm)
//   jump = |dtau| / max(|dtau| of the two flanking pairs) (about 1 on a ramp)
// and the CPU's own step of the band's v * cov on the pair.
//   node tauan.mjs <dumpDir> [phases=0-7] [ji]
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { decodePNG, toRGB } from "./png.mjs";

const DIR = process.argv[2];
const PH = (process.argv[3] ?? "0-7").split(",").flatMap((t) => {
  const m = /^(\d+)-(\d+)$/.exec(t);
  if (!m) return [Number(t)];
  const a = [];
  for (let k = Number(m[1]); k <= Number(m[2]); k++) a.push(k);
  return a;
});
const ONLY = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const NB = 4, PB = 9, PX = NB * PB + 10;
const T = (0.9 / 0.72) * meta.pxW * 255 + 2;
const img = (k, v) => {
  const p = join(DIR, `t${k}_${v}.png`);
  return existsSync(p) ? toRGB(decodePNG(readFileSync(p))) : null;
};
const hist = (arr, edges) => {
  const h = new Array(edges.length + 1).fill(0);
  for (const x of arr) {
    let b = 0;
    while (b < edges.length && x > edges[b]) b++;
    h[b]++;
  }
  return edges.map((e, i) => `<=${e}:${h[i]}`).concat(`>${edges[edges.length - 1]}:${h[edges.length]}`).join(" ");
};
for (const rc of meta.recs) {
  if (!rc.bands || !rc.bands.length) continue;
  if (ONLY && !ONLY.includes(rc.ji)) continue;
  const { w: BW, h: BH } = rc.box;
  const ox = rc.box.x - meta.clip.x * meta.dsf, oy = rc.box.y - meta.clip.y * meta.dsf;
  const nb = rc.bands.length;
  for (const k of PH) {
    const fu = join(DIR, `r${rc.ji}_t${k}.u8`);
    if (!existsSync(fu)) continue;
    const u8 = new Uint8Array(readFileSync(fu));
    const f32 = new Float32Array(new Uint8Array(readFileSync(join(DIR, `r${rc.ji}_t${k}.f32`))).buffer);
    const n = BW * BH;
    const win = new Int8Array(n), mc = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      win[i] = u8[i * PX + 45] - 1;
      let m = 0;
      for (let b = 0; b < nb; b++) m = Math.max(m, u8[i * PX + b * PB + 1]);
      mc[i] = m;
    }
    const gN = img(k, "n"), gW = img(k, "w"), gD = img(k, "d"), gDW = img(k, "dw");
    const at = (im, X, Y, c) => {
      const x = X + ox, y = Y + oy;
      if (!im || x < 0 || y < 0 || x >= im.W || y >= im.H) return -1;
      return im.data[(y * im.W + x) * 3 + c];
    };
    const foot = new Uint8Array(n);
    for (let Y = 0; Y < BH; Y++)
      for (let X = 0; X < BW; X++) {
        let d = 0;
        for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(at(gD, X, Y, c) - at(gDW, X, Y, c)), Math.abs(at(gN, X, Y, c) - at(gW, X, Y, c)));
        if (d > 0) foot[Y * BW + X] = 1;
      }
    const footIn = new Uint8Array(n), inner = new Uint8Array(n);
    for (let Y = 1; Y < BH - 1; Y++)
      for (let X = 1; X < BW - 1; X++) {
        let a = 1, b = 1;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!foot[(Y + dy) * BW + X + dx]) a = 0;
            if (mc[(Y + dy) * BW + X + dx] < 255) b = 0;
          }
        footIn[Y * BW + X] = a;
        inner[Y * BW + X] = b;
      }
    const tauOf = (i, b) => f32[(i * NB + b) * 2 + 1];
    const covOf = (i, b) => u8[i * PX + b * PB + 1];
    const vOf = (i, b) => u8[i * PX + b * PB];
    const comps = [], jumps = [], cpuSteps = [], gpuSteps = [];
    const perBand = {};
    let n0 = 0, mism = 0;
    const worst = [];
    for (let Y = 2; Y < BH - 2; Y++)
      for (let X = 2; X < BW - 2; X++) {
        const i = Y * BW + X;
        if (!inner[i] || !footIn[i]) continue;
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          const j = (Y + dy) * BW + X + dx;
          if (!inner[j] || !footIn[j]) continue;
          if (win[i] < 0 || win[i] !== win[j]) continue;
          const sg = Math.abs(at(gD, X, Y, 1) - at(gD, X + dx, Y + dy, 1));
          if (sg <= T) continue;
          n0++;
          const b = win[i];
          const im = (Y - dy) * BW + X - dx, jp = (Y + 2 * dy) * BW + X + 2 * dx;
          const dt = Math.abs(tauOf(j, b) - tauOf(i, b));
          const dl = covOf(im, b) > 0 ? Math.abs(tauOf(i, b) - tauOf(im, b)) : 0;
          const dr = covOf(jp, b) > 0 ? Math.abs(tauOf(jp, b) - tauOf(j, b)) : 0;
          const comp = dt / meta.pxW;
          const jump = dt / Math.max(1e-9, Math.max(dl, dr));
          const sc = Math.abs((vOf(i, b) * covOf(i, b)) / 255 - (vOf(j, b) * covOf(j, b)) / 255);
          comps.push(comp);
          jumps.push(jump);
          cpuSteps.push(sc);
          gpuSteps.push(sg);
          if (sc <= T) mism++;
          const pbk = (perBand[b] ??= { n: 0, maxComp: 0, maxJump: 0, maxG: 0 });
          pbk.n++;
          pbk.maxComp = Math.max(pbk.maxComp, +comp.toFixed(2));
          pbk.maxJump = Math.max(pbk.maxJump, +jump.toFixed(2));
          pbk.maxG = Math.max(pbk.maxG, sg);
          worst.push({ X, Y, dx, b, sg, sc: +sc.toFixed(1), comp: +comp.toFixed(2), jump: +jump.toFixed(2), tau: +tauOf(i, b).toFixed(3), d: +f32[(i * NB + b) * 2].toFixed(3) });
        }
      }
    worst.sort((a, b) => b.sg - a.sg);
    console.log(JSON.stringify({ ji: rc.ji, k, T: +T.toFixed(2), sameSeamsG: n0, cpuStepBelowT: mism, perBand }));
    console.log("  comp " + hist(comps, [1, 1.25, 1.56, 2, 3, 4, 6]));
    console.log("  jump " + hist(jumps, [1.25, 1.5, 2, 3, 5]));
    console.log("  cpu  " + hist(cpuSteps, [2, 4, T, 8, 12, 20]));
    console.log("  worst " + worst.slice(0, 6).map((w) => JSON.stringify(w)).join("\n        "));
  }
}
