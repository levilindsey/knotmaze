// K1040 S1h (K1114): the pictures. For each site of s1h_sites.ts
// (out/s1h/sites.json) a before/after pair of form B's ink, the same scene,
// centre and scale, dpr 2, at two sizes:
//   - play size (zoom 1): +-8h around the corner's V, one picture px per device px;
//   - zoom 4: +-3.5h around V, each device px a 4 x 4 block (b_crop.ts's zoom).
// before = S1f's final (form_b_s1f_q.ts, frozen); after = today's defaults
// (src/render/field/form_b.ts: dEdge "near", rootBand 0.5). Panels: before,
// after, and |d ink| (red on a faint grey of the larger ink). Greyscale is
// 255 (1 - ink), as b_crop.ts draws it. A tick in the margin marks V's x and y
// (nothing is drawn over the pixels). Scenes get look.ctrlArc ??= 0.47.
// Also writes sheet.png (every pair at zoom 4, labelled), index.md, and
// pairs.txt (the per-site numbers: pixels that differ, their bounding box in h
// from V, the F1 and F2 shares, the equivalence check of
// FormB({dEdge: "skip", rootBand: 0}) against the frozen form over the window).
// Run (after s1h_sites.ts): npx vite-node .claude/probes/K1040/s1/s1h_pair.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { FormB as FormBOld } from "./form_b_s1f_q";
import { encodePng } from "../../../../test/render/field/png";
import type { Site } from "./s1h_sites";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", "s1h");
mkdirSync(outDir, { recursive: true });
const SCENES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const DPR = 2;
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : v > 0 ? "inf" : String(v));

