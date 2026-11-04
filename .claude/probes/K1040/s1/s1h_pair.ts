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
function inkOf(form: Ev, w: Win): { ink: Float32Array; topNeg: number } {
  const ink = new Float32Array(w.n * w.n);
  let topNeg = 0;
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) {
      const r = form.evalPoint(w.x0 + (i + 0.5) * w.px, w.y0 + (j + 0.5) * w.px);
      ink[j * w.n + i] = r.ink;
      if (r.top < 0 && r.ink > 0.02) topNeg++;
    }
  return { ink, topNeg };
}

// ---------------------------------------------------------------- panels
function blitGrey(cv: Canvas, ink: Float32Array, w: Win, ox: number, oy: number) {
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) {
      const g = Math.round(255 * (1 - ink[j * w.n + i]));
      rect(cv, ox + i * w.zoom, oy + j * w.zoom, w.zoom, w.zoom, [g, g, g]);
    }
}
function blitDiff(cv: Canvas, a: Float32Array, b: Float32Array, w: Win, ox: number, oy: number) {
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) {
      const k = j * w.n + i;
      const d = Math.abs(a[k] - b[k]);
      const base = 255 - Math.round(60 * Math.max(a[k], b[k]));
      let c: [number, number, number] = [base, base, base];
      if (d > 0.004) {
        const t = Math.min(1, d * 1.5);
        c = [255, Math.round(base * (1 - t)), Math.round(base * (1 - t))];
      }
      rect(cv, ox + i * w.zoom, oy + j * w.zoom, w.zoom, w.zoom, c);
    }
}
/** The marker ticks in the margins: V's x above the panel and V's y left of it. */
function ticks(cv: Canvas, w: Win, ox: number, oy: number) {
  const red: [number, number, number] = [230, 0, 0];
  rect(cv, ox + Math.round(w.vx * w.zoom) - 1, oy - 7, 2, 6, red);
  rect(cv, ox - 7, oy + Math.round(w.vy * w.zoom) - 1, 6, 2, red);
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
  topNeg: number;
}
function statsOf(o: Float32Array, nn: Float32Array, n0: Float32Array, s: Float32Array, w: Win, h: number, ppu: number, topNeg: number): Stats {
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
  return { n: w.n, differ, lost, gained, area, f1, f2, bbox: differ ? [x0, x1, y0, y1] : null, eqBad, topNeg };
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
}
const done: Done[] = [];
const lines: string[] = [];
let idx = 0;
for (const s of sites) {
  idx++;
  const fm = formsOf(s.scene);
  const base = `${nn2(idx)}_${s.group}_${s.scene}_${s.jid}_${s.a}-${s.b}`;
  const change = changeText(s);
  const title = `${nn2(idx)} ${s.group} ${s.scene} ${s.jid} ${s.a}-${s.b}  V (${f(s.x, 3)}, ${f(s.y, 3)})`;
  const pack: Partial<Done> = { s, idx, change, title };
  const stats: Record<string, Stats> = {};
  for (const kind of ["z1", "z4"] as const) {
    const w = windowOf(fm, s.x, s.y, kind);
    const O = inkOf(fm.O, w);
    const N = inkOf(fm.N, w);
    const N0 = inkOf(fm.N0, w);
    const S = inkOf(fm.S, w);
    const st = statsOf(O.ink, N.ink, N0.ink, S.ink, w, fm.h, fm.ppu, O.topNeg + N.topNeg);
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
      ...wrap(ascii(`${GROUPS[s.group]}; window +-${f((w.n / 2) / fm.hdev, 1)}h = ${w.n} px at dpr ${DPR}, ${kind === "z1" ? "play size (zoom 1)" : "zoom 4"}; h = ${f(fm.h, 3)} world = ${f(fm.hdev, 2)} px; ticks mark V`), maxChars),
    ];
    const headH = head.length * LH * 2 + 6;
    const capH = LH * 2 + 4;
    const H = M + headH + capH + 8 + P + M;
    const cv = canvas(W, H);
    head.forEach((ln, i) => drawText(cv, ln, M, M + i * LH * 2, 2));
    const py = M + headH + capH + 8;
    const caps = ["before: S1f final", "after: defaults", "diff |d ink|"];
    for (let p = 0; p < 3; p++) {
      const px = M + p * (P + gap);
      drawText(cv, ascii(caps[p]), px, M + headH, 2);
      if (p === 0) blitGrey(cv, O.ink, w, px, py);
      else if (p === 1) blitGrey(cv, N.ink, w, px, py);
      else blitDiff(cv, O.ink, N.ink, w, px, py);
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
      `\n     zoom 4 window (${stats.z4.n} px): ${stats.z4.differ} px differ (|d ink| > 0.02; ink lost ${stats.z4.lost}, gained ${stats.z4.gained}, area ${f(stats.z4.area, 1)} px; F1 share ${stats.z4.f1}, F2 share ${stats.z4.f2}); bbox ${bboxText(stats.z4.bbox)}` +
      `\n     play window (${stats.z1.n} px): ${stats.z1.differ} px differ (lost ${stats.z1.lost}, gained ${stats.z1.gained}, area ${f(stats.z1.area, 1)} px; F1 share ${stats.z1.f1}, F2 share ${stats.z1.f2}); bbox ${bboxText(stats.z1.bbox)}` +
      `\n     checks: FormB({dEdge: skip, rootBand: 0}) vs frozen S1f ink: ${stats.z1.eqBad + stats.z4.eqBad} px differ; ink with top < 0: ${stats.z1.topNeg + stats.z4.topNeg} px`,
  );
}

