// phone_pass sheets (K156; K81's looks.mjs sheet code made generic): one PNG
// per look, base on the LEFT and head on the RIGHT of every pair, a colored
// bar over each column (blue = base, orange = head), pairs wrapped at 3200 px.
// Tall frames are box-averaged (area, integer factor) to at most 520 px high;
// junction crops are never scaled. A side that did not run is a dark red box
// the size of the other side. A pixel diff is made only for single shots of
// equal size (meaningful for pinned/frozen looks; a live page always differs).
// Library: composeSheet, diffImgs, makeSheets. CLI (remakes the sheets from
// <out>/looks_report.json): node sheet.mjs <config.json>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

export const BAR = { base: [70, 130, 230], head: [240, 150, 40] };
const BG = [40, 40, 48], MISSING = [78, 44, 44], RED = [255, 0, 0];
const GAP = 8, BARH = 10, MAXH = 520, WRAP = 3200;

export const readImg = (file) => toRGB(decodePNG(readFileSync(file)));

export function shrink(img, maxH = MAXH) {
  const f = Math.ceil(img.H / maxH);
  if (f <= 1) return img;
  const W = Math.floor(img.W / f), H = Math.floor(img.H / f), data = Buffer.alloc(W * H * 3), n = f * f;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let dy = 0; dy < f; dy++) {
          const row = ((y * f + dy) * img.W + x * f) * 3 + c;
          for (let dx = 0; dx < f; dx++) s += img.data[row + dx * 3];
        }
        data[(y * W + x) * 3 + c] = Math.round(s / n);
      }
    }
  }
  return { W, H, data };
}

function fill(buf, W, x0, y0, w, h, rgb) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const d = (y * W + x) * 3; buf[d] = rgb[0]; buf[d + 1] = rgb[1]; buf[d + 2] = rgb[2]; }
}
function blit(buf, W, img, ox, oy) {
  for (let y = 0; y < img.H; y++) img.data.copy(buf, ((oy + y) * W + ox) * 3, y * img.W * 3, (y + 1) * img.W * 3);
}

// cells: [{ a: base RGB image | null, b: head RGB image | null, crop?: true }]
// (crop = never scaled). Returns { W, H, pairs } and writes the PNG.
export function composeSheet(cells, file) {
  const blocks = cells.map((c) => {
    const a = c.a && (c.crop ? c.a : shrink(c.a)), b = c.b && (c.crop ? c.b : shrink(c.b));
    const wa = (a || b).W, wb = (b || a).W, h = Math.max(a ? a.H : 0, b ? b.H : 0) || (a || b).H;
    return { a, b, wa, wb, h, w: wa + GAP + wb, ht: BARH + h };
  });
  const rows = [[]];
  let x = GAP;
  for (const k of blocks) {
    if (x + k.w + GAP > WRAP && rows.at(-1).length) { rows.push([]); x = GAP; }
    rows.at(-1).push(k);
    x += k.w + GAP;
  }
  const rowW = (r) => r.reduce((s, k) => s + k.w + GAP, GAP);
  const W = Math.max(...rows.map(rowW)), H = rows.reduce((s, r) => s + Math.max(...r.map((k) => k.ht)) + GAP, GAP);
  const buf = Buffer.alloc(W * H * 3);
  fill(buf, W, 0, 0, W, H, BG);
  let y = GAP;
  for (const r of rows) {
    let ox = GAP;
    for (const k of r) {
      fill(buf, W, ox, y, k.wa, BARH, BAR.base);
      fill(buf, W, ox + k.wa + GAP, y, k.wb, BARH, BAR.head);
      if (k.a) blit(buf, W, k.a, ox, y + BARH); else fill(buf, W, ox, y + BARH, k.wa, k.h, MISSING);
      if (k.b) blit(buf, W, k.b, ox + k.wa + GAP, y + BARH); else fill(buf, W, ox + k.wa + GAP, y + BARH, k.wb, k.h, MISSING);
      ox += k.w + GAP;
    }
    y += Math.max(...r.map((k) => k.ht)) + GAP;
  }
  writeFileSync(file, encodePNG({ W, H, data: buf }));
  return { W, H, pairs: cells.length };
}

// Two same-size RGB images: differing pixels, the largest channel delta, the
// bounding box; a map (differences red over the dimmed frame) when file is given.
export function diffImgs(A, B, file) {
  if (A.W !== B.W || A.H !== B.H) return { sizeDiffers: `${A.W}x${A.H} vs ${B.W}x${B.H}` };
  let n = 0, maxD = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const map = Buffer.alloc(A.W * A.H * 3);
  for (let i = 0; i < A.W * A.H; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 3 + c] - B.data[i * 3 + c]));
    if (d) { n++; maxD = Math.max(maxD, d); const x = i % A.W, y = (i / A.W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let c = 0; c < 3; c++) map[i * 3 + c] = d ? RED[c] : A.data[i * 3 + c] >> 2;
  }
  if (n && file) writeFileSync(file, encodePNG({ W: A.W, H: A.H, data: map }));
  return { size: `${A.W}x${A.H}`, differingPx: n, maxDelta: maxD, bbox: n ? [x0, y0, x1, y1] : null };
}

// report = looks_report.json's object; outDir = the pass folder. Fills each
// look's `sheet` (path, or null when nothing ran), `order` (the pairs'
// names, left to right, top to bottom) and `diffs` (single shots only).
export function makeSheets(report, outDir) {
  for (const look of report.looks) {
    const base = look.runs.base?.shots || [], head = look.runs.head?.shots || [];
    const names = [...head.map((s) => s.name), ...base.map((s) => s.name).filter((n) => !head.some((s) => s.name === n))];
    const find = (list, n) => list.find((s) => s.name === n);
    const cells = [], diffs = {};
    for (const n of names) {
      const sb = find(base, n), sh = find(head, n), kind = (sh || sb).kind;
      const rd = (s) => (s && existsSync(join(outDir, s.file)) ? readImg(join(outDir, s.file)) : null);
      const a = rd(sb), b = rd(sh);
      cells.push({ a, b, crop: kind === "junction" });
      if (kind === "shot" && a && b) diffs[n] = diffImgs(a, b, join(outDir, "frames", look.name, `diff_${n}.png`));
    }
    look.diffs = diffs;
    look.order = names;
    look.sheet = null;
    if (cells.length) {
      const file = join(outDir, "sheets", `${look.name}.png`);
      mkdirSafe(file);
      look.sheet = file;
      look.sheetSize = composeSheet(cells, file);
    }
  }
  return report;
}

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
function mkdirSafe(file) { mkdirSync(dirname(file), { recursive: true }); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const f = join(cfg.out, "looks_report.json");
  const report = makeSheets(JSON.parse(readFileSync(f, "utf8")), cfg.out);
  writeFileSync(f, JSON.stringify(report, null, 1));
  for (const l of report.looks) console.log(`${l.name}: ${l.sheet ? `${l.sheet} (${l.sheetSize.W}x${l.sheetSize.H}, ${l.sheetSize.pairs} pairs)` : "no frames"}`);
}