// ---------------------------------------------------------------- bitmap text
// A 5 x 7 font: [first row, ...rows]; a row's bit 4 is the leftmost column.
const FONT: Record<string, number[]> = {
  "0": [0, 0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0, 0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0, 0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0, 0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0, 0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0, 0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0, 0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0, 0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0, 0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0, 0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  A: [0, 0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0, 0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0, 0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0, 0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0, 0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0, 0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0, 0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0, 0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0, 0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0, 0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0, 0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0, 0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0, 0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  O: [0, 0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0, 0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0, 0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0, 0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0, 0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0, 0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0, 0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0, 0x11, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04],
  Z: [0, 0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [2, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0, 0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x1e],
  c: [2, 0x0e, 0x11, 0x10, 0x11, 0x0e],
  d: [0, 0x01, 0x01, 0x0d, 0x13, 0x11, 0x11, 0x0f],
  e: [2, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0, 0x06, 0x09, 0x08, 0x1c, 0x08, 0x08, 0x08],
  g: [2, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0, 0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x11],
  i: [0, 0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0, 0x02, 0x00, 0x06, 0x02, 0x02, 0x02, 0x12, 0x0c],
  k: [0, 0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [2, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [2, 0x16, 0x19, 0x11, 0x11, 0x11],
  o: [2, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [2, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10],
  q: [2, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x01],
  r: [2, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [2, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0, 0x08, 0x08, 0x1c, 0x08, 0x08, 0x09, 0x06],
  u: [2, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [2, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [2, 0x11, 0x11, 0x15, 0x15, 0x0a],
  x: [2, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [2, 0x11, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [2, 0x1f, 0x02, 0x04, 0x08, 0x1f],
  ".": [5, 0x0c, 0x0c],
  ",": [5, 0x0c, 0x04, 0x08],
  ":": [0, 0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c],
  ";": [0, 0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x04, 0x08],
  "-": [3, 0x1f],
  "+": [0, 0x00, 0x04, 0x04, 0x1f, 0x04, 0x04],
  "=": [2, 0x1f, 0x00, 0x1f],
  ">": [0, 0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "<": [0, 0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  "/": [0, 0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "(": [0, 0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0, 0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "[": [0, 0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  "]": [0, 0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
  _: [7, 0x1f],
  "#": [0, 0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "%": [0, 0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  "|": [0, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  "*": [0, 0x00, 0x04, 0x15, 0x0e, 0x15, 0x04],
  "'": [0, 0x04, 0x04, 0x08],
  "!": [0, 0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0, 0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
};
interface Canvas {
  w: number;
  h: number;
  d: Uint8Array;
}
const canvas = (w: number, h: number, bg = 255): Canvas => ({ w, h, d: new Uint8Array(w * h * 4).fill(bg) });
const setPx = (cv: Canvas, x: number, y: number, c: [number, number, number]) => {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const o = (y * cv.w + x) * 4;
  cv.d[o] = c[0];
  cv.d[o + 1] = c[1];
  cv.d[o + 2] = c[2];
  cv.d[o + 3] = 255;
};
const rect = (cv: Canvas, x: number, y: number, w: number, h: number, c: [number, number, number]) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(cv, x + i, y + j, c);
};
const CW = 6; // advance, in glyph px
const LH = 10; // line height, in glyph px
function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: [number, number, number] = [0, 0, 0]) {
  for (let k = 0; k < s.length; k++) {
    const g = FONT[s[k]];
    const gx = x + k * CW * scale;
    if (s[k] === " ") continue;
    if (!g) {
      rect(cv, gx, y, 5 * scale, 7 * scale, [200, 0, 0]);
      continue;
    }
    for (let r = 1; r < g.length; r++)
      for (let b = 0; b < 5; b++) if (g[r] & (0x10 >> b)) rect(cv, gx + b * scale, y + (g[0] + r - 1) * scale, scale, scale, c);
  }
}
function wrap(s: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const wd of s.split(" ")) {
    if (cur && cur.length + 1 + wd.length > maxChars) {
      lines.push(cur);
      cur = wd;
    } else cur = cur ? cur + " " + wd : wd;
  }
  if (cur) lines.push(cur);
  return lines;
}
/** ASCII for the bitmap font: the lines may carry Greek and arrows in the markdown. */
const ascii = (s: string) => s.replace(/θ/g, "theta").replace(/ω/g, "omega").replace(/→/g, "->").replace(/[^\x20-\x7e]/g, "?");

// ---------------------------------------------------------------- forms and windows
interface Ev {
  h: number;
  ppuDev: number;
  evalPoint(x: number, y: number): { ink: number; top: number };
}
interface Forms {
  O: Ev;
  N: Ev;
  N0: Ev;
  S: Ev;
  h: number;
  ppu: number;
  hdev: number;
}
const formCache = new Map<string, Forms>();
function formsOf(name: string): Forms {
  let r = formCache.get(name);
  if (r) return r;
  const sc = JSON.parse(readFileSync(`${SCENES}/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const O = new FormBOld(sc, { dpr: DPR }) as unknown as Ev;
  const N = new FormB(sc, { dpr: DPR }) as unknown as Ev;
  const N0 = new FormB(sc, { dpr: DPR, rootBand: 0 }) as unknown as Ev;
  const S = new FormB(sc, { dpr: DPR, dEdge: "skip", rootBand: 0 }) as unknown as Ev;
  r = { O, N, N0, S, h: O.h, ppu: N.ppuDev, hdev: O.h * N.ppuDev };
  formCache.set(name, r);
  return r;
}
interface Win {
  n: number;
  zoom: number;
  /** The grid's world origin and pitch (one device px). */
  x0: number;
  y0: number;
  px: number;
  /** V in grid px (fractional). */
  vx: number;
  vy: number;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function windowOf(fm: Forms, X: number, Y: number, kind: "z1" | "z4"): Win {
  const n = kind === "z1" ? clamp(Math.round(16 * fm.hdev), 160, 400) : clamp(Math.round(7 * fm.hdev), 80, 160);
  const x0 = Math.round(X * fm.ppu - n / 2) / fm.ppu;
  const y0 = Math.round(Y * fm.ppu - n / 2) / fm.ppu;
  return { n, zoom: kind === "z1" ? 1 : 4, x0, y0, px: 1 / fm.ppu, vx: (X - x0) * fm.ppu, vy: (Y - y0) * fm.ppu };
}
function inkOf(form: Ev, w: Win): { ink: Float32Array } {
  const ink = new Float32Array(w.n * w.n);
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) ink[j * w.n + i] = form.evalPoint(w.x0 + (i + 0.5) * w.px, w.y0 + (j + 0.5) * w.px).ink;
  return { ink };
}

// ---------------------------------------------------------------- panels
function blitGrey(cv: Canvas, ink: Float32Array, w: Win, ox: number, oy: number) {
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) {
      const g = Math.round(255 * (1 - ink[j * w.n + i]));
      rect(cv, ox + i * w.zoom, oy + j * w.zoom, w.zoom, w.zoom, [g, g, g]);
    }
}
/** The signed difference, after minus before: red where the after has more ink, blue where it has less,
 * over a faint grey of the larger of the two inks (nothing differs by more than 0.004 in the grey). */
function blitDiff(cv: Canvas, a: Float32Array, b: Float32Array, w: Win, ox: number, oy: number) {
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) {
      const k = j * w.n + i;
      const d = b[k] - a[k];
      const base = 255 - Math.round(60 * Math.max(a[k], b[k]));
      let c: [number, number, number] = [base, base, base];
      if (Math.abs(d) > 0.004) {
        const t = Math.min(1, Math.abs(d) * 1.5);
        const lo = Math.round(base * (1 - t));
        c = d > 0 ? [255, lo, lo] : [lo, lo, 255];
      }
      rect(cv, ox + i * w.zoom, oy + j * w.zoom, w.zoom, w.zoom, c);
    }
}
/** The marker ticks in the margins: V's x above the panel and V's y left of it. */
function ticks(cv: Canvas, w: Win, ox: number, oy: number, t = 1) {
  const red: [number, number, number] = [230, 0, 0];
  rect(cv, ox + Math.round(w.vx * w.zoom) - t, oy - 6 * t - 3, 2 * t, 6 * t, red);
  rect(cv, ox - 6 * t - 3, oy + Math.round(w.vy * w.zoom) - t, 6 * t, 2 * t, red);
}
/** A 1 px grey frame just outside the panel, so the window's edge shows against the paper. */
function frame(cv: Canvas, ox: number, oy: number, P: number) {
  const g: [number, number, number] = [150, 150, 150];
  rect(cv, ox - 1, oy - 1, P + 2, 1, g);
  rect(cv, ox - 1, oy + P, P + 2, 1, g);
  rect(cv, ox - 1, oy, 1, P, g);
  rect(cv, ox + P, oy, 1, P, g);
}

// ---------------------------------------------------------------- stats
interface Stats {
  n: number;
  differ: number;
  lost: number;
  gained: number;
  area: number;
  f1: number;
  f2: number;
  bbox: [number, number, number, number] | null;
  eqBad: number;
}
function statsOf(o: Float32Array, nn: Float32Array, n0: Float32Array, s: Float32Array, w: Win, h: number, ppu: number): Stats {
  let differ = 0;
  let lost = 0;
  let gained = 0;
  let area = 0;
  let f1 = 0;
  let f2 = 0;
  let eqBad = 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) {
      const k = j * w.n + i;
      const d = nn[k] - o[k];
      area += d;
      if (Math.abs(s[k] - o[k]) > 1e-6) eqBad++;
      if (Math.abs(n0[k] - o[k]) > 0.02) f1++;
      if (Math.abs(nn[k] - n0[k]) > 0.02) f2++;
      if (Math.abs(d) > 0.02) {
        differ++;
        if (d < -0.5) lost++;
        if (d > 0.5) gained++;
        const dx = (i + 0.5 - w.vx) / ppu / h;
        const dy = (j + 0.5 - w.vy) / ppu / h;
        x0 = Math.min(x0, dx);
        x1 = Math.max(x1, dx);
        y0 = Math.min(y0, dy);
        y1 = Math.max(y1, dy);
      }
    }
  return { n: w.n, differ, lost, gained, area, f1, f2, bbox: differ ? [x0, x1, y0, y1] : null, eqBad };
}
const bboxText = (b: Stats["bbox"]) => (b ? `x ${f(b[0], 2)}..${f(b[1], 2)}h, y ${f(b[2], 2)}..${f(b[3], 2)}h` : "none");

// ---------------------------------------------------------------- the sites
const sites = JSON.parse(readFileSync(join(outDir, "sites.json"), "utf8")) as Site[];
const GROUPS: Record<string, string> = {
  "F1-lost": "F1: fill emptied",
  "F1-j62": "F1: K1114's fifth site",
  "F2-r": "F2: a largest r move",
  "extra-tip": "extra: a largest tip move",
};
/** One line per site: what differs between the before and the after in the zoom 4 window, written from looking at
 * the pictures (the zoom 4 pictures, plus zoom 6-8 crops of the same windows). It describes, it does not judge. */
const SEEN: Record<string, string> = {
  "muse_hash/j0/0-1":
    "46 px, all at the end of the thread whose tip sits at V: a rounded cap with a one-pixel spur before, a slanted flat cut after (red above it, blue at its left). The grey wedge left of V is identical.",
  "muse_hash/j36/109-110":
    "Before, the thread arriving from the upper right turns into the left-going thread through a large rounded black web (blue wedge). After, it runs straight down-left and meets the left-going thread at an acute angle (red wedge on its lower-right side), and paper fills the web's place.",
  "muse_hash/j155/471-472":
    "A small closed eye (site 04 is the same eye): its left end gets a nick after (a notch with a slanted flat cut), and its right end's outer edge moves out 1 to 3 px (red crescent).",
  "muse_hash/j156/475-473":
    "The same eye as site 03 (the same 112 px in the zoom 4 window): a nick at its left end, its right end's outer edge moved out 1 to 3 px. The play-size window adds F1 changes at other corners (144 px in all).",
  "muse_hash/j62/189-187":
    "One thread's curved run just below V (about 1.7h long) moves up by 1 to 3 px, mostly 2 to 3 (measured along columns): ink gained along its upper edge (red), lost along its lower edge (blue). Its width does not change.",
  "muse_default_tw/j57/172-173":
    "A crescent 1 px wide and about 1h long at the thread's bend at V: ink lost along the upper-right edge, gained along the lower-left edge (the bend moves about 1 px toward the lower left).",
  "muse_hash/j23/72-70":
    "A crescent 1 to 2 px wide and about 1.3h long at the thread's bend at V: ink gained along the upper-right edge, lost along the lower-left edge (the bend moves about 1 to 2 px toward the upper right).",
  "muse_hash/j110/335-333":
    "A crescent about 1h long at the thread's bend at V: ink lost along its upper edge, gained along its lower edge (the outline moves about 1 px down). The play-size window adds 190 px of F1 changes at other corners (230 px in all).",
  "muse_default_tw/j110/335-333":
    "A crescent about 1h long at the thread's bend at V: ink lost along its upper edge, gained along its lower edge (the outline moves about 1 px down). The play-size window adds F2 changes at other corners (83 px in all).",
  "muse_default_tw/j164/499-497":
    "A crescent about 1.2h long along the thread's bend at V: ink lost along its left edge, gained along its right edge (the bend moves about 1 to 2 px to the right).",
  "muse_hash/j57/172-173":
    "A crescent about 1h long at the thread's bend at V: ink lost along the upper-right edge, gained along the lower-left edge (the bend moves about 1 px toward the lower left).",
  "g41_user_tw64/j12/36-37":
    "A short jog in the thread at V, which is smooth before: after, the outline steps by 1 to 2 px over about 0.5h (ink lost on the upper edge, gained on the lower edge).",
  "user_tw42.lightpaper/j49/151-152":
    "A short jog in the thread at V, which is smooth before: after, the outline steps sideways by about 1 px over about 0.5h (ink gained on the left edge, lost on the right edge).",
  "g41_user_tw42/j49/151-152":
    "The same corner as site 13 with the same numbers (24 px, the same window), in another scene file.",
  "muse_hash/j124/375-376":
    "A short jog in the thread's left outline at V, which is smooth before: after, a notch of about 2 px over about 0.5h (ink gained on the left edge, lost on the right edge).",
  "muse_hash/j131/397-398":
    "The thread below V: before, a wide smooth arc with clear paper between it and V's fillet tip; after, it rises into a hump about 2.6h wide that peaks at V's tip (red, up to 13 px or 0.8h higher, measured along columns) and the old arc under the hump is gone (blue). The largest change of the 18.",
  "muse_hash/j99/301-299":
    "A thread's run at V's left, about 2h long, moves right by 1 to 7 px, most (0.4h) at V's row (measured along rows): blue wedge at its old place, red wedge at its new one. The dark wedge that hugs the thread at V in the before is a light grey fade in the after.",
  "muse_hash/j73/222-220":
    "Two places. The small eye just below V: its right end, pointed with a slit through the outline before, is closed and rounded after (red in the slit and above the end, blue along its right and lower-right edge). About 2.7h above V: a thread tip's outer edge gains 1 to 2 px (a small red crescent about 8 px across).",
};
const filledOf = (c: { r: number; omega: number }) => c.r > 1e-9 && c.omega > 1e-9;
const noInf = (s: string) => s.replace(/Infinityh/g, "inf");
function changeText(s: Site): string {
  const h = s.h;
  const parts: string[] = [];
  if (filledOf(s.old) && !filledOf(s.now)) parts.push(`fill emptied: r ${f(s.old.r / h)}h -> 0${s.vanished ? " (no corner in the defaults)" : ""}`);
  else parts.push(`r ${f(s.old.r / h)}h -> ${f(s.now.r / h)}h`);
  parts.push(`tip move ${f(s.tipMove / h)}h (F1 ${f(s.f1TipMove / h)}h, F2 ${f(s.f2TipMove / h)}h)`);
  for (const a of s.armsMoved) parts.push(noInf(a));
  return parts.join("; ");
}
const nn2 = (v: number) => String(v).padStart(2, "0");
interface Done {
  s: Site;
  idx: number;
  z1: Stats;
  z4: Stats;
  w1: Win;
  w4: Win;
  inks4: { o: Float32Array; n: Float32Array; d0: Float32Array };
  files: { z1: string; z4: string };
  change: string;
  title: string;
  seen: string;
}
const done: Done[] = [];
const lines: string[] = [];
let idx = 0;
for (const s of sites) {
  idx++;
  const fm = formsOf(s.scene);
  const base = `${nn2(idx)}_${s.group}_${s.scene}_${s.jid}_${s.a}-${s.b}`;
  const change = changeText(s);
  const seen = SEEN[s.id] ?? "(not described)";
  const title = `${nn2(idx)} ${s.group} ${s.scene} ${s.jid} ${s.a}-${s.b}  V (${f(s.x, 3)}, ${f(s.y, 3)})`;
  const pack: Partial<Done> = { s, idx, change, title, seen };
  const stats: Record<string, Stats> = {};
  for (const kind of ["z1", "z4"] as const) {
    const w = windowOf(fm, s.x, s.y, kind);
    const O = inkOf(fm.O, w);
    const N = inkOf(fm.N, w);
    const N0 = inkOf(fm.N0, w);
    const S = inkOf(fm.S, w);
    const st = statsOf(O.ink, N.ink, N0.ink, S.ink, w, fm.h, fm.ppu);
    stats[kind] = st;
    // The picture: a header (title, change, window), captions, three panels.
    const P = w.n * w.zoom;
    const gap = 16;
    const M = 16;
    const W = M + 3 * P + 2 * gap + M;
    const maxChars = Math.floor((W - 2 * M) / (CW * 2));
    const head = [
      ...wrap(ascii(title), maxChars),
      ...wrap(ascii(`change: ${change}`), maxChars),
      ...wrap(ascii(`seen (zoom 4 window): ${seen}`), maxChars),
      ...wrap(ascii(`${GROUPS[s.group]}; window +-${f((w.n / 2) / fm.hdev, 1)}h = ${w.n} px at dpr ${DPR}, ${kind === "z1" ? "play size (zoom 1)" : "zoom 4"}; h = ${f(fm.h, 3)} world = ${f(fm.hdev, 2)} px; ticks mark V; diff: red = more ink after, blue = less ink after`), maxChars),
    ];
    const headH = head.length * LH * 2 + 6;
    const capH = LH * 2 + 4;
    const H = M + headH + capH + 8 + P + M;
    const cv = canvas(W, H);
    head.forEach((ln, i) => drawText(cv, ln, M, M + i * LH * 2, 2));
    const py = M + headH + capH + 8;
    const caps = ["before", "after", "diff"];
    for (let p = 0; p < 3; p++) {
      const px = M + p * (P + gap);
      drawText(cv, ascii(caps[p]), px, M + headH, 2);
      if (p === 0) blitGrey(cv, O.ink, w, px, py);
      else if (p === 1) blitGrey(cv, N.ink, w, px, py);
      else blitDiff(cv, O.ink, N.ink, w, px, py);
      frame(cv, px, py, P);
      ticks(cv, w, px, py);
    }
    const file = `${base}_${kind}.png`;
    writeFileSync(join(outDir, file), encodePng(W, H, cv.d));
    if (kind === "z4") {
      pack.w4 = w;
      pack.inks4 = { o: O.ink, n: N.ink, d0: N0.ink };
    } else pack.w1 = w;
    (pack.files ??= { z1: "", z4: "" })[kind] = file;
  }
  pack.z1 = stats.z1;
  pack.z4 = stats.z4;
  done.push(pack as Done);
  lines.push(
    `${nn2(idx)} [${s.group}] ${s.id}: ${change}` +
      `\n     seen (zoom 4 window): ${seen}` +
      `\n     zoom 4 window (${stats.z4.n} px): ${stats.z4.differ} px differ (|d ink| > 0.02; ink lost ${stats.z4.lost}, gained ${stats.z4.gained}, area ${f(stats.z4.area, 1)} px; F1 share ${stats.z4.f1}, F2 share ${stats.z4.f2}); bbox ${bboxText(stats.z4.bbox)}` +
      `\n     play window (${stats.z1.n} px): ${stats.z1.differ} px differ (lost ${stats.z1.lost}, gained ${stats.z1.gained}, area ${f(stats.z1.area, 1)} px; F1 share ${stats.z1.f1}, F2 share ${stats.z1.f2}); bbox ${bboxText(stats.z1.bbox)}` +
      `\n     checks: FormB({dEdge: skip, rootBand: 0}) vs frozen S1f ink: ${stats.z1.eqBad + stats.z4.eqBad} px differ`,
  );
}

// ---------------------------------------------------------------- the sheet
{
  const Pmax = Math.max(...done.map((d) => d.w4.n)) * 4;
  const cols = 3;
  const gapIn = 20;
  const pad = 14;
  const gapCell = 28;
  const M = 24;
  const cellW = 2 * Pmax + gapIn + 2 * pad;
  const maxT = Math.floor((cellW - 8) / (CW * 3));
  const maxC = Math.floor((cellW - 8) / (CW * 2));
  const blocks = done.map((d) => {
    const st = d.z4;
    const diff = st.differ === 0 ? "no pixel differs" : `${st.differ} px differ (ink lost ${st.lost}, gained ${st.gained}); bbox ${bboxText(st.bbox)}`;
    return { title: wrap(ascii(d.title), maxT), change: wrap(ascii(d.change), maxC), diff: wrap(ascii(diff), maxC), seen: wrap(ascii(`seen: ${d.seen}`), maxC) };
  });
  const headH = Math.max(...blocks.map((b) => b.title.length * LH * 3 + (b.change.length + b.diff.length + b.seen.length) * LH * 2)) + 10;
  const capH = LH * 3 + 6;
  const cellH = headH + capH + Pmax + 2 + gapCell;
  const rows = Math.ceil(done.length / cols);
  const topLines = [
    "K1040 S1h (K1114): form B ink, before and after S1g's at-rest changes (F1 dEdge near, F2 rootBand 0.5), zoom 4, dpr 2",
    "before = S1f final (form_b_s1f_q.ts, frozen); after = today's defaults (form_b.ts); same scene, centre (the corner's V) and scale; red tick = V; cells in index.md order",
  ];
  const topH = 20 + LH * 3 + LH * 2 + 20;
  const W = M + cols * cellW + (cols - 1) * gapCell + M;
  const H = topH + rows * cellH + M;
  const cv = canvas(W, H);
  drawText(cv, ascii(topLines[0]), M, 12, 3);
  drawText(cv, ascii(topLines[1]), M, 12 + LH * 3 + 4, 2);
  done.forEach((d, i) => {
    const cx = M + (i % cols) * (cellW + gapCell);
    const cy = topH + Math.floor(i / cols) * cellH;
    const bl = blocks[i];
    rect(cv, cx, cy, cellW, 3, [120, 120, 120]);
    let ty = cy + 8;
    for (const ln of bl.title) {
      drawText(cv, ln, cx + 4, ty, 3);
      ty += LH * 3;
    }
    for (const ln of bl.change) {
      drawText(cv, ln, cx + 4, ty, 2, [40, 40, 140]);
      ty += LH * 2;
    }
    for (const ln of bl.diff) {
      drawText(cv, ln, cx + 4, ty, 2, [20, 100, 40]);
      ty += LH * 2;
    }
    for (const ln of bl.seen) {
      drawText(cv, ln, cx + 4, ty, 2, [140, 60, 0]);
      ty += LH * 2;
    }
    const n4 = d.w4.n * 4;
    for (let q = 0; q < 2; q++) {
      const colX = cx + pad + q * (Pmax + gapIn);
      drawText(cv, q === 0 ? "before" : "after", colX, cy + headH, 3);
      const ox = colX + Math.floor((Pmax - n4) / 2);
      const oy = cy + headH + capH + 2 + Math.floor((Pmax - n4) / 2);
      blitGrey(cv, q === 0 ? d.inks4.o : d.inks4.n, d.w4, ox, oy);
      frame(cv, ox, oy, n4);
      ticks(cv, d.w4, ox, oy, 2);
    }
  });
  writeFileSync(join(outDir, "sheet.png"), encodePng(W, H, cv.d));
  lines.push(`sheet.png: ${W} x ${H}, ${done.length} pairs, ${cols} columns, panels up to ${Pmax} px`);
}
// ---------------------------------------------------------------- the index
{
  const L: string[] = [];
  L.push("# K1040 S1h (K1114): S1g's at-rest changes, before and after");
  L.push("");
  L.push("Form B's ink around each site: **before** = S1f's final (`form_b_s1f_q.ts`, frozen),");
  L.push("**after** = today's defaults (`src/render/field/form_b.ts`: `dEdge: \"near\"` (F1), `rootBand: 0.5` (F2)).");
  L.push("Same scene, centre (the corner's V) and scale, dpr 2, greyscale `255 (1 - ink)` as `b_crop.ts` draws it,");
  L.push("`look.ctrlArc ??= 0.47`. A red tick in a picture's margin marks V (x above, y left); nothing is drawn over the pixels.");
  L.push("");
  L.push("- `sheet.png`: every pair at zoom 4 (each device px a 4 x 4 block), +-3.5h around V (the window is clamped to 80..160 px).");
  L.push("- `<n>_<group>_<scene>_<j>_<a>-<b>_z1.png`: play size (zoom 1, +-8h): before | after | diff.");
  L.push("- `<n>_<group>_<scene>_<j>_<a>-<b>_z4.png`: zoom 4: before | after | diff. The diff panel is the signed difference, after minus before:");
  L.push("  red where the after has more ink, blue where it has less, over a faint grey of the larger of the two inks.");
  L.push("- `sites.txt` / `sites.json`: the site list and its numbers; `pairs.txt`: the per-site pixel numbers and the `seen` lines.");
  L.push("");
  L.push("Rows: group, scene, site (junction id, arms a-b, V in world units), what changed (r and tip from the forms'");
  L.push("corner data; `tip move` is the distance the fillet's nearest-to-V point moves, F1/F2 its split between the d-edge and the root gate;");
  L.push("`no corner` = the defaults build no corner there, r counts 0), what differs in the pictures (pixels whose ink differs by > 0.02 in");
  L.push("the zoom 4 window; `lost`/`gained` = ink falls/rises by > 0.5; bbox in h from V, +x right, +y down), `seen` (one line per site,");
  L.push("written from looking at the zoom 4 pictures and zoom 6-8 crops of the same windows: what differs, no verdict), and the files.");
  L.push("");
  L.push("| # | group | scene | site | what changed | what differs (zoom 4 window) | seen | files |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const d of done) {
    const s = d.s;
    const st = d.z4;
    const beyond = d.z1.differ > st.differ ? ` (play window: ${d.z1.differ} px, bbox ${bboxText(d.z1.bbox)})` : "";
    const what = st.differ === 0 ? "no pixel differs" : `${st.differ} px differ (lost ${st.lost}, gained ${st.gained}; area ${f(st.area, 1)} px); bbox ${bboxText(st.bbox)}${beyond}`;
    L.push(
      `| ${nn2(d.idx)} | ${s.group} | ${s.scene} | ${s.jid} ${s.a}-${s.b} (θ ${f(s.theta, 3)}), V (${f(s.x, 3)}, ${f(s.y, 3)}) | ${d.change} | ${what} | ${d.seen} | [z1](${d.files.z1}) [z4](${d.files.z4}) |`,
    );
  }
  L.push("");
  L.push("## Reading the rows");
  L.push("");
  L.push("- The `arm N L a -> b, Lcut c -> d` text in \"what changed\" is F1's near-d-edge cut of that corner's arm (L = the arm's length, Lcut = its");
  L.push("  cut length from a pass behind its root). F2 rows carry such lines too, because the same arm moved under F1, not because F2 moved it:");
  L.push("  F2 changes r only (the `tip move (F1 .., F2 ..)` split says which of the two moved the tip). Many arm moves leave the ink unchanged,");
  L.push("  because the thread covers the arm's extent.");
  L.push("- Sites 03 and 04 are the two ends of one small eye (the same 112 px differ in both zoom 4 windows). Sites 13 and 14 are one corner");
  L.push("  (j49 151-152, the same numbers) in two scene files. The 18 pairs hold 16 distinct changes.");
  L.push("- A play-size window (+-8h) can hold other corners' F1 changes beside the site's own; the table marks it with `(play window: ..)`");
  L.push("  (site 08: 230 px in the play window, 36 in the zoom 4 window).");
  L.push("- j0 0-1 and j156 475-473: the defaults build no corner there (F1's near d-edge removes it); j36 109-110 and j155 471-472 keep a corner");
  L.push("  with r = 0. The old fills at j0, j155 and j156 are r 0.04-0.13h (0.7 to 2 device px), so the visible change at those three is at the");
  L.push("  thread ends and the eye, not in a fill.");
  L.push("- Sites 16-18 are not in the brief's list: they are the three largest tip moves among the corners the list does not already hold. All three are");
  L.push("  F1's (0.34 to 0.75h, F2 0.000h), against 0.10h for the largest F2 tip move among the ten F2 sites.");
  L.push("- Check: `FormB({dEdge: \"skip\", rootBand: 0})` reproduces the frozen S1f ink exactly at all 18 sites (0 px differ; `pairs.txt`), so \"before\"");
  L.push("  is S1f's final and the only difference to \"after\" is F1 and F2.");
  L.push("- Regenerate: `npx.cmd vite-node .claude/probes/K1040/s1/s1h_sites.ts`, then `.../s1h_pair.ts` (about 30 s each; scenes are read in place");
  L.push("  from the main checkout's `.claude/probes/K868/scenes`).");
  L.push("");
  writeFileSync(join(outDir, "index.md"), L.join("\n"));
}
writeFileSync(join(outDir, "pairs.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