// ---------------------------------------------------------------- the sheet
{
  const P = Math.max(...done.map((d) => d.w4.n)) * 4;
  const cols = 2;
  const gapIn = 16;
  const M = 24;
  const cellW = 2 * P + gapIn + 2 * 12;
  const maxChars = Math.floor((cellW - 8) / (CW * 2));
  const heads = done.map((d) => [...wrap(ascii(`${d.title}`), maxChars), ...wrap(ascii(d.change), maxChars)]);
  const headLines = Math.max(...heads.map((x) => x.length));
  const headH = headLines * LH * 2 + 4;
  const capH = LH * 2 + 6;
  const cellH = headH + capH + P + 28;
  const rows = Math.ceil(done.length / cols);
  const topLines = [
    "K1040 S1h (K1114): S1g's at-rest changes (F1 dEdge near, F2 rootBand 0.5), form B ink, before and after, zoom 4, dpr 2",
    "before = S1f final (form_b_s1f_q.ts, frozen); after = today's defaults; same scene, centre (the corner's V) and scale; red tick = V; sites in sheet order = index.md",
  ];
  const topH = 44 + topLines.length * LH * 2 + 8;
  const W = M + cols * cellW + (cols - 1) * 24 + M;
  const H = topH + rows * cellH + M;
  const cv = canvas(W, H);
  drawText(cv, ascii(topLines[0]), M, 12, 2);
  drawText(cv, ascii(topLines[1]), M, 12 + LH * 2 + 4, 1);
  done.forEach((d, i) => {
    const cx = M + (i % cols) * (cellW + 24);
    const cy = topH + Math.floor(i / cols) * cellH;
    rect(cv, cx, cy, cellW, 2, [120, 120, 120]);
    heads[i].forEach((ln, k) => drawText(cv, ln, cx + 4, cy + 6 + k * LH * 2, 2, k < wrap(ascii(d.title), maxChars).length ? [0, 0, 0] : [40, 40, 140]));
    const py = cy + headH + capH + 6;
    for (let p = 0; p < 2; p++) {
      const ox = cx + 12 + p * (P + gapIn) + Math.floor((P - d.w4.n * 4) / 2);
      const oy = py + Math.floor((P - d.w4.n * 4) / 2);
      drawText(cv, p === 0 ? "before" : "after", cx + 12 + p * (P + gapIn), cy + headH + 4, 2);
      blitGrey(cv, p === 0 ? d.inks4.o : d.inks4.n, d.w4, ox, oy);
      ticks(cv, d.w4, ox, oy);
    }
  });
  writeFileSync(join(outDir, "sheet.png"), encodePng(W, H, cv.d));
  lines.push(`sheet.png: ${W} x ${H}, ${done.length} pairs, ${cols} columns, panels ${P} px`);
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
  L.push("- `<n>_<group>_<scene>_<j>_<a>-<b>_z4.png`: zoom 4: before | after | diff. The diff panel is |d ink| in red over a faint grey of the larger ink.");
  L.push("- `sites.txt` / `sites.json`: the site list and its numbers; `pairs.txt`: the per-site pixel numbers.");
  L.push("");
  L.push("Rows: group, scene, site (junction id, arms a-b, V in world units), what changed (r and tip from the forms'");
  L.push("corner data; `tip move` is the distance the fillet's nearest-to-V point moves, F1/F2 its split between the d-edge and the root gate;");
  L.push("`no corner` = the defaults build no corner there, r counts 0), what differs in the pictures (pixels whose ink differs by > 0.02 in");
  L.push("the zoom 4 window; `lost`/`gained` = ink falls/rises by > 0.5; bbox in h from V, +x right, +y down), and the files.");
  L.push("");
  L.push("| # | group | scene | site | what changed | what differs (zoom 4 window) | files |");
  L.push("|---|---|---|---|---|---|---|");
  for (const d of done) {
    const s = d.s;
    const st = d.z4;
    const beyond = d.z1.differ > st.differ ? ` (play window: ${d.z1.differ} px, bbox ${bboxText(d.z1.bbox)})` : "";
    const what = st.differ === 0 ? "no pixel differs" : `${st.differ} px differ (lost ${st.lost}, gained ${st.gained}; area ${f(st.area, 1)} px); bbox ${bboxText(st.bbox)}${beyond}`;
    L.push(
      `| ${nn2(d.idx)} | ${s.group} | ${s.scene} | ${s.jid} ${s.a}-${s.b} (θ ${f(s.theta, 3)}), V (${f(s.x, 3)}, ${f(s.y, 3)}) | ${d.change} | ${what} | [z1](${d.files.z1}) [z4](${d.files.z4}) |`,
    );
  }
  L.push("");
  writeFileSync(join(outDir, "index.md"), L.join("\n"));
}
writeFileSync(join(outDir, "pairs.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
