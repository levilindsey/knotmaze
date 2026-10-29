// K1040 S1, question 5: the prototype's stray ink on muse_hash, against the
// reference. Reads the prototype's frame (`.claude/probes/K1040/out/
// muse_hash_dpr2.png`, F5) and rasters form B at the same camera and dpr 2.
// A pixel is DEEP when form B's top surface's exposed outline is more than
// W + 1 px away (Dexp); ink there is stray. Prototype ink = HSV value below
// half the paper's (the debug tint is blue, so luminance would misread it).
// Counts, over deep pixels: proto-only (a prototype defect), both (the
// definition inks there too), formB-only; then 8-connected blobs >= 4 px with
// world centroids, and a sheet of the largest blobs (prototype | form B).
// Run: npx vite-node .claude/probes/K1040/s1/q5.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN, TERM_NAMES } from "../../../../src/render/field/form_b";
import { decodePng, encodePng } from "../../../../test/render/field/png";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", "q5");
mkdirSync(outDir, { recursive: true });
const s = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/muse_hash.json", "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const img = decodePng(readFileSync(join(here, "..", "out", "muse_hash_dpr2.png")));
const DPR = 2;
const fb = new FormB(s, { dpr: DPR });
const [a, b, c, d, e, f] = s.camera.worldToCss;
const det = a * d - b * c;
const [vw, vh] = s.camera.viewport;
const nx = Math.round(vw * DPR);
const ny = Math.round(vh * DPR);
console.log(`image ${img.w}x${img.h}, raster ${nx}x${ny}`);
const world = (x: number, y: number): [number, number] => {
  const u = x / DPR - e;
  const v = y / DPR - f;
  return [(d * u - c * v) / det, (-b * u + a * v) / det];
};
const W = fb.W;
const ppu = fb.ppuDev;
const val = (i: number, j: number) => {
  const o = (j * img.w + i) * 4;
  return Math.max(img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]) / 255;
};
// Paper: the commonest HSV value.
const hist = new Uint32Array(256);
for (let j = 0; j < img.h; j += 3) for (let i = 0; i < img.w; i += 3) hist[Math.round(val(i, j) * 255)]++;
let paperV = 0;
for (let k = 1; k < 256; k++) if (hist[k] > hist[paperV]) paperV = k;
const dark = (i: number, j: number) => val(i, j) < (0.5 * paperV) / 255;
console.log(`paper value ${paperV}/255`);

const n = nx * ny;
const cls = new Uint8Array(n); // 1 proto-only, 2 both, 3 formB-only
const fbInk = new Float32Array(n);
const groupTop = new Uint8Array(n);
const counts = { deep: 0, protoOnly: 0, both: 0, formBOnly: 0, protoOnlyGroup: 0, bothGroup: 0, formBOnlyGroup: 0 };
const termBoth: Record<string, number> = {};
const termFB: Record<string, number> = {};
const t0 = Date.now();
for (let j = 0; j < ny; j++) {
  for (let i = 0; i < nx; i++) {
    const [x, y] = world(i + 0.5, j + 0.5);
    const r = fb.evalPoint(x, y);
    const o = j * nx + i;
    fbInk[o] = r.ink;
    const isGroup = r.top >= 0 && r.top < OWN;
    groupTop[o] = isGroup ? 1 : 0;
    if (r.top < 0 || !((r.Dexp - W) * ppu > 1)) continue;
    counts.deep++;
    const p = i < img.w && j < img.h && dark(i, j);
    const q = r.ink >= 0.5;
    const tk = `${r.term ? TERM_NAMES[r.term.kind] : "none"}${r.fade ? `+f${r.fade}` : ""}`;
    if (p && !q) {
      cls[o] = 1;
      counts.protoOnly++;
      if (isGroup) counts.protoOnlyGroup++;
    } else if (p && q) {
      cls[o] = 2;
      counts.both++;
      if (isGroup) counts.bothGroup++;
      termBoth[tk] = (termBoth[tk] ?? 0) + 1;
    } else if (q) {
      cls[o] = 3;
      counts.formBOnly++;
      if (isGroup) counts.formBOnlyGroup++;
      termFB[tk] = (termFB[tk] ?? 0) + 1;
    }
  }
}
console.log(`raster ${((Date.now() - t0) / 1000).toFixed(0)} s`, JSON.stringify(counts));
console.log(`both by form B term ${JSON.stringify(termBoth)}; formB-only by term ${JSON.stringify(termFB)}`);

// Blobs per class.
const seen = new Uint8Array(n);
const blobs: { c: number; px: number; i: number; j: number; at: [number, number]; group: number }[] = [];
for (let o0 = 0; o0 < n; o0++) {
  if (!cls[o0] || seen[o0]) continue;
  const c0 = cls[o0];
  const st = [o0];
  seen[o0] = 1;
  let px = 0;
  let si = 0;
  let sj = 0;
  let grp = 0;
  while (st.length) {
    const o = st.pop() as number;
    px++;
    const i = o % nx;
    const j = (o - i) / nx;
    si += i;
    sj += j;
    grp += groupTop[o];
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ii = i + di;
        const jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const q = jj * nx + ii;
        if (!seen[q] && cls[q] === c0) {
          seen[q] = 1;
          st.push(q);
        }
      }
  }
  if (px < 4) continue;
  const ci = si / px;
  const cj = sj / px;
  const [x, y] = world(ci, cj);
  blobs.push({ c: c0, px, i: Math.round(ci), j: Math.round(cj), at: [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000], group: Math.round((100 * grp) / px) });
}
const names = ["", "protoOnly", "both", "formBOnly"];
const byClass: Record<string, { blobs: number; px: number }> = {};
for (const bl of blobs) {
  const k = names[bl.c];
  byClass[k] ??= { blobs: 0, px: 0 };
  byClass[k].blobs++;
  byClass[k].px += bl.px;
}
console.log(`blobs >= 4 px: ${JSON.stringify(byClass)}`);
blobs.sort((x, y) => y.px - x.px);
const top = blobs.slice(0, 12);
for (const bl of top) console.log(`  ${names[bl.c]} ${bl.px} px at world (${bl.at.join(", ")}) px (${bl.i}, ${bl.j}), ${bl.group}% group top`);

// Sheet: per blob, the prototype crop | form B's ink (dark = ink) | classes.
const C = 96;
const cols = 3;
const rows = Math.min(8, top.length);
const SW = cols * C + (cols - 1) * 4;
const SH = rows * (C + 4);
const sheet = new Uint8Array(SW * SH * 4).fill(255);
for (let r = 0; r < rows; r++) {
  const bl = top[r];
  for (let y = 0; y < C; y++)
    for (let x = 0; x < C; x++) {
      const i = bl.i - C / 2 + x;
      const j = bl.j - C / 2 + y;
      if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
      const put = (col: number, rr: number, gg: number, bb: number) => {
        const o = ((r * (C + 4) + y) * SW + col * (C + 4) + x) * 4;
        sheet[o] = rr;
        sheet[o + 1] = gg;
        sheet[o + 2] = bb;
        sheet[o + 3] = 255;
      };
      if (i < img.w && j < img.h) {
        const po = (j * img.w + i) * 4;
        put(0, img.rgba[po], img.rgba[po + 1], img.rgba[po + 2]);
      }
      const g = Math.round(255 * (1 - fbInk[j * nx + i]));
      put(1, g, g, g);
      const k = cls[j * nx + i];
      if (k === 1) put(2, 220, 40, 40);
      else if (k === 2) put(2, 140, 0, 200);
      else if (k === 3) put(2, 30, 120, 255);
      else put(2, g, g, g);
    }
}
writeFileSync(join(outDir, "sheet.png"), encodePng(SW, SH, sheet));
writeFileSync(join(outDir, "result.json"), JSON.stringify({ paperV, counts, termBoth, termFB, byClass, top }, null, 1));
console.log("sheet: rows = the largest blobs; columns = prototype | form B ink | class (red proto-only, purple both, blue formB-only)");
